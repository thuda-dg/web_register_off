const express = require('express');
const cors = require('cors');
require('dotenv').config();

const registrationRoutes =
  require('./routes/registration.routes');

const {
  errorHandler
} = require(
  './middleware/error.middleware'
);

const app = express();

app.use(
  cors({
    origin: process.env.FRONTEND_URL,
    credentials: true
  })
);

app.use(express.json());

app.get('/api/health', (req, res) => {
  res.status(200).json({
    ok: true,
    message: 'Backend is running'
  });
});

// Khai báo route đăng ký lịch nghỉ
app.use(
  '/api/registration',
  registrationRoutes
);

// Xử lý route không tồn tại
app.use((req, res) => {
  res.status(404).json({
    ok: false,
    message: 'API không tồn tại.'
  });
});

// Xử lý lỗi tập trung
app.use(errorHandler);

module.exports = app;