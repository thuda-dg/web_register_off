const { Op } = require('sequelize');

const {
  RegistrationEntry,
  RegistrationSubmission,
  LeaveType,
  RegistrationCycle,
  RequireHC
} = require('../models');

const {
  ACTIVE_BALANCE_STATUSES,
  getOffBalance
} = require('./leave-balance.service');

const {
  getWeekRange
} = require('../utils/week.util');

async function validateWeeklyOff({
  empId,
  cycleId,
  entries,
  transaction = null
}) {
  const errors = [];

  // Chỉ lấy các entry OFF trong request
  const offEntries = entries.filter(
    (entry) => entry.leaveTypeCode === 'OFF'
  );

  if (offEntries.length === 0) {
    return errors;
  }

  // Kiểm tra request có chọn nhiều OFF trong cùng tuần không
  const requestWeeks = new Map();

  for (const entry of offEntries) {
    const week = getWeekRange(entry.leaveDate);
    const weekKey = `${week.start}_${week.end}`;

    if (requestWeeks.has(weekKey)) {
      errors.push({
        code: 'MULTIPLE_OFF_IN_REQUEST_WEEK',
        leaveDate: entry.leaveDate,
        message:
          `Không được đăng ký nhiều hơn 1 OFF trong tuần ` +
          `${week.start} đến ${week.end}.`
      });

      continue;
    }

    requestWeeks.set(
      weekKey,
      entry.leaveDate
    );
  }

  // Kiểm tra database đã có OFF trong tuần chưa
  for (const entry of offEntries) {
    const week = getWeekRange(
      entry.leaveDate
    );

    const existingOffCount =
      await RegistrationEntry.count({
        include: [
          {
            model:
              RegistrationSubmission,

            as:
              'submission',

            attributes: [],

            required: true,

            where: {
              emp_id: empId,
              cycle_id: cycleId
            }
          },

          {
            model:
              LeaveType,

            as:
              'leaveType',

            attributes: [],

            required: true,

            where: {
              leave_type_code: 'OFF'
            }
          }
        ],

        where: {
          leave_date: {
            [Op.between]: [
              week.start,
              week.end
            ]
          },

          current_status: {
            [Op.in]:
              ACTIVE_BALANCE_STATUSES
          },

          is_active: true
        },

        transaction
      });

    if (existingOffCount > 0) {
      errors.push({
        code:
          'OFF_ALREADY_EXISTS_IN_WEEK',

        leaveDate:
          entry.leaveDate,

        message:
          `Tuần ${week.start} đến ${week.end} ` +
          `đã có ngày OFF.`
      });
    }
  }

  return errors;
}

async function validateOffBalance({
  empId,
  cycleId,
  entries,
  transaction = null
}) {
  const errors = [];

  // Đếm số OFF trong request
  const requestedOffCount =
    entries.filter(
      (entry) =>
        entry.leaveTypeCode === 'OFF'
    ).length;

  if (requestedOffCount === 0) {
    return errors;
  }

  // Lấy số OFF còn lại hiện tại
  const offBalance =
    await getOffBalance({
      empId,
      cycleId,
      transaction
    });

  if (
    requestedOffCount >
    offBalance.remaining
  ) {
    errors.push({
      code:
        'INSUFFICIENT_OFF_BALANCE',

      requested:
        requestedOffCount,

      remaining:
        offBalance.remaining,

      message:
        `Bạn đăng ký ${requestedOffCount} ngày OFF ` +
        `nhưng chỉ còn ${offBalance.remaining} ngày OFF.`
    });
  }

  return errors;
}

