const { DataTypes } = require('sequelize');

module.exports = function defineRequireHC(sequelize) {
  return sequelize.define(
    'RequireHC',
    {
      require_hc_id: {
        type: DataTypes.BIGINT,
        autoIncrement: true,
        primaryKey: true
      },

      cycle_id: {
        type: DataTypes.BIGINT,
        allowNull: false
      },

      working_date: {
        type: DataTypes.DATEONLY,
        allowNull: false
      },

      task_id: {
        type: DataTypes.BIGINT,
        allowNull: false
      },

      max_off: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0
      }
    },
    {
      tableName: 'require_hc'
    }
  );
};