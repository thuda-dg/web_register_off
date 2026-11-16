const { test, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const { Op, UniqueConstraintError } = require('sequelize');
process.env.AUTH_TOKEN_SECRET ||= 'registration-cycle-test-secret';
const models = require('./models');
const { buildCycle, createCycle, listCycles } = require('./services/admin-registration-cycle.service');
const { selectRegistrationCycle } = require('./services/registration-cycle-selection.service');
const { createAccessToken } = require('./utils/auth.util');
const router = require('./routes/admin.routes');
const originals = [];
function stub(object, key, fn) { originals.push([object, key, object[key]]); object[key] = fn; }
afterEach(() => { for (const [object, key, value] of originals.splice(0).reverse()) object[key] = value; });
const body = { startDate: '2026-11-01', endDate: '2026-11-30' };

test('November period opens October 17 midnight through October 23 inclusive in UTC+7', () => {
  const cycle = buildCycle(body);
  assert.equal(cycle.cycle_code, '2026-11'); assert.equal(cycle.cycle_name, 'Kỳ tháng 11/2026');
  assert.equal(cycle.registration_open_time.toISOString(), '2026-10-16T17:00:00.000Z');
  assert.equal(cycle.registration_closing_time.toISOString(), '2026-10-23T16:59:59.999Z');
  assert.equal(cycle.status, 'OPEN');
});

test('January rolls back to December of previous year; end month identifies cross-month periods', () => {
  const january = buildCycle({ startDate: '2026-12-26', endDate: '2027-01-25' });
  assert.equal(january.cycle_code, '2027-01');
  assert.equal(january.registration_open_time.toISOString(), '2026-12-16T17:00:00.000Z');
  assert.equal(january.registration_closing_time.toISOString(), '2026-12-23T16:59:59.999Z');
  assert.equal(buildCycle({ startDate: '2028-02-29', endDate: '2028-02-29' }).end_date, '2028-02-29');
});

test('rejects missing/impossible/non-ISO dates and reversed intervals before reaching DB', async () => {
  stub(models.sequelize, 'transaction', () => assert.fail('invalid dates must not reach DB'));
  for (const invalid of [null, {}, [], { ...body, startDate: '2026-02-29' }, { ...body, endDate: '2026-11-31' },
    { ...body, startDate: '01/11/2026' }, { ...body, endDate: '2026-11-01T00:00:00Z' },
    { ...body, startDate: '2026-12-01' }, { ...body, endDate: 123 }]) {
    await assert.rejects(createCycle(invalid), { statusCode: 400, code: 'INVALID_REGISTRATION_CYCLE' });
  }
});

function database(existing = []) {
  const state = { writes: [], committed: false, rolledBack: false, locked: false };
  const transaction = {};
  stub(models.sequelize, 'transaction', async callback => {
    try { const result = await callback(transaction); state.committed = true; return result; }
    catch (error) { state.rolledBack = true; throw error; }
  });
  stub(models.sequelize, 'query', async (_sql, options) => {
    assert.equal(options.transaction, transaction); state.locked = true;
  });
  stub(models.RegistrationCycle, 'findOne', async options => {
    assert.equal(state.locked, true); assert.equal(options.transaction, transaction);
    const [code, month, overlap] = options.where[Op.or];
    return existing.find(row => row.cycle_code === code.cycle_code ||
      (row.end_date >= month.end_date[Op.between][0] && row.end_date <= month.end_date[Op.between][1]) ||
      (row.start_date <= overlap.start_date[Op.lte] && row.end_date >= overlap.end_date[Op.gte]));
  });
  stub(models.RegistrationCycle, 'create', async (values, options) => {
    assert.equal(options.transaction, transaction); state.writes.push(values);
    return { ...values, cycle_id: 7 };
  });
  return state;
}

test('creates generated fields in one locked transaction and ignores client-supplied schedule/status', async () => {
  const state = database();
  const result = await createCycle({ ...body, cycle_code: 'fake', status: 'DRAFT', registration_open_time: 'fake' });
  assert.equal(result.data.id, 7); assert.equal(result.data.code, '2026-11'); assert.equal(result.data.status, 'OPEN');
  assert.equal(state.writes.length, 1); assert.equal(state.committed, true);
  assert.equal(state.writes[0].start_date, '2026-11-01');
});

test('rejects duplicate month even for legacy codes and rejects inclusive overlap across month boundary', async () => {
  const existing = [{ cycle_code: 'legacy', cycle_name: 'Kỳ cũ', start_date: '2026-11-12', end_date: '2026-11-20' }];
  const state = database(existing);
  await assert.rejects(createCycle({ startDate: '2026-11-21', endDate: '2026-11-30' }), { statusCode: 409 });
  await assert.rejects(createCycle({ startDate: '2026-11-20', endDate: '2026-12-25' }), { statusCode: 409 });
  assert.equal(state.writes.length, 0); assert.equal(state.rolledBack, true);
  await createCycle({ startDate: '2026-11-21', endDate: '2026-12-25' });
  assert.equal(state.writes.length, 1);
});

test('rolls back on persistence errors and returns conflict for unique-code violations', async () => {
  const state = database();
  stub(models.RegistrationCycle, 'create', async () => { throw new UniqueConstraintError({ message: 'duplicate' }); });
  await assert.rejects(createCycle(body), { statusCode: 409 });
  assert.equal(state.rolledBack, true); assert.equal(state.committed, false);
});

test('list returns full period/window DTO from existing records', async () => {
  stub(models.RegistrationCycle, 'findAll', async () => [{ ...buildCycle(body), cycle_id: '7' }]);
  const result = await listCycles();
  assert.equal(result.items[0].id, 7); assert.equal(result.items[0].startDate, '2026-11-01');
  assert.ok(result.items[0].registrationClosingTime);
});

function selectableCycles() {
  const cycles = [
    { ...buildCycle(body), cycle_id: 1 },
    { ...buildCycle({ startDate: '2026-12-01', endDate: '2026-12-31' }), cycle_id: 2 },
    { ...buildCycle({ startDate: '2027-01-01', endDate: '2027-01-31' }), cycle_id: 3, status: 'DRAFT' }
  ];
  stub(models.RegistrationCycle, 'findOne', async ({ where = {}, order }) => {
    const rows = cycles.filter(cycle => Object.entries(where).every(([field, expected]) => {
      if (typeof expected === 'string') return cycle[field] === expected;
      return Reflect.ownKeys(expected).every(op => op === Op.lte ? cycle[field] <= expected[op] :
        op === Op.gte ? cycle[field] >= expected[op] : cycle[field] > expected[op]);
    }));
    rows.sort((a, b) => {
      for (const [field, direction] of order) {
        const comparison = a[field] < b[field] ? -1 : a[field] > b[field] ? 1 : 0;
        if (comparison) return direction === 'ASC' ? comparison : -comparison;
      }
      return 0;
    });
    return rows[0] || null;
  });
  return cycles;
}

test('creating future OPEN cycles does not hide the cycle currently accepting registrations', async () => {
  selectableCycles();
  for (const now of ['2026-10-17T00:00:00+07:00', '2026-10-20T12:00:00+07:00', '2026-10-23T23:59:59.999+07:00']) {
    assert.equal((await selectRegistrationCycle(false, new Date(now))).cycle_id, 1);
  }
  assert.equal((await selectRegistrationCycle(false, new Date('2026-11-17T00:00:00+07:00'))).cycle_id, 2);
});

test('outside window chooses nearest upcoming OPEN cycle then most recent OPEN, excluding DRAFT', async () => {
  selectableCycles();
  assert.equal((await selectRegistrationCycle(false, new Date('2026-10-16T23:59:59.999+07:00'))).cycle_id, 1);
  assert.equal((await selectRegistrationCycle(false, new Date('2026-10-24T00:00:00+07:00'))).cycle_id, 2);
  assert.equal((await selectRegistrationCycle(false, new Date('2026-12-24T00:00:00+07:00'))).cycle_id, 2);
  assert.equal((await selectRegistrationCycle(true)).cycle_id, 3);
});

async function request(method, token, body) {
  const url = '/admin/registration-cycles';
  const req = { method, url, originalUrl: url, body, header: () => token ? `Bearer ${token}` : undefined };
  return new Promise((resolve, reject) => {
    const res = { status(code) { this.statusCode = code; return this; }, json(body) { resolve({ status: this.statusCode || 200, body }); } };
    router.handle(req, res, error => error ? reject(error) : reject(new Error('No matching route')));
  });
}

test('both cycle endpoints require login and current ADMIN from DB, not just JWT roles', async () => {
  stub(console, 'log', () => {}); // Auth middleware hiện có log token; không in trong test.
  const { token } = createAccessToken({ sub: 3, empId: 3, roles: ['ADMIN'] });
  let role = 'TEAM_LEAD';
  stub(models.UserAccount, 'findByPk', async () => ({ emp_id: 3, account_status: 'ACTIVE', getRoles: async () => [{ role_code: role }] }));
  stub(models.Employee, 'findByPk', async () => ({ is_active: true }));
  stub(models.RegistrationCycle, 'findAll', async () => []);
  for (const method of ['GET', 'POST']) {
    assert.equal((await request(method)).status, 401);
    assert.equal((await request(method, token, body)).status, 403);
  }
  role = 'ADMIN';
  assert.equal((await request('GET', token)).status, 200);
  database();
  assert.equal((await request('POST', token, body)).status, 201);
});
