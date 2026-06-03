import { Routes } from '@angular/router';

export const AUTH_ROUTES: Routes = [
  {
    path: 'admin-login',
    loadComponent: () =>
      import('./pages/admin-login-page/admin-login-page').then((m) => m.AdminLoginPageComponent)
  },
  {
    path: 'encuestado-login',
    loadComponent: () =>
      import('./pages/respondent-login-page/respondent-login-page').then(
        (m) => m.RespondentLoginPageComponent
      )
  },
  { path: '', pathMatch: 'full', redirectTo: 'admin-login' }
];
