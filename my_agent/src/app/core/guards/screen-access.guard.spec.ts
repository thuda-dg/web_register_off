import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { of } from 'rxjs';
import { describe, it, expect } from 'vitest';
import { AuthService } from '../services/auth.service';
import { AuthGuard } from './auth.guard';
import { agentLanding, canAccessScreen, screenAccessGuard, AgentScreen } from './screen-access.guard';
import { MainLayoutComponent } from '../../layout/main-layout/main-layout';

const user = (...roles: string[]) => ({ roles: roles.map(roleCode => ({ roleCode })) });
describe('Screen access by role', () => {
  it('EMPLOYEE sees Schedule and History but not Published', () => {
    expect(canAccessScreen(user('EMPLOYEE'), 'schedule')).toBe(true);
    expect(canAccessScreen(user('EMPLOYEE'), 'history')).toBe(true);
    expect(canAccessScreen(user('EMPLOYEE'), 'published')).toBe(false);
    expect(agentLanding(user('EMPLOYEE'))).toBe('/schedule');
  });
  it('TEAM_LEAD sees Published and lands on Approvals instead of Schedule/History', () => {
    expect(canAccessScreen(user('TEAM_LEAD'), 'schedule')).toBe(false);
    expect(canAccessScreen(user('TEAM_LEAD'), 'history')).toBe(false);
    expect(canAccessScreen(user('TEAM_LEAD'), 'published')).toBe(true);
    expect(agentLanding(user('TEAM_LEAD'))).toBe('/approvals');
  });
  it('preserves access for other roles and applies restrictions to legacy multiple-role accounts', () => {
    for (const role of ['ADMIN', 'WFM']) for (const screen of ['schedule', 'history', 'published'] as AgentScreen[]) {
      expect(canAccessScreen(user(role), screen)).toBe(true);
    }
    for (const screen of ['schedule', 'history', 'published'] as AgentScreen[]) {
      expect(canAccessScreen(user('EMPLOYEE', 'TEAM_LEAD'), screen)).toBe(false);
    }
    expect(agentLanding(user('EMPLOYEE', 'TEAM_LEAD'))).toBe('/approvals');
  });
  it('guards direct navigation after session restoration and redirects to an allowed page', () => {
    let current = user('EMPLOYEE');
    TestBed.configureTestingModule({ providers: [provideRouter([]),
      { provide: AuthService, useValue: { currentUser: () => current } },
      { provide: AuthGuard, useValue: { canActivate: () => of(true) } }
    ] });
    const check = (screen: AgentScreen, expected: string) => {
      const result = TestBed.runInInjectionContext(() => screenAccessGuard(screen)({} as never, {} as never));
      (result as any).subscribe((value: any) => expect(TestBed.inject(Router).serializeUrl(value)).toBe(expected));
    };
    check('published', '/schedule'); current = user('TEAM_LEAD');
    check('schedule', '/approvals'); check('history', '/approvals');
  });
  it('keeps login redirection when session restoration fails', () => {
    TestBed.configureTestingModule({ providers: [provideRouter([]),
      { provide: AuthService, useValue: { currentUser: () => null } },
      { provide: AuthGuard, useValue: { canActivate: () => TestBed.inject(Router).createUrlTree(['/login']) } }
    ] });
    const result = TestBed.runInInjectionContext(() => screenAccessGuard('published')({} as never, {} as never));
    expect(TestBed.inject(Router).serializeUrl(result as any)).toBe('/login');
  });
  it('hides Published in the employee menu while keeping Schedule/History', () => {
    TestBed.configureTestingModule({ imports: [MainLayoutComponent], providers: [provideRouter([]),
      { provide: AuthService, useValue: { currentUser: () => ({ ...user('EMPLOYEE'), empName: 'Nguyễn An', empCode: 'E002', team: { teamId: 1, teamCode: 'A', teamName: 'Team A' } }) } }
    ] });
    const fixture = TestBed.createComponent(MainLayoutComponent); fixture.detectChanges();
    const header = fixture.nativeElement.querySelector('header').textContent;
    expect(header).toContain('Nguyễn An'); expect(header).toContain('E002'); expect(header).not.toContain('Team A');
    expect(fixture.nativeElement.querySelector('[href="/published"]')).toBeNull();
    expect(fixture.nativeElement.querySelector('[href="/schedule"]')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('[href="/history"]')).not.toBeNull();
  });
});
