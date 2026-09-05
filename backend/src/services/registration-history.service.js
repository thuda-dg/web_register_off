const {RegistrationSubmission, RegistrationEntry, RegistrationCycle, LeaveType, RegistrationAction} = require('../models');

async function getMyRegistrationEntries({
  empId,
  transaction = null
}) {
  const submissions =
    await RegistrationSubmission.findAll({
      where: {
        emp_id: Number(empId)
      },
      attributes:[
        'submission_id',
        'submission_code',
        'submitted_at',
        'cycle_id'
      ],
      include:[
        {
          model: RegistrationCycle,
          as:'cycle',
          attributes:[
            'cycle_id',
            'cycle_name'
          ]
        },

        {
          model: RegistrationEntry,
          as:'entries',
          required:true,
          where:{
            is_active:true
          },
          attributes:[
            'entry_id',
            'registration_code',
            'leave_date',
            'reason_id',
            'custom_reason',
            'team_id',
            'task_id',
            'current_status'
          ],
          include:[
            {
              model: LeaveType,
              as:'leaveType',
              attributes:[
                'leave_type_id',
                'leave_type_code',
                'leave_type_name',
                'deduction_quantity'
              ]
            },

            {
              model: RegistrationAction,
              as:'actions',
              required:false,
              attributes:[
                'action_type',
                'created_at',
                'new_status'
              ]
            }
          ]
        }

      ],
      order:[
        [
          'submitted_at',
          'DESC'
        ]
      ],
      transaction
    });

  const rows = [];
  for(const submission of submissions){
    for(const entry of submission.entries){
      const submittedAction =
        entry.actions?.find(
          action =>
            action.action_type === 'SUBMITTED'
        );
      const approvedAction =
        entry.actions?.find(
          action =>
            [
              'APPROVED',
              'TL_APPROVED'
            ].includes(
              action.action_type
            )
        );
      rows.push({
        cycleKey:
          String(submission.cycle_id),
        cycleLabel:
          submission.cycle?.cycle_name || '',
        date:
          entry.leave_date,
        type:
          entry.leaveType.leave_type_code,
        typeName:
          entry.leaveType.leave_type_name,
        tlStatus:
          entry.current_status,
        submittedAt:
          submittedAction?.created_at ||
          submission.submitted_at,
        approvedAt:
          approvedAction?.created_at ||
          null,
        submissionId:
          Number(submission.submission_id),
        entryId:
          Number(entry.entry_id)
      });
    }
  }
  const summary = {
    total:
      rows.length,
    pending:
      rows.filter(
        x => x.tlStatus === 'PENDING_TL'
      ).length,
    approved:
      rows.filter(
        x => x.tlStatus === 'TL_APPROVED'
      ).length,
    published:
      rows.filter(
        x => x.tlStatus === 'PUBLIC'
      ).length

  };
  return {
    summary,
    rows
  };

}

module.exports = {
  getMyRegistrationEntries
};