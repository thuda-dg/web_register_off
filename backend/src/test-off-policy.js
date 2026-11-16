const { test, afterEach } = require('node:test');
const assert = require('node:assert/strict');
process.env.AUTH_TOKEN_SECRET ||= 'off-policy-test-secret';
const models = require('./models');
const { Op } = require('sequelize');
const { checkOffPattern, validateOffPattern, validateOffBalance, validateOffRequireHC } = require('./services/off-rule.service');
const { validateRegistration } = require('./services/registration-validation.service');
const { submitRegistration } = require('./services/registration-submit.service');
const original = [];
function stub(object, key, fn) { original.push([object, key, object[key]]); object[key] = fn; }
afterEach(() => { for (const [object, key, value] of original.splice(0).reverse()) object[key] = value; });
const off = dates => dates.map(leaveDate => ({ leaveDate, leaveTypeCode: 'OFF' }));
const codes = errors => errors.map(error => error.code);

test('allows two OFF/week; blocks the third using saved and requested days across cycles', () => {
  assert.deepEqual(checkOffPattern({ entries: off(['2026-11-02', '2026-11-08']) }), []);
  assert.deepEqual(checkOffPattern({ entries: off(['2026-11-08']), historyDates: ['2026-11-02'] }), []);
  const errors = checkOffPattern({ entries: off(['2026-11-04']), historyDates: ['2026-11-02', '2026-11-03'] });
  assert.ok(codes(errors).includes('OFF_WEEK_LIMIT_EXCEEDED'));
  assert.deepEqual(checkOffPattern({ entries: off(['2026-11-09']), historyDates: ['2026-11-08'] }), []);
});

test('uses Monday-Sunday week boundaries across years', () => {
  const errors = checkOffPattern({ entries: off(['2027-01-01', '2027-01-03']), historyDates: ['2026-12-28'] });
  assert.ok(codes(errors).includes('OFF_WEEK_LIMIT_EXCEEDED'));
});

test('blocks four consecutive Sundays including history from other cycles, but allows three', () => {
  const historyDates = ['2026-10-25', '2026-11-01', '2026-11-08'];
  assert.ok(codes(checkOffPattern({ entries: off(['2026-11-15']), historyDates })).includes('FOUR_CONSECUTIVE_SUNDAYS'));
  assert.ok(!codes(checkOffPattern({ entries: off(['2026-11-22']), historyDates })).includes('FOUR_CONSECUTIVE_SUNDAYS'));
  assert.deepEqual(checkOffPattern({ entries: off(['2026-11-08']), historyDates: historyDates.slice(0, 2) }), []);
});

test('gap allows exactly ten days, rejects eleven, and includes saved dates only in same cycle', () => {
  assert.deepEqual(checkOffPattern({ entries: off(['2026-11-12']), cycleDates: ['2026-11-02'] }), []);
  assert.ok(codes(checkOffPattern({ entries: off(['2026-11-13']), cycleDates: ['2026-11-02'] })).includes('OFF_GAP_EXCEEDED'));
  assert.deepEqual(checkOffPattern({ entries: off(['2026-11-13']), historyDates: ['2026-10-01'] }), []);
  assert.deepEqual(checkOffPattern({ entries: off(['2026-11-02']) }), []);
});

test('adding an intermediate OFF can repair a gap; DATEONLY arithmetic handles leap day', () => {
  assert.deepEqual(checkOffPattern({ entries: off(['2026-11-11']), cycleDates: ['2026-11-01', '2026-11-21'] }), []);
  assert.deepEqual(checkOffPattern({ entries: off(['2028-03-01']), cycleDates: ['2028-02-20'] }), []);
  assert.ok(codes(checkOffPattern({ entries: off(['2028-03-02']), cycleDates: ['2028-02-20'] })).includes('OFF_GAP_EXCEEDED'));
});

function database({ used = 0, capacity = 2, occupied = 0 } = {}) {
  const state = { locks: [], rollback: false };
  stub(models.RegistrationCycle, 'findOne', async () => ({ cycle_id: 2, start_date: '2026-11-01', end_date: '2026-11-30', status: 'OPEN', registration_open_time: '2020-01-01', registration_closing_time: '2099-01-01' }));
  stub(models.EmployeeCycleOff, 'findOne', async () => ({ entitled_quantity: 10, adjusted_quantity: 0 }));
  stub(models.LeaveType, 'findAll', async () => [{ leave_type_id: 1, leave_type_code: 'OFF', is_active: true }]);
  stub(models.RegistrationEntry, 'findAll', async () => []);
  stub(models.RegistrationEntry, 'count', async options => {
    const employeeQuery = options.include.find(i => i.as === 'submission').where.emp_id;
    if (!employeeQuery && options.transaction) assert.ok(state.locks.includes('capacity'));
    return employeeQuery ? used : occupied;
  });
  stub(models.sequelize, 'query', async () => [[{ task_id: 1 }]]);
  stub(models.RequireHC, 'findOne', async options => {
    if (options.transaction) {
      assert.equal(options.lock, 'UPDATE');
      state.locks.push('capacity');
    } else assert.equal(options.lock, undefined);
    return { max_off: capacity };
  });
  return state;
}

