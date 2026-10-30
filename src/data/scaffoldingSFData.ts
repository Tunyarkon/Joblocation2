// =========================================================================
// SCAFFOLDING MANAGEMENT MODULE (SF01: CREATE JOB & SF02: REQUESTS LISTS)
// PlantTurn System - Industrial Scaffolding Engineering & Lifecycle Control
// Storage Key: crane_management_custom_jobs_v1
// =========================================================================

import { addDays, format, parseISO, differenceInDays } from 'date-fns';

export const SCAFFOLDING_STORAGE_KEY = 'crane_management_custom_jobs_v1';
export const SCAFFOLDING_UPDATED_EVENT = 'crane_management_custom_jobs_updated';

// Location Area options as specified
export const LOCATION_AREAS = [
  'S1 - CCR, SRU, TGCU, Utility',
  'S2 - APS-1, APS-2, FCCU, GOHF-3',
  'S3 - Offsite, Jetty'
] as const;

export type LocationAreaType = typeof LOCATION_AREAS[number];

export const LOCATION_AREA_OPTIONS = [
  {
    value: 'S1 - CCR, SRU, TGCU, Utility',
    label: 'S1 - CCR, SRU, TGCU, Utility (เขตหน่วยกลั่นที่ 1 และสาธารณูปโภค)'
  },
  {
    value: 'S2 - APS-1, APS-2, FCCU, GOHF-3',
    label: 'S2 - APS-1, APS-2, FCCU, GOHF-3 (เขตหอกลั่นน้ำมันดิบและหน่วยแตกตัวเร่งปฏิกิริยา)'
  },
  {
    value: 'S3 - Offsite, Jetty',
    label: 'S3 - Offsite, Jetty (เขตฟาร์มถังเก็บน้ำมันและท่าเรือขนถ่าย)'
  }
] as const;

// Department options
export const FUNCTIONAL_DEPARTMENTS = [
  'IMD', 'EMD', 'MSD', 'MAD', 'TMD', 'Project', 'SRD1', 'SRD2', 'SRD3', 'Other'
] as const;

export type FunctionalDepartmentType = typeof FUNCTIONAL_DEPARTMENTS[number];

export const FUNCTIONAL_DEPARTMENT_OPTIONS = [
  {
    value: 'IMD',
    label: 'IMD — แผนกบำรุงรักษาเครื่องมือวัดและระบบควบคุม (Instrument Maintenance)'
  },
  {
    value: 'EMD',
    label: 'EMD — แผนกบำรุงรักษาไฟฟ้า (Electrical Maintenance)'
  },
  {
    value: 'MSD',
    label: 'MSD — แผนกบำรุงรักษาเครื่องกลหมุน (Mechanical Rotating)'
  },
  {
    value: 'MAD',
    label: 'MAD — แผนกบำรุงรักษาอุปกรณ์นิ่งและท่อ (Mechanical Static & Piping)'
  },
  {
    value: 'TMD',
    label: 'TMD — แผนกบริหารงานหยุดซ่อมบำรุงใหญ่ (Turnaround Management)'
  },
  {
    value: 'Project',
    label: 'Project — แผนกวิศวกรรมโครงการและก่อสร้าง (Project Engineering)'
  },
  {
    value: 'SRD1',
    label: 'SRD1 — ฝ่ายปฏิบัติการกลั่นน้ำมันที่ 1 (Refinery Operations 1)'
  },
  {
    value: 'SRD2',
    label: 'SRD2 — ฝ่ายปฏิบัติการกลั่นน้ำมันที่ 2 (Refinery Operations 2)'
  },
  {
    value: 'SRD3',
    label: 'SRD3 — ฝ่ายปฏิบัติการคลังน้ำมันและท่าเรือ (Offsite & Marine Operations)'
  },
  {
    value: 'Other',
    label: 'Other — หน่วยงานอื่นๆ (Other Department)'
  }
] as const;

// Working Period options
export const WORKING_PERIODS = ['Normal hour', 'Overtime', 'Emergency call'] as const;
export type WorkingPeriodType = typeof WORKING_PERIODS[number];

// Hire Period options
export const HIRE_PERIODS = ['15 days', '30 days'] as const;
export type HirePeriodType = typeof HIRE_PERIODS[number];

// Company options
export const CONTRACTOR_COMPANIES = ['Kaefer', 'Altrad', 'Contractor A', 'Contractor B', 'Maintenance Team', 'Other'] as const;
export type ContractorCompanyType = typeof CONTRACTOR_COMPANIES[number];

// Extension Request options as specified
export const EXTENSION_REQUEST_OPTIONS = [
  { value: 'None', labelEn: 'None (No extension)', labelTh: 'None (ไม่ขอขยายเวลา - ตามกำหนดเดิม)', days: 0 },
  { value: 'Extend +7 Days', labelEn: 'Extend +7 Days (1 week)', labelTh: 'Extend +7 Days (ขยาย 1 สัปดาห์)', days: 7 },
  { value: 'Extend +15 Days', labelEn: 'Extend +15 Days (half month)', labelTh: 'Extend +15 Days (ขยายครึ่งเดือน)', days: 15 },
  { value: 'Extend +30 Days', labelEn: 'Extend +30 Days (1 month)', labelTh: 'Extend +30 Days (ขยาย 1 เดือน)', days: 30 },
  { value: 'Extend +45 Days', labelEn: 'Extend +45 Days (Turnaround)', labelTh: 'Extend +45 Days (ขยายสำหรับงาน Turnaround)', days: 45 },
  { value: 'Emergency Extension (+60 Days)', labelEn: 'Emergency Extension (+60 Days)', labelTh: 'Emergency Extension (+60 Days) (ขยายกรณีฉุกเฉิน)', days: 60 },
  // Compatibility aliases
  { value: '+7 Days', labelEn: 'Extend +7 Days', labelTh: 'ขอขยายเวลา +7 วัน', days: 7 },
  { value: '+15 Days', labelEn: 'Extend +15 Days', labelTh: 'ขอขยายเวลา +15 วัน', days: 15 },
  { value: '+30 Days', labelEn: 'Extend +30 Days', labelTh: 'ขอขยายเวลา +30 วัน', days: 30 },
  { value: '+45 Days', labelEn: 'Extend +45 Days', labelTh: 'ขอขยายเวลา +45 วัน', days: 45 },
  { value: '+60 Days', labelEn: 'Emergency Extension (+60 Days)', labelTh: 'ขยายเวลาฉุกเฉิน (+60 วัน)', days: 60 }
] as const;

export type ExtensionRequestType = typeof EXTENSION_REQUEST_OPTIONS[number]['value'];

// Equipment Tag preset dictionary with snap metadata (12 Catalogs Spec)
export interface EquipmentPreset {
  tag: string;
  nameEn: string;
  nameTh: string;
  zone: LocationAreaType;
  plant: 'Sriracha' | 'Phra Khanong';
  gridZone: string;
  x: number; // percentage 0-100 on CAD plot plan
  y: number; // percentage 0-100 on CAD plot plan
  defaultRadius: number; // Drop-zone radius in meters
  defaultScale: {
    width: number;
    length: number;
    height: number;
    tiers: number;
  };
}

