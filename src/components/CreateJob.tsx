import React, { useState, useEffect, useRef, ChangeEvent, useMemo } from 'react';
import {
  Save, Calendar, Clock, MapPin, Truck, HelpCircle, HardHat,
  Layers, FileSpreadsheet, Download, Upload, Plus, Trash2,
  Copy, CheckCircle2, AlertCircle, FileText, Sparkles, X,
  RefreshCw, Check, ArrowRight, CornerDownRight, ExternalLink, Paperclip,
  Search, ChevronDown, ClipboardList, Building, Building2, Wrench, ShieldCheck, ChevronUp,
  ArrowLeft, Eye, QrCode, Tag, AlertTriangle, Link as LinkIcon, ArrowDownUp, MoveHorizontal
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { useLanguage } from '../context/LanguageContext';
import JobAttachmentSection from './common/JobAttachmentSection';
import { JobAttachment, saveJobAttachments } from '../data/jobAttachmentData';
import { getAllCraneJobs, addCraneJob, subscribeToCraneOperations, UnifiedCraneJob, navigateToCraneView } from '../data/craneOperationsData';
import CreateJobRequest from './CreateJobRequest';
import BulkJobInsert, { BulkJobRow as BulkJobInsertRow } from './BulkJobInsert';
import BulkCranePermitModal from './BulkCranePermitModal';
import BulkCraneJobIngestion from './bulk/BulkCraneJobIngestion';
import BulkScaffoldingJobIngestion from './bulk/BulkScaffoldingJobIngestion';
import PlotPlanPinningSection, { PinData, ScaleBlockData } from './common/PlotPlanPinningSection';

export { CreateJobRequest, BulkJobInsert, BulkCranePermitModal, PlotPlanPinningSection };

export const EQUIPMENT_OPTIONS = [
  { id: '11-C-101', name: 'Crude Distillation Column', plant: 'BCP Refinery Area 1', funcLoc: '11-APS1 (Atmospheric Pipestill 1)' },
  { id: '11-E-101', name: 'Crude Preheat Exchanger Train', plant: 'BCP Refinery Area 1', funcLoc: '11-APS1 (Atmospheric Pipestill 1)' },
  { id: '11-E-102B', name: 'Reboiler Exchanger Tube Bundle', plant: 'BCP Refinery Area 1', funcLoc: '11-APS1 (Atmospheric Pipestill 1)' },
  { id: '11-P-101A', name: 'Crude Charge Feed Pump', plant: 'BCP Refinery Area 1', funcLoc: '11-APS1 (Atmospheric Pipestill 1)' },
  { id: '11-H-101', name: 'Furnace Fired Heater Burner Deck', plant: 'BCP Refinery Area 1', funcLoc: '11-APS1 (Atmospheric Pipestill 1)' },
  { id: '12-R-101', name: 'Hydrocracker High-Pressure Reactor', plant: 'Zone C Construction & Expansion', funcLoc: '12-HCU (Hydrocracking Unit)' },
  { id: '12-C-102', name: 'Vacuum Flasher Tower', plant: 'Zone C Construction & Expansion', funcLoc: '12-HCU (Hydrocracking Unit)' },
  { id: '21-B-201', name: 'High Pressure Steam Boiler Unit', plant: 'Workshop & Pre-assembly Yard', funcLoc: '21-UTL (Utilities & Power Generation)' },
  { id: '31-TK-01', name: 'Heavy Fuel Oil Storage Tank #01', plant: 'Storage Yard Sector B', funcLoc: '31-TNK (Offsite Tank Farm & Wharf)' },
  { id: '41-BERTH-02', name: 'Marine Loading Arm & Jetty Berth 2', plant: 'Dock Area & Marine Terminal', funcLoc: '41-JTY (Marine Jetty & Berth)' },
];

export const FUNCTIONAL_LOCATIONS = [
  '11-APS1 (Atmospheric Pipestill 1)',
  '12-HCU (Hydrocracking Unit)',
  '13-CRU (Catalytic Reforming Unit)',
  '21-UTL (Utilities & Power Generation)',
  '31-TNK (Offsite Tank Farm & Wharf)',
  '41-JTY (Marine Jetty & Berth)',
  '51-WKS (Central Maintenance Workshop)'
];

export const LOCATION_AREAS = [
  'BCP Refinery Area 1',
  'Storage Yard Sector B',
  'Zone C Construction & Expansion',
  'Workshop & Pre-assembly Yard',
  'Dock Area & Marine Terminal',
  'Main Gate Logistics Staging'
];

export const CRANE_LOCATION_AREAS = [
  'S1 - CCR, SRU, TGCU, Utility',
  'S2 - APS-1, APS-2, FCCU, GOHF-3',
  'S3 - Offsite, Jetty'
];

export const TRADE_SESSION_OPTIONS = [
  'IMD',
  'EMD',
  'MSD',
  'MAD',
  'TMD',
  'Project',
  'S1',
  'S2',
  'S3',
  'Other'
];

export const SHIFT_OPTIONS = ['Day', 'Night', 'All day'] as const;

export const CAPACITY_REQUIRED_OPTIONS = [
  8, 10, 25, 50, 80, 100, 120, 160, 200, 360, 400, 500
];

export const REVIEW_BY_OPTIONS = [
  'นายสมชาย พัฒนกิจ (Lead Turnaround Planner)',
  'วิศวกรจัดตารางเครน (Crane Scheduler & Rigging Lead)',
  'ทีมงานจัดสรรเครน (Heavy Lift Optimizer Team)',
  'ฝ่ายวางแผนซ่อมบำรุง (Maintenance Planning Dept)'
];

export const OPTIMIZE_WITH_OPTIONS = [
  'CR-01 (Liebherr LTM 1300 300T - Heavy Duty)',
  'CR-02 (Tadano GR-500EXL 50T - Rough Terrain)',
  'CR-03 (Kato KR-25H 25T - City Crane)',
  'CR-04 (Kobelco CKE2500 250T - Crawler Crane)',
  'CR-05 (Demag AC 100-4L 100T - All Terrain)',
  'Req. No: ICM-2600001 (Task: CDU Overhead Lift)',
  'Req. No: ICM-2600002 (Task: Tube Bundle Reboiler)',
  'Req. No: ICM-2600003 (Task: Reactor Flange Overhaul)'
];

export const CRANE_STATUS_OPTIONS = [
  'Draft',
  'Submitted',
  'Rejected',
  'Reviewed',
  'Optimized'
] as const;

export interface BulkJobRow {
  id: string;
  description: string;
  plant: string;
  machineType: string;
  capacity: number;
  startDate: string;
  endDate: string;
  startTime: string;
  endTime: string;
  contractor: string;
  priority: 'Normal' | 'High' | 'Urgent';
  x: number;
  y: number;
  remarks: string;
}

const DEFAULT_PLANTS = [
  'BCP Refinery',
  'Contractor Area',
  'Storage Yard',
  'Main Gate',
  'Zone 1 (Process)',
  'Zone 2 (Utilities)',
  'Hydrocracking Unit (HCU-1)',
  'Marine Terminal Jetty'
];

const DEFAULT_CRANE_TYPES = [
  'Mobile Crane (50T)',
  'Mobile Crane (100T)',
  'Mobile Crane (300T)',
  'Crawler Crane (400T)',
  'Rough Terrain Crane',
  'Tower Crane',
  'Forklift / Telehandler'
];

const DEFAULT_SCAFFOLD_TYPES = [
  'Modular System Scaffold',
  'Cantilever Scaffolding',
  'Suspended Cradle Scaffolding',
  'Mobile Tower Scaffold',
  'Heavy Duty Shoring',
  'Tube & Fitting Scaffold'
];

const DEFAULT_CONTRACTORS = [
  'Contractor A (Mechanical)',
  'Contractor B (Piping & Structural)',
  'Operations Dept',
  'Maintenance Team',
  'External Hire Partner'
];

const SAMPLE_CRANE_JOBS: BulkJobRow[] = [
  {
    id: 'row-1',
    description: 'Remove Manhole #03 on Crude Distillation Tower 11-C-101',
    plant: 'BCP Refinery',
    machineType: 'Mobile Crane (100T)',
    capacity: 45,
    startDate: '2026-09-25',
    endDate: '2026-09-25',
    startTime: '08:00',
    endTime: '17:00',
    contractor: 'Contractor A (Mechanical)',
    priority: 'High',
    x: 42.5,
    y: 38.0,
    remarks: 'Pre-rigging tag inspection required before lifting.'
  },
  {
    id: 'row-2',
    description: 'Lift and position Tube Bundle for Reboiler 11-E-102B',
    plant: 'Hydrocracking Unit (HCU-1)',
    machineType: 'Mobile Crane (300T)',
    capacity: 85,
    startDate: '2026-09-26',
    endDate: '2026-09-27',
    startTime: '07:30',
    endTime: '18:00',
    contractor: 'Contractor B (Piping & Structural)',
    priority: 'Urgent',
    x: 58.2,
    y: 62.4,
    remarks: 'Dual-crane tandem lift plan approved by TSS.'
  },
  {
    id: 'row-3',
    description: 'Relocate temporary generator units and power skid to Substation 3',
    plant: 'Zone 2 (Utilities)',
    machineType: 'Rough Terrain Crane',
    capacity: 35,
    startDate: '2026-09-25',
    endDate: '2026-09-25',
    startTime: '10:00',
    endTime: '15:00',
    contractor: 'Maintenance Team',
    priority: 'Normal',
    x: 24.0,
    y: 45.8,
    remarks: 'Ground matting check completed.'
  },
  {
    id: 'row-4',
    description: 'Erect structural pipe rack steel beams at Sector B-14',
    plant: 'Contractor Area',
    machineType: 'Mobile Crane (50T)',
    capacity: 25,
    startDate: '2026-09-27',
    endDate: '2026-09-28',
    startTime: '08:30',
    endTime: '17:30',
    contractor: 'Contractor B (Piping & Structural)',
    priority: 'High',
    x: 71.3,
    y: 29.5,
    remarks: 'Safety tag line and 1.25x load factor validated.'
  },
  {
    id: 'row-5',
    description: 'Unload Catalyst Hoppers from Flatbed Trailer at Warehouse',
    plant: 'Storage Yard',
    machineType: 'Forklift / Telehandler',
    capacity: 15,
    startDate: '2026-09-26',
    endDate: '2026-09-26',
    startTime: '09:00',
    endTime: '12:00',
    contractor: 'Operations Dept',
    priority: 'Normal',
    x: 18.6,
    y: 78.2,
    remarks: 'Fork tine certification up to date.'
  }
];

const SAMPLE_SCAFFOLD_JOBS: BulkJobRow[] = [
  {
    id: 'row-s1',
    description: 'Erect perimeter access scaffolding for Furnace 11-H-101 Burner Deck',
    plant: 'BCP Refinery',
    machineType: 'Modular System Scaffold',
    capacity: 20,
    startDate: '2026-09-25',
    endDate: '2026-09-28',
    startTime: '08:00',
    endTime: '17:00',
    contractor: 'Contractor B (Piping & Structural)',
    priority: 'Urgent',
    x: 35.5,
    y: 42.0,
    remarks: 'Green tag handover certification required before hot work.'
  },
  {
    id: 'row-s2',
    description: 'Cantilever platform scaffolding for Column 11-C-101 Tray #22 nozzle repair',
    plant: 'Hydrocracking Unit (HCU-1)',
    machineType: 'Cantilever Scaffolding',
    capacity: 12,
    startDate: '2026-09-26',
    endDate: '2026-09-27',
    startTime: '08:00',
    endTime: '16:00',
    contractor: 'Maintenance Team',
    priority: 'High',
    x: 52.0,
    y: 58.5,
    remarks: 'Safety harness 100% tie-off requirement.'
  },
  {
    id: 'row-s3',
    description: 'Mobile rolling tower scaffolding for valve inspection at Piperack P-08',
    plant: 'Zone 1 (Process)',
    machineType: 'Mobile Tower Scaffold',
    capacity: 8,
    startDate: '2026-09-25',
    endDate: '2026-09-25',
    startTime: '09:00',
    endTime: '14:00',
    contractor: 'Operations Dept',
    priority: 'Normal',
    x: 64.2,
    y: 33.1,
    remarks: 'Outrigger wheel locks must be engaged.'
  }
];

interface CreateJobProps {
  isScaffolding?: boolean;
  onNavigateToRequests?: () => void;
  setActiveView?: (view: string) => void;
}

export default function CreateJob({ isScaffolding = false, onNavigateToRequests, setActiveView }: CreateJobProps) {
  const { isTh } = useLanguage();

  // ================= VIEW STATE: HUB OVERVIEW VS CREATE FORM =================
  // Direct entry into form on create navigation; back returns to requests list
  const [isCreateFormOpen, setIsCreateFormOpen] = useState(true);
  const [activeMode, setActiveMode] = useState<'single' | 'bulk'>('single');
  const [hubPlantFilter, setHubPlantFilter] = useState<'All' | 'Phra Khanong' | 'Sriracha'>('All');

  useEffect(() => {
    setIsCreateFormOpen(true);
  }, [isScaffolding]);

  // Plant and Event Milestone Configuration
  const [selectedPlant, setSelectedPlant] = useState<'Phra Khanong' | 'Sriracha'>('Phra Khanong');
  const [eventName, setEventName] = useState('');
  const [eventMilestone, setEventMilestone] = useState('');
  const [workOrderNo, setWorkOrderNo] = useState('');

  // ================= SINGLE JOB FORM STATE (CRANE JOB SPECIFICATION) =================
  // Field: WO number (Number, Requestor, Required *)
  const [woNumber, setWoNumber] = useState<string>('');

  // Field: Job description (Text input, Requestor, Required *)
  const [jobDescription, setJobDescription] = useState<string>('');

  // Field: Location / area (Dropdown: S1, S2, S3, Requestor, Required *)
  const [locationArea, setLocationArea] = useState<string>(CRANE_LOCATION_AREAS[0]);

  // Field: Equipment tag (Dropdown link from SAP equipment tag list, Requestor, Required *)
  const [equipmentId, setEquipmentId] = useState<string>('');
  const [equipmentSearch, setEquipmentSearch] = useState<string>('');
  const [isEquipmentDropdownOpen, setIsEquipmentDropdownOpen] = useState<boolean>(false);

  // Field: Trade/Session (Dropdown, Requestor, Required *)
  const [tradeSession, setTradeSession] = useState<string>('MSD');

  // Field: Work start date/ time (Date, Requestor, Required *)
  const [workStartDate, setWorkStartDate] = useState<string>(() => new Date().toISOString().slice(0, 10));
  const [workStartTime, setWorkStartTime] = useState<string>('08:00');

  // Field: Work end date/ time (Date, Requestor, Required *)
  const [workEndDate, setWorkEndDate] = useState<string>(() => new Date().toISOString().slice(0, 10));
  const [workEndTime, setWorkEndTime] = useState<string>('17:00');

  // Field: Shift (Dropdown: Day / Night / All day, Requestor, Required *)
  const [shift, setShift] = useState<'Day' | 'Night' | 'All day'>('Day');

  // Kept Existing: Functional Location * (Dropdown, Requestor, Required *)
  const [functionalLocation, setFunctionalLocation] = useState<string>(FUNCTIONAL_LOCATIONS[0]);

  // Kept Existing: Estimated Duration * (Requestor, Required *) - Auto-calculated from Start/End Date & Time
  const [estimatedDuration, setEstimatedDuration] = useState<string>('9');
  const [durationUnit, setDurationUnit] = useState<'Hours' | 'Days'>('Hours');

  // Auto-calculate Estimated Duration based on Work start date/time and Work end date/time
  useEffect(() => {
    if (workStartDate && workEndDate) {
      const start = new Date(`${workStartDate}T${workStartTime || '00:00'}`);
      const end = new Date(`${workEndDate}T${workEndTime || '00:00'}`);
      const diffMs = end.getTime() - start.getTime();
      if (!isNaN(diffMs) && diffMs > 0) {
        const totalHours = Math.round((diffMs / (1000 * 60 * 60)) * 10) / 10;
        if (totalHours >= 24 && totalHours % 24 === 0) {
          setEstimatedDuration(String(totalHours / 24));
          setDurationUnit('Days');
        } else {
          setEstimatedDuration(String(totalHours));
          setDurationUnit('Hours');
        }
      }
    }
  }, [workStartDate, workStartTime, workEndDate, workEndTime]);

  // Kept Existing: Crane Type * : Crane Spot, Crane Pull (Requestor, Required *)
  const [craneType, setCraneType] = useState<'Crane Pull' | 'Crane Spot'>('Crane Spot');

  // Field: Crane type text input (Text input: Ex. GR-250N, GR-500EXL, Requestor, Required *)
  const [craneModel, setCraneModel] = useState<string>('');

  // Field: Capacity required (ton) (Number/Dropdown: 8/10/25/50/80/100/120/160/200/360/400/500 Tons, Requestor, Required *)
  const [capacityRequired, setCapacityRequired] = useState<number | string>('50');
  const [craneCapacity, setCraneCapacity] = useState<string>('50');

  // Kept Existing: Resource / Provider Type * (Requestor, Required *)
  const [providerType, setProviderType] = useState<'Owner Crane' | 'Contractor Crane'>('Owner Crane');

  // Field: Boom length (m) (Number, Requestor, Required *)
  const [boomLength, setBoomLength] = useState<string>('');

  // Field: Working radius (m) (Number, Requestor, Required *)
  const [workingRadius, setWorkingRadius] = useState<string>('');

  // Field: Total weight (ton) (Number, Requestor, Required *)
  const [totalWeight, setTotalWeight] = useState<string>('');

  // Field: Lift plan / plot plan/ check list (File/Link, Requestor, Required *)
  const [liftPlanLink, setLiftPlanLink] = useState<string>('');

  // Field: Additional remarks (Text area, Requestor, Optional N)
  const [additionalRemarks, setAdditionalRemarks] = useState<string>('');
  const [customJobNo, setCustomJobNo] = useState<string>('');

  // Field: Submitted by (Auto, Required *)
  const [submittedBy, setSubmittedBy] = useState<string>('นายประสิทธิ์ ผู้ขอเปิดงาน (Requestor)');

  // Field: Submission date (Auto, Required *)
  const [submissionDate, setSubmissionDate] = useState<string>(() => new Date().toISOString().replace('T', ' ').slice(0, 16));

  // Field: Status (Auto: Draft/ Submitted/ Rejected/ Reviewed/ Optimized, Required *)
  const [jobStatus, setJobStatus] = useState<'Draft' | 'Submitted' | 'Rejected' | 'Reviewed' | 'Optimized'>('Submitted');

  // Field: Review by (Dropdown, Planner/ Scheduler/ Optimizer, Required *)
  const [reviewBy, setReviewBy] = useState<string>(REVIEW_BY_OPTIONS[0]);

  // Field: Review notes (Text area, Planner/ Scheduler/ Optimizer, Optional N)
  const [reviewNotes, setReviewNotes] = useState<string>('');

  // Field: Optimize with (Dropdown: Select crane ID or Req. no. in Task list, Planner/ Scheduler/ Optimizer, Required *)
  const [optimizeWith, setOptimizeWith] = useState<string>(OPTIMIZE_WITH_OPTIONS[0]);

  // Kept Existing: Plot Plan & Marking
  const [showPlotPlanPinning, setShowPlotPlanPinning] = useState(true);
  const [jobPin, setJobPin] = useState<PinData | null>(null);
  const [markingType, setMarkingType] = useState<'pin' | 'area' | 'both'>('both');
  const [scaleBlock, setScaleBlock] = useState<ScaleBlockData>({
    x: 50.0,
    y: 50.0,
    width: 6,
    height: 8,
    rotation: 0,
    color: isScaffolding ? 'emerald' : 'amber',
    blockType: isScaffolding ? 'scaffold-bay' : 'crane-footprint',
    label: ''
  });

  // Kept Existing: Attachments (Step 4)
  const [singleRemarks, setSingleRemarks] = useState('');
  const [singleAttachments, setSingleAttachments] = useState<JobAttachment[]>([]);

  const resetForm = () => {
    setWoNumber('');
    setCustomJobNo('');
    setJobDescription('');
    setLocationArea(CRANE_LOCATION_AREAS[0]);
    setEquipmentId('');
    setEquipmentSearch('');
    setTradeSession('MSD');
    setFunctionalLocation(FUNCTIONAL_LOCATIONS[0]);
    const today = new Date().toISOString().slice(0, 10);
    setWorkStartDate(today);
    setWorkStartTime('08:00');
    setWorkEndDate(today);
    setWorkEndTime('17:00');
    setShift('Day');
    setEstimatedDuration('8');
    setDurationUnit('Hours');
    setCraneType('Crane Spot');
    setCraneModel('');
    setCapacityRequired('50');
    setCraneCapacity('50');
    setProviderType('Owner Crane');
    setBoomLength('');
    setWorkingRadius('');
    setTotalWeight('');
    setLiftPlanLink('');
    setAdditionalRemarks('');
    setSubmittedBy('นายประสิทธิ์ ผู้ขอเปิดงาน (Requestor)');
    setSubmissionDate(new Date().toISOString().replace('T', ' ').slice(0, 16));
    setJobStatus('Submitted');
    setReviewBy(REVIEW_BY_OPTIONS[0]);
    setReviewNotes('');
    setOptimizeWith(OPTIMIZE_WITH_OPTIONS[0]);
    setJobPin(null);
    setScaleBlock({
      x: 50.0,
      y: 50.0,
      width: 6,
      height: 8,
      rotation: 0,
      color: isScaffolding ? 'emerald' : 'amber',
      blockType: isScaffolding ? 'scaffold-bay' : 'crane-footprint',
      label: ''
    });
    setSingleRemarks('');
    setSingleAttachments([]);
    setCreatedJobLinkInfo(null);
    setSubmittedSummary(null);
  };

  // Bulk State (for Bulk View)
  const [bulkRows, setBulkRows] = useState<BulkJobRow[]>(isScaffolding ? SAMPLE_SCAFFOLD_JOBS : SAMPLE_CRANE_JOBS);

  // Submission Status & QR Link Output
  const [createdJobLinkInfo, setCreatedJobLinkInfo] = useState<{
    id: number | string;
    jobNo: string;
    url: string;
  } | null>(null);

  const [submittedSummary, setSubmittedSummary] = useState<{
    count: number;
    jobNumbers: string[];
    isBulk: boolean;
  } | null>(null);

  // Active Hub Saved Jobs synchronized with Unified Crane Operations Store
  const [savedJobs, setSavedJobs] = useState<UnifiedCraneJob[]>(() => getAllCraneJobs());

  useEffect(() => {
    const unsubscribe = subscribeToCraneOperations((updatedJobs) => {
      setSavedJobs(updatedJobs);
    });
    return unsubscribe;
  }, []);

  // Helper to persist to localStorage & dispatch update to all crane views
  const saveJobsToStorage = (newJobs: any[]) => {
    try {
      newJobs.forEach(job => {
        addCraneJob(job);
      });
      setSavedJobs(getAllCraneJobs());
      window.dispatchEvent(new CustomEvent('crane_operations_updated', { detail: { jobs: getAllCraneJobs() } }));
      window.dispatchEvent(new Event('storage'));
    } catch (e) {
      console.error('Failed to save to crane operations store:', e);
    }
  };

  // Download QR Code as Image
  const handleDownloadQR = () => {
    const svg = document.getElementById('crane-job-qr-code-svg');
    if (!svg) return;
    const svgData = new XMLSerializer().serializeToString(svg);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();
    img.onload = () => {
      canvas.width = img.width + 40;
      canvas.height = img.height + 40;
      if (ctx) {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 20, 20);
        const pngFile = canvas.toDataURL('image/png');
        const downloadLink = document.createElement('a');
        downloadLink.download = `QR_${createdJobLinkInfo?.jobNo || 'CraneJob'}.png`;
        downloadLink.href = pngFile;
        downloadLink.click();
      }
    };
    img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)));
  };

  // ================= CANCEL / BACK ACTION =================
  const handleCancel = () => {
    if (onNavigateToRequests) {
      onNavigateToRequests();
    } else {
      setIsCreateFormOpen(false);
    }
  };

  // ================= FILL SAMPLE ACTION =================
  const handleFillSample = () => {
    setWoNumber('882041');
    setJobDescription('Remove and lift top channel head on Crude Distillation Tower 11-C-101 with 1.25x safety margin.');
    setLocationArea('S2 - APS-1, APS-2, FCCU, GOHF-3');
    setEquipmentId('11-C-101');
    setTradeSession('MSD');
    setSelectedPlant('Phra Khanong');
    setFunctionalLocation('11-APS1 (Atmospheric Pipestill 1)');
    const today = new Date().toISOString().slice(0, 10);
    setWorkStartDate(today);
    setWorkStartTime('08:00');
    setWorkEndDate(today);
    setWorkEndTime('17:00');
    setShift('Day');
    setEstimatedDuration('8');
    setDurationUnit('Hours');
    setCraneType('Crane Spot');
    setCraneModel('GR-500EXL (Tadano 50T)');
    setCapacityRequired('50');
    setCraneCapacity('50');
    setProviderType('Owner Crane');
    setBoomLength('33.5');
    setWorkingRadius('14.0');
    setTotalWeight('18.5');
    setLiftPlanLink('https://bcp.sharepoint.com/sites/engineering/lift-plans/LP-11-C-101.pdf');
    setAdditionalRemarks('Ground matting check completed. Tag lines mandatory for 18.5T load.');
    setSubmittedBy('นายประสิทธิ์ ผู้ขอเปิดงาน (Requestor)');
    setSubmissionDate(new Date().toISOString().replace('T', ' ').slice(0, 16));
    setJobStatus('Submitted');
    setReviewBy(REVIEW_BY_OPTIONS[0]);
    setReviewNotes('Approved for Day shift execution. Rigging study verified.');
    setOptimizeWith(OPTIMIZE_WITH_OPTIONS[1]);
  };

  // ================= SINGLE SUBMIT =================
  const handleSingleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!woNumber.trim()) {
      alert(isTh ? 'กรุณากรอกเลขที่ใบสั่งงาน (WO number *)' : 'Please enter WO number *');
      return;
    }
    if (!jobDescription.trim()) {
      alert(isTh ? 'กรุณากรอกรายละเอียดงาน (Job description *)' : 'Please enter Job description *');
      return;
    }
    if (!equipmentId.trim()) {
      alert(isTh ? 'กรุณาเลือกหรือระบุ Equipment tag *' : 'Please select Equipment tag *');
      return;
    }
    if (!craneModel.trim()) {
      alert(isTh ? 'กรุณากรอกประเภท/รุ่นเครน (Crane type: เช่น GR-250N, GR-500EXL *)' : 'Please enter Crane type / model *');
      return;
    }
    if (!boomLength.trim()) {
      alert(isTh ? 'กรุณากรอกความยาวบูม (Boom length *)' : 'Please enter Boom length (m) *');
      return;
    }
    if (!workingRadius.trim()) {
      alert(isTh ? 'กรุณากรอกระยะปฏิบัติงาน (Working radius *)' : 'Please enter Working radius (m) *');
      return;
    }
    if (!totalWeight.trim()) {
      alert(isTh ? 'กรุณากรอกน้ำหนักรวม (Total weight *)' : 'Please enter Total weight (ton) *');
      return;
    }

    const existingJobs = getAllCraneJobs();
    const cleanWo = woNumber.trim();
    const cleanWoFormatted = cleanWo.toUpperCase().startsWith('WO-') ? cleanWo.toUpperCase() : `WO-${cleanWo.toUpperCase()}`;

    // Duplicate check for WO Number
    const duplicateByWo = existingJobs.find(j => {
      const jWo = (j.workOrder || j.workOrderNo || (j.woNumber ? `WO-${j.woNumber}` : '')).toUpperCase().trim();
      const rawWo = String(j.woNumber || '').trim();
      return (
        (cleanWo && rawWo === cleanWo) ||
        (cleanWo && jWo === cleanWoFormatted) ||
        String(j.id) === cleanWo
      );
    });

    if (duplicateByWo) {
      alert(
        isTh
          ? `เลขที่ใบสั่งงาน (WO No: ${cleanWo}) นี้มีอยู่ในระบบแล้ว (ตรงกับ Job: ${duplicateByWo.jobNo}) ไม่สามารถสร้างหรือนำเข้าซ้ำได้!`
          : `WO Number (${cleanWo}) already exists in the system (matches Job: ${duplicateByWo.jobNo}). Duplicate creation is rejected!`
      );
      return;
    }

    const nextId = Math.floor(260526 + Math.random() * 9000);
    const generatedJobNo = isScaffolding ? `SF-26${String(nextId).slice(-5)}` : `ICM-26${String(nextId).slice(-5)}`;
    const jobNo = customJobNo.trim() || generatedJobNo;

    // Duplicate check for Job No
    const duplicateByJobNo = existingJobs.find(j => 
      j.jobNo?.toLowerCase().trim() === jobNo.toLowerCase().trim() || 
      String(j.id).toLowerCase().trim() === jobNo.toLowerCase().trim() ||
      (j.requestNo && j.requestNo.toLowerCase().trim() === jobNo.toLowerCase().trim())
    );

    if (duplicateByJobNo) {
      alert(
        isTh
          ? `รหัส Job No (${jobNo}) นี้มีอยู่ในระบบแล้ว ไม่สามารถสร้างหรือนำเข้าซ้ำได้!`
          : `Job No (${jobNo}) already exists in the system. Duplicate creation is rejected!`
      );
      return;
    }

    const newJob: UnifiedCraneJob = {
      id: nextId,
      jobNo,
      woNumber: Number(woNumber) || woNumber,
      workOrder: `WO-${woNumber}`,
      description: jobDescription.trim(),
      plant: selectedPlant === 'Phra Khanong' ? 'Phra Khanong' : 'Sriracha',
      functionalLocation,
      locationArea,
      area: locationArea,
      equipmentId: equipmentId.trim(),
      equipmentTag: equipmentId.trim(),
      tradeSession,
      workStartDateTime: `${workStartDate} ${workStartTime}`.trim(),
      workEndDateTime: `${workEndDate} ${workEndTime}`.trim(),
      shift,
      duration: `${estimatedDuration} ${durationUnit}`,
      craneType,
      type: `${craneType} (${capacityRequired}T) - ${craneModel}`,
      craneModel: craneModel.trim(),
      capacity: Number(capacityRequired) || 50,
      capacityRequired: Number(capacityRequired) || 50,
      providerType,
      boomLengthM: Number(boomLength) || undefined,
      workingRadiusM: Number(workingRadius) || undefined,
      totalWeightTon: Number(totalWeight) || undefined,
      grossLoadTon: Number(totalWeight) || undefined,
      liftPlanLink: liftPlanLink.trim() || undefined,
      additionalRemarks: additionalRemarks.trim() || undefined,
      submittedBy,
      submissionDate,
      status: jobStatus,
      reviewBy,
      reviewedBy: reviewBy,
      reviewNotes: reviewNotes.trim() || undefined,
      optimizeWith,
      priority: Number(capacityRequired) >= 100 ? 'Urgent' : Number(capacityRequired) >= 50 ? 'High' : 'Normal',
      contractor: providerType === 'Owner Crane' ? 'BCP Operations (Owner Crane)' : 'Contractor Heavy Lift (Contractor Crane)',
      x: markingType === 'area' ? scaleBlock.x : (jobPin ? jobPin.x : 45.0),
      y: markingType === 'area' ? scaleBlock.y : (jobPin ? jobPin.y : 50.0),
      isArea: markingType === 'area' || markingType === 'both',
      width: scaleBlock.width,
      height: scaleBlock.height,
      rotation: scaleBlock.rotation,
      radius: jobPin?.radius || 15,
      markingType,
      remarks: additionalRemarks.trim() || singleRemarks.trim() || undefined,
      attachments: singleAttachments,
      createdAt: new Date().toISOString()
    };

    saveJobsToStorage([newJob]);
    if (singleAttachments.length > 0) {
      saveJobAttachments(jobNo, singleAttachments);
      saveJobAttachments(nextId, singleAttachments);
    }

    setCreatedJobLinkInfo({
      id: nextId,
      jobNo,
      url: `https://bcp-crane.enterprise.internal/requests/${jobNo}`
    });

    setSubmittedSummary({
      count: 1,
      jobNumbers: [jobNo],
      isBulk: false
    });
  };

  // Filtered Hub jobs
  const filteredHubJobs = useMemo(() => {
    return savedJobs.filter(j => {
      if (hubPlantFilter === 'All') return true;
      const plantStr = String(j.plant || '').toLowerCase();
      if (hubPlantFilter === 'Phra Khanong') {
        return plantStr.includes('phra') || plantStr.includes('bcp') || plantStr.includes('area 1');
      }
      if (hubPlantFilter === 'Sriracha') {
        return plantStr.includes('sriracha') || plantStr.includes('sr');
      }
      return true;
    });
  }, [savedJobs, hubPlantFilter]);

  return (
    <div className="flex flex-col space-y-6 max-w-7xl mx-auto w-full pb-16">

      {!isCreateFormOpen ? (
        /* =========================================================================
           1A: EVENT & CRANE JOB HUB (LANDING OVERVIEW WITH ACTION BUTTONS & KPIS)
           Matches exactly the layout and aesthetics of Module Job Location & Turnover
           ========================================================================= */
        <div className="space-y-6 animate-in fade-in duration-200">

          {/* Hero Action Banner */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-5 sm:p-6 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-1.5 max-w-2xl">
              <div className="flex items-center gap-2 flex-wrap">
                <span className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full font-mono ${isScaffolding
                    ? 'bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300'
                    : 'bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300'
                  }`}>
                  {isScaffolding
                    ? (isTh ? 'ศูนย์บริหารจัดการงานนั่งร้าน & SCAFFOLDING' : 'Scaffolding Operations Hub')
                    : (isTh ? 'ศูนย์บริหารจัดการงานเครน & HEAVY LIFT' : 'Crane Job & Heavy Lift Hub')}
                </span>
                <span className="text-xs text-slate-400">
                  {isTh ? '· โรงกลั่นน้ำมันบางจาก พระโขนง & ศรีราชา' : '· Bangchak Refineries (PK & SR)'}
                </span>
              </div>
              <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-slate-100 tracking-tight flex items-center gap-2">
                {isScaffolding ? (
                  <Building className="text-amber-600 dark:text-amber-400" size={24} />
                ) : (
                  <Truck className="text-blue-600 dark:text-blue-400" size={24} />
                )}
                <span>
                  {isScaffolding
                    ? (isTh ? 'ระบบสร้างและจัดการคำขอนั่งร้าน & โครงสร้างชั่วคราว' : 'Create Scaffolding & Access Structure Requests')
                    : (isTh ? 'ระบบสร้างและจัดการคำขอเครน & เครื่องจักรยกหนัก' : 'Create Crane & Heavy Lifting Job Requests')}
                </span>
              </h2>
              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                {isScaffolding
                  ? (isTh
                    ? 'เริ่มต้นสร้างคำขอติดตั้งนั่งร้าน กำหนดพื้นที่ใช้งาน ปักหมุดบนแผนผังโรงกลั่น และบันทึกข้อมูลพร้อมออก QR Code หน้างาน'
                    : 'Initialize scaffolding erection requests, bind Functional Locations, pin on refinery plot plan, and generate on-site QR codes.')
                  : (isTh
                    ? 'เริ่มต้นสร้างคำขอเปิดงานยกและเครื่องจักรหนัก เชื่อมโยงอุปกรณ์โรงกลั่น กำหนดพิกัดบนแผนผัง จัดสรรขนาดพิกัดน้ำหนัก และตรวจสอบความพร้อมด้านความปลอดภัย'
                    : 'Initialize turnaround heavy lifting requests, bind plant equipment, pinpoint on plot plan, allocate machine capacity, and generate on-site QR codes.')}
              </p>
            </div>

            <div className="flex items-center gap-3 shrink-0 flex-wrap">
              <button
                type="button"
                onClick={() => {
                  resetForm();
                  setActiveMode('single');
                  setIsCreateFormOpen(true);
                }}
                className={`h-12 px-6 rounded-xl text-white font-bold text-sm shadow-lg active:scale-95 flex items-center gap-2.5 transition-all cursor-pointer ${isScaffolding
                    ? 'bg-amber-600 hover:bg-amber-700 shadow-amber-600/25'
                    : 'bg-blue-600 hover:bg-blue-700 shadow-blue-600/25'
                  }`}
              >
                <Plus size={18} className="stroke-[3]" />
                <span>
                  {isScaffolding
                    ? (isTh ? 'สร้างคำขอนั่งร้านใหม่' : 'Create Scaffolding Job')
                    : (isTh ? 'สร้างคำขอเครนใหม่' : 'Create Crane Job')}
                </span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setActiveMode('bulk');
                  setIsCreateFormOpen(true);
                }}
                className="h-12 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-750 text-slate-800 dark:text-slate-100 border border-slate-300 dark:border-slate-700 font-bold text-xs flex items-center gap-2 transition-all cursor-pointer shadow-xs hover:border-slate-400"
              >
                <Layers size={16} className="text-blue-600 dark:text-blue-400" />
                <span>{isTh ? 'นำเข้าข้อมูลแบบกลุ่ม (50+)' : 'Bulk Ingestion (50+)'}</span>
              </button>
            </div>
          </div>
        </div>
      ) : (
        /* =========================================================================
           1B: FIELD-OPTIMIZED CREATION FORM (DEDICATED FORM PAGE)
           Matches exactly the layout and aesthetics of Module Job Location & Turnover
           ========================================================================= */
        <div className="space-y-6 animate-in fade-in duration-200">
          {/* Back Bar & Form Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => {
                  if (onNavigateToRequests) {
                    onNavigateToRequests();
                  } else {
                    setIsCreateFormOpen(false);
                  }
                }}
                className="p-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-200 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer shrink-0"
                title={isTh ? 'ย้อนกลับ' : 'Back'}
              >
                <ArrowLeft size={16} />
                <span className="hidden sm:inline">{isTh ? 'ย้อนกลับ' : 'Back'}</span>
              </button>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 font-mono">
                    {isTh ? 'โหมดสร้างคำขอหน้างาน' : 'Field Entry Mode'}
                  </span>
                  <span className="text-slate-400 text-xs">
                    {isTh ? '· กำหนดจุดมาร์คกิ้งบนผังและสเปกเครื่องจักร' : '· Plot Plan Coordinates & Machine Allocation'}
                  </span>
                </div>
                <h2 className="text-lg sm:text-xl font-black text-slate-900 dark:text-slate-100 tracking-tight mt-0.5">
                  {isScaffolding
                    ? (isTh ? 'แบบฟอร์มขอติดตั้งและใช้งานนั่งร้านหน้างาน' : 'On-Site Scaffolding Request Form')
                    : (isTh ? 'แบบฟอร์มขอใช้งานเครนและเครื่องจักรยกหนักหน้างาน' : 'On-Site Crane & Heavy Lift Request Form')}
                </h2>
              </div>
            </div>

            {/* Segmented Mode Selector Button Group */}
            <div className="inline-flex rounded-xl bg-slate-100 dark:bg-slate-800 p-1 border border-slate-200 dark:border-slate-700 shrink-0 self-start sm:self-auto">
              <button
                type="button"
                onClick={() => setActiveMode('single')}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${activeMode === 'single'
                    ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-300 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
              >
                <FileText size={14} />
                <span>{isTh ? 'แบบฟอร์มเดี่ยว' : 'Single Job Form'}</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveMode('bulk')}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${activeMode === 'bulk'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
              >
                <Layers size={14} />
                <span>{isTh ? 'นำเข้าแบบกลุ่ม' : 'Bulk Ingestion'}</span>
                <span className="bg-blue-500/30 text-[9px] px-1.5 py-0.5 rounded font-mono font-bold">50+</span>
              </button>
            </div>
          </div>

          {activeMode === 'bulk' ? (
            /* DEDICATED MODULE-SPECIFIC BULK INGESTION COMPONENT */
            !isScaffolding ? (
              <BulkCraneJobIngestion
                onNavigateToRequests={onNavigateToRequests}
                onSwitchToSingle={() => setActiveMode('single')}
              />
            ) : (
              <BulkScaffoldingJobIngestion
                onNavigateToList={onNavigateToRequests}
                onSwitchToSingle={() => setActiveMode('single')}
              />
            )
          ) : (
            /* SINGLE JOB FORM WITH LIVE QR CODE & SUMMARY SIDEBAR */
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-in fade-in duration-200">

              {/* Left 2 Cols: Form Container */}
              <div className="lg:col-span-2 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-6 space-y-6">

                <div className="border-b border-slate-100 dark:border-slate-800 pb-4">
                  <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                    {isScaffolding ? <HardHat className="text-amber-600 dark:text-amber-400" size={20} /> : <Truck className="text-blue-600 dark:text-blue-400" size={20} />}
                    <span>
                      {isScaffolding
                        ? (isTh ? 'สร้างคำขอนั่งร้าน & พื้นที่ทำงาน' : 'Create Scaffolding Job Package')
                        : (isTh ? 'สร้างคำขอเปิดงานเครน & แผนการยก' : 'Create Crane Heavy Lift Package')}
                    </span>
                  </h2>
                  <p className="text-xs text-slate-500 mt-1">
                    {isTh
                      ? 'กำหนดข้อมูลอุปกรณ์โรงกลั่น วันเวลาปฏิบัติงาน ข้อกำหนดขนาดเครน และปักหมุดพิกัดบนผังโรงงาน'
                      : 'Configure turnaround milestone, crane technical capacity, schedule window, and plot coordinates.'}
                  </p>
                </div>

                <form onSubmit={handleSingleSubmit} className="space-y-6">

                  {/* STEP 1: GENERAL & WORK ORDER SPECIFICATION */}
                  <div className="p-4 sm:p-5 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-700/80 space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <h3 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider flex items-center gap-2">
                        <Calendar size={15} className="text-blue-600 dark:text-blue-400" />
                        <span>Step 1: {isTh ? 'ข้อมูลคำขอและสถานที่ (General & Location Information)' : 'General & Location Information'}</span>
                      </h3>
                      <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300">
                        Requestor Form (*)
                      </span>
                    </div>

                    {/* Plant Selection: 2 Large Touch Cards (Kept as requested) */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                        <Building2 size={14} className="text-blue-600 dark:text-blue-400" />
                        <span>{isTh ? 'เลือกโรงกลั่น (Select Plant)' : 'Select Plant'} <span className="text-rose-500">*</span></span>
                      </label>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-0.5">
                        <button
                          type="button"
                          onClick={() => setSelectedPlant('Phra Khanong')}
                          className={`p-3.5 rounded-xl border-2 flex items-center justify-between transition-all cursor-pointer text-left ${selectedPlant === 'Phra Khanong'
                              ? 'bg-blue-50/80 dark:bg-blue-950/40 border-blue-500 shadow-sm ring-2 ring-blue-500/20'
                              : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:border-slate-300'
                            }`}
                        >
                          <div className="flex items-center gap-3">
                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-xs shrink-0 ${selectedPlant === 'Phra Khanong'
                                ? 'bg-blue-600 text-white'
                                : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                              }`}>
                              PK
                            </div>
                            <div className="min-w-0">
                              <div className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate">
                                {isTh ? 'โรงกลั่นบางจาก พระโขนง' : 'Phra Khanong Refinery'}
                              </div>
                              <div className="text-[11px] text-slate-500 truncate">
                                {isTh ? 'กรุงเทพฯ • S2 Complex' : 'Bangkok • S2 Complex'}
                              </div>
                            </div>
                          </div>
                          {selectedPlant === 'Phra Khanong' && (
                            <CheckCircle2 size={18} className="text-blue-600 dark:text-blue-400 shrink-0 ml-2" />
                          )}
                        </button>

                        <button
                          type="button"
                          onClick={() => setSelectedPlant('Sriracha')}
                          className={`p-3.5 rounded-xl border-2 flex items-center justify-between transition-all cursor-pointer text-left ${selectedPlant === 'Sriracha'
                              ? 'bg-blue-50/80 dark:bg-blue-950/40 border-blue-500 shadow-sm ring-2 ring-blue-500/20'
                              : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:border-slate-300'
                            }`}
                        >
                          <div className="flex items-center gap-3">
                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-xs shrink-0 ${selectedPlant === 'Sriracha'
                                ? 'bg-blue-600 text-white'
                                : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                              }`}>
                              SR
                            </div>
                            <div className="min-w-0">
                              <div className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate">
                                {isTh ? 'โรงกลั่นบางจาก ศรีราชา' : 'Sriracha Refinery'}
                              </div>
                              <div className="text-[11px] text-slate-500 truncate">
                                {isTh ? 'ชลบุรี • Deep Sea Port' : 'Chonburi • Coastal Plant'}
                              </div>
                            </div>
                          </div>
                          {selectedPlant === 'Sriracha' && (
                            <CheckCircle2 size={18} className="text-blue-600 dark:text-blue-400 shrink-0 ml-2" />
                          )}
                        </button>
                      </div>
                    </div>

                    {/* Requestor Form Fields Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-4 pt-1">

                      {/* 1. WO Number (Requestor, Required *) */}
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-800 dark:text-slate-200 block">
                          <span>{isTh ? 'เลขที่ใบสั่งงาน (WO number) *' : 'WO number *'}</span>
                        </label>
                        <input
                          type="text"
                          required
                          value={woNumber}
                          onChange={(e) => setWoNumber(e.target.value)}
                          placeholder="e.g. 882041 or WO-882041"
                          className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-sm font-mono font-bold focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
                        />
                      </div>

                      {/* 1B. Job No (Optional - Auto generated if empty) */}
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-800 dark:text-slate-200 block flex items-center justify-between">
                          <span>{isTh ? 'รหัสใบงาน (Job No.)' : 'Job No.'}</span>
                          <span className="text-[10px] text-slate-400 font-normal">
                            {isTh ? '(ระบบสร้างให้อัตโนมัติหากว่าง)' : '(Auto if blank)'}
                          </span>
                        </label>
                        <input
                          type="text"
                          value={customJobNo}
                          onChange={(e) => setCustomJobNo(e.target.value)}
                          placeholder={isScaffolding ? 'e.g. SF-2600101' : 'e.g. ICM-2600101'}
                          className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
                        />
                      </div>

                      {/* 2. Location / area (Dropdown, Requestor, Required *) */}
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-800 dark:text-slate-200 block">
                          <span>{isTh ? 'พื้นที่หน้างาน (Location / area) *' : 'Location / area *'}</span>
                        </label>
                        <div className="relative">
                          <select
                            required
                            value={locationArea}
                            onChange={(e) => setLocationArea(e.target.value)}
                            className="w-full px-3.5 pr-9 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 appearance-none cursor-pointer"
                          >
                            {CRANE_LOCATION_AREAS.map((area) => (
                              <option key={area} value={area}>
                                {area}
                              </option>
                            ))}
                          </select>
                          <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                        </div>
                      </div>

                      {/* 3. Functional Location * (Dropdown, Kept as requested) */}
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-800 dark:text-slate-200 block">
                          <span>{isTh ? 'ตำแหน่งการทำงาน (Functional Location) *' : 'Functional Location *'}</span>
                        </label>
                        <div className="relative">
                          <select
                            required
                            value={functionalLocation}
                            onChange={(e) => setFunctionalLocation(e.target.value)}
                            className="w-full px-3.5 pr-9 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 appearance-none cursor-pointer"
                          >
                            {FUNCTIONAL_LOCATIONS.map((loc) => (
                              <option key={loc} value={loc}>
                                {loc}
                              </option>
                            ))}
                          </select>
                          <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                        </div>
                      </div>

                      {/* 4. Trade / Session (Dropdown, Requestor, Required *) */}
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-800 dark:text-slate-200 block">
                          <span>{isTh ? 'กลุ่มงาน / สาขา (Trade/Session) *' : 'Trade/Session *'}</span>
                        </label>
                        <div className="relative">
                          <select
                            required
                            value={tradeSession}
                            onChange={(e) => setTradeSession(e.target.value)}
                            className="w-full px-3.5 pr-9 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 appearance-none cursor-pointer"
                          >
                            {TRADE_SESSION_OPTIONS.map((trade) => (
                              <option key={trade} value={trade}>
                                {trade}
                              </option>
                            ))}
                          </select>
                          <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                        </div>
                      </div>

                      {/* 5. Equipment Tag (Dropdown link from SAP equipment tag list, Requestor, Required *) */}
                      <div className="space-y-1.5 relative md:col-span-2">
                        <div className="flex items-center justify-between">
                          <label className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                            <Tag size={13} className="text-blue-600" />
                            <span>{isTh ? 'รหัสอุปกรณ์ (Equipment tag) *' : 'Equipment tag *'}</span>
                            <span className="text-[10px] text-blue-600 dark:text-blue-400 font-normal">
                              (Link from SAP equipment tag list)
                            </span>
                          </label>
                          <span className="text-[10px] text-slate-400">{isTh ? 'ค้นหาหรือเลือกจากรายการ SAP' : 'Search SAP Tag'}</span>
                        </div>
                        <div className="relative">
                          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                          <input
                            type="text"
                            required
                            value={equipmentId}
                            onChange={(e) => {
                              setEquipmentId(e.target.value);
                              setIsEquipmentDropdownOpen(true);
                            }}
                            onFocus={() => setIsEquipmentDropdownOpen(true)}
                            placeholder="e.g. 11-C-101 (Crude Distillation Column)"
                            className="w-full pl-10 pr-9 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 font-mono font-bold"
                          />
                          {equipmentId && (
                            <button
                              type="button"
                              onClick={() => {
                                setEquipmentId('');
                                setIsEquipmentDropdownOpen(true);
                              }}
                              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                            >
                              <X size={14} />
                            </button>
                          )}
                        </div>

                        {/* SAP Equipment Dropdown Options */}
                        {isEquipmentDropdownOpen && (
                          <>
                            <div className="fixed inset-0 z-10" onClick={() => setIsEquipmentDropdownOpen(false)} />
                            <div className="absolute left-0 right-0 top-full mt-1 z-20 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-lg max-h-56 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-700/60">
                              <div className="p-2 text-[10px] font-bold text-slate-400 uppercase tracking-wider bg-slate-50 dark:bg-slate-800/80 sticky top-0 flex items-center justify-between">
                                <span>{isTh ? 'รายการ SAP Equipment Tag ที่ตรงกัน' : 'Matched SAP Equipment Tags'}</span>
                                <span className="font-mono text-[9px] text-blue-600">SAP Live Sync</span>
                              </div>
                              {EQUIPMENT_OPTIONS.filter(opt =>
                                opt.id.toLowerCase().includes(equipmentId.toLowerCase()) ||
                                opt.name.toLowerCase().includes(equipmentId.toLowerCase())
                              ).map((opt) => (
                                <button
                                  key={opt.id}
                                  type="button"
                                  onClick={() => {
                                    setEquipmentId(opt.id);
                                    setFunctionalLocation(opt.funcLoc);
                                    setIsEquipmentDropdownOpen(false);
                                  }}
                                  className="w-full p-2.5 text-left hover:bg-blue-50 dark:hover:bg-slate-700/60 transition-colors flex items-center justify-between text-xs cursor-pointer group"
                                >
                                  <div>
                                    <span className="font-mono font-bold text-blue-600 dark:text-blue-400 group-hover:underline">
                                      {opt.id}
                                    </span>
                                    <span className="text-slate-700 dark:text-slate-200 ml-2 font-medium">
                                      {opt.name}
                                    </span>
                                  </div>
                                  <span className="text-[10px] text-slate-400 font-mono hidden sm:inline">
                                    {opt.funcLoc.split(' ')[0]}
                                  </span>
                                </button>
                              ))}
                            </div>
                          </>
                        )}
                      </div>

                      {/* 6. Job description (Text input, Requestor, Required *) */}
                      <div className="space-y-1.5 md:col-span-2">
                        <div className="flex items-center justify-between">
                          <label className="text-xs font-bold text-slate-800 dark:text-slate-200 block">
                            <span>{isTh ? 'รายละเอียดงาน (Job description) *' : 'Job description *'}</span>
                          </label>
                          <span className="text-[10px] text-slate-400">
                            {jobDescription.length} {isTh ? 'ตัวอักษร' : 'chars'}
                          </span>
                        </div>
                        <input
                          type="text"
                          required
                          value={jobDescription}
                          onChange={(e) => setJobDescription(e.target.value)}
                          placeholder={isTh
                            ? "ระบุรายละเอียดงาน เช่น ถอด Manhole ฝาปิด, ยก Tube Bundle หม้อต้ม 11-E-102B..."
                            : "State lifting scope (e.g. Remove channel head for Column 11-C-101...)"}
                          className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
                        />
                      </div>

                      {/* 7. Work start date/ time (Date, Requestor, Required *) */}
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-800 dark:text-slate-200 block">
                          <span>{isTh ? 'วัน-เวลาเริ่มงาน (Work start date/ time) *' : 'Work start date/ time *'}</span>
                        </label>
                        <div className="grid grid-cols-2 gap-2">
                          <div className="relative">
                            <Calendar size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                            <input
                              type="date"
                              required
                              value={workStartDate}
                              onChange={(e) => {
                                const val = e.target.value;
                                setWorkStartDate(val);
                                if (!workEndDate || workEndDate < val) {
                                  setWorkEndDate(val);
                                }
                              }}
                              className="w-full pl-8 pr-2.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-xs font-mono font-bold"
                            />
                          </div>
                          <div className="relative">
                            <Clock size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                            <input
                              type="time"
                              required
                              value={workStartTime}
                              onChange={(e) => setWorkStartTime(e.target.value)}
                              className="w-full pl-8 pr-2.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-xs font-mono font-bold"
                            />
                          </div>
                        </div>
                      </div>

                      {/* 8. Work end date/ time (Date, Requestor, Required *) */}
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-800 dark:text-slate-200 block">
                          <span>{isTh ? 'วัน-เวลาสิ้นสุดงาน (Work end date/ time) *' : 'Work end date/ time *'}</span>
                        </label>
                        <div className="grid grid-cols-2 gap-2">
                          <div className="relative">
                            <Calendar size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                            <input
                              type="date"
                              required
                              value={workEndDate}
                              onChange={(e) => setWorkEndDate(e.target.value)}
                              className="w-full pl-8 pr-2.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-xs font-mono font-bold"
                            />
                          </div>
                          <div className="relative">
                            <Clock size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                            <input
                              type="time"
                              required
                              value={workEndTime}
                              onChange={(e) => setWorkEndTime(e.target.value)}
                              className="w-full pl-8 pr-2.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-xs font-mono font-bold"
                            />
                          </div>
                        </div>
                      </div>

                      {/* 9. Shift (Dropdown: Day / Night / All day, Requestor, Required *) */}
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-800 dark:text-slate-200 block">
                          <span>{isTh ? 'กะการปฏิบัติงาน (Shift) *' : 'Shift *'}</span>
                        </label>
                        <div className="relative">
                          <select
                            required
                            value={shift}
                            onChange={(e) => setShift(e.target.value as 'Day' | 'Night' | 'All day')}
                            className="w-full px-3.5 pr-9 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 appearance-none cursor-pointer"
                          >
                            {SHIFT_OPTIONS.map((s) => (
                              <option key={s} value={s}>
                                {s === 'Day' ? (isTh ? 'Day (กะกลางวัน: 08:00 - 17:00)' : 'Day') : s === 'Night' ? (isTh ? 'Night (กะกลางคืน: 20:00 - 05:00)' : 'Night') : (isTh ? 'All day (ตลอดทั้งวัน 24 ชม.)' : 'All day')}
                              </option>
                            ))}
                          </select>
                          <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                        </div>
                      </div>

                      {/* 10. Estimated Duration * (Auto-calculated from Start/End Date & Time) */}
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between">
                          <label className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                            <span>{isTh ? 'ระยะเวลาประเมิน (Estimated Duration) *' : 'Estimated Duration *'}</span>
                            <span className="text-[10px] text-blue-600 dark:text-blue-400 font-bold bg-blue-50 dark:bg-blue-950/60 px-1.5 py-0.5 rounded border border-blue-200 dark:border-blue-800">
                              {isTh ? 'คำนวณอัตโนมัติ' : 'Auto'}
                            </span>
                          </label>
                          <div className="flex items-center gap-1">
                            {['4', '8', '12', '24'].map(h => (
                              <button
                                key={h}
                                type="button"
                                onClick={() => {
                                  setEstimatedDuration(h);
                                  setDurationUnit('Hours');
                                }}
                                className={`px-1.5 py-0.5 rounded text-[10px] font-bold border transition-colors cursor-pointer ${estimatedDuration === h && durationUnit === 'Hours'
                                    ? 'bg-blue-600 text-white border-blue-600'
                                    : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                                  }`}
                              >
                                {h}h
                              </button>
                            ))}
                          </div>
                        </div>
                        <div className="relative flex rounded-xl border border-slate-300 dark:border-slate-700 overflow-hidden bg-white dark:bg-slate-800 focus-within:ring-2 focus-within:ring-blue-500/20 focus-within:border-blue-600">
                          <input
                            type="number"
                            min="0.5"
                            step="0.5"
                            max="720"
                            required
                            value={estimatedDuration}
                            onChange={(e) => setEstimatedDuration(e.target.value)}
                            className="w-full px-3.5 py-2.5 text-sm text-slate-900 dark:text-slate-100 bg-transparent focus:outline-none font-bold"
                          />
                          <select
                            value={durationUnit}
                            onChange={(e) => setDurationUnit(e.target.value as 'Hours' | 'Days')}
                            className="bg-slate-100 dark:bg-slate-800/80 border-l border-slate-200 dark:border-slate-700 px-3 text-xs font-bold text-slate-600 dark:text-slate-300 focus:outline-none cursor-pointer"
                          >
                            <option value="Hours">{isTh ? 'ชั่วโมง' : 'Hours'}</option>
                            <option value="Days">{isTh ? 'วัน' : 'Days'}</option>
                          </select>
                        </div>
                      </div>

                    </div>
                  </div>

                  {/* STEP 2: CRANE REQUIREMENTS & TECHNICAL SPECIFICATION */}
                  <div className="p-4 sm:p-5 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-700/80 space-y-4">
                    <div className="flex items-center justify-between pb-1 border-b border-slate-200/60 dark:border-slate-700/60">
                      <div className="flex items-center gap-2">
                        <Truck size={15} className="text-blue-600 dark:text-blue-400" />
                        <h3 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
                          Step 2: {isTh ? 'ข้อกำหนดเครื่องจักรเครนและสเปกทางวิศวกรรม (Crane Technical Specs)' : 'Crane Technical Specs & Capacity'}
                        </h3>
                      </div>
                      <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300">
                        Technical Specs (*)
                      </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-4">

                      {/* Crane Type * : Crane Spot, Crane Pull (Kept as requested) */}
                      <div className="space-y-2 md:col-span-2">
                        <label className="text-xs font-bold text-slate-800 dark:text-slate-200 block">
                          <span>{isTh ? 'รูปแบบการใช้งานเครน (Crane Type) *' : 'Crane Type *'}</span>
                        </label>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          {/* Option 1: Crane Spot */}
                          <button
                            type="button"
                            onClick={() => setCraneType('Crane Spot')}
                            className={`w-full p-3.5 rounded-xl border-2 flex items-center justify-between transition-all cursor-pointer text-left select-none min-h-[68px] ${craneType === 'Crane Spot'
                                ? 'border-blue-600 bg-blue-50/80 dark:bg-blue-950/40 text-blue-950 dark:text-blue-100 ring-2 ring-blue-500/20 shadow-sm'
                                : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                              }`}
                          >
                            <div className="flex items-center gap-3 min-w-0 flex-1">
                              <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-xs shrink-0 transition-colors ${craneType === 'Crane Spot'
                                  ? 'bg-blue-600 text-white shadow-xs'
                                  : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                                }`}>
                                <ArrowDownUp size={18} />
                              </div>
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-2">
                                  <span className="text-xs sm:text-sm font-bold text-slate-900 dark:text-slate-100 truncate">Crane Spot</span>
                                  <span className="text-[11px] font-semibold text-amber-600 dark:text-amber-400 shrink-0">
                                    {isTh ? '(ยกแนวดิ่ง)' : '(Vertical Lift)'}
                                  </span>
                                </div>
                                <span className="text-[11px] text-slate-500 dark:text-slate-400 block truncate mt-0.5">
                                  {isTh ? 'งานยกชิ้นงานขึ้นลงแนวดิ่ง ติดตั้งประจำจุด' : 'Precision vertical heavy lift & positioning'}
                                </span>
                              </div>
                            </div>
                            <div className="w-5 h-5 flex items-center justify-center shrink-0 ml-2">
                              {craneType === 'Crane Spot' && (
                                <CheckCircle2 size={18} className="text-blue-600 dark:text-blue-400" />
                              )}
                            </div>
                          </button>

                          {/* Option 2: Crane Pull */}
                          <button
                            type="button"
                            onClick={() => setCraneType('Crane Pull')}
                            className={`w-full p-3.5 rounded-xl border-2 flex items-center justify-between transition-all cursor-pointer text-left select-none min-h-[68px] ${craneType === 'Crane Pull'
                                ? 'border-blue-600 bg-blue-50/80 dark:bg-blue-950/40 text-blue-950 dark:text-blue-100 ring-2 ring-blue-500/20 shadow-sm'
                                : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                              }`}
                          >
                            <div className="flex items-center gap-3 min-w-0 flex-1">
                              <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-xs shrink-0 transition-colors ${craneType === 'Crane Pull'
                                  ? 'bg-blue-600 text-white shadow-xs'
                                  : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                                }`}>
                                <MoveHorizontal size={18} />
                              </div>
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-2">
                                  <span className="text-xs sm:text-sm font-bold text-slate-900 dark:text-slate-100 truncate">Crane Pull</span>
                                  <span className="text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 shrink-0">
                                    {isTh ? '(ดึงไส้ท่อ / ลากแนวนอน)' : '(Winch Pull)'}
                                  </span>
                                </div>
                                <span className="text-[11px] text-slate-500 dark:text-slate-400 block truncate mt-0.5">
                                  {isTh ? 'งานใช้กว้านสลิงดึง Tube Bundle และลากแนวนอน' : 'Winch traction & bundle extraction'}
                                </span>
                              </div>
                            </div>
                            <div className="w-5 h-5 flex items-center justify-center shrink-0 ml-2">
                              {craneType === 'Crane Pull' && (
                                <CheckCircle2 size={18} className="text-blue-600 dark:text-blue-400" />
                              )}
                            </div>
                          </button>
                        </div>
                      </div>

                      {/* Crane Type Model / Spec (Text input, Requestor, Required *) */}
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-800 dark:text-slate-200 block">
                          <span>{isTh ? 'รุ่น/สเปกเครน (Crane type) *' : 'Crane type (Model) *'}</span>
                          <span className="text-[10px] text-slate-400 ml-1.5 font-normal">(Ex. GR-250N, GR-500EXL)</span>
                        </label>
                        <input
                          type="text"
                          required
                          value={craneModel}
                          onChange={(e) => setCraneModel(e.target.value)}
                          placeholder="e.g. GR-250N, GR-500EXL, LTM 1300"
                          className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
                        />
                      </div>

                      {/* Capacity required (ton) (Number/Dropdown: 8/10/25/50/80/100/120/160/200/360/400/500 Tons, Requestor, Required *) */}
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between">
                          <label className="text-xs font-bold text-slate-800 dark:text-slate-200 block">
                            <span>{isTh ? 'พิกัดน้ำหนักเครน (Capacity required) *' : 'Capacity required (ton) *'}</span>
                          </label>
                          <span className="text-[10px] text-blue-600 dark:text-blue-400 font-bold">
                            {capacityRequired} Tons
                          </span>
                        </div>
                        <div className="relative">
                          <select
                            required
                            value={capacityRequired}
                            onChange={(e) => {
                              setCapacityRequired(e.target.value);
                              setCraneCapacity(e.target.value);
                            }}
                            className="w-full px-3.5 pr-9 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 appearance-none cursor-pointer"
                          >
                            {CAPACITY_REQUIRED_OPTIONS.map((cap) => (
                              <option key={cap} value={cap}>
                                {cap} Tons
                              </option>
                            ))}
                          </select>
                          <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                        </div>
                      </div>

                      {/* Resource / Provider Type * (Kept as requested) */}
                      <div className="space-y-2 md:col-span-2">
                        <label className="text-xs font-bold text-slate-800 dark:text-slate-200 block">
                          <span>{isTh ? 'แหล่งที่มาของเครื่องจักร (Resource / Provider Type) *' : 'Resource / Provider Type *'}</span>
                        </label>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <button
                            type="button"
                            onClick={() => setProviderType('Owner Crane')}
                            className={`w-full p-3 rounded-xl border-2 flex items-center justify-between transition-all cursor-pointer text-left select-none ${providerType === 'Owner Crane'
                                ? 'border-blue-600 bg-blue-50/80 dark:bg-blue-950/40 text-blue-900 dark:text-blue-100 ring-2 ring-blue-500/20 shadow-sm'
                                : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/80 hover:border-slate-300 text-slate-700 dark:text-slate-300'
                              }`}
                          >
                            <div className="flex items-center gap-3 min-w-0 flex-1">
                              <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xs shrink-0 transition-colors ${providerType === 'Owner Crane'
                                  ? 'bg-blue-600 text-white shadow-xs'
                                  : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                                }`}>
                                BCP
                              </div>
                              <div className="min-w-0 flex-1">
                                <span className="text-xs font-bold block text-slate-900 dark:text-white truncate">
                                  Owner Crane (เครนเจ้าของงาน)
                                </span>
                                <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
                                  {isTh ? 'เครนภายในของ BCP จัดสรรโดยหน่วยงานกลาง' : 'BCP internal fleet'}
                                </p>
                              </div>
                            </div>
                            <div className="w-5 h-5 flex items-center justify-center shrink-0 ml-2">
                              {providerType === 'Owner Crane' && (
                                <CheckCircle2 size={18} className="text-blue-600 dark:text-blue-400" />
                              )}
                            </div>
                          </button>

                          <button
                            type="button"
                            onClick={() => setProviderType('Contractor Crane')}
                            className={`w-full p-3 rounded-xl border-2 flex items-center justify-between transition-all cursor-pointer text-left select-none ${providerType === 'Contractor Crane'
                                ? 'border-blue-600 bg-blue-50/80 dark:bg-blue-950/40 text-blue-900 dark:text-blue-100 ring-2 ring-blue-500/20 shadow-sm'
                                : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/80 hover:border-slate-300 text-slate-700 dark:text-slate-300'
                              }`}
                          >
                            <div className="flex items-center gap-3 min-w-0 flex-1">
                              <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xs shrink-0 transition-colors ${providerType === 'Contractor Crane'
                                  ? 'bg-blue-600 text-white shadow-xs'
                                  : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                                }`}>
                                EXT
                              </div>
                              <div className="min-w-0 flex-1">
                                <span className="text-xs font-bold block text-slate-900 dark:text-white truncate">
                                  Contractor Crane (เครนผู้รับเหมา)
                                </span>
                                <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
                                  {isTh ? 'จัดหาโดยผู้รับเหมา พร้อมใบรับรอง ปจ.2' : 'Third-party contractor machinery'}
                                </p>
                              </div>
                            </div>
                            <div className="w-5 h-5 flex items-center justify-center shrink-0 ml-2">
                              {providerType === 'Contractor Crane' && (
                                <CheckCircle2 size={18} className="text-blue-600 dark:text-blue-400" />
                              )}
                            </div>
                          </button>
                        </div>
                      </div>

                      {/* Boom length (m) (Number, Requestor, Required *) */}
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-800 dark:text-slate-200 block">
                          <span>{isTh ? 'ความยาวบูม (Boom length) *' : 'Boom length (m) *'}</span>
                        </label>
                        <div className="relative flex rounded-xl border border-slate-300 dark:border-slate-700 overflow-hidden bg-white dark:bg-slate-800 focus-within:ring-2 focus-within:ring-blue-500/20 focus-within:border-blue-600">
                          <input
                            type="number"
                            step="0.1"
                            required
                            value={boomLength}
                            onChange={(e) => setBoomLength(e.target.value)}
                            placeholder="e.g. 33.5"
                            className="w-full px-3.5 py-2.5 text-sm text-slate-900 dark:text-slate-100 bg-transparent focus:outline-none font-bold"
                          />
                          <span className="inline-flex items-center px-3.5 bg-slate-100 dark:bg-slate-800/80 border-l border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-600 dark:text-slate-300 shrink-0">
                            m
                          </span>
                        </div>
                      </div>

                      {/* Working radius (m) (Number, Requestor, Required *) */}
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-800 dark:text-slate-200 block">
                          <span>{isTh ? 'รัศมีการทำงาน (Working radius) *' : 'Working radius (m) *'}</span>
                        </label>
                        <div className="relative flex rounded-xl border border-slate-300 dark:border-slate-700 overflow-hidden bg-white dark:bg-slate-800 focus-within:ring-2 focus-within:ring-blue-500/20 focus-within:border-blue-600">
                          <input
                            type="number"
                            step="0.1"
                            required
                            value={workingRadius}
                            onChange={(e) => setWorkingRadius(e.target.value)}
                            placeholder="e.g. 14.0"
                            className="w-full px-3.5 py-2.5 text-sm text-slate-900 dark:text-slate-100 bg-transparent focus:outline-none font-bold"
                          />
                          <span className="inline-flex items-center px-3.5 bg-slate-100 dark:bg-slate-800/80 border-l border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-600 dark:text-slate-300 shrink-0">
                            m
                          </span>
                        </div>
                      </div>

                      {/* Total weight (ton) (Number, Requestor, Required *) */}
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-800 dark:text-slate-200 block">
                          <span>{isTh ? 'น้ำหนักรวมที่จะยก (Total weight) *' : 'Total weight (ton) *'}</span>
                        </label>
                        <div className="relative flex rounded-xl border border-slate-300 dark:border-slate-700 overflow-hidden bg-white dark:bg-slate-800 focus-within:ring-2 focus-within:ring-blue-500/20 focus-within:border-blue-600">
                          <input
                            type="number"
                            step="0.1"
                            required
                            value={totalWeight}
                            onChange={(e) => setTotalWeight(e.target.value)}
                            placeholder="e.g. 18.5"
                            className="w-full px-3.5 py-2.5 text-sm text-slate-900 dark:text-slate-100 bg-transparent focus:outline-none font-bold"
                          />
                          <span className="inline-flex items-center px-3.5 bg-slate-100 dark:bg-slate-800/80 border-l border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-600 dark:text-slate-300 shrink-0">
                            ton
                          </span>
                        </div>
                      </div>

                      {/* Additional remarks (Text area, Requestor, Optional N) */}
                      <div className="space-y-1.5 md:col-span-2">
                        <label className="text-xs font-bold text-slate-800 dark:text-slate-200 block">
                          <span>{isTh ? 'หมายเหตุเพิ่มเติม (Additional remarks)' : 'Additional remarks'}</span>
                          <span className="text-[10px] text-slate-400 font-normal ml-1">({isTh ? 'ไม่บังคับ' : 'Optional'})</span>
                        </label>
                        <textarea
                          rows={2}
                          value={additionalRemarks}
                          onChange={(e) => setAdditionalRemarks(e.target.value)}
                          placeholder={isTh ? 'ระบุข้อจำกัดหน้างานเพิ่มเติม เช่น พื้นผิวบดอัด, ติดแนวท่อ, สภาพอากาศ...' : 'Additional remarks or special rigging instructions...'}
                          className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
                        />
                      </div>

                    </div>
                  </div>

                  {/* STEP 2.5: PLANNER / SCHEDULER / OPTIMIZER REVIEW & SYSTEM STATUS (Hidden as requested) */}
                  {false && (
                    <div className="p-4 sm:p-5 rounded-2xl bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-200/80 dark:border-indigo-900/60 space-y-4">
                      <div className="flex items-center justify-between pb-1 border-b border-indigo-200/60 dark:border-indigo-800/60">
                        <div className="flex items-center gap-2">
                          <ShieldCheck size={16} className="text-indigo-600 dark:text-indigo-400" />
                          <h3 className="text-xs font-bold text-indigo-950 dark:text-indigo-200 uppercase tracking-wider">
                            {isTh ? 'ส่วนการตรวจสอบและจัดสรร (Planner / Scheduler / Optimizer)' : 'Planner / Scheduler / Optimizer Review'}
                          </h3>
                        </div>
                        <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-900 text-indigo-800 dark:text-indigo-300">
                          System & Optimizer (*)
                        </span>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-4 gap-y-4">

                        {/* Submitted by (Auto, Required *) */}
                        <div className="space-y-1">
                          <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block">
                            <span>{isTh ? 'ผู้ส่งคำขอ (Submitted by) *' : 'Submitted by *'}</span>
                            <span className="text-[10px] text-emerald-600 font-bold ml-1">(Auto)</span>
                          </label>
                          <div className="px-3.5 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center justify-between">
                            <span className="truncate">{submittedBy}</span>
                            <CheckCircle2 size={14} className="text-emerald-500 shrink-0 ml-1" />
                          </div>
                        </div>

                        {/* Submission date (Auto, Required *) */}
                        <div className="space-y-1">
                          <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block">
                            <span>{isTh ? 'วันที่ส่งคำขอ (Submission date) *' : 'Submission date *'}</span>
                            <span className="text-[10px] text-emerald-600 font-bold ml-1">(Auto)</span>
                          </label>
                          <div className="px-3.5 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-mono font-bold text-slate-800 dark:text-slate-200 flex items-center justify-between">
                            <span>{submissionDate}</span>
                            <Calendar size={14} className="text-slate-400 shrink-0 ml-1" />
                          </div>
                        </div>

                        {/* Status (Auto: Draft/ Submitted/ Rejected/ Reviewed/ Optimized, Required *) */}
                        <div className="space-y-1">
                          <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block">
                            <span>{isTh ? 'สถานะคำขอ (Status) *' : 'Status *'}</span>
                            <span className="text-[10px] text-emerald-600 font-bold ml-1">(Auto)</span>
                          </label>
                          <div className="relative">
                            <select
                              value={jobStatus}
                              onChange={(e) => setJobStatus(e.target.value as any)}
                              className="w-full px-3.5 pr-8 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-black text-blue-700 dark:text-blue-300 focus:outline-none appearance-none cursor-pointer"
                            >
                              {CRANE_STATUS_OPTIONS.map((st) => (
                                <option key={st} value={st}>
                                  {st}
                                </option>
                              ))}
                            </select>
                            <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                          </div>
                        </div>

                        {/* Review by (Dropdown: Planner/ Scheduler/ Optimizer, Required *) */}
                        <div className="space-y-1 md:col-span-2 lg:col-span-1">
                          <label className="text-xs font-bold text-slate-800 dark:text-slate-200 block">
                            <span>{isTh ? 'ผู้ตรวจสอบ (Review by) *' : 'Review by *'}</span>
                          </label>
                          <div className="relative">
                            <select
                              required
                              value={reviewBy}
                              onChange={(e) => setReviewBy(e.target.value)}
                              className="w-full px-3.5 pr-8 py-2 rounded-xl border border-indigo-300 dark:border-indigo-700 bg-white dark:bg-slate-800 text-xs font-bold text-slate-900 dark:text-slate-100 focus:outline-none appearance-none cursor-pointer"
                            >
                              {REVIEW_BY_OPTIONS.map((rev) => (
                                <option key={rev} value={rev}>
                                  {rev}
                                </option>
                              ))}
                            </select>
                            <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                          </div>
                        </div>

                        {/* Optimize with (Dropdown: Select crane ID or Req. no. in Task list, Required *) */}
                        <div className="space-y-1 md:col-span-2">
                          <label className="text-xs font-bold text-slate-800 dark:text-slate-200 block">
                            <span>{isTh ? 'จัดสรรร่วมกับ (Optimize with) *' : 'Optimize with *'}</span>
                            <span className="text-[10px] text-indigo-600 dark:text-indigo-400 font-normal ml-1">
                              (Select crane ID or Req. no. in Task list)
                            </span>
                          </label>
                          <div className="relative">
                            <select
                              required
                              value={optimizeWith}
                              onChange={(e) => setOptimizeWith(e.target.value)}
                              className="w-full px-3.5 pr-8 py-2 rounded-xl border border-indigo-300 dark:border-indigo-700 bg-white dark:bg-slate-800 text-xs font-bold text-indigo-900 dark:text-indigo-200 focus:outline-none appearance-none cursor-pointer"
                            >
                              {OPTIMIZE_WITH_OPTIONS.map((opt) => (
                                <option key={opt} value={opt}>
                                  {opt}
                                </option>
                              ))}
                            </select>
                            <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                          </div>
                        </div>

                        {/* Review notes (Text area, Planner/ Scheduler/ Optimizer, Optional N) */}
                        <div className="space-y-1 md:col-span-2 lg:col-span-3">
                          <label className="text-xs font-bold text-slate-800 dark:text-slate-200 block">
                            <span>{isTh ? 'บันทึกการตรวจสอบ (Review notes)' : 'Review notes'}</span>
                            <span className="text-[10px] text-slate-400 font-normal ml-1">({isTh ? 'ไม่บังคับ' : 'Optional'})</span>
                          </label>
                          <textarea
                            rows={2}
                            value={reviewNotes}
                            onChange={(e) => setReviewNotes(e.target.value)}
                            placeholder={isTh ? 'ระบุบันทึกการตรวจสอบความปลอดภัย การประสานงาน หรือเงื่อนไขของ Planner/Optimizer...' : 'Notes from Planner / Scheduler / Optimizer...'}
                            className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                          />
                        </div>

                      </div>
                    </div>
                  )}

                  {/* STEP 3: PLOT PLAN LOCATION & PINNING */}
                  <div className="p-4 sm:p-5 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-700/80 space-y-4">
                    <div className="flex items-center justify-between pb-1 border-b border-slate-200/60 dark:border-slate-700/60">
                      <div className="flex items-center gap-2">
                        <MapPin size={15} className="text-blue-600 dark:text-blue-400" />
                        <h3 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
                          {isTh ? 'Step 3: ตำแหน่งหน้างานบนผังโรงกลั่น (Plot Plan Pinning)' : 'Step 3: Plot Plan Pinning & Footprint'}
                        </h3>
                      </div>
                      <button
                        type="button"
                        onClick={() => setShowPlotPlanPinning(!showPlotPlanPinning)}
                        className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 cursor-pointer"
                      >
                        <span>{showPlotPlanPinning ? (isTh ? 'ซ่อนผังพิกัด' : 'Hide Plot Map') : (isTh ? '+ เปิดผังมาร์คพิกัด' : '+ Open Plot Map')}</span>
                        {showPlotPlanPinning ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                      </button>
                    </div>

                    {showPlotPlanPinning && (
                      <PlotPlanPinningSection
                        markingType={markingType}
                        onMarkingTypeChange={setMarkingType}
                        pin={jobPin}
                        onPinChange={setJobPin}
                        scaleBlock={scaleBlock}
                        onScaleBlockChange={setScaleBlock}
                        isTh={isTh}
                        equipmentId={equipmentId}
                        isScaffolding={isScaffolding}
                        craneCapacity={craneCapacity}
                      />
                    )}
                  </div>

                  {/* STEP 4: ATTACHMENTS & LIFTING PLAN DOCUMENTS */}
                  <div className="p-4 sm:p-5 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-700/80 space-y-4">
                    <JobAttachmentSection
                      attachments={singleAttachments}
                      onAddAttachment={(att) => setSingleAttachments(prev => [...prev, att])}
                      onRemoveAttachment={(id) => setSingleAttachments(prev => prev.filter(a => a.id !== id))}
                      isTh={isTh}
                      title={isTh ? 'Step 4: เอกสารแนบและใบอนุญาตการยก (Attachments & PTW)' : 'Step 4: Attachments & Lifting Plan Documents'}
                      description={isTh ? 'แนบแผนการยก (Lifting Plan), ใบอนุญาต PTW, เอกสาร ปจ.2 หรือภาพถ่ายหน้างาน' : 'Attach Lifting Plan, Permit-to-Work (PTW), Machine Cert (Phor.Jor.2), or site photos.'}
                    />
                  </div>

                  {/* Form Actions Footer */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={handleFillSample}
                        className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                      >
                        {isTh ? 'เติมตัวอย่างข้อมูล (Sample)' : 'Fill Sample'}
                      </button>

                      <button
                        type="button"
                        onClick={handleCancel}
                        className="px-4 py-2 rounded-xl text-xs font-bold text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
                      >
                        {isTh ? 'ยกเลิก' : 'Cancel'}
                      </button>
                    </div>

                    <button
                      type="submit"
                      className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-all shadow-md shadow-blue-500/20 flex items-center justify-center gap-2 cursor-pointer active:scale-95"
                    >
                      <QrCode size={16} />
                      <span>{isTh ? 'บันทึกและสร้าง QR Code หน้างาน' : 'Create Job & Generate QR'}</span>
                    </button>
                  </div>

                </form>
              </div>

              {/* Right 1 Col: Live QR Code & Summary Card (Identical structure to Job Location & Turnover) */}
              <div className="space-y-6">

                {/* On-Site QR Box */}
                <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-6 flex flex-col items-center justify-center text-center space-y-4">
                  <div className="w-12 h-12 rounded-2xl bg-blue-100 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center shadow-xs">
                    <QrCode size={26} />
                  </div>

                  <div>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                      {isTh ? 'QR Code ประจำคำขอเครนหน้างาน' : 'On-Site Crane Job QR Code'}
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-xs">
                      {isTh
                        ? 'เจ้าหน้าที่หน้างานหรือผู้ควบคุมเครนสามารถสแกน QR Code เพื่อเปิดดูแผนการยก ตรวจสอบความปลอดภัย และอัปเดตสถานะงานได้ทันที'
                        : 'Field rigging teams can scan this QR code on-site to inspect the lifting plan, safety checklist, and update work progress.'}
                    </p>
                  </div>

                  {createdJobLinkInfo ? (
                    <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700 w-full space-y-4 animate-in zoom-in-95 duration-200">
                      <div className="flex justify-center p-3 bg-white rounded-xl shadow-xs border border-slate-200 max-w-[180px] mx-auto">
                        <QRCodeSVG id="crane-job-qr-code-svg" value={createdJobLinkInfo.url} size={150} />
                      </div>

                      <div className="space-y-1">
                        <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                          {isTh ? 'หมายเลขอ้างอิงคำขอ' : 'Generated Request Reference'}
                        </span>
                        <div className="font-mono text-sm font-bold text-blue-600 dark:text-blue-400">
                          {createdJobLinkInfo.jobNo}
                        </div>
                      </div>

                      <div className="p-2.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-[11px] font-mono text-slate-600 dark:text-slate-300 break-all select-all flex items-center justify-between gap-2">
                        <LinkIcon size={14} className="shrink-0 text-slate-400" />
                        <span className="truncate">{createdJobLinkInfo.url}</span>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={handleDownloadQR}
                          className="flex-1 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                        >
                          <Download size={14} />
                          <span>{isTh ? 'บันทึกรูป QR' : 'Download'}</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            if (onNavigateToRequests) {
                              onNavigateToRequests();
                            } else {
                              navigateToCraneView({ view: 'list', jobId: createdJobLinkInfo.id });
                            }
                          }}
                          className="flex-1 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 shadow-xs transition-colors cursor-pointer"
                        >
                          <span>{isTh ? 'เปิดดูคำขอ' : 'View Job'}</span>
                          <ArrowRight size={14} />
                        </button>
                      </div>

                      {/* Cross-function Quick Jump Links */}
                      <div className="grid grid-cols-3 gap-1.5 pt-1 border-t border-slate-200/80 dark:border-slate-700/80">
                        <button
                          type="button"
                          onClick={() => navigateToCraneView({ view: 'plan', jobId: createdJobLinkInfo.id, plant: selectedPlant === 'Phra Khanong' ? 'Phra Khanong' : 'Sriracha' })}
                          className="py-1.5 px-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 text-[11px] font-bold flex items-center justify-center gap-1 transition-all cursor-pointer shadow-2xs"
                        >
                          <span>ผัง Plot Plan</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => navigateToCraneView({ view: 'calendar', jobId: createdJobLinkInfo.id, date: workStartDate })}
                          className="py-1.5 px-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 text-[11px] font-bold flex items-center justify-center gap-1 transition-all cursor-pointer shadow-2xs"
                        >
                          <span>ปฏิทิน Calendar</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => navigateToCraneView({ view: 'optimize', jobId: createdJobLinkInfo.id })}
                          className="py-1.5 px-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 text-[11px] font-bold flex items-center justify-center gap-1 transition-all cursor-pointer shadow-2xs"
                        >
                          <span>จัดสรร Optimizer</span>
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="p-6 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-dashed border-slate-300 dark:border-slate-700 w-full text-xs text-slate-400 flex flex-col items-center justify-center space-y-2">
                      <div className="w-24 h-24 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 flex items-center justify-center text-slate-300">
                        <QrCode size={48} className="opacity-40" />
                      </div>
                      <span>{isTh ? 'กด "บันทึกและสร้าง QR Code หน้างาน" เพื่อออก QR และลิงก์สำหรับหน้างาน' : 'Fill the form and submit to generate the on-site QR Code and direct link.'}</span>
                    </div>
                  )}
                </div>

                {/* Live Specification Summary Card */}
                <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-5 space-y-3.5">
                  <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2.5">
                    <span className="text-xs font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider flex items-center gap-1.5">
                      <ClipboardList size={14} className="text-blue-600" />
                      <span>{isTh ? 'สรุปข้อมูลคำขอ' : 'Live Request Summary'}</span>
                    </span>
                    <span className={`font-mono text-[10px] font-bold px-2 py-0.5 rounded border ${
                      jobStatus === 'Submitted'
                        ? 'bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-900'
                        : jobStatus === 'Optimized'
                        ? 'bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-900'
                        : jobStatus === 'Reviewed'
                        ? 'bg-purple-50 dark:bg-purple-950 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-900'
                        : 'bg-slate-100 text-slate-700 border-slate-200'
                    }`}>
                      {jobStatus}
                    </span>
                  </div>

                  <div className="space-y-2 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">{isTh ? 'เลขที่ใบสั่งงาน (WO):' : 'WO Number:'}</span>
                      <span className="font-mono font-bold text-blue-600 dark:text-blue-400">{woNumber || '-'}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">{isTh ? 'รหัสอุปกรณ์:' : 'Equipment Tag:'}</span>
                      <span className="font-mono font-bold text-slate-800 dark:text-slate-200">{equipmentId || '-'}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">{isTh ? 'พื้นที่ / สาขา:' : 'Area / Trade:'}</span>
                      <span className="font-semibold text-slate-700 dark:text-slate-300 text-right truncate max-w-[170px]" title={locationArea}>
                        {locationArea.split(' - ')[0]} • {tradeSession}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">{isTh ? 'กำหนดเวลา & กะ:' : 'Schedule & Shift:'}</span>
                      <span className="font-mono text-slate-700 dark:text-slate-300">
                        {workStartDate || '-'} ({shift}, {estimatedDuration} {durationUnit})
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">{isTh ? 'ประเภท & รุ่นเครน:' : 'Crane Type & Model:'}</span>
                      <span className="font-bold text-blue-600 dark:text-blue-400 truncate max-w-[170px]" title={`${craneType} - ${craneModel || '-'}`}>
                        {craneType} {craneModel ? `(${craneModel})` : ''}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">{isTh ? 'พิกัด / น้ำหนักยก:' : 'Capacity / Weight:'}</span>
                      <span className="font-bold text-slate-800 dark:text-slate-200">
                        {capacityRequired}T / <span className="text-amber-600">{totalWeight || '0'}T</span>
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">{isTh ? 'ความยาวบูม / รัศมี:' : 'Boom / Radius:'}</span>
                      <span className="font-mono text-slate-700 dark:text-slate-300">
                        B: {boomLength || '0'}m • R: {workingRadius || '0'}m
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">{isTh ? 'แหล่งเครื่องจักร:' : 'Provider Type:'}</span>
                      <span className="font-medium text-slate-700 dark:text-slate-300">
                        {providerType === 'Owner Crane' ? 'Owner (BCP)' : 'Contractor'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">{isTh ? 'ผู้ตรวจสอบ:' : 'Review By:'}</span>
                      <span className="font-medium text-indigo-600 dark:text-indigo-400 truncate max-w-[160px]" title={reviewBy}>
                        {reviewBy.split(' (')[0]}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">{isTh ? 'จัดสรรร่วมกับ:' : 'Optimize With:'}</span>
                      <span className="font-medium text-indigo-700 dark:text-indigo-300 truncate max-w-[160px]" title={optimizeWith}>
                        {optimizeWith.split(' (')[0]}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Heavy Lift Safety & Readiness Checklist */}
                <div className="bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 space-y-3">
                  <div className="flex items-center gap-2">
                    <ShieldCheck size={16} className="text-emerald-600 dark:text-emerald-400" />
                    <span className="text-xs font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider">
                      {isTh ? 'รายการตรวจสอบความพร้อมก่อนเริ่มยก' : 'Lifting Safety Prerequisites'}
                    </span>
                  </div>
                  <div className="space-y-2 text-xs">
                    <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-400 font-medium">
                      <CheckCircle2 size={14} className="shrink-0" />
                      <span>{isTh ? '1.25x Crane Load Safety Factor Verified' : '1.25x Crane Safety Margin'}</span>
                    </div>
                    <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-400 font-medium">
                      <CheckCircle2 size={14} className="shrink-0" />
                      <span>{isTh ? 'Ground Matting & Outrigger Pad Ready' : 'Ground Bearing Capacity Checked'}</span>
                    </div>
                    <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-400 font-medium">
                      <CheckCircle2 size={14} className="shrink-0" />
                      <span>{isTh ? 'Barricaded Exclusion Zone & Tag Lines' : 'Exclusion Perimeter Barricaded'}</span>
                    </div>
                    <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
                      <Clock size={14} className="shrink-0 text-amber-500" />
                      <span>{isTh ? 'Permit to Work (PTW) Final Endorsement' : 'PTW Rigging Endorsement'}</span>
                    </div>
                  </div>
                </div>

              </div>

            </div>
          )}

        </div>
      )}

      {/* SUBMISSION SUCCESS MODAL */}
      {submittedSummary && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-lg w-full shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 text-center p-6 space-y-4">
            <div className="w-14 h-14 bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 rounded-2xl flex items-center justify-center mx-auto shadow-inner">
              <CheckCircle2 size={32} />
            </div>

            <div>
              <h3 className="text-lg font-black text-slate-900 dark:text-white">
                {isTh ? 'บันทึกคำขอเปิดงานสำเร็จ!' : 'Job Request Successfully Submitted!'}
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                {isTh
                  ? `ระบบได้สร้าง ${submittedSummary.count} รายการคำขอใหม่เรียบร้อยแล้ว`
                  : `Successfully created ${submittedSummary.count} job request(s) in status 'Requested'.`}
              </p>
            </div>

            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 max-h-36 overflow-y-auto text-left">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                Generated Job Request Numbers:
              </span>
              <div className="flex flex-wrap gap-1.5">
                {submittedSummary.jobNumbers.map(no => (
                  <span key={no} className="font-mono text-xs font-bold px-2 py-0.5 rounded-md bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-900">
                    {no}
                  </span>
                ))}
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setSubmittedSummary(null)}
                className="px-3.5 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                {isTh ? 'สร้างรายการอื่นต่อ' : 'Create More Jobs'}
              </button>

              <button
                type="button"
                onClick={() => {
                  const targetJob = submittedSummary.jobNumbers[0];
                  setSubmittedSummary(null);
                  navigateToCraneView({ view: 'job-list', jobId: targetJob });
                  if (setActiveView) setActiveView('job-list');
                  else if (onNavigateToRequests) onNavigateToRequests();
                }}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer shadow-md"
              >
                <FileText size={13} />
                <span>{isTh ? 'ไปที่ทะเบียนงาน (Job List)' : 'Go to Job List'}</span>
                <ArrowRight size={13} />
              </button>

              <button
                type="button"
                onClick={() => {
                  const targetJob = submittedSummary.jobNumbers[0];
                  setSubmittedSummary(null);
                  navigateToCraneView({ view: 'optimize', jobId: targetJob });
                  if (setActiveView) setActiveView('optimize');
                }}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer shadow-md"
              >
                <Sparkles size={13} />
                <span>{isTh ? 'จัดสรรเครน (Review & Optimize)' : 'Review & Optimize'}</span>
                <ArrowRight size={13} />
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
