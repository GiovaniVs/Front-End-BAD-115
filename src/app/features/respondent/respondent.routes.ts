import { Routes } from '@angular/router';

import { RespondentLayoutComponent } from './layout/respondent-layout.component';

export const RESPONDENT_ROUTES: Routes = [
  {
    path: '',
    component: RespondentLayoutComponent,
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'inicio' },
      {
        path: 'inicio',
        loadComponent: () =>
          import('./pages/respondent-home-page/respondent-home-page.component').then(
            (m) => m.RespondentHomePageComponent
          )
      },
      { path: '**', redirectTo: 'inicio' }
    ]
  }
];
