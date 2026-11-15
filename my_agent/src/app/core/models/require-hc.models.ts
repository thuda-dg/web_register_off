export interface RequireHcRow {
  id: string;
  cycleKey: string;
  cycleLabel: string;
  date: string;
  dateVN: string;
  dayName: string;
  task: string;
  team?: string; // Legacy mock only; real capacity is shared across teams by task.
  maxOff: number;
  registeredOff: number;
  remainingSlot: number;
  full: boolean;
}

export interface RequireHcSummary {
  totalDays: number;
  fullDays: number;
  availableDays: number;
  remainingSlots: number;
}

export interface RequireHcFiltersValue {
  cycle: string;
  task: string;
  status: string;
}

export interface RequireHcFilterOptions {
  cycles: Array<{
    value: string;
    label: string;
  }>;

  tasks: string[];
  statuses: string[];
}

export interface RequireHcResponse {
  ok: boolean;
  rows: RequireHcRow[];
  msg?: string;
}
