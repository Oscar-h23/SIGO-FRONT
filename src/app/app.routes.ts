import { Routes } from '@angular/router';
import { MainLayoutComponent } from './layout/main-layout/main-layout.component';

export const routes: Routes = [
  {
    path: '',
    component: MainLayoutComponent,
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
      {
        path: 'dashboard',
        loadComponent: () => import('./features/dashboard/dashboard.component').then((m) => m.DashboardComponent)
      },
      {
        path: 'registrar-asistencia',
        loadComponent: () => import('./features/asistencia-form/asistencia-form.component').then((m) => m.AsistenciaFormComponent)
      },
      {
        path: 'historial',
        loadComponent: () => import('./features/asistencia-history/asistencia-history.component').then((m) => m.AsistenciaHistoryComponent)
      }
    ]
  },
  { path: '**', redirectTo: 'dashboard' }
];
