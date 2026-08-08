const {
  sequelize,
  RegistrationSubmission,
  RegistrationEntry,
  RegistrationAction
} = require('../models');

const {
  validateRegistration
} = require('./registration-validation.service');

const {
  prepareRegistrationEntries
} = require(
  './registration-entry-preparation.service'
);

function generateRegistrationCode({
  empId,
  cycleId
}) {
  const timestamp = Date.now();

  return `REG-${cycleId}-${empId}-${timestamp}`;
}

async function submitRegistration({
  empId,
  cycleId,
  entries
}) {
  const transaction =
    await sequelize.transaction();

  try {
    const validationResult =
      await validateRegistration({
        empId,
        cycleId,
        entries,
        transaction
      });

    if (!validationResult.valid) {
      const error = new Error(
        'Dữ liệu đăng ký không hợp lệ.'
      );

      error.code =
        'REGISTRATION_VALIDATION_FAILED';

      error.statusCode = 400;

      error.validationErrors =
        validationResult.errors;

      throw error;
    }

    const preparedEntries =
      await prepareRegistrationEntries({
        empId,
        entries,
        transaction
      });

    const submissionCode =
      generateRegistrationCode({
        empId,
        cycleId
      });

    const submission =
      await RegistrationSubmission.create(
        {
          submission_code:
            submissionCode,

          submitted_at:
            new Date(),

          notes:
            null,

          emp_id:
            Number(empId),

          cycle_id:
            Number(cycleId)
        },
        {
          transaction
        }
      );

    const createdEntries = [];

    for (
      let index = 0;
      index < preparedEntries.length;
      index += 1
    ) {
      const entry = preparedEntries[index];

      const entryRegistrationCode =
        `${submissionCode}-${String(index + 1).padStart(3, '0')}`;

      const createdEntry =
        await RegistrationEntry.create(
          {
            registration_code:
              entryRegistrationCode,

            submission_id:
              submission.submission_id,

            leave_date:
              entry.leaveDate,

            leave_type_id:
              entry.leaveTypeId,

            reason_id:
              entry.reasonId,

            custom_reason:
              entry.customReason || null,

            team_id:
              entry.teamId,

            task_id:
              entry.taskId,

            current_status:
              'PENDING_TL',

            is_active:
              true
          },
          {
            transaction
          }
        );

      createdEntries.push(createdEntry);

      await RegistrationAction.create(
        {
          entry_id:
            createdEntry.entry_id,

          action_type:
            'SUBMITTED',

          old_status:
            null,

          new_status:
            'PENDING_TL',

          performed_by_user_id:
            null,

          note:
            null
        },
        {
          transaction
        }
      );
    }

    await transaction.commit();

    return {
      submissionCode,

      submissionId:
        Number(
          submission.submission_id
        ),

      entryCount:
        createdEntries.length,

      entries:
        createdEntries.map(
          (entry, index) => ({
            entryId:
              Number(entry.entry_id),

            registrationCode:
              entry.registration_code,

            leaveDate:
              entry.leave_date,

            leaveTypeId:
              Number(entry.leave_type_id),

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

            leaveUnits:
              preparedEntries[index]
                .leaveUnits,

            currentStatus:
              entry.current_status
          })
        )
    };
  } catch (error) {
    await transaction.rollback();

    throw error;
  }
}

module.exports = {
  generateRegistrationCode,
  submitRegistration
};