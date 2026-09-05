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
  validateEntryStructure,
  validateDuplicateDatesInRequest,
  validateDuplicateDatesInDatabase,
  validateCycleAvailability,
  validateSupportedLeaveTypes
} = require('./common-registration-rule.service');

const {
  RegistrationCycle
} = require('../models');


async function validateRegistration({
  empId,
  cycleId,
  entries,
  transaction = null,
  roles = []
}) {

  const isAdmin = roles.includes('ADMIN');

  const errors = [];


  // Kiểm tra cấu trúc request trước
  const structureErrors =
    validateEntryStructure({
      entries
    });

  errors.push(...structureErrors);


  if (structureErrors.length > 0) {
    return {
      valid: false,
      errors
    };
  }


  // Kiểm tra trùng ngày trong cùng request
  const duplicateRequestErrors =
    validateDuplicateDatesInRequest({
      entries
    });

  errors.push(...duplicateRequestErrors);


  /*
   * ADMIN được phép đăng ký ngoài thời gian mở form.
   * User thường vẫn phải kiểm tra cycle.
   */
  const cycleErrors =
    isAdmin
      ? []
      : await validateCycleAvailability({
          cycleId,
          transaction
        });

  errors.push(...cycleErrors);


  if (cycleErrors.length > 0) {
    return {
      valid: false,
      errors
    };
  }


  // Kiểm tra loại nghỉ
  const leaveTypeErrors =
    await validateSupportedLeaveTypes({
      entries,
      transaction
    });

  errors.push(...leaveTypeErrors);


  if (leaveTypeErrors.length > 0) {
    return {
      valid: false,
      errors
    };
  }


  // Kiểm tra ngày đã tồn tại trong database
  const duplicateDatabaseErrors =
    await validateDuplicateDatesInDatabase({
      empId,
      cycleId,
      entries,
      transaction
    });

  errors.push(...duplicateDatabaseErrors);


  // Lấy kỳ để xác định năm tính AL
  const cycle =
    await RegistrationCycle.findOne({
      where: {
        cycle_id: cycleId
      },
      transaction
    });


  const balanceYear = Number(
    String(cycle.start_date).slice(0, 4)
  );


  // Rule OFF
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


  // Rule AL
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