const { test, afterEach } = require('node:test');
const assert = require('node:assert/strict');
process.env.AUTH_TOKEN_SECRET ||= 'admin-auth-test-secret';
const { Op } = require('sequelize');
const models = require('./models');
const { hashPassword } = require('./utils/auth.util');
const { loginUser, refreshSession } = require('./services/auth.service');
const originals = [];
function stub(obj, key, fn) { originals.push([obj, key, obj[key]]); obj[key] = fn; }
afterEach(() => { for (const [obj, key, value] of originals.splice(0).reverse()) obj[key] = value; });
const password = 'Test-password-123';
const passwordHash = hashPassword(password);
function setup() {
  stub(console, 'log', () => {});
  const state = { roles: ['EMPLOYEE'], active: true, writes: 0 };
  const employee = { emp_id: 3, emp_code: 'vienvietvo', emp_name: 'Test', emp_email: 'test@example.com', get is_active() { return state.active; } };
  const account = { user_account_id: 7, emp_id: 3, account_status: 'ACTIVE', password_hash: passwordHash, failed_login_count: 0,
    update: async () => { state.writes++; },
    getRoles: async options => {
      assert.equal(options.where.is_active, true); assert.ok(options.through.where.start_date[Op.lte]);
      assert.ok(options.through.where[Op.or]); return state.roles.map(role_code => ({ role_code }));
    } };
  stub(models.Employee, 'findOne', async () => employee);
  stub(models.Employee, 'findByPk', async () => employee);
  stub(models.EmpTeamHistory, 'findOne', async options => {
    assert.equal(options.where.emp_id, 3); assert.ok(options.where.start_date[Op.lte]);
    assert.ok(options.where[Op.or]); assert.equal(options.include[0].where.is_active, true);
    return { team: { team_id: 2, team_code: 'TEAM_A', team_name: 'Team A' } };
  });
  stub(models.UserAccount, 'findOne', async () => account);
  stub(models.RefreshToken, 'findOne', async () => ({ userAccount: account, update: async () => { state.writes++; } }));
  stub(models.RefreshToken, 'create', async () => { state.writes++; });
  stub(models.RefreshToken, 'destroy', async () => { state.writes++; });
  return state;
}
test('admin login rejects employee/team lead/no active role before issuing a session', async () => {
  const state = setup();
  for (const roles of [['EMPLOYEE'], ['TEAM_LEAD'], []]) {
    state.roles = roles;
    await assert.rejects(loginUser({ identifier: 'vienvietvo', password }, { requireAdmin: true }), { statusCode: 403, code: 'ADMIN_ACCESS_REQUIRED' });
  }
  assert.equal(state.writes, 0);
});
test('ADMIN can log into admin, including vienvietvo, while ordinary login still permits employees', async () => {
  const state = setup(); state.roles = ['ADMIN'];
  const admin = await loginUser({ identifier: 'vienvietvo', password }, { requireAdmin: true });
  assert.equal(admin.user.roles[0].roleCode, 'ADMIN'); assert.ok(admin.accessToken);
  assert.deepEqual(admin.user.team, { teamId: 2, teamCode: 'TEAM_A', teamName: 'Team A' });
  state.roles = ['EMPLOYEE'];
  const agent = await loginUser({ identifier: 'NV003', password });
  assert.equal(agent.user.roles[0].roleCode, 'EMPLOYEE');
});
test('admin refresh denies revoked ADMIN without rotating token; general refresh remains available', async () => {
  const state = setup();
  await assert.rejects(refreshSession('test-refresh', { requireAdmin: true }), { statusCode: 403, code: 'ADMIN_ACCESS_REQUIRED' });
  assert.equal(state.writes, 0);
  state.roles = ['ADMIN']; assert.ok((await refreshSession('test-refresh', { requireAdmin: true })).accessToken);
  state.roles = ['EMPLOYEE']; assert.ok((await refreshSession('test-refresh')).accessToken);
});
test('correct role does not bypass password or inactive employee checks', async () => {
  const state = setup(); state.roles = ['ADMIN'];
  await assert.rejects(loginUser({ identifier: 'vienvietvo', password: 'wrong' }, { requireAdmin: true }), { statusCode: 401 });
  state.active = false;
  await assert.rejects(loginUser({ identifier: 'vienvietvo', password }, { requireAdmin: true }), { statusCode: 403 });
  await assert.rejects(refreshSession('test-refresh', { requireAdmin: true }), { statusCode: 403 });
});

test('profile allows employees without a team and reloads current team on refresh', async () => {
  setup();
  stub(models.EmpTeamHistory, 'findOne', async () => null);
  const result = await loginUser({ identifier: 'NV003', password });
  assert.equal(result.user.team, null);
  stub(models.EmpTeamHistory, 'findOne', async () => ({ team: { team_id: 4, team_code: 'NEW', team_name: 'Team mới' } }));
  const refreshed = await refreshSession('test-refresh');
  assert.equal(refreshed.user.team.teamName, 'Team mới');
});
