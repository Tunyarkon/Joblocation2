import React, { useState, useMemo } from 'react';
import { 
  Building, AlertTriangle, Clock, CheckCircle2, DollarSign, 
  ArrowRight, Filter, ChevronRight, RefreshCw, Calendar, 
  Layers, Plus, ShieldAlert, Sparkles, ExternalLink, Eye, 
  TrendingDown, TrendingUp, AlertCircle, MapPin
} from 'lucide-react';
import { 
  ScaffoldingItem, 
  calculateScaffoldMetrics, 
  SYSTEM_CURRENT_DATE,
  generateScaffoldingNotifications,
  extendScaffoldingOffHire,
  confirmScaffoldingOffHire,
  addScaffolding,
  updateScaffolding
} from '../../data/scaffoldingData';
import { 
  AddEditScaffoldModal, 
  ExtendOffHireModal, 
  ConfirmOffHireModal, 
  ScaffoldDetailModal,
  ScaffoldPlotPlanModal
} from './ScaffoldingModals';
import { ScaffoldingAnalyticsCharts } from './ScaffoldingAnalyticsCharts';
import { useLanguage } from '../../context/LanguageContext';

interface ScaffoldingDashboardProps {
  items: ScaffoldingItem[];
  onNavigateToTracking: (selectedScaffoldId?: string, statusFilter?: string) => void;
  selectedPlantFilter?: string;
  onPlantFilterChange?: (plant: string) => void;
}

