import { Injectable } from '@angular/core';
import { delay, Observable, of } from 'rxjs';

import {
  PublishedScheduleResponse,
  PublishedScheduleRow
} from '../models/published-schedule.models';

@Injectable({
  providedIn: 'root'
})
export class PublishedScheduleMockService {
  private readonly rows: PublishedScheduleRow[] = [
    {
      id: 'PUB-001',
      cycleKey: '2026-08',
      cycleLabel: '08/2026',
      team: 'Team A',
      employeeName: 'Nguyễn Văn An',
      employeeId: 'NV001',
      date: '2026-08-03',
      dateVN: '03/08/2026',
      type: 'OFF',
      reason: '',
      publishedAt: '21/07/2026 10:00'
    },
    {
      id: 'PUB-002',
      cycleKey: '2026-08',
      cycleLabel: '08/2026',
      team: 'Team A',
      employeeName: 'Trần Minh Hà',
      employeeId: 'NV002',
      date: '2026-08-10',
      dateVN: '10/08/2026',
      type: 'A',
      reason: 'Việc gia đình',
      publishedAt: '21/07/2026 10:00'
    },
    {
      id: 'PUB-003',
      cycleKey: '2026-08',
      cycleLabel: '08/2026',
      team: 'Team B',
      employeeName: 'Lê Hoàng Nam',
      employeeId: 'NV003',
      date: '2026-08-11',
      dateVN: '11/08/2026',
      type: 'M',
      reason: '',
      publishedAt: '21/07/2026 10:05'
    },
    {
      id: 'PUB-004',
      cycleKey: '2026-07',
      cycleLabel: '07/2026',
      team: 'Team A',
      employeeName: 'Phạm Thu Trang',
      employeeId: 'NV004',
      date: '2026-07-06',
      dateVN: '06/07/2026',
      type: 'OFF',
      reason: '',
      publishedAt: '21/06/2026 09:30'
    }
  ];

  getPublishedSchedule(): Observable<PublishedScheduleResponse> {
    const rows = this.rows.map(row => ({
      ...row
    }));

    return of({
      ok: true,
      rows
    }).pipe(delay(500));
  }
}