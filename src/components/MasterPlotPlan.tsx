import React, { useState, useMemo, useRef, useEffect } from 'react';
import { 
  MapPin, Plus, X, UploadCloud, Save, FolderTree, Search, Filter, 
  ExternalLink, Layers, ZoomIn, ZoomOut, RotateCcw, CheckCircle2, 
  AlertTriangle, Crosshair, ArrowRight, Building2, Tag, Cpu, Flame,
  Box, Eye, Sparkles, Download, Printer, ShieldAlert, GitBranch,
  Compass, LayoutGrid, Check, ChevronRight, ChevronDown, Trash2, Edit2,
  Factory, Moon, Sun
} from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { useThemeGate } from '../utils/themeGate';
import { S2_TURNOVER_HIERARCHY, UnitRecord, RowHighlightType } from '../data/s2FunctionalLocationData';
import { 
  MappedLocationMarker, 
  MasterPlanConfig, 
  INITIAL_MASTER_PLANS, 
  INITIAL_MAPPED_MARKERS,
  getStoredMappedMarkers,
  saveStoredMappedMarkers,
  calculateGridZone as calculateSharedGridZone,
  PLOT_PLAN_UPDATED_EVENT
} from '../data/plotPlanMappingData';
import essoPlotPlanBg from '../assets/esso_sriracha_master_plotplan.jpg';

export type { MappedLocationMarker, MasterPlanConfig };

interface MasterPlotPlanProps {
  isScaffolding?: boolean;
  onNavigateToFunctionalLocation?: (nodeId?: string) => void;
  initialSelectedNodeId?: string | null;
}

