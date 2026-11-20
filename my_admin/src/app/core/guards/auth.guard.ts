import { Injectable, inject } from '@angular/core';
import { CanActivate, Router, UrlTree } from '@angular/router';
import { Observable, catchError, map, of } from 'rxjs';
import { AuthService } from '../services/auth.services';

@Injectable({ providedIn: 'root' })
export class AuthGuard implements CanActivate {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private check(): true | UrlTree {
    if (this.auth.getAccessToken() && this.auth.currentUser()?.roles?.some(role => role.roleCode === 'ADMIN')) return true;
    this.auth.clearAuth();
    return this.router.createUrlTree(['/login']);
  }
  canActivate(): boolean | UrlTree | Observable<boolean | UrlTree> {
    if (this.auth.getAccessToken()) return this.check();
    return this.auth.refreshAuthToken().pipe(map(() => this.check()), catchError(() => {
      this.auth.clearAuth(); return of(this.router.createUrlTree(['/login']));
    }));
  }
}
