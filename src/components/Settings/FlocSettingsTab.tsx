import React, { useState, useMemo } from 'react';
import { 
  Layers, Search, Plus, Download, ChevronRight, ChevronDown, 
  FolderTree, Table as TableIcon, CornerDownRight, Tag, ShieldAlert, 
  Building2, Edit2, Trash2, MapPin, CheckCircle2, AlertTriangle, Eye, Compass
} from 'lucide-react';
import { 
  FunctionalLocation, 
  PlantId, 
  FlocLevel, 
  PLANT_REGISTRY 
} from '../../data/flocMasterData';
import { useLanguage } from '../../context/LanguageContext';
import FlocModal from './FlocModal';

interface FlocSettingsTabProps {
  flocList: FunctionalLocation[];
  onAddFloc: (floc: FunctionalLocation) => void;
  onUpdateFloc: (floc: FunctionalLocation) => void;
  onDeleteFloc: (id: string) => void;
  onSwitchToMapTab?: (nodeId?: string) => void;
  selectedNodeId?: string;
  onSelectNode?: (nodeId: string) => void;
}

export default function FlocSettingsTab({
  flocList,
  onAddFloc,
  onUpdateFloc,
  onDeleteFloc,
  onSwitchToMapTab,
  selectedNodeId,
  onSelectNode
}: FlocSettingsTabProps) {
  const { isTh } = useLanguage();

  // Filter & Search states
  const [selectedPlant, setSelectedPlant] = useState<PlantId | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCriticality, setSelectedCriticality] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'tree' | 'table'>('tree');

  // Tree Expansion state (set of expanded node IDs)
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(() => {
    // Default expand all Area (L1) nodes
    const initial = new Set<string>();
    flocList.filter(f => f.level === 'Area').forEach(f => initial.add(f.id));
    return initial;
  });

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingFloc, setEditingFloc] = useState<FunctionalLocation | null>(null);
  const [parentPreset, setParentPreset] = useState<{ parentId: string; plantId: PlantId; level: FlocLevel } | null>(null);

  // KPI Calculations
  const metrics = useMemo(() => {
    const scoped = selectedPlant === 'all' 
      ? flocList 
      : flocList.filter(f => f.plantId === selectedPlant);
    
    return {
      total: scoped.length,
      areas: scoped.filter(f => f.level === 'Area').length,
      systems: scoped.filter(f => f.level === 'System').length,
      equipment: scoped.filter(f => f.level === 'Equipment').length,
      catA: scoped.filter(f => f.criticality === 'A').length
    };
  }, [flocList, selectedPlant]);

  // Filtered List
  const filteredList = useMemo(() => {
    return flocList.filter(f => {
      if (selectedPlant !== 'all' && f.plantId !== selectedPlant) return false;
      if (selectedCriticality !== 'all' && f.criticality !== selectedCriticality) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const codeMatch = f.flocCode.toLowerCase().includes(q);
        const nameMatch = f.name.toLowerCase().includes(q);
        const tagMatch = f.equipmentTag?.toLowerCase().includes(q);
        const catMatch = f.category?.toLowerCase().includes(q);
        return codeMatch || nameMatch || tagMatch || catMatch;
      }
      return true;
    });
  }, [flocList, selectedPlant, selectedCriticality, searchQuery]);

  // Tree Structure construction
  const treeNodes = useMemo(() => {
    const list = selectedPlant === 'all' ? flocList : flocList.filter(f => f.plantId === selectedPlant);
    
    // Group by plant if 'all' is selected
    const areas = list.filter(f => f.level === 'Area');
    const systems = list.filter(f => f.level === 'System');
    const equipments = list.filter(f => f.level === 'Equipment');

    return areas.map(area => {
      const childSystems = systems.filter(s => s.parentId === area.id);
      return {
        ...area,
        systems: childSystems.map(sys => ({
          ...sys,
          equipments: equipments.filter(eq => eq.parentId === sys.id)
        })),
        directEquipments: equipments.filter(eq => eq.parentId === area.id)
      };
    });
  }, [flocList, selectedPlant]);

  // Expand / Collapse Handlers
  const toggleNode = (nodeId: string) => {
    setExpandedNodes(prev => {
      const next = new Set(prev);
      if (next.has(nodeId)) {
        next.delete(nodeId);
      } else {
        next.add(nodeId);
      }
      return next;
    });
  };

  const expandAll = () => {
    const allIds = new Set<string>();
    flocList.forEach(f => allIds.add(f.id));
    setExpandedNodes(allIds);
  };

  const collapseAll = () => {
    setExpandedNodes(new Set());
  };

  // Open modal for new root
  const handleAddNewRoot = () => {
    setEditingFloc(null);
    setParentPreset(null);
    setIsModalOpen(true);
  };

  // Open modal for child
  const handleAddChild = (parent: FunctionalLocation) => {
    setEditingFloc(null);
    setParentPreset({
      parentId: parent.id,
      plantId: parent.plantId,
      level: parent.level === 'Area' ? 'System' : 'Equipment'
    });
    setIsModalOpen(true);
  };

  // Open modal for edit
  const handleEdit = (floc: FunctionalLocation) => {
    setEditingFloc(floc);
    setParentPreset(null);
    setIsModalOpen(true);
  };

  // Delete handler with confirmation
  const handleDelete = (id: string, name: string) => {
    if (window.confirm(isTh 
      ? `คุณต้องการลบโหนด "${name}" และโหนดลูกทั้งหมดใช่หรือไม่?` 
      : `Are you sure you want to delete "${name}" and all sub-nodes?`)) {
      onDeleteFloc(id);
    }
  };

  // Export CSV Handler
  const handleExportCsv = () => {
    const headers = ['FLOC Code', 'Equipment Tag', 'Name', 'Plant', 'Level', 'Parent ID', 'Category', 'Criticality', 'Unit', 'X%', 'Y%', 'Description'];
    const rows = filteredList.map(f => [
      `"${f.flocCode}"`,
      `"${f.equipmentTag || ''}"`,
      `"${f.name.replace(/"/g, '""')}"`,
      `"${f.plantId.toUpperCase()}"`,
      `"${f.level}"`,
      `"${f.parentId || ''}"`,
      `"${f.category || ''}"`,
      `"${f.criticality || ''}"`,
      `"${f.unit || ''}"`,
      f.xPercent ?? '',
      f.yPercent ?? '',
      `"${(f.description || '').replace(/"/g, '""')}"`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `PlantTurn_FLOC_Hierarchy_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Helper for Criticality Badge
  const renderCriticalityBadge = (crit?: 'A' | 'B' | 'C') => {
    if (crit === 'A') {
      return (
        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-rose-500/10 text-rose-500 dark:bg-rose-950/60 dark:text-rose-400 border border-rose-500/30">
          <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" />
          Cat A (วิกฤต)
        </span>
      );
    }
    if (crit === 'B') {
      return (
        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-amber-500/10 text-amber-600 dark:bg-amber-950/60 dark:text-amber-400 border border-amber-500/30">
          Cat B (Pre-Oil)
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-emerald-500/10 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400 border border-emerald-500/30">
        Cat C (ทั่วไป)
      </span>
    );
  };

  return (
    <div className="space-y-6">
      {/* =====================================================================
          1. KPI SUMMARY METRICS CARDS
         ===================================================================== */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-emerald-500/10 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
            <Layers size={22} />
          </div>
          <div>
            <p className="text-xs text-slate-500 dark:text-slate-400">{isTh ? 'โครงสร้าง FLOC ทั้งหมด' : 'Total FLOCs'}</p>
            <h4 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">{metrics.total}</h4>
          </div>
        </div>

        <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-blue-500/10 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
            <Building2 size={22} />
          </div>
          <div>
            <p className="text-xs text-slate-500 dark:text-slate-400">{isTh ? 'พื้นที่ยูนิต (Area L1)' : 'Plant Areas (L1)'}</p>
            <h4 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">{metrics.areas}</h4>
          </div>
        </div>

        <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-indigo-500/10 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
            <CornerDownRight size={22} />
          </div>
          <div>
            <p className="text-xs text-slate-500 dark:text-slate-400">{isTh ? 'ระบบวงจร (System L2)' : 'Systems (L2)'}</p>
            <h4 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">{metrics.systems}</h4>
          </div>
        </div>

        <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-purple-500/10 dark:bg-purple-500/20 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0">
            <Tag size={22} />
          </div>
          <div>
            <p className="text-xs text-slate-500 dark:text-slate-400">{isTh ? 'อุปกรณ์ระบุแท็ก (L3)' : 'Equipment (L3)'}</p>
            <h4 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">{metrics.equipment}</h4>
          </div>
        </div>
      </div>

      {/* =====================================================================
          2. FILTERS & COMMAND TOOLBAR
         ===================================================================== */}
      <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
        {/* Plant Filter Pills & View Switcher */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-3">
          {/* Plant Selector */}
          <div className="flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              onClick={() => setSelectedPlant('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                selectedPlant === 'all'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              {isTh ? 'ทุกโรงงาน (All)' : 'All Plants'} ({flocList.length})
            </button>
            {Object.values(PLANT_REGISTRY).map(p => {
              const count = flocList.filter(f => f.plantId === p.id).length;
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setSelectedPlant(p.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
                    selectedPlant === p.id
                      ? 'bg-emerald-600 text-white shadow-sm'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                  }`}
                >
                  <span>{p.code} - {isTh ? p.nameTh.split(' ')[0] : p.nameEn.split(' ')[0]}</span>
                  <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-black/10 dark:bg-white/10 font-mono">
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Right Toolbar: View Switcher & Action Buttons */}
          <div className="flex items-center gap-2">
            <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-0.5 rounded-lg border border-slate-200 dark:border-slate-700">
              <button
                type="button"
                onClick={() => setViewMode('tree')}
                className={`p-1.5 rounded-md text-xs font-medium flex items-center gap-1.5 transition-colors ${
                  viewMode === 'tree'
                    ? 'bg-white dark:bg-slate-700 text-emerald-600 dark:text-emerald-400 shadow-sm'
                    : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                }`}
                title="Tree View"
              >
                <FolderTree size={15} />
                <span className="hidden sm:inline">Tree</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode('table')}
                className={`p-1.5 rounded-md text-xs font-medium flex items-center gap-1.5 transition-colors ${
                  viewMode === 'table'
                    ? 'bg-white dark:bg-slate-700 text-emerald-600 dark:text-emerald-400 shadow-sm'
                    : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                }`}
                title="Table View"
              >
                <TableIcon size={15} />
                <span className="hidden sm:inline">Table</span>
              </button>
            </div>

            {onSwitchToMapTab && (
              <button
                type="button"
                onClick={() => onSwitchToMapTab()}
                className="px-3 py-1.5 text-xs font-semibold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 border border-indigo-200 dark:border-indigo-800/80 rounded-lg transition-colors flex items-center gap-1.5"
              >
                <Compass size={14} />
                <span className="hidden sm:inline">{isTh ? 'ผัง CAD Map' : 'CAD Map'}</span>
              </button>
            )}

            <button
              type="button"
              onClick={handleExportCsv}
              className="p-2 sm:px-3 sm:py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors flex items-center gap-1.5"
              title="Export CSV"
            >
              <Download size={14} />
              <span className="hidden sm:inline">Export CSV</span>
            </button>

            <button
              type="button"
              onClick={handleAddNewRoot}
              className="px-3.5 py-1.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 rounded-lg shadow-sm transition-colors flex items-center gap-1.5"
            >
              <Plus size={15} />
              <span>{isTh ? 'เพิ่มจุด FLOC' : 'Add FLOC'}</span>
            </button>
          </div>
        </div>

        {/* Live Search & Criticality filter */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="relative flex-1 min-w-[240px]">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={isTh ? 'ค้นหารหัส FLOC, แท็กอุปกรณ์, ชื่อสถานที่, หมวดหมู่...' : 'Search FLOC code, tag, name, category...'}
              className="w-full pl-9 pr-4 py-2 text-xs bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400">{isTh ? 'ความวิกฤต:' : 'Criticality:'}</span>
            <select
              value={selectedCriticality}
              onChange={(e) => setSelectedCriticality(e.target.value)}
              className="px-2.5 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-700 dark:text-slate-300 focus:outline-none"
            >
              <option value="all">ทั้งหมด (All Criticalities)</option>
              <option value="A">เฉพาะ Cat A (วิกฤตความปลอดภัย)</option>
              <option value="B">เฉพาะ Cat B (Pre-Oil-in)</option>
              <option value="C">เฉพาะ Cat C (ซ่อมทั่วไป)</option>
            </select>
          </div>

          {viewMode === 'tree' && (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={expandAll}
                className="px-2.5 py-1 text-[11px] text-slate-500 hover:text-slate-900 dark:hover:text-white hover:underline"
              >
                Expand All
              </button>
              <span className="text-slate-300 dark:text-slate-700">|</span>
              <button
                type="button"
                onClick={collapseAll}
                className="px-2.5 py-1 text-[11px] text-slate-500 hover:text-slate-900 dark:hover:text-white hover:underline"
              >
                Collapse All
              </button>
            </div>
          )}
        </div>
      </div>

      {/* =====================================================================
          3. MAIN CONTENT: TREE VIEW OR TABLE VIEW
         ===================================================================== */}
      {viewMode === 'tree' ? (
        <div className="p-4 sm:p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
          {treeNodes.length === 0 ? (
            <div className="py-12 text-center text-slate-400">
              <FolderTree size={36} className="mx-auto mb-2 opacity-40" />
              <p className="text-sm font-medium">{isTh ? 'ไม่พบข้อมูลโครงสร้าง FLOC ที่ค้นหา' : 'No FLOC structures found'}</p>
            </div>
          ) : (
            treeNodes.map((area) => {
              const isAreaExpanded = expandedNodes.has(area.id);
              const isSelected = selectedNodeId === area.id;

              return (
                <div key={area.id} className="border border-slate-200 dark:border-slate-800/80 rounded-xl overflow-hidden bg-slate-50/50 dark:bg-slate-900/40">
                  {/* LEVEL 1: AREA ROW */}
                  <div 
                    className={`flex items-center justify-between p-3 transition-colors ${
                      isSelected ? 'bg-emerald-500/10 border-l-4 border-emerald-500' : 'hover:bg-slate-100/70 dark:hover:bg-slate-800/50'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 flex-1 min-w-0">
                      <button
                        type="button"
                        onClick={() => toggleNode(area.id)}
                        className="p-1 rounded text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700"
                      >
                        {isAreaExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                      </button>

                      <div className="w-8 h-8 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                        <Building2 size={16} />
                      </div>

                      <div className="min-w-0 flex-1 cursor-pointer" onClick={() => onSelectNode?.(area.id)}>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-mono text-xs font-bold text-slate-900 dark:text-white tracking-wide">
                            {area.flocCode}
                          </span>
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-100 dark:bg-blue-950/80 text-blue-700 dark:text-blue-300 font-semibold uppercase">
                            L1: Area
                          </span>
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                            {area.plantId.toUpperCase()}
                          </span>
                          {renderCriticalityBadge(area.criticality)}
                        </div>
                        <p className="text-xs text-slate-600 dark:text-slate-300 truncate mt-0.5 font-medium">
                          {area.name} {area.unit && <span className="text-slate-400">({area.unit})</span>}
                        </p>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1.5 shrink-0 ml-2">
                      <button
                        type="button"
                        onClick={() => handleAddChild(area)}
                        className="px-2 py-1 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/50 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 rounded-md border border-emerald-500/20 flex items-center gap-1"
                        title="Add System (L2)"
                      >
                        <Plus size={12} />
                        <span>+ Sub</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleEdit(area)}
                        className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-md"
                        title="Edit Node"
                      >
                        <Edit2 size={13} />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(area.id, area.name)}
                        className="p-1.5 text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/50 rounded-md"
                        title="Delete"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>

                  {/* LEVEL 2: SYSTEMS */}
                  {isAreaExpanded && (
                    <div className="pl-6 sm:pl-10 pr-3 pb-3 pt-1 space-y-2 border-t border-slate-200 dark:border-slate-800/60 bg-white/60 dark:bg-slate-900/80">
                      {area.systems.length === 0 && area.directEquipments.length === 0 ? (
                        <p className="text-xs text-slate-400 italic py-2 pl-4">
                          {isTh ? 'ยังไม่มีระบบย่อยหรืออุปกรณ์ภายใต้พื้นที่นี้ กด "+ Sub" เพื่อเพิ่ม' : 'No sub-systems. Click "+ Sub" to add.'}
                        </p>
                      ) : (
                        area.systems.map((sys) => {
                          const isSysExpanded = expandedNodes.has(sys.id);
                          const isSysSelected = selectedNodeId === sys.id;

                          return (
                            <div key={sys.id} className="border border-slate-200/80 dark:border-slate-800/60 rounded-lg overflow-hidden bg-slate-50/70 dark:bg-slate-800/40">
                              {/* SYSTEM ROW */}
                              <div className={`flex items-center justify-between p-2.5 transition-colors ${
                                isSysSelected ? 'bg-emerald-500/10 border-l-4 border-emerald-500' : 'hover:bg-slate-100/60 dark:hover:bg-slate-800/60'
                              }`}>
                                <div className="flex items-center gap-2 flex-1 min-w-0">
                                  <button
                                    type="button"
                                    onClick={() => toggleNode(sys.id)}
                                    className="p-0.5 rounded text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                                  >
                                    {isSysExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                                  </button>

                                  <div className="w-6 h-6 rounded-md bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
                                    <CornerDownRight size={13} />
                                  </div>

                                  <div className="min-w-0 flex-1 cursor-pointer" onClick={() => onSelectNode?.(sys.id)}>
                                    <div className="flex items-center gap-2 flex-wrap">
                                      <span className="font-mono text-xs font-semibold text-slate-900 dark:text-white">
                                        {sys.flocCode}
                                      </span>
                                      <span className="text-[10px] px-1 py-0.2 rounded bg-indigo-100 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300 font-medium">
                                        L2: System
                                      </span>
                                      {sys.category && (
                                        <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-200/80 dark:bg-slate-800 text-slate-500">
                                          {sys.category}
                                        </span>
                                      )}
                                      {renderCriticalityBadge(sys.criticality)}
                                    </div>
                                    <p className="text-xs text-slate-600 dark:text-slate-300 truncate font-normal mt-0.5">
                                      {sys.name}
                                    </p>
                                  </div>
                                </div>

                                <div className="flex items-center gap-1.5 shrink-0 ml-2">
                                  <button
                                    type="button"
                                    onClick={() => handleAddChild(sys)}
                                    className="px-2 py-1 text-[10px] font-semibold text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-950/50 hover:bg-purple-100 dark:hover:bg-purple-900/60 rounded border border-purple-500/20 flex items-center gap-1"
                                    title="Add Equipment (L3)"
                                  >
                                    <Plus size={11} />
                                    <span>+ Asset</span>
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleEdit(sys)}
                                    className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded"
                                  >
                                    <Edit2 size={12} />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleDelete(sys.id, sys.name)}
                                    className="p-1 text-slate-400 hover:text-rose-500 rounded"
                                  >
                                    <Trash2 size={12} />
                                  </button>
                                </div>
                              </div>

                              {/* LEVEL 3: EQUIPMENT ASSETS */}
                              {isSysExpanded && (
                                <div className="pl-6 sm:pl-8 pr-2 py-2 space-y-1.5 border-t border-slate-200/60 dark:border-slate-800/40 bg-white/40 dark:bg-slate-900/60">
                                  {sys.equipments.length === 0 ? (
                                    <p className="text-[11px] text-slate-400 italic py-1 pl-2">
                                      {isTh ? 'ยังไม่มีอุปกรณ์ กด "+ Asset" เพื่อระบุแท็ก' : 'No equipment. Click "+ Asset" to add.'}
                                    </p>
                                  ) : (
                                    sys.equipments.map((eq) => {
                                      const isEqSelected = selectedNodeId === eq.id;

                                      return (
                                        <div
                                          key={eq.id}
                                          className={`flex items-center justify-between p-2 rounded-lg border transition-all ${
                                            isEqSelected 
                                              ? 'bg-emerald-500/10 border-emerald-500' 
                                              : 'bg-white dark:bg-slate-900/90 border-slate-200/80 dark:border-slate-800/80 hover:border-slate-300 dark:hover:border-slate-700'
                                          }`}
                                        >
                                          <div className="flex items-center gap-2.5 flex-1 min-w-0">
                                            <div className="w-5 h-5 rounded bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0">
                                              <Tag size={11} />
                                            </div>

                                            <div className="min-w-0 flex-1 cursor-pointer" onClick={() => onSelectNode?.(eq.id)}>
                                              <div className="flex items-center gap-2 flex-wrap">
                                                {eq.equipmentTag && (
                                                  <span className="px-1.5 py-0.5 rounded font-mono text-[11px] font-black tracking-wide bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900">
                                                    {eq.equipmentTag}
                                                  </span>
                                                )}
                                                <span className="font-mono text-[11px] font-semibold text-slate-700 dark:text-slate-300">
                                                  {eq.flocCode}
                                                </span>
                                                <span className="text-[10px] text-slate-500">
                                                  • {eq.category || 'Asset'}
                                                </span>
                                                {renderCriticalityBadge(eq.criticality)}
                                                {eq.xPercent !== undefined && eq.yPercent !== undefined && (
                                                  <span className="text-[10px] text-slate-400 font-mono hidden md:inline">
                                                    [{eq.xPercent.toFixed(1)}%, {eq.yPercent.toFixed(1)}%]
                                                  </span>
                                                )}
                                              </div>
                                              <p className="text-[11px] text-slate-600 dark:text-slate-400 truncate mt-0.5">
                                                {eq.name}
                                              </p>
                                            </div>
                                          </div>

                                          <div className="flex items-center gap-1 shrink-0 ml-2">
                                            {onSwitchToMapTab && (
                                              <button
                                                type="button"
                                                onClick={() => onSwitchToMapTab(eq.id)}
                                                className="p-1 text-slate-400 hover:text-indigo-500 rounded"
                                                title="View on CAD Plot Plan"
                                              >
                                                <Compass size={12} />
                                              </button>
                                            )}
                                            <button
                                              type="button"
                                              onClick={() => handleEdit(eq)}
                                              className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded"
                                              title="Edit"
                                            >
                                              <Edit2 size={12} />
                                            </button>
                                            <button
                                              type="button"
                                              onClick={() => handleDelete(eq.id, eq.name)}
                                              className="p-1 text-slate-400 hover:text-rose-500 rounded"
                                              title="Delete"
                                            >
                                              <Trash2 size={12} />
                                            </button>
                                          </div>
                                        </div>
                                      );
                                    })
                                  )}
                                </div>
                              )}
                            </div>
                          );
                        })
                      )}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      ) : (
        /* =====================================================================
            TABLE VIEW MATRIX
           ===================================================================== */
        <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 font-bold uppercase tracking-wider text-[11px]">
                  <th className="py-3 px-4">FLOC Code</th>
                  <th className="py-3 px-3">Equipment Tag</th>
                  <th className="py-3 px-4">Name / Description</th>
                  <th className="py-3 px-3">Plant</th>
                  <th className="py-3 px-3">Level</th>
                  <th className="py-3 px-3">Category</th>
                  <th className="py-3 px-3">Criticality</th>
                  <th className="py-3 px-3">Parent</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-normal">
                {filteredList.map((f) => {
                  const parent = flocList.find(p => p.id === f.parentId);
                  return (
                    <tr 
                      key={f.id}
                      className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors cursor-pointer"
                      onClick={() => onSelectNode?.(f.id)}
                    >
                      <td className="py-3 px-4 font-mono font-bold text-slate-900 dark:text-white">
                        {f.flocCode}
                      </td>
                      <td className="py-3 px-3 font-mono font-black">
                        {f.equipmentTag ? (
                          <span className="px-1.5 py-0.5 rounded bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 text-[10px]">
                            {f.equipmentTag}
                          </span>
                        ) : (
                          <span className="text-slate-400 dark:text-slate-600">-</span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-semibold text-slate-900 dark:text-slate-100">{f.name}</div>
                        {f.description && (
                          <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate max-w-xs">{f.description}</div>
                        )}
                      </td>
                      <td className="py-3 px-3 uppercase font-bold text-slate-700 dark:text-slate-200">
                        {f.plantId}
                      </td>
                      <td className="py-3 px-3">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                          f.level === 'Area'
                            ? 'bg-blue-100 text-blue-700 dark:bg-blue-950/80 dark:text-blue-300'
                            : f.level === 'System'
                              ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-950/80 dark:text-indigo-300'
                              : 'bg-purple-100 text-purple-700 dark:bg-purple-950/80 dark:text-purple-300'
                        }`}>
                          {f.level}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-slate-700 dark:text-slate-300 font-medium">
                        {f.category || '-'}
                      </td>
                      <td className="py-3 px-3">
                        {renderCriticalityBadge(f.criticality)}
                      </td>
                      <td className="py-3 px-3 font-mono text-slate-600 dark:text-slate-400 text-[11px]">
                        {parent ? parent.flocCode : '-'}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5" onClick={(e) => e.stopPropagation()}>
                          {onSwitchToMapTab && (
                            <button
                              type="button"
                              onClick={() => onSwitchToMapTab(f.id)}
                              className="p-1.5 text-slate-400 hover:text-indigo-500 rounded hover:bg-slate-100 dark:hover:bg-slate-800"
                              title="View on Map"
                            >
                              <Compass size={14} />
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => handleEdit(f)}
                            className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-white rounded hover:bg-slate-100 dark:hover:bg-slate-800"
                            title="Edit"
                          >
                            <Edit2 size={14} />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(f.id, f.name)}
                            className="p-1.5 text-slate-400 hover:text-rose-500 rounded hover:bg-slate-100 dark:hover:bg-slate-800"
                            title="Delete"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal for Create/Edit */}
      <FlocModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={(data) => {
          if (editingFloc) {
            onUpdateFloc(data);
          } else {
            onAddFloc(data);
          }
        }}
        editingFloc={editingFloc}
        parentPreset={parentPreset}
        existingFlocs={flocList}
      />
    </div>
  );
}
