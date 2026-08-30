import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { forkJoin, Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  AsistenciaRequest,
  AsistenciaResponse,
  AusenciaMotivo,
  DashboardPunto,
  EvidenciaResponse,
  MotivoAusencia,
  Plaza,
  ResumenAsistencia,
  Trabajador,
  Turno
} from '../models/asistencia.models';

@Injectable({ providedIn: 'root' })
export class AsistenciaApiService {
  private readonly http = inject(HttpClient);
  private readonly api = environment.apiUrl;

  getCatalogos(): Observable<{
    plazas: Plaza[];
    turnos: Turno[];
    motivos: MotivoAusencia[];
    controladores: Trabajador[];
    agentes: Trabajador[];
  }> {
    return forkJoin({
      plazas: this.getPlazas(),
      turnos: this.getTurnos(),
      motivos: this.getMotivos(),
      controladores: this.getTrabajadores('Controlador'),
      agentes: this.getTrabajadores('Agente de Recaudación')
    });
  }

  getPlazas(): Observable<Plaza[]> {
    return this.http.get<Plaza[]>(`${this.api}/plazas`);
  }

  getTurnos(): Observable<Turno[]> {
    return this.http.get<Turno[]>(`${this.api}/turnos`);
  }

  getMotivos(): Observable<MotivoAusencia[]> {
    return this.http.get<MotivoAusencia[]>(`${this.api}/motivos-ausencia`);
  }

  getTrabajadores(puesto?: string): Observable<Trabajador[]> {
    let params = new HttpParams();
    if (puesto) params = params.set('puesto', puesto);
    return this.http.get<Trabajador[]>(`${this.api}/trabajadores`, { params });
  }

  registrarAsistencia(request: AsistenciaRequest): Observable<AsistenciaResponse> {
    return this.http.post<AsistenciaResponse>(`${this.api}/asistencias`, request);
  }

  subirEvidencia(asistenciaId: number, file: File): Observable<EvidenciaResponse> {
    const formData = new FormData();
    formData.append('file', file);
    return this.http.post<EvidenciaResponse>(`${this.api}/asistencias/${asistenciaId}/evidencias`, formData);
  }

  listarAsistencias(inicio?: string, fin?: string): Observable<AsistenciaResponse[]> {
    let params = new HttpParams();
    if (inicio) params = params.set('inicio', inicio);
    if (fin) params = params.set('fin', fin);
    return this.http.get<AsistenciaResponse[]>(`${this.api}/asistencias`, { params });
  }

  obtenerAsistencia(id: number): Observable<AsistenciaResponse> {
    return this.http.get<AsistenciaResponse>(`${this.api}/asistencias/${id}`);
  }

  getResumen(inicio?: string, fin?: string): Observable<ResumenAsistencia> {
    let params = new HttpParams();
    if (inicio) params = params.set('inicio', inicio);
    if (fin) params = params.set('fin', fin);
    return this.http.get<ResumenAsistencia>(`${this.api}/dashboard/asistencia/resumen`, { params });
  }

  getDiario(anio: number, mes: number): Observable<DashboardPunto[]> {
    const params = new HttpParams().set('anio', anio).set('mes', mes);
    return this.http.get<DashboardPunto[]>(`${this.api}/dashboard/asistencia/diario`, { params });
  }

  getAusenciasMotivo(anio: number, mes?: number): Observable<AusenciaMotivo[]> {
    let params = new HttpParams().set('anio', anio);
    if (mes !== undefined) params = params.set('mes', mes);
    return this.http.get<AusenciaMotivo[]>(`${this.api}/dashboard/asistencia/ausencias-motivo`, { params });
  }
}
