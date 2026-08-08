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

const {
  submitRegistration
} = require(
  '../services/registration-submit.service'
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


async function submitRegistrationController(
  req,
  res
) {
  try {
    const empId = Number(
      req.headers['x-emp-id']
    );

    const {
      cycleId,
      entries
    } = req.body;

    if (
      !Number.isInteger(empId) ||
      empId <= 0
    ) {
      return res.status(400).json({
        ok: false,
        code: 'INVALID_EMP_ID',
        message:
          'Thiếu hoặc sai X-Emp-Id.'
      });
    }

    if (
      !Number.isInteger(
        Number(cycleId)
      ) ||
      Number(cycleId) <= 0
    ) {
      return res.status(400).json({
        ok: false,
        code: 'INVALID_CYCLE_ID',
        message:
          'cycleId không hợp lệ.'
      });
    }

    if (
      !Array.isArray(entries) ||
      entries.length === 0
    ) {
      return res.status(400).json({
        ok: false,
        code: 'ENTRIES_REQUIRED',
        message:
          'Danh sách đăng ký không được để trống.'
      });
    }

    const result =
      await submitRegistration({
        empId,
        cycleId: Number(cycleId),
        entries
      });

    return res.status(201).json({
      ok: true,
      message:
        'Đăng ký lịch nghỉ thành công.',
      data: result
    });
  } catch (error) {
    if (
      error.code ===
      'REGISTRATION_VALIDATION_FAILED'
    ) {
      return res
        .status(
          error.statusCode || 400
        )
        .json({
          ok: false,
          code: error.code,
          message: error.message,
          errors:
            error.validationErrors || []
        });
    }

    console.error(
      'Submit registration error:',
      error
    );

    return res
      .status(
        error.statusCode || 500
      )
      .json({
        ok: false,
        code:
          error.code ||
          'INTERNAL_SERVER_ERROR',
        message:
          error.statusCode
            ? error.message
            : 'Có lỗi xảy ra khi đăng ký lịch nghỉ.'
      });
  }
}

module.exports = {
  bootstrap,
  validate,
  submitRegistrationController
};