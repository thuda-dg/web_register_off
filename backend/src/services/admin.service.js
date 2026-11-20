const {
  Op
} = require('sequelize');

const {
  sequelize,
  Employee,
  UserAccount,
  UserRole,
  Role,
  Team,
  EmpTeamHistory,
  Task,
  EmpTaskHistory
} = require('../models');

const { hashPassword } = require('../utils/auth.util');

function invalid(message, statusCode = 400) {
  return Object.assign(new Error(message), {
    statusCode,
    code: statusCode === 409 ? 'USER_ALREADY_EXISTS' : 'INVALID_USER_PAYLOAD'
  });
}

async function getCreateUserOptions() {
  const [teams, roles, tasks] = await Promise.all([
    Team.findAll({ where: { is_active: true }, order: [['team_name', 'ASC']] }),
    Role.findAll({ where: { is_active: true }, order: [['role_name', 'ASC']] }),
    Task.findAll({ where: { is_active: true }, order: [['task_name', 'ASC']] })
  ]);
  return {
    ok: true,
    tasks: tasks.map(task => ({ id: Number(task.task_id), name: task.task_name })),
    teams: teams.map(team => ({ id: Number(team.team_id), name: team.team_name })),
    roles: roles.map(role => ({ id: Number(role.role_id), name: role.role_name, code: role.role_code }))
  };
}

async function createUser(payload = {}) {
  const text = value => typeof value === 'string' ? value.trim() : '';
  const employeeCode = text(payload.employeeCode);
  const fullName = text(payload.fullName);
  const email = text(payload.email).toLowerCase();
  const { password, teamId, roleIds } = payload;
  if (!employeeCode || employeeCode.length > 50 || !fullName || fullName.length > 150) {
    throw invalid('Mã nhân viên (tối đa 50 ký tự) và họ tên (tối đa 150 ký tự) là bắt buộc.');
  }
  if (email.length > 255 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw invalid('Email không hợp lệ.');
  }
  if (typeof password !== 'string' || password.length < 8 || Buffer.byteLength(password, 'utf8') > 72) {
    throw invalid('Mật khẩu phải có ít nhất 8 ký tự và không vượt quá 72 byte.');
  }
  if (!Array.isArray(roleIds) || roleIds.length !== 1 || !roleIds.every(id => Number.isSafeInteger(id) && id > 0)) {
    throw invalid('Vui lòng chọn đúng một role hợp lệ.');
  }
  if (teamId != null && (!Number.isSafeInteger(teamId) || teamId <= 0)) {
    throw invalid('Team không hợp lệ.');
  }
  const uniqueRoleIds = [...new Set(roleIds)];
  try {
    return await sequelize.transaction(async transaction => {
      const existing = await Employee.findOne({
        where: { [Op.or]: [{ emp_code: employeeCode }, { emp_email: email }] }, transaction
      });
      if (existing) throw invalid('Mã nhân viên hoặc email đã tồn tại.', 409);
      const roles = await Role.findAll({
        where: { role_id: { [Op.in]: uniqueRoleIds }, is_active: true }, transaction
      });
      if (roles.length !== uniqueRoleIds.length) throw invalid('Role không tồn tại hoặc đã ngừng hoạt động.');
      const team = teamId == null ? null : await Team.findOne({
        where: { team_id: teamId, is_active: true }, transaction
      });
      if (teamId != null && !team) throw invalid('Team không tồn tại hoặc đã ngừng hoạt động.');
      const employee = await Employee.create({
        emp_code: employeeCode, emp_name: fullName, emp_email: email, is_active: true
      }, { transaction });
      const passwordHash = hashPassword(password);
      const account = await UserAccount.create({
        emp_id: employee.emp_id, password: passwordHash, password_hash: passwordHash,
        account_status: 'ACTIVE', failed_login_count: 0
      }, { transaction });
      const today = new Date().toISOString().slice(0, 10);
      await UserRole.bulkCreate(uniqueRoleIds.map(roleId => ({
        user_account_id: account.user_account_id, role_id: roleId, start_date: today
      })), { transaction });
      if (team) await EmpTeamHistory.create({
        emp_id: employee.emp_id, team_id: team.team_id, start_date: today
      }, { transaction });
      return {
        ok: true,
        message: 'Tạo user thành công.',
        item: {
          id: Number(employee.emp_id), employeeCode, fullName, email,
          teamId: team ? Number(team.team_id) : null, teamName: team?.team_name ?? null,
          roles: roles.map(role => ({ id: Number(role.role_id), name: role.role_name }))
        }
      };
    });
  } catch (error) {
    if (error.name === 'SequelizeUniqueConstraintError') {
      throw invalid('Mã nhân viên hoặc email đã tồn tại.', 409);
    }
    throw error;
  }
}

