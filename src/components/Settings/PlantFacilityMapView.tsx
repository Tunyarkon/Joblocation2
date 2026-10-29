import React, { useState, useMemo, useRef, useEffect } from 'react';
import { 
  Compass, ZoomIn, ZoomOut, RotateCcw, Maximize2, Minimize2, 
  Layers, Search, Sliders, Eye, EyeOff, Building2, Tag, 
  ShieldAlert, Sparkles, Plus, Edit2, Trash2, X, ExternalLink,
  ChevronRight, MapPin, CheckCircle2, AlertOctagon, Sun, Moon,
  FileCode, CornerDownRight, Activity, Upload, Check, AlertTriangle,
  Flame, Wrench, Shield, Navigation
} from 'lucide-react';
import { 
  FunctionalLocation, 
  PlantId, 
  PLANT_REGISTRY,
  CriticalityLevel 
} from '../../data/flocMasterData';
import { useLanguage } from '../../context/LanguageContext';
import { useThemeGate } from '../../utils/themeGate';
import ImportPlotPlanModal, { ENGINEERING_PRESETS } from './ImportPlotPlanModal';
import FlocModal from './FlocModal';
import essoPlotPlanBg from '../../assets/esso_sriracha_master_plotplan.jpg';
import bcpPlotPlanBg from '../../assets/BG_BCP.jpg';

interface PlantFacilityMapViewProps {
  flocList: FunctionalLocation[];
  onAddFloc: (floc: FunctionalLocation) => void;
  onUpdateFloc: (floc: FunctionalLocation) => void;
  onDeleteFloc: (id: string) => void;
  initialSelectedId?: string;
  onNavigateToWorkspace?: (jobId?: string) => void;
  onNavigateToMasterPlotPlan?: (nodeId?: string) => void;
}

const STORAGE_KEY_MAP_PREFS = 'plantturn_facility_map_prefs_v2';

