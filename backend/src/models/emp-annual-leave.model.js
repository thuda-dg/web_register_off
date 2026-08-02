const { DataTypes } = require('sequelize');

module.exports = function defineEmpAnnualLeave(sequelize) {
  return sequelize.define(
    'EmpAnnualLeave',
    {
      annual_leave_id: {
        type: DataTypes.BIGINT,
        autoIncrement: true,
        primaryKey: true
      },

      emp_id: {
        type: DataTypes.BIGINT,
        allowNull: false
      },

      balance_year: {
        type: DataTypes.INTEGER,
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
      tableName: 'emp_annual_leaves'
    }
  );
};