const { importRequireHc, getImportCycles } = require('../services/require-hc-import.service');
module.exports = {
  cycles: async (req, res, next) => {
    try { res.json(await getImportCycles()); } catch (error) { next(error); }
  },
  upload: async (req, res, next) => {
    try { res.json(await importRequireHc({ file: req.file, cycleId: req.body?.cycleId, mode: req.body?.mode })); }
    catch (error) {
      if (error.code === 'INVALID_REQUIRE_HC_IMPORT') return res.status(400).json({ ok: false, code: error.code, message: error.message, errors: error.errors });
      next(error);
    }
  }
};
