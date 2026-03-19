import * as XLSX from 'xlsx';
import { AnalysisResult, PivotData, RawRow, ReportType, UserStats, ManagementMetrics } from '../types';

export const isBlank = (val: any): boolean => {
  if (val === null || val === undefined) return true;
  if (typeof val === 'string' && val.trim() === '') return true;
  return false;
};

const getJsDate = (rawDate: any): Date | null => {
  if (!rawDate) return null;
  if (rawDate instanceof Date) return new Date(rawDate.getFullYear(), rawDate.getMonth(), rawDate.getDate(), 12, 0, 0);
  
  if (typeof rawDate === 'number') {
    const dateInfo = XLSX.SSF.parse_date_code(rawDate);
    return new Date(dateInfo.y, dateInfo.m - 1, dateInfo.d, 12, 0, 0);
  }

  const cleanStr = String(rawDate).trim().split(/[ T]/)[0]; 
  const parts = cleanStr.match(/(\d+)/g);
  
  if (parts && parts.length >= 3) {
    const p0 = parseInt(parts[0], 10);
    const p1 = parseInt(parts[1], 10);
    let y = parseInt(parts[2], 10);
    if (y < 100) y += 2000;
    const d = p0;
    const m = p1 - 1;
    const date = new Date(y, m, d, 12, 0, 0);
    return isNaN(date.getTime()) ? null : date;
  }
  return null;
};

export const formatDateForDisplay = (rawDate: any): string => {
  if (!rawDate) return '';
  const dateObj = getJsDate(rawDate);
  if (dateObj) {
    const day = dateObj.getDate().toString().padStart(2, '0');
    const month = (dateObj.getMonth() + 1).toString().padStart(2, '0');
    const year = dateObj.getFullYear();
    return `${day}/${month}/${year}`;
  }
  return String(rawDate).split(/[ T]/)[0];
};

const getSlaDaysFromText = (text: any): number | null => {
  if (isBlank(text)) return null;
  const match = String(text).match(/(\d+)\s*Día/i);
  return match ? parseInt(match[1], 10) : 0;
};

const generatePivot = (
  data: RawRow[], 
  rowIdx: number, 
  colIdx: number, 
  filterFn: (row: RawRow) => boolean,
  customRowKeyFn?: (row: RawRow) => string,
  valueIdx: number = -1
): PivotData => {
  const rowLabelsSet = new Set<string>();
  const colLabelsSet = new Set<string>();
  const values: Record<string, Record<string, number>> = {};
  const totalRow: Record<string, number> = {};
  const totalCol: Record<string, number> = {};
  let grandTotal = 0;

  const detailCells: Record<string, Record<string, RawRow[]>> = {};
  const detailRowTotals: Record<string, RawRow[]> = {};
  const detailColTotals: Record<string, RawRow[]> = {};
  const detailAll: RawRow[] = [];

  data.forEach(row => {
    if (!filterFn(row)) return;

    const rowKey = customRowKeyFn ? customRowKeyFn(row) : formatDateForDisplay(row[rowIdx]);
    const colKey = String(row[colIdx] || 'OTRO').trim().toUpperCase();
    
    // Si valueIdx es -1 contamos filas (1), si no, sumamos el valor de la columna
    let amount = 1;
    if (valueIdx !== -1) {
      const parsed = Number(row[valueIdx]);
      amount = isNaN(parsed) ? 1 : parsed;
    }

    rowLabelsSet.add(rowKey);
    colLabelsSet.add(colKey);

    if (!values[rowKey]) values[rowKey] = {};
    if (!values[rowKey][colKey]) values[rowKey][colKey] = 0;
    if (!detailCells[rowKey]) detailCells[rowKey] = {};
    if (!detailCells[rowKey][colKey]) detailCells[rowKey][colKey] = [];
    if (!detailRowTotals[rowKey]) detailRowTotals[rowKey] = [];
    if (!detailColTotals[colKey]) detailColTotals[colKey] = [];

    values[rowKey][colKey] += amount;
    totalRow[rowKey] = (totalRow[rowKey] || 0) + amount;
    totalCol[colKey] = (totalCol[colKey] || 0) + amount;
    grandTotal += amount;

    detailCells[rowKey][colKey].push(row);
    detailRowTotals[rowKey].push(row);
    detailColTotals[colKey].push(row);
    detailAll.push(row);
  });

  const rowLabels = Array.from(rowLabelsSet).sort((a, b) => {
    const dA = getJsDate(a)?.getTime() || 0;
    const dB = getJsDate(b)?.getTime() || 0;
    if (dA && dB) return dA - dB;
    return a.localeCompare(b);
  });
  const colLabels = Array.from(colLabelsSet).sort();

  return { 
    rowLabels, colLabels, values, totalRow, totalCol, grandTotal,
    details: { cells: detailCells, rowTotals: detailRowTotals, colTotals: detailColTotals, all: detailAll }
  };
};

