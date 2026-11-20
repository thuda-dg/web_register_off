import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { map } from 'rxjs';
import { AuthGuard } from './auth.guard';
import { AuthService } from '../services/auth.services';

export const adminGuard: CanActivateFn = () => {
  const auth = inject(AuthService); const router = inject(Router);
  const check = () => auth.currentUser()?.roles?.some(role => role.roleCode === 'ADMIN') ? true : router.createUrlTree(['/login']);
  const session = inject(AuthGuard).canActivate();
  if (typeof session === 'object' && 'pipe' in session) return session.pipe(map(result => result === true ? check() : result));
  return session === true ? check() : session;
};
