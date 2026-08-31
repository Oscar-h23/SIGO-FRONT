import { CommonModule } from '@angular/common';
import {
  ChangeDetectorRef,
  Component,
  OnDestroy,
  OnInit,
  inject
} from '@angular/core';
import {
  FormArray,
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators
} from '@angular/forms';
import {
  forkJoin,
  Observable,
  of,
  switchMap
} from 'rxjs';

import {
  AsistenciaApiService
} from '../../../core/services/asistencia-api.service';
import {
  RelevoApiService
} from '../../../core/services/relevo-api.service';

import {
  Plaza,
  Trabajador,
  Turno
} from '../../../core/models/asistencia.models';

import {
  ElementoRelevo,
  EstadoOperativo,
  RelevoRequest,
  RelevoResponse,
  Via
} from '../../../core/models/relevo.models';


interface ArchivoPreview {
  file: File;
  url: string;
}


@Component({
  selector: 'app-relevo-form',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule
  ],
  templateUrl: './relevo-form.component.html',
  styleUrl: './relevo-form.component.css'
})
export class RelevoFormComponent implements OnInit, OnDestroy {

  private readonly fb =
    inject(FormBuilder);

  private readonly asistenciaApi =
    inject(AsistenciaApiService);

  private readonly relevoApi =
    inject(RelevoApiService);

  private readonly cdr =
    inject(ChangeDetectorRef);


  /* =====================================================
     CATÁLOGOS
     ===================================================== */

  plazas: Plaza[] = [];
  turnos: Turno[] = [];
  operadores: Trabajador[] = [];
  elementos: ElementoRelevo[] = [];
  viasDisponibles: Via[] = [];


  /* =====================================================
     ARCHIVOS
     ===================================================== */

  archivosChecklist =
    new Map<number, ArchivoPreview[]>();

  archivosVias =
    new Map<number, ArchivoPreview[]>();


  /* =====================================================
     ESTADO DE PANTALLA
     ===================================================== */

  cargando = false;
  cargandoVias = false;
  guardando = false;

  mensaje = '';
  error = '';


  /* =====================================================
     ESTADOS
     ===================================================== */

  readonly estados: {
    value: EstadoOperativo;
    label: string;
  }[] = [
    {
      value: 'OPERATIVO',
      label: 'Operativo'
    },
    {
      value: 'OBSERVADO',
      label: 'Observado'
    },
    {
      value: 'NO_OPERATIVO',
      label: 'No operativo'
    }
  ];


  /* =====================================================
     FORMULARIO
     ===================================================== */

  readonly form =
    this.fb.group({

      plazaId:
        this.fb.control<number | null>(
          null,
          Validators.required
        ),

      turnoId:
        this.fb.control<number | null>(
          null,
          Validators.required
        ),

      operadorId:
        this.fb.control<number | null>(
          null,
          Validators.required
        ),

      fecha:
        this.fb.control(
          this.fechaHoy(),
          Validators.required
        ),

      hora:
        this.fb.control(
          this.horaActual(),
          Validators.required
        ),

      checklist:
        this.fb.array<FormGroup>([]),

      vias:
        this.fb.array<FormGroup>([]),

      observaciones:
        this.fb.control<string>(''),

      resumen:
        this.fb.control<string>('')

    });


  /* =====================================================
     GETTERS
     ===================================================== */

  get checklist(): FormArray<FormGroup> {
    return this.form.controls.checklist;
  }


  get vias(): FormArray<FormGroup> {
    return this.form.controls.vias;
  }


  get totalVias(): number {
    return this.vias.length;
  }


  get viasObservadas(): number {
    return this.vias.controls.filter(
      control =>
        control.get('estado')?.value === 'OBSERVADO'
    ).length;
  }


  get viasNoOperativas(): number {
    return this.vias.controls.filter(
      control =>
        control.get('estado')?.value === 'NO_OPERATIVO'
    ).length;
  }


  /* =====================================================
     INICIO
     ===================================================== */

