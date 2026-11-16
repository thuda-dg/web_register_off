const path = require('node:path');
const XLSX = require('xlsx');
const { Op } = require('sequelize');
const { sequelize, RegistrationCycle, Task, RequireHC } = require('../models');
const MAX_ROWS = 10000;
const MAX_BYTES = 5 * 1024 * 1024;
const invalid = (message, errors = []) => Object.assign(new Error(message), {
  statusCode: 400, code: 'INVALID_REQUIRE_HC_IMPORT', errors: errors.slice(0, 100)
});

function isoDate(value, date1904) {
  let result;
  if (typeof value === 'number' && Number.isFinite(value)) {
    const date = XLSX.SSF.parse_date_code(value, { date1904 });
    if (date) result = `${String(date.y).padStart(4, '0')}-${String(date.m).padStart(2, '0')}-${String(date.d).padStart(2, '0')}`;
  } else if (typeof value === 'string') {
    const text = value.trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(text)) result = text;
    const match = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(text);
    if (match) result = `${match[3]}-${match[2]}-${match[1]}`;
  }
  if (!result || !/^\d{4}-\d{2}-\d{2}$/.test(result)) return null;
  const parsed = new Date(`${result}T00:00:00Z`);
  return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === result ? result : null;
}

function parseExcel(file) {
  if (!file?.buffer?.length) throw invalid('Vui lòng chọn file Excel.');
  if (file.buffer.length > MAX_BYTES) throw invalid('File Excel tối đa 5 MB.');
  const extension = path.extname(file.originalname || '').toLowerCase();
  const zip = file.buffer.subarray(0, 4).equals(Buffer.from([0x50, 0x4b, 0x03, 0x04]));
  const ole = file.buffer.subarray(0, 8).equals(Buffer.from([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1]));
  if (!(extension === '.xlsx' && zip) && !(extension === '.xls' && ole)) {
    throw invalid('Chỉ nhận Excel .xlsx hoặc .xls đúng định dạng; không nhận CSV hoặc file đổi đuôi.');
  }
  let workbook;
  try {
    workbook = XLSX.read(file.buffer, { type: 'buffer', cellDates: false, cellFormula: true, sheetRows: MAX_ROWS + 2, sheets: 0, bookFiles: true });
  } catch { throw invalid('Không đọc được file Excel. File có thể bị lỗi hoặc được bảo vệ bằng mật khẩu.'); }
  if (zip && !workbook.keys?.includes('xl/workbook.xml')) throw invalid('File không phải workbook Excel .xlsx hợp lệ.');
  const sheet = workbook.Sheets?.[workbook.SheetNames?.[0]];
  if (!sheet?.['!ref']) throw invalid('Sheet đầu tiên không có dữ liệu.');
  const range = XLSX.utils.decode_range(sheet['!fullref'] || sheet['!ref']);
  if (range.e.r > MAX_ROWS || range.e.c > 31) throw invalid('File vượt giới hạn 10.000 dòng dữ liệu hoặc có quá nhiều cột.');
  const grid = XLSX.utils.sheet_to_json(sheet, { header: 1, raw: true, defval: null, blankrows: true,
    range: { s: { r: 0, c: 0 }, e: range.e } });
  const headers = (grid[0] || []).map(value => String(value ?? '').trim().toLowerCase());
  const required = ['working_date', 'task', 'max_off'];
  if (headers.filter(Boolean).length !== 3 || required.some(header => headers.filter(value => value === header).length !== 1)) {
    throw invalid('Dòng đầu phải có đúng 3 cột: working_date, task, max_off (có thể đổi thứ tự cột).');
  }
  const indexes = required.map(header => headers.indexOf(header));
  const rows = [], errors = [], seen = new Set();
  for (let i = 1; i < grid.length; i++) {
    const cells = grid[i];
    if (cells.every(value => value == null || String(value).trim() === '')) continue;
    const row = i + 1;
    if (cells.some((value, column) => value != null && String(value).trim() && !indexes.includes(column))) {
      errors.push({ row, message: 'Có dữ liệu ngoài 3 cột được hỗ trợ.' }); continue;
    }
    if (indexes.some(column => sheet[XLSX.utils.encode_cell({ r: i, c: column })]?.f)) {
      errors.push({ row, message: 'Không dùng công thức; hãy dán giá trị trước khi import.' }); continue;
    }
    const date = isoDate(cells[indexes[0]], Boolean(workbook.Workbook?.WBProps?.date1904));
    const task = typeof cells[indexes[1]] === 'string' ? cells[indexes[1]].trim().toUpperCase() : '';
    const value = cells[indexes[2]];
    const maxOff = typeof value === 'number' ? value : typeof value === 'string' && /^\d+$/.test(value.trim()) ? Number(value.trim()) : NaN;
    if (!date) errors.push({ row, message: 'working_date phải là ngày Excel hoặc YYYY-MM-DD / DD/MM/YYYY hợp lệ.' });
    if (!['MASS', 'KEY'].includes(task)) errors.push({ row, message: 'task chỉ nhận MASS hoặc KEY.' });
    if (!Number.isSafeInteger(maxOff) || maxOff < 0 || maxOff > 2147483647) errors.push({ row, message: 'max_off phải là số nguyên không âm trong phạm vi INTEGER.' });
    const key = `${date}:${task}`;
    if (seen.has(key)) errors.push({ row, message: `Trùng working_date và task trong file (${date}, ${task}).` });
    seen.add(key);
    rows.push({ row, workingDate: date, task, maxOff });
  }
  if (errors.length) throw invalid('File có dữ liệu không hợp lệ. Chưa nhập dòng nào.', errors);
  if (!rows.length) throw invalid('File không có dòng dữ liệu để nhập.');
  return rows;
}

