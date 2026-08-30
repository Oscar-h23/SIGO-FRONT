import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormArray,
  FormBuilder,
  ReactiveFormsModule,
  Validators
} from '@angular/forms';
import { forkJoin } from 'rxjs';

import { AsistenciaApiService } from '../../core/services/asistencia-api.service';
import {
  MotivoAusencia,
  Plaza,
  Trabajador,
  Turno
} from '../../core/models/asistencia.models';

interface AusenciaFormValue {
  trabajadorId: number | null;
  motivoId: number | null;
  observacion: string | null;
}

@Component({
  selector: 'app-asistencia-form',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule
  ],
  templateUrl: './asistencia-form.component.html',
  styleUrl: './asistencia-form.component.css'
})
export class AsistenciaFormComponent implements OnInit {

  private readonly fb = inject(FormBuilder);
  private readonly api = inject(AsistenciaApiService);

  readonly loadingCatalogos = signal(true);
  readonly saving = signal(false);

  readonly plazas = signal<Plaza[]>([]);
  readonly turnos = signal<Turno[]>([]);
  readonly motivos = signal<MotivoAusencia[]>([]);
  readonly controladores = signal<Trabajador[]>([]);
  readonly agentes = signal<Trabajador[]>([]);

  readonly files = signal<File[]>([]);

  readonly success = signal('');
  readonly error = signal('');

  readonly programados = signal(0);
  readonly ausentesEsperados = signal(0);

  readonly form = this.fb.group({
    plazaId: [
      null as number | null,
      Validators.required
    ],

    turnoId: [
      null as number | null,
      Validators.required
    ],

    controladorId: [
      null as number | null,
      Validators.required
    ],

    fecha: [
      this.today(),
      Validators.required
    ],

    presentes: [
      0,
      [
        Validators.required,
        Validators.min(0)
      ]
    ],

    notas: [''],

    ausencias: this.fb.array([])
  });

  get ausencias(): FormArray {
    return this.form.controls.ausencias;
  }

  ngOnInit(): void {

    this.api.getCatalogos().subscribe({
      next: (data) => {

        this.plazas.set(data.plazas);
        this.turnos.set(data.turnos);
        this.motivos.set(data.motivos);
        this.controladores.set(data.controladores);
        this.agentes.set(data.agentes);

        this.loadingCatalogos.set(false);
      },

      error: (err) => {
        this.error.set(
          this.errorMessage(err)
        );

        this.loadingCatalogos.set(false);
      }
    });

    this.form.controls.turnoId.valueChanges.subscribe(() => {
      this.syncTurno();
    });

    this.form.controls.presentes.valueChanges.subscribe(() => {
      this.syncAusencias();
    });

    this.form.controls.plazaId.valueChanges.subscribe(() => {
      this.resetAusenciasTrabajadores();
    });
  }

  agentesFiltrados(): Trabajador[] {

    const plazaId = Number(
      this.form.controls.plazaId.value
    );

    return this.agentes().filter((agente) => {
      return !plazaId ||
        agente.plaza?.id === plazaId;
    });
  }

  onFiles(event: Event): void {

    const input =
      event.target as HTMLInputElement;

    const selected = Array
      .from(input.files ?? [])
      .filter((file) =>
        file.type.startsWith('image/')
      );

    const total = [
      ...this.files(),
      ...selected
    ].slice(0, 5);

    this.files.set(total);

    input.value = '';
  }

  removeFile(index: number): void {

    this.files.update((items) =>
      items.filter((_, i) =>
        i !== index
      )
    );
  }

  fileUrl(file: File): string {
    return URL.createObjectURL(file);
  }

