import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { forkJoin } from 'rxjs';

import {
  AsistenciaResponse,
  AsistenciaUpdateRequest,
  AusenciaRequest,
  EvidenciaResponse,
  MotivoAusencia,
  Plaza,
  Trabajador,
  Turno
} from '../../core/models/asistencia.models';

import { AsistenciaApiService } from '../../core/services/asistencia-api.service';

import { ImageCropperModalComponent } from '../shared/image-cropper-modal.component';
type EvidenciaTipo =
  | 'CALENTAMIENTO'
  | 'INICIO_TURNO'
  | 'TAPONES_AUDITIVOS';

interface ArchivoEvidenciaNuevo {
  archivo: File;
  tipo: EvidenciaTipo;
}

@Component({
  selector: 'app-asistencia-edit',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterModule,
    ImageCropperModalComponent
  ],
  templateUrl: './asistencia-edit.component.html',
  styleUrl: './asistencia-edit.component.css'
})
export class AsistenciaEditComponent implements OnInit {

  private readonly api =
    inject(AsistenciaApiService);

  private readonly route =
    inject(ActivatedRoute);

  private readonly router =
    inject(Router);

  readonly loading =
    signal(false);

  readonly loadingCatalogos =
    signal(false);

  readonly loadingPersonal =
    signal(false);

  readonly saving =
    signal(false);

  readonly uploading =
    signal(false);

  readonly error =
    signal('');

  readonly success =
    signal('');

  readonly plazas =
    signal<Plaza[]>([]);

  readonly turnos =
    signal<Turno[]>([]);

  readonly motivos =
    signal<MotivoAusencia[]>([]);

  readonly agentes =
    signal<Trabajador[]>([]);

  readonly controladores =
    signal<Trabajador[]>([]);

  readonly evidencias =
    signal<EvidenciaResponse[]>([]);

  asistenciaId: number | null = null;

  plazaId: number | null = null;

  turnoId: number | null = null;

  controladorId: number | null = null;

  fecha = '';

  programados = 0;

  presentes = 0;

  /*
   * Personal adicional solicitado para apoyar el turno.
   * No interviene en el porcentaje de asistencia.
   */
  apoyoSolicitado = 0;

  /*
   * Detalle opcional del apoyo coordinado.
   */
  detalleApoyo = '';

  notas = '';

  ausencias: AusenciaRequest[] = [];

  archivosNuevos: ArchivoEvidenciaNuevo[] = [];

  readonly cropperVisible =
    signal(false);

  readonly cropperFile =
    signal<File | null>(null);

  readonly cropperTipo =
    signal<EvidenciaTipo | null>(null);

  ngOnInit(): void {

    const id =
      Number(
        this.route.snapshot.paramMap.get('id')
      );

    if (!id || Number.isNaN(id)) {

      this.error.set(
        'El identificador de la asistencia no es válido.'
      );

      return;
    }

    this.asistenciaId = id;

    this.cargarDatos(id);
  }

  /*
   * =========================================================
   * CARGAR INFORMACIÓN INICIAL
   * =========================================================
   */
  cargarDatos(
    id: number
  ): void {

    this.loading.set(true);
    this.loadingCatalogos.set(true);
    this.error.set('');

    forkJoin({
      asistencia:
        this.api.obtenerAsistencia(id),

      plazas:
        this.api.getPlazas(),

      turnos:
        this.api.getTurnos(),

      motivos:
        this.api.getMotivos()
    }).subscribe({

      next: ({
        asistencia,
        plazas,
        turnos,
        motivos
      }) => {

        this.plazas.set(
          plazas.filter(
            plaza => plaza.activo
          )
        );

        this.turnos.set(
          turnos
        );

        this.motivos.set(
          motivos
        );

        this.cargarAsistencia(
          asistencia
        );

        this.loading.set(false);
        this.loadingCatalogos.set(false);
      },

      error: err => {

        this.error.set(
          this.errorMessage(err)
        );

        this.loading.set(false);
        this.loadingCatalogos.set(false);
      }

    });
  }

  /*
   * =========================================================
   * PASAR RESPONSE AL FORMULARIO
   * =========================================================
   */
  private cargarAsistencia(
    asistencia: AsistenciaResponse
  ): void {

    this.plazaId =
      asistencia.plazaId;

    this.turnoId =
      asistencia.turnoId;

    this.controladorId =
      asistencia.controladorId;

    this.fecha =
      asistencia.fecha;

    this.programados =
      asistencia.programados;

    this.presentes =
      asistencia.presentes;

    this.apoyoSolicitado =
      asistencia.apoyoSolicitado ?? 0;

    this.detalleApoyo =
      asistencia.detalleApoyo ?? '';

    this.notas =
      asistencia.notas ?? '';

    this.ausencias =
      asistencia.ausencias.map(
        ausencia => ({
          trabajadorId:
            ausencia.trabajadorId,

          motivoId:
            ausencia.motivoId,

          observacion:
            ausencia.observacion
        })
      );

    this.evidencias.set(
      asistencia.evidencias
    );

    if (this.plazaId) {

      this.cargarPersonalPorPlaza(
        this.plazaId,
        false
      );
    }
  }

