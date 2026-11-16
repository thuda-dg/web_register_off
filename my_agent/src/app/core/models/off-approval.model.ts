export interface OffApprovalRow {
  entryId: number;
  employeeId: number;
  employeeCode: string;
  employeeName: string;
  cycleId: string;
  cycleName: string;
  date: string;
  teamName: string;
  taskName: string;
  status: string;
  submittedAt: string;
  decisionNote: string;
  decidedAt: string | null;
}
export interface OffApprovalResponse {
  ok: boolean;
  data: { teamId: number; teamName: string; rows: OffApprovalRow[] };
}
export interface OffDecisionResponse {
  ok: boolean;
  message: string;
  data: { entryId: number; status: string; decisionNote: string; decidedAt: string };
}
