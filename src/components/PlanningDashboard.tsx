import React, { useState, useMemo, useRef } from 'react';
import { 
  Download, FileSpreadsheet, MapPin, Search, Filter, 
  BarChart3, PieChart, Layers, Calendar, HardHat, 
  CheckCircle, XCircle, Clock, Sparkles, Eye, Printer, 
  ChevronRight, RefreshCw, ZoomIn, ZoomOut, Maximize2,
  ChevronLeft, ChevronsLeft, ChevronsRight, Crosshair,
  TrendingUp, AlertOctagon, Building2
} from 'lucide-react';
import { PlanningJobItem, EquipmentResource } from './optimizerData';
import { useLanguage } from '../context/LanguageContext';
import essoPlotPlanBg from '../assets/esso_sriracha_master_plotplan.jpg';
import { useThemeGate, setGlobalThemeGate } from '../utils/themeGate';

interface PlanningDashboardProps {
  jobs: PlanningJobItem[];
  equipment: EquipmentResource[];
  onSelectJobForReview?: (job: PlanningJobItem) => void;
  onNavigateToOptimize?: () => void;
  onNavigateToExecutiveView?: (view: string) => void;
  isScaffolding?: boolean;
  globalPlantFilter?: 'All' | 'Phra Khanong' | 'Sriracha';
}

