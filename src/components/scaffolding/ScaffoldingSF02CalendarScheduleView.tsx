import React, { useState, useMemo } from 'react';
import {
  Calendar, ChevronLeft, ChevronRight, Clock, MapPin, Box,
  ShieldCheck, Wrench, Hammer, AlertTriangle, CheckCircle2,
  Calculator, CalendarClock, Edit, Eye, Download, Sparkles,
  Layers, HardHat, CheckCircle, XCircle, Filter, BarChart3,
  Table as TableIcon, CalendarDays, ArrowUpDown, FileText
} from 'lucide-react';
import { ScaffoldingSFJob, calculateTotalHireDays } from '../../data/scaffoldingSFData';
import { format, parseISO, addDays, differenceInDays } from 'date-fns';

const THAI_MONTHS = [
  'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
  'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'
];

const EN_MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const WEEKDAYS_TH = ['อา.', 'จ.', 'อ.', 'พ.', 'พฤ.', 'ศ.', 'ส.'];
const WEEKDAYS_EN = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

interface ScaffoldingSF02CalendarScheduleViewProps {
  jobs: ScaffoldingSFJob[];
  isTh: boolean;
  onOpenEstimate: (job: ScaffoldingSFJob) => void;
  onOpenHireControl: (job: ScaffoldingSFJob) => void;
  onOpenDetails: (job: ScaffoldingSFJob) => void;
  onOpenApprove: (job: ScaffoldingSFJob) => void;
  onOpenReject: (job: ScaffoldingSFJob) => void;
  onLocateOnPlotPlan: (job: ScaffoldingSFJob) => void;
}

export type CalendarSubMode = 'month' | 'gantt' | 'schedule-table';
export type MilestoneFilterType = 'all' | 'on-hire' | 'active' | 'inspection-7d' | 'extended' | 'off-hire';

interface NormalizedJobSchedule {
  job: ScaffoldingSFJob;
  onHireDate: string;
  originalOffHireDate: string;
  offHireDate: string;
  totalDays: number;
  isExtended: boolean;
  extensionLabel: string;
  volumeM3: number;
  tagColor: 'Yellow' | 'Green' | 'Red';
  inspectionDates: string[]; // Every 7 days after onHireDate while active
}

