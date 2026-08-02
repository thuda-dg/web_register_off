const pool = require('../config/database');
const {
  TASK_MAX_DEFAULT
} = require('../constants/leave.constants');

async function getRequireHCForDate(
  client,
  date,
  task
) {
  const db = client ?? pool;

  const result = await db.query(
    `
    SELECT max_off
    FROM require_hc
    WHERE work_date = $1
      AND task = $2
    LIMIT 1
    `,
    [date, task]
  );

  if (!result.rowCount) {
    return TASK_MAX_DEFAULT[task] ?? null;
  }

  return Number(result.rows[0].max_off);
}

async function countActiveRegistrations(
  client,
  date,
  task
) {
  const result = await client.query(
    `
    SELECT COUNT(*)::INTEGER AS total
    FROM leave_registrations lr
    INNER JOIN employees e
      ON e.id = lr.employee_id
    WHERE lr.leave_date = $1
      AND e.task = $2
      AND lr.is_active = TRUE
    `,
    [date, task]
  );

  return result.rows[0].total;
}

async function checkTaskCapacity(
  client,
  entries,
  task
) {
  const selectedPerDate = new Map();
  const blockedDates = [];

  for (const entry of entries) {
    const max = await getRequireHCForDate(
      client,
      entry.date,
      task
    );

    if (max === null) {
      continue;
    }

    const current = await countActiveRegistrations(
      client,
      entry.date,
      task
    );

    const alreadySelected =
      selectedPerDate.get(entry.date) ?? 0;

    const afterSubmit =
      current + alreadySelected + 1;

    if (afterSubmit > max) {
      blockedDates.push({
        date: entry.date,
        dateRaw: entry.date,
        task,
        current,
        selected: alreadySelected + 1,
        max,
        type: entry.type
      });
    } else {
      selectedPerDate.set(
        entry.date,
        alreadySelected + 1
      );
    }
  }

  return blockedDates.length
    ? {
        ok: false,
        blockedDates
      }
    : {
        ok: true
      };
}

module.exports = {
  getRequireHCForDate,
  countActiveRegistrations,
  checkTaskCapacity
};