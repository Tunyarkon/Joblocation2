import React, { useState, useMemo } from 'react';
import {
  Sparkles, ArrowLeft, CheckCircle2, AlertTriangle, Clock, Truck,
  MapPin, FileText, ChevronRight, ChevronDown, ShieldCheck, X,
  RotateCcw, Lock, Unlock, Search, Filter, AlertOctagon, HelpCircle,
  Calendar, Layers, Check, Info, FileSpreadsheet, Paperclip, Eye,
  Sliders, Maximize2, Compass
} from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import essoPlotPlanBg from '../assets/esso_sriracha_master_plotplan.jpg';
import { useThemeGate, setGlobalThemeGate } from '../utils/themeGate';

// =========================================================================
// TYPES FOR V2 PROTOTYPE (ISOLATED STATE)
// =========================================================================
export interface V2CraneRequest {
  id: string;
  requestNo: string;
  workOrderNo: string;
  title: string;
  contractor: string;
  requester: string;
  plant: 'Phra Khanong' | 'Sriracha';
  area: string;
  requestedDate: string;
  timeSlot: string;
  requiredCapacityTon: number;
  grossLoadTon: number;
  workingRadiusM: number;
  boomLengthM: number;
  groundBearingPressure: number; // t/m²
  allowableGroundBearing: number; // t/m²
  utilizationPercentage: number;
  status: 'Pending Review' | 'Needs Attention' | 'Assigned';
  warningMessage?: string;
  // Checklist verification states
  checklist: {
    jobInfoComplete: boolean;
    documentsAttached: boolean;
    engineeringReviewed: boolean;
    siteLocationReviewed: boolean;
    safetyClearancePassed: boolean;
  };
  // Assignment metadata
  assignedCraneId?: string;
  assignedCraneName?: string;
  assignedAt?: string;
  assignedBy?: string;
  // Plot Plan marker
  markerX: number;
  markerY: number;
}

export interface V2CraneCandidate {
  id: string;
  code: string;
  name: string;
  type: string;
  capacityTon: number;
  currentArea: string;
  availability: 'Available' | 'Conflict' | 'Inspection';
  conflictReason?: string;
  conflictAlternativeSlot?: string;
  suitabilityScore: number; // percentage
  suitabilityNotes: string;
}

// =========================================================================
// REALISTIC MOCK DATA FOR EXPERIMENTAL PROTOTYPE
// =========================================================================
const INITIAL_V2_REQUESTS: V2CraneRequest[] = [
  {
    id: 'REQ-01',
    requestNo: 'CR-2026-0915',
    workOrderNo: 'WO-89104',
    title: 'Heat Exchanger E-1102 Bundle Extraction & Retubing Rigging',
    contractor: 'Thai Rotary Engineering Co., Ltd.',
    requester: 'Somchai V. (Turnaround Rigging Lead)',
    plant: 'Phra Khanong',
    area: 'Area 01: Crude Distillation Unit (CDU-1)',
    requestedDate: '2026-09-28',
    timeSlot: '08:00 - 12:00',
    requiredCapacityTon: 100,
    grossLoadTon: 42.5,
    workingRadiusM: 24.0,
    boomLengthM: 38.5,
    groundBearingPressure: 28.5,
    allowableGroundBearing: 35.0,
    utilizationPercentage: 68.5,
    status: 'Pending Review',
    checklist: {
      jobInfoComplete: true,
      documentsAttached: true,
      engineeringReviewed: false,
      siteLocationReviewed: false,
      safetyClearancePassed: false,
    },
    markerX: 47.5,
    markerY: 38.0,
  },
  {
    id: 'REQ-02',
    requestNo: 'CR-2026-0918',
    workOrderNo: 'WO-89211',
    title: 'Tower Column C-101 Top Head Removal & Internal Demister Lift',
    contractor: 'Crane & Rigging Services Asia',
    requester: 'Wichai T. (Maintenance Supt.)',
    plant: 'Phra Khanong',
    area: 'Area 01: Crude Distillation Unit (CDU-1)',
    requestedDate: '2026-09-28',
    timeSlot: '08:00 - 12:00',
    requiredCapacityTon: 50,
    grossLoadTon: 26.0,
    workingRadiusM: 18.5,
    boomLengthM: 32.0,
    groundBearingPressure: 22.0,
    allowableGroundBearing: 30.0,
    utilizationPercentage: 74.0,
    status: 'Needs Attention',
    warningMessage: 'Schedule Conflict with Crane Kato 50T (CRN-02)',
    checklist: {
      jobInfoComplete: true,
      documentsAttached: true,
      engineeringReviewed: true,
      siteLocationReviewed: true,
      safetyClearancePassed: false,
    },
    markerX: 52.0,
    markerY: 41.5,
  },
  {
    id: 'REQ-03',
    requestNo: 'CR-2026-0922',
    workOrderNo: 'WO-89304',
    title: 'Furnace F-101 Convection Section Tube Bank Heavy Rigging',
    contractor: 'Thai Shinryo Engineering Co., Ltd.',
    requester: 'Narong K. (Mechanical Supt.)',
    plant: 'Phra Khanong',
    area: 'Area 02: Furnaces & Stack Bay',
    requestedDate: '2026-09-29',
    timeSlot: '09:00 - 16:00',
    requiredCapacityTon: 250,
    grossLoadTon: 145.0,
    workingRadiusM: 32.0,
    boomLengthM: 52.0,
    groundBearingPressure: 36.0,
    allowableGroundBearing: 40.0,
    utilizationPercentage: 86.5,
    status: 'Pending Review',
    warningMessage: 'Requires Heavy Lift Engineering Endorsement (>100T)',
    checklist: {
      jobInfoComplete: true,
      documentsAttached: false,
      engineeringReviewed: false,
      siteLocationReviewed: false,
      safetyClearancePassed: false,
    },
    markerX: 62.0,
    markerY: 28.0,
  },
  {
    id: 'REQ-04',
    requestNo: 'CR-2026-0910',
    workOrderNo: 'WO-88762',
    title: 'Emergency Crude Charge Pump Motor Replacement & Alignment',
    contractor: 'BCP In-House Maintenance Team',
    requester: 'Prasert M. (Operations Lead)',
    plant: 'Sriracha',
    area: 'Area 03: Offsite Tank Farm & Jetty',
    requestedDate: '2026-09-27',
    timeSlot: '13:00 - 17:00',
    requiredCapacityTon: 60,
    grossLoadTon: 18.5,
    workingRadiusM: 14.0,
    boomLengthM: 26.0,
    groundBearingPressure: 18.0,
    allowableGroundBearing: 25.0,
    utilizationPercentage: 52.0,
    status: 'Assigned',
    assignedCraneId: 'CRN-05',
    assignedCraneName: 'Zoomlion ZTC600V (60T Mobile)',
    assignedAt: '2026-09-26 14:30',
    assignedBy: 'Somchai V. (Lead Rigging Engineer)',
    checklist: {
      jobInfoComplete: true,
      documentsAttached: true,
      engineeringReviewed: true,
      siteLocationReviewed: true,
      safetyClearancePassed: true,
    },
    markerX: 35.0,
    markerY: 65.0,
  }
];

