'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('leave_types', {
      leave_type_id: { type: Sequelize.BIGINT, autoIncrement: true, primaryKey: true },
      leave_type_code: { type: Sequelize.STRING(20), allowNull: false, unique: true },
      leave_type_name: { type: Sequelize.STRING(150), allowNull: false },
      need_reason: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false },
      deduction_source: {
        type: Sequelize.ENUM('AL', 'OFF'),
        allowNull: true,
      },
      deduction_quantity: { type: Sequelize.DECIMAL(6, 2), allowNull: false, defaultValue: 0 },
      is_active: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: true },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') },
    });

    await queryInterface.createTable('leave_reasons', {
      reason_id: { type: Sequelize.BIGINT, autoIncrement: true, primaryKey: true },
      reason_name: { type: Sequelize.STRING(255), allowNull: false, unique: true },
      is_active: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: true },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') },
    });

    await queryInterface.createTable('leave_type_reasons', {
      leave_type_id: {
        type: Sequelize.BIGINT, allowNull: false, primaryKey: true,
        references: { model: 'leave_types', key: 'leave_type_id' },
        onUpdate: 'CASCADE', onDelete: 'CASCADE',
      },
      reason_id: {
        type: Sequelize.BIGINT, allowNull: false, primaryKey: true,
        references: { model: 'leave_reasons', key: 'reason_id' },
        onUpdate: 'CASCADE', onDelete: 'CASCADE',
      },
      sort_order: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 },
    });

    await queryInterface.createTable('registration_cycles', {
      cycle_id: { type: Sequelize.BIGINT, autoIncrement: true, primaryKey: true },
      cycle_code: { type: Sequelize.STRING(20), allowNull: false, unique: true },
      cycle_name: { type: Sequelize.STRING(50), allowNull: false },
      start_date: { type: Sequelize.DATEONLY, allowNull: false },
      end_date: { type: Sequelize.DATEONLY, allowNull: false },
      registration_open_time: { type: Sequelize.DATE, allowNull: false },
      registration_closing_time: { type: Sequelize.DATE, allowNull: false },
      status: {
        type: Sequelize.ENUM('DRAFT', 'OPEN', 'CLOSED', 'ARCHIVED'),
        allowNull: false,
        defaultValue: 'DRAFT',
      },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') },
    });

    await queryInterface.createTable('emp_annual_leaves', {
      annual_leave_id: { type: Sequelize.BIGINT, autoIncrement: true, primaryKey: true },
      emp_id: {
        type: Sequelize.BIGINT, allowNull: false,
        references: { model: 'employees', key: 'emp_id' },
        onUpdate: 'CASCADE', onDelete: 'RESTRICT',
      },
      balance_year: { type: Sequelize.INTEGER, allowNull: false },
      entitled_quantity: { type: Sequelize.DECIMAL(6, 2), allowNull: false, defaultValue: 0 },
      adjusted_quantity: { type: Sequelize.DECIMAL(6, 2), allowNull: false, defaultValue: 0 },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') },
    });
    await queryInterface.addConstraint('emp_annual_leaves', {
      fields: ['emp_id', 'balance_year'],
      type: 'unique',
      name: 'uq_emp_annual_leave_year',
    });

    await queryInterface.createTable('employee_cycle_offs', {
      employee_cycle_off_id: { type: Sequelize.BIGINT, autoIncrement: true, primaryKey: true },
      emp_id: {
        type: Sequelize.BIGINT, allowNull: false,
        references: { model: 'employees', key: 'emp_id' },
        onUpdate: 'CASCADE', onDelete: 'RESTRICT',
      },
      cycle_id: {
        type: Sequelize.BIGINT, allowNull: false,
        references: { model: 'registration_cycles', key: 'cycle_id' },
        onUpdate: 'CASCADE', onDelete: 'RESTRICT',
      },
      entitled_quantity: { type: Sequelize.DECIMAL(6, 2), allowNull: false, defaultValue: 0 },
      adjusted_quantity: { type: Sequelize.DECIMAL(6, 2), allowNull: false, defaultValue: 0 },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') },
    });
    await queryInterface.addConstraint('employee_cycle_offs', {
      fields: ['emp_id', 'cycle_id'],
      type: 'unique',
      name: 'uq_employee_cycle_off',
    });

    await queryInterface.createTable('require_hc', {
      require_hc_id: { type: Sequelize.BIGINT, autoIncrement: true, primaryKey: true },
      cycle_id: {
        type: Sequelize.BIGINT, allowNull: false,
        references: { model: 'registration_cycles', key: 'cycle_id' },
        onUpdate: 'CASCADE', onDelete: 'RESTRICT',
      },
      working_date: { type: Sequelize.DATEONLY, allowNull: false },
      task_id: {
        type: Sequelize.BIGINT, allowNull: false,
        references: { model: 'tasks', key: 'task_id' },
        onUpdate: 'CASCADE', onDelete: 'RESTRICT',
      },
      max_off: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') },
    });
    await queryInterface.addConstraint('require_hc', {
      fields: ['cycle_id', 'working_date', 'task_id'],
      type: 'unique',
      name: 'uq_require_hc_cycle_date_task',
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('require_hc');
    await queryInterface.dropTable('employee_cycle_offs');
    await queryInterface.dropTable('emp_annual_leaves');
    await queryInterface.dropTable('registration_cycles');
    await queryInterface.dropTable('leave_type_reasons');
    await queryInterface.dropTable('leave_reasons');
    await queryInterface.dropTable('leave_types');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_registration_cycles_status";');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_leave_types_deduction_source";');
  },
};
