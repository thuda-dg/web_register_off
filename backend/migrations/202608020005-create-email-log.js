'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('email_logs', {
      email_log_id: { type: Sequelize.BIGINT, autoIncrement: true, primaryKey: true },
      employee_id: {
        type: Sequelize.BIGINT, allowNull: true,
        references: { model: 'employees', key: 'emp_id' },
        onUpdate: 'CASCADE', onDelete: 'SET NULL',
      },
      cycle_id: {
        type: Sequelize.BIGINT, allowNull: true,
        references: { model: 'registration_cycles', key: 'cycle_id' },
        onUpdate: 'CASCADE', onDelete: 'SET NULL',
      },
      submission_id: {
        type: Sequelize.BIGINT, allowNull: true,
        references: { model: 'registration_submissions', key: 'submission_id' },
        onUpdate: 'CASCADE', onDelete: 'SET NULL',
      },
      email_type: { type: Sequelize.STRING(50), allowNull: false },
      recipient_email: { type: Sequelize.STRING(255), allowNull: false },
      subject: { type: Sequelize.STRING(255), allowNull: false },
      status: {
        type: Sequelize.ENUM('PENDING', 'SENT', 'FAILED'),
        allowNull: false,
        defaultValue: 'PENDING',
      },
      sent_at: { type: Sequelize.DATE, allowNull: true },
      error_message: { type: Sequelize.TEXT, allowNull: true },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') },
    });

    await queryInterface.addIndex('email_logs', ['employee_id', 'cycle_id', 'email_type']);
  },

  async down(queryInterface) {
    await queryInterface.dropTable('email_logs');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_email_logs_status";');
  },
};