export const PRESET_EQUIPMENT_TAGS: EquipmentPreset[] = [
  // S1 Presets (CCR, SRU, TGCU, Utility)
  {
    tag: '21-R-101',
    nameEn: 'CCR Platforming Reactor #1',
    nameTh: 'รีแอคเตอร์เพิ่มออกเทน CCR #1 (S1)',
    zone: 'S1 - CCR, SRU, TGCU, Utility',
    plant: 'Sriracha',
    gridZone: 'A2',
    x: 20.5,
    y: 26.0,
    defaultRadius: 6,
    defaultScale: { width: 6, length: 6, height: 14, tiers: 4 }
  },
  {
    tag: '22-F-101',
    nameEn: 'SRU Thermal Reactor & Waste Heat Boiler',
    nameTh: 'เตาเผาและหม้อน้ำกู้ความร้อน SRU (S1)',
    zone: 'S1 - CCR, SRU, TGCU, Utility',
    plant: 'Sriracha',
    gridZone: 'A3',
    x: 28.0,
    y: 34.0,
    defaultRadius: 8,
    defaultScale: { width: 8, length: 8, height: 12, tiers: 4 }
  },
  {
    tag: '23-C-104',
    nameEn: 'TGCU Amine Absorber Column',
    nameTh: 'หอดูดซับเอมีน TGCU (S1)',
    zone: 'S1 - CCR, SRU, TGCU, Utility',
    plant: 'Sriracha',
    gridZone: 'A4',
    x: 32.5,
    y: 22.0,
    defaultRadius: 8,
    defaultScale: { width: 5, length: 6, height: 18, tiers: 5 }
  },
  {
    tag: '25-B-201',
    nameEn: 'Utility High-Pressure Steam Boiler #2',
    nameTh: 'หม้อกำเนิดไอน้ำแรงดันสูง #2 ยูทิลิตี้ (S1)',
    zone: 'S1 - CCR, SRU, TGCU, Utility',
    plant: 'Sriracha',
    gridZone: 'A4',
    x: 18.0,
    y: 44.0,
    defaultRadius: 10,
    defaultScale: { width: 10, length: 12, height: 15, tiers: 5 }
  },

  // S2 Presets (APS-1, APS-2, FCCU, GOHF-3)
  {
    tag: '11-C-101',
    nameEn: 'Atmospheric Crude Distillation Column',
    nameTh: 'หอกลั่นน้ำมันดิบบรรยากาศ 11-C-101 (S2)',
    zone: 'S2 - APS-1, APS-2, FCCU, GOHF-3',
    plant: 'Sriracha',
    gridZone: 'B2',
    x: 56.5,
    y: 32.0,
    defaultRadius: 8,
    defaultScale: { width: 6, length: 8, height: 18.5, tiers: 9 }
  },
  {
    tag: '11-E-102B',
    nameEn: 'Overhead Condenser Exchanger Bundle',
    nameTh: 'ชุดแลกเปลี่ยนความร้อนคอนเดนเซอร์ยอดหอ (S2)',
    zone: 'S2 - APS-1, APS-2, FCCU, GOHF-3',
    plant: 'Sriracha',
    gridZone: 'B3',
    x: 62.0,
    y: 38.0,
    defaultRadius: 6,
    defaultScale: { width: 5, length: 7, height: 10, tiers: 3 }
  },
  {
    tag: '11-H-101',
    nameEn: 'Atmospheric Charge Heater Burner Deck',
    nameTh: 'เตาเผาป้อนหอกลั่นบรรยากาศและ Burner Deck (S2)',
    zone: 'S2 - APS-1, APS-2, FCCU, GOHF-3',
    plant: 'Sriracha',
    gridZone: 'C2',
    x: 48.0,
    y: 28.0,
    defaultRadius: 10,
    defaultScale: { width: 8, length: 10, height: 14, tiers: 4 }
  },
  {
    tag: '12-R-201',
    nameEn: 'FCCU Reactor Riser & Regenerator Cyclone',
    nameTh: 'รีแอคเตอร์และไซโคลนหน่วย FCCU (S2)',
    zone: 'S2 - APS-1, APS-2, FCCU, GOHF-3',
    plant: 'Sriracha',
    gridZone: 'C3',
    x: 68.5,
    y: 45.0,
    defaultRadius: 8,
    defaultScale: { width: 7, length: 9, height: 24, tiers: 6 }
  },
  {
    tag: '14-C-301',
    nameEn: 'GOHF-3 Hydrofiner Stripper Tower',
    nameTh: 'หอสตรีปเปอร์หน่วยไฮโดรไฟเนอร์ GOHF-3 (S2)',
    zone: 'S2 - APS-1, APS-2, FCCU, GOHF-3',
    plant: 'Sriracha',
    gridZone: 'C4',
    x: 54.0,
    y: 42.0,
    defaultRadius: 7,
    defaultScale: { width: 5, length: 6, height: 16, tiers: 5 }
  },

  // S3 Presets (Offsite, Jetty)
  {
    tag: '31-TK-105',
    nameEn: 'Offsite Crude Oil Floating Roof Tank #105',
    nameTh: 'ถังเก็บน้ำมันดิบหลังคาลอย #105 ออฟไซต์ (S3)',
    zone: 'S3 - Offsite, Jetty',
    plant: 'Sriracha',
    gridZone: 'D4',
    x: 78.0,
    y: 68.0,
    defaultRadius: 14,
    defaultScale: { width: 14, length: 14, height: 16, tiers: 4 }
  },
  {
    tag: '32-TK-204',
    nameEn: 'Spherical LPG Pressurized Storage Vessel',
    nameTh: 'ถังเก็บแก๊ส LPG ทรงกลมแรงดันสูง #204 (S3)',
    zone: 'S3 - Offsite, Jetty',
    plant: 'Sriracha',
    gridZone: 'D5',
    x: 84.0,
    y: 76.0,
    defaultRadius: 12,
    defaultScale: { width: 12, length: 12, height: 18, tiers: 5 }
  },
  {
    tag: '41-MLA-02',
    nameEn: 'Marine Jetty Berth #2 Loading Arm Structure',
    nameTh: 'โครงสร้างแขนจ่ายน้ำมันท่าเทียบเรือ Berth #2 (S3)',
    zone: 'S3 - Offsite, Jetty',
    plant: 'Sriracha',
    gridZone: 'D6',
    x: 92.0,
    y: 84.0,
    defaultRadius: 10,
    defaultScale: { width: 6, length: 10, height: 12, tiers: 3 }
  }
];

