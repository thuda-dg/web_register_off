const LEAVE_TYPES = [
  { value: 'OFF', label: 'OFF – Weekoff', needReason: false },
  { value: 'U', label: 'U – Unpaid Leave', needReason: false },
  { value: 'U/2', label: 'U/2 – Half Day Unpaid', needReason: false },
  { value: 'R', label: 'R – Resign', needReason: false },
  { value: 'X', label: 'X – Not Join Yet', needReason: false },
  { value: 'A', label: 'A – Annual Leave', needReason: true },
  { value: 'A/2', label: 'A/2 – Half Day Annual Leave', needReason: true },
  { value: 'S', label: 'S – Special Day', needReason: false },
  { value: 'H', label: 'H – Holiday', needReason: false },
  { value: 'M', label: 'M – Medical (Sick Leave)', needReason: false }
];

const TYPES_NEED_REASON = ['A', 'A/2'];

const TASK_MAX_DEFAULT = {
  Mass: 2,
  Key: 2
};

const REGISTRATION_OPEN_DAY = 17;
const REGISTRATION_CLOSE_DAY = 23;

const INACTIVE_STATUSES = [
  'rejected',
  'reject',
  'cancelled',
  'canceled',
  'hủy',
  'huỷ',
  'từ chối'
];

module.exports = {
  LEAVE_TYPES,
  TYPES_NEED_REASON,
  TASK_MAX_DEFAULT,
  REGISTRATION_OPEN_DAY,
  REGISTRATION_CLOSE_DAY,
  INACTIVE_STATUSES
};