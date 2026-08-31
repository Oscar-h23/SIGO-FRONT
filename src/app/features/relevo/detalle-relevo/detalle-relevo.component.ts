import { CommonModule } from '@angular/common';

import {
  ChangeDetectorRef,
  Component,
  OnInit,
  inject
} from '@angular/core';

import {
  ActivatedRoute,
  Router
} from '@angular/router';

import {
  EstadoOperativo,
  RelevoChecklistResponse,
  RelevoResponse,
  RelevoViaResponse
} from '../../../core/models/relevo.models';

import {
  RelevoApiService
} from '../../../core/services/relevo-api.service';


@Component({
  selector: 'app-detalle-relevo',
  standalone: true,

  imports: [
    CommonModule
  ],

  templateUrl:
    './detalle-relevo.component.html',

  styleUrl:
    './detalle-relevo.component.css'
})
export class DetalleRelevoComponent implements OnInit {

  /* =====================================================
     DEPENDENCIAS
     ===================================================== */

  private readonly route =
    inject(ActivatedRoute);

  private readonly router =
    inject(Router);

  private readonly relevoApi =
    inject(RelevoApiService);

  private readonly cdr =
    inject(ChangeDetectorRef);


  /* =====================================================
     ESTADO
     ===================================================== */

  relevo: RelevoResponse | null = null;

  cargando = true;

  error = '';


  /* =====================================================
     INIT
     ===================================================== */

  ngOnInit(): void {

    console.log(
      'DETALLE RELEVO INICIADO'
    );


    const idParam =
      this.route
        .snapshot
        .paramMap
        .get('id');


    console.log(
      'PARAM ID:',
      idParam
    );


    if (!idParam) {

      this.error =
        'No se recibió el ID del relevo.';

      this.cargando =
        false;

      this.cdr.detectChanges();

      return;

    }


    const id =
      Number(idParam);


    if (
      Number.isNaN(id) ||
      id <= 0
    ) {

      this.error =
        'El ID del relevo no es válido.';

      this.cargando =
        false;

      this.cdr.detectChanges();

      return;

    }


    this.cargarDetalle(id);

  }


  /* =====================================================
     CARGAR DETALLE
     ===================================================== */

  private cargarDetalle(
    id: number
  ): void {

    console.log(
      'SOLICITANDO RELEVO:',
      id
    );


    this.cargando =
      true;

    this.error =
      '';

    this.relevo =
      null;


    this.relevoApi
      .obtenerRelevo(id)
      .subscribe({

        /* =================================================
           SUCCESS
           ================================================= */

        next: (
          response: RelevoResponse
        ) => {

          console.log(
            'RESPUESTA DEL BACKEND:',
            response
          );


          this.relevo = {

            ...response,

            checklist:
              response.checklist
              ?? [],

            vias:
              response.vias
              ?? []

          };


          /*
           * IMPORTANTE:
           * cambiamos cargando AQUÍ,
           * no dentro de finalize.
           */

          this.cargando =
            false;


          console.log(
            'RELEVO ASIGNADO:',
            this.relevo
          );


          console.log(
            'CHECKLIST:',
            this.relevo.checklist
          );


          console.log(
            'VÍAS:',
            this.relevo.vias
          );


          console.log(
            'CARGANDO:',
            this.cargando
          );


          /*
           * Fuerza a Angular a actualizar
           * inmediatamente el HTML.
           */

          this.cdr.detectChanges();

        },


        /* =================================================
           ERROR
           ================================================= */

        error: (err) => {

          console.error(
            'ERROR OBTENIENDO RELEVO:',
            err
          );


          this.cargando =
            false;


          if (
            err?.status === 0
          ) {

            this.error =
              'No se pudo conectar con el servidor.';

          }

          else if (
            err?.status === 404
          ) {

            this.error =
              'No se encontró el relevo solicitado.';

          }

          else {

            this.error =
              err?.error?.message
              ||
              err?.error?.error
              ||
              'No se pudo cargar el detalle del relevo.';

          }


          /*
           * También actualizamos la vista
           * cuando ocurre un error.
           */

          this.cdr.detectChanges();

        }

      });

  }


  /* =====================================================
     BASE OPERATIVA
     ===================================================== */

  get baseOperativa():
    RelevoChecklistResponse[] {

    return (
      this.relevo
        ?.checklist
        ?.filter(
          item =>
            item.categoria ===
            'BASE_OPERATIVA'
        )
      ??
      []
    );

  }


  /* =====================================================
     PLAZA DE PEAJE
     ===================================================== */

  get plazaPeaje():
    RelevoChecklistResponse[] {

    return (
      this.relevo
        ?.checklist
        ?.filter(
          item =>
            item.categoria ===
            'PLAZA_PEAJE'
        )
      ??
      []
    );

  }


  /* =====================================================
     VÍAS CON PROBLEMAS
     ===================================================== */

  get viasConProblema():
    RelevoViaResponse[] {

    return (
      this.relevo
        ?.vias
        ?.filter(
          via =>
            via.estado !==
            'OPERATIVO'
        )
      ??
      []
    );

  }


  /* =====================================================
     TOTAL VÍAS
     ===================================================== */

  get totalVias(): number {

    return (
      this.relevo
        ?.vias
        ?.length
      ??
      0
    );

  }


  /* =====================================================
     VÍAS OPERATIVAS
     ===================================================== */

  get viasOperativas(): number {

    return (
      this.relevo
        ?.vias
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
     VÍAS OBSERVADAS
     ===================================================== */

  get viasObservadas(): number {

    return (
      this.relevo
        ?.vias
        ?.filter(
          via =>
            via.estado ===
            'OBSERVADO'
        )
        .length
      ??
      0
    );

  }


  /* =====================================================
     VÍAS NO OPERATIVAS
     ===================================================== */

  get viasNoOperativas(): number {

    return (
      this.relevo
        ?.vias
        ?.filter(
          via =>
            via.estado ===
            'NO_OPERATIVO'
        )
        .length
      ??
      0
    );

  }


  /* =====================================================
     LABEL ESTADO
     ===================================================== */

  estadoLabel(
    estado: EstadoOperativo
  ): string {

    switch (estado) {

      case 'OPERATIVO':

        return 'Operativo';


      case 'OBSERVADO':

        return 'Observado';


      case 'NO_OPERATIVO':

        return 'No operativo';


      default:

        return estado;

    }

  }


  /* =====================================================
     CLASE ESTADO
     ===================================================== */

  estadoClase(
    estado: EstadoOperativo
  ): string {

    switch (estado) {

      case 'OPERATIVO':

        return 'estado-operativo';


      case 'OBSERVADO':

        return 'estado-observado';


      case 'NO_OPERATIVO':

        return 'estado-no-operativo';


      default:

        return '';

    }

  }


  /* =====================================================
     VOLVER
     ===================================================== */

  volver(): void {

    this.router.navigate([
      '/historial-relevos'
    ]);

  }

}