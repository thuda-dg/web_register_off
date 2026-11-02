import { TestBed } from '@angular/core/testing';
import { of, Subject, throwError } from 'rxjs';
import { describe, it, expect, vi } from 'vitest';
import { UpdateUserRolesComponent } from './update-user-roles.component';
import { AdminService } from '../../core/services/admin.services';
import { UpdateUserRolesResponse } from '../../core/models/admin.model';

function setup(loadError = false) {
  const options = { ok: true, teams: [], roles: [
    { id: 1, name: 'Employee', code: 'EMPLOYEE' }, { id: 2, name: 'Admin', code: 'ADMIN' }
  ] };
  const service = {
    getCreateUserOptions: vi.fn(() => loadError ? throwError(() => new Error('offline')) : of(options)),
    updateUserRoles: vi.fn()
  };
  TestBed.configureTestingModule({
    imports: [UpdateUserRolesComponent], providers: [{ provide: AdminService, useValue: service }]
  });
  const fixture = TestBed.createComponent(UpdateUserRolesComponent);
  fixture.componentRef.setInput('employee', {
    id: 10, fullName: 'Nguyễn An', employeeCode: 'NV001', email: 'an@example.com',
    teamId: null, teamName: null, roles: [{ id: 1, name: 'Employee' }]
  });
  fixture.detectChanges();
  return { fixture, component: fixture.componentInstance, service, options };
}

describe('UpdateUserRolesComponent', () => {
  it('preselects current roles and supports multiple selections', () => {
    const { component, fixture } = setup();
    expect(component.selectedIds()).toEqual([1]);
    expect(fixture.nativeElement.textContent).toContain('Nguyễn An');
    component.toggleRole(2, true);
    component.toggleRole(2, true);
    expect(component.selectedIds()).toEqual([1, 2]);
    component.toggleRole(1, false);
    expect(component.selectedIds()).toEqual([2]);
  });

  it('does not save an empty selection', () => {
    const { component, service } = setup();
    component.toggleRole(1, false);
    component.save();
    expect(service.updateUserRoles).not.toHaveBeenCalled();
    expect(component.error()).toContain('ít nhất một role');
  });

  it('sends the employee id, prevents duplicate saves and emits the saved roles', () => {
    const { component, service } = setup();
    const pending = new Subject<UpdateUserRolesResponse>();
    service.updateUserRoles.mockReturnValue(pending);
    const saved = vi.fn();
    const busy = vi.fn();
    component.saved.subscribe(saved);
    component.busy.subscribe(busy);
    component.toggleRole(2, true);
    component.save();
    component.save();
    expect(service.updateUserRoles).toHaveBeenCalledExactlyOnceWith(10, [1, 2]);
    const response = { ok: true, message: 'Saved', employeeId: 10, roles: [{ id: 2, name: 'Admin' }] };
    pending.next(response);
    pending.complete();
    expect(saved).toHaveBeenCalledWith(response);
    expect(busy.mock.calls).toEqual([[true], [false]]);
    expect(component.saving()).toBe(false);
  });

  it('preserves selection on API failure and allows retry', () => {
    const { component, service } = setup();
    service.updateUserRoles.mockReturnValue(throwError(() => ({ error: { message: 'Không có quyền.' } })));
    component.save();
    expect(component.error()).toBe('Không có quyền.');
    expect(component.selectedIds()).toEqual([1]);
    expect(component.saving()).toBe(false);
  });

  it('allows retrying role loading and cancelling without writes', () => {
    const { component, service, options } = setup(true);
    expect(component.loaded()).toBe(false);
    component.save();
    expect(service.updateUserRoles).not.toHaveBeenCalled();
    service.getCreateUserOptions.mockReturnValue(of(options));
    component.loadRoles();
    expect(component.loaded()).toBe(true);
    const cancelled = vi.fn();
    component.cancelled.subscribe(cancelled);
    component.cancelled.emit();
    expect(cancelled).toHaveBeenCalledOnce();
    expect(service.updateUserRoles).not.toHaveBeenCalled();
  });
});
