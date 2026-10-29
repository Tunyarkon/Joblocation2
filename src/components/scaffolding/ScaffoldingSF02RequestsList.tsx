import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  Building2, HardHat, Calendar, Clock, MapPin, Search, Filter, 
  Layers, Plus, CheckCircle2, AlertTriangle, AlertCircle, X, 
  FileText, ExternalLink, RefreshCw, Check, ArrowRight, Eye, 
  SlidersHorizontal, Download, Sparkles, ChevronRight, Tag,
  Ruler, Upload, ShieldCheck, ChevronDown, Compass, Maximize2,
  Minimize2, ZoomIn, ZoomOut, RotateCcw, Box, Flame, Trash2,
  Calculator, CalendarClock, Wrench, Hammer, CheckCircle, XCircle,
  Paperclip, Loader2, Edit, Sun, Moon
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { useLanguage } from '../../context/LanguageContext';
import { useThemeGate } from '../../utils/themeGate';
import { 
  ScaffoldingSFJob, 
  getStoredScaffoldingJobs, 
  saveStoredScaffoldingJobs, 
  updateScaffoldingJob, 
  deleteScaffoldingJob, 
  subscribeToScaffoldingJobs,
  calculateExtendedOffHireDate,
  calculateTotalHireDays,
  EXTENSION_REQUEST_OPTIONS,
  ExtensionRequestType,
  CONTRACTOR_COMPANIES,
  mockAreas
} from '../../data/scaffoldingSFData';
import essoPlotPlanBg from '../../assets/esso_sriracha_master_plotplan.jpg';
import { format, parseISO, addDays, differenceInDays } from 'date-fns';

const formatThaiDisplayDate = (d?: string) => {
  if (!d) return '-';
  try {
    const parts = d.split('-');
    if (parts.length === 3) {
      const yy = parts[0].slice(-2);
      return `${parts[2]}/${parts[1]}/${yy}`;
    }
    const parsed = parseISO(d);
    if (!isNaN(parsed.getTime())) {
      return format(parsed, 'dd/MM/yy');
    }
  } catch (e) {}
  return d;
};

const getScaffoldTypeFullLabel = (type?: string) => {
  switch (type) {
    case 'Heavy Duty':
      return 'Heavy Duty Engineered Scaffold';
    case 'Standard':
      return 'Standard System Scaffold';
    case '360° Ring':
      return '360° Column Ring Scaffold';
    case 'Cantilever':
      return 'Cantilever / Hanging Platform';
    case 'Suspended':
      return 'Suspended Access Scaffold';
    default:
      return type || 'Standard System Scaffold';
  }
};

interface ScaffoldingSF02RequestsListProps {
  onNavigateToCreate: () => void;
  globalPlantFilter?: 'All' | 'Phra Khanong' | 'Sriracha';
}

