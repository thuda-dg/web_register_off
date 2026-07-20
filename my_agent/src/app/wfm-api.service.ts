import { Injectable } from '@angular/core';
import { Observable, delay, of } from 'rxjs';

const RANGE = {
  startDate: '2026-08-01',
  endDate: '2026-08-31',
  payMonth: '08/2026',
  payMonthKey: '2026-08',
  regOpen: { open: true, nextOpenDate: '17/08/2026' },
};

const EMPLOYEE = {
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
    { id: 'r1', date: '2026-08-05', type: 'OFF', reason: '', cycleKey: '2026-08', tlStatus: 'Approved', published: true, team: 'Team Demo', employeeName: 'Nguyễn Văn Demo' },
    { id: 'r2', date: '2026-08-12', type: 'A', reason: 'Việc gia đình', cycleKey: '2026-08', tlStatus: 'Pending', published: false, team: 'Team Demo', employeeName: 'Nguyễn Văn Demo' },
  ];

  private respond<T>(value: T): Observable<T> {
    return of(value).pipe(delay(250));
  }

  getCalendarRange(): Observable<any> {
    return this.respond(RANGE);
  }

  getReasons(): Observable<Record<string, string[]>> {
    return this.respond(REASONS);
  }

  getAuthenticatedUserInfo(): Observable<any> {
    return this.respond(EMPLOYEE);
  }

  checkAlreadySubmitted(_eid: string, _payMonthKey: string): Observable<any> {
    const entries = this.registrations.filter(row => row.cycleKey === RANGE.payMonthKey);
    return this.respond({ submitted: entries.length > 0, hasOff: entries.some(row => row.type === 'OFF'), entries });
  }

  getDaySlotStatus(_task: string): Observable<Record<string, any>> {
    return this.respond({
      '2026-08-09': { full: true, current: 3, max: 3 },
      '2026-08-16': { full: true, current: 2, max: 2 },
      '2026-08-23': { full: false, current: 1, max: 3 },
    });
  }

  validateEntries(payload: any): Observable<any> {
    const entries = payload?.entries || [];
    const warnings: string[] = [];
    if (entries.some((entry: any) => new Date(`${entry.date}T00:00:00`).getDay() === 0)) {
      warnings.push('Bạn đang chọn ngày Chủ nhật. Lịch này có thể cần Team Lead kiểm tra thêm.');
    }
    return this.respond({ ok: true, warnings, teamleadRequired: warnings.length > 0 });
  }

  submitRegistration(payload: any): Observable<any> {
    const now = new Date().toLocaleString('vi-VN');
    const newRows = (payload?.entries || []).map((entry: any, index: number) => ({
      ...entry,
      id: `local-${Date.now()}-${index}`,
      cycleKey: RANGE.payMonthKey,
      tlStatus: 'Pending',
      published: false,
      team: EMPLOYEE.team,
      employeeName: EMPLOYEE.name,
      submittedAt: now,
    }));
    this.registrations = [...this.registrations, ...newRows];
    return this.respond({ ok: true, rows: newRows });
  }

  getMyRegistrationHistory(): Observable<any> {
    const rows = [...this.registrations];
    return this.respond({
      ok: true,
      rows,
      summary: {
        total: rows.length,
        pending: rows.filter(row => row.tlStatus === 'Pending').length,
        approved: rows.filter(row => row.tlStatus === 'Approved').length,
        published: rows.filter(row => row.published).length,
      },
    });
  }

  getPublishedSchedule(): Observable<any> {
    const rows = this.registrations.filter(row => row.published);
    return this.respond({
      ok: true,
      rows,
      summary: {
        total: rows.length,
        teams: new Set(rows.map(row => row.team)).size,
        cycles: new Set(rows.map(row => row.cycleKey)).size,
      },
    });
  }

  getTeamLeadApprovalQueue(): Observable<any> {
    const rows = this.registrations.map(row => ({ ...row, locked: row.published }));
    return this.respond({
      ok: true,
      rows,
      summary: {
        total: rows.length,
        pending: rows.filter(row => row.tlStatus === 'Pending').length,
        approved: rows.filter(row => row.tlStatus === 'Approved').length,
        published: rows.filter(row => row.published).length,
      },
    });
  }

  teamLeadBulkDecision(payload: any): Observable<any> {
    const ids = new Set(payload?.ids || []);
    const status = payload?.decision === 'approve' ? 'Approved' : 'Rejected';
    this.registrations = this.registrations.map(row => ids.has(row.id) ? { ...row, tlStatus: status } : row);
    return this.respond({ ok: true, msg: `Đã cập nhật ${ids.size} lịch thành ${status}.` });
  }

  publishApprovedSchedule(payload: any): Observable<any> {
    this.registrations = this.registrations.map(row => {
      const sameCycle = row.cycleKey === payload?.cycleKey;
      const sameTeam = !payload?.team || row.team === payload.team;
      return sameCycle && sameTeam && row.tlStatus === 'Approved' ? { ...row, published: true } : row;
    });
    return this.respond({ ok: true, msg: 'Đã public các lịch Approved trong bộ lọc.' });
  }

  checkRegistrationConsistencyWeb(): Observable<any> {
    return this.respond({ matched: true, sourceCount: this.registrations.length, issueCount: 0 });
  }

  getRequireHCTable(): Observable<any> {
    return this.respond({
      ok: true,
      rows: [
        { date: '2026-08-01', mass: 3, key: 1 },
        { date: '2026-08-02', mass: 2, key: 1 },
        { date: '2026-08-03', mass: 3, key: 2 },
        { date: '2026-08-04', mass: 2, key: 1 },
        { date: '2026-08-05', mass: 3, key: 1 },
      ],
    });
  }
}
