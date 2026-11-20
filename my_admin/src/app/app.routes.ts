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
import { RequireHcImport } from './features/require-hc-import/require-hc-import';
import { adminGuard } from './core/guards/admin.guard';
import { RegistrationCycles } from './features/registration-cycles/registration-cycles';
import { OffBalanceImport } from './features/off-balance-import/off-balance-import';


export const routes: Routes = [
  { path: 'admin/off-balances/import', component: OffBalanceImport, canActivate: [adminGuard] },
  { path: 'admin/registration-cycles', component: RegistrationCycles, canActivate: [adminGuard] },
  { path: 'admin/require-hc/import', component: RequireHcImport, canActivate: [adminGuard] },

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
