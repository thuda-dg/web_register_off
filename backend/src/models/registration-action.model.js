const { DataTypes } = require('sequelize');

module.exports = function defineRegistrationAction(
  sequelize
) {
  return sequelize.define(
    'RegistrationAction',
    {
      action_id: {
        type: DataTypes.BIGINT,
        autoIncrement: true,
        primaryKey: true
      },

      entry_id: {
        type: DataTypes.BIGINT,
        allowNull: false
      },

      action_type: {
        type: DataTypes.ENUM(
          'SUBMITTED',
          'TL_APPROVED',
          'TL_REJECTED',
          'PUBLISHED',
          'UNPUBLISHED',
          'CANCELLED',
          'UPDATED'
        ),
        allowNull: false
      },

      old_status: {
        type: DataTypes.STRING(30),
        allowNull: true
      },

      new_status: {
        type: DataTypes.STRING(30),
        allowNull: false
      },

      performed_by_user_id: {
        type: DataTypes.BIGINT,
        allowNull: true
      },

      note: {
        type: DataTypes.TEXT,
        allowNull: true
      }
    },
    {
      tableName: 'registration_actions',
      updatedAt: false
    }
  );
};