  /*
   * =========================================================
   * CAMBIO DE PLAZA
   * =========================================================
   */
  cambiarPlaza(): void {

    this.error.set('');
    this.success.set('');

    if (!this.plazaId) {

      this.agentes.set([]);
      this.controladores.set([]);

      this.controladorId = null;

      this.ausencias = [];

      return;
    }

    this.controladorId = null;
    this.ausencias = [];

    this.cargarPersonalPorPlaza(
      this.plazaId,
      true
    );
  }

  /*
   * =========================================================
   * CARGAR AGENTES Y CONTROLADORES
   * =========================================================
   */
  private cargarPersonalPorPlaza(
    plazaId: number,
    limpiarSeleccion: boolean
  ): void {

    this.loadingPersonal.set(true);

    forkJoin({
      agentes:
        this.api.getAgentesPorPlaza(
          plazaId
        ),

      controladores:
        this.api.getControladoresPorPlaza(
          plazaId
        )
    }).subscribe({

      next: ({
        agentes,
        controladores
      }) => {

        this.agentes.set(
          agentes
        );

        this.controladores.set(
          controladores
        );

        if (limpiarSeleccion) {

          this.controladorId = null;

          this.ausencias = [];
        }

        this.loadingPersonal.set(false);
      },

      error: err => {

        this.error.set(
          this.errorMessage(err)
        );

        this.loadingPersonal.set(false);
      }

    });
  }

  /*
   * =========================================================
   * CAMBIO DE TURNO
   * =========================================================
   */
  cambiarTurno(): void {

    const turno =
      this.turnos()
        .find(
          item =>
            item.id === this.turnoId
        );

    if (!turno) {
      return;
    }

    this.programados =
      turno.personalProgramado;

    if (
      this.presentes >
      this.programados
    ) {

      this.presentes =
        this.programados;
    }

    this.ajustarCantidadAusencias();
  }

  /*
   * =========================================================
   * CAMBIO DE PRESENTES
   * =========================================================
   */
  cambiarPresentes(): void {

    if (this.presentes < 0) {

      this.presentes = 0;
    }

    if (
      this.presentes >
      this.programados
    ) {

      this.presentes =
        this.programados;
    }

    this.ajustarCantidadAusencias();
  }

  /*
   * =========================================================
   * AUSENTES CALCULADOS
   * =========================================================
   */
  get cantidadAusentes(): number {

    const total =
      this.programados -
      this.presentes;

    return Math.max(
      total,
      0
    );
  }

  /*
   * =========================================================
   * AJUSTAR FILAS DE AUSENCIAS
   * =========================================================
   */
  private ajustarCantidadAusencias(): void {

    const cantidad =
      this.cantidadAusentes;

    while (
      this.ausencias.length <
      cantidad
    ) {

      this.ausencias.push({
        trabajadorId: 0,
        motivoId: 0,
        observacion: null
      });
    }

    while (
      this.ausencias.length >
      cantidad
    ) {

      this.ausencias.pop();
    }
  }

  /*
   * =========================================================
   * AGENTES DISPONIBLES POR FILA
   * =========================================================
   */
  agentesDisponibles(
    indiceActual: number
  ): Trabajador[] {

    const seleccionados =
      this.ausencias
        .map(
          (ausencia, indice) => {

            if (
              indice ===
              indiceActual
            ) {

              return null;
            }

            return ausencia
              .trabajadorId;
          }
        )
        .filter(
          id =>
            id !== null &&
            id !== 0
        );

    return this.agentes()
      .filter(
        trabajador =>
          !seleccionados.includes(
            trabajador.id
          )
      );
  }

  /*
   * =========================================================
   * SELECCIONAR NUEVAS FOTOS
   * =========================================================
   */
  seleccionarArchivos(
    tipo: EvidenciaTipo,
    event: Event
  ): void {

    const input =
      event.target as HTMLInputElement;

    const archivo =
      input.files?.[0];

    if (!archivo) {
      return;
    }

    input.value = '';

    this.abrirEditorImagen(
      tipo,
      archivo
    );
  }

