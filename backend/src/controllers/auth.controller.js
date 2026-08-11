const {
  forgotPassword,
  getCurrentUser,
  loginUser,
  logoutSession,
  refreshSession,
  registerUser,
  resetPassword
} = require('../services/auth.service');

async function register(req, res, next) {
  try {
    const result = await registerUser(req.body);
    return res.status(201).json(result);
  } catch (error) {
    next(error);
  }
}

async function login(req, res, next) {
  try {
    const result = await loginUser(req.body, {
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    });

    return res.status(200).json(result);
  } catch (error) {
    next(error);
  }
}

async function refresh(req, res, next) {
  try {
    const result = await refreshSession(req.body?.refreshToken, {
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    });

    return res.status(200).json(result);
  } catch (error) {
    next(error);
  }
}

async function logout(req, res, next) {
  try {
    const result = await logoutSession(req.body?.refreshToken);
    return res.status(200).json(result);
  } catch (error) {
    next(error);
  }
}

async function forgot(req, res, next) {
  try {
    const result = await forgotPassword(req.body);
    return res.status(200).json(result);
  } catch (error) {
    next(error);
  }
}

async function reset(req, res, next) {
  try {
    const result = await resetPassword(req.body);
    return res.status(200).json(result);
  } catch (error) {
    next(error);
  }
}

async function me(req, res, next) {
  try {
    const result = await getCurrentUser(req.auth?.sub);
    return res.status(200).json(result);
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
