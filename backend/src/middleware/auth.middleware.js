const { decodeAccessToken } = require('../utils/auth.util');

function authMiddleware(req, res, next) {
  const authHeader = req.header('Authorization');
  const accessToken = authHeader && authHeader.startsWith('Bearer ')
    ? authHeader.slice(7)
    : req.header('X-Access-Token') || req.body?.accessToken;

  if (!accessToken) {
    return res.status(401).json({
      ok: false,
      code: 'UNAUTHORIZED',
      message: 'Token không được cung cấp.'
    });
  }

  const payload = decodeAccessToken(accessToken);

  if (!payload) {
    return res.status(401).json({
      ok: false,
      code: 'INVALID_ACCESS_TOKEN',
      message: 'Token không hợp lệ hoặc đã hết hạn.'
    });
  }

  req.auth = payload;
  req.user = payload;

  next();
}

module.exports = {
  authMiddleware,
  authenticate: authMiddleware
};
