const { DataTypes } = require('sequelize');

module.exports = function defineTask(sequelize) {
  return sequelize.define(
    'Task',
    {
      task_id: {
        type: DataTypes.BIGINT,
        autoIncrement: true,
        primaryKey: true
      },

      task_code: {
        type: DataTypes.STRING(50),
        allowNull: false,
        unique: true
      },

      task_name: {
        type: DataTypes.STRING(120),
        allowNull: false
      },

      is_active: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true
      }
    },
    {
      tableName: 'tasks'
    }
  );
};