test('four per cycle is a hard cap even with ten allocated days; saved OFFs consume the cap', async () => {
  database({ used: 3 });
  assert.deepEqual(await validateOffBalance({ empId: 3, cycleId: 2, entries: off(['2026-11-15']) }), []);
  assert.ok(codes(await validateOffBalance({ empId: 3, cycleId: 2, entries: off(['2026-11-15', '2026-11-16']) })).includes('OFF_CYCLE_LIMIT_EXCEEDED'));
});

test('rejects five OFF in a single request despite sufficient balance', async () => {
  database();
  const errors = await validateOffBalance({ empId: 3, cycleId: 2, entries: off(['2026-11-02', '2026-11-08', '2026-11-12', '2026-11-19', '2026-11-25']) });
  assert.ok(codes(errors).includes('OFF_CYCLE_LIMIT_EXCEEDED'));
  assert.ok(!codes(errors).includes('INSUFFICIENT_OFF_BALANCE'));
});

test('RequireHC without capacity or task cannot accept OFF', async () => {
  database();
  const args = { empId: 3, cycleId: 2, entries: off(['2026-11-15']) };
  stub(models.RequireHC, 'findOne', async () => null);
  assert.ok(codes(await validateOffRequireHC(args)).includes('REQUIRE_HC_NOT_FOUND'));
  stub(models.sequelize, 'query', async () => [[]]);
  assert.ok(codes(await validateOffRequireHC(args)).includes('TASK_NOT_FOUND'));
});

test('preserves allocation check when it is stricter than four days', async () => {
  database();
  stub(models.EmployeeCycleOff, 'findOne', async () => ({ entitled_quantity: 1, adjusted_quantity: 0 }));
  assert.ok(codes(await validateOffBalance({ empId: 3, cycleId: 2, entries: off(['2026-11-15', '2026-11-16']) })).includes('INSUFFICIENT_OFF_BALANCE'));
});

test('history query counts only active OFF at balance statuses, across cycles for week/Sunday rules', async () => {
  const scopes = [];
  stub(models.RegistrationEntry, 'findAll', async options => {
    assert.equal(options.where.is_active, true);
    assert.deepEqual(options.where.current_status[Op.in], ['PENDING_TL', 'APPROVED', 'PUBLISHED', 'UNPUBLISHED']);
    assert.equal(options.include[1].where.leave_type_code, 'OFF');
    scopes.push(options.include[0].where);
    return [];
  });
  await validateOffPattern({ empId: 3, cycleId: 2, entries: off(['2026-11-15']) });
  assert.deepEqual(scopes, [{ emp_id: 3 }, { emp_id: 3, cycle_id: 2 }]);
});

test('RequireHC allows the last slot and rejects excess, locks before counting on submit', async () => {
  database({ occupied: 1 });
  const args = { empId: 3, cycleId: 2, entries: off(['2026-11-15']), transaction: { LOCK: { UPDATE: 'UPDATE' } } };
  assert.deepEqual(await validateOffRequireHC(args), []);
  database({ occupied: 2 });
  assert.ok(codes(await validateOffRequireHC(args)).includes('REQUIRE_HC_FULL'));
  assert.ok(codes(await validateOffRequireHC({ ...args, transaction: null })).includes('REQUIRE_HC_FULL'));
});

test('shared validator applies new rules even for ADMIN; missing cycle returns a validation error', async () => {
  database();
  const result = await validateRegistration({ empId: 3, cycleId: 2, roles: ['ADMIN'], entries: off(['2026-11-02', '2026-11-03', '2026-11-04']) });
  assert.equal(result.valid, false);
  assert.ok(codes(result.errors).includes('OFF_WEEK_LIMIT_EXCEEDED'));
  stub(models.RegistrationCycle, 'findOne', async () => null);
  const missing = await validateRegistration({ empId: 3, cycleId: 999, roles: ['ADMIN'], entries: off(['2026-11-15']) });
  assert.ok(codes(missing.errors).includes('CYCLE_NOT_FOUND'));
});

test('submit locks employee first and rolls back without writes on an invalid OFF schedule', async () => {
  const state = database();
  stub(models.Employee, 'findOne', async options => {
    assert.equal(options.lock, 'UPDATE'); state.locks.push('employee'); return { emp_id: 3 };
  });
  stub(models.sequelize, 'transaction', async () => ({ LOCK: { UPDATE: 'UPDATE' },
    commit: async () => assert.fail('should not commit'), rollback: async () => { state.rollback = true; } }));
  stub(models.RegistrationSubmission, 'create', async () => assert.fail('invalid schedule must not be saved'));
  await assert.rejects(submitRegistration({ empId: 3, cycleId: 2, roles: ['ADMIN'], entries: off(['2026-11-02', '2026-11-03', '2026-11-04']) }), { code: 'REGISTRATION_VALIDATION_FAILED', statusCode: 400 });
  assert.equal(state.locks[0], 'employee');
  assert.equal(state.rollback, true);
});
