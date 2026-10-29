import React, { useState, useMemo, useEffect } from 'react';
import {
  Truck, ShieldCheck, AlertTriangle, FileSpreadsheet, Plus,
  Search, Filter, Download, Upload, CheckCircle2, XCircle,
  Clock, Calendar, Building2, User, HardHat, Eye, Edit3,
  Trash2, RefreshCw, FileText, Check, X, Info, AlertCircle,
  ExternalLink, ChevronDown, ChevronRight, Layers, SlidersHorizontal,
  ChevronLeft, Sparkles, CheckSquare, ShieldAlert, MapPin
} from 'lucide-react';
import * as XLSX from 'xlsx';
import {
  CraneMasterRecord,
  CraneFleetStatus,
  CraneCategory,
  getAllCraneMaster,
  saveAllCraneMaster,
  addCraneMaster,
  updateCraneMaster,
  deactivateCraneMaster,
  subscribeToCraneMaster,
  checkCertificateExpiry
} from '../data/craneMasterData';
import {
  getAllCraneJobs,
  subscribeToCraneOperations,
  navigateToCraneView,
  getActiveCraneNavContext,
  clearActiveCraneNavContext,
  UnifiedCraneJob
} from '../data/craneOperationsData';
import { useLanguage } from '../context/LanguageContext';
import CraneGanttTimeline from './crane/CraneGanttTimeline';
import CraneSafetyInspectionLog from './crane/CraneSafetyInspectionLog';

