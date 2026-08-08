const { Op } = require('sequelize');

const {
  RegistrationEntry,
  RegistrationSubmission,
  RegistrationCycle,
   LeaveType
} = require('../models');

const {
  ACTIVE_BALANCE_STATUSES
} = require('./leave-balance.service');

function isValidDateFormat(dateValue) {
  if (typeof dateValue !== 'string') {
    return false;
  }

  const datePattern = /^\d{4}-\d{2}-\d{2}$/;

  if (!datePattern.test(dateValue)) {
    return false;
  }

  const date = new Date(`${dateValue}T00:00:00`);

  if (Number.isNaN(date.getTime())) {
    return false;
  }

  const [
    year,
    month,
    day
  ] = dateValue.split('-').map(Number);

  return (
    date.getFullYear() === year &&
    date.getMonth() + 1 === month &&
    date.getDate() === day
  );
}

function validateEntryStructure({
  entries
}) {
  const errors = [];

  if (!Array.isArray(entries)) {
    return [
      {
        code: 'ENTRIES_MUST_BE_ARRAY',
        message: 'entries phải là một mảng.'
      }
    ];
  }

  if (entries.length === 0) {
    return [
      {
        code: 'ENTRIES_REQUIRED',
        message:
          'Danh sách ngày đăng ký không được để trống.'
      }
    ];
  }

  entries.forEach((entry, index) => {
    if (
      !entry ||
      typeof entry !== 'object' ||
      Array.isArray(entry)
    ) {
      errors.push({
        code: 'INVALID_ENTRY_STRUCTURE',
        entryIndex: index,
        message:
          `Entry tại vị trí ${index} không hợp lệ.`
      });

      return;
    }

    if (
      typeof entry.leaveDate !== 'string' ||
      entry.leaveDate.trim() === ''
    ) {
      errors.push({
        code: 'LEAVE_DATE_REQUIRED',
        entryIndex: index,
        message:
          `Entry tại vị trí ${index} chưa có ngày nghỉ.`
      });
    } else if (
      !isValidDateFormat(entry.leaveDate)
    ) {
      errors.push({
        code: 'INVALID_LEAVE_DATE',
        entryIndex: index,
        leaveDate: entry.leaveDate,
        message:
          `Ngày ${entry.leaveDate} không đúng định dạng YYYY-MM-DD hoặc không tồn tại.`
      });
    }

    if (
      typeof entry.leaveTypeCode !== 'string' ||
      entry.leaveTypeCode.trim() === ''
    ) {
      errors.push({
        code: 'LEAVE_TYPE_REQUIRED',
        entryIndex: index,
        leaveDate: entry.leaveDate || null,
        message:
          `Entry tại vị trí ${index} chưa có loại nghỉ.`
      });
    }
  });

  return errors;
}

function validateDuplicateDatesInRequest({
  entries
}) {
  const errors = [];

  if (!Array.isArray(entries)) {
    return errors;
  }

  const dateMap = new Map();

  entries.forEach((entry, index) => {
    if (
      !entry ||
      typeof entry.leaveDate !== 'string' ||
      entry.leaveDate.trim() === ''
    ) {
      return;
    }

    const leaveDate = entry.leaveDate.trim();

    if (!dateMap.has(leaveDate)) {
      dateMap.set(leaveDate, [index]);
      return;
    }

    dateMap.get(leaveDate).push(index);
  });

  for (const [leaveDate, indexes] of dateMap) {
    if (indexes.length > 1) {
      errors.push({
        code: 'DUPLICATE_LEAVE_DATE_IN_REQUEST',
        leaveDate,
        entryIndexes: indexes,
        message:
          `Ngày ${leaveDate} đang được đăng ký nhiều hơn một lần trong cùng request.`
      });
    }
  }

  return errors;
}

