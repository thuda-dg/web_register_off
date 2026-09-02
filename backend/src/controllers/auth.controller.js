const {
  forgotPassword,
  getCurrentUser,
  loginUser,
  logoutSession,
  refreshSession,
  registerUser,
  resetPassword
} = require('../services/auth.service');

const {
  getRefreshTokenTtlSeconds
} = require('../utils/auth.util');

const REFRESH_TOKEN_COOKIE =
  'refresh_token';

function getRefreshCookieOptions() {
  const isProduction =
    process.env.NODE_ENV === 'production';

  return {
    httpOnly: true,

    // Production phải chạy HTTPS
    secure: isProduction,

    // Local Angular :4200 + backend :3000
    // vẫn là same-site localhost nên lax dùng được.
    sameSite: isProduction
      ? 'none'
      : 'lax',

    // Chỉ gửi cookie cho auth API.
    path: '/api/auth',

    maxAge:
      getRefreshTokenTtlSeconds() *
      1000
  };
}

function getClearRefreshCookieOptions() {
  const {
    maxAge,
    ...options
  } = getRefreshCookieOptions();

  return options;
}

async function register(
  req,
  res,
  next
) {
  try {
    const result =
      await registerUser(req.body);

    return res
      .status(201)
      .json(result);

  } catch (error) {
    next(error);
  }
}

async function login(
  req,
  res,
  next
) {
  try {

    const result =
      await loginUser(
        req.body,
        {
          ipAddress: req.ip,
          userAgent:
            req.get('User-Agent')
        }
      );

    /*
     * refreshToken chỉ tồn tại tạm
     * trong backend.
     *
     * Không trả nó xuống JSON.
     */
    const {
      refreshToken,
      ...response
    } = result;

    if (refreshToken) {

      res.cookie(
        REFRESH_TOKEN_COOKIE,
        refreshToken,
        getRefreshCookieOptions()
      );

    }

    return res
      .status(200)
      .json(response);

  } catch (error) {
    next(error);
  }
}

async function refresh(
  req,
  res,
  next
) {
  try {

    const refreshToken =
      req.cookies?.[
        REFRESH_TOKEN_COOKIE
      ];
    console.log('refreshToken:', refreshToken);
    const result =
      await refreshSession(
        refreshToken,
        {
          ipAddress: req.ip,
          userAgent:
            req.get('User-Agent')
        }
      );

    const {
      refreshToken:
        nextRefreshToken,
      ...response
    } = result;

    if (nextRefreshToken) {

      res.cookie(
        REFRESH_TOKEN_COOKIE,
        nextRefreshToken,
        getRefreshCookieOptions()
      );

    }

    return res
      .status(200)
      .json(response);

  } catch (error) {

    res.clearCookie(
      REFRESH_TOKEN_COOKIE,
      getClearRefreshCookieOptions()
    );

    next(error);
  }
}

async function logout(
  req,
  res,
  next
) {
  try {

    const refreshToken =
      req.cookies?.[
        REFRESH_TOKEN_COOKIE
      ];

    const result =
      await logoutSession(
        refreshToken
      );

    res.clearCookie(
      REFRESH_TOKEN_COOKIE,
      getClearRefreshCookieOptions()
    );

    return res
      .status(200)
      .json(result);

  } catch (error) {

    res.clearCookie(
      REFRESH_TOKEN_COOKIE,
      getClearRefreshCookieOptions()
    );

    next(error);
  }
}

async function forgot(
  req,
  res,
  next
) {
  try {

    const result =
      await forgotPassword(
        req.body
      );

    return res
      .status(200)
      .json(result);

  } catch (error) {
    next(error);
  }
}

async function reset(
  req,
  res,
  next
) {
  try {

    const result =
      await resetPassword(
        req.body
      );

    return res
      .status(200)
      .json(result);

  } catch (error) {
    next(error);
  }
}

async function me(
  req,
  res,
  next
) {
  try {

    const result =
      await getCurrentUser(
        req.auth?.sub
      );

    return res
      .status(200)
      .json(result);

  } catch (error) {
    next(error);
  }
}

module.exports = {
  forgot,
  login,
  logout,
  me,
  refresh,
  register,
  reset
};