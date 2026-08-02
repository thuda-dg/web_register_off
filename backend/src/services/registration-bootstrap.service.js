const { Op } = require('sequelize');

const {
  sequelize,
  Employee,
  Team,
  Task,
  EmpTeamHistory,
  EmpTaskHistory,
  LeaveType,
  RegistrationCycle,
  EmpAnnualLeave,
  EmployeeCycleOff,
  RequireHC
} = require('../models');

const {
  getAnnualLeaveBalance,
  getOffBalance
} = require('./leave-balance.service');

async function getRegistrationBootstrap(empId) {
  // Lấy thông tin nhân viên
  const employee = await Employee.findOne({
    where: {
      emp_id: empId,
      is_active: true
    },
    attributes: [
      'emp_id',
      'emp_code',
      'emp_name',
      'emp_email'
    ]
  });

  if (!employee) {
    const error = new Error(
      'Không tìm thấy nhân viên hoặc nhân viên đã ngừng hoạt động.'
    );

    error.statusCode = 404;
    throw error;
  }

  // Lấy kỳ đăng ký đang mở gần nhất
  const cycle = await RegistrationCycle.findOne({
    where: {
      status: 'OPEN'
    },
    order: [
      ['start_date', 'DESC']
    ]
  });

  if (!cycle) {
    const error = new Error(
      'Hiện tại không có kỳ đăng ký nào đang mở.'
    );

    error.statusCode = 404;
    throw error;
  }

  // Lấy team của nhân viên tại ngày bắt đầu kỳ
  const teamHistory = await EmpTeamHistory.findOne({
    where: {
      emp_id: empId,
      start_date: {
        [Op.lte]: cycle.start_date
      },
      [Op.or]: [
        {
          end_date: null
        },
        {
          end_date: {
            [Op.gte]: cycle.start_date
          }
        }
      ]
    },
    include: [
      {
        model: Team,
        as: 'team',
        attributes: [
          'team_id',
          'team_code',
          'team_name'
        ]
      }
    ],
    order: [
      ['start_date', 'DESC']
    ]
  });

  // Lấy task của nhân viên tại ngày bắt đầu kỳ
  const taskHistory = await EmpTaskHistory.findOne({
    where: {
      emp_id: empId,
      start_date: {
        [Op.lte]: cycle.start_date
      },
      [Op.or]: [
        {
          end_date: null
        },
        {
          end_date: {
            [Op.gte]: cycle.start_date
          }
        }
      ]
    },
    include: [
      {
        model: Task,
        as: 'task',
        attributes: [
          'task_id',
          'task_code',
          'task_name'
        ]
      }
    ],
    order: [
      ['start_date', 'DESC']
    ]
  });

  if (!teamHistory || !teamHistory.team) {
    const error = new Error(
      'Không tìm thấy team của nhân viên trong kỳ đăng ký.'
    );

    error.statusCode = 400;
    throw error;
  }

  if (!taskHistory || !taskHistory.task) {
    const error = new Error(
      'Không tìm thấy task của nhân viên trong kỳ đăng ký.'
    );

    error.statusCode = 400;
    throw error;
  }

  // Lấy các loại nghỉ đang hoạt động
  const leaveTypes = await LeaveType.findAll({
    where: {
      is_active: true
    },
    attributes: [
      'leave_type_id',
      'leave_type_code',
      'leave_type_name',
      'need_reason',
      'deduction_source',
      'deduction_quantity'
    ],
    order: [
      ['leave_type_id', 'ASC']
    ]
  });

  // Lấy lý do hợp lệ cho từng loại nghỉ
  const [reasonRows] = await sequelize.query(`
    SELECT
      ltr.leave_type_id,
      lt.leave_type_code,
      lr.reason_id,
      lr.reason_name,
      ltr.sort_order
    FROM leave_type_reasons ltr
    INNER JOIN leave_types lt
      ON lt.leave_type_id = ltr.leave_type_id
    INNER JOIN leave_reasons lr
      ON lr.reason_id = ltr.reason_id
    WHERE lt.is_active = true
      AND lr.is_active = true
    ORDER BY
      lt.leave_type_id,
      ltr.sort_order,
      lr.reason_name
  `);

  const reasonsByLeaveType = {};

  for (const row of reasonRows) {
    if (!reasonsByLeaveType[row.leave_type_code]) {
      reasonsByLeaveType[row.leave_type_code] = [];
    }

    reasonsByLeaveType[row.leave_type_code].push({
      reasonId: Number(row.reason_id),
      reasonName: row.reason_name
    });
  }

  // Xác định năm tính phép
const balanceYear = Number(
  String(cycle.start_date).slice(0, 4)
);

// Tính số dư phép năm
const annualLeaveBalance =
  await getAnnualLeaveBalance({
    empId,
    balanceYear
  });

// Tính số dư OFF trong kỳ
const offBalance =
  await getOffBalance({
    empId,
    cycleId: Number(cycle.cycle_id)
  });

  // Lấy dữ liệu RequireHC theo task
  const requireHC = await RequireHC.findAll({
    where: {
      cycle_id: cycle.cycle_id,
      task_id: taskHistory.task.task_id
    },
    attributes: [
      'require_hc_id',
      'working_date',
      'max_off'
    ],
    order: [
      ['working_date', 'ASC']
    ]
  });

  const currentTime = new Date();

  const openTime =
    new Date(cycle.registration_open_time);

  const closingTime =
    new Date(cycle.registration_closing_time);

  const isRegistrationOpen =
    cycle.status === 'OPEN' &&
    currentTime >= openTime &&
    currentTime <= closingTime;

  return {
    employee: {
      empId: Number(employee.emp_id),
      empCode: employee.emp_code,
      empName: employee.emp_name,
      empEmail: employee.emp_email
    },

    team: {
      teamId: Number(teamHistory.team.team_id),
      teamCode: teamHistory.team.team_code,
      teamName: teamHistory.team.team_name
    },

    task: {
      taskId: Number(taskHistory.task.task_id),
      taskCode: taskHistory.task.task_code,
      taskName: taskHistory.task.task_name
    },

    cycle: {
      cycleId: Number(cycle.cycle_id),
      cycleCode: cycle.cycle_code,
      cycleName: cycle.cycle_name,
      startDate: cycle.start_date,
      endDate: cycle.end_date,
      registrationOpenTime:
        cycle.registration_open_time,
      registrationClosingTime:
        cycle.registration_closing_time,
      status: cycle.status,
      isRegistrationOpen
    },

    leaveTypes: leaveTypes.map((leaveType) => ({
      leaveTypeId:
        Number(leaveType.leave_type_id),

      leaveTypeCode:
        leaveType.leave_type_code,

      leaveTypeName:
        leaveType.leave_type_name,

      needReason:
        leaveType.need_reason,

      deductionSource:
        leaveType.deduction_source,

      deductionQuantity:
        Number(leaveType.deduction_quantity),

      reasons:
        reasonsByLeaveType[
          leaveType.leave_type_code
        ] || []
    })),

    balances: {
        annualLeave: annualLeaveBalance,
        off: offBalance
    },

    requireHC: requireHC.map((row) => ({
      requireHCId:
        Number(row.require_hc_id),

      workingDate:
        row.working_date,

      maxOff:
        Number(row.max_off)
    }))
  };
}

module.exports = {
  getRegistrationBootstrap
};