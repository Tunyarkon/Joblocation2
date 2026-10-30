import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Sparkles, ShieldCheck, CheckCircle2, AlertTriangle, Clock,
  MapPin, FileText, Search, Filter, Layers, Calendar,
  Building2, HardHat, Wrench, Check, X, ArrowRight,
  RefreshCw, Box, Ruler, Calculator, Compass, ZoomIn,
  ZoomOut, RotateCcw, Users, TrendingDown, Award, Eye, Gauge, Sliders
} from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import { usePlantTurnShared } from '../../context/PlantTurnSharedContext';
import ScaffoldingOptimizeCostSavingDashboard from './ScaffoldingOptimizeCostSavingDashboard';
import {
  ScaffoldingSFJob,
  getStoredScaffoldingJobs,
  updateScaffoldingJob,
  subscribeToScaffoldingJobs,
  CONTRACTOR_COMPANIES,
  ContractorCompanyType,
  HirePeriodType,
  calculateInitialOffHireDate,
  EXTENSION_REQUEST_OPTIONS,
  ExtensionRequestType
} from '../../data/scaffoldingSFData';
import essoPlotPlanBg from '../../assets/esso_sriracha_master_plotplan.jpg';

interface ScaffoldingReviewPlanOptimizeProps {
  globalPlantFilter?: 'All' | 'Phra Khanong' | 'Sriracha';
  onNavigateToList?: () => void;
  onNavigateToCreate?: () => void;
  defaultMode?: 'engineering' | 'cost-saving';
}

interface ContractorCandidate {
  company: ContractorCompanyType;
  specialtyEn: string;
  specialtyTh: string;
  availableCrews: number;
  certifiedPE: boolean;
  suitabilityScore: number;
  dailyRateIndex: string;
  recommendationNoteEn: string;
  recommendationNoteTh: string;
}

