const { Op } = require('sequelize');

const {
  sequelize,
  Employee,
  UserAccount,
  Role,
  RefreshToken
} = require('../models');

const {
  createAccessToken,
  createRandomToken,
  getAccessTokenTtlSeconds,
  getRefreshTokenTtlSeconds,
  hashPassword,
  hashToken,
  verifyPassword
} = require('../utils/auth.util');


function toHttpError(
  message,
  statusCode,
  code
) {
  const error = new Error(message);

  error.statusCode =
    statusCode;

  error.code =
    code;

  return error;
}


async function buildUserProfile(
  userAccount,
  employee,
  roles = []
) {
  return {
    userAccountId:
      Number(
        userAccount.user_account_id
      ),

    empId:
      Number(
        employee.emp_id
      ),

    empCode:
      employee.emp_code,

    empName:
      employee.emp_name,

    empEmail:
      employee.emp_email,

    accountStatus:
      userAccount.account_status,

    roles:
      roles.map(role => ({
        roleCode:
          role.role_code,

        roleName:
          role.role_name
      }))
  };
}


// =========================================================
// REGISTER
// =========================================================

async function registerUser(payload) {
  const {
    empCode,
    empName,
    empEmail,
    email,
    password
  } = payload || {};

  const normalizedEmpCode =
    String(empCode || '')
      .trim();

  const normalizedEmpName =
    String(empName || '')
      .trim();

  const normalizedEmail =
    String(
      empEmail ||
      email ||
      ''
    )
      .trim()
      .toLowerCase();


  if (
    !normalizedEmpCode ||
    !normalizedEmpName ||
    !normalizedEmail ||
    !password
  ) {
    throw toHttpError(
      'Thiếu thông tin đăng ký.',
      400,
      'INVALID_REGISTER_PAYLOAD'
    );
  }


  if (
    typeof password !== 'string' ||
    password.length < 8
  ) {
    throw toHttpError(
      'Mật khẩu phải có ít nhất 8 ký tự.',
      400,
      'INVALID_PASSWORD'
    );
  }


  if (
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/
      .test(normalizedEmail)
  ) {
    throw toHttpError(
      'Email không hợp lệ.',
      400,
      'INVALID_EMAIL'
    );
  }


  const transaction =
    await sequelize.transaction();


  try {
    let employee =
      await Employee.findOne({
        where: {
          [Op.or]: [
            {
              emp_code:
                normalizedEmpCode
            },
            {
              emp_email:
                normalizedEmail
            }
          ]
        },

        transaction
      });


    if (
      employee &&
      (
        employee.emp_code !==
          normalizedEmpCode ||
        employee.emp_email !==
          normalizedEmail
      )
    ) {
      throw toHttpError(
        'Mã nhân viên hoặc email đã tồn tại.',
        409,
        'EMPLOYEE_ALREADY_EXISTS'
      );
    }


    if (!employee) {
      employee =
        await Employee.create(
          {
            emp_code:
              normalizedEmpCode,

            emp_name:
              normalizedEmpName,

            emp_email:
              normalizedEmail,

            is_active:
              true
          },
          {
            transaction
          }
        );
    }


    const existingAccount =
      await UserAccount.findOne({
        where: {
          emp_id:
            employee.emp_id
        },

        transaction
      });


    if (existingAccount) {
      throw toHttpError(
        'Tài khoản đã tồn tại cho nhân viên này.',
        409,
        'ACCOUNT_ALREADY_EXISTS'
      );
    }


    let defaultRole =
      await Role.findOne({
        where: {
          role_code:
            'EMPLOYEE'
        },

        transaction
      });


    if (!defaultRole) {
      defaultRole =
        await Role.create(
          {
            role_code:
              'EMPLOYEE',

            role_name:
              'Employee',

            is_active:
              true
          },
          {
            transaction
          }
        );
    }


    const hashedPassword =
      hashPassword(password);


    const userAccount =
      await UserAccount.create(
        {
          emp_id:
            employee.emp_id,

          password:
            hashedPassword,

          password_hash:
            hashedPassword,

          account_status:
            'ACTIVE',

          failed_login_count:
            0,

          locked_until:
            null
        },
        {
          transaction
        }
      );


    await userAccount.addRole(
      defaultRole,
      {
        transaction
      }
    );


    await transaction.commit();


    const roles =
      await userAccount.getRoles();


    const profile =
      await buildUserProfile(
        userAccount,
        employee,
        roles
      );


    return {
      ok: true,

      message:
        'Đăng ký tài khoản thành công.',

      user:
        profile
    };

  } catch (error) {

    await transaction.rollback();

    throw error;
  }
}


