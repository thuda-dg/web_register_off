export interface PublishedScheduleRow {
  id: string;
  cycleKey: string;
  cycleLabel: string;
  team: string;
  employeeName: string;
  employeeId: string;
  date: string;
  dateVN: string;
  type: string;
  reason: string;
  publishedAt: string;
}

export interface PublishedScheduleSummary {
  total: number;
  teams: number;
  cycles: number;
  shown: number;
}

export interface PublishedScheduleFiltersValue {
  cycle: string;
  team: string;
  type: string;
}

export interface PublishedScheduleFilterOptions {
  cycles: Array<{
    value: string;
    label: string;
  }>;

  teams: string[];
  types: string[];
}

export interface PublishedScheduleResponse {
  ok: boolean;
  rows: PublishedScheduleRow[];
  msg?: string;
}