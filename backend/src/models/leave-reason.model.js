const { DataTypes } = require('sequelize');

module.exports = function defineLeaveReason(sequelize) {
  return sequelize.define(
    'LeaveReason',
    {
      reason_id: {
        type: DataTypes.BIGINT,
        autoIncrement: true,
        primaryKey: true
      },

      reason_name: {
        type: DataTypes.STRING(255),
        allowNull: false,
        unique: true
      },

      is_active: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true
      }
    },
    {
      tableName: 'leave_reasons'
    }
  );
};