import React, { useState, useMemo } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { 
  TurnoverActivityRecord, 
  ActivityType, 
  INITIAL_TURNOVER_ACTIVITIES 
} from '../data/turnoverActivityData';
import { 
  Activity, ShieldCheck, CheckCircle2, AlertTriangle, XCircle, 
  Clock, ArrowRight, Search, Filter, Download, Plus, 
  ChevronDown, ChevronUp, Layers, ExternalLink, FileSpreadsheet, 
  Eye, UserCheck, Sparkles, RefreshCw, Check, Edit3, Lock,
  Calendar, Shield, Hash, Tag, Building, ArrowUpRight
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Input } from './ui/input';

interface SystemActivityLogProps {
  onNavigateToCoordinator?: () => void;
  onNavigateToFunctionalLocation?: () => void;
}

export default function SystemActivityLog({
  onNavigateToCoordinator,
  onNavigateToFunctionalLocation
}: SystemActivityLogProps) {
  const { language } = useLanguage();
  const isTh = language === 'th';

  // State
  const [activities, setActivities] = useState<TurnoverActivityRecord[]>(() => {
    const saved = localStorage.getItem('turnover_activity_log');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error('Failed parsing saved activity log', e);
      }
    }
    return INITIAL_TURNOVER_ACTIVITIES;
  });

  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | ActivityType>('all');
  const [stageFilter, setStageFilter] = useState<number | 'all'>('all');
  const [unitFilter, setUnitFilter] = useState<string>('all');
  const [expandedRowIds, setExpandedRowIds] = useState<string[]>(['act-101', 'act-102']);
  const [selectedActivity, setSelectedActivity] = useState<TurnoverActivityRecord | null>(null);

  // Modal for adding a manual log entry
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newActionTitle, setNewActionTitle] = useState('');
  const [newActionType, setNewActionType] = useState<ActivityType>('edit');
  const [newEquipmentTag, setNewEquipmentTag] = useState('11-E-101A');
  const [newSystemName, setNewSystemName] = useState('System-11 (Crude Distillation)');
  const [newUnitName, setNewUnitName] = useState('APS-1 / ADU-1 / DHT / VDU');
  const [newDescription, setNewDescription] = useState('');
  const [newStage, setNewStage] = useState<1 | 2 | 3 | 4>(1);

  // Sync to localStorage
  const saveActivities = (updated: TurnoverActivityRecord[]) => {
    setActivities(updated);
    localStorage.setItem('turnover_activity_log', JSON.stringify(updated));
  };

  // Toggle row expansion
  const toggleRow = (id: string) => {
    setExpandedRowIds(prev => 
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  // Filtered & Sorted in reverse-chronological order (newest first)
  const filteredActivities = useMemo(() => {
    return activities
      .slice()
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .filter(item => {
        // Type filter
        if (typeFilter !== 'all' && item.type !== typeFilter) return false;
        // Stage filter
        if (stageFilter !== 'all' && item.stageId !== stageFilter) return false;
        // Unit filter
        if (unitFilter !== 'all' && item.unitName !== unitFilter) return false;
        // Search
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          const matchTitle = item.actionTitleEn.toLowerCase().includes(q) || item.actionTitleTh.toLowerCase().includes(q);
          const matchDesc = item.descriptionEn.toLowerCase().includes(q) || item.descriptionTh.toLowerCase().includes(q);
          const matchTag = item.equipmentTag?.toLowerCase().includes(q);
          const matchUser = item.user.name.toLowerCase().includes(q) || item.user.role.toLowerCase().includes(q);
          const matchSys = item.systemName?.toLowerCase().includes(q);
          return matchTitle || matchDesc || matchTag || matchUser || matchSys;
        }
        return true;
      });
  }, [activities, typeFilter, stageFilter, unitFilter, searchQuery]);

  // Quick KPI metrics
  const totalCount = activities.length;
  const signOffCount = activities.filter(a => a.type === 'sign_off').length;
  const statusChangeCount = activities.filter(a => a.type === 'status_change').length;
  const alertCount = activities.filter(a => a.type === 'alert_reject').length;
  const editCount = activities.filter(a => a.type === 'edit').length;

  // Format relative timestamp
  const formatTimeInfo = (isoString: string) => {
    const date = new Date(isoString);
    const now = new Date('2026-09-24T07:00:00Z');
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    let relative = '';
    if (diffMins < 60) {
      relative = isTh ? `${diffMins} นาทีที่แล้ว` : `${diffMins}m ago`;
    } else if (diffHours < 24) {
      relative = isTh ? `${diffHours} ชม. ที่แล้ว` : `${diffHours}h ago`;
    } else {
      relative = isTh ? `${diffDays} วันที่แล้ว` : `${diffDays}d ago`;
    }

    const timeStr = date.toLocaleTimeString(isTh ? 'th-TH' : 'en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    });

    const dateStr = date.toLocaleDateString(isTh ? 'th-TH' : 'en-US', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });

    return { timeStr, dateStr, relative, full: `${dateStr} ${timeStr}` };
  };

  // Type badge styling
  const getTypeBadge = (type: ActivityType) => {
    switch (type) {
      case 'sign_off':
        return {
          icon: ShieldCheck,
          label: isTh ? 'การลงนามอนุมัติ' : 'Sign-Off Approved',
          bg: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/30',
          dot: 'bg-emerald-500'
        };
      case 'status_change':
        return {
          icon: ArrowRight,
          label: isTh ? 'การเปลี่ยนสถานะ' : 'Status Change',
          bg: 'bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/30',
          dot: 'bg-blue-500'
        };
      case 'edit':
        return {
          icon: Edit3,
          label: isTh ? 'แก้ไขข้อมูล' : 'Data Edit / Revision',
          bg: 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/30',
          dot: 'bg-amber-500'
        };
      case 'alert_reject':
        return {
          icon: XCircle,
          label: isTh ? 'แจ้งเตือน / ปฏิเสธ' : 'Rejection / Alert',
          bg: 'bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-500/30',
          dot: 'bg-rose-500'
        };
      case 'creation':
        return {
          icon: Sparkles,
          label: isTh ? 'ลงทะเบียนใหม่' : 'Tag / Item Created',
          bg: 'bg-purple-500/10 text-purple-700 dark:text-purple-400 border-purple-500/30',
          dot: 'bg-purple-500'
        };
    }
  };

  // Export to CSV
  const exportToCSV = () => {
    const headers = ['Timestamp', 'Type', 'Stage', 'Unit', 'System', 'Equipment Tag', 'Action Title', 'Description', 'User', 'Role', 'Certificate ID'];
    const rows = filteredActivities.map(a => [
      `"${a.timestamp}"`,
      `"${a.type}"`,
      `"Stage ${a.stageId || 'N/A'}"`,
      `"${a.unitName || ''}"`,
      `"${a.systemName || ''}"`,
      `"${a.equipmentTag || ''}"`,
      `"${isTh ? a.actionTitleTh : a.actionTitleEn}"`,
      `"${isTh ? a.descriptionTh : a.descriptionEn}"`,
      `"${a.user.name}"`,
      `"${a.user.role}"`,
      `"${a.signOffMeta?.certificateId || 'N/A'}"`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `turnover_system_activity_log_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Submit manual log entry
  const handleAddLog = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newActionTitle.trim()) return;

    const newRecord: TurnoverActivityRecord = {
      id: `act-${Date.now()}`,
      timestamp: new Date().toISOString(),
      type: newActionType,
      stageId: newStage,
      unitName: newUnitName,
      systemName: newSystemName,
      equipmentTag: newEquipmentTag.trim(),
      actionTitleEn: newActionTitle,
      actionTitleTh: newActionTitle,
      descriptionEn: newDescription || 'Manual activity entry recorded via System Activity Log console.',
      descriptionTh: newDescription || 'บันทึกรายการกิจกรรมตรวจงานผ่านระบบคอนโซล Activity Log',
      user: {
        name: 'Malinee Ph.',
        role: 'Turnaround Coordinator',
        roleTh: 'ผู้ประสานงานการส่งมอบระบบ',
        department: 'Operations',
        initials: 'MP'
      },
      severity: newActionType === 'alert_reject' ? 'error' : newActionType === 'sign_off' ? 'success' : 'info',
      tagBadge: newActionType === 'sign_off' ? 'Verified' : 'Manual Entry',
      signOffMeta: newActionType === 'sign_off' ? {
        certificateId: `CERT-MAN-${Math.floor(1000 + Math.random() * 9000)}`,
        signatureType: 'Digital Token',
        roleAuthorized: 'Lead Authority',
        stampTime: new Date().toISOString().replace('T', ' ').slice(0, 19)
      } : undefined
    };

    const updated = [newRecord, ...activities];
    saveActivities(updated);
    setExpandedRowIds(prev => [newRecord.id, ...prev]);
    setIsAddModalOpen(false);
    setNewActionTitle('');
    setNewDescription('');
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16 animate-in fade-in duration-300">
      {/* 1. Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 p-6 rounded-2xl text-white shadow-xl border border-slate-700/60 flex flex-col lg:flex-row lg:items-center justify-between gap-5">
        <div>
          <div className="flex items-center gap-2.5 mb-2">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/20 border border-emerald-400/40 text-emerald-400 flex items-center justify-center font-bold">
              <Activity size={20} />
            </div>
            <div>
              <span className="text-[10px] font-black uppercase tracking-widest text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-500/30">
                AUDIT TRAIL & REVISION LOG
              </span>
              <h1 className="text-xl sm:text-2xl font-black tracking-tight mt-0.5">
                {isTh ? 'บันทึกกิจกรรมและประวัติการส่งมอบระบบ' : 'System Activity Log'}
              </h1>
            </div>
          </div>
          <p className="text-xs sm:text-sm text-slate-300 max-w-3xl leading-relaxed">
            {isTh
              ? 'บันทึกประวัติย้อนหลัง (Reverse-Chronological) ของการแก้ไขข้อมูล การเปลี่ยนแปลงสถานะ การตรวจสอบภาคสนาม และการลงนามอนุมัติ (Sign-offs) ทั่วทั้งระบบ Turnover Platform พร้อมตราประทับเวลาและหลักฐานใบรับรองดิจิทัล'
              : 'Real-time reverse-chronological audit trail tracking recent data edits, inspection milestones, status transitions, and authorized digital sign-offs across the Turnover platform.'}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          <Button
            variant="outline"
            size="sm"
            onClick={exportToCSV}
            className="bg-slate-800/80 hover:bg-slate-700 border-slate-600 text-white text-xs flex items-center gap-1.5 cursor-pointer shadow-xs"
          >
            <Download size={14} />
            <span>{isTh ? 'ส่งออก CSV' : 'Export Audit CSV'}</span>
          </Button>

          <Button
            size="sm"
            onClick={() => setIsAddModalOpen(true)}
            className="bg-[#008b52] hover:bg-[#007a48] text-white font-bold text-xs flex items-center gap-1.5 shadow-md shadow-emerald-950/40 cursor-pointer"
          >
            <Plus size={14} />
            <span>{isTh ? '+ บันทึกกิจกรรมใหม่' : '+ Record Activity'}</span>
          </Button>
        </div>
      </div>

      {/* 2. Metric Overview KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-700 dark:text-slate-300 shrink-0">
            <Activity size={20} />
          </div>
          <div>
            <div className="text-xl font-black text-slate-900 dark:text-slate-100 font-mono">
              {totalCount}
            </div>
            <div className="text-[11px] text-slate-500 font-medium">
              {isTh ? 'กิจกรรมทั้งหมด' : 'Total Events'}
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 flex items-center justify-center text-emerald-600 shrink-0">
            <ShieldCheck size={20} />
          </div>
          <div>
            <div className="text-xl font-black text-emerald-600 font-mono">
              {signOffCount}
            </div>
            <div className="text-[11px] text-slate-500 font-medium">
              {isTh ? 'การลงนามอนุมัติ' : 'Sign-Offs Executed'}
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-blue-50 dark:bg-blue-950/40 flex items-center justify-center text-blue-600 shrink-0">
            <ArrowRight size={20} />
          </div>
          <div>
            <div className="text-xl font-black text-blue-600 font-mono">
              {statusChangeCount}
            </div>
            <div className="text-[11px] text-slate-500 font-medium">
              {isTh ? 'เปลี่ยนสถานะ' : 'Status Progressions'}
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-amber-50 dark:bg-amber-950/40 flex items-center justify-center text-amber-600 shrink-0">
            <Edit3 size={20} />
          </div>
          <div>
            <div className="text-xl font-black text-amber-600 font-mono">
              {editCount}
            </div>
            <div className="text-[11px] text-slate-500 font-medium">
              {isTh ? 'แก้ไขข้อมูล/แท็ก' : 'Edits & Revisions'}
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs flex items-center gap-3 col-span-2 sm:col-span-2 lg:col-span-1">
          <div className="w-10 h-10 rounded-lg bg-rose-50 dark:bg-rose-950/40 flex items-center justify-center text-rose-600 shrink-0">
            <AlertTriangle size={20} />
          </div>
          <div>
            <div className="text-xl font-black text-rose-600 font-mono">
              {alertCount}
            </div>
            <div className="text-[11px] text-slate-500 font-medium">
              {isTh ? 'แจ้งเตือน/ปฏิเสธ' : 'Alerts & Rejects'}
            </div>
          </div>
        </div>
      </div>

      {/* 3. Filter and Search Bar */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
        {/* Search and Secondary Selectors */}
        <div className="flex flex-col md:flex-row items-center gap-3 justify-between">
          <div className="relative w-full md:w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={15} />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={isTh ? 'ค้นหาแท็ก, ผู้ลงนาม, คำสั่ง...' : 'Search tag, user, action title...'}
              className="pl-9 h-9 text-xs"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2 w-full md:w-auto justify-end">
            {/* Stage filter */}
            <div className="flex items-center gap-1 text-xs">
              <span className="text-slate-500 text-[11px]">{isTh ? 'ขั้นตอน:' : 'Stage:'}</span>
              <select
                value={stageFilter}
                onChange={(e) => setStageFilter(e.target.value === 'all' ? 'all' : Number(e.target.value))}
                className="h-8 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-2 py-1 text-xs text-slate-800 dark:text-slate-200 focus:outline-hidden"
              >
                <option value="all">{isTh ? 'ทุกขั้นตอน (All Stages)' : 'All Stages'}</option>
                <option value={1}>{isTh ? 'Stage 1: Punch & Butt Walk' : 'Stage 1: Punch & Butt'}</option>
                <option value={2}>{isTh ? 'Stage 2: Complete Closing Form' : 'Stage 2: Appendix A'}</option>
                <option value={3}>{isTh ? 'Stage 3: Box Up / De-blind' : 'Stage 3: Box Up & De-blind'}</option>
                <option value={4}>{isTh ? 'Stage 4: Closing & Handover' : 'Stage 4: PSSR Handover'}</option>
              </select>
            </div>

            {/* Reset Filter Button */}
            {(typeFilter !== 'all' || stageFilter !== 'all' || searchQuery.trim() !== '') && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setTypeFilter('all');
                  setStageFilter('all');
                  setSearchQuery('');
                }}
                className="h-8 text-xs text-slate-500 hover:text-slate-900 cursor-pointer"
              >
                <RefreshCw size={12} className="mr-1" />
                <span>{isTh ? 'ล้างตัวกรอง' : 'Clear Filters'}</span>
              </Button>
            )}
          </div>
        </div>

        {/* Activity Type Category Pills */}
        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100 dark:border-slate-800/80">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mr-1">
            {isTh ? 'ประเภทกิจกรรม:' : 'Filter Type:'}
          </span>

          <button
            onClick={() => setTypeFilter('all')}
            className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              typeFilter === 'all'
                ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 shadow-xs'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
            }`}
          >
            {isTh ? 'ทั้งหมด' : 'All Events'} ({totalCount})
          </button>

          <button
            onClick={() => setTypeFilter('sign_off')}
            className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              typeFilter === 'sign_off'
                ? 'bg-[#008b52] text-white shadow-xs'
                : 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-100'
            }`}
          >
            <ShieldCheck size={13} />
            <span>{isTh ? 'การลงนามอนุมัติ (Sign-Offs)' : 'Sign-Offs'}</span>
            <span className="text-[10px] opacity-80">({signOffCount})</span>
          </button>

          <button
            onClick={() => setTypeFilter('status_change')}
            className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              typeFilter === 'status_change'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-400 hover:bg-blue-100'
            }`}
          >
            <ArrowRight size={13} />
            <span>{isTh ? 'การเปลี่ยนสถานะ' : 'Status Changes'}</span>
            <span className="text-[10px] opacity-80">({statusChangeCount})</span>
          </button>

          <button
            onClick={() => setTypeFilter('edit')}
            className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              typeFilter === 'edit'
                ? 'bg-[#ff6800] text-white shadow-xs'
                : 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 hover:bg-amber-100'
            }`}
          >
            <Edit3 size={13} />
            <span>{isTh ? 'การแก้ไขข้อมูล (Edits)' : 'Data Edits'}</span>
            <span className="text-[10px] opacity-80">({editCount})</span>
          </button>

          <button
            onClick={() => setTypeFilter('alert_reject')}
            className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              typeFilter === 'alert_reject'
                ? 'bg-rose-600 text-white shadow-xs'
                : 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-400 hover:bg-rose-100'
            }`}
          >
            <AlertTriangle size={13} />
            <span>{isTh ? 'การปฏิเสธ/แก้ไข (Rejections)' : 'Rejections'}</span>
            <span className="text-[10px] opacity-80">({alertCount})</span>
          </button>
        </div>
      </div>

      {/* 4. Reverse-Chronological Activity Timeline / Stream */}
      <div className="space-y-3">
        {filteredActivities.length === 0 ? (
          <div className="bg-white dark:bg-slate-900 p-12 rounded-2xl border border-slate-200 dark:border-slate-800 text-center space-y-3">
            <Activity className="mx-auto text-slate-300 dark:text-slate-600" size={40} />
            <h3 className="text-base font-bold text-slate-800 dark:text-slate-200">
              {isTh ? 'ไม่พบบันทึกกิจกรรมที่ตรงกับเงื่อนไข' : 'No Activity Records Found'}
            </h3>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              {isTh 
                ? 'ลองปรับเปลี่ยนคำค้นหาหรือตัวกรองหมวดหมู่กิจกรรม' 
                : 'Try adjusting your search query or clear category filters to view full audit trail.'}
            </p>
          </div>
        ) : (
          filteredActivities.map((activity, index) => {
            const timeInfo = formatTimeInfo(activity.timestamp);
            const typeMeta = getTypeBadge(activity.type);
            const IconComponent = typeMeta.icon;
            const isExpanded = expandedRowIds.includes(activity.id);

            return (
              <div
                key={activity.id}
                className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs hover:border-slate-300 dark:hover:border-slate-700 transition-all overflow-hidden"
              >
                {/* Main Row Header */}
                <div
                  onClick={() => toggleRow(activity.id)}
                  className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-3 cursor-pointer select-none hover:bg-slate-50/50 dark:hover:bg-slate-850 transition-colors"
                >
                  {/* Left Column: Icon + Title + Location Path */}
                  <div className="flex items-start gap-3.5 flex-1 min-w-0">
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border ${typeMeta.bg}`}>
                      <IconComponent size={18} />
                    </div>

                    <div className="space-y-1 min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        {/* Type badge */}
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border flex items-center gap-1 ${typeMeta.bg}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${typeMeta.dot}`} />
                          <span>{typeMeta.label}</span>
                        </span>

                        {/* Stage badge */}
                        {activity.stageId && (
                          <span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-[10px] font-mono font-bold">
                            STAGE {activity.stageId}
                          </span>
                        )}

                        {/* Tag badge */}
                        {activity.equipmentTag && (
                          <span className="px-2 py-0.5 rounded bg-amber-50 dark:bg-amber-950/40 text-amber-900 dark:text-amber-300 border border-amber-300/60 font-mono font-black text-[11px]">
                            {activity.equipmentTag}
                          </span>
                        )}

                        {activity.tagBadge && (
                          <span className="px-1.5 py-0.5 rounded bg-indigo-50 dark:bg-indigo-950/30 text-indigo-700 dark:text-indigo-300 text-[10px] font-semibold border border-indigo-200 dark:border-indigo-900">
                            {activity.tagBadge}
                          </span>
                        )}
                      </div>

                      {/* Action Title */}
                      <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100 truncate">
                        {isTh ? activity.actionTitleTh : activity.actionTitleEn}
                      </h4>

                      {/* Location Breadcrumb & Inspector */}
                      <div className="flex flex-wrap items-center gap-x-2 text-[11px] text-slate-500">
                        {activity.unitName && (
                          <span className="flex items-center gap-1">
                            <Building size={11} className="text-slate-400" />
                            <span className="font-mono text-slate-700 dark:text-slate-300">{activity.unitName}</span>
                          </span>
                        )}
                        {activity.systemName && (
                          <span>• <span className="text-amber-700 dark:text-amber-400 font-medium">{activity.systemName}</span></span>
                        )}
                        <span>•</span>
                        <span className="flex items-center gap-1 text-slate-600 dark:text-slate-400">
                          <span className="w-4 h-4 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 font-black text-[9px] flex items-center justify-center">
                            {activity.user.initials}
                          </span>
                          <span className="font-semibold">{activity.user.name}</span>
                          <span className="text-slate-400">({isTh ? activity.user.roleTh : activity.user.role})</span>
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Right Column: Timestamps & Expand Caret */}
                  <div className="flex items-center justify-between md:justify-end gap-3 shrink-0 pt-2 md:pt-0 border-t md:border-t-0 border-slate-100 dark:border-slate-800">
                    <div className="text-right">
                      <div className="font-mono text-xs font-black text-slate-900 dark:text-slate-100 flex items-center justify-end gap-1">
                        <Clock size={12} className="text-slate-400" />
                        <span>{timeInfo.timeStr}</span>
                      </div>
                      <div className="text-[10px] text-slate-400 font-medium">
                        {timeInfo.relative} • {timeInfo.dateStr}
                      </div>
                    </div>

                    <div className="w-7 h-7 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500">
                      {isExpanded ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
                    </div>
                  </div>
                </div>

                {/* Expanded Detailed Inspection Panel */}
                {isExpanded && (
                  <div className="px-5 py-4 bg-slate-50/80 dark:bg-slate-950/60 border-t border-slate-100 dark:border-slate-800 space-y-4 animate-in fade-in duration-200">
                    {/* Description */}
                    <div className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed bg-white dark:bg-slate-900 p-3 rounded-lg border border-slate-200/80 dark:border-slate-800">
                      <span className="font-bold text-slate-900 dark:text-slate-100 block mb-1">
                        {isTh ? 'รายละเอียดบันทึกการปฏิบัติงาน:' : 'Operational Note / Narrative:'}
                      </span>
                      {isTh ? activity.descriptionTh : activity.descriptionEn}
                    </div>

                    {/* Change Diffs (Old vs New values) */}
                    {activity.diffs && activity.diffs.length > 0 && (
                      <div className="space-y-2">
                        <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                          <Tag size={12} />
                          <span>{isTh ? 'รายการเปลี่ยนแปลงข้อมูล (Change Diff):' : 'State / Parameter Changes:'}</span>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {activity.diffs.map((diff, i) => (
                            <div
                              key={i}
                              className="bg-white dark:bg-slate-900 p-2.5 rounded-lg border border-slate-200 dark:border-slate-800 text-xs flex items-center justify-between gap-2"
                            >
                              <span className="font-bold text-slate-700 dark:text-slate-300 text-[11px]">
                                {isTh && diff.fieldTh ? diff.fieldTh : diff.field}:
                              </span>
                              <div className="flex items-center gap-2 font-mono text-[11px]">
                                <span className="text-rose-600 line-through bg-rose-50 dark:bg-rose-950/40 px-1.5 py-0.5 rounded border border-rose-200 dark:border-rose-900">
                                  {diff.oldValue}
                                </span>
                                <ArrowRight size={12} className="text-slate-400 shrink-0" />
                                <span className="text-emerald-700 dark:text-emerald-400 font-bold bg-emerald-50 dark:bg-emerald-950/40 px-1.5 py-0.5 rounded border border-emerald-200 dark:border-emerald-900">
                                  {diff.newValue}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Digital Sign-off Stamp Certificate */}
                    {activity.signOffMeta && (
                      <div className="p-3.5 rounded-xl bg-gradient-to-r from-emerald-500/10 via-teal-500/10 to-emerald-500/5 border border-emerald-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                            <Lock size={16} />
                          </div>
                          <div>
                            <div className="text-[10px] font-mono font-bold uppercase tracking-wider text-emerald-800 dark:text-emerald-300">
                              {isTh ? 'ตราประทับรับรองดิจิทัล' : 'DIGITAL SIGN-OFF CERTIFICATE'}
                            </div>
                            <div className="font-mono font-black text-xs text-slate-900 dark:text-slate-100 mt-0.5">
                              {activity.signOffMeta.certificateId}
                            </div>
                            <div className="text-[10px] text-slate-500">
                              {activity.signOffMeta.signatureType} • {activity.signOffMeta.roleAuthorized}
                            </div>
                          </div>
                        </div>

                        <div className="text-left sm:text-right font-mono text-[10px] text-emerald-800 dark:text-emerald-300 bg-white/60 dark:bg-slate-900/60 px-2.5 py-1.5 rounded-lg border border-emerald-500/20">
                          <div>STAMPED: {activity.signOffMeta.stampTime}</div>
                          <div className="text-slate-500 font-sans">{activity.user.department || 'Turnover Authority'}</div>
                        </div>
                      </div>
                    )}

                    {/* Quick navigation actions */}
                    <div className="flex flex-wrap items-center justify-end gap-2 pt-1">
                      {onNavigateToCoordinator && (
                        <button
                          type="button"
                          onClick={() => onNavigateToCoordinator()}
                          className="text-[11px] font-bold text-emerald-600 hover:text-emerald-700 flex items-center gap-1 cursor-pointer px-2.5 py-1 rounded-md hover:bg-emerald-50 dark:hover:bg-emerald-950/40"
                        >
                          <span>{isTh ? 'เปิดหน้าสถานที่ปฏิบัติงาน (TO00)' : 'Open in Job Location Package'}</span>
                          <ArrowUpRight size={13} />
                        </button>
                      )}

                      {onNavigateToFunctionalLocation && activity.equipmentTag && (
                        <button
                          type="button"
                          onClick={() => onNavigateToFunctionalLocation()}
                          className="text-[11px] font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1 cursor-pointer px-2.5 py-1 rounded-md hover:bg-blue-50 dark:hover:bg-blue-950/40"
                        >
                          <span>{isTh ? 'ดูตำแหน่งในผังโครงสร้างระบบ' : 'View in Functional Location'}</span>
                          <ArrowUpRight size={13} />
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* 5. Modal: Add Manual Log Entry */}
      {isAddModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="bg-[#008b52] text-white p-5 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Plus size={20} />
                <h3 className="font-bold text-base">
                  {isTh ? 'บันทึกกิจกรรมระบบใหม่ (New Activity Entry)' : 'Record System Activity'}
                </h3>
              </div>
              <button 
                onClick={() => setIsAddModalOpen(false)}
                className="text-white/80 hover:text-white p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAddLog} className="p-5 space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  {isTh ? 'หัวข้อกิจกรรม *' : 'Action Title *'}
                </label>
                <Input
                  required
                  value={newActionTitle}
                  onChange={(e) => setNewActionTitle(e.target.value)}
                  placeholder={isTh ? 'เช่น ตรวจสอบความสมบูรณ์แนวเชื่อม BL-11-05 ผ่าน' : 'e.g. Hydrotest Pack Circuit B Verified'}
                  className="h-9 text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    {isTh ? 'ประเภทกิจกรรม' : 'Activity Type'}
                  </label>
                  <select
                    value={newActionType}
                    onChange={(e) => setNewActionType(e.target.value as ActivityType)}
                    className="w-full h-9 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-2.5 text-xs text-slate-800 dark:text-slate-200"
                  >
                    <option value="edit">{isTh ? 'แก้ไขข้อมูล (Data Edit)' : 'Data Edit'}</option>
                    <option value="status_change">{isTh ? 'เปลี่ยนสถานะ (Status Change)' : 'Status Change'}</option>
                    <option value="sign_off">{isTh ? 'ลงนามอนุมัติ (Sign-Off)' : 'Sign-Off Approved'}</option>
                    <option value="alert_reject">{isTh ? 'แจ้งเตือน/ปฏิเสธ (Rejection)' : 'Rejection / Alert'}</option>
                    <option value="creation">{isTh ? 'ลงทะเบียนใหม่ (New Item)' : 'New Registration'}</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    {isTh ? 'ขั้นตอนส่งมอบ' : 'Turnover Stage'}
                  </label>
                  <select
                    value={newStage}
                    onChange={(e) => setNewStage(Number(e.target.value) as any)}
                    className="w-full h-9 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-2.5 text-xs text-slate-800 dark:text-slate-200"
                  >
                    <option value={1}>Stage 1: Punch & Butt Walk</option>
                    <option value={2}>Stage 2: Appendix A Closing</option>
                    <option value={3}>Stage 3: Box Up & De-blind</option>
                    <option value={4}>Stage 4: Closing & PSSR</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    {isTh ? 'แท็กอุปกรณ์ (Equipment Tag)' : 'Equipment Tag'}
                  </label>
                  <Input
                    value={newEquipmentTag}
                    onChange={(e) => setNewEquipmentTag(e.target.value)}
                    placeholder="e.g. 11-E-101A"
                    className="h-9 text-xs font-mono"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    {isTh ? 'หน่วยหลัก (Unit)' : 'Unit'}
                  </label>
                  <select
                    value={newUnitName}
                    onChange={(e) => setNewUnitName(e.target.value)}
                    className="w-full h-9 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-2.5 text-xs text-slate-800 dark:text-slate-200"
                  >
                    <option value="APS-1 / ADU-1 / DHT / VDU">APS-1 / ADU-1</option>
                    <option value="KHF-1 / SE / NHF-1">KHF-1 / SE / NHF-1</option>
                    <option value="VPS-2 / FCCU / SWS-2 / NHF-2">VPS-2 / FCCU</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  {isTh ? 'รายละเอียดเพิ่มเติม / หมายเหตุตรวจสอบ' : 'Operational Note / Remark'}
                </label>
                <textarea
                  rows={3}
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  placeholder={isTh ? 'ระบุผลการตรวจสอบ ค่าที่ตรวจวัด หรือรายละเอียดการอนุมัติ...' : 'Specify inspection findings, torque values, or approval remarks...'}
                  className="w-full p-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-800 dark:text-slate-200 focus:outline-hidden"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-2.5">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setIsAddModalOpen(false)}
                  className="text-xs cursor-pointer"
                >
                  {isTh ? 'ยกเลิก' : 'Cancel'}
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  className="bg-[#008b52] hover:bg-[#007a48] text-white font-bold text-xs cursor-pointer"
                >
                  {isTh ? 'บันทึกลงระบบ' : 'Save & Publish Log'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
