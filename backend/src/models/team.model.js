const { DataTypes } = require('sequelize');

module.exports = function defineTeam(sequelize) {
  return sequelize.define(
    'Team',
    {
      team_id: {
        type: DataTypes.BIGINT,
        autoIncrement: true,
        primaryKey: true
      },

      team_code: {
        type: DataTypes.STRING(50),
        allowNull: false,
        unique: true
      },

      team_name: {
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
      tableName: 'teams'
    }
  );
};