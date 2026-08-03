function toDateOnly(date) {
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, '0'),
    String(date.getDate()).padStart(2, '0')
  ].join('-');
}

function getWeekRange(dateValue) {
  const date = new Date(`${dateValue}T00:00:00`);

  if (Number.isNaN(date.getTime())) {
    throw new Error(`Ngày không hợp lệ: ${dateValue}`);
  }

  // Chủ nhật có getDay() = 0
  const dayOfWeek = date.getDay();

  // Tính khoảng cách về thứ Hai
  const offsetToMonday =
    dayOfWeek === 0
      ? -6
      : 1 - dayOfWeek;

  const monday = new Date(date);
  monday.setDate(
    date.getDate() + offsetToMonday
  );

  const sunday = new Date(monday);
  sunday.setDate(
    monday.getDate() + 6
  );

  return {
    start: toDateOnly(monday),
    end: toDateOnly(sunday)
  };
}

module.exports = {
  getWeekRange
};