// Main Scaffolding Job Record Specification
export interface ScaffoldingSFJob {
  id: string; // e.g. "SF-2026-0842"
  jobId: string;
  jobNo?: string;
  sfNo?: string;
  eventName?: string;
  eventCode?: string;
  type?: string;
  jobDescription: string;
  description?: string;
  locationArea: LocationAreaType;
  area?: string;
  plant?: string;
  equipmentTag: string;
  equipmentId?: string;
  functionalDepartment: FunctionalDepartmentType;
  functionalLocation?: string;
  siteSurveyPhoto?: {
    name: string;
    size: number;
    url?: string;
    type?: string;
  } | null;
  maxLoadKg: number;
  maxWorkers: number;
  maxLiftingLoadKg: number;
  workingPeriod: WorkingPeriodType;
  hirePeriod: HirePeriodType;
  company: ContractorCompanyType;
  contractor?: string;
  heavyDuty: 'Y' | 'N';
  specialPurpose: 'Y' | 'N';
  requiredDate: string; // YYYY-MM-DD
  dateFrom?: string;
  offHireDate: string; // YYYY-MM-DD (Auto-calculated from requiredDate + hirePeriod + extension)
  isArea?: boolean;
  width?: number;
  length?: number;
  height?: number;
  elevationHeight?: number;
  rotation?: number;
  x?: number;
  y?: number;
  markingLocation: {
    x: number;
    y: number;
    gridZone: string;
    dropZoneRadius: number; // in meters
    scaleBlock: {
      width: number; // m
      length: number; // m
      height: number; // m
      tiers: number;
      rotation: number;
      color: string;
    };
    description?: string;
  };

  // Lifecycle Stage: 1. Execution (Yellow Tag) | 2. In-use (Green Tag) | 3. Dismantle (Red Tag)
  lifecycleStage?: 'Execution' | 'In-use' | 'Dismantle';
  // Job Status: 'Requested' | 'Approved' | 'Rejected' | 'In Progress' | 'Completed' | 'Under Review'
  status: 'Requested' | 'Approved' | 'Rejected' | 'In Progress' | 'Completed' | 'Under Review';
  requestStatus?: string;
  workflowState?: string;
  requestDate?: string;
  jobType?: 'BCP Job' | 'Contractor Job';
  scaffoldType: 'Standard' | 'Heavy Duty' | '360° Ring' | 'Cantilever' | 'Suspended' | string;
  progress?: number; // 0 - 100%
  priority?: 'Normal' | 'Urgent' | 'Emergency';
  approvalRemarks?: string;
  rejectionRemarks?: string;
  fieldChecklist?: {
    sitePreparation?: boolean;
    materialInspection?: boolean;
    qualityCheck?: boolean;
    finalInspection?: boolean;
  };

  // SF02: Scaffold Estimate (6 fields spec)
  estimate?: {
    isEvaluated: boolean;
    baseHeight: number; // m >= 0
    length: number; // m > 0
    height: number; // m > 0
    weight: number; // m > 0 (bay span width)
    volume: number; // m³
    autoCalculateVolume: boolean;
    drawingFile?: {
      name: string;
      size: number | string;
      url?: string;
      type?: string;
      uploadedAt?: string;
    } | null;
    topElevation?: number; // baseHeight + height
    baseFootprintM2?: number; // length * weight
    evaluatedAt?: string;
    evaluatedBy?: string;
  } | null;

  // Alternate scaffold estimate field structure matching raw JSON
  scaffoldEstimate?: {
    baseHeight: number;
    lengthM: number;
    heightM: number;
    weightM: number;
    volumeM3: number;
    drawingFile?: {
      name: string;
      size: string | number;
      type: string;
      url?: string;
      uploadedAt?: string;
    } | null;
  };

  // SF02: Execution / In-use / Dismantle Hire Control Spec
  hireControl?: {
    onHireDate: string; // By Contractor
    offHireDate: string; // By Contractor
    extensionRequest: ExtensionRequestType; // By Requestor
    originalOffHireDate: string;
    totalDays: number;
    tagType: 'Yellow' | 'Green' | 'Red';
    contractorBy?: string;
    requestorBy?: string;
    scaffoldTag?: string;
    updatedAt?: string;
  };

  // Alternate scaffold execution field structure matching raw JSON
  scaffoldExecution?: {
    phase: 'Execution' | 'In-use' | 'Dismantle';
    onHireDate: string;
    offHireDate: string;
    extensionRequest: string;
    contractorBy: string;
    requestorBy: string;
    scaffoldTag: string;
  };

  attachments?: any[];
  tags?: string[];
  requestorName?: string;
  createdAt?: string;
  updatedAt?: string;
}

// Bulk Insert Sample Jobs (SAMPLE_SCAFFOLD_JOBS)
export interface BulkScaffoldSample {
  id: string;
  description: string;
  plant: string;
  machineType: string;
  capacity: number;
  startDate: string;
  endDate: string;
  startTime: string;
  endTime: string;
  contractor: string;
  priority: 'Normal' | 'High' | 'Urgent';
  x: number;
  y: number;
  remarks: string;
}

export const SAMPLE_SCAFFOLD_JOBS: BulkScaffoldSample[] = [
  {
    id: "row-s1",
    description: "Erect perimeter access scaffolding for Furnace 11-H-101 Burner Deck",
    plant: "BCP Refinery",
    machineType: "Modular System Scaffold",
    capacity: 20,
    startDate: "2026-09-25",
    endDate: "2026-09-28",
    startTime: "08:00",
    endTime: "17:00",
    contractor: "Contractor B (Piping & Structural)",
    priority: "Urgent",
    x: 35.5,
    y: 42.0,
    remarks: "Green tag handover certification required before hot work."
  },
  {
    id: "row-s2",
    description: "Cantilever platform scaffolding for Column 11-C-101 Tray #22 nozzle repair",
    plant: "Hydrocracking Unit (HCU-1)",
    machineType: "Cantilever Scaffolding",
    capacity: 12,
    startDate: "2026-09-26",
    endDate: "2026-09-27",
    startTime: "08:00",
    endTime: "16:00",
    contractor: "Maintenance Team",
    priority: "High",
    x: 52.0,
    y: 58.5,
    remarks: "Safety harness 100% tie-off requirement."
  },
  {
    id: "row-s3",
    description: "Mobile rolling tower scaffolding for valve inspection at Piperack P-08",
    plant: "Zone 1 (Process)",
    machineType: "Mobile Tower Scaffold",
    capacity: 8,
    startDate: "2026-09-25",
    endDate: "2026-09-25",
    startTime: "09:00",
    endTime: "14:00",
    contractor: "Operations Dept",
    priority: "Normal",
    x: 64.2,
    y: 33.1,
    remarks: "Outrigger wheel locks must be engaged."
  }
];

// Mock Areas on Plot Plan View (mockAreas)
export interface MockArea {
  id: string;
  x: number;
  y: number;
  w: number;
  h: number;
  label: string;
  status: string;
  color: string;
  jobNo: string;
}

