const express = require('express');

const {
  getAll
} = require('../controllers/admin.controller');

const {
  authMiddleware
} = require('../middleware/auth.middleware');

const router = express.Router();

router.get(
  '/admin/getall',
  authMiddleware,
  getAll
);

module.exports = router;