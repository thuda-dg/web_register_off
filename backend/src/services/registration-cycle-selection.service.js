const { Op } = require('sequelize');
const { RegistrationCycle } = require('../models');

async function selectRegistrationCycle(isAdmin, now = new Date()) {
  // Giữ quyền xem kỳ mới nhất của ADMIN như luồng bootstrap hiện có.
  if (isAdmin) return RegistrationCycle.findOne({ order: [['start_date', 'DESC']] });
  const current = await RegistrationCycle.findOne({
    where: { status: 'OPEN', registration_open_time: { [Op.lte]: now }, registration_closing_time: { [Op.gte]: now } },
    order: [['registration_open_time', 'DESC'], ['start_date', 'DESC']]
  });
  if (current) return current;
  const upcoming = await RegistrationCycle.findOne({
    where: { status: 'OPEN', registration_open_time: { [Op.gt]: now } },
    order: [['registration_open_time', 'ASC'], ['start_date', 'ASC']]
  });
  return upcoming || RegistrationCycle.findOne({ where: { status: 'OPEN' }, order: [['start_date', 'DESC']] });
}

module.exports = { selectRegistrationCycle };
