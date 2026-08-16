const {
  decodeAccessToken
} = require('../utils/auth.util');


function authMiddleware(
  req,
  res,
  next
) {
  const authHeader =
    req.header('Authorization');

  const accessToken =
    authHeader &&
    authHeader.startsWith('Bearer ')
      ? authHeader.slice(7)
      : req.header('X-Access-Token') ||
        req.body?.accessToken;


  console.log(
    '\n===== AUTH MIDDLEWARE DEBUG ====='
  );

  console.log(
    'URL:',
    req.method,
    req.originalUrl
  );

  console.log(
    'Authorization exists:',
    !!authHeader
  );

  console.log(
    'Token prefix:',
    accessToken
      ? accessToken.slice(0, 30)
      : null
  );


  if (!accessToken) {
    return res.status(401).json({
      ok: false,
      code: 'UNAUTHORIZED',
      message:
        'Token không được cung cấp.'
    });
  }


  const payload =
    decodeAccessToken(accessToken);


  console.log(
    'JWT payload BEFORE req.user:',
    payload
  );


  if (!payload) {
    return res.status(401).json({
      ok: false,
      code:
        'INVALID_ACCESS_TOKEN',
      message:
        'Token không hợp lệ hoặc đã hết hạn.'
    });
  }


  req.auth = payload;
  req.user = payload;


  console.log(
    'req.user AFTER auth middleware:',
    req.user
  );

  console.log(
    '=================================\n'
  );


  next();
}


module.exports = {
  authMiddleware,
  authenticate:
    authMiddleware
};