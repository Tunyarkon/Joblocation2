import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  CheckCircle, AlertTriangle, XCircle, Sparkles, Filter,
  Search, ShieldCheck, ChevronRight, RefreshCw, HardHat,
  MapPin, Check, X, Info, Gauge, Eye, Download, Flame, Clock,
  ChevronLeft, ChevronsLeft, ChevronsRight, Crosshair, Save,
  AlertCircle, ShieldAlert, Layers, Lock, Unlock, History,
  FileText, RotateCcw, Wind, Compass, Calendar, ArrowRight,
  HelpCircle, CheckSquare, Square, Truck, ZoomIn, ZoomOut,
  User, ClipboardCheck, ArrowLeftRight, Wrench, Share2, TrendingDown, Sliders
} from 'lucide-react';
import { PlanningJobItem, EquipmentResource } from './optimizerData';
import { useLanguage } from '../context/LanguageContext';
import CraneOptimizeCostSavingDashboard from './CraneOptimizeCostSavingDashboard';
import {
  getCraneAuditLogs,
  addCraneAuditLog,
  CraneAuditLogEntry,
  UnifiedCraneJob,
  getAllCraneJobs,
  updateCraneJob,
  navigateToCraneView,
  getActiveCraneNavContext,
  clearActiveCraneNavContext
} from '../data/craneOperationsData';
import { updateCraneMaster } from '../data/craneMasterData';
import essoPlotPlanBg from '../assets/esso_sriracha_master_plotplan.jpg';
import { useThemeGate, setGlobalThemeGate } from '../utils/themeGate';

interface ReviewPlanOptimizeProps {
  jobs: PlanningJobItem[];
  equipment: EquipmentResource[];
  onUpdateJob: (updatedJob: PlanningJobItem) => void;
  onBatchUpdateJobs?: (updatedJobs: PlanningJobItem[]) => void;
  onSelectMarkingLocation?: (job: PlanningJobItem) => void;
  onNavigateToDashboard?: () => void;
  isScaffolding?: boolean;
  /** Plant selected in the top header bar; the request queue follows it. */
  globalPlantFilter?: 'All' | 'Phra Khanong' | 'Sriracha';
  /** Optional initial mode: 'engineering' or 'cost-saving' */
  defaultMode?: 'engineering' | 'cost-saving';
}

// Known plant obstacles for spatial conflict detection
interface SiteObstacle {
  id: string;
  name: string;
  nameTh?: string;
  plant: string;
  x: number;
  y: number;
  radiusM: number;
  type: 'PipeRack' | 'HighVoltage' | 'Flare' | 'RestrictedZone';
  description: string;
  descriptionTh?: string;
}

const PLANT_OBSTACLES: SiteObstacle[] = [
  {
    id: 'OBS-01',
    name: '115kV Overhead Transmission Line Corridor',
    nameTh: 'แนวเสาสายส่งไฟฟ้าแรงสูง 115 kV',
    plant: 'Phra Khanong',
    x: 75,
    y: 22,
    radiusM: 25,
    type: 'HighVoltage',
    description: 'Minimum 10m clear distance required by EGAT / BCP Electrical Safety Standard.',
    descriptionTh: 'ต้องมีระยะห่างปลอดภัยอย่างน้อย 10 ม. ตามมาตรฐานความปลอดภัยไฟฟ้าแรงสูง กฟผ. / บางจาก'
  },
  {
    id: 'OBS-02',
    name: 'Main Interconnecting Pipe Rack 11-PR',
    nameTh: 'แนวท่อส่งก๊าซและสารไฮโดรคาร์บอนหลัก 11-PR',
    plant: 'Phra Khanong',
    x: 36,
    y: 28,
    radiusM: 18,
    type: 'PipeRack',
    description: 'Hydrocarbon lines in service. No blind swing over live piping without positive protection.',
    descriptionTh: 'ท่อส่งสารไฮโดรคาร์บอนกำลังทำงาน ห้ามสวิงบูมผ่านท่อที่ใช้งานอยู่โดยไม่มีแผงป้องกัน Rigging Blinds'
  },
  {
    id: 'OBS-03',
    name: 'Flare Radiation Exclusion Boundary',
    nameTh: 'รัศมีความร้อนปล่องคบเพลิง Flare Stack',
    plant: 'Phra Khanong',
    x: 82,
    y: 76,
    radiusM: 30,
    type: 'Flare',
    description: 'Restricted hot zone during flaring upset conditions.',
    descriptionTh: 'เขตอันตรายจากความร้อนสูง ห้ามเข้าใกล้ระหว่างการระบายก๊าซทิ้ง'
  },
  {
    id: 'OBS-04',
    name: 'Sriracha Marine Terminal Loading Manifold',
    nameTh: 'ท่าเทียบเรือขนถ่ายสารเคมีศรีราชา (Marine Jetty)',
    plant: 'Sriracha',
    x: 65,
    y: 40,
    radiusM: 22,
    type: 'RestrictedZone',
    description: 'Marine transfer jetty area. Intrinsically safe equipment and sea wind permits required.',
    descriptionTh: 'พื้นที่ท่าเทียบเรือขนถ่ายทางทะเล ต้องใช้อุปกรณ์กันประกายไฟและตรวจวัดแรงลมทะเลก่อนยก'
  }
];

