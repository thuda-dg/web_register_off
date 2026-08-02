const { DataTypes } = require('sequelize');

module.exports = function defineLeaveType(sequelize) {
  return sequelize.define(
    'LeaveType',
    {
      leave_type_id: {
        type: DataTypes.BIGINT,
        autoIncrement: true,
        primaryKey: true
      },

      leave_type_code: {
        type: DataTypes.STRING(20),
        allowNull: false,
        unique: true
      },

      leave_type_name: {
        type: DataTypes.STRING(150),
        allowNull: false
      },

      need_reason: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false
      },

      deduction_source: {
        type: DataTypes.ENUM('AL', 'OFF'),
        allowNull: true
      },

      deduction_quantity: {
        type: DataTypes.DECIMAL(6, 2),
        allowNull: false,
        defaultValue: 0
      },

      is_active: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true
      }
    },
    {
      tableName: 'leave_types'
    }
  );
};