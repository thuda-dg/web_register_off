import { Component, inject, signal } from '@angular/core';
import { finalize } from 'rxjs';
import { AuthService } from '../../core/services/auth.service';
import { RouterModule } from '@angular/router';
import { canAccessScreen, AgentScreen } from '../../core/guards/screen-access.guard';

@Component({
  selector: 'app-main-layout',
  standalone: true,
  imports: [
    RouterModule
  ],
  templateUrl: './main-layout.html'
})
export class MainLayoutComponent {
  readonly auth = inject(AuthService);
  readonly loggingOut = signal(false);
  logout(): void {
    if (this.loggingOut()) return;
    this.loggingOut.set(true);
    // AuthService thu hồi phiên, xóa state và chuyển về login kể cả khi API lỗi.
    this.auth.logout().pipe(finalize(() => this.loggingOut.set(false))).subscribe({ error: () => {} });
  }
  canView(screen: AgentScreen): boolean { return canAccessScreen(this.auth.currentUser(), screen); }
  get isTeamLead(): boolean { return this.auth.currentUser()?.roles?.some(role => role.roleCode === 'TEAM_LEAD') ?? false; }

}
