const {
  RegistrationEntry, RegistrationSubmission, RegistrationCycle,
  RegistrationAction, Employee, Team, LeaveType, LeaveReason
} = require('../models');

async function getPublishedSchedule() {
  const entries = await RegistrationEntry.findAll({
    where: { is_active: true, current_status: 'PUBLISHED' },
    attributes: ['entry_id', 'leave_date', 'custom_reason'],
    include: [
      {
        model: RegistrationSubmission, as: 'submission', required: true, attributes: ['submission_id'],
        include: [
          { model: Employee, as: 'employee', required: true, attributes: ['emp_code', 'emp_name'] },
          { model: RegistrationCycle, as: 'cycle', required: true, attributes: ['cycle_id', 'cycle_name'] }
        ]
      },
      { model: Team, as: 'team', required: true, attributes: ['team_name'] },
      { model: LeaveType, as: 'leaveType', required: true, attributes: ['leave_type_code'] },
      { model: LeaveReason, as: 'reason', required: false, attributes: ['reason_name'] },
      {
        model: RegistrationAction, as: 'actions', required: false, separate: true,
        where: { action_type: 'PUBLISHED', new_status: 'PUBLISHED' },
        attributes: ['action_id', 'created_at'],
        order: [['created_at', 'DESC'], ['action_id', 'DESC']], limit: 1
      }
    ],
    order: [['leave_date', 'DESC'], ['entry_id', 'DESC']]
  });
  return {
    ok: true,
    rows: entries.map(entry => {
      const submission = entry.submission;
      const date = String(entry.leave_date);
      return {
        id: String(entry.entry_id),
        cycleKey: String(submission.cycle.cycle_id),
        cycleLabel: submission.cycle.cycle_name,
        team: entry.team.team_name,
        employeeName: submission.employee.emp_name,
        employeeId: submission.employee.emp_code,
        date,
        dateVN: date.split('-').reverse().join('/'),
        type: entry.leaveType.leave_type_code,
        reason: entry.custom_reason || entry.reason?.reason_name || '',
        publishedAt: entry.actions?.[0]?.created_at ?? null
      };
    })
  };
}

module.exports = { getPublishedSchedule };
