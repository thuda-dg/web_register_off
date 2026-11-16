const express = require('express');

const {
  getAll,
  create,
  options,
  updateRoles,
  updateTeam,
  updateTask
} = require('../controllers/admin.controller');

const {
  authMiddleware
} = require('../middleware/auth.middleware');
const { requireAdmin } = require('../middleware/admin.middleware');

const router = express.Router();
const importHc = require('../controllers/require-hc-import.controller');
const { excelUpload } = require('../middleware/excel-upload.middleware');
const registrationCycles = require('../controllers/admin-registration-cycle.controller');

router.get('/admin/registration-cycles', authMiddleware, requireAdmin, registrationCycles.list);
router.post('/admin/registration-cycles', authMiddleware, requireAdmin, registrationCycles.create);

router.get('/admin/require-hc/cycles', authMiddleware, requireAdmin, importHc.cycles);
router.post('/admin/require-hc/import', authMiddleware, requireAdmin, excelUpload, importHc.upload);

router.get('/admin/users/options', authMiddleware, requireAdmin, options);
router.post('/admin/users', authMiddleware, requireAdmin, create);
router.patch('/admin/users/:employeeId/roles', authMiddleware, requireAdmin, updateRoles);
router.patch('/admin/users/:employeeId/team', authMiddleware, requireAdmin, updateTeam);
router.patch('/admin/users/:employeeId/task', authMiddleware, requireAdmin, updateTask);

router.get(
  '/admin/getall',
  authMiddleware,
  getAll
);

module.exports = router;
