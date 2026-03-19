import React, { useState } from 'react';
import { FileBarChart, RefreshCw, AlertCircle, LayoutDashboard, Table as TableIcon, ChevronDown, ListFilter } from 'lucide-react';
import FileUploader from './components/FileUploader';
import PivotTable from './components/PivotTable';
import ManagementReport from './components/ManagementReport';
import { parseAndAnalyze } from './utils/excelParser';
import { AnalysisResult, ReportType } from './types';

interface CollapsibleTableProps {
  title: string;
  isOpen: boolean;
  onToggle: () => void;
  count: number;
  children: React.ReactNode;
}

const CollapsibleTable: React.FC<CollapsibleTableProps> = ({ title, isOpen, onToggle, count, children }) => {
  return (
    <div className={`bg-white rounded-[2rem] shadow-sm border transition-all duration-300 overflow-hidden ${isOpen ? 'border-brand-primary ring-1 ring-brand-primary/20 shadow-xl' : 'border-gray-100 hover:border-gray-200'}`}>
      <button
        onClick={onToggle}
        className="w-full px-8 py-6 flex items-center justify-between text-left group"
      >
        <div className="flex items-center gap-4">
          <div className={`p-2.5 rounded-xl transition-colors ${isOpen ? 'bg-brand-primary text-white' : 'bg-gray-50 text-gray-400 group-hover:text-brand-dark'}`}>
            <ListFilter className="w-5 h-5" />
          </div>
          <div>
            <h3 className={`font-black text-sm uppercase tracking-widest transition-colors ${isOpen ? 'text-brand-dark' : 'text-gray-500'}`}>{title}</h3>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-tighter mt-0.5">{count} registros identificados</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <span className={`px-4 py-1.5 rounded-full text-[10px] font-black transition-all ${isOpen ? 'bg-brand-primary text-white' : 'bg-gray-100 text-gray-400'}`}>
            {count}
          </span>
          <ChevronDown className={`w-5 h-5 transition-transform duration-500 ${isOpen ? 'rotate-180 text-brand-primary' : 'text-gray-300'}`} />
        </div>
      </button>

      <div className={`transition-all duration-500 ease-in-out ${isOpen ? 'max-h-[5000px] opacity-100' : 'max-h-0 opacity-0'}`}>
        <div className="px-8 pb-8 pt-2">
          {children}
        </div>
      </div>
    </div>
  );
};

