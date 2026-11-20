const { UserAccount, Employee } = require('../models');
const { getActiveRoles } = require('../utils/role.util');

async function requireEmployeeRegistration(req, res, next) {
  try {
    const account = await UserAccount.findByPk(req.user?.sub);
    const employee = account ? await Employee.findByPk(account.emp_id) : null;
    const parts = new Intl.DateTimeFormat('en', { timeZone: 'Asia/Ho_Chi_Minh', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date());
    const value = key => parts.find(part => part.type === key).value;
    const today = `${value('year')}-${value('month')}-${value('day')}`;
    const roles = account?.account_status === 'ACTIVE' && employee?.is_active
      ? await getActiveRoles(account, {}, today) : [];
    if (!roles.some(role => role.role_code === 'EMPLOYEE') || Number(account?.emp_id) !== Number(req.user?.empId)) {
      return res.status(403).json({ ok: false, code: 'EMPLOYEE_ROLE_REQUIRED', message: 'Chỉ nhân viên có role EMPLOYEE còn hiệu lực được đăng ký OFF.' });
    }
    // Đăng ký theo quyền EMPLOYEE, không dùng quyền ADMIN để bỏ qua lịch mở kỳ.
    req.user = { ...req.user, roles: ['EMPLOYEE'] };
    next();
  } catch (error) { next(error); }
}
module.exports = { requireEmployeeRegistration };
