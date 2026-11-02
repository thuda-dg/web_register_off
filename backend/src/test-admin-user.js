const { test, afterEach } = require('node:test');
const assert = require('node:assert/strict');
process.env.AUTH_TOKEN_SECRET ||= 'admin-user-test-secret';
const models = require('./models');
const { createUser, updateUserRoles } = require('./services/admin.service');
const { requireAdmin } = require('./middleware/admin.middleware');
const { getActiveRoles } = require('./utils/role.util');
const { Op } = require('sequelize');
const { verifyPassword } = require('./utils/auth.util');
const { authorizeRoles } = require('./middleware/auth.middleware');

const payload = {
  employeeCode: ' NV001 ', fullName: ' Nguyễn An ', email: ' AN@example.com ',
  password: 'Test-password-123', teamId: 2, roleIds: [1, 1]
};
const originals = [];
function stub(object, key, fn) {
  originals.push([object, key, object[key]]);
  object[key] = fn;
}
afterEach(() => {
  for (const [object, key, value] of originals.splice(0).reverse()) object[key] = value;
});

function database() {
  const state = { committed: false, rolledBack: false, writes: [] };
  const transaction = {};
  stub(models.sequelize, 'transaction', async callback => {
    try {
      const result = await callback(transaction);
      state.committed = true;
      return result;
    } catch (error) {
      state.rolledBack = true;
      throw error;
    }
  });
  stub(models.Employee, 'findOne', async () => null);
  stub(models.Role, 'findAll', async () => [{ role_id: 1, role_name: 'Employee' }]);
  stub(models.Team, 'findOne', async () => ({ team_id: 2, team_name: 'Team A' }));
  for (const [model, key, id] of [
    [models.Employee, 'create', { emp_id: 10 }],
    [models.UserAccount, 'create', { user_account_id: 20 }],
    [models.UserRole, 'bulkCreate', {}],
    [models.EmpTeamHistory, 'create', {}]
  ]) {
    stub(model, key, async (values, options) => {
      assert.equal(options.transaction, transaction);
      state.writes.push({ model, values });
      return { ...values, ...id };
    });
  }
  return state;
}

test('creates employee, hashed account, roles and team in one transaction', async () => {
  const state = database();
  const result = await createUser(payload);
  assert.equal(state.committed, true);
  assert.equal(result.item.employeeCode, 'NV001');
  assert.equal(result.item.email, 'an@example.com');
  const account = state.writes.find(write => write.model === models.UserAccount).values;
  assert.notEqual(account.password, payload.password);
  assert.equal(verifyPassword(payload.password, account.password_hash), true);
  assert.equal(account.account_status, 'ACTIVE');
  assert.equal(state.writes.find(write => write.model === models.UserRole).values.length, 1);
  assert.equal(JSON.stringify(result).includes('password'), false);
});

test('allows creating a user without a team', async () => {
  const state = database();
  const result = await createUser({ ...payload, teamId: null });
  assert.equal(result.item.teamId, null);
  assert.equal(state.writes.some(write => write.model === models.EmpTeamHistory), false);
});

test('rejects invalid input before opening a transaction', async () => {
  stub(models.sequelize, 'transaction', () => assert.fail('unexpected transaction'));
  for (const changes of [
    { employeeCode: ' ' }, { fullName: ' ' }, { email: 'bad-email' },
    { password: 'short' }, { password: 'ế'.repeat(30) },
    { roleIds: [] }, { roleIds: ['1'] }, { teamId: -1 }
  ]) await assert.rejects(createUser({ ...payload, ...changes }), { statusCode: 400 });
});

test('rejects duplicate employee and inactive catalog entries without writes', async () => {
  const state = database();
  stub(models.Employee, 'findOne', async () => ({ emp_id: 9 }));
  await assert.rejects(createUser(payload), { statusCode: 409 });
  stub(models.Employee, 'findOne', async () => null);
  stub(models.Role, 'findAll', async () => []);
  await assert.rejects(createUser(payload), { statusCode: 400 });
  stub(models.Role, 'findAll', async () => [{ role_id: 1, role_name: 'Employee' }]);
  stub(models.Team, 'findOne', async () => null);
  await assert.rejects(createUser(payload), { statusCode: 400 });
  assert.equal(state.writes.length, 0);
});

test('rolls back when a later write fails and maps concurrent duplicates to 409', async () => {
  const state = database();
  stub(models.EmpTeamHistory, 'create', async () => { throw new Error('write failed'); });
  await assert.rejects(createUser(payload), /write failed/);
  assert.equal(state.rolledBack, true);
  assert.equal(state.committed, false);
  stub(models.Employee, 'create', async () => {
    throw Object.assign(new Error('duplicate'), { name: 'SequelizeUniqueConstraintError' });
  });
  await assert.rejects(createUser(payload), { statusCode: 409 });
});

test('only ADMIN can access creation routes; accepts JWT roles array', () => {
  for (const user of [{ roles: ['ADMIN'] }, { role: 'ADMIN' }]) {
    let allowed = false;
    authorizeRoles('ADMIN')({ user }, {}, () => { allowed = true; });
    assert.equal(allowed, true);
  }
  for (const user of [undefined, { roles: ['EMPLOYEE'] }, { roles: 'ADMIN' }]) {
    const res = {
      status(code) { assert.equal(code, 403); return this; },
      json(body) { assert.equal(body.code, 'FORBIDDEN'); }
    };
    authorizeRoles('ADMIN')({ user }, res, () => assert.fail('unexpected access'));
  }
});

