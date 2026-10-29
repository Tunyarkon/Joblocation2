import React, { useState, useRef, MouseEvent as ReactMouseEvent, TouchEvent as ReactTouchEvent, useEffect, useCallback, useMemo } from 'react';
import {
  MapPin,
  Maximize2,
  Minimize2,
  ZoomIn,
  ZoomOut,
  RotateCw,
  Layers,
  Square,
  Compass,
  Info,
  Building,
  Truck,
  Sparkles,
  ChevronRight,
  ShieldCheck,
  Grid,
  RefreshCw,
  Crosshair,
  Ruler,
  Sun,
  Moon,
  Gauge,
  Check,
  Factory
} from 'lucide-react';
import essoPlotPlanBg from '../../assets/esso_sriracha_master_plotplan.jpg';
import { useThemeGate } from '../../utils/themeGate';

export interface PinData {
  x: number; // percentage 0-100%
  y: number; // percentage 0-100%
  label?: string;
  icon?: string;
  radius?: number; // working radius in meters (e.g. 10m)
}

export type ScaleBlockType = 
  | 'crane-footprint' 
  | 'scaffold-bay' 
  | 'scaffold-tower'
  | 'scaffold-ring'
  | 'scaffold-cantilever'
  | 'exclusion-zone' 
  | 'laydown-yard' 
  | 'tandem-zone';

export interface ScaleBlockData {
  x: number; // percentage 0-100%
  y: number; // percentage 0-100%
  width: number; // in meters (real world)
  height: number; // in meters (real world)
  elevationHeight?: number;
  tiers?: number;
  rotation: number; // in degrees (-180 to 180)
  color: 'amber' | 'blue' | 'rose' | 'emerald' | 'purple';
  blockType: ScaleBlockType;
  label?: string;
}

export interface PlotPlanPinningSectionProps {
  markingType: 'pin' | 'area' | 'both';
  onMarkingTypeChange: (type: 'pin' | 'area' | 'both') => void;
  pin: PinData | null;
  onPinChange: (pin: PinData) => void;
  scaleBlock: ScaleBlockData;
  onScaleBlockChange: (block: ScaleBlockData) => void;
  isTh?: boolean;
  equipmentId?: string;
  isScaffolding?: boolean;
  craneCapacity?: number | string;
}

export const MAP_LAYOUTS = [
  { id: 'cad-vector', nameEn: 'Engineering Vector CAD (Bangchak)', nameTh: 'แบบแปลนวิศวกรรม CAD เวกเตอร์ (บางจาก)' },
  { id: 'blueprint', nameEn: 'Dark Blueprint Mode', nameTh: 'โหมดพิมพ์เขียวดิจิทัล (Dark)' },
  { id: 'paper-cad', nameEn: 'Paper CAD Drafting Mode', nameTh: 'โหมดกระดาษเขียนแบบ CAD (Paper)' }
];

export const PRESET_PLANT_ZONES = [
  { name: 'Crude Distillation CDU-1 (11-C-101)', plant: 'Sriracha', x: 28.0, y: 28.0, zone: 'CDU-1' },
  { name: 'HCU High-P Reactor (11-R-201)', plant: 'Sriracha', x: 62.0, y: 26.0, zone: 'HCU-2' },
  { name: 'Platformer Unit (11-R-301)', plant: 'Sriracha', x: 45.0, y: 38.0, zone: 'Platformer' },
  { name: 'Vacuum Heater (11-F-201)', plant: 'Sriracha', x: 82.0, y: 44.0, zone: 'Vac Heater' },
  { name: 'Marine Tank Farm (TK-3801)', plant: 'Sriracha', x: 65.0, y: 72.0, zone: 'Tank Farm' },
  { name: 'Sriracha Marine Jetty Berth', plant: 'Sriracha', x: 18.0, y: 82.0, zone: 'Jetty' },
  { name: 'Phra Khanong CDU-1 (11-C-101)', plant: 'Phra Khanong', x: 20.0, y: 22.0, zone: 'CDU-1' },
  { name: 'Crude Heater (11-F-101)', plant: 'Phra Khanong', x: 62.0, y: 22.0, zone: 'Crude Heater' },
  { name: 'Hydrotreater Unit (21-R-101)', plant: 'Phra Khanong', x: 18.0, y: 64.0, zone: 'Hydrotreater' },
  { name: 'PK Tank Farm (TK-201)', plant: 'Phra Khanong', x: 60.0, y: 68.0, zone: 'Tank Farm' },
  { name: 'Chao Phraya Marine Jetty Berth', plant: 'Phra Khanong', x: 82.0, y: 80.0, zone: 'Jetty' }
];

export const SCALE_BLOCK_PRESETS: {
  id: string;
  labelTh: string;
  labelEn: string;
  type: ScaleBlockType;
  width: number;
  height: number;
  rotation: number;
  color: ScaleBlockData['color'];
  forScaffold?: boolean;
}[] = [
  {
    id: 'crane-small',
    labelTh: 'เครน RT 25T-35T (6m × 7m)',
    labelEn: 'RT Crane 25T-35T (6m × 7m)',
    type: 'crane-footprint',
    width: 6,
    height: 7,
    rotation: 0,
    color: 'amber'
  },
  {
    id: 'crane-standard',
    labelTh: 'เครนมาตรฐาน 50T-80T (6m × 8m)',
    labelEn: 'Mobile Crane 50T-80T (6m × 8m)',
    type: 'crane-footprint',
    width: 6,
    height: 8,
    rotation: 0,
    color: 'amber'
  },
  {
    id: 'crane-heavy',
    labelTh: 'เครนใหญ่ 100T-250T (10m × 12.5m)',
    labelEn: 'Heavy Crane 100T-250T (10m × 12.5m)',
    type: 'crane-footprint',
    width: 10,
    height: 12.5,
    rotation: 0,
    color: 'rose'
  },
  {
    id: 'crane-tandem',
    labelTh: 'พื้นที่ยกคู่ Tandem (16m × 22m)',
    labelEn: 'Tandem Dual Lift Zone (16m × 22m)',
    type: 'tandem-zone',
    width: 16,
    height: 22,
    rotation: 45,
    color: 'purple'
  },
  {
    id: 'exclusion-zone',
    labelTh: 'เขตกั้นอันตราย Exclusion (15m × 15m)',
    labelEn: 'Exclusion Safety Zone (15m × 15m)',
    type: 'exclusion-zone',
    width: 15,
    height: 15,
    rotation: 0,
    color: 'rose'
  },
  {
    id: 'laydown-yard',
    labelTh: 'ลานจัดวาง Laydown (12m × 20m)',
    labelEn: 'Laydown Material Yard (12m × 20m)',
    type: 'laydown-yard',
    width: 12,
    height: 20,
    rotation: 90,
    color: 'blue'
  },
  {
    id: 'scaff-tower',
    labelTh: 'หอคอยนั่งร้าน Tower (2m × 2m)',
    labelEn: 'Tower Scaffold (2m × 2m)',
    type: 'scaffold-tower',
    width: 2,
    height: 2,
    rotation: 0,
    color: 'emerald',
    forScaffold: true
  },
  {
    id: 'scaff-bay-std',
    labelTh: 'นั่งร้านเข้าข้างท่อ Pipe (4m × 2m)',
    labelEn: 'Pipe Rack Bay (4m × 2m)',
    type: 'scaffold-bay',
    width: 4,
    height: 2,
    rotation: 0,
    color: 'emerald',
    forScaffold: true
  },
  {
    id: 'scaff-ring-cdu',
    labelTh: 'นั่งร้านล้อมหอกลั่น 360° (6m × 8m)',
    labelEn: 'Column 360° Ring (6m × 8m)',
    type: 'scaffold-ring',
    width: 6,
    height: 8,
    rotation: 0,
    color: 'emerald',
    forScaffold: true
  },
  {
    id: 'scaff-cantilever',
    labelTh: 'นั่งร้านแบบยื่น Cantilever (3m × 3m)',
    labelEn: 'Cantilever Scaffold (3m × 3m)',
    type: 'scaffold-cantilever',
    width: 3,
    height: 3,
    rotation: 0,
    color: 'amber',
    forScaffold: true
  },
  {
    id: 'scaff-pipe',
    labelTh: 'นั่งร้านโครงยาว Rack (6m × 16m)',
    labelEn: 'Long Rack Scaffolding (6m × 16m)',
    type: 'scaffold-bay',
    width: 6,
    height: 16,
    rotation: 0,
    color: 'emerald',
    forScaffold: true
  }
];

