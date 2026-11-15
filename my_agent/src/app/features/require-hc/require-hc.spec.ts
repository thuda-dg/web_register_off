import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { Subject } from 'rxjs';
import { describe, it, expect, vi } from 'vitest';
import { RequireHc } from './require-hc';
import { RequireHcService } from '../../core/services/require-hc.service';
import { RequireHcResponse, RequireHcRow } from '../../core/models/require-hc.models';
import { environment } from '../../../environments/environment';

const row: RequireHcRow = { id: '1', cycleKey: '2', cycleLabel: 'Kỳ 11', date: '2026-11-15', dateVN: '15/11/2026', dayName: 'Chủ nhật', task: 'Mass', maxOff: 2, registeredOff: 1, remainingSlot: 1, full: false };
async function setup() {
  const requests: Subject<RequireHcResponse>[] = [];
  const service = { getRequireHc: vi.fn(() => {
    const request = new Subject<RequireHcResponse>(); requests.push(request); return request;
  }) };
  TestBed.configureTestingModule({ imports: [RequireHc], providers: [{ provide: RequireHcService, useValue: service }] });
  const fixture = TestBed.createComponent(RequireHc); fixture.detectChanges();
  const respond = async (rows: RequireHcRow[]) => {
    requests.at(-1)!.next({ ok: true, rows }); requests.at(-1)!.complete();
    fixture.detectChanges(); await fixture.whenStable();
  };
  await respond([row]);
  return { fixture, component: fixture.componentInstance, service, requests, respond };
}

describe('RequireHC API, refresh and filters', () => {
  it('calls the real API with GET and does not fallback to mock when empty', () => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    const http = TestBed.inject(HttpTestingController); const received = vi.fn();
    TestBed.inject(RequireHcService).getRequireHc().subscribe(received);
    const request = http.expectOne(`${environment.apiUrl}/registration/require-hc`);
    expect(request.request.method).toBe('GET'); request.flush({ ok: true, rows: [] });
    expect(received).toHaveBeenCalledWith({ ok: true, rows: [] }); http.verify();
  });

  it('renders API data and preserves cycle, task and slot dropdowns after refresh', async () => {
    const { fixture, component, respond } = await setup();
    expect(fixture.nativeElement.textContent).toContain('15/11/2026');
    const selects = [...fixture.nativeElement.querySelectorAll('select')] as HTMLSelectElement[];
    expect(selects.length).toBe(3);
    for (const [i, select] of selects.entries()) {
      select.value = ['2', 'Mass', 'available'][i]; select.dispatchEvent(new Event('change'));
      fixture.detectChanges(); await fixture.whenStable();
    }
    fixture.nativeElement.querySelector('header button').click(); fixture.detectChanges();
    await respond([row, { ...row, id: '2', task: 'Key', full: true, remainingSlot: 0 }]);
    expect(component.filteredRows).toEqual([row]);
    expect(component.summary).toEqual({ totalDays: 2, fullDays: 1, availableDays: 1, remainingSlots: 1 });
    expect([...fixture.nativeElement.querySelectorAll('select')].map((s: any) => s.value)).toEqual(['2', 'Mass', 'available']);
  });

  it('filters by AND, supports full/available and keeps selections when new data is empty', async () => {
    const { fixture, component, respond } = await setup();
    component.onFiltersChange({ cycle: '2', task: 'Mass', status: 'full' });
    expect(component.filteredRows).toEqual([]);
    component.onFiltersChange({ cycle: '2', task: 'Mass', status: 'available' });
    expect(component.filteredRows).toEqual([row]);
    component.loadRequireHc(); await respond([]);
    expect([...fixture.nativeElement.querySelectorAll('select')].map((s: any) => s.value)).toEqual(['2', 'Mass', 'available']);
    component.loadRequireHc(); await respond([row]);
    component.onFiltersChange({ cycle: '', task: '', status: '' });
    expect(component.filteredRows).toEqual([row]);
  });

  it('blocks concurrent refresh and retains data/options/filters on network failure', async () => {
    const { component, service, requests, respond } = await setup();
    component.onFiltersChange({ cycle: '2', task: 'Mass', status: 'available' });
    component.loadRequireHc(); component.loadRequireHc();
    expect(service.getRequireHc).toHaveBeenCalledTimes(2);
    requests.at(-1)!.error(new Error('offline'));
    expect(component.loading).toBe(false); expect(component.allRows).toEqual([row]);
    expect(component.filterOptions.tasks).toContain('Mass'); expect(component.filters.status).toBe('available');
    component.loadRequireHc(); await respond([row]); expect(component.errorMessage).toBe('');
  });

  it('retains old data on ok:false and cancels pending request on destroy', async () => {
    const { fixture, component, requests } = await setup();
    component.loadRequireHc(); requests.at(-1)!.next({ ok: false, rows: [], msg: 'Lỗi tải' }); requests.at(-1)!.complete();
    expect(component.allRows).toEqual([row]); expect(component.errorMessage).toBe('Lỗi tải');
    component.loadRequireHc(); fixture.destroy(); expect(requests.at(-1)!.observed).toBe(false);
  });
});
