import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { provideRouter } from '@angular/router';
import { of, Subject } from 'rxjs';
import { describe, it, expect, vi } from 'vitest';
import { PublishOffPanel } from './publish-off-panel';
import { PublishedSchedule } from '../../published-schedule';
import { OffApprovalService } from '../../../../core/services/off-approval.service';
import { PublishedScheduleService } from '../../../../core/services/published-schedule.service';
import { AuthService } from '../../../../core/services/auth.service';
import { OffApprovalRow, OffApprovalResponse } from '../../../../core/models/off-approval.model';
import { PublishOffResponse } from '../../../../core/models/published-schedule.models';

const row: OffApprovalRow = { entryId: 7, employeeId: 20, employeeCode: 'NV020', employeeName: 'Nguyễn An',
  cycleId: '2', cycleName: 'Kỳ 11', date: '2026-11-17', teamName: 'Team A', taskName: 'MASS',
  status: 'APPROVED', submittedAt: '2026-11-16T09:00:00Z', decisionNote: '', decidedAt: null };
const queue = (rows: OffApprovalRow[]): OffApprovalResponse => ({ ok: true, data: { teamId: 1, teamName: 'Team A', rows } });
function setup(rows = [row]) {
  const requests: Subject<PublishOffResponse>[] = [];
  const approvals = { list: vi.fn(() => of(queue(rows))) };
  const service = { publish: vi.fn((_cycleId: number, _ids: number[]) => {
    const request = new Subject<PublishOffResponse>(); requests.push(request); return request;
  }) };
  TestBed.configureTestingModule({ imports: [PublishOffPanel], providers: [provideRouter([]),
    { provide: OffApprovalService, useValue: approvals }, { provide: PublishedScheduleService, useValue: service }
  ] });
  const fixture = TestBed.createComponent(PublishOffPanel); fixture.detectChanges();
  return { fixture, component: fixture.componentInstance, approvals, service, requests };
}

describe('OFF publication panel', () => {
  it('requires a cycle, blocks pending days and lists only approved days to publish', () => {
    const { component, fixture, service } = setup([row, { ...row, entryId: 8, status: 'PENDING_TL' }]);
    expect(component.canPublish()).toBe(false); component.changeCycle('2'); fixture.detectChanges();
    expect(component.approved()).toHaveLength(1); expect(component.pending()).toBe(1);
    expect(fixture.nativeElement.textContent).toContain('Cần xử lý hết đơn chờ duyệt');
    component.open(); component.confirm(); expect(service.publish).not.toHaveBeenCalled();
    component.rows.set([row, { ...row, entryId: 8, status: 'REJECTED' }]); expect(component.canPublish()).toBe(true);
  });

  it('shows confirmation snapshot, supports cancel, prevents duplicate writes and emits success', () => {
    const { component, fixture, service, requests } = setup(); const published = vi.fn(); component.published.subscribe(published);
    component.changeCycle('2'); component.open(); fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('[role=dialog]')).toBeTruthy();
    component.close(); component.confirm(); expect(service.publish).not.toHaveBeenCalled();
    component.open(); component.changeCycle('3'); component.confirm(); component.confirm(); component.close();
    expect(component.confirmation()).not.toBeNull(); expect(component.cycle()).toBe('2');
    expect(service.publish).toHaveBeenCalledExactlyOnceWith(2, [7]);
    requests[0].next({ ok: true, message: 'Đã công bố 1 ngày OFF.', data: { cycleId: 2, teamId: 1, entryIds: [7], publishedCount: 1, publishedAt: '2026-11-19T00:00:00Z' } }); requests[0].complete();
    expect(component.confirmation()).toBeNull(); expect(component.approved()).toHaveLength(0);
    expect(component.success()).toContain('1 ngày OFF'); expect(published).toHaveBeenCalledOnce();
  });

  it('retains modal on transient error and refreshes a stale confirmation on conflict', () => {
    const { component, service, requests, approvals } = setup(); component.changeCycle('2'); component.open(); component.confirm();
    requests[0].error({ status: 500, error: { message: 'Mất kết nối' } });
    expect(component.confirmation()).not.toBeNull(); expect(component.error()).toBe('Mất kết nối');
    component.confirm(); expect(service.publish).toHaveBeenCalledTimes(2);
    requests[1].error({ status: 409, error: { message: 'Danh sách thay đổi' } });
    expect(component.confirmation()).toBeNull(); expect(approvals.list).toHaveBeenCalledTimes(2);
    expect(component.error()).toBe('Danh sách thay đổi'); expect(component.saving()).toBe(false);
  });

  it('refresh preserves selected cycle even when the new queue is empty', () => {
    const { component, approvals } = setup(); component.changeCycle('2'); approvals.list.mockReturnValue(of(queue([]))); component.load();
    expect(component.cycle()).toBe('2'); expect(component.cycles()).toEqual([{ value: '2', label: 'Kỳ 11' }]);
    expect(component.canPublish()).toBe(false);
  });

  it('does not permit publication after a failed refresh and cancels requests when destroyed', () => {
    const { component, approvals, fixture } = setup(); component.changeCycle('2');
    const list = new Subject<OffApprovalResponse>(); approvals.list.mockReturnValue(list); component.load();
    list.error({ error: { message: 'Không tải được' } });
    expect(component.approved()).toHaveLength(1); expect(component.canPublish()).toBe(false);
    const retry = new Subject<OffApprovalResponse>(); approvals.list.mockReturnValue(retry); component.load(); fixture.destroy();
    expect(retry.observed).toBe(false);
  });

  it('renders publication actions in Published tab only for TEAM_LEAD, not EMPLOYEE or ADMIN alone', () => {
    const user = signal({ roles: [{ roleCode: 'EMPLOYEE' }] }); const approvals = { list: vi.fn(() => of(queue([row]))) };
    TestBed.configureTestingModule({ imports: [PublishedSchedule], providers: [provideRouter([]),
      { provide: AuthService, useValue: { currentUser: user } }, { provide: OffApprovalService, useValue: approvals },
      { provide: PublishedScheduleService, useValue: { getPublishedSchedule: () => of({ ok: true, rows: [] }) } }
    ] });
    const fixture = TestBed.createComponent(PublishedSchedule); fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('app-publish-off-panel')).toBeNull();
    user.set({ roles: [{ roleCode: 'ADMIN' }] }); fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('app-publish-off-panel')).toBeNull();
    user.set({ roles: [{ roleCode: 'TEAM_LEAD' }] }); fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('app-publish-off-panel')).not.toBeNull(); expect(approvals.list).toHaveBeenCalledOnce();
  });
});