async function validateOffDatesInCycle({
  cycleId,
  entries,
  transaction = null
}) {
  const errors = [];

  // Chỉ lấy các entry OFF trong request
  const offEntries = entries.filter(
    (entry) =>
      entry.leaveTypeCode === 'OFF'
  );

  if (offEntries.length === 0) {
    return errors;
  }

  // Lấy thông tin kỳ đăng ký
  const cycle =
    await RegistrationCycle.findOne({
      where: {
        cycle_id: cycleId
      },

      transaction
    });

  if (!cycle) {
    return [
      {
        code:
          'CYCLE_NOT_FOUND',

        message:
          'Không tìm thấy kỳ đăng ký.'
      }
    ];
  }

  // Kiểm tra từng ngày OFF có nằm trong kỳ không
  for (const entry of offEntries) {
    if (
      entry.leaveDate <
        cycle.start_date ||
      entry.leaveDate >
        cycle.end_date
    ) {
      errors.push({
        code:
          'OFF_DATE_OUTSIDE_CYCLE',

        leaveDate:
          entry.leaveDate,

        cycleStartDate:
          cycle.start_date,

        cycleEndDate:
          cycle.end_date,

        message:
          `Ngày ${entry.leaveDate} không nằm trong kỳ ` +
          `${cycle.start_date} đến ${cycle.end_date}.`
      });
    }
  }

  return errors;
}

async function validateOffRequireHC({
  empId,
  cycleId,
  entries,
  transaction = null
}) {
  const errors = [];

  // Chỉ lấy các entry OFF trong request
  const offEntries = entries.filter(
    (entry) =>
      entry.leaveTypeCode === 'OFF'
  );

  if (offEntries.length === 0) {
    return errors;
  }

  // Kiểm tra từng ngày OFF
  for (const entry of offEntries) {
    // Lấy task của nhân viên tại đúng ngày đăng ký OFF
    const [taskRows] =
      await RegistrationSubmission
        .sequelize
        .query(
          `
            SELECT task_id
            FROM emp_task_histories
            WHERE emp_id = :empId
              AND start_date <= :leaveDate
              AND (
                end_date IS NULL
                OR end_date >= :leaveDate
              )
            ORDER BY start_date DESC
            LIMIT 1
          `,
          {
            replacements: {
              empId,
              leaveDate:
                entry.leaveDate
            },

            transaction
          }
        );

    if (taskRows.length === 0) {
      errors.push({
        code:
          'TASK_NOT_FOUND',

        leaveDate:
          entry.leaveDate,

        message:
          `Không tìm thấy task của nhân viên tại ngày ${entry.leaveDate}.`
      });

      continue;
    }

    const taskId =
      Number(
        taskRows[0].task_id
      );

    // Lấy RequireHC của task trong ngày đăng ký
    const requireHC =
      await RequireHC.findOne({
        where: {
          cycle_id:
            cycleId,

          working_date:
            entry.leaveDate,

          task_id:
            taskId
        },

        transaction
      });

    if (!requireHC) {
      errors.push({
        code:
          'REQUIRE_HC_NOT_FOUND',

        leaveDate:
          entry.leaveDate,

        message:
          `Không tìm thấy RequireHC cho ngày ${entry.leaveDate}.`
      });

      continue;
    }

    // Đếm số OFF đã đăng ký trong database
    const registeredOffCount =
      await RegistrationEntry.count({
        include: [
          {
            model:
              RegistrationSubmission,

            as:
              'submission',

            attributes: [],

            required: true,

            where: {
              cycle_id:
                cycleId
            }
          },

          {
            model:
              LeaveType,

            as:
              'leaveType',

            attributes: [],

            required: true,

            where: {
              leave_type_code:
                'OFF'
            }
          }
        ],

        where: {
          leave_date:
            entry.leaveDate,

          task_id:
            taskId,

          current_status: {
            [Op.in]:
              ACTIVE_BALANCE_STATUSES
          },

          is_active:
            true
        },

        transaction
      });

    // Đếm số OFF cùng ngày trong request
    const requestOffCount =
      offEntries.filter(
        (requestEntry) =>
          requestEntry.leaveDate ===
          entry.leaveDate
      ).length;

    const totalAfterRequest =
      registeredOffCount +
      requestOffCount;

    if (
      totalAfterRequest >
      Number(
        requireHC.max_off
      )
    ) {
      errors.push({
        code:
          'REQUIRE_HC_FULL',

        leaveDate:
          entry.leaveDate,

        maxOff:
          Number(
            requireHC.max_off
          ),

        registeredOff:
          registeredOffCount,

        requestedOff:
          requestOffCount,

        message:
          `Ngày ${entry.leaveDate} đã vượt số lượng OFF cho phép.`
      });
    }
  }

  return errors;
}

module.exports = {
  validateWeeklyOff,
  validateOffBalance,
  validateOffDatesInCycle,
  validateOffRequireHC
};