// =========================================================
// LOGIN
// =========================================================

async function loginUser(
  payload,
  requestInfo = {}
) {
  const {
    identifier,
    password
  } = payload || {};


  const normalizedIdentifier =
    String(identifier || '')
      .trim();


  if (
    !normalizedIdentifier ||
    !password
  ) {
    throw toHttpError(
      'Thiếu thông tin đăng nhập.',
      400,
      'INVALID_CREDENTIALS'
    );
  }


  const normalizedEmail =
    normalizedIdentifier
      .toLowerCase();


  const employee =
    await Employee.findOne({
      where: {
        [Op.or]: [
          {
            emp_email:
              normalizedEmail
          },
          {
            emp_code:
              normalizedIdentifier
          }
        ]
      }
    });


  if (!employee) {
    throw toHttpError(
      'Thông tin đăng nhập không chính xác.',
      401,
      'INVALID_CREDENTIALS'
    );
  }


  if (
    employee.is_active === false
  ) {
    throw toHttpError(
      'Tài khoản nhân viên không còn hoạt động.',
      403,
      'EMPLOYEE_INACTIVE'
    );
  }


  const userAccount =
    await UserAccount.findOne({
      where: {
        emp_id:
          employee.emp_id
      }
    });


  if (!userAccount) {
    throw toHttpError(
      'Tài khoản chưa được tạo.',
      401,
      'ACCOUNT_NOT_FOUND'
    );
  }


  // =====================================================
  // CHECK ACCOUNT STATUS
  // =====================================================

  if (
    userAccount.account_status !==
    'ACTIVE'
  ) {

    if (
      userAccount.account_status ===
      'LOCKED'
    ) {

      if (
        userAccount.locked_until &&
        new Date(
          userAccount.locked_until
        ) > new Date()
      ) {
        throw toHttpError(
          'Tài khoản đang bị khóa.',
          423,
          'ACCOUNT_LOCKED'
        );
      }


      await userAccount.update({
        account_status:
          'ACTIVE',

        failed_login_count:
          0,

        locked_until:
          null
      });

    } else {

      throw toHttpError(
        'Tài khoản không khả dụng.',
        403,
        'ACCOUNT_DISABLED'
      );
    }
  }


  // =====================================================
  // CHECK PASSWORD
  // =====================================================

  const storedHash =
    userAccount.password ||
    userAccount.password_hash;


  if (
    !verifyPassword(
      password,
      storedHash
    )
  ) {
    const newFailureCount =
      (
        userAccount
          .failed_login_count ||
        0
      ) + 1;


    const lockUntil =
      newFailureCount >= 5
        ? new Date(
            Date.now() +
            15 * 60 * 1000
          )
        : null;


    await userAccount.update({
      failed_login_count:
        newFailureCount,

      account_status:
        newFailureCount >= 5
          ? 'LOCKED'
          : userAccount
              .account_status,

      locked_until:
        lockUntil
    });


    throw toHttpError(
      'Thông tin đăng nhập không chính xác.',
      401,
      'INVALID_CREDENTIALS'
    );
  }


  // =====================================================
  // USER PROFILE + JWT
  // =====================================================

  const roles =
    await userAccount.getRoles();


  const profile =
    await buildUserProfile(
      userAccount,
      employee,
      roles
    );


  const accessTokenPayload = {
    sub:
      Number(
        userAccount.user_account_id
      ),

    empId:
      Number(
        employee.emp_id
      ),

    roles:
      roles.map(
        item =>
          item.role_code
      )
  };

console.log(
  '===== LOGIN TOKEN DEBUG ====='
);

console.log(
  'employee.emp_id:',
  employee.emp_id
);

console.log(
  'userAccount.user_account_id:',
  userAccount.user_account_id
);

console.log(
  'accessTokenPayload:',
  accessTokenPayload
);
  const {
    token: accessToken,
    expiresAt
  } =
    createAccessToken(
      accessTokenPayload
    );


  // =====================================================
  // REFRESH TOKEN
  // =====================================================

  const refreshTokenValue =
    createRandomToken();


  const refreshTokenHash =
    hashToken(
      refreshTokenValue
    );


  const refreshTokenExpiresAt =
    new Date(
      Date.now() +
      getRefreshTokenTtlSeconds() *
        1000
    );


  // Mỗi user hiện chỉ có 1 refresh token/session.
  await RefreshToken.destroy({
    where: {
      userId:
        userAccount
          .user_account_id
    }
  });


  // DB chỉ lưu HASH, không lưu raw refresh token.
  await RefreshToken.create({
    userId:
      userAccount
        .user_account_id,

    token:
      refreshTokenHash,

    expiresAt:
      refreshTokenExpiresAt
  });


  await userAccount.update({
    failed_login_count:
      0,

    account_status:
      'ACTIVE',

    locked_until:
      null,

    last_login_at:
      new Date()
  });


  return {
    ok: true,

    message:
      'Đăng nhập thành công.',

    accessToken,

    // Client giữ raw token.
    refreshToken:
      refreshTokenValue,

    expiresIn:
      getAccessTokenTtlSeconds(),

    accessTokenExpiresAt:
      expiresAt.toISOString(),

    user:
      profile
  };
}


