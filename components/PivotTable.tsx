
import React, { useState, useMemo } from 'react';
import { X, AlertCircle, Calendar, Filter, User, Table as TableIcon } from 'lucide-react';
import { PivotData, RawRow, ReportType } from '../types';
import { formatDateForDisplay, isBlank } from '../utils/excelParser';

interface PivotTableProps {
  title: string;
  data: PivotData;
  rowHeader: string;
  reportType?: ReportType;
  hideHeader?: boolean;
}

const PivotTable: React.FC<PivotTableProps> = ({ title, data, rowHeader, reportType, hideHeader }) => {
  const [selectedDetails, setSelectedDetails] = useState<{ rows: RawRow[], label: string, rowKey?: string } | null>(null);
  
  // Define helper variables for report types at component level to avoid scope issues in JSX
  const isTranscriber = reportType === ReportType.TRANSCRITOS_USUARIOS;
  const isBaseAuth = reportType === ReportType.ESPECIALISTAS_BASE_AUTORIZADOS;
  const isSpecialist = reportType === ReportType.ESPECIALISTAS;

  const [dateCitaStart, setDateCitaStart] = useState<string>('');
  const [dateCitaEnd, setDateCitaEnd] = useState<string>('');
  const [dateAuthStart, setDateAuthStart] = useState<string>('');
  const [dateAuthEnd, setDateAuthEnd] = useState<string>('');

  const parseDisplayDate = (dateStr: string) => {
    if (!dateStr) return null;
    const parts = dateStr.split('/');
    if (parts.length === 3) {
      return new Date(parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0]), 12, 0, 0);
    }
    return null;
  };

  const parseInputDate = (inputStr: string) => {
    if (!inputStr) return null;
    const [y, m, d] = inputStr.split('-').map(Number);
    return new Date(y, m - 1, d, 12, 0, 0);
  };

  const filteredPivot = useMemo(() => {
    const isSpecialistReport = reportType === ReportType.ESPECIALISTAS;
    const isBaseAuthReport = reportType === ReportType.ESPECIALISTAS_BASE_AUTORIZADOS;
    const isTranscriberReport = reportType === ReportType.TRANSCRITOS_USUARIOS;

    if (!isSpecialistReport && !isBaseAuthReport && !isTranscriberReport) return data;
    if (!dateCitaStart && !dateCitaEnd && !dateAuthStart && !dateAuthEnd) return data;

    const startCita = parseInputDate(dateCitaStart);
    const endCita = parseInputDate(dateCitaEnd);
    const startAuth = parseInputDate(dateAuthStart);
    const endAuth = parseInputDate(dateAuthEnd);

    const filteredRows = data.details.all.filter(row => {
      if (isSpecialistReport) {
        if (startCita || endCita) {
          const rowDate = parseDisplayDate(formatDateForDisplay(row[6]));
          if (rowDate) {
            if (startCita && rowDate < startCita) return false;
            if (endCita && rowDate > endCita) return false;
          }
        }
        if (startAuth || endAuth) {
          const authDateRaw = row[10];
          if (isBlank(authDateRaw)) return false;
          const rowAuthDate = parseDisplayDate(formatDateForDisplay(authDateRaw));
          if (rowAuthDate) {
            if (startAuth && rowAuthDate < startAuth) return false;
            if (endAuth && rowAuthDate > endAuth) return false;
          }
        }
      }

      if (isBaseAuthReport) {
        if (startAuth || endAuth) {
          const validatedDateRaw = (row as any)._validatedDate;
          if (isBlank(validatedDateRaw)) return false;
          const rowDate = parseDisplayDate(formatDateForDisplay(validatedDateRaw));
          if (rowDate) {
            if (startAuth && rowDate < startAuth) return false;
            if (endAuth && rowDate > endAuth) return false;
          }
        }
      }

      if (isTranscriberReport) {
        if (startAuth || endAuth) {
          const rowDateStr = (row as any)._originalLabel || formatDateForDisplay(row[0]);
          const rowDate = parseDisplayDate(rowDateStr);
          if (rowDate) {
            if (startAuth && rowDate < startAuth) return false;
            if (endAuth && rowDate > endAuth) return false;
          }
        }
      }
      
      return true;
    });

    const rowLabelsSet = new Set<string>();
    const colLabelsSet = new Set<string>();
    const values: Record<string, Record<string, number>> = {};
    const totalRow: Record<string, number> = {};
    const totalCol: Record<string, number> = {};
    let grandTotal = 0;
    const detailCells: Record<string, Record<string, RawRow[]>> = {};
    const detailRowTotals: Record<string, RawRow[]> = {};

    filteredRows.forEach(row => {
      let rowKey = 'NO IDENTIFICADO';
      let colKey = 'OTRO';
      let amount = 1;

      if (isSpecialistReport) {
        rowKey = (row as any)._specialist || 'NO IDENTIFICADO';
        colKey = String(row[5] || 'OTRO').trim().toUpperCase();
      } else if (isBaseAuthReport) {
        rowKey = String(row[8] || 'NO IDENTIFICADO').trim(); 
        colKey = String(row[4] || 'OTRO').trim().toUpperCase(); 
      } else if (isTranscriberReport) {
        rowKey = (row as any)._transcriber || 'NO IDENTIFICADO';
        colKey = String(row[2] || 'OTRO').trim().toUpperCase(); // Columna C / Idx 2
        amount = Number((row as any)._cantidadG || 1);
      }
      
      rowLabelsSet.add(rowKey);
      colLabelsSet.add(colKey);

      if (!values[rowKey]) values[rowKey] = {};
      if (!values[rowKey][colKey]) values[rowKey][colKey] = 0;
      if (!detailCells[rowKey]) detailCells[rowKey] = {};
      if (!detailCells[rowKey][colKey]) detailCells[rowKey][colKey] = [];
      if (!detailRowTotals[rowKey]) detailRowTotals[rowKey] = [];

      values[rowKey][colKey] += amount;
      totalRow[rowKey] = (totalRow[rowKey] || 0) + amount;
      totalCol[colKey] = (totalCol[colKey] || 0) + amount;
      grandTotal += amount;
      detailCells[rowKey][colKey].push(row);
      detailRowTotals[rowKey].push(row);
    });

    return {
      rowLabels: Array.from(rowLabelsSet).sort(),
      colLabels: Array.from(colLabelsSet).sort(),
      values,
      totalRow,
      totalCol,
      grandTotal,
      details: { ...data.details, cells: detailCells, rowTotals: detailRowTotals, all: filteredRows },
      userStats: data.userStats
    };
  }, [data, dateCitaStart, dateCitaEnd, dateAuthStart, dateAuthEnd, reportType]);

  const handleCellClick = (rowKey: string, colKey: string) => {
    const rows = filteredPivot.details.cells[rowKey]?.[colKey] || [];
    if (rows.length > 0) setSelectedDetails({ rows, label: `${title}: ${rowKey} - ${colKey}`, rowKey });
  };

  const handleRowTotalClick = (rowKey: string) => {
    const rows = filteredPivot.details.rowTotals[rowKey] || [];
    if (rows.length > 0) setSelectedDetails({ rows, label: `Resumen de Producción: ${rowKey}`, rowKey });
  };

  const renderModalContent = () => {
    if (!selectedDetails) return null;

    // Si es Tabla 7, generamos una sub-tabla agrupada por Fecha y Modalidad
    if (isTranscriber) {
      const datesSet = new Set<string>();
      const modsSet = new Set<string>();
      const modValues: Record<string, Record<string, number>> = {};
      const rowT: Record<string, number> = {};
      const colT: Record<string, number> = {};
      let gt = 0;

      selectedDetails.rows.forEach(r => {
        const dKey = (r as any)._originalLabel || formatDateForDisplay(r[0]);
        const mKey = String(r[2] || 'OTRO').trim().toUpperCase(); // Col C
        const amt = Number((r as any)._cantidadG || 1);

        datesSet.add(dKey);
        modsSet.add(mKey);

        if (!modValues[dKey]) modValues[dKey] = {};
        if (!modValues[dKey][mKey]) modValues[dKey][mKey] = 0;
        modValues[dKey][mKey] += amt;
        rowT[dKey] = (rowT[dKey] || 0) + amt;
        colT[mKey] = (colT[mKey] || 0) + amt;
        gt += amt;
      });

      const sortedDates = Array.from(datesSet).sort((a, b) => {
        const dA = parseDisplayDate(a)?.getTime() || 0;
        const dB = parseDisplayDate(b)?.getTime() || 0;
        return dA - dB;
      });
      const sortedMods = Array.from(modsSet).sort();

      return (
        <div className="overflow-auto border border-gray-100 rounded-[2rem] shadow-sm bg-white max-h-[60vh]">
          <table className="w-full text-xs text-left border-collapse">
            <thead className="bg-brand-dark sticky top-0 z-20">
              <tr>
                <th className="p-6 font-black text-white uppercase tracking-widest border-r border-white/5 sticky left-0 bg-brand-dark">Fecha</th>
                {sortedMods.map(m => <th key={m} className="p-6 font-black text-white text-center uppercase tracking-widest border-r border-white/5">{m}</th>)}
                <th className="p-6 font-black text-white text-center uppercase tracking-widest bg-brand-primary">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {sortedDates.map(d => (
                <tr key={d} className="hover:bg-brand-primary/[0.03] transition-colors group">
                  <td className="p-6 font-black text-brand-dark border-r border-gray-100 sticky left-0 bg-white group-hover:bg-gray-50">{d}</td>
                  {sortedMods.map(m => (
                    <td key={m} className="p-6 text-center font-bold text-gray-500 border-r border-gray-100">
                      {modValues[d][m] || '-'}
                    </td>
                  ))}
                  <td className="p-6 text-center font-black text-brand-primary bg-brand-primary/5">{rowT[d]}</td>
                </tr>
              ))}
            </tbody>
            <tfoot className="bg-gray-100 font-black">
              <tr>
                <td className="p-6 uppercase tracking-widest border-r border-gray-200 sticky left-0 bg-gray-100">Total Acumulado</td>
                {sortedMods.map(m => <td key={m} className="p-6 text-center border-r border-gray-200">{colT[m]}</td>)}
                <td className="p-6 text-center bg-brand-dark text-white text-lg">{gt}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      );
    }

    // Detalle estándar para otras tablas
    return (
      <div className="overflow-auto border border-gray-100 rounded-[2rem] shadow-sm bg-white max-h-[60vh]">
        <table className="w-full text-xs text-left border-collapse">
          <thead className="bg-brand-dark sticky top-0 z-20">
            <tr>
              <th className="p-6 font-black text-white uppercase tracking-widest border-r border-white/5">Identificación / Fecha</th>
              <th className="p-6 font-black text-white uppercase tracking-widest border-r border-white/5">Estudio / Modalidad</th>
              <th className="p-6 font-black text-white text-center uppercase tracking-widest border-r border-white/5">Cant.</th>
              <th className="p-6 font-black text-white uppercase tracking-widest">Fecha Validación (K)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {selectedDetails.rows.map((row, idx) => {
               const col1 = String(row[0] || '---');
               const col2 = isBaseAuth ? String(row[7] || '---') : String(row[4] || '---');
               const dateInfo = isBaseAuth ? formatDateForDisplay((row as any)._validatedDate) : formatDateForDisplay(row[10]);

               return (
                <tr key={idx} className="hover:bg-brand-primary/[0.03] transition-colors">
                  <td className="p-6 font-black text-brand-dark border-r border-gray-100">{col1}</td>
                  <td className="p-6 text-gray-500 font-black uppercase border-r border-gray-100">{col2}</td>
                  <td className="p-6 text-center font-black text-brand-primary border-r border-gray-100">1</td>
                  <td className="p-6 font-mono text-brand-primary font-black italic">{dateInfo || '---'}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    );
  };

  const showFilters = isSpecialist || isBaseAuth || isTranscriber;

  return (
    <>
      <div className={`overflow-hidden transition-all duration-500 ${hideHeader ? '' : 'bg-white rounded-[2.5rem] shadow-xl border border-gray-100 mb-12'}`}>
        {!hideHeader && (
          <div className="bg-gray-50/80 px-10 py-7 border-b border-gray-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 backdrop-blur-md">
            <div>
              <h3 className="text-xl font-black text-brand-dark tracking-tighter uppercase italic">{title}</h3>
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mt-1">Análisis por {rowHeader}</p>
            </div>
            <div className="text-[10px] font-black px-6 py-2.5 bg-brand-dark text-white rounded-full tracking-[0.2em] shadow-lg shadow-brand-dark/20 uppercase">
              {filteredPivot.grandTotal} Estudios {showFilters && (dateCitaStart || dateAuthStart) && 'Filtrados'}
            </div>
          </div>
        )}

        {showFilters && (
          <div className="px-6 py-6 bg-brand-primary/5 border border-brand-primary/10 rounded-3xl mb-6 grid grid-cols-1 md:grid-cols-2 gap-6 items-end">
            {isSpecialist && (
              <div className="space-y-3">
                <label className="flex items-center gap-2 text-[10px] font-black text-brand-primary uppercase tracking-widest">
                  <Calendar className="w-3.5 h-3.5" /> Rango Fecha Cita
                </label>
                <div className="flex items-center gap-2">
                  <input type="date" value={dateCitaStart} onChange={(e) => setDateCitaStart(e.target.value)} className="bg-white border border-gray-200 rounded-xl px-4 py-2 text-xs font-black text-brand-dark outline-none focus:border-brand-primary transition-all flex-1" />
                  <span className="text-gray-300 font-bold">al</span>
                  <input type="date" value={dateCitaEnd} onChange={(e) => setDateCitaEnd(e.target.value)} className="bg-white border border-gray-200 rounded-xl px-4 py-2 text-xs font-black text-brand-dark outline-none focus:border-brand-primary transition-all flex-1" />
                </div>
              </div>
            )}
            
            <div className={`space-y-3 ${!isSpecialist ? 'md:col-span-2' : ''}`}>
              <label className="flex items-center gap-2 text-[10px] font-black text-brand-secondary uppercase tracking-widest">
                <Filter className="w-3.5 h-3.5" /> Rango Fecha Validación (SLA / Col K)
              </label>
              <div className="flex items-center gap-2">
                <input type="date" value={dateAuthStart} onChange={(e) => setDateAuthStart(e.target.value)} className="bg-white border border-gray-200 rounded-xl px-4 py-2 text-xs font-black text-brand-dark outline-none focus:border-brand-secondary transition-all flex-1" />
                <span className="text-gray-300 font-bold">al</span>
                <input type="date" value={dateAuthEnd} onChange={(e) => setDateAuthEnd(e.target.value)} className="bg-white border border-gray-200 rounded-xl px-4 py-2 text-xs font-black text-brand-dark outline-none focus:border-brand-secondary transition-all flex-1" />
              </div>
            </div>
          </div>
        )}

        <div className="overflow-x-auto border border-gray-100 rounded-[1.5rem]">
          <table className="w-full text-sm text-left border-collapse">
            <thead className="text-[10px] text-gray-400 uppercase tracking-widest bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="px-8 py-5 font-black border-r border-gray-100 text-brand-dark/60 sticky left-0 bg-gray-50 z-10">{rowHeader}</th>
                {filteredPivot.colLabels.map(col => (<th key={col} className="px-6 py-5 font-black text-center border-r border-gray-100">{col}</th>))}
                {isTranscriber && (
                  <>
                    <th className="px-6 py-5 font-black text-center border-r border-gray-100 bg-brand-primary/5 text-brand-primary">Prom. L-V</th>
                    <th className="px-6 py-5 font-black text-center border-r border-gray-100 bg-brand-secondary/5 text-brand-secondary">Prom. Sáb</th>
                  </>
                )}
                <th className="px-8 py-5 font-black bg-brand-dark border-l border-gray-100 text-center text-white">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filteredPivot.rowLabels.map(rowKey => {
                const stats = filteredPivot.userStats?.[rowKey];
                return (
                  <tr key={rowKey} className="hover:bg-brand-primary/[0.02] transition-all duration-300 group/row">
                    <td className="px-8 py-4 font-black text-brand-dark border-r border-gray-50 whitespace-nowrap sticky left-0 bg-white group-hover/row:bg-brand-primary/[0.04] transition-colors z-10">
                      {rowKey}
                    </td>
                    {filteredPivot.colLabels.map(colKey => {
                      const val = filteredPivot.values[rowKey]?.[colKey] || 0;
                      return (
                        <td key={colKey} onClick={() => val > 0 && handleCellClick(rowKey, colKey)} className={`px-6 py-4 text-center font-black ${val === 0 ? 'text-gray-200' : 'text-brand-primary cursor-pointer hover:bg-brand-primary hover:text-white transition-all rounded-xl'}`}>
                          {val || '-'}
                        </td>
                      );
                    })}
                    {isTranscriber && (
                      <>
                        <td className="px-6 py-4 text-center font-black text-brand-primary bg-brand-primary/[0.02]">{stats?.avgWeekday.toFixed(1) || '0.0'}</td>
                        <td className="px-6 py-4 text-center font-black text-brand-secondary bg-brand-secondary/[0.02]">{stats?.avgSaturday.toFixed(1) || '0.0'}</td>
                      </>
                    )}
                    <td onClick={() => handleRowTotalClick(rowKey)} className="px-8 py-4 font-black text-brand-dark text-center bg-gray-50/30 border-l border-gray-100 cursor-pointer hover:bg-brand-primary/10 transition-colors">
                      {filteredPivot.totalRow[rowKey] || 0}
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot className="bg-gray-100 border-t-2 border-brand-dark/20">
              <tr className="font-black text-brand-dark">
                <td className="px-8 py-6 border-r border-gray-100 uppercase tracking-widest text-[11px] sticky left-0 bg-gray-100 z-10">Total Acumulado</td>
                {filteredPivot.colLabels.map(colKey => (
                  <td key={colKey} className="px-6 py-6 text-center border-r border-gray-100 bg-brand-primary/5">
                    {filteredPivot.totalCol[colKey] || 0}
                  </td>
                ))}
                {isTranscriber && (
                  <>
                    <td className="px-6 py-6 bg-brand-primary/5 border-r border-gray-100"></td>
                    <td className="px-6 py-6 bg-brand-secondary/5 border-r border-gray-100"></td>
                  </>
                )}
                <td className="px-8 py-6 text-center bg-brand-dark text-white font-black text-lg">
                  {filteredPivot.grandTotal}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {selectedDetails && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-brand-dark/95 p-8 backdrop-blur-xl animate-in fade-in duration-300">
          <div className="bg-white rounded-[3rem] shadow-2xl w-full max-w-6xl flex flex-col max-h-[90vh] overflow-hidden border border-white/10 scale-in-center">
            <div className="p-10 border-b border-gray-50 flex justify-between items-center bg-gray-50/30">
              <div className="flex items-center gap-4">
                <div className="p-4 bg-brand-primary text-white rounded-2xl shadow-lg">
                  <TableIcon className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-black text-2xl text-brand-dark tracking-tighter uppercase italic">{selectedDetails.label}</h3>
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.3em] mt-1 italic">
                    {/* Fixed: using isTranscriber defined at component scope */}
                    {isTranscriber ? 'Pivot Agrupado por Fecha y Modalidad (Col C)' : 'Auditoría Clínica por Columna K'}
                  </p>
                </div>
              </div>
              <button onClick={() => setSelectedDetails(null)} className="p-5 hover:bg-brand-secondary/10 hover:text-brand-secondary rounded-full text-gray-400 transition-all active:scale-90"><X className="w-8 h-8" /></button>
            </div>
            <div className="flex-1 overflow-auto p-12 bg-white">
               {/* Fixed: using isTranscriber defined at component scope */}
               {isTranscriber && (
                 <div className="mb-6 p-4 bg-brand-primary/5 border border-brand-primary/10 rounded-2xl flex items-center gap-3">
                   <AlertCircle className="w-5 h-5 text-brand-primary" />
                   <p className="text-[10px] font-black text-brand-primary uppercase tracking-wider">Valores basados en la sumatoria de la columna Cantidad (G).</p>
                 </div>
               )}
               {renderModalContent()}
            </div>
            <div className="p-10 border-t border-gray-50 bg-gray-50/30 flex justify-end">
              <button onClick={() => setSelectedDetails(null)} className="px-16 py-6 bg-brand-dark text-white rounded-[1.5rem] font-black text-xs shadow-2xl hover:bg-black transition-all hover:-translate-y-1 active:scale-95 uppercase tracking-widest">Cerrar Desglose</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default PivotTable;
