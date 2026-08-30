import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';
import { AsistenciaResponse, Plaza, Trabajador, Turno } from '../../core/models/asistencia.models';
import { AsistenciaApiService } from '../../core/services/asistencia-api.service';

interface LinePoint {
  label: string;
  value: number | null;
}

interface MotivoConteo {
  motivo: string;
  total: number;
}

interface TurnoResumen {
  id: number;
  nombre: string;
  porcentaje: number;
}

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.css'
})
export class DashboardComponent implements OnInit {
  private readonly api = inject(AsistenciaApiService);

  readonly loading = signal(true);
  readonly error = signal('');
  readonly plazas = signal<Plaza[]>([]);
  readonly turnos = signal<Turno[]>([]);
  readonly registrosAnio = signal<AsistenciaResponse[]>([]);

  private readonly ahora = new Date();
  readonly anio = signal(this.ahora.getFullYear());
  readonly mes = signal(this.ahora.getMonth() + 1);
  readonly plazaId = signal<number | null>(null);
  readonly turnoId = signal<number | null>(null);

  readonly meses = [
    { id: 1, nombre: 'Enero', corto: 'Ene' },
    { id: 2, nombre: 'Febrero', corto: 'Feb' },
    { id: 3, nombre: 'Marzo', corto: 'Mar' },
    { id: 4, nombre: 'Abril', corto: 'Abr' },
    { id: 5, nombre: 'Mayo', corto: 'May' },
    { id: 6, nombre: 'Junio', corto: 'Jun' },
    { id: 7, nombre: 'Julio', corto: 'Jul' },
    { id: 8, nombre: 'Agosto', corto: 'Ago' },
    { id: 9, nombre: 'Septiembre', corto: 'Sep' },
    { id: 10, nombre: 'Octubre', corto: 'Oct' },
    { id: 11, nombre: 'Noviembre', corto: 'Nov' },
    { id: 12, nombre: 'Diciembre', corto: 'Dic' }
  ];

  readonly anios = Array.from({ length: 7 }, (_, i) => this.ahora.getFullYear() + 1 - i);
  readonly yTicks = [100, 75, 50, 25, 0];

  readonly nombreMes = computed(() => this.meses.find((m) => m.id === this.mes())?.nombre ?? 'Mes');

  readonly registrosBase = computed(() => {
    const plazaId = this.plazaId();
    const turnoId = this.turnoId();
    return this.registrosAnio().filter((r) =>
      (!plazaId || r.plazaId === plazaId) &&
      (!turnoId || r.turnoId === turnoId)
    );
  });

  readonly registrosMes = computed(() => {
    const mes = this.mes();
    return this.registrosBase().filter((r) => this.monthOf(r.fecha) === mes);
  });

  readonly totalRegistros = computed(() => this.registrosMes().length);
  readonly totalAusencias = computed(() => this.registrosMes().reduce((acc, r) => acc + r.ausentes, 0));
  readonly registros100 = computed(() => this.registrosMes().filter((r) => Number(r.porcentaje) >= 99.995).length);
  readonly asistenciaPromedio = computed(() => this.weightedPercentage(this.registrosMes()));

  readonly mensual = computed<LinePoint[]>(() => this.meses.map((m) => ({
    label: m.corto,
    value: this.percentageFor(this.registrosBase().filter((r) => this.monthOf(r.fecha) === m.id))
  })));

  readonly diario = computed<LinePoint[]>(() => {
    const dias = new Date(this.anio(), this.mes(), 0).getDate();
    return Array.from({ length: dias }, (_, i) => {
      const dia = i + 1;
      return {
        label: String(dia),
        value: this.percentageFor(this.registrosMes().filter((r) => this.dayOf(r.fecha) === dia))
      };
    });
  });

  readonly motivos = computed<MotivoConteo[]>(() => {
    const mapa = new Map<string, number>();
    for (const registro of this.registrosMes()) {
      for (const ausencia of registro.ausencias ?? []) {
        mapa.set(ausencia.motivo, (mapa.get(ausencia.motivo) ?? 0) + 1);
      }
    }
    return [...mapa.entries()]
      .map(([motivo, total]) => ({ motivo, total }))
      .sort((a, b) => b.total - a.total || a.motivo.localeCompare(b.motivo))
      .slice(0, 6);
  });

