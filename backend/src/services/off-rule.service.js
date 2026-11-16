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

const DAY_MS = 86400000;
const dateNumber = value => Date.parse(value + 'T00:00:00Z') / DAY_MS;

async function getExistingOffDates({ empId, cycleId, transaction = null }) {
  return RegistrationEntry.findAll({
    attributes: ['leave_date'],
    include: [
      { model: RegistrationSubmission, as: 'submission', required: true, attributes: [],
        where: { emp_id: empId, ...(cycleId == null ? {} : { cycle_id: cycleId }) } },
      { model: LeaveType, as: 'leaveType', required: true, attributes: [], where: { leave_type_code: 'OFF' } }
    ],
    where: { is_active: true, current_status: { [Op.in]: ACTIVE_BALANCE_STATUSES } },
    transaction, raw: true
  });
}

// All days are DATEONLY strings. Existing OFFs include pending approvals.
function checkOffPattern({ entries, historyDates = [], cycleDates = [] }) {
  const requested = entries.filter(entry => entry.leaveTypeCode === 'OFF').map(entry => entry.leaveDate);
  if (!requested.length) return [];
  const errors = [];
  const allDates = [...new Set([...historyDates, ...requested])].sort();
  const requestedWeeks = new Map(requested.map(date => {
    const week = getWeekRange(date);
    return [week.start, week];
  }));
  for (const week of requestedWeeks.values()) {
    const count = allDates.filter(date => date >= week.start && date <= week.end).length;
    if (count > 2) errors.push({
      code: 'OFF_WEEK_LIMIT_EXCEEDED', weekStart: week.start, weekEnd: week.end,
      total: count, limit: 2,
      message: 'Tuần ' + week.start + ' đến ' + week.end + ' chỉ được tối đa 2 ngày OFF (gồm cả ngày đã đăng ký).'
    });
  }
  const requestedSundays = new Set(requested.filter(date => new Date(date + 'T00:00:00Z').getUTCDay() === 0));
  const sundays = allDates.filter(date => new Date(date + 'T00:00:00Z').getUTCDay() === 0);
  for (let i = 3; i < sundays.length; i++) {
    const window = sundays.slice(i - 3, i + 1);
    if (window.some(date => requestedSundays.has(date)) &&
        window.every((date, index) => index === 0 || dateNumber(date) - dateNumber(window[index - 1]) === 7)) {
      errors.push({ code: 'FOUR_CONSECUTIVE_SUNDAYS', leaveDates: window,
        message: 'Không được OFF 4 Chủ nhật liên tiếp: ' + window.join(', ') + '.' });
    }
  }
  const inCycle = [...new Set([...cycleDates, ...requested])].sort();
  for (let i = 1; i < inCycle.length; i++) {
    const gap = dateNumber(inCycle[i]) - dateNumber(inCycle[i - 1]);
    if (gap > 10) errors.push({ code: 'OFF_GAP_EXCEEDED', fromDate: inCycle[i - 1],
      toDate: inCycle[i], gapDays: gap, limit: 10,
      message: 'Hai ngày OFF ' + inCycle[i - 1] + ' và ' + inCycle[i] + ' cách nhau ' + gap + ' ngày, vượt tối đa 10 ngày trong kỳ.' });
  }
  return errors;
}

async function validateOffPattern({ empId, cycleId, entries, transaction = null }) {
  if (!entries.some(entry => entry.leaveTypeCode === 'OFF')) return [];
  const history = await getExistingOffDates({ empId, transaction });
  const cycleHistory = await getExistingOffDates({ empId, cycleId, transaction });
  return checkOffPattern({ entries, historyDates: history.map(row => String(row.leave_date)),
    cycleDates: cycleHistory.map(row => String(row.leave_date)) });
}

// Preserve the existing helper for manual rule scripts.
async function validateWeeklyOff(args) {
  return (await validateOffPattern(args)).filter(error => error.code === 'OFF_WEEK_LIMIT_EXCEEDED');
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

  if (offBalance.used + requestedOffCount > 4) {
    errors.push({ code: 'OFF_CYCLE_LIMIT_EXCEEDED', used: offBalance.used,
      requested: requestedOffCount, limit: 4,
      message: 'Mỗi kỳ chỉ được tối đa 4 ngày OFF, gồm cả ngày đã đăng ký.' });
  }

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
  for (const entry of [...offEntries].sort((a, b) => a.leaveDate.localeCompare(b.leaveDate))) {
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

        transaction,
        ...(transaction ? { lock: transaction.LOCK.UPDATE } : {})
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
  checkOffPattern,
  validateOffPattern,
  validateWeeklyOff,
  validateOffBalance,
  validateOffDatesInCycle,
  validateOffRequireHC
};