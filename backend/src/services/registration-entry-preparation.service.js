const {
  LeaveType
} = require('../models');

const {
  getEmployeeAssignmentByDate
} = require('./employee-assignment.service');

function getLeaveUnits(leaveTypeCode) {
  if (leaveTypeCode === 'A/2') {
    return 0.5;
  }

  return 1;
}

async function prepareRegistrationEntries({
  empId,
  entries,
  transaction = null
}) {
  if (!Array.isArray(entries) || entries.length === 0) {
    return [];
  }

  const requestedLeaveTypeCodes = [
    ...new Set(
      entries.map((entry) =>
        entry.leaveTypeCode.trim()
      )
    )
  ];

  const leaveTypes = await LeaveType.findAll({
    where: {
      leave_type_code: requestedLeaveTypeCodes
    },
    attributes: [
      'leave_type_id',
      'leave_type_code',
      'leave_type_name'
    ],
    transaction
  });

  const leaveTypeMap = new Map();

  for (const leaveType of leaveTypes) {
    leaveTypeMap.set(
      leaveType.leave_type_code,
      leaveType
    );
  }

  const preparedEntries = [];

  for (const entry of entries) {
    const leaveDate = entry.leaveDate.trim();

    const leaveTypeCode =
      entry.leaveTypeCode.trim();

    const leaveType =
      leaveTypeMap.get(leaveTypeCode);

    if (!leaveType) {
      const error = new Error(
        `Không tìm thấy loại nghỉ ${leaveTypeCode}.`
      );

      error.code = 'LEAVE_TYPE_NOT_FOUND';
      error.statusCode = 400;
      error.leaveTypeCode = leaveTypeCode;

      throw error;
    }

    const assignment =
      await getEmployeeAssignmentByDate({
        empId,
        workingDate: leaveDate,
        transaction
      });

    preparedEntries.push({
        leaveDate,

        leaveTypeId: Number(
            leaveType.leave_type_id
        ),

        leaveTypeCode:
            leaveType.leave_type_code,

        leaveTypeName:
            leaveType.leave_type_name,

        reasonId:
            entry.reasonId !== undefined &&
            entry.reasonId !== null
            ? Number(entry.reasonId)
            : null,

        customReason:
            typeof entry.customReason === 'string' &&
            entry.customReason.trim() !== ''
            ? entry.customReason.trim()
            : null,

        teamId:
            assignment.team.teamId,

        teamCode:
            assignment.team.teamCode,

        taskId:
            assignment.task.taskId,

        taskCode:
            assignment.task.taskCode,

        leaveUnits:
            getLeaveUnits(leaveTypeCode)
        });
  }

  return preparedEntries;
}

module.exports = {
  getLeaveUnits,
  prepareRegistrationEntries
};