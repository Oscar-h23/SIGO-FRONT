export type EstadoOperativo =
  | 'OPERATIVO'
  | 'OBSERVADO'
  | 'NO_OPERATIVO';


/* =====================================================
   VÍAS
   ===================================================== */

export interface Via {
  id: number;

  plazaId?: number;

  numero: number;

  nombre: string | null;

  activa?: boolean;

  orden?: number;
}


/* =====================================================
   ELEMENTOS
   ===================================================== */

export interface ElementoRelevo {
  id: number;

  codigo: string;

  nombre: string;

  categoria:
    | 'BASE_OPERATIVA'
    | 'PLAZA_PEAJE';

  requiereCantidad: boolean;

  activo?: boolean;

  orden: number;
}


/* =====================================================
   REQUEST CHECKLIST
   ===================================================== */

export interface RelevoChecklistRequest {
  elementoId: number;

  estado: EstadoOperativo;

  detalle: string | null;

  cantidad: number | null;
}


/* =====================================================
   REQUEST VÍA
   ===================================================== */

export interface RelevoViaRequest {
  viaId: number;

  estado: EstadoOperativo;

  detalle: string | null;
}


/* =====================================================
   REQUEST RELEVO
   ===================================================== */

export interface RelevoRequest {
  plazaId: number;

  turnoId: number;

  operadorId: number;

  fecha: string;

  hora: string;

  checklist: RelevoChecklistRequest[];

  vias: RelevoViaRequest[];

  observaciones: string | null;

  resumen: string | null;
}


/* =====================================================
   EVIDENCIA
   ===================================================== */

export interface EvidenciaRelevoResponse {
  id: number;

  urlArchivo: string;

  publicId: string | null;

  tipo: string;

  createdAt: string;
}


/* =====================================================
   CHECKLIST RESPONSE
   ===================================================== */

export interface RelevoChecklistResponse {
  id: number;

  elementoId: number;

  codigo: string;

  nombre: string;

  categoria:
    | 'BASE_OPERATIVA'
    | 'PLAZA_PEAJE';

  estado: EstadoOperativo;

  detalle: string | null;

  cantidad: number | null;

  evidencias: EvidenciaRelevoResponse[];
}


/* =====================================================
   VÍA RESPONSE
   ===================================================== */

export interface RelevoViaResponse {
  id: number;

  viaId: number;

  numero: number;

  nombre: string | null;

  estado: EstadoOperativo;

  detalle: string | null;

  evidencias: EvidenciaRelevoResponse[];
}


/* =====================================================
   RELEVO RESPONSE
   ===================================================== */

export interface RelevoResponse {
  id: number;


  /* PLAZA */

  plazaId: number;

  plazaCodigo: string;

  plazaDescripcion: string | null;


  /* TURNO */

  turnoId: number;

  turnoCodigo: string;

  turnoNombre: string;


  /* OPERADOR */

  operadorId: number;

  operadorCodigo: number;

  operadorNombre: string;


  /* FECHA */

  fecha: string;

  hora: string;


  /* TEXTO */

  observaciones: string | null;

  resumen: string | null;


  /* AUDITORÍA */

  createdAt: string;

  updatedAt: string;


  /* DETALLE */

  checklist: RelevoChecklistResponse[];

  vias: RelevoViaResponse[];
}