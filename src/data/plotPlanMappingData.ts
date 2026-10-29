import { RowHighlightType } from './s2FunctionalLocationData';

export interface MappedLocationMarker {
  id: string;
  nodeId: string; // ID linking directly to Functional Location Hierarchy Tree node
  tag: string;
  name: string;
  level: number;
  levelType: 'unit' | 'system' | 'equipment' | 'component' | 'subsystem' | 'instrument' | 'custom';
  unitId: string;
  unitName: string;
  systemName: string;
  refCode?: string;
  highlight?: RowHighlightType;
  isCriticalPath?: boolean;
  description?: string;
  status: 'Ready for Turnover' | 'In Progress' | 'Completed' | 'Pending Walkdown';
  hasCatAPunch?: boolean;
  x: number; // percentage (0 - 100)
  y: number; // percentage (0 - 100)
  gridZone: string; // e.g. "B3"
  plotPlanId: string; // which plot plan this pin is mapped to
  plant?: 'Phra Khanong' | 'Sriracha';
  updatedAt?: string;
}

export interface MasterPlanConfig {
  id: string;
  name: string;
  nameTh: string;
  description: string;
  zone: string;
  unitId?: string;
  plant: 'Phra Khanong' | 'Sriracha';
  backgroundType: 'blueprint' | 'satellite' | 'custom';
  customImageUrl?: string | null;
}

// Initial Preset Master Plot Plans
export const INITIAL_MASTER_PLANS: MasterPlanConfig[] = [
  {
    id: 'plan-overall',
    name: 'Refinery Master Block • S2 Commissioning Complex',
    nameTh: 'ผังรวมโรงกลั่นพระโขนง • บล็อกระบบส่งมอบ S2',
    description: 'Overall refinery spatial layout encompassing APS-1, KHF-1, Tank Farm, and Utility Interconnect corridors.',
    zone: 'Master Battery',
    unitId: 'all',
    plant: 'Phra Khanong',
    backgroundType: 'blueprint',
    customImageUrl: null
  },
  {
    id: 'plan-aps1',
    name: 'APS-1 Detailed CAD Plot Plan (Area 10)',
    nameTh: 'ผังแบบวิศวกรรมย่อย APS-1 (พื้นที่ 10 พระโขนง)',
    description: 'Atmospheric Distillation Unit battery layout with Desalter drum, Column T-101, and Furnace F-101.',
    zone: 'Zone A - South',
    unitId: 'unit-aps1',
    plant: 'Phra Khanong',
    backgroundType: 'blueprint',
    customImageUrl: null
  },
  {
    id: 'plan-khf1',
    name: 'KHF-1 Detailed CAD Plot Plan (Area 20/30)',
    nameTh: 'ผังแบบวิศวกรรมย่อย KHF-1 (พื้นที่ 20/30 พระโขนง)',
    description: 'Kerosene Hydrotreater & Naphtha Hydrofiner reactor train, HP separator, and hydrogen recycle circuit.',
    zone: 'Zone B - Central',
    unitId: 'unit-khf1',
    plant: 'Phra Khanong',
    backgroundType: 'blueprint',
    customImageUrl: null
  },
  {
    id: 'plan-sriracha-complex',
    name: 'Bangchak Si Racha Complex Master CAD Blueprint',
    nameTh: 'ผังรวมโรงกลั่นบางจาก ศรีราชา • Complex Master Blueprint',
    description: 'Overview of Si Racha refinery processing trains, VPS-2 vacuum unit, crude distillation, and marine terminal loading docks.',
    zone: 'Si Racha Main Yard',
    unitId: 'all',
    plant: 'Sriracha',
    backgroundType: 'blueprint',
    customImageUrl: null
  },
  {
    id: 'plan-sriracha-vps2',
    name: 'Si Racha VPS-2 Vacuum Overhaul Area CAD',
    nameTh: 'ผังแบบวิศวกรรมย่อย VPS-2 (พื้นที่หน่วยสุญญากาศ ศรีราชา)',
    description: 'Vacuum Distillation Tower S2-COL-201, Vacuum Furnace S2-VF-201, and heavy bottoms transfer train.',
    zone: 'Zone SR-Vacuum',
    unitId: 'unit-vps2',
    plant: 'Sriracha',
    backgroundType: 'blueprint',
    customImageUrl: null
  }
];

