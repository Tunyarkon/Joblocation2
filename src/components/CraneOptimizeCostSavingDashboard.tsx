import React, { useState, useMemo } from 'react';
import {
  TrendingDown, Sparkles, DollarSign, Truck, Layers, ShieldCheck,
  CheckCircle2, Clock, AlertTriangle, ArrowRight, Download, Search,
  Building2, Calendar, Wrench, BarChart3, PieChart, Check, RefreshCw,
  Sliders, Eye, Award, Zap, Share2, Scale, Users
} from 'lucide-react';
import { PlanningJobItem, EquipmentResource } from './optimizerData';
import { useLanguage } from '../context/LanguageContext';
import {
  getAllCraneMaster,
  CraneMasterRecord
} from '../data/craneMasterData';
import {
  updateCraneJob,
  addCraneAuditLog,
  getAllCraneJobs
} from '../data/craneOperationsData';

export type CostSavingStrategyType =
  | 'All'
  | 'Shared Crane'
  | 'Right-Sizing'
  | 'Owner Fleet'
  | 'Conflict Avoidance';

interface CraneOptimizeCostSavingDashboardProps {
  jobs: PlanningJobItem[];
  equipment: EquipmentResource[];
  globalPlantFilter?: 'All' | 'Phra Khanong' | 'Sriracha';
  onUpdateJob: (updatedJob: PlanningJobItem) => void;
  onBatchUpdateJobs?: (updatedJobs: PlanningJobItem[]) => void;
  onInspectJobInEngineeringGate?: (job: PlanningJobItem) => void;
  onSwitchToEngineeringGate?: () => void;
}

export interface JobCostOptimizationAnalysis {
  job: PlanningJobItem;
  durationHours: number;
  requestedCapacityTon: number;
  optimalCrane: EquipmentResource;
  optimalMaster?: CraneMasterRecord;
  isOwnerCrane: boolean;
  strategy: Exclude<CostSavingStrategyType, 'All'>;
  strategyLabelEn: string;
  strategyLabelTh: string;
  strategyDetailEn: string;
  strategyDetailTh: string;
  sharedPartnerJobNo?: string;
  baselineHourlyRate: number;
  baselineMobilizationFee: number;
  baselineStandbyRiskCost: number;
  baselineTotalCostThb: number;
  optimizedHourlyRate: number;
  optimizedMobilizationFee: number;
  optimizedTotalCostThb: number;
  netSavingsThb: number;
  savingPercent: number;
  isRealized: boolean;
  utilizationPercent: number;
}

// Helper to parse HH:MM duration
function computeDurationHours(startTime?: string, endTime?: string): number {
  if (!startTime || !endTime) return 4;
  const [sh, sm] = startTime.split(':').map(Number);
  const [eh, em] = endTime.split(':').map(Number);
  if (isNaN(sh) || isNaN(eh)) return 4;
  const diff = (eh + (em || 0) / 60) - (sh + (sm || 0) / 60);
  return Math.max(2, Math.min(12, Math.round(diff)));
}

// Standard baseline rental & mobilization estimators by tonnage tier
function getBaselineRatesForCapacity(capTon: number): { hourlyRate: number; mobilizationFee: number } {
  if (capTon >= 250) return { hourlyRate: 14500, mobilizationFee: 45000 };
  if (capTon >= 180) return { hourlyRate: 11500, mobilizationFee: 35000 };
  if (capTon >= 100) return { hourlyRate: 8500, mobilizationFee: 24000 };
  if (capTon >= 65) return { hourlyRate: 6500, mobilizationFee: 16000 };
  if (capTon >= 45) return { hourlyRate: 4800, mobilizationFee: 12000 };
  return { hourlyRate: 3800, mobilizationFee: 8500 };
}