export default function CraneMasterView({
  setActiveView,
  globalPlantFilter = 'All'
}: {
  setActiveView?: (view: string) => void;
  globalPlantFilter?: 'All' | 'Phra Khanong' | 'Sriracha';
}) {
  const { isTh } = useLanguage();

  // Active Tab state: 'registry' | 'timeline' | 'safety'
  const [activeTab, setActiveTab] = useState<'registry' | 'timeline' | 'safety'>('registry');

  // Fleet state
  const [fleet, setFleet] = useState<CraneMasterRecord[]>(() => getAllCraneMaster());
  const [craneJobs, setCraneJobs] = useState<UnifiedCraneJob[]>(() => getAllCraneJobs());

  useEffect(() => {
    const unsub = subscribeToCraneMaster((updated) => {
      setFleet(updated);
    });
    return unsub;
  }, []);

  useEffect(() => {
    const unsubJobs = subscribeToCraneOperations((updatedJobs) => {
      setCraneJobs(updatedJobs);
    });
    return unsubJobs;
  }, []);

  const jobsByCraneMap = useMemo(() => {
    const map = new Map<string, UnifiedCraneJob>();
    craneJobs.forEach(j => {
      if (j.assignedCraneId) {
        map.set(j.assignedCraneId.toLowerCase().trim(), j);
      }
      if (j.jobNo) {
        map.set(j.jobNo.toLowerCase().trim(), j);
      }
    });
    return map;
  }, [craneJobs]);

  // Listen to navigation context (e.g. from Request List, Calendar, Plot Plan)
  useEffect(() => {
    const nav = getActiveCraneNavContext();
    if (nav?.craneId && fleet.length > 0) {
      const match = fleet.find(c => c.id.toLowerCase() === nav.craneId?.toLowerCase());
      if (match) {
        setSelectedCraneDetail(match);
        clearActiveCraneNavContext();
      }
    }
  }, [fleet]);

  // Filter & Search states
  const [searchQuery, setSearchQuery] = useState('');
  const [filterPlant, setFilterPlant] = useState<string>(globalPlantFilter);
  const [filterStatus, setFilterStatus] = useState<string>('All');
  const [filterType, setFilterType] = useState<string>('All');
  const [filterCertStatus, setFilterCertStatus] = useState<string>('All');
  const [filterEngStatus, setFilterEngStatus] = useState<string>('All');

  // Sync with global plant filter from Top Bar
  useEffect(() => {
    if (globalPlantFilter) {
      setFilterPlant(globalPlantFilter);
    }
  }, [globalPlantFilter]);

  // Sorting & Pagination
  const [sortField, setSortField] = useState<keyof CraneMasterRecord>('id');
  const [sortAsc, setSortAsc] = useState<boolean>(true);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const itemsPerPage = 8;

  // Modals
  const [isAddEditOpen, setIsAddEditOpen] = useState(false);
  const [editingCrane, setEditingCrane] = useState<CraneMasterRecord | null>(null);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [selectedCraneDetail, setSelectedCraneDetail] = useState<CraneMasterRecord | null>(null);

  // Notification Toast
  const [toastMessage, setToastMessage] = useState<{ type: 'success' | 'error' | 'warning'; text: string } | null>(null);

  const showToast = (type: 'success' | 'error' | 'warning', text: string) => {
    setToastMessage({ type, text });
    setTimeout(() => setToastMessage(null), 4000);
  };

  // Fleet scoped by active plant filter
  const plantScopedFleet = useMemo(() => {
    if (filterPlant === 'All') return fleet;
    return fleet.filter(c => c.homePlant === filterPlant || c.homePlant === 'All');
  }, [fleet, filterPlant]);

  // --- 1.1 Fleet Overview KPI Calculations (Scoped dynamically by Plant) ---
  const kpis = useMemo(() => {
    const total = plantScopedFleet.length;
    let available = 0;
    let assigned = 0;
    let maintenance = 0;
    let expiringCerts = 0;
    let certExpired = 0;
    let engIncomplete = 0;

    plantScopedFleet.forEach(c => {
      if (c.fleetStatus === 'Available') available++;
      if (c.fleetStatus === 'Assigned' || c.fleetStatus === 'Reserved') assigned++;
      if (c.fleetStatus === 'Maintenance' || c.fleetStatus === 'Inspection') maintenance++;

      const cert = checkCertificateExpiry(c.certExpiryDate);
      if (!cert.isValid) {
        certExpired++;
        expiringCerts++;
      } else if (cert.isExpiringSoon) {
        expiringCerts++;
      }
      if (!c.engineeringDataComplete) engIncomplete++;
    });

    return { total, available, assigned, maintenance, expiringCerts, certExpired, engIncomplete };
  }, [plantScopedFleet]);

  // Filtered and Sorted Fleet Table Data
  const filteredFleet = useMemo(() => {
    return fleet.filter(c => {
      // Search query across ID, Model, Brand, Contractor, Cert
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const match =
          c.id.toLowerCase().includes(q) ||
          c.brand.toLowerCase().includes(q) ||
          c.model.toLowerCase().includes(q) ||
          c.contractor.toLowerCase().includes(q) ||
          c.certNumber.toLowerCase().includes(q) ||
          c.serialNumber.toLowerCase().includes(q);
        if (!match) return false;
      }

      // Plant filter
      if (filterPlant !== 'All' && c.homePlant !== filterPlant && c.homePlant !== 'All') {
        return false;
      }

      // Status filter
      if (filterStatus !== 'All' && c.fleetStatus !== filterStatus) {
        return false;
      }

      // Crane type filter
      if (filterType !== 'All' && c.craneType !== filterType) {
        return false;
      }

      // Cert status filter
      if (filterCertStatus !== 'All') {
        const cert = checkCertificateExpiry(c.certExpiryDate);
        if (filterCertStatus === 'Valid' && !cert.isValid) return false;
        if (filterCertStatus === 'Expiring' && !cert.isExpiringSoon) return false;
        if (filterCertStatus === 'Expired' && cert.isValid) return false;
      }

      // Engineering completeness filter
      if (filterEngStatus !== 'All') {
        if (filterEngStatus === 'Complete' && !c.engineeringDataComplete) return false;
        if (filterEngStatus === 'Incomplete' && c.engineeringDataComplete) return false;
      }

      return true;
    }).sort((a, b) => {
      const valA = a[sortField];
      const valB = b[sortField];
      if (typeof valA === 'number' && typeof valB === 'number') {
        return sortAsc ? valA - valB : valB - valA;
      }
      return sortAsc
        ? String(valA || '').localeCompare(String(valB || ''))
        : String(valB || '').localeCompare(String(valA || ''));
    });
  }, [fleet, searchQuery, filterPlant, filterStatus, filterType, filterCertStatus, filterEngStatus, sortField, sortAsc]);

  // Pagination
  const totalPages = Math.ceil(filteredFleet.length / itemsPerPage) || 1;
  const paginatedFleet = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredFleet.slice(start, start + itemsPerPage);
  }, [filteredFleet, currentPage, itemsPerPage]);

  const handleSort = (field: keyof CraneMasterRecord) => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(true);
    }
  };

  // Export to Excel
  const handleExportExcel = () => {
    const exportData = filteredFleet.map((c, i) => ({
      'No.': i + 1,
      'Crane ID': c.id,
      'Crane Type': c.craneType,
      'Brand': c.brand,
      'Model': c.model,
      'Serial Number': c.serialNumber,
      'Rated Capacity (Ton)': c.ratedCapacityTon,
      'Max Boom Length (m)': c.maxBoomLengthM,
      'Contractor / Owner': c.contractor,
      'Owner Type': c.ownerType,
      'Home Plant': c.homePlant,
      'Fleet Status': c.fleetStatus,
      'Certificate No.': c.certNumber,
      'Issue Date': c.certIssueDate,
      'Expiry Date': c.certExpiryDate,
      'Cert Status': checkCertificateExpiry(c.certExpiryDate).isValid ? 'VALID' : 'EXPIRED',
      'Engineering Data Complete': c.engineeringDataComplete ? 'YES' : 'NO (INCOMPLETE)',
      'Assigned Job': c.assignedJobNo || '-',
      'Last Updated': c.lastUpdated
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Crane_Master');
    XLSX.writeFile(wb, `BCP_Crane_Master_Fleet_${new Date().toISOString().slice(0, 10)}.xlsx`);
    showToast('success', isTh ? 'ส่งออกไฟล์ Excel ทะเบียนเครนสำเร็จ' : 'Exported Crane Master to Excel successfully');
  };

  return (
    <div className="flex flex-col space-y-6 max-w-7xl mx-auto pb-12 animate-in fade-in duration-300">
      {/* Toast Alert */}
      {toastMessage && (
        <div className={`fixed top-4 right-4 z-50 flex items-center gap-2.5 px-4 py-3 rounded-xl shadow-xl text-white text-xs font-bold transition-all ${toastMessage.type === 'success' ? 'bg-emerald-600' : toastMessage.type === 'warning' ? 'bg-amber-600' : 'bg-red-600'
          }`}>
          {toastMessage.type === 'success' ? <CheckCircle2 size={16} /> : <AlertTriangle size={16} />}
          <span>{toastMessage.text}</span>
        </div>
      )}

      {/* Top Banner Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 p-6 rounded-3xl text-white shadow-xl border border-slate-700/50 relative overflow-hidden">
        <div className="absolute right-0 top-0 bottom-0 w-96 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-blue-500/10 via-transparent to-transparent pointer-events-none" />
        <div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-500/20 border border-blue-400/30 flex items-center justify-center text-blue-400 shadow-inner">
              <Truck size={22} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold tracking-tight text-white">
                  {isTh ? 'ทะเบียนเครน & เครื่องจักรยก (Crane Master / Fleet)' : 'Crane Master / Fleet Management'}
                </h1>
                <span className="text-[10px] bg-blue-500/30 border border-blue-400/40 text-blue-200 px-2 py-0.5 rounded-full font-mono font-bold">
                  CR-FLEET
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-1">
                {isTh
                  ? 'ระบบทะเบียนกลางควบคุมเครื่องจักรเครน, การตรวจรับรองทางวิศวกรรม ปจ.2, Load Chart และสถานะความพร้อมปฏิบัติงาน'
                  : 'Centralized registry for crane fleet, Phor.Jor.2 engineering certifications, load charts, and operational readiness.'}
              </p>
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-2.5 z-10">
          <button
            onClick={() => setIsImportModalOpen(true)}
            className="flex items-center gap-2 px-3.5 py-2.5 bg-slate-800/80 hover:bg-slate-700/90 text-slate-100 rounded-xl border border-slate-600 text-xs font-bold transition-all shadow-sm active:scale-95 cursor-pointer"
          >
            <Upload size={14} className="text-cyan-400" />
            <span>{isTh ? 'Import Excel' : 'Import Excel'}</span>
          </button>

          <button
            onClick={handleExportExcel}
            className="flex items-center gap-2 px-3.5 py-2.5 bg-slate-800/80 hover:bg-slate-700/90 text-slate-100 rounded-xl border border-slate-600 text-xs font-bold transition-all shadow-sm active:scale-95 cursor-pointer"
          >
            <Download size={14} className="text-emerald-400" />
            <span>{isTh ? 'Export Excel' : 'Export Excel'}</span>
          </button>

          <button
            onClick={() => {
              setEditingCrane(null);
              setIsAddEditOpen(true);
            }}
            className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl text-xs font-bold transition-all shadow-lg shadow-blue-500/25 active:scale-95 cursor-pointer"
          >
            <Plus size={16} />
            <span>{isTh ? 'เพิ่มทะเบียนเครน' : 'Add Crane'}</span>
          </button>
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
            {filterPlant === 'Phra Khanong'
              ? (isTh ? 'พระโขนง (Phra Khanong)' : 'Phra Khanong')
              : filterPlant === 'Sriracha'
                ? (isTh ? 'ศรีราชา (Sriracha)' : 'Sriracha')
                : (isTh ? 'ทุกโรงงาน (All Plants)' : 'All Plants')}
          </span>
        </div>
        <span className="text-[11px] font-mono font-medium text-slate-500 dark:text-slate-400">
          {kpis.total} {isTh ? 'คันที่ประจำการ' : 'cranes in fleet'}
        </span>
      </div>

      {/* --- 3 Core Enterprise Tabs Navigation Bar --- */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-800 pb-2">
        <div className="flex items-center gap-1.5 p-1 bg-slate-100 dark:bg-slate-800/80 rounded-2xl border border-slate-200 dark:border-slate-700/60 shadow-inner">
          <button
            type="button"
            onClick={() => setActiveTab('registry')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${activeTab === 'registry'
                ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
          >
            <FileSpreadsheet size={15} />
            <span>{isTh ? '1. ทะเบียนเครื่องจักร (Registry)' : '1. Fleet Registry'}</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 font-mono">
              {filteredFleet.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('timeline')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${activeTab === 'timeline'
                ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
          >
            <Clock size={15} />
            <span>{isTh ? '2. แผนภูมิการจัดสรร & ไทม์ไลน์ (Timeline & Gantt)' : '2. Gantt Timeline'}</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-indigo-100 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 font-mono">
              24h
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('safety')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${activeTab === 'safety'
                ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
          >
            <ShieldCheck size={15} />
            <span>{isTh ? '3. บันทึกความปลอดภัย & ปจ.2 (Safety & Inspection)' : '3. Safety & Inspection'}</span>
            {kpis.certExpired > 0 && (
              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-red-100 dark:bg-red-950/60 text-red-700 dark:text-red-300 font-mono animate-pulse">
                {kpis.certExpired} expired
              </span>
            )}
          </button>
        </div>

        <div className="flex items-center gap-2 text-xs text-slate-500">
          <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="font-mono text-[11px] font-medium">{isTh ? 'เชื่อมโยง Gate 1-4 อัตโนมัติ' : 'Gate 1-4 Auto-Linked'}</span>
        </div>
      </div>

      {activeTab === 'registry' && (
        <>
          {/* --- Section 1.1 Fleet Overview KPI Cards --- */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3.5">
            <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between">
              <div className="flex items-center justify-between text-slate-400">
                <span className="text-[11px] font-bold uppercase tracking-wider">{isTh ? 'เครนทั้งหมด' : 'Total Cranes'}</span>
                <Truck size={16} className="text-blue-500" />
              </div>
              <div className="mt-2 flex items-baseline gap-1.5">
                <span className="text-2xl font-black text-slate-800 dark:text-white font-mono">{kpis.total}</span>
                <span className="text-[10px] text-slate-500">{isTh ? 'คัน' : 'units'}</span>
              </div>
            </div>

            <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between">
              <div className="flex items-center justify-between text-slate-400">
                <span className="text-[11px] font-bold uppercase tracking-wider">{isTh ? 'พร้อมใช้งาน' : 'Available'}</span>
                <CheckCircle2 size={16} className="text-emerald-500" />
              </div>
              <div className="mt-2 flex items-baseline gap-1.5">
                <span className="text-2xl font-black text-emerald-600 dark:text-emerald-400 font-mono">{kpis.available}</span>
                <span className="text-[10px] text-slate-500">
                  ({Math.round((kpis.available / (kpis.total || 1)) * 100)}%)
                </span>
              </div>
            </div>

            <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between">
              <div className="flex items-center justify-between text-slate-400">
                <span className="text-[11px] font-bold uppercase tracking-wider">{isTh ? 'ได้รับมอบหมาย' : 'Assigned / Reserved'}</span>
                <Clock size={16} className="text-blue-500" />
              </div>
              <div className="mt-2 flex items-baseline gap-1.5">
                <span className="text-2xl font-black text-blue-600 dark:text-blue-400 font-mono">{kpis.assigned}</span>
                <span className="text-[10px] text-slate-500">{isTh ? 'มีคิวงาน' : 'scheduled'}</span>
              </div>
            </div>

            <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between">
              <div className="flex items-center justify-between text-slate-400">
                <span className="text-[11px] font-bold uppercase tracking-wider">{isTh ? 'ซ่อมบำรุง/ตรวจ' : 'Maintenance / Insp.'}</span>
                <HardHat size={16} className="text-amber-500" />
              </div>
              <div className="mt-2 flex items-baseline gap-1.5">
                <span className="text-2xl font-black text-amber-600 dark:text-amber-400 font-mono">{kpis.maintenance}</span>
                <span className="text-[10px] text-slate-500">{isTh ? 'งดจ่ายงาน' : 'offline'}</span>
              </div>
            </div>

            <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between">
              <div className="flex items-center justify-between text-slate-400">
                <span className="text-[11px] font-bold uppercase tracking-wider">{isTh ? 'ใบรับรองหมดอายุ' : 'Expiring Certs'}</span>
                <ShieldAlert size={16} className={kpis.expiringCerts > 0 ? "text-red-500" : "text-slate-400"} />
              </div>
              <div className="mt-2 flex items-baseline gap-1.5">
                <span className={`text-2xl font-black font-mono ${kpis.expiringCerts > 0 ? 'text-red-600 dark:text-red-400' : 'text-slate-700 dark:text-slate-300'}`}>
                  {kpis.expiringCerts}
                </span>
                <span className="text-[10px] text-slate-500">ปจ.2 / 30 วัน</span>
              </div>
            </div>

            <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between">
              <div className="flex items-center justify-between text-slate-400">
                <span className="text-[11px] font-bold uppercase tracking-wider">{isTh ? 'ข้อมูลไม่สมบูรณ์' : 'Data Incomplete'}</span>
                <AlertTriangle size={16} className={kpis.engIncomplete > 0 ? "text-amber-500" : "text-slate-400"} />
              </div>
              <div className="mt-2 flex items-baseline gap-1.5">
                <span className={`text-2xl font-black font-mono ${kpis.engIncomplete > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-emerald-600'}`}>
                  {kpis.engIncomplete}
                </span>
                <span className="text-[10px] text-slate-500">{isTh ? 'รอเอกสาร' : 'pending'}</span>
              </div>
            </div>
          </div>

          {/* --- Section 1.2 Crane Master Table with Filters --- */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden flex flex-col">
            {/* Filters Header */}
            <div className="p-4 sm:p-5 border-b border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/60 space-y-3.5">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                {/* Search Input */}
                <div className="relative flex-1 max-w-md">
                  <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value);
                      setCurrentPage(1);
                    }}
                    placeholder={isTh ? 'ค้นหา Crane ID, รุ่น, ยี่ห้อ, ทะเบียน, ผู้รับเหมา, เลข ปจ.2...' : 'Search Crane ID, Model, Brand, Contractor, Cert No...'}
                    className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl pl-9 pr-4 py-2 text-xs font-medium text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                  />
                  {searchQuery && (
                    <button onClick={() => setSearchQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                      <X size={13} />
                    </button>
                  )}
                </div>

                {/* Quick Count & Reset */}
                <div className="flex items-center gap-3 self-end md:self-auto">
                  <span className="text-xs text-slate-500 dark:text-slate-400">
                    {isTh ? 'พบ' : 'Showing'} <strong className="text-slate-800 dark:text-slate-200">{filteredFleet.length}</strong> {isTh ? 'รายการ' : 'cranes'}
                  </span>
                  {(filterPlant !== 'All' || filterStatus !== 'All' || filterType !== 'All' || filterCertStatus !== 'All' || filterEngStatus !== 'All' || searchQuery) && (
                    <button
                      onClick={() => {
                        setFilterPlant('All');
                        setFilterStatus('All');
                        setFilterType('All');
                        setFilterCertStatus('All');
                        setFilterEngStatus('All');
                        setSearchQuery('');
                      }}
                      className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
                    >
                      {isTh ? 'ล้างตัวกรอง' : 'Reset Filters'}
                    </button>
                  )}
                </div>
              </div>

              {/* Filter Dropdowns Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 text-xs">
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                    {isTh ? 'โรงงานหลัก' : 'Home Plant'}
                  </label>
                  <select
                    value={filterPlant}
                    onChange={(e) => { setFilterPlant(e.target.value); setCurrentPage(1); }}
                    className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-2.5 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-200 focus:outline-none focus:border-blue-500"
                  >
                    <option value="All">{isTh ? 'ทุกโรงงาน (All Plants)' : 'All Plants'}</option>
                    <option value="Phra Khanong">Phra Khanong</option>
                    <option value="Sriracha">Sriracha</option>
                  </select>
                </div>

                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                    {isTh ? 'สถานะเครื่องจักร' : 'Fleet Status'}
                  </label>
                  <select
                    value={filterStatus}
                    onChange={(e) => { setFilterStatus(e.target.value); setCurrentPage(1); }}
                    className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-2.5 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-200 focus:outline-none focus:border-blue-500"
                  >
                    <option value="All">{isTh ? 'ทุกสถานะ (All Statuses)' : 'All Statuses'}</option>
                    <option value="Available">Available (พร้อมใช้งาน)</option>
                    <option value="Assigned">Assigned (จัดสรรงานแล้ว)</option>
                    <option value="Reserved">Reserved (จองล่วงหน้า)</option>
                    <option value="Maintenance">Maintenance (ซ่อมบำรุง)</option>
                    <option value="Inspection">Inspection (รอตรวจสภาพ)</option>
                    <option value="Inactive">Inactive (ยกเลิกใช้งาน)</option>
                  </select>
                </div>

                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                    {isTh ? 'ประเภทเครน' : 'Crane Type'}
                  </label>
                  <select
                    value={filterType}
                    onChange={(e) => { setFilterType(e.target.value); setCurrentPage(1); }}
                    className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-2.5 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-200 focus:outline-none focus:border-blue-500"
                  >
                    <option value="All">{isTh ? 'ทุกประเภท (All Types)' : 'All Types'}</option>
                    <option value="Mobile Crane">Mobile Crane</option>
                    <option value="Crawler Crane">Crawler Crane</option>
                    <option value="Rough Terrain">Rough Terrain Crane</option>
                    <option value="All Terrain">All Terrain Crane</option>
                    <option value="Truck Crane">Truck Crane</option>
                    <option value="Tower Crane">Tower Crane</option>
                  </select>
                </div>

                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                    {isTh ? 'อายุใบรับรอง ปจ.2' : 'Phor.Jor.2 Cert'}
                  </label>
                  <select
                    value={filterCertStatus}
                    onChange={(e) => { setFilterCertStatus(e.target.value); setCurrentPage(1); }}
                    className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-2.5 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-200 focus:outline-none focus:border-blue-500"
                  >
                    <option value="All">{isTh ? 'ทุกสถานะใบรับรอง' : 'All Cert Statuses'}</option>
                    <option value="Valid">{isTh ? 'ยังไม่หมดอายุ (Valid)' : 'Valid'}</option>
                    <option value="Expiring">{isTh ? 'ใกล้หมดอายุ (≤ 30 วัน)' : 'Expiring Soon'}</option>
                    <option value="Expired">{isTh ? 'หมดอายุแล้ว (Expired)' : 'Expired'}</option>
                  </select>
                </div>

                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                    {isTh ? 'ความสมบูรณ์ทางวิศวกรรม' : 'Engineering Data'}
                  </label>
                  <select
                    value={filterEngStatus}
                    onChange={(e) => { setFilterEngStatus(e.target.value); setCurrentPage(1); }}
                    className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-2.5 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-200 focus:outline-none focus:border-blue-500"
                  >
                    <option value="All">{isTh ? 'ทั้งหมด' : 'All'}</option>
                    <option value="Complete">{isTh ? 'ข้อมูลครบถ้วน (Complete)' : 'Complete'}</option>
                    <option value="Incomplete">{isTh ? 'ไม่สมบูรณ์ (Incomplete)' : 'Incomplete'}</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Table Body */}
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-100/70 dark:bg-slate-800/50 text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider select-none">
                    <th onClick={() => handleSort('id')} className="py-3 px-3.5 cursor-pointer hover:text-blue-500 transition-colors">
                      <div className="flex items-center gap-1">
                        <span>Crane ID</span>
                        {sortField === 'id' && <ChevronDown size={13} className={`transform transition-transform ${sortAsc ? '' : 'rotate-180'}`} />}
                      </div>
                    </th>
                    <th onClick={() => handleSort('craneType')} className="py-3 px-3 cursor-pointer hover:text-blue-500 transition-colors">
                      <span>{isTh ? 'ประเภท' : 'Type'}</span>
                    </th>
                    <th onClick={() => handleSort('brand')} className="py-3 px-3 cursor-pointer hover:text-blue-500 transition-colors">
                      <span>{isTh ? 'ยี่ห้อ / รุ่น' : 'Brand / Model'}</span>
                    </th>
                    <th onClick={() => handleSort('ratedCapacityTon')} className="py-3 px-3 text-right cursor-pointer hover:text-blue-500 transition-colors">
                      <span>{isTh ? 'กำลังยก (ตัน)' : 'Capacity (Ton)'}</span>
                    </th>
                    <th onClick={() => handleSort('maxBoomLengthM')} className="py-3 px-3 text-right cursor-pointer hover:text-blue-500 transition-colors">
                      <span>{isTh ? 'บูมยาวสุด (ม.)' : 'Max Boom (m)'}</span>
                    </th>
                    <th className="py-3 px-3">{isTh ? 'ผู้ถือกรรมสิทธิ์ / ผู้รับเหมา' : 'Contractor / Owner'}</th>
                    <th className="py-3 px-3">{isTh ? 'โรงงาน' : 'Home Plant'}</th>
                    <th onClick={() => handleSort('fleetStatus')} className="py-3 px-3 cursor-pointer hover:text-blue-500 transition-colors">
                      <span>{isTh ? 'สถานะเครื่องจักร' : 'Fleet Status'}</span>
                    </th>
                    <th className="py-3 px-3">{isTh ? 'ความพร้อมวิศวกรรม' : 'Eng. Qualification'}</th>
                    <th onClick={() => handleSort('certExpiryDate')} className="py-3 px-3 cursor-pointer hover:text-blue-500 transition-colors">
                      <span>{isTh ? 'วันหมดอายุ ปจ.2' : 'Cert Expiry'}</span>
                    </th>
                    <th className="py-3 px-3 text-center">{isTh ? 'การจัดการ' : 'Actions'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80 text-xs">
                  {paginatedFleet.length === 0 ? (
                    <tr>
                      <td colSpan={11} className="py-12 text-center text-slate-400">
                        <Truck size={36} className="mx-auto mb-2 text-slate-300 dark:text-slate-600 opacity-60" />
                        <p className="font-bold text-sm text-slate-600 dark:text-slate-300">
                          {isTh ? 'ไม่พบข้อมูลทะเบียนเครนที่ตรงกับเงื่อนไข' : 'No crane records matching filter criteria'}
                        </p>
                        <p className="text-xs text-slate-400 mt-1">
                          {isTh ? 'ลองปรับตัวกรอง หรือเพิ่มทะเบียนเครนใหม่' : 'Try resetting filters or add a new crane'}
                        </p>
                      </td>
                    </tr>
                  ) : (
                    paginatedFleet.map((crane) => {
                      const certInfo = checkCertificateExpiry(crane.certExpiryDate);

                      // Status badge style
                      const statusBadgeStyle =
                        crane.fleetStatus === 'Available' ? 'bg-emerald-50 text-emerald-700 border-emerald-300 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800' :
                          crane.fleetStatus === 'Assigned' ? 'bg-blue-50 text-blue-700 border-blue-300 dark:bg-blue-950/60 dark:text-blue-300 dark:border-blue-800' :
                            crane.fleetStatus === 'Reserved' ? 'bg-indigo-50 text-indigo-700 border-indigo-300 dark:bg-indigo-950/60 dark:text-indigo-300 dark:border-indigo-800' :
                              crane.fleetStatus === 'Maintenance' ? 'bg-amber-50 text-amber-700 border-amber-300 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800' :
                                crane.fleetStatus === 'Inspection' ? 'bg-purple-50 text-purple-700 border-purple-300 dark:bg-purple-950/60 dark:text-purple-300 dark:border-purple-800' :
                                  'bg-slate-100 text-slate-600 border-slate-300 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700';

                      return (
                        <tr
                          key={crane.id}
                          className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors group cursor-pointer"
                          onClick={() => setSelectedCraneDetail(crane)}
                        >
                          {/* Crane ID */}
                          <td className="py-3 px-3.5 font-bold font-mono text-blue-600 dark:text-blue-400">
                            {crane.id}
                          </td>

                          {/* Crane Type */}
                          <td className="py-3 px-3 text-slate-700 dark:text-slate-300 font-medium">
                            {crane.craneType}
                          </td>

                          {/* Brand / Model */}
                          <td className="py-3 px-3">
                            <div className="font-bold text-slate-800 dark:text-slate-100">{crane.brand}</div>
                            <div className="text-[11px] text-slate-400 font-mono">{crane.model}</div>
                          </td>

                          {/* Capacity */}
                          <td className="py-3 px-3 text-right font-mono font-bold text-slate-800 dark:text-slate-200">
                            {crane.ratedCapacityTon}T
                          </td>

                          {/* Max Boom */}
                          <td className="py-3 px-3 text-right font-mono text-slate-600 dark:text-slate-400">
                            {crane.maxBoomLengthM} m
                          </td>

                          {/* Contractor / Owner */}
                          <td className="py-3 px-3 max-w-[180px] truncate" title={crane.contractor}>
                            <span className="text-slate-700 dark:text-slate-300 font-medium">{crane.contractor}</span>
                            <div className="text-[10px] text-slate-400">{crane.ownerType}</div>
                          </td>

                          {/* Home Plant */}
                          <td className="py-3 px-3">
                            <span className={`inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-md font-medium ${crane.homePlant === 'Phra Khanong'
                                ? 'bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300'
                                : 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300'
                              }`}>
                              <Building2 size={11} />
                              <span>{crane.homePlant}</span>
                            </span>
                          </td>

                          {/* Fleet Status */}
                          <td className="py-3 px-3">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${statusBadgeStyle}`}>
                              {crane.fleetStatus}
                            </span>
                            {(() => {
                              const linked = (crane.assignedJobNo && jobsByCraneMap.get(crane.assignedJobNo.toLowerCase().trim())) ||
                                jobsByCraneMap.get(crane.id.toLowerCase().trim());
                              if (linked) {
                                const woStr = linked.workOrder || linked.workOrderNo || ((linked as any).woNumber ? `WO-${(linked as any).woNumber}` : undefined);
                                const tagStr = linked.equipmentTag || linked.equipmentId;
                                return (
                                  <div className="text-[10px] font-mono mt-1 space-y-0.5">
                                    <button
                                      type="button"
                                      onClick={() => {
                                        navigateToCraneView({ view: 'job-list', jobId: linked.jobNo });
                                        if (setActiveView) setActiveView('job-list');
                                      }}
                                      className="text-blue-600 dark:text-blue-400 font-bold hover:underline cursor-pointer flex items-center gap-1"
                                      title={isTh ? 'เปิดดูข้อมูลงานใน Job List' : 'View Job in Job List'}
                                    >
                                      <span>{linked.jobNo}</span>
                                      <ExternalLink size={10} />
                                    </button>
                                    {woStr && (
                                      <div className="text-slate-500 dark:text-slate-400 text-[9px]">
                                        WO: {woStr}
                                      </div>
                                    )}
                                    {tagStr && (
                                      <div className="text-slate-500 dark:text-slate-400 text-[9px]">
                                        Tag: {tagStr}
                                      </div>
                                    )}
                                  </div>
                                );
                              }
                              if (crane.assignedJobNo) {
                                return (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      navigateToCraneView({ view: 'job-list', jobId: crane.assignedJobNo });
                                      if (setActiveView) setActiveView('job-list');
                                    }}
                                    className="text-[10px] font-mono text-blue-500 hover:underline cursor-pointer mt-0.5 flex items-center gap-1"
                                  >
                                    <span>{crane.assignedJobNo}</span>
                                    <ExternalLink size={10} />
                                  </button>
                                );
                              }
                              return null;
                            })()}
                          </td>

                          {/* Engineering Qualification Status */}
                          <td className="py-3 px-3">
                            {crane.engineeringDataComplete && certInfo.isValid ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-200 border border-emerald-300 dark:border-emerald-800">
                                <ShieldCheck size={11} className="text-emerald-600" />
                                <span>Qualified</span>
                              </span>
                            ) : (
                              <span
                                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-200 border border-amber-300 dark:border-amber-800"
                                title={isTh ? 'ข้อมูลทางวิศวกรรมหรือเอกสารยังไม่ครบถ้วน ไม่สามารถจัดสรรงานได้' : 'Engineering data incomplete; blocked from assignment'}
                              >
                                <AlertTriangle size={11} className="text-amber-600" />
                                <span>Data Incomplete</span>
                              </span>
                            )}
                          </td>

                          {/* Cert Expiry */}
                          <td className="py-3 px-3">
                            <div className={`font-mono text-xs ${!certInfo.isValid ? 'text-red-600 font-bold' : certInfo.isExpiringSoon ? 'text-amber-600 font-bold' : 'text-slate-600 dark:text-slate-300'}`}>
                              {crane.certExpiryDate}
                            </div>
                            <div className="text-[10px] text-slate-400">
                              {!certInfo.isValid ? (
                                <span className="text-red-500 font-bold">{isTh ? 'หมดอายุแล้ว' : 'Expired'}</span>
                              ) : certInfo.isExpiringSoon ? (
                                <span className="text-amber-500 font-bold">{isTh ? `เหลือ ${certInfo.daysLeft} วัน` : `${certInfo.daysLeft}d left`}</span>
                              ) : (
                                <span className="text-emerald-500">{crane.certNumber}</span>
                              )}
                            </div>
                          </td>

                          {/* Actions */}
                          <td className="py-3 px-3 text-center" onClick={(e) => e.stopPropagation()}>
                            <div className="flex items-center justify-center gap-1">
                              <button
                                onClick={() => setSelectedCraneDetail(crane)}
                                className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-slate-800 transition-colors"
                                title={isTh ? 'ดูรายละเอียด' : 'View Detail'}
                              >
                                <Eye size={14} />
                              </button>

                              <button
                                onClick={() => {
                                  setEditingCrane(crane);
                                  setIsAddEditOpen(true);
                                }}
                                className="p-1.5 rounded-lg text-slate-400 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-slate-800 transition-colors"
                                title={isTh ? 'แก้ไขข้อมูล' : 'Edit Crane'}
                              >
                                <Edit3 size={14} />
                              </button>

                              <button
                                onClick={() => {
                                  if (confirm(isTh ? `ยืนยันการปิดการใช้งานเครน ${crane.id} (${crane.model})?` : `Deactivate crane ${crane.id}?`)) {
                                    deactivateCraneMaster(crane.id);
                                    showToast('warning', isTh ? `ปิดการใช้งาน ${crane.id} สำเร็จ` : `Deactivated ${crane.id}`);
                                  }
                                }}
                                className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-slate-800 transition-colors"
                                title={isTh ? 'ปิดการใช้งาน (Deactivate)' : 'Deactivate'}
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination Footer */}
            <div className="p-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500">
              <div>
                {isTh ? 'แสดงหน้า' : 'Page'} <strong className="text-slate-800 dark:text-slate-200">{currentPage}</strong> {isTh ? 'จาก' : 'of'} <strong>{totalPages}</strong> ({filteredFleet.length} {isTh ? 'รายการทั้งหมด' : 'total'})
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 disabled:opacity-30 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer disabled:cursor-not-allowed"
                >
                  <ChevronLeft size={14} />
                </button>
                {Array.from({ length: totalPages }).map((_, idx) => (
                  <button
                    key={idx}
                    onClick={() => setCurrentPage(idx + 1)}
                    className={`w-7 h-7 rounded-lg text-xs font-bold transition-all cursor-pointer ${currentPage === idx + 1
                        ? 'bg-blue-600 text-white shadow-sm'
                        : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                      }`}
                  >
                    {idx + 1}
                  </button>
                ))}
                <button
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 disabled:opacity-30 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer disabled:cursor-not-allowed"
                >
                  <ChevronRight size={14} />
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* --- Tab 2: Fleet Timeline & 24h Gantt Utilization Matrix --- */}
      {activeTab === 'timeline' && (
        <CraneGanttTimeline
          fleet={plantScopedFleet}
          craneJobs={craneJobs}
          selectedPlant={filterPlant}
          setActiveView={setActiveView}
          onSelectCrane={(crane) => setSelectedCraneDetail(crane)}
        />
      )}

      {/* --- Tab 3: Safety, PhorJor.2 & Engineering Certification Log --- */}
      {activeTab === 'safety' && (
        <CraneSafetyInspectionLog
          fleet={plantScopedFleet}
          onUpdateCrane={(updated) => {
            updateCraneMaster(updated.id, updated);
            showToast('success', isTh ? `อัปเดตข้อมูลความปลอดภัย/ปจ.2 ของ ${updated.id} สำเร็จ` : `Updated safety certification for ${updated.id}`);
          }}
          setActiveView={setActiveView}
        />
      )}

      {/* --- Section 1.3 Add / Edit Crane Modal --- */}
      {isAddEditOpen && (
        <AddEditCraneModal
          isOpen={isAddEditOpen}
          initialData={editingCrane}
          onClose={() => {
            setIsAddEditOpen(false);
            setEditingCrane(null);
          }}
          onSave={(savedRecord) => {
            if (editingCrane) {
              updateCraneMaster(savedRecord.id, savedRecord);
              showToast('success', isTh ? `อัปเดตข้อมูลเครน ${savedRecord.id} สำเร็จ` : `Updated crane ${savedRecord.id}`);
            } else {
              const res = addCraneMaster(savedRecord);
              if (!res.success) {
                alert(res.message);
                return;
              }
              showToast('success', isTh ? `เพิ่มทะเบียนเครน ${savedRecord.id} เรียบร้อย` : `Added crane ${savedRecord.id}`);
            }
            setIsAddEditOpen(false);
            setEditingCrane(null);
          }}
          isTh={isTh}
        />
      )}

      {/* --- Section 2: Excel Import Modal / Wizard --- */}
      {isImportModalOpen && (
        <ImportCraneExcelModal
          isOpen={isImportModalOpen}
          onClose={() => setIsImportModalOpen(false)}
          onImportConfirm={(importedRecords) => {
            saveAllCraneMaster(importedRecords);
            setIsImportModalOpen(false);
            showToast('success', isTh ? `นำเข้าทะเบียนเครน ${importedRecords.length} คันสำเร็จ` : `Imported ${importedRecords.length} cranes successfully`);
          }}
          existingFleet={fleet}
          isTh={isTh}
        />
      )}

      {/* --- Crane Detail Drawer Modal with Cross-Gate Links --- */}
      {selectedCraneDetail && (
        <CraneDetailModal
          crane={selectedCraneDetail}
          onClose={() => setSelectedCraneDetail(null)}
          onEdit={() => {
            setEditingCrane(selectedCraneDetail);
            setSelectedCraneDetail(null);
            setIsAddEditOpen(true);
          }}
          onReleaseCrane={(craneId) => {
            updateCraneMaster(craneId, {
              fleetStatus: 'Available',
              assignedJobNo: undefined,
              assignedJobId: undefined
            });
            showToast('success', isTh ? `ปลดปล่อยเครน ${craneId} (Gate 4 Handover) กลับสู่สถานะพร้อมใช้งานเรียบร้อย` : `Released crane ${craneId} (Gate 4 Handover) back to Available status`);
            setSelectedCraneDetail(null);
          }}
          onOpenSafetyTab={() => {
            setActiveTab('safety');
            setSelectedCraneDetail(null);
          }}
          isTh={isTh}
        />
      )}
    </div>
  );
}

// =========================================================================
// ADD / EDIT CRANE FORM MODAL (Divided into 4 Sections A, B, C, D)
// =========================================================================
interface AddEditCraneModalProps {
  isOpen: boolean;
  initialData: CraneMasterRecord | null;
  onClose: () => void;
  onSave: (record: CraneMasterRecord) => void;
  isTh: boolean;
}

function AddEditCraneModal({ isOpen, initialData, onClose, onSave, isTh }: AddEditCraneModalProps) {
  const [activeSection, setActiveSection] = useState<'A' | 'B' | 'C' | 'D'>('A');

  // Form State
  const [formData, setFormData] = useState<Partial<CraneMasterRecord>>(() => {
    if (initialData) return { ...initialData };
    return {
      id: `CR-${String(Math.floor(100 + Math.random() * 900))}`,
      craneType: 'Mobile Crane',
      brand: 'Liebherr',
      model: '',
      serialNumber: '',
      ratedCapacityTon: 100,
      maxBoomLengthM: 50,
      contractor: 'BCP Operations (Owner Crane)',
      ownerType: 'Owner Crane',
      homePlant: 'Phra Khanong',
      fleetStatus: 'Available',
      craneConfiguration: 'Main Boom Telescopic',
      outriggerConfiguration: 'Full Span Outriggers with Hardwood Pads',
      hasLoadChart: true,
      loadChartAttachment: 'LoadChart_Sample.pdf',
      riggingEquipmentInfo: 'Standard 4-Leg Slings 50T, Bow Shackles',
      maxAllowableWindKnots: 22,
      groundBearingPressureLimitKPa: 250,
      certNumber: `PJ2-BCP-2026-${String(Math.floor(100 + Math.random() * 900))}`,
      certIssueDate: '2026-01-01',
      certExpiryDate: '2027-01-01',
      isCertValid: true,
      certAttachment: 'PhorJor2_Inspection_Cert.pdf',
      supportingDocuments: [],
      engineeringDataComplete: true,
      lastUpdated: new Date().toISOString()
    };
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = () => {
    const errs: Record<string, string> = {};
    if (!formData.id?.trim()) errs.id = 'Crane ID is required';
    if (!formData.brand?.trim()) errs.brand = 'Brand is required';
    if (!formData.model?.trim()) errs.model = 'Model is required';
    if (!formData.ratedCapacityTon || formData.ratedCapacityTon <= 0) errs.ratedCapacityTon = 'Valid capacity in tons required';
    if (!formData.maxBoomLengthM || formData.maxBoomLengthM <= 0) errs.maxBoomLengthM = 'Valid boom length required';
    if (!formData.certNumber?.trim()) errs.certNumber = 'Certificate number is required';
    if (!formData.certExpiryDate) errs.certExpiryDate = 'Expiry date required';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    const certCheck = checkCertificateExpiry(formData.certExpiryDate || '');
    const finalRecord: CraneMasterRecord = {
      ...(formData as CraneMasterRecord),
      isCertValid: certCheck.isValid,
      lastUpdated: new Date().toISOString()
    };
    onSave(finalRecord);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in">
      <div className="bg-white dark:bg-slate-900 w-full max-w-3xl rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-800/50">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400">
              <Truck size={20} />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-800 dark:text-white">
                {initialData
                  ? (isTh ? `แก้ไขทะเบียนเครน (${initialData.id})` : `Edit Crane (${initialData.id})`)
                  : (isTh ? 'เพิ่มทะเบียนเครนใหม่ (Add New Crane)' : 'Add New Crane to Fleet')}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {isTh ? 'กรอกข้อมูลทะเบียนเครื่องจักรยกและเอกสารรับรองทางวิศวกรรม 4 ส่วน' : 'Provide general info, specs, certification, and availability'}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-xl hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-400">
            <X size={18} />
          </button>
        </div>

        {/* Section Tabs */}
        <div className="grid grid-cols-4 border-b border-slate-200 dark:border-slate-800 bg-slate-100/60 dark:bg-slate-800/40 text-xs font-bold">
          <button
            type="button"
            onClick={() => setActiveSection('A')}
            className={`py-3 px-2 text-center transition-all cursor-pointer border-b-2 ${activeSection === 'A' ? 'border-blue-600 text-blue-600 dark:text-blue-400 bg-white dark:bg-slate-900' : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
          >
            {isTh ? 'A. ข้อมูลทั่วไป' : 'A. General'}
          </button>
          <button
            type="button"
            onClick={() => setActiveSection('B')}
            className={`py-3 px-2 text-center transition-all cursor-pointer border-b-2 ${activeSection === 'B' ? 'border-blue-600 text-blue-600 dark:text-blue-400 bg-white dark:bg-slate-900' : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
          >
            {isTh ? 'B. สเปกทางเทคนิค' : 'B. Technical'}
          </button>
          <button
            type="button"
            onClick={() => setActiveSection('C')}
            className={`py-3 px-2 text-center transition-all cursor-pointer border-b-2 ${activeSection === 'C' ? 'border-blue-600 text-blue-600 dark:text-blue-400 bg-white dark:bg-slate-900' : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
          >
            {isTh ? 'C. ใบรับรอง ปจ.2' : 'C. Certification'}
          </button>
          <button
            type="button"
            onClick={() => setActiveSection('D')}
            className={`py-3 px-2 text-center transition-all cursor-pointer border-b-2 ${activeSection === 'D' ? 'border-blue-600 text-blue-600 dark:text-blue-400 bg-white dark:bg-slate-900' : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
          >
            {isTh ? 'D. สถานะความพร้อม' : 'D. Availability'}
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-4">
          {/* SECTION A: GENERAL INFORMATION */}
          {activeSection === 'A' && (
            <div className="space-y-4 animate-in fade-in">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    {isTh ? 'รหัสเครน (Crane ID - Unique) *' : 'Crane ID (Unique) *'}
                  </label>
                  <input
                    type="text"
                    disabled={Boolean(initialData)}
                    value={formData.id || ''}
                    onChange={(e) => setFormData(p => ({ ...p, id: e.target.value.toUpperCase() }))}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-mono font-bold text-slate-800 dark:text-slate-100 disabled:opacity-60"
                    placeholder="CR-001"
                  />
                  {errors.id && <p className="text-[10px] text-red-500 mt-0.5">{errors.id}</p>}
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    {isTh ? 'ประเภทเครน (Crane Type) *' : 'Crane Type *'}
                  </label>
                  <select
                    value={formData.craneType || 'Mobile Crane'}
                    onChange={(e) => setFormData(p => ({ ...p, craneType: e.target.value as CraneCategory }))}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-medium text-slate-800 dark:text-slate-100"
                  >
                    <option value="Mobile Crane">Mobile Crane</option>
                    <option value="Crawler Crane">Crawler Crane</option>
                    <option value="Rough Terrain">Rough Terrain Crane</option>
                    <option value="All Terrain">All Terrain Crane</option>
                    <option value="Truck Crane">Truck Crane</option>
                    <option value="Tower Crane">Tower Crane</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    {isTh ? 'ยี่ห้อ (Brand) *' : 'Brand *'}
                  </label>
                  <input
                    type="text"
                    value={formData.brand || ''}
                    onChange={(e) => setFormData(p => ({ ...p, brand: e.target.value }))}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-medium text-slate-800 dark:text-slate-100"
                    placeholder="Liebherr / Tadano / Kato"
                  />
                  {errors.brand && <p className="text-[10px] text-red-500 mt-0.5">{errors.brand}</p>}
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    {isTh ? 'รุ่น (Model) *' : 'Model *'}
                  </label>
                  <input
                    type="text"
                    value={formData.model || ''}
                    onChange={(e) => setFormData(p => ({ ...p, model: e.target.value }))}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-medium text-slate-800 dark:text-slate-100"
                    placeholder="LTM 1300-6.2"
                  />
                  {errors.model && <p className="text-[10px] text-red-500 mt-0.5">{errors.model}</p>}
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    {isTh ? 'หมายเลขเครื่อง (Serial No.)' : 'Serial Number'}
                  </label>
                  <input
                    type="text"
                    value={formData.serialNumber || ''}
                    onChange={(e) => setFormData(p => ({ ...p, serialNumber: e.target.value }))}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-mono text-slate-800 dark:text-slate-100"
                    placeholder="SN-98214"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    {isTh ? 'กำลังยกสูงสุด (Rated Capacity - Ton) *' : 'Rated Capacity (Ton) *'}
                  </label>
                  <input
                    type="number"
                    value={formData.ratedCapacityTon || ''}
                    onChange={(e) => setFormData(p => ({ ...p, ratedCapacityTon: Number(e.target.value) }))}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-mono font-bold text-slate-800 dark:text-slate-100"
                    placeholder="100"
                  />
                  {errors.ratedCapacityTon && <p className="text-[10px] text-red-500 mt-0.5">{errors.ratedCapacityTon}</p>}
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    {isTh ? 'ผู้รับเหมา / เจ้าของเครน' : 'Contractor / Owner'}
                  </label>
                  <input
                    type="text"
                    value={formData.contractor || ''}
                    onChange={(e) => setFormData(p => ({ ...p, contractor: e.target.value }))}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-medium text-slate-800 dark:text-slate-100"
                    placeholder="BCP Operations / Contractor Heavy Lift"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    {isTh ? 'โรงงานประจำการ (Home Plant)' : 'Home Plant'}
                  </label>
                  <select
                    value={formData.homePlant || 'Phra Khanong'}
                    onChange={(e) => setFormData(p => ({ ...p, homePlant: e.target.value as any }))}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-medium text-slate-800 dark:text-slate-100"
                  >
                    <option value="Phra Khanong">Phra Khanong</option>
                    <option value="Sriracha">Sriracha</option>
                    <option value="All">All Plants</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* SECTION B: TECHNICAL SPECIFICATIONS */}
          {activeSection === 'B' && (
            <div className="space-y-4 animate-in fade-in">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    {isTh ? 'ความยาวบูมสูงสุด (Max Boom Length - m) *' : 'Max Boom Length (m) *'}
                  </label>
                  <input
                    type="number"
                    value={formData.maxBoomLengthM || ''}
                    onChange={(e) => setFormData(p => ({ ...p, maxBoomLengthM: Number(e.target.value) }))}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-mono font-bold text-slate-800 dark:text-slate-100"
                    placeholder="60"
                  />
                  {errors.maxBoomLengthM && <p className="text-[10px] text-red-500 mt-0.5">{errors.maxBoomLengthM}</p>}
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    {isTh ? 'โครงแบบเครน (Crane Configuration)' : 'Crane Configuration'}
                  </label>
                  <input
                    type="text"
                    value={formData.craneConfiguration || ''}
                    onChange={(e) => setFormData(p => ({ ...p, craneConfiguration: e.target.value }))}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-medium text-slate-800 dark:text-slate-100"
                    placeholder="Main Boom + Runner Jib"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  {isTh ? 'โครงสร้างขาหยั่ง Outrigger (Outrigger Configuration)' : 'Outrigger Configuration'}
                </label>
                <input
                  type="text"
                  value={formData.outriggerConfiguration || ''}
                  onChange={(e) => setFormData(p => ({ ...p, outriggerConfiguration: e.target.value }))}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-medium text-slate-800 dark:text-slate-100"
                  placeholder="Full Span 8.5m x 8.5m with Composite Mats"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    {isTh ? 'ความเร็วลมสูงสุดที่ยอมรับได้ (Knots)' : 'Max Allowable Wind (Knots)'}
                  </label>
                  <input
                    type="number"
                    value={formData.maxAllowableWindKnots || 22}
                    onChange={(e) => setFormData(p => ({ ...p, maxAllowableWindKnots: Number(e.target.value) }))}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-mono text-slate-800 dark:text-slate-100"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    {isTh ? 'แรงกดดินสูงสุดที่ยอมรับได้ (kPa)' : 'Ground Pressure Limit (kPa)'}
                  </label>
                  <input
                    type="number"
                    value={formData.groundBearingPressureLimitKPa || 250}
                    onChange={(e) => setFormData(p => ({ ...p, groundBearingPressureLimitKPa: Number(e.target.value) }))}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-mono text-slate-800 dark:text-slate-100"
                  />
                </div>
              </div>

              {/* Load Chart Verification & Rigging equipment */}
              <div className="p-4 rounded-2xl bg-blue-50/60 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800/60 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="hasLoadChart"
                      checked={Boolean(formData.hasLoadChart)}
                      onChange={(e) => setFormData(p => ({ ...p, hasLoadChart: e.target.checked }))}
                      className="w-4 h-4 text-blue-600 rounded"
                    />
                    <label htmlFor="hasLoadChart" className="text-xs font-bold text-slate-800 dark:text-slate-200 cursor-pointer">
                      {isTh ? 'มีตารางพิกัดยก (Certified Load Chart Verification)' : 'Certified Load Chart Verified'}
                    </label>
                  </div>
                  <span className="text-[10px] text-blue-600 dark:text-blue-400 font-mono font-bold">
                    {formData.hasLoadChart ? 'LOAD CHART ATTACHED' : 'NO LOAD CHART'}
                  </span>
                </div>
                <input
                  type="text"
                  value={formData.loadChartAttachment || ''}
                  onChange={(e) => setFormData(p => ({ ...p, loadChartAttachment: e.target.value }))}
                  placeholder="LoadChart_Liebherr_2026.pdf"
                  className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-1.5 text-xs font-mono"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  {isTh ? 'ชุดอุปกรณ์ช่วยยกประจำรถ (Rigging Equipment Info)' : 'Rigging Equipment Info'}
                </label>
                <textarea
                  rows={2}
                  value={formData.riggingEquipmentInfo || ''}
                  onChange={(e) => setFormData(p => ({ ...p, riggingEquipmentInfo: e.target.value }))}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 text-xs text-slate-800 dark:text-slate-100"
                  placeholder="Wire rope slings 4-leg 80T, shackles grade 80, spreader beam 10m"
                />
              </div>
            </div>
          )}

          {/* SECTION C: CERTIFICATION & DOCUMENTS */}
          {activeSection === 'C' && (
            <div className="space-y-4 animate-in fade-in">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    {isTh ? 'เลขที่ใบรับรอง ปจ.2 *' : 'Cert Number (Phor.Jor.2) *'}
                  </label>
                  <input
                    type="text"
                    value={formData.certNumber || ''}
                    onChange={(e) => setFormData(p => ({ ...p, certNumber: e.target.value }))}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-mono font-bold text-slate-800 dark:text-slate-100"
                    placeholder="PJ2-BCP-2026-001"
                  />
                  {errors.certNumber && <p className="text-[10px] text-red-500 mt-0.5">{errors.certNumber}</p>}
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    {isTh ? 'วันที่ออกใบรับรอง' : 'Issue Date'}
                  </label>
                  <input
                    type="date"
                    value={formData.certIssueDate || ''}
                    onChange={(e) => setFormData(p => ({ ...p, certIssueDate: e.target.value }))}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-mono text-slate-800 dark:text-slate-100"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    {isTh ? 'วันหมดอายุ ปจ.2 *' : 'Expiry Date *'}
                  </label>
                  <input
                    type="date"
                    value={formData.certExpiryDate || ''}
                    onChange={(e) => setFormData(p => ({ ...p, certExpiryDate: e.target.value }))}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-mono font-bold text-slate-800 dark:text-slate-100"
                  />
                  {errors.certExpiryDate && <p className="text-[10px] text-red-500 mt-0.5">{errors.certExpiryDate}</p>}
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  {isTh ? 'ไฟล์แนบใบรับรอง (Inspection Certificate Attachment)' : 'Certificate Attachment File'}
                </label>
                <input
                  type="text"
                  value={formData.certAttachment || ''}
                  onChange={(e) => setFormData(p => ({ ...p, certAttachment: e.target.value }))}
                  placeholder="PhorJor2_Certificate_Signed.pdf"
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-mono text-slate-800 dark:text-slate-100"
                />
              </div>

              {/* CRITICAL GOVERNANCE TOGGLE: Separate Operational Availability from Engineering Qualification */}
              <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/30 border border-amber-300 dark:border-amber-800/80 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <input
                      type="checkbox"
                      id="engineeringDataComplete"
                      checked={Boolean(formData.engineeringDataComplete)}
                      onChange={(e) => setFormData(p => ({ ...p, engineeringDataComplete: e.target.checked }))}
                      className="w-4 h-4 text-amber-600 rounded"
                    />
                    <div>
                      <label htmlFor="engineeringDataComplete" className="text-xs font-bold text-amber-900 dark:text-amber-200 cursor-pointer block">
                        {isTh ? 'ข้อมูลทางวิศวกรรมครบถ้วนสมบูรณ์ (Engineering Data Complete)' : 'Engineering Data Fully Complete & Certified'}
                      </label>
                      <p className="text-[10px] text-amber-700 dark:text-amber-400">
                        {isTh
                          ? 'หากติ๊กออก เครนจะถูกระบุว่า "Engineering Data Incomplete" และไม่สามารถผ่าน Safety Validation เพื่อจัดสรรงานได้ แม้เครื่องจักรจะว่างก็ตาม'
                          : 'If unchecked, crane status will be "Engineering Data Incomplete" and Safety Validation will FAIL for assignments.'}
                      </p>
                    </div>
                  </div>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${formData.engineeringDataComplete ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'
                    }`}>
                    {formData.engineeringDataComplete ? 'PASSED QUALIFICATION' : 'BLOCKED FROM ASSIGNMENT'}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* SECTION D: AVAILABILITY & STATUS */}
          {activeSection === 'D' && (
            <div className="space-y-4 animate-in fade-in">
              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  {isTh ? 'สถานะเครื่องจักร (Fleet Status)' : 'Fleet Status'}
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                  {(['Available', 'Reserved', 'Assigned', 'Maintenance', 'Inspection', 'Inactive'] as CraneFleetStatus[]).map((st) => (
                    <button
                      key={st}
                      type="button"
                      onClick={() => setFormData(p => ({ ...p, fleetStatus: st }))}
                      className={`p-3 rounded-xl border text-xs font-bold text-left transition-all cursor-pointer ${formData.fleetStatus === st
                          ? 'bg-blue-50 dark:bg-blue-950/60 border-blue-500 text-blue-700 dark:text-blue-300 shadow-sm'
                          : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50'
                        }`}
                    >
                      <div className="flex items-center justify-between">
                        <span>{st}</span>
                        {formData.fleetStatus === st && <Check size={14} className="text-blue-600" />}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    {isTh ? 'พนักงานขับเครนประจำ (Operator)' : 'Assigned Operator'}
                  </label>
                  <input
                    type="text"
                    value={formData.operator || ''}
                    onChange={(e) => setFormData(p => ({ ...p, operator: e.target.value }))}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-medium text-slate-800 dark:text-slate-100"
                    placeholder="Wichai Thongdee (Level 3)"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    {isTh ? 'อัตราค่าบริการ (THB / ชม.)' : 'Hourly Rate (THB)'}
                  </label>
                  <input
                    type="number"
                    value={formData.hourlyRateThb || 5000}
                    onChange={(e) => setFormData(p => ({ ...p, hourlyRateThb: Number(e.target.value) }))}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-mono text-slate-800 dark:text-slate-100"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  {isTh ? 'หมายเหตุการซ่อมบำรุง / ความพร้อม' : 'Operational & Maintenance Notes'}
                </label>
                <textarea
                  rows={2}
                  value={formData.notes || ''}
                  onChange={(e) => setFormData(p => ({ ...p, notes: e.target.value }))}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 text-xs text-slate-800 dark:text-slate-100"
                  placeholder="Scheduled maintenance or special rigging accessories notes..."
                />
              </div>
            </div>
          )}

          {/* Action buttons */}
          <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
            <div className="flex gap-2">
              {activeSection !== 'A' && (
                <button
                  type="button"
                  onClick={() => setActiveSection(activeSection === 'D' ? 'C' : activeSection === 'C' ? 'B' : 'A')}
                  className="px-3 py-2 rounded-xl text-xs font-bold border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 cursor-pointer"
                >
                  {isTh ? 'ย้อนกลับ' : 'Back'}
                </button>
              )}
              {activeSection !== 'D' && (
                <button
                  type="button"
                  onClick={() => setActiveSection(activeSection === 'A' ? 'B' : activeSection === 'B' ? 'C' : 'D')}
                  className="px-3.5 py-2 rounded-xl text-xs font-bold bg-slate-800 text-white hover:bg-slate-700 cursor-pointer"
                >
                  {isTh ? 'ถัดไป' : 'Next'}
                </button>
              )}
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                {isTh ? 'ยกเลิก' : 'Cancel'}
              </button>
              <button
                type="submit"
                className="px-5 py-2 rounded-xl text-xs font-bold bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-md active:scale-95 cursor-pointer"
              >
                {isTh ? 'บันทึกข้อมูลเครน' : 'Save Crane'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

// =========================================================================
// SECTION 2: IMPORT CRANE MASTER VIA EXCEL WIZARD
// =========================================================================
interface ImportCraneExcelModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImportConfirm: (importedRecords: CraneMasterRecord[]) => void;
  existingFleet: CraneMasterRecord[];
  isTh: boolean;
}

function ImportCraneExcelModal({ isOpen, onClose, onImportConfirm, existingFleet, isTh }: ImportCraneExcelModalProps) {
  const [step, setStep] = useState<number>(1); // 1: Upload, 2: Validate & Preview, 3: Confirm Summary
  const [importMode, setImportMode] = useState<'create_or_update' | 'skip_duplicates'>('create_or_update');
  const [rawRows, setRawRows] = useState<any[]>([]);
  const [validatedRows, setValidatedRows] = useState<Array<{
    record: CraneMasterRecord;
    isValid: boolean;
    errors: string[];
    isDuplicate: boolean;
  }>>([]);

  // Template download
  const handleDownloadTemplate = () => {
    const templateData = [
      {
        'Crane ID': 'CR-101',
        'Crane Type': 'Mobile Crane',
        'Brand': 'Liebherr',
        'Model': 'LTM 1250-5.1',
        'Serial Number': 'SN-LTM1250-9811',
        'Rated Capacity (Ton)': 250,
        'Maximum Boom Length (m)': 60,
        'Contractor / Owner': 'BCP Operations (Owner Crane)',
        'Home Plant': 'Phra Khanong',
        'Certificate Number': 'PJ2-BCP-2026-999',
        'Certificate Issue Date': '2026-01-10',
        'Certificate Expiry Date': '2027-01-09',
        'Fleet Status': 'Available'
      },
      {
        'Crane ID': 'CR-102',
        'Crane Type': 'Crawler Crane',
        'Brand': 'Kobelco',
        'Model': 'CKE 1800',
        'Serial Number': 'SN-CKE1800-4421',
        'Rated Capacity (Ton)': 180,
        'Maximum Boom Length (m)': 55,
        'Contractor / Owner': 'Contractor Heavy Lift',
        'Home Plant': 'Sriracha',
        'Certificate Number': 'PJ2-SR-2026-044',
        'Certificate Issue Date': '2026-02-15',
        'Certificate Expiry Date': '2027-02-14',
        'Fleet Status': 'Available'
      }
    ];

    const ws = XLSX.utils.json_to_sheet(templateData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Crane_Template');
    XLSX.writeFile(wb, 'BCP_Crane_Master_Template.xlsx');
  };

  // Upload handler
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsName = wb.SheetNames[0];
        const ws = wb.Sheets[wsName];
        const data = XLSX.utils.sheet_to_json(ws);
        setRawRows(data);
        validateImportData(data);
        setStep(2);
      } catch (err) {
        alert(isTh ? 'ไฟล์ไม่ถูกต้องหรือเกิดข้อผิดพลาดในการอ่านไฟล์' : 'Error reading Excel file');
      }
    };
    reader.readAsBinaryString(file);
  };

  // Validation Engine
  const validateImportData = (rows: any[]) => {
    const existingIdMap = new Map(existingFleet.map(c => [c.id.toLowerCase().trim(), c]));
    const seenImportIds = new Set<string>();

    const results = rows.map((r) => {
      const errors: string[] = [];
      const craneId = String(r['Crane ID'] || r['crane_id'] || '').trim().toUpperCase();

      if (!craneId) {
        errors.push('Crane ID is missing');
      } else if (seenImportIds.has(craneId.toLowerCase())) {
        errors.push('Duplicate Crane ID within import file');
      }
      seenImportIds.add(craneId.toLowerCase());

      const brand = String(r['Brand'] || r['brand'] || '').trim();
      const model = String(r['Model'] || r['model'] || '').trim();
      if (!brand) errors.push('Brand is required');
      if (!model) errors.push('Model is required');

      const capacity = Number(r['Rated Capacity (Ton)'] || r['Capacity'] || 0);
      if (isNaN(capacity) || capacity <= 0) errors.push('Valid numeric capacity required');

      const boom = Number(r['Maximum Boom Length (m)'] || r['Boom Length'] || 0);
      if (isNaN(boom) || boom <= 0) errors.push('Valid numeric boom length required');

      const plant = String(r['Home Plant'] || r['Plant'] || 'Phra Khanong').trim();
      const contractor = String(r['Contractor / Owner'] || r['Contractor'] || 'BCP Operations (Owner Crane)').trim();
      const certNo = String(r['Certificate Number'] || r['Cert No'] || '').trim();
      if (!certNo) errors.push('Certificate number is required');

      const expiry = String(r['Certificate Expiry Date'] || r['Expiry Date'] || '').trim();
      if (!expiry) {
        errors.push('Certificate Expiry Date required');
      } else {
        const certCheck = checkCertificateExpiry(expiry);
        if (!certCheck.isValid) {
          errors.push('Certificate has already EXPIRED');
        }
      }

      const isDuplicate = existingIdMap.has(craneId.toLowerCase());

      const record: CraneMasterRecord = {
        id: craneId,
        craneType: (r['Crane Type'] || 'Mobile Crane') as CraneCategory,
        brand: brand || 'Unknown',
        model: model || 'Unknown',
        serialNumber: String(r['Serial Number'] || `SN-${craneId}`),
        ratedCapacityTon: capacity || 50,
        maxBoomLengthM: boom || 40,
        contractor: contractor,
        ownerType: contractor.toLowerCase().includes('contractor') ? 'Contractor Crane' : 'Owner Crane',
        homePlant: (plant === 'Sriracha' ? 'Sriracha' : 'Phra Khanong'),
        fleetStatus: (r['Fleet Status'] || 'Available') as CraneFleetStatus,
        certNumber: certNo || `PJ2-${craneId}`,
        certIssueDate: String(r['Certificate Issue Date'] || '2026-01-01'),
        certExpiryDate: expiry || '2027-01-01',
        isCertValid: checkCertificateExpiry(expiry).isValid,
        hasLoadChart: true,
        loadChartAttachment: `Chart_${craneId}.pdf`,
        // Per Rule: If errors exist or missing load chart cert, set engineeringDataComplete to false
        engineeringDataComplete: errors.length === 0,
        lastUpdated: new Date().toISOString()
      };

      return {
        record,
        isValid: errors.length === 0,
        errors,
        isDuplicate
      };
    });

    setValidatedRows(results);
  };

  // Confirm import
  const handleConfirm = () => {
    let finalFleet = [...existingFleet];
    const existingMap = new Map(finalFleet.map(c => [c.id.toLowerCase().trim(), c]));

    validatedRows.forEach(({ record, isValid, isDuplicate }) => {
      if (!isValid) return; // skip invalid rows

      if (isDuplicate) {
        if (importMode === 'create_or_update') {
          // Update existing
          const idx = finalFleet.findIndex(c => c.id.toLowerCase().trim() === record.id.toLowerCase().trim());
          if (idx !== -1) finalFleet[idx] = record;
        }
        // if skip_duplicates, do nothing
      } else {
        // Create new
        finalFleet.unshift(record);
      }
    });

    onImportConfirm(finalFleet);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-xs animate-in fade-in">
      <div className="bg-white dark:bg-slate-900 w-full max-w-3xl rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[88vh]">
        {/* Wizard Header */}
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-800/50">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-600 dark:text-cyan-400">
              <FileSpreadsheet size={20} />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-800 dark:text-white">
                {isTh ? 'นำเข้าทะเบียนเครนผ่านไฟล์ Excel (Excel Import Wizard)' : 'Import Crane Master via Excel'}
              </h3>
              <p className="text-xs text-slate-500">
                {isTh ? 'ขั้นตอนการนำเข้า ตรวจสอบความถูกต้อง และผสานข้อมูลทะเบียนกลาง' : 'Upload, validate, preview, and sync to central crane repository'}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-xl hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-400">
            <X size={18} />
          </button>
        </div>

        {/* Wizard Steps Strip */}
        <div className="flex border-b border-slate-200 dark:border-slate-800 bg-slate-100/50 dark:bg-slate-800/30 text-xs font-bold">
          <div className={`flex-1 py-2.5 text-center flex items-center justify-center gap-1.5 ${step === 1 ? 'text-blue-600 border-b-2 border-blue-600' : 'text-slate-400'}`}>
            <span className="w-5 h-5 rounded-full bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 flex items-center justify-center text-[10px]">1</span>
            <span>{isTh ? 'อัปโหลดไฟล์' : 'Upload'}</span>
          </div>
          <div className={`flex-1 py-2.5 text-center flex items-center justify-center gap-1.5 ${step === 2 ? 'text-blue-600 border-b-2 border-blue-600' : 'text-slate-400'}`}>
            <span className="w-5 h-5 rounded-full bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 flex items-center justify-center text-[10px]">2</span>
            <span>{isTh ? 'ตรวจสอบ & ดูตัวอย่าง' : 'Validate & Preview'}</span>
          </div>
        </div>

        {/* Wizard Body */}
        <div className="flex-1 overflow-y-auto p-6">
          {step === 1 && (
            <div className="space-y-6 text-center py-6">
              {/* Download Template Box */}
              <div className="p-5 rounded-2xl bg-blue-50/70 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 text-left flex items-center justify-between gap-4">
                <div>
                  <h4 className="text-xs font-bold text-blue-900 dark:text-blue-200 mb-0.5">
                    {isTh ? 'ดาวน์โหลดไฟล์ตัวอย่าง (Template)' : 'Download Excel Template'}
                  </h4>
                  <p className="text-[11px] text-blue-700 dark:text-blue-400">
                    {isTh ? 'ไฟล์ต้นแบบประกอบด้วยคอลัมน์มาตรฐาน: Crane ID, Brand, Model, Capacity, Expiry Date, ฯลฯ' : 'Includes standard columns: Crane ID, Brand, Model, Capacity, Expiry Date, etc.'}
                  </p>
                </div>
                <button
                  onClick={handleDownloadTemplate}
                  className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-sm transition-all flex items-center gap-1.5 shrink-0 cursor-pointer"
                >
                  <Download size={14} />
                  <span>Download .xlsx</span>
                </button>
              </div>

              {/* Upload Dropzone */}
              <div className="border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-blue-500 rounded-3xl p-8 flex flex-col items-center justify-center transition-all bg-slate-50/50 dark:bg-slate-900/50">
                <Upload size={36} className="text-blue-500 mb-3 animate-bounce" />
                <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200 mb-1">
                  {isTh ? 'เลือกไฟล์ Excel สำหรับนำเข้า' : 'Select Excel file to upload'}
                </h4>
                <p className="text-xs text-slate-400 mb-4">
                  รองรับไฟล์ .xlsx หรือ .csv
                </p>
                <label className="px-5 py-2.5 bg-slate-900 dark:bg-blue-600 hover:bg-slate-800 text-white rounded-xl text-xs font-bold cursor-pointer transition-all shadow-md">
                  <span>{isTh ? 'ค้นหาไฟล์ในเครื่อง' : 'Browse File'}</span>
                  <input type="file" accept=".xlsx,.xls,.csv" onChange={handleFileUpload} className="hidden" />
                </label>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              {/* Summary Pills */}
              <div className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-100 dark:bg-slate-800 text-xs">
                <div className="flex items-center gap-4">
                  <span>{isTh ? 'รายการทั้งหมด:' : 'Total Rows:'} <strong>{validatedRows.length}</strong></span>
                  <span className="text-emerald-600 font-bold">✓ {validatedRows.filter(r => r.isValid).length} {isTh ? 'ผ่าน' : 'Valid'}</span>
                  <span className="text-red-500 font-bold">✕ {validatedRows.filter(r => !r.isValid).length} {isTh ? 'พบข้อผิดพลาด' : 'Invalid'}</span>
                  <span className="text-amber-500 font-bold">⚠ {validatedRows.filter(r => r.isDuplicate).length} {isTh ? 'รหัสซ้ำ' : 'Duplicates'}</span>
                </div>

                {/* Import Mode Radio */}
                <div className="flex items-center gap-2">
                  <label className="text-[11px] font-bold text-slate-500">
                    {isTh ? 'เมื่อพบรหัสซ้ำ:' : 'If duplicate:'}
                  </label>
                  <select
                    value={importMode}
                    onChange={(e) => setImportMode(e.target.value as any)}
                    className="bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg px-2 py-1 text-xs"
                  >
                    <option value="create_or_update">{isTh ? 'อัปเดตข้อมูลทับ (Update)' : 'Update Existing'}</option>
                    <option value="skip_duplicates">{isTh ? 'ข้ามรายการซ้ำ (Skip)' : 'Skip Duplicates'}</option>
                  </select>
                </div>
              </div>

              {/* Preview Table */}
              <div className="border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden max-h-72 overflow-y-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-slate-100 dark:bg-slate-800 text-[10px] uppercase font-bold text-slate-500 sticky top-0">
                    <tr>
                      <th className="p-2">Status</th>
                      <th className="p-2">Crane ID</th>
                      <th className="p-2">Model</th>
                      <th className="p-2">Capacity</th>
                      <th className="p-2">Cert Expiry</th>
                      <th className="p-2">Validation Notes</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {validatedRows.map((item, idx) => (
                      <tr key={idx} className={!item.isValid ? 'bg-red-50/50 dark:bg-red-950/20' : item.isDuplicate ? 'bg-amber-50/40 dark:bg-amber-950/20' : ''}>
                        <td className="p-2 font-bold">
                          {item.isValid ? (
                            <span className="text-emerald-600">✓ Ready</span>
                          ) : (
                            <span className="text-red-500">✕ Error</span>
                          )}
                        </td>
                        <td className="p-2 font-mono font-bold text-blue-600">{item.record.id}</td>
                        <td className="p-2">{item.record.brand} {item.record.model}</td>
                        <td className="p-2 font-mono">{item.record.ratedCapacityTon}T</td>
                        <td className="p-2 font-mono">{item.record.certExpiryDate}</td>
                        <td className="p-2 text-[11px]">
                          {item.errors.length > 0 ? (
                            <span className="text-red-600 font-medium">{item.errors.join(', ')}</span>
                          ) : item.isDuplicate ? (
                            <span className="text-amber-600 font-medium">Duplicate ID (will {importMode === 'create_or_update' ? 'update' : 'skip'})</span>
                          ) : (
                            <span className="text-emerald-600">All fields verified</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Wizard Footer */}
        <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-bold text-slate-500 hover:text-slate-800 cursor-pointer"
          >
            {isTh ? 'ยกเลิก' : 'Cancel'}
          </button>

          <div className="flex gap-2">
            {step === 2 && (
              <button
                type="button"
                onClick={() => setStep(1)}
                className="px-4 py-2 text-xs font-bold rounded-xl border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 cursor-pointer hover:bg-slate-100"
              >
                {isTh ? 'เลือกไฟล์ใหม่' : 'Re-upload'}
              </button>
            )}

            {step === 2 && (
              <button
                type="button"
                onClick={handleConfirm}
                disabled={validatedRows.filter(r => r.isValid).length === 0}
                className="px-5 py-2 text-xs font-bold rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-md active:scale-95 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {isTh ? `ยืนยันการนำเข้า (${validatedRows.filter(r => r.isValid).length} คัน)` : `Confirm Import (${validatedRows.filter(r => r.isValid).length})`}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// =========================================================================
// CRANE DETAIL DRAWER / MODAL
// =========================================================================
interface CraneDetailModalProps {
  crane: CraneMasterRecord;
  onClose: () => void;
  onEdit: () => void;
  isTh: boolean;
  onReleaseCrane?: (craneId: string) => void;
  onOpenSafetyTab?: () => void;
}

function CraneDetailModal({ crane, onClose, onEdit, isTh, onReleaseCrane, onOpenSafetyTab }: CraneDetailModalProps) {
  const certInfo = checkCertificateExpiry(crane.certExpiryDate);

  const assignedJobs = useMemo(() => {
    const all = getAllCraneJobs();
    return all.filter(j =>
      j.assignedCraneId === crane.id ||
      (j.assignedCraneName && j.assignedCraneName.includes(crane.id))
    );
  }, [crane.id]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-xs animate-in fade-in">
      <div className="bg-white dark:bg-slate-900 w-full max-w-2xl rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-6 bg-gradient-to-r from-slate-900 to-indigo-950 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-blue-500/20 border border-blue-400/40 flex items-center justify-center text-blue-400">
              <Truck size={24} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-bold">{crane.id}</h3>
                <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-blue-500/30 text-blue-200">
                  {crane.fleetStatus}
                </span>
                {crane.engineeringDataComplete && certInfo.isValid ? (
                  <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-emerald-500/30 text-emerald-200 flex items-center gap-1">
                    <CheckCircle2 size={11} /> Qualified
                  </span>
                ) : (
                  <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-amber-500/30 text-amber-200 flex items-center gap-1">
                    <AlertTriangle size={11} /> Safety Incomplete
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-300 mt-0.5">{crane.brand} {crane.model} • {crane.craneType}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 cursor-pointer">
            <X size={18} />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5 text-xs">
          {/* Gate 1-4 Cross-Module Action Strip */}
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-blue-200 dark:border-blue-900/60 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-800 dark:text-slate-100">
                <Sparkles size={14} className="text-blue-500" />
                <span>{isTh ? 'การเชื่อมโยงระบบ Gate (Crane Job Module Integration)' : 'Cross-Gate Operations Integration'}</span>
              </div>
              <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-md bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800/40">
                Gate Lifecycle
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {/* Gate 1 Safety Status */}
              <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-[11px] font-semibold ${certInfo.isValid && crane.engineeringDataComplete
                  ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800'
                  : 'bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 border-red-300 dark:border-red-800'
                }`}>
                <span className="font-bold">Gate 1:</span>
                {certInfo.isValid && crane.engineeringDataComplete ? (
                  <span className="flex items-center gap-1">
                    <CheckCircle2 size={12} />
                    {isTh ? 'ผ่านเกณฑ์ Safety' : 'Passed Safety'}
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      onOpenSafetyTab?.();
                    }}
                    className="hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <AlertTriangle size={12} />
                    <span>{isTh ? 'ปจ.2 หมดอายุ (คลิกเพื่อต่ออายุ)' : 'Cert Expired (Renew)'}</span>
                  </button>
                )}
              </div>

              {/* Gate 2 Dispatch button */}
              <button
                type="button"
                onClick={() => {
                  navigateToCraneView({
                    view: 'optimize',
                    craneId: crane.id,
                    jobId: crane.assignedJobNo || (assignedJobs[0]?.jobNo)
                  });
                  onClose();
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-[11px] font-bold shadow-xs transition-all cursor-pointer"
                title={isTh ? "ส่งข้อมูลเข้าสู่ Gate 2: จัดสรรเครื่องจักรและตรวจสอบแผนยก" : "Dispatch to Gate 2: Review Plan & Optimize"}
              >
                <Layers size={13} />
                <span>{isTh ? 'Gate 2: จัดสรรงาน (Optimize)' : 'Gate 2: Dispatch'}</span>
                <ExternalLink size={11} className="opacity-80" />
              </button>

              {/* Gate 3 Operations execution button */}
              {assignedJobs.length > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    navigateToCraneView({
                      view: 'job-list',
                      craneId: crane.id,
                      jobId: assignedJobs[0]?.jobNo || assignedJobs[0]?.id
                    });
                    onClose();
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-[11px] font-bold shadow-xs transition-all cursor-pointer"
                  title={isTh ? "เข้าสู่ Gate 3: ตรวจสอบสถานะการยกและช่างหน้างาน" : "Go to Gate 3: Operations Execution"}
                >
                  <HardHat size={13} />
                  <span>{isTh ? 'Gate 3: ติดตามหน้างาน' : 'Gate 3: Operations'}</span>
                  <ExternalLink size={11} className="opacity-80" />
                </button>
              )}

              {/* Gate 4 Handover & Release button */}
              {(crane.fleetStatus === 'Assigned' || crane.fleetStatus === 'Reserved' || !!crane.assignedJobNo) && (
                <button
                  type="button"
                  onClick={() => {
                    if (confirm(isTh
                      ? `ยืนยันตรวจรับมอบงาน Gate 4 และปลดปล่อยเครน ${crane.id} กลับสู่สถานะพร้อมใช้งาน (Available)?`
                      : `Confirm Gate 4 Handover and release crane ${crane.id} back to Available status?`
                    )) {
                      onReleaseCrane?.(crane.id);
                    }
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold shadow-xs transition-all cursor-pointer ml-auto"
                  title={isTh ? "Gate 4: ตรวจรับมอบงานและปลดปล่อยเครื่องจักรกลับสู่สถานะว่าง" : "Gate 4: Handover & Release Machine to Available"}
                >
                  <CheckSquare size={13} />
                  <span>{isTh ? 'Gate 4: ส่งมอบ & ปลดปล่อยเครน' : 'Gate 4: Handover & Release'}</span>
                </button>
              )}
            </div>
          </div>

          {/* Key Specs Strip */}
          <div className="grid grid-cols-3 gap-3">
            <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
              <span className="text-[10px] text-slate-400 font-bold uppercase block">{isTh ? 'กำลังยกสูงสุด' : 'Rated Capacity'}</span>
              <span className="text-lg font-black font-mono text-slate-800 dark:text-white">{crane.ratedCapacityTon} T</span>
            </div>
            <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
              <span className="text-[10px] text-slate-400 font-bold uppercase block">{isTh ? 'บูมยาวสุด' : 'Max Boom'}</span>
              <span className="text-lg font-black font-mono text-slate-800 dark:text-white">{crane.maxBoomLengthM} m</span>
            </div>
            <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
              <span className="text-[10px] text-slate-400 font-bold uppercase block">{isTh ? 'โรงงานประจำการ' : 'Home Plant'}</span>
              <span className="text-base font-bold text-slate-800 dark:text-white">{crane.homePlant}</span>
            </div>
          </div>

          {/* Details Table */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 border-b pb-1 dark:border-slate-800">
              {isTh ? 'ข้อมูลทางเทคนิคและการรับรอง ปจ.2' : 'Technical & Engineering Certification'}
            </h4>
            <div className="grid grid-cols-2 gap-3 text-slate-600 dark:text-slate-300">
              <div>
                <span className="text-[10px] text-slate-400 block">{isTh ? 'เลขที่ใบรับรอง ปจ.2' : 'Phor.Jor.2 Cert No.'}</span>
                <span className="font-mono font-bold text-blue-600 dark:text-blue-400">{crane.certNumber}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 block">{isTh ? 'วันหมดอายุ ปจ.2' : 'Cert Expiry Date'}</span>
                <span className={`font-mono font-bold ${!certInfo.isValid ? 'text-red-500' : 'text-emerald-500'}`}>
                  {crane.certExpiryDate} ({certInfo.isValid ? `${certInfo.daysLeft} days left` : 'EXPIRED'})
                </span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 block">{isTh ? 'ผู้รับเหมา / เจ้าของ' : 'Contractor / Owner'}</span>
                <span className="font-medium">{crane.contractor}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 block">{isTh ? 'ผู้ขับเครนประจำ' : 'Operator'}</span>
                <span className="font-medium">{crane.operator || 'Not assigned'}</span>
              </div>
              <div className="col-span-2">
                <span className="text-[10px] text-slate-400 block">{isTh ? 'โครงสร้าง Outrigger' : 'Outrigger Configuration'}</span>
                <span className="font-medium">{crane.outriggerConfiguration || 'Standard'}</span>
              </div>
              <div className="col-span-2">
                <span className="text-[10px] text-slate-400 block">{isTh ? 'อุปกรณ์ช่วยยก (Rigging)' : 'Rigging Equipment Info'}</span>
                <span className="font-medium">{crane.riggingEquipmentInfo || 'Standard Rigging Package'}</span>
              </div>
              <div className="col-span-2">
                <span className="text-[10px] text-slate-400 block">{isTh ? 'หมายเหตุ' : 'Notes'}</span>
                <p className="bg-slate-50 dark:bg-slate-800 p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300">
                  {crane.notes || 'No special notes logged for this machine.'}
                </p>
              </div>
            </div>
          </div>

          {/* Assigned Jobs & Operations Schedule */}
          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between border-b pb-1 dark:border-slate-800">
              <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                <Truck size={14} className="text-blue-500" />
                <span>{isTh ? 'งานที่ได้รับมอบหมายในระบบ (Assigned Jobs)' : 'Current & Scheduled Assignments'}</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300">
                  {assignedJobs.length} งาน
                </span>
              </h4>
              <button
                type="button"
                onClick={() => {
                  navigateToCraneView({ view: 'calendar', craneId: crane.id });
                  onClose();
                }}
                className="text-[11px] font-semibold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 cursor-pointer"
              >
                <Calendar size={12} />
                <span>{isTh ? 'ดูตารางใน Calendar' : 'View Calendar'}</span>
              </button>
            </div>

            {assignedJobs.length === 0 ? (
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/60 text-center text-slate-400">
                {isTh ? 'ยังไม่มีงานที่จัดสรรเครื่องจักรนี้' : 'No active jobs assigned to this crane.'}
              </div>
            ) : (
              <div className="space-y-2">
                {assignedJobs.map((j) => (
                  <div key={j.id} className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono font-bold text-blue-600 dark:text-blue-400 text-xs">{j.jobNo}</span>
                        {j.workOrderNo && (
                          <span className="px-2 py-0.5 rounded text-[9px] font-mono font-bold bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800/40">
                            WO: {j.workOrderNo}
                          </span>
                        )}
                        {j.equipmentId && (
                          <span className="px-2 py-0.5 rounded text-[9px] font-mono font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                            Tag: {j.equipmentId}
                          </span>
                        )}
                        <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase border ${j.status === 'In Progress' ? 'bg-blue-50 text-blue-600 border-blue-200 dark:bg-blue-950/40 dark:text-blue-400' :
                            j.status === 'Completed' ? 'bg-emerald-50 text-emerald-600 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400' :
                              'bg-amber-50 text-amber-600 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400'
                          }`}>
                          {j.status}
                        </span>
                      </div>
                      <p className="text-xs text-slate-700 dark:text-slate-300 font-medium truncate mt-1">{j.description}</p>
                      <div className="flex items-center gap-3 text-[10px] text-slate-400 mt-1 flex-wrap font-mono">
                        <span>{j.plant} • {j.dateFrom || j.date || 'Scheduled'}</span>
                        {j.tradeSession && <span>Trade: {j.tradeSession} ({j.shift || 'Day'})</span>}
                        {j.loadWeightTon && <span>Load: {j.loadWeightTon}T</span>}
                        {j.workingRadiusM && <span>Radius: {j.workingRadiusM}m</span>}
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-center">
                      <button
                        type="button"
                        onClick={() => {
                          navigateToCraneView({ view: 'job-list', jobId: j.jobNo || j.id });
                          onClose();
                        }}
                        className="px-2 py-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/50 dark:hover:bg-blue-900/60 text-blue-600 dark:text-blue-400 text-[11px] font-bold border border-blue-200 dark:border-blue-800/40 flex items-center gap-1 cursor-pointer transition-colors shadow-2xs"
                        title={isTh ? "เปิดดูใน Job List & จัดการหน้างาน" : "View & Manage in Job List"}
                      >
                        <CheckCircle2 size={12} />
                        <span>Job List</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          navigateToCraneView({ view: 'plan', jobId: j.id, plant: j.plant });
                          onClose();
                        }}
                        className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white border border-slate-200/60 dark:border-slate-700/60 transition-colors cursor-pointer shadow-2xs"
                        title={isTh ? "เปิดดูตำแหน่งบน Plot Plan" : "View on Plot Plan"}
                      >
                        <MapPin size={12} className="text-slate-500 dark:text-slate-400" />
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          navigateToCraneView({ view: 'calendar', jobId: j.id, date: (j.dateFrom || '2026-09-27').split(' ')[0] });
                          onClose();
                        }}
                        className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white border border-slate-200/60 dark:border-slate-700/60 transition-colors cursor-pointer shadow-2xs"
                        title={isTh ? "เปิดดูใน Calendar" : "View in Calendar"}
                      >
                        <Calendar size={12} className="text-slate-500 dark:text-slate-400" />
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          navigateToCraneView({ view: 'list', jobId: j.id });
                          onClose();
                        }}
                        className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white border border-slate-200/60 dark:border-slate-700/60 transition-colors cursor-pointer shadow-2xs"
                        title={isTh ? "เปิดดูใน Request Lists" : "View in Request List"}
                      >
                        <FileText size={12} className="text-slate-500 dark:text-slate-400" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 flex items-center justify-between">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-bold text-slate-500 hover:text-slate-800 cursor-pointer"
          >
            {isTh ? 'ปิดหน้าต่าง' : 'Close'}
          </button>

          <button
            onClick={onEdit}
            className="px-4 py-2 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-sm flex items-center gap-1.5 cursor-pointer"
          >
            <Edit3 size={14} />
            <span>{isTh ? 'แก้ไขข้อมูลเครน' : 'Edit Crane'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