// Initial Pre-Mapped Assets Linked to Functional Location Hierarchy
export const INITIAL_MAPPED_MARKERS: MappedLocationMarker[] = [
  // --- APS-1 Equipment Markers ---
  {
    id: 'map-1',
    nodeId: 'unit-aps1-eq-S2_DR_001D_180-0',
    tag: 'S2-DR-001D-180',
    name: 'S2-DR-001D-180',
    level: 3,
    levelType: 'equipment',
    unitId: 'unit-aps1',
    unitName: 'APS-1',
    systemName: 'System-11 (Crude Feed & Desalter)',
    refCode: '10-03',
    highlight: 'none',
    isCriticalPath: true,
    description: 'Desalter Drum Vessel (Primary desalting grid)',
    status: 'Ready for Turnover',
    x: 28.5,
    y: 38.0,
    gridZone: 'B3',
    plotPlanId: 'plan-overall'
  },
  {
    id: 'map-2',
    nodeId: 'unit-aps1-eq-S2_P_101A_B-4',
    tag: 'S2-P-101A/B',
    name: 'S2-P-101A/B',
    level: 3,
    levelType: 'equipment',
    unitId: 'unit-aps1',
    unitName: 'APS-1',
    systemName: 'System-11 (Crude Feed & Desalter)',
    refCode: '10-34',
    highlight: 'none',
    isCriticalPath: false,
    description: 'Raw Crude Booster Pumps A/B',
    status: 'In Progress',
    x: 23.5,
    y: 52.0,
    gridZone: 'B4',
    plotPlanId: 'plan-overall'
  },
  {
    id: 'map-3',
    nodeId: 'unit-aps1-eq-S2_HX_001_E_108C-0',
    tag: 'S2-HX-001 E-108C',
    name: 'S2-HX-001 E-108C',
    level: 3,
    levelType: 'equipment',
    unitId: 'unit-aps1',
    unitName: 'APS-1',
    systemName: 'System-12 (Atmospheric Furnace)',
    refCode: '10-05',
    highlight: 'none',
    isCriticalPath: true,
    description: 'Kerosene/Crude Exchanger Bundle',
    status: 'Ready for Turnover',
    x: 35.0,
    y: 44.5,
    gridZone: 'C3',
    plotPlanId: 'plan-overall'
  },
  {
    id: 'map-4',
    nodeId: 'unit-aps1-eq-S2_FUR_101_F_101-1',
    tag: 'S2-FUR-101 F-101',
    name: 'S2-FUR-101 F-101',
    level: 3,
    levelType: 'equipment',
    unitId: 'unit-aps1',
    unitName: 'APS-1',
    systemName: 'System-12 (Atmospheric Furnace)',
    refCode: '10-08',
    highlight: 'EWR',
    isCriticalPath: true,
    description: 'Radiant Coil Return Bends',
    status: 'In Progress',
    x: 39.5,
    y: 33.0,
    gridZone: 'C2',
    plotPlanId: 'plan-overall'
  },
  {
    id: 'map-5',
    nodeId: 'unit-aps1-eq-S2_C_101_T_101-0',
    tag: 'S2-C-101 T-101',
    name: 'S2-C-101 T-101',
    level: 3,
    levelType: 'equipment',
    unitId: 'unit-aps1',
    unitName: 'APS-1',
    systemName: 'System-13 (Crude Column Overhead)',
    refCode: '10-12',
    highlight: 'none',
    isCriticalPath: true,
    description: 'Crude Fractionation Tower Trays',
    status: 'Completed',
    x: 32.5,
    y: 60.0,
    gridZone: 'B4',
    plotPlanId: 'plan-overall'
  },

  // --- KHF-1 Equipment Markers ---
  {
    id: 'map-6',
    nodeId: 'unit-khf1-eq-S2_R_201_RX-0',
    tag: 'S2-R-201 RX',
    name: 'S2-R-201 RX',
    level: 3,
    levelType: 'equipment',
    unitId: 'unit-khf1',
    unitName: 'KHF-1',
    systemName: 'System-23 (Reactor Charge Train)',
    refCode: '20-15',
    highlight: 'none',
    isCriticalPath: true,
    description: 'Desulfurization Fixed Bed Reactor',
    status: 'Ready for Turnover',
    x: 64.0,
    y: 36.5,
    gridZone: 'E3',
    plotPlanId: 'plan-overall'
  },
  {
    id: 'map-7',
    nodeId: 'unit-khf1-eq-EWR_002_E_301E-0',
    tag: 'EWR-002 E-301E',
    name: 'EWR-002 E-301E',
    level: 3,
    levelType: 'equipment',
    unitId: 'unit-khf1',
    unitName: 'KHF-1',
    systemName: 'System-24 (HP Separator & Recycle Gas)',
    refCode: '30-09',
    highlight: 'EWR',
    isCriticalPath: true,
    description: 'Recycle Gas Trim Cooler',
    status: 'In Progress',
    x: 71.0,
    y: 43.0,
    gridZone: 'E3',
    plotPlanId: 'plan-overall'
  },
  {
    id: 'map-8',
    nodeId: 'unit-khf1-eq-S2_C_202_COMP-3',
    tag: 'S2-C-202 COMP',
    name: 'S2-C-202 COMP',
    level: 3,
    levelType: 'equipment',
    unitId: 'unit-khf1',
    unitName: 'KHF-1',
    systemName: 'System-24 (HP Separator & Recycle Gas)',
    refCode: '30-20',
    highlight: 'none',
    isCriticalPath: true,
    description: 'Recycle Hydrogen Centrifugal Compressor',
    status: 'Ready for Turnover',
    x: 76.5,
    y: 53.0,
    gridZone: 'F4',
    plotPlanId: 'plan-overall',
    plant: 'Phra Khanong'
  },

  // --- Si Racha Complex Equipment & Crane Markers ---
  {
    id: 'map-sr-1',
    nodeId: 'unit-vps2-eq-S2_VF_201-0',
    tag: 'S2-VF-201',
    name: 'S2-VF-201 Vacuum Furnace',
    level: 3,
    levelType: 'equipment',
    unitId: 'unit-vps2',
    unitName: 'VPS-2 (Si Racha)',
    systemName: 'System-SR-21 (Vacuum Heating)',
    refCode: 'SR-101',
    highlight: 'EWR',
    isCriticalPath: true,
    description: 'Vacuum Furnace Overhaul Chamber (Burner replacement & Tube Inspection)',
    status: 'In Progress',
    hasCatAPunch: true,
    x: 42.5,
    y: 35.0,
    gridZone: 'C3',
    plotPlanId: 'plan-sriracha-complex',
    plant: 'Sriracha'
  },
  {
    id: 'map-sr-2',
    nodeId: 'unit-vps2-eq-S2_COL_201-1',
    tag: 'S2-COL-201',
    name: 'S2-COL-201 Vacuum Tower',
    level: 3,
    levelType: 'equipment',
    unitId: 'unit-vps2',
    unitName: 'VPS-2 (Si Racha)',
    systemName: 'System-SR-22 (Fractionation)',
    refCode: 'SR-102',
    highlight: 'none',
    isCriticalPath: true,
    description: 'Vacuum Distillation Column Trays & Packing Walkdown',
    status: 'Ready for Turnover',
    hasCatAPunch: false,
    x: 58.0,
    y: 46.0,
    gridZone: 'D4',
    plotPlanId: 'plan-sriracha-complex',
    plant: 'Sriracha'
  },
  {
    id: 'map-sr-3',
    nodeId: 'unit-vps2-eq-S2_P_202A_B-2',
    tag: 'S2-P-202A/B',
    name: 'S2-P-202A/B VPS Bottom Pumps',
    level: 3,
    levelType: 'equipment',
    unitId: 'unit-vps2',
    unitName: 'VPS-2 (Si Racha)',
    systemName: 'System-SR-23 (Heavy Residue)',
    refCode: 'SR-103',
    highlight: 'none',
    isCriticalPath: false,
    description: 'Vacuum Residue Slurry Pumps Mechanical Seal Replacement',
    status: 'Completed',
    hasCatAPunch: false,
    x: 68.0,
    y: 62.0,
    gridZone: 'E5',
    plotPlanId: 'plan-sriracha-complex',
    plant: 'Sriracha'
  },
  {
    id: 'map-sr-crane',
    nodeId: 'crane-sr-80t-spot',
    tag: 'CR01-SR-80T',
    name: 'Kato 80T Crane (Si Racha Spot)',
    level: 3,
    levelType: 'custom',
    unitId: 'unit-vps2',
    unitName: 'VPS-2 (Si Racha)',
    systemName: 'Crane Spotting Safety Zone',
    refCode: 'CR-80',
    highlight: 'none',
    isCriticalPath: true,
    description: 'Mobile Crane 80T Lifting Position with 25m Exclusion Perimeter',
    status: 'In Progress',
    hasCatAPunch: false,
    x: 48.0,
    y: 41.0,
    gridZone: 'C4',
    plotPlanId: 'plan-sriracha-complex',
    plant: 'Sriracha'
  }
];

