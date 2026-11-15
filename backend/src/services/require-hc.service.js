const { Op } = require('sequelize');
const {
  sequelize, RequireHC, RegistrationCycle, Task,
  RegistrationEntry, RegistrationSubmission, LeaveType
} = require('../models');
const { ACTIVE_BALANCE_STATUSES } = require('./leave-balance.service');

async function getRequireHc() {
  const capacities = await RequireHC.findAll({
    attributes: ['require_hc_id', 'cycle_id', 'task_id', 'working_date', 'max_off'],
    include: [
      { model: RegistrationCycle, as: 'cycle', required: true, attributes: ['cycle_id', 'cycle_name'] },
      { model: Task, as: 'task', required: true, attributes: ['task_name'] }
    ],
    order: [['working_date', 'DESC'], ['task_id', 'ASC'], ['require_hc_id', 'ASC']]
  });
  if (!capacities.length) return { ok: true, rows: [] };
  // Aggregate once across all employees/teams, matching bootstrap slot accounting.
  const counts = await RegistrationEntry.findAll({
    attributes: ['leave_date', 'task_id',
      [sequelize.col('submission.cycle_id'), 'cycle_id'],
      [sequelize.fn('COUNT', sequelize.col('RegistrationEntry.entry_id')), 'registered_off']],
    include: [
      { model: RegistrationSubmission, as: 'submission', required: true, attributes: [],
        where: { cycle_id: { [Op.in]: [...new Set(capacities.map(row => row.cycle_id))] } } },
      { model: LeaveType, as: 'leaveType', required: true, attributes: [], where: { leave_type_code: 'OFF' } }
    ],
    where: { is_active: true, current_status: { [Op.in]: ACTIVE_BALANCE_STATUSES } },
    group: ['RegistrationEntry.leave_date', 'RegistrationEntry.task_id', 'submission.cycle_id'],
    raw: true
  });
  const byDay = new Map(counts.map(row => [
    `${row.cycle_id}:${row.task_id}:${row.leave_date}`, Number(row.registered_off)
  ]));
  const days = ['Chủ nhật', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy'];
  return {
    ok: true,
    rows: capacities.map(capacity => {
      const date = String(capacity.working_date);
      const maxOff = Number(capacity.max_off);
      const registeredOff = byDay.get(`${capacity.cycle_id}:${capacity.task_id}:${date}`) || 0;
      return {
        id: String(capacity.require_hc_id),
        cycleKey: String(capacity.cycle_id), cycleLabel: capacity.cycle.cycle_name,
        date, dateVN: date.split('-').reverse().join('/'),
        dayName: days[new Date(`${date}T00:00:00Z`).getUTCDay()],
        task: capacity.task.task_name, maxOff, registeredOff,
        remainingSlot: Math.max(maxOff - registeredOff, 0), full: registeredOff >= maxOff
      };
    })
  };
}

module.exports = { getRequireHc };
