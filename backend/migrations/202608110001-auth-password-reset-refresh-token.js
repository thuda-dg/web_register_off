'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('user_accounts', 'password', {
      type: Sequelize.STRING(255),
      allowNull: true
    });

    await queryInterface.addColumn('user_accounts', 'reset_password_token', {
      type: Sequelize.STRING(255),
      allowNull: true
    });

    await queryInterface.addColumn('user_accounts', 'reset_password_expires', {
      type: Sequelize.DATE,
      allowNull: true
    });

    await queryInterface.createTable('refresh_tokens', {
      id: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey: true
      },
      user_id: {
        type: Sequelize.BIGINT,
        allowNull: false,
        references: {
          model: 'user_accounts',
          key: 'user_account_id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      token: {
        type: Sequelize.STRING(500),
        allowNull: false,
        unique: true
      },
      expires_at: {
        type: Sequelize.DATE,
        allowNull: false
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.fn('NOW')
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.fn('NOW')
      }
    });

    await queryInterface.addIndex('refresh_tokens', ['user_id', 'expires_at']);
  },

  async down(queryInterface) {
    await queryInterface.dropTable('refresh_tokens');
    await queryInterface.removeColumn('user_accounts', 'reset_password_expires');
    await queryInterface.removeColumn('user_accounts', 'reset_password_token');
    await queryInterface.removeColumn('user_accounts', 'password');
  }
};
