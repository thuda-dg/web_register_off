const { test, afterEach } = require('node:test');
const assert = require('node:assert/strict');
process.env.AUTH_TOKEN_SECRET ||= 'admin-task-test-secret';
const models = require('./models');
const { updateUserTask } = require('./services/admin.service');
const originals = [];
function stub(object, key, value) {
  originals.push([object, key, object[key]]);
  object[key] = value;
}
afterEach(() => {
  for (const [object, key, value] of originals.splice(0).reverse()) object[key] = value;
});

function setup() {
  const state = { histories: [], created: [], expired: [], deleted: [], committed: false, rolledBack: false };
  const transaction = { LOCK: { UPDATE: 'UPDATE' } };
  stub(models.sequelize, 'transaction', async callback => {
    try {
      const result = await callback(transaction);
      state.committed = true;
      return result;
    } catch (error) { state.rolledBack = true; throw error; }
  });
  stub(models.Employee, 'findOne', async options => {
    assert.equal(options.transaction, transaction);
    assert.equal(options.lock, 'UPDATE');
    return { emp_id: 10 };
  });
  stub(models.Task, 'findOne', async () => ({ task_id: 2, task_name: 'Task B' }));
  stub(models.EmpTaskHistory, 'findAll', async () => state.histories);
  stub(models.EmpTaskHistory, 'create', async (values, options) => {
    assert.equal(options.transaction, transaction);
    state.created.push(values);
  });
  state.history = (taskId, start, end = null) => ({
    task_id: taskId, start_date: start, end_date: end,
    async update(values, options) {
      assert.equal(options.transaction, transaction);
      state.expired.push({ taskId, ...values });
    },
    async destroy(options) {
      assert.equal(options.transaction, transaction);
      state.deleted.push(taskId);
    }
  });
  return state;
}

test('assigns one task to employee without an existing assignment or account', async () => {
  const state = setup();
  const result = await updateUserTask(10, { taskId: 2 });
  assert.equal(result.taskName, 'Task B');
  assert.equal(state.created.length, 1);
  assert.equal(state.created[0].end_date, null);
  assert.equal(state.committed, true);
});

test('ends old assignment before today and deletes same-day assignments', async () => {
  const state = setup();
  const today = new Date().toISOString().slice(0, 10);
  state.histories = [state.history(1, '2020-01-01'), state.history(3, today)];
  await updateUserTask('10', { taskId: 2 });
  assert.ok(state.expired[0].end_date < today);
  assert.deepEqual(state.deleted, [3]);
  assert.equal(state.created.length, 1);
});

test('keeps selected task without duplicates and repairs overlapping current assignments', async () => {
  const state = setup();
  state.histories = [state.history(2, '2020-01-01'), state.history(2, '2021-01-01'), state.history(1, '2020-01-01')];
  await updateUserTask(10, { taskId: 2 });
  assert.equal(state.created.length, 0);
  assert.equal(state.expired.length, 2);
});

test('handles A to B to A in the same day without overlapping periods', async () => {
  const state = setup();
  const today = new Date().toISOString().slice(0, 10);
  state.histories = [state.history(1, today)];
  await updateUserTask(10, { taskId: 2 });
  state.histories = [state.history(2, today)];
  stub(models.Task, 'findOne', async () => ({ task_id: 1, task_name: 'Task A' }));
  await updateUserTask(10, { taskId: 1 });
  assert.deepEqual(state.deleted, [1, 2]);
  assert.equal(state.expired.length, 0);
});

test('rejects malformed ids, inactive tasks and missing employees', async () => {
  const state = setup();
  for (const [id, taskId] of [[0, 2], ['bad', 2], [10, null], [10, [1, 2]], [10, '2'], [10, -1]]) {
    await assert.rejects(updateUserTask(id, { taskId }), { statusCode: 400 });
  }
  stub(models.Task, 'findOne', async () => null);
  await assert.rejects(updateUserTask(10, { taskId: 2 }), { statusCode: 400 });
  stub(models.Employee, 'findOne', async () => null);
  await assert.rejects(updateUserTask(10, { taskId: 2 }), { statusCode: 404 });
  assert.equal(state.created.length, 0);
});

test('preserves scheduled future transfers by rejecting conflicting changes', async () => {
  const state = setup();
  state.histories = [state.history(1, '9999-01-01')];
  await assert.rejects(updateUserTask(10, { taskId: 2 }), { statusCode: 409, code: 'FUTURE_TASK_ASSIGNMENT' });
  assert.equal(state.expired.length + state.created.length + state.deleted.length, 0);
});

test('rolls back when the new task assignment fails', async () => {
  const state = setup();
  state.histories = [state.history(1, '2020-01-01')];
  stub(models.EmpTaskHistory, 'create', async () => { throw new Error('write failed'); });
  await assert.rejects(updateUserTask(10, { taskId: 2 }), /write failed/);
  assert.equal(state.rolledBack, true);
  assert.equal(state.committed, false);
});
