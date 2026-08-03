const {
  getRegistrationBootstrap
} = require(
  '../services/registration-bootstrap.service'
);

const {
  validateRegistration
} = require(
  '../services/registration-validation.service'
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

async function validate(req, res, next) {
  try {
    const empId = req.user.empId;
    const { cycleId, entries } = req.body;

    if (!Number.isInteger(Number(cycleId))) {
      return res.status(400).json({
        ok: false,
        message: 'cycleId không hợp lệ.'
      });
    }

    if (!Array.isArray(entries)) {
      return res.status(400).json({
        ok: false,
        message: 'entries phải là một mảng.'
      });
    }

    if (entries.length === 0) {
      return res.status(400).json({
        ok: false,
        message:
          'Danh sách ngày đăng ký không được để trống.'
      });
    }

    const result =
      await validateRegistration({
        empId,
        cycleId: Number(cycleId),
        entries
      });

    return res.status(200).json({
      ok: true,
      valid: result.valid,
      errors: result.errors
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  bootstrap,
  validate
};