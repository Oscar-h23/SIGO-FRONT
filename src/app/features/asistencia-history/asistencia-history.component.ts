import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

import {
  Component,
  OnInit,
  inject,
  signal
} from '@angular/core';

import { FormsModule } from '@angular/forms';

import {
  AsistenciaResponse,
  Plaza
} from '../../core/models/asistencia.models';

import {
  AsistenciaApiService
} from '../../core/services/asistencia-api.service';

@Component({
  selector: 'app-asistencia-history',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterModule
  ],
  templateUrl: './asistencia-history.component.html',
  styleUrl: './asistencia-history.component.css'
})
export class AsistenciaHistoryComponent
  implements OnInit {

  private readonly api =
    inject(AsistenciaApiService);

  readonly loading =
    signal(false);

  readonly loadingPlazas =
    signal(false);

  readonly error =
    signal('');

  readonly registros =
    signal<AsistenciaResponse[]>([]);

  readonly plazas =
    signal<Plaza[]>([]);

  readonly expandedId =
    signal<number | null>(null);

  /*
   * Filtros
   */
  inicio = '';
  fin = '';

  /*
   * null = Todas las plazas
   */
  plazaId: number | null = null;

  ngOnInit(): void {

    /*
     * Por defecto:
     * Desde = hoy
     * Hasta = hoy
     */
    const hoy = this.obtenerFechaHoy();

    this.inicio = hoy;
    this.fin = hoy;

    /*
     * Cargar catálogo de plazas.
     */
    this.cargarPlazas();

    /*
     * Cargar registros de hoy.
     */
    this.cargar();
  }

  /*
   * =========================================================
   * CARGAR PLAZAS
   * =========================================================
   */
  cargarPlazas(): void {

    this.loadingPlazas.set(true);

    this.api
      .getPlazas()
      .subscribe({

        next: (items) => {

          this.plazas.set(
            items.filter(
              plaza => plaza.activo
            )
          );

          this.loadingPlazas.set(false);
        },

        error: () => {

          this.loadingPlazas.set(false);

          this.error.set(
            'No se pudieron cargar las plazas.'
          );
        }

      });
  }

  /*
   * =========================================================
   * CARGAR HISTORIAL
   * =========================================================
   */
  cargar(): void {

    this.error.set('');

    /*
     * Validación de fechas.
     */
    if (
      this.inicio &&
      this.fin &&
      this.inicio > this.fin
    ) {

      this.error.set(
        'La fecha inicial no puede ser posterior a la fecha final.'
      );

      return;
    }

    this.loading.set(true);

    this.api
      .listarAsistencias(
        this.inicio || undefined,
        this.fin || undefined,
        this.plazaId
      )
      .subscribe({

        next: (items) => {

          this.registros.set(items);

          /*
           * Si había un detalle abierto,
           * lo cerramos al hacer una nueva búsqueda.
           */
          this.expandedId.set(null);

          this.loading.set(false);
        },

        error: (err) => {

          this.error.set(
            this.errorMessage(err)
          );

          this.loading.set(false);
        }

      });
  }

  /*
   * =========================================================
   * LIMPIAR FILTROS
   * =========================================================
   *
   * En este caso "Limpiar" significa volver
   * al estado inicial:
   *
   * Hoy
   * Hoy
   * Todas las plazas
   */
  limpiar(): void {

    const hoy =
      this.obtenerFechaHoy();

    this.inicio = hoy;
    this.fin = hoy;
    this.plazaId = null;

    this.cargar();
  }

  /*
   * También permite aplicar automáticamente
   * el filtro cuando cambia la plaza.
   */
  cambiarPlaza(): void {
    this.cargar();
  }

  toggle(id: number): void {

    this.expandedId.update(
      current =>
        current === id
          ? null
          : id
    );
  }

  badgeClass(
    value: number
  ): string {

    if (value >= 95) {
      return 'excellent';
    }

    if (value >= 85) {
      return 'good';
    }

    return 'warning';
  }

  /*
   * Devuelve fecha local:
   * YYYY-MM-DD
   *
   * Evitamos usar toISOString()
   * para que un cambio de zona horaria
   * no altere el día.
   */
  private obtenerFechaHoy(): string {

    const fecha =
      new Date();

    const anio =
      fecha.getFullYear();

    const mes =
      String(
        fecha.getMonth() + 1
      ).padStart(2, '0');

    const dia =
      String(
        fecha.getDate()
      ).padStart(2, '0');

    return `${anio}-${mes}-${dia}`;
  }

  private errorMessage(
    err: unknown
  ): string {

    const e =
      err as {
        error?: {
          message?: string
        } | string
      };

    if (
      typeof e?.error === 'string'
    ) {
      return e.error;
    }

    return (
      e?.error?.message ??
      'No se pudo cargar el historial de asistencias.'
    );
  }
}