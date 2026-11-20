import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { map } from 'rxjs';
import { AuthService } from '../services/auth.service';
import { AuthUser } from '../models/auth.model';
import { AuthGuard } from './auth.guard';

export type AgentScreen = 'schedule' | 'history' | 'published';
export function canAccessScreen(user: AuthUser | null, screen: AgentScreen): boolean {
  if (!user) return false;
  const roles = user.roles?.map(role => role.roleCode) || [];
  return screen === 'published' ? !roles.includes('EMPLOYEE') : !roles.includes('TEAM_LEAD');
}
export function agentLanding(user: AuthUser | null): string {
  if (!user) return '/login';
  if (user.roles?.some(role => role.roleCode === 'TEAM_LEAD')) return '/approvals';
  return '/schedule';
}
export function screenAccessGuard(screen: AgentScreen): CanActivateFn {
  return () => {
    const auth = inject(AuthService), router = inject(Router);
    const check = () => canAccessScreen(auth.currentUser(), screen) ? true : router.createUrlTree([agentLanding(auth.currentUser())]);
    const session = inject(AuthGuard).canActivate();
    if (typeof session === 'object' && 'pipe' in session) return session.pipe(map(result => result === true ? check() : result));
    return session === true ? check() : session;
  };
}