async function validateDuplicateDatesInDatabase({
  empId,
  cycleId,
  entries,
  transaction = null
}) {
  const errors = [];

  if (!Array.isArray(entries) || entries.length === 0) {
    return errors;
  }

  // Lấy các ngày hợp lệ trong request
  const leaveDates = entries
    .map((entry) => entry?.leaveDate)
    .filter(
      (leaveDate) =>
        typeof leaveDate === 'string' &&
        leaveDate.trim() !== ''
    );

  if (leaveDates.length === 0) {
    return errors;
  }

  // Tìm các ngày nhân viên đã đăng ký và còn hiệu lực
  const existingEntries =
    await RegistrationEntry.findAll({
      attributes: [
        'entry_id',
        'leave_date',
        'current_status'
      ],
      include: [
        {
          model: RegistrationSubmission,
          as: 'submission',
          attributes: [],
          required: true,
          where: {
            emp_id: empId,
            cycle_id: cycleId
          }
        }
      ],
      where: {
        leave_date: {
          [Op.in]: leaveDates
        },
        current_status: {
          [Op.in]: ACTIVE_BALANCE_STATUSES
        },
        is_active: true
      },
      transaction
    });

  for (const existingEntry of existingEntries) {
    errors.push({
      code: 'LEAVE_DATE_ALREADY_REGISTERED',
      entryId: Number(existingEntry.entry_id),
      leaveDate: existingEntry.leave_date,
      currentStatus:
        existingEntry.current_status,
      message:
        `Ngày ${existingEntry.leave_date} đã được đăng ký trước đó.`
    });
  }

  return errors;
}

async function validateCycleAvailability({
  cycleId,
  transaction = null
}) {
  const errors = [];

  // Kiểm tra cycleId
  if (
    !Number.isInteger(Number(cycleId)) ||
    Number(cycleId) <= 0
  ) {
    return [
      {
        code: 'INVALID_CYCLE_ID',
        message: 'cycleId không hợp lệ.'
      }
    ];
  }

  // Lấy thông tin kỳ đăng ký
  const cycle = await RegistrationCycle.findOne({
    where: {
      cycle_id: Number(cycleId)
    },
    transaction
  });

  if (!cycle) {
    return [
      {
        code: 'CYCLE_NOT_FOUND',
        message: 'Không tìm thấy kỳ đăng ký.'
      }
    ];
  }

  if (cycle.status !== 'OPEN') {
    errors.push({
      code: 'REGISTRATION_CYCLE_NOT_OPEN',
      cycleId: Number(cycle.cycle_id),
      status: cycle.status,
      message: 'Kỳ đăng ký hiện không ở trạng thái mở.'
    });

    return errors;
  }

  const currentTime = new Date();

  const openTime = new Date(
    cycle.registration_open_time
  );

  const closingTime = new Date(
    cycle.registration_closing_time
  );

  if (currentTime < openTime) {
    errors.push({
      code: 'REGISTRATION_NOT_STARTED',
      cycleId: Number(cycle.cycle_id),
      registrationOpenTime:
        cycle.registration_open_time,
      message: 'Chưa đến thời gian mở đăng ký.'
    });
  }

  if (currentTime > closingTime) {
    errors.push({
      code: 'REGISTRATION_CLOSED',
      cycleId: Number(cycle.cycle_id),
      registrationClosingTime:
        cycle.registration_closing_time,
      message: 'Thời gian đăng ký đã kết thúc.'
    });
  }

  return errors;
}

async function validateSupportedLeaveTypes({
  entries,
  transaction = null
}) {
  const errors = [];

  if (!Array.isArray(entries) || entries.length === 0) {
    return errors;
  }

  // Lấy các mã loại nghỉ hợp lệ trong request
  const requestedCodes = [
    ...new Set(
      entries
        .map((entry) => entry?.leaveTypeCode)
        .filter(
          (leaveTypeCode) =>
            typeof leaveTypeCode === 'string' &&
            leaveTypeCode.trim() !== ''
        )
        .map((leaveTypeCode) =>
          leaveTypeCode.trim()
        )
    )
  ];

  if (requestedCodes.length === 0) {
    return errors;
  }

  // Lấy các loại nghỉ có trong database
  const leaveTypes = await LeaveType.findAll({
    where: {
      leave_type_code: requestedCodes
    },
    attributes: [
      'leave_type_code',
      'leave_type_name',
      'is_active'
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

  // Kiểm tra từng loại nghỉ trong request
  for (const leaveTypeCode of requestedCodes) {
    const leaveType =
      leaveTypeMap.get(leaveTypeCode);

    if (!leaveType) {
      errors.push({
        code: 'LEAVE_TYPE_NOT_FOUND',
        leaveTypeCode,
        message:
          `Không tìm thấy loại nghỉ ${leaveTypeCode}.`
      });

      continue;
    }

    if (!leaveType.is_active) {
      errors.push({
        code: 'LEAVE_TYPE_INACTIVE',
        leaveTypeCode,
        message:
          `Loại nghỉ ${leaveTypeCode} đã ngừng hoạt động.`
      });
    }
  }

  return errors;
}

module.exports = {
  isValidDateFormat,
  validateEntryStructure,
  validateDuplicateDatesInRequest,
  validateDuplicateDatesInDatabase,
  validateCycleAvailability,
  validateSupportedLeaveTypes
};