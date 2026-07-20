import { Injectable } from '@angular/core';
import { delay, Observable, of } from 'rxjs';
import {RequireHcResponse,RequireHcRow} from '../models/require-hc.models';

@Injectable({
  providedIn: 'root'
})
export class RequireHcMockService {
  private readonly rows: RequireHcRow[] = [
    {
      id: 'RHC-001',
      cycleKey: '2026-08',
      cycleLabel: '08/2026',
      date: '2026-08-03',
      dateVN: '03/08/2026',
      dayName: 'Thứ Hai',
      task: 'Mass',
      team: 'Team A',
      maxOff: 4,
      registeredOff: 2,
      remainingSlot: 2,
      full: false
    },
    {
      id: 'RHC-002',
      cycleKey: '2026-08',
      cycleLabel: '08/2026',
      date: '2026-08-04',
      dateVN: '04/08/2026',
      dayName: 'Thứ Ba',
      task: 'Mass',
      team: 'Team A',
      maxOff: 4,
      registeredOff: 4,
      remainingSlot: 0,
      full: true
    },
    {
      id: 'RHC-003',
      cycleKey: '2026-08',
      cycleLabel: '08/2026',
      date: '2026-08-05',
      dateVN: '05/08/2026',
      dayName: 'Thứ Tư',
      task: 'Key',
      team: 'Team B',
      maxOff: 2,
      registeredOff: 1,
      remainingSlot: 1,
      full: false
    },
    {
      id: 'RHC-004',
      cycleKey: '2026-08',
      cycleLabel: '08/2026',
      date: '2026-08-06',
      dateVN: '06/08/2026',
      dayName: 'Thứ Năm',
      task: 'Key',
      team: 'Team B',
      maxOff: 2,
      registeredOff: 2,
      remainingSlot: 0,
      full: true
    },
    {
      id: 'RHC-005',
      cycleKey: '2026-07',
      cycleLabel: '07/2026',
      date: '2026-07-07',
      dateVN: '07/07/2026',
      dayName: 'Thứ Ba',
      task: 'Mass',
      team: 'Team A',
      maxOff: 3,
      registeredOff: 1,
      remainingSlot: 2,
      full: false
    }
  ];

  getRequireHc(): Observable<RequireHcResponse> {
    const rows = this.rows.map(row => ({
      ...row
    }));

    return of({
      ok: true,
      rows
    }).pipe(delay(500));
  }
}