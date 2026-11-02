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
  authHeader?.startsWith('Bearer ')
    ? authHeader.slice(7)
    : null;


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
function authorizeRoles(...allowedRoles) {
  return (req, res, next) => {
    const roles = req.user?.roles || (req.user?.role ? [req.user.role] : []);

    if (!Array.isArray(roles) || roles.length === 0) {
      return res.status(403).json({
        ok: false,
        code: 'FORBIDDEN',
        message: 'Không xác định được quyền của người dùng.'
      });
    }

    if (!roles.some(role => allowedRoles.includes(role))) {
      return res.status(403).json({
        ok: false,
        code: 'FORBIDDEN',
        message:
          'Bạn không có quyền thực hiện chức năng này.'
      });
    }

    next();
  };
}

module.exports = {
  authMiddleware,
  authenticate:
    authMiddleware,
  authorizeRoles,
  authorize:
    authorizeRoles
};
