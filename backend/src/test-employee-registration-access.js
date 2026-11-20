const { test, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const { Op } = require('sequelize');
const models = require('./models');
const { requireEmployeeRegistration } = require('./middleware/employee-registration.middleware');
const originals = [];
function stub(obj, key, fn) { originals.push([obj, key, obj[key]]); obj[key] = fn; }
afterEach(() => { for (const [obj, key, value] of originals.splice(0).reverse()) obj[key] = value; });
function setup() {
  const state = { roles: ['EMPLOYEE'], accountStatus: 'ACTIVE', active: true };
  stub(models.UserAccount, 'findByPk', async () => ({ emp_id: 3, account_status: state.accountStatus,
    getRoles: async options => {
      assert.equal(options.where.is_active, true); assert.ok(options.through.where.start_date[Op.lte]);
      assert.ok(options.through.where[Op.or]); return state.roles.map(role_code => ({ role_code }));
    } }));
  stub(models.Employee, 'findByPk', async () => ({ is_active: state.active }));
  return state;
}
async function check(empId = 3) {
  const req = { user: { sub: 7, empId, roles: ['EMPLOYEE', 'ADMIN'] } };
  const result = { next: false };
  const res = { status(status) { result.status = status; return this; }, json(body) { result.body = body; } };
  await requireEmployeeRegistration(req, res, error => { if (error) throw error; result.next = true; });
  return { ...result, req };
}
test('only a currently granted EMPLOYEE can register; JWT role does not override DB', async () => {
  const state = setup();
  for (const roles of [['ADMIN'], ['TEAM_LEAD'], ['WFM'], []]) {
    state.roles = roles; const result = await check();
    assert.equal(result.status, 403); assert.equal(result.next, false); assert.equal(result.body.code, 'EMPLOYEE_ROLE_REQUIRED');
  }
});
test('employee registration has no ADMIN time-window bypass', async () => {
  const state = setup(); state.roles = ['EMPLOYEE', 'ADMIN'];
  const result = await check(); assert.equal(result.next, true); assert.deepEqual(result.req.user.roles, ['EMPLOYEE']);
});
test('inactive account/employee and mismatched JWT employee are rejected', async () => {
  const state = setup(); state.accountStatus = 'DISABLED'; assert.equal((await check()).status, 403);
  state.accountStatus = 'ACTIVE'; state.active = false; assert.equal((await check()).status, 403);
  state.active = true; assert.equal((await check(999)).status, 403);
});