export default function ScaffoldingReviewPlanOptimize({
  globalPlantFilter = 'All',
  onNavigateToList,
  onNavigateToCreate,
  defaultMode = 'engineering'
}: ScaffoldingReviewPlanOptimizeProps) {
  const { language } = useLanguage();
  const isTh = language === 'th';
  const { events } = usePlantTurnShared();

  const [viewMode, setViewMode] = useState<'engineering' | 'cost-saving'>(defaultMode);
  const [jobs, setJobs] = useState<ScaffoldingSFJob[]>(() => getStoredScaffoldingJobs());
  const [selectedJobId, setSelectedJobId] = useState<string>('');
  const [activeWorkspaceTab, setActiveWorkspaceTab] = useState<'engineering' | 'rental' | 'plotplan'>('engineering');

  // Filters
  const [selectedEventFilter, setSelectedEventFilter] = useState<string>('All');
  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [scaffoldTypeFilter, setScaffoldTypeFilter] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Engineering checklist state per job ID
  const [checklistsByJob, setChecklistsByJob] = useState<Record<string, {
    loadRatingVerified: boolean;
    civilPeVerified: boolean;
    dropZoneCleared: boolean;
    volumeEstimated: boolean;
    greenTagPlanReady: boolean;
  }>>({});

  // Editable Estimate & Rental Controls for selected job
  const [editWidth, setEditWidth] = useState<number>(4);
  const [editLength, setEditLength] = useState<number>(6);
  const [editHeight, setEditHeight] = useState<number>(12);
  const [editBaseHeight, setEditBaseHeight] = useState<number>(0);
  const [editContractor, setEditContractor] = useState<ContractorCompanyType>('Kaefer');
  const [editHirePeriod, setEditHirePeriod] = useState<HirePeriodType>('15 days');
  const [editRequiredDate, setEditRequiredDate] = useState<string>('2026-10-15');
  const [editOffHireDate, setEditOffHireDate] = useState<string>('2026-10-30');
  const [editExtension, setEditExtension] = useState<ExtensionRequestType>('None');
  const [editTagType, setEditTagType] = useState<'Yellow' | 'Green' | 'Red'>('Yellow');
  const [editStage, setEditStage] = useState<'Execution' | 'In-use' | 'Dismantle'>('Execution');
  const [editCoordX, setEditCoordX] = useState<number>(50);
  const [editCoordY, setEditCoordY] = useState<number>(40);
  const [editDropZoneRadius, setEditDropZoneRadius] = useState<number>(8);
  const [reviewerNote, setReviewerNote] = useState<string>('');

  // Plot plan zoom/pan
  const [plotZoom, setPlotZoom] = useState<number>(100);
  const plotRef = useRef<HTMLDivElement>(null);

  // Toast notification
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const triggerToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 4000);
  };

  // =========================================================================
  // SCAFFOLDING AUTO-OPTIMIZER SIMULATION & FACTOR CONFIGURATION STATE
  // =========================================================================
  interface ScaffoldingFactorConfig {
    preset: 'balanced' | 'pe_safety' | 'max_saving' | 'rapid_turnaround' | 'custom';
    peCompetencyWeight: number;      // 0 - 100 (Default 30)
    rateEconomyWeight: number;       // 0 - 100 (Default 30)
    sharedZoneWeight: number;        // 0 - 100 (Default 20)
    crewAvailabilityWeight: number;  // 0 - 100 (Default 20)
    peHeightThresholdM: number;      // 10m - 25m (Default 15m)
    internalCrewMaxVolM3: number;    // 0 - 65 m³ (Default 36 m³)
    minDropZoneClearanceM: number;   // 4m - 16m (Default 8m)
    autoTrimHirePeriod: boolean;     // Right-size 30d -> 15d for standard scaffolds
    simulationScope: 'pending_only' | 'all_active';
  }

  const DEFAULT_SCAFFOLD_FACTOR_CONFIG: ScaffoldingFactorConfig = {
    preset: 'balanced',
    peCompetencyWeight: 30,
    rateEconomyWeight: 30,
    sharedZoneWeight: 20,
    crewAvailabilityWeight: 20,
    peHeightThresholdM: 15,
    internalCrewMaxVolM3: 36,
    minDropZoneClearanceM: 8,
    autoTrimHirePeriod: true,
    simulationScope: 'all_active'
  };

  const [scaffoldFactorConfig, setScaffoldFactorConfig] = useState<ScaffoldingFactorConfig>(DEFAULT_SCAFFOLD_FACTOR_CONFIG);
  const [showScaffoldSimModal, setShowScaffoldSimModal] = useState<boolean>(false);
  const [showScaffoldFactorPanel, setShowScaffoldFactorPanel] = useState<boolean>(true);
  const [scaffoldSimSelectedIds, setScaffoldSimSelectedIds] = useState<Record<string, boolean>>({});
  const [scaffoldSimCustomContractor, setScaffoldSimCustomContractor] = useState<Record<string, ContractorCompanyType>>({});

  const applyScaffoldPreset = (preset: ScaffoldingFactorConfig['preset']) => {
    if (preset === 'balanced') {
      setScaffoldFactorConfig(prev => ({
        ...DEFAULT_SCAFFOLD_FACTOR_CONFIG,
        simulationScope: prev.simulationScope
      }));
    } else if (preset === 'pe_safety') {
      setScaffoldFactorConfig(prev => ({
        ...prev,
        preset: 'pe_safety',
        peCompetencyWeight: 55,
        rateEconomyWeight: 10,
        sharedZoneWeight: 15,
        crewAvailabilityWeight: 20,
        peHeightThresholdM: 12,
        internalCrewMaxVolM3: 24,
        minDropZoneClearanceM: 10,
        autoTrimHirePeriod: false
      }));
    } else if (preset === 'max_saving') {
      setScaffoldFactorConfig(prev => ({
        ...prev,
        preset: 'max_saving',
        peCompetencyWeight: 20,
        rateEconomyWeight: 45,
        sharedZoneWeight: 25,
        crewAvailabilityWeight: 10,
        peHeightThresholdM: 15,
        internalCrewMaxVolM3: 55,
        minDropZoneClearanceM: 8,
        autoTrimHirePeriod: true
      }));
    } else if (preset === 'rapid_turnaround') {
      setScaffoldFactorConfig(prev => ({
        ...prev,
        preset: 'rapid_turnaround',
        peCompetencyWeight: 25,
        rateEconomyWeight: 10,
        sharedZoneWeight: 20,
        crewAvailabilityWeight: 45,
        peHeightThresholdM: 15,
        internalCrewMaxVolM3: 36,
        minDropZoneClearanceM: 8,
        autoTrimHirePeriod: true
      }));
    }
    setScaffoldSimCustomContractor({});
  };

  useEffect(() => {
    const unsub = subscribeToScaffoldingJobs((updated) => {
      setJobs(updated);
    });
    return unsub;
  }, []);

  // Filter by global plant filter
  const plantScopedJobs = useMemo(() => {
    if (!globalPlantFilter || globalPlantFilter === 'All') return jobs;
    return jobs.filter(j => {
      if (j.plant === globalPlantFilter) return true;
      if (j.plant && j.plant.toLowerCase().includes(globalPlantFilter.toLowerCase())) return true;
      const num = parseInt(j.id.replace(/\D/g, ''), 10);
      if (!isNaN(num)) {
        return (num % 2 === 0 ? 'Phra Khanong' : 'Sriracha') === globalPlantFilter;
      }
      return true;
    });
  }, [jobs, globalPlantFilter]);

  const filteredJobs = useMemo(() => {
    return plantScopedJobs.filter(j => {
      const jobEv = j.eventName || 'Annual Turnaround 2026';
      if (selectedEventFilter !== 'All' && jobEv !== selectedEventFilter) return false;
      if (statusFilter !== 'All' && j.status !== statusFilter) return false;
      if (scaffoldTypeFilter !== 'All' && j.scaffoldType !== scaffoldTypeFilter) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchId = (j.id || '').toLowerCase().includes(q) || (j.jobId || '').toLowerCase().includes(q);
        const matchTag = (j.equipmentTag || '').toLowerCase().includes(q);
        const matchDesc = (j.jobDescription || '').toLowerCase().includes(q);
        const matchComp = (j.company || '').toLowerCase().includes(q);
        if (!matchId && !matchTag && !matchDesc && !matchComp) return false;
      }
      return true;
    });
  }, [plantScopedJobs, selectedEventFilter, statusFilter, scaffoldTypeFilter, searchQuery]);

  // Select first job automatically
  useEffect(() => {
    if (filteredJobs.length > 0 && (!selectedJobId || !filteredJobs.some(j => j.id === selectedJobId))) {
      setSelectedJobId(filteredJobs[0].id);
    }
  }, [filteredJobs, selectedJobId]);

  const selectedJob = useMemo(
    () => jobs.find(j => j.id === selectedJobId) || filteredJobs[0] || null,
    [jobs, filteredJobs, selectedJobId]
  );

  // Sync editor state when selectedJob changes
  useEffect(() => {
    if (!selectedJob) return;
    const sb = selectedJob.markingLocation?.scaleBlock;
    const est = selectedJob.estimate;
    setEditWidth(est?.weight || sb?.width || selectedJob.width || 4);
    setEditLength(est?.length || sb?.length || selectedJob.length || 6);
    setEditHeight(est?.height || Number(sb?.height) || selectedJob.height || 12);
    setEditBaseHeight(est?.baseHeight || 0);
    setEditContractor((selectedJob.company || 'Kaefer') as ContractorCompanyType);
    setEditHirePeriod((selectedJob.hirePeriod || '15 days') as HirePeriodType);
    setEditRequiredDate(selectedJob.requiredDate || '2026-10-15');
    setEditOffHireDate(selectedJob.offHireDate || '2026-10-30');
    setEditExtension((selectedJob.hireControl?.extensionRequest || 'None') as ExtensionRequestType);
    setEditTagType(selectedJob.hireControl?.tagType || (selectedJob.status === 'Approved' ? 'Green' : 'Yellow'));
    setEditStage(selectedJob.lifecycleStage || (selectedJob.status === 'Approved' ? 'In-use' : 'Execution'));
    setEditCoordX(selectedJob.markingLocation?.x ?? selectedJob.x ?? 52);
    setEditCoordY(selectedJob.markingLocation?.y ?? selectedJob.y ?? 36);
    setEditDropZoneRadius(selectedJob.markingLocation?.dropZoneRadius || 8);
    setReviewerNote(selectedJob.approvalRemarks || '');

    setChecklistsByJob(prev => {
      if (prev[selectedJob.id]) return prev;
      const isApproved = selectedJob.status === 'Approved' || selectedJob.status === 'In Progress' || selectedJob.status === 'Completed';
      return {
        ...prev,
        [selectedJob.id]: {
          loadRatingVerified: true,
          civilPeVerified: isApproved || selectedJob.heavyDuty !== 'Y',
          dropZoneCleared: isApproved,
          volumeEstimated: Boolean(selectedJob.estimate?.isEvaluated) || isApproved,
          greenTagPlanReady: isApproved
        }
      };
    });
  }, [selectedJob]);

  const currentChecklist = selectedJob
    ? checklistsByJob[selectedJob.id] || {
        loadRatingVerified: true,
        civilPeVerified: false,
        dropZoneCleared: false,
        volumeEstimated: false,
        greenTagPlanReady: false
      }
    : {
        loadRatingVerified: false,
        civilPeVerified: false,
        dropZoneCleared: false,
        volumeEstimated: false,
        greenTagPlanReady: false
      };

  const toggleChecklistField = (field: keyof typeof currentChecklist) => {
    if (!selectedJob) return;
    setChecklistsByJob(prev => ({
      ...prev,
      [selectedJob.id]: {
        ...currentChecklist,
        [field]: !currentChecklist[field]
      }
    }));
  };

  // Spatial Clash Detection between selectedJob and other jobs on plot plan
  const spatialClashes = useMemo(() => {
    if (!selectedJob) return [];
    return plantScopedJobs
      .filter(other => other.id !== selectedJob.id && other.status !== 'Completed' && other.status !== 'Rejected')
      .map(other => {
        const ox = other.markingLocation?.x ?? other.x ?? 50;
        const oy = other.markingLocation?.y ?? other.y ?? 50;
        const distPct = Math.hypot(editCoordX - ox, editCoordY - oy);
        const minSafePct = ((editDropZoneRadius + (other.markingLocation?.dropZoneRadius || 6)) / 2.2);
        return {
          job: other,
          distPct: Number(distPct.toFixed(1)),
          isClash: distPct < minSafePct
        };
      })
      .filter(item => item.isClash);
  }, [selectedJob, plantScopedJobs, editCoordX, editCoordY, editDropZoneRadius]);

  // Co-located scaffold sharing opportunities in same zone
  const coLocatedOpportunities = useMemo(() => {
    if (!selectedJob) return [];
    return plantScopedJobs.filter(
      other =>
        other.id !== selectedJob.id &&
        other.locationArea === selectedJob.locationArea &&
        Math.abs(
          new Date(other.requiredDate || '2026-10-15').getTime() -
            new Date(editRequiredDate || '2026-10-15').getTime()
        ) <=
          1000 * 60 * 60 * 24 * 10
    );
  }, [selectedJob, plantScopedJobs, editRequiredDate]);

  // Contractor candidates ranked for selectedJob
  const contractorCandidates: ContractorCandidate[] = useMemo(() => {
    if (!selectedJob) return [];
    const needsPE = selectedJob.heavyDuty === 'Y' || selectedJob.specialPurpose === 'Y' || editHeight >= 15;
    const baseList: ContractorCandidate[] = [
      {
        company: 'Kaefer',
        specialtyEn: '360° Column Ring, Heavy Duty & High-Elevation Modular System',
        specialtyTh: 'เชี่ยวชาญนั่งร้านหอกลั่น 360°, Heavy Duty และงานคำนวณวิศวกรโยธา (PE)',
        availableCrews: 6,
        certifiedPE: true,
        suitabilityScore: needsPE ? 98 : 92,
        dailyRateIndex: 'Tier-1 Contract Rate',
        recommendationNoteEn: 'Best match for high-elevation & Heavy Duty column/reactor access.',
        recommendationNoteTh: 'เหมาะสมที่สุดสำหรับงานหอกลั่นสูงและงานรับน้ำหนักสูงพร้อมวิศวกรเซ็นรับรอง'
      },
      {
        company: 'Altrad',
        specialtyEn: 'Cantilever, Pipe Rack Access & Confined Furnace Birdcage',
        specialtyTh: 'เชี่ยวชาญนั่งร้านยื่น Cantilever, แนวท่อ Pipe Rack และภายในเตาเผา',
        availableCrews: 5,
        certifiedPE: true,
        suitabilityScore: selectedJob.specialPurpose === 'Y' ? 97 : 90,
        dailyRateIndex: 'Tier-1 Contract Rate',
        recommendationNoteEn: 'High crew availability in S1/S2 process zones with rapid erection.',
        recommendationNoteTh: 'มีทีมช่างพร้อมในโซน S1/S2 ติดตั้งและตรวจป้ายเขียวได้รวดเร็ว'
      },
      {
        company: 'Contractor A',
        specialtyEn: 'Standard Tower Bay & Offsite Tank Shell Access',
        specialtyTh: 'เชี่ยวชาญนั่งร้านมาตรฐานและงานถังเก็บน้ำมัน Offsite / ท่าเรือ',
        availableCrews: 4,
        certifiedPE: false,
        suitabilityScore: needsPE ? 72 : 88,
        dailyRateIndex: 'Economy Rate (-12%)',
        recommendationNoteEn: 'Cost-effective choice for standard elevation scaffolds (< 15m).',
        recommendationNoteTh: 'ประหยัดงบประมาณสำหรับนั่งร้านทั่วไปที่ความสูงไม่เกิน 15 เมตร'
      },
      {
        company: 'Contractor B',
        specialtyEn: 'General Mechanical & Piping Support Scaffolding',
        specialtyTh: 'งานนั่งร้านสนับสนุนงานท่อและซ่อมบำรุงทั่วไป',
        availableCrews: 3,
        certifiedPE: false,
        suitabilityScore: needsPE ? 68 : 84,
        dailyRateIndex: 'Standard Rate',
        recommendationNoteEn: 'Available backup crew for routine maintenance bays.',
        recommendationNoteTh: 'ทีมสำรองพร้อมปฏิบัติงานสำหรับจุดซ่อมบำรุงย่อย'
      },
      {
        company: 'Maintenance Team',
        specialtyEn: 'BCP Internal Rapid Response & Mobile Tower',
        specialtyTh: 'ทีมช่างภายในโรงกลั่นสำหรับงานด่วนและนั่งร้านล้อเลื่อน',
        availableCrews: 2,
        certifiedPE: true,
        suitabilityScore: 82,
        dailyRateIndex: 'Internal Cost (No Rental)',
        recommendationNoteEn: 'Zero external rental cost for short-duration internal inspections.',
        recommendationNoteTh: 'ไม่มีค่าเช่าภายนอก เหมาะกับงานตรวจสอบระยะสั้น'
      }
    ];
    return baseList.sort((a, b) => b.suitabilityScore - a.suitabilityScore);
  }, [selectedJob, editHeight]);

  // Global KPI Metrics
  const kpiSummary = useMemo(() => {
    const pendingCount = filteredJobs.filter(j => j.status === 'Requested' || j.status === 'Under Review').length;
    const approvedCount = filteredJobs.filter(j => j.status === 'Approved' || j.status === 'In Progress').length;
    const peRequiredCount = filteredJobs.filter(
      j => j.heavyDuty === 'Y' || j.specialPurpose === 'Y' || Number(j.markingLocation?.scaleBlock?.height || j.height || 0) >= 15
    ).length;
    const totalVolume = filteredJobs.reduce((sum, j) => {
      const vol =
        j.estimate?.volume ||
        (j.markingLocation?.scaleBlock
          ? j.markingLocation.scaleBlock.width *
            j.markingLocation.scaleBlock.length *
            Number(j.markingLocation.scaleBlock.height || 8)
          : 48);
      return sum + vol;
    }, 0);
    const estSavingsDays = filteredJobs.length * 3;
    return {
      total: filteredJobs.length,
      pendingCount,
      approvedCount,
      peRequiredCount,
      totalVolume: Math.round(totalVolume),
      estSavingsDays
    };
  }, [filteredJobs]);

  const calculatedVolumeM3 = useMemo(
    () => Number((editWidth * editLength * editHeight).toFixed(1)),
    [editWidth, editLength, editHeight]
  );
  const calculatedFootprintM2 = useMemo(
    () => Number((editWidth * editLength).toFixed(1)),
    [editWidth, editLength]
  );
  const calculatedTiers = useMemo(
    () => Math.max(1, Math.round(editHeight / 2)),
    [editHeight]
  );

  // Save & Optimize Single Selected Job
  const handleApproveAndOptimizeJob = () => {
    if (!selectedJob) return;
    const updated = updateScaffoldingJob(selectedJob.id, {
      status: 'Approved',
      lifecycleStage: editStage,
      company: editContractor,
      contractor: editContractor,
      hirePeriod: editHirePeriod,
      requiredDate: editRequiredDate,
      offHireDate: editOffHireDate,
      width: editWidth,
      length: editLength,
      height: editHeight,
      approvalRemarks:
        reviewerNote.trim() ||
        `Optimized & Approved (${calculatedVolumeM3} m³, ${editContractor}, ${editTagType} Tag)`,
      markingLocation: {
        x: editCoordX,
        y: editCoordY,
        gridZone: selectedJob.markingLocation?.gridZone || 'B2',
        dropZoneRadius: editDropZoneRadius,
        scaleBlock: {
          width: editWidth,
          length: editLength,
          height: editHeight,
          tiers: calculatedTiers,
          rotation: selectedJob.markingLocation?.scaleBlock?.rotation || 0,
          color: '#10b981'
        },
        description: `${selectedJob.equipmentTag} Optimized Footprint (${editWidth}x${editLength}x${editHeight}m)`
      },
      estimate: {
        isEvaluated: true,
        baseHeight: editBaseHeight,
        length: editLength,
        height: editHeight,
        weight: editWidth,
        volume: calculatedVolumeM3,
        autoCalculateVolume: true,
        topElevation: editBaseHeight + editHeight,
        baseFootprintM2: calculatedFootprintM2,
        evaluatedAt: new Date().toISOString().slice(0, 16).replace('T', ' '),
        evaluatedBy: 'Wichai S. (Lead Scaffold & Civil PE)'
      },
      hireControl: {
        onHireDate: editRequiredDate,
        offHireDate: editOffHireDate,
        extensionRequest: editExtension,
        originalOffHireDate: editOffHireDate,
        totalDays: editHirePeriod === '30 days' ? 30 : 15,
        tagType: editTagType,
        contractorBy: `${editContractor} Supervisor`,
        requestorBy: selectedJob.requestorName || 'Area Engineer',
        scaffoldTag: `${editTagType} Tag (${editStage})`,
        updatedAt: new Date().toISOString()
      }
    });

    if (updated) {
      setChecklistsByJob(prev => ({
        ...prev,
        [selectedJob.id]: {
          loadRatingVerified: true,
          civilPeVerified: true,
          dropZoneCleared: true,
          volumeEstimated: true,
          greenTagPlanReady: true
        }
      }));
      triggerToast(
        isTh
          ? `อนุมัติและจัดสรรงานนั่งร้าน ${selectedJob.jobId} (${calculatedVolumeM3} m³ → ${editContractor}) สำเร็จ!`
          : `Optimized & approved ${selectedJob.jobId} (${calculatedVolumeM3} m³ → ${editContractor})!`
      );
    }
  };

  // Evaluate a single scaffolding job under active ScaffoldingFactorConfig
  const evaluateScaffoldJobSimulation = (job: ScaffoldingSFJob, cfg: ScaffoldingFactorConfig = scaffoldFactorConfig) => {
    const sb = job.markingLocation?.scaleBlock;
    const w = job.estimate?.weight || sb?.width || job.width || 4;
    const l = job.estimate?.length || sb?.length || job.length || 6;
    const h = job.estimate?.height || Number(sb?.height) || job.height || 10;
    const vol = Number((w * l * h).toFixed(1));
    const needsPE = job.heavyDuty === 'Y' || job.specialPurpose === 'Y' || h >= cfg.peHeightThresholdM;

    const totalRaw = Math.max(
      1,
      cfg.peCompetencyWeight + cfg.rateEconomyWeight + cfg.sharedZoneWeight + cfg.crewAvailabilityWeight
    );
    const wPE = (cfg.peCompetencyWeight / totalRaw) * 100;
    const wEcon = (cfg.rateEconomyWeight / totalRaw) * 100;
    const wShared = (cfg.sharedZoneWeight / totalRaw) * 100;
    const wCrew = (cfg.crewAvailabilityWeight / totalRaw) * 100;

    const contractorProfiles: Array<{
      company: ContractorCompanyType;
      peCert: boolean;
      peNorm: number;
      econNorm: number;
      crewNorm: number;
      ratePerM3Day: number;
    }> = [
      {
        company: 'Kaefer',
        peCert: true,
        peNorm: needsPE ? 1.0 : 0.85,
        econNorm: 0.72,
        crewNorm: 0.96,
        ratePerM3Day: 14.5
      },
      {
        company: 'Altrad',
        peCert: true,
        peNorm: job.specialPurpose === 'Y' ? 1.0 : needsPE ? 0.94 : 0.86,
        econNorm: 0.76,
        crewNorm: 0.92,
        ratePerM3Day: 14.0
      },
      {
        company: 'Contractor A',
        peCert: false,
        peNorm: needsPE ? 0.35 : 0.88,
        econNorm: 0.95,
        crewNorm: 0.80,
        ratePerM3Day: 12.2
      },
      {
        company: 'Contractor B',
        peCert: false,
        peNorm: needsPE ? 0.30 : 0.82,
        econNorm: 0.88,
        crewNorm: 0.74,
        ratePerM3Day: 12.8
      },
      {
        company: 'Maintenance Team',
        peCert: true,
        peNorm: vol <= cfg.internalCrewMaxVolM3 ? 0.92 : 0.45,
        econNorm: vol <= cfg.internalCrewMaxVolM3 ? 1.0 : 0.50,
        crewNorm: vol <= cfg.internalCrewMaxVolM3 ? 0.85 : 0.45,
        ratePerM3Day: 5.5
      }
    ];

    const ranked = contractorProfiles
      .filter(p => (needsPE ? p.peCert : true))
      .map(p => {
        const sameZoneCount = filteredJobs.filter(
          other => other.id !== job.id && other.locationArea === job.locationArea && other.company === p.company
        ).length;
        const sharedNorm = Math.min(1.0, 0.65 + sameZoneCount * 0.12);

        const pePts = Math.round(wPE * p.peNorm);
        const econPts = Math.round(wEcon * p.econNorm);
        const sharedPts = Math.round(wShared * sharedNorm);
        const crewPts = Math.round(wCrew * p.crewNorm);
        const score = Math.min(99, Math.max(45, pePts + econPts + sharedPts + crewPts));

        return {
          ...p,
          score,
          breakdown: { pePts, econPts, sharedPts, crewPts }
        };
      })
      .sort((a, b) => b.score - a.score);

    const best = ranked[0] || contractorProfiles[0];
    const overrideCompany = scaffoldSimCustomContractor[job.id];
    const chosenProfile = overrideCompany
      ? ranked.find(r => r.company === overrideCompany) || best
      : best;

    const shouldTrimPeriod = cfg.autoTrimHirePeriod && job.hirePeriod === '30 days' && vol <= 95 && job.heavyDuty !== 'Y';
    const recommendedHirePeriod: HirePeriodType = shouldTrimPeriod ? '15 days' : (job.hirePeriod || '15 days');
    const savedHireDays = shouldTrimPeriod ? 15 : 4;
    const rateSavingThb = Math.round(vol * Math.max(1.5, 16.5 - chosenProfile.ratePerM3Day) * 12);
    const offHireSavingThb = Math.round(vol * chosenProfile.ratePerM3Day * savedHireDays * 0.45);
    const estSavingThb = rateSavingThb + offHireSavingThb;

    const reason = isTh
      ? `${needsPE ? `ต้องมี Civil PE (สูง ${h}m ≥ ${cfg.peHeightThresholdM}m)` : `งานมาตรฐาน (${h}m)`} · แนะนำ ${chosenProfile.company} (${chosenProfile.score}%)${shouldTrimPeriod ? ' · ลดวันเช่า 30→15 วัน' : ''}`
      : `${needsPE ? `Civil PE Gate (${h}m ≥ ${cfg.peHeightThresholdM}m)` : `Standard Bay (${h}m)`} · Matched ${chosenProfile.company} (${chosenProfile.score}%)${shouldTrimPeriod ? ' · Trimmed 30d→15d' : ''}`;

    return {
      job,
      width: w,
      length: l,
      height: h,
      volumeM3: vol,
      needsPE,
      recommendedContractor: chosenProfile.company,
      recommendedHirePeriod,
      shouldTrimPeriod,
      score: chosenProfile.score,
      breakdown: 'breakdown' in chosenProfile ? chosenProfile.breakdown : { pePts: 25, econPts: 25, sharedPts: 20, crewPts: 20 },
      estSavingThb,
      reason,
      eligibleContractors: ranked
    };
  };

  const scaffoldSimulationRows = useMemo(() => {
    const scopeJobs = filteredJobs.filter(j => {
      if (scaffoldFactorConfig.simulationScope === 'pending_only') {
        return j.status === 'Requested' || j.status === 'Under Review';
      }
      return j.status !== 'Completed' && j.status !== 'Rejected';
    });
    const list = scopeJobs.length > 0 ? scopeJobs : filteredJobs;
    return list.map(j => evaluateScaffoldJobSimulation(j, scaffoldFactorConfig));
  }, [filteredJobs, scaffoldFactorConfig, scaffoldSimCustomContractor, isTh]);

  const handleOpenScaffoldAutoOptimizer = (expandFactorPanel: boolean = true) => {
    const hasPending = filteredJobs.some(j => j.status === 'Requested' || j.status === 'Under Review');
    const nextScope = hasPending ? scaffoldFactorConfig.simulationScope : 'all_active';
    setScaffoldFactorConfig(prev => ({ ...prev, simulationScope: nextScope }));
    const initialSel: Record<string, boolean> = {};
    filteredJobs.forEach(j => {
      initialSel[j.id] = true;
    });
    setScaffoldSimSelectedIds(initialSel);
    setShowScaffoldFactorPanel(expandFactorPanel);
    setShowScaffoldSimModal(true);
  };

  // Confirm & Apply Batch Scaffolding Simulation
  const handleConfirmScaffoldAutoOptimization = () => {
    const toApply = scaffoldSimulationRows.filter(r => scaffoldSimSelectedIds[r.job.id] !== false);
    if (toApply.length === 0) {
      setShowScaffoldSimModal(false);
      return;
    }

    toApply.forEach(row => {
      const { job, width: w, length: l, height: h, volumeM3: vol, recommendedContractor, recommendedHirePeriod } = row;
      const nextOffHire = calculateInitialOffHireDate(job.requiredDate || '2026-10-15', recommendedHirePeriod);

      updateScaffoldingJob(job.id, {
        status: 'Approved',
        lifecycleStage: 'In-use',
        company: recommendedContractor,
        contractor: recommendedContractor,
        hirePeriod: recommendedHirePeriod,
        offHireDate: nextOffHire,
        approvalRemarks: `AI Factor-Optimized [${scaffoldFactorConfig.preset.toUpperCase()}]: ${vol} m³ → ${recommendedContractor} (${row.score}% match, Est. Saved ฿${row.estSavingThb.toLocaleString()})`,
        markingLocation: {
          x: job.markingLocation?.x ?? job.x ?? 50,
          y: job.markingLocation?.y ?? job.y ?? 45,
          gridZone: job.markingLocation?.gridZone || 'B2',
          dropZoneRadius: scaffoldFactorConfig.minDropZoneClearanceM,
          scaleBlock: {
            width: w,
            length: l,
            height: h,
            tiers: Math.max(1, Math.round(h / 2)),
            rotation: job.markingLocation?.scaleBlock?.rotation || 0,
            color: '#10b981'
          },
          description: `${job.equipmentTag} Optimized Footprint (${w}x${l}x${h}m)`
        },
        estimate: {
          isEvaluated: true,
          baseHeight: 0,
          length: l,
          height: h,
          weight: w,
          volume: vol,
          autoCalculateVolume: true,
          topElevation: h,
          baseFootprintM2: w * l,
          evaluatedAt: new Date().toISOString().slice(0, 16).replace('T', ' '),
          evaluatedBy: 'AI Auto-Optimizer & Civil PE'
        },
        hireControl: {
          onHireDate: job.requiredDate,
          offHireDate: nextOffHire,
          extensionRequest: 'None',
          originalOffHireDate: nextOffHire,
          totalDays: recommendedHirePeriod === '30 days' ? 30 : 15,
          tagType: 'Green',
          contractorBy: `${recommendedContractor} Lead`,
          requestorBy: job.requestorName || 'Operations Engineer',
          scaffoldTag: 'Green Tag (In-use)',
          updatedAt: new Date().toISOString()
        }
      });
    });

    setShowScaffoldSimModal(false);
    triggerToast(
      isTh
        ? `จัดสรรผู้รับเหมา คำนวณปริมาตร และอนุมัติตามตัวแปรจำลองสำเร็จ ${toApply.length} ใบงาน!`
        : `Successfully optimized ${toApply.length} scaffolding requests using configured simulation factors!`
    );
  };

  const handlePlotPlanClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!plotRef.current) return;
    const rect = plotRef.current.getBoundingClientRect();
    const x = Math.max(4, Math.min(96, Number((((e.clientX - rect.left) / rect.width) * 100).toFixed(1))));
    const y = Math.max(4, Math.min(96, Number((((e.clientY - rect.top) / rect.height) * 100).toFixed(1))));
    setEditCoordX(x);
    setEditCoordY(y);
  };

  return (
    <div className="space-y-5 max-w-7xl mx-auto w-full pb-16 animate-in fade-in duration-200">
      {/* ========================================================================= */}
      {/* SCAFFOLDING OPTIMIZATION & COST SAVING TAB MENU SWITCHER BAR              */}
      {/* ========================================================================= */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-2.5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
        <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl flex-wrap">
          <button
            type="button"
            onClick={() => setViewMode('engineering')}
            className={`px-3.5 py-2 rounded-lg text-xs font-extrabold transition-all cursor-pointer flex items-center gap-2 ${
              viewMode === 'engineering'
                ? 'bg-cyan-700 text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Gauge size={15} />
            <span>
              {isTh
                ? '1. ตรวจสอบวิศวกรรม & จัดสรรนั่งร้าน (Engineering Gate)'
                : '1. Engineering Review & Plan Optimizer'}
            </span>
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
            <span>
              {isTh
                ? '2. แดชบอร์ดลดต้นทุน & ความคุ้มค่านั่งร้าน (Optimize & Cost Saving)'
                : '2. Optimize & Cost Saving Dashboard'}
            </span>
            <span
              className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                viewMode === 'cost-saving'
                  ? 'bg-white/20 text-white'
                  : 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300'
              }`}
            >
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
                ? isTh
                  ? 'สลับไปหน้าตรวจวิศวกรรมรายใบงาน'
                  : 'Switch to Engineering Gate'
                : isTh
                ? 'ดูวิเคราะห์การประหยัดค่าเช่านั่งร้าน (THB)'
                : 'View Cost Saving Analytics (THB)'}
            </span>
          </button>
        </div>
      </div>

      {viewMode === 'cost-saving' ? (
        <ScaffoldingOptimizeCostSavingDashboard
          jobs={jobs}
          globalPlantFilter={globalPlantFilter}
          selectedEventFilter={selectedEventFilter}
          onSwitchToEngineeringGate={() => setViewMode('engineering')}
          onInspectJobInEngineeringGate={(job) => {
            setSelectedJobId(job.id);
            setViewMode('engineering');
          }}
        />
      ) : (
        <>
      {/* Top Header Banner */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-5 sm:p-6 flex flex-col lg:flex-row lg:items-center justify-between gap-5">
        <div className="space-y-1.5 max-w-2xl">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full font-mono bg-cyan-100 dark:bg-cyan-950/80 text-cyan-800 dark:text-cyan-300 border border-cyan-200 dark:border-cyan-800">
              SF03 · SCAFFOLDING REVIEW PLAN & OPTIMIZE
            </span>
            <span className="text-xs text-slate-500 dark:text-slate-400">
              {isTh
                ? '· ตรวจสอบวิศวกรรม ประเมินปริมาตร จัดสรรผู้รับเหมา และลดค่าเช่านั่งร้าน'
                : '· Civil PE Review, Volume Estimation, Crew Allocation & Rental Optimization'}
            </span>
          </div>

          <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2.5">
            <Sparkles className="text-cyan-600 dark:text-cyan-400" size={24} />
            <span>
              {isTh
                ? 'ตรวจสอบแผนและจัดสรรทรัพยากรงานนั่งร้าน (Review Plan & Optimize)'
                : 'Scaffolding Review Plan & Optimize'}
            </span>
          </h1>

          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
            {isTh
              ? 'ตรวจสอบรายการคำขอนั่งร้าน คำนวณปริมาตรโครงสร้าง (m³) ตรวจสอบการชนกันของเขต Drop-Zone บนผังโรงกลั่น และจัดสรรทีมผู้รับเหมาควบคู่กับการลดวันเช่าเกินกำหนด'
              : 'Verify structural load ratings, estimate 3D bay volume (m³), resolve CAD drop-zone clashes, and optimize contractor crew assignments and off-hire windows.'}
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap shrink-0">
          <button
            type="button"
            onClick={() => handleOpenScaffoldAutoOptimizer(true)}
            className="h-11 px-3.5 rounded-xl bg-white dark:bg-slate-900 hover:bg-cyan-50/80 dark:hover:bg-cyan-950/40 text-cyan-800 dark:text-cyan-300 border border-cyan-300 dark:border-cyan-800 font-extrabold text-xs flex items-center gap-2 cursor-pointer transition-all shadow-2xs"
            title={isTh ? 'ตั้งค่าค่าน้ำหนักตัวแปรและเกณฑ์วิศวกรรมโยธาสำหรับการจำลองจัดสรรนั่งร้าน' : 'Configure weighting factors and Civil PE thresholds for Scaffolding Auto-Optimizer'}
          >
            <Sliders size={14} className="text-cyan-600 dark:text-cyan-400" />
            <span>{isTh ? 'ตั้งค่าตัวแปรจำลอง (Factor Config)' : 'Factor Config'}</span>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-black bg-cyan-100 dark:bg-cyan-900/70 text-cyan-800 dark:text-cyan-200">
              {scaffoldFactorConfig.preset === 'balanced'
                ? (isTh ? 'สมดุล' : 'Balanced')
                : scaffoldFactorConfig.preset === 'pe_safety'
                  ? (isTh ? 'เน้น PE' : 'PE Strict')
                  : scaffoldFactorConfig.preset === 'max_saving'
                    ? (isTh ? 'ลดต้นทุน' : 'Max Save')
                    : scaffoldFactorConfig.preset === 'rapid_turnaround'
                      ? (isTh ? 'ทีมด่วน' : 'Rapid')
                      : (isTh ? 'กำหนดเอง' : 'Custom')}
            </span>
          </button>

          <button
            type="button"
            onClick={() => handleOpenScaffoldAutoOptimizer(true)}
            className="h-11 px-4 rounded-xl bg-gradient-to-r from-cyan-700 to-teal-600 hover:from-cyan-800 hover:to-teal-700 text-white font-black text-xs shadow-md shadow-cyan-700/20 flex items-center gap-2 cursor-pointer transition-all active:scale-95"
          >
            <Sparkles size={15} />
            <span>
              {isTh
                ? `จำลองจัดสรรอัตโนมัติ (Auto-Optimize Simulation)`
                : `Auto-Optimize Simulation`}
            </span>
          </button>
        </div>
      </div>

      {/* Toast Notification */}
      {toastMsg && (
        <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-400/70 text-emerald-800 dark:text-emerald-200 text-xs font-bold flex items-center justify-between gap-3 shadow-sm animate-in fade-in duration-150">
          <div className="flex items-center gap-2">
            <CheckCircle2 size={16} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
            <span>{toastMsg}</span>
          </div>
          <button
            type="button"
            onClick={() => setToastMsg(null)}
            className="text-slate-400 hover:text-slate-600 cursor-pointer"
          >
            <X size={14} />
          </button>
        </div>
      )}

      {/* 5 KPI Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 shadow-2xs">
          <div className="flex items-center justify-between text-xs font-bold text-amber-600 dark:text-amber-400 mb-1">
            <span>{isTh ? 'รอตรวจสอบวิศวกรรม' : 'Pending Review'}</span>
            <Clock size={15} />
          </div>
          <div className="text-2xl font-black text-slate-900 dark:text-white font-mono">
            {kpiSummary.pendingCount}{' '}
            <span className="text-xs font-normal text-slate-500">/{kpiSummary.total}</span>
          </div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
            {isTh ? 'รอประเมินปริมาตร & จัดสรรทีม' : 'Awaiting volume & crew'}
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 shadow-2xs">
          <div className="flex items-center justify-between text-xs font-bold text-emerald-600 dark:text-emerald-400 mb-1">
            <span>{isTh ? 'อนุมัติ & จัดสรรแล้ว' : 'Optimized & Approved'}</span>
            <CheckCircle2 size={15} />
          </div>
          <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400 font-mono">
            {kpiSummary.approvedCount} <span className="text-xs font-normal text-slate-500">{isTh ? 'งาน' : 'jobs'}</span>
          </div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
            {isTh ? 'พร้อมขึ้นป้าย Yellow / Green Tag' : 'Assigned to certified crew'}
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 shadow-2xs">
          <div className="flex items-center justify-between text-xs font-bold text-cyan-700 dark:text-cyan-400 mb-1">
            <span>{isTh ? 'ปริมาตรนั่งร้านรวม' : 'Total Est. Volume'}</span>
            <Box size={15} />
          </div>
          <div className="text-2xl font-black text-slate-900 dark:text-white font-mono">
            {kpiSummary.totalVolume.toLocaleString()} <span className="text-xs font-normal text-slate-500">m³</span>
          </div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
            {isTh ? 'คำนวณจากขนาด กว้าง×ยาว×สูง' : '3D bay volume across filter'}
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 shadow-2xs">
          <div className="flex items-center justify-between text-xs font-bold text-rose-600 dark:text-rose-400 mb-1">
            <span>{isTh ? 'ต้องมีวิศวกรโยธา (Civil PE)' : 'Civil PE Required'}</span>
            <ShieldCheck size={15} />
          </div>
          <div className="text-2xl font-black text-rose-600 dark:text-rose-400 font-mono">
            {kpiSummary.peRequiredCount} <span className="text-xs font-normal text-slate-500">{isTh ? 'งาน' : 'jobs'}</span>
          </div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
            {isTh ? 'Heavy Duty หรือสูงเกิน 15m' : 'Heavy Duty / Height ≥ 15m'}
          </div>
        </div>

        <div
          onClick={() => setViewMode('cost-saving')}
          className="bg-white dark:bg-slate-900 rounded-2xl border border-teal-200 dark:border-teal-800/80 hover:border-teal-500 p-4 shadow-2xs cursor-pointer transition-all group"
        >
          <div className="flex items-center justify-between text-xs font-bold text-teal-600 dark:text-teal-400 mb-1">
            <span>{isTh ? 'ลดวันเช่าซ้ำซ้อน (Savings)' : 'Off-Hire Optimization'}</span>
            <TrendingDown size={15} className="group-hover:scale-110 transition-transform" />
          </div>
          <div className="text-2xl font-black text-teal-600 dark:text-teal-400 font-mono">
            -{kpiSummary.estSavingsDays} <span className="text-xs font-normal text-slate-500">{isTh ? 'วันเช่า' : 'hire days'}</span>
          </div>
          <div className="text-[11px] text-teal-700 dark:text-teal-300 font-bold mt-1 flex items-center gap-1">
            <span>{isTh ? 'เปิดแดชบอร์ดลดต้นทุน →' : 'Open Cost Saving Tab →'}</span>
          </div>
        </div>
      </div>

      {/* Main 12-Col Split Workspace: Left 4 Cols Queue + Right 8 Cols Engineering & Optimization */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* LEFT 4 COLS: SCAFFOLDING REQUEST QUEUE */}
        <div className="lg:col-span-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-4 space-y-3.5">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
            <div>
              <h2 className="text-xs sm:text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-1.5">
                <Layers size={15} className="text-cyan-600 dark:text-cyan-400" />
                <span>{isTh ? 'คิวใบงานนั่งร้าน (Scaffolding Queue)' : 'Scaffolding Request Queue'}</span>
              </h2>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                {isTh ? `แสดง ${filteredJobs.length} รายการ` : `Showing ${filteredJobs.length} requests`}
              </p>
            </div>
          </div>

          {/* Queue Filters */}
          <div className="space-y-2">
            <div className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={isTh ? 'ค้นหา SF No., Tag (11-C-101), ผู้รับเหมา...' : 'Search SF No., Tag, Contractor...'}
                className="w-full pl-8 pr-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-cyan-500/20"
              />
              <Search size={13} className="absolute left-2.5 top-2.5 text-slate-400" />
            </div>

            <div className="grid grid-cols-3 gap-2">
              <select
                value={selectedEventFilter}
                onChange={(e) => setSelectedEventFilter(e.target.value)}
                className="px-2 py-1.5 rounded-lg bg-cyan-50/70 dark:bg-cyan-950/40 border border-cyan-200 dark:border-cyan-800 text-[11px] font-bold text-slate-800 dark:text-slate-100"
              >
                <option value="All">{isTh ? 'ทุก Event' : 'All Events'}</option>
                {events.map(ev => (
                  <option key={ev.id} value={ev.eventName}>
                    {ev.eventName}
                  </option>
                ))}
              </select>

              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-2 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-[11px] font-semibold text-slate-700 dark:text-slate-200"
              >
                <option value="All">{isTh ? 'ทุกสถานะ' : 'All Status'}</option>
                <option value="Requested">Requested</option>
                <option value="Under Review">Under Review</option>
                <option value="Approved">Approved</option>
                <option value="In Progress">In Progress</option>
              </select>

              <select
                value={scaffoldTypeFilter}
                onChange={(e) => setScaffoldTypeFilter(e.target.value)}
                className="px-2 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-[11px] font-semibold text-slate-700 dark:text-slate-200"
              >
                <option value="All">{isTh ? 'ทุกชนิด' : 'All Types'}</option>
                <option value="Standard">Standard</option>
                <option value="Heavy Duty">Heavy Duty</option>
                <option value="360° Ring">360° Ring</option>
                <option value="Cantilever">Cantilever</option>
              </select>
            </div>
          </div>

          {/* Queue List */}
          <div className="space-y-2.5 max-h-[640px] overflow-y-auto pr-1 custom-scrollbar">
            {filteredJobs.map(job => {
              const isSelected = selectedJob?.id === job.id;
              const sb = job.markingLocation?.scaleBlock;
              const vol =
                job.estimate?.volume ||
                (sb ? sb.width * sb.length * Number(sb.height || 8) : 48);
              const needsPE = job.heavyDuty === 'Y' || job.specialPurpose === 'Y' || Number(sb?.height || 0) >= 15;

              return (
                <div
                  key={job.id}
                  onClick={() => setSelectedJobId(job.id)}
                  className={`p-3.5 rounded-2xl border transition-all cursor-pointer space-y-2 ${
                    isSelected
                      ? 'bg-cyan-50/80 dark:bg-cyan-950/50 border-cyan-500 ring-2 ring-cyan-500/20 shadow-xs'
                      : 'bg-slate-50/70 dark:bg-slate-800/40 border-slate-200 dark:border-slate-800 hover:border-cyan-400/60'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="font-mono text-xs font-black text-cyan-800 dark:text-cyan-300">
                        {job.jobId || job.id}
                      </span>
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-slate-200/80 dark:bg-slate-700 text-slate-800 dark:text-slate-200">
                        {job.equipmentTag}
                      </span>
                      {needsPE && (
                        <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800">
                          Civil PE
                        </span>
                      )}
                    </div>

                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        job.status === 'Approved' || job.status === 'In Progress'
                          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                          : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                      }`}
                    >
                      {job.status}
                    </span>
                  </div>

                  <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 line-clamp-2">
                    {job.jobDescription}
                  </p>

                  <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 pt-1 border-t border-slate-200/60 dark:border-slate-700/60">
                    <span className="font-mono font-bold text-slate-700 dark:text-slate-300">
                      {Math.round(vol)} m³ · {job.company}
                    </span>
                    <span className="truncate max-w-[140px]">
                      {job.eventName || 'Annual Turnaround 2026'}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* RIGHT 8 COLS: ENGINEERING REVIEW, VOLUME ESTIMATOR, CREW OPTIMIZER & CAD PLOT PLAN */}
        {selectedJob ? (
          <div className="lg:col-span-8 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-5 sm:p-6 space-y-5">
            {/* Selected Job Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-black bg-cyan-100 dark:bg-cyan-950 text-cyan-800 dark:text-cyan-300 border border-cyan-200 dark:border-cyan-800">
                    {selectedJob.jobId || selectedJob.id}
                  </span>
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                    Tag: {selectedJob.equipmentTag}
                  </span>
                  <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                    {selectedJob.eventName || 'Annual Turnaround 2026'}
                  </span>
                </div>
                <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-white">
                  {selectedJob.jobDescription}
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {selectedJob.locationArea} · {isTh ? 'ผู้ขอ:' : 'Requestor:'} {selectedJob.requestorName || 'Operations Engineer'} ·{' '}
                  {isTh ? 'รับน้ำหนัก:' : 'Max Load:'} <span className="font-mono font-bold">{selectedJob.maxLoadKg} kg ({selectedJob.maxWorkers} คน)</span>
                </p>
              </div>

              {/* Sub-Tab Switcher */}
              <div className="inline-flex rounded-xl bg-slate-100 dark:bg-slate-800 p-1 border border-slate-200 dark:border-slate-700 shrink-0 self-start">
                <button
                  type="button"
                  onClick={() => setActiveWorkspaceTab('engineering')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                    activeWorkspaceTab === 'engineering'
                      ? 'bg-cyan-700 text-white shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  <Calculator size={13} />
                  <span>{isTh ? '1. วิศวกรรม & จัดสรรทีม' : '1. Engineering & Crew'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveWorkspaceTab('rental')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                    activeWorkspaceTab === 'rental'
                      ? 'bg-cyan-700 text-white shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  <Clock size={13} />
                  <span>{isTh ? '2. วันเช่า & ลดต้นทุน' : '2. Rental & Off-Hire'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveWorkspaceTab('plotplan')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                    activeWorkspaceTab === 'plotplan'
                      ? 'bg-cyan-700 text-white shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  <MapPin size={13} />
                  <span>{isTh ? '3. ผังโรงงาน & Drop-Zone' : '3. Plot Plan & Clash'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('cost-saving')}
                  className="px-3 py-1.5 rounded-lg text-xs font-extrabold transition-all cursor-pointer flex items-center gap-1.5 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100/80 dark:hover:bg-emerald-950/60"
                >
                  <TrendingDown size={13} />
                  <span>{isTh ? '4. แดชบอร์ดลดต้นทุน (THB)' : '4. Cost Saving Dashboard'}</span>
                </button>
              </div>
            </div>

            {/* =====================================================================
                SUB-TAB 1: ENGINEERING REVIEW, VOLUME ESTIMATOR & CONTRACTOR ALLOCATION
               ===================================================================== */}
            {activeWorkspaceTab === 'engineering' && (
              <div className="space-y-5 animate-in fade-in duration-150">
                {/* 3D Volume & Bay Dimension Estimator */}
                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/80 space-y-3.5">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs sm:text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
                      <Ruler size={15} className="text-cyan-600 dark:text-cyan-400" />
                      <span>
                        {isTh
                          ? 'ประเมินขนาดและปริมาตรโครงสร้างนั่งร้าน (3D Scaffold Volume Estimator)'
                          : '3D Scaffold Bay & Volume Estimator'}
                      </span>
                    </h3>
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-black bg-cyan-100 dark:bg-cyan-950 text-cyan-800 dark:text-cyan-300">
                      {calculatedVolumeM3.toLocaleString()} m³ ({calculatedTiers} Tiers)
                    </span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-slate-600 dark:text-slate-300">
                        {isTh ? 'ความกว้าง (Width m)' : 'Bay Width (m)'}
                      </label>
                      <input
                        type="number"
                        step="0.5"
                        min="1"
                        value={editWidth}
                        onChange={(e) => setEditWidth(Math.max(1, Number(e.target.value)))}
                        className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-xs font-mono font-bold text-slate-900 dark:text-white"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-slate-600 dark:text-slate-300">
                        {isTh ? 'ความยาว (Length m)' : 'Bay Length (m)'}
                      </label>
                      <input
                        type="number"
                        step="0.5"
                        min="1"
                        value={editLength}
                        onChange={(e) => setEditLength(Math.max(1, Number(e.target.value)))}
                        className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-xs font-mono font-bold text-slate-900 dark:text-white"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-slate-600 dark:text-slate-300">
                        {isTh ? 'ความสูง (Height m)' : 'Scaffold Height (m)'}
                      </label>
                      <input
                        type="number"
                        step="0.5"
                        min="2"
                        value={editHeight}
                        onChange={(e) => setEditHeight(Math.max(2, Number(e.target.value)))}
                        className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-xs font-mono font-bold text-slate-900 dark:text-white"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-slate-600 dark:text-slate-300">
                        {isTh ? 'ระดับฐาน (Base EL +m)' : 'Base Elevation (m)'}
                      </label>
                      <input
                        type="number"
                        step="0.5"
                        min="0"
                        value={editBaseHeight}
                        onChange={(e) => setEditBaseHeight(Math.max(0, Number(e.target.value)))}
                        className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-xs font-mono font-bold text-slate-900 dark:text-white"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2.5 pt-1">
                    <div className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 flex items-center justify-between">
                      <span className="text-[11px] text-slate-500">{isTh ? 'พื้นที่ฐาน (Footprint):' : 'Base Footprint:'}</span>
                      <span className="text-xs font-mono font-black text-slate-900 dark:text-white">{calculatedFootprintM2} m²</span>
                    </div>
                    <div className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 flex items-center justify-between">
                      <span className="text-[11px] text-slate-500">{isTh ? 'ระดับยอดนั่งร้าน:' : 'Top Elevation:'}</span>
                      <span className="text-xs font-mono font-black text-cyan-700 dark:text-cyan-400">EL +{editBaseHeight + editHeight} m</span>
                    </div>
                    <div className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 flex items-center justify-between">
                      <span className="text-[11px] text-slate-500">{isTh ? 'จำนวนชั้นทำงาน:' : 'Working Tiers:'}</span>
                      <span className="text-xs font-mono font-black text-emerald-600 dark:text-emerald-400">{calculatedTiers} ชั้น</span>
                    </div>
                  </div>
                </div>

                {/* 5-Point Engineering & Safety Verification Checklist */}
                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/80 space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs sm:text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
                      <ShieldCheck size={16} className="text-emerald-600 dark:text-emerald-400" />
                      <span>
                        {isTh
                          ? 'รายการตรวจสอบความปลอดภัยและวิศวกรรม 5 ขั้นตอน'
                          : '5-Point Scaffolding Engineering & Safety Verification'}
                      </span>
                    </h3>
                    <span className="text-xs font-mono font-bold text-emerald-600 dark:text-emerald-400">
                      {Object.values(currentChecklist).filter(Boolean).length}/5 {isTh ? 'ผ่านแล้ว' : 'Verified'}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {[
                      {
                        key: 'loadRatingVerified' as const,
                        labelTh: `1. ตรวจสอบพิกัดรับน้ำหนัก (${selectedJob.maxLoadKg} kg / ${selectedJob.maxWorkers} คน)`,
                        labelEn: `1. Load Rating Verified (${selectedJob.maxLoadKg} kg / ${selectedJob.maxWorkers} crew)`
                      },
                      {
                        key: 'civilPeVerified' as const,
                        labelTh: '2. วิศวกรโยธา (Civil PE) รับรองแบบโครงสร้างแล้ว',
                        labelEn: '2. Civil PE Calculation & Structural Sign-Off'
                      },
                      {
                        key: 'dropZoneCleared' as const,
                        labelTh: `3. ตรวจสอบรัศมีเขตกั้นของตกหล่น (Drop-Zone ${editDropZoneRadius}m)`,
                        labelEn: `3. Drop-Zone Barricade (${editDropZoneRadius}m) & Clash Check`
                      },
                      {
                        key: 'volumeEstimated' as const,
                        labelTh: `4. ยืนยันปริมาตรนั่งร้าน (${calculatedVolumeM3} m³ / ${calculatedTiers} ชั้น)`,
                        labelEn: `4. 3D Bay Volume Confirmed (${calculatedVolumeM3} m³ / ${calculatedTiers} tiers)`
                      },
                      {
                        key: 'greenTagPlanReady' as const,
                        labelTh: '5. แผนตรวจรับป้ายเขียว (Green Tag) & จุดคล้องสายช่วยชีวิต 100%',
                        labelEn: '5. Green Tag Handover & 100% Tie-Off Plan Ready'
                      }
                    ].map(item => {
                      const checked = currentChecklist[item.key];
                      return (
                        <button
                          key={item.key}
                          type="button"
                          onClick={() => toggleChecklistField(item.key)}
                          className={`p-3 rounded-xl border text-left text-xs font-bold flex items-center justify-between gap-2 transition-all cursor-pointer ${
                            checked
                              ? 'bg-emerald-50/80 dark:bg-emerald-950/40 border-emerald-400 text-emerald-900 dark:text-emerald-200'
                              : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300'
                          }`}
                        >
                          <span>{isTh ? item.labelTh : item.labelEn}</span>
                          <div
                            className={`w-5 h-5 rounded-md flex items-center justify-center shrink-0 ${
                              checked
                                ? 'bg-emerald-600 text-white'
                                : 'border border-slate-300 dark:border-slate-600'
                            }`}
                          >
                            {checked && <Check size={13} />}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Smart Contractor & Crew Recommendation List */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs sm:text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
                      <Award size={16} className="text-cyan-600 dark:text-cyan-400" />
                      <span>
                        {isTh
                          ? 'ระบบแนะนำและจัดสรรบริษัทผู้รับเหมาติดตั้งนั่งร้าน (Smart Crew Allocation)'
                          : 'Smart Scaffolding Contractor & Crew Allocation'}
                      </span>
                    </h3>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {contractorCandidates.map(cand => {
                      const isChosen = editContractor === cand.company;
                      return (
                        <div
                          key={cand.company}
                          onClick={() => setEditContractor(cand.company)}
                          className={`p-3.5 rounded-2xl border transition-all cursor-pointer space-y-2 ${
                            isChosen
                              ? 'bg-cyan-50/80 dark:bg-cyan-950/50 border-cyan-500 ring-2 ring-cyan-500/20'
                              : 'bg-slate-50/60 dark:bg-slate-800/40 border-slate-200 dark:border-slate-700/80 hover:border-cyan-400'
                          }`}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-black text-slate-900 dark:text-white">
                                {cand.company}
                              </span>
                              {cand.certifiedPE && (
                                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300">
                                  PE Certified
                                </span>
                              )}
                            </div>
                            <span className="px-2 py-0.5 rounded-full text-xs font-mono font-black bg-cyan-100 dark:bg-cyan-900/60 text-cyan-800 dark:text-cyan-200">
                              Match {cand.suitabilityScore}%
                            </span>
                          </div>

                          <p className="text-[11px] text-slate-600 dark:text-slate-300 font-medium">
                            {isTh ? cand.specialtyTh : cand.specialtyEn}
                          </p>

                          <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 pt-1 border-t border-slate-200/60 dark:border-slate-700/60">
                            <span>
                              {isTh ? `ทีมช่างพร้อม: ${cand.availableCrews} ทีม` : `Available: ${cand.availableCrews} crews`}
                            </span>
                            <span className="font-mono font-semibold text-cyan-700 dark:text-cyan-300">
                              {cand.dailyRateIndex}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* =====================================================================
                SUB-TAB 2: RENTAL HIRE WINDOW & COST OPTIMIZATION
               ===================================================================== */}
            {activeWorkspaceTab === 'rental' && (
              <div className="space-y-5 animate-in fade-in duration-150">
                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/80 space-y-4">
                  <h3 className="text-xs sm:text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
                    <Clock size={16} className="text-cyan-600 dark:text-cyan-400" />
                    <span>
                      {isTh
                        ? 'ควบคุมระยะเวลาเช่า สถานะป้าย Tag และการขอขยายเวลา (Rental & Tag Control)'
                        : 'Rental Hire Window, Tag Status & Extension Optimization'}
                    </span>
                  </h3>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-700 dark:text-slate-200">
                        {isTh ? 'วันที่เริ่มใช้งาน (On-Hire Date)' : 'On-Hire / Required Date'}
                      </label>
                      <input
                        type="date"
                        value={editRequiredDate}
                        onChange={(e) => {
                          setEditRequiredDate(e.target.value);
                          setEditOffHireDate(calculateInitialOffHireDate(e.target.value, editHirePeriod));
                        }}
                        className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-xs font-mono text-slate-900 dark:text-white"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-700 dark:text-slate-200">
                        {isTh ? 'รอบสัญญาเช่า (Hire Period)' : 'Standard Hire Period'}
                      </label>
                      <select
                        value={editHirePeriod}
                        onChange={(e) => {
                          const hp = e.target.value as HirePeriodType;
                          setEditHirePeriod(hp);
                          setEditOffHireDate(calculateInitialOffHireDate(editRequiredDate, hp));
                        }}
                        className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-xs font-bold text-slate-900 dark:text-white"
                      >
                        <option value="15 days">15 days (มาตรฐานระยะสั้น)</option>
                        <option value="30 days">30 days (มาตรฐาน Turnaround)</option>
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-700 dark:text-slate-200">
                        {isTh ? 'กำหนดรื้อถอน/คืนเช่า (Off-Hire Date)' : 'Planned Off-Hire Date'}
                      </label>
                      <input
                        type="date"
                        value={editOffHireDate}
                        onChange={(e) => setEditOffHireDate(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-xs font-mono text-slate-900 dark:text-white"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-700 dark:text-slate-200">
                        {isTh ? 'สถานะป้ายความปลอดภัย (Scaffold Tag)' : 'Safety Tag Status'}
                      </label>
                      <select
                        value={editTagType}
                        onChange={(e) => setEditTagType(e.target.value as 'Yellow' | 'Green' | 'Red')}
                        className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-xs font-bold text-slate-900 dark:text-white"
                      >
                        <option value="Yellow">Yellow Tag (Execution / กำลังติดตั้ง)</option>
                        <option value="Green">Green Tag (In-use / ตรวจผ่านพร้อมใช้งาน)</option>
                        <option value="Red">Red Tag (Dismantle / ห้ามใช้งาน-รื้อถอน)</option>
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-700 dark:text-slate-200">
                        {isTh ? 'ขั้นตอนงาน (Lifecycle Stage)' : 'Lifecycle Stage'}
                      </label>
                      <select
                        value={editStage}
                        onChange={(e) => setEditStage(e.target.value as 'Execution' | 'In-use' | 'Dismantle')}
                        className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-xs font-bold text-slate-900 dark:text-white"
                      >
                        <option value="Execution">1. Execution (ติดตั้งโครงสร้าง)</option>
                        <option value="In-use">2. In-use (ใช้งานหน้างาน)</option>
                        <option value="Dismantle">3. Dismantle (รื้อถอนคืนพื้นที่)</option>
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-700 dark:text-slate-200">
                        {isTh ? 'คำขอขยายเวลาเช่า (Extension)' : 'Extension Request'}
                      </label>
                      <select
                        value={editExtension}
                        onChange={(e) => setEditExtension(e.target.value as ExtensionRequestType)}
                        className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-xs font-bold text-slate-900 dark:text-white"
                      >
                        {EXTENSION_REQUEST_OPTIONS.slice(0, 6).map(opt => (
                          <option key={opt.value} value={opt.value}>
                            {isTh ? opt.labelTh : opt.labelEn}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>

                {/* Co-Located Equipment Tag Sharing Opportunities */}
                <div className="p-4 rounded-2xl bg-teal-50/60 dark:bg-teal-950/30 border border-teal-200 dark:border-teal-800/80 space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs sm:text-sm font-black text-teal-900 dark:text-teal-200 uppercase tracking-wider flex items-center gap-2">
                      <TrendingDown size={16} className="text-teal-600 dark:text-teal-400" />
                      <span>
                        {isTh
                          ? 'โอกาสใช้นั่งร้านร่วมกันในโซนเดียวกันเพื่อลดค่าเช่า (Shared Access Optimization)'
                          : 'Co-Located Scaffold Sharing Opportunities'}
                      </span>
                    </h3>
                    <span className="px-2 py-0.5 rounded-full text-[11px] font-mono font-bold bg-teal-100 dark:bg-teal-900/60 text-teal-800 dark:text-teal-200">
                      {coLocatedOpportunities.length} {isTh ? 'งานใกล้เคียง' : 'adjacent jobs'}
                    </span>
                  </div>

                  {coLocatedOpportunities.length > 0 ? (
                    <div className="space-y-2">
                      {coLocatedOpportunities.slice(0, 3).map(adj => (
                        <div
                          key={adj.id}
                          className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-teal-200/80 dark:border-teal-800/60 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs"
                        >
                          <div>
                            <span className="font-mono font-bold text-cyan-700 dark:text-cyan-400">
                              {adj.jobId} ({adj.equipmentTag})
                            </span>{' '}
                            — <span className="text-slate-700 dark:text-slate-300">{adj.jobDescription}</span>
                            <div className="text-[11px] text-slate-500 mt-0.5">
                              {adj.locationArea} · {adj.requiredDate} → {adj.offHireDate} · {adj.company}
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              setEditContractor(adj.company);
                              setEditRequiredDate(adj.requiredDate);
                              setEditOffHireDate(adj.offHireDate);
                              triggerToast(
                                isTh
                                  ? `ซิงค์ผู้รับเหมา (${adj.company}) และวันเช่าให้ตรงกับ ${adj.jobId} เพื่อลดค่าตั้งนั่งร้านซ้ำซ้อนแล้ว`
                                  : `Synced contractor (${adj.company}) and rental window with ${adj.jobId}`
                              );
                            }}
                            className="px-3 py-1.5 rounded-lg bg-teal-600 hover:bg-teal-500 text-white text-[11px] font-bold shrink-0 cursor-pointer"
                          >
                            {isTh ? 'ซิงค์ทีม & วันเช่าร่วมกัน' : 'Sync Crew & Window'}
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {isTh
                        ? 'ไม่พบใบงานอื่นในโซนเดียวกันที่มีช่วงเวลาทับซ้อนกัน'
                        : 'No overlapping scaffolding requests found in the same zone and date window.'}
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* =====================================================================
                SUB-TAB 3: INTERACTIVE CAD PLOT PLAN & DROP-ZONE CLASH CHECK
               ===================================================================== */}
            {activeWorkspaceTab === 'plotplan' && (
              <div className="space-y-4 animate-in fade-in duration-150">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h3 className="text-xs sm:text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
                      <MapPin size={15} className="text-cyan-600 dark:text-cyan-400" />
                      <span>
                        {isTh
                          ? 'ตรวจสอบพิกัดบนผังโรงกลั่นและรัศมีเขตกั้นของตกหล่น (CAD Plot Plan & Drop-Zone)'
                          : 'CAD Plot Plan Footprint & Drop-Zone Clash Check'}
                      </span>
                    </h3>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      {isTh
                        ? 'คลิกบนแผนผังเพื่อปรับตำแหน่งติดตั้งนั่งร้านหลบจุดทับซ้อน (Spatial Clash)'
                        : 'Click anywhere on the refinery plot plan to relocate the scaffold footprint.'}
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-xs font-mono font-bold text-slate-700 dark:text-slate-200">
                      X: {editCoordX}% · Y: {editCoordY}% · Drop-Zone: {editDropZoneRadius}m
                    </span>
                    <input
                      type="range"
                      min={4}
                      max={20}
                      value={editDropZoneRadius}
                      onChange={(e) => setEditDropZoneRadius(Number(e.target.value))}
                      className="w-24 accent-cyan-600"
                    />
                  </div>
                </div>

                {/* Clash Status Alert */}
                {spatialClashes.length > 0 ? (
                  <div className="p-3.5 rounded-xl bg-amber-50 dark:bg-amber-950/50 border border-amber-300 dark:border-amber-700 flex items-center justify-between gap-3 text-xs text-amber-900 dark:text-amber-200">
                    <div className="flex items-center gap-2">
                      <AlertTriangle size={16} className="text-amber-600 shrink-0" />
                      <span>
                        {isTh
                          ? `พบเขต Drop-Zone ทับซ้อนกับใบงานอื่น ${spatialClashes.length} จุด (${spatialClashes.map(c => c.job.jobId).join(', ')}) — แนะนำให้กั้นแนว Barricade ร่วมกันหรือขยับจุดตั้ง`
                          : `Drop-zone overlaps with ${spatialClashes.length} nearby scaffold(s): ${spatialClashes.map(c => c.job.jobId).join(', ')}.`}
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 flex items-center gap-2 text-xs font-bold text-emerald-800 dark:text-emerald-300">
                    <CheckCircle2 size={15} />
                    <span>
                      {isTh
                        ? 'ผ่านเกณฑ์ระยะปลอดภัย ไม่พบการทับซ้อนของเขต Drop-Zone กับใบงานอื่น'
                        : 'Spatial clearance verified — zero drop-zone conflicts detected.'}
                    </span>
                  </div>
                )}

                {/* Interactive Plot Plan Canvas */}
                <div
                  ref={plotRef}
                  onClick={handlePlotPlanClick}
                  className="relative w-full h-[360px] rounded-2xl overflow-hidden border border-slate-300 dark:border-slate-700 bg-slate-950 cursor-crosshair select-none"
                >
                  <img
                    src={essoPlotPlanBg}
                    alt="Refinery Master Plot Plan"
                    className="w-full h-full object-cover opacity-80"
                  />

                  {/* Other Scaffolding Jobs */}
                  {plantScopedJobs
                    .filter(j => j.id !== selectedJob.id)
                    .slice(0, 20)
                    .map(other => {
                      const ox = other.markingLocation?.x ?? other.x ?? 50;
                      const oy = other.markingLocation?.y ?? other.y ?? 50;
                      return (
                        <div
                          key={other.id}
                          style={{ left: `${ox}%`, top: `${oy}%` }}
                          className="absolute -translate-x-1/2 -translate-y-1/2 pointer-events-none"
                        >
                          <div className="w-3.5 h-3.5 rounded-full bg-slate-700/90 border border-white/80 shadow-xs" />
                        </div>
                      );
                    })}

                  {/* Selected Scaffolding Footprint & Drop-Zone */}
                  <div
                    style={{ left: `${editCoordX}%`, top: `${editCoordY}%` }}
                    className="absolute -translate-x-1/2 -translate-y-1/2 pointer-events-none flex items-center justify-center"
                  >
                    <div
                      style={{
                        width: `${editDropZoneRadius * 5}px`,
                        height: `${editDropZoneRadius * 5}px`
                      }}
                      className="rounded-full border-2 border-dashed border-cyan-400 bg-cyan-500/20 animate-pulse flex items-center justify-center"
                    >
                      <div className="px-2 py-0.5 rounded bg-cyan-700 text-white text-[10px] font-mono font-bold shadow-md whitespace-nowrap">
                        {selectedJob.equipmentTag} ({editWidth}×{editLength}m)
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Reviewer Note & Primary Approve/Optimize Action Footer */}
            <div className="pt-4 border-t border-slate-200 dark:border-slate-800 space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-center">
                <div className="sm:col-span-7">
                  <input
                    type="text"
                    value={reviewerNote}
                    onChange={(e) => setReviewerNote(e.target.value)}
                    placeholder={
                      isTh
                        ? 'บันทึกความเห็นวิศวกรผู้ตรวจสอบ / เงื่อนไขความปลอดภัยเพิ่มเติม...'
                        : 'Add engineering review remarks or special safety instructions...'
                    }
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-xs text-slate-900 dark:text-white"
                  />
                </div>

                <div className="sm:col-span-5 flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={handleApproveAndOptimizeJob}
                    className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black flex items-center justify-center gap-2 shadow-md shadow-emerald-600/20 cursor-pointer transition-all active:scale-95"
                  >
                    <Check size={15} className="stroke-[3]" />
                    <span>
                      {isTh
                        ? 'อนุมัติขนาด & จัดสรรผู้รับเหมา (Approve & Optimize)'
                        : 'Approve Volume & Assign Contractor'}
                    </span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="lg:col-span-8 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-12 text-center text-slate-500">
            {isTh ? 'ไม่พบรายการคำขอนั่งร้านตามตัวกรองที่เลือก' : 'No scaffolding requests match the current filter.'}
          </div>
        )}
      </div>
        </>
      )}

      {/* ========================================================================= */}
      {/* SCAFFOLDING AUTO-OPTIMIZER SIMULATION & INTERACTIVE FACTOR CONFIG MODAL   */}
      {/* ========================================================================= */}
      {showScaffoldSimModal && (() => {
        const totalRaw = Math.max(
          1,
          scaffoldFactorConfig.peCompetencyWeight +
            scaffoldFactorConfig.rateEconomyWeight +
            scaffoldFactorConfig.sharedZoneWeight +
            scaffoldFactorConfig.crewAvailabilityWeight
        );
        const normPE = Math.round((scaffoldFactorConfig.peCompetencyWeight / totalRaw) * 100);
        const normEcon = Math.round((scaffoldFactorConfig.rateEconomyWeight / totalRaw) * 100);
        const normShared = Math.round((scaffoldFactorConfig.sharedZoneWeight / totalRaw) * 100);
        const normCrew = Math.max(0, 100 - normPE - normEcon - normShared);

        const selectedRows = scaffoldSimulationRows.filter(r => scaffoldSimSelectedIds[r.job.id] !== false);
        const avgScore = scaffoldSimulationRows.length > 0
          ? Math.round(scaffoldSimulationRows.reduce((s, r) => s + r.score, 0) / scaffoldSimulationRows.length)
          : 0;
        const totalBatchSavingThb = selectedRows.reduce((s, r) => s + r.estSavingThb, 0);

        return (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-4">
            <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-6xl w-full p-5 sm:p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4 max-h-[92vh] flex flex-col animate-in zoom-in-95 duration-200">
              {/* Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2 text-cyan-700 dark:text-cyan-400">
                    <Sparkles size={20} />
                    <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white">
                      {isTh
                        ? 'จำลองจัดสรรงานนั่งร้านอัตโนมัติ & ตั้งค่าตัวแปร (Scaffolding Auto-Optimizer & Factor Config)'
                        : 'Scaffolding Auto-Optimizer Simulation & Factor Configuration'}
                    </h3>
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-extrabold bg-cyan-100 dark:bg-cyan-950 text-cyan-800 dark:text-cyan-300 border border-cyan-200 dark:border-cyan-800">
                      SF03 Simulation Engine
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {isTh
                      ? 'ปรับตั้งค่าน้ำหนักตัวแปร (Factor Weights) เกณฑ์ความสูงวิศวกรโยธา (Civil PE) และเงื่อนไขการลดวันเช่าเพื่อจำลองผลการจัดสรรแบบเรียลไทม์'
                      : 'Configure multi-objective scoring weights, Civil PE elevation triggers, and rental off-hire optimization rules in real time.'}
                  </p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => setShowScaffoldFactorPanel(prev => !prev)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-extrabold border flex items-center gap-1.5 transition-all cursor-pointer ${
                      showScaffoldFactorPanel
                        ? 'bg-cyan-50 dark:bg-cyan-950/70 border-cyan-300 dark:border-cyan-700 text-cyan-800 dark:text-cyan-300'
                        : 'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    <Sliders size={14} />
                    <span>
                      {showScaffoldFactorPanel
                        ? (isTh ? 'ซ่อนแผงตั้งค่าตัวแปร' : 'Hide Factor Config')
                        : (isTh ? 'เปิดแผงตั้งค่าตัวแปร (Factor Config)' : 'Show Factor Config')}
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowScaffoldSimModal(false)}
                    className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                  >
                    <X size={18} />
                  </button>
                </div>
              </div>

              {/* Scrollable Content */}
              <div className="flex-1 overflow-y-auto space-y-4 pr-1 custom-scrollbar">
                {showScaffoldFactorPanel && (
                  <div className="p-4 rounded-2xl bg-slate-50/90 dark:bg-slate-800/50 border border-cyan-200/80 dark:border-cyan-900/60 space-y-4">
                    {/* Strategy Presets */}
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pb-3 border-b border-slate-200/80 dark:border-slate-700/80">
                      <div className="flex items-center gap-2">
                        <Sliders size={15} className="text-cyan-700 dark:text-cyan-400" />
                        <span className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-slate-200">
                          {isTh ? '1. โหมดกลยุทธ์สำเร็จรูป (Scaffolding Optimization Presets):' : '1. Scaffolding Optimization Presets:'}
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5 flex-wrap">
                        {[
                          {
                            id: 'balanced' as const,
                            labelTh: 'สมดุลวิศวกรรม & ต้นทุน (Balanced)',
                            labelEn: 'Balanced PE & Cost',
                            desc: 'PE ≥15m · 30/30/20/20'
                          },
                          {
                            id: 'pe_safety' as const,
                            labelTh: 'เน้นวิศวกรโยธา PE สูงสุด (Strict Civil PE)',
                            labelEn: 'Strict Civil PE Safety',
                            desc: 'PE ≥12m · PE Weight 55%'
                          },
                          {
                            id: 'max_saving' as const,
                            labelTh: 'เน้นประหยัดค่าเช่าสูงสุด (Max Cost Saving)',
                            labelEn: 'Max Rental Cost Saving',
                            desc: 'Economy 45% + Trim 30d→15d'
                          },
                          {
                            id: 'rapid_turnaround' as const,
                            labelTh: 'เน้นติดตั้งด่วน Turnaround (Rapid Crew)',
                            labelEn: 'Rapid Turnaround Crew',
                            desc: 'Crew Speed 45%'
                          }
                        ].map(p => {
                          const active = scaffoldFactorConfig.preset === p.id;
                          return (
                            <button
                              key={p.id}
                              type="button"
                              onClick={() => applyScaffoldPreset(p.id)}
                              className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer flex items-center gap-1.5 ${
                                active
                                  ? 'bg-cyan-700 text-white border-cyan-700 shadow-xs'
                                  : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-cyan-400'
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
                          onClick={() => applyScaffoldPreset('balanced')}
                          className="px-2.5 py-1.5 rounded-xl text-[11px] font-bold text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 flex items-center gap-1 cursor-pointer"
                        >
                          <RotateCcw size={12} />
                          <span>{isTh ? 'รีเซ็ต' : 'Reset'}</span>
                        </button>
                      </div>
                    </div>

                    {/* Two-Column Sliders */}
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
                      {/* Left 6 Cols: Weights */}
                      <div className="lg:col-span-6 bg-white dark:bg-slate-900 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-black text-slate-800 dark:text-slate-200 uppercase tracking-wider">
                            {isTh ? '2. ค่าน้ำหนักการให้คะแนนผู้รับเหมา (Scoring Weights 100%)' : '2. Contractor Scoring Weights (Normalized 100%)'}
                          </span>
                          <span className="text-[10px] font-mono font-bold text-cyan-700 dark:text-cyan-400">
                            {normPE}% + {normEcon}% + {normShared}% + {normCrew}% = 100%
                          </span>
                        </div>

                        <div className="h-2.5 w-full rounded-full overflow-hidden flex bg-slate-100 dark:bg-slate-800">
                          <div style={{ width: `${normPE}%` }} className="bg-rose-500 transition-all" />
                          <div style={{ width: `${normEcon}%` }} className="bg-emerald-500 transition-all" />
                          <div style={{ width: `${normShared}%` }} className="bg-cyan-500 transition-all" />
                          <div style={{ width: `${normCrew}%` }} className="bg-amber-500 transition-all" />
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                          <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-700/70 space-y-1">
                            <div className="flex items-center justify-between text-xs">
                              <span className="font-bold text-slate-700 dark:text-slate-200 flex items-center gap-1.5">
                                <span className="w-2 h-2 rounded-full bg-rose-500" />
                                {isTh ? 'ความเชี่ยวชาญ Civil PE' : 'Civil PE & Structural Fit'}
                              </span>
                              <span className="font-mono font-black text-rose-600 dark:text-rose-400">{normPE}%</span>
                            </div>
                            <input
                              type="range"
                              min={5}
                              max={70}
                              step={5}
                              value={scaffoldFactorConfig.peCompetencyWeight}
                              onChange={e =>
                                setScaffoldFactorConfig(prev => ({
                                  ...prev,
                                  preset: 'custom',
                                  peCompetencyWeight: Number(e.target.value)
                                }))
                              }
                              className="w-full accent-rose-600 cursor-pointer"
                            />
                          </div>

                          <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-700/70 space-y-1">
                            <div className="flex items-center justify-between text-xs">
                              <span className="font-bold text-slate-700 dark:text-slate-200 flex items-center gap-1.5">
                                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                                {isTh ? 'ความประหยัดค่าเช่า (Rate Economy)' : 'Contractor Rate Economy'}
                              </span>
                              <span className="font-mono font-black text-emerald-600 dark:text-emerald-400">{normEcon}%</span>
                            </div>
                            <input
                              type="range"
                              min={5}
                              max={70}
                              step={5}
                              value={scaffoldFactorConfig.rateEconomyWeight}
                              onChange={e =>
                                setScaffoldFactorConfig(prev => ({
                                  ...prev,
                                  preset: 'custom',
                                  rateEconomyWeight: Number(e.target.value)
                                }))
                              }
                              className="w-full accent-emerald-600 cursor-pointer"
                            />
                          </div>

                          <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-700/70 space-y-1">
                            <div className="flex items-center justify-between text-xs">
                              <span className="font-bold text-slate-700 dark:text-slate-200 flex items-center gap-1.5">
                                <span className="w-2 h-2 rounded-full bg-cyan-500" />
                                {isTh ? 'ใช้ทีมร่วมในโซนเดียวกัน (Shared Zone)' : 'Shared Zone Consolidation'}
                              </span>
                              <span className="font-mono font-black text-cyan-600 dark:text-cyan-400">{normShared}%</span>
                            </div>
                            <input
                              type="range"
                              min={5}
                              max={70}
                              step={5}
                              value={scaffoldFactorConfig.sharedZoneWeight}
                              onChange={e =>
                                setScaffoldFactorConfig(prev => ({
                                  ...prev,
                                  preset: 'custom',
                                  sharedZoneWeight: Number(e.target.value)
                                }))
                              }
                              className="w-full accent-cyan-600 cursor-pointer"
                            />
                          </div>

                          <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-700/70 space-y-1">
                            <div className="flex items-center justify-between text-xs">
                              <span className="font-bold text-slate-700 dark:text-slate-200 flex items-center gap-1.5">
                                <span className="w-2 h-2 rounded-full bg-amber-500" />
                                {isTh ? 'ความพร้อมทีมช่าง (Crew Speed)' : 'Crew Availability & Speed'}
                              </span>
                              <span className="font-mono font-black text-amber-600 dark:text-amber-400">{normCrew}%</span>
                            </div>
                            <input
                              type="range"
                              min={5}
                              max={70}
                              step={5}
                              value={scaffoldFactorConfig.crewAvailabilityWeight}
                              onChange={e =>
                                setScaffoldFactorConfig(prev => ({
                                  ...prev,
                                  preset: 'custom',
                                  crewAvailabilityWeight: Number(e.target.value)
                                }))
                              }
                              className="w-full accent-amber-600 cursor-pointer"
                            />
                          </div>
                        </div>
                      </div>

                      {/* Right 6 Cols: Engineering & Rental Thresholds */}
                      <div className="lg:col-span-6 bg-white dark:bg-slate-900 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-black text-slate-800 dark:text-slate-200 uppercase tracking-wider">
                            {isTh ? '3. เกณฑ์วิศวกรรมและการลดวันเช่า (Engineering & Rental Rules)' : '3. Engineering Gates & Rental Optimization Rules'}
                          </span>
                          <span className="text-[10px] font-mono font-bold text-emerald-600 dark:text-emerald-400">
                            Configurable Thresholds
                          </span>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                          <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-700/70 space-y-1">
                            <div className="flex items-center justify-between text-xs">
                              <span className="font-bold text-slate-700 dark:text-slate-200">
                                {isTh ? 'ความสูงบังคับ Civil PE' : 'Civil PE Height Gate'}
                              </span>
                              <span className="font-mono font-black text-rose-600 dark:text-rose-400">
                                ≥{scaffoldFactorConfig.peHeightThresholdM}m
                              </span>
                            </div>
                            <input
                              type="range"
                              min={10}
                              max={25}
                              step={1}
                              value={scaffoldFactorConfig.peHeightThresholdM}
                              onChange={e =>
                                setScaffoldFactorConfig(prev => ({
                                  ...prev,
                                  preset: 'custom',
                                  peHeightThresholdM: Number(e.target.value)
                                }))
                              }
                              className="w-full accent-rose-600 cursor-pointer"
                            />
                          </div>

                          <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-700/70 space-y-1">
                            <div className="flex items-center justify-between text-xs">
                              <span className="font-bold text-slate-700 dark:text-slate-200">
                                {isTh ? 'เพดานทีมช่างภายใน' : 'Internal Crew Max Vol'}
                              </span>
                              <span className="font-mono font-black text-emerald-600 dark:text-emerald-400">
                                ≤{scaffoldFactorConfig.internalCrewMaxVolM3}m³
                              </span>
                            </div>
                            <input
                              type="range"
                              min={0}
                              max={65}
                              step={4}
                              value={scaffoldFactorConfig.internalCrewMaxVolM3}
                              onChange={e =>
                                setScaffoldFactorConfig(prev => ({
                                  ...prev,
                                  preset: 'custom',
                                  internalCrewMaxVolM3: Number(e.target.value)
                                }))
                              }
                              className="w-full accent-emerald-600 cursor-pointer"
                            />
                          </div>

                          <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-700/70 space-y-1">
                            <div className="flex items-center justify-between text-xs">
                              <span className="font-bold text-slate-700 dark:text-slate-200">
                                {isTh ? 'รัศมี Drop-Zone ขั้นต่ำ' : 'Min Drop-Zone Radius'}
                              </span>
                              <span className="font-mono font-black text-cyan-600 dark:text-cyan-400">
                                {scaffoldFactorConfig.minDropZoneClearanceM}m
                              </span>
                            </div>
                            <input
                              type="range"
                              min={4}
                              max={16}
                              step={1}
                              value={scaffoldFactorConfig.minDropZoneClearanceM}
                              onChange={e =>
                                setScaffoldFactorConfig(prev => ({
                                  ...prev,
                                  preset: 'custom',
                                  minDropZoneClearanceM: Number(e.target.value)
                                }))
                              }
                              className="w-full accent-cyan-600 cursor-pointer"
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                          <label className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-700/70 flex items-start gap-2 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={scaffoldFactorConfig.autoTrimHirePeriod}
                              onChange={e =>
                                setScaffoldFactorConfig(prev => ({
                                  ...prev,
                                  preset: 'custom',
                                  autoTrimHirePeriod: e.target.checked
                                }))
                              }
                              className="mt-0.5 rounded text-cyan-600 focus:ring-cyan-500"
                            />
                            <div className="text-[11px] leading-tight">
                              <span className="font-bold text-slate-800 dark:text-slate-200 block">
                                {isTh ? 'ปรับลดรอบเช่า 30 วัน → 15 วันอัตโนมัติ' : 'Auto-Right-Size 30d → 15d Hire Window'}
                              </span>
                              <span className="text-[10px] text-slate-500">
                                {isTh ? 'สำหรับนั่งร้านทั่วไปขนาด ≤95 m³ เพื่อลดค่าเช่าค้าง' : 'Trims standard scaffolds ≤95 m³ to avoid idle rental'}
                              </span>
                            </div>
                          </label>

                          <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-700/70 space-y-1">
                            <span className="text-[10px] font-bold text-slate-500 uppercase block">
                              {isTh ? 'ขอบเขตใบงานนั่งร้านที่นำมาจำลอง:' : 'Simulation Scope:'}
                            </span>
                            <select
                              value={scaffoldFactorConfig.simulationScope}
                              onChange={e =>
                                setScaffoldFactorConfig(prev => ({
                                  ...prev,
                                  simulationScope: e.target.value as 'pending_only' | 'all_active'
                                }))
                              }
                              className="w-full px-2 py-1 rounded bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-[11px] font-bold text-slate-800 dark:text-slate-200"
                            >
                              <option value="all_active">
                                {isTh ? 'ใบงานที่กำลังดำเนินการทั้งหมด (All Active)' : 'All Active Scaffolding Jobs'}
                              </option>
                              <option value="pending_only">
                                {isTh ? 'เฉพาะรอตรวจสอบ (Requested / Under Review)' : 'Pending Review Only'}
                              </option>
                            </select>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* 4 KPI Summary Cards */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="p-3 rounded-xl bg-cyan-50/70 dark:bg-cyan-950/30 border border-cyan-200 dark:border-cyan-800/80 flex items-center justify-between">
                    <div>
                      <span className="text-[10px] font-bold text-cyan-800 dark:text-cyan-300 uppercase tracking-wider block">
                        {isTh ? 'ใบงานที่เลือกจำลอง' : 'Selected Simulation Jobs'}
                      </span>
                      <span className="text-lg font-black text-cyan-900 dark:text-white font-mono">
                        {selectedRows.length} / {scaffoldSimulationRows.length}
                      </span>
                    </div>
                    <CheckCircle2 size={18} className="text-cyan-600 dark:text-cyan-400" />
                  </div>

                  <div className="p-3 rounded-xl bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/80 flex items-center justify-between">
                    <div>
                      <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-300 uppercase tracking-wider block">
                        {isTh ? 'คะแนนจับคู่เฉลี่ย' : 'Avg Match Score'}
                      </span>
                      <span className="text-lg font-black text-emerald-700 dark:text-emerald-300 font-mono">
                        {avgScore}%
                      </span>
                    </div>
                    <Gauge size={18} className="text-emerald-600 dark:text-emerald-400" />
                  </div>

                  <div className="p-3 rounded-xl bg-rose-50/70 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800/80 flex items-center justify-between">
                    <div>
                      <span className="text-[10px] font-bold text-rose-700 dark:text-rose-300 uppercase tracking-wider block">
                        {isTh ? 'เกณฑ์ความสูง Civil PE' : 'Active Civil PE Trigger'}
                      </span>
                      <span className="text-xs font-black text-rose-800 dark:text-rose-200 font-mono">
                        Height ≥{scaffoldFactorConfig.peHeightThresholdM}m · Drop {scaffoldFactorConfig.minDropZoneClearanceM}m
                      </span>
                    </div>
                    <ShieldCheck size={18} className="text-rose-600 dark:text-rose-400" />
                  </div>

                  <div className="p-3 rounded-xl bg-teal-50/70 dark:bg-teal-950/30 border border-teal-200 dark:border-teal-800/80 flex items-center justify-between">
                    <div>
                      <span className="text-[10px] font-bold text-teal-700 dark:text-teal-300 uppercase tracking-wider block">
                        {isTh ? 'ประหยัดค่าเช่าคาดการณ์' : 'Est. Batch Rental Saving'}
                      </span>
                      <span className="text-lg font-black text-teal-700 dark:text-teal-300 font-mono">
                        ฿{totalBatchSavingThb.toLocaleString()}
                      </span>
                    </div>
                    <TrendingDown size={18} className="text-teal-600 dark:text-teal-400" />
                  </div>
                </div>

                {/* Simulation Table */}
                <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 dark:bg-slate-800/80 text-slate-500 text-[11px] uppercase tracking-wider font-semibold border-b border-slate-200 dark:border-slate-800">
                      <tr>
                        <th className="p-3 w-10 text-center">{isTh ? 'เลือก' : 'Apply'}</th>
                        <th className="p-3">{isTh ? 'รหัสใบงาน / Tag' : 'SF No. / Tag'}</th>
                        <th className="p-3">{isTh ? 'ปริมาตร / ความสูง' : 'Volume / Height'}</th>
                        <th className="p-3">{isTh ? 'ผู้รับเหมาที่แนะนำ (ปรับเลือกได้)' : 'Matched Contractor'}</th>
                        <th className="p-3">{isTh ? 'รอบเช่าแนะนำ' : 'Hire Window'}</th>
                        <th className="p-3">{isTh ? 'คะแนนรวม' : 'Score'}</th>
                        <th className="p-3">{isTh ? 'ประหยัดงบ' : 'Est. Saving'}</th>
                        <th className="p-3">{isTh ? 'เหตุผลการวิเคราะห์' : 'Factor Rationale'}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {scaffoldSimulationRows.map(row => {
                        const isChecked = scaffoldSimSelectedIds[row.job.id] !== false;
                        return (
                          <tr
                            key={row.job.id}
                            className={
                              isChecked
                                ? 'bg-cyan-50/20 dark:bg-cyan-950/15 hover:bg-cyan-50/40 dark:hover:bg-cyan-950/25'
                                : 'opacity-60 bg-slate-50/30 dark:bg-slate-900/40'
                            }
                          >
                            <td className="p-3 text-center">
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={e =>
                                  setScaffoldSimSelectedIds(prev => ({
                                    ...prev,
                                    [row.job.id]: e.target.checked
                                  }))
                                }
                                className="rounded text-cyan-600 focus:ring-cyan-500 cursor-pointer"
                              />
                            </td>
                            <td className="p-3">
                              <div className="font-mono font-bold text-slate-900 dark:text-white">
                                {row.job.jobId || row.job.id} · {row.job.equipmentTag}
                              </div>
                              <div className="text-[10px] text-slate-500 truncate max-w-[180px]">
                                {row.job.locationArea}
                              </div>
                            </td>
                            <td className="p-3 font-mono">
                              <span className="font-bold text-slate-800 dark:text-slate-200">{row.volumeM3} m³</span> ({row.height}m)
                              {row.needsPE && (
                                <span className="ml-1.5 px-1.5 py-0.5 rounded text-[9px] font-bold bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300">
                                  PE
                                </span>
                              )}
                            </td>
                            <td className="p-3">
                              <select
                                value={row.recommendedContractor}
                                onChange={e =>
                                  setScaffoldSimCustomContractor(prev => ({
                                    ...prev,
                                    [row.job.id]: e.target.value as ContractorCompanyType
                                  }))
                                }
                                className="px-2 py-1 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-900 dark:text-white"
                              >
                                {row.eligibleContractors.map(c => (
                                  <option key={c.company} value={c.company}>
                                    {c.company} — {c.score}%
                                  </option>
                                ))}
                              </select>
                            </td>
                            <td className="p-3 font-mono">
                              <span className="font-bold text-slate-800 dark:text-slate-200">{row.recommendedHirePeriod}</span>
                              {row.shouldTrimPeriod && (
                                <span className="block text-[9px] font-bold text-emerald-600 dark:text-emerald-400">
                                  {isTh ? 'ลดจาก 30 วัน' : 'Trimmed from 30d'}
                                </span>
                              )}
                            </td>
                            <td className="p-3">
                              <span className="font-mono font-black text-emerald-600 dark:text-emerald-400">
                                {row.score}%
                              </span>
                              <div className="w-20 h-1.5 rounded-full overflow-hidden flex bg-slate-200 dark:bg-slate-700 mt-1">
                                <div style={{ width: `${row.breakdown.pePts}%` }} className="bg-rose-500" />
                                <div style={{ width: `${row.breakdown.econPts}%` }} className="bg-emerald-500" />
                                <div style={{ width: `${row.breakdown.sharedPts}%` }} className="bg-cyan-500" />
                                <div style={{ width: `${row.breakdown.crewPts}%` }} className="bg-amber-500" />
                              </div>
                            </td>
                            <td className="p-3 font-mono font-bold text-teal-600 dark:text-teal-400">
                              ฿{row.estSavingThb.toLocaleString()}
                            </td>
                            <td className="p-3 text-[11px] text-slate-600 dark:text-slate-400 max-w-xs">
                              {row.reason}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Footer */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                <span className="text-xs text-slate-500">
                  {isTh
                    ? `เลือกยืนยัน ${selectedRows.length} จาก ${scaffoldSimulationRows.length} ใบงาน`
                    : `Selected ${selectedRows.length} of ${scaffoldSimulationRows.length} scaffolding jobs`}
                </span>
                <div className="flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setShowScaffoldSimModal(false)}
                    className="px-4 py-2 text-xs font-bold text-slate-500 hover:text-slate-700 dark:hover:text-slate-200 cursor-pointer"
                  >
                    {isTh ? 'ยกเลิก' : 'Cancel'}
                  </button>
                  <button
                    type="button"
                    disabled={selectedRows.length === 0}
                    onClick={handleConfirmScaffoldAutoOptimization}
                    className="px-5 py-2.5 bg-gradient-to-r from-cyan-700 to-teal-600 hover:from-cyan-800 hover:to-teal-700 disabled:opacity-50 text-white rounded-xl text-xs font-black transition-all shadow-md active:scale-95 cursor-pointer flex items-center gap-2"
                  >
                    <Sparkles size={14} />
                    <span>
                      {isTh
                        ? `ยืนยันผลจัดสรรจำลอง (${selectedRows.length} งาน)`
                        : `Apply Simulation (${selectedRows.length} Jobs)`}
                    </span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
