import {
  Injectable,
  computed,
  inject,
  signal
} from '@angular/core';

import {
  HttpClient
} from '@angular/common/http';

import {
  Router
} from '@angular/router';

import {
  Observable,
  catchError,
  finalize,
  lastValueFrom,
  map,
  throwError
} from 'rxjs';

import {
  AuthApiResponse,
  AuthUser,
  ForgotPasswordRequest,
  LoginRequest,
  RegisterRequest,
  ResetPasswordRequest
} from '../models/auth.model';

import {
  environment
} from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class AuthService {

  private readonly http =
    inject(HttpClient);

  private readonly router =
    inject(Router);

  private readonly apiUrl =
    `${environment.apiUrl}/auth`;

  /*
   * Access token chỉ giữ trong memory.
   * Không lưu localStorage.
   */
  private readonly accessTokenSignal =
    signal<string | null>(null);

  /*
   * User hiện tại cũng giữ trong memory.
   */
  private readonly currentUserSignal =
    signal<AuthUser | null>(null);

  readonly accessToken =
    this.accessTokenSignal.asReadonly();

  readonly currentUser =
    this.currentUserSignal.asReadonly();

  readonly isAuthenticated =
    computed(() =>
      Boolean(
        this.accessTokenSignal()
      )
    );

  /*
   * Dùng để tránh nhiều request refresh
   * chạy cùng lúc.
   */
  private refreshInFlight:
    Promise<AuthApiResponse> | null =
      null;

  login(
    payload: LoginRequest
  ): Observable<AuthApiResponse> {

    return this.http
      .post<AuthApiResponse>(
        `${this.apiUrl}/login`,
        payload,
        {
          /*
           * Cho phép browser nhận
           * refresh-token cookie từ backend.
           */
          withCredentials: true
        }
      )
      .pipe(
        map(response => {

          this.persistAuth(
            response
          );

          return response;
        })
      );
  }

  register(
    payload: RegisterRequest
  ): Observable<AuthApiResponse> {

    return this.http
      .post<AuthApiResponse>(
        `${this.apiUrl}/register`,
        payload
      );
  }

  forgotPassword(
    payload: ForgotPasswordRequest
  ): Observable<AuthApiResponse> {

    return this.http
      .post<AuthApiResponse>(
        `${this.apiUrl}/forgot-password`,
        payload
      );
  }

  resetPassword(
    payload: ResetPasswordRequest
  ): Observable<AuthApiResponse> {

    return this.http
      .post<AuthApiResponse>(
        `${this.apiUrl}/reset-password`,
        payload
      );
  }

  refreshAuthToken():
    Observable<AuthApiResponse> {

    /*
     * Không còn check refresh token
     * ở Angular.
     *
     * Angular không biết refresh token
     * là gì vì cookie là HttpOnly.
     */

    if (!this.refreshInFlight) {

      this.refreshInFlight =
        lastValueFrom(

          this.http
            .post<AuthApiResponse>(
              `${this.apiUrl}/refresh-token`,

              /*
               * Không gửi refreshToken
               * trong body nữa.
               */
              {},

              {
                /*
                 * Browser tự attach
                 * HttpOnly cookie.
                 */
                withCredentials: true
              }
            )
            .pipe(

              map(response => {

                this.persistAuth(
                  response
                );

                return response;
              }),

              catchError(error => {

                this.clearAuth();

                return throwError(
                  () => error
                );
              }),

              finalize(() => {

                this.refreshInFlight =
                  null;

              })
            )
        );
    }

    return new Observable<AuthApiResponse>(
      observer => {

        this.refreshInFlight!
          .then(response => {

            observer.next(
              response
            );

            observer.complete();

          })
          .catch(error => {

            observer.error(
              error
            );

          });
      }
    );
  }

  logout():
    Observable<AuthApiResponse> {

    /*
     * Không lấy refresh token nữa.
     *
     * Browser tự gửi cookie.
     */
    return this.http
      .post<AuthApiResponse>(
        `${this.apiUrl}/logout`,
        {},
        {
          withCredentials: true
        }
      )
      .pipe(
        finalize(() => {

          this.clearAuth();

          this.router.navigate([
            '/login'
          ]);

        })
      );
  }

  getAccessToken():
    string | null {

    return this.accessTokenSignal();
  }

  private persistAuth(
    response: AuthApiResponse
  ): void {

    /*
     * Backend chỉ trả:
     *
     * accessToken
     * user
     *
     * Không trả refreshToken.
     */

    this.accessTokenSignal.set(
      response.accessToken ?? null
    );

    if (response.user) {

      this.currentUserSignal.set(
        response.user
      );

    }
  }

  clearAuth(): void {

    this.accessTokenSignal.set(
      null
    );

    this.currentUserSignal.set(
      null
    );
  }
}