import React, { useState, useMemo } from 'react';
import { 
  Clock, Calendar, Truck, CheckCircle2, AlertTriangle, 
  ExternalLink, ChevronLeft, ChevronRight, Filter, MapPin, 
  SlidersHorizontal, Sparkles, Building2, Eye, ShieldCheck
} from 'lucide-react';
import { CraneMasterRecord } from '../../data/craneMasterData';
import { UnifiedCraneJob, navigateToCraneView } from '../../data/craneOperationsData';
import { useLanguage } from '../../context/LanguageContext';

interface CraneGanttTimelineProps {
  fleet: CraneMasterRecord[];
  craneJobs: UnifiedCraneJob[];
  selectedPlant: string;
  setActiveView?: (view: string) => void;
  onSelectCrane?: (crane: CraneMasterRecord) => void;
}

export default function CraneGanttTimeline({
  fleet,
  craneJobs,
  selectedPlant,
  setActiveView,
  onSelectCrane
}: CraneGanttTimelineProps) {
  const { isTh } = useLanguage();

  // Selected Date for 24-Hour Horizon (defaults to turnaround date: 2026-10-15)
  const [selectedDate, setSelectedDate] = useState<string>('2026-10-15');
  const [shiftFilter, setShiftFilter] = useState<'All' | 'Day' | 'Night'>('All');
  const [gateFilter, setGateFilter] = useState<'All' | 'Gate2' | 'Gate3' | 'Gate4'>('All');
  const [selectedJobPopup, setSelectedJobPopup] = useState<UnifiedCraneJob | null>(null);

  // Time slots for 24 hours (2-hour step headers)
  const timeSlots = [
    '00:00', '02:00', '04:00', '06:00', '08:00', '10:00', 
    '12:00', '14:00', '16:00', '18:00', '20:00', '22:00', '24:00'
  ];

  // Group jobs by crane ID for the selected date
  const jobsByCrane = useMemo(() => {
    const map = new Map<string, UnifiedCraneJob[]>();
    
    craneJobs.forEach(job => {
      const jobDate = (job.date || job.dateFrom || (job.workStartDateTime ? job.workStartDateTime.split(' ')[0] : '')).split(' ')[0];
      
      // Match date (or allow all-day scheduled jobs)
      const isDateMatch = !selectedDate || jobDate === selectedDate || !jobDate;
      if (!isDateMatch) return;

      // Filter shift
      if (shiftFilter !== 'All' && job.shift && job.shift !== 'All day' && job.shift !== shiftFilter) {
        return;
      }

      // Filter Gate
      if (gateFilter === 'Gate2' && !(job.status === 'Assigned' || job.status === 'Optimized' || (job.status as string) === 'Reviewed')) return;
      if (gateFilter === 'Gate3' && job.status !== 'In Progress') return;
      if (gateFilter === 'Gate4' && job.status !== 'Completed') return;

      const targetCraneId = job.assignedCraneId || (job.assignedCraneName ? job.assignedCraneName.split(' ')[0] : undefined);
      if (targetCraneId) {
        const key = targetCraneId.toLowerCase().trim();
        const list = map.get(key) || [];
        list.push(job);
        map.set(key, list);
      }
    });

    return map;
  }, [craneJobs, selectedDate, shiftFilter, gateFilter]);

  // Calculate fleet utilization for this date
  const utilizationStats = useMemo(() => {
    let busyCranes = 0;
    fleet.forEach(c => {
      const assigned = jobsByCrane.get(c.id.toLowerCase().trim()) || [];
      if (assigned.length > 0 || c.fleetStatus === 'Assigned' || c.fleetStatus === 'Reserved') {
        busyCranes++;
      }
    });
    const total = fleet.length || 1;
    const rate = Math.round((busyCranes / total) * 100);
    return { busyCranes, total, rate };
  }, [fleet, jobsByCrane]);

  // Helper to convert time "HH:mm" to percentage (0% = 00:00, 100% = 24:00)
  const parseTimeToPercent = (timeStr?: string, defaultHour: number = 8): number => {
    if (!timeStr) return (defaultHour / 24) * 100;
    const parts = timeStr.split(':');
    const h = parseInt(parts[0], 10) || defaultHour;
    const m = parseInt(parts[1], 10) || 0;
    return ((h + m / 60) / 24) * 100;
  };

  // Helper to calculate job position and width on 24h timeline
  const calculateJobBar = (job: UnifiedCraneJob) => {
    let startHour = 8;
    let endHour = 16;

    if (job.workStartDateTime && job.workEndDateTime) {
      const startTime = job.workStartDateTime.split(' ')[1];
      const endTime = job.workEndDateTime.split(' ')[1];
      if (startTime) startHour = parseInt(startTime.split(':')[0], 10) || 8;
      if (endTime) endHour = parseInt(endTime.split(':')[0], 10) || 16;
    } else if (job.time && job.time.includes('-')) {
      const parts = job.time.split('-');
      const startParts = parts[0].trim().split(':');
      const endParts = parts[1].trim().split(':');
      if (startParts[0]) startHour = parseInt(startParts[0], 10) || 8;
      if (endParts[0]) endHour = parseInt(endParts[0], 10) || 16;
    }

    if (endHour <= startHour) endHour = Math.min(24, startHour + 4);

    const leftPercent = (startHour / 24) * 100;
    const widthPercent = Math.max(5, ((endHour - startHour) / 24) * 100);

    return { leftPercent, widthPercent, startHour, endHour };
  };

  return (
    <div className="space-y-4 animate-in fade-in duration-200">
      {/* 1. Timeline Controls & Gate Bar */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Left: Date Switcher */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl border border-slate-200 dark:border-slate-700">
            <button
              type="button"
              onClick={() => {
                const d = new Date(selectedDate);
                d.setDate(d.getDate() - 1);
                setSelectedDate(d.toISOString().slice(0, 10));
              }}
              className="p-1 rounded-lg text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-white dark:hover:bg-slate-700 transition-all cursor-pointer"
              title="Previous Day"
            >
              <ChevronLeft size={16} />
            </button>
            <div className="flex items-center gap-1.5 px-2 font-mono text-xs font-bold text-slate-800 dark:text-slate-100">
              <Calendar size={13} className="text-blue-500" />
              <span>{selectedDate}</span>
            </div>
            <button
              type="button"
              onClick={() => {
                const d = new Date(selectedDate);
                d.setDate(d.getDate() + 1);
                setSelectedDate(d.toISOString().slice(0, 10));
              }}
              className="p-1 rounded-lg text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-white dark:hover:bg-slate-700 transition-all cursor-pointer"
              title="Next Day"
            >
              <ChevronRight size={16} />
            </button>
          </div>

          {/* Quick Date Presets */}
          <div className="flex items-center gap-1">
            {['2026-10-15', '2026-10-16', '2026-10-17', '2026-10-18'].map(d => (
              <button
                key={d}
                type="button"
                onClick={() => setSelectedDate(d)}
                className={`px-2 py-1 rounded-lg text-[10px] font-mono font-bold transition-all cursor-pointer ${
                  selectedDate === d 
                    ? 'bg-blue-600 text-white shadow-xs' 
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
                }`}
              >
                {d.slice(5)}
              </button>
            ))}
          </div>
        </div>

        {/* Center: Shift & Gate Filters */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl text-xs font-semibold">
            <span className="text-[10px] text-slate-400 uppercase tracking-widest pl-1.5">Shift:</span>
            {(['All', 'Day', 'Night'] as const).map(s => (
              <button
                key={s}
                type="button"
                onClick={() => setShiftFilter(s)}
                className={`px-2 py-0.5 rounded-lg text-[11px] font-medium transition-all cursor-pointer ${
                  shiftFilter === s ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-xs font-bold' : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                {s}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl text-xs font-semibold">
            <span className="text-[10px] text-slate-400 uppercase tracking-widest pl-1.5">Gate:</span>
            {(['All', 'Gate2', 'Gate3', 'Gate4'] as const).map(g => (
              <button
                key={g}
                type="button"
                onClick={() => setGateFilter(g)}
                className={`px-2 py-0.5 rounded-lg text-[11px] font-medium transition-all cursor-pointer ${
                  gateFilter === g ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-xs font-bold' : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                {g === 'All' ? 'All Gates' : g === 'Gate2' ? 'Gate 2 (Assigned)' : g === 'Gate3' ? 'Gate 3 (In Progress)' : 'Gate 4 (Done)'}
              </button>
            ))}
          </div>
        </div>

        {/* Right: Fleet Utilization Metric */}
        <div className="flex items-center gap-3">
          <div className="text-right">
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              {isTh ? 'อัตราใช้งานเครื่องจักร (Utilization)' : 'Fleet Utilization'}
            </div>
            <div className="text-sm font-black font-mono text-blue-600 dark:text-blue-400 flex items-center justify-end gap-1">
              <span>{utilizationStats.rate}%</span>
              <span className="text-[10px] text-slate-500 font-normal">({utilizationStats.busyCranes}/{utilizationStats.total} คัน)</span>
            </div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-600 dark:text-blue-400">
            <Clock size={18} />
          </div>
        </div>
      </div>

      {/* 2. Color Legend Bar */}
      <div className="flex items-center justify-between px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 text-xs flex-wrap gap-2">
        <div className="flex items-center gap-4 flex-wrap">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Legend:</span>
          <span className="flex items-center gap-1.5 text-xs text-slate-700 dark:text-slate-300">
            <span className="w-3 h-3 rounded bg-indigo-600 inline-block shadow-xs" />
            <span>Gate 2: Assigned / Standby</span>
          </span>
          <span className="flex items-center gap-1.5 text-xs text-slate-700 dark:text-slate-300">
            <span className="w-3 h-3 rounded bg-blue-500 inline-block animate-pulse shadow-xs" />
            <span>Gate 3: In Operation (Execution)</span>
          </span>
          <span className="flex items-center gap-1.5 text-xs text-slate-700 dark:text-slate-300">
            <span className="w-3 h-3 rounded bg-emerald-600 inline-block shadow-xs" />
            <span>Gate 4: Completed (Handover Ready)</span>
          </span>
          <span className="flex items-center gap-1.5 text-xs text-slate-700 dark:text-slate-300">
            <span className="w-3 h-3 rounded bg-amber-500 inline-block shadow-xs" />
            <span>Maintenance / Inspection</span>
          </span>
          <span className="flex items-center gap-1.5 text-xs text-slate-400">
            <span className="w-3 h-3 rounded bg-slate-200 dark:bg-slate-700 inline-block" />
            <span>Available / Idle</span>
          </span>
        </div>

        <div className="text-[11px] text-slate-500 dark:text-slate-400 italic">
          {isTh ? '💡 คลิกที่แท่งงานยกเพื่อเปิดเมนูด่วนหรือกระโดดไปยังหน้า Job List / Plot Plan' : '💡 Click any job bar to open details & cross-link to modules'}
        </div>
      </div>

      {/* 3. Gantt Timeline Matrix */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden flex flex-col">
        <div className="overflow-x-auto min-w-full">
          {/* Header row: Left Crane Title + 24 Hour Slots */}
          <div className="flex border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/80 text-[10px] font-bold text-slate-500 uppercase sticky top-0 z-20">
            <div className="w-64 p-3 shrink-0 border-r border-slate-200 dark:border-slate-700 flex items-center justify-between">
              <span>{isTh ? 'เครื่องจักรเครน (Crane Asset)' : 'Crane Asset & Specs'}</span>
              <span className="text-[9px] font-normal text-slate-400">Capacity</span>
            </div>

            <div className="flex-1 relative flex h-10 items-center min-w-[720px]">
              {timeSlots.map((ts, idx) => (
                <div 
                  key={ts} 
                  className="flex-1 text-center font-mono border-r border-slate-200/50 dark:border-slate-700/50 last:border-r-0"
                >
                  <span className="text-[10px] text-slate-600 dark:text-slate-400">{ts}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Rows: Each Crane in fleet */}
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {fleet.map((crane) => {
              const assigned = jobsByCrane.get(crane.id.toLowerCase().trim()) || [];
              const isMaintenance = crane.fleetStatus === 'Maintenance' || crane.fleetStatus === 'Inspection';

              return (
                <div 
                  key={crane.id}
                  className="flex items-stretch hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors group min-w-[960px]"
                >
                  {/* Left Column: Crane Asset Info */}
                  <div 
                    onClick={() => onSelectCrane && onSelectCrane(crane)}
                    className="w-64 p-3 shrink-0 border-r border-slate-200 dark:border-slate-700 flex flex-col justify-center cursor-pointer bg-white/50 dark:bg-slate-900/50"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <Truck size={13} className="text-blue-500 shrink-0" />
                        <span className="font-mono font-bold text-blue-600 dark:text-blue-400 text-xs">{crane.id}</span>
                      </div>
                      <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                        {crane.ratedCapacityTon}T
                      </span>
                    </div>

                    <div className="text-[11px] text-slate-700 dark:text-slate-300 font-medium truncate mt-0.5">
                      {crane.brand} {crane.model}
                    </div>

                    <div className="flex items-center justify-between text-[10px] text-slate-400 mt-1">
                      <span className="truncate max-w-[120px]">{crane.operator || crane.contractor}</span>
                      <span className={`px-1.5 py-0.2 rounded text-[9px] font-bold ${
                        assigned.length > 0 
                          ? 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300' 
                          : isMaintenance 
                            ? 'bg-amber-100 text-amber-700' 
                            : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
                      }`}>
                        {assigned.length > 0 ? `${assigned.length} งาน` : isMaintenance ? 'Offline' : 'ว่าง (Ready)'}
                      </span>
                    </div>
                  </div>

                  {/* Right Column: 24-Hour Timeline Bar */}
                  <div className="flex-1 relative flex items-center min-w-[720px] bg-slate-50/30 dark:bg-slate-950/20 py-2 px-1">
                    {/* Background hour grid dividers */}
                    <div className="absolute inset-0 flex pointer-events-none">
                      {timeSlots.map((_, idx) => (
                        <div key={idx} className="flex-1 border-r border-dashed border-slate-200/40 dark:border-slate-800/40 last:border-r-0" />
                      ))}
                    </div>

                    {/* Maintenance overlay if offline */}
                    {isMaintenance && (
                      <div className="absolute inset-y-1.5 inset-x-2 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-600 dark:text-amber-400 text-xs font-bold gap-2 z-10 backdrop-blur-[1px]">
                        <AlertTriangle size={14} />
                        <span>Maintenance Inspection Offline ({crane.fleetStatus})</span>
                      </div>
                    )}

                    {/* Render active job bars */}
                    {!isMaintenance && assigned.map((job) => {
                      const { leftPercent, widthPercent, startHour, endHour } = calculateJobBar(job);

                      const isGate3 = job.status === 'In Progress';
                      const isGate4 = job.status === 'Completed';

                      let barColor = 'bg-indigo-600 hover:bg-indigo-700 text-white border-indigo-400';
                      if (isGate3) barColor = 'bg-blue-600 hover:bg-blue-700 text-white border-blue-400 shadow-lg shadow-blue-500/20';
                      if (isGate4) barColor = 'bg-emerald-600 hover:bg-emerald-700 text-white border-emerald-400';

                      return (
                        <div
                          key={job.id}
                          onClick={() => setSelectedJobPopup(job)}
                          style={{
                            left: `${leftPercent}%`,
                            width: `${widthPercent}%`
                          }}
                          className={`absolute h-8 rounded-xl border flex items-center px-2.5 justify-between transition-all cursor-pointer z-10 shadow-xs hover:scale-[1.02] ${barColor}`}
                          title={`${job.jobNo} (${startHour}:00 - ${endHour}:00) - Click to manage`}
                        >
                          <div className="flex items-center gap-1.5 min-w-0 truncate">
                            {isGate3 && <span className="w-2 h-2 rounded-full bg-white animate-ping shrink-0" />}
                            <span className="font-mono font-bold text-[10px] truncate">{job.jobNo}</span>
                            {(job.equipmentId || (job as any).equipmentTag) && (
                              <span className="text-[9px] opacity-80 truncate hidden sm:inline">
                                • {job.equipmentId || (job as any).equipmentTag}
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-1 text-[9px] font-mono shrink-0 ml-1">
                            <span className="opacity-90">{startHour}:00-{endHour}:00</span>
                            {job.grossLoadTon && (
                              <span className="px-1 rounded bg-black/25 font-bold">
                                {job.grossLoadTon}T
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}

                    {/* Empty idle slot prompt */}
                    {!isMaintenance && assigned.length === 0 && (
                      <div className="text-[11px] text-slate-400/80 italic pl-4 font-mono">
                        ว่างตลอดวัน (Standby / Available for Gate 2 Assignment)
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* 4. Interactive Job Popover / Cross-Gate Drawer */}
      {selectedJobPopup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col">
            {/* Header */}
            <div className="p-5 bg-gradient-to-r from-slate-900 to-indigo-950 text-white flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-mono font-bold text-base text-cyan-400">{selectedJobPopup.jobNo}</span>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase border ${
                    selectedJobPopup.status === 'In Progress' ? 'bg-blue-500/20 text-blue-300 border-blue-400/40' :
                    selectedJobPopup.status === 'Completed' ? 'bg-emerald-500/20 text-emerald-300 border-emerald-400/40' :
                    'bg-indigo-500/20 text-indigo-300 border-indigo-400/40'
                  }`}>
                    {selectedJobPopup.status}
                  </span>
                </div>
                <p className="text-xs text-slate-300 mt-1 truncate">{selectedJobPopup.description}</p>
              </div>

              <button
                type="button"
                onClick={() => setSelectedJobPopup(null)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Body */}
            <div className="p-5 space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3 p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                <div>
                  <span className="text-[10px] text-slate-400 block uppercase">Work Order</span>
                  <span className="font-mono font-bold text-slate-800 dark:text-slate-100">
                    {selectedJobPopup.workOrder || selectedJobPopup.workOrderNo || 'WO-882041'}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block uppercase">Equipment Tag</span>
                  <span className="font-mono font-bold text-slate-800 dark:text-slate-100">
                    {selectedJobPopup.equipmentId || (selectedJobPopup as any).equipmentTag || '11-C-101'}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block uppercase">Planned Schedule</span>
                  <span className="font-mono font-semibold text-slate-700 dark:text-slate-300">
                    {selectedJobPopup.date || selectedJobPopup.dateFrom || '2026-10-15'} ({selectedJobPopup.time || '08:00 - 16:00'})
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block uppercase">Gross Load / Radius</span>
                  <span className="font-mono font-bold text-slate-800 dark:text-slate-100">
                    {selectedJobPopup.grossLoadTon || 25}T • {selectedJobPopup.workingRadiusM || 18}m
                  </span>
                </div>
              </div>

              {/* Cross-Module Gate Actions */}
              <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                  {isTh ? 'การนำทางและจัดการข้ามเกต (Cross-Gate Actions):' : 'Cross-Gate Navigation & Actions:'}
                </span>

                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      navigateToCraneView({ view: 'job-list', jobId: selectedJobPopup.jobNo || selectedJobPopup.id });
                      if (setActiveView) setActiveView('job-list');
                      setSelectedJobPopup(null);
                    }}
                    className="p-2.5 rounded-xl bg-blue-50 dark:bg-blue-950/50 hover:bg-blue-100 dark:hover:bg-blue-900/60 border border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300 font-bold text-left flex items-center justify-between cursor-pointer shadow-2xs"
                  >
                    <div>
                      <div className="text-[11px]">เปิดใน Job List</div>
                      <div className="text-[9px] text-blue-500 font-normal">Gate 1-4 Operations</div>
                    </div>
                    <ExternalLink size={14} />
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      navigateToCraneView({ 
                        view: 'optimize', 
                        craneId: selectedJobPopup.assignedCraneId, 
                        jobId: selectedJobPopup.jobNo || selectedJobPopup.id 
                      });
                      if (setActiveView) setActiveView('optimize');
                      setSelectedJobPopup(null);
                    }}
                    className="p-2.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 border border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300 font-bold text-left flex items-center justify-between cursor-pointer shadow-2xs"
                  >
                    <div>
                      <div className="text-[11px]">จัดการใน Gate 2</div>
                      <div className="text-[9px] text-indigo-500 font-normal">Review & Optimize</div>
                    </div>
                    <Sparkles size={14} />
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      navigateToCraneView({ 
                        view: 'plan', 
                        jobId: selectedJobPopup.id, 
                        plant: selectedJobPopup.plant 
                      });
                      if (setActiveView) setActiveView('plan');
                      setSelectedJobPopup(null);
                    }}
                    className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700/80 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 font-bold text-left flex items-center justify-between cursor-pointer shadow-2xs"
                  >
                    <div>
                      <div className="text-[11px]">ดูบน CAD Plot Plan</div>
                      <div className="text-[9px] text-slate-400 font-normal">Spatial & Exclusion</div>
                    </div>
                    <MapPin size={14} />
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      navigateToCraneView({ 
                        view: 'calendar', 
                        craneId: selectedJobPopup.assignedCraneId,
                        date: (selectedJobPopup.dateFrom || selectedDate).split(' ')[0]
                      });
                      if (setActiveView) setActiveView('calendar');
                      setSelectedJobPopup(null);
                    }}
                    className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700/80 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 font-bold text-left flex items-center justify-between cursor-pointer shadow-2xs"
                  >
                    <div>
                      <div className="text-[11px]">ดูตารางใน Calendar</div>
                      <div className="text-[9px] text-slate-400 font-normal">Schedule Matrix</div>
                    </div>
                    <Calendar size={14} />
                  </button>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="p-3 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-200 dark:border-slate-800 flex justify-end">
              <button
                type="button"
                onClick={() => setSelectedJobPopup(null)}
                className="px-4 py-1.5 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 cursor-pointer"
              >
                ปิดหน้าต่าง
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
