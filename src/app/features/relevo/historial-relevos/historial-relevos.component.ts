import { CommonModule } from '@angular/common';

import {
  ChangeDetectorRef,
  Component,
  OnInit,
  inject
} from '@angular/core';

import {
  FormsModule
} from '@angular/forms';

import {
  RouterLink
} from '@angular/router';

import {
  RelevoResponse
} from '../../../core/models/relevo.models';

import {
  RelevoApiService
} from '../../../core/services/relevo-api.service';


@Component({
  selector: 'app-historial-relevos',
  standalone: true,

  imports: [
    CommonModule,
    FormsModule,
    RouterLink
  ],

  templateUrl:
    './historial-relevos.component.html',

  styleUrl:
    './historial-relevos.component.css'
})
export class HistorialRelevosComponent implements OnInit {

  private readonly api =
    inject(RelevoApiService);

  private readonly cdr =
    inject(ChangeDetectorRef);


  relevos:
    RelevoResponse[] = [];


  inicio = '';

  fin = '';


  cargando = false;

  error = '';


  ngOnInit(): void {

    /*
     * El historial siempre inicia:
     *
     * DESDE = ayer
     * HASTA = hoy
     */
    this.establecerRangoInicial();

    /*
     * Carga automática.
     * El usuario no necesita tocar ninguna fecha.
     */
    this.buscar();

  }


  /* =====================================================
     RANGO INICIAL
     ===================================================== */

  private establecerRangoInicial(): void {

    const hoy =
      new Date();

    this.fin =
      this.fechaLocalParaInput(
        hoy
      );

    this.actualizarDesdeSegunFin(
      false
    );

  }


  /* =====================================================
     HASTA CAMBIÓ
     ===================================================== */

  onFinChange(
    nuevaFecha: string
  ): void {

    this.fin =
      nuevaFecha;

    /*
     * "Desde" siempre queda exactamente
     * un día antes de "Hasta".
     */
    this.actualizarDesdeSegunFin(
      false
    );

    this.cdr.detectChanges();

  }


  /* =====================================================
     DESDE = HASTA - 1 DÍA
     ===================================================== */

  private actualizarDesdeSegunFin(
    buscarDespues = false
  ): void {

    if (!this.fin) {

      this.inicio = '';

      return;

    }

    const partes =
      this.fin
        .split('-')
        .map(Number);

    if (
      partes.length !== 3
    ) {
      return;
    }

    const [
      anio,
      mes,
      dia
    ] = partes;

    const fechaHasta =
      new Date(
        anio,
        mes - 1,
        dia
      );

    const fechaDesde =
      new Date(
        fechaHasta.getFullYear(),
        fechaHasta.getMonth(),
        fechaHasta.getDate() - 1
      );

    this.inicio =
      this.fechaLocalParaInput(
        fechaDesde
      );

    if (buscarDespues) {
      this.buscar();
    }

  }


  /* =====================================================
     FECHA LOCAL PARA INPUT
     ===================================================== */

  private fechaLocalParaInput(
    fecha: Date
  ): string {

    const anio =
      fecha.getFullYear();

    const mes =
      String(
        fecha.getMonth() + 1
      )
        .padStart(
          2,
          '0'
        );

    const dia =
      String(
        fecha.getDate()
      )
        .padStart(
          2,
          '0'
        );

    return `${anio}-${mes}-${dia}`;

  }


  /* =====================================================
     BUSCAR
     ===================================================== */

  buscar(): void {

    if (
      this.cargando
    ) {
      return;
    }


    if (
      !this.fin
    ) {

      this.error =
        'Selecciona la fecha Hasta.';

      this.cdr.detectChanges();

      return;

    }


    /*
     * Garantizamos nuevamente que Desde
     * sea un día antes de Hasta.
     */
    this.actualizarDesdeSegunFin(
      false
    );


    this.cargando =
      true;

    this.error =
      '';


    /*
     * Refresca inmediatamente el loading.
     */
    this.cdr.detectChanges();


    this.api
      .listarRelevos(
        this.inicio || undefined,
        this.fin || undefined
      )
      .subscribe({

        next: (
          data: RelevoResponse[]
        ) => {

          /*
           * Normalizamos arrays para evitar
           * undefined en la plantilla.
           */
          this.relevos =
            (data ?? [])
              .map(
                relevo => ({
                  ...relevo,

                  checklist:
                    relevo.checklist
                    ?? [],

                  vias:
                    relevo.vias
                    ?? []
                })
              )
              .sort(
                (
                  a,
                  b
                ) =>
                  this.fechaHoraNumero(b)
                  -
                  this.fechaHoraNumero(a)
              );


          this.cargando =
            false;


          /*
           * Mismo ajuste aplicado en Nuevo relevo:
           * muestra los datos apenas responde HTTP,
           * sin esperar otro clic del usuario.
           */
          this.cdr.detectChanges();

        },


        error: err => {

          console.error(
            'ERROR HISTORIAL:',
            err
          );


          this.error =
            err?.error?.message
            ||
            err?.error?.error
            ||
            'No se pudo cargar el historial de relevos.';


          this.cargando =
            false;

          this.cdr.detectChanges();

        }

      });

  }


  /* =====================================================
     FECHA + HORA PARA ORDENAR
     ===================================================== */

  private fechaHoraNumero(
    relevo: RelevoResponse
  ): number {

    const fecha =
      relevo.fecha
      ?? '';

    const hora =
      relevo.hora
      ?? '00:00:00';

    const valor =
      new Date(
        `${fecha}T${hora}`
      )
        .getTime();

    return Number.isNaN(
      valor
    )
      ? 0
      : valor;

  }


  /* =====================================================
     RESTAURAR AYER → HOY
     ===================================================== */

  restaurarFechas(): void {

    this.establecerRangoInicial();

    this.cdr.detectChanges();

    this.buscar();

  }


  /* =====================================================
     TOTAL DE RELEVOS
     ===================================================== */

  get totalRelevos(): number {

    return this.relevos.length;

  }


  /* =====================================================
     TOTAL DE VÍAS
     ===================================================== */

  totalVias(
    relevo: RelevoResponse
  ): number {

    return (
      relevo.vias
        ?.length
      ??
      0
    );

  }


  /* =====================================================
     VÍAS OPERATIVAS
     ===================================================== */

  viasOperativas(
    relevo: RelevoResponse
  ): number {

    return (
      relevo.vias
        ?.filter(
          via =>
            via.estado ===
            'OPERATIVO'
        )
        .length
      ??
      0
    );

  }


  /* =====================================================
     VÍAS OBSERVADAS / NO OPERATIVAS
     ===================================================== */

  viasConObservacion(
    relevo: RelevoResponse
  ): number {

    return (
      relevo.vias
        ?.filter(
          via =>
            via.estado ===
              'OBSERVADO'
            ||
            via.estado ===
              'NO_OPERATIVO'
        )
        .length
      ??
      0
    );

  }


  /* =====================================================
     CLASE GENERAL DEL RELEVO
     ===================================================== */

  estadoRelevo(
    relevo: RelevoResponse
  ):
    | 'ok'
    | 'warning' {

    return (
      this.viasConObservacion(
        relevo
      ) > 0
    )
      ? 'warning'
      : 'ok';

  }


  /* =====================================================
     FORMATEAR HORA
     ===================================================== */

  horaCorta(
    hora: string
  ): string {

    if (!hora) {
      return '--:--';
    }

    return hora
      .slice(
        0,
        5
      );

  }

}
