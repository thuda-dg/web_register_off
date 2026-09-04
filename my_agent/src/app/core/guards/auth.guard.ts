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
export class AuthGuard
  implements CanActivate {

  private readonly authService =
    inject(AuthService);

  private readonly router =
    inject(Router);

  canActivate():
  boolean |
  UrlTree |
  Observable<boolean | UrlTree> {

  console.log(
    '[AUTH GUARD] canActivate called'
  );
  console.log(
  'typeof window:',
  typeof window
);

  const accessToken =
    this.authService.getAccessToken();

  console.log(
    '[AUTH GUARD] accessToken:',
    accessToken
  );

  if (accessToken) {

    console.log(
      '[AUTH GUARD] Access token exists -> allow'
    );

    return true;
  }

  console.log(
    '[AUTH GUARD] No access token -> trying refresh'
  );

  return this.authService
    .refreshAuthToken()
    .pipe(

      map(() => {

        console.log(
          '[AUTH GUARD] Refresh success'
        );

        const newAccessToken =
          this.authService
            .getAccessToken();

        console.log(
          '[AUTH GUARD] New access token:',
          newAccessToken
        );

        if (newAccessToken) {
          return true;
        }

        return this.router
          .createUrlTree([
            '/login'
          ]);
      }),

      catchError(error => {

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
