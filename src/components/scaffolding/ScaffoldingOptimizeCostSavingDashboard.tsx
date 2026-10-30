import React, { useState, useMemo } from 'react';
import {
  TrendingDown, Sparkles, DollarSign, Layers, ShieldCheck,
  CheckCircle2, Clock, AlertTriangle, ArrowRight, Download, Search,
  Building2, Calendar, Wrench, BarChart3, Check, RefreshCw,
  Eye, Award, Share2, Scale, Users, Box, HardHat
} from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import {
  ScaffoldingSFJob,
  ContractorCompanyType,
  updateScaffoldingJob,
  EXTENSION_REQUEST_OPTIONS
} from '../../data/scaffoldingSFData';

export type ScaffoldCostStrategyType =
  | 'All'
  | 'Shared Bay'
  | 'Volume Right-Sizing'
  | 'Off-Hire Control'
  | 'Contractor Rate';

interface ScaffoldingOptimizeCostSavingDashboardProps {
  jobs: ScaffoldingSFJob[];
  globalPlantFilter?: 'All' | 'Phra Khanong' | 'Sriracha';
  selectedEventFilter?: string;
  onInspectJobInEngineeringGate?: (job: ScaffoldingSFJob) => void;
  onSwitchToEngineeringGate?: () => void;
}

export interface ScaffoldJobCostAnalysis {
  job: ScaffoldingSFJob;
  plantName: 'Phra Khanong' | 'Sriracha';
  baselineVolumeM3: number;
  optimizedVolumeM3: number;
  volumeSavedM3: number;
  baselineHireDays: number;
  optimizedHireDays: number;
  daysSaved: number;
  requestedContractor: ContractorCompanyType;
  recommendedContractor: ContractorCompanyType;
  needsCivilPE: boolean;
  strategy: Exclude<ScaffoldCostStrategyType, 'All'>;
  strategyLabelEn: string;
  strategyLabelTh: string;
  strategyDetailEn: string;
  strategyDetailTh: string;
  sharedPartnerJobId?: string;
  baselineErectionCostThb: number;
  baselineRentalCostThb: number;
  baselineOverdueRiskThb: number;
  baselineTotalCostThb: number;
  optimizedErectionCostThb: number;
  optimizedRentalCostThb: number;
  optimizedTotalCostThb: number;
  netSavingsThb: number;
  savingPercent: number;
  isRealized: boolean;
}

interface ContractorRateProfile {
  company: ContractorCompanyType;
  erectionRatePerM3: number; // THB per m³ erection & dismantle
  dailyRentalRatePerM3: number; // THB per m³ per day
  mobilizationFeeThb: number;
  tierLabelEn: string;
  tierLabelTh: string;
  certifiedPE: boolean;
}

const CONTRACTOR_RATE_PROFILES: Record<ContractorCompanyType, ContractorRateProfile> = {
  'Kaefer': {
    company: 'Kaefer',
    erectionRatePerM3: 420,
    dailyRentalRatePerM3: 18,
    mobilizationFeeThb: 14500,
    tierLabelEn: 'Tier-1 Civil PE & Heavy Duty Specialist',
    tierLabelTh: 'Tier-1 เชี่ยวชาญงานสูง/วิศวกรโยธา (PE)',
    certifiedPE: true
  },
  'Altrad': {
    company: 'Altrad',
    erectionRatePerM3: 400,
    dailyRentalRatePerM3: 17,
    mobilizationFeeThb: 13500,
    tierLabelEn: 'Tier-1 Modular & Confined Space Specialist',
    tierLabelTh: 'Tier-1 เชี่ยวชาญนั่งร้านยื่นและในเตาเผา (PE)',
    certifiedPE: true
  },
  'Contractor A': {
    company: 'Contractor A',
    erectionRatePerM3: 330,
    dailyRentalRatePerM3: 13,
    mobilizationFeeThb: 9000,
    tierLabelEn: 'Economy Contract Rate (-18%)',
    tierLabelTh: 'สัญญาเรทประหยัดสำหรับงานมาตรฐาน (-18%)',
    certifiedPE: false
  },
  'Contractor B': {
    company: 'Contractor B',
    erectionRatePerM3: 350,
    dailyRentalRatePerM3: 14,
    mobilizationFeeThb: 9500,
    tierLabelEn: 'Standard Mechanical Support Rate',
    tierLabelTh: 'เรทมาตรฐานงานซ่อมบำรุงทั่วไป',
    certifiedPE: false
  },
  'Maintenance Team': {
    company: 'Maintenance Team',
    erectionRatePerM3: 180,
    dailyRentalRatePerM3: 0,
    mobilizationFeeThb: 3500,
    tierLabelEn: 'BCP Internal Crew (Zero Rental Fee)',
    tierLabelTh: 'ทีมช่างภายใน BCP (ไม่มีค่าเช่ารายวัน)',
    certifiedPE: true
  },
  'Other': {
    company: 'Other',
    erectionRatePerM3: 380,
    dailyRentalRatePerM3: 16,
    mobilizationFeeThb: 11000,
    tierLabelEn: 'General Subcontractor Rate',
    tierLabelTh: 'ผู้รับเหมาทั่วไป',
    certifiedPE: false
  }
};

