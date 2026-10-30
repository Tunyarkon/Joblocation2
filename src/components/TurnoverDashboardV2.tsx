import React, { useState, useMemo, useEffect } from 'react';
import {
  CheckCircle2, AlertTriangle, AlertOctagon, Clock, FileText,
  RefreshCw, Download, Search, ChevronDown,
  ShieldCheck, X, ArrowLeft, Check,
  AlertCircle, ChevronUp, ExternalLink, Sparkles,
  Layers, Filter, RotateCcw, PenTool, Eye,
  Building2, Hash, FileCheck, CheckSquare, Wrench,
  SlidersHorizontal, Printer, BarChart3
} from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { usePlantTurnShared, JobRecord, PunchItem, SignatureRecord } from '../context/PlantTurnSharedContext';
import { isPunchItemOpen, getAcceptanceStatus } from '../utils/turnoverRules';
import TurnoverCpClosingDashboard from './TurnoverCpClosingDashboard';

// =========================================================================
// GATE RULES (shared with the Turnover Workspace via utils/turnoverRules)
// =========================================================================
export const getJobAcceptanceStatus = (job: JobRecord) => getAcceptanceStatus(job);

/** Sign gate passes only when the Sign tab has recorded the job as Accepted. */
export const isJobSignaturesComplete = (job: JobRecord): boolean => getAcceptanceStatus(job) === 'Accepted';

export const getJobOpenPunches = (job: JobRecord): PunchItem[] => {
  return (job.punchList || []).filter(p => isPunchItemOpen(p));
};

export const getJobOpenCatAPunches = (job: JobRecord): PunchItem[] => {
  return (job.punchList || []).filter(p => p.category === 'A' && isPunchItemOpen(p));
};

export const getJobTurnoverStatus = (job: JobRecord): {
  status: 'Completed' | 'Pending Sign-off' | 'Pending Punch Closure' | 'Blocked (Cat A)' | 'In Progress';
  color: string;
  badgeBg: string;
  isCompleted: boolean;
} => {
  const openPunches = getJobOpenPunches(job);
  const openCatA = getJobOpenCatAPunches(job);
  const isSigned = isJobSignaturesComplete(job);

  // GATE 1: Critical Cat A punch blocker
  if (openCatA.length > 0) {
    return {
      status: 'Blocked (Cat A)',
      color: 'text-rose-600 dark:text-rose-400',
      badgeBg: 'bg-rose-50 border-rose-200 text-rose-700 dark:bg-rose-500/15 dark:border-rose-500/30 dark:text-rose-300',
      isCompleted: false
    };
  }

  // GATE 2: Required Signatures
  if (!isSigned) {
    return {
      status: 'Pending Sign-off',
      color: 'text-amber-600 dark:text-amber-400',
      badgeBg: 'bg-amber-50 border-amber-200 text-amber-700 dark:bg-amber-500/15 dark:border-amber-500/30 dark:text-amber-300',
      isCompleted: false
    };
  }

  // GATE 3: Punch List Closure
  if (openPunches.length > 0) {
    return {
      status: 'Pending Punch Closure',
      color: 'text-blue-600 dark:text-blue-400',
      badgeBg: 'bg-blue-50 border-blue-200 text-blue-700 dark:bg-blue-500/15 dark:border-blue-500/30 dark:text-blue-300',
      isCompleted: false
    };
  }

  // ALL GATES CLEARED -> COMPLETED
  return {
    status: 'Completed',
    color: 'text-emerald-600 dark:text-emerald-400',
    badgeBg: 'bg-emerald-50 border-emerald-200 text-emerald-700 dark:bg-emerald-500/15 dark:border-emerald-500/30 dark:text-emerald-300',
    isCompleted: true
  };
};

export const getJobWorkProgress = (job: JobRecord): number => {
  const isComplete = isJobSignaturesComplete(job) && getJobOpenPunches(job).length === 0;
  if (isComplete) return 100;
  const hasOps = job.signatures.some(s => s.role.toLowerCase().includes('operat'));
  const hasLead = job.signatures.some(s => s.role.toLowerCase().includes('owner') || s.role.toLowerCase().includes('lead') || s.role.toLowerCase().includes('maint'));
  if (hasOps && hasLead) return 100; // Physical work 100% complete, waiting on punches or cert
  if (hasOps || hasLead) return 95;
  if ((job.punchList || []).length > 0) return 85;
  return 80;
};

interface TurnoverDashboardV2Props {
  onBackToV1?: () => void;
  onNavigateToWorkspace?: (jobId?: string, tab?: 'detail' | 'turnover', subTab?: 'sign' | 'punchlist') => void;
  /** Plant selected in the top header bar; the dashboard follows it. */
  globalPlantFilter?: 'All' | 'Phra Khanong' | 'Sriracha';
  initialDashboardTab?: 'handover' | 'cp-closing';
}

export default function TurnoverDashboardV2({
  onBackToV1,
  onNavigateToWorkspace,
  globalPlantFilter = 'All',
  initialDashboardTab = 'handover'
}: TurnoverDashboardV2Props) {
  const { isTh } = useLanguage();
  const [activeDashboardTab, setActiveDashboardTab] = useState<'handover' | 'cp-closing'>(initialDashboardTab);

  useEffect(() => {
    setActiveDashboardTab(initialDashboardTab);
  }, [initialDashboardTab]);

  // REAL DATA SOURCE: Directly linked with Turnover (T/O) via PlantTurnSharedContext
  const {
    jobs,
    setSelectedJobId,
  } = usePlantTurnShared();

  // Filters
  const [plantFilter, setPlantFilter] = useState<'All' | 'Phra Khanong' | 'Sriracha'>(globalPlantFilter);
  const [eventFilter, setEventFilter] = useState<string>('All');
  const [unitFilter, setUnitFilter] = useState<string>('All');

  // Header Plant selector drives the dashboard; reset dependent filters that may not exist in the new plant
  useEffect(() => {
    setPlantFilter(globalPlantFilter);
    setEventFilter('All');
    setUnitFilter('All');
  }, [globalPlantFilter]);
  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [groupByUnit, setGroupByUnit] = useState<boolean>(false);

  // UI States
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isMoreActionsOpen, setIsMoreActionsOpen] = useState<boolean>(false);
  const [isStagePipelineOpen, setIsStagePipelineOpen] = useState<boolean>(false);

  // Centered Modal Popups State - Using IDs to guarantee real-time reactive re-rendering
  const [activeDetailJobId, setActiveDetailJobId] = useState<string | null>(null);
  const [isExecutiveBriefingOpen, setIsExecutiveBriefingOpen] = useState<boolean>(false);

  // Dynamically derived active jobs to eliminate stale closures
  const activeDetailJob = useMemo(() => {
    return jobs.find(j => j.id === activeDetailJobId) || null;
  }, [jobs, activeDetailJobId]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const handleRefresh = () => {
    setIsRefreshing(true);
    setTimeout(() => {
      setIsRefreshing(false);
      showToast('Dashboard synchronized with Turnover (T/O) master database.');
    }, 400);
  };

  // Distinct Filter Options derived from live shared jobs
  const availableEvents = useMemo(() => {
    const set = new Set<string>();
    jobs.forEach(j => {
      if (j.eventName) set.add(j.eventName);
    });
    return ['All', ...Array.from(set)];
  }, [jobs]);

  const availableUnits = useMemo(() => {
    const set = new Set<string>();
    jobs.forEach(j => {
      if ((plantFilter === 'All' || j.plant === plantFilter) && j.unit) {
        set.add(j.unit.split(' ')[0]);
      }
    });
    return ['All', ...Array.from(set)];
  }, [jobs, plantFilter]);

  // Base scope jobs (Filtered by Plant, Event, Unit)
  const baseScopedJobs = useMemo(() => {
    return jobs.filter(j => {
      if (plantFilter !== 'All' && j.plant !== plantFilter) return false;
      if (eventFilter !== 'All' && j.eventName !== eventFilter) return false;
      if (unitFilter !== 'All' && !j.unit.includes(unitFilter)) return false;
      return true;
    });
  }, [jobs, plantFilter, eventFilter, unitFilter]);

  // FOUR MAIN KPI CARDS (Calculated from live linked jobs)
  const kpiData = useMemo(() => {
    const totalJobs = baseScopedJobs.length;
    let completedCount = 0;
    let pendingSignCount = 0;
    let openPunchJobCount = 0;

    baseScopedJobs.forEach(j => {
      const toInfo = getJobTurnoverStatus(j);
      if (toInfo.isCompleted) completedCount++;
      if (!isJobSignaturesComplete(j)) pendingSignCount++;
      if (getJobOpenPunches(j).length > 0) openPunchJobCount++;
    });

    return {
      totalJobs,
      completedCount,
      completedPercent: totalJobs > 0 ? Math.round((completedCount / totalJobs) * 100) : 0,
      pendingSignCount,
      openPunchJobCount
    };
  }, [baseScopedJobs]);

  // Filtered Job List (Base Scope + Status Filter + Search)
  const filteredJobs = useMemo(() => {
    return baseScopedJobs.filter(j => {
      const toInfo = getJobTurnoverStatus(j);

      if (statusFilter === 'Completed' && !toInfo.isCompleted) return false;
      if (statusFilter === 'InProgress' && toInfo.isCompleted) return false;
      if (statusFilter === 'PendingSign' && isJobSignaturesComplete(j)) return false;
      if (statusFilter === 'OpenPunch' && getJobOpenPunches(j).length === 0) return false;
      if (statusFilter === 'CriticalCatA' && getJobOpenCatAPunches(j).length === 0) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchNo = (j.jobNo || '').toLowerCase().includes(q);
        const matchTitle = (j.title || '').toLowerCase().includes(q);
        const matchTag = (j.assetTag || '').toLowerCase().includes(q);
        const matchUnit = (j.unit || '').toLowerCase().includes(q);
        const matchWo = (j.workOrder || '').toLowerCase().includes(q);
        if (!matchNo && !matchTitle && !matchTag && !matchUnit && !matchWo) return false;
      }

      return true;
    });
  }, [baseScopedJobs, statusFilter, searchQuery]);

  // Grouped jobs (if groupByUnit is toggled)
  const groupedJobsByUnit = useMemo(() => {
    if (!groupByUnit) return null;
    const groups: Record<string, JobRecord[]> = {};
    filteredJobs.forEach(job => {
      const u = job.unit || 'General Area';
      if (!groups[u]) groups[u] = [];
      groups[u].push(job);
    });
    return groups;
  }, [filteredJobs, groupByUnit]);

  // JOBS REQUIRING ATTENTION (Sorted strictly: 1. Cat A, 2. Overdue, 3. Pending Sign)
  const attentionItems = useMemo(() => {
    const items: Array<{
      id: string;
      job: JobRecord;
      priority: number;
      issueType: 'Critical Cat A Punch' | 'Overdue Action' | 'Pending Sign-off' | 'Open Punch Item';
      issueDescription: string;
      responsible: string;
      dueDate: string;
      badgeColor: string;
    }> = [];

    baseScopedJobs.forEach(j => {
      const openCatA = getJobOpenCatAPunches(j);
      const openPunches = getJobOpenPunches(j);
      const isSigned = isJobSignaturesComplete(j);

      // 1. Critical Cat A Punches
      openCatA.forEach(p => {
        items.push({
          id: `att-${p.id}`,
          job: j,
          priority: 1,
          issueType: 'Critical Cat A Punch',
          issueDescription: p.description,
          responsible: p.reportedBy || 'QA/QC Specialist',
          dueDate: p.timestamp || 'Immediate',
          badgeColor: 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-500/20 dark:text-rose-300 dark:border-rose-500/40'
        });
      });

      // 2. Pending Sign-offs (if no Cat A already listed)
      if (!isSigned && openCatA.length === 0) {
        const accStatus = getAcceptanceStatus(j);
        const description =
          accStatus === 'Pending Re-Accept'
            ? 'All punch items closed & verified — awaiting Re-Accept on the Sign tab'
            : accStatus === 'Not Accepted'
              ? 'Not Accepted — remedial punch items must be closed, then Re-Accept'
              : 'Awaiting acceptance decision & signature';
        items.push({
          id: `att-sig-${j.id}`,
          job: j,
          priority: 2,
          issueType: 'Pending Sign-off',
          issueDescription: description,
          responsible: accStatus === 'Pending Re-Accept' ? 'Authorized Acceptor' : 'Job Owner / Operations',
          dueDate: 'Immediate',
          badgeColor: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-500/20 dark:text-amber-300 dark:border-amber-500/40'
        });
      }

      // 3. Other Open Punches (B/C)
      if (openPunches.length > 0 && openCatA.length === 0 && isSigned) {
        items.push({
          id: `att-p-${j.id}`,
          job: j,
          priority: 3,
          issueType: 'Open Punch Item',
          issueDescription: `${openPunches.length} punch items open: ${openPunches[0].description}`,
          responsible: openPunches[0].reportedBy || 'Inspection Team',
          dueDate: 'Before Handover',
          badgeColor: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-500/20 dark:text-blue-300 dark:border-blue-500/40'
        });
      }
    });

    return items.sort((a, b) => a.priority - b.priority);
  }, [baseScopedJobs]);

  // Navigate to Turnover Workspace directly on this job with tab & subtab support
  const handleOpenJobInWorkspace = (
    jobId: string,
    tab: 'detail' | 'turnover' = 'turnover',
    subTab: 'sign' | 'punchlist' = 'sign'
  ) => {
    setSelectedJobId(jobId);
    if (onNavigateToWorkspace) {
      onNavigateToWorkspace(jobId, tab, subTab);
    } else {
      showToast(`Selected ${jobId}. Navigate to Turnover (T/O) menu to view.`);
    }
  };

  // Export CSV Summary of real jobs
  const handleExportCSV = () => {
    const headers = [
      'Job ID', 'Plant', 'Unit', 'Work Order', 'Equipment Tag',
      'Job Description', 'Work Progress (%)', 'Signatures Done',
      'Open Punch Count', 'Turnover Status'
    ];

    const rows = filteredJobs.map(j => {
      const toInfo = getJobTurnoverStatus(j);
      const signedCount = (j.signatures || []).filter(s => s.decision === 'Accept').length;
      const openPunches = getJobOpenPunches(j).length;
      return [
        j.jobNo,
        j.plant,
        `"${j.unit}"`,
        j.workOrder,
        j.assetTag || '',
        `"${(j.title || '').replace(/"/g, '""')}"`,
        `${getJobWorkProgress(j)}%`,
        signedCount,
        openPunches,
        toInfo.status
      ].join(',');
    });

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Turnover_Job_Summary_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('Exported Turnover Job Summary as CSV.');
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 p-4 md:p-6 space-y-5 transition-colors duration-200">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-5 right-5 z-50 flex items-center gap-3 px-4 py-3 rounded-xl bg-white dark:bg-slate-900 border border-emerald-500/40 text-emerald-800 dark:text-emerald-300 shadow-xl dark:shadow-emerald-950/40 animate-in fade-in slide-in-from-top-4">
          <CheckCircle2 size={18} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
          <span className="text-xs md:text-sm font-medium">{toastMessage}</span>
          <button onClick={() => setToastMessage(null)} className="text-slate-400 hover:text-slate-700 dark:hover:text-white ml-2 cursor-pointer">
            <X size={14} />
          </button>
        </div>
      )}

      {/* =========================================================================
          SECTION 1: HEADER & FILTERS
         ========================================================================= */}
      <header className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-3 border-b border-slate-200 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl md:text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
              T/O Dashboard
            </h1>
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold tracking-wider uppercase bg-emerald-50 dark:bg-emerald-500/15 border border-emerald-200 dark:border-emerald-500/30 text-emerald-700 dark:text-emerald-300">
              <Sparkles size={11} />
              Linked with Turnover T/O
            </span>
          </div>
          <p className="text-xs md:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Turnover Status & Handover Tracking • Live Synced with Field Records
          </p>
        </div>

        {/* Header Actions */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Refresh */}
          <button
            type="button"
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800/80 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-300 dark:border-slate-700 transition-colors disabled:opacity-60 cursor-pointer shadow-2xs"
          >
            <RefreshCw size={14} className={isRefreshing ? 'animate-spin text-emerald-600 dark:text-emerald-400' : ''} />
            <span>Sync Field Data</span>
          </button>

          {/* Export Summary */}
          <button
            type="button"
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800/80 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-300 dark:border-slate-700 transition-colors cursor-pointer shadow-2xs"
          >
            <Download size={14} />
            <span>Export Summary</span>
          </button>

          {/* More Actions Dropdown */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setIsMoreActionsOpen(!isMoreActionsOpen)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium bg-slate-800 dark:bg-slate-700 text-white hover:bg-slate-700 dark:hover:bg-slate-600 transition-colors cursor-pointer shadow-xs"
            >
              <span>More Actions</span>
              <ChevronDown size={14} />
            </button>

            {isMoreActionsOpen && (
              <div className="absolute right-0 mt-2 w-52 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-750 shadow-2xl py-1 z-30 divide-y divide-slate-100 dark:divide-slate-800 animate-in fade-in">
                <div className="p-1">
                  <button
                    onClick={() => {
                      setIsMoreActionsOpen(false);
                      setIsExecutiveBriefingOpen(true);
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-left text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg cursor-pointer"
                  >
                    <FileText size={14} className="text-teal-600 dark:text-teal-400" />
                    <span>Executive Briefing</span>
                  </button>
                  <button
                    onClick={() => {
                      setIsMoreActionsOpen(false);
                      window.print();
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-left text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg cursor-pointer"
                  >
                    <Printer size={14} className="text-blue-600 dark:text-blue-400" />
                    <span>Print Summary</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Turnover S/D & TA Navigation Bar (Handover Status vs CP Closing Dashboard) */}
      <div className="flex items-center justify-between flex-wrap gap-3 bg-white dark:bg-slate-900 p-2 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs">
        <div className="inline-flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            onClick={() => setActiveDashboardTab('handover')}
            className={`px-4 py-2 rounded-xl text-xs font-extrabold transition-all cursor-pointer flex items-center gap-2 ${
              activeDashboardTab === 'handover'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <ShieldCheck size={15} />
            <span>{isTh ? 'สถานะการส่งมอบระบบ (T/O Handover Status)' : 'T/O Handover Status'}</span>
            <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-mono ${
              activeDashboardTab === 'handover' ? 'bg-white/20 text-white' : 'bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
            }`}>
              {kpiData.totalJobs}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveDashboardTab('cp-closing')}
            className={`px-4 py-2 rounded-xl text-xs font-extrabold transition-all cursor-pointer flex items-center gap-2 ${
              activeDashboardTab === 'cp-closing'
                ? 'bg-[#002060] text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <BarChart3 size={15} />
            <span>CP Closing Dashboard</span>
            <span className="px-1.5 py-0.5 rounded-full text-[10px] font-mono font-extrabold bg-[#10B981] text-white">
              164 CP (100%)
            </span>
          </button>
        </div>

        <span className="text-[11px] text-slate-500 dark:text-slate-400 px-2 hidden md:inline">
          {activeDashboardTab === 'cp-closing'
            ? 'Control Point (CP) & System Closing Matrix • Area S1 / S2 Cross-Filtering'
            : 'Real-time Gate Verification, Digital Signatures & Punch Closure'}
        </span>
      </div>

      {activeDashboardTab === 'cp-closing' ? (
        <TurnoverCpClosingDashboard
          globalPlantFilter={plantFilter}
          onNavigateToWorkspace={(jobId) => handleOpenJobInWorkspace(jobId || 'job-101', 'turnover', 'sign')}
        />
      ) : (
        <>
      {/* Filters Bar */}
      <section className="bg-white dark:bg-slate-900/70 border border-slate-200 dark:border-slate-800 rounded-xl p-3 flex flex-wrap items-center gap-3 text-xs shadow-xs transition-colors">
        {/* Plant Filter */}
        <div className="flex items-center gap-2">
          <span className="text-slate-500 dark:text-slate-400 font-medium">Plant:</span>
          <div className="flex bg-slate-100 dark:bg-slate-950 p-0.5 rounded-lg border border-slate-200 dark:border-slate-800">
            {(['All', 'Phra Khanong', 'Sriracha'] as const).map(p => (
              <button
                key={p}
                type="button"
                onClick={() => setPlantFilter(p)}
                className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors cursor-pointer ${
                  plantFilter === p
                    ? 'bg-slate-800 dark:bg-slate-700 text-white shadow-xs font-semibold'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                {p === 'All' ? 'All Plants' : p}
              </button>
            ))}
          </div>
        </div>

        {/* Event Filter */}
        <div className="flex items-center gap-2">
          <span className="text-slate-500 dark:text-slate-400 font-medium">Event:</span>
          <select
            value={eventFilter}
            onChange={e => setEventFilter(e.target.value)}
            className="bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-lg px-2.5 py-1 text-slate-800 dark:text-slate-200 focus:outline-none focus:border-slate-500 text-xs shadow-2xs"
          >
            {availableEvents.map(evt => (
              <option key={evt} value={evt}>{evt}</option>
            ))}
          </select>
        </div>

        {/* Unit Filter */}
        <div className="flex items-center gap-2">
          <span className="text-slate-500 dark:text-slate-400 font-medium">Unit:</span>
          <select
            value={unitFilter}
            onChange={e => setUnitFilter(e.target.value)}
            className="bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-lg px-2.5 py-1 text-slate-800 dark:text-slate-200 focus:outline-none focus:border-slate-500 text-xs shadow-2xs"
          >
            {availableUnits.map(u => (
              <option key={u} value={u}>{u === 'All' ? 'All Units' : u}</option>
            ))}
          </select>
        </div>

        {/* Status Filter */}
        <div className="flex items-center gap-2">
          <span className="text-slate-500 dark:text-slate-400 font-medium">Job Status:</span>
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-lg px-2.5 py-1 text-slate-800 dark:text-slate-200 focus:outline-none focus:border-slate-500 text-xs shadow-2xs"
          >
            <option value="All">All Statuses</option>
            <option value="InProgress">In Progress</option>
            <option value="Completed">Completed Only</option>
            <option value="PendingSign">Pending Sign-off</option>
            <option value="OpenPunch">Jobs with Open Punch</option>
            <option value="CriticalCatA">Critical Category A</option>
          </select>
        </div>

        {/* Search */}
        <div className="relative flex-1 min-w-[200px] ml-auto">
          <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
          <input
            type="text"
            placeholder="Search Job ID, Tag, WO, Description..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-lg pl-8 pr-7 py-1 text-slate-800 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-slate-500 text-xs shadow-2xs"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 cursor-pointer"
            >
              <X size={12} />
            </button>
          )}
        </div>
      </section>

      {/* =========================================================================
          SECTION 2: FOUR MAIN KPI CARDS (ONLY 4 CARDS)
         ========================================================================= */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1: Total Jobs */}
        <button
          type="button"
          onClick={() => setStatusFilter('All')}
          className={`text-left p-4 rounded-2xl border transition-all cursor-pointer shadow-xs flex flex-col justify-between ${
            statusFilter === 'All'
              ? 'bg-slate-100 dark:bg-slate-800/80 border-slate-400 dark:border-slate-600 ring-2 ring-slate-400/20'
              : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-300'
          }`}
        >
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300">
              Total Jobs
            </span>
            <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-600 dark:text-slate-300">
              <Layers size={16} />
            </div>
          </div>
          <div>
            <div className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              {kpiData.totalJobs}
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
              Turnover jobs in scope
            </p>
          </div>
        </button>

        {/* KPI 2: Completed */}
        <button
          type="button"
          onClick={() => setStatusFilter(prev => prev === 'Completed' ? 'All' : 'Completed')}
          className={`text-left p-4 rounded-2xl border transition-all cursor-pointer shadow-xs flex flex-col justify-between ${
            statusFilter === 'Completed'
              ? 'bg-emerald-50/70 dark:bg-emerald-950/30 border-emerald-500 ring-2 ring-emerald-500/20'
              : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-emerald-300'
          }`}
        >
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
              Completed
            </span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-500/10 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 size={16} />
            </div>
          </div>
          <div>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                {kpiData.completedCount}
              </span>
              <span className="text-xs text-slate-500 dark:text-slate-400">
                ({kpiData.completedPercent}%)
              </span>
            </div>
            <p className="text-[11px] text-emerald-700 dark:text-emerald-400 mt-1 font-medium">
              100% Signed & 0 Open Punch
            </p>
          </div>
        </button>

        {/* KPI 3: Pending Sign-off */}
        <button
          type="button"
          onClick={() => setStatusFilter(prev => prev === 'PendingSign' ? 'All' : 'PendingSign')}
          className={`text-left p-4 rounded-2xl border transition-all cursor-pointer shadow-xs flex flex-col justify-between ${
            statusFilter === 'PendingSign'
              ? 'bg-amber-50/70 dark:bg-amber-950/30 border-amber-500 ring-2 ring-amber-500/20'
              : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-amber-300'
          }`}
        >
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-amber-600 dark:text-amber-400">
              Pending Sign-off
            </span>
            <div className="w-8 h-8 rounded-lg bg-amber-50 dark:bg-amber-500/10 flex items-center justify-center text-amber-600 dark:text-amber-400">
              <Clock size={16} />
            </div>
          </div>
          <div>
            <div className="text-3xl font-extrabold text-amber-600 dark:text-amber-400 tracking-tight">
              {kpiData.pendingSignCount}
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
              Awaiting required approval(s)
            </p>
          </div>
        </button>

        {/* KPI 4: Jobs with Open Punch */}
        <button
          type="button"
          onClick={() => setStatusFilter(prev => prev === 'OpenPunch' ? 'All' : 'OpenPunch')}
          className={`text-left p-4 rounded-2xl border transition-all cursor-pointer shadow-xs flex flex-col justify-between ${
            statusFilter === 'OpenPunch'
              ? 'bg-rose-50/70 dark:bg-rose-950/30 border-rose-500 ring-2 ring-rose-500/20'
              : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-rose-300'
          }`}
        >
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-rose-600 dark:text-rose-400">
              Jobs with Open Punch
            </span>
            <div className="w-8 h-8 rounded-lg bg-rose-50 dark:bg-rose-500/10 flex items-center justify-center text-rose-600 dark:text-rose-400">
              <AlertTriangle size={16} />
            </div>
          </div>
          <div>
            <div className="text-3xl font-extrabold text-rose-600 dark:text-rose-400 tracking-tight">
              {kpiData.openPunchJobCount}
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
              Has unresolved Cat A, B, or C
            </p>
          </div>
        </button>
      </section>

      {/* Active Filter Indicator */}
      {statusFilter !== 'All' && (
        <div className="flex items-center justify-between bg-slate-100 dark:bg-slate-900 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 text-xs">
          <div className="flex items-center gap-2">
            <Filter size={13} className="text-slate-500" />
            <span className="text-slate-600 dark:text-slate-400">Filtered by KPI:</span>
            <span className="font-semibold text-slate-900 dark:text-white px-2 py-0.5 rounded bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
              {statusFilter}
            </span>
            <span className="text-slate-500">({filteredJobs.length} jobs matched)</span>
          </div>
          <button
            type="button"
            onClick={() => setStatusFilter('All')}
            className="text-xs font-semibold text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white flex items-center gap-1 cursor-pointer"
          >
            <RotateCcw size={12} />
            Reset Filter
          </button>
        </div>
      )}

      {/* =========================================================================
          SECTION 3: JOBS REQUIRING ATTENTION (COMPACT ATTENTION PANEL)
         ========================================================================= */}
      <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-xs transition-colors">
        <div className="px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle size={15} className="text-amber-500" />
            <h2 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
              Jobs Requiring Attention
            </h2>
            <span className="text-[10px] px-2 py-0.2 rounded-full font-bold bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-500/15 dark:text-amber-300 dark:border-amber-500/30">
              {attentionItems.length}
            </span>
          </div>
          <span className="text-[11px] text-slate-400">
            Sorted by Critical Blockers → Overdue Actions → Pending Sign-offs
          </span>
        </div>

        {attentionItems.length === 0 ? (
          <div className="p-4 text-center text-slate-400 text-xs">
            <CheckCircle2 size={18} className="text-emerald-500 inline mr-1.5" />
            No actionable blocking issues found in selected scope.
          </div>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-800/80 max-h-56 overflow-y-auto">
            {attentionItems.map(item => (
              <div
                key={item.id}
                className="p-3 hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
              >
                <div className="flex items-start gap-2.5 min-w-0">
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border shrink-0 mt-0.5 ${item.badgeColor}`}>
                    {item.issueType}
                  </span>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <strong className="text-slate-900 dark:text-white font-bold">{item.job.jobNo}</strong>
                      <span className="text-slate-400">•</span>
                      <span className="text-slate-600 dark:text-slate-300 font-mono text-[11px]">{item.job.assetTag || item.job.workOrder}</span>
                      <span className="text-slate-400 text-[11px]">({(item.job.unit || '').split(' ')[0] || '-'})</span>
                    </div>
                    <p className="text-slate-700 dark:text-slate-300 text-xs mt-0.5 line-clamp-1">{item.issueDescription}</p>
                    <div className="text-[10px] text-slate-400 flex items-center gap-3 mt-0.5">
                      <span>Responsible: <strong className="text-slate-600 dark:text-slate-300">{item.responsible}</strong></span>
                      <span>•</span>
                      <span>Due: <strong className={item.dueDate === 'Immediate' ? 'text-amber-600 dark:text-amber-400' : 'text-slate-600 dark:text-slate-300'}>{item.dueDate}</strong></span>
                    </div>
                  </div>
                </div>

                <div className="shrink-0 self-end sm:self-center flex items-center gap-1.5">
                  {item.issueType === 'Pending Sign-off' ? (
                    <button
                      type="button"
                      onClick={() => handleOpenJobInWorkspace(item.job.id, 'turnover', 'sign')}
                      className="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold shadow-xs flex items-center gap-1.5 transition cursor-pointer"
                      title="Link to sign in Turnover Workspace"
                    >
                      <PenTool size={13} />
                      <span>Go to Sign</span>
                      <ExternalLink size={12} />
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setActiveDetailJobId(item.job.id)}
                      className="px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold border border-slate-200 dark:border-slate-700 transition cursor-pointer flex items-center gap-1"
                    >
                      <Eye size={12} />
                      <span>View Job</span>
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* =========================================================================
          SECTION 4: TURNOVER JOB LIST (MAIN SECTION)
         ========================================================================= */}
      <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-xs transition-colors">
        {/* Table Control Header */}
        <div className="px-4 py-3 bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">
              Turnover Job List
            </h2>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Showing {filteredJobs.length} Turnover jobs linked with field records
            </p>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            {/* Quick Filter Chips */}
            <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-950 p-0.5 rounded-lg border border-slate-200 dark:border-slate-800 text-xs">
              {(['All', 'InProgress', 'Completed', 'PendingSign', 'OpenPunch'] as const).map(tabKey => (
                <button
                  key={tabKey}
                  type="button"
                  onClick={() => setStatusFilter(tabKey)}
                  className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors cursor-pointer ${
                    statusFilter === tabKey
                      ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-bold shadow-2xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                  }`}
                >
                  {tabKey === 'All' && 'All'}
                  {tabKey === 'InProgress' && 'In Progress'}
                  {tabKey === 'Completed' && 'Completed'}
                  {tabKey === 'PendingSign' && 'Pending Sign'}
                  {tabKey === 'OpenPunch' && 'Open Punch'}
                </button>
              ))}
            </div>

            {/* Group by Unit Toggle */}
            <label className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-400 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={groupByUnit}
                onChange={e => setGroupByUnit(e.target.checked)}
                className="rounded border-slate-300 text-slate-800 focus:ring-0 cursor-pointer"
              />
              <span>Group by Unit</span>
            </label>
          </div>
        </div>

        {/* Responsive Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-100/80 dark:bg-slate-950/60 text-slate-600 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800 text-[11px] uppercase tracking-wider font-semibold">
              <tr>
                <th className="py-3 px-3.5">Job ID</th>
                <th className="py-3 px-3">Job Description / Equipment</th>
                <th className="py-3 px-3">Plant / Unit</th>
                <th className="py-3 px-3 text-center">Work Progress</th>
                <th className="py-3 px-3 text-center">Sign-off Progress</th>
                <th className="py-3 px-3 text-center">Open Punch</th>
                <th className="py-3 px-3">T/O Status</th>
                <th className="py-3 px-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80 text-slate-700 dark:text-slate-300">
              {filteredJobs.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-10 text-center text-slate-400 dark:text-slate-500">
                    No Turnover jobs match the selected criteria.
                  </td>
                </tr>
              ) : groupedJobsByUnit ? (
                Object.entries(groupedJobsByUnit).map(([unitName, jList]: [string, JobRecord[]]) => (
                  <React.Fragment key={unitName}>
                    <tr className="bg-slate-100/50 dark:bg-slate-800/50">
                      <td colSpan={8} className="py-2 px-3.5 font-bold text-xs text-slate-800 dark:text-slate-200">
                        📍 {unitName} ({jList.length} jobs)
                      </td>
                    </tr>
                    {jList.map(job => renderJobRow(job))}
                  </React.Fragment>
                ))
              ) : (
                filteredJobs.map(job => renderJobRow(job))
              )}
            </tbody>
          </table>
        </div>

        {/* Optional Expandable 4-Stage Pipeline Summary */}
        <div className="border-t border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/60">
          <button
            type="button"
            onClick={() => setIsStagePipelineOpen(!isStagePipelineOpen)}
            className="w-full px-4 py-2.5 text-xs text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 flex items-center justify-between cursor-pointer"
          >
            <span className="font-semibold flex items-center gap-1.5">
              <SlidersHorizontal size={13} />
              Optional Details: Four-Stage Turnover Pipeline Progress
            </span>
            <span>{isStagePipelineOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}</span>
          </button>

          {isStagePipelineOpen && (
            <div className="p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950/40">
              <button
                type="button"
                onClick={() => {
                  setStatusFilter('Completed');
                  showToast('Stage 1 filtered: Showing completed documentation jobs.');
                }}
                className="text-left p-3 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-emerald-400 dark:hover:border-emerald-500/50 transition cursor-pointer bg-slate-50/50 dark:bg-slate-900/40 group"
              >
                <div className="flex items-center justify-between">
                  <span className="text-[10px] uppercase font-bold text-slate-400">Stage 1</span>
                  <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400">100%</span>
                </div>
                <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 mt-0.5 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">Documentation & Blind List</h4>
                <div className="w-full bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full mt-2">
                  <div className="bg-emerald-500 h-full rounded-full" style={{ width: '100%' }} />
                </div>
                <span className="text-[10px] text-slate-400 mt-1 block">Click to filter jobs ↗</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setStatusFilter('OpenPunch');
                  showToast('Stage 2 filtered: Showing jobs under inspection & punch closure.');
                }}
                className="text-left p-3 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-teal-400 dark:hover:border-teal-500/50 transition cursor-pointer bg-slate-50/50 dark:bg-slate-900/40 group"
              >
                <div className="flex items-center justify-between">
                  <span className="text-[10px] uppercase font-bold text-slate-400">Stage 2</span>
                  <span className="text-[10px] font-bold text-teal-600 dark:text-teal-400">89%</span>
                </div>
                <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 mt-0.5 group-hover:text-teal-600 dark:group-hover:text-teal-400 transition-colors">Quality Inspection & NDT</h4>
                <div className="w-full bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full mt-2">
                  <div className="bg-teal-500 h-full rounded-full" style={{ width: '89%' }} />
                </div>
                <span className="text-[10px] text-slate-400 mt-1 block">Click to filter jobs ↗</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setStatusFilter('InProgress');
                  showToast('Stage 3 filtered: Showing jobs in active mechanical tightening.');
                }}
                className="text-left p-3 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-blue-400 dark:hover:border-blue-500/50 transition cursor-pointer bg-slate-50/50 dark:bg-slate-900/40 group"
              >
                <div className="flex items-center justify-between">
                  <span className="text-[10px] uppercase font-bold text-slate-400">Stage 3</span>
                  <span className="text-[10px] font-bold text-blue-600 dark:text-blue-400">78%</span>
                </div>
                <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 mt-0.5 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">Flange Tightness & Blinds Removal</h4>
                <div className="w-full bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full mt-2">
                  <div className="bg-blue-500 h-full rounded-full" style={{ width: '78%' }} />
                </div>
                <span className="text-[10px] text-slate-400 mt-1 block">Click to filter jobs ↗</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setStatusFilter('PendingSign');
                  showToast('Stage 4 filtered: Showing jobs pending final certificates.');
                }}
                className="text-left p-3 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-amber-400 dark:hover:border-amber-500/50 transition cursor-pointer bg-slate-50/50 dark:bg-slate-900/40 group"
              >
                <div className="flex items-center justify-between">
                  <span className="text-[10px] uppercase font-bold text-slate-400">Stage 4</span>
                  <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400">35%</span>
                </div>
                <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 mt-0.5 group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors">T/O Certificate & PSSR</h4>
                <div className="w-full bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full mt-2">
                  <div className="bg-amber-500 h-full rounded-full" style={{ width: '35%' }} />
                </div>
                <span className="text-[10px] text-slate-400 mt-1 block">Click to filter jobs ↗</span>
              </button>
            </div>
          )}
        </div>
      </section>



      {/* =========================================================================
          MODAL POPUP 3: CENTERED JOB OVERVIEW & ALL GATES STATUS
         ========================================================================= */}
      {activeDetailJob && (
        <div className="fixed inset-0 z-50 bg-black/60 dark:bg-black/80 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-750 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl p-5 sm:p-6 space-y-4 animate-in zoom-in-95 duration-150">
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 flex items-center justify-center border border-blue-200 dark:border-blue-500/30">
                  <CheckSquare size={18} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">Job Overview & Handover Gates</h3>
                  <div className="flex items-center gap-1.5 text-xs text-slate-500 font-mono">
                    <span>{activeDetailJob.jobNo}</span>
                    <span>•</span>
                    <span>{activeDetailJob.workOrder}</span>
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setActiveDetailJobId(null)}
                className="text-slate-400 hover:text-slate-700 dark:hover:text-white p-1 rounded-lg cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Scope info */}
            <div>
              <h4 className="text-sm font-bold text-slate-900 dark:text-white">{activeDetailJob.title}</h4>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">{activeDetailJob.description}</p>
            </div>

            {/* 4 Turnover Gates Status Cards (Interactive buttons) */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-1 text-xs">
              <button
                type="button"
                onClick={() => {
                  const targetId = activeDetailJob.id;
                  setActiveDetailJobId(null);
                  handleOpenJobInWorkspace(targetId, 'detail');
                }}
                className="text-left p-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 hover:border-blue-400 dark:hover:border-blue-500 transition cursor-pointer"
                title="Click to view work details in workspace"
              >
                <div className="flex items-center justify-between">
                  <span className="text-[10px] uppercase font-bold text-slate-400">Gate 1: Work %</span>
                  <ExternalLink size={10} className="text-slate-400" />
                </div>
                <span className="text-base font-extrabold text-blue-600 dark:text-blue-400 mt-0.5 block">
                  {getJobWorkProgress(activeDetailJob)}%
                </span>
                <span className="text-[10px] text-slate-500">Physical Work</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  const targetId = activeDetailJob.id;
                  setActiveDetailJobId(null);
                  handleOpenJobInWorkspace(targetId, 'turnover', 'sign');
                }}
                className="text-left p-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 hover:border-amber-400 dark:hover:border-amber-500 transition cursor-pointer"
                title="Click to go to Sign-off in workspace"
              >
                <div className="flex items-center justify-between">
                  <span className="text-[10px] uppercase font-bold text-slate-400">Gate 2: Sign-off</span>
                  <PenTool size={10} className="text-amber-500" />
                </div>
                <span className={`text-base font-extrabold mt-0.5 block ${
                  isJobSignaturesComplete(activeDetailJob) ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'
                }`}>
                  {isJobSignaturesComplete(activeDetailJob) ? 'Passed' : 'Pending'}
                </span>
                <span className="text-[10px] text-slate-500">
                  {activeDetailJob.signatures.length} Signer(s) ↗
                </span>
              </button>

              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Gate 3: Punch</span>
                <span className={`text-base font-extrabold mt-0.5 block ${
                  getJobOpenCatAPunches(activeDetailJob).length > 0
                    ? 'text-rose-600 dark:text-rose-400'
                    : getJobOpenPunches(activeDetailJob).length > 0
                      ? 'text-amber-600 dark:text-amber-400'
                      : 'text-emerald-600 dark:text-emerald-400'
                }`}>
                  {getJobOpenPunches(activeDetailJob).length === 0 ? 'Passed' : `${getJobOpenPunches(activeDetailJob).length} Open`}
                </span>
                <span className="text-[10px] text-slate-500">Open Punch Items</span>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Final Status</span>
                <span className={`text-xs font-bold mt-1 block ${getJobTurnoverStatus(activeDetailJob).color}`}>
                  {getJobTurnoverStatus(activeDetailJob).status}
                </span>
                <span className="text-[10px] text-slate-500">T/O Outcome</span>
              </div>
            </div>

            {/* Plant & Hierarchy details */}
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
                <span className="text-slate-400 text-[10px] block">Plant & Unit:</span>
                <span className="font-semibold text-slate-900 dark:text-white">{activeDetailJob.plant} • {activeDetailJob.unit}</span>
              </div>
              <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
                <span className="text-slate-400 text-[10px] block">System:</span>
                <span className="font-semibold text-slate-900 dark:text-white">{activeDetailJob.system || 'System-13'}</span>
              </div>
              <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
                <span className="text-slate-400 text-[10px] block">Equipment Tag:</span>
                <span className="font-mono font-semibold text-slate-900 dark:text-white">{activeDetailJob.assetTag || 'N/A'}</span>
              </div>
              <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
                <span className="text-slate-400 text-[10px] block">Attached Documents:</span>
                <span className="font-semibold text-slate-900 dark:text-white">{(activeDetailJob.attachments || []).length} Verified file(s)</span>
              </div>
            </div>

            {/* Quick Gate Action Buttons */}
            <div className="flex flex-wrap gap-2 pt-1">
              <button
                type="button"
                onClick={() => {
                  const targetId = activeDetailJob.id;
                  setActiveDetailJobId(null);
                  handleOpenJobInWorkspace(targetId, 'turnover', 'sign');
                }}
                className="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold flex items-center gap-1.5 transition shadow-xs cursor-pointer"
                title="Go to sign this job in Turnover Workspace"
              >
                <PenTool size={13} />
                <span>Go to Sign in Workspace</span>
                <ExternalLink size={12} />
              </button>

            </div>

            {/* Modal Footer */}
            <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <button
                type="button"
                onClick={() => setActiveDetailJobId(null)}
                className="px-3 py-1.5 rounded-lg text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                Close
              </button>

              <button
                type="button"
                onClick={() => {
                  const targetId = activeDetailJob.id;
                  setActiveDetailJobId(null);
                  handleOpenJobInWorkspace(targetId, 'detail');
                }}
                className="px-4 py-2 rounded-lg bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 font-semibold text-xs flex items-center gap-1.5 transition cursor-pointer"
              >
                <span>Go to Turnover (T/O) Workspace</span>
                <ExternalLink size={13} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL POPUP 4: EXECUTIVE BRIEFING
         ========================================================================= */}
      {isExecutiveBriefingOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 dark:bg-black/80 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-750 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl p-5 sm:p-6 space-y-4 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <FileText size={18} className="text-slate-700 dark:text-slate-300" />
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">Executive Turnover Briefing</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsExecutiveBriefingOpen(false)}
                className="text-slate-400 hover:text-slate-700 dark:hover:text-white p-1 rounded-lg cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-3 text-xs text-slate-700 dark:text-slate-300">
              <div className="p-3 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800 space-y-1">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Live Linked Telemetry</span>
                <p className="text-slate-800 dark:text-slate-200 leading-relaxed">
                  Currently tracking <strong className="text-slate-900 dark:text-white">{kpiData.totalJobs} Turnover jobs</strong> in scope directly synchronized with the plant Turnover (T/O) module. <strong className="text-emerald-600 dark:text-emerald-400">{kpiData.completedCount} jobs</strong> have satisfied all completion gates.
                </p>
              </div>

              <div className="space-y-1.5">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Gate Clearance Summary</span>
                <ul className="list-disc pl-4 space-y-1 text-slate-600 dark:text-slate-300">
                  <li><strong>{kpiData.pendingSignCount} jobs</strong> waiting for authorized signatures.</li>
                  <li><strong>{kpiData.openPunchJobCount} jobs</strong> have open punch list items holding handover clearance.</li>
                  <li>All gate actions performed in this dashboard update the shared records in real time.</li>
                </ul>
              </div>

              <div className="p-3 bg-slate-100/60 dark:bg-slate-800/40 rounded-xl border border-slate-200 dark:border-slate-700 space-y-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Quick Filter Actions</span>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setStatusFilter('PendingSign');
                      setIsExecutiveBriefingOpen(false);
                      showToast(`Filtered to ${kpiData.pendingSignCount} Pending Sign-offs`);
                    }}
                    className="px-2.5 py-1 rounded-lg bg-amber-500 hover:bg-amber-600 text-white font-semibold text-[11px] flex items-center gap-1 cursor-pointer transition shadow-2xs"
                  >
                    <Clock size={11} />
                    <span>Filter Pending Signs ({kpiData.pendingSignCount})</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setStatusFilter('OpenPunch');
                      setIsExecutiveBriefingOpen(false);
                      showToast(`Filtered to ${kpiData.openPunchJobCount} Open Punch jobs`);
                    }}
                    className="px-2.5 py-1 rounded-lg bg-rose-500 hover:bg-rose-600 text-white font-semibold text-[11px] flex items-center gap-1 cursor-pointer transition shadow-2xs"
                  >
                    <AlertTriangle size={11} />
                    <span>Filter Open Punches ({kpiData.openPunchJobCount})</span>
                  </button>
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex justify-between items-center">
              <button
                type="button"
                onClick={() => {
                  handleExportCSV();
                  setIsExecutiveBriefingOpen(false);
                }}
                className="px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
              >
                <Download size={12} />
                <span>Export Briefing CSV</span>
              </button>

              <button
                type="button"
                onClick={() => setIsExecutiveBriefingOpen(false)}
                className="px-4 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-200 text-xs font-semibold cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
        </>
      )}
    </div>
  );

  // Helper to render each job table row
  function renderJobRow(job: JobRecord) {
    const toInfo = getJobTurnoverStatus(job);
    const signedCount = (job.signatures || []).filter(s => s.decision === 'Accept').length;
    const reqCount = 2; // Operation + Job Owner
    const openPunches = getJobOpenPunches(job);
    const openCatA = getJobOpenCatAPunches(job);
    const progress = getJobWorkProgress(job);

    return (
      <tr
        key={job.id}
        className="hover:bg-slate-50/80 dark:hover:bg-slate-850/50 transition-colors"
      >
        {/* 1. Job ID */}
        <td
          className="py-3 px-3.5 font-medium cursor-pointer group"
          onClick={() => setActiveDetailJobId(job.id)}
          title="Click to view full job overview & gates"
        >
          <div className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
            <span>{job.jobNo}</span>
            {job.isCriticalPath && (
              <span className="text-[9px] px-1 py-0.2 rounded font-extrabold bg-rose-50 text-rose-700 border border-rose-200 dark:bg-rose-500/20 dark:text-rose-300 dark:border-rose-500/40">
                CRITICAL
              </span>
            )}
          </div>
          <div className="text-[11px] text-slate-400 font-mono mt-0.5">
            {job.workOrder}
          </div>
        </td>

        {/* 2. Job Description / Equipment */}
        <td
          className="py-3 px-3 max-w-[240px] cursor-pointer group"
          onClick={() => setActiveDetailJobId(job.id)}
          title="Click to view full job overview & gates"
        >
          <p className="text-slate-900 dark:text-slate-200 font-medium line-clamp-1 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">{job.title}</p>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 font-mono truncate">{job.assetTag || 'Tag N/A'}</p>
        </td>

        {/* 3. Plant / Unit */}
        <td className="py-3 px-3">
          <div className="text-slate-900 dark:text-slate-200 font-medium">{job.plant}</div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate max-w-[130px]">{(job.unit || '').split(' ')[0] || '-'}</div>
        </td>

        {/* 4. Work Progress */}
        <td className="py-3 px-3 text-center">
          <button
            type="button"
            onClick={() => setActiveDetailJobId(job.id)}
            className="inline-flex flex-col items-center cursor-pointer group"
            title="Click to inspect work progress"
          >
            <span className="font-bold text-slate-900 dark:text-white text-xs group-hover:text-blue-600 transition-colors">{progress}%</span>
            <div className="w-16 bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full mt-1 overflow-hidden">
              <div
                className={`h-full rounded-full ${
                  progress === 100 ? 'bg-blue-500' : 'bg-blue-600'
                }`}
                style={{ width: `${progress}%` }}
              />
            </div>
          </button>
        </td>

        {/* 5. Sign-off Status & Direct Link to Workspace */}
        <td className="py-3 px-3 text-center">
          {!isJobSignaturesComplete(job) ? (
            <button
              type="button"
              onClick={() => handleOpenJobInWorkspace(job.id, 'turnover', 'sign')}
              className="inline-flex flex-col items-center group cursor-pointer p-1.5 rounded-lg hover:bg-amber-50 dark:hover:bg-amber-950/40 border border-transparent hover:border-amber-300 dark:hover:border-amber-700/60 transition-all"
              title="Pending signature — Click to go to Sign in Turnover Workspace"
            >
              <span className="text-xs font-bold text-amber-600 dark:text-amber-400 flex items-center gap-1">
                <span>{getAcceptanceStatus(job)}</span>
                <Clock size={11} className="animate-pulse" />
              </span>
              <span className="text-[10px] text-amber-700 dark:text-amber-300 font-bold group-hover:underline flex items-center gap-0.5 mt-0.5">
                <PenTool size={10} />
                <span>Go to Sign</span>
                <ExternalLink size={10} />
              </span>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => handleOpenJobInWorkspace(job.id, 'turnover', 'sign')}
              className="inline-flex flex-col items-center group cursor-pointer p-1 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors"
              title="Signatures complete — Click to view in Turnover Workspace"
            >
              <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                <CheckCircle2 size={12} />
                <span>Accepted</span>
              </span>
              <span className="text-[10px] text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-200 flex items-center gap-0.5">
                <span>View Signatures</span>
                <ExternalLink size={9} />
              </span>
            </button>
          )}
        </td>

        {/* 6. Open Punch (Clickable Modal Trigger) */}
        <td className="py-3 px-3 text-center">
          {openPunches.length === 0 ? (
            <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">0 Open</span>
          ) : (
            <span className={`text-xs font-bold ${openCatA.length > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-amber-600 dark:text-amber-400'}`}>
              {openPunches.length} Open {openCatA.length > 0 && `(${openCatA.length} Cat A)`}
            </span>
          )}
        </td>

        {/* 7. T/O Status */}
        <td className="py-3 px-3">
          <button
            type="button"
            onClick={() => setActiveDetailJobId(job.id)}
            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold border cursor-pointer hover:opacity-85 transition ${toInfo.badgeBg}`}
            title="Click to view handover gate details"
          >
            {toInfo.isCompleted ? <CheckCircle2 size={12} /> : <AlertTriangle size={12} />}
            {toInfo.status}
          </button>
        </td>

        {/* 8. Action */}
        <td className="py-3 px-3 text-right space-x-1 whitespace-nowrap">
          <button
            type="button"
            onClick={() => setActiveDetailJobId(job.id)}
            className="px-2 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-200 dark:border-transparent text-[11px] font-medium transition cursor-pointer"
          >
            View Job
          </button>
          {!isJobSignaturesComplete(job) ? (
            <button
              type="button"
              onClick={() => handleOpenJobInWorkspace(job.id, 'turnover', 'sign')}
              className="px-2.5 py-1 rounded bg-amber-500 hover:bg-amber-600 text-white text-[11px] font-bold shadow-2xs inline-flex items-center gap-1 transition cursor-pointer"
              title="Navigate to sign this job in Turnover Workspace"
            >
              <PenTool size={11} />
              <span>Go to Sign</span>
              <ExternalLink size={10} />
            </button>
          ) : null}
        </td>
      </tr>
    );
  }
}