export default function PlanningDashboard({
  jobs,
  equipment,
  onSelectJobForReview,
  onNavigateToOptimize,
  onNavigateToExecutiveView,
  isScaffolding = false,
  globalPlantFilter = 'All',
}: PlanningDashboardProps) {
  const { isTh } = useLanguage();
  const isGlobalDark = useThemeGate();
  const [selectedPlant, setSelectedPlant] = useState<string>(globalPlantFilter);
  const [selectedPriority, setSelectedPriority] = useState<string>('All');
  const [selectedDate, setSelectedDate] = useState<string>('All');
  const [selectedStatus, setSelectedStatus] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');

  React.useEffect(() => {
    if (globalPlantFilter) {
      setSelectedPlant(globalPlantFilter);
    }
  }, [globalPlantFilter]);
  const [activePinJob, setActivePinJob] = useState<PlanningJobItem | null>(null);
  const [mapZoom, setMapZoom] = useState<number>(1);
  const [mapPan, setMapPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isDraggingMap, setIsDraggingMap] = useState<boolean>(false);
  const dragStartRef = useRef<{ x: number; y: number; panX: number; panY: number }>({ x: 0, y: 0, panX: 0, panY: 0 });
  const [exportNotice, setExportNotice] = useState<string | null>(null);

  const clampPan = (pan: { x: number; y: number }, zoom: number) => {
    if (zoom <= 1) return { x: 0, y: 0 };
    const container = mapContainerRef.current;
    const width = container ? container.clientWidth : 800;
    const height = container ? container.clientHeight : 460;
    const maxPanX = ((zoom - 1) * width) / 2;
    const maxPanY = ((zoom - 1) * height) / 2;
    return {
      x: Math.max(-maxPanX, Math.min(maxPanX, pan.x)),
      y: Math.max(-maxPanY, Math.min(maxPanY, pan.y))
    };
  };

  // Mouse wheel zoom - strictly locked to min 1.0 (100%) to prevent black borders
  const handleWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    e.preventDefault();
    setMapZoom(prev => {
      const next = e.deltaY < 0
        ? Math.min(4.0, parseFloat((prev + 0.15).toFixed(2)))
        : Math.max(1.0, parseFloat((prev - 0.15).toFixed(2)));
      if (next <= 1) {
        setMapPan({ x: 0, y: 0 });
      } else {
        setMapPan(p => clampPan(p, next));
      }
      return next;
    });
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (mapZoom <= 1) return;
    setIsDraggingMap(true);
    dragStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      panX: mapPan.x,
      panY: mapPan.y
    };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDraggingMap || mapZoom <= 1) return;
    const dx = e.clientX - dragStartRef.current.x;
    const dy = e.clientY - dragStartRef.current.y;
    setMapPan(clampPan({
      x: dragStartRef.current.panX + dx,
      y: dragStartRef.current.panY + dy
    }, mapZoom));
  };

  const handleMouseUp = () => setIsDraggingMap(false);
  
  // Map pin limit & pagination states for 500+ items performance
  const [mapPinLimit, setMapPinLimit] = useState<number>(75);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(25);

  const mapContainerRef = useRef<HTMLDivElement>(null);

  // Filter jobs for dashboard
  const filteredJobs = useMemo(() => {
    return jobs.filter(job => {
      const matchesPlant = selectedPlant === 'All' || job.plant === selectedPlant;
      const matchesPriority = selectedPriority === 'All' || job.priority === selectedPriority;
      const matchesDate = selectedDate === 'All' || job.date === selectedDate;
      const matchesStatus = selectedStatus === 'All' || job.status === selectedStatus;
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch = !q || 
        job.jobNo.toLowerCase().includes(q) ||
        job.description.toLowerCase().includes(q) ||
        job.contractor.toLowerCase().includes(q) ||
        job.plant.toLowerCase().includes(q) ||
        job.area.toLowerCase().includes(q) ||
        job.requester.toLowerCase().includes(q);

      return matchesPlant && matchesPriority && matchesDate && matchesStatus && matchesSearch;
    });
  }, [jobs, selectedPlant, selectedPriority, selectedDate, selectedStatus, searchQuery]);

  // Reset pagination when filter changes
  const handleFilterChange = (setter: React.Dispatch<React.SetStateAction<string>>, value: string) => {
    setter(value);
    setCurrentPage(1);
  };

  // Pagination calculation
  const totalPages = pageSize === -1 ? 1 : Math.max(1, Math.ceil(filteredJobs.length / pageSize));
  const paginatedJobs = useMemo(() => {
    if (pageSize === -1) return filteredJobs;
    const start = (currentPage - 1) * pageSize;
    return filteredJobs.slice(start, start + pageSize);
  }, [filteredJobs, currentPage, pageSize]);

  // Unique plants & dates for filter dropdowns
  const uniquePlants = useMemo(() => Array.from(new Set(jobs.map(j => j.plant))).sort(), [jobs]);
  const uniqueDates = useMemo(() => Array.from(new Set(jobs.map(j => j.date))).sort(), [jobs]);

  // Jobs scoped by active plant filter
  const plantScopedJobs = useMemo(() => {
    if (!selectedPlant || selectedPlant === 'All') return jobs;
    return jobs.filter(j => j.plant === selectedPlant);
  }, [jobs, selectedPlant]);

  // Summary counts scoped dynamically by plant
  const totalRequests = plantScopedJobs.length;
  const pendingCount = plantScopedJobs.filter(j => j.status === 'Pending Review').length;
  const optimizedCount = plantScopedJobs.filter(j => j.status === 'Optimized').length;
  const assignedCount = plantScopedJobs.filter(j => j.status === 'Assigned').length;
  const rejectedCount = plantScopedJobs.filter(j => j.status === 'Rejected').length;

  const totalLoadTons = useMemo(() => {
    return plantScopedJobs
      .filter(j => j.status === 'Assigned' || j.status === 'Optimized')
      .reduce((acc, curr) => acc + curr.loadWeightTon, 0);
  }, [plantScopedJobs]);

  const availableFleetCount = useMemo(() => {
    if (!selectedPlant || selectedPlant === 'All') return equipment.filter(e => e.status === 'Available').length;
    return equipment.filter(e => e.status === 'Available' && ((e as any).plant === selectedPlant || (e as any).homePlant === selectedPlant || (e as any).homePlant === 'All')).length;
  }, [equipment, selectedPlant]);

  // Selected pins to render on plot map
  const mapPinsToRender = useMemo(() => {
    if (mapPinLimit === -1) return filteredJobs;
    const base = filteredJobs.slice(0, mapPinLimit);
    if (activePinJob && !base.some(j => j.id === activePinJob.id)) {
      return [activePinJob, ...base];
    }
    return base;
  }, [filteredJobs, mapPinLimit, activePinJob]);

  // Export Planning List to CSV (exports all filtered 500+ records)
  const handleExportCSV = () => {
    const headers = [
      'Job No', 'Status', 'Plant', 'Area', 'Description', 'Equipment Type',
      'Load (Tons)', 'Radius (m)', 'Elevation (m)', 'Date', 'Start Time', 'End Time', 
      'Contractor', 'Requester', 'Assigned Crane', 'Priority', 'Reject Reason', 'Notes'
    ];

    const rows = filteredJobs.map(j => [
      `"${j.jobNo}"`,
      `"${j.status}"`,
      `"${j.plant}"`,
      `"${j.area}"`,
      `"${j.description.replace(/"/g, '""')}"`,
      `"${j.type}"`,
      j.loadWeightTon,
      j.requiredRadiusM,
      j.elevationM,
      `"${j.date}"`,
      `"${j.startTime}"`,
      `"${j.endTime}"`,
      `"${j.contractor}"`,
      `"${j.requester}"`,
      `"${j.assignedCraneName || 'Unassigned'}"`,
      `"${j.priority}"`,
      `"${(j.rejectReason || '').replace(/"/g, '""')}"`,
      `"${(j.notes || '').replace(/"/g, '""')}"`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Planning_Requests_500plus_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    setExportNotice(
      isTh 
        ? `ส่งออกข้อมูลคำขอ ${filteredJobs.length} รายการเป็นไฟล์ CSV เรียบร้อยแล้ว!` 
        : `Successfully exported ${filteredJobs.length} planning requests to CSV!`
    );
    setTimeout(() => setExportNotice(null), 4000);
  };

  const handleLocateOnMap = (job: PlanningJobItem) => {
    setActivePinJob(job);
    if (mapContainerRef.current) {
      mapContainerRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Executive Sub-View Navigation Switcher (when accessed in Executive Suite) */}
      {onNavigateToExecutiveView && (
        <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-3 flex-wrap">
          <button
            type="button"
            onClick={() => onNavigateToExecutiveView('executive-dashboard')}
            className="px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-750 border border-slate-200 dark:border-slate-700"
          >
            <TrendingUp size={15} />
            <span>{isTh ? 'ภาพรวมการส่งมอบระบบ' : 'Turnover Overview'}</span>
          </button>

          <button
            type="button"
            onClick={() => onNavigateToExecutiveView('executive-critical-path')}
            className="px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-750 border border-slate-200 dark:border-slate-700"
          >
            <AlertOctagon size={15} className="text-amber-500" />
            <span>{isTh ? 'เส้นทางวิกฤต & Punch List' : 'Critical Path & Punch List'}</span>
          </button>

          <button
            type="button"
            onClick={() => onNavigateToExecutiveView('executive-unit-funnel')}
            className="px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-750 border border-slate-200 dark:border-slate-700"
          >
            <Building2 size={15} />
            <span>{isTh ? 'ความพร้อมแยกตามหน่วยผลิต' : 'Unit Readiness Funnel'}</span>
          </button>

          <button
            type="button"
            onClick={() => isScaffolding && onNavigateToExecutiveView('planning-dashboard')}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
              !isScaffolding
                ? 'bg-blue-600 text-white shadow-md shadow-blue-600/25 ring-2 ring-blue-500/30'
                : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-750 border border-slate-200 dark:border-slate-700'
            }`}
          >
            <MapPin size={15} className={!isScaffolding ? 'text-white' : 'text-blue-500'} />
            <span>{isTh ? 'วางแผนเครื่องจักร & ผังมาร์คกิ้ง' : 'Equipment Planning & Site Marking'}</span>
          </button>

          <button
            type="button"
            onClick={() => !isScaffolding && onNavigateToExecutiveView('scaffold-planning-dashboard')}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
              isScaffolding
                ? 'bg-orange-600 text-white shadow-md shadow-orange-600/25 ring-2 ring-orange-500/30'
                : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-750 border border-slate-200 dark:border-slate-700'
            }`}
          >
            <Layers size={15} className={isScaffolding ? 'text-white' : 'text-orange-500'} />
            <span>{isTh ? 'วางแผนงานนั่งร้าน' : 'Scaffolding Planning'}</span>
          </button>
        </div>
      )}

      {/* Top Banner / Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider ${
              isScaffolding
                ? 'bg-orange-100 text-orange-800 dark:bg-orange-950/60 dark:text-orange-400'
                : 'bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-400'
            }`}>
              {isScaffolding ? 'SCAFFOLDING PLANNING PHASE' : 'EQUIPMENT PLANNING & SITE MARKING'}
            </span>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-black tracking-wider bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-400">
              500+ REQUESTS READY ({totalRequests} TOTAL)
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white mt-1">
            {isTh 
              ? (isScaffolding ? 'แดชบอร์ดวางแผนงานนั่งร้านและผังพื้นที่ (SF04 Planning Phase)' : 'แดชบอร์ดวางแผนงานยกและผังมาร์คกิ้งหน้างาน (Equipment Planning & Site Marking)')
              : (isScaffolding ? 'Scaffolding Planning Dashboard (SF04 Planning Phase)' : 'Equipment Planning Dashboard & Site Marking')}
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            {isTh
              ? (isScaffolding 
                  ? 'ระบบวิเคราะห์คำขอนั่งร้าน วางแผนโหลดความจุและผังมาร์คกิ้งตำแหน่งติดตั้งทั่วทั้งโรงกลั่น'
                  : 'ระบบวิเคราะห์คำขอใช้งานมากกว่า 500 รายการ จัดสรรเครนคำนวณ Load Chart อัตโนมัติ พร้อมผังแปลงตำแหน่งหน้างาน')
              : (isScaffolding
                  ? 'Interactive scaffolding zone allocation, capacity planning, and site marking across refinery units.'
                  : 'Interactive site marking, spatial collision checks, and rule-based fleet assignment for over 500 industrial lifting requests.')}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={handleExportCSV}
            className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-2 transition-all shadow-md shadow-emerald-900/20 active:scale-95 cursor-pointer"
            title="Export full filtered dataset to CSV"
          >
            <Download size={15} />
            <span>{isTh ? `ส่งออก CSV (${filteredJobs.length})` : `Export CSV (${filteredJobs.length})`}</span>
          </button>

          {onNavigateToOptimize && (
            <button
              onClick={onNavigateToOptimize}
              className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center gap-2 transition-all shadow-md shadow-blue-900/20 active:scale-95 cursor-pointer"
            >
              <Sparkles size={15} />
              <span>{isTh ? 'เปิดหน้า Review & Optimize' : 'Review & Optimize'}</span>
            </button>
          )}

          {!isScaffolding && onNavigateToExecutiveView && (
            <button
              onClick={() => onNavigateToExecutiveView('executive-dashboard')}
              className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold flex items-center gap-2 transition-all shadow-md shadow-indigo-900/20 active:scale-95 cursor-pointer"
            >
              <TrendingUp size={15} />
              <span>{isTh ? 'ภาพรวมการส่งมอบ' : 'Turnover Overview'}</span>
            </button>
          )}
        </div>
      </div>

      {/* Export notification toast */}
      {exportNotice && (
        <div className="bg-emerald-500 text-white text-xs font-bold px-4 py-3 rounded-xl shadow-lg flex items-center justify-between animate-in slide-in-from-top-2">
          <span>{exportNotice}</span>
          <button onClick={() => setExportNotice(null)} className="text-white hover:opacity-80">✕</button>
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
            {selectedPlant === 'Phra Khanong' 
              ? (isTh ? 'พระโขนง (Phra Khanong)' : 'Phra Khanong')
              : selectedPlant === 'Sriracha' 
                ? (isTh ? 'ศรีราชา (Sriracha)' : 'Sriracha')
                : (isTh ? 'ทุกโรงงาน (All Plants)' : 'All Plants')}
          </span>
        </div>
        <span className="text-[11px] font-mono font-medium text-slate-500 dark:text-slate-400">
          {totalRequests} {isTh ? 'งานในแผน' : 'planned requests'}
        </span>
      </div>

      {/* KPI Cards Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div 
          onClick={() => handleFilterChange(setSelectedStatus, 'All')}
          className={`p-4 rounded-xl border transition-all cursor-pointer ${
            selectedStatus === 'All' 
              ? 'bg-blue-50/70 border-blue-400 dark:bg-blue-950/40 dark:border-blue-700 ring-2 ring-blue-500/20' 
              : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-300'
          }`}
        >
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
            {isTh ? 'คำขอทั้งหมด' : 'Total Requests'}
          </span>
          <p className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white mt-1 font-mono">
            {totalRequests}
          </p>
          <span className="text-[10px] text-blue-500 font-bold block mt-0.5">500+ Dataset</span>
        </div>

        <div 
          onClick={() => handleFilterChange(setSelectedStatus, 'Pending Review')}
          className={`p-4 rounded-xl border transition-all cursor-pointer ${
            selectedStatus === 'Pending Review' 
              ? 'bg-amber-50/70 border-amber-400 dark:bg-amber-950/40 dark:border-amber-700 ring-2 ring-amber-500/20' 
              : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-300'
          }`}
        >
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
            {isTh ? 'รอการพิจารณา' : 'Pending Review'}
          </span>
          <p className="text-xl sm:text-2xl font-black text-amber-500 mt-1 font-mono">
            {pendingCount}
          </p>
          <span className="text-[10px] text-slate-400 block mt-0.5">
            {((pendingCount / totalRequests) * 100).toFixed(0)}% of pipeline
          </span>
        </div>

        <div 
          onClick={() => handleFilterChange(setSelectedStatus, 'Optimized')}
          className={`p-4 rounded-xl border transition-all cursor-pointer ${
            selectedStatus === 'Optimized' 
              ? 'bg-indigo-50/70 border-indigo-400 dark:bg-indigo-950/40 dark:border-indigo-700 ring-2 ring-indigo-500/20' 
              : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-300'
          }`}
        >
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
            {isTh ? 'จัดสรรแล้ว (รออนุมัติ)' : 'AI Optimized'}
          </span>
          <p className="text-xl sm:text-2xl font-black text-indigo-500 mt-1 font-mono">
            {optimizedCount}
          </p>
          <span className="text-[10px] text-slate-400 block mt-0.5">Fleet Matched</span>
        </div>

        <div 
          onClick={() => handleFilterChange(setSelectedStatus, 'Assigned')}
          className={`p-4 rounded-xl border transition-all cursor-pointer ${
            selectedStatus === 'Assigned' 
              ? 'bg-emerald-50/70 border-emerald-400 dark:bg-emerald-950/40 dark:border-emerald-700 ring-2 ring-emerald-500/20' 
              : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-300'
          }`}
        >
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
            {isTh ? 'ยืนยันจัดสรรแล้ว' : 'Assigned & Locked'}
          </span>
          <p className="text-xl sm:text-2xl font-black text-emerald-500 mt-1 font-mono">
            {assignedCount}
          </p>
          <span className="text-[10px] text-slate-400 block mt-0.5">Ready for Lift</span>
        </div>

        <div 
          onClick={() => handleFilterChange(setSelectedStatus, 'Rejected')}
          className={`p-4 rounded-xl border transition-all cursor-pointer ${
            selectedStatus === 'Rejected' 
              ? 'bg-red-50/70 border-red-400 dark:bg-red-950/40 dark:border-red-700 ring-2 ring-red-500/20' 
              : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-300'
          }`}
        >
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
            {isTh ? 'ไม่อนุมัติ / ปฏิเสธ' : 'Rejected'}
          </span>
          <p className="text-xl sm:text-2xl font-black text-red-500 mt-1 font-mono">
            {rejectedCount}
          </p>
          <span className="text-[10px] text-slate-400 block mt-0.5">Action Required</span>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
            {isTh ? 'น้ำหนักยกรวม' : 'Planned Lift Weight'}
          </span>
          <p className="text-xl sm:text-2xl font-black text-blue-600 dark:text-blue-400 mt-1 font-mono">
            {totalLoadTons.toLocaleString()} <span className="text-xs font-normal">T</span>
          </p>
          <span className="text-[10px] text-slate-400 block mt-0.5">
            Fleet: {availableFleetCount}/{equipment.length} Avail
          </span>
        </div>
      </div>

      {/* Interactive 2D Plot Map with Site Marking Pins */}
      <div 
        ref={mapContainerRef}
        className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden flex flex-col"
      >
        <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
              <MapPin size={16} className="text-blue-500" />
              <span>{isTh ? 'ผังมาร์คกิ้งตำแหน่งหน้างาน (Site Marking Plot Plan)' : 'Site Marking 2D Spatial Plot Plan'}</span>
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              {isTh 
                ? `แสดงหมุดตำแหน่งหน้างาน ${mapPinsToRender.length} จุด (จากทั้งหมด ${filteredJobs.length} รายการที่ตรงกับตัวกรอง)`
                : `Showing ${mapPinsToRender.length} pins on plot plan (from ${filteredJobs.length} filtered requests)`}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Density Selector */}
            <div className="flex items-center gap-1.5 text-xs text-slate-500 bg-slate-100 dark:bg-slate-800 p-1 rounded-lg">
              <span className="text-[10px] font-bold px-1.5">{isTh ? 'หมุดบนผัง:' : 'Pins:'}</span>
              <button
                onClick={() => setMapPinLimit(75)}
                className={`px-2 py-0.5 rounded text-[11px] font-bold transition-colors ${
                  mapPinLimit === 75 ? 'bg-white dark:bg-slate-700 text-blue-600 shadow-sm' : 'hover:text-slate-900'
                }`}
              >
                Top 75
              </button>
              <button
                onClick={() => setMapPinLimit(150)}
                className={`px-2 py-0.5 rounded text-[11px] font-bold transition-colors ${
                  mapPinLimit === 150 ? 'bg-white dark:bg-slate-700 text-blue-600 shadow-sm' : 'hover:text-slate-900'
                }`}
              >
                Top 150
              </button>
              <button
                onClick={() => setMapPinLimit(-1)}
                className={`px-2 py-0.5 rounded text-[11px] font-bold transition-colors ${
                  mapPinLimit === -1 ? 'bg-white dark:bg-slate-700 text-blue-600 shadow-sm' : 'hover:text-slate-900'
                }`}
              >
                {isTh ? `ทั้งหมด (${filteredJobs.length})` : `All (${filteredJobs.length})`}
              </button>
            </div>

            {/* Map Controls */}
            <div className="flex items-center gap-2">
              <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-1 rounded-lg border border-slate-200 dark:border-slate-700">
                <button
                  type="button"
                  onClick={() => setGlobalThemeGate(true)}
                  className={`px-2 py-1 rounded text-[10px] font-bold transition-all cursor-pointer ${
                    isGlobalDark
                      ? 'bg-cyan-500/20 text-cyan-600 dark:text-cyan-400 border border-cyan-500/40'
                      : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  Dark Blueprint
                </button>
                <button
                  type="button"
                  onClick={() => setGlobalThemeGate(false)}
                  className={`px-2 py-1 rounded text-[10px] font-bold transition-all cursor-pointer ${
                    !isGlobalDark
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  Paper CAD
                </button>
              </div>
              <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-lg">
              <button 
                onClick={() => setMapZoom(prev => {
                  const next = Math.max(1.0, parseFloat((prev - 0.2).toFixed(2)));
                  if (next <= 1) setMapPan({ x: 0, y: 0 });
                  else setMapPan(p => clampPan(p, next));
                  return next;
                })}
                className="p-1.5 hover:bg-white dark:hover:bg-slate-700 rounded text-slate-600 dark:text-slate-300"
                title="Zoom Out (ขยายออกนอกพื้นที่ - Lock ไม่ให้มีขอบดำ)"
              >
                <ZoomOut size={14} />
              </button>
              <span className="font-mono text-xs text-slate-500 dark:text-slate-400 px-1 font-bold min-w-[36px] text-center">
                {Math.round(mapZoom * 100)}%
              </span>
              <button 
                onClick={() => setMapZoom(prev => {
                  const next = Math.min(4.0, parseFloat((prev + 0.2).toFixed(2)));
                  setMapPan(p => clampPan(p, next));
                  return next;
                })}
                className="p-1.5 hover:bg-white dark:hover:bg-slate-700 rounded text-slate-600 dark:text-slate-300"
                title="Zoom In (ซูมเข้าดูรายละเอียด)"
              >
                <ZoomIn size={14} />
              </button>
              <button 
                onClick={() => {
                  setMapZoom(1);
                  setMapPan({ x: 0, y: 0 });
                }}
                className="p-1.5 hover:bg-white dark:hover:bg-slate-700 rounded text-slate-600 dark:text-slate-300 text-[10px] font-bold"
                title="Reset Zoom (100% Lock to Frame)"
              >
                1:1
              </button>
              <button 
                onClick={() => {
                  setMapZoom(1);
                  setMapPan({ x: 0, y: 0 });
                }}
                className="px-2 py-1 hover:bg-white dark:hover:bg-slate-700 rounded text-slate-600 dark:text-slate-300 text-[10px] font-bold"
                title="Lock Plot Plan to Screen (ล็อคขนาดตามรูปไม่มีขอบดำ)"
              >
                Fit
              </button>
              </div>
            </div>
          </div>
        </div>

        {/* Map Canvas */}
        <div 
          ref={mapContainerRef}
          onWheel={handleWheel}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          className={`relative w-full h-[460px] overflow-hidden select-none transition-colors duration-300 ${
            isGlobalDark ? 'bg-slate-950' : 'bg-[#f4f7fb]'
          } ${
            mapZoom > 1 ? (isDraggingMap ? 'cursor-grabbing' : 'cursor-grab') : 'cursor-default'
          }`}
        >
          {/* Zoomable & Pannable Master Wrapper */}
          <div 
            className="absolute inset-0 transition-transform duration-100 ease-out origin-center"
            style={{ 
              transform: `translate(${mapPan.x}px, ${mapPan.y}px) scale(${mapZoom})`, 
              transformOrigin: 'center center' 
            }}
          >
            {/* Authentic Master Plot Plan Background - object-cover with locked borders */}
            <div className="absolute inset-0 pointer-events-none select-none overflow-hidden flex items-center justify-center">
              <img 
                src={essoPlotPlanBg} 
                alt="Master Plot Plan" 
                className={`w-full h-full object-cover pointer-events-none select-none transition-all duration-300 ${
                  isGlobalDark
                    ? 'filter invert hue-rotate-180 brightness-[0.78] contrast-[1.25] opacity-55'
                    : 'opacity-85 mix-blend-multiply'
                }`}
              />
            </div>

            {/* Blueprint Grid Background */}
            <div 
              className="absolute inset-0 opacity-20 pointer-events-none"
              style={{
                backgroundImage: isGlobalDark
                  ? 'linear-gradient(#38bdf8 1px, transparent 1px), linear-gradient(90deg, #38bdf8 1px, transparent 1px)'
                  : 'linear-gradient(#64748b 1px, transparent 1px), linear-gradient(90deg, #64748b 1px, transparent 1px)',
                backgroundSize: '40px 40px'
              }}
            />

            {/* Plant Sector Overlay Zones */}
            <div className="absolute inset-0 p-8 grid grid-cols-4 grid-rows-3 gap-6 pointer-events-none">
            <div className="border border-dashed border-emerald-500/30 rounded-lg flex items-center justify-center text-[10px] font-mono text-emerald-400/80 bg-emerald-950/10">
              UNIT 3 FLARE & PROCESS
            </div>
            <div className="border border-dashed border-blue-500/30 rounded-lg flex items-center justify-center text-[10px] font-mono text-blue-400/80 bg-blue-950/10">
              STORAGE YARD B & SPOOL RACK
            </div>
            <div className="border border-dashed border-purple-500/30 rounded-lg flex items-center justify-center text-[10px] font-mono text-purple-400/80 bg-purple-950/10">
              HYDROCRACKING UNIT (HCU-1)
            </div>
            <div className="border border-dashed border-amber-500/30 rounded-lg flex items-center justify-center text-[10px] font-mono text-amber-400/80 bg-amber-950/10">
              TANK FARM SECTOR A
            </div>
            <div className="border border-dashed border-indigo-500/30 rounded-lg flex items-center justify-center text-[10px] font-mono text-indigo-400/80 bg-indigo-950/10">
              ZONE C - REACTOR FOUNDATION
            </div>
            <div className="border border-dashed border-cyan-500/30 rounded-lg flex items-center justify-center text-[10px] font-mono text-cyan-400/80 bg-cyan-950/10">
              WORKSHOP & FABRICATION BAY
            </div>
            <div className="border border-dashed border-slate-500/30 rounded-lg flex items-center justify-center text-[10px] font-mono text-slate-400/80 bg-slate-900/10">
              MARINE TERMINAL JETTY
            </div>
            <div className="border border-dashed border-rose-500/30 rounded-lg flex items-center justify-center text-[10px] font-mono text-rose-400/80 bg-rose-950/10">
              COGEN POWER & TRANSFORMER
            </div>
            <div className="border border-dashed border-teal-500/30 rounded-lg flex items-center justify-center text-[10px] font-mono text-teal-400/80 bg-teal-950/10">
              GAS SEPARATION (GSP)
            </div>
            <div className="border border-dashed border-orange-500/30 rounded-lg flex items-center justify-center text-[10px] font-mono text-orange-400/80 bg-orange-950/10">
              REFORMING UNIT (CRU)
            </div>
            <div className="border border-dashed border-violet-500/30 rounded-lg flex items-center justify-center text-[10px] font-mono text-violet-400/80 bg-violet-950/10">
              WASTEWATER TREATMENT
            </div>
            <div className="border border-dashed border-slate-500/30 rounded-lg flex items-center justify-center text-[10px] font-mono text-slate-400/80 bg-slate-900/10">
              MAIN GATE & SECURITY POST
            </div>
          </div>

          {/* Interactive Job Pins (Inherits Master Zoom & Pan) */}
          <div className="absolute inset-0">
            {mapPinsToRender.map(job => {
              const isActive = activePinJob?.id === job.id;
              const isRejected = job.status === 'Rejected';
              const isAssigned = job.status === 'Assigned';
              const isOptimized = job.status === 'Optimized';

              return (
                <div
                  key={job.id}
                  style={{
                    left: `${job.markingLocation.x}%`,
                    top: `${job.markingLocation.y}%`,
                    transform: 'translate(-50%, -50%)'
                  }}
                  onClick={() => setActivePinJob(job)}
                  className="absolute cursor-pointer z-10 group/pin"
                >
                  {/* Operating Radius Bubble on Active Pin */}
                  {isActive && (
                    <div
                      className="absolute rounded-full border-2 border-dashed pointer-events-none -translate-x-1/2 -translate-y-1/2 animate-pulse"
                      style={{
                        width: `${Math.max(70, job.requiredRadiusM * 3.5)}px`,
                        height: `${Math.max(70, job.requiredRadiusM * 3.5)}px`,
                        left: '50%',
                        top: '50%',
                        borderColor: isRejected ? '#ef4444' : isAssigned ? '#10b981' : isOptimized ? '#6366f1' : '#f59e0b',
                        backgroundColor: isRejected ? 'rgba(239, 68, 68, 0.12)' : isAssigned ? 'rgba(16, 185, 129, 0.12)' : 'rgba(99, 102, 241, 0.12)'
                      }}
                    />
                  )}

                  {/* Marker Pin Icon */}
                  <div className={`flex items-center justify-center w-7 h-7 rounded-full shadow-lg transition-transform ${
                    isActive ? 'scale-125 ring-4 ring-white z-30' : 'hover:scale-115'
                  } ${
                    isRejected ? 'bg-red-600 text-white' :
                    isAssigned ? 'bg-emerald-600 text-white' :
                    isOptimized ? 'bg-indigo-600 text-white' :
                    'bg-amber-500 text-white'
                  }`}>
                    {isRejected ? <XCircle size={14} /> :
                     isAssigned ? <CheckCircle size={14} /> :
                     isOptimized ? <Sparkles size={14} /> :
                     <HardHat size={14} />}
                  </div>

                  {/* Pin Tooltip Tag on hover or active */}
                  <div className={`absolute top-8 left-1/2 -translate-x-1/2 whitespace-nowrap bg-slate-900/95 text-white px-2 py-0.5 rounded text-[9px] font-bold shadow-md border border-slate-700 pointer-events-none ${
                    isActive ? 'block z-30 ring-1 ring-blue-400' : 'hidden group-hover/pin:block z-20'
                  }`}>
                    {job.jobNo} ({job.loadWeightTon}T)
                  </div>
                </div>
              );
            })}
          </div>
        </div>

          {/* Active Pin Detailed Overlay Drawer */}
          {activePinJob && (
            <div className="absolute bottom-4 left-4 right-4 sm:right-auto sm:w-96 bg-slate-900/95 backdrop-blur-md border border-slate-700 text-white p-4 rounded-xl shadow-2xl z-20 animate-in slide-in-from-bottom-3 duration-200">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold text-blue-400">{activePinJob.jobNo}</span>
                    <span className={`text-[9px] px-2 py-0.5 rounded font-bold uppercase ${
                      activePinJob.status === 'Assigned' ? 'bg-emerald-950 text-emerald-300 border border-emerald-800' :
                      activePinJob.status === 'Rejected' ? 'bg-red-950 text-red-300 border border-red-800' :
                      activePinJob.status === 'Optimized' ? 'bg-indigo-950 text-indigo-300 border border-indigo-800' :
                      'bg-amber-950 text-amber-300 border border-amber-800'
                    }`}>
                      {activePinJob.status}
                    </span>
                  </div>
                  <h4 className="text-xs font-bold text-white mt-1 line-clamp-2">{activePinJob.description}</h4>
                  <p className="text-[11px] text-slate-400 mt-0.5">{activePinJob.plant} • {activePinJob.area}</p>
                </div>
                <button 
                  onClick={() => setActivePinJob(null)}
                  className="text-slate-400 hover:text-white p-1"
                >
                  <XCircle size={16} />
                </button>
              </div>

              <div className="grid grid-cols-3 gap-2 mt-3 pt-3 border-t border-slate-800 text-[11px]">
                <div>
                  <span className="text-[10px] text-slate-400 block">{isTh ? 'น้ำหนัก' : 'Load'}</span>
                  <strong className="text-white font-mono">{activePinJob.loadWeightTon} Ton</strong>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block">{isTh ? 'รัศมี' : 'Radius'}</span>
                  <strong className="text-white font-mono">{activePinJob.requiredRadiusM} m</strong>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block">{isTh ? 'ความสูง' : 'Elev'}</span>
                  <strong className="text-white font-mono">{activePinJob.elevationM} m</strong>
                </div>
              </div>

              {activePinJob.assignedCraneName && (
                <div className="mt-2 text-[11px] text-emerald-300 font-semibold bg-emerald-950/40 p-2 rounded border border-emerald-800/40 flex items-center gap-1.5">
                  <HardHat size={13} className="shrink-0" />
                  <span>{isTh ? 'เครนที่จัดสรร: ' : 'Assigned: '}{activePinJob.assignedCraneName}</span>
                </div>
              )}

              {activePinJob.rejectReason && (
                <div className="mt-2 text-[11px] text-red-300 bg-red-950/40 p-2 rounded border border-red-800/40">
                  <strong>{isTh ? 'เหตุผลที่ปฏิเสธ: ' : 'Reject Reason: '}</strong>{activePinJob.rejectReason}
                </div>
              )}

              <div className="mt-3 flex items-center gap-2">
                {onSelectJobForReview && (
                  <button
                    onClick={() => onSelectJobForReview(activePinJob)}
                    className="flex-1 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition-colors cursor-pointer text-center"
                  >
                    {isTh ? 'เปิดตรวจใน Review & Optimize' : 'Open in Review & Optimize'}
                  </button>
                )}
                <button
                  onClick={() => setActivePinJob(null)}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-semibold cursor-pointer"
                >
                  {isTh ? 'ปิด' : 'Close'}
                </button>
              </div>
            </div>
          )}

          {/* Map Status Legend */}
          <div className="absolute top-4 right-4 bg-slate-900/90 backdrop-blur-md border border-slate-800 text-white p-3 rounded-xl text-[10px] space-y-1.5 z-10 hidden sm:block">
            <span className="font-bold uppercase tracking-wider text-slate-400 block mb-1">
              {isTh ? 'คำอธิบายสัญลักษณ์' : 'Status Legend'}
            </span>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
              <span>Pending Review ({pendingCount})</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-indigo-500"></span>
              <span>Optimized ({optimizedCount})</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
              <span>Assigned ({assignedCount})</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-red-500"></span>
              <span>Rejected ({rejectedCount})</span>
            </div>
          </div>
        </div>
      </div>

      {/* Filterable Planning Requests Table (500+ items with pagination) */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden flex flex-col">
        {/* Table Filters Strip */}
        <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
              <FileSpreadsheet size={16} className="text-blue-500" />
              <span>{isTh ? 'ทะเบียนคำขอวางแผนงานยก' : 'Planning Request Registry'}</span>
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-400 font-black">
                {filteredJobs.length} {isTh ? 'รายการ' : 'requests'}
              </span>
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              {isTh 
                ? 'ค้นหา กรอง และจัดสรรคำขอใช้งานเครนจากฐานข้อมูลมากกว่า 500 รายการ' 
                : 'Search, filter, and review lifting requests from the comprehensive 500+ database'}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {/* Search */}
            <div className="relative w-full sm:w-56">
              <input
                type="text"
                value={searchQuery}
                onChange={e => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1);
                }}
                placeholder={isTh ? 'ค้นหา Job No, พื้นที่, งาน...' : 'Search Job No, plant, desc...'}
                className="w-full pl-8 pr-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <Search size={14} className="absolute left-2.5 top-2 text-slate-400" />
            </div>

            {/* Status Dropdown */}
            <select
              value={selectedStatus}
              onChange={e => handleFilterChange(setSelectedStatus, e.target.value)}
              className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="All">{isTh ? 'ทุกสถานะ (All Status)' : 'All Statuses'}</option>
              <option value="Pending Review">Pending Review</option>
              <option value="Optimized">Optimized</option>
              <option value="Assigned">Assigned</option>
              <option value="Rejected">Rejected</option>
            </select>

            {/* Plant Dropdown */}
            <select
              value={selectedPlant}
              onChange={e => handleFilterChange(setSelectedPlant, e.target.value)}
              className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="All">{isTh ? 'ทุกโรงงาน (All Plants)' : 'All Plants'}</option>
              {uniquePlants.map(p => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>

            {/* Priority Dropdown */}
            <select
              value={selectedPriority}
              onChange={e => handleFilterChange(setSelectedPriority, e.target.value)}
              className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="All">{isTh ? 'ทุกระดับความเร่งด่วน' : 'All Priorities'}</option>
              <option value="Critical">Critical</option>
              <option value="High">High</option>
              <option value="Medium">Medium</option>
              <option value="Low">Low</option>
            </select>

            {/* Date Dropdown */}
            <select
              value={selectedDate}
              onChange={e => handleFilterChange(setSelectedDate, e.target.value)}
              className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="All">{isTh ? 'ทุกวันที่ (All Dates)' : 'All Scheduled Dates'}</option>
              {uniqueDates.map(d => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Data Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-100 dark:border-slate-800 text-[10px] uppercase font-bold text-slate-400">
              <tr>
                <th className="p-3.5 pl-5">Job No</th>
                <th className="p-3.5">{isTh ? 'โรงงาน & พื้นที่' : 'Plant & Area'}</th>
                <th className="p-3.5">{isTh ? 'รายละเอียดงานยก' : 'Description'}</th>
                <th className="p-3.5">{isTh ? 'น้ำหนัก / รัศมี' : 'Load / Radius'}</th>
                <th className="p-3.5">{isTh ? 'วันเวลา' : 'Window'}</th>
                <th className="p-3.5">{isTh ? 'เครนที่จัดสรร' : 'Assigned Crane'}</th>
                <th className="p-3.5">{isTh ? 'สถานะ' : 'Status'}</th>
                <th className="p-3.5 pr-5 text-right">{isTh ? 'การจัดการ' : 'Actions'}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {paginatedJobs.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-12 text-center text-slate-400">
                    <p className="text-sm font-semibold">{isTh ? 'ไม่พบคำขอตามเงื่อนไขที่เลือก' : 'No planning requests match your filter criteria.'}</p>
                    <button 
                      onClick={() => {
                        setSelectedPlant('All');
                        setSelectedPriority('All');
                        setSelectedDate('All');
                        setSelectedStatus('All');
                        setSearchQuery('');
                        setCurrentPage(1);
                      }}
                      className="mt-2 text-xs font-bold text-blue-600 hover:underline"
                    >
                      {isTh ? 'ล้างตัวกรองทั้งหมด' : 'Clear all filters'}
                    </button>
                  </td>
                </tr>
              ) : (
                paginatedJobs.map(job => (
                  <tr 
                    key={job.id} 
                    className={`hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors ${
                      activePinJob?.id === job.id ? 'bg-blue-50/40 dark:bg-blue-950/20' : ''
                    }`}
                  >
                    <td className="p-3.5 pl-5 font-mono font-bold text-slate-900 dark:text-slate-100">
                      <div className="flex items-center gap-1.5">
                        <span>{job.jobNo}</span>
                        <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold ${
                          job.priority === 'Critical' ? 'bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-400' :
                          job.priority === 'High' ? 'bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400' :
                          'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                        }`}>
                          {job.priority}
                        </span>
                      </div>
                      <span className="text-[10px] text-slate-400 font-normal block mt-0.5">{job.type}</span>
                    </td>
                    <td className="p-3.5 text-slate-600 dark:text-slate-300">
                      <div className="font-semibold text-slate-900 dark:text-white">{job.plant}</div>
                      <div className="text-[11px] text-slate-400">{job.area}</div>
                    </td>
                    <td className="p-3.5 max-w-xs">
                      <p className="line-clamp-2 text-slate-800 dark:text-slate-200 font-medium">{job.description}</p>
                      <span className="text-[10px] text-slate-400 block mt-0.5">
                        {isTh ? 'ผู้ขอ: ' : 'Req: '}{job.requester} • {job.contractor}
                      </span>
                    </td>
                    <td className="p-3.5 font-mono font-semibold text-slate-700 dark:text-slate-300">
                      <div>{job.loadWeightTon} Ton</div>
                      <div className="text-[10px] text-slate-400">R: {job.requiredRadiusM}m | H: {job.elevationM}m</div>
                    </td>
                    <td className="p-3.5 text-slate-600 dark:text-slate-400 whitespace-nowrap">
                      <div className="font-semibold text-slate-800 dark:text-slate-200">{job.date}</div>
                      <div className="text-[10px] text-slate-400">{job.startTime} - {job.endTime}</div>
                    </td>
                    <td className="p-3.5">
                      {job.assignedCraneName ? (
                        <span className="text-emerald-700 dark:text-emerald-400 font-medium flex items-center gap-1">
                          <HardHat size={13} className="shrink-0 text-emerald-500" />
                          <span className="line-clamp-1">{job.assignedCraneName}</span>
                        </span>
                      ) : (
                        <span className="text-slate-400 italic text-[11px]">Unassigned</span>
                      )}
                    </td>
                    <td className="p-3.5">
                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                        job.status === 'Assigned' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400' :
                        job.status === 'Optimized' ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-400' :
                        job.status === 'Rejected' ? 'bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-400' :
                        'bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400'
                      }`}>
                        {job.status}
                      </span>
                    </td>
                    <td className="p-3.5 pr-5 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => handleLocateOnMap(job)}
                          className="px-2 py-1 bg-slate-100 hover:bg-blue-50 text-slate-600 hover:text-blue-600 dark:bg-slate-800 dark:hover:bg-blue-900/30 dark:text-slate-300 rounded font-semibold text-[11px] flex items-center gap-1 transition-colors cursor-pointer"
                          title="Locate pin on site marking plot"
                        >
                          <Crosshair size={12} />
                          <span>{isTh ? 'ดูหมุด' : 'Pin'}</span>
                        </button>
                        {onSelectJobForReview && (
                          <button
                            onClick={() => onSelectJobForReview(job)}
                            className="px-2.5 py-1 bg-blue-50 hover:bg-blue-100 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400 rounded font-bold text-xs transition-colors cursor-pointer"
                          >
                            {isTh ? 'ตรวจสอบ' : 'Review'}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Responsive Pagination Bar */}
        <div className="p-4 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <div className="flex items-center gap-2">
            <span>{isTh ? 'แสดงหน้าละ:' : 'Rows per page:'}</span>
            <select
              value={pageSize}
              onChange={e => {
                setPageSize(Number(e.target.value));
                setCurrentPage(1);
              }}
              className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded px-2 py-1 text-xs font-semibold text-slate-800 dark:text-slate-200"
            >
              <option value={15}>15</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
              <option value={-1}>{isTh ? 'ทั้งหมด (All)' : 'All'}</option>
            </select>
            <span className="ml-2 font-medium">
              {isTh 
                ? `แสดง ${(currentPage - 1) * (pageSize === -1 ? filteredJobs.length : pageSize) + 1} - ${Math.min(currentPage * (pageSize === -1 ? filteredJobs.length : pageSize), filteredJobs.length)} จากทั้งหมด ${filteredJobs.length} รายการ`
                : `Showing ${(currentPage - 1) * (pageSize === -1 ? filteredJobs.length : pageSize) + 1} to ${Math.min(currentPage * (pageSize === -1 ? filteredJobs.length : pageSize), filteredJobs.length)} of ${filteredJobs.length} requests`}
            </span>
          </div>

          {pageSize !== -1 && totalPages > 1 && (
            <div className="flex items-center gap-1">
              <button
                onClick={() => setCurrentPage(1)}
                disabled={currentPage === 1}
                className="p-1.5 rounded hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40 disabled:pointer-events-none"
                title="First Page"
              >
                <ChevronsLeft size={16} />
              </button>
              <button
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
                className="p-1.5 rounded hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40 disabled:pointer-events-none"
                title="Previous Page"
              >
                <ChevronLeft size={16} />
              </button>

              <span className="px-3 py-1 font-bold text-slate-800 dark:text-slate-200">
                {isTh ? `หน้า ${currentPage} จาก ${totalPages}` : `Page ${currentPage} of ${totalPages}`}
              </span>

              <button
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages}
                className="p-1.5 rounded hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40 disabled:pointer-events-none"
                title="Next Page"
              >
                <ChevronRight size={16} />
              </button>
              <button
                onClick={() => setCurrentPage(totalPages)}
                disabled={currentPage === totalPages}
                className="p-1.5 rounded hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40 disabled:pointer-events-none"
                title="Last Page"
              >
                <ChevronsRight size={16} />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
