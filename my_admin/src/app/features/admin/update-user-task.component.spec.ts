import { TestBed } from '@angular/core/testing';
import { of, Subject, throwError } from 'rxjs';
import { describe, it, expect, vi } from 'vitest';
import { UpdateUserTaskComponent } from './update-user-task.component';
import { AdminService } from '../../core/services/admin.services';
import { UpdateUserTaskResponse } from '../../core/models/admin.model';

function setup(taskId: number | null = 1) {
  const service = {
    getCreateUserOptions: vi.fn(() => of({ ok: true, roles: [], tasks: [
      { id: 1, name: 'Task A' }, { id: 2, name: 'Task B' }
    ] })),
    updateUserTask: vi.fn()
  };
  TestBed.configureTestingModule({
    imports: [UpdateUserTaskComponent], providers: [{ provide: AdminService, useValue: service }]
  });
  const fixture = TestBed.createComponent(UpdateUserTaskComponent);
  fixture.componentRef.setInput('employee', {
    id: 10, fullName: 'Nguyễn An', employeeCode: 'NV001', email: 'an@example.com',
    taskId, taskName: 'Task A', roles: []
  });
  fixture.detectChanges();
  return { fixture, component: fixture.componentInstance, service };
}

describe('UpdateUserTaskComponent', () => {
  it('preselects the current task in a single-select dropdown', () => {
    const { component, fixture } = setup();
    expect(component.taskId.value).toBe(1);
    const select = fixture.nativeElement.querySelector('select') as HTMLSelectElement;
    expect(select.multiple).toBe(false);
    expect(select.selectedOptions[0].textContent).toContain('Task A');
  });

  it('requires a valid task and supports employees without a task', () => {
    const { component, service } = setup(null);
    component.save();
    expect(component.error()).toContain('chọn một task');
    component.taskId.setValue(99);
    component.save();
    expect(service.updateUserTask).not.toHaveBeenCalled();
  });

  it('submits one task, prevents duplicate saves and emits the result', () => {
    const { component, service } = setup();
    const pending = new Subject<UpdateUserTaskResponse>();
    service.updateUserTask.mockReturnValue(pending);
    const saved = vi.fn();
    const busy = vi.fn();
    component.saved.subscribe(saved);
    component.busy.subscribe(busy);
    component.taskId.setValue(2);
    component.save();
    component.save();
    expect(service.updateUserTask).toHaveBeenCalledExactlyOnceWith(10, 2);
    const response = { ok: true, message: 'Saved', employeeId: 10, taskId: 2, taskName: 'Task B' };
    pending.next(response);
    pending.complete();
    expect(saved).toHaveBeenCalledWith(response);
    expect(busy.mock.calls).toEqual([[true], [false]]);
  });

  it('keeps the selected task after an API error', () => {
    const { component, service } = setup();
    service.updateUserTask.mockReturnValue(throwError(() => ({ error: { message: 'Không có quyền.' } })));
    component.taskId.setValue(2);
    component.save();
    expect(component.error()).toBe('Không có quyền.');
    expect(component.taskId.value).toBe(2);
    expect(component.saving()).toBe(false);
  });

  it('shows load errors and allows retry without submitting', () => {
    const { component, service } = setup();
    service.getCreateUserOptions.mockReturnValue(throwError(() => new Error('offline')));
    component.loadTasks();
    expect(component.error()).toContain('Không tải được');
    service.getCreateUserOptions.mockReturnValue(of({ ok: true, roles: [], tasks: [] }));
    component.loadTasks();
    expect(component.tasks()).toEqual([]);
    expect(component.taskId.value).toBe(null);
    expect(service.updateUserTask).not.toHaveBeenCalled();
  });
});
