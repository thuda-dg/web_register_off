const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();

app.use(
  cors({
    origin: process.env.FRONTEND_URL,
    credentials: true
  })
);

app.use(express.json());

app.get('/api/health', (req, res) => {
  res.json({
    ok: true,
    message: 'Backend is running'
  });
});

module.exports = app;