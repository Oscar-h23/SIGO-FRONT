import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AsistenciaResponse } from '../../core/models/asistencia.models';
import { AsistenciaApiService } from '../../core/services/asistencia-api.service';

@Component({
  selector: 'app-asistencia-history',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './asistencia-history.component.html',
  styleUrl: './asistencia-history.component.css'
})
export class AsistenciaHistoryComponent implements OnInit {
  private readonly api = inject(AsistenciaApiService);

  readonly loading = signal(false);
  readonly error = signal('');
  readonly registros = signal<AsistenciaResponse[]>([]);
  readonly expandedId = signal<number | null>(null);

  inicio = '';
  fin = '';

  ngOnInit(): void {
    this.cargar();
  }

  cargar(): void {
    this.loading.set(true);
    this.error.set('');
    this.api.listarAsistencias(this.inicio || undefined, this.fin || undefined).subscribe({
      next: (items) => {
        this.registros.set(items);
        this.loading.set(false);
      },
      error: (err) => {
        this.error.set(this.errorMessage(err));
        this.loading.set(false);
      }
    });
  }

  limpiar(): void {
    this.inicio = '';
    this.fin = '';
    this.cargar();
  }

  toggle(id: number): void {
    this.expandedId.update((current) => current === id ? null : id);
  }

  badgeClass(value: number): string {
    if (value >= 95) return 'excellent';
    if (value >= 85) return 'good';
    return 'warning';
  }

  private errorMessage(err: unknown): string {
    const e = err as { error?: { message?: string } | string };
    if (typeof e?.error === 'string') return e.error;
    return e?.error?.message ?? 'No se pudo cargar el historial de asistencias.';
  }
}
