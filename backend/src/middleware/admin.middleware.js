const { UserAccount, Employee } = require('../models');
const { getActiveRoles } = require('../utils/role.util');

// Check current DB grants so an older JWT cannot retain removed admin access.
async function requireAdmin(req, res, next) {
  try {
    const account = await UserAccount.findByPk(req.user.sub);
    const employee = account ? await Employee.findByPk(account.emp_id) : null;
    const roles = account?.account_status === 'ACTIVE' && employee?.is_active
      ? await getActiveRoles(account) : [];
    if (!roles.some(role => role.role_code === 'ADMIN')) {
      return res.status(403).json({
        ok: false, code: 'FORBIDDEN', message: 'Bạn không có quyền thực hiện chức năng này.'
      });
    }
    next();
  } catch (error) { next(error); }
}

module.exports = { requireAdmin };
