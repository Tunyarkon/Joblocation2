import { useState, useMemo, useEffect } from 'react';
import { 
  Calendar, Search, MapPin, Truck, AlertCircle, CheckCircle2, Clock, 
  ChevronLeft, ChevronRight, Eye, X, FileText, User, CalendarDays, Maximize2, ListChecks,
  Paperclip, Plus, Download, Sparkles, ShieldCheck, Tag, AlertTriangle, Printer, Layers, Filter, Check, ArrowRight, Building2
} from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import JobAttachmentSection from './common/JobAttachmentSection';
import CranePermitDossierModal from './CranePermitDossierModal';
import { 
  JobAttachment, 
  getAllJobAttachmentsRegistry, 
  getJobAttachments, 
  addJobAttachment, 
  removeJobAttachment 
} from '../data/jobAttachmentData';
import { 
  getAllCraneJobs, 
  updateCraneJob, 
  subscribeToCraneOperations, 
  extractDateString, 
  extractTimeString, 
  UnifiedCraneJob,
  navigateToCraneView,
  getActiveCraneNavContext,
  clearActiveCraneNavContext
} from '../data/craneOperationsData';
import { updateCraneMaster } from '../data/craneMasterData';

// --- Mockup Data Generation ---
const AREAS = ['BCP Area 1', 'Storage Yard', 'Zone C Construction', 'Workshop', 'Dock Area'];
const CRANE_TYPES = ['Mobile (500T)', 'Mobile (100T)', 'Tower Crane', 'Rough Terrain'];
const STATUSES = ['Pending Review', 'Assigned', 'In Progress', 'Completed', 'Revision Required'];
const CONTRACTORS = ['BCP Operations (Owner Crane)', 'Contractor A (Mechanical)', 'Contractor B (Piping)', 'Contractor C (Rigging)'];
const DESCRIPTIONS = [
  'Lift heavy generators to roof deck', 'Material relocation and stacking', 'Steel framework mounting',
  'Engine block assembly', 'Concrete block moving', 'Maintenance platform lift',
  'Tower section assembly', 'Secondary beam installation', 'Temporary roof positioning'
];

export interface Job {
  id: string;
  rawId?: string | number;
  jobNo: string;
  workOrderNo: string;
  equipmentId: string;
  functionalLocation: string;
  plant: string;
  tradeSession: string;
  shift: string;
  date: string;
  time: string;
  area: string;
  description: string;
  contractor: string;
  type: string;
  capacity: number;
  craneModel: string;
  loadWeightTon: number;
  workingRadiusM: number;
  boomLengthM: number;
  assignedCraneId?: string;
  assignedCraneName?: string;
  status: string;
  progress: number;
  ptwNo?: string;
  phorJor2Cert?: string;
  riggerLead?: string;
}

const cleanWoNumber = (raw?: string | number) => {
  if (!raw) return '';
  const s = String(raw).trim();
  return s.toUpperCase().startsWith('WO-') ? s : `WO-${s}`;
};

const mapCraneJobToJobList = (c: UnifiedCraneJob): Job => {
  const jNo = c.jobNo || `CRN-26${String(c.id).slice(-4)}`;
  const woNo = c.workOrder || (c.woNumber ? cleanWoNumber(c.woNumber) : '') || c.workOrderNo || (c.id ? `WO-CR-${String(c.id).slice(-6)}` : 'WO-CR-882041');
  const rawDate = c.date || (c.workStartDateTime ? c.workStartDateTime.split(' ')[0] : extractDateString(c.dateFrom)) || (c as any).workStartDate || '2026-10-15';

  return {
    id: jNo,
    rawId: c.id,
    jobNo: jNo,
    workOrderNo: woNo,
    equipmentId: c.equipmentTag || c.equipmentId || '11-C-101',
    functionalLocation: c.functionalLocation || (c.plant === 'Sriracha' ? '12-HCU (Hydrocracking Unit)' : '11-APS1 (Atmospheric Pipestill 1)'),
    plant: c.plant || 'Phra Khanong',
    tradeSession: c.tradeSession || 'IMD',
    shift: c.shift || 'Day',
    date: rawDate,
    time: c.time || (c.workStartDateTime && c.workEndDateTime ? `${c.workStartDateTime.split(' ')[1] || '08:00'} - ${c.workEndDateTime.split(' ')[1] || '17:00'}` : extractTimeString(c.dateFrom, c.duration)) || '08:00 - 16:00',
    area: c.locationArea || c.area || (c.plant === 'Sriracha' ? 'Sriracha Terminal Complex' : 'BCP Area 1'),
    description: c.description || 'Turnaround Crane Lifting Operation',
    contractor: c.contractor || 'BCP Operations (Owner Crane)',
    type: c.type || `${c.craneType || 'Mobile Crane'} (${c.capacityRequired || c.capacity || 50}T)${c.craneModel ? ` - ${c.craneModel}` : ''}`,
    capacity: Number(c.capacityRequired) || Number(c.capacity) || 50,
    craneModel: c.craneModel || (c.capacity ? `GR-${c.capacity}0N` : 'GR-250N'),
    loadWeightTon: typeof c.totalWeightTon === 'number' ? c.totalWeightTon : (typeof c.loadWeightTon === 'number' ? c.loadWeightTon : Math.round((c.capacity || 50) * 0.6)),
    workingRadiusM: typeof c.workingRadiusM === 'number' ? c.workingRadiusM : 18,
    boomLengthM: typeof c.boomLengthM === 'number' ? c.boomLengthM : 31,
    assignedCraneId: c.assignedCraneId,
    assignedCraneName: c.assignedCraneName,
    status: c.status || 'Pending Review',
    progress: typeof c.progress === 'number' ? c.progress : (c.status === 'Completed' ? 100 : c.status === 'In Progress' ? 50 : 0),
    ptwNo: c.ptwNo || 'PTW-2026-9901',
    phorJor2Cert: c.phorJor2Cert || 'PJ2-BCP-2026',
    riggerLead: c.riggerLead || c.submittedBy || 'Somchai K.'
  };
};

