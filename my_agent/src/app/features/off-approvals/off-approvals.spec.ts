import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { provideRouter, Router } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { of, Subject } from 'rxjs';
import { describe, it, expect, vi } from 'vitest';
import { OffApprovals } from './off-approvals';
import { OffApprovalService } from '../../core/services/off-approval.service';
import { OffApprovalResponse, OffDecisionResponse, OffApprovalRow } from '../../core/models/off-approval.model';
import { AuthService } from '../../core/services/auth.service';
import { AuthGuard } from '../../core/guards/auth.guard';
import { teamLeadGuard } from '../../core/guards/team-lead.guard';
import { MainLayoutComponent } from '../../layout/main-layout/main-layout';
import { environment } from '../../../environments/environment';

const row: OffApprovalRow = { entryId: 7, employeeId: 20, employeeCode: 'NV020', employeeName: 'Nguyễn An',
  cycleId: '2', cycleName: 'Kỳ 11', date: '2026-11-17', teamName: 'Team A', taskName: 'Mass',
  status: 'PENDING_TL', submittedAt: '2026-11-16T09:00:00Z', decisionNote: '', decidedAt: null };
function setup() {
  const lists: Subject<OffApprovalResponse>[] = [];
  const decisions: Subject<OffDecisionResponse>[] = [];
  const service = {
    list: vi.fn(() => { const subject = new Subject<OffApprovalResponse>(); lists.push(subject); return subject; }),
    decide: vi.fn((_id: number, _decision: string, _note: string) => { const subject = new Subject<OffDecisionResponse>(); decisions.push(subject); return subject; })
  };
  TestBed.configureTestingModule({ imports: [OffApprovals], providers: [{ provide: OffApprovalService, useValue: service }] });
  const fixture = TestBed.createComponent(OffApprovals); fixture.detectChanges();
  const respond = (rows: OffApprovalRow[]) => {
    lists.at(-1)!.next({ ok: true, data: { teamId: 1, teamName: 'Team A', rows } }); lists.at(-1)!.complete(); fixture.detectChanges();
  };
  respond([row]);
  return { fixture, component: fixture.componentInstance, service, lists, decisions, respond };
}