const INITIAL_CRANE_FLEET: V2CraneCandidate[] = [
  {
    id: 'CRN-01',
    code: 'MC-100-01',
    name: 'Liebherr LTM 1100-4.2',
    type: 'All-Terrain Mobile Crane',
    capacityTon: 100,
    currentArea: 'Phra Khanong Central Yard',
    availability: 'Available',
    suitabilityScore: 94,
    suitabilityNotes: 'Optimal capacity match (100T), full counterweight on site, radius easily reaches 24m.'
  },
  {
    id: 'CRN-02',
    code: 'MC-050-02',
    name: 'Kato NK-500E-V',
    type: 'Hydraulic Truck Crane',
    capacityTon: 50,
    currentArea: 'Area 01 Laydown Pad',
    availability: 'Conflict',
    conflictReason: 'Selected crane is already reserved during this period (08:00 - 12:00) by Job CR-2026-0912.',
    conflictAlternativeSlot: '13:00 - 17:00 (Afternoon window available)',
    suitabilityScore: 78,
    suitabilityNotes: 'Capacity matches 50T requirement, but time slot overlap exists with higher-priority shutdown work.'
  },
  {
    id: 'CRN-03',
    code: 'CC-250-01',
    name: 'Kobelco CKE2500',
    type: 'Heavy Crawler Crane',
    capacityTon: 250,
    currentArea: 'Area 02 Heavy Rigging Pad B',
    availability: 'Available',
    suitabilityScore: 92,
    suitabilityNotes: 'Heavy lift certified, ground mats pre-positioned, boom configuration ready for 32m radius.'
  },
  {
    id: 'CRN-04',
    code: 'RT-080-01',
    name: 'Tadano GR-800EX',
    type: 'Rough Terrain Crane',
    capacityTon: 80,
    currentArea: 'Maintenance Workshop South',
    availability: 'Inspection',
    conflictReason: 'Currently undergoing mandatory annual load cell calibration and rope magnetic NDT inspection.',
    suitabilityScore: 0,
    suitabilityNotes: 'Cannot be dispatched until inspection certificate is cleared by Safety Dept.'
  },
  {
    id: 'CRN-05',
    code: 'MC-060-03',
    name: 'Zoomlion ZTC600V',
    type: 'All-Terrain Mobile Crane',
    capacityTon: 60,
    currentArea: 'Phra Khanong South Staging',
    availability: 'Available',
    suitabilityScore: 88,
    suitabilityNotes: 'Good maneuverability for tight plant corners, ground pressure is well within allowable limit.'
  }
];

interface ReviewPlanOptimizeV2Props {
  onBackToV1: () => void;
}

