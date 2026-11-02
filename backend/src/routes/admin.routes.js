const express = require('express');

const {
  getAll,
  create,
  options,
  updateRoles
} = require('../controllers/admin.controller');

const {
  authMiddleware
} = require('../middleware/auth.middleware');
const { requireAdmin } = require('../middleware/admin.middleware');

const router = express.Router();

router.get('/admin/users/options', authMiddleware, requireAdmin, options);
router.post('/admin/users', authMiddleware, requireAdmin, create);
router.patch('/admin/users/:employeeId/roles', authMiddleware, requireAdmin, updateRoles);

router.get(
  '/admin/getall',
  authMiddleware,
  getAll
);

module.exports = router;
