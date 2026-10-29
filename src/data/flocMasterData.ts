// FLOC Master Data & Schema for Plant Configuration & CAD Spatial System
// Follows ISO 55001 / SAP PM 3-Tier Hierarchy: Area (L1) -> System (L2) -> Equipment (L3)

export type PlantId = 'sr' | 'pk';

export type FlocLevel = 'Area' | 'System' | 'Equipment';

export type EquipmentCategory = 
  | 'Static Equipment' 
  | 'Rotating Equipment' 
  | 'Piping & Valves' 
  | 'Electrical' 
  | 'Instrumentation' 
  | 'Civil & Structures';

export type CriticalityLevel = 'A' | 'B' | 'C';

export interface FunctionalLocation {
  id: string;               // Unique ID e.g. "floc-sr-01"
  plantId: PlantId;         // 'sr' (Sriracha) | 'pk' (Phra Khanong) | 'bc' (Bangchak Hub)
  flocCode: string;         // e.g. "SR-AREA-HCU", "SR-HCU-SYS-REACT", "SR-HCU-EQ-E204"
  name: string;             // Name e.g. "Unit 4 Hydrocracker Area (HCU)"
  level: FlocLevel;         // Area (L1) -> System (L2) -> Equipment (L3)
  parentId?: string | null; // Parent FLOC id
  category?: EquipmentCategory;
  criticality?: CriticalityLevel; // 'A' (Immediate Critical) | 'B' (Pre-Oil-in) | 'C' (Routine)
  description?: string;     // Technical scope or engineering conditions
  equipmentTag?: string;    // Tag on site e.g. "E-204", "RV-108", "V-301", "P-101A"
  xPercent?: number;        // Spatial coordinate on CAD drawing (0% - 100%)
  yPercent?: number;        // Spatial coordinate on CAD drawing (0% - 100%)
  unit?: string;            // Operating Unit name
  subSystem?: string;
  isCriticalPath?: boolean;
  plotPlanImage?: string;   // Custom Plot Plan image URL / base64 for this Area/Unit
  drawingRef?: string;      // Drawing Reference e.g. "RD-001-A Rev 28"
  attachments?: { id: string; name: string; url?: string; type?: string; sizeKb?: number }[];
}

export interface PlantMeta {
  id: PlantId;
  code: string;
  nameTh: string;
  nameEn: string;
  drawingRef: string;
  revision: string;
  coordinates: { lat: number; lng: number };
  zoneCount: number;
}

export const PLANT_REGISTRY: Record<PlantId, PlantMeta> = {
  sr: {
    id: 'sr',
    code: 'SR',
    nameTh: 'โรงกลั่นศรีราชา (Esso Sriracha Refinery)',
    nameEn: 'Sriracha Refinery Complex',
    drawingRef: 'RD-001-A Rev 28',
    revision: 'Rev 28 (2026)',
    coordinates: { lat: 13.1147, lng: 100.9167 },
    zoneCount: 14
  },
  pk: {
    id: 'pk',
    code: 'PK',
    nameTh: 'โรงกลั่นพระโขนง (Phra Khanong Refinery)',
    nameEn: 'Phra Khanong Refinery Complex',
    drawingRef: 'PK-RD-002-B Rev 19',
    revision: 'Rev 19 (2026)',
    coordinates: { lat: 13.7025, lng: 100.5962 },
    zoneCount: 10
  }
};

