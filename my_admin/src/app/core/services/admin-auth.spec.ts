import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { provideRouter, Router } from '@angular/router';
import { of } from 'rxjs';
import { describe, it, expect } from 'vitest';
import { AuthService } from './auth.services';
import { AuthGuard } from '../guards/auth.guard';
import { environment } from '../../../environments/environment';

const response = (role: string) => ({ ok: true, message: 'OK', accessToken: 'test-token', user: { roles: [{ roleCode: role }] } });
function setup() {
  TestBed.configureTestingModule({ providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()] });
  return { auth: TestBed.inject(AuthService), http: TestBed.inject(HttpTestingController) };
}
describe('ADMIN-only authentication', () => {
  it('uses admin login with credentials and persists only ADMIN', () => {
    const { auth, http } = setup(); let failure: any;
    auth.login({ identifier: 'NV003', password: 'test' }).subscribe({ error: error => failure = error });
    const request = http.expectOne(`${environment.apiUrl}/auth/admin/login`);
    expect(request.request.withCredentials).toBe(true); request.flush(response('EMPLOYEE'));
    expect(failure.status).toBe(403); expect(auth.getAccessToken()).toBeNull(); expect(auth.currentUser()).toBeNull();
    auth.login({ identifier: 'vienvietvo', password: 'test' }).subscribe();
    http.expectOne(`${environment.apiUrl}/auth/admin/login`).flush(response('ADMIN'));
    expect(auth.currentUser()?.roles?.[0].roleCode).toBe('ADMIN'); http.verify();
  });
  it('refresh uses admin endpoint, clears state if ADMIN was revoked', async () => {
    const { auth, http } = setup(); let failure: any;
    const done = new Promise<void>(resolve => auth.refreshAuthToken().subscribe({ error: error => { failure = error; resolve(); } }));
    const request = http.expectOne(`${environment.apiUrl}/auth/admin/refresh-token`);
    expect(request.request.withCredentials).toBe(true); request.flush(response('TEAM_LEAD')); await done;
    expect(failure.status).toBe(403); expect(auth.getAccessToken()).toBeNull(); http.verify();
  });
  it('guards direct URLs against existing non-admin tokens and checks restored sessions', () => {
    let role = 'EMPLOYEE', token: string | null = 'test-token';
    const auth = { getAccessToken: () => token, currentUser: () => ({ roles: [{ roleCode: role }] }), clearAuth: () => {}, refreshAuthToken: () => of(response(role)) };
    TestBed.configureTestingModule({ providers: [provideRouter([]), { provide: AuthService, useValue: auth }] });
    const guard = TestBed.inject(AuthGuard), router = TestBed.inject(Router);
    expect(router.serializeUrl(guard.canActivate() as any)).toBe('/login');
    role = 'ADMIN'; expect(guard.canActivate()).toBe(true);
    role = 'TEAM_LEAD'; token = null;
    (guard.canActivate() as any).subscribe((value: any) => expect(router.serializeUrl(value)).toBe('/login'));
  });
});
