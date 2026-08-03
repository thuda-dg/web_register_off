const { Op } = require('sequelize');

const {
  RegistrationEntry,
  RegistrationSubmission
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

module.exports = {
  isValidDateFormat,
  validateEntryStructure,
  validateDuplicateDatesInRequest,
  validateDuplicateDatesInDatabase
};