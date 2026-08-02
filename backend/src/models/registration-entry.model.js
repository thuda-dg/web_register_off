const { DataTypes } = require('sequelize');

module.exports = function defineRegistrationEntry(
  sequelize
) {
  return sequelize.define(
    'RegistrationEntry',
    {
      entry_id: {
        type: DataTypes.BIGINT,
        autoIncrement: true,
        primaryKey: true
      },

      registration_code: {
        type: DataTypes.STRING(80),
        allowNull: false,
        unique: true
      },

      submission_id: {
        type: DataTypes.BIGINT,
        allowNull: false
      },

      leave_date: {
        type: DataTypes.DATEONLY,
        allowNull: false
      },

      leave_type_id: {
        type: DataTypes.BIGINT,
        allowNull: false
      },

      reason_id: {
        type: DataTypes.BIGINT,
        allowNull: true
      },

      custom_reason: {
        type: DataTypes.STRING(255),
        allowNull: true
      },

      team_id: {
        type: DataTypes.BIGINT,
        allowNull: false
      },

      task_id: {
        type: DataTypes.BIGINT,
        allowNull: false
      },

      current_status: {
        type: DataTypes.ENUM(
          'PENDING_TL',
          'APPROVED',
          'REJECTED',
          'PUBLISHED',
          'UNPUBLISHED',
          'CANCELLED'
        ),
        allowNull: false,
        defaultValue: 'PENDING_TL'
      },

      is_active: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true
      }
    },
    {
      tableName: 'registration_entries'
    }
  );
};