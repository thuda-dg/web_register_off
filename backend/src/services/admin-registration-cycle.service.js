const { Op, UniqueConstraintError } = require('sequelize');
const { sequelize, RegistrationCycle } = require('../models');

function invalid(message, statusCode = 400) {
  return Object.assign(new Error(message), {
    statusCode, code: statusCode === 409 ? 'REGISTRATION_CYCLE_CONFLICT' : 'INVALID_REGISTRATION_CYCLE'
  });
}

function validDate(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value) || Number(value.slice(0, 4)) < 1000) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

function buildCycle(body) {
  const { startDate, endDate } = body || {};
  if (!validDate(startDate) || !validDate(endDate)) throw invalid('Ngày bắt đầu và kết thúc phải là ngày hợp lệ, định dạng YYYY-MM-DD.');
  if (startDate > endDate) throw invalid('Ngày kết thúc phải bằng hoặc sau ngày bắt đầu.');
  const year = Number(endDate.slice(0, 4)), month = Number(endDate.slice(5, 7));
  const previousMonth = month === 1 ? `${year - 1}-12` : `${year}-${String(month - 1).padStart(2, '0')}`;
  return {
    cycle_code: endDate.slice(0, 7),
    cycle_name: `Kỳ tháng ${String(month).padStart(2, '0')}/${year}`,
    start_date: startDate,
    end_date: endDate,
    registration_open_time: new Date(`${previousMonth.padStart(7, '0')}-17T00:00:00.000+07:00`),
    registration_closing_time: new Date(`${previousMonth.padStart(7, '0')}-23T23:59:59.999+07:00`),
    // OPEN cho phép nhận đăng ký theo cửa sổ thời gian; không có nghĩa mở ngay lập tức.
    status: 'OPEN'
  };
}

function cycleDto(cycle) {
  return {
    id: Number(cycle.cycle_id), code: cycle.cycle_code, name: cycle.cycle_name,
    startDate: cycle.start_date, endDate: cycle.end_date,
    registrationOpenTime: cycle.registration_open_time,
    registrationClosingTime: cycle.registration_closing_time, status: cycle.status
  };
}

async function listCycles() {
  const cycles = await RegistrationCycle.findAll({ order: [['start_date', 'DESC'], ['cycle_id', 'DESC']] });
  return { ok: true, items: cycles.map(cycleDto) };
}

async function createCycle(body) {
  const values = buildCycle(body);
  const monthStart = `${values.cycle_code}-01`;
  const monthEnd = `${values.cycle_code}-${new Date(Date.UTC(Number(values.end_date.slice(0, 4)), Number(values.end_date.slice(5, 7)), 0)).getUTCDate()}`;
  try {
    return await sequelize.transaction(async transaction => {
      // Khóa chung cho luồng tạo kỳ, kể cả khi bảng chưa có dòng nào để khóa.
      await sequelize.query('SELECT pg_advisory_xact_lock(20261117)', { transaction });
      const conflict = await RegistrationCycle.findOne({
        where: { [Op.or]: [
          { cycle_code: values.cycle_code },
          { end_date: { [Op.between]: [monthStart, monthEnd] } },
          { start_date: { [Op.lte]: values.end_date }, end_date: { [Op.gte]: values.start_date } }
        ] }, transaction
      });
      if (conflict) throw invalid(`Kỳ ${conflict.cycle_name} đã có trong tháng này hoặc chồng khoảng ngày đã chọn.`, 409);
      const cycle = await RegistrationCycle.create(values, { transaction });
      return { ok: true, message: 'Tạo kỳ đăng ký thành công.', data: cycleDto(cycle) };
    });
  } catch (error) {
    if (error instanceof UniqueConstraintError) throw invalid('Kỳ của tháng này đã tồn tại. Vui lòng làm mới danh sách.', 409);
    throw error;
  }
}

module.exports = { buildCycle, listCycles, createCycle };
