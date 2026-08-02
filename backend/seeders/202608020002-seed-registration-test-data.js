'use strict';

module.exports = {
  async up(queryInterface) {
    const transaction =
      await queryInterface.sequelize.transaction();

    try {
      // Tạo hoặc cập nhật team mẫu
      await queryInterface.sequelize.query(
        `
          INSERT INTO teams (
            team_code,
            team_name,
            is_active,
            created_at,
            updated_at
          )
          VALUES (
            'TEAM_01',
            'Team 01',
            true,
            NOW(),
            NOW()
          )
          ON CONFLICT (team_code)
          DO UPDATE SET
            team_name = EXCLUDED.team_name,
            is_active = EXCLUDED.is_active,
            updated_at = NOW();
        `,
        {
          transaction
        }
      );

      // Tạo hoặc cập nhật task mẫu
      await queryInterface.sequelize.query(
        `
          INSERT INTO tasks (
            task_code,
            task_name,
            is_active,
            created_at,
            updated_at
          )
          VALUES (
            'MASS',
            'Mass',
            true,
            NOW(),
            NOW()
          )
          ON CONFLICT (task_code)
          DO UPDATE SET
            task_name = EXCLUDED.task_name,
            is_active = EXCLUDED.is_active,
            updated_at = NOW();
        `,
        {
          transaction
        }
      );

      // Tạo hoặc cập nhật nhân viên mẫu
      await queryInterface.sequelize.query(
        `
          INSERT INTO employees (
            emp_code,
            emp_name,
            emp_email,
            is_active,
            created_at,
            updated_at
          )
          VALUES (
            'E001',
            'Nguyễn Văn Test',
            'test@company.com',
            true,
            NOW(),
            NOW()
          )
          ON CONFLICT (emp_code)
          DO UPDATE SET
            emp_name = EXCLUDED.emp_name,
            emp_email = EXCLUDED.emp_email,
            is_active = EXCLUDED.is_active,
            updated_at = NOW();
        `,
        {
          transaction
        }
      );

      // Lấy id của nhân viên, team và task
      const [employeeRows] =
        await queryInterface.sequelize.query(
          `
            SELECT emp_id
            FROM employees
            WHERE emp_code = 'E001'
            LIMIT 1;
          `,
          {
            transaction
          }
        );

      const [teamRows] =
        await queryInterface.sequelize.query(
          `
            SELECT team_id
            FROM teams
            WHERE team_code = 'TEAM_01'
            LIMIT 1;
          `,
          {
            transaction
          }
        );

      const [taskRows] =
        await queryInterface.sequelize.query(
          `
            SELECT task_id
            FROM tasks
            WHERE task_code = 'MASS'
            LIMIT 1;
          `,
          {
            transaction
          }
        );

      if (
        employeeRows.length === 0 ||
        teamRows.length === 0 ||
        taskRows.length === 0
      ) {
        throw new Error(
          'Không lấy được thông tin employee, team hoặc task.'
        );
      }

      const empId = employeeRows[0].emp_id;
      const teamId = teamRows[0].team_id;
      const taskId = taskRows[0].task_id;

      // Tạo lịch sử team nếu chưa tồn tại
      const [teamHistoryRows] =
        await queryInterface.sequelize.query(
          `
            SELECT emp_team_history_id
            FROM emp_team_histories
            WHERE emp_id = :empId
              AND team_id = :teamId
              AND start_date = '2026-01-01'
            LIMIT 1;
          `,
          {
            replacements: {
              empId,
              teamId
            },
            transaction
          }
        );

      if (teamHistoryRows.length === 0) {
        await queryInterface.bulkInsert(
          'emp_team_histories',
          [
            {
              emp_id: empId,
              team_id: teamId,
              start_date: '2026-01-01',
              end_date: null,
              created_at: new Date(),
              updated_at: new Date()
            }
          ],
          {
            transaction
          }
        );
      }

      // Tạo lịch sử task nếu chưa tồn tại
      const [taskHistoryRows] =
        await queryInterface.sequelize.query(
          `
            SELECT emp_task_history_id
            FROM emp_task_histories
            WHERE emp_id = :empId
              AND task_id = :taskId
              AND start_date = '2026-01-01'
            LIMIT 1;
          `,
          {
            replacements: {
              empId,
              taskId
            },
            transaction
          }
        );

      if (taskHistoryRows.length === 0) {
        await queryInterface.bulkInsert(
          'emp_task_histories',
          [
            {
              emp_id: empId,
              task_id: taskId,
              start_date: '2026-01-01',
              end_date: null,
              created_at: new Date(),
              updated_at: new Date()
            }
          ],
          {
            transaction
          }
        );
      }

      // Tạo hoặc cập nhật kỳ đăng ký
      await queryInterface.sequelize.query(
        `
          INSERT INTO registration_cycles (
            cycle_code,
            cycle_name,
            start_date,
            end_date,
            registration_open_time,
            registration_closing_time,
            status,
            created_at,
            updated_at
          )
          VALUES (
            '2026-08',
            '08/2026',
            '2026-07-26',
            '2026-08-25',
            '2026-07-17 00:00:00+07',
            '2026-08-23 23:59:59+07',
            'OPEN',
            NOW(),
            NOW()
          )
          ON CONFLICT (cycle_code)
          DO UPDATE SET
            cycle_name = EXCLUDED.cycle_name,
            start_date = EXCLUDED.start_date,
            end_date = EXCLUDED.end_date,
            registration_open_time =
              EXCLUDED.registration_open_time,
            registration_closing_time =
              EXCLUDED.registration_closing_time,
            status = EXCLUDED.status,
            updated_at = NOW();
        `,
        {
          transaction
        }
      );

      // Lấy id của kỳ đăng ký
      const [cycleRows] =
        await queryInterface.sequelize.query(
          `
            SELECT cycle_id
            FROM registration_cycles
            WHERE cycle_code = '2026-08'
            LIMIT 1;
          `,
          {
            transaction
          }
        );

      if (cycleRows.length === 0) {
        throw new Error(
          'Không lấy được cycle_id của kỳ 2026-08.'
        );
      }

      const cycleId = cycleRows[0].cycle_id;

      // Tạo hoặc cập nhật phép năm
      await queryInterface.sequelize.query(
        `
          INSERT INTO emp_annual_leaves (
            emp_id,
            balance_year,
            entitled_quantity,
            adjusted_quantity,
            created_at,
            updated_at
          )
          VALUES (
            :empId,
            2026,
            12,
            0,
            NOW(),
            NOW()
          )
          ON CONFLICT (
            emp_id,
            balance_year
          )
          DO UPDATE SET
            entitled_quantity =
              EXCLUDED.entitled_quantity,
            adjusted_quantity =
              EXCLUDED.adjusted_quantity,
            updated_at =
              NOW();
        `,
        {
          replacements: {
            empId
          },
          transaction
        }
      );

      // Tạo hoặc cập nhật số OFF theo kỳ
      await queryInterface.sequelize.query(
        `
          INSERT INTO employee_cycle_offs (
            emp_id,
            cycle_id,
            entitled_quantity,
            adjusted_quantity,
            created_at,
            updated_at
          )
          VALUES (
            :empId,
            :cycleId,
            4,
            0,
            NOW(),
            NOW()
          )
          ON CONFLICT (
            emp_id,
            cycle_id
          )
          DO UPDATE SET
            entitled_quantity =
              EXCLUDED.entitled_quantity,
            adjusted_quantity =
              EXCLUDED.adjusted_quantity,
            updated_at =
              NOW();
        `,
        {
          replacements: {
            empId,
            cycleId
          },
          transaction
        }
      );

      // Tạo RequireHC cho kỳ đăng ký
      const requireHCRows = [];

      for (let day = 26; day <= 31; day += 1) {
        requireHCRows.push({
          cycle_id: cycleId,
          working_date:
            `2026-07-${String(day).padStart(2, '0')}`,
          task_id: taskId,
          max_off: 2,
          created_at: new Date(),
          updated_at: new Date()
        });
      }

      for (let day = 1; day <= 25; day += 1) {
        requireHCRows.push({
          cycle_id: cycleId,
          working_date:
            `2026-08-${String(day).padStart(2, '0')}`,
          task_id: taskId,
          max_off: 2,
          created_at: new Date(),
          updated_at: new Date()
        });
      }

      for (const row of requireHCRows) {
        await queryInterface.sequelize.query(
          `
            INSERT INTO require_hc (
              cycle_id,
              working_date,
              task_id,
              max_off,
              created_at,
              updated_at
            )
            VALUES (
              :cycleId,
              :workingDate,
              :taskId,
              :maxOff,
              NOW(),
              NOW()
            )
            ON CONFLICT (
              cycle_id,
              working_date,
              task_id
            )
            DO UPDATE SET
              max_off = EXCLUDED.max_off,
              updated_at = NOW();
          `,
          {
            replacements: {
              cycleId: row.cycle_id,
              workingDate: row.working_date,
              taskId: row.task_id,
              maxOff: row.max_off
            },
            transaction
          }
        );
      }

      // Tạo các lý do nghỉ mẫu
      const reasonNames = [
        'Việc gia đình',
        'Việc cá nhân',
        'Du lịch'
      ];

      for (const reasonName of reasonNames) {
        await queryInterface.sequelize.query(
          `
            INSERT INTO leave_reasons (
              reason_name,
              is_active,
              created_at,
              updated_at
            )
            VALUES (
              :reasonName,
              true,
              NOW(),
              NOW()
            )
            ON CONFLICT (reason_name)
            DO UPDATE SET
              is_active = true,
              updated_at = NOW();
          `,
          {
            replacements: {
              reasonName
            },
            transaction
          }
        );
      }

      // Lấy id của loại nghỉ A và A/2
      const [leaveTypeRows] =
        await queryInterface.sequelize.query(
          `
            SELECT
              leave_type_id,
              leave_type_code
            FROM leave_types
            WHERE leave_type_code IN (
              'A',
              'A/2'
            );
          `,
          {
            transaction
          }
        );

      const leaveTypeMap = {};

      for (const leaveType of leaveTypeRows) {
        leaveTypeMap[leaveType.leave_type_code] =
          leaveType.leave_type_id;
      }

      if (
        !leaveTypeMap.A ||
        !leaveTypeMap['A/2']
      ) {
        throw new Error(
          'Không tìm thấy loại nghỉ A hoặc A/2.'
        );
      }

      // Lấy id của các lý do nghỉ mẫu
      const [reasonRows] =
        await queryInterface.sequelize.query(
          `
            SELECT
              reason_id,
              reason_name
            FROM leave_reasons
            WHERE reason_name IN (
              'Việc gia đình',
              'Việc cá nhân',
              'Du lịch'
            );
          `,
          {
            transaction
          }
        );

      // Gắn lý do với loại nghỉ A và A/2
      for (const reason of reasonRows) {
        await queryInterface.sequelize.query(
          `
            INSERT INTO leave_type_reasons (
              leave_type_id,
              reason_id,
              sort_order
            )
            VALUES (
              :leaveTypeId,
              :reasonId,
              1
            )
            ON CONFLICT (
              leave_type_id,
              reason_id
            )
            DO UPDATE SET
              sort_order =
                EXCLUDED.sort_order;
          `,
          {
            replacements: {
              leaveTypeId: leaveTypeMap.A,
              reasonId: reason.reason_id
            },
            transaction
          }
        );

        await queryInterface.sequelize.query(
          `
            INSERT INTO leave_type_reasons (
              leave_type_id,
              reason_id,
              sort_order
            )
            VALUES (
              :leaveTypeId,
              :reasonId,
              1
            )
            ON CONFLICT (
              leave_type_id,
              reason_id
            )
            DO UPDATE SET
              sort_order =
                EXCLUDED.sort_order;
          `,
          {
            replacements: {
              leaveTypeId:
                leaveTypeMap['A/2'],
              reasonId:
                reason.reason_id
            },
            transaction
          }
        );
      }

      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  },

  async down(queryInterface) {
    const transaction =
      await queryInterface.sequelize.transaction();

    try {
      // Xóa quan hệ giữa loại nghỉ và lý do mẫu
      await queryInterface.sequelize.query(
        `
          DELETE FROM leave_type_reasons
          WHERE reason_id IN (
            SELECT reason_id
            FROM leave_reasons
            WHERE reason_name IN (
              'Việc gia đình',
              'Việc cá nhân',
              'Du lịch'
            )
          );
        `,
        {
          transaction
        }
      );

      // Xóa các lý do nghỉ mẫu
      await queryInterface.sequelize.query(
        `
          DELETE FROM leave_reasons
          WHERE reason_name IN (
            'Việc gia đình',
            'Việc cá nhân',
            'Du lịch'
          );
        `,
        {
          transaction
        }
      );

      // Xóa RequireHC của kỳ mẫu
      await queryInterface.sequelize.query(
        `
          DELETE FROM require_hc
          WHERE cycle_id IN (
            SELECT cycle_id
            FROM registration_cycles
            WHERE cycle_code = '2026-08'
          );
        `,
        {
          transaction
        }
      );

      // Xóa số OFF theo kỳ của nhân viên mẫu
      await queryInterface.sequelize.query(
        `
          DELETE FROM employee_cycle_offs
          WHERE emp_id IN (
            SELECT emp_id
            FROM employees
            WHERE emp_code = 'E001'
          )
          AND cycle_id IN (
            SELECT cycle_id
            FROM registration_cycles
            WHERE cycle_code = '2026-08'
          );
        `,
        {
          transaction
        }
      );

      // Xóa phép năm của nhân viên mẫu
      await queryInterface.sequelize.query(
        `
          DELETE FROM emp_annual_leaves
          WHERE emp_id IN (
            SELECT emp_id
            FROM employees
            WHERE emp_code = 'E001'
          )
          AND balance_year = 2026;
        `,
        {
          transaction
        }
      );

      // Xóa lịch sử task của nhân viên mẫu
      await queryInterface.sequelize.query(
        `
          DELETE FROM emp_task_histories
          WHERE emp_id IN (
            SELECT emp_id
            FROM employees
            WHERE emp_code = 'E001'
          );
        `,
        {
          transaction
        }
      );

      // Xóa lịch sử team của nhân viên mẫu
      await queryInterface.sequelize.query(
        `
          DELETE FROM emp_team_histories
          WHERE emp_id IN (
            SELECT emp_id
            FROM employees
            WHERE emp_code = 'E001'
          );
        `,
        {
          transaction
        }
      );

      // Xóa kỳ đăng ký mẫu
      await queryInterface.sequelize.query(
        `
          DELETE FROM registration_cycles
          WHERE cycle_code = '2026-08';
        `,
        {
          transaction
        }
      );

      // Xóa nhân viên mẫu
      await queryInterface.sequelize.query(
        `
          DELETE FROM employees
          WHERE emp_code = 'E001';
        `,
        {
          transaction
        }
      );

      // Xóa task mẫu
      await queryInterface.sequelize.query(
        `
          DELETE FROM tasks
          WHERE task_code = 'MASS';
        `,
        {
          transaction
        }
      );

      // Xóa team mẫu
      await queryInterface.sequelize.query(
        `
          DELETE FROM teams
          WHERE team_code = 'TEAM_01';
        `,
        {
          transaction
        }
      );

      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }
};