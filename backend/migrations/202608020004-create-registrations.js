'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('registration_submissions', {
      submission_id: { type: Sequelize.BIGINT, autoIncrement: true, primaryKey: true },
      submission_code: { type: Sequelize.STRING(80), allowNull: false, unique: true },
      submitted_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') },
      notes: { type: Sequelize.TEXT, allowNull: true },
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
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') },
    });

    await queryInterface.createTable('registration_entries', {
      entry_id: { type: Sequelize.BIGINT, autoIncrement: true, primaryKey: true },
      registration_code: { type: Sequelize.STRING(80), allowNull: false, unique: true },
      submission_id: {
        type: Sequelize.BIGINT, allowNull: false,
        references: { model: 'registration_submissions', key: 'submission_id' },
        onUpdate: 'CASCADE', onDelete: 'CASCADE',
      },
      leave_date: { type: Sequelize.DATEONLY, allowNull: false },
      leave_type_id: {
        type: Sequelize.BIGINT, allowNull: false,
        references: { model: 'leave_types', key: 'leave_type_id' },
        onUpdate: 'CASCADE', onDelete: 'RESTRICT',
      },
      reason_id: {
        type: Sequelize.BIGINT, allowNull: true,
        references: { model: 'leave_reasons', key: 'reason_id' },
        onUpdate: 'CASCADE', onDelete: 'SET NULL',
      },
      custom_reason: { type: Sequelize.STRING(255), allowNull: true },
      team_id: {
        type: Sequelize.BIGINT, allowNull: false,
        references: { model: 'teams', key: 'team_id' },
        onUpdate: 'CASCADE', onDelete: 'RESTRICT',
      },
      task_id: {
        type: Sequelize.BIGINT, allowNull: false,
        references: { model: 'tasks', key: 'task_id' },
        onUpdate: 'CASCADE', onDelete: 'RESTRICT',
      },
      current_status: {
        type: Sequelize.ENUM(
          'PENDING_TL', 'APPROVED', 'REJECTED',
          'PUBLISHED', 'UNPUBLISHED', 'CANCELLED'
        ),
        allowNull: false,
        defaultValue: 'PENDING_TL',
      },
      is_active: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: true },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') },
    });

    await queryInterface.createTable('registration_actions', {
      action_id: { type: Sequelize.BIGINT, autoIncrement: true, primaryKey: true },
      entry_id: {
        type: Sequelize.BIGINT, allowNull: false,
        references: { model: 'registration_entries', key: 'entry_id' },
        onUpdate: 'CASCADE', onDelete: 'CASCADE',
      },
      action_type: {
        type: Sequelize.ENUM(
          'SUBMITTED', 'TL_APPROVED', 'TL_REJECTED',
          'PUBLISHED', 'UNPUBLISHED', 'CANCELLED', 'UPDATED'
        ),
        allowNull: false,
      },
      old_status: { type: Sequelize.STRING(30), allowNull: true },
      new_status: { type: Sequelize.STRING(30), allowNull: false },
      performed_by_user_id: {
        type: Sequelize.BIGINT, allowNull: true,
        references: { model: 'user_accounts', key: 'user_account_id' },
        onUpdate: 'CASCADE', onDelete: 'RESTRICT',
      },
      note: { type: Sequelize.TEXT, allowNull: true },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') },
    });

    await queryInterface.addIndex('registration_submissions', ['emp_id', 'cycle_id']);
    await queryInterface.addIndex('registration_entries', ['leave_date', 'task_id', 'current_status']);
    await queryInterface.addIndex('registration_entries', ['submission_id']);
    await queryInterface.addIndex('registration_actions', ['entry_id', 'created_at']);
  },

  async down(queryInterface) {
    await queryInterface.dropTable('registration_actions');
    await queryInterface.dropTable('registration_entries');
    await queryInterface.dropTable('registration_submissions');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_registration_actions_action_type";');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_registration_entries_current_status";');
  },
};
