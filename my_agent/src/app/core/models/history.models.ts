export interface HistoryRow {
  id: string;
  cycleKey: string;
  cycleLabel: string;
  date: string;
  dateVN: string;
  type: string;
  reason: string;
  tlStatus: string;
  publicStatus: string;
  approvedBy: string;
  approvedAt: string;
  submittedAt: string;
  active: boolean;
}

export interface HistorySummary {
  total: number;
  pending: number;
  approved: number;
  published: number;
}

export interface HistoryResponse {
  ok: boolean;
  rows: HistoryRow[];
  summary: HistorySummary;
  msg?: string;
}

export interface HistoryFiltersValue {
  cycle: string;
  type: string;
  status: string;
}

export interface HistoryFilterOptions {
  cycles: Array<{ value: string; label: string }>;
  types: string[];
  statuses: string[];
}