export const mockAreas: MockArea[] = [
  {
    id: "area-req-1",
    x: 20,
    y: 35,
    w: 15,
    h: 12,
    label: "Zone S1 (CCR / SRU)",
    status: "Approved",
    color: "green",
    jobNo: "SF-2026-0841"
  },
  {
    id: "area-req-2",
    x: 62,
    y: 32,
    w: 16,
    h: 14,
    label: "Zone S2 (APS-1 / FCCU)",
    status: "In Progress",
    color: "orange",
    jobNo: "SF-2026-0842"
  },
  {
    id: "area-req-3",
    x: 48,
    y: 74,
    w: 22,
    h: 10,
    label: "Zone S3 (Tank Farm & Jetty)",
    status: "Requested",
    color: "gray",
    jobNo: "SF-2026-0843"
  }
];

// Helpers for Date Calculations
export function calculateInitialOffHireDate(requiredDate: string, hirePeriod: HirePeriodType): string {
  try {
    const base = parseISO(requiredDate);
    if (isNaN(base.getTime())) return requiredDate;
    const daysToAdd = hirePeriod === '30 days' ? 30 : 15;
    return format(addDays(base, daysToAdd), 'yyyy-MM-dd');
  } catch {
    return requiredDate;
  }
}

export function calculateExtendedOffHireDate(baseOffHireDate: string, extension: ExtensionRequestType | string): string {
  try {
    const extObj = EXTENSION_REQUEST_OPTIONS.find(e => e.value === extension);
    let days: number = extObj ? extObj.days : 0;
    if (days === 0 && typeof extension === 'string') {
      const match = extension.match(/(\d+)/);
      if (match) days = parseInt(match[1], 10);
    }
    if (days === 0) return baseOffHireDate;
    const base = parseISO(baseOffHireDate);
    if (isNaN(base.getTime())) return baseOffHireDate;
    return format(addDays(base, days), 'yyyy-MM-dd');
  } catch {
    return baseOffHireDate;
  }
}

export function calculateTotalHireDays(onHireDate: string, offHireDate: string): number {
  try {
    const d1 = parseISO(onHireDate);
    const d2 = parseISO(offHireDate);
    if (isNaN(d1.getTime()) || isNaN(d2.getTime())) return 0;
    return Math.max(1, differenceInDays(d2, d1) + 1);
  } catch {
    return 0;
  }
}

