'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('employees', {
      emp_id: { type: Sequelize.BIGINT, autoIncrement: true, primaryKey: true },
      emp_code: { type: Sequelize.STRING(50), allowNull: false, unique: true },
      emp_name: { type: Sequelize.STRING(150), allowNull: false },
      emp_email: { type: Sequelize.STRING(255), allowNull: false, unique: true },
      is_active: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: true },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') },
    });

    await queryInterface.createTable('teams', {
      team_id: { type: Sequelize.BIGINT, autoIncrement: true, primaryKey: true },
      team_code: { type: Sequelize.STRING(50), allowNull: false, unique: true },
      team_name: { type: Sequelize.STRING(120), allowNull: false },
      is_active: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: true },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') },
    });

    await queryInterface.createTable('tasks', {
      task_id: { type: Sequelize.BIGINT, autoIncrement: true, primaryKey: true },
      task_code: { type: Sequelize.STRING(50), allowNull: false, unique: true },
      task_name: { type: Sequelize.STRING(120), allowNull: false },
      is_active: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: true },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') },
    });

    await queryInterface.createTable('emp_team_histories', {
      emp_team_history_id: { type: Sequelize.BIGINT, autoIncrement: true, primaryKey: true },
      emp_id: {
        type: Sequelize.BIGINT, allowNull: false,
        references: { model: 'employees', key: 'emp_id' },
        onUpdate: 'CASCADE', onDelete: 'RESTRICT',
      },
      team_id: {
        type: Sequelize.BIGINT, allowNull: false,
        references: { model: 'teams', key: 'team_id' },
        onUpdate: 'CASCADE', onDelete: 'RESTRICT',
      },
      start_date: { type: Sequelize.DATEONLY, allowNull: false },
      end_date: { type: Sequelize.DATEONLY, allowNull: true },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') },
    });
    await queryInterface.addConstraint('emp_team_histories', {
      fields: ['emp_id', 'team_id', 'start_date'],
      type: 'unique',
      name: 'uq_emp_team_history',
    });
    await queryInterface.addConstraint('emp_team_histories', {
      fields: ['start_date', 'end_date'],
      type: 'check',
      where: { end_date: { [Sequelize.Op.or]: [{ [Sequelize.Op.gte]: Sequelize.col('start_date') }, null] } },
      name: 'ck_emp_team_history_dates',
    });

    await queryInterface.createTable('emp_task_histories', {
      emp_task_history_id: { type: Sequelize.BIGINT, autoIncrement: true, primaryKey: true },
      emp_id: {
        type: Sequelize.BIGINT, allowNull: false,
        references: { model: 'employees', key: 'emp_id' },
        onUpdate: 'CASCADE', onDelete: 'RESTRICT',
      },
      task_id: {
        type: Sequelize.BIGINT, allowNull: false,
        references: { model: 'tasks', key: 'task_id' },
        onUpdate: 'CASCADE', onDelete: 'RESTRICT',
      },
      start_date: { type: Sequelize.DATEONLY, allowNull: false },
      end_date: { type: Sequelize.DATEONLY, allowNull: true },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') },
    });
    await queryInterface.addConstraint('emp_task_histories', {
      fields: ['emp_id', 'task_id', 'start_date'],
      type: 'unique',
      name: 'uq_emp_task_history',
    });

    await queryInterface.addIndex('emp_team_histories', ['emp_id', 'start_date', 'end_date']);
    await queryInterface.addIndex('emp_task_histories', ['emp_id', 'start_date', 'end_date']);
  },

  async down(queryInterface) {
    await queryInterface.dropTable('emp_task_histories');
    await queryInterface.dropTable('emp_team_histories');
    await queryInterface.dropTable('tasks');
    await queryInterface.dropTable('teams');
    await queryInterface.dropTable('employees');
  },
};
