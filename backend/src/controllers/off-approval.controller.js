const { getOffApprovals, decideOff } = require('../services/off-approval.service');

module.exports = {
  list: async (req, res, next) => {
    try { res.json(await getOffApprovals(req.user.sub)); } catch (error) { next(error); }
  },
  decide: async (req, res, next) => {
    try { res.json(await decideOff(req.user.sub, req.params.entryId, req.body || {})); } catch (error) { next(error); }
  }
};
