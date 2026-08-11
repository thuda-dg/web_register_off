import { Injectable, inject } from '@angular/core';
import {
  HttpErrorResponse,
  HttpEvent,
  HttpHandler,
  HttpInterceptor,
  HttpRequest
} from '@angular/common/http';
import { Observable, catchError, switchMap, throwError } from 'rxjs';
import { Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

@Injectable()
export class AuthInterceptor implements HttpInterceptor {
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  intercept(req: HttpRequest<unknown>, next: HttpHandler): Observable<HttpEvent<unknown>> {
    if (this.isAuthRoute(req.url)) {
      return next.handle(req);
    }

    const token = this.authService.getAccessToken();

    if (token) {
      req = req.clone({
        setHeaders: {
          Authorization: `Bearer ${token}`
        }
      });
    }

    return next.handle(req).pipe(
      catchError((error: HttpErrorResponse) => {
        if (error.status !== 401 || this.isAuthRoute(req.url)) {
          return throwError(() => error);
        }

        return this.authService.refreshAuthToken().pipe(
          switchMap(() => {
            const refreshedToken = this.authService.getAccessToken();

            if (!refreshedToken) {
              this.authService.clearAuth();
              this.router.navigate(['/login']);
              return throwError(() => error);
            }

            const retriedRequest = req.clone({
              setHeaders: {
                Authorization: `Bearer ${refreshedToken}`
              }
            });

            return next.handle(retriedRequest);
          }),
          catchError((refreshError) => {
            this.authService.clearAuth();
            this.router.navigate(['/login']);
            return throwError(() => refreshError);
          })
        );
      })
    );
  }

  private isAuthRoute(url: string): boolean {
    return /\/api\/auth\/(login|register|refresh-token|forgot-password|reset-password|logout)/.test(url);
  }
}