const mockJobs: Job[] = Array.from({ length: 40 }, (_, i) => {
  const id = i + 10;
  const date = new Date(2026, 8, 1 + Math.floor(Math.random() * 30));
  const statusPool = ['Pending Review', 'Assigned', 'In Progress', 'Completed', 'Revision Required'];
  const status = statusPool[Math.floor(Math.random() * statusPool.length)];
  const jobNo = `CRN-26${String(id).padStart(3, '0')}`;
  const eqPool = ['11-C-101', '12-R-101', '11-E-102B', '21-B-201', '31-TK-01', '41-BERTH-02'];
  const trades = ['IMD', 'EMD', 'MSD', 'MAD', 'TMD', 'Project'];
  const cranes = ['CR-PK-01 (Tadano 25T)', 'CR-PK-02 (Kato 50T)', 'CR-SR-01 (Liebherr 100T)', 'CR-SR-02 (Demag 250T)'];
  const assigned = (status === 'Assigned' || status === 'In Progress' || status === 'Completed') ? cranes[i % cranes.length] : undefined;
  const assignedId = assigned ? assigned.split(' ')[0] : undefined;

  return {
    id: jobNo,
    rawId: id,
    jobNo,
    workOrderNo: `WO-882${String(id).padStart(3, '0')}`,
    equipmentId: eqPool[i % eqPool.length],
    functionalLocation: (i % 2 === 0 ? '11-APS1 (Atmospheric Pipestill 1)' : '12-HCU (Hydrocracking Unit)'),
    plant: i % 2 === 0 ? 'Phra Khanong' : 'Sriracha',
    tradeSession: trades[i % trades.length],
    shift: i % 3 === 0 ? 'Night' : 'Day',
    date: date.toISOString().split('T')[0],
    time: `${8 + Math.floor(Math.random() * 4)}:00 - ${16 + Math.floor(Math.random() * 2)}:00`,
    area: AREAS[Math.floor(Math.random() * AREAS.length)],
    description: DESCRIPTIONS[Math.floor(Math.random() * DESCRIPTIONS.length)],
    contractor: CONTRACTORS[Math.floor(Math.random() * CONTRACTORS.length)],
    type: CRANE_TYPES[Math.floor(Math.random() * CRANE_TYPES.length)],
    capacity: 50,
    craneModel: 'Tadano GR-500EXL',
    loadWeightTon: 18,
    workingRadiusM: 20,
    boomLengthM: 35,
    assignedCraneId: assignedId,
    assignedCraneName: assigned,
    status: status,
    progress: status === 'In Progress' ? Math.floor(20 + Math.random() * 70) : status === 'Completed' ? 100 : 0,
    ptwNo: `PTW-2026-${String(id).padStart(4, '0')}`,
    phorJor2Cert: `PJ2-BCP-${id}`,
    riggerLead: 'Certified Rigging Lead'
  };
});

export default function JobList({ 
  isScaffolding = false, 
  setActiveView,
  globalPlantFilter = 'All'
}: { 
  isScaffolding?: boolean; 
  setActiveView?: (view: string) => void;
  globalPlantFilter?: 'All' | 'Phra Khanong' | 'Sriracha';
}) {
  const { language } = useLanguage();
  const isTh = language === 'th';

  const [jobs, setJobs] = useState<Job[]>(() => {
    const custom = getAllCraneJobs();
    const converted = custom.map(mapCraneJobToJobList);
    const customIds = new Set(converted.map(j => j.id));
    const filteredMock = mockJobs.filter(m => !customIds.has(m.id));
    return [...converted, ...filteredMock];
  });

  useEffect(() => {
    const unsubscribe = subscribeToCraneOperations((updatedCustom) => {
      const converted = updatedCustom.map(mapCraneJobToJobList);
      const customIds = new Set(converted.map(j => j.id));
      setJobs(prev => {
        const filteredMock = prev.filter(p => !customIds.has(p.id));
        return [...converted, ...filteredMock];
      });
    });
    return unsubscribe;
  }, []);

  // Listen to navigation context (e.g. from PlotPlan, Calendar, RequestList)
  useEffect(() => {
    const nav = getActiveCraneNavContext();
    if (nav?.jobId && jobs.length > 0) {
      const match = jobs.find(j => j.id === String(nav.jobId) || j.jobNo === String(nav.jobId));
      if (match) {
        setSelectedJob(match);
        clearActiveCraneNavContext();
      }
    }
  }, [jobs]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState({
    dateFrom: '2026-09-01',
    dateEnd: '2026-12-31',
    area: 'All',
    contractor: 'All',
    mcType: 'All',
    status: 'All',
    woNo: ''
  });

  const [currentPage, setCurrentPage] = useState(1);
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [checklist, setChecklist] = useState({
    safetyBriefing: false,
    siteInspection: false,
    equipmentCheck: false,
    permitVerified: false
  });
  const itemsPerPage = 8;

  // Attachment Registry for all jobs
  const [attachmentRegistry, setAttachmentRegistry] = useState<Record<string, JobAttachment[]>>(() => getAllJobAttachmentsRegistry());

  // Listen for attachment updates across tabs/components
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

  // Attachments for currently selected job
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

  // Reset to first page when search or filters change
  const [activeGateTab, setActiveGateTab] = useState<'All' | 'Gate1' | 'Gate2' | 'Gate3' | 'Gate4' | 'Review'>('All');

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filters, activeGateTab]);

  useEffect(() => {
    if (selectedJob) {
      setChecklist({
        safetyBriefing: selectedJob.status === 'In Progress' || selectedJob.status === 'Completed',
        siteInspection: selectedJob.status === 'In Progress' || selectedJob.status === 'Completed',
        equipmentCheck: selectedJob.status === 'In Progress' || selectedJob.status === 'Completed',
        permitVerified: selectedJob.status === 'In Progress' || selectedJob.status === 'Completed'
      });
    }
  }, [selectedJob?.id, selectedJob?.status]);

  // Jobs scoped by active plant filter
  const plantScopedJobs = useMemo(() => {
    if (!globalPlantFilter || globalPlantFilter === 'All') return jobs;
    return jobs.filter(j => j.plant === globalPlantFilter);
  }, [jobs, globalPlantFilter]);

  // Distinct lists for dropdown options
  const distinctAreas = useMemo(() => {
    const list = Array.from(new Set(jobs.map(j => j.area).filter(Boolean)));
    return list.sort();
  }, [jobs]);

  const distinctTypes = useMemo(() => {
    const list = Array.from(new Set(jobs.map(j => j.type || j.craneModel).filter(Boolean)));
    return list.sort();
  }, [jobs]);

  const filteredJobs = useMemo(() => {
    return plantScopedJobs.filter(job => {
      const q = searchTerm.toLowerCase().trim();
      const matchSearch = !q ||
                          job.id.toLowerCase().includes(q) || 
                          (job.jobNo && job.jobNo.toLowerCase().includes(q)) ||
                          (job.workOrderNo && job.workOrderNo.toLowerCase().includes(q)) ||
                          (job.equipmentId && job.equipmentId.toLowerCase().includes(q)) ||
                          (job.functionalLocation && job.functionalLocation.toLowerCase().includes(q)) ||
                          (job.tradeSession && job.tradeSession.toLowerCase().includes(q)) ||
                          (job.shift && job.shift.toLowerCase().includes(q)) ||
                          (job.date && job.date.toLowerCase().includes(q)) ||
                          (job.time && job.time.toLowerCase().includes(q)) ||
                          (job.plant && job.plant.toLowerCase().includes(q)) ||
                          (job.area && job.area.toLowerCase().includes(q)) ||
                          (job.type && job.type.toLowerCase().includes(q)) ||
                          (job.craneModel && job.craneModel.toLowerCase().includes(q)) ||
                          (job.capacity && String(job.capacity).includes(q)) ||
                          (job.loadWeightTon && String(job.loadWeightTon).includes(q)) ||
                          (job.workingRadiusM && String(job.workingRadiusM).includes(q)) ||
                          (job.boomLengthM && String(job.boomLengthM).includes(q)) ||
                          (job.assignedCraneId && job.assignedCraneId.toLowerCase().includes(q)) ||
                          (job.assignedCraneName && job.assignedCraneName.toLowerCase().includes(q)) ||
                          (job.status && job.status.toLowerCase().includes(q)) ||
                          (job.ptwNo && job.ptwNo.toLowerCase().includes(q)) ||
                          (job.phorJor2Cert && job.phorJor2Cert.toLowerCase().includes(q)) ||
                          (job.riggerLead && job.riggerLead.toLowerCase().includes(q)) ||
                          job.description.toLowerCase().includes(q) ||
                          job.contractor.toLowerCase().includes(q);
      
      const filterWo = filters.woNo.toLowerCase().trim();
      const filterWoNumOnly = filterWo.replace(/^(wo|crn|req|icm)[-_]?/i, '');
      const jobWo = (job.workOrderNo || '').toLowerCase();
      const jobNo = (job.jobNo || job.id || '').toLowerCase();
      const matchWo = !filterWo || 
                      jobWo.includes(filterWo) || 
                      jobNo.includes(filterWo) ||
                      (filterWoNumOnly.length > 0 && (
                        jobWo.includes(filterWoNumOnly) || 
                        jobNo.includes(filterWoNumOnly)
                      ));
      
      const matchArea = filters.area === 'All' || 
                        job.area === filters.area ||
                        job.area.toLowerCase().includes(filters.area.toLowerCase()) ||
                        (filters.area === 'BCP' && (job.area.includes('BCP') || job.plant === 'Phra Khanong')) ||
                        (filters.area === 'Contractor Area' && (!job.area.includes('BCP') || job.plant !== 'Phra Khanong'));
      
      const matchContractor = filters.contractor === 'All' || job.contractor === filters.contractor;
      const matchMcType = filters.mcType === 'All' || 
                          job.type === filters.mcType || 
                          job.type.toLowerCase().includes(filters.mcType.toLowerCase()) ||
                          (job.craneModel && job.craneModel.toLowerCase().includes(filters.mcType.toLowerCase()));
      const matchStatus = filters.status === 'All' || 
                          job.status === filters.status ||
                          (filters.status === 'Pending Review' && (job.status === 'Submitted' || job.status === 'Requested' || job.status === 'Pending' || job.status === 'Under Review' || job.status === 'Draft')) ||
                          (filters.status === 'Assigned' && (job.status === 'Reviewed' || job.status === 'Optimized'));
      const matchDate = (!filters.dateFrom || !job.date || job.date >= filters.dateFrom) && 
                        (!filters.dateEnd || !job.date || job.date <= filters.dateEnd);

      // Lifecycle Gate filtering (supports both standard and imported status names)
      let matchGate = true;
      if (activeGateTab === 'Gate1') {
        matchGate = job.status === 'Pending Review' || job.status === 'Requested' || job.status === 'Pending' || job.status === 'Under Review' || job.status === 'Submitted' || job.status === 'Draft';
      } else if (activeGateTab === 'Gate2') {
        matchGate = job.status === 'Assigned' || job.status === 'Optimized' || job.status === 'Reviewed';
      } else if (activeGateTab === 'Gate3') {
        matchGate = job.status === 'In Progress' || job.status === 'Approved';
      } else if (activeGateTab === 'Gate4') {
        matchGate = job.status === 'Completed';
      } else if (activeGateTab === 'Review') {
        matchGate = job.status === 'Revision Required' || job.status === 'Rejected' || job.status === 'Cancelled';
      }

      return matchSearch && matchWo && matchArea && matchContractor && matchMcType && matchStatus && matchDate && matchGate;
    });
  }, [plantScopedJobs, searchTerm, filters, activeGateTab]);

  const totalPages = Math.ceil(filteredJobs.length / itemsPerPage);
  const paginatedJobs = filteredJobs.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const stats = useMemo(() => {
    return {
      total: plantScopedJobs.length,
      gate1: plantScopedJobs.filter(j => j.status === 'Pending Review' || j.status === 'Requested' || j.status === 'Pending' || j.status === 'Under Review' || j.status === 'Submitted' || j.status === 'Draft').length,
      gate2: plantScopedJobs.filter(j => j.status === 'Assigned' || j.status === 'Optimized' || j.status === 'Reviewed').length,
      gate3: plantScopedJobs.filter(j => j.status === 'In Progress' || j.status === 'Approved').length,
      gate4: plantScopedJobs.filter(j => j.status === 'Completed').length,
      review: plantScopedJobs.filter(j => j.status === 'Revision Required' || j.status === 'Rejected' || j.status === 'Cancelled').length,
    };
  }, [plantScopedJobs]);

  const [isCraneDossierOpen, setIsCraneDossierOpen] = useState(false);
  const [scaffoldSafetyTag, setScaffoldSafetyTag] = useState<'Green' | 'Red'>('Green');
  const [scaffoldDismantleStatus, setScaffoldDismantleStatus] = useState<'In Service' | 'Dismantle Requested' | 'Area Handed Over'>('In Service');

  return (
    <div className="flex flex-col space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100 tracking-tight flex items-center gap-2">
            <span>
              {isScaffolding 
                ? (isTh ? 'ทะเบียนงานนั่งร้าน (SC01 Job Registry)' : 'Scaffolding Job List View') 
                : (isTh ? 'ทะเบียนคำขอ & แผนงานเครน (CR11 Crane Job Operations)' : 'Crane Job Operations & Lifting Registry')}
            </span>
            <span className="text-gray-400 font-normal text-xs px-2 py-0.5 rounded-md bg-gray-100 dark:bg-slate-800 font-mono">
              {isScaffolding ? 'SF11' : 'CR11'}
            </span>
          </h2>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            {isTh 
              ? 'ระบบติดตามสถานะคำขอยก 4 Gates: ตรวจสอบแผน (Gate 1) -> จัดสรรเครน (Gate 2) -> ปฏิบัติงานยก (Gate 3) -> คืนเครื่องจักร (Gate 4)' 
              : '4-Gate Lifecycle Tracking: Engineer Review (Gate 1) -> Crane Assigned (Gate 2) -> Execution (Gate 3) -> Handover (Gate 4)'}
          </p>
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
          {stats.total} {isTh ? 'งานที่ค้นพบ' : 'jobs found'}
        </span>
      </div>

      {/* Lifecycle Gate Navigation Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 custom-scrollbar text-xs font-bold border-b border-gray-200 dark:border-slate-800">
        <button
          type="button"
          onClick={() => setActiveGateTab('All')}
          className={`pb-2.5 px-3 border-b-2 transition-all flex items-center gap-2 cursor-pointer shrink-0 ${
            activeGateTab === 'All'
              ? 'border-blue-600 text-blue-600 dark:text-blue-400'
              : 'border-transparent text-gray-500 hover:text-gray-800 dark:hover:text-gray-200'
          }`}
        >
          <span>{isTh ? 'งานทั้งหมด' : 'All Jobs'}</span>
          <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-gray-100 dark:bg-slate-800 font-mono">{stats.total}</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveGateTab('Gate1')}
          className={`pb-2.5 px-3 border-b-2 transition-all flex items-center gap-2 cursor-pointer shrink-0 ${
            activeGateTab === 'Gate1'
              ? 'border-amber-500 text-amber-600 dark:text-amber-400'
              : 'border-transparent text-gray-500 hover:text-gray-800 dark:hover:text-gray-200'
          }`}
        >
          <Clock size={14} className="text-amber-500" />
          <span>{isTh ? 'Gate 1: รอตรวจสอบแผน (Pending Review)' : 'Gate 1: Pending Review'}</span>
          <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 font-mono">{stats.gate1}</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveGateTab('Gate2')}
          className={`pb-2.5 px-3 border-b-2 transition-all flex items-center gap-2 cursor-pointer shrink-0 ${
            activeGateTab === 'Gate2'
              ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
              : 'border-transparent text-gray-500 hover:text-gray-800 dark:hover:text-gray-200'
          }`}
        >
          <Truck size={14} className="text-indigo-500" />
          <span>{isTh ? 'Gate 2: จัดสรรเครนแล้ว (Assigned & Ready)' : 'Gate 2: Assigned & Ready'}</span>
          <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-indigo-100 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 font-mono">{stats.gate2}</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveGateTab('Gate3')}
          className={`pb-2.5 px-3 border-b-2 transition-all flex items-center gap-2 cursor-pointer shrink-0 ${
            activeGateTab === 'Gate3'
              ? 'border-blue-600 text-blue-600 dark:text-blue-400'
              : 'border-transparent text-gray-500 hover:text-gray-800 dark:hover:text-gray-200'
          }`}
        >
          <Sparkles size={14} className="text-blue-500" />
          <span>{isTh ? 'Gate 3: กำลังยกหน้างาน (In Progress)' : 'Gate 3: In Progress'}</span>
          <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 font-mono">{stats.gate3}</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveGateTab('Gate4')}
          className={`pb-2.5 px-3 border-b-2 transition-all flex items-center gap-2 cursor-pointer shrink-0 ${
            activeGateTab === 'Gate4'
              ? 'border-emerald-600 text-emerald-600 dark:text-emerald-400'
              : 'border-transparent text-gray-500 hover:text-gray-800 dark:hover:text-gray-200'
          }`}
        >
          <CheckCircle2 size={14} className="text-emerald-500" />
          <span>{isTh ? 'Gate 4: เสร็จสิ้น (Completed)' : 'Gate 4: Completed'}</span>
          <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 font-mono">{stats.gate4}</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveGateTab('Review')}
          className={`pb-2.5 px-3 border-b-2 transition-all flex items-center gap-2 cursor-pointer shrink-0 ${
            activeGateTab === 'Review'
              ? 'border-rose-600 text-rose-600 dark:text-rose-400'
              : 'border-transparent text-gray-500 hover:text-gray-800 dark:hover:text-gray-200'
          }`}
        >
          <AlertTriangle size={14} className="text-rose-500" />
          <span>{isTh ? 'แก้ไข/ไม่อนุมัติ (Revision/Rejected)' : 'Revision / Rejected'}</span>
          <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 font-mono">{stats.review}</span>
        </button>
      </div>
      
      {/* Search Filter Card */}
      <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-gray-200 dark:border-slate-800 p-4 transition-colors duration-300">
        <div className="grid grid-cols-1 md:grid-cols-4 lg:grid-cols-7 gap-4 items-end">
          <div className="space-y-1.5 overflow-hidden">
            <label className="text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest italic flex items-center gap-1">
              <Calendar size={12} />
              <span>Date From</span>
            </label>
            <input 
              type="date" 
              className="w-full bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg px-3 py-1.5 text-xs font-medium text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors"
              value={filters.dateFrom}
              onChange={(e) => setFilters(prev => ({ ...prev, dateFrom: e.target.value }))}
            />
          </div>
          <div className="space-y-1.5 overflow-hidden">
            <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest italic flex items-center gap-1">
              <Calendar size={12} className="text-slate-400 dark:text-slate-500" />
              <span>Date End</span>
            </label>
            <input 
              type="date" 
              className="w-full bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg px-3 py-1.5 text-xs font-medium text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors"
              value={filters.dateEnd}
              onChange={(e) => setFilters(prev => ({ ...prev, dateEnd: e.target.value }))}
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest italic">Plant/Area</label>
            <select 
              className="w-full bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg px-3 py-1.5 text-xs font-medium text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors"
              value={filters.area}
              onChange={(e) => setFilters(prev => ({ ...prev, area: e.target.value }))}
            >
              <option value="All">All Areas</option>
              <option value="BCP">BCP / Phra Khanong</option>
              <option value="Contractor Area">Contractor Area / Sriracha</option>
              {distinctAreas.map(a => <option key={a} value={a}>{a}</option>)}
            </select>
          </div>
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest italic">Contractor</label>
            <select 
              className="w-full bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg px-3 py-1.5 text-xs font-medium text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors"
              value={filters.contractor}
              onChange={(e) => setFilters(prev => ({ ...prev, contractor: e.target.value }))}
            >
              <option value="All">All Contractors</option>
              {CONTRACTORS.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest italic">{isScaffolding ? 'Type' : 'M/C Type'}</label>
            <select 
              className="w-full bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg px-3 py-1.5 text-xs font-medium text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors"
              value={filters.mcType}
              onChange={(e) => setFilters(prev => ({ ...prev, mcType: e.target.value }))}
            >
              <option value="All">All Types</option>
              {isScaffolding ? (
                <>
                  <option value="Tower Scaffold">Tower Scaffold</option>
                  <option value="Standard Scaffold">Standard Scaffold</option>
                </>
              ) : (
                <>
                  {CRANE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                  <option value="Crane Spot">Crane Spot</option>
                  <option value="Crane Pull">Crane Pull</option>
                </>
              )}
            </select>
          </div>
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest italic">Status</label>
            <select 
              className="w-full bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg px-3 py-1.5 text-xs font-medium text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors"
              value={filters.status}
              onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
            >
              <option value="All">All Statuses</option>
              {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
              <option value="Submitted">Submitted (Gate 1)</option>
              <option value="Reviewed">Reviewed (Gate 2)</option>
            </select>
          </div>
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest italic">{isTh ? 'กรองเลขที่ (No. / WO)' : 'Filter No. (WO/Job)'}</label>
            <input 
              type="text" 
              placeholder={isTh ? "เลข WO, Job No, ID..." : "Filter WO, Job, ID..."} 
              className="w-full bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-xs font-medium text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors font-mono"
              value={filters.woNo}
              onChange={(e) => setFilters(prev => ({ ...prev, woNo: e.target.value }))}
            />
          </div>
          <div className="relative">
            <input 
              type="text" 
              placeholder={isTh ? "ค้นหาข้อมูลทุกคอลัมน์ (Job, WO, Tag, Machine, Status...)" : "Search all columns (Job, WO, Tag, Machine, Status...)"} 
              className="w-full bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg pl-8 pr-3 py-1.5 text-xs font-medium text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
          </div>
        </div>

        {/* Clear Filters Action Bar */}
        {(searchTerm || filters.woNo || filters.area !== 'All' || filters.contractor !== 'All' || filters.mcType !== 'All' || filters.status !== 'All' || activeGateTab !== 'All' || filters.dateFrom !== '2026-09-01' || filters.dateEnd !== '2026-12-31') && (
          <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-xs">
            <span className="text-slate-500 dark:text-slate-400 text-[11px]">
              {isTh 
                ? `กำลังใช้งานตัวกรอง (พบ ${filteredJobs.length} รายการ จากทั้งหมด ${plantScopedJobs.length} รายการ)` 
                : `Active filter applied (${filteredJobs.length} of ${plantScopedJobs.length} items shown)`}
            </span>
            <button
              type="button"
              onClick={() => {
                setSearchTerm('');
                setActiveGateTab('All');
                setFilters({
                  dateFrom: '2026-09-01',
                  dateEnd: '2026-12-31',
                  area: 'All',
                  contractor: 'All',
                  mcType: 'All',
                  status: 'All',
                  woNo: ''
                });
              }}
              className="text-blue-600 dark:text-blue-400 hover:underline font-semibold text-[11px] cursor-pointer flex items-center gap-1"
            >
              <span>{isTh ? '✕ ล้างตัวกรองทั้งหมด (Show All)' : '✕ Clear All Filters'}</span>
            </button>
          </div>
        )}
      </div>

      {/* Summary Cards with Gates */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-gray-200 dark:border-slate-800 p-4 flex flex-col transition-colors">
          <span className="text-gray-500 dark:text-gray-400 text-[10px] font-bold uppercase tracking-widest italic mb-1">
            {isTh ? 'คำขอในมุมมอง' : 'Filtered Results'}
          </span>
          <div className="text-2xl font-bold text-slate-800 dark:text-gray-100">{filteredJobs.length}</div>
        </div>
        <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-gray-200 dark:border-slate-800 p-4 flex flex-col transition-colors">
          <span className="text-amber-600 dark:text-amber-400 text-[10px] font-bold uppercase tracking-widest italic mb-1 flex items-center gap-1">
            <Clock size={12} />
            <span>Gate 1: Pending</span>
          </span>
          <div className="text-2xl font-bold text-amber-500 dark:text-amber-400">{stats.gate1}</div>
        </div>
        <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-gray-200 dark:border-slate-800 p-4 flex flex-col transition-colors">
          <span className="text-indigo-600 dark:text-indigo-400 text-[10px] font-bold uppercase tracking-widest italic mb-1 flex items-center gap-1">
            <Truck size={12} />
            <span>Gate 2: Assigned</span>
          </span>
          <div className="text-2xl font-bold text-indigo-500 dark:text-indigo-400">{stats.gate2}</div>
        </div>
        <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-gray-200 dark:border-slate-800 p-4 flex flex-col transition-colors">
          <span className="text-emerald-600 dark:text-emerald-400 text-[10px] font-bold uppercase tracking-widest italic mb-1 flex items-center gap-1">
            <CheckCircle2 size={12} />
            <span>Gate 4: Completed</span>
          </span>
          <div className="text-2xl font-bold text-emerald-500 dark:text-emerald-400">{stats.gate4}</div>
        </div>
      </div>

      {/* Data Table Card */}
      <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 flex flex-col overflow-hidden transition-colors">
        <div className="overflow-auto min-h-[300px]">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700 text-[11px] font-bold text-slate-700 dark:text-slate-200 uppercase tracking-wider">
                <th className="p-3">Job No</th>
                <th className="p-3">WO Number</th>
                <th className="p-3">Equipment & Func Loc</th>
                <th className="p-3">Trade & Shift</th>
                <th className="p-3">Date & Time</th>
                <th className="p-3">Plant & Area</th>
                <th className="p-3">Crane Sizing / Load</th>
                <th className="p-3">Assigned Machine</th>
                <th className="p-3">Gate / Status</th>
                <th className="p-3">{isTh ? 'เอกสาร' : 'Docs'}</th>
                <th className="p-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {paginatedJobs.map((job) => (
                <tr key={job.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors group">
                  {/* Job No */}
                  <td className="p-3 text-xs">
                    <button 
                      onClick={() => setSelectedJob(job)}
                      className="font-mono font-bold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer block text-left"
                    >
                      {job.jobNo || job.id}
                    </button>
                  </td>

                  {/* WO Number */}
                  <td className="p-3 text-xs font-mono">
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                      {job.workOrderNo || '-'}
                    </span>
                  </td>

                  {/* Equipment & Func Loc */}
                  <td className="p-3 text-xs">
                    <span className="font-mono font-bold text-slate-900 dark:text-slate-100 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-1.5 py-0.5 rounded text-[11px]">
                      {job.equipmentId}
                    </span>
                    <span className="text-[10px] text-slate-600 dark:text-slate-400 block truncate max-w-[140px] mt-0.5" title={job.functionalLocation}>
                      {job.functionalLocation}
                    </span>
                  </td>

                  {/* Trade & Shift */}
                  <td className="p-3 text-xs">
                    <div className="flex items-center gap-1.5">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800/40 font-mono">
                        {job.tradeSession}
                      </span>
                      <span className="text-[10px] font-medium text-slate-600 dark:text-slate-400">
                        {job.shift}
                      </span>
                    </div>
                  </td>

                  {/* Date & Time */}
                  <td className="p-3 text-xs font-mono">
                    <div className="flex flex-col">
                      <span className="text-xs font-semibold text-slate-800 dark:text-slate-100">{job.date}</span>
                      <span className="text-[10px] text-slate-500 dark:text-slate-400">{job.time}</span>
                    </div>
                  </td>

                  {/* Plant & Area */}
                  <td className="p-3 text-xs">
                    <span className="font-bold text-slate-900 dark:text-slate-100 block">{job.plant}</span>
                    <span className="text-[10px] text-slate-500 dark:text-slate-400 truncate max-w-[130px] block" title={job.area}>{job.area}</span>
                  </td>

                  {/* Crane Sizing / Load */}
                  <td className="p-3 text-xs">
                    <div className="flex flex-col">
                      <span className="font-semibold text-slate-800 dark:text-slate-100">{job.craneModel || job.type}</span>
                      <span className="text-[10px] font-mono text-slate-500 dark:text-slate-400">
                        Load: {job.loadWeightTon}T • R: {job.workingRadiusM}m
                      </span>
                    </div>
                  </td>

                  {/* Assigned Machine */}
                  <td className="p-3 text-xs">
                    {job.assignedCraneName || job.assignedCraneId ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/40">
                        <Truck size={10} />
                        <span>{job.assignedCraneId || job.assignedCraneName}</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-800">
                        Unassigned
                      </span>
                    )}
                  </td>

                  {/* Gate / Status */}
                  <td className="p-3">
                    <div className="flex flex-col gap-1 min-w-[110px]">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[9px] font-bold uppercase border w-fit ${
                        job.status === 'Completed' ? 'bg-green-100 text-green-800 border-green-300 dark:bg-green-900/30 dark:text-green-300 dark:border-green-800' :
                        job.status === 'In Progress' ? 'bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-800 shadow-xs' :
                        job.status === 'Assigned' || job.status === 'Optimized' ? 'bg-indigo-100 text-indigo-800 border-indigo-300 dark:bg-indigo-900/30 dark:text-indigo-300 dark:border-indigo-800' :
                        job.status === 'Revision Required' || job.status === 'Rejected' ? 'bg-rose-100 text-rose-800 border-rose-300 dark:bg-rose-900/30 dark:text-rose-300 dark:border-rose-800' :
                        'bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-800'
                      }`}>
                        {job.status === 'Completed' && <CheckCircle2 size={10} />}
                        {job.status === 'In Progress' && <Clock size={10} className="animate-spin" />}
                        {job.status === 'Assigned' && <Truck size={10} />}
                        {(job.status === 'Pending Review' || job.status === 'Requested' || job.status === 'Pending') && <Clock size={10} />}
                        {job.status}
                      </span>
                      {job.status === 'In Progress' && (
                        <div className="w-full bg-blue-100/50 dark:bg-slate-800 rounded-full h-1.5 overflow-hidden">
                          <div 
                            className="bg-blue-500 h-full rounded-full transition-all duration-500" 
                            style={{ width: `${job.progress}%` }}
                          />
                        </div>
                      )}
                    </div>
                  </td>

                  {/* Attachments */}
                  <td className="p-3">
                    {(() => {
                      const atts = attachmentRegistry[job.id] || [];
                      const count = atts.length;
                      return (
                        <button
                          onClick={() => setSelectedJob(job)}
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] transition-all cursor-pointer ${
                            count > 0
                              ? 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 border border-indigo-200 font-bold'
                              : 'text-slate-400 hover:text-blue-600'
                          }`}
                        >
                          <Paperclip size={11} />
                          <span>{count > 0 ? `${count}` : '+'}</span>
                        </button>
                      );
                    })()}
                  </td>

                  {/* Actions */}
                  <td className="p-3 text-right">
                    <button 
                      onClick={() => setSelectedJob(job)}
                      className="p-1.5 bg-blue-500/10 text-blue-600 dark:text-blue-400 rounded hover:bg-blue-600 hover:text-white transition-all border border-blue-500/20 cursor-pointer shadow-2xs"
                      title={isTh ? "เปิดดูรายละเอียด & ตรวจรับงาน" : "View detail and update execution"}
                    >
                      <Eye size={13} />
                    </button>
                  </td>
                </tr>
              ))}
              {paginatedJobs.length === 0 && (
                <tr>
                  <td colSpan={10} className="p-12 text-center text-gray-400 dark:text-gray-500 italic text-xs">
                    No matching crane jobs found for the selected gate or filter criteria.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {filteredJobs.length > 0 && (
          <div className="p-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/80 dark:bg-slate-800/40">
            <span className="text-[11px] text-slate-600 dark:text-slate-400 font-medium">
              Showing <span className="text-slate-900 dark:text-slate-100 font-bold">{(currentPage - 1) * itemsPerPage + 1}</span> to <span className="text-slate-900 dark:text-slate-100 font-bold">{Math.min(currentPage * itemsPerPage, filteredJobs.length)}</span> of <span className="text-slate-900 dark:text-slate-100 font-bold">{filteredJobs.length}</span> entries
            </span>
            <div className="flex items-center gap-1">
              <button 
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                className="p-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded text-slate-600 dark:text-slate-300 hover:text-blue-600 hover:border-blue-400 dark:hover:border-blue-500 disabled:opacity-40 disabled:pointer-events-none transition-all shadow-xs cursor-pointer"
              >
                <ChevronLeft size={16} />
              </button>
              <div className="flex items-center gap-1 px-2">
                <span className="text-xs font-bold text-slate-900 dark:text-slate-100">{currentPage}</span>
                <span className="text-xs text-slate-400">/</span>
                <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">{totalPages}</span>
              </div>
              <button 
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                className="p-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded text-slate-600 dark:text-slate-300 hover:text-blue-600 hover:border-blue-400 dark:hover:border-blue-500 disabled:opacity-40 disabled:pointer-events-none transition-all shadow-xs cursor-pointer"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* --- Detail Modal --- */}
      {selectedJob && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-300">
          <div 
            className="bg-white dark:bg-slate-900 w-full max-w-4xl max-h-[92vh] flex flex-col rounded-3xl shadow-2xl border border-gray-100 dark:border-slate-800 overflow-hidden animate-in zoom-in-95 duration-300"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="p-4 sm:p-6 border-b border-gray-100 dark:border-slate-800 flex items-center justify-between bg-gray-50/50 dark:bg-slate-800/50 shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-blue-500/10 flex items-center justify-center text-blue-600 dark:text-blue-400 shrink-0">
                  <FileText size={20} />
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-lg font-bold text-gray-800 dark:text-gray-100 tracking-tight">
                      {isTh ? 'บันทึกคำขอยก & ควบคุมหน้างาน (Crane Job Record)' : 'Crane Job & Lifting Record'}
                    </h3>
                    <span className="px-2 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800/40 text-[10px] font-bold font-mono">
                      WO: {selectedJob.workOrderNo}
                    </span>
                    <span className="px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-[10px] font-mono font-bold">
                      Tag: {selectedJob.equipmentId}
                    </span>
                  </div>
                  <p className="text-[10px] text-gray-400 font-mono uppercase tracking-widest mt-0.5">
                    {selectedJob.id} • {selectedJob.plant} • {selectedJob.functionalLocation}
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setSelectedJob(null)}
                className="p-2 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-full text-gray-400 dark:text-gray-500 transition-colors cursor-pointer"
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-4 sm:p-8 space-y-6 overflow-y-auto custom-scrollbar flex-1">
              {/* Top Overview Grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-700/80">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-tighter italic">Lifecycle Status</label>
                  <div>
                    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[10px] font-bold uppercase border ${
                      selectedJob.status === 'Completed' ? 'bg-green-100 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-300' :
                      selectedJob.status === 'In Progress' ? 'bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300' :
                      selectedJob.status === 'Assigned' || selectedJob.status === 'Optimized' ? 'bg-indigo-100 text-indigo-700 border-indigo-200 dark:bg-indigo-900/30 dark:text-indigo-300' :
                      selectedJob.status === 'Revision Required' || selectedJob.status === 'Rejected' ? 'bg-rose-100 text-rose-700 border-rose-200 dark:bg-rose-900/30 dark:text-rose-300' :
                      'bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-300'
                    }`}>
                      {selectedJob.status}
                    </span>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-tighter italic">Trade & Shift</label>
                  <div className="flex items-center gap-1.5 text-xs font-bold text-gray-700 dark:text-gray-200">
                    <span className="font-mono text-indigo-600 dark:text-indigo-400">{selectedJob.tradeSession}</span>
                    <span>• {selectedJob.shift} Shift</span>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-tighter italic">Scheduled Time</label>
                  <div className="flex items-center gap-1.5 text-xs font-bold text-gray-700 dark:text-gray-200">
                    <CalendarDays size={13} className="text-gray-400" />
                    <span>{selectedJob.date} ({selectedJob.time})</span>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-tighter italic">Assigned Crane</label>
                  <div className="text-xs font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                    <Truck size={13} />
                    <span>{selectedJob.assignedCraneName || selectedJob.assignedCraneId || 'Not assigned yet'}</span>
                  </div>
                </div>
              </div>

              {/* Progress Section (if In Progress) */}
              {selectedJob.status === 'In Progress' && (
                <div className="p-4 bg-blue-50/50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-800/30 rounded-2xl space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-blue-600 dark:text-blue-400 uppercase tracking-widest">
                      {isTh ? 'ความคืบหน้าการยกหน้างานแบบ Real-time' : 'Real-time Lifting Progress'}
                    </span>
                    <span className="text-xs font-mono font-bold text-blue-700 dark:text-blue-300">{selectedJob.progress}%</span>
                  </div>
                  <div className="w-full bg-white dark:bg-slate-800 rounded-full h-2 overflow-hidden shadow-inner">
                    <div 
                      className="bg-blue-500 h-full rounded-full transition-all duration-500" 
                      style={{ width: `${selectedJob.progress}%` }}
                    />
                  </div>
                </div>
              )}

              {/* Technical Lifting Specifications */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-gray-800 dark:text-gray-200 uppercase tracking-wider border-b border-gray-100 dark:border-slate-800 pb-2 flex items-center gap-2">
                  <ShieldCheck size={16} className="text-blue-500" />
                  <span>{isTh ? 'ข้อกำหนดทางเทคนิคและการยก (Lifting Engineering Specifications)' : 'Lifting Engineering Specs'}</span>
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                  <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-700/60">
                    <span className="text-[10px] font-bold text-gray-400 block uppercase">Load Weight</span>
                    <span className="text-base font-bold font-mono text-slate-800 dark:text-slate-100">{selectedJob.loadWeightTon} Ton</span>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-700/60">
                    <span className="text-[10px] font-bold text-gray-400 block uppercase">Working Radius</span>
                    <span className="text-base font-bold font-mono text-slate-800 dark:text-slate-100">{selectedJob.workingRadiusM} m</span>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-700/60">
                    <span className="text-[10px] font-bold text-gray-400 block uppercase">Boom Length</span>
                    <span className="text-base font-bold font-mono text-slate-800 dark:text-slate-100">{selectedJob.boomLengthM} m</span>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-700/60">
                    <span className="text-[10px] font-bold text-gray-400 block uppercase">Permit PTW No.</span>
                    <span className="text-xs font-bold font-mono text-blue-600 dark:text-blue-400 truncate block">{selectedJob.ptwNo}</span>
                  </div>
                </div>
              </div>

              {/* Detailed Scope Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-3">
                  <h4 className="text-xs font-bold text-gray-800 dark:text-gray-200 uppercase tracking-wider border-b border-gray-100 dark:border-slate-800 pb-2">
                    {isTh ? 'ข้อมูลผู้รับผิดชอบ & สถานที่' : 'Location & Contractors'}
                  </h4>
                  <div className="space-y-2 text-xs">
                    <div>
                      <span className="text-[10px] font-bold text-gray-400 block uppercase">{isTh ? 'ผู้รับเหมา / แผนกปฏิบัติงาน' : 'Contractor / Department'}</span>
                      <span className="font-medium text-slate-700 dark:text-slate-300">{selectedJob.contractor}</span>
                    </div>
                    <div>
                      <span className="text-[10px] font-bold text-gray-400 block uppercase">{isTh ? 'ตำแหน่งพิกัดโรงกลั่น' : 'Plant Area & Func Loc'}</span>
                      <span className="font-medium text-slate-700 dark:text-slate-300">{selectedJob.plant} • {selectedJob.area}</span>
                    </div>
                    <div>
                      <span className="text-[10px] font-bold text-gray-400 block uppercase">{isTh ? 'หัวหน้าชุดริกเกอร์' : 'Rigger Lead'}</span>
                      <span className="font-medium text-slate-700 dark:text-slate-300">{selectedJob.riggerLead}</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <h4 className="text-xs font-bold text-gray-800 dark:text-gray-200 uppercase tracking-wider border-b border-gray-100 dark:border-slate-800 pb-2">
                    {isTh ? 'ขอบเขตงานยก (Scope of Work)' : 'Scope of Work'}
                  </h4>
                  <p className="text-xs text-gray-700 dark:text-gray-300 leading-relaxed font-medium bg-slate-50 dark:bg-slate-800/40 p-3 rounded-xl border border-slate-200/60 dark:border-slate-700/60">
                    {selectedJob.description}
                  </p>
                </div>
              </div>

              {/* Checklist Section for Starting or Verifying Lift */}
              <div className="space-y-3 pt-2">
                <div className="flex items-center gap-2 pb-1 border-b border-gray-100 dark:border-slate-800">
                  <ListChecks size={18} className="text-blue-500" />
                  <h4 className="text-xs font-bold text-gray-800 dark:text-gray-200 uppercase tracking-wider">
                    {isTh ? 'การตรวจสอบความปลอดภัยก่อนและระหว่างยก (Field Safety Execution Checklist)' : 'Field Lifting Safety Checklist'}
                  </h4>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {[
                    { id: 'safetyBriefing', label: isTh ? '1. Safety Briefing & Toolbox Talk ร่วมกับทีม Rigger และคนขับเครน' : '1. Safety Briefing & Toolbox Talk with Rigger Team' },
                    { id: 'siteInspection', label: isTh ? '2. ตรวจสอบสภาพพื้นดินและการปูแผ่นเหล็ก Outrigger Matting' : '2. Ground Bearing & Outrigger Matting Checked' },
                    { id: 'equipmentCheck', label: isTh ? '3. ตรวจเช็คอุปกรณ์สลิง โตงเตง (Rigging Gear) และใบ ปจ.2' : '3. Rigging Gear & Inspection Certs Verified' },
                    { id: 'permitVerified', label: isTh ? '4. กั้นเขตแนวรัศมียก (Barricaded) และใบอนุญาต PTW ผ่านการเซ็น' : '4. Exclusion Zone Barricaded & PTW Signed' },
                  ].map(item => (
                    <label key={item.id} className="flex items-center gap-3 p-3 border border-gray-200 dark:border-slate-700 rounded-xl cursor-pointer hover:bg-gray-50 dark:hover:bg-slate-800/50 transition-colors">
                      <input 
                        type="checkbox" 
                        className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 bg-white dark:bg-slate-900"
                        checked={checklist[item.id as keyof typeof checklist]}
                        onChange={(e) => setChecklist(prev => ({ ...prev, [item.id]: e.target.checked }))}
                      />
                      <span className="text-xs font-medium text-gray-700 dark:text-gray-300">{item.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Job Attachments Section */}
              <div className="pt-2 border-t border-gray-100 dark:border-slate-800">
                <JobAttachmentSection
                  attachments={selectedJobAttachments}
                  onAddAttachment={handleAddAttachment}
                  onRemoveAttachment={handleRemoveAttachment}
                  isTh={isTh}
                  title={isTh ? 'เอกสารและไฟล์แนบประกอบของ Job นี้ (Attachments)' : 'Job Attachments & Supporting Documents'}
                  description={isTh ? 'แนบแผนการยก (Lifting Plan), ใบอนุญาต PTW, เอกสาร ปจ.2, ภาพถ่ายหน้างาน หรือแบบวิศวกรรม' : 'Upload and manage Lifting Plan, PTW Permits, Phor.Jor.2 Inspection Certs, Site Photos, and Engineering Drawings'}
                />
              </div>

              {/* Action Buttons: Lifecycle Gate Transitions */}
              <div className="flex flex-col gap-3 pt-4 border-t border-gray-100 dark:border-slate-800">
                {/* Gate 2 to Gate 3: Start Lifting Execution */}
                {(selectedJob.status === 'Assigned' || selectedJob.status === 'Optimized' || selectedJob.status === 'Pending Review' || selectedJob.status === 'Pending') && (
                  <button 
                    disabled={!Object.values(checklist).every(Boolean)}
                    onClick={() => {
                      updateCraneJob(selectedJob.rawId || selectedJob.id, { status: 'In Progress', progress: 30 });
                      setJobs(prevJobs => prevJobs.map(j => j.id === selectedJob.id ? { ...j, status: 'In Progress', progress: 30 } : j));
                      setSelectedJob(prev => prev ? { ...prev, status: 'In Progress', progress: 30 } : null);
                    }}
                    className="w-full bg-blue-600 disabled:bg-gray-300 dark:disabled:bg-slate-700 disabled:text-gray-500 dark:disabled:text-slate-500 disabled:cursor-not-allowed hover:bg-blue-700 text-white font-bold py-3.5 px-6 rounded-2xl shadow-lg transition-all active:scale-95 text-xs uppercase tracking-widest flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <CheckCircle2 size={16} />
                    <span>{isTh ? 'เริ่มปฏิบัติงานยกหน้างาน (Start Lifting - Gate 3)' : 'Start Lifting Execution (Gate 3)'}</span>
                  </button>
                )}

                {/* Gate 3 to Gate 4: Complete Lift and Release Crane */}
                {selectedJob.status === 'In Progress' && (
                  <button 
                    onClick={() => {
                      // 1. Complete Crane Job
                      updateCraneJob(selectedJob.rawId || selectedJob.id, { status: 'Completed', progress: 100 });
                      setJobs(prevJobs => prevJobs.map(j => j.id === selectedJob.id ? { ...j, status: 'Completed', progress: 100 } : j));
                      
                      // 2. Release Crane in Crane Master back to 'Available'
                      if (selectedJob.assignedCraneId) {
                        updateCraneMaster(selectedJob.assignedCraneId, { 
                          fleetStatus: 'Available', 
                          assignedJobNo: undefined 
                        });
                      }

                      setSelectedJob(prev => prev ? { ...prev, status: 'Completed', progress: 100 } : null);
                    }}
                    className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3.5 px-6 rounded-2xl shadow-lg transition-all active:scale-95 text-xs uppercase tracking-widest flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <CheckCircle2 size={16} />
                    <span>{isTh ? 'ปิดงานยกเสร็จสิ้นสมบูรณ์ & คืนเครื่องจักร (Complete Lift & Release Crane - Gate 4)' : 'Complete Lifting & Release Crane (Gate 4)'}</span>
                  </button>
                )}

                {/* Completed Banner */}
                {selectedJob.status === 'Completed' && (
                  <div className="p-3.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 text-xs font-bold flex items-center gap-2.5">
                    <CheckCircle2 size={18} className="text-emerald-600" />
                    <span>{isTh ? 'งานยกนี้เสร็จสิ้นสมบูรณ์แล้ว เครนถูกส่งคืนสถานะ Available สู่ระบบกองกลางเรียบร้อย' : 'Lifting job completed. Crane released back to Available in Crane Master.'}</span>
                  </div>
                )}
                
                {/* Secondary Actions */}
                <div className="flex flex-wrap gap-2.5">
                  {/* Print CR01 Official Permit Dossier Button */}
                  <button 
                    onClick={() => setIsCraneDossierOpen(true)}
                    className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2.5 px-4 rounded-xl shadow-md transition-all active:scale-95 text-xs uppercase tracking-widest flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <Printer size={15} />
                    <span>{isScaffolding ? (isTh ? 'พิมพ์ใบอนุญาตนั่งร้าน (Print SC01)' : 'Print SC01 Dossier') : (isTh ? 'พิมพ์แฟ้ม CR01 ทางการ (Permit Dossier)' : 'Print CR01 Official Dossier')}</span>
                  </button>

                  {/* Cross-function Navigation Buttons */}
                  <button 
                    type="button"
                    onClick={() => {
                      navigateToCraneView({ 
                        view: 'plan', 
                        jobId: selectedJob.id, 
                        plant: selectedJob.area?.includes('Sriracha') ? 'Sriracha' : 'Phra Khanong' 
                      });
                      setSelectedJob(null);
                    }}
                    className="flex-1 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-slate-700 hover:text-slate-900 dark:text-slate-200 dark:hover:text-white font-bold py-2.5 px-3 rounded-xl transition-all active:scale-95 text-xs uppercase tracking-widest flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs"
                  >
                    <MapPin size={15} className="text-slate-500 dark:text-slate-400" />
                    <span>{isTh ? 'ผังยก (Plot Plan)' : 'Plot Plan'}</span>
                  </button>

                  <button 
                    type="button"
                    onClick={() => {
                      navigateToCraneView({ 
                        view: 'calendar', 
                        jobId: selectedJob.id, 
                        date: selectedJob.date?.split(' ')[0] 
                      });
                      if (setActiveView) setActiveView('calendar');
                      setSelectedJob(null);
                    }}
                    className="flex-1 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-slate-700 hover:text-slate-900 dark:text-slate-200 dark:hover:text-white font-bold py-2.5 px-3 rounded-xl transition-all active:scale-95 text-xs uppercase tracking-widest flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs"
                  >
                    <Calendar size={15} className="text-slate-500 dark:text-slate-400" />
                    <span>{isTh ? 'ปฏิทิน (Calendar)' : 'Calendar'}</span>
                  </button>

                  <button 
                    type="button"
                    onClick={() => {
                      navigateToCraneView({ 
                        view: 'crane-master', 
                        craneId: selectedJob.assignedCraneId 
                      });
                      if (setActiveView) setActiveView('crane-master');
                      setSelectedJob(null);
                    }}
                    className="flex-1 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-slate-700 hover:text-slate-900 dark:text-slate-200 dark:hover:text-white font-bold py-2.5 px-3 rounded-xl transition-all active:scale-95 text-xs uppercase tracking-widest flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs"
                  >
                    <Truck size={15} className="text-blue-500 dark:text-blue-400" />
                    <span>{isTh ? 'ทะเบียนเครน (Fleet)' : 'Crane Fleet'}</span>
                  </button>

                  <button 
                    type="button"
                    onClick={() => {
                      navigateToCraneView({ 
                        view: 'optimize', 
                        jobId: selectedJob.id 
                      });
                      if (setActiveView) setActiveView('optimize');
                      setSelectedJob(null);
                    }}
                    className="flex-1 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-slate-700 hover:text-slate-900 dark:text-slate-200 dark:hover:text-white font-bold py-2.5 px-3 rounded-xl transition-all active:scale-95 text-xs uppercase tracking-widest flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs"
                  >
                    <Sparkles size={15} className="text-amber-500 dark:text-amber-400" />
                    <span>{isTh ? 'จัดสรร (Review & Optimize)' : 'Optimize'}</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* CR01 Official Permit Dossier Modal */}
      {selectedJob && (
        <CranePermitDossierModal
          isOpen={isCraneDossierOpen}
          onClose={() => setIsCraneDossierOpen(false)}
          job={{
            id: selectedJob.id,
            description: selectedJob.description,
            area: selectedJob.area,
            contractor: selectedJob.contractor,
            type: selectedJob.type,
            craneType: selectedJob.description.toLowerCase().includes('pull') ? 'Crane Pull' : 'Crane Spot',
            capacity: selectedJob.type.match(/\d+T/)?.[0] || '50T',
            date: selectedJob.date,
            time: selectedJob.time,
            plant: selectedJob.area.includes('Sriracha') ? 'Sriracha' : 'Phra Khanong'
          }}
          isTh={isTh}
        />
      )}
    </div>
  );
}