export default function ReviewPlanOptimizeV2({ onBackToV1 }: ReviewPlanOptimizeV2Props) {
  const { isTh } = useLanguage();
  const isGlobalDark = useThemeGate();

  // Prototype state
  const [requests, setRequests] = useState<V2CraneRequest[]>(INITIAL_V2_REQUESTS);
  const [selectedRequestId, setSelectedRequestId] = useState<string>('REQ-01');
  const [filterStatus, setFilterStatus] = useState<'All' | 'Pending Review' | 'Needs Attention' | 'Assigned'>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');
  
  // Guided 3-Step Workspace Stepper: 1 = Review, 2 = Select Crane, 3 = Confirm
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3>(1);

  // Crane Selection in Step 2
  const [selectedCraneId, setSelectedCraneId] = useState<string>('CRN-01');
  const [proposedTimeSlot, setProposedTimeSlot] = useState<string>('08:00 - 12:00');

  // Collapsible Accordions in Step 1
  const [openAccordion, setOpenAccordion] = useState<string>('engineering');

  // Plot Plan Drawer / Modal
  const [isPlotPlanDrawerOpen, setIsPlotPlanDrawerOpen] = useState<boolean>(false);

  // Post-Assignment Modals
  const [isReassignModalOpen, setIsReassignModalOpen] = useState<boolean>(false);
  const [reassignNewCraneId, setReassignNewCraneId] = useState<string>('CRN-05');
  const [reassignReason, setReassignReason] = useState<string>('');

  const [isUnlockModalOpen, setIsUnlockModalOpen] = useState<boolean>(false);
  const [unlockReason, setUnlockReason] = useState<string>('');

  // Confirmation Success Popup
  const [showSuccessToast, setShowSuccessToast] = useState<string | null>(null);

  // Active Selected Request
  const activeRequest = useMemo(() => {
    return requests.find(r => r.id === selectedRequestId) || requests[0];
  }, [requests, selectedRequestId]);

  // KPI Metrics (Strictly 3 cards)
  const kpiPending = useMemo(() => requests.filter(r => r.status === 'Pending Review').length, [requests]);
  const kpiNeedsAttention = useMemo(() => requests.filter(r => r.status === 'Needs Attention').length, [requests]);
  const kpiAssigned = useMemo(() => requests.filter(r => r.status === 'Assigned').length, [requests]);

  // Filtered Request Queue
  const filteredRequests = useMemo(() => {
    return requests.filter(r => {
      if (filterStatus !== 'All' && r.status !== filterStatus) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const text = `${r.requestNo} ${r.workOrderNo} ${r.title} ${r.area} ${r.contractor}`.toLowerCase();
        if (!text.includes(q)) return false;
      }
      return true;
    });
  }, [requests, filterStatus, searchQuery]);

  // Selected Crane Object
  const selectedCrane = useMemo(() => {
    return INITIAL_CRANE_FLEET.find(c => c.id === selectedCraneId) || INITIAL_CRANE_FLEET[0];
  }, [selectedCraneId]);

  // Check if current request checklist is completely passed
  const isChecklistPassed = useMemo(() => {
    if (!activeRequest) return false;
    const c = activeRequest.checklist;
    return c.jobInfoComplete && c.documentsAttached && c.engineeringReviewed && c.siteLocationReviewed && c.safetyClearancePassed;
  }, [activeRequest]);

  // Step 1: Toggle Checklist item
  const handleToggleChecklist = (key: keyof V2CraneRequest['checklist']) => {
    setRequests(prev => prev.map(r => {
      if (r.id === activeRequest.id) {
        const updatedChecklist = { ...r.checklist, [key]: !r.checklist[key] };
        const allChecked = Object.values(updatedChecklist).every(Boolean);
        const newStatus = allChecked ? (r.status === 'Assigned' ? 'Assigned' : 'Pending Review') : 'Needs Attention';
        return { ...r, checklist: updatedChecklist, status: newStatus };
      }
      return r;
    }));
  };

  // Step 1: Save Review Action
  const handleSaveReview = () => {
    setShowSuccessToast(isTh ? 'บันทึกผลการตรวจสอบคำขอเรียบร้อยแล้ว' : 'Review checklist saved successfully');
    setTimeout(() => setShowSuccessToast(null), 3500);
  };

  // Step 1: Request Revision
  const handleRequestRevision = () => {
    const reason = prompt(isTh ? 'ระบุข้อความแจ้งขอแก้ไขข้อมูล (Revision Note):' : 'Enter revision note for contractor:');
    if (!reason) return;
    setRequests(prev => prev.map(r => {
      if (r.id === activeRequest.id) {
        return {
          ...r,
          status: 'Needs Attention',
          warningMessage: `Revision Requested: ${reason}`
        };
      }
      return r;
    }));
    setShowSuccessToast(isTh ? 'ส่งคำขอแก้ไขข้อมูลกลับไปยังผู้รับเหมาเรียบร้อยแล้ว' : 'Revision note dispatched');
    setTimeout(() => setShowSuccessToast(null), 3500);
  };

  // Step 2: Handle Crane Selection & Conflict Warning
  const handleSelectCrane = (crane: V2CraneCandidate) => {
    setSelectedCraneId(crane.id);
  };

  const handleResolveConflictWithTimeSlot = (newSlot: string) => {
    setProposedTimeSlot(newSlot);
    setShowSuccessToast(isTh ? `ปรับช่วงเวลาปฏิบัติการเป็น ${newSlot} สำเร็จ` : `Adjusted time slot to ${newSlot}`);
    setTimeout(() => setShowSuccessToast(null), 3500);
  };

  // Step 3: Final Confirm Assignment & Lock (Simulated)
  const handleConfirmAssignment = () => {
    setRequests(prev => prev.map(r => {
      if (r.id === activeRequest.id) {
        return {
          ...r,
          status: 'Assigned',
          assignedCraneId: selectedCrane.id,
          assignedCraneName: `${selectedCrane.name} (${selectedCrane.capacityTon}T)`,
          assignedAt: new Date().toISOString().replace('T', ' ').slice(0, 16),
          assignedBy: 'Planner (Active User)',
          timeSlot: proposedTimeSlot,
          warningMessage: undefined
        };
      }
      return r;
    }));
    setShowSuccessToast(isTh ? `จัดสรรเครน ${selectedCrane.name} สำเร็จและล็อคใบงานเรียบร้อยแล้ว!` : `Crane assigned and locked successfully!`);
    setTimeout(() => setShowSuccessToast(null), 4000);
  };

  // Post-Assignment: Simulated Reassignment
  const handleConfirmReassign = () => {
    const newCrane = INITIAL_CRANE_FLEET.find(c => c.id === reassignNewCraneId);
    if (!newCrane) return;
    setRequests(prev => prev.map(r => {
      if (r.id === activeRequest.id) {
        return {
          ...r,
          assignedCraneId: newCrane.id,
          assignedCraneName: `${newCrane.name} (${newCrane.capacityTon}T)`,
          assignedAt: new Date().toISOString().replace('T', ' ').slice(0, 16),
          warningMessage: reassignReason ? `Reassigned: ${reassignReason}` : undefined
        };
      }
      return r;
    }));
    setIsReassignModalOpen(false);
    setShowSuccessToast(isTh ? `เปลี่ยนเครนเป็น ${newCrane.name} เรียบร้อยแล้ว` : `Reassigned to ${newCrane.name}`);
    setTimeout(() => setShowSuccessToast(null), 3500);
  };

  // Post-Assignment: Simulated Unlock
  const handleConfirmUnlock = () => {
    setRequests(prev => prev.map(r => {
      if (r.id === activeRequest.id) {
        return {
          ...r,
          status: 'Pending Review',
          assignedCraneId: undefined,
          assignedCraneName: undefined,
          assignedAt: undefined,
          assignedBy: undefined,
          warningMessage: unlockReason ? `Unlocked: ${unlockReason}` : undefined
        };
      }
      return r;
    }));
    setIsUnlockModalOpen(false);
    setCurrentStep(1);
    setShowSuccessToast(isTh ? 'ปลดล็อคการจัดสรรเรียบร้อยแล้ว (สามารถทบทวนและจัดสรรใหม่ได้)' : 'Assignment unlocked');
    setTimeout(() => setShowSuccessToast(null), 3500);
  };

  return (
    <div className="space-y-5 animate-in fade-in duration-200">
      
      {/* Toast Notification */}
      {showSuccessToast && (
        <div className="fixed top-5 right-5 z-[120] bg-slate-900 text-white px-4 py-3 rounded-2xl shadow-2xl border border-slate-700 flex items-center gap-3 animate-in slide-in-from-top-3">
          <div className="w-7 h-7 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
            <CheckCircle2 size={16} />
          </div>
          <span className="text-xs font-bold">{showSuccessToast}</span>
        </div>
      )}

      {/* =========================================================================
          1. TOP HEADER & PROTOTYPE BANNER
         ========================================================================= */}
      <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-cyan-100 dark:bg-cyan-950/70 text-cyan-800 dark:text-cyan-300 border border-cyan-200 dark:border-cyan-800/60">
              TAM V2 PROTOTYPE
            </span>
            <span className="px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800/50">
              Experimental UI
            </span>
            <span className="text-xs text-slate-400">· Isolated Sandbox</span>
          </div>

          <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
            <Sparkles className="text-cyan-600 dark:text-cyan-400" size={24} />
            <span>{isTh ? 'Review Plan & Optimize (V2 Prototype)' : 'Review Plan & Optimize (V2 Prototype)'}</span>
          </h1>

          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-2xl">
            {isTh
              ? 'ทบทวนคำขอใช้งานรถเครน ตรวจสอบพิกัดความปลอดภัย และจัดสรรเครื่องจักรแบบทีละขั้นตอน (Guided 3-Step Workflow)'
              : 'Streamlined crane request review, safety check, and machinery assignment with a guided 3-step workflow.'}
          </p>
        </div>

        {/* Back to V1 Button */}
        <div className="shrink-0 flex items-center gap-2">
          <button
            type="button"
            onClick={onBackToV1}
            className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold flex items-center gap-2 border border-slate-200 dark:border-slate-700 transition cursor-pointer shadow-2xs"
            title="สลับกลับไปยังหน้า Review Plan & Optimize แบบเดิม"
          >
            <ArrowLeft size={14} />
            <span>{isTh ? 'กลับไปหน้า Review Plan เดิม (V1)' : 'Back to Original Review Plan (V1)'}</span>
          </button>
        </div>
      </div>

      {/* =========================================================================
          2. COMPACT KPI SUMMARY (STRICTLY 3 METRICS)
         ========================================================================= */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
        {/* KPI 1: Pending Review */}
        <div 
          onClick={() => setFilterStatus('Pending Review')}
          className={`p-4 rounded-2xl bg-white dark:bg-slate-900 border transition-all cursor-pointer shadow-xs ${
            filterStatus === 'Pending Review' ? 'border-blue-500 ring-2 ring-blue-500/10' : 'border-slate-200 dark:border-slate-800 hover:border-slate-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider font-mono">
              {isTh ? 'รอการตรวจสอบ' : 'Pending Review'}
            </span>
            <span className="w-2.5 h-2.5 rounded-full bg-blue-500 animate-pulse" />
          </div>
          <div className="text-2xl font-black text-slate-900 dark:text-white mt-1">
            {kpiPending}
          </div>
          <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
            {isTh ? 'คำขอที่รอการตรวจความปลอดภัยและเลือกเครน' : 'Requests awaiting engineering check'}
          </p>
        </div>

        {/* KPI 2: Needs Attention */}
        <div 
          onClick={() => setFilterStatus('Needs Attention')}
          className={`p-4 rounded-2xl bg-white dark:bg-slate-900 border transition-all cursor-pointer shadow-xs ${
            filterStatus === 'Needs Attention' ? 'border-amber-500 ring-2 ring-amber-500/10' : 'border-slate-200 dark:border-slate-800 hover:border-slate-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider font-mono">
              {isTh ? 'ต้องดูแล / มีข้อขัดแย้ง' : 'Needs Attention'}
            </span>
            <AlertTriangle size={14} className="text-amber-500" />
          </div>
          <div className="text-2xl font-black text-amber-600 dark:text-amber-400 mt-1">
            {kpiNeedsAttention}
          </div>
          <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
            {isTh ? 'พบตารางเวลาชนกัน หรือเอกสารไม่ครบ' : 'Schedule conflicts or missing documents'}
          </p>
        </div>

        {/* KPI 3: Assigned & Locked */}
        <div 
          onClick={() => setFilterStatus('Assigned')}
          className={`p-4 rounded-2xl bg-white dark:bg-slate-900 border transition-all cursor-pointer shadow-xs ${
            filterStatus === 'Assigned' ? 'border-emerald-500 ring-2 ring-emerald-500/10' : 'border-slate-200 dark:border-slate-800 hover:border-slate-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider font-mono">
              {isTh ? 'จัดสรรและล็อคแล้ว' : 'Assigned & Locked'}
            </span>
            <CheckCircle2 size={14} className="text-emerald-500" />
          </div>
          <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1">
            {kpiAssigned}
          </div>
          <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
            {isTh ? 'จัดสรรเครื่องจักรสมบูรณ์ พร้อมออกใบงาน' : 'Cranes locked into daily dispatch'}
          </p>
        </div>
      </div>

      {/* =========================================================================
          3. MAIN LAYOUT: LEFT QUEUE + RIGHT GUIDED WORKSPACE
         ========================================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        
        {/* LEFT PANEL: COMPACT REQUEST QUEUE (Cols 4) */}
        <div className="lg:col-span-4 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-4 space-y-3.5 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileText size={16} className="text-blue-600 dark:text-blue-400" />
              <h2 className="text-sm font-black text-slate-900 dark:text-white">
                {isTh ? 'คิวคำขอใช้งานเครน' : 'Request Queue'}
              </h2>
            </div>
            <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
              {filteredRequests.length}
            </span>
          </div>

          {/* Search Bar */}
          <div className="relative">
            <Search size={14} className="absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={isTh ? 'ค้นหารหัส WO, ชื่องาน, พื้นที่...' : 'Search by WO, title, area...'}
              className="w-full pl-9 pr-3 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            />
          </div>

          {/* Filters */}
          <div className="flex items-center gap-1 overflow-x-auto pb-1 custom-scrollbar">
            {(['All', 'Pending Review', 'Needs Attention', 'Assigned'] as const).map(tab => (
              <button
                key={tab}
                type="button"
                onClick={() => setFilterStatus(tab)}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold whitespace-nowrap transition-all cursor-pointer ${
                  filterStatus === tab
                    ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 shadow-2xs'
                    : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {tab === 'All' ? (isTh ? 'ทั้งหมด' : 'All') :
                 tab === 'Pending Review' ? (isTh ? 'รอตรวจ' : 'Pending') :
                 tab === 'Needs Attention' ? (isTh ? 'ต้องดูแล' : 'Attention') :
                 (isTh ? 'จัดสรรแล้ว' : 'Assigned')}
              </button>
            ))}
          </div>

          {/* List of Request Cards */}
          <div className="space-y-2.5 max-h-[620px] overflow-y-auto pr-1 custom-scrollbar">
            {filteredRequests.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-xs italic">
                {isTh ? 'ไม่พบคำขอตามเงื่อนไข' : 'No matching requests found'}
              </div>
            ) : (
              filteredRequests.map(req => {
                const isSelected = req.id === activeRequest.id;
                const isDone = req.status === 'Assigned';
                const isAttention = req.status === 'Needs Attention';

                return (
                  <div
                    key={req.id}
                    onClick={() => {
                      setSelectedRequestId(req.id);
                      if (req.status === 'Assigned') {
                        setCurrentStep(3);
                      } else {
                        setCurrentStep(1);
                      }
                    }}
                    className={`p-3.5 rounded-2xl border transition-all cursor-pointer text-left ${
                      isSelected
                        ? 'bg-blue-50/80 dark:bg-blue-950/40 border-blue-500 ring-2 ring-blue-500/10 shadow-xs'
                        : 'bg-slate-50/50 dark:bg-slate-800/40 border-slate-200/80 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-mono font-black text-xs text-blue-600 dark:text-blue-400">
                        {req.requestNo}
                      </span>
                      <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${
                        isDone ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300' :
                        isAttention ? 'bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300' :
                        'bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300'
                      }`}>
                        {req.status}
                      </span>
                    </div>

                    <div className="text-xs font-bold text-slate-800 dark:text-slate-100 mt-1 line-clamp-1">
                      {req.title}
                    </div>

                    <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 truncate">
                      {req.area}
                    </div>

                    <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-200/60 dark:border-slate-750 text-[10px] text-slate-500 font-mono">
                      <span>{req.requestedDate}</span>
                      <span className="font-bold text-slate-700 dark:text-slate-300">
                        {req.requiredCapacityTon}T Crane
                      </span>
                    </div>

                    {req.warningMessage && (
                      <div className="mt-2 text-[10px] font-medium text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 p-1.5 rounded-lg flex items-center gap-1">
                        <AlertTriangle size={11} className="shrink-0" />
                        <span className="truncate">{req.warningMessage}</span>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* RIGHT PANEL: 3-STEP GUIDED WORKSPACE (Cols 8) */}
        <div className="lg:col-span-8 space-y-4">
          
          {/* STEPPER NAVIGATION BAR */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-3 border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between">
            <div className="grid grid-cols-3 gap-2 flex-1">
              {/* Step 1 */}
              <button
                type="button"
                onClick={() => setCurrentStep(1)}
                className={`py-2 px-3 rounded-2xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
                  currentStep === 1
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100'
                }`}
              >
                <span className={`w-5 h-5 rounded-full text-[10px] flex items-center justify-center font-mono ${
                  currentStep === 1 ? 'bg-white text-blue-600 font-black' : 'bg-slate-200 dark:bg-slate-700 text-slate-600'
                }`}>
                  1
                </span>
                <span className="hidden sm:inline">{isTh ? '1. ตรวจสอบคำขอ' : '1. Review Request'}</span>
              </button>

              {/* Step 2 */}
              <button
                type="button"
                onClick={() => setCurrentStep(2)}
                className={`py-2 px-3 rounded-2xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
                  currentStep === 2
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100'
                }`}
              >
                <span className={`w-5 h-5 rounded-full text-[10px] flex items-center justify-center font-mono ${
                  currentStep === 2 ? 'bg-white text-blue-600 font-black' : 'bg-slate-200 dark:bg-slate-700 text-slate-600'
                }`}>
                  2
                </span>
                <span className="hidden sm:inline">{isTh ? '2. เลือกเครื่องจักรเครน' : '2. Select Crane'}</span>
              </button>

              {/* Step 3 */}
              <button
                type="button"
                onClick={() => setCurrentStep(3)}
                className={`py-2 px-3 rounded-2xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
                  currentStep === 3
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100'
                }`}
              >
                <span className={`w-5 h-5 rounded-full text-[10px] flex items-center justify-center font-mono ${
                  currentStep === 3 ? 'bg-white text-blue-600 font-black' : 'bg-slate-200 dark:bg-slate-700 text-slate-600'
                }`}>
                  3
                </span>
                <span className="hidden sm:inline">{isTh ? '3. ยืนยันการจัดสรร' : '3. Confirmation'}</span>
              </button>
            </div>
          </div>

          {/* =========================================================================
              STEP 1: REVIEW REQUEST
             ========================================================================= */}
          {currentStep === 1 && (
            <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 space-y-6 shadow-sm">
              
              {/* Request Header Banner */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100 dark:border-slate-800">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-base font-black text-blue-600 dark:text-blue-400">
                      {activeRequest.requestNo}
                    </span>
                    <span className="text-xs font-mono px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                      WO: {activeRequest.workOrderNo}
                    </span>
                    <span className="text-xs text-slate-400">· {activeRequest.plant}</span>
                  </div>
                  <h3 className="text-lg font-black text-slate-900 dark:text-white mt-1">
                    {activeRequest.title}
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {activeRequest.area} • {activeRequest.contractor}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setIsPlotPlanDrawerOpen(true)}
                  className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-blue-50 dark:bg-slate-800 dark:hover:bg-slate-750 text-blue-600 dark:text-blue-400 text-xs font-bold flex items-center gap-1.5 transition cursor-pointer border border-slate-200 dark:border-slate-700 shrink-0 self-start sm:self-auto"
                >
                  <Compass size={14} />
                  <span>{isTh ? 'เปิดดูผังยก Plot Plan' : 'View Plot Plan'}</span>
                </button>
              </div>

              {/* Job Specification Grid (Core Parameters) */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50/60 dark:bg-slate-850 p-4 rounded-2xl border border-slate-100 dark:border-slate-800">
                <div>
                  <div className="text-[10px] font-bold text-slate-400 uppercase font-mono">{isTh ? 'ขนาดเครนที่ต้องการ' : 'Required Crane'}</div>
                  <div className="text-base font-black text-slate-900 dark:text-white font-mono mt-0.5">{activeRequest.requiredCapacityTon} Tons</div>
                </div>
                <div>
                  <div className="text-[10px] font-bold text-slate-400 uppercase font-mono">{isTh ? 'น้ำหนักยกรวม (Gross Load)' : 'Gross Load'}</div>
                  <div className="text-base font-black text-blue-600 dark:text-blue-400 font-mono mt-0.5">{activeRequest.grossLoadTon} Tons</div>
                </div>
                <div>
                  <div className="text-[10px] font-bold text-slate-400 uppercase font-mono">{isTh ? 'รัศมีการทำงาน (Radius)' : 'Working Radius'}</div>
                  <div className="text-base font-black text-slate-900 dark:text-white font-mono mt-0.5">{activeRequest.workingRadiusM} m</div>
                </div>
                <div>
                  <div className="text-[10px] font-bold text-slate-400 uppercase font-mono">{isTh ? 'ความยาวบูม (Boom)' : 'Boom Length'}</div>
                  <div className="text-base font-black text-slate-900 dark:text-white font-mono mt-0.5">{activeRequest.boomLengthM} m</div>
                </div>
              </div>

              {/* Review Checklist (Guided 5 Questions) */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-black text-slate-800 dark:text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                    <ShieldCheck size={16} className="text-emerald-500" />
                    <span>{isTh ? 'รายการตรวจสอบความปลอดภัยวิศวกรรม (Engineering Checklist)' : 'Engineering Checklist'}</span>
                  </h4>
                  <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full ${
                    isChecklistPassed ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300' : 'bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300'
                  }`}>
                    {isChecklistPassed ? 'Passed (พร้อมจัดสรร)' : 'Check Incomplete'}
                  </span>
                </div>

                <div className="space-y-2">
                  {[
                    { key: 'jobInfoComplete' as const, labelTh: 'ข้อมูลงานและรหัสอุปกรณ์ครบถ้วน (WO, Equipment Tag, Area verified)', labelEn: 'Job information and tags verified' },
                    { key: 'documentsAttached' as const, labelTh: 'เอกสารแผนยกและใบอนุญาตแนบครบ (Rigging Plan, Crane Cert, Operator License)', labelEn: 'Lifting plan and certificates attached' },
                    { key: 'engineeringReviewed' as const, labelTh: 'วิศวกรรมคำนวณผ่านเกณฑ์ (Utilization Load < 75%, Ground Bearing safe)', labelEn: 'Engineering calculations safe' },
                    { key: 'siteLocationReviewed' as const, labelTh: 'ตรวจสอบพิกัดสถานที่และรัศมีสวิง (Clearance from live piping & overhead racks)', labelEn: 'Site location and radius clearances verified' },
                    { key: 'safetyClearancePassed' as const, labelTh: 'ไม่มีประเด็นความปลอดภัยติดขัด (SIMOPS co-activity and wind speed permissible)', labelEn: 'No unresolved safety bottlenecks' },
                  ].map(item => {
                    const isChecked = activeRequest.checklist[item.key];
                    return (
                      <label
                        key={item.key}
                        onClick={() => handleToggleChecklist(item.key)}
                        className={`p-3 rounded-2xl border flex items-center justify-between cursor-pointer transition-all ${
                          isChecked
                            ? 'bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-300 dark:border-emerald-800'
                            : 'bg-white dark:bg-slate-850 border-slate-200 dark:border-slate-800 hover:border-slate-300'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className={`w-5 h-5 rounded-lg flex items-center justify-center border transition-all ${
                            isChecked ? 'bg-emerald-600 border-emerald-600 text-white' : 'border-slate-300 dark:border-slate-600'
                          }`}>
                            {isChecked && <Check size={12} className="stroke-[3]" />}
                          </div>
                          <span className={`text-xs font-semibold ${isChecked ? 'text-slate-900 dark:text-white' : 'text-slate-600 dark:text-slate-300'}`}>
                            {isTh ? item.labelTh : item.labelEn}
                          </span>
                        </div>
                        <span className={`text-[10px] font-mono font-bold ${isChecked ? 'text-emerald-600' : 'text-slate-400'}`}>
                          {isChecked ? 'VERIFIED' : 'PENDING'}
                        </span>
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* Collapsible Sections (Engineering Details, Docs, History) */}
              <div className="space-y-2 border-t border-slate-100 dark:border-slate-800 pt-4">
                
                {/* Accordion 1: Engineering Details */}
                <div className="rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
                  <button
                    type="button"
                    onClick={() => setOpenAccordion(openAccordion === 'engineering' ? '' : 'engineering')}
                    className="w-full p-3.5 bg-slate-50 dark:bg-slate-850 flex items-center justify-between text-xs font-bold text-slate-800 dark:text-slate-200 cursor-pointer"
                  >
                    <span className="flex items-center gap-2">
                      <Sliders size={14} className="text-blue-500" />
                      <span>{isTh ? 'รายละเอียดการคำนวณทางวิศวกรรม (Engineering Calculations)' : 'Engineering Calculations'}</span>
                    </span>
                    <ChevronDown size={14} className={`transition-transform ${openAccordion === 'engineering' ? 'rotate-180' : ''}`} />
                  </button>
                  {openAccordion === 'engineering' && (
                    <div className="p-4 bg-white dark:bg-slate-900 text-xs space-y-3">
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                          <div className="text-[10px] text-slate-400 uppercase font-mono">Capacity Utilization</div>
                          <div className="text-sm font-black text-slate-900 dark:text-white font-mono mt-0.5">{activeRequest.utilizationPercentage}%</div>
                          <div className="text-[10px] text-emerald-600 font-bold mt-1">Safe (&lt; 75% limit)</div>
                        </div>
                        <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                          <div className="text-[10px] text-slate-400 uppercase font-mono">Ground Bearing Pressure</div>
                          <div className="text-sm font-black text-slate-900 dark:text-white font-mono mt-0.5">{activeRequest.groundBearingPressure} t/m²</div>
                          <div className="text-[10px] text-slate-500 mt-1">Allowable: {activeRequest.allowableGroundBearing} t/m²</div>
                        </div>
                        <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                          <div className="text-[10px] text-slate-400 uppercase font-mono">Outrigger Matting</div>
                          <div className="text-sm font-black text-slate-900 dark:text-white font-mono mt-0.5">2.5m × 2.5m Steel</div>
                          <div className="text-[10px] text-emerald-600 font-bold mt-1">Certified for Soil Class B</div>
                        </div>
                      </div>
                      <p className="text-[11px] text-slate-500 italic">
                        *หมายเหตุ: ข้อมูลการคำนวณทางวิศวกรรมต้องได้รับการอนุมัติจากวิศวกรผู้ควบคุมการยกก่อนการจัดสรรจริง
                      </p>
                    </div>
                  )}
                </div>

                {/* Accordion 2: Supporting Documents */}
                <div className="rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
                  <button
                    type="button"
                    onClick={() => setOpenAccordion(openAccordion === 'documents' ? '' : 'documents')}
                    className="w-full p-3.5 bg-slate-50 dark:bg-slate-850 flex items-center justify-between text-xs font-bold text-slate-800 dark:text-slate-200 cursor-pointer"
                  >
                    <span className="flex items-center gap-2">
                      <Paperclip size={14} className="text-blue-500" />
                      <span>{isTh ? 'เอกสารประกอบและใบอนุญาต (3 เอกสารแนบ)' : 'Supporting Documents (3 files)'}</span>
                    </span>
                    <ChevronDown size={14} className={`transition-transform ${openAccordion === 'documents' ? 'rotate-180' : ''}`} />
                  </button>
                  {openAccordion === 'documents' && (
                    <div className="p-4 bg-white dark:bg-slate-900 space-y-2 text-xs">
                      {[
                        { title: 'Lifting_Plan_E1102_Approved.pdf', size: '2.4 MB', type: 'Engineering CAD & Rigging Plan' },
                        { title: 'Crane_Load_Chart_Inspection_Cert.pdf', size: '1.2 MB', type: 'Statutory Safety Inspection' },
                        { title: 'Certified_Rigger_Level2_License.pdf', size: '850 KB', type: 'Personnel Certification' },
                      ].map((doc, idx) => (
                        <div key={idx} className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-between">
                          <div className="flex items-center gap-2.5">
                            <FileText size={16} className="text-blue-500" />
                            <div>
                              <div className="font-bold text-slate-800 dark:text-slate-200">{doc.title}</div>
                              <div className="text-[10px] text-slate-400">{doc.type} • {doc.size}</div>
                            </div>
                          </div>
                          <span className="text-[10px] text-blue-600 font-bold hover:underline cursor-pointer">Preview</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

              </div>

              {/* Step 1 Actions */}
              <div className="flex items-center justify-between pt-4 border-t border-slate-100 dark:border-slate-800 gap-3 flex-wrap">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleSaveReview}
                    className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-xs font-bold text-slate-700 dark:text-slate-200 cursor-pointer transition"
                  >
                    {isTh ? 'บันทึกการตรวจสอบ' : 'Save Review'}
                  </button>
                  <button
                    type="button"
                    onClick={handleRequestRevision}
                    className="px-4 py-2 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800 text-xs font-bold cursor-pointer transition"
                  >
                    {isTh ? 'ขอให้ผู้รับเหมาแก้ไขข้อมูล' : 'Request Revision'}
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => setCurrentStep(2)}
                  className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center gap-2 shadow-md shadow-blue-500/20 cursor-pointer transition active:scale-95 ml-auto"
                >
                  <span>{isTh ? 'ดำเนินการต่อไป: เลือกเครื่องจักรเครน' : 'Continue to Select Crane'}</span>
                  <ChevronRight size={15} />
                </button>
              </div>

            </div>
          )}

          {/* =========================================================================
              STEP 2: SELECT CRANE
             ========================================================================= */}
          {currentStep === 2 && (
            <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 space-y-6 shadow-sm">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
                <div>
                  <h3 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                    <Truck size={18} className="text-blue-600" />
                    <span>{isTh ? 'เลือกเครื่องจักรเครนที่เหมาะสม (Select Suitable Crane)' : 'Select Suitable Crane'}</span>
                  </h3>
                  <p className="text-xs text-slate-500">
                    {isTh ? `คำขอต้องการพิกัดน้ำหนัก: ${activeRequest.requiredCapacityTon} Tons (รัศมี ${activeRequest.workingRadiusM}m)` : `Target capacity: ${activeRequest.requiredCapacityTon} Tons`}
                  </p>
                </div>

                {/* Time slot filter indicator */}
                <div className="text-xs font-mono px-3 py-1 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                  {isTh ? `ช่วงเวลาเป้าหมาย:` : `Slot:`} <strong>{proposedTimeSlot}</strong>
                </div>
              </div>

              {/* Schedule Conflict Warning Banner if conflicting crane selected */}
              {selectedCrane.availability === 'Conflict' && (
                <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800 text-xs text-amber-900 dark:text-amber-200 space-y-2.5 animate-in slide-in-from-top-2">
                  <div className="flex items-center gap-2 font-bold text-amber-800 dark:text-amber-300">
                    <AlertTriangle size={16} className="text-amber-600" />
                    <span>{isTh ? 'ตรวจพบเวลาปฏิบัติการซ้ำซ้อน (Schedule Conflict Detected)' : 'Schedule Conflict Detected'}</span>
                  </div>
                  <p className="text-slate-700 dark:text-slate-300 leading-relaxed">
                    {selectedCrane.conflictReason || 'Selected crane is already reserved during this period.'}
                  </p>
                  
                  <div className="flex items-center gap-2 pt-1 flex-wrap">
                    <span className="text-[11px] font-bold text-slate-500">{isTh ? 'ทางเลือกแก้ปัญหา:' : 'Resolution:'}</span>
                    {selectedCrane.conflictAlternativeSlot && (
                      <button
                        type="button"
                        onClick={() => handleResolveConflictWithTimeSlot(selectedCrane.conflictAlternativeSlot!)}
                        className="px-3 py-1 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs cursor-pointer shadow-xs"
                      >
                        {isTh ? `เปลี่ยนช่วงเวลาเป็น: ${selectedCrane.conflictAlternativeSlot}` : `Switch to ${selectedCrane.conflictAlternativeSlot}`}
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => setSelectedCraneId('CRN-01')}
                      className="px-3 py-1 rounded-lg bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 font-bold text-xs text-slate-700 dark:text-slate-200 hover:bg-slate-50 cursor-pointer"
                    >
                      {isTh ? 'เลือกเครนคันอื่น (Choose Another Crane)' : 'Choose Another Crane'}
                    </button>
                  </div>
                </div>
              )}

              {/* Crane Candidate List */}
              <div className="space-y-3">
                {INITIAL_CRANE_FLEET.map(crane => {
                  const isSelected = crane.id === selectedCraneId;
                  const isAvailable = crane.availability === 'Available';
                  const isConflict = crane.availability === 'Conflict';
                  const isInspection = crane.availability === 'Inspection';

                  return (
                    <div
                      key={crane.id}
                      onClick={() => handleSelectCrane(crane)}
                      className={`p-4 rounded-2xl border transition-all cursor-pointer ${
                        isSelected
                          ? 'border-blue-500 bg-blue-50/70 dark:bg-blue-950/40 ring-2 ring-blue-500/20 shadow-xs'
                          : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-white dark:bg-slate-900'
                      }`}
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-xs font-mono ${
                            isSelected ? 'bg-blue-600 text-white shadow-sm' : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                          }`}>
                            {crane.capacityTon}T
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-mono font-bold text-xs text-slate-900 dark:text-white">
                                {crane.code} • {crane.name}
                              </span>
                              <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase ${
                                isAvailable ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300' :
                                isConflict ? 'bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300' :
                                'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400'
                              }`}>
                                {isAvailable ? (isTh ? 'พร้อมใช้งาน' : 'Available') :
                                 isConflict ? (isTh ? 'ตารางชนกัน' : 'Conflict') :
                                 (isTh ? 'งดจ่ายงาน / ตรวจเช็ค' : 'Inspection')}
                              </span>
                            </div>
                            <div className="text-xs text-slate-500 mt-0.5">
                              {crane.type} • {crane.currentArea}
                            </div>
                          </div>
                        </div>

                        <div className="text-right">
                          <div className="text-[10px] text-slate-400 uppercase font-mono font-bold">Suitability Score</div>
                          <div className={`text-sm font-black font-mono ${crane.suitabilityScore >= 90 ? 'text-emerald-600' : crane.suitabilityScore > 0 ? 'text-blue-600' : 'text-slate-400'}`}>
                            {crane.suitabilityScore}% Match
                          </div>
                        </div>
                      </div>

                      <div className="mt-2.5 pt-2 border-t border-slate-100 dark:border-slate-800/80 text-[11px] text-slate-500">
                        {crane.suitabilityNotes}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Collapsible Matching & Optimization Details */}
              <div className="rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
                <button
                  type="button"
                  onClick={() => setOpenAccordion(openAccordion === 'matching' ? '' : 'matching')}
                  className="w-full p-3.5 bg-slate-50 dark:bg-slate-850 flex items-center justify-between text-xs font-bold text-slate-800 dark:text-slate-200 cursor-pointer"
                >
                  <span className="flex items-center gap-2">
                    <Sparkles size={14} className="text-blue-500" />
                    <span>{isTh ? 'การจัดสรรร่วมและข้อมูลเชิงลึก (Shared Crane & Optimization)' : 'Optimization Details'}</span>
                  </span>
                  <ChevronDown size={14} className={`transition-transform ${openAccordion === 'matching' ? 'rotate-180' : ''}`} />
                </button>
                {openAccordion === 'matching' && (
                  <div className="p-4 bg-white dark:bg-slate-900 text-xs space-y-2 text-slate-600 dark:text-slate-300">
                    <p>
                      💡 <strong>Shared Crane Opportunity:</strong> รถเครนคันนี้มีกำหนดการยกในบริเวณ CDU-1 ต่อเนื่อง สามารถใช้วางแผนแชร์รอบการเซ็ตอัพขาค้ำ (Outrigger Pad) ร่วมกับใบงาน CR-2026-0914 เพื่อประหยัดเวลาการเคลื่อนย้ายได้ 1.5 ชม.
                    </p>
                  </div>
                )}
              </div>

              {/* Step 2 Actions */}
              <div className="flex items-center justify-between pt-4 border-t border-slate-100 dark:border-slate-800 gap-3">
                <button
                  type="button"
                  onClick={() => setCurrentStep(1)}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-xs font-bold text-slate-700 dark:text-slate-200 cursor-pointer transition"
                >
                  {isTh ? '← กลับไปตรวจสอบคำขอ' : '← Back to Review'}
                </button>

                <button
                  type="button"
                  disabled={selectedCrane.availability === 'Inspection'}
                  onClick={() => setCurrentStep(3)}
                  className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold text-xs flex items-center gap-2 shadow-md shadow-blue-500/20 cursor-pointer transition active:scale-95"
                >
                  <span>{isTh ? 'ดำเนินการต่อไป: สรุปและยืนยัน' : 'Continue to Confirmation'}</span>
                  <ChevronRight size={15} />
                </button>
              </div>

            </div>
          )}

          {/* =========================================================================
              STEP 3: CONFIRM ASSIGNMENT
             ========================================================================= */}
          {currentStep === 3 && (
            <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 space-y-6 shadow-sm">
              <div className="pb-3 border-b border-slate-100 dark:border-slate-800">
                <h3 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                  <CheckCircle2 size={18} className="text-emerald-500" />
                  <span>{isTh ? 'สรุปข้อมูลและยืนยันการจัดสรร (Final Confirmation)' : 'Final Confirmation'}</span>
                </h3>
                <p className="text-xs text-slate-500">
                  {isTh ? 'ตรวจสอบความพร้อมรอบสุดท้ายก่อนทำการล็อคการจัดสรรเครื่องจักร' : 'Review all parameters before locking the assignment.'}
                </p>
              </div>

              {/* Readiness Status Banner */}
              <div className={`p-4 rounded-2xl border flex items-center justify-between gap-3 text-xs ${
                activeRequest.status === 'Assigned'
                  ? 'bg-emerald-50/80 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200'
                  : isChecklistPassed && selectedCrane.availability === 'Available'
                  ? 'bg-emerald-50/80 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200'
                  : 'bg-amber-50/80 dark:bg-amber-950/40 border-amber-300 dark:border-amber-800 text-amber-900 dark:text-amber-200'
              }`}>
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-xl flex items-center justify-center text-white shrink-0 ${
                    activeRequest.status === 'Assigned' || (isChecklistPassed && selectedCrane.availability === 'Available') ? 'bg-emerald-600' : 'bg-amber-600'
                  }`}>
                    {activeRequest.status === 'Assigned' ? <Lock size={16} /> : isChecklistPassed && selectedCrane.availability === 'Available' ? <CheckCircle2 size={16} /> : <AlertTriangle size={16} />}
                  </div>
                  <div>
                    <div className="font-black text-sm">
                      {activeRequest.status === 'Assigned' ? (isTh ? 'ใบงานได้รับการจัดสรรและล็อคแล้ว (Assigned & Locked)' : 'Assigned & Locked') :
                       isChecklistPassed && selectedCrane.availability === 'Available' ? (isTh ? 'ความพร้อมสมบูรณ์ (Ready to Assign)' : 'Ready to Assign') :
                       (isTh ? 'ต้องดำเนินการเพิ่มเติม (Action Required)' : 'Action Required')}
                    </div>
                    <div className="text-[11px] opacity-90 mt-0.5">
                      {activeRequest.status === 'Assigned' ? (isTh ? `ล็อคโดย ${activeRequest.assignedBy || 'Lead Engineer'} เมื่อ ${activeRequest.assignedAt || 'วันนี้'}` : `Locked by ${activeRequest.assignedBy}`) :
                       isChecklistPassed && selectedCrane.availability === 'Available' ? (isTh ? 'การตรวจสอบความปลอดภัยทางวิศวกรรมและตารางเวลาผ่านเกณฑ์ทั้งหมด' : 'All engineering checks and schedules are verified.') :
                       (isTh ? 'ยังมีรายการตรวจสอบใน Step 1 หรือประเด็นเวลาใน Step 2 ที่ยังไม่สมบูรณ์' : 'Checklist in Step 1 or schedule in Step 2 needs attention.')}
                    </div>
                  </div>
                </div>

                {activeRequest.status !== 'Assigned' && !isChecklistPassed && (
                  <button
                    type="button"
                    onClick={() => setCurrentStep(1)}
                    className="px-3 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs shrink-0 cursor-pointer"
                  >
                    {isTh ? 'กลับไปตรวจ Step 1' : 'Fix in Step 1'}
                  </button>
                )}
              </div>

              {/* Assignment Summary Table Card */}
              <div className="bg-slate-50 dark:bg-slate-850 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-400 font-mono">Job Request</span>
                    <div className="font-bold text-slate-800 dark:text-slate-100 text-sm mt-0.5">{activeRequest.title}</div>
                    <div className="text-slate-500 font-mono text-[11px] mt-0.5">{activeRequest.requestNo} (WO: {activeRequest.workOrderNo})</div>
                  </div>

                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-400 font-mono">Assigned Machinery</span>
                    <div className="font-bold text-blue-600 dark:text-blue-400 text-sm mt-0.5">
                      {activeRequest.status === 'Assigned' ? activeRequest.assignedCraneName : `${selectedCrane.name} (${selectedCrane.capacityTon}T)`}
                    </div>
                    <div className="text-slate-500 font-mono text-[11px] mt-0.5">Time: {activeRequest.requestedDate} • {proposedTimeSlot}</div>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-3 border-t border-slate-200/80 dark:border-slate-750 text-xs">
                  <div>
                    <span className="text-[10px] text-slate-400">Engineering Review:</span>
                    <div className="font-bold text-emerald-600 flex items-center gap-1 mt-0.5">
                      <CheckCircle2 size={12} />
                      <span>Passed</span>
                    </div>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400">Site Location:</span>
                    <div className="font-bold text-emerald-600 flex items-center gap-1 mt-0.5">
                      <CheckCircle2 size={12} />
                      <span>Verified</span>
                    </div>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400">Schedule Conflict:</span>
                    <div className={`font-bold flex items-center gap-1 mt-0.5 ${selectedCrane.availability === 'Conflict' ? 'text-amber-600' : 'text-emerald-600'}`}>
                      {selectedCrane.availability === 'Conflict' ? <AlertTriangle size={12} /> : <CheckCircle2 size={12} />}
                      <span>{selectedCrane.availability === 'Conflict' ? 'Conflict' : 'No Conflict'}</span>
                    </div>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400">Documents Attached:</span>
                    <div className="font-bold text-emerald-600 flex items-center gap-1 mt-0.5">
                      <CheckCircle2 size={12} />
                      <span>Complete</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* POST-ASSIGNMENT ACTIONS (Only shown if already assigned) */}
              {activeRequest.status === 'Assigned' ? (
                <div className="p-4 rounded-2xl bg-slate-100 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <div className="text-xs font-bold text-slate-800 dark:text-slate-100 flex items-center gap-1.5">
                      <Lock size={14} className="text-emerald-500" />
                      <span>{isTh ? 'การจัดการใบงานที่จัดสรรแล้ว (Manage Assignment)' : 'Manage Assignment'}</span>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      {isTh ? 'ท่านสามารถเปลี่ยนเครื่องจักรเครนใหม่ หรือปลดล็อคการจัดสรรเพื่อทบทวนใหม่ได้' : 'Reassign crane or unlock this request for revision.'}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => setIsReassignModalOpen(true)}
                      className="px-3.5 py-2 rounded-xl bg-white dark:bg-slate-700 hover:bg-slate-50 text-slate-700 dark:text-slate-200 text-xs font-bold border border-slate-300 dark:border-slate-600 transition cursor-pointer shadow-2xs"
                    >
                      <RotateCcw size={13} className="inline mr-1" />
                      <span>{isTh ? 'เปลี่ยนเครน (Reassign)' : 'Reassign Crane'}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsUnlockModalOpen(true)}
                      className="px-3.5 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 text-xs font-bold border border-rose-200 dark:border-rose-800 transition cursor-pointer"
                    >
                      <Unlock size={13} className="inline mr-1" />
                      <span>{isTh ? 'ปลดล็อค (Unlock)' : 'Unlock Assignment'}</span>
                    </button>
                  </div>
                </div>
              ) : (
                /* Primary Assignment Confirmation Actions */
                <div className="flex items-center justify-between pt-4 border-t border-slate-100 dark:border-slate-800 gap-3 flex-wrap">
                  <button
                    type="button"
                    onClick={() => setCurrentStep(2)}
                    className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-xs font-bold text-slate-700 dark:text-slate-200 cursor-pointer transition"
                  >
                    {isTh ? '← กลับไปเลือกเครื่องจักร' : '← Back to Select Crane'}
                  </button>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleRequestRevision}
                      className="px-4 py-2 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-700 text-xs font-bold border border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 cursor-pointer"
                    >
                      {isTh ? 'ขอแก้ไขข้อมูล' : 'Request Revision'}
                    </button>
                    <button
                      type="button"
                      onClick={handleConfirmAssignment}
                      className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-2 shadow-lg shadow-emerald-600/25 cursor-pointer transition active:scale-95"
                    >
                      <Lock size={14} />
                      <span>{isTh ? 'ยืนยันการจัดสรรและล็อค (Confirm & Lock)' : 'Confirm Assignment & Lock'}</span>
                    </button>
                  </div>
                </div>
              )}

            </div>
          )}

        </div>
      </div>

      {/* =========================================================================
          4. PLOT PLAN CAD DRAWER / SLIDE-OVER
         ========================================================================= */}
      {isPlotPlanDrawerOpen && (
        <div 
          className="fixed inset-0 z-[130] bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200"
          onClick={() => setIsPlotPlanDrawerOpen(false)}
        >
          <div 
            className="bg-white dark:bg-slate-900 w-full max-w-4xl rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Compass size={16} className="text-blue-500" />
                  <span>{isTh ? 'ผังโรงกลั่นและตำแหน่งการยก (Refinery Plot Plan)' : 'Refinery Plot Plan'}</span>
                </h3>
                <p className="text-[11px] text-slate-500">
                  {activeRequest.area} • Job {activeRequest.requestNo} (Radius: {activeRequest.workingRadiusM}m)
                </p>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-0.5 rounded-lg border border-slate-200 dark:border-slate-700">
                  <button
                    type="button"
                    onClick={() => setGlobalThemeGate(true)}
                    className={`px-2 py-1 rounded text-[10px] font-bold transition-all cursor-pointer ${
                      isGlobalDark
                        ? 'bg-cyan-500/20 text-cyan-600 dark:text-cyan-400 border border-cyan-500/40'
                        : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    Dark Blueprint
                  </button>
                  <button
                    type="button"
                    onClick={() => setGlobalThemeGate(false)}
                    className={`px-2 py-1 rounded text-[10px] font-bold transition-all cursor-pointer ${
                      !isGlobalDark
                        ? 'bg-blue-600 text-white shadow-xs'
                        : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    Paper CAD
                  </button>
                </div>
                <button
                  type="button"
                  onClick={() => setIsPlotPlanDrawerOpen(false)}
                  className="p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* CAD Map Canvas */}
            <div className={`relative flex-1 min-h-[420px] overflow-hidden flex items-center justify-center transition-colors duration-300 ${
              isGlobalDark ? 'bg-slate-950' : 'bg-[#f4f7fb]'
            }`}>
              <img
                src={essoPlotPlanBg}
                alt="Refinery Plot Plan"
                className={`w-full h-full object-cover transition-all duration-300 ${
                  isGlobalDark
                    ? 'filter invert hue-rotate-180 brightness-[0.78] contrast-[1.25] opacity-60'
                    : 'opacity-85 mix-blend-multiply'
                }`}
              />

              {/* Job Location Marker */}
              <div 
                style={{ left: `${activeRequest.markerX}%`, top: `${activeRequest.markerY}%` }}
                className="absolute -translate-x-1/2 -translate-y-1/2 pointer-events-none flex flex-col items-center"
              >
                {/* Working Radius Circle */}
                <div 
                  className="rounded-full border-2 border-dashed border-blue-400 bg-blue-500/20 animate-pulse flex items-center justify-center"
                  style={{ width: `${activeRequest.workingRadiusM * 4.2}px`, height: `${activeRequest.workingRadiusM * 4.2}px` }}
                >
                  <div className="w-3 h-3 rounded-full bg-blue-600 shadow-md ring-4 ring-blue-300" />
                </div>
                <span className="mt-1 px-2 py-0.5 rounded bg-slate-900/90 text-white font-mono text-[9px] font-bold shadow">
                  {activeRequest.requestNo} ({activeRequest.requiredCapacityTon}T)
                </span>
              </div>
            </div>

            <div className="p-3 bg-slate-50 dark:bg-slate-850 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
              <span className="text-slate-500 text-[11px]">
                {isTh ? 'ตำแหน่งจำลองบนแผนผัง CAD โรงกลั่น • ระยะปลอดภัยจากแนวท่อผ่านเกณฑ์' : 'Simulated position on CAD plot plan'}
              </span>
              <button
                type="button"
                onClick={() => setIsPlotPlanDrawerOpen(false)}
                className="px-4 py-1.5 rounded-xl bg-blue-600 text-white font-bold text-xs cursor-pointer shadow-xs"
              >
                {isTh ? 'ปิดหน้าต่าง' : 'Close'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          5. REASSIGN CRANE MODAL
         ========================================================================= */}
      {isReassignModalOpen && (
        <div 
          className="fixed inset-0 z-[130] bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200"
          onClick={() => setIsReassignModalOpen(false)}
        >
          <div 
            className="bg-white dark:bg-slate-900 w-full max-w-md rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 p-6 space-y-4 animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <RotateCcw size={18} className="text-blue-600" />
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  {isTh ? 'เปลี่ยนเครื่องจักรเครน (Reassign Crane)' : 'Reassign Crane'}
                </h3>
              </div>
              <button type="button" onClick={() => setIsReassignModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X size={18} />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="text-slate-400 block mb-1">Current Crane:</label>
                <div className="font-bold text-slate-800 dark:text-slate-200 p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800">
                  {activeRequest.assignedCraneName || 'CRN-01 (100T)'}
                </div>
              </div>

              <div>
                <label className="text-slate-700 dark:text-slate-300 font-bold block mb-1">Select New Crane:</label>
                <select
                  value={reassignNewCraneId}
                  onChange={(e) => setReassignNewCraneId(e.target.value)}
                  className="w-full p-2.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                >
                  {INITIAL_CRANE_FLEET.filter(c => c.availability !== 'Inspection').map(c => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.capacityTon}T) • {c.availability}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-slate-700 dark:text-slate-300 font-bold block mb-1">Reason for Reassignment:</label>
                <textarea
                  rows={2}
                  value={reassignReason}
                  onChange={(e) => setReassignReason(e.target.value)}
                  placeholder="เช่น เครนเดิมติดงานฉุกเฉิน หรือผู้รับเหมาขอปรับขนาด..."
                  className="w-full p-2.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setIsReassignModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs font-bold text-slate-700 dark:text-slate-300"
              >
                {isTh ? 'ยกเลิก' : 'Cancel'}
              </button>
              <button
                type="button"
                onClick={handleConfirmReassign}
                className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-md shadow-blue-500/20 cursor-pointer"
              >
                {isTh ? 'ยืนยันเปลี่ยนเครน' : 'Confirm Reassignment'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          6. UNLOCK ASSIGNMENT MODAL
         ========================================================================= */}
      {isUnlockModalOpen && (
        <div 
          className="fixed inset-0 z-[130] bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200"
          onClick={() => setIsUnlockModalOpen(false)}
        >
          <div 
            className="bg-white dark:bg-slate-900 w-full max-w-md rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 p-6 space-y-4 animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <Unlock size={18} className="text-rose-600" />
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  {isTh ? 'ปลดล็อคการจัดสรร (Unlock Assignment)' : 'Unlock Assignment'}
                </h3>
              </div>
              <button type="button" onClick={() => setIsUnlockModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X size={18} />
              </button>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-300">
              {isTh
                ? 'การปลดล็อคจะยกเลิกการจองเครื่องจักรเครนและนำคำขอกลับสู่สถานะ "Pending Review" เพื่อให้สามารถจัดสรรหรือแก้ไขข้อมูลใหม่ได้'
                : 'Unlocking will release the crane reservation and return the request to Pending Review.'}
            </p>

            <div>
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">Reason for Unlocking:</label>
              <textarea
                rows={2}
                value={unlockReason}
                onChange={(e) => setUnlockReason(e.target.value)}
                placeholder="ระบุเหตุผลในการปลดล็อค เช่น กำหนดการเลื่อนออกไป..."
                className="w-full p-2.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-xs focus:outline-none focus:ring-2 focus:ring-rose-500/20"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setIsUnlockModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs font-bold text-slate-700 dark:text-slate-300"
              >
                {isTh ? 'ยกเลิก' : 'Cancel'}
              </button>
              <button
                type="button"
                onClick={handleConfirmUnlock}
                className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-md shadow-rose-600/20 cursor-pointer"
              >
                {isTh ? 'ยืนยันปลดล็อค' : 'Confirm Unlock'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
