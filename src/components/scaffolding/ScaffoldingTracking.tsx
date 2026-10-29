import React, { useState, useMemo, useEffect } from 'react';
import { 
  Building, Search, Filter, Plus, CalendarPlus, CheckCircle2, 
  AlertTriangle, Clock, Edit2, Eye, ArrowUpDown, ChevronDown, 
  RefreshCw, DollarSign, Calendar, Bell, ChevronRight, X, 
  Layers, Check, AlertCircle, FileText, MapPin
} from 'lucide-react';
import { 
  ScaffoldingItem, 
  ScaffoldingStatus,
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
import { useLanguage } from '../../context/LanguageContext';

interface ScaffoldingTrackingProps {
  items: ScaffoldingItem[];
  initialSelectedScaffoldId?: string;
  initialStatusFilter?: string;
  onNavigateToDashboard: () => void;
  selectedPlantFilter?: string;
}

export const ScaffoldingTracking: React.FC<ScaffoldingTrackingProps> = ({
  items,
  initialSelectedScaffoldId,
  initialStatusFilter,
  onNavigateToDashboard,
  selectedPlantFilter
}) => {
  const { language } = useLanguage();
  const isTh = language === 'th';

  // Search & Filter state
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>(initialStatusFilter || 'ALL');
  const [plantFilter, setPlantFilter] = useState<string>(selectedPlantFilter || 'ALL');
  const [contractorFilter, setContractorFilter] = useState<string>('ALL');

  // Sorting state
  const [sortField, setSortField] = useState<'daysRemaining' | 'plannedOffHireDate' | 'dailyRentalRate' | 'id'>('daysRemaining');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  // Modals state
  const [selectedScaffold, setSelectedScaffold] = useState<ScaffoldingItem | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isAddEditModalOpen, setIsAddEditModalOpen] = useState(false);
  const [isExtendModalOpen, setIsExtendModalOpen] = useState(false);
  const [isOffHireModalOpen, setIsOffHireModalOpen] = useState(false);
  const [isPlotPlanModalOpen, setIsPlotPlanModalOpen] = useState(false);

  // Notification slide-out drawer
  const [isNotificationDrawerOpen, setIsNotificationDrawerOpen] = useState(false);

  // Auto-focus selected item if navigated from dashboard
  useEffect(() => {
    if (initialSelectedScaffoldId) {
      const match = items.find(i => i.id === initialSelectedScaffoldId);
      if (match) {
        setSelectedScaffold(match);
        setIsDetailModalOpen(true);
      }
    }
  }, [initialSelectedScaffoldId, items]);

  useEffect(() => {
    if (initialStatusFilter) {
      setStatusFilter(initialStatusFilter);
    }
  }, [initialStatusFilter]);

  useEffect(() => {
    if (selectedPlantFilter && (selectedPlantFilter === 'Phra Khanong' || selectedPlantFilter === 'Sriracha')) {
      setPlantFilter(selectedPlantFilter);
    }
  }, [selectedPlantFilter]);

  // Unique contractors for filter
  const availableContractors = useMemo(() => {
    const set = new Set<string>();
    items.forEach(i => {
      if (i.contractor) set.add(i.contractor);
    });
    return Array.from(set).sort();
  }, [items]);

  // Notifications calculation
  const notifications = useMemo(() => {
    return generateScaffoldingNotifications(items);
  }, [items]);

  // Filter & Search Logic
  const filteredAndSortedItems = useMemo(() => {
    return items
      .map(item => ({
        item,
        metrics: calculateScaffoldMetrics(item)
      }))
      .filter(({ item, metrics }) => {
        // Status filter
        if (statusFilter !== 'ALL' && metrics.status !== statusFilter) return false;
        // Plant filter
        if (plantFilter !== 'ALL' && item.plant !== plantFilter) return false;
        // Contractor filter
        if (contractorFilter !== 'ALL' && item.contractor !== contractorFilter) return false;

        // Search Term (Scaffold ID, Job ID, Area, Location Details, Contractor, Responsible Person)
        if (searchTerm.trim()) {
          const q = searchTerm.toLowerCase();
          const matchId = item.id.toLowerCase().includes(q);
          const matchJob = item.jobId.toLowerCase().includes(q);
          const matchArea = item.area.toLowerCase().includes(q);
          const matchLoc = (item.locationDetails || '').toLowerCase().includes(q);
          const matchContractor = item.contractor.toLowerCase().includes(q);
          const matchPerson = item.responsiblePerson.toLowerCase().includes(q);
          if (!matchId && !matchJob && !matchArea && !matchLoc && !matchContractor && !matchPerson) {
            return false;
          }
        }

        return true;
      })
      .sort((a, b) => {
        let valA: any;
        let valB: any;

        if (sortField === 'daysRemaining') {
          // Put Overdue first, then Due Soon, Active, then Off-Hired
          if (a.metrics.status === 'Off-Hired' && b.metrics.status !== 'Off-Hired') return 1;
          if (a.metrics.status !== 'Off-Hired' && b.metrics.status === 'Off-Hired') return -1;
          valA = a.metrics.daysRemaining;
          valB = b.metrics.daysRemaining;
        } else if (sortField === 'plannedOffHireDate') {
          valA = new Date(a.item.plannedOffHireDate).getTime();
          valB = new Date(b.item.plannedOffHireDate).getTime();
        } else if (sortField === 'dailyRentalRate') {
          valA = a.item.dailyRentalRate;
          valB = b.item.dailyRentalRate;
        } else {
          valA = a.item.id;
          valB = b.item.id;
        }

        if (valA < valB) return sortDirection === 'asc' ? -1 : 1;
        if (valA > valB) return sortDirection === 'asc' ? 1 : -1;
        return 0;
      });
  }, [items, statusFilter, plantFilter, contractorFilter, searchTerm, sortField, sortDirection]);

  const handleSort = (field: 'daysRemaining' | 'plannedOffHireDate' | 'dailyRentalRate' | 'id') => {
    if (sortField === field) {
      setSortDirection(prev => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const handleResetFilters = () => {
    setSearchTerm('');
    setStatusFilter('ALL');
    setPlantFilter('ALL');
    setContractorFilter('ALL');
  };

  const existingIds = useMemo(() => items.map(i => i.id), [items]);

  return (
    <div className="space-y-5 animate-in fade-in duration-200">
      {/* =========================================================================
          PAGE HEADER
          ========================================================================= */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs p-5 sm:p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full font-mono bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
              {isTh ? 'โมดูลบริหารจัดการงานนั่งร้าน (SCAFFOLDING TRACKING)' : 'SCAFFOLDING TRACKING MODULE'}
            </span>
            <span className="text-xs text-slate-400 font-mono">
              {isTh ? `ระบบคำนวณสถานะอัตโนมัติ (ณ ${SYSTEM_CURRENT_DATE})` : `Auto-tracked as of ${SYSTEM_CURRENT_DATE}`}
            </span>
          </div>

          <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2.5 mt-1.5">
            <Layers className="text-amber-600 dark:text-amber-400 shrink-0" size={24} />
            <span>{isTh ? 'จัดการและติดตามสถานะนั่งร้าน (Scaffolding Tracking)' : 'Scaffolding Rental Tracking & Operations'}</span>
          </h2>

          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed mt-0.5">
            {isTh 
              ? 'ตรวจสอบวันครบกำหนด ขยายระยะเวลาเช่า (Extend) และบันทึกยืนยัน Off-Hire เมื่อใช้งานเสร็จสิ้น' 
              : 'Monitor due dates, execute rental extensions, and record official off-hire dates.'}
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2.5 shrink-0 flex-wrap">
          {/* Notification Button with badge */}
          <button
            type="button"
            onClick={() => setIsNotificationDrawerOpen(true)}
            className="h-10 px-3.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-xs flex items-center gap-2 transition-colors cursor-pointer relative"
          >
            <Bell size={15} className="text-amber-500" />
            <span>{isTh ? 'การแจ้งเตือน Off-Hire' : 'Alerts'}</span>
            {notifications.length > 0 && (
              <span className="px-1.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-rose-500 text-white">
                {notifications.length}
              </span>
            )}
          </button>

          {/* Add New Scaffold Button */}
          <button
            type="button"
            onClick={() => {
              setSelectedScaffold(null);
              setIsAddEditModalOpen(true);
            }}
            className="h-10 px-4 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs flex items-center gap-2 shadow-md shadow-amber-600/25 transition-all cursor-pointer active:scale-95"
          >
            <Plus size={16} className="stroke-[3]" />
            <span>{isTh ? '+ เพิ่มรายการนั่งร้าน' : '+ Add Scaffold'}</span>
          </button>
        </div>
      </div>

      {/* =========================================================================
          NOTIFICATION ALERT BANNER (If Active Triggers Exist)
          ========================================================================= */}
      {notifications.length > 0 && (
        <div className="bg-gradient-to-r from-amber-500/15 via-amber-500/10 to-rose-500/15 border border-amber-500/30 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs animate-in fade-in duration-300">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-sm">
              <AlertTriangle size={16} />
            </div>
            <div>
              <span className="font-bold text-slate-900 dark:text-white block">
                {isTh ? `พบ ${notifications.length} รายการที่ถึงเกณฑ์แจ้งเตือน Off-Hire` : `${notifications.length} Scaffolding Off-Hire Triggers Active`}
              </span>
              <span className="text-[11px] text-slate-600 dark:text-slate-400">
                {isTh 
                  ? 'ระบบตรวจสอบ: ล่วงหน้า 3 วัน, 1 วัน, ครบกำหนดวันนี้ และเกินกำหนด (Overdue)'
                  : 'Triggers: 3 days before, 1 day before, on due date, and overdue.'}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setStatusFilter('Overdue')}
              className="px-2.5 py-1 rounded-lg bg-rose-100 dark:bg-rose-950/80 text-rose-700 dark:text-rose-300 hover:bg-rose-200 text-[11px] font-bold transition-colors cursor-pointer"
            >
              {isTh ? 'กรองเฉพาะ Overdue' : 'Filter Overdue'}
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('Due Soon')}
              className="px-2.5 py-1 rounded-lg bg-amber-100 dark:bg-amber-950/80 text-amber-700 dark:text-amber-300 hover:bg-amber-200 text-[11px] font-bold transition-colors cursor-pointer"
            >
              {isTh ? 'กรองเฉพาะ Due Soon' : 'Filter Due Soon'}
            </button>
            <button
              type="button"
              onClick={() => setIsNotificationDrawerOpen(true)}
              className="px-3 py-1 rounded-lg bg-slate-900 text-white dark:bg-white dark:text-slate-900 text-[11px] font-bold hover:opacity-90 transition-opacity cursor-pointer"
            >
              {isTh ? 'ดูรายละเอียด' : 'View Drawer'}
            </button>
          </div>
        </div>
      )}

      {/* =========================================================================
          SEARCH & FILTER TOOLBAR
          ========================================================================= */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 shadow-xs space-y-3">
        {/* Status Filter Tabs (Segmented Control) */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar text-xs">
          <button
            type="button"
            onClick={() => setStatusFilter('ALL')}
            className={`px-3.5 py-1.5 rounded-xl font-bold transition-all cursor-pointer flex items-center gap-1.5 shrink-0 ${
              statusFilter === 'ALL'
                ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-sm'
                : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <span>{isTh ? 'ทั้งหมด' : 'All'}</span>
            <span className="text-[10px] font-mono px-1.5 py-0.2 rounded-full bg-slate-200/50 dark:bg-slate-700">
              {items.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setStatusFilter('Active')}
            className={`px-3.5 py-1.5 rounded-xl font-bold transition-all cursor-pointer flex items-center gap-1.5 shrink-0 ${
              statusFilter === 'Active'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/40'
            }`}
          >
            <div className="w-2 h-2 rounded-full bg-emerald-500" />
            <span>{isTh ? 'Active (กำลังเช่า)' : 'Active'}</span>
          </button>

          <button
            type="button"
            onClick={() => setStatusFilter('Due Soon')}
            className={`px-3.5 py-1.5 rounded-xl font-bold transition-all cursor-pointer flex items-center gap-1.5 shrink-0 ${
              statusFilter === 'Due Soon'
                ? 'bg-amber-600 text-white shadow-sm'
                : 'text-slate-500 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/40'
            }`}
          >
            <div className="w-2 h-2 rounded-full bg-amber-500" />
            <span>{isTh ? 'Due Soon (≤ 3 วัน)' : 'Due Soon'}</span>
          </button>

          <button
            type="button"
            onClick={() => setStatusFilter('Overdue')}
            className={`px-3.5 py-1.5 rounded-xl font-bold transition-all cursor-pointer flex items-center gap-1.5 shrink-0 ${
              statusFilter === 'Overdue'
                ? 'bg-rose-600 text-white shadow-sm'
                : 'text-slate-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40'
            }`}
          >
            <div className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
            <span>{isTh ? 'Overdue (เกินกำหนด)' : 'Overdue'}</span>
          </button>

          <button
            type="button"
            onClick={() => setStatusFilter('Off-Hired')}
            className={`px-3.5 py-1.5 rounded-xl font-bold transition-all cursor-pointer flex items-center gap-1.5 shrink-0 ${
              statusFilter === 'Off-Hired'
                ? 'bg-slate-600 text-white shadow-sm'
                : 'text-slate-500 hover:text-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <div className="w-2 h-2 rounded-full bg-slate-400" />
            <span>{isTh ? 'Off-Hired (ปิดรายการ)' : 'Off-Hired'}</span>
          </button>
        </div>

        {/* Search Input & Dropdown Filters Row */}
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 pt-2 border-t border-slate-100 dark:border-slate-800">
          {/* Search box */}
          <div className="sm:col-span-6 relative">
            <Search size={15} className="absolute left-3.5 top-2.5 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              placeholder={isTh ? 'ค้นหา Scaffold ID, Job, พื้นที่, ผู้รับเหมา, ผู้รับผิดชอบ...' : 'Search by ID, Job, Area, Contractor, Inspector...'}
              className="w-full h-9 pl-9 pr-8 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-amber-500 focus:outline-hidden"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
              >
                <X size={14} />
              </button>
            )}
          </div>

          {/* Plant Dropdown */}
          <div className="sm:col-span-3">
            <select
              value={plantFilter}
              onChange={e => setPlantFilter(e.target.value)}
              className="w-full h-9 px-3 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-amber-500 focus:outline-hidden font-medium"
            >
              <option value="ALL">{isTh ? 'ทุกโรงงาน (All Plants)' : 'All Plants'}</option>
              <option value="Phra Khanong">Phra Khanong (PK)</option>
              <option value="Sriracha">Sriracha (SR)</option>
            </select>
          </div>

          {/* Contractor Dropdown */}
          <div className="sm:col-span-3">
            <select
              value={contractorFilter}
              onChange={e => setContractorFilter(e.target.value)}
              className="w-full h-9 px-3 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-amber-500 focus:outline-hidden font-medium"
            >
              <option value="ALL">{isTh ? 'ทุกผู้รับเหมา' : 'All Contractors'}</option>
              {availableContractors.map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* =========================================================================
          SCAFFOLDING LIST DATA TABLE
          ========================================================================= */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
        {filteredAndSortedItems.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-400 flex items-center justify-center mx-auto">
              <Building size={24} />
            </div>
            <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200">
              {isTh ? 'ไม่พบข้อมูลนั่งร้านตามเงื่อนไขที่เลือก' : 'No Scaffolding Items Match Your Criteria'}
            </h4>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
              {isTh ? 'ลองปรับเปลี่ยนคำค้นหา หรือรีเซ็ตตัวกรองเพื่อดูข้อมูลทั้งหมด' : 'Try adjusting your search terms or reset filters.'}
            </p>
            <button
              type="button"
              onClick={handleResetFilters}
              className="mt-2 px-4 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold transition-colors cursor-pointer"
            >
              {isTh ? 'รีเซ็ตตัวกรอง' : 'Reset Filters'}
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider text-[10px] border-b border-slate-100 dark:border-slate-800">
                  <th 
                    onClick={() => handleSort('id')}
                    className="py-3 px-4 sm:px-6 cursor-pointer hover:text-slate-900 dark:hover:text-white transition-colors"
                  >
                    <div className="flex items-center gap-1.5">
                      <span>{isTh ? 'รหัสนั่งร้าน' : 'Scaffold ID'}</span>
                      <ArrowUpDown size={11} />
                    </div>
                  </th>
                  <th className="py-3 px-4">{isTh ? 'Job ที่เกี่ยวข้อง' : 'Job ID'}</th>
                  <th className="py-3 px-4">{isTh ? 'โรงงาน' : 'Plant'}</th>
                  <th className="py-3 px-4">{isTh ? 'พื้นที่ติดตั้ง' : 'Area / Location'}</th>
                  <th className="py-3 px-4">{isTh ? 'ผู้รับเหมา' : 'Contractor'}</th>
                  <th className="py-3 px-4">{isTh ? 'วันเริ่มเช่า' : 'Rental Start'}</th>
                  <th 
                    onClick={() => handleSort('plannedOffHireDate')}
                    className="py-3 px-4 cursor-pointer hover:text-slate-900 dark:hover:text-white transition-colors"
                  >
                    <div className="flex items-center gap-1.5">
                      <span>{isTh ? 'วันกำหนด Off-Hire' : 'Off-Hire Due'}</span>
                      <ArrowUpDown size={11} />
                    </div>
                  </th>
                  <th 
                    onClick={() => handleSort('daysRemaining')}
                    className="py-3 px-4 cursor-pointer hover:text-slate-900 dark:hover:text-white transition-colors"
                  >
                    <div className="flex items-center gap-1.5">
                      <span>{isTh ? 'วันคงเหลือ' : 'Days Remaining'}</span>
                      <ArrowUpDown size={11} />
                    </div>
                  </th>
                  <th className="py-3 px-4">{isTh ? 'สถานะ' : 'Status'}</th>
                  <th className="py-3 px-4 text-right pr-6">{isTh ? 'การจัดการ (Action)' : 'Action'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredAndSortedItems.map(({ item, metrics }) => {
                  const isOffHired = metrics.isOffHired;
                  const isOverdue = metrics.status === 'Overdue';
                  const isDueSoon = metrics.status === 'Due Soon';

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
                          className="font-mono font-bold text-slate-900 dark:text-slate-100 hover:text-amber-600 dark:hover:text-amber-400 cursor-pointer text-left flex items-center gap-1"
                        >
                          <span>{item.id}</span>
                        </button>
                      </td>

                      {/* Job ID */}
                      <td className="py-3 px-4 font-mono text-slate-600 dark:text-slate-400 font-semibold">
                        {item.jobId}
                      </td>

                      {/* Plant */}
                      <td className="py-3 px-4">
                        <span className={`px-2 py-0.5 rounded-md font-mono text-[10px] font-bold ${
                          item.plant === 'Phra Khanong'
                            ? 'bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300'
                            : 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300'
                        }`}>
                          {item.plant === 'Phra Khanong' ? 'PK' : 'SR'}
                        </span>
                      </td>

                      {/* Area / Location with Grid Pin Badge */}
                      <td className="py-3 px-4">
                        <span className="font-semibold text-slate-800 dark:text-slate-200 block truncate max-w-[190px]">
                          {item.area}
                        </span>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedScaffold(item);
                              setIsPlotPlanModalOpen(true);
                            }}
                            className="inline-flex items-center gap-1 text-[10px] font-mono font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/60 px-1.5 py-0.2 rounded-md hover:bg-blue-100 dark:hover:bg-blue-900/60 transition-colors cursor-pointer"
                            title={isTh ? "คลิกเพื่อดูพิกัดบนแผนผัง" : "Click to view on plot plan"}
                          >
                            <MapPin size={10} />
                            <span>Grid {item.gridZone || 'B3'}</span>
                          </button>
                          {item.locationDetails && (
                            <span className="text-[10px] text-slate-400 truncate max-w-[110px]">
                              {item.locationDetails}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Contractor */}
                      <td className="py-3 px-4 text-slate-700 dark:text-slate-300 truncate max-w-[160px]">
                        {item.contractor}
                      </td>

                      {/* Rental Start Date */}
                      <td className="py-3 px-4 font-mono text-slate-500 dark:text-slate-400">
                        {item.rentalStartDate}
                      </td>

                      {/* Off-Hire Due Date */}
                      <td className="py-3 px-4 font-mono text-slate-700 dark:text-slate-300 font-bold">
                        {item.plannedOffHireDate}
                      </td>

                      {/* Days Remaining / Overdue */}
                      <td className="py-3 px-4">
                        {isOffHired ? (
                          <span className="font-mono text-slate-400 text-[11px]">
                            {isTh ? `ปิดเมื่อ ${item.actualOffHireDate}` : `Closed ${item.actualOffHireDate}`}
                          </span>
                        ) : isOverdue ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-xs font-bold font-mono bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-800">
                            <AlertTriangle size={11} />
                            <span>{isTh ? `เกิน ${metrics.overdueDays} วัน` : `-${metrics.overdueDays}d`}</span>
                          </span>
                        ) : isDueSoon ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-xs font-bold font-mono bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                            <Clock size={11} />
                            <span>{metrics.daysRemaining === 0 ? (isTh ? 'วันนี้' : 'Today') : `${metrics.daysRemaining}d`}</span>
                          </span>
                        ) : (
                          <span className="font-mono text-emerald-600 dark:text-emerald-400 font-bold">
                            +{metrics.daysRemaining}d
                          </span>
                        )}
                      </td>

                      {/* Status Badge */}
                      <td className="py-3 px-4">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                          isOverdue 
                            ? 'bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400 border-rose-200 dark:border-rose-800'
                            : isDueSoon 
                            ? 'bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-800'
                            : isOffHired
                            ? 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-700'
                            : 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800'
                        }`}>
                          {metrics.status}
                        </span>
                      </td>

                      {/* Actions: View / Pin / Edit / Extend / Off-Hire */}
                      <td className="py-3 px-4 text-right pr-6">
                        <div className="flex items-center justify-end gap-1">
                          {/* View Pin on Plot Plan */}
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedScaffold(item);
                              setIsPlotPlanModalOpen(true);
                            }}
                            className="p-1.5 rounded-lg text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/40 transition-colors cursor-pointer"
                            title={isTh ? "ดูพิกัดบนแผนผังโรงกลั่น (View Pin)" : "View Pin on Plot Plan"}
                          >
                            <MapPin size={14} />
                          </button>

                          {/* View */}
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedScaffold(item);
                              setIsDetailModalOpen(true);
                            }}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-800 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                            title={isTh ? "ดูรายละเอียด & ค่าเช่า" : "View Details & Cost"}
                          >
                            <Eye size={14} />
                          </button>

                          {/* Edit (disabled if Off-Hired) */}
                          <button
                            type="button"
                            disabled={isOffHired}
                            onClick={() => {
                              setSelectedScaffold(item);
                              setIsAddEditModalOpen(true);
                            }}
                            className={`p-1.5 rounded-lg transition-colors ${
                              isOffHired 
                                ? 'text-slate-300 dark:text-slate-700 cursor-not-allowed opacity-50' 
                                : 'text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/40 cursor-pointer'
                            }`}
                            title={isOffHired ? (isTh ? "ไม่สามารถแก้ไขรายการที่ Off-Hire แล้ว" : "Cannot edit off-hired item") : (isTh ? "แก้ไขข้อมูล" : "Edit")}
                          >
                            <Edit2 size={14} />
                          </button>

                          {/* Extend (disabled if Off-Hired) */}
                          <button
                            type="button"
                            disabled={isOffHired}
                            onClick={() => {
                              setSelectedScaffold(item);
                              setIsExtendModalOpen(true);
                            }}
                            className={`p-1.5 rounded-lg transition-colors ${
                              isOffHired 
                                ? 'text-slate-300 dark:text-slate-700 cursor-not-allowed opacity-50' 
                                : 'text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/40 cursor-pointer'
                            }`}
                            title={isOffHired ? (isTh ? "ไม่สามารถขยายเวลาสำหรับรายการที่ Off-Hire แล้ว" : "Cannot extend off-hired item") : (isTh ? "ขยายระยะเวลาเช่า (Extend)" : "Extend Rental")}
                          >
                            <CalendarPlus size={14} />
                          </button>

                          {/* Off-Hire (disabled if already Off-Hired) */}
                          {!isOffHired && (
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedScaffold(item);
                                setIsOffHireModalOpen(true);
                              }}
                              className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] shadow-sm transition-all cursor-pointer flex items-center gap-1"
                              title={isTh ? "ยืนยันปิดรายการ Off-Hire" : "Confirm Off-Hire"}
                            >
                              <CheckCircle2 size={12} />
                              <span className="hidden xl:inline">{isTh ? 'Off-Hire' : 'Off-Hire'}</span>
                            </button>
                          )}
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
          NOTIFICATION SLIDE-OUT DRAWER
          ========================================================================= */}
      {isNotificationDrawerOpen && (
        <div className="fixed inset-0 z-50 flex justify-end bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 w-full max-w-md h-full shadow-2xl border-l border-slate-200 dark:border-slate-800 flex flex-col animate-in slide-in-from-right duration-300">
            {/* Drawer Header */}
            <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-900/50 shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-amber-500 text-white flex items-center justify-center font-bold">
                  <Bell size={16} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    {isTh ? 'การแจ้งเตือนกำหนด Off-Hire' : 'Off-Hire System Notifications'}
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    {isTh ? `พบ ${notifications.length} การแจ้งเตือนที่ต้องดำเนินการ` : `${notifications.length} active alerts`}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsNotificationDrawerOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Notifications List */}
            <div className="overflow-y-auto p-4 space-y-3 flex-1 text-xs">
              {notifications.length === 0 ? (
                <div className="p-8 text-center text-slate-400">
                  <CheckCircle2 size={24} className="mx-auto text-emerald-500 mb-2" />
                  <p>{isTh ? 'ไม่มีการแจ้งเตือนค้างอยู่' : 'No pending notifications'}</p>
                </div>
              ) : (
                notifications.map(notif => (
                  <div
                    key={notif.id}
                    className={`p-3.5 rounded-2xl border transition-all ${
                      notif.severity === 'critical'
                        ? 'bg-rose-50/50 dark:bg-rose-950/20 border-rose-200 dark:border-rose-900/40 text-rose-900 dark:text-rose-200'
                        : notif.severity === 'warning'
                        ? 'bg-amber-50/50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-900/40 text-amber-900 dark:text-amber-200'
                        : 'bg-blue-50/50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-900/40 text-blue-900 dark:text-blue-200'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-bold text-[11px] font-mono">
                        {notif.scaffoldId} · {notif.jobId}
                      </span>
                      <span className="text-[10px] opacity-75 font-mono">
                        {notif.timestamp}
                      </span>
                    </div>

                    <h4 className="font-bold text-xs mb-1">
                      {notif.title}
                    </h4>

                    <p className="text-[11px] opacity-90 leading-relaxed mb-2.5">
                      {notif.message}
                    </p>

                    <div className="pt-2 border-t border-current/10 flex items-center justify-between text-[11px]">
                      <span className="opacity-75">
                        {isTh ? 'ผู้รับผิดชอบ:' : 'Owner:'} {notif.responsiblePerson}
                      </span>

                      <button
                        type="button"
                        onClick={() => {
                          const item = items.find(i => i.id === notif.scaffoldId);
                          if (item) {
                            setSelectedScaffold(item);
                            setIsDetailModalOpen(true);
                            setIsNotificationDrawerOpen(false);
                          }
                        }}
                        className="font-bold underline hover:opacity-80 cursor-pointer"
                      >
                        {isTh ? 'จัดการทันที →' : 'Take Action →'}
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-slate-100 dark:border-slate-800 text-center">
              <button
                type="button"
                onClick={() => setIsNotificationDrawerOpen(false)}
                className="w-full py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs cursor-pointer hover:bg-slate-200"
              >
                {isTh ? 'ปิดหน้าต่าง' : 'Close'}
              </button>
            </div>
          </div>
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
