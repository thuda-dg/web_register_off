const { Op } = require('sequelize');
const {
  sequelize, UserAccount, Employee, Team, EmpTeamHistory, RequireHC,
  RegistrationEntry, RegistrationSubmission, RegistrationCycle,
  RegistrationAction, LeaveType, Task
} = require('../models');
const { getActiveRoles } = require('../utils/role.util');

const fail = (message, statusCode = 403, code = 'FORBIDDEN') => Object.assign(new Error(message), { statusCode, code });
// Match DATEONLY membership using the business timezone rather than the host clock.
const todayVN = () => {
  const parts = new Intl.DateTimeFormat('en', { timeZone: 'Asia/Bangkok', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date());
  const value = key => parts.find(part => part.type === key).value;
  return `${value('year')}-${value('month')}-${value('day')}`;
};
const effective = today => ({ start_date: { [Op.lte]: today }, [Op.or]: [{ end_date: null }, { end_date: { [Op.gte]: today } }] });

async function context(userId, transaction) {
  const today = todayVN();
  const account = await UserAccount.findByPk(userId, { transaction });
  const employee = account ? await Employee.findByPk(account.emp_id, { transaction }) : null;
  const roles = account?.account_status === 'ACTIVE' && employee?.is_active
    ? await getActiveRoles(account, { transaction }, today) : [];
  if (!roles.some(role => role.role_code === 'TEAM_LEAD')) throw fail('Chỉ TEAM_LEAD đang hoạt động được duyệt OFF.');
  const memberships = await EmpTeamHistory.findAll({
    where: { emp_id: account.emp_id, ...effective(today) },
    include: [{ model: Team, as: 'team', required: true, where: { is_active: true } }], transaction
  });
  if (memberships.length !== 1) throw fail('Team Lead cần có đúng một team hiện tại đang hoạt động.', 409, 'INVALID_LEAD_TEAM');
  return { accountId: Number(account.user_account_id), empId: Number(account.emp_id), today,
    teamId: Number(memberships[0].team_id), teamName: memberships[0].team.team_name };
}

function scopedQuery(lead, transaction) {
  return {
    where: { is_active: true },
    include: [
      { model: LeaveType, as: 'leaveType', required: true, attributes: [], where: { leave_type_code: 'OFF' } },
      { model: RegistrationSubmission, as: 'submission', required: true,
        include: [
          { model: RegistrationCycle, as: 'cycle', required: true, attributes: ['cycle_id', 'cycle_name'] },
          { model: Employee, as: 'employee', required: true, attributes: ['emp_id', 'emp_code', 'emp_name'],
            where: { is_active: true, emp_id: { [Op.ne]: lead.empId } },
            include: [{ model: EmpTeamHistory, as: 'teamHistories', required: true, attributes: [],
              where: { team_id: lead.teamId, ...effective(lead.today) } }] }
        ] },
      { model: Team, as: 'team', attributes: ['team_name'] },
      { model: Task, as: 'task', attributes: ['task_name'] }
    ], transaction
  };
}

function toRow(entry) {
  const submission = entry.submission;
  const decision = entry.actions?.[0];
  return {
    entryId: Number(entry.entry_id), employeeId: Number(submission.employee.emp_id),
    employeeCode: submission.employee.emp_code, employeeName: submission.employee.emp_name,
    cycleId: String(submission.cycle.cycle_id), cycleName: submission.cycle.cycle_name,
    date: entry.leave_date, teamName: entry.team?.team_name ?? '', taskName: entry.task?.task_name ?? '',
    status: entry.current_status, submittedAt: submission.submitted_at,
    decisionNote: decision?.note ?? '', decidedAt: decision?.created_at ?? null
  };
}

async function getOffApprovals(userId) {
  const lead = await context(userId);
  const query = scopedQuery(lead);
  query.include.push({ model: RegistrationAction, as: 'actions', required: false, separate: true,
    where: { action_type: { [Op.in]: ['TL_APPROVED', 'TL_REJECTED'] } },
    attributes: ['note', 'created_at'], order: [['created_at', 'DESC'], ['action_id', 'DESC']], limit: 1 });
  const entries = await RegistrationEntry.findAll({ ...query, order: [['leave_date', 'ASC'], ['entry_id', 'ASC']] });
  return { ok: true, data: { teamId: lead.teamId, teamName: lead.teamName, rows: entries.map(toRow) } };
}

async function decideOff(userId, entryId, payload = {}) {
  const id = Number(entryId);
  if (!Number.isSafeInteger(id) || id <= 0 || !['approve', 'reject'].includes(payload.decision)) {
    throw fail('Đơn hoặc quyết định không hợp lệ.', 400, 'INVALID_DECISION');
  }
  if (payload.note != null && typeof payload.note !== 'string') throw fail('Ghi chú không hợp lệ.', 400, 'INVALID_NOTE');
  const note = (payload.note || '').trim();
  if (note.length > 1000 || (payload.decision === 'reject' && !note)) {
    throw fail('Từ chối cần lý do; ghi chú tối đa 1000 ký tự.', 400, 'INVALID_NOTE');
  }
  return sequelize.transaction(async transaction => {
    const lead = await context(userId, transaction);
    // Discover immutable ownership, then take locks in submit order: employee -> entry -> capacity.
    const initial = await RegistrationEntry.findByPk(id, { attributes: ['submission_id'], transaction });
    const submission = initial ? await RegistrationSubmission.findByPk(initial.submission_id, { transaction }) : null;
    if (!submission) throw fail('Không tìm thấy đơn OFF.', 404, 'ENTRY_NOT_FOUND');
    if (Number(submission.emp_id) === lead.empId) throw fail('Không được tự duyệt hoặc từ chối đơn của mình.');
    await Employee.findByPk(submission.emp_id, { transaction, lock: transaction.LOCK.UPDATE });
    const query = scopedQuery(lead, transaction);
    const entry = await RegistrationEntry.findOne({ ...query, where: { ...query.where, entry_id: id },
      subQuery: false,
      lock: { level: transaction.LOCK.UPDATE, of: RegistrationEntry } });
    if (!entry) throw fail('Đơn không thuộc nhân viên trong team hiện tại hoặc không phải đơn OFF đang hoạt động.');
    const oldStatus = entry.current_status;
    const canDecide = oldStatus === 'PENDING_TL' || (oldStatus === 'APPROVED' && payload.decision === 'reject');
    if (!canDecide) throw fail('Đơn đã được xử lý hoặc đã công bố. Vui lòng làm mới danh sách.', 409, 'ENTRY_ALREADY_DECIDED');
    await RequireHC.findOne({ where: { cycle_id: submission.cycle_id, task_id: entry.task_id, working_date: entry.leave_date },
      transaction, lock: transaction.LOCK.UPDATE });
    const status = payload.decision === 'approve' ? 'APPROVED' : 'REJECTED';
    await entry.update({ current_status: status }, { transaction });
    const action = await RegistrationAction.create({ entry_id: id,
      action_type: payload.decision === 'approve' ? 'TL_APPROVED' : 'TL_REJECTED',
      old_status: oldStatus, new_status: status, performed_by_user_id: lead.accountId, note: note || null }, { transaction });
    return { ok: true, message: status === 'APPROVED' ? 'Đã duyệt OFF.' : 'Đã từ chối OFF.',
      data: { entryId: id, status, decisionNote: note, decidedAt: action.created_at } };
  });
}

async function publishOff(userId, payload = {}) {
  const cycleId = Number(payload.cycleId);
  const ids = payload.entryIds;
  if (!Number.isSafeInteger(cycleId) || cycleId <= 0 || typeof payload.cycleId === 'boolean' ||
      !Array.isArray(ids) || !ids.length || ids.length > 10000 ||
      ids.some(id => !Number.isSafeInteger(id) || id <= 0) || new Set(ids).size !== ids.length) {
    throw fail('Cần chọn một kỳ và danh sách đơn đã duyệt hợp lệ để công bố.', 400, 'INVALID_PUBLICATION');
  }
  return sequelize.transaction(async transaction => {
    const lead = await context(userId, transaction);
    // Khóa nhân viên theo cùng thứ tự với submit/decide. Bao gồm cả người chưa có
    // đơn để submit đồng thời không lọt vào giữa lần kiểm tra và công bố.
    const employees = await Employee.findAll({
      where: { is_active: true, emp_id: { [Op.ne]: lead.empId } },
      attributes: ['emp_id'],
      include: [{ model: EmpTeamHistory, as: 'teamHistories', required: true, attributes: [],
        where: { team_id: lead.teamId, ...effective(lead.today) } }],
      order: [['emp_id', 'ASC']], subQuery: false, transaction,
      lock: { level: transaction.LOCK.UPDATE, of: Employee }
    });
    const query = scopedQuery(lead, transaction);
    const submissionInclude = query.include.find(include => include.as === 'submission');
    submissionInclude.where = { cycle_id: cycleId };
    submissionInclude.include.find(include => include.as === 'employee').where.emp_id = {
      [Op.in]: employees.map(employee => employee.emp_id)
    };
    const entries = await RegistrationEntry.findAll({ ...query,
      order: [['entry_id', 'ASC']], subQuery: false,
      lock: { level: transaction.LOCK.UPDATE, of: RegistrationEntry }
    });
    if (entries.some(entry => entry.current_status === 'PENDING_TL')) {
      throw fail('Kỳ còn đơn OFF chờ duyệt. Hãy duyệt hoặc từ chối hết trước khi công bố.', 409, 'PENDING_OFF_REMAINS');
    }
    const approved = entries.filter(entry => entry.current_status === 'APPROVED');
    const requested = new Set(ids);
    if (!approved.length || approved.length !== ids.length || approved.some(entry => !requested.has(Number(entry.entry_id)))) {
      throw fail('Danh sách đã thay đổi hoặc không còn đơn cần công bố. Vui lòng làm mới và xác nhận lại.', 409, 'PUBLICATION_CHANGED');
    }
    const [updated] = await RegistrationEntry.update({ current_status: 'PUBLISHED' }, {
      where: { entry_id: { [Op.in]: ids }, current_status: 'APPROVED', is_active: true }, transaction
    });
    if (updated !== ids.length) throw fail('Danh sách đã thay đổi. Vui lòng làm mới.', 409, 'PUBLICATION_CHANGED');
    const publishedAt = new Date();
    await RegistrationAction.bulkCreate(approved.map(entry => ({
      entry_id: entry.entry_id, action_type: 'PUBLISHED', old_status: 'APPROVED', new_status: 'PUBLISHED',
      performed_by_user_id: lead.accountId, note: null, created_at: publishedAt
    })), { transaction });
    return { ok: true, message: `Đã công bố ${updated} ngày OFF.`,
      data: { cycleId, teamId: lead.teamId, entryIds: ids, publishedCount: updated, publishedAt } };
  });
}

module.exports = { getOffApprovals, decideOff, publishOff };
