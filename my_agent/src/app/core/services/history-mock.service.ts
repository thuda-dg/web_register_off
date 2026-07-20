import { Injectable } from '@angular/core';
import { delay, Observable, of } from 'rxjs';

import {
  HistoryResponse,
  HistoryRow,
  HistorySummary
} from '../models/history.models';

@Injectable({
  providedIn: 'root'
})
export class HistoryMockService {
  private readonly rows: HistoryRow[] = [
    {
      id: 'HIS-001',
      cycleKey: '2026-08',
      cycleLabel: '08/2026',
      date: '2026-08-03',
      dateVN: '03/08/2026',
      type: 'OFF',
      reason: '',
      tlStatus: 'Pending',
      publicStatus: 'Not Published',
      approvedBy: '',
      approvedAt: '',
      submittedAt: '18/07/2026 09:20',
      active: true
    },
    {
      id: 'HIS-002',
      cycleKey: '2026-08',
      cycleLabel: '08/2026',
      date: '2026-08-10',
      dateVN: '10/08/2026',
      type: 'A',
      reason: 'Việc gia đình',
      tlStatus: 'Approved',
      publicStatus: 'Published',
      approvedBy: 'Nguyễn Team Lead',
      approvedAt: '19/07/2026 10:15',
      submittedAt: '18/07/2026 09:22',
      active: true
    },
    {
      id: 'HIS-003',
      cycleKey: '2026-07',
      cycleLabel: '07/2026',
      date: '2026-07-06',
      dateVN: '06/07/2026',
      type: 'M',
      reason: '',
      tlStatus: 'Approved',
      publicStatus: 'Published',
      approvedBy: 'Nguyễn Team Lead',
      approvedAt: '20/06/2026 14:30',
      submittedAt: '18/06/2026 08:45',
      active: true
    },
    {
      id: 'HIS-004',
      cycleKey: '2026-07',
      cycleLabel: '07/2026',
      date: '2026-07-13',
      dateVN: '13/07/2026',
      type: 'OFF',
      reason: '',
      tlStatus: 'Rejected',
      publicStatus: 'Not Published',
      approvedBy: 'Nguyễn Team Lead',
      approvedAt: '20/06/2026 15:05',
      submittedAt: '18/06/2026 08:47',
      active: false
    }
  ];

  getMyRegistrationHistory(): Observable<HistoryResponse> {
    const rows = this.rows.map(row => ({ ...row }));

    return of({
      ok: true,
      rows,
      summary: this.buildSummary(rows)
    }).pipe(delay(500));
  }

  private buildSummary(rows: HistoryRow[]): HistorySummary {
    return {
      total: rows.length,

      pending: rows.filter(row =>
        ['pending', 'chờ duyệt', 'pending approval'].includes(
          row.tlStatus.trim().toLowerCase()
        )
      ).length,

      approved: rows.filter(row =>
        ['approved', 'approve', 'đã duyệt'].includes(
          row.tlStatus.trim().toLowerCase()
        )
      ).length,

      published: rows.filter(row =>
        row.publicStatus.trim().toLowerCase() === 'published'
      ).length
    };
  }
}