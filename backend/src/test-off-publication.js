const { test, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const { Op } = require('sequelize');
const models = require('./models');
const { publishOff } = require('./services/off-approval.service');
const originals = [];
function stub(object, key, fn) { originals.push([object, key, object[key]]); object[key] = fn; }
afterEach(() => { for (const [object, key, value] of originals.splice(0).reverse()) object[key] = value; });
const body = { cycleId: 2, entryIds: [7, 8] };

function setup() {
  const state = { role: 'TEAM_LEAD', active: true, memberships: 1, events: [], actions: [], writes: 0, committed: 0, rolledBack: 0,
    rows: [
      { entry_id: 7, emp_id: 20, cycle_id: 2, current_status: 'APPROVED' },
      { entry_id: 8, emp_id: 21, cycle_id: 2, current_status: 'APPROVED' },
      { entry_id: 9, emp_id: 20, cycle_id: 2, current_status: 'REJECTED' },
      { entry_id: 10, emp_id: 20, cycle_id: 3, current_status: 'APPROVED' },
      { entry_id: 11, emp_id: 11, cycle_id: 2, current_status: 'APPROVED' }, // lead's own OFF
      { entry_id: 12, emp_id: 30, cycle_id: 2, current_status: 'APPROVED' }, // other team
      { entry_id: 13, emp_id: 20, cycle_id: 2, current_status: 'PUBLISHED' }
    ] };
  const transaction = { LOCK: { UPDATE: 'UPDATE' } };
  let gate = Promise.resolve();
  stub(models.sequelize, 'transaction', async callback => {
    // Fake transaction isolation: serialize competitors and restore writes on failure.
    const previous = gate; let release; gate = new Promise(resolve => { release = resolve; }); await previous;
    const savedRows = structuredClone(state.rows), savedActions = structuredClone(state.actions);
    try { const result = await callback(transaction); state.committed++; return result; }
    catch (error) { state.rows = savedRows; state.actions = savedActions; state.rolledBack++; throw error; }
    finally { release(); }
  });
  stub(models.UserAccount, 'findByPk', async () => ({ user_account_id: 10, emp_id: 11, account_status: 'ACTIVE',
    getRoles: async options => { assert.equal(options.where.is_active, true); return [{ role_code: state.role }]; } }));
  stub(models.Employee, 'findByPk', async () => ({ is_active: state.active }));
  stub(models.EmpTeamHistory, 'findAll', async () => Array.from({ length: state.memberships }, () => ({ team_id: 1, team: { team_name: 'Team A' } })));
  stub(models.Employee, 'findAll', async options => {
    assert.equal(options.where.emp_id[Op.ne], 11); assert.equal(options.where.is_active, true);
    assert.deepEqual(options.order, [['emp_id', 'ASC']]); assert.equal(options.lock.of, models.Employee);
    assert.equal(options.include[0].where.team_id, 1); assert.ok(options.include[0].where.start_date[Op.lte]);
    assert.equal(options.transaction, transaction); state.events.push('employee-lock');
    return [{ emp_id: 20 }, { emp_id: 21 }];
  });
  stub(models.RegistrationEntry, 'findAll', async options => {
    assert.equal(options.where.is_active, true); assert.equal(options.lock.of, models.RegistrationEntry);
    assert.equal(options.subQuery, false); assert.equal(options.transaction, transaction);
    assert.equal(options.include.find(i => i.as === 'leaveType').where.leave_type_code, 'OFF');
    const submission = options.include.find(i => i.as === 'submission');
    assert.equal(submission.where.cycle_id, 2);
    const employee = submission.include.find(i => i.as === 'employee');
    assert.equal(employee.include[0].where.team_id, 1); assert.ok(employee.include[0].where.start_date[Op.lte]);
    state.events.push('entry-lock');
    return state.rows.filter(row => row.cycle_id === submission.where.cycle_id && employee.where.emp_id[Op.in].includes(row.emp_id));
  });
  stub(models.RegistrationEntry, 'update', async (values, options) => {
    assert.equal(options.transaction, transaction); assert.equal(options.where.current_status, 'APPROVED');
    assert.equal(options.where.is_active, true); state.events.push('update');
    const selected = state.rows.filter(row => options.where.entry_id[Op.in].includes(row.entry_id) && row.current_status === 'APPROVED');
    for (const row of selected) row.current_status = values.current_status;
    state.writes++; return [selected.length];
  });
  stub(models.RegistrationAction, 'bulkCreate', async (values, options) => {
    assert.equal(options.transaction, transaction); state.events.push('actions'); state.actions.push(...values);
  });
  return state;
}

test('publishes every approved OFF in the selected cycle/current team atomically, excluding self and other states', async () => {
  const state = setup(); const result = await publishOff(10, body);
  assert.equal(result.data.publishedCount, 2); assert.equal(state.committed, 1);
  assert.deepEqual(state.events, ['employee-lock', 'entry-lock', 'update', 'actions']);
  assert.deepEqual(state.rows.map(row => row.current_status), ['PUBLISHED', 'PUBLISHED', 'REJECTED', 'APPROVED', 'APPROVED', 'APPROVED', 'PUBLISHED']);
  assert.equal(state.actions.length, 2);
  for (const action of state.actions) {
    assert.equal(action.action_type, 'PUBLISHED'); assert.equal(action.old_status, 'APPROVED');
    assert.equal(action.new_status, 'PUBLISHED'); assert.equal(action.performed_by_user_id, 10);
    assert.equal(action.created_at, result.data.publishedAt);
  }
});

test('publication is forbidden for non-leads, inactive employees or missing/ambiguous current team', async () => {
  const state = setup(); state.role = 'ADMIN';
  await assert.rejects(publishOff(10, body), { statusCode: 403 });
  state.role = 'TEAM_LEAD'; state.active = false;
  await assert.rejects(publishOff(10, body), { statusCode: 403 });
  state.active = true;
  for (const count of [0, 2]) { state.memberships = count; await assert.rejects(publishOff(10, body), { code: 'INVALID_LEAD_TEAM' }); }
  assert.equal(state.writes, 0);
});

test('pending OFF blocks the whole team/cycle batch without partial publication', async () => {
  const state = setup(); state.rows[1].current_status = 'PENDING_TL';
  await assert.rejects(publishOff(10, body), { statusCode: 409, code: 'PENDING_OFF_REMAINS' });
  assert.equal(state.writes, 0); assert.equal(state.actions.length, 0);
});

test('stale preview, other-team/self ids, partial selection and repeat publishing are rejected', async () => {
  const state = setup();
  for (const entryIds of [[7], [7, 8, 11], [7, 12], [7, 8, 10]]) {
    await assert.rejects(publishOff(10, { cycleId: 2, entryIds }), { code: 'PUBLICATION_CHANGED' });
  }
  assert.equal(state.writes, 0); await publishOff(10, body);
  await assert.rejects(publishOff(10, body), { code: 'PUBLICATION_CHANGED' });
  assert.equal(state.actions.length, 2);
});

test('rejecting an approved day after preview invalidates publication confirmation', async () => {
  const state = setup(); state.rows[0].current_status = 'REJECTED';
  await assert.rejects(publishOff(10, body), { code: 'PUBLICATION_CHANGED' }); assert.equal(state.writes, 0);
});

test('audit failure rolls the entire status update back', async () => {
  const state = setup(); stub(models.RegistrationAction, 'bulkCreate', async () => { throw new Error('audit failed'); });
  await assert.rejects(publishOff(10, body), /audit failed/);
  assert.equal(state.rows[0].current_status, 'APPROVED'); assert.equal(state.rows[1].current_status, 'APPROVED');
  assert.equal(state.rolledBack, 1); assert.equal(state.committed, 0);
});

test('competing publication requests create only one set of publication actions', async () => {
  const state = setup(); const results = await Promise.allSettled([publishOff(10, body), publishOff(10, body)]);
  assert.equal(results.filter(result => result.status === 'fulfilled').length, 1);
  assert.equal(state.actions.length, 2); assert.equal(state.committed, 1);
});

test('invalid publication payloads do not reach the database', async () => {
  stub(models.sequelize, 'transaction', () => assert.fail('should validate before transaction'));
  for (const payload of [{}, { cycleId: 0, entryIds: [7] }, { cycleId: true, entryIds: [7] },
    { cycleId: 2, entryIds: [] }, { cycleId: 2, entryIds: [7, 7] }, { cycleId: 2, entryIds: ['7'] }]) {
    await assert.rejects(publishOff(10, payload), { statusCode: 400, code: 'INVALID_PUBLICATION' });
  }
});
