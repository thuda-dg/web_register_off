export interface HistoryRow {
  cycleKey: string;
  cycleLabel: string;
  date: string;
  type: string;
  typeName: string;
  tlStatus: string;
  submittedAt: string;
  approvedAt: string | null;
  submissionId: number;
  entryId: number;
}

export interface HistorySummary {
  total: number;
  pending: number;
  approved: number;
  published: number;
}


export interface HistoryResponse {
  ok: boolean;
  message?: string;
  data: {
    summary: HistorySummary;
    rows: HistoryRow[];
  };

}


export interface HistoryFiltersValue {
  cycle: string;
  type: string;
  status: string;
}


export interface HistoryFilterOptions {
  cycles: Array<{
    value: string;
    label: string;
  }>;
  types: string[];
  statuses: Array<{
    value: string;
    label: string;
  }>;

}