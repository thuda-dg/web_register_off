const express = require('express');
const {readCalendarRange} = require('../controllers/calendar.controller');
const router = express.Router();

router.get('/calendar-range', readCalendarRange);

module.exports = router;