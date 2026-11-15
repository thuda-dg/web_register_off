import { TestBed } from '@angular/core/testing';
import { Subject } from 'rxjs';
import { describe, it, expect, vi } from 'vitest';
import { Schedule } from './schedule';
import { RegistrationService } from '../../core/services/registration.service';
import { AuthService } from '../../core/services/auth.service';
import { BootstrapData } from '../../core/models/registration.model';

function setup() {
  const validation = new Subject<any>();
  const submission = new Subject<any>();
  const service = {
    validateRegistration: vi.fn((_payload: unknown) => validation),
    submitRegistration: vi.fn((_payload: unknown) => submission)
  };
  TestBed.configureTestingModule({ providers: [
    { provide: RegistrationService, useValue: service },
    { provide: AuthService, useValue: {} }
  ] });
  const fixture = TestBed.createComponent(Schedule);
  const component = fixture.componentInstance;
  // No ngOnInit: isolate submission from bootstrap HTTP/calendar setup.
  component.bootstrapData = {
    cycle: { cycleId: 2, isRegistrationOpen: true }, leaveTypes: []
  } as unknown as BootstrapData;
  component.selectedDates = ['2026-11-15'];
  component.entryByDate = { '2026-11-15': { date: '2026-11-15', type: 'OFF', reason: '' } };
  return { component, service, validation, submission };
}

describe('Schedule confirmation payload', () => {
  it('locks removal while validation is pending and submits the validated snapshot', () => {
    const { component, service, validation } = setup();
    component.submit();
    component.removeDate('2026-11-15');
    component.submit();
    expect(component.selectedDates).toEqual(['2026-11-15']);
    expect(service.validateRegistration).toHaveBeenCalledTimes(1);
    validation.next({ valid: true });
    validation.complete();
    expect(component.confirmOpen).toBe(true);
    expect(component.editingLocked).toBe(true);
    // Even if unrelated async code clears the live selection, confirmation is stable.
    component.selectedDates = [];
    component.entryByDate = {};
    component.doSubmit();
    expect(service.submitRegistration).toHaveBeenCalledWith({
      cycleId: 2, entries: [{ leaveDate: '2026-11-15', leaveTypeCode: 'OFF', reasonId: null }]
    });
    component.doSubmit();
    expect(service.submitRegistration).toHaveBeenCalledTimes(1);
  });

  it('uses the validated type and cycle even if live data changes', () => {
    const { component, service, validation } = setup();
    component.submit();
    component.entryByDate['2026-11-15'].type = 'A';
    component.bootstrapData!.cycle.cycleId = 99;
    validation.next({ valid: true });
    validation.complete();
    component.doSubmit();
    expect(service.submitRegistration.mock.calls[0][0]).toEqual({
      cycleId: 2, entries: [{ leaveDate: '2026-11-15', leaveTypeCode: 'OFF', reasonId: null }]
    });
  });

  it('requires a fresh validation after cancelling and never submits empty entries', () => {
    const { component, service, validation } = setup();
    component.doSubmit();
    expect(service.submitRegistration).not.toHaveBeenCalled();
    component.submit();
    validation.next({ valid: true });
    validation.complete();
    component.closeConfirm();
    expect(component.editingLocked).toBe(false);
    component.doSubmit();
    expect(service.submitRegistration).not.toHaveBeenCalled();
  });

  it('does not open confirmation on invalid validation and unlocks after failure', () => {
    const { component, service, validation } = setup();
    component.submit();
    validation.next({ valid: false, errors: [{ message: 'Ngày không hợp lệ' }] });
    validation.complete();
    expect(component.confirmOpen).toBe(false);
    expect(component.editingLocked).toBe(false);
    component.doSubmit();
    expect(service.submitRegistration).not.toHaveBeenCalled();
  });

  it('unlocks and clears stale confirmation when submission fails', () => {
    const { component, service, validation, submission } = setup();
    component.submit();
    validation.next({ valid: true });
    validation.complete();
    component.doSubmit();
    submission.error({ error: { message: 'Không lưu được' } });
    expect(component.editingLocked).toBe(false);
    expect(component.errorMessage).toBe('Không lưu được');
    component.doSubmit();
    expect(service.submitRegistration).toHaveBeenCalledTimes(1);
  });
});