  private abrirEditorImagen(
    tipo: EvidenciaTipo,
    archivo: File
  ): void {

    const tiposPermitidos = [
      'image/jpeg',
      'image/png',
      'image/webp'
    ];

    if (
      !tiposPermitidos.includes(
        archivo.type
      )
    ) {

      this.error.set(
        'Solo se permiten imágenes JPG, PNG o WEBP.'
      );

      return;
    }

    const maxSize =
      10 * 1024 * 1024;

    if (
      archivo.size >
      maxSize
    ) {

      this.error.set(
        'Cada fotografía debe pesar como máximo 10 MB.'
      );

      return;
    }

    this.error.set('');

    this.cropperTipo.set(
      tipo
    );

    this.cropperFile.set(
      archivo
    );

    this.cropperVisible.set(
      true
    );
  }

  onCropperConfirm(
    archivo: File
  ): void {

    const tipo =
      this.cropperTipo();

    if (!tipo) {
      return;
    }

    /*
     * Solo puede quedar una fotografía nueva pendiente
     * por cada tipo de evidencia.
     */
    this.archivosNuevos = [
      ...this.archivosNuevos.filter(
        item =>
          item.tipo !== tipo
      ),
      {
        archivo,
        tipo
      }
    ];

    this.cerrarCropper();
  }

  onCropperCancel(): void {

    this.cerrarCropper();
  }

  private cerrarCropper(): void {

    this.cropperVisible.set(
      false
    );

    this.cropperFile.set(
      null
    );

    this.cropperTipo.set(
      null
    );
  }

  archivoNuevoPorTipo(
    tipo: EvidenciaTipo
  ): ArchivoEvidenciaNuevo | undefined {

    return this.archivosNuevos.find(
      item => item.tipo === tipo
    );
  }

  quitarArchivoNuevoPorTipo(
    tipo: EvidenciaTipo
  ): void {

    this.archivosNuevos =
      this.archivosNuevos.filter(
        item => item.tipo !== tipo
      );
  }

  nombreTipoEvidencia(
    tipo: string
  ): string {

    switch (tipo) {
      case 'CALENTAMIENTO':
        return 'Calentamiento';
      case 'INICIO_TURNO':
        return 'Inicio de turno';
      case 'TAPONES_AUDITIVOS':
        return 'Tapones auditivos';
      default:
        return tipo || 'Evidencia';
    }
  }

  /*
   * =========================================================
   * ELIMINAR FOTO EXISTENTE
   * =========================================================
   */
  eliminarEvidencia(
    evidencia: EvidenciaResponse
  ): void {

    if (!this.asistenciaId) {
      return;
    }

    const confirmar =
      window.confirm(
        '¿Deseas eliminar esta fotografía?'
      );

    if (!confirmar) {
      return;
    }

    this.error.set('');
    this.success.set('');

    this.api
      .eliminarEvidencia(
        this.asistenciaId,
        evidencia.id
      )
      .subscribe({

        next: () => {

          this.evidencias.update(
            items =>
              items.filter(
                item =>
                  item.id !==
                  evidencia.id
              )
          );

          this.success.set(
            'Fotografía eliminada correctamente.'
          );
        },

        error: err => {

          this.error.set(
            this.errorMessage(err)
          );
        }

      });
  }

  /*
   * =========================================================
   * VALIDAR FORMULARIO
   * =========================================================
   */
  private validarFormulario(): boolean {

    if (!this.plazaId) {

      this.error.set(
        'Debe seleccionar una plaza.'
      );

      return false;
    }

    if (!this.turnoId) {

      this.error.set(
        'Debe seleccionar un turno.'
      );

      return false;
    }

    if (!this.controladorId) {

      this.error.set(
        'Debe seleccionar un controlador.'
      );

      return false;
    }

    if (!this.fecha) {

      this.error.set(
        'Debe ingresar la fecha.'
      );

      return false;
    }

    if (
      this.programados < 0
    ) {

      this.error.set(
        'La cantidad de programados no puede ser negativa.'
      );

      return false;
    }

    if (
      this.presentes < 0 ||
      this.presentes >
      this.programados
    ) {

      this.error.set(
        'La cantidad de presentes no es válida.'
      );

      return false;
    }

    if (
      this.apoyoSolicitado < 0 ||
      !Number.isInteger(
        Number(this.apoyoSolicitado)
      )
    ) {

      this.error.set(
        'El apoyo solicitado debe ser un número entero mayor o igual a 0.'
      );

      return false;
    }

    if (
      this.detalleApoyo &&
      this.detalleApoyo.trim().length > 500
    ) {

      this.error.set(
        'El detalle del apoyo no puede superar los 500 caracteres.'
      );

      return false;
    }

    if (
      this.ausencias.length !==
      this.cantidadAusentes
    ) {

      this.error.set(
        `Debe registrar exactamente ${this.cantidadAusentes} ausencia(s).`
      );

      return false;
    }

    const trabajadores =
      this.ausencias.map(
        ausencia =>
          ausencia.trabajadorId
      );

    if (
      trabajadores.some(
        id => !id
      )
    ) {

      this.error.set(
        'Debe seleccionar al trabajador de cada ausencia.'
      );

      return false;
    }

    const trabajadoresUnicos =
      new Set(
        trabajadores
      );

    if (
      trabajadoresUnicos.size !==
      trabajadores.length
    ) {

      this.error.set(
        'No puede registrar al mismo trabajador ausente más de una vez.'
      );

      return false;
    }

    const motivos =
      this.ausencias.map(
        ausencia =>
          ausencia.motivoId
      );

    if (
      motivos.some(
        id => !id
      )
    ) {

      this.error.set(
        'Debe seleccionar el motivo de cada ausencia.'
      );

      return false;
    }

    return true;
  }

