import React, { useState, useMemo } from 'react';
import { 
  Table, Search, Filter, Printer, FileText, MapPin, 
  Calendar, Clock, CheckCircle2, AlertTriangle, ArrowUpDown,
  ChevronLeft, ChevronRight, Download, Sparkles, Building2,
  HardHat, Truck, ArrowRight, Eye, ShieldCheck, X
} from 'lucide-react';
import { JobDetail } from './CalendarView';

interface CalendarScheduleTableProps {
  jobs: JobDetail[];
  monthLabel: string;
  selectedMonthDate: Date;
  onSelectJob: (job: JobDetail) => void;
  onLocateOnMap: (job: JobDetail) => void;
  onOpenExportRangeModal: (defaultDateFrom?: string, defaultDateTo?: string) => void;
  isTh?: boolean;
}

export default function CalendarScheduleTable({
  jobs,
  monthLabel,
  selectedMonthDate,
  onSelectJob,
  onLocateOnMap,
  onOpenExportRangeModal,
  isTh = true
}: CalendarScheduleTableProps) {
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [typeFilter, setTypeFilter] = useState<string>('All');
  const [sortField, setSortField] = useState<'date' | 'id' | 'type' | 'status'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const itemsPerPage = 12;

  // Filtered and Sorted Jobs
  const filteredJobs = useMemo(() => {
    return jobs.filter(j => {
      // Status Filter
      if (statusFilter !== 'All') {
        if (statusFilter === 'In Progress' && j.status !== 'In Progress') return false;
        if (statusFilter === 'Completed' && j.status !== 'Completed') return false;
        if (statusFilter === 'Scheduled' && (j.status === 'In Progress' || j.status === 'Completed')) return false;
      }

      // Type Filter
      if (typeFilter !== 'All') {
        if (!j.type.toLowerCase().includes(typeFilter.toLowerCase())) return false;
      }

      // Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const fullStr = `${j.id} ${j.type} ${j.area} ${j.contractor} ${j.description} ${j.equipmentId || ''} ${j.date}`.toLowerCase();
        if (!fullStr.includes(q)) return false;
      }

      return true;
    }).sort((a, b) => {
      let cmp = 0;
      if (sortField === 'date') cmp = (a.date || '').localeCompare(b.date || '');
      else if (sortField === 'id') cmp = (a.id || '').localeCompare(b.id || '');
      else if (sortField === 'type') cmp = (a.type || '').localeCompare(b.type || '');
      else if (sortField === 'status') cmp = (a.status || '').localeCompare(b.status || '');
      return sortOrder === 'asc' ? cmp : -cmp;
    });
  }, [jobs, statusFilter, typeFilter, searchQuery, sortField, sortOrder]);

  // Statistics
  const totalCount = jobs.length;
  const inProgressCount = jobs.filter(j => j.status === 'In Progress').length;
  const completedCount = jobs.filter(j => j.status === 'Completed').length;
  const scheduledCount = jobs.filter(j => j.status !== 'In Progress' && j.status !== 'Completed').length;
  const heavyLiftCount = jobs.filter(j => {
    const capMatch = j.type.match(/(\d+)T/i);
    const capNum = capMatch ? parseInt(capMatch[1], 10) : 0;
    return capNum >= 100 || j.type.toLowerCase().includes('crawler');
  }).length;

  // Pagination
  const totalPages = Math.ceil(filteredJobs.length / itemsPerPage) || 1;
  const paginatedJobs = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredJobs.slice(start, start + itemsPerPage);
  }, [filteredJobs, currentPage]);

  const handleSort = (field: 'date' | 'id' | 'type' | 'status') => {
    if (sortField === field) {
      setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  return (
    <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-xl border border-slate-200/90 dark:border-slate-800/90 overflow-hidden flex flex-col transition-all duration-300">
      
      {/* 1. Header Banner & Executive KPI Metrics */}
      <div className="p-5 sm:p-6 border-b border-slate-100 dark:border-slate-800 bg-gradient-to-r from-slate-50 via-blue-50/30 to-indigo-50/20 dark:from-slate-900 dark:via-blue-950/20 dark:to-slate-900 flex flex-col lg:flex-row lg:items-center justify-between gap-5">
        
        {/* Title & Month Badge */}
        <div className="flex items-start sm:items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center shadow-lg shadow-blue-500/25 shrink-0">
            <Table size={24} />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[10px] font-extrabold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-blue-100 dark:bg-blue-950/80 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 font-mono">
                Monthly Schedule
              </span>
              <span className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1 font-mono">
                <Calendar size={13} className="text-blue-500" />
                {monthLabel}
              </span>
            </div>
            <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white tracking-tight">
              {isTh ? 'ตารางกำหนดการและคิวปฏิบัติงานเครนประจำเดือน' : 'Monthly Crane Schedule & Rigging Operations Table'}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {isTh ? 'รายการจัดสรรเครื่องจักร พิกัดการยก และสถานะงานตามแผนประจำเดือน' : 'Machinery dispatch, rigging coordinates, and operational execution status'}
            </p>
          </div>
        </div>

        {/* Live KPI Metric Chips */}
        <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
          <div className="flex-1 sm:flex-none px-3.5 py-2 rounded-2xl bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80 shadow-xs flex items-center gap-2.5">
            <div className="w-2.5 h-2.5 rounded-full bg-slate-400" />
            <div>
              <div className="text-[10px] uppercase font-bold text-slate-400">{isTh ? 'ทั้งหมด' : 'Total'}</div>
              <div className="text-sm font-black font-mono text-slate-800 dark:text-slate-100">{totalCount}</div>
            </div>
          </div>

          <div className="flex-1 sm:flex-none px-3.5 py-2 rounded-2xl bg-sky-50/80 dark:bg-sky-950/40 border border-sky-200 dark:border-sky-800/60 shadow-xs flex items-center gap-2.5">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-sky-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-sky-500"></span>
            </span>
            <div>
              <div className="text-[10px] uppercase font-bold text-sky-600 dark:text-sky-400">{isTh ? 'กำลังยก' : 'Active'}</div>
              <div className="text-sm font-black font-mono text-sky-700 dark:text-sky-300">{inProgressCount}</div>
            </div>
          </div>

          <div className="flex-1 sm:flex-none px-3.5 py-2 rounded-2xl bg-emerald-50/80 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 shadow-xs flex items-center gap-2.5">
            <CheckCircle2 size={13} className="text-emerald-500" />
            <div>
              <div className="text-[10px] uppercase font-bold text-emerald-600 dark:text-emerald-400">{isTh ? 'เสร็จสิ้น' : 'Done'}</div>
              <div className="text-sm font-black font-mono text-emerald-700 dark:text-emerald-300">{completedCount}</div>
            </div>
          </div>

          {heavyLiftCount > 0 && (
            <div className="flex-1 sm:flex-none px-3.5 py-2 rounded-2xl bg-amber-50/80 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 shadow-xs flex items-center gap-2.5">
              <Sparkles size={13} className="text-amber-500" />
              <div>
                <div className="text-[10px] uppercase font-bold text-amber-600 dark:text-amber-400">{isTh ? 'ยกหนัก' : 'Heavy Lift'}</div>
                <div className="text-sm font-black font-mono text-amber-700 dark:text-amber-300">{heavyLiftCount}</div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 2. Interactive Search & Filters Toolbar */}
      <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        
        {/* Search Bar */}
        <div className="relative flex-1 max-w-md">
          <Search size={15} className="absolute left-3.5 top-3 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setCurrentPage(1);
            }}
            placeholder={isTh ? 'ค้นหา Job ID, ขนาดเครน, สถานที่, ผู้รับเหมา...' : 'Search by Job ID, Crane model, Location, Contractor...'}
            className="w-full pl-10 pr-9 py-2 text-xs sm:text-sm bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-slate-800 dark:text-slate-100 font-medium transition-all"
          />
          {searchQuery && (
            <button 
              type="button" 
              onClick={() => {
                setSearchQuery('');
                setCurrentPage(1);
              }}
              className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
            >
              <X size={15} />
            </button>
          )}
        </div>

        {/* Filters & Export Actions */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Status Quick Filter Chips */}
          <div className="bg-slate-100 dark:bg-slate-800 p-1 rounded-2xl flex space-x-1 border border-slate-200 dark:border-slate-700">
            {(['All', 'In Progress', 'Scheduled', 'Completed'] as const).map(s => (
              <button
                key={s}
                type="button"
                onClick={() => {
                  setStatusFilter(s);
                  setCurrentPage(1);
                }}
                className={`px-3 py-1 text-xs font-bold rounded-xl transition-all cursor-pointer ${
                  statusFilter === s
                    ? 'bg-white dark:bg-slate-900 shadow-xs text-blue-600 dark:text-blue-400'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white'
                }`}
              >
                {s === 'All' ? (isTh ? 'ทั้งหมด' : 'All') :
                 s === 'In Progress' ? (isTh ? 'กำลังยก' : 'Active') :
                 s === 'Scheduled' ? (isTh ? 'ตามแผน' : 'Plan') :
                 (isTh ? 'เสร็จสิ้น' : 'Done')}
              </button>
            ))}
          </div>

          {/* Crane Type Dropdown */}
          <select
            value={typeFilter}
            onChange={(e) => {
              setTypeFilter(e.target.value);
              setCurrentPage(1);
            }}
            className="px-3 py-2 text-xs font-semibold bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 cursor-pointer"
          >
            <option value="All">{isTh ? 'ทุกเครน' : 'All Cranes'}</option>
            <option value="Mobile">Mobile Crane</option>
            <option value="Crawler">Crawler Crane</option>
            <option value="Truck">Truck Crane</option>
            <option value="Rough">Rough Terrain</option>
          </select>

          {/* User Range Export Button (Opens Date Range Modal) */}
          <button
            type="button"
            onClick={() => onOpenExportRangeModal()}
            className="px-4 py-2 bg-gradient-to-r from-red-600 via-rose-600 to-red-700 hover:from-red-700 hover:to-rose-800 text-white rounded-2xl shadow-md shadow-rose-600/25 text-xs font-bold transition-all active:scale-95 flex items-center gap-1.5 cursor-pointer ml-auto sm:ml-0"
            title={isTh ? 'เลือกช่วงวันที่เพื่อส่งออกรายงานตารางการใช้เครน (PDF / CSV)' : 'Select custom date range to export crane schedule'}
          >
            <Printer size={14} />
            <span>{isTh ? 'เลือกช่วงวันที่ส่งออก' : 'Export Range'}</span>
          </button>
        </div>
      </div>

      {/* 3. Ultra-Clean Data Table */}
      <div className="overflow-x-auto min-h-[460px]">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="bg-slate-50/90 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-800 text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider select-none">
              <th className="py-3.5 px-4 w-12 text-center">#</th>
              
              <th 
                className="py-3.5 px-4 cursor-pointer hover:text-blue-600 transition-colors"
                onClick={() => handleSort('id')}
              >
                <div className="flex items-center gap-1.5">
                  <span>Job ID</span>
                  <ArrowUpDown size={12} className={sortField === 'id' ? 'text-blue-600' : 'opacity-40'} />
                </div>
              </th>

              <th 
                className="py-3.5 px-4 cursor-pointer hover:text-blue-600 transition-colors"
                onClick={() => handleSort('date')}
              >
                <div className="flex items-center gap-1.5">
                  <span>{isTh ? 'วัน-เวลากำหนดการ' : 'Planned Schedule'}</span>
                  <ArrowUpDown size={12} className={sortField === 'date' ? 'text-blue-600' : 'opacity-40'} />
                </div>
              </th>

              <th className="py-3.5 px-4">{isTh ? 'พื้นที่หน้างาน / จุดตั้งเครน' : 'Location / Lifting Point'}</th>

              <th 
                className="py-3.5 px-4 cursor-pointer hover:text-blue-600 transition-colors"
                onClick={() => handleSort('type')}
              >
                <div className="flex items-center gap-1.5">
                  <span>{isTh ? 'เครื่องจักร & พิกัดยก' : 'Machinery & Capacity'}</span>
                  <ArrowUpDown size={12} className={sortField === 'type' ? 'text-blue-600' : 'opacity-40'} />
                </div>
              </th>

              <th className="py-3.5 px-4">{isTh ? 'ผู้รับเหมา & ทีมงาน' : 'Contractor & Riggers'}</th>

              <th 
                className="py-3.5 px-4 text-center cursor-pointer hover:text-blue-600 transition-colors"
                onClick={() => handleSort('status')}
              >
                <div className="flex items-center justify-center gap-1.5">
                  <span>{isTh ? 'สถานะงาน' : 'Status'}</span>
                  <ArrowUpDown size={12} className={sortField === 'status' ? 'text-blue-600' : 'opacity-40'} />
                </div>
              </th>

              <th className="py-3.5 px-4 text-right">{isTh ? 'การจัดการ' : 'Actions'}</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
            {paginatedJobs.length === 0 ? (
              <tr>
                <td colSpan={8} className="py-16 text-center text-slate-400">
                  <div className="w-16 h-16 mx-auto mb-3 rounded-3xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400">
                    <Table size={28} />
                  </div>
                  <div className="font-bold text-sm text-slate-600 dark:text-slate-300">
                    {isTh ? 'ไม่พบรายการงานเครนที่ตรงกับเงื่อนไข' : 'No crane operations match your criteria'}
                  </div>
                  <p className="text-xs text-slate-400 mt-1">
                    {isTh ? 'ลองปรับเปลี่ยนคำค้นหา หรือเลือกตัวกรองสถานะเป็นทั้งหมด' : 'Try adjusting search keywords or clearing active filters'}
                  </p>
                  {(searchQuery || statusFilter !== 'All' || typeFilter !== 'All') && (
                    <button
                      type="button"
                      onClick={() => {
                        setSearchQuery('');
                        setStatusFilter('All');
                        setTypeFilter('All');
                      }}
                      className="mt-3 px-4 py-1.5 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 text-xs font-bold hover:bg-blue-100 transition-all cursor-pointer"
                    >
                      {isTh ? 'รีเซ็ตตัวกรองทั้งหมด' : 'Reset all filters'}
                    </button>
                  )}
                </td>
              </tr>
            ) : (
              paginatedJobs.map((j, idx) => {
                const globalIdx = (currentPage - 1) * itemsPerPage + idx + 1;
                const isHeavy = j.type.includes('200T') || j.type.includes('300T') || j.type.toLowerCase().includes('crawler');
                
                // Date breakdown
                const dateParts = (j.date || '').split('-');
                const dayNum = dateParts[2] || '--';
                const monthNum = parseInt(dateParts[1] || '0', 10);
                const monthShort = ['', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][monthNum] || '';

                return (
                  <tr 
                    key={j.id}
                    onClick={() => onSelectJob(j)}
                    className="hover:bg-blue-50/50 dark:hover:bg-slate-800/60 cursor-pointer transition-all duration-150 group"
                  >
                    {/* Index */}
                    <td className="py-3.5 px-4 text-center font-mono text-slate-400">
                      {globalIdx}
                    </td>

                    {/* Job ID */}
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-black text-blue-600 dark:text-blue-400 group-hover:underline text-xs sm:text-sm">
                          {j.id}
                        </span>
                        {isHeavy && (
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-extrabold bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-800">
                            HEAVY
                          </span>
                        )}
                      </div>
                      <div className="text-[10px] text-slate-400 truncate max-w-[140px]">
                        {j.description}
                      </div>
                    </td>

                    {/* Date & Time Slot */}
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-2.5">
                        <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex flex-col items-center justify-center shrink-0">
                          <span className="text-[9px] font-bold text-blue-600 dark:text-blue-400 uppercase font-mono">
                            {monthShort}
                          </span>
                          <span className="text-xs font-black text-slate-800 dark:text-slate-100 font-mono -mt-0.5">
                            {dayNum}
                          </span>
                        </div>
                        <div>
                          <div className="font-mono font-medium text-slate-700 dark:text-slate-300 text-xs">
                            {j.date}
                          </div>
                          <div className="text-[10px] text-slate-400 flex items-center gap-1 font-mono">
                            <Clock size={11} className="text-slate-400" />
                            {j.time || '08:00 - 17:00'}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Location */}
                    <td className="py-3.5 px-4">
                      <div className="flex items-start gap-1.5">
                        <MapPin size={14} className="text-rose-500 mt-0.5 shrink-0" />
                        <div>
                          <div className="font-bold text-slate-800 dark:text-slate-100">
                            {j.area}
                          </div>
                          <div className="text-[10px] text-slate-400">
                            {j.plant || 'Phra Khanong Refinery'}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Machinery / Crane & Capacity */}
                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-slate-800 dark:text-slate-200">
                        {j.type}
                      </div>
                      {j.equipmentId ? (
                        <div className="text-[10px] text-slate-400 font-mono flex items-center gap-1">
                          <span className="px-1 py-0.2 rounded bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                            Tag: {j.equipmentId}
                          </span>
                        </div>
                      ) : (
                        <div className="text-[10px] text-slate-400 font-mono">
                          Std Lifting Config
                        </div>
                      )}
                    </td>

                    {/* Contractor */}
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold text-[10px] flex items-center justify-center shrink-0">
                          {j.contractor.slice(0, 2).toUpperCase()}
                        </div>
                        <span className="font-medium text-slate-700 dark:text-slate-300 truncate max-w-[130px]">
                          {j.contractor}
                        </span>
                      </div>
                    </td>

                    {/* Status Badge */}
                    <td className="py-3.5 px-4 text-center">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-extrabold border ${
                        j.status === 'Completed'
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800'
                          : j.status === 'In Progress'
                          ? 'bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-950/60 dark:text-sky-300 dark:border-sky-800'
                          : 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800'
                      }`}>
                        {j.status === 'Completed' ? (
                          <CheckCircle2 size={11} className="text-emerald-600" />
                        ) : j.status === 'In Progress' ? (
                          <span className="w-1.5 h-1.5 rounded-full bg-sky-500 animate-pulse" />
                        ) : (
                          <Clock size={11} className="text-amber-600" />
                        )}
                        <span>{j.status}</span>
                      </span>
                    </td>

                    {/* Actions */}
                    <td className="py-3.5 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => onSelectJob(j)}
                          className="p-1.5 rounded-xl bg-slate-100 hover:bg-blue-50 dark:bg-slate-800 dark:hover:bg-blue-950/40 text-slate-600 hover:text-blue-600 dark:text-slate-300 dark:hover:text-blue-300 transition-all cursor-pointer shadow-2xs hover:scale-105 active:scale-95"
                          title={isTh ? 'ดูรายละเอียดใบงาน' : 'View Job Details'}
                        >
                          <FileText size={14} />
                        </button>

                        <button
                          type="button"
                          onClick={() => onLocateOnMap(j)}
                          className="p-1.5 rounded-xl bg-slate-100 hover:bg-emerald-50 dark:bg-slate-800 dark:hover:bg-emerald-950/40 text-slate-600 hover:text-emerald-600 dark:text-slate-300 dark:hover:text-emerald-300 transition-all cursor-pointer shadow-2xs hover:scale-105 active:scale-95"
                          title={isTh ? 'ดูตำแหน่งบน Master CAD Plot Plan' : 'Locate on Master Plot Plan'}
                        >
                          <MapPin size={14} />
                        </button>

                        <button
                          type="button"
                          onClick={() => onOpenExportRangeModal(j.date, j.date)}
                          className="p-1.5 rounded-xl bg-slate-100 hover:bg-rose-50 dark:bg-slate-800 dark:hover:bg-rose-950/40 text-slate-600 hover:text-rose-600 dark:text-slate-300 dark:hover:text-rose-300 transition-all cursor-pointer shadow-2xs hover:scale-105 active:scale-95"
                          title={isTh ? 'ส่งออก / พิมพ์เอกสารสำหรับวันนี้' : 'Export & Print Daily PDF'}
                        >
                          <Printer size={14} />
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

      {/* 4. Table Pagination & Info Footer */}
      <div className="p-4 sm:p-5 border-t border-slate-100 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-850/50 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
        <div className="text-slate-500 dark:text-slate-400 font-medium">
          {isTh ? (
            <>แสดง <b>{Math.min(filteredJobs.length, (currentPage - 1) * itemsPerPage + 1)}</b> ถึง <b>{Math.min(filteredJobs.length, currentPage * itemsPerPage)}</b> จากทั้งหมด <b>{filteredJobs.length}</b> รายการ (เดือน {monthLabel})</>
          ) : (
            <>Showing <b>{Math.min(filteredJobs.length, (currentPage - 1) * itemsPerPage + 1)}</b> to <b>{Math.min(filteredJobs.length, currentPage * itemsPerPage)}</b> of <b>{filteredJobs.length}</b> operations ({monthLabel})</>
          )}
        </div>

        {totalPages > 1 && (
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              disabled={currentPage === 1}
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              className="p-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
            >
              <ChevronLeft size={16} />
            </button>

            {Array.from({ length: totalPages }).map((_, idx) => {
              const p = idx + 1;
              return (
                <button
                  key={p}
                  type="button"
                  onClick={() => setCurrentPage(p)}
                  className={`w-7 h-7 rounded-xl font-mono text-xs font-bold transition-all ${
                    currentPage === p
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100'
                  }`}
                >
                  {p}
                </button>
              );
            })}

            <button
              type="button"
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
              className="p-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        )}
      </div>

    </div>
  );
}
