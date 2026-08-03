const {
  validateWeeklyOff,
  validateOffBalance,
  validateOffDatesInCycle,
  validateOffRequireHC
} = require('./off-rule.service');

const {
  validateAnnualLeaveTypes,
  validateAnnualLeaveDatesInCycle,
  validateAnnualLeaveReasons,
  validateAnnualLeaveBalance
} = require('./annual-leave-rule.service');

const {
  RegistrationCycle
} = require('../models');

async function validateRegistration({
  empId,
  cycleId,
  entries,
  transaction = null
}) {
  const errors = [];

  // Lấy kỳ đăng ký để xác định năm tính phép
  const cycle = await RegistrationCycle.findOne({
    where: {
      cycle_id: cycleId
    },
    transaction
  });

  if (!cycle) {
    return {
      valid: false,
      errors: [
        {
          code: 'CYCLE_NOT_FOUND',
          message: 'Không tìm thấy kỳ đăng ký.'
        }
      ]
    };
  }

  const balanceYear = Number(
    String(cycle.start_date).slice(0, 4)
  );

  // Kiểm tra rule OFF
  const offDateErrors =
    await validateOffDatesInCycle({
      cycleId,
      entries,
      transaction
    });

  errors.push(...offDateErrors);

  const offBalanceErrors =
    await validateOffBalance({
      empId,
      cycleId,
      entries,
      transaction
    });

  errors.push(...offBalanceErrors);

  const weeklyOffErrors =
    await validateWeeklyOff({
      empId,
      cycleId,
      entries,
      transaction
    });

  errors.push(...weeklyOffErrors);

  const requireHCErrors =
    await validateOffRequireHC({
      empId,
      cycleId,
      entries,
      transaction
    });

  errors.push(...requireHCErrors);

  // Kiểm tra rule nghỉ phép A và A/2
  const annualLeaveTypeErrors =
    await validateAnnualLeaveTypes({
      entries,
      transaction
    });

  errors.push(...annualLeaveTypeErrors);

  const annualLeaveDateErrors =
    await validateAnnualLeaveDatesInCycle({
      cycleId,
      entries,
      transaction
    });

  errors.push(...annualLeaveDateErrors);

  const annualLeaveReasonErrors =
    await validateAnnualLeaveReasons({
      entries,
      transaction
    });

  errors.push(...annualLeaveReasonErrors);

  const annualLeaveBalanceErrors =
    await validateAnnualLeaveBalance({
      empId,
      balanceYear,
      entries,
      transaction
    });

  errors.push(...annualLeaveBalanceErrors);

  return {
    valid: errors.length === 0,
    errors
  };
}

module.exports = {
  validateRegistration
};