const path = require('node:path');
const XLSX = require('xlsx');
const { Op } = require('sequelize');
const { sequelize, RegistrationCycle, Employee, EmployeeCycleOff } = require('../models');
const MAX_ROWS = 10000;
const MAX_BYTES = 5 * 1024 * 1024;
const invalid = (message, errors = []) => Object.assign(new Error(message), {
  statusCode: 400, code: 'INVALID_OFF_BALANCE_IMPORT', errors: errors.slice(0, 100)
});

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
  const required = ['employee_code', 'entitled_quantity', 'adjusted_quantity'];
  if (headers.filter(Boolean).length !== 3 || required.some(header => headers.filter(value => value === header).length !== 1)) {
    throw invalid('Dòng đầu phải có đúng 3 cột: employee_code, entitled_quantity, adjusted_quantity (có thể đổi thứ tự cột).');
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
    const employeeCode = typeof cells[indexes[0]] === 'string' ? cells[indexes[0]].trim() : '';
    const quantity = value => {
      if (typeof value !== 'number' && typeof value !== 'string') return null;
      const text = String(value).trim();
      if (!/^-?\d+(?:\.\d{1,2})?$/.test(text)) return null;
      const number = Number(text);
      return Number.isFinite(number) && Math.abs(number) <= 9999.99 ? number : null;
    };
    const entitled = quantity(cells[indexes[1]]), adjusted = quantity(cells[indexes[2]]);
    if (!employeeCode || employeeCode.length > 50) errors.push({ row, message: 'employee_code phải là mã nhân viên dạng Text, từ 1 đến 50 ký tự. Định dạng ô Excel là Text để giữ số 0 đầu.' });
    if (entitled == null || entitled < 0) errors.push({ row, message: 'entitled_quantity phải không âm, tối đa 9999.99 và 2 chữ số thập phân.' });
    if (adjusted == null) errors.push({ row, message: 'adjusted_quantity phải trong khoảng -9999.99 đến 9999.99, tối đa 2 chữ số thập phân.' });
    if (entitled != null && adjusted != null && Math.round(entitled * 100) + Math.round(adjusted * 100) < 0) errors.push({ row, message: 'Tổng entitled_quantity và adjusted_quantity không được âm.' });
    if (seen.has(employeeCode)) errors.push({ row, message: 'Trùng employee_code trong file.' });
    seen.add(employeeCode);
    rows.push({ row, employeeCode, entitledQuantity: entitled, adjustedQuantity: adjusted });
  }
  if (errors.length) throw invalid('File có dữ liệu không hợp lệ. Chưa nhập dòng nào.', errors);
  if (!rows.length) throw invalid('File không có dòng dữ liệu để nhập.');
  return rows;
}


async function importOffBalance({ file, cycleId, mode }) {
  const id = typeof cycleId === 'string' && /^\d+$/.test(cycleId) ? Number(cycleId) : cycleId;
  if (!Number.isSafeInteger(id) || id <= 0 || !['preview', 'import'].includes(mode)) throw invalid('Kỳ hoặc thao tác import không hợp lệ.');
  const rows = parseExcel(file);
  const process = async transaction => {
    const cycle = await RegistrationCycle.findByPk(id, { transaction });
    if (!cycle) throw invalid('Kỳ đăng ký không tồn tại.');
    // Cùng thứ tự khóa employee với submit/duyệt/công bố, không ghi DB trong preview.
    const employees = await Employee.findAll({
      where: { emp_code: { [Op.in]: rows.map(row => row.employeeCode) }, is_active: true },
      attributes: ['emp_id', 'emp_code', 'emp_name'], order: [['emp_id', 'ASC']], transaction,
      ...(transaction ? { lock: transaction.LOCK.UPDATE } : {})
    });
    const byCode = new Map(employees.map(employee => [employee.emp_code, employee]));
    const errors = rows.filter(row => !byCode.has(row.employeeCode)).map(row => ({ row: row.row, message: 'employee_code không tồn tại hoặc nhân viên đã ngừng hoạt động.' }));
    if (errors.length) throw invalid('File có nhân viên không hợp lệ. Chưa nhập dòng nào.', errors);
    if (mode === 'preview') return { ok: true, data: { cycleId: id, rowCount: rows.length,
      rows: rows.slice(0, 100).map(row => ({ ...row, employeeId: Number(byCode.get(row.employeeCode).emp_id), employeeName: byCode.get(row.employeeCode).emp_name })) } };
    const values = rows.map(row => ({ emp_id: Number(byCode.get(row.employeeCode).emp_id), cycle_id: id,
      entitled_quantity: row.entitledQuantity, adjusted_quantity: row.adjustedQuantity })).sort((a,b) => a.emp_id - b.emp_id);
    await EmployeeCycleOff.bulkCreate(values, { transaction, conflictAttributes: ['emp_id', 'cycle_id'],
      updateOnDuplicate: ['entitled_quantity', 'adjusted_quantity', 'updated_at'], validate: true });
    return { ok: true, message: 'Đã nhập ' + rows.length + ' dòng số dư OFF.', data: { cycleId: id, imported: rows.length } };
  };
  return mode === 'preview' ? process(null) : sequelize.transaction(process);
}
module.exports = { parseExcel, importOffBalance, MAX_BYTES };
