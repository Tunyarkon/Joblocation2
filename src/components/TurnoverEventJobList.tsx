import React, { useState, useMemo, useEffect } from 'react';
import { 
  Calendar, Search, MapPin, AlertCircle, CheckCircle2, Clock, 
  ChevronLeft, ChevronRight, Eye, X, FileText, User, Plus, Download, 
  Sparkles, ShieldCheck, Tag, AlertTriangle, Filter, Check, ArrowRight, 
  Building2, Flame, Layers, ListChecks, ExternalLink, Zap, AlertOctagon,
  RefreshCw, Briefcase, ChevronDown, ChevronUp, CheckCircle, XCircle,
  Table as TableIcon, LayoutList, PenTool, CheckSquare, Printer, Share2, 
  UploadCloud, Copy, Edit3, Trash2
} from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { 
  usePlantTurnShared, 
  JobRecord, 
  PunchItem, 
  SignatureRecord 
} from '../context/PlantTurnSharedContext';
import BulkTurnoverJobIngestion from './bulk/BulkTurnoverJobIngestion';

interface TurnoverEventJobListProps {
  setActiveView?: (view: string) => void;
  globalPlantFilter?: 'All' | 'Phra Khanong' | 'Sriracha';
  onNavigateToCreate?: () => void;
  onNavigateToWorkspace?: (jobId: string) => void;
}