export default function PlotPlanPinningSection({
  markingType = 'pin',
  onMarkingTypeChange,
  pin,
  onPinChange,
  scaleBlock,
  onScaleBlockChange,
  isTh = false,
  equipmentId = '11-C-101',
  isScaffolding = false,
  craneCapacity = 50
}: PlotPlanPinningSectionProps) {
  // CAD Theme Mode: 'blueprint' (Dark Neon Cyan) or 'cad' (Paper Off-White), linked with Global Theme Gate
  const [gateIsDark, setGlobalThemeGate] = useThemeGate();
  const [themeMode, setThemeMode] = useState<'blueprint' | 'cad'>(() => gateIsDark ? 'blueprint' : 'cad');
  useEffect(() => {
    setThemeMode(gateIsDark ? 'blueprint' : 'cad');
  }, [gateIsDark]);
  const isDarkMode = themeMode === 'blueprint';

  // Plant selection: Bangchak Sriracha or Bangchak Phra Khanong
  const [selectedPlant, setSelectedPlant] = useState<'Sriracha' | 'Phra Khanong'>('Sriracha');

  // Map viewport & overlays
  const [showGridOverlay, setShowGridOverlay] = useState(true);
  const [showRuler, setShowRuler] = useState(true);
  const [showRadiusCircle, setShowRadiusCircle] = useState(true);
  const [workingRadius, setWorkingRadius] = useState<number>(pin?.radius || 15); // meters
  const [zoomLevel, setZoomLevel] = useState<number>(1);
  const [panOffset, setPanOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [activeDragTarget, setActiveDragTarget] = useState<'pin' | 'scaleBlock' | 'canvas' | null>(null);
  const [dragOffset, setDragOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  const canvasRef = useRef<HTMLDivElement>(null);
  const panStartRef = useRef<{ clientX: number; clientY: number; startPanX: number; startPanY: number }>({ clientX: 0, clientY: 0, startPanX: 0, startPanY: 0 });
  const didPanRef = useRef(false);

  // Pan boundary clamp to lock image so canvas stays properly bounded
  const clampPan = (x: number, y: number, zoom: number) => {
    if (zoom <= 1) return { x: 0, y: 0 };
    const rect = canvasRef.current?.getBoundingClientRect();
    const w = rect ? rect.width / zoom : 900;
    const h = rect ? rect.height / zoom : 520;
    const maxPanX = Math.max(0, ((zoom - 1) * w) / 2);
    const maxPanY = Math.max(0, ((zoom - 1) * h) / 2);
    return {
      x: Math.max(-maxPanX, Math.min(maxPanX, x)),
      y: Math.max(-maxPanY, Math.min(maxPanY, y))
    };
  };

  const handleZoomChange = (newZoom: number) => {
    const clampedZoom = Math.max(0.5, Math.min(3.0, parseFloat(newZoom.toFixed(2))));
    setZoomLevel(clampedZoom);
    setPanOffset(prev => clampPan(prev.x, prev.y, clampedZoom));
  };

  // Mouse wheel zoom supporting 50% to 300%
  const handleWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (e.deltaY < 0) {
      handleZoomChange(zoomLevel + 0.15);
    } else {
      handleZoomChange(zoomLevel - 0.15);
    }
  };

  // Helper to convert mouse/touch event into percentage coordinates (0-100%)
  const getCoordinatesFromEvent = useCallback((clientX: number, clientY: number) => {
    if (!canvasRef.current) return { x: 50, y: 50 };
    const rect = canvasRef.current.getBoundingClientRect();
    const x = ((clientX - rect.left) / rect.width) * 100;
    const y = ((clientY - rect.top) / rect.height) * 100;
    return {
      x: parseFloat(Math.max(2, Math.min(98, x)).toFixed(1)),
      y: parseFloat(Math.max(2, Math.min(98, y)).toFixed(1))
    };
  }, []);

  // Handle direct click on canvas background (when not dragging)
  const handleCanvasClickCoordinates = useCallback((clientX: number, clientY: number) => {
    const { x, y } = getCoordinatesFromEvent(clientX, clientY);

    if (markingType === 'pin') {
      onPinChange({
        x,
        y,
        label: equipmentId || 'Crane Pin',
        radius: workingRadius
      });
    } else if (markingType === 'area') {
      onScaleBlockChange({
        ...scaleBlock,
        x,
        y
      });
    } else {
      // 'both' mode: click moves the pin marker by default
      onPinChange({
        x,
        y,
        label: equipmentId || 'Lift Center Point',
        radius: workingRadius
      });
    }
  }, [equipmentId, getCoordinatesFromEvent, markingType, onPinChange, onScaleBlockChange, scaleBlock, workingRadius]);

  // Mouse / Touch Dragging Logic for Markers and Canvas Pan
  const handleStartDrag = (target: 'pin' | 'scaleBlock', clientX: number, clientY: number, e: ReactMouseEvent | ReactTouchEvent) => {
    e.stopPropagation();
    setActiveDragTarget(target);
    const { x, y } = getCoordinatesFromEvent(clientX, clientY);
    const currentPos = target === 'pin' 
      ? { x: pin?.x || 50, y: pin?.y || 50 } 
      : { x: scaleBlock.x, y: scaleBlock.y };
    setDragOffset({ x: currentPos.x - x, y: currentPos.y - y });
  };

  const handleCanvasMouseDown = (e: ReactMouseEvent<HTMLDivElement>) => {
    if (e.button !== 0) return;
    panStartRef.current = {
      clientX: e.clientX,
      clientY: e.clientY,
      startPanX: panOffset.x,
      startPanY: panOffset.y
    };
    didPanRef.current = false;
    setActiveDragTarget('canvas');
  };

  const handleCanvasTouchStart = (e: ReactTouchEvent<HTMLDivElement>) => {
    if (e.touches.length === 1) {
      panStartRef.current = {
        clientX: e.touches[0].clientX,
        clientY: e.touches[0].clientY,
        startPanX: panOffset.x,
        startPanY: panOffset.y
      };
      didPanRef.current = false;
      setActiveDragTarget('canvas');
    }
  };

  const handlePointerMove = useCallback((clientX: number, clientY: number) => {
    if (!activeDragTarget) return;

    if (activeDragTarget === 'canvas') {
      const dx = clientX - panStartRef.current.clientX;
      const dy = clientY - panStartRef.current.clientY;
      if (Math.abs(dx) > 3 || Math.abs(dy) > 3) {
        didPanRef.current = true;
        setPanOffset(clampPan(
          panStartRef.current.startPanX + dx,
          panStartRef.current.startPanY + dy,
          zoomLevel
        ));
      }
      return;
    }

    const { x, y } = getCoordinatesFromEvent(clientX, clientY);
    const finalX = parseFloat(Math.max(2, Math.min(98, x + dragOffset.x)).toFixed(1));
    const finalY = parseFloat(Math.max(2, Math.min(98, y + dragOffset.y)).toFixed(1));

    if (activeDragTarget === 'pin') {
      onPinChange({
        x: finalX,
        y: finalY,
        label: equipmentId || 'Crane Pin',
        radius: workingRadius
      });
    } else if (activeDragTarget === 'scaleBlock') {
      onScaleBlockChange({
        ...scaleBlock,
        x: finalX,
        y: finalY
      });
    }
  }, [activeDragTarget, dragOffset, equipmentId, getCoordinatesFromEvent, onPinChange, onScaleBlockChange, scaleBlock, workingRadius]);

  const handlePointerUp = useCallback(() => {
    if (activeDragTarget === 'canvas') {
      if (!didPanRef.current) {
        handleCanvasClickCoordinates(panStartRef.current.clientX, panStartRef.current.clientY);
      }
      setActiveDragTarget(null);
      return;
    }
    if (activeDragTarget) {
      setActiveDragTarget(null);
    }
  }, [activeDragTarget, handleCanvasClickCoordinates]);

  // Global listeners for mouse move and touch move during dragging
  useEffect(() => {
    if (!activeDragTarget) return;

    const handleWindowMouseMove = (e: MouseEvent) => {
      handlePointerMove(e.clientX, e.clientY);
    };

    const handleWindowTouchMove = (e: TouchEvent) => {
      if (e.touches.length > 0) {
        handlePointerMove(e.touches[0].clientX, e.touches[0].clientY);
      }
    };

    const handleWindowMouseUp = () => handlePointerUp();
    const handleWindowTouchEnd = () => handlePointerUp();

    window.addEventListener('mousemove', handleWindowMouseMove);
    window.addEventListener('mouseup', handleWindowMouseUp);
    window.addEventListener('touchmove', handleWindowTouchMove, { passive: false });
    window.addEventListener('touchend', handleWindowTouchEnd);

    return () => {
      window.removeEventListener('mousemove', handleWindowMouseMove);
      window.removeEventListener('mouseup', handleWindowMouseUp);
      window.removeEventListener('touchmove', handleWindowTouchMove);
      window.removeEventListener('touchend', handleWindowTouchEnd);
    };
  }, [activeDragTarget, handlePointerMove, handlePointerUp]);

  // Color mapper helper for Scale Block
  const getColorStyles = (color: ScaleBlockData['color']) => {
    switch (color) {
      case 'amber':
        return {
          bg: isDarkMode ? 'bg-amber-500/25' : 'bg-amber-500/20',
          border: 'border-amber-500',
          text: 'text-amber-400',
          accent: 'bg-amber-500',
          badge: 'bg-amber-500/20 text-amber-300 border-amber-500/50',
          matColor: 'bg-amber-400 text-slate-950 border-amber-300'
        };
      case 'rose':
        return {
          bg: isDarkMode ? 'bg-rose-500/25' : 'bg-rose-500/20',
          border: 'border-rose-500',
          text: 'text-rose-400',
          accent: 'bg-rose-500',
          badge: 'bg-rose-500/20 text-rose-300 border-rose-500/50',
          matColor: 'bg-rose-400 text-slate-950 border-rose-300'
        };
      case 'emerald':
        return {
          bg: isDarkMode ? 'bg-emerald-500/25' : 'bg-emerald-500/20',
          border: 'border-emerald-500',
          text: 'text-emerald-400',
          accent: 'bg-emerald-500',
          badge: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50',
          matColor: 'bg-emerald-400 text-slate-950 border-emerald-300'
        };
      case 'purple':
        return {
          bg: isDarkMode ? 'bg-purple-500/25' : 'bg-purple-500/20',
          border: 'border-purple-500',
          text: 'text-purple-400',
          accent: 'bg-purple-500',
          badge: 'bg-purple-500/20 text-purple-300 border-purple-500/50',
          matColor: 'bg-purple-400 text-slate-950 border-purple-300'
        };
      case 'blue':
      default:
        return {
          bg: isDarkMode ? 'bg-cyan-500/25' : 'bg-blue-500/20',
          border: 'border-cyan-500',
          text: 'text-cyan-400',
          accent: 'bg-cyan-500',
          badge: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/50',
          matColor: 'bg-cyan-400 text-slate-950 border-cyan-300'
        };
    }
  };

  const blockColors = getColorStyles(scaleBlock.color);
  const blockAreaM2 = (scaleBlock.width * scaleBlock.height).toFixed(1);

  // Ground bearing load calculation estimation (Tons per outrigger pad)
  const capTons = Number(craneCapacity) || 50;
  const estimatedPeakPadLoad = ((capTons * 1.55) / 2.8).toFixed(1); // distributed max on 1 outrigger pad
  const outriggerMatAreaM2 = 2.25; // 1.5m x 1.5m mat = 2.25 m²
  const groundPressureKPa = Math.round((Number(estimatedPeakPadLoad) * 9.81 * 10) / outriggerMatAreaM2);

  // Filtered snap zones for currently selected plant
  const currentPlantZones = useMemo(() => {
    return PRESET_PLANT_ZONES.filter(z => z.plant === selectedPlant);
  }, [selectedPlant]);

  return (
    <div className={`space-y-3 rounded-2xl border transition-all duration-300 overflow-hidden shadow-lg ${
      isDarkMode 
        ? 'bg-[#0a0f1d] border-slate-800 text-slate-100' 
        : 'bg-[#f8fafc] border-slate-300 text-slate-900'
    } ${
      isFullscreen ? 'fixed inset-3 z-50 overflow-y-auto max-w-none shadow-2xl p-4' : ''
    }`}>
      
      {/* =========================================================================
          1. HEADER & TOP CONTROLS: PLANT SELECTOR + CAD THEME TOGGLE + PINNING MODES
         ========================================================================= */}
      <div className={`p-3.5 sm:p-4 border-b flex flex-col lg:flex-row lg:items-center justify-between gap-3 ${
        isDarkMode 
          ? 'bg-slate-900/90 border-slate-800/90' 
          : 'bg-white border-slate-200 shadow-2xs'
      }`}>
        {/* Left: Section Identity & Plant Selector */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <div className="flex items-center gap-2.5">
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 shadow-md ${
              isDarkMode 
                ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30' 
                : 'bg-blue-600 text-white shadow-blue-500/20'
            }`}>
              <Crosshair size={18} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-black tracking-tight flex items-center gap-1.5">
                  <span>{isTh ? 'ผังโรงกลั่นและตำแหน่งจุดตั้งเครน' : 'Refinery CAD Plot Plan & Crane Position'}</span>
                </h3>
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-mono font-bold uppercase tracking-wider ${
                  isDarkMode 
                    ? 'bg-cyan-950 text-cyan-300 border border-cyan-800' 
                    : 'bg-blue-100 text-blue-700 border border-blue-200'
                }`}>
                  Vector CAD
                </span>
              </div>
              <p className={`text-[11px] mt-0.5 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                {isTh 
                  ? 'จำลองพิกัดจริง วงสวิงบูม (Radius) และฐานขาช้าง Outrigger Mat โหลดแรงกดดิน kPa' 
                  : 'Real-world GPS coordinates, 360° boom swing radius & 4-corner outrigger bearing load.'}
              </p>
            </div>
          </div>

          {/* Plant Selector Pill (Sriracha vs Phra Khanong) */}
          <div className="flex items-center gap-1 overflow-x-auto custom-scrollbar flex-nowrap py-0.5">
            <button
              type="button"
              onClick={() => setSelectedPlant('Sriracha')}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all whitespace-nowrap cursor-pointer flex items-center gap-1.5 border ${
                selectedPlant === 'Sriracha'
                  ? (isDarkMode 
                      ? 'bg-cyan-500/25 border-cyan-400 text-cyan-300 shadow-xs' 
                      : 'bg-blue-600 border-blue-600 text-white shadow-xs')
                  : (isDarkMode 
                      ? 'bg-slate-800/80 border-slate-700 text-slate-400 hover:text-slate-200' 
                      : 'bg-slate-100 border-slate-200 text-slate-600 hover:bg-slate-200')
              }`}
            >
              <Factory size={13} />
              <span>{isTh ? 'โรงกลั่นศรีราชา' : 'Sriracha Plant'}</span>
            </button>

            <button
              type="button"
              onClick={() => setSelectedPlant('Phra Khanong')}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all whitespace-nowrap cursor-pointer flex items-center gap-1.5 border ${
                selectedPlant === 'Phra Khanong'
                  ? (isDarkMode 
                      ? 'bg-emerald-500/25 border-emerald-400 text-emerald-300 shadow-xs' 
                      : 'bg-emerald-600 border-emerald-600 text-white shadow-xs')
                  : (isDarkMode 
                      ? 'bg-slate-800/80 border-slate-700 text-slate-400 hover:text-slate-200' 
                      : 'bg-slate-100 border-slate-200 text-slate-600 hover:bg-slate-200')
              }`}
            >
              <Factory size={13} />
              <span>{isTh ? 'โรงกลั่นพระโขนง' : 'Phra Khanong Plant'}</span>
            </button>
          </div>
        </div>

        {/* Right: Theme Switcher & Fullscreen Button */}
        <div className="flex items-center gap-2 self-start lg:self-auto flex-wrap">
          {/* CAD Theme Switcher: Dark Blueprint vs Paper CAD */}
          <div className={`flex items-center p-0.5 rounded-xl border ${
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
              className={`px-2.5 py-1 rounded-lg text-[11px] font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                isDarkMode 
                  ? 'bg-cyan-500 text-slate-950 shadow-md' 
                  : 'text-slate-600 hover:text-slate-900'
              }`}
              title="Switch to Dark Blueprint CAD mode"
            >
              <Moon size={12} />
              <span>{isTh ? 'พิมพ์เขียวดิจิทัล' : 'Dark Blueprint'}</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setThemeMode('cad');
                setGlobalThemeGate(false);
              }}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                !isDarkMode 
                  ? 'bg-white text-slate-900 shadow-md border border-slate-200' 
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              title="Switch to Paper CAD Drafting mode"
            >
              <Sun size={12} />
              <span>{isTh ? 'กระดาษเขียนแบบ' : 'Paper CAD'}</span>
            </button>
          </div>

          {/* Fullscreen Expand/Collapse */}
          <button
            type="button"
            onClick={() => setIsFullscreen(!isFullscreen)}
            className={`p-2 rounded-xl border transition-colors cursor-pointer ${
              isDarkMode 
                ? 'bg-slate-800/80 border-slate-700 text-slate-300 hover:bg-slate-700' 
                : 'bg-white border-slate-300 text-slate-600 hover:bg-slate-100 shadow-2xs'
            }`}
            title={isFullscreen ? 'Exit Fullscreen' : 'Expand Plot Plan View'}
          >
            {isFullscreen ? <Minimize2 size={15} /> : <Maximize2 size={15} />}
          </button>
        </div>
      </div>

      {/* =========================================================================
          2. INTERACTIVE TOOLBAR: 3 MODES + PARAMETER INPUTS (RADIUS, WxL, ROT)
         ========================================================================= */}
      <div className={`px-3.5 sm:px-4 py-2.5 border-b flex flex-wrap items-center justify-between gap-3 text-xs ${
        isDarkMode 
          ? 'bg-slate-950/60 border-slate-800/60' 
          : 'bg-slate-100/80 border-slate-200'
      }`}>
        
        {/* Left: 3-Mode Segmented Selector Pill */}
        <div className="flex items-center gap-2 overflow-x-auto custom-scrollbar flex-nowrap py-0.5">
          <div className={`inline-flex rounded-xl p-1 border shadow-2xs ${
            isDarkMode 
              ? 'bg-slate-900 border-slate-800' 
              : 'bg-slate-200/90 border-slate-300'
          }`}>
            {/* Mode 1: Pin Marker */}
            <button
              type="button"
              onClick={() => onMarkingTypeChange('pin')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
                markingType === 'pin'
                  ? (isDarkMode 
                      ? 'bg-rose-500 text-white shadow-xs font-black' 
                      : 'bg-white text-rose-600 shadow-xs ring-1 ring-black/5 font-black')
                  : (isDarkMode ? 'text-slate-400 hover:text-slate-200' : 'text-slate-600 hover:text-slate-900')
              }`}
              title="📍 Pin Only: แสดงเฉพาะหมุดจุดศูนย์กลางการยก พร้อมป้าย Equipment Tag"
            >
              <MapPin size={13} className={markingType === 'pin' ? 'fill-current' : ''} />
              <span>📍 {isTh ? 'Pin Only (จุดยก)' : 'Pin Only'}</span>
            </button>

            {/* Mode 2: Scale Block Insert */}
            <button
              type="button"
              onClick={() => onMarkingTypeChange('area')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
                markingType === 'area'
                  ? (isDarkMode 
                      ? 'bg-amber-500 text-slate-950 shadow-xs font-black' 
                      : 'bg-amber-500 text-white shadow-xs font-black')
                  : (isDarkMode ? 'text-slate-400 hover:text-slate-200' : 'text-slate-600 hover:text-slate-900')
              }`}
              title="📐 Area / Scale Block: แสดงเฉพาะกรอบฐาน Footprint ของรถเครนหรือนั่งร้าน"
            >
              <Square size={13} />
              <span>📐 {isTh ? 'Area / Footprint (ฐาน)' : 'Area / Footprint'}</span>
            </button>

            {/* Mode 3: Combined View */}
            <button
              type="button"
              onClick={() => onMarkingTypeChange('both')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
                markingType === 'both'
                  ? (isDarkMode 
                      ? 'bg-cyan-500 text-slate-950 shadow-xs font-black' 
                      : 'bg-blue-600 text-white shadow-xs font-black')
                  : (isDarkMode ? 'text-slate-400 hover:text-slate-200' : 'text-slate-600 hover:text-slate-900')
              }`}
              title="🔲 Both: แสดงทั้งหมุดจุดยกและกรอบฐานรถเครนพร้อมกัน (แนะนำสำหรับงานความปลอดภัย)"
            >
              <Layers size={13} />
              <span>🔲 {isTh ? 'Both (แนะนำ)' : 'Both (Recommended)'}</span>
              <span className={`text-[9px] px-1 py-0.2 rounded font-extrabold ${
                markingType === 'both'
                  ? 'bg-slate-950 text-cyan-300'
                  : (isDarkMode ? 'bg-cyan-950 text-cyan-400 border border-cyan-800' : 'bg-blue-100 text-blue-700')
              }`}>
                {isTh ? 'แนะนำ' : 'Rec'}
              </span>
            </button>
          </div>
        </div>

        {/* Center/Right: Parameters depending on mode */}
        <div className="flex items-center gap-2.5 flex-wrap">
          {/* PIN SETTINGS: Working Radius */}
          {(markingType === 'pin' || markingType === 'both') && (
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className={`font-bold flex items-center gap-1 ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                <Compass size={13} className="text-rose-500" />
                <span className="hidden sm:inline">{isTh ? 'รัศมีกั้นเขต (Radius):' : 'Barricade Radius:'}</span>
              </span>

              <div className={`flex items-center gap-1 px-2 py-1 rounded-xl border shadow-2xs ${
                isDarkMode ? 'bg-slate-900 border-slate-700 text-slate-200' : 'bg-white border-slate-200'
              }`}>
                <input
                  type="number"
                  min="3"
                  max="60"
                  value={workingRadius}
                  onChange={(e) => {
                    const val = Math.max(3, Math.min(60, parseInt(e.target.value) || 15));
                    setWorkingRadius(val);
                    if (pin) onPinChange({ ...pin, radius: val });
                  }}
                  className={`w-11 text-center font-bold px-1 py-0.5 rounded text-xs focus:outline-none ${
                    isDarkMode ? 'bg-slate-800 text-rose-400' : 'bg-slate-100 text-rose-600'
                  }`}
                  title="ระบุรัศมีกั้นเขตปลอดภัย 3m - 60m"
                />
                <span className="text-[10px] text-slate-400 font-mono">m</span>
              </div>

              {/* Quick radius preset buttons (10m, 15m, 20m, 25m) */}
              <div className="flex items-center gap-1">
                {[10, 15, 20, 25].map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => {
                      setWorkingRadius(r);
                      if (pin) onPinChange({ ...pin, radius: r });
                    }}
                    className={`px-1.5 py-0.5 rounded text-[10px] font-bold border transition-colors cursor-pointer ${
                      workingRadius === r
                        ? (isDarkMode ? 'bg-rose-500 text-white border-rose-500 shadow-xs' : 'bg-rose-600 text-white border-rose-600 shadow-xs')
                        : (isDarkMode ? 'bg-slate-800 text-slate-300 border-slate-700 hover:border-rose-400' : 'bg-white text-slate-600 border-slate-300 hover:border-rose-500')
                    }`}
                    title={`ตั้งรัศมีกั้นเขต ${r} เมตร`}
                  >
                    {r}m
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* SCALE BLOCK SETTINGS: Dimensions & Boom Rotation */}
          {(markingType === 'area' || markingType === 'both') && (
            <div className="flex items-center gap-2 flex-wrap">
              {/* Width */}
              <div className={`flex items-center gap-1 px-2 py-1 rounded-xl border shadow-2xs ${
                isDarkMode ? 'bg-slate-900 border-slate-700' : 'bg-white border-slate-200'
              }`}>
                <span className="text-[10px] font-bold text-slate-400">W:</span>
                <input
                  type="number"
                  min="2"
                  max="60"
                  step="0.5"
                  value={scaleBlock.width}
                  onChange={(e) =>
                    onScaleBlockChange({
                      ...scaleBlock,
                      width: Math.max(1, parseFloat(e.target.value) || 6)
                    })
                  }
                  className={`w-11 text-center font-bold px-1 py-0.5 rounded text-xs focus:outline-none ${
                    isDarkMode ? 'bg-slate-800 text-amber-400' : 'bg-slate-100 text-amber-700'
                  }`}
                  title="ความกว้างฐานรถเครน (Meters)"
                />
                <span className="text-[10px] text-slate-400 font-mono">m</span>
              </div>

              {/* Length */}
              <div className={`flex items-center gap-1 px-2 py-1 rounded-xl border shadow-2xs ${
                isDarkMode ? 'bg-slate-900 border-slate-700' : 'bg-white border-slate-200'
              }`}>
                <span className="text-[10px] font-bold text-slate-400">L:</span>
                <input
                  type="number"
                  min="2"
                  max="60"
                  step="0.5"
                  value={scaleBlock.height}
                  onChange={(e) =>
                    onScaleBlockChange({
                      ...scaleBlock,
                      height: Math.max(1, parseFloat(e.target.value) || 8)
                    })
                  }
                  className={`w-11 text-center font-bold px-1 py-0.5 rounded text-xs focus:outline-none ${
                    isDarkMode ? 'bg-slate-800 text-amber-400' : 'bg-slate-100 text-amber-700'
                  }`}
                  title="ความยาวฐานรถเครน (Meters)"
                />
                <span className="text-[10px] text-slate-400 font-mono">m</span>
              </div>

              {/* Boom Rotation Controls */}
              <div className={`flex items-center gap-1 px-2 py-1 rounded-xl border shadow-2xs ${
                isDarkMode ? 'bg-slate-900 border-slate-700' : 'bg-white border-slate-200'
              }`}>
                <RotateCw size={11} className="text-amber-400" />
                <span className="text-[10px] font-bold text-slate-400 hidden sm:inline">Boom:</span>
                <input
                  type="number"
                  min="-180"
                  max="180"
                  value={scaleBlock.rotation}
                  onChange={(e) =>
                    onScaleBlockChange({
                      ...scaleBlock,
                      rotation: parseInt(e.target.value) || 0
                    })
                  }
                  className={`w-11 text-center font-bold px-1 py-0.5 rounded text-xs focus:outline-none ${
                    isDarkMode ? 'bg-slate-800 text-amber-300' : 'bg-slate-100 text-amber-800'
                  }`}
                  title="มุมหมุนบูมเครน (-180° ถึง +180°)"
                />
                <span className="text-[10px] text-slate-400 font-mono">°</span>
              </div>

              {/* Quick Boom Angle Presets */}
              <div className="flex items-center gap-1">
                {[0, 45, 90, 180, -90].map((deg) => (
                  <button
                    key={deg}
                    type="button"
                    onClick={() => onScaleBlockChange({ ...scaleBlock, rotation: deg })}
                    className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-bold border transition-colors cursor-pointer ${
                      scaleBlock.rotation === deg
                        ? (isDarkMode ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-xs' : 'bg-amber-500 text-white border-amber-600 shadow-xs')
                        : (isDarkMode ? 'bg-slate-800 text-slate-300 border-slate-700 hover:border-amber-400' : 'bg-white text-slate-600 border-slate-200 hover:border-amber-400')
                    }`}
                    title={`หมุนบูมไปยังมุม ${deg}°`}
                  >
                    {deg > 0 ? `+${deg}°` : `${deg}°`}
                  </button>
                ))}
              </div>

              {/* Color selector */}
              <div className={`flex items-center gap-1 p-1 rounded-xl border shadow-2xs ${
                isDarkMode ? 'bg-slate-900 border-slate-700' : 'bg-white border-slate-200'
              }`}>
                {(['amber', 'blue', 'rose', 'emerald'] as const).map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => onScaleBlockChange({ ...scaleBlock, color: c })}
                    className={`w-3.5 h-3.5 rounded-full transition-transform cursor-pointer ${
                      c === 'amber' ? 'bg-amber-500' :
                      c === 'blue' ? 'bg-cyan-500' :
                      c === 'rose' ? 'bg-rose-500' : 'bg-emerald-500'
                    } ${scaleBlock.color === c ? 'ring-2 ring-offset-1 ring-white scale-125' : 'opacity-50 hover:opacity-100'}`}
                    title={`Color: ${c}`}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Viewport Toggles (Grid & Zoom) */}
          <div className="flex items-center gap-1.5 ml-auto">
            <button
              type="button"
              onClick={() => setShowGridOverlay(!showGridOverlay)}
              className={`p-1.5 rounded-lg border font-semibold flex items-center gap-1 transition-colors cursor-pointer text-[11px] ${
                showGridOverlay
                  ? (isDarkMode ? 'bg-cyan-500/20 border-cyan-500 text-cyan-300' : 'bg-blue-50 border-blue-300 text-blue-700')
                  : (isDarkMode ? 'bg-slate-900 border-slate-800 text-slate-400' : 'bg-white border-slate-200 text-slate-500')
              }`}
              title="Toggle CAD Grid"
            >
              <Grid size={13} />
              <span className="hidden sm:inline">{isTh ? 'กริด' : 'Grid'}</span>
            </button>

            {/* Zoom Controls with 50%, 75%, 100%, 150%, 200% Presets */}
            <div className={`flex items-center rounded-lg border overflow-hidden ${
              isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
            }`}>
              {/* Zoom Presets Bar */}
              <div className="hidden sm:flex items-center border-r border-slate-700/50">
                {[0.5, 0.75, 1.0, 1.5, 2.0].map((preset) => {
                  const percent = Math.round(preset * 100);
                  const isCurrent = Math.abs(zoomLevel - preset) < 0.05;
                  return (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => handleZoomChange(preset)}
                      className={`px-1.5 py-1 text-[10px] font-mono font-bold transition-colors cursor-pointer ${
                        isCurrent
                          ? (isDarkMode ? 'bg-cyan-500/20 text-cyan-300' : 'bg-blue-100 text-blue-700')
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                      title={`Zoom to ${percent}%`}
                    >
                      {percent}%
                    </button>
                  );
                })}
              </div>

              <button
                type="button"
                onClick={() => handleZoomChange(zoomLevel - 0.25)}
                className="p-1.5 text-slate-400 hover:text-slate-100 cursor-pointer"
                title="Zoom Out (ขยายออก)"
              >
                <ZoomOut size={12} />
              </button>
              <span className="px-1.5 text-[10px] font-mono font-bold text-slate-300 min-w-[38px] text-center">
                {Math.round(zoomLevel * 100)}%
              </span>
              <button
                type="button"
                onClick={() => handleZoomChange(zoomLevel + 0.25)}
                className="p-1.5 text-slate-400 hover:text-slate-100 cursor-pointer"
                title="Zoom In (ซูมเข้า)"
              >
                <ZoomIn size={12} />
              </button>
              <button
                type="button"
                onClick={() => {
                  setZoomLevel(1);
                  setPanOffset({ x: 0, y: 0 });
                }}
                className="p-1.5 text-slate-400 hover:text-slate-100 border-l border-slate-700/50 cursor-pointer"
                title="Reset Zoom & Pan (100%)"
              >
                <RefreshCw size={11} />
              </button>
              <button
                type="button"
                onClick={() => {
                  setZoomLevel(1);
                  setPanOffset({ x: 0, y: 0 });
                }}
                className="px-2 py-1 text-[10px] font-bold text-slate-400 hover:text-slate-100 border-l border-slate-700/50 cursor-pointer"
                title="Reset Fit to View"
              >
                Fit
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* =========================================================================
          3. QUICK FOOTPRINT PRESETS (When in Area / Both Mode)
         ========================================================================= */}
      {(markingType === 'area' || markingType === 'both') && (
        <div className={`px-3.5 sm:px-4 py-2 border-b flex items-center gap-2 overflow-x-auto custom-scrollbar text-xs ${
          isDarkMode 
            ? 'bg-slate-900/50 border-slate-800/60' 
            : 'bg-slate-50 border-slate-200'
        }`}>
          <span className={`text-[10px] font-bold shrink-0 flex items-center gap-1 ${
            isDarkMode ? 'text-amber-400' : 'text-amber-700'
          }`}>
            <Sparkles size={11} />
            <span>{isTh ? 'พรีเซ็ตฐานเครน/นั่งร้าน:' : 'Footprint Presets:'}</span>
          </span>
          <div className="flex items-center gap-1.5 flex-nowrap">
            {SCALE_BLOCK_PRESETS.filter(p => isScaffolding ? (p.forScaffold || p.type === 'laydown-yard' || p.type === 'exclusion-zone') : !p.forScaffold).map((preset) => (
              <button
                key={preset.id}
                type="button"
                onClick={() =>
                  onScaleBlockChange({
                    ...scaleBlock,
                    width: preset.width,
                    height: preset.height,
                    rotation: preset.rotation,
                    color: preset.color,
                    blockType: preset.type,
                    label: isTh ? preset.labelTh : preset.labelEn
                  })
                }
                className={`px-2.5 py-0.8 rounded-lg text-[10px] font-semibold border transition-all whitespace-nowrap cursor-pointer shadow-2xs ${
                  isDarkMode
                    ? 'bg-slate-800 border-slate-700 hover:border-amber-400 hover:text-amber-300 text-slate-300'
                    : 'bg-white border-slate-200 hover:border-amber-500 hover:text-amber-700 text-slate-700'
                }`}
              >
                {isTh ? preset.labelTh : preset.labelEn}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* =========================================================================
          4. VECTOR CAD CANVAS WITH INTERACTIVE DRAG & DROP
         ========================================================================= */}
      <div className="p-3 sm:p-4 space-y-2.5">
        {/* Status Line: Telemetry & Ground Bearing Calculation */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-2 font-medium">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className={isDarkMode ? 'text-slate-300' : 'text-slate-600'}>
              {isTh 
                ? 'คลิกบนผัง CAD เพื่อระบุจุดตั้ง หรือคลิกค้างเพื่อลากย้ายจุด (Drag & Drop)' 
                : 'Click vector blueprint to reposition, or click-and-drag markers directly.'}
            </span>
          </div>

          {/* Coordinate Readout */}
          <div className="flex items-center gap-2 font-mono text-[11px] font-bold flex-wrap">
            {pin && (markingType === 'pin' || markingType === 'both') && (
              <span className={`px-2 py-0.5 rounded border ${
                isDarkMode 
                  ? 'bg-rose-950/70 border-rose-800 text-rose-300' 
                  : 'bg-rose-100 border-rose-300 text-rose-700'
              }`}>
                Pin: X {pin.x}% · Y {pin.y}% · R {workingRadius}m
              </span>
            )}
            {(markingType === 'area' || markingType === 'both') && (
              <span className={`px-2 py-0.5 rounded border ${blockColors.badge}`}>
                {isScaffolding ? 'Scaffold Base' : 'Footprint'}: {scaleBlock.width}m × {scaleBlock.height}m ({blockAreaM2} m²)
                {scaleBlock.elevationHeight ? ` · H ${scaleBlock.elevationHeight}m (${((scaleBlock.width * scaleBlock.height * scaleBlock.elevationHeight)).toFixed(0)} m³)` : ''} · Rot {scaleBlock.rotation}°
              </span>
            )}
          </div>
        </div>

        {/* Viewport Canvas Frame */}
        <div 
          onWheel={handleWheel}
          className={`relative rounded-2xl overflow-hidden border shadow-inner h-[380px] sm:h-[460px] select-none ${
          isDarkMode 
            ? 'border-slate-800 bg-[#070b14]' 
            : 'border-slate-300 bg-[#f1f5f9]'
        }`}>
          
          {/* Top Metric Scale Ruler */}
          {showRuler && (
            <div className={`absolute top-0 left-0 right-0 h-4.5 border-b z-20 flex items-center justify-between px-3 text-[9px] font-mono pointer-events-none select-none ${
              isDarkMode 
                ? 'bg-slate-950/85 border-slate-800 text-cyan-400/70' 
                : 'bg-slate-200/90 border-slate-300 text-slate-600'
            }`}>
              <span>0m</span>
              <span>25m</span>
              <span>50m</span>
              <span>75m</span>
              <span>100m</span>
              <span>125m</span>
              <span>150m</span>
            </div>
          )}

          {/* Left Metric Scale Ruler */}
          {showRuler && (
            <div className={`absolute top-4.5 bottom-0 left-0 w-6 border-r z-20 flex flex-col justify-between py-2 text-[9px] font-mono items-center pointer-events-none select-none ${
              isDarkMode 
                ? 'bg-slate-950/85 border-slate-800 text-cyan-400/70' 
                : 'bg-slate-200/90 border-slate-300 text-slate-600'
            }`}>
              <span>0m</span>
              <span>20m</span>
              <span>40m</span>
              <span>60m</span>
              <span>80m</span>
              <span>100m</span>
            </div>
          )}

          {/* Canvas Wrapper with Zoom Level and Pan Offset */}
          <div
            ref={canvasRef}
            onMouseDown={handleCanvasMouseDown}
            onTouchStart={handleCanvasTouchStart}
            style={{
              transform: `translate(${panOffset.x}px, ${panOffset.y}px) scale(${zoomLevel})`,
              transformOrigin: 'center center',
              transition: activeDragTarget ? 'none' : 'transform 0.15s ease-out'
            }}
            className={`w-full h-full relative select-none ${activeDragTarget === 'canvas' ? 'cursor-grabbing' : 'cursor-grab'}`}
          >
            {/* ===================================================================
                LAYER 0: AUTHENTIC MASTER PLOT PLAN ENGINEERING DRAWING BACKGROUND
               =================================================================== */}
            <div className="absolute inset-0 pointer-events-none select-none overflow-hidden flex items-center justify-center">
              <img 
                src={essoPlotPlanBg} 
                alt="Master Plot Plan" 
                className={`w-full h-full object-cover transition-all duration-300 pointer-events-none select-none ${
                  isDarkMode 
                    ? 'filter invert hue-rotate-180 brightness-[0.78] contrast-[1.25] opacity-60' 
                    : 'opacity-85 mix-blend-multiply'
                }`}
              />
            </div>

            {/* ===================================================================
                LAYER 0.5: VECTOR CAD BLUEPRINT OVERLAY (SVG)
               =================================================================== */}
            <svg className="absolute inset-0 w-full h-full pointer-events-none" xmlns="http://www.w3.org/2000/svg">
              <defs>
                {/* Subtle Grid Pattern */}
                <pattern id="pinCadGridSmall" width="20" height="20" patternUnits="userSpaceOnUse">
                  <path 
                    d="M 20 0 L 0 0 0 20" 
                    fill="none" 
                    stroke={isDarkMode ? 'rgba(56, 189, 248, 0.08)' : 'rgba(100, 116, 139, 0.12)'} 
                    strokeWidth="0.8" 
                  />
                </pattern>
                <pattern id="pinCadGridLarge" width="100" height="100" patternUnits="userSpaceOnUse">
                  <rect width="100" height="100" fill="url(#pinCadGridSmall)" />
                  <path 
                    d="M 100 0 L 0 0 0 100" 
                    fill="none" 
                    stroke={isDarkMode ? 'rgba(56, 189, 248, 0.20)' : 'rgba(100, 116, 139, 0.25)'} 
                    strokeWidth="1.2" 
                  />
                </pattern>
              </defs>

              {/* Background Grid */}
              {showGridOverlay && <rect width="100%" height="100%" fill="url(#pinCadGridLarge)" />}

              {/* Outer CAD Border & Sheet Border */}
              <rect 
                x="15" y="15" width="calc(100% - 30px)" height="calc(100% - 30px)" 
                fill="none" 
                stroke={isDarkMode ? '#38bdf8' : '#334155'} 
                strokeWidth="1.8" 
                strokeOpacity={isDarkMode ? '0.4' : '0.5'}
              />

              {/* Coastal Waters / River Edge */}
              <path 
                d={selectedPlant === 'Sriracha' 
                  ? "M 15 15 L 140 15 C 140 200, 100 380, 120 600 L 15 600 Z"
                  : "M 15 15 L 160 15 C 180 250, 140 420, 170 600 L 15 600 Z"
                }
                fill={isDarkMode ? "rgba(14, 165, 233, 0.06)" : "rgba(224, 242, 254, 0.7)"}
                stroke={isDarkMode ? "rgba(56, 189, 248, 0.35)" : "rgba(2, 132, 199, 0.4)"}
                strokeDasharray="4 4"
              />
              <text 
                x="35" y="320" 
                fill={isDarkMode ? '#38bdf8' : '#0369a1'} 
                fontSize="11" 
                fontFamily="monospace" 
                fontWeight="bold"
                letterSpacing="2"
                transform="rotate(-90 35 320)"
                opacity="0.65"
              >
                {selectedPlant === 'Sriracha' ? 'GULF OF THAILAND • COASTAL JETTY' : 'CHAO PHRAYA RIVER • MARINE JETTY'}
              </text>

              {/* Main Battery Limit (Plant Boundary Rectangle) */}
              <rect 
                x="28%" y="14%" width="62%" height="72%" 
                rx="20"
                fill={isDarkMode ? "rgba(30, 41, 59, 0.3)" : "rgba(255, 255, 255, 0.6)"} 
                stroke={isDarkMode ? "#0ea5e9" : "#2563eb"} 
                strokeWidth="2" 
                strokeDasharray="8 4"
                strokeOpacity="0.5"
              />
              <text 
                x="30%" y="18%" 
                fill={isDarkMode ? '#38bdf8' : '#1e40af'} 
                fontSize="9" 
                fontFamily="monospace" 
                fontWeight="bold"
                letterSpacing="1.2"
                opacity="0.85"
              >
                MAIN PROCESS BATTERY LIMIT (ISBL / OSBL)
              </text>

              {/* Major Process Units & Equipment Footprints in CAD Style */}
              {/* Storage Tanks (Floating Roofs) */}
              <circle cx="68%" cy="26%" r="30" fill="none" stroke={isDarkMode ? '#38bdf8' : '#475569'} strokeWidth="1.5" opacity="0.6" />
              <circle cx="78%" cy="26%" r="30" fill="none" stroke={isDarkMode ? '#38bdf8' : '#475569'} strokeWidth="1.5" opacity="0.6" />
              <text x="68%" y="26%" textAnchor="middle" dominantBaseline="middle" fill={isDarkMode ? '#94a3b8' : '#64748b'} fontSize="8" fontFamily="monospace">TK-3807</text>
              <text x="78%" y="26%" textAnchor="middle" dominantBaseline="middle" fill={isDarkMode ? '#94a3b8' : '#64748b'} fontSize="8" fontFamily="monospace">TK-3808</text>

              {/* Crude Distillation Column 11-C-101 */}
              <rect x="26%" y="24%" width="22" height="50" rx="3" fill="none" stroke={isDarkMode ? '#38bdf8' : '#334155'} strokeWidth="1.8" opacity="0.7" />
              <text x="27%" y="21%" fill={isDarkMode ? '#38bdf8' : '#334155'} fontSize="8" fontFamily="monospace" fontWeight="bold">11-C-101 (CDU)</text>

              {/* HCU Reactor 11-R-201 */}
              <circle cx="62%" cy="28%" r="18" fill="none" stroke={isDarkMode ? '#f43f5e' : '#e11d48'} strokeWidth="1.8" opacity="0.7" />
              <text x="62%" y="22%" textAnchor="middle" fill={isDarkMode ? '#f43f5e' : '#e11d48'} fontSize="8" fontFamily="monospace" fontWeight="bold">11-R-201 (HCU)</text>

              {/* LPG Spheres in row */}
              <circle cx="20%" cy="32%" r="16" fill="none" stroke={isDarkMode ? '#38bdf8' : '#475569'} strokeWidth="1.2" opacity="0.5" />
              <circle cx="20%" cy="40%" r="16" fill="none" stroke={isDarkMode ? '#38bdf8' : '#475569'} strokeWidth="1.2" opacity="0.5" />
              <text x="20%" y="46%" textAnchor="middle" fill={isDarkMode ? '#94a3b8' : '#64748b'} fontSize="7" fontFamily="monospace">SPHERES</text>

              {/* Pipe Rack Highway */}
              <line x1="30%" y1="56%" x2="86%" y2="56%" stroke={isDarkMode ? '#38bdf8' : '#64748b'} strokeWidth="2" strokeDasharray="3 3" opacity="0.5" />
              <text x="32%" y="54%" fill={isDarkMode ? '#94a3b8' : '#64748b'} fontSize="7.5" fontFamily="monospace">MAIN PIPEWAY 104-PW</text>

              {/* Roadway */}
              <path d="M 88% 16% L 93% 86%" stroke={isDarkMode ? '#38bdf8' : '#94a3b8'} strokeWidth="5" strokeOpacity="0.25" fill="none" />
              <text x="90%" y="50%" fill={isDarkMode ? '#38bdf8' : '#475569'} fontSize="8" fontFamily="monospace" fontWeight="bold" transform="rotate(84 90 50)">
                INTERNAL LOGISTICS ROAD
              </text>
            </svg>

            {/* Grid Coordinates Overlay Markers (ZA1-ZD6) */}
            {showGridOverlay && (
              <div className="absolute inset-0 grid grid-cols-6 grid-rows-4 pointer-events-none">
                {Array.from({ length: 24 }).map((_, i) => (
                  <div
                    key={i}
                    className={`border flex items-start justify-start p-1 ${
                      isDarkMode ? 'border-cyan-500/10' : 'border-slate-400/10'
                    }`}
                  >
                    <span className={`text-[8px] font-mono font-bold px-1 rounded ${
                      isDarkMode ? 'bg-slate-900/70 text-cyan-300/50' : 'bg-slate-200/70 text-slate-600/60'
                    }`}>
                      Z{String.fromCharCode(65 + Math.floor(i / 6))}{(i % 6) + 1}
                    </span>
                  </div>
                ))}
              </div>
            )}

            {/* ===================================================================
                SCALE BLOCK RENDER (Visible in 'area' and 'both' modes)
               =================================================================== */}
            {(markingType === 'area' || markingType === 'both') && (
              <div
                style={{
                  left: `${scaleBlock.x}%`,
                  top: `${scaleBlock.y}%`,
                  width: `${scaleBlock.width * 1.5}%`,
                  height: `${scaleBlock.height * 1.5}%`,
                  transform: `translate(-50%, -50%) rotate(${scaleBlock.rotation}deg)`
                }}
                onMouseDown={(e) => handleStartDrag('scaleBlock', e.clientX, e.clientY, e)}
                onTouchStart={(e) => {
                  if (e.touches.length > 0) {
                    handleStartDrag('scaleBlock', e.touches[0].clientX, e.touches[0].clientY, e);
                  }
                }}
                className={`absolute z-30 rounded-xl border-2 ${blockColors.border} ${blockColors.bg} shadow-2xl backdrop-blur-xs transition-shadow duration-75 flex flex-col justify-between p-1.5 group cursor-move select-none ${
                  activeDragTarget === 'scaleBlock' 
                    ? 'ring-4 ring-amber-400 scale-105 shadow-amber-500/50' 
                    : 'hover:ring-2 hover:ring-amber-400/60'
                }`}
              >
                {/* 4 Corner Steel Outrigger Mats (แผ่นรองขาช้างเหล็ก 1.5m x 1.5m ครบ 4 มุม) */}
                {scaleBlock.blockType === 'crane-footprint' && (
                  <>
                    {/* Front-Left Outrigger Pad */}
                    <div
                      className={`absolute -top-3 -left-3 w-5 h-5 rounded-xs border-2 ${blockColors.matColor} shadow-md flex items-center justify-center font-mono text-[6px] font-black group/pad cursor-help z-20`}
                      title="Front-Left Outrigger Pad: 1.5m × 1.5m Steel Mat (แผ่นรองขาช้างเหล็ก FL)"
                    >
                      <div className="w-1.5 h-1.5 rounded-full bg-slate-950 ring-1 ring-white/60" />
                      <span className="absolute -top-4 left-0 text-[7px] font-mono font-bold text-amber-200 bg-slate-950/90 px-1 rounded-xs whitespace-nowrap opacity-0 group-hover/pad:opacity-100 transition-opacity border border-amber-600/40 pointer-events-none">
                        FL 1.5m
                      </span>
                    </div>

                    {/* Front-Right Outrigger Pad */}
                    <div
                      className={`absolute -top-3 -right-3 w-5 h-5 rounded-xs border-2 ${blockColors.matColor} shadow-md flex items-center justify-center font-mono text-[6px] font-black group/pad cursor-help z-20`}
                      title="Front-Right Outrigger Pad: 1.5m × 1.5m Steel Mat (แผ่นรองขาช้างเหล็ก FR)"
                    >
                      <div className="w-1.5 h-1.5 rounded-full bg-slate-950 ring-1 ring-white/60" />
                      <span className="absolute -top-4 right-0 text-[7px] font-mono font-bold text-amber-200 bg-slate-950/90 px-1 rounded-xs whitespace-nowrap opacity-0 group-hover/pad:opacity-100 transition-opacity border border-amber-600/40 pointer-events-none">
                        FR 1.5m
                      </span>
                    </div>

                    {/* Rear-Left Outrigger Pad */}
                    <div
                      className={`absolute -bottom-3 -left-3 w-5 h-5 rounded-xs border-2 ${blockColors.matColor} shadow-md flex items-center justify-center font-mono text-[6px] font-black group/pad cursor-help z-20`}
                      title="Rear-Left Outrigger Pad: 1.5m × 1.5m Steel Mat (แผ่นรองขาช้างเหล็ก RL)"
                    >
                      <div className="w-1.5 h-1.5 rounded-full bg-slate-950 ring-1 ring-white/60" />
                      <span className="absolute -bottom-4 left-0 text-[7px] font-mono font-bold text-amber-200 bg-slate-950/90 px-1 rounded-xs whitespace-nowrap opacity-0 group-hover/pad:opacity-100 transition-opacity border border-amber-600/40 pointer-events-none">
                        RL 1.5m
                      </span>
                    </div>

                    {/* Rear-Right Outrigger Pad */}
                    <div
                      className={`absolute -bottom-3 -right-3 w-5 h-5 rounded-xs border-2 ${blockColors.matColor} shadow-md flex items-center justify-center font-mono text-[6px] font-black group/pad cursor-help z-20`}
                      title="Rear-Right Outrigger Pad: 1.5m × 1.5m Steel Mat (แผ่นรองขาช้างเหล็ก RR)"
                    >
                      <div className="w-1.5 h-1.5 rounded-full bg-slate-950 ring-1 ring-white/60" />
                      <span className="absolute -bottom-4 right-0 text-[7px] font-mono font-bold text-amber-200 bg-slate-950/90 px-1 rounded-xs whitespace-nowrap opacity-0 group-hover/pad:opacity-100 transition-opacity border border-amber-600/40 pointer-events-none">
                        RR 1.5m
                      </span>
                    </div>
                  </>
                )}

                {/* Boom Orientation Vector Arrow (ลูกศรเวกเตอร์ทิศทางบูมเครนพร้อมมุมหมุน) */}
                {scaleBlock.blockType === 'crane-footprint' && (
                  <div className="absolute -top-9 left-1/2 -translate-x-1/2 flex flex-col items-center pointer-events-none z-30 select-none">
                    {/* Arrow Head pointing forward */}
                    <div className="w-0 h-0 border-l-[7px] border-l-transparent border-r-[7px] border-r-transparent border-b-[10px] border-b-rose-500 drop-shadow-[0_0_8px_rgba(244,63,94,0.9)]" />
                    {/* Arrow Stem line */}
                    <div className="w-1 h-4 bg-gradient-to-t from-rose-500 to-rose-400 shadow-xs" />
                    {/* BOOM Vector Badge */}
                    <div className="flex items-center gap-1 px-1.5 py-0.2 rounded-xs bg-slate-950/95 border border-rose-500/80 text-rose-300 font-mono text-[7.5px] font-black shadow-lg whitespace-nowrap -mt-0.5">
                      <Compass size={8} className="text-rose-400" />
                      <span>BOOM {scaleBlock.rotation}°</span>
                    </div>
                  </div>
                )}

                {/* Top Width inside Block */}
                <div className="flex items-center justify-between pointer-events-none">
                  <span className="text-[8px] font-mono font-black uppercase px-1 py-0.2 rounded bg-slate-950/80 text-white">
                    {scaleBlock.width}m
                  </span>
                  <span className={`w-2 h-2 rounded-full ${blockColors.accent}`} />
                </div>

                {/* Center Badge with Block Label & Area */}
                <div className="text-center pointer-events-none my-auto select-none">
                  <div className="text-[10px] font-black text-white drop-shadow-md leading-tight flex items-center justify-center gap-1">
                    <Truck size={10} className="text-amber-300" />
                    <span>{scaleBlock.label || (isScaffolding ? 'Scaffold Bay' : 'Crane Footprint')}</span>
                  </div>
                  <div className="text-[8px] font-mono text-slate-100 font-bold bg-slate-950/60 px-1 py-0.2 rounded mt-0.5 inline-block">
                    {scaleBlock.width}m × {scaleBlock.height}m ({blockAreaM2} m²)
                  </div>
                </div>

                {/* Bottom Dimension & Rotation */}
                <div className="flex items-center justify-between text-[8px] font-mono font-bold text-slate-200 pointer-events-none">
                  <span>{scaleBlock.height}m</span>
                  <span>{scaleBlock.rotation}°</span>
                </div>
              </div>
            )}

            {/* ===================================================================
                PIN MARKER RENDER (Visible in 'pin' and 'both' modes)
               =================================================================== */}
            {pin && (markingType === 'pin' || markingType === 'both') && (
              <div
                style={{ left: `${pin.x}%`, top: `${pin.y}%` }}
                onMouseDown={(e) => handleStartDrag('pin', e.clientX, e.clientY, e)}
                onTouchStart={(e) => {
                  if (e.touches.length > 0) {
                    handleStartDrag('pin', e.touches[0].clientX, e.touches[0].clientY, e);
                  }
                }}
                className={`absolute -translate-x-1/2 -translate-y-1/2 z-40 flex flex-col items-center cursor-grab active:cursor-grabbing select-none ${
                  activeDragTarget === 'pin' ? 'scale-110' : ''
                }`}
              >
                {/* 360° Safety Barricade / Working Radius Radar Circle */}
                {showRadiusCircle && (
                  <div
                    style={{
                      width: `${workingRadius * 3.4}px`,
                      height: `${workingRadius * 3.4}px`,
                      minWidth: '65px',
                      minHeight: '65px'
                    }}
                    className="absolute rounded-full border-2 border-dashed border-rose-500 bg-rose-500/15 pointer-events-none -translate-x-1/2 -translate-y-1/2 left-1/2 top-1/2 flex items-center justify-center shadow-lg animate-pulse"
                  >
                    {/* Inner Drop Zone Ring */}
                    <div className="w-1/2 h-1/2 rounded-full border border-dashed border-rose-400/35 pointer-events-none" />

                    {/* Real-time Radius Label */}
                    <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-2 py-0.5 bg-slate-950/95 text-rose-300 text-[9px] font-mono rounded-md font-black shadow-xl whitespace-nowrap border border-rose-500/80 flex items-center gap-1.5 z-40">
                      <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-ping" />
                      <span>R = {workingRadius}m Barricade</span>
                    </div>

                    {/* Exclusion Zone Tag */}
                    <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 px-1.5 py-0.2 bg-slate-950/85 text-rose-300/80 text-[7px] font-mono rounded font-bold whitespace-nowrap border border-rose-900/60 pointer-events-none">
                      Exclusion Zone • แนวกันเขตอันตราย
                    </div>
                  </div>
                )}

                {/* Equipment Tag Badge */}
                <div className="px-2.5 py-0.5 rounded-full bg-slate-950/95 text-white text-[10px] font-mono font-bold shadow-xl border border-slate-700 whitespace-nowrap mb-1 flex items-center gap-1.5 pointer-events-none">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                  <span>{equipmentId || pin.label || 'Crane Center'}</span>
                </div>

                {/* Glowing Bouncing Pin Reticle */}
                <div className="relative flex items-center justify-center">
                  <div className="w-9 h-9 rounded-full bg-rose-600 text-white flex items-center justify-center shadow-2xl ring-4 ring-rose-500/40 hover:scale-110 transition-transform">
                    <MapPin size={20} className="fill-white" />
                  </div>
                  {/* Pin anchor point dot */}
                  <div className="w-2.5 h-2.5 rounded-full bg-rose-400 absolute -bottom-1 shadow-md ring-2 ring-white" />
                </div>
              </div>
            )}
          </div>

          {/* Floating Telemetry & Load Bearing Indicator Banner */}
          <div className="absolute bottom-2.5 left-2.5 right-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 pointer-events-none z-20">
            <div className={`px-3 py-1.5 rounded-xl backdrop-blur-md border text-[11px] font-medium flex items-center gap-2 shadow-lg ${
              isDarkMode 
                ? 'bg-slate-950/90 text-slate-200 border-slate-800' 
                : 'bg-white/95 text-slate-800 border-slate-200'
            }`}>
              <Info size={13} className="text-cyan-400 shrink-0" />
              <span>
                {isTh 
                  ? 'ลากหมุดหรือบล็อกบนผัง CAD เพื่อย้ายตำแหน่งพิกัด' 
                  : 'Drag pin or scale block directly to position across CAD grid.'}
              </span>
            </div>

            {/* Heavy Lift Ground Bearing Indicator Card */}
            {scaleBlock.blockType === 'crane-footprint' && (
              <div className={`px-3 py-1.5 rounded-xl backdrop-blur-md border text-[10px] font-mono flex items-center gap-2 shadow-lg ${
                isDarkMode 
                  ? 'bg-slate-950/95 text-amber-300 border-amber-500/50 shadow-amber-500/10' 
                  : 'bg-white/95 text-amber-900 border-amber-300 shadow-amber-500/10'
              }`}>
                <ShieldCheck size={14} className="text-amber-400 shrink-0" />
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="font-bold">Ground Bearing:</span>{' '}
                  <span className="font-black text-amber-400">Max ~{estimatedPeakPadLoad} T/Pad</span>{' '}
                  <span className={isDarkMode ? 'text-slate-300' : 'text-slate-700 font-semibold'}>
                    ({groundPressureKPa} kPa on 1.5m pads)
                  </span>
                  <span className="ml-1 px-1.5 py-0.2 rounded text-[8.5px] font-sans font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                    Soil Bearing Safe (&lt; 150 kPa)
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* =========================================================================
            5. QUICK SNAP TO PRESET PLANT SECTORS (Horizontal Scrollable Pills)
           ========================================================================= */}
        <div className="flex items-center gap-2 overflow-x-auto custom-scrollbar flex-nowrap pt-1 text-xs">
          <span className={`text-[11px] font-bold shrink-0 flex items-center gap-1 ${
            isDarkMode ? 'text-slate-400' : 'text-slate-500'
          }`}>
            <Building size={12} className={isDarkMode ? 'text-cyan-400' : 'text-blue-600'} />
            <span>{isTh ? 'กระโดดไปยังพิกัดยูนิต:' : 'Quick Snap Unit:'}</span>
          </span>
          <div className="flex items-center gap-1.5 flex-nowrap">
            {currentPlantZones.map((zone) => (
              <button
                key={zone.name}
                type="button"
                onClick={() => {
                  if (markingType === 'pin' || markingType === 'both') {
                    onPinChange({
                      x: zone.x,
                      y: zone.y,
                      label: zone.name,
                      radius: workingRadius
                    });
                  }
                  if (markingType === 'area' || markingType === 'both') {
                    onScaleBlockChange({
                      ...scaleBlock,
                      x: zone.x,
                      y: zone.y,
                      label: zone.name
                    });
                  }
                }}
                className={`px-2.5 py-1 rounded-lg text-[10px] font-medium transition-colors border whitespace-nowrap cursor-pointer shadow-2xs ${
                  isDarkMode 
                    ? 'bg-slate-900 hover:bg-cyan-950/60 hover:border-cyan-500 hover:text-cyan-300 text-slate-300 border-slate-800' 
                    : 'bg-white hover:bg-blue-50 hover:border-blue-300 hover:text-blue-600 text-slate-700 border-slate-200'
                }`}
              >
                {zone.zone}: {zone.name.split(' ')[0]}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
