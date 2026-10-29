import React, { useState, useMemo } from 'react';
import {
  TrendingUp,
  AlertOctagon,
  Building2,
  Workflow,
  Plus,
  Download,
  Printer,
  Search,
  X,
  Check,
  CheckCircle2,
  Clock,
  ShieldAlert,
  ChevronRight,
  Camera,
  Info,
  RefreshCw,
  FileCheck,
  Activity,
  FileText,
  Flame
} from 'lucide-react';
import { 
  JobRecord, 
  INITIAL_JOBS, 
  isJobCompleted 
} from '../data/turnoverJobsData';
import { useLanguage } from '../context/LanguageContext';

export interface ExecutiveDashboardProps {
  initialSubTab?: 'overview' | 'critical-path' | 'unit-funnel';
  onNavigateToJob?: (jobId: string) => void;
  onNavigateToFunctionalLocation?: (nodeId?: string) => void;
}

export default function ExecutiveDashboard({
  initialSubTab = 'overview',
  onNavigateToJob,
  onNavigateToFunctionalLocation
}: ExecutiveDashboardProps) {
  const { language, isTh, t } = useLanguage();
  const [jobs, setJobs] = useState<JobRecord[]>(INITIAL_JOBS);
  const [executiveSubTab, setExecutiveSubTab] = useState<'overview' | 'critical-path' | 'unit-funnel'>(initialSubTab);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showBriefingModal, setShowBriefingModal] = useState(false);

  // Sync subtab when prop changes
  React.useEffect(() => {
    if (initialSubTab) {
      setExecutiveSubTab(initialSubTab);
    }
  }, [initialSubTab]);

  // Turnaround constants
  const eventName = 'Major Overhaul Q4 2026';
  const eventTargetDate = '2026-10-12';

  // Overview Filters
  const [dashboardPlantFilter, setDashboardPlantFilter] = useState<'All' | 'Phra Khanong' | 'Sriracha'>('All');
  const [dashboardStatusFilter, setDashboardStatusFilter] = useState<'All' | 'Completed' | 'InProgress' | 'CriticalOnly' | 'HasCategoryA'>('All');
  const [dashboardStageFilter, setDashboardStageFilter] = useState<number | null>(null);
  const [dashboardSearch, setDashboardSearch] = useState('');

  // EX02 Critical Path & Punch List Filter States
  const [punchSeverityFilter, setPunchSeverityFilter] = useState<'All' | 'A' | 'B' | 'C' | 'Open' | 'Resolved'>('All');
  const [punchCriticalOnlyFilter, setPunchCriticalOnlyFilter] = useState(false);
  const [punchPlantFilter, setPunchPlantFilter] = useState<'All' | 'Phra Khanong' | 'Sriracha'>('All');
  const [punchSearchQuery, setPunchSearchQuery] = useState('');
  const [quickInspectPunchItem, setQuickInspectPunchItem] = useState<any | null>(null);
  const [showAddPunchModal, setShowAddPunchModal] = useState(false);

  // Add punch modal state
  const [addPunchJobId, setAddPunchJobId] = useState<string>(jobs[0]?.id || 'job-101');
  const [addPunchType, setAddPunchType] = useState('Flange Bolt Torquing');
  const [addPunchCategory, setAddPunchCategory] = useState<'A' | 'B' | 'C'>('A');
  const [addPunchDescription, setAddPunchDescription] = useState('');
  const [addPunchPhotoRequired, setAddPunchPhotoRequired] = useState(true);
  const [addPunchReportedBy, setAddPunchReportedBy] = useState('QA Lead Inspector');

  // Aggregates
  const totalJobsCount = jobs.length;
  const completedJobsCount = jobs.filter(isJobCompleted).length;
  const inProgressJobsCount = totalJobsCount - completedJobsCount;
  const readinessPercentage = Math.round((completedJobsCount / (totalJobsCount || 1)) * 100);

  const criticalJobs = useMemo(() => jobs.filter(j => j.isCriticalPath), [jobs]);
  const criticalDoneCount = criticalJobs.filter(isJobCompleted).length;
  const criticalReadinessPercentage = Math.round((criticalDoneCount / (criticalJobs.length || 1)) * 100);

  const totalSignsAcrossJobs = jobs.reduce((acc, j) => acc + j.signatures.length, 0);
  const totalRequiredSigns = totalJobsCount * 5;
  const signCompliancePct = Math.round((totalSignsAcrossJobs / (totalRequiredSigns || 1)) * 100);
  const opsSignsCount = jobs.reduce((acc, j) => acc + (j.signatures.some(s => s.role.toLowerCase().includes('operat')) ? 1 : 0), 0);
  const maintSignsCount = jobs.reduce((acc, j) => acc + (j.signatures.some(s => s.role.toLowerCase().includes('maint') || s.role.toLowerCase().includes('owner')) ? 1 : 0), 0);
  const leadSignsCount = jobs.reduce((acc, j) => acc + (j.signatures.some(s => s.role.toLowerCase().includes('lead')) ? 1 : 0), 0);

  const phraKhanongCount = jobs.filter(j => j.plant === 'Phra Khanong').length;
  const srirachaCount = jobs.filter(j => j.plant === 'Sriracha').length;

  // Flattened punch items
  const allPunchItemsWithJob = useMemo(() => {
    return jobs.flatMap(j => 
      j.punchList.map(p => ({
        ...p,
        jobId: j.id,
        jobNo: j.jobNo,
        jobTitle: j.title,
        plant: j.plant,
        unit: j.unit,
        assetTag: j.assetTag,
        assetDescription: j.assetDescription,
        isCriticalPath: j.isCriticalPath,
        hierarchyPath: j.hierarchyPath,
        workOrder: j.workOrder,
        refCode: j.refCode,
        gridZone: j.gridZone
      }))
    );
  }, [jobs]);

  const openCatAPunches = useMemo(() => allPunchItemsWithJob.filter(p => p.category === 'A' && p.status === 'Open'), [allPunchItemsWithJob]);
  const openCatBPunches = useMemo(() => allPunchItemsWithJob.filter(p => p.category === 'B' && p.status === 'Open'), [allPunchItemsWithJob]);
  const openCatCPunches = useMemo(() => allPunchItemsWithJob.filter(p => p.category === 'C' && p.status === 'Open'), [allPunchItemsWithJob]);
  const totalPunchesCount = allPunchItemsWithJob.length;
  const totalOpenPunches = openCatAPunches.length + openCatBPunches.length + openCatCPunches.length;
  const totalResolvedPunches = allPunchItemsWithJob.filter(p => p.status === 'Resolved').length;
  const punchResolutionRate = Math.round((totalResolvedPunches / (totalPunchesCount || 1)) * 100);

  // Filtered punch list
  const filteredPunchItems = useMemo(() => {
    return allPunchItemsWithJob.filter(p => {
      if (punchPlantFilter !== 'All' && p.plant !== punchPlantFilter) return false;
      if (punchSeverityFilter === 'A' && p.category !== 'A') return false;
      if (punchSeverityFilter === 'B' && p.category !== 'B') return false;
      if (punchSeverityFilter === 'C' && p.category !== 'C') return false;
      if (punchSeverityFilter === 'Open' && p.status !== 'Open') return false;
      if (punchSeverityFilter === 'Resolved' && p.status !== 'Resolved') return false;
      if (punchCriticalOnlyFilter && !p.isCriticalPath) return false;
      if (punchSearchQuery.trim()) {
        const q = punchSearchQuery.toLowerCase();
        const mDesc = p.description.toLowerCase().includes(q);
        const mType = p.type.toLowerCase().includes(q);
        const mTag = (p.assetTag || '').toLowerCase().includes(q);
        const mJob = p.jobNo.toLowerCase().includes(q);
        const mBy = p.reportedBy.toLowerCase().includes(q);
        const mUnit = p.unit.toLowerCase().includes(q);
        const mWo = (p.workOrder || '').toLowerCase().includes(q);
        if (!mDesc && !mType && !mTag && !mJob && !mBy && !mUnit && !mWo) return false;
      }
      return true;
    });
  }, [allPunchItemsWithJob, punchPlantFilter, punchSeverityFilter, punchCriticalOnlyFilter, punchSearchQuery]);

  // Unit breakdown
  const unitBreakdown = useMemo(() => {
    const map = new Map<string, { total: number; done: number; critical: number; openPunches: number }>();
    jobs.forEach(j => {
      const uKey = j.unit;
      const current = map.get(uKey) || { total: 0, done: 0, critical: 0, openPunches: 0 };
      current.total += 1;
      if (isJobCompleted(j)) current.done += 1;
      if (j.isCriticalPath) current.critical += 1;
      current.openPunches += j.punchList.filter(p => p.status === 'Open').length;
      map.set(uKey, current);
    });
    return Array.from(map.entries()).map(([unitName, data]) => ({
      unitName,
      ...data,
      pct: Math.round((data.done / data.total) * 100)
    }));
  }, [jobs]);

  // Stage funnel statistics
  const stageStats = useMemo(() => {
    const s1 = jobs.length;
    const s2 = jobs.filter(j => j.attachments.length > 0 || j.punchList.length > 0 || j.signatures.length > 0).length;
    const s3 = jobs.filter(j => j.signatures.length > 0).length;
    const s4 = jobs.filter(isJobCompleted).length;
    return { s1, s2, s3, s4 };
  }, [jobs]);

  // Critical path attention item
  const attentionJob = useMemo(() => {
    return jobs.find(j => j.isCriticalPath && (j.punchList.some(p => p.category === 'A' && p.status === 'Open') || !isJobCompleted(j)));
  }, [jobs]);

  // Filtered jobs for registry
  const filteredDashboardJobs = useMemo(() => {
    return jobs.filter(job => {
      if (dashboardPlantFilter !== 'All' && job.plant !== dashboardPlantFilter) return false;
      const isDone = isJobCompleted(job);
      if (dashboardStatusFilter === 'Completed' && !isDone) return false;
      if (dashboardStatusFilter === 'InProgress' && isDone) return false;
      if (dashboardStatusFilter === 'CriticalOnly' && !job.isCriticalPath) return false;
      if (dashboardStatusFilter === 'HasCategoryA') {
        const hasOpenCatA = job.punchList.some(p => p.category === 'A' && p.status === 'Open');
        if (!hasOpenCatA) return false;
      }
      if (dashboardStageFilter !== null) {
        if (dashboardStageFilter === 4 && !isDone) return false;
        if (dashboardStageFilter === 3 && (isDone || job.signatures.length === 0)) return false;
        if (dashboardStageFilter === 2 && (isDone || job.signatures.length > 0 || (job.punchList.length === 0 && job.attachments.length === 0))) return false;
        if (dashboardStageFilter === 1 && (job.signatures.length > 0 || job.punchList.length > 0)) return false;
      }
      if (dashboardSearch.trim()) {
        const q = dashboardSearch.toLowerCase();
        const mJobNo = job.jobNo.toLowerCase().includes(q);
        const mTitle = job.title.toLowerCase().includes(q);
        const mTag = (job.assetTag || '').toLowerCase().includes(q);
        const mUnit = job.unit.toLowerCase().includes(q);
        if (!mJobNo && !mTitle && !mTag && !mUnit) return false;
      }
      return true;
    });
  }, [jobs, dashboardPlantFilter, dashboardStatusFilter, dashboardStageFilter, dashboardSearch]);

  // Actions
  const handleToggleJobPunchStatus = (jobId: string, punchId: string) => {
    setJobs(prevJobs => prevJobs.map(j => {
      if (j.id === jobId) {
        return {
          ...j,
          punchList: j.punchList.map(p => {
            if (p.id === punchId) {
              const newStatus: 'Open' | 'Resolved' = p.status === 'Open' ? 'Resolved' : 'Open';
              return { ...p, status: newStatus };
            }
            return p;
          })
        };
      }
      return j;
    }));
  };

  const handleCreatePunchItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!addPunchJobId || !addPunchDescription.trim()) return;
    const newPunch = {
      id: `p-${Date.now().toString().slice(-4)}`,
      type: addPunchType,
      category: addPunchCategory,
      description: addPunchDescription.trim(),
      photoRequired: addPunchPhotoRequired,
      status: 'Open' as const,
      reportedBy: addPunchReportedBy.trim() || 'QA Inspector',
      timestamp: new Date().toISOString().replace('T', ' ').slice(0, 16)
    };
    setJobs(prevJobs => prevJobs.map(j => {
      if (j.id === addPunchJobId) {
        return {
          ...j,
          punchList: [newPunch, ...j.punchList]
        };
      }
      return j;
    }));
    setShowAddPunchModal(false);
    setAddPunchDescription('');
  };

  const handleExportPunchCsv = () => {
    const headers = ['Punch ID', 'Severity Category', 'Status', 'Asset Tag', 'Package Title', 'Job No', 'Unit', 'Plant', 'Defect Description', 'Evidence Required', 'Reported By', 'Reported At'];
    const rows = filteredPunchItems.map(p => [
      p.id,
      `Category ${p.category} (${p.category === 'A' ? 'Immediate Blocker' : p.category === 'B' ? 'Before Startup' : 'Minor'})`,
      p.status,
      `"${p.assetTag || ''}"`,
      `"${p.jobTitle.replace(/"/g, '""')}"`,
      p.jobNo,
      `"${p.unit}"`,
      p.plant,
      `"${p.description.replace(/"/g, '""')}"`,
      p.photoRequired ? 'Yes' : 'No',
      `"${p.reportedBy}"`,
      p.timestamp || ''
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Critical_Path_Punch_List_Report_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExportOverviewCsv = () => {
    const headers = ['Job No', 'Package Title', 'Plant', 'Unit', 'Asset Tag', 'Ref Code', 'Critical Path', 'Signatures Completed', 'Open Cat A', 'Overall Status'];
    const rows = filteredDashboardJobs.map(j => {
      const isDone = isJobCompleted(j);
      const openA = j.punchList.filter(p => p.status === 'Open' && p.category === 'A').length;
      return [
        `"${j.jobNo}"`,
        `"${j.title.replace(/"/g, '""')}"`,
        `"${j.plant}"`,
        `"${j.unit}"`,
        `"${j.assetTag || ''}"`,
        `"${j.refCode || ''}"`,
        j.isCriticalPath ? 'YES' : 'NO',
        `"${j.signatures.length}/2"`,
        openA,
        isDone ? 'COMPLETED' : 'IN PROGRESS'
      ].join(',');
    });
    const csvData = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(','), ...rows].join('\r\n');
    const link = document.createElement('a');
    link.setAttribute('href', encodeURI(csvData));
    link.setAttribute('download', `Turnover_Executive_Report_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleRefresh = () => {
    setIsRefreshing(true);
    setTimeout(() => setIsRefreshing(false), 500);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      
      {/* Executive Command Header */}
      <div className="bg-white dark:bg-slate-900 p-5 sm:p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2 flex-wrap text-xs text-slate-500 dark:text-slate-400">
            <span className="font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider text-[11px] flex items-center gap-1 font-mono">
              <Activity size={14} className="text-emerald-500" />
              <span>{isTh ? 'ศูนย์ติดตามสถานะงาน Turnaround' : 'Turnaround Steering Telemetry'}</span>
            </span>
            <span>·</span>
            <span>{isTh ? `อีเวนต์: ${eventName}` : `Active Event: ${eventName}`}</span>
            <span>·</span>
            <span>{isTh ? `กำหนดเริ่มเดินเครื่อง: ${eventTargetDate}` : `Target Startup: ${eventTargetDate}`}</span>
            <span>·</span>
            <span className="text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              {isTh ? 'เชื่อมต่อสด' : 'Live Sync'}
            </span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-slate-100 tracking-tight flex items-center gap-2.5">
            <TrendingUp className="text-indigo-600 dark:text-indigo-400" size={26} />
            <span>{isTh ? 'แดชบอร์ดสรุปผลผู้บริหารการส่งมอบระบบ (T/O)' : 'Turnover (T/O) Executive Dashboard'}</span>
          </h2>
          <p className="text-xs text-slate-600 dark:text-slate-400 max-w-3xl">
            {isTh 
              ? 'ระบบติดตามข้อมูลการส่งมอบงานเครื่องกลข้ามโรงกลั่น ความคืบหน้าเส้นทางวิกฤต รายการข้อบกพร่อง และการลงนามตรวจรับรองดิจิทัลตามหน่วยปฏิบัติการ'
              : 'Cross-plant mechanical turnover telemetry, critical path velocity, punch list risk exposure, and dual digital sign-off compliance governance across refinery operating units.'}
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 flex-wrap shrink-0">
          <button
            type="button"
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="h-8.5 w-8.5 rounded-lg border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center justify-center transition-colors cursor-pointer"
            title={isTh ? "รีเฟรชข้อมูล" : "Refresh Metrics"}
          >
            <RefreshCw size={13} className={isRefreshing ? 'animate-spin text-indigo-500' : ''} />
          </button>

          <button
            type="button"
            onClick={() => window.print()}
            className="h-8.5 px-3 rounded-lg border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <Printer size={13} />
            <span className="hidden sm:inline">{isTh ? 'พิมพ์รายงาน' : 'Print'}</span>
          </button>

          <button
            type="button"
            onClick={handleExportOverviewCsv}
            className="h-8.5 px-3 rounded-lg border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <Download size={13} />
            <span>{isTh ? 'ส่งออก CSV' : 'Export CSV'}</span>
          </button>

          <button
            type="button"
            onClick={() => setShowBriefingModal(true)}
            className="h-8.5 px-3.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-2xs transition-all cursor-pointer active:scale-95"
          >
            <FileCheck size={14} />
            <span>{isTh ? 'สรุปข้อมูลผู้บริหาร' : 'Executive Briefing'}</span>
          </button>
        </div>
      </div>

      {/* Sub-View Navigation Switcher (Clean Segmented Tab Bar) */}
      <div className="inline-flex p-1 bg-slate-100 dark:bg-slate-800/90 rounded-xl border border-slate-200/80 dark:border-slate-700/60 flex-wrap gap-1">
        <button
          type="button"
          onClick={() => setExecutiveSubTab('overview')}
          className={`h-9 px-3.5 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center gap-2 ${
            executiveSubTab === 'overview'
              ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-2xs font-bold'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <TrendingUp size={14} />
          <span>{isTh ? 'ภาพรวมการส่งมอบระบบ' : 'Turnover Overview'}</span>
        </button>

        <button
          type="button"
          onClick={() => setExecutiveSubTab('critical-path')}
          className={`h-9 px-3.5 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center gap-2 ${
            executiveSubTab === 'critical-path'
              ? 'bg-white dark:bg-slate-700 text-amber-600 dark:text-amber-400 shadow-2xs font-bold'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <AlertOctagon size={14} className={executiveSubTab === 'critical-path' ? 'text-amber-500' : 'text-slate-400'} />
          <span>{isTh ? 'เส้นทางวิกฤต & Punch List' : 'Critical Path & Punch List'}</span>
          {openCatAPunches.length > 0 ? (
            <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-rose-500 text-white font-mono">
              {openCatAPunches.length} Cat A
            </span>
          ) : (
            <span className="px-1.5 py-0.2 rounded-full text-[10px] font-semibold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
              Clean
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => setExecutiveSubTab('unit-funnel')}
          className={`h-9 px-3.5 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center gap-2 ${
            executiveSubTab === 'unit-funnel'
              ? 'bg-white dark:bg-slate-700 text-emerald-600 dark:text-emerald-400 shadow-2xs font-bold'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <Building2 size={14} />
          <span>{isTh ? 'ความพร้อมแยกตามหน่วยผลิต' : 'Unit Readiness Funnel'}</span>
        </button>
      </div>

      {/* ===============================================================
          SUB-TAB 1: EX01 TURNOVER OVERVIEW DASHBOARD
         =============================================================== */}
      {executiveSubTab === 'overview' && (
        <div className="space-y-6">

          {/* Attention Items & Critical Path Alert Banner */}
          {attentionJob && (
            <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs shadow-2xs animate-in slide-in-from-top-1">
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5">
                  <AlertOctagon size={18} />
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold text-amber-900 dark:text-amber-200 uppercase tracking-wider text-[10px]">
                      Critical Path Attention Required
                    </span>
                    <span>·</span>
                    <span className="font-mono font-bold text-amber-800 dark:text-amber-300">
                      {attentionJob.assetTag || attentionJob.jobNo}
                    </span>
                    <span>·</span>
                    <span className="text-amber-700 dark:text-amber-300">{attentionJob.unit}</span>
                  </div>
                  <p className="text-slate-700 dark:text-slate-300 mt-0.5">
                    Package <strong className="font-semibold">{attentionJob.title}</strong> has{' '}
                    {attentionJob.punchList.filter(p => p.status === 'Open' && p.category === 'A').length > 0 ? (
                      <span className="text-rose-600 dark:text-rose-400 font-bold">
                        {attentionJob.punchList.filter(p => p.status === 'Open' && p.category === 'A').length} unresolved Category A punch item(s)
                      </span>
                    ) : (
                      'pending Operations or Job Owner dual digital authorization'
                    )}.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setExecutiveSubTab('critical-path')}
                className="px-3.5 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs shrink-0 flex items-center gap-1 transition-colors cursor-pointer self-start sm:self-center"
              >
                <span>View in EX02 Critical Path</span>
                <ChevronRight size={14} />
              </button>
            </div>
          )}

          {/* 6 Executive KPI Scorecards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3.5">
            {/* 1. Readiness */}
            <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono">
                  Turnover Readiness
                </span>
                <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
                  {readinessPercentage}%
                </span>
              </div>
              <div className="text-2xl font-black text-slate-900 dark:text-white">
                {readinessPercentage}%
              </div>
              <div className="w-full bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
                <div 
                  className="bg-emerald-500 h-full rounded-full transition-all duration-500" 
                  style={{ width: `${readinessPercentage}%` }}
                />
              </div>
              <p className="text-[10px] text-slate-500 dark:text-slate-400">
                {completedJobsCount} of {totalJobsCount} packages PSSR-sanctioned
              </p>
            </div>

            {/* 2. Package Execution */}
            <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs space-y-2">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono">
                Package Execution
              </span>
              <div className="text-2xl font-black text-slate-900 dark:text-white flex items-baseline gap-1.5">
                <span>{completedJobsCount}</span>
                <span className="text-xs font-normal text-slate-400">Done</span>
                <span className="text-slate-300 dark:text-slate-700">/</span>
                <span>{inProgressJobsCount}</span>
                <span className="text-xs font-normal text-amber-500">Active</span>
              </div>
              <div className="text-[11px] text-slate-600 dark:text-slate-300 flex items-center gap-1.5">
                <TrendingUp size={13} className="text-emerald-500" />
                <span>Pace on track</span>
              </div>
              <p className="text-[10px] text-slate-500 dark:text-slate-400">
                100% mechanical coverage
              </p>
            </div>

            {/* 3. Critical Path */}
            <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono flex items-center gap-1">
                  <span>Critical Path</span>
                  <span className="text-amber-500 font-bold">★</span>
                </span>
                <span className="text-[11px] font-bold text-amber-600 dark:text-amber-400">
                  {criticalReadinessPercentage}%
                </span>
              </div>
              <div className="text-2xl font-black text-slate-900 dark:text-white">
                {criticalDoneCount} <span className="text-xs font-normal text-slate-400">of {criticalJobs.length}</span>
              </div>
              <div className="w-full bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
                <div 
                  className="bg-amber-500 h-full rounded-full transition-all duration-500" 
                  style={{ width: `${criticalReadinessPercentage}%` }}
                />
              </div>
              <p className="text-[10px] text-slate-500 dark:text-slate-400">
                Reactor, Column & Heater circuits
              </p>
            </div>

            {/* 4. Punch List Matrix */}
            <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono">
                  Open Punch Items
                </span>
                <span className={`text-[10px] font-bold ${openCatAPunches.length > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                  {openCatAPunches.length > 0 ? `${openCatAPunches.length} Cat A Blocker` : 'Cat A Clean'}
                </span>
              </div>
              <div className="flex items-center gap-2 pt-0.5">
                <div className={`px-2 py-0.5 rounded text-xs font-black ${openCatAPunches.length > 0 ? 'bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300' : 'bg-slate-100 dark:bg-slate-800 text-slate-500'}`}>
                  A: {openCatAPunches.length}
                </div>
                <div className="px-2 py-0.5 rounded bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300 text-xs font-black">
                  B: {openCatBPunches.length}
                </div>
                <div className="px-2 py-0.5 rounded bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 text-xs font-black">
                  C: {openCatCPunches.length}
                </div>
              </div>
              <p className="text-[10px] text-slate-500 dark:text-slate-400">
                {totalResolvedPunches} cleared & resolved
              </p>
            </div>

            {/* 5. Digital 5-Signatures Workflow */}
            <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono">
                  5-Signatures Workflow
                </span>
                <span className="text-[11px] font-bold text-blue-600 dark:text-blue-400">
                  {signCompliancePct}%
                </span>
              </div>
              <div className="text-2xl font-black text-blue-600 dark:text-blue-400">
                {totalSignsAcrossJobs} <span className="text-xs font-normal text-slate-400">/ {totalRequiredSigns}</span>
              </div>
              <div className="text-[10px] text-slate-600 dark:text-slate-300 flex items-center justify-between font-mono">
                <span>Ops: {opsSignsCount}</span>
                <span>Maint: {maintSignsCount}</span>
                <span>Lead: {leadSignsCount}</span>
              </div>
              <p className="text-[10px] text-slate-500 dark:text-slate-400">
                5-Party digital acceptance tracking
              </p>
            </div>

            {/* 6. Plant Site Allocation */}
            <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs space-y-2">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono">
                Cross-Site Split
              </span>
              <div className="text-xl font-black text-slate-900 dark:text-white flex items-baseline justify-between">
                <span>PK: {phraKhanongCount}</span>
                <span className="text-slate-300 dark:text-slate-700">·</span>
                <span>SR: {srirachaCount}</span>
              </div>
              <div className="flex h-1.5 rounded-full overflow-hidden bg-slate-100 dark:bg-slate-800">
                <div 
                  className="bg-emerald-500" 
                  style={{ width: `${(phraKhanongCount / (totalJobsCount || 1)) * 100}%` }}
                  title="Phra Khanong"
                />
                <div 
                  className="bg-blue-500" 
                  style={{ width: `${(srirachaCount / (totalJobsCount || 1)) * 100}%` }}
                  title="Sriracha"
                />
              </div>
              <p className="text-[10px] text-slate-500 dark:text-slate-400">
                Phra Khanong & Sriracha plants
              </p>
            </div>
          </div>

          {/* Analytical Visualizations (2 Columns) */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            
            {/* Left: 4-Stage Turnover Pipeline */}
            <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                    <Workflow className="text-emerald-600 dark:text-emerald-400" size={16} />
                    <span>4-Stage Turnover Stage-Gate Pipeline</span>
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Sequential mechanical verification funnel leading to PSSR operational startup.
                  </p>
                </div>
                {dashboardStageFilter !== null && (
                  <button
                    type="button"
                    onClick={() => setDashboardStageFilter(null)}
                    className="text-[11px] text-indigo-600 dark:text-indigo-400 hover:underline font-semibold cursor-pointer"
                  >
                    Clear Filter
                  </button>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {[
                  {
                    stageNo: 1,
                    title: 'Stage 1: Documentation & Butt List',
                    subtitle: 'QR tag scans, P&ID markups & blind list',
                    count: stageStats.s1,
                    status: '100% Verified'
                  },
                  {
                    stageNo: 2,
                    title: 'Stage 2: Quality Inspection & NDT',
                    subtitle: 'Radiography, hydrostatic test & punch items',
                    count: stageStats.s2,
                    status: `${Math.round((stageStats.s2 / (totalJobsCount || 1)) * 100)}% Engaged`
                  },
                  {
                    stageNo: 3,
                    title: 'Stage 3: Flange Tightness & Blinds',
                    subtitle: 'Torque verification & Operations endorsement',
                    count: stageStats.s3,
                    status: `${Math.round((stageStats.s3 / (totalJobsCount || 1)) * 100)}% Endorsed`
                  },
                  {
                    stageNo: 4,
                    title: 'Stage 4: T/O Certificate & PSSR',
                    subtitle: 'Dual sign-off & hydrocarbon sanction',
                    count: stageStats.s4,
                    status: `${Math.round((stageStats.s4 / (totalJobsCount || 1)) * 100)}% Sanctioned`
                  }
                ].map(stage => {
                  const isSelected = dashboardStageFilter === stage.stageNo;
                  return (
                    <button
                      key={stage.stageNo}
                      type="button"
                      onClick={() => setDashboardStageFilter(isSelected ? null : stage.stageNo)}
                      className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-indigo-50/80 dark:bg-indigo-950/40 border-indigo-400 ring-2 ring-indigo-500/20 shadow-xs'
                          : 'bg-slate-50/50 dark:bg-slate-800/40 border-slate-200/80 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-[10px] font-bold font-mono text-slate-500 uppercase">
                          Stage 0{stage.stageNo}
                        </span>
                        <span className="text-xs font-black text-slate-800 dark:text-slate-200">
                          {stage.count} <span className="text-[10px] font-normal text-slate-400">Packages</span>
                        </span>
                      </div>
                      <div className="font-bold text-xs text-slate-900 dark:text-white leading-snug">
                        {stage.title.split(': ')[1]}
                      </div>
                      <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-1 line-clamp-1">
                        {stage.subtitle}
                      </div>
                      <div className="mt-2.5 pt-2 border-t border-slate-200/60 dark:border-slate-700/60 flex items-center justify-between text-[10px]">
                        <span className="text-slate-400">Readiness:</span>
                        <span className="font-bold text-emerald-600 dark:text-emerald-400 font-mono">
                          {stage.status}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Right: Plant Operating Unit Breakdown */}
            <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                    <Building2 className="text-indigo-600 dark:text-indigo-400" size={16} />
                    <span>Plant Operating Unit Turnover Status</span>
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Mechanical completion pace tracked across process units.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setExecutiveSubTab('unit-funnel')}
                  className="text-xs font-bold text-emerald-600 hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <span>Detailed Funnel</span>
                  <ChevronRight size={13} />
                </button>
              </div>

              <div className="space-y-3">
                {unitBreakdown.map(u => (
                  <div 
                    key={u.unitName}
                    className="p-3 rounded-xl bg-slate-50/60 dark:bg-slate-800/40 border border-slate-200/70 dark:border-slate-800 space-y-2"
                  >
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-slate-900 dark:text-white">
                          {u.unitName}
                        </span>
                        {u.critical > 0 && (
                          <span className="text-[10px] text-amber-500 font-bold flex items-center gap-0.5">
                            ★ {u.critical} Critical
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-3">
                        {u.openPunches > 0 && (
                          <span className="text-[10px] font-bold text-rose-600 dark:text-rose-400">
                            {u.openPunches} open punch
                          </span>
                        )}
                        <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
                          {u.done}/{u.total} Done ({u.pct}%)
                        </span>
                      </div>
                    </div>

                    <div className="w-full bg-slate-200/80 dark:bg-slate-700/80 h-2 rounded-full overflow-hidden">
                      <div 
                        className={`h-full rounded-full transition-all duration-500 ${
                          u.pct === 100 
                            ? 'bg-emerald-500' 
                            : u.pct >= 50 
                            ? 'bg-indigo-500' 
                            : 'bg-amber-500'
                        }`}
                        style={{ width: `${u.pct}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

          </div>

          {/* Package Master Registry */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
            <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <div>
                <h3 className="text-xs font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider flex items-center gap-2">
                  <FileText size={15} className="text-indigo-600 dark:text-indigo-400" />
                  <span>Turnover Package Master Registry</span>
                </h3>
                <span className="text-[11px] text-slate-400">
                  Comprehensive listing of all active turnaround mechanical packages.
                </span>
              </div>
              <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                {filteredDashboardJobs.length} Packages Listed
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-800/80 text-[10px] uppercase font-bold text-slate-500 tracking-wider border-b border-slate-200 dark:border-slate-800">
                  <tr>
                    <th className="p-3.5">Job No.</th>
                    <th className="p-3.5">Package Scope & Title</th>
                    <th className="p-3.5">Asset Tag / Functional Hierarchy</th>
                    <th className="p-3.5">Plant & Unit</th>
                    <th className="p-3.5">5-Role Signatures</th>
                    <th className="p-3.5">Open Punches</th>
                    <th className="p-3.5">Target Date</th>
                    <th className="p-3.5">Overall Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                  {filteredDashboardJobs.map(job => {
                    const status = isJobCompleted(job) ? 'Completed' : 'In Progress';
                    const hasOps = job.signatures.some(s => s.role.toLowerCase().includes('operat'));
                    const hasMaint = job.signatures.some(s => s.role.toLowerCase().includes('maint') || s.role.toLowerCase().includes('owner'));
                    const hasInsp = job.signatures.some(s => s.role.toLowerCase().includes('inspect'));
                    const hasQa = job.signatures.some(s => s.role.toLowerCase().includes('qa') || s.role.toLowerCase().includes('qc'));
                    const hasLead = job.signatures.some(s => s.role.toLowerCase().includes('lead') || s.role.toLowerCase().includes('turnaround'));
                    const openA = job.punchList.filter(p => p.status === 'Open' && p.category === 'A').length;
                    const openB = job.punchList.filter(p => p.status === 'Open' && p.category === 'B').length;
                    const openC = job.punchList.filter(p => p.status === 'Open' && p.category === 'C').length;
                    const totalOpen = openA + openB + openC;

                    return (
                      <tr
                        key={job.id}
                        onClick={() => onNavigateToJob?.(job.id)}
                        className="hover:bg-indigo-50/40 dark:hover:bg-slate-800/60 transition-colors cursor-pointer group"
                      >
                        <td className="p-3.5 font-mono font-bold text-indigo-600 dark:text-indigo-400 group-hover:underline">
                          {job.jobNo}
                        </td>
                        <td className="p-3.5 max-w-xs">
                          <div className="font-bold text-slate-900 dark:text-slate-100 line-clamp-1">
                            {job.title}
                          </div>
                          <div className="text-[10px] text-slate-500 line-clamp-1 mt-0.5">
                            {job.description}
                          </div>
                        </td>
                        <td className="p-3.5">
                          <div className="font-mono font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                            <span>{job.assetTag || 'S2-C-101'}</span>
                            {job.isCriticalPath && (
                              <span className="text-amber-500 font-bold" title="Critical Path Asset">★</span>
                            )}
                          </div>
                          <div className="text-[10px] text-indigo-600 dark:text-indigo-400 font-mono">
                            Ref: {job.refCode || '10-03'} {job.gridZone ? `• Grid ${job.gridZone}` : ''}
                          </div>
                        </td>
                        <td className="p-3.5">
                          <div className="font-semibold text-slate-800 dark:text-slate-200">
                            {job.plant}
                          </div>
                          <div className="text-[10px] text-slate-500 font-mono">
                            {job.unit.split(' ')[0]}
                          </div>
                        </td>
                        <td className="p-3.5">
                          <div className="flex items-center gap-1 text-[11px]">
                            <span 
                              className={`w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-bold ${
                                hasOps ? 'bg-emerald-500 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-400'
                              }`} 
                              title={hasOps ? 'Operations Signed' : 'Operations Pending'}
                            >
                              O
                            </span>
                            <span 
                              className={`w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-bold ${
                                hasMaint ? 'bg-blue-500 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-400'
                              }`} 
                              title={hasMaint ? 'Maintenance Signed' : 'Maintenance Pending'}
                            >
                              M
                            </span>
                            <span 
                              className={`w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-bold ${
                                hasInsp ? 'bg-teal-500 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-400'
                              }`} 
                              title={hasInsp ? 'Inspection Signed' : 'Inspection Pending'}
                            >
                              I
                            </span>
                            <span 
                              className={`w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-bold ${
                                hasQa ? 'bg-purple-500 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-400'
                              }`} 
                              title={hasQa ? 'QA/QC Signed' : 'QA/QC Pending'}
                            >
                              Q
                            </span>
                            <span 
                              className={`w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-bold ${
                                hasLead ? 'bg-indigo-600 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-400'
                              }`} 
                              title={hasLead ? 'Lead Turnaround Eng Signed' : 'Lead Turnaround Eng Pending'}
                            >
                              L
                            </span>
                            <span className="text-[10px] font-mono text-slate-500 ml-1 font-bold">
                              {job.signatures.length}/5
                            </span>
                          </div>
                        </td>
                        <td className="p-3.5">
                          {totalOpen > 0 ? (
                            <div className="flex items-center gap-1 text-[10px] font-mono">
                              {openA > 0 && <span className="text-rose-600 font-bold">A:{openA}</span>}
                              {openB > 0 && <span className="text-amber-600 font-bold">B:{openB}</span>}
                              {openC > 0 && <span className="text-blue-600 font-bold">C:{openC}</span>}
                            </div>
                          ) : (
                            <span className="text-emerald-600 font-medium text-[11px] flex items-center gap-1">
                              <Check size={12} />
                              <span>0 Clean</span>
                            </span>
                          )}
                        </td>
                        <td className="p-3.5 text-slate-500 font-mono text-[11px]">
                          {eventTargetDate}
                        </td>
                        <td className="p-3.5">
                          <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                            status === 'Completed'
                              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300'
                              : 'bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300'
                          }`}>
                            {status === 'Completed' ? <CheckCircle2 size={12} /> : <Clock size={12} />}
                            <span>{status}</span>
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      )}

      {/* ===============================================================
          SUB-TAB 2: EX02 CRITICAL PATH & PUNCH LIST COMMAND CENTER
         =============================================================== */}
      {executiveSubTab === 'critical-path' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          
          {/* EX02 Telemetry & Alert Command Header */}
          <div className="p-5 sm:p-6 rounded-2xl bg-gradient-to-r from-amber-950/40 via-slate-900 to-slate-900 border border-amber-600/30 shadow-lg flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div className="space-y-1.5">
              <div className="flex items-center gap-2 flex-wrap text-xs">
                <span className="px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider text-[10px] bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center gap-1.5">
                  <Flame size={12} className="text-amber-400 animate-pulse" />
                  <span>EX02 CRITICAL PATH VELOCITY</span>
                </span>
                <span className="text-slate-500">·</span>
                <span className="text-slate-300 font-mono">Turnaround Event: {eventName}</span>
                <span className="text-slate-500">·</span>
                <span className="text-amber-400 font-mono font-bold">Startup: {eventTargetDate} (7 Days Remaining)</span>
              </div>
              <h3 className="text-xl sm:text-2xl font-black text-white tracking-tight flex items-center gap-2">
                <AlertOctagon className="text-amber-400" size={24} />
                <span>EX02 เส้นทางวิกฤต & ทะเบียนข้อบกพร่อง (Critical Path & Punch List)</span>
              </h3>
              <p className="text-xs text-slate-400 max-w-3xl">
                การควบคุมและเร่งรัดความก้าวหน้าแพ็กเกจบนเส้นทางวิกฤต (Shutdown Critical Path), กำกับดูแลการปลดล็อกข้อบกพร่องหมวด A (Category A Startup Blockers) ก่อนขั้นตอน PSSR และการจ่ายสารไฮโดรคาร์บอน (Oil-In).
              </p>
            </div>

            <div className="flex items-center gap-2 flex-wrap shrink-0">
              <button
                type="button"
                onClick={() => setShowAddPunchModal(true)}
                className="px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 text-xs font-black flex items-center gap-1.5 transition-all shadow-md cursor-pointer active:scale-95"
              >
                <Plus size={15} />
                <span>Log Punch Item</span>
              </button>

              <button
                type="button"
                onClick={handleExportPunchCsv}
                className="px-3.5 py-2 rounded-xl border border-slate-700 bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <Download size={14} />
                <span>Export Punch CSV</span>
              </button>

              <button
                type="button"
                onClick={() => window.print()}
                className="p-2.5 rounded-xl border border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors cursor-pointer"
                title="Print Punch Register"
              >
                <Printer size={15} />
              </button>
            </div>
          </div>

          {/* Startup Blockers Callout (Category A Alert) */}
          {openCatAPunches.length > 0 ? (
            <div className="p-4 sm:p-5 rounded-2xl bg-rose-950/40 border border-rose-500/40 shadow-md space-y-3 animate-in slide-in-from-top-1">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-rose-500/20 text-rose-400 shrink-0">
                    <ShieldAlert size={20} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-black text-rose-300 uppercase tracking-wider">
                        PSSR Startup Blockers Detected (Category A)
                      </span>
                      <span className="px-2 py-0.2 rounded-full text-[10px] font-bold bg-rose-500 text-white">
                        {openCatAPunches.length} Item(s) Holding Oil-In
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-300 mt-0.5">
                      ตามมาตรฐาน API 510/570 ข้อบกพร่องระดับ Category A จะต้องได้รับการแก้ไขและรับรองทางเทคนิค 100% ก่อนอนุญาตให้ทดสอบแรงดันไนโตรเจนหรือจ่ายสารไฮโดรคาร์บอน
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5 pt-1">
                {openCatAPunches.map(p => (
                  <div 
                    key={p.id}
                    className="p-3 rounded-xl bg-slate-900/90 border border-rose-900/80 hover:border-rose-600/70 transition-all flex flex-col justify-between space-y-2"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-[10px]">
                        <span className="font-mono font-bold text-rose-400 bg-rose-950/80 px-2 py-0.5 rounded border border-rose-800/60">
                          {p.id} • Cat A
                        </span>
                        <span className="font-mono text-slate-400 font-semibold">{p.unit.split(' ')[0]}</span>
                      </div>
                      <div className="font-mono font-bold text-xs text-white flex items-center gap-1.5">
                        <span>{p.assetTag || p.jobNo}</span>
                        {p.isCriticalPath && <span className="text-amber-400 font-bold">★</span>}
                      </div>
                      <p className="text-[11px] text-slate-300 line-clamp-2 leading-relaxed">
                        {p.description}
                      </p>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-slate-800 text-[10px]">
                      <span className="text-slate-400 font-mono">By: {p.reportedBy}</span>
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => setQuickInspectPunchItem(p)}
                          className="px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold cursor-pointer"
                        >
                          Inspect
                        </button>
                        <button
                          type="button"
                          onClick={() => handleToggleJobPunchStatus(p.jobId, p.id)}
                          className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold cursor-pointer transition-all flex items-center gap-1"
                        >
                          <Check size={11} />
                          <span>Clear</span>
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="p-4 rounded-2xl bg-emerald-950/30 border border-emerald-500/30 flex items-center justify-between text-xs text-emerald-300">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-emerald-500/20 text-emerald-400">
                  <CheckCircle2 size={18} />
                </div>
                <div>
                  <span className="font-bold text-sm text-white">Cat A Startup Clean: 0 Blockers</span>
                  <p className="text-[11px] text-emerald-400/90">
                    All Category A punch list items are completely resolved. Systems meet technical integrity requirements for PSSR approval.
                  </p>
                </div>
              </div>
              <span className="font-mono font-bold text-emerald-400 px-3 py-1 rounded-xl bg-emerald-900/40 border border-emerald-700/50">
                PSSR CLEARED
              </span>
            </div>
          )}

          {/* 6 Key EX02 Metric Scorecards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3.5">
            <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono flex items-center gap-1">
                  <span>Critical Path</span>
                  <span className="text-amber-500 font-bold">★</span>
                </span>
                <span className="text-[11px] font-bold text-amber-600 dark:text-amber-400">
                  {criticalReadinessPercentage}%
                </span>
              </div>
              <div className="text-2xl font-black text-slate-900 dark:text-white">
                {criticalDoneCount} <span className="text-xs font-normal text-slate-400">/ {criticalJobs.length}</span>
              </div>
              <div className="w-full bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
                <div 
                  className="bg-amber-500 h-full rounded-full transition-all duration-500" 
                  style={{ width: `${criticalReadinessPercentage}%` }}
                />
              </div>
              <p className="text-[10px] text-slate-500 dark:text-slate-400">
                {criticalJobs.length - criticalDoneCount} packages actively in-flight
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono">
                  Cat A Blocker
                </span>
                <span className={`text-[10px] font-bold ${openCatAPunches.length > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                  {openCatAPunches.length > 0 ? 'Immediate Action' : 'Zero Open'}
                </span>
              </div>
              <div className={`text-2xl font-black ${openCatAPunches.length > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-slate-900 dark:text-white'}`}>
                {openCatAPunches.length}
              </div>
              <div className="text-[10px] text-slate-500 dark:text-slate-400">
                Must clear before hydrocarbon feed
              </div>
              <p className="text-[10px] text-slate-400">
                Zero-tolerance safety compliance
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono">
                  Cat B Pre-Startup
                </span>
                <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400">
                  Before Oil-In
                </span>
              </div>
              <div className="text-2xl font-black text-amber-600 dark:text-amber-400">
                {openCatBPunches.length}
              </div>
              <div className="text-[10px] text-slate-500 dark:text-slate-400">
                Action required prior to commissioning
              </div>
              <p className="text-[10px] text-slate-400">
                Instrumentation, tags & gaskets
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono">
                  Cat C Minor
                </span>
                <span className="text-[10px] font-bold text-blue-600 dark:text-blue-400">
                  Post-Startup
                </span>
              </div>
              <div className="text-2xl font-black text-blue-600 dark:text-blue-400">
                {openCatCPunches.length}
              </div>
              <div className="text-[10px] text-slate-500 dark:text-slate-400">
                Punch out post turnaround
              </div>
              <p className="text-[10px] text-slate-400">
                Cosmetic, insulation wrapping
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono">
                  Resolution Rate
                </span>
                <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
                  {punchResolutionRate}%
                </span>
              </div>
              <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400">
                {totalResolvedPunches} <span className="text-xs font-normal text-slate-400">/ {totalPunchesCount}</span>
              </div>
              <div className="w-full bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
                <div 
                  className="bg-emerald-500 h-full rounded-full transition-all duration-500" 
                  style={{ width: `${punchResolutionRate}%` }}
                />
              </div>
              <p className="text-[10px] text-slate-500 dark:text-slate-400">
                {totalOpenPunches} punch items pending verification
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono">
                  CP Dual Sign-Off
                </span>
                <span className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400">
                  {Math.round((criticalJobs.reduce((acc, j) => acc + j.signatures.length, 0) / ((criticalJobs.length * 2) || 1)) * 100)}%
                </span>
              </div>
              <div className="text-2xl font-black text-indigo-600 dark:text-indigo-400">
                {criticalJobs.reduce((acc, j) => acc + j.signatures.length, 0)} <span className="text-xs font-normal text-slate-400">/ {criticalJobs.length * 2}</span>
              </div>
              <div className="text-[10px] text-slate-500 dark:text-slate-400 flex items-center justify-between">
                <span>Ops: {criticalJobs.filter(j => j.signatures.some(s => s.role === 'Operation')).length}</span>
                <span>Owner: {criticalJobs.filter(j => j.signatures.some(s => s.role === 'Job Owner')).length}</span>
              </div>
              <p className="text-[10px] text-slate-400">
                Digital authorization compliance
              </p>
            </div>
          </div>

          {/* Critical Path Pipeline */}
          <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <Workflow className="text-amber-500" size={16} />
                  <span>ผังติดตามความก้าวหน้ารายแพ็กเกจเส้นทางวิกฤต (Critical Path Circuit Pipeline)</span>
                </h3>
                <p className="text-[11px] text-slate-500">
                  ติดตามลำดับขั้นตอน 4-Stage Mechanical Turnover ของแพ็กเกจวิกฤตเพื่อเตรียมความพร้อมรับรอง PSSR
                </p>
              </div>
              <span className="text-xs font-mono font-bold px-2.5 py-1 rounded-xl bg-amber-500/10 text-amber-500 border border-amber-500/20 self-start sm:self-auto">
                {criticalJobs.length} Critical Packages
              </span>
            </div>

            <div className="space-y-3">
              {criticalJobs.map(job => {
                const isDone = isJobCompleted(job);
                const openA = job.punchList.filter(p => p.status === 'Open' && p.category === 'A').length;
                const openB = job.punchList.filter(p => p.status === 'Open' && p.category === 'B').length;
                const hasOps = job.signatures.some(s => s.role === 'Operation');

                return (
                  <div 
                    key={job.id}
                    className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-850 hover:border-amber-400/60 dark:hover:border-amber-500/50 transition-all space-y-3"
                  >
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-2">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap text-xs">
                          <span className="font-mono font-bold text-amber-600 dark:text-amber-400 flex items-center gap-1">
                            <span>★ {job.assetTag || job.jobNo}</span>
                          </span>
                          <span className="text-slate-300 dark:text-slate-700">·</span>
                          <span className="font-semibold text-slate-800 dark:text-slate-200">{job.title}</span>
                          <span className="text-slate-300 dark:text-slate-700">·</span>
                          <span className="text-slate-500 font-mono text-[11px]">{job.unit.split(' ')[0]} ({job.plant})</span>
                          {job.gridZone && (
                            <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
                              Grid {job.gridZone}
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-1">
                          Ref Code: {job.refCode || 'N/A'} • WO: {job.workOrder || 'N/A'} • {job.description}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        {openA > 0 ? (
                          <span className="px-2.5 py-1 rounded-lg bg-rose-500/10 text-rose-500 dark:text-rose-400 text-xs font-bold border border-rose-500/20 flex items-center gap-1">
                            <AlertOctagon size={13} />
                            <span>{openA} Cat A Blocker</span>
                          </span>
                        ) : openB > 0 ? (
                          <span className="px-2 py-1 rounded-lg bg-amber-500/10 text-amber-500 text-xs font-bold">
                            {openB} Cat B Open
                          </span>
                        ) : (
                          <span className="px-2 py-1 rounded-lg bg-emerald-500/10 text-emerald-500 text-xs font-bold flex items-center gap-1">
                            <CheckCircle2 size={13} />
                            <span>Punches Clean</span>
                          </span>
                        )}

                        {onNavigateToJob && (
                          <button
                            type="button"
                            onClick={() => onNavigateToJob(job.id)}
                            className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer"
                          >
                            <span>Open Package</span>
                            <ChevronRight size={13} />
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-slate-200/60 dark:border-slate-800/80 text-[11px]">
                      <div className="p-2.5 rounded-lg bg-emerald-50/70 dark:bg-emerald-950/20 border border-emerald-200/60 dark:border-emerald-900/40 space-y-0.5">
                        <div className="flex items-center justify-between text-[10px] text-emerald-700 dark:text-emerald-400 font-bold uppercase">
                          <span>Stage 1: Butt List</span>
                          <Check size={12} />
                        </div>
                        <div className="text-xs font-bold text-slate-800 dark:text-slate-200">
                          QR & P&ID Scans
                        </div>
                        <div className="text-[10px] text-emerald-600 font-medium">100% Verified</div>
                      </div>

                      <div className={`p-2.5 rounded-lg border space-y-0.5 ${
                        openA === 0 && job.attachments.length > 0
                          ? 'bg-emerald-50/70 dark:bg-emerald-950/20 border-emerald-200/60 dark:border-emerald-900/40 text-emerald-700'
                          : 'bg-amber-50/70 dark:bg-amber-950/20 border-amber-200/60 dark:border-amber-900/40 text-amber-700'
                      }`}>
                        <div className="flex items-center justify-between text-[10px] font-bold uppercase">
                          <span>Stage 2: QC & NDT</span>
                          {openA === 0 ? <Check size={12} /> : <Clock size={12} />}
                        </div>
                        <div className="text-xs font-bold text-slate-800 dark:text-slate-200">
                          NDT & Hydrotest
                        </div>
                        <div className="text-[10px] font-medium">
                          {openA > 0 ? `${openA} Cat A Pending` : 'QA Certified'}
                        </div>
                      </div>

                      <div className={`p-2.5 rounded-lg border space-y-0.5 ${
                        hasOps
                          ? 'bg-emerald-50/70 dark:bg-emerald-950/20 border-emerald-200/60 dark:border-emerald-900/40 text-emerald-700'
                          : 'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-400'
                      }`}>
                        <div className="flex items-center justify-between text-[10px] font-bold uppercase">
                          <span>Stage 3: Flanges</span>
                          {hasOps ? <Check size={12} /> : <Clock size={12} />}
                        </div>
                        <div className="text-xs font-bold text-slate-800 dark:text-slate-200">
                          Torque & De-Blind
                        </div>
                        <div className="text-[10px] font-medium">
                          {hasOps ? 'Ops Endorsed' : 'Awaiting Torque'}
                        </div>
                      </div>

                      <div className={`p-2.5 rounded-lg border space-y-0.5 ${
                        isDone
                          ? 'bg-emerald-50/70 dark:bg-emerald-950/20 border-emerald-200/60 dark:border-emerald-900/40 text-emerald-700'
                          : 'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-400'
                      }`}>
                        <div className="flex items-center justify-between text-[10px] font-bold uppercase">
                          <span>Stage 4: T/O Cert</span>
                          {isDone ? <Check size={12} /> : <Clock size={12} />}
                        </div>
                        <div className="text-xs font-bold text-slate-800 dark:text-slate-200">
                          Dual Sign & PSSR
                        </div>
                        <div className="text-[10px] font-medium">
                          {isDone ? 'PSSR Sanctioned' : `${job.signatures.length}/2 Signed`}
                        </div>
                      </div>
                    </div>

                  </div>
                );
              })}
            </div>
          </div>

          {/* Master Punch List Register */}
          <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
              <div className="inline-flex rounded-xl bg-slate-100 dark:bg-slate-800 p-1 border border-slate-200 dark:border-slate-700 text-xs flex-wrap gap-1">
                {(['All', 'A', 'B', 'C', 'Open', 'Resolved'] as const).map(sev => (
                  <button
                    key={sev}
                    type="button"
                    onClick={() => setPunchSeverityFilter(sev)}
                    className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                      punchSeverityFilter === sev
                        ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-2xs'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    {sev === 'All' ? `All (${allPunchItemsWithJob.length})` :
                     sev === 'A' ? `Cat A (${allPunchItemsWithJob.filter(p => p.category === 'A').length})` :
                     sev === 'B' ? `Cat B (${allPunchItemsWithJob.filter(p => p.category === 'B').length})` :
                     sev === 'C' ? `Cat C (${allPunchItemsWithJob.filter(p => p.category === 'C').length})` :
                     sev === 'Open' ? `Open (${totalOpenPunches})` :
                     `Resolved (${totalResolvedPunches})`}
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <div className="inline-flex rounded-xl bg-slate-100 dark:bg-slate-800 p-1 border border-slate-200 dark:border-slate-700 text-xs">
                  {(['All', 'Phra Khanong', 'Sriracha'] as const).map(plant => (
                    <button
                      key={plant}
                      type="button"
                      onClick={() => setPunchPlantFilter(plant)}
                      className={`px-2.5 py-1 rounded-lg font-bold text-[11px] transition-all cursor-pointer ${
                        punchPlantFilter === plant
                          ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-2xs'
                          : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                      }`}
                    >
                      {plant === 'All' ? 'All Plants' : plant.split(' ')[0]}
                    </button>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={() => setPunchCriticalOnlyFilter(!punchCriticalOnlyFilter)}
                  className={`px-3 py-1.5 rounded-xl border text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                    punchCriticalOnlyFilter
                      ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-xs'
                      : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <span className="text-amber-500 font-bold">★</span>
                  <span>Critical Path Only</span>
                </button>

                <div className="relative">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={punchSearchQuery}
                    onChange={e => setPunchSearchQuery(e.target.value)}
                    placeholder="Search punch, tag, defect..."
                    className="pl-8 pr-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-white outline-none w-44 sm:w-56 focus:ring-2 focus:ring-amber-500/20"
                  />
                  {punchSearchQuery && (
                    <button
                      type="button"
                      onClick={() => setPunchSearchQuery('')}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      <X size={12} />
                    </button>
                  )}
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 dark:bg-slate-800/80 text-[10px] uppercase font-bold text-slate-500 tracking-wider border-b border-slate-200 dark:border-slate-800">
                    <tr>
                      <th className="p-3">Punch ID & Cat</th>
                      <th className="p-3">Asset Tag / Package</th>
                      <th className="p-3">Unit & Plant</th>
                      <th className="p-3">Defect Description</th>
                      <th className="p-3 text-center">Photo</th>
                      <th className="p-3">Reported By</th>
                      <th className="p-3 text-center">Status Toggle</th>
                      <th className="p-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                    {filteredPunchItems.map(p => {
                      const isResolved = p.status === 'Resolved';
                      return (
                        <tr
                          key={`${p.jobId}-${p.id}`}
                          className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors"
                        >
                          <td className="p-3">
                            <div className="flex items-center gap-1.5">
                              <span className="font-mono font-bold text-slate-900 dark:text-white">
                                {p.id}
                              </span>
                              <span className={`px-2 py-0.5 rounded text-[10px] font-black ${
                                p.category === 'A'
                                  ? 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 border border-rose-300 dark:border-rose-800'
                                  : p.category === 'B'
                                  ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border border-amber-300 dark:border-amber-800'
                                  : 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300 border border-blue-300 dark:border-blue-800'
                              }`}>
                                Cat {p.category}
                              </span>
                            </div>
                            <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                              {p.type}
                            </div>
                          </td>

                          <td className="p-3">
                            <div className="font-mono font-bold text-slate-900 dark:text-white flex items-center gap-1">
                              <span>{p.assetTag || p.jobNo}</span>
                              {p.isCriticalPath && (
                                <span className="text-amber-500 font-bold">★</span>
                              )}
                            </div>
                            <div className="text-[10px] text-slate-500 line-clamp-1 max-w-[180px]">
                              {p.jobTitle}
                            </div>
                          </td>

                          <td className="p-3">
                            <div className="font-semibold text-slate-800 dark:text-slate-200">
                              {p.unit.split(' ')[0]}
                            </div>
                            <div className="text-[10px] text-slate-400 font-mono">
                              {p.plant}
                            </div>
                          </td>

                          <td className="p-3 max-w-sm">
                            <p className="text-slate-800 dark:text-slate-200 line-clamp-2 leading-relaxed">
                              {p.description}
                            </p>
                          </td>

                          <td className="p-3 text-center">
                            {p.photoRequired ? (
                              <span className="inline-flex items-center justify-center p-1 rounded-md bg-amber-500/10 text-amber-600 dark:text-amber-400" title="Photo verification required">
                                <Camera size={14} />
                              </span>
                            ) : (
                              <span className="text-slate-300 dark:text-slate-600 font-mono text-[10px]">-</span>
                            )}
                          </td>

                          <td className="p-3">
                            <div className="text-slate-700 dark:text-slate-300 font-medium">
                              {p.reportedBy}
                            </div>
                            <div className="text-[10px] text-slate-400 font-mono">
                              {p.timestamp}
                            </div>
                          </td>

                          <td className="p-3 text-center">
                            <button
                              type="button"
                              onClick={() => handleToggleJobPunchStatus(p.jobId, p.id)}
                              className={`px-3 py-1 rounded-full text-[11px] font-bold inline-flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs active:scale-95 ${
                                isResolved
                                  ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800'
                                  : 'bg-rose-100 text-rose-800 hover:bg-rose-200 dark:bg-rose-950 dark:text-rose-300 border border-rose-300 dark:border-rose-800'
                              }`}
                              title="Click to toggle status: Open / Resolved"
                            >
                              {isResolved ? <CheckCircle2 size={13} /> : <Clock size={13} />}
                              <span>{isResolved ? 'Resolved' : 'Open'}</span>
                            </button>
                          </td>

                          <td className="p-3 text-right">
                            <button
                              type="button"
                              onClick={() => setQuickInspectPunchItem(p)}
                              className="px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 text-[11px] font-semibold transition-colors cursor-pointer"
                            >
                              Inspect
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1">
              <span>Showing <strong>{filteredPunchItems.length}</strong> of <strong>{allPunchItemsWithJob.length}</strong> total registered punch list defects</span>
              <span className="font-mono text-[10px]">PSSR Pre-Condition: 0 Category A Blockers</span>
            </div>
          </div>

        </div>
      )}

      {/* ===============================================================
          SUB-TAB 3: EX03 UNIT READINESS FUNNEL VIEW
         =============================================================== */}
      {executiveSubTab === 'unit-funnel' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          
          <div className="p-5 sm:p-6 rounded-2xl bg-gradient-to-r from-emerald-950/40 via-slate-900 to-slate-900 border border-emerald-600/30 shadow-lg flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div className="space-y-1.5">
              <div className="flex items-center gap-2 flex-wrap text-xs">
                <span className="px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider text-[10px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1.5">
                  <Building2 size={12} className="text-emerald-400" />
                  <span>EX03 UNIT READINESS FUNNEL</span>
                </span>
                <span className="text-slate-500">·</span>
                <span className="text-slate-300 font-mono">Turnaround Event: {eventName}</span>
              </div>
              <h3 className="text-xl sm:text-2xl font-black text-white tracking-tight flex items-center gap-2">
                <Building2 className="text-emerald-400" size={24} />
                <span>EX03 ความพร้อมแยกตามหน่วยผลิต (Unit Readiness Funnel)</span>
              </h3>
              <p className="text-xs text-slate-400 max-w-3xl">
                ติดตามความพร้อมการส่งมอบเครื่องจักรและระบบท่อแยกตามหน่วยกระบวนการผลิต (Process Units & Battery Limits) เพื่อจัดลำดับการเริ่มเดินระบบตามแผน PSSR
              </p>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={handleExportOverviewCsv}
                className="px-3.5 py-2 rounded-xl border border-slate-700 bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <Download size={14} />
                <span>Export Unit Report</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {unitBreakdown.map(u => {
              const unitJobs = jobs.filter(j => j.unit === u.unitName);
              const catACount = unitJobs.flatMap(j => j.punchList).filter(p => p.category === 'A' && p.status === 'Open').length;

              return (
                <div
                  key={u.unitName}
                  className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4 hover:border-emerald-500/50 transition-all"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider">
                        Operating Unit
                      </span>
                      <h4 className="text-base font-bold text-slate-900 dark:text-white mt-0.5">
                        {u.unitName}
                      </h4>
                    </div>
                    <span className={`text-sm font-black font-mono ${
                      u.pct === 100 ? 'text-emerald-500' : u.pct >= 50 ? 'text-indigo-500' : 'text-amber-500'
                    }`}>
                      {u.pct}%
                    </span>
                  </div>

                  <div className="w-full bg-slate-100 dark:bg-slate-800 h-2.5 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        u.pct === 100 ? 'bg-emerald-500' : u.pct >= 50 ? 'bg-indigo-500' : 'bg-amber-500'
                      }`}
                      style={{ width: `${u.pct}%` }}
                    />
                  </div>

                  <div className="grid grid-cols-3 gap-2 text-center text-xs pt-1">
                    <div className="p-2 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60">
                      <div className="text-[9px] text-slate-400 font-mono uppercase">Packages</div>
                      <div className="font-bold text-slate-800 dark:text-slate-200 mt-0.5">{u.done}/{u.total}</div>
                    </div>
                    <div className="p-2 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60">
                      <div className="text-[9px] text-slate-400 font-mono uppercase">Critical</div>
                      <div className="font-bold text-amber-500 mt-0.5">{u.critical} ★</div>
                    </div>
                    <div className="p-2 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60">
                      <div className="text-[9px] text-slate-400 font-mono uppercase">Open Punch</div>
                      <div className={`font-bold mt-0.5 ${catACount > 0 ? 'text-rose-500' : 'text-slate-700 dark:text-slate-300'}`}>
                        {u.openPunches} {catACount > 0 ? `(${catACount}A)` : ''}
                      </div>
                    </div>
                  </div>

                  <div className="space-y-1.5 pt-2 border-t border-slate-100 dark:border-slate-800">
                    <span className="text-[10px] font-mono text-slate-400 font-semibold uppercase">Registered Packages</span>
                    <div className="space-y-1">
                      {unitJobs.map(j => (
                        <div
                          key={j.id}
                          className="w-full text-left p-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 text-xs flex items-center justify-between group transition-colors"
                        >
                          <div className="flex items-center gap-1.5 min-w-0">
                            <span className="font-mono font-bold text-indigo-600 dark:text-indigo-400 shrink-0 text-[11px]">
                              {j.assetTag || j.jobNo}
                            </span>
                            {j.isCriticalPath && <span className="text-amber-500 font-bold text-[10px]">★</span>}
                            <span className="text-slate-700 dark:text-slate-300 truncate text-[11px]">{j.title}</span>
                          </div>
                          <span className={`text-[10px] font-semibold shrink-0 ml-2 ${
                            isJobCompleted(j) ? 'text-emerald-500' : 'text-amber-500'
                          }`}>
                            {isJobCompleted(j) ? 'Done' : 'Active'}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                </div>
              );
            })}
          </div>

        </div>
      )}

      {/* Quick Punch Inspection & Evidence Modal */}
      {quickInspectPunchItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl max-w-xl w-full p-5 sm:p-6 space-y-5 animate-in zoom-in-95">
            
            <div className="flex items-start justify-between border-b border-slate-100 dark:border-slate-800 pb-3.5">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-mono font-black text-sm text-slate-900 dark:text-white">
                    {quickInspectPunchItem.id}
                  </span>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-black ${
                    quickInspectPunchItem.category === 'A'
                      ? 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 border border-rose-300 dark:border-rose-800'
                      : quickInspectPunchItem.category === 'B'
                      ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border border-amber-300 dark:border-amber-800'
                      : 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300 border border-blue-300 dark:border-blue-800'
                  }`}>
                    Category {quickInspectPunchItem.category} • {quickInspectPunchItem.category === 'A' ? 'Immediate Blocker' : quickInspectPunchItem.category === 'B' ? 'Before Startup' : 'Minor'}
                  </span>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                    quickInspectPunchItem.status === 'Resolved'
                      ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                      : 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                  }`}>
                    {quickInspectPunchItem.status}
                  </span>
                </div>
                <h4 className="text-base font-bold text-slate-900 dark:text-slate-100">
                  {quickInspectPunchItem.type}
                </h4>
              </div>

              <button
                type="button"
                onClick={() => setQuickInspectPunchItem(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 space-y-1">
                <span className="text-[10px] uppercase font-mono text-slate-400 font-bold">Asset Tag</span>
                <div className="font-mono font-bold text-slate-900 dark:text-white flex items-center gap-1">
                  <span>{quickInspectPunchItem.assetTag || 'N/A'}</span>
                  {quickInspectPunchItem.isCriticalPath && (
                    <span className="text-amber-500 font-bold">★ Critical</span>
                  )}
                </div>
                <div className="text-[10px] text-slate-500 line-clamp-1">
                  {quickInspectPunchItem.jobTitle}
                </div>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 space-y-1">
                <span className="text-[10px] uppercase font-mono text-slate-400 font-bold">Location & System</span>
                <div className="font-bold text-slate-900 dark:text-white">
                  {quickInspectPunchItem.unit}
                </div>
                <div className="text-[10px] text-slate-500 font-mono">
                  Plant: {quickInspectPunchItem.plant} • WO: {quickInspectPunchItem.workOrder || 'WO-884021'}
                </div>
              </div>
            </div>

            <div className="space-y-1.5 text-xs">
              <span className="text-[10px] uppercase font-mono text-slate-400 font-bold">Defect Description & Remedial Action</span>
              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 leading-relaxed font-medium">
                {quickInspectPunchItem.description}
              </div>
            </div>

            <div className={`p-3 rounded-xl border text-xs space-y-1 ${
              quickInspectPunchItem.category === 'A'
                ? 'bg-rose-50/80 dark:bg-rose-950/20 border-rose-300 dark:border-rose-900/50 text-rose-800 dark:text-rose-300'
                : quickInspectPunchItem.category === 'B'
                ? 'bg-amber-50/80 dark:bg-amber-950/20 border-amber-300 dark:border-amber-900/50 text-amber-800 dark:text-amber-300'
                : 'bg-blue-50/80 dark:bg-blue-950/20 border-blue-300 dark:border-blue-900/50 text-blue-800 dark:text-blue-300'
            }`}>
              <div className="font-bold flex items-center gap-1.5 text-[11px]">
                <Info size={13} />
                <span>API 510/570 Turnaround Punch List Standard:</span>
              </div>
              <p className="text-[10px] leading-relaxed">
                {quickInspectPunchItem.category === 'A' && (
                  'Category A items are direct startup blockers. No hydrocarbon feed or operational pressure test may proceed until this defect is certified and stamped resolved by the Lead QC Inspector.'
                )}
                {quickInspectPunchItem.category === 'B' && (
                  'Category B items must be resolved before hydrocarbon introduction (Oil-In), but allow preliminary nitrogen flushing and electrical dry run checks.'
                )}
                {quickInspectPunchItem.category === 'C' && (
                  'Category C items are minor non-critical punch items (e.g. nameplates, insulation cladding, touch-up paint) that can be cleared during post-startup handover.'
                )}
              </p>
            </div>

            {quickInspectPunchItem.photoRequired && (
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/60 space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] uppercase font-mono text-slate-400 font-bold flex items-center gap-1">
                    <Camera size={12} className="text-amber-500" />
                    <span>Photographic Evidence Required</span>
                  </span>
                  <span className="text-[10px] text-emerald-600 font-semibold flex items-center gap-1">
                    <Check size={11} />
                    <span>Evidence Attached</span>
                  </span>
                </div>

                <div className="h-28 rounded-lg bg-slate-900 flex items-center justify-center border border-slate-700 relative overflow-hidden group">
                  <div className="text-center p-3 space-y-1">
                    <Camera size={22} className="mx-auto text-amber-400" />
                    <div className="text-[10px] font-mono text-slate-300 font-bold">
                      EVIDENCE_PHOTO_{quickInspectPunchItem.id.toUpperCase()}.JPG
                    </div>
                    <div className="text-[9px] text-slate-500">
                      Timestamped GPS EX-Camera Scan • QA Tagged
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div className="flex items-center justify-between text-[10px] text-slate-500 font-mono border-t border-slate-100 dark:border-slate-800 pt-3">
              <span>Reported By: {quickInspectPunchItem.reportedBy}</span>
              <span>Timestamp: {quickInspectPunchItem.timestamp}</span>
            </div>

            <div className="flex items-center justify-end gap-2 pt-1 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setQuickInspectPunchItem(null)}
                className="px-3.5 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                Close
              </button>
              <button
                type="button"
                onClick={() => {
                  handleToggleJobPunchStatus(quickInspectPunchItem.jobId, quickInspectPunchItem.id);
                  setQuickInspectPunchItem((prev: any) => prev ? {
                    ...prev,
                    status: prev.status === 'Open' ? 'Resolved' : 'Open'
                  } : null);
                }}
                className={`px-4 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shadow-sm active:scale-95 ${
                  quickInspectPunchItem.status === 'Resolved'
                    ? 'bg-amber-600 hover:bg-amber-700 text-white'
                    : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                }`}
              >
                {quickInspectPunchItem.status === 'Resolved' ? (
                  <>
                    <Clock size={13} />
                    <span>Reopen Punch Item</span>
                  </>
                ) : (
                  <>
                    <Check size={13} />
                    <span>Mark as Resolved</span>
                  </>
                )}
              </button>
            </div>

          </div>
        </div>
      )}

      {/* Add New Punch Item Modal */}
      {showAddPunchModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl max-w-lg w-full p-5 sm:p-6 space-y-4 animate-in zoom-in-95">
            
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div>
                <h4 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Plus className="text-amber-500" size={18} />
                  <span>Log New Punch List Item</span>
                </h4>
                <p className="text-[11px] text-slate-500">
                  Record a mechanical defect or pre-startup clearance condition.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowAddPunchModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreatePunchItem} className="space-y-3.5 text-xs">
              <div className="space-y-1">
                <label className="font-semibold text-slate-700 dark:text-slate-300">
                  Target Turnover Package *
                </label>
                <select
                  value={addPunchJobId}
                  onChange={e => setAddPunchJobId(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white outline-none font-medium cursor-pointer"
                >
                  {jobs.map(j => (
                    <option key={j.id} value={j.id}>
                      {j.isCriticalPath ? '★ [Critical Path] ' : ''}{j.assetTag || j.jobNo} — {(j.title || j.description || j.jobNo || '').slice(0, 48)}... ({j.unit ? j.unit.split(' ')[0] : ''})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-semibold text-slate-700 dark:text-slate-300">
                    Category Classification *
                  </label>
                  <select
                    value={addPunchCategory}
                    onChange={e => setAddPunchCategory(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-bold outline-none cursor-pointer"
                  >
                    <option value="A">Cat A — Immediate Action (Startup Blocker)</option>
                    <option value="B">Cat B — Action before Oil In (Pre-startup)</option>
                    <option value="C">Cat C — Minor / Post-Startup</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="font-semibold text-slate-700 dark:text-slate-300">
                    Defect Type *
                  </label>
                  <select
                    value={addPunchType}
                    onChange={e => setAddPunchType(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white outline-none cursor-pointer"
                  >
                    <option value="Flange Bolt Torquing">Flange Bolt Torquing</option>
                    <option value="Missing Blind List Sign-Off">Missing Blind List Sign-Off</option>
                    <option value="Burner FG Shut-Off Leak">Burner FG Shut-Off Leak</option>
                    <option value="NDT Weld Flaw">NDT Weld Flaw</option>
                    <option value="Instrument Wiring">Instrument Wiring</option>
                    <option value="Paint / Coating Damage">Paint / Coating Damage</option>
                    <option value="Grounding Bonding">Grounding Bonding</option>
                    <option value="Insulation Damage">Insulation Damage</option>
                    <option value="Valve Tag Stamp">Valve Tag Stamp</option>
                    <option value="Other Mechanical Defect">Other Mechanical Defect</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-slate-700 dark:text-slate-300">
                  Defect Description & Remedial Requirement *
                </label>
                <textarea
                  required
                  rows={3}
                  value={addPunchDescription}
                  onChange={e => setAddPunchDescription(e.target.value)}
                  placeholder="Specify the exact location, discrepancy observed, and required remedial actions..."
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-amber-500/20"
                />
              </div>

              <div className="grid grid-cols-2 gap-3 items-center">
                <div className="space-y-1">
                  <label className="font-semibold text-slate-700 dark:text-slate-300">
                    Reported By
                  </label>
                  <input
                    type="text"
                    value={addPunchReportedBy}
                    onChange={e => setAddPunchReportedBy(e.target.value)}
                    className="w-full px-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white outline-none"
                  />
                </div>

                <div className="pt-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={addPunchPhotoRequired}
                      onChange={e => setAddPunchPhotoRequired(e.target.checked)}
                      className="w-4 h-4 rounded text-amber-600 focus:ring-amber-500 cursor-pointer"
                    />
                    <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                      <Camera size={13} className="text-amber-500" />
                      <span>Photo Verification Required</span>
                    </span>
                  </label>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setShowAddPunchModal(false)}
                  className="px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-sm active:scale-95"
                >
                  <Plus size={14} />
                  <span>Submit Punch Item</span>
                </button>
              </div>
            </form>

          </div>
        </div>
      )}

      {/* Executive Briefing Modal */}
      {showBriefingModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl max-w-2xl w-full p-6 space-y-6">
            
            <div className="flex items-start justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider font-mono text-indigo-600 dark:text-indigo-400">
                  Steering Committee Briefing Document
                </span>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white mt-0.5">
                  Plant Turnaround (T/O) Executive Readiness Report
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Official mechanical handover status summary for Plant Site Leadership.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowBriefingModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                  <div className="text-[10px] text-slate-400 uppercase font-mono">Readiness</div>
                  <div className="text-xl font-black text-emerald-600 mt-1">{readinessPercentage}%</div>
                </div>
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                  <div className="text-[10px] text-slate-400 uppercase font-mono">Packages</div>
                  <div className="text-xl font-black text-slate-900 dark:text-white mt-1">{completedJobsCount}/{totalJobsCount}</div>
                </div>
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                  <div className="text-[10px] text-slate-400 uppercase font-mono">Critical Path</div>
                  <div className="text-xl font-black text-amber-500 mt-1">{criticalReadinessPercentage}%</div>
                </div>
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                  <div className="text-[10px] text-slate-400 uppercase font-mono">Open Cat A</div>
                  <div className={`text-xl font-black mt-1 ${openCatAPunches.length > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                    {openCatAPunches.length}
                  </div>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-2">
                <div className="font-bold text-slate-800 dark:text-slate-200 text-xs">
                  1. Turnaround Governance Certification:
                </div>
                <p className="text-slate-600 dark:text-slate-300 leading-relaxed text-[11px]">
                  Mechanical turnover packages comply with refinery Standard Operating Procedure <strong>SOP-TO-402</strong>. All completed packages feature verified Butt List walk-downs, QA/QC NDT certifications, torque records, and dual Operations & Job Owner digital endorsements.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-2">
                <div className="font-bold text-slate-800 dark:text-slate-200 text-xs">
                  2. Pre-Startup Safety Review (PSSR) Clearance:
                </div>
                <p className="text-slate-600 dark:text-slate-300 leading-relaxed text-[11px]">
                  {openCatAPunches.length === 0 ? (
                    <span className="text-emerald-600 dark:text-emerald-400 font-bold">
                      ✓ All Category A critical punch items are 100% resolved across all systems. Refinery units are technically cleared for nitrogen leak hold and hydrocarbon re-introduction.
                    </span>
                  ) : (
                    <span className="text-rose-600 dark:text-rose-400 font-bold">
                      ⚠ Caution: {openCatAPunches.length} Category A safety/isolation punch item(s) remain open. Hydrocarbon introduction cannot commence until Category A items are cleared.
                    </span>
                  )}
                </p>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setShowBriefingModal(false)}
                className="px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                Close
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowBriefingModal(false);
                  window.print();
                }}
                className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer shadow-sm"
              >
                <Printer size={14} />
                <span>Print Briefing</span>
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