function roleDatabase() {
  const state = { committed: false, rolledBack: false, created: [], expired: [], deleted: [] };
  const transaction = { LOCK: { UPDATE: 'UPDATE' } };
  stub(models.sequelize, 'transaction', async callback => {
    try {
      const result = await callback(transaction);
      state.committed = true;
      return result;
    } catch (error) { state.rolledBack = true; throw error; }
  });
  stub(models.Employee, 'findOne', async () => ({ emp_id: 10 }));
  stub(models.UserAccount, 'findOne', async options => {
    assert.equal(options.lock, 'UPDATE');
    return { user_account_id: 20 };
  });
  stub(models.Role, 'findAll', async () => [{ role_id: 2, role_name: 'Manager' }]);
  const today = new Date().toISOString().slice(0, 10);
  const assignment = (roleId, startDate) => ({
    role_id: roleId, start_date: startDate,
    async update(values, options) {
      assert.equal(options.transaction, transaction);
      state.expired.push({ roleId, ...values });
    },
    async destroy(options) {
      assert.equal(options.transaction, transaction);
      state.deleted.push(roleId);
    }
  });
  stub(models.UserRole, 'findAll', async () => [assignment(1, '2020-01-01'), assignment(3, today)]);
  stub(models.UserRole, 'bulkCreate', async (values, options) => {
    assert.equal(options.transaction, transaction);
    state.created = values;
  });
  return state;
}

test('updates roles atomically, expires historical grants and removes same-day grants', async () => {
  const state = roleDatabase();
  const result = await updateUserRoles('10', { roleIds: [2, 2] });
  assert.equal(state.committed, true);
  assert.equal(result.employeeId, 10);
  assert.deepEqual(result.roles, [{ id: 2, name: 'Manager' }]);
  assert.equal(state.expired[0].roleId, 1);
  assert.ok(state.expired[0].end_date < new Date().toISOString().slice(0, 10));
  assert.deepEqual(state.deleted, [3]);
  assert.equal(state.created.length, 1);
  assert.equal(state.created[0].role_id, 2);
});

test('keeps existing selected role without duplicating assignment', async () => {
  const state = roleDatabase();
  stub(models.UserRole, 'findAll', async () => [{ role_id: 2 }]);
  await updateUserRoles(10, { roleIds: [2] });
  assert.deepEqual(state.created, []);
  assert.deepEqual(state.expired, []);
});

test('rejects empty, malformed or inactive roles and missing employee/account', async () => {
  roleDatabase();
  for (const [id, roleIds] of [[0, [2]], [10, []], [10, ['2']], ['bad', [2]]]) {
    await assert.rejects(updateUserRoles(id, { roleIds }), { statusCode: 400 });
  }
  stub(models.Role, 'findAll', async () => []);
  await assert.rejects(updateUserRoles(10, { roleIds: [99] }), { statusCode: 400 });
  stub(models.UserAccount, 'findOne', async () => null);
  await assert.rejects(updateUserRoles(10, { roleIds: [2] }), { statusCode: 404 });
  stub(models.Employee, 'findOne', async () => null);
  await assert.rejects(updateUserRoles(10, { roleIds: [2] }), { statusCode: 404 });
});

test('rolls back all role changes if the new assignment fails', async () => {
  const state = roleDatabase();
  stub(models.UserRole, 'bulkCreate', async () => { throw new Error('write failed'); });
  await assert.rejects(updateUserRoles(10, { roleIds: [2] }), /write failed/);
  assert.equal(state.rolledBack, true);
  assert.equal(state.committed, false);
});

test('admin guard uses current DB roles instead of stale JWT roles', async () => {
  const account = { emp_id: 10, account_status: 'ACTIVE', getRoles: async () => [] };
  stub(models.UserAccount, 'findByPk', async () => account);
  stub(models.Employee, 'findByPk', async () => ({ is_active: true }));
  const req = { user: { sub: 20, roles: ['ADMIN'] } };
  const res = {
    status(code) { assert.equal(code, 403); return this; },
    json(body) { assert.equal(body.code, 'FORBIDDEN'); }
  };
  await requireAdmin(req, res, () => assert.fail('stale admin allowed'));
  account.getRoles = async () => [{ role_code: 'ADMIN' }];
  let allowed = false;
  await requireAdmin(req, res, error => { assert.ifError(error); allowed = true; });
  assert.equal(allowed, true);
  account.account_status = 'DISABLED';
  await requireAdmin(req, res, () => assert.fail('disabled admin allowed'));
});

test('login and refresh role query excludes inactive, expired and future grants', async () => {
  await getActiveRoles({
    async getRoles(options) {
      assert.equal(options.where.is_active, true);
      const where = options.through.where;
      const today = new Date().toISOString().slice(0, 10);
      assert.equal(where.start_date[Op.lte], today);
      assert.deepEqual(where[Op.or], [{ end_date: null }, { end_date: { [Op.gte]: today } }]);
      return [];
    }
  });
});
