const { test, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const { RequireHC, RegistrationEntry } = require('./models');
const { Op } = require('sequelize');
const { getRequireHc } = require('./services/require-hc.service');
const originals = [RequireHC.findAll, RegistrationEntry.findAll];
afterEach(() => { [RequireHC.findAll, RegistrationEntry.findAll] = originals; });

test('computes shared task capacity without multiplying by teams and isolates cycle/task/date', async () => {
  const capacity = { require_hc_id: 1, cycle_id: 2, task_id: 1, working_date: '2026-11-15', max_off: 2, cycle: { cycle_name: 'Kỳ 11' }, task: { task_name: 'Mass' } };
  RequireHC.findAll = async () => [capacity,
    { ...capacity, require_hc_id: 2, task_id: 2 },
    { ...capacity, require_hc_id: 3, cycle_id: 3 },
    { ...capacity, require_hc_id: 4, working_date: '2026-11-16', max_off: 0 },
    { ...capacity, require_hc_id: 5, working_date: '2026-11-17' }];
  RegistrationEntry.findAll = async options => {
    assert.equal(options.where.is_active, true);
    assert.deepEqual(options.where.current_status[Op.in], ['PENDING_TL', 'APPROVED', 'PUBLISHED', 'UNPUBLISHED']);
    assert.equal(options.include.find(i => i.as === 'leaveType').where.leave_type_code, 'OFF');
    assert.deepEqual(options.group, ['RegistrationEntry.leave_date', 'RegistrationEntry.task_id', 'submission.cycle_id']);
    assert.equal(options.where.emp_id, undefined);
    assert.equal(options.where.team_id, undefined);
    return [{ cycle_id: '2', task_id: '1', leave_date: '2026-11-15', registered_off: '3' },
      { cycle_id: '2', task_id: '1', leave_date: '2026-11-17', registered_off: '1' }];
  };
  const { rows } = await getRequireHc();
  assert.equal(rows.length, 5);
  assert.equal(rows[0].registeredOff, 3);
  assert.equal(rows[0].remainingSlot, 0);
  assert.equal(rows[0].full, true);
  assert.equal(rows[0].dayName, 'Chủ nhật');
  assert.equal(rows[0].dateVN, '15/11/2026');
  assert.equal(rows[1].registeredOff, 0);
  assert.equal(rows[2].registeredOff, 0);
  assert.equal(rows[3].full, true);
  assert.equal(rows[4].remainingSlot, 1);
  assert.equal(rows[4].full, false);
  assert.equal('team' in rows[0], false);
});

test('returns empty data without fake defaults or count query when capacity is missing', async () => {
  RequireHC.findAll = async () => [];
  RegistrationEntry.findAll = async () => assert.fail('unexpected query');
  assert.deepEqual(await getRequireHc(), { ok: true, rows: [] });
});

test('propagates database errors rather than returning mock data', async () => {
  RequireHC.findAll = async () => { throw new Error('DB unavailable'); };
  await assert.rejects(getRequireHc(), /DB unavailable/);
});
