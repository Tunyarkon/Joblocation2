import React, { useState, useMemo, useEffect } from 'react';
import { 
  X, Calendar, CalendarRange, Printer, Download, Filter, 
  CheckCircle2, Clock, AlertTriangle, Truck, MapPin, Search,
  ChevronRight, Sparkles, FileText, ArrowRight
} from 'lucide-react';
import { JobDetail } from './CalendarView';

interface ExportDateRangeModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialDateFrom?: string;
  initialDateTo?: string;
  allJobs: JobDetail[];
  currentActiveMonth?: Date;
  isTh?: boolean;
  onConfirmExportPdf: (config: {
    dateFrom: string;
    dateTo: string;
    filteredJobs: JobDetail[];
    filterPlant: string;
    filterType: string;
    filterStatus: string;
  }) => void;
}

export default function ExportDateRangeModal({
  isOpen,
  onClose,
  initialDateFrom,
  initialDateTo,
  allJobs,
  currentActiveMonth = new Date(2026, 8, 1),
  isTh = true,
  onConfirmExportPdf
}: ExportDateRangeModalProps) {
  // Helper to format Date to YYYY-MM-DD
  const formatYmd = (d: Date) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };

  // Month boundary helpers
  const getMonthStart = (d: Date) => new Date(d.getFullYear(), d.getMonth(), 1);
  const getMonthEnd = (d: Date) => new Date(d.getFullYear(), d.getMonth() + 1, 0);

  // Default range: either props or the current active month
  const defaultFrom = initialDateFrom || formatYmd(getMonthStart(currentActiveMonth));
  const defaultTo = initialDateTo || formatYmd(getMonthEnd(currentActiveMonth));

  const [dateFrom, setDateFrom] = useState<string>(defaultFrom);
  const [dateTo, setDateTo] = useState<string>(defaultTo);
  const [activePreset, setActivePreset] = useState<'month' | 'today' | '7days' | 'custom'>('month');
  
  // Filters
  const [filterPlant, setFilterPlant] = useState<string>('All');
  const [filterType, setFilterType] = useState<string>('All');
  const [filterStatus, setFilterStatus] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Reset or update dates when modal opens or active month changes
  useEffect(() => {
    if (isOpen) {
      if (initialDateFrom && initialDateTo) {
        setDateFrom(initialDateFrom);
        setDateTo(initialDateTo);
        if (initialDateFrom === initialDateTo) {
          setActivePreset('today');
        } else {
          setActivePreset('custom');
        }
      } else {
        const mStart = formatYmd(getMonthStart(currentActiveMonth));
        const mEnd = formatYmd(getMonthEnd(currentActiveMonth));
        setDateFrom(mStart);
        setDateTo(mEnd);
        setActivePreset('month');
      }
    }
  }, [isOpen, initialDateFrom, initialDateTo, currentActiveMonth]);

  // Handle Preset Clicks
  const handleSelectPreset = (preset: 'month' | 'today' | '7days' | 'custom') => {
    setActivePreset(preset);
    const now = new Date();
    
    if (preset === 'month') {
      setDateFrom(formatYmd(getMonthStart(currentActiveMonth)));
      setDateTo(formatYmd(getMonthEnd(currentActiveMonth)));
    } else if (preset === 'today') {
      const todayStr = formatYmd(now);
      setDateFrom(todayStr);
      setDateTo(todayStr);
    } else if (preset === '7days') {
      const start = getMonthStart(currentActiveMonth);
      const end7 = new Date(start);
      end7.setDate(end7.getDate() + 6);
      setDateFrom(formatYmd(start));
      setDateTo(formatYmd(end7));
    }
  };

  // Filter Crane Jobs based on selected Date Range and Filter Controls
  const matchingJobs = useMemo(() => {
    return allJobs.filter(job => {
      // Date Range Match
      if (job.date) {
        if (dateFrom && job.date < dateFrom) return false;
        if (dateTo && job.date > dateTo) return false;
      }

      // Filter Plant / Area
      if (filterPlant !== 'All') {
        const p = (job.plant || '').toLowerCase();
        const a = (job.area || '').toLowerCase();
        const match = p.includes(filterPlant.toLowerCase()) || a.includes(filterPlant.toLowerCase());
        if (!match) return false;
      }

      // Filter Machinery / Crane Type
      if (filterType !== 'All') {
        if (!job.type.toLowerCase().includes(filterType.toLowerCase())) return false;
      }

      // Filter Status
      if (filterStatus !== 'All') {
        if (job.status !== filterStatus) return false;
      }

      // Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const str = `${job.id} ${job.type} ${job.area} ${job.contractor} ${job.description} ${job.equipmentId || ''}`.toLowerCase();
        if (!str.includes(q)) return false;
      }

      return true;
    }).sort((a, b) => (a.date > b.date ? 1 : -1));
  }, [allJobs, dateFrom, dateTo, filterPlant, filterType, filterStatus, searchQuery]);

  // Statistics
  const totalCount = matchingJobs.length;
  const inProgressCount = matchingJobs.filter(j => j.status === 'In Progress').length;
  const completedCount = matchingJobs.filter(j => j.status === 'Completed').length;
  const scheduledCount = matchingJobs.filter(j => j.status !== 'In Progress' && j.status !== 'Completed').length;
  const heavyLiftCount = matchingJobs.filter(j => {
    const capMatch = j.type.match(/(\d+)T/i);
    const capNum = capMatch ? parseInt(capMatch[1], 10) : 0;
    return capNum >= 100 || j.type.toLowerCase().includes('crawler');
  }).length;

  if (!isOpen) return null;

  // Handle CSV Export directly
  const handleExportCsv = () => {
    const headers = ['No', 'Job ID', 'Date', 'Time Slot', 'Crane Type', 'Equipment / Asset', 'Location / Area', 'Plant', 'Description', 'Contractor', 'Status', 'Progress'];
    const rows = matchingJobs.map((j, idx) => [
      idx + 1,
      `"${j.id}"`,
      `"${j.date}"`,
      `"${j.time}"`,
      `"${j.type}"`,
      `"${j.equipmentId || '-'}"`,
      `"${j.area}"`,
      `"${j.plant || 'Phra Khanong'}"`,
      `"${j.description.replace(/"/g, '""')}"`,
      `"${j.contractor}"`,
      `"${j.status}"`,
      `"${j.progress}%"`
    ]);

    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Crane_Schedule_Range_${dateFrom}_to_${dateTo}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleGeneratePdf = () => {
    onConfirmExportPdf({
      dateFrom,
      dateTo,
      filteredJobs: matchingJobs,
      filterPlant,
      filterType,
      filterStatus
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-950/75 backdrop-blur-md overflow-y-auto animate-in fade-in duration-200">
      <div 
        className="w-full max-w-3xl bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/90 dark:border-slate-800 shadow-2xl overflow-hidden flex flex-col max-h-[92vh] animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-5 sm:p-6 border-b border-slate-100 dark:border-slate-800 bg-gradient-to-r from-slate-50 via-blue-50/40 to-slate-50 dark:from-slate-800/80 dark:via-blue-950/20 dark:to-slate-800/80 flex items-center justify-between">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-red-600 via-rose-600 to-amber-500 text-white flex items-center justify-center shadow-lg shadow-rose-500/25">
              <CalendarRange size={24} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-rose-100 dark:bg-rose-950/80 text-rose-700 dark:text-rose-300 font-mono">
                  Export Schedule
                </span>
                <span className="text-xs text-slate-400 font-mono">
                  Range Selector
                </span>
              </div>
              <h2 className="text-base sm:text-lg font-extrabold text-slate-900 dark:text-white">
                {isTh ? 'เลือกช่วงวันที่สำหรับส่งออกตารางการใช้เครน (PDF / CSV)' : 'Select Date Range for Crane Schedule Export'}
              </h2>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-100 flex items-center justify-center transition-all cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 sm:p-6 space-y-6 overflow-y-auto flex-1 custom-scrollbar">
          
          {/* 1. Quick Presets */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">
              {isTh ? '1. ทางเลือกช่วงเวลาด่วน (Quick Presets)' : '1. Quick Date Range Presets'}
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <button
                type="button"
                onClick={() => handleSelectPreset('month')}
                className={`py-2 px-3 rounded-xl text-xs font-bold border transition-all cursor-pointer flex items-center justify-center gap-2 ${
                  activePreset === 'month'
                    ? 'bg-blue-600 text-white border-blue-600 shadow-md shadow-blue-600/20'
                    : 'bg-slate-50 dark:bg-slate-800/80 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                }`}
              >
                <Calendar size={14} />
                <span>{isTh ? 'ทั้งเดือนนี้' : 'Full Month'}</span>
              </button>

              <button
                type="button"
                onClick={() => handleSelectPreset('7days')}
                className={`py-2 px-3 rounded-xl text-xs font-bold border transition-all cursor-pointer flex items-center justify-center gap-2 ${
                  activePreset === '7days'
                    ? 'bg-blue-600 text-white border-blue-600 shadow-md shadow-blue-600/20'
                    : 'bg-slate-50 dark:bg-slate-800/80 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                }`}
              >
                <Clock size={14} />
                <span>{isTh ? 'ช่วง 7 วัน' : '7 Days'}</span>
              </button>

              <button
                type="button"
                onClick={() => handleSelectPreset('today')}
                className={`py-2 px-3 rounded-xl text-xs font-bold border transition-all cursor-pointer flex items-center justify-center gap-2 ${
                  activePreset === 'today'
                    ? 'bg-blue-600 text-white border-blue-600 shadow-md shadow-blue-600/20'
                    : 'bg-slate-50 dark:bg-slate-800/80 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                }`}
              >
                <CalendarRange size={14} />
                <span>{isTh ? 'เฉพาะวันนี้' : 'Today'}</span>
              </button>

              <button
                type="button"
                onClick={() => setActivePreset('custom')}
                className={`py-2 px-3 rounded-xl text-xs font-bold border transition-all cursor-pointer flex items-center justify-center gap-2 ${
                  activePreset === 'custom'
                    ? 'bg-blue-600 text-white border-blue-600 shadow-md shadow-blue-600/20'
                    : 'bg-slate-50 dark:bg-slate-800/80 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                }`}
              >
                <Sparkles size={14} />
                <span>{isTh ? 'กำหนดเอง' : 'Custom'}</span>
              </button>
            </div>
          </div>

          {/* 2. Interactive Date Range Picker */}
          <div className="bg-slate-50/90 dark:bg-slate-800/60 p-4 sm:p-5 rounded-2xl border border-slate-200/80 dark:border-slate-700/80">
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-3">
              {isTh ? '2. ระบุช่วงวันที่เริ่มต้น - สิ้นสุด (Start Date & End Date)' : '2. Start & End Date Selection'}
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <span className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1.5 flex items-center gap-1.5">
                  <Calendar size={13} className="text-blue-500" />
                  {isTh ? 'จากวันที่ (From Date)' : 'From Date'}
                </span>
                <input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => {
                    setDateFrom(e.target.value);
                    setActivePreset('custom');
                  }}
                  className="w-full px-3.5 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs sm:text-sm font-mono font-medium text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-xs"
                />
              </div>

              <div>
                <span className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1.5 flex items-center gap-1.5">
                  <Calendar size={13} className="text-rose-500" />
                  {isTh ? 'ถึงวันที่ (To Date)' : 'To Date'}
                </span>
                <input
                  type="date"
                  value={dateTo}
                  min={dateFrom}
                  onChange={(e) => {
                    setDateTo(e.target.value);
                    setActivePreset('custom');
                  }}
                  className="w-full px-3.5 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs sm:text-sm font-mono font-medium text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-rose-500 shadow-xs"
                />
              </div>
            </div>

            {dateFrom && dateTo && dateFrom > dateTo && (
              <div className="mt-3 p-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-300 text-xs flex items-center gap-2">
                <AlertTriangle size={15} className="shrink-0" />
                <span>{isTh ? 'คำเตือน: วันที่เริ่มต้นต้องไม่มากกว่าวันที่สิ้นสุด' : 'Warning: Start date cannot be after end date'}</span>
              </div>
            )}
          </div>

          {/* 3. Additional Filter Options */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2 flex items-center gap-1.5">
              <Filter size={13} />
              {isTh ? '3. กรองข้อมูลเฉพาะทาง (Optional Filters)' : '3. Optional Filters'}
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-[10px] text-slate-400 uppercase font-semibold mb-1">
                  {isTh ? 'ประเภทเครน' : 'Crane Type'}
                </label>
                <select
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-700 dark:text-slate-200 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                >
                  <option value="All">{isTh ? 'ทุกประเภทเครน' : 'All Crane Types'}</option>
                  <option value="Mobile">{isTh ? 'Mobile Crane' : 'Mobile Crane'}</option>
                  <option value="Crawler">{isTh ? 'Crawler Crane' : 'Crawler Crane'}</option>
                  <option value="Truck">{isTh ? 'Truck Crane' : 'Truck Crane'}</option>
                  <option value="Rough">{isTh ? 'Rough Terrain Crane' : 'Rough Terrain Crane'}</option>
                  <option value="Tower">{isTh ? 'Tower Crane' : 'Tower Crane'}</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] text-slate-400 uppercase font-semibold mb-1">
                  {isTh ? 'สถานะงาน' : 'Status'}
                </label>
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-700 dark:text-slate-200 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                >
                  <option value="All">{isTh ? 'ทุกสถานะ' : 'All Status'}</option>
                  <option value="In Progress">{isTh ? 'กำลังยก (In Progress)' : 'In Progress'}</option>
                  <option value="Completed">{isTh ? 'เสร็จสิ้น (Completed)' : 'Completed'}</option>
                  <option value="Scheduled">{isTh ? 'รอดำเนินการ (Scheduled)' : 'Scheduled'}</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] text-slate-400 uppercase font-semibold mb-1">
                  {isTh ? 'พื้นที่ / Plant' : 'Plant / Location'}
                </label>
                <select
                  value={filterPlant}
                  onChange={(e) => setFilterPlant(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-700 dark:text-slate-200 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                >
                  <option value="All">{isTh ? 'ทุกพื้นที่ (All Plants)' : 'All Locations'}</option>
                  <option value="Phra Khanong">Refinery Phra Khanong</option>
                  <option value="Sriracha">Refinery Sriracha</option>
                  <option value="CDU">CDU Unit Area</option>
                  <option value="Jetty">Jetty Marine Pier</option>
                  <option value="Tank">Tank Farm</option>
                </select>
              </div>
            </div>
          </div>

          {/* 4. Live Job Matching Summary */}
          <div className="bg-gradient-to-br from-blue-500/5 via-indigo-500/5 to-purple-500/5 dark:from-blue-950/20 dark:via-indigo-950/20 dark:to-purple-950/20 rounded-2xl p-4 sm:p-5 border border-blue-100 dark:border-blue-900/40 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-blue-100/60 dark:border-blue-900/30 pb-3">
              <div className="flex items-center gap-2">
                <span className="flex h-2.5 w-2.5 rounded-full bg-emerald-500 ring-4 ring-emerald-500/20" />
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                  {isTh ? 'ผลการค้นหารายการงานที่ตรงกับเงื่อนไข:' : 'Matching Crane Operations Found:'}
                </span>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold font-mono bg-blue-600 text-white shadow-xs">
                  {totalCount} {isTh ? 'งาน' : 'jobs'}
                </span>
              </div>

              {/* Status Breakdown Pills */}
              <div className="flex items-center gap-1.5 flex-wrap text-[11px] font-medium">
                <span className="px-2 py-0.5 rounded-md bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 font-mono font-bold">
                  {inProgressCount} In Progress
                </span>
                <span className="px-2 py-0.5 rounded-md bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 font-mono font-bold">
                  {completedCount} Completed
                </span>
                <span className="px-2 py-0.5 rounded-md bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 font-mono font-bold">
                  {scheduledCount} Scheduled
                </span>
                {heavyLiftCount > 0 && (
                  <span className="px-2 py-0.5 rounded-md bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 font-mono font-bold">
                    {heavyLiftCount} Heavy Lifts
                  </span>
                )}
              </div>
            </div>

            {/* Mini preview list */}
            {matchingJobs.length === 0 ? (
              <div className="py-6 text-center text-xs text-slate-400 italic">
                {isTh ? 'ไม่พบรายการงานเครนในช่วงวันที่หรือเงื่อนไขที่กำหนด' : 'No crane jobs found for the selected range'}
              </div>
            ) : (
              <div className="max-h-40 overflow-y-auto space-y-1.5 custom-scrollbar pr-1">
                {matchingJobs.slice(0, 10).map((job) => (
                  <div 
                    key={job.id}
                    className="p-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/70 dark:border-slate-800 flex items-center justify-between text-xs hover:border-blue-400 transition-colors"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="font-mono font-bold text-blue-600 dark:text-blue-400 shrink-0">
                        {job.id}
                      </span>
                      <span className="font-mono text-[11px] text-slate-500 shrink-0">
                        {job.date}
                      </span>
                      <span className="font-semibold text-slate-700 dark:text-slate-300 truncate">
                        {job.type}
                      </span>
                      <span className="text-[11px] text-slate-400 truncate hidden sm:inline">
                        • {job.area}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        job.status === 'Completed' ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-300' :
                        job.status === 'In Progress' ? 'bg-blue-50 text-blue-600 dark:bg-blue-950 dark:text-blue-300' :
                        'bg-amber-50 text-amber-600 dark:bg-amber-950 dark:text-amber-300'
                      }`}>
                        {job.status}
                      </span>
                    </div>
                  </div>
                ))}
                {matchingJobs.length > 10 && (
                  <div className="text-center text-[11px] font-semibold text-slate-400 pt-1">
                    {isTh ? `...และอีก ${matchingJobs.length - 10} รายการที่จะรวมในรายงาน PDF` : `...and ${matchingJobs.length - 10} more jobs included in export`}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 sm:p-5 border-t border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/50 flex flex-col sm:flex-row items-center justify-between gap-3">
          <button
            type="button"
            onClick={onClose}
            className="w-full sm:w-auto px-5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold transition-all cursor-pointer"
          >
            {isTh ? 'ยกเลิก (Cancel)' : 'Cancel'}
          </button>

          <div className="w-full sm:w-auto flex items-center gap-2.5">
            <button
              type="button"
              onClick={handleExportCsv}
              disabled={matchingJobs.length === 0}
              className="flex-1 sm:flex-none px-4 py-2.5 rounded-xl bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed shadow-xs"
            >
              <Download size={14} />
              <span>{isTh ? 'ส่งออก CSV' : 'Export CSV'}</span>
            </button>

            <button
              type="button"
              onClick={handleGeneratePdf}
              disabled={matchingJobs.length === 0 || (!!dateFrom && !!dateTo && dateFrom > dateTo)}
              className="flex-1 sm:flex-none px-6 py-2.5 rounded-xl bg-gradient-to-r from-red-600 via-rose-600 to-red-700 hover:from-red-700 hover:to-rose-800 active:scale-95 text-white text-xs font-bold shadow-lg shadow-rose-600/30 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Printer size={16} />
              <span>
                {isTh ? `สร้างรายงาน PDF (${totalCount} งาน)` : `Generate PDF (${totalCount} Jobs)`}
              </span>
              <ArrowRight size={14} />
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
