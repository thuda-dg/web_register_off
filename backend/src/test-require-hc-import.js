const { test, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const XLSX = require('xlsx');
const { Readable } = require('node:stream');
const { excelUpload } = require('./middleware/excel-upload.middleware');
const { sequelize, RegistrationCycle, Task, RequireHC } = require('./models');
const { parseExcel, importRequireHc, getImportCycles, MAX_BYTES } = require('./services/require-hc-import.service');
const { Op } = require('sequelize');
const originals = [];
function stub(object, key, fn) { originals.push([object, key, object[key]]); object[key] = fn; }
afterEach(() => { for (const [object, key, value] of originals.splice(0).reverse()) object[key] = value; });
function excel(data, type = 'xlsx', edit = () => {}) {
  const book = XLSX.utils.book_new(); const sheet = XLSX.utils.aoa_to_sheet(data);
  XLSX.utils.book_append_sheet(book, sheet, 'RequireHC'); edit(book, sheet);
  return { originalname: `data.${type}`, buffer: XLSX.write(book, { type: 'buffer', bookType: type === 'xls' ? 'biff8' : 'xlsx' }) };
}
const headers = ['working_date', 'task', 'max_off'];
for (const [now, expected] of [['2026-11-19T16:59:59.999Z', '2026-11-19'], ['2026-11-19T17:00:00.000Z', '2026-11-20']]) {
  test(`both import dropdowns filter cycles from Vietnam today ${expected} at ${now}`, async t => {
    t.mock.timers.enable({ apis: ['Date'], now: new Date(now).getTime() });
    stub(RegistrationCycle, 'findAll', async options => {
      assert.equal(options.where.start_date[Op.gte], expected);
      assert.deepEqual(options.order, [['start_date', 'DESC']]);
      return [{ cycle_id: 2, cycle_name: 'Kỳ thử', start_date: expected, end_date: expected, status: 'OPEN' }];
    });
    const result = await getImportCycles();
    assert.equal(result.items[0].startDate, expected);
    assert.equal(result.items[0].id, 2);
  });
}
const file = () => excel([headers, ['2026-11-17', 'MASS', 2], ['18/11/2026', 'KEY', 0]]);

async function multipart(filename) {
  const data = new FormData(); data.append('cycleId', '2'); data.append('mode', 'preview');
  data.append('file', new Blob([file().buffer]), filename);
  const request = new Request('http://localhost/test', { method: 'POST', body: data });
  const buffer = Buffer.from(await request.arrayBuffer());
  const req = Readable.from([buffer]);
  req.headers = { 'content-type': request.headers.get('content-type'), 'content-length': String(buffer.length) };
  return new Promise((resolve, reject) => {
    const res = { status(code) { this.code = code; return this; }, json(body) { resolve({ status: this.code, body }); } };
    excelUpload(req, res, error => error ? reject(error) : resolve({ status: 200, file: req.file, body: req.body }));
  });
}

test('multipart upload accepts two fields plus one Excel file without parts-limit rejection', async () => {
  const result = await multipart('data.xlsx');
  assert.equal(result.status, 200); assert.equal(result.body.cycleId, '2'); assert.equal(result.body.mode, 'preview');
  assert.equal(parseExcel(result.file).length, 2);
});

test('multipart upload rejects non-Excel filename', async () => {
  const result = await multipart('data.csv'); assert.equal(result.status, 400);
});

test('reads genuine xlsx/xls with exactly three headers and accepts date cells/string dates', () => {
  for (const type of ['xlsx', 'xls']) {
    const rows = parseExcel(excel([headers, [new Date('2026-11-17T00:00:00Z'), ' mass ', 2], ['18/11/2026', 'KEY', '0']], type));
    assert.equal(rows[0].workingDate, '2026-11-17'); assert.equal(rows[0].task, 'MASS');
    assert.equal(rows[1].maxOff, 0);
  }
});

test('supports reordered headers and ignores completely blank rows', () => {
  const rows = parseExcel(excel([['max_off', 'task', 'working_date'], [3, 'KEY', '2026-11-18'], [], [2, 'MASS', '2026-11-19']]));
  assert.equal(rows.length, 2); assert.equal(rows[1].row, 4);
});

test('rejects CSV renamed to Excel, other extensions, missing files and oversized files', () => {
  for (const value of [null, { originalname: 'fake.xlsx', buffer: Buffer.from('working_date,task,max_off\n2026-11-17,MASS,2') },
    { ...file(), originalname: 'data.csv' }, { ...file(), originalname: 'data.xlsm' },
    { originalname: 'big.xlsx', buffer: Buffer.alloc(MAX_BYTES + 1) }]) {
    assert.throws(() => parseExcel(value), { code: 'INVALID_REQUIRE_HC_IMPORT' });
  }
});

test('rejects bad headers, empty data, invalid dates, unknown task and invalid max_off', () => {
  for (const data of [[['date', 'task', 'max_off'], ['2026-11-17', 'MASS', 2]], [headers],
    [headers, ['2026-02-30', 'MASS', 2]], [headers, ['2026-11-17', 'OTHER', 2]],
    [headers, ['2026-11-17', 'MASS', -1]], [headers, ['2026-11-17', 'MASS', 1.5]],
    [headers, ['2026-11-17', 'MASS', '']], [headers, ['2026-11-17', 'MASS', true]]]) {
    assert.throws(() => parseExcel(excel(data)), { statusCode: 400 });
  }
});

test('rejects duplicate dates/tasks and formula cells with row-level errors', () => {
  assert.throws(() => parseExcel(excel([headers, ['2026-11-17', 'MASS', 2], ['2026-11-17', 'mass', 3]])), error => error.errors[0].row === 3);
  assert.throws(() => parseExcel(excel([headers, ['2026-11-17', 'MASS', 2]], 'xlsx', (_book, sheet) => { sheet.C2.f = '1+1'; })), error => error.errors[0].row === 2);
});

test('supports 1904 workbook dates and rejects the fictional Excel leap day', () => {
  assert.equal(parseExcel(excel([headers, [0, 'MASS', 2]], 'xlsx', book => { book.Workbook = { WBProps: { date1904: true } }; }))[0].workingDate, '1904-01-01');
  assert.throws(() => parseExcel(excel([headers, [60, 'MASS', 2]])), { statusCode: 400 });
});

function database() {
  const state = { writes: [], committed: false, rolledBack: false }; const transaction = { LOCK: { UPDATE: 'UPDATE' } };
  stub(RegistrationCycle, 'findByPk', async (_id, options) => {
    if (options.transaction) assert.equal(options.lock, 'UPDATE');
    return { start_date: '2026-11-13', end_date: '2026-11-20' };
  });
  stub(Task, 'findAll', async () => [{ task_code: 'MASS', task_id: 1 }, { task_code: 'KEY', task_id: 2 }]);
  stub(RequireHC, 'bulkCreate', async (rows, options) => {
    assert.equal(options.transaction, transaction);
    assert.deepEqual(options.conflictAttributes, ['cycle_id', 'working_date', 'task_id']);
    assert.deepEqual(options.updateOnDuplicate, ['max_off', 'updated_at']); state.writes.push(rows);
  });
  stub(sequelize, 'transaction', async callback => {
    try { const result = await callback(transaction); state.committed = true; return result; }
    catch (error) { state.rolledBack = true; throw error; }
  });
  return state;
}

test('preview resolves MASS=1/KEY=2 and validates without writing or opening a transaction', async () => {
  const state = database();
  stub(sequelize, 'transaction', async () => assert.fail('preview must not open write transaction'));
  const result = await importRequireHc({ file: file(), cycleId: '2', mode: 'preview' });
  assert.equal(result.data.rowCount, 2); assert.deepEqual(result.data.rows.map(row => row.taskId), [1, 2]);
  assert.equal(state.writes.length, 0);
});

test('imports/upserts in one transaction without deleting other dates or cycles', async () => {
  const state = database();
  const result = await importRequireHc({ file: file(), cycleId: '2', mode: 'import' });
  assert.equal(result.data.imported, 2); assert.equal(state.committed, true);
  assert.deepEqual(state.writes[0], [
    { cycle_id: 2, working_date: '2026-11-17', task_id: 1, max_off: 2 },
    { cycle_id: 2, working_date: '2026-11-18', task_id: 2, max_off: 0 }
  ]);
});

test('invalid cycle, out-of-period date and missing/inactive task cause no partial writes', async () => {
  const state = database();
  for (const id of [0, 'bad']) await assert.rejects(importRequireHc({ file: file(), cycleId: id, mode: 'import' }), { statusCode: 400 });
  await assert.rejects(importRequireHc({ file: excel([headers, ['2026-12-01', 'MASS', 2]]), cycleId: 2, mode: 'import' }), error => error.errors[0].row === 2);
  stub(Task, 'findAll', async () => [{ task_code: 'MASS', task_id: 1 }]);
  await assert.rejects(importRequireHc({ file: file(), cycleId: 2, mode: 'import' }), error => error.errors[0].message.includes('KEY'));
  stub(RegistrationCycle, 'findByPk', async () => null);
  await assert.rejects(importRequireHc({ file: file(), cycleId: 999, mode: 'import' }), { statusCode: 400 });
  assert.equal(state.writes.length, 0);
});

test('database failure rolls back the entire import', async () => {
  const state = database(); stub(RequireHC, 'bulkCreate', async () => { throw new Error('DB failed'); });
  await assert.rejects(importRequireHc({ file: file(), cycleId: 2, mode: 'import' }), /DB failed/);
  assert.equal(state.committed, false); assert.equal(state.rolledBack, true);
});
