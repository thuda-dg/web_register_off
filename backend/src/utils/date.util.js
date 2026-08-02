function toDateOnlyString(value) {
  if (!value) {
    return null;
  }

  if (typeof value === 'string') {
    const match = value.match(/^(\d{4})-(\d{2})-(\d{2})/);

    if (match) {
      return `${match[1]}-${match[2]}-${match[3]}`;
    }
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, '0'),
    String(date.getDate()).padStart(2, '0')
  ].join('-');
}

function formatVNDate(dateString) {
  if (!dateString) {
    return '';
  }

  const parts = String(dateString).split('-');

  if (parts.length !== 3) {
    return dateString;
  }

  return `${parts[2]}/${parts[1]}/${parts[0]}`;
}

function formatShortDate(dateString) {
  if (!dateString) {
    return '';
  }

  const parts = String(dateString).split('-');

  if (parts.length !== 3) {
    return dateString;
  }

  return `${parts[2]}/${parts[1]}`;
}

function getPayCycleFromLeaveDate(value) {
  const date = new Date(`${toDateOnlyString(value)}T00:00:00`);

  let year = date.getFullYear();
  let month = date.getMonth() + 1;

  if (date.getDate() >= 26) {
    month += 1;

    if (month > 12) {
      month = 1;
      year += 1;
    }
  }

  const monthText = String(month).padStart(2, '0');

  return {
    key: `${year}-${monthText}`,
    label: `${monthText}/${year}`
  };
}

function getWeekKey(value) {
  const date = new Date(value);
  date.setHours(0, 0, 0, 0);

  date.setDate(
    date.getDate() + 3 - ((date.getDay() + 6) % 7)
  );

  const firstWeek = new Date(date.getFullYear(), 0, 4);

  const weekNumber =
    1 +
    Math.round(
      ((date - firstWeek) / 86400000 -
        3 +
        ((firstWeek.getDay() + 6) % 7)) /
        7
    );

  return `${date.getFullYear()}-W${String(weekNumber).padStart(2, '0')}`;
}

module.exports = {
  toDateOnlyString,
  formatVNDate,
  formatShortDate,
  getPayCycleFromLeaveDate,
  getWeekKey
};