export default function PlantFacilityMapView({
  flocList,
  onAddFloc,
  onUpdateFloc,
  onDeleteFloc,
  initialSelectedId,
  onNavigateToWorkspace,
  onNavigateToMasterPlotPlan
}: PlantFacilityMapViewProps) {
  const { isTh } = useLanguage();

  // Load persisted preferences
  const savedPrefs = useMemo(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_MAP_PREFS);
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.warn('Failed to load map prefs', e);
    }
    return null;
  }, []);

  // 1. Plant Selector State
  const [selectedPlant, setSelectedPlant] = useState<PlantId>('sr');

  // 2. Dual Perspective Modes ('plot_plan' | 'regional_gis')
  const [perspective, setPerspective] = useState<'plot_plan' | 'regional_gis'>(
    savedPrefs?.perspective || 'plot_plan'
  );

  // 3. Plot View Style ('cad_blueprint' | 'zone_cards')
  const [plotViewStyle, setPlotViewStyle] = useState<'cad_blueprint' | 'zone_cards'>(
    savedPrefs?.plotViewStyle || 'cad_blueprint'
  );

  // 4. CAD Paper Mode Switcher ('paper' | 'dark') linked with Global Theme Gate
  const [gateIsDark, setGlobalThemeGate] = useThemeGate();
  const [cadPaperMode, setCadPaperMode] = useState<'paper' | 'dark'>(
    gateIsDark ? 'dark' : 'paper'
  );
  useEffect(() => {
    setCadPaperMode(gateIsDark ? 'dark' : 'paper');
  }, [gateIsDark]);

  // 6. Backdrop & Opacity Calibration
  const [drawingOpacity, setDrawingOpacity] = useState<number>(
    savedPrefs?.drawingOpacity ?? 85
  );
  const [showBackdrop, setShowBackdrop] = useState<boolean>(
    savedPrefs?.showBackdrop ?? true
  );
  const [isOpacityMenuOpen, setIsOpacityMenuOpen] = useState(false);
  const [activeDrawingPreset, setActiveDrawingPreset] = useState<string>('esso-sriracha-master');
  const [customDrawingUrl, setCustomDrawingUrl] = useState<string | null>(null);

  // 7. Interactive Zoom Engine (60% - 280%, steps of 25%)
  const [zoomLevel, setZoomLevel] = useState<number>(100);
  const [panOffset, setPanOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isFullscreen, setIsFullscreen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // 8. Filters & Live Search
  const [searchQuery, setSearchQuery] = useState('');
  const [criticalityFilter, setCriticalityFilter] = useState<'all' | 'A' | 'B' | 'C'>('all');

  // 9. Selected Pin & Inspector Drawer
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(initialSelectedId || 'floc-sr-eq-e204');
  const [isInspectorOpen, setIsInspectorOpen] = useState(true);

  // Toast Notification
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Modals
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isFlocModalOpen, setIsFlocModalOpen] = useState(false);
  const [editingFloc, setEditingFloc] = useState<FunctionalLocation | null>(null);
  const [parentPreset, setParentPreset] = useState<any>(null);

  // Persist preferences on changes
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_MAP_PREFS, JSON.stringify({
        perspective,
        plotViewStyle,
        cadPaperMode,
        drawingOpacity,
        showBackdrop
      }));
    } catch (e) {
      console.warn('Failed to save map prefs', e);
    }
  }, [perspective, plotViewStyle, cadPaperMode, drawingOpacity, showBackdrop]);

  // Sync selectedNodeId if initialSelectedId changes
  useEffect(() => {
    if (initialSelectedId) {
      setSelectedNodeId(initialSelectedId);
      setIsInspectorOpen(true);
      const target = flocList.find(f => f.id === initialSelectedId);
      if (target) {
        setSelectedPlant(target.plantId);
      }
    }
  }, [initialSelectedId, flocList]);

  // Current Plant Meta
  const plantMeta = PLANT_REGISTRY[selectedPlant];

  // Plant Switching Handler
  const handleSelectPlant = (plantId: PlantId) => {
    setSelectedPlant(plantId);
    setSelectedNodeId(null); // Reset selection as specified in logic
  };

  // Deterministic Fallback Coordinates calculation for pins
  const getPinCoordinates = (node: FunctionalLocation, index: number) => {
    if (node.xPercent !== undefined && node.yPercent !== undefined) {
      return { x: node.xPercent, y: node.yPercent };
    }
    // Calculate deterministic spatial position in available unit grid
    const hash = node.id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const col = (index % 6) + 1;
    const row = Math.floor(index / 6) + 1;
    const x = Math.min(85, Math.max(18, 30 + ((hash % 8) * 4) + (col * 3.5)));
    const y = Math.min(85, Math.max(22, 35 + ((hash % 6) * 5) + (row * 4.2)));
    return { x, y };
  };

  // Plant Pins for current selected plant
  const currentPlantNodes = useMemo(() => {
    return flocList.filter(f => f.plantId === selectedPlant);
  }, [flocList, selectedPlant]);

  const equipmentPins = useMemo(() => {
    return currentPlantNodes.filter(f => f.level === 'Equipment');
  }, [currentPlantNodes]);

  // Selected Node Object
  const selectedNode = useMemo(() => {
    return flocList.find(f => f.id === selectedNodeId) || null;
  }, [flocList, selectedNodeId]);

  // Hierarchy Path Breadcrumb for Selected Node
  const hierarchyPath = useMemo(() => {
    if (!selectedNode) return [];
    const path: FunctionalLocation[] = [selectedNode];
    let curr = selectedNode;
    while (curr.parentId) {
      const parent = flocList.find(f => f.id === curr.parentId);
      if (parent) {
        path.unshift(parent);
        curr = parent;
      } else {
        break;
      }
    }
    return path;
  }, [selectedNode, flocList]);

  // Zoom Handlers (steps of 25%, min 60%, max 280%)
  const handleZoomIn = () => setZoomLevel(prev => Math.min(280, prev + 25));
  const handleZoomOut = () => setZoomLevel(prev => Math.max(60, prev - 25));
  const handleResetZoom = () => {
    setZoomLevel(100);
    setPanOffset({ x: 0, y: 0 });
  };

  // Pan / Drag Handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('.interactive-pin') || (e.target as HTMLElement).closest('button')) return;
    setIsDragging(true);
    setDragStart({ x: e.clientX - panOffset.x, y: e.clientY - panOffset.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    setPanOffset({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y
    });
  };

  const handleMouseUp = () => setIsDragging(false);

  // Fullscreen toggle
  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!isFullscreen) {
      if (containerRef.current.requestFullscreen) {
        containerRef.current.requestFullscreen();
      }
      setIsFullscreen(true);
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      }
      setIsFullscreen(false);
    }
  };

  // Node CRUD Actions
  const handleEditNode = (node: FunctionalLocation) => {
    setEditingFloc(node);
    setParentPreset(null);
    setIsFlocModalOpen(true);
  };

  const handleAddChildNode = (parent: FunctionalLocation) => {
    setEditingFloc(null);
    setParentPreset({
      parentId: parent.id,
      plantId: parent.plantId,
      level: parent.level === 'Area' ? 'System' : 'Equipment'
    });
    setIsFlocModalOpen(true);
  };

  const handleDeleteNode = (id: string, name: string) => {
    if (window.confirm(isTh 
      ? `คุณต้องการลบตำแหน่ง "${name}" ออกจากผัง CAD ใช่หรือไม่?` 
      : `Are you sure you want to remove "${name}" from CAD map?`)) {
      onDeleteFloc(id);
      if (selectedNodeId === id) {
        setSelectedNodeId(null);
      }
    }
  };

  // Preset Applied Handler
  const handleApplyPreset = (presetKey: string, opacity: number, customUrl?: string) => {
    setActiveDrawingPreset(presetKey);
    setDrawingOpacity(opacity);
    if (customUrl) {
      setCustomDrawingUrl(customUrl);
    }
    const preset = ENGINEERING_PRESETS.find(p => p.id === presetKey);
    setToastMessage(
      isTh
        ? `✓ ปรับใช้ผังพิมพ์เขียวสำหรับ ${plantMeta.nameTh.split(' ')[0]} เรียบร้อยแล้ว!`
        : `✓ Plot plan layout successfully applied for ${preset?.title || plantMeta.nameEn}!`
    );
    setTimeout(() => setToastMessage(null), 6000);
  };

  // Background Image Resolution
  const backgroundImageUrl = useMemo(() => {
    if (customDrawingUrl) return customDrawingUrl;
    if (selectedPlant === 'sr') return essoPlotPlanBg;
    if (selectedPlant === 'pk') return bcpPlotPlanBg;
    return essoPlotPlanBg;
  }, [customDrawingUrl, selectedPlant]);

  // Zone Matrix Grouping (for 'zone_cards' view)
  const zoneMatrixGroups = useMemo(() => {
    const areas = currentPlantNodes.filter(n => n.level === 'Area');
    return areas.map(area => {
      const systems = currentPlantNodes.filter(s => s.level === 'System' && s.parentId === area.id);
      const systemsWithEq = systems.map(sys => {
        const eq = currentPlantNodes.filter(e => e.level === 'Equipment' && e.parentId === sys.id);
        return { system: sys, equipment: eq };
      });
      return { area, systemsWithEq };
    });
  }, [currentPlantNodes]);

  return (
    <div 
      ref={containerRef}
      className={`relative flex flex-col rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-900 shadow-2xl overflow-hidden select-none transition-all ${
        isFullscreen ? 'fixed inset-0 z-50 rounded-none h-screen w-screen' : 'h-[800px] w-full'
      }`}
    >
      {/* =====================================================================
          TOP NOTIFICATION BANNER (TOAST BANNER)
         ===================================================================== */}
      {toastMessage && (
        <div className="z-30 px-4 py-2.5 bg-emerald-950/95 border-b border-emerald-500/50 text-emerald-200 text-xs flex items-center justify-between shadow-lg animate-in fade-in duration-200">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 size={16} className="text-emerald-400 shrink-0" />
            <span className="font-semibold">{toastMessage}</span>
          </div>
          <button
            type="button"
            onClick={() => setToastMessage(null)}
            className="p-1 text-emerald-400 hover:text-white rounded-lg hover:bg-emerald-800/40 cursor-pointer"
          >
            <X size={14} />
          </button>
        </div>
      )}

      {/* =====================================================================
          1. TOP COMMAND TOOLBAR
         ===================================================================== */}
      <div className="z-20 px-4 py-2.5 bg-slate-900/95 backdrop-blur-md border-b border-slate-800 flex flex-wrap items-center justify-between gap-3 text-white text-xs shrink-0">
        {/* Left: Plant Switcher with registered FLOC badge count */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1.5 text-slate-400 font-semibold text-xs mr-1">
            <Building2 size={15} className="text-teal-400" />
            <span>{isTh ? 'โรงงาน:' : 'Plant:'}</span>
          </div>

          <div className="flex items-center bg-slate-800/90 p-0.5 rounded-xl border border-slate-700/80">
            {Object.values(PLANT_REGISTRY).map(p => {
              const count = flocList.filter(f => f.plantId === p.id).length;
              const isSelected = selectedPlant === p.id;
              const displayName = p.id === 'sr' ? 'Si Racha' : p.id === 'pk' ? 'Phra Khanong' : 'Bangchak';
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => handleSelectPlant(p.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                    isSelected
                      ? 'bg-teal-600 text-white shadow-xs'
                      : 'text-slate-400 hover:text-white hover:bg-slate-700/60'
                  }`}
                >
                  <span>{displayName}</span>
                  <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono font-bold ${
                    isSelected ? 'bg-teal-700 text-teal-100' : 'bg-slate-700 text-slate-300'
                  }`}>
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Right Controls: Import Plot Plan, Perspective Switcher, Search, Add Node */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Import Plot Plan button */}
          <button
            type="button"
            onClick={() => setIsImportModalOpen(true)}
            className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-teal-700 to-cyan-600 hover:from-teal-600 hover:to-cyan-500 text-white font-bold text-xs shadow-md shadow-teal-900/40 transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <Upload size={14} />
            <span>{isTh ? 'นำเข้าผัง CAD' : 'Import Plot Plan'}</span>
          </button>

          {/* Perspective Switcher: Unit Plot Plan | Regional GIS */}
          <div className="flex items-center bg-slate-800/90 p-0.5 rounded-xl border border-slate-700">
            <button
              type="button"
              onClick={() => setPerspective('plot_plan')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                perspective === 'plot_plan' ? 'bg-cyan-600 text-white shadow-xs' : 'text-slate-400 hover:text-white'
              }`}
            >
              <Compass size={14} className={perspective === 'plot_plan' ? 'text-white' : 'text-cyan-400'} />
              <span>Unit Plot Plan</span>
            </button>
            <button
              type="button"
              onClick={() => setPerspective('regional_gis')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                perspective === 'regional_gis' ? 'bg-teal-600 text-white shadow-xs' : 'text-slate-400 hover:text-white'
              }`}
            >
              <MapPin size={14} className={perspective === 'regional_gis' ? 'text-white' : 'text-teal-400'} />
              <span>Regional GIS</span>
            </button>
          </div>

          {/* Live Search Input */}
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={isTh ? 'ค้นหา Tag หรือ FLOC...' : 'Find tag or FLOC...'}
              className="w-36 sm:w-48 pl-8 pr-7 py-1.5 bg-slate-800/90 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-400 focus:outline-none focus:border-cyan-500 font-mono"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white cursor-pointer"
              >
                <X size={13} />
              </button>
            )}
          </div>

          {/* Add Node Button */}
          <button
            type="button"
            onClick={() => {
              setEditingFloc(null);
              setParentPreset({ parentId: '', plantId: selectedPlant, level: 'Equipment' });
              setIsFlocModalOpen(true);
            }}
            className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-bold transition-all flex items-center gap-1 cursor-pointer"
          >
            <Plus size={14} className="text-emerald-400" />
            <span>{isTh ? '+ เพิ่มโหนด' : '+ Add Node'}</span>
          </button>
        </div>
      </div>

      {/* =====================================================================
          2. SUB-BAR CALIBRATION & TOOLBAR
         ===================================================================== */}
      <div className="z-10 px-4 py-2 bg-slate-950/85 backdrop-blur-md border-b border-slate-800 flex flex-wrap items-center justify-between gap-3 text-white text-xs">
        {/* Left: Drawing Pill, Paper Theme, View Style, Backdrop & Opacity */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Drawing Information Pill */}
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-900 border border-slate-700 font-mono text-[11px] text-slate-300">
            <Compass size={13} className="text-cyan-400" />
            <span className="font-bold text-white">Drawing: {plantMeta.drawingRef}</span>
            <span className="text-slate-500">|</span>
            <span className="text-emerald-400 font-semibold">{zoomLevel}%</span>
          </div>

          {/* CAD Paper Mode Switcher: Paper CAD | Dark Blueprint */}
          <div className="flex items-center bg-slate-900 p-0.5 rounded-xl border border-slate-700">
            <button
              type="button"
              onClick={() => {
                setCadPaperMode('paper');
                setGlobalThemeGate(false);
              }}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all flex items-center gap-1 cursor-pointer ${
                cadPaperMode === 'paper' ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40' : 'text-slate-400 hover:text-white'
              }`}
            >
              <Sun size={13} className="text-amber-400" />
              <span>Paper CAD</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setCadPaperMode('dark');
                setGlobalThemeGate(true);
              }}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all flex items-center gap-1 cursor-pointer ${
                cadPaperMode === 'dark' ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40' : 'text-slate-400 hover:text-white'
              }`}
            >
              <Moon size={13} className="text-cyan-400" />
              <span>Dark Blueprint</span>
            </button>
          </div>

          {/* Plot View Style: CAD Stage | Zone Cards */}
          <div className="flex items-center bg-slate-900 p-0.5 rounded-xl border border-slate-700">
            <button
              type="button"
              onClick={() => setPlotViewStyle('cad_blueprint')}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all flex items-center gap-1 cursor-pointer ${
                plotViewStyle === 'cad_blueprint' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-400 hover:text-white'
              }`}
            >
              <FileCode size={13} />
              <span>CAD Stage</span>
            </button>
            <button
              type="button"
              onClick={() => setPlotViewStyle('zone_cards')}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all flex items-center gap-1 cursor-pointer ${
                plotViewStyle === 'zone_cards' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-400 hover:text-white'
              }`}
            >
              <Layers size={13} />
              <span>Zone Cards</span>
            </button>
          </div>

          {/* Backdrop Visibility & Opacity Popover */}
          <div className="relative flex items-center gap-1 bg-slate-900 p-1 rounded-xl border border-slate-700">
            <button
              type="button"
              onClick={() => setShowBackdrop(!showBackdrop)}
              className={`px-2 py-1 rounded-lg text-[11px] font-semibold flex items-center gap-1 cursor-pointer transition-colors ${
                showBackdrop ? 'text-emerald-400 hover:bg-slate-800' : 'text-slate-500 hover:bg-slate-800'
              }`}
              title={showBackdrop ? 'Backdrop Visible' : 'Backdrop Hidden'}
            >
              {showBackdrop ? <Eye size={13} /> : <EyeOff size={13} />}
              <span>{showBackdrop ? 'Visible' : 'Hidden'}</span>
            </button>

            <button
              type="button"
              onClick={() => setIsOpacityMenuOpen(!isOpacityMenuOpen)}
              className="px-2 py-1 rounded-lg text-[11px] font-semibold text-slate-300 hover:text-white hover:bg-slate-800 flex items-center gap-1 cursor-pointer"
            >
              <Sliders size={13} className="text-slate-400" />
              <span>Opacity ▼</span>
            </button>

            {/* Opacity Dropdown Popover */}
            {isOpacityMenuOpen && (
              <div className="absolute top-full left-0 mt-2 w-56 p-3.5 rounded-2xl bg-slate-900 border border-slate-700 shadow-2xl z-40 space-y-2.5 animate-in fade-in duration-150">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-slate-300">CAD Line Opacity</span>
                  <span className="font-mono text-cyan-400 font-bold">{drawingOpacity}%</span>
                </div>
                <input
                  type="range"
                  min="15"
                  max="100"
                  value={drawingOpacity}
                  onChange={(e) => setDrawingOpacity(parseInt(e.target.value))}
                  className="w-full h-1.5 bg-slate-700 rounded-lg appearance-none accent-cyan-500 cursor-pointer"
                />
                <div className="flex items-center justify-between pt-1">
                  <button
                    type="button"
                    onClick={() => { setDrawingOpacity(85); setIsOpacityMenuOpen(false); }}
                    className="text-[10px] text-slate-400 hover:text-white cursor-pointer"
                  >
                    Reset Plan (85%)
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsOpacityMenuOpen(false)}
                    className="px-2 py-0.5 rounded bg-slate-800 text-[10px] text-slate-300 hover:bg-slate-700 cursor-pointer"
                  >
                    Done
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right: Criticality Chips & Zoom Controls Group */}
        <div className="flex items-center gap-3 flex-wrap">
          {/* Pins Criticality Chips */}
          <div className="flex items-center gap-1 bg-slate-900 p-0.5 rounded-xl border border-slate-700">
            <span className="text-[10px] text-slate-400 font-bold px-1.5">Pins:</span>
            {(['all', 'A', 'B', 'C'] as const).map(crit => {
              const isSelected = criticalityFilter === crit;
              return (
                <button
                  key={crit}
                  type="button"
                  onClick={() => setCriticalityFilter(crit)}
                  className={`px-2 py-0.5 rounded-lg text-[10px] font-bold transition-all cursor-pointer ${
                    isSelected
                      ? crit === 'A'
                        ? 'bg-rose-500 text-white shadow-xs'
                        : crit === 'B'
                          ? 'bg-amber-500 text-slate-900 shadow-xs'
                          : crit === 'C'
                            ? 'bg-emerald-500 text-white shadow-xs'
                            : 'bg-slate-700 text-white'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800'
                  }`}
                >
                  {crit === 'all' ? 'All' : `Cat ${crit}`}
                </button>
              );
            })}
          </div>

          {/* Zoom Controls Group: [ - ] 100% [ + ] [Fit] [⛶ Maximize] */}
          <div className="flex items-center bg-slate-900 p-0.5 rounded-xl border border-slate-700 font-mono text-xs">
            <button
              type="button"
              onClick={handleZoomOut}
              className="w-7 h-7 flex items-center justify-center text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg cursor-pointer transition-colors font-bold text-sm"
              title="Zoom Out (-25%)"
            >
              -
            </button>
            <button
              type="button"
              onClick={handleResetZoom}
              className="px-2 h-7 flex items-center justify-center font-bold text-cyan-400 hover:bg-slate-800 rounded-lg cursor-pointer"
              title="Reset Zoom to 100%"
            >
              {zoomLevel}%
            </button>
            <button
              type="button"
              onClick={handleZoomIn}
              className="w-7 h-7 flex items-center justify-center text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg cursor-pointer transition-colors font-bold text-sm"
              title="Zoom In (+25%)"
            >
              +
            </button>
            <div className="w-px h-4 bg-slate-800 my-auto mx-0.5" />
            <button
              type="button"
              onClick={handleResetZoom}
              className="px-2.5 h-7 flex items-center justify-center text-[11px] font-sans font-semibold text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg cursor-pointer"
              title="Fit to Screen"
            >
              Fit
            </button>
            <button
              type="button"
              onClick={toggleFullscreen}
              className="w-7 h-7 flex items-center justify-center text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg cursor-pointer"
              title={isFullscreen ? 'Exit Fullscreen' : 'Maximize Fullscreen'}
            >
              {isFullscreen ? <Minimize2 size={13} /> : <Maximize2 size={13} />}
            </button>
          </div>
        </div>
      </div>

      {/* =====================================================================
          3. MAIN VIEWPORT (CAD Blueprint Stage OR Zone Cards OR Regional GIS)
         ===================================================================== */}
      {perspective === 'regional_gis' ? (
        /* ===================================================================
           PERSPECTIVE B: REGIONAL GIS FACILITY NETWORK
           =================================================================== */
        <div className="relative flex-1 bg-gradient-to-br from-slate-950 via-[#071326] to-slate-950 overflow-auto p-6 sm:p-10 flex flex-col items-center justify-center">
          {/* GIS Grid Map Backdrop */}
          <div className="relative w-full max-w-5xl bg-slate-900/80 border border-teal-500/30 rounded-3xl p-6 sm:p-8 backdrop-blur-xl shadow-2xl space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="p-2 rounded-xl bg-teal-500/20 text-teal-400 border border-teal-500/30">
                    <MapPin size={18} />
                  </span>
                  <div>
                    <h3 className="text-base sm:text-lg font-bold text-white tracking-tight flex items-center gap-2">
                      <span>Regional GIS Facility Network</span>
                      <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-teal-500/20 text-teal-300 border border-teal-500/30">
                        EEC & Chao Phraya Corridor
                      </span>
                    </h3>
                    <p className="text-xs text-slate-400 mt-0.5">
                      เครือข่ายภูมิศาสตร์ภาพรวม • สถานีท่อส่งน้ำมันดิบ & ท่าเรือขนถ่ายชายฝั่งอ่าวไทย
                    </p>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2 text-xs font-mono text-slate-400">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                <span>Geodetic Datum: WGS84</span>
              </div>
            </div>

            {/* Coastal Geographic Vector Map Simulation */}
            <div className="relative w-full h-[400px] rounded-2xl border border-slate-800 bg-[#040c18] overflow-hidden flex items-center justify-center">
              {/* GIS Grid Coordinates */}
              <div 
                className="absolute inset-0 opacity-15 pointer-events-none"
                style={{
                  backgroundImage: 'linear-gradient(to right, #0088cc 1px, transparent 1px), linear-gradient(to bottom, #0088cc 1px, transparent 1px)',
                  backgroundSize: '50px 50px'
                }}
              />

              {/* Vector Coastline Simulation SVG */}
              <svg className="absolute inset-0 w-full h-full pointer-events-none opacity-30" preserveAspectRatio="none" viewBox="0 0 1000 400">
                <path d="M 0,220 Q 250,210 400,260 T 700,230 T 1000,290 L 1000,400 L 0,400 Z" fill="#03203c" />
                <path d="M 0,220 Q 250,210 400,260 T 700,230 T 1000,290" stroke="#00e5ff" strokeWidth="2" strokeDasharray="6,4" fill="none" />
                <text x="750" y="360" fill="#00e5ff" fontSize="13" fontFamily="monospace" opacity="0.6">GULF OF THAILAND (อ่าวไทย)</text>
                <text x="80" y="100" fill="#22c55e" fontSize="12" fontFamily="monospace" opacity="0.5">CHAO PHRAYA BASIN (ลุ่มน้ำเจ้าพระยา)</text>
                <text x="600" y="120" fill="#a855f7" fontSize="12" fontFamily="monospace" opacity="0.5">EASTERN ECONOMIC CORRIDOR (EEC)</text>
              </svg>

              {/* Plant 1: Phra Khanong (PK) */}
              <div 
                onClick={() => {
                  setSelectedPlant('pk');
                  setPerspective('plot_plan');
                }}
                className="absolute left-[32%] top-[38%] -translate-x-1/2 -translate-y-1/2 cursor-pointer group z-20"
              >
                <div className="relative flex flex-col items-center">
                  <span className="absolute -inset-2 rounded-full bg-emerald-500/40 animate-ping" />
                  <div className="w-10 h-10 rounded-2xl bg-emerald-600 text-white flex items-center justify-center font-bold text-xs shadow-xl border-2 border-emerald-400 group-hover:scale-110 transition-transform">
                    PK
                  </div>
                  <div className="mt-2 px-3 py-1.5 rounded-xl bg-slate-950/90 border border-emerald-500/40 text-center shadow-xl">
                    <p className="font-bold text-xs text-white">Phra Khanong Refinery</p>
                    <p className="text-[10px] text-emerald-400 font-mono">
                      {flocList.filter(f => f.plantId === 'pk').length} FLOC Points • River Front
                    </p>
                  </div>
                </div>
              </div>

              {/* Plant 2: Sriracha (SR) */}
              <div 
                onClick={() => {
                  setSelectedPlant('sr');
                  setPerspective('plot_plan');
                }}
                className="absolute left-[65%] top-[55%] -translate-x-1/2 -translate-y-1/2 cursor-pointer group z-20"
              >
                <div className="relative flex flex-col items-center">
                  <span className="absolute -inset-2 rounded-full bg-cyan-500/40 animate-ping" />
                  <div className="w-10 h-10 rounded-2xl bg-cyan-600 text-white flex items-center justify-center font-bold text-xs shadow-xl border-2 border-cyan-400 group-hover:scale-110 transition-transform">
                    SR
                  </div>
                  <div className="mt-2 px-3 py-1.5 rounded-xl bg-slate-950/90 border border-cyan-500/40 text-center shadow-xl">
                    <p className="font-bold text-xs text-white">Esso Sriracha Complex</p>
                    <p className="text-[10px] text-cyan-400 font-mono">
                      {flocList.filter(f => f.plantId === 'sr').length} FLOC Points • Deepwater Terminal
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Plant Summary Cards & Action Button */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
              {Object.values(PLANT_REGISTRY).map(plant => {
                const count = flocList.filter(f => f.plantId === plant.id).length;
                return (
                  <div 
                    key={plant.id}
                    className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800 space-y-2 hover:border-teal-500/50 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-sm text-white">{plant.code} Complex</span>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-teal-500/20 text-teal-300 border border-teal-500/30">
                        {count} Nodes
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 line-clamp-1">{plant.nameEn}</p>
                    <p className="text-[11px] font-mono text-slate-500">
                      Lat: {plant.coordinates.lat}, Lng: {plant.coordinates.lng}
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedPlant(plant.id);
                        setPerspective('plot_plan');
                      }}
                      className="w-full mt-2 py-1.5 rounded-xl bg-teal-600/80 hover:bg-teal-600 text-white text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <Compass size={13} />
                      <span>{isTh ? 'ตรวจสอบผังพิมพ์เขียว CAD' : 'Inspect Plot Plan Blueprint'}</span>
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      ) : plotViewStyle === 'zone_cards' ? (
        /* ===================================================================
           VIEW STYLE: ZONE CARDS (ZONE MATRIX GROUPED BY AREA & SYSTEM)
           =================================================================== */
        <div className="relative flex-1 bg-slate-950 overflow-y-auto p-6 space-y-6">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Layers size={18} className="text-indigo-400" />
                <span>Zone Matrix & Equipment Topology Cards</span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                จัดกลุ่มตาม Area (L1) และ System (L2) • {currentPlantNodes.length} โหนดทั้งหมดใน {plantMeta.nameTh.split(' ')[0]}
              </p>
            </div>
            <span className="text-xs font-mono text-slate-400">
              Drawing: {plantMeta.drawingRef}
            </span>
          </div>

          <div className="space-y-6">
            {zoneMatrixGroups.map(({ area, systemsWithEq }) => (
              <div 
                key={area.id}
                className="rounded-2xl border border-slate-800 bg-slate-900/80 p-5 space-y-4 shadow-lg"
              >
                {/* Area Header */}
                <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
                  <div className="flex items-center gap-2.5">
                    <span className="p-2 rounded-xl bg-blue-500/20 text-blue-400 border border-blue-500/30">
                      <Building2 size={16} />
                    </span>
                    <div>
                      <span className="text-[10px] font-mono text-blue-400 uppercase font-bold">{area.flocCode}</span>
                      <h4 className="text-sm font-bold text-white">{area.name}</h4>
                    </div>
                  </div>
                  <span className="px-2.5 py-1 rounded-full text-[10px] font-mono font-bold bg-slate-800 text-slate-300 border border-slate-700">
                    Area Level 1
                  </span>
                </div>

                {/* Systems Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {systemsWithEq.map(({ system, equipment }) => (
                    <div 
                      key={system.id}
                      className="rounded-xl border border-slate-800/80 bg-slate-950/60 p-4 space-y-3"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="text-[10px] font-mono text-indigo-400 font-bold">{system.flocCode}</span>
                          <h5 className="text-xs font-bold text-white">{system.name}</h5>
                        </div>
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300">
                          {equipment.length} Equipments
                        </span>
                      </div>

                      {/* Equipment Tags Chips */}
                      <div className="flex flex-wrap gap-2 pt-1">
                        {equipment.map(eq => {
                          const isSelected = selectedNodeId === eq.id;
                          const isCatA = eq.criticality === 'A';
                          const isCatB = eq.criticality === 'B';
                          return (
                            <button
                              key={eq.id}
                              type="button"
                              onClick={() => {
                                setSelectedNodeId(eq.id);
                                setIsInspectorOpen(true);
                              }}
                              className={`px-2.5 py-1.5 rounded-lg border text-xs font-mono font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                                isSelected
                                  ? 'bg-cyan-600 text-white border-cyan-400 ring-2 ring-cyan-400/40 shadow-sm'
                                  : isCatA
                                    ? 'bg-rose-950/60 text-rose-300 border-rose-800/80 hover:border-rose-500'
                                    : isCatB
                                      ? 'bg-amber-950/60 text-amber-300 border-amber-800/80 hover:border-amber-500'
                                      : 'bg-emerald-950/60 text-emerald-300 border-emerald-800/80 hover:border-emerald-500'
                              }`}
                            >
                              <span className={`w-2 h-2 rounded-full ${
                                isCatA ? 'bg-rose-500' : isCatB ? 'bg-amber-400' : 'bg-emerald-400'
                              }`} />
                              <span>{eq.equipmentTag || eq.flocCode.split('-').pop()}</span>
                              <span className="text-[9px] opacity-75 font-normal">({eq.criticality})</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        /* ===================================================================
           VIEW STYLE: CAD STAGE (1400 x 950 CANVAS STAGE)
           =================================================================== */
        <div 
          className={`relative flex-1 overflow-hidden cursor-grab active:cursor-grabbing transition-colors duration-300 ${
            cadPaperMode === 'paper' ? 'bg-[#f4f3ef]' : 'bg-[#060d17]'
          }`}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
        >
          {/* Engineering Blueprint Grid Lines */}
          <div 
            className="absolute inset-0 pointer-events-none opacity-20"
            style={{
              backgroundImage: cadPaperMode === 'paper'
                ? 'linear-gradient(to right, #004488 1px, transparent 1px), linear-gradient(to bottom, #004488 1px, transparent 1px)'
                : 'linear-gradient(to right, #1e3a5f 1px, transparent 1px), linear-gradient(to bottom, #1e3a5f 1px, transparent 1px)',
              backgroundSize: '40px 40px'
            }}
          />

          {/* Transformation Canvas Container */}
          <div 
            className="absolute inset-0 flex items-center justify-center transition-transform duration-75 origin-center"
            style={{
              transform: `translate(${panOffset.x}px, ${panOffset.y}px) scale(${zoomLevel / 100})`
            }}
          >
            {/* Standard CAD Blueprint Canvas (1400 x 950 aspect) */}
            <div className={`relative w-[1400px] h-[950px] shadow-2xl rounded-lg overflow-hidden border transition-colors ${
              cadPaperMode === 'paper' ? 'border-slate-300 bg-[#f4f7fb]' : 'border-slate-700/80 bg-[#070d1e]'
            }`}>
              {/* CAD Plot Plan Drawing Backdrop */}
              {showBackdrop && (
                <div 
                  className="absolute inset-0 w-full h-full bg-cover bg-center transition-all duration-300"
                  style={{
                    backgroundImage: `url(${backgroundImageUrl})`,
                    opacity: drawingOpacity / 100,
                    filter: cadPaperMode === 'dark' 
                      ? 'invert(1) hue-rotate(180deg) brightness(0.78) contrast(1.25)' 
                      : 'brightness(0.98) contrast(1.08)'
                  }}
                />
              )}

              {/* Title Block & Compass Rose (Top-Left) */}
              <div className="absolute top-4 left-4 z-10 p-3 rounded-2xl bg-slate-950/85 backdrop-blur-md border border-slate-700 text-xs font-mono text-slate-300 pointer-events-none flex items-center gap-3 shadow-xl">
                <div className="w-10 h-10 rounded-full border border-cyan-500/50 bg-slate-900 flex items-center justify-center text-cyan-400 font-bold text-sm shadow-inner">
                  N ↑
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-white uppercase">{plantMeta.code} MASTER PLOTPLAN</span>
                    <span className="text-slate-500">|</span>
                    <span className="text-cyan-400 font-semibold">SCALE: 1:2000</span>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-0.5">{plantMeta.drawingRef} • {plantMeta.revision}</p>
                </div>
              </div>

              {/* Engineering Legend & Safety Classification (Bottom-Left) */}
              <div className="absolute bottom-4 left-4 z-10 p-3 rounded-2xl bg-slate-950/85 backdrop-blur-md border border-slate-700 text-xs font-mono text-slate-300 flex items-center gap-4 shadow-xl">
                <div className="flex items-center gap-3 text-[11px]">
                  <span className="flex items-center gap-1.5 text-rose-400">
                    <span className="w-2.5 h-2.5 rounded-full bg-rose-500 shadow-rose-500 shadow-xs" />
                    <span>Cat A (Critical)</span>
                  </span>
                  <span className="flex items-center gap-1.5 text-amber-400">
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-400 shadow-amber-400 shadow-xs" />
                    <span>Cat B (Pre-Oil)</span>
                  </span>
                  <span className="flex items-center gap-1.5 text-emerald-400">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 shadow-emerald-400 shadow-xs" />
                    <span>Cat C (Normal)</span>
                  </span>
                  <span className="text-slate-500">|</span>
                  <span className="text-slate-400">UTM 33°01'28"</span>
                </div>
                <button
                  type="button"
                  onClick={() => setIsImportModalOpen(true)}
                  className="text-cyan-400 hover:text-cyan-300 text-[11px] underline cursor-pointer"
                >
                  Import Layout
                </button>
              </div>

              {/* =============================================================
                  INTERACTIVE HOTSPOT PINS ON BLUEPRINT
                 ============================================================= */}
              {equipmentPins.map((pin, idx) => {
                const coords = getPinCoordinates(pin, idx);
                const isSelected = selectedNodeId === pin.id;
                const matchesCrit = criticalityFilter === 'all' || pin.criticality === criticalityFilter;
                const isSearchMatch = !searchQuery.trim() || 
                  pin.flocCode.toLowerCase().includes(searchQuery.toLowerCase()) ||
                  (pin.equipmentTag && pin.equipmentTag.toLowerCase().includes(searchQuery.toLowerCase())) ||
                  pin.name.toLowerCase().includes(searchQuery.toLowerCase());

                const isDimmed = !matchesCrit || !isSearchMatch;
                const isCatA = pin.criticality === 'A';
                const isCatB = pin.criticality === 'B';

                return (
                  <div
                    key={pin.id}
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedNodeId(pin.id);
                      setIsInspectorOpen(true);
                    }}
                    className={`interactive-pin absolute z-10 transition-all duration-200 cursor-pointer group ${
                      isDimmed ? 'opacity-25 scale-75' : 'opacity-100 hover:scale-110'
                    }`}
                    style={{
                      left: `${coords.x}%`,
                      top: `${coords.y}%`,
                      transform: 'translate(-50%, -50%)',
                      zIndex: isSelected ? 30 : 10
                    }}
                  >
                    {/* Radar Pulse / Ping Animation for Cat A */}
                    {isCatA && !isDimmed && (
                      <span className="absolute -inset-1 rounded-xl bg-rose-500 animate-ping opacity-60 pointer-events-none" />
                    )}

                    {/* Pin Card */}
                    <div className={`relative px-2.5 py-1 rounded-lg border shadow-xl flex items-center gap-1.5 transition-all ${
                      isSelected
                        ? 'bg-slate-900 border-cyan-400 ring-4 ring-cyan-400/50 text-white scale-110 shadow-cyan-500/20'
                        : isCatA
                          ? 'bg-slate-950/95 border-rose-500/80 text-rose-300 hover:border-rose-400'
                          : isCatB
                            ? 'bg-slate-950/95 border-amber-500/80 text-amber-300 hover:border-amber-400'
                            : 'bg-slate-950/95 border-emerald-500/80 text-emerald-300 hover:border-emerald-400'
                    }`}>
                      {/* Pulse Dot */}
                      <span className={`w-2 h-2 rounded-full shrink-0 ${
                        isCatA ? 'bg-rose-500 shadow-rose-500 shadow-sm' : isCatB ? 'bg-amber-400' : 'bg-emerald-400'
                      }`} />

                      {/* Equipment Tag */}
                      <span className="font-mono text-[11px] font-black tracking-tight text-white">
                        {pin.equipmentTag || pin.flocCode.split('-').pop()}
                      </span>

                      {/* Criticality Badge */}
                      <span className={`text-[9px] font-bold px-1 rounded uppercase ${
                        isCatA 
                          ? 'bg-rose-500/20 text-rose-400 border border-rose-500/40' 
                          : isCatB 
                            ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40' 
                            : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                      }`}>
                        {pin.criticality || 'C'}
                      </span>
                    </div>

                    {/* Tooltip on Hover */}
                    <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-1.5 hidden group-hover:flex flex-col items-center pointer-events-none z-40">
                      <div className="px-2.5 py-1 bg-slate-950 border border-slate-700 text-white rounded-md text-[10px] whitespace-nowrap shadow-2xl">
                        <p className="font-bold text-cyan-400">{pin.name}</p>
                        <p className="text-slate-400 font-mono text-[9px]">{pin.flocCode}</p>
                        <p className="text-emerald-400 font-mono text-[9px]">X: {coords.x.toFixed(1)}% | Y: {coords.y.toFixed(1)}%</p>
                      </div>
                      <div className="w-1.5 h-1.5 bg-slate-950 rotate-45 border-r border-b border-slate-700 -mt-1" />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* =====================================================================
          4. RIGHT NODE DETAILS INSPECTOR DRAWER
         ===================================================================== */}
      {isInspectorOpen && selectedNode && (
        <div className="absolute top-12 right-0 bottom-0 w-80 sm:w-96 z-40 bg-slate-900/95 backdrop-blur-md border-l border-slate-800 shadow-2xl flex flex-col text-slate-200 text-xs animate-in slide-in-from-right duration-200">
          {/* Header */}
          <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/70">
            <div className="flex items-center gap-2">
              <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                selectedNode.level === 'Area'
                  ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                  : selectedNode.level === 'System'
                    ? 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/30'
                    : 'bg-purple-500/20 text-purple-400 border border-purple-500/30'
              }`}>
                {selectedNode.level}
              </span>
              <span className="font-mono text-xs font-black text-cyan-400">
                {selectedNode.equipmentTag || selectedNode.flocCode}
              </span>
            </div>
            <button
              type="button"
              onClick={() => setIsInspectorOpen(false)}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 cursor-pointer"
            >
              <X size={16} />
            </button>
          </div>

          {/* Body */}
          <div className="p-5 overflow-y-auto space-y-4 flex-1 custom-scrollbar">
            {/* Hierarchy Path Breadcrumb */}
            <div>
              <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                Hierarchy Topology Path
              </label>
              <div className="p-2.5 rounded-xl bg-slate-950/80 border border-slate-800 font-mono text-[11px] text-slate-300 flex items-center gap-1.5 flex-wrap">
                <span className="text-emerald-400 font-bold">{selectedNode.plantId.toUpperCase()}</span>
                {hierarchyPath.map((item, idx) => (
                  <React.Fragment key={item.id}>
                    <ChevronRight size={12} className="text-slate-600" />
                    <span 
                      onClick={() => setSelectedNodeId(item.id)}
                      className={`cursor-pointer hover:underline ${
                        idx === hierarchyPath.length - 1 ? 'text-cyan-400 font-bold' : 'text-slate-400'
                      }`}
                    >
                      {item.equipmentTag || item.flocCode.split('-').pop()}
                    </span>
                  </React.Fragment>
                ))}
              </div>
            </div>

            {/* Asset Specification */}
            <div className="space-y-3 p-4 rounded-2xl bg-slate-950/70 border border-slate-800">
              <div>
                <span className="text-[10px] text-slate-500 uppercase font-semibold">Node Name</span>
                <p className="text-sm font-bold text-white mt-0.5">{selectedNode.name}</p>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-800/80">
                <div>
                  <span className="text-[10px] text-slate-500 uppercase font-semibold">FLOC Code</span>
                  <p className="font-mono text-xs text-emerald-400 font-bold mt-0.5">{selectedNode.flocCode}</p>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 uppercase font-semibold">Equipment Tag</span>
                  <p className="font-mono text-xs text-white font-black mt-0.5">{selectedNode.equipmentTag || '-'}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-800/80">
                <div>
                  <span className="text-[10px] text-slate-500 uppercase font-semibold">Asset Category</span>
                  <p className="text-xs text-slate-300 mt-0.5">{selectedNode.category || '-'}</p>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 uppercase font-semibold">Criticality</span>
                  <div className="mt-0.5">
                    {selectedNode.criticality === 'A' ? (
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-500/20 text-rose-400 border border-rose-500/30">
                        Cat A (Immediate Critical)
                      </span>
                    ) : selectedNode.criticality === 'B' ? (
                      <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-amber-500/20 text-amber-400 border border-amber-500/30">
                        Cat B (Pre-Oil-in)
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                        Cat C (Normal / Routine)
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {selectedNode.xPercent !== undefined && selectedNode.yPercent !== undefined && (
                <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400 font-mono">
                  <span>Relative CAD Coordinates:</span>
                  <span className="text-cyan-400 font-bold">
                    X: {selectedNode.xPercent.toFixed(1)}% | Y: {selectedNode.yPercent.toFixed(1)}%
                  </span>
                </div>
              )}
            </div>

            {/* Scope Notes / Engineering Conditions */}
            {selectedNode.description && (
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                  Scope Notes & Technical Conditions
                </label>
                <p className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 text-xs text-slate-300 leading-relaxed font-sans">
                  {selectedNode.description}
                </p>
              </div>
            )}

            {/* Cross-Module Operational Links */}
            <div className="p-3.5 rounded-2xl bg-indigo-950/30 border border-indigo-500/30 space-y-2">
              <span className="text-[10px] font-bold uppercase text-indigo-400 flex items-center gap-1.5">
                <Activity size={12} />
                Cross-Module Spatial Interlocking
              </span>
              <p className="text-[11px] text-slate-400">
                พิกัดวิศวกรรมนี้เชื่อมโยงกับ Turnover Dashboard, Crane Spatial Boom Limits, และ Scaffolding Tag Hub
              </p>
              {onNavigateToWorkspace && (
                <button
                  type="button"
                  onClick={() => onNavigateToWorkspace(selectedNode.id)}
                  className="w-full mt-1 py-1.5 px-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <ExternalLink size={13} />
                  <span>เข้าสู่ Turnover Workspace</span>
                </button>
              )}
            </div>
          </div>

          {/* Action Buttons: Add Child, Edit Node, Remove Location */}
          <div className="p-4 border-t border-slate-800 bg-slate-950/90 flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={() => handleAddChildNode(selectedNode)}
              className="flex-1 py-2 px-3 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 border border-emerald-500/30 font-semibold text-xs transition-colors flex items-center justify-center gap-1 cursor-pointer"
            >
              <Plus size={13} />
              <span>+ Add Child Node</span>
            </button>
            <button
              type="button"
              onClick={() => handleEditNode(selectedNode)}
              className="py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-semibold text-xs transition-colors flex items-center gap-1 cursor-pointer"
            >
              <Edit2 size={13} />
              <span>Edit Node</span>
            </button>
            <button
              type="button"
              onClick={() => handleDeleteNode(selectedNode.id, selectedNode.name)}
              className="p-2 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 text-rose-400 border border-rose-500/30 transition-colors cursor-pointer"
              title="Remove Location"
            >
              <Trash2 size={15} />
            </button>
          </div>
        </div>
      )}

      {/* Import Plot Plan Modal */}
      <ImportPlotPlanModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        onApplyPreset={handleApplyPreset}
        currentPlantId={selectedPlant}
      />

      {/* Floc Create/Edit Modal */}
      <FlocModal
        isOpen={isFlocModalOpen}
        onClose={() => setIsFlocModalOpen(false)}
        onSave={(data) => {
          if (editingFloc) {
            onUpdateFloc(data);
          } else {
            onAddFloc(data);
            setSelectedNodeId(data.id);
            setIsInspectorOpen(true);
          }
        }}
        editingFloc={editingFloc}
        parentPreset={parentPreset}
        existingFlocs={flocList}
      />
    </div>
  );
}
