const express = require('express');

const {
  bootstrap
} = require(
  '../controllers/registration.controller'
);

const {
  mockUser
} = require(
  '../middleware/mock-user.middleware'
);

const router = express.Router();

router.get(
  '/bootstrap',
  mockUser,
  bootstrap
);

module.exports = router;