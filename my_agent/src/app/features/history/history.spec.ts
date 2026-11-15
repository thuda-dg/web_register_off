import { TestBed } from '@angular/core/testing';
import { Subject } from 'rxjs';
import { describe, it, expect, vi } from 'vitest';
import { History } from './history';
import { RegistrationService } from '../../core/services/registration.service';
import { HistoryResponse, HistoryRow } from '../../core/models/history.models';

const row: HistoryRow = {
  cycleKey: '2', cycleLabel: 'Kỳ đăng ký 12/11–20/11/2026', date: '2026-11-14',
  type: 'OFF', typeName: 'Week Off', tlStatus: 'PENDING_TL',
  submittedAt: '2026-11-15T09:18:16.351Z', approvedAt: null, submissionId: 1, entryId: 1
};

async function setup() {
  const requests: Subject<HistoryResponse>[] = [];
  const service = { getMyRegistrationHistory: vi.fn(() => {
    const request = new Subject<HistoryResponse>(); requests.push(request); return request;
  }) };
  TestBed.configureTestingModule({ imports: [History], providers: [
    { provide: RegistrationService, useValue: service }
  ] });
  const fixture = TestBed.createComponent(History);
  fixture.detectChanges();
  const respond = async (rows: HistoryRow[]) => {
    const request = requests.at(-1)!;
    request.next({ ok: true, data: { rows, summary: { total: rows.length, pending: rows.filter(r => r.tlStatus === 'PENDING_TL').length, approved: 0, published: 0 } } });
    request.complete();
    fixture.detectChanges();
    await fixture.whenStable();
  };
  await respond([row]);
  return { fixture, component: fixture.componentInstance, service, requests, respond };
}

describe('History filters and refresh', () => {
  it('keeps all three selected dropdowns and reapplies filtering after clicking refresh', async () => {
    const { fixture, component, respond } = await setup();
    const selects = [...fixture.nativeElement.querySelectorAll('select')] as HTMLSelectElement[];
    for (const [select, value] of selects.map((select, i) => [select, ['2', 'OFF', 'PENDING_TL'][i]] as const)) {
      select.value = value;
      select.dispatchEvent(new Event('change'));
      fixture.detectChanges(); await fixture.whenStable();
    }
    fixture.nativeElement.querySelector('header button').click();
    fixture.detectChanges();
    await respond([row, { ...row, entryId: 2, type: 'A', tlStatus: 'APPROVED' }]);
    expect(component.filters).toEqual({ cycle: '2', type: 'OFF', status: 'PENDING_TL' });
    expect(component.filteredRows).toEqual([row]);
    expect([...fixture.nativeElement.querySelectorAll('select')].map((select: any) => select.value)).toEqual(['2', 'OFF', 'PENDING_TL']);
  });

  it('combines filters using AND and ALL removes restrictions without calling the API', async () => {
    const { component, service, respond } = await setup();
    component.loadHistory();
    await respond([row, { ...row, entryId: 2, cycleKey: '3', type: 'A', tlStatus: 'APPROVED' }]);
    component.onFiltersChange({ cycle: '2', type: 'A', status: 'ALL' });
    expect(component.filteredRows).toEqual([]);
    component.onFiltersChange({ cycle: 'ALL', type: 'A', status: 'APPROVED' });
    expect(component.filteredRows.map(r => r.entryId)).toEqual([2]);
    component.onFiltersChange({ cycle: 'ALL', type: 'ALL', status: 'ALL' });
    expect(component.filteredRows).toHaveLength(2);
    expect(service.getMyRegistrationHistory).toHaveBeenCalledTimes(2);
  });

  it('preserves selected options when refreshed data is empty', async () => {
    const { fixture, component, respond } = await setup();
    component.onFiltersChange({ cycle: '2', type: 'OFF', status: 'PENDING_TL' });
    component.loadHistory(); await respond([]);
    expect(component.filteredRows).toEqual([]);
    expect(component.filterOptions.cycles[0].label).toBe(row.cycleLabel);
    expect([...fixture.nativeElement.querySelectorAll('select')].map((select: any) => select.value)).toEqual(['2', 'OFF', 'PENDING_TL']);
  });

  it('blocks concurrent refresh and keeps data and filters on network failure', async () => {
    const { component, service, requests, respond } = await setup();
    component.onFiltersChange({ cycle: '2', type: 'OFF', status: 'PENDING_TL' });
    component.loadHistory(); component.loadHistory();
    expect(service.getMyRegistrationHistory).toHaveBeenCalledTimes(2);
    requests.at(-1)!.error(new Error('offline'));
    expect(component.loading).toBe(false);
    expect(component.allRows).toEqual([row]);
    expect(component.filters.status).toBe('PENDING_TL');
    component.loadHistory(); await respond([row]);
    expect(component.errorMessage).toBe('');
  });

  it('retains selections on an ok:false response and stops an in-flight request on destroy', async () => {
    const { fixture, component, requests } = await setup();
    component.onFiltersChange({ cycle: '2', type: 'OFF', status: 'PENDING_TL' });
    component.loadHistory();
    requests.at(-1)!.next({ ok: false, message: 'Không tải được', data: { rows: [], summary: { total: 0, pending: 0, approved: 0, published: 0 } } });
    requests.at(-1)!.complete();
    expect(component.filters.type).toBe('OFF');
    expect(component.allRows).toEqual([row]);
    component.loadHistory(); fixture.destroy();
    expect(requests.at(-1)!.observed).toBe(false);
  });
});
