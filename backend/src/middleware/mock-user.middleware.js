function mockUser(req, res, next) {
  const headerEmpId = req.header('X-Emp-Id');
  const empId = Number(headerEmpId || 2);

  if (!Number.isInteger(empId) || empId <= 0) {
    return res.status(400).json({
      ok: false,
      message: 'X-Emp-Id không hợp lệ.'
    });
  }

  req.user = {
    empId
  };

  next();
}

module.exports = {
  mockUser
};