  ngOnInit(): void {

    this.cargarCatalogos();


    /*
     * Al seleccionar una plaza:
     * 1. limpia vías anteriores;
     * 2. consulta las vías de la plaza;
     * 3. crea automáticamente una card por vía.
     */
    this.form.controls.plazaId
      .valueChanges
      .subscribe(
        plazaId => {

          this.error = '';

          this.limpiarVias();
          this.viasDisponibles = [];

          if (!plazaId) {
            this.cargandoVias = false;
            this.cdr.detectChanges();
            return;
          }

          this.cargarViasPlaza(
            Number(plazaId)
          );

        }
      );

  }


  /* =====================================================
     DESTROY
     ===================================================== */

  ngOnDestroy(): void {

    this.archivosChecklist
      .forEach(
        archivos =>
          this.liberarPreviews(
            archivos
          )
      );

    this.archivosVias
      .forEach(
        archivos =>
          this.liberarPreviews(
            archivos
          )
      );

  }


  /* =====================================================
     CARGAR CATÁLOGOS
     ===================================================== */

  private cargarCatalogos(): void {

    this.cargando = true;
    this.error = '';

    /*
     * forkJoin ejecuta estas peticiones en paralelo.
     */
    forkJoin({

      plazas:
        this.asistenciaApi
          .getPlazas(),

      turnos:
        this.asistenciaApi
          .getTurnos(),

      operadores:
        this.asistenciaApi
          .getTrabajadores(),

      elementos:
        this.relevoApi
          .getElementos()

    })
      .subscribe({

        next: ({
          plazas,
          turnos,
          operadores,
          elementos
        }) => {

          this.plazas =
            (plazas ?? [])
              .filter(
                plaza =>
                  plaza.activo !== false
              );

          this.turnos =
            turnos ?? [];

          this.operadores =
            (operadores ?? [])
              .filter(
                trabajador =>
                  trabajador.activo !== false
              );

          /*
           * El backend puede no devolver "activo".
           * Solo excluimos cuando viene explícitamente false.
           */
          this.elementos =
            [...(elementos ?? [])]
              .filter(
                (elemento: any) =>
                  elemento.activo !== false
              )
              .sort(
                (a, b) => {

                  if (
                    a.categoria ===
                    b.categoria
                  ) {

                    return (
                      (a.orden ?? 0)
                      -
                      (b.orden ?? 0)
                    );

                  }

                  return a.categoria
                    .localeCompare(
                      b.categoria
                    );

                }
              );

          this.construirChecklist();

          this.cargando = false;

          /*
           * Importante para proyectos Angular con
           * detección de cambios zoneless/optimizada.
           */
          this.cdr.detectChanges();

        },


        error: err => {

          console.error(
            'ERROR CARGANDO CATÁLOGOS:',
            err
          );

          this.error =
            'No se pudieron cargar los datos necesarios para registrar el relevo.';

          this.cargando = false;

          this.cdr.detectChanges();

        }

      });

  }


  /* =====================================================
     CARGAR VÍAS DE LA PLAZA
     ===================================================== */

  private cargarViasPlaza(
    plazaId: number
  ): void {

    this.cargandoVias = true;
    this.error = '';

    /*
     * Refresca inmediatamente el estado "Cargando vías".
     */
    this.cdr.detectChanges();

    this.relevoApi
      .getVias(plazaId)
      .subscribe({

        next: vias => {

          this.viasDisponibles =
            [...(vias ?? [])]
              .filter(
                (via: any) =>
                  via.activa !== false
              )
              .sort(
                (a, b) => {

                  const ordenA =
                    a.orden ?? a.numero ?? 0;

                  const ordenB =
                    b.orden ?? b.numero ?? 0;

                  return ordenA - ordenB;

                }
              );

          this.crearViasAutomaticamente();

          this.cargandoVias = false;

          /*
           * Hace visibles las vías apenas responde la API.
           * Ya no necesitas hacer clic en otro control.
           */
          this.cdr.detectChanges();

        },


        error: err => {

          console.error(
            'ERROR CARGANDO VÍAS:',
            err
          );

          this.error =
            'No se pudieron cargar las vías de la plaza seleccionada.';

          this.cargandoVias = false;

          this.cdr.detectChanges();

        }

      });

  }


  /* =====================================================
     CREAR CHECKLIST
     ===================================================== */

