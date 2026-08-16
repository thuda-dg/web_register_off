import {
  Injectable,
  inject
} from '@angular/core';

import {
  CanActivate,
  Router,
  UrlTree
} from '@angular/router';

import {
  Observable,
  catchError,
  map,
  of
} from 'rxjs';

import {
  AuthService
} from '../services/auth.service';


@Injectable({
  providedIn: 'root'
})
export class AuthGuard implements CanActivate {

  private readonly authService =
    inject(AuthService);

  private readonly router =
    inject(Router);


  canActivate():
    boolean |
    UrlTree |
    Observable<boolean | UrlTree> {

    // =====================================================
    // Đã có access token
    // =====================================================

    if (
      this.authService
        .getAccessToken()
    ) {
      return true;
    }


    // =====================================================
    // Không có access token,
    // thử dùng refresh token
    // =====================================================

    const refreshToken =
      this.authService
        .getRefreshToken();


    if (!refreshToken) {
      return this.router
        .createUrlTree([
          '/login'
        ]);
    }


    // =====================================================
    // Restore session
    // =====================================================

    return this.authService
      .refreshAuthToken()
      .pipe(

        map(() => {

          const newAccessToken =
            this.authService
              .getAccessToken();

          if (newAccessToken) {
            return true;
          }

          return this.router
            .createUrlTree([
              '/login'
            ]);
        }),

        catchError(() => {

          this.authService
            .clearAuth();

          return of(
            this.router
              .createUrlTree([
                '/login'
              ])
          );
        })
      );
  }
}