function App() {
  const [mainFile, setMainFile] = useState<File | null>(null);
  const [specialistFile, setSpecialistFile] = useState<File | null>(null);
  const [transcriptionFile, setTranscriptionFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'management' | 'details'>('management');
  const [openTables, setOpenTables] = useState<Record<string, boolean>>({});

  const toggleTable = (id: string) => {
    setOpenTables(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  const handleProcess = async () => {
    if (!mainFile) {
      setError("Debe cargar al menos el archivo principal.");
      return;
    }

    setIsProcessing(true);
    setError(null);
    setResult(null);

    try {
      await new Promise(r => setTimeout(r, 800));
      const data = await parseAndAnalyze(mainFile, specialistFile, transcriptionFile);
      setResult(data);
      setActiveTab('management');
      setOpenTables({ [ReportType.SIN_LECTURA]: true });
    } catch (err: any) {
      console.error(err);
      setError("Error al procesar los archivos. Verifique los formatos solicitados.");
    } finally {
      setIsProcessing(false);
    }
  };

  const reset = () => {
    setMainFile(null);
    setSpecialistFile(null);
    setTranscriptionFile(null);
    setResult(null);
    setError(null);
    setOpenTables({});
  };

  return (
    <div className="min-h-screen bg-[#f8f9fa] font-sans text-brand-dark pb-20">
      <header className="main-navbar sticky top-0">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="bg-white/10 p-2 rounded-xl shadow-lg">
              <FileBarChart className="text-[#e9fff7] w-6 h-6" />
            </div>
            <h1 className="navbar-brand hidden sm:block uppercase italic">S.G.C</h1>
            <h1 className="navbar-brand sm:hidden">S.G.C</h1>
          </div>
          {result && (
            <button
              onClick={reset}
              className="nav-link-custom flex items-center gap-2 px-4 py-2 text-xs bg-white/10 hover:bg-white/20 rounded-xl uppercase tracking-widest border border-white/10"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Reiniciar
            </button>
          )}
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {!result && (
          <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="bg-white rounded-[2.5rem] shadow-2xl shadow-gray-200/50 border border-gray-100 p-8 sm:p-12 overflow-hidden relative">
              <div className="absolute top-0 right-0 w-32 h-32 bg-brand-primary/5 rounded-full -mr-16 -mt-16 blur-3xl"></div>

              <div className="text-center mb-12 relative z-10">
                <span className="inline-block px-4 py-1.5 bg-brand-primary/10 text-brand-primary text-[10px] font-black uppercase tracking-[0.2em] rounded-full mb-6">Módulo de Análisis</span>
                <h2 className="text-4xl font-black text-brand-dark mb-4 tracking-tighter uppercase italic">Carga de Datos Operativos</h2>
                <p className="text-gray-400 max-w-md mx-auto font-medium">Gestione el rendimiento de citas y especialistas con precisión clínica.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
                <FileUploader label="1. Informe Principal" subLabel="Base de citas (Desde Fila 9)" file={mainFile} onFileSelect={setMainFile} />
                <FileUploader label="2. Base Especialistas" subLabel="Cruce Folio+Estudio (CSV)" file={specialistFile} onFileSelect={setSpecialistFile} accept=".csv,.xlsx" />
                <FileUploader label="3. Rep. Transcripción" subLabel="Carga por usuario" file={transcriptionFile} onFileSelect={setTranscriptionFile} />
              </div>

              {error && (
                <div className="mb-8 p-4 bg-brand-secondary/5 border border-brand-secondary/10 rounded-2xl flex items-start gap-3 animate-pulse">
                  <AlertCircle className="w-5 h-5 text-brand-secondary flex-shrink-0 mt-0.5" />
                  <p className="text-sm font-black text-brand-secondary uppercase tracking-tight">{error}</p>
                </div>
              )}

              <div className="flex justify-center">
                <button
                  onClick={handleProcess}
                  disabled={!mainFile || isProcessing}
                  className={`
                    flex items-center gap-3 px-12 py-5 rounded-2xl font-black text-white shadow-2xl transition-all duration-300 transform uppercase tracking-widest text-sm
                    ${!mainFile || isProcessing
                      ? 'bg-gray-200 cursor-not-allowed shadow-none scale-95 opacity-50'
                      : 'bg-brand-primary hover:bg-brand-primary/90 shadow-brand-primary/40 hover:-translate-y-1 active:scale-95'
                    }
                  `}
                >
                  {isProcessing ? (
                    <><RefreshCw className="w-5 h-5 animate-spin" /> Procesando...</>
                  ) : (
                    <><FileBarChart className="w-5 h-5" /> Generar Informe</>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {result && (
          <div className="space-y-6 animate-in fade-in duration-700">
            <div className="flex bg-white p-2 rounded-2xl border border-gray-100 shadow-sm max-w-md mx-auto mb-10">
              <button
                onClick={() => setActiveTab('management')}
                className={`flex-1 flex items-center justify-center gap-2 py-3.5 rounded-xl text-[11px] font-black transition-all uppercase tracking-widest ${activeTab === 'management' ? 'bg-brand-primary text-white shadow-xl shadow-brand-primary/20' : 'text-gray-400 hover:text-brand-dark'}`}
              >
                <LayoutDashboard className="w-4 h-4" />
                Informe Gerencial
              </button>
              <button
                onClick={() => setActiveTab('details')}
                className={`flex-1 flex items-center justify-center gap-2 py-3.5 rounded-xl text-[11px] font-black transition-all uppercase tracking-widest ${activeTab === 'details' ? 'bg-brand-primary text-white shadow-xl shadow-brand-primary/20' : 'text-gray-400 hover:text-brand-dark'}`}
              >
                <TableIcon className="w-4 h-4" />
                Tablas Detalladas
              </button>
            </div>

            {activeTab === 'management' ? (
              <ManagementReport data={result} />
            ) : (
              <div className="space-y-6 animate-in slide-in-from-bottom-8 duration-500 max-w-6xl mx-auto">

                <CollapsibleTable
                  title="1. Estudios Sin Lectura"
                  isOpen={openTables[ReportType.SIN_LECTURA]}
                  onToggle={() => toggleTable(ReportType.SIN_LECTURA)}
                  count={result[ReportType.SIN_LECTURA].grandTotal}
                >
                  <PivotTable title="1. Estudios Sin Lectura" rowHeader="Fecha Cita" reportType={ReportType.SIN_LECTURA} data={result[ReportType.SIN_LECTURA]} hideHeader />
                </CollapsibleTable>

                <CollapsibleTable
                  title="2. Estudios En Transcripción"
                  isOpen={openTables[ReportType.EN_TRANSCRIPCION]}
                  onToggle={() => toggleTable(ReportType.EN_TRANSCRIPCION)}
                  count={result[ReportType.EN_TRANSCRIPCION].grandTotal}
                >
                  <PivotTable title="2. Estudios En Transcripción" rowHeader="Fecha Cita" reportType={ReportType.EN_TRANSCRIPCION} data={result[ReportType.EN_TRANSCRIPCION]} hideHeader />
                </CollapsibleTable>

                <CollapsibleTable
                  title="3. Estudios Por Autorizar"
                  isOpen={openTables[ReportType.POR_AUTORIZAR]}
                  onToggle={() => toggleTable(ReportType.POR_AUTORIZAR)}
                  count={result[ReportType.POR_AUTORIZAR].grandTotal}
                >
                  <PivotTable title="3. Estudios Por Autorizar" rowHeader="Fecha Cita" reportType={ReportType.POR_AUTORIZAR} data={result[ReportType.POR_AUTORIZAR]} hideHeader />
                </CollapsibleTable>

                {result[ReportType.ESPECIALISTAS_BASE_AUTORIZADOS] && (
                  <CollapsibleTable
                    title="4. Producción Especialistas - Base Autorizados"
                    isOpen={openTables[ReportType.ESPECIALISTAS_BASE_AUTORIZADOS]}
                    onToggle={() => toggleTable(ReportType.ESPECIALISTAS_BASE_AUTORIZADOS)}
                    count={result[ReportType.ESPECIALISTAS_BASE_AUTORIZADOS].grandTotal}
                  >
                    <PivotTable title="4. Producción Especialistas - Base Autorizados" rowHeader="Especialista" reportType={ReportType.ESPECIALISTAS_BASE_AUTORIZADOS} data={result[ReportType.ESPECIALISTAS_BASE_AUTORIZADOS]!} hideHeader />
                  </CollapsibleTable>
                )}

                <CollapsibleTable
                  title="5. Estudios Transcritos por Médicos"
                  isOpen={openTables[ReportType.TRANSCRITOS_MEDICOS]}
                  onToggle={() => toggleTable(ReportType.TRANSCRITOS_MEDICOS)}
                  count={result[ReportType.TRANSCRITOS_MEDICOS].grandTotal}
                >
                  <PivotTable title="5. Estudios Transcritos por Médicos" rowHeader="Fecha Cita" reportType={ReportType.TRANSCRITOS_MEDICOS} data={result[ReportType.TRANSCRITOS_MEDICOS]} hideHeader />
                </CollapsibleTable>

                {result[ReportType.ESPECIALISTAS] && (
                  <CollapsibleTable
                    title="6. Consolidado ESTUDIOS TRANSCRITOS POR Especialista"
                    isOpen={openTables[ReportType.ESPECIALISTAS]}
                    onToggle={() => toggleTable(ReportType.ESPECIALISTAS)}
                    count={result[ReportType.ESPECIALISTAS].grandTotal}
                  >
                    <PivotTable title="6. Consolidado ESTUDIOS TRANSCRITOS POR Especialista (Cruce Folio+Estudio)" rowHeader="Especialista" reportType={ReportType.ESPECIALISTAS} data={result[ReportType.ESPECIALISTAS]!} hideHeader />
                  </CollapsibleTable>
                )}

                {result[ReportType.TRANSCRITOS_USUARIOS] && (
                  <CollapsibleTable
                    title="7. Estudios Transcritos por Usuario"
                    isOpen={openTables[ReportType.TRANSCRITOS_USUARIOS]}
                    onToggle={() => toggleTable(ReportType.TRANSCRITOS_USUARIOS)}
                    count={result[ReportType.TRANSCRITOS_USUARIOS].grandTotal}
                  >
                    <PivotTable title="7. Estudios Transcritos por Usuario" rowHeader="Usuario" reportType={ReportType.TRANSCRITOS_USUARIOS} data={result[ReportType.TRANSCRITOS_USUARIOS]!} hideHeader />
                  </CollapsibleTable>
                )}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}

export default App;