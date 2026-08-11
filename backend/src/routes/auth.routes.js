const express = require('express');
const {
  forgot,
  login,
  logout,
  me,
  refresh,
  register,
  reset
} = require('../controllers/auth.controller');
const { authMiddleware } = require('../middleware/auth.middleware');

const router = express.Router();

router.post('/register', register);
router.post('/login', login);
router.post('/refresh-token', refresh);
router.post('/logout', logout);
router.post('/forgot-password', forgot);
router.post('/reset-password', reset);
router.get('/me', authMiddleware, me);

module.exports = router;