async function getImportCycles() {
  const cycles = await RegistrationCycle.findAll({ attributes: ['cycle_id', 'cycle_name', 'start_date', 'end_date', 'status'], order: [['start_date', 'DESC']] });
  return { ok: true, items: cycles.map(cycle => ({ id: Number(cycle.cycle_id), name: cycle.cycle_name,
    startDate: cycle.start_date, endDate: cycle.end_date, status: cycle.status })) };
}

async function importRequireHc({ file, cycleId, mode }) {
  const id = Number(cycleId);
  if (!Number.isSafeInteger(id) || id <= 0 || !['preview', 'import'].includes(mode)) throw invalid('Kỳ hoặc thao tác import không hợp lệ.');
  const rows = parseExcel(file);
  const process = async transaction => {
    const cycle = await RegistrationCycle.findByPk(id, { transaction,
      ...(transaction ? { lock: transaction.LOCK.UPDATE } : {}) });
    if (!cycle) throw invalid('Kỳ đăng ký không tồn tại.');
    const tasks = await Task.findAll({ where: { task_code: { [Op.in]: ['MASS', 'KEY'] }, is_active: true }, transaction });
    const taskIds = new Map(tasks.map(task => [task.task_code, Number(task.task_id)]));
    const errors = [];
    for (const row of rows) {
      if (row.workingDate < cycle.start_date || row.workingDate > cycle.end_date) errors.push({ row: row.row, message: `Ngày phải nằm trong kỳ ${cycle.start_date} đến ${cycle.end_date}.` });
      if (!taskIds.has(row.task)) errors.push({ row: row.row, message: `Task ${row.task} không tồn tại hoặc đã ngừng hoạt động trong bảng tasks.` });
    }
    if (errors.length) throw invalid('File không phù hợp với kỳ/task. Chưa nhập dòng nào.', errors);
    const normalized = rows.map(row => ({ ...row, taskId: taskIds.get(row.task) }));
    if (mode === 'preview') return { ok: true, data: { cycleId: id, rowCount: rows.length, rows: normalized.slice(0, 100) } };
    const values = normalized.map(row => ({ cycle_id: id, working_date: row.workingDate, task_id: row.taskId, max_off: row.maxOff }))
      .sort((a, b) => a.working_date.localeCompare(b.working_date) || a.task_id - b.task_id);
    await RequireHC.bulkCreate(values, { transaction, conflictAttributes: ['cycle_id', 'working_date', 'task_id'],
      updateOnDuplicate: ['max_off', 'updated_at'], validate: true });
    return { ok: true, message: `Đã nhập ${rows.length} dòng RequireHC.`, data: { cycleId: id, imported: rows.length } };
  };
  return mode === 'preview' ? process(null) : sequelize.transaction(process);
}

module.exports = { parseExcel, importRequireHc, getImportCycles, MAX_BYTES };
