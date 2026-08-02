const { Op } = require('sequelize');

const {
  EmpAnnualLeave,
  EmployeeCycleOff,
  RegistrationEntry,
  RegistrationSubmission,
  LeaveType
} = require('../models');

const ACTIVE_BALANCE_STATUSES = [
  'PENDING_TL',
  'APPROVED',
  'PUBLISHED',
  'UNPUBLISHED'
];

async function getAnnualLeaveBalance({
  empId,
  balanceYear,
  transaction = null
}) {
  // Lấy số phép năm được cấp
  const annualLeave = await EmpAnnualLeave.findOne({
    where: {
      emp_id: empId,
      balance_year: balanceYear
    },
    transaction
  });

  if (!annualLeave) {
    return {
      year: balanceYear,
      entitled: 0,
      adjusted: 0,
      used: 0,
      remaining: 0
    };
  }

  // Lấy các entry đang sử dụng phép năm
  const annualLeaveEntries =
    await RegistrationEntry.findAll({
      attributes: [
        'entry_id',
        'leave_type_id'
      ],
      include: [
        {
          model: RegistrationSubmission,
          as: 'submission',
          attributes: [],
          required: true,
          where: {
            emp_id: empId
          }
        },
        {
          model: LeaveType,
          as: 'leaveType',
          attributes: [
            'deduction_quantity'
          ],
          required: true,
          where: {
            deduction_source: 'AL'
          }
        }
      ],
      where: {
        leave_date: {
          [Op.between]: [
            `${balanceYear}-01-01`,
            `${balanceYear}-12-31`
          ]
        },
        current_status: {
          [Op.in]: ACTIVE_BALANCE_STATUSES
        },
        is_active: true
      },
      transaction
    });

  // Cộng số phép đã dùng
  const used = annualLeaveEntries.reduce(
    (total, entry) => {
      return (
        total +
        Number(
          entry.leaveType.deduction_quantity
        )
      );
    },
    0
  );

  const entitled =
    Number(annualLeave.entitled_quantity);

  const adjusted =
    Number(annualLeave.adjusted_quantity);

  const remaining =
    entitled + adjusted - used;

  return {
    year: balanceYear,
    entitled,
    adjusted,
    used,
    remaining
  };
}



async function getOffBalance({
  empId,
  cycleId,
  transaction = null
}) {
  // Lấy số OFF được cấp trong kỳ
  const cycleOff =
    await EmployeeCycleOff.findOne({
      where: {
        emp_id: empId,
        cycle_id: cycleId
      },
      transaction
    });

  if (!cycleOff) {
    return {
      cycleId,
      entitled: 0,
      adjusted: 0,
      used: 0,
      remaining: 0
    };
  }

  // Đếm các entry OFF còn hiệu lực trong kỳ
  const used =
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
          [Op.in]: ACTIVE_BALANCE_STATUSES
        },
        is_active: true
      },
      transaction
    });

  const entitled =
    Number(cycleOff.entitled_quantity);

  const adjusted =
    Number(cycleOff.adjusted_quantity);

  const remaining =
    entitled + adjusted - used;

  return {
    cycleId,
    entitled,
    adjusted,
    used,
    remaining
  };
}

module.exports = {
  ACTIVE_BALANCE_STATUSES,
  getAnnualLeaveBalance,
  getOffBalance
};