export const parseAndAnalyze = async (
    mainFile: File, 
    specialistFile: File | null,
    transcriptionFile: File | null
): Promise<AnalysisResult> => {
  const mainDataRaw = await readFile(mainFile);
  
  let headerIndex = mainDataRaw.findIndex(r => r.some(c => String(c).toUpperCase().includes('IDENTIFICACION')));
  if (headerIndex === -1) headerIndex = 8; 
  
  const dataRows = mainDataRaw.slice(headerIndex + 1);
  const IDX = { ID: 0, ESTUDIO: 4, MODALIDAD: 5, FECHA_CITA: 6, I: 8, J: 9, K: 10, L: 11 };

  const specMap: Record<string, { name: string, modality: string, raw: RawRow }> = {};
  let especialistasBaseAutorizados: PivotData | undefined;

  if (specialistFile) {
      const specData = await readFile(specialistFile);
      const specHeaderRowIdx = specData.findIndex(r => String(r[0]).toUpperCase().includes('FOLIO'));
      const specActualData = specData.slice(specHeaderRowIdx + 1);

      specActualData.forEach(row => {
          const folio = String(row[0] || '').trim();
          const estudioCSV = String(row[7] || '').trim();
          if (folio && estudioCSV) {
              const key = `${folio}|${estudioCSV}`;
              specMap[key] = {
                  name: String(row[8] || 'NO ASIGNADO').trim(),
                  modality: String(row[4] || 'OTRO').trim().toUpperCase(),
                  raw: row
              };
          }
      });

      const validatedMatchesFromSpec: RawRow[] = [];
      dataRows.forEach(mainRow => {
          const mainId = String(mainRow[IDX.ID] || '').trim();
          const mainEstudio = String(mainRow[IDX.ESTUDIO] || '').trim();
          const isValidated = !isBlank(mainRow[IDX.K]); 

          if (isValidated) {
              const matchKey = `${mainId}|${mainEstudio}`;
              const match = specMap[matchKey];
              if (match) {
                  const rowForPivot = [...match.raw];
                  (rowForPivot as any)._validatedDate = mainRow[IDX.K];
                  validatedMatchesFromSpec.push(rowForPivot);
              }
          }
      });

      especialistasBaseAutorizados = generatePivot(
          validatedMatchesFromSpec,
          5, 
          4, 
          () => true,
          (row) => String(row[8] || 'NO IDENTIFICADO').trim() 
      );
  }

  dataRows.forEach(row => {
      const id = String(row[IDX.ID] || '').trim();
      const estudioMain = String(row[IDX.ESTUDIO] || '').trim();
      const lookupKey = `${id}|${estudioMain}`;
      (row as any)._specialist = specMap[lookupKey]?.name || 'NO IDENTIFICADO';
  });

  const sinLectura = generatePivot(dataRows, IDX.FECHA_CITA, IDX.MODALIDAD, (row) => !isBlank(row[IDX.ID]) && isBlank(row[IDX.I]) && isBlank(row[IDX.J]) && isBlank(row[IDX.K]));
  const enTranscripcion = generatePivot(dataRows, IDX.FECHA_CITA, IDX.MODALIDAD, (row) => !isBlank(row[IDX.I]) && isBlank(row[IDX.J]) && isBlank(row[IDX.K]));
  const porAutorizar = generatePivot(dataRows, IDX.FECHA_CITA, IDX.MODALIDAD, (row) => !isBlank(row[IDX.J]) && isBlank(row[IDX.K]));
  const transcritosMedicos = generatePivot(dataRows, IDX.FECHA_CITA, IDX.MODALIDAD, (row) => !isBlank(row[IDX.K]));
  
  const especialistasPivot = generatePivot(
      dataRows, 
      IDX.FECHA_CITA, 
      IDX.MODALIDAD, 
      (row) => !isBlank(row[IDX.K]),
      (row) => (row as any)._specialist
  );

  let transcriptoraResult: PivotData | undefined;
  let transcriberSuccessCount = 0;

  if (transcriptionFile) {
      const transData = await readFile(transcriptionFile);
      const processedRows: RawRow[] = [];
      let currentTranscriber = '';
      const statsMap: Record<string, { weekdayTotal: number, weekdayDates: Set<string>, satTotal: number, satDates: Set<string> }> = {};

      for (let i = 0; i < transData.length; i++) {
          const row = transData[i];
          if (!row || row.length === 0 || isBlank(row[0])) { currentTranscriber = ''; continue; }
          const rowStr = row.join('|').toUpperCase();
          if (rowStr.includes('FECHA') && rowStr.includes('MODALIDAD')) {
              if (i > 0) {
                  const nameCell = transData[i-1][0];
                  if (!isBlank(nameCell)) currentTranscriber = String(nameCell).trim();
              }
              continue; 
          }
          if (currentTranscriber && !isBlank(row[0]) && String(row[0]).trim() !== currentTranscriber) {
             const rawDateStr = String(row[0]).split(/[ T]/)[0];
             const dateObj = getJsDate(rawDateStr);
             if (dateObj) {
                 // MODALIDAD: Col C (índice 2)
                 const modality = String(row[2] || 'OTRO').toUpperCase();
                 // CANTIDAD: Col G (índice 6)
                 const parsedAmt = Number(row[6]);
                 const amount = isNaN(parsedAmt) ? 1 : parsedAmt; 

                 const newRow = [...row];
                 const cleanLabel = formatDateForDisplay(rawDateStr);
                 (newRow as any)._originalLabel = cleanLabel;
                 (newRow as any)._transcriber = currentTranscriber; 
                 (newRow as any)._cantidadG = amount;
                 (newRow as any)._modalityIdx2 = modality;
                 processedRows.push(newRow);

                 if (!statsMap[currentTranscriber]) {
                     statsMap[currentTranscriber] = { weekdayTotal: 0, weekdayDates: new Set(), satTotal: 0, satDates: new Set() };
                 }
                 const day = dateObj.getDay(); 
                 if (day === 6) { 
                     statsMap[currentTranscriber].satTotal += amount;
                     statsMap[currentTranscriber].satDates.add(cleanLabel);
                 } else if (day >= 1 && day <= 5) { 
                     statsMap[currentTranscriber].weekdayTotal += amount;
                     statsMap[currentTranscriber].weekdayDates.add(cleanLabel);
                 }
             }
          }
      }
      const finalUserStats: Record<string, UserStats> = {};
      Object.keys(statsMap).forEach(user => {
          const s = statsMap[user];
          const avgWD = s.weekdayDates.size > 0 ? (s.weekdayTotal / s.weekdayDates.size) : 0;
          const avgSat = s.satDates.size > 0 ? (s.satTotal / s.satDates.size) : 0;
          finalUserStats[user] = { avgWeekday: avgWD, avgSaturday: avgSat };
          if (avgWD >= 100) transcriberSuccessCount++;
      });
      
      // TABLA 7: Usuario vs Modalidad (índice 2), sumando Col G (índice 6)
      transcriptoraResult = generatePivot(
          processedRows, 
          0, // Fecha para labels si fuera necesario, pero customRowKeyFn usa el usuario
          2, // Columnas por Modalidad (Col C / Idx 2)
          () => true, 
          (row) => (row as any)._transcriber, 
          6 // Sumamos la columna G (Idx 6)
      );
      transcriptoraResult.userStats = finalUserStats;
  }

  let onTimeSlaCount = 0;
  let totalReadyCount = 0;
  let totalPhysicianTranscribed = 0;
  let physicianSameDay = 0;

  dataRows.forEach(row => {
    const timeValue = row[IDX.L];
    const isReady = !isBlank(row[IDX.K]);
    if (isReady) {
      totalReadyCount++;
      const days = getSlaDaysFromText(timeValue);
      if (days !== null && days <= 4) onTimeSlaCount++;
      if (isBlank(row[IDX.I]) && isBlank(row[IDX.J])) {
        totalPhysicianTranscribed++;
        if (days === 0) physicianSameDay++;
      }
    }
  });

  const totalFinalizados = transcritosMedicos.grandTotal + (transcriptoraResult?.grandTotal || 0);
  const metrics: ManagementMetrics = {
    slaCompliance: totalReadyCount > 0 ? (onTimeSlaCount / totalReadyCount) * 100 : 0,
    physicianContribution: totalFinalizados > 0 ? (transcritosMedicos.grandTotal / totalFinalizados) * 100 : 0,
    physicianSameDayRate: totalPhysicianTranscribed > 0 ? (physicianSameDay / totalPhysicianTranscribed) * 100 : 0,
    transcriberGoalAchievement: Object.keys(transcriptoraResult?.userStats || {}).length > 0 ? (transcriberSuccessCount / Object.keys(transcriptoraResult?.userStats || {}).length) * 100 : 0,
    totalProcessed: totalFinalizados
  };

  return {
    [ReportType.SIN_LECTURA]: sinLectura,
    [ReportType.EN_TRANSCRIPCION]: enTranscripcion,
    [ReportType.POR_AUTORIZAR]: porAutorizar,
    [ReportType.ESPECIALISTAS_BASE_AUTORIZADOS]: especialistasBaseAutorizados,
    [ReportType.TRANSCRITOS_MEDICOS]: transcritosMedicos,
    [ReportType.ESPECIALISTAS]: especialistasPivot,
    [ReportType.TRANSCRITOS_USUARIOS]: transcriptoraResult,
    metrics
  };
};

const readFile = (file: File): Promise<RawRow[]> => {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const data = e.target?.result;
      const workbook = XLSX.read(data, { type: 'binary', cellDates: false });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      resolve(XLSX.utils.sheet_to_json<RawRow>(sheet, { header: 1, defval: '' }));
    };
    reader.readAsBinaryString(file);
  });
};