export default function MasterPlotPlan({ 
  isScaffolding = false,
  onNavigateToFunctionalLocation,
  initialSelectedNodeId
}: MasterPlotPlanProps) {
  const { language } = useLanguage();
  const isTh = language === 'th';

  // State: Plant Selection (Bangchak Phra Khanong vs Si Racha)
  const [selectedPlant, setSelectedPlant] = useState<'Phra Khanong' | 'Sriracha'>('Phra Khanong');
  const [spatialStatusFilter, setSpatialStatusFilter] = useState<'all' | 'ready' | 'in_progress' | 'cat_a'>('all');

  // State: Plans & Selected Plan
  const [plans, setPlans] = useState<MasterPlanConfig[]>(INITIAL_MASTER_PLANS);
  const [selectedPlanId, setSelectedPlanId] = useState<string>('plan-overall');

  // Filter plans available for current plant
  const availablePlans = useMemo(() => {
    return plans.filter(p => (p.plant || 'Phra Khanong') === selectedPlant);
  }, [plans, selectedPlant]);

  // State: Mapped Markers (persisted in localStorage and state)
  const [markers, setMarkers] = useState<MappedLocationMarker[]>(() => getStoredMappedMarkers());
  
  // State: Selected Marker or Unit for Inspector
  const [selectedMarkerId, setSelectedMarkerId] = useState<string | null>('map-1');

  // Sync with initialSelectedNodeId
  useEffect(() => {
    if (initialSelectedNodeId) {
      const match = markers.find(m => m.nodeId === initialSelectedNodeId || m.id === initialSelectedNodeId);
      if (match) {
        setSelectedMarkerId(match.id);
        setSelectedPlanId(match.plotPlanId);
      }
    }
  }, [initialSelectedNodeId, markers]);

  // Listen for storage events / external plot plan marker updates
  useEffect(() => {
    const handleUpdate = () => {
      setMarkers(getStoredMappedMarkers());
    };
    window.addEventListener(PLOT_PLAN_UPDATED_EVENT, handleUpdate);
    window.addEventListener('storage', handleUpdate);
    return () => {
      window.removeEventListener(PLOT_PLAN_UPDATED_EVENT, handleUpdate);
      window.removeEventListener('storage', handleUpdate);
    };
  }, []);
  
  // State: UI & Controls (Linked with Global Theme Gate: Dark -> 'blueprint', Light -> 'cad')
  const [gateIsDark, setGlobalThemeGate] = useThemeGate();
  const [themeMode, setThemeMode] = useState<'blueprint' | 'cad'>(() => gateIsDark ? 'blueprint' : 'cad');
  useEffect(() => {
    setThemeMode(gateIsDark ? 'blueprint' : 'cad');
  }, [gateIsDark]);
  const isDarkMode = themeMode === 'blueprint';
  const [zoomLevel, setZoomLevel] = useState<number>(100);

  // Mouse wheel zoom - locked to min 100% to prevent black borders
  const handleWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (e.deltaY < 0) {
      setZoomLevel(prev => Math.min(400, prev + 15));
    } else {
      setZoomLevel(prev => Math.max(100, prev - 15));
    }
  };

  const [showGrid, setShowGrid] = useState<boolean>(true);
  const [showUnitZones, setShowUnitZones] = useState<boolean>(true);
  const [showMarkers, setShowMarkers] = useState<boolean>(true);
  const [filterCriticalOnly, setFilterCriticalOnly] = useState<boolean>(false);
  const [isTreeDrawerOpen, setIsTreeDrawerOpen] = useState<boolean>(true);
  const [treeSearchQuery, setTreeSearchQuery] = useState<string>('');
  const [treeMappingFilter, setTreeMappingFilter] = useState<'all' | 'mapped' | 'unmapped'>('all');

  // State: Pinning Mode (User picked an unmapped asset and clicks map to place pin)
  const [pinPlacementCandidate, setPinPlacementCandidate] = useState<{
    nodeId: string;
    tag: string;
    name: string;
    level: number;
    levelType: 'unit' | 'system' | 'equipment' | 'component';
    unitId: string;
    unitName: string;
    systemName: string;
    refCode?: string;
    highlight?: RowHighlightType;
    isCriticalPath?: boolean;
    description?: string;
  } | null>(null);

  // State: Create New Plot Plan Modal
  const [isCreateModalOpen, setIsCreateModalOpen] = useState<boolean>(false);
  const [newPlanName, setNewPlanName] = useState<string>('');
  const [newPlanZone, setNewPlanZone] = useState<string>('');
  const [newPlanUnitId, setNewPlanUnitId] = useState<string>('unit-aps1');
  const [newPlanImageUrl, setNewPlanImageUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Canvas Reference
  const canvasRef = useRef<HTMLDivElement>(null);

  // Current active Master Plan
  const currentPlan = useMemo(() => {
    const match = plans.find(p => p.id === selectedPlanId);
    if (match && (match.plant || 'Phra Khanong') === selectedPlant) return match;
    return availablePlans[0] || plans[0];
  }, [plans, selectedPlanId, availablePlans, selectedPlant]);

  // Flattened Functional Location items from S2_TURNOVER_HIERARCHY
  const flatHierarchyAssets = useMemo(() => {
    const list: {
      nodeId: string;
      tag: string;
      name: string;
      level: number;
      levelType: 'unit' | 'system' | 'equipment' | 'component';
      unitId: string;
      unitName: string;
      systemName: string;
      refCode?: string;
      highlight?: RowHighlightType;
      isCriticalPath?: boolean;
      description?: string;
    }[] = [];

    S2_TURNOVER_HIERARCHY.forEach(unit => {
      // Unit itself
      list.push({
        nodeId: unit.id,
        tag: unit.name,
        name: unit.name,
        level: 1,
        levelType: 'unit',
        unitId: unit.id,
        unitName: unit.name,
        systemName: 'Top Level Unit Battery',
        description: unit.fullName
      });

      unit.systems.forEach(sys => {
        // System itself
        list.push({
          nodeId: sys.id,
          tag: sys.name,
          name: sys.name,
          level: 2,
          levelType: 'system',
          unitId: unit.id,
          unitName: unit.name,
          systemName: sys.name,
          description: sys.description
        });

        // Equipment records
        sys.equipment.forEach((eq, eqIdx) => {
          const eqNodeId = `${unit.id}-eq-${eq.tag.replace(/[^a-zA-Z0-9]/g, '_')}-${eqIdx}`;
          list.push({
            nodeId: eqNodeId,
            tag: eq.tag,
            name: eq.tag,
            level: 3,
            levelType: 'equipment',
            unitId: unit.id,
            unitName: unit.name,
            systemName: sys.name,
            refCode: eq.refCode,
            highlight: eq.highlight || 'none',
            isCriticalPath: !!eq.isCriticalPath,
            description: eq.description
          });
        });
      });
    });

    return list;
  }, []);

  // Filtered markers on the canvas (supports plant and Spatial Status Layer)
  const visibleMarkers = useMemo(() => {
    return markers.filter(m => {
      // Must match active plant
      const markerPlant = m.plant || 'Phra Khanong';
      if (markerPlant !== selectedPlant) return false;

      // Must match current plot plan (or overall plan)
      const isOverall = selectedPlanId === 'plan-overall' || selectedPlanId === 'plan-sriracha-complex';
      const matchesPlan = m.plotPlanId === selectedPlanId || isOverall;
      if (!matchesPlan) return false;

      if (filterCriticalOnly && !m.isCriticalPath) return false;

      // Spatial Status Layer Filter
      if (spatialStatusFilter === 'ready' && m.status !== 'Ready for Turnover' && m.status !== 'Completed') return false;
      if (spatialStatusFilter === 'in_progress' && m.status !== 'In Progress' && m.status !== 'Pending Walkdown') return false;
      if (spatialStatusFilter === 'cat_a' && !m.hasCatAPunch) return false;

      return true;
    });
  }, [markers, selectedPlanId, filterCriticalOnly, selectedPlant, spatialStatusFilter]);

  // Selected Marker Object
  const selectedMarker = useMemo(() => {
    return markers.find(m => m.id === selectedMarkerId) || null;
  }, [markers, selectedMarkerId]);

  // Filtered Hierarchy Tree items in side drawer
  const filteredTreeItems = useMemo(() => {
    return flatHierarchyAssets.filter(item => {
      if (treeSearchQuery) {
        const q = treeSearchQuery.toLowerCase();
        const matchesQuery = 
          item.tag.toLowerCase().includes(q) ||
          item.name.toLowerCase().includes(q) ||
          (item.description && item.description.toLowerCase().includes(q)) ||
          (item.refCode && item.refCode.toLowerCase().includes(q)) ||
          item.unitName.toLowerCase().includes(q);
        if (!matchesQuery) return false;
      }

      const isMapped = markers.some(m => m.nodeId === item.nodeId || m.tag === item.tag);
      if (treeMappingFilter === 'mapped' && !isMapped) return false;
      if (treeMappingFilter === 'unmapped' && isMapped) return false;

      return true;
    });
  }, [flatHierarchyAssets, treeSearchQuery, treeMappingFilter, markers]);

  // Helper to determine Grid Zone based on coordinates (A-F, 1-8)
  const calculateGridZone = (x: number, y: number): string => {
    const colLetters = ['A', 'B', 'C', 'D', 'E', 'F'];
    const colIndex = Math.min(Math.floor((x / 100) * 6), 5);
    const rowIndex = Math.min(Math.floor((y / 100) * 8) + 1, 8);
    return `${colLetters[colIndex]}${rowIndex}`;
  };

  // Handle clicking on map canvas
  const handleMapClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!pinPlacementCandidate) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = ((e.clientX - rect.left) / rect.width) * 100;
    const clickY = ((e.clientY - rect.top) / rect.height) * 100;

    const roundedX = parseFloat(clickX.toFixed(1));
    const roundedY = parseFloat(clickY.toFixed(1));
    const gridZone = calculateGridZone(roundedX, roundedY);

    const newMarker: MappedLocationMarker = {
      id: `map-${Date.now()}`,
      nodeId: pinPlacementCandidate.nodeId,
      tag: pinPlacementCandidate.tag,
      name: pinPlacementCandidate.name,
      level: pinPlacementCandidate.level,
      levelType: pinPlacementCandidate.levelType,
      unitId: pinPlacementCandidate.unitId,
      unitName: pinPlacementCandidate.unitName,
      systemName: pinPlacementCandidate.systemName,
      refCode: pinPlacementCandidate.refCode,
      highlight: pinPlacementCandidate.highlight || 'none',
      isCriticalPath: !!pinPlacementCandidate.isCriticalPath,
      description: pinPlacementCandidate.description,
      status: 'Ready for Turnover',
      x: roundedX,
      y: roundedY,
      gridZone,
      plotPlanId: selectedPlanId
    };

    const updated = [...markers.filter(m => m.nodeId !== pinPlacementCandidate.nodeId), newMarker];
    setMarkers(updated);
    saveStoredMappedMarkers(updated);
    setSelectedMarkerId(newMarker.id);
    setPinPlacementCandidate(null);
  };

  // Upload custom blueprint
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (ev) => {
        if (ev.target?.result) {
          setNewPlanImageUrl(ev.target.result as string);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  // Save new Master Plan
  const handleSaveNewPlan = () => {
    if (!newPlanName || !newPlanZone) return;

    const newPlan: MasterPlanConfig = {
      id: `plan-${Date.now()}`,
      name: newPlanName,
      nameTh: newPlanName,
      description: `Custom Engineering CAD Blueprint for ${newPlanZone}`,
      zone: newPlanZone,
      unitId: newPlanUnitId,
      plant: selectedPlant,
      backgroundType: newPlanImageUrl ? 'custom' : 'blueprint',
      customImageUrl: newPlanImageUrl
    };

    setPlans(prev => [...prev, newPlan]);
    setSelectedPlanId(newPlan.id);
    setIsCreateModalOpen(false);
    setNewPlanName('');
    setNewPlanZone('');
    setNewPlanImageUrl(null);
  };

  // Delete Marker
  const handleDeleteMarker = (markerId: string) => {
    const updated = markers.filter(m => m.id !== markerId);
    setMarkers(updated);
    saveStoredMappedMarkers(updated);
    if (selectedMarkerId === markerId) {
      setSelectedMarkerId(null);
    }
  };

  return (
    <div className="space-y-5 max-w-7xl mx-auto pb-16 animate-in fade-in duration-300">
      {/* 1. Header Control Deck */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 p-5 sm:p-6 rounded-2xl text-white shadow-xl border border-slate-700/60 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="space-y-1.5 flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full bg-blue-500/20 text-blue-400 border border-blue-500/30 font-mono text-[11px] font-semibold tracking-wide flex items-center gap-1.5">
              <Compass size={13} className="text-blue-400" />
              <span>SPATIAL CAD MAPPING</span>
            </span>
            <span className="text-slate-400 text-xs">
              • {isTh ? 'เชื่อมโยงพิกัดแผนผังกับผังโครงสร้างต้นไม้ (Tree View)' : 'Direct Linkage with Functional Location Tree'}
            </span>
          </div>

          <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white flex items-center gap-2.5">
            <span className="p-2 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20 shadow-xs shrink-0">
              <MapPin size={22} />
            </span>
            <span className="truncate">
              {isTh ? 'แผนที่รวมโรงงานและการเชื่อมโยงตำแหน่ง' : 'Master Plot Plan & Spatial Asset Mapping'}
            </span>
          </h1>

          <p className="text-xs sm:text-sm text-slate-300 max-w-3xl leading-relaxed">
            {isTh
              ? 'ระบบเชื่อมโยงพิกัดทางกายภาพของโรงกลั่น เข้ากับผังโครงสร้างตำแหน่งและระบบ (Functional Location Tree): ปักหมุดอุปกรณ์ ระบุขอบเขตยูนิต (Battery Limits) และกระโดดข้ามไปยังผังโครงสร้างต้นไม้แบบทันที'
              : 'Interactive spatial engineering blueprint linking physical refinery coordinates with the Functional Location & Asset Hierarchy tree. Pin equipment, verify battery limits, and jump directly to the Tree Inspector.'}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 shrink-0 self-start lg:self-center">
          {/* Jump to Functional Location Tree View */}
          {onNavigateToFunctionalLocation && (
            <button
              type="button"
              onClick={() => onNavigateToFunctionalLocation(selectedMarker?.nodeId || 'unit-aps1')}
              className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs h-9 px-3.5 rounded-xl shadow-md shadow-indigo-900/40 flex items-center gap-1.5 transition-all cursor-pointer"
              title="Open the highlighted asset directly inside Functional Location Tree View"
            >
              <FolderTree size={15} />
              <span>{isTh ? 'เปิดในผังโครงสร้างต้นไม้ (Tree View)' : 'Jump to Hierarchy Tree'}</span>
              <ArrowRight size={13} />
            </button>
          )}

          {/* Create Master Location Button */}
          <button
            type="button"
            onClick={() => setIsCreateModalOpen(true)}
            className="bg-[#008b52] hover:bg-[#007b48] text-white font-bold text-xs h-9 px-3.5 rounded-xl shadow-md shadow-emerald-950/40 flex items-center gap-1.5 transition-all cursor-pointer"
          >
            <Plus size={15} />
            <span>{isTh ? '+ เพิ่มผังแบบแปลนใหม่' : '+ New Plot Plan'}</span>
          </button>
        </div>
      </div>

      {/* 2. Sub-Deck: Plant Selector, Plan Selector & Telemetry Bar */}
      <div className="bg-white dark:bg-slate-900 p-3.5 sm:p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col gap-3">
        {/* Plant Selector Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 pb-2 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <span className="text-xs font-black uppercase tracking-wider text-slate-400 mr-1 shrink-0">
              {isTh ? 'โรงงานปฏิบัติการ:' : 'Operating Plant:'}
            </span>
            <div className="inline-flex p-1 bg-slate-100 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700/60">
              <button
                type="button"
                onClick={() => {
                  setSelectedPlant('Phra Khanong');
                  setSelectedPlanId('plan-overall');
                  setPinPlacementCandidate(null);
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  selectedPlant === 'Phra Khanong'
                    ? 'bg-[#008b52] text-white shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <Building2 size={13} />
                <span>{isTh ? '🏢 บางจาก พระโขนง' : '🏢 Bangchak Phra Khanong'}</span>
                <span className={`text-[10px] font-mono px-1.5 py-0.2 rounded-full font-bold ${
                  selectedPlant === 'Phra Khanong' ? 'bg-white/20 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                }`}>
                  {markers.filter(m => (m.plant || 'Phra Khanong') === 'Phra Khanong').length}
                </span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setSelectedPlant('Sriracha');
                  setSelectedPlanId('plan-sriracha-complex');
                  setPinPlacementCandidate(null);
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  selectedPlant === 'Sriracha'
                    ? 'bg-[#ff6800] text-slate-950 font-black shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <Factory size={13} />
                <span>{isTh ? '🏭 บางจาก ศรีราชา' : '🏭 Bangchak Si Racha'}</span>
                <span className={`text-[10px] font-mono px-1.5 py-0.2 rounded-full font-bold ${
                  selectedPlant === 'Sriracha' ? 'bg-black/20 text-slate-950' : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                }`}>
                  {markers.filter(m => m.plant === 'Sriracha').length}
                </span>
              </button>
            </div>
          </div>

          {/* Spatial Stats Strip */}
          <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400 shrink-0">
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>Mapped: <strong className="text-slate-800 dark:text-slate-100 font-mono">{visibleMarkers.length}</strong></span>
            </div>
            <span>•</span>
            <div className="flex items-center gap-1.5">
              <span className="text-red-500 font-black">*</span>
              <span>Critical Path: <strong className="text-red-600 font-mono">{visibleMarkers.filter(m => m.isCriticalPath).length}</strong></span>
            </div>
            <span>•</span>
            <button
              onClick={() => setIsTreeDrawerOpen(!isTreeDrawerOpen)}
              className="px-2.5 py-1 rounded-lg border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 font-bold text-xs flex items-center gap-1.5 cursor-pointer"
            >
              <FolderTree size={13} className="text-indigo-500" />
              <span>{isTreeDrawerOpen ? (isTh ? 'ซ่อนต้นไม้' : 'Hide Tree Panel') : (isTh ? 'แสดงต้นไม้' : 'Show Tree Panel')}</span>
            </button>
          </div>
        </div>

        {/* Plot Plan Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0 custom-scrollbar">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider mr-1 shrink-0">
            {isTh ? 'แบบแปลน CAD:' : 'CAD Blueprint:'}
          </span>
          {availablePlans.map(plan => (
            <button
              key={plan.id}
              onClick={() => {
                setSelectedPlanId(plan.id);
                setPinPlacementCandidate(null);
              }}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer flex items-center gap-1.5 ${
                selectedPlanId === plan.id
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              <LayoutGrid size={13} />
              <span>{isTh ? plan.nameTh : plan.name}</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono font-bold ${
                selectedPlanId === plan.id ? 'bg-blue-800/80 text-blue-100' : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-400'
              }`}>
                {markers.filter(m => (m.plant || 'Phra Khanong') === selectedPlant && (m.plotPlanId === plan.id || plan.id === 'plan-overall' || plan.id === 'plan-sriracha-complex')).length}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* 3. Pin Placement Banner (Appears when user clicked "Pin to Map" from Hierarchy) */}
      {pinPlacementCandidate && (
        <div className="p-3.5 rounded-xl bg-amber-500 text-slate-950 font-bold text-xs flex items-center justify-between shadow-md animate-in slide-in-from-top-2">
          <div className="flex items-center gap-2.5">
            <Crosshair size={18} className="animate-spin" />
            <div>
              <span className="uppercase tracking-wider font-mono text-[10px] bg-black/20 px-1.5 py-0.5 rounded">
                PIN PLACEMENT ACTIVE
              </span>
              <span className="ml-2">
                Click anywhere on the Master Plot Plan to place: <strong>{pinPlacementCandidate.tag}</strong> ({pinPlacementCandidate.systemName})
              </span>
            </div>
          </div>
          <button
            onClick={() => setPinPlacementCandidate(null)}
            className="px-2.5 py-1 rounded-lg bg-black/20 hover:bg-black/30 text-white text-xs font-bold cursor-pointer"
          >
            Cancel
          </button>
        </div>
      )}

      {/* 4. Main Workdesk: Split Screen (Left: Functional Location Tree | Right: Master CAD Blueprint) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* LEFT COLUMN: Linked Functional Location Tree Explorer (4 cols) */}
        {isTreeDrawerOpen && (
          <div className="lg:col-span-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden flex flex-col h-[750px]">
            {/* Header */}
            <div className="p-3.5 bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FolderTree size={16} className="text-indigo-600 dark:text-indigo-400" />
                <span className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-slate-100">
                  {isTh ? 'ผังโครงสร้างตำแหน่ง (Hierarchy)' : 'Functional Location Hierarchy'}
                </span>
              </div>
              <span className="text-[11px] font-mono text-slate-400">
                {filteredTreeItems.length} items
              </span>
            </div>

            {/* Search & Mapping Filters */}
            <div className="p-3 border-b border-slate-100 dark:border-slate-800 space-y-2">
              <div className="relative">
                <Search size={14} className="absolute left-2.5 top-2.5 text-slate-400" />
                <input
                  type="text"
                  value={treeSearchQuery}
                  onChange={(e) => setTreeSearchQuery(e.target.value)}
                  placeholder={isTh ? 'ค้นหา Tag, รหัสอ้างอิง, อุปกรณ์...' : 'Search Tag, Ref code, Equipment...'}
                  className="w-full pl-8 pr-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div className="flex items-center gap-1.5 text-[11px]">
                <button
                  onClick={() => setTreeMappingFilter('all')}
                  className={`px-2 py-0.5 rounded font-bold transition-colors cursor-pointer ${
                    treeMappingFilter === 'all' ? 'bg-indigo-600 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                  }`}
                >
                  All ({flatHierarchyAssets.length})
                </button>
                <button
                  onClick={() => setTreeMappingFilter('mapped')}
                  className={`px-2 py-0.5 rounded font-bold transition-colors cursor-pointer flex items-center gap-1 ${
                    treeMappingFilter === 'mapped' ? 'bg-emerald-600 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                  }`}
                >
                  <MapPin size={11} />
                  <span>Mapped ({markers.length})</span>
                </button>
                <button
                  onClick={() => setTreeMappingFilter('unmapped')}
                  className={`px-2 py-0.5 rounded font-bold transition-colors cursor-pointer ${
                    treeMappingFilter === 'unmapped' ? 'bg-amber-600 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                  }`}
                >
                  Unmapped ({flatHierarchyAssets.length - markers.length})
                </button>
              </div>
            </div>

            {/* Tree Item Scroll List */}
            <div className="flex-1 overflow-y-auto p-2.5 space-y-1.5 custom-scrollbar">
              {filteredTreeItems.map(item => {
                const mappedMarker = markers.find(m => m.nodeId === item.nodeId || m.tag === item.tag);
                const isSelected = selectedMarker?.nodeId === item.nodeId;

                // Level colors matching Functional Location reference
                let levelBadge = 'bg-slate-200 text-slate-700';
                if (item.level === 1) levelBadge = 'bg-[#008b52] text-white font-bold';
                else if (item.level === 2) levelBadge = 'bg-[#ff6800] text-slate-950 font-bold';
                else if (item.level === 3) levelBadge = 'bg-indigo-600 text-white';

                return (
                  <div
                    key={item.nodeId}
                    onClick={() => {
                      if (mappedMarker) {
                        setSelectedMarkerId(mappedMarker.id);
                      }
                    }}
                    className={`p-2.5 rounded-xl border text-xs transition-all cursor-pointer ${
                      isSelected 
                        ? 'border-blue-500 bg-blue-50/70 dark:bg-blue-950/40 ring-1 ring-blue-500' 
                        : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-slate-400'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-1.5">
                      <div className="flex items-center gap-1.5 min-w-0 flex-1 truncate">
                        <span className={`text-[9px] px-1.5 py-0.2 rounded font-mono ${levelBadge}`}>
                          L{item.level}
                        </span>
                        <strong className="font-mono text-slate-800 dark:text-slate-100 truncate">
                          {item.tag}
                        </strong>
                        {item.isCriticalPath && (
                          <span className="text-red-600 font-black text-sm shrink-0" title="Critical Path (*)">
                            *
                          </span>
                        )}
                      </div>

                      {/* Map Status indicator or Pin CTA */}
                      {mappedMarker ? (
                        <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 flex items-center gap-1 shrink-0">
                          <MapPin size={10} />
                          <span>[{mappedMarker.gridZone}]</span>
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setPinPlacementCandidate(item);
                          }}
                          className="px-2 py-0.5 rounded bg-blue-600 hover:bg-blue-700 text-white text-[10px] font-bold flex items-center gap-1 cursor-pointer shrink-0 shadow-xs"
                          title="Click here, then click on the plot plan to set coordinates"
                        >
                          <Plus size={10} />
                          <span>Pin to Map</span>
                        </button>
                      )}
                    </div>

                    <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 truncate">
                      {item.description || item.systemName}
                    </div>

                    <div className="flex items-center gap-2 mt-1.5 text-[10px] font-mono text-slate-400">
                      <span>{item.unitName}</span>
                      <span>•</span>
                      <span>{item.systemName}</span>
                      {item.refCode && (
                        <>
                          <span>•</span>
                          <span className="text-indigo-600 dark:text-indigo-400 font-bold">Ref: {item.refCode}</span>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Bottom Link to Full Hierarchy Page */}
            {onNavigateToFunctionalLocation && (
              <div className="p-3 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 text-center">
                <button
                  type="button"
                  onClick={() => onNavigateToFunctionalLocation(selectedMarker?.nodeId || 'unit-aps1')}
                  className="w-full py-1.5 text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <FolderTree size={14} />
                  <span>{isTh ? 'เปิดหน้าผังโครงสร้างเต็มรูปแบบ (Full Tree)' : 'Open Full Hierarchy Tree Workdesk'}</span>
                  <ExternalLink size={12} />
                </button>
              </div>
            )}
          </div>
        )}

        {/* RIGHT COLUMN: Interactive Master Plot Plan Blueprint & Spatial Canvas */}
        <div className={`${isTreeDrawerOpen ? 'lg:col-span-8' : 'lg:col-span-12'} space-y-4`}>
          {/* Blueprint Canvas Container */}
          <div className={`rounded-2xl border-2 shadow-xl overflow-hidden relative flex flex-col transition-colors ${
            isDarkMode 
              ? 'bg-slate-950 border-slate-700/80' 
              : 'bg-white border-slate-300'
          }`}>
            {/* Top Canvas Toolbar */}
            <div className={`p-3 border-b flex flex-wrap items-center justify-between gap-3 text-xs transition-colors ${
              isDarkMode 
                ? 'bg-slate-900 border-slate-800 text-slate-200' 
                : 'bg-slate-100 border-slate-200 text-slate-800 shadow-2xs'
            }`}>
              <div className="flex items-center gap-2.5">
                <div className={`flex items-center gap-1 px-2 py-1 rounded-lg border font-mono text-[11px] ${
                  isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-300'
                }`}>
                  <Compass size={14} className="text-amber-400" />
                  <span>PLANT NORTH ▲</span>
                </div>
                <span className={`font-bold ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                  {currentPlan.name}
                </span>
              </div>

              {/* Spatial Status Layer Filter */}
              <div className={`flex items-center gap-1 p-0.5 rounded-lg border ${
                isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-slate-200 border-slate-300'
              }`}>
                <span className="text-[10px] font-bold text-slate-400 px-1.5 uppercase font-mono hidden sm:inline">
                  {isTh ? 'สถานะ:' : 'Layer:'}
                </span>
                <button
                  type="button"
                  onClick={() => setSpatialStatusFilter('all')}
                  className={`px-2 py-0.5 rounded text-[11px] font-bold transition-colors cursor-pointer ${
                    spatialStatusFilter === 'all' 
                      ? 'bg-blue-600 text-white' 
                      : (isDarkMode ? 'text-slate-400 hover:text-slate-200' : 'text-slate-600 hover:text-slate-900')
                  }`}
                >
                  {isTh ? 'ทั้งหมด' : 'All'}
                </button>
                <button
                  type="button"
                  onClick={() => setSpatialStatusFilter('ready')}
                  className={`px-2 py-0.5 rounded text-[11px] font-bold transition-colors cursor-pointer flex items-center gap-1 ${
                    spatialStatusFilter === 'ready' 
                      ? 'bg-emerald-600 text-white' 
                      : (isDarkMode ? 'text-emerald-400 hover:bg-slate-700' : 'text-emerald-600 hover:bg-slate-300')
                  }`}
                  title={isTh ? 'ส่งมอบแล้ว (Ready / Completed)' : 'Ready for Turnover'}
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  <span>{isTh ? 'ส่งมอบแล้ว' : 'Ready'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setSpatialStatusFilter('in_progress')}
                  className={`px-2 py-0.5 rounded text-[11px] font-bold transition-colors cursor-pointer flex items-center gap-1 ${
                    spatialStatusFilter === 'in_progress' 
                      ? 'bg-sky-600 text-white' 
                      : (isDarkMode ? 'text-sky-400 hover:bg-slate-700' : 'text-sky-600 hover:bg-slate-300')
                  }`}
                  title={isTh ? 'กำลังดำเนินการ (In Progress)' : 'In Progress'}
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-sky-400" />
                  <span>{isTh ? 'กำลังทำ' : 'In Progress'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setSpatialStatusFilter('cat_a')}
                  className={`px-2 py-0.5 rounded text-[11px] font-bold transition-colors cursor-pointer flex items-center gap-1 ${
                    spatialStatusFilter === 'cat_a' 
                      ? 'bg-red-600 text-white' 
                      : (isDarkMode ? 'text-red-400 hover:bg-slate-700' : 'text-red-600 hover:bg-slate-300')
                  }`}
                  title={isTh ? 'มีข้อบกพร่อง Cat A ค้าง' : 'Cat A Pending'}
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-ping" />
                  <span>{isTh ? 'Cat A ค้าง' : 'Cat A'}</span>
                </button>
              </div>

              {/* View & Layer Toggles + Theme Switcher */}
              <div className="flex items-center gap-2 flex-wrap">
                {/* CAD Theme Switcher */}
                <div className={`flex items-center p-0.5 rounded-lg border ${
                  isDarkMode 
                    ? 'bg-slate-950/80 border-slate-800' 
                    : 'bg-slate-200 border-slate-300'
                }`}>
                  <button
                    type="button"
                    onClick={() => {
                      setThemeMode('blueprint');
                      setGlobalThemeGate(true);
                    }}
                    className={`px-2 py-0.5 rounded text-[10px] font-bold flex items-center gap-1 transition-all cursor-pointer ${
                      isDarkMode 
                        ? 'bg-cyan-500 text-slate-950 shadow-xs' 
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                    title="Dark Blueprint mode"
                  >
                    <Moon size={11} />
                    <span>{isTh ? 'พิมพ์เขียว' : 'Dark Blueprint'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setThemeMode('cad');
                      setGlobalThemeGate(false);
                    }}
                    className={`px-2 py-0.5 rounded text-[10px] font-bold flex items-center gap-1 transition-all cursor-pointer ${
                      !isDarkMode 
                        ? 'bg-white text-slate-900 shadow-xs border border-slate-200' 
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                    title="Paper CAD mode"
                  >
                    <Sun size={11} />
                    <span>{isTh ? 'กระดาษ CAD' : 'Paper CAD'}</span>
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => setShowGrid(!showGrid)}
                  className={`px-2 py-1 rounded-lg text-xs font-bold border transition-colors cursor-pointer flex items-center gap-1 ${
                    showGrid 
                      ? 'bg-blue-600 text-white border-blue-500' 
                      : (isDarkMode ? 'bg-slate-800 text-slate-400 border-slate-700' : 'bg-white text-slate-600 border-slate-300')
                  }`}
                >
                  <LayoutGrid size={12} />
                  <span>Grid</span>
                </button>

                <button
                  type="button"
                  onClick={() => setShowUnitZones(!showUnitZones)}
                  className={`px-2 py-1 rounded-lg text-xs font-bold border transition-colors cursor-pointer flex items-center gap-1 ${
                    showUnitZones 
                      ? 'bg-emerald-600 text-white border-emerald-500' 
                      : (isDarkMode ? 'bg-slate-800 text-slate-400 border-slate-700' : 'bg-white text-slate-600 border-slate-300')
                  }`}
                >
                  <Building2 size={12} />
                  <span>Zones (L1)</span>
                </button>

                <button
                  type="button"
                  onClick={() => setFilterCriticalOnly(!filterCriticalOnly)}
                  className={`px-2 py-1 rounded-lg text-xs font-bold border transition-colors cursor-pointer flex items-center gap-1 ${
                    filterCriticalOnly 
                      ? 'bg-red-600 text-white border-red-500' 
                      : (isDarkMode ? 'bg-slate-800 text-slate-400 border-slate-700' : 'bg-white text-slate-600 border-slate-300')
                  }`}
                >
                  <span className="text-red-400 font-black">*</span>
                  <span>Critical Only</span>
                </button>

                {/* Zoom Controls */}
                <div className={`flex items-center rounded-lg border p-0.5 ${
                  isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-300'
                }`}>
                  <button
                    onClick={() => setZoomLevel(prev => Math.max(prev - 20, 100))}
                    className={`p-1 rounded cursor-pointer ${isDarkMode ? 'hover:bg-slate-700 text-slate-300' : 'hover:bg-slate-100 text-slate-600'}`}
                    title="Zoom Out (ขยายออก - ล็อคขนาดรูปไม่มีขอบดำ)"
                  >
                    <ZoomOut size={13} />
                  </button>
                  <span className={`px-1.5 font-mono text-[10px] min-w-[36px] text-center font-bold ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>{zoomLevel}%</span>
                  <button
                    onClick={() => setZoomLevel(prev => Math.min(prev + 20, 400))}
                    className={`p-1 rounded cursor-pointer ${isDarkMode ? 'hover:bg-slate-700 text-slate-300' : 'hover:bg-slate-100 text-slate-600'}`}
                    title="Zoom In (ซูมเข้าดูรายละเอียด หมุดขยายตามขนาดรูป)"
                  >
                    <ZoomIn size={13} />
                  </button>
                  <button
                    onClick={() => setZoomLevel(100)}
                    className={`p-1 rounded cursor-pointer border-l ${
                      isDarkMode ? 'hover:bg-slate-700 text-slate-400 border-slate-700' : 'hover:bg-slate-100 text-slate-400 border-slate-200'
                    }`}
                    title="Reset Zoom (100% Lock to Frame)"
                  >
                    <RotateCcw size={12} />
                  </button>
                  <button
                    onClick={() => setZoomLevel(100)}
                    className={`px-1.5 py-0.5 rounded cursor-pointer border-l text-[10px] font-bold ${
                      isDarkMode ? 'hover:bg-slate-700 text-slate-400 border-slate-700' : 'hover:bg-slate-100 text-slate-500 border-slate-200'
                    }`}
                    title="Lock Plot Plan to Screen (ล็อคขนาดตามรูปไม่มีขอบดำ)"
                  >
                    Fit
                  </button>
                </div>
              </div>
            </div>

            {/* Interactive Vector / Blueprint Canvas Scroll Wrapper */}
            <div 
              onWheel={handleWheel}
              className={`relative overflow-auto max-h-[620px] custom-scrollbar w-full transition-colors ${
              isDarkMode ? 'bg-[#0c1322]' : 'bg-[#f8fafc]'
            }`}>
              <div 
                ref={canvasRef}
                onClick={handleMapClick}
                className={`relative h-[560px] select-none ${
                  pinPlacementCandidate ? 'cursor-crosshair' : 'cursor-default'
                }`}
                style={{
                  width: zoomLevel > 100 ? `${zoomLevel}%` : '100%',
                  minWidth: '100%',
                  transform: `scale(${zoomLevel / 100})`,
                  transformOrigin: 'top left',
                  transition: 'transform 0.15s ease-out'
                }}
              >
              {/* Background Architectural Vector Grid Lines */}
              {showGrid && (
                <div className="absolute inset-0 pointer-events-none">
                  {/* Grid Coordinate Letters & Numbers */}
                  <div className={`absolute top-0 left-0 right-0 h-6 border-b flex text-[10px] font-mono font-bold ${
                    isDarkMode ? 'bg-slate-900/70 border-slate-800 text-slate-500' : 'bg-slate-200/80 border-slate-300 text-slate-700'
                  }`}>
                    {['A', 'B', 'C', 'D', 'E', 'F'].map((col) => (
                      <div key={col} className={`flex-1 flex items-center justify-center border-r ${
                        isDarkMode ? 'border-slate-800/80' : 'border-slate-300'
                      }`}>
                        GRID {col}
                      </div>
                    ))}
                  </div>

                  <div className={`absolute top-6 left-0 bottom-0 w-6 border-r flex flex-col text-[10px] font-mono font-bold ${
                    isDarkMode ? 'bg-slate-900/70 border-slate-800 text-slate-500' : 'bg-slate-200/80 border-slate-300 text-slate-700'
                  }`}>
                    {[1, 2, 3, 4, 5, 6, 7, 8].map((row) => (
                      <div key={row} className={`flex-1 flex items-center justify-center border-b ${
                        isDarkMode ? 'border-slate-800/80' : 'border-slate-300'
                      }`}>
                        {row}
                      </div>
                    ))}
                  </div>

                  {/* Faint blueprint vector grid */}
                  <div 
                    className="absolute inset-6 opacity-25"
                    style={{
                      backgroundImage: isDarkMode
                        ? 'radial-gradient(circle, #38bdf8 1.2px, transparent 1.2px), linear-gradient(to right, #1e293b 1px, transparent 1px), linear-gradient(to bottom, #1e293b 1px, transparent 1px)'
                        : 'radial-gradient(circle, #0284c7 1.2px, transparent 1.2px), linear-gradient(to right, #cbd5e1 1px, transparent 1px), linear-gradient(to bottom, #cbd5e1 1px, transparent 1px)',
                      backgroundSize: '20px 20px, 100px 100px, 100px 100px'
                    }}
                  />
                </div>
              )}

              {/* Authentic Master Plot Plan Drawing Background - object-cover with locked borders */}
              <img 
                src={currentPlan.customImageUrl || essoPlotPlanBg} 
                alt={currentPlan.name} 
                className={`absolute inset-6 w-[calc(100%-3rem)] h-[calc(100%-3rem)] object-cover pointer-events-none select-none transition-all duration-300 ${
                  isDarkMode 
                    ? 'filter invert hue-rotate-180 brightness-[0.78] contrast-[1.25] opacity-65' 
                    : 'opacity-85 mix-blend-multiply'
                }`}
              />

              {/* Plant Process Roadway Corridors */}
              <div className="absolute top-6 left-6 right-0 bottom-0 pointer-events-none opacity-40">
                {/* Horizontal Main Avenue */}
                <div className="absolute top-[48%] left-0 right-0 h-7 bg-slate-800/80 border-y border-dashed border-slate-600 flex items-center justify-center text-[9px] font-mono text-slate-400">
                  MAIN PROCESS CORRIDOR • ROADWAY 01
                </div>
                {/* Vertical Central Pipe Rack */}
                <div className="absolute top-0 bottom-0 left-[50%] w-8 bg-slate-800/80 border-x border-dashed border-slate-600 flex items-center justify-center [writing-mode:vertical-rl] text-[9px] font-mono text-slate-400">
                  INTER-BATTERY PIPE RACK CORRIDOR
                </div>
              </div>

              {/* UNIT ZONES (Polygons on Canvas) */}
              {showUnitZones && selectedPlant === 'Phra Khanong' && (
                <>
                  {/* ZONE A: Unit APS-1 (Atmospheric Distillation Block) */}
                  <div 
                    onClick={() => {
                      if (!pinPlacementCandidate) {
                        setSelectedMarkerId('map-1');
                      }
                    }}
                    className="absolute top-[12%] left-[12%] w-[35%] h-[34%] rounded-xl border-2 border-[#008b52] bg-[#008b52]/10 hover:bg-[#008b52]/20 transition-colors p-2.5 flex flex-col justify-between cursor-pointer group shadow-lg"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-full bg-[#008b52]" />
                        <span className="font-mono font-black text-white text-xs tracking-wider">
                          UNIT APS-1
                        </span>
                      </div>
                      <span className="text-[9px] font-mono px-2 py-0.5 rounded bg-[#008b52] text-white font-bold">
                        L1 UNIT
                      </span>
                    </div>

                    <div className="text-[10px] text-emerald-200">
                      Atmospheric Distillation • 18 Assets • 5 Critical Path (*)
                    </div>

                    <div className="flex items-center gap-1.5 text-[9px] font-mono text-emerald-300">
                      <span className="bg-black/40 px-1.5 py-0.5 rounded">GRID: B2-C3</span>
                      <span className="bg-black/40 px-1.5 py-0.5 rounded">AREA 10</span>
                    </div>
                  </div>

                  {/* ZONE B: Unit KHF-1 (Kerosene Hydrotreating Block) */}
                  <div 
                    onClick={() => {
                      if (!pinPlacementCandidate) {
                        setSelectedMarkerId('map-6');
                      }
                    }}
                    className="absolute top-[12%] right-[8%] w-[38%] h-[34%] rounded-xl border-2 border-[#ff6800] bg-[#ff6800]/10 hover:bg-[#ff6800]/20 transition-colors p-2.5 flex flex-col justify-between cursor-pointer group shadow-lg"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-full bg-[#ff6800]" />
                        <span className="font-mono font-black text-white text-xs tracking-wider">
                          UNIT KHF-1
                        </span>
                      </div>
                      <span className="text-[9px] font-mono px-2 py-0.5 rounded bg-[#ff6800] text-slate-950 font-bold">
                        L1 UNIT
                      </span>
                    </div>

                    <div className="text-[10px] text-amber-200">
                      Kerosene Hydrotreater • 14 Assets • 3 Critical Path (*)
                    </div>

                    <div className="flex items-center gap-1.5 text-[9px] font-mono text-amber-300">
                      <span className="bg-black/40 px-1.5 py-0.5 rounded">GRID: E2-F3</span>
                      <span className="bg-black/40 px-1.5 py-0.5 rounded">AREA 20/30</span>
                    </div>
                  </div>

                  {/* ZONE C: Tank Farm & Gantry (Storage) */}
                  <div className="absolute bottom-[8%] left-[12%] w-[35%] h-[34%] rounded-xl border border-dashed border-blue-500/60 bg-blue-950/20 p-2.5 flex flex-col justify-between">
                    <div className="flex items-center justify-between text-blue-300">
                      <span className="font-mono font-bold text-xs">STORAGE TANK FARM & LOGISTICS</span>
                      <span className="text-[9px] font-mono">ZONE C</span>
                    </div>
                    <div className="text-[10px] text-blue-400">
                      Crude Day Tanks TK-101 ~ TK-108 • Product Loading Gantry
                    </div>
                    <span className="text-[9px] font-mono text-slate-500">GRID: B5-C6</span>
                  </div>

                  {/* ZONE D: Utilities, Co-Gen & Flare Area */}
                  <div className="absolute bottom-[8%] right-[8%] w-[38%] h-[34%] rounded-xl border border-dashed border-purple-500/60 bg-purple-950/20 p-2.5 flex flex-col justify-between">
                    <div className="flex items-center justify-between text-purple-300">
                      <span className="font-mono font-bold text-xs">UTILITIES & BLOWDOWN FLARE</span>
                      <span className="text-[9px] font-mono">ZONE D</span>
                    </div>
                    <div className="text-[10px] text-purple-400">
                      Steam Boiler Block, Cooling Towers & LP Ground Flare
                    </div>
                    <span className="text-[9px] font-mono text-slate-500">GRID: E5-F6</span>
                  </div>
                </>
              )}

              {/* UNIT ZONES (Polygons for Si Racha Complex) */}
              {showUnitZones && selectedPlant === 'Sriracha' && (
                <>
                  {/* ZONE SR-A: Unit VPS-2 (Vacuum Distillation Block) */}
                  <div 
                    onClick={() => {
                      if (!pinPlacementCandidate) {
                        setSelectedMarkerId('map-sr-vps2');
                      }
                    }}
                    className="absolute top-[12%] left-[10%] w-[42%] h-[36%] rounded-xl border-2 border-[#ff6800] bg-[#ff6800]/10 hover:bg-[#ff6800]/20 transition-colors p-2.5 flex flex-col justify-between cursor-pointer group shadow-lg"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-full bg-[#ff6800]" />
                        <span className="font-mono font-black text-white text-xs tracking-wider">
                          UNIT VPS-2 (SRIRACHA)
                        </span>
                      </div>
                      <span className="text-[9px] font-mono px-2 py-0.5 rounded bg-[#ff6800] text-slate-950 font-bold">
                        L1 UNIT
                      </span>
                    </div>

                    <div className="text-[10px] text-amber-200">
                      Vacuum Tower S2-COL-201 • Vacuum Furnace S2-VF-201 • Residue Pumps
                    </div>

                    <div className="flex items-center gap-1.5 text-[9px] font-mono text-amber-300">
                      <span className="bg-black/40 px-1.5 py-0.5 rounded">GRID: B2-D3</span>
                      <span className="bg-black/40 px-1.5 py-0.5 rounded">ZONE VACUUM</span>
                    </div>
                  </div>

                  {/* ZONE SR-B: Marine Offloading Jetty */}
                  <div className="absolute top-[12%] right-[8%] w-[36%] h-[36%] rounded-xl border-2 border-cyan-500/70 bg-cyan-950/20 p-2.5 flex flex-col justify-between">
                    <div className="flex items-center justify-between text-cyan-300">
                      <div className="flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-full bg-cyan-400" />
                        <span className="font-mono font-bold text-xs">VLCC MARINE LOADING TERMINAL</span>
                      </div>
                      <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-cyan-600 text-white font-bold">JETTY 1-3</span>
                    </div>
                    <div className="text-[10px] text-cyan-200">
                      Offshore Marine Berthing • Crude Unloading Arms • Bunker Docks
                    </div>
                    <span className="text-[9px] font-mono text-slate-400">GRID: E2-F3</span>
                  </div>

                  {/* ZONE SR-C: Crude & Bitumen Tankage */}
                  <div className="absolute bottom-[8%] left-[10%] w-[42%] h-[34%] rounded-xl border border-dashed border-blue-500/60 bg-blue-950/20 p-2.5 flex flex-col justify-between">
                    <div className="flex items-center justify-between text-blue-300">
                      <span className="font-mono font-bold text-xs">SRIRACHA TANK FARM & ASPHALT</span>
                      <span className="text-[9px] font-mono">ZONE SR-TK</span>
                    </div>
                    <div className="text-[10px] text-blue-300">
                      Crude Storage TK-201 ~ 212 • Bitumen Rail & Truck Gantry
                    </div>
                    <span className="text-[9px] font-mono text-slate-500">GRID: B5-D6</span>
                  </div>

                  {/* ZONE SR-D: Sulfur Recovery & Co-Gen */}
                  <div className="absolute bottom-[8%] right-[8%] w-[36%] h-[34%] rounded-xl border border-dashed border-purple-500/60 bg-purple-950/20 p-2.5 flex flex-col justify-between">
                    <div className="flex items-center justify-between text-purple-300">
                      <span className="font-mono font-bold text-xs">CO-GEN & ACID GAS FLARE</span>
                      <span className="text-[9px] font-mono">ZONE SR-UT</span>
                    </div>
                    <div className="text-[10px] text-purple-300">
                      High Efficiency Gas Turbine • SRU Train & Enclosed Flare Stack
                    </div>
                    <span className="text-[9px] font-mono text-slate-500">GRID: E5-F6</span>
                  </div>
                </>
              )}

              {/* MAPPED EQUIPMENT PINS */}
              {showMarkers && visibleMarkers.map((marker) => {
                const isSelected = selectedMarker?.id === marker.id;

                // Color based on Level and Highlights
                let pinBg = 'bg-blue-600 text-white';
                if (marker.level === 1) pinBg = 'bg-[#008b52] text-white';
                else if (marker.level === 2) pinBg = 'bg-[#ff6800] text-slate-950';
                else if (marker.highlight === 'EWR') pinBg = 'bg-yellow-400 text-yellow-950';
                else if (marker.highlight === 'Project') pinBg = 'bg-emerald-400 text-emerald-950';

                return (
                  <div
                    key={marker.id}
                    onClick={(e) => {
                      e.stopPropagation();
                      if (!pinPlacementCandidate) {
                        setSelectedMarkerId(marker.id);
                      }
                    }}
                    style={{ left: `${marker.x}%`, top: `${marker.y}%` }}
                    className={`absolute -translate-x-1/2 -translate-y-1/2 z-20 cursor-pointer group transition-transform ${
                      isSelected ? 'scale-125 z-30' : 'hover:scale-115'
                    }`}
                  >
                    {/* Pulsing ring for Critical Path or Selected */}
                    {marker.isCriticalPath && (
                      <span className="absolute -inset-2 rounded-full bg-red-500 opacity-60 animate-ping" />
                    )}
                    {isSelected && !marker.isCriticalPath && (
                      <span className="absolute -inset-2 rounded-full bg-blue-500 opacity-60 animate-pulse" />
                    )}

                    {/* Pin Marker Badge */}
                    <div className={`px-2 py-1 rounded-lg shadow-xl font-mono text-[10px] font-black flex items-center gap-1 border border-white/30 backdrop-blur-xs ${pinBg}`}>
                      <MapPin size={11} className="shrink-0" />
                      <span>{marker.tag}</span>
                      {marker.isCriticalPath && (
                        <span className="text-red-600 bg-white font-black px-1 rounded text-[9px]" title="Critical Path Asset">
                          *
                        </span>
                      )}
                      {marker.hasCatAPunch && (
                        <span className="bg-red-600 text-white font-mono px-1 rounded text-[8px] font-black animate-pulse shadow-sm" title="Category A Punch List Pending">
                          CAT A
                        </span>
                      )}
                      {marker.status === 'Completed' && (
                        <Check size={10} className="text-emerald-300 stroke-[3]" />
                      )}
                    </div>

                    {/* Hover Floating Tooltip */}
                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 hidden group-hover:flex flex-col bg-slate-900 text-white p-2 rounded-lg shadow-2xl border border-slate-700 text-[10px] whitespace-nowrap pointer-events-none z-40">
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold font-mono text-emerald-400">{marker.tag}</span>
                        {marker.hasCatAPunch && (
                          <span className="px-1 py-0.2 rounded bg-red-600 text-white font-mono text-[8px] font-black">
                            CAT A PENDING
                          </span>
                        )}
                        <span className="text-slate-400 text-[9px] font-mono">({marker.status})</span>
                      </div>
                      <div className="text-slate-300">{marker.description}</div>
                      <div className="text-slate-400 mt-0.5">
                        {marker.unitName} • {marker.systemName} • <span className="text-amber-400 font-mono">[{marker.gridZone}]</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            </div>
          </div>

          {/* 5. Selected Asset Spatial Inspector Card */}
          {selectedMarker ? (
            <div className="bg-white dark:bg-slate-900 rounded-2xl border-2 border-indigo-200 dark:border-indigo-900 shadow-md p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 animate-in fade-in">
              <div className="space-y-1.5 flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="px-2 py-0.5 rounded bg-indigo-600 text-white font-mono text-[10px] font-bold">
                    L{selectedMarker.level} {selectedMarker.levelType.toUpperCase()}
                  </span>
                  <span className="px-2 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 font-mono text-[10px] font-bold flex items-center gap-1">
                    <MapPin size={10} />
                    <span>GRID {selectedMarker.gridZone} (X: {selectedMarker.x}%, Y: {selectedMarker.y}%)</span>
                  </span>
                  {selectedMarker.isCriticalPath && (
                    <span className="px-2 py-0.5 rounded bg-red-600 text-white font-mono text-[10px] font-black flex items-center gap-1">
                      <span>* CRITICAL PATH GATE</span>
                    </span>
                  )}
                  {selectedMarker.hasCatAPunch && (
                    <span className="px-2 py-0.5 rounded bg-red-600 text-white font-mono text-[10px] font-black flex items-center gap-1 animate-pulse">
                      <AlertTriangle size={10} />
                      <span>CAT A PUNCH PENDING</span>
                    </span>
                  )}
                  <span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-mono text-[10px] font-bold">
                    Plant: {selectedMarker.plant || 'Phra Khanong'}
                  </span>
                  {selectedMarker.highlight && selectedMarker.highlight !== 'none' && (
                    <span className={`px-2 py-0.5 rounded font-mono text-[10px] font-bold ${
                      selectedMarker.highlight === 'EWR' ? 'bg-yellow-300 text-yellow-950' : 'bg-emerald-300 text-emerald-950'
                    }`}>
                      SCOPE: {selectedMarker.highlight}
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <h3 className="text-base sm:text-lg font-black font-mono text-slate-900 dark:text-slate-100 truncate">
                    {selectedMarker.tag}
                  </h3>
                  {selectedMarker.refCode && (
                    <span className="text-xs font-mono font-bold text-slate-500 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded">
                      Ref: {selectedMarker.refCode}
                    </span>
                  )}
                </div>

                <p className="text-xs text-slate-600 dark:text-slate-300">
                  {selectedMarker.description}
                </p>

                <div className="text-[11px] text-slate-400 font-mono flex items-center gap-2">
                  <span>Unit: <strong className="text-slate-700 dark:text-slate-300">{selectedMarker.unitName}</strong></span>
                  <span>•</span>
                  <span>System: <strong className="text-slate-700 dark:text-slate-300">{selectedMarker.systemName}</strong></span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2 shrink-0 self-start md:self-center">
                {onNavigateToFunctionalLocation && (
                  <button
                    type="button"
                    onClick={() => onNavigateToFunctionalLocation(selectedMarker.nodeId)}
                    className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm cursor-pointer"
                    title="Jump to this exact node in the Functional Location Tree"
                  >
                    <FolderTree size={14} />
                    <span>{isTh ? 'เปิดในผังต้นไม้' : 'Open in Tree'}</span>
                    <ArrowRight size={13} />
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => {
                    const candidate = flatHierarchyAssets.find(a => a.nodeId === selectedMarker.nodeId);
                    if (candidate) {
                      setPinPlacementCandidate(candidate);
                    }
                  }}
                  className="px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 font-bold text-xs flex items-center gap-1 cursor-pointer"
                  title="Reposition Pin on Blueprint"
                >
                  <Crosshair size={13} />
                  <span>{isTh ? 'ย้ายพิกัด' : 'Reposition'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleDeleteMarker(selectedMarker.id)}
                  className="p-2 rounded-xl border border-red-200 dark:border-red-900/60 text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 cursor-pointer"
                  title="Unmap / Remove from Plot Plan"
                >
                  <Trash2 size={15} />
                </button>
              </div>
            </div>
          ) : (
            <div className="p-4 rounded-xl border border-dashed border-slate-300 dark:border-slate-800 text-center text-slate-400 text-xs">
              {isTh 
                ? 'คลิกเลือกอุปกรณ์บนผังแบบแปลนหรือจากรายการด้านซ้าย เพื่อตรวจสอบข้อมูลตำแหน่งและข้ามไปยังผังโครงสร้างต้นไม้' 
                : 'Click any equipment pin on the blueprint or select from the left hierarchy to inspect spatial coordinates and navigate to the tree.'}
            </div>
          )}
        </div>
      </div>

      {/* 6. Modal: Create New Master Plot Plan */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-xl w-full border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95">
            <div className="p-4 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800">
              <div className="flex items-center gap-2">
                <MapPin size={18} className="text-blue-400" />
                <h3 className="font-bold text-sm">
                  {isTh ? 'สร้างผังแบบแปลนแม่บทใหม่ (New Master Plot Plan)' : 'Create New Master Plot Plan'}
                </h3>
              </div>
              <button 
                onClick={() => setIsCreateModalOpen(false)}
                className="text-slate-400 hover:text-white cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-5 space-y-4 text-xs">
              <div className="space-y-1.5">
                <label className="font-bold text-slate-700 dark:text-slate-300">
                  {isTh ? 'ชื่อแบบแปลนพื้นที่ (Location / Plot Plan Name)' : 'Location / Plot Plan Name'}
                </label>
                <input
                  type="text"
                  value={newPlanName}
                  onChange={(e) => setNewPlanName(e.target.value)}
                  placeholder="e.g. Boiler & Cogen Area • Area 40 CAD Blueprint"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="font-bold text-slate-700 dark:text-slate-300">
                    {isTh ? 'โซน / Grid (Plant Zone)' : 'Plant Zone / Battery Grid'}
                  </label>
                  <input
                    type="text"
                    value={newPlanZone}
                    onChange={(e) => setNewPlanZone(e.target.value)}
                    placeholder="e.g. Zone D - North East"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="font-bold text-slate-700 dark:text-slate-300">
                    {isTh ? 'ยูนิตที่เชื่อมโยง (Linked Unit)' : 'Linked Hierarchy Unit'}
                  </label>
                  <select
                    value={newPlanUnitId}
                    onChange={(e) => setNewPlanUnitId(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none cursor-pointer"
                  >
                    {S2_TURNOVER_HIERARCHY.map(u => (
                      <option key={u.id} value={u.id}>
                        {u.name} - {u.fullName}
                      </option>
                    ))}
                    <option value="all">Overall Plant Complex (All Units)</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="font-bold text-slate-700 dark:text-slate-300">
                  {isTh ? 'อัปโหลดรูปภาพแบบแปลน CAD หรือผังความละเอียดสูง' : 'Upload High-Resolution CAD Blueprint (Optional)'}
                </label>
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-xl p-6 text-center bg-slate-50 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer flex flex-col items-center justify-center min-h-[140px]"
                >
                  {newPlanImageUrl ? (
                    <div className="space-y-1">
                      <CheckCircle2 size={32} className="text-emerald-500 mx-auto" />
                      <div className="font-bold text-slate-700 dark:text-slate-200 text-xs">Blueprint Image Loaded</div>
                      <div className="text-[10px] text-slate-400">Click to replace image</div>
                    </div>
                  ) : (
                    <div className="space-y-1">
                      <UploadCloud size={32} className="text-slate-400 mx-auto" />
                      <div className="font-bold text-slate-700 dark:text-slate-300 text-xs">Click to upload blueprint file</div>
                      <div className="text-[10px] text-slate-400">PNG, JPG, SVG CAD drawings up to 15MB</div>
                    </div>
                  )}
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileUpload}
                    className="hidden"
                    accept="image/*"
                  />
                </div>
              </div>
            </div>

            <div className="p-4 bg-slate-50 dark:bg-slate-800/60 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setIsCreateModalOpen(false)}
                className="px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveNewPlan}
                disabled={!newPlanName || !newPlanZone}
                className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-md shadow-blue-900/30 flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
              >
                <Save size={14} />
                <span>Save Master Plan</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
