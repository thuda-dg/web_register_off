import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { Subject } from 'rxjs';
import { describe, it, expect, vi } from 'vitest';
import { PublishedSchedule } from './published-schedule';
import { PublishedScheduleService } from '../../core/services/published-schedule.service';
import { PublishedScheduleResponse, PublishedScheduleRow } from '../../core/models/published-schedule.models';
import { environment } from '../../../environments/environment';

const row: PublishedScheduleRow = {
  id: '1', cycleKey: '2', cycleLabel: 'Kỳ 11', team: 'Team A', employeeName: 'Nguyễn An', employeeId: 'NV001',
  date: '2026-11-15', dateVN: '15/11/2026', type: 'OFF', reason: '', publishedAt: '2026-11-15T09:00:00Z'
};
async function setup() {
  const requests: Subject<PublishedScheduleResponse>[] = [];
  const service = { getPublishedSchedule: vi.fn(() => {
    const request = new Subject<PublishedScheduleResponse>(); requests.push(request); return request;
  }) };
  TestBed.configureTestingModule({ imports: [PublishedSchedule], providers: [{ provide: PublishedScheduleService, useValue: service }] });
  const fixture = TestBed.createComponent(PublishedSchedule);
  fixture.detectChanges();
  const respond = async (rows: PublishedScheduleRow[]) => {
    requests.at(-1)!.next({ ok: true, rows }); requests.at(-1)!.complete();
    fixture.detectChanges(); await fixture.whenStable();
  };
  await respond([row]);
  return { fixture, component: fixture.componentInstance, service, requests, respond };
}

describe('Published schedule API and filters', () => {
  it('calls the configured API with GET and returns an empty list without mock fallback', () => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    const http = TestBed.inject(HttpTestingController);
    const received = vi.fn();
    TestBed.inject(PublishedScheduleService).getPublishedSchedule().subscribe(received);
    const request = http.expectOne(`${environment.apiUrl}/registration/published`);
    expect(request.request.method).toBe('GET');
    request.flush({ ok: true, rows: [] });
    expect(received).toHaveBeenCalledWith({ ok: true, rows: [] }); http.verify();
  });

  it('renders API rows and preserves all dropdown selections after clicking refresh', async () => {
    const { fixture, component, respond } = await setup();
    expect(fixture.nativeElement.textContent).toContain('Nguyễn An');
    expect(fixture.nativeElement.textContent).toContain('15/11/2026 16:00');
    const selects = [...fixture.nativeElement.querySelectorAll('select')] as HTMLSelectElement[];
    for (const [i, select] of selects.entries()) {
      select.value = ['2', 'Team A', 'OFF'][i]; select.dispatchEvent(new Event('change'));
      fixture.detectChanges(); await fixture.whenStable();
    }
    fixture.nativeElement.querySelector('header button').click(); fixture.detectChanges();
    await respond([row, { ...row, id: '2', team: 'Team B', type: 'A', cycleKey: '3' }]);
    expect(component.filteredRows).toEqual([row]);
    expect(component.summary).toEqual({ total: 2, teams: 2, cycles: 2, shown: 1 });
    expect([...fixture.nativeElement.querySelectorAll('select')].map((s: any) => s.value)).toEqual(['2', 'Team A', 'OFF']);
  });

  it('keeps selected options when no rows match and ALL removes conditions', async () => {
    const { fixture, component, respond } = await setup();
    component.onFiltersChange({ cycle: '2', team: 'Team A', type: 'OFF' });
    component.loadPublishedSchedule(); await respond([]);
    expect(component.filteredRows).toEqual([]);
    expect([...fixture.nativeElement.querySelectorAll('select')].map((s: any) => s.value)).toEqual(['2', 'Team A', 'OFF']);
    component.loadPublishedSchedule(); await respond([row]);
    component.onFiltersChange({ cycle: '2', team: 'Team A', type: 'A' });
    expect(component.filteredRows).toEqual([]);
    component.onFiltersChange({ cycle: '', team: '', type: '' });
    expect(component.filteredRows).toEqual([row]);
  });

  it('blocks duplicate refresh, keeps previous data on error and allows retry', async () => {
    const { component, service, requests, respond } = await setup();
    component.onFiltersChange({ cycle: '2', team: 'Team A', type: 'OFF' });
    component.loadPublishedSchedule(); component.loadPublishedSchedule();
    expect(service.getPublishedSchedule).toHaveBeenCalledTimes(2);
    requests.at(-1)!.error(new Error('offline'));
    expect(component.loading).toBe(false);
    expect(component.allRows).toEqual([row]);
    expect(component.filterOptions.teams).toContain('Team A');
    expect(component.filters.type).toBe('OFF');
    component.loadPublishedSchedule(); await respond([row]);
    expect(component.errorMessage).toBe('');
  });

  it('preserves rows on ok:false and cancels the request when leaving the page', async () => {
    const { fixture, component, requests } = await setup();
    component.loadPublishedSchedule();
    requests.at(-1)!.next({ ok: false, rows: [], msg: 'Không tải được' }); requests.at(-1)!.complete();
    expect(component.allRows).toEqual([row]);
    expect(component.errorMessage).toBe('Không tải được');
    component.loadPublishedSchedule(); fixture.destroy();
    expect(requests.at(-1)!.observed).toBe(false);
  });
});
