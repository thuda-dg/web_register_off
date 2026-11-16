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
    if (entry.current_status !== 'PENDING_TL') throw fail('Đơn đã được xử lý. Vui lòng làm mới danh sách.', 409, 'ENTRY_ALREADY_DECIDED');
    await RequireHC.findOne({ where: { cycle_id: submission.cycle_id, task_id: entry.task_id, working_date: entry.leave_date },
      transaction, lock: transaction.LOCK.UPDATE });
    const status = payload.decision === 'approve' ? 'APPROVED' : 'REJECTED';
    await entry.update({ current_status: status }, { transaction });
    const action = await RegistrationAction.create({ entry_id: id,
      action_type: payload.decision === 'approve' ? 'TL_APPROVED' : 'TL_REJECTED',
      old_status: 'PENDING_TL', new_status: status, performed_by_user_id: lead.accountId, note: note || null }, { transaction });
    return { ok: true, message: status === 'APPROVED' ? 'Đã duyệt OFF.' : 'Đã từ chối OFF.',
      data: { entryId: id, status, decisionNote: note, decidedAt: action.created_at } };
  });
}

module.exports = { getOffApprovals, decideOff };
