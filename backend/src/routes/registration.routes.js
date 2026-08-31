const express = require('express');

const {
  bootstrap,
  validate,
  submitRegistrationController,
  getMyRegistrationEntriesController
} = require(
  '../controllers/registration.controller'
);

const {
  mockUser
} = require(
  '../middleware/mock-user.middleware'
);

const router = express.Router();

// Tất cả API registration tạm thời dùng cùng một mock user.
router.use(mockUser);

// Lấy dữ liệu ban đầu cho màn hình đăng ký
router.get(
  '/bootstrap',
  bootstrap
);

// Kiểm tra đăng ký trước khi lưu
router.post(
  '/validate',
  validate
);

// Lưu đăng ký
router.post(
  '/submit',
  submitRegistrationController
);

// Lấy đăng ký của user hiện tại trong một kỳ
router.get(
  '/my-entries',
  getMyRegistrationEntriesController
);

module.exports = router;