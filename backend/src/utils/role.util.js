const { Op } = require('sequelize');

function getActiveRoles(account, options = {}) {
  const today = new Date().toISOString().slice(0, 10);
  return account.getRoles({
    ...options,
    where: { is_active: true },
    joinTableAttributes: [],
    through: {
      where: {
        start_date: { [Op.lte]: today },
        [Op.or]: [{ end_date: null }, { end_date: { [Op.gte]: today } }]
      }
    }
  });
}

module.exports = { getActiveRoles };
