const { DataTypes } = require('sequelize');

module.exports = function defineRegistrationSubmission(
  sequelize
) {
  return sequelize.define(
    'RegistrationSubmission',
    {
      submission_id: {
        type: DataTypes.BIGINT,
        autoIncrement: true,
        primaryKey: true
      },

      submission_code: {
        type: DataTypes.STRING(80),
        allowNull: false,
        unique: true
      },

      submitted_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW
      },

      notes: {
        type: DataTypes.TEXT,
        allowNull: true
      },

      emp_id: {
        type: DataTypes.BIGINT,
        allowNull: false
      },

      cycle_id: {
        type: DataTypes.BIGINT,
        allowNull: false
      }
    },
    {
      tableName: 'registration_submissions'
    }
  );
};