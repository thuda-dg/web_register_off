import { TestBed } from '@angular/core/testing';
import { of, Subject, throwError } from 'rxjs';
import { describe, it, expect, vi } from 'vitest';
import { UpdateUserTeamComponent } from './update-user-team.component';
import { AdminService } from '../../core/services/admin.services';
import { UpdateUserTeamResponse } from '../../core/models/admin.model';

function setup(teamId: number | null = 1) {
  const service = {
    getCreateUserOptions: vi.fn(() => of({ ok: true, roles: [], teams: [
      { id: 1, name: 'Team A' }, { id: 2, name: 'Team B' }
    ] })),
    updateUserTeam: vi.fn()
  };
  TestBed.configureTestingModule({
    imports: [UpdateUserTeamComponent], providers: [{ provide: AdminService, useValue: service }]
  });
  const fixture = TestBed.createComponent(UpdateUserTeamComponent);
  fixture.componentRef.setInput('employee', {
    id: 10, fullName: 'Nguyễn An', employeeCode: 'NV001', email: 'an@example.com',
    teamId, teamName: 'Team A', roles: []
  });
  fixture.detectChanges();
  return { fixture, component: fixture.componentInstance, service };
}

describe('UpdateUserTeamComponent', () => {
  it('preselects the current team in a single-select dropdown', () => {
    const { component, fixture } = setup();
    expect(component.teamId.value).toBe(1);
    const select = fixture.nativeElement.querySelector('select') as HTMLSelectElement;
    expect(select.multiple).toBe(false);
    expect(select.selectedOptions[0].textContent).toContain('Team A');
  });

  it('requires a valid team and supports employees without a team', () => {
    const { component, service } = setup(null);
    component.save();
    expect(component.error()).toContain('chọn một team');
    component.teamId.setValue(99);
    component.save();
    expect(service.updateUserTeam).not.toHaveBeenCalled();
  });

  it('submits one team, prevents duplicate saves and emits the result', () => {
    const { component, service } = setup();
    const pending = new Subject<UpdateUserTeamResponse>();
    service.updateUserTeam.mockReturnValue(pending);
    const saved = vi.fn();
    const busy = vi.fn();
    component.saved.subscribe(saved);
    component.busy.subscribe(busy);
    component.teamId.setValue(2);
    component.save();
    component.save();
    expect(service.updateUserTeam).toHaveBeenCalledExactlyOnceWith(10, 2);
    const response = { ok: true, message: 'Saved', employeeId: 10, teamId: 2, teamName: 'Team B' };
    pending.next(response);
    pending.complete();
    expect(saved).toHaveBeenCalledWith(response);
    expect(busy.mock.calls).toEqual([[true], [false]]);
  });

  it('keeps the selected team after an API error', () => {
    const { component, service } = setup();
    service.updateUserTeam.mockReturnValue(throwError(() => ({ error: { message: 'Không có quyền.' } })));
    component.teamId.setValue(2);
    component.save();
    expect(component.error()).toBe('Không có quyền.');
    expect(component.teamId.value).toBe(2);
    expect(component.saving()).toBe(false);
  });

  it('shows load errors and allows retry without submitting', () => {
    const { component, service } = setup();
    service.getCreateUserOptions.mockReturnValue(throwError(() => new Error('offline')));
    component.loadTeams();
    expect(component.error()).toContain('Không tải được');
    service.getCreateUserOptions.mockReturnValue(of({ ok: true, roles: [], teams: [] }));
    component.loadTeams();
    expect(component.teams()).toEqual([]);
    expect(component.teamId.value).toBe(null);
    expect(service.updateUserTeam).not.toHaveBeenCalled();
  });
});
