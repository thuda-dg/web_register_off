import { Injectable, computed, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, catchError, finalize, lastValueFrom, map, throwError } from 'rxjs';
import { AuthApiResponse, AuthUser, ForgotPasswordRequest, LoginRequest, RegisterRequest, ResetPasswordRequest } from '../models/auth.model';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);

  private readonly apiUrl = `${environment.apiUrl}/auth`;
  private readonly accessTokenKey = 'access_token';
  private readonly refreshTokenKey = 'refresh_token';

  private readonly accessTokenSignal = signal<string | null>(this.readStorage(this.accessTokenKey));
  private readonly refreshTokenSignal = signal<string | null>(this.readStorage(this.refreshTokenKey));
  private readonly currentUserSignal = signal<AuthUser | null>(null);

  readonly accessToken = this.accessTokenSignal.asReadonly();
  readonly refreshToken = this.refreshTokenSignal.asReadonly();
  readonly currentUser = this.currentUserSignal.asReadonly();
  readonly isAuthenticated = computed(() => Boolean(this.accessTokenSignal()));

  private refreshInFlight: Promise<AuthApiResponse> | null = null;

  constructor() {
    const storedUser = this.readStorage('auth_user');
    if (storedUser) {
      this.currentUserSignal.set(JSON.parse(storedUser));
    }
  }

  login(payload: LoginRequest): Observable<AuthApiResponse> {
    return this.http.post<AuthApiResponse>(`${this.apiUrl}/login`, payload).pipe(
      map((response) => {
        this.persistAuth(response);
        return response;
      })
    );
  }

  register(payload: RegisterRequest): Observable<AuthApiResponse> {
    return this.http.post<AuthApiResponse>(`${this.apiUrl}/register`, payload);
  }

  forgotPassword(payload: ForgotPasswordRequest): Observable<AuthApiResponse> {
    return this.http.post<AuthApiResponse>(`${this.apiUrl}/forgot-password`, payload);
  }

  resetPassword(payload: ResetPasswordRequest): Observable<AuthApiResponse> {
    return this.http.post<AuthApiResponse>(`${this.apiUrl}/reset-password`, payload);
  }

  refreshAuthToken(): Observable<AuthApiResponse> {
    const currentRefreshToken = this.getRefreshToken();

    if (!currentRefreshToken) {
      this.clearAuth();
      return throwError(() => new Error('Refresh token is missing.'));
    }

    if (!this.refreshInFlight) {
      this.refreshInFlight = lastValueFrom(
        this.http
          .post<AuthApiResponse>(`${this.apiUrl}/refresh-token`, {
            refreshToken: currentRefreshToken
          })
          .pipe(
            map((response) => {
              this.persistAuth(response);
              return response;
            }),
            catchError((error) => {
              this.clearAuth();
              throw error;
            }),
            finalize(() => {
              this.refreshInFlight = null;
            })
          )
      );
    }

    return new Observable<AuthApiResponse>((observer) => {
      this.refreshInFlight!
        .then((response) => {
          observer.next(response);
          observer.complete();
        })
        .catch((error) => {
          observer.error(error);
        });
    });
  }

  logout(): Observable<AuthApiResponse> {
    const refreshTokenValue = this.getRefreshToken();

    return this.http.post<AuthApiResponse>(`${this.apiUrl}/logout`, { refreshToken: refreshTokenValue }).pipe(
      finalize(() => {
        this.clearAuth();
        this.router.navigate(['/login']);
      })
    );
  }

  getAccessToken(): string | null {
    return this.accessTokenSignal();
  }

  getRefreshToken(): string | null {
    return this.refreshTokenSignal();
  }

  private persistAuth(response: AuthApiResponse): void {
    const nextAccessToken = response.accessToken ?? null;
    const nextRefreshToken = response.refreshToken ?? this.getRefreshToken();

    this.accessTokenSignal.set(nextAccessToken);
    this.refreshTokenSignal.set(nextRefreshToken);
    this.currentUserSignal.set(response.user ?? this.currentUserSignal());

    if (nextAccessToken) {
      this.writeStorage(this.accessTokenKey, nextAccessToken);
    } else {
      this.removeStorage(this.accessTokenKey);
    }

    if (nextRefreshToken) {
      this.writeStorage(this.refreshTokenKey, nextRefreshToken);
    } else {
      this.removeStorage(this.refreshTokenKey);
    }

    if (response.user) {
      this.writeStorage('auth_user', JSON.stringify(response.user));
    } else {
      this.removeStorage('auth_user');
    }
  }

  clearAuth(): void {
    this.accessTokenSignal.set(null);
    this.refreshTokenSignal.set(null);
    this.currentUserSignal.set(null);
    this.removeStorage(this.accessTokenKey);
    this.removeStorage(this.refreshTokenKey);
    this.removeStorage('auth_user');
  }

  private readStorage(key: string): string | null {
    if (typeof window === 'undefined') {
      return null;
    }

    return window.localStorage.getItem(key);
  }

  private writeStorage(key: string, value: string): void {
    if (typeof window === 'undefined') {
      return;
    }

    window.localStorage.setItem(key, value);
  }

  private removeStorage(key: string): void {
    if (typeof window === 'undefined') {
      return;
    }

    window.localStorage.removeItem(key);
  }
}