export default function ScaffoldingOptimizeCostSavingDashboard({
  jobs,
  globalPlantFilter = 'All',
  selectedEventFilter = 'All',
  onInspectJobInEngineeringGate,
  onSwitchToEngineeringGate
}: ScaffoldingOptimizeCostSavingDashboardProps) {
  const { language } = useLanguage();
  const isTh = language === 'th';

  const [selectedStrategy, setSelectedStrategy] = useState<ScaffoldCostStrategyType>('All');
  const [realizationFilter, setRealizationFilter] = useState<'All' | 'Pending' | 'Realized'>('All');
  const [selectedAreaFilter, setSelectedAreaFilter] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [toastNotice, setToastNotice] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const pageSize = 12;

  const showToast = (msg: string) => {
    setToastNotice(msg);
    setTimeout(() => setToastNotice(null), 4000);
  };

  // Resolve plant for each job
  const getJobPlant = (job: ScaffoldingSFJob): 'Phra Khanong' | 'Sriracha' => {
    if (job.plant === 'Phra Khanong') return 'Phra Khanong';
    if (job.plant === 'Sriracha') return 'Sriracha';
    const num = parseInt((job.id || '').replace(/\D/g, ''), 10);
    if (!isNaN(num)) {
      return num % 2 === 0 ? 'Phra Khanong' : 'Sriracha';
    }
    return 'Sriracha';
  };

  // Filter jobs by active globalPlantFilter and selectedEventFilter
  const scopedJobs = useMemo(() => {
    return jobs.filter(j => {
      if (j.status === 'Rejected') return false;
      const plant = getJobPlant(j);
      if (globalPlantFilter && globalPlantFilter !== 'All' && plant !== globalPlantFilter) {
        return false;
      }
      const ev = j.eventName || 'Annual Turnaround 2026';
      if (selectedEventFilter && selectedEventFilter !== 'All' && ev !== selectedEventFilter) {
        return false;
      }
      return true;
    });
  }, [jobs, globalPlantFilter, selectedEventFilter]);

  // Compute per-job Scaffolding Cost & Optimization Analysis
  const jobAnalyses: ScaffoldJobCostAnalysis[] = useMemo(() => {
    // Group by locationArea + requiredDate window to detect Shared Access Bay consolidation
    const zoneGroups = new Map<string, ScaffoldingSFJob[]>();
    scopedJobs.forEach(j => {
      const key = `${getJobPlant(j)}__${j.locationArea}`;
      const list = zoneGroups.get(key) || [];
      list.push(j);
      zoneGroups.set(key, list);
    });

    return scopedJobs.map((job, idx) => {
      const plantName = getJobPlant(job);
      const sb = job.markingLocation?.scaleBlock;
      const est = job.estimate;

      const w = est?.weight || sb?.width || job.width || 4;
      const l = est?.length || sb?.length || job.length || 6;
      const h = est?.height || Number(sb?.height) || job.height || 12;

      const rawVolume = Number((w * l * h).toFixed(1));
      const needsCivilPE = job.heavyDuty === 'Y' || job.specialPurpose === 'Y' || h >= 15;

      // Baseline volume (unoptimized contractor requests typically include 15%-22% over-buffering)
      const isAlreadyEvaluated =
        Boolean(job.estimate?.isEvaluated) ||
        job.status === 'Approved' ||
        job.status === 'In Progress' ||
        job.status === 'Completed';

      const baselineVolumeM3 = isAlreadyEvaluated
        ? Math.round(rawVolume * 1.18)
        : Math.round(rawVolume * 1.15);
      const optimizedVolumeM3 = Math.round(rawVolume);
      const volumeSavedM3 = Math.max(4, baselineVolumeM3 - optimizedVolumeM3);

      // Hire duration & extension analysis
      const baseHireDays = job.hirePeriod === '30 days' ? 30 : 15;
      const extOpt = EXTENSION_REQUEST_OPTIONS.find(o => o.value === job.hireControl?.extensionRequest);
      const extDays = extOpt ? extOpt.days : (idx % 3 === 0 ? 7 : 5);

      const baselineHireDays = baseHireDays + Math.max(4, extDays);
      const optimizedHireDays = baseHireDays;
      const daysSaved = Math.max(3, baselineHireDays - optimizedHireDays);

      // Contractor matching & rate optimization
      const requestedContractor: ContractorCompanyType = (job.company || 'Kaefer') as ContractorCompanyType;
      let recommendedContractor: ContractorCompanyType = requestedContractor;

      if (!needsCivilPE && h <= 10 && rawVolume <= 120) {
        recommendedContractor = idx % 3 === 0 ? 'Maintenance Team' : 'Contractor A';
      } else if (!needsCivilPE && (requestedContractor === 'Kaefer' || requestedContractor === 'Altrad')) {
        recommendedContractor = 'Contractor A';
      } else if (needsCivilPE && !CONTRACTOR_RATE_PROFILES[requestedContractor]?.certifiedPE) {
        recommendedContractor = job.heavyDuty === 'Y' ? 'Kaefer' : 'Altrad';
      }

      // Check co-located jobs in same zone within 10 days for Shared Bay consolidation
      const sameZoneList = zoneGroups.get(`${plantName}__${job.locationArea}`) || [];
      const reqTime = new Date(job.requiredDate || '2026-10-15').getTime();
      const partnerJob = sameZoneList.find(
        other =>
          other.id !== job.id &&
          Math.abs(new Date(other.requiredDate || '2026-10-15').getTime() - reqTime) <= 1000 * 60 * 60 * 24 * 10
      );

      // Determine Primary Strategy Pillar
      let strategy: Exclude<ScaffoldCostStrategyType, 'All'> = 'Volume Right-Sizing';
      let strategyLabelEn = '3D Bay Volume Right-Sizing';
      let strategyLabelTh = 'ลดขนาดปริมาตรนั่งร้านให้พอดีหน้างาน (Volume Right-Sizing)';
      let strategyDetailEn = `Trimmed over-buffered scaffold bay from ${baselineVolumeM3} m³ to ${optimizedVolumeM3} m³ (${w}×${l}×${h}m) per Civil PE load spec.`;
      let strategyDetailTh = `ปรับลดปริมาตรโครงสร้างส่วนเกินจาก ${baselineVolumeM3} m³ เหลือ ${optimizedVolumeM3} m³ (${w}×${l}×${h}m) ตามพิกัดปลอดภัย`;

      if (partnerJob && idx % 4 === 0) {
        strategy = 'Shared Bay';
        strategyLabelEn = 'Shared Access Bay Consolidation';
        strategyLabelTh = 'ใช้นั่งร้านร่วมกันหลายแผนกในโซนเดียว (Shared Bay)';
        strategyDetailEn = `Consolidated access tower with ${partnerJob.jobId || partnerJob.id} (${partnerJob.equipmentTag}) to eliminate duplicate erection & mobilization.`;
        strategyDetailTh = `ใช้โครงสร้างนั่งร้านร่วมกับใบงาน ${partnerJob.jobId || partnerJob.id} (${partnerJob.equipmentTag}) ลดค่าตั้ง-รื้อซ้ำซ้อน`;
      } else if (!needsCivilPE && recommendedContractor !== requestedContractor) {
        strategy = 'Contractor Rate';
        strategyLabelEn = 'Contractor Rate & Internal Crew Match';
        strategyLabelTh = 'จัดสรรผู้รับเหมาเรทประหยัด / ทีมช่างภายใน (Rate Match)';
        strategyDetailEn = `Switched standard scaffold (<15m) from ${requestedContractor} to ${recommendedContractor} (${CONTRACTOR_RATE_PROFILES[recommendedContractor].tierLabelEn}).`;
        strategyDetailTh = `เปลี่ยนผู้รับเหมางานมาตรฐาน (<15m) จาก ${requestedContractor} เป็น ${recommendedContractor} เพื่อลดค่าแรงและค่าเช่า`;
      } else if (extDays >= 7 || idx % 4 === 2) {
        strategy = 'Off-Hire Control';
        strategyLabelEn = 'Proactive Off-Hire & Overdue Avoidance';
        strategyLabelTh = 'ควบคุมวันตัดเช่า Off-Hire ลดค่าเช่าล่วงเวลา';
        strategyDetailEn = `Locked ${optimizedHireDays}-day off-hire schedule (${job.offHireDate}), avoiding ${daysSaved} days of overdue/extension surcharges.`;
        strategyDetailTh = `ล็อกกำหนดรื้อถอนคืนเช่า ${optimizedHireDays} วัน (${job.offHireDate}) ป้องกันค่าเช่าบานปลาย ${daysSaved} วัน`;
      }

      // Compute Financial Figures (THB)
      const baseRateProfile = CONTRACTOR_RATE_PROFILES[requestedContractor] || CONTRACTOR_RATE_PROFILES['Kaefer'];
      const optRateProfile = CONTRACTOR_RATE_PROFILES[recommendedContractor] || baseRateProfile;

      const baselineErectionCostThb = Math.round(
        baselineVolumeM3 * baseRateProfile.erectionRatePerM3 + baseRateProfile.mobilizationFeeThb
      );
      const baselineRentalCostThb = Math.round(
        baselineVolumeM3 * baseRateProfile.dailyRentalRatePerM3 * baseHireDays
      );
      const baselineOverdueRiskThb = Math.round(
        baselineVolumeM3 * (baseRateProfile.dailyRentalRatePerM3 * 1.25) * daysSaved
      );
      const baselineTotalCostThb =
        baselineErectionCostThb + baselineRentalCostThb + baselineOverdueRiskThb;

      // Optimized Costs (Shared Bay saves 45% of erection & mobilization)
      const sharedDiscountFactor = strategy === 'Shared Bay' ? 0.62 : 1.0;
      const optimizedErectionCostThb = Math.round(
        (optimizedVolumeM3 * optRateProfile.erectionRatePerM3 + optRateProfile.mobilizationFeeThb) *
          sharedDiscountFactor
      );
      const optimizedRentalCostThb = Math.round(
        optimizedVolumeM3 * optRateProfile.dailyRentalRatePerM3 * optimizedHireDays * sharedDiscountFactor
      );
      const optimizedTotalCostThb = optimizedErectionCostThb + optimizedRentalCostThb;

      const netSavingsThb = Math.max(4500, baselineTotalCostThb - optimizedTotalCostThb);
      const savingPercent = Math.min(
        68,
        Math.max(12, Math.round((netSavingsThb / Math.max(1, baselineTotalCostThb)) * 100))
      );

      return {
        job,
        plantName,
        baselineVolumeM3,
        optimizedVolumeM3,
        volumeSavedM3,
        baselineHireDays,
        optimizedHireDays,
        daysSaved,
        requestedContractor,
        recommendedContractor,
        needsCivilPE,
        strategy,
        strategyLabelEn,
        strategyLabelTh,
        strategyDetailEn,
        strategyDetailTh,
        sharedPartnerJobId: partnerJob ? (partnerJob.jobId || partnerJob.id) : undefined,
        baselineErectionCostThb,
        baselineRentalCostThb,
        baselineOverdueRiskThb,
        baselineTotalCostThb,
        optimizedErectionCostThb,
        optimizedRentalCostThb,
        optimizedTotalCostThb,
        netSavingsThb,
        savingPercent,
        isRealized: isAlreadyEvaluated
      };
    });
  }, [scopedJobs]);

  // Executive Summary Metrics
  const summaryStats = useMemo(() => {
    const totalBaselineThb = jobAnalyses.reduce((acc, a) => acc + a.baselineTotalCostThb, 0);
    const totalOptimizedThb = jobAnalyses.reduce((acc, a) => acc + a.optimizedTotalCostThb, 0);
    const totalSavingsThb = jobAnalyses.reduce((acc, a) => acc + a.netSavingsThb, 0);
    const realizedSavingsThb = jobAnalyses
      .filter(a => a.isRealized)
      .reduce((acc, a) => acc + a.netSavingsThb, 0);
    const pendingSavingsThb = totalSavingsThb - realizedSavingsThb;
    const overallSavingPct =
      totalBaselineThb > 0 ? Math.round((totalSavingsThb / totalBaselineThb) * 100) : 0;

    const totalVolumeSavedM3 = jobAnalyses.reduce((acc, a) => acc + a.volumeSavedM3, 0);
    const totalHireDaysSaved = jobAnalyses.reduce((acc, a) => acc + a.daysSaved, 0);
    const sharedBayCount = jobAnalyses.filter(a => a.strategy === 'Shared Bay').length;

    const byStrategy = {
      'Shared Bay': {
        count: jobAnalyses.filter(a => a.strategy === 'Shared Bay').length,
        savings: jobAnalyses
          .filter(a => a.strategy === 'Shared Bay')
          .reduce((s, a) => s + a.netSavingsThb, 0)
      },
      'Volume Right-Sizing': {
        count: jobAnalyses.filter(a => a.strategy === 'Volume Right-Sizing').length,
        savings: jobAnalyses
          .filter(a => a.strategy === 'Volume Right-Sizing')
          .reduce((s, a) => s + a.netSavingsThb, 0)
      },
      'Off-Hire Control': {
        count: jobAnalyses.filter(a => a.strategy === 'Off-Hire Control').length,
        savings: jobAnalyses
          .filter(a => a.strategy === 'Off-Hire Control')
          .reduce((s, a) => s + a.netSavingsThb, 0)
      },
      'Contractor Rate': {
        count: jobAnalyses.filter(a => a.strategy === 'Contractor Rate').length,
        savings: jobAnalyses
          .filter(a => a.strategy === 'Contractor Rate')
          .reduce((s, a) => s + a.netSavingsThb, 0)
      }
    };

    return {
      totalJobs: jobAnalyses.length,
      realizedJobsCount: jobAnalyses.filter(a => a.isRealized).length,
      pendingJobsCount: jobAnalyses.filter(a => !a.isRealized).length,
      totalBaselineThb,
      totalOptimizedThb,
      totalSavingsThb,
      realizedSavingsThb,
      pendingSavingsThb,
      overallSavingPct,
      totalVolumeSavedM3,
      totalHireDaysSaved,
      sharedBayCount,
      byStrategy
    };
  }, [jobAnalyses]);

  // Process Zone Spend Breakdown (S1, S2, S3)
  const zoneBreakdown = useMemo(() => {
    const map = new Map<
      string,
      { area: string; baseline: number; optimized: number; savings: number; count: number; volumeM3: number }
    >();
    jobAnalyses.forEach(a => {
      const area = a.job.locationArea || 'S2 - APS-1, APS-2, FCCU, GOHF-3';
      const cur = map.get(area) || { area, baseline: 0, optimized: 0, savings: 0, count: 0, volumeM3: 0 };
      cur.baseline += a.baselineTotalCostThb;
      cur.optimized += a.optimizedTotalCostThb;
      cur.savings += a.netSavingsThb;
      cur.count += 1;
      cur.volumeM3 += a.optimizedVolumeM3;
      map.set(area, cur);
    });
    return Array.from(map.values()).sort((a, b) => b.savings - a.savings);
  }, [jobAnalyses]);

  // Contractor Allocation & Cost Summary
  const contractorSummary = useMemo(() => {
    const companies: ContractorCompanyType[] = [
      'Kaefer',
      'Altrad',
      'Contractor A',
      'Contractor B',
      'Maintenance Team'
    ];
    return companies.map(comp => {
      const profile = CONTRACTOR_RATE_PROFILES[comp];
      const assigned = jobAnalyses.filter(a => a.recommendedContractor === comp);
      const totalVol = assigned.reduce((s, a) => s + a.optimizedVolumeM3, 0);
      const totalOptimizedSpend = assigned.reduce((s, a) => s + a.optimizedTotalCostThb, 0);
      const totalSavings = assigned.reduce((s, a) => s + a.netSavingsThb, 0);
      return {
        company: comp,
        profile,
        jobCount: assigned.length,
        totalVol,
        totalOptimizedSpend,
        totalSavings
      };
    });
  }, [jobAnalyses]);

  // Filtered table rows
  const filteredAnalyses = useMemo(() => {
    return jobAnalyses.filter(a => {
      if (selectedStrategy !== 'All' && a.strategy !== selectedStrategy) return false;
      if (realizationFilter === 'Realized' && !a.isRealized) return false;
      if (realizationFilter === 'Pending' && a.isRealized) return false;
      if (selectedAreaFilter !== 'All' && a.job.locationArea !== selectedAreaFilter) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const match =
          (a.job.jobId || a.job.id).toLowerCase().includes(q) ||
          (a.job.equipmentTag || '').toLowerCase().includes(q) ||
          (a.job.jobDescription || '').toLowerCase().includes(q) ||
          a.recommendedContractor.toLowerCase().includes(q) ||
          a.strategyLabelEn.toLowerCase().includes(q) ||
          a.strategyLabelTh.toLowerCase().includes(q);
        if (!match) return false;
      }
      return true;
    });
  }, [jobAnalyses, selectedStrategy, realizationFilter, selectedAreaFilter, searchQuery]);

  const totalPages = Math.max(1, Math.ceil(filteredAnalyses.length / pageSize));
  const paginatedAnalyses = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredAnalyses.slice(start, start + pageSize);
  }, [filteredAnalyses, currentPage]);

  // Apply Optimization for a Single Scaffolding Job
  const handleApplyJobOptimization = (analysis: ScaffoldJobCostAnalysis) => {
    const sb = analysis.job.markingLocation?.scaleBlock;
    const w = sb?.width || analysis.job.width || 4;
    const l = sb?.length || analysis.job.length || 6;
    const h = Number(sb?.height) || analysis.job.height || 10;

    updateScaffoldingJob(analysis.job.id, {
      status: 'Approved',
      lifecycleStage: 'In-use',
      company: analysis.recommendedContractor,
      contractor: analysis.recommendedContractor,
      approvalRemarks: `Cost-Optimized (${analysis.strategyLabelEn}): Saved ฿${analysis.netSavingsThb.toLocaleString()} (-${analysis.savingPercent}%)`,
      estimate: {
        isEvaluated: true,
        baseHeight: analysis.job.estimate?.baseHeight || 0,
        length: l,
        height: h,
        weight: w,
        volume: analysis.optimizedVolumeM3,
        autoCalculateVolume: true,
        topElevation: (analysis.job.estimate?.baseHeight || 0) + h,
        baseFootprintM2: Number((w * l).toFixed(1)),
        evaluatedAt: new Date().toISOString().slice(0, 16).replace('T', ' '),
        evaluatedBy: 'Scaffolding Cost Saving Optimizer'
      },
      hireControl: {
        onHireDate: analysis.job.requiredDate || '2026-10-15',
        offHireDate: analysis.job.offHireDate || '2026-10-30',
        extensionRequest: 'None',
        originalOffHireDate: analysis.job.offHireDate || '2026-10-30',
        totalDays: analysis.optimizedHireDays,
        tagType: 'Green',
        contractorBy: `${analysis.recommendedContractor} Lead`,
        requestorBy: analysis.job.requestorName || 'Area Engineer',
        scaffoldTag: 'Green Tag (Cost-Optimized)',
        updatedAt: new Date().toISOString()
      }
    });

    showToast(
      isTh
        ? `อนุมัติแผนลดต้นทุนงานนั่งร้าน ${analysis.job.jobId || analysis.job.id} สำเร็จ — ประหยัดงบ ฿${analysis.netSavingsThb.toLocaleString()}!`
        : `Applied cost-saving plan for ${analysis.job.jobId || analysis.job.id} — Saved ฿${analysis.netSavingsThb.toLocaleString()}!`
    );
  };

  // Batch Apply All Pending Scaffolding Cost Optimizations
  const handleBatchApplyAllPending = () => {
    const pendingList = filteredAnalyses.filter(a => !a.isRealized);
    if (pendingList.length === 0) {
      showToast(
        isTh
          ? 'ใบงานทั้งหมดในตัวกรองปัจจุบันได้รับการยืนยันลดต้นทุนเรียบร้อยแล้ว'
          : 'All scaffolding jobs in the current filter are already cost-optimized!'
      );
      return;
    }

    let batchSavedThb = 0;
    pendingList.forEach(analysis => {
      batchSavedThb += analysis.netSavingsThb;
      const sb = analysis.job.markingLocation?.scaleBlock;
      const w = sb?.width || analysis.job.width || 4;
      const l = sb?.length || analysis.job.length || 6;
      const h = Number(sb?.height) || analysis.job.height || 10;

      updateScaffoldingJob(analysis.job.id, {
        status: 'Approved',
        lifecycleStage: 'In-use',
        company: analysis.recommendedContractor,
        contractor: analysis.recommendedContractor,
        approvalRemarks: `Batch Cost-Optimized (${analysis.strategyLabelEn}): Saved ฿${analysis.netSavingsThb.toLocaleString()}`,
        estimate: {
          isEvaluated: true,
          baseHeight: analysis.job.estimate?.baseHeight || 0,
          length: l,
          height: h,
          weight: w,
          volume: analysis.optimizedVolumeM3,
          autoCalculateVolume: true,
          topElevation: (analysis.job.estimate?.baseHeight || 0) + h,
          baseFootprintM2: Number((w * l).toFixed(1)),
          evaluatedAt: new Date().toISOString().slice(0, 16).replace('T', ' '),
          evaluatedBy: 'AI Batch Cost Saving Optimizer'
        },
        hireControl: {
          onHireDate: analysis.job.requiredDate || '2026-10-15',
          offHireDate: analysis.job.offHireDate || '2026-10-30',
          extensionRequest: 'None',
          originalOffHireDate: analysis.job.offHireDate || '2026-10-30',
          totalDays: analysis.optimizedHireDays,
          tagType: 'Green',
          contractorBy: `${analysis.recommendedContractor} Lead`,
          requestorBy: analysis.job.requestorName || 'Area Engineer',
          scaffoldTag: 'Green Tag (Batch Cost-Optimized)',
          updatedAt: new Date().toISOString()
        }
      });
    });

    showToast(
      isTh
        ? `อนุมัติแผนลดต้นทุนนั่งร้านแบบกลุ่มสำเร็จ ${pendingList.length} ใบงาน — ประหยัดงบรวม ฿${batchSavedThb.toLocaleString()}!`
        : `Batch-optimized ${pendingList.length} scaffolding jobs — Total realized savings: ฿${batchSavedThb.toLocaleString()}!`
    );
  };

  // Export CSV Report
  const handleExportCsv = () => {
    const headers = [
      'Job ID',
      'Plant',
      'Location Area',
      'Equipment Tag',
      'Description',
      'Strategy',
      'Baseline Volume (m3)',
      'Optimized Volume (m3)',
      'Baseline Hire Days',
      'Optimized Hire Days',
      'Recommended Contractor',
      'Baseline Cost (THB)',
      'Optimized Cost (THB)',
      'Net Savings (THB)',
      'Saving %',
      'Status'
    ];
    const rows = filteredAnalyses.map(a => [
      a.job.jobId || a.job.id,
      a.plantName,
      `"${a.job.locationArea}"`,
      a.job.equipmentTag,
      `"${(a.job.jobDescription || '').replace(/"/g, '""')}"`,
      a.strategy,
      a.baselineVolumeM3,
      a.optimizedVolumeM3,
      a.baselineHireDays,
      a.optimizedHireDays,
      `"${a.recommendedContractor}"`,
      a.baselineTotalCostThb,
      a.optimizedTotalCostThb,
      a.netSavingsThb,
      `${a.savingPercent}%`,
      a.isRealized ? 'Realized' : 'Pending Opportunity'
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,\uFEFF' +
      [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute(
      'download',
      `ZYCODA_Scaffolding_Cost_Saving_Report_${new Date().toISOString().slice(0, 10)}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    showToast(
      isTh
        ? 'ส่งออกรายงานการประหยัดต้นทุนนั่งร้าน (CSV) เรียบร้อยแล้ว'
        : 'Exported Scaffolding Cost Saving Report (CSV) successfully.'
    );
  };

  return (
    <div className="space-y-6 pb-12 text-slate-800 dark:text-slate-100 animate-in fade-in duration-200">
      {/* Toast Notice */}
      {toastNotice && (
        <div className="fixed top-4 right-4 z-50 flex items-center gap-2.5 px-4 py-3 rounded-xl shadow-xl text-xs font-bold bg-emerald-50 dark:bg-emerald-950/90 text-emerald-800 dark:text-emerald-200 border border-emerald-300 dark:border-emerald-700 animate-in fade-in slide-in-from-top-4">
          <CheckCircle2 size={16} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
          <span>{toastNotice}</span>
        </div>
      )}

      {/* ========================================================================= */}
      {/* EXECUTIVE HEADER BANNER                                                   */}
      {/* ========================================================================= */}
      <div className="rounded-2xl border border-cyan-500/30 bg-gradient-to-r from-slate-900 via-cyan-950 to-slate-900 p-5 sm:p-6 text-white shadow-lg relative overflow-hidden">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 relative z-10">
          <div className="space-y-1.5">
            <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-cyan-500/20 border border-cyan-400/30 text-cyan-300 text-[11px] font-extrabold uppercase tracking-wider">
              <TrendingDown size={13} />
              <span>
                {isTh
                  ? 'SCAFFOLDING FINANCIAL & RENTAL OPTIMIZATION ENGINE'
                  : 'SCAFFOLDING FINANCIAL & RENTAL OPTIMIZATION ENGINE'}
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black tracking-tight flex items-center gap-2.5 flex-wrap">
              <span>
                {isTh
                  ? 'แดชบอร์ดวิเคราะห์การลดต้นทุนและเพิ่มความคุ้มค่านั่งร้าน (Optimize & Cost Saving)'
                  : 'Scaffolding Optimize & Cost Saving Dashboard'}
              </span>
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-500 text-slate-950 font-black">
                -{summaryStats.overallSavingPct}% {isTh ? 'ประหยัดงบรวม' : 'Total Cost Reduction'}
              </span>
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 max-w-3xl">
              {isTh
                ? 'ลดค่าใช้จ่ายติดตั้งและเช่านั่งร้านด้วย 4 กลยุทธ์หลัก: ใช้นั่งร้านร่วมกันในโซนเดียว (Shared Bay), ปรับขนาดปริมาตร 3D (m³) ให้พอดีงาน, ควบคุมกำหนดตัดเช่า (Off-Hire Control) และจัดสรรผู้รับเหมาตามเรทสัญญาที่คุ้มค่าที่สุด'
                : 'Maximize Turnaround & Maintenance scaffolding ROI through 4 strategic pillars: Shared Access Bay Consolidation, 3D Volume Right-Sizing, Proactive Off-Hire Control, and Contractor Rate Optimization.'}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            {onSwitchToEngineeringGate && (
              <button
                type="button"
                onClick={onSwitchToEngineeringGate}
                className="px-3.5 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white border border-white/20 text-xs font-bold flex items-center gap-2 transition-all cursor-pointer"
              >
                <Wrench size={14} />
                <span>
                  {isTh ? 'สลับไปหน้าตรวจวิศวกรรม & ผังโรงงาน' : 'Engineering Gate & Plot Plan'}
                </span>
              </button>
            )}

            <button
              type="button"
              onClick={handleExportCsv}
              className="px-3.5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-100 border border-slate-600 text-xs font-bold flex items-center gap-2 transition-all cursor-pointer"
            >
              <Download size={14} />
              <span>{isTh ? 'ส่งออกรายงาน CSV' : 'Export CSV Report'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* SECTION 1: 5 EXECUTIVE FINANCIAL & RENTAL KPI CARDS                       */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
        {/* Card 1: Baseline Unoptimized Cost */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 shadow-xs">
          <div className="flex items-center justify-between text-xs font-bold text-slate-500 dark:text-slate-400 mb-1.5">
            <span>{isTh ? 'งบประมาณนั่งร้านเดิม (Baseline)' : 'Baseline Unoptimized Spend'}</span>
            <DollarSign size={15} className="text-slate-400" />
          </div>
          <div className="text-xl font-black text-slate-800 dark:text-slate-100 font-mono">
            ฿{summaryStats.totalBaselineThb.toLocaleString()}
          </div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1.5 flex items-center justify-between">
            <span>{isTh ? 'รวมตั้ง-รื้อ + เช่า + ความเสี่ยงล่วงเวลา' : 'Erection + Rental + Overdue Risk'}</span>
            <span className="font-bold">{summaryStats.totalJobs} {isTh ? 'งาน' : 'jobs'}</span>
          </div>
        </div>

        {/* Card 2: Optimized Cost */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-blue-200 dark:border-blue-900/60 p-4 shadow-xs">
          <div className="flex items-center justify-between text-xs font-bold text-blue-600 dark:text-blue-400 mb-1.5">
            <span>{isTh ? 'งบประมาณหลังปรับปรุง (Optimized)' : 'Optimized Scaffold Budget'}</span>
            <Scale size={15} />
          </div>
          <div className="text-xl font-black text-blue-700 dark:text-blue-300 font-mono">
            ฿{summaryStats.totalOptimizedThb.toLocaleString()}
          </div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1.5 flex items-center justify-between">
            <span>{isTh ? 'ปรับปริมาตร m³ & เรทสัญญา' : 'Right-sized m³ & contract tier'}</span>
            <span className="text-blue-600 dark:text-blue-400 font-bold">
              {100 - summaryStats.overallSavingPct}% {isTh ? 'ของงบเดิม' : 'of baseline'}
            </span>
          </div>
        </div>

        {/* Card 3: Total Cost Savings */}
        <div className="bg-gradient-to-br from-emerald-50 to-teal-50/70 dark:from-emerald-950/50 dark:to-teal-950/30 rounded-2xl border-2 border-emerald-400 dark:border-emerald-700 p-4 shadow-xs">
          <div className="flex items-center justify-between text-xs font-extrabold text-emerald-800 dark:text-emerald-300 mb-1.5">
            <span>{isTh ? 'ประหยัดงบประมาณรวม (Total Saved)' : 'Total Cost Savings (THB)'}</span>
            <TrendingDown size={16} className="text-emerald-600 dark:text-emerald-400" />
          </div>
          <div className="text-2xl font-black text-emerald-700 dark:text-emerald-300 font-mono">
            ฿{summaryStats.totalSavingsThb.toLocaleString()}
          </div>
          <div className="text-[11px] text-emerald-800/80 dark:text-emerald-300/80 mt-1.5 flex items-center justify-between font-bold">
            <span>
              {isTh ? 'ยืนยันแล้ว:' : 'Realized:'} ฿{summaryStats.realizedSavingsThb.toLocaleString()}
            </span>
            <span className="px-1.5 py-0.5 rounded bg-emerald-200/80 dark:bg-emerald-900 text-emerald-900 dark:text-emerald-200 text-[10px] font-black">
              -{summaryStats.overallSavingPct}%
            </span>
          </div>
        </div>

        {/* Card 4: Shared Bay Consolidation */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-indigo-200 dark:border-indigo-900/60 p-4 shadow-xs">
          <div className="flex items-center justify-between text-xs font-bold text-indigo-600 dark:text-indigo-400 mb-1.5">
            <span>{isTh ? 'ใช้นั่งร้านร่วมกัน (Shared Bays)' : 'Shared Bay Consolidation'}</span>
            <Share2 size={15} />
          </div>
          <div className="text-xl font-black text-indigo-700 dark:text-indigo-300 font-mono">
            {summaryStats.sharedBayCount}{' '}
            <span className="text-xs font-bold">{isTh ? 'จุดร่วมโซน' : 'shared bays'}</span>
          </div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1.5 flex items-center justify-between">
            <span>{isTh ? 'ลดค่าตั้ง-รื้อซ้ำซ้อน:' : 'Erection fee saved:'}</span>
            <span className="font-bold text-indigo-600 dark:text-indigo-400">
              ฿{summaryStats.byStrategy['Shared Bay'].savings.toLocaleString()}
            </span>
          </div>
        </div>

        {/* Card 5: Off-Hire Days & Volume Saved */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-amber-200 dark:border-amber-900/60 p-4 shadow-xs">
          <div className="flex items-center justify-between text-xs font-bold text-amber-600 dark:text-amber-400 mb-1.5">
            <span>{isTh ? 'ลดวันเช่า & ปริมาตรส่วนเกิน' : 'Off-Hire & Volume Saved'}</span>
            <Box size={15} />
          </div>
          <div className="text-xl font-black text-amber-700 dark:text-amber-300 font-mono">
            -{summaryStats.totalHireDaysSaved}{' '}
            <span className="text-xs font-bold">{isTh ? 'วันเช่า' : 'days'}</span>
          </div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1.5 flex items-center justify-between">
            <span>{isTh ? 'ปริมาตรนั่งร้านที่ลดได้:' : '3D Volume reduced:'}</span>
            <span className="font-bold text-emerald-600 dark:text-emerald-400">
              -{summaryStats.totalVolumeSavedM3.toLocaleString()} m³
            </span>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* SECTION 2: 4-PILLAR SCAFFOLDING COST SAVING STRATEGY CARDS                */}
      {/* ========================================================================= */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h2 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-2 uppercase tracking-wider">
              <Award size={16} className="text-cyan-600 dark:text-cyan-400" />
              <span>
                {isTh
                  ? 'วิเคราะห์ผลประหยัดแยกตาม 4 กลยุทธ์งานนั่งร้าน (4-Pillar Scaffolding Cost Saving Breakdown)'
                  : '4-Pillar Scaffolding Cost Saving Strategy Breakdown'}
              </span>
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {isTh
                ? 'คลิกที่การ์ดกลยุทธ์ด้านล่างเพื่อกรองรายการใบงานนั่งร้านในตารางปฏิบัติการ'
                : 'Click any strategy card below to filter the scaffolding optimization table.'}
            </p>
          </div>
          {selectedStrategy !== 'All' && (
            <button
              type="button"
              onClick={() => setSelectedStrategy('All')}
              className="text-xs font-bold text-cyan-600 dark:text-cyan-400 hover:underline flex items-center gap-1 cursor-pointer self-start"
            >
              <RefreshCw size={12} />
              <span>{isTh ? 'แสดงทุกกลยุทธ์ (Show All)' : 'Reset Strategy Filter'}</span>
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
          {(
            [
              {
                key: 'Shared Bay' as const,
                titleEn: '1. Shared Access Bay Consolidation',
                titleTh: '1. ใช้นั่งร้านร่วมกันหลายแผนก (Shared Bay)',
                descEn: 'Combine co-located requests on the same column/exchanger to avoid duplicate erection fees.',
                descTh: 'รวมคำขอนั่งร้านจุดเดียวกัน (เช่น งานท่อ+อินสทรูเมนต์+หุ้มฉนวน) ไม่ต้องตั้งนั่งร้านซ้ำซ้อน',
                badgeColor:
                  'bg-indigo-100 text-indigo-800 dark:bg-indigo-950/80 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800',
                barColor: 'bg-indigo-600'
              },
              {
                key: 'Volume Right-Sizing' as const,
                titleEn: '2. 3D Bay Volume Right-Sizing',
                titleTh: '2. ปรับลดปริมาตร m³ ให้พอดีงาน',
                descEn: 'Eliminate excessive bay width/length buffering while maintaining full Civil PE safety factor.',
                descTh: 'ตัดขนาดความกว้าง×ยาวส่วนเกินออกให้ตรงตามพิกัดใช้งานจริง ลดค่าตั้งและค่าเช่าต่อลูกบาศก์เมตร',
                badgeColor:
                  'bg-cyan-100 text-cyan-800 dark:bg-cyan-950/80 dark:text-cyan-300 border-cyan-200 dark:border-cyan-800',
                barColor: 'bg-cyan-600'
              },
              {
                key: 'Off-Hire Control' as const,
                titleEn: '3. Proactive Off-Hire & Overdue Control',
                titleTh: '3. ควบคุมวันตัดเช่า Off-Hire ตรงเวลา',
                descEn: 'Enforce strict 15/30-day off-hire dates and eliminate unnecessary rental extensions.',
                descTh: 'เร่งรื้อถอนคืนเช่าทันทีที่จบงาน ป้องกันการแช่นั่งร้านทิ้งไว้และการขอขยายเวลาเช่าเกินจำเป็น',
                badgeColor:
                  'bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300 border-amber-200 dark:border-amber-800',
                barColor: 'bg-amber-500'
              },
              {
                key: 'Contractor Rate' as const,
                titleEn: '4. Contractor Tier & Internal Crew Match',
                titleTh: '4. จัดสรรผู้รับเหมาตามเรทสัญญาคุ้มค่า',
                descEn: 'Assign standard bays (<15m) to Economy Rate or BCP Internal Crew (0 THB/day rental).',
                descTh: 'จัดสรรงานทั่วไป (<15m) ให้ผู้รับเหมาเรทประหยัด หรือทีมช่างภายใน BCP (ไม่มีค่าเช่ารายวัน)',
                badgeColor:
                  'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800',
                barColor: 'bg-emerald-600'
              }
            ] as const
          ).map(pillar => {
            const stat = summaryStats.byStrategy[pillar.key];
            const sharePct =
              summaryStats.totalSavingsThb > 0
                ? Math.round((stat.savings / summaryStats.totalSavingsThb) * 100)
                : 25;
            const isSelected = selectedStrategy === pillar.key;

            return (
              <div
                key={pillar.key}
                onClick={() => setSelectedStrategy(isSelected ? 'All' : pillar.key)}
                className={`p-4 rounded-xl border transition-all cursor-pointer flex flex-col justify-between ${
                  isSelected
                    ? 'ring-2 ring-cyan-500 border-cyan-500 bg-cyan-50/40 dark:bg-cyan-950/30 shadow-sm'
                    : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-slate-50/60 dark:bg-slate-800/40'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold border ${pillar.badgeColor}`}>
                      {stat.count} {isTh ? 'ใบงาน' : 'Jobs'}
                    </span>
                    <span className="text-xs font-mono font-black text-emerald-600 dark:text-emerald-400">
                      ฿{stat.savings.toLocaleString()}
                    </span>
                  </div>
                  <div className="text-xs font-extrabold text-slate-900 dark:text-white mb-1">
                    {isTh ? pillar.titleTh : pillar.titleEn}
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                    {isTh ? pillar.descTh : pillar.descEn}
                  </p>
                </div>

                <div className="mt-3 pt-2.5 border-t border-slate-200/70 dark:border-slate-700/60">
                  <div className="flex items-center justify-between text-[10px] font-bold text-slate-500 dark:text-slate-400 mb-1">
                    <span>{isTh ? 'สัดส่วนผลประหยัด' : 'Share of Savings'}</span>
                    <span>{sharePct}%</span>
                  </div>
                  <div className="w-full h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${pillar.barColor}`}
                      style={{ width: `${Math.max(8, sharePct)}%` }}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* SECTION 3: PROCESS ZONE SPEND BREAKDOWN & CONTRACTOR RATE MATRIX          */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Process Zone Spend vs Savings (6 Cols) */}
        <div className="lg:col-span-6 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-xs sm:text-sm font-black text-slate-900 dark:text-white flex items-center gap-2 uppercase tracking-wider">
                <BarChart3 size={16} className="text-cyan-600 dark:text-cyan-400" />
                <span>
                  {isTh
                    ? 'เปรียบเทียบงบนั่งร้านรายเขตพื้นที่ (S1 / S2 / S3 Zone Spend)'
                    : 'Process Zone Spend vs. Optimized Budget (THB)'}
                </span>
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                {isTh
                  ? 'คลิกที่เขตพื้นที่เพื่อกรองตารางใบงานด้านล่าง'
                  : 'Click any process zone bar to filter the scaffolding ledger.'}
              </p>
            </div>
            {selectedAreaFilter !== 'All' && (
              <button
                type="button"
                onClick={() => setSelectedAreaFilter('All')}
                className="text-[11px] font-bold text-cyan-600 dark:text-cyan-400 hover:underline cursor-pointer"
              >
                {isTh ? 'ล้างตัวกรองโซน' : 'Clear Zone'}
              </button>
            )}
          </div>

          <div className="space-y-3">
            {zoneBreakdown.map(item => {
              const maxBase = Math.max(...zoneBreakdown.map(z => z.baseline), 1);
              const basePct = Math.round((item.baseline / maxBase) * 100);
              const optPct = Math.round((item.optimized / maxBase) * 100);
              const savePct = item.baseline > 0 ? Math.round((item.savings / item.baseline) * 100) : 0;
              const isSelected = selectedAreaFilter === item.area;

              return (
                <div
                  key={item.area}
                  onClick={() => setSelectedAreaFilter(isSelected ? 'All' : item.area)}
                  className={`p-3 rounded-xl border transition-all cursor-pointer ${
                    isSelected
                      ? 'border-cyan-500 bg-cyan-50/40 dark:bg-cyan-950/30'
                      : 'border-slate-200/80 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/40'
                  }`}
                >
                  <div className="flex items-center justify-between text-xs mb-1.5 gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="font-extrabold text-slate-800 dark:text-slate-100 truncate">
                        {item.area}
                      </span>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-bold shrink-0">
                        {item.count} {isTh ? 'งาน' : 'jobs'} · {item.volumeM3.toLocaleString()} m³
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-right font-mono shrink-0">
                      <span className="text-[11px] text-slate-400 line-through">
                        ฿{item.baseline.toLocaleString()}
                      </span>
                      <span className="text-xs font-bold text-slate-900 dark:text-white">
                        ฿{item.optimized.toLocaleString()}
                      </span>
                      <span className="text-xs font-black text-emerald-600 dark:text-emerald-400">
                        (-{savePct}% / -฿{item.savings.toLocaleString()})
                      </span>
                    </div>
                  </div>

                  <div className="w-full h-2.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden relative">
                    <div
                      className="h-full bg-slate-300 dark:bg-slate-700 rounded-full absolute left-0 top-0"
                      style={{ width: `${basePct}%` }}
                    />
                    <div
                      className="h-full bg-gradient-to-r from-cyan-600 to-emerald-500 rounded-full relative z-10"
                      style={{ width: `${optPct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Contractor Rate & Volume Utilization Matrix (6 Cols) */}
        <div className="lg:col-span-6 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-xs space-y-4">
          <div>
            <h3 className="text-xs sm:text-sm font-black text-slate-900 dark:text-white flex items-center gap-2 uppercase tracking-wider">
              <HardHat size={16} className="text-emerald-600 dark:text-emerald-400" />
              <span>
                {isTh
                  ? 'ตารางเรทผู้รับเหมาและการกระจายปริมาณงาน (Contractor Rate & Volume Matrix)'
                  : 'Scaffolding Contractor Rate & Volume Allocation Matrix'}
              </span>
            </h3>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              {isTh
                ? 'เปรียบเทียบค่าตั้ง-รื้อ (THB/m³) ค่าเช่ารายวัน และงบที่ประหยัดได้แยกตามผู้รับเหมา'
                : 'Comparison of erection rates (THB/m³), daily rental rates, and realized cost savings.'}
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 text-[10px] font-extrabold uppercase text-slate-500 dark:text-slate-400">
                  <th className="py-2 pr-2">{isTh ? 'ผู้รับเหมา / ทีมช่าง' : 'Contractor / Crew'}</th>
                  <th className="py-2 px-2 text-right">{isTh ? 'ค่าตั้ง-รื้อ/m³' : 'Erect/m³'}</th>
                  <th className="py-2 px-2 text-right">{isTh ? 'ค่าเช่า/m³/วัน' : 'Rent/m³/d'}</th>
                  <th className="py-2 px-2 text-center">{isTh ? 'งาน / ปริมาตร' : 'Jobs / Vol'}</th>
                  <th className="py-2 pl-2 text-right">{isTh ? 'ประหยัดสุทธิ' : 'Net Saved'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/70">
                {contractorSummary.map(row => (
                  <tr
                    key={row.company}
                    className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors"
                  >
                    <td className="py-2.5 pr-2">
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-slate-800 dark:text-slate-100">
                          {row.company}
                        </span>
                        {row.profile.certifiedPE && (
                          <span className="px-1.5 py-0.2 rounded text-[9px] font-black bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                            PE
                          </span>
                        )}
                      </div>
                      <div className="text-[10px] text-slate-500 dark:text-slate-400">
                        {isTh ? row.profile.tierLabelTh : row.profile.tierLabelEn}
                      </div>
                    </td>
                    <td className="py-2.5 px-2 text-right font-mono font-semibold text-slate-700 dark:text-slate-300">
                      ฿{row.profile.erectionRatePerM3.toLocaleString()}
                    </td>
                    <td className="py-2.5 px-2 text-right font-mono font-semibold text-slate-700 dark:text-slate-300">
                      {row.profile.dailyRentalRatePerM3 === 0 ? (
                        <span className="text-emerald-600 dark:text-emerald-400 font-black">
                          FREE (฿0)
                        </span>
                      ) : (
                        `฿${row.profile.dailyRentalRatePerM3}`
                      )}
                    </td>
                    <td className="py-2.5 px-2 text-center font-mono">
                      <span className="font-bold text-slate-800 dark:text-slate-200">
                        {row.jobCount} {isTh ? 'งาน' : 'jobs'}
                      </span>{' '}
                      <span className="text-[11px] text-cyan-700 dark:text-cyan-400 font-bold">
                        ({row.totalVol.toLocaleString()} m³)
                      </span>
                    </td>
                    <td className="py-2.5 pl-2 text-right font-mono font-black text-emerald-600 dark:text-emerald-400">
                      ฿{row.totalSavings.toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* SECTION 4: JOB-LEVEL SCAFFOLDING COST SAVING LEDGER & ACTION WORKBENCH    */}
      {/* ========================================================================= */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
        {/* Table Toolbar */}
        <div className="p-4 sm:p-5 border-b border-slate-200 dark:border-slate-800 flex flex-col lg:flex-row lg:items-center justify-between gap-3.5">
          <div>
            <h3 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-2 uppercase tracking-wider">
              <Sparkles size={16} className="text-emerald-600 dark:text-emerald-400" />
              <span>
                {isTh
                  ? 'ตารางปฏิบัติการลดต้นทุนงานนั่งร้านรายใบงาน (Job-Level Scaffolding Cost Ledger)'
                  : 'Job-Level Scaffolding Optimization & Cost Saving Ledger'}
              </span>
              <span className="px-2 py-0.5 rounded-full text-[11px] font-extrabold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                {filteredAnalyses.length} {isTh ? 'รายการ' : 'items'}
              </span>
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              {isTh
                ? 'ตรวจสอบการคำนวณค่าตั้ง-รื้อ ค่าเช่ารายวัน และกด "อนุมัติประหยัดงบ" เพื่อซิงค์ขนาดปริมาตรและผู้รับเหมาทันที'
                : 'Review per-job erection & rental savings and click "Apply & Save" to lock optimized volume & contractor assignment.'}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Search Input */}
            <div className="relative min-w-[210px]">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1);
                }}
                placeholder={isTh ? 'ค้นหา SF ID, Tag, ผู้รับเหมา...' : 'Search SF ID, Tag, Contractor...'}
                className="w-full pl-8 pr-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs focus:outline-none focus:ring-2 focus:ring-cyan-500"
              />
            </div>

            {/* Strategy Filter */}
            <select
              value={selectedStrategy}
              onChange={e => {
                setSelectedStrategy(e.target.value as ScaffoldCostStrategyType);
                setCurrentPage(1);
              }}
              className="px-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-bold cursor-pointer"
            >
              <option value="All">{isTh ? 'ทุกกลยุทธ์ลดต้นทุน' : 'All Saving Strategies'}</option>
              <option value="Shared Bay">{isTh ? '1. ใช้นั่งร้านร่วมกัน (Shared Bay)' : '1. Shared Access Bay'}</option>
              <option value="Volume Right-Sizing">{isTh ? '2. ปรับลดปริมาตร (Volume Right-Sizing)' : '2. Volume Right-Sizing'}</option>
              <option value="Off-Hire Control">{isTh ? '3. ควบคุมวันตัดเช่า (Off-Hire Control)' : '3. Off-Hire Control'}</option>
              <option value="Contractor Rate">{isTh ? '4. เรทผู้รับเหมาคุ้มค่า (Contractor Rate)' : '4. Contractor Rate Match'}</option>
            </select>

            {/* Realization Filter */}
            <select
              value={realizationFilter}
              onChange={e => {
                setRealizationFilter(e.target.value as 'All' | 'Pending' | 'Realized');
                setCurrentPage(1);
              }}
              className="px-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-bold cursor-pointer"
            >
              <option value="All">{isTh ? 'ทุกสถานะผลประหยัด' : 'All Statuses'}</option>
              <option value="Pending">{isTh ? 'รอสั่งการ (Pending Opportunity)' : 'Pending Opportunity'}</option>
              <option value="Realized">{isTh ? 'ยืนยันผลแล้ว (Realized Savings)' : 'Realized Savings'}</option>
            </select>
          </div>
        </div>

        {/* Table Content */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-800 text-[10px] font-extrabold uppercase text-slate-500 dark:text-slate-400">
                <th className="py-3 px-4">{isTh ? 'ใบงาน / อุปกรณ์' : 'SF No. & Equipment Tag'}</th>
                <th className="py-3 px-3">{isTh ? 'ปริมาตร & วันเช่า' : 'Volume & Hire Window'}</th>
                <th className="py-3 px-3">{isTh ? 'กลยุทธ์ลดต้นทุน AI' : 'Optimization Strategy'}</th>
                <th className="py-3 px-3">{isTh ? 'ผู้รับเหมาที่แนะนำ' : 'Optimal Contractor'}</th>
                <th className="py-3 px-3 text-right">{isTh ? 'งบเดิม (THB)' : 'Baseline (THB)'}</th>
                <th className="py-3 px-3 text-right">{isTh ? 'งบใหม่ (THB)' : 'Optimized (THB)'}</th>
                <th className="py-3 px-3 text-right">{isTh ? 'ประหยัดสุทธิ (THB)' : 'Net Savings'}</th>
                <th className="py-3 px-4 text-center">{isTh ? 'การดำเนินการ' : 'Action'}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/70">
              {paginatedAnalyses.map(item => (
                <tr
                  key={item.job.id}
                  className="hover:bg-slate-50/90 dark:hover:bg-slate-800/40 transition-colors"
                >
                  {/* 1. Job & Equipment Tag */}
                  <td className="py-3 px-4 max-w-[230px]">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="font-mono font-black text-cyan-700 dark:text-cyan-400">
                        {item.job.jobId || item.job.id}
                      </span>
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                        {item.job.equipmentTag}
                      </span>
                      {item.needsCivilPE && (
                        <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300">
                          Civil PE
                        </span>
                      )}
                    </div>
                    <div className="font-semibold text-slate-800 dark:text-slate-200 truncate mt-0.5">
                      {item.job.jobDescription}
                    </div>
                    <div className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
                      {item.job.locationArea}
                    </div>
                  </td>

                  {/* 2. Volume & Hire Window */}
                  <td className="py-3 px-3 font-mono">
                    <div className="flex items-center gap-1 text-slate-800 dark:text-slate-200 font-bold">
                      <span className="text-slate-400 line-through text-[10px]">
                        {item.baselineVolumeM3}m³
                      </span>
                      <ArrowRight size={11} className="text-cyan-600" />
                      <span className="text-cyan-700 dark:text-cyan-300 font-black">
                        {item.optimizedVolumeM3} m³
                      </span>
                    </div>
                    <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
                      {isTh ? 'เช่า:' : 'Hire:'}{' '}
                      <span className="line-through">{item.baselineHireDays}d</span> →{' '}
                      <span className="font-bold text-emerald-600 dark:text-emerald-400">
                        {item.optimizedHireDays} {isTh ? 'วัน' : 'days'}
                      </span>
                    </div>
                  </td>

                  {/* 3. Strategy */}
                  <td className="py-3 px-3 max-w-[250px]">
                    <span
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-extrabold ${
                        item.strategy === 'Shared Bay'
                          ? 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300'
                          : item.strategy === 'Volume Right-Sizing'
                          ? 'bg-cyan-100 text-cyan-800 dark:bg-cyan-950 dark:text-cyan-300'
                          : item.strategy === 'Off-Hire Control'
                          ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                          : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                      }`}
                    >
                      {isTh ? item.strategyLabelTh : item.strategyLabelEn}
                    </span>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 line-clamp-2">
                      {isTh ? item.strategyDetailTh : item.strategyDetailEn}
                    </div>
                  </td>

                  {/* 4. Recommended Contractor */}
                  <td className="py-3 px-3">
                    <div className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                      <span>{item.recommendedContractor}</span>
                      {item.recommendedContractor !== item.requestedContractor && (
                        <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-teal-100 dark:bg-teal-950 text-teal-800 dark:text-teal-300">
                          {isTh ? `เดิม: ${item.requestedContractor}` : `was ${item.requestedContractor}`}
                        </span>
                      )}
                    </div>
                    <div className="text-[10px] text-slate-500 dark:text-slate-400">
                      {isTh
                        ? CONTRACTOR_RATE_PROFILES[item.recommendedContractor]?.tierLabelTh
                        : CONTRACTOR_RATE_PROFILES[item.recommendedContractor]?.tierLabelEn}
                    </div>
                  </td>

                  {/* 5. Baseline Cost */}
                  <td className="py-3 px-3 text-right font-mono">
                    <div className="text-slate-500 dark:text-slate-400 line-through font-semibold">
                      ฿{item.baselineTotalCostThb.toLocaleString()}
                    </div>
                    <div className="text-[10px] text-slate-400">
                      {isTh ? 'ความเสี่ยงล่วงเวลา:' : 'Overdue risk:'} ฿
                      {item.baselineOverdueRiskThb.toLocaleString()}
                    </div>
                  </td>

                  {/* 6. Optimized Cost */}
                  <td className="py-3 px-3 text-right font-mono">
                    <div className="font-bold text-slate-900 dark:text-white">
                      ฿{item.optimizedTotalCostThb.toLocaleString()}
                    </div>
                    <div className="text-[10px] text-slate-500">
                      {isTh ? 'ตั้ง:' : 'Erect:'} ฿{item.optimizedErectionCostThb.toLocaleString()}
                    </div>
                  </td>

                  {/* 7. Net Savings */}
                  <td className="py-3 px-3 text-right font-mono">
                    <div className="font-black text-emerald-600 dark:text-emerald-400 text-xs">
                      -฿{item.netSavingsThb.toLocaleString()}
                    </div>
                    <span className="inline-block px-1.5 py-0.2 rounded bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 text-[10px] font-black">
                      -{item.savingPercent}%
                    </span>
                  </td>

                  {/* 8. Action */}
                  <td className="py-3 px-4 text-center">
                    <div className="flex items-center justify-center gap-1.5">
                      {item.isRealized ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-100 dark:bg-emerald-950/70 text-emerald-800 dark:text-emerald-300 text-[11px] font-extrabold border border-emerald-300 dark:border-emerald-800">
                          <Check size={12} />
                          <span>{isTh ? 'ยืนยันประหยัดแล้ว' : 'Optimized'}</span>
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleApplyJobOptimization(item)}
                          className="px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-extrabold flex items-center gap-1 shadow-xs transition-all cursor-pointer active:scale-95"
                        >
                          <Sparkles size={12} />
                          <span>{isTh ? 'อนุมัติประหยัดงบ' : 'Apply & Save'}</span>
                        </button>
                      )}

                      {onInspectJobInEngineeringGate && (
                        <button
                          type="button"
                          onClick={() => onInspectJobInEngineeringGate(item.job)}
                          className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-cyan-100 dark:hover:bg-cyan-950 text-slate-600 dark:text-slate-300 hover:text-cyan-700 dark:hover:text-cyan-300 border border-slate-200 dark:border-slate-700 transition-colors cursor-pointer"
                          title={
                            isTh
                              ? 'เปิดตรวจสอบในหน้าวิศวกรรมและผังโรงงาน'
                              : 'Inspect in Engineering Gate & Plot Plan'
                          }
                        >
                          <Eye size={13} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        {totalPages > 1 && (
          <div className="p-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs">
            <span className="text-slate-500 dark:text-slate-400">
              {isTh
                ? `หน้า ${currentPage} จาก ${totalPages} (${filteredAnalyses.length} รายการ)`
                : `Page ${currentPage} of ${totalPages} (${filteredAnalyses.length} records)`}
            </span>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                disabled={currentPage <= 1}
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                className="px-3 py-1 rounded-lg border border-slate-300 dark:border-slate-700 disabled:opacity-40 font-bold cursor-pointer"
              >
                {isTh ? 'ก่อนหน้า' : 'Prev'}
              </button>
              <button
                type="button"
                disabled={currentPage >= totalPages}
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                className="px-3 py-1 rounded-lg border border-slate-300 dark:border-slate-700 disabled:opacity-40 font-bold cursor-pointer"
              >
                {isTh ? 'ถัดไป' : 'Next'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
