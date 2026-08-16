import { Routes } from '@angular/router';
import { AuthGuard } from './core/guards/auth.guard';
import { LoginComponent } from './features/auth/login/login.component';
import { RegisterComponent } from './features/auth/register/register.component';
import { HomeComponent } from './features/home/home.component';
import { Schedule } from './features/schedule/schedule';

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
    path: 'schedule',
    component: Schedule,
    canActivate: [AuthGuard]
  },
  {
    path: '',
    redirectTo: '/schedule',
    pathMatch: 'full'
  },
  {
    path: '**',
    redirectTo: '/login'
  }
];
