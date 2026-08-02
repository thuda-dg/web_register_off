const {
  REGISTRATION_OPEN_DAY,
  REGISTRATION_CLOSE_DAY
} = require('../constants/leave.constants');

function formatDateOnly(date) {
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, '0'),
    String(date.getDate()).padStart(2, '0')
  ].join('-');
}

function formatMonth(date) {
  return [
    String(date.getMonth() + 1).padStart(2, '0'),
    date.getFullYear()
  ].join('/');
}

function getRegistrationOpenStatus(now = new Date()) {
  const day = now.getDate();

  const open =
    day >= REGISTRATION_OPEN_DAY &&
    day <= REGISTRATION_CLOSE_DAY;

  const nextOpenDate =
    day < REGISTRATION_OPEN_DAY
      ? new Date(
          now.getFullYear(),
          now.getMonth(),
          REGISTRATION_OPEN_DAY
        )
      : new Date(
          now.getFullYear(),
          now.getMonth() + 1,
          REGISTRATION_OPEN_DAY
        );

  return {
    open,
    openFrom: String(REGISTRATION_OPEN_DAY),
    openTo: String(REGISTRATION_CLOSE_DAY),
    nextOpenDate: [
      String(nextOpenDate.getDate()).padStart(2, '0'),
      String(nextOpenDate.getMonth() + 1).padStart(2, '0'),
      nextOpenDate.getFullYear()
    ].join('/')
  };
}

function getCalendarRange({
  now = new Date(),
  canBypassTime = false
} = {}) {
  const startDate = new Date(
    now.getFullYear(),
    now.getMonth(),
    26
  );

  const endDate = new Date(
    now.getFullYear(),
    now.getMonth() + 1,
    25
  );

  const payMonthDate = new Date(
    now.getFullYear(),
    now.getMonth() + 1,
    1
  );

  return {
    startDate: formatDateOnly(startDate),
    endDate: formatDateOnly(endDate),
    payMonth: formatMonth(payMonthDate),
    payMonthKey: `${payMonthDate.getFullYear()}-${String(
      payMonthDate.getMonth() + 1
    ).padStart(2, '0')}`,
    regOpen: getRegistrationOpenStatus(now),
    canBypassTimeSession: canBypassTime,
    isOwnerSession: canBypassTime
  };
}

module.exports = {
  getRegistrationOpenStatus,
  getCalendarRange
};