async function updateUserRoles(employeeId, payload = {}) {
  const id = Number(employeeId);
  const { roleIds } = payload;
  if (!Number.isSafeInteger(id) || id <= 0 || !Array.isArray(roleIds) || roleIds.length !== 1 ||
      !roleIds.every(roleId => Number.isSafeInteger(roleId) && roleId > 0)) {
    throw invalid('Vui lòng chọn đúng một role hợp lệ.');
  }
  const ids = [...new Set(roleIds)];
  return sequelize.transaction(async transaction => {
    const employee = await Employee.findOne({ where: { emp_id: id, is_active: true }, transaction });
    if (!employee) throw invalid('Không tìm thấy nhân viên đang hoạt động.', 404);
    // Serialize role updates for the same account.
    const account = await UserAccount.findOne({
      where: { emp_id: id }, transaction, lock: transaction.LOCK.UPDATE
    });
    if (!account) throw invalid('Nhân viên chưa có tài khoản đăng nhập.', 404);
    const roles = await Role.findAll({
      where: { role_id: { [Op.in]: ids }, is_active: true }, transaction
    });
    if (roles.length !== ids.length) throw invalid('Role không tồn tại hoặc đã ngừng hoạt động.');
    const today = new Date().toISOString().slice(0, 10);
    const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
    const assignments = await UserRole.findAll({
      where: {
        user_account_id: account.user_account_id,
        [Op.or]: [{ end_date: null }, { end_date: { [Op.gte]: today } }]
      }, transaction
    });
    if (assignments.some(item => item.start_date > today)) {
      const error = new Error('User đã có lịch đổi role trong tương lai. Vui lòng xử lý lịch đó trước.');
      error.statusCode = 409; error.code = 'FUTURE_ROLE_ASSIGNMENT'; throw error;
    }
    const currentIds = new Set(assignments.map(item => Number(item.role_id)));
    for (const assignment of assignments) {
      if (!ids.includes(Number(assignment.role_id))) {
        if (assignment.start_date === today) await assignment.destroy({ transaction });
        else await assignment.update({ end_date: yesterday }, { transaction });
      }
    }
    await UserRole.bulkCreate(ids.filter(roleId => !currentIds.has(roleId)).map(roleId => ({
      user_account_id: account.user_account_id, role_id: roleId, start_date: today
    })), { transaction });
    return {
      ok: true, message: 'Cập nhật role thành công.', employeeId: id,
      roles: roles.map(role => ({ id: Number(role.role_id), name: role.role_name }))
    };
  });
}

