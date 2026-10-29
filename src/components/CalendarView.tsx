import { useState, useMemo, useEffect } from 'react';
import { 
  Calendar as CalendarIcon, ChevronLeft, ChevronRight, Filter, MapPin, Truck, 
  X, FileText, User, Clock, Maximize2, CalendarDays, CheckCircle2, AlertCircle, Paperclip,
  Printer, Download, ShieldCheck, Search, Sparkles, LayoutList, List, Table, Building2
} from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import JobAttachmentSection from './common/JobAttachmentSection';
import CraneSchedulePdfModal from './CraneSchedulePdfModal';
import JobPlotPlanModal from './JobPlotPlanModal';
import ExportDateRangeModal from './ExportDateRangeModal';
import CalendarScheduleTable from './CalendarScheduleTable';
import { 
  JobAttachment, 
  getAllJobAttachmentsRegistry, 
  getJobAttachments, 
  addJobAttachment, 
  removeJobAttachment 
} from '../data/jobAttachmentData';
import { 
  getAllCraneJobs, 
  subscribeToCraneOperations, 
  extractDateString, 
  extractTimeString, 
  UnifiedCraneJob,
  navigateToCraneView,
  getActiveCraneNavContext,
  clearActiveCraneNavContext
} from '../data/craneOperationsData';

export type JobDetail = {
  id: string;
  date: string;
  time: string;
  area: string;
  description: string;
  contractor: string;
  type: string;
  status: string;
  progress: number;
  equipmentId?: string;
  plant?: string;
};

const mapUnifiedToJobDetail = (c: UnifiedCraneJob): JobDetail => ({
  id: c.jobNo,
  date: c.date || extractDateString(c.dateFrom),
  time: c.time || extractTimeString(c.dateFrom, c.duration),
  area: c.area || (c.plant === 'Sriracha' ? 'Sriracha Terminal Complex' : 'BCP Area 1'),
  description: c.description,
  contractor: c.contractor,
  type: c.type || `${c.craneType} (${c.capacity}T)`,
  status: c.status === 'Requested' ? 'Pending' : c.status === 'Approved' ? 'Pending' : c.status,
  progress: c.progress,
  equipmentId: c.equipmentId,
  plant: c.plant
});

const THAI_MONTHS = [
  'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
  'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'
];

const EN_MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

// Rich Multi-Month Seed Generator across 2026-2027
const generateMultiMonthSeeds = (): Record<string, JobDetail> => {
  const result: Record<string, JobDetail> = {};

  const templates = [
    { title: 'Tower section assembly and high-precision positioning', mc: 'Mobile Crane (LTM 1300)', area: 'BCP Area 1', contractor: 'Contractor A Solutions', plant: 'Phra Khanong', tag: '11-C-101' },
    { title: 'Loading of heavy structural steel components', mc: 'Tower Crane (50T)', area: 'Storage Yard', contractor: 'Operations Dept', plant: 'Phra Khanong', tag: 'STR-202' },
    { title: 'Secondary beam installation for main reactor frame', mc: 'Crawler Crane (250T)', area: 'Zone C Construction', contractor: 'Maintenance Team B', plant: 'Phra Khanong', tag: '21-R-101' },
    { title: 'Relocation of temporary roof positioning structures', mc: 'Mobile Crane (80T)', area: 'Workshop South', contractor: 'Contractor B Engineering', plant: 'Phra Khanong', tag: 'RF-104' },
    { title: 'Heat Exchanger Bundle Pull & Inspection Rigging', mc: 'Bundle Extractor & Mobile (100T)', area: 'Area 01: CDU-1', contractor: 'Rotary Engineering', plant: 'Phra Khanong', tag: '11-E-101' },
    { title: 'Furnace Convection Bank Heavy Tube Lift', mc: 'Mobile Crane (200T)', area: 'Area 02: Furnaces', contractor: 'Thai Shinryo Co., Ltd.', plant: 'Phra Khanong', tag: '11-F-101' },
    { title: 'Crude Distillation Column Top Head Removal', mc: 'Crawler Crane (350T)', area: 'Area 01: CDU-1', contractor: 'Contractor Heavy Lift', plant: 'Phra Khanong', tag: '11-C-102' },
    { title: 'Storage Tank Floating Roof Seal Rigging', mc: 'All Terrain Crane (120T)', area: 'Offsite Tank Farm', contractor: 'Toyo-Thai Corp', plant: 'Sriracha', tag: 'TK-102' },
    { title: 'Offsite Pipe Rack Heavy Spool Alignment', mc: 'Mobile Crane (50T)', area: 'Main Gate Corridor', contractor: 'CR3 Thailand', plant: 'Sriracha', tag: 'PR-881' },
    { title: 'Compressor Motor Overhaul and Gantry Rigging', mc: 'Overhead Gantry (35T)', area: 'Compressor Shed', contractor: 'BCP Maintenance Team', plant: 'Phra Khanong', tag: '22-K-101' }
  ];

  // Seed across months of 2026 and 2027
  const years = [2026, 2027];
  years.forEach(year => {
    for (let month = 1; month <= 12; month++) {
      const monthStr = String(month).padStart(2, '0');
      // Create 5 to 8 scheduled jobs per month on varied days
      const days = [3, 7, 12, 15, 18, 22, 26, 29];
      days.forEach((day, idx) => {
        const t = templates[(month + idx) % templates.length];
        const dayStr = String(day).padStart(2, '0');
        const id = `CRN-${String(year).slice(2)}${monthStr}${String(idx + 1).padStart(2, '0')}`;
        const status = (month < 9 && year === 2026) ? 'Completed' :
                       (month === 9 && year === 2026) ? (idx % 2 === 0 ? 'In Progress' : 'Pending') :
                       (month === 10 && year === 2026) ? (idx < 3 ? 'Pending' : 'In Progress') :
                       'Pending';

        result[id] = {
          id,
          date: `${year}-${monthStr}-${dayStr}`,
          time: `${String(8 + (idx % 4)).padStart(2, '0')}:00 - ${String(12 + (idx % 4)).padStart(2, '0')}:00`,
          area: t.area,
          description: `${t.title} (${year}/${monthStr})`,
          contractor: t.contractor,
          type: t.mc,
          status,
          progress: status === 'Completed' ? 100 : status === 'In Progress' ? (25 + idx * 15) : 0,
          equipmentId: t.tag,
          plant: t.plant
        };
      });
    }
  });

  return result;
};

const SEED_JOB_MAP: Record<string, JobDetail> = generateMultiMonthSeeds();

