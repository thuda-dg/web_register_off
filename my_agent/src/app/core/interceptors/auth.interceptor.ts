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
    //
    // Các API auth tự xử lý cookie / credentials.
    // Không gắn access token.
    // Không tự refresh.
    //
    // Đặc biệt phải bỏ qua /refresh-token để tránh vòng lặp:
    //
    // refresh -> 401 -> interceptor -> refresh -> 401 -> ...
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

    const accessToken =
      this.authService.getAccessToken();

    console.log(
      '[AUTH INTERCEPTOR] Request:',
      req.method,
      req.url
    );

    console.log(
      '[AUTH INTERCEPTOR] Access token exists:',
      !!accessToken
    );

    // =========================================================
    // GẮN ACCESS TOKEN NẾU CÓ
    // =========================================================

    let requestToSend = req;

    if (accessToken) {

      requestToSend =
        req.clone({
          setHeaders: {
            Authorization:
              `Bearer ${accessToken}`
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
      .handle(requestToSend)
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
                    requestToSend.url,

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
              requestToSend.method,
              requestToSend.url
            );

            /*
             * Không kiểm tra refresh token ở Angular.
             *
             * Refresh token nằm trong HttpOnly cookie.
             *
             * Angular:
             *   - không đọc được
             *   - không cần biết token có tồn tại hay không
             *
             * Cứ gọi refreshAuthToken().
             *
             * AuthService sẽ gọi:
             *
             * POST /api/auth/refresh-token
             * withCredentials: true
             *
             * Browser tự gửi refresh-token cookie lên backend.
             */

            console.log(
              '[AUTH INTERCEPTOR] Trying to refresh access token...'
            );

            return this.authService
              .refreshAuthToken()
              .pipe(

                // =============================================
                // REFRESH THÀNH CÔNG
                // =============================================

                switchMap(() => {

                  const refreshedToken =
                    this.authService
                      .getAccessToken();

                  /*
                   * Backend refresh thành công thì
                   * AuthService.persistAuth() phải lưu
                   * access token mới vào signal.
                   */
                  if (!refreshedToken) {

                    console.error(
                      '[AUTH INTERCEPTOR] Refresh succeeded but no access token was stored.'
                    );

                    this.logoutLocal();

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

                  // ===========================================
                  // RETRY REQUEST CŨ
                  // ===========================================

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
                }),

                // =============================================
                // REFRESH HOẶC REQUEST RETRY THẤT BẠI
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

                    /*
                     * Refresh cookie hết hạn / invalid
                     * hoặc account không còn hợp lệ.
                     *
                     * Xóa state Angular và về login.
                     */
                    this.logoutLocal();

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

  private logoutLocal(): void {

    console.warn(
      '[AUTH INTERCEPTOR] Clearing local authentication and redirecting to login.'
    );

    /*
     * Chỉ clear state Angular:
     *
     * accessToken signal
     * currentUser signal
     *
     * Không cần clear refresh token vì Angular
     * không giữ refresh token nữa.
     */
    this.authService.clearAuth();

    this.router.navigate([
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
