const { Op } = require('sequelize');

const {
  Employee,
  Team,
  Task,
  EmpTeamHistory,
  EmpTaskHistory
} = require('../models');

async function getEmployeeAssignmentByDate({
  empId,
  workingDate,
  transaction = null
}) {
  // Kiểm tra nhân viên tồn tại
  const employee = await Employee.findOne({
    where: {
      emp_id: empId,
      is_active: true
    },
    attributes: [
      'emp_id',
      'emp_code',
      'emp_name'
    ],
    transaction
  });

  if (!employee) {
    const error = new Error(
      'Không tìm thấy nhân viên hoặc nhân viên đã ngừng hoạt động.'
    );

    error.code = 'EMPLOYEE_NOT_FOUND';
    error.statusCode = 404;

    throw error;
  }

  // Tìm team của nhân viên tại ngày đăng ký nghỉ
  const teamHistory = await EmpTeamHistory.findOne({
    where: {
      emp_id: empId,

      start_date: {
        [Op.lte]: workingDate
      },

      [Op.or]: [
        {
          end_date: null
        },
        {
          end_date: {
            [Op.gte]: workingDate
          }
        }
      ]
    },
    include: [
      {
        model: Team,
        as: 'team',
        required: true,
        attributes: [
          'team_id',
          'team_code',
          'team_name',
          'is_active'
        ]
      }
    ],
    order: [
      ['start_date', 'DESC']
    ],
    transaction
  });

  if (!teamHistory || !teamHistory.team) {
    const error = new Error(
      `Không tìm thấy team của nhân viên tại ngày ${workingDate}.`
    );

    error.code = 'EMPLOYEE_TEAM_NOT_FOUND';
    error.statusCode = 400;
    error.leaveDate = workingDate;

    throw error;
  }

  if (!teamHistory.team.is_active) {
    const error = new Error(
      `Team của nhân viên tại ngày ${workingDate} đã ngừng hoạt động.`
    );

    error.code = 'EMPLOYEE_TEAM_INACTIVE';
    error.statusCode = 400;
    error.leaveDate = workingDate;

    throw error;
  }

  // Tìm task của nhân viên tại ngày đăng ký nghỉ
  const taskHistory = await EmpTaskHistory.findOne({
    where: {
      emp_id: empId,

      start_date: {
        [Op.lte]: workingDate
      },

      [Op.or]: [
        {
          end_date: null
        },
        {
          end_date: {
            [Op.gte]: workingDate
          }
        }
      ]
    },
    include: [
      {
        model: Task,
        as: 'task',
        required: true,
        attributes: [
          'task_id',
          'task_code',
          'task_name',
          'is_active'
        ]
      }
    ],
    order: [
      ['start_date', 'DESC']
    ],
    transaction
  });

  if (!taskHistory || !taskHistory.task) {
    const error = new Error(
      `Không tìm thấy task của nhân viên tại ngày ${workingDate}.`
    );

    error.code = 'EMPLOYEE_TASK_NOT_FOUND';
    error.statusCode = 400;
    error.leaveDate = workingDate;

    throw error;
  }

  if (!taskHistory.task.is_active) {
    const error = new Error(
      `Task của nhân viên tại ngày ${workingDate} đã ngừng hoạt động.`
    );

    error.code = 'EMPLOYEE_TASK_INACTIVE';
    error.statusCode = 400;
    error.leaveDate = workingDate;

    throw error;
  }

  return {
    employee: {
      empId: Number(employee.emp_id),
      empCode: employee.emp_code,
      empName: employee.emp_name
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
    }
  };
}

module.exports = {
  getEmployeeAssignmentByDate
};