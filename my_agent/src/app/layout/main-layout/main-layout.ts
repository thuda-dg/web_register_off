import { Component, inject } from '@angular/core';
import { AuthService } from '../../core/services/auth.service';
import { RouterModule } from '@angular/router';

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
  get isTeamLead(): boolean { return this.auth.currentUser()?.roles?.some(role => role.roleCode === 'TEAM_LEAD') ?? false; }

}
