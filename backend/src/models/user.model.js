const { DataTypes } = require('sequelize');

module.exports = function defineUser(sequelize) {
  return sequelize.define(
    'User',
    {
      id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true
      },

      email: {
        type: DataTypes.STRING(255),
        allowNull: false,
        unique: true,
        validate: {
          isEmail: true
        }
      },

      password: {
        type: DataTypes.STRING(255),
        allowNull: false
      },

      resetPasswordToken: {
        type: DataTypes.STRING(255),
        allowNull: true
      },

      resetPasswordExpires: {
        type: DataTypes.DATE,
        allowNull: true
      }
    },
    {
      tableName: 'users'
    }
  );
};