  private construirChecklist(): void {

    this.checklist.clear();

    this.elementos
      .forEach(
        elemento => {

          const group =
            this.fb.group({

              elementoId:
                this.fb.control(
                  elemento.id,
                  Validators.required
                ),

              estado:
                this.fb.control<EstadoOperativo>(
                  'OPERATIVO',
                  Validators.required
                ),

              detalle:
                this.fb.control<string>(
                  ''
                ),

              cantidad:
                this.fb.control<number | null>(

                  elemento.requiereCantidad
                    ? 0
                    : null,

                  elemento.requiereCantidad
                    ? [
                        Validators.required,
                        Validators.min(0)
                      ]
                    : []

                )

            });

          group
            .get('estado')
            ?.valueChanges
            .subscribe(
              () =>
                this.actualizarDetalle(
                  group
                )
            );

          this.checklist.push(
            group
          );

        }
      );

  }


  /* =====================================================
     ELEMENTOS POR CATEGORÍA
     ===================================================== */

  elementosCategoria(
    categoria:
      | 'BASE_OPERATIVA'
      | 'PLAZA_PEAJE'
  ): {
    elemento: ElementoRelevo;
    index: number;
  }[] {

    return this.elementos
      .map(
        (
          elemento,
          index
        ) => ({
          elemento,
          index
        })
      )
      .filter(
        item =>
          item.elemento.categoria === categoria
      )
      .sort(
        (a, b) =>
          (a.elemento.orden ?? 0)
          -
          (b.elemento.orden ?? 0)
      );

  }


  /* =====================================================
     CREAR VÍAS AUTOMÁTICAMENTE
     ===================================================== */

  private crearViasAutomaticamente(): void {

    this.vias.clear();

    this.archivosVias
      .forEach(
        archivos =>
          this.liberarPreviews(
            archivos
          )
      );

    this.archivosVias.clear();

    this.viasDisponibles
      .forEach(
        via => {

          const group =
            this.fb.group({

              viaId:
                this.fb.control<number>(
                  via.id,
                  {
                    nonNullable: true,
                    validators: [
                      Validators.required
                    ]
                  }
                ),

              estado:
                this.fb.control<EstadoOperativo>(
                  'OPERATIVO',
                  Validators.required
                ),

              detalle:
                this.fb.control<string>(
                  ''
                )

            });

          group
            .get('estado')
            ?.valueChanges
            .subscribe(
              () =>
                this.actualizarDetalle(
                  group
                )
            );

          this.vias.push(
            group
          );

        }
      );

  }


  /* =====================================================
     VALIDAR DETALLE
     ===================================================== */

  private actualizarDetalle(
    group: FormGroup
  ): void {

    const estado =
      group
        .get('estado')
        ?.value as EstadoOperativo;

    const detalle =
      group.get(
        'detalle'
      );

    if (
      estado === 'OPERATIVO'
    ) {

      detalle
        ?.clearValidators();

    } else {

      detalle
        ?.setValidators([
          Validators.required,
          Validators.minLength(3)
        ]);

    }

    detalle
      ?.updateValueAndValidity({
        emitEvent: false
      });

  }


  /* =====================================================
     FOTOS CHECKLIST
     ===================================================== */

  seleccionarFotosChecklist(
    index: number,
    event: Event
  ): void {

    this.agregarArchivos(
      this.archivosChecklist,
      index,
      event
    );

  }


  /* =====================================================
     FOTOS VÍA
     ===================================================== */

  seleccionarFotosVia(
    index: number,
    event: Event
  ): void {

    this.agregarArchivos(
      this.archivosVias,
      index,
      event
    );

  }


  /* =====================================================
     QUITAR FOTO CHECKLIST
     ===================================================== */

  quitarFotoChecklist(
    index: number,
    fotoIndex: number
  ): void {

    this.quitarArchivo(
      this.archivosChecklist,
      index,
      fotoIndex
    );

  }


  /* =====================================================
     QUITAR FOTO VÍA
     ===================================================== */

  quitarFotoVia(
    index: number,
    fotoIndex: number
  ): void {

    this.quitarArchivo(
      this.archivosVias,
      index,
      fotoIndex
    );

  }


  /* =====================================================
     AGREGAR ARCHIVOS
     ===================================================== */

  private agregarArchivos(
    store:
      Map<number, ArchivoPreview[]>,
    index: number,
    event: Event
  ): void {

    this.error = '';

    const input =
      event.target as HTMLInputElement;

    const archivos =
      Array.from(
        input.files ?? []
      );

    const imagenes =
      archivos.filter(
        archivo =>
          archivo.type
            .startsWith(
              'image/'
            )
      );

    if (
      imagenes.length !==
      archivos.length
    ) {

      this.error =
        'Solo puedes seleccionar imágenes.';

    }

    const validas =
      imagenes.filter(
        archivo =>
          archivo.size <=
          10 * 1024 * 1024
      );

    if (
      validas.length !==
      imagenes.length
    ) {

      this.error =
        'Cada imagen debe pesar como máximo 10 MB.';

    }

    const actuales =
      store.get(index)
      ?? [];

    const nuevas =
      validas.map(
        file => ({
          file,
          url:
            URL.createObjectURL(
              file
            )
        })
      );

    store.set(
      index,
      [
        ...actuales,
        ...nuevas
      ]
    );

    input.value = '';

    this.cdr.detectChanges();

  }


  /* =====================================================
     QUITAR ARCHIVO
     ===================================================== */

  private quitarArchivo(
    store:
      Map<number, ArchivoPreview[]>,
    index: number,
    fotoIndex: number
  ): void {

    const actuales =
      [
        ...(store.get(index) ?? [])
      ];

    const eliminado =
      actuales.splice(
        fotoIndex,
        1
      )[0];

    if (eliminado) {

      URL.revokeObjectURL(
        eliminado.url
      );

    }

    if (
      actuales.length === 0
    ) {

      store.delete(index);

    } else {

      store.set(
        index,
        actuales
      );

    }

    this.cdr.detectChanges();

  }


  /* =====================================================
     GUARDAR
     ===================================================== */

  guardar(): void {

    this.mensaje = '';
    this.error = '';

    if (
      this.form.invalid
    ) {

      this.form.markAllAsTouched();

      this.error =
        'Completa los campos obligatorios y revisa los elementos observados.';

      this.irPrimerError();

      this.cdr.detectChanges();

      return;

    }

    const raw =
      this.form.getRawValue();

    const request: RelevoRequest = {

      plazaId:
        Number(
          raw.plazaId
        ),

      turnoId:
        Number(
          raw.turnoId
        ),

      operadorId:
        Number(
          raw.operadorId
        ),

      fecha:
        raw.fecha!,

      hora:
        raw.hora!,

      checklist:
        raw.checklist
          .map(
            (item: any) => ({

              elementoId:
                Number(
                  item.elementoId
                ),

              estado:
                item.estado,

              detalle:
                item.detalle
                  ?.trim()
                  || null,

              cantidad:
                item.cantidad === null
                ||
                item.cantidad === ''
                ||
                item.cantidad === undefined

                  ? null

                  : Number(
                      item.cantidad
                    )

            })
          ),

      vias:
        raw.vias
          .map(
            (item: any) => ({

              viaId:
                Number(
                  item.viaId
                ),

              estado:
                item.estado,

              detalle:
                item.detalle
                  ?.trim()
                  || null

            })
          ),

      observaciones:
        raw.observaciones
          ?.trim()
          || null,

      resumen:
        raw.resumen
          ?.trim()
          || null

    };

    this.guardando = true;

    this.cdr.detectChanges();

    /*
     * Primero crea el relevo.
     * Luego sube las evidencias usando los IDs devueltos.
     */
    this.relevoApi
      .registrarRelevo(
        request
      )
      .pipe(
        switchMap(
          relevo =>
            this.subirTodasLasFotos(
              relevo
            )
        )
      )
      .subscribe({

        next: () => {

          this.guardando = false;

          this.mensaje =
            'Relevo registrado correctamente.';

          this.resetearFormulario();

          this.cdr.detectChanges();

          window.scrollTo({
            top: 0,
            behavior: 'smooth'
          });

        },


        error: err => {

          console.error(
            'ERROR REGISTRANDO RELEVO:',
            err
          );

          this.guardando = false;

          this.error =
            err?.error?.message
            ||
            err?.error?.error
            ||
            'Ocurrió un error al registrar el relevo.';

          this.cdr.detectChanges();

        }

      });

  }


