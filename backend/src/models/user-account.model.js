const { DataTypes } = require('sequelize');

module.exports = function defineUserAccount(sequelize) {
  return sequelize.define(
    'UserAccount',
    {
      user_account_id: {
        type: DataTypes.BIGINT,
        autoIncrement: true,
        primaryKey: true
      },

      emp_id: {
        type: DataTypes.BIGINT,
        allowNull: false,
        unique: true
      },

      password: {
        type: DataTypes.STRING(255),
        allowNull: true
      },

      password_hash: {
        type: DataTypes.STRING(255),
        allowNull: false
      },

      account_status: {
        type: DataTypes.ENUM('PENDING_ACTIVATION', 'ACTIVE', 'LOCKED', 'DISABLED'),
        allowNull: false,
        defaultValue: 'PENDING_ACTIVATION'
      },

      failed_login_count: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0
      },

      locked_until: {
        type: DataTypes.DATE,
        allowNull: true
      },

      email_verified_at: {
        type: DataTypes.DATE,
        allowNull: true
      },

      last_login_at: {
        type: DataTypes.DATE,
        allowNull: true
      },

      password_changed_at: {
        type: DataTypes.DATE,
        allowNull: true
      },

      resetPasswordToken: {
        type: DataTypes.STRING(255),
        allowNull: true
      },

      resetPasswordExpires: {
        type: DataTypes.DATE,
        allowNull: true
      }
    },
    {
      tableName: 'user_accounts'
    }
  );
};
