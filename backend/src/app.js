const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
require('dotenv').config();

const registrationRoutes =
  require('./routes/registration.routes');
const authRoutes =
  require('./routes/auth.routes');

const {
  errorHandler
} = require(
  './middleware/error.middleware'
);

const app = express();

app.locals.dbReady = false;

app.use(cookieParser());
app.use(
  cors({
    origin: [
      process.env.FRONTEND_URL,
      'http://localhost:4200',
      'http://127.0.0.1:4200',
      'http://localhost:3000',
      'http://127.0.0.1:3000'
    ].filter(Boolean),
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS']
  })
);

app.use(express.json());

app.get('/api/health', (req, res) => {
  res.status(200).json({
    ok: true,
    message: 'Backend is running',
    databaseReady: req.app.locals.dbReady
  });
});

// Khai báo route đăng ký lịch nghỉ
app.use(
  '/api/registration',
  registrationRoutes
);

// Khai báo route authentication
app.use(
  '/api/auth',
  authRoutes
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