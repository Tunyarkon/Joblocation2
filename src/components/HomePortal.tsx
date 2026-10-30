import React from 'react';
import { 
  MapPin, Briefcase, Truck, Layers, HardHat, 
  ChevronRight, ArrowRight, ShieldCheck, Sparkles 
} from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { getAllCraneJobs } from '../data/craneOperationsData';

interface HomePortalProps {
  onNavigate: (view: string) => void;
  globalPlantFilter?: 'All' | 'Phra Khanong' | 'Sriracha';
}

export default function HomePortal({ onNavigate, globalPlantFilter = 'All' }: HomePortalProps) {
  const { isTh } = useLanguage();

  // Dynamic count for Crane jobs
  const craneJobs = getAllCraneJobs();
  const plantFilteredCraneJobs = React.useMemo(() => {
    if (!globalPlantFilter || globalPlantFilter === 'All') return craneJobs;
    return craneJobs.filter(j => j.plant === globalPlantFilter);
  }, [craneJobs, globalPlantFilter]);
  const craneRequestsCount = plantFilteredCraneJobs.length;

  const turnoverCount = React.useMemo(() => {
    if (!globalPlantFilter || globalPlantFilter === 'All') return 40;
    return 20; // 20 units per plant
  }, [globalPlantFilter]);

  return (
    <div className="min-h-[calc(100vh-140px)] flex flex-col items-center justify-center p-4 sm:p-8 max-w-6xl mx-auto select-none">
      {/* Top Header Badge & Title */}
      <div className="text-center space-y-3 mb-10 sm:mb-12 animate-in fade-in slide-in-from-top-4 duration-300">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-600 via-sky-600 to-teal-500 text-white shadow-xl shadow-blue-600/25 ring-4 ring-blue-500/10">
          <MapPin size={26} className="text-white" />
        </div>
        
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
            Job Location
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1 font-medium">
            {isTh 
              ? 'เลือกเมนูการทำงานหลัก (Please Choose Function)' 
              : 'Please choose your primary operational module'}
          </p>
        </div>
      </div>

      {/* 3 Main Functional Cards Grid: 1. Crane Job -> 2. Scaffolding -> 3. Turn Over */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full max-w-5xl animate-in zoom-in-95 duration-300">
        {/* CARD 1: CRANE JOB */}
        <div
          onClick={() => onNavigate('create')}
          className="group relative bg-white/90 dark:bg-slate-900/90 backdrop-blur-xs rounded-3xl border border-slate-200/90 dark:border-slate-800/90 p-8 enterprise-card hover:shadow-2xl hover:border-blue-500/40 hover:-translate-y-1.5 transition-all duration-300 cursor-pointer flex flex-col justify-between overflow-hidden"
        >
          {/* Subtle hover background glow */}
          <div className="absolute top-0 right-0 w-36 h-36 bg-gradient-to-bl from-blue-500/15 via-sky-500/5 to-transparent rounded-full blur-2xl group-hover:from-blue-500/25 transition-all pointer-events-none" />

          {/* Top Row: Badge */}
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">
              MODULE 01
            </span>
            <span className="px-3 py-1 rounded-full text-xs font-bold bg-slate-100/80 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 border border-slate-200/60 dark:border-slate-700/60">
              {globalPlantFilter !== 'All' ? `${globalPlantFilter === 'Phra Khanong' ? 'PK' : 'SR'}: ${craneRequestsCount} ใบคำขอ` : `${craneRequestsCount} ใบคำขอ`}
            </span>
          </div>

          {/* Center: Icon Box & Title */}
          <div className="my-8 flex flex-col items-center text-center">
            <div className="w-16 h-16 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200/60 dark:border-slate-700/60 flex items-center justify-center text-slate-700 dark:text-slate-200 group-hover:bg-gradient-to-br group-hover:from-blue-500/15 group-hover:to-sky-500/10 group-hover:text-blue-600 dark:group-hover:text-blue-400 group-hover:border-blue-300/60 dark:group-hover:border-blue-700/60 transition-all shadow-sm">
              <Truck size={28} />
            </div>

            <h2 className="text-base font-black text-slate-900 dark:text-white uppercase tracking-wider mt-5 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
              CRANE JOB
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5 line-clamp-2 max-w-[240px]">
              {isTh 
                ? 'ขอใช้รถเครน & แผนยก (Crane Job CR01-CR06)' 
                : 'Crane Requests, Heavy Lift & Fleet Allocation'}
            </p>
          </div>

          {/* Bottom Action Footer */}
          <div className="pt-4 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-center text-xs font-bold text-blue-600 dark:text-blue-400 gap-1.5 opacity-80 group-hover:opacity-100 group-hover:translate-x-1 transition-all">
            <span>{isTh ? 'สร้างคำขอใช้งานเครน' : 'Create Crane Job'}</span>
            <ArrowRight size={14} />
          </div>
        </div>

        {/* CARD 2: SCAFFOLDING */}
        <div
          onClick={() => onNavigate('scaffold-dashboard')}
          className="group relative bg-white/90 dark:bg-slate-900/90 backdrop-blur-xs rounded-3xl border border-slate-200/90 dark:border-slate-800/90 p-8 enterprise-card hover:shadow-2xl hover:border-amber-500/40 hover:-translate-y-1.5 transition-all duration-300 cursor-pointer flex flex-col justify-between overflow-hidden"
        >
          {/* Subtle hover background glow */}
          <div className="absolute top-0 right-0 w-36 h-36 bg-gradient-to-bl from-amber-500/15 via-orange-500/5 to-transparent rounded-full blur-2xl group-hover:from-amber-500/25 transition-all pointer-events-none" />

          {/* Top Row: Badge */}
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">
              MODULE 02
            </span>
            <span className="px-3 py-1 rounded-full text-xs font-bold bg-slate-100/80 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 border border-slate-200/60 dark:border-slate-700/60 font-mono">
              SC01
            </span>
          </div>

          {/* Center: Icon Box & Title */}
          <div className="my-8 flex flex-col items-center text-center">
            <div className="w-16 h-16 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200/60 dark:border-slate-700/60 flex items-center justify-center text-slate-700 dark:text-slate-200 group-hover:bg-gradient-to-br group-hover:from-amber-500/15 group-hover:to-orange-500/10 group-hover:text-amber-600 dark:group-hover:text-amber-400 group-hover:border-amber-300/60 dark:group-hover:border-amber-700/60 transition-all shadow-sm">
              <Layers size={28} />
            </div>

            <h2 className="text-base font-black text-slate-900 dark:text-white uppercase tracking-wider mt-5 group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors">
              SCAFFOLDING
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5 line-clamp-2 max-w-[240px]">
              {isTh 
                ? 'งานติดตั้ง & ตรวจนั่งร้าน (Scaffolding System)' 
                : 'Scaffolding Erection, Tagging & Inspection'}
            </p>
          </div>

          {/* Bottom Action Footer */}
          <div className="pt-4 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-center text-xs font-bold text-amber-600 dark:text-amber-400 gap-1.5 opacity-80 group-hover:opacity-100 group-hover:translate-x-1 transition-all">
            <span>{isTh ? 'เข้าสู่หน้าทำงาน' : 'Launch Module'}</span>
            <ArrowRight size={14} />
          </div>
        </div>

        {/* CARD 3: TURN OVER */}
        <div
          onClick={() => onNavigate('job-location-create')}
          className="group relative bg-white/90 dark:bg-slate-900/90 backdrop-blur-xs rounded-3xl border border-slate-200/90 dark:border-slate-800/90 p-8 enterprise-card hover:shadow-2xl hover:border-emerald-500/40 hover:-translate-y-1.5 transition-all duration-300 cursor-pointer flex flex-col justify-between overflow-hidden"
        >
          {/* Subtle hover background glow */}
          <div className="absolute top-0 right-0 w-36 h-36 bg-gradient-to-bl from-emerald-500/15 via-teal-500/5 to-transparent rounded-full blur-2xl group-hover:from-emerald-500/25 transition-all pointer-events-none" />

          {/* Top Row: Badge */}
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">
              MODULE 03
            </span>
            <span className="px-3 py-1 rounded-full text-xs font-bold bg-slate-100/80 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 border border-slate-200/60 dark:border-slate-700/60">
              {globalPlantFilter !== 'All' ? `${globalPlantFilter === 'Phra Khanong' ? 'PK' : 'SR'}: ${turnoverCount} งาน` : `${turnoverCount} งาน`}
            </span>
          </div>

          {/* Center: Icon Box & Title */}
          <div className="my-8 flex flex-col items-center text-center">
            <div className="w-16 h-16 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200/60 dark:border-slate-700/60 flex items-center justify-center text-slate-700 dark:text-slate-200 group-hover:bg-emerald-50 dark:group-hover:bg-emerald-950/40 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 group-hover:border-emerald-200 dark:group-hover:border-emerald-800 transition-all shadow-sm">
              <Briefcase size={28} />
            </div>

            <h2 className="text-base font-black text-slate-900 dark:text-white uppercase tracking-wider mt-5 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
              TURNOVER S/D & T/A
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5 line-clamp-2 max-w-[240px]">
              {isTh 
                ? 'จัดการรายการงานและส่งมอบระบบ (Turnover S/D & T/A)' 
                : 'Turnover S/D & T/A System Handover Management'}
            </p>
          </div>

          {/* Bottom Action Footer */}
          <div className="pt-4 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-center text-xs font-bold text-emerald-600 dark:text-emerald-400 gap-1.5 opacity-80 group-hover:opacity-100 group-hover:translate-x-1 transition-all">
            <span>{isTh ? 'สร้าง Event & Job' : 'Create Event & Job'}</span>
            <ArrowRight size={14} />
          </div>
        </div>
      </div>
    </div>
  );
}
