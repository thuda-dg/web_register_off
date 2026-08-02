const { DataTypes } = require('sequelize');

module.exports = function defineRegistrationCycle(sequelize) {
  return sequelize.define(
    'RegistrationCycle',
    {
      cycle_id: {
        type: DataTypes.BIGINT,
        autoIncrement: true,
        primaryKey: true
      },

      cycle_code: {
        type: DataTypes.STRING(20),
        allowNull: false,
        unique: true
      },

      cycle_name: {
        type: DataTypes.STRING(50),
        allowNull: false
      },

      start_date: {
        type: DataTypes.DATEONLY,
        allowNull: false
      },

      end_date: {
        type: DataTypes.DATEONLY,
        allowNull: false
      },

      registration_open_time: {
        type: DataTypes.DATE,
        allowNull: false
      },

      registration_closing_time: {
        type: DataTypes.DATE,
        allowNull: false
      },

      status: {
        type: DataTypes.ENUM(
          'DRAFT',
          'OPEN',
          'CLOSED',
          'ARCHIVED'
        ),
        allowNull: false,
        defaultValue: 'DRAFT'
      }
    },
    {
      tableName: 'registration_cycles'
    }
  );
};