describe('OFF approval screen', () => {
  it('calls real list and decision endpoints through HttpClient', () => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    const http = TestBed.inject(HttpTestingController); const service = TestBed.inject(OffApprovalService);
    service.list().subscribe();
    const list = http.expectOne(`${environment.apiUrl}/registration/approvals`); expect(list.request.method).toBe('GET');
    list.flush({ ok: true, data: { teamId: 1, teamName: 'Team A', rows: [] } });
    service.decide(7, 'reject', 'Thiếu người').subscribe();
    const decision = http.expectOne(`${environment.apiUrl}/registration/approvals/7`);
    expect(decision.request.method).toBe('PATCH'); expect(decision.request.body).toEqual({ decision: 'reject', note: 'Thiếu người' });
    decision.flush({ ok: true }); http.verify();
  });

  it('defaults to pending, filters by cycle/name/status and keeps selections on refresh', () => {
    const { component, service, respond } = setup();
    component.cycle.set('2'); component.search.set('NV020');
    component.load(); component.load(); expect(service.list).toHaveBeenCalledTimes(2);
    respond([row, { ...row, entryId: 8, cycleId: '3', status: 'APPROVED' }]);
    expect(component.filtered()).toEqual([row]); expect(component.pendingCount()).toBe(1);
    component.status.set('APPROVED'); expect(component.filtered()).toEqual([]);
    component.cycle.set(''); expect(component.filtered()).toHaveLength(1);
    component.status.set(''); expect(component.filtered()).toHaveLength(2);
  });

  it('preserves selected period on empty refresh and old rows on failed refresh', () => {
    const { component, lists, respond } = setup();
    component.cycle.set('2'); component.load(); respond([]);
    expect(component.cycles()).toEqual([{ value: '2', label: 'Kỳ 11' }]);
    component.load(); respond([row]); component.load(); lists.at(-1)!.error(new Error('offline'));
    expect(component.rows()).toEqual([row]); expect(component.loading()).toBe(false);
  });

  it('opens modal from Duyệt button, prevents duplicate requests and updates row on success', () => {
    const { fixture, component, service, decisions } = setup();
    const button = [...fixture.nativeElement.querySelectorAll('button')].find((b: any) => b.textContent.trim() === 'Duyệt') as HTMLButtonElement;
    button.click(); fixture.detectChanges(); expect(fixture.nativeElement.querySelector('[role=dialog]')).toBeTruthy();
    component.confirm(); component.confirm(); component.close();
    expect(service.decide).toHaveBeenCalledExactlyOnceWith(7, 'approve', ''); expect(component.selected()).not.toBeNull();
    decisions[0].next({ ok: true, message: 'Đã duyệt OFF.', data: { entryId: 7, status: 'APPROVED', decisionNote: '', decidedAt: '2026-11-16T10:00:00Z' } }); decisions[0].complete();
    expect(component.selected()).toBeNull(); expect(component.pendingCount()).toBe(0);
    expect(component.filtered()).toEqual([]); expect(component.rows()[0].status).toBe('APPROVED');
  });

  it('requires rejection reason, keeps modal and note on server failure, cancel does not write', () => {
    const { component, service, decisions } = setup();
    component.open(row, 'reject'); component.confirm(); expect(service.decide).not.toHaveBeenCalled();
    component.note = 'Thiếu người'; component.confirm(); decisions[0].error({ status: 500 });
    expect(component.actionError()).toBeTruthy(); expect(component.note).toBe('Thiếu người');
    component.close(); component.confirm(); expect(service.decide).toHaveBeenCalledTimes(1);
  });

  it('refreshes stale decisions on 409 and prevents acting on already handled rows', () => {
    const { component, service, decisions, respond } = setup();
    component.open({ ...row, status: 'PUBLISHED' }, 'reject'); expect(component.selected()).toBeNull();
    component.open(row, 'approve'); component.confirm();
    decisions[0].error({ status: 409, error: { message: 'Đơn đã được xử lý' } });
    expect(component.selected()).toBeNull(); expect(service.list).toHaveBeenCalledTimes(2);
    respond([{ ...row, status: 'APPROVED' }]); expect(component.pendingCount()).toBe(0);
  });

  it('offers reject for approved rows until published and requires a rejection reason', () => {
    const { component, fixture, respond, service } = setup();
    component.load(); respond([{ ...row, status: 'APPROVED' }]); component.status.set('APPROVED'); fixture.detectChanges();
    const button = [...fixture.nativeElement.querySelectorAll('button')].find((b: any) => b.textContent.trim() === 'Từ chối') as HTMLButtonElement;
    expect(button).toBeTruthy(); button.click(); fixture.detectChanges();
    component.confirm(); expect(service.decide).not.toHaveBeenCalled();
    component.note = 'Thay đổi kế hoạch'; component.confirm();
    expect(service.decide).toHaveBeenCalledWith(7, 'reject', 'Thay đổi kế hoạch');
  });

  it('clears stale rows when backend rejects revoked permissions and unsubscribes on exit', () => {
    const { fixture, component, lists } = setup();
    component.load(); lists.at(-1)!.error({ status: 403, error: { message: 'Không có quyền' } });
    expect(component.rows()).toEqual([]); expect(component.error()).toBe('Không có quyền');
    component.load(); fixture.destroy(); expect(lists.at(-1)!.observed).toBe(false);
  });
});

describe('TEAM_LEAD access', () => {
  it('guard redirects ADMIN-only accounts and allows TEAM_LEAD after session refresh', () => {
    const user = signal({ roles: [{ roleCode: 'ADMIN' }] });
    const session = { canActivate: vi.fn(() => of(true)) };
    TestBed.configureTestingModule({ providers: [provideRouter([]), { provide: AuthService, useValue: { currentUser: user } }, { provide: AuthGuard, useValue: session }] });
    const router = TestBed.inject(Router);
    let result: any;
    (TestBed.runInInjectionContext(() => teamLeadGuard({} as never, {} as never)) as any).subscribe((value: any) => result = value);
    expect(router.serializeUrl(result)).toBe('/schedule');
    user.set({ roles: [{ roleCode: 'TEAM_LEAD' }] });
    (TestBed.runInInjectionContext(() => teamLeadGuard({} as never, {} as never)) as any).subscribe((value: any) => result = value);
    expect(result).toBe(true);
  });

  it('only shows approval tab for TEAM_LEAD immediately after schedule', () => {
    const user = signal({ roles: [{ roleCode: 'EMPLOYEE' }] });
    TestBed.configureTestingModule({ imports: [MainLayoutComponent], providers: [provideRouter([]), { provide: AuthService, useValue: { currentUser: user } }] });
    const fixture = TestBed.createComponent(MainLayoutComponent); fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('[href="/approvals"]')).toBeNull();
    user.set({ roles: [{ roleCode: 'TEAM_LEAD' }] }); fixture.detectChanges();
    const links = [...fixture.nativeElement.querySelectorAll('nav a')].map((link: any) => link.getAttribute('href'));
    expect(links.slice(0, 2)).toEqual(['/schedule', '/approvals']);
  });
});
