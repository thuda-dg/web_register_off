const express = require('express');
const pool = require('../config/database');

const router = express.Router();

router.get('/leave-reasons', async (req, res, next) => {
  try {
    const result = await pool.query(`
      SELECT
        leave_type,
        reason
      FROM leave_reasons
      WHERE is_active = TRUE
      ORDER BY sort_order, reason
    `);

    const map = {
      A: [],
      'A/2': []
    };

    for (const row of result.rows) {
      if (map[row.leave_type]) {
        map[row.leave_type].push(row.reason);
      }
    }

    res.json(map);
  } catch (error) {
    next(error);
  }
});

module.exports = router;