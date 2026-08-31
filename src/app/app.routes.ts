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
      },

      // =========================
      // RELEVOS
      // =========================

      {
        path: 'nuevo-relevo',
        loadComponent: () =>
          import('./features/relevo/relevo-form/relevo-form.component')
            .then((m) => m.RelevoFormComponent)
      },
      {
        path: 'historial-relevos',
        loadComponent: () =>
          import('./features/relevo/historial-relevos/historial-relevos.component')
            .then((m) => m.HistorialRelevosComponent)
      },
      {
        path: 'relevos/:id',
        loadComponent: () =>
          import('./features/relevo/detalle-relevo/detalle-relevo.component')
            .then((m) => m.DetalleRelevoComponent)
      }
    ]
  },
  { path: '**', redirectTo: 'dashboard' }
];
