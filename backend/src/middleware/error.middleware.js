function errorHandler(error, req, res, next) {
  console.error(error);

  const statusCode =
    error.statusCode || 500;

  return res.status(statusCode).json({
    ok: false,
    message:
      error.message ||
      'Đã xảy ra lỗi trong hệ thống.'
  });
}

module.exports = {
  errorHandler
};