const { DataTypes } = require('sequelize');

module.exports = function defineEmpTeamHistory(sequelize) {
  return sequelize.define(
    'EmpTeamHistory',
    {
      emp_team_history_id: {
        type: DataTypes.BIGINT,
        autoIncrement: true,
        primaryKey: true
      },

      emp_id: {
        type: DataTypes.BIGINT,
        allowNull: false
      },

      team_id: {
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
      tableName: 'emp_team_histories'
    }
  );
};