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

const {
  getMyRegistrationEntries
} = require(
  '../services/registration-history.service'
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
    const empId = req.user.empId;
    const {cycleId,entries} = req.body;


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

async function getMyRegistrationEntriesController(
  req,
  res
) {
  try {
    const empId = req.user.empId;

    const cycleId = Number(
      req.query.cycleId
    );


    if (
      !Number.isInteger(cycleId) ||
      cycleId <= 0
    ) {
      return res.status(400).json({
        ok: false,
        code: 'INVALID_CYCLE_ID',
        message:
          'cycleId không hợp lệ.'
      });
    }

    const result =
      await getMyRegistrationEntries({
        empId,
        cycleId
      });

    return res.status(200).json({
      ok: true,
      message:
        'Lấy lịch sử đăng ký thành công.',
      data: result
    });
  } catch (error) {
    console.error(
      'Get registration history error:',
      error
    );

    return res.status(500).json({
      ok: false,
      code: 'INTERNAL_SERVER_ERROR',
      message:
        'Có lỗi xảy ra khi lấy lịch sử đăng ký.'
    });
  }
}

module.exports = {
  bootstrap,
  validate,
  submitRegistrationController,
  getMyRegistrationEntriesController
};