const { test, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const { RegistrationEntry } = require('./models');
const { getPublishedSchedule } = require('./services/published-schedule.service');
const original = RegistrationEntry.findAll;
afterEach(() => { RegistrationEntry.findAll = original; });

test('only queries active PUBLISHED entries and optional latest publication action', async () => {
  RegistrationEntry.findAll = async options => {
    assert.deepEqual(options.where, { is_active: true, current_status: 'PUBLISHED' });
    const action = options.include.find(include => include.as === 'actions');
    assert.equal(action.required, false);
    assert.equal(action.separate, true);
    assert.equal(action.limit, 1);
    assert.deepEqual(action.order, [['created_at', 'DESC'], ['action_id', 'DESC']]);
    assert.deepEqual(action.where, { action_type: 'PUBLISHED', new_status: 'PUBLISHED' });
    return [];
  };
  assert.deepEqual(await getPublishedSchedule(), { ok: true, rows: [] });
});

test('maps entry snapshot team, employee code, cycle, reason and true publication time', async () => {
  const base = {
    entry_id: '7', leave_date: '2026-11-15', custom_reason: '',
    submission: { employee: { emp_code: 'NV001', emp_name: 'Nguyễn An' }, cycle: { cycle_id: '2', cycle_name: 'Kỳ 11' } },
    team: { team_name: 'Team A' }, leaveType: { leave_type_code: 'OFF' },
    reason: { reason_name: 'Lý do từ danh mục' },
    actions: [{ created_at: '2026-11-15T09:00:00.000Z' }]
  };
  RegistrationEntry.findAll = async () => [base, { ...base, entry_id: '8', custom_reason: 'Lý do riêng', actions: [] }];
  const { rows } = await getPublishedSchedule();
  assert.deepEqual(rows[0], {
    id: '7', cycleKey: '2', cycleLabel: 'Kỳ 11', team: 'Team A', employeeName: 'Nguyễn An', employeeId: 'NV001',
    date: '2026-11-15', dateVN: '15/11/2026', type: 'OFF', reason: 'Lý do từ danh mục', publishedAt: '2026-11-15T09:00:00.000Z'
  });
  assert.equal(rows[1].reason, 'Lý do riêng');
  assert.equal(rows[1].publishedAt, null);
});

test('does not fallback to mock data on database failure', async () => {
  RegistrationEntry.findAll = async () => { throw new Error('database unavailable'); };
  await assert.rejects(getPublishedSchedule(), /database unavailable/);
});

test('personal published schedule restricts submission owner from JWT and never queries APPROVED', async () => {
  const { published } = require('./controllers/registration.controller');
  RegistrationEntry.findAll = async options => {
    assert.equal(options.where.current_status, 'PUBLISHED');
    assert.equal(options.include.find(include => include.as === 'submission').where.emp_id, 3);
    return [];
  };
  let response;
  const res = { status() { return this; }, json(body) { response = body; } };
  await published({ user: { empId: 3 }, query: { mine: 'true', empId: '999' } }, res, error => { throw error; });
  assert.deepEqual(response.rows, []);
});
