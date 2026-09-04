const {
  RegistrationSubmission,
  RegistrationEntry,
  LeaveType
} = require('../models');

async function getMyRegistrationEntries({
  empId,
  cycleId,
  transaction = null
}) {
  const submissions =
    await RegistrationSubmission.findAll({
      where: {
        emp_id: Number(empId),
        cycle_id: Number(cycleId)
      },
      attributes: [
        'submission_id',
        'submission_code',
        'submitted_at'
      ],
      include: [
        {
          model: RegistrationEntry,
          as: 'entries',
          required: false,
          where: {
            is_active: true
          },
          attributes: [
            'entry_id',
            'registration_code',
            'leave_date',
            'reason_id',
            'custom_reason',
            'team_id',
            'task_id',
            'current_status'
          ],
          include: [
            {
              model: LeaveType,
              as: 'leaveType',
              required: true,
              attributes: [
                'leave_type_id',
                'leave_type_code',
                'leave_type_name',
                'deduction_quantity'
              ]
            }
          ]
        }
      ],
      order: [
        ['submitted_at', 'DESC'],
        [
          {
            model: RegistrationEntry,
            as: 'entries'
          },
          'leave_date',
          'ASC'
        ]
      ],
      transaction
    });

  const entries = [];

  for (const submission of submissions) {
    for (const entry of submission.entries || []) {
      entries.push({
        submissionId:
          Number(submission.submission_id),

        submissionCode:
          submission.submission_code,

        submittedAt:
          submission.submitted_at,

        entryId:
          Number(entry.entry_id),

        registrationCode:
          entry.registration_code,

        leaveDate:
          entry.leave_date,

        leaveTypeId:
          Number(
            entry.leaveType.leave_type_id
          ),

        leaveTypeCode:
          entry.leaveType.leave_type_code,

        leaveTypeName:
          entry.leaveType.leave_type_name,

        leaveUnits:
          Number(
            entry.leaveType.deduction_quantity
          ),

        reasonId:
          entry.reason_id !== null
            ? Number(entry.reason_id)
            : null,

        customReason:
          entry.custom_reason || null,

        teamId:
          Number(entry.team_id),

        taskId:
          Number(entry.task_id),

        currentStatus:
          entry.current_status
      });
    }
  }

  const hasOff =
    entries.some(
      entry =>
        entry.leaveTypeCode === 'OFF' &&
        [
          'PENDING_TL',
          'APPROVED',
          'PUBLISHED',
          'UNPUBLISHED'
        ].includes(entry.currentStatus)
    );

  return {
    hasOff,
    entries
  };
}

module.exports = {
  getMyRegistrationEntries
};