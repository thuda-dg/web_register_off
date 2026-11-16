const { listCycles, createCycle } = require('../services/admin-registration-cycle.service');

module.exports = {
  list: async (req, res, next) => {
    try { res.json(await listCycles()); } catch (error) { next(error); }
  },
  create: async (req, res, next) => {
    try { res.status(201).json(await createCycle(req.body)); } catch (error) { next(error); }
  }
};
