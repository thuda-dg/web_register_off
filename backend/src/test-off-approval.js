const { test, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const { Op } = require('sequelize');
const models = require('./models');
const { getOffApprovals, decideOff } = require('./services/off-approval.service');
const originals = [];
function stub(object, key, fn) { originals.push([object, key, object[key]]); object[key] = fn; }
afterEach(() => { for (const [object, key, value] of originals.splice(0).reverse()) object[key] = value; });

function setup() {
  const state = { roles: ['TEAM_LEAD'], memberships: [{ team_id: 1, team: { team_name: 'Team A' } }],
    accountStatus: 'ACTIVE', employeeActive: true, sameTeam: true, empId: 20, status: 'PENDING_TL',
    committed: false, rolledBack: false, events: [], actions: [] };
  const transaction = { LOCK: { UPDATE: 'UPDATE' } };
  const entry = {
    entry_id: 7, submission_id: 3, task_id: 1, leave_date: '2026-11-17',
    get current_status() { return state.status; },
    submission: { submitted_at: '2026-11-16', cycle: { cycle_id: 2, cycle_name: 'Kỳ 11' }, employee: { emp_id: 20, emp_code: 'NV020', emp_name: 'Nhân viên' } },
    team: { team_name: 'Team A' }, task: { task_name: 'Mass' }, actions: [],
    async update(values, options) { assert.equal(options.transaction, transaction); state.status = values.current_status; state.events.push('update'); }
  };
  stub(models.UserAccount, 'findByPk', async () => ({ user_account_id: 10, emp_id: 11,
    get account_status() { return state.accountStatus; },
    async getRoles(options) {
      assert.equal(options.where.is_active, true); assert.ok(options.through.where.start_date[Op.lte]);
      return state.roles.map(role_code => ({ role_code }));
    }
  }));
  stub(models.Employee, 'findByPk', async (id, options) => {
    if (options?.lock) { assert.equal(options.lock, 'UPDATE'); state.events.push('employee-lock'); }
    return { emp_id: id, is_active: state.employeeActive };
  });
  stub(models.EmpTeamHistory, 'findAll', async options => {
    assert.equal(options.where.emp_id, 11); assert.equal(options.include[0].where.is_active, true);
    return state.memberships;
  });
  const checkScope = options => {
    assert.equal(options.where.is_active, true);
    assert.equal(options.include.find(i => i.as === 'leaveType').where.leave_type_code, 'OFF');
    const employee = options.include.find(i => i.as === 'submission').include.find(i => i.as === 'employee');
    assert.equal(employee.where.emp_id[Op.ne], 11);
    assert.equal(employee.include[0].where.team_id, 1);
    assert.ok(employee.include[0].where.start_date[Op.lte]);
  };
  stub(models.RegistrationEntry, 'findAll', async options => { checkScope(options); return [entry]; });
  stub(models.RegistrationEntry, 'findByPk', async () => ({ submission_id: 3 }));
  stub(models.RegistrationSubmission, 'findByPk', async () => ({ emp_id: state.empId, cycle_id: 2 }));
  stub(models.RegistrationEntry, 'findOne', async options => {
    checkScope(options); assert.equal(options.lock.of, models.RegistrationEntry);
    state.events.push('entry-lock'); return state.sameTeam ? entry : null;
  });
  stub(models.RequireHC, 'findOne', async options => {
    assert.equal(options.lock, 'UPDATE'); assert.equal(options.transaction, transaction);
    assert.deepEqual(options.where, { cycle_id: 2, task_id: 1, working_date: '2026-11-17' });
    state.events.push('capacity-lock'); return { max_off: 2 };
  });
  stub(models.RegistrationAction, 'create', async (values, options) => {
    assert.equal(options.transaction, transaction); state.actions.push(values); return { created_at: '2026-11-16T09:00:00Z' };
  });
  stub(models.sequelize, 'transaction', async callback => {
    try { const result = await callback(transaction); state.committed = true; return result; }
    catch (error) { state.rolledBack = true; throw error; }
  });
  return state;
}

test('queue scopes OFF to employees currently in lead team, excludes self, maps actual status', async () => {
  setup();
  const result = await getOffApprovals(10);
  assert.equal(result.data.teamName, 'Team A'); assert.equal(result.data.rows[0].status, 'PENDING_TL');
});

test('only current TEAM_LEAD can list/decide; ADMIN alone and revoked role are denied', async () => {
  const state = setup();
  for (const roles of [[], ['ADMIN'], ['EMPLOYEE']]) {
    state.roles = roles;
    await assert.rejects(getOffApprovals(10), { statusCode: 403 });
    await assert.rejects(decideOff(10, 7, { decision: 'approve' }), { statusCode: 403 });
  }
  assert.equal(state.actions.length, 0);
});

test('disabled accounts, inactive employees and missing/ambiguous team cannot approve', async () => {
  const state = setup(); state.accountStatus = 'DISABLED';
  await assert.rejects(getOffApprovals(10), { statusCode: 403 });
  state.accountStatus = 'ACTIVE'; state.employeeActive = false;
  await assert.rejects(getOffApprovals(10), { statusCode: 403 });
  state.employeeActive = true; state.memberships = [];
  await assert.rejects(getOffApprovals(10), { code: 'INVALID_LEAD_TEAM' });
  state.memberships = [{ team_id: 1 }, { team_id: 2 }];
  await assert.rejects(getOffApprovals(10), { code: 'INVALID_LEAD_TEAM' });
});

test('approve locks in submit order, updates entry and logs actor in the same transaction', async () => {
  const state = setup();
  const result = await decideOff(10, 7, { decision: 'approve', note: ' Đồng ý ' });
  assert.deepEqual(state.events, ['employee-lock', 'entry-lock', 'capacity-lock', 'update']);
  assert.equal(state.committed, true); assert.equal(result.data.status, 'APPROVED');
  assert.deepEqual(state.actions[0], { entry_id: 7, action_type: 'TL_APPROVED', old_status: 'PENDING_TL', new_status: 'APPROVED', performed_by_user_id: 10, note: 'Đồng ý' });
  await assert.rejects(decideOff(10, 7, { decision: 'approve' }), { statusCode: 409 });
  assert.equal(state.actions.length, 1);
});

test('reject requires a reason and produces REJECTED + TL_REJECTED', async () => {
  const state = setup();
  await assert.rejects(decideOff(10, 7, { decision: 'reject', note: ' ' }), { statusCode: 400 });
  const result = await decideOff(10, 7, { decision: 'reject', note: 'Không đủ nhân sự' });
  assert.equal(result.data.status, 'REJECTED'); assert.equal(state.actions[0].action_type, 'TL_REJECTED');
});

test('cannot approve self, another team, non-OFF/inactive entries or already decided states', async () => {
  const state = setup(); state.empId = 11;
  await assert.rejects(decideOff(10, 7, { decision: 'approve' }), { statusCode: 403 });
  state.empId = 20; state.sameTeam = false;
  await assert.rejects(decideOff(10, 7, { decision: 'approve' }), { statusCode: 403 });
  state.sameTeam = true;
  for (const status of ['APPROVED', 'REJECTED', 'PUBLISHED', 'CANCELLED']) {
    state.status = status;
    await assert.rejects(decideOff(10, 7, { decision: 'reject', note: 'x' }), { statusCode: 409 });
  }
  assert.equal(state.actions.length, 0);
});

test('malformed ids, decisions and notes are rejected before a write', async () => {
  const state = setup();
  for (const [id, payload] of [[0, { decision: 'approve' }], [7, { decision: 'publish' }], [7, { decision: 'approve', note: [] }], [7, { decision: 'approve', note: 'a'.repeat(1001) }]]) {
    await assert.rejects(decideOff(10, id, payload), { statusCode: 400 });
  }
  assert.equal(state.actions.length, 0);
});

test('missing entry returns 404 and an audit-write failure rolls back the decision', async () => {
  const state = setup(); const find = models.RegistrationEntry.findByPk;
  stub(models.RegistrationEntry, 'findByPk', async () => null);
  await assert.rejects(decideOff(10, 99, { decision: 'approve' }), { statusCode: 404 });
  stub(models.RegistrationEntry, 'findByPk', find);
  stub(models.RegistrationAction, 'create', async () => { throw new Error('audit failed'); });
  await assert.rejects(decideOff(10, 7, { decision: 'approve' }), /audit failed/);
  assert.equal(state.rolledBack, true); assert.equal(state.committed, false);
});
