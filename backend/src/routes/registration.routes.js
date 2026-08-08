const express = require('express');

const {
  bootstrap,
  validate,
  submitRegistrationController
} = require(
  '../controllers/registration.controller'
);

const {
  mockUser
} = require(
  '../middleware/mock-user.middleware'
);

const router = express.Router();

// Lấy dữ liệu ban đầu cho màn hình đăng ký
router.get(
  '/bootstrap',
  mockUser,
  bootstrap
);

// Kiểm tra danh sách đăng ký trước khi lưu
router.post(
  '/validate',
  mockUser,
  validate
);

router.post(
  '/submit',
  submitRegistrationController
);
module.exports = router;