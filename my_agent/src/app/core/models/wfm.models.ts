export interface Employee {
  status: string;
  name: string;
  eid: string;
  email: string;
  task: string;
  team: string;
  alRemain: number;
  offRemain: number;
  isOwner?: boolean;
  isTester?: boolean;
  isTeamLead?: boolean;
  canBypassTime?: boolean;
  message?: string;
}

export interface RegistrationWindow {
  open: boolean;
  nextOpenDate?: string;
}

export interface CalendarRange {
  startDate: string;
  endDate: string;
  payMonth: string;
  payMonthKey: string;
  regOpen: RegistrationWindow;
}

export interface LeaveType {
  value: string;
  label: string;
  needReason: boolean;
  color: string;
}

export interface RegistrationEntry {
  date: string;
  type: string;
  reason: string;
}

export interface CalendarCell {
  key: string;
  day?: number;
  empty?: boolean;
  inRange?: boolean;
  selected?: boolean;
  today?: boolean;
  full?: boolean;
}

export interface SlotStatus {
  full: boolean;
  current?: number;
  max?: number;
}
