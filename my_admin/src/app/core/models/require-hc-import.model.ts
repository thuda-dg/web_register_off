export interface ImportCycle {
  id: number; name: string; startDate: string; endDate: string; status: string;
}
export interface RequireHcImportRow {
  row: number; workingDate: string; task: string; taskId: number; maxOff: number;
}
export interface ImportPreview {
  ok: boolean; data: { cycleId: number; rowCount: number; rows: RequireHcImportRow[] };
}
export interface ImportResult {
  ok: boolean; message: string; data: { cycleId: number; imported: number };
}
