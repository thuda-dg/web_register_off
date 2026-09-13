const {
  getAllEmployees
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
  getAll
};