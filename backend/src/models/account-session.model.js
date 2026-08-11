const { DataTypes } = require('sequelize');

module.exports = function defineAccountSession(sequelize) {
  return sequelize.define(
    'AccountSession',
    {
      session_id: {
        type: DataTypes.BIGINT,
        autoIncrement: true,
        primaryKey: true
      },

      user_account_id: {
        type: DataTypes.BIGINT,
        allowNull: false
      },

      refresh_token_hash: {
        type: DataTypes.STRING(255),
        allowNull: false,
        unique: true
      },

      ip_address: {
        type: DataTypes.STRING(45),
        allowNull: true
      },

      user_agent: {
        type: DataTypes.TEXT,
        allowNull: true
      },

      expires_at: {
        type: DataTypes.DATE,
        allowNull: false
      },

      revoked_at: {
        type: DataTypes.DATE,
        allowNull: true
      },

      last_used_at: {
        type: DataTypes.DATE,
        allowNull: true
      }
    },
    {
      tableName: 'account_sessions'
    }
  );
};
