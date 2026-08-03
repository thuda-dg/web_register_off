const {
  LeaveType,
  RegistrationCycle,
  LeaveReason
} = require('../models');

const {
  getAnnualLeaveBalance
} = require('./leave-balance.service');

async function validateAnnualLeaveTypes({
  entries,
  transaction = null
}) {
  const errors = [];

  // Chỉ lấy các entry nghỉ phép A và A/2
  const annualLeaveEntries = entries.filter(
    (entry) =>
      entry.leaveTypeCode === 'A' ||
      entry.leaveTypeCode === 'A/2'
  );

  if (annualLeaveEntries.length === 0) {
    return errors;
  }

  // Kiểm tra định dạng từng entry
  for (const entry of annualLeaveEntries) {
    if (
      typeof entry.leaveDate !== 'string' ||
      entry.leaveDate.trim() === ''
    ) {
      errors.push({
        code: 'LEAVE_DATE_REQUIRED',
        message:
          'Ngày nghỉ phép không được để trống.'
      });
    }

    if (
      typeof entry.leaveTypeCode !== 'string' ||
      entry.leaveTypeCode.trim() === ''
    ) {
      errors.push({
        code: 'LEAVE_TYPE_REQUIRED',
        leaveDate: entry.leaveDate || null,
        message:
          'Loại nghỉ không được để trống.'
      });
    }
  }

  // Lấy loại nghỉ A và A/2 từ database
  const leaveTypes = await LeaveType.findAll({
    where: {
      leave_type_code: [
        'A',
        'A/2'
      ]
    },
    attributes: [
      'leave_type_id',
      'leave_type_code',
      'leave_type_name',
      'need_reason',
      'deduction_source',
      'deduction_quantity',
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

  // Kiểm tra loại nghỉ trong request
  for (const entry of annualLeaveEntries) {
    const leaveType =
      leaveTypeMap.get(entry.leaveTypeCode);

    if (!leaveType) {
      errors.push({
        code: 'LEAVE_TYPE_NOT_FOUND',
        leaveDate: entry.leaveDate,
        leaveTypeCode: entry.leaveTypeCode,
        message:
          `Không tìm thấy loại nghỉ ${entry.leaveTypeCode}.`
      });

      continue;
    }

    if (!leaveType.is_active) {
      errors.push({
        code: 'LEAVE_TYPE_INACTIVE',
        leaveDate: entry.leaveDate,
        leaveTypeCode: entry.leaveTypeCode,
        message:
          `Loại nghỉ ${entry.leaveTypeCode} đã ngừng hoạt động.`
      });
    }

    if (
      leaveType.deduction_source !== 'AL'
    ) {
      errors.push({
        code: 'INVALID_AL_DEDUCTION_SOURCE',
        leaveDate: entry.leaveDate,
        leaveTypeCode: entry.leaveTypeCode,
        message:
          `Loại nghỉ ${entry.leaveTypeCode} không được cấu hình trừ phép năm.`
      });
    }

    const deductionQuantity =
      Number(leaveType.deduction_quantity);

    if (
      !Number.isFinite(deductionQuantity) ||
      deductionQuantity <= 0
    ) {
      errors.push({
        code: 'INVALID_AL_DEDUCTION_QUANTITY',
        leaveDate: entry.leaveDate,
        leaveTypeCode: entry.leaveTypeCode,
        message:
          `Số phép trừ của loại nghỉ ${entry.leaveTypeCode} không hợp lệ.`
      });
    }
  }

  return errors;
}

async function validateAnnualLeaveDatesInCycle({
  cycleId,
  entries,
  transaction = null
}) {
  const errors = [];

  // Chỉ lấy các entry A và A/2
  const annualLeaveEntries = entries.filter(
    (entry) =>
      entry.leaveTypeCode === 'A' ||
      entry.leaveTypeCode === 'A/2'
  );

  if (annualLeaveEntries.length === 0) {
    return errors;
  }

  // Lấy thông tin kỳ đăng ký
  const cycle = await RegistrationCycle.findOne({
    where: {
      cycle_id: cycleId
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

  // Kiểm tra từng ngày nghỉ phép
  for (const entry of annualLeaveEntries) {
    if (
      entry.leaveDate < cycle.start_date ||
      entry.leaveDate > cycle.end_date
    ) {
      errors.push({
        code: 'ANNUAL_LEAVE_DATE_OUTSIDE_CYCLE',
        leaveDate: entry.leaveDate,
        leaveTypeCode: entry.leaveTypeCode,
        cycleStartDate: cycle.start_date,
        cycleEndDate: cycle.end_date,
        message:
          `Ngày ${entry.leaveDate} không nằm trong kỳ ` +
          `${cycle.start_date} đến ${cycle.end_date}.`
      });
    }
  }

  return errors;
}

async function validateAnnualLeaveReasons({
  entries,
  transaction = null
}) {
  const errors = [];

  // Chỉ lấy các entry A và A/2
  const annualLeaveEntries = entries.filter(
    (entry) =>
      entry.leaveTypeCode === 'A' ||
      entry.leaveTypeCode === 'A/2'
  );

  if (annualLeaveEntries.length === 0) {
    return errors;
  }

  // Lấy cấu hình loại nghỉ A và A/2
  const leaveTypes = await LeaveType.findAll({
    where: {
      leave_type_code: ['A', 'A/2']
    },
    attributes: [
      'leave_type_id',
      'leave_type_code',
      'need_reason'
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

  for (const entry of annualLeaveEntries) {
    const leaveType =
      leaveTypeMap.get(entry.leaveTypeCode);

    if (!leaveType) {
      continue;
    }

    const hasReasonId =
      Number.isInteger(Number(entry.reasonId)) &&
      Number(entry.reasonId) > 0;

    const hasCustomReason =
      typeof entry.customReason === 'string' &&
      entry.customReason.trim() !== '';

    // Loại nghỉ bắt buộc phải có lý do
    if (
      leaveType.need_reason &&
      !hasReasonId &&
      !hasCustomReason
    ) {
      errors.push({
        code: 'ANNUAL_LEAVE_REASON_REQUIRED',
        leaveDate: entry.leaveDate,
        leaveTypeCode: entry.leaveTypeCode,
        message:
          `Loại nghỉ ${entry.leaveTypeCode} bắt buộc phải có lý do.`
      });

      continue;
    }

    // Kiểm tra reasonId có tồn tại và đang hoạt động
    if (hasReasonId) {
      const reason = await LeaveReason.findOne({
        where: {
          reason_id: Number(entry.reasonId),
          is_active: true
        },
        transaction
      });

      if (!reason) {
        errors.push({
          code: 'LEAVE_REASON_NOT_FOUND',
          leaveDate: entry.leaveDate,
          leaveTypeCode: entry.leaveTypeCode,
          reasonId: Number(entry.reasonId),
          message:
            `Lý do nghỉ có ID ${entry.reasonId} không tồn tại hoặc đã ngừng hoạt động.`
        });

        continue;
      }

      // Kiểm tra lý do có được phép dùng cho loại nghỉ không
      const [mappingRows] =
        await LeaveType.sequelize.query(
          `
            SELECT 1
            FROM leave_type_reasons
            WHERE leave_type_id = :leaveTypeId
              AND reason_id = :reasonId
            LIMIT 1
          `,
          {
            replacements: {
              leaveTypeId:
                leaveType.leave_type_id,
              reasonId:
                Number(entry.reasonId)
            },
            transaction
          }
        );

      if (mappingRows.length === 0) {
        errors.push({
          code: 'LEAVE_REASON_NOT_ALLOWED',
          leaveDate: entry.leaveDate,
          leaveTypeCode: entry.leaveTypeCode,
          reasonId: Number(entry.reasonId),
          message:
            `Lý do đã chọn không phù hợp với loại nghỉ ${entry.leaveTypeCode}.`
        });
      }
    }
  }

  return errors;
}

async function validateAnnualLeaveBalance({
  empId,
  entries,
  balanceYear,
  transaction = null
}) {
  const errors = [];

  // Chỉ lấy các entry A và A/2
  const annualLeaveEntries = entries.filter(
    (entry) =>
      entry.leaveTypeCode === 'A' ||
      entry.leaveTypeCode === 'A/2'
  );

  if (annualLeaveEntries.length === 0) {
    return errors;
  }

  // Lấy cấu hình số ngày phép bị trừ
  const leaveTypes = await LeaveType.findAll({
    where: {
      leave_type_code: ['A', 'A/2'],
      is_active: true
    },
    attributes: [
      'leave_type_code',
      'deduction_quantity'
    ],
    transaction
  });

  const deductionMap = new Map();

  for (const leaveType of leaveTypes) {
    deductionMap.set(
      leaveType.leave_type_code,
      Number(leaveType.deduction_quantity)
    );
  }

  // Tính tổng số AL đang đăng ký trong request
  let requestedQuantity = 0;

  for (const entry of annualLeaveEntries) {
    const deductionQuantity =
      deductionMap.get(entry.leaveTypeCode);

    if (
      !Number.isFinite(deductionQuantity) ||
      deductionQuantity <= 0
    ) {
      errors.push({
        code: 'INVALID_AL_DEDUCTION_QUANTITY',
        leaveDate: entry.leaveDate,
        leaveTypeCode: entry.leaveTypeCode,
        message:
          `Không xác định được số phép bị trừ của loại nghỉ ${entry.leaveTypeCode}.`
      });

      continue;
    }

    requestedQuantity += deductionQuantity;
  }

  if (errors.length > 0) {
    return errors;
  }

  // Lấy số AL còn lại hiện tại
  const annualLeaveBalance =
    await getAnnualLeaveBalance({
      empId,
      balanceYear,
      transaction
    });

  if (
    requestedQuantity >
    annualLeaveBalance.remaining
  ) {
    errors.push({
      code: 'INSUFFICIENT_ANNUAL_LEAVE_BALANCE',
      requested: requestedQuantity,
      remaining: annualLeaveBalance.remaining,
      message:
        `Bạn đăng ký ${requestedQuantity} ngày phép ` +
        `nhưng chỉ còn ${annualLeaveBalance.remaining} ngày phép.`
    });
  }

  return errors;
}

module.exports = {
  validateAnnualLeaveTypes,
  validateAnnualLeaveDatesInCycle,
  validateAnnualLeaveReasons,
  validateAnnualLeaveBalance
};