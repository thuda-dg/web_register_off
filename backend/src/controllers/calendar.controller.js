const {
  getCalendarRange
} = require('../services/calendar.service');

function readCalendarRange(req, res) {
  const range = getCalendarRange({
    canBypassTime: Boolean(req.user?.canBypassTime)
  });

  res.json(range);
}

module.exports = {
  readCalendarRange
};