// Initial Preset Jobs in SF01 & SF02 (8 Initial Jobs Spec)
export const INITIAL_SCAFFOLDING_JOBS: ScaffoldingSFJob[] = [
  {
    id: "SF-2026-0841",
    jobId: "SF-2026-0841",
    jobNo: "SF-2026-0841",
    eventName: "Annual Turnaround 2026",
    eventCode: "EVT-TA-2026-01",
    equipmentId: "11-C-101",
    equipmentTag: "11-C-101",
    functionalLocation: "IMD",
    functionalDepartment: "IMD",
    plant: "S2 - APS-1, APS-2, FCCU, GOHF-3",
    locationArea: "S2 - APS-1, APS-2, FCCU, GOHF-3",
    description: "Erect access scaffold at Crude Column 11-C-101 Manhole #3 & #4",
    jobDescription: "Erect access scaffold at Crude Column 11-C-101 Manhole #3 & #4",
    type: "Heavy Duty Engineered Scaffold",
    scaffoldType: "Heavy Duty",
    dateFrom: "2026-09-01 08:30",
    requiredDate: "2026-09-01",
    offHireDate: "2026-09-16",
    status: "Requested",
    contractor: "Kaefer",
    company: "Kaefer",
    maxLoadKg: 450,
    maxWorkers: 4,
    maxLiftingLoadKg: 150,
    workingPeriod: "Normal hour",
    hirePeriod: "15 days",
    heavyDuty: "Y",
    specialPurpose: "N",
    progress: 25,
    priority: "Normal",
    jobType: "BCP Job",
    x: 28.0,
    y: 35.0,
    isArea: true,
    width: 3.0,
    height: 4.0,
    elevationHeight: 6.0,
    rotation: 0,
    markingLocation: {
      x: 28.0,
      y: 35.0,
      gridZone: "B2",
      dropZoneRadius: 8,
      scaleBlock: {
        width: 3.0,
        length: 4.0,
        height: 6.0,
        tiers: 3,
        rotation: 0,
        color: "#f59e0b"
      },
      description: "Manhole #3 & #4 at Column 11-C-101"
    },
    estimate: {
      isEvaluated: true,
      baseHeight: 0,
      length: 4.0,
      height: 6.0,
      weight: 3.0,
      volume: 72.0,
      autoCalculateVolume: true,
      drawingFile: {
        name: "SF02_Scaffold_Sketch_101_RevA.pdf",
        size: "1,240.5 KB",
        type: "application/pdf",
        url: "https://images.unsplash.com/photo-1503387762-592deb58ef4e?auto=format&fit=crop&w=900&q=80",
        uploadedAt: "2026-09-24 09:15"
      },
      topElevation: 6.0,
      baseFootprintM2: 12.0,
      evaluatedAt: "2026-09-24 09:15",
      evaluatedBy: "Kaefer Site Supervisor"
    },
    scaffoldEstimate: {
      baseHeight: 0,
      lengthM: 4.0,
      heightM: 6.0,
      weightM: 3.0,
      volumeM3: 72.0,
      drawingFile: {
        name: "SF02_Scaffold_Sketch_101_RevA.pdf",
        size: "1,240.5 KB",
        type: "application/pdf",
        url: "https://images.unsplash.com/photo-1503387762-592deb58ef4e?auto=format&fit=crop&w=900&q=80",
        uploadedAt: "2026-09-24 09:15"
      }
    },
    hireControl: {
      onHireDate: "2026-09-01",
      offHireDate: "2026-09-16",
      extensionRequest: "None",
      originalOffHireDate: "2026-09-16",
      totalDays: 16,
      tagType: "Yellow",
      contractorBy: "Kaefer Site Supervisor",
      requestorBy: "IMD Area Engineer",
      scaffoldTag: "Yellow Tag (Execution)",
      updatedAt: "2026-09-01 08:30"
    },
    scaffoldExecution: {
      phase: "Execution",
      onHireDate: "2026-09-01",
      offHireDate: "2026-09-16",
      extensionRequest: "None",
      contractorBy: "Kaefer Site Supervisor",
      requestorBy: "IMD Area Engineer",
      scaffoldTag: "Yellow Tag (Execution)"
    },
    lifecycleStage: "Execution",
    createdAt: "2026-08-30T08:00:00Z",
    updatedAt: "2026-09-01T08:30:00Z"
  },
  {
    id: "SF-2026-0842",
    jobId: "SF-2026-0842",
    jobNo: "SF-2026-0842",
    equipmentId: "12-R-201",
    equipmentTag: "12-R-201",
    functionalLocation: "EMD",
    functionalDepartment: "EMD",
    plant: "S1 - CCR, SRU, TGCU, Utility",
    locationArea: "S1 - CCR, SRU, TGCU, Utility",
    description: "Open Top M/H & Valve Replacement Platform at FCCU 12-R-201",
    jobDescription: "Open Top M/H & Valve Replacement Platform at FCCU 12-R-201",
    type: "Standard System Scaffold",
    scaffoldType: "Standard",
    dateFrom: "2026-09-02 08:30",
    requiredDate: "2026-09-02",
    offHireDate: "2026-10-17",
    status: "Requested",
    contractor: "Altrad",
    company: "Altrad",
    maxLoadKg: 500,
    maxWorkers: 4,
    maxLiftingLoadKg: 100,
    workingPeriod: "Normal hour",
    hirePeriod: "30 days",
    heavyDuty: "N",
    specialPurpose: "N",
    progress: 75,
    priority: "Normal",
    jobType: "Contractor Job",
    x: 41.0,
    y: 52.0,
    isArea: true,
    width: 4.5,
    height: 6.0,
    elevationHeight: 9.0,
    rotation: 15,
    markingLocation: {
      x: 41.0,
      y: 52.0,
      gridZone: "A2",
      dropZoneRadius: 7,
      scaleBlock: {
        width: 4.5,
        length: 6.0,
        height: 9.0,
        tiers: 4,
        rotation: 15,
        color: "#10b981"
      },
      description: "Platform at FCCU 12-R-201"
    },
    estimate: {
      isEvaluated: true,
      baseHeight: 2.0,
      length: 6.0,
      height: 9.0,
      weight: 4.5,
      volume: 243.0,
      autoCalculateVolume: true,
      drawingFile: {
        name: "SF02_Scaffold_Sketch_102_RevA.pdf",
        size: "950.0 KB",
        type: "application/pdf",
        url: "https://images.unsplash.com/photo-1503387762-592deb58ef4e?auto=format&fit=crop&w=900&q=80",
        uploadedAt: "2026-09-24 09:15"
      },
      topElevation: 11.0,
      baseFootprintM2: 27.0,
      evaluatedAt: "2026-09-24 09:15",
      evaluatedBy: "Altrad Site Supervisor"
    },
    scaffoldEstimate: {
      baseHeight: 2.0,
      lengthM: 6.0,
      heightM: 9.0,
      weightM: 4.5,
      volumeM3: 243.0,
      drawingFile: {
        name: "SF02_Scaffold_Sketch_102_RevA.pdf",
        size: "950.0 KB",
        type: "application/pdf",
        url: "https://images.unsplash.com/photo-1503387762-592deb58ef4e?auto=format&fit=crop&w=900&q=80",
        uploadedAt: "2026-09-24 09:15"
      }
    },
    hireControl: {
      onHireDate: "2026-09-02",
      offHireDate: "2026-10-17",
      extensionRequest: "Extend +15 Days",
      originalOffHireDate: "2026-10-02",
      totalDays: 46,
      tagType: "Green",
      contractorBy: "Altrad Site Supervisor",
      requestorBy: "EMD Area Engineer",
      scaffoldTag: "Green Tag (In-use)",
      updatedAt: "2026-09-02 08:30"
    },
    scaffoldExecution: {
      phase: "In-use",
      onHireDate: "2026-09-02",
      offHireDate: "2026-10-17",
      extensionRequest: "Extend +15 Days",
      contractorBy: "Altrad Site Supervisor",
      requestorBy: "EMD Area Engineer",
      scaffoldTag: "Green Tag (In-use)"
    },
    lifecycleStage: "In-use",
    createdAt: "2026-09-01T08:00:00Z",
    updatedAt: "2026-09-02T08:30:00Z"
  },
  {
    id: "SF-2026-0843",
    jobId: "SF-2026-0843",
    jobNo: "SF-2026-0843",
    equipmentId: "22-F-101",
    equipmentTag: "22-F-101",
    functionalLocation: "MSD",
    functionalDepartment: "MSD",
    plant: "S3 - Offsite, Jetty",
    locationArea: "S3 - Offsite, Jetty",
    description: "Pipe rack overhead tie-in access scaffold at SRU 22-F-101",
    jobDescription: "Pipe rack overhead tie-in access scaffold at SRU 22-F-101",
    type: "360° Column Ring Scaffold",
    scaffoldType: "360° Ring",
    dateFrom: "2026-09-03 08:30",
    requiredDate: "2026-09-03",
    offHireDate: "2026-09-18",
    status: "Requested",
    contractor: "Contractor A",
    company: "Contractor A",
    maxLoadKg: 400,
    maxWorkers: 3,
    maxLiftingLoadKg: 80,
    workingPeriod: "Normal hour",
    hirePeriod: "15 days",
    heavyDuty: "N",
    specialPurpose: "Y",
    progress: 25,
    priority: "Normal",
    jobType: "Contractor Job",
    x: 54.0,
    y: 69.0,
    isArea: true,
    width: 3.0,
    height: 8.0,
    elevationHeight: 12.0,
    rotation: 30,
    markingLocation: {
      x: 54.0,
      y: 69.0,
      gridZone: "D4",
      dropZoneRadius: 8,
      scaleBlock: {
        width: 3.0,
        length: 8.0,
        height: 12.0,
        tiers: 5,
        rotation: 30,
        color: "#f59e0b"
      },
      description: "Pipe rack overhead tie-in at 22-F-101"
    },
    estimate: {
      isEvaluated: true,
      baseHeight: 4.5,
      length: 8.0,
      height: 12.0,
      weight: 3.0,
      volume: 288.0,
      autoCalculateVolume: true,
      drawingFile: null,
      topElevation: 16.5,
      baseFootprintM2: 24.0,
      evaluatedAt: "2026-09-03 10:00",
      evaluatedBy: "Contractor A Site Supervisor"
    },
    scaffoldEstimate: {
      baseHeight: 4.5,
      lengthM: 8.0,
      heightM: 12.0,
      weightM: 3.0,
      volumeM3: 288.0,
      drawingFile: null
    },
    hireControl: {
      onHireDate: "2026-09-03",
      offHireDate: "2026-09-18",
      extensionRequest: "None",
      originalOffHireDate: "2026-09-18",
      totalDays: 16,
      tagType: "Yellow",
      contractorBy: "Contractor A Site Supervisor",
      requestorBy: "MSD Area Engineer",
      scaffoldTag: "Yellow Tag (Execution)",
      updatedAt: "2026-09-03 08:30"
    },
    scaffoldExecution: {
      phase: "Execution",
      onHireDate: "2026-09-03",
      offHireDate: "2026-09-18",
      extensionRequest: "None",
      contractorBy: "Contractor A Site Supervisor",
      requestorBy: "MSD Area Engineer",
      scaffoldTag: "Yellow Tag (Execution)"
    },
    lifecycleStage: "Execution",
    createdAt: "2026-09-02T09:00:00Z",
    updatedAt: "2026-09-03T08:30:00Z"
  },
  {
    id: "SF-2026-0844",
    jobId: "SF-2026-0844",
    jobNo: "SF-2026-0844",
    equipmentId: "25-B-201",
    equipmentTag: "25-B-201",
    functionalLocation: "MAD",
    functionalDepartment: "MAD",
    plant: "S2 - APS-1, APS-2, FCCU, GOHF-3",
    locationArea: "S2 - APS-1, APS-2, FCCU, GOHF-3",
    description: "Internal boiler furnace birdcage scaffold at Utility 25-B-201",
    jobDescription: "Internal boiler furnace birdcage scaffold at Utility 25-B-201",
    type: "Cantilever / Hanging Platform",
    scaffoldType: "Cantilever",
    dateFrom: "2026-09-04 08:30",
    requiredDate: "2026-09-04",
    offHireDate: "2026-09-26",
    status: "In Progress",
    progress: 50,
    contractor: "Contractor B",
    company: "Contractor B",
    maxLoadKg: 650,
    maxWorkers: 5,
    maxLiftingLoadKg: 150,
    workingPeriod: "Normal hour",
    hirePeriod: "15 days",
    heavyDuty: "Y",
    specialPurpose: "Y",
    priority: "Urgent",
    jobType: "BCP Job",
    x: 67.0,
    y: 21.0,
    isArea: true,
    width: 4.5,
    height: 10.0,
    elevationHeight: 15.0,
    rotation: 45,
    markingLocation: {
      x: 67.0,
      y: 21.0,
      gridZone: "C2",
      dropZoneRadius: 10,
      scaleBlock: {
        width: 4.5,
        length: 10.0,
        height: 15.0,
        tiers: 6,
        rotation: 45,
        color: "#10b981"
      },
      description: "Internal boiler birdcage 25-B-201"
    },
    estimate: {
      isEvaluated: true,
      baseHeight: 0,
      length: 10.0,
      height: 15.0,
      weight: 4.5,
      volume: 675.0,
      autoCalculateVolume: true,
      drawingFile: {
        name: "SF02_Scaffold_Sketch_104_RevA.pdf",
        size: "1,450.0 KB",
        type: "application/pdf",
        url: "https://images.unsplash.com/photo-1503387762-592deb58ef4e?auto=format&fit=crop&w=900&q=80",
        uploadedAt: "2026-09-24 09:15"
      },
      topElevation: 15.0,
      baseFootprintM2: 45.0,
      evaluatedAt: "2026-09-24 09:15",
      evaluatedBy: "Contractor B Site Supervisor"
    },
    scaffoldEstimate: {
      baseHeight: 0,
      lengthM: 10.0,
      heightM: 15.0,
      weightM: 4.5,
      volumeM3: 675.0,
      drawingFile: {
        name: "SF02_Scaffold_Sketch_104_RevA.pdf",
        size: "1,450.0 KB",
        type: "application/pdf",
        url: "https://images.unsplash.com/photo-1503387762-592deb58ef4e?auto=format&fit=crop&w=900&q=80",
        uploadedAt: "2026-09-24 09:15"
      }
    },
    hireControl: {
      onHireDate: "2026-09-04",
      offHireDate: "2026-09-26",
      extensionRequest: "Extend +7 Days",
      originalOffHireDate: "2026-09-19",
      totalDays: 23,
      tagType: "Green",
      contractorBy: "Contractor B Site Supervisor",
      requestorBy: "MAD Area Engineer",
      scaffoldTag: "Green Tag (In-use)",
      updatedAt: "2026-09-04 08:30"
    },
    scaffoldExecution: {
      phase: "In-use",
      onHireDate: "2026-09-04",
      offHireDate: "2026-09-26",
      extensionRequest: "Extend +7 Days",
      contractorBy: "Contractor B Site Supervisor",
      requestorBy: "MAD Area Engineer",
      scaffoldTag: "Green Tag (In-use)"
    },
    lifecycleStage: "In-use",
    createdAt: "2026-09-03T11:00:00Z",
    updatedAt: "2026-09-04T08:30:00Z"
  },
  {
    id: "SF-2026-0845",
    jobId: "SF-2026-0845",
    jobNo: "SF-2026-0845",
    equipmentId: "32-TK-204",
    equipmentTag: "32-TK-204",
    functionalLocation: "TMD",
    functionalDepartment: "TMD",
    plant: "S1 - CCR, SRU, TGCU, Utility",
    locationArea: "S1 - CCR, SRU, TGCU, Utility",
    description: "Spherical LPG Tank 32-TK-204 external inspection scaffold",
    jobDescription: "Spherical LPG Tank 32-TK-204 external inspection scaffold",
    type: "Pipe Rack Access Scaffold",
    scaffoldType: "Standard",
    dateFrom: "2026-09-05 08:30",
    requiredDate: "2026-09-05",
    offHireDate: "2026-09-20",
    status: "Completed",
    progress: 100,
    contractor: "Maintenance Team",
    company: "Maintenance Team",
    maxLoadKg: 800,
    maxWorkers: 6,
    maxLiftingLoadKg: 200,
    workingPeriod: "Normal hour",
    hirePeriod: "15 days",
    heavyDuty: "Y",
    specialPurpose: "N",
    priority: "Normal",
    jobType: "BCP Job",
    x: 80.0,
    y: 38.0,
    isArea: true,
    width: 6.0,
    height: 12.0,
    elevationHeight: 18.0,
    rotation: 0,
    markingLocation: {
      x: 80.0,
      y: 38.0,
      gridZone: "B4",
      dropZoneRadius: 12,
      scaleBlock: {
        width: 6.0,
        length: 12.0,
        height: 18.0,
        tiers: 6,
        rotation: 0,
        color: "#a855f7"
      },
      description: "Spherical LPG Tank 32-TK-204"
    },
    estimate: {
      isEvaluated: true,
      baseHeight: 2.0,
      length: 12.0,
      height: 18.0,
      weight: 6.0,
      volume: 1296.0,
      autoCalculateVolume: true,
      drawingFile: {
        name: "SF02_Scaffold_Sketch_105_RevA.pdf",
        size: "890.0 KB",
        type: "application/pdf",
        url: "https://images.unsplash.com/photo-1503387762-592deb58ef4e?auto=format&fit=crop&w=900&q=80",
        uploadedAt: "2026-09-24 09:15"
      },
      topElevation: 20.0,
      baseFootprintM2: 72.0,
      evaluatedAt: "2026-09-24 09:15",
      evaluatedBy: "Maintenance Team Supervisor"
    },
    scaffoldEstimate: {
      baseHeight: 2.0,
      lengthM: 12.0,
      heightM: 18.0,
      weightM: 6.0,
      volumeM3: 1296.0,
      drawingFile: {
        name: "SF02_Scaffold_Sketch_105_RevA.pdf",
        size: "890.0 KB",
        type: "application/pdf",
        url: "https://images.unsplash.com/photo-1503387762-592deb58ef4e?auto=format&fit=crop&w=900&q=80",
        uploadedAt: "2026-09-24 09:15"
      }
    },
    hireControl: {
      onHireDate: "2026-09-05",
      offHireDate: "2026-09-20",
      extensionRequest: "None",
      originalOffHireDate: "2026-09-20",
      totalDays: 16,
      tagType: "Red",
      contractorBy: "Maintenance Team Supervisor",
      requestorBy: "TMD Area Engineer",
      scaffoldTag: "Red Tag (Dismantle)",
      updatedAt: "2026-09-20 17:00"
    },
    scaffoldExecution: {
      phase: "Dismantle",
      onHireDate: "2026-09-05",
      offHireDate: "2026-09-20",
      extensionRequest: "None",
      contractorBy: "Maintenance Team Supervisor",
      requestorBy: "TMD Area Engineer",
      scaffoldTag: "Red Tag (Dismantle)"
    },
    lifecycleStage: "Dismantle",
    createdAt: "2026-09-04T10:00:00Z",
    updatedAt: "2026-09-20T17:00:00Z"
  },
  {
    id: "SF-2026-0846",
    jobId: "SF-2026-0846",
    jobNo: "SF-2026-0846",
    equipmentId: "41-MLA-02",
    equipmentTag: "41-MLA-02",
    functionalLocation: "Project",
    functionalDepartment: "Project",
    plant: "S3 - Offsite, Jetty",
    locationArea: "S3 - Offsite, Jetty",
    description: "Marine Jetty Berth #2 loading arm maintenance platform",
    jobDescription: "Marine Jetty Berth #2 loading arm maintenance platform",
    type: "Heavy Duty Engineered Scaffold",
    scaffoldType: "Heavy Duty",
    dateFrom: "2026-09-06 08:30",
    requiredDate: "2026-09-06",
    offHireDate: "2026-09-21",
    status: "Approved",
    progress: 25,
    contractor: "Kaefer",
    company: "Kaefer",
    maxLoadKg: 500,
    maxWorkers: 3,
    maxLiftingLoadKg: 100,
    workingPeriod: "Normal hour",
    hirePeriod: "15 days",
    heavyDuty: "Y",
    specialPurpose: "Y",
    priority: "Normal",
    jobType: "Contractor Job",
    x: 23.0,
    y: 55.0,
    isArea: true,
    width: 3.0,
    height: 4.0,
    elevationHeight: 6.0,
    rotation: 15,
    markingLocation: {
      x: 23.0,
      y: 55.0,
      gridZone: "A5",
      dropZoneRadius: 8,
      scaleBlock: {
        width: 3.0,
        length: 4.0,
        height: 6.0,
        tiers: 3,
        rotation: 15,
        color: "#f59e0b"
      },
      description: "Marine Jetty Berth #2"
    },
    estimate: {
      isEvaluated: true,
      baseHeight: 4.5,
      length: 4.0,
      height: 6.0,
      weight: 3.0,
      volume: 72.0,
      autoCalculateVolume: true,
      drawingFile: null,
      topElevation: 10.5,
      baseFootprintM2: 12.0,
      evaluatedAt: "2026-09-06 09:00",
      evaluatedBy: "Kaefer Site Supervisor"
    },
    scaffoldEstimate: {
      baseHeight: 4.5,
      lengthM: 4.0,
      heightM: 6.0,
      weightM: 3.0,
      volumeM3: 72.0,
      drawingFile: null
    },
    hireControl: {
      onHireDate: "2026-09-06",
      offHireDate: "2026-09-21",
      extensionRequest: "None",
      originalOffHireDate: "2026-09-21",
      totalDays: 16,
      tagType: "Yellow",
      contractorBy: "Kaefer Site Supervisor",
      requestorBy: "Project Engineer",
      scaffoldTag: "Yellow Tag (Execution)",
      updatedAt: "2026-09-06 08:30"
    },
    scaffoldExecution: {
      phase: "Execution",
      onHireDate: "2026-09-06",
      offHireDate: "2026-09-21",
      extensionRequest: "None",
      contractorBy: "Kaefer Site Supervisor",
      requestorBy: "Project Engineer",
      scaffoldTag: "Yellow Tag (Execution)"
    },
    lifecycleStage: "Execution",
    createdAt: "2026-09-05T08:00:00Z",
    updatedAt: "2026-09-06T08:30:00Z"
  },
  {
    id: "SF-2026-0847",
    jobId: "SF-2026-0847",
    jobNo: "SF-2026-0847",
    equipmentId: "11-E-102B",
    equipmentTag: "11-E-102B",
    functionalLocation: "IMD",
    functionalDepartment: "IMD",
    plant: "S2 - APS-1, APS-2, FCCU, GOHF-3",
    locationArea: "S2 - APS-1, APS-2, FCCU, GOHF-3",
    description: "Heat exchanger bundle pull clearance scaffold at 11-E-102B",
    jobDescription: "Heat exchanger bundle pull clearance scaffold at 11-E-102B",
    type: "Standard System Scaffold",
    scaffoldType: "Standard",
    dateFrom: "2026-09-07 08:30",
    requiredDate: "2026-09-07",
    offHireDate: "2026-10-07",
    status: "In Progress",
    progress: 75,
    contractor: "Altrad",
    company: "Altrad",
    maxLoadKg: 450,
    maxWorkers: 3,
    maxLiftingLoadKg: 50,
    workingPeriod: "Normal hour",
    hirePeriod: "15 days",
    heavyDuty: "N",
    specialPurpose: "N",
    priority: "Normal",
    jobType: "Contractor Job",
    x: 36.0,
    y: 72.0,
    isArea: true,
    width: 4.5,
    height: 6.0,
    elevationHeight: 9.0,
    rotation: 30,
    markingLocation: {
      x: 36.0,
      y: 72.0,
      gridZone: "B5",
      dropZoneRadius: 6,
      scaleBlock: {
        width: 4.5,
        length: 6.0,
        height: 9.0,
        tiers: 4,
        rotation: 30,
        color: "#10b981"
      },
      description: "Heat exchanger bundle pull clearance 11-E-102B"
    },
    estimate: {
      isEvaluated: true,
      baseHeight: 0,
      length: 6.0,
      height: 9.0,
      weight: 4.5,
      volume: 243.0,
      autoCalculateVolume: true,
      drawingFile: null,
      topElevation: 9.0,
      baseFootprintM2: 27.0,
      evaluatedAt: "2026-09-07 10:00",
      evaluatedBy: "Altrad Site Supervisor"
    },
    scaffoldEstimate: {
      baseHeight: 0,
      lengthM: 6.0,
      heightM: 9.0,
      weightM: 4.5,
      volumeM3: 243.0,
      drawingFile: null
    },
    hireControl: {
      onHireDate: "2026-09-07",
      offHireDate: "2026-10-07",
      extensionRequest: "Extend +30 Days",
      originalOffHireDate: "2026-09-22",
      totalDays: 31,
      tagType: "Green",
      contractorBy: "Altrad Site Supervisor",
      requestorBy: "IMD Area Engineer",
      scaffoldTag: "Green Tag (In-use)",
      updatedAt: "2026-09-07 08:30"
    },
    scaffoldExecution: {
      phase: "In-use",
      onHireDate: "2026-09-07",
      offHireDate: "2026-10-07",
      extensionRequest: "Extend +30 Days",
      contractorBy: "Altrad Site Supervisor",
      requestorBy: "IMD Area Engineer",
      scaffoldTag: "Green Tag (In-use)"
    },
    lifecycleStage: "In-use",
    createdAt: "2026-09-06T09:00:00Z",
    updatedAt: "2026-09-07T08:30:00Z"
  },
  {
    id: "SF-2026-0848",
    jobId: "SF-2026-0848",
    jobNo: "SF-2026-0848",
    equipmentId: "11-H-101",
    equipmentTag: "11-H-101",
    functionalLocation: "EMD",
    functionalDepartment: "EMD",
    plant: "S1 - CCR, SRU, TGCU, Utility",
    locationArea: "S1 - CCR, SRU, TGCU, Utility",
    description: "Burner deck elevation platform at Charge Heater 11-H-101",
    jobDescription: "Burner deck elevation platform at Charge Heater 11-H-101",
    type: "360° Column Ring Scaffold",
    scaffoldType: "360° Ring",
    dateFrom: "2026-09-08 08:30",
    requiredDate: "2026-09-08",
    offHireDate: "2026-09-23",
    status: "Requested",
    progress: 25,
    contractor: "Contractor A",
    company: "Contractor A",
    maxLoadKg: 450,
    maxWorkers: 3,
    maxLiftingLoadKg: 80,
    workingPeriod: "Normal hour",
    hirePeriod: "15 days",
    heavyDuty: "N",
    specialPurpose: "Y",
    priority: "Normal",
    jobType: "Contractor Job",
    x: 49.0,
    y: 24.0,
    isArea: true,
    width: 3.0,
    height: 8.0,
    elevationHeight: 12.0,
    rotation: 45,
    markingLocation: {
      x: 49.0,
      y: 24.0,
      gridZone: "C1",
      dropZoneRadius: 8,
      scaleBlock: {
        width: 3.0,
        length: 8.0,
        height: 12.0,
        tiers: 5,
        rotation: 45,
        color: "#f59e0b"
      },
      description: "Burner deck platform at Charge Heater 11-H-101"
    },
    estimate: {
      isEvaluated: true,
      baseHeight: 2.0,
      length: 8.0,
      height: 12.0,
      weight: 3.0,
      volume: 288.0,
      autoCalculateVolume: true,
      drawingFile: null,
      topElevation: 14.0,
      baseFootprintM2: 24.0,
      evaluatedAt: "2026-09-08 10:00",
      evaluatedBy: "Contractor A Site Supervisor"
    },
    scaffoldEstimate: {
      baseHeight: 2.0,
      lengthM: 8.0,
      heightM: 12.0,
      weightM: 3.0,
      volumeM3: 288.0,
      drawingFile: null
    },
    hireControl: {
      onHireDate: "2026-09-08",
      offHireDate: "2026-09-23",
      extensionRequest: "None",
      originalOffHireDate: "2026-09-23",
      totalDays: 16,
      tagType: "Yellow",
      contractorBy: "Contractor A Site Supervisor",
      requestorBy: "EMD Area Engineer",
      scaffoldTag: "Yellow Tag (Execution)",
      updatedAt: "2026-09-08 08:30"
    },
    scaffoldExecution: {
      phase: "Execution",
      onHireDate: "2026-09-08",
      offHireDate: "2026-09-23",
      extensionRequest: "None",
      contractorBy: "Contractor A Site Supervisor",
      requestorBy: "EMD Area Engineer",
      scaffoldTag: "Yellow Tag (Execution)"
    },
    lifecycleStage: "Execution",
    createdAt: "2026-09-07T08:00:00Z",
    updatedAt: "2026-09-08T08:30:00Z"
  }
];

