import React from 'react';
import { AlertTriangle, CheckCircle, Gauge, Users, Stethoscope, Clock, TrendingUp } from 'lucide-react';
import { AnalysisResult, ReportType } from '../types';

interface ManagementReportProps {
  data: AnalysisResult;
}

const ManagementReport: React.FC<ManagementReportProps> = ({ data }) => {
  const { metrics } = data;
  const sinLecturaCount = data[ReportType.SIN_LECTURA].grandTotal;
  const enTranscripcionCount = data[ReportType.EN_TRANSCRIPCION].grandTotal;
  const porAutorizarCount = data[ReportType.POR_AUTORIZAR].grandTotal;

  return (
    <div className="space-y-8 animate-in fade-in duration-700 pb-10">
      <div className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-2xl shadow-gray-200/40 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-brand-primary/5 rounded-full -mr-32 -mt-32 blur-3xl opacity-50"></div>
        
        <div className="flex items-center gap-5 mb-12 relative z-10">
          <div className="bg-brand-primary p-4 rounded-2xl shadow-xl shadow-brand-primary/30">
            <Gauge className="text-white w-8 h-8" />
          </div>
          <div>
            <h2 className="text-3xl font-black text-brand-dark tracking-tighter uppercase italic">Dashboard Estratégico</h2>
            <p className="text-xs text-gray-400 font-black uppercase tracking-[0.2em]">Monitor de Eficacia Clínica y Productividad</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 relative z-10">
          {/* SLA 4 DIAS */}
          <div className="bg-gray-50/50 p-6 rounded-3xl border border-gray-100 relative group transition-all hover:bg-white hover:shadow-2xl hover:shadow-brand-primary/10">
            <div className={`absolute top-0 left-0 h-1.5 w-full rounded-t-3xl ${metrics.slaCompliance > 90 ? 'bg-brand-primary' : 'bg-brand-secondary'}`} />
            <div className="flex justify-between items-center mb-4">
               <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">SLA: 4 Días</p>
               <Clock className="w-4 h-4 text-brand-primary/40" />
            </div>
            <div className="flex items-baseline gap-2">
              <span className={`text-5xl font-black tracking-tighter ${metrics.slaCompliance > 90 ? 'text-brand-primary' : 'text-brand-secondary'}`}>
                {metrics.slaCompliance.toFixed(1)}%
              </span>
            </div>
            <p className="text-[10px] mt-4 text-gray-400 font-black uppercase leading-tight">Cumplimiento según Columna 12.</p>
          </div>

          {/* TRANSCRIPCION MEDICA MISMO DIA */}
          <div className="bg-gray-50/50 p-6 rounded-3xl border border-gray-100 relative group transition-all hover:bg-white hover:shadow-2xl hover:shadow-brand-primary/10">
            <div className="absolute top-0 left-0 h-1.5 w-full bg-brand-primary rounded-t-3xl" />
            <div className="flex justify-between items-center mb-4">
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Aporte Mismo Día</p>
              <Stethoscope className="w-4 h-4 text-brand-primary/40" />
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-5xl font-black text-brand-dark tracking-tighter">
                {metrics.physicianSameDayRate.toFixed(1)}%
              </span>
            </div>
            <p className="text-[10px] mt-4 text-gray-400 font-black uppercase">Transcripción inmediata (0 días).</p>
          </div>

          {/* LOGRO META 100 */}
          <div className="bg-gray-50/50 p-6 rounded-3xl border border-gray-100 relative group transition-all hover:bg-white hover:shadow-2xl hover:shadow-brand-primary/10">
            <div className="absolute top-0 left-0 h-1.5 w-full bg-brand-primary rounded-t-3xl opacity-50" />
            <div className="flex justify-between items-center mb-4">
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Meta Transcriptoras</p>
              <Users className="w-4 h-4 text-brand-primary/40" />
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-5xl font-black text-brand-dark tracking-tighter">
                {metrics.transcriberGoalAchievement.toFixed(0)}%
              </span>
            </div>
            <p className="text-[10px] mt-4 text-gray-400 font-black uppercase">Personal alcanzando 100 est/día.</p>
          </div>

          {/* APORTE ESTRATEGICO TOTAL */}
          <div className="bg-gray-50/50 p-6 rounded-3xl border border-gray-100 relative group transition-all hover:bg-white hover:shadow-2xl hover:shadow-brand-primary/10">
            <div className="absolute top-0 left-0 h-1.5 w-full bg-brand-dark rounded-t-3xl" />
            <div className="flex justify-between items-center mb-4">
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Impacto Médico</p>
              <TrendingUp className="w-4 h-4 text-brand-dark/40" />
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-5xl font-black text-brand-primary tracking-tighter">
                {metrics.physicianContribution.toFixed(1)}%
              </span>
            </div>
            <p className="text-[10px] mt-4 text-gray-400 font-black uppercase">Aporte estratégico en producción.</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-xl shadow-gray-200/30">
           <div className="flex items-center gap-3 mb-10">
              <AlertTriangle className="text-brand-secondary w-6 h-6" />
              <h3 className="font-black text-brand-dark text-xl uppercase italic tracking-tight">Backlog Operativo</h3>
           </div>
           <div className="space-y-4">
              <div className="flex justify-between items-center p-6 bg-brand-secondary/[0.03] rounded-[1.5rem] border border-brand-secondary/5 hover:bg-brand-secondary/[0.06] transition-all group">
                <span className="text-[11px] font-black text-brand-secondary uppercase tracking-widest group-hover:tracking-[0.2em] transition-all">Sin Lectura</span>
                <span className="text-3xl font-black text-brand-secondary tracking-tighter">{sinLecturaCount}</span>
              </div>
              <div className="flex justify-between items-center p-6 bg-gray-50 rounded-[1.5rem] border border-gray-100">
                <span className="text-[11px] font-black text-gray-400 uppercase tracking-widest">En Transcripción</span>
                <span className="text-3xl font-black text-brand-dark tracking-tighter">{enTranscripcionCount}</span>
              </div>
              <div className="flex justify-between items-center p-6 bg-gray-50 rounded-[1.5rem] border border-gray-100">
                <span className="text-[11px] font-black text-gray-400 uppercase tracking-widest">Por Autorizar</span>
                <span className="text-3xl font-black text-brand-dark tracking-tighter">{porAutorizarCount}</span>
              </div>
           </div>
        </div>

        <div className="bg-brand-primary p-10 rounded-[2.5rem] shadow-2xl shadow-brand-primary/30 flex flex-col justify-center items-center text-center text-white relative overflow-hidden group">
           <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_30%_30%,rgba(255,255,255,0.15),transparent)] transition-transform group-hover:scale-125 duration-1000" />
           <div className="bg-white/10 p-6 rounded-full mb-6 relative z-10 backdrop-blur-xl border border-white/20">
              <CheckCircle className="text-white w-12 h-12" />
           </div>
           <h3 className="text-7xl font-black mb-2 relative z-10 tracking-tighter animate-in zoom-in duration-500">{metrics.totalProcessed}</h3>
           <p className="text-[11px] font-black uppercase tracking-[0.3em] text-white/80 relative z-10">Estudios Finalizados</p>
           <div className="mt-12 pt-8 border-t border-white/10 w-full relative z-10">
              <p className="text-[10px] text-white/70 font-black uppercase leading-relaxed max-w-xs mx-auto tracking-widest">
                Cierre de período exitoso. La productividad médica impactó en el {metrics.physicianContribution.toFixed(0)}% de los resultados.
              </p>
           </div>
        </div>
      </div>
    </div>
  );
};

export default ManagementReport;