export default function CalendarView({ 
  setActiveView, 
  isScaffolding = false,
  globalPlantFilter = 'All'
}: { 
  setActiveView?: (view: string) => void;
  isScaffolding?: boolean;
  globalPlantFilter?: 'All' | 'Phra Khanong' | 'Sriracha';
}) {
  const { isTh } = useLanguage();

  // Active Calendar Month & Date state (Default to September 2026)
  const [activeDate, setActiveDate] = useState<Date>(() => new Date(2026, 8, 1));
  const [viewType, setViewType] = useState<'month' | 'table' | 'week' | 'day'>('month');
  const [selectedJob, setSelectedJob] = useState<JobDetail | null>(null);
  const [selectedPlotPlanJob, setSelectedPlotPlanJob] = useState<any | null>(null);

  // Filters & PDF Export states
  const [selectedDate, setSelectedDate] = useState<string>('2026-09-19');
  const [filterArea, setFilterArea] = useState<string>('All');
  const [filterMcType, setFilterMcType] = useState<string>('All');
  const [filterStatus, setFilterStatus] = useState<string>('All');
  const [tableSearchQuery, setTableSearchQuery] = useState<string>('');
  const [isPdfModalOpen, setIsPdfModalOpen] = useState<boolean>(false);

  // Date Range Selector Export Modal states
  const [isExportRangeModalOpen, setIsExportRangeModalOpen] = useState<boolean>(false);
  const [exportRangeInitialFrom, setExportRangeInitialFrom] = useState<string>('');
  const [exportRangeInitialTo, setExportRangeInitialTo] = useState<string>('');
  const [pdfExportJobs, setPdfExportJobs] = useState<JobDetail[]>([]);
  const [pdfDateRangeFrom, setPdfDateRangeFrom] = useState<string>('');
  const [pdfDateRangeTo, setPdfDateRangeTo] = useState<string>('');

  const handleOpenExportRangeModal = (defaultFrom?: string, defaultTo?: string) => {
    const fromVal = defaultFrom || selectedDate || `${activeDate.getFullYear()}-${String(activeDate.getMonth() + 1).padStart(2, '0')}-01`;
    const toVal = defaultTo || fromVal;
    setExportRangeInitialFrom(fromVal);
    setExportRangeInitialTo(toVal);
    setIsExportRangeModalOpen(true);
  };

  const handleConfirmExportPdf = (config: {
    dateFrom: string;
    dateTo: string;
    filteredJobs: JobDetail[];
    filterPlant: string;
    filterType: string;
    filterStatus: string;
  }) => {
    setPdfDateRangeFrom(config.dateFrom);
    setPdfDateRangeTo(config.dateTo);
    setPdfExportJobs(config.filteredJobs);
    if (config.filterPlant !== 'All') setFilterArea(config.filterPlant);
    if (config.filterType !== 'All') setFilterMcType(config.filterType);
    if (config.filterStatus !== 'All') setFilterStatus(config.filterStatus);
    setIsPdfModalOpen(true);
  };

  // Synchronized jobs list from Unified Crane Store
  const [craneJobs, setCraneJobs] = useState<UnifiedCraneJob[]>(() => getAllCraneJobs());

  useEffect(() => {
    const unsubscribe = subscribeToCraneOperations((updated) => {
      setCraneJobs(updated);
    });
    return unsubscribe;
  }, []);

  // Merge seed jobs and synchronized crane operations jobs
  const allJobDetails = useMemo(() => {
    const converted = craneJobs.map(mapUnifiedToJobDetail);
    const customIds = new Set(converted.map(j => j.id));
    const seedList = Object.values(SEED_JOB_MAP).filter(s => !customIds.has(s.id));
    return [...converted, ...seedList];
  }, [craneJobs]);

  // Auto-focus target date or target job from Navigation Context
  useEffect(() => {
    const nav = getActiveCraneNavContext();
    if (!nav) return;

    if (nav.date) {
      setSelectedDate(nav.date);
      const parts = nav.date.split('-');
      if (parts.length === 3) {
        const y = parseInt(parts[0], 10);
        const m = parseInt(parts[1], 10) - 1;
        if (!isNaN(y) && !isNaN(m)) {
          setActiveDate(new Date(y, m, 1));
        }
      }
    }
    if (nav.jobId && allJobDetails.length > 0) {
      const match = allJobDetails.find(j => String(j.id) === String(nav.jobId) || j.equipmentId === String(nav.jobId));
      if (match) {
        setSelectedJob(match);
        if (match.date) {
          setSelectedDate(match.date);
          const parts = match.date.split('-');
          if (parts.length === 3) {
            const y = parseInt(parts[0], 10);
            const m = parseInt(parts[1], 10) - 1;
            if (!isNaN(y) && !isNaN(m)) {
              setActiveDate(new Date(y, m, 1));
            }
          }
        }
        clearActiveCraneNavContext();
      }
    }
  }, [allJobDetails]);

  // Handle Month Navigation
  const handlePrevMonth = () => {
    setActiveDate(prev => {
      const next = new Date(prev.getFullYear(), prev.getMonth() - 1, 1);
      setSelectedDate(`${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, '0')}-01`);
      return next;
    });
  };

  const handleNextMonth = () => {
    setActiveDate(prev => {
      const next = new Date(prev.getFullYear(), prev.getMonth() + 1, 1);
      setSelectedDate(`${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, '0')}-01`);
      return next;
    });
  };

  const handleMonthSelect = (yearNum: number, monthNum: number) => {
    setActiveDate(new Date(yearNum, monthNum, 1));
    setSelectedDate(`${yearNum}-${String(monthNum + 1).padStart(2, '0')}-01`);
  };

  // Month selector options covering 2026 - 2027
  const monthOptions = useMemo(() => {
    const list: { key: string; label: string; year: number; month: number }[] = [];
    const years = [2026, 2027];
    years.forEach(y => {
      for (let m = 0; m < 12; m++) {
        const label = isTh ? `${THAI_MONTHS[m]} ${y + 543}` : `${EN_MONTHS[m]} ${y}`;
        list.push({ key: `${y}-${m}`, label, year: y, month: m });
      }
    });
    return list;
  }, [isTh]);

  const currentYear = activeDate.getFullYear();
  const currentMonthIdx = activeDate.getMonth();
  const monthPrefix = `${currentYear}-${String(currentMonthIdx + 1).padStart(2, '0')}`;
  const monthLabel = isTh 
    ? `${THAI_MONTHS[currentMonthIdx]} ${currentYear + 543}` 
    : `${EN_MONTHS[currentMonthIdx]} ${currentYear}`;

  // Filtered jobs list based on filter criteria
  const filteredJobs = useMemo(() => {
    return allJobDetails.filter(job => {
      if (filterArea !== 'All' && filterArea !== 'ทุกพื้นที่ (All Areas)') {
        const areaMatch = job.area.toLowerCase().includes(filterArea.toLowerCase());
        const plantMatch = job.plant && job.plant.toLowerCase().includes(filterArea.toLowerCase());
        if (!areaMatch && !plantMatch) return false;
      }
      if (filterMcType !== 'All' && filterMcType !== 'ทุกประเภท') {
        if (!job.type.toLowerCase().includes(filterMcType.toLowerCase())) return false;
      }
      if (filterStatus !== 'All' && filterStatus !== 'ทุกสถานะ') {
        if (job.status.toLowerCase() !== filterStatus.toLowerCase()) return false;
      }
      if (globalPlantFilter && globalPlantFilter !== 'All') {
        const p = job.plant || '';
        if (p !== globalPlantFilter && !job.area.toLowerCase().includes(globalPlantFilter.toLowerCase())) return false;
      }
      return true;
    });
  }, [allJobDetails, filterArea, filterMcType, filterStatus, globalPlantFilter]);

  // Jobs scheduled in the currently selected month
  const monthJobs = useMemo(() => {
    return filteredJobs.filter(job => job.date && job.date.startsWith(monthPrefix));
  }, [filteredJobs, monthPrefix]);

  // Jobs matching selected target date for PDF Export and Day view
  const targetDateJobs = useMemo(() => {
    return filteredJobs.filter(job => job.date === selectedDate);
  }, [filteredJobs, selectedDate]);

  // Dynamic Calendar Grid Days Calculation
  const days = useMemo(() => {
    const firstDayOfWeek = new Date(currentYear, currentMonthIdx, 1).getDay(); // 0 = Sunday
    const totalDays = new Date(currentYear, currentMonthIdx + 1, 0).getDate();
    const totalSlots = Math.ceil((firstDayOfWeek + totalDays) / 7) * 7;
    
    return Array.from({ length: totalSlots }, (_, i) => {
      const dayNum = i - firstDayOfWeek + 1;
      if (dayNum > 0 && dayNum <= totalDays) return dayNum;
      return null;
    });
  }, [currentYear, currentMonthIdx]);

  // Index filtered jobs for active month by day number
  const jobsByDay = useMemo(() => {
    const map: Record<number, JobDetail[]> = {};
    monthJobs.forEach(job => {
      if (!job.date) return;
      const parts = job.date.split('-');
      if (parts.length >= 3) {
        const dayNum = parseInt(parts[2], 10);
        if (dayNum && !isNaN(dayNum)) {
          if (!map[dayNum]) map[dayNum] = [];
          map[dayNum].push(job);
        }
      }
    });
    return map;
  }, [monthJobs]);

  // Table view search filtering
  const tableDisplayJobs = useMemo(() => {
    let list = monthJobs;
    if (tableSearchQuery.trim()) {
      const q = tableSearchQuery.toLowerCase().trim();
      list = list.filter(j => 
        j.id.toLowerCase().includes(q) ||
        j.description.toLowerCase().includes(q) ||
        j.contractor.toLowerCase().includes(q) ||
        j.area.toLowerCase().includes(q) ||
        j.type.toLowerCase().includes(q) ||
        (j.equipmentId && j.equipmentId.toLowerCase().includes(q))
      );
    }
    return list;
  }, [monthJobs, tableSearchQuery]);

  // Attachments registry
  const [attachmentRegistry, setAttachmentRegistry] = useState<Record<string, JobAttachment[]>>(() => getAllJobAttachmentsRegistry());

  useEffect(() => {
    const handleUpdate = () => {
      setAttachmentRegistry(getAllJobAttachmentsRegistry());
    };
    window.addEventListener('job_attachments_updated', handleUpdate);
    window.addEventListener('storage', handleUpdate);
    return () => {
      window.removeEventListener('job_attachments_updated', handleUpdate);
      window.removeEventListener('storage', handleUpdate);
    };
  }, []);

  const selectedJobAttachments = useMemo(() => {
    if (!selectedJob) return [];
    return attachmentRegistry[selectedJob.id] || getJobAttachments(selectedJob.id);
  }, [selectedJob, attachmentRegistry]);

  const handleAddAttachment = (att: JobAttachment) => {
    if (!selectedJob) return;
    const updated = addJobAttachment(selectedJob.id, att);
    setAttachmentRegistry(prev => ({ ...prev, [selectedJob.id]: updated }));
  };

  const handleRemoveAttachment = (attId: string) => {
    if (!selectedJob) return;
    const updated = removeJobAttachment(selectedJob.id, attId);
    setAttachmentRegistry(prev => ({ ...prev, [selectedJob.id]: updated }));
  };

  const handleLocateOnMap = (jobItem: JobDetail) => {
    setSelectedPlotPlanJob({
      id: jobItem.id,
      jobNo: jobItem.id,
      plant: jobItem.plant || 'Phra Khanong',
      unit: jobItem.area.includes('CDU') ? '11-CDU1' : '11-APS1',
      description: jobItem.description,
      status: jobItem.status,
      type: jobItem.type,
      x: 48.0,
      y: 42.0,
      workingRadiusM: 25,
      grossLoadTon: 45
    });
  };

  const dayHeaders = isTh 
    ? ['อาทิตย์', 'จันทร์', 'อังคาร', 'พุธ', 'พฤหัสฯ', 'ศุกร์', 'เสาร์']
    : ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  return (
    <div className="flex flex-col space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-gray-800 dark:text-white tracking-tight flex items-center gap-2">
            <span>{isTh ? 'ตารางปฏิทินงานเครน (Calendar Schedule)' : 'Calendar Schedule'}</span>
            <span className="text-gray-400 font-normal text-sm italic">{isScaffolding ? 'SF12' : 'CR12'}</span>
          </h2>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            {isTh 
              ? (isScaffolding ? 'ตรวจสอบกำหนดการติดตั้ง-รื้อถอนนั่งร้าน' : 'ตรวจสอบและจัดสรรกำหนดการใช้งานเครื่องจักรเครนประจำวันและประจำเดือน')
              : (isScaffolding ? 'Schedule and dispatch tracking for scaffolding' : 'Crane job schedule, machinery dispatch, and monthly operations table')}
          </p>
        </div>
        
        {/* Navigation & Controls */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Quick PDF Range Export Button */}
          <button
            type="button"
            onClick={() => handleOpenExportRangeModal()}
            className="flex items-center gap-2 px-3.5 py-1.5 bg-gradient-to-r from-red-600 via-rose-600 to-red-700 hover:from-red-700 hover:to-rose-800 text-white rounded-xl shadow-md shadow-red-500/20 text-xs font-bold transition-all active:scale-95 cursor-pointer border border-red-400/30"
            title={isTh ? 'เลือกช่วงวันที่เพื่อส่งออกรายงานตารางการใช้งานเครนเป็นไฟล์ PDF / CSV' : 'Export and print crane utilization schedule for custom date range'}
          >
            <Printer size={15} />
            <span>{isTh ? 'Export Schedule (PDF)' : 'Export Schedule'}</span>
            <span className="bg-white/25 text-white text-[10px] px-1.5 py-0.5 rounded-full font-mono font-bold">
              {monthJobs.length}
            </span>
          </button>

          {/* View Modes Selector (Added Table view) */}
          <div className="bg-gray-100 dark:bg-slate-800 p-1 rounded-xl flex space-x-1 border border-gray-200 dark:border-slate-700">
            <button 
              type="button"
              onClick={() => setViewType('month')}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                viewType === 'month' ? 'bg-white dark:bg-slate-900 shadow-sm text-gray-900 dark:text-white' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-white'
              }`}
            >
              <CalendarIcon size={13} />
              <span>{isTh ? 'ปฏิทินรายเดือน' : 'Month'}</span>
            </button>
            <button 
              type="button"
              onClick={() => setViewType('table')}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                viewType === 'table' ? 'bg-white dark:bg-slate-900 shadow-sm text-gray-900 dark:text-white' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-white'
              }`}
            >
              <Table size={13} />
              <span>{isTh ? 'ตารางรายการงาน' : 'Table'}</span>
            </button>
            <button 
              type="button"
              onClick={() => setViewType('week')}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                viewType === 'week' ? 'bg-white dark:bg-slate-900 shadow-sm text-gray-900 dark:text-white' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-white'
              }`}
            >
              {isTh ? 'รายสัปดาห์' : 'Week'}
            </button>
            <button 
              type="button"
              onClick={() => setViewType('day')}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                viewType === 'day' ? 'bg-white dark:bg-slate-900 shadow-sm text-gray-900 dark:text-white' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-white'
              }`}
            >
              {isTh ? 'รายวัน' : 'Day'}
            </button>
          </div>

          {/* Month & Year Interactive Navigator with Quick Dropdown */}
          <div className="flex items-center space-x-1 bg-white dark:bg-slate-900 px-2 py-1.5 rounded-xl shadow-sm border border-gray-200 dark:border-slate-800">
            <button 
              type="button"
              onClick={handlePrevMonth}
              className="p-1 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer text-gray-600 dark:text-gray-300"
              title={isTh ? 'เดือนก่อนหน้า' : 'Previous Month'}
            >
              <ChevronLeft size={16} />
            </button>

            {/* Selectable Month Dropdown */}
            <select
              value={`${currentYear}-${currentMonthIdx}`}
              onChange={(e) => {
                const [y, m] = e.target.value.split('-').map(Number);
                handleMonthSelect(y, m);
              }}
              className="bg-transparent text-xs font-bold text-gray-800 dark:text-white font-mono cursor-pointer outline-none px-1.5 py-0.5 border-b border-transparent hover:border-blue-500 transition-colors"
              title={isTh ? 'คลิกเลือกเดือนและปีที่ต้องการดู' : 'Select Month and Year'}
            >
              {monthOptions.map(opt => (
                <option key={opt.key} value={opt.key} className="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200">
                  {opt.label}
                </option>
              ))}
            </select>

            <button 
              type="button"
              onClick={handleNextMonth}
              className="p-1 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer text-gray-600 dark:text-gray-300"
              title={isTh ? 'เดือนถัดไป' : 'Next Month'}
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </div>
      
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
          {monthJobs.length} {isTh ? 'งานในเดือนนี้' : 'jobs this month'}
        </span>
      </div>

      {/* Search Filter Card */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-gray-200 dark:border-slate-800 p-4 transition-colors">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-3.5 items-end">
          <div className="space-y-1.5 overflow-hidden">
            <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest italic flex items-center space-x-1">
              <CalendarIcon size={12} className="text-slate-400 dark:text-slate-500" />
              <span>{isTh ? 'วันที่เลือก (Target Date)' : 'Target Date'}</span>
            </label>
            <input 
              type="date" 
              value={selectedDate}
              onChange={(e) => {
                const val = e.target.value;
                setSelectedDate(val);
                if (val) {
                  const parts = val.split('-');
                  if (parts.length === 3) {
                    const y = parseInt(parts[0], 10);
                    const m = parseInt(parts[1], 10) - 1;
                    if (!isNaN(y) && !isNaN(m)) {
                      setActiveDate(new Date(y, m, 1));
                    }
                  }
                }
              }}
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-medium text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors" 
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest italic flex items-center space-x-1">
              <MapPin size={12} className="text-slate-400 dark:text-slate-500" />
              <span>{isTh ? 'พื้นที่โรงงาน / ส่วนงาน' : 'Plant / Area'}</span>
            </label>
            <select 
              value={filterArea}
              onChange={(e) => setFilterArea(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-medium text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors"
            >
              <option value="All">{isTh ? 'ทุกพื้นที่ (All Areas)' : 'All Areas'}</option>
              <option value="BCP Area 1">BCP Area 1 (Refinery Complex)</option>
              <option value="Storage Yard">Storage Yard (คลังพัสดุและจัดเก็บ)</option>
              <option value="Zone C Construction">Zone C Construction (พื้นที่โครงการ)</option>
              <option value="Workshop South">Workshop South (โรงช่างซ่อมบำรุงใต้)</option>
              <option value="Sriracha">Sriracha Terminal (คลังน้ำมันศรีราชา)</option>
            </select>
          </div>
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest italic flex items-center space-x-1">
              <Truck size={12} className="text-slate-400 dark:text-slate-500" />
              <span>{isTh ? 'ประเภทเครื่องจักร' : 'Machinery Type'}</span>
            </label>
            <select 
              value={filterMcType}
              onChange={(e) => setFilterMcType(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-medium text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors"
            >
              <option value="All">{isTh ? 'ทุกประเภท' : 'All Types'}</option>
              <option value="Mobile Crane">Mobile Crane</option>
              <option value="Crawler Crane">Crawler Crane</option>
              <option value="Tower Crane">Tower Crane</option>
              <option value="Forklift">Forklift / Telehandler</option>
            </select>
          </div>
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest italic flex items-center space-x-1">
              <Filter size={12} className="text-slate-400 dark:text-slate-500" />
              <span>{isTh ? 'สถานะงาน' : 'Status'}</span>
            </label>
            <select 
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-medium text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors"
            >
              <option value="All">{isTh ? 'ทุกสถานะ' : 'All Status'}</option>
              <option value="In Progress">{isTh ? 'กำลังปฏิบัติงาน (In Progress)' : 'In Progress'}</option>
              <option value="Pending">{isTh ? 'รอดำเนินการ / อนุมัติ (Pending)' : 'Pending'}</option>
              <option value="Completed">{isTh ? 'เสร็จสิ้น (Completed)' : 'Completed'}</option>
            </select>
          </div>
          <div className="flex items-center gap-2">
            <button 
              type="button"
              onClick={() => {
                setActiveDate(new Date(2026, 8, 1));
                setFilterArea('All');
                setFilterMcType('All');
                setFilterStatus('All');
                setSelectedDate('2026-09-19');
                setTableSearchQuery('');
              }}
              className="flex-1 bg-blue-50 hover:bg-blue-100 dark:bg-slate-800 dark:hover:bg-slate-700 text-blue-600 dark:text-blue-400 font-bold py-2.5 rounded-xl text-xs transition-colors cursor-pointer border border-blue-200 dark:border-slate-700 text-center"
            >
              {isTh ? 'รีเซ็ตเดือนปัจจุบัน' : 'Reset to Sep 2026'}
            </button>
            <button 
              type="button"
              onClick={() => {
                setFilterArea('All');
                setFilterMcType('All');
                setFilterStatus('All');
              }}
              className="px-3 bg-gray-100 hover:bg-gray-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-gray-600 dark:text-gray-300 font-bold py-2.5 rounded-xl text-xs transition-colors cursor-pointer"
              title={isTh ? 'ล้างตัวกรอง' : 'Reset filters'}
            >
              <X size={14} />
            </button>
          </div>
        </div>
      </div>

      {/* VIEW 1: MONTH CALENDAR GRID */}
      {viewType === 'month' && (
        <div className="space-y-6">
          <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-xl border border-slate-200/90 dark:border-slate-800/90 overflow-hidden flex flex-col flex-1 min-h-[580px] transition-all">
            {/* Header of Grid: Month & Live Fleet Stats */}
            <div className="p-4 sm:p-5 bg-gradient-to-r from-slate-50 via-blue-50/20 to-slate-50 dark:from-slate-900 dark:via-blue-950/20 dark:to-slate-900 border-b border-slate-200/80 dark:border-slate-800 flex items-center justify-between flex-wrap gap-3">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-md shadow-blue-500/20">
                  <CalendarIcon size={18} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-black text-base text-slate-800 dark:text-slate-100 font-mono">
                      {monthLabel}
                    </span>
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                      {monthJobs.length} {isTh ? 'งานในเดือนนี้' : 'operations'}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    {isTh ? 'คลิกที่วันใดก็ได้เพื่อตรวจสอบคิวงานและการจัดสรรเครื่องจักรประจำวัน' : 'Click on any day to inspect daily dispatch queue and equipment allocations'}
                  </p>
                </div>
              </div>

              {/* Status Legend Pills */}
              <div className="flex items-center gap-2.5 text-xs">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-50/80 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 text-[11px] font-bold">
                  <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
                  <span>In Progress</span>
                </span>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50/80 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 text-[11px] font-bold">
                  <CheckCircle2 size={12} className="text-emerald-500" />
                  <span>Completed</span>
                </span>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 text-[11px] font-bold">
                  <span className="w-2 h-2 rounded-full bg-slate-400" />
                  <span>Scheduled</span>
                </span>
              </div>
            </div>

            {/* Grid Container */}
            <div className="overflow-x-auto custom-scrollbar flex-1 flex flex-col">
              <div className="min-w-[860px] flex-1 flex flex-col">
                {/* Day Headers (Sun - Sat) */}
                <div className="grid grid-cols-7 border-b border-slate-200 dark:border-slate-800 bg-slate-100/70 dark:bg-slate-850/80">
                  {dayHeaders.map((day, dIdx) => (
                    <div 
                      key={day} 
                      className={`px-3 py-2.5 text-center text-[11px] font-extrabold uppercase tracking-wider ${
                        dIdx === 0 || dIdx === 6 
                          ? 'text-slate-400 dark:text-slate-500' 
                          : 'text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      {day}
                    </div>
                  ))}
                </div>
                
                {/* Days Grid */}
                <div className="grid grid-cols-7 flex-1 bg-slate-200/80 dark:bg-slate-800 gap-[1px]">
                  {days.map((day, idx) => {
                    const dayJobs = day ? (jobsByDay[day] || []) : [];
                    const hasActive = dayJobs.some(j => j.status === 'In Progress');
                    const dateStr = day ? `${currentYear}-${String(currentMonthIdx + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}` : '';
                    const isSelectedDay = day && selectedDate === dateStr;
                    const isWeekend = idx % 7 === 0 || idx % 7 === 6;

                    return (
                      <div 
                        key={idx} 
                        onClick={() => {
                          if (day) setSelectedDate(dateStr);
                        }}
                        className={`p-2 sm:p-2.5 min-h-[120px] flex flex-col cursor-pointer transition-all duration-150 ${
                          !day 
                            ? 'bg-slate-50/40 dark:bg-slate-900/40 cursor-default' 
                            : isSelectedDay
                            ? 'bg-blue-50/90 dark:bg-blue-950/60 ring-2 ring-inset ring-blue-500 shadow-inner'
                            : isWeekend
                            ? 'bg-slate-50/70 dark:bg-slate-900/70 hover:bg-blue-50/40 dark:hover:bg-slate-800/80'
                            : 'bg-white dark:bg-slate-900 hover:bg-blue-50/30 dark:hover:bg-slate-800/80'
                        }`}
                      >
                        {/* Day Card Header */}
                        <div className="flex justify-between items-center mb-1.5">
                          <div className="flex items-center gap-1.5">
                            <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-mono font-bold transition-all ${
                              !day 
                                ? 'text-slate-300 dark:text-slate-700' 
                                : isSelectedDay 
                                ? 'bg-blue-600 text-white shadow-sm' 
                                : isWeekend
                                ? 'text-slate-400 dark:text-slate-500'
                                : 'text-slate-800 dark:text-slate-200'
                            }`}>
                              {day || ''}
                            </span>
                            {hasActive && (
                              <span className="relative flex h-2 w-2">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
                              </span>
                            )}
                          </div>

                          {day && dayJobs.length > 0 && (
                            <div className="flex items-center gap-1">
                              <span className="text-[10px] font-mono font-bold px-1.5 py-0.2 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                                {dayJobs.length}
                              </span>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleOpenExportRangeModal(dateStr, dateStr);
                                }}
                                className="p-1 rounded-md hover:bg-red-50 dark:hover:bg-red-950/50 text-slate-400 hover:text-red-600 transition-colors"
                                title={isTh ? `ส่งออก / พิมพ์รายงานตารางใช้งานเครนวันที่ ${day} ${monthLabel}` : `Export PDF for ${monthLabel} ${day}`}
                              >
                                <Printer size={12} />
                              </button>
                            </div>
                          )}
                        </div>
                        
                        {/* Day Operations Chips */}
                        <div className="flex-1 space-y-1 overflow-y-auto pr-0.5 custom-scrollbar">
                          {dayJobs.slice(0, 3).map(job => {
                            const isDone = job.status === 'Completed';
                            const isProg = job.status === 'In Progress';
                            const isHeavy = job.type.includes('200T') || job.type.includes('300T') || job.type.toLowerCase().includes('crawler');
                            
                            // Professional left-border status styles
                            const chipStyle = isDone
                              ? 'border-l-[3px] border-l-emerald-500 bg-emerald-50/80 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-200 border-slate-200 dark:border-slate-800 hover:bg-emerald-100 dark:hover:bg-emerald-950/70'
                              : isProg
                              ? 'border-l-[3px] border-l-blue-500 bg-blue-50/90 dark:bg-blue-950/50 text-blue-800 dark:text-blue-200 border-slate-200 dark:border-slate-800 hover:bg-blue-100 dark:hover:bg-blue-950/80'
                              : isHeavy
                              ? 'border-l-[3px] border-l-amber-500 bg-amber-50/70 dark:bg-amber-950/40 text-amber-800 dark:text-amber-200 border-slate-200 dark:border-slate-800 hover:bg-amber-100 dark:hover:bg-amber-950/60'
                              : 'border-l-[3px] border-l-slate-400 bg-slate-50 dark:bg-slate-800/60 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800';

                            const timeShort = job.time ? (job.time.split(' - ')[0] || '08:00') : '08:00';
                            const capMatch = job.type.match(/(\d+)T/i);
                            const capText = capMatch ? `${capMatch[1]}T` : '';

                            return (
                              <div 
                                key={job.id}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedJob(job);
                                }}
                                className={`text-[10px] px-1.5 py-1 rounded-md border font-medium cursor-pointer transition-all flex items-center justify-between gap-1 shadow-2xs hover:shadow-sm ${chipStyle}`}
                                title={`${job.time} • ${job.id}: ${job.description} (${job.contractor})`}
                              >
                                <div className="truncate flex items-center gap-1 min-w-0">
                                  <span className="font-mono text-[9px] opacity-75 shrink-0">{timeShort}</span>
                                  <span className="truncate font-semibold">{job.id}</span>
                                </div>
                                {capText && (
                                  <span className="text-[8px] font-mono font-bold px-1 rounded bg-black/5 dark:bg-white/10 shrink-0">
                                    {capText}
                                  </span>
                                )}
                              </div>
                            );
                          })}

                          {/* +N More indicator */}
                          {dayJobs.length > 3 && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                if (dateStr) setSelectedDate(dateStr);
                              }}
                              className="w-full text-center text-[9px] font-bold py-0.5 rounded bg-blue-50/60 hover:bg-blue-100 dark:bg-blue-950/40 dark:hover:bg-blue-900/60 text-blue-600 dark:text-blue-400 transition-colors"
                            >
                              +{dayJobs.length - 3} {isTh ? 'งานเพิ่มเติม...' : 'more jobs...'}
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          {/* INTERACTIVE SELECTED DAY OPERATIONS SPOTLIGHT */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-lg border border-slate-200 dark:border-slate-800 p-5 transition-all">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-blue-600 to-sky-600 text-white flex items-center justify-center shadow-md shadow-blue-500/20 shrink-0">
                  <CalendarDays size={20} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-black text-slate-900 dark:text-white font-mono">
                      {isTh ? `กำหนดการปฏิบัติงานวันที่ ${selectedDate}` : `Operations Agenda: ${selectedDate}`}
                    </span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                      {targetDateJobs.length} {isTh ? 'รายการงาน' : 'jobs'}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {isTh ? 'รายการเครนและการยกที่ได้รับการจัดสรรสำหรับวันนี้' : 'Allocated machinery and crane lifts scheduled for this day'}
                  </p>
                </div>
              </div>

              {targetDateJobs.length > 0 && (
                <button
                  type="button"
                  onClick={() => handleOpenExportRangeModal(selectedDate, selectedDate)}
                  className="inline-flex items-center gap-2 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-bold transition-all cursor-pointer border border-slate-200 dark:border-slate-700 shadow-2xs"
                >
                  <Printer size={13} className="text-red-500" />
                  <span>{isTh ? 'พิมพ์ตารางงานวันนี้ (PDF)' : 'Print Daily Dispatch (PDF)'}</span>
                </button>
              )}
            </div>

            <div className="pt-4">
              {targetDateJobs.length === 0 ? (
                <div className="p-8 text-center text-slate-400 dark:text-slate-500 italic">
                  <CalendarIcon size={32} className="mx-auto mb-2 opacity-40" />
                  <p className="text-xs font-semibold">
                    {isTh ? `ไม่มีงานเครนที่กำหนดไว้ในวันที่ ${selectedDate}` : `No crane jobs scheduled on ${selectedDate}`}
                  </p>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    {isTh ? 'คลิกเลือกวันที่มีเครื่องหมายตัวเลขในปฏิทินด้านบนเพื่อดูรายการ' : 'Select a date with scheduled jobs from the calendar above'}
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {targetDateJobs.map(job => {
                    const isDone = job.status === 'Completed';
                    const isProg = job.status === 'In Progress';

                    return (
                      <div
                        key={job.id}
                        onClick={() => setSelectedJob(job)}
                        className="p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-850 hover:bg-white dark:hover:bg-slate-800 hover:border-blue-400 dark:hover:border-blue-600 transition-all cursor-pointer shadow-xs hover:shadow-md group flex flex-col justify-between"
                      >
                        <div>
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-mono font-black text-blue-600 dark:text-blue-400 text-xs group-hover:underline">
                              {job.id}
                            </span>
                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-extrabold border ${
                              isDone ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300' :
                              isProg ? 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/60 dark:text-blue-300' :
                              'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300'
                            }`}>
                              {isDone ? <CheckCircle2 size={10} className="text-emerald-600" /> :
                               isProg ? <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" /> :
                               <Clock size={10} />}
                              <span>{job.status}</span>
                            </span>
                          </div>

                          <div className="text-xs font-bold text-slate-800 dark:text-slate-100 mt-1.5 line-clamp-1">
                            {job.description}
                          </div>

                          <div className="text-[11px] text-slate-600 dark:text-slate-300 font-semibold mt-1 flex items-center gap-1.5">
                            <Truck size={12} className="text-blue-500 shrink-0" />
                            <span className="truncate">{job.type}</span>
                          </div>

                          <div className="grid grid-cols-2 gap-2 mt-2 pt-2 border-t border-slate-200/60 dark:border-slate-750 text-[10px] text-slate-500 dark:text-slate-400 font-mono">
                            <div className="flex items-center gap-1 truncate">
                              <Clock size={11} className="text-slate-400 shrink-0" />
                              <span className="truncate">{job.time || '08:00 - 17:00'}</span>
                            </div>
                            <div className="flex items-center gap-1 truncate">
                              <MapPin size={11} className="text-slate-400 shrink-0" />
                              <span className="truncate">{job.area}</span>
                            </div>
                          </div>
                        </div>

                        {/* Quick Action Footer */}
                        <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-1">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleLocateOnMap(job);
                            }}
                            className="text-[10px] font-bold text-slate-600 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 flex items-center gap-1 transition-colors"
                          >
                            <MapPin size={11} />
                            <span>Plot Plan</span>
                          </button>
                          <span className="text-[10px] font-bold text-blue-600 dark:text-blue-400 group-hover:translate-x-0.5 transition-transform flex items-center gap-0.5">
                            <span>{isTh ? 'ดูรายละเอียด' : 'Details'}</span>
                            <span>→</span>
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Monthly Schedule Table Section Below Grid */}
          <div className="pt-2">
            <CalendarScheduleTable
              jobs={monthJobs}
              monthLabel={monthLabel}
              selectedMonthDate={activeDate}
              onSelectJob={setSelectedJob}
              onLocateOnMap={handleLocateOnMap}
              onOpenExportRangeModal={handleOpenExportRangeModal}
              isTh={isTh}
            />
          </div>
        </div>
      )}

      {/* VIEW 2: DEDICATED MONTHLY TABLE VIEW */}
      {viewType === 'table' && (
        <CalendarScheduleTable
          jobs={monthJobs}
          monthLabel={monthLabel}
          selectedMonthDate={activeDate}
          onSelectJob={setSelectedJob}
          onLocateOnMap={handleLocateOnMap}
          onOpenExportRangeModal={handleOpenExportRangeModal}
          isTh={isTh}
        />
      )}

      {/* VIEW 3: WEEK VIEW */}
      {viewType === 'week' && (
        <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-gray-200 dark:border-slate-800 overflow-hidden flex flex-col flex-1 min-h-[600px]">
          <div className="overflow-x-auto custom-scrollbar flex-1 flex flex-col">
            <div className="min-w-[800px] flex-1 flex flex-col">
              <div className="grid grid-cols-8 border-b border-gray-200 dark:border-slate-800 bg-gray-50 dark:bg-slate-800/50 flex-none pr-3">
                <div className="px-2 py-3 text-center text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider border-r border-gray-200 dark:border-slate-800">
                  Time
                </div>
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day, dIdx) => (
                  <div key={day} className="px-2 py-3 text-center text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider border-r border-gray-200 dark:border-slate-800 last:border-r-0">
                    {day} ({dIdx + 1} {monthLabel.split(' ')[0]})
                  </div>
                ))}
              </div>
              <div className="flex-1 overflow-y-auto custom-scrollbar relative">
                <div className="grid grid-cols-8 min-h-[800px] h-[800px]">
                  {/* Time Column */}
                  <div className="border-r border-gray-200 dark:border-slate-800 flex flex-col">
                    {Array.from({ length: 12 }, (_, i) => i + 8).map(hour => (
                      <div key={hour} className="flex-1 border-b border-gray-100 dark:border-slate-800 p-2 text-[10px] font-bold text-gray-400 dark:text-slate-500 text-right uppercase h-[10%]">
                        {hour}:00
                      </div>
                    ))}
                  </div>
                  {/* Days Columns */}
                  {Array.from({ length: 7 }).map((_, colIdx) => {
                    const dayJobs = monthJobs.filter((_, idx) => idx % 7 === colIdx);
                    return (
                      <div key={colIdx} className="border-r border-gray-100 dark:border-slate-800 flex flex-col relative flex-1 last:border-r-0 p-1 space-y-1">
                        {dayJobs.slice(0, 3).map((job, jIdx) => (
                          <div 
                            key={job.id}
                            onClick={() => setSelectedJob(job)}
                            className="bg-blue-100/90 dark:bg-blue-950/70 border border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300 rounded p-1.5 text-[9px] font-medium z-10 shadow-xs cursor-pointer hover:bg-blue-200"
                          >
                            <div className="font-bold">{job.id}</div>
                            <div className="truncate text-[8px] opacity-80">{job.time}</div>
                          </div>
                        ))}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* VIEW 4: DAY VIEW */}
      {viewType === 'day' && (
        <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-gray-200 dark:border-slate-800 overflow-hidden flex flex-col flex-1 min-h-[600px]">
          <div className="border-b border-gray-200 dark:border-slate-800 bg-gray-50 dark:bg-slate-800/50 flex flex-none pr-3">
            <div className="w-20 px-2 py-3 text-center text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider border-r border-gray-200 dark:border-slate-800 shrink-0">
              Time
            </div>
            <div className="flex-1 px-2 py-3 text-center text-xs font-bold text-blue-600 dark:text-blue-400">
              {isTh ? `กำหนดการปฏิบัติงานวันที่: ${selectedDate}` : `Daily Operations Schedule: ${selectedDate}`}
            </div>
          </div>
          <div className="flex-1 overflow-y-auto custom-scrollbar relative p-4">
            {targetDateJobs.length === 0 ? (
              <div className="p-12 text-center text-slate-400 italic">
                {isTh ? `ไม่มีงานเครนในวันที่ ${selectedDate} (เลือกวันอื่นในตารางปฏิทิน)` : `No jobs scheduled on ${selectedDate}`}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {targetDateJobs.map(job => (
                  <div
                    key={job.id}
                    onClick={() => setSelectedJob(job)}
                    className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-850 hover:border-blue-500 cursor-pointer transition-all shadow-xs"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono font-bold text-blue-600 dark:text-blue-400">{job.id}</span>
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300">
                        {job.status}
                      </span>
                    </div>
                    <div className="text-xs font-semibold text-slate-800 dark:text-slate-100 mt-2 truncate">
                      {job.description}
                    </div>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 flex items-center gap-1">
                      <Clock size={12} />
                      <span>{job.time}</span>
                    </div>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 flex items-center gap-1">
                      <MapPin size={12} />
                      <span className="truncate">{job.area}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* --- Detail Modal --- */}
      {selectedJob && (
        <div 
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-300"
          onClick={() => setSelectedJob(null)}
        >
          <div 
            className="bg-white dark:bg-slate-950 w-full max-w-4xl max-h-[92vh] flex flex-col rounded-3xl shadow-2xl border border-gray-100 dark:border-slate-800/50 overflow-hidden animate-in zoom-in-95 duration-300"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="p-4 sm:p-6 border-b border-gray-100 dark:border-slate-800 flex items-center justify-between bg-gray-50/50 dark:bg-slate-900/50 shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-blue-500/10 flex items-center justify-center text-blue-600 dark:text-blue-400 shrink-0">
                  <FileText size={20} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-bold text-gray-800 dark:text-gray-100 tracking-tight">
                      {isTh ? 'บันทึกงานตามแผนปฏิทิน' : 'Job Master Record'}
                    </h3>
                    <span className="px-2 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800/40 text-[10px] font-bold flex items-center gap-1 font-mono">
                      <Paperclip size={10} />
                      {selectedJobAttachments.length} {isTh ? 'ไฟล์แนบ' : 'files'}
                    </span>
                  </div>
                  <p className="text-[10px] text-gray-400 font-mono uppercase tracking-widest">{selectedJob.id} / CAL_SCHEDULED</p>
                </div>
              </div>
              <button 
                type="button"
                onClick={() => setSelectedJob(null)}
                className="p-2 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-full text-gray-400 dark:text-gray-500 transition-colors cursor-pointer"
              >
                <X size={20} />
              </button>
            </div>

            {/* Cross-function Quick Links Bar */}
            <div className="px-4 sm:px-8 py-2.5 bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-2 overflow-x-auto">
              <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider shrink-0">
                {isTh ? 'เปิดดูในฟังก์ชันอื่น:' : 'Cross-function Links:'}
              </span>
              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    handleLocateOnMap(selectedJob);
                    setSelectedJob(null);
                  }}
                  className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 flex items-center gap-1 transition-all cursor-pointer shadow-2xs"
                  title="เปิดผังยก Plot Plan Modal"
                >
                  <MapPin size={12} className="text-slate-500 dark:text-slate-400" />
                  <span>{isTh ? 'ผังยก Plot Plan' : 'Plot Plan'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    navigateToCraneView({ view: 'list', jobId: selectedJob.id });
                    setSelectedJob(null);
                  }}
                  className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 flex items-center gap-1 transition-all cursor-pointer shadow-2xs"
                  title="เปิดดูใน Request Lists"
                >
                  <FileText size={12} className="text-slate-500 dark:text-slate-400" />
                  <span>{isTh ? 'รายการคำขอ Request' : 'Request'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    navigateToCraneView({ view: 'optimize', jobId: selectedJob.id });
                    setSelectedJob(null);
                  }}
                  className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 flex items-center gap-1 transition-all cursor-pointer shadow-2xs"
                  title="ตรวจสอบและจัดสรรเครน"
                >
                  <Sparkles size={12} className="text-slate-500 dark:text-slate-400" />
                  <span>{isTh ? 'จัดสรร Optimizer' : 'Optimizer'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    navigateToCraneView({ view: 'crane-master' });
                    setSelectedJob(null);
                  }}
                  className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 flex items-center gap-1 transition-all cursor-pointer shadow-2xs"
                  title="เปิดดูทะเบียนเครื่องจักร Crane Master"
                >
                  <Truck size={12} className="text-slate-500 dark:text-slate-400" />
                  <span>{isTh ? 'ทะเบียนเครน' : 'Crane Master'}</span>
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div className="p-4 sm:p-8 space-y-6 sm:space-y-8 overflow-y-auto custom-scrollbar flex-1">
              {/* Top Overview Grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-tighter italic">Status</label>
                  <div className="flex">
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase border ${
                      selectedJob.status === 'Completed' ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800' :
                      selectedJob.status === 'Pending' ? 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800' :
                      'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/60 dark:text-blue-300 dark:border-blue-800'
                    }`}>
                      {selectedJob.status === 'Completed' ? <CheckCircle2 size={11} className="text-emerald-600" /> :
                       selectedJob.status === 'In Progress' ? <Clock size={11} className="animate-spin-slow text-blue-600" /> :
                       <Clock size={11} className="text-amber-600" />}
                      <span>{selectedJob.status}</span>
                    </span>
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-tighter italic">
                    {isTh ? 'วันที่ตามแผน' : 'Scheduled Date'}
                  </label>
                  <div className="flex items-center gap-1.5 text-xs font-bold text-gray-700 dark:text-gray-200">
                    <CalendarDays size={14} className="text-gray-400" />
                    <span>{selectedJob.date}</span>
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-tighter italic">
                    {isTh ? 'ช่วงเวลาปฏิบัติการ' : 'Time Slot'}
                  </label>
                  <div className="flex items-center gap-1.5 text-xs font-bold text-gray-700 dark:text-gray-200">
                    <Clock size={14} className="text-gray-400" />
                    <span>{selectedJob.time}</span>
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-tighter italic">
                    {isTh ? 'สถานที่ / จุดติดตั้ง' : 'Location'}
                  </label>
                  <div className="flex items-center gap-1.5 text-xs font-bold text-gray-700 dark:text-gray-200">
                    <MapPin size={14} className="text-gray-400" />
                    <span className="truncate">{selectedJob.area}</span>
                  </div>
                </div>
              </div>

              {/* Progress Section */}
              {selectedJob.status === 'In Progress' && (
                <div className="p-4 bg-blue-50/50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-800/30 rounded-2xl space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-blue-600 dark:text-blue-400 uppercase tracking-widest flex items-center gap-2">
                       <div className="w-2 h-2 rounded-full bg-blue-500 animate-ping" />
                       {isTh ? 'ความคืบหน้าหน้างานแบบเรียลไทม์' : 'Real-time Execution Progress'}
                    </span>
                    <span className="text-xs font-mono font-bold text-blue-700 dark:text-blue-300">{selectedJob.progress}%</span>
                  </div>
                  <div className="w-full bg-white dark:bg-slate-900 rounded-full h-2.5 overflow-hidden shadow-inner font-mono">
                    <div 
                      className="bg-blue-500 h-full rounded-full transition-all duration-1000 shadow-[0_0_15px_rgba(59,130,246,0.6)] relative" 
                      style={{ width: `${selectedJob.progress}%` }}
                    >
                      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent animate-shimmer" />
                    </div>
                  </div>
                </div>
              )}

              {/* Detailed Specs Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-4">
                  <div className="flex items-center gap-2 pb-2 border-b dark:border-slate-800">
                    <User size={16} className="text-blue-500" />
                    <h4 className="text-xs font-bold text-gray-800 dark:text-gray-200 uppercase tracking-wider">
                      {isTh ? 'ผู้รับผิดชอบ / ผู้รับเหมา' : 'Stakeholder Data'}
                    </h4>
                  </div>
                  <div className="grid grid-cols-1 gap-4">
                    <div>
                      <p className="text-[9px] font-bold text-gray-400 uppercase">{isTh ? 'ผู้รับเหมาหลัก' : 'Primary Contractor'}</p>
                      <p className="text-xs font-medium text-gray-700 dark:text-gray-300">{selectedJob.contractor}</p>
                    </div>
                    <div>
                      <p className="text-[9px] font-bold text-gray-400 uppercase">{isTh ? 'เครื่องจักรที่จัดสรร' : 'Assigned Machinery'}</p>
                      <p className="text-xs font-medium text-gray-700 dark:text-gray-300">{selectedJob.type}</p>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center gap-2 pb-2 border-b dark:border-slate-800">
                    <AlertCircle size={16} className="text-blue-500" />
                    <h4 className="text-xs font-bold text-gray-800 dark:text-gray-200 uppercase tracking-wider">
                      {isTh ? 'ขอบเขตงานและความปลอดภัย' : 'Scope of Operations'}
                    </h4>
                  </div>
                  <div>
                    <p className="text-[9px] font-bold text-gray-400 uppercase mb-1">{isTh ? 'รายละเอียดกิจกรรม' : 'Activity Description'}</p>
                    <p className="text-xs text-gray-700 dark:text-gray-300 leading-relaxed font-bold bg-slate-50 dark:bg-slate-900/50 p-2 rounded-lg border border-slate-100 dark:border-slate-800">
                      {selectedJob.description}. {isTh ? 'ต้องปฏิบัติตามมาตรฐานความปลอดภัย BCP หมวด 12.A อย่างเคร่งครัด' : 'All safety protocols must be followed according to BCP guidelines section 12.A.'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Job Attachment Section (แนบเอกสารประกอบของ Job) */}
              <div className="pt-6 border-t dark:border-slate-800">
                <JobAttachmentSection
                  attachments={selectedJobAttachments}
                  onAddAttachment={handleAddAttachment}
                  onRemoveAttachment={handleRemoveAttachment}
                  isTh={isTh}
                  title={isTh ? 'เอกสารและไฟล์แนบประกอบของ Job นี้ (Attachments)' : 'Job Attachments & Supporting Documents'}
                  description={isTh ? 'แนบแผนการยก (Lifting Plan), ใบอนุญาต PTW, เอกสาร ปจ.2, ภาพถ่ายหน้างาน หรือแบบวิศวกรรม' : 'Upload and manage Lifting Plan, PTW Permits, Phor.Jor.2 Certs, Site Photos, and Engineering Drawings'}
                />
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 pt-6 border-t dark:border-slate-800">
                <button 
                  type="button"
                  onClick={() => {
                    if (selectedJob?.date) {
                      handleOpenExportRangeModal(selectedJob.date, selectedJob.date);
                    } else {
                      handleOpenExportRangeModal();
                    }
                  }}
                  className="flex-1 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-700 hover:to-rose-700 text-white font-bold py-3 px-6 rounded-2xl shadow-lg shadow-red-500/20 transition-all active:scale-95 text-xs uppercase tracking-widest flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Printer size={16} />
                  <span>{isTh ? 'พิมพ์ตารางการใช้เครน (PDF)' : 'Print Schedule (PDF)'}</span>
                </button>
                <button 
                  type="button"
                  onClick={() => {
                    handleLocateOnMap(selectedJob);
                    setSelectedJob(null);
                  }}
                  className="flex-1 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 text-gray-700 dark:text-gray-200 font-bold py-3 px-6 rounded-2xl hover:bg-gray-50 dark:hover:bg-slate-800 transition-all active:scale-95 text-xs uppercase tracking-widest flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Maximize2 size={16} />
                  <span>{isTh ? 'ดูตำแหน่งบนผัง' : 'Locate on Map'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Date Range Selector Export Modal */}
      <ExportDateRangeModal
        isOpen={isExportRangeModalOpen}
        onClose={() => setIsExportRangeModalOpen(false)}
        initialDateFrom={exportRangeInitialFrom}
        initialDateTo={exportRangeInitialTo}
        allJobs={allJobDetails}
        currentActiveMonth={activeDate}
        isTh={isTh}
        onConfirmExportPdf={handleConfirmExportPdf}
      />

      {/* Crane Schedule PDF Export Modal */}
      <CraneSchedulePdfModal
        isOpen={isPdfModalOpen}
        onClose={() => {
          setIsPdfModalOpen(false);
          setPdfExportJobs([]);
        }}
        selectedDate={selectedDate}
        dateRangeFrom={pdfDateRangeFrom}
        dateRangeTo={pdfDateRangeTo}
        filterPlant={filterArea}
        filterType={filterMcType}
        filterStatus={filterStatus}
        jobs={pdfExportJobs.length > 0 ? pdfExportJobs : (targetDateJobs.length > 0 ? targetDateJobs : monthJobs)}
        isTh={isTh}
      />

      {/* Focused Job Plot Plan Popup Modal */}
      <JobPlotPlanModal
        isOpen={!!selectedPlotPlanJob}
        job={selectedPlotPlanJob}
        onClose={() => setSelectedPlotPlanJob(null)}
      />
    </div>
  );
}
