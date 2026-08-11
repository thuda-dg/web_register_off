const { DataTypes } = require('sequelize');

module.exports = function defineRefreshToken(sequelize) {
  return sequelize.define(
    'RefreshToken',
    {
      id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true
      },

      userId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        field: 'user_id'
      },

      token: {
        type: DataTypes.STRING(500),
        allowNull: false,
        unique: true
      },

      expiresAt: {
        type: DataTypes.DATE,
        allowNull: false,
        field: 'expires_at'
      }
    },
    {
      tableName: 'refresh_tokens'
    }
  );
};
