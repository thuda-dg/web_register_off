const { test } = require('node:test');
const assert = require('node:assert/strict');
const { RegistrationSubmission } = require('./models');
const { getMyRegistrationEntries } = require('./services/registration-history.service');

test('history summary counts canonical entry statuses and maps approval timestamps', async () => {
  const original = RegistrationSubmission.findAll;
  RegistrationSubmission.findAll = async () => [{
    submission_id: 1, cycle_id: 2, submitted_at: '2026-11-15', cycle: { cycle_name: 'Test' },
    entries: ['PENDING_TL', 'APPROVED', 'PUBLISHED', 'REJECTED', 'UNPUBLISHED', 'CANCELLED'].map((status, index) => ({
      entry_id: index + 1, leave_date: '2026-11-15', current_status: status,
      leaveType: { leave_type_code: 'OFF', leave_type_name: 'Week Off' },
      actions: status === 'APPROVED' ? [{ action_type: 'TL_APPROVED', created_at: '2026-11-16' }] : []
    }))
  }];
  try {
    const result = await getMyRegistrationEntries({ empId: 3 });
    assert.deepEqual(result.summary, { total: 6, pending: 1, approved: 1, published: 1 });
    assert.equal(result.rows[1].approvedAt, '2026-11-16');
  } finally { RegistrationSubmission.findAll = original; }
});
