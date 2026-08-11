const { DataTypes } = require('sequelize');

module.exports = function defineRole(sequelize) {
  return sequelize.define(
    'Role',
    {
      role_id: {
        type: DataTypes.BIGINT,
        autoIncrement: true,
        primaryKey: true
      },

      role_code: {
        type: DataTypes.STRING(50),
        allowNull: false,
        unique: true
      },

      role_name: {
        type: DataTypes.STRING(100),
        allowNull: false
      },

      is_active: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true
      }
    },
    {
      tableName: 'roles'
    }
  );
};
