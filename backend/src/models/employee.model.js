const { DataTypes } = require('sequelize');

module.exports = function defineEmployee(sequelize) {
  return sequelize.define(
    'Employee',
    {
      emp_id: {
        type: DataTypes.BIGINT,
        autoIncrement: true,
        primaryKey: true
      },

      emp_code: {
        type: DataTypes.STRING(50),
        allowNull: false,
        unique: true
      },

      emp_name: {
        type: DataTypes.STRING(150),
        allowNull: false
      },

      emp_email: {
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
      tableName: 'employees'
    }
  );
};