async function updateUserTeam(employeeId, payload = {}) {
  const id = Number(employeeId);
  const { teamId } = payload;
  if (!Number.isSafeInteger(id) || id <= 0 || !Number.isSafeInteger(teamId) || teamId <= 0) {
    throw invalid('Vui lòng chọn một team hợp lệ.');
  }
  return sequelize.transaction(async transaction => {
    // Lock the employee, including employees without a login account.
    // Concurrent team changes for this employee must use the same lock.
    const employee = await Employee.findOne({
      where: { emp_id: id, is_active: true }, transaction, lock: transaction.LOCK.UPDATE
    });
    if (!employee) throw invalid('Không tìm thấy nhân viên đang hoạt động.', 404);
    const team = await Team.findOne({ where: { team_id: teamId, is_active: true }, transaction });
    if (!team) throw invalid('Team không tồn tại hoặc đã ngừng hoạt động.');
    const now = new Date();
    const today = now.toISOString().slice(0, 10);
    const yesterday = new Date(now.getTime() - 86400000).toISOString().slice(0, 10);
    const histories = await EmpTeamHistory.findAll({
      where: {
        emp_id: id,
        [Op.or]: [{ end_date: null }, { end_date: { [Op.gte]: today } }]
      }, transaction
    });
    if (histories.some(history => history.start_date > today)) {
      const error = new Error('Nhân viên đã có lịch chuyển team trong tương lai. Vui lòng xử lý lịch đó trước khi đổi team hiện tại.');
      throw Object.assign(error, { statusCode: 409, code: 'FUTURE_TEAM_ASSIGNMENT' });
    }
    const retained = histories.find(history => Number(history.team_id) === teamId);
    for (const history of histories) {
      if (history === retained) continue;
      // End dates are inclusive. Remove same-day assignments to avoid end < start.
      if (history.start_date === today) await history.destroy({ transaction });
      else await history.update({ end_date: yesterday }, { transaction });
    }
    if (retained) {
      if (retained.end_date !== null) await retained.update({ end_date: null }, { transaction });
    } else {
      await EmpTeamHistory.create({ emp_id: id, team_id: teamId, start_date: today, end_date: null }, { transaction });
    }
    return {
      ok: true, message: 'Cập nhật team thành công.', employeeId: id,
      teamId: Number(team.team_id), teamName: team.team_name
    };
  });
}


async function getAllEmployees() {

  const today =
    new Date()
      .toISOString()
      .slice(0, 10);

  const employees =
    await Employee.findAll({

      /*
       * Chỉ lấy employee đang active.
       * Nếu bạn muốn lấy cả inactive
       * thì bỏ đoạn where này.
       */
      where: {
        is_active: true
      },

      attributes: [
        'emp_id',
        'emp_code',
        'emp_name',
        'emp_email'
      ],

      include: [
        {
          model: EmpTaskHistory, as: 'taskHistories', required: false,
          attributes: ['emp_task_history_id', 'task_id', 'start_date', 'end_date'],
          where: {
            start_date: { [Op.lte]: today },
            [Op.or]: [{ end_date: null }, { end_date: { [Op.gte]: today } }]
          },
          include: [{ model: Task, as: 'task', required: false, attributes: ['task_id', 'task_name'] }]
        },

        // ============================================
        // CURRENT TEAM
        // ============================================

        {
          model: EmpTeamHistory,
          as: 'teamHistories',

          attributes: [
            'emp_team_history_id',
            'team_id',
            'start_date',
            'end_date'
          ],

          /*
           * Team hiện tại:
           *
           * start_date <= hôm nay
           *
           * và
           *
           * end_date = null
           * hoặc
           * end_date >= hôm nay
           */
          where: {

            start_date: {
              [Op.lte]: today
            },

            [Op.or]: [
              {
                end_date: null
              },
              {
                end_date: {
                  [Op.gte]: today
                }
              }
            ]

          },

          /*
           * required false = LEFT JOIN
           *
           * Employee chưa có team
           * vẫn được trả ra.
           */
          required: false,

          include: [
            {
              model: Team,
              as: 'team',

              attributes: [
                'team_id',
                'team_name'
              ],

              required: false
            }
          ]
        },


        // ============================================
        // USER ACCOUNT + CURRENT ROLES
        // ============================================

        {
          model: UserAccount,
          as: 'userAccount',

          attributes: [
            'user_account_id',
            'account_status'
          ],

          required: false,

          include: [
            {
              model: Role,
              as: 'roles',

              attributes: [
                'role_id',
                'role_code',
                'role_name'
              ],

              /*
               * Điều kiện nằm trên bảng trung gian
               * user_roles.
               */
              through: {

                attributes: [],

                where: {

                  start_date: {
                    [Op.lte]: today
                  },

                  [Op.or]: [
                    {
                      end_date: null
                    },
                    {
                      end_date: {
                        [Op.gte]: today
                      }
                    }
                  ]

                }
              },

              /*
               * Employee chưa có role
               * vẫn được trả ra.
               */
              required: false
            }
          ]
        }
      ],

      order: [
        [
          'emp_name',
          'ASC'
        ]
      ]
    });


  // ============================================
  // MAP SEQUELIZE MODEL -> FRONTEND DTO
  // ============================================

  const items =
    employees.map(employee => {

      /*
       * Theo business hiện tại,
       * một employee chỉ nên có
       * một team active tại một thời điểm.
       */
      const currentTeamHistory =
        employee.teamHistories?.[0];

      const currentTeam =
        currentTeamHistory?.team;


      return {

        id:
          Number(employee.emp_id),

        employeeCode:
          employee.emp_code,

        fullName:
          employee.emp_name,

        email:
          employee.emp_email,

        teamId:
          currentTeam
            ? Number(currentTeam.team_id)
            : null,

        taskId: employee.taskHistories?.[0]?.task ? Number(employee.taskHistories[0].task.task_id) : null,
        taskName: employee.taskHistories?.[0]?.task?.task_name ?? null,

        teamName:
          currentTeam?.team_name ?? null,

        roles:
          employee.userAccount?.roles
            ?.map(role => ({
              id:
                Number(role.role_id),

              name:
                role.role_name
            }))
            ?? []

      };

    });


  return {
    ok: true,
    items
  };
}

