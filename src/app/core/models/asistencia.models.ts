export interface Plaza {

  id: number;

  codigo: string;

  descripcion: string | null;

  activo: boolean;

}

export interface Turno {

  id: number;

  codigo: string;

  nombre: string;

  personalProgramado: number;

}

export interface Puesto {

  id: number;

  nombre: string;

}

export interface Trabajador {

  id: number;

  codigo: number;

  nombreCompleto: string;

  puesto: Puesto;

  plaza: Plaza | null;

  activo: boolean;

}

export interface MotivoAusencia {

  id: number;

  nombre: string;

}

export interface AusenciaRequest {

  trabajadorId: number;

  motivoId: number;

  observacion: string | null;

}

export interface AsistenciaRequest {

  plazaId: number;

  turnoId: number;

  controladorId: number;

  fecha: string;

  programados: number;

  presentes: number;

  notas?: string | null;

  ausencias: AusenciaRequest[];

  evidencias: string[];

}

/*
 * =========================================================
 * ACTUALIZAR ASISTENCIA
 * =========================================================
 *
 * Se utiliza con:
 *
 * PUT /api/asistencias/{id}
 *
 * Las evidencias NO se envían aquí.
 * Se administran mediante POST y DELETE.
 */
export interface AsistenciaUpdateRequest {

  plazaId: number;

  turnoId: number;

  controladorId: number;

  fecha: string;

  programados: number;

  presentes: number;

  notas?: string | null;

  ausencias: AusenciaRequest[];

}

export interface AusenciaResponse {

  id: number;

  trabajadorId: number;

  codigoTrabajador: number;

  nombreTrabajador: string;

  motivoId: number;

  motivo: string;

  observacion: string | null;

}

export interface EvidenciaResponse {

  id: number;

  urlArchivo: string;

  tipo: string;

}

export interface AsistenciaResponse {

  id: number;

  plazaId: number;

  plaza: string;

  turnoId: number;

  turno: string;

  controladorId: number;

  controlador: string;

  fecha: string;

  programados: number;

  presentes: number;

  ausentes: number;

  porcentaje: number;

  notas: string | null;

  ausencias: AusenciaResponse[];

  evidencias: EvidenciaResponse[];

}

export interface DashboardPunto {

  periodo: number;

  presentes: number;

  programados: number;

  porcentaje: number;

}

export interface AusenciaMotivo {

  motivo: string;

  total: number;

}

export interface ResumenAsistencia {

  registros: number;

  presentes: number;

  programados: number;

  ausentes: number;

  porcentajeGeneral: number;

}