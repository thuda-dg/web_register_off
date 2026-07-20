import { Injectable } from '@angular/core';
import { Observable, delay, of } from 'rxjs';
import { CalendarRange, Employee, RegistrationEntry, SlotStatus } from '../models/wfm.models';

const RANGE: CalendarRange = {
  startDate: '2026-08-01',
  endDate: '2026-08-31',
  payMonth: '08/2026',
  payMonthKey: '2026-08',
  regOpen: { open: true, nextOpenDate: '17/08/2026' },
};

const EMPLOYEE: Employee = {
  status: 'success',
  name: 'Nguyễn Văn Demo',
  eid: 'WFM001',
  email: 'demo@company.com',
  task: 'Mass',
  team: 'Team Demo',
  alRemain: 8,
  offRemain: 4,
  isOwner: true,
  isTester: true,
  isTeamLead: true,
  canBypassTime: true,
};

const REASONS: Record<string, string[]> = {
  A: ['Việc gia đình', 'Du lịch', 'Việc cá nhân'],
  'A/2': ['Việc gia đình', 'Khám bệnh', 'Việc cá nhân'],
};

@Injectable({ providedIn: 'root' })
export class WfmApiService {
  private registrations: any[] = [
    {
      id: 'r1', date: '2026-08-05', type: 'OFF', reason: '',
      cycleKey: '2026-08', submittedAt: '05/07/2026 09:10',
    },
  ];

  private respond<T>(value: T): Observable<T> {
    return of(value).pipe(delay(250));
  }

  getCalendarRange(): Observable<CalendarRange> {
    return this.respond(RANGE);
  }

  getReasons(): Observable<Record<string, string[]>> {
    return this.respond(REASONS);
  }

  getAuthenticatedUserInfo(): Observable<Employee> {
    return this.respond(EMPLOYEE);
  }

  checkAlreadySubmitted(_eid: string, payMonthKey: string): Observable<any> {
    const entries = this.registrations.filter(row => row.cycleKey === payMonthKey);
    return this.respond({
      submitted: entries.length > 0,
      hasOff: entries.some(row => row.type === 'OFF'),
      entries,
    });
  }

  getDaySlotStatus(_task: string): Observable<Record<string, SlotStatus>> {
    return this.respond({
      '2026-08-09': { full: true, current: 3, max: 3 },
      '2026-08-16': { full: true, current: 2, max: 2 },
      '2026-08-23': { full: false, current: 1, max: 3 },
    });
  }

  validateEntries(payload: { eid: string; entries: RegistrationEntry[] }): Observable<any> {
    const warnings: string[] = [];
    if (payload.entries.some(entry => new Date(`${entry.date}T00:00:00`).getDay() === 0)) {
      warnings.push('Bạn đang chọn ngày Chủ nhật. Lịch này có thể cần Team Lead kiểm tra thêm.');
    }
    return this.respond({ ok: true, warnings, teamleadRequired: warnings.length > 0 });
  }

  submitRegistration(payload: { eid: string; entries: RegistrationEntry[] }): Observable<any> {
    const submittedAt = new Date().toLocaleString('vi-VN');
    const rows = payload.entries.map((entry, index) => ({
      ...entry,
      id: `local-${Date.now()}-${index}`,
      cycleKey: RANGE.payMonthKey,
      submittedAt,
    }));
    this.registrations = [...this.registrations, ...rows];
    return this.respond({ ok: true, rows });
  }
}