export default function ReviewPlanOptimize({
  jobs,
  equipment,
  onUpdateJob,
  onBatchUpdateJobs,
  onSelectMarkingLocation,
  onNavigateToDashboard,
  isScaffolding = false,
  globalPlantFilter = 'All',
  defaultMode = 'engineering',
}: ReviewPlanOptimizeProps) {
  const { isTh } = useLanguage();
  const [viewMode, setViewMode] = useState<'engineering' | 'cost-saving'>(defaultMode);

  useEffect(() => {
    setViewMode(defaultMode);
  }, [defaultMode]);

  // Currently logged-in authorized reviewer engineer
  const currentReviewer = 'Dr. Narongrit S. (Lead Rigging Engineer, Level 3)';

  // Section B state: Selection, Search & Filter
  const [selectedJobId, setSelectedJobId] = useState<string>(jobs[0]?.id || '');
  const [filterStatus, setFilterStatus] = useState<string>('All');
  const [filterPlant, setFilterPlant] = useState<string>('All');
  const [filterPriority, setFilterPriority] = useState<string>('All');
  const [filterConflictOnly, setFilterConflictOnly] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [pipelinePage, setPipelinePage] = useState<number>(1);
  const isGlobalDark = useThemeGate();
  const pageSize = 12;

  // Header Plant selector drives the request queue
  useEffect(() => {
    setFilterPlant(globalPlantFilter);
    setPipelinePage(1);
  }, [globalPlantFilter]);

  // Auto-focus selected job if navigated from Request List or Plot Plan
  useEffect(() => {
    const nav = getActiveCraneNavContext();
    if (nav?.jobId && jobs.length > 0) {
      const match = jobs.find(j => j.id === String(nav.jobId) || j.jobNo === String(nav.jobId));
      if (match) {
        setSelectedJobId(match.id);
        clearActiveCraneNavContext();
      }
    }
  }, [jobs]);

  // Section C state: Active Workspace Tab
  // 1: Engineering Validation, 2: Site & Conflict Check, 3: Crane Matching, 4: Assignment Review
  const [activeTab, setActiveTab] = useState<'validation' | 'site' | 'matching' | 'review'>('validation');

  // Manual crane selection & override note
  const [manuallySelectedCraneId, setManuallySelectedCraneId] = useState<string>('');
  const [manualRationaleNote, setManualRationaleNote] = useState<string>('');

  // Tab 1: Engineering Review Checklist State
  const [engLiftPlanVerif, setEngLiftPlanVerif] = useState<'Pass' | 'Fail' | 'Pending'>('Pass');
  const [engLoadChartRef, setEngLoadChartRef] = useState<string>('BCP-CR-LC-Liebherr-1300-Rev3.pdf');
  const [engGroundVerif, setEngGroundVerif] = useState<'Pass' | 'Fail' | 'Pending'>('Pass');
  const [engCertVerif, setEngCertVerif] = useState<'Pass' | 'Fail' | 'Pending'>('Pass');
  const [engReviewResult, setEngReviewResult] = useState<'Pass' | 'Fail' | 'Need Revision' | 'Pending'>('Pass');
  const [engRemarks, setEngRemarks] = useState<string>('');

  // Tab 2: Conflict Resolution State
  const [conflictResAction, setConflictResAction] = useState<string>('Select Another Crane');
  const [conflictResRemarks, setConflictResRemarks] = useState<string>('');

  // Tab 3: Optimize With (Shared Crane) State
  const [optimizeWithTarget, setOptimizeWithTarget] = useState<string>('');

  // Modals & Action dialogs
  const [showRejectModal, setShowRejectModal] = useState<boolean>(false);
  const [rejectReasonInput, setRejectReasonInput] = useState<string>('');

  const [showRevisionModal, setShowRevisionModal] = useState<boolean>(false);
  const [revisionNoteInput, setRevisionNoteInput] = useState<string>('');

  const [showAssignConfirmModal, setShowAssignConfirmModal] = useState<boolean>(false);
  const [showAuditLogModal, setShowAuditLogModal] = useState<boolean>(false);
  const [showFreeCraneModal, setShowFreeCraneModal] = useState<boolean>(false);
  const [freeCraneTargetId, setFreeCraneTargetId] = useState<string>('');
  const [showCraneCalendar, setShowCraneCalendar] = useState<boolean>(false);
  const [calendarViewYearMonth, setCalendarViewYearMonth] = useState<{ year: number; month: number }>({ year: 2026, month: 8 });
  const [calendarCustomDate, setCalendarCustomDate] = useState<string>('');
  const [calendarCustomStartTime, setCalendarCustomStartTime] = useState<string>('08:00');
  const [calendarCustomEndTime, setCalendarCustomEndTime] = useState<string>('12:00');
  const [auditLogSearch, setAuditLogSearch] = useState<string>('');
  const [auditLogFilterAction, setAuditLogFilterAction] = useState<string>('ALL');
  const [showOptimizerPreviewModal, setShowOptimizerPreviewModal] = useState<boolean>(false);

  // New Modals: Reassign & Unlock
  const [showReassignModal, setShowReassignModal] = useState<boolean>(false);
  const [reassignTargetCraneId, setReassignTargetCraneId] = useState<string>('');
  const [reassignReasonInput, setReassignReasonInput] = useState<string>('');
  const [reassignNewDate, setReassignNewDate] = useState<string>('');
  const [reassignNewStartTime, setReassignNewStartTime] = useState<string>('');
  const [reassignNewEndTime, setReassignNewEndTime] = useState<string>('');

  const [showUnlockModal, setShowUnlockModal] = useState<boolean>(false);
  const [unlockReasonInput, setUnlockReasonInput] = useState<string>('');

  // Auto-Optimizer Factor Configuration State
  interface OptimizerFactorConfig {
    preset: 'balanced' | 'safety_first' | 'cost_saving' | 'urgent_speed' | 'custom';
    rightSizingWeight: number;      // 0 - 100 (Default 30)
    safetyBufferWeight: number;     // 0 - 100 (Default 25)
    costEfficiencyWeight: number;   // 0 - 100 (Default 25)
    readinessWeight: number;        // 0 - 100 (Default 20)
    minSafetyMarginPct: number;     // 15% - 40% (Default 20%)
    maxGbpLimitRatioPct: number;    // 70% - 100% (Default 100%)
    simulatedWindKnots: number;     // 8 - 28 kts (Default 14 kts)
    simulationScope: 'pending_only' | 'all_unlocked';
    allowAutoTimeShift: boolean;
    preferSharedConsolidation: boolean;
  }

  const DEFAULT_FACTOR_CONFIG: OptimizerFactorConfig = {
    preset: 'balanced',
    rightSizingWeight: 30,
    safetyBufferWeight: 25,
    costEfficiencyWeight: 25,
    readinessWeight: 20,
    minSafetyMarginPct: 20,
    maxGbpLimitRatioPct: 100,
    simulatedWindKnots: 14,
    simulationScope: 'all_unlocked',
    allowAutoTimeShift: true,
    preferSharedConsolidation: true
  };

  const [optimizerFactorConfig, setOptimizerFactorConfig] = useState<OptimizerFactorConfig>(DEFAULT_FACTOR_CONFIG);
  const [showFactorConfigPanel, setShowFactorConfigPanel] = useState<boolean>(true);

  const applyFactorPreset = (preset: OptimizerFactorConfig['preset']) => {
    if (preset === 'balanced') {
      setOptimizerFactorConfig(prev => ({
        ...DEFAULT_FACTOR_CONFIG,
        simulationScope: prev.simulationScope
      }));
    } else if (preset === 'safety_first') {
      setOptimizerFactorConfig(prev => ({
        ...prev,
        preset: 'safety_first',
        rightSizingWeight: 20,
        safetyBufferWeight: 50,
        costEfficiencyWeight: 10,
        readinessWeight: 20,
        minSafetyMarginPct: 30,
        maxGbpLimitRatioPct: 85,
        simulatedWindKnots: 18,
        allowAutoTimeShift: true,
        preferSharedConsolidation: false
      }));
    } else if (preset === 'cost_saving') {
      setOptimizerFactorConfig(prev => ({
        ...prev,
        preset: 'cost_saving',
        rightSizingWeight: 40,
        safetyBufferWeight: 15,
        costEfficiencyWeight: 35,
        readinessWeight: 10,
        minSafetyMarginPct: 20,
        maxGbpLimitRatioPct: 100,
        simulatedWindKnots: 14,
        allowAutoTimeShift: true,
        preferSharedConsolidation: true
      }));
    } else if (preset === 'urgent_speed') {
      setOptimizerFactorConfig(prev => ({
        ...prev,
        preset: 'urgent_speed',
        rightSizingWeight: 20,
        safetyBufferWeight: 20,
        costEfficiencyWeight: 15,
        readinessWeight: 45,
        minSafetyMarginPct: 20,
        maxGbpLimitRatioPct: 100,
        simulatedWindKnots: 14,
        allowAutoTimeShift: true,
        preferSharedConsolidation: true
      }));
    }
  };

  // Auto-Optimizer Preview Simulation State
  interface OptimizerPreviewItem {
    job: PlanningJobItem;
    recommendedCrane?: EquipmentResource;
    score: number;
    safetyResult: 'PASS' | 'FAIL' | 'PENDING';
    safetyMarginPct?: number;
    gbpRatioPct?: number;
    estSavingThb?: number;
    shiftedSlot?: { start: string; end: string };
    factorBreakdown?: {
      rightSizingPts: number;
      safetyPts: number;
      costPts: number;
      readinessPts: number;
    };
    reason: string;
    hasConflict: boolean;
    selected: boolean;
  }
  const [optimizerPreviewItems, setOptimizerPreviewItems] = useState<OptimizerPreviewItem[]>([]);

  // Site marking interactive pin editing state
  const [isEditingMarking, setIsEditingMarking] = useState<boolean>(false);
  const [tempMarkingCoords, setTempMarkingCoords] = useState<{ x: number; y: number } | null>(null);
  const [markingSavedNotice, setMarkingSavedNotice] = useState<boolean>(false);

  // Site Blueprint Map Zoom & Pan State (locked to min 1.0 / 100% to eliminate black borders)
  const [blueprintZoom, setBlueprintZoom] = useState<number>(1);
  const [blueprintPan, setBlueprintPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isDraggingBlueprint, setIsDraggingBlueprint] = useState<boolean>(false);
  const blueprintDragStartRef = useRef<{ x: number; y: number; panX: number; panY: number }>({ x: 0, y: 0, panX: 0, panY: 0 });
  const blueprintContainerRef = useRef<HTMLDivElement>(null);

  const clampBlueprintPan = (pan: { x: number; y: number }, zoom: number) => {
    if (zoom <= 1) return { x: 0, y: 0 };
    const container = blueprintContainerRef.current;
    const width = container ? container.clientWidth : 600;
    const height = container ? container.clientHeight : 288;
    const maxPanX = ((zoom - 1) * width) / 2;
    const maxPanY = ((zoom - 1) * height) / 2;
    return {
      x: Math.max(-maxPanX, Math.min(maxPanX, pan.x)),
      y: Math.max(-maxPanY, Math.min(maxPanY, pan.y))
    };
  };

  const handleBlueprintWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    e.preventDefault();
    setBlueprintZoom(prev => {
      const next = e.deltaY < 0
        ? Math.min(4.0, parseFloat((prev + 0.15).toFixed(2)))
        : Math.max(1.0, parseFloat((prev - 0.15).toFixed(2)));
      if (next <= 1) {
        setBlueprintPan({ x: 0, y: 0 });
      } else {
        setBlueprintPan(p => clampBlueprintPan(p, next));
      }
      return next;
    });
  };

  const handleBlueprintMouseDown = (e: React.MouseEvent) => {
    if (blueprintZoom <= 1 || isEditingMarking) return;
    setIsDraggingBlueprint(true);
    blueprintDragStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      panX: blueprintPan.x,
      panY: blueprintPan.y
    };
  };

  const handleBlueprintMouseMove = (e: React.MouseEvent) => {
    if (!isDraggingBlueprint || blueprintZoom <= 1) return;
    const dx = e.clientX - blueprintDragStartRef.current.x;
    const dy = e.clientY - blueprintDragStartRef.current.y;
    setBlueprintPan(clampBlueprintPan({
      x: blueprintDragStartRef.current.panX + dx,
      y: blueprintDragStartRef.current.panY + dy
    }, blueprintZoom));
  };

  const handleBlueprintMouseUp = () => setIsDraggingBlueprint(false);

  // Success / Info Toast
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'info' | 'warning' } | null>(null);

  const showToast = (text: string, type: 'success' | 'info' | 'warning' = 'success') => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 4500);
  };

  // Selected job resolver
  const selectedJob = useMemo(() => {
    return jobs.find(j => j.id === selectedJobId) || jobs[0];
  }, [jobs, selectedJobId]);

  // Unified jobs mapping for WO Number and Request specs
  const unifiedJobsMap = useMemo(() => {
    const all = getAllCraneJobs();
    const map = new Map<string, UnifiedCraneJob>();
    all.forEach(uj => {
      map.set(String(uj.id), uj);
      if (uj.jobNo) map.set(uj.jobNo, uj);
      if (uj.requestNo) map.set(uj.requestNo, uj);
    });
    return map;
  }, [jobs]);

  // Keep manual selection in sync when selected job changes
  useEffect(() => {
    if (selectedJob?.assignedCraneId) {
      setManuallySelectedCraneId(selectedJob.assignedCraneId);
    } else {
      setManuallySelectedCraneId('');
    }
    setManualRationaleNote('');
    setIsEditingMarking(false);
    setTempMarkingCoords(null);

    // Sync Engineering Checklist state from selectedJob
    if (selectedJob?.engineeringChecklist) {
      setEngLiftPlanVerif(selectedJob.engineeringChecklist.liftPlanVerification || 'Pass');
      setEngLoadChartRef(selectedJob.engineeringChecklist.loadChartRef || 'BCP-CR-LC-Liebherr-1300-Rev3.pdf');
      setEngGroundVerif(selectedJob.engineeringChecklist.siteGroundVerification || 'Pass');
      setEngCertVerif(selectedJob.engineeringChecklist.certVerification || 'Pass');
      setEngReviewResult(selectedJob.engineeringChecklist.engineeringReviewResult || 'Pass');
      setEngRemarks(selectedJob.engineeringChecklist.engineeringRemarks || '');
    } else {
      setEngLiftPlanVerif('Pass');
      setEngLoadChartRef('BCP-CR-LC-Liebherr-1300-Rev3.pdf');
      setEngGroundVerif('Pass');
      setEngCertVerif('Pass');
      setEngReviewResult('Pass');
      setEngRemarks('');
    }

    if (selectedJob?.optimizeWith) {
      setOptimizeWithTarget(selectedJob.optimizeWith);
    } else {
      setOptimizeWithTarget('');
    }
  }, [selectedJobId, selectedJob?.assignedCraneId]);

  // Effective Marking Coordinates
  const currentCoords = tempMarkingCoords || selectedJob?.markingLocation || { x: 50, y: 50 };

  // =========================================================================
  // CORE ENGINEERING VALIDATION & SAFETY LOGIC
  // Evaluates load chart capacity, safety margin, ground bearing pressure,
  // and wind limits dynamically according to crane configuration and site parameters.
  // =========================================================================
  const evaluateEngineeringValidation = (crane: EquipmentResource | undefined, job: PlanningJobItem | undefined) => {
    if (!job) {
      return {
        result: 'PENDING' as const,
        loadChartCapacityTon: 0,
        safetyMarginPercent: 0,
        groundBearingPressureKPa: 0,
        soilBearingLimitKPa: 220,
        windLimitKnots: 20,
        siteForecastWindKnots: 14,
        isCertValid: false,
        certExpiry: '-',
        reasons: [isTh ? 'ยังไม่ได้เลือกคำขอใช้งาน' : 'No lifting request selected']
      };
    }

    if (!crane) {
      return {
        result: 'PENDING' as const,
        loadChartCapacityTon: 0,
        safetyMarginPercent: 0,
        groundBearingPressureKPa: 0,
        soilBearingLimitKPa: job.plant === 'Sriracha' ? 260 : 220,
        windLimitKnots: 20,
        siteForecastWindKnots: 14,
        isCertValid: false,
        certExpiry: '-',
        reasons: [isTh ? 'รอเลือกโมเดลเครนเพื่อคำนวณ Load Chart และแรงกดดิน' : 'Pending Crane Selection for Load Chart & Ground Pressure verification']
      };
    }

    const craneCap = crane.capacityTon;
    const boomLen = crane.boomLengthM;
    const certValid = crane.isCertValid !== false;
    const certExp = crane.certExpiryDate || '2026-12-31';

    // Dynamic Load Chart Derivation:
    const radiusRatio = Math.min(0.92, Math.max(0.1, job.requiredRadiusM / (boomLen + 8)));
    const loadChartCapacityTon = Math.max(
      1,
      Math.round(craneCap * Math.pow(1 - radiusRatio, 1.2) * 10) / 10
    );

    // Safety Margin %: (LoadChartCap - GrossLoad) / LoadChartCap * 100 (>= 20% required)
    const safetyMarginPercent = Math.round(((loadChartCapacityTon - job.loadWeightTon) / loadChartCapacityTon) * 100);

    // Ground Bearing Pressure (GBP in kPa):
    const craneDeadWeightTon = craneCap * 0.75;
    const matAreaM2 = 2.25; // standard 1.5m x 1.5m steel/hardwood mat
    const totalWeightKN = (craneDeadWeightTon + job.loadWeightTon) * 9.81;
    const groundBearingPressureKPa = Math.round(totalWeightKN / (4 * matAreaM2));

    // Soil Bearing Capacity Limit based on plant location / zone
    const soilBearingLimitKPa = job.plant === 'Sriracha' ? 260 : 220;

    // Wind Limit check (knots)
    const craneWindLimitKnots = crane.maxAllowableWindKnots || 20;
    const siteForecastWindKnots = 14;

    const reasons: string[] = [];
    let isFail = false;
    let isPending = false;

    // 1. Capacity & Load Chart Check
    if (loadChartCapacityTon < job.loadWeightTon) {
      isFail = true;
      reasons.push(
        isTh
          ? `น้ำหนักยกสุทธิ ${job.loadWeightTon} ตัน เกินพิกัดความจุ Load Chart ${loadChartCapacityTon} ตัน ณ รัศมี ${job.requiredRadiusM} ม.`
          : `Gross Load ${job.loadWeightTon}T exceeds Load Chart capacity ${loadChartCapacityTon}T at ${job.requiredRadiusM}m radius`
      );
    } else if (safetyMarginPercent < 20) {
      isFail = true;
      reasons.push(
        isTh
          ? `ค่าเผื่อความปลอดภัยอยู่ที่ ${safetyMarginPercent}% (ต่ำกว่าเกณฑ์ความปลอดภัยขั้นต่ำ 20%)`
          : `Safety Margin is ${safetyMarginPercent}% (< 20% required minimum safety factor)`
      );
    } else {
      reasons.push(
        isTh
          ? `พิกัด Load Chart ${loadChartCapacityTon} ตัน มีค่าเผื่อความปลอดภัยที่ปลอดภัยถึง +${safetyMarginPercent}%`
          : `Load Chart capacity ${loadChartCapacityTon}T provides safe margin of +${safetyMarginPercent}%`
      );
    }

    // 2. Boom Length Check
    if (boomLen < job.requiredRadiusM + 4) {
      isFail = true;
      reasons.push(
        isTh
          ? `ความยาวบูม ${boomLen} ม. ไม่เพียงพอกับระยะรัศมี ${job.requiredRadiusM} ม. (ต้องมีระยะพ้นอย่างน้อย 4 ม.)`
          : `Boom length ${boomLen}m insufficient for working radius ${job.requiredRadiusM}m (minimum 4m clearance required)`
      );
    }

    // 3. Ground Bearing Pressure Check
    if (groundBearingPressureKPa > soilBearingLimitKPa) {
      isFail = true;
      reasons.push(
        isTh
          ? `แรงกดใต้ขาช้าง (GBP) ${groundBearingPressureKPa} kPa เกินค่ารับน้ำหนักของดิน ${soilBearingLimitKPa} kPa (ต้องเสริมแผ่นเหล็ก)`
          : `Outrigger GBP ${groundBearingPressureKPa} kPa exceeds soil bearing capacity ${soilBearingLimitKPa} kPa (Additional steel matting required)`
      );
    } else {
      reasons.push(
        isTh
          ? `แรงกดใต้ขาช้าง (GBP) ${groundBearingPressureKPa} kPa อยู่ในเกณฑ์ปลอดภัยของดิน ${soilBearingLimitKPa} kPa`
          : `Outrigger GBP ${groundBearingPressureKPa} kPa is within soil limit of ${soilBearingLimitKPa} kPa`
      );
    }

    // 4. Wind Limit Check
    if (siteForecastWindKnots > craneWindLimitKnots) {
      isFail = true;
      reasons.push(
        isTh
          ? `พยากรณ์ความเร็วลมหน้างาน ${siteForecastWindKnots} นอต เกินขีดจำกัดความปลอดภัยของบูม ${craneWindLimitKnots} นอต`
          : `Site wind forecast ${siteForecastWindKnots} kts exceeds allowable boom limit ${craneWindLimitKnots} kts`
      );
    } else {
      reasons.push(
        isTh
          ? `ความเร็วลมหน้างาน ${siteForecastWindKnots} นอต อยู่ในเกณฑ์ปลอดภัยของบูม (${craneWindLimitKnots} นอต)`
          : `Site wind ${siteForecastWindKnots} kts within safe limit of ${craneWindLimitKnots} kts`
      );
    }

    // 5. Certification Status Check
    if (!certValid) {
      isFail = true;
      reasons.push(
        isTh
          ? `ใบรับรอง ปจ.2 ประจำปีของเครนหมดอายุหรือไม่ถูกต้อง (${certExp})`
          : `Crane annual certification (Phor Jor 2) expired or invalid (${certExp})`
      );
    } else {
      reasons.push(
        isTh
          ? `ใบรับรอง ปจ.2 ได้รับการตรวจสอบและมีผลบังคับใช้ถึง ${certExp}`
          : `Phor Jor 2 certification verified and valid until ${certExp}`
      );
    }

    // 6. Crane Operational Status
    if (crane.status === 'Maintenance') {
      isFail = true;
      reasons.push(
        isTh
          ? 'เครนคันนี้อยู่ระหว่างการซ่อมบำรุงในโรงซ่อม (Maintenance)'
          : 'Crane is currently grounded in workshop maintenance'
      );
    } else if (crane.status === 'Inspection') {
      isPending = true;
      reasons.push(
        isTh
          ? 'เครนคันนี้อยู่ระหว่างการสอบเทียบและตรวจเช็กตามรอบ (Inspection)'
          : 'Crane is currently undergoing periodic calibration inspection'
      );
    }

    const result: 'PASS' | 'FAIL' | 'PENDING' = isFail ? 'FAIL' : isPending ? 'PENDING' : 'PASS';

    return {
      result,
      loadChartCapacityTon,
      safetyMarginPercent,
      groundBearingPressureKPa,
      soilBearingLimitKPa,
      windLimitKnots: craneWindLimitKnots,
      siteForecastWindKnots,
      isCertValid: certValid,
      certExpiry: certExp,
      reasons
    };
  };

  // =========================================================================
  // CONFLICT DETECTION ENGINE (SPATIAL, TIME, RESTRICTED ZONES)
  // =========================================================================
  const detectConflicts = (job: PlanningJobItem | undefined, coords: { x: number; y: number }, targetCraneId?: string) => {
    if (!job) return { hasConflict: false, warnings: [], conflicts: [], conflictType: 'None' as string };

    const warnings: string[] = [];
    const conflicts: string[] = [];
    let conflictType = 'None';

    // 1. Spatial Obstacle Conflict (Proximity check on 2D Plot Grid)
    PLANT_OBSTACLES.forEach(obs => {
      if (obs.plant === job.plant) {
        const dx = (coords.x - obs.x);
        const dy = (coords.y - obs.y);
        const distancePercent = Math.sqrt(dx * dx + dy * dy);
        const distanceM = Math.round(distancePercent * 2.5);
        const safeClearanceM = job.requiredRadiusM + (obs.radiusM * 0.5);
        const obsName = (isTh && obs.nameTh) ? obs.nameTh : obs.name;

        if (distanceM < safeClearanceM) {
          if (obs.type === 'HighVoltage') {
            conflictType = 'Site Restriction';
            conflicts.push(
              isTh
                ? `ข้อขัดแย้งเร่งด่วน: รัศมีการยกทับซ้อนในระยะ ${distanceM}ม. จาก ${obsName} (ต้องมีระยะห่างปลอดภัยอย่างน้อย ${safeClearanceM}ม.)`
                : `CRITICAL: Operating radius overlaps within ${distanceM}m of ${obs.name} (< ${safeClearanceM}m safe clearance).`
            );
          } else if (obs.type === 'PipeRack') {
            warnings.push(
              isTh
                ? `คำเตือนระยะใกล้: รัศมีการยกเข้าใกล้ ${obsName} ภายในระยะ ${distanceM}ม. ต้องจัดทำแผงกั้น Rigging Blinds`
                : `Proximity Warning: Working radius reaches within ${distanceM}m of ${obs.name}. Rigging blinds mandatory.`
            );
          } else {
            warnings.push(
              isTh
                ? `ข้อควรระวัง: ตำแหน่งตั้งอยู่ในโซนระวังอันตรายของ ${obsName}`
                : `Caution: Located within zone of ${obs.name}.`
            );
          }
        }
      }
    });

    // Helper: calculate if two time ranges actually overlap
    const isTimeOverlap = (sA?: string, eA?: string, sB?: string, eB?: string) => {
      const toMin = (t?: string) => {
        if (!t) return 0;
        const parts = t.split(':').map(Number);
        return (parts[0] || 0) * 60 + (parts[1] || 0);
      };
      const startA = toMin(sA || '08:00');
      const endA = toMin(eA || '12:00');
      const startB = toMin(sB || '08:00');
      const endB = toMin(eB || '12:00');
      return Math.max(startA, startB) < Math.min(endA, endB);
    };

    // 2. Spatial / Time Overlap with Other Active Jobs on Same Date
    jobs.forEach(other => {
      if (other.id !== job.id && other.date === job.date && other.status !== 'Rejected') {
        const dx = (coords.x - other.markingLocation.x);
        const dy = (coords.y - other.markingLocation.y);
        const distanceM = Math.round(Math.sqrt(dx * dx + dy * dy) * 2.5);
        const combinedBoomReach = (job.requiredRadiusM + other.requiredRadiusM);

        if (distanceM < combinedBoomReach && isTimeOverlap(job.startTime, job.endTime, other.startTime, other.endTime)) {
          warnings.push(
            isTh
              ? `แจ้งเตือนงานยกข้างเคียง: งาน ${other.jobNo} มีกำหนดการทำงานห่างเพียง ${distanceM}ม. ในเวลาคาบเกี่ยวกัน (${other.startTime} - ${other.endTime}) ต้องประสานงานระยะสวิงเครนคู่`
              : `Adjacent Lift Notice: Job ${other.jobNo} is scheduled within ${distanceM}m during overlapping window (${other.startTime} - ${other.endTime}). Dual-lift coordination required.`
          );
        }

        // Time Conflict Check: Same Crane ID assigned on overlapping timeslot
        const checkCraneId = targetCraneId || job.assignedCraneId;
        if (checkCraneId && other.assignedCraneId === checkCraneId && (other.status === 'Assigned' || other.status === 'Optimized')) {
          if (isTimeOverlap(job.startTime, job.endTime, other.startTime, other.endTime)) {
            conflictType = 'Crane Double Booking';
            const alreadyReported = conflicts.some(c => c.includes(checkCraneId));
            if (!alreadyReported) {
              conflicts.push(
                isTh
                  ? `ข้อขัดแย้งตารางเวลา: เครน ${checkCraneId} ถูกล็อกคิวให้กับงาน ${other.jobNo} ในเวลาเดียวกัน (${other.startTime} - ${other.endTime})`
                  : `Schedule Conflict: Crane ${checkCraneId} is booked for ${other.jobNo} on ${other.date} (${other.startTime} - ${other.endTime}). Double booking prevented.`
              );
            }
          }
        }
      }
    });

    // 3. Restricted Zone Boundary Check
    if (coords.x > 75 && coords.y < 25 && job.plant === 'Phra Khanong') {
      conflictType = 'Site Restriction';
      conflicts.push(
        isTh
          ? 'พื้นที่ห้ามตั้งเครน: พิกัดอยู่ในแนวพื้นที่สถานีไฟฟ้าย่อยแรงสูง (ห้ามกางขาช้าง Outrigger เด็ดขาด)'
          : 'Restricted Area: Coordinates fall inside High-Voltage Substation Corridor (Outrigger placement prohibited).'
      );
    }

    // 4. Ground Condition Check
    if (coords.x > 70 && coords.y > 70 && job.plant === 'Phra Khanong') {
      warnings.push(
        isTh
          ? 'คำเตือนสภาพพื้นดิน: ตรวจพบพื้นที่ดินอ่อนที่ยังไม่ลาดยาง ต้องปูแผ่นเหล็กหนาอย่างน้อย 50 มม. ก่อนตั้งเครน'
          : 'Ground Warning: Unpaved soil sector detected. Minimum 50mm heavy steel road matting required.'
      );
    }

    return {
      hasConflict: conflicts.length > 0,
      hasWarning: warnings.length > 0,
      conflicts,
      warnings,
      conflictType: conflicts.length > 0 ? (conflictType !== 'None' ? conflictType : 'Schedule Overlap') : 'None'
    };
  };

  // Pre-calculate conflict map for all jobs to drive KPI & Badges
  const conflictJobMap = useMemo(() => {
    const map = new Map<string, { hasConflict: boolean; conflicts: string[]; warnings: string[]; conflictType: string }>();
    jobs.forEach(j => {
      const res = detectConflicts(j, j.markingLocation, j.assignedCraneId);
      if (res.hasConflict) {
        map.set(j.id, res);
      }
    });
    return map;
  }, [jobs, equipment]);

  // Selected candidate crane resolver
  const effectiveCrane = useMemo(() => {
    const targetId = manuallySelectedCraneId || selectedJob?.assignedCraneId;
    return equipment.find(e => e.id === targetId) || equipment.find(e => e.id === selectedJob?.assignedCraneId);
  }, [equipment, manuallySelectedCraneId, selectedJob?.assignedCraneId]);

  // Current Validation & Conflict checks for Selected Job
  const currentValidation = useMemo(() => {
    return evaluateEngineeringValidation(effectiveCrane, selectedJob);
  }, [effectiveCrane, selectedJob]);

  const currentConflictCheck = useMemo(() => {
    return detectConflicts(selectedJob, currentCoords, effectiveCrane?.id);
  }, [selectedJob, currentCoords, effectiveCrane?.id]);

  // =========================================================================
  // SUITABILITY SCORE CALCULATION (FACTOR-DRIVEN MULTI-OBJECTIVE SCORING)
  // =========================================================================
  const getSuitabilityScore = (
    crane: EquipmentResource,
    job: PlanningJobItem,
    cfg: OptimizerFactorConfig = optimizerFactorConfig
  ) => {
    const val = evaluateEngineeringValidation(crane, job);
    const gbpRatioPct = Math.round((val.groundBearingPressureKPa / Math.max(1, val.soilBearingLimitKPa)) * 100);

    // Check against configurable Factor Config safety & environmental gates
    const failsConfiguredMargin = val.safetyMarginPercent < cfg.minSafetyMarginPct;
    const failsConfiguredGbp = gbpRatioPct > cfg.maxGbpLimitRatioPct;
    const failsSimulatedWind = cfg.simulatedWindKnots > val.windLimitKnots;

    if (val.result === 'FAIL' || failsConfiguredMargin || failsConfiguredGbp || failsSimulatedWind) {
      const customFailReason = failsSimulatedWind
        ? (isTh ? `ความเร็วลมจำลอง (${cfg.simulatedWindKnots} kts) เกินขีดจำกัดเครน (${val.windLimitKnots} kts)` : `Simulated wind (${cfg.simulatedWindKnots} kts) exceeds crane limit (${val.windLimitKnots} kts)`)
        : failsConfiguredMargin
          ? (isTh ? `Safety Margin (+${val.safetyMarginPercent}%) ต่ำกว่าเกณฑ์ที่ตั้งไว้ (${cfg.minSafetyMarginPct}%)` : `Safety Margin (+${val.safetyMarginPercent}%) below configured ${cfg.minSafetyMarginPct}% gate`)
          : failsConfiguredGbp
            ? (isTh ? `แรงกดดิน GBP (${gbpRatioPct}%) เกินเกณฑ์ที่ตั้งไว้ (${cfg.maxGbpLimitRatioPct}%)` : `Soil GBP (${gbpRatioPct}%) exceeds configured ${cfg.maxGbpLimitRatioPct}% limit`)
            : (isTh ? 'ไม่ผ่านเกณฑ์ความปลอดภัย' : 'Safety Gate Failed');

      return {
        score: 0,
        label: customFailReason,
        tier: 'failed' as const,
        eligible: false,
        validation: val,
        gbpRatioPct,
        factorBreakdown: { rightSizingPts: 0, safetyPts: 0, costPts: 0, readinessPts: 0 }
      };
    }

    if (val.result === 'PENDING') {
      return {
        score: 30,
        label: isTh ? 'รอการประเมินสเปก' : 'Pending Verification',
        tier: 'pending' as const,
        eligible: false,
        validation: val,
        gbpRatioPct,
        factorBreakdown: { rightSizingPts: 10, safetyPts: 10, costPts: 5, readinessPts: 5 }
      };
    }

    if (crane.status === 'Maintenance') {
      return {
        score: 0,
        label: isTh ? 'อยู่ระหว่างซ่อมบำรุง' : 'In Maintenance',
        tier: 'failed' as const,
        eligible: false,
        validation: val,
        gbpRatioPct,
        factorBreakdown: { rightSizingPts: 0, safetyPts: 0, costPts: 0, readinessPts: 0 }
      };
    }

    // Normalize weights so total weight = 100
    const totalRawWeight = Math.max(
      1,
      cfg.rightSizingWeight + cfg.safetyBufferWeight + cfg.costEfficiencyWeight + cfg.readinessWeight
    );
    const wRightSize = (cfg.rightSizingWeight / totalRawWeight) * 100;
    const wSafety = (cfg.safetyBufferWeight / totalRawWeight) * 100;
    const wCost = (cfg.costEfficiencyWeight / totalRawWeight) * 100;
    const wReadiness = (cfg.readinessWeight / totalRawWeight) * 100;

    // 1. Right-Sizing Factor (0.0 - 1.0): Ideal capacity ratio is 1.25x to 2.2x of loadWeightTon
    const capRatio = crane.capacityTon / Math.max(1, job.loadWeightTon);
    let rightSizeNorm = 0.55;
    if (capRatio >= 1.25 && capRatio <= 2.0) {
      rightSizeNorm = 1.0;
    } else if (capRatio > 2.0 && capRatio <= 3.0) {
      rightSizeNorm = 0.82;
    } else if (capRatio > 3.0 && capRatio <= 4.5) {
      rightSizeNorm = 0.62;
    } else if (capRatio > 4.5) {
      rightSizeNorm = 0.38; // Penalize severe over-sizing
    }

    // 2. Safety Buffer Factor (0.0 - 1.0): Higher safety margin & lower GBP ratio
    const marginHeadroom = Math.min(1.0, Math.max(0.3, val.safetyMarginPercent / 85));
    const gbpHeadroom = Math.min(1.0, Math.max(0.3, (115 - gbpRatioPct) / 65));
    const safetyNorm = marginHeadroom * 0.65 + gbpHeadroom * 0.35;

    // 3. Cost Efficiency & Shared Consolidation Factor (0.0 - 1.0)
    // Lower hourly rate relative to fleet max (฿12,500/hr)
    const rateNorm = Math.min(1.0, Math.max(0.35, 1 - (crane.hourlyRateThb - 2500) / 11500));
    const hasCoLocatedSameDay = cfg.preferSharedConsolidation && jobs.some(
      other =>
        other.id !== job.id &&
        other.plant === job.plant &&
        other.date === job.date &&
        other.assignedCraneId === crane.id &&
        other.status !== 'Rejected'
    );
    const costNorm = Math.min(1.0, rateNorm + (hasCoLocatedSameDay ? 0.18 : 0));

    // 4. Readiness & Priority Urgency Factor (0.0 - 1.0)
    let readinessNorm = crane.status === 'Available' ? 0.85 : 0.6;
    if (crane.fuelLevelPercent && crane.fuelLevelPercent >= 80) readinessNorm += 0.08;
    if (crane.efficiencyRating && crane.efficiencyRating >= 90) readinessNorm += 0.07;
    if (job.priority === 'Critical' || job.priority === 'High') {
      readinessNorm = Math.min(1.0, readinessNorm + 0.05);
    }
    readinessNorm = Math.min(1.0, readinessNorm);

    const rightSizingPts = Math.round(wRightSize * rightSizeNorm);
    const safetyPts = Math.round(wSafety * safetyNorm);
    const costPts = Math.round(wCost * costNorm);
    const readinessPts = Math.round(wReadiness * readinessNorm);

    const rawWeighted = rightSizingPts + safetyPts + costPts + readinessPts;
    const finalScore = Math.min(100, Math.max(18, rawWeighted));

    const label = finalScore >= 85
      ? (isTh ? 'เหมาะสมที่สุด (แนะนำ)' : 'Recommended Match')
      : finalScore >= 60
        ? (isTh ? 'ทางเลือกสำรอง' : 'Alternative Match')
        : (isTh ? 'ความเหมาะสมต่ำ' : 'Low Suitability');
    const tier = finalScore >= 85 ? ('recommended' as const) : ('alternative' as const);

    return {
      score: finalScore,
      label,
      tier,
      eligible: true,
      validation: val,
      gbpRatioPct,
      factorBreakdown: {
        rightSizingPts,
        safetyPts,
        costPts,
        readinessPts
      }
    };
  };

  // =========================================================================
  // RUN AUTO-OPTIMIZER ENGINE (FACTOR-CONFIGURED SIMULATION PREVIEW)
  // =========================================================================
  const computeAutoOptimizerPreview = (cfg: OptimizerFactorConfig = optimizerFactorConfig): OptimizerPreviewItem[] => {
    const targetJobs = jobs.filter(j => {
      if (cfg.simulationScope === 'pending_only') {
        return j.status === 'Pending Review';
      }
      // 'all_unlocked': include Pending Review and Optimized (not yet locked Assigned or Rejected)
      return j.status === 'Pending Review' || (j.status === 'Optimized' && j.assignmentStatus !== 'Locked');
    });

    // Fallback to all non-rejected jobs if filter yielded 0 so simulation modal is always interactive
    const effectiveList = targetJobs.length > 0
      ? targetJobs
      : jobs.filter(j => j.status !== 'Rejected');

    return effectiveList.map(job => {
      // Evaluate all cranes under active Factor Config
      const evaluated = equipment.map(crane => {
        const suitability = getSuitabilityScore(crane, job, cfg);
        const conflicts = detectConflicts(job, job.markingLocation, crane.id);
        return { crane, suitability, conflicts };
      });

      // 1. Direct conflict-free eligible candidates
      const directCandidates = evaluated
        .filter(c => c.suitability.eligible && !c.conflicts.hasConflict)
        .sort((a, b) => b.suitability.score - a.suitability.score);

      // 2. If allowAutoTimeShift is enabled and a higher-scoring crane has only a time-overlap conflict, check if a same-day slot exists
      let chosenCandidate = directCandidates[0];
      let shiftedSlot: { start: string; end: string } | undefined;

      if (cfg.allowAutoTimeShift) {
        const timeShiftCandidates = evaluated
          .filter(c => c.suitability.eligible && c.conflicts.hasConflict && c.conflicts.conflictType === 'Crane Double Booking')
          .sort((a, b) => b.suitability.score - a.suitability.score);

        if (timeShiftCandidates.length > 0) {
          const topTimeShift = timeShiftCandidates[0];
          // Check if no direct candidate exists OR topTimeShift scores significantly higher (+8 pts)
          if (!chosenCandidate || topTimeShift.suitability.score >= chosenCandidate.suitability.score + 8) {
            const avail = getCraneAvailability(topTimeShift.crane, job);
            if (avail.slot) {
              chosenCandidate = topTimeShift;
              shiftedSlot = avail.slot;
            }
          }
        }
      }

      if (chosenCandidate) {
        const best = chosenCandidate;
        const val = best.suitability.validation;
        // Estimate cost saving vs next-larger crane tier + shared mobilization
        const largerCranes = equipment.filter(e => e.capacityTon > best.crane.capacityTon);
        const avgLargerRate = largerCranes.length > 0
          ? largerCranes.reduce((s, e) => s + e.hourlyRateThb, 0) / largerCranes.length
          : best.crane.hourlyRateThb * 1.35;
        const rateDiffSaving = Math.max(2500, Math.round((avgLargerRate - best.crane.hourlyRateThb) * 4));
        const sharedMobBonus = cfg.preferSharedConsolidation ? 8500 : 0;
        const estSavingThb = rateDiffSaving + sharedMobBonus;

        const breakdown = best.suitability.factorBreakdown;
        const reasonText = isTh
          ? `ผ่านเกณฑ์ Safety +${val.safetyMarginPercent}% (ขั้นต่ำ ${cfg.minSafetyMarginPct}%) · GBP ${best.suitability.gbpRatioPct}%${shiftedSlot ? ` · เลื่อนเวลาอัตโนมัติเป็น ${shiftedSlot.start}-${shiftedSlot.end}` : ''} · ประหยัด ~฿${estSavingThb.toLocaleString()}`
          : `Safety +${val.safetyMarginPercent}% (≥${cfg.minSafetyMarginPct}% gate) · GBP ${best.suitability.gbpRatioPct}%${shiftedSlot ? ` · Auto-shifted to ${shiftedSlot.start}-${shiftedSlot.end}` : ''} · Est. saving ฿${estSavingThb.toLocaleString()}`;

        return {
          job,
          recommendedCrane: best.crane,
          score: best.suitability.score,
          safetyResult: 'PASS',
          safetyMarginPct: val.safetyMarginPercent,
          gbpRatioPct: best.suitability.gbpRatioPct,
          estSavingThb,
          shiftedSlot,
          factorBreakdown: breakdown,
          reason: reasonText,
          hasConflict: false,
          selected: true
        };
      } else {
        const failReasons: string[] = [];
        evaluated.forEach(c => {
          if (!c.suitability.eligible) {
            failReasons.push(`${c.crane.name}: ${c.suitability.label}`);
          }
        });
        const conflictCheck = detectConflicts(job, job.markingLocation);

        return {
          job,
          score: 0,
          safetyResult: 'FAIL',
          safetyMarginPct: 0,
          gbpRatioPct: 0,
          estSavingThb: 0,
          reason: conflictCheck.hasConflict
            ? (isTh ? `ติดข้อขัดแย้งพื้นที่/เวลา: ${conflictCheck.conflicts[0]}` : `Blocked by spatial/schedule conflict: ${conflictCheck.conflicts[0]}`)
            : failReasons.length > 0
              ? failReasons[0]
              : (isTh ? 'ไม่มีเครนที่ผ่านเกณฑ์ตัวแปรที่ตั้งค่าไว้ (ลองลดเกณฑ์ Safety Margin หรือความเร็วลม)' : 'No crane passes current Factor Config thresholds'),
          hasConflict: conflictCheck.hasConflict,
          selected: false
        };
      }
    });
  };

  // Automatically recompute simulation preview whenever Factor Config changes while modal is open
  useEffect(() => {
    if (showOptimizerPreviewModal) {
      setOptimizerPreviewItems(computeAutoOptimizerPreview(optimizerFactorConfig));
    }
  }, [
    showOptimizerPreviewModal,
    optimizerFactorConfig.rightSizingWeight,
    optimizerFactorConfig.safetyBufferWeight,
    optimizerFactorConfig.costEfficiencyWeight,
    optimizerFactorConfig.readinessWeight,
    optimizerFactorConfig.minSafetyMarginPct,
    optimizerFactorConfig.maxGbpLimitRatioPct,
    optimizerFactorConfig.simulatedWindKnots,
    optimizerFactorConfig.simulationScope,
    optimizerFactorConfig.allowAutoTimeShift,
    optimizerFactorConfig.preferSharedConsolidation
  ]);

  const handleOpenAutoOptimizer = (openWithConfigExpanded: boolean = true) => {
    const hasPending = jobs.some(j => j.status === 'Pending Review');
    const nextConfig: OptimizerFactorConfig = {
      ...optimizerFactorConfig,
      simulationScope: hasPending ? optimizerFactorConfig.simulationScope : 'all_unlocked'
    };
    setOptimizerFactorConfig(nextConfig);
    setShowFactorConfigPanel(openWithConfigExpanded);
    setOptimizerPreviewItems(computeAutoOptimizerPreview(nextConfig));
    setShowOptimizerPreviewModal(true);
  };

  // Confirm Auto-Optimizer Batch Assignments
  const handleConfirmAutoOptimization = () => {
    const toApply = optimizerPreviewItems.filter(item => item.selected && item.recommendedCrane);

    if (toApply.length === 0) {
      setShowOptimizerPreviewModal(false);
      return;
    }

    const updatedJobsList: PlanningJobItem[] = toApply.map(item => {
      const crane = item.recommendedCrane!;
      const nextStart = item.shiftedSlot ? item.shiftedSlot.start : item.job.startTime;
      const nextEnd = item.shiftedSlot ? item.shiftedSlot.end : item.job.endTime;
      return {
        ...item.job,
        status: 'Optimized',
        startTime: nextStart,
        endTime: nextEnd,
        assignedCraneId: crane.id,
        assignedCraneName: `${crane.name} (${crane.capacityTon}T)`,
        reviewedBy: currentReviewer,
        reviewedAt: new Date().toISOString(),
        notes: `AI Optimized [${optimizerFactorConfig.preset.toUpperCase()}]: Matched with ${crane.name} (${crane.capacityTon}T). Score: ${item.score}%, Safety Margin: +${item.safetyMarginPct || 20}%.`
      };
    });

    toApply.forEach(item => {
      addCraneAuditLog({
        action: 'Run Optimization',
        jobNo: item.job.jobNo,
        user: currentReviewer,
        role: 'Rigging Superintendent',
        previousValue: item.job.status,
        newValue: 'Optimized',
        reason: `Factor-Configured Simulation (${optimizerFactorConfig.preset}, Margin >=${optimizerFactorConfig.minSafetyMarginPct}%): Matched ${item.recommendedCrane?.name} (${item.score}% score)`
      });
      // Synchronize with unified operations store
      updateCraneJob(item.job.id, {
        status: 'Optimized',
        assignedCraneId: item.recommendedCrane?.id,
        assignedCraneName: `${item.recommendedCrane?.name} (${item.recommendedCrane?.capacityTon}T)`,
        ...(item.shiftedSlot ? { time: `${item.shiftedSlot.start} - ${item.shiftedSlot.end}` } : {}),
        reviewedBy: currentReviewer,
        reviewedAt: new Date().toISOString()
      });
    });

    if (onBatchUpdateJobs) {
      onBatchUpdateJobs(updatedJobsList);
    } else {
      updatedJobsList.forEach(j => onUpdateJob(j));
    }

    setShowOptimizerPreviewModal(false);
    showToast(
      isTh
        ? `วิเคราะห์และจัดสรรเครนตามตัวแปรจำลองให้ ${toApply.length} รายการเรียบร้อยแล้ว!`
        : `Successfully optimized ${toApply.length} requests using configured simulation factors!`,
      'success'
    );
  };

  // =========================================================================
  // ACTION HANDLERS (ASSIGN, REASSIGN, UNLOCK, REJECT, REVISION, SAVE PIN)
  // =========================================================================

  // Crane availability: is the crane free during the job's time slot? If not, find the nearest free slot (same date, same duration)
  const timeToMin = (t?: string) => {
    if (!t) return 0;
    const p = t.split(':').map(Number);
    return (p[0] || 0) * 60 + (p[1] || 0);
  };
  const minToTime = (m: number) => `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;

  const getCraneAvailability = (crane: EquipmentResource, job: PlanningJobItem): {
    freeNow: boolean;
    clash: PlanningJobItem[];
    slot: { start: string; end: string } | null;
  } => {
    const bookings = jobs.filter(o =>
      o.id !== job.id && o.date === job.date && o.status !== 'Rejected' &&
      o.assignedCraneId === crane.id && (o.status === 'Assigned' || o.status === 'Optimized')
    );
    const s = timeToMin(job.startTime || '08:00');
    const e = timeToMin(job.endTime || '12:00');
    const clashesWith = (a: number, b: number) =>
      bookings.filter(o => Math.max(a, timeToMin(o.startTime || '08:00')) < Math.min(b, timeToMin(o.endTime || '12:00')));

    const clash = clashesWith(s, e);
    if (clash.length === 0) return { freeNow: true, clash, slot: null };

    const dur = Math.max(30, e - s);
    let best: { start: string; end: string } | null = null;
    let bestDist = Infinity;
    for (let st = 6 * 60; st + dur <= 20 * 60; st += 30) {
      if (clashesWith(st, st + dur).length === 0 && Math.abs(st - s) < bestDist) {
        bestDist = Math.abs(st - s);
        best = { start: minToTime(st), end: minToTime(st + dur) };
      }
    }
    return { freeNow: false, clash, slot: best };
  };

  const THAI_MONTHS_SHORT = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
  const ENG_MONTHS_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const THAI_MONTHS_FULL = [
    'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
    'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'
  ];
  const ENG_MONTHS_FULL = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const formatThaiDateShort = (dateStr: string): string => {
    const parts = (dateStr || '').split('-');
    if (parts.length !== 3) return dateStr;
    const day = parseInt(parts[2], 10);
    const mIdx = parseInt(parts[1], 10) - 1;
    return `${day} ${THAI_MONTHS_SHORT[mIdx] || parts[1]}`;
  };

  const formatEngDateShort = (dateStr: string): string => {
    const parts = (dateStr || '').split('-');
    if (parts.length !== 3) return dateStr;
    const day = parseInt(parts[2], 10);
    const mIdx = parseInt(parts[1], 10) - 1;
    return `${day} ${ENG_MONTHS_SHORT[mIdx] || parts[1]}`;
  };

  const formatThaiDateFull = (dateStr: string): string => {
    const parts = (dateStr || '').split('-');
    if (parts.length !== 3) return dateStr;
    const day = parseInt(parts[2], 10);
    const mIdx = parseInt(parts[1], 10) - 1;
    return `${day} ${THAI_MONTHS_FULL[mIdx] || parts[1]} ${parts[0]}`;
  };

  const formatEngDateFull = (dateStr: string): string => {
    const parts = (dateStr || '').split('-');
    if (parts.length !== 3) return dateStr;
    const day = parseInt(parts[2], 10);
    const mIdx = parseInt(parts[1], 10) - 1;
    return `${day} ${ENG_MONTHS_FULL[mIdx] || parts[1]} ${parts[0]}`;
  };

  const addDaysToDate = (dateStr: string, days: number): string => {
    const parts = (dateStr || '').split('-').map(Number);
    if (parts.length !== 3 || isNaN(parts[0])) return dateStr;
    const dt = new Date(parts[0], parts[1] - 1, parts[2]);
    dt.setDate(dt.getDate() + days);
    const nextY = dt.getFullYear();
    const nextM = String(dt.getMonth() + 1).padStart(2, '0');
    const nextD = String(dt.getDate()).padStart(2, '0');
    return `${nextY}-${nextM}-${nextD}`;
  };

  const getNextAvailableDateForCrane = (
    crane: EquipmentResource,
    job: PlanningJobItem,
    maxDays: number = 14
  ): {
    date: string;
    diffDays: number;
    slot: { start: string; end: string };
  } | null => {
    const s = timeToMin(job.startTime || '08:00');
    const e = timeToMin(job.endTime || '12:00');
    const dur = Math.max(30, e - s);

    for (let d = 1; d <= maxDays; d++) {
      const candidateDate = addDaysToDate(job.date, d);
      const bookings = jobs.filter(
        o =>
          o.id !== job.id &&
          o.date === candidateDate &&
          o.status !== 'Rejected' &&
          o.assignedCraneId === crane.id &&
          (o.status === 'Assigned' || o.status === 'Optimized')
      );

      const clashesWith = (a: number, b: number) =>
        bookings.filter(
          o =>
            Math.max(a, timeToMin(o.startTime || '08:00')) <
            Math.min(b, timeToMin(o.endTime || '12:00'))
        );

      // Check requested slot first
      if (clashesWith(s, e).length === 0) {
        return {
          date: candidateDate,
          diffDays: d,
          slot: {
            start: job.startTime || '08:00',
            end: job.endTime || '12:00'
          }
        };
      }

      // Or check within work hours 08:00 to 17:00
      let bestSlot: { start: string; end: string } | null = null;
      let bestDist = Infinity;
      for (let st = 8 * 60; st + dur <= 17 * 60; st += 30) {
        if (clashesWith(st, st + dur).length === 0 && Math.abs(st - s) < bestDist) {
          bestDist = Math.abs(st - s);
          bestSlot = { start: minToTime(st), end: minToTime(st + dur) };
        }
      }
      if (bestSlot) {
        return {
          date: candidateDate,
          diffDays: d,
          slot: bestSlot
        };
      }
    }
    return null;
  };

  const handlePickFreeCrane = (crane: EquipmentResource) => {
    setManuallySelectedCraneId(crane.id);
    setShowFreeCraneModal(false);
    setActiveTab('review');
    showToast(isTh ? `เลือกเครน ${crane.name} (ว่างในเวลาเดียวกัน) แล้ว` : `Selected ${crane.name} (free at the requested time)`, 'success');
  };

  const handleRescheduleToFreeSlot = (crane: EquipmentResource, slot: { start: string; end: string }) => {
    if (!selectedJob) return;
    const updated: PlanningJobItem = { ...selectedJob, startTime: slot.start, endTime: slot.end };
    onUpdateJob(updated);
    updateCraneJob(selectedJob.id, {
      time: `${slot.start} - ${slot.end}`,
      dateFrom: `${selectedJob.date} ${slot.start}`
    });
    setManuallySelectedCraneId(crane.id);
    setShowFreeCraneModal(false);
    setActiveTab('review');
    showToast(
      isTh ? `เลื่อนเวลาเป็น ${slot.start}-${slot.end} และเลือกเครน ${crane.name} แล้ว` : `Rescheduled to ${slot.start}-${slot.end} and selected ${crane.name}`,
      'success'
    );
  };

  const handleRescheduleToAnotherDate = (
    crane: EquipmentResource,
    nextDate: string,
    slot: { start: string; end: string }
  ) => {
    if (!selectedJob) return;
    const updated: PlanningJobItem = {
      ...selectedJob,
      date: nextDate,
      startTime: slot.start,
      endTime: slot.end,
      time: `${slot.start} - ${slot.end}`,
      dateFrom: `${nextDate} ${slot.start}`,
      assignedCraneId: crane.id,
      assignedCraneName: `${crane.name} (${crane.capacityTon}T)`
    };
    onUpdateJob(updated);
    updateCraneJob(selectedJob.id, {
      date: nextDate,
      dateFrom: `${nextDate} ${slot.start}`,
      time: `${slot.start} - ${slot.end}`,
      assignedCraneId: crane.id,
      assignedCraneName: `${crane.name} (${crane.capacityTon}T)`
    });
    setManuallySelectedCraneId(crane.id);
    setShowFreeCraneModal(false);
    setActiveTab('review');
    const dateLabelTh = formatThaiDateShort(nextDate);
    const dateLabelEn = formatEngDateShort(nextDate);
    addCraneAuditLog({
      action: 'Reschedule & Assign Crane',
      jobNo: selectedJob.jobNo,
      user: currentReviewer,
      role: 'Lead Rigging Engineer',
      previousValue: `${selectedJob.date} (${selectedJob.startTime}-${selectedJob.endTime})`,
      newValue: `${nextDate} (${slot.start}-${slot.end}) -> ${crane.name}`,
      reason: isTh
        ? `เลื่อนวันเป็น ${dateLabelTh} เนื่องจากเครน ${crane.name} คิวเต็มในวันที่ ${selectedJob.date}`
        : `Rescheduled date to ${dateLabelEn} because ${crane.name} was fully booked on ${selectedJob.date}`
    });
    showToast(
      isTh
        ? `เลื่อนวันเป็น ${dateLabelTh} (${slot.start} - ${slot.end}) และเลือกเครน ${crane.name} เรียบร้อยแล้ว`
        : `Rescheduled to ${dateLabelEn} (${slot.start} - ${slot.end}) and selected ${crane.name}`,
      'success'
    );
  };

  // Step status shown on the 4 workspace tabs (pass / fail / pending)
  const stepStates: Record<'validation' | 'site' | 'matching' | 'review', 'pass' | 'fail' | 'pending'> = {
    validation: currentValidation.result === 'PASS' ? 'pass' : currentValidation.result === 'FAIL' ? 'fail' : 'pending',
    site: currentConflictCheck.hasConflict ? 'fail' : 'pass',
    matching: effectiveCrane ? 'pass' : 'pending',
    review: selectedJob?.status === 'Assigned' ? 'pass' : selectedJob?.status === 'Rejected' ? 'fail' : 'pending'
  };
  const renderStepBadge = (s: 'pass' | 'fail' | 'pending') =>
    s === 'pass' ? <CheckCircle size={13} className="text-emerald-500 shrink-0" />
      : s === 'fail' ? <XCircle size={13} className="text-red-500 shrink-0" />
        : <span className="w-2 h-2 rounded-full bg-amber-400 shrink-0" />;

  // 1. Assign & Lock Crane
  const handleConfirmAssignCrane = () => {
    if (!selectedJob || !effectiveCrane) return;

    if (currentValidation.result !== 'PASS' || currentConflictCheck.hasConflict) {
      showToast(isTh ? 'ไม่สามารถจัดสรรได้เนื่องจากไม่ผ่านเกณฑ์ความปลอดภัยหรือมี Conflict' : 'Cannot assign: Safety check or conflict unresolved.', 'warning');
      return;
    }

    const prevStatus = selectedJob.status;
    const updated: PlanningJobItem = {
      ...selectedJob,
      status: 'Assigned',
      assignmentStatus: 'Locked',
      assignedCraneId: effectiveCrane.id,
      assignedCraneName: `${effectiveCrane.name} (${effectiveCrane.capacityTon}T)`,
      reviewedBy: currentReviewer,
      reviewedAt: new Date().toISOString(),
      rejectReason: undefined,
      revisionNote: undefined,
      notes: manualRationaleNote
        ? `Assigned: ${effectiveCrane.name}. Engineering Note: ${manualRationaleNote}`
        : `Assigned: ${effectiveCrane.name} (${effectiveCrane.capacityTon}T). Safety verified.`
    };

    onUpdateJob(updated);

    // Direct synchronization with global operations store & crane master
    updateCraneJob(selectedJob.id, {
      status: 'Assigned',
      assignmentStatus: 'Locked',
      assignedCraneId: effectiveCrane.id,
      assignedCraneName: `${effectiveCrane.name} (${effectiveCrane.capacityTon}T)`,
      reviewedBy: currentReviewer,
      reviewedAt: new Date().toISOString(),
      remarks: manualRationaleNote || 'All engineering constraints, load chart safety margins, and ground pressures verified.'
    });

    updateCraneMaster(effectiveCrane.id, {
      fleetStatus: 'Assigned',
      assignedJobId: String(selectedJob.id),
      assignedJobNo: selectedJob.jobNo,
      assignedTimeSlot: `${selectedJob.date} ${selectedJob.startTime} - ${selectedJob.endTime}`
    });

    addCraneAuditLog({
      action: 'Assign Crane',
      jobNo: selectedJob.jobNo,
      user: currentReviewer,
      role: 'Lead Rigging Engineer',
      previousValue: `${prevStatus} (Unassigned)`,
      newValue: `Assigned -> ${effectiveCrane.name} (${effectiveCrane.id})`,
      reason: manualRationaleNote || 'All engineering constraints, load chart safety margins, and ground pressures verified.'
    });

    setShowAssignConfirmModal(false);
    showToast(
      isTh
        ? `ล็อกคิวจัดสรรเครน ${effectiveCrane.name} ให้กับ ${selectedJob.jobNo} สำเร็จ!`
        : `Crane ${effectiveCrane.name} successfully assigned and locked to ${selectedJob.jobNo}!`,
      'success'
    );
  };

  // 2. Reassign Crane Workflow
  const handleConfirmReassignCrane = () => {
    if (!selectedJob || !reassignTargetCraneId || !reassignReasonInput.trim()) return;

    const newCrane = equipment.find(e => e.id === reassignTargetCraneId);
    if (!newCrane) return;

    // Check safety validation for new crane
    const newValidation = evaluateEngineeringValidation(newCrane, selectedJob);
    if (newValidation.result === 'FAIL') {
      showToast(isTh ? 'เครนคันใหม่ไม่ผ่านเกณฑ์วิศวกรรมความปลอดภัย' : 'New crane failed engineering safety gate.', 'warning');
      return;
    }

    const prevCraneId = selectedJob.assignedCraneId;
    const prevCraneName = selectedJob.assignedCraneName || prevCraneId;

    // Release old crane in master fleet
    if (prevCraneId) {
      updateCraneMaster(prevCraneId, {
        fleetStatus: 'Available',
        assignedJobId: undefined,
        assignedJobNo: undefined,
        assignedTimeSlot: undefined
      });
    }

    // Lock new crane in master fleet
    const finalDate = reassignNewDate || selectedJob.date;
    const finalStart = reassignNewStartTime || selectedJob.startTime;
    const finalEnd = reassignNewEndTime || selectedJob.endTime;

    updateCraneMaster(newCrane.id, {
      fleetStatus: 'Assigned',
      assignedJobId: String(selectedJob.id),
      assignedJobNo: selectedJob.jobNo,
      assignedTimeSlot: `${finalDate} ${finalStart} - ${finalEnd}`
    });

    const updated: PlanningJobItem = {
      ...selectedJob,
      status: 'Assigned',
      assignmentStatus: 'Locked',
      assignedCraneId: newCrane.id,
      assignedCraneName: `${newCrane.name} (${newCrane.capacityTon}T)`,
      date: finalDate,
      startTime: finalStart,
      endTime: finalEnd,
      reviewedBy: currentReviewer,
      reviewedAt: new Date().toISOString(),
      notes: `Reassigned from ${prevCraneName} to ${newCrane.name}. Reason: ${reassignReasonInput.trim()}`
    };

    onUpdateJob(updated);

    updateCraneJob(selectedJob.id, {
      status: 'Assigned',
      assignmentStatus: 'Locked',
      assignedCraneId: newCrane.id,
      assignedCraneName: `${newCrane.name} (${newCrane.capacityTon}T)`,
      date: finalDate,
      dateFrom: `${finalDate} ${finalStart}`,
      time: `${finalStart} - ${finalEnd}`,
      reviewedBy: currentReviewer,
      reviewedAt: new Date().toISOString(),
      remarks: `Reassigned: ${reassignReasonInput.trim()}`
    });

    addCraneAuditLog({
      action: 'Reassign Crane',
      jobNo: selectedJob.jobNo,
      user: currentReviewer,
      role: 'Lead Rigging Engineer',
      previousValue: `Assigned: ${prevCraneName}`,
      newValue: `Reassigned: ${newCrane.name} (${newCrane.id})`,
      reason: reassignReasonInput.trim()
    });

    setShowReassignModal(false);
    setReassignReasonInput('');
    setManuallySelectedCraneId(newCrane.id);
    showToast(
      isTh
        ? `จัดสรรเปลี่ยนเป็นเครน ${newCrane.name} เรียบร้อยแล้ว`
        : `Successfully reassigned to ${newCrane.name}`,
      'success'
    );
  };

  // 3. Unlock Assignment Workflow
  const handleConfirmUnlockAssignment = () => {
    if (!selectedJob || !unlockReasonInput.trim()) return;

    const prevCraneId = selectedJob.assignedCraneId;

    if (prevCraneId) {
      updateCraneMaster(prevCraneId, {
        fleetStatus: 'Available',
        assignedJobId: undefined,
        assignedJobNo: undefined,
        assignedTimeSlot: undefined
      });
    }

    const updated: PlanningJobItem = {
      ...selectedJob,
      status: 'Optimized',
      assignmentStatus: 'Unassigned',
      notes: `Assignment unlocked by ${currentReviewer}. Reason: ${unlockReasonInput.trim()}`
    };

    onUpdateJob(updated);

    updateCraneJob(selectedJob.id, {
      status: 'Optimized',
      assignmentStatus: 'Unassigned',
      remarks: `Unlocked: ${unlockReasonInput.trim()}`
    });

    addCraneAuditLog({
      action: 'Unlock Assignment',
      jobNo: selectedJob.jobNo,
      user: currentReviewer,
      role: 'Lead Rigging Engineer',
      previousValue: 'Locked',
      newValue: 'Unlocked (Optimized)',
      reason: unlockReasonInput.trim()
    });

    setShowUnlockModal(false);
    setUnlockReasonInput('');
    showToast(
      isTh
        ? `ปลดล็อกการจัดสรรของงาน ${selectedJob.jobNo} เรียบร้อยแล้ว สามารถแก้ไขแผนได้`
        : `Assignment unlocked for ${selectedJob.jobNo}`,
      'info'
    );
  };

  // 4. Unassign / Release Crane
  const handleUnassignCrane = () => {
    if (!selectedJob || !selectedJob.assignedCraneId) return;

    const prevCrane = selectedJob.assignedCraneName || selectedJob.assignedCraneId;

    updateCraneMaster(selectedJob.assignedCraneId, {
      fleetStatus: 'Available',
      assignedJobId: undefined,
      assignedJobNo: undefined,
      assignedTimeSlot: undefined
    });

    const updated: PlanningJobItem = {
      ...selectedJob,
      status: 'Pending Review',
      assignmentStatus: 'Unassigned',
      assignedCraneId: undefined,
      assignedCraneName: undefined,
      notes: 'Assignment released for re-evaluation.'
    };

    onUpdateJob(updated);

    updateCraneJob(selectedJob.id, {
      status: 'Pending Review',
      assignmentStatus: 'Unassigned',
      assignedCraneId: undefined,
      assignedCraneName: undefined,
      remarks: 'Crane reservation released by engineer.'
    });

    addCraneAuditLog({
      action: 'Cancel Assignment',
      jobNo: selectedJob.jobNo,
      user: currentReviewer,
      role: 'Lead Rigging Engineer',
      previousValue: `Assigned: ${prevCrane}`,
      newValue: 'Pending Review (Unassigned)',
      reason: 'Crane allocation released by engineer.'
    });

    setManuallySelectedCraneId('');
    showToast(
      isTh ? `ปลดการจองเครนของงาน ${selectedJob.jobNo} เรียบร้อยแล้ว` : `Assignment released for ${selectedJob.jobNo}`,
      'info'
    );
  };

  // 5. Save Engineering Review Checklist
  const handleSaveEngineeringReview = () => {
    if (!selectedJob) return;

    if ((engReviewResult === 'Fail' || engReviewResult === 'Need Revision') && !engRemarks.trim()) {
      showToast(isTh ? 'กรุณาระบุหมายเหตุทางวิศวกรรมเมื่อผลการประเมินเป็น Fail หรือ Need Revision' : 'Remarks required when result is Fail or Need Revision.', 'warning');
      return;
    }

    const checklistData = {
      liftPlanVerification: engLiftPlanVerif,
      loadChartRef: engLoadChartRef.trim(),
      siteGroundVerification: engGroundVerif,
      certVerification: engCertVerif,
      engineeringReviewResult: engReviewResult,
      engineeringRemarks: engRemarks.trim(),
      reviewedBy: currentReviewer,
      reviewedDateTime: new Date().toISOString()
    };

    const nextStatus = engReviewResult === 'Need Revision'
      ? 'Revision Required'
      : engReviewResult === 'Fail'
        ? 'Rejected'
        : selectedJob.status;

    const updated: PlanningJobItem = {
      ...selectedJob,
      status: nextStatus,
      engineeringChecklist: checklistData,
      reviewedBy: currentReviewer,
      reviewedAt: new Date().toISOString()
    };

    onUpdateJob(updated);

    updateCraneJob(selectedJob.id, {
      status: nextStatus,
      reviewedBy: currentReviewer,
      reviewedAt: new Date().toISOString(),
      remarks: engRemarks.trim() || `Engineering review completed: ${engReviewResult}`
    });

    addCraneAuditLog({
      action: 'Engineering Review',
      jobNo: selectedJob.jobNo,
      user: currentReviewer,
      role: 'Lead Rigging Engineer',
      previousValue: selectedJob.status,
      newValue: nextStatus,
      reason: `Checklist signed: ${engReviewResult}. ${engRemarks.trim()}`
    });

    showToast(isTh ? 'บันทึกผลการตรวจสอบวิศวกรรมเรียบร้อยแล้ว' : 'Engineering review checklist saved successfully!', 'success');
  };

  // 6. Conflict Resolution Action Handlers
  const handleApplyConflictResolution = () => {
    if (!selectedJob) return;

    if (conflictResAction === 'Select Another Crane') {
      setActiveTab('matching');
      showToast(isTh ? 'เปิดหน้าจับคู่เครนเพื่อเลือกเครนคันอื่น' : 'Switched to Crane Matching to pick alternative candidate.', 'info');
    } else if (conflictResAction === 'Adjust Crane Location') {
      setIsEditingMarking(true);
      showToast(isTh ? 'เปิดโหมดปรับหมุดบนผังแล้ว คลิกบนผังเพื่อย้ายตำแหน่ง' : 'Pin edit mode activated. Click map to reposition.', 'info');
    } else if (conflictResAction === 'Change Time Slot') {
      // Shift time by +2 hours
      const parts = selectedJob.startTime.split(':');
      const startH = (parseInt(parts[0]) || 8) + 2;
      const endH = startH + 4;
      const newStart = `${String(startH).padStart(2, '0')}:00`;
      const newEnd = `${String(endH).padStart(2, '0')}:00`;

      const updated: PlanningJobItem = {
        ...selectedJob,
        startTime: newStart,
        endTime: newEnd,
        notes: `Time shifted to resolve conflict: ${newStart} - ${newEnd}. Note: ${conflictResRemarks}`
      };
      onUpdateJob(updated);
      updateCraneJob(selectedJob.id, {
        time: `${newStart} - ${newEnd}`,
        remarks: `Time shifted to resolve conflict: ${conflictResRemarks}`
      });
      addCraneAuditLog({
        action: 'Conflict Resolution',
        jobNo: selectedJob.jobNo,
        user: currentReviewer,
        role: 'Site Coordinator',
        previousValue: `${selectedJob.startTime} - ${selectedJob.endTime}`,
        newValue: `${newStart} - ${newEnd}`,
        reason: conflictResRemarks || 'Shifted time slot to avoid overlap.'
      });
      showToast(isTh ? `ปรับเวลาเป็น ${newStart} - ${newEnd} เรียบร้อยแล้ว` : `Time slot shifted to ${newStart} - ${newEnd}`, 'success');
    } else if (conflictResAction === 'Request Revision') {
      setShowRevisionModal(true);
    } else if (conflictResAction === 'Reject Request') {
      setShowRejectModal(true);
    }
  };

  // 7. Reject Plan
  const handleConfirmReject = () => {
    if (!selectedJob || !rejectReasonInput.trim()) return;

    const prevStatus = selectedJob.status;
    const updated: PlanningJobItem = {
      ...selectedJob,
      status: 'Rejected',
      assignmentStatus: 'Released',
      rejectReason: rejectReasonInput.trim(),
      assignedCraneId: undefined,
      assignedCraneName: undefined,
      reviewedBy: currentReviewer,
      reviewedAt: new Date().toISOString()
    };

    onUpdateJob(updated);

    updateCraneJob(selectedJob.id, {
      status: 'Rejected',
      assignmentStatus: 'Released',
      rejectReason: rejectReasonInput.trim(),
      reviewedBy: currentReviewer,
      reviewedAt: new Date().toISOString()
    });

    addCraneAuditLog({
      action: 'Reject Plan',
      jobNo: selectedJob.jobNo,
      user: currentReviewer,
      role: 'Lead Rigging Engineer',
      previousValue: prevStatus,
      newValue: 'Rejected',
      reason: rejectReasonInput.trim()
    });

    setShowRejectModal(false);
    setRejectReasonInput('');
    showToast(
      isTh ? `ปฏิเสธคำขอ ${selectedJob.jobNo} และบันทึกเหตุผลเรียบร้อยแล้ว` : `Lifting plan for ${selectedJob.jobNo} rejected with formal reason.`,
      'warning'
    );
  };

  // 8. Return for Revision
  const handleConfirmReturnForRevision = () => {
    if (!selectedJob || !revisionNoteInput.trim()) return;

    const prevStatus = selectedJob.status;
    const updated: PlanningJobItem = {
      ...selectedJob,
      status: 'Revision Required',
      revisionNote: revisionNoteInput.trim(),
      reviewedBy: currentReviewer,
      reviewedAt: new Date().toISOString()
    };

    onUpdateJob(updated);

    updateCraneJob(selectedJob.id, {
      status: 'Revision Required',
      revisionNote: revisionNoteInput.trim(),
      reviewedBy: currentReviewer,
      reviewedAt: new Date().toISOString()
    });

    addCraneAuditLog({
      action: 'Return for Revision',
      jobNo: selectedJob.jobNo,
      user: currentReviewer,
      role: 'Lead Rigging Engineer',
      previousValue: prevStatus,
      newValue: 'Revision Required',
      reason: revisionNoteInput.trim()
    });

    setShowRevisionModal(false);
    setRevisionNoteInput('');
    showToast(
      isTh
        ? `ส่งแผนยก ${selectedJob.jobNo} กลับไปยังผู้ขอเพื่อแก้ไขเรียบร้อยแล้ว`
        : `Lifting plan ${selectedJob.jobNo} returned to contractor for revision.`,
      'info'
    );
  };

  // 9. Save Updated Site Marking Pin Coordinates
  const handleSaveMarkingCoords = () => {
    if (!selectedJob || !tempMarkingCoords) return;

    const prevCoords = `${selectedJob.markingLocation.x}%, ${selectedJob.markingLocation.y}%`;
    const newCoords = `${tempMarkingCoords.x}%, ${tempMarkingCoords.y}%`;

    const updated: PlanningJobItem = {
      ...selectedJob,
      markingLocation: {
        ...selectedJob.markingLocation,
        x: tempMarkingCoords.x,
        y: tempMarkingCoords.y
      }
    };

    onUpdateJob(updated);

    updateCraneJob(selectedJob.id, {
      x: tempMarkingCoords.x,
      y: tempMarkingCoords.y
    });

    addCraneAuditLog({
      action: 'Adjust Crane Position',
      jobNo: selectedJob.jobNo,
      user: currentReviewer,
      role: 'Site Coordinator',
      previousValue: prevCoords,
      newValue: newCoords,
      reason: 'Site marking pin relocated on interactive blueprint.'
    });

    setIsEditingMarking(false);
    setMarkingSavedNotice(true);
    setTimeout(() => setMarkingSavedNotice(false), 3500);
    showToast(isTh ? 'บันทึกพิกัดใหม่และทำการ Re-validate ข้อมูลวิศวกรรมเรียบร้อย' : 'New coordinates saved and re-validated.', 'success');
  };

  // Jobs scoped by active plant filter (globalPlantFilter / filterPlant)
  const plantScopedJobs = useMemo(() => {
    if (filterPlant === 'All') return jobs;
    return jobs.filter(j => j.plant === filterPlant);
  }, [jobs, filterPlant]);

  // Dynamic KPI Counts (calculated dynamically according to active Plant Filter in real-time)
  const pendingCount = useMemo(() => plantScopedJobs.filter(j => j.status === 'Pending Review').length, [plantScopedJobs]);
  const optimizedCount = useMemo(() => plantScopedJobs.filter(j => j.status === 'Optimized').length, [plantScopedJobs]);
  const assignedCount = useMemo(() => plantScopedJobs.filter(j => j.status === 'Assigned').length, [plantScopedJobs]);
  const rejectedCount = useMemo(() => plantScopedJobs.filter(j => j.status === 'Rejected').length, [plantScopedJobs]);
  const conflictCount = useMemo(() => plantScopedJobs.filter(j => conflictJobMap.has(j.id)).length, [plantScopedJobs, conflictJobMap]);
  const revisionCount = useMemo(() => plantScopedJobs.filter(j => j.status === 'Revision Required').length, [plantScopedJobs]);

  // Filtered jobs pipeline
  const filteredJobs = useMemo(() => {
    return jobs.filter(job => {
      // 1. Status Filter
      if (filterStatus === 'Conflict Detected') {
        if (!conflictJobMap.has(job.id)) return false;
      } else if (filterStatus !== 'All' && job.status !== filterStatus) {
        return false;
      }

      // 2. Conflict Only Toggle
      if (filterConflictOnly && !conflictJobMap.has(job.id)) {
        return false;
      }

      // 3. Plant Filter
      if (filterPlant !== 'All' && job.plant !== filterPlant) {
        return false;
      }

      // 4. Priority Filter
      if (filterPriority !== 'All') {
        if (filterPriority === 'Normal' && (job.priority as string) !== 'Normal' && job.priority !== 'Medium') return false;
        else if (filterPriority !== 'Normal' && (job.priority as string) !== filterPriority) return false;
      }

      // 5. Search Query
      const q = searchQuery.toLowerCase().trim();
      if (q) {
        const unified = unifiedJobsMap.get(job.id);
        const woStr = String(job.woNumber || unified?.woNumber || '').toLowerCase();
        const reqStr = String(job.requestNo || unified?.requestNo || '').toLowerCase();
        const matches =
          job.jobNo.toLowerCase().includes(q) ||
          woStr.includes(q) ||
          reqStr.includes(q) ||
          job.description.toLowerCase().includes(q) ||
          job.plant.toLowerCase().includes(q) ||
          job.area.toLowerCase().includes(q) ||
          job.contractor.toLowerCase().includes(q) ||
          job.requester.toLowerCase().includes(q);
        if (!matches) return false;
      }

      return true;
    });
  }, [jobs, filterStatus, filterPlant, filterPriority, filterConflictOnly, searchQuery, conflictJobMap, unifiedJobsMap]);

  // Pagination for Left Panel
  const totalPipelinePages = Math.max(1, Math.ceil(filteredJobs.length / pageSize));
  const paginatedJobs = useMemo(() => {
    const start = (pipelinePage - 1) * pageSize;
    return filteredJobs.slice(start, start + pageSize);
  }, [filteredJobs, pipelinePage, pageSize]);

  // Tab 4: Assignment Readiness Evaluation
  const readinessChecklist = useMemo(() => {
    const isEngPass = (selectedJob?.engineeringChecklist?.engineeringReviewResult === 'Pass' || engReviewResult === 'Pass') && currentValidation.result === 'PASS';
    const isDocsValid = currentValidation.isCertValid && Boolean(engLoadChartRef || selectedJob?.engineeringChecklist?.loadChartRef);
    const isCraneChosen = Boolean(effectiveCrane);
    const isCraneAvailable = effectiveCrane ? effectiveCrane.status !== 'Maintenance' : false;
    const isConflictClear = !currentConflictCheck.hasConflict;
    const isSiteClear = currentValidation.groundBearingPressureKPa <= currentValidation.soilBearingLimitKPa;
    const isReviewerConfirmed = Boolean(currentReviewer);

    const items = [
      { id: 1, label: isTh ? 'ผลการตรวจสอบทางวิศวกรรม (Engineering Review = PASS)' : 'Engineering Review = Pass', pass: isEngPass },
      { id: 2, label: isTh ? 'เอกสาร Load Chart และใบรับรอง ปจ.2 ครบถ้วนและมีผลใช้ได้' : 'Mandatory safety documents verified', pass: isDocsValid },
      { id: 3, label: isTh ? 'เลือกรถเครนที่มีคุณสมบัติตรงตามสเปกแล้ว' : 'Crane selected', pass: isCraneChosen },
      { id: 4, label: isTh ? 'เครนพร้อมใช้งานในช่วงเวลาที่กำหนด (ไม่มี Double Booking)' : 'Crane available during assigned time slot', pass: isCraneAvailable },
      { id: 5, label: isTh ? 'ไม่มีข้อขัดแย้งเชิงพื้นที่และตารางเวลา (Schedule Conflicts Resolved)' : 'Schedule conflicts resolved', pass: isConflictClear },
      { id: 6, label: isTh ? 'แรงกดดินใต้ขาช้าง (GBP) ไม่เกินค่ารับน้ำหนักของดินหน้างาน' : 'Site ground verification completed', pass: isSiteClear },
      { id: 7, label: isTh ? 'วิศวกรผู้มีอำนาจลงนามยืนยันความปลอดภัยแล้ว' : 'Authorized reviewer / approver confirmed', pass: isReviewerConfirmed }
    ];

    const passCount = items.filter(i => i.pass).length;
    const ready = passCount === items.length;

    return { items, passCount, total: items.length, ready };
  }, [selectedJob, currentValidation, effectiveCrane, currentConflictCheck, engReviewResult, engLoadChartRef, isTh]);

  // Shared crane options for "Optimize With"
  const compatibleSharedJobs = useMemo(() => {
    if (!selectedJob) return [];
    return jobs.filter(j => j.id !== selectedJob.id && j.plant === selectedJob.plant && j.date === selectedJob.date && j.status !== 'Rejected');
  }, [jobs, selectedJob]);

  return (
    <div className="space-y-6 pb-12 text-slate-800 dark:text-slate-100">
      {/* Toast Notification */}
      {toastMessage && (
        <div className={`fixed top-4 right-4 z-50 flex items-center gap-2.5 px-4 py-3 rounded-xl shadow-xl text-xs font-bold border transition-all animate-in fade-in slide-in-from-top-4 ${toastMessage.type === 'success'
            ? 'bg-emerald-50 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-200 border-emerald-300 dark:border-emerald-800'
            : toastMessage.type === 'warning'
              ? 'bg-amber-50 dark:bg-amber-950/80 text-amber-800 dark:text-amber-200 border-amber-300 dark:border-amber-800'
              : 'bg-blue-50 dark:bg-blue-950/80 text-blue-800 dark:text-blue-200 border-blue-300 dark:border-blue-800'
          }`}>
          {toastMessage.type === 'success' && <CheckCircle size={16} className="text-emerald-600 dark:text-emerald-400" />}
          {toastMessage.type === 'warning' && <AlertTriangle size={16} className="text-amber-600 dark:text-amber-400" />}
          {toastMessage.type === 'info' && <Info size={16} className="text-blue-600 dark:text-blue-400" />}
          <span>{toastMessage.text}</span>
        </div>
      )}

      {/* ========================================================================= */}
      {/* CRANE OPTIMIZATION & COST SAVING MODE SWITCHER BAR                        */}
      {/* ========================================================================= */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-2.5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
        <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
          <button
            type="button"
            onClick={() => setViewMode('engineering')}
            className={`px-3.5 py-2 rounded-lg text-xs font-extrabold transition-all cursor-pointer flex items-center gap-2 ${
              viewMode === 'engineering'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Gauge size={15} />
            <span>{isTh ? '1. ตรวจสอบวิศวกรรม & จัดสรรเครน (Engineering Gate)' : '1. Engineering Review & Plan Optimizer'}</span>
          </button>

          <button
            type="button"
            onClick={() => setViewMode('cost-saving')}
            className={`px-3.5 py-2 rounded-lg text-xs font-extrabold transition-all cursor-pointer flex items-center gap-2 ${
              viewMode === 'cost-saving'
                ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <TrendingDown size={15} />
            <span>{isTh ? '2. แดชบอร์ดลดต้นทุน & ความคุ้มค่าเครน (Optimize & Cost Saving)' : '2. Optimize & Cost Saving Dashboard'}</span>
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
              viewMode === 'cost-saving'
                ? 'bg-white/20 text-white'
                : 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300'
            }`}>
              {isTh ? 'ประหยัดงบ AI' : 'Cost Saving'}
            </span>
          </button>
        </div>

        <div className="flex items-center gap-2 px-2 text-xs">
          <span className="text-slate-500 dark:text-slate-400 font-medium hidden md:inline">
            {isTh ? 'สถานะความคุ้มค่า:' : 'Optimization Impact:'}
          </span>
          <button
            type="button"
            onClick={() => setViewMode(viewMode === 'cost-saving' ? 'engineering' : 'cost-saving')}
            className="px-3 py-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 font-extrabold flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <Sparkles size={13} />
            <span>
              {viewMode === 'cost-saving'
                ? (isTh ? 'สลับไปหน้าตรวจวิศวกรรมรายใบงาน' : 'Switch to Engineering Gate')
                : (isTh ? 'ดูวิเคราะห์การประหยัดงบเช่าเครน (THB)' : 'View Cost Saving Analytics (THB)')}
            </span>
          </button>
        </div>
      </div>

      {viewMode === 'cost-saving' ? (
        <CraneOptimizeCostSavingDashboard
          jobs={jobs}
          equipment={equipment}
          globalPlantFilter={globalPlantFilter}
          onUpdateJob={onUpdateJob}
          onBatchUpdateJobs={onBatchUpdateJobs}
          onSwitchToEngineeringGate={() => setViewMode('engineering')}
          onInspectJobInEngineeringGate={(job) => {
            setSelectedJobId(job.id);
            setViewMode('engineering');
          }}
        />
      ) : (
        <>
      {/* ========================================================================= */}
      {/* SECTION A: KPI HEADER (6 DATA-DRIVEN METRIC CARDS & SIMULATION CONTROLS)  */}
      {/* ========================================================================= */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-black text-slate-900 dark:text-white flex items-center gap-2.5">
            <Gauge className="text-emerald-600 dark:text-emerald-400" size={24} />
            <span>{isTh ? 'ตรวจสอบแผนยก & ปรับจัดสรรเครน' : 'Review Plan & Optimize'}</span>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold border border-slate-200 dark:border-slate-700">
              TAM Engineering Gate
            </span>
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            {isTh
              ? 'ประเมินความปลอดภัยทางวิศวกรรม (Load Chart & GBP) ตรวจจับ Conflict จัดสรรและล็อกคิวเครื่องจักร'
              : 'Engineering validation, load chart margins, spatial conflict resolution, and fleet schedule locking.'}
          </p>
        </div>

        {/* Global Action Buttons */}
        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            onClick={() => {
              setAuditLogSearch('');
              setAuditLogFilterAction('ALL');
              setShowAuditLogModal(true);
            }}
            className="group px-3.5 py-2 bg-white dark:bg-slate-900 hover:bg-emerald-50/70 dark:hover:bg-emerald-950/30 text-slate-800 dark:text-slate-100 border border-slate-300 dark:border-slate-700 hover:border-emerald-400 dark:hover:border-emerald-600 rounded-xl text-xs font-bold flex items-center gap-2 shadow-2xs hover:shadow-sm transition-all cursor-pointer"
            title={isTh ? 'ดูบันทึกการกระทำและประวัติการเปลี่ยนแปลงทั้งหมด' : 'View audit history and operational logs'}
          >
            <div className="w-5 h-5 rounded-lg bg-emerald-100 dark:bg-emerald-950/60 flex items-center justify-center text-emerald-600 dark:text-emerald-400 group-hover:scale-110 transition-transform">
              <History size={13} />
            </div>
            <span>{isTh ? 'บันทึกประวัติ (Audit Logs)' : 'Audit Logs'}</span>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-slate-100 dark:bg-slate-800 group-hover:bg-emerald-100 dark:group-hover:bg-emerald-900/60 text-slate-700 dark:text-slate-300 group-hover:text-emerald-800 dark:group-hover:text-emerald-200 border border-slate-200 dark:border-slate-700 transition-colors">
              {getCraneAuditLogs().length}
            </span>
          </button>

          <button
            onClick={() => handleOpenAutoOptimizer(true)}
            className="px-3.5 py-2 bg-white dark:bg-slate-900 hover:bg-indigo-50/80 dark:hover:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 hover:border-indigo-400 rounded-xl text-xs font-extrabold flex items-center gap-2 shadow-2xs transition-all cursor-pointer"
            title={isTh ? 'ตั้งค่าค่าน้ำหนักตัวแปรและเกณฑ์ความปลอดภัยสำหรับการจำลอง Auto-Optimizer' : 'Configure weighting factors and safety gates for Auto-Optimizer Simulation'}
          >
            <Sliders size={14} className="text-indigo-600 dark:text-indigo-400" />
            <span>{isTh ? 'ตั้งค่าตัวแปรจำลอง (Factor Config)' : 'Factor Config'}</span>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-black bg-indigo-100 dark:bg-indigo-900/70 text-indigo-800 dark:text-indigo-200">
              {optimizerFactorConfig.preset === 'balanced'
                ? (isTh ? 'สมดุล' : 'Balanced')
                : optimizerFactorConfig.preset === 'safety_first'
                  ? (isTh ? 'ปลอดภัยสูงสุด' : 'Safety+')
                  : optimizerFactorConfig.preset === 'cost_saving'
                    ? (isTh ? 'ลดต้นทุน' : 'Cost Save')
                    : optimizerFactorConfig.preset === 'urgent_speed'
                      ? (isTh ? 'งานด่วน' : 'Urgent')
                      : (isTh ? 'กำหนดเอง' : 'Custom')}
            </span>
          </button>

          <button
            onClick={() => handleOpenAutoOptimizer(true)}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-sm transition-all active:scale-95 cursor-pointer"
            title={isTh ? 'จำลองการคำนวณจับคู่เครนอัตโนมัติพร้อมปรับแต่งตัวแปร (Auto-Optimizer Simulation)' : 'Run auto-optimizer simulation with configurable factors'}
          >
            <Sparkles size={15} />
            <span>{isTh ? 'จำลองจัดสรรอัตโนมัติ (Simulation)' : 'Auto-Optimize Simulation'}</span>
          </button>
        </div>
      </div>

      {/* 6 KPI Cards Grid Header / Filter indicator */}
      <div className="flex items-center justify-between text-xs pt-1">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
            {isTh ? 'สถิติภาพรวมคิวงาน (Pipeline KPIs)' : 'Pipeline Overview KPIs'}
          </span>
          {filterPlant !== 'All' ? (
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-extrabold bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse" />
              {isTh ? `กรองตามโรงงาน: ${filterPlant}` : `Plant: ${filterPlant}`} ({plantScopedJobs.length} {isTh ? 'งาน' : 'jobs'})
            </span>
          ) : (
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-extrabold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
              {isTh ? `ทุกโรงงาน (All Plants): ${jobs.length} งาน` : `All Plants: ${jobs.length} jobs`}
            </span>
          )}
        </div>
      </div>

      {/* 6 KPI Cards Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {/* 1. Pending Review */}
        <div
          onClick={() => {
            setFilterStatus('Pending Review');
            setPipelinePage(1);
          }}
          className={`p-3.5 rounded-xl border transition-all cursor-pointer shadow-xs ${filterStatus === 'Pending Review'
              ? 'bg-amber-50/80 dark:bg-amber-950/40 border-amber-500 ring-2 ring-amber-500/20'
              : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-amber-400'
            }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              {isTh ? '1. รอตรวจสอบ' : '1. Pending'}
            </span>
            <Clock size={16} className="text-amber-500" />
          </div>
          <p className="text-2xl font-black text-amber-600 dark:text-amber-400 mt-1 font-mono">
            {pendingCount}
          </p>
          <p className="text-[10px] text-slate-400 truncate mt-1">
            {isTh ? 'คำขอใหม่รอตรวจสเปก' : 'New requests awaiting review'}
          </p>
        </div>

        {/* 2. Optimized / Matched */}
        <div
          onClick={() => {
            setFilterStatus('Optimized');
            setPipelinePage(1);
          }}
          className={`p-3.5 rounded-xl border transition-all cursor-pointer shadow-xs ${filterStatus === 'Optimized'
              ? 'bg-indigo-50/80 dark:bg-indigo-950/40 border-indigo-500 ring-2 ring-indigo-500/20'
              : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-indigo-400'
            }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              {isTh ? '2. จับคู่สำเร็จ' : '2. Optimized'}
            </span>
            <Sparkles size={16} className="text-indigo-500" />
          </div>
          <p className="text-2xl font-black text-indigo-500 mt-1 font-mono">
            {optimizedCount}
          </p>
          <p className="text-[10px] text-slate-400 truncate mt-1">
            {isTh ? 'ผ่านการจับคู่เบื้องต้น' : 'AI matched with available fleet'}
          </p>
        </div>

        {/* 3. Assigned & Locked */}
        <div
          onClick={() => {
            setFilterStatus('Assigned');
            setPipelinePage(1);
          }}
          className={`p-3.5 rounded-xl border transition-all cursor-pointer shadow-xs ${filterStatus === 'Assigned'
              ? 'bg-emerald-50/80 dark:bg-emerald-950/40 border-emerald-500 ring-2 ring-emerald-500/20'
              : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-emerald-400'
            }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              {isTh ? '3. จัดสรร & ล็อกคิว' : '3. Assigned'}
            </span>
            <CheckCircle size={16} className="text-emerald-600 dark:text-emerald-400" />
          </div>
          <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1 font-mono">
            {assignedCount}
          </p>
          <p className="text-[10px] text-slate-400 truncate mt-1">
            {isTh ? 'ล็อกคิวเครื่องจักรแล้ว' : 'Officially locked schedule'}
          </p>
        </div>

        {/* 4. Conflict Detected */}
        <div
          onClick={() => {
            setFilterStatus('Conflict Detected');
            setPipelinePage(1);
          }}
          className={`p-3.5 rounded-xl border transition-all cursor-pointer shadow-xs ${filterStatus === 'Conflict Detected'
              ? 'bg-red-50/80 dark:bg-red-950/40 border-red-500 ring-2 ring-red-500/20'
              : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-red-400'
            }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              {isTh ? '4. พบข้อขัดแย้ง' : '4. Conflicts'}
            </span>
            <AlertCircle size={16} className="text-red-500" />
          </div>
          <p className="text-2xl font-black text-red-500 mt-1 font-mono">
            {conflictCount}
          </p>
          <p className="text-[10px] text-slate-400 truncate mt-1">
            {isTh ? 'ทับซ้อนเวลาหรือสิ่งกีดขวาง' : 'Unresolved site/time conflicts'}
          </p>
        </div>

        {/* 5. Need Revision */}
        <div
          onClick={() => {
            setFilterStatus('Revision Required');
            setPipelinePage(1);
          }}
          className={`p-3.5 rounded-xl border transition-all cursor-pointer shadow-xs ${filterStatus === 'Revision Required'
              ? 'bg-orange-50/80 dark:bg-orange-950/40 border-orange-500 ring-2 ring-orange-500/20'
              : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-orange-400'
            }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              {isTh ? '5. ส่งกลับแก้ไข' : '5. Need Revision'}
            </span>
            <RotateCcw size={16} className="text-orange-500" />
          </div>
          <p className="text-2xl font-black text-orange-600 dark:text-orange-400 mt-1 font-mono">
            {revisionCount}
          </p>
          <p className="text-[10px] text-slate-400 truncate mt-1">
            {isTh ? 'ส่งกลับให้ผู้ขอดำเนินการ' : 'Returned to contractor'}
          </p>
        </div>

        {/* 6. Rejected Requests */}
        <div
          onClick={() => {
            setFilterStatus('Rejected');
            setPipelinePage(1);
          }}
          className={`p-3.5 rounded-xl border transition-all cursor-pointer shadow-xs ${filterStatus === 'Rejected'
              ? 'bg-slate-100 dark:bg-slate-800 border-slate-400 ring-2 ring-slate-400/20'
              : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-400'
            }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              {isTh ? '6. ไม่อนุมัติ' : '6. Rejected'}
            </span>
            <XCircle size={16} className="text-slate-500" />
          </div>
          <p className="text-2xl font-black text-slate-600 dark:text-slate-300 mt-1 font-mono">
            {rejectedCount}
          </p>
          <p className="text-[10px] text-slate-400 truncate mt-1">
            {isTh ? 'ไม่ผ่านเกณฑ์วิศวกรรม' : 'Declined engineering gate'}
          </p>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* SECTION B & C: MAIN 2-COLUMN WORKSPACE                                    */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* ========================================================================= */}
        {/* SECTION B: LIFTING REQUESTS PIPELINE (LEFT PANEL - 5 COLS)                */}
        {/* ========================================================================= */}
        <div className="lg:col-span-5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col overflow-hidden">
          {/* Header & Comprehensive Filter Bar */}
          <div className="p-4 border-b border-slate-100 dark:border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
                <span>{isTh ? 'รายการคำขอใช้งานเครน' : 'Lifting Requests Pipeline'}</span>
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold border border-slate-200 dark:border-slate-700">
                  {filteredJobs.length}
                </span>
              </h2>

              {/* Conflict only toggle */}
              <label className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-400 cursor-pointer">
                <input
                  type="checkbox"
                  checked={filterConflictOnly}
                  onChange={e => {
                    setFilterConflictOnly(e.target.checked);
                    setPipelinePage(1);
                  }}
                  className="rounded text-emerald-600 focus:ring-emerald-500"
                />
                <span className="font-semibold text-[11px]">{isTh ? 'เฉพาะที่มี Conflict' : 'Conflicts Only'}</span>
              </label>
            </div>

            {/* Search Input */}
            <div className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={e => {
                  setSearchQuery(e.target.value);
                  setPipelinePage(1);
                }}
                placeholder={isTh ? 'ค้นหา Request No., WO Number, รายละเอียด, ผู้รับเหมา...' : 'Search Request No., WO, Description, Contractor...'}
                className="w-full pl-9 pr-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-colors"
              />
              <Search size={15} className="absolute left-3 top-2.5 text-slate-400" />
            </div>

            {/* Dropdown Filters: Plant & Priority */}
            <div className="grid grid-cols-2 gap-2 text-xs">
              <select
                value={filterPlant}
                onChange={e => {
                  setFilterPlant(e.target.value);
                  setPipelinePage(1);
                }}
                className="px-2.5 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-[11px] font-semibold text-slate-700 dark:text-slate-300 focus:outline-none"
              >
                <option value="All">{isTh ? 'ทุกโรงงาน (All Plants)' : 'All Plants'}</option>
                <option value="Phra Khanong">Phra Khanong</option>
                <option value="Sriracha">Sriracha</option>
              </select>

              <select
                value={filterPriority}
                onChange={e => {
                  setFilterPriority(e.target.value);
                  setPipelinePage(1);
                }}
                className="px-2.5 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-[11px] font-semibold text-slate-700 dark:text-slate-300 focus:outline-none"
              >
                <option value="All">{isTh ? 'ทุกระดับความสำคัญ' : 'All Priorities'}</option>
                <option value="Critical">{isTh ? 'วิกฤต (Critical)' : 'Critical'}</option>
                <option value="High">{isTh ? 'เร่งด่วน (High)' : 'High'}</option>
                <option value="Normal">{isTh ? 'ปกติ (Normal)' : 'Normal'}</option>
                <option value="Low">{isTh ? 'ต่ำ (Low)' : 'Low'}</option>
              </select>
            </div>

            {/* Status Filter Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs custom-scrollbar">
              {['All', 'Pending Review', 'Optimized', 'Assigned', 'Revision Required', 'Rejected', 'Conflict Detected'].map(status => {
                const label = isTh ? (
                  status === 'All' ? 'ทั้งหมด' :
                  status === 'Pending Review' ? 'รอตรวจ' :
                  status === 'Optimized' ? 'จับคู่แล้ว' :
                  status === 'Assigned' ? 'จัดสรรแล้ว' :
                  status === 'Revision Required' ? 'รอแก้ไข' :
                  status === 'Rejected' ? 'ไม่อนุมัติ' :
                  status === 'Conflict Detected' ? 'มี Conflict' : status
                ) : status;

                return (
                  <button
                    key={status}
                    onClick={() => {
                      setFilterStatus(status);
                      setPipelinePage(1);
                    }}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-bold shrink-0 transition-colors cursor-pointer ${filterStatus === status
                        ? 'bg-slate-800 text-white dark:bg-slate-200 dark:text-slate-900 shadow-xs'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                      }`}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Job Items List */}
          <div className="divide-y divide-slate-100 dark:divide-slate-800 max-h-[660px] overflow-y-auto custom-scrollbar">
            {paginatedJobs.length === 0 ? (
              <div className="p-12 text-center text-slate-400 text-xs space-y-2">
                <Info size={24} className="mx-auto text-slate-300 dark:text-slate-600" />
                <p>{isTh ? 'ไม่พบคำขอที่ตรงกับเงื่อนไขการค้นหา' : 'No lifting requests match the current filters.'}</p>
                <button
                  onClick={() => {
                    setFilterStatus('All');
                    setFilterPlant('All');
                    setFilterPriority('All');
                    setFilterConflictOnly(false);
                    setSearchQuery('');
                  }}
                  className="text-xs text-emerald-600 dark:text-emerald-400 font-bold hover:underline cursor-pointer"
                >
                  {isTh ? 'ล้างตัวกรองทั้งหมด' : 'Clear all filters'}
                </button>
              </div>
            ) : (
              paginatedJobs.map(job => {
                const isSelected = job.id === selectedJob?.id;
                const unified = unifiedJobsMap.get(job.id);
                const woNumber = job.woNumber || unified?.woNumber || ('WO-94' + (job.jobNo.replace(/\D/g, '').slice(-3) || '021'));
                const hasConflict = conflictJobMap.has(job.id);

                return (
                  <div
                    key={job.id}
                    onClick={() => {
                      setSelectedJobId(job.id);
                      setIsEditingMarking(false);
                      setTempMarkingCoords(null);
                    }}
                    className={`p-3.5 transition-all cursor-pointer border-l-4 ${isSelected
                        ? 'bg-slate-50 dark:bg-slate-800/60 border-slate-900 dark:border-white'
                        : 'border-transparent hover:bg-slate-50/60 dark:hover:bg-slate-800/30'
                      }`}
                  >
                    <div className="space-y-1.5">
                      {/* Top Bar: Job No, WO Number, Priority & Conflict Badge */}
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-mono text-xs font-black text-slate-900 dark:text-white">
                            {job.jobNo}
                          </span>
                          <span className="font-mono text-[10px] font-semibold text-slate-400">
                            ({woNumber})
                          </span>
                          <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${job.priority === 'Critical' ? 'bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-400' :
                              job.priority === 'High' ? 'bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400' :
                                'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                            }`}>
                            {isTh ? (
                              job.priority === 'Critical' ? 'วิกฤต' :
                              job.priority === 'High' ? 'เร่งด่วน' :
                              job.priority === 'Normal' ? 'ปกติ' :
                              job.priority === 'Low' ? 'ต่ำ' : job.priority
                            ) : job.priority}
                          </span>
                        </div>

                        {/* Conflict Indicator Badge */}
                        {hasConflict && (
                          <span className="flex items-center gap-1 text-[9px] font-bold px-1.5 py-0.5 rounded bg-red-100 text-red-700 dark:bg-red-950/60 dark:text-red-400 animate-pulse">
                            <AlertCircle size={10} />
                            <span>Conflict</span>
                          </span>
                        )}
                      </div>

                      {/* Job Description */}
                      <h4 className="text-xs font-semibold text-slate-800 dark:text-slate-200 line-clamp-1">
                        {job.description}
                      </h4>

                      {/* Requester & Contractor & Location */}
                      <div className="flex items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400 truncate">
                        <span>{job.requester || 'Engineering'} • {job.contractor || 'Maintenance'}</span>
                        <span>|</span>
                        <span>{job.plant} • {job.area}</span>
                      </div>

                      {/* Schedule & Engineering Specs */}
                      <div className="flex items-center justify-between text-[10px] text-slate-500 dark:text-slate-400 pt-0.5">
                        <div className="flex items-center gap-1.5">
                          <Calendar size={11} className="text-slate-400" />
                          <span>{job.date} ({job.startTime} - {job.endTime})</span>
                        </div>
                        <div className="font-mono font-semibold text-slate-700 dark:text-slate-300">
                          {job.loadWeightTon}T / {job.requiredRadiusM}m
                        </div>
                      </div>

                      {/* Bottom Status & Assigned Crane */}
                      <div className="flex items-center justify-between pt-1 border-t border-slate-100 dark:border-slate-800/60">
                        <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${job.status === 'Assigned' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400' :
                            job.status === 'Optimized' ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-400' :
                              job.status === 'Revision Required' ? 'bg-orange-100 text-orange-700 dark:bg-orange-950/40 dark:text-orange-400' :
                                job.status === 'Rejected' ? 'bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-400' :
                                  'bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400'
                          }`}>
                          {isTh ? (
                            job.status === 'Assigned' ? 'จัดสรรแล้ว' :
                            job.status === 'Optimized' ? 'จับคู่สำเร็จ' :
                            job.status === 'Revision Required' ? 'ต้องแก้ไข' :
                            job.status === 'Rejected' ? 'ไม่อนุมัติ' :
                            job.status === 'Pending Review' ? 'รอตรวจสอบ' : job.status
                          ) : job.status}
                        </span>

                        {job.assignedCraneId && (
                          <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                            <Truck size={11} />
                            <span>{job.assignedCraneId}</span>
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Pipeline Pagination Bar */}
          {totalPipelinePages > 1 && (
            <div className="p-3 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/20 flex items-center justify-between text-xs text-slate-500">
              <span className="text-[11px]">
                {isTh
                  ? `แสดง ${(pipelinePage - 1) * pageSize + 1} - ${Math.min(pipelinePage * pageSize, filteredJobs.length)} จาก ${filteredJobs.length}`
                  : `${(pipelinePage - 1) * pageSize + 1}-${Math.min(pipelinePage * pageSize, filteredJobs.length)} of ${filteredJobs.length}`}
              </span>

              <div className="flex items-center gap-1">
                <button
                  onClick={() => setPipelinePage(prev => Math.max(1, prev - 1))}
                  disabled={pipelinePage === 1}
                  className="p-1 rounded hover:bg-slate-200 dark:hover:bg-slate-700 disabled:opacity-40 disabled:pointer-events-none cursor-pointer"
                  title="Previous"
                >
                  <ChevronLeft size={16} />
                </button>
                <span className="px-2 font-bold text-slate-800 dark:text-slate-200 text-[11px]">
                  {pipelinePage} / {totalPipelinePages}
                </span>
                <button
                  onClick={() => setPipelinePage(prev => Math.min(totalPipelinePages, prev + 1))}
                  disabled={pipelinePage === totalPipelinePages}
                  className="p-1 rounded hover:bg-slate-200 dark:hover:bg-slate-700 disabled:opacity-40 disabled:pointer-events-none cursor-pointer"
                  title="Next"
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* ========================================================================= */}
        {/* SECTION C: ENGINEERING REVIEW WORKSPACE (RIGHT PANEL - 7 COLS)            */}
        {/* ========================================================================= */}
        {selectedJob ? (
          <div className="lg:col-span-7 space-y-4">
            {/* Top Workspace Header & Tabs Bar */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-base font-black text-slate-900 dark:text-white">
                      {selectedJob.jobNo}
                    </span>
                    <span className="font-mono text-xs font-semibold text-slate-400">
                      ({selectedJob.woNumber || unifiedJobsMap.get(selectedJob.id)?.woNumber || 'WO-94021'})
                    </span>
                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${selectedJob.status === 'Assigned' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400' :
                        selectedJob.status === 'Optimized' ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-400' :
                          selectedJob.status === 'Revision Required' ? 'bg-orange-100 text-orange-700 dark:bg-orange-950/40 dark:text-orange-400' :
                            selectedJob.status === 'Rejected' ? 'bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-400' :
                              'bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400'
                      }`}>
                      {isTh ? (
                        selectedJob.status === 'Assigned' ? 'จัดสรรแล้ว' :
                        selectedJob.status === 'Optimized' ? 'จับคู่สำเร็จ' :
                        selectedJob.status === 'Revision Required' ? 'ต้องแก้ไข' :
                        selectedJob.status === 'Rejected' ? 'ไม่อนุมัติ' :
                        selectedJob.status === 'Pending Review' ? 'รอตรวจสอบ' : selectedJob.status
                      ) : selectedJob.status}
                    </span>
                    <span className="text-xs text-slate-500 font-medium">({selectedJob.type})</span>
                  </div>
                  <h3 className="text-xs font-semibold text-slate-700 dark:text-slate-300 mt-1 line-clamp-1">
                    {selectedJob.description}
                  </h3>
                </div>

                {/* Safety Status Pill on Header */}
                <div className="flex items-center gap-2">
                  <div className={`px-3 py-1.5 rounded-xl border text-xs font-black flex items-center gap-1.5 ${currentValidation.result === 'PASS'
                      ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border-emerald-300 dark:border-emerald-800'
                      : currentValidation.result === 'FAIL'
                        ? 'bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-400 border-red-300 dark:border-red-800'
                        : 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border-amber-300 dark:border-amber-800'
                    }`}>
                    {currentValidation.result === 'PASS' && <CheckCircle size={15} />}
                    {currentValidation.result === 'FAIL' && <XCircle size={15} />}
                    {currentValidation.result === 'PENDING' && <AlertTriangle size={15} />}
                    <span>
                      {isTh
                        ? `ความปลอดภัย: ${currentValidation.result === 'PASS' ? 'ผ่านเกณฑ์' : currentValidation.result === 'FAIL' ? 'ไม่ผ่าน' : 'รอตรวจ'}`
                        : `SAFETY: ${currentValidation.result}`}
                    </span>
                  </div>
                </div>
              </div>

              {/* Cross-function Quick Links Bar */}
              <div className="flex items-center gap-1.5 flex-wrap pt-2.5 pb-1 border-b border-slate-100 dark:border-slate-800/80">
                <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mr-1">
                  {isTh ? 'เปิดดูในฟังก์ชันอื่น:' : 'Quick Links:'}
                </span>
                <button
                  type="button"
                  onClick={() => navigateToCraneView({ view: 'plan', jobId: selectedJob.id, plant: selectedJob.plant as any })}
                  className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 flex items-center gap-1 transition-all cursor-pointer shadow-2xs"
                  title="เปิดดูตำแหน่งบนผังยก Plot Plan"
                >
                  <MapPin size={12} className="text-slate-500 dark:text-slate-400" />
                  <span>{isTh ? 'ผังยก Plot Plan' : 'Plot Plan'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => navigateToCraneView({ view: 'calendar', jobId: selectedJob.id, date: selectedJob.date })}
                  className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 flex items-center gap-1 transition-all cursor-pointer shadow-2xs"
                  title="เปิดดูในปฏิทิน Calendar"
                >
                  <Calendar size={12} className="text-slate-500 dark:text-slate-400" />
                  <span>{isTh ? 'ปฏิทิน Calendar' : 'Calendar'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => navigateToCraneView({ view: 'list', jobId: selectedJob.id })}
                  className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 flex items-center gap-1 transition-all cursor-pointer shadow-2xs"
                  title="เปิดดูรายละเอียดคำขอใน Request List"
                >
                  <FileText size={12} className="text-slate-500 dark:text-slate-400" />
                  <span>{isTh ? 'รายการคำขอ Request' : 'Request'}</span>
                </button>
                {effectiveCrane && (
                  <button
                    type="button"
                    onClick={() => navigateToCraneView({ view: 'crane-master', craneId: effectiveCrane.id })}
                    className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 flex items-center gap-1 transition-all cursor-pointer shadow-2xs"
                    title={`ดูสเปกและใบรับรอง ปจ.2 ของ ${effectiveCrane.name} ใน Crane Master`}
                  >
                    <Truck size={12} className="text-slate-500 dark:text-slate-400" />
                    <span>{effectiveCrane.name}</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => {
                    setAuditLogSearch(selectedJob.jobNo);
                    setAuditLogFilterAction('ALL');
                    setShowAuditLogModal(true);
                  }}
                  className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:hover:bg-emerald-900/50 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs"
                  title={isTh ? `ดูประวัติ Audit Logs ของใบงาน ${selectedJob.jobNo}` : `View audit logs for ${selectedJob.jobNo}`}
                >
                  <History size={12} className="text-emerald-600 dark:text-emerald-400" />
                  <span>{isTh ? 'ประวัติงานนี้ (Audit)' : 'Job Audit'}</span>
                  {getCraneAuditLogs().filter(l => l.jobNo === selectedJob.jobNo).length > 0 && (
                    <span className="text-[10px] font-mono px-1 rounded bg-emerald-200/70 dark:bg-emerald-800/70 text-emerald-900 dark:text-emerald-100 font-bold">
                      {getCraneAuditLogs().filter(l => l.jobNo === selectedJob.jobNo).length}
                    </span>
                  )}
                </button>
              </div>

              {/* 4 Navigation Tabs */}
              <div className="flex items-center gap-2 pt-3 overflow-x-auto text-xs">
                <button
                  onClick={() => setActiveTab('validation')}
                  className={`px-3.5 py-2 rounded-xl font-bold flex items-center gap-2 transition-all cursor-pointer shrink-0 ${activeTab === 'validation'
                      ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-md'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                    }`}
                >
                  <Gauge size={14} />
                  <span>{isTh ? '1. ตรวจสอบทางวิศวกรรม' : '1. Engineering Validation'}</span>
                  {renderStepBadge(stepStates.validation)}
                </button>

                <button
                  onClick={() => setActiveTab('site')}
                  className={`px-3.5 py-2 rounded-xl font-bold flex items-center gap-2 transition-all cursor-pointer shrink-0 ${activeTab === 'site'
                      ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-md'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                    }`}
                >
                  <MapPin size={14} />
                  <span>{isTh ? '2. ผังจำลอง & ตรวจ Conflict' : '2. Site & Conflict Check'}</span>
                  {renderStepBadge(stepStates.site)}
                </button>

                <button
                  onClick={() => setActiveTab('matching')}
                  className={`px-3.5 py-2 rounded-xl font-bold flex items-center gap-2 transition-all cursor-pointer shrink-0 ${activeTab === 'matching'
                      ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-md'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                    }`}
                >
                  <HardHat size={14} />
                  <span>{isTh ? '3. จับคู่เครน (Optimization)' : '3. Crane Matching'}</span>
                  {renderStepBadge(stepStates.matching)}
                </button>

                <button
                  onClick={() => setActiveTab('review')}
                  className={`px-3.5 py-2 rounded-xl font-bold flex items-center gap-2 transition-all cursor-pointer shrink-0 ${activeTab === 'review'
                      ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-md'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                    }`}
                >
                  <FileText size={14} />
                  <span>{isTh ? '4. สรุปจัดสรร (Assignment)' : '4. Assignment Review'}</span>
                  {renderStepBadge(stepStates.review)}
                </button>
              </div>
            </div>

            {/* Decision bar: always visible so the reviewer can decide from any step */}
            {selectedJob.status !== 'Assigned' && selectedJob.status !== 'Rejected' && (
              <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm px-4 py-3 flex flex-wrap items-center justify-between gap-3">
                <div className="text-xs text-slate-500 dark:text-slate-400">
                  <span className="font-bold text-slate-700 dark:text-slate-200">{isTh ? 'ผลการตัดสิน:' : 'Decision:'}</span>{' '}
                  {readinessChecklist.ready
                    ? (isTh ? `พร้อมจัดสรรเครน ${effectiveCrane?.name || ''}` : `Ready to assign ${effectiveCrane?.name || ''}`)
                    : (isTh ? 'ยังไม่พร้อม — ดูสถานะแต่ละขั้นที่แท็บด้านบน' : 'Not ready — check each step status above')}
                </div>
                <div className="flex items-center gap-2">
                  {currentConflictCheck.conflictType === 'Crane Double Booking' && (
                    <button
                      type="button"
                      onClick={() => {
                        setFreeCraneTargetId(effectiveCrane?.id || '');
                        setShowFreeCraneModal(true);
                      }}
                      className="px-3.5 py-2 bg-amber-50 hover:bg-amber-100 text-amber-800 dark:bg-amber-950/30 dark:text-amber-300 border border-amber-300 dark:border-amber-800 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer animate-pulse"
                    >
                      <Truck size={14} />
                      <span>{isTh ? 'หาเครนที่ว่าง' : 'Find Free Crane'}</span>
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setShowRevisionModal(true)}
                    className="px-3.5 py-2 bg-orange-50 hover:bg-orange-100 text-orange-700 dark:bg-orange-950/30 dark:text-orange-300 border border-orange-200 dark:border-orange-800 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                  >
                    <RotateCcw size={14} />
                    <span>{isTh ? 'ส่งกลับแก้ไข' : 'Return'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowRejectModal(true)}
                    className="px-3.5 py-2 bg-red-50 hover:bg-red-100 text-red-600 dark:bg-red-950/30 dark:text-red-400 border border-red-200 dark:border-red-900 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                  >
                    <XCircle size={14} />
                    <span>{isTh ? 'ไม่อนุมัติ' : 'Reject'}</span>
                  </button>
                  <button
                    type="button"
                    disabled={!readinessChecklist.ready}
                    onClick={() => setShowAssignConfirmModal(true)}
                    className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all ${readinessChecklist.ready
                      ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm cursor-pointer'
                      : 'bg-slate-200 dark:bg-slate-800 text-slate-400 cursor-not-allowed'}`}
                  >
                    <CheckCircle size={14} />
                    <span>{isTh ? 'อนุมัติและล็อกคิว' : 'Approve & Lock'}</span>
                  </button>
                </div>
              </div>
            )}

            {/* TAB 1: ENGINEERING VALIDATION */}
            {activeTab === 'validation' && (
              <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm space-y-6">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
                    <ShieldCheck size={18} className="text-emerald-500" />
                    <span>{isTh ? 'การตรวจสอบสเปกทางวิศวกรรม (Engineering Validation)' : 'Engineering Lift Validation'}</span>
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    {isTh
                      ? 'วิเคราะห์น้ำหนักยกเทียบกับ Load Chart, Safety Margin (>=20%), แรงกดดินใต้ขา Outrigger และขีดจำกัดลมหน้างาน'
                      : 'Calculates dynamic load chart capacity, safety margin (>=20%), outrigger ground bearing pressure (GBP), and wind limits.'}
                  </p>
                </div>

                {/* Safety Validation Result Banner */}
                <div className={`p-4 rounded-xl border flex items-start gap-3.5 ${currentValidation.result === 'PASS'
                    ? 'bg-emerald-50/80 dark:bg-emerald-950/30 border-emerald-300 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200'
                    : currentValidation.result === 'FAIL'
                      ? 'bg-red-50/80 dark:bg-red-950/30 border-red-300 dark:border-red-800 text-red-900 dark:text-red-200'
                      : 'bg-amber-50/80 dark:bg-amber-950/30 border-amber-300 dark:border-amber-800 text-amber-900 dark:text-amber-200'
                  }`}>
                  <div className="shrink-0 mt-0.5">
                    {currentValidation.result === 'PASS' && <CheckCircle size={22} className="text-emerald-600 dark:text-emerald-400" />}
                    {currentValidation.result === 'FAIL' && <XCircle size={22} className="text-red-600 dark:text-red-400" />}
                    {currentValidation.result === 'PENDING' && <AlertTriangle size={22} className="text-amber-600 dark:text-amber-400" />}
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-black uppercase tracking-wider">
                        {isTh ? 'ผลการตรวจสอบความปลอดภัยทางวิศวกรรม:' : 'Engineering Safety Gate Status:'}
                      </span>
                      <span className="font-mono font-bold text-sm px-2 py-0.5 rounded bg-white/70 dark:bg-black/30">
                        {isTh ? (
                          currentValidation.result === 'PASS' ? 'ผ่านเกณฑ์ความปลอดภัย' :
                          currentValidation.result === 'FAIL' ? 'ไม่ผ่านเกณฑ์วิศวกรรม' : 'รอตรวจสอบสเปก'
                        ) : currentValidation.result}
                      </span>
                    </div>
                    <ul className="text-xs space-y-1 pt-1 list-disc list-inside">
                      {currentValidation.reasons.map((r, i) => (
                        <li key={i}>{r}</li>
                      ))}
                    </ul>
                  </div>
                </div>

                {/* Engineering Metric Parameters Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                  <div className="bg-slate-50 dark:bg-slate-800/60 p-3.5 rounded-xl border border-slate-100 dark:border-slate-800">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center justify-between">
                      <span>{isTh ? 'น้ำหนักยกสุทธิ' : 'Gross Load'}</span>
                      <Info size={12} className="text-slate-400" title="Total weight including rigging gear & hook block" />
                    </span>
                    <p className="text-base font-black text-slate-800 dark:text-slate-100 mt-1 font-mono">
                      {selectedJob.loadWeightTon} <span className="text-xs font-normal">{isTh ? 'ตัน' : 'Ton'}</span>
                    </p>
                  </div>

                  <div className="bg-slate-50 dark:bg-slate-800/60 p-3.5 rounded-xl border border-slate-100 dark:border-slate-800">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center justify-between">
                      <span>{isTh ? 'รัศมีการทำงาน' : 'Working Radius'}</span>
                      <Info size={12} className="text-slate-400" title="Distance from crane center pin to load center of gravity" />
                    </span>
                    <p className="text-base font-black text-slate-800 dark:text-slate-100 mt-1 font-mono">
                      {selectedJob.requiredRadiusM} <span className="text-xs font-normal">{isTh ? 'เมตร' : 'meters'}</span>
                    </p>
                  </div>

                  <div className="bg-slate-50 dark:bg-slate-800/60 p-3.5 rounded-xl border border-slate-100 dark:border-slate-800">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center justify-between">
                      <span>{isTh ? 'ความจุ Load Chart' : 'Load Chart Cap'}</span>
                      <Info size={12} className="text-slate-400" title="Calculated load capacity at specified working radius" />
                    </span>
                    <p className="text-base font-black text-slate-800 dark:text-slate-100 mt-1 font-mono text-emerald-600 dark:text-emerald-400">
                      {currentValidation.loadChartCapacityTon} <span className="text-xs font-normal">{isTh ? 'ตัน' : 'Ton'}</span>
                    </p>
                  </div>

                  <div className="bg-slate-50 dark:bg-slate-800/60 p-3.5 rounded-xl border border-slate-100 dark:border-slate-800">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center justify-between">
                      <span>{isTh ? 'Safety Margin' : 'Safety Margin'}</span>
                      <Info size={12} className="text-slate-400" title="Must be >= 20% to pass Bangchak Turnaround safety standard" />
                    </span>
                    <p className={`text-base font-black mt-1 font-mono ${currentValidation.safetyMarginPercent >= 20
                        ? 'text-emerald-600 dark:text-emerald-400'
                        : 'text-red-500'
                      }`}>
                      {currentValidation.safetyMarginPercent}%
                    </p>
                  </div>

                  <div className="bg-slate-50 dark:bg-slate-800/60 p-3.5 rounded-xl border border-slate-100 dark:border-slate-800">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center justify-between">
                      <span>{isTh ? 'แรงกดดิน (GBP)' : 'Outrigger GBP'}</span>
                      <Info size={12} className="text-slate-400" title="Ground Bearing Pressure underneath crane outriggers" />
                    </span>
                    <p className="text-base font-black text-slate-800 dark:text-slate-100 mt-1 font-mono">
                      {currentValidation.groundBearingPressureKPa} <span className="text-xs font-normal">kPa</span>
                    </p>
                    <span className="text-[10px] text-slate-400">
                      {isTh ? `ขีดจำกัดดิน: ${currentValidation.soilBearingLimitKPa} kPa` : `Max limit: ${currentValidation.soilBearingLimitKPa} kPa`}
                    </span>
                  </div>

                  <div className="bg-slate-50 dark:bg-slate-800/60 p-3.5 rounded-xl border border-slate-100 dark:border-slate-800">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center justify-between">
                      <span>{isTh ? 'ความเร็วลม (Wind)' : 'Wind Limit'}</span>
                      <Info size={12} className="text-slate-400" title="Safe wind speed window for crane boom elevation" />
                    </span>
                    <p className="text-base font-black text-slate-800 dark:text-slate-100 mt-1 font-mono">
                      {currentValidation.siteForecastWindKnots} / {currentValidation.windLimitKnots} <span className="text-xs font-normal">{isTh ? 'นอต' : 'kts'}</span>
                    </p>
                    <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold">
                      {isTh ? 'ความเร็วลมอยู่ในเกณฑ์ปลอดภัย' : 'Forecast is safe'}
                    </span>
                  </div>

                  <div className="bg-slate-50 dark:bg-slate-800/60 p-3.5 rounded-xl border border-slate-100 dark:border-slate-800">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                      {isTh ? 'ความสูงตะขอ (Hook)' : 'Hook Elevation'}
                    </span>
                    <p className="text-base font-black text-slate-800 dark:text-slate-100 mt-1 font-mono">
                      {selectedJob.elevationM} <span className="text-xs font-normal">{isTh ? 'เมตร' : 'meters'}</span>
                    </p>
                  </div>

                  <div className="bg-slate-50 dark:bg-slate-800/60 p-3.5 rounded-xl border border-slate-100 dark:border-slate-800">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                      {isTh ? 'ใบรับรอง ปจ.2' : 'Phor Jor 2 Cert'}
                    </span>
                    <div className="mt-1 flex items-center gap-1.5">
                      <span className={`text-xs font-bold px-2 py-0.5 rounded ${currentValidation.isCertValid
                          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300'
                          : 'bg-red-100 text-red-800 dark:bg-red-950/50 dark:text-red-300'
                        }`}>
                        {currentValidation.isCertValid ? (isTh ? 'ผ่านการรับรอง' : 'Certified Valid') : (isTh ? 'หมดอายุ / ไม่มีเอกสาร' : 'Expired / Missing')}
                      </span>
                    </div>
                    <span className="text-[10px] text-slate-400">{isTh ? `หมดอายุ: ${currentValidation.certExpiry}` : `Exp: ${currentValidation.certExpiry}`}</span>
                  </div>
                </div>

                {/* NEW: ENGINEERING REVIEW CHECKLIST SECTION */}
                <div className="border border-slate-200 dark:border-slate-800 rounded-2xl p-5 bg-slate-50/50 dark:bg-slate-850/40 space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
                        <ClipboardCheck size={16} className="text-emerald-600" />
                        <span>{isTh ? 'รายการตรวจสอบทางวิศวกรรม (Engineering Review Checklist)' : 'Engineering Review Checklist'}</span>
                      </h4>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        {isTh ? 'บันทึกการตรวจสอบโดยวิศวกรผู้มีอำนาจเพื่อปลดล็อก Gate สำหรับจัดสรรเครน' : 'Mandatory signoff items recorded by authorized engineering reviewer.'}
                      </p>
                    </div>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-slate-200 dark:bg-slate-700 font-mono">
                      {currentReviewer.split('(')[0].trim()}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                    {/* Item 1: Lift Plan Verification */}
                    <div className="p-3 bg-white dark:bg-slate-800/80 rounded-xl border border-slate-200 dark:border-slate-700 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-800 dark:text-slate-200">
                          {isTh ? '1. การตรวจสอบแผนการยก (Lift Plan Verification) *' : '1. Lift Plan Verification *'}
                        </span>
                        <div className="flex items-center gap-1">
                          {(['Pass', 'Pending', 'Fail'] as const).map(opt => (
                            <button
                              key={opt}
                              type="button"
                              onClick={() => setEngLiftPlanVerif(opt)}
                              className={`px-2 py-0.5 rounded text-[10px] font-bold cursor-pointer transition-colors ${engLiftPlanVerif === opt
                                  ? opt === 'Pass' ? 'bg-emerald-600 text-white' : opt === 'Fail' ? 'bg-red-600 text-white' : 'bg-amber-500 text-white'
                                  : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                                }`}
                            >
                              {opt}
                            </button>
                          ))}
                        </div>
                      </div>
                      <p className="text-[11px] text-slate-400">
                        {isTh ? 'ตรวจสอบลายเซ็นวิศวกรควบคุม (PE) และการคำนวณจุดศูนย์ถ่วง (CG)' : 'Verify PE signature, rigging geometry, and center of gravity calculations.'}
                      </p>
                    </div>

                    {/* Item 2: Load Chart Reference */}
                    <div className="p-3 bg-white dark:bg-slate-800/80 rounded-xl border border-slate-200 dark:border-slate-700 space-y-1.5">
                      <span className="font-bold text-slate-800 dark:text-slate-200 block">
                        {isTh ? '2. เอกสารอ้างอิง Load Chart (Load Chart Reference) *' : '2. Load Chart Reference *'}
                      </span>
                      <input
                        type="text"
                        value={engLoadChartRef}
                        onChange={e => setEngLoadChartRef(e.target.value)}
                        placeholder="e.g. BCP-CR-LC-Liebherr-1300-Rev3.pdf"
                        className="w-full px-2.5 py-1.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-mono"
                      />
                    </div>

                    {/* Item 3: Site Ground Verification */}
                    <div className="p-3 bg-white dark:bg-slate-800/80 rounded-xl border border-slate-200 dark:border-slate-700 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-800 dark:text-slate-200">
                          {isTh ? '3. การตรวจรับรองสภาพดินหน้างาน (Site Ground Verification) *' : '3. Site Ground Verification *'}
                        </span>
                        <div className="flex items-center gap-1">
                          {(['Pass', 'Pending', 'Fail'] as const).map(opt => (
                            <button
                              key={opt}
                              type="button"
                              onClick={() => setEngGroundVerif(opt)}
                              className={`px-2 py-0.5 rounded text-[10px] font-bold cursor-pointer transition-colors ${engGroundVerif === opt
                                  ? opt === 'Pass' ? 'bg-emerald-600 text-white' : opt === 'Fail' ? 'bg-red-600 text-white' : 'bg-amber-500 text-white'
                                  : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                                }`}
                            >
                              {opt}
                            </button>
                          ))}
                        </div>
                      </div>
                      <p className="text-[11px] text-slate-400">
                        {isTh ? 'ผลทดสอบบดอัดดิน (Compaction) และข้อกำหนดการปูแผ่นเหล็กรองขาช้าง' : 'Soil compaction test and steel road matting requirements verified.'}
                      </p>
                    </div>

                    {/* Item 4: Certification Verification (ปจ.2) */}
                    <div className="p-3 bg-white dark:bg-slate-800/80 rounded-xl border border-slate-200 dark:border-slate-700 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-800 dark:text-slate-200">
                          {isTh ? '4. ใบรับรองเครื่องจักร ปจ.2 (Certification Verification) *' : '4. Statutory Certification (ปจ.2) *'}
                        </span>
                        <div className="flex items-center gap-1">
                          {(['Pass', 'Pending', 'Fail'] as const).map(opt => (
                            <button
                              key={opt}
                              type="button"
                              onClick={() => setEngCertVerif(opt)}
                              className={`px-2 py-0.5 rounded text-[10px] font-bold cursor-pointer transition-colors ${engCertVerif === opt
                                  ? opt === 'Pass' ? 'bg-emerald-600 text-white' : opt === 'Fail' ? 'bg-red-600 text-white' : 'bg-amber-500 text-white'
                                  : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                                }`}
                            >
                              {opt}
                            </button>
                          ))}
                        </div>
                      </div>
                      <p className="text-[11px] text-slate-400">
                        {isTh ? 'เอกสารตรวจสอบสภาพและทดสอบน้ำหนักประจำปีตามกฎหมาย' : 'Statutory annual crane load test and inspection certificate verified.'}
                      </p>
                    </div>
                  </div>

                  {/* Item 5 & 6: Final Result & Remarks */}
                  <div className="p-4 bg-white dark:bg-slate-800/80 rounded-xl border border-slate-200 dark:border-slate-700 space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <span className="font-bold text-xs text-slate-900 dark:text-white uppercase tracking-wider">
                        {isTh ? '5. ผลสรุปการพิจารณาทางวิศวกรรม (Engineering Review Result) *' : '5. Engineering Review Result *'}
                      </span>
                      <div className="flex items-center gap-1.5">
                        {(['Pass', 'Need Revision', 'Fail'] as const).map(opt => (
                          <button
                            key={opt}
                            type="button"
                            onClick={() => setEngReviewResult(opt)}
                            className={`px-3 py-1 rounded-lg text-xs font-bold cursor-pointer transition-colors ${engReviewResult === opt
                                ? opt === 'Pass' ? 'bg-emerald-600 text-white shadow-xs' : opt === 'Fail' ? 'bg-red-600 text-white shadow-xs' : 'bg-orange-600 text-white shadow-xs'
                                : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
                              }`}
                          >
                            {opt === 'Need Revision' ? (isTh ? 'Need Revision' : 'Need Revision') : opt}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <label className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 block mb-1">
                        {isTh
                          ? `6. หมายเหตุและข้อกำหนดทางวิศวกรรม (Engineering Remarks) ${engReviewResult !== 'Pass' ? '*(จำเป็นต้องระบุ)' : ''}`
                          : `6. Engineering Remarks ${engReviewResult !== 'Pass' ? '*(Required for Fail/Revision)' : ''}`}
                      </label>
                      <textarea
                        rows={2}
                        value={engRemarks}
                        onChange={e => setEngRemarks(e.target.value)}
                        placeholder={isTh ? 'ระบุเงื่อนไข เช่น ต้องปูแผ่นเหล็กหนา 50mm, ตรวจสอบมุมสลิงยก...' : 'Enter rigging conditions, required outrigger pad sizes, sling angles...'}
                        className="w-full p-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs"
                      />
                    </div>

                    <div className="flex items-center justify-between pt-1">
                      <div className="text-[10px] text-slate-400">
                        <span>Reviewed By: <strong>{currentReviewer}</strong></span>
                      </div>
                      <button
                        type="button"
                        onClick={handleSaveEngineeringReview}
                        className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-sm transition-colors cursor-pointer"
                      >
                        <Save size={13} />
                        <span>{isTh ? 'บันทึกผลการตรวจสอบวิศวกรรม' : 'Save Engineering Review'}</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 2: SITE & CONFLICT CHECK */}
            {activeTab === 'site' && (
              <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
                      <MapPin size={18} className="text-emerald-500" />
                      <span>{isTh ? 'ผังจำลองพิกัด & ตรวจสอบ Conflict หน้างาน' : 'Site Blueprint & Spatial Conflict Check'}</span>
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      {isTh
                        ? 'ตรวจสอบสิ่งกีดขวางแนวท่อ (Pipe Rack), แนวสายส่งไฟฟ้าแรงสูง และวงรัศมีการยกของเครนข้างเคียง'
                        : 'Interactive blueprint for crane positioning, obstacle screening, and adjacent lift coordination.'}
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    {isEditingMarking ? (
                      <>
                        <button
                          onClick={handleSaveMarkingCoords}
                          className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-sm transition-colors cursor-pointer"
                        >
                          <Save size={13} />
                          <span>{isTh ? 'บันทึกพิกัดใหม่' : 'Save New Coords'}</span>
                        </button>
                        <button
                          onClick={() => {
                            setIsEditingMarking(false);
                            setTempMarkingCoords(null);
                          }}
                          className="px-3 py-1.5 bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-lg text-xs font-medium cursor-pointer"
                        >
                          {isTh ? 'ยกเลิก' : 'Cancel'}
                        </button>
                      </>
                    ) : (
                      <button
                        onClick={() => setIsEditingMarking(true)}
                        className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                      >
                        <Crosshair size={13} />
                        <span>{isTh ? 'ปรับตำแหน่งหมุด' : 'Adjust Pin'}</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* Conflict Alert Banner */}
                {currentConflictCheck.hasConflict ? (
                  <div className="p-3.5 bg-red-50 dark:bg-red-950/40 border border-red-300 dark:border-red-900 rounded-xl text-xs text-red-800 dark:text-red-200 space-y-1">
                    <div className="font-bold flex items-center gap-2">
                      <ShieldAlert size={16} className="text-red-600" />
                      <span>{isTh ? 'ตรวจพบ Spatial / Schedule Conflict!' : 'Spatial / Schedule Conflict Detected!'}</span>
                    </div>
                    <ul className="list-disc list-inside space-y-0.5 text-[11px] pt-1">
                      {currentConflictCheck.conflicts.slice(0, 3).map((c, idx) => (
                        <li key={idx}>{c}</li>
                      ))}
                      {currentConflictCheck.conflicts.length > 3 && (
                        <li className="list-none text-slate-600 dark:text-slate-400 font-semibold pt-0.5">
                          {isTh
                            ? `...และมีข้อขัดแย้งกับงานอื่นอีก ${currentConflictCheck.conflicts.length - 3} รายการ`
                            : `...and ${currentConflictCheck.conflicts.length - 3} more conflicting jobs`}
                        </li>
                      )}
                    </ul>
                  </div>
                ) : currentConflictCheck.hasWarning ? (
                  <div className="p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800 rounded-xl text-xs text-amber-800 dark:text-amber-200 space-y-1">
                    <div className="font-bold flex items-center gap-2">
                      <AlertTriangle size={15} className="text-amber-600" />
                      <span>{isTh ? 'คำเตือนพื้นที่ปฏิบัติงาน (Site Warnings):' : 'Site Proximity Warnings:'}</span>
                    </div>
                    <ul className="list-disc list-inside space-y-0.5 text-[11px]">
                      {currentConflictCheck.warnings.map((w, idx) => (
                        <li key={idx}>{w}</li>
                      ))}
                    </ul>
                  </div>
                ) : (
                  <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 rounded-xl text-xs text-emerald-800 dark:text-emerald-300 flex items-center gap-2">
                    <CheckCircle size={15} className="text-emerald-600 shrink-0" />
                    <span>{isTh ? 'ไม่พบข้อขัดแย้งเชิงพื้นที่หรือตารางเวลาในบริเวณนี้ (Clear of conflicts)' : 'No spatial or schedule conflicts detected in this sector.'}</span>
                  </div>
                )}

                {/* NEW: DEDICATED CONFLICT RESOLUTION PANEL (when conflict exists) */}
                {currentConflictCheck.hasConflict && (
                  <div className="p-4 bg-slate-50 dark:bg-slate-800/80 border border-red-200 dark:border-red-900 rounded-2xl space-y-3">
                    <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-700">
                      <div className="flex items-center gap-2 text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                        <Wrench size={15} className="text-red-500" />
                        <span>{isTh ? 'แผงจัดการข้อขัดแย้ง (Conflict Resolution Panel)' : 'Conflict Resolution Panel'}</span>
                      </div>
                      <span className="font-mono text-[10px] px-2 py-0.5 rounded bg-red-100 dark:bg-red-950 text-red-700 dark:text-red-300 font-bold">
                        CONF-CR-{selectedJob.jobNo.replace(/\D/g, '').slice(-3) || '01'}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                      <div>
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">{isTh ? 'ประเภทข้อขัดแย้ง (Conflict Type):' : 'Conflict Type:'}</span>
                        <p className="font-semibold text-slate-800 dark:text-slate-200 mt-0.5">{currentConflictCheck.conflictType}</p>
                      </div>

                      <div>
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">{isTh ? 'งานที่ได้รับผลกระทบ:' : 'Affected Job:'}</span>
                        <p className="font-mono font-semibold text-slate-800 dark:text-slate-200 mt-0.5">{selectedJob.jobNo} ({selectedJob.plant})</p>
                      </div>

                      <div>
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">{isTh ? 'มาตรการแก้ไข (Resolution Action):' : 'Resolution Action:'}</span>
                        <select
                          value={conflictResAction}
                          onChange={e => setConflictResAction(e.target.value)}
                          className="w-full mt-1 px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-semibold"
                        >
                          <option value="Select Another Crane">{isTh ? '1. เลือกเครนคันอื่น (Select Another Crane)' : '1. Select Another Crane'}</option>
                          <option value="Change Time Slot">{isTh ? '2. ปรับเลื่อนช่วงเวลา (Change Time Slot)' : '2. Change Time Slot'}</option>
                          <option value="Adjust Crane Location">{isTh ? '3. ย้ายตำแหน่งตั้งเครน (Adjust Crane Location)' : '3. Adjust Crane Location'}</option>
                          <option value="Request Revision">{isTh ? '4. ส่งกลับให้ผู้ขอแก้ไข (Request Revision)' : '4. Request Revision'}</option>
                          <option value="Reject Request">{isTh ? '5. ปฏิเสธคำขอ (Reject Request)' : '5. Reject Request'}</option>
                        </select>
                      </div>

                      <div>
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">{isTh ? 'บันทึกเหตุผลการแก้ไข (Resolution Remarks):' : 'Resolution Remarks:'}</span>
                        <input
                          type="text"
                          value={conflictResRemarks}
                          onChange={e => setConflictResRemarks(e.target.value)}
                          placeholder={isTh ? 'ระบุเหตุผลในการแก้ไขปัญหา...' : 'Enter resolution justification...'}
                          className="w-full mt-1 px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs"
                        />
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-2">
                      <span className="text-[10px] text-slate-400">
                        Resolved By: <strong>{currentReviewer}</strong>
                      </span>
                      <button
                        type="button"
                        onClick={handleApplyConflictResolution}
                        className="px-4 py-1.5 bg-slate-900 hover:bg-black dark:bg-white dark:hover:bg-slate-100 text-white dark:text-slate-900 rounded-lg text-xs font-bold transition-all shadow-xs cursor-pointer"
                      >
                        {isTh ? 'ดำเนินการแก้ไข (Apply Resolution)' : 'Apply Resolution'}
                      </button>
                    </div>
                  </div>
                )}

                {/* Blueprint Map Title Bar with Zoom Controls */}
                <div className="flex items-center justify-between gap-2 pt-1 pb-0.5 flex-wrap">
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    {isTh ? 'ผังตำแหน่งและสิ่งกีดขวาง (Blueprint & Obstacles)' : 'Site Blueprint & Obstacles'}
                  </span>

                  {/* Theme Gate & Zoom Controls */}
                  <div className="flex items-center gap-1.5">
                    <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-0.5 rounded-lg border border-slate-200 dark:border-slate-700">
                      <button
                        type="button"
                        onClick={() => setGlobalThemeGate(true)}
                        className={`px-2 py-0.5 rounded text-[10px] font-bold transition-all cursor-pointer ${
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
                        className={`px-2 py-0.5 rounded text-[10px] font-bold transition-all cursor-pointer ${
                          !isGlobalDark
                            ? 'bg-blue-600 text-white shadow-xs'
                            : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                        }`}
                      >
                        Paper CAD
                      </button>
                    </div>
                    <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-0.5 rounded-lg border border-slate-200 dark:border-slate-700">
                      <button
                        type="button"
                        onClick={() => setBlueprintZoom(prev => {
                          const next = Math.max(1.0, parseFloat((prev - 0.2).toFixed(2)));
                          if (next <= 1) setBlueprintPan({ x: 0, y: 0 });
                          else setBlueprintPan(p => clampBlueprintPan(p, next));
                          return next;
                        })}
                        className="p-1 hover:bg-white dark:hover:bg-slate-700 rounded text-slate-600 dark:text-slate-300 cursor-pointer"
                        title="Zoom Out"
                      >
                        <ZoomOut size={13} />
                      </button>
                      <span className="font-mono text-[10px] text-slate-500 dark:text-slate-400 px-1 font-bold min-w-[32px] text-center">
                        {Math.round(blueprintZoom * 100)}%
                      </span>
                      <button
                        type="button"
                        onClick={() => setBlueprintZoom(prev => {
                          const next = Math.min(4.0, parseFloat((prev + 0.2).toFixed(2)));
                          setBlueprintPan(p => clampBlueprintPan(p, next));
                          return next;
                        })}
                        className="p-1 hover:bg-white dark:hover:bg-slate-700 rounded text-slate-600 dark:text-slate-300 cursor-pointer"
                        title="Zoom In"
                      >
                        <ZoomIn size={13} />
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setBlueprintZoom(1);
                          setBlueprintPan({ x: 0, y: 0 });
                        }}
                        className="px-1.5 py-0.5 hover:bg-white dark:hover:bg-slate-700 rounded text-slate-600 dark:text-slate-300 text-[10px] font-bold border-l border-slate-200 dark:border-slate-700 cursor-pointer"
                      >
                        Fit
                      </button>
                    </div>
                  </div>
                </div>

                {/* Interactive Site Blueprint Map */}
                <div
                  ref={blueprintContainerRef}
                  onWheel={handleBlueprintWheel}
                  onMouseDown={handleBlueprintMouseDown}
                  onMouseMove={handleBlueprintMouseMove}
                  onMouseUp={handleBlueprintMouseUp}
                  onMouseLeave={handleBlueprintMouseUp}
                  onClick={e => {
                    if (!isEditingMarking) return;
                    const rect = e.currentTarget.getBoundingClientRect();
                    const clickX = Math.round(((e.clientX - rect.left) / rect.width) * 100);
                    const clickY = Math.round(((e.clientY - rect.top) / rect.height) * 100);
                    setTempMarkingCoords({
                      x: Math.max(5, Math.min(95, clickX)),
                      y: Math.max(5, Math.min(95, clickY))
                    });
                  }}
                  className={`relative w-full h-72 rounded-2xl overflow-hidden border select-none transition-colors duration-300 ${
                    isGlobalDark ? 'bg-slate-950 border-slate-800' : 'bg-[#f4f7fb] border-slate-300'
                  } ${isEditingMarking
                      ? 'cursor-crosshair ring-2 ring-emerald-500/50'
                      : blueprintZoom > 1
                        ? (isDraggingBlueprint ? 'cursor-grabbing' : 'cursor-grab')
                        : 'cursor-default'
                    }`}
                >
                  <div
                    className="absolute inset-0 transition-transform duration-100 ease-out origin-center"
                    style={{
                      transform: `translate(${blueprintPan.x}px, ${blueprintPan.y}px) scale(${blueprintZoom})`,
                      transformOrigin: 'center center'
                    }}
                  >
                    {/* Authentic Master Plot Plan Background */}
                    <div className="absolute inset-0 pointer-events-none select-none overflow-hidden flex items-center justify-center">
                      <img
                        src={essoPlotPlanBg}
                        alt="Master Plot Plan"
                        className={`w-full h-full object-cover pointer-events-none select-none transition-all duration-300 ${
                          isGlobalDark
                            ? 'filter invert hue-rotate-180 brightness-[0.78] contrast-[1.25] opacity-55'
                            : 'opacity-85 mix-blend-multiply'
                        }`}
                      />
                    </div>

                    {/* CAD Grid */}
                    <div className="absolute inset-0 opacity-20 pointer-events-none"
                      style={{
                        backgroundImage: isGlobalDark
                          ? 'radial-gradient(circle, #38bdf8 1px, transparent 1px)'
                          : 'radial-gradient(circle, #64748b 1px, transparent 1px)',
                        backgroundSize: '24px 24px'
                      }}
                    />

                    {/* Obstacles Overlay */}
                    {PLANT_OBSTACLES.filter(obs => obs.plant === selectedJob.plant).map(obs => (
                      <div
                        key={obs.id}
                        className="absolute -translate-x-1/2 -translate-y-1/2 pointer-events-none"
                        style={{ left: `${obs.x}%`, top: `${obs.y}%` }}
                      >
                        <div
                          className={`rounded-full border border-dashed flex items-center justify-center animate-pulse ${obs.type === 'HighVoltage'
                              ? 'border-red-400 bg-red-500/15'
                              : obs.type === 'PipeRack'
                                ? 'border-amber-400 bg-amber-500/15'
                                : 'border-purple-400 bg-purple-500/15'
                            }`}
                          style={{
                            width: `${Math.max(36, obs.radiusM * 1.5)}px`,
                            height: `${Math.max(36, obs.radiusM * 1.5)}px`
                          }}
                        >
                          <span className="text-[8px] font-mono font-bold text-white px-1 py-0.5 rounded bg-black/60 shadow">
                            {obs.type === 'HighVoltage' ? '115kV' : obs.type === 'PipeRack' ? 'PipeRack' : 'Restricted'}
                          </span>
                        </div>
                      </div>
                    ))}

                    {/* Other Active Jobs on Same Date */}
                    {jobs.filter(j => j.id !== selectedJob.id && j.date === selectedJob.date && j.status !== 'Rejected').map(other => (
                      <div
                        key={other.id}
                        className="absolute -translate-x-1/2 -translate-y-1/2 pointer-events-none"
                        style={{ left: `${other.markingLocation.x}%`, top: `${other.markingLocation.y}%` }}
                      >
                        <div
                          className="rounded-full border border-dashed border-slate-400/40 bg-slate-500/10"
                          style={{
                            width: `${Math.max(28, other.requiredRadiusM * 1.8)}px`,
                            height: `${Math.max(28, other.requiredRadiusM * 1.8)}px`
                          }}
                        />
                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-slate-400" />
                        <span className="absolute top-full left-1/2 -translate-x-1/2 font-mono text-[7px] text-slate-400 whitespace-nowrap bg-black/70 px-1 rounded">
                          {other.jobNo}
                        </span>
                      </div>
                    ))}

                    {/* Selected Job Crane Marker */}
                    <div
                      className="absolute -translate-x-1/2 -translate-y-1/2 transition-all duration-200 pointer-events-none"
                      style={{ left: `${currentCoords.x}%`, top: `${currentCoords.y}%` }}
                    >
                      {/* Boom Swing Radius Circle */}
                      <div
                        className={`rounded-full border-2 ${currentConflictCheck.hasConflict
                            ? 'border-red-500 bg-red-500/20 animate-pulse'
                            : 'border-emerald-400 bg-emerald-500/15'
                          }`}
                        style={{
                          width: `${Math.max(48, selectedJob.requiredRadiusM * 2.2)}px`,
                          height: `${Math.max(48, selectedJob.requiredRadiusM * 2.2)}px`,
                          transform: 'translate(-50%, -50%)',
                          position: 'absolute',
                          top: '50%',
                          left: '50%'
                        }}
                      />

                      {/* Outrigger Footprint Box */}
                      <div
                        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-6 h-6 border border-emerald-400/80 bg-emerald-950/40"
                        title="Outrigger Mat Footprint"
                      />

                      {/* Center Pin Marker */}
                      <div className="relative z-10 flex flex-col items-center">
                        <div className={`w-5 h-5 rounded-full flex items-center justify-center shadow-lg border-2 border-white ${currentConflictCheck.hasConflict ? 'bg-red-600' : 'bg-emerald-500'
                          }`}>
                          <HardHat size={11} className="text-white" />
                        </div>
                        <span className="font-mono text-[9px] font-bold text-white bg-slate-900/90 px-1.5 py-0.5 rounded shadow border border-slate-700 mt-1 whitespace-nowrap">
                          {selectedJob.jobNo}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Coords HUD */}
                  <div className="absolute bottom-2 left-2 px-2 py-1 rounded bg-black/70 text-slate-300 font-mono text-[10px] flex items-center gap-2 border border-slate-700">
                    <span>X: {currentCoords.x}%</span>
                    <span>Y: {currentCoords.y}%</span>
                    <span>|</span>
                    <span>Radius: {selectedJob.requiredRadiusM}m</span>
                  </div>

                  {isEditingMarking && (
                    <div className="absolute top-2 left-2 px-2.5 py-1 rounded-lg bg-emerald-600 text-white font-bold text-[10px] animate-pulse">
                      {isTh ? 'โหมดปรับหมุด: คลิกบนผังเพื่อย้ายพิกัด' : 'Pin Edit Mode: Click anywhere on map'}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* TAB 3: CRANE MATCHING & SCORING */}
            {activeTab === 'matching' && (
              <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm space-y-5">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
                    <HardHat size={18} className="text-emerald-500" />
                    <span>{isTh ? 'การคัดเลือกและจับคู่เครน (Crane Matching & Fleet Candidates)' : 'Crane Matching & Optimization Candidates'}</span>
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    {isTh
                      ? 'จัดอันดับเฉพาะเครนที่ผ่านเกณฑ์ความปลอดภัยวิศวกรรม (Safety Validation = PASS) เครนที่ไม่ผ่านจะไม่สามารถจัดสรรได้'
                      : 'Ranks cranes passing safety validation. Cranes with FAIL or PENDING safety status are blocked from assignment.'}
                  </p>
                </div>

                {/* NEW: OPTIMIZE WITH (SHARED CRANE MULTI-JOB SCHEDULING) */}
                <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                      <Share2 size={15} className="text-indigo-500" />
                      <span>{isTh ? 'การจัดสรรแบบใช้เครนร่วม (Optimize With / Shared Crane)' : 'Optimize With / Shared Crane'}</span>
                    </div>
                    <span className="text-[10px] text-slate-400">Multi-Job Single Crane Optimization</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    <div>
                      <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block mb-1">
                        {isTh ? 'จับคู่ใช้งานร่วมกับงานอื่น (Compatible Requests):' : 'Select Compatible Request:'}
                      </label>
                      <select
                        value={optimizeWithTarget}
                        onChange={e => {
                          setOptimizeWithTarget(e.target.value);
                          if (selectedJob) {
                            const updated = { ...selectedJob, optimizeWith: e.target.value };
                            onUpdateJob(updated);
                            updateCraneJob(selectedJob.id, { optimizeWith: e.target.value });
                          }
                        }}
                        className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs"
                      >
                        <option value="">{isTh ? '-- ไม่ใช้เครนร่วม (Standalone Lift) --' : '-- Standalone Lift (No Shared Crane) --'}</option>
                        {compatibleSharedJobs.map(cj => (
                          <option key={cj.id} value={cj.jobNo}>
                            {cj.jobNo} ({cj.area} - {cj.loadWeightTon}T @ {cj.startTime})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block mb-1">
                        {isTh ? 'แผนรองรับการย้ายและเซ็ตอัป (Transfer Buffer):' : 'Estimated Transfer & Setup:'}
                      </label>
                      <div className="px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs text-slate-700 dark:text-slate-300 font-mono flex items-center justify-between">
                        <span>1.5 Hours Transfer & Outrigger Pad Matting</span>
                        <span className="text-[10px] font-bold text-emerald-600">VALIDATED</span>
                      </div>
                    </div>
                  </div>

                  {optimizeWithTarget && (
                    <div className="p-2.5 bg-indigo-50/70 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-900 rounded-lg text-[11px] text-indigo-900 dark:text-indigo-200 flex items-center gap-2">
                      <Sparkles size={14} className="text-indigo-600 shrink-0" />
                      <span>
                        {isTh
                          ? `แผนแชร์เครนระหว่าง ${selectedJob.jobNo} และ ${optimizeWithTarget} ได้รับการคำนวณช่วงเวลาย้ายเครื่องจักรอย่างเหมาะสม`
                          : `Shared crane sequence configured between ${selectedJob.jobNo} and ${optimizeWithTarget}.`}
                      </span>
                    </div>
                  )}
                </div>

                {/* Fleet Candidate Cards */}
                <div className="space-y-3 pt-1">
                  {equipment.map(crane => {
                    const suitability = getSuitabilityScore(crane, selectedJob);
                    const isCurrentlyAssigned = selectedJob.assignedCraneId === crane.id;
                    const isManuallySelected = manuallySelectedCraneId === crane.id;
                    const canAssign = suitability.eligible && suitability.validation.result === 'PASS';

                    return (
                      <div
                        key={crane.id}
                        className={`p-4 rounded-xl border transition-all ${isCurrentlyAssigned
                            ? 'border-emerald-500 bg-emerald-50/40 dark:bg-emerald-950/20 ring-1 ring-emerald-500/20'
                            : isManuallySelected
                              ? 'border-slate-800 dark:border-slate-200 bg-slate-50/60 dark:bg-slate-800/40'
                              : canAssign
                                ? 'border-slate-200 dark:border-slate-700 hover:border-slate-400 bg-white dark:bg-slate-800/30'
                                : 'border-slate-200/60 dark:border-slate-800 bg-slate-50/30 dark:bg-slate-850/20 opacity-65'
                          }`}
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                          <div className="space-y-1.5">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="font-bold text-sm text-slate-900 dark:text-white">
                                {crane.name}
                              </span>
                              <span className="font-mono text-xs px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                                {crane.id}
                              </span>
                              <span className="text-xs font-semibold px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                                {crane.type}
                              </span>
                              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${crane.status === 'Available' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400' :
                                  crane.status === 'Assigned' ? 'bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400' :
                                    'bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400'
                                }`}>
                                {crane.status}
                              </span>

                              {/* Safety Result Badge */}
                              <span className={`text-[10px] font-black px-2 py-0.5 rounded ${suitability.validation.result === 'PASS'
                                  ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                                  : 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300'
                                }`}>
                                {isTh ? `ความปลอดภัย: ${suitability.validation.result === 'PASS' ? 'ผ่าน' : suitability.validation.result === 'FAIL' ? 'ไม่ผ่าน' : 'รอประเมิน'}` : `SAFETY: ${suitability.validation.result}`}
                              </span>
                            </div>

                            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500 dark:text-slate-400">
                              <span>{isTh ? 'พิกัดยกสูงสุด:' : 'Max Cap:'} <strong className="text-slate-800 dark:text-slate-200">{crane.capacityTon}{isTh ? ' ตัน' : 'T'}</strong></span>
                              <span>{isTh ? 'ระยะบูม:' : 'Boom Reach:'} <strong className="text-slate-800 dark:text-slate-200">{crane.boomLengthM}{isTh ? ' ม.' : 'm'}</strong></span>
                              <span>{isTh ? 'ใบรับรอง ปจ.2:' : 'Phor Jor 2:'} <strong className={crane.isCertValid !== false ? 'text-emerald-600 font-semibold' : 'text-red-500 font-semibold'}>{crane.certExpiryDate || (isTh ? 'ผ่านการรับรอง' : 'Valid')}</strong></span>
                              <span>{isTh ? 'อัตราค่าเช่า:' : 'Rate:'} <strong>฿{crane.hourlyRateThb.toLocaleString()}{isTh ? '/ชม.' : '/hr'}</strong></span>
                              <span>{isTh ? 'ผู้ควบคุม:' : 'Operator:'} <strong>{crane.operator}</strong></span>
                            </div>

                            {/* Reasons / Validation details */}
                            <div className="text-[11px] space-y-0.5 pt-1">
                              {suitability.validation.reasons.slice(0, 2).map((r, i) => (
                                <p key={i} className={`flex items-center gap-1.5 ${suitability.validation.result === 'PASS' ? 'text-slate-600 dark:text-slate-400' : 'text-red-500 font-semibold'
                                  }`}>
                                  {suitability.validation.result === 'PASS' ? (
                                    <Check size={12} className="text-emerald-500 shrink-0" />
                                  ) : (
                                    <X size={12} className="text-red-500 shrink-0" />
                                  )}
                                  <span>{r}</span>
                                </p>
                              ))}
                            </div>
                          </div>

                          {/* Suitability Score & Selection Action */}
                          <div className="flex sm:flex-col items-center sm:items-end justify-between gap-2 shrink-0">
                            <div className="text-right">
                              <span className="text-[10px] uppercase font-bold text-slate-400">
                                {isTh ? 'คะแนนความเหมาะสม' : 'Suitability Score'}
                              </span>
                              <div className="flex items-center gap-1.5">
                                <span className={`text-base font-black ${suitability.score >= 85 ? 'text-emerald-600 dark:text-emerald-400' :
                                    suitability.score >= 50 ? 'text-blue-600 dark:text-blue-400' :
                                      'text-slate-400'
                                  }`}>
                                  {suitability.score}%
                                </span>
                                <span className="text-[10px] text-slate-500 font-semibold">({suitability.label})</span>
                              </div>
                            </div>

                            {isCurrentlyAssigned ? (
                              <div className="flex items-center gap-1.5">
                                <span className="px-3 py-1.5 bg-emerald-600 text-white rounded-lg text-xs font-bold flex items-center gap-1 shadow-xs">
                                  <CheckCircle size={14} /> {isTh ? 'จัดสรรแล้ว' : 'Assigned'}
                                </span>
                                <button
                                  onClick={handleUnassignCrane}
                                  className="px-2 py-1.5 bg-slate-100 hover:bg-red-50 text-slate-600 hover:text-red-600 rounded-lg text-xs font-semibold transition-colors cursor-pointer"
                                  title="Release Crane Booking"
                                >
                                  {isTh ? 'ปลดการจอง' : 'Release'}
                                </button>
                              </div>
                            ) : (
                              <button
                                disabled={!canAssign}
                                onClick={() => {
                                  // Same-time double booking -> offer free cranes in a popup instead of selecting
                                  if (!getCraneAvailability(crane, selectedJob).freeNow) {
                                    setFreeCraneTargetId(crane.id);
                                    setShowFreeCraneModal(true);
                                    return;
                                  }
                                  setManuallySelectedCraneId(crane.id);
                                  setActiveTab('review');
                                }}
                                className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${canAssign
                                    ? 'bg-slate-900 hover:bg-black dark:bg-white dark:hover:bg-slate-100 text-white dark:text-slate-900 shadow-xs'
                                    : 'bg-slate-100 dark:bg-slate-800 text-slate-400 cursor-not-allowed'
                                  }`}
                                title={!canAssign ? (isTh ? 'ไม่สามารถเลือกได้: ไม่ผ่านเกณฑ์ความปลอดภัย' : 'Cannot select: Safety validation failed') : (isTh ? 'เลือกเครนนี้เพื่อไปตรวจสรุปการจัดสรร' : 'Select crane for assignment review')}
                              >
                                <HardHat size={14} />
                                <span>{isTh ? 'เลือกเครนนี้' : 'Select Crane'}</span>
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* TAB 4: ASSIGNMENT REVIEW & LOCK */}
            {activeTab === 'review' && (
              <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm space-y-6">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
                    <FileText size={18} className="text-emerald-500" />
                    <span>{isTh ? 'สรุปข้อมูลก่อนยืนยันการจัดสรร (Assignment Review)' : 'Assignment Review & Schedule Lock'}</span>
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    {isTh
                      ? 'ตรวจสอบรายการเงื่อนไขความพร้อม (Readiness Checklist) และยืนยันการจัดสรรเพื่อ Sync ไปยังทุกโมดูล'
                      : 'Final signoff checklist before locking crane schedule across Job List, Calendar, and Plot Plan.'}
                  </p>
                </div>

                {/* NEW: 7-POINT ASSIGNMENT READINESS CHECKLIST */}
                <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <ClipboardCheck size={16} className={readinessChecklist.ready ? 'text-emerald-500' : 'text-amber-500'} />
                      <span className="text-xs font-black uppercase tracking-wider text-slate-900 dark:text-white">
                        {isTh ? 'การตรวจสอบความพร้อมก่อนจัดสรร (Assignment Readiness Checklist)' : 'Assignment Readiness Checklist'}
                      </span>
                    </div>
                    <span className={`text-xs font-mono font-bold px-2 py-0.5 rounded ${readinessChecklist.ready
                        ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                        : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                      }`}>
                      {readinessChecklist.passCount} / {readinessChecklist.total} {isTh ? 'ผ่านเกณฑ์' : 'Ready'}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                    {readinessChecklist.items.map(item => (
                      <div
                        key={item.id}
                        className={`p-2.5 rounded-xl border flex items-center gap-2.5 ${item.pass
                            ? 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700/80 text-slate-700 dark:text-slate-200'
                            : 'bg-red-50/50 dark:bg-red-950/20 border-red-200 dark:border-red-900 text-red-700 dark:text-red-300'
                          }`}
                      >
                        {item.pass ? (
                          <CheckCircle size={15} className="text-emerald-500 shrink-0" />
                        ) : (
                          <XCircle size={15} className="text-red-500 shrink-0" />
                        )}
                        <span className="text-[11px] font-semibold">{item.label}</span>
                      </div>
                    ))}
                  </div>

                  {!readinessChecklist.ready && (
                    <div className="p-2.5 rounded-lg bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-200 text-[11px] flex items-center gap-2">
                      <AlertTriangle size={14} className="shrink-0" />
                      <span>{isTh ? 'ยังมีข้อกำหนดที่ยังไม่ผ่านเกณฑ์ ปุ่มยืนยันการจัดสรรจะถูกปิดเพื่อความปลอดภัย' : 'Some readiness items are blocking assignment. Complete all checks to proceed.'}</span>
                    </div>
                  )}
                </div>

                {/* Pre-Assignment Summary Checklist */}
                <div className="divide-y divide-slate-100 dark:divide-slate-800 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden text-xs">
                  <div className="p-3.5 bg-slate-50 dark:bg-slate-800/40 flex items-center justify-between">
                    <span className="font-semibold text-slate-500 dark:text-slate-400">{isTh ? 'รหัสงาน / WO Number:' : 'Job ID / WO Number:'}</span>
                    <span className="font-bold text-slate-900 dark:text-white font-mono">
                      {selectedJob.jobNo} ({selectedJob.woNumber || unifiedJobsMap.get(selectedJob.id)?.woNumber || 'WO-94021'})
                    </span>
                  </div>

                  <div className="p-3.5 flex items-center justify-between">
                    <span className="font-semibold text-slate-500 dark:text-slate-400">{isTh ? 'รถเครนที่เลือก:' : 'Selected Crane:'}</span>
                    <span className="font-bold text-slate-900 dark:text-white">
                      {effectiveCrane ? `${effectiveCrane.name} (${effectiveCrane.capacityTon}${isTh ? ' ตัน' : 'T'})` : <span className="text-amber-500 font-normal">{isTh ? 'ยังไม่ได้เลือกเครน' : 'None Selected'}</span>}
                    </span>
                  </div>

                  <div className="p-3.5 bg-slate-50 dark:bg-slate-800/40 flex items-center justify-between">
                    <span className="font-semibold text-slate-500 dark:text-slate-400">{isTh ? 'น้ำหนักยกสุทธิ & รัศมีทำงาน:' : 'Gross Load & Working Radius:'}</span>
                    <span className="font-mono font-bold text-slate-900 dark:text-white">
                      {selectedJob.loadWeightTon} {isTh ? 'ตัน' : 'Ton'} / {selectedJob.requiredRadiusM} {isTh ? 'เมตร' : 'meters'}
                    </span>
                  </div>

                  <div className="p-3.5 flex items-center justify-between">
                    <span className="font-semibold text-slate-500 dark:text-slate-400">{isTh ? 'วันและช่วงเวลาตามแผน:' : 'Scheduled Date & Time Slot:'}</span>
                    <span className="font-mono font-bold text-slate-900 dark:text-white">
                      {selectedJob.date} ({selectedJob.startTime} - {selectedJob.endTime})
                    </span>
                  </div>

                  <div className="p-3.5 bg-slate-50 dark:bg-slate-800/40 flex items-center justify-between">
                    <span className="font-semibold text-slate-500 dark:text-slate-400">{isTh ? 'ผลการประเมินความปลอดภัยวิศวกรรม:' : 'Engineering Safety Validation:'}</span>
                    <span className={`font-black uppercase px-2 py-0.5 rounded text-[11px] ${currentValidation.result === 'PASS'
                        ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                        : 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300'
                      }`}>
                      {isTh ? (currentValidation.result === 'PASS' ? 'ผ่านเกณฑ์' : currentValidation.result === 'FAIL' ? 'ไม่ผ่าน' : 'รอตรวจสอบ') : currentValidation.result} (Margin: +{currentValidation.safetyMarginPercent}%)
                    </span>
                  </div>

                  <div className="p-3.5 flex items-center justify-between">
                    <span className="font-semibold text-slate-500 dark:text-slate-400">{isTh ? 'สถานะข้อขัดแย้งพื้นที่ & เวลา:' : 'Spatial & Schedule Conflict Status:'}</span>
                    <span className={`font-bold text-[11px] ${currentConflictCheck.hasConflict ? 'text-red-500' : 'text-emerald-600 dark:text-emerald-400'
                      }`}>
                      {currentConflictCheck.hasConflict
                        ? (isTh ? 'ตรวจพบข้อขัดแย้ง (ไม่สามารถจัดสรรได้)' : 'CONFLICT DETECTED')
                        : (isTh ? 'ปลอดภัย (ไม่พบข้อขัดแย้ง)' : 'CLEAR (NO CONFLICT)')}
                    </span>
                  </div>

                  <div className="p-3.5 bg-slate-50 dark:bg-slate-800/40 flex items-center justify-between">
                    <span className="font-semibold text-slate-500 dark:text-slate-400">{isTh ? 'วิศวกรผู้ตรวจสอบและอนุมัติ:' : 'Lead Reviewer / Engineer:'}</span>
                    <span className="font-bold text-slate-800 dark:text-slate-200">{currentReviewer}</span>
                  </div>
                </div>

                {/* Optional Manual Assignment Rationale */}
                <div>
                  <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block mb-1">
                    {isTh ? 'บันทึกเหตุผลทางวิศวกรรมเพิ่มเติม (Engineering Notes / Rationale)' : 'Engineering Signoff Notes / Rationale'}
                  </label>
                  <textarea
                    rows={2}
                    value={manualRationaleNote}
                    onChange={e => setManualRationaleNote(e.target.value)}
                    placeholder={isTh ? 'ระบุข้อกำหนดเพิ่มเติม เช่น การปูแผ่นเหล็กหนา 50mm, ตรวจสอบสายสลิง...' : 'Enter any site-specific rigging conditions, ground mats, or inspection notes...'}
                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                {/* Final Gatekeeper Action Controls */}
                <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    {/* Return for Revision Button */}
                    <button
                      onClick={() => setShowRevisionModal(true)}
                      className="px-3.5 py-2 bg-orange-50 hover:bg-orange-100 text-orange-700 dark:bg-orange-950/30 dark:hover:bg-orange-950/50 dark:text-orange-300 border border-orange-200 dark:border-orange-800 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <RotateCcw size={14} />
                      <span>{isTh ? 'ส่งกลับให้แก้ไข' : 'Return for Revision'}</span>
                    </button>

                    {/* Reject Button */}
                    <button
                      onClick={() => setShowRejectModal(true)}
                      className="px-3.5 py-2 bg-red-50 hover:bg-red-100 text-red-600 dark:bg-red-950/30 dark:hover:bg-red-950/50 dark:text-red-400 border border-red-200 dark:border-red-900 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <XCircle size={14} />
                      <span>{isTh ? 'ปฏิเสธคำขอ' : 'Reject Plan'}</span>
                    </button>
                  </div>

                  <div className="flex items-center gap-2">
                    {/* Reassign & Unlock Controls (when job is already Assigned) */}
                    {selectedJob.status === 'Assigned' ? (
                      <>
                        <button
                          type="button"
                          onClick={() => {
                            setReassignTargetCraneId(selectedJob.assignedCraneId || '');
                            setReassignNewDate(selectedJob.date);
                            setReassignNewStartTime(selectedJob.startTime);
                            setReassignNewEndTime(selectedJob.endTime);
                            setShowReassignModal(true);
                          }}
                          className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer border border-slate-200 dark:border-slate-700"
                        >
                          <ArrowLeftRight size={14} />
                          <span>{isTh ? 'เปลี่ยนเครน (Reassign)' : 'Reassign Crane'}</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => setShowUnlockModal(true)}
                          className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer border border-slate-200 dark:border-slate-700"
                        >
                          <Unlock size={14} />
                          <span>{isTh ? 'ปลดล็อกการจัดสรร (Unlock)' : 'Unlock Assignment'}</span>
                        </button>

                        <button
                          onClick={handleUnassignCrane}
                          className="px-3 py-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
                        >
                          {isTh ? 'ยกเลิกการจอง' : 'Release'}
                        </button>
                      </>
                    ) : (
                      /* Final Assign Crane Button */
                      <button
                        disabled={!readinessChecklist.ready}
                        onClick={() => setShowAssignConfirmModal(true)}
                        className={`px-5 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 transition-all shadow-md active:scale-95 cursor-pointer ${readinessChecklist.ready
                            ? 'bg-slate-900 hover:bg-black dark:bg-white dark:hover:bg-slate-100 text-white dark:text-slate-900'
                            : 'bg-slate-200 dark:bg-slate-800 text-slate-400 cursor-not-allowed'
                          }`}
                        title={!readinessChecklist.ready ? (isTh ? 'ยังไม่ผ่านเกณฑ์ความพร้อมครบทุกข้อ' : 'Readiness checklist incomplete') : 'Confirm and assign crane'}
                      >
                        <Lock size={15} />
                        <span>{isTh ? 'ยืนยันจัดสรรและล็อกคิวงาน (Assign Crane)' : 'Confirm Assignment & Lock'}</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="lg:col-span-7 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-12 text-center text-slate-400">
            {isTh ? 'กรุณาเลือกรายการคำขอจากรายการทางซ้ายเพื่อตรวจสอบ' : 'Select a lifting request from the pipeline to review specifications and assign cranes.'}
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* MODAL 1: AUTO-OPTIMIZER SIMULATION & INTERACTIVE FACTOR CONFIG            */}
      {/* ========================================================================= */}
      {showOptimizerPreviewModal && (() => {
        const totalRawWeight = Math.max(
          1,
          optimizerFactorConfig.rightSizingWeight +
            optimizerFactorConfig.safetyBufferWeight +
            optimizerFactorConfig.costEfficiencyWeight +
            optimizerFactorConfig.readinessWeight
        );
        const normRightSize = Math.round((optimizerFactorConfig.rightSizingWeight / totalRawWeight) * 100);
        const normSafety = Math.round((optimizerFactorConfig.safetyBufferWeight / totalRawWeight) * 100);
        const normCost = Math.round((optimizerFactorConfig.costEfficiencyWeight / totalRawWeight) * 100);
        const normReadiness = Math.max(0, 100 - normRightSize - normSafety - normCost);

        const matchedItems = optimizerPreviewItems.filter(i => i.recommendedCrane && i.safetyResult === 'PASS');
        const selectedItems = optimizerPreviewItems.filter(i => i.selected && i.recommendedCrane);
        const avgScore = matchedItems.length > 0
          ? Math.round(matchedItems.reduce((s, i) => s + i.score, 0) / matchedItems.length)
          : 0;
        const totalEstBatchSaving = selectedItems.reduce((s, i) => s + (i.estSavingThb || 0), 0);

        return (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-4">
            <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-6xl w-full p-5 sm:p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4 max-h-[92vh] flex flex-col animate-in zoom-in-95 duration-200">
              {/* Modal Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400">
                    <Sparkles size={20} />
                    <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white">
                      {isTh
                        ? 'จำลองจัดสรรเครนอัตโนมัติ & ตั้งค่าตัวแปร (Auto-Optimizer Simulation & Factor Config)'
                        : 'Auto-Optimizer Simulation & Factor Configuration'}
                    </h3>
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-extrabold bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                      Multi-Objective Engine
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {isTh
                      ? 'ปรับค่าน้ำหนักตัวแปร (Factor Weights) และเกณฑ์วิศวกรรมความปลอดภัยเพื่อจำลองผลลัพธ์การจัดสรรเครนแบบเรียลไทม์ก่อนยืนยัน'
                      : 'Adjust multi-objective scoring weights, engineering safety thresholds, and scheduling rules to simulate optimal crane matching in real time.'}
                  </p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => setShowFactorConfigPanel(prev => !prev)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-extrabold border flex items-center gap-1.5 transition-all cursor-pointer ${
                      showFactorConfigPanel
                        ? 'bg-indigo-50 dark:bg-indigo-950/70 border-indigo-300 dark:border-indigo-700 text-indigo-700 dark:text-indigo-300'
                        : 'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    <Sliders size={14} />
                    <span>
                      {showFactorConfigPanel
                        ? (isTh ? 'ซ่อนแผงตั้งค่าตัวแปร' : 'Hide Factor Config')
                        : (isTh ? 'เปิดแผงตั้งค่าตัวแปร (Factor Config)' : 'Show Factor Config')}
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowOptimizerPreviewModal(false)}
                    className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                  >
                    <X size={18} />
                  </button>
                </div>
              </div>

              {/* Scrollable Body */}
              <div className="flex-1 overflow-y-auto space-y-4 pr-1 custom-scrollbar">
                {/* =============================================================== */}
                {/* COLLAPSIBLE FACTOR CONFIGURATION PANEL                          */}
                {/* =============================================================== */}
                {showFactorConfigPanel && (
                  <div className="p-4 rounded-2xl bg-slate-50/90 dark:bg-slate-800/50 border border-indigo-200/80 dark:border-indigo-900/60 space-y-4">
                    {/* Preset Strategy Selector Bar */}
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pb-3 border-b border-slate-200/80 dark:border-slate-700/80">
                      <div className="flex items-center gap-2">
                        <Sliders size={15} className="text-indigo-600 dark:text-indigo-400" />
                        <span className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-slate-200">
                          {isTh ? '1. เลือกโหมดกลยุทธ์สำเร็จรูป (Optimization Strategy Presets):' : '1. Optimization Strategy Presets:'}
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5 flex-wrap">
                        {[
                          {
                            id: 'balanced' as const,
                            labelTh: 'สมดุลวิศวกรรม & ต้นทุน (Balanced)',
                            labelEn: 'Balanced Engineering',
                            desc: '30/25/25/20 · Margin ≥20%'
                          },
                          {
                            id: 'safety_first' as const,
                            labelTh: 'เน้นความปลอดภัยสูงสุด (Safety First)',
                            labelEn: 'Safety First (Strict)',
                            desc: 'Margin ≥30% · GBP ≤85%'
                          },
                          {
                            id: 'cost_saving' as const,
                            labelTh: 'เน้นลดต้นทุนสูงสุด (Max Cost Saving)',
                            labelEn: 'Max Cost Saving',
                            desc: 'Right-Size 40% + Shared Fleet'
                          },
                          {
                            id: 'urgent_speed' as const,
                            labelTh: 'เน้นงานด่วน Turnaround (Speed & Readiness)',
                            labelEn: 'Turnaround Speed',
                            desc: 'Readiness 45% + Auto-Slot'
                          }
                        ].map(p => {
                          const active = optimizerFactorConfig.preset === p.id;
                          return (
                            <button
                              key={p.id}
                              type="button"
                              onClick={() => applyFactorPreset(p.id)}
                              className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer flex items-center gap-1.5 ${
                                active
                                  ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                                  : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-indigo-400'
                              }`}
                            >
                              <span>{isTh ? p.labelTh : p.labelEn}</span>
                              <span className={`text-[10px] font-mono px-1.5 py-0.2 rounded ${active ? 'bg-white/20 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-500'}`}>
                                {p.desc}
                              </span>
                            </button>
                          );
                        })}

                        <button
                          type="button"
                          onClick={() => applyFactorPreset('balanced')}
                          className="px-2.5 py-1.5 rounded-xl text-[11px] font-bold text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-slate-700/60 flex items-center gap-1 cursor-pointer"
                          title={isTh ? 'คืนค่าเริ่มต้น' : 'Reset to default factors'}
                        >
                          <RotateCcw size={12} />
                          <span>{isTh ? 'รีเซ็ตค่าเริ่มต้น' : 'Reset'}</span>
                        </button>
                      </div>
                    </div>

                    {/* Two-Column Factor Sliders: Left = Scoring Weights, Right = Safety & Constraint Thresholds */}
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
                      {/* Left 6 Cols: Multi-Objective Scoring Weights */}
                      <div className="lg:col-span-6 bg-white dark:bg-slate-900 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-black text-slate-800 dark:text-slate-200 uppercase tracking-wider">
                            {isTh ? '2. ค่าน้ำหนักการให้คะแนน (Scoring Weights 100%)' : '2. Multi-Objective Scoring Weights (Normalized 100%)'}
                          </span>
                          <span className="text-[10px] font-mono font-bold text-indigo-600 dark:text-indigo-400">
                            {normRightSize}% + {normSafety}% + {normCost}% + {normReadiness}% = 100%
                          </span>
                        </div>

                        {/* Weight Distribution Bar */}
                        <div className="h-2.5 w-full rounded-full overflow-hidden flex bg-slate-100 dark:bg-slate-800">
                          <div style={{ width: `${normRightSize}%` }} className="bg-indigo-500 transition-all" title={`Right-Sizing: ${normRightSize}%`} />
                          <div style={{ width: `${normSafety}%` }} className="bg-emerald-500 transition-all" title={`Safety Buffer: ${normSafety}%`} />
                          <div style={{ width: `${normCost}%` }} className="bg-teal-500 transition-all" title={`Cost Efficiency: ${normCost}%`} />
                          <div style={{ width: `${normReadiness}%` }} className="bg-amber-500 transition-all" title={`Readiness & Fuel: ${normReadiness}%`} />
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                          {/* Factor 1: Right-Sizing */}
                          <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-700/70 space-y-1">
                            <div className="flex items-center justify-between text-xs">
                              <span className="font-bold text-slate-700 dark:text-slate-200 flex items-center gap-1.5">
                                <span className="w-2 h-2 rounded-full bg-indigo-500" />
                                {isTh ? 'ความเหมาะสมขนาดเครน (Right-Sizing)' : 'Capacity Right-Sizing'}
                              </span>
                              <span className="font-mono font-black text-indigo-600 dark:text-indigo-400">{normRightSize}%</span>
                            </div>
                            <input
                              type="range"
                              min={5}
                              max={70}
                              step={5}
                              value={optimizerFactorConfig.rightSizingWeight}
                              onChange={e =>
                                setOptimizerFactorConfig(prev => ({
                                  ...prev,
                                  preset: 'custom',
                                  rightSizingWeight: Number(e.target.value)
                                }))
                              }
                              className="w-full accent-indigo-600 cursor-pointer"
                            />
                            <p className="text-[10px] text-slate-400">
                              {isTh ? 'ลดการใช้เครนใหญ่เกินความจำเป็น (Ideal 1.25x–2.0x)' : 'Penalizes oversized cranes (ideal 1.25x–2.0x load)'}
                            </p>
                          </div>

                          {/* Factor 2: Safety Buffer */}
                          <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-700/70 space-y-1">
                            <div className="flex items-center justify-between text-xs">
                              <span className="font-bold text-slate-700 dark:text-slate-200 flex items-center gap-1.5">
                                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                                {isTh ? 'ส่วนเผื่อความปลอดภัย (Safety Buffer)' : 'Safety Margin Headroom'}
                              </span>
                              <span className="font-mono font-black text-emerald-600 dark:text-emerald-400">{normSafety}%</span>
                            </div>
                            <input
                              type="range"
                              min={5}
                              max={70}
                              step={5}
                              value={optimizerFactorConfig.safetyBufferWeight}
                              onChange={e =>
                                setOptimizerFactorConfig(prev => ({
                                  ...prev,
                                  preset: 'custom',
                                  safetyBufferWeight: Number(e.target.value)
                                }))
                              }
                              className="w-full accent-emerald-600 cursor-pointer"
                            />
                            <p className="text-[10px] text-slate-400">
                              {isTh ? 'ให้น้ำหนักส่วนเผื่อ Load Chart และแรงกดดิน GBP ต่ำ' : 'Rewards higher Load Chart & soil bearing headroom'}
                            </p>
                          </div>

                          {/* Factor 3: Cost Efficiency */}
                          <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-700/70 space-y-1">
                            <div className="flex items-center justify-between text-xs">
                              <span className="font-bold text-slate-700 dark:text-slate-200 flex items-center gap-1.5">
                                <span className="w-2 h-2 rounded-full bg-teal-500" />
                                {isTh ? 'ความคุ้มค่าค่าเช่า (Cost Economy)' : 'Rental & Cost Economy'}
                              </span>
                              <span className="font-mono font-black text-teal-600 dark:text-teal-400">{normCost}%</span>
                            </div>
                            <input
                              type="range"
                              min={5}
                              max={70}
                              step={5}
                              value={optimizerFactorConfig.costEfficiencyWeight}
                              onChange={e =>
                                setOptimizerFactorConfig(prev => ({
                                  ...prev,
                                  preset: 'custom',
                                  costEfficiencyWeight: Number(e.target.value)
                                }))
                              }
                              className="w-full accent-teal-600 cursor-pointer"
                            />
                            <p className="text-[10px] text-slate-400">
                              {isTh ? 'เน้นเครนที่มีอัตราค่าเช่ารายชั่วโมงประหยัดและอยู่โซนเดียวกัน' : 'Prioritizes lower hourly rate & co-located fleet'}
                            </p>
                          </div>

                          {/* Factor 4: Fleet Readiness & Fuel */}
                          <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-700/70 space-y-1">
                            <div className="flex items-center justify-between text-xs">
                              <span className="font-bold text-slate-700 dark:text-slate-200 flex items-center gap-1.5">
                                <span className="w-2 h-2 rounded-full bg-amber-500" />
                                {isTh ? 'ความพร้อมใช้งาน & เชื้อเพลิง (Readiness)' : 'Readiness & Fuel Level'}
                              </span>
                              <span className="font-mono font-black text-amber-600 dark:text-amber-400">{normReadiness}%</span>
                            </div>
                            <input
                              type="range"
                              min={5}
                              max={70}
                              step={5}
                              value={optimizerFactorConfig.readinessWeight}
                              onChange={e =>
                                setOptimizerFactorConfig(prev => ({
                                  ...prev,
                                  preset: 'custom',
                                  readinessWeight: Number(e.target.value)
                                }))
                              }
                              className="w-full accent-amber-600 cursor-pointer"
                            />
                            <p className="text-[10px] text-slate-400">
                              {isTh ? 'เน้นเครนสถานะ Available ทันที น้ำมัน ≥80% และความพร้อมสูงสุด' : 'Prioritizes immediate availability, fuel ≥80% & efficiency'}
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Right 6 Cols: Hard Engineering Thresholds & Simulation Rules */}
                      <div className="lg:col-span-6 bg-white dark:bg-slate-900 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-black text-slate-800 dark:text-slate-200 uppercase tracking-wider">
                            {isTh ? '3. เกณฑ์วิศวกรรมและเงื่อนไขการจำลอง (Safety & Constraint Gates)' : '3. Engineering Thresholds & Simulation Rules'}
                          </span>
                          <span className="text-[10px] font-mono font-bold text-emerald-600 dark:text-emerald-400">
                             Hard Gate Constraints
                          </span>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                          {/* Threshold 1: Min Safety Margin % */}
                          <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-700/70 space-y-1">
                            <div className="flex items-center justify-between text-xs">
                              <span className="font-bold text-slate-700 dark:text-slate-200">
                                {isTh ? 'Safety Margin ขั้นต่ำ' : 'Min Safety Margin'}
                              </span>
                              <span className="font-mono font-black text-emerald-600 dark:text-emerald-400">
                                ≥{optimizerFactorConfig.minSafetyMarginPct}%
                              </span>
                            </div>
                            <input
                              type="range"
                              min={15}
                              max={40}
                              step={1}
                              value={optimizerFactorConfig.minSafetyMarginPct}
                              onChange={e =>
                                setOptimizerFactorConfig(prev => ({
                                  ...prev,
                                  preset: 'custom',
                                  minSafetyMarginPct: Number(e.target.value)
                                }))
                              }
                              className="w-full accent-emerald-600 cursor-pointer"
                            />
                            <p className="text-[10px] text-slate-400">
                              {isTh ? 'มาตรฐานปกติ ≥20% (งานวิกฤต ≥30%)' : 'Standard ≥20% (Critical lift ≥30%)'}
                            </p>
                          </div>

                          {/* Threshold 2: Max GBP Ratio % */}
                          <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-700/70 space-y-1">
                            <div className="flex items-center justify-between text-xs">
                              <span className="font-bold text-slate-700 dark:text-slate-200">
                                {isTh ? 'เพดานแรงกดดิน GBP' : 'Max Soil GBP Ratio'}
                              </span>
                              <span className="font-mono font-black text-blue-600 dark:text-blue-400">
                                ≤{optimizerFactorConfig.maxGbpLimitRatioPct}%
                              </span>
                            </div>
                            <input
                              type="range"
                              min={70}
                              max={100}
                              step={5}
                              value={optimizerFactorConfig.maxGbpLimitRatioPct}
                              onChange={e =>
                                setOptimizerFactorConfig(prev => ({
                                  ...prev,
                                  preset: 'custom',
                                  maxGbpLimitRatioPct: Number(e.target.value)
                                }))
                              }
                              className="w-full accent-blue-600 cursor-pointer"
                            />
                            <p className="text-[10px] text-slate-400">
                              {isTh ? '% เทียบค่าดินรับได้ (220/260 kPa)' : '% of allowable site soil limit'}
                            </p>
                          </div>

                          {/* Threshold 3: Simulated Wind Speed */}
                          <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-700/70 space-y-1">
                            <div className="flex items-center justify-between text-xs">
                              <span className="font-bold text-slate-700 dark:text-slate-200">
                                {isTh ? 'ความเร็วลมจำลอง' : 'Forecast Wind'}
                              </span>
                              <span className={`font-mono font-black ${optimizerFactorConfig.simulatedWindKnots >= 20 ? 'text-amber-600' : 'text-cyan-600 dark:text-cyan-400'}`}>
                                {optimizerFactorConfig.simulatedWindKnots} kts
                              </span>
                            </div>
                            <input
                              type="range"
                              min={8}
                              max={28}
                              step={1}
                              value={optimizerFactorConfig.simulatedWindKnots}
                              onChange={e =>
                                setOptimizerFactorConfig(prev => ({
                                  ...prev,
                                  preset: 'custom',
                                  simulatedWindKnots: Number(e.target.value)
                                }))
                              }
                              className="w-full accent-cyan-600 cursor-pointer"
                            />
                            <p className="text-[10px] text-slate-400">
                              {isTh ? 'ตัดเครนบูมยาวที่ทนลมได้ต่ำกว่าเกณฑ์' : 'Filters out cranes below wind limit'}
                            </p>
                          </div>
                        </div>

                        {/* Operational Toggles & Scope */}
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1">
                          <label className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-700/70 flex items-start gap-2 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={optimizerFactorConfig.allowAutoTimeShift}
                              onChange={e =>
                                setOptimizerFactorConfig(prev => ({
                                  ...prev,
                                  preset: 'custom',
                                  allowAutoTimeShift: e.target.checked
                                }))
                              }
                              className="mt-0.5 rounded text-indigo-600 focus:ring-indigo-500"
                            />
                            <div className="text-[11px] leading-tight">
                              <span className="font-bold text-slate-800 dark:text-slate-200 block">
                                {isTh ? 'เลื่อนเวลาอัตโนมัติเมื่อคิวชน' : 'Auto-Shift Slot on Clash'}
                              </span>
                              <span className="text-[10px] text-slate-500">
                                {isTh ? 'หาช่วงเวลาว่างในวันเดียวกันให้อัตโนมัติ' : 'Finds nearest free slot on same day'}
                              </span>
                            </div>
                          </label>

                          <label className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-700/70 flex items-start gap-2 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={optimizerFactorConfig.preferSharedConsolidation}
                              onChange={e =>
                                setOptimizerFactorConfig(prev => ({
                                  ...prev,
                                  preset: 'custom',
                                  preferSharedConsolidation: e.target.checked
                                }))
                              }
                              className="mt-0.5 rounded text-indigo-600 focus:ring-indigo-500"
                            />
                            <div className="text-[11px] leading-tight">
                              <span className="font-bold text-slate-800 dark:text-slate-200 block">
                                {isTh ? 'โบนัสใช้เครนร่วมในโรงงานเดียวกัน' : 'Shared Mobilization Bonus'}
                              </span>
                              <span className="text-[10px] text-slate-500">
                                {isTh ? 'เพิ่มคะแนนเมื่อใช้เครนคันเดียวหลายงาน' : 'Boosts cranes already active on site'}
                              </span>
                            </div>
                          </label>

                          <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-700/70 space-y-1">
                            <span className="text-[10px] font-bold text-slate-500 uppercase block">
                              {isTh ? 'ขอบเขตใบงานที่นำมาจำลอง:' : 'Simulation Job Scope:'}
                            </span>
                            <select
                              value={optimizerFactorConfig.simulationScope}
                              onChange={e =>
                                setOptimizerFactorConfig(prev => ({
                                  ...prev,
                                  simulationScope: e.target.value as 'pending_only' | 'all_unlocked'
                                }))
                              }
                              className="w-full px-2 py-1 rounded bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-[11px] font-bold text-slate-800 dark:text-slate-200"
                            >
                              <option value="all_unlocked">
                                {isTh ? 'รอตรวจ + จับคู่แล้วที่ยังไม่ล็อกคิว' : 'Pending + Unlocked Optimized'}
                              </option>
                              <option value="pending_only">
                                {isTh ? 'เฉพาะสถานะ Pending Review เท่านั้น' : 'Pending Review Only'}
                              </option>
                            </select>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* =============================================================== */}
                {/* 4 LIVE SIMULATION SUMMARY KPI CARDS                             */}
                {/* =============================================================== */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="p-3 rounded-xl bg-indigo-50/70 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-800/80 flex items-center justify-between">
                    <div>
                      <span className="text-[10px] font-bold text-indigo-700 dark:text-indigo-300 uppercase tracking-wider block">
                        {isTh ? 'จับคู่ผ่านเกณฑ์สำเร็จ' : 'Eligible Matched Jobs'}
                      </span>
                      <span className="text-lg font-black text-indigo-900 dark:text-white font-mono">
                        {matchedItems.length} / {optimizerPreviewItems.length}
                      </span>
                    </div>
                    <CheckCircle size={18} className="text-indigo-600 dark:text-indigo-400" />
                  </div>

                  <div className="p-3 rounded-xl bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/80 flex items-center justify-between">
                    <div>
                      <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-300 uppercase tracking-wider block">
                        {isTh ? 'คะแนนความเหมาะสมเฉลี่ย' : 'Avg Weighted Score'}
                      </span>
                      <span className="text-lg font-black text-emerald-700 dark:text-emerald-300 font-mono">
                        {avgScore}%
                      </span>
                    </div>
                    <Gauge size={18} className="text-emerald-600 dark:text-emerald-400" />
                  </div>

                  <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 flex items-center justify-between">
                    <div>
                      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                        {isTh ? 'เกณฑ์ความปลอดภัยที่ใช้' : 'Active Safety Gate'}
                      </span>
                      <span className="text-xs font-black text-slate-800 dark:text-slate-200 font-mono">
                        Margin ≥{optimizerFactorConfig.minSafetyMarginPct}% · Wind {optimizerFactorConfig.simulatedWindKnots}kts
                      </span>
                    </div>
                    <ShieldCheck size={18} className="text-slate-600 dark:text-slate-400" />
                  </div>

                  <div className="p-3 rounded-xl bg-teal-50/70 dark:bg-teal-950/30 border border-teal-200 dark:border-teal-800/80 flex items-center justify-between">
                    <div>
                      <span className="text-[10px] font-bold text-teal-700 dark:text-teal-300 uppercase tracking-wider block">
                        {isTh ? 'ประหยัดงบประมาณรวม (จำลอง)' : 'Est. Batch Cost Saving'}
                      </span>
                      <span className="text-lg font-black text-teal-700 dark:text-teal-300 font-mono">
                        ฿{totalEstBatchSaving.toLocaleString()}
                      </span>
                    </div>
                    <TrendingDown size={18} className="text-teal-600 dark:text-teal-400" />
                  </div>
                </div>

                {/* =============================================================== */}
                {/* SIMULATION RESULTS TABLE                                        */}
                {/* =============================================================== */}
                <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 dark:bg-slate-800/80 text-slate-500 text-[11px] uppercase tracking-wider font-semibold border-b border-slate-200 dark:border-slate-800">
                      <tr>
                        <th className="p-3 w-10 text-center">{isTh ? 'เลือก' : 'Apply'}</th>
                        <th className="p-3">{isTh ? 'รหัสงาน / โรงงาน' : 'Job ID / Plant'}</th>
                        <th className="p-3">{isTh ? 'น้ำหนัก / รัศมี' : 'Load / Radius'}</th>
                        <th className="p-3">{isTh ? 'เครนที่ระบบแนะนำ (ปรับเลือกได้)' : 'Matched Crane (Editable)'}</th>
                        <th className="p-3">{isTh ? 'คะแนนรวม & สัดส่วน' : 'Weighted Score'}</th>
                        <th className="p-3">{isTh ? 'ประหยัดงบ' : 'Est. Saving'}</th>
                        <th className="p-3">{isTh ? 'เหตุผลการวิเคราะห์ตามตัวแปร' : 'Factor Analysis Rationale'}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {optimizerPreviewItems.map((item, idx) => {
                        const eligibleCranesForRow = equipment.filter(
                          c => getSuitabilityScore(c, item.job, optimizerFactorConfig).eligible
                        );
                        return (
                          <tr
                            key={item.job.id}
                            className={
                              item.selected
                                ? 'bg-indigo-50/30 dark:bg-indigo-950/15 hover:bg-indigo-50/50 dark:hover:bg-indigo-950/25'
                                : 'opacity-65 bg-slate-50/30 dark:bg-slate-900/40'
                            }
                          >
                            <td className="p-3 text-center">
                              <input
                                type="checkbox"
                                disabled={!item.recommendedCrane || item.safetyResult !== 'PASS'}
                                checked={item.selected}
                                onChange={e => {
                                  const val = e.target.checked;
                                  setOptimizerPreviewItems(prev =>
                                    prev.map((it, i) => (i === idx ? { ...it, selected: val } : it))
                                  );
                                }}
                                className="rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                              />
                            </td>
                            <td className="p-3">
                              <div className="font-mono font-bold text-slate-900 dark:text-white">{item.job.jobNo}</div>
                              <div className="text-[10px] text-slate-500">
                                {item.job.plant} · {item.job.date} ({item.shiftedSlot ? `${item.shiftedSlot.start}-${item.shiftedSlot.end}` : `${item.job.startTime}-${item.job.endTime}`})
                              </div>
                            </td>
                            <td className="p-3 font-mono">
                              <span className="font-bold text-slate-800 dark:text-slate-200">{item.job.loadWeightTon}T</span> / {item.job.requiredRadiusM}m
                              <div className="text-[10px] text-slate-400">{item.job.priority}</div>
                            </td>
                            <td className="p-3">
                              {item.recommendedCrane ? (
                                <div className="space-y-1">
                                  <select
                                    value={item.recommendedCrane.id}
                                    onChange={e => {
                                      const newCrane = equipment.find(c => c.id === e.target.value);
                                      if (!newCrane) return;
                                      const newSuit = getSuitabilityScore(newCrane, item.job, optimizerFactorConfig);
                                      setOptimizerPreviewItems(prev =>
                                        prev.map((it, i) =>
                                          i === idx
                                            ? {
                                                ...it,
                                                recommendedCrane: newCrane,
                                                score: newSuit.score,
                                                safetyMarginPct: newSuit.validation.safetyMarginPercent,
                                                gbpRatioPct: newSuit.gbpRatioPct,
                                                factorBreakdown: newSuit.factorBreakdown,
                                                selected: true
                                              }
                                            : it
                                        )
                                      );
                                    }}
                                    className="px-2 py-1 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-900 dark:text-white"
                                  >
                                    {eligibleCranesForRow.map(c => {
                                      const sc = getSuitabilityScore(c, item.job, optimizerFactorConfig);
                                      return (
                                        <option key={c.id} value={c.id}>
                                          {c.name} ({c.capacityTon}T) — {sc.score}%
                                        </option>
                                      );
                                    })}
                                  </select>
                                  {item.shiftedSlot && (
                                    <span className="inline-block px-1.5 py-0.5 rounded text-[9px] font-bold bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300">
                                      {isTh ? `เลื่อนเวลา: ${item.shiftedSlot.start}-${item.shiftedSlot.end}` : `Auto-Slot: ${item.shiftedSlot.start}-${item.shiftedSlot.end}`}
                                    </span>
                                  )}
                                </div>
                              ) : (
                                <span className="text-red-500 font-semibold">
                                  {isTh ? 'ไม่ผ่านเกณฑ์ที่ตั้งไว้' : 'No eligible crane'}
                                </span>
                              )}
                            </td>
                            <td className="p-3">
                              <div className="flex items-center gap-1.5">
                                <span
                                  className={`font-mono text-sm font-black ${
                                    item.score >= 85
                                      ? 'text-emerald-600 dark:text-emerald-400'
                                      : item.score > 0
                                        ? 'text-indigo-600 dark:text-indigo-400'
                                        : 'text-slate-400'
                                  }`}
                                >
                                  {item.score}%
                                </span>
                                {item.factorBreakdown && item.score > 0 && (
                                  <span className="text-[10px] font-mono text-slate-400">
                                    ({item.factorBreakdown.rightSizingPts}+{item.factorBreakdown.safetyPts}+{item.factorBreakdown.costPts}+{item.factorBreakdown.readinessPts})
                                  </span>
                                )}
                              </div>
                              {item.factorBreakdown && item.score > 0 && (
                                <div className="w-24 h-1.5 rounded-full overflow-hidden flex bg-slate-200 dark:bg-slate-700 mt-1">
                                  <div style={{ width: `${item.factorBreakdown.rightSizingPts}%` }} className="bg-indigo-500" />
                                  <div style={{ width: `${item.factorBreakdown.safetyPts}%` }} className="bg-emerald-500" />
                                  <div style={{ width: `${item.factorBreakdown.costPts}%` }} className="bg-teal-500" />
                                  <div style={{ width: `${item.factorBreakdown.readinessPts}%` }} className="bg-amber-500" />
                                </div>
                              )}
                            </td>
                            <td className="p-3 font-mono font-bold text-teal-600 dark:text-teal-400">
                              {item.estSavingThb && item.estSavingThb > 0 ? `฿${item.estSavingThb.toLocaleString()}` : '—'}
                            </td>
                            <td className="p-3 text-slate-600 dark:text-slate-400 text-[11px] max-w-xs">
                              {item.reason}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-3 text-xs text-slate-500">
                  <span>
                    {isTh
                      ? `เลือกยืนยัน ${selectedItems.length} จาก ${optimizerPreviewItems.length} รายการ`
                      : `Selected ${selectedItems.length} of ${optimizerPreviewItems.length} items`}
                  </span>
                  <button
                    type="button"
                    onClick={() => setOptimizerPreviewItems(computeAutoOptimizerPreview(optimizerFactorConfig))}
                    className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold flex items-center gap-1 cursor-pointer"
                  >
                    <RefreshCw size={12} />
                    <span>{isTh ? 'คำนวณจำลองใหม่ (Re-Run)' : 'Re-Run Simulation'}</span>
                  </button>
                </div>

                <div className="flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setShowOptimizerPreviewModal(false)}
                    className="px-4 py-2 text-xs font-bold text-slate-500 hover:text-slate-700 dark:hover:text-slate-200 cursor-pointer"
                  >
                    {isTh ? 'ยกเลิก' : 'Cancel'}
                  </button>
                  <button
                    type="button"
                    disabled={selectedItems.length === 0}
                    onClick={handleConfirmAutoOptimization}
                    className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-all shadow-md active:scale-95 cursor-pointer flex items-center gap-2"
                  >
                    <Sparkles size={14} />
                    <span>
                      {isTh
                        ? `ยืนยันผลจัดสรรจำลอง (${selectedItems.length} งาน)`
                        : `Apply Simulation (${selectedItems.length} Jobs)`}
                    </span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* ========================================================================= */}
      {/* MODAL 2: ASSIGN CONFIRMATION MODAL                                        */}
      {/* ========================================================================= */}
      {showAssignConfirmModal && effectiveCrane && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2 text-slate-900 dark:text-white">
                <Lock size={20} className="text-emerald-500" />
                <h3 className="text-base font-bold">
                  {isTh ? 'ยืนยันการจัดสรรและล็อกคิวเครน' : 'Confirm Crane Assignment & Lock'}
                </h3>
              </div>
              <button onClick={() => setShowAssignConfirmModal(false)} className="text-slate-400 hover:text-slate-600 p-1">
                <X size={18} />
              </button>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-400">
              {isTh
                ? 'ระบบจะทำการล็อกคิวรถเครนคันนี้ และ Synchronize ข้อมูลไปยังปฏิทิน Calendar, รายการคำขอ และผังยก Plot Plan โดยอัตโนมัติ'
                : 'Locks crane schedule and synchronizes data with Calendar, Request List, and Plot Plan.'}
            </p>

            <div className="p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-xl space-y-2 text-xs border border-slate-200 dark:border-slate-700">
              <div className="flex justify-between">
                <span className="text-slate-400">{isTh ? 'รหัสงาน:' : 'Job:'}</span>
                <span className="font-bold text-slate-900 dark:text-white font-mono">{selectedJob?.jobNo}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">{isTh ? 'รถเครน:' : 'Crane:'}</span>
                <span className="font-bold text-emerald-600 dark:text-emerald-400">{effectiveCrane.name} ({effectiveCrane.capacityTon}{isTh ? ' ตัน' : 'T'})</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">{isTh ? 'วัน-เวลา:' : 'Date & Slot:'}</span>
                <span className="font-mono text-slate-700 dark:text-slate-300">{selectedJob?.date} ({selectedJob?.startTime} - {selectedJob?.endTime})</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">{isTh ? 'ค่าความปลอดภัย:' : 'Safety Margin:'}</span>
                <span className="font-bold text-emerald-600">+{currentValidation.safetyMarginPercent}% ({isTh ? 'ผ่านเกณฑ์' : 'PASSED'})</span>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowAssignConfirmModal(false)}
                className="px-4 py-2 text-xs font-bold text-slate-500 hover:text-slate-700 dark:hover:text-slate-200 cursor-pointer"
              >
                {isTh ? 'ยกเลิก' : 'Cancel'}
              </button>
              <button
                type="button"
                onClick={handleConfirmAssignCrane}
                className="px-5 py-2.5 bg-slate-900 hover:bg-black dark:bg-white dark:hover:bg-slate-100 text-white dark:text-slate-900 rounded-xl text-xs font-bold transition-all shadow-md active:scale-95 cursor-pointer"
              >
                {isTh ? 'ยืนยันการจัดสรร' : 'Confirm Assignment'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 3: REJECT PLAN                                                      */}
      {/* ========================================================================= */}
      {showRejectModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2 text-red-600">
                <XCircle size={20} />
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  {isTh ? 'ปฏิเสธคำขอใช้งานเครน' : 'Reject Lifting Request'}
                </h3>
              </div>
              <button onClick={() => setShowRejectModal(false)} className="text-slate-400 hover:text-slate-600 p-1">
                <X size={18} />
              </button>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-400">
              {isTh
                ? `ระบุเหตุผลทางวิศวกรรม ความปลอดภัย หรือตารางเวลาสำหรับปฏิเสธคำขอ `
                : `Specify mandatory engineering, safety, or scheduling reason for rejecting `}
              <strong className="text-slate-900 dark:text-white font-mono">{selectedJob?.jobNo}</strong>.
            </p>

            {/* Quick preset reasons */}
            <div className="space-y-1.5">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                {isTh ? 'ข้อความแนะนำสำเร็จรูป:' : 'Quick Presets:'}
              </span>
              <div className="flex flex-wrap gap-1.5">
                {(isTh
                  ? [
                      'น้ำหนักยกเกินพิกัดความจุ Load Chart ณ รัศมีที่กำหนด / แรงกดขาช้างเกินขีดจำกัดของดิน',
                      'ยังไม่แนบแผนการยกที่มีลายเซ็นรับรองจากวิศวกร (PE) และผลทดสอบการบดอัดของดิน',
                      'รัศมีการทำงานทับซ้อนกับแนวเสาไฟฟ้าแรงสูง 115 kV (เสี่ยงต่อประกายไฟ)',
                      'พยากรณ์ความเร็วลมหน้างานเกินขีดจำกัดความปลอดภัยของบูมเครน',
                      'งานยกคู่ (Dual Lift) จำเป็นต้องมีผู้ควบคุมงานยกขั้น 3 (Level 3 Supervisor) ประจำหน้างาน'
                    ]
                  : [
                      'Exceeds crane safe load capacity / radius chart; outrigger ground pressure exceeds soil limit',
                      'Missing approved PE signed lifting plan & soil compaction test certification',
                      'Working radius interferes with energized 115kV overhead transmission corridor',
                      'Forecast wind gust exceeds operating limit for lattice boom extension',
                      'Dual crane tandem lift requires certified level-3 lifting supervisor on site'
                    ]
                ).map((reason, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setRejectReasonInput(reason)}
                    className="text-[11px] px-2.5 py-1 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 rounded-lg text-left transition-colors cursor-pointer"
                  >
                    {reason}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block mb-1">
                {isTh ? 'บันทึกเหตุผลการปฏิเสธอย่างเป็นทางการ *' : 'Formal Rejection Reason *'}
              </label>
              <textarea
                rows={3}
                value={rejectReasonInput}
                onChange={e => setRejectReasonInput(e.target.value)}
                placeholder={isTh ? 'ระบุเหตุผลและคำแนะนำสำหรับผู้รับเหมา...' : 'Enter formal reason for contractor...'}
                className="w-full p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-red-500"
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowRejectModal(false)}
                className="px-4 py-2 text-xs font-bold text-slate-500 hover:text-slate-700 dark:hover:text-slate-200 cursor-pointer"
              >
                {isTh ? 'ยกเลิก' : 'Cancel'}
              </button>
              <button
                type="button"
                disabled={!rejectReasonInput.trim()}
                onClick={handleConfirmReject}
                className="px-5 py-2 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-all shadow-md active:scale-95 cursor-pointer"
              >
                {isTh ? 'ยืนยันการปฏิเสธ' : 'Confirm Rejection'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 4: RETURN FOR REVISION                                              */}
      {/* ========================================================================= */}
      {showRevisionModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2 text-orange-600">
                <RotateCcw size={20} />
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  {isTh ? 'ส่งกลับให้แก้ไขแผนยก (Return for Revision)' : 'Return Plan for Revision'}
                </h3>
              </div>
              <button onClick={() => setShowRevisionModal(false)} className="text-slate-400 hover:text-slate-600 p-1">
                <X size={18} />
              </button>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-400">
              {isTh
                ? 'ส่งคำขอกลับไปยังผู้รับเหมาหรือผู้ยื่นคำขอเพื่อปรับปรุงข้อมูล โดยยังไม่ทำการ Reject คำขออย่างถาวร'
                : 'Send back to request owner for adjustments without rejecting permanently.'}
            </p>

            {/* Quick Presets for Revision */}
            <div className="space-y-1.5">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                {isTh ? 'คำแนะนำที่ต้องแก้ไข:' : 'Suggested Revision Items:'}
              </span>
              <div className="flex flex-wrap gap-1.5">
                {(isTh
                  ? [
                      'กรุณาคำนวณใหม่โดยขยายขนาดแผ่นรองขาช้าง (Outrigger Mats) ให้มีขนาดอย่างน้อย 2.0ม. x 2.0ม.',
                      'ปรับมุมสลิงยกให้มากกว่า 45 องศา เพื่อรักษาค่า Safety Factor ของแรงดึงสลิง',
                      'แนบสำเนาใบรับรองการตรวจทดสอบประจำปี (ปจ.2) ฉบับล่าสุดที่มีผลบังคับใช้',
                      'ปรับเปลี่ยนเวลาปฏิบัติงานเป็นช่วงเช้า เนื่องจากช่วงบ่ายมีพยากรณ์ลมกระโชกแรงเกินเกณฑ์'
                    ]
                  : [
                      'Please recalculate with larger outrigger mats (minimum 2.0m x 2.0m)',
                      'Update sling angle to exceed 45 degrees to maintain tensile safety factor',
                      'Provide updated crane annual inspection certificate (Phor Jor 2)',
                      'Adjust rigging schedule to morning hours due to high afternoon wind gusts'
                    ]
                ).map((item, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setRevisionNoteInput(item)}
                    className="text-[11px] px-2.5 py-1 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 rounded-lg text-left transition-colors cursor-pointer"
                  >
                    {item}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block mb-1">
                {isTh ? 'ระบุสิ่งที่ต้องแก้ไขสำหรับผู้รับเหมา *' : 'Revision Instructions for Contractor *'}
              </label>
              <textarea
                rows={3}
                value={revisionNoteInput}
                onChange={e => setRevisionNoteInput(e.target.value)}
                placeholder={isTh ? 'ระบุเอกสารหรือข้อมูลที่ต้องการให้แก้ไขเพิ่มเติม...' : 'Enter details of required modifications...'}
                className="w-full p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowRevisionModal(false)}
                className="px-4 py-2 text-xs font-bold text-slate-500 hover:text-slate-700 dark:hover:text-slate-200 cursor-pointer"
              >
                {isTh ? 'ยกเลิก' : 'Cancel'}
              </button>
              <button
                type="button"
                disabled={!revisionNoteInput.trim()}
                onClick={handleConfirmReturnForRevision}
                className="px-5 py-2 bg-orange-600 hover:bg-orange-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-all shadow-md active:scale-95 cursor-pointer"
              >
                {isTh ? 'ส่งกลับให้แก้ไข' : 'Send for Revision'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 5: REASSIGN CRANE MODAL (NEW)                                       */}
      {/* ========================================================================= */}
      {showReassignModal && selectedJob && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2 text-slate-900 dark:text-white">
                <ArrowLeftRight size={20} className="text-emerald-500" />
                <h3 className="text-base font-bold">
                  {isTh ? 'เปลี่ยนการจัดสรรเครน (Reassign Crane)' : 'Reassign Crane'}
                </h3>
              </div>
              <button onClick={() => setShowReassignModal(false)} className="text-slate-400 hover:text-slate-600 p-1">
                <X size={18} />
              </button>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-400">
              {isTh
                ? 'เลือกเครนคันใหม่ ปรับตารางเวลาหากจำเป็น และระบุเหตุผลในการเปลี่ยนแปลงเพื่อบันทึกประวัติ Audit Log'
                : 'Select replacement crane, adjust schedule if required, and enter justification.'}
            </p>

            <div className="space-y-3 text-xs">
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                  {isTh ? 'เลือกรถเครนคันใหม่ (Select Replacement Crane) *' : 'Select Replacement Crane *'}
                </label>
                <select
                  value={reassignTargetCraneId}
                  onChange={e => setReassignTargetCraneId(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold"
                >
                  <option value="">{isTh ? '-- เลือกรถเครน --' : '-- Select Crane --'}</option>
                  {equipment.map(crane => (
                    <option key={crane.id} value={crane.id}>
                      {crane.name} ({crane.capacityTon}T) - Status: {crane.status}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                    {isTh ? 'วันที่ (Date)' : 'Date'}
                  </label>
                  <input
                    type="date"
                    value={reassignNewDate}
                    onChange={e => setReassignNewDate(e.target.value)}
                    className="w-full px-2 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-mono"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                    {isTh ? 'เริ่ม (Start)' : 'Start'}
                  </label>
                  <input
                    type="time"
                    value={reassignNewStartTime}
                    onChange={e => setReassignNewStartTime(e.target.value)}
                    className="w-full px-2 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-mono"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                    {isTh ? 'สิ้นสุด (End)' : 'End'}
                  </label>
                  <input
                    type="time"
                    value={reassignNewEndTime}
                    onChange={e => setReassignNewEndTime(e.target.value)}
                    className="w-full px-2 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                  {isTh ? 'เหตุผลในการเปลี่ยนการจัดสรร (Reassignment Reason) *' : 'Reassignment Reason *'}
                </label>
                <textarea
                  rows={2}
                  value={reassignReasonInput}
                  onChange={e => setReassignReasonInput(e.target.value)}
                  placeholder={isTh ? 'ระบุสาเหตุ เช่น เครนเดิมขัดข้อง, ปรับสเกลหน้างาน...' : 'Enter reason for crane change...'}
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowReassignModal(false)}
                className="px-4 py-2 text-xs font-bold text-slate-500 hover:text-slate-700 cursor-pointer"
              >
                {isTh ? 'ยกเลิก' : 'Cancel'}
              </button>
              <button
                type="button"
                disabled={!reassignTargetCraneId || !reassignReasonInput.trim()}
                onClick={handleConfirmReassignCrane}
                className="px-5 py-2.5 bg-slate-900 hover:bg-black dark:bg-white dark:hover:bg-slate-100 text-white dark:text-slate-900 disabled:opacity-50 rounded-xl text-xs font-bold transition-all shadow-md cursor-pointer"
              >
                {isTh ? 'ยืนยันเปลี่ยนเครน' : 'Confirm Reassignment'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 6: UNLOCK ASSIGNMENT MODAL (NEW)                                    */}
      {/* ========================================================================= */}
      {/* ========================================================================= */}
      {/* MODAL: FREE CRANE SUGGESTIONS (double-booked crane)                       */}
      {/* ========================================================================= */}
      {showFreeCraneModal && selectedJob && (() => {
        const allRows = equipment.map(c => ({
          crane: c,
          suit: getSuitabilityScore(c, selectedJob),
          av: getCraneAvailability(c, selectedJob)
        }));
        const rows = allRows.filter(r => r.suit.eligible);
        const rejectedRows = allRows.filter(r => !r.suit.eligible);
        const freeNow = rows.filter(r => r.av.freeNow).sort((a, b) => b.suit.score - a.suit.score);
        const otherTime = rows.filter(r => !r.av.freeNow && r.av.slot).sort((a, b) => b.suit.score - a.suit.score);
        const targetCrane = equipment.find(c => c.id === freeCraneTargetId);
        const targetClash = targetCrane ? getCraneAvailability(targetCrane, selectedJob).clash : [];
        const targetCraneForReschedule = targetCrane || effectiveCrane || (rows.length > 0 ? rows[0].crane : undefined);
        const nextAvail = targetCraneForReschedule ? getNextAvailableDateForCrane(targetCraneForReschedule, selectedJob) : null;

        const currentCalYear = calendarViewYearMonth.year;
        const currentCalMonth = calendarViewYearMonth.month; // 0-indexed (0 = Jan, 8 = Sep)
        const daysInCurrentMonth = new Date(currentCalYear, currentCalMonth + 1, 0).getDate();
        const firstDayOfWeek = new Date(currentCalYear, currentCalMonth, 1).getDay();

        const activeSelectedDate = calendarCustomDate || (nextAvail ? nextAvail.date : selectedJob.date);
        const activeStartTime = calendarCustomStartTime || selectedJob.startTime || '08:00';
        const activeEndTime = calendarCustomEndTime || selectedJob.endTime || '12:00';

        const selectedDateBookings = targetCraneForReschedule ? jobs.filter(
          o => o.id !== selectedJob.id &&
               o.date === activeSelectedDate &&
               o.status !== 'Rejected' &&
               o.assignedCraneId === targetCraneForReschedule.id &&
               (o.status === 'Assigned' || o.status === 'Optimized')
        ) : [];

        const activeStartMin = timeToMin(activeStartTime);
        const activeEndMin = timeToMin(activeEndTime);
        const selectedSlotClashes = selectedDateBookings.filter(
          o => Math.max(activeStartMin, timeToMin(o.startTime || '08:00')) < Math.min(activeEndMin, timeToMin(o.endTime || '12:00'))
        );

        return (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-2xl w-full max-h-[88vh] overflow-y-auto p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4 animate-in zoom-in-95 duration-200">
              <div className="flex items-start justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                <div>
                  <div className="flex items-center gap-2 text-slate-900 dark:text-white">
                    <Truck size={20} className="text-amber-500" />
                    <h3 className="text-base font-bold">{isTh ? 'เครนที่ว่างแนะนำ' : 'Suggested Free Cranes'}</h3>
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    {selectedJob.jobNo} · {selectedJob.date} ({selectedJob.startTime} - {selectedJob.endTime}) · {selectedJob.loadWeightTon}T / {selectedJob.requiredRadiusM}m
                  </p>
                </div>
                <button type="button" onClick={() => setShowFreeCraneModal(false)} className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer">
                  <X size={18} />
                </button>
              </div>

              {targetCrane && targetClash.length > 0 && (
                <div className="p-3 rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 text-xs text-red-700 dark:text-red-300">
                  <strong>{targetCrane.name}</strong>{' '}
                  {isTh ? 'ถูกจองในเวลาซ้อนกับงานอื่น: ' : 'is already booked at an overlapping time by: '}
                  {targetClash.map(o => `${o.jobNo} (${o.startTime}-${o.endTime})`).join(', ')}
                </div>
              )}

              {rows.length === 0 && (
                <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-300 dark:border-amber-800 space-y-2">
                  <p className="text-xs font-bold text-amber-900 dark:text-amber-200">
                    {isTh
                      ? `ไม่มีเครนในฟลีตที่ผ่านเกณฑ์วิศวกรรมสำหรับงานนี้ (${selectedJob.loadWeightTon}T ที่รัศมี ${selectedJob.requiredRadiusM}m) — ปัญหาไม่ได้อยู่ที่เวลา จึงเลื่อนเวลาก็แก้ไม่ได้`
                      : `No crane in the fleet passes the engineering gate for this lift (${selectedJob.loadWeightTon}T at ${selectedJob.requiredRadiusM}m). This is not a scheduling problem, so rescheduling cannot fix it.`}
                  </p>
                  <p className="text-[11px] text-amber-800 dark:text-amber-300">
                    {isTh
                      ? 'แนวทาง: ส่งกลับให้ผู้ขอลดน้ำหนักยก/รัศมี หรือแบ่งการยก หรือจัดหาเครนขนาดใหญ่กว่าเข้าฟลีต'
                      : 'Options: return the request to reduce load/radius, split the lift, or bring a larger crane into the fleet.'}
                  </p>
                  <button
                    type="button"
                    onClick={() => { setShowFreeCraneModal(false); setShowRevisionModal(true); }}
                    className="px-3.5 py-2 rounded-lg bg-orange-600 hover:bg-orange-700 text-white text-xs font-bold cursor-pointer"
                  >
                    {isTh ? 'ส่งกลับแก้ไข' : 'Return for Revision'}
                  </button>
                </div>
              )}

              <div className="space-y-2">
                <h4 className="text-xs font-black uppercase tracking-wider text-emerald-700 dark:text-emerald-400 flex items-center gap-1.5">
                  <CheckCircle size={14} />
                  {isTh ? `ว่างในเวลาเดียวกัน (ใช้ได้ทันที) · ${freeNow.length}` : `Free at the same time (use now) · ${freeNow.length}`}
                </h4>
                {freeNow.length === 0 ? (
                  <p className="text-xs text-slate-400 italic px-1">{isTh ? 'ไม่มีเครนที่ผ่านเกณฑ์และว่างในเวลานี้' : 'No eligible crane is free at this time.'}</p>
                ) : freeNow.map(({ crane, suit }) => (
                  <div key={crane.id} className="p-3 rounded-xl border border-emerald-200 dark:border-emerald-900/60 bg-emerald-50/50 dark:bg-emerald-950/20 flex items-center justify-between gap-3">
                    <div className="text-xs space-y-0.5">
                      <div className="font-bold text-slate-900 dark:text-white">{crane.name}</div>
                      <div className="text-slate-500">{crane.capacityTon}T · {isTh ? 'บูม' : 'Boom'} {crane.boomLengthM}m · ฿{crane.hourlyRateThb.toLocaleString()}/{isTh ? 'ชม.' : 'hr'}</div>
                      <div className="text-emerald-700 dark:text-emerald-400 font-semibold">{isTh ? 'คะแนนความเหมาะสม' : 'Suitability'} {suit.score}%</div>
                    </div>
                    <button
                      type="button"
                      onClick={() => handlePickFreeCrane(crane)}
                      className="px-3.5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold cursor-pointer shrink-0"
                    >
                      {isTh ? 'เลือกเครนนี้' : 'Select Crane'}
                    </button>
                  </div>
                ))}
              </div>

              <div className="space-y-2">
                <h4 className="text-xs font-black uppercase tracking-wider text-blue-700 dark:text-blue-400 flex items-center gap-1.5">
                  <Calendar size={14} />
                  {isTh ? `ว่างในเวลาอื่น (วันเดียวกัน — ต้องเลื่อนเวลางาน) · ${otherTime.length}` : `Free at another time (same day — job will be rescheduled) · ${otherTime.length}`}
                </h4>
                {otherTime.length === 0 ? (
                  <p className="text-xs text-slate-400 italic px-1">{isTh ? 'ไม่พบช่วงเวลาว่างในวันนี้' : 'No free slot found on this date.'}</p>
                ) : otherTime.map(({ crane, suit, av }) => (
                  <div key={crane.id} className="p-3 rounded-xl border border-blue-200 dark:border-blue-900/60 bg-blue-50/50 dark:bg-blue-950/20 flex items-center justify-between gap-3">
                    <div className="text-xs space-y-0.5">
                      <div className="font-bold text-slate-900 dark:text-white">{crane.name}</div>
                      <div className="text-slate-500">{crane.capacityTon}T · {isTh ? 'คะแนน' : 'Score'} {suit.score}%</div>
                      <div className="text-blue-700 dark:text-blue-400 font-semibold">
                        {isTh ? 'ช่วงว่างใกล้เคียงที่สุด:' : 'Nearest free slot:'} {av.slot!.start} - {av.slot!.end}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRescheduleToFreeSlot(crane, av.slot!)}
                      className="px-3.5 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold cursor-pointer shrink-0"
                    >
                      {isTh ? 'เลื่อนเวลาและเลือก' : 'Reschedule & Select'}
                    </button>
                  </div>
                ))}
              </div>

              {/* SECTION: Reschedule to Another Date (When crane is free on next available date) */}
              {nextAvail && targetCraneForReschedule && (
                <div className="space-y-2">
                  <h4 className="text-xs font-black uppercase tracking-wider text-indigo-700 dark:text-indigo-400 flex items-center gap-1.5">
                    <Calendar size={14} />
                    {isTh
                      ? '1. แนะนำวันอื่นที่เครนคันนี้ว่าง (Reschedule to Another Date)'
                      : '1. Reschedule to Another Date (Recommended)'}
                  </h4>
                  <div className="p-4 rounded-xl border-2 border-indigo-200 dark:border-indigo-900/70 bg-gradient-to-br from-indigo-50/70 via-white to-purple-50/40 dark:from-indigo-950/30 dark:via-slate-900 dark:to-purple-950/20 shadow-xs space-y-3">
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900 dark:text-white text-xs">
                          {targetCraneForReschedule.name}
                        </span>
                        <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-800 dark:bg-indigo-900/60 dark:text-indigo-200">
                          {targetCraneForReschedule.capacityTon}T
                        </span>
                        <span className="text-[10px] font-bold text-slate-500">
                          {isTh ? 'บูม' : 'Boom'} {targetCraneForReschedule.boomLengthM}m
                        </span>
                      </div>
                      <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed font-medium">
                        {isTh
                          ? `ในวันที่ ${selectedJob.date} เครนถูกจองเต็มตลอดวัน แต่พบช่วงว่างใน ${nextAvail.diffDays === 1 ? 'วันถัดไป ' : ''}${nextAvail.date} (${nextAvail.slot.start} - ${nextAvail.slot.end})`
                          : `On ${selectedJob.date} the crane is fully booked all day, but is available on ${nextAvail.diffDays === 1 ? 'the next day ' : ''}${nextAvail.date} (${nextAvail.slot.start} - ${nextAvail.slot.end})`}
                      </p>
                    </div>

                    <div className="pt-2 border-t border-indigo-100 dark:border-indigo-900/40 flex items-center justify-between gap-2 flex-wrap">
                      <div className="text-[11px] text-slate-500 dark:text-slate-400">
                        {isTh ? 'ช่วงเวลาว่างแนะนำ:' : 'Recommended slot:'}{' '}
                        <strong className="text-indigo-700 dark:text-indigo-300">
                          {nextAvail.slot.start} - {nextAvail.slot.end}
                        </strong>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setShowCraneCalendar(!showCraneCalendar);
                            if (!calendarCustomDate) {
                              setCalendarCustomDate(nextAvail.date);
                            }
                          }}
                          className={`px-3 py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer flex items-center gap-1.5 ${
                            showCraneCalendar
                              ? 'bg-indigo-100 dark:bg-indigo-900/60 border-indigo-300 dark:border-indigo-700 text-indigo-800 dark:text-indigo-200'
                              : 'bg-white dark:bg-slate-800 border-indigo-200 dark:border-indigo-800 hover:bg-indigo-50 dark:hover:bg-slate-700 text-indigo-700 dark:text-indigo-300'
                          }`}
                        >
                          <Calendar size={13} />
                          <span>
                            {showCraneCalendar
                              ? (isTh ? 'ซ่อนตารางปฏิทิน' : 'Hide Calendar')
                              : (isTh ? 'ดูตาราง Calendar ของเครนนี้' : 'View Crane Calendar')}
                          </span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleRescheduleToAnotherDate(targetCraneForReschedule, nextAvail.date, nextAvail.slot)}
                          className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-xs hover:shadow transition-all cursor-pointer flex items-center gap-1.5 shrink-0"
                        >
                          <Calendar size={13} />
                          <span>
                            {isTh
                              ? `เลื่อนวันเป็น ${formatThaiDateShort(nextAvail.date)} และจองคิว`
                              : `Reschedule to ${formatEngDateShort(nextAvail.date)} & Book`}
                          </span>
                        </button>
                      </div>
                    </div>

                    {/* Collapsible Crane Calendar View */}
                    {showCraneCalendar && (
                      <div className="mt-3 pt-3 border-t border-indigo-200/80 dark:border-indigo-900/60 space-y-3 animate-in fade-in-50 duration-200">
                        {/* Month navigation header */}
                        <div className="flex items-center justify-between bg-white/80 dark:bg-slate-900/80 p-2.5 rounded-xl border border-indigo-100 dark:border-indigo-900/40">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                              {isTh
                                ? `ตารางคิวงาน: ${targetCraneForReschedule.name}`
                                : `Schedule: ${targetCraneForReschedule.name}`}
                            </span>
                            <span className="text-[10px] text-indigo-700 dark:text-indigo-400 font-bold bg-indigo-50 dark:bg-indigo-950/60 px-2 py-0.5 rounded-md border border-indigo-200 dark:border-indigo-800">
                              {isTh ? `${THAI_MONTHS_FULL[currentCalMonth]} ${currentCalYear}` : `${ENG_MONTHS_FULL[currentCalMonth]} ${currentCalYear}`}
                            </span>
                          </div>
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => {
                                setCalendarViewYearMonth(prev => {
                                  const newM = prev.month - 1;
                                  return newM < 0 ? { year: prev.year - 1, month: 11 } : { year: prev.year, month: newM };
                                });
                              }}
                              className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 cursor-pointer"
                              title={isTh ? 'เดือนก่อนหน้า' : 'Previous month'}
                            >
                              <ChevronLeft size={16} />
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setCalendarViewYearMonth(prev => {
                                  const newM = prev.month + 1;
                                  return newM > 11 ? { year: prev.year + 1, month: 0 } : { year: prev.year, month: newM };
                                });
                              }}
                              className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 cursor-pointer"
                              title={isTh ? 'เดือนถัดไป' : 'Next month'}
                            >
                              <ChevronRight size={16} />
                            </button>
                          </div>
                        </div>

                        {/* Calendar Grid */}
                        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-2.5">
                          {/* Day headers */}
                          <div className="grid grid-cols-7 gap-1 mb-1 text-center">
                            {(isTh ? ['อา', 'จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส'] : ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']).map((dn, idx) => (
                              <div key={idx} className={`text-[10px] font-bold py-1 ${idx === 0 || idx === 6 ? 'text-rose-500' : 'text-slate-500 dark:text-slate-400'}`}>
                                {dn}
                              </div>
                            ))}
                          </div>

                          {/* Day cells */}
                          <div className="grid grid-cols-7 gap-1">
                            {/* Empty padding before day 1 */}
                            {Array.from({ length: firstDayOfWeek }).map((_, idx) => (
                              <div key={`pad-${idx}`} className="h-14 rounded-lg bg-slate-50/40 dark:bg-slate-800/20 border border-transparent" />
                            ))}

                            {/* Days in month */}
                            {Array.from({ length: daysInCurrentMonth }).map((_, idx) => {
                              const dayNum = idx + 1;
                              const dateStr = `${currentCalYear}-${String(currentCalMonth + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
                              const dBookings = jobs.filter(
                                o => o.id !== selectedJob.id &&
                                     o.date === dateStr &&
                                     o.status !== 'Rejected' &&
                                     o.assignedCraneId === targetCraneForReschedule.id &&
                                     (o.status === 'Assigned' || o.status === 'Optimized')
                              );
                              const isFree = dBookings.length === 0;
                              const isSelected = dateStr === activeSelectedDate;
                              const isOriginal = dateStr === selectedJob.date;
                              const isRec = nextAvail && dateStr === nextAvail.date;

                              return (
                                <button
                                  key={dateStr}
                                  type="button"
                                  onClick={() => setCalendarCustomDate(dateStr)}
                                  className={`h-14 p-1 rounded-lg border text-left flex flex-col justify-between transition-all cursor-pointer relative ${
                                    isSelected
                                      ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-950/70 ring-2 ring-indigo-500 shadow-xs'
                                      : isOriginal
                                        ? 'border-amber-400 bg-amber-50/60 dark:bg-amber-950/30 hover:border-amber-500'
                                        : isRec
                                          ? 'border-indigo-300 bg-indigo-50/40 dark:bg-indigo-950/30 hover:border-indigo-500'
                                          : isFree
                                            ? 'border-emerald-200 dark:border-emerald-900/60 bg-emerald-50/30 dark:bg-emerald-950/20 hover:border-emerald-400'
                                            : 'border-red-200 dark:border-red-900/60 bg-red-50/30 dark:bg-red-950/20 hover:border-red-400'
                                  }`}
                                >
                                  <div className="flex items-center justify-between w-full">
                                    <span className={`text-xs font-bold ${isSelected ? 'text-indigo-700 dark:text-indigo-300' : 'text-slate-800 dark:text-slate-200'}`}>
                                      {dayNum}
                                    </span>
                                    {isOriginal && (
                                      <span className="text-[8px] font-extrabold px-1 py-0.2 rounded bg-amber-200 dark:bg-amber-800 text-amber-900 dark:text-amber-100">
                                        {isTh ? 'งานนี้' : 'Current'}
                                      </span>
                                    )}
                                    {isRec && !isOriginal && (
                                      <span className="text-[8px] font-extrabold px-1 py-0.2 rounded bg-indigo-200 dark:bg-indigo-800 text-indigo-900 dark:text-indigo-100">
                                        {isTh ? 'แนะนำ' : 'Rec'}
                                      </span>
                                    )}
                                  </div>

                                  <div className="w-full">
                                    {isFree ? (
                                      <span className="text-[9px] font-semibold text-emerald-700 dark:text-emerald-400 flex items-center gap-0.5">
                                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                        {isTh ? 'ว่างทั้งวัน' : 'Free'}
                                      </span>
                                    ) : (
                                      <span className="text-[9px] font-semibold text-red-600 dark:text-red-400 flex items-center gap-0.5 truncate" title={dBookings.map(b => `${b.jobNo} (${b.startTime}-${b.endTime})`).join(', ')}>
                                        <span className="w-1.5 h-1.5 rounded-full bg-red-500 shrink-0" />
                                        {dBookings.length} {isTh ? 'งาน' : 'jobs'}
                                      </span>
                                    )}
                                  </div>
                                </button>
                              );
                            })}
                          </div>

                          {/* Legend */}
                          <div className="mt-2.5 pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-3 text-[10px] text-slate-500">
                            <span className="flex items-center gap-1">
                              <span className="w-2 h-2 rounded-full bg-emerald-500" /> {isTh ? 'ว่าง' : 'Free'}
                            </span>
                            <span className="flex items-center gap-1">
                              <span className="w-2 h-2 rounded-full bg-red-500" /> {isTh ? 'ติดจอง' : 'Booked'}
                            </span>
                            <span className="flex items-center gap-1">
                              <span className="w-2 h-2 rounded-full bg-indigo-500" /> {isTh ? 'วันที่เลือก' : 'Selected'}
                            </span>
                          </div>
                        </div>

                        {/* Inspector & Booking Box for activeSelectedDate */}
                        <div className="p-3.5 rounded-xl bg-white dark:bg-slate-900 border-2 border-indigo-300 dark:border-indigo-800 space-y-3">
                          <div className="flex items-start justify-between gap-2 flex-wrap">
                            <div>
                              <div className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                                <Calendar size={13} className="text-indigo-600" />
                                <span>{isTh ? 'วันที่เลือก:' : 'Selected Date:'} {formatThaiDateFull(activeSelectedDate)}</span>
                              </div>
                              <p className="text-[11px] text-slate-500 mt-0.5">
                                {targetCraneForReschedule.name} ({targetCraneForReschedule.capacityTon}T)
                              </p>
                            </div>
                            <div className="text-right">
                              {selectedDateBookings.length === 0 ? (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 text-[11px] font-bold">
                                  <CheckCircle size={12} />
                                  {isTh ? 'เครนว่างตลอดวัน (0 งาน)' : 'Free all day (0 jobs)'}
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-red-100 dark:bg-red-950/60 text-red-800 dark:text-red-300 text-[11px] font-bold">
                                  <AlertCircle size={12} />
                                  {isTh ? `มีคิวงานแล้ว ${selectedDateBookings.length} งาน` : `${selectedDateBookings.length} bookings`}
                                </span>
                              )}
                            </div>
                          </div>

                          {/* List of existing bookings on this date */}
                          {selectedDateBookings.length > 0 && (
                            <div className="p-2 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-1">
                              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                                {isTh ? 'รายการคิวงานของเครนในวันนี้:' : 'Existing bookings on this date:'}
                              </span>
                              <div className="flex flex-wrap gap-1.5 pt-0.5">
                                {selectedDateBookings.map(b => (
                                  <span key={b.id} className="text-[10px] px-2 py-0.5 rounded bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-900 font-medium">
                                    {b.jobNo} ({b.startTime || '08:00'} - {b.endTime || '12:00'})
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Time Slot Selection */}
                          <div className="space-y-1.5 pt-1">
                            <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                              <Clock size={12} className="text-slate-500" />
                              <span>{isTh ? 'กำหนดช่วงเวลาทำงานที่ต้องการจองคิว:' : 'Set Working Time Slot:'}</span>
                            </label>
                            <div className="flex items-center gap-2 flex-wrap">
                              <div className="flex items-center gap-1 text-xs">
                                <input
                                  type="time"
                                  value={activeStartTime}
                                  onChange={e => setCalendarCustomStartTime(e.target.value)}
                                  className="px-2 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-semibold text-slate-900 dark:text-white"
                                />
                                <span className="text-slate-400">-</span>
                                <input
                                  type="time"
                                  value={activeEndTime}
                                  onChange={e => setCalendarCustomEndTime(e.target.value)}
                                  className="px-2 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-semibold text-slate-900 dark:text-white"
                                />
                              </div>

                              {/* Presets */}
                              <div className="flex items-center gap-1">
                                <button
                                  type="button"
                                  onClick={() => { setCalendarCustomStartTime('08:00'); setCalendarCustomEndTime('12:00'); }}
                                  className="px-2 py-1 rounded-md text-[10px] font-bold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 cursor-pointer"
                                >
                                  08:00-12:00
                                </button>
                                <button
                                  type="button"
                                  onClick={() => { setCalendarCustomStartTime('13:00'); setCalendarCustomEndTime('17:00'); }}
                                  className="px-2 py-1 rounded-md text-[10px] font-bold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 cursor-pointer"
                                >
                                  13:00-17:00
                                </button>
                                <button
                                  type="button"
                                  onClick={() => { setCalendarCustomStartTime('08:00'); setCalendarCustomEndTime('17:00'); }}
                                  className="px-2 py-1 rounded-md text-[10px] font-bold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 cursor-pointer"
                                >
                                  {isTh ? 'เต็มวัน' : 'All day'}
                                </button>
                              </div>
                            </div>
                          </div>

                          {/* Conflict validation feedback & Final booking button */}
                          <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-3 flex-wrap">
                            <div className="text-xs">
                              {selectedSlotClashes.length > 0 ? (
                                <span className="text-red-600 dark:text-red-400 font-bold flex items-center gap-1">
                                  <AlertCircle size={13} />
                                  {isTh
                                    ? `เวลาชนกับ: ${selectedSlotClashes.map(c => c.jobNo).join(', ')}`
                                    : `Clashes with: ${selectedSlotClashes.map(c => c.jobNo).join(', ')}`}
                                </span>
                              ) : (
                                <span className="text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1">
                                  <CheckCircle size={13} />
                                  {isTh ? `ว่างในช่วงเวลา ${activeStartTime} - ${activeEndTime}` : `Free during ${activeStartTime} - ${activeEndTime}`}
                                </span>
                              )}
                            </div>

                            <button
                              type="button"
                              disabled={selectedSlotClashes.length > 0}
                              onClick={() => handleRescheduleToAnotherDate(targetCraneForReschedule, activeSelectedDate, { start: activeStartTime, end: activeEndTime })}
                              className={`px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all ${
                                selectedSlotClashes.length > 0
                                  ? 'bg-slate-200 dark:bg-slate-800 text-slate-400 cursor-not-allowed'
                                  : 'bg-indigo-600 hover:bg-indigo-700 text-white cursor-pointer hover:shadow-md'
                              }`}
                            >
                              <Calendar size={13} />
                              <span>
                                {isTh
                                  ? `เลื่อนวันเป็น ${formatThaiDateShort(activeSelectedDate)} (${activeStartTime} - ${activeEndTime}) และจองคิว`
                                  : `Book ${formatEngDateShort(activeSelectedDate)} (${activeStartTime} - ${activeEndTime})`}
                              </span>
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {rejectedRows.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-xs font-black uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                    <X size={14} />
                    {isTh ? `ไม่ผ่านเกณฑ์วิศวกรรม (ใช้ไม่ได้) · ${rejectedRows.length}` : `Not eligible (failed engineering gate) · ${rejectedRows.length}`}
                  </h4>
                  {rejectedRows.map(({ crane, suit }) => (
                    <div key={crane.id} className="p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/40 text-xs flex items-center justify-between gap-3">
                      <div className="space-y-0.5">
                        <div className="font-bold text-slate-800 dark:text-slate-200">{crane.name}</div>
                        <div className="text-red-600 dark:text-red-400">
                          {suit.validation.loadChartCapacityTon > 0
                            ? (isTh
                              ? `รับได้ ${suit.validation.loadChartCapacityTon}T ที่รัศมี ${selectedJob.requiredRadiusM}m (งานต้องการ ${selectedJob.loadWeightTon}T)`
                              : `Capacity ${suit.validation.loadChartCapacityTon}T at ${selectedJob.requiredRadiusM}m (job needs ${selectedJob.loadWeightTon}T)`)
                            : suit.label}
                        </div>
                      </div>
                      <span className="text-[10px] font-bold text-slate-500 shrink-0">{suit.label}</span>
                    </div>
                  ))}
                </div>
              )}

              <div className="flex justify-end pt-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowFreeCraneModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                >
                  {isTh ? 'ปิด' : 'Close'}
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {showUnlockModal && selectedJob && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2 text-slate-900 dark:text-white">
                <Unlock size={20} className="text-amber-500" />
                <h3 className="text-base font-bold">
                  {isTh ? 'ปลดล็อกการจัดสรรเครน (Unlock Assignment)' : 'Unlock Crane Assignment'}
                </h3>
              </div>
              <button onClick={() => setShowUnlockModal(false)} className="text-slate-400 hover:text-slate-600 p-1">
                <X size={18} />
              </button>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-400">
              {isTh
                ? 'การปลดล็อกจะเปลี่ยนสถานะกลับเป็น Optimized และเปิดให้สามารถปรับแก้สเปก พิกัด หรือเปลี่ยนรถเครนได้'
                : 'Unlocking returns status to Optimized and allows modifications to specs, coords, and crane assignment.'}
            </p>

            <div>
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                {isTh ? 'เหตุผลการปลดล็อก (Unlock Reason) *' : 'Unlock Reason *'}
              </label>
              <textarea
                rows={3}
                value={unlockReasonInput}
                onChange={e => setUnlockReasonInput(e.target.value)}
                placeholder={isTh ? 'ระบุเหตุผลในการปลดล็อกแผน...' : 'Enter reason for unlocking assignment...'}
                className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs"
              />
            </div>

            <div className="flex items-center justify-between pt-1 text-[10px] text-slate-400">
              <span>Unlocked By: <strong>{currentReviewer.split('(')[0].trim()}</strong></span>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowUnlockModal(false)}
                className="px-4 py-2 text-xs font-bold text-slate-500 hover:text-slate-700 cursor-pointer"
              >
                {isTh ? 'ยกเลิก' : 'Cancel'}
              </button>
              <button
                type="button"
                disabled={!unlockReasonInput.trim()}
                onClick={handleConfirmUnlockAssignment}
                className="px-5 py-2.5 bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-all shadow-md cursor-pointer"
              >
                {isTh ? 'ยืนยันปลดล็อก' : 'Confirm Unlock'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 7: AUDIT TRAIL & HISTORY MODAL (WIDE ENTERPRISE TABLE)              */}
      {/* ========================================================================= */}
      {showAuditLogModal && (() => {
        const allLogs = getCraneAuditLogs();
        const assignCount = allLogs.filter(l => l.action.toLowerCase().includes('assign') && !l.action.toLowerCase().includes('reassign') && !l.action.toLowerCase().includes('reschedule')).length;
        const rescheduleCount = allLogs.filter(l => l.action.toLowerCase().includes('reschedule')).length;
        const unlockCount = allLogs.filter(l => l.action.toLowerCase().includes('unlock')).length;
        const reassignCount = allLogs.filter(l => l.action.toLowerCase().includes('reassign')).length;
        const revisionCount = allLogs.filter(l => l.action.toLowerCase().includes('revision') || l.action.toLowerCase().includes('reject')).length;

        const filteredLogs = allLogs.filter(log => {
          const q = auditLogSearch.trim().toLowerCase();
          const matchesSearch = !q ||
            (log.jobNo && log.jobNo.toLowerCase().includes(q)) ||
            (log.user && log.user.toLowerCase().includes(q)) ||
            (log.role && log.role.toLowerCase().includes(q)) ||
            (log.reason && log.reason.toLowerCase().includes(q)) ||
            (log.action && log.action.toLowerCase().includes(q)) ||
            (log.previousValue && log.previousValue.toLowerCase().includes(q)) ||
            (log.newValue && log.newValue.toLowerCase().includes(q));

          const act = log.action.toLowerCase();
          const matchesAction = auditLogFilterAction === 'ALL' ||
            (auditLogFilterAction === 'Assign' && act.includes('assign') && !act.includes('reassign') && !act.includes('reschedule')) ||
            (auditLogFilterAction === 'Reschedule' && act.includes('reschedule')) ||
            (auditLogFilterAction === 'Unlock' && act.includes('unlock')) ||
            (auditLogFilterAction === 'Reassign' && act.includes('reassign')) ||
            (auditLogFilterAction === 'Revision' && (act.includes('revision') || act.includes('reject')));

          return matchesSearch && matchesAction;
        });

        const handleExportAuditLogsCSV = () => {
          if (filteredLogs.length === 0) return;
          const headers = ['Timestamp', 'Job No', 'Action', 'User', 'Role', 'Previous Value', 'New Value', 'Reason'];
          const rows = filteredLogs.map(l => [
            `"${l.timestamp}"`,
            `"${l.jobNo || ''}"`,
            `"${l.action || ''}"`,
            `"${l.user || ''}"`,
            `"${l.role || ''}"`,
            `"${(l.previousValue || '').replace(/"/g, '""')}"`,
            `"${(l.newValue || '').replace(/"/g, '""')}"`,
            `"${(l.reason || '').replace(/"/g, '""')}"`
          ]);
          const csvContent = '\uFEFF' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
          const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
          const url = URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          link.setAttribute('download', `crane_audit_trail_${new Date().toISOString().slice(0, 10)}.csv`);
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          URL.revokeObjectURL(url);
          showToast(isTh ? 'ส่งออกไฟล์ Audit Log CSV เรียบร้อยแล้ว' : 'Exported Audit Log CSV successfully', 'success');
        };

        const getActionBadge = (action: string) => {
          const act = action.toLowerCase();
          if (act.includes('reschedule')) {
            return 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950/60 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800';
          }
          if (act.includes('unlock')) {
            return 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border-amber-200 dark:border-amber-800';
          }
          if (act.includes('reassign')) {
            return 'bg-sky-100 text-sky-800 dark:bg-sky-950/60 dark:text-sky-300 border-sky-200 dark:border-sky-800';
          }
          if (act.includes('reject') || act.includes('revision')) {
            return 'bg-red-100 text-red-800 dark:bg-red-950/60 dark:text-red-300 border-red-200 dark:border-red-800';
          }
          return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800';
        };

        return (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-5xl w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4 max-h-[90vh] flex flex-col animate-in zoom-in-95 duration-200">
              {/* Header */}
              <div className="flex items-start justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                <div className="space-y-1">
                  <div className="flex items-center gap-2.5 text-slate-900 dark:text-white">
                    <div className="w-8 h-8 rounded-xl bg-emerald-100 dark:bg-emerald-950/60 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                      <History size={18} />
                    </div>
                    <div>
                      <h3 className="text-base font-bold">
                        {isTh ? 'บันทึกประวัติการตรวจสอบและการดำเนินการ (System Audit Trail)' : 'System Audit Trail & Operations History'}
                      </h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        {isTh
                          ? 'ประวัติบันทึกการกระทำ การจัดสรรเครน เลื่อนวันเวลา ปลดล็อก และแก้ไขใบงานตามมาตรฐานความปลอดภัย'
                          : 'Immutable audit log tracking all engineering reviews, assignments, reassignments, reschedules, and revisions.'}
                      </p>
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowAuditLogModal(false)}
                  className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Stat Summary Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-6 gap-2">
                <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                  <span className="text-[10px] text-slate-500 font-semibold block">{isTh ? 'ทั้งหมด' : 'Total Logs'}</span>
                  <span className="text-sm font-black text-slate-800 dark:text-slate-200">{allLogs.length}</span>
                </div>
                <div className="p-2.5 rounded-xl bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800">
                  <span className="text-[10px] text-emerald-700 dark:text-emerald-400 font-semibold block">{isTh ? 'จัดสรรเครน' : 'Assign'}</span>
                  <span className="text-sm font-black text-emerald-800 dark:text-emerald-200">{assignCount}</span>
                </div>
                <div className="p-2.5 rounded-xl bg-indigo-50/70 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-800">
                  <span className="text-[10px] text-indigo-700 dark:text-indigo-400 font-semibold block">{isTh ? 'เลื่อนวัน/เวลา' : 'Reschedule'}</span>
                  <span className="text-sm font-black text-indigo-800 dark:text-indigo-200">{rescheduleCount}</span>
                </div>
                <div className="p-2.5 rounded-xl bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800">
                  <span className="text-[10px] text-amber-700 dark:text-amber-400 font-semibold block">{isTh ? 'ปลดล็อก' : 'Unlock'}</span>
                  <span className="text-sm font-black text-amber-800 dark:text-amber-200">{unlockCount}</span>
                </div>
                <div className="p-2.5 rounded-xl bg-sky-50/70 dark:bg-sky-950/30 border border-sky-200 dark:border-sky-800">
                  <span className="text-[10px] text-sky-700 dark:text-sky-400 font-semibold block">{isTh ? 'เปลี่ยนเครน' : 'Reassign'}</span>
                  <span className="text-sm font-black text-sky-800 dark:text-sky-200">{reassignCount}</span>
                </div>
                <div className="p-2.5 rounded-xl bg-red-50/70 dark:bg-red-950/30 border border-red-200 dark:border-red-800">
                  <span className="text-[10px] text-red-700 dark:text-red-400 font-semibold block">{isTh ? 'ส่งกลับ/ปฏิเสธ' : 'Revision/Reject'}</span>
                  <span className="text-sm font-black text-red-800 dark:text-red-200">{revisionCount}</span>
                </div>
              </div>

              {/* Filter & Search Toolbar */}
              <div className="flex items-center justify-between gap-3 flex-wrap pt-1">
                {/* Search */}
                <div className="relative flex-1 min-w-[220px]">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={auditLogSearch}
                    onChange={e => setAuditLogSearch(e.target.value)}
                    placeholder={isTh ? 'ค้นหา Job No, ชื่อวิศวกร, หมายเหตุ, รายละเอียด...' : 'Search by Job No, user, notes...'}
                    className="w-full pl-9 pr-8 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-800 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                  />
                  {auditLogSearch && (
                    <button
                      type="button"
                      onClick={() => setAuditLogSearch('')}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 cursor-pointer"
                    >
                      <X size={13} />
                    </button>
                  )}
                </div>

                {/* Action Filter Pills */}
                <div className="flex items-center gap-1 overflow-x-auto text-[11px] font-bold">
                  {[
                    { id: 'ALL', label: isTh ? 'ทั้งหมด' : 'All' },
                    { id: 'Assign', label: isTh ? 'จัดสรร' : 'Assign' },
                    { id: 'Reschedule', label: isTh ? 'เลื่อนวัน/เวลา' : 'Reschedule' },
                    { id: 'Unlock', label: isTh ? 'ปลดล็อก' : 'Unlock' },
                    { id: 'Reassign', label: isTh ? 'เปลี่ยนเครน' : 'Reassign' },
                    { id: 'Revision', label: isTh ? 'ส่งกลับ/ปฏิเสธ' : 'Revision' },
                  ].map(tab => (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setAuditLogFilterAction(tab.id)}
                      className={`px-2.5 py-1.5 rounded-lg transition-all cursor-pointer whitespace-nowrap ${
                        auditLogFilterAction === tab.id
                          ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-xs'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>

                {/* CSV Export Button */}
                <button
                  type="button"
                  onClick={handleExportAuditLogsCSV}
                  disabled={filteredLogs.length === 0}
                  className="px-3.5 py-2 rounded-xl text-xs font-bold bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:hover:bg-emerald-900/50 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs shrink-0 disabled:opacity-50"
                  title={isTh ? 'ดาวน์โหลดประวัติเป็นไฟล์ CSV' : 'Export logs to CSV file'}
                >
                  <Download size={13} />
                  <span>{isTh ? 'ส่งออก CSV' : 'Export CSV'}</span>
                </button>
              </div>

              {/* Table Ledger Container */}
              <div className="flex-1 overflow-y-auto border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-900/50">
                {filteredLogs.length === 0 ? (
                  <div className="p-12 text-center text-slate-400 text-xs space-y-2">
                    <History size={28} className="mx-auto text-slate-300 dark:text-slate-600" />
                    <p>{isTh ? 'ไม่พบรายการประวัติตามเงื่อนไขที่เลือก' : 'No audit records match the current filter.'}</p>
                    {auditLogSearch && (
                      <button
                        type="button"
                        onClick={() => { setAuditLogSearch(''); setAuditLogFilterAction('ALL'); }}
                        className="text-emerald-600 dark:text-emerald-400 font-bold hover:underline cursor-pointer"
                      >
                        {isTh ? 'ล้างตัวกรอง' : 'Clear filters'}
                      </button>
                    )}
                  </div>
                ) : (
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="bg-slate-50 dark:bg-slate-800/80 sticky top-0 z-10 border-b border-slate-200 dark:border-slate-800 text-[11px] font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider">
                      <tr>
                        <th className="py-2.5 px-3">{isTh ? 'วัน-เวลา' : 'Timestamp'}</th>
                        <th className="py-2.5 px-3">{isTh ? 'ใบงาน' : 'Job No'}</th>
                        <th className="py-2.5 px-3">{isTh ? 'การดำเนินการ' : 'Action'}</th>
                        <th className="py-2.5 px-3">{isTh ? 'ผู้ดำเนินการ' : 'Operator'}</th>
                        <th className="py-2.5 px-3">{isTh ? 'การเปลี่ยนแปลง (ก่อน ➔ หลัง)' : 'Change Detail'}</th>
                        <th className="py-2.5 px-3">{isTh ? 'เหตุผล / หมายเหตุ' : 'Reason / Note'}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800/70">
                      {filteredLogs.map((log, idx) => (
                        <tr key={idx} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors">
                          <td className="py-2.5 px-3 text-slate-500 dark:text-slate-400 whitespace-nowrap font-mono text-[11px]">
                            {new Date(log.timestamp).toLocaleString('th-TH', { dateStyle: 'short', timeStyle: 'short' })}
                          </td>
                          <td className="py-2.5 px-3 whitespace-nowrap">
                            <span className="font-mono font-bold text-slate-800 dark:text-slate-200 px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                              {log.jobNo}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 whitespace-nowrap">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase border ${getActionBadge(log.action)}`}>
                              {log.action}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 whitespace-nowrap">
                            <div className="font-semibold text-slate-800 dark:text-slate-200">{log.user}</div>
                            <div className="text-[10px] text-slate-400">{log.role}</div>
                          </td>
                          <td className="py-2.5 px-3 text-slate-600 dark:text-slate-300">
                            {log.previousValue && log.newValue ? (
                              <div className="flex items-center gap-1.5 flex-wrap text-[11px]">
                                <span className="line-through text-slate-400 font-mono">{log.previousValue}</span>
                                <ArrowRight size={11} className="text-slate-400 shrink-0" />
                                <span className="font-semibold text-emerald-700 dark:text-emerald-400 font-mono">{log.newValue}</span>
                              </div>
                            ) : (
                              <span className="text-slate-400 italic text-[11px]">-</span>
                            )}
                          </td>
                          <td className="py-2.5 px-3 text-slate-600 dark:text-slate-300 max-w-xs">
                            {log.reason ? (
                              <span className="text-[11px] text-slate-600 dark:text-slate-300 line-clamp-2" title={log.reason}>
                                {log.reason}
                              </span>
                            ) : (
                              <span className="text-slate-400 italic text-[11px]">-</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>

              {/* Footer */}
              <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800 text-xs">
                <span className="text-slate-500 dark:text-slate-400">
                  {isTh
                    ? `แสดง ${filteredLogs.length} จากทั้งหมด ${allLogs.length} รายการ`
                    : `Showing ${filteredLogs.length} of ${allLogs.length} records`}
                </span>
                <button
                  type="button"
                  onClick={() => setShowAuditLogModal(false)}
                  className="px-4 py-2 bg-slate-900 hover:bg-black dark:bg-white dark:hover:bg-slate-100 text-white dark:text-slate-900 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-xs"
                >
                  {isTh ? 'ปิดหน้าต่าง' : 'Close'}
                </button>
              </div>
            </div>
          </div>
        );
      })()}
        </>
      )}
    </div>
  );
}