  /* =====================================================
     SUBIR TODAS LAS FOTOS
     ===================================================== */

  private subirTodasLasFotos(
    relevo: RelevoResponse
  ): Observable<any> {

    const cargas:
      Observable<any>[] = [];

    /*
     * Evidencias de checklist.
     */
    for (
      const item
      of relevo.checklist ?? []
    ) {

      const index =
        this.checklist.controls
          .findIndex(
            control =>
              Number(
                control
                  .get('elementoId')
                  ?.value
              )
              ===
              item.elementoId
          );

      if (
        index === -1
      ) {
        continue;
      }

      const fotos =
        this.archivosChecklist
          .get(index)
        ?? [];

      for (
        const foto
        of fotos
      ) {

        cargas.push(
          this.relevoApi
            .subirEvidenciaChecklist(
              item.id,
              foto.file
            )
        );

      }

    }


    /*
     * Evidencias de vías.
     */
    for (
      const item
      of relevo.vias ?? []
    ) {

      const index =
        this.vias.controls
          .findIndex(
            control =>
              Number(
                control
                  .get('viaId')
                  ?.value
              )
              ===
              item.viaId
          );

      if (
        index === -1
      ) {
        continue;
      }

      const fotos =
        this.archivosVias
          .get(index)
        ?? [];

      for (
        const foto
        of fotos
      ) {

        cargas.push(
          this.relevoApi
            .subirEvidenciaVia(
              item.id,
              foto.file
            )
        );

      }

    }

    if (
      cargas.length === 0
    ) {

      return of([]);

    }

    return forkJoin(
      cargas
    );

  }


  /* =====================================================
     LIMPIAR VÍAS
     ===================================================== */

  private limpiarVias(): void {

    this.archivosVias
      .forEach(
        archivos =>
          this.liberarPreviews(
            archivos
          )
      );

    this.archivosVias.clear();

    this.vias.clear();

  }


  /* =====================================================
     RESET
     ===================================================== */

  private resetearFormulario(): void {

    this.archivosChecklist
      .forEach(
        archivos =>
          this.liberarPreviews(
            archivos
          )
      );

    this.archivosChecklist.clear();

    this.limpiarVias();

    this.viasDisponibles = [];

    this.form.reset({

      plazaId: null,
      turnoId: null,
      operadorId: null,

      fecha:
        this.fechaHoy(),

      hora:
        this.horaActual(),

      observaciones: '',
      resumen: ''

    });

    /*
     * Regenera Baños, Lavadero,
     * Refrigeradora y Conos.
     */
    this.construirChecklist();

  }


  /* =====================================================
     LIBERAR PREVIEWS
     ===================================================== */

  private liberarPreviews(
    items: ArchivoPreview[]
  ): void {

    items.forEach(
      item =>
        URL.revokeObjectURL(
          item.url
        )
    );

  }


  /* =====================================================
     SCROLL A ERROR
     ===================================================== */

  private irPrimerError(): void {

    setTimeout(
      () => {

        const elemento =
          document.querySelector(
            `
            input.ng-invalid,
            select.ng-invalid,
            textarea.ng-invalid
            `
          );

        elemento
          ?.scrollIntoView({
            behavior: 'smooth',
            block: 'center'
          });

      },
      50
    );

  }


  /* =====================================================
     FECHA ACTUAL
     ===================================================== */

  private fechaHoy(): string {

    const ahora =
      new Date();

    const anio =
      ahora.getFullYear();

    const mes =
      String(
        ahora.getMonth() + 1
      )
        .padStart(
          2,
          '0'
        );

    const dia =
      String(
        ahora.getDate()
      )
        .padStart(
          2,
          '0'
        );

    return `${anio}-${mes}-${dia}`;

  }


  /* =====================================================
     HORA ACTUAL
     ===================================================== */

  private horaActual(): string {

    const ahora =
      new Date();

    const horas =
      String(
        ahora.getHours()
      )
        .padStart(
          2,
          '0'
        );

    const minutos =
      String(
        ahora.getMinutes()
      )
        .padStart(
          2,
          '0'
        );

    return `${horas}:${minutos}`;

  }

}
