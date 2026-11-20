import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { of, Subject } from 'rxjs';
import { describe, it, expect, vi } from 'vitest';
import { RequireHcImport } from './require-hc-import';
import { RequireHcImportService } from '../../core/services/require-hc-import.service';
import { ImportPreview, ImportResult } from '../../core/models/require-hc-import.model';
import { AuthService } from '../../core/services/auth.services';
import { AuthGuard } from '../../core/guards/auth.guard';
import { adminGuard } from '../../core/guards/admin.guard';
import { environment } from '../../../environments/environment';

const cycle = { id: 2, name: 'Kỳ 11', startDate: '2026-11-13', endDate: '2026-11-20', status: 'OPEN' };
const preview = { cycleId: 2, rowCount: 1, rows: [{ row: 2, workingDate: '2026-11-17', task: 'MASS', taskId: 1, maxOff: 2 }] };
function choose(component: RequireHcImport, file = new File(['test'], 'capacity.xlsx')) {
  component.chooseFile({ target: { files: [file], value: 'fake-path' } } as unknown as Event);
}
function setup() {
  const previews: Subject<ImportPreview>[] = [], imports: Subject<ImportResult>[] = [];
  const service = {
    cycles: vi.fn(() => of({ ok: true, items: [cycle] })),
    preview: vi.fn((_file: File, _id: number) => { const request = new Subject<ImportPreview>(); previews.push(request); return request; }),
    import: vi.fn((_file: File, _id: number) => { const request = new Subject<ImportResult>(); imports.push(request); return request; })
  };
  TestBed.configureTestingModule({ imports: [RequireHcImport], providers: [provideRouter([]), { provide: RequireHcImportService, useValue: service }] });
  const fixture = TestBed.createComponent(RequireHcImport); fixture.detectChanges();
  const component = fixture.componentInstance; component.changeCycle(2); choose(component);
  return { component, fixture, service, previews, imports };
}

describe('RequireHC Excel import', () => {
  it('posts a real multipart Excel file, cycle and mode without overriding Content-Type', () => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    const http = TestBed.inject(HttpTestingController); const service = TestBed.inject(RequireHcImportService);
    const file = new File(['xlsx'], 'data.xlsx');
    service.cycles().subscribe(); http.expectOne(`${environment.apiUrl}/admin/require-hc/cycles`).flush({ ok: true, items: [cycle] });
    service.preview(file, 2).subscribe();
    let request = http.expectOne(`${environment.apiUrl}/admin/require-hc/import`);
    expect(request.request.method).toBe('POST'); expect(request.request.body.get('file').name).toBe('data.xlsx');
    expect(request.request.body.get('mode')).toBe('preview'); expect(request.request.body.get('cycleId')).toBe('2');
    expect(request.request.headers.has('Content-Type')).toBe(false); request.flush({ ok: true, data: preview });
    service.import(file, 2).subscribe(); request = http.expectOne(`${environment.apiUrl}/admin/require-hc/import`);
    expect(request.request.body.get('mode')).toBe('import'); request.flush({ ok: true, message: 'OK', data: { cycleId: 2, imported: 1 } }); http.verify();
  });

  it('requires preview and blocks invalid extensions and oversized files', () => {
    const { component, service } = setup();
    component.import(); expect(service.import).not.toHaveBeenCalled();
    choose(component, new File(['csv'], 'data.csv')); expect(component.file()).toBeNull(); expect(component.error()).toContain('Excel');
    choose(component, new File([new Uint8Array(5 * 1024 * 1024 + 1)], 'large.xlsx'));
    expect(component.file()).toBeNull(); expect(component.error()).toContain('5 MB');
    component.validate(); expect(service.preview).not.toHaveBeenCalled();
  });

  it('renders preview, imports once and requires a new preview after completion', () => {
    const { fixture, component, service, previews, imports } = setup();
    component.validate(); component.validate(); expect(service.preview).toHaveBeenCalledTimes(1);
    previews[0].next({ ok: true, data: preview }); previews[0].complete(); fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('MASS'); expect(component.preview()?.rowCount).toBe(1);
    component.import(); component.import(); expect(service.import).toHaveBeenCalledTimes(1);
    imports[0].next({ ok: true, message: 'Đã nhập 1 dòng', data: { imported: 1, cycleId: 2 } }); imports[0].complete();
    expect(component.preview()).toBeNull(); expect(component.success()).toContain('1 dòng');
    component.import(); expect(service.import).toHaveBeenCalledTimes(1);
  });

  it('invalidates preview when file/cycle changes and freezes changes during requests', () => {
    const { component, previews } = setup();
    component.validate(); component.changeCycle(9); expect(component.cycleId()).toBe(2);
    previews[0].next({ ok: true, data: preview }); previews[0].complete();
    component.changeCycle(9); expect(component.preview()).toBeNull();
    component.changeCycle(2); component.validate(); previews[1].next({ ok: true, data: preview }); previews[1].complete();
    choose(component, new File(['new'], 'new.xls')); expect(component.preview()).toBeNull();
  });

  it('shows row-level server errors, keeps file and allows revalidation', () => {
    const { component, service, previews } = setup(); component.validate();
    previews[0].error({ error: { message: 'File lỗi', errors: [{ row: 3, message: 'Sai task' }] } });
    expect(component.rowErrors()[0].row).toBe(3); expect(component.file()).not.toBeNull(); expect(component.working()).toBe(false);
    component.validate(); expect(service.preview).toHaveBeenCalledTimes(2);
  });

  it('checks ADMIN for direct navigation, including after session restoration', () => {
    let role = 'TEAM_LEAD';
    TestBed.configureTestingModule({ providers: [provideRouter([]),
      { provide: AuthService, useValue: { currentUser: () => ({ roles: [{ roleCode: role }] }) } },
      { provide: AuthGuard, useValue: { canActivate: () => of(true) } }
    ] });
    let result: any;
    (TestBed.runInInjectionContext(() => adminGuard({} as never, {} as never)) as any).subscribe((value: any) => result = value);
    expect(TestBed.inject(Router).serializeUrl(result)).toBe('/login');
    role = 'ADMIN';
    (TestBed.runInInjectionContext(() => adminGuard({} as never, {} as never)) as any).subscribe((value: any) => result = value);
    expect(result).toBe(true);
  });
});