  readonly maxMotivos = computed(() => Math.max(...this.motivos().map((m) => m.total), 1));

  readonly resumenTurnos = computed<TurnoResumen[]>(() => this.turnos().map((turno) => ({
    id: turno.id,
    nombre: `Turno ${turno.codigo}`,
    porcentaje: this.weightedPercentage(this.registrosMes().filter((r) => r.turnoId === turno.id))
  })));

  ngOnInit(): void {
    this.cargarInicial();
  }

  onAnioChange(event: Event): void {
    this.anio.set(Number((event.target as HTMLSelectElement).value));
    this.cargarRegistros();
  }

  onMesChange(event: Event): void {
    this.mes.set(Number((event.target as HTMLSelectElement).value));
  }

  onPlazaChange(event: Event): void {
    const value = (event.target as HTMLSelectElement).value;
    this.plazaId.set(value ? Number(value) : null);
  }

  onTurnoChange(event: Event): void {
    const value = (event.target as HTMLSelectElement).value;
    this.turnoId.set(value ? Number(value) : null);
  }

  cargarInicial(): void {
    this.loading.set(true);
    this.error.set('');
    const { inicio, fin } = this.yearRange();

    forkJoin({
      plazas: this.api.getPlazas(),
      turnos: this.api.getTurnos(),
      registros: this.api.listarAsistencias(inicio, fin)
    }).subscribe({
      next: ({ plazas, turnos, registros }) => {
        this.plazas.set(plazas);
        this.turnos.set(turnos);
        this.registrosAnio.set(registros);
        this.loading.set(false);
      },
      error: (err) => this.handleError(err)
    });
  }

  cargarRegistros(): void {
    this.loading.set(true);
    this.error.set('');
    const { inicio, fin } = this.yearRange();

    this.api.listarAsistencias(inicio, fin).subscribe({
      next: (registros) => {
        this.registrosAnio.set(registros);
        this.loading.set(false);
      },
      error: (err) => this.handleError(err)
    });
  }

  linePath(points: LinePoint[]): string {
    let path = '';
    let drawing = false;

    points.forEach((point, index) => {
      if (point.value === null) {
        drawing = false;
        return;
      }
      const x = this.chartX(index, points.length);
      const y = this.chartY(point.value);
      path += `${drawing ? ' L' : ' M'} ${x.toFixed(2)} ${y.toFixed(2)}`;
      drawing = true;
    });

    return path.trim();
  }

  chartX(index: number, total: number): number {
    const left = 55;
    const right = 20;
    const width = 1000 - left - right;
    return total <= 1 ? left + width / 2 : left + (index * width) / (total - 1);
  }

  chartY(value: number): number {
    const top = 18;
    const bottom = 238;
    const clamped = Math.max(0, Math.min(100, value));
    return bottom - (clamped / 100) * (bottom - top);
  }

  motivoWidth(total: number): number {
    return Math.max(2, (total / this.maxMotivos()) * 100);
  }

  trackByIndex(index: number): number {
    return index;
  }

  private percentageFor(registros: AsistenciaResponse[]): number | null {
    if (!registros.length) return null;
    return this.weightedPercentage(registros);
  }

  private weightedPercentage(registros: AsistenciaResponse[]): number {
    const programados = registros.reduce((acc, r) => acc + Number(r.programados || 0), 0);
    const presentes = registros.reduce((acc, r) => acc + Number(r.presentes || 0), 0);
    if (!programados) return 0;
    return Math.round((presentes / programados) * 1000) / 10;
  }

  private monthOf(fecha: string): number {
    return Number(fecha.slice(5, 7));
  }

  private dayOf(fecha: string): number {
    return Number(fecha.slice(8, 10));
  }

  private yearRange(): { inicio: string; fin: string } {
    return {
      inicio: `${this.anio()}-01-01`,
      fin: `${this.anio()}-12-31`
    };
  }

  private handleError(err: unknown): void {
    this.loading.set(false);
    const e = err as { error?: { message?: string }; message?: string };
    this.error.set(e?.error?.message ?? e?.message ?? 'No se pudo cargar el dashboard. Verifica que Spring Boot esté ejecutándose.');
  }
}
