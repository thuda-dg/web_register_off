const express = require('express');

const {
  bootstrap,
  validate,
  submitRegistrationController
} = require(
  '../controllers/registration.controller'
);

const {
  authMiddleware
} = require(
  '../middleware/auth.middleware'
);


const router =
  express.Router();


// =========================================================
// GET BOOTSTRAP
// =========================================================

// Lấy dữ liệu ban đầu
// cho màn hình đăng ký
router.get(
  '/bootstrap',
  authMiddleware,
  bootstrap
);


// =========================================================
// VALIDATE
// =========================================================

// Kiểm tra danh sách đăng ký
// trước khi lưu
router.post(
  '/validate',
  authMiddleware,
  validate
);


// =========================================================
// SUBMIT
// =========================================================

// Lưu đăng ký
router.post(
  '/submit',
  authMiddleware,
  submitRegistrationController
);


module.exports = router;