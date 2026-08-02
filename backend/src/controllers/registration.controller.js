const {
  getRegistrationBootstrap
} = require(
  '../services/registration-bootstrap.service'
);

async function bootstrap(req, res, next) {
  try {
    const empId = req.user.empId;

    const data =
      await getRegistrationBootstrap(empId);

    return res.status(200).json({
      ok: true,
      message:
        'Lấy dữ liệu đăng ký thành công.',
      data
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  bootstrap
};