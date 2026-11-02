import { TestBed } from '@angular/core/testing';
import { of, Subject, throwError } from 'rxjs';
import { describe, it, expect, vi } from 'vitest';
import { CreateUserComponent } from './create-user.component';
import { AdminService } from '../../core/services/admin.services';
import { CreateUserResponse } from '../../core/models/admin.model';

function setup() {
  const service = {
    getCreateUserOptions: vi.fn(() => of({
      ok: true, teams: [{ id: 2, name: 'Team A' }],
      roles: [{ id: 1, name: 'Employee', code: 'EMPLOYEE' }]
    })),
    createUser: vi.fn()
  };
  TestBed.configureTestingModule({
    imports: [CreateUserComponent], providers: [{ provide: AdminService, useValue: service }]
  });
  const fixture = TestBed.createComponent(CreateUserComponent);
  fixture.detectChanges();
  const component = fixture.componentInstance;
  return { fixture, component, service };
}

function fill(component: CreateUserComponent) {
  component.form.patchValue({
    employeeCode: ' NV001 ', fullName: ' Nguyễn An ', email: 'AN@example.com',
    password: 'password-123', confirmPassword: 'password-123'
  });
}

describe('CreateUserComponent', () => {
  it('loads options and selects the employee role by default', () => {
    const { component, fixture } = setup();
    expect(component.form.controls.roleIds.value).toEqual([1]);
    expect(fixture.nativeElement.textContent).toContain('Team A');
  });

  it('blocks invalid input, mismatched passwords and oversized UTF-8 passwords', () => {
    const { component, service } = setup();
    component.submit();
    expect(service.createUser).not.toHaveBeenCalled();
    fill(component);
    component.form.controls.confirmPassword.setValue('different');
    component.submit();
    expect(component.error()).toContain('không khớp');
    const password = 'ế'.repeat(30);
    component.form.patchValue({ password, confirmPassword: password });
    component.submit();
    expect(component.error()).toContain('72 byte');
    expect(service.createUser).not.toHaveBeenCalled();
  });

  it('normalizes input, prevents duplicate submissions and emits the created employee', () => {
    const { component, service } = setup();
    const pending = new Subject<CreateUserResponse>();
    service.createUser.mockReturnValue(pending);
    const created = vi.fn();
    component.created.subscribe(created);
    fill(component);
    component.submit();
    component.submit();
    expect(service.createUser).toHaveBeenCalledTimes(1);
    expect(service.createUser).toHaveBeenCalledWith({
      employeeCode: 'NV001', fullName: 'Nguyễn An', email: 'an@example.com',
      password: 'password-123', teamId: null, roleIds: [1]
    });
    const item = { id: 10, employeeCode: 'NV001', fullName: 'Nguyễn An', email: 'an@example.com', teamId: null, teamName: null, roles: [] };
    pending.next({ ok: true, message: 'Created', item });
    pending.complete();
    expect(created).toHaveBeenCalledWith(item);
    expect(component.form.controls.password.value).toBe('');
    expect(component.saving()).toBe(false);
  });

  it('shows API errors and allows retry without losing form input', () => {
    const { component, service } = setup();
    service.createUser.mockReturnValue(throwError(() => ({ error: { message: 'Email đã tồn tại.' } })));
    fill(component);
    component.submit();
    expect(component.error()).toBe('Email đã tồn tại.');
    expect(component.saving()).toBe(false);
    expect(component.form.controls.employeeCode.value).toBe(' NV001 ');
  });
});
