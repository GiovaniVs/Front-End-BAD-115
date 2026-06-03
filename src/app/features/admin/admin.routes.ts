import { Routes } from '@angular/router';

import { AdminLayoutComponent } from './layout/admin-layout.component';

export const ADMIN_ROUTES: Routes = [
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
      { path: '**', redirectTo: 'encuestas' }
    ]
  }
];