export default function ScaffoldingSF02RequestsList({ 
  onNavigateToCreate,
  globalPlantFilter = 'All'
}: ScaffoldingSF02RequestsListProps) {
  const { language } = useLanguage();
  const isTh = language === 'th';

  // Data Store State
  const [jobs, setJobs] = useState<ScaffoldingSFJob[]>(() => getStoredScaffoldingJobs());

  useEffect(() => {
    const unsub = subscribeToScaffoldingJobs((updated) => {
      setJobs(updated);
    });
    return unsub;
  }, []);

  // View Switcher: Table List View vs Plot Plan View
  const [viewMode, setViewMode] = useState<'table' | 'plot-plan'>('table');
  const [gateIsDark, setGlobalThemeGate] = useThemeGate();
  const [blueprintTheme, setBlueprintTheme] = useState<'dark' | 'paper'>(() => gateIsDark ? 'dark' : 'paper');
  useEffect(() => {
    setBlueprintTheme(gateIsDark ? 'dark' : 'paper');
  }, [gateIsDark]);
  const isDarkBlueprint = blueprintTheme === 'dark';

  // Quick Stage Filter: 'all' | 'Execution' | 'In-use' | 'Dismantle' | 'Extension'
  const [stageFilter, setStageFilter] = useState<'all' | 'Execution' | 'In-use' | 'Dismantle' | 'Extension'>('all');

  // Search & Filter Bar (7 fields)
  const [dateFrom, setDateFrom] = useState<string>('');
  const [dateEnd, setDateEnd] = useState<string>('');
  const [filterJobType, setFilterJobType] = useState<string>('all');
  const [filterContractor, setFilterContractor] = useState<string>('all');
  const [filterScaffoldType, setFilterScaffoldType] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Modals & Action States
  const [selectedJobForEstimate, setSelectedJobForEstimate] = useState<ScaffoldingSFJob | null>(null);
  const [selectedJobForHireControl, setSelectedJobForHireControl] = useState<ScaffoldingSFJob | null>(null);
  const [selectedJobForDetails, setSelectedJobForDetails] = useState<ScaffoldingSFJob | null>(null);
  const [jobToApprove, setJobToApprove] = useState<ScaffoldingSFJob | null>(null);
  const [approveRemarks, setApproveRemarks] = useState<string>('');
  const [jobToReject, setJobToReject] = useState<ScaffoldingSFJob | null>(null);
  const [rejectRemarks, setRejectRemarks] = useState<string>('');

  // Success Notification Banner
  const [successBanner, setSuccessBanner] = useState<string | null>(null);

  const showNotification = (msg: string) => {
    setSuccessBanner(msg);
    setTimeout(() => setSuccessBanner(null), 4000);
  };

  // =========================================================================
  // PLANT-SCOPED JOBS & KPI METRICS CALCULATION
  // =========================================================================
  const plantScopedJobs = useMemo(() => {
    if (!globalPlantFilter || globalPlantFilter === 'All') return jobs;
    return jobs.filter(j => {
      if (j.plant === globalPlantFilter) return true;
      if (j.plant && j.plant.toLowerCase().includes(globalPlantFilter.toLowerCase())) return true;
      const num = parseInt(j.id.replace(/\D/g, ''), 10);
      if (!isNaN(num)) {
        return (num % 2 === 0 ? 'Phra Khanong' : 'Sriracha') === globalPlantFilter;
      }
      return false;
    });
  }, [jobs, globalPlantFilter]);

  const metrics = useMemo(() => {
    let totalVolumeM3 = 0;
    let evaluatedCount = 0;
    let executionCount = 0; // Yellow Tag
    let inUseCount = 0; // Green Tag
    let dismantleCount = 0; // Red Tag
    let extensionCount = 0; // Requestor extension requested

    plantScopedJobs.forEach(j => {
      if (j.estimate?.isEvaluated && j.estimate.volume) {
        totalVolumeM3 += j.estimate.volume;
        evaluatedCount++;
      }

      if (j.lifecycleStage === 'Execution') executionCount++;
      else if (j.lifecycleStage === 'In-use') inUseCount++;
      else if (j.lifecycleStage === 'Dismantle') dismantleCount++;

      if (j.hireControl?.extensionRequest && j.hireControl.extensionRequest !== 'None') {
        extensionCount++;
      }
    });

    return {
      totalJobs: plantScopedJobs.length,
      totalVolumeM3,
      evaluatedCount,
      executionCount,
      inUseCount,
      dismantleCount,
      extensionCount
    };
  }, [plantScopedJobs]);

  // =========================================================================
  // FILTERED DATA
  // =========================================================================
  const filteredJobs = useMemo(() => {
    return plantScopedJobs.filter(j => {
      if (stageFilter === 'Execution' && j.lifecycleStage !== 'Execution') return false;
      if (stageFilter === 'In-use' && j.lifecycleStage !== 'In-use') return false;
      if (stageFilter === 'Dismantle' && j.lifecycleStage !== 'Dismantle') return false;
      if (stageFilter === 'Extension' && (!j.hireControl?.extensionRequest || j.hireControl.extensionRequest === 'None')) return false;

      if (dateFrom && j.requiredDate < dateFrom) return false;
      if (dateEnd && j.requiredDate > dateEnd) return false;

      if (filterJobType !== 'all' && j.jobType !== filterJobType) return false;
      if (filterContractor !== 'all' && j.company !== filterContractor) return false;
      if (filterScaffoldType !== 'all' && j.scaffoldType !== filterScaffoldType) return false;
      if (filterStatus !== 'all' && j.status !== filterStatus) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchId = j.id.toLowerCase().includes(q) || j.jobId.toLowerCase().includes(q);
        const matchEq = j.equipmentTag.toLowerCase().includes(q);
        const matchDesc = j.jobDescription.toLowerCase().includes(q);
        if (!matchId && !matchEq && !matchDesc) return false;
      }

      return true;
    });
  }, [plantScopedJobs, stageFilter, dateFrom, dateEnd, filterJobType, filterContractor, filterScaffoldType, filterStatus, searchQuery]);



  const handleConfirmApprove = () => {
    if (!jobToApprove) return;
    const updated = updateScaffoldingJob(jobToApprove.id, { 
      status: 'Approved', 
      lifecycleStage: 'Execution', 
      progress: 25,
      approvalRemarks: approveRemarks.trim() || undefined
    });
    if (updated) {
      setJobs(prev => prev.map(j => j.id === updated.id ? updated : j));
    }
    showNotification(isTh ? `อนุมัติคำขอ ${jobToApprove.id} เรียบร้อยแล้ว` : `Job ${jobToApprove.id} approved.`);
    setJobToApprove(null);
    setApproveRemarks('');
  };

  const handleConfirmReject = () => {
    if (!jobToReject) return;
    const updated = updateScaffoldingJob(jobToReject.id, { 
      status: 'Rejected', 
      progress: 0,
      rejectionRemarks: rejectRemarks.trim() || undefined
    });
    if (updated) {
      setJobs(prev => prev.map(j => j.id === updated.id ? updated : j));
    }
    showNotification(isTh ? `ปฏิเสธคำขอ ${jobToReject.id}` : `Job ${jobToReject.id} rejected.`);
    setJobToReject(null);
    setRejectRemarks('');
  };

  // Plot Plan Zoom & Pan State
  const [zoomLevel, setZoomLevel] = useState<number>(100);
  const [panOffset, setPanOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const panStartRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const [hoveredJob, setHoveredJob] = useState<ScaffoldingSFJob | null>(null);

  const handleWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (e.deltaY < 0) {
      setZoomLevel(prev => Math.min(400, prev + 15));
    } else {
      setZoomLevel(prev => Math.max(25, prev - 15));
    }
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsPanning(true);
    panStartRef.current = { x: e.clientX - panOffset.x, y: e.clientY - panOffset.y };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isPanning) return;
    setPanOffset({
      x: e.clientX - panStartRef.current.x,
      y: e.clientY - panStartRef.current.y
    });
  };

  const handleMouseUp = () => setIsPanning(false);

  const getStatusColor = (job: ScaffoldingSFJob) => {
    if (job.status === 'Completed' || job.lifecycleStage === 'Dismantle') return { bg: '#a855f7', border: '#c084fc', text: 'Completed (รื้อถอน)' };
    if (job.status === 'Approved' || job.lifecycleStage === 'In-use') return { bg: '#10b981', border: '#34d399', text: 'In-use (ป้ายเขียว)' };
    if (job.status === 'Rejected') return { bg: '#ef4444', border: '#f87171', text: 'Rejected (ปฏิเสธ)' };
    if (job.status === 'In Progress' || job.lifecycleStage === 'Execution') return { bg: '#3b82f6', border: '#60a5fa', text: 'Execution (ป้ายเหลือง)' };
    return { bg: '#f97316', border: '#fb923c', text: 'Requested (รอประเมิน)' };
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto w-full pb-16 animate-in fade-in duration-200">
      {/* Header Banner - Clean, white-friendly like other modules */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-5 sm:p-6 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-1.5 max-w-2xl">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full font-mono bg-cyan-100 dark:bg-cyan-950/70 text-cyan-800 dark:text-cyan-300 border border-cyan-200 dark:border-cyan-800/60">
              SF02 · SCAFFOLDING REGISTRY & HIRE CONTROL
            </span>
            <span className="text-xs text-slate-500 dark:text-slate-400">
              {isTh ? '· ทะเบียนคำขอ ประเมินขนาด และควบคุมวันเช่านั่งร้าน' : '· Requests Registry & Rental Lifecycle Control'}
            </span>
          </div>

          <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-slate-100 tracking-tight flex items-center gap-2.5">
            <Layers className="text-cyan-700 dark:text-cyan-400" size={24} />
            <span>
              {isTh ? 'รายการคำขอ ประเมินขนาด และควบคุมงานนั่งร้าน (SF02)' : 'Scaffolding Requests & Lifecycle Control (SF02)'}
            </span>
          </h1>

          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
            {isTh 
              ? 'ศูนย์กลางควบคุมงานนั่งร้าน ติดตามสถานะป้าย Yellow/Green/Red Tag ประเมินปริมาตรโครงสร้าง และควบคุมวันเช่าเพื่อป้องกันค่าเช่าเกินกำหนด'
              : 'Centralized scaffolding registry: yellow/green/red tag control, volume estimation, and rental period optimization.'}
          </p>
        </div>

        {/* Action Button */}
        <div className="flex items-center gap-3 shrink-0">
          <button
            type="button"
            onClick={onNavigateToCreate}
            className="h-11 px-5 rounded-xl text-white font-bold text-xs bg-cyan-700 hover:bg-cyan-800 shadow-md shadow-cyan-700/20 active:scale-95 flex items-center gap-2 transition-all cursor-pointer"
          >
            <Plus size={16} className="stroke-[3]" />
            <span>{isTh ? 'สร้างคำขอนั่งร้าน (SF01)' : 'Create Request (SF01)'}</span>
          </button>
        </div>
      </div>

      {/* Success Notification */}
      {successBanner && (
        <div className="rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-500/60 p-4 text-xs font-bold text-emerald-800 dark:text-emerald-300 flex items-center gap-2 shadow-xs animate-in fade-in duration-200">
          <CheckCircle2 size={16} className="text-emerald-600 dark:text-emerald-400" />
          <span>{successBanner}</span>
        </div>
      )}

      {/* Plant Scope Live Indicator Badge */}
      <div className="flex flex-wrap items-center justify-between px-3.5 py-2 rounded-xl bg-slate-100/90 dark:bg-slate-900/80 border border-slate-200/80 dark:border-slate-800/80 gap-2">
        <div className="flex items-center gap-2">
          <Building2 size={15} className="text-teal-600 dark:text-teal-400 shrink-0" />
          <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">
            {isTh ? 'ขอบเขตโรงงานที่เลือก:' : 'Active Plant Scope:'}
          </span>
          <span className="text-xs font-bold px-2 py-0.5 rounded-md bg-teal-500/15 text-teal-700 dark:text-teal-300 border border-teal-500/30">
            {globalPlantFilter === 'Phra Khanong' 
              ? (isTh ? 'พระโขนง (Phra Khanong)' : 'Phra Khanong')
              : globalPlantFilter === 'Sriracha' 
                ? (isTh ? 'ศรีราชา (Sriracha)' : 'Sriracha')
                : (isTh ? 'ทุกโรงงาน (All Plants)' : 'All Plants')}
          </span>
        </div>
        <span className="text-[11px] font-mono font-medium text-slate-500 dark:text-slate-400">
          {metrics.totalJobs} {isTh ? 'งานนั่งร้าน' : 'scaffolding jobs'}
        </span>
      </div>

      {/* =========================================================================
          1. SUMMARY KPI METRICS BANNER (5 Cards - White / Clean UI)
         ========================================================================= */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
        {/* Card 1: Estimated Volume */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-4.5 shadow-xs hover:border-cyan-400 transition-all">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs font-semibold mb-1">
            <span>{isTh ? 'ปริมาตรประเมินรวม' : 'Estimated Volume'}</span>
            <Box size={15} className="text-cyan-600" />
          </div>
          <div className="text-2xl font-black text-slate-900 dark:text-white font-mono">
            {metrics.totalVolumeM3.toLocaleString()} <span className="text-xs font-normal text-slate-500">m³</span>
          </div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
            {isTh ? `ประเมินแล้ว ${metrics.evaluatedCount} ใบงาน` : `${metrics.evaluatedCount} jobs evaluated`}
          </div>
        </div>

        {/* Card 2: 1. Execution Stage (Yellow Tag) */}
        <div 
          onClick={() => setStageFilter(stageFilter === 'Execution' ? 'all' : 'Execution')}
          className={`rounded-2xl border p-4.5 shadow-xs cursor-pointer transition-all ${
            stageFilter === 'Execution' 
              ? 'bg-amber-50/90 dark:bg-amber-950/40 border-amber-400 ring-2 ring-amber-400/20' 
              : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:border-amber-400'
          }`}
        >
          <div className="flex items-center justify-between text-amber-700 dark:text-amber-400 text-xs font-bold mb-1">
            <span>{isTh ? '1. ติดตั้ง (Execution)' : '1. Execution'}</span>
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse" />
          </div>
          <div className="text-2xl font-black text-amber-700 dark:text-amber-400 font-mono">
            {metrics.executionCount} <span className="text-xs font-normal text-slate-500">งาน</span>
          </div>
          <div className="text-[11px] text-amber-700/80 dark:text-amber-300/80 mt-1 flex items-center gap-1">
            <span className="px-1.5 py-0.2 rounded bg-amber-100 dark:bg-amber-500/20 font-bold">Yellow Tag</span>
          </div>
        </div>

        {/* Card 3: 2. In-use Stage (Green Tag) */}
        <div 
          onClick={() => setStageFilter(stageFilter === 'In-use' ? 'all' : 'In-use')}
          className={`rounded-2xl border p-4.5 shadow-xs cursor-pointer transition-all ${
            stageFilter === 'In-use' 
              ? 'bg-emerald-50/90 dark:bg-emerald-950/40 border-emerald-400 ring-2 ring-emerald-400/20' 
              : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:border-emerald-400'
          }`}
        >
          <div className="flex items-center justify-between text-emerald-700 dark:text-emerald-400 text-xs font-bold mb-1">
            <span>{isTh ? '2. ใช้งานอยู่ (In-use)' : '2. In-use (On-Hire)'}</span>
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
          </div>
          <div className="text-2xl font-black text-emerald-700 dark:text-emerald-400 font-mono">
            {metrics.inUseCount} <span className="text-xs font-normal text-slate-500">งาน</span>
          </div>
          <div className="text-[11px] text-emerald-700/80 dark:text-emerald-300/80 mt-1 flex items-center gap-1">
            <span className="px-1.5 py-0.2 rounded bg-emerald-100 dark:bg-emerald-500/20 font-bold">Green Tag</span>
          </div>
        </div>

        {/* Card 4: Extension Requests */}
        <div 
          onClick={() => setStageFilter(stageFilter === 'Extension' ? 'all' : 'Extension')}
          className={`rounded-2xl border p-4.5 shadow-xs cursor-pointer transition-all ${
            stageFilter === 'Extension' 
              ? 'bg-rose-50/90 dark:bg-rose-950/40 border-rose-400 ring-2 ring-rose-400/20' 
              : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:border-rose-400'
          }`}
        >
          <div className="flex items-center justify-between text-rose-700 dark:text-rose-400 text-xs font-bold mb-1">
            <span>{isTh ? 'ขอขยายเวลา' : 'Extension Req.'}</span>
            <Clock size={15} className="text-rose-500" />
          </div>
          <div className="text-2xl font-black text-rose-700 dark:text-rose-400 font-mono">
            {metrics.extensionCount} <span className="text-xs font-normal text-slate-500">งาน</span>
          </div>
          <div className="text-[11px] text-rose-700/80 dark:text-rose-300/80 mt-1">
            {isTh ? 'คำขอจาก Requestor' : 'By Requestor'}
          </div>
        </div>

        {/* Card 5: 3. Dismantle Stage (Red Tag) */}
        <div 
          onClick={() => setStageFilter(stageFilter === 'Dismantle' ? 'all' : 'Dismantle')}
          className={`rounded-2xl border p-4.5 shadow-xs cursor-pointer transition-all ${
            stageFilter === 'Dismantle' 
              ? 'bg-purple-50/90 dark:bg-purple-950/40 border-purple-400 ring-2 ring-purple-400/20' 
              : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:border-purple-400'
          }`}
        >
          <div className="flex items-center justify-between text-purple-700 dark:text-purple-400 text-xs font-bold mb-1">
            <span>{isTh ? '3. รื้อถอน (Dismantle)' : '3. Dismantle'}</span>
            <span className="w-2.5 h-2.5 rounded-full bg-purple-500" />
          </div>
          <div className="text-2xl font-black text-purple-700 dark:text-purple-400 font-mono">
            {metrics.dismantleCount} <span className="text-xs font-normal text-slate-500">งาน</span>
          </div>
          <div className="text-[11px] text-purple-700/80 dark:text-purple-300/80 mt-1 flex items-center gap-1">
            <span className="px-1.5 py-0.2 rounded bg-purple-100 dark:bg-purple-500/20 font-bold">Red Tag</span>
          </div>
        </div>
      </div>

      {/* Quick Stage Filter Tabs & View Switcher */}
      <div className="flex items-center justify-between flex-wrap gap-2 pt-1 border-b border-slate-200 dark:border-slate-800 pb-3">
        <div className="flex items-center gap-1.5 overflow-x-auto custom-scrollbar flex-nowrap py-1">
          <button
            type="button"
            onClick={() => setStageFilter('all')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
              stageFilter === 'all'
                ? 'bg-cyan-700 text-white font-black shadow-xs'
                : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white border border-slate-200 dark:border-slate-800'
            }`}
          >
            {isTh ? `ทุกขั้นตอน (${jobs.length})` : `All Stages (${jobs.length})`}
          </button>
          <button
            type="button"
            onClick={() => setStageFilter('Execution')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
              stageFilter === 'Execution'
                ? 'bg-amber-500 text-slate-950 font-black shadow-xs'
                : 'bg-white dark:bg-slate-900 text-amber-700 dark:text-amber-300 border border-slate-200 dark:border-slate-800'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-amber-500" />
            <span>{isTh ? `1. กำลังติดตั้ง (Execution: ${metrics.executionCount})` : `1. Execution (${metrics.executionCount})`}</span>
          </button>
          <button
            type="button"
            onClick={() => setStageFilter('In-use')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
              stageFilter === 'In-use'
                ? 'bg-emerald-600 text-white font-black shadow-xs'
                : 'bg-white dark:bg-slate-900 text-emerald-700 dark:text-emerald-300 border border-slate-200 dark:border-slate-800'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            <span>{isTh ? `2. ใช้งานอยู่ (In-use: ${metrics.inUseCount})` : `2. In-use (${metrics.inUseCount})`}</span>
          </button>
          <button
            type="button"
            onClick={() => setStageFilter('Dismantle')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
              stageFilter === 'Dismantle'
                ? 'bg-purple-600 text-white font-black shadow-xs'
                : 'bg-white dark:bg-slate-900 text-purple-700 dark:text-purple-300 border border-slate-200 dark:border-slate-800'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-purple-500" />
            <span>{isTh ? `3. รื้อถอนเสร็จ (Dismantle: ${metrics.dismantleCount})` : `3. Dismantle (${metrics.dismantleCount})`}</span>
          </button>
          <button
            type="button"
            onClick={() => setStageFilter('Extension')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
              stageFilter === 'Extension'
                ? 'bg-rose-600 text-white font-black shadow-xs'
                : 'bg-white dark:bg-slate-900 text-rose-700 dark:text-rose-300 border border-slate-200 dark:border-slate-800'
            }`}
          >
            <Clock size={12} />
            <span>{isTh ? `ขอขยายเวลา (${metrics.extensionCount})` : `Extended (${metrics.extensionCount})`}</span>
          </button>
        </div>

        {/* View Switcher: Table List vs Plot Plan */}
        <div className="flex items-center p-1 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
          <button
            type="button"
            onClick={() => setViewMode('table')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              viewMode === 'table'
                ? 'bg-white dark:bg-slate-700 text-cyan-700 dark:text-cyan-400 shadow-xs font-black'
                : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <FileText size={14} />
            <span>{isTh ? 'ตารางข้อมูล (Table)' : 'Table View'}</span>
          </button>
          <button
            type="button"
            onClick={() => setViewMode('plot-plan')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              viewMode === 'plot-plan'
                ? 'bg-white dark:bg-slate-700 text-cyan-700 dark:text-cyan-400 shadow-xs font-black'
                : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <MapPin size={14} />
            <span>{isTh ? 'แผนผังโรงงาน (Plot Plan)' : 'Plot Plan View'}</span>
          </button>
        </div>
      </div>

      {/* =========================================================================
          2. SEARCH & FILTER BAR (7 Fields - Crisp White in Light Mode, Slate-800 in Dark Mode)
         ========================================================================= */}
      <div className="bg-white dark:bg-slate-850 rounded-2xl border border-slate-200 dark:border-slate-700/80 p-4 shadow-xs space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-7 gap-3 text-xs">
          {/* 1. Date From */}
          <div>
            <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 mb-1">
              {isTh ? 'ตั้งแต่วันที่' : 'Date From'}
            </label>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="w-full px-2.5 py-1.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-xs text-slate-900 dark:text-slate-100 shadow-2xs font-mono focus:outline-none focus:ring-2 focus:ring-cyan-600/20 focus:border-cyan-600"
            />
          </div>

          {/* 2. Date End */}
          <div>
            <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 mb-1">
              {isTh ? 'ถึงวันที่' : 'Date End'}
            </label>
            <input
              type="date"
              value={dateEnd}
              onChange={(e) => setDateEnd(e.target.value)}
              className="w-full px-2.5 py-1.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-xs text-slate-900 dark:text-slate-100 shadow-2xs font-mono focus:outline-none focus:ring-2 focus:ring-cyan-600/20 focus:border-cyan-600"
            />
          </div>

          {/* 3. Job Type */}
          <div>
            <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 mb-1">
              {isTh ? 'ประเภทใบงาน' : 'Job Type'}
            </label>
            <select
              value={filterJobType}
              onChange={(e) => setFilterJobType(e.target.value)}
              className="w-full px-2.5 py-1.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-xs text-slate-900 dark:text-slate-100 shadow-2xs focus:outline-none focus:ring-2 focus:ring-cyan-600/20 focus:border-cyan-600"
            >
              <option value="all">{isTh ? 'ทุกประเภท' : 'All Job Types'}</option>
              <option value="BCP Job">BCP Job</option>
              <option value="Contractor Job">Contractor Job</option>
            </select>
          </div>

          {/* 4. Contractor */}
          <div>
            <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 mb-1">
              {isTh ? 'ผู้รับเหมา' : 'Contractor'}
            </label>
            <select
              value={filterContractor}
              onChange={(e) => setFilterContractor(e.target.value)}
              className="w-full px-2.5 py-1.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-xs text-slate-900 dark:text-slate-100 shadow-2xs focus:outline-none focus:ring-2 focus:ring-cyan-600/20 focus:border-cyan-600"
            >
              <option value="all">{isTh ? 'ทุกบริษัท' : 'All Contractors'}</option>
              {CONTRACTOR_COMPANIES.map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          {/* 5. Scaffold Type */}
          <div>
            <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 mb-1">
              {isTh ? 'ชนิดนั่งร้าน' : 'Scaffold Type'}
            </label>
            <select
              value={filterScaffoldType}
              onChange={(e) => setFilterScaffoldType(e.target.value)}
              className="w-full px-2.5 py-1.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-xs text-slate-900 dark:text-slate-100 shadow-2xs focus:outline-none focus:ring-2 focus:ring-cyan-600/20 focus:border-cyan-600"
            >
              <option value="all">{isTh ? 'ทุกชนิด' : 'All Types'}</option>
              <option value="Standard">Standard</option>
              <option value="Heavy Duty">Heavy Duty</option>
              <option value="360° Ring">360° Ring</option>
              <option value="Cantilever">Cantilever</option>
            </select>
          </div>

          {/* 6. Status */}
          <div>
            <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 mb-1">
              {isTh ? 'สถานะ' : 'Status'}
            </label>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="w-full px-2.5 py-1.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-xs text-slate-900 dark:text-slate-100 shadow-2xs focus:outline-none focus:ring-2 focus:ring-cyan-600/20 focus:border-cyan-600"
            >
              <option value="all">{isTh ? 'ทุกสถานะ' : 'All Statuses'}</option>
              <option value="Requested">Requested (รออนุมัติ)</option>
              <option value="Approved">Approved (อนุมัติแล้ว)</option>
              <option value="In Progress">In Progress (กำลังทำ)</option>
              <option value="Completed">Completed (เสร็จสิ้น)</option>
              <option value="Rejected">Rejected (ปฏิเสธ)</option>
            </select>
          </div>

          {/* 7. Search text */}
          <div>
            <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 mb-1">
              {isTh ? 'ค้นหา Job / Tag' : 'Search Job / Tag'}
            </label>
            <div className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="SF-..., 11-C-101..."
                className="w-full pl-7 pr-2.5 py-1.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-xs text-slate-900 dark:text-slate-100 shadow-2xs focus:outline-none focus:ring-2 focus:ring-cyan-600/20 focus:border-cyan-600"
              />
              <Search size={13} className="absolute left-2.5 top-2 text-slate-400" />
            </div>
          </div>
        </div>

        {/* Filter Reset Button */}
        {(dateFrom || dateEnd || filterJobType !== 'all' || filterContractor !== 'all' || filterScaffoldType !== 'all' || filterStatus !== 'all' || searchQuery) && (
          <div className="flex justify-end pt-1">
            <button
              type="button"
              onClick={() => {
                setDateFrom('');
                setDateEnd('');
                setFilterJobType('all');
                setFilterContractor('all');
                setFilterScaffoldType('all');
                setFilterStatus('all');
                setSearchQuery('');
              }}
              className="text-[11px] text-cyan-700 dark:text-cyan-400 hover:underline flex items-center gap-1 cursor-pointer"
            >
              <RefreshCw size={11} />
              <span>{isTh ? 'ล้างตัวกรองทั้งหมด' : 'Reset Filters'}</span>
            </button>
          </div>
        )}
      </div>

      {/* =========================================================================
          3A. TABLE LIST VIEW (Clean White / Light-Theme Friendly, High Contrast)
         ========================================================================= */}
      {viewMode === 'table' && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-xs">
          <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-bold text-[11px] uppercase tracking-wider">
                  <th className="p-3 w-10 text-center">No.</th>
                  <th className="p-3 min-w-[140px]">{isTh ? 'รหัสใบงาน / Equipment Tag' : 'Job No & Tag'}</th>
                  <th className="p-3 min-w-[240px]">{isTh ? '1. รายละเอียดงาน (Job Description)' : '1. Job Description'}</th>
                  <th className="p-3 min-w-[210px]">{isTh ? '2. Scaffold Estimate (L×H×W / Vol M³)' : '2. Scaffold Estimate'}</th>
                  <th className="p-3 min-w-[240px]">{isTh ? '3. Execution / In-use / Dismantle' : '3. Lifecycle & Rental Dates'}</th>
                  <th className="p-3 min-w-[140px]">{isTh ? '4. สถานะงาน (Status)' : '4. Status & Progress'}</th>
                  <th className="p-3 min-w-[150px] text-center">{isTh ? '5. ปุ่มสั่งการ (Action)' : '5. Action'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredJobs.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-10 text-center text-slate-400 text-xs">
                      {isTh ? 'ไม่พบข้อมูลงานนั่งร้านตามเงื่อนไขที่เลือก' : 'No scaffolding jobs found matching criteria.'}
                    </td>
                  </tr>
                ) : (
                  filteredJobs.map((job, idx) => (
                    <tr key={job.id} className="bg-white dark:bg-slate-900 hover:bg-slate-50/90 dark:hover:bg-slate-800/50 transition-colors">
                      {/* No. */}
                      <td className="p-3 text-center font-mono text-slate-400 font-bold">{idx + 1}</td>

                      {/* Job No & Tag */}
                      <td className="p-3">
                        <div className="font-mono font-bold text-slate-900 dark:text-white text-xs flex items-center gap-1.5">
                          <span>{job.id}</span>
                        </div>
                        <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                          <span className="px-2 py-0.5 rounded-md bg-cyan-100 dark:bg-cyan-950/60 text-cyan-800 dark:text-cyan-300 font-mono font-bold text-[10px] border border-cyan-200 dark:border-cyan-800/60">
                            {job.equipmentTag}
                          </span>
                          <span className="text-[10px] font-mono text-slate-500 dark:text-slate-400">
                            {job.company}
                          </span>
                        </div>
                      </td>

                      {/* 1. คอลัมน์ Job Description (รายละเอียดงาน) */}
                      <td className="p-3">
                        {/* บรรทัดบน: ข้อความขอบเขตงาน เช่น "Erect access scaffold at Crude Column 11-C-101 Manhole #3 & #4" (ตัดทอนข้อความยาวด้วย truncate) */}
                        <div 
                          className="text-slate-800 dark:text-slate-200 font-medium text-xs truncate max-w-[260px]" 
                          title={job.jobDescription}
                        >
                          {job.jobDescription}
                        </div>

                        {/* บรรทัดล่าง: ชนิดของนั่งร้าน เช่น Heavy Duty Engineered Scaffold, Standard System Scaffold, 360° Column Ring Scaffold, Cantilever / Hanging Platform */}
                        <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                          <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold border ${
                            job.scaffoldType === 'Heavy Duty' 
                              ? 'bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800/60' 
                              : job.scaffoldType === '360° Ring'
                              ? 'bg-cyan-50 dark:bg-cyan-950/50 text-cyan-700 dark:text-cyan-300 border-cyan-200 dark:border-cyan-800/60'
                              : job.scaffoldType === 'Cantilever'
                              ? 'bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800/60'
                              : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                          }`}>
                            {getScaffoldTypeFullLabel(job.scaffoldType)}
                          </span>

                          {job.heavyDuty === 'Y' && (
                            <span className="px-1.5 py-0.5 rounded bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 text-[9px] font-mono font-bold border border-amber-200 dark:border-amber-800">
                              PE Req.
                            </span>
                          )}
                        </div>
                      </td>

                      {/* 2. คอลัมน์ Scaffold Estimate (L×H×W / Vol M³) (การประเมินขนาดและปริมาตร) */}
                      <td className="p-3">
                        {job.estimate?.isEvaluated ? (
                          <div 
                            onClick={() => setSelectedJobForEstimate(job)}
                            className="p-2.5 rounded-xl bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200/80 dark:border-emerald-800/60 hover:border-emerald-400 dark:hover:border-emerald-500 cursor-pointer transition-all space-y-1 shadow-2xs group"
                            title="คลิกเพื่อเปิด Scaffold Estimate Modal"
                          >
                            <div className="flex items-center justify-between text-xs">
                              <div className="flex items-center gap-1.5 font-mono font-black text-emerald-700 dark:text-emerald-300 text-sm">
                                <Box size={14} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
                                <span>{job.estimate.volume.toLocaleString()} M³</span>
                              </div>
                              <span className="text-[10px] font-mono text-emerald-800 dark:text-emerald-300 font-semibold bg-emerald-100/80 dark:bg-emerald-900/60 px-1.5 py-0.5 rounded">
                                Base: {job.estimate.baseHeight ?? 0} m
                              </span>
                            </div>

                            <div className="text-[10px] font-mono text-slate-600 dark:text-slate-400">
                              L:{job.estimate.length}m × H:{job.estimate.height}m × W:{job.estimate.weight}m
                            </div>

                            <div className="text-[10px] flex items-center gap-1 pt-0.5 border-t border-emerald-100 dark:border-emerald-900/50">
                              {job.estimate.drawingFile ? (
                                <div className="flex items-center gap-1 text-emerald-700 dark:text-emerald-400 truncate font-mono">
                                  <Paperclip size={11} className="shrink-0 text-emerald-600" />
                                  <span className="truncate max-w-[130px]" title={job.estimate.drawingFile.name}>
                                    {job.estimate.drawingFile.name}
                                  </span>
                                </div>
                              ) : (
                                <span className="text-amber-600 dark:text-amber-400 text-[10px] flex items-center gap-1 font-sans">
                                  <AlertCircle size={10} /> + แนบไฟล์แบบสเก็ตช์
                                </span>
                              )}
                            </div>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setSelectedJobForEstimate(job)}
                            className="w-full p-2.5 rounded-xl border border-dashed border-cyan-300 dark:border-cyan-800/80 bg-cyan-50/50 dark:bg-cyan-950/20 text-cyan-700 dark:text-cyan-400 hover:bg-cyan-100 dark:hover:bg-cyan-900/40 hover:border-cyan-400 text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer transition-all shadow-2xs"
                            title="คลิกเพื่อประเมินขนาดและแนบไฟล์แบบสเก็ตช์"
                          >
                            <Plus size={13} />
                            <span>+ ประเมินขนาด (Estimate)</span>
                          </button>
                        )}
                      </td>

                      {/* 3. คอลัมน์ Execution / In-use / Dismantle (การปฏิบัติงาน / วันเช่า) */}
                      <td className="p-3">
                        <div 
                          onClick={() => setSelectedJobForHireControl(job)}
                          className="p-2.5 rounded-xl bg-slate-50/80 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80 hover:border-blue-400 dark:hover:border-blue-500 cursor-pointer transition-all space-y-1.5 shadow-2xs"
                          title="คลิกเพื่อเปิด Execution / In-use / Dismantle Modal"
                        >
                          {/* Badge ขั้นตอนปัจจุบัน พร้อมตัวเลขสรุปจำนวนวันเช่ารวม */}
                          <div className="flex items-center justify-between gap-1.5">
                            <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold flex items-center gap-1 border ${
                              job.lifecycleStage === 'Execution'
                                ? 'bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border-amber-300 dark:border-amber-800'
                                : job.lifecycleStage === 'In-use'
                                ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800'
                                : 'bg-purple-100 dark:bg-purple-950/60 text-purple-800 dark:text-purple-300 border-purple-300 dark:border-purple-800'
                            }`}>
                              {job.lifecycleStage === 'Execution' && <Wrench size={10} className="shrink-0" />}
                              {job.lifecycleStage === 'In-use' && <ShieldCheck size={10} className="shrink-0" />}
                              {job.lifecycleStage === 'Dismantle' && <Hammer size={10} className="shrink-0" />}
                              <span>
                                {job.lifecycleStage === 'Execution' ? 'Execution (ติดตั้ง)' : job.lifecycleStage === 'In-use' ? 'In-use (ใช้งาน)' : 'Dismantle (รื้อถอน)'}
                              </span>
                            </span>

                            <span className="text-[10px] font-mono font-bold text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-900 px-1.5 py-0.5 rounded border border-slate-200 dark:border-slate-700">
                              {job.hireControl?.totalDays || (job.hirePeriod === '30 days' ? 30 : 15)} วัน
                            </span>
                          </div>

                          {/* กริดวันที่ 2 ช่อง (By: Contractor) */}
                          <div className="grid grid-cols-2 gap-1 text-[10px] font-mono bg-white dark:bg-slate-900/60 p-1.5 rounded-lg border border-slate-200/80 dark:border-slate-700/60">
                            <div>
                              <div className="text-[9px] text-slate-400 font-sans">On hire:</div>
                              <div className="font-bold text-emerald-600 dark:text-emerald-400">
                                {formatThaiDisplayDate(job.hireControl?.onHireDate || job.requiredDate)}
                              </div>
                            </div>
                            <div>
                              <div className="text-[9px] text-slate-400 font-sans">Off hire:</div>
                              <div className="font-bold text-rose-600 dark:text-rose-400">
                                {formatThaiDisplayDate(job.hireControl?.offHireDate || job.offHireDate)}
                              </div>
                            </div>
                          </div>

                          {/* สถานะการขอขยายเวลา (By: Requestor) */}
                          <div className="text-[10px]">
                            {job.hireControl?.extensionRequest && job.hireControl.extensionRequest !== 'None' ? (
                              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 font-bold border border-blue-200 dark:border-blue-800">
                                <Clock size={10} />
                                <span>{job.hireControl.extensionRequest}</span>
                              </span>
                            ) : (
                              <span className="text-slate-400 dark:text-slate-500 font-sans">
                                ตามกำหนดเดิม (No Extension)
                              </span>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* 4. คอลัมน์ Status (สถานะงานและแถบความคืบหน้า) */}
                      <td className="p-3">
                        <div className="space-y-1.5">
                          <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold border ${
                            job.status === 'Completed' 
                              ? 'bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800'
                              : job.status === 'Approved'
                              ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
                              : job.status === 'Rejected'
                              ? 'bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800'
                              : job.status === 'In Progress'
                              ? 'bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800 animate-pulse'
                              : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700'
                          }`}>
                            {job.status === 'In Progress' && <Loader2 size={10} className="animate-spin text-blue-600 shrink-0" />}
                            <span>{job.status}</span>
                          </span>

                          {/* Progress Bar (ปรากฏเฉพาะเมื่อ In Progress) */}
                          {job.status === 'In Progress' && (
                            <div className="space-y-0.5">
                              <div className="w-full bg-slate-200 dark:bg-slate-800 rounded-full h-1.5 overflow-hidden">
                                <div 
                                  className="h-full bg-blue-600 transition-all duration-300 rounded-full"
                                  style={{ width: `${Math.max(10, job.progress)}%` }}
                                />
                              </div>
                              <div className="text-[10px] font-mono text-blue-600 dark:text-blue-400 font-bold text-right">
                                {job.progress}%
                              </div>
                            </div>
                          )}
                        </div>
                      </td>

                      {/* 5. คอลัมน์ Action (ปุ่มสั่งการ) */}
                      <td className="p-3 text-center">
                        <div className="flex items-center justify-center gap-1">
                          {/* 1. ปุ่ม Estimate (ไอคอน Calculator) */}
                          <button
                            type="button"
                            onClick={() => setSelectedJobForEstimate(job)}
                            className="p-1.5 rounded-lg bg-slate-100 hover:bg-cyan-100 text-cyan-700 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-cyan-400 cursor-pointer border border-slate-200 dark:border-slate-700 transition-colors"
                            title="1. Estimate (ประเมินขนาด)"
                          >
                            <Calculator size={14} />
                          </button>

                          {/* 2. ปุ่ม Hire/Use (ไอคอน CalendarClock) */}
                          <button
                            type="button"
                            onClick={() => setSelectedJobForHireControl(job)}
                            className="p-1.5 rounded-lg bg-slate-100 hover:bg-emerald-100 text-emerald-600 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-emerald-400 cursor-pointer border border-slate-200 dark:border-slate-700 transition-colors"
                            title="2. Hire/Use (ควบคุมวันเช่า / ขั้นตอน)"
                          >
                            <CalendarClock size={14} />
                          </button>

                          {/* 3. ปุ่ม Approve (ไอคอน CheckCircle สีเขียว) — แสดงเฉพาะแถวที่เป็น Requested */}
                          {job.status === 'Requested' && (
                            <button
                              type="button"
                              onClick={() => {
                                setJobToApprove(job);
                                setApproveRemarks('');
                              }}
                              className="p-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-600 dark:bg-emerald-950/60 dark:hover:bg-emerald-900/60 dark:text-emerald-400 cursor-pointer border border-emerald-200 dark:border-emerald-800 transition-colors shadow-2xs"
                              title="3. Approve (อนุมัติคำขอ)"
                            >
                              <CheckCircle size={14} />
                            </button>
                          )}

                          {/* 4. ปุ่ม Reject (ไอคอน XCircle สีแดง) — แสดงเฉพาะแถวที่เป็น Requested */}
                          {job.status === 'Requested' && (
                            <button
                              type="button"
                              onClick={() => {
                                setJobToReject(job);
                                setRejectRemarks('');
                              }}
                              className="p-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600 dark:bg-rose-950/60 dark:hover:bg-rose-900/60 dark:text-rose-400 cursor-pointer border border-rose-200 dark:border-rose-800 transition-colors shadow-2xs"
                              title="4. Reject (ปฏิเสธคำขอ)"
                            >
                              <XCircle size={14} />
                            </button>
                          )}

                          {/* 5. ปุ่ม View Details (ไอคอน Edit สีน้ำเงิน) */}
                          <button
                            type="button"
                            onClick={() => setSelectedJobForDetails(job)}
                            className="p-1.5 rounded-lg bg-slate-100 hover:bg-blue-100 text-blue-600 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-blue-400 cursor-pointer border border-slate-200 dark:border-slate-700 transition-colors"
                            title="5. View Details (ดูรายละเอียดเต็ม)"
                          >
                            <Edit size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* =========================================================================
          3B. PLOT PLAN VIEW (CAD Spatial Layout)
         ========================================================================= */}
      {viewMode === 'plot-plan' && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <div className="text-slate-900 dark:text-white font-bold text-sm flex items-center gap-2">
                <MapPin size={16} className="text-cyan-600" />
                <span>{isTh ? 'แผนผังโรงกลั่นแสดงพิกัดนั่งร้านจริง (Master CAD Spatial Layout)' : 'Refinery Master CAD Scaffolding Layout'}</span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                {isTh ? 'แสดงตำแหน่งและขนาดบล็อกนั่งร้านจริงตามสถานะ คลิกที่หมุดเพื่อเปิดดูข้อมูลและประเมินขนาด' : 'Hover for quick telemetry, click to inspect and update.'}
              </p>
            </div>

            {/* Map Controls */}
            <div className="flex items-center gap-2 flex-wrap">
              {/* CAD Theme Switcher: Dark Blueprint / Paper CAD */}
              <div className={`flex items-center p-0.5 rounded-xl border ${
                isDarkBlueprint ? 'bg-slate-900 border-slate-700' : 'bg-slate-100 border-slate-200'
              }`}>
                <button
                  type="button"
                  onClick={() => {
                    setBlueprintTheme('dark');
                    setGlobalThemeGate(true);
                  }}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-bold flex items-center gap-1 transition-all cursor-pointer ${
                    isDarkBlueprint
                      ? 'bg-cyan-500 text-slate-950 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Moon size={12} />
                  <span>Dark Blueprint</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setBlueprintTheme('paper');
                    setGlobalThemeGate(false);
                  }}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-bold flex items-center gap-1 transition-all cursor-pointer ${
                    !isDarkBlueprint
                      ? 'bg-white text-slate-900 shadow-xs border border-slate-200'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <Sun size={12} className="text-amber-500" />
                  <span>Paper CAD</span>
                </button>
              </div>

              <button
                type="button"
                onClick={() => setZoomLevel(prev => Math.max(25, prev - 20))}
                className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200"
                title="Zoom Out (ขยายออกนอกพื้นที่)"
              >
                <ZoomOut size={14} />
              </button>
              <span className="font-mono text-xs text-slate-500 px-1 font-bold min-w-[36px] text-center">{zoomLevel}%</span>
              <button
                type="button"
                onClick={() => setZoomLevel(prev => Math.min(400, prev + 20))}
                className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200"
                title="Zoom In (ซูมเข้าดูรายละเอียด)"
              >
                <ZoomIn size={14} />
              </button>
              <button
                type="button"
                onClick={() => { setZoomLevel(100); setPanOffset({ x: 0, y: 0 }); }}
                className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200"
                title="Reset View (100%)"
              >
                <RotateCcw size={14} />
              </button>
              <button
                type="button"
                onClick={() => { setZoomLevel(60); setPanOffset({ x: 0, y: 0 }); }}
                className="px-2 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 text-xs font-bold"
                title="Fit Entire Plot Plan on Screen"
              >
                Fit
              </button>
            </div>
          </div>

          {/* Plot Plan Interactive Canvas with authentic Esso Sriracha drawing */}
          <div 
            onWheel={handleWheel}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            className={`relative w-full h-[520px] rounded-2xl border-2 overflow-hidden select-none cursor-grab active:cursor-grabbing transition-colors duration-300 ${
              isDarkBlueprint
                ? 'border-slate-800 bg-[#070b14]'
                : 'border-slate-300 bg-[#f4f7fb]'
            }`}
          >
            {/* North Compass Indicator */}
            <div className="absolute top-4 left-4 z-20 pointer-events-none flex items-center gap-2 bg-slate-900/90 backdrop-blur-md px-3 py-1.5 rounded-xl border border-slate-700 text-xs font-mono text-white shadow-lg">
              <Compass size={14} className="text-amber-400 animate-spin-slow" />
              <span className="font-bold">NORTH ▲</span>
              <span className="text-slate-400 text-[10px]">| CAD 1:500</span>
            </div>

            {/* Spatial Legend */}
            <div className="absolute top-4 right-4 z-20 pointer-events-none bg-slate-900/90 backdrop-blur-md p-3 rounded-2xl border border-slate-700 text-[11px] text-white shadow-xl space-y-1.5">
              <div className="font-mono font-bold text-slate-300 text-[10px] border-b border-slate-800 pb-1">
                LIFECYCLE STATUS
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                <span>In-use (Green Tag)</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                <span>Execution (Yellow Tag)</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-purple-500" />
                <span>Dismantle (Red Tag)</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-cyan-600" />
                <span>Requested</span>
              </div>
            </div>

            {/* Canvas Transform Wrapper */}
            <div
              style={{
                transform: `translate(${panOffset.x}px, ${panOffset.y}px) scale(${zoomLevel / 100})`,
                transformOrigin: 'center center',
                transition: isPanning ? 'none' : 'transform 0.15s ease-out'
              }}
              className="w-full h-full relative"
            >
              {/* Authentic Master Plot Plan Background Image */}
              <div className="absolute inset-0 pointer-events-none select-none overflow-hidden flex items-center justify-center">
                <img
                  src={essoPlotPlanBg}
                  alt="Esso Sriracha Master Plot Plan"
                  className={`w-full h-full object-contain pointer-events-none select-none transition-all duration-300 ${
                    isDarkBlueprint
                      ? 'filter invert hue-rotate-180 brightness-[0.78] contrast-[1.25] opacity-65'
                      : 'opacity-90 mix-blend-multiply'
                  }`}
                />
              </div>

              {/* Grid overlay lines (A1 to D6) */}
              <div className={`absolute inset-0 grid grid-cols-4 grid-rows-6 pointer-events-none opacity-20 border ${
                isDarkBlueprint ? 'border-slate-700' : 'border-slate-400'
              }`}>
                {['A', 'B', 'C', 'D'].map((col) => 
                  [1, 2, 3, 4, 5, 6].map((row) => (
                    <div key={`${col}${row}`} className={`border p-2 text-[10px] font-mono ${
                      isDarkBlueprint ? 'border-slate-800 text-slate-500' : 'border-slate-300 text-slate-700'
                    }`}>
                      {col}{row}
                    </div>
                  ))
                )}
              </div>

              {/* Simulated Zone Boundary Blocks (mockAreas) */}
              {mockAreas.map((area) => (
                <div
                  key={area.id}
                  className="absolute pointer-events-none rounded-xl border-2 border-dashed z-10 flex flex-col justify-between p-2 transition-all"
                  style={{
                    left: `${area.x}%`,
                    top: `${area.y}%`,
                    width: `${area.w}%`,
                    height: `${area.h}%`,
                    borderColor: area.color === 'green' ? 'rgba(34, 197, 94, 0.65)' : area.color === 'cyan' ? 'rgba(249, 115, 22, 0.65)' : 'rgba(148, 163, 184, 0.65)',
                    backgroundColor: area.color === 'green' ? 'rgba(34, 197, 94, 0.09)' : area.color === 'cyan' ? 'rgba(249, 115, 22, 0.09)' : 'rgba(148, 163, 184, 0.09)'
                  }}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-slate-900/90 text-white backdrop-blur-xs border border-slate-700 shadow-xs">
                      {area.label}
                    </span>
                    <span className="text-[9px] font-mono px-1 py-0.2 rounded bg-slate-800 text-slate-300">
                      {area.status}
                    </span>
                  </div>
                  <span className="text-[9px] font-mono text-slate-400 self-end font-semibold">Ref: {area.jobNo}</span>
                </div>
              ))}

              {/* Interactive Scaffolding Pins & Scale Blocks */}
              {filteredJobs.map((job) => {
                const colorInfo = getStatusColor(job);
                const isHovered = hoveredJob?.id === job.id;
                return (
                  <div
                    key={job.id}
                    onMouseEnter={() => setHoveredJob(job)}
                    onMouseLeave={() => setHoveredJob(null)}
                    onClick={() => setSelectedJobForDetails(job)}
                    className="absolute -translate-x-1/2 -translate-y-1/2 cursor-pointer z-20 group"
                    style={{
                      left: `${job.markingLocation.x}%`,
                      top: `${job.markingLocation.y}%`
                    }}
                  >
                    <div 
                      className="absolute rounded-full border border-dashed transition-all -translate-x-1/2 -translate-y-1/2"
                      style={{
                        width: `${job.markingLocation.dropZoneRadius * 6}px`,
                        height: `${job.markingLocation.dropZoneRadius * 6}px`,
                        borderColor: colorInfo.border,
                        backgroundColor: `${colorInfo.bg}15`,
                        left: '50%',
                        top: '50%'
                      }}
                    />

                    <div
                      className="absolute rounded border transition-all -translate-x-1/2 -translate-y-1/2 flex items-center justify-center text-[9px] font-mono font-bold text-white shadow-lg"
                      style={{
                        width: `${Math.max(20, job.markingLocation.scaleBlock.width * 5)}px`,
                        height: `${Math.max(20, job.markingLocation.scaleBlock.length * 5)}px`,
                        backgroundColor: `${colorInfo.bg}80`,
                        borderColor: colorInfo.border,
                        transform: `translate(-50%, -50%) rotate(${job.markingLocation.scaleBlock.rotation}deg)`,
                        left: '50%',
                        top: '50%'
                      }}
                    >
                      <span className="scale-75 truncate px-0.5">{job.equipmentTag}</span>
                    </div>

                    <div 
                      className="w-5 h-5 rounded-full flex items-center justify-center shadow-xl text-slate-950 font-black text-[9px] border-2 border-white relative z-10"
                      style={{ backgroundColor: colorInfo.bg }}
                    >
                      SF
                    </div>

                    {isHovered && (
                      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-3 w-56 p-3 rounded-2xl bg-slate-950/95 border border-slate-700 text-white shadow-2xl z-40 space-y-1 text-xs pointer-events-none animate-in fade-in zoom-in-95">
                        <div className="font-bold flex items-center justify-between text-cyan-400">
                          <span>{job.id}</span>
                          <span className="font-mono text-[10px] text-slate-400">{job.equipmentTag}</span>
                        </div>
                        <div className="text-[11px] text-slate-300 line-clamp-2">{job.jobDescription}</div>
                        <div className="border-t border-slate-800 pt-1 text-[10px] font-mono flex items-center justify-between text-slate-400">
                          <span>{job.company}</span>
                          <span style={{ color: colorInfo.border }} className="font-bold">{colorInfo.text}</span>
                        </div>
                        {job.estimate?.isEvaluated && (
                          <div className="text-[10px] text-emerald-400 font-mono">
                            Volume: {job.estimate.volume} m³
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL 1: SCAFFOLD ESTIMATE MODAL (6 Fields Spec)
         ========================================================================= */}
      {selectedJobForEstimate && (
        <ScaffoldEstimateModal
          job={selectedJobForEstimate}
          isOpen={true}
          onClose={() => setSelectedJobForEstimate(null)}
          onSave={(updatedJob) => {
            setJobs(prev => prev.map(j => j.id === updatedJob.id ? updatedJob : j));
            setSelectedJobForEstimate(null);
            showNotification(isTh ? `บันทึกการประเมินขนาดงาน ${updatedJob.id} สำเร็จ` : `Estimate saved for ${updatedJob.id}`);
          }}
          isTh={isTh}
        />
      )}

      {/* =========================================================================
          MODAL 2: EXECUTION / IN-USE / DISMANTLE MODAL (Role-based Hire Control)
         ========================================================================= */}
      {selectedJobForHireControl && (
        <ScaffoldHireControlModal
          job={selectedJobForHireControl}
          isOpen={true}
          onClose={() => setSelectedJobForHireControl(null)}
          onSave={(updatedJob) => {
            setJobs(prev => prev.map(j => j.id === updatedJob.id ? updatedJob : j));
            setSelectedJobForHireControl(null);
            showNotification(isTh ? `อัปเดตขั้นตอนและวันเช่า ${updatedJob.id} เรียบร้อยแล้ว` : `Hire control updated for ${updatedJob.id}`);
          }}
          isTh={isTh}
        />
      )}

      {/* =========================================================================
          MODAL 3: CONFIRM APPROVE MODAL
         ========================================================================= */}
      {jobToApprove && (
        <ApproveConfirmModal
          job={jobToApprove}
          remarks={approveRemarks}
          onRemarksChange={setApproveRemarks}
          onConfirm={handleConfirmApprove}
          onClose={() => setJobToApprove(null)}
          isTh={isTh}
        />
      )}

      {/* =========================================================================
          MODAL 4: CONFIRM REJECT MODAL
         ========================================================================= */}
      {jobToReject && (
        <RejectConfirmModal
          job={jobToReject}
          remarks={rejectRemarks}
          onRemarksChange={setRejectRemarks}
          onConfirm={handleConfirmReject}
          onClose={() => setJobToReject(null)}
          isTh={isTh}
        />
      )}

      {/* =========================================================================
          MODAL 5: REQUEST USE DETAIL MODAL (With 4-Step Checklist & QR Code)
         ========================================================================= */}
      {selectedJobForDetails && (
        <RequestUseDetailModal
          job={selectedJobForDetails}
          onClose={() => setSelectedJobForDetails(null)}
          onOpenEstimate={(j) => { setSelectedJobForDetails(null); setSelectedJobForEstimate(j); }}
          onOpenHireControl={(j) => { setSelectedJobForDetails(null); setSelectedJobForHireControl(j); }}
          onOpenApprove={(j) => { setSelectedJobForDetails(null); setJobToApprove(j); setApproveRemarks(''); }}
          onOpenReject={(j) => { setSelectedJobForDetails(null); setJobToReject(j); setRejectRemarks(''); }}
          onNavigateToPlotPlan={(j) => {
            setSelectedJobForDetails(null);
            setViewMode('plot-plan');
            setHoveredJob(j);
          }}
          onUpdateJob={(updatedJob) => {
            setJobs(prev => prev.map(j => j.id === updatedJob.id ? updatedJob : j));
            setSelectedJobForDetails(updatedJob);
          }}
          isTh={isTh}
        />
      )}
    </div>
  );
}

// =========================================================================
// SUB-COMPONENT: SCAFFOLD ESTIMATE MODAL (6 Fields Spec - White/Dark Adaptive)
// =========================================================================
interface ScaffoldEstimateModalProps {
  job: ScaffoldingSFJob;
  isOpen: boolean;
  onClose: () => void;
  onSave: (updatedJob: ScaffoldingSFJob) => void;
  isTh: boolean;
}

function ScaffoldEstimateModal({ job, isOpen, onClose, onSave, isTh }: ScaffoldEstimateModalProps) {
  const [baseHeight, setBaseHeight] = useState<number>(job.estimate?.baseHeight ?? 0);
  const [length, setLength] = useState<number>(job.estimate?.length ?? 6);
  const [height, setHeight] = useState<number>(job.estimate?.height ?? 12);
  const [weight, setWeight] = useState<number>(job.estimate?.weight ?? 4);
  const [volume, setVolume] = useState<number>(job.estimate?.volume ?? 288);
  const [autoCalculateVolume, setAutoCalculateVolume] = useState<boolean>(job.estimate?.autoCalculateVolume ?? true);

  const [drawingFile, setDrawingFile] = useState<{
    name: string;
    size: number;
    url?: string;
    type?: string;
  } | null>(job.estimate?.drawingFile ?? null);

  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (autoCalculateVolume) {
      const calc = Number((length * height * weight).toFixed(2));
      setVolume(calc);
    }
  }, [length, height, weight, autoCalculateVolume]);

  const topElevation = Number((baseHeight + height).toFixed(2));
  const baseFootprintM2 = Number((length * weight).toFixed(2));

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      setDrawingFile({
        name: file.name,
        size: file.size,
        type: file.type,
        url
      });
    }
  };

  const handleFillSampleEstimate = () => {
    setBaseHeight(4.5);
    setLength(8.0);
    setHeight(12.0);
    setWeight(4.0);
    setAutoCalculateVolume(true);
    setDrawingFile({
      name: 'SF-2026-0842_Scaffold_Isometric_Sketch_Rev1.pdf',
      size: '842.0 KB',
      type: 'application/pdf',
      url: 'https://images.unsplash.com/photo-1503387762-592deb58ef4e?auto=format&fit=crop&w=900&q=80',
      uploadedAt: '2026-09-24 09:15'
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const updated = updateScaffoldingJob(job.id, {
      estimate: {
        isEvaluated: true,
        baseHeight: Math.max(0, baseHeight),
        length: Math.max(0.1, length),
        height: Math.max(0.1, height),
        weight: Math.max(0.1, weight),
        volume: Math.max(0.1, volume),
        autoCalculateVolume,
        drawingFile,
        topElevation,
        baseFootprintM2,
        evaluatedAt: format(new Date(), 'yyyy-MM-dd HH:mm'),
        evaluatedBy: 'Scaffold Engineer Lead'
      },
      scaffoldEstimate: {
        baseHeight: Math.max(0, baseHeight),
        lengthM: Math.max(0.1, length),
        heightM: Math.max(0.1, height),
        weightM: Math.max(0.1, weight),
        volumeM3: Math.max(0.1, volume),
        drawingFile: drawingFile as any
      }
    });
    if (updated) onSave(updated);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="w-full max-w-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-cyan-100 dark:bg-cyan-950/60 text-cyan-700 dark:text-cyan-400 flex items-center justify-center">
              <Ruler size={20} />
            </div>
            <div>
              <h2 className="text-lg font-black text-slate-900 dark:text-white">
                {isTh ? 'ประเมินขนาดและปริมาตรนั่งร้าน (Scaffold Estimate)' : 'Scaffold Size & Volume Estimate'}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-mono">
                {job.id} · Tag: {job.equipmentTag}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <X size={18} />
          </button>
        </div>

        {/* Telemetry Strip */}
        <div className="grid grid-cols-3 gap-3 p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs">
          <div>
            <div className="text-[10px] text-slate-500 font-mono">TOP ELEVATION</div>
            <div className="text-base font-black text-slate-900 dark:text-white font-mono mt-0.5">+{topElevation} m</div>
            <div className="text-[10px] text-slate-500">ความสูงยอดจากพื้น</div>
          </div>
          <div>
            <div className="text-[10px] text-slate-500 font-mono">BASE FOOTPRINT</div>
            <div className="text-base font-black text-emerald-600 dark:text-emerald-400 font-mono mt-0.5">{baseFootprintM2} m²</div>
            <div className="text-[10px] text-slate-500">พื้นที่ฐานตั้ง (L × W)</div>
          </div>
          <div>
            <div className="text-[10px] text-slate-500 font-mono">ESTIMATED VOLUME</div>
            <div className="text-base font-black text-cyan-700 dark:text-cyan-400 font-mono mt-0.5">{volume.toLocaleString()} m³</div>
            <div className="text-[10px] text-slate-500">ปริมาตรรวม</div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
            {/* 1. Base height */}
            <div>
              <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                1. Base height (m) (*)
              </label>
              <input
                type="number"
                step="0.1"
                min="0"
                value={baseHeight}
                onChange={(e) => setBaseHeight(parseFloat(e.target.value) || 0)}
                className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-sm text-slate-900 dark:text-white font-mono text-center focus:outline-none focus:border-cyan-600"
              />
              <span className="text-[10px] text-slate-500">ระดับฐาน (≥ 0 m)</span>
            </div>

            {/* 2. Length (m) */}
            <div>
              <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                2. Length (m) (*)
              </label>
              <input
                type="number"
                step="0.1"
                min="0.1"
                value={length}
                onChange={(e) => setLength(parseFloat(e.target.value) || 1)}
                className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-sm text-slate-900 dark:text-white font-mono text-center focus:outline-none focus:border-cyan-600"
              />
              <span className="text-[10px] text-slate-500">ความยาว (&gt; 0 m)</span>
            </div>

            {/* 3. Height (m) */}
            <div>
              <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                3. Height (m) (*)
              </label>
              <input
                type="number"
                step="0.1"
                min="0.1"
                value={height}
                onChange={(e) => setHeight(parseFloat(e.target.value) || 1)}
                className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-sm text-slate-900 dark:text-white font-mono text-center focus:outline-none focus:border-cyan-600"
              />
              <span className="text-[10px] text-slate-500">ความสูง (&gt; 0 m)</span>
            </div>

            {/* 4. Weight (m) */}
            <div>
              <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                4. Weight / กว้าง (m) (*)
              </label>
              <input
                type="number"
                step="0.1"
                min="0.1"
                value={weight}
                onChange={(e) => setWeight(parseFloat(e.target.value) || 1)}
                className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-sm text-slate-900 dark:text-white font-mono text-center focus:outline-none focus:border-cyan-600"
              />
              <span className="text-[10px] text-slate-500">ความกว้างช่วง (&gt; 0 m)</span>
            </div>
          </div>

          {/* 5. Volume (M³) */}
          <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-800 dark:text-slate-200">
                5. Volume / ปริมาตร (M³)
              </label>
              <label className="flex items-center gap-2 cursor-pointer text-xs text-cyan-700 dark:text-cyan-400">
                <input
                  type="checkbox"
                  checked={autoCalculateVolume}
                  onChange={(e) => setAutoCalculateVolume(e.target.checked)}
                  className="rounded text-cyan-600"
                />
                <span>คำนวณอัตโนมัติ (Length × Height × Weight)</span>
              </label>
            </div>

            <input
              type="number"
              step="0.1"
              value={volume}
              disabled={autoCalculateVolume}
              onChange={(e) => setVolume(parseFloat(e.target.value) || 0)}
              className={`w-full px-3 py-2 rounded-xl border text-sm font-mono font-bold ${
                autoCalculateVolume 
                  ? 'bg-slate-100 dark:bg-slate-700/60 border-slate-200 dark:border-slate-700 text-cyan-700 dark:text-cyan-400' 
                  : 'bg-white dark:bg-slate-800 border-cyan-600 text-slate-900 dark:text-white'
              }`}
            />
          </div>

          {/* 6. Scaffold drawing / sketch / document */}
          <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 space-y-2">
            <label className="block text-xs font-bold text-slate-800 dark:text-slate-200">
              6. Scaffold drawing / sketch / document (เอกสารแบบแปลน/ภาพสเก็ตช์)
            </label>

            {drawingFile ? (
              <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-emerald-500/40 flex items-center justify-between">
                <div className="flex items-center gap-2 truncate">
                  <FileText size={16} className="text-emerald-500 shrink-0" />
                  <span className="text-xs text-slate-900 dark:text-white truncate">{drawingFile.name}</span>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    type="button"
                    onClick={() => fileRef.current?.click()}
                    className="p-1 rounded text-slate-500 hover:text-slate-900 dark:hover:text-white"
                  >
                    <RefreshCw size={13} />
                  </button>
                  <button
                    type="button"
                    onClick={() => setDrawingFile(null)}
                    className="p-1 rounded text-rose-500 hover:text-rose-700"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            ) : (
              <div>
                <input
                  type="file"
                  ref={fileRef}
                  onChange={handleFileUpload}
                  accept="application/pdf,image/png,image/jpeg"
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  className="w-full py-3 rounded-xl border border-dashed border-slate-300 dark:border-slate-700 hover:border-cyan-600 text-xs text-slate-600 dark:text-slate-400 hover:text-cyan-700 flex items-center justify-center gap-2 cursor-pointer transition-all"
                >
                  <Upload size={14} />
                  <span>{isTh ? 'อัปโหลดไฟล์ PDF / PNG / JPG' : 'Upload DWG Sketch (PDF/Image)'}</span>
                </button>
              </div>
            )}
          </div>

          {/* Modal Actions */}
          <div className="flex items-center justify-between pt-2">
            <button
              type="button"
              onClick={handleFillSampleEstimate}
              className="text-xs text-cyan-700 dark:text-cyan-400 hover:underline flex items-center gap-1 cursor-pointer font-bold"
            >
              <Sparkles size={13} />
              <span>{isTh ? 'ข้อมูลตัวอย่าง (Sample Estimate)' : 'Sample Estimate'}</span>
            </button>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                {isTh ? 'ยกเลิก' : 'Cancel'}
              </button>
              <button
                type="submit"
                className="px-5 py-2 rounded-xl text-xs font-black bg-cyan-700 hover:bg-cyan-600 text-white shadow-md shadow-cyan-700/25 flex items-center gap-1.5 cursor-pointer"
              >
                <Check size={14} />
                <span>{isTh ? 'บันทึกการประเมิน' : 'Save Estimate'}</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

// =========================================================================
// SUB-COMPONENT: SCAFFOLD HIRE CONTROL MODAL (Role-based Spec)
// =========================================================================
interface ScaffoldHireControlModalProps {
  job: ScaffoldingSFJob;
  isOpen: boolean;
  onClose: () => void;
  onSave: (updatedJob: ScaffoldingSFJob) => void;
  isTh: boolean;
}

function ScaffoldHireControlModal({ job, isOpen, onClose, onSave, isTh }: ScaffoldHireControlModalProps) {
  const [stage, setStage] = useState<'Execution' | 'In-use' | 'Dismantle'>(job.lifecycleStage);
  const [onHireDate, setOnHireDate] = useState<string>(job.hireControl?.onHireDate ?? job.requiredDate);
  const [baseOffHireDate, setBaseOffHireDate] = useState<string>(job.hireControl?.originalOffHireDate ?? job.offHireDate);
  const [offHireDate, setOffHireDate] = useState<string>(job.hireControl?.offHireDate ?? job.offHireDate);
  const [extensionRequest, setExtensionRequest] = useState<ExtensionRequestType>(
    job.hireControl?.extensionRequest ?? 'None'
  );
  const [contractorBy, setContractorBy] = useState<string>(
    job.hireControl?.contractorBy || job.scaffoldExecution?.contractorBy || `${job.company} Site Supervisor`
  );
  const [requestorBy, setRequestorBy] = useState<string>(
    job.hireControl?.requestorBy || job.scaffoldExecution?.requestorBy || `${job.functionalDepartment} Area Requestor`
  );

  const handleExtensionChange = (ext: ExtensionRequestType) => {
    setExtensionRequest(ext);
    const recalculated = calculateExtendedOffHireDate(baseOffHireDate, ext);
    setOffHireDate(recalculated);
  };

  const handleQuickAddDays = (days: number) => {
    try {
      const base = parseISO(baseOffHireDate);
      if (!isNaN(base.getTime())) {
        const next = format(addDays(base, days), 'yyyy-MM-dd');
        setBaseOffHireDate(next);
        setOffHireDate(calculateExtendedOffHireDate(next, extensionRequest));
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleFillSampleExecution = () => {
    setStage('In-use');
    setOnHireDate('2026-10-20');
    setBaseOffHireDate('2026-11-04');
    setExtensionRequest('Extend +15 Days');
    setOffHireDate('2026-11-19');
    setContractorBy('Kaefer Site Supervisor');
    setRequestorBy('IMD Area Requestor');
  };

  const totalDays = calculateTotalHireDays(onHireDate, offHireDate);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const tagType = stage === 'Execution' ? 'Yellow' : stage === 'In-use' ? 'Green' : 'Red';
    const scaffoldTag = stage === 'Execution' ? 'Yellow Tag (Execution)' : stage === 'In-use' ? 'Green Tag (In-use)' : 'Red Tag (Dismantle)';
    const newStatus = stage === 'Dismantle' ? 'Completed' : stage === 'In-use' ? 'In Progress' : (job.status === 'Requested' ? 'Approved' : job.status);
    const newProgress = stage === 'Dismantle' ? 100 : stage === 'In-use' ? 75 : 25;

    const updated = updateScaffoldingJob(job.id, {
      lifecycleStage: stage,
      status: newStatus,
      progress: newProgress,
      offHireDate,
      hireControl: {
        onHireDate,
        offHireDate,
        extensionRequest,
        originalOffHireDate: baseOffHireDate,
        totalDays,
        tagType,
        contractorBy,
        requestorBy,
        scaffoldTag,
        updatedAt: format(new Date(), 'yyyy-MM-dd HH:mm')
      },
      scaffoldExecution: {
        phase: stage,
        onHireDate,
        offHireDate,
        extensionRequest,
        contractorBy,
        requestorBy,
        scaffoldTag
      }
    });

    if (updated) onSave(updated);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="w-full max-w-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <Clock size={20} />
            </div>
            <div>
              <h2 className="text-lg font-black text-slate-900 dark:text-white">
                {isTh ? 'ควบคุมขั้นตอนและวันเช่า (Execution / In-use / Dismantle)' : 'Execution / In-use / Dismantle Control'}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-mono">
                {job.id} · {job.equipmentTag} ({job.company})
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleFillSampleExecution}
              className="px-2.5 py-1.5 rounded-xl text-xs font-bold bg-cyan-50 dark:bg-cyan-950/50 text-cyan-700 dark:text-cyan-400 hover:bg-cyan-100 dark:hover:bg-cyan-900/60 border border-cyan-200 dark:border-cyan-800/60 flex items-center gap-1 cursor-pointer transition-all"
              title="Fill Sample Execution Data"
            >
              <Sparkles size={13} />
              <span>{isTh ? 'กรอกตัวอย่าง' : 'Sample Data'}</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Stage Selector (3 Levels) */}
        <div className="grid grid-cols-3 gap-2 p-1.5 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
          <button
            type="button"
            onClick={() => setStage('Execution')}
            className={`py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
              stage === 'Execution'
                ? 'bg-amber-500 text-slate-900 shadow-xs font-black'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-amber-500" />
            <span>1. Execution (Yellow)</span>
          </button>

          <button
            type="button"
            onClick={() => setStage('In-use')}
            className={`py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
              stage === 'In-use'
                ? 'bg-emerald-600 text-white shadow-xs font-black'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            <span>2. In-use (Green)</span>
          </button>

          <button
            type="button"
            onClick={() => setStage('Dismantle')}
            className={`py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
              stage === 'Dismantle'
                ? 'bg-purple-600 text-white shadow-xs font-black'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-purple-500" />
            <span>3. Dismantle (Red)</span>
          </button>
        </div>

        {/* Telemetry Bar */}
        <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-between text-xs font-mono">
          <div>
            <div className="text-[10px] text-slate-500">HIRE PERIOD DURATION</div>
            <div className="font-bold text-slate-900 dark:text-white mt-0.5">{onHireDate} → {offHireDate}</div>
          </div>
          <div className="text-right">
            <div className="text-[10px] text-slate-500">TOTAL RENTAL DAYS</div>
            <div className="font-black text-cyan-700 dark:text-cyan-400 text-base">{totalDays} Days</div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          {/* Section: Contractor Role Fields */}
          <div className="p-4 rounded-2xl bg-slate-50/80 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 space-y-3">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-700 pb-2">
              <span className="font-bold text-slate-800 dark:text-slate-300">Contractor Inputs (โดยผู้รับเหมา)</span>
              <span className="text-[10px] font-mono text-cyan-700 dark:text-cyan-400 font-bold">{job.company}</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* On hire date */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300">
                    On hire date (*)
                  </label>
                  <button
                    type="button"
                    onClick={() => setOnHireDate(format(new Date(), 'yyyy-MM-dd'))}
                    className="text-[10px] text-cyan-700 dark:text-cyan-400 hover:underline"
                  >
                    Set Today
                  </button>
                </div>
                <input
                  type="date"
                  value={onHireDate}
                  onChange={(e) => setOnHireDate(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white font-mono focus:outline-none focus:border-cyan-600"
                />
              </div>

              {/* Off hire date */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300">
                    Off hire date (*)
                  </label>
                  <div className="flex items-center gap-1.5 text-[10px]">
                    <button
                      type="button"
                      onClick={() => handleQuickAddDays(15)}
                      className="text-cyan-700 dark:text-cyan-400 hover:underline"
                    >
                      +15d
                    </button>
                    <button
                      type="button"
                      onClick={() => handleQuickAddDays(30)}
                      className="text-cyan-700 dark:text-cyan-400 hover:underline"
                    >
                      +30d
                    </button>
                  </div>
                </div>
                <input
                  type="date"
                  value={offHireDate}
                  onChange={(e) => {
                    setOffHireDate(e.target.value);
                    setBaseOffHireDate(e.target.value);
                  }}
                  className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white font-mono focus:outline-none focus:border-cyan-600"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                Responsible Contractor Lead (ผู้รับผิดชอบผู้รับเหมา)
              </label>
              <input
                type="text"
                value={contractorBy}
                onChange={(e) => setContractorBy(e.target.value)}
                placeholder="e.g. Kaefer Site Supervisor"
                className="w-full px-3 py-1.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white font-mono text-xs focus:outline-none focus:border-cyan-600"
              />
            </div>
          </div>

          {/* Section: Requestor Role Field */}
          <div className="p-4 rounded-2xl bg-slate-50/80 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 space-y-3">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-700 pb-2">
              <span className="font-bold text-slate-800 dark:text-slate-300">Requestor Input (โดยผู้ขอใช้งาน)</span>
              <span className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400 font-bold">Auto +Days to Off-hire</span>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                Extension request / คำขอขยายเวลา
              </label>
              <select
                value={extensionRequest}
                onChange={(e) => handleExtensionChange(e.target.value as ExtensionRequestType)}
                className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white font-bold focus:outline-none focus:border-cyan-600"
              >
                {EXTENSION_REQUEST_OPTIONS.map(opt => (
                  <option key={opt.value} value={opt.value}>
                    {isTh ? opt.labelTh : opt.labelEn}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                Requestor By (ผู้ขอใช้งาน / วิศวกรประจำพื้นที่)
              </label>
              <input
                type="text"
                value={requestorBy}
                onChange={(e) => setRequestorBy(e.target.value)}
                placeholder="e.g. IMD Area Requestor"
                className="w-full px-3 py-1.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white font-mono text-xs focus:outline-none focus:border-cyan-600"
              />
            </div>
          </div>

          {/* Modal Actions */}
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              {isTh ? 'ยกเลิก' : 'Cancel'}
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl text-xs font-black bg-emerald-600 hover:bg-emerald-500 text-white shadow-md shadow-emerald-600/20 flex items-center gap-1.5 cursor-pointer"
            >
              <Check size={14} />
              <span>{isTh ? 'บันทึกการเปลี่ยนแปลง' : 'Save Changes'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// =========================================================================
// SUB-COMPONENT: CONFIRMATION MODAL (APPROVE)
// =========================================================================
interface ApproveConfirmModalProps {
  job: ScaffoldingSFJob;
  remarks: string;
  onRemarksChange: (val: string) => void;
  onConfirm: () => void;
  onClose: () => void;
  isTh: boolean;
}

function ApproveConfirmModal({ job, remarks, onRemarksChange, onConfirm, onClose, isTh }: ApproveConfirmModalProps) {
  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-200 text-center">
        <div className="w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-950/70 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto shadow-inner">
          <CheckCircle size={36} className="stroke-[2.5]" />
        </div>

        <div>
          <h3 className="text-lg font-black text-slate-900 dark:text-white">
            Confirm Action
          </h3>
          <p className="text-xs text-slate-600 dark:text-slate-300 mt-1.5 font-medium leading-relaxed">
            Are you sure you want to <span className="font-bold text-emerald-600 dark:text-emerald-400">APPROVED</span> job request <span className="font-mono font-bold text-slate-900 dark:text-white">{job.id}</span>?
          </p>
          <div className="text-[11px] text-slate-400 font-mono mt-0.5">
            Tag: {job.equipmentTag} · {job.company}
          </div>
        </div>

        <div className="text-left space-y-1">
          <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400">
            Optional Remarks (ข้อเสนอแนะเพิ่มเติม)
          </label>
          <input
            type="text"
            value={remarks}
            onChange={(e) => onRemarksChange(e.target.value)}
            placeholder="ใส่ข้อเสนอแนะเพิ่มเติมก่อนอนุมัติ..."
            className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500"
          />
        </div>

        <div className="flex items-center justify-center gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-2.5 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-400 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="flex-1 py-2.5 rounded-xl text-xs font-black bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-600/30 transition-all active:scale-95"
          >
            Confirm Approve
          </button>
        </div>
      </div>
    </div>
  );
}

// =========================================================================
// SUB-COMPONENT: CONFIRMATION MODAL (REJECT)
// =========================================================================
interface RejectConfirmModalProps {
  job: ScaffoldingSFJob;
  remarks: string;
  onRemarksChange: (val: string) => void;
  onConfirm: () => void;
  onClose: () => void;
  isTh: boolean;
}

function RejectConfirmModal({ job, remarks, onRemarksChange, onConfirm, onClose, isTh }: RejectConfirmModalProps) {
  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-200 text-center">
        <div className="w-16 h-16 rounded-full bg-rose-100 dark:bg-rose-950/70 text-rose-600 dark:text-rose-400 flex items-center justify-center mx-auto shadow-inner">
          <XCircle size={36} className="stroke-[2.5]" />
        </div>

        <div>
          <h3 className="text-lg font-black text-slate-900 dark:text-white">
            Confirm Action
          </h3>
          <p className="text-xs text-slate-600 dark:text-slate-300 mt-1.5 font-medium leading-relaxed">
            Are you sure you want to <span className="font-bold text-rose-600 dark:text-rose-400">REJECTED</span> job request <span className="font-mono font-bold text-slate-900 dark:text-white">{job.id}</span>?
          </p>
          <div className="text-[11px] text-slate-400 font-mono mt-0.5">
            Tag: {job.equipmentTag} · {job.company}
          </div>
        </div>

        <div className="text-left space-y-1">
          <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400">
            Optional Remarks / เหตุผลการปฏิเสธคำขอ
          </label>
          <input
            type="text"
            value={remarks}
            onChange={(e) => onRemarksChange(e.target.value)}
            placeholder="ระบุเหตุผล เช่น แผนผังซ้อนทับ หรืออุปกรณ์ไม่พร้อม..."
            className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-rose-500"
          />
        </div>

        <div className="flex items-center justify-center gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-2.5 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-400 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="flex-1 py-2.5 rounded-xl text-xs font-black bg-rose-600 hover:bg-rose-700 text-white shadow-lg shadow-rose-600/30 transition-all active:scale-95"
          >
            Confirm Reject
          </button>
        </div>
      </div>
    </div>
  );
}

// =========================================================================
// SUB-COMPONENT: REQUEST USE DETAIL MODAL (With 4-Step Checklist & QR Code)
// =========================================================================
interface RequestUseDetailModalProps {
  job: ScaffoldingSFJob;
  onClose: () => void;
  onOpenEstimate: (job: ScaffoldingSFJob) => void;
  onOpenHireControl: (job: ScaffoldingSFJob) => void;
  onOpenApprove: (job: ScaffoldingSFJob) => void;
  onOpenReject: (job: ScaffoldingSFJob) => void;
  onNavigateToPlotPlan: (job: ScaffoldingSFJob) => void;
  onUpdateJob: (job: ScaffoldingSFJob) => void;
  isTh: boolean;
}

function RequestUseDetailModal({
  job,
  onClose,
  onOpenEstimate,
  onOpenHireControl,
  onOpenApprove,
  onOpenReject,
  onNavigateToPlotPlan,
  onUpdateJob,
  isTh
}: RequestUseDetailModalProps) {
  // 4-Step Field Checklist state
  const [checklist, setChecklist] = useState({
    sitePreparation: !!(job.fieldChecklist?.sitePreparation || job.progress >= 25),
    materialInspection: !!(job.fieldChecklist?.materialInspection || job.progress >= 50),
    qualityCheck: !!(job.fieldChecklist?.qualityCheck || job.progress >= 75),
    finalInspection: !!(job.fieldChecklist?.finalInspection || job.progress >= 100),
  });

  const handleToggleChecklist = (key: keyof typeof checklist) => {
    const updatedChecklist = { ...checklist, [key]: !checklist[key] };
    setChecklist(updatedChecklist);

    const checkedCount = Object.values(updatedChecklist).filter(Boolean).length;
    const progress = checkedCount * 25;
    const isCompleted = checkedCount === 4;

    const updated = updateScaffoldingJob(job.id, {
      fieldChecklist: updatedChecklist,
      progress,
      status: isCompleted ? 'Completed' : (job.status === 'Requested' ? 'In Progress' : job.status),
      lifecycleStage: isCompleted ? 'Dismantle' : job.lifecycleStage
    });

    if (updated) {
      onUpdateJob(updated);
    }
  };

  const totalDays = job.hireControl?.totalDays || calculateTotalHireDays(
    job.hireControl?.onHireDate || job.requiredDate,
    job.hireControl?.offHireDate || job.offHireDate
  );

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="w-full max-w-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto custom-scrollbar">
        {/* Modal Header */}
        <div className="flex items-start justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-cyan-100 dark:bg-cyan-950/60 text-cyan-700 dark:text-cyan-400 flex items-center justify-center font-mono font-bold text-base shadow-xs">
              SF
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-black text-slate-900 dark:text-white">
                  {job.id}
                </h2>
                <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                  job.status === 'Completed' 
                    ? 'bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800'
                    : job.status === 'Approved'
                    ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
                    : job.status === 'Rejected'
                    ? 'bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800'
                    : job.status === 'In Progress'
                    ? 'bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700'
                }`}>
                  {job.status}
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-mono mt-0.5">
                Tag: {job.equipmentTag} · Area: {job.locationArea} ({job.company})
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* SVG QR Code */}
            <div className="p-1.5 rounded-xl bg-white border border-slate-200 shadow-xs" title="Scan to inspect on field">
              <QRCodeSVG value={`https://plantturn.bcp/scaffold/${job.id}`} size={56} />
            </div>
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* 1. Overview Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
            <div className="text-[10px] text-slate-500 dark:text-slate-400 font-mono uppercase">Status (สถานะ)</div>
            <div className="font-bold text-slate-900 dark:text-white mt-1">{job.status}</div>
          </div>
          <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
            <div className="text-[10px] text-slate-500 dark:text-slate-400 font-mono uppercase">Schedule Start</div>
            <div className="font-bold text-slate-900 dark:text-white mt-1 font-mono">{job.requiredDate}</div>
          </div>
          <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
            <div className="text-[10px] text-slate-500 dark:text-slate-400 font-mono uppercase">Scaffold Type</div>
            <div className="font-bold text-slate-900 dark:text-white mt-1 truncate" title={getScaffoldTypeFullLabel(job.scaffoldType)}>
              {job.scaffoldType}
            </div>
          </div>
          <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
            <div className="text-[10px] text-slate-500 dark:text-slate-400 font-mono uppercase">Coordinates (พิกัด CAD)</div>
            <div className="font-bold text-slate-900 dark:text-white mt-1 font-mono">
              X:{job.markingLocation.x}% Y:{job.markingLocation.y}% (Z:{job.markingLocation.gridZone})
            </div>
          </div>
        </div>

        {/* 2 & 3: Execution & Estimation Twin Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          {/* Card 2: Execution & Hire Status */}
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                <CalendarClock size={14} className="text-emerald-600 dark:text-emerald-400" />
                <span>Execution & Hire Period</span>
              </span>
              <button
                type="button"
                onClick={() => onOpenHireControl(job)}
                className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 hover:underline"
              >
                แก้ไขวันเช่า
              </button>
            </div>

            <div className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-1.5 font-mono text-[11px]">
              <div className="flex justify-between">
                <span className="text-slate-500">Stage / Tag:</span>
                <span className="font-bold text-slate-800 dark:text-slate-200">{job.lifecycleStage} Tag</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">On-Hire:</span>
                <span className="text-emerald-600 font-bold">{job.hireControl?.onHireDate || job.requiredDate}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Off-Hire:</span>
                <span className="text-rose-600 font-bold">{job.hireControl?.offHireDate || job.offHireDate}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Total Rental:</span>
                <span className="font-bold text-slate-900 dark:text-white">{totalDays} วัน</span>
              </div>
              <div className="flex justify-between pt-1 border-t border-slate-100 dark:border-slate-800">
                <span className="text-slate-500">Extension Request:</span>
                <span className="font-bold text-blue-600 dark:text-blue-400">{job.hireControl?.extensionRequest || 'None'}</span>
              </div>
            </div>
          </div>

          {/* Card 3: Scaffold Estimation Spec */}
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                <Box size={14} className="text-cyan-700 dark:text-cyan-400" />
                <span>Scaffold Estimation Spec</span>
              </span>
              <button
                type="button"
                onClick={() => onOpenEstimate(job)}
                className="text-[11px] font-bold text-cyan-700 dark:text-cyan-400 hover:underline"
              >
                {job.estimate?.isEvaluated ? 'แก้ไขการประเมิน' : '+ ประเมินขนาด'}
              </button>
            </div>

            {job.estimate?.isEvaluated ? (
              <div className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-1.5 font-mono text-[11px]">
                <div className="flex justify-between items-center">
                  <span className="text-slate-500">Total Volume:</span>
                  <span className="font-black text-cyan-700 dark:text-cyan-400 text-sm">{job.estimate.volume.toLocaleString()} M³</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Dimensions:</span>
                  <span>L:{job.estimate.length}m × H:{job.estimate.height}m × W:{job.estimate.weight}m</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Elevation:</span>
                  <span>Base: +{job.estimate.baseHeight}m | Top: +{job.estimate.topElevation}m</span>
                </div>
                <div className="flex justify-between pt-1 border-t border-slate-100 dark:border-slate-800 items-center">
                  <span className="text-slate-500">Drawing File:</span>
                  {job.estimate.drawingFile ? (
                    <span className="text-emerald-600 font-bold truncate max-w-[150px]">{job.estimate.drawingFile.name}</span>
                  ) : (
                    <span className="text-slate-400">ไม่มีไฟล์แนบ</span>
                  )}
                </div>
              </div>
            ) : (
              <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-center text-slate-400 text-xs">
                ยังไม่มีการประเมินขนาดโครงสร้างนั่งร้าน
              </div>
            )}
          </div>
        </div>

        {/* 4. 4-Step Field Checklist (กรณีงานกำลังทำ In Progress หรือตรวจสอบหน้างาน) */}
        <div className="p-4 rounded-2xl bg-blue-50/60 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900/40 space-y-3">
          <div className="flex items-center justify-between">
            <span className="font-bold text-blue-900 dark:text-blue-300 text-xs flex items-center gap-1.5">
              <CheckCircle2 size={15} className="text-blue-600" />
              <span>4-Step Field Checklist (การตรวจรับมอบหน้างานและความคืบหน้า)</span>
            </span>
            <span className="font-mono font-black text-blue-600 dark:text-blue-400 text-xs">
              {job.progress}% Complete
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
            <label className="flex items-center gap-2 p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 cursor-pointer hover:border-blue-400 transition-colors">
              <input
                type="checkbox"
                checked={checklist.sitePreparation}
                onChange={() => handleToggleChecklist('sitePreparation')}
                className="w-4 h-4 rounded text-blue-600"
              />
              <span className="font-medium text-slate-800 dark:text-slate-200">1. Site Preparation & Barricade (+25%)</span>
            </label>

            <label className="flex items-center gap-2 p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 cursor-pointer hover:border-blue-400 transition-colors">
              <input
                type="checkbox"
                checked={checklist.materialInspection}
                onChange={() => handleToggleChecklist('materialInspection')}
                className="w-4 h-4 rounded text-blue-600"
              />
              <span className="font-medium text-slate-800 dark:text-slate-200">2. Scaffold Material Inspection (+25%)</span>
            </label>

            <label className="flex items-center gap-2 p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 cursor-pointer hover:border-blue-400 transition-colors">
              <input
                type="checkbox"
                checked={checklist.qualityCheck}
                onChange={() => handleToggleChecklist('qualityCheck')}
                className="w-4 h-4 rounded text-blue-600"
              />
              <span className="font-medium text-slate-800 dark:text-slate-200">3. Quality Check & Testing (+25%)</span>
            </label>

            <label className="flex items-center gap-2 p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 cursor-pointer hover:border-blue-400 transition-colors">
              <input
                type="checkbox"
                checked={checklist.finalInspection}
                onChange={() => handleToggleChecklist('finalInspection')}
                className="w-4 h-4 rounded text-blue-600"
              />
              <span className="font-medium text-slate-800 dark:text-slate-200">4. Final Inspection & Handover (+25%)</span>
            </label>
          </div>
        </div>

        {/* 5. Stakeholder & Scope of Work */}
        <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 space-y-2 text-xs">
          <div className="font-bold text-slate-800 dark:text-slate-200">รายละเอียดงาน (Job Description & Scope)</div>
          <p className="text-slate-700 dark:text-slate-300 leading-relaxed bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-200 dark:border-slate-800">
            {job.jobDescription}
          </p>
        </div>

        {/* Modal Actions */}
        <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800 flex-wrap gap-2">
          {/* Quick Approve / Reject if Requested */}
          <div className="flex items-center gap-2">
            {job.status === 'Requested' && (
              <>
                <button
                  type="button"
                  onClick={() => onOpenApprove(job)}
                  className="px-3.5 py-2 rounded-xl text-xs font-black bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs flex items-center gap-1.5 cursor-pointer"
                >
                  <CheckCircle size={14} />
                  <span>Approve Request</span>
                </button>
                <button
                  type="button"
                  onClick={() => onOpenReject(job)}
                  className="px-3.5 py-2 rounded-xl text-xs font-black bg-rose-600 hover:bg-rose-700 text-white shadow-xs flex items-center gap-1.5 cursor-pointer"
                >
                  <XCircle size={14} />
                  <span>Reject</span>
                </button>
              </>
            )}

            <button
              type="button"
              onClick={() => onNavigateToPlotPlan(job)}
              className="px-3.5 py-2 rounded-xl text-xs font-bold bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 hover:bg-blue-100 border border-blue-200 dark:border-blue-800 flex items-center gap-1.5 cursor-pointer"
            >
              <MapPin size={14} />
              <span>{isTh ? 'ดูบนผัง Plot Plan CAD' : 'View on Plot Plan'}</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              {isTh ? 'ปิดหน้าต่าง' : 'Close'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
