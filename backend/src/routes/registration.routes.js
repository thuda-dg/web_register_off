const express = require('express');
const {bootstrap, validate, submitRegistrationController,getMyRegistrationEntriesController, published, requireHc} = require('../controllers/registration.controller');
const {authMiddleware} = require('../middleware/auth.middleware');
const router = express.Router();
const approvals = require('../controllers/off-approval.controller');
const { requireEmployeeRegistration } = require('../middleware/employee-registration.middleware');

// Xác thực user cho tất cả API registration
router.use(authMiddleware);
router.get('/approvals', approvals.list);
router.patch('/approvals/:entryId', approvals.decide);
router.get('/published', published);
router.post('/published', approvals.publish);
router.get('/require-hc', requireHc);

// Lấy dữ liệu ban đầu cho màn hình đăng ký
router.get('/bootstrap', requireEmployeeRegistration, bootstrap);

// Kiểm tra đăng ký trước khi lưu
router.post('/validate', requireEmployeeRegistration, validate);

// Lưu đăng ký
router.post('/submit', requireEmployeeRegistration, submitRegistrationController);

// Lấy toàn bộ lịch sử đăng ký của user hiện tại
router.get('/history',getMyRegistrationEntriesController);

module.exports = router;
