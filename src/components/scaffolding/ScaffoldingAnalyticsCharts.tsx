import React, { useState, useMemo } from 'react';
import { 
  BarChart3, Users, Building2, Clock, DollarSign, 
  Layers, ArrowUpRight, TrendingUp, AlertTriangle, 
  CheckCircle2, Info, ChevronRight, SlidersHorizontal,
  LayoutGrid, ListFilter
} from 'lucide-react';
import { ScaffoldingItem, calculateScaffoldMetrics } from '../../data/scaffoldingData';
import { useLanguage } from '../../context/LanguageContext';

export type ChartPerspective = 'contractor' | 'area' | 'aging' | 'financial';
export type ChartMetricMode = 'count' | 'cost';
export type ChartLayoutMode = 'vertical' | 'horizontal';

interface ScaffoldingAnalyticsChartsProps {
  items: ScaffoldingItem[];
  onDrillDown?: (filterType: 'contractor' | 'area' | 'status', value: string) => void;
}

export const ScaffoldingAnalyticsCharts: React.FC<ScaffoldingAnalyticsChartsProps> = ({
  items,
  onDrillDown
}) => {
  const { language } = useLanguage();
  const isTh = language === 'th';

  // Component Controls State
  const [perspective, setPerspective] = useState<ChartPerspective>('contractor');
  const [metricMode, setMetricMode] = useState<ChartMetricMode>('count');
  const [layoutMode, setLayoutMode] = useState<ChartLayoutMode>('vertical');
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  // Precompute metrics for all items
  const itemsWithMetrics = useMemo(() => {
    return items.map(item => ({
      item,
      metrics: calculateScaffoldMetrics(item)
    }));
  }, [items]);

  // =========================================================================
  // PERSPECTIVE 1: BY CONTRACTOR
  // =========================================================================
  const contractorData = useMemo(() => {
    const map = new Map<string, {
      name: string;
      total: number;
      active: number;
      dueSoon: number;
      overdue: number;
      offHired: number;
      plannedCost: number;
      overdueCost: number;
      totalCost: number;
    }>();

    itemsWithMetrics.forEach(({ item, metrics }) => {
      const c = item.contractor;
      if (!map.has(c)) {
        map.set(c, {
          name: c,
          total: 0,
          active: 0,
          dueSoon: 0,
          overdue: 0,
          offHired: 0,
          plannedCost: 0,
          overdueCost: 0,
          totalCost: 0
        });
      }
      const record = map.get(c)!;
      record.total++;
      if (metrics.status === 'Active') record.active++;
      else if (metrics.status === 'Due Soon') record.dueSoon++;
      else if (metrics.status === 'Overdue') record.overdue++;
      else if (metrics.status === 'Off-Hired') record.offHired++;

      record.plannedCost += metrics.estimatedRentalCost;
      record.overdueCost += metrics.estimatedOverdueCost;
      record.totalCost += (metrics.estimatedRentalCost + metrics.estimatedOverdueCost);
    });

    return Array.from(map.values()).sort((a, b) => {
      if (metricMode === 'cost') return b.totalCost - a.totalCost;
      return b.total - a.total;
    });
  }, [itemsWithMetrics, metricMode]);

  // =========================================================================
  // PERSPECTIVE 2: BY AREA / PLANT UNIT
  // =========================================================================
  const areaData = useMemo(() => {
    const map = new Map<string, {
      name: string;
      plant: string;
      total: number;
      active: number;
      dueSoon: number;
      overdue: number;
      offHired: number;
      plannedCost: number;
      overdueCost: number;
      totalCost: number;
    }>();

    itemsWithMetrics.forEach(({ item, metrics }) => {
      const a = item.area;
      if (!map.has(a)) {
        map.set(a, {
          name: a,
          plant: item.plant,
          total: 0,
          active: 0,
          dueSoon: 0,
          overdue: 0,
          offHired: 0,
          plannedCost: 0,
          overdueCost: 0,
          totalCost: 0
        });
      }
      const record = map.get(a)!;
      record.total++;
      if (metrics.status === 'Active') record.active++;
      else if (metrics.status === 'Due Soon') record.dueSoon++;
      else if (metrics.status === 'Overdue') record.overdue++;
      else if (metrics.status === 'Off-Hired') record.offHired++;

      record.plannedCost += metrics.estimatedRentalCost;
      record.overdueCost += metrics.estimatedOverdueCost;
      record.totalCost += (metrics.estimatedRentalCost + metrics.estimatedOverdueCost);
    });

    return Array.from(map.values()).sort((a, b) => {
      if (metricMode === 'cost') return b.totalCost - a.totalCost;
      return b.total - a.total;
    });
  }, [itemsWithMetrics, metricMode]);

  // =========================================================================
  // PERSPECTIVE 3: AGING & DUE DATE DISTRIBUTION
  // =========================================================================
  const agingData = useMemo(() => {
    const buckets = [
      { id: 'ovd_crit', label: isTh ? 'เกินกำหนด > 3 วัน' : 'Overdue > 3d', status: 'Overdue', color: 'rose', bg: 'bg-rose-600', count: 0, cost: 0 },
      { id: 'ovd_mod', label: isTh ? 'เกินกำหนด 1-3 วัน' : 'Overdue 1-3d', status: 'Overdue', color: 'rose', bg: 'bg-rose-500', count: 0, cost: 0 },
      { id: 'due_today', label: isTh ? 'ครบกำหนดวันนี้ (0d)' : 'Due Today (0d)', status: 'Due Soon', color: 'amber', bg: 'bg-amber-500', count: 0, cost: 0 },
      { id: 'due_soon', label: isTh ? 'ใกล้ครบกำหนด (1-3d)' : 'Due Soon (1-3d)', status: 'Due Soon', color: 'amber', bg: 'bg-amber-400', count: 0, cost: 0 },
      { id: 'act_short', label: isTh ? 'ปกติ (4-10 วัน)' : 'Active (4-10d)', status: 'Active', color: 'emerald', bg: 'bg-emerald-500', count: 0, cost: 0 },
      { id: 'act_long', label: isTh ? 'ปกติ (> 10 วัน)' : 'Active (> 10d)', status: 'Active', color: 'blue', bg: 'bg-blue-500', count: 0, cost: 0 },
      { id: 'off_hired', label: isTh ? 'ปิดรายการแล้ว (Off-Hired)' : 'Off-Hired', status: 'Off-Hired', color: 'slate', bg: 'bg-slate-400', count: 0, cost: 0 },
    ];

    itemsWithMetrics.forEach(({ metrics }) => {
      if (metrics.isOffHired) {
        buckets[6].count++;
        buckets[6].cost += metrics.estimatedRentalCost;
      } else if (metrics.daysRemaining < -3) {
        buckets[0].count++;
        buckets[0].cost += metrics.estimatedOverdueCost;
      } else if (metrics.daysRemaining < 0) {
        buckets[1].count++;
        buckets[1].cost += metrics.estimatedOverdueCost;
      } else if (metrics.daysRemaining === 0) {
        buckets[2].count++;
        buckets[2].cost += metrics.estimatedRentalCost;
      } else if (metrics.daysRemaining <= 3) {
        buckets[3].count++;
        buckets[3].cost += metrics.estimatedRentalCost;
      } else if (metrics.daysRemaining <= 10) {
        buckets[4].count++;
        buckets[4].cost += metrics.estimatedRentalCost;
      } else {
        buckets[5].count++;
        buckets[5].cost += metrics.estimatedRentalCost;
      }
    });

    return buckets;
  }, [itemsWithMetrics, isTh]);

  // Overall Insights
  const insights = useMemo(() => {
    let worstContractor = { name: 'N/A', overdueCost: 0 };
    let busiestArea = { name: 'N/A', count: 0 };
    let totalPlanned = 0;
    let totalOverdue = 0;

    contractorData.forEach(c => {
      if (c.overdueCost > worstContractor.overdueCost) {
        worstContractor = { name: c.name, overdueCost: c.overdueCost };
      }
      totalPlanned += c.plannedCost;
      totalOverdue += c.overdueCost;
    });

    areaData.forEach(a => {
      if (a.total > busiestArea.count) {
        busiestArea = { name: a.name, count: a.total };
      }
    });

    const overduePct = totalPlanned > 0 ? ((totalOverdue / totalPlanned) * 100).toFixed(1) : '0.0';

    return {
      worstContractor,
      busiestArea,
      totalPlanned,
      totalOverdue,
      overduePct
    };
  }, [contractorData, areaData]);

  // Max calculations for bar percentages
  const maxContractorVal = useMemo(() => {
    return Math.max(...contractorData.map(c => metricMode === 'cost' ? c.totalCost : c.total), 1);
  }, [contractorData, metricMode]);

  const maxAreaVal = useMemo(() => {
    return Math.max(...areaData.map(a => metricMode === 'cost' ? a.totalCost : a.total), 1);
  }, [areaData, metricMode]);

  const maxAgingVal = useMemo(() => {
    return Math.max(...agingData.map(b => metricMode === 'cost' ? b.cost : b.count), 1);
  }, [agingData, metricMode]);

  return (
    <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
      {/* =========================================================================
          CHARTS SUITE HEADER & CONTROLS TOOLBAR
          ========================================================================= */}
      <div className="p-5 sm:p-6 border-b border-slate-100 dark:border-slate-800 flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-slate-50/50 dark:bg-slate-900/50">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full font-mono bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
              {isTh ? 'การวิเคราะห์เชิงลึก (MULTIPLE PERSPECTIVE CHARTS)' : 'MULTI-PERSPECTIVE BAR CHARTS'}
            </span>
          </div>

          <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2 mt-1">
            <BarChart3 size={20} className="text-amber-500 shrink-0" />
            <span>{isTh ? 'กราฟแท่งวิเคราะห์การใช้งานและต้นทุนนั่งร้าน' : 'Scaffolding Analytics & Distribution Charts'}</span>
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {isTh 
              ? 'สลับมุมมองเพื่อวิเคราะห์แยกตามผู้รับเหมา, พื้นที่ติดตั้ง, ช่วงอายุวันครบกำหนด และการเปรียบเทียบต้นทุน' 
              : 'Cross-analyze by contractor capacity, operating unit, off-hire aging, and cost exposure.'}
          </p>
        </div>

        {/* Toolbar Controls */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Metric Mode Toggle: Count vs Cost */}
          {perspective !== 'financial' && (
            <div className="inline-flex items-center bg-slate-100 dark:bg-slate-800 p-0.5 rounded-xl border border-slate-200/80 dark:border-slate-700/60 text-xs">
              <button
                type="button"
                onClick={() => setMetricMode('count')}
                className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                  metricMode === 'count'
                    ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-2xs'
                    : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {isTh ? 'จำนวนนั่งร้าน' : 'Count'}
              </button>
              <button
                type="button"
                onClick={() => setMetricMode('cost')}
                className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                  metricMode === 'cost'
                    ? 'bg-white dark:bg-slate-700 text-amber-600 dark:text-amber-400 shadow-2xs'
                    : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {isTh ? 'มูลค่าค่าเช่า (฿)' : 'Cost (THB)'}
              </button>
            </div>
          )}

          {/* Chart Layout Toggle: Vertical vs Horizontal */}
          <div className="inline-flex items-center bg-slate-100 dark:bg-slate-800 p-0.5 rounded-xl border border-slate-200/80 dark:border-slate-700/60 text-xs">
            <button
              type="button"
              onClick={() => setLayoutMode('vertical')}
              className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                layoutMode === 'vertical'
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-2xs font-bold'
                  : 'text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
              }`}
              title={isTh ? "กราฟแท่งแนวตั้ง" : "Vertical Column Chart"}
            >
              <BarChart3 size={15} />
            </button>
            <button
              type="button"
              onClick={() => setLayoutMode('horizontal')}
              className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                layoutMode === 'horizontal'
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-2xs font-bold'
                  : 'text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
              }`}
              title={isTh ? "กราฟแท่งแนวนอน" : "Horizontal Bar Chart"}
            >
              <SlidersHorizontal size={15} />
            </button>
          </div>
        </div>
      </div>

      {/* =========================================================================
          PERSPECTIVE SWITCHER TABS (4 Main Angles)
          ========================================================================= */}
      <div className="px-5 sm:px-6 pt-4 pb-2 border-b border-slate-100 dark:border-slate-800 flex items-center gap-2 overflow-x-auto no-scrollbar">
        <button
          type="button"
          onClick={() => setPerspective('contractor')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 shrink-0 ${
            perspective === 'contractor'
              ? 'bg-amber-600 text-white shadow-sm shadow-amber-600/25'
              : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <Users size={14} />
          <span>{isTh ? '1. แยกตามผู้รับเหมา (By Contractor)' : 'By Contractor'}</span>
        </button>

        <button
          type="button"
          onClick={() => setPerspective('area')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 shrink-0 ${
            perspective === 'area'
              ? 'bg-amber-600 text-white shadow-sm shadow-amber-600/25'
              : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <Building2 size={14} />
          <span>{isTh ? '2. แยกตามพื้นที่ / หน่วยผลิต (By Area)' : 'By Area / Unit'}</span>
        </button>

        <button
          type="button"
          onClick={() => setPerspective('aging')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 shrink-0 ${
            perspective === 'aging'
              ? 'bg-amber-600 text-white shadow-sm shadow-amber-600/25'
              : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <Clock size={14} />
          <span>{isTh ? '3. ช่วงอายุวันครบกำหนด (Due Date Aging)' : 'Aging & Due Timeline'}</span>
        </button>

        <button
          type="button"
          onClick={() => setPerspective('financial')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 shrink-0 ${
            perspective === 'financial'
              ? 'bg-amber-600 text-white shadow-sm shadow-amber-600/25'
              : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <DollarSign size={14} />
          <span>{isTh ? '4. เปรียบเทียบต้นทุน vs ส่วนเกิน (Financial)' : 'Cost vs Surcharge'}</span>
        </button>
      </div>

      {/* =========================================================================
          CHART DISPLAY CANVAS & BREAKDOWN PANEL
          ========================================================================= */}
      <div className="p-5 sm:p-6 space-y-6">
        {/* Status Legend Strip */}
        <div className="flex items-center justify-between flex-wrap gap-3 pb-2 text-xs">
          <div className="flex items-center gap-4 flex-wrap">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              {isTh ? 'สัญลักษณ์สถานะ:' : 'Status Legend:'}
            </span>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
              <span className="text-slate-600 dark:text-slate-300 font-medium">Active (ปกติ)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
              <span className="text-slate-600 dark:text-slate-300 font-medium">Due Soon (≤ 3 วัน)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
              <span className="text-slate-600 dark:text-slate-300 font-medium">Overdue (เกินกำหนด)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-slate-400" />
              <span className="text-slate-600 dark:text-slate-300 font-medium">Off-Hired (ปิดรายการ)</span>
            </div>
          </div>

          <div className="text-[11px] text-slate-400">
            {isTh ? '*คลิกที่แท่งกราฟเพื่อดูรายการเจาะลึก' : '*Click on any bar to filter tracking list'}
          </div>
        </div>

        {/* -----------------------------------------------------------------------
            VIEW 1: BY CONTRACTOR
            ----------------------------------------------------------------------- */}
        {perspective === 'contractor' && (
          <div className="space-y-6">
            {layoutMode === 'vertical' ? (
              // Vertical Bar Columns
              <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-800">
                <div className="h-64 sm:h-72 flex items-end justify-around gap-4 sm:gap-8 pt-8 pb-4 relative">
                  {/* Background Grid Lines */}
                  <div className="absolute inset-0 flex flex-col justify-between pointer-events-none opacity-20">
                    <div className="border-b border-dashed border-slate-400 w-full" />
                    <div className="border-b border-dashed border-slate-400 w-full" />
                    <div className="border-b border-dashed border-slate-400 w-full" />
                    <div className="border-b border-dashed border-slate-400 w-full" />
                  </div>

                  {contractorData.map((c, idx) => {
                    const totalVal = metricMode === 'cost' ? c.totalCost : c.total;
                    const heightPct = Math.max(12, Math.round((totalVal / maxContractorVal) * 100));

                    // Status proportions
                    const pctOverdue = c.total > 0 ? (c.overdue / c.total) * 100 : 0;
                    const pctDueSoon = c.total > 0 ? (c.dueSoon / c.total) * 100 : 0;
                    const pctActive = c.total > 0 ? (c.active / c.total) * 100 : 0;
                    const pctOffHired = c.total > 0 ? (c.offHired / c.total) * 100 : 0;

                    return (
                      <div 
                        key={c.name}
                        onClick={() => onDrillDown?.('contractor', c.name)}
                        onMouseEnter={() => setHoveredIndex(idx)}
                        onMouseLeave={() => setHoveredIndex(null)}
                        className="flex-1 max-w-[120px] flex flex-col items-center h-full justify-end relative group cursor-pointer"
                      >
                        {/* Value Badge on top */}
                        <div className="mb-2 text-center transition-transform group-hover:-translate-y-1">
                          <span className="font-mono font-extrabold text-xs text-slate-800 dark:text-slate-100 block">
                            {metricMode === 'cost' ? `฿${(c.totalCost / 1000).toFixed(0)}k` : `${c.total} ใบ`}
                          </span>
                          {c.overdue > 0 && (
                            <span className="text-[10px] text-rose-500 font-bold block font-mono">
                              +{c.overdue} overdue
                            </span>
                          )}
                        </div>

                        {/* Stacked Bar Column */}
                        <div 
                          className="w-full rounded-2xl overflow-hidden flex flex-col-reverse shadow-md transition-all group-hover:scale-105 group-hover:shadow-lg ring-1 ring-black/5 dark:ring-white/10"
                          style={{ height: `${heightPct}%` }}
                        >
                          {/* Segment: Off-Hired (Bottom) */}
                          <div style={{ height: `${pctOffHired}%` }} className="bg-slate-400 dark:bg-slate-500 w-full" />
                          {/* Segment: Active */}
                          <div style={{ height: `${pctActive}%` }} className="bg-emerald-500 w-full" />
                          {/* Segment: Due Soon */}
                          <div style={{ height: `${pctDueSoon}%` }} className="bg-amber-500 w-full" />
                          {/* Segment: Overdue (Top) */}
                          <div style={{ height: `${pctOverdue}%` }} className="bg-rose-500 w-full" />
                        </div>

                        {/* X-axis Label */}
                        <span className="mt-3 text-[11px] font-bold text-slate-600 dark:text-slate-400 text-center truncate w-full block group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors">
                          {c.name.replace(' Co., Ltd.', '').replace(' Service', '')}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              // Horizontal Bars
              <div className="space-y-3 p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-800">
                {contractorData.map(c => {
                  const totalVal = metricMode === 'cost' ? c.totalCost : c.total;
                  const widthPct = Math.max(10, Math.round((totalVal / maxContractorVal) * 100));

                  return (
                    <div 
                      key={c.name}
                      onClick={() => onDrillDown?.('contractor', c.name)}
                      className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800/80 hover:border-amber-400 dark:hover:border-amber-600 transition-all cursor-pointer group"
                    >
                      <div className="flex items-center justify-between text-xs mb-1.5">
                        <span className="font-bold text-slate-800 dark:text-slate-200 group-hover:text-amber-600 transition-colors">
                          {c.name}
                        </span>
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-slate-800 dark:text-slate-100">
                            {metricMode === 'cost' ? `฿${c.totalCost.toLocaleString()}` : `${c.total} ${isTh ? 'รายการ' : 'units'}`}
                          </span>
                          {c.overdue > 0 && (
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300">
                              {c.overdue} Overdue
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="w-full bg-slate-100 dark:bg-slate-800 h-3 rounded-full overflow-hidden flex">
                        <div style={{ width: `${(c.active / c.total) * widthPct}%` }} className="bg-emerald-500 h-full" title={`Active: ${c.active}`} />
                        <div style={{ width: `${(c.dueSoon / c.total) * widthPct}%` }} className="bg-amber-500 h-full" title={`Due Soon: ${c.dueSoon}`} />
                        <div style={{ width: `${(c.overdue / c.total) * widthPct}%` }} className="bg-rose-500 h-full" title={`Overdue: ${c.overdue}`} />
                        <div style={{ width: `${(c.offHired / c.total) * widthPct}%` }} className="bg-slate-400 h-full" title={`Off-Hired: ${c.offHired}`} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* -----------------------------------------------------------------------
            VIEW 2: BY AREA / PLANT UNIT
            ----------------------------------------------------------------------- */}
        {perspective === 'area' && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {areaData.map(a => {
                const totalVal = metricMode === 'cost' ? a.totalCost : a.total;
                const widthPct = Math.round((totalVal / maxAreaVal) * 100);

                return (
                  <div
                    key={a.name}
                    onClick={() => onDrillDown?.('area', a.name)}
                    className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-amber-400 dark:hover:border-amber-600 transition-all cursor-pointer group"
                  >
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-[10px] font-mono font-bold px-2 py-0.2 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                            {a.plant}
                          </span>
                          <span className="font-bold text-xs text-slate-900 dark:text-white group-hover:text-amber-600 transition-colors">
                            {a.name}
                          </span>
                        </div>
                      </div>

                      <div className="text-right">
                        <span className="font-mono font-extrabold text-xs text-slate-800 dark:text-slate-100 block">
                          {metricMode === 'cost' ? `฿${a.totalCost.toLocaleString()}` : `${a.total} ${isTh ? 'รายการ' : 'units'}`}
                        </span>
                        {a.overdueCost > 0 && (
                          <span className="text-[10px] font-mono font-bold text-rose-500 block">
                            +฿{a.overdueCost.toLocaleString()} surcharge
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="w-full bg-slate-100 dark:bg-slate-800 h-2.5 rounded-full overflow-hidden flex">
                      <div style={{ width: `${(a.active / a.total) * 100}%` }} className="bg-emerald-500 h-full" />
                      <div style={{ width: `${(a.dueSoon / a.total) * 100}%` }} className="bg-amber-500 h-full" />
                      <div style={{ width: `${(a.overdue / a.total) * 100}%` }} className="bg-rose-500 h-full" />
                      <div style={{ width: `${(a.offHired / a.total) * 100}%` }} className="bg-slate-400 h-full" />
                    </div>

                    <div className="mt-2.5 flex items-center justify-between text-[11px] text-slate-500">
                      <span>{isTh ? 'ใช้งานจริง:' : 'Active:'} <strong className="text-slate-700 dark:text-slate-300">{a.active + a.dueSoon + a.overdue}</strong></span>
                      <span>{isTh ? 'เกินกำหนด:' : 'Overdue:'} <strong className="text-rose-600 dark:text-rose-400">{a.overdue}</strong></span>
                      <span>{isTh ? 'ปิดรายการ:' : 'Closed:'} <strong className="text-slate-700 dark:text-slate-300">{a.offHired}</strong></span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* -----------------------------------------------------------------------
            VIEW 3: AGING & DUE DATE TIMELINE DISTRIBUTION
            ----------------------------------------------------------------------- */}
        {perspective === 'aging' && (
          <div className="space-y-4">
            <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-800">
              <div className="h-64 sm:h-72 flex items-end justify-around gap-2 sm:gap-4 pt-8 pb-4 relative">
                {/* Background Grid Lines */}
                <div className="absolute inset-0 flex flex-col justify-between pointer-events-none opacity-20">
                  <div className="border-b border-dashed border-slate-400 w-full" />
                  <div className="border-b border-dashed border-slate-400 w-full" />
                  <div className="border-b border-dashed border-slate-400 w-full" />
                  <div className="border-b border-dashed border-slate-400 w-full" />
                </div>

                {agingData.map(b => {
                  const val = metricMode === 'cost' ? b.cost : b.count;
                  const heightPct = Math.max(12, Math.round((val / maxAgingVal) * 100));

                  return (
                    <div 
                      key={b.id}
                      onClick={() => onDrillDown?.('status', b.status)}
                      className="flex-1 max-w-[100px] flex flex-col items-center h-full justify-end relative group cursor-pointer"
                    >
                      {/* Top label */}
                      <span className="mb-2 font-mono font-extrabold text-xs text-slate-800 dark:text-slate-100 group-hover:-translate-y-1 transition-transform">
                        {metricMode === 'cost' ? `฿${(b.cost / 1000).toFixed(0)}k` : `${b.count}`}
                      </span>

                      {/* Bar */}
                      <div 
                        className={`w-full rounded-2xl ${b.bg} shadow-md transition-all group-hover:scale-105 group-hover:shadow-lg`}
                        style={{ height: `${heightPct}%` }}
                      />

                      {/* X label */}
                      <span className="mt-3 text-[10px] sm:text-[11px] font-bold text-slate-600 dark:text-slate-400 text-center truncate w-full block">
                        {b.label}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-900 dark:text-amber-300 flex items-center gap-2">
              <Info size={16} className="shrink-0" />
              <span>
                {isTh 
                  ? 'รายการในแถบสีแดง (Overdue) กำลังสร้างค่าเช่าส่วนเกินรายวัน แนะนำให้กดเข้าไปดูรายการเพื่อดำเนินการปิด Off-Hire หรือขยายเวลาทันที'
                  : 'Red bars represent active overdue items generating daily cost leakages. Prioritize off-hiring them immediately.'}
              </span>
            </div>
          </div>
        )}

        {/* -----------------------------------------------------------------------
            VIEW 4: FINANCIAL & COST COMPARISON (Baseline vs Overdue Surcharge)
            ----------------------------------------------------------------------- */}
        {perspective === 'financial' && (
          <div className="space-y-6">
            {/* Top Insight Callout Strip */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="p-4 rounded-2xl bg-blue-50/60 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800/60">
                <span className="text-[11px] text-blue-700 dark:text-blue-300 block font-semibold">
                  {isTh ? 'ค่าเช่าตามแผนงาน (Budget Baseline)' : 'Planned Contract Value'}
                </span>
                <span className="text-xl font-black font-mono text-blue-900 dark:text-blue-200 mt-1 block">
                  ฿{insights.totalPlanned.toLocaleString()}
                </span>
              </div>

              <div className="p-4 rounded-2xl bg-rose-50/60 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800/60">
                <span className="text-[11px] text-rose-700 dark:text-rose-300 block font-semibold">
                  {isTh ? 'ค่าเช่าส่วนเกิน (Overdue Surcharge)' : 'Overdue Surcharge Waste'}
                </span>
                <span className="text-xl font-black font-mono text-rose-600 dark:text-rose-400 mt-1 block">
                  +฿{insights.totalOverdue.toLocaleString()}
                </span>
              </div>

              <div className="p-4 rounded-2xl bg-amber-50/60 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/60">
                <span className="text-[11px] text-amber-700 dark:text-amber-300 block font-semibold">
                  {isTh ? 'สัดส่วนค่าเช่าส่วนเกิน (Leakage Ratio)' : 'Surcharge Leakage Ratio'}
                </span>
                <span className="text-xl font-black font-mono text-amber-800 dark:text-amber-300 mt-1 block">
                  {insights.overduePct}%
                </span>
              </div>
            </div>

            {/* Dual Grouped Bar Comparison by Contractor */}
            <div className="space-y-3 p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-800">
              <div className="flex items-center justify-between text-xs font-bold text-slate-500 mb-2">
                <span>{isTh ? 'เปรียบเทียบค่าเช่าตามสัญญากับค่าเช่าส่วนเกินแยกตามผู้รับเหมา' : 'Planned vs Overdue Cost per Contractor'}</span>
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-sm bg-blue-600" />
                    <span>{isTh ? 'ค่าเช่าตามแผน' : 'Planned'}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-sm bg-rose-500" />
                    <span>{isTh ? 'ค่าเช่าส่วนเกิน' : 'Overdue Surcharge'}</span>
                  </div>
                </div>
              </div>

              {contractorData.map(c => {
                const maxVal = Math.max(...contractorData.map(item => Math.max(item.plannedCost, item.overdueCost)), 1);
                const plannedWidth = Math.round((c.plannedCost / maxVal) * 100);
                const overdueWidth = Math.round((c.overdueCost / maxVal) * 100);

                return (
                  <div 
                    key={c.name}
                    className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-2.5"
                  >
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-slate-900 dark:text-white">
                        {c.name}
                      </span>
                      <span className="font-mono text-slate-500 text-[11px]">
                        {isTh ? `รวม: ฿${c.totalCost.toLocaleString()}` : `Total: ฿${c.totalCost.toLocaleString()}`}
                      </span>
                    </div>

                    {/* Dual Bars */}
                    <div className="space-y-1.5">
                      {/* Bar 1: Planned */}
                      <div className="flex items-center gap-2 text-[11px]">
                        <span className="w-20 text-slate-400 font-mono shrink-0">Planned:</span>
                        <div className="flex-1 bg-slate-100 dark:bg-slate-800 h-2.5 rounded-full overflow-hidden">
                          <div style={{ width: `${plannedWidth}%` }} className="bg-blue-600 h-full rounded-full transition-all duration-500" />
                        </div>
                        <span className="w-24 font-mono font-bold text-right text-blue-600 dark:text-blue-400 shrink-0">
                          ฿{c.plannedCost.toLocaleString()}
                        </span>
                      </div>

                      {/* Bar 2: Overdue */}
                      <div className="flex items-center gap-2 text-[11px]">
                        <span className="w-20 text-slate-400 font-mono shrink-0">Overdue:</span>
                        <div className="flex-1 bg-slate-100 dark:bg-slate-800 h-2.5 rounded-full overflow-hidden">
                          <div style={{ width: `${overdueWidth}%` }} className="bg-rose-500 h-full rounded-full transition-all duration-500" />
                        </div>
                        <span className="w-24 font-mono font-bold text-right text-rose-500 shrink-0">
                          {c.overdueCost > 0 ? `+฿${c.overdueCost.toLocaleString()}` : '฿0'}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* =========================================================================
          KEY TAKEAWAY INSIGHTS STRIP (Footer)
          ========================================================================= */}
      <div className="px-5 sm:px-6 py-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/60 grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-amber-500/10 text-amber-600 flex items-center justify-center shrink-0">
            <Users size={14} />
          </div>
          <div>
            <span className="text-[10px] text-slate-400 uppercase tracking-wider block font-bold">
              {isTh ? 'ผู้รับเหมาที่มีงานมากที่สุด' : 'Busiest Contractor'}
            </span>
            <span className="font-bold text-slate-800 dark:text-slate-200">
              {contractorData[0]?.name || 'N/A'} ({contractorData[0]?.total || 0} นั่งร้าน)
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-rose-500/10 text-rose-600 flex items-center justify-center shrink-0">
            <AlertTriangle size={14} />
          </div>
          <div>
            <span className="text-[10px] text-slate-400 uppercase tracking-wider block font-bold">
              {isTh ? 'ผู้รับเหมาที่มีค่าเช่าส่วนเกินสูงสุด' : 'Highest Overdue Contractor'}
            </span>
            <span className="font-bold text-rose-600 dark:text-rose-400">
              {insights.worstContractor.name} (+฿{insights.worstContractor.overdueCost.toLocaleString()})
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-emerald-500/10 text-emerald-600 flex items-center justify-center shrink-0">
            <Building2 size={14} />
          </div>
          <div>
            <span className="text-[10px] text-slate-400 uppercase tracking-wider block font-bold">
              {isTh ? 'พื้นที่ที่มีนั่งร้านหนาแน่นสุด' : 'Dense Operating Unit'}
            </span>
            <span className="font-bold text-slate-800 dark:text-slate-200">
              {insights.busiestArea.name} ({insights.busiestArea.count} รายการ)
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
