export interface PivotDetails {
  cells: Record<string, Record<string, RawRow[]>>;
  rowTotals: Record<string, RawRow[]>;
  colTotals: Record<string, RawRow[]>;
  all: RawRow[];
}

export interface UserStats {
  avgWeekday: number;
  avgSaturday: number;
}

export interface ManagementMetrics {
  slaCompliance: number;
  physicianContribution: number;
  physicianSameDayRate: number;
  transcriberGoalAchievement: number;
  totalProcessed: number;
}

export interface PivotData {
  rowLabels: string[];
  colLabels: string[];
  values: Record<string, Record<string, number>>;
  totalRow: Record<string, number>;
  totalCol: Record<string, number>;
  grandTotal: number;
  details: PivotDetails;
  userStats?: Record<string, UserStats>;
}

export enum ReportType {
  SIN_LECTURA = 'Estudios Sin Lectura',
  EN_TRANSCRIPCION = 'Estudios En Transcripción',
  POR_AUTORIZAR = 'Estudios Por Autorizar',
  ESPECIALISTAS_BASE_AUTORIZADOS = 'Producción Especialistas - Base Autorizados',
  TRANSCRITOS_MEDICOS = 'Estudios Transcritos por Médicos',
  ESPECIALISTAS = 'Consolidado ESTUDIOS TRANSCRITOS POR Especialista (Cruce Folio+Estudio)',
  TRANSCRITOS_USUARIOS = 'Estudios Transcritos por Usuario'
}

export interface AnalysisResult {
  [ReportType.SIN_LECTURA]: PivotData;
  [ReportType.EN_TRANSCRIPCION]: PivotData;
  [ReportType.POR_AUTORIZAR]: PivotData;
  [ReportType.ESPECIALISTAS_BASE_AUTORIZADOS]?: PivotData;
  [ReportType.TRANSCRITOS_MEDICOS]: PivotData;
  [ReportType.ESPECIALISTAS]?: PivotData;
  [ReportType.TRANSCRITOS_USUARIOS]?: PivotData;
  metrics: ManagementMetrics;
}

export type RawRow = (string | number | undefined)[];