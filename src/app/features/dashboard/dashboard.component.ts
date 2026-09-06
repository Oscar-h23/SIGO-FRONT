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
  // Carga aparte solo para el gráfico mensual (año completo). No bloquea el resto del dashboard.
  readonly loadingMensual = signal(true);
  readonly error = signal('');
  readonly plazas = signal<Plaza[]>([]);
  readonly turnos = signal<Turno[]>([]);

  // Antes: registrosAnio traía TODO el año para pintar un solo mes -> payload enorme en la carga inicial.
  // Ahora: registrosMesActual trae solo el rango del mes seleccionado (rápido, liviano).
  readonly registrosMesActual = signal<AsistenciaResponse[]>([]);
  // registrosAnio solo alimenta el gráfico de tendencia mensual; se carga en segundo plano.
  readonly registrosAnio = signal<AsistenciaResponse[]>([]);

  private readonly ahora = new Date();

readonly anio = signal(
  this.ahora.getFullYear()
);

readonly mes = signal(
  this.ahora.getMonth() + 1
);

readonly plazaId =
  signal<number | null>(null);

readonly turnoId =
  signal<number | null>(null);

  // Cache en memoria: evita re-pedir al backend un (mes,plaza) o (año,plaza) ya consultado.
  private readonly cacheMes = new Map<string, AsistenciaResponse[]>();
  private readonly cacheAnio = new Map<string, AsistenciaResponse[]>();

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

  readonly anios = Array.from({ length: 7 }, (_, i) => this.ahora.getFullYear() - i);
  readonly yTicks = [100, 75, 50, 25, 0];

  readonly nombreMes = computed(() => this.meses.find((m) => m.id === this.mes())?.nombre ?? 'Mes');

  // Solo filtra por turno (plaza ya viene filtrada desde el backend en la query).
  // El array de entrada es ahora un solo mes (~decenas de filas), no el año completo.
  readonly registrosMes = computed(() => {
    const turnoId = this.turnoId();
    return this.registrosMesActual().filter((r) => !turnoId || r.turnoId === turnoId);
  });

  readonly registrosAnioFiltrado = computed(() => {
    const turnoId = this.turnoId();
    return this.registrosAnio().filter((r) => !turnoId || r.turnoId === turnoId);
  });

  readonly totalRegistros = computed(() => this.registrosMes().length);
  readonly totalAusencias = computed(() => this.registrosMes().reduce((acc, r) => acc + r.ausentes, 0));
  readonly registros100 = computed(() => this.registrosMes().filter((r) => Number(r.porcentaje) >= 99.995).length);
  readonly asistenciaPromedio = computed(() => this.weightedPercentage(this.registrosMes()));

  // Un solo recorrido de registrosAnioFiltrado() agrupando por mes (antes: 12 .filter() sobre el año completo).
  private readonly acumuladoPorMes = computed(() => {
    const acumulado = new Map<number, { programados: number; presentes: number }>();
    for (const r of this.registrosAnioFiltrado()) {
      const mes = this.monthOf(r.fecha);
      const actual = acumulado.get(mes) ?? { programados: 0, presentes: 0 };
      actual.programados += Number(r.programados || 0);
      actual.presentes += Number(r.presentes || 0);
      acumulado.set(mes, actual);
    }
    return acumulado;
  });

  readonly mensual = computed<LinePoint[]>(() => {
    const acumulado = this.acumuladoPorMes();
    return this.meses.map((m) => {
      const datos = acumulado.get(m.id);
      return {
        label: m.corto,
        value: datos && datos.programados > 0
          ? Math.round((datos.presentes / datos.programados) * 1000) / 10
          : null
      };
    });
  });

  // Un solo recorrido de registrosMes() agrupando por día (antes: hasta 31 .filter()).
  private readonly acumuladoPorDia = computed(() => {
    const acumulado = new Map<number, { programados: number; presentes: number }>();
    for (const r of this.registrosMes()) {
      const dia = this.dayOf(r.fecha);
      const actual = acumulado.get(dia) ?? { programados: 0, presentes: 0 };
      actual.programados += Number(r.programados || 0);
      actual.presentes += Number(r.presentes || 0);
      acumulado.set(dia, actual);
    }
    return acumulado;
  });

  readonly diario = computed<LinePoint[]>(() => {
    const dias = new Date(this.anio(), this.mes(), 0).getDate();
    const acumulado = this.acumuladoPorDia();
    return Array.from({ length: dias }, (_, i) => {
      const dia = i + 1;
      const datos = acumulado.get(dia);
      return {
        label: String(dia),
        value: datos && datos.programados > 0
          ? Math.round((datos.presentes / datos.programados) * 1000) / 10
          : null
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

  // Un solo recorrido de registrosMes() agrupando por turno (antes: un .filter() por turno).
  readonly resumenTurnos = computed<TurnoResumen[]>(() => {
    const acumulado = new Map<number, { programados: number; presentes: number }>();
    for (const r of this.registrosMes()) {
      const actual = acumulado.get(r.turnoId) ?? { programados: 0, presentes: 0 };
      actual.programados += Number(r.programados || 0);
      actual.presentes += Number(r.presentes || 0);
      acumulado.set(r.turnoId, actual);
    }
    return this.turnos().map((turno) => {
      const datos = acumulado.get(turno.id);
      const porcentaje = datos && datos.programados > 0
        ? Math.round((datos.presentes / datos.programados) * 1000) / 10
        : 0;
      return { id: turno.id, nombre: `Turno ${turno.codigo}`, porcentaje };
    });
  });

  ngOnInit(): void {
  this.cargarInicial();
}

onAnioChange(
  event: Event
): void {

  const value =
    Number(
      (
        event.target as HTMLSelectElement
      ).value
    );

  this.anio.set(value);

  this.cargarMesActual();
  this.cargarAnioEnSegundoPlano();
}

onMesChange(
  event: Event
): void {

  const value =
    Number(
      (
        event.target as HTMLSelectElement
      ).value
    );

  this.mes.set(value);
  this.cargarMesActual();
}


  onPlazaChange(event: Event): void {
    const value = (event.target as HTMLSelectElement).value;
    this.plazaId.set(value ? Number(value) : null);
    this.cargarMesActual();
    this.cargarAnioEnSegundoPlano();
  }

  onTurnoChange(event: Event): void {
    // El turno solo filtra en el cliente sobre los datos ya cargados: no dispara ningún request.
    const value = (event.target as HTMLSelectElement).value;
    this.turnoId.set(value ? Number(value) : null);
  }

  cargarInicial(): void {
    this.loading.set(true);
    this.error.set('');
    const { inicio, fin } = this.mesRange();

    forkJoin({
      plazas: this.api.getPlazas(),
      turnos: this.api.getTurnos(),
      registros: this.api.listarAsistencias(inicio, fin, this.plazaId())
    }).subscribe({
      next: ({ plazas, turnos, registros }) => {
        this.plazas.set(plazas);
        this.turnos.set(turnos);
        this.registrosMesActual.set(registros);
        this.cacheMes.set(this.claveMes(), registros);
        this.loading.set(false);
      },
      error: (err) => this.handleError(err)
    });

    // La tendencia anual no bloquea la pintura inicial del dashboard.
    this.cargarAnioEnSegundoPlano();
  }

  /** Carga rápida: solo el rango del mes/año/plaza seleccionados. Es lo único que bloquea `loading`. */
  cargarMesActual(): void {
    const clave = this.claveMes();
    const cacheado = this.cacheMes.get(clave);
    if (cacheado) {
      this.registrosMesActual.set(cacheado);
      return;
    }

    this.loading.set(true);
    this.error.set('');
    const { inicio, fin } = this.mesRange();

    this.api.listarAsistencias(inicio, fin, this.plazaId()).subscribe({
      next: (registros) => {
        this.registrosMesActual.set(registros);
        this.cacheMes.set(clave, registros);
        this.loading.set(false);
      },
      error: (err) => this.handleError(err)
    });
  }

  /** Carga en segundo plano: año completo, únicamente para el gráfico de tendencia mensual. */
  cargarAnioEnSegundoPlano(): void {
    const clave = this.claveAnio();
    const cacheado = this.cacheAnio.get(clave);
    if (cacheado) {
      this.registrosAnio.set(cacheado);
      this.loadingMensual.set(false);
      return;
    }

    this.loadingMensual.set(true);
    const { inicio, fin } = this.yearRange();

    this.api.listarAsistencias(inicio, fin, this.plazaId()).subscribe({
      next: (registros) => {
        this.registrosAnio.set(registros);
        this.cacheAnio.set(clave, registros);
        this.loadingMensual.set(false);
      },
      error: () => this.loadingMensual.set(false)
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

  /** Rango del mes seleccionado, ej: 2026-09-01 a 2026-09-30. */
  private mesRange(): { inicio: string; fin: string } {
    const anio = this.anio();
    const mes = this.mes();
    const ultimoDia = new Date(anio, mes, 0).getDate();
    const mm = String(mes).padStart(2, '0');
    return {
      inicio: `${anio}-${mm}-01`,
      fin: `${anio}-${mm}-${String(ultimoDia).padStart(2, '0')}`
    };
  }

  private claveMes(): string {
    return `${this.anio()}-${this.mes()}-${this.plazaId() ?? 'todas'}`;
  }

  private claveAnio(): string {
    return `${this.anio()}-${this.plazaId() ?? 'todas'}`;
  }

  private handleError(err: unknown): void {
    this.loading.set(false);
    const e = err as { error?: { message?: string }; message?: string };
    this.error.set(e?.error?.message ?? e?.message ?? 'No se pudo cargar el dashboard. Verifica que Spring Boot esté ejecutándose.');
  }
}