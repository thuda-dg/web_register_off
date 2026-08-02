const { DataTypes } = require('sequelize');

module.exports = function defineEmpTaskHistory(sequelize) {
  return sequelize.define(
    'EmpTaskHistory',
    {
      emp_task_history_id: {
        type: DataTypes.BIGINT,
        autoIncrement: true,
        primaryKey: true
      },

      emp_id: {
        type: DataTypes.BIGINT,
        allowNull: false
      },

      task_id: {
        type: DataTypes.BIGINT,
        allowNull: false
      },

      start_date: {
        type: DataTypes.DATEONLY,
        allowNull: false
      },

      end_date: {
        type: DataTypes.DATEONLY,
        allowNull: true
      }
    },
    {
      tableName: 'emp_task_histories'
    }
  );
};