// LocalStorage Service
export function getStoredScaffoldingJobs(): ScaffoldingSFJob[] {
  try {
    const raw = localStorage.getItem(SCAFFOLDING_STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(SCAFFOLDING_STORAGE_KEY, JSON.stringify(INITIAL_SCAFFOLDING_JOBS));
      return INITIAL_SCAFFOLDING_JOBS;
    }
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) {
      // Check if it has the new 8 initial jobs (SF-2026-0841)
      const hasNewMock = parsed.some(j => j.id === 'SF-2026-0841' || j.jobNo === 'SF-2026-0841');
      if (!hasNewMock) {
        // Upgrade / seed initial jobs while preserving custom user jobs
        const userCustomJobs = parsed.filter(j => !j.id.startsWith('SF-2026-084'));
        const merged = [...userCustomJobs, ...INITIAL_SCAFFOLDING_JOBS];
        localStorage.setItem(SCAFFOLDING_STORAGE_KEY, JSON.stringify(merged));
        return merged;
      }
      return parsed;
    }
    return INITIAL_SCAFFOLDING_JOBS;
  } catch (err) {
    console.error('Failed reading scaffolding jobs from localStorage', err);
    return INITIAL_SCAFFOLDING_JOBS;
  }
}

export function saveStoredScaffoldingJobs(jobs: ScaffoldingSFJob[]): void {
  try {
    localStorage.setItem(SCAFFOLDING_STORAGE_KEY, JSON.stringify(jobs));
    window.dispatchEvent(new CustomEvent(SCAFFOLDING_UPDATED_EVENT, { detail: jobs }));
    window.dispatchEvent(new Event('storage'));
  } catch (err) {
    console.error('Failed saving scaffolding jobs to localStorage', err);
  }
}

