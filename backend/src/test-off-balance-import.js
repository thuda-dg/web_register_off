const { test, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const XLSX = require('xlsx');
const { Op } = require('sequelize');
const { sequelize, RegistrationCycle, Employee, EmployeeCycleOff } = require('./models');
const { parseExcel, importOffBalance, MAX_BYTES } = require('./services/off-balance-import.service');
const originals = [];
function stub(object, key, fn) { originals.push([object, key, object[key]]); object[key] = fn; }
afterEach(() => { for (const [object, key, value] of originals.splice(0).reverse()) object[key] = value; });
const headers = ['employee_code', 'entitled_quantity', 'adjusted_quantity'];
function excel(rows, type = 'xlsx', edit = () => {}) {
  const book = XLSX.utils.book_new(), sheet = XLSX.utils.aoa_to_sheet(rows);
  XLSX.utils.book_append_sheet(book, sheet, 'OFF'); edit(sheet);
  return { originalname: `data.${type}`, buffer: XLSX.write(book, { type: 'buffer', bookType: type === 'xls' ? 'biff8' : 'xlsx' }) };
}
const file = () => excel([headers, ['NV003', 4, -0.5], ['NV004', 0, 0]]);

test('reads real xlsx/xls, supports negative adjustment, decimals, zero and reordered headers', () => {
  for (const type of ['xlsx', 'xls']) {
    const rows = parseExcel(excel([headers, ['NV003', 4, -0.5], ['NV004', '0', 0]], type));
    assert.equal(rows[0].employeeCode, 'NV003'); assert.equal(rows[0].adjustedQuantity, -0.5); assert.equal(rows[1].entitledQuantity, 0);
  }
  assert.equal(parseExcel(excel([['adjusted_quantity', 'employee_code', 'entitled_quantity'], [0, 'NV003', 4]]))[0].employeeCode, 'NV003');
});

test('rejects missing/fake files, CSV and oversized Excel', () => {
  for (const value of [null, { originalname: 'fake.xlsx', buffer: Buffer.from('employee_code,entitled_quantity,adjusted_quantity') },
    { ...file(), originalname: 'data.csv' }, { originalname: 'big.xlsx', buffer: Buffer.alloc(MAX_BYTES + 1) }]) {
    assert.throws(() => parseExcel(value), { code: 'INVALID_OFF_BALANCE_IMPORT' });
  }
});

test('preserves leading zeroes, trims codes, rejects duplicate trimmed codes and old ID header', () => {
  const rows = parseExcel(excel([headers, [' 0003 ', 4, 0]]));
  assert.equal(rows[0].employeeCode, '0003');
  for (const values of [[headers, ['NV003', 4, 0], [' NV003 ', 4, 0]],
    [headers, [3, 4, 0]], [['employee_id', 'entitled_quantity', 'adjusted_quantity'], [3, 4, 0]]]) {
    assert.throws(() => parseExcel(excel(values)), { statusCode: 400 });
  }
});

test('rejects duplicate ids, invalid ids, blank/negative entitlement, precision/overflow and negative total', () => {
  for (const rows of [[headers, ['NV003', 4, 0], ['NV003', 4, 1]], [headers, [0, 4, 0]], [headers, [true, 4, 0]],
    [headers, ['NV003', -1, 0]], [headers, ['NV003', null, 0]], [headers, ['NV003', 4, null]],
    [headers, ['NV003', 4.001, 0]], [headers, ['NV003', 10000, 0]], [headers, ['NV003', 1, -2]], [headers]]) {
    assert.throws(() => parseExcel(excel(rows)), { statusCode: 400 });
  }
});

test('rejects formulas and extra headers with actionable errors', () => {
  assert.throws(() => parseExcel(excel([headers, ['NV003', 4, 0]], 'xlsx', sheet => { sheet.B2.f = '2+2'; })), error => error.errors[0].row === 2);
  assert.throws(() => parseExcel(excel([[...headers, 'extra'], ['NV003', 4, 0, 'x']])), { statusCode: 400 });
});

function database() {
  const state = { writes: [], committed: false, rolledBack: false, locked: false };
  const transaction = { LOCK: { UPDATE: 'UPDATE' } };
  stub(sequelize, 'transaction', async callback => {
    try { const result = await callback(transaction); state.committed = true; return result; }
    catch (error) { state.rolledBack = true; state.writes = []; throw error; }
  });
  stub(RegistrationCycle, 'findByPk', async () => ({ cycle_id: 2 }));
  stub(Employee, 'findAll', async options => {
    assert.deepEqual(options.where.emp_code[Op.in], ['NV003', 'NV004']);
    assert.equal(options.where.is_active, true); assert.deepEqual(options.order, [['emp_id', 'ASC']]);
    if (options.transaction) { assert.equal(options.transaction, transaction); assert.equal(options.lock, 'UPDATE'); state.locked = true; }
    return [3, 4].map(emp_id => ({ emp_id, emp_code: `NV00${emp_id}`, emp_name: 'Nhân viên' }));
  });
  stub(EmployeeCycleOff, 'bulkCreate', async (rows, options) => {
    assert.equal(state.locked, true); assert.equal(options.transaction, transaction);
    assert.deepEqual(options.conflictAttributes, ['emp_id', 'cycle_id']);
    assert.deepEqual(options.updateOnDuplicate, ['entitled_quantity', 'adjusted_quantity', 'updated_at']); state.writes.push(rows);
  });
  return state;
}

test('preview maps employee_code to existing employees without transactions or writes', async () => {
  const state = database(); const result = await importOffBalance({ file: file(), cycleId: '2', mode: 'preview' });
  assert.equal(result.data.rowCount, 2); assert.equal(result.data.rows[0].employeeCode, 'NV003');
  assert.equal(result.data.rows[0].employeeId, 3);
  assert.equal(state.committed, false); assert.equal(state.writes.length, 0); assert.equal(state.locked, false);
});

test('upserts only the selected cycle/employees in one transaction, replacing rather than adding balances', async () => {
  const state = database(); const result = await importOffBalance({ file: file(), cycleId: 2, mode: 'import' });
  assert.equal(result.data.imported, 2); assert.equal(state.committed, true);
  assert.deepEqual(state.writes[0], [
    { emp_id: 3, cycle_id: 2, entitled_quantity: 4, adjusted_quantity: -0.5 },
    { emp_id: 4, cycle_id: 2, entitled_quantity: 0, adjusted_quantity: 0 }
  ]);
});

test('missing/inactive employees or nonexistent cycles prevent all writes', async () => {
  const state = database(); stub(Employee, 'findAll', async () => []);
  await assert.rejects(importOffBalance({ file: file(), cycleId: 2, mode: 'import' }), error => error.errors.length === 2);
  stub(RegistrationCycle, 'findByPk', async () => null);
  await assert.rejects(importOffBalance({ file: file(), cycleId: 2, mode: 'preview' }), { statusCode: 400 });
  assert.equal(state.writes.length, 0);
});

test('persistence errors roll back the whole import and invalid cycle/mode never writes', async () => {
  const state = database(); stub(EmployeeCycleOff, 'bulkCreate', async () => { throw new Error('write failed'); });
  await assert.rejects(importOffBalance({ file: file(), cycleId: 2, mode: 'import' }), /write failed/);
  assert.equal(state.rolledBack, true);
  for (const [cycleId, mode] of [[true, 'import'], [0, 'preview'], ['bad', 'preview'], [2, 'bad']]) {
    await assert.rejects(importOffBalance({ file: file(), cycleId, mode }), { statusCode: 400 });
  }
});