async function updateUserTask(employeeId, payload = {}) {
  const id = Number(employeeId);
  const { taskId } = payload;
  if (!Number.isSafeInteger(id) || id <= 0 || !Number.isSafeInteger(taskId) || taskId <= 0) {
    throw invalid('Vui lòng chọn một task hợp lệ.');
  }
  return sequelize.transaction(async transaction => {
    // Lock the employee, including employees without a login account.
    // Concurrent task changes for this employee must use the same lock.
    const employee = await Employee.findOne({
      where: { emp_id: id, is_active: true }, transaction, lock: transaction.LOCK.UPDATE
    });
    if (!employee) throw invalid('Không tìm thấy nhân viên đang hoạt động.', 404);
    const task = await Task.findOne({ where: { task_id: taskId, is_active: true }, transaction });
    if (!task) throw invalid('Task không tồn tại hoặc đã ngừng hoạt động.');
    const now = new Date();
    const today = now.toISOString().slice(0, 10);
    const yesterday = new Date(now.getTime() - 86400000).toISOString().slice(0, 10);
    const histories = await EmpTaskHistory.findAll({
      where: {
        emp_id: id,
        [Op.or]: [{ end_date: null }, { end_date: { [Op.gte]: today } }]
      }, transaction
    });
    if (histories.some(history => history.start_date > today)) {
      const error = new Error('Nhân viên đã có lịch chuyển task trong tương lai. Vui lòng xử lý lịch đó trước khi đổi task hiện tại.');
      throw Object.assign(error, { statusCode: 409, code: 'FUTURE_TASK_ASSIGNMENT' });
    }
    const retained = histories.find(history => Number(history.task_id) === taskId);
    for (const history of histories) {
      if (history === retained) continue;
      // End dates are inclusive. Remove same-day assignments to avoid end < start.
      if (history.start_date === today) await history.destroy({ transaction });
      else await history.update({ end_date: yesterday }, { transaction });
    }
    if (retained) {
      if (retained.end_date !== null) await retained.update({ end_date: null }, { transaction });
    } else {
      await EmpTaskHistory.create({ emp_id: id, task_id: taskId, start_date: today, end_date: null }, { transaction });
    }
    return {
      ok: true, message: 'Cập nhật task thành công.', employeeId: id,
      taskId: Number(task.task_id), taskName: task.task_name
    };
  });
}

module.exports = { updateUserTask, updateUserTeam, updateUserRoles, createUser, getCreateUserOptions, getAllEmployees };
