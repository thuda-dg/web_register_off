import { Injectable, inject } from '@angular/core';

import {
  HttpErrorResponse,
  HttpEvent,
  HttpHandler,
  HttpInterceptor,
  HttpRequest
} from '@angular/common/http';

import {
  Observable,
  catchError,
  switchMap,
  throwError
} from 'rxjs';

import { Router } from '@angular/router';

import { AuthService } from '../services/auth.service';


@Injectable()
export class AuthInterceptor implements HttpInterceptor {

  private readonly authService =
    inject(AuthService);

  private readonly router =
    inject(Router);


  intercept(
    req: HttpRequest<unknown>,
    next: HttpHandler
  ): Observable<HttpEvent<unknown>> {

    // =========================================================
    // AUTH API
    // Không tự gắn access token và không tự refresh
    // =========================================================

    if (this.isAuthRoute(req.url)) {

      console.log(
        '[AUTH INTERCEPTOR] Auth route:',
        req.url
      );

      return next.handle(req);
    }


    // =========================================================
    // LẤY ACCESS TOKEN
    // =========================================================

    const token =
      this.authService.getAccessToken();


    console.log(
      '[AUTH INTERCEPTOR] Request:',
      req.method,
      req.url
    );

    console.log(
      '[AUTH INTERCEPTOR] Access token exists:',
      !!token
    );


    // =========================================================
    // GẮN ACCESS TOKEN
    // =========================================================

    if (token) {

      req = req.clone({
        setHeaders: {
          Authorization:
            `Bearer ${token}`
        }
      });

      console.log(
        '[AUTH INTERCEPTOR] Authorization header attached.'
      );
    }


    // =========================================================
    // GỬI REQUEST
    // =========================================================

    return next
      .handle(req)
      .pipe(

        catchError(
          (error: HttpErrorResponse) => {

            // =================================================
            // KHÔNG PHẢI 401
            // =================================================

            if (error.status !== 401) {

              console.error(
                '[AUTH INTERCEPTOR] API error:',
                {
                  url:
                    req.url,

                  status:
                    error.status,

                  message:
                    error.message,

                  body:
                    error.error
                }
              );

              return throwError(
                () => error
              );
            }


            // =================================================
            // REQUEST BỊ 401
            // =================================================

            console.warn(
              '[AUTH INTERCEPTOR] API returned 401:',
              req.method,
              req.url
            );


            const refreshToken =
              this.authService
                .getRefreshToken();


            console.log(
              '[AUTH INTERCEPTOR] Refresh token exists:',
              !!refreshToken
            );


            // Không có refresh token
            // => logout luôn.
            if (!refreshToken) {

              console.warn(
                '[AUTH INTERCEPTOR] No refresh token. Logging out.'
              );

              this.logout();

              return throwError(
                () => error
              );
            }


            // =================================================
            // THỬ REFRESH ACCESS TOKEN
            // =================================================

            console.log(
              '[AUTH INTERCEPTOR] Trying to refresh access token...'
            );


            return this.authService
              .refreshAuthToken()
              .pipe(

                // =============================================
                // REFRESH THÀNH CÔNG
                // =============================================

                switchMap(
                  (response) => {

                    console.log(
                      '[AUTH INTERCEPTOR] Refresh response:',
                      response
                    );


                    const refreshedToken =
                      this.authService
                        .getAccessToken();


                    if (!refreshedToken) {

                      console.error(
                        '[AUTH INTERCEPTOR] Refresh succeeded but no access token was stored.'
                      );

                      this.logout();

                      return throwError(
                        () =>
                          new Error(
                            'Không nhận được access token mới.'
                          )
                      );
                    }


                    console.log(
                      '[AUTH INTERCEPTOR] Access token refreshed successfully.'
                    );


                    // =========================================
                    // RETRY REQUEST CŨ
                    // =========================================

                    const retriedRequest =
                      req.clone({
                        setHeaders: {
                          Authorization:
                            `Bearer ${refreshedToken}`
                        }
                      });


                    console.log(
                      '[AUTH INTERCEPTOR] Retrying request:',
                      retriedRequest.method,
                      retriedRequest.url
                    );


                    return next.handle(
                      retriedRequest
                    );
                  }
                ),


                // =============================================
                // REFRESH HOẶC RETRY THẤT BẠI
                // =============================================

                catchError(
                  (
                    refreshError:
                      HttpErrorResponse | Error
                  ) => {

                    console.error(
                      '[AUTH INTERCEPTOR] Refresh/retry failed:',
                      refreshError
                    );


                    if (
                      refreshError instanceof
                      HttpErrorResponse
                    ) {

                      console.error(
                        '[AUTH INTERCEPTOR] Status:',
                        refreshError.status
                      );

                      console.error(
                        '[AUTH INTERCEPTOR] Response body:',
                        refreshError.error
                      );
                    }


                    this.logout();


                    return throwError(
                      () => refreshError
                    );
                  }
                )
              );
          }
        )
      );
  }


  // =========================================================
  // LOGOUT LOCAL
  // =========================================================

  private logout(): void {

    console.warn(
      '[AUTH INTERCEPTOR] Clearing authentication and redirecting to login.'
    );


    this.authService
      .clearAuth();


    this.router
      .navigate([
        '/login'
      ]);
  }


  // =========================================================
  // AUTH ROUTES
  // =========================================================

  private isAuthRoute(
    url: string
  ): boolean {

    return /\/api\/auth\/(login|register|refresh-token|forgot-password|reset-password|logout)/
      .test(url);
  }
}