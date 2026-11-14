const {
  getAllEmployees,
  createUser,
  getCreateUserOptions,
  updateUserRoles,
  updateUserTeam
} = require('../services/admin.service'); 

async function getAll(
  req,
  res,
  next
) {
  try {

    const result =
      await getAllEmployees();

    return res
      .status(200)
      .json(result);

  } catch (error) {
    next(error);
  }
}
module.exports = {
  updateTeam: async (req, res, next) => {
    try {
      res.json(await updateUserTeam(req.params.employeeId, req.body || {}));
    } catch (error) { next(error); }
  },
  updateRoles: async (req, res, next) => {
    try {
      res.json(await updateUserRoles(req.params.employeeId, req.body || {}));
    } catch (error) { next(error); }
  },
  create: async (req, res, next) => {
    try {
      res.status(201).json(await createUser(req.body || {}));
    } catch (error) { next(error); }
  },
  options: async (req, res, next) => {
    try {
      res.json(await getCreateUserOptions());
    } catch (error) { next(error); }
  },
  getAll
};