export function addScaffoldingJob(job: ScaffoldingSFJob): void {
  const current = getStoredScaffoldingJobs();
  const exists = current.some(j => j.id === job.id);
  const updated = exists 
    ? current.map(j => j.id === job.id ? job : j)
    : [job, ...current];
  saveStoredScaffoldingJobs(updated);
}

export function updateScaffoldingJob(id: string, updates: Partial<ScaffoldingSFJob>): ScaffoldingSFJob | null {
  const current = getStoredScaffoldingJobs();
  let updatedJob: ScaffoldingSFJob | null = null;
  const next = current.map(j => {
    if (j.id === id) {
      updatedJob = { ...j, ...updates, updatedAt: new Date().toISOString() };
      return updatedJob;
    }
    return j;
  });
  if (updatedJob) {
    saveStoredScaffoldingJobs(next);
  }
  return updatedJob;
}

export function deleteScaffoldingJob(id: string): void {
  const current = getStoredScaffoldingJobs();
  saveStoredScaffoldingJobs(current.filter(j => j.id !== id));
}

export function subscribeToScaffoldingJobs(callback: (jobs: ScaffoldingSFJob[]) => void): () => void {
  const handler = () => {
    callback(getStoredScaffoldingJobs());
  };
  window.addEventListener(SCAFFOLDING_UPDATED_EVENT, handler);
  window.addEventListener('storage', handler);
  return () => {
    window.removeEventListener(SCAFFOLDING_UPDATED_EVENT, handler);
    window.removeEventListener('storage', handler);
  };
}
