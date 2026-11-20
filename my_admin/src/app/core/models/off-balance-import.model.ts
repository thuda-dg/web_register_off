export interface ImportCycle {
  id: number; name: string; startDate: string; endDate: string; status: string;
}
export interface OffBalanceImportRow {
  row: number; employeeId: number; employeeCode: string; employeeName: string; entitledQuantity: number; adjustedQuantity: number;
}
export interface ImportPreview {
  ok: boolean; data: { cycleId: number; rowCount: number; rows: OffBalanceImportRow[] };
}
export interface ImportResult {
  ok: boolean; message: string; data: { cycleId: number; imported: number };
}
