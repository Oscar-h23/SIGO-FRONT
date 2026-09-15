import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: 'nos-actualizamos',
    loadComponent: () =>
      import('./features/sistema-actualizado/sistema-actualizado.component')
        .then((m) => m.SistemaActualizadoComponent)
  },
  {
    path: '**',
    redirectTo: 'nos-actualizamos'
  }
];