export const ScaffoldingDashboard: React.FC<ScaffoldingDashboardProps> = ({
  items,
  onNavigateToTracking,
  selectedPlantFilter,
  onPlantFilterChange
}) => {
  const { language } = useLanguage();
  const isTh = language === 'th';

  // Dashboard Filters State
  const [plantFilter, setPlantFilter] = useState<string>(selectedPlantFilter || 'ALL');
  const [areaFilter, setAreaFilter] = useState<string>('ALL');
  const [contractorFilter, setContractorFilter] = useState<string>('ALL');

  // Modals state
  const [selectedScaffold, setSelectedScaffold] = useState<ScaffoldingItem | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isAddEditModalOpen, setIsAddEditModalOpen] = useState(false);
  const [isExtendModalOpen, setIsExtendModalOpen] = useState(false);
  const [isOffHireModalOpen, setIsOffHireModalOpen] = useState(false);
  const [isPlotPlanModalOpen, setIsPlotPlanModalOpen] = useState(false);

  // Sync external plant filter if changed
  React.useEffect(() => {
    if (selectedPlantFilter) {
      if (selectedPlantFilter === 'Phra Khanong' || selectedPlantFilter === 'Sriracha') {
        setPlantFilter(selectedPlantFilter);
      } else {
        setPlantFilter('ALL');
      }
    }
  }, [selectedPlantFilter]);

  // Extract unique areas & contractors for filter dropdowns
  const availableAreas = useMemo(() => {
    const set = new Set<string>();
    items.forEach(i => {
      if (plantFilter === 'ALL' || i.plant === plantFilter) {
        if (i.area) set.add(i.area);
      }
    });
    return Array.from(set).sort();
  }, [items, plantFilter]);

  const availableContractors = useMemo(() => {
    const set = new Set<string>();
    items.forEach(i => {
      if (i.contractor) set.add(i.contractor);
    });
    return Array.from(set).sort();
  }, [items]);

  // Filtered Items based on active filters
  const filteredItems = useMemo(() => {
    return items.filter(item => {
      if (plantFilter !== 'ALL' && item.plant !== plantFilter) return false;
      if (areaFilter !== 'ALL' && item.area !== areaFilter) return false;
      if (contractorFilter !== 'ALL' && item.contractor !== contractorFilter) return false;
      return true;
    });
  }, [items, plantFilter, areaFilter, contractorFilter]);

  // Calculate Metrics for filtered items
  const itemsWithMetrics = useMemo(() => {
    return filteredItems.map(item => ({
      item,
      metrics: calculateScaffoldMetrics(item)
    }));
  }, [filteredItems]);

  // Summary KPI Counts
  const kpis = useMemo(() => {
    let totalScaffolds = itemsWithMetrics.length;
    let activeRental = 0;
    let dueSoon = 0;
    let overdue = 0;
    let offHired = 0;

    let totalEstRentalCost = 0;
    let totalEstOverdueCost = 0;
    let countWithRate = 0;

    itemsWithMetrics.forEach(({ item, metrics }) => {
      if (metrics.status === 'Active') activeRental++;
      else if (metrics.status === 'Due Soon') dueSoon++;
      else if (metrics.status === 'Overdue') overdue++;
      else if (metrics.status === 'Off-Hired') offHired++;

      if (item.dailyRentalRate) {
        countWithRate++;
      }
      totalEstRentalCost += metrics.estimatedRentalCost;
      totalEstOverdueCost += metrics.estimatedOverdueCost;
    });

    return {
      totalScaffolds,
      activeRental,
      dueSoon,
      overdue,
      offHired,
      totalEstRentalCost,
      totalEstOverdueCost,
      hasRates: countWithRate > 0
    };
  }, [itemsWithMetrics]);

  // Urgent Off-Hire List: Overdue first, followed by Due Soon
  const urgentList = useMemo(() => {
    const urgents = itemsWithMetrics.filter(
      ({ metrics }) => metrics.status === 'Overdue' || metrics.status === 'Due Soon'
    );

    return urgents.sort((a, b) => {
      // Priority 1: Overdue comes before Due Soon
      if (a.metrics.status === 'Overdue' && b.metrics.status !== 'Overdue') return -1;
      if (a.metrics.status !== 'Overdue' && b.metrics.status === 'Overdue') return 1;
      // Priority 2: Days remaining ascending (e.g. -5, -2, 0, 1, 2)
      return a.metrics.daysRemaining - b.metrics.daysRemaining;
    });
  }, [itemsWithMetrics]);

  // Notifications
  const notifications = useMemo(() => {
    return generateScaffoldingNotifications(filteredItems);
  }, [filteredItems]);

  const handleResetFilters = () => {
    setPlantFilter('ALL');
    setAreaFilter('ALL');
    setContractorFilter('ALL');
    if (onPlantFilterChange) onPlantFilterChange('ALL');
  };

  const existingIds = useMemo(() => items.map(i => i.id), [items]);

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* =========================================================================
          HERO BANNER & TITLE
          ========================================================================= */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs p-5 sm:p-6 flex flex-col md:flex-row md:items-center justify-between gap-5 relative overflow-hidden">
        {/* Glow accent */}
        <div className="absolute -top-12 -right-12 w-64 h-64 bg-amber-500/10 dark:bg-amber-500/15 rounded-full blur-3xl pointer-events-none" />

        <div className="space-y-1.5 max-w-2xl relative z-10">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full font-mono bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
              {isTh ? 'ศูนย์บริหารจัดการงานนั่งร้าน & OFF-HIRE' : 'Scaffolding Management & Off-Hire Hub'}
            </span>
            <span className="text-xs text-slate-400 font-mono flex items-center gap-1">
              <Calendar size={12} />
              {isTh ? `ข้อมูล ณ วันที่: ${SYSTEM_CURRENT_DATE}` : `Ref Date: ${SYSTEM_CURRENT_DATE}`}
            </span>
          </div>

          <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2.5">
            <Building className="text-amber-600 dark:text-amber-400 shrink-0" size={26} />
            <span>{isTh ? 'แดชบอร์ดภาพรวมการใช้งานนั่งร้าน' : 'Scaffolding Overview Dashboard'}</span>
          </h2>

          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
            {isTh
              ? 'ติดตามการใช้งานนั่งร้านในพื้นที่โรงกลั่น ควบคุมกำหนดเวลา Off-Hire และตรวจจับค่าเช่าส่วนเกินเพื่อลดต้นทุนค่าเช่าที่ไม่จำเป็น'
              : 'Real-time scaffolding tracking, proactive off-hire notifications, and overdue rental cost avoidance.'}
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-3 shrink-0 flex-wrap relative z-10">
          <button
            type="button"
            onClick={() => {
              setSelectedScaffold(null);
              setIsAddEditModalOpen(true);
            }}
            className="h-11 px-5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs flex items-center gap-2 shadow-lg shadow-amber-600/25 transition-all cursor-pointer active:scale-95"
          >
            <Plus size={16} className="stroke-[3]" />
            <span>{isTh ? '+ ลงทะเบียนนั่งร้านใหม่' : '+ Register Scaffold'}</span>
          </button>

          <button
            type="button"
            onClick={() => onNavigateToTracking()}
            className="h-11 px-4 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 font-bold text-xs flex items-center gap-2 transition-all cursor-pointer"
          >
            <Layers size={15} />
            <span>{isTh ? 'หน้าจัดการ Scaffolding Tracking' : 'Scaffolding Tracking'}</span>
            <ArrowRight size={14} />
          </button>
        </div>
      </div>

      {/* =========================================================================
          DASHBOARD FILTERS (Plant, Area, Contractor)
          ========================================================================= */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-800 dark:text-slate-200">
            <Filter size={14} className="text-amber-600 dark:text-amber-400" />
            <span>{isTh ? 'ตัวกรองแดชบอร์ด (Dashboard Filters)' : 'Dashboard Filters'}</span>
            {(plantFilter !== 'ALL' || areaFilter !== 'ALL' || contractorFilter !== 'ALL') && (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300">
                {isTh ? 'เปิดใช้งานอยู่' : 'Active'}
              </span>
            )}
          </div>

          {(plantFilter !== 'ALL' || areaFilter !== 'ALL' || contractorFilter !== 'ALL') && (
            <button
              type="button"
              onClick={handleResetFilters}
              className="text-xs text-amber-600 dark:text-amber-400 hover:underline flex items-center gap-1 font-semibold cursor-pointer"
            >
              <RefreshCw size={12} />
              <span>{isTh ? 'ล้างตัวกรองทั้งหมด' : 'Reset All Filters'}</span>
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-3">
          {/* Plant Filter */}
          <div>
            <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 mb-1">
              {isTh ? 'โรงงาน (Plant)' : 'Plant'}
            </label>
            <select
              value={plantFilter}
              onChange={e => {
                setPlantFilter(e.target.value);
                setAreaFilter('ALL');
                if (onPlantFilterChange) onPlantFilterChange(e.target.value);
              }}
              className="w-full h-9 px-3 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-amber-500 focus:outline-hidden font-medium"
            >
              <option value="ALL">{isTh ? 'ทุกโรงงาน (All Plants)' : 'All Plants'}</option>
              <option value="Phra Khanong">Phra Khanong (PK)</option>
              <option value="Sriracha">Sriracha (SR)</option>
            </select>
          </div>

          {/* Area Filter */}
          <div>
            <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 mb-1">
              {isTh ? 'พื้นที่ / หน่วยผลิต (Area)' : 'Area / Unit'}
            </label>
            <select
              value={areaFilter}
              onChange={e => setAreaFilter(e.target.value)}
              className="w-full h-9 px-3 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-amber-500 focus:outline-hidden font-medium"
            >
              <option value="ALL">{isTh ? 'ทุกพื้นที่ (All Areas)' : 'All Areas'}</option>
              {availableAreas.map(a => (
                <option key={a} value={a}>{a}</option>
              ))}
            </select>
          </div>

          {/* Contractor Filter */}
          <div>
            <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 mb-1">
              {isTh ? 'ผู้รับเหมา (Contractor)' : 'Contractor'}
            </label>
            <select
              value={contractorFilter}
              onChange={e => setContractorFilter(e.target.value)}
              className="w-full h-9 px-3 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-amber-500 focus:outline-hidden font-medium"
            >
              <option value="ALL">{isTh ? 'ทุกผู้รับเหมา (All Contractors)' : 'All Contractors'}</option>
              {availableContractors.map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* =========================================================================
          1. SUMMARY KPI CARDS (4 Main Cards)
          ========================================================================= */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1: Total Scaffolds */}
        <div 
          onClick={() => onNavigateToTracking(undefined, 'ALL')}
          className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-xs hover:border-slate-400 dark:hover:border-slate-600 transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              {isTh ? 'นั่งร้านทั้งหมด' : 'Total Scaffolds'}
            </span>
            <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 flex items-center justify-center group-hover:scale-105 transition-transform">
              <Building size={18} />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-black text-slate-900 dark:text-white font-mono">
              {kpis.totalScaffolds}
            </span>
            <span className="text-xs text-slate-400">{isTh ? 'รายการ' : 'units'}</span>
          </div>
          <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px] text-slate-500">
            <span>{isTh ? 'ปิดรายการแล้ว:' : 'Off-Hired:'} <strong className="text-slate-700 dark:text-slate-300">{kpis.offHired}</strong></span>
            <span className="text-blue-600 dark:text-blue-400 flex items-center gap-0.5 group-hover:translate-x-0.5 transition-transform">
              {isTh ? 'ดูรายการ' : 'View'} <ChevronRight size={12} />
            </span>
          </div>
        </div>

        {/* KPI 2: Active Rental */}
        <div 
          onClick={() => onNavigateToTracking(undefined, 'Active')}
          className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-xs hover:border-emerald-400 dark:hover:border-emerald-600 transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              {isTh ? 'กำลังเช่าใช้งานปกติ' : 'Active Rental'}
            </span>
            <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center group-hover:scale-105 transition-transform">
              <CheckCircle2 size={18} />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-black text-emerald-600 dark:text-emerald-400 font-mono">
              {kpis.activeRental}
            </span>
            <span className="text-xs text-slate-400">{isTh ? 'รายการ' : 'units'}</span>
          </div>
          <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px] text-slate-500">
            <span>{isTh ? 'ยังไม่ใกล้ครบกำหนด' : 'On track (>3 days)'}</span>
            <span className="text-emerald-600 dark:text-emerald-400 flex items-center gap-0.5 group-hover:translate-x-0.5 transition-transform">
              {isTh ? 'ดูรายการ' : 'View'} <ChevronRight size={12} />
            </span>
          </div>
        </div>

        {/* KPI 3: Due Soon (<= 3 days) */}
        <div 
          onClick={() => onNavigateToTracking(undefined, 'Due Soon')}
          className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-xs hover:border-amber-400 dark:hover:border-amber-600 transition-all cursor-pointer group relative overflow-hidden"
        >
          {kpis.dueSoon > 0 && (
            <div className="absolute top-0 right-0 w-2 h-full bg-amber-500" />
          )}
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              {isTh ? 'ใกล้ครบกำหนด Off-Hire' : 'Due Soon'}
            </span>
            <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center group-hover:scale-105 transition-transform">
              <Clock size={18} />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-black text-amber-600 dark:text-amber-400 font-mono">
              {kpis.dueSoon}
            </span>
            <span className="text-xs text-slate-400">{isTh ? 'รายการ' : 'units'}</span>
          </div>
          <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px] text-slate-500">
            <span>{isTh ? 'เหลือเวลา ≤ 3 วัน' : 'Remaining ≤ 3 days'}</span>
            <span className="text-amber-600 dark:text-amber-400 flex items-center gap-0.5 group-hover:translate-x-0.5 transition-transform">
              {isTh ? 'ติดตาม' : 'Track'} <ChevronRight size={12} />
            </span>
          </div>
        </div>

        {/* KPI 4: Overdue */}
        <div 
          onClick={() => onNavigateToTracking(undefined, 'Overdue')}
          className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-xs hover:border-rose-400 dark:hover:border-rose-600 transition-all cursor-pointer group relative overflow-hidden"
        >
          {kpis.overdue > 0 && (
            <div className="absolute top-0 right-0 w-2 h-full bg-rose-500" />
          )}
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              {isTh ? 'เกินกำหนด Off-Hire' : 'Overdue'}
            </span>
            <div className="w-10 h-10 rounded-xl bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center group-hover:scale-105 transition-transform">
              <AlertTriangle size={18} />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-black text-rose-600 dark:text-rose-400 font-mono">
              {kpis.overdue}
            </span>
            <span className="text-xs text-slate-400">{isTh ? 'รายการ' : 'units'}</span>
          </div>
          <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px] text-slate-500">
            <span className="text-rose-500 font-semibold">{isTh ? 'ต้องปิดหรือขยายด่วน!' : 'Action required!'}</span>
            <span className="text-rose-600 dark:text-rose-400 flex items-center gap-0.5 group-hover:translate-x-0.5 transition-transform">
              {isTh ? 'จัดการ' : 'Manage'} <ChevronRight size={12} />
            </span>
          </div>
        </div>
      </div>

      {/* =========================================================================
          2. RENTAL COST OVERVIEW (Highlighted Section with Surcharge Breakdown)
          ========================================================================= */}
      <div className="bg-gradient-to-br from-slate-900 via-slate-900 to-slate-950 text-white rounded-3xl p-6 sm:p-7 border border-slate-800 shadow-xl relative overflow-hidden">
        {/* Glow backdrop */}
        <div className="absolute top-0 right-1/4 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div className="space-y-2 max-w-xl">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/20 text-amber-300 text-xs font-bold border border-amber-500/30">
              <DollarSign size={13} />
              <span>{isTh ? 'ภาพรวมต้นทุนค่าเช่านั่งร้าน (Rental Cost Overview)' : 'Scaffolding Rental Cost Analytics'}</span>
            </div>
            <h3 className="text-xl sm:text-2xl font-black tracking-tight text-white">
              {isTh ? 'ค่าเช่าส่วนเกินที่เกิดจากรายการเกินกำหนด' : 'Estimated Overdue Rental Cost'}
            </h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              {isTh
                ? 'คำนวณจากจำนวนวันที่เกินกำหนด (Overdue Days) × อัตราค่าเช่าต่อวัน (Daily Rate) แยกออกจากค่าเช่าตามสัญญาปกติ เพื่อให้เห็นโอกาสประหยัดงบประมาณจากการรีบ Off-Hire'
                : 'Overdue surcharge calculated by (Overdue Days × Daily Rate) distinct from contract baseline to eliminate unnecessary rental leakages.'}
            </p>
          </div>

          {/* Primary Cost Callout: Estimated Overdue Rental Cost */}
          <div className="bg-slate-800/80 backdrop-blur-md rounded-2xl p-5 border border-slate-700/80 min-w-[260px] text-right flex flex-col justify-center">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
              {isTh ? 'ค่าเช่าส่วนเกินโดยประมาณ (Overdue Surcharge)' : 'Estimated Overdue Surcharge'}
            </span>
            <div className="mt-1 flex items-baseline justify-end gap-1.5">
              <span className="text-3xl sm:text-4xl font-black font-mono text-rose-400">
                {kpis.hasRates ? `฿${kpis.totalEstOverdueCost.toLocaleString()}` : 'N/A'}
              </span>
            </div>
            <span className="text-[11px] text-slate-400 mt-1 block">
              {kpis.overdue > 0 
                ? (isTh ? `จากรายการที่เกินกำหนด ${kpis.overdue} นั่งร้าน` : `From ${kpis.overdue} overdue scaffolds`)
                : (isTh ? 'ไม่มีรายการเกินกำหนดในตัวกรองนี้' : 'No overdue scaffolds')}
            </span>
          </div>
        </div>

        {/* Breakdown Row: Contract Baseline vs Overdue Surcharge vs Total Exposure */}
        <div className="mt-6 pt-6 border-t border-slate-800/90 grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
          <div className="bg-slate-800/40 p-4 rounded-xl border border-slate-800">
            <span className="text-slate-400 text-[11px] block">{isTh ? '1. ค่าเช่าตามแผนงานสัญญา (Contract Baseline)' : '1. Planned Contract Rental'}</span>
            <span className="text-lg font-black font-mono text-slate-200 mt-1 block">
              {kpis.hasRates ? `฿${kpis.totalEstRentalCost.toLocaleString()}` : 'N/A'}
            </span>
            <span className="text-[10px] text-slate-500 mt-0.5 block">{isTh ? 'ค่าเช่าที่ได้รับอนุมัติตามระยะเวลาแผน' : 'Budgeted duration basis'}</span>
          </div>

          <div className="bg-rose-950/20 p-4 rounded-xl border border-rose-900/40">
            <span className="text-rose-300 text-[11px] block">{isTh ? '2. ค่าเช่าส่วนเกินโดยประมาณ (Overdue Surcharge)' : '2. Est. Overdue Surcharge'}</span>
            <span className="text-lg font-black font-mono text-rose-400 mt-1 block">
              {kpis.hasRates ? `+฿${kpis.totalEstOverdueCost.toLocaleString()}` : 'N/A'}
            </span>
            <span className="text-[10px] text-rose-400/80 mt-0.5 block">{isTh ? 'ลดค่าใช้จ่ายนี้ได้ทันทีเมื่อ Off-Hire' : 'Recoverable upon immediate Off-Hire'}</span>
          </div>

          <div className="bg-amber-950/20 p-4 rounded-xl border border-amber-900/40">
            <span className="text-amber-300 text-[11px] block">{isTh ? '3. ยอดรวมต้นทุนค่าเช่าโดยประมาณ (Total Exposure)' : '3. Total Estimated Exposure'}</span>
            <span className="text-lg font-black font-mono text-amber-300 mt-1 block">
              {kpis.hasRates ? `฿${(kpis.totalEstRentalCost + kpis.totalEstOverdueCost).toLocaleString()}` : 'N/A'}
            </span>
            <span className="text-[10px] text-amber-400/80 mt-0.5 block">{isTh ? 'ยอดประมาณการรวมปัจจุบัน' : 'Current cumulative exposure'}</span>
          </div>
        </div>
      </div>

      {/* =========================================================================
          2B. MULTI-PERSPECTIVE BAR CHARTS (Contractor, Area, Aging, Financial)
          ========================================================================= */}
      <ScaffoldingAnalyticsCharts 
        items={filteredItems}
        onDrillDown={(filterType, value) => {
          if (filterType === 'contractor') {
            setContractorFilter(value);
          } else if (filterType === 'area') {
            setAreaFilter(value);
          } else if (filterType === 'status') {
            onNavigateToTracking(undefined, value);
          }
        }}
      />

      {/* =========================================================================
          3. URGENT OFF-HIRE LIST (Sorted: Overdue first, then Due Soon)
          ========================================================================= */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
        {/* Table Header & Title */}
        <div className="p-5 sm:p-6 border-b border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center font-bold">
              <ShieldAlert size={20} />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <span>{isTh ? 'รายการนั่งร้านที่ต้องติดตามเร่งด่วน' : 'Urgent Off-Hire Action List'}</span>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold font-mono bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300">
                  {urgentList.length}
                </span>
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {isTh 
                  ? 'เรียงลำดับรายการที่เกินกำหนด (Overdue) ก่อน ตามด้วยรายการที่ใกล้ครบกำหนด (Due Soon ≤ 3 วัน)' 
                  : 'Prioritized list: Overdue first, followed by Due Soon (≤ 3 days remaining).'}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => onNavigateToTracking()}
            className="text-xs font-bold text-amber-600 dark:text-amber-400 hover:text-amber-700 dark:hover:text-amber-300 flex items-center gap-1.5 transition-colors cursor-pointer self-start sm:self-center"
          >
            <span>{isTh ? 'ดูรายการนั่งร้านทั้งหมดในระบบ' : 'View Full Scaffolding List'}</span>
            <ArrowRight size={14} />
          </button>
        </div>

        {/* Table Content */}
        {urgentList.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <div className="w-14 h-14 rounded-2xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto">
              <CheckCircle2 size={28} />
            </div>
            <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200">
              {isTh ? 'ไม่มีรายการนั่งร้านเร่งด่วนในขณะนี้' : 'No Urgent Scaffolding Actions'}
            </h4>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto">
              {isTh 
                ? 'ไม่มีรายการที่เกินกำหนดหรือใกล้ครบกำหนด Off-Hire ตามเงื่อนไขตัวกรองปัจจุบัน' 
                : 'All scaffolds in the selected filter are on track or already off-hired.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider text-[10px] border-b border-slate-100 dark:border-slate-800">
                  <th className="py-3 px-4 sm:px-6">{isTh ? 'รหัสนั่งร้าน' : 'Scaffold ID'}</th>
                  <th className="py-3 px-4">{isTh ? 'Job ที่เกี่ยวข้อง' : 'Job ID'}</th>
                  <th className="py-3 px-4">{isTh ? 'โรงงาน / พื้นที่' : 'Plant / Area'}</th>
                  <th className="py-3 px-4">{isTh ? 'ผู้รับเหมา' : 'Contractor'}</th>
                  <th className="py-3 px-4">{isTh ? 'วันครบกำหนด' : 'Due Date'}</th>
                  <th className="py-3 px-4">{isTh ? 'จำนวนวันคงเหลือ / เกินกำหนด' : 'Days Remaining'}</th>
                  <th className="py-3 px-4">{isTh ? 'สถานะ' : 'Status'}</th>
                  <th className="py-3 px-4 text-right pr-6">{isTh ? 'การจัดการ' : 'Action'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {urgentList.map(({ item, metrics }) => {
                  const isOverdue = metrics.status === 'Overdue';

                  return (
                    <tr 
                      key={item.id}
                      className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors group"
                    >
                      {/* Scaffold ID */}
                      <td className="py-3 px-4 sm:px-6">
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedScaffold(item);
                            setIsDetailModalOpen(true);
                          }}
                          className="font-mono font-bold text-slate-900 dark:text-slate-100 hover:text-amber-600 dark:hover:text-amber-400 flex items-center gap-1.5 cursor-pointer text-left"
                        >
                          <span>{item.id}</span>
                          <ExternalLink size={12} className="opacity-0 group-hover:opacity-100 transition-opacity" />
                        </button>
                      </td>

                      {/* Job ID */}
                      <td className="py-3 px-4 font-mono text-slate-600 dark:text-slate-300">
                        {item.jobId}
                      </td>

                      {/* Plant / Area */}
                      <td className="py-3 px-4">
                        <span className="font-semibold text-slate-800 dark:text-slate-200 block truncate max-w-[200px]">
                          {item.area}
                        </span>
                        <span className="text-[10px] text-slate-400 block font-mono">
                          {item.plant}
                        </span>
                      </td>

                      {/* Contractor */}
                      <td className="py-3 px-4 text-slate-700 dark:text-slate-300 truncate max-w-[170px]">
                        {item.contractor}
                      </td>

                      {/* Off-Hire Due Date */}
                      <td className="py-3 px-4 font-mono text-slate-700 dark:text-slate-300">
                        {item.plannedOffHireDate}
                      </td>

                      {/* Days Remaining / Overdue Days */}
                      <td className="py-3 px-4">
                        {isOverdue ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold font-mono bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-800">
                            <AlertTriangle size={12} />
                            <span>{isTh ? `เกินกำหนด ${metrics.overdueDays} วัน` : `${metrics.overdueDays}d Overdue`}</span>
                          </span>
                        ) : metrics.daysRemaining === 0 ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold font-mono bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                            <Clock size={12} />
                            <span>{isTh ? 'ครบกำหนดวันนี้' : 'Due Today'}</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold font-mono bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                            <Clock size={12} />
                            <span>{isTh ? `เหลือ ${metrics.daysRemaining} วัน` : `${metrics.daysRemaining}d Left`}</span>
                          </span>
                        )}
                      </td>

                      {/* Status */}
                      <td className="py-3 px-4">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                          isOverdue 
                            ? 'bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400 border-rose-200 dark:border-rose-800'
                            : 'bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-800'
                        }`}>
                          {metrics.status}
                        </span>
                      </td>

                      {/* Action: View / Manage & Plot Plan Pin */}
                      <td className="py-3 px-4 text-right pr-6">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedScaffold(item);
                              setIsPlotPlanModalOpen(true);
                            }}
                            className="p-1.5 rounded-lg bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/60 transition-colors cursor-pointer"
                            title={isTh ? "ดูพิกัดบนผัง (View Pin)" : "View Pin on Plot Plan"}
                          >
                            <MapPin size={13} />
                          </button>

                          <button
                            type="button"
                            onClick={() => onNavigateToTracking(item.id)}
                            className="px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-amber-500 hover:text-white dark:hover:bg-amber-600 text-slate-700 dark:text-slate-200 text-xs font-bold transition-all cursor-pointer flex items-center gap-1"
                            title={isTh ? "เปิดจัดการในหน้า Scaffolding Tracking" : "Manage in Scaffolding Tracking"}
                          >
                            <Eye size={13} />
                            <span>{isTh ? 'View / Manage' : 'Manage'}</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* =========================================================================
          NOTIFICATIONS TICKER (Active Off-Hire Alerts)
          ========================================================================= */}
      {notifications.length > 0 && (
        <div className="bg-amber-500/10 dark:bg-amber-500/15 border border-amber-500/30 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-amber-500 text-white flex items-center justify-center shrink-0">
              <AlertCircle size={16} />
            </div>
            <div className="truncate">
              <span className="font-bold text-amber-900 dark:text-amber-300 block">
                {isTh ? `แจ้งเตือนกำหนด Off-Hire กำลังรอการจัดการ (${notifications.length} รายการ)` : `Active Off-Hire Alerts (${notifications.length})`}
              </span>
              <span className="text-[11px] text-amber-700 dark:text-amber-400 truncate block">
                {notifications[0].message}
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={() => onNavigateToTracking(notifications[0].scaffoldId)}
            className="px-3.5 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs shrink-0 cursor-pointer transition-colors"
          >
            {isTh ? 'ตรวจสอบรายการแจ้งเตือน' : 'Review Alerts'}
          </button>
        </div>
      )}

      {/* =========================================================================
          MODALS
          ========================================================================= */}
      <AddEditScaffoldModal
        isOpen={isAddEditModalOpen}
        onClose={() => setIsAddEditModalOpen(false)}
        initialData={selectedScaffold}
        existingIds={existingIds}
        onSave={(data) => {
          if (selectedScaffold) {
            updateScaffolding(selectedScaffold.id, data);
          } else {
            addScaffolding(data);
          }
        }}
      />

      <ExtendOffHireModal
        isOpen={isExtendModalOpen}
        onClose={() => setIsExtendModalOpen(false)}
        scaffold={selectedScaffold}
        onConfirm={(scaffoldId, newOffHireDate, reason) => {
          extendScaffoldingOffHire(scaffoldId, newOffHireDate, reason);
        }}
      />

      <ConfirmOffHireModal
        isOpen={isOffHireModalOpen}
        onClose={() => setIsOffHireModalOpen(false)}
        scaffold={selectedScaffold}
        onConfirm={(scaffoldId, actualOffHireDate, remark) => {
          confirmScaffoldingOffHire(scaffoldId, actualOffHireDate, remark);
        }}
      />

      <ScaffoldDetailModal
        isOpen={isDetailModalOpen}
        onClose={() => setIsDetailModalOpen(false)}
        scaffold={selectedScaffold}
        onOpenEdit={(scaffold) => {
          setSelectedScaffold(scaffold);
          setIsAddEditModalOpen(true);
        }}
        onOpenExtend={(scaffold) => {
          setSelectedScaffold(scaffold);
          setIsExtendModalOpen(true);
        }}
        onOpenOffHire={(scaffold) => {
          setSelectedScaffold(scaffold);
          setIsOffHireModalOpen(true);
        }}
        onOpenPlotPlan={(scaffold) => {
          setSelectedScaffold(scaffold);
          setIsPlotPlanModalOpen(true);
        }}
      />

      <ScaffoldPlotPlanModal
        isOpen={isPlotPlanModalOpen}
        onClose={() => setIsPlotPlanModalOpen(false)}
        scaffold={selectedScaffold}
        allScaffolds={items}
        onOpenExtend={(scaffold) => {
          setSelectedScaffold(scaffold);
          setIsExtendModalOpen(true);
        }}
        onOpenOffHire={(scaffold) => {
          setSelectedScaffold(scaffold);
          setIsOffHireModalOpen(true);
        }}
      />
    </div>
  );
};