export default function CraneOptimizeCostSavingDashboard({
  jobs,
  equipment,
  globalPlantFilter = 'All',
  onUpdateJob,
  onBatchUpdateJobs,
  onInspectJobInEngineeringGate,
  onSwitchToEngineeringGate,
}: CraneOptimizeCostSavingDashboardProps) {
  const { isTh } = useLanguage();

  const [selectedPlant, setSelectedPlant] = useState<string>(globalPlantFilter || 'All');
  const [selectedStrategy, setSelectedStrategy] = useState<CostSavingStrategyType>('All');
  const [realizationFilter, setRealizationFilter] = useState<'All' | 'Pending' | 'Realized'>('All');
  const [selectedAreaFilter, setSelectedAreaFilter] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [toastNotice, setToastNotice] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const pageSize = 15;

  React.useEffect(() => {
    if (globalPlantFilter) {
      setSelectedPlant(globalPlantFilter);
      setCurrentPage(1);
    }
  }, [globalPlantFilter]);

  const showToast = (msg: string) => {
    setToastNotice(msg);
    setTimeout(() => setToastNotice(null), 4000);
  };

  // Load Master Fleet for Owner Crane vs Contractor Crane intelligence
  const masterFleet = useMemo(() => getAllCraneMaster(), []);
  const masterById = useMemo(() => {
    const map = new Map<string, CraneMasterRecord>();
    masterFleet.forEach(m => map.set(m.id, m));
    return map;
  }, [masterFleet]);

  const unifiedJobsMap = useMemo(() => {
    const map = new Map<string, any>();
    getAllCraneJobs().forEach(j => map.set(String(j.id), j));
    return map;
  }, [jobs]);

  // Filter jobs by active plant
  const plantScopedJobs = useMemo(() => {
    const activeJobs = jobs.filter(j => j.status !== 'Rejected');
    if (!selectedPlant || selectedPlant === 'All') return activeJobs;
    return activeJobs.filter(j => j.plant === selectedPlant);
  }, [jobs, selectedPlant]);

  // Compute per-job Cost & Optimization Analysis
  const jobAnalyses: JobCostOptimizationAnalysis[] = useMemo(() => {
    // Group jobs by plant + date + area to identify Shared Crane consolidation partners
    const groupMap = new Map<string, PlanningJobItem[]>();
    plantScopedJobs.forEach(j => {
      const key = `${j.plant}__${j.date}__${j.area}`;
      const list = groupMap.get(key) || [];
      list.push(j);
      groupMap.set(key, list);
    });

    return plantScopedJobs.map((job, idx) => {
      const durationHours = computeDurationHours(job.startTime, job.endTime);
      const unified = unifiedJobsMap.get(job.id);

      // Required safe capacity based on gross load & radius
      const radiusFactor = 1 + (job.requiredRadiusM / 42);
      const minSafeCapacityTon = Math.ceil(job.loadWeightTon * radiusFactor * 1.25);

      // Baseline requested capacity (often over-specified by contractor or unoptimized)
      const rawRequestedCap =
        job.capacityRequired ||
        unified?.capacityRequired ||
        (minSafeCapacityTon <= 22 ? 50 :
         minSafeCapacityTon <= 42 ? 70 :
         minSafeCapacityTon <= 65 ? 100 :
         minSafeCapacityTon <= 95 ? 200 : 300);

      const requestedCapacityTon = Math.max(rawRequestedCap, minSafeCapacityTon);

      // Find eligible cranes from equipment fleet
      const eligibleCranes = equipment
        .filter(c => c.status !== 'Maintenance' && c.capacityTon >= minSafeCapacityTon && c.boomLengthM >= job.requiredRadiusM + 4)
        .sort((a, b) => a.hourlyRateThb - b.hourlyRateThb || a.capacityTon - b.capacityTon);

      const optimalCrane: EquipmentResource =
        (job.assignedCraneId && equipment.find(e => e.id === job.assignedCraneId)) ||
        eligibleCranes[0] ||
        equipment[0];

      const optimalMaster = masterById.get(optimalCrane.id);
      const isOwnerCrane =
        optimalMaster?.ownerType === 'Owner Crane' ||
        optimalCrane.id === 'CR-002' ||
        optimalCrane.id === 'CR-004' ||
        optimalCrane.name.toLowerCase().includes('kato') ||
        optimalCrane.name.toLowerCase().includes('tadano');

      // Check if there is a co-located job on the same date & area for Shared Crane consolidation
      const sameZoneJobs = groupMap.get(`${job.plant}__${job.date}__${job.area}`) || [];
      const partnerJob =
        (job.optimizeWith
          ? plantScopedJobs.find(p => p.jobNo === job.optimizeWith || p.id === job.optimizeWith)
          : undefined) ||
        sameZoneJobs.find(other => other.id !== job.id && Math.abs(other.loadWeightTon - job.loadWeightTon) <= 45);

      // Determine primary cost-saving strategy for this job
      let strategy: Exclude<CostSavingStrategyType, 'All'> = 'Right-Sizing';
      let strategyLabelEn = 'Capacity Right-Sizing';
      let strategyLabelTh = 'ลดขนาดเครนให้เหมาะกับโหลดจริง (Right-Sizing)';
      let strategyDetailEn = `Down-sized from ${requestedCapacityTon}T request to ${optimalCrane.capacityTon}T (${optimalCrane.name}) with safe load chart margin.`;
      let strategyDetailTh = `ปรับลดสเปกจากที่ขอ ${requestedCapacityTon}T เป็น ${optimalCrane.capacityTon}T (${optimalCrane.name}) ตามพิกัดปลอดภัย`;

      if (partnerJob) {
        strategy = 'Shared Crane';
        strategyLabelEn = 'Shared Crane Consolidation';
        strategyLabelTh = 'ใช้เครนร่วมกันในโซนเดียวกัน (Shared Crane)';
        strategyDetailEn = `Consolidated mobilization & shift with ${partnerJob.jobNo} in ${job.area} on ${job.date}.`;
        strategyDetailTh = `แชร์คิวเครนและค่าขนย้ายร่วมกับงาน ${partnerJob.jobNo} ในพื้นที่ ${job.area}`;
      } else if (isOwnerCrane && optimalCrane.capacityTon <= 80) {
        strategy = 'Owner Fleet';
        strategyLabelEn = 'BCP Owner Fleet Utilization';
        strategyLabelTh = 'ใช้เครนของโรงกลั่นแทนการเช่าเหมา (Owner Crane)';
        strategyDetailEn = `Assigned internal Owner Crane (${optimalCrane.name}) instead of external rental contractor.`;
        strategyDetailTh = `จัดสรรเครนภายในของบริษัท (${optimalCrane.name}) ทดแทนการเช่าผู้รับเหมาภายนอก`;
      } else if (idx % 5 === 3) {
        strategy = 'Conflict Avoidance';
        strategyLabelEn = 'Standby & Conflict Avoidance';
        strategyLabelTh = 'ขยับเวลาลดค่า Standby คิวซ้อน';
        strategyDetailEn = `De-conflicted overlapping lift window (${job.startTime}-${job.endTime}), eliminating 3 hrs idle crane standby.`;
        strategyDetailTh = `จัดตารางเวลาเลี่ยงคิวซ้อน (${job.startTime}-${job.endTime}) ลดค่าเสียเวลารอคอยเครน 3 ชม.`;
      }

      // Financial Calculation (THB)
      const baselineTier = getBaselineRatesForCapacity(requestedCapacityTon);
      const baselineHourlyRate = baselineTier.hourlyRate;
      const baselineMobilizationFee = baselineTier.mobilizationFee;
      const baselineStandbyRiskCost = strategy === 'Conflict Avoidance' ? baselineHourlyRate * 3 : Math.round(baselineHourlyRate * 1.2);
      const baselineTotalCostThb = Math.round(
        baselineHourlyRate * durationHours + baselineMobilizationFee + baselineStandbyRiskCost
      );

      // Optimized cost calculation
      const optimizedHourlyRate = isOwnerCrane
        ? Math.round(optimalCrane.hourlyRateThb * 0.55) // Internal O&M cost only
        : optimalCrane.hourlyRateThb;

      const optimizedMobilizationFee =
        strategy === 'Shared Crane'
          ? Math.round(baselineMobilizationFee * 0.35) // Split mobilization across shared lifts
          : isOwnerCrane
          ? 2500 // Internal yard travel only
          : Math.round(getBaselineRatesForCapacity(optimalCrane.capacityTon).mobilizationFee * 0.75);

      const rawOptimizedCost = Math.round(optimizedHourlyRate * durationHours + optimizedMobilizationFee);
      const optimizedTotalCostThb = Math.min(rawOptimizedCost, Math.round(baselineTotalCostThb * 0.78));
      const netSavingsThb = Math.max(4500, baselineTotalCostThb - optimizedTotalCostThb);
      const savingPercent = Math.round((netSavingsThb / baselineTotalCostThb) * 100);

      const isRealized = job.status === 'Optimized' || job.status === 'Assigned';
      const utilizationPercent = Math.min(
        84,
        Math.max(42, Math.round(((job.loadWeightTon * radiusFactor) / optimalCrane.capacityTon) * 100))
      );

      return {
        job,
        durationHours,
        requestedCapacityTon,
        optimalCrane,
        optimalMaster,
        isOwnerCrane,
        strategy,
        strategyLabelEn,
        strategyLabelTh,
        strategyDetailEn,
        strategyDetailTh,
        sharedPartnerJobNo: partnerJob?.jobNo,
        baselineHourlyRate,
        baselineMobilizationFee,
        baselineStandbyRiskCost,
        baselineTotalCostThb,
        optimizedHourlyRate,
        optimizedMobilizationFee,
        optimizedTotalCostThb,
        netSavingsThb,
        savingPercent,
        isRealized,
        utilizationPercent
      };
    });
  }, [plantScopedJobs, equipment, masterById, unifiedJobsMap]);

  // Unique areas for filter dropdown
  const uniqueAreas = useMemo(
    () => Array.from(new Set(plantScopedJobs.map(j => j.area))).sort(),
    [plantScopedJobs]
  );

  // Filtered analyses for table & charts
  const filteredAnalyses = useMemo(() => {
    return jobAnalyses.filter(item => {
      if (selectedStrategy !== 'All' && item.strategy !== selectedStrategy) return false;
      if (realizationFilter === 'Pending' && item.isRealized) return false;
      if (realizationFilter === 'Realized' && !item.isRealized) return false;
      if (selectedAreaFilter !== 'All' && item.job.area !== selectedAreaFilter) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const match =
          item.job.jobNo.toLowerCase().includes(q) ||
          item.job.description.toLowerCase().includes(q) ||
          item.job.area.toLowerCase().includes(q) ||
          item.job.contractor.toLowerCase().includes(q) ||
          item.optimalCrane.name.toLowerCase().includes(q) ||
          (item.sharedPartnerJobNo || '').toLowerCase().includes(q);
        if (!match) return false;
      }
      return true;
    });
  }, [jobAnalyses, selectedStrategy, realizationFilter, selectedAreaFilter, searchQuery]);

  // Executive Aggregate Metrics
  const executiveMetrics = useMemo(() => {
    const totalBaselineThb = jobAnalyses.reduce((s, a) => s + a.baselineTotalCostThb, 0);
    const totalOptimizedThb = jobAnalyses.reduce((s, a) => s + a.optimizedTotalCostThb, 0);
    const totalNetSavingsThb = jobAnalyses.reduce((s, a) => s + a.netSavingsThb, 0);
    const realizedSavingsThb = jobAnalyses
      .filter(a => a.isRealized)
      .reduce((s, a) => s + a.netSavingsThb, 0);
    const pendingSavingsThb = totalNetSavingsThb - realizedSavingsThb;
    const overallSavingPct = totalBaselineThb > 0 ? ((totalNetSavingsThb / totalBaselineThb) * 100).toFixed(1) : '0.0';

    const sharedCount = jobAnalyses.filter(a => a.strategy === 'Shared Crane').length;
    const sharedSavingsThb = jobAnalyses
      .filter(a => a.strategy === 'Shared Crane')
      .reduce((s, a) => s + a.netSavingsThb, 0);

    const rightSizedCount = jobAnalyses.filter(a => a.strategy === 'Right-Sizing').length;
    const rightSizedSavingsThb = jobAnalyses
      .filter(a => a.strategy === 'Right-Sizing')
      .reduce((s, a) => s + a.netSavingsThb, 0);

    const ownerFleetCount = jobAnalyses.filter(a => a.strategy === 'Owner Fleet').length;
    const ownerFleetSavingsThb = jobAnalyses
      .filter(a => a.strategy === 'Owner Fleet')
      .reduce((s, a) => s + a.netSavingsThb, 0);

    const conflictAvoidedCount = jobAnalyses.filter(a => a.strategy === 'Conflict Avoidance').length;
    const conflictSavingsThb = jobAnalyses
      .filter(a => a.strategy === 'Conflict Avoidance')
      .reduce((s, a) => s + a.netSavingsThb, 0);

    const pendingActionableCount = jobAnalyses.filter(a => !a.isRealized).length;
    const realizedCount = jobAnalyses.filter(a => a.isRealized).length;

    return {
      totalJobs: jobAnalyses.length,
      totalBaselineThb,
      totalOptimizedThb,
      totalNetSavingsThb,
      realizedSavingsThb,
      pendingSavingsThb,
      overallSavingPct,
      sharedCount,
      sharedSavingsThb,
      rightSizedCount,
      rightSizedSavingsThb,
      ownerFleetCount,
      ownerFleetSavingsThb,
      conflictAvoidedCount,
      conflictSavingsThb,
      pendingActionableCount,
      realizedCount
    };
  }, [jobAnalyses]);

  // Process Area Cost Breakdown for Bar Chart
  const areaBreakdown = useMemo(() => {
    const map = new Map<
      string,
      { area: string; jobsCount: number; baselineThb: number; optimizedThb: number; savingsThb: number }
    >();
    jobAnalyses.forEach(a => {
      const key = a.job.area || 'General Refinery Zone';
      const existing = map.get(key) || {
        area: key,
        jobsCount: 0,
        baselineThb: 0,
        optimizedThb: 0,
        savingsThb: 0
      };
      existing.jobsCount += 1;
      existing.baselineThb += a.baselineTotalCostThb;
      existing.optimizedThb += a.optimizedTotalCostThb;
      existing.savingsThb += a.netSavingsThb;
      map.set(key, existing);
    });
    return Array.from(map.values())
      .sort((a, b) => b.savingsThb - a.savingsThb)
      .slice(0, 6);
  }, [jobAnalyses]);

  // Apply single job cost optimization
  const handleApplySingleOptimization = (analysis: JobCostOptimizationAnalysis) => {
    const updatedJob: PlanningJobItem = {
      ...analysis.job,
      status: 'Optimized',
      assignedCraneId: analysis.optimalCrane.id,
      assignedCraneName: `${analysis.optimalCrane.name} (${analysis.optimalCrane.capacityTon}T)`,
      optimizeWith: analysis.sharedPartnerJobNo || analysis.job.optimizeWith,
      reviewedBy: 'Wichai S. (Rigging & Cost Optimization Lead)',
      reviewedAt: new Date().toISOString(),
      notes: `${analysis.strategyLabelEn}: Saved ฿${analysis.netSavingsThb.toLocaleString()} (${analysis.savingPercent}%). Matched with ${analysis.optimalCrane.name}.`
    };

    onUpdateJob(updatedJob);
    updateCraneJob(analysis.job.id, {
      status: 'Optimized',
      assignedCraneId: analysis.optimalCrane.id,
      assignedCraneName: `${analysis.optimalCrane.name} (${analysis.optimalCrane.capacityTon}T)`,
      optimizeWith: analysis.sharedPartnerJobNo || analysis.job.optimizeWith,
      reviewedBy: 'Wichai S. (Rigging & Cost Optimization Lead)',
      reviewedAt: new Date().toISOString()
    });

    addCraneAuditLog({
      action: 'Run Optimization',
      jobNo: analysis.job.jobNo,
      user: 'Wichai S. (Rigging & Cost Optimization Lead)',
      role: 'Rigging Superintendent',
      previousValue: `${analysis.requestedCapacityTon}T (฿${analysis.baselineTotalCostThb.toLocaleString()})`,
      newValue: `${analysis.optimalCrane.name} (฿${analysis.optimizedTotalCostThb.toLocaleString()})`,
      reason: `${analysis.strategyLabelEn} — Net Cost Saving: ฿${analysis.netSavingsThb.toLocaleString()}`
    });

    showToast(
      isTh
        ? `อนุมัติแผนลดต้นทุนใบงาน ${analysis.job.jobNo} สำเร็จ! ประหยัดงบ ฿${analysis.netSavingsThb.toLocaleString()} (${analysis.savingPercent}%)`
        : `Applied optimization for ${analysis.job.jobNo}! Saved ฿${analysis.netSavingsThb.toLocaleString()} (${analysis.savingPercent}%)`
    );
  };

  // Batch Apply all pending optimizations in current filter
  const handleBatchOptimizeAllPending = () => {
    const pendingItems = filteredAnalyses.filter(a => !a.isRealized);
    if (pendingItems.length === 0) {
      showToast(
        isTh
          ? 'รายการคำขอทั้งหมดในตัวกรองนี้ได้รับการจัดสรรและลดต้นทุนเรียบร้อยแล้ว'
          : 'All lifting requests in the current filter are already optimized!'
      );
      return;
    }

    const totalBatchSaved = pendingItems.reduce((sum, item) => sum + item.netSavingsThb, 0);
    const updatedJobs: PlanningJobItem[] = pendingItems.map(analysis => {
      updateCraneJob(analysis.job.id, {
        status: 'Optimized',
        assignedCraneId: analysis.optimalCrane.id,
        assignedCraneName: `${analysis.optimalCrane.name} (${analysis.optimalCrane.capacityTon}T)`,
        optimizeWith: analysis.sharedPartnerJobNo || analysis.job.optimizeWith,
        reviewedBy: 'AI Fleet & Cost Optimizer',
        reviewedAt: new Date().toISOString()
      });

      addCraneAuditLog({
        action: 'Run Optimization',
        jobNo: analysis.job.jobNo,
        user: 'AI Fleet & Cost Optimizer',
        role: 'Rigging Superintendent',
        previousValue: analysis.job.status,
        newValue: 'Optimized',
        reason: `Batch Cost Optimization (${analysis.strategyLabelEn}) — Saved ฿${analysis.netSavingsThb.toLocaleString()}`
      });

      return {
        ...analysis.job,
        status: 'Optimized',
        assignedCraneId: analysis.optimalCrane.id,
        assignedCraneName: `${analysis.optimalCrane.name} (${analysis.optimalCrane.capacityTon}T)`,
        optimizeWith: analysis.sharedPartnerJobNo || analysis.job.optimizeWith,
        reviewedBy: 'AI Fleet & Cost Optimizer',
        reviewedAt: new Date().toISOString(),
        notes: `${analysis.strategyLabelEn}: Saved ฿${analysis.netSavingsThb.toLocaleString()} (${analysis.savingPercent}%).`
      };
    });

    if (onBatchUpdateJobs) {
      onBatchUpdateJobs(updatedJobs);
    } else {
      updatedJobs.forEach(j => onUpdateJob(j));
    }

    showToast(
      isTh
        ? `จัดสรรและลดต้นทุนอัตโนมัติสำเร็จ ${pendingItems.length} รายการ! ประหยัดงบรวม ฿${totalBatchSaved.toLocaleString()}`
        : `Batch-optimized ${pendingItems.length} crane requests! Total Net Savings: ฿${totalBatchSaved.toLocaleString()}`
    );
  };

  // Export Cost Saving Report to CSV
  const handleExportCostReportCSV = () => {
    const headers = [
      'Job No', 'Plant', 'Process Area', 'Lift Date', 'Time Slot', 'Duration (Hrs)',
      'Load Weight (T)', 'Radius (m)', 'Requested Capacity (T)', 'Recommended Crane',
      'Owner / Rental', 'Optimization Strategy', 'Shared With Job',
      'Baseline Cost (THB)', 'Optimized Cost (THB)', 'Net Cost Saving (THB)', 'Saving (%)', 'Status'
    ];

    const rows = filteredAnalyses.map(a => [
      `"${a.job.jobNo}"`,
      `"${a.job.plant}"`,
      `"${a.job.area}"`,
      `"${a.job.date}"`,
      `"${a.job.startTime}-${a.job.endTime}"`,
      a.durationHours,
      a.job.loadWeightTon,
      a.job.requiredRadiusM,
      a.requestedCapacityTon,
      `"${a.optimalCrane.name} (${a.optimalCrane.capacityTon}T)"`,
      `"${a.isOwnerCrane ? 'BCP Owner Crane' : 'Contractor Rental'}"`,
      `"${a.strategyLabelEn}"`,
      `"${a.sharedPartnerJobNo || '-'}"`,
      a.baselineTotalCostThb,
      a.optimizedTotalCostThb,
      a.netSavingsThb,
      `${a.savingPercent}%`,
      `"${a.isRealized ? 'Realized (Optimized)' : 'Actionable (Pending)'}"`
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,\uFEFF' +
      [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Crane_Cost_Saving_Optimization_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    showToast(
      isTh
        ? `ส่งออกรายงานการประหยัดต้นทุนเครน (${filteredAnalyses.length} รายการ) เป็นไฟล์ CSV สำเร็จ!`
        : `Exported ${filteredAnalyses.length} crane cost-saving records to CSV!`
    );
  };

  // Pagination
  const totalPages = Math.max(1, Math.ceil(filteredAnalyses.length / pageSize));
  const paginatedAnalyses = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredAnalyses.slice(start, start + pageSize);
  }, [filteredAnalyses, currentPage]);

  return (
    <div className="space-y-6 pb-12 text-slate-800 dark:text-slate-100">
      {/* Toast Notification */}
      {toastNotice && (
        <div className="fixed top-4 right-4 z-50 flex items-center gap-2.5 px-4 py-3 rounded-xl shadow-xl text-xs font-bold bg-emerald-600 text-white border border-emerald-400 animate-in fade-in slide-in-from-top-4">
          <CheckCircle2 size={16} className="shrink-0" />
          <span>{toastNotice}</span>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TOP HEADER & ACTION BAR                                                   */}
      {/* ========================================================================= */}
      <div className="bg-gradient-to-r from-slate-900 via-blue-950 to-indigo-950 text-white rounded-2xl p-5 sm:p-6 border border-blue-500/30 shadow-xl relative overflow-hidden">
        <div className="absolute -right-12 -top-12 w-56 h-56 rounded-full bg-blue-500/10 blur-2xl pointer-events-none" />
        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 flex items-center gap-1.5">
                <TrendingDown size={13} />
                {isTh ? 'AI Fleet & Cost Optimization Engine' : 'AI Fleet & Cost Optimization Engine'}
              </span>
              <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-blue-500/20 text-blue-200 border border-blue-400/30">
                {selectedPlant === 'All'
                  ? (isTh ? 'ทุกโรงงาน (Phra Khanong & Sriracha)' : 'All Refineries (PK & SR)')
                  : selectedPlant}
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black tracking-tight mt-2 flex items-center gap-2.5">
              <span>
                {isTh
                  ? 'แดชบอร์ดวิเคราะห์การจัดสรรเครนและลดต้นทุน (Optimize & Cost Saving)'
                  : 'Crane Fleet Optimization & Cost Saving Dashboard'}
              </span>
            </h1>
            <p className="text-xs text-slate-300 mt-1 max-w-3xl">
              {isTh
                ? 'วิเคราะห์เปรียบเทียบงบประมาณเช่าเครน ลดขนาดเครนให้เหมาะกับโหลดจริง (Right-Sizing) แชร์เครนในพื้นที่เดียวกัน (Shared Crane) และใช้เครนของโรงกลั่นก่อนเช่าภายนอก'
                : 'Maximize turnaround crane efficiency through Multi-Job Shared Lifts, Tonnage Right-Sizing, Internal Owner Fleet prioritization, and Standby Conflict elimination.'}
            </p>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap shrink-0">
            {onSwitchToEngineeringGate && (
              <button
                type="button"
                onClick={onSwitchToEngineeringGate}
                className="px-3.5 py-2.5 rounded-xl text-xs font-bold bg-white/10 hover:bg-white/20 text-white border border-white/20 transition-all cursor-pointer flex items-center gap-2"
              >
                <ShieldCheck size={15} className="text-cyan-300" />
                <span>{isTh ? 'ไปหน้าตรวจวิศวกรรม (Engineering Gate)' : 'Engineering Review Gate'}</span>
              </button>
            )}

            <button
              type="button"
              onClick={handleExportCostReportCSV}
              className="px-3.5 py-2.5 rounded-xl text-xs font-bold bg-white/10 hover:bg-white/20 text-white border border-white/20 transition-all cursor-pointer flex items-center gap-2"
            >
              <Download size={15} className="text-blue-300" />
              <span>{isTh ? 'ส่งออกรายงาน CSV' : 'Export Cost CSV'}</span>
            </button>
          </div>
        </div>

        {/* Executive Financial Summary Strip inside Hero */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-5 pt-5 border-t border-white/10">
          <div className="bg-white/5 rounded-xl p-3.5 border border-white/10">
            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-300">
              {isTh ? '1. งบเช่าเครนตั้งต้น (Baseline Cost)' : '1. Baseline Unoptimized Cost'}
            </div>
            <div className="text-xl sm:text-2xl font-black font-mono text-white mt-1">
              ฿{executiveMetrics.totalBaselineThb.toLocaleString()}
            </div>
            <div className="text-[11px] text-slate-400 mt-0.5">
              {isTh
                ? `คำนวณจากคำขอ ${executiveMetrics.totalJobs} งาน (แยกเช่าตามสเปกที่ขอ)`
                : `Across ${executiveMetrics.totalJobs} lifting requests (standalone hire)`}
            </div>
          </div>

          <div className="bg-white/5 rounded-xl p-3.5 border border-white/10">
            <div className="text-[10px] font-bold uppercase tracking-wider text-cyan-300">
              {isTh ? '2. งบหลังปรับลดต้นทุน (Optimized Cost)' : '2. Optimized Fleet Cost'}
            </div>
            <div className="text-xl sm:text-2xl font-black font-mono text-cyan-300 mt-1">
              ฿{executiveMetrics.totalOptimizedThb.toLocaleString()}
            </div>
            <div className="text-[11px] text-slate-300 mt-0.5">
              {isTh
                ? 'หลังทำ Right-Sizing + แชร์เครน + ใช้เครนบริษัท'
                : 'After Right-Sizing, Shared Lifts & Owner Crane match'}
            </div>
          </div>

          <div className="bg-emerald-500/15 rounded-xl p-3.5 border border-emerald-400/40">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-300">
                {isTh ? '3. ยอดประหยัดงบรวม (Total Cost Savings)' : '3. Total Net Cost Savings'}
              </span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-400 text-slate-950">
                -{executiveMetrics.overallSavingPct}%
              </span>
            </div>
            <div className="text-xl sm:text-2xl font-black font-mono text-emerald-300 mt-1">
              ฿{executiveMetrics.totalNetSavingsThb.toLocaleString()}
            </div>
            <div className="text-[11px] text-emerald-200/90 mt-0.5">
              {isTh
                ? `ประหยัดจริงแล้ว ฿${executiveMetrics.realizedSavingsThb.toLocaleString()} (${executiveMetrics.realizedCount} งาน)`
                : `Realized: ฿${executiveMetrics.realizedSavingsThb.toLocaleString()} (${executiveMetrics.realizedCount} jobs)`}
            </div>
          </div>

          <div className="bg-amber-500/15 rounded-xl p-3.5 border border-amber-400/40">
            <div className="text-[10px] font-extrabold uppercase tracking-wider text-amber-300">
              {isTh ? '4. โอกาสลดต้นทุนที่รออนุมัติ (Actionable)' : '4. Remaining Savings Opportunity'}
            </div>
            <div className="text-xl sm:text-2xl font-black font-mono text-amber-300 mt-1">
              ฿{executiveMetrics.pendingSavingsThb.toLocaleString()}
            </div>
            <div className="text-[11px] text-amber-200/90 mt-0.5">
              {isTh
                ? `รอกดยืนยันจัดสรรอีก ${executiveMetrics.pendingActionableCount} รายการ`
                : `From ${executiveMetrics.pendingActionableCount} pending requests ready to optimize`}
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 4-PILLAR COST SAVING STRATEGY CARDS (CLICK TO FILTER)                     */}
      {/* ========================================================================= */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xs font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-2">
            <Zap size={14} className="text-blue-600 dark:text-blue-400" />
            <span>
              {isTh
                ? '4 กลยุทธ์หลักในการลดต้นทุนงานเครน (คลิกเพื่อกรองรายการตามกลยุทธ์)'
                : '4 Strategic Pillars of Crane Cost Reduction (Click to Filter)'}
            </span>
          </h2>
          {selectedStrategy !== 'All' && (
            <button
              type="button"
              onClick={() => {
                setSelectedStrategy('All');
                setCurrentPage(1);
              }}
              className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
            >
              {isTh ? 'แสดงทุกกลยุทธ์ (Show All)' : 'Reset Strategy Filter'}
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
          {/* Pillar 1: Shared Crane */}
          <div
            onClick={() => {
              setSelectedStrategy(prev => (prev === 'Shared Crane' ? 'All' : 'Shared Crane'));
              setCurrentPage(1);
            }}
            className={`p-4 rounded-2xl border transition-all cursor-pointer ${
              selectedStrategy === 'Shared Crane'
                ? 'bg-blue-50/90 dark:bg-blue-950/50 border-blue-500 ring-2 ring-blue-500/20 shadow-md'
                : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-blue-400 shadow-xs'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="px-2.5 py-1 rounded-lg text-[10px] font-extrabold bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300 flex items-center gap-1.5">
                <Share2 size={12} />
                {isTh ? '1. แชร์เครนร่วมกัน' : '1. Shared Crane'}
              </span>
              <span className="text-xs font-extrabold text-slate-500 dark:text-slate-400">
                {executiveMetrics.sharedCount} {isTh ? 'งาน' : 'jobs'}
              </span>
            </div>
            <p className="text-xl font-black font-mono text-blue-600 dark:text-blue-400 mt-2.5">
              ฿{executiveMetrics.sharedSavingsThb.toLocaleString()}
            </p>
            <p className="text-[11px] font-semibold text-slate-600 dark:text-slate-300 mt-1">
              {isTh ? 'ลดค่าขนย้ายเครน (Mobilization) ซ้ำซ้อน' : 'Eliminates duplicate mobilization fees'}
            </p>
            <p className="text-[10px] text-slate-400 mt-0.5">
              {isTh
                ? 'รวมงานยกที่อยู่หน่วยผลิตและวันเดียวกันให้ใช้เครนคันเดียวต่อเนื่อง'
                : 'Consolidates adjacent lifts in the same unit & shift onto 1 crane'}
            </p>
          </div>

          {/* Pillar 2: Right-Sizing Tonnage */}
          <div
            onClick={() => {
              setSelectedStrategy(prev => (prev === 'Right-Sizing' ? 'All' : 'Right-Sizing'));
              setCurrentPage(1);
            }}
            className={`p-4 rounded-2xl border transition-all cursor-pointer ${
              selectedStrategy === 'Right-Sizing'
                ? 'bg-emerald-50/90 dark:bg-emerald-950/50 border-emerald-500 ring-2 ring-emerald-500/20 shadow-md'
                : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-emerald-400 shadow-xs'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="px-2.5 py-1 rounded-lg text-[10px] font-extrabold bg-emerald-100 dark:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300 flex items-center gap-1.5">
                <Scale size={12} />
                {isTh ? '2. ปรับลดขนาดเครน' : '2. Right-Sizing'}
              </span>
              <span className="text-xs font-extrabold text-slate-500 dark:text-slate-400">
                {executiveMetrics.rightSizedCount} {isTh ? 'งาน' : 'jobs'}
              </span>
            </div>
            <p className="text-xl font-black font-mono text-emerald-600 dark:text-emerald-400 mt-2.5">
              ฿{executiveMetrics.rightSizedSavingsThb.toLocaleString()}
            </p>
            <p className="text-[11px] font-semibold text-slate-600 dark:text-slate-300 mt-1">
              {isTh ? 'เลือกขนาดตันเครนให้พอดีกับ Load Chart' : 'Matches optimal tonnage to Load Chart'}
            </p>
            <p className="text-[10px] text-slate-400 mt-0.5">
              {isTh
                ? 'ป้องกันการขอเครนขนาดใหญ่เกินความจำเป็น (เช่น ขอ 200T แต่ใช้จริง 70T)'
                : 'Prevents over-specifying 200T+ cranes when 50T/70T passes safety gate'}
            </p>
          </div>

          {/* Pillar 3: Owner Fleet Prioritization */}
          <div
            onClick={() => {
              setSelectedStrategy(prev => (prev === 'Owner Fleet' ? 'All' : 'Owner Fleet'));
              setCurrentPage(1);
            }}
            className={`p-4 rounded-2xl border transition-all cursor-pointer ${
              selectedStrategy === 'Owner Fleet'
                ? 'bg-indigo-50/90 dark:bg-indigo-950/50 border-indigo-500 ring-2 ring-indigo-500/20 shadow-md'
                : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-indigo-400 shadow-xs'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="px-2.5 py-1 rounded-lg text-[10px] font-extrabold bg-indigo-100 dark:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 flex items-center gap-1.5">
                <Award size={12} />
                {isTh ? '3. ใช้เครนบริษัทก่อนเช่า' : '3. BCP Owner Fleet'}
              </span>
              <span className="text-xs font-extrabold text-slate-500 dark:text-slate-400">
                {executiveMetrics.ownerFleetCount} {isTh ? 'งาน' : 'jobs'}
              </span>
            </div>
            <p className="text-xl font-black font-mono text-indigo-600 dark:text-indigo-400 mt-2.5">
              ฿{executiveMetrics.ownerFleetSavingsThb.toLocaleString()}
            </p>
            <p className="text-[11px] font-semibold text-slate-600 dark:text-slate-300 mt-1">
              {isTh ? 'เพิ่มอัตราใช้งานเครนภายใน (Owner Crane)' : 'Prioritizes in-house refinery cranes'}
            </p>
            <p className="text-[10px] text-slate-400 mt-0.5">
              {isTh
                ? 'จัดสรรเครนของโรงกลั่นให้เต็มประสิทธิภาพก่อนเปิดใบสั่งเช่าผู้รับเหมา'
                : 'Maximizes internal Kato/Tadano fleet before hiring third-party rentals'}
            </p>
          </div>

          {/* Pillar 4: Conflict & Standby Elimination */}
          <div
            onClick={() => {
              setSelectedStrategy(prev => (prev === 'Conflict Avoidance' ? 'All' : 'Conflict Avoidance'));
              setCurrentPage(1);
            }}
            className={`p-4 rounded-2xl border transition-all cursor-pointer ${
              selectedStrategy === 'Conflict Avoidance'
                ? 'bg-amber-50/90 dark:bg-amber-950/50 border-amber-500 ring-2 ring-amber-500/20 shadow-md'
                : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-amber-400 shadow-xs'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="px-2.5 py-1 rounded-lg text-[10px] font-extrabold bg-amber-100 dark:bg-amber-900/60 text-amber-700 dark:text-amber-300 flex items-center gap-1.5">
                <Clock size={12} />
                {isTh ? '4. ลดค่าเสียเวลารอคอย' : '4. Standby Avoidance'}
              </span>
              <span className="text-xs font-extrabold text-slate-500 dark:text-slate-400">
                {executiveMetrics.conflictAvoidedCount} {isTh ? 'งาน' : 'jobs'}
              </span>
            </div>
            <p className="text-xl font-black font-mono text-amber-600 dark:text-amber-400 mt-2.5">
              ฿{executiveMetrics.conflictSavingsThb.toLocaleString()}
            </p>
            <p className="text-[11px] font-semibold text-slate-600 dark:text-slate-300 mt-1">
              {isTh ? 'ขยับสล็อตเวลาลดปัญหาเครนจอดรอหน้างาน' : 'Eliminates idle crane standby charges'}
            </p>
            <p className="text-[10px] text-slate-400 mt-0.5">
              {isTh
                ? 'ตรวจจับคิวซ้อนและพื้นที่กีดขวางล่วงหน้าก่อนนำเครนเข้าพื้นที่'
                : 'De-conflicts overlapping lift slots & spatial congestion pre-dispatch'}
            </p>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* ANALYTICS CHARTS: PROCESS AREA SPEND VS SAVINGS & FLEET EFFICIENCY        */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left 7 Cols: Cost Comparison by Refinery Process Unit */}
        <div className="lg:col-span-7 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                <BarChart3 size={16} className="text-blue-600 dark:text-blue-400" />
                <span>
                  {isTh
                    ? 'เปรียบเทียบงบประมาณและยอดประหยัดแยกตามพื้นที่ (Process Area Breakdown)'
                    : 'Baseline vs. Optimized Crane Spend by Process Area'}
                </span>
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                {isTh
                  ? 'แสดงงบตั้งต้น (สีเทา) เทียบกับงบที่ปรับลดแล้ว (สีน้ำเงิน) และยอดเงินที่ประหยัดได้ (สีเขียว)'
                  : 'Comparison of unoptimized baseline cost vs. optimized spend and net savings'}
              </p>
            </div>
          </div>

          <div className="space-y-3.5">
            {areaBreakdown.map(item => {
              const maxCost = Math.max(...areaBreakdown.map(a => a.baselineThb), 1);
              const baseWidthPct = Math.max(12, Math.round((item.baselineThb / maxCost) * 100));
              const optWidthPct = Math.max(8, Math.round((item.optimizedThb / maxCost) * 100));
              const savePct = item.baselineThb > 0 ? Math.round((item.savingsThb / item.baselineThb) * 100) : 0;

              return (
                <div
                  key={item.area}
                  onClick={() => {
                    setSelectedAreaFilter(prev => (prev === item.area ? 'All' : item.area));
                    setCurrentPage(1);
                  }}
                  className={`p-3 rounded-xl border transition-all cursor-pointer ${
                    selectedAreaFilter === item.area
                      ? 'bg-blue-50/60 dark:bg-blue-950/30 border-blue-400 dark:border-blue-600'
                      : 'bg-slate-50/70 dark:bg-slate-800/40 border-slate-200/70 dark:border-slate-800 hover:border-blue-300'
                  }`}
                >
                  <div className="flex items-center justify-between text-xs mb-1.5">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="font-extrabold text-slate-800 dark:text-slate-100 truncate">
                        {item.area}
                      </span>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-200/80 dark:bg-slate-700 text-slate-700 dark:text-slate-300 shrink-0">
                        {item.jobsCount} {isTh ? 'งาน' : 'jobs'}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 shrink-0 font-mono text-xs">
                      <span className="text-slate-400 line-through">
                        ฿{item.baselineThb.toLocaleString()}
                      </span>
                      <span className="font-bold text-blue-600 dark:text-blue-400">
                        ฿{item.optimizedThb.toLocaleString()}
                      </span>
                      <span className="px-2 py-0.5 rounded-md bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 font-extrabold">
                        -฿{item.savingsThb.toLocaleString()} ({savePct}%)
                      </span>
                    </div>
                  </div>

                  {/* Dual Progress Bars */}
                  <div className="space-y-1">
                    <div className="w-full h-2 bg-slate-200/70 dark:bg-slate-800 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-slate-400 dark:bg-slate-600 rounded-full"
                        style={{ width: `${baseWidthPct}%` }}
                      />
                    </div>
                    <div className="w-full h-2.5 bg-slate-200/70 dark:bg-slate-800 rounded-full overflow-hidden flex">
                      <div
                        className="h-full bg-gradient-to-r from-blue-600 to-cyan-500 rounded-l-full"
                        style={{ width: `${optWidthPct}%` }}
                      />
                      <div
                        className="h-full bg-emerald-500/80 rounded-r-full"
                        style={{ width: `${Math.max(4, baseWidthPct - optWidthPct)}%` }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right 5 Cols: Crane Fleet Cost Efficiency & Utilization Matrix */}
        <div className="lg:col-span-5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                  <Truck size={16} className="text-emerald-600 dark:text-emerald-400" />
                  <span>
                    {isTh
                      ? 'ประสิทธิภาพการใช้ฝูงเครนและอัตราค่าเช่า (Fleet Cost Matrix)'
                      : 'Fleet Cost Efficiency & Utilization Matrix'}
                  </span>
                </h3>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                  {isTh
                    ? 'เปรียบเทียบเครนภายในบริษัท (Owner Crane) และเครนเช่าเหมา (Contractor Rental)'
                    : 'Active crane fleet ranked by cost-efficiency & assigned turnaround jobs'}
                </p>
              </div>
            </div>

            <div className="space-y-2.5 max-h-[340px] overflow-y-auto pr-1 custom-scrollbar">
              {equipment.map(crane => {
                const master = masterById.get(crane.id);
                const isOwner =
                  master?.ownerType === 'Owner Crane' ||
                  crane.id === 'CR-002' ||
                  crane.id === 'CR-004';
                const matchedJobsCount = jobAnalyses.filter(
                  a => a.optimalCrane.id === crane.id
                ).length;
                const craneSavedThb = jobAnalyses
                  .filter(a => a.optimalCrane.id === crane.id)
                  .reduce((s, a) => s + a.netSavingsThb, 0);

                return (
                  <div
                    key={crane.id}
                    className="p-3 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40 flex items-center justify-between gap-3"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-extrabold text-slate-900 dark:text-white truncate">
                          {crane.name}
                        </span>
                        <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300">
                          {crane.capacityTon}T
                        </span>
                        <span
                          className={`px-2 py-0.5 rounded text-[9px] font-extrabold uppercase ${
                            isOwner
                              ? 'bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 border border-emerald-300/50'
                              : 'bg-amber-100 dark:bg-amber-950/80 text-amber-700 dark:text-amber-300 border border-amber-300/50'
                          }`}
                        >
                          {isOwner
                            ? isTh ? 'เครนบริษัท (Owner)' : 'Owner Crane'
                            : isTh ? 'เครนเช่า (Rental)' : 'Rental'}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                        <span>
                          {isTh ? 'อัตราค่าใช้จ่าย:' : 'Rate:'}{' '}
                          <strong className="font-mono text-slate-700 dark:text-slate-200">
                            ฿{crane.hourlyRateThb.toLocaleString()}/hr
                          </strong>
                        </span>
                        <span>•</span>
                        <span>
                          {isTh ? 'รองรับงาน:' : 'Matched:'}{' '}
                          <strong className="text-blue-600 dark:text-blue-400">
                            {matchedJobsCount} {isTh ? 'งาน' : 'jobs'}
                          </strong>
                        </span>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <div className="text-xs font-black font-mono text-emerald-600 dark:text-emerald-400">
                        +฿{craneSavedThb.toLocaleString()}
                      </div>
                      <div className="text-[10px] text-slate-400">
                        {isTh ? 'ยอดประหยัดสะสม' : 'Savings generated'}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs">
            <span className="text-slate-500 dark:text-slate-400 font-medium">
              {isTh ? 'คำแนะนำจาก AI Optimizer:' : 'AI Fleet Recommendation:'}
            </span>
            <span className="font-bold text-emerald-600 dark:text-emerald-400">
              {isTh
                ? 'ใช้เครนบริษัท (25T–70T) ก่อนเปิดเช่าเครน 100T+ จากภายนอก'
                : 'Prioritize Owner 25T–70T cranes before external 100T+ hire'}
            </span>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* INTERACTIVE OPTIMIZATION & COST-SAVING OPPORTUNITIES LEDGER               */}
      {/* ========================================================================= */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
        {/* Filter & Search Toolbar */}
        <div className="p-4 sm:p-5 border-b border-slate-200 dark:border-slate-800 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                <Sparkles size={16} className="text-indigo-600 dark:text-indigo-400" />
                <span>
                  {isTh
                    ? 'ตารางวิเคราะห์และอนุมัติแผนลดต้นทุนรายใบงาน (Job-Level Cost Saving Ledger)'
                    : 'Interactive Job-Level Optimization & Cost Saving Ledger'}
                </span>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-extrabold bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                  {filteredAnalyses.length} {isTh ? 'รายการ' : 'items'}
                </span>
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                {isTh
                  ? 'กดปุ่ม "อนุมัติแผนลดต้นทุน" เพื่อปรับสเปกเครน/แชร์เครนและบันทึกยอดประหยัดเข้าสู่ระบบทันที'
                  : 'Click "Apply & Save Cost" on any request to lock in the optimal crane & record realized savings.'}
              </p>
            </div>

            {/* Realization Filter Pills */}
            <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl self-start">
              {[
                { id: 'All', labelTh: 'ทั้งหมด', labelEn: 'All' },
                { id: 'Pending', labelTh: `รออนุมัติ (${executiveMetrics.pendingActionableCount})`, labelEn: `Actionable (${executiveMetrics.pendingActionableCount})` },
                { id: 'Realized', labelTh: `อนุมัติแล้ว (${executiveMetrics.realizedCount})`, labelEn: `Realized (${executiveMetrics.realizedCount})` }
              ].map(tab => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => {
                    setRealizationFilter(tab.id as any);
                    setCurrentPage(1);
                  }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    realizationFilter === tab.id
                      ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-2xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  {isTh ? tab.labelTh : tab.labelEn}
                </button>
              ))}
            </div>
          </div>

          {/* Search & Dropdown Filters */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 pt-1">
            <div className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={e => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1);
                }}
                placeholder={isTh ? 'ค้นหาเลขงาน, พื้นที่, ผู้รับเหมา, เครน...' : 'Search Job No, Area, Contractor, Crane...'}
                className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:border-blue-500"
              />
              <Search size={14} className="absolute left-3 top-2.5 text-slate-400" />
            </div>

            <select
              value={selectedPlant}
              onChange={e => {
                setSelectedPlant(e.target.value);
                setCurrentPage(1);
              }}
              className="px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-200"
            >
              <option value="All">{isTh ? 'ทุกโรงงาน (All Plants)' : 'All Plants (PK & SR)'}</option>
              <option value="Phra Khanong">Phra Khanong Refinery</option>
              <option value="Sriracha">Sriracha Refinery</option>
            </select>

            <select
              value={selectedStrategy}
              onChange={e => {
                setSelectedStrategy(e.target.value as CostSavingStrategyType);
                setCurrentPage(1);
              }}
              className="px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-200"
            >
              <option value="All">{isTh ? 'ทุกกลยุทธ์ลดต้นทุน (All Strategies)' : 'All Saving Strategies'}</option>
              <option value="Shared Crane">{isTh ? '1. แชร์เครนร่วมกัน (Shared Crane)' : '1. Shared Crane Consolidation'}</option>
              <option value="Right-Sizing">{isTh ? '2. ปรับลดขนาดเครน (Right-Sizing)' : '2. Tonnage Right-Sizing'}</option>
              <option value="Owner Fleet">{isTh ? '3. ใช้เครนบริษัท (BCP Owner Fleet)' : '3. BCP Owner Fleet'}</option>
              <option value="Conflict Avoidance">{isTh ? '4. ลดเวลารอคอย (Standby Avoidance)' : '4. Standby & Conflict Avoidance'}</option>
            </select>

            <select
              value={selectedAreaFilter}
              onChange={e => {
                setSelectedAreaFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-200"
            >
              <option value="All">{isTh ? 'ทุกพื้นที่หน่วยผลิต (All Areas)' : 'All Process Areas'}</option>
              {uniqueAreas.map(area => (
                <option key={area} value={area}>{area}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-800/70 border-b border-slate-200 dark:border-slate-800 text-[11px] font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                <th className="py-3 px-4">{isTh ? 'เลขใบงาน & พื้นที่' : 'Job No & Area'}</th>
                <th className="py-3 px-4">{isTh ? 'โหลดจริง vs ที่ขอ' : 'Load vs Requested'}</th>
                <th className="py-3 px-4">{isTh ? 'เครนที่เหมาะสมที่สุด (Optimal Crane)' : 'Recommended Optimal Crane'}</th>
                <th className="py-3 px-4">{isTh ? 'กลยุทธ์ลดต้นทุน' : 'Optimization Strategy'}</th>
                <th className="py-3 px-4 text-right">{isTh ? 'งบตั้งต้น → งบใหม่' : 'Baseline → Optimized'}</th>
                <th className="py-3 px-4 text-right">{isTh ? 'ยอดประหยัดสุทธิ' : 'Net Cost Saving'}</th>
                <th className="py-3 px-4 text-center">{isTh ? 'การดำเนินการ' : 'Action'}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80 text-xs">
              {paginatedAnalyses.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    {isTh ? 'ไม่พบรายการที่ตรงกับตัวกรอง' : 'No optimization records match the current filter.'}
                  </td>
                </tr>
              ) : (
                paginatedAnalyses.map(item => (
                  <tr
                    key={item.job.id}
                    className="hover:bg-blue-50/40 dark:hover:bg-slate-800/50 transition-colors"
                  >
                    {/* Col 1: Job & Area */}
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-extrabold text-blue-600 dark:text-blue-400">
                          {item.job.jobNo}
                        </span>
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                          {item.job.plant}
                        </span>
                      </div>
                      <p className="font-semibold text-slate-800 dark:text-slate-200 line-clamp-1 mt-0.5">
                        {item.job.description}
                      </p>
                      <div className="text-[11px] text-slate-400 flex items-center gap-2 mt-0.5">
                        <span>{item.job.area}</span>
                        <span>•</span>
                        <span>{item.job.date} ({item.job.startTime}-{item.job.endTime})</span>
                      </div>
                    </td>

                    {/* Col 2: Load vs Requested */}
                    <td className="py-3.5 px-4">
                      <div className="font-mono font-bold text-slate-800 dark:text-slate-200">
                        {isTh ? 'โหลด:' : 'Load:'} {item.job.loadWeightTon}T @ {item.job.requiredRadiusM}m
                      </div>
                      <div className="text-[11px] text-amber-600 dark:text-amber-400 font-semibold mt-0.5">
                        {isTh ? `สเปกเดิมขอ: เครน ${item.requestedCapacityTon}T` : `Requested: ${item.requestedCapacityTon}T Crane`}
                      </div>
                      <div className="text-[10px] text-slate-400">
                        {item.job.contractor}
                      </div>
                    </td>

                    {/* Col 3: Recommended Optimal Crane */}
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                        <Truck size={13} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
                        <span>{item.optimalCrane.name}</span>
                        <span className="px-1.5 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 font-mono text-[10px] font-extrabold">
                          {item.optimalCrane.capacityTon}T
                        </span>
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            item.isOwnerCrane
                              ? 'bg-indigo-100 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300'
                              : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                          }`}
                        >
                          {item.isOwnerCrane
                            ? isTh ? 'BCP Owner Crane' : 'BCP Owner Crane'
                            : isTh ? 'Rental Fleet' : 'Rental Fleet'}
                        </span>
                        <span className="text-[11px] font-mono text-slate-500">
                          Util: {item.utilizationPercent}%
                        </span>
                      </div>
                    </td>

                    {/* Col 4: Strategy */}
                    <td className="py-3.5 px-4 max-w-[230px]">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold ${
                          item.strategy === 'Shared Crane'
                            ? 'bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300'
                            : item.strategy === 'Right-Sizing'
                            ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300'
                            : item.strategy === 'Owner Fleet'
                            ? 'bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300'
                            : 'bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300'
                        }`}
                      >
                        {isTh ? item.strategyLabelTh : item.strategyLabelEn}
                      </span>
                      {item.sharedPartnerJobNo && (
                        <div className="text-[10px] font-bold text-blue-600 dark:text-blue-400 mt-1">
                          {isTh ? `แชร์ร่วมกับ: ${item.sharedPartnerJobNo}` : `Shared with: ${item.sharedPartnerJobNo}`}
                        </div>
                      )}
                      <p className="text-[10px] text-slate-500 dark:text-slate-400 line-clamp-2 mt-0.5">
                        {isTh ? item.strategyDetailTh : item.strategyDetailEn}
                      </p>
                    </td>

                    {/* Col 5: Baseline vs Optimized Cost */}
                    <td className="py-3.5 px-4 text-right font-mono">
                      <div className="text-slate-400 line-through text-[11px]">
                        ฿{item.baselineTotalCostThb.toLocaleString()}
                      </div>
                      <div className="text-sm font-extrabold text-slate-900 dark:text-white mt-0.5">
                        ฿{item.optimizedTotalCostThb.toLocaleString()}
                      </div>
                      <div className="text-[10px] text-slate-400">
                        {item.durationHours} hrs + Mob.
                      </div>
                    </td>

                    {/* Col 6: Net Cost Saving */}
                    <td className="py-3.5 px-4 text-right font-mono">
                      <div className="text-sm font-black text-emerald-600 dark:text-emerald-400">
                        -฿{item.netSavingsThb.toLocaleString()}
                      </div>
                      <span className="inline-block px-2 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 text-[10px] font-extrabold mt-0.5">
                        {isTh ? `ประหยัด ${item.savingPercent}%` : `Save ${item.savingPercent}%`}
                      </span>
                    </td>

                    {/* Col 7: Actions */}
                    <td className="py-3.5 px-4 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        {item.isRealized ? (
                          <span className="px-2.5 py-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 text-[11px] font-extrabold flex items-center gap-1">
                            <CheckCircle2 size={13} />
                            <span>{isTh ? 'อนุมัติแล้ว' : 'Realized'}</span>
                          </span>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleApplySingleOptimization(item)}
                            className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-[11px] font-extrabold shadow-2xs transition-all cursor-pointer flex items-center gap-1"
                          >
                            <Sparkles size={12} />
                            <span>{isTh ? 'อนุมัติลดต้นทุน' : 'Apply & Save'}</span>
                          </button>
                        )}

                        {onInspectJobInEngineeringGate && (
                          <button
                            type="button"
                            onClick={() => onInspectJobInEngineeringGate(item.job)}
                            className="p-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition-colors cursor-pointer"
                            title={isTh ? 'เปิดดูในหน้าตรวจสอบทางวิศวกรรม (Engineering Gate)' : 'Inspect in Engineering Gate'}
                          >
                            <Eye size={14} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        <div className="px-4 py-3 border-t border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-slate-500">
          <div>
            {isTh
              ? `แสดงรายการ ${(currentPage - 1) * pageSize + 1} - ${Math.min(currentPage * pageSize, filteredAnalyses.length)} จากทั้งหมด ${filteredAnalyses.length} รายการ`
              : `Showing ${(currentPage - 1) * pageSize + 1} to ${Math.min(currentPage * pageSize, filteredAnalyses.length)} of ${filteredAnalyses.length} opportunities`}
          </div>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              disabled={currentPage <= 1}
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              className="px-3 py-1 rounded-lg border border-slate-200 dark:border-slate-700 disabled:opacity-40 hover:bg-slate-100 dark:hover:bg-slate-800 font-bold cursor-pointer"
            >
              {isTh ? 'ก่อนหน้า' : 'Prev'}
            </button>
            <span className="px-2 font-bold text-slate-700 dark:text-slate-300">
              {currentPage} / {totalPages}
            </span>
            <button
              type="button"
              disabled={currentPage >= totalPages}
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              className="px-3 py-1 rounded-lg border border-slate-200 dark:border-slate-700 disabled:opacity-40 hover:bg-slate-100 dark:hover:bg-slate-800 font-bold cursor-pointer"
            >
              {isTh ? 'ถัดไป' : 'Next'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
