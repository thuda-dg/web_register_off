'use strict';

module.exports = {
  async up(queryInterface) {
    const transaction =
      await queryInterface.sequelize.transaction();

    try {
      // Tạo các role mặc định
      await queryInterface.sequelize.query(
        `
          INSERT INTO roles (
            role_code,
            role_name,
            is_active,
            created_at,
            updated_at
          )
          VALUES
            (
              'EMPLOYEE',
              'Employee',
              true,
              NOW(),
              NOW()
            ),
            (
              'TEAM_LEAD',
              'Team Lead',
              true,
              NOW(),
              NOW()
            ),
            (
              'WFM',
              'WFM',
              true,
              NOW(),
              NOW()
            ),
            (
              'ADMIN',
              'Administrator',
              true,
              NOW(),
              NOW()
            )
          ON CONFLICT (role_code)
          DO UPDATE SET
            role_name = EXCLUDED.role_name,
            is_active = EXCLUDED.is_active,
            updated_at = NOW();
        `,
        {
          transaction
        }
      );

      // Tạo các loại nghỉ mặc định
      await queryInterface.sequelize.query(
        `
          INSERT INTO leave_types (
            leave_type_code,
            leave_type_name,
            need_reason,
            deduction_source,
            deduction_quantity,
            is_active,
            created_at,
            updated_at
          )
          VALUES
            (
              'OFF',
              'Week Off',
              false,
              'OFF',
              1,
              true,
              NOW(),
              NOW()
            ),
            (
              'A',
              'Annual Leave',
              true,
              'AL',
              1,
              true,
              NOW(),
              NOW()
            ),
            (
              'A/2',
              'Half-day Annual Leave',
              true,
              'AL',
              0.5,
              true,
              NOW(),
              NOW()
            ),
            (
              'U',
              'Unpaid Leave',
              true,
              NULL,
              0,
              true,
              NOW(),
              NOW()
            ),
            (
              'U/2',
              'Half-day Unpaid Leave',
              true,
              NULL,
              0,
              true,
              NOW(),
              NOW()
            ),
            (
              'R',
              'Resignation Leave',
              true,
              NULL,
              0,
              true,
              NOW(),
              NOW()
            ),
            (
              'X',
              'Special Leave',
              true,
              NULL,
              0,
              true,
              NOW(),
              NOW()
            ),
            (
              'S',
              'Sick Leave',
              true,
              NULL,
              0,
              true,
              NOW(),
              NOW()
            ),
            (
              'H',
              'Holiday',
              false,
              NULL,
              0,
              true,
              NOW(),
              NOW()
            ),
            (
              'M',
              'Maternity Leave',
              true,
              NULL,
              0,
              true,
              NOW(),
              NOW()
            )
          ON CONFLICT (leave_type_code)
          DO UPDATE SET
            leave_type_name =
              EXCLUDED.leave_type_name,
            need_reason =
              EXCLUDED.need_reason,
            deduction_source =
              EXCLUDED.deduction_source,
            deduction_quantity =
              EXCLUDED.deduction_quantity,
            is_active =
              EXCLUDED.is_active,
            updated_at =
              NOW();
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
  },

  async down(queryInterface) {
    const transaction =
      await queryInterface.sequelize.transaction();

    try {
      // Xóa các loại nghỉ mặc định
      await queryInterface.sequelize.query(
        `
          DELETE FROM leave_types
          WHERE leave_type_code IN (
            'OFF',
            'A',
            'A/2',
            'U',
            'U/2',
            'R',
            'X',
            'S',
            'H',
            'M'
          );
        `,
        {
          transaction
        }
      );

      // Xóa các role mặc định
      await queryInterface.sequelize.query(
        `
          DELETE FROM roles
          WHERE role_code IN (
            'EMPLOYEE',
            'TEAM_LEAD',
            'WFM',
            'ADMIN'
          );
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