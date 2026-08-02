'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('user_accounts', {
      user_account_id: { type: Sequelize.BIGINT, autoIncrement: true, primaryKey: true },
      emp_id: {
        type: Sequelize.BIGINT, allowNull: false, unique: true,
        references: { model: 'employees', key: 'emp_id' },
        onUpdate: 'CASCADE', onDelete: 'RESTRICT',
      },
      password_hash: { type: Sequelize.STRING(255), allowNull: false },
      account_status: {
        type: Sequelize.ENUM('PENDING_ACTIVATION', 'ACTIVE', 'LOCKED', 'DISABLED'),
        allowNull: false,
        defaultValue: 'PENDING_ACTIVATION',
      },
      failed_login_count: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 },
      locked_until: { type: Sequelize.DATE, allowNull: true },
      email_verified_at: { type: Sequelize.DATE, allowNull: true },
      last_login_at: { type: Sequelize.DATE, allowNull: true },
      password_changed_at: { type: Sequelize.DATE, allowNull: true },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') },
    });

    await queryInterface.createTable('account_tokens', {
      account_token_id: { type: Sequelize.BIGINT, autoIncrement: true, primaryKey: true },
      user_account_id: {
        type: Sequelize.BIGINT, allowNull: false,
        references: { model: 'user_accounts', key: 'user_account_id' },
        onUpdate: 'CASCADE', onDelete: 'CASCADE',
      },
      token_type: {
        type: Sequelize.ENUM('ACTIVATE_ACCOUNT', 'RESET_PASSWORD', 'VERIFY_EMAIL'),
        allowNull: false,
      },
      token_hash: { type: Sequelize.STRING(255), allowNull: false, unique: true },
      expires_at: { type: Sequelize.DATE, allowNull: false },
      used_at: { type: Sequelize.DATE, allowNull: true },
      revoked_at: { type: Sequelize.DATE, allowNull: true },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') },
    });

    await queryInterface.createTable('account_sessions', {
      session_id: { type: Sequelize.BIGINT, autoIncrement: true, primaryKey: true },
      user_account_id: {
        type: Sequelize.BIGINT, allowNull: false,
        references: { model: 'user_accounts', key: 'user_account_id' },
        onUpdate: 'CASCADE', onDelete: 'CASCADE',
      },
      refresh_token_hash: { type: Sequelize.STRING(255), allowNull: false, unique: true },
      ip_address: { type: Sequelize.INET, allowNull: true },
      user_agent: { type: Sequelize.TEXT, allowNull: true },
      expires_at: { type: Sequelize.DATE, allowNull: false },
      revoked_at: { type: Sequelize.DATE, allowNull: true },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') },
      last_used_at: { type: Sequelize.DATE, allowNull: true },
    });

    await queryInterface.createTable('roles', {
      role_id: { type: Sequelize.BIGINT, autoIncrement: true, primaryKey: true },
      role_code: { type: Sequelize.STRING(50), allowNull: false, unique: true },
      role_name: { type: Sequelize.STRING(100), allowNull: false },
      is_active: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: true },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') },
    });

    await queryInterface.createTable('user_roles', {
      user_role_id: { type: Sequelize.BIGINT, autoIncrement: true, primaryKey: true },
      user_account_id: {
        type: Sequelize.BIGINT, allowNull: false,
        references: { model: 'user_accounts', key: 'user_account_id' },
        onUpdate: 'CASCADE', onDelete: 'CASCADE',
      },
      role_id: {
        type: Sequelize.BIGINT, allowNull: false,
        references: { model: 'roles', key: 'role_id' },
        onUpdate: 'CASCADE', onDelete: 'RESTRICT',
      },
      start_date: { type: Sequelize.DATEONLY, allowNull: false },
      end_date: { type: Sequelize.DATEONLY, allowNull: true },
      assigned_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') },
    });
    await queryInterface.addConstraint('user_roles', {
      fields: ['user_account_id', 'role_id', 'start_date'],
      type: 'unique',
      name: 'uq_user_role_period',
    });

    await queryInterface.createTable('allowed_networks', {
      allowed_network_id: { type: Sequelize.BIGINT, autoIncrement: true, primaryKey: true },
      network_name: { type: Sequelize.STRING(120), allowNull: false },
      cidr_range: { type: Sequelize.CIDR, allowNull: false, unique: true },
      is_active: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: true },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') },
    });

    await queryInterface.addIndex('account_tokens', ['user_account_id', 'token_type']);
    await queryInterface.addIndex('account_sessions', ['user_account_id', 'expires_at']);
    await queryInterface.addIndex('user_roles', ['user_account_id', 'role_id']);
  },

  async down(queryInterface) {
    await queryInterface.dropTable('allowed_networks');
    await queryInterface.dropTable('user_roles');
    await queryInterface.dropTable('roles');
    await queryInterface.dropTable('account_sessions');
    await queryInterface.dropTable('account_tokens');
    await queryInterface.dropTable('user_accounts');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_account_tokens_token_type";');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_user_accounts_account_status";');
  },
};