  /*
   * =========================================================
   * GUARDAR CAMBIOS
   * =========================================================
   */
  guardar(): void {

    if (
      !this.asistenciaId ||
      !this.validarFormulario()
    ) {

      return;
    }

    this.saving.set(true);
    this.error.set('');
    this.success.set('');

    const request:
      AsistenciaUpdateRequest = {

        plazaId:
          this.plazaId!,

        turnoId:
          this.turnoId!,

        controladorId:
          this.controladorId!,

        fecha:
          this.fecha,

        programados:
          this.programados,

        presentes:
          this.presentes,

        apoyoSolicitado:
          Number(
            this.apoyoSolicitado ?? 0
          ),

        detalleApoyo:
          Number(this.apoyoSolicitado ?? 0) > 0
            ? (
                this.detalleApoyo?.trim()
                  ? this.detalleApoyo.trim()
                  : null
              )
            : null,

        notas:
          this.notas?.trim()
            ? this.notas.trim()
            : null,

        ausencias:
          this.ausencias.map(
            ausencia => ({
              trabajadorId:
                Number(
                  ausencia.trabajadorId
                ),

              motivoId:
                Number(
                  ausencia.motivoId
                ),

              observacion:
                ausencia.observacion
                  ?.trim()
                  ? ausencia
                    .observacion
                    .trim()
                  : null
            })
          )
      };

    this.api
      .actualizarAsistencia(
        this.asistenciaId,
        request
      )
      .subscribe({

        next: () => {

          if (
            this.archivosNuevos.length >
            0
          ) {

            this.subirNuevasEvidencias();

          } else {

            this.finalizarGuardado();
          }
        },

        error: err => {

          this.error.set(
            this.errorMessage(err)
          );

          this.saving.set(false);
        }

      });
  }

  /*
   * =========================================================
   * SUBIR NUEVAS EVIDENCIAS DESPUÉS DEL PUT
   * =========================================================
   */
  private subirNuevasEvidencias(): void {

    if (
      !this.asistenciaId ||
      this.archivosNuevos.length === 0
    ) {

      this.finalizarGuardado();

      return;
    }

    this.uploading.set(true);

    const peticiones =
      this.archivosNuevos.map(
        item =>
          this.api.subirEvidencia(
            this.asistenciaId!,
            item.archivo,
            item.tipo
          )
      );

    forkJoin(
      peticiones
    ).subscribe({

      next: evidencias => {

        this.evidencias.update(
          actuales => [
            ...actuales,
            ...evidencias
          ]
        );

        this.archivosNuevos = [];

        this.uploading.set(false);

        this.finalizarGuardado();
      },

      error: err => {

        this.error.set(
          'Los datos fueron actualizados, pero ocurrió un error al subir una o más fotografías. '
          + this.errorMessage(err)
        );

        this.uploading.set(false);
        this.saving.set(false);
      }

    });
  }

  /*
   * =========================================================
   * FINALIZAR
   * =========================================================
   */
  private finalizarGuardado(): void {

    this.saving.set(false);

    this.success.set(
      'Asistencia actualizada correctamente.'
    );
  }

  /*
   * =========================================================
   * VOLVER AL HISTORIAL
   * =========================================================
   */
  volver(): void {

    this.router.navigate(
      ['/historial']
    );
  }

  /*
   * =========================================================
   * MENSAJE DE ERROR
   * =========================================================
   */
  private errorMessage(
    err: unknown
  ): string {

    const e =
      err as {
        error?:
          | {
              message?: string;
            }
          | string;
      };

    if (
      typeof e?.error ===
      'string'
    ) {

      return e.error;
    }

    return (
      e?.error?.message ??
      'Ocurrió un error al procesar la solicitud.'
    );
  }
}