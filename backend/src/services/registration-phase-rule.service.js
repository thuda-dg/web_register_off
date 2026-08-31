const { Op } = require('sequelize');

const {
  RegistrationEntry,
  RegistrationSubmission,
  LeaveType
} = require('../models');

const {
  ACTIVE_BALANCE_STATUSES
} = require('./leave-balance.service');

async function validateRegistrationPhase({
  empId,
  cycleId,
  entries,
  transaction = null
}) {
  const errors = [];

  // Kiểm tra request có OFF hay không
  const requestHasOff = entries.some(
    (entry) =>
      entry.leaveTypeCode === 'OFF'
  );

  // Kiểm tra request có loại nghỉ khác OFF hay không
  const requestHasNonOff = entries.some(
    (entry) =>
      entry.leaveTypeCode !== 'OFF'
  );

  // Kiểm tra database đã có OFF trong kỳ hay chưa
  const existingOffCount =
    await RegistrationEntry.count({
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
        },
        {
          model: LeaveType,
          as: 'leaveType',
          attributes: [],
          required: true,
          where: {
            leave_type_code: 'OFF'
          }
        }
      ],

      where: {
        current_status: {
          [Op.in]:
            ACTIVE_BALANCE_STATUSES
        },

        is_active: true
      },

      transaction
    });

  const hasExistingOff =
    existingOffCount > 0;

  // Chưa có OFF thì chỉ được đăng ký OFF
  if (
    !hasExistingOff &&
    requestHasNonOff
  ) {
    errors.push({
      code:
        'OFF_REQUIRED_FIRST',

      message:
        'Bạn cần đăng ký OFF trước. ' +
        'Sau khi OFF được ghi nhận, hệ thống mới cho phép đăng ký các loại nghỉ khác.'
    });

    return errors;
  }

  // Đã có OFF rồi thì không cho đăng ký OFF thêm ở phase sau
  if (
    hasExistingOff &&
    requestHasOff
  ) {
    errors.push({
      code:
        'OFF_PHASE_COMPLETED',

      message:
        'Bạn đã hoàn tất bước đăng ký OFF trong kỳ này. ' +
        'Bạn chỉ có thể đăng ký các loại nghỉ khác.'
    });

    return errors;
  }

  return errors;
}

module.exports = {
  validateRegistrationPhase
};