export default function ScaffoldingSF02CalendarScheduleView({
  jobs,
  isTh,
  onOpenEstimate,
  onOpenHireControl,
  onOpenDetails,
  onOpenApprove,
  onOpenReject,
  onLocateOnPlotPlan
}: ScaffoldingSF02CalendarScheduleViewProps) {
  // Default to September 2026 where turnaround scaffolding jobs are concentrated
  const [activeMonthDate, setActiveMonthDate] = useState<Date>(() => new Date(2026, 8, 1));
  const [selectedDateStr, setSelectedDateStr] = useState<string>('2026-09-08');
  const [subMode, setSubMode] = useState<CalendarSubMode>('month');
  const [milestoneFilter, setMilestoneFilter] = useState<MilestoneFilterType>('all');
  const [sortField, setSortField] = useState<'onHire' | 'offHire' | 'volume' | 'days'>('onHire');
  const [sortAsc, setSortAsc] = useState<boolean>(true);

  const currentYear = activeMonthDate.getFullYear();
  const currentMonth = activeMonthDate.getMonth(); // 0-indexed
  const monthPrefix = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}`;

  const monthTitle = isTh
    ? `${THAI_MONTHS[currentMonth]} ${currentYear}`
    : `${EN_MONTHS[currentMonth]} ${currentYear}`;

  // Normalize all jobs with computed onHireDate, offHireDate, originalOffHireDate, and 7-day statutory inspection dates
  const normalizedSchedules = useMemo<NormalizedJobSchedule[]>(() => {
    return jobs.map(job => {
      const onHireDate = job.hireControl?.onHireDate || job.requiredDate || '2026-09-01';
      const offHireDate = job.hireControl?.offHireDate || job.offHireDate || '2026-09-16';
      const originalOffHireDate = job.hireControl?.originalOffHireDate || offHireDate;
      const extReq = job.hireControl?.extensionRequest || 'None';
      const isExtended = extReq !== 'None' || offHireDate > originalOffHireDate;
      const totalDays = job.hireControl?.totalDays || calculateTotalHireDays(onHireDate, offHireDate);
      const volumeM3 = job.estimate?.isEvaluated ? (job.estimate.volume || 0) : (job.scaffoldEstimate?.volumeM3 || 0);

      const tagColor: 'Yellow' | 'Green' | 'Red' =
        job.lifecycleStage === 'Dismantle' || job.status === 'Completed'
          ? 'Red'
          : job.lifecycleStage === 'In-use'
            ? 'Green'
            : 'Yellow';

      // Calculate 7-day GI-835.1 statutory scaffold tag inspection dates between onHireDate and offHireDate
      const inspectionDates: string[] = [];
      try {
        const start = parseISO(onHireDate);
        const end = parseISO(offHireDate);
        if (!isNaN(start.getTime()) && !isNaN(end.getTime())) {
          let step = 7;
          while (step <= 90) {
            const inspDate = addDays(start, step);
            if (inspDate < end) {
              inspectionDates.push(format(inspDate, 'yyyy-MM-dd'));
            } else {
              break;
            }
            step += 7;
          }
        }
      } catch {
        // ignore invalid dates
      }

      return {
        job,
        onHireDate,
        originalOffHireDate,
        offHireDate,
        totalDays,
        isExtended,
        extensionLabel: extReq !== 'None' ? extReq : (isExtended ? 'Extended' : 'None'),
        volumeM3,
        tagColor,
        inspectionDates
      };
    });
  }, [jobs]);

  // Filter normalized schedules by milestoneFilter
  const filteredSchedules = useMemo(() => {
    const monthStart = `${monthPrefix}-01`;
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
    const monthEnd = `${monthPrefix}-${String(daysInMonth).padStart(2, '0')}`;

    return normalizedSchedules.filter(item => {
      // Check if job overlaps with current month or has milestones in current month
      const overlapsMonth = item.onHireDate <= monthEnd && item.offHireDate >= monthStart;

      if (milestoneFilter === 'on-hire') {
        return item.onHireDate.startsWith(monthPrefix);
      }
      if (milestoneFilter === 'off-hire') {
        return item.offHireDate.startsWith(monthPrefix);
      }
      if (milestoneFilter === 'inspection-7d') {
        return item.inspectionDates.some(d => d.startsWith(monthPrefix));
      }
      if (milestoneFilter === 'extended') {
        return item.isExtended && overlapsMonth;
      }
      if (milestoneFilter === 'active') {
        return item.tagColor === 'Green' && overlapsMonth;
      }
      return overlapsMonth;
    });
  }, [normalizedSchedules, milestoneFilter, monthPrefix, currentYear, currentMonth]);

  // Monthly KPI Telemetry
  const monthKpis = useMemo(() => {
    const monthStart = `${monthPrefix}-01`;
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
    const monthEnd = `${monthPrefix}-${String(daysInMonth).padStart(2, '0')}`;

    let activeInMonth = 0;
    let totalVolumeInMonth = 0;
    let onHireStartingInMonth = 0;
    let offHireEndingInMonth = 0;
    let inspectionsInMonth = 0;
    let extendedInMonth = 0;

    normalizedSchedules.forEach(s => {
      const overlaps = s.onHireDate <= monthEnd && s.offHireDate >= monthStart;
      if (overlaps) {
        activeInMonth++;
        totalVolumeInMonth += s.volumeM3;
        if (s.isExtended) extendedInMonth++;
      }
      if (s.onHireDate.startsWith(monthPrefix)) onHireStartingInMonth++;
      if (s.offHireDate.startsWith(monthPrefix)) offHireEndingInMonth++;
      inspectionsInMonth += s.inspectionDates.filter(d => d.startsWith(monthPrefix)).length;
    });

    return {
      activeInMonth,
      totalVolumeInMonth,
      onHireStartingInMonth,
      offHireEndingInMonth,
      inspectionsInMonth,
      extendedInMonth
    };
  }, [normalizedSchedules, monthPrefix, currentYear, currentMonth]);

  // Build Calendar Days Matrix for current month
  const calendarDaysData = useMemo(() => {
    const firstDayOfWeek = new Date(currentYear, currentMonth, 1).getDay(); // 0 = Sun
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();

    const daysList: {
      dayNumber: number;
      dateStr: string;
      onHireJobs: NormalizedJobSchedule[];
      offHireJobs: NormalizedJobSchedule[];
      inspectionJobs: NormalizedJobSchedule[];
      activeJobs: NormalizedJobSchedule[];
      extendedJobsToday: NormalizedJobSchedule[];
      totalActiveVolume: number;
      totalActiveWorkers: number;
    }[] = [];

    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${monthPrefix}-${String(d).padStart(2, '0')}`;
      const onHireJobs = filteredSchedules.filter(s => s.onHireDate === dateStr);
      const offHireJobs = filteredSchedules.filter(s => s.offHireDate === dateStr);
      const inspectionJobs = filteredSchedules.filter(s => s.inspectionDates.includes(dateStr));
      const activeJobs = filteredSchedules.filter(s => s.onHireDate <= dateStr && s.offHireDate >= dateStr);
      const extendedJobsToday = activeJobs.filter(s => s.isExtended && dateStr > s.originalOffHireDate);

      const totalActiveVolume = activeJobs.reduce((acc, s) => acc + s.volumeM3, 0);
      const totalActiveWorkers = activeJobs.reduce((acc, s) => acc + (s.job.maxWorkers || 0), 0);

      daysList.push({
        dayNumber: d,
        dateStr,
        onHireJobs,
        offHireJobs,
        inspectionJobs,
        activeJobs,
        extendedJobsToday,
        totalActiveVolume,
        totalActiveWorkers
      });
    }

    return {
      firstDayOfWeek,
      daysInMonth,
      daysList
    };
  }, [currentYear, currentMonth, monthPrefix, filteredSchedules]);

  // Selected Day Details for the Right Inspector Panel
  const selectedDayInfo = useMemo(() => {
    const match = calendarDaysData.daysList.find(d => d.dateStr === selectedDateStr);
    if (match) return match;

    // Fallback computation if selectedDateStr is outside current month
    const onHireJobs = normalizedSchedules.filter(s => s.onHireDate === selectedDateStr);
    const offHireJobs = normalizedSchedules.filter(s => s.offHireDate === selectedDateStr);
    const inspectionJobs = normalizedSchedules.filter(s => s.inspectionDates.includes(selectedDateStr));
    const activeJobs = normalizedSchedules.filter(s => s.onHireDate <= selectedDateStr && s.offHireDate >= selectedDateStr);
    const extendedJobsToday = activeJobs.filter(s => s.isExtended && selectedDateStr > s.originalOffHireDate);

    return {
      dayNumber: parseInt(selectedDateStr.split('-')[2] || '1', 10),
      dateStr: selectedDateStr,
      onHireJobs,
      offHireJobs,
      inspectionJobs,
      activeJobs,
      extendedJobsToday,
      totalActiveVolume: activeJobs.reduce((acc, s) => acc + s.volumeM3, 0),
      totalActiveWorkers: activeJobs.reduce((acc, s) => acc + (s.job.maxWorkers || 0), 0)
    };
  }, [calendarDaysData, selectedDateStr, normalizedSchedules]);

  // Sorted schedules for Gantt and Schedule Table
  const sortedSchedules = useMemo(() => {
    return [...filteredSchedules].sort((a, b) => {
      let cmp = 0;
      if (sortField === 'onHire') cmp = a.onHireDate.localeCompare(b.onHireDate);
      else if (sortField === 'offHire') cmp = a.offHireDate.localeCompare(b.offHireDate);
      else if (sortField === 'volume') cmp = a.volumeM3 - b.volumeM3;
      else if (sortField === 'days') cmp = a.totalDays - b.totalDays;
      return sortAsc ? cmp : -cmp;
    });
  }, [filteredSchedules, sortField, sortAsc]);

  // Month Navigation Handlers
  const handlePrevMonth = () => {
    const prev = new Date(currentYear, currentMonth - 1, 1);
    setActiveMonthDate(prev);
    setSelectedDateStr(`${prev.getFullYear()}-${String(prev.getMonth() + 1).padStart(2, '0')}-01`);
  };

  const handleNextMonth = () => {
    const next = new Date(currentYear, currentMonth + 1, 1);
    setActiveMonthDate(next);
    setSelectedDateStr(`${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, '0')}-01`);
  };

  const handleJumpToMonth = (year: number, monthZeroIdx: number, defaultDay = 8) => {
    setActiveMonthDate(new Date(year, monthZeroIdx, 1));
    setSelectedDateStr(`${year}-${String(monthZeroIdx + 1).padStart(2, '0')}-${String(defaultDay).padStart(2, '0')}`);
  };

  const handleExportScheduleCsv = () => {
    const headers = [
      'Job ID',
      'Equipment Tag',
      'Location Zone',
      'Contractor',
      'Scaffold Type',
      'Lifecycle Tag',
      'Volume (m3)',
      'On-Hire Date',
      'Original Off-Hire Date',
      'Current Off-Hire Date',
      'Extension Request',
      'Total Hire Days',
      '7-Day Inspection Dates',
      'Status'
    ];
    const rows = sortedSchedules.map(s => [
      s.job.id,
      s.job.equipmentTag,
      `"${(s.job.locationArea || '').replace(/"/g, '""')}"`,
      s.job.company,
      s.job.scaffoldType,
      `${s.tagColor} Tag (${s.job.lifecycleStage || 'Execution'})`,
      s.volumeM3,
      s.onHireDate,
      s.originalOffHireDate,
      s.offHireDate,
      `"${s.extensionLabel}"`,
      s.totalDays,
      `"${s.inspectionDates.join(', ')}"`,
      s.job.status
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `SF02_Scaffolding_Schedule_${monthPrefix}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getTagBadgeStyle = (tagColor: 'Yellow' | 'Green' | 'Red') => {
    if (tagColor === 'Green') {
      return 'bg-emerald-100 dark:bg-emerald-950/70 text-emerald-800 dark:text-emerald-300 border-emerald-300 dark:border-emerald-700';
    }
    if (tagColor === 'Red') {
      return 'bg-purple-100 dark:bg-purple-950/70 text-purple-800 dark:text-purple-300 border-purple-300 dark:border-purple-700';
    }
    return 'bg-amber-100 dark:bg-amber-950/70 text-amber-800 dark:text-amber-300 border-amber-300 dark:border-amber-700';
  };

  return (
    <div className="space-y-4 animate-in fade-in duration-200">
      {/* =========================================================================
          1. TOP SCHEDULE COMMAND BAR & SUB-MODE SWITCHER
         ========================================================================= */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 sm:p-5 shadow-xs space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-4">
          {/* Left: Title & Month Navigation */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-cyan-600 to-blue-700 text-white flex items-center justify-center shadow-md shadow-cyan-700/20 shrink-0">
              <CalendarDays size={22} />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-md bg-cyan-100 dark:bg-cyan-950/80 text-cyan-800 dark:text-cyan-300 border border-cyan-200 dark:border-cyan-800 font-mono">
                  SF02 SCHEDULE & HIRE TIMELINE
                </span>
                <span className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">
                  GI-835.1 7-Day Tag Inspection & Rental Lifecycle
                </span>
              </div>
              <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-white tracking-tight mt-0.5">
                {isTh
                  ? 'ปฏิทินแผนงานติดตั้ง ตรวจป้าย 7 วัน และควบคุมวันเช่านั่งร้าน'
                  : 'Scaffolding Erection, 7-Day Inspection & Rental Schedule'}
              </h2>
            </div>
          </div>

          {/* Center: Month Switcher & Quick Turnaround Window Jumps */}
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-1 rounded-xl border border-slate-200 dark:border-slate-700">
              <button
                type="button"
                onClick={handlePrevMonth}
                className="p-1.5 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-700 transition-colors cursor-pointer"
                title={isTh ? 'เดือนก่อนหน้า' : 'Previous Month'}
              >
                <ChevronLeft size={16} />
              </button>
              <div className="px-3.5 py-1 text-xs sm:text-sm font-black text-slate-900 dark:text-white min-w-[140px] text-center font-mono">
                {monthTitle}
              </div>
              <button
                type="button"
                onClick={handleNextMonth}
                className="p-1.5 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-700 transition-colors cursor-pointer"
                title={isTh ? 'เดือนถัดไป' : 'Next Month'}
              >
                <ChevronRight size={16} />
              </button>
            </div>

            {/* Quick Month Jump Pills */}
            <div className="flex items-center gap-1 bg-slate-50 dark:bg-slate-800/60 p-1 rounded-xl border border-slate-200/80 dark:border-slate-700/70 text-[11px]">
              <button
                type="button"
                onClick={() => handleJumpToMonth(2026, 8, 8)}
                className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                  currentYear === 2026 && currentMonth === 8
                    ? 'bg-cyan-700 text-white shadow-2xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {isTh ? 'ก.ย. 26 (TA Peak)' : 'Sep 26 (TA Peak)'}
              </button>
              <button
                type="button"
                onClick={() => handleJumpToMonth(2026, 9, 2)}
                className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                  currentYear === 2026 && currentMonth === 9
                    ? 'bg-cyan-700 text-white shadow-2xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {isTh ? 'ต.ค. 26 (Extended)' : 'Oct 26 (Extended)'}
              </button>
            </div>
          </div>

          {/* Right: 3 Schedule Sub-Modes Switcher & CSV Export */}
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center p-1 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
              <button
                type="button"
                onClick={() => setSubMode('month')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  subMode === 'month'
                    ? 'bg-white dark:bg-slate-700 text-cyan-700 dark:text-cyan-400 shadow-xs font-black'
                    : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <Calendar size={13} />
                <span>{isTh ? 'ปฏิทินรายเดือน' : 'Month Grid'}</span>
              </button>
              <button
                type="button"
                onClick={() => setSubMode('gantt')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  subMode === 'gantt'
                    ? 'bg-white dark:bg-slate-700 text-cyan-700 dark:text-cyan-400 shadow-xs font-black'
                    : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <BarChart3 size={13} />
                <span>{isTh ? 'ไทม์ไลน์วันเช่า (Gantt)' : 'Lifecycle Gantt'}</span>
              </button>
              <button
                type="button"
                onClick={() => setSubMode('schedule-table')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  subMode === 'schedule-table'
                    ? 'bg-white dark:bg-slate-700 text-cyan-700 dark:text-cyan-400 shadow-xs font-black'
                    : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <TableIcon size={13} />
                <span>{isTh ? 'ตารางกำหนดการเช่า' : 'Schedule Ledger'}</span>
              </button>
            </div>

            <button
              type="button"
              onClick={handleExportScheduleCsv}
              className="px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-colors"
              title={isTh ? 'ส่งออกตารางกำหนดการเช่านั่งร้าน (CSV)' : 'Export Scaffolding Schedule CSV'}
            >
              <Download size={13} />
              <span className="hidden sm:inline">CSV</span>
            </button>
          </div>
        </div>

        {/* Monthly Schedule KPI Strip (5 Metrics) */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          <div
            onClick={() => setMilestoneFilter('all')}
            className={`p-3 rounded-xl border cursor-pointer transition-all ${
              milestoneFilter === 'all'
                ? 'bg-cyan-50/80 dark:bg-cyan-950/40 border-cyan-400 ring-1 ring-cyan-400/30'
                : 'bg-slate-50/70 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700/80 hover:border-cyan-400'
            }`}
          >
            <div className="flex items-center justify-between text-[11px] font-bold text-slate-500 dark:text-slate-400">
              <span>{isTh ? 'งานในเดือนนี้ (Active)' : 'Active in Month'}</span>
              <Layers size={13} className="text-cyan-600" />
            </div>
            <div className="text-lg font-black text-slate-900 dark:text-white font-mono mt-0.5">
              {monthKpis.activeInMonth} <span className="text-xs font-normal text-slate-500">jobs</span>
            </div>
            <div className="text-[10px] font-mono text-cyan-700 dark:text-cyan-400 font-bold">
              Vol: {monthKpis.totalVolumeInMonth.toLocaleString()} m³
            </div>
          </div>

          <div
            onClick={() => setMilestoneFilter(milestoneFilter === 'on-hire' ? 'all' : 'on-hire')}
            className={`p-3 rounded-xl border cursor-pointer transition-all ${
              milestoneFilter === 'on-hire'
                ? 'bg-amber-50/90 dark:bg-amber-950/40 border-amber-400 ring-1 ring-amber-400/30'
                : 'bg-slate-50/70 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700/80 hover:border-amber-400'
            }`}
          >
            <div className="flex items-center justify-between text-[11px] font-bold text-amber-700 dark:text-amber-400">
              <span>{isTh ? 'เริ่มติดตั้ง / On-Hire' : 'On-Hire Starts'}</span>
              <Wrench size={13} className="text-amber-500" />
            </div>
            <div className="text-lg font-black text-amber-700 dark:text-amber-400 font-mono mt-0.5">
              {monthKpis.onHireStartingInMonth} <span className="text-xs font-normal text-slate-500">{isTh ? 'งาน' : 'starts'}</span>
            </div>
            <div className="text-[10px] text-slate-500 dark:text-slate-400">
              {isTh ? 'วันเริ่มคิดค่าเช่า (Day 1)' : 'Erection & Tag Handover'}
            </div>
          </div>

          <div
            onClick={() => setMilestoneFilter(milestoneFilter === 'inspection-7d' ? 'all' : 'inspection-7d')}
            className={`p-3 rounded-xl border cursor-pointer transition-all ${
              milestoneFilter === 'inspection-7d'
                ? 'bg-blue-50/90 dark:bg-blue-950/40 border-blue-400 ring-1 ring-blue-400/30'
                : 'bg-slate-50/70 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700/80 hover:border-blue-400'
            }`}
          >
            <div className="flex items-center justify-between text-[11px] font-bold text-blue-700 dark:text-blue-400">
              <span>{isTh ? 'รอบตรวจป้าย 7 วัน' : '7-Day Tag Audits'}</span>
              <ShieldCheck size={13} className="text-blue-500" />
            </div>
            <div className="text-lg font-black text-blue-700 dark:text-blue-400 font-mono mt-0.5">
              {monthKpis.inspectionsInMonth} <span className="text-xs font-normal text-slate-500">{isTh ? 'รอบตรวจ' : 'cycles'}</span>
            </div>
            <div className="text-[10px] text-slate-500 dark:text-slate-400">
              {isTh ? 'มาตรฐาน GI-835.1 ทุก 7 วัน' : 'Statutory GI-835.1 Re-cert'}
            </div>
          </div>

          <div
            onClick={() => setMilestoneFilter(milestoneFilter === 'extended' ? 'all' : 'extended')}
            className={`p-3 rounded-xl border cursor-pointer transition-all ${
              milestoneFilter === 'extended'
                ? 'bg-rose-50/90 dark:bg-rose-950/40 border-rose-400 ring-1 ring-rose-400/30'
                : 'bg-slate-50/70 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700/80 hover:border-rose-400'
            }`}
          >
            <div className="flex items-center justify-between text-[11px] font-bold text-rose-700 dark:text-rose-400">
              <span>{isTh ? 'ขยายเวลาเช่า (Extended)' : 'Extended Rentals'}</span>
              <Clock size={13} className="text-rose-500" />
            </div>
            <div className="text-lg font-black text-rose-700 dark:text-rose-400 font-mono mt-0.5">
              {monthKpis.extendedInMonth} <span className="text-xs font-normal text-slate-500">{isTh ? 'งาน' : 'jobs'}</span>
            </div>
            <div className="text-[10px] text-slate-500 dark:text-slate-400">
              {isTh ? 'มีคำขอขยายวัน Off-Hire' : 'Beyond Initial Off-Hire'}
            </div>
          </div>

          <div
            onClick={() => setMilestoneFilter(milestoneFilter === 'off-hire' ? 'all' : 'off-hire')}
            className={`p-3 rounded-xl border cursor-pointer transition-all ${
              milestoneFilter === 'off-hire'
                ? 'bg-purple-50/90 dark:bg-purple-950/40 border-purple-400 ring-1 ring-purple-400/30'
                : 'bg-slate-50/70 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700/80 hover:border-purple-400'
            }`}
          >
            <div className="flex items-center justify-between text-[11px] font-bold text-purple-700 dark:text-purple-400">
              <span>{isTh ? 'กำหนดรื้อถอน / Off-Hire' : 'Off-Hire / Dismantle'}</span>
              <Hammer size={13} className="text-purple-500" />
            </div>
            <div className="text-lg font-black text-purple-700 dark:text-purple-400 font-mono mt-0.5">
              {monthKpis.offHireEndingInMonth} <span className="text-xs font-normal text-slate-500">{isTh ? 'งาน' : 'due'}</span>
            </div>
            <div className="text-[10px] text-slate-500 dark:text-slate-400">
              {isTh ? 'วันครบกำหนดคืนนั่งร้าน' : 'Target Red Tag & Off-Hire'}
            </div>
          </div>
        </div>

        {/* Milestone Filter Bar & Legend */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-xs">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 flex items-center gap-1 mr-1">
              <Filter size={12} />
              <span>{isTh ? 'กรองเหตุการณ์:' : 'Milestone Filter:'}</span>
            </span>
            {([
              { id: 'all', labelTh: 'ทั้งหมดในเดือนนี้', labelEn: 'All in Month' },
              { id: 'on-hire', labelTh: 'วันเริ่มติดตั้ง (On-Hire)', labelEn: 'On-Hire Start' },
              { id: 'active', labelTh: 'ป้ายเขียวใช้งานอยู่ (Green Tag)', labelEn: 'Active Green Tag' },
              { id: 'inspection-7d', labelTh: 'ครบตรวจป้าย 7 วัน', labelEn: '7-Day Tag Audit' },
              { id: 'extended', labelTh: 'งานขยายเวลาเช่า', labelEn: 'Extended Rental' },
              { id: 'off-hire', labelTh: 'กำหนดรื้อถอน (Off-Hire)', labelEn: 'Off-Hire Target' }
            ] as const).map(tab => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setMilestoneFilter(tab.id)}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                  milestoneFilter === tab.id
                    ? 'bg-cyan-700 text-white shadow-2xs'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
              >
                {isTh ? tab.labelTh : tab.labelEn}
              </button>
            ))}
          </div>

          {/* Color Legend */}
          <div className="flex items-center gap-3 flex-wrap text-[11px] text-slate-600 dark:text-slate-400 font-medium">
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block" />
              <span>Yellow Tag (Execution)</span>
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" />
              <span>Green Tag (In-Use)</span>
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-full bg-purple-500 inline-block" />
              <span>Red Tag (Dismantle)</span>
            </span>
            <span className="flex items-center gap-1">
              <ShieldCheck size={12} className="text-blue-500" />
              <span>7D Audit</span>
            </span>
          </div>
        </div>
      </div>

      {/* =========================================================================
          2A. SUB-MODE 1: MONTHLY CALENDAR GRID + SELECTED DAY DISPATCH INSPECTOR
         ========================================================================= */}
      {subMode === 'month' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
          {/* Left 8 Columns: Interactive 7-Day Monthly Calendar Grid */}
          <div className="lg:col-span-8 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-xs">
            {/* Weekday Header Row */}
            <div className="grid grid-cols-7 bg-slate-50 dark:bg-slate-800/90 border-b border-slate-200 dark:border-slate-700 text-center">
              {(isTh ? WEEKDAYS_TH : WEEKDAYS_EN).map((dayName, idx) => (
                <div
                  key={dayName}
                  className={`py-2.5 text-[11px] font-black uppercase tracking-wider ${
                    idx === 0 || idx === 6
                      ? 'text-rose-600 dark:text-rose-400'
                      : 'text-slate-600 dark:text-slate-300'
                  }`}
                >
                  {dayName}
                </div>
              ))}
            </div>

            {/* Calendar Cells Grid */}
            <div className="grid grid-cols-7 auto-rows-fr divide-x divide-y divide-slate-200 dark:divide-slate-800 border-b border-slate-200 dark:border-slate-800">
              {/* Leading blank cells */}
              {Array.from({ length: calendarDaysData.firstDayOfWeek }).map((_, i) => (
                <div
                  key={`empty-start-${i}`}
                  className="min-h-[120px] bg-slate-50/50 dark:bg-slate-950/40 p-2"
                />
              ))}

              {/* Month Day Cells */}
              {calendarDaysData.daysList.map(day => {
                const isSelected = day.dateStr === selectedDateStr;
                const hasEvents =
                  day.onHireJobs.length > 0 ||
                  day.offHireJobs.length > 0 ||
                  day.inspectionJobs.length > 0 ||
                  day.activeJobs.length > 0;

                // Prioritize milestone jobs on this day cell
                const milestoneItems: {
                  schedule: NormalizedJobSchedule;
                  badgeType: 'ON-HIRE' | '7D-INSP' | 'OFF-HIRE' | 'EXT' | 'ACTIVE';
                }[] = [];

                day.onHireJobs.forEach(s => milestoneItems.push({ schedule: s, badgeType: 'ON-HIRE' }));
                day.inspectionJobs.forEach(s => {
                  if (!milestoneItems.some(m => m.schedule.job.id === s.job.id)) {
                    milestoneItems.push({ schedule: s, badgeType: '7D-INSP' });
                  }
                });
                day.offHireJobs.forEach(s => {
                  if (!milestoneItems.some(m => m.schedule.job.id === s.job.id)) {
                    milestoneItems.push({ schedule: s, badgeType: 'OFF-HIRE' });
                  }
                });
                day.extendedJobsToday.forEach(s => {
                  if (!milestoneItems.some(m => m.schedule.job.id === s.job.id)) {
                    milestoneItems.push({ schedule: s, badgeType: 'EXT' });
                  }
                });
                day.activeJobs.forEach(s => {
                  if (!milestoneItems.some(m => m.schedule.job.id === s.job.id)) {
                    milestoneItems.push({ schedule: s, badgeType: 'ACTIVE' });
                  }
                });

                const visiblePills = milestoneItems.slice(0, 3);
                const hiddenCount = Math.max(0, milestoneItems.length - visiblePills.length);

                return (
                  <div
                    key={day.dateStr}
                    onClick={() => setSelectedDateStr(day.dateStr)}
                    className={`min-h-[128px] p-2 flex flex-col justify-between transition-all cursor-pointer select-none relative group ${
                      isSelected
                        ? 'bg-cyan-50/70 dark:bg-cyan-950/40 ring-2 ring-inset ring-cyan-500 z-10'
                        : hasEvents
                          ? 'bg-white dark:bg-slate-900 hover:bg-slate-50/90 dark:hover:bg-slate-800/60'
                          : 'bg-slate-50/20 dark:bg-slate-900/40 hover:bg-slate-50/60 dark:hover:bg-slate-800/30'
                    }`}
                  >
                    {/* Top Row: Day Number + Daily Active Volume Badge */}
                    <div className="flex items-center justify-between gap-1">
                      <span
                        className={`w-6 h-6 rounded-lg text-xs font-mono font-black flex items-center justify-center ${
                          isSelected
                            ? 'bg-cyan-700 text-white shadow-2xs'
                            : day.onHireJobs.length > 0 || day.offHireJobs.length > 0
                              ? 'bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900'
                              : 'text-slate-700 dark:text-slate-300'
                        }`}
                      >
                        {day.dayNumber}
                      </span>

                      {day.totalActiveVolume > 0 && (
                        <span
                          className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200/80 dark:border-slate-700"
                          title={isTh ? `ปริมาตรนั่งร้านที่ตั้งอยู่รวม ${day.totalActiveVolume} m³` : `Active scaffold volume: ${day.totalActiveVolume} m³`}
                        >
                          {day.totalActiveVolume.toLocaleString()}m³
                        </span>
                      )}
                    </div>

                    {/* Middle: Milestone Counter Micro-Badges */}
                    {(day.onHireJobs.length > 0 || day.inspectionJobs.length > 0 || day.offHireJobs.length > 0) && (
                      <div className="flex items-center gap-1 flex-wrap my-1">
                        {day.onHireJobs.length > 0 && (
                          <span className="px-1.5 py-0.2 rounded text-[9px] font-mono font-bold bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-800">
                            +{day.onHireJobs.length} On-Hire
                          </span>
                        )}
                        {day.inspectionJobs.length > 0 && (
                          <span className="px-1.5 py-0.2 rounded text-[9px] font-mono font-bold bg-blue-100 dark:bg-blue-950/80 text-blue-800 dark:text-blue-300 border border-blue-300 dark:border-blue-800">
                            {day.inspectionJobs.length} Insp
                          </span>
                        )}
                        {day.offHireJobs.length > 0 && (
                          <span className="px-1.5 py-0.2 rounded text-[9px] font-mono font-bold bg-purple-100 dark:bg-purple-950/80 text-purple-800 dark:text-purple-300 border border-purple-300 dark:border-purple-800">
                            {day.offHireJobs.length} Off-Hire
                          </span>
                        )}
                      </div>
                    )}

                    {/* Bottom: Job Pills */}
                    <div className="space-y-1 mt-1">
                      {visiblePills.map(({ schedule, badgeType }) => {
                        const dotColor =
                          schedule.tagColor === 'Green'
                            ? 'bg-emerald-500'
                            : schedule.tagColor === 'Red'
                              ? 'bg-purple-500'
                              : 'bg-amber-500';

                        return (
                          <div
                            key={`${day.dateStr}-${schedule.job.id}`}
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedDateStr(day.dateStr);
                              onOpenDetails(schedule.job);
                            }}
                            className={`px-1.5 py-0.5 rounded-md text-[10px] font-mono flex items-center justify-between gap-1 border transition-all hover:scale-[1.01] ${
                              badgeType === 'ON-HIRE'
                                ? 'bg-amber-50 dark:bg-amber-950/50 border-amber-300 dark:border-amber-800 text-amber-900 dark:text-amber-200 font-bold'
                                : badgeType === '7D-INSP'
                                  ? 'bg-blue-50 dark:bg-blue-950/50 border-blue-300 dark:border-blue-800 text-blue-900 dark:text-blue-200 font-bold'
                                  : badgeType === 'OFF-HIRE'
                                    ? 'bg-purple-50 dark:bg-purple-950/50 border-purple-300 dark:border-purple-800 text-purple-900 dark:text-purple-200 font-bold'
                                    : badgeType === 'EXT'
                                      ? 'bg-rose-50 dark:bg-rose-950/40 border-rose-300 dark:border-rose-800 text-rose-900 dark:text-rose-200'
                                      : 'bg-slate-50 dark:bg-slate-800/90 border-slate-200 dark:border-slate-700/80 text-slate-700 dark:text-slate-300'
                            }`}
                            title={`${schedule.job.id} (${schedule.job.equipmentTag}) - ${schedule.job.jobDescription}`}
                          >
                            <div className="flex items-center gap-1 truncate">
                              <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${dotColor}`} />
                              <span className="truncate">{schedule.job.equipmentTag}</span>
                            </div>
                            <span className="text-[8px] uppercase tracking-tighter shrink-0 opacity-85">
                              {badgeType === 'ON-HIRE'
                                ? 'START'
                                : badgeType === '7D-INSP'
                                  ? '7D'
                                  : badgeType === 'OFF-HIRE'
                                    ? 'END'
                                    : badgeType === 'EXT'
                                      ? '+EXT'
                                      : `${schedule.volumeM3}m³`}
                            </span>
                          </div>
                        );
                      })}

                      {hiddenCount > 0 && (
                        <div className="text-[10px] font-mono font-bold text-cyan-700 dark:text-cyan-400 text-center bg-cyan-50/70 dark:bg-cyan-950/30 rounded py-0.5">
                          +{hiddenCount} {isTh ? 'งานนั่งร้าน' : 'more active'}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right 4 Columns: Selected Date Scaffolding Operations & Lifecycle Inspector */}
          <div className="lg:col-span-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 sm:p-5 shadow-xs space-y-4 sticky top-4">
            {/* Selected Date Header */}
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div>
                <div className="text-[10px] font-mono uppercase tracking-wider text-cyan-700 dark:text-cyan-400 font-bold">
                  {isTh ? 'รายละเอียดแผนงานประจำวัน' : 'DAILY SCAFFOLDING DISPATCH'}
                </div>
                <h3 className="text-base font-black text-slate-900 dark:text-white font-mono mt-0.5 flex items-center gap-2">
                  <Calendar size={16} className="text-cyan-600" />
                  <span>{selectedDateStr}</span>
                </h3>
              </div>
              <div className="text-right">
                <div className="text-xs font-black text-slate-900 dark:text-white font-mono">
                  {selectedDayInfo.activeJobs.length} {isTh ? 'งาน' : 'Active'}
                </div>
                <div className="text-[11px] font-mono text-emerald-600 dark:text-emerald-400 font-bold">
                  {selectedDayInfo.totalActiveVolume.toLocaleString()} m³
                </div>
              </div>
            </div>

            {/* Daily Telemetry Mini-Grid */}
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="p-2.5 rounded-xl bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200/80 dark:border-amber-800/60">
                <div className="text-[10px] font-bold text-amber-700 dark:text-amber-300">On-Hire</div>
                <div className="text-base font-black font-mono text-amber-800 dark:text-amber-300">
                  {selectedDayInfo.onHireJobs.length}
                </div>
              </div>
              <div className="p-2.5 rounded-xl bg-blue-50/70 dark:bg-blue-950/30 border border-blue-200/80 dark:border-blue-800/60">
                <div className="text-[10px] font-bold text-blue-700 dark:text-blue-300">7D Audit</div>
                <div className="text-base font-black font-mono text-blue-800 dark:text-blue-300">
                  {selectedDayInfo.inspectionJobs.length}
                </div>
              </div>
              <div className="p-2.5 rounded-xl bg-purple-50/70 dark:bg-purple-950/30 border border-purple-200/80 dark:border-purple-800/60">
                <div className="text-[10px] font-bold text-purple-700 dark:text-purple-300">Off-Hire</div>
                <div className="text-base font-black font-mono text-purple-800 dark:text-purple-300">
                  {selectedDayInfo.offHireJobs.length}
                </div>
              </div>
            </div>

            {/* Job Cards List for Selected Date */}
            <div className="space-y-2.5 max-h-[540px] overflow-y-auto custom-scrollbar pr-1">
              {selectedDayInfo.activeJobs.length === 0 ? (
                <div className="p-8 text-center text-slate-400 dark:text-slate-500 text-xs border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl">
                  {isTh
                    ? 'ไม่มีรายการนั่งร้านที่ตั้งอยู่หรือมีกำหนดการในวันที่เลือก'
                    : 'No scaffolding jobs scheduled on this date.'}
                </div>
              ) : (
                selectedDayInfo.activeJobs.map(item => {
                  const isStartingToday = item.onHireDate === selectedDateStr;
                  const isEndingToday = item.offHireDate === selectedDateStr;
                  const isInspectToday = item.inspectionDates.includes(selectedDateStr);
                  const isInExtensionWindow = item.isExtended && selectedDateStr > item.originalOffHireDate;

                  return (
                    <div
                      key={item.job.id}
                      className="p-3.5 rounded-2xl bg-slate-50/90 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700/80 hover:border-cyan-400 transition-all space-y-2.5"
                    >
                      {/* Top row: ID, Equipment Tag, Tag Color Badge */}
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono font-black text-xs text-slate-900 dark:text-white">
                            {item.job.id}
                          </span>
                          <span className="px-2 py-0.5 rounded-md bg-cyan-100 dark:bg-cyan-950/70 text-cyan-800 dark:text-cyan-300 font-mono font-bold text-[10px] border border-cyan-200 dark:border-cyan-800">
                            {item.job.equipmentTag}
                          </span>
                        </div>
                        <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold border ${getTagBadgeStyle(item.tagColor)}`}>
                          {item.tagColor} Tag
                        </span>
                      </div>

                      {/* Event Badges on this specific date */}
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {isStartingToday && (
                          <span className="px-2 py-0.5 rounded-md bg-amber-500 text-slate-950 font-black text-[10px] flex items-center gap-1">
                            <Wrench size={10} />
                            <span>{isTh ? 'เริ่มติดตั้ง / On-Hire วันนี้' : 'ON-HIRE START TODAY'}</span>
                          </span>
                        )}
                        {isInspectToday && (
                          <span className="px-2 py-0.5 rounded-md bg-blue-600 text-white font-black text-[10px] flex items-center gap-1">
                            <ShieldCheck size={10} />
                            <span>{isTh ? 'ครบกำหนดตรวจป้าย 7 วัน (GI-835.1)' : '7-DAY TAG AUDIT DUE'}</span>
                          </span>
                        )}
                        {isEndingToday && (
                          <span className="px-2 py-0.5 rounded-md bg-purple-600 text-white font-black text-[10px] flex items-center gap-1">
                            <Hammer size={10} />
                            <span>{isTh ? 'ครบกำหนดรื้อถอน / Off-Hire วันนี้' : 'OFF-HIRE TARGET TODAY'}</span>
                          </span>
                        )}
                        {isInExtensionWindow && (
                          <span className="px-2 py-0.5 rounded-md bg-rose-100 dark:bg-rose-950/80 text-rose-700 dark:text-rose-300 border border-rose-300 dark:border-rose-800 font-bold text-[10px] flex items-center gap-1">
                            <Clock size={10} />
                            <span>{item.extensionLabel}</span>
                          </span>
                        )}
                      </div>

                      {/* Description */}
                      <div className="text-xs text-slate-700 dark:text-slate-200 font-medium line-clamp-2">
                        {item.job.jobDescription}
                      </div>

                      {/* Rental Window & Volume */}
                      <div className="grid grid-cols-2 gap-2 p-2 rounded-xl bg-white dark:bg-slate-900/80 border border-slate-200/70 dark:border-slate-700/60 text-[10px] font-mono">
                        <div>
                          <span className="text-slate-400 block">On-Hire → Off-Hire</span>
                          <span className="font-bold text-slate-800 dark:text-slate-200">
                            {item.onHireDate.slice(5)} → {item.offHireDate.slice(5)} ({item.totalDays}d)
                          </span>
                        </div>
                        <div className="text-right">
                          <span className="text-slate-400 block">{item.job.company}</span>
                          <span className="font-black text-emerald-600 dark:text-emerald-400">
                            {item.volumeM3.toLocaleString()} M³ · {item.job.scaffoldType}
                          </span>
                        </div>
                      </div>

                      {/* Quick Action Buttons */}
                      <div className="flex items-center justify-between gap-1.5 pt-1">
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => onOpenEstimate(item.job)}
                            className="px-2 py-1 rounded-lg bg-white dark:bg-slate-900 hover:bg-cyan-50 dark:hover:bg-slate-700 text-cyan-700 dark:text-cyan-400 border border-slate-200 dark:border-slate-700 text-[10px] font-bold flex items-center gap-1 cursor-pointer"
                            title="Scaffold Estimate (M³)"
                          >
                            <Calculator size={11} />
                            <span>Estimate</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => onOpenHireControl(item.job)}
                            className="px-2 py-1 rounded-lg bg-white dark:bg-slate-900 hover:bg-emerald-50 dark:hover:bg-slate-700 text-emerald-700 dark:text-emerald-400 border border-slate-200 dark:border-slate-700 text-[10px] font-bold flex items-center gap-1 cursor-pointer"
                            title="Execution / In-use / Dismantle Control"
                          >
                            <CalendarClock size={11} />
                            <span>Hire/Tag</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => onLocateOnPlotPlan(item.job)}
                            className="p-1 rounded-lg bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 cursor-pointer"
                            title={isTh ? 'ดูพิกัดบน Plot Plan' : 'Locate on CAD Plot Plan'}
                          >
                            <MapPin size={12} />
                          </button>
                        </div>

                        <div className="flex items-center gap-1">
                          {item.job.status === 'Requested' && (
                            <>
                              <button
                                type="button"
                                onClick={() => onOpenApprove(item.job)}
                                className="p-1 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 cursor-pointer"
                                title="Approve"
                              >
                                <CheckCircle size={13} />
                              </button>
                              <button
                                type="button"
                                onClick={() => onOpenReject(item.job)}
                                className="p-1 rounded-lg bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-800 cursor-pointer"
                                title="Reject"
                              >
                                <XCircle size={13} />
                              </button>
                            </>
                          )}
                          <button
                            type="button"
                            onClick={() => onOpenDetails(item.job)}
                            className="px-2.5 py-1 rounded-lg bg-cyan-700 hover:bg-cyan-800 text-white text-[10px] font-bold flex items-center gap-1 cursor-pointer"
                          >
                            <Eye size={11} />
                            <span>{isTh ? 'ดูใบงาน' : 'Dossier'}</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          2B. SUB-MODE 2: LIFECYCLE GANTT & RENTAL EXTENSION TIMELINE
         ========================================================================= */}
      {subMode === 'gantt' && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-xs">
          <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3 bg-slate-50/70 dark:bg-slate-800/50">
            <div>
              <h3 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-2">
                <BarChart3 size={16} className="text-cyan-600" />
                <span>
                  {isTh
                    ? `ไทม์ไลน์อายุการเช่านั่งร้าน รอบตรวจป้าย 7 วัน และช่วงขยายเวลา (${monthTitle})`
                    : `Scaffolding Lifecycle Gantt, 7-Day Inspection Cycles & Extension Spans (${monthTitle})`}
                </span>
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                {isTh
                  ? 'แถบสีทึบแสดงช่วงเช่าตามแผนเดิม แถบลายเส้นสีชมพูแสดงช่วงขอขยายเวลา (Extension) และไอคอนโล่สีฟ้าแสดงวันตรวจป้ายทุก 7 วัน'
                  : 'Solid bars show base hire duration, rose-striped bars highlight rental extensions, and blue shields mark 7-day GI-835.1 inspections.'}
              </p>
            </div>
          </div>

          <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full border-collapse text-left text-xs">
              <thead>
                <tr className="bg-slate-100 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 text-[10px] font-mono font-bold text-slate-600 dark:text-slate-300">
                  <th className="p-3 min-w-[260px] sticky left-0 z-20 bg-slate-100 dark:bg-slate-800 border-r border-slate-200 dark:border-slate-700">
                    {isTh ? 'ใบงาน / อุปกรณ์ / ผู้รับเหมา / ปริมาตร' : 'Job / Tag / Contractor / Volume'}
                  </th>
                  {calendarDaysData.daysList.map(d => {
                    const isSelected = d.dateStr === selectedDateStr;
                    return (
                      <th
                        key={d.dateStr}
                        onClick={() => setSelectedDateStr(d.dateStr)}
                        className={`min-w-[34px] py-2 px-1 text-center border-r border-slate-200/70 dark:border-slate-700/60 cursor-pointer transition-colors ${
                          isSelected
                            ? 'bg-cyan-700 text-white'
                            : 'hover:bg-slate-200/70 dark:hover:bg-slate-700'
                        }`}
                      >
                        <div>{String(d.dayNumber).padStart(2, '0')}</div>
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                {sortedSchedules.length === 0 ? (
                  <tr>
                    <td
                      colSpan={calendarDaysData.daysInMonth + 1}
                      className="p-10 text-center text-slate-400 text-xs"
                    >
                      {isTh ? 'ไม่พบงานนั่งร้านในเดือนที่เลือก' : 'No scaffolding jobs scheduled in this month.'}
                    </td>
                  </tr>
                ) : (
                  sortedSchedules.map(item => (
                    <tr
                      key={item.job.id}
                      className="hover:bg-slate-50/90 dark:hover:bg-slate-800/40 transition-colors"
                    >
                      {/* Sticky Left Info Cell */}
                      <td className="p-2.5 sticky left-0 z-10 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-700">
                        <div className="flex items-center justify-between gap-2">
                          <button
                            type="button"
                            onClick={() => onOpenDetails(item.job)}
                            className="font-mono font-black text-xs text-slate-900 dark:text-white hover:text-cyan-600 cursor-pointer flex items-center gap-1.5"
                          >
                            <span>{item.job.id}</span>
                            <span className="px-1.5 py-0.2 rounded bg-cyan-100 dark:bg-cyan-950/70 text-cyan-800 dark:text-cyan-300 text-[10px]">
                              {item.job.equipmentTag}
                            </span>
                          </button>
                          <button
                            type="button"
                            onClick={() => onOpenHireControl(item.job)}
                            className={`px-1.5 py-0.5 rounded text-[9px] font-bold border cursor-pointer ${getTagBadgeStyle(item.tagColor)}`}
                          >
                            {item.tagColor} · {item.totalDays}d
                          </button>
                        </div>
                        <div className="text-[11px] text-slate-600 dark:text-slate-400 truncate max-w-[240px] mt-0.5">
                          {item.job.jobDescription}
                        </div>
                        <div className="flex items-center justify-between text-[10px] font-mono text-slate-500 mt-1">
                          <span>{item.job.company}</span>
                          <span className="font-bold text-emerald-600 dark:text-emerald-400">
                            {item.volumeM3.toLocaleString()} M³
                          </span>
                        </div>
                      </td>

                      {/* Day Timeline Cells */}
                      {calendarDaysData.daysList.map(d => {
                        const isActiveDay = d.dateStr >= item.onHireDate && d.dateStr <= item.offHireDate;
                        const isStartDay = d.dateStr === item.onHireDate;
                        const isEndDay = d.dateStr === item.offHireDate;
                        const isInspectionDay = item.inspectionDates.includes(d.dateStr);
                        const isExtendedSpan = item.isExtended && d.dateStr > item.originalOffHireDate && d.dateStr <= item.offHireDate;

                        const barBgClass = !isActiveDay
                          ? ''
                          : isExtendedSpan
                            ? 'bg-rose-500/85 dark:bg-rose-600/80 text-white border-y border-dashed border-rose-300'
                            : item.tagColor === 'Green'
                              ? 'bg-emerald-500/85 dark:bg-emerald-600/85 text-white'
                              : item.tagColor === 'Red'
                                ? 'bg-purple-500/85 dark:bg-purple-600/85 text-white'
                                : 'bg-amber-500/90 dark:bg-amber-500/85 text-slate-950';

                        return (
                          <td
                            key={`${item.job.id}-${d.dateStr}`}
                            onClick={() => {
                              setSelectedDateStr(d.dateStr);
                              if (isActiveDay) onOpenHireControl(item.job);
                            }}
                            className={`p-0.5 border-r border-slate-100 dark:border-slate-800/70 text-center align-middle ${
                              isActiveDay ? 'cursor-pointer' : ''
                            } ${d.dateStr === selectedDateStr ? 'bg-cyan-50/40 dark:bg-cyan-950/20' : ''}`}
                            title={
                              isActiveDay
                                ? `${item.job.id} (${item.job.equipmentTag}) | ${d.dateStr}${
                                    isStartDay ? ' [ON-HIRE START]' : ''
                                  }${isInspectionDay ? ' [7-DAY TAG AUDIT]' : ''}${
                                    isExtendedSpan ? ` [${item.extensionLabel}]` : ''
                                  }${isEndDay ? ' [OFF-HIRE TARGET]' : ''}`
                                : undefined
                            }
                          >
                            {isActiveDay && (
                              <div
                                className={`h-7 w-full flex items-center justify-center text-[9px] font-mono font-black transition-all ${barBgClass} ${
                                  isStartDay ? 'rounded-l-lg pl-0.5' : ''
                                } ${isEndDay ? 'rounded-r-lg pr-0.5' : ''}`}
                              >
                                {isStartDay ? (
                                  <Wrench size={11} className="shrink-0" />
                                ) : isEndDay ? (
                                  <Hammer size={11} className="shrink-0" />
                                ) : isInspectionDay ? (
                                  <span className="w-4 h-4 rounded-full bg-blue-700 text-white flex items-center justify-center shadow-xs">
                                    7D
                                  </span>
                                ) : isExtendedSpan ? (
                                  <span>+</span>
                                ) : null}
                              </div>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))
                )}

                {/* Bottom Summary Row: Daily Active Volume (m³) Load */}
                <tr className="bg-slate-50 dark:bg-slate-800/90 border-t-2 border-slate-200 dark:border-slate-700 font-mono text-[10px]">
                  <td className="p-2.5 sticky left-0 z-10 bg-slate-50 dark:bg-slate-800 border-r border-slate-200 dark:border-slate-700 font-bold text-slate-700 dark:text-slate-200">
                    <div className="flex items-center justify-between">
                      <span>{isTh ? 'ปริมาตรนั่งร้านรายวัน (Daily Active M³)' : 'Daily Active Volume Load (M³)'}</span>
                      <Box size={13} className="text-cyan-600" />
                    </div>
                  </td>
                  {calendarDaysData.daysList.map(d => (
                    <td
                      key={`load-${d.dateStr}`}
                      className="p-1 text-center border-r border-slate-200/60 dark:border-slate-700/60 align-bottom"
                    >
                      {d.totalActiveVolume > 0 ? (
                        <div className="flex flex-col items-center gap-0.5">
                          <span className="text-[9px] font-bold text-cyan-700 dark:text-cyan-300">
                            {d.activeJobs.length}j
                          </span>
                          <span className="text-[8px] text-slate-500 dark:text-slate-400">
                            {Math.round(d.totalActiveVolume)}
                          </span>
                        </div>
                      ) : (
                        <span className="text-slate-300 dark:text-slate-700">-</span>
                      )}
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* =========================================================================
          2C. SUB-MODE 3: SCHEDULE & STATUTORY INSPECTION LEDGER TABLE
         ========================================================================= */}
      {subMode === 'schedule-table' && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-xs">
          <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3 bg-slate-50/70 dark:bg-slate-800/50">
            <div>
              <h3 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-2">
                <TableIcon size={16} className="text-cyan-600" />
                <span>
                  {isTh
                    ? `ตารางควบคุมกำหนดการเช่า รอบตรวจป้าย 7 วัน และวันครบกำหนดรื้อถอน (${monthTitle})`
                    : `Scaffolding Rental Schedule & 7-Day Statutory Inspection Ledger (${monthTitle})`}
                </span>
              </h3>
            </div>
            <div className="flex items-center gap-2 text-xs">
              <span className="text-slate-500">{isTh ? 'เรียงตาม:' : 'Sort by:'}</span>
              {([
                { key: 'onHire', label: isTh ? 'วันเริ่มเช่า (On-Hire)' : 'On-Hire Date' },
                { key: 'offHire', label: isTh ? 'วันคืนของ (Off-Hire)' : 'Off-Hire Date' },
                { key: 'volume', label: isTh ? 'ปริมาตร (M³)' : 'Volume (M³)' },
                { key: 'days', label: isTh ? 'จำนวนวันเช่า' : 'Hire Days' }
              ] as const).map(s => (
                <button
                  key={s.key}
                  type="button"
                  onClick={() => {
                    if (sortField === s.key) setSortAsc(!sortAsc);
                    else {
                      setSortField(s.key);
                      setSortAsc(true);
                    }
                  }}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-bold flex items-center gap-1 cursor-pointer ${
                    sortField === s.key
                      ? 'bg-cyan-700 text-white'
                      : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
                  }`}
                >
                  <span>{s.label}</span>
                  <ArrowUpDown size={11} />
                </button>
              ))}
            </div>
          </div>

          <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-bold text-[11px] uppercase tracking-wider">
                  <th className="p-3">Job ID & Tag</th>
                  <th className="p-3">{isTh ? 'รายละเอียด / พื้นที่' : 'Scope & Zone'}</th>
                  <th className="p-3">{isTh ? 'ผู้รับเหมา / ปริมาตร' : 'Contractor & Volume'}</th>
                  <th className="p-3">{isTh ? 'วันเริ่มเช่า (On-Hire)' : 'On-Hire Date'}</th>
                  <th className="p-3">{isTh ? 'รอบตรวจป้าย 7 วัน (GI-835.1)' : '7-Day Tag Inspections'}</th>
                  <th className="p-3">{isTh ? 'กำหนดรื้อถอน (Off-Hire)' : 'Off-Hire & Extension'}</th>
                  <th className="p-3">{isTh ? 'สถานะป้าย (Tag)' : 'Lifecycle Tag'}</th>
                  <th className="p-3 text-center">{isTh ? 'จัดการ' : 'Actions'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {sortedSchedules.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="p-10 text-center text-slate-400">
                      {isTh ? 'ไม่พบกำหนดการงานนั่งร้านตามตัวกรองที่เลือก' : 'No scheduled scaffolding jobs match current filters.'}
                    </td>
                  </tr>
                ) : (
                  sortedSchedules.map(item => (
                    <tr
                      key={item.job.id}
                      className="hover:bg-slate-50/90 dark:hover:bg-slate-800/50 transition-colors"
                    >
                      <td className="p-3 font-mono">
                        <div className="font-black text-slate-900 dark:text-white">{item.job.id}</div>
                        <span className="inline-block mt-1 px-2 py-0.5 rounded bg-cyan-100 dark:bg-cyan-950/60 text-cyan-800 dark:text-cyan-300 font-bold text-[10px] border border-cyan-200 dark:border-cyan-800">
                          {item.job.equipmentTag}
                        </span>
                      </td>

                      <td className="p-3 max-w-[240px]">
                        <div className="font-semibold text-slate-800 dark:text-slate-200 truncate" title={item.job.jobDescription}>
                          {item.job.jobDescription}
                        </div>
                        <div className="text-[10px] text-slate-500 mt-0.5 truncate">
                          {item.job.locationArea}
                        </div>
                      </td>

                      <td className="p-3 font-mono">
                        <div className="font-bold text-slate-800 dark:text-slate-200">{item.job.company}</div>
                        <div className="text-emerald-600 dark:text-emerald-400 font-black text-[11px]">
                          {item.volumeM3.toLocaleString()} M³ · {item.job.scaffoldType}
                        </div>
                      </td>

                      <td className="p-3 font-mono">
                        <span className="px-2 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 font-bold border border-emerald-200 dark:border-emerald-800/60">
                          {item.onHireDate}
                        </span>
                      </td>

                      <td className="p-3">
                        <div className="flex items-center gap-1 flex-wrap max-w-[200px]">
                          {item.inspectionDates.length === 0 ? (
                            <span className="text-[10px] text-slate-400 font-mono">-</span>
                          ) : (
                            item.inspectionDates.map((d, i) => (
                              <span
                                key={d}
                                className="px-1.5 py-0.5 rounded bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 font-mono text-[10px] font-bold"
                                title={`7-Day Inspection #${i + 1}: ${d}`}
                              >
                                {d.slice(5)}
                              </span>
                            ))
                          )}
                        </div>
                      </td>

                      <td className="p-3 font-mono">
                        <div className="flex items-center gap-1.5">
                          <span className="px-2 py-0.5 rounded-lg bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 font-bold border border-purple-200 dark:border-purple-800/60">
                            {item.offHireDate}
                          </span>
                          <span className="text-[10px] font-bold text-slate-600 dark:text-slate-400">
                            ({item.totalDays}d)
                          </span>
                        </div>
                        {item.isExtended && (
                          <div className="mt-1 text-[10px] text-rose-600 dark:text-rose-400 font-bold flex items-center gap-1">
                            <Clock size={10} />
                            <span>{item.extensionLabel} (Orig: {item.originalOffHireDate.slice(5)})</span>
                          </div>
                        )}
                      </td>

                      <td className="p-3">
                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold border inline-flex items-center gap-1 ${getTagBadgeStyle(item.tagColor)}`}>
                          <span>{item.tagColor} Tag ({item.job.lifecycleStage})</span>
                        </span>
                      </td>

                      <td className="p-3 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            type="button"
                            onClick={() => onOpenEstimate(item.job)}
                            className="p-1.5 rounded-lg bg-slate-100 hover:bg-cyan-100 text-cyan-700 dark:bg-slate-800 dark:text-cyan-400 border border-slate-200 dark:border-slate-700 cursor-pointer"
                            title="Scaffold Estimate"
                          >
                            <Calculator size={13} />
                          </button>
                          <button
                            type="button"
                            onClick={() => onOpenHireControl(item.job)}
                            className="p-1.5 rounded-lg bg-slate-100 hover:bg-emerald-100 text-emerald-700 dark:bg-slate-800 dark:text-emerald-400 border border-slate-200 dark:border-slate-700 cursor-pointer"
                            title="Hire / Lifecycle Control"
                          >
                            <CalendarClock size={13} />
                          </button>
                          <button
                            type="button"
                            onClick={() => onLocateOnPlotPlan(item.job)}
                            className="p-1.5 rounded-lg bg-slate-100 hover:bg-amber-100 text-amber-700 dark:bg-slate-800 dark:text-amber-400 border border-slate-200 dark:border-slate-700 cursor-pointer"
                            title="Locate on Plot Plan"
                          >
                            <MapPin size={13} />
                          </button>
                          <button
                            type="button"
                            onClick={() => onOpenDetails(item.job)}
                            className="p-1.5 rounded-lg bg-slate-100 hover:bg-blue-100 text-blue-700 dark:bg-slate-800 dark:text-blue-400 border border-slate-200 dark:border-slate-700 cursor-pointer"
                            title="View Full Dossier"
                          >
                            <Edit size={13} />
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
    </div>
  );
}
