const { DataTypes } = require('sequelize');

module.exports = function defineUserRole(sequelize) {
  return sequelize.define(
    'UserRole',
    {
      user_role_id: {
        type: DataTypes.BIGINT,
        autoIncrement: true,
        primaryKey: true
      },

      user_account_id: {
        type: DataTypes.BIGINT,
        allowNull: false
      },

      role_id: {
        type: DataTypes.BIGINT,
        allowNull: false
      },

      start_date: {
        type: DataTypes.DATEONLY,
        allowNull: false,
        defaultValue: DataTypes.NOW
      },

      end_date: {
        type: DataTypes.DATEONLY,
        allowNull: true
      },

      assigned_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW
      }
    },
    {
      tableName: 'user_roles',
      timestamps: false
    }
  );
};