// =========================================================
// REFRESH SESSION
// =========================================================

async function refreshSession(
  refreshToken,
  requestInfo = {}
) {
  if (!refreshToken) {
    throw toHttpError(
      'Refresh token không được cung cấp.',
      400,
      'INVALID_REFRESH_TOKEN'
    );
  }


  // Client gửi raw token,
  // backend hash rồi mới tìm DB.
  const refreshTokenHash =
    hashToken(refreshToken);


  const session =
    await RefreshToken.findOne({
      where: {
        token:
          refreshTokenHash,

        expiresAt: {
          [Op.gt]:
            new Date()
        }
      },

      include: [
        {
          model:
            UserAccount,

          as:
            'userAccount'
        }
      ]
    });


  if (!session) {
    throw toHttpError(
      'Refresh token không hợp lệ hoặc đã hết hạn.',
      401,
      'INVALID_REFRESH_TOKEN'
    );
  }


  const userAccount =
    session.userAccount;


  if (
    !userAccount ||
    userAccount.account_status !==
      'ACTIVE'
  ) {
    throw toHttpError(
      'Tài khoản không khả dụng.',
      403,
      'ACCOUNT_DISABLED'
    );
  }


  const employee =
    await Employee.findByPk(
      userAccount.emp_id
    );


  if (!employee) {
    throw toHttpError(
      'Không tìm thấy nhân viên.',
      404,
      'EMPLOYEE_NOT_FOUND'
    );
  }


  if (
    employee.is_active === false
  ) {
    throw toHttpError(
      'Nhân viên đã ngừng hoạt động.',
      403,
      'EMPLOYEE_INACTIVE'
    );
  }


  const roles =
    await userAccount.getRoles();


  const profile =
    await buildUserProfile(
      userAccount,
      employee,
      roles
    );


  const accessTokenPayload = {
    sub:
      Number(
        userAccount.user_account_id
      ),

    empId:
      Number(
        employee.emp_id
      ),

    roles:
      roles.map(
        item =>
          item.role_code
      )
  };


  const {
    token: accessToken,
    expiresAt
  } =
    createAccessToken(
      accessTokenPayload
    );


  return {
    ok: true,

    message:
      'Refresh token thành công.',

    accessToken,

    expiresIn:
      getAccessTokenTtlSeconds(),

    accessTokenExpiresAt:
      expiresAt.toISOString(),

    user:
      profile
  };
}


// =========================================================
// LOGOUT
// =========================================================

async function logoutSession(
  refreshToken
) {
  if (!refreshToken) {
    throw toHttpError(
      'Refresh token không được cung cấp.',
      400,
      'INVALID_REFRESH_TOKEN'
    );
  }


  const refreshTokenHash =
    hashToken(refreshToken);


  const session =
    await RefreshToken.findOne({
      where: {
        token:
          refreshTokenHash
      }
    });


  // Logout idempotent:
  // token không còn thì vẫn coi là logout thành công.
  if (!session) {
    return {
      ok: true,

      message:
        'Đăng xuất thành công.'
    };
  }


  await session.destroy();


  return {
    ok: true,

    message:
      'Đăng xuất thành công.'
  };
}


// =========================================================
// FORGOT PASSWORD
// =========================================================

