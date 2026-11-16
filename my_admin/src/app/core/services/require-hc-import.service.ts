import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { ImportCycle, ImportPreview, ImportResult } from '../models/require-hc-import.model';

@Injectable({ providedIn: 'root' })
export class RequireHcImportService {
  private readonly http = inject(HttpClient);
  private readonly url = `${environment.apiUrl}/admin/require-hc`;
  cycles() { return this.http.get<{ ok: boolean; items: ImportCycle[] }>(`${this.url}/cycles`); }
  private body(file: File, cycleId: number, mode: string) {
    const data = new FormData(); data.append('cycleId', String(cycleId)); data.append('mode', mode); data.append('file', file); return data;
  }
  preview(file: File, cycleId: number) { return this.http.post<ImportPreview>(`${this.url}/import`, this.body(file, cycleId, 'preview')); }
  import(file: File, cycleId: number) { return this.http.post<ImportResult>(`${this.url}/import`, this.body(file, cycleId, 'import')); }
}