export default function TurnoverEventJobList({
  setActiveView,
  globalPlantFilter = 'All',
  onNavigateToCreate,
  onNavigateToWorkspace
}: TurnoverEventJobListProps) {
  const { isTh } = useLanguage();
  const { 
    jobs, 
    setSelectedJobId, 
    isJobCompleted, 
    isJobTurnoverBlocked, 
    createJob, 
    checkJobIdExists, 
    batchCreateJobs 
  } = usePlantTurnShared();

  // Search & Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [filterEvent, setFilterEvent] = useState('All');
  const [filterUnit, setFilterUnit] = useState('All');
  const [filterStatus, setFilterStatus] = useState('All');
  const [filterDiscipline, setFilterDiscipline] = useState('All');
  const [filterCriticalOnly, setFilterCriticalOnly] = useState(false);
  const [activeGateTab, setActiveGateTab] = useState<'All' | 'Gate1' | 'Gate2' | 'Gate3' | 'Gate4' | 'Critical'>('All');
  const [viewMode, setViewMode] = useState<'table' | 'cards'>('table');

  // Toast Notification
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  // =========================================================================
  // POPUP MODAL STATES
  // =========================================================================
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [createModalTab, setCreateModalTab] = useState<'single' | 'bulk'>('single');

  const [detailsModalJob, setDetailsModalJob] = useState<JobRecord | null>(null);
  const [detailsModalTab, setDetailsModalTab] = useState<'general' | 'signatures' | 'punches' | 'attachments'>('general');

  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [exportScope, setExportScope] = useState<'filtered' | 'all'>('filtered');
  const [exportFormat, setExportFormat] = useState<'csv' | 'json'>('csv');

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  // Single Job Creation Form State
  const [newJobId, setNewJobId] = useState('');
  const [newEventName, setNewEventName] = useState('Annual Turnaround 2026');
  const [newPlant, setNewPlant] = useState<'Phra Khanong' | 'Sriracha'>('Phra Khanong');
  const [newUnit, setNewUnit] = useState('APS-1 (Atmospheric Distillation Unit 1)');
  const [newSystem, setNewSystem] = useState('System-11 (Crude Feed & Desalter)');
  const [newWorkOrder, setNewWorkOrder] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newAssetTag, setNewAssetTag] = useState('');
  const [newEquipmentType, setNewEquipmentType] = useState('Static Equipment');
  const [newDiscipline, setNewDiscipline] = useState('M - Mechanical');
  const [newJobLead, setNewJobLead] = useState('นายสมชาย ใจมั่น (Lead Engineer)');
  const [newTargetStartDate, setNewTargetStartDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [newPlannedTurnoverDate, setNewPlannedTurnoverDate] = useState(() => new Date(Date.now() + 86400000 * 14).toISOString().slice(0, 10));
  const [newIsCriticalPath, setNewIsCriticalPath] = useState(false);

  // Real-time check if Job ID already exists
  const isNewJobIdDuplicate = useMemo(() => {
    if (!newJobId.trim()) return false;
    return checkJobIdExists(newJobId.trim());
  }, [newJobId, checkJobIdExists]);

  // Plant Scoped Jobs from Top Bar
  const plantScopedJobs = useMemo(() => {
    if (!globalPlantFilter || globalPlantFilter === 'All') return jobs;
    return jobs.filter(j => j.plant === globalPlantFilter);
  }, [jobs, globalPlantFilter]);

  // Unique Events & Units for dropdown filters
  const uniqueEvents = useMemo(() => {
    return Array.from(new Set(plantScopedJobs.map(j => j.eventName).filter(Boolean))).sort();
  }, [plantScopedJobs]);

  const uniqueUnits = useMemo(() => {
    return Array.from(new Set(plantScopedJobs.map(j => j.unit).filter(Boolean))).sort();
  }, [plantScopedJobs]);

  // Safe Progress & Gate Calculator for each job (Guarded against undefined arrays)
  const getJobProgressData = (job: JobRecord) => {
    const sigList = Array.isArray(job.signatures) ? job.signatures : [];
    const punchList = Array.isArray(job.punchList) ? job.punchList : [];

    const totalSigns = 3;
    const acceptSigns = sigList.filter(s => s.decision === 'Accept').length;
    const signProgress = Math.min(100, Math.round((acceptSigns / totalSigns) * 100));

    const totalPunches = punchList.length;
    const resolvedPunches = punchList.filter(p => p.status === 'Resolved' || p.status === 'Closed').length;
    const openPunches = totalPunches - resolvedPunches;
    const openCatA = punchList.filter(p => p.category === 'A' && p.status !== 'Resolved' && p.status !== 'Closed').length;
    const openCatB = punchList.filter(p => p.category === 'B' && p.status !== 'Resolved' && p.status !== 'Closed').length;
    
    const isDone = isJobCompleted(job);
    const blocker = isJobTurnoverBlocked(job.id);

    // Compute Overall Progress
    let overallProgress = 20; // Initiated
    if (acceptSigns > 0) overallProgress += 30;
    if (totalPunches === 0 || openPunches === 0) overallProgress += 30;
    else if (resolvedPunches > 0) overallProgress += Math.round((resolvedPunches / totalPunches) * 20);
    if (isDone) overallProgress = 100;
    else overallProgress = Math.min(95, overallProgress);

    // Lifecycle Gate Category
    let gate: 'Gate1' | 'Gate2' | 'Gate3' | 'Gate4' = 'Gate1';
    if (isDone) {
      gate = 'Gate4'; // Handed over
    } else if (openPunches > 0) {
      gate = 'Gate3'; // Punch clearing
    } else if (acceptSigns > 0) {
      gate = 'Gate2'; // In sign-off / execution
    } else {
      gate = 'Gate1'; // Planning / Initiated
    }

    return {
      signProgress,
      acceptSigns,
      totalSigns,
      totalPunches,
      resolvedPunches,
      openPunches,
      openCatA,
      openCatB,
      isDone,
      isBlocked: blocker.blocked,
      overallProgress,
      gate
    };
  };

  // KPI Statistics
  const stats = useMemo(() => {
    let gate1 = 0;
    let gate2 = 0;
    let gate3 = 0;
    let gate4 = 0;
    let critical = 0;
    let openPunchCount = 0;
    let openCatACount = 0;

    plantScopedJobs.forEach(job => {
      const data = getJobProgressData(job);
      if (data.gate === 'Gate1') gate1++;
      else if (data.gate === 'Gate2') gate2++;
      else if (data.gate === 'Gate3') gate3++;
      else if (data.gate === 'Gate4') gate4++;
      
      if (job.isCriticalPath) critical++;
      openPunchCount += data.openPunches;
      openCatACount += data.openCatA;
    });

    return {
      total: plantScopedJobs.length,
      gate1,
      gate2,
      gate3,
      gate4,
      critical,
      openPunchCount,
      openCatACount
    };
  }, [plantScopedJobs]);

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filterEvent, filterUnit, filterStatus, filterDiscipline, filterCriticalOnly, activeGateTab, globalPlantFilter]);

  // Filtered Jobs
  const filteredJobs = useMemo(() => {
    return plantScopedJobs.filter(job => {
      const q = searchTerm.toLowerCase().trim();
      const matchSearch = !q ||
        (job.jobNo || '').toLowerCase().includes(q) ||
        (job.workOrder || '').toLowerCase().includes(q) ||
        (job.eventName || '').toLowerCase().includes(q) ||
        (job.title || '').toLowerCase().includes(q) ||
        (job.unit || '').toLowerCase().includes(q) ||
        (job.system || '').toLowerCase().includes(q) ||
        (job.assetTag || '').toLowerCase().includes(q) ||
        (job.description || '').toLowerCase().includes(q);

      const matchEvent = filterEvent === 'All' || job.eventName === filterEvent;
      const matchUnit = filterUnit === 'All' || job.unit === filterUnit;
      const matchDiscipline = filterDiscipline === 'All' || (job.discipline && job.discipline.includes(filterDiscipline));
      const matchCritical = !filterCriticalOnly || job.isCriticalPath;

      const progressData = getJobProgressData(job);

      // Gate tab filter
      let matchGate = true;
      if (activeGateTab === 'Gate1') matchGate = progressData.gate === 'Gate1';
      else if (activeGateTab === 'Gate2') matchGate = progressData.gate === 'Gate2';
      else if (activeGateTab === 'Gate3') matchGate = progressData.gate === 'Gate3';
      else if (activeGateTab === 'Gate4') matchGate = progressData.gate === 'Gate4';
      else if (activeGateTab === 'Critical') matchGate = !!job.isCriticalPath;

      // Status dropdown filter
      let matchStatus = true;
      if (filterStatus === 'Completed') matchStatus = progressData.isDone;
      else if (filterStatus === 'In Progress') matchStatus = !progressData.isDone && progressData.gate !== 'Gate1';
      else if (filterStatus === 'Punch Clearing') matchStatus = progressData.openPunches > 0;
      else if (filterStatus === 'Blocked') matchStatus = progressData.isBlocked;

      return matchSearch && matchEvent && matchUnit && matchDiscipline && matchCritical && matchGate && matchStatus;
    });
  }, [plantScopedJobs, searchTerm, filterEvent, filterUnit, filterDiscipline, filterCriticalOnly, activeGateTab, filterStatus]);

  const totalPages = Math.max(1, Math.ceil(filteredJobs.length / itemsPerPage));
  const paginatedJobs = filteredJobs.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  // =========================================================================
  // CORE DISPATCH: SEND / JUMP TO TURNOVER WORKSPACE
  // =========================================================================
  const handleJumpToWorkspace = (job: JobRecord) => {
    setSelectedJobId(job.id);
    if (onNavigateToWorkspace) {
      onNavigateToWorkspace(job.id);
    } else if (setActiveView) {
      setActiveView('job-location-workspace');
    }
  };

  // Color tag generator for Event Name
  const getEventTagColor = (name?: string) => {
    if (!name) return 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700';
    if (name.includes('Annual') || name.includes('TAM')) return 'bg-teal-50 text-teal-700 border-teal-200 dark:bg-teal-950/60 dark:text-teal-300 dark:border-teal-800';
    if (name.includes('Major') || name.includes('Overhaul')) return 'bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/60 dark:text-indigo-300 dark:border-indigo-800';
    if (name.includes('Vacuum') || name.includes('Decoking')) return 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800';
    return 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/60 dark:text-blue-300 dark:border-blue-800';
  };

  // Fill sample data into single creation form
  const handleFillSampleData = () => {
    const rand = Math.floor(100 + Math.random() * 900);
    const plantPrefix = newPlant === 'Sriracha' ? 'SR' : 'PK';
    setNewJobId(`TO-${plantPrefix}-2026-${rand}`);
    setNewWorkOrder(`WO-${Math.floor(100000 + Math.random() * 900000)}`);
    setNewAssetTag(`E-${rand}`);
    setNewDescription(`Overhaul, clean shell & tube bundle and hydro-test for Heat Exchanger E-${rand}.`);
    setNewEquipmentType('Static Equipment');
    setNewDiscipline('M - Mechanical');
    setNewIsCriticalPath(true);
  };

  // Submit Single Job Creation
  const handleCreateSingleJobSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanId = newJobId.trim();
    if (!cleanId) {
      alert(isTh ? 'กรุณาระบุรหัส Job ID' : 'Job ID is required');
      return;
    }
    if (checkJobIdExists(cleanId)) {
      alert(isTh ? `❌ รหัส Job ID "${cleanId}" มีอยู่ในระบบแล้ว ไม่สามารถสร้างซ้ำได้` : `❌ Job ID "${cleanId}" already exists.`);
      return;
    }
    try {
      const created = createJob({
        id: `job-${Date.now()}`,
        jobNo: cleanId,
        title: `${cleanId} — ${newDescription.slice(0, 45) || newAssetTag || 'Turnover Package'}`,
        eventName: newEventName,
        plant: newPlant,
        unit: newUnit,
        system: newSystem,
        workOrder: newWorkOrder || `WO-${Math.floor(100000 + Math.random() * 900000)}`,
        description: newDescription || `${newAssetTag} Turnover Scope`,
        assetTag: newAssetTag || cleanId,
        assetDescription: newEquipmentType,
        isCriticalPath: newIsCriticalPath,
        equipmentType: newEquipmentType,
        discipline: newDiscipline,
        jobLead: newJobLead,
        targetStartDate: newTargetStartDate,
        plannedTurnoverDate: newPlannedTurnoverDate,
        attachments: [],
        signatures: [],
        punchList: []
      });
      showToast(isTh ? `✓ สร้าง Event & Job "${created.jobNo}" สำเร็จเรียบร้อย!` : `✓ Job "${created.jobNo}" created successfully!`);
      setIsCreateModalOpen(false);
      setNewJobId('');
      setNewDescription('');
      setNewAssetTag('');
    } catch (err: any) {
      alert(err.message || 'Error creating job');
    }
  };

  // Execute Export
  const handleExecuteExport = () => {
    const targetData = exportScope === 'filtered' ? filteredJobs : plantScopedJobs;

    if (exportFormat === 'csv') {
      const headers = [
        'Job No', 'Event Name', 'Plant', 'Unit', 'System', 'Work Order',
        'Title', 'Asset Tag', 'Critical Path', 'Progress (%)', 'Signatures Accepted',
        'Open Punches', 'Cat A Punches', 'Status'
      ];
      const rows = targetData.map(j => {
        const p = getJobProgressData(j);
        return [
          `"${j.jobNo || ''}"`,
          `"${j.eventName || ''}"`,
          `"${j.plant || ''}"`,
          `"${j.unit || ''}"`,
          `"${j.system || ''}"`,
          `"${j.workOrder || ''}"`,
          `"${(j.title || '').replace(/"/g, '""')}"`,
          `"${j.assetTag || ''}"`,
          j.isCriticalPath ? 'YES' : 'NO',
          p.overallProgress,
          `"${p.acceptSigns}/${p.totalSigns}"`,
          p.openPunches,
          p.openCatA,
          p.isDone ? 'Completed' : p.isBlocked ? 'Blocked (Cat A)' : 'In Progress'
        ];
      });
      const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement('a');
      link.setAttribute('href', encodedUri);
      link.setAttribute('download', `Turnover_Event_Job_Registry_${new Date().toISOString().slice(0, 10)}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } else {
      const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(targetData, null, 2));
      const link = document.createElement('a');
      link.setAttribute('href', dataStr);
      link.setAttribute('download', `Turnover_Jobs_Export_${new Date().toISOString().slice(0, 10)}.json`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }

    showToast(isTh ? `✓ ส่งออกข้อมูลจำนวน ${targetData.length} รายการเรียบร้อยแล้ว` : `✓ Exported ${targetData.length} records successfully.`);
    setIsExportModalOpen(false);
  };

  return (
    <div className="flex flex-col space-y-5">
      {/* Toast Alert */}
      {toastMessage && (
        <div className="fixed top-6 right-6 z-50 animate-in fade-in slide-in-from-top-4 duration-300">
          <div className="flex items-center gap-2.5 px-4 py-3 rounded-2xl bg-slate-900 border border-emerald-500/50 text-white shadow-2xl text-xs font-semibold">
            <CheckCircle2 size={16} className="text-emerald-400 shrink-0" />
            <span>{toastMessage}</span>
            <button onClick={() => setToastMessage(null)} className="ml-2 text-slate-400 hover:text-white">
              <X size={14} />
            </button>
          </div>
        </div>
      )}

      {/* 1. Header with Module Badge & Action Buttons */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100 tracking-tight flex items-center gap-2">
              <span>{isTh ? 'ทะเบียน Event & แผนงานส่งมอบระบบ' : 'Turnover Event & Job Operations Registry'}</span>
            </h2>
            <span className="text-emerald-700 dark:text-emerald-400 font-bold text-xs px-2.5 py-0.5 rounded-md bg-emerald-100 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-800 font-mono">
              TO01
            </span>
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            {isTh 
              ? 'ระบบติดตามสถานะงานส่งมอบระบบ 4 Gates: ตรวจประเมินอุปกรณ์ (Gate 1) -> ลงนามตรวจสอบ (Gate 2) -> เคลียร์ Punch List (Gate 3) -> ส่งมอบระบบสมบูรณ์ (Gate 4)' 
              : '4-Gate Turnover Lifecycle Tracking: Engineer Review (Gate 1) -> Sign-off (Gate 2) -> Punch Clearance (Gate 3) -> Turnover Handover (Gate 4)'}
          </p>
        </div>

        {/* Action Buttons (Modals) */}
        <div className="flex items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={() => setIsExportModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-2 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold transition-all shadow-2xs cursor-pointer active:scale-95"
            title={isTh ? 'เปิดหน้าต่างส่งออก Excel/CSV' : 'Export Options Modal'}
          >
            <Download size={14} className="text-emerald-600 dark:text-emerald-400" />
            <span className="hidden sm:inline">{isTh ? 'ส่งออก Excel/CSV' : 'Export CSV'}</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setCreateModalTab('single');
              setIsCreateModalOpen(true);
            }}
            className="flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-emerald-600/25 cursor-pointer active:scale-95"
            title={isTh ? 'เปิด Modal สร้าง Event & Job ใหม่' : 'Create Event & Job Modal'}
          >
            <Plus size={16} />
            <span>{isTh ? 'สร้าง Event & Job ใหม่' : 'Create Event & Job'}</span>
          </button>
        </div>
      </div>

      {/* 2. Plant Scope Live Indicator Badge */}
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
          {stats.total} {isTh ? 'งานและอีเวนต์ที่ค้นพบ' : 'events & jobs found'}
        </span>
      </div>

      {/* 3. Gate Tabs Navigation Bar */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs font-bold border-b border-slate-200 dark:border-slate-800">
        <button
          type="button"
          onClick={() => setActiveGateTab('All')}
          className={`px-3 py-2 rounded-xl transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
            activeGateTab === 'All'
              ? 'bg-slate-900 text-white dark:bg-emerald-600 dark:text-white shadow-sm ring-1 ring-slate-900 dark:ring-emerald-500'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <span>{isTh ? 'ทุกขั้นตอน (All Gates)' : 'All Gates'}</span>
          <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
            activeGateTab === 'All'
              ? 'bg-slate-700 text-slate-100 dark:bg-emerald-700/80 dark:text-white'
              : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
          }`}>{stats.total}</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveGateTab('Gate1')}
          className={`px-3 py-2 rounded-xl transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
            activeGateTab === 'Gate1'
              ? 'bg-blue-600 text-white shadow-sm'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <Layers size={13} />
          <span>{isTh ? 'Gate 1: ตรวจประเมินอุปกรณ์' : 'Gate 1: Review'}</span>
          <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-blue-100 dark:bg-blue-900/60 text-blue-600 dark:text-blue-400 font-mono">{stats.gate1}</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveGateTab('Gate2')}
          className={`px-3 py-2 rounded-xl transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
            activeGateTab === 'Gate2'
              ? 'bg-indigo-600 text-white shadow-sm'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <Clock size={13} />
          <span>{isTh ? 'Gate 2: กำลังลงนามตรวจรับ' : 'Gate 2: Sign-off'}</span>
          <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-indigo-100 dark:bg-indigo-900/60 text-indigo-600 dark:text-indigo-400 font-mono">{stats.gate2}</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveGateTab('Gate3')}
          className={`px-3 py-2 rounded-xl transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
            activeGateTab === 'Gate3'
              ? 'bg-amber-600 text-white shadow-sm'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <AlertTriangle size={13} />
          <span>{isTh ? 'Gate 3: เคลียร์ Punch List' : 'Gate 3: Punch Clear'}</span>
          <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-amber-100 dark:bg-amber-900/60 text-amber-600 dark:text-amber-400 font-mono">{stats.gate3}</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveGateTab('Gate4')}
          className={`px-3 py-2 rounded-xl transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
            activeGateTab === 'Gate4'
              ? 'bg-emerald-600 text-white shadow-sm'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <CheckCircle2 size={13} />
          <span>{isTh ? 'Gate 4: ส่งมอบระบบสำเร็จ' : 'Gate 4: Completed'}</span>
          <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-emerald-100 dark:bg-emerald-900/60 text-emerald-600 dark:text-emerald-400 font-mono">{stats.gate4}</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveGateTab('Critical')}
          className={`px-3 py-2 rounded-xl transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
            activeGateTab === 'Critical'
              ? 'bg-orange-600 text-white shadow-sm'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <Zap size={13} className="text-orange-500" />
          <span>{isTh ? 'เส้นทางวิกฤต (Critical Path)' : 'Critical Path'}</span>
          <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-orange-100 dark:bg-orange-900/60 text-orange-600 dark:text-orange-400 font-mono">{stats.critical}</span>
        </button>
      </div>

      {/* 4. Summary KPI Cards Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
        <div className="bg-white dark:bg-slate-900 rounded-xl shadow-2xs border border-gray-200 dark:border-slate-800 p-4 flex flex-col justify-between transition-colors">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[10px] font-bold uppercase tracking-wider">{isTh ? 'งานและ Event ทั้งหมด' : 'Total Events & Jobs'}</span>
            <Briefcase size={16} className="text-emerald-500" />
          </div>
          <div className="mt-2 flex items-baseline gap-1.5">
            <span className="text-2xl font-black text-slate-800 dark:text-white font-mono">{stats.total}</span>
            <span className="text-[10px] text-slate-500">{isTh ? 'งาน' : 'jobs'}</span>
          </div>
          <div className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold mt-1">
            {uniqueEvents.length} {isTh ? 'อีเวนต์ที่เปิดในระบบ' : 'active events'}
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-xl shadow-2xs border border-gray-200 dark:border-slate-800 p-4 flex flex-col justify-between transition-colors">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[10px] font-bold uppercase tracking-wider">{isTh ? 'กำลังตรวจและลงนาม' : 'In Sign-off / Active'}</span>
            <Clock size={16} className="text-indigo-500" />
          </div>
          <div className="mt-2 flex items-baseline gap-1.5">
            <span className="text-2xl font-black text-indigo-600 dark:text-indigo-400 font-mono">{stats.gate2 + stats.gate1}</span>
            <span className="text-[10px] text-slate-500">{isTh ? 'งาน' : 'jobs'}</span>
          </div>
          <div className="text-[10px] text-slate-500 mt-1">
            {stats.total > 0 ? Math.round(((stats.gate2 + stats.gate1) / stats.total) * 100) : 0}% {isTh ? 'ของงานทั้งหมด' : 'of total'}
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-xl shadow-2xs border border-gray-200 dark:border-slate-800 p-4 flex flex-col justify-between transition-colors">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[10px] font-bold uppercase tracking-wider">{isTh ? 'Punch List คงค้าง' : 'Open Punch List'}</span>
            <AlertTriangle size={16} className="text-amber-500" />
          </div>
          <div className="mt-2 flex items-baseline gap-1.5">
            <span className="text-2xl font-black text-amber-600 dark:text-amber-400 font-mono">{stats.openPunchCount}</span>
            <span className="text-[10px] text-slate-500">{isTh ? 'รายการ' : 'items'}</span>
          </div>
          <div className="text-[10px] text-red-500 font-bold mt-1 flex items-center gap-1">
            <span>{stats.openCatACount} {isTh ? 'รายการ Category A (Blocker)' : 'Cat A Blockers'}</span>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-xl shadow-2xs border border-gray-200 dark:border-slate-800 p-4 flex flex-col justify-between transition-colors">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[10px] font-bold uppercase tracking-wider">{isTh ? 'เส้นทางวิกฤต' : 'Critical Path'}</span>
            <Zap size={16} className="text-orange-500" />
          </div>
          <div className="mt-2 flex items-baseline gap-1.5">
            <span className="text-2xl font-black text-orange-600 dark:text-orange-400 font-mono">{stats.critical}</span>
            <span className="text-[10px] text-slate-500">{isTh ? 'งาน' : 'jobs'}</span>
          </div>
          <div className="text-[10px] text-orange-600/80 dark:text-orange-400/80 font-semibold mt-1">
            {isTh ? 'ควบคุมใกล้ชิดระดับนาที' : 'Priority Milestones'}
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-xl shadow-2xs border border-gray-200 dark:border-slate-800 p-4 flex flex-col justify-between transition-colors">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[10px] font-bold uppercase tracking-wider">{isTh ? 'ส่งมอบสำเร็จ (Certificate)' : 'Handed Over'}</span>
            <CheckCircle2 size={16} className="text-emerald-500" />
          </div>
          <div className="mt-2 flex items-baseline gap-1.5">
            <span className="text-2xl font-black text-emerald-600 dark:text-emerald-400 font-mono">{stats.gate4}</span>
            <span className="text-[10px] text-slate-500">{isTh ? 'งาน' : 'jobs'}</span>
          </div>
          <div className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold mt-1">
            {stats.total > 0 ? Math.round((stats.gate4 / stats.total) * 100) : 0}% {isTh ? 'ส่งมอบสมบูรณ์' : 'completed'}
          </div>
        </div>
      </div>

      {/* 5. Search and Multi-Dimensional Filter Bar */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xs border border-gray-200 dark:border-slate-800 p-4 transition-colors">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 items-end">
          <div className="space-y-1 sm:col-span-2">
            <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest flex items-center gap-1">
              <Search size={11} className="text-slate-400" />
              <span>{isTh ? 'ค้นหางาน (Search)' : 'Search Event & Job'}</span>
            </label>
            <div className="relative">
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder={isTh ? "ค้นหาชื่องาน, Job No, Event, Unit, Tag, WO..." : "Search by Job No, Event, Unit, Tag, WO..."}
                className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-700 dark:text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-colors"
              />
              <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => setSearchTerm('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                >
                  <X size={12} />
                </button>
              )}
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest flex items-center gap-1">
              <Briefcase size={11} className="text-slate-400" />
              <span>{isTh ? 'อีเวนต์ (Event)' : 'Event'}</span>
            </label>
            <select
              value={filterEvent}
              onChange={(e) => setFilterEvent(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-colors cursor-pointer"
            >
              <option value="All">{isTh ? 'ทุกอีเวนต์ (All Events)' : 'All Events'}</option>
              {uniqueEvents.map(evt => (
                <option key={evt} value={evt}>{evt}</option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest flex items-center gap-1">
              <MapPin size={11} className="text-slate-400" />
              <span>{isTh ? 'หน่วยผลิต (Unit)' : 'Unit'}</span>
            </label>
            <select
              value={filterUnit}
              onChange={(e) => setFilterUnit(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-colors cursor-pointer"
            >
              <option value="All">{isTh ? 'ทุกหน่วยผลิต (All Units)' : 'All Units'}</option>
              {uniqueUnits.map(u => (
                <option key={u} value={u}>{u}</option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest flex items-center gap-1">
              <Filter size={11} className="text-slate-400" />
              <span>{isTh ? 'สถานะ (Status)' : 'Status'}</span>
            </label>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-colors cursor-pointer"
            >
              <option value="All">{isTh ? 'ทุกสถานะ (All Status)' : 'All Status'}</option>
              <option value="In Progress">{isTh ? 'กำลังดำเนินการ (In Progress)' : 'In Progress'}</option>
              <option value="Punch Clearing">{isTh ? 'มี Punch List คงค้าง' : 'Punch Clearing'}</option>
              <option value="Blocked">{isTh ? 'ติด Blocker Cat A' : 'Blocked'}</option>
              <option value="Completed">{isTh ? 'ส่งมอบเสร็จสมบูรณ์ (Completed)' : 'Completed'}</option>
            </select>
          </div>
        </div>

        {/* Quick Filter Bar */}
        <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setFilterCriticalOnly(!filterCriticalOnly)}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                filterCriticalOnly
                  ? 'bg-orange-500 text-white shadow-xs'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              <Zap size={13} className={filterCriticalOnly ? 'text-white' : 'text-orange-500'} />
              <span>{isTh ? 'เฉพาะเส้นทางวิกฤต (Critical Path Only)' : 'Critical Path Only'}</span>
            </button>

            {(searchTerm || filterEvent !== 'All' || filterUnit !== 'All' || filterStatus !== 'All' || filterCriticalOnly || activeGateTab !== 'All') && (
              <button
                type="button"
                onClick={() => {
                  setSearchTerm('');
                  setFilterEvent('All');
                  setFilterUnit('All');
                  setFilterStatus('All');
                  setFilterCriticalOnly(false);
                  setActiveGateTab('All');
                }}
                className="text-xs text-rose-600 dark:text-rose-400 hover:underline flex items-center gap-1 cursor-pointer font-medium ml-2"
              >
                <X size={12} />
                <span>{isTh ? 'ล้างตัวกรองทั้งหมด' : 'Clear Filters'}</span>
              </button>
            )}
          </div>

          <div className="flex items-center gap-3">
            {/* View Switcher: Table vs Cards */}
            <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-0.5 rounded-lg border border-slate-200 dark:border-slate-700">
              <button
                type="button"
                onClick={() => setViewMode('table')}
                className={`p-1.5 rounded-md text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer ${
                  viewMode === 'table'
                    ? 'bg-white dark:bg-slate-700 text-emerald-600 dark:text-emerald-400 shadow-xs'
                    : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                }`}
                title="Table View"
              >
                <TableIcon size={13} />
                <span className="hidden sm:inline">Table</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode('cards')}
                className={`p-1.5 rounded-md text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer ${
                  viewMode === 'cards'
                    ? 'bg-white dark:bg-slate-700 text-emerald-600 dark:text-emerald-400 shadow-xs'
                    : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                }`}
                title="Cards View"
              >
                <LayoutList size={13} />
                <span className="hidden sm:inline">Cards</span>
              </button>
            </div>

            <div className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">
              {isTh ? `แสดง ${filteredJobs.length} จาก ${plantScopedJobs.length} รายการ` : `Showing ${filteredJobs.length} of ${plantScopedJobs.length} records`}
            </div>
          </div>
        </div>
      </div>

      {/* 6. Event & Job Cards / Table List View */}
      {viewMode === 'table' ? (
        <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 flex flex-col overflow-hidden transition-colors">
          <div className="overflow-x-auto min-h-[300px]">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700 text-[11px] font-bold text-slate-700 dark:text-slate-200 uppercase tracking-wider">
                  <th className="p-3">Job No & WO</th>
                  <th className="p-3">Event & Plant</th>
                  <th className="p-3">Unit & System</th>
                  <th className="p-3">Asset Tag</th>
                  <th className="p-3">Signatures</th>
                  <th className="p-3">Punch List</th>
                  <th className="p-3">Progress (%)</th>
                  <th className="p-3">Gate / Status</th>
                  <th className="p-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
                {paginatedJobs.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="p-12 text-center text-slate-400 dark:text-slate-500 italic text-xs">
                      {isTh ? 'ไม่พบรายการ Event & Job ตามเงื่อนไข' : 'No matching jobs found.'}
                    </td>
                  </tr>
                ) : (
                  paginatedJobs.map((job) => {
                    const progress = getJobProgressData(job);
                    return (
                      <tr 
                        key={job.id} 
                        onClick={() => handleJumpToWorkspace(job)}
                        className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors cursor-pointer group"
                      >
                        {/* Job No & WO */}
                        <td className="p-3">
                          <button 
                            type="button"
                            onClick={(e) => { 
                              e.stopPropagation(); 
                              handleJumpToWorkspace(job); 
                            }}
                            className="font-mono font-bold text-emerald-600 dark:text-emerald-400 hover:underline cursor-pointer block text-left"
                            title={isTh ? 'ส่งไปยัง Turnover Workspace' : 'Send to Turnover Workspace'}
                          >
                            {job.jobNo}
                          </button>
                          <span className="text-[10px] font-mono text-slate-500 dark:text-slate-400 block mt-0.5">
                            {job.workOrder || '-'}
                          </span>
                        </td>

                        {/* Event & Plant */}
                        <td className="p-3">
                          <div className="font-semibold text-slate-900 dark:text-slate-100 truncate max-w-[160px]">
                            {job.eventName || 'Turnaround 2026'}
                          </div>
                          <div className="text-[10px] text-slate-500 dark:text-slate-400 flex items-center gap-1 mt-0.5">
                            <Building2 size={10} />
                            <span>{job.plant}</span>
                          </div>
                        </td>

                        {/* Unit & System */}
                        <td className="p-3">
                          <div className="font-medium text-slate-800 dark:text-slate-200 truncate max-w-[140px]">
                            {job.unit}
                          </div>
                          <div className="text-[10px] text-slate-500 dark:text-slate-400 truncate max-w-[140px]">
                            {job.system || '-'}
                          </div>
                        </td>

                        {/* Asset Tag */}
                        <td className="p-3">
                          {job.assetTag ? (
                            <span className="font-mono font-bold text-slate-900 dark:text-slate-100 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-1.5 py-0.5 rounded text-[11px]">
                              {job.assetTag}
                            </span>
                          ) : (
                            <span className="text-slate-400">-</span>
                          )}
                        </td>

                        {/* Signatures */}
                        <td className="p-3" onClick={(e) => {
                          e.stopPropagation();
                          handleJumpToWorkspace(job);
                        }}>
                          <div className="flex items-center gap-1 text-slate-700 dark:text-slate-300 font-mono font-bold hover:text-emerald-600 transition-colors">
                            <CheckCircle2 size={12} className="text-emerald-500" />
                            <span>{progress.acceptSigns}/{progress.totalSigns}</span>
                          </div>
                          <div className="text-[10px] text-slate-500 dark:text-slate-400">
                            {progress.acceptSigns === progress.totalSigns ? 'ลงนามครบ' : 'ไปที่ Workspace'}
                          </div>
                        </td>

                        {/* Punch List */}
                        <td className="p-3" onClick={(e) => {
                          e.stopPropagation();
                          handleJumpToWorkspace(job);
                        }}>
                          {progress.openCatA > 0 ? (
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-rose-500/15 text-rose-700 dark:text-rose-400 border border-rose-500/30 inline-flex items-center gap-0.5 hover:bg-rose-500/25">
                              <AlertOctagon size={11} />
                              <span>{progress.openCatA} Cat A</span>
                            </span>
                          ) : progress.openPunches > 0 ? (
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/30 hover:bg-amber-500/25">
                              {progress.openPunches} Punch
                            </span>
                          ) : (
                            <span className="text-emerald-600 dark:text-emerald-400 font-bold text-[11px] inline-flex items-center gap-1">
                              <CheckCircle2 size={12} />
                              <span>Clear</span>
                            </span>
                          )}
                        </td>

                        {/* Progress (%) */}
                        <td className="p-3 w-28">
                          <div className="flex items-center justify-between text-[11px] mb-1 font-mono font-bold text-slate-700 dark:text-slate-200">
                            <span>{progress.overallProgress}%</span>
                          </div>
                          <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-1.5 overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all duration-500 ${
                                progress.isDone ? 'bg-emerald-500' : progress.isBlocked ? 'bg-rose-500' : 'bg-emerald-500'
                              }`}
                              style={{ width: `${progress.overallProgress}%` }}
                            />
                          </div>
                        </td>

                        {/* Gate / Status */}
                        <td className="p-3">
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase border w-fit ${
                            job.status === 'Completed' || progress.isDone
                              ? 'bg-green-100 text-green-800 border-green-300 dark:bg-green-900/30 dark:text-green-300 dark:border-green-800'
                              : progress.openCatA > 0
                                ? 'bg-rose-100 text-rose-800 border-rose-300 dark:bg-rose-900/30 dark:text-rose-300 dark:border-rose-800'
                                : progress.openPunches > 0
                                  ? 'bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-800'
                                  : 'bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-800'
                          }`}>
                            {progress.isDone ? 'Completed' : progress.openCatA > 0 ? 'Blocked (A)' : job.status || 'In Progress'}
                          </span>
                        </td>

                        {/* Actions: View Details or Send to Turnover Workspace */}
                        <td className="p-3 text-right" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center justify-end gap-1.5">
                            {/* 1. Quick View Dossier */}
                            <button
                              type="button"
                              onClick={() => {
                                setDetailsModalTab('general');
                                setDetailsModalJob(job);
                              }}
                              className="p-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-lg transition-colors cursor-pointer"
                              title={isTh ? 'ดูข้อมูลสรุปย่อ (Quick Dossier)' : 'View Quick Dossier'}
                            >
                              <Eye size={13} />
                            </button>

                            {/* 2. Main Action: Send to Turnover Workspace */}
                            <button
                              type="button"
                              onClick={() => handleJumpToWorkspace(job)}
                              className="px-3 py-1.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-emerald-600/20 flex items-center gap-1.5 cursor-pointer active:scale-95"
                              title={isTh ? 'ส่งไปยัง Turnover Workspace' : 'Send to Turnover Workspace'}
                            >
                              <span>{isTh ? 'ไปยัง Workspace' : 'Workspace'}</span>
                              <ArrowRight size={13} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Table Pagination */}
          {totalPages > 1 && (
            <div className="p-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500 bg-slate-50/50 dark:bg-slate-900/50">
              <span>{isTh ? `หน้า ${currentPage} จาก ${totalPages}` : `Page ${currentPage} of ${totalPages}`}</span>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  className="p-1 rounded-md border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                >
                  <ChevronLeft size={14} />
                </button>
                {Array.from({ length: totalPages }).map((_, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setCurrentPage(idx + 1)}
                    className={`w-6 h-6 rounded-md font-mono text-xs font-bold transition-colors cursor-pointer ${
                      currentPage === idx + 1
                        ? 'bg-emerald-600 text-white'
                        : 'hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300'
                    }`}
                  >
                    {idx + 1}
                  </button>
                ))}
                <button
                  type="button"
                  disabled={currentPage === totalPages}
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  className="p-1 rounded-md border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                >
                  <ChevronRight size={14} />
                </button>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {paginatedJobs.length === 0 ? (
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-dashed border-slate-300 dark:border-slate-800 p-12 text-center">
              <Briefcase size={36} className="mx-auto text-slate-300 dark:text-slate-600 mb-3" />
              <h4 className="text-sm font-bold text-slate-700 dark:text-slate-200">
                {isTh ? 'ไม่พบรายการ Event & Job ตามเงื่อนไขที่เลือก' : 'No Events or Jobs Found'}
              </h4>
              <p className="text-xs text-slate-400 dark:text-slate-500 mt-1 max-w-sm mx-auto">
                {isTh 
                  ? 'คลิกปุ่มด้านล่างเพื่อเปิดหน้าต่าง Popup สร้าง Event & Job ใหม่' 
                  : 'Click the button below to open the Create Event & Job Modal.'}
              </p>
              <button
                type="button"
                onClick={() => {
                  setCreateModalTab('single');
                  setIsCreateModalOpen(true);
                }}
                className="mt-4 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm cursor-pointer inline-flex items-center gap-1.5"
              >
                <Plus size={14} />
                <span>{isTh ? 'สร้าง Event & Job ใหม่' : 'Create Event & Job'}</span>
              </button>
            </div>
          ) : (
            paginatedJobs.map((job) => {
              const progress = getJobProgressData(job);
              return (
                <div
                  key={job.id}
                  onClick={() => handleJumpToWorkspace(job)}
                  className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/90 dark:border-slate-800/90 p-4 sm:p-5 shadow-2xs hover:shadow-md hover:border-emerald-500/40 transition-all duration-200 flex flex-col md:flex-row md:items-center justify-between gap-4 group cursor-pointer"
                >
                  {/* Left Column */}
                  <div className="flex-1 min-w-0 space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`px-2.5 py-0.5 rounded-md text-[11px] font-bold border flex items-center gap-1.5 ${getEventTagColor(job.eventName)}`}>
                        <Briefcase size={12} />
                        <span>{job.eventName || 'Annual Turnaround 2026'}</span>
                      </span>

                      <span className="font-mono text-xs font-black text-slate-900 dark:text-white bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 px-2.5 py-0.5 rounded-md">
                        {job.jobNo}
                      </span>

                      {job.isCriticalPath && (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-orange-500/15 text-orange-600 dark:text-orange-400 border border-orange-500/30 flex items-center gap-1">
                          <Zap size={10} className="fill-orange-500" />
                          <span>Critical Path</span>
                        </span>
                      )}

                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase border ${
                        progress.isDone
                          ? 'bg-green-100 text-green-800 border-green-300 dark:bg-green-900/30 dark:text-green-300 dark:border-green-800'
                          : progress.openCatA > 0
                            ? 'bg-rose-100 text-rose-800 border-rose-300 dark:bg-rose-900/30 dark:text-rose-300 dark:border-rose-800'
                            : 'bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-800'
                      }`}>
                        {progress.isDone ? 'Completed' : progress.openCatA > 0 ? 'Blocked Cat A' : job.status || 'In Progress'}
                      </span>
                    </div>

                    <h3 className="text-sm sm:text-base font-bold text-slate-800 dark:text-white line-clamp-1 group-hover:text-emerald-600 transition-colors">
                      {job.title}
                    </h3>

                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500 dark:text-slate-400">
                      <span className="flex items-center gap-1 font-semibold text-slate-700 dark:text-slate-300">
                        <Building2 size={12} />
                        <span>{job.plant}</span>
                      </span>
                      <span>·</span>
                      <span>{job.unit}</span>
                      <span>·</span>
                      <span className="font-mono">{job.system || '-'}</span>
                      {job.assetTag && (
                        <>
                          <span>·</span>
                          <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">{job.assetTag}</span>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Middle Column: Progress & Gate Status */}
                  <div className="flex sm:items-center gap-6 shrink-0 border-t sm:border-t-0 sm:border-l border-slate-100 dark:border-slate-800 pt-3 sm:pt-0 sm:pl-6">
                    <div className="space-y-1.5 w-32">
                      <div className="flex items-center justify-between text-xs font-mono font-bold">
                        <span className="text-slate-500">Progress</span>
                        <span className="text-slate-800 dark:text-white">{progress.overallProgress}%</span>
                      </div>
                      <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-2 overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${
                            progress.isDone ? 'bg-emerald-500' : progress.isBlocked ? 'bg-rose-500' : 'bg-emerald-500'
                          }`}
                          style={{ width: `${progress.overallProgress}%` }}
                        />
                      </div>
                      <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono">
                        <span>Sign: {progress.acceptSigns}/3</span>
                        <span>Punch: {progress.openPunches}</span>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                      <button
                        type="button"
                        onClick={() => {
                          setDetailsModalTab('general');
                          setDetailsModalJob(job);
                        }}
                        className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition-colors cursor-pointer"
                        title={isTh ? 'ดูข้อมูลสรุปย่อ' : 'View Quick Dossier'}
                      >
                        <Eye size={15} />
                      </button>

                      <button
                        type="button"
                        onClick={() => handleJumpToWorkspace(job)}
                        className="px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-md shadow-emerald-600/20 transition-all cursor-pointer active:scale-95"
                        title={isTh ? 'ส่งไปยัง Turnover Workspace' : 'Send to Turnover Workspace'}
                      >
                        <span>{isTh ? 'ไปยัง Workspace' : 'Workspace'}</span>
                        <ArrowRight size={14} />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 1: CREATE EVENT & JOB (POPUP MODAL)                                 */}
      {/* ========================================================================= */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="relative w-full max-w-3xl bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between shrink-0 bg-slate-50 dark:bg-slate-900/80">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-emerald-600/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold">
                  <Plus size={20} />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    {isTh ? 'สร้าง Event & แผนงานส่งมอบระบบใหม่ (Create Job Package)' : 'Create Event & Job Package'}
                  </h3>
                  <p className="text-xs text-slate-500">
                    {isTh ? 'ลงทะเบียนแพ็กเกจงาน พร้อมระบบตรวจสอบรหัสซ้ำอัตโนมัติ' : 'Register turnover package with automatic duplicate validation'}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsCreateModalOpen(false)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Mode Switch Tabs */}
            <div className="flex items-center gap-2 px-6 pt-3 border-b border-slate-100 dark:border-slate-800 text-xs font-bold bg-white dark:bg-slate-900 shrink-0">
              <button
                type="button"
                onClick={() => setCreateModalTab('single')}
                className={`py-2 px-4 rounded-t-xl transition-all cursor-pointer flex items-center gap-1.5 border-b-2 ${
                  createModalTab === 'single'
                    ? 'border-emerald-600 text-emerald-600 dark:text-emerald-400 bg-emerald-50/50 dark:bg-emerald-950/20'
                    : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                <FileText size={14} />
                <span>{isTh ? 'สร้างรายแพ็กเกจ (Single Package)' : 'Single Package'}</span>
              </button>
              <button
                type="button"
                onClick={() => setCreateModalTab('bulk')}
                className={`py-2 px-4 rounded-t-xl transition-all cursor-pointer flex items-center gap-1.5 border-b-2 ${
                  createModalTab === 'bulk'
                    ? 'border-emerald-600 text-emerald-600 dark:text-emerald-400 bg-emerald-50/50 dark:bg-emerald-950/20'
                    : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                <UploadCloud size={14} />
                <span>{isTh ? 'นำเข้าชุดข้อมูล (Bulk Import Excel/CSV)' : 'Bulk Ingestion'}</span>
              </button>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-5">
              {createModalTab === 'single' ? (
                <form onSubmit={handleCreateSingleJobSubmit} className="space-y-4">
                  {/* Top Bar inside form: Fill Sample Data Button */}
                  <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/60">
                    <span className="text-xs text-slate-500 font-medium">
                      {isTh ? 'สามารถกดเติมข้อมูลตัวอย่างเพื่อทดสอบระบบได้ทันที' : 'Use sample values for quick testing'}
                    </span>
                    <button
                      type="button"
                      onClick={handleFillSampleData}
                      className="px-3 py-1 bg-white dark:bg-slate-700 hover:bg-slate-100 text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-600 rounded-lg text-xs font-bold transition-all shadow-2xs cursor-pointer flex items-center gap-1"
                    >
                      <Sparkles size={12} className="text-amber-500" />
                      <span>{isTh ? 'กรอกข้อมูลตัวอย่าง' : 'Fill Sample'}</span>
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Plant Selector */}
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                        {isTh ? 'โรงงาน (Plant) *' : 'Plant *'}
                      </label>
                      <select
                        value={newPlant}
                        onChange={(e) => setNewPlant(e.target.value as any)}
                        className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl font-semibold outline-none cursor-pointer"
                      >
                        <option value="Phra Khanong">โรงกลั่นพระโขนง (Phra Khanong Refinery)</option>
                        <option value="Sriracha">โรงกลั่นศรีราชา (Sriracha Refinery)</option>
                      </select>
                    </div>

                    {/* Event Name */}
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                        {isTh ? 'ชื่ออีเวนต์ (Event Name) *' : 'Event Name *'}
                      </label>
                      <input
                        type="text"
                        required
                        value={newEventName}
                        onChange={(e) => setNewEventName(e.target.value)}
                        placeholder="e.g. Annual Turnaround 2026"
                        className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl font-semibold outline-none"
                      />
                    </div>

                    {/* Job ID with Duplicate Check */}
                    <div className="space-y-1 sm:col-span-2">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                          {isTh ? 'รหัสงาน (Job ID / Job No) *' : 'Job ID / Job No *'}
                        </label>
                        {newJobId.trim() && (
                          <span className={`text-[11px] font-bold flex items-center gap-1 ${
                            isNewJobIdDuplicate ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'
                          }`}>
                            {isNewJobIdDuplicate ? <AlertOctagon size={12} /> : <CheckCircle2 size={12} />}
                            <span>{isNewJobIdDuplicate ? 'รหัสนี้ซ้ำในระบบ (ห้ามใช้)' : 'รหัสใช้งานได้ (Unique ID)'}</span>
                          </span>
                        )}
                      </div>
                      <input
                        type="text"
                        required
                        value={newJobId}
                        onChange={(e) => setNewJobId(e.target.value)}
                        placeholder="e.g. TO-PK-2026-088"
                        className={`w-full px-3 py-2 text-xs font-mono font-bold rounded-xl border outline-none transition-colors ${
                          isNewJobIdDuplicate
                            ? 'bg-rose-50 dark:bg-rose-950/30 border-rose-500 text-rose-800 dark:text-rose-200'
                            : 'bg-slate-50 dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white'
                        }`}
                      />
                    </div>

                    {/* Unit / Area */}
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                        {isTh ? 'หน่วยผลิต (Unit / Area) *' : 'Unit / Area *'}
                      </label>
                      <input
                        type="text"
                        required
                        value={newUnit}
                        onChange={(e) => setNewUnit(e.target.value)}
                        placeholder="e.g. APS-1 (Atmospheric Distillation Unit 1)"
                        className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl font-semibold outline-none"
                      />
                    </div>

                    {/* System */}
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                        {isTh ? 'ระบบย่อย (System) *' : 'System *'}
                      </label>
                      <input
                        type="text"
                        required
                        value={newSystem}
                        onChange={(e) => setNewSystem(e.target.value)}
                        placeholder="e.g. System-11 (Crude Feed & Desalter)"
                        className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl font-semibold outline-none"
                      />
                    </div>

                    {/* Asset Tag & Work Order */}
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                        {isTh ? 'รหัสอุปกรณ์ (Asset Tag)' : 'Asset Tag'}
                      </label>
                      <input
                        type="text"
                        value={newAssetTag}
                        onChange={(e) => setNewAssetTag(e.target.value)}
                        placeholder="e.g. E-204"
                        className="w-full px-3 py-2 text-xs font-mono font-bold bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl outline-none"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                        {isTh ? 'เลขที่ใบสั่งงาน (Work Order)' : 'Work Order No'}
                      </label>
                      <input
                        type="text"
                        value={newWorkOrder}
                        onChange={(e) => setNewWorkOrder(e.target.value)}
                        placeholder="e.g. WO-449102"
                        className="w-full px-3 py-2 text-xs font-mono bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl outline-none"
                      />
                    </div>

                    {/* Discipline & Job Lead */}
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                        {isTh ? 'สาขาวิชาชีพ (Discipline)' : 'Discipline'}
                      </label>
                      <select
                        value={newDiscipline}
                        onChange={(e) => setNewDiscipline(e.target.value)}
                        className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl font-semibold outline-none cursor-pointer"
                      >
                        <option value="M - Mechanical">M — Mechanical</option>
                        <option value="P - Piping">P — Piping</option>
                        <option value="E - Electrical">E — Electrical</option>
                        <option value="I - Instrumentation">I — Instrumentation</option>
                        <option value="C - Civil & Structure">C — Civil & Structure</option>
                        <option value="Ins - Insulation">Ins — Insulation</option>
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                        {isTh ? 'หัวหน้าวิศวกรผู้รับผิดชอบ (Job Lead)' : 'Job Lead'}
                      </label>
                      <input
                        type="text"
                        value={newJobLead}
                        onChange={(e) => setNewJobLead(e.target.value)}
                        placeholder="e.g. Somchai Prasert"
                        className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl font-semibold outline-none"
                      />
                    </div>

                    {/* Dates */}
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                        {isTh ? 'วันเริ่มแผนงาน (Target Start)' : 'Target Start Date'}
                      </label>
                      <input
                        type="date"
                        value={newTargetStartDate}
                        onChange={(e) => setNewTargetStartDate(e.target.value)}
                        className="w-full px-3 py-2 text-xs font-mono bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl outline-none"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                        {isTh ? 'วันส่งมอบตามแผน (Planned Turnover)' : 'Planned Turnover Date'}
                      </label>
                      <input
                        type="date"
                        value={newPlannedTurnoverDate}
                        onChange={(e) => setNewPlannedTurnoverDate(e.target.value)}
                        className="w-full px-3 py-2 text-xs font-mono bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl outline-none"
                      />
                    </div>
                  </div>

                  {/* Description */}
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                      {isTh ? 'ขอบเขตงานโดยละเอียด (Scope Summary & Description) *' : 'Scope Description *'}
                    </label>
                    <textarea
                      rows={3}
                      required
                      value={newDescription}
                      onChange={(e) => setNewDescription(e.target.value)}
                      placeholder="ระบุรายละเอียดงาน เช่น งานล้างทำความสะอาด, เปลี่ยนปะเก็น, ทดสอบแรงดันน้ำ..."
                      className="w-full p-3 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500/20"
                    />
                  </div>

                  {/* Critical Path Checkbox */}
                  <label className="flex items-center gap-2.5 p-3 rounded-2xl border border-orange-200 dark:border-orange-950/80 bg-orange-50/50 dark:bg-orange-950/20 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={newIsCriticalPath}
                      onChange={(e) => setNewIsCriticalPath(e.target.checked)}
                      className="w-4 h-4 rounded text-orange-600 focus:ring-orange-500 cursor-pointer"
                    />
                    <div>
                      <span className="text-xs font-bold text-orange-900 dark:text-orange-300 flex items-center gap-1">
                        <Zap size={14} className="text-orange-500" />
                        <span>{isTh ? 'กำหนดเป็นงานเส้นทางวิกฤต (Critical Path Milestone)' : 'Mark as Critical Path'}</span>
                      </span>
                      <p className="text-[11px] text-orange-700/80 dark:text-orange-400/80">
                        {isTh ? 'งานนี้จะถูกจัดลำดับความสำคัญสูงสุด และติดตามรายชั่วโมงใน Dashboard' : 'Monitored with highest priority in executive control tower'}
                      </p>
                    </div>
                  </label>

                  {/* Submit & Cancel Buttons */}
                  <div className="pt-2 flex items-center justify-end gap-3">
                    <button
                      type="button"
                      onClick={() => setIsCreateModalOpen(false)}
                      className="px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                    >
                      {isTh ? 'ยกเลิก' : 'Cancel'}
                    </button>

                    <button
                      type="submit"
                      disabled={isNewJobIdDuplicate || !newJobId.trim()}
                      className="px-5 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-emerald-600/20 cursor-pointer flex items-center gap-1.5"
                    >
                      <Check size={16} />
                      <span>{isTh ? 'ยืนยันสร้าง Event & Job' : 'Create & Register Job'}</span>
                    </button>
                  </div>
                </form>
              ) : (
                <div className="space-y-4">
                  <BulkTurnoverJobIngestion
                    onClose={() => setIsCreateModalOpen(false)}
                    onSwitchToSingle={() => setCreateModalTab('single')}
                    onBatchCreateTurnoverJobs={(newTurnoverJobs) => {
                      const res = batchCreateJobs(newTurnoverJobs);
                      if (!res.success) {
                        alert(res.error || 'Duplicate IDs found in batch.');
                        return;
                      }
                      showToast(isTh ? `✓ นำเข้าชุดข้อมูลสำเร็จ ${res.addedCount} รายการ` : `✓ Ingested ${res.addedCount} jobs successfully!`);
                      setIsCreateModalOpen(false);
                    }}
                    onSuccess={(count) => {
                      showToast(isTh ? `✓ ดำเนินการนำเข้าสำเร็จ ${count} รายการ` : `✓ Ingested ${count} jobs`);
                      setIsCreateModalOpen(false);
                    }}
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: FULL JOB DOSSIER DETAILS (POPUP MODAL)                           */}
      {/* ========================================================================= */}
      {detailsModalJob && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="relative w-full max-w-4xl bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="px-6 py-4.5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between shrink-0 bg-slate-50 dark:bg-slate-900/80">
              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className={`px-2 py-0.5 rounded text-[11px] font-bold border ${getEventTagColor(detailsModalJob.eventName)}`}>
                    {detailsModalJob.eventName || 'Annual Turnaround 2026'}
                  </span>
                  <span className="font-mono text-xs font-black text-slate-900 dark:text-white bg-slate-200 dark:bg-slate-800 px-2.5 py-0.5 rounded-md">
                    {detailsModalJob.jobNo}
                  </span>
                  {detailsModalJob.isCriticalPath && (
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-orange-500/15 text-orange-600 dark:text-orange-400 border border-orange-500/30 flex items-center gap-1">
                      <Zap size={10} className="fill-orange-500" />
                      <span>Critical Path</span>
                    </span>
                  )}
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30">
                    {detailsModalJob.plant}
                  </span>
                </div>
                <h3 className="text-base font-bold text-slate-800 dark:text-white line-clamp-1">
                  {detailsModalJob.title}
                </h3>
              </div>

              <button
                type="button"
                onClick={() => setDetailsModalJob(null)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Tabs */}
            <div className="flex items-center gap-1 px-6 border-b border-slate-200 dark:border-slate-800 text-xs font-bold overflow-x-auto shrink-0 bg-white dark:bg-slate-900">
              <button
                type="button"
                onClick={() => setDetailsModalTab('general')}
                className={`py-3 px-3 border-b-2 transition-all cursor-pointer ${
                  detailsModalTab === 'general'
                    ? 'border-emerald-600 text-emerald-600 dark:text-emerald-400'
                    : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                }`}
              >
                {isTh ? '1. ข้อมูลทั่วไป & Asset' : '1. General & Asset'}
              </button>
              <button
                type="button"
                onClick={() => setDetailsModalTab('signatures')}
                className={`py-3 px-3 border-b-2 transition-all cursor-pointer flex items-center gap-1.5 ${
                  detailsModalTab === 'signatures'
                    ? 'border-emerald-600 text-emerald-600 dark:text-emerald-400'
                    : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                }`}
              >
                <span>{isTh ? '2. ผลการลงนามตรวจรับ' : '2. Signatures'}</span>
                <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-slate-100 dark:bg-slate-800 font-mono">
                  {(detailsModalJob.signatures || []).length}
                </span>
              </button>
              <button
                type="button"
                onClick={() => setDetailsModalTab('punches')}
                className={`py-3 px-3 border-b-2 transition-all cursor-pointer flex items-center gap-1.5 ${
                  detailsModalTab === 'punches'
                    ? 'border-emerald-600 text-emerald-600 dark:text-emerald-400'
                    : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                }`}
              >
                <span>{isTh ? '3. รายการ Punch List' : '3. Punch List'}</span>
                <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-slate-100 dark:bg-slate-800 font-mono">
                  {(detailsModalJob.punchList || []).length}
                </span>
              </button>
              <button
                type="button"
                onClick={() => setDetailsModalTab('attachments')}
                className={`py-3 px-3 border-b-2 transition-all cursor-pointer flex items-center gap-1.5 ${
                  detailsModalTab === 'attachments'
                    ? 'border-emerald-600 text-emerald-600 dark:text-emerald-400'
                    : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                }`}
              >
                <span>{isTh ? '4. เอกสารแนบ' : '4. Attachments'}</span>
                <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-slate-100 dark:bg-slate-800 font-mono">
                  {(detailsModalJob.attachments || []).length}
                </span>
              </button>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {detailsModalTab === 'general' && (
                <div className="space-y-4">
                  <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 space-y-2">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                      {isTh ? 'รายละเอียดเนื้องาน (Scope Description)' : 'Scope Description'}
                    </h4>
                    <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
                      {detailsModalJob.description || detailsModalJob.title}
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 text-xs">
                    <div className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 space-y-1">
                      <span className="text-[10px] uppercase font-bold text-slate-400">{isTh ? 'โรงงาน' : 'Plant'}</span>
                      <p className="font-bold text-slate-800 dark:text-slate-200">{detailsModalJob.plant}</p>
                    </div>

                    <div className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 space-y-1">
                      <span className="text-[10px] uppercase font-bold text-slate-400">{isTh ? 'หน่วยผลิต (Unit)' : 'Unit'}</span>
                      <p className="font-bold text-slate-800 dark:text-slate-200">{detailsModalJob.unit}</p>
                    </div>

                    <div className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 space-y-1">
                      <span className="text-[10px] uppercase font-bold text-slate-400">{isTh ? 'ระบบ (System)' : 'System'}</span>
                      <p className="font-bold text-slate-800 dark:text-slate-200">{detailsModalJob.system}</p>
                    </div>

                    <div className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 space-y-1">
                      <span className="text-[10px] uppercase font-bold text-slate-400">{isTh ? 'รหัสอุปกรณ์ (Asset Tag)' : 'Asset Tag'}</span>
                      <p className="font-mono font-bold text-emerald-600 dark:text-emerald-400">{detailsModalJob.assetTag || 'N/A'}</p>
                    </div>

                    <div className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 space-y-1">
                      <span className="text-[10px] uppercase font-bold text-slate-400">{isTh ? 'เลขที่ใบสั่งงาน (WO)' : 'Work Order'}</span>
                      <p className="font-mono font-bold text-slate-800 dark:text-slate-200">{detailsModalJob.workOrder || '-'}</p>
                    </div>

                    <div className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 space-y-1">
                      <span className="text-[10px] uppercase font-bold text-slate-400">{isTh ? 'วิศวกรผู้รับผิดชอบ' : 'Lead Engineer'}</span>
                      <p className="font-medium text-slate-800 dark:text-slate-200">{detailsModalJob.jobLead || 'Lead Turnover Engineer'}</p>
                    </div>
                  </div>

                  <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs">
                    <div>
                      <span className="font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                        <MapPin size={14} className="text-emerald-500" />
                        <span>พิกัดผังโรงงาน (CAD Drawing Relative Coordinates)</span>
                      </span>
                      <p className="text-slate-400 text-[11px] font-mono mt-0.5">
                        X: {detailsModalJob.plotPlanX || 50.0}% • Y: {detailsModalJob.plotPlanY || 50.0}% • Grid: {detailsModalJob.gridZone || 'B2'}
                      </p>
                    </div>
                    <span className="px-2.5 py-1 rounded-lg bg-teal-500/15 text-teal-700 dark:text-teal-300 border border-teal-500/30 font-mono text-[11px] font-bold">
                      Calibrated
                    </span>
                  </div>
                </div>
              )}

              {detailsModalTab === 'signatures' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold text-slate-700 dark:text-slate-200 uppercase tracking-wider">
                      {isTh ? 'บันทึกการลงนามตรวจรับมอบงาน' : 'Acceptance Signatures Log'}
                    </h4>
                    <span className="text-xs font-mono font-bold text-emerald-600">
                      {(detailsModalJob.signatures || []).filter(s => s.decision === 'Accept').length} / 3 Complete
                    </span>
                  </div>

                  {(detailsModalJob.signatures || []).length === 0 ? (
                    <div className="p-8 text-center border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl text-xs text-slate-400">
                      {isTh ? 'ยังไม่มีบันทึกการลงนามในระบบ สามารถลงนามได้ใน Turnover Workspace' : 'No signatures recorded yet.'}
                    </div>
                  ) : (
                    <div className="space-y-2.5">
                      {(detailsModalJob.signatures || []).map((sig, i) => (
                        <div
                          key={sig.id || i}
                          className="p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 flex items-center justify-between"
                        >
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-bold text-slate-800 dark:text-white">
                                {sig.role}
                              </span>
                              <span className={`px-2 py-0.2 rounded text-[10px] font-bold ${
                                sig.decision === 'Accept'
                                  ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300'
                                  : 'bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300'
                              }`}>
                                {sig.decision}
                              </span>
                            </div>
                            <div className="text-xs text-slate-600 dark:text-slate-300">
                              {sig.name} · {sig.signedAt}
                            </div>
                            {sig.comment && (
                              <p className="text-[11px] text-slate-500 italic mt-0.5">"{sig.comment}"</p>
                            )}
                          </div>

                          <CheckCircle2 size={18} className={sig.decision === 'Accept' ? 'text-emerald-500' : 'text-rose-500'} />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {detailsModalTab === 'punches' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold text-slate-700 dark:text-slate-200 uppercase tracking-wider">
                      {isTh ? 'รายการ Punch List ประจำงาน' : 'Job Punch Items'}
                    </h4>
                    <span className="text-xs font-mono font-bold text-slate-500">
                      {(detailsModalJob.punchList || []).length} {isTh ? 'รายการ' : 'items'}
                    </span>
                  </div>

                  {(detailsModalJob.punchList || []).length === 0 ? (
                    <div className="p-8 text-center border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl text-xs text-slate-400">
                      {isTh ? 'ไม่มี Punch List ค้าง (Zero Punch Clearance)' : 'No punch items for this job.'}
                    </div>
                  ) : (
                    <div className="space-y-2.5">
                      {(detailsModalJob.punchList || []).map((punch, idx) => (
                        <div
                          key={punch.id || idx}
                          className="p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800/80 space-y-2"
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span className={`px-2 py-0.5 rounded text-[10px] font-black ${
                                punch.category === 'A'
                                  ? 'bg-rose-500 text-white'
                                  : punch.category === 'B'
                                    ? 'bg-amber-500 text-white'
                                    : 'bg-blue-500 text-white'
                              }`}>
                                Cat {punch.category}
                              </span>
                              <span className="font-mono text-xs font-bold text-slate-800 dark:text-slate-200">
                                {punch.item || `PL-${idx + 1}`}
                              </span>
                            </div>

                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                              punch.status === 'Resolved' || punch.status === 'Closed'
                                ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300'
                                : 'bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300'
                            }`}>
                              {punch.status}
                            </span>
                          </div>

                          <p className="text-xs text-slate-700 dark:text-slate-300">
                            {punch.description}
                          </p>

                          <div className="flex items-center justify-between text-[11px] text-slate-400 font-mono pt-1 border-t border-slate-100 dark:border-slate-700/60">
                            <span>{punch.contractor || 'BCP Maintenance'}</span>
                            <span>{punch.plannedDate || punch.timestamp}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {detailsModalTab === 'attachments' && (
                <div className="space-y-4">
                  <h4 className="text-xs font-bold text-slate-700 dark:text-slate-200 uppercase tracking-wider">
                    {isTh ? 'ไฟล์เอกสารและรายงานแนบ' : 'Attached Documents'}
                  </h4>

                  {(detailsModalJob.attachments || []).length === 0 ? (
                    <div className="p-8 text-center border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl text-xs text-slate-400">
                      {isTh ? 'ไม่มีเอกสารแนบในใบงานนี้' : 'No attachments found.'}
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {(detailsModalJob.attachments || []).map((att, i) => (
                        <div
                          key={i}
                          className="p-3 rounded-2xl border border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs"
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <FileText size={16} className="text-emerald-500 shrink-0" />
                            <div className="truncate">
                              <p className="font-bold text-slate-800 dark:text-slate-200 truncate">{att.name}</p>
                              <span className="text-[10px] text-slate-400 font-mono">{att.size}</span>
                            </div>
                          </div>
                          <span className="text-slate-400 text-xs">PDF Document</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Modal Footer: DISPATCH TO TURNOVER WORKSPACE */}
            <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/80 flex items-center justify-between shrink-0">
              <button
                type="button"
                onClick={() => setDetailsModalJob(null)}
                className="px-4 py-2 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-300 transition-colors cursor-pointer"
              >
                {isTh ? 'ปิดหน้าต่าง' : 'Close'}
              </button>

              <button
                type="button"
                onClick={() => {
                  const j = detailsModalJob;
                  setDetailsModalJob(null);
                  if (j) handleJumpToWorkspace(j);
                }}
                className="px-5 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-emerald-600/20 cursor-pointer flex items-center gap-1.5 active:scale-95"
              >
                <span>{isTh ? 'ส่งไปยัง Turnover Workspace' : 'Open in Turnover Workspace'}</span>
                <ArrowRight size={14} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 3: EXPORT OPTIONS MODAL                                              */}
      {/* ========================================================================= */}
      {isExportModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="relative w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col">
            <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between shrink-0 bg-slate-50 dark:bg-slate-900/80">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-emerald-600/15 text-emerald-600 flex items-center justify-center font-bold">
                  <Download size={18} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    {isTh ? 'ส่งออกข้อมูลงาน (Export Data)' : 'Export Turnover Data'}
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    {isTh ? 'เลือกขอบเขตและรูปแบบไฟล์ที่ต้องการ' : 'Select scope and export format'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsExportModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-white"
              >
                <X size={16} />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  {isTh ? '1. ขอบเขตข้อมูลที่ต้องการส่งออก (Export Scope)' : '1. Export Scope'}
                </label>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <button
                    type="button"
                    onClick={() => setExportScope('filtered')}
                    className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                      exportScope === 'filtered'
                        ? 'border-emerald-600 bg-emerald-50/50 dark:bg-emerald-950/30 text-emerald-800 dark:text-emerald-200 font-bold'
                        : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300'
                    }`}
                  >
                    <p>{isTh ? 'เฉพาะผลการกรอง' : 'Filtered Only'}</p>
                    <span className="text-[10px] text-slate-400">{filteredJobs.length} {isTh ? 'รายการ' : 'jobs'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setExportScope('all')}
                    className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                      exportScope === 'all'
                        ? 'border-emerald-600 bg-emerald-50/50 dark:bg-emerald-950/30 text-emerald-800 dark:text-emerald-200 font-bold'
                        : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300'
                    }`}
                  >
                    <p>{isTh ? 'ทุกงานในโรงงาน' : 'All Plant Jobs'}</p>
                    <span className="text-[10px] text-slate-400">{plantScopedJobs.length} {isTh ? 'รายการ' : 'jobs'}</span>
                  </button>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  {isTh ? '2. รูปแบบไฟล์ (Export Format)' : '2. Format'}
                </label>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <button
                    type="button"
                    onClick={() => setExportFormat('csv')}
                    className={`p-3 rounded-xl border text-center font-bold transition-all cursor-pointer ${
                      exportFormat === 'csv'
                        ? 'border-emerald-600 bg-emerald-50/50 dark:bg-emerald-950/30 text-emerald-800 dark:text-emerald-200'
                        : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300'
                    }`}
                  >
                    CSV Spreadsheet (.csv)
                  </button>

                  <button
                    type="button"
                    onClick={() => setExportFormat('json')}
                    className={`p-3 rounded-xl border text-center font-bold transition-all cursor-pointer ${
                      exportFormat === 'json'
                        ? 'border-emerald-600 bg-emerald-50/50 dark:bg-emerald-950/30 text-emerald-800 dark:text-emerald-200'
                        : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300'
                    }`}
                  >
                    JSON Full Backup (.json)
                  </button>
                </div>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsExportModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-300"
                >
                  {isTh ? 'ยกเลิก' : 'Cancel'}
                </button>
                <button
                  type="button"
                  onClick={handleExecuteExport}
                  className="px-5 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-emerald-600/20"
                >
                  {isTh ? 'ดาวน์โหลดทันที' : 'Download Now'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