export const PLOT_PLAN_STORAGE_KEY = 's2_master_plot_plan_markers_v1';
export const PLOT_PLAN_UPDATED_EVENT = 's2_plot_plan_markers_updated';

// Calculate grid zone based on (x, y) percentages
export const calculateGridZone = (x: number, y: number): string => {
  const colLetters = ['A', 'B', 'C', 'D', 'E', 'F'];
  const colIndex = Math.max(0, Math.min(Math.floor((x / 100) * 6), 5));
  const rowIndex = Math.max(1, Math.min(Math.floor((y / 100) * 8) + 1, 8));
  return `${colLetters[colIndex]}${rowIndex}`;
};

// Retrieve stored markers or fallback to seed
export const getStoredMappedMarkers = (): MappedLocationMarker[] => {
  if (typeof window === 'undefined') return INITIAL_MAPPED_MARKERS;
  try {
    const raw = localStorage.getItem(PLOT_PLAN_STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(PLOT_PLAN_STORAGE_KEY, JSON.stringify(INITIAL_MAPPED_MARKERS));
      return INITIAL_MAPPED_MARKERS;
    }
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) {
      // Ensure any newly added default seed markers (such as Sriracha markers) are merged
      const missingDefaults = INITIAL_MAPPED_MARKERS.filter(
        def => !parsed.some((p: MappedLocationMarker) => p.id === def.id || p.nodeId === def.nodeId)
      );
      if (missingDefaults.length > 0) {
        const merged = [...parsed, ...missingDefaults];
        localStorage.setItem(PLOT_PLAN_STORAGE_KEY, JSON.stringify(merged));
        return merged;
      }
      return parsed;
    }
    return INITIAL_MAPPED_MARKERS;
  } catch (err) {
    console.error('Failed to read plot plan markers from localStorage:', err);
    return INITIAL_MAPPED_MARKERS;
  }
};

// Save markers to storage and notify listeners
export const saveStoredMappedMarkers = (markers: MappedLocationMarker[]): void => {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(PLOT_PLAN_STORAGE_KEY, JSON.stringify(markers));
    window.dispatchEvent(new CustomEvent(PLOT_PLAN_UPDATED_EVENT, { detail: markers }));
  } catch (err) {
    console.error('Failed to save plot plan markers to localStorage:', err);
  }
};

// Upsert a marker (insert or replace by nodeId)
export const upsertStoredMarker = (marker: MappedLocationMarker): MappedLocationMarker[] => {
  const current = getStoredMappedMarkers();
  const filtered = current.filter(m => m.nodeId !== marker.nodeId && m.id !== marker.id);
  const updated = [...filtered, { ...marker, updatedAt: new Date().toISOString() }];
  saveStoredMappedMarkers(updated);
  return updated;
};

// Remove a marker by ID or nodeId
export const deleteStoredMarker = (identifier: string): MappedLocationMarker[] => {
  const current = getStoredMappedMarkers();
  const updated = current.filter(m => m.id !== identifier && m.nodeId !== identifier);
  saveStoredMappedMarkers(updated);
  return updated;
};
