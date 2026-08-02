const { DataTypes } = require('sequelize');

module.exports = function defineEmployeeCycleOff(sequelize) {
  return sequelize.define(
    'EmployeeCycleOff',
    {
      employee_cycle_off_id: {
        type: DataTypes.BIGINT,
        autoIncrement: true,
        primaryKey: true
      },

      emp_id: {
        type: DataTypes.BIGINT,
        allowNull: false
      },

      cycle_id: {
        type: DataTypes.BIGINT,
        allowNull: false
      },

      entitled_quantity: {
        type: DataTypes.DECIMAL(6, 2),
        allowNull: false,
        defaultValue: 0
      },

      adjusted_quantity: {
        type: DataTypes.DECIMAL(6, 2),
        allowNull: false,
        defaultValue: 0
      }
    },
    {
      tableName: 'employee_cycle_offs'
    }
  );
};