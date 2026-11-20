import { TestBed } from '@angular/core/testing';
import { of, Subject } from 'rxjs';
import { describe, it, expect, vi } from 'vitest';
import { MyPublishedOffs } from './my-published-offs';
import { PublishedScheduleService } from '../../../../core/services/published-schedule.service';
import { PublishedScheduleResponse, PublishedScheduleRow } from '../../../../core/models/published-schedule.models';
import { Schedule } from '../../schedule';
import { RegistrationService } from '../../../../core/services/registration.service';
import { AuthService } from '../../../../core/services/auth.service';

const row: PublishedScheduleRow = { id: '7', cycleKey: '2', cycleLabel: 'Kỳ 11', team: 'Team A',
  employeeName: 'Nguyễn An', employeeId: 'NV020', date: '2026-11-17', dateVN: '17/11/2026', type: 'OFF', reason: '', publishedAt: null };
function setup() {
  const requests: Subject<PublishedScheduleResponse>[] = [];
  const service = { getMyPublishedSchedule: vi.fn(() => {
    const request = new Subject<PublishedScheduleResponse>(); requests.push(request); return request;
  }) };
  TestBed.configureTestingModule({ imports: [MyPublishedOffs], providers: [{ provide: PublishedScheduleService, useValue: service }] });
  const fixture = TestBed.createComponent(MyPublishedOffs); fixture.detectChanges();
  const respond = (rows: PublishedScheduleRow[]) => { requests.at(-1)!.next({ ok: true, rows }); requests.at(-1)!.complete(); fixture.detectChanges(); };
  return { component: fixture.componentInstance, fixture, service, requests, respond };
}

describe('Personal published OFF on Schedule', () => {
  it('loads personal API and renders only OFF, preserving cycle on empty refresh', () => {
    const { component, fixture, respond } = setup(); respond([row, { ...row, id: '8', type: 'A' }]);
    expect(component.rows()).toEqual([row]); expect(fixture.nativeElement.textContent).toContain('OFF · 17/11/2026');
    component.cycle.set('2'); component.load(); respond([]);
    expect(component.cycle()).toBe('2'); expect(component.cycles()).toEqual([{ value: '2', label: 'Kỳ 11' }]);
    expect(fixture.nativeElement.textContent).toContain('Chưa có lịch OFF được công bố');
  });

  it('prevents duplicate refresh, retains old rows on error and cancels requests when leaving', () => {
    const { component, fixture, service, requests, respond } = setup(); respond([row]);
    component.load(); component.load(); expect(service.getMyPublishedSchedule).toHaveBeenCalledTimes(2);
    requests[1].error(new Error('offline')); expect(component.rows()).toEqual([row]); expect(component.error()).toBeTruthy();
    component.load(); fixture.destroy(); expect(requests[2].observed).toBe(false);
  });

  it('is visible on Schedule even when the registration portal is closed and bootstrap has no result yet', () => {
    TestBed.configureTestingModule({ imports: [Schedule], providers: [
      { provide: RegistrationService, useValue: { getBootstrap: () => new Subject() } },
      { provide: AuthService, useValue: { currentUser: () => ({ roles: [{ roleCode: 'EMPLOYEE' }] }) } },
      { provide: PublishedScheduleService, useValue: { getMyPublishedSchedule: () => of({ ok: true, rows: [row] }) } }
    ] });
    const fixture = TestBed.createComponent(Schedule); fixture.detectChanges();
    expect(fixture.componentInstance.formClosed).toBe(true);
    expect(fixture.nativeElement.querySelector('app-closed-banner')).not.toBeNull();
    expect(fixture.nativeElement.textContent).toContain('OFF · 17/11/2026');
  });
});
