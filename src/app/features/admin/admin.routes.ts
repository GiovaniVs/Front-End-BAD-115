import { Routes } from '@angular/router';

import { AdminLayoutComponent } from './layout/admin-layout.component';

export const ADMIN_ROUTES: Routes = [
  {
    path: '',
    component: AdminLayoutComponent,
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'usuarios' },
      {
        path: 'usuarios',
        loadComponent: () =>
          import('./pages/admin-users-page/admin-users-page.component').then((m) => m.AdminUsersPageComponent)
      },
      {
        path: 'administradores',
        loadComponent: () =>
          import('./pages/admin-users-page/admin-users-page.component').then((m) => m.AdminUsersPageComponent)
      },
      {
        path: 'disenadores',
        loadComponent: () =>
          import('./pages/admin-users-page/admin-users-page.component').then((m) => m.AdminUsersPageComponent)
      },
      {
        path: 'encuestados',
        loadComponent: () =>
          import('./pages/admin-users-page/admin-users-page.component').then((m) => m.AdminUsersPageComponent)
      },
      { path: '**', redirectTo: 'usuarios' }
    ]
  }
];

export const DESIGNER_ROUTES: Routes = [
  {
    path: '',
    component: AdminLayoutComponent,
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'encuestas' },
      {
        path: 'encuestas',
        loadComponent: () =>
          import('./pages/admin-surveys-page/admin-surveys-page.component').then(
            (m) => m.AdminSurveysPageComponent
          )
      },
      {
        path: 'resultados',
        loadComponent: () =>
          import('./pages/designer-results-page/designer-results-page.component').then(
            (m) => m.DesignerResultsPageComponent
          )
      },
      { path: '**', redirectTo: 'encuestas' }
    ]
  }
];