async function forgotPassword(
  payload
) {
  const {
    email,
    empEmail
  } = payload || {};


  const normalizedEmail =
    String(
      empEmail ||
      email ||
      ''
    )
      .trim()
      .toLowerCase();


  if (!normalizedEmail) {
    throw toHttpError(
      'Email là bắt buộc.',
      400,
      'INVALID_EMAIL'
    );
  }


  if (
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/
      .test(normalizedEmail)
  ) {
    throw toHttpError(
      'Email không hợp lệ.',
      400,
      'INVALID_EMAIL'
    );
  }


  const genericResponse = {
    ok: true,

    message:
      'Nếu email tồn tại, hướng dẫn đặt lại mật khẩu đã được gửi.'
  };


  const employee =
    await Employee.findOne({
      where: {
        emp_email:
          normalizedEmail
      }
    });


  if (!employee) {
    return genericResponse;
  }


  const userAccount =
    await UserAccount.findOne({
      where: {
        emp_id:
          employee.emp_id
      }
    });


  if (!userAccount) {
    return genericResponse;
  }


  const resetToken =
    createRandomToken();


  const resetTokenHash =
    hashToken(
      resetToken
    );


  const resetPasswordExpires =
    new Date(
      Date.now() +
      60 * 60 * 1000
    );


  // DB chỉ lưu hash.
  await userAccount.update({
    resetPasswordToken:
      resetTokenHash,

    resetPasswordExpires
  });


  /*
   * TODO:
   * Production phải gửi resetToken thật qua email.
   *
   * Dev hiện tại vẫn trả resetToken để bạn test UI.
   */
  if (
    process.env.NODE_ENV !==
    'production'
  ) {
    return {
      ...genericResponse,

      resetToken
    };
  }


  return genericResponse;
}


// =========================================================
// RESET PASSWORD
// =========================================================

async function resetPassword(
  payload
) {
  const {
    token,
    password
  } = payload || {};


  if (
    !token ||
    !password
  ) {
    throw toHttpError(
      'Token và mật khẩu mới là bắt buộc.',
      400,
      'INVALID_RESET_REQUEST'
    );
  }


  if (
    typeof password !== 'string' ||
    password.length < 8
  ) {
    throw toHttpError(
      'Mật khẩu phải có ít nhất 8 ký tự.',
      400,
      'INVALID_PASSWORD'
    );
  }


  const resetTokenHash =
    hashToken(token);


  const userAccount =
    await UserAccount.findOne({
      where: {
        resetPasswordToken:
          resetTokenHash,

        resetPasswordExpires: {
          [Op.gt]:
            new Date()
        }
      }
    });


  if (!userAccount) {
    throw toHttpError(
      'Token đặt lại mật khẩu không hợp lệ hoặc đã hết hạn.',
      400,
      'INVALID_RESET_TOKEN'
    );
  }


  const hashedPassword =
    hashPassword(password);


  const transaction =
    await sequelize.transaction();


  try {

    await userAccount.update(
      {
        password:
          hashedPassword,

        password_hash:
          hashedPassword,

        resetPasswordToken:
          null,

        resetPasswordExpires:
          null,

        password_changed_at:
          new Date(),

        failed_login_count:
          0,

        locked_until:
          null,

        account_status:
          'ACTIVE'
      },
      {
        transaction
      }
    );


    // Password đổi thì logout tất cả session cũ.
    await RefreshToken.destroy({
      where: {
        userId:
          userAccount
            .user_account_id
      },

      transaction
    });


    await transaction.commit();

  } catch (error) {

    await transaction.rollback();

    throw error;
  }


  return {
    ok: true,

    message:
      'Đặt lại mật khẩu thành công.'
  };
}


// =========================================================
// CURRENT USER
// =========================================================

async function getCurrentUser(
  userAccountId
) {
  if (
    !userAccountId
  ) {
    throw toHttpError(
      'Phiên đăng nhập không hợp lệ.',
      401,
      'UNAUTHORIZED'
    );
  }


  const userAccount =
    await UserAccount.findByPk(
      userAccountId
    );


  if (!userAccount) {
    throw toHttpError(
      'Không tìm thấy tài khoản.',
      404,
      'ACCOUNT_NOT_FOUND'
    );
  }


  const employee =
    await Employee.findByPk(
      userAccount.emp_id
    );


  if (!employee) {
    throw toHttpError(
      'Không tìm thấy nhân viên.',
      404,
      'EMPLOYEE_NOT_FOUND'
    );
  }


  const roles =
    await userAccount.getRoles();


  const profile =
    await buildUserProfile(
      userAccount,
      employee,
      roles
    );


  return {
    ok: true,

    user:
      profile
  };
}


module.exports = {
  registerUser,
  loginUser,
  refreshSession,
  logoutSession,
  forgotPassword,
  resetPassword,
  getCurrentUser
};