import React, { useState, useMemo, useEffect, useRef, MouseEvent as ReactMouseEvent, TouchEvent as ReactTouchEvent } from 'react';
import { 
  Calendar, CheckCircle, Search, XCircle, Filter, MapPin, 
  ChevronLeft, ChevronRight, X, FileText, User, Truck, Clock, 
  Maximize2, CalendarDays, ChevronUp, ChevronDown, Upload, ListChecks, Edit, Paperclip,
  ZoomIn, ZoomOut, RotateCcw, Compass, Sun, Moon, ShieldCheck, Crosshair, 
  Layers, Gauge, Sparkles, Building2, Factory, Eye, EyeOff, CheckCircle2, AlertTriangle, ExternalLink,
  Download, Plus, SlidersHorizontal, Sliders
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import * as XLSX from 'xlsx';
import JobAttachmentSection from './common/JobAttachmentSection';
import RequestDetailDrawer from './RequestDetailDrawer';
import JobPlotPlanModal from './JobPlotPlanModal';
import CreateRequestModal from './CreateRequestModal';
import ImportRequestsModal from './ImportRequestsModal';
import CalendarView from './CalendarView';
import { 
  JobAttachment, 
  getJobAttachments, 
  addJobAttachment, 
  removeJobAttachment,
  SAMPLE_ATTACHMENT_TEMPLATES
} from '../data/jobAttachmentData';
import { 
  getAllCraneJobs, 
  updateCraneJob, 
  subscribeToCraneOperations,
  UnifiedCraneJob,
  CraneRequestStatus,
  CraneAssignmentStatus,
  CraneRequestType,
  navigateToCraneView,
  getActiveCraneNavContext,
  clearActiveCraneNavContext
} from '../data/craneOperationsData';
import { useLanguage } from '../context/LanguageContext';
import { usePlantTurnShared } from '../context/PlantTurnSharedContext';
import { useThemeGate } from '../utils/themeGate';
import essoPlotPlanBg from '../assets/esso_sriracha_master_plotplan.jpg';

// --- Mockup Data Generation ---
const PLANTS = ['Phra Khanong', 'Sriracha'];
const JOB_TYPES = ['Mobile Crane', 'Tower Crane', 'Forklift', 'Truck'];
const STATUSES = ['Requested', 'Approved', 'Rejected', 'In Progress', 'Completed'];
const CONTRACTORS = ['Contractor A', 'Contractor B', 'Operations Dept', 'Maintenance Team', 'External Hire'];
const DESCRIPTIONS = [
  'Remove Manhole no.3', 'Open Top M/H & Loading', 'Lifting steel beams',
  'Concrete pouring', 'Heavy equipment transport', 'Foundation work',
  'Pipe laying', 'Roof assembly', 'Electrical cable installation',
  'Safety inspection lift', 'Material unloading', 'Site cleanup'
];

type JobRequest = {
  id: number;
  jobNo: string;
  requestNo?: string;
  requestType?: CraneRequestType;
  requestStatus?: CraneRequestStatus;
  assignmentStatus?: CraneAssignmentStatus;
  unit?: string;
  equipmentType?: string;
  loadWeightTon?: number;
  riggingWeightTon?: number;
  grossLoadTon?: number;
  workingRadiusM?: number;
  requiredHookHeightM?: number;
  assignedCraneId?: string;
  assignedCraneName?: string;
  plant: string;
  description: string;
  type: string;
  dateFrom: string;
  status: string;
  contractor: string;
  x: number;
  y: number;
  isArea: boolean;
  width: number;
  height: number;
  rotation: number;
  progress?: number;
  inProgressChecklist?: Record<string, boolean>;
  remarks?: string;
  attachments?: JobAttachment[];
  eventName?: string;
  eventCode?: string;
};

const INITIAL_JOBS: JobRequest[] = Array.from({ length: 525 }, (_, i) => {
  const id = i + 1;
  const day = 1 + (i % 30);
  const hour = 8 + (i % 9);
  const dateFrom = `2026-09-${String(day).padStart(2, '0')} ${String(hour).padStart(2, '0')}:00`;

  // Deterministic status distribution to achieve exact initial counts:
  // Custom seed jobs (5): 1 Pending, 3 In Progress, 1 Completed
  // Target: Results Found: 530, Pending: 111, In Progress: 204, Completed: 105
  // Initial jobs (525): 110 Pending, 201 In Progress, 104 Completed, 110 Rejected
  let status = 'Requested';
  if (i < 110) {
    status = 'Requested';
  } else if (i < 110 + 201) {
    status = 'In Progress';
  } else if (i < 110 + 201 + 104) {
    status = 'Completed';
  } else {
    status = 'Rejected';
  }
  const randomStatus = status === 'In Progress' ? 1 + (i % 3) : (status === 'Completed' ? 4 : 0);

  // Cleanly distribute jobs across the 4 CAD process zones:
  const zone = id % 4;
  let posX = 30;
  let posY = 30;
  if (zone === 0) {
    posX = 14 + (id * 13) % 28;
    posY = 20 + (id * 17) % 24;
  } else if (zone === 1) {
    posX = 60 + (id * 13) % 28;
    posY = 20 + (id * 17) % 24;
  } else if (zone === 2) {
    posX = 14 + (id * 13) % 28;
    posY = 58 + (id * 17) % 24;
  } else {
    posX = 60 + (id * 13) % 28;
    posY = 58 + (id * 17) % 24;
  }

  const reqType: CraneRequestType = id % 5 === 0 ? 'CR01' : id % 3 === 0 ? 'CR02' : 'CR03';
  const reqStatus: CraneRequestStatus = status === 'Approved' ? 'Approved' : status === 'In Progress' ? 'In Progress' : status === 'Completed' ? 'Completed' : status === 'Rejected' ? 'Rejected' : 'Submitted';
  const assignStatus: CraneAssignmentStatus = (status === 'In Progress' || status === 'Completed' || status === 'Approved') ? 'Assigned' : 'Unassigned';

  const eventList = [
    { name: 'Annual Turnaround 2026', code: 'EVT-TA-2026-01' },
    { name: 'Major Overhaul Q3', code: 'EVT-MO-2026-Q3' },
    { name: 'TA-2026 Vacuum Overhaul', code: 'EVT-VAC-2026-02' },
    { name: 'Routine Shutdown Oct', code: 'EVT-SD-2026-10' }
  ];
  const selectedEv = eventList[id % eventList.length];

  return {
    id,
    jobNo: `ICM-26${String(id).padStart(5, '0')}`,
    requestNo: `REQ-CR26-${String(id).padStart(4, '0')}`,
    eventName: selectedEv.name,
    eventCode: selectedEv.code,
    requestType: reqType,
    requestStatus: reqStatus,
    assignmentStatus: assignStatus,
    unit: '11-APS1',
    equipmentType: id % 2 === 0 ? 'Column Component' : 'Exchanger Bundle',
    loadWeightTon: 20 + (id % 50),
    riggingWeightTon: 3,
    grossLoadTon: 23 + (id % 50),
    workingRadiusM: 15 + (id % 20),
    requiredHookHeightM: 20 + (id % 25),
    assignedCraneId: assignStatus === 'Assigned' ? (id % 2 === 0 ? 'CR-001' : 'CR-003') : undefined,
    assignedCraneName: assignStatus === 'Assigned' ? (id % 2 === 0 ? 'Liebherr LTM 1300' : 'Tadano GR-1000XL') : undefined,
    plant: i % 2 === 0 ? 'Phra Khanong' : 'Sriracha',
    description: DESCRIPTIONS[id % DESCRIPTIONS.length],
    type: JOB_TYPES[id % JOB_TYPES.length],
    dateFrom,
    status,
    progress: status === 'In Progress' ? randomStatus * 25 : (status === 'Completed' ? 100 : undefined),
    inProgressChecklist: status === 'In Progress' ? {
      step1: randomStatus >= 1,
      step2: randomStatus >= 2,
      step3: randomStatus >= 3,
      step4: randomStatus >= 4
    } : undefined,
    contractor: CONTRACTORS[id % CONTRACTORS.length],
    x: posX,
    y: posY,
    isArea: id % 5 === 0,
    width: 6 + (id % 8),
    height: 4 + (id % 6),
    rotation: ((id % 40) - 20),
    attachments: id === 1 ? [
      {
        id: 'att-init-1',
        name: 'Lifting_Plan_Manhole_3_Approved.pdf',
        size: 2150000,
        type: 'application/pdf',
        category: 'Lifting Plan',
        url: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
        uploadedAt: '2026-09-24T08:30:00Z',
        uploadedBy: 'Safety Officer'
      }
    ] : undefined
  };
});

const mockAreas = [
  { id: 'area-req-1', x: 20, y: 35, w: 15, h: 12, label: 'Lifting Area Alpha', status: 'Approved', color: 'green', jobNo: 'ICM-2600001' },
  { id: 'area-req-2', x: 75, y: 20, w: 10, h: 10, label: 'Excavation 04', status: 'In Progress', color: 'blue', jobNo: 'ICM-2600042' },
  { id: 'area-req-3', x: 45, y: 65, w: 18, h: 8, label: 'Material Staging', status: 'Requested', color: 'gray', jobNo: 'ICM-2600085' },
];

export default function RequestList({ 
  isScaffolding = false, 
  setActiveView,
  globalPlantFilter = 'All'
}: { 
  isScaffolding?: boolean; 
  setActiveView?: (view: string) => void;
  globalPlantFilter?: 'All' | 'Phra Khanong' | 'Sriracha';
}) {
  const { isTh } = useLanguage();
  const { events } = usePlantTurnShared();
  const [viewMode, setViewMode] = useState<'table' | 'plan' | 'calendar'>('table');
  const [searchTerm, setSearchTerm] = useState('');
  const [jobs, setJobs] = useState<JobRequest[]>(() => {
    const custom = getAllCraneJobs();
    const customIds = new Set(custom.map(c => String(c.id)));
    const filteredInitial = INITIAL_JOBS.filter(j => !customIds.has(String(j.id)));
    return [...(custom as any), ...filteredInitial];
  });

  useEffect(() => {
    const unsubscribe = subscribeToCraneOperations((updatedCustom) => {
      setJobs(prev => {
        const customIds = new Set(updatedCustom.map(c => String(c.id)));
        const nonCustom = prev.filter(p => !customIds.has(String(p.id)));
        return [...(updatedCustom as any), ...nonCustom];
      });
    });
    return unsubscribe;
  }, []);

  // Listen to navigation context (e.g. from PlotPlan, Calendar, CraneMaster)
  useEffect(() => {
    const nav = getActiveCraneNavContext();
    if (nav?.jobId && jobs.length > 0) {
      const match = jobs.find(j => String(j.id) === String(nav.jobId) || j.jobNo === String(nav.jobId));
      if (match) {
        openDetailDrawer(match);
        clearActiveCraneNavContext();
      }
    }
  }, [jobs]);

  // Filter states
  const [filters, setFilters] = useState({
    dateFrom: '2026-09-01',
    dateEnd: '2026-12-31',
    jobType: 'All',
    contractor: 'All',
    mcType: 'All',
    status: 'All',
    requestType: 'All',
    assignmentStatus: 'All',
    eventName: 'All',
    woNo: ''
  });

  // Modals & Drawer State
  const [selectedDetailJob, setSelectedDetailJob] = useState<UnifiedCraneJob | null>(null);
  const [selectedPlotPlanJob, setSelectedPlotPlanJob] = useState<JobRequest | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [showColumnConfig, setShowColumnConfig] = useState(false);
  const [visibleColumns, setVisibleColumns] = useState({
    requestNo: true,
    jobNo: true,
    woNumber: true,
    plantUnit: true,
    requestType: true,
    equipmentType: true,
    grossLoad: true,
    radius: true,
    plannedWindow: true,
    contractor: true,
    assignedCrane: true,
    requestStatus: true,
    assignmentStatus: true,
    actions: true
  });

  const openDetailDrawer = (job: JobRequest) => {
    const allOps = getAllCraneJobs();
    const found = allOps.find(o => o.id === job.id || o.jobNo === job.jobNo || (job.requestNo && o.requestNo === job.requestNo));
    if (found) {
      setSelectedDetailJob(found);
    } else {
      const unified: UnifiedCraneJob = {
        id: job.id,
        requestNo: job.requestNo || `REQ-CR26-${String(job.id).padStart(4, '0')}`,
        jobNo: job.jobNo,
        title: job.description,
        plant: (job.plant === 'BCP' ? 'Phra Khanong (PK)' : job.plant) as any,
        unit: job.unit || '11-APS1',
        requestType: job.requestType || 'CR01',
        requestStatus: (job.requestStatus || (job.status === 'Requested' ? 'Submitted' : job.status as any)) as any,
        assignmentStatus: (job.assignmentStatus || (job.assignedCraneId ? 'Assigned' : 'Unassigned')) as any,
        equipmentType: job.equipmentType || 'Mobile Crane',
        loadDescription: job.description,
        loadWeightTon: job.loadWeightTon || 15,
        riggingWeightTon: job.riggingWeightTon || 2,
        grossLoadTon: job.grossLoadTon || ((job.loadWeightTon || 15) + (job.riggingWeightTon || 2)),
        workingRadiusM: job.workingRadiusM || 18,
        requiredHookHeightM: job.requiredHookHeightM || 25,
        assignedCraneId: job.assignedCraneId,
        assignedCraneName: job.assignedCraneName,
        requester: 'Crane Job Coordinator',
        department: 'Maintenance & Turnaround',
        contractor: job.contractor,
        scheduledDate: (job.dateFrom || (job as any).date || '2026-09-27').split(' ')[0],
        scheduledStartTime: '08:00',
        scheduledEndTime: '17:00',
        status: (job.status || 'Requested') as any,
        progress: job.progress || 0,
        executionChecklist: {
          riggingTackle: { done: false },
          outriggerPads: { done: false },
          liftExecution: { done: false },
          siteDemobilization: { done: false }
        },
        statusHistory: [
          {
            timestamp: new Date().toISOString(),
            changedBy: 'System Auto-Seed',
            status: (job.requestStatus || 'Submitted') as any,
            reason: 'Initial register'
          }
        ]
      };
      setSelectedDetailJob(unified);
    }
  };

  const [currentPage, setCurrentPage] = useState(1);
  const [selectedRequest, setSelectedRequest] = useState<JobRequest | null>(null);
  const [checklist, setChecklist] = useState({
    safetyBriefing: false,
    siteInspection: false,
    equipmentCheck: false,
    permitVerified: false
  });
  const [sortConfig, setSortConfig] = useState<{ key: keyof JobRequest; direction: 'asc' | 'desc' } | null>(null);
  const [confirmDialog, setConfirmDialog] = useState<{ id: number; status: string; jobNo: string } | null>(null);
  const [tempComment, setTempComment] = useState('');
  const itemsPerPage = 10;

  // --- Plot Plan Canvas Controls & State (Linked with Global Theme Gate) ---
  const [gateIsDark, setGlobalThemeGate] = useThemeGate();
  const [blueprintTheme, setBlueprintTheme] = useState<'dark' | 'light'>(() => gateIsDark ? 'dark' : 'light');
  useEffect(() => {
    setBlueprintTheme(gateIsDark ? 'dark' : 'light');
  }, [gateIsDark]);
  const [zoomLevel, setZoomLevel] = useState<number>(100);
  const [panOffset, setPanOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState<boolean>(false);
  const isDraggingRef = useRef<boolean>(false);
  const dragDistanceRef = useRef<number>(0);
  const panStartRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  const [hoveredJobId, setHoveredJobId] = useState<number | null>(null);
  const [selectedMapJob, setSelectedMapJob] = useState<JobRequest | null>(null);
  const [showSafetyRadius, setShowSafetyRadius] = useState<boolean>(true);
  const [showOutriggers, setShowOutriggers] = useState<boolean>(true);
  const canvasContainerRef = useRef<HTMLDivElement>(null);

  const isDarkMode = blueprintTheme === 'dark';

  // Pan boundary clamp to lock image so no black borders appear on zoom-out or panning
  const clampPan = (x: number, y: number, zoom: number) => {
    const scale = zoom / 100;
    if (scale <= 1) return { x: 0, y: 0 };
    const rect = canvasContainerRef.current?.getBoundingClientRect();
    const w = rect ? rect.width : 1000;
    const h = rect ? rect.height : 660;
    const maxPanX = ((scale - 1) * w) / 2;
    const maxPanY = ((scale - 1) * h) / 2;
    return {
      x: Math.max(-maxPanX, Math.min(maxPanX, x)),
      y: Math.max(-maxPanY, Math.min(maxPanY, y))
    };
  };

  const handleZoomChange = (newZoom: number) => {
    const clampedZoom = Math.max(100, Math.min(400, newZoom));
    setZoomLevel(clampedZoom);
    setPanOffset(prev => clampPan(prev.x, prev.y, clampedZoom));
  };

  const handleMouseDown = (e: ReactMouseEvent<HTMLDivElement>) => {
    if (e.button !== 0 || zoomLevel <= 100) return;
    setIsPanning(true);
    isDraggingRef.current = true;
    dragDistanceRef.current = 0;
    panStartRef.current = { x: e.clientX - panOffset.x, y: e.clientY - panOffset.y };
  };

  // Global window listeners for drag-to-pan so it never drops or gets locked
  useEffect(() => {
    if (!isPanning) return;

    const handleWindowMouseMove = (e: MouseEvent) => {
      dragDistanceRef.current += Math.hypot(e.movementX, e.movementY);
      setPanOffset(clampPan(
        e.clientX - panStartRef.current.x,
        e.clientY - panStartRef.current.y,
        zoomLevel
      ));
    };

    const handleWindowMouseUp = () => {
      setIsPanning(false);
      setTimeout(() => {
        isDraggingRef.current = false;
      }, 60);
    };

    window.addEventListener('mousemove', handleWindowMouseMove);
    window.addEventListener('mouseup', handleWindowMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleWindowMouseMove);
      window.removeEventListener('mouseup', handleWindowMouseUp);
    };
  }, [isPanning]);

  // Touch pan handlers
  const handleTouchStart = (e: ReactTouchEvent<HTMLDivElement>) => {
    if (e.touches.length === 1 && zoomLevel > 100) {
      setIsPanning(true);
      isDraggingRef.current = true;
      dragDistanceRef.current = 0;
      panStartRef.current = {
        x: e.touches[0].clientX - panOffset.x,
        y: e.touches[0].clientY - panOffset.y
      };
    }
  };

  const handleTouchMove = (e: ReactTouchEvent<HTMLDivElement>) => {
    if (!isPanning || e.touches.length !== 1) return;
    dragDistanceRef.current += 5;
    setPanOffset(clampPan(
      e.touches[0].clientX - panStartRef.current.x,
      e.touches[0].clientY - panStartRef.current.y,
      zoomLevel
    ));
  };

  const handleTouchEnd = () => {
    setIsPanning(false);
    setTimeout(() => {
      isDraggingRef.current = false;
    }, 60);
  };

  // Mouse wheel zoom - locked to min 100% so no black borders appear
  const handleWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (e.deltaY < 0) {
      handleZoomChange(zoomLevel + 20);
    } else {
      handleZoomChange(zoomLevel - 20);
    }
  };

  const handleResetView = () => {
    setZoomLevel(100);
    setPanOffset({ x: 0, y: 0 });
  };

  // Reset to first page when search or filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filters]);

  useEffect(() => {
    if (selectedRequest) {
      setChecklist({
        safetyBriefing: false,
        siteInspection: false,
        equipmentCheck: false,
        permitVerified: false
      });
    }
  }, [selectedRequest?.id]);

  const filteredJobs = useMemo(() => {
    let result = jobs.filter(job => {
      const jobWo = String((job as any).workOrder || (job as any).woNumber || (job as any).workOrderNo || (job.id ? `WO-882${String(job.id).padStart(4, '0')}` : '')).toLowerCase();
      const reqNo = (job.requestNo || `REQ-CR26-${String(job.id).padStart(4, '0')}`).toLowerCase();
      const jobNo = (job.jobNo || '').toLowerCase();
      const eqTag = String((job as any).equipmentTag || (job as any).equipmentId || '').toLowerCase();
      const eqType = String(job.equipmentType || job.type || '').toLowerCase();
      const craneModel = String((job as any).craneModel || (job as any).machineType || '').toLowerCase();
      const plant = String(job.plant || '').toLowerCase();
      const unit = String(job.unit || (job as any).functionalLocation || '').toLowerCase();
      const area = String((job as any).locationArea || (job as any).area || '').toLowerCase();
      const rType = String(job.requestType || '').toLowerCase();
      const contractor = String(job.contractor || '').toLowerCase();
      const reqStatus = String(job.requestStatus || job.status || '').toLowerCase();
      const assignStatus = String(job.assignmentStatus || (job.assignedCraneId ? 'Assigned' : 'Unassigned')).toLowerCase();
      const assignedCrane = String(job.assignedCraneName || job.assignedCraneId || '').toLowerCase();
      const desc = String(job.description || (job as any).title || '').toLowerCase();
      const dateStr = String(job.dateFrom || (job as any).date || '').toLowerCase();
      const grossLoad = String(job.grossLoadTon || (job.loadWeightTon ? job.loadWeightTon + (job.riggingWeightTon || 0) : ''));
      const radius = String(job.workingRadiusM || '');
      const idStr = String(job.id || '');

      const q = searchTerm.toLowerCase().trim();
      const matchSearch = !q ||
                          reqNo.includes(q) ||
                          jobNo.includes(q) || 
                          jobWo.includes(q) ||
                          eqTag.includes(q) ||
                          eqType.includes(q) ||
                          craneModel.includes(q) ||
                          plant.includes(q) ||
                          unit.includes(q) ||
                          area.includes(q) ||
                          rType.includes(q) ||
                          contractor.includes(q) ||
                          reqStatus.includes(q) ||
                          assignStatus.includes(q) ||
                          assignedCrane.includes(q) ||
                          desc.includes(q) ||
                          dateStr.includes(q) ||
                          grossLoad.includes(q) ||
                          radius.includes(q) ||
                          idStr.includes(q);
      
      const filterWo = filters.woNo.toLowerCase().trim();
      const filterWoNumOnly = filterWo.replace(/^(wo|crn|req|icm)[-_]?/i, '');
      const matchWo = !filterWo || 
                      jobWo.includes(filterWo) || 
                      jobNo.includes(filterWo) || 
                      reqNo.includes(filterWo) ||
                      idStr.includes(filterWo) ||
                      (filterWoNumOnly.length > 0 && (
                        jobWo.includes(filterWoNumOnly) || 
                        jobNo.includes(filterWoNumOnly) || 
                        reqNo.includes(filterWoNumOnly) || 
                        idStr.includes(filterWoNumOnly)
                      ));
      
      const matchJobType = filters.jobType === 'All' || 
                           (filters.jobType === 'BCP Job' && (job.plant === 'BCP' || job.plant === 'Phra Khanong')) ||
                           (filters.jobType === 'Contractor Job' && job.plant !== 'BCP');
      
      const matchContractor = filters.contractor === 'All' || job.contractor === filters.contractor;
      const matchMcType = filters.mcType === 'All' || 
                          eqType.includes(filters.mcType.toLowerCase()) || 
                          craneModel.includes(filters.mcType.toLowerCase()) ||
                          (job.type && job.type.toLowerCase().includes(filters.mcType.toLowerCase()));
      const matchStatus = filters.status === 'All' || 
                          job.status === filters.status || 
                          (job.requestStatus && job.requestStatus === filters.status) ||
                          (filters.status === 'Submitted' && (job.status === 'Requested' || job.status === 'Submitted')) ||
                          (filters.status === 'Under Review' && (job.status === 'Pending' || job.status === 'Under Review'));
      const matchRequestType = filters.requestType === 'All' || job.requestType === filters.requestType;
      const matchAssignment = filters.assignmentStatus === 'All' || job.assignmentStatus === filters.assignmentStatus;
      const matchEvent = filters.eventName === 'All' || (job.eventName || 'Annual Turnaround 2026') === filters.eventName;
      
      const jobDate = (job.dateFrom || (job as any).date || (job as any).workStartDate || '2026-10-15').split(' ')[0];
      const matchDate = (!filters.dateFrom || jobDate >= filters.dateFrom) && 
                        (!filters.dateEnd || jobDate <= filters.dateEnd);

      // Global Plant filter from Top Bar
      if (globalPlantFilter && globalPlantFilter !== 'All') {
        if (job.plant !== globalPlantFilter) return false;
      }

      return matchSearch && matchWo && matchJobType && matchContractor && matchMcType && matchStatus && matchRequestType && matchAssignment && matchEvent && matchDate;
    });

    if (sortConfig !== null) {
      result.sort((a, b) => {
        const aValue = a[sortConfig.key];
        const bValue = b[sortConfig.key];
        
        if (aValue === undefined) return 1;
        if (bValue === undefined) return -1;
        
        if (aValue < bValue) {
          return sortConfig.direction === 'asc' ? -1 : 1;
        }
        if (aValue > bValue) {
          return sortConfig.direction === 'asc' ? 1 : -1;
        }
        return 0;
      });
    }

    return result;
  }, [searchTerm, filters, sortConfig, jobs]);

  const handleExportExcel = () => {
    const exportData = filteredJobs.map((j, idx) => ({
      'No.': idx + 1,
      'Request No.': j.requestNo || `REQ-CR26-${String(j.id).slice(-4)}`,
      'Job No.': j.jobNo,
      'Plant': j.plant,
      'Unit / Location': `${j.unit || '11-APS1'}`,
      'Request Type': j.requestType || 'CR01',
      'Equipment Type': j.equipmentType || 'Heavy Equipment',
      'Load Description': j.description,
      'Gross Load (Ton)': j.grossLoadTon || (j.loadWeightTon ? (j.loadWeightTon + (j.riggingWeightTon || 0)) : 30),
      'Working Radius (m)': j.workingRadiusM || 20,
      'Planned Start / End': `${j.dateFrom || ''}`,
      'Contractor': j.contractor,
      'Assigned Crane': j.assignedCraneId ? `${j.assignedCraneId} - ${j.assignedCraneName || ''}` : 'Unassigned',
      'Request Status': j.requestStatus || j.status,
      'Assignment Status': j.assignmentStatus || (j.assignedCraneId ? 'Assigned' : 'Unassigned')
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Crane_Requests');
    XLSX.writeFile(wb, `BCP_Crane_Requests_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  const handleUpdateInProgressChecklist = (jobId: number, step: string, checked: boolean) => {
    let updatedStatus = '';
    let updatedProgress = 0;
    let nextChecklist: any = null;

    setJobs(prevJobs => prevJobs.map(job => {
      if (job.id === jobId) {
        const currentChecklist = job.inProgressChecklist || { step1: false, step2: false, step3: false, step4: false };
        const updatedChecklist = { ...currentChecklist, [step]: checked };
        const checkedCount = Object.values(updatedChecklist).filter(Boolean).length;
        const progress = checkedCount * 25;
        const status = progress === 100 ? 'Completed' : (job.status === 'Completed' ? 'In Progress' : job.status);
        updatedStatus = status;
        updatedProgress = progress;
        nextChecklist = updatedChecklist;
        return { ...job, inProgressChecklist: updatedChecklist, progress, status };
      }
      return job;
    }));

    if (nextChecklist) {
      updateCraneJob(jobId, { inProgressChecklist: nextChecklist, progress: updatedProgress, status: updatedStatus as any });
    }

    if (selectedRequest && selectedRequest.id === jobId) {
      setSelectedRequest(prev => {
        if (!prev) return null;
        const currentChecklist = prev.inProgressChecklist || { step1: false, step2: false, step3: false, step4: false };
        const updatedChecklist = { ...currentChecklist, [step]: checked };
        const checkedCount = Object.values(updatedChecklist).filter(Boolean).length;
        const progress = checkedCount * 25;
        const status = progress === 100 ? 'Completed' : (prev.status === 'Completed' ? 'In Progress' : prev.status);
        return { ...prev, inProgressChecklist: updatedChecklist, progress, status };
      });
    }
  };

  const handleUpdateStatus = (jobId: number, status: string, comment?: string) => {
    updateCraneJob(jobId, {
      status: status as any,
      remarks: comment,
      progress: status === 'Completed' ? 100 : status === 'In Progress' ? 25 : 0
    });

    setJobs(prevJobs => prevJobs.map(job => 
      job.id === jobId ? { 
        ...job, 
        status, 
        remarks: comment || job.remarks, 
        progress: status === 'Completed' ? 100 : status === 'In Progress' ? 25 : job.progress,
        inProgressChecklist: status === 'In Progress' ? { step1: false, step2: false, step3: false, step4: false } : job.inProgressChecklist
      } : job
    ));
    if (selectedRequest && selectedRequest.id === jobId) {
      setSelectedRequest(prev => prev ? { 
        ...prev, 
        status, 
        remarks: comment || prev.remarks, 
        progress: status === 'Completed' ? 100 : status === 'In Progress' ? 25 : prev.progress,
        inProgressChecklist: status === 'In Progress' ? { step1: false, step2: false, step3: false, step4: false } : prev.inProgressChecklist
      } : null);
    }
    setConfirmDialog(null);
    setTempComment('');
  };

  const handleSort = (key: keyof JobRequest) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const getSortIcon = (key: keyof JobRequest) => {
    if (!sortConfig || sortConfig.key !== key) {
      return <div className="w-3 h-3 text-gray-300 dark:text-gray-600"><ChevronUp size={12} /></div>;
    }
    return sortConfig.direction === 'asc' ? 
      <ChevronUp size={12} className="text-blue-500" /> : 
      <ChevronDown size={12} className="text-blue-500" />;
  };

  const totalPages = Math.ceil(filteredJobs.length / itemsPerPage);
  const paginatedJobs = filteredJobs.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Completed': return 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800 shadow-[0_0_10px_rgba(16,185,129,0.15)]';
      case 'Approved': return 'bg-teal-100 dark:bg-teal-900/40 text-teal-700 dark:text-teal-300 border-teal-200 dark:border-teal-800/50';
      case 'Rejected': return 'bg-red-100 dark:bg-red-900/40 text-red-600 dark:text-red-400 border-red-200 dark:border-red-800/50';
      case 'Requested': return 'bg-gray-100 dark:bg-slate-800 text-gray-500 dark:text-gray-400 border-gray-200 dark:border-slate-700';
      case 'In Progress': return 'bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-800/50 shadow-[0_0_10px_rgba(59,130,246,0.1)] animate-pulse';
      default: return 'bg-gray-100 dark:bg-slate-800 text-gray-500 dark:text-gray-400 border-gray-200 dark:border-slate-700';
    }
  };

  const stats = useMemo(() => {
    return {
      total: filteredJobs.length,
      pending: filteredJobs.filter(j => j.status === 'Requested' || j.status === 'Pending' || j.requestStatus === 'Submitted').length,
      inProgress: filteredJobs.filter(j => j.status === 'In Progress' || j.status === 'Approved' || j.requestStatus === 'Approved').length,
      completed: filteredJobs.filter(j => j.status === 'Completed').length,
    };
  }, [filteredJobs]);

  return (
    <div className="flex flex-col space-y-6">
      {/* 3.1 Top Action Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100 tracking-tight">
              {isScaffolding ? 'Request for Use Job List' : 'Job List'}
            </h2>
            <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-400 border border-blue-300 dark:border-blue-800 font-mono">
              {isScaffolding ? 'SF02' : 'CR01 – CR06'}
            </span>
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            {isScaffolding 
              ? 'Registry for scaffolding erection and inspection jobs'
              : (isTh ? 'ทะเบียนงานเครนและเครื่องจักรยก พร้อมระบบตรวจสอบความพร้อมและจัดสรร' : 'Central Crane Job & Lifting Equipment Operations Registry')}
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center flex-wrap gap-2">
          {!isScaffolding && (
            <button 
              onClick={() => setIsImportModalOpen(true)}
              className="px-3.5 py-2 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/80 shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <Upload size={14} className="text-slate-500 dark:text-slate-400" />
              <span>Import Requests</span>
            </button>
          )}

          <button 
            onClick={handleExportExcel}
            className="px-3 py-2 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/80 shadow-xs transition-all flex items-center gap-1.5"
            title="Export Excel"
          >
            <Download size={14} className="text-slate-500 dark:text-slate-400" />
            <span className="hidden sm:inline">Export Excel</span>
          </button>

          {/* Column Visibility Toggle */}
          <div className="relative">
            <button 
              onClick={() => setShowColumnConfig(!showColumnConfig)}
              className="px-3 py-2 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/80 shadow-xs transition-all flex items-center gap-1.5"
              title="Configure Columns"
            >
              <SlidersHorizontal size={14} className="text-slate-500 dark:text-slate-400" />
              <span className="hidden sm:inline">Columns</span>
            </button>

            {showColumnConfig && (
              <div className="absolute right-0 mt-2 w-64 p-3 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-2xl shadow-2xl z-50 animate-in fade-in zoom-in-95 duration-150">
                <div className="flex items-center justify-between pb-2 border-b border-gray-100 dark:border-slate-800 mb-2">
                  <span className="text-[11px] font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider">Column Visibility</span>
                  <button 
                    onClick={() => setShowColumnConfig(false)}
                    className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                  >
                    <X size={14} />
                  </button>
                </div>
                <div className="space-y-1.5 max-h-60 overflow-y-auto custom-scrollbar">
                  {[
                    { key: 'requestNo', label: 'Request No.' },
                    { key: 'jobNo', label: 'Job No.' },
                    { key: 'woNumber', label: 'WO Number' },
                    { key: 'plantUnit', label: 'Plant & Unit' },
                    { key: 'requestType', label: 'Request Type (CR)' },
                    { key: 'equipmentType', label: 'Equipment Type' },
                    { key: 'grossLoad', label: 'Gross Load (Ton)' },
                    { key: 'radius', label: 'Working Radius (m)' },
                    { key: 'plannedWindow', label: 'Planned Window' },
                    { key: 'contractor', label: 'Contractor' },
                    { key: 'assignedCrane', label: 'Assigned Crane' },
                    { key: 'requestStatus', label: 'Request Status' },
                    { key: 'assignmentStatus', label: 'Assignment Status' },
                    { key: 'actions', label: 'Actions' },
                  ].map(col => (
                    <label key={col.key} className="flex items-center gap-2 text-xs text-gray-700 dark:text-gray-300 cursor-pointer p-1 rounded hover:bg-gray-50 dark:hover:bg-slate-800">
                      <input 
                        type="checkbox"
                        checked={visibleColumns[col.key as keyof typeof visibleColumns]}
                        onChange={(e) => setVisibleColumns({ ...visibleColumns, [col.key]: e.target.checked })}
                        className="rounded text-emerald-600 focus:ring-emerald-500"
                      />
                      <span>{col.label}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* View Toggle */}
          <div className="bg-slate-100 dark:bg-slate-800 p-1 rounded-xl flex border border-slate-200/80 dark:border-slate-700/80">
            <button 
              type="button"
              onClick={() => setViewMode('table')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${viewMode === 'table' ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs' : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'}`}>
              Table View
            </button>
            <button 
              type="button"
              onClick={() => setViewMode('plan')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${viewMode === 'plan' ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs' : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'}`}>
              Plot Plan View
            </button>
            <button 
              type="button"
              onClick={() => setViewMode('calendar')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${viewMode === 'calendar' ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs' : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'}`}>
              Calendar Schedule
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
          {stats.total} {isTh ? 'งานที่ค้นพบ' : 'results found'}
        </span>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-900 rounded-xl shadow-xs border border-gray-200 dark:border-slate-800 p-4 flex flex-col transition-colors">
          <span className="text-gray-500 dark:text-gray-400 text-[10px] font-bold uppercase tracking-widest italic mb-1">Results Found</span>
          <div className="text-2xl font-bold text-slate-800 dark:text-gray-100">{stats.total}</div>
        </div>
        <div className="bg-white dark:bg-slate-900 rounded-xl shadow-xs border border-gray-200 dark:border-slate-800 p-4 flex flex-col transition-colors">
          <span className="text-gray-500 dark:text-gray-400 text-[10px] font-bold uppercase tracking-widest italic mb-1">Pending</span>
          <div className="text-2xl font-bold text-orange-500 dark:text-orange-400">{stats.pending}</div>
        </div>
        <div className="bg-white dark:bg-slate-900 rounded-xl shadow-xs border border-gray-200 dark:border-slate-800 p-4 flex flex-col transition-colors">
          <span className="text-gray-500 dark:text-gray-400 text-[10px] font-bold uppercase tracking-widest italic mb-1">In Progress</span>
          <div className="text-2xl font-bold text-blue-500 dark:text-blue-400">{stats.inProgress}</div>
        </div>
        <div className="bg-white dark:bg-slate-900 rounded-xl shadow-xs border border-gray-200 dark:border-slate-800 p-4 flex flex-col transition-colors">
          <span className="text-gray-500 dark:text-gray-400 text-[10px] font-bold uppercase tracking-widest italic mb-1">Completed</span>
          <div className="text-2xl font-bold text-emerald-500 dark:text-emerald-400">{stats.completed}</div>
        </div>
      </div>
      
      {/* Search & Advanced Filters */}
      {viewMode !== 'calendar' && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-gray-200 dark:border-slate-800 p-4 transition-colors duration-300">
        <div className="grid grid-cols-2 md:grid-cols-5 lg:grid-cols-10 gap-2.5 items-end">
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-widest flex items-center gap-1">
              <CalendarDays size={11} />
              <span>{isTh ? 'Event / โครงการ' : 'Event / TA'}</span>
            </label>
            <select
              className="w-full bg-indigo-50/60 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-800/70 rounded-lg px-2 py-1.5 text-xs font-semibold text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-colors"
              value={filters.eventName}
              onChange={(e) => setFilters({ ...filters, eventName: e.target.value })}
            >
              <option value="All">{isTh ? 'ทุก Event ทั้งหมด' : 'All Events'}</option>
              {events.map(ev => (
                <option key={ev.id} value={ev.eventName}>
                  {ev.eventName} ({ev.eventCode})
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest flex items-center gap-1">
              <Calendar size={11} className="text-slate-400 dark:text-slate-500" />
              <span>Date From</span>
            </label>
            <input 
              type="date" 
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1.5 text-xs text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors" 
              value={filters.dateFrom}
              onChange={(e) => setFilters({...filters, dateFrom: e.target.value})}
            />
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest flex items-center gap-1">
              <Calendar size={11} className="text-slate-400 dark:text-slate-500" />
              <span>Date End</span>
            </label>
            <input 
              type="date" 
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1.5 text-xs text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors" 
              value={filters.dateEnd}
              onChange={(e) => setFilters({...filters, dateEnd: e.target.value})}
            />
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">Req Type</label>
            <select 
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors"
              value={filters.requestType}
              onChange={(e) => setFilters({...filters, requestType: e.target.value})}
            >
              <option value="All">All CR Types</option>
              <option value="CR01">CR01 General Lift</option>
              <option value="CR02">CR02 Critical Lift</option>
              <option value="CR03">CR03 Heavy Rigging</option>
              <option value="CR04">CR04 Dual Crane</option>
              <option value="CR05">CR05 Confined Space</option>
              <option value="CR06">CR06 Emergency</option>
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">Req Status</label>
            <select 
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors"
              value={filters.status}
              onChange={(e) => setFilters({...filters, status: e.target.value})}
            >
              <option value="All">All Req Statuses</option>
              <option value="Draft">Draft</option>
              <option value="Submitted">Submitted</option>
              <option value="Under Review">Under Review</option>
              <option value="Approved">Approved</option>
              <option value="Rejected">Rejected</option>
              <option value="In Progress">In Progress</option>
              <option value="Completed">Completed</option>
              <option value="Cancelled">Cancelled</option>
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">Assign Status</label>
            <select 
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors"
              value={filters.assignmentStatus}
              onChange={(e) => setFilters({...filters, assignmentStatus: e.target.value})}
            >
              <option value="All">All Assignments</option>
              <option value="Unassigned">Unassigned</option>
              <option value="Proposed">Proposed</option>
              <option value="Assigned">Assigned</option>
              <option value="Released">Released</option>
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">Contractor</label>
            <select 
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors"
              value={filters.contractor}
              onChange={(e) => setFilters({...filters, contractor: e.target.value})}
            >
              <option value="All">All Contractors</option>
              {CONTRACTORS.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">{isScaffolding ? 'Type' : 'Equipment'}</label>
            <select 
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors"
              value={filters.mcType}
              onChange={(e) => setFilters({...filters, mcType: e.target.value})}
            >
              <option value="All">All Types</option>
              {isScaffolding ? (
                <>
                  <option value="Tower Scaffold">Tower Scaffold</option>
                  <option value="Standard Scaffold">Standard Scaffold</option>
                </>
              ) : (
                JOB_TYPES.map(t => <option key={t} value={t}>{t}</option>)
              )}
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">{isTh ? 'กรองเลขที่ (No. / WO)' : 'Filter No. (WO/Job)'}</label>
            <input 
              type="text" 
              placeholder={isTh ? "เลข WO, Job, Req..." : "Filter WO, Job, Req..."} 
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors font-mono"
              value={filters.woNo}
              onChange={(e) => setFilters({...filters, woNo: e.target.value})}
            />
          </div>

          <div className="relative">
            <input 
              type="text" 
              placeholder={isTh ? "ค้นหาข้อมูลทุกคอลัมน์ (Job, WO, Tag, Machine, Status...)" : "Search all columns (Job, WO, Tag, Machine, Status...)"} 
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg pl-8 pr-3 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
          </div>
        </div>

        {/* Clear Filters Action Bar */}
        {(searchTerm || filters.woNo || filters.eventName !== 'All' || filters.requestType !== 'All' || filters.status !== 'All' || filters.assignmentStatus !== 'All' || filters.contractor !== 'All' || filters.mcType !== 'All' || filters.dateFrom !== '2026-09-01' || filters.dateEnd !== '2026-12-31') && (
          <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-xs">
            <span className="text-slate-500 dark:text-slate-400 text-[11px]">
              {isTh 
                ? `กำลังใช้งานตัวกรอง (พบ ${filteredJobs.length} รายการ จากทั้งหมด ${jobs.length} รายการ)` 
                : `Active filter applied (${filteredJobs.length} of ${jobs.length} items shown)`}
            </span>
            <button
              type="button"
              onClick={() => {
                setSearchTerm('');
                setFilters({
                  dateFrom: '2026-09-01',
                  dateEnd: '2026-12-31',
                  jobType: 'All',
                  contractor: 'All',
                  mcType: 'All',
                  status: 'All',
                  requestType: 'All',
                  assignmentStatus: 'All',
                  eventName: 'All',
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
      )}

      {/* 3.2 Data Table Card OR Plot Plan View */}
      {viewMode === 'table' ? (
        <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-gray-200 dark:border-slate-800 flex flex-col overflow-hidden transition-colors duration-300">
          <div className="overflow-x-auto min-h-[420px]">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-gray-50/80 dark:bg-slate-800/60 border-b border-gray-200 dark:border-slate-800 text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  <th className="p-3 text-center">No.</th>
                  {visibleColumns.requestNo && (
                    <th className="p-3 cursor-pointer hover:text-emerald-600 transition-colors" onClick={() => handleSort('jobNo')}>
                      <div className="flex items-center gap-1">Request No. {getSortIcon('jobNo')}</div>
                    </th>
                  )}
                  {visibleColumns.jobNo && (
                    <th className="p-3 cursor-pointer hover:text-emerald-600 transition-colors" onClick={() => handleSort('jobNo')}>
                      <div className="flex items-center gap-1">Job No.</div>
                    </th>
                  )}
                  {visibleColumns.woNumber && (
                    <th className="p-3 cursor-pointer hover:text-emerald-600 transition-colors">
                      <div className="flex items-center gap-1">WO Number</div>
                    </th>
                  )}
                  {visibleColumns.plantUnit && <th className="p-3">Plant & Unit</th>}
                  {visibleColumns.requestType && <th className="p-3 text-center">Req Type</th>}
                  {visibleColumns.equipmentType && <th className="p-3">Equipment</th>}
                  {visibleColumns.grossLoad && <th className="p-3 text-right">Gross Load</th>}
                  {visibleColumns.radius && <th className="p-3 text-right">Radius</th>}
                  {visibleColumns.plannedWindow && (
                    <th className="p-3 cursor-pointer hover:text-emerald-600 transition-colors" onClick={() => handleSort('dateFrom')}>
                      <div className="flex items-center gap-1">Planned Window {getSortIcon('dateFrom')}</div>
                    </th>
                  )}
                  {visibleColumns.contractor && <th className="p-3">Contractor</th>}
                  {visibleColumns.assignedCrane && <th className="p-3">Assigned Crane</th>}
                  {visibleColumns.requestStatus && (
                    <th className="p-3 cursor-pointer hover:text-emerald-600 transition-colors" onClick={() => handleSort('status')}>
                      <div className="flex items-center gap-1">Request Status {getSortIcon('status')}</div>
                    </th>
                  )}
                  {visibleColumns.assignmentStatus && <th className="p-3">Assignment Status</th>}
                  {visibleColumns.actions && <th className="p-3 text-center">Actions</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-slate-800">
                {paginatedJobs.map((job, idx) => {
                  const reqNo = job.requestNo || `REQ-CR26-${String(job.id).padStart(4, '0')}`;
                  const rType = job.requestType || 'CR01';
                  const reqStatus = job.requestStatus || (job.status === 'Requested' ? 'Submitted' : job.status);
                  const assignStatus = job.assignmentStatus || (job.assignedCraneId ? 'Assigned' : 'Unassigned');
                  const grossLoad = job.grossLoadTon || (job.loadWeightTon ? job.loadWeightTon + (job.riggingWeightTon || 0) : 32.5);
                  const radius = job.workingRadiusM || 18.0;

                  return (
                    <tr 
                      key={job.id} 
                      className="hover:bg-emerald-50/20 dark:hover:bg-emerald-950/10 transition-colors group cursor-pointer"
                      onClick={() => openDetailDrawer(job)}
                    >
                      <td className="p-3 text-center font-mono text-gray-400 dark:text-gray-500">
                        {(currentPage - 1) * itemsPerPage + idx + 1}
                      </td>

                      {visibleColumns.requestNo && (
                        <td className="p-3 font-mono font-bold text-emerald-600 dark:text-emerald-400 hover:underline">
                          {reqNo}
                        </td>
                      )}

                      {visibleColumns.jobNo && (
                        <td className="p-3 font-mono text-gray-800 dark:text-gray-200 font-semibold">
                          {job.jobNo}
                        </td>
                      )}

                      {visibleColumns.woNumber && (
                        <td className="p-3 font-mono text-gray-700 dark:text-gray-300">
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                            {(job as any).workOrder || (job as any).woNumber || (job as any).workOrderNo || (job.id ? `WO-882${String(job.id).padStart(4, '0')}` : '-')}
                          </span>
                        </td>
                      )}

                      {visibleColumns.plantUnit && (
                        <td className="p-3">
                          <div className="font-semibold text-gray-800 dark:text-gray-100">{job.plant}</div>
                          <div className="text-[10px] text-gray-500 dark:text-gray-400 font-mono">{job.unit || '11-APS1'}</div>
                        </td>
                      )}

                      {visibleColumns.requestType && (
                        <td className="p-3 text-center">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            rType === 'CR02' || rType === 'CR04' ? 'bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-400 border border-amber-300 dark:border-amber-800' :
                            rType === 'CR06' ? 'bg-red-100 dark:bg-red-950 text-red-700 dark:text-red-400 border border-red-300 dark:border-red-800' :
                            'bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-400 border border-blue-300 dark:border-blue-800'
                          }`}>
                            {rType}
                          </span>
                        </td>
                      )}

                      {visibleColumns.equipmentType && (
                        <td className="p-3 text-gray-700 dark:text-gray-300">
                          {job.equipmentType || job.type}
                        </td>
                      )}

                      {visibleColumns.grossLoad && (
                        <td className="p-3 text-right font-mono font-semibold text-gray-800 dark:text-gray-200">
                          {grossLoad.toFixed(1)} <span className="text-[10px] text-gray-400 font-normal">T</span>
                        </td>
                      )}

                      {visibleColumns.radius && (
                        <td className="p-3 text-right font-mono text-gray-700 dark:text-gray-300">
                          {radius.toFixed(1)} <span className="text-[10px] text-gray-400 font-normal">m</span>
                        </td>
                      )}

                      {visibleColumns.plannedWindow && (
                        <td className="p-3 font-mono text-gray-600 dark:text-gray-400 text-[11px]">
                          {job.dateFrom}
                        </td>
                      )}

                      {visibleColumns.contractor && (
                        <td className="p-3 text-gray-700 dark:text-gray-300 font-medium">
                          {job.contractor}
                        </td>
                      )}

                      {visibleColumns.assignedCrane && (
                        <td className="p-3">
                          {job.assignedCraneId ? (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                navigateToCraneView({ view: 'crane-master', craneId: job.assignedCraneId });
                              }}
                              className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-300/80 dark:border-slate-700 transition-all cursor-pointer shadow-2xs"
                              title={isTh ? `ดูสเปก ${job.assignedCraneId} ใน Crane Master` : `View ${job.assignedCraneId} in Crane Master`}
                            >
                              <Truck size={12} className="text-slate-500 dark:text-slate-400" />
                              <span>{job.assignedCraneId}</span>
                            </button>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-gray-100 dark:bg-slate-800 text-gray-500 dark:text-gray-400 border border-gray-200 dark:border-slate-700">
                              Unassigned
                            </span>
                          )}
                        </td>
                      )}

                      {visibleColumns.requestStatus && (
                        <td className="p-3">
                          <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase border ${
                            reqStatus === 'Approved' ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800/60' :
                            reqStatus === 'Rejected' ? 'bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800/60' :
                            reqStatus === 'Submitted' ? 'bg-sky-50 dark:bg-sky-950/60 text-sky-700 dark:text-sky-300 border-sky-200 dark:border-sky-800/60' :
                            reqStatus === 'Under Review' ? 'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800/60' :
                            reqStatus === 'In Progress' ? 'bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800/60 animate-pulse' :
                            reqStatus === 'Completed' ? 'bg-violet-50 dark:bg-violet-950/60 text-violet-700 dark:text-violet-300 border-violet-200 dark:border-violet-800/60' :
                            'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700'
                          }`}>
                            {reqStatus}
                          </span>
                        </td>
                      )}

                      {visibleColumns.assignmentStatus && (
                        <td className="p-3">
                          <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase border ${
                            assignStatus === 'Assigned' ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800/60' :
                            assignStatus === 'Proposed' ? 'bg-sky-50 dark:bg-sky-950/60 text-sky-700 dark:text-sky-300 border-sky-200 dark:border-sky-800/60' :
                            assignStatus === 'Released' ? 'bg-slate-100 dark:bg-slate-800 text-slate-500 border-slate-200 dark:border-slate-700' :
                            'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800/60'
                          }`}>
                            {assignStatus}
                          </span>
                        </td>
                      )}

                      {visibleColumns.actions && (
                        <td className="p-3 text-center" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center justify-center gap-1.5">
                            {/* Open Detail Modal */}
                            <button 
                              type="button"
                              onClick={() => openDetailDrawer(job)}
                              className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white border border-slate-200/60 dark:border-slate-700/60 transition-colors cursor-pointer"
                              title={isTh ? "เปิดดูรายละเอียดและเช็กลิสต์ (Modal)" : "Open Detail Modal"}
                            >
                              <FileText size={14} />
                            </button>

                            {/* View Plot Plan Modal */}
                            <button
                              type="button"
                              onClick={() => setSelectedPlotPlanJob(job)}
                              className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white border border-slate-200/60 dark:border-slate-700/60 transition-colors cursor-pointer"
                              title={isTh ? "เปิดดูตำแหน่งบนผังยก Plot Plan (Popup Modal)" : "View on Plot Plan (Modal)"}
                            >
                              <MapPin size={14} />
                            </button>

                            {/* Jump to Review Plan & Optimize */}
                            <button
                              type="button"
                              onClick={() => navigateToCraneView({ view: 'optimize', jobId: job.id })}
                              className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white border border-slate-200/60 dark:border-slate-700/60 transition-colors cursor-pointer"
                              title={isTh ? "ตรวจสอบและจัดสรรเครนใน Optimizer" : "Review & Optimize Crane"}
                            >
                              <Sparkles size={14} />
                            </button>

                            {reqStatus === 'Submitted' && (
                              <>
                                <button 
                                  type="button"
                                  onClick={() => setConfirmDialog({ id: job.id, status: 'Approved', jobNo: job.jobNo })}
                                  className="p-1.5 rounded-lg bg-emerald-100 dark:bg-emerald-950 text-emerald-600 hover:bg-emerald-500 hover:text-white transition-colors cursor-pointer"
                                  title="Approve Request"
                                >
                                  <CheckCircle size={14} />
                                </button>
                                <button 
                                  type="button"
                                  onClick={() => setConfirmDialog({ id: job.id, status: 'Rejected', jobNo: job.jobNo })}
                                  className="p-1.5 rounded-lg bg-red-100 dark:bg-red-950 text-red-600 hover:bg-red-500 hover:text-white transition-colors cursor-pointer"
                                  title="Reject Request"
                                >
                                  <XCircle size={14} />
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      )}
                    </tr>
                  );
                })}

                {paginatedJobs.length === 0 && (
                  <tr>
                    <td colSpan={14} className="p-12 text-center text-gray-400 dark:text-gray-500 italic text-xs">
                      No matching crane requests found. Try adjusting your search or filters.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          
          {/* Pagination */}
          {filteredJobs.length > 0 && (
            <div className="p-4 border-t border-gray-100 dark:border-slate-800 flex items-center justify-between bg-gray-50/50 dark:bg-slate-800/30">
              <span className="text-[11px] text-gray-500 dark:text-gray-400 font-medium">
                Showing <span className="text-gray-800 dark:text-gray-100 font-bold">{(currentPage - 1) * itemsPerPage + 1}</span> to <span className="text-gray-800 dark:text-gray-100 font-bold">{Math.min(currentPage * itemsPerPage, filteredJobs.length)}</span> of <span className="text-gray-800 dark:text-gray-100 font-bold">{filteredJobs.length}</span> entries
              </span>
              <div className="flex items-center gap-1">
                <button 
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                  className="p-1 bg-white dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded text-gray-400 hover:text-blue-600 hover:border-blue-200 disabled:opacity-50 disabled:pointer-events-none transition-all shadow-sm"
                >
                  <ChevronLeft size={16} />
                </button>
                <div className="flex items-center gap-1 px-2">
                  <span className="text-xs font-bold text-gray-700 dark:text-gray-200">{currentPage}</span>
                  <span className="text-xs text-gray-400">/</span>
                  <span className="text-xs text-gray-400">{totalPages}</span>
                </div>
                <button 
                  disabled={currentPage === totalPages}
                  onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                  className="p-1 bg-white dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded text-gray-400 hover:text-blue-600 hover:border-blue-200 disabled:opacity-50 disabled:pointer-events-none transition-all shadow-sm"
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          )}
        </div>
      ) : viewMode === 'plan' ? (
        <div className={`flex-1 rounded-2xl shadow-xl border flex flex-col overflow-hidden min-h-[620px] transition-colors duration-300 ${
          isDarkMode 
            ? 'bg-slate-900/90 border-slate-800' 
            : 'bg-white border-slate-200 shadow-slate-200/50'
        }`}>
          {/* Top Plot Plan Control & Filter Status Bar */}
          <div className={`p-3.5 border-b flex flex-wrap items-center justify-between gap-3 shrink-0 ${
            isDarkMode ? 'bg-slate-900/90 border-slate-800' : 'bg-slate-50 border-slate-200'
          }`}>
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-blue-600/10 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold">
                <MapPin size={16} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-slate-100">
                    Request Location Overview • GIS CAD Engineering
                  </h3>
                  <span className="px-2 py-0.5 rounded-full text-[9px] font-mono font-bold bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
                    {Math.min(filteredJobs.length, 30)} Plotted ({filteredJobs.length} Total)
                  </span>
                </div>
                <p className="text-[10px] text-slate-400 dark:text-slate-500">
                  {isScaffolding ? 'Scaffolding Erection & Inspection Spatial Coordination' : 'Heavy Lift Cranes & Material Handling Layout CAD 1:500'}
                </p>
              </div>
            </div>

            {/* Quick Status Bar & Controls */}
            <div className="flex items-center flex-wrap gap-2">
              {/* Status Chips */}
              <div className="hidden lg:flex items-center gap-1.5 mr-2">
                {STATUSES.map(s => (
                  <div 
                    key={s} 
                    className={`flex items-center gap-1 px-2 py-0.5 rounded-md text-[9px] font-bold border ${
                      s === 'Completed' ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20' :
                      s === 'Approved' ? 'bg-teal-500/10 text-teal-600 dark:text-teal-400 border-teal-500/20' : 
                      s === 'Rejected' ? 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20' :
                      s === 'In Progress' ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30' : 
                      'bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/20'
                    }`}
                  >
                    <span className={`w-1.5 h-1.5 rounded-full ${
                      s === 'Completed' ? 'bg-emerald-500' :
                      s === 'Approved' ? 'bg-teal-500' : 
                      s === 'Rejected' ? 'bg-red-500' :
                      s === 'In Progress' ? 'bg-blue-500 animate-pulse' : 'bg-slate-400'
                    }`} />
                    <span>{s}</span>
                  </div>
                ))}
              </div>

              {/* Safety Radius Barricade Radar Toggle */}
              <button
                type="button"
                onClick={() => setShowSafetyRadius(!showSafetyRadius)}
                className={`h-7 px-2.5 rounded-lg text-[10px] font-bold transition-all flex items-center gap-1.5 border ${
                  showSafetyRadius
                    ? 'bg-blue-600 text-white border-blue-500 shadow-sm'
                    : isDarkMode ? 'bg-slate-800 text-slate-300 border-slate-700' : 'bg-white text-slate-700 border-slate-200'
                }`}
                title="Toggle Safety Barricade Radius"
              >
                <Crosshair size={12} />
                <span>Radius {showSafetyRadius ? 'ON' : 'OFF'}</span>
              </button>

              {/* Theme Toggle (Dark Blueprint / Paper CAD) */}
              <button
                type="button"
                onClick={() => {
                  const nextIsDark = blueprintTheme !== 'dark';
                  setBlueprintTheme(nextIsDark ? 'dark' : 'light');
                  setGlobalThemeGate(nextIsDark);
                }}
                className={`h-7 px-2.5 rounded-lg text-[10px] font-bold transition-all flex items-center gap-1.5 border cursor-pointer ${
                  isDarkMode 
                    ? 'bg-slate-800 hover:bg-slate-700 text-cyan-300 border-slate-700' 
                    : 'bg-white hover:bg-slate-100 text-slate-700 border-slate-200'
                }`}
                title="Toggle CAD Theme"
              >
                {isDarkMode ? <Moon size={12} className="text-cyan-400" /> : <Sun size={12} className="text-amber-500" />}
                <span>{isDarkMode ? 'Dark Blueprint' : 'Paper CAD'}</span>
              </button>

              {/* Zoom Controls */}
              <div className={`inline-flex items-center h-7 px-1 rounded-lg border ${
                isDarkMode ? 'bg-slate-950/80 border-slate-800' : 'bg-slate-100 border-slate-200'
              }`}>
                <button
                  type="button"
                  onClick={() => handleZoomChange(zoomLevel - 20)}
                  className="p-1 hover:text-blue-500 transition-colors text-slate-400 cursor-pointer"
                  title="Zoom Out (ขยายออก - ล็อคขนาดรูปไม่ให้มีขอบดำ)"
                >
                  <ZoomOut size={12} />
                </button>
                <span className="text-[10px] font-mono font-bold px-1.5 text-blue-600 dark:text-cyan-400 min-w-[34px] text-center">
                  {zoomLevel}%
                </span>
                <button
                  type="button"
                  onClick={() => handleZoomChange(zoomLevel + 20)}
                  className="p-1 hover:text-blue-500 transition-colors text-slate-400 cursor-pointer"
                  title="Zoom In (ซูมเข้าดูรายละเอียด หมุดขยายตามขนาดรูป)"
                >
                  <ZoomIn size={12} />
                </button>
              </div>

              {/* Reset View - 100% */}
              <button
                type="button"
                onClick={handleResetView}
                className={`p-1.5 rounded-lg border text-slate-400 hover:text-blue-500 transition-colors ${
                  isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'
                }`}
                title="Reset Pan & Zoom (100% ล็อคขนาดรูปไม่มีขอบดำ)"
              >
                <RotateCcw size={13} />
              </button>

              {/* Fit Entire Plot Plan View - Locked to 100% */}
              <button
                type="button"
                onClick={handleResetView}
                className={`px-2 py-1 rounded-lg border text-[10px] font-bold transition-colors ${
                  isDarkMode ? 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700' : 'bg-white hover:bg-slate-100 text-slate-700 border-slate-200'
                }`}
                title="Lock Plot Plan to Screen (ล็อคขนาดตามรูปไม่มีขอบดำ)"
              >
                Fit
              </button>
            </div>
          </div>

          {/* Blueprint Canvas Container */}
          <div 
            ref={canvasContainerRef}
            onWheel={handleWheel}
            className={`relative overflow-hidden select-none h-[660px] lg:h-[720px] w-full ${
              isDarkMode ? 'bg-[#070d1e]' : 'bg-[#f4f7fb]'
            }`}
          >
            {/* Floating Compass Indicator */}
            <div className="absolute top-3 left-3 z-30 flex items-center gap-1.5 bg-slate-900/90 text-white backdrop-blur-md px-2.5 py-1 rounded-xl border border-slate-700/80 text-[10px] font-mono shadow-lg">
              <Compass size={13} className="text-amber-400 animate-spin" style={{ animationDuration: '24s' }} />
              <span className="font-black tracking-wider">NORTH ▲</span>
              <span className="text-slate-400 hidden sm:inline">| CAD 1:500</span>
            </div>

            {/* Floating Bottom Left Plant GIS Badge */}
            <div className="absolute bottom-3 left-3 z-30 px-2.5 py-1 rounded-xl bg-slate-900/90 text-white backdrop-blur-md border border-slate-700/80 text-[10px] font-mono shadow-lg flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span className="font-bold">BANGCHAK REFINERY GIS</span>
              <span className="text-slate-400">· {Math.min(filteredJobs.length, 30)} SPOTS</span>
            </div>

            {/* Floating Instructions Pill */}
            <div className="hidden md:flex absolute bottom-3 right-3 z-30 px-3 py-1 rounded-xl bg-slate-900/80 text-slate-300 backdrop-blur-md border border-slate-700/70 text-[9px] font-mono items-center gap-2">
              <span>Drag to Pan</span>
              <span className="text-slate-500">•</span>
              <span>Scroll to Zoom</span>
              <span className="text-slate-500">•</span>
              <span>Click Marker for Details</span>
            </div>

            {/* Scalable & Pannable Vector CAD Blueprint Canvas */}
            <div
              onMouseDown={handleMouseDown}
              onTouchStart={handleTouchStart}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleTouchEnd}
              onClick={() => {
                if (dragDistanceRef.current > 5) return;
                setSelectedMapJob(null);
              }}
              className="absolute inset-0 cursor-grab active:cursor-grabbing w-full h-full"
              style={{
                transform: `translate(${panOffset.x}px, ${panOffset.y}px) scale(${zoomLevel / 100})`,
                transformOrigin: 'center center',
                transition: isPanning ? 'none' : 'transform 0.15s ease-out'
              }}
            >
              {/* =========================================================================
                  LAYER 0: AUTHENTIC MASTER PLOT PLAN ENGINEERING DRAWING BACKGROUND
                 ========================================================================= */}
              <div className="absolute inset-0 pointer-events-none select-none overflow-hidden flex items-center justify-center">
                <img 
                  src={essoPlotPlanBg} 
                  alt="Esso Sriracha Refinery Master Plot Plan" 
                  className={`w-full h-full object-cover transition-all duration-300 pointer-events-none select-none ${
                    isDarkMode 
                      ? 'filter invert hue-rotate-180 brightness-[0.78] contrast-[1.25] opacity-60' 
                      : 'opacity-85 mix-blend-multiply'
                  }`}
                />
              </div>

              {/* Engineering Grid & Radar Definitions */}
              <svg className="absolute inset-0 w-full h-full pointer-events-none" xmlns="http://www.w3.org/2000/svg">
                <defs>
                  <pattern id="cadGridSmallReq" width="20" height="20" patternUnits="userSpaceOnUse">
                    <path 
                      d="M 20 0 L 0 0 0 20" 
                      fill="none" 
                      stroke={isDarkMode ? 'rgba(56, 189, 248, 0.05)' : 'rgba(100, 116, 139, 0.08)'} 
                      strokeWidth="0.8" 
                    />
                  </pattern>
                  <pattern id="cadGridLargeReq" width="100" height="100" patternUnits="userSpaceOnUse">
                    <rect width="100" height="100" fill="url(#cadGridSmallReq)" />
                    <path 
                      d="M 100 0 L 0 0 0 100" 
                      fill="none" 
                      stroke={isDarkMode ? 'rgba(56, 189, 248, 0.12)' : 'rgba(100, 116, 139, 0.15)'} 
                      strokeWidth="1.2" 
                    />
                  </pattern>

                  <radialGradient id="reqRadarGlowActive" cx="50%" cy="50%" r="50%">
                    <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.35" />
                    <stop offset="70%" stopColor="#3b82f6" stopOpacity="0.12" />
                    <stop offset="100%" stopColor="#3b82f6" stopOpacity="0" />
                  </radialGradient>
                  <radialGradient id="reqRadarGlowApproved" cx="50%" cy="50%" r="50%">
                    <stop offset="0%" stopColor="#10b981" stopOpacity="0.32" />
                    <stop offset="70%" stopColor="#10b981" stopOpacity="0.10" />
                    <stop offset="100%" stopColor="#10b981" stopOpacity="0" />
                  </radialGradient>
                  <radialGradient id="reqRadarGlowNormal" cx="50%" cy="50%" r="50%">
                    <stop offset="0%" stopColor="#64748b" stopOpacity="0.25" />
                    <stop offset="70%" stopColor="#64748b" stopOpacity="0.08" />
                    <stop offset="100%" stopColor="#64748b" stopOpacity="0" />
                  </radialGradient>
                </defs>

                {/* Background CAD Grid Overlay */}
                <rect width="100%" height="100%" fill="url(#cadGridLargeReq)" />
              </svg>

              {/* Plant Functional Zones Outlines */}
              <div className="absolute top-[16%] left-[28%] w-[30%] h-[34%] rounded-xl border border-dashed border-emerald-500/40 bg-emerald-500/5 pointer-events-none p-2 flex flex-col justify-between">
                <span className="text-[9px] font-mono font-bold text-emerald-600 dark:text-emerald-400">AREA 01: CDU-1 &amp; HEAT EXCHANGERS</span>
                <span className="text-[8px] font-mono text-emerald-500/60 self-end">11-C-101 / 11-E-101</span>
              </div>
              <div className="absolute top-[16%] left-[60%] w-[30%] h-[34%] rounded-xl border border-dashed border-orange-500/40 bg-orange-500/5 pointer-events-none p-2 flex flex-col justify-between">
                <span className="text-[9px] font-mono font-bold text-orange-600 dark:text-orange-400">AREA 02: FURNACES &amp; STACK BAY</span>
                <span className="text-[8px] font-mono text-orange-500/60 self-end">11-F-101 / 11-F-102</span>
              </div>
              <div className="absolute top-[54%] left-[28%] w-[30%] h-[32%] rounded-xl border border-dashed border-blue-500/40 bg-blue-500/5 pointer-events-none p-2 flex flex-col justify-between">
                <span className="text-[9px] font-mono font-bold text-blue-600 dark:text-blue-400">AREA 03: HYDROTREATER QUAD</span>
                <span className="text-[8px] font-mono text-blue-500/60 self-end">21-R-101 / 21-V-102</span>
              </div>
              <div className="absolute top-[54%] left-[60%] w-[30%] h-[32%] rounded-xl border border-dashed border-purple-500/40 bg-purple-500/5 pointer-events-none p-2 flex flex-col justify-between">
                <span className="text-[9px] font-mono font-bold text-purple-600 dark:text-purple-400">AREA 04: STORAGE &amp; JETTY LOGISTICS</span>
                <span className="text-[8px] font-mono text-purple-500/60 self-end">TK-101 ~ 106</span>
              </div>

              {/* =========================================================================
                  LAYER 1: WORKING RADIUS / SAFETY BARRICADE SWING CIRCLES
                 ========================================================================= */}
              {showSafetyRadius && filteredJobs.slice(0, 30).map(job => {
                const isHovered = hoveredJobId === job.id;
                const isSelected = selectedMapJob?.id === job.id;
                const isFocused = isHovered || isSelected;
                const hasFocus = !!hoveredJobId || !!selectedMapJob;
                const opacity = hasFocus ? (isFocused ? 1 : 0.2) : 0.85;

                const radiusMeter = job.isArea ? 28 : (job.type.includes('Tower') ? 35 : job.type.includes('Mobile') ? 25 : 18);
                const rPx = radiusMeter * 3.2;

                const strokeColor = job.status === 'Completed' ? '#a855f7' :
                                    job.status === 'Approved' ? '#10b981' :
                                    job.status === 'In Progress' ? '#3b82f6' :
                                    job.status === 'Rejected' ? '#ef4444' : '#64748b';

                return (
                  <div
                    key={`radius-${job.id}`}
                    style={{
                      left: `${job.x}%`,
                      top: `${job.y}%`,
                      width: `${rPx * 2}px`,
                      height: `${rPx * 2}px`,
                      opacity,
                      transition: 'opacity 0.25s ease'
                    }}
                    className="absolute -translate-x-1/2 -translate-y-1/2 rounded-full pointer-events-none z-10 flex items-center justify-center"
                  >
                    <div 
                      className="w-full h-full rounded-full transition-all"
                      style={{
                        background: job.status === 'In Progress'
                          ? 'radial-gradient(circle, rgba(59,130,246,0.28) 0%, rgba(59,130,246,0.08) 70%, transparent 100%)'
                          : job.status === 'Approved'
                          ? 'radial-gradient(circle, rgba(16,185,129,0.22) 0%, rgba(16,185,129,0.06) 70%, transparent 100%)'
                          : 'radial-gradient(circle, rgba(100,116,139,0.18) 0%, rgba(100,116,139,0.05) 70%, transparent 100%)'
                      }}
                    />
                    <div 
                      className={`absolute inset-0 rounded-full border-2 ${
                        isFocused ? 'ring-4 ring-white/50 border-solid animate-pulse' : 'border-dashed'
                      }`}
                      style={{ borderColor: strokeColor }}
                    />
                    {job.status === 'In Progress' && (
                      <div 
                        className="absolute inset-0 rounded-full animate-ping opacity-25"
                        style={{ backgroundColor: strokeColor }}
                      />
                    )}
                    <div 
                      className={`absolute -top-3 left-1/2 -translate-x-1/2 px-1.5 py-0.2 rounded-full text-[8px] font-mono font-bold whitespace-nowrap shadow-md border ${
                        isFocused 
                          ? 'bg-white text-slate-950 border-slate-900 scale-110 z-20' 
                          : 'bg-slate-900/90 text-white border-slate-700'
                      }`}
                    >
                      R = {radiusMeter}m
                    </div>
                  </div>
                );
              })}

              {/* =========================================================================
                  LAYER 2: CRANE OUTRIGGER PADS (ขาช้าง) & PROFESSIONAL MARKER BADGES
                 ========================================================================= */}
              {filteredJobs.slice(0, 30).map((job, idx) => {
                const isHovered = hoveredJobId === job.id;
                const isSelected = selectedMapJob?.id === job.id;
                const isFocused = isHovered || isSelected;
                const hasFocus = !!hoveredJobId || !!selectedMapJob;
                const opacity = hasFocus ? (isFocused ? 1 : 0.35) : 1;

                const statusBg = job.status === 'Completed' ? 'bg-emerald-600 text-white border-emerald-400' :
                                 job.status === 'Approved' ? 'bg-emerald-600 text-white border-emerald-300' :
                                 job.status === 'In Progress' ? 'bg-blue-600 text-white border-blue-300 shadow-blue-500/50' :
                                 job.status === 'Rejected' ? 'bg-red-600 text-white border-red-300' :
                                 'bg-slate-700 text-slate-200 border-slate-500';

                return (
                  <div
                    key={job.id}
                    style={{ 
                      left: `${job.x}%`, 
                      top: `${job.y}%`, 
                      opacity,
                      transform: job.isArea ? `translate(-50%, -50%) rotate(${job.rotation}deg)` : 'translate(-50%, -50%)'
                    }}
                    onMouseEnter={() => setHoveredJobId(job.id)}
                    onMouseLeave={() => setHoveredJobId(null)}
                    onClick={(e) => {
                      e.stopPropagation();
                      if (dragDistanceRef.current > 5) return;
                      setSelectedMapJob(job);
                    }}
                    className={`absolute select-none cursor-pointer transition-all ${
                      isFocused ? 'scale-125 z-40' : 'hover:scale-115 z-20'
                    }`}
                  >
                    {job.isArea ? (
                      /* Area Bounding Zone with Staging Details */
                      <div 
                        className={`border-2 rounded-lg shadow-xl flex flex-col items-center justify-center p-1.5 relative backdrop-blur-xs transition-colors ${
                          job.status === 'Completed' ? 'bg-emerald-500/20 border-emerald-500 text-emerald-600 dark:text-emerald-300' :
                          job.status === 'Approved' ? 'bg-emerald-500/20 border-emerald-500 text-emerald-600 dark:text-emerald-300' :
                          job.status === 'In Progress' ? 'bg-blue-500/25 border-blue-500 text-blue-600 dark:text-blue-300 animate-pulse' :
                          job.status === 'Rejected' ? 'bg-red-500/20 border-red-500 text-red-600 dark:text-red-300' :
                          'bg-slate-600/20 border-slate-500 text-slate-600 dark:text-slate-300'
                        }`}
                        style={{ width: `${Math.max(job.width * 5, 80)}px`, height: `${Math.max(job.height * 4, 45)}px` }}
                      >
                        <div className="flex items-center gap-1">
                          <Building2 size={10} />
                          <span className="text-[8px] font-mono font-bold leading-none">{job.jobNo}</span>
                        </div>
                        <span className="text-[7px] truncate max-w-[70px] mt-0.5 opacity-80">{job.contractor}</span>
                        <div className={`absolute -top-2.5 -left-1 px-1 rounded-full text-[7px] font-bold text-white shadow-sm ${
                          job.status === 'In Progress' ? 'bg-blue-600 animate-bounce' : 'bg-slate-800'
                        }`}>
                          #{idx + 1}
                        </div>
                      </div>
                    ) : (
                      /* Center Crane/Equipment Point Marker */
                      <div className="flex flex-col items-center">
                        {/* 4 Outrigger Steel Pads (ขาช้าง) */}
                        {showOutriggers && (
                          <div className="absolute -inset-2.5 pointer-events-none">
                            <div className="absolute -top-1 -left-1 w-2 h-2 rounded-xs bg-amber-500 border border-amber-300 shadow-sm" />
                            <div className="absolute -top-1 -right-1 w-2 h-2 rounded-xs bg-amber-500 border border-amber-300 shadow-sm" />
                            <div className="absolute -bottom-1 -left-1 w-2 h-2 rounded-xs bg-amber-500 border border-amber-300 shadow-sm" />
                            <div className="absolute -bottom-1 -right-1 w-2 h-2 rounded-xs bg-amber-500 border border-amber-300 shadow-sm" />
                          </div>
                        )}

                        {/* Professional Engineering Badge */}
                        <div className={`px-2 py-1 rounded-xl shadow-xl font-mono text-[9px] font-black flex items-center gap-1 border-2 backdrop-blur-xs ${statusBg}`}>
                          <Truck size={11} className="shrink-0" />
                          <span>{job.jobNo}</span>
                          <span className="bg-black/30 px-1 py-0.2 rounded text-[8px] font-mono font-medium">
                            {(job.type || 'Crane').split(' ')[0]}
                          </span>
                          {job.status === 'In Progress' && (
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-300 animate-ping" />
                          )}
                        </div>

                        {/* Ground Pressure / Shift Tooltip on Hover */}
                        {isFocused && (
                          <div className="mt-1 px-2 py-0.5 rounded-md bg-slate-950/95 text-cyan-300 border border-cyan-500/40 text-[8px] font-mono whitespace-nowrap shadow-xl flex items-center gap-1.5 z-50">
                            <Gauge size={9} className="text-amber-400" />
                            <span>185 kPa</span>
                            <span className="text-slate-500">|</span>
                            <span>{job.contractor}</span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* =========================================================================
                FLOATING TELEMETRY QUICK-CARD (Slide-Over Inspection Card on Map Click)
               ========================================================================= */}
            {selectedMapJob && (
              <div className={`absolute top-4 right-4 w-[340px] z-50 p-4 rounded-2xl border shadow-2xl animate-in slide-in-from-right-4 duration-200 backdrop-blur-md space-y-3 ${
                isDarkMode 
                  ? 'bg-slate-900/95 border-slate-700 text-white shadow-cyan-950/40' 
                  : 'bg-white/95 border-slate-200 text-slate-900 shadow-xl'
              }`}>
                {/* Header Strip */}
                <div className="flex items-center justify-between border-b pb-2.5 dark:border-slate-800">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-lg bg-blue-500/10 text-blue-500">
                      <FileText size={16} />
                    </div>
                    <div>
                      <div className="text-xs font-mono font-black">{selectedMapJob.jobNo}</div>
                      <div className="text-[10px] text-slate-400 dark:text-slate-500">{selectedMapJob.plant}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase border ${getStatusColor(selectedMapJob.status)}`}>
                      {selectedMapJob.status}
                    </span>
                    <button
                      type="button"
                      onClick={() => setSelectedMapJob(null)}
                      className="p-1 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition-colors"
                    >
                      <X size={14} />
                    </button>
                  </div>
                </div>

                {/* Telemetry Detail Grid */}
                <div className="grid grid-cols-2 gap-2 text-[10px]">
                  <div className="p-2 rounded-lg bg-slate-50 dark:bg-slate-950/60 border border-slate-100 dark:border-slate-800">
                    <span className="text-[9px] text-slate-400 font-bold uppercase">Contractor</span>
                    <div className="font-bold text-slate-700 dark:text-slate-200 truncate">{selectedMapJob.contractor}</div>
                  </div>
                  <div className="p-2 rounded-lg bg-slate-50 dark:bg-slate-950/60 border border-slate-100 dark:border-slate-800">
                    <span className="text-[9px] text-slate-400 font-bold uppercase">M/C Type</span>
                    <div className="font-bold text-slate-700 dark:text-slate-200 truncate">{selectedMapJob.type}</div>
                  </div>
                  <div className="p-2 rounded-lg bg-slate-50 dark:bg-slate-950/60 border border-slate-100 dark:border-slate-800">
                    <span className="text-[9px] text-slate-400 font-bold uppercase">Start Date</span>
                    <div className="font-bold text-slate-700 dark:text-slate-200 truncate">{selectedMapJob.dateFrom}</div>
                  </div>
                  <div className="p-2 rounded-lg bg-slate-50 dark:bg-slate-950/60 border border-slate-100 dark:border-slate-800">
                    <span className="text-[9px] text-slate-400 font-bold uppercase">Safety Zone</span>
                    <div className="font-bold text-emerald-600 dark:text-emerald-400 truncate">R = {selectedMapJob.isArea ? '28m' : '25m'} Barricade</div>
                  </div>
                </div>

                {/* Description */}
                <div className="text-[10px] text-slate-600 dark:text-slate-400 p-2 rounded-lg bg-slate-50/50 dark:bg-slate-950/40 border border-slate-100 dark:border-slate-800 line-clamp-2">
                  <span className="font-bold text-slate-700 dark:text-slate-300">Desc: </span>
                  {selectedMapJob.description}
                </div>

                {/* Progress bar if In Progress */}
                {selectedMapJob.status === 'In Progress' && selectedMapJob.progress !== undefined && (
                  <div className="space-y-1">
                    <div className="flex justify-between text-[9px] font-bold text-blue-500">
                      <span>LIFT PROGRESS</span>
                      <span>{selectedMapJob.progress}%</span>
                    </div>
                    <div className="w-full bg-blue-100 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
                      <div className="bg-blue-500 h-full rounded-full" style={{ width: `${selectedMapJob.progress}%` }} />
                    </div>
                  </div>
                )}

                {/* Actions */}
                <div className="flex items-center gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedRequest(selectedMapJob);
                      setSelectedMapJob(null);
                    }}
                    className="flex-1 py-1.5 px-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 shadow-md shadow-blue-600/30"
                  >
                    <ExternalLink size={12} />
                    <span>View Full Detail</span>
                  </button>

                  {selectedMapJob.status === 'Requested' && (
                    <>
                      <button
                        type="button"
                        onClick={() => {
                          setConfirmDialog({ id: selectedMapJob.id, status: 'Approved', jobNo: selectedMapJob.jobNo });
                          setSelectedMapJob(null);
                        }}
                        className="p-1.5 bg-emerald-500/10 text-emerald-600 hover:bg-emerald-600 hover:text-white rounded-xl transition-all border border-emerald-500/20"
                        title="Approve Request"
                      >
                        <CheckCircle size={15} />
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setConfirmDialog({ id: selectedMapJob.id, status: 'Rejected', jobNo: selectedMapJob.jobNo });
                          setSelectedMapJob(null);
                        }}
                        className="p-1.5 bg-rose-500/10 text-rose-600 hover:bg-rose-600 hover:text-white rounded-xl transition-all border border-rose-500/20"
                        title="Reject Request"
                      >
                        <XCircle size={15} />
                      </button>
                    </>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-gray-200 dark:border-slate-800 p-3 sm:p-5 transition-colors duration-300">
          <CalendarView isScaffolding={isScaffolding} setActiveView={setActiveView} />
        </div>
      )}

      {/* --- Detail Modal --- */}
      {selectedRequest && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-300">
          <div 
            className="bg-white dark:bg-slate-900 w-full max-w-2xl max-h-[90vh] flex flex-col rounded-3xl shadow-2xl border border-gray-100 dark:border-slate-800 overflow-hidden animate-in zoom-in-95 duration-300"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="p-4 sm:p-6 border-b border-gray-100 dark:border-slate-800 flex items-center justify-between bg-gray-50/50 dark:bg-slate-800/50 shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-blue-500/10 flex items-center justify-center text-blue-600 dark:text-blue-400 shrink-0">
                  <FileText size={20} />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-800 dark:text-gray-100 tracking-tight">Request Use Detail</h3>
                  <p className="text-[10px] text-gray-400 font-mono uppercase tracking-widest">{selectedRequest.jobNo} / SEC_{isScaffolding ? 'SF02' : 'CR02'}_DETAIL</p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="p-1 bg-white dark:bg-white rounded border border-gray-200 dark:border-slate-600 shadow-sm shrink-0">
                  <QRCodeSVG 
                    value={`SEC-${selectedRequest.jobNo}-DETAIL`}
                    size={40}
                    fgColor="#000000"
                    bgColor="#ffffff"
                    level="L"
                  />
                </div>
                <button 
                  onClick={() => setSelectedRequest(null)}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-full text-gray-400 dark:text-gray-500 transition-colors shrink-0"
                >
                  <X size={20} />
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
                    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[10px] font-bold uppercase border ${getStatusColor(selectedRequest.status)}`}>
                      {selectedRequest.status === 'In Progress' && <Clock size={10} className="animate-spin-slow" />}
                      {selectedRequest.status}
                    </span>
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-tighter italic">Schedule Start</label>
                  <div className="flex items-center gap-1.5 text-xs font-bold text-gray-700 dark:text-gray-200">
                    <CalendarDays size={14} className="text-gray-400" />
                    <span>{selectedRequest.dateFrom}</span>
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-tighter italic">{isScaffolding ? 'Type' : 'M/C Type'}</label>
                  <div className="flex items-center gap-1.5 text-xs font-bold text-gray-700 dark:text-gray-200">
                    <Truck size={14} className="text-gray-400" />
                    <span>{isScaffolding && selectedRequest.type.includes('Crane') ? 'Tower Scaffold' : selectedRequest.type}</span>
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-tighter italic">Coordinates</label>
                  <div className="flex items-center gap-1.5 text-xs font-bold text-gray-700 dark:text-gray-200">
                    <MapPin size={14} className="text-gray-400" />
                    <span className="font-mono">{selectedRequest.x.toFixed(1)}%, {selectedRequest.y.toFixed(1)}%</span>
                  </div>
                </div>
              </div>

              {/* Progress Section */}
              {(selectedRequest.status === 'In Progress' || selectedRequest.status === 'Completed') && selectedRequest.progress !== undefined && (
                <div className={`p-4 ${selectedRequest.status === 'Completed' ? 'bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-100 dark:border-emerald-800/40' : 'bg-blue-50/50 dark:bg-blue-900/10 border-blue-100 dark:border-blue-800/30'} border rounded-2xl space-y-4`}>
                  <div className="flex items-center justify-between">
                    <span className={`text-[10px] font-bold ${selectedRequest.status === 'Completed' ? 'text-emerald-600 dark:text-emerald-400' : 'text-blue-600 dark:text-blue-400'} uppercase tracking-widest flex items-center gap-2`}>
                      <div className={`w-2 h-2 rounded-full ${selectedRequest.status === 'Completed' ? 'bg-emerald-500' : 'bg-blue-500 animate-ping'}`} />
                      {selectedRequest.status === 'Completed' ? 'Job Completed' : 'Live Progress Monitoring'}
                    </span>
                    <span className={`text-xs font-mono font-bold ${selectedRequest.status === 'Completed' ? 'text-emerald-700 dark:text-emerald-300' : 'text-blue-700 dark:text-blue-300'}`}>{selectedRequest.progress}%</span>
                  </div>
                  
                  <div className="space-y-4">
                    <div className="w-full bg-white dark:bg-slate-800 rounded-full h-2.5 overflow-hidden shadow-inner font-mono relative">
                      <div 
                        className={`${selectedRequest.status === 'Completed' ? 'bg-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.5)]' : 'bg-blue-500 shadow-[0_0_15px_rgba(59,130,246,0.6)]'} h-full rounded-full transition-all duration-300 relative`} 
                        style={{ width: `${selectedRequest.progress}%` }}
                      >
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent animate-shimmer" />
                      </div>
                    </div>
                    
                    <div className={`flex flex-col space-y-3 pt-3 mt-3 border-t ${selectedRequest.status === 'Completed' ? 'border-emerald-100 dark:border-emerald-900/50' : 'border-blue-100 dark:border-blue-900/50'}`}>
                       <label className="text-[10px] font-bold text-gray-800 dark:text-gray-200 uppercase tracking-wider flex items-center justify-between">
                         <span>Update Progress</span>
                         <span className={selectedRequest.status === 'Completed' ? 'text-emerald-500' : 'text-blue-500'}>{selectedRequest.progress}%</span>
                       </label>
                       {selectedRequest.inProgressChecklist && [
                         { id: 'step1', label: '1. Initial Preparation' },
                         { id: 'step2', label: '2. Core Operations / Construction' },
                         { id: 'step3', label: '3. Quality Check & Testing' },
                         { id: 'step4', label: '4. Final Inspection & Handover' }
                       ].map(step => (
                         <label key={step.id} className={`flex items-center gap-3 p-2 bg-white/50 dark:bg-slate-800/50 border ${selectedRequest.status === 'Completed' ? 'border-emerald-100 dark:border-emerald-800/40' : 'border-blue-100 dark:border-blue-800/30'} rounded-lg cursor-pointer hover:bg-white dark:hover:bg-slate-800 transition-colors`}>
                           <input 
                             type="checkbox" 
                             className={`w-4 h-4 rounded ${selectedRequest.status === 'Completed' ? 'border-emerald-300 text-emerald-600 focus:ring-emerald-500' : 'border-blue-300 text-blue-600 focus:ring-blue-500'} bg-white dark:bg-slate-900`}
                             checked={selectedRequest.inProgressChecklist![step.id as keyof typeof selectedRequest.inProgressChecklist]}
                             onChange={(e) => handleUpdateInProgressChecklist(selectedRequest.id, step.id, e.target.checked)}
                           />
                           <span className="text-xs font-medium text-gray-700 dark:text-gray-300">{step.label}</span>
                         </label>
                       ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Detailed Specs Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-4">
                <div className="space-y-4">
                  <div className="flex items-center gap-2 pb-2 border-b border-gray-100 dark:border-slate-800">
                    <User size={16} className="text-blue-500" />
                    <h4 className="text-xs font-bold text-gray-800 dark:text-gray-200 uppercase tracking-wider">Stakeholder Data</h4>
                  </div>
                  <div className="grid grid-cols-1 gap-4">
                    <div>
                      <p className="text-[9px] font-bold text-gray-400 uppercase">Contracting Entity</p>
                      <p className="text-xs font-medium text-gray-700 dark:text-gray-300">{selectedRequest.contractor}</p>
                    </div>
                    <div>
                      <p className="text-[9px] font-bold text-gray-400 uppercase">Operational Plant</p>
                      <p className="text-xs font-medium text-gray-700 dark:text-gray-300">{selectedRequest.plant}</p>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center gap-2 pb-2 border-b border-gray-100 dark:border-slate-800">
                    <Maximize2 size={16} className="text-blue-500" />
                    <h4 className="text-xs font-bold text-gray-800 dark:text-gray-200 uppercase tracking-wider">Map Attributes</h4>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-[9px] font-bold text-gray-400 uppercase">Marking Form</p>
                      <p className="text-xs font-medium text-gray-700 dark:text-gray-300">{selectedRequest.isArea ? 'Square Area' : 'Point Pin'}</p>
                    </div>
                    {selectedRequest.isArea && (
                      <div>
                        <p className="text-[9px] font-bold text-gray-400 uppercase">Scale / Rotation</p>
                        <p className="text-xs font-medium text-gray-700 dark:text-gray-300">{selectedRequest.width.toFixed(0)}x{selectedRequest.height.toFixed(0)}m @ {selectedRequest.rotation.toFixed(0)}°</p>
                      </div>
                    )}
                  </div>
                  <div>
                    <p className="text-[9px] font-bold text-gray-400 uppercase mb-1">Work Description</p>
                    <p className="text-xs text-gray-700 dark:text-gray-300 leading-relaxed font-bold bg-slate-50 dark:bg-slate-800/50 p-2 rounded-lg border border-slate-100 dark:border-slate-800">
                      {selectedRequest.description}
                    </p>
                  </div>
                </div>
              </div>

              {/* Remarks Section */}
              <div className="space-y-3 pt-4 border-t border-gray-100 dark:border-slate-800">
                <div className="flex items-center gap-2 pb-1">
                  <FileText size={14} className="text-blue-500" />
                  <h4 className="text-[10px] font-bold text-gray-800 dark:text-gray-200 uppercase tracking-widest">Planner Remarks / Feedback</h4>
                </div>
                {selectedRequest.remarks ? (
                  <div className="p-3 bg-yellow-50/50 dark:bg-yellow-900/10 border border-yellow-200/50 dark:border-yellow-800/30 rounded-xl relative group">
                    <p className="text-xs text-gray-700 dark:text-gray-300 italic">"{selectedRequest.remarks}"</p>
                    <div className="mt-2 flex items-center justify-between">
                      <span className="text-[8px] font-bold text-gray-400 uppercase tracking-tighter">Last Update by Site Admin</span>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <textarea 
                      placeholder="Add comments, alignment instructions, or rejection reasons..."
                      className="w-full bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl p-3 text-xs text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 min-h-[80px] resize-none transition-all"
                      value={tempComment}
                      onChange={(e) => setTempComment(e.target.value)}
                    />
                  </div>
                )}
              </div>

              {/* Checklist Section for Approved Jobs */}
              {selectedRequest.status === 'Approved' && (
                <div className="space-y-4 pt-4 border-t border-gray-100 dark:border-slate-800">
                  <div className="flex items-center gap-2 pb-2">
                    <ListChecks size={18} className="text-blue-500" />
                    <h4 className="text-sm font-bold text-gray-800 dark:text-gray-200 uppercase tracking-wider">Start Job Checklist</h4>
                  </div>
                  <div className="space-y-3">
                    {[
                      { id: 'safetyBriefing', label: 'Safety briefing completed with all staff' },
                      { id: 'siteInspection', label: 'Site area visually inspected and cleared' },
                      { id: 'equipmentCheck', label: 'Equipment and machinery tested' },
                      { id: 'permitVerified', label: 'All permits and clearances verified' },
                    ].map(item => (
                      <label key={item.id} className="flex items-center gap-3 p-3 border border-gray-200 dark:border-slate-700 rounded-xl cursor-pointer hover:bg-gray-50 dark:hover:bg-slate-800/50 transition-colors">
                        <input 
                          type="checkbox" 
                          className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500 bg-white dark:bg-slate-900"
                          checked={checklist[item.id as keyof typeof checklist]}
                          onChange={(e) => setChecklist(prev => ({ ...prev, [item.id]: e.target.checked }))}
                        />
                        <span className="text-xs font-medium text-gray-700 dark:text-gray-300">{item.label}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex flex-wrap gap-3 pt-6 border-t border-gray-100 dark:border-slate-800">
                {selectedRequest.status === 'Approved' && (
                  <button 
                    disabled={!Object.values(checklist).every(Boolean)}
                    onClick={() => handleUpdateStatus(selectedRequest.id, 'In Progress')}
                    className="w-full bg-blue-600 disabled:bg-gray-300 dark:disabled:bg-slate-700 disabled:text-gray-500 dark:disabled:text-slate-500 disabled:cursor-not-allowed hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-2xl shadow-lg shadow-blue-500/20 transition-all active:scale-95 text-xs uppercase tracking-widest flex items-center justify-center gap-2 mb-2"
                  >
                    <CheckCircle size={16} />
                    Update Status to "In Progress"
                  </button>
                )}
                {selectedRequest.status === 'Requested' && (
                  <>
                    <button 
                      onClick={() => setConfirmDialog({ id: selectedRequest.id, status: 'Approved', jobNo: selectedRequest.jobNo })}
                      className="flex-1 min-w-[180px] bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-6 rounded-2xl shadow-lg shadow-green-500/20 transition-all active:scale-95 text-xs uppercase tracking-widest flex items-center justify-center gap-2"
                    >
                      <CheckCircle size={16} />
                      Approve Request
                    </button>
                    <button 
                      onClick={() => setConfirmDialog({ id: selectedRequest.id, status: 'Rejected', jobNo: selectedRequest.jobNo })}
                      className="flex-1 min-w-[180px] bg-red-600 hover:bg-red-700 text-white font-bold py-3 px-6 rounded-2xl shadow-lg shadow-red-500/20 transition-all active:scale-95 text-xs uppercase tracking-widest flex items-center justify-center gap-2"
                    >
                      <XCircle size={16} />
                      Reject Request
                    </button>
                  </>
                )}
                <label className="flex-1 min-w-[180px] bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-6 rounded-2xl shadow-lg shadow-indigo-500/20 transition-all active:scale-95 text-xs uppercase tracking-widest flex items-center justify-center gap-2 cursor-pointer">
                  <Upload size={16} />
                  Import File
                  <input type="file" className="hidden" accept=".pdf,.png,.jpg,.jpeg,.doc,.docx" onChange={(e) => {
                    if(e.target.files && e.target.files.length > 0) {
                      alert(`File ${e.target.files[0].name} imported successfully.`);
                    }
                  }} />
                </label>
                <button className="flex-1 min-w-[180px] bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-2xl shadow-lg shadow-blue-500/20 transition-all active:scale-95 text-xs uppercase tracking-widest flex items-center justify-center gap-2">
                  <FileText size={16} />
                  Export PDF
                </button>
                <button 
                  onClick={() => {
                    setViewMode('plan');
                    setSelectedRequest(null);
                  }}
                  className="flex-1 min-w-[180px] bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-gray-700 dark:text-gray-200 font-bold py-3 px-6 rounded-2xl hover:bg-gray-50 dark:hover:bg-slate-700 transition-all active:scale-95 text-xs uppercase tracking-widest flex items-center justify-center gap-2"
                >
                  <MapPin size={16} />
                  Show in Plot Plan
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* --- Confirmation Modal --- */}
      {confirmDialog && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-950/40 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 w-full max-w-sm rounded-2xl shadow-2xl border border-gray-100 dark:border-slate-800 p-6 space-y-6 animate-in zoom-in-95 duration-200">
            <div className="text-center space-y-2">
              <div className={`w-12 h-12 rounded-full mx-auto flex items-center justify-center ${confirmDialog.status === 'Approved' ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
                {confirmDialog.status === 'Approved' ? <CheckCircle size={24} /> : <XCircle size={24} />}
              </div>
              <h3 className="text-lg font-bold text-gray-800 dark:text-gray-100">Confirm Action</h3>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Are you sure you want to <span className="font-bold text-gray-800 dark:text-gray-200 uppercase tracking-tighter italic">{confirmDialog.status}</span> job request <span className="font-mono font-bold text-blue-600 underline">{confirmDialog.jobNo}</span>?
              </p>
            </div>
            
            <div className="space-y-4">
               {/* Quick comment inside confirmation if not in detail modal */}
               {!selectedRequest && (
                 <div className="space-y-2">
                   <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest italic">Optional Remarks</label>
                   <input 
                     type="text"
                     placeholder="Reason for decision..."
                     className="w-full bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg px-3 py-2 text-xs text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                     value={tempComment}
                     onChange={(e) => setTempComment(e.target.value)}
                   />
                 </div>
               )}
               
               <div className="grid grid-cols-2 gap-3">
                 <button 
                   onClick={() => {
                     setConfirmDialog(null);
                     setTempComment('');
                   }}
                   className="py-2.5 rounded-xl border border-gray-200 dark:border-slate-800 text-xs font-bold text-gray-500 hover:bg-gray-50 dark:hover:bg-slate-800 transition-all font-mono tracking-widest"
                 >
                   CANCEL
                 </button>
                 <button 
                   onClick={() => handleUpdateStatus(confirmDialog.id, confirmDialog.status, tempComment)}
                   className={`py-2.5 rounded-xl text-xs font-bold text-white shadow-lg transition-all active:scale-95 font-mono tracking-widest ${confirmDialog.status === 'Approved' ? 'bg-green-600 hover:bg-green-700 shadow-green-500/20' : 'bg-red-600 hover:bg-red-700 shadow-red-500/20'}`}
                 >
                   CONFIRM
                 </button>
               </div>
            </div>
          </div>
        </div>
      )}
      {/* --- Crane Request Detail Drawer (Requirement 7) --- */}
      <RequestDetailDrawer
        isOpen={!!selectedDetailJob}
        job={selectedDetailJob}
        onClose={() => setSelectedDetailJob(null)}
        onStatusChange={(updatedJob) => {
          setSelectedDetailJob(updatedJob);
          setJobs(prev => prev.map(j => {
            if (j.id === updatedJob.id || j.jobNo === updatedJob.jobNo) {
              return {
                ...j,
                requestStatus: updatedJob.requestStatus,
                assignmentStatus: updatedJob.assignmentStatus,
                status: updatedJob.status,
                assignedCraneId: updatedJob.assignedCraneId,
                assignedCraneName: updatedJob.assignedCraneName
              };
            }
            return j;
          }));
        }}
      />

      {/* --- Create Request Modal (Requirement 3.3) --- */}
      <CreateRequestModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onCreated={(newJob) => {
          setIsCreateModalOpen(false);
          const newRequestItem: JobRequest = {
            id: Number(newJob.id) || Date.now(),
            jobNo: newJob.jobNo,
            requestNo: newJob.requestNo,
            requestType: newJob.requestType,
            requestStatus: newJob.requestStatus,
            assignmentStatus: newJob.assignmentStatus,
            unit: newJob.unit,
            equipmentType: newJob.equipmentType,
            loadWeightTon: newJob.loadWeightTon,
            riggingWeightTon: newJob.riggingWeightTon,
            grossLoadTon: newJob.grossLoadTon,
            workingRadiusM: newJob.workingRadiusM,
            requiredHookHeightM: newJob.requiredHookHeightM,
            plant: newJob.plant.includes('Si Racha') ? 'SR' : 'BCP',
            description: newJob.title || newJob.description,
            type: newJob.equipmentType || 'Mobile Crane',
            dateFrom: newJob.dateFrom || `${newJob.scheduledDate || ''} ${newJob.scheduledStartTime || ''}`.trim() || '2026-09-28 08:00',
            status: newJob.status,
            contractor: newJob.contractor,
            x: 45,
            y: 45,
            isArea: false,
            width: 30,
            height: 30,
            rotation: 0
          };
          setJobs(prev => [newRequestItem, ...prev]);
        }}
      />

      {/* --- Import Requests Modal (Requirement 3.4) --- */}
      <ImportRequestsModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        onImportSuccess={() => {
          setIsImportModalOpen(false);
        }}
      />

      {/* Dedicated Job Plot Plan Popup Modal */}
      <JobPlotPlanModal
        isOpen={!!selectedPlotPlanJob}
        job={selectedPlotPlanJob}
        onClose={() => setSelectedPlotPlanJob(null)}
      />
    </div>
  );
}
