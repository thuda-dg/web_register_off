import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { of, Subject } from 'rxjs';
import { describe, it, expect, vi } from 'vitest';
import { RegistrationCycles } from './registration-cycles';
import { RegistrationCycleService } from '../../core/services/registration-cycle.service';
import { RegistrationCycle } from '../../core/models/registration-cycle.model';
import { environment } from '../../../environments/environment';

const dates = { startDate: '2026-11-01', endDate: '2026-11-30' };
const cycle: RegistrationCycle = { id: 7, code: '2026-11', name: 'Kỳ tháng 11/2026', ...dates,
  registrationOpenTime: '2026-10-16T17:00:00.000Z', registrationClosingTime: '2026-10-23T16:59:59.999Z', status: 'OPEN' };
function setup() {
  const requests: Subject<{ ok: boolean; message: string; data: RegistrationCycle }>[] = [];
  const service = {
    list: vi.fn(() => of({ ok: true, items: [] as RegistrationCycle[] })),
    create: vi.fn(() => { const request = new Subject<{ ok: boolean; message: string; data: RegistrationCycle }>(); requests.push(request); return request; })
  };
  TestBed.configureTestingModule({ imports: [RegistrationCycles], providers: [provideRouter([]), { provide: RegistrationCycleService, useValue: service }] });
  const fixture = TestBed.createComponent(RegistrationCycles); fixture.detectChanges();
  return { fixture, component: fixture.componentInstance, service, requests };
}

describe('Registration cycle admin', () => {
  it('uses real GET/POST API and sends only the two dates', () => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    const service = TestBed.inject(RegistrationCycleService), http = TestBed.inject(HttpTestingController);
    const url = `${environment.apiUrl}/admin/registration-cycles`;
    service.list().subscribe(); const list = http.expectOne(url);
    expect(list.request.method).toBe('GET'); list.flush({ ok: true, items: [] });
    service.create(dates).subscribe(); const create = http.expectOne(url);
    expect(create.request.method).toBe('POST'); expect(create.request.body).toEqual(dates);
    create.flush({ ok: true, message: 'Đã tạo', data: cycle }); http.verify();
  });

  it('requires real ordered dates, including leap days, before sending', () => {
    const { component, service } = setup();
    component.create(); expect(service.create).not.toHaveBeenCalled();
    for (const value of [{ ...dates, startDate: '2026-12-01' }, { ...dates, startDate: '2026-02-29' }, { ...dates, endDate: '2026-11-31' }]) {
      component.form.setValue(value); component.create(); expect(service.create).not.toHaveBeenCalled();
    }
    component.form.setValue({ startDate: '2028-02-29', endDate: '2028-02-29' }); expect(component.form.valid).toBe(true);
  });

  it('previews 17-23 of previous month in Vietnam time and handles January/cross-month dates', () => {
    const { component, fixture } = setup(); component.form.setValue(dates); fixture.detectChanges();
    expect(component.preview()?.code).toBe('2026-11');
    expect(fixture.nativeElement.textContent).toContain('17/10/2026 00:00');
    expect(fixture.nativeElement.textContent).toContain('23/10/2026 23:59:59');
    component.form.setValue({ startDate: '2026-12-26', endDate: '2027-01-25' });
    expect(component.preview()?.open).toBe('2026-12-17T00:00:00+07:00');
    expect(component.preview()?.name).toBe('Kỳ tháng 01/2027');
  });

  it('prevents duplicate requests and resets form only after successful creation', () => {
    const { component, service, requests, fixture } = setup(); component.form.setValue(dates);
    component.create(); component.create(); component.reset(); component.refresh();
    expect(service.create).toHaveBeenCalledTimes(1); expect(service.list).toHaveBeenCalledTimes(1);
    expect(component.form.disabled).toBe(true); expect(component.form.getRawValue()).toEqual(dates);
    requests[0].next({ ok: true, message: 'Tạo kỳ thành công', data: cycle }); requests[0].complete(); fixture.detectChanges();
    expect(component.saving()).toBe(false); expect(component.form.enabled).toBe(true);
    expect(component.form.getRawValue()).toEqual({ startDate: '', endDate: '' });
    expect(component.cycles()).toEqual([cycle]); expect(component.success()).toContain('thành công');
    expect(fixture.nativeElement.textContent).toContain('01/11/2026 – 30/11/2026');
  });

  it('keeps input on server conflict or failure and permits retry', () => {
    const { component, service, requests } = setup(); component.form.setValue(dates); component.create();
    requests[0].error({ status: 409, error: { message: 'Tháng này đã có kỳ.' } });
    expect(component.error()).toBe('Tháng này đã có kỳ.'); expect(component.form.getRawValue()).toEqual(dates);
    expect(component.saving()).toBe(false); expect(component.form.enabled).toBe(true);
    component.create(); expect(service.create).toHaveBeenCalledTimes(2);
  });

  it('refresh preserves draft and existing rows when loading fails, then allows retry', () => {
    const { component, service } = setup(); component.form.setValue(dates); component.cycles.set([cycle]);
    const list = new Subject<{ ok: boolean; items: RegistrationCycle[] }>(); service.list.mockReturnValue(list);
    component.refresh(); component.refresh(); expect(service.list).toHaveBeenCalledTimes(2);
    list.error({ error: { message: 'Không kết nối được.' } });
    expect(component.loadError()).toBe('Không kết nối được.'); expect(component.cycles()).toEqual([cycle]);
    expect(component.form.getRawValue()).toEqual(dates); expect(component.loading()).toBe(false);
    service.list.mockReturnValue(of({ ok: true, items: [cycle] })); component.refresh();
    expect(component.loadError()).toBe(''); expect(component.cycles()).toEqual([cycle]);
  });
});
