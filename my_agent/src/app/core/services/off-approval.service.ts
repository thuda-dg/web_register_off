import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { OffApprovalResponse, OffDecisionResponse } from '../models/off-approval.model';

@Injectable({ providedIn: 'root' })
export class OffApprovalService {
  private readonly http = inject(HttpClient);
  list() { return this.http.get<OffApprovalResponse>(`${environment.apiUrl}/registration/approvals`); }
  decide(entryId: number, decision: 'approve' | 'reject', note: string) {
    return this.http.patch<OffDecisionResponse>(`${environment.apiUrl}/registration/approvals/${entryId}`, { decision, note });
  }
}
