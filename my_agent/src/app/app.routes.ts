import { Routes } from '@angular/router';
import { AuthGuard } from './core/guards/auth.guard';
import { LoginComponent } from './features/auth/login/login.component';
import { RegisterComponent } from './features/auth/register/register.component';
import { MainLayoutComponent } from './layout/main-layout/main-layout';
import { Schedule } from './features/schedule/schedule';
import { History } from './features/history/history';
import { PublishedSchedule } from './features/published-schedule/published-schedule';
import { RequireHc } from './features/require-hc/require-hc';


export const routes: Routes = [
  {
    path: 'login',
    component: LoginComponent
  },

  {
    path: 'register',
    component: RegisterComponent
  },

  {
    path: '',
    component: MainLayoutComponent,
    canActivate: [AuthGuard],

    children: [

      {
        path: 'schedule',
        component: Schedule
      },

      {
        path: 'history',
        component: History
      },

      {
        path: 'published',
        component: PublishedSchedule
      },

      {
        path: 'require-hc',
        component: RequireHc
      },

      {
        path: '',
        redirectTo: 'schedule',
        pathMatch: 'full'
      }

    ]
  },

  {
    path: '**',
    redirectTo: '/login'
  }

];