  submit(): void {

    this.success.set('');
    this.error.set('');

    this.form.markAllAsTouched();

    if (this.form.invalid) {

      this.error.set(
        'Completa los campos obligatorios antes de registrar la asistencia.'
      );

      return;
    }

    const expected =
      this.ausentesEsperados();

    if (
      this.ausencias.length !== expected
    ) {

      this.error.set(
        `Debes registrar exactamente ${expected} ausencia(s).`
      );

      return;
    }

    const absentIds =
      this.ausencias.controls.map(
        (control) =>
          Number(
            control.get('trabajadorId')?.value
          )
      );

    if (
      new Set(absentIds).size !==
      absentIds.length
    ) {

      this.error.set(
        'No puedes seleccionar al mismo trabajador ausente más de una vez.'
      );

      return;
    }

    const raw =
      this.form.getRawValue();

    const ausencias =
      raw.ausencias as AusenciaFormValue[];

    this.saving.set(true);

    this.api.registrarAsistencia({

      plazaId:
        Number(raw.plazaId),

      turnoId:
        Number(raw.turnoId),

      controladorId:
        Number(raw.controladorId),

      fecha:
        String(raw.fecha),

      presentes:
        Number(raw.presentes),

      notas:
        raw.notas?.trim() || null,

      ausencias:
        ausencias.map((ausencia) => ({
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
              ?.trim() || null
        })),

      evidencias: []

    }).subscribe({

      next: (created) => {

        const uploads =
          this.files().map((file) =>
            this.api.subirEvidencia(
              created.id,
              file
            )
          );

        if (!uploads.length) {

          this.finishSuccess(
            created.id
          );

          return;
        }

        forkJoin(uploads).subscribe({

          next: () => {

            this.finishSuccess(
              created.id
            );
          },

          error: (err) => {

            this.saving.set(false);

            this.error.set(
              `La asistencia #${created.id} se registró, pero una evidencia no pudo subirse. ${this.errorMessage(err)}`
            );
          }
        });
      },

      error: (err) => {

        this.saving.set(false);

        this.error.set(
          this.errorMessage(err)
        );
      }
    });
  }

  private syncTurno(): void {

    const turno =
      this.turnos().find(
        (item) =>
          item.id ===
          Number(
            this.form.controls.turnoId.value
          )
      );

    const total =
      turno?.personalProgramado ?? 0;

    this.programados.set(total);

    this.form.controls.presentes.setValidators([
      Validators.required,
      Validators.min(0),
      Validators.max(total)
    ]);

    this.form.controls.presentes.setValue(
      total,
      {
        emitEvent: false
      }
    );

    this.form.controls.presentes
      .updateValueAndValidity({
        emitEvent: false
      });

    this.syncAusencias();
  }

  private syncAusencias(): void {

    const presentes =
      Number(
        this.form.controls.presentes.value ?? 0
      );

    const expected =
      Math.max(
        0,
        this.programados() - presentes
      );

    this.ausentesEsperados.set(
      expected
    );

    while (
      this.ausencias.length < expected
    ) {

      this.ausencias.push(
        this.fb.group({

          trabajadorId: [
            null as number | null,
            Validators.required
          ],

          motivoId: [
            null as number | null,
            Validators.required
          ],

          observacion: ['']
        })
      );
    }

    while (
      this.ausencias.length > expected
    ) {

      this.ausencias.removeAt(
        this.ausencias.length - 1
      );
    }
  }

  private resetAusenciasTrabajadores(): void {

    for (
      const group
      of this.ausencias.controls
    ) {

      group
        .get('trabajadorId')
        ?.setValue(null);
    }
  }

  private finishSuccess(
    id: number
  ): void {

    this.saving.set(false);

    this.success.set(
      `Asistencia #${id} registrada correctamente${
        this.files().length
          ? ' con sus evidencias'
          : ''
      }.`
    );

    this.files.set([]);

    this.form.reset({
      plazaId: null,
      turnoId: null,
      controladorId: null,
      fecha: this.today(),
      presentes: 0,
      notas: ''
    });

    this.programados.set(0);

    this.ausentesEsperados.set(0);

    this.ausencias.clear();
  }

  private today(): string {

    const date =
      new Date();

    const offset =
      date.getTimezoneOffset();

    return new Date(
      date.getTime() -
      offset * 60000
    )
      .toISOString()
      .slice(0, 10);
  }

  private errorMessage(
    err: unknown
  ): string {

    const error =
      err as {
        error?:
          | {
              message?: string;
              error?: string;
            }
          | string;
        message?: string;
      };

    if (
      typeof error?.error === 'string'
    ) {

      return error.error;
    }

    return (
      error?.error?.message ??
      error?.error?.error ??
      error?.message ??
      'Ocurrió un error inesperado.'
    );
  }
}