// INITIAL SEED FLOC DATABASE WITH PRE-CALIBRATED CAD COORDINATES
export const INITIAL_FLOC_DATA: FunctionalLocation[] = [
  // =========================================================================
  // SRIRACHA REFINERY (SR) - Drawing RD-001-A Rev 28
  // =========================================================================
  // Level 1: Area
  {
    id: 'floc-sr-area-hcu',
    plantId: 'sr',
    flocCode: 'SR-AREA-HCU',
    name: 'Unit 4 Hydrocracker Area (HCU)',
    level: 'Area',
    parentId: null,
    category: 'Civil & Structures',
    criticality: 'A',
    description: 'High pressure hydrocracking and gas oil conversion complex',
    unit: 'HCU Unit 4',
    xPercent: 54.0,
    yPercent: 62.0
  },
  {
    id: 'floc-sr-area-ccr',
    plantId: 'sr',
    flocCode: 'SR-AREA-CCR',
    name: 'Continuous Catalytic Reformer Area (CCR)',
    level: 'Area',
    parentId: null,
    category: 'Civil & Structures',
    criticality: 'A',
    description: 'Naphtha reforming and aromatic production zone',
    unit: 'CCR Unit 2',
    xPercent: 42.0,
    yPercent: 48.0
  },
  {
    id: 'floc-sr-area-tankfarm',
    plantId: 'sr',
    flocCode: 'SR-AREA-NTF',
    name: 'North Tank Farm & Interconnecting Pipe Racks',
    level: 'Area',
    parentId: null,
    category: 'Civil & Structures',
    criticality: 'B',
    description: 'Crude and intermediate product atmospheric storage tanks',
    unit: 'Tank Farm North',
    xPercent: 68.0,
    yPercent: 30.0
  },
  {
    id: 'floc-sr-area-marine',
    plantId: 'sr',
    flocCode: 'SR-AREA-MAR',
    name: 'Marine Terminal & Jetty Berth Complex',
    level: 'Area',
    parentId: null,
    category: 'Civil & Structures',
    criticality: 'A',
    description: 'Crude offloading jetty and product bunker berths',
    unit: 'Marine Berth',
    xPercent: 9.0,
    yPercent: 83.0
  },

  // Level 2: Systems (under SR-AREA-HCU)
  {
    id: 'floc-sr-sys-react',
    plantId: 'sr',
    flocCode: 'SR-HCU-SYS-REACT',
    name: 'Reactor & High Pressure Separation Loop',
    level: 'System',
    parentId: 'floc-sr-area-hcu',
    category: 'Static Equipment',
    criticality: 'A',
    description: 'Multi-bed catalytic reactors and HP separator high-pressure circuit',
    unit: 'HCU Unit 4',
    subSystem: 'Reaction Section',
    xPercent: 54.5,
    yPercent: 64.0
  },
  {
    id: 'floc-sr-sys-preheat',
    plantId: 'sr',
    flocCode: 'SR-HCU-SYS-PREHEAT',
    name: 'Feed Preheat Exchanger Train',
    level: 'System',
    parentId: 'floc-sr-area-hcu',
    category: 'Static Equipment',
    criticality: 'A',
    description: 'Combined feed-effluent heat exchanger battery bank',
    unit: 'HCU Unit 4',
    subSystem: 'Preheat Train',
    xPercent: 53.5,
    yPercent: 57.5
  },
  {
    id: 'floc-sr-sys-recycle',
    plantId: 'sr',
    flocCode: 'SR-HCU-SYS-RECYCLE',
    name: 'Hydrogen Recycle Gas Compression System',
    level: 'System',
    parentId: 'floc-sr-area-hcu',
    category: 'Rotating Equipment',
    criticality: 'A',
    description: 'Multi-stage centrifugal recycle gas compressor train',
    unit: 'HCU Unit 4',
    subSystem: 'Recycle Gas',
    xPercent: 62.8,
    yPercent: 59.5
  },
  {
    id: 'floc-sr-sys-relief',
    plantId: 'sr',
    flocCode: 'SR-HCU-SYS-RELIEF',
    name: 'Emergency Depressuring & Relief Header System',
    level: 'System',
    parentId: 'floc-sr-area-hcu',
    category: 'Piping & Valves',
    criticality: 'A',
    description: 'Safety critical emergency blowdown headers to flare',
    unit: 'HCU Unit 4',
    subSystem: 'Safety Relief',
    xPercent: 55.1,
    yPercent: 60.8
  },

  // Level 3: Equipment (SR Pre-calibrated Hotspots)
  {
    id: 'floc-sr-eq-e204',
    plantId: 'sr',
    flocCode: 'SR-HCU-EQ-E204',
    name: 'HCU Feed Preheat Exchanger Bank A',
    level: 'Equipment',
    parentId: 'floc-sr-sys-preheat',
    category: 'Static Equipment',
    criticality: 'A',
    description: 'Shell & Tube combined heat exchanger 350 degC / 160 bar',
    equipmentTag: 'E-204',
    unit: 'HCU Unit 4',
    isCriticalPath: true,
    xPercent: 50.8,
    yPercent: 57.5
  },
  {
    id: 'floc-sr-eq-e205',
    plantId: 'sr',
    flocCode: 'SR-HCU-EQ-E205',
    name: 'HCU Feed Preheat Exchanger Bank B',
    level: 'Equipment',
    parentId: 'floc-sr-sys-preheat',
    category: 'Static Equipment',
    criticality: 'A',
    description: 'Shell & Tube combined heat exchanger bank 2',
    equipmentTag: 'E-205',
    unit: 'HCU Unit 4',
    isCriticalPath: true,
    xPercent: 52.4,
    yPercent: 57.5
  },
  {
    id: 'floc-sr-eq-e206',
    plantId: 'sr',
    flocCode: 'SR-HCU-EQ-E206',
    name: 'HCU Effluent Cooler Bank C',
    level: 'Equipment',
    parentId: 'floc-sr-sys-preheat',
    category: 'Static Equipment',
    criticality: 'B',
    description: 'Process effluent fin-fan / shell bundle heat recovery',
    equipmentTag: 'E-206',
    unit: 'HCU Unit 4',
    isCriticalPath: false,
    xPercent: 54.2,
    yPercent: 57.5
  },
  {
    id: 'floc-sr-eq-e207',
    plantId: 'sr',
    flocCode: 'SR-HCU-EQ-E207',
    name: 'Stripper Reboiler Exchanger',
    level: 'Equipment',
    parentId: 'floc-sr-sys-preheat',
    category: 'Static Equipment',
    criticality: 'B',
    description: 'Thermosiphon reboiler exchanger bundle',
    equipmentTag: 'E-207',
    unit: 'HCU Unit 4',
    isCriticalPath: false,
    xPercent: 56.0,
    yPercent: 57.5
  },
  {
    id: 'floc-sr-eq-e208',
    plantId: 'sr',
    flocCode: 'SR-HCU-EQ-E208',
    name: 'Naphtha Splitter Overhead Condenser',
    level: 'Equipment',
    parentId: 'floc-sr-sys-preheat',
    category: 'Static Equipment',
    criticality: 'C',
    description: 'Air-cooled finned bundle exchanger unit',
    equipmentTag: 'E-208',
    unit: 'HCU Unit 4',
    isCriticalPath: false,
    xPercent: 57.8,
    yPercent: 57.5
  },
  {
    id: 'floc-sr-eq-r201a',
    plantId: 'sr',
    flocCode: 'SR-HCU-EQ-R201A',
    name: '1st Stage Hydrocracker Reactor',
    level: 'Equipment',
    parentId: 'floc-sr-sys-react',
    category: 'Static Equipment',
    criticality: 'A',
    description: 'Heavy wall Cr-Mo-V catalytic hydrocracking vessel',
    equipmentTag: 'R-201A',
    unit: 'HCU Unit 4',
    isCriticalPath: true,
    xPercent: 52.5,
    yPercent: 67.4
  },
  {
    id: 'floc-sr-eq-r201b',
    plantId: 'sr',
    flocCode: 'SR-HCU-EQ-R201B',
    name: '2nd Stage Hydrocracker Reactor',
    level: 'Equipment',
    parentId: 'floc-sr-sys-react',
    category: 'Static Equipment',
    criticality: 'A',
    description: 'Secondary catalytic hydroconversion reactor vessel',
    equipmentTag: 'R-201B',
    unit: 'HCU Unit 4',
    isCriticalPath: true,
    xPercent: 56.4,
    yPercent: 67.4
  },
  {
    id: 'floc-sr-eq-v202',
    plantId: 'sr',
    flocCode: 'SR-HCU-EQ-V202',
    name: 'High Pressure Cold Separator Vessel',
    level: 'Equipment',
    parentId: 'floc-sr-sys-react',
    category: 'Static Equipment',
    criticality: 'B',
    description: 'Three-phase HP gas/hydrocarbon/sour water separation vessel',
    equipmentTag: 'V-202',
    unit: 'HCU Unit 4',
    isCriticalPath: false,
    xPercent: 54.3,
    yPercent: 62.8
  },
  {
    id: 'floc-sr-eq-rv108',
    plantId: 'sr',
    flocCode: 'SR-HCU-EQ-RV108',
    name: 'HP Reactor Loop Safety Relief Valve',
    level: 'Equipment',
    parentId: 'floc-sr-sys-relief',
    category: 'Piping & Valves',
    criticality: 'A',
    description: 'Pilot-operated emergency relief valve set at 185 barG',
    equipmentTag: 'RV-108',
    unit: 'HCU Unit 4',
    isCriticalPath: true,
    xPercent: 55.1,
    yPercent: 60.8
  },
  {
    id: 'floc-sr-eq-k101',
    plantId: 'sr',
    flocCode: 'SR-HCU-EQ-K101',
    name: 'Recycle Gas Compressor House & Motor',
    level: 'Equipment',
    parentId: 'floc-sr-sys-recycle',
    category: 'Rotating Equipment',
    criticality: 'B',
    description: 'Heavy duty centrifugal compressor driven by 12MW synchronous motor',
    equipmentTag: 'K-101',
    unit: 'HCU Unit 4',
    isCriticalPath: false,
    xPercent: 62.8,
    yPercent: 59.5
  },
  {
    id: 'floc-sr-eq-p101a',
    plantId: 'sr',
    flocCode: 'SR-HCU-EQ-P101A',
    name: 'Crude Booster Pump A (Centrifugal)',
    level: 'Equipment',
    parentId: 'floc-sr-area-hcu',
    category: 'Rotating Equipment',
    criticality: 'B',
    description: 'API 610 multi-stage high pressure booster charge pump',
    equipmentTag: 'P-101A',
    unit: 'HCU Unit 4',
    isCriticalPath: false,
    xPercent: 44.6,
    yPercent: 56.3
  },
  {
    id: 'floc-sr-eq-p101b',
    plantId: 'sr',
    flocCode: 'SR-HCU-EQ-P101B',
    name: 'Crude Booster Pump B (Standby)',
    level: 'Equipment',
    parentId: 'floc-sr-area-hcu',
    category: 'Rotating Equipment',
    criticality: 'C',
    description: 'Auto-start standby charge pump with dual mechanical seals',
    equipmentTag: 'P-101B',
    unit: 'HCU Unit 4',
    isCriticalPath: false,
    xPercent: 46.1,
    yPercent: 56.3
  },
  {
    id: 'floc-sr-eq-tk3807',
    plantId: 'sr',
    flocCode: 'SR-NTF-EQ-TK3807',
    name: 'North Crude Storage Tank 3807',
    level: 'Equipment',
    parentId: 'floc-sr-area-tankfarm',
    category: 'Static Equipment',
    criticality: 'B',
    description: 'External floating roof crude oil storage tank (Capacity 80,000 m³)',
    equipmentTag: 'TK-3807',
    unit: 'Tank Farm North',
    xPercent: 64.3,
    yPercent: 20.5
  },
  {
    id: 'floc-sr-eq-tk3808',
    plantId: 'sr',
    flocCode: 'SR-NTF-EQ-TK3808',
    name: 'North Crude Storage Tank 3808',
    level: 'Equipment',
    parentId: 'floc-sr-area-tankfarm',
    category: 'Static Equipment',
    criticality: 'B',
    description: 'External floating roof crude oil storage tank (Capacity 80,000 m³)',
    equipmentTag: 'TK-3808',
    unit: 'Tank Farm North',
    xPercent: 68.5,
    yPercent: 24.2
  },
  {
    id: 'floc-sr-eq-tk3811',
    plantId: 'sr',
    flocCode: 'SR-NTF-EQ-TK3811',
    name: 'Intermediate Product Tank 3811',
    level: 'Equipment',
    parentId: 'floc-sr-area-tankfarm',
    category: 'Static Equipment',
    criticality: 'C',
    description: 'Internal floating roof heavy reformate storage tank',
    equipmentTag: 'TK-3811',
    unit: 'Tank Farm North',
    xPercent: 73.2,
    yPercent: 38.9
  },
  {
    id: 'floc-sr-eq-berth1',
    plantId: 'sr',
    flocCode: 'SR-MAR-EQ-BERTH1',
    name: 'Crude Offloading Deepwater Jetty Berth 1',
    level: 'Equipment',
    parentId: 'floc-sr-area-marine',
    category: 'Civil & Structures',
    criticality: 'A',
    description: 'Deepwater VLCC berth with 4 x 16" marine loading arms',
    equipmentTag: 'BERTH-1',
    unit: 'Marine Berth',
    isCriticalPath: true,
    xPercent: 8.6,
    yPercent: 77.9
  },
  {
    id: 'floc-sr-eq-berth3',
    plantId: 'sr',
    flocCode: 'SR-MAR-EQ-BERTH3',
    name: 'Coastal Barge Loading Jetty Berth 3',
    level: 'Equipment',
    parentId: 'floc-sr-area-marine',
    category: 'Civil & Structures',
    criticality: 'B',
    description: 'Coastal tanker & bunkering loading platform',
    equipmentTag: 'BERTH-3',
    unit: 'Marine Berth',
    xPercent: 9.3,
    yPercent: 89.5
  },

  // =========================================================================
  // PHRA KHANONG REFINERY (PK) - Drawing PK-RD-002-B Rev 19
  // =========================================================================
  {
    id: 'floc-pk-area-cdu1',
    plantId: 'pk',
    flocCode: 'PK-AREA-CDU1',
    name: 'Atmospheric Distillation Unit 1 (CDU-1)',
    level: 'Area',
    parentId: null,
    category: 'Civil & Structures',
    criticality: 'A',
    description: 'Primary atmospheric crude fractionation and desalter train',
    unit: 'CDU Unit 1',
    xPercent: 45.0,
    yPercent: 54.0
  },
  {
    id: 'floc-pk-area-tankfarm',
    plantId: 'pk',
    flocCode: 'PK-AREA-CRUDEFARM',
    name: 'North Crude Storage Tank Farm',
    level: 'Area',
    parentId: null,
    category: 'Civil & Structures',
    criticality: 'B',
    description: 'Crude receipt storage tanks and river manifold',
    unit: 'Tank Farm Central',
    xPercent: 44.0,
    yPercent: 24.0
  },
  {
    id: 'floc-pk-area-riverberth',
    plantId: 'pk',
    flocCode: 'PK-AREA-RIVER',
    name: 'Chao Phraya River Marine Offloading Berths',
    level: 'Area',
    parentId: null,
    category: 'Civil & Structures',
    criticality: 'A',
    description: 'River tanker berthing jetties along Chao Phraya River',
    unit: 'River Marine',
    xPercent: 12.0,
    yPercent: 50.0
  },

  // Level 2: Systems under PK
  {
    id: 'floc-pk-sys-fraction',
    plantId: 'pk',
    flocCode: 'PK-CDU-SYS-FRACT',
    name: 'Atmospheric Fractionation & Desalting System',
    level: 'System',
    parentId: 'floc-pk-area-cdu1',
    category: 'Static Equipment',
    criticality: 'A',
    description: 'Main distillation tower, desalting stage, and side strippers',
    unit: 'CDU Unit 1',
    subSystem: 'Fractionation',
    xPercent: 40.0,
    yPercent: 55.0
  },
  {
    id: 'floc-pk-sys-firedheat',
    plantId: 'pk',
    flocCode: 'PK-CDU-SYS-FURNACE',
    name: 'Crude Charge Fired Heater Furnaces',
    level: 'System',
    parentId: 'floc-pk-area-cdu1',
    category: 'Static Equipment',
    criticality: 'A',
    description: 'Atmospheric pipestill fired heaters with radiant and convection sections',
    unit: 'CDU Unit 1',
    subSystem: 'Fired Heaters',
    xPercent: 55.0,
    yPercent: 52.0
  },

  // Level 3: Equipment (PK Pre-calibrated Hotspots)
  {
    id: 'floc-pk-eq-v301',
    plantId: 'pk',
    flocCode: 'PK-CDU-EQ-V301',
    name: 'Crude Column Trays 1-48 (Atmospheric Distillation)',
    level: 'Equipment',
    parentId: 'floc-pk-sys-fraction',
    category: 'Static Equipment',
    criticality: 'A',
    description: 'Atmospheric crude tower with 48 valve trays, height 52 meters',
    equipmentTag: 'V-301',
    unit: 'CDU Unit 1',
    isCriticalPath: true,
    xPercent: 35.1,
    yPercent: 57.4
  },
  {
    id: 'floc-pk-eq-ds101',
    plantId: 'pk',
    flocCode: 'PK-CDU-EQ-DS101',
    name: 'Electrostatic Desalter Train Vessel',
    level: 'Equipment',
    parentId: 'floc-pk-sys-fraction',
    category: 'Static Equipment',
    criticality: 'B',
    description: 'Dual-field electrostatic transformer grids and oil water interface',
    equipmentTag: 'DS-101',
    unit: 'CDU Unit 1',
    isCriticalPath: false,
    xPercent: 42.7,
    yPercent: 50.5
  },
  {
    id: 'floc-pk-eq-f101',
    plantId: 'pk',
    flocCode: 'PK-CDU-EQ-F101',
    name: 'Atmospheric Fired Heater F-101 (Cell A)',
    level: 'Equipment',
    parentId: 'floc-pk-sys-firedheat',
    category: 'Static Equipment',
    criticality: 'A',
    description: 'Radiant coil vertical tube cabin heater with 32 Low-NOx burners',
    equipmentTag: 'F-101',
    unit: 'CDU Unit 1',
    isCriticalPath: true,
    xPercent: 52.1,
    yPercent: 51.6
  },
  {
    id: 'floc-pk-eq-f102',
    plantId: 'pk',
    flocCode: 'PK-CDU-EQ-F102',
    name: 'Atmospheric Fired Heater F-102 (Cell B)',
    level: 'Equipment',
    parentId: 'floc-pk-sys-firedheat',
    category: 'Static Equipment',
    criticality: 'A',
    description: 'Secondary crude charge furnace with convection sootblowers',
    equipmentTag: 'F-102',
    unit: 'CDU Unit 1',
    isCriticalPath: false,
    xPercent: 59.1,
    yPercent: 51.6
  },
  {
    id: 'floc-pk-eq-tk2001',
    plantId: 'pk',
    flocCode: 'PK-NTF-EQ-TK2001',
    name: 'North Crude Storage Tank 2001',
    level: 'Equipment',
    parentId: 'floc-pk-area-tankfarm',
    category: 'Static Equipment',
    criticality: 'B',
    description: 'Pontoon floating roof tank with rim seal foam fire protection',
    equipmentTag: 'TK-2001',
    unit: 'Tank Farm Central',
    xPercent: 36.4,
    yPercent: 23.7
  },
  {
    id: 'floc-pk-eq-tk2003',
    plantId: 'pk',
    flocCode: 'PK-NTF-EQ-TK2003',
    name: 'North Crude Storage Tank 2003',
    level: 'Equipment',
    parentId: 'floc-pk-area-tankfarm',
    category: 'Static Equipment',
    criticality: 'C',
    description: 'Crude receipt buffer storage tank',
    equipmentTag: 'TK-2003',
    unit: 'Tank Farm Central',
    xPercent: 53.6,
    yPercent: 23.7
  },
  {
    id: 'floc-pk-eq-berth1',
    plantId: 'pk',
    flocCode: 'PK-RIV-EQ-BERTH1',
    name: 'Chao Phraya River Oil Jetty Berth 1',
    level: 'Equipment',
    parentId: 'floc-pk-area-riverberth',
    category: 'Civil & Structures',
    criticality: 'A',
    description: 'River discharge jetty with quick connect hoses and vapor return',
    equipmentTag: 'BERTH-1',
    unit: 'River Marine',
    xPercent: 12.1,
    yPercent: 36.8
  },
  {
    id: 'floc-pk-eq-berth2',
    plantId: 'pk',
    flocCode: 'PK-RIV-EQ-BERTH2',
    name: 'Chao Phraya River Barge Berth 2',
    level: 'Equipment',
    parentId: 'floc-pk-area-riverberth',
    category: 'Civil & Structures',
    criticality: 'B',
    description: 'Refined fuel distribution barge loading rack',
    equipmentTag: 'BERTH-2',
    unit: 'River Marine',
    xPercent: 12.1,
    yPercent: 65.3
  }
];

// Helper functions for storage and operations
const STORAGE_KEY = 'plantturn_floc_hierarchy_v1';

export function getStoredFlocData(): FunctionalLocation[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        // Automatically prune any deprecated 'bc' entries from older sessions
        return parsed.filter((item: any) => item.plantId === 'sr' || item.plantId === 'pk');
      }
    }
  } catch (e) {
    console.warn('Error reading stored FLOC data:', e);
  }
  return INITIAL_FLOC_DATA;
}

export function saveFlocData(data: FunctionalLocation[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (e) {
    console.error('Error saving FLOC data:', e);
  }
}

export function resetFlocDataToDefault(): FunctionalLocation[] {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (e) {
    console.error('Error resetting FLOC data:', e);
  }
  return INITIAL_FLOC_DATA;
}
