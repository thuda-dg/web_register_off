import {
  Routes
} from '@angular/router';

import {
  AuthGuard
} from './core/guards/auth.guard';

import {
  LoginComponent
} from './features/auth/login/login.component';

// import {
//   RegisterComponent
// } from './features/auth/register/register.component';

import {
  AdminComponent
} from './features/admin/admin.component';


export const routes: Routes = [

  {
    path: 'login',
    component: LoginComponent
  },

//   {
//     path: 'register',
//     component: RegisterComponent
//   },

  {
    path: 'admin',
    component: AdminComponent,
    canActivate: [
      AuthGuard
    ]
  },
//   {
//   path: 'admin/employees/:id/edit',
//   component: EmployeeEditComponent,
//   canActivate: [AuthGuard]
// }

  {
    path: '',
    redirectTo: '/admin',
    pathMatch: 'full'
  },

  {
    path: '**',
    redirectTo: '/login'
  }

];
