import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { map } from 'rxjs';
import { AuthService } from '../services/auth.service';
import { AuthGuard } from './auth.guard';

export const teamLeadGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  const check = () => auth.currentUser()?.roles?.some(role => role.roleCode === 'TEAM_LEAD')
    ? true : router.createUrlTree(['/schedule']);
  const session = inject(AuthGuard).canActivate();
  if (typeof session === 'object' && 'pipe' in session) return session.pipe(map(result => result === true ? check() : result));
  return session === true ? check() : session;
};
