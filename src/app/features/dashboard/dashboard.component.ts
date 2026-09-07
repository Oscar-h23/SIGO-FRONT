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
  color: string;
}

interface TurnoResumen {
  id: number;
  nombre: string;
  porcentaje: number;
  color: string;
}

interface Tendencia {
  delta: number;
  subiendo: boolean;
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

  // Umbral de referencia: por debajo de esto, un punto se pinta como alerta en las gráficas.
  readonly meta = 95;

  // Paletas de color para diferenciar turnos y motivos en las barras (ya existían como
  // variables CSS sin usar en el proyecto: --blue-600, --cyan-500, --green-600, etc).
  private readonly paletaTurnos = ['#1d63d9', '#13a8c7', '#15835f', '#a76300', '#0c2449', '#ba3b3b'];
  private readonly paletaMotivos = ['#a76300', '#ba3b3b', '#1d63d9', '#13a8c7', '#15835f', '#0c2449'];

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

  // Compara el mes actual contra el mes anterior dentro del mismo año (usa los mismos datos
  // ya cargados de `mensual`). Si es enero, o el mes anterior aún no tiene datos, no hay tendencia.
  readonly tendenciaMensual = computed<Tendencia | null>(() => {
    const puntos = this.mensual();
    const indiceActual = this.mes() - 1;
    const indiceAnterior = indiceActual - 1;
    if (indiceAnterior < 0) return null;

    const actual = puntos[indiceActual]?.value;
    const anterior = puntos[indiceAnterior]?.value;
    if (actual === null || actual === undefined || anterior === null || anterior === undefined) {
      return null;
    }

    const delta = Math.round((actual - anterior) * 10) / 10;
    return { delta, subiendo: delta >= 0 };
  });

  // Mini-tendencia para la tarjeta KPI: hasta los últimos 6 meses con datos, hasta el mes actual.
  readonly sparklineMensual = computed<LinePoint[]>(() => {
    const puntos = this.mensual().slice(0, this.mes());
    const conDatos = puntos.filter((p) => p.value !== null);
    return conDatos.slice(-6);
  });

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
      .slice(0, 6)
      .map((item, index) => ({ ...item, color: this.paletaMotivos[index % this.paletaMotivos.length] }));
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
    return this.turnos().map((turno, index) => {
      const datos = acumulado.get(turno.id);
      const porcentaje = datos && datos.programados > 0
        ? Math.round((datos.presentes / datos.programados) * 1000) / 10
        : 0;
      return {
        id: turno.id,
        nombre: `Turno ${turno.codigo}`,
        porcentaje,
        color: this.paletaTurnos[index % this.paletaTurnos.length]
      };
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

  /** Genera un path SVG con curva suave (Catmull-Rom -> Bezier) en vez de segmentos rectos. */
  linePath(points: LinePoint[]): string {
    const segmentos = this.segmentosValidos(points);
    return segmentos.map((seg) => this.smoothSegment(seg)).join(' ');
  }

  /** Área bajo la curva, para el relleno con degradado. Cierra cada tramo contra la línea base. */
  areaPath(points: LinePoint[]): string {
    const baseline = this.chartY(0);
    const segmentos = this.segmentosValidos(points);

    return segmentos
      .map((seg) => {
        const curva = this.smoothSegment(seg);
        const primero = seg[0];
        const ultimo = seg[seg.length - 1];
        return `${curva} L ${ultimo.x.toFixed(2)} ${baseline.toFixed(2)} L ${primero.x.toFixed(2)} ${baseline.toFixed(2)} Z`;
      })
      .join(' ');
  }

  /** true si el valor cae por debajo del umbral de referencia (this.meta). */
  bajoMeta(value: number | null): boolean {
    return value !== null && value < this.meta;
  }

  /** Divide los puntos en tramos continuos (corta donde value es null, como huecos sin datos). */
  private segmentosValidos(points: LinePoint[]): { x: number; y: number }[][] {
    const segmentos: { x: number; y: number }[][] = [];
    let actual: { x: number; y: number }[] = [];

    points.forEach((point, index) => {
      if (point.value === null) {
        if (actual.length) segmentos.push(actual);
        actual = [];
        return;
      }
      actual.push({ x: this.chartX(index, points.length), y: this.chartY(point.value) });
    });

    if (actual.length) segmentos.push(actual);
    return segmentos;
  }

  /** Convierte una lista de puntos en una curva suave usando Catmull-Rom -> Bezier cúbica. */
  private smoothSegment(pts: { x: number; y: number }[]): string {
    if (pts.length < 2) {
      const p = pts[0];
      return p ? `M ${p.x.toFixed(2)} ${p.y.toFixed(2)}` : '';
    }

    let path = `M ${pts[0].x.toFixed(2)} ${pts[0].y.toFixed(2)}`;

    for (let i = 0; i < pts.length - 1; i++) {
      const p0 = pts[i - 1] ?? pts[i];
      const p1 = pts[i];
      const p2 = pts[i + 1];
      const p3 = pts[i + 2] ?? p2;

      const c1x = p1.x + (p2.x - p0.x) / 6;
      const c1y = p1.y + (p2.y - p0.y) / 6;
      const c2x = p2.x - (p3.x - p1.x) / 6;
      const c2y = p2.y - (p3.y - p1.y) / 6;

      path += ` C ${c1x.toFixed(2)} ${c1y.toFixed(2)}, ${c2x.toFixed(2)} ${c2y.toFixed(2)}, ${p2.x.toFixed(2)} ${p2.y.toFixed(2)}`;
    }

    return path;
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

  /** Path de un mini-gráfico de línea para la tarjeta KPI (viewBox propio, 120x32). */
  sparklinePath(points: LinePoint[]): string {
    const valores = points.map((p) => p.value).filter((v): v is number => v !== null);
    if (valores.length < 2) return '';

    const min = Math.min(...valores);
    const max = Math.max(...valores);
    const rango = max - min || 1;
    const width = 120;
    const height = 32;
    const pad = 3;

    const coords = valores.map((v, i) => ({
      x: valores.length <= 1 ? width / 2 : (i * (width - pad * 2)) / (valores.length - 1) + pad,
      y: height - pad - ((v - min) / rango) * (height - pad * 2)
    }));

    return this.smoothSegment(coords);
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