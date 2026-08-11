const crypto = require('crypto');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const ACCESS_TOKEN_TTL_SECONDS = Number(process.env.ACCESS_TOKEN_TTL_SECONDS || 900);
const REFRESH_TOKEN_TTL_SECONDS = Number(process.env.REFRESH_TOKEN_TTL_SECONDS || 2592000);
const TOKEN_SECRET = process.env.AUTH_TOKEN_SECRET || 'change-me-in-production';

function createRandomToken(bytes = 32) {
  return crypto.randomBytes(bytes).toString('hex');
}

function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

function hashPassword(password) {
  return bcrypt.hashSync(password, 10);
}

function verifyPassword(password, storedHash) {
  if (!storedHash || typeof storedHash !== 'string') {
    return false;
  }

  return bcrypt.compareSync(password, storedHash);
}

function createAccessToken(payload) {
  const expiresAt = new Date(Date.now() + ACCESS_TOKEN_TTL_SECONDS * 1000);
  const token = jwt.sign(
    {
      ...payload,
      exp: Math.floor(expiresAt.getTime() / 1000)
    },
    TOKEN_SECRET
  );

  return {
    token,
    expiresAt
  };
}

function decodeAccessToken(token) {
  if (!token || typeof token !== 'string') {
    return null;
  }

  try {
    return jwt.verify(token, TOKEN_SECRET);
  } catch (error) {
    return null;
  }
}

function getAccessTokenTtlSeconds() {
  return ACCESS_TOKEN_TTL_SECONDS;
}

function getRefreshTokenTtlSeconds() {
  return REFRESH_TOKEN_TTL_SECONDS;
}

module.exports = {
  createRandomToken,
  hashToken,
  hashPassword,
  verifyPassword,
  createAccessToken,
  decodeAccessToken,
  getAccessTokenTtlSeconds,
  getRefreshTokenTtlSeconds
};
