import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  Calendar,
  Building,
  CheckCircle2,
  Clock,
  AlertTriangle,
  QrCode,
  Link as LinkIcon,
  UploadCloud,
  FileText,
  FileCheck,
  Check,
  X,
  Plus,
  Download,
  Filter,
  Eye,
  Camera,
  Layers,
  Sparkles,
  ArrowRight,
  ArrowLeft,
  ShieldCheck,
  Share2,
  RefreshCw,
  ExternalLink,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  UserCheck,
  FolderTree,
  MapPin,
  Tag,
  Building2,
  Workflow,
  Search,
  CheckCircle,
  CheckSquare,
  HelpCircle,
  Hash,
  CornerDownRight,
  Activity,
  Maximize2,
  Printer,
  TrendingUp,
  BarChart3,
  PieChart,
  AlertOctagon,
  SlidersHorizontal,
  Sliders,
  Flame,
  ArrowUpRight,
  ShieldAlert,
  Wrench,
  Info,
  Zap,
  Home,
  Copy,
  Award,
  CheckCheck,
  PenTool,
  User,
  Trash2,
  Image as ImageIcon,
  ListFilter,
  AlertCircle
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import {
  S2_TURNOVER_HIERARCHY,
  UnitRecord,
  SystemRecord,
  EquipmentRecord
} from '../data/s2FunctionalLocationData';
import {
  FlatAssetHierarchyItem,
  getAllFlattenedAssets,
  getHierarchyUnits,
  getSystemsForUnit,
  getEquipmentForSystem,
  findAssetByTag
} from '../data/functionalLocationHierarchyHelper';
import AssetHierarchySelectModal from './functional-location/AssetHierarchySelectModal';
import BulkJobPackageInsert from './BulkJobPackageInsert';
import BulkCranePermitModal from './BulkCranePermitModal';
import BulkTurnoverJobIngestion from './bulk/BulkTurnoverJobIngestion';
import DigitalSignaturePad from './DigitalSignaturePad';
import PlotPlanPinningSection, { PinData, ScaleBlockData } from './common/PlotPlanPinningSection';
import { useLanguage } from '../context/LanguageContext';
import { usePlantTurnShared } from '../context/PlantTurnSharedContext';
const NOT_ACCEPT_OTHER = '__other__';
const SIGNER_ROLES_STORAGE_KEY = 'turnover_signer_roles_by_plant_v1';
const DEFAULT_SIGNER_ROLES = [
  'Operations (ฝ่ายปฏิบัติการผลิต)',
  'QA-QC (ฝ่ายตรวจสอบและควบคุมคุณภาพ)',
  'Construction / Maintenance (ฝ่ายก่อสร้างและซ่อมบำรุง)',
  'Lead Turnaround Engineer (หัวหน้าวิศวกรผู้รับมอบ)',
  'Job Supervisor (หัวหน้างานหน้างาน)'
];
const NOT_ACCEPT_PRESET_TYPES = [
  { value: 'Flange Leaks / Gasket', th: 'หน้าแปลนรั่ว / ประเก็น (Flange Leaks)' },
  { value: 'Missing Safety Guard', th: 'การ์ดป้องกันหลุดหาย (Missing Safety Guard)' },
  { value: 'Touch-up Painting', th: 'งานซ่อมสีป้องกันสนิม (Touch-up Painting)' },
  { value: 'Calibration', th: 'การสอบเทียบเครื่องมือวัด (Calibration)' },
  { value: 'Grounding Detached', th: 'สายดินหลุด / ไม่แน่น (Grounding Detached)' },
];
import { isPunchItemOpen as sharedIsPunchItemOpen, getAcceptanceStatus as sharedGetAcceptanceStatus } from '../utils/turnoverRules';

// Types
export type MainViewTab = 'create' | 'workspace' | 'dashboard' | 'settings';
export type WorkspaceTab = 'detail' | 'turnover';
export type TurnoverSubTab = 'sign' | 'punchlist';
export type PunchCategory = 'A' | 'B' | 'C' | 'S';
export type PunchOrButtType = 'Punch' | 'Butt';
export type PunchStatus = 'Open' | 'In Progress' | 'Resolved' | 'Cancel' | 'Closed';
export type AcceptanceDecision = 'Accept' | 'Not Accept';
export type AcceptanceStatus = 'Pending' | 'Accepted' | 'Not Accepted' | 'Pending Re-Accept';
export type TurnoverWorkflowStatus = 'In Progress' | 'Rejected' | 'Reviewed' | 'Completed' | 'Pending';

export interface PunchItem {
  id: string; // e.g. PNC-101 or BUTT-102
  jobId?: string;
  item?: string;
  itemType?: PunchOrButtType; // 'Punch' | 'Butt'
  type?: string;
  category?: string;
  punchCategory?: string;
  punchStatus?: string;
  remedialWorks?: string; // รายละเอียดงานแก้ไข
  description: string;
  discipline?: string; // M - Mechanical / A - Analyser / I - Instrument / E - Electrical / Other
  contractor?: string; // ผู้รับผิดชอบแก้ไข
  planDate?: string;
  plannedDate?: string;
  closedDate?: string;
  closedBy?: string;
  closedSignatureDataUrl?: string;
  isContractorClosed?: boolean;
  verifiedBy?: string;
  verifiedSignatureDataUrl?: string;
  verificationTimestamp?: string;
  isVerified?: boolean;
  relatedJobId?: string;
  relatedAcceptanceId?: string;
  photoRequired?: boolean;
  status: PunchStatus;
  reportedBy: string;
  timestamp: string;
  resolutionPhotoUrl?: string;
  resolvedAt?: string;
  resolutionComment?: string;
}

export interface SignatureRecord {
  id: string;
  jobId?: string;
  role: string;
  name: string;
  decision: AcceptanceDecision;
  rejectionReason?: string;
  comment?: string;
  signedAt: string;
  signatureDataUrl?: string;
  photoUrl?: string;
  acceptanceStatus?: AcceptanceStatus;
  remarks?: string;
  relatedAcceptanceId?: string;
}

export interface JobAttachment {
  name: string;
  size: string;
  type: string;
  url?: string;
  uploadedAt?: string;
}

export interface JobRecord {
  id: string;
  jobNo: string;
  title: string;
  eventName: string;
  plant: 'Phra Khanong' | 'Sriracha';
  unit: string;
  unitId?: string;
  system: string;
  systemId?: string;
  workOrder: string;
  description: string;
  // Linked Functional Location & Asset Hierarchy Metadata
  assetTag?: string;
  assetDescription?: string;
  refCode?: string;
  hierarchyNodeId?: string;
  hierarchyLevel?: string;
  hierarchyPath?: string;
  isCriticalPath?: boolean;
  gridZone?: string;
  plotPlanX?: number;
  plotPlanY?: number;
  plotPlanId?: string;
  plotPlanRadius?: number;
  plotPlanWidth?: number;
  plotPlanHeight?: number;
  plotPlanRotation?: number;
  markingType?: 'pin' | 'area' | 'both';
  attachments: JobAttachment[];
  signatures: SignatureRecord[];
  punchList: PunchItem[];
  createdAt: string;
  targetStartDate?: string;
  plannedTurnoverDate?: string;
  equipmentType?: string;
  discipline?: string;
  turnoverSystem?: string;
  jobLead?: string;
  jobSupervisor?: string;
  acceptanceStatus?: AcceptanceStatus;
  turnoverStatus?: TurnoverWorkflowStatus;
}

// Initial Mock Data with Functional Location & Asset Hierarchy Linkage
const INITIAL_JOBS: JobRecord[] = [
  {
    id: 'job-101',
    jobNo: 'TO-PK-2026-001',
    title: 'Crude Column Overhead Condenser Inspection & Re-tubing',
    eventName: 'Annual Turnaround 2026',
    plant: 'Phra Khanong',
    unit: 'APS-1 (Atmospheric Distillation Unit 1)',
    unitId: 'unit-aps1',
    system: 'System-13 (Main Crude Column Overhead & Reflux)',
    systemId: 'sys-13',
    workOrder: 'WO-882910',
    description: 'Hydro-jet cleaning of condenser shell, eddy current tube inspection, and blind flange bolt replacement on Column T-101 overhead circuit.',
    assetTag: 'S2-C-101 T-101',
    assetDescription: 'Crude Fractionation Tower Trays & Overhead Condenser',
    refCode: '10-12',
    hierarchyNodeId: 'unit-aps1-eq-S2_C_101_T_101-0',
    hierarchyLevel: 'Level 3 • Equipment',
    hierarchyPath: 'APS-1 > System-13 > S2-C-101 T-101',
    isCriticalPath: true,
    gridZone: 'B2',
    plotPlanX: 42.0,
    plotPlanY: 35.5,
    plotPlanId: 'plan-aps1',
    attachments: [
      { name: 'Overhead_Condenser_Inspection_Report.pdf', size: '2.4 MB', type: 'pdf' },
      { name: 'Flange_Bolt_Torque_Cert_Signed.pdf', size: '890 KB', type: 'pdf' }
    ],
    signatures: [
      { id: 'sig-1', role: 'Operation', name: 'Kitti Chai (Operations Supt)', decision: 'Accept', signedAt: '2026-09-28 09:30' },
      { id: 'sig-2', role: 'Job Owner', name: 'Somchai Prasert (Lead Mech Eng)', decision: 'Accept', signedAt: '2026-09-28 11:15' }
    ],
    punchList: [
      { id: 'p-1', type: 'Flange Leaks / Gasket', category: 'A', description: 'Re-tighten bolts on bypass valve flange #4', photoRequired: true, status: 'Resolved', reportedBy: 'Anan S.', timestamp: '2026-09-28 10:10' }
    ],
    createdAt: '2026-09-25'
  },
  {
    id: 'job-102',
    jobNo: 'TO-SR-2026-004',
    title: 'Vacuum Bottom Residue Pump P-102A Mechanical Seal Renewal',
    eventName: 'Major Overhaul Q3',
    plant: 'Sriracha',
    unit: 'VPS-2 (Vacuum Pipestill 2 Complex)',
    unitId: 'unit-vps2',
    system: 'System-28 (Vacuum Furnace & Transfer Ejector System)',
    systemId: 'sys-28',
    workOrder: 'WO-884019',
    description: 'Replacement of tandem mechanical seal, coupling laser alignment, and casing hydro-test on vacuum furnace feed pump.',
    assetTag: 'S2-VF-201 FURNACE',
    assetDescription: 'Vacuum Charge Heater Coils & Transfer Circuit',
    refCode: '40-02',
    hierarchyNodeId: 'unit-vps2-eq-S2_VF_201_FURNACE-0',
    hierarchyLevel: 'Level 3 • Equipment',
    hierarchyPath: 'VPS-2 > System-28 > S2-VF-201 FURNACE',
    isCriticalPath: true,
    gridZone: 'C4',
    plotPlanX: 65.2,
    plotPlanY: 52.8,
    plotPlanId: 'plan-overall',
    attachments: [
      { name: 'Seal_Plan53A_Alignment_Sheet.pdf', size: '1.2 MB', type: 'pdf' }
    ],
    signatures: [
      { id: 'sig-3', role: 'Operation', name: 'Nattapong V. (OPS)', decision: 'Accept', signedAt: '2026-09-29 14:00' }
    ],
    punchList: [
      { id: 'p-2', type: 'Missing Safety Guard', category: 'A', description: 'Coupling safety guard missing 2 grounding bolts', photoRequired: true, status: 'Open', reportedBy: 'Safety Officer P.', timestamp: '2026-09-29 15:30' },
      { id: 'p-3', type: 'Touch-up Painting', category: 'C', description: 'Primer peeling off suction piping spool', photoRequired: false, status: 'Open', reportedBy: 'Inspector Korn', timestamp: '2026-09-29 16:00' }
    ],
    createdAt: '2026-09-27'
  },
  {
    id: 'job-103',
    jobNo: 'TO-PK-2026-007',
    title: 'Desalter Drum S2-DR-001D-180 Internal Grid Cleaning & Agitator Overhaul',
    eventName: 'Major Overhaul Q4 2026',
    plant: 'Phra Khanong',
    unit: 'APS-1 (Atmospheric Distillation Unit 1)',
    unitId: 'unit-aps1',
    system: 'System-11 (Crude Feed Preheat & Desalter System)',
    systemId: 'sys-11',
    workOrder: 'WO-884021',
    description: 'Comprehensive inspection of desalter vessel S2-DR-001D-180 (Ref 10-03). Clean electrostatic grids, overhaul agitator motor skid S2-DR-001D-MTR-01, and perform flange gasket replacements.',
    assetTag: 'S2-DR-001D-180',
    assetDescription: 'Desalter Drum Vessel (Primary desalting grid)',
    refCode: '10-03',
    hierarchyNodeId: 'unit-aps1-eq-S2_DR_001D_180-0',
    hierarchyLevel: 'Level 3 • Equipment',
    hierarchyPath: 'APS-1 > System-11 > S2-DR-001D-180',
    isCriticalPath: true,
    gridZone: 'B3',
    plotPlanX: 28.5,
    plotPlanY: 38.0,
    plotPlanId: 'plan-overall',
    attachments: [
      { name: 'Desalter_Drum_Internal_Inspection_Plan.pdf', size: '3.1 MB', type: 'pdf' },
      { name: 'Phor_Jor_2_Pressure_Vessel_Cert.pdf', size: '1.4 MB', type: 'pdf' }
    ],
    signatures: [
      { id: 'sig-5', role: 'Operation', name: 'Somchai Prasert (OPS Lead)', decision: 'Accept', signedAt: '2026-09-30 08:30' }
    ],
    punchList: [
      { id: 'p-103-1', type: 'Flange Bolt Torquing', category: 'A', description: 'Flange bolt torque calibration certified for vessel manway M-101', photoRequired: true, status: 'Resolved', reportedBy: 'QA Inspector', timestamp: '2026-09-30 10:15' },
      { id: 'p-103-2', type: 'Grounding Bonding', category: 'B', description: 'Grounding bonding jumper continuity tested within 0.1 ohm spec', photoRequired: false, status: 'Resolved', reportedBy: 'E&I Lead', timestamp: '2026-09-30 11:30' }
    ],
    createdAt: '2026-09-28'
  },
  {
    id: 'job-104',
    jobNo: 'TO-PK-2026-009',
    title: 'KHF-1 Kerosene Hydrotreater Reactor S2-R-201 RX Catalyst Inspection',
    eventName: 'Major Overhaul Q4 2026',
    plant: 'Phra Khanong',
    unit: 'KHF-1 (Kerosene Hydrotreating Unit 1)',
    unitId: 'unit-khf1',
    system: 'System-32 (Hydrotreater Reactor Loop & Heat Exchange)',
    systemId: 'sys-32',
    workOrder: 'WO-884025',
    description: 'De-inventory catalyst bed, video internal borescope scan of reactor trays, torque check blind flanges, and final nitrogen pressure leak hold test.',
    assetTag: 'S2-R-201 RX',
    assetDescription: 'Hydrotreater Fixed Bed Catalytic Reactor Vessel',
    refCode: '20-01',
    hierarchyNodeId: 'unit-khf1-eq-S2_R_201_RX-0',
    hierarchyLevel: 'Level 3 • Equipment',
    hierarchyPath: 'KHF-1 > System-32 > S2-R-201 RX',
    isCriticalPath: true,
    gridZone: 'A2',
    plotPlanX: 42.0,
    plotPlanY: 25.5,
    plotPlanId: 'plan-overall',
    attachments: [
      { name: 'Catalyst_Passivation_NDT_Report.pdf', size: '2.8 MB', type: 'pdf' },
      { name: 'Nitrogen_Leak_Hold_Log.pdf', size: '920 KB', type: 'pdf' }
    ],
    signatures: [
      { id: 'sig-7', role: 'Operation', name: 'Somchai Prasert (OPS Lead)', decision: 'Accept', signedAt: '2026-10-01 11:15' },
      { id: 'sig-8', role: 'Job Owner', name: 'Chatchai K. (Lead Eng)', decision: 'Accept', signedAt: '2026-10-01 15:45' }
    ],
    punchList: [
      { id: 'p-104-1', type: 'Tray Bolt Torquing', category: 'A', description: 'Internal tray 3 bolting checked and certified', photoRequired: true, status: 'Resolved', reportedBy: 'QA Inspector', timestamp: '2026-10-01 10:00' }
    ],
    createdAt: '2026-09-29'
  },
  {
    id: 'job-105',
    jobNo: 'TO-SR-2026-012',
    title: 'VPS-2 Vacuum Overhead Ejector Condenser Retubing & Hydrotest',
    eventName: 'TA-2026 Vacuum Overhaul',
    plant: 'Sriracha',
    unit: 'VPS-2 (Vacuum Pipestill 2 Complex)',
    unitId: 'unit-vps2',
    system: 'System-29 (Vacuum Overhead Condensing & Gas Recovery)',
    systemId: 'sys-29',
    workOrder: 'WO-884033',
    description: 'Titanium tube bundle pull out, eddy-current ultrasonic tube wall thickness inspection, re-tubing and 24-hour shell pressure test.',
    assetTag: 'S2-E-205 CONDENSER',
    assetDescription: 'Vacuum 1st Stage Surface Condenser Tube Bundle',
    refCode: '29-04',
    hierarchyNodeId: 'unit-vps2-eq-S2_E_205_COND-0',
    hierarchyLevel: 'Level 3 • Equipment',
    hierarchyPath: 'VPS-2 > System-29 > S2-E-205 CONDENSER',
    isCriticalPath: false,
    gridZone: 'C5',
    plotPlanX: 72.4,
    plotPlanY: 61.0,
    plotPlanId: 'plan-overall',
    attachments: [
      { name: 'Eddy_Current_NDE_Inspection.pdf', size: '1.9 MB', type: 'pdf' }
    ],
    signatures: [
      { id: 'sig-9', role: 'Job Owner', name: 'Preecha S. (Maintenance Lead)', decision: 'Accept', signedAt: '2026-10-02 09:30' }
    ],
    punchList: [
      { id: 'p-105-1', type: 'Missing Vent Valve Tag', category: 'B', description: 'Stainless vent drain valve V-205A requires physical brass tag stamp', photoRequired: false, status: 'Open', reportedBy: 'QA Tech', timestamp: '2026-10-02 14:00' }
    ],
    createdAt: '2026-09-30'
  },
  {
    id: 'job-106',
    jobNo: 'TO-PK-2026-015',
    title: 'APS-1 Atmospheric Crude Furnace H-101 Radiant Coils & Burner Tiles Overhaul',
    eventName: 'Major Overhaul Q4 2026',
    plant: 'Phra Khanong',
    unit: 'APS-1 (Atmospheric Pipestill 1)',
    unitId: 'unit-aps1',
    system: 'System-12 (Crude Pre-Heater Furnace & Flue Gas)',
    systemId: 'sys-12',
    workOrder: 'WO-884042',
    description: 'Radiant coil decoking inspection, ultrasonic wall thickness scans, burner pilot fuel gas shut-off valve seat leak test, and optical refractory survey.',
    assetTag: 'S2-H-101 FURNACE',
    assetDescription: 'Atmospheric Crude Furnace Radiant Box',
    refCode: '10-08',
    hierarchyNodeId: 'unit-aps1-eq-S2_H_101_FURN-0',
    hierarchyLevel: 'Level 3 • Equipment',
    hierarchyPath: 'APS-1 > System-12 > S2-H-101 FURNACE',
    isCriticalPath: true,
    gridZone: 'B2',
    plotPlanX: 35.8,
    plotPlanY: 38.2,
    plotPlanId: 'plan-overall',
    attachments: [
      { name: 'Furnace_Radiant_Coil_NDE_Scan.pdf', size: '3.4 MB', type: 'pdf' },
      { name: 'Burner_Tile_Refractory_Report.pdf', size: '1.2 MB', type: 'pdf' }
    ],
    signatures: [
      { id: 'sig-10', role: 'Operation', name: 'Somchai Prasert (OPS Lead)', decision: 'Accept', signedAt: '2026-10-03 14:20' }
    ],
    punchList: [
      { id: 'p-106-1', type: 'Burner FG Shut-Off Leak', category: 'A', description: 'Burner pilot FG shut-off valve V-101P seat leak test failed at 3.5 barg. Requires seat lapping before furnace light-up.', photoRequired: true, status: 'Open', reportedBy: 'Safety Lead Kittisak', timestamp: '2026-10-04 08:45' },
      { id: 'p-106-2', type: 'Skin Thermocouple Conduit', category: 'B', description: 'Radiant coil skin thermocouple TE-101-14 gland loose. Retighten seal gland before lagging.', photoRequired: false, status: 'Open', reportedBy: 'Inst Lead Prawit', timestamp: '2026-10-04 11:20' },
      { id: 'p-106-3', type: 'Refractory Dry-out Sign', category: 'C', description: 'Ensure refractory dry-out curve documentation sign-off is mounted on burner deck board.', photoRequired: false, status: 'Resolved', reportedBy: 'Refractory QC', timestamp: '2026-10-03 16:00' }
    ],
    createdAt: '2026-10-01'
  },
  {
    id: 'job-107',
    jobNo: 'TO-SR-2026-018',
    title: 'VPS-2 Propane Deasphalting Extractor Column S2-C-201 Internal Grid Rescreen',
    eventName: 'TA-2026 Vacuum Overhaul',
    plant: 'Sriracha',
    unit: 'VPS-2 (Vacuum Pipestill 2 Complex)',
    unitId: 'unit-vps2',
    system: 'System-30 (Solvent Deasphalting & Flash Tower)',
    systemId: 'sys-30',
    workOrder: 'WO-884055',
    description: 'Extractor tower bottom cone wash, rotating disc contactor clearance verification, and manway gasket replacement.',
    assetTag: 'S2-C-201 EXTRACTOR',
    assetDescription: 'Propane Deasphalting Contactor Column',
    refCode: '29-02',
    hierarchyNodeId: 'unit-vps2-eq-S2_C_201_EXTR-0',
    hierarchyLevel: 'Level 3 • Equipment',
    hierarchyPath: 'VPS-2 > System-30 > S2-C-201 EXTRACTOR',
    isCriticalPath: true,
    gridZone: 'C4',
    plotPlanX: 68.0,
    plotPlanY: 55.4,
    plotPlanId: 'plan-overall',
    attachments: [
      { name: 'RDC_Clearance_Checklist.pdf', size: '2.1 MB', type: 'pdf' }
    ],
    signatures: [],
    punchList: [
      { id: 'p-107-1', type: 'Manway MTC Verification', category: 'A', description: 'Column top manway M-1 spiral wound gasket 316L/Graphite heat certificate missing. Verify MTC before final box-up.', photoRequired: true, status: 'Open', reportedBy: 'Station Inspector Damrong', timestamp: '2026-10-04 14:10' },
      { id: 'p-107-2', type: 'PSV Recalibration Tag', category: 'B', description: 'PSV-201A relief valve test bench tag shows inspection due date; mount newly calibrated green tag.', photoRequired: true, status: 'Resolved', reportedBy: 'Relief Valve Shop', timestamp: '2026-10-04 09:30' }
    ],
    createdAt: '2026-10-02'
  }
];

export interface JobLocationTurnoverPrototypeProps {
  initialMainView?: MainViewTab;
  initialDashboardSubTab?: 'overview' | 'critical-path' | 'unit-funnel';
  initialWorkspaceTab?: WorkspaceTab;
  initialTurnoverSubTab?: TurnoverSubTab;
  globalPlantFilter?: 'All' | 'Phra Khanong' | 'Sriracha';
  onGlobalPlantFilterChange?: (plant: 'All' | 'Phra Khanong' | 'Sriracha') => void;
  onNavigateToFunctionalLocation?: (nodeId?: string) => void;
  onNavigateToMasterPlotPlan?: (nodeId?: string) => void;
  onNavigateToWorkspace?: () => void;
}

export const AREA_UNIT_OPTIONS = [
  'S1 - CCR, SRU, TGCU, Utility',
  'S2 - APS-1, APS-2, FCCU, GOHF-3',
  'S3 - Offsite, Jetty'
];

export const DISCIPLINE_OPTIONS = [
  'IMD — เครื่องมือวัดและควบคุม (Instrument)',
  'EMD — ระบบไฟฟ้า (Electrical)',
  'MSD — เครื่องกลหมุน เช่น ปั๊ม/คอมเพรสเซอร์ (Mechanical Rotating)',
  'MAD — อุปกรณ์นิ่งและท่อ เช่น หอกลั่น/ถัง (Mechanical Static & Piping)',
  'TMD — บริหารงานหยุดซ่อมบำรุงใหญ่ (Turnaround Management)',
  'Project — วิศวกรรมโครงการ/ก่อสร้าง (Project Engineering)',
  'SRD1 — ฝ่ายปฏิบัติการกลั่น 1 (Refinery Operations 1)',
  'SRD2 — ฝ่ายปฏิบัติการกลั่น 2 (Refinery Operations 2)',
  'SRD3 — ฝ่ายปฏิบัติการคลัง/ท่าเรือ (Offsite & Marine)',
  'Other — แผนกอื่นๆ'
];

export const JOB_LEAD_OPTIONS = [
  'นายสมชาย ใจมั่น (Lead Mechanical / Static Engineer)',
  'นายวิชัย เลิศวิทยา (Lead Turnaround Supervisor)',
  'นายณัฐพล ชัยชนะ (Lead Instrument & Control Engineer)',
  'นายนพดล ปรีชาญาณ (Lead Electrical Supervisor)',
  'นายเกรียงไกร เก่งวิชา (Refinery Operations Unit Lead)',
  'นางสาวพิมพา พรประเสริฐ (Lead Project Engineer)',
  'นายอนุชา เด่นดวง (Offsite & Marine Lead)',
  'นายพงศธร ศักดิ์เจริญ (Maintenance Superintendent)'
];

export const EQUIPMENT_TYPE_OPTIONS = [
  'Column / Tower (หอกลั่น)',
  'Vessel / Drum (ถังแรงดัน/ถังพัก)',
  'Heat Exchanger / Cooler (อุปกรณ์แลกเปลี่ยนความร้อน)',
  'Furnace / Boiler (เตาเผา/หม้อต้ม)',
  'Pump (ปั๊ม)',
  'Compressor (คอมเพรสเซอร์)',
  'Piping / Flange (ท่อและหน้าแปลน)',
  'Storage Tank (ถังเก็บ)',
  'Valve / Safety Valve (วาล์วและเซฟตี้วาล์ว)',
  'Instrumentation / Control (เครื่องมือวัด/ควบคุม)',
  'Electrical / Motor (ระบบไฟฟ้า/มอเตอร์)',
  'Other (อื่นๆ)'
];

export const TAM_DISCIPLINE_OPTIONS = [
  'M - Mechanical',
  'A - Analyser',
  'I - Instrument',
  'E - Electrical',
  'Other'
];

export const TAM_CONTRACTOR_OPTIONS = [
  'BCP Maintenance Team (ฝ่ายซ่อมบำรุงโรงกลั่น)',
  'Rotary Engineering Co., Ltd.',
  'Thai Shinryo Co., Ltd.',
  'Toyo-Thai Corporation',
  'CR3 (Thailand) Co., Ltd.',
  'Dextra Manufacturing Co., Ltd.',
  'Other Contractor'
];

export default function JobLocationTurnoverPrototype({
  initialMainView,
  initialDashboardSubTab,
  initialWorkspaceTab,
  initialTurnoverSubTab,
  globalPlantFilter,
  onGlobalPlantFilterChange,
  onNavigateToFunctionalLocation,
  onNavigateToMasterPlotPlan,
  onNavigateToWorkspace
}: JobLocationTurnoverPrototypeProps = {}) {
  const { language, isTh, t } = useLanguage();
  const { jobs, setJobs, selectedJobId, setSelectedJobId, checkJobIdExists, batchCreateJobs, logActivity } = usePlantTurnShared();
  const [activeMainView, setActiveMainView] = useState<MainViewTab>(initialMainView || 'create');
  const [executiveSubTab, setExecutiveSubTab] = useState<'overview' | 'critical-path' | 'unit-funnel'>(initialDashboardSubTab || 'overview');

  useEffect(() => {
    if (initialMainView) {
      setActiveMainView(initialMainView);
      if (initialMainView === 'create') {
        setIsCreateFormOpen(true);
      }
    }
  }, [initialMainView]);

  useEffect(() => {
    if (initialDashboardSubTab) {
      setExecutiveSubTab(initialDashboardSubTab);
    }
  }, [initialDashboardSubTab]);

  const [workspaceTab, setWorkspaceTab] = useState<WorkspaceTab>(initialWorkspaceTab || 'turnover');
  const [turnoverSubTab, setTurnoverSubTab] = useState<TurnoverSubTab>(initialTurnoverSubTab || 'sign');

  useEffect(() => {
    if (initialWorkspaceTab) {
      setWorkspaceTab(initialWorkspaceTab);
    }
  }, [initialWorkspaceTab]);

  useEffect(() => {
    if (initialTurnoverSubTab) {
      setTurnoverSubTab(initialTurnoverSubTab);
    }
  }, [initialTurnoverSubTab]);

  // Step 1: Event Form State (Blank by default)
  const [eventName, setEventName] = useState('');
  const [selectedPlant, setSelectedPlant] = useState<'Phra Khanong' | 'Sriracha'>('Phra Khanong');
  const [eventStartDate, setEventStartDate] = useState('');
  const [eventTargetDate, setEventTargetDate] = useState('');
  const [eventMilestone, setEventMilestone] = useState('');

  // Step 2: Job Location & Functional Location / Asset Hierarchy Linkage State
  const [selectedUnitId, setSelectedUnitId] = useState('');
  const [selectedSystemId, setSelectedSystemId] = useState('');
  const [selectedAssetTag, setSelectedAssetTag] = useState('');
  const [selectedAsset, setSelectedAsset] = useState<FlatAssetHierarchyItem | null>(null);
  const [isHierarchyModalOpen, setIsHierarchyModalOpen] = useState(false);

  const [jobTitle, setJobTitle] = useState('');
  const [jobWorkOrder, setJobWorkOrder] = useState('');
  const [jobDescriptionInput, setJobDescriptionInput] = useState('');
  const [createdJobLinkInfo, setCreatedJobLinkInfo] = useState<{ id: string; jobNo: string; url: string } | null>(null);
  const [createPackageMode, setCreatePackageMode] = useState<'single' | 'bulk'>('single');
  const [isCreateFormOpen, setIsCreateFormOpen] = useState(true);
  const [hubPlantFilter, setHubPlantFilter] = useState<'All' | 'Phra Khanong' | 'Sriracha'>('All');

  // Step 3: Plot Plan Pinning & Footprint State
  const [showPlotPlanPinning, setShowPlotPlanPinning] = useState<boolean>(true);
  const [markingType, setMarkingType] = useState<'pin' | 'area' | 'both'>('both');
  const [jobPin, setJobPin] = useState<PinData | null>(null);
  const [scaleBlock, setScaleBlock] = useState<ScaleBlockData>({
    x: 50,
    y: 50,
    width: 14,
    height: 10,
    rotation: 0,
    color: 'emerald',
    blockType: 'laydown-yard',
    label: ''
  });

  // 12-Field Form State (Job & Turnover Module)
  const [formJobId, setFormJobId] = useState('');
  const [formJobDescription, setFormJobDescription] = useState('');
  const [formAreaUnit, setFormAreaUnit] = useState('');
  const [formTargetStartDate, setFormTargetStartDate] = useState('');
  const [formPlannedTurnoverDate, setFormPlannedTurnoverDate] = useState('');
  const [formEquipmentType, setFormEquipmentType] = useState(''); // Optional!
  const [formEquipmentTag, setFormEquipmentTag] = useState('');
  const [formDiscipline, setFormDiscipline] = useState('');
  const [formTurnoverSystem, setFormTurnoverSystem] = useState('');
  const [formJobLead, setFormJobLead] = useState('');

  // Duplicate Job ID Check (Prevents duplicate creation)
  const isJobIdDuplicate = useMemo(() => {
    if (!formJobId.trim()) return false;
    if (checkJobIdExists) return checkJobIdExists(formJobId.trim());
    return jobs.some(j => (j.jobNo && j.jobNo.trim().toLowerCase() === formJobId.trim().toLowerCase()) || (j.id && j.id.trim().toLowerCase() === formJobId.trim().toLowerCase()));
  }, [formJobId, jobs, checkJobIdExists]);

  // Required Fields Validation: Every field required EXCEPT Equipment Type + ID must NOT be duplicate
  const isFormValid = useMemo(() => {
    return Boolean(
      formJobId.trim() &&
      !isJobIdDuplicate &&
      formJobDescription.trim() &&
      selectedPlant &&
      formAreaUnit &&
      formTargetStartDate &&
      formPlannedTurnoverDate &&
      formEquipmentTag.trim() &&
      formDiscipline &&
      formTurnoverSystem.trim() &&
      formJobLead
    );
  }, [
    formJobId,
    isJobIdDuplicate,
    formJobDescription,
    selectedPlant,
    formAreaUnit,
    formTargetStartDate,
    formPlannedTurnoverDate,
    formEquipmentTag,
    formDiscipline,
    formTurnoverSystem,
    formJobLead
  ]);

  const missingFieldLabels = useMemo(() => {
    const list: string[] = [];
    if (!formJobId.trim()) list.push('Job ID');
    else if (isJobIdDuplicate) list.push(isTh ? 'Job ID (รหัสนี้มีอยู่ในระบบแล้ว ห้ามใช้ซ้ำ)' : 'Job ID (Already exists in system)');
    if (!formJobDescription.trim()) list.push('Job Description');
    if (!selectedPlant) list.push('Plant');
    if (!formAreaUnit) list.push('Location: Area/Unit');
    if (!formTargetStartDate) list.push('Target Start Date');
    if (!formPlannedTurnoverDate) list.push('Planned Turnover Date');
    if (!formEquipmentTag.trim()) list.push('Equipment Tag');
    if (!formDiscipline) list.push('Discipline');
    if (!formTurnoverSystem.trim()) list.push('Turnover System');
    if (!formJobLead) list.push('Job Supervisor >> Job lead');
    return list;
  }, [
    formJobId,
    isJobIdDuplicate,
    formJobDescription,
    selectedPlant,
    formAreaUnit,
    formTargetStartDate,
    formPlannedTurnoverDate,
    formEquipmentTag,
    formDiscipline,
    formTurnoverSystem,
    formJobLead
  ]);

  const resetCreateForm = () => {
    setFormJobId('');
    setFormJobDescription('');
    setFormAreaUnit('');
    setFormTargetStartDate('');
    setFormPlannedTurnoverDate('');
    setFormEquipmentType('');
    setFormEquipmentTag('');
    setFormDiscipline('');
    setFormTurnoverSystem('');
    setFormJobLead('');
    setJobTitle('');
    setEventName('');
    setEventStartDate('');
    setEventTargetDate('');
    setEventMilestone('');
    setSelectedUnitId('');
    setSelectedSystemId('');
    setSelectedAssetTag('');
    setSelectedAsset(null);
    setJobWorkOrder('');
    setJobDescriptionInput('');
    setJobPin(null as any);
    setScaleBlock({
      x: 50,
      y: 50,
      width: 14,
      height: 10,
      rotation: 0,
      color: 'emerald',
      blockType: 'laydown-yard',
      label: ''
    });
    setCreatedJobLinkInfo(null);
  };

  const handleFillSampleData = () => {
    setFormJobId('TO-PK-2026-7782');
    setFormJobDescription('Overhaul and hydro-jetting inspection of crude column overhead condensing circuit and re-tubing evaluation.');
    setSelectedPlant('Phra Khanong');
    setFormAreaUnit('S2 - APS-1, APS-2, FCCU, GOHF-3');
    setFormTargetStartDate('2026-11-01');
    setFormPlannedTurnoverDate('2026-11-15');
    setFormEquipmentType('Heat Exchanger / Cooler (อุปกรณ์แลกเปลี่ยนความร้อน)');
    setFormEquipmentTag('S2-E-101A/B');
    setFormDiscipline('MAD — อุปกรณ์นิ่งและท่อ เช่น หอกลั่น/ถัง (Mechanical Static & Piping)');
    setFormTurnoverSystem('SYS-13 Crude Overhead & Reflux System');
    setFormJobLead('นายวิชัย เลิศวิทยา (Lead Turnaround Supervisor)');
    setJobPin({
      x: 28.0,
      y: 32.0,
      label: 'S2-E-101A/B Overhead Condenser',
      radius: 15
    });
    setScaleBlock({
      x: 28.0,
      y: 32.0,
      width: 14,
      height: 10,
      rotation: 0,
      color: 'emerald',
      blockType: 'laydown-yard',
      label: 'Overhead Condenser Working Footprint'
    });
  };

  // Handle Bulk Batch Creation with Duplicate Check & Global Live Sync
  const handleBatchCreateJobs = (newJobs: JobRecord[]) => {
    const res = batchCreateJobs(newJobs);
    if (!res.success) {
      alert(res.error || 'Duplicate Job IDs found. Cannot import.');
      return;
    }
    if (newJobs.length > 0) {
      setSelectedJobId(newJobs[0].id);
    }
  };

  // Step 5: Sign Tab Form State
  const [signDecision, setSignDecision] = useState<'Accept' | 'Not Accept'>('Accept');
  const [signComment, setSignComment] = useState('');
  const [signerName, setSignerName] = useState('Somchai Prasert');
  const [signerRole, setSignerRole] = useState('Operations (ฝ่ายปฏิบัติการผลิต)');
  const [customRoleInput, setCustomRoleInput] = useState('');
  const [isAddingCustomRole, setIsAddingCustomRole] = useState(false);
  const [isSignedPad, setIsSignedPad] = useState(false);
  const [acceptanceRemarks, setAcceptanceRemarks] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');

  // TAM Not Accept Punch/Butt creation form fields
  const [notAcceptItemType] = useState<'Punch' | 'Butt'>('Punch'); // Always Punch List
  const [notAcceptPunchChoice, setNotAcceptPunchChoice] = useState<string>('');
  const [notAcceptRemedialWorks, setNotAcceptRemedialWorks] = useState('');

  // Options for the Punch List dropdown = Punch List entries / Not-Accept remarks users have previously keyed
  const previousPunchReasons = useMemo(() => {
    const seen = new Set<string>();
    const list: string[] = [];
    const add = (t?: string) => {
      const v = (t || '').trim();
      if (v && !seen.has(v)) {
        seen.add(v);
        list.push(v);
      }
    };
    jobs.forEach(j => {
      (j.punchList || []).forEach(p => add(p.remedialWorks || p.description));
      (j.signatures || []).forEach(s => add(s.rejectionReason));
    });
    return list;
  }, [jobs]);
  const [notAcceptDiscipline, setNotAcceptDiscipline] = useState('M - Mechanical');
  const [notAcceptContractor, setNotAcceptContractor] = useState('BCP Maintenance Team (ฝ่ายซ่อมบำรุงโรงกลั่น)');
  const [notAcceptCategory, setNotAcceptCategory] = useState<PunchCategory>('A');
  const [notAcceptPlannedDate, setNotAcceptPlannedDate] = useState(() => new Date(Date.now() + 86400000 * 3).toISOString().slice(0, 10));

  // Tab 2: Punch List Modal / Add Item Form State
  const [isAddPunchModalOpen, setIsAddPunchModalOpen] = useState(false);
  const [newPunchItemType, setNewPunchItemType] = useState<'Punch' | 'Butt'>('Punch');
  const [newPunchRemedialWorks, setNewPunchRemedialWorks] = useState('');
  const [newPunchDiscipline, setNewPunchDiscipline] = useState('M - Mechanical');
  const [newPunchContractor, setNewPunchContractor] = useState('BCP Maintenance Team (ฝ่ายซ่อมบำรุงโรงกลั่น)');
  const [newPunchCategory, setNewPunchCategory] = useState<PunchCategory>('A');
  const [newPunchPlannedDate, setNewPunchPlannedDate] = useState(() => new Date(Date.now() + 86400000 * 3).toISOString().slice(0, 10));

  // Punch Item Actions (Contractor Close & Job Lead Verify)
  const [contractorClosingItem, setContractorClosingItem] = useState<PunchItem | null>(null);
  const [contractorCloseName, setContractorCloseName] = useState('สมพร มั่นคง (Contractor Lead)');
  const [contractorCloseDate, setContractorCloseDate] = useState(() => new Date().toISOString().slice(0, 10));

  const [jobLeadVerifyingItem, setJobLeadVerifyingItem] = useState<PunchItem | null>(null);
  const [jobLeadVerifyName, setJobLeadVerifyName] = useState('สมชาย ใจมั่น (Job Lead)');

  // Step 6: Punch List Tab Form State (Legacy Quick Add)
  const [punchType, setPunchType] = useState('Flange Leaks / Gasket');
  const [punchCustomType, setPunchCustomType] = useState('');
  const [punchCategory, setPunchCategory] = useState<PunchCategory>('A');
  const [punchDescription, setPunchDescription] = useState('');
  const [punchPhotoRequired, setPunchPhotoRequired] = useState(true);

  // Step 2 QR & Link States
  const [hasCopiedLink, setHasCopiedLink] = useState(false);

  // Digital Signature Pad State
  const [drawnSignatureDataUrl, setDrawnSignatureDataUrl] = useState<string | null>(null);
  const [isSignModalOpen, setIsSignModalOpen] = useState(false);
  const [isReSigning, setIsReSigning] = useState(false);
  // Signer roles are configured per plant (Settings) and drive the Signer Role dropdown in the Sign tab
  const [signerRolesByPlant, setSignerRolesByPlant] = useState<Record<'Phra Khanong' | 'Sriracha', string[]>>(() => {
    try {
      const saved = localStorage.getItem(SIGNER_ROLES_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed?.['Phra Khanong']) && Array.isArray(parsed?.['Sriracha'])) return parsed;
      }
    } catch { /* fall back to defaults */ }
    return {
      'Phra Khanong': [...DEFAULT_SIGNER_ROLES],
      'Sriracha': [...DEFAULT_SIGNER_ROLES]
    };
  });
  const [rolesEditPlant, setRolesEditPlant] = useState<'Phra Khanong' | 'Sriracha'>('Phra Khanong');
  useEffect(() => {
    try { localStorage.setItem(SIGNER_ROLES_STORAGE_KEY, JSON.stringify(signerRolesByPlant)); } catch { /* ignore */ }
  }, [signerRolesByPlant]);
  const [isAddingNewRoleModalOpen, setIsAddingNewRoleModalOpen] = useState(false);
  const [newRoleInput, setNewRoleInput] = useState('');

  // Punch List Resolution with Mandatory Photo
  const [resolvingPunchItem, setResolvingPunchItem] = useState<PunchItem | null>(null);
  const [resolutionPhoto, setResolutionPhoto] = useState<string | null>(null);
  const [resolutionComment, setResolutionComment] = useState('');

  // Dashboard Drill-Down State & Certificate Modal
  const [punchDrillDownCategory, setPunchDrillDownCategory] = useState<'A' | 'B' | 'C' | null>(null);
  const [showCertificateModal, setShowCertificateModal] = useState(false);

  // Multi-Plant Filtering & Switching
  const [selectedPlantFilter, setSelectedPlantFilter] = useState<'All' | 'Phra Khanong' | 'Sriracha'>('All');
  const [selectedPlantsForEvent, setSelectedPlantsForEvent] = useState<('Phra Khanong' | 'Sriracha')[]>(['Phra Khanong']);

  // File Input Refs
  const attachmentFileInputRef = useRef<HTMLInputElement | null>(null);
  const resolutionFileInputRef = useRef<HTMLInputElement | null>(null);
  const signPhotoInputRef = useRef<HTMLInputElement | null>(null);
  const [signPhotoUrl, setSignPhotoUrl] = useState<string | null>(null);
  const closePhotoInputRef = useRef<HTMLInputElement | null>(null);
  const [closePhotoUrl, setClosePhotoUrl] = useState<string | null>(null);
  const [zoomImageUrl, setZoomImageUrl] = useState<string | null>(null);
  const [isDragOverAttachment, setIsDragOverAttachment] = useState<boolean>(false);

  // Currently Active Selected Job with fallback object
  const fallbackJob: JobRecord = jobs[0] || {
    id: 'job-default',
    jobNo: 'TO-PK-2026-001',
    title: 'Turnover Default Package',
    eventName: 'Annual Turnaround 2026',
    plant: 'Phra Khanong',
    unit: 'APS-1 (Atmospheric Distillation Unit 1)',
    system: 'System-11 (Crude Feed & Desalter)',
    workOrder: 'WO-100001',
    description: 'Default package',
    assetTag: 'TAG-DEFAULT',
    attachments: [],
    signatures: [],
    punchList: [],
    createdAt: new Date().toISOString().slice(0, 10)
  };
  const currentJob = jobs.find(j => j.id === selectedJobId) || fallbackJob;
  const currentPlantKey: 'Phra Khanong' | 'Sriracha' = currentJob?.plant === 'Sriracha' ? 'Sriracha' : 'Phra Khanong';
  const currentPlantRoles = (currentPlantKey && signerRolesByPlant[currentPlantKey]) || [];

  // Keep the selected Signer Role valid for the job's plant
  useEffect(() => {
    if (currentPlantRoles.length > 0 && !currentPlantRoles.includes(signerRole)) {
      setSignerRole(currentPlantRoles[0]);
    }
  }, [currentPlantKey, currentPlantRoles, signerRole]);

  // Helper Logic (Step 9: Complete T/O):
  // Job จะเปลี่ยนเป็นสถานะ Completed เมื่อ:
  // 1. Sign ครบตามที่กำหนด (ได้รับการ Sign ยอมรับอย่างน้อย 2 ฝ่ายหลัก: Operation และ Job Owner/Maintenance หรือครบ 5 ฝ่าย และไม่มี Reject)
  // 2. Punch List ดำเนินการครบทั้งหมด (ไม่มีข้อใดค้างเป็น Open)
  // หากอย่างใดอย่างหนึ่งยังไม่ครบ ให้สถานะ T/O เป็น In Progress
  // TAM Item Open / Closed Checker
  const isPunchItemOpen = (p: PunchItem): boolean => sharedIsPunchItemOpen(p as any);

  const isJobSignaturesComplete = (job: JobRecord): boolean => {
    return getJobAcceptanceStatus(job) === 'Accepted';
  };

  const isJobPunchListComplete = (job: JobRecord): boolean => {
    if (!job.punchList || job.punchList.length === 0) return true;
    return job.punchList.every(p => !isPunchItemOpen(p));
  };

  const isJobCompleted = (job: JobRecord): boolean => {
    return getJobTurnoverStatus(job) === 'Completed';
  };

  // TAM Workflow Status Helpers
  const getJobAcceptanceStatus = (job: JobRecord): AcceptanceStatus => sharedGetAcceptanceStatus(job as any) as AcceptanceStatus;

  const getJobTurnoverStatus = (job: JobRecord): TurnoverWorkflowStatus => {
    if (job.turnoverStatus) return job.turnoverStatus;
    const accStatus = getJobAcceptanceStatus(job);
    if (accStatus === 'Accepted') return 'Completed';
    if (accStatus === 'Not Accepted') return 'Rejected';
    if (accStatus === 'Pending Re-Accept') return 'Reviewed';
    return 'In Progress';
  };

  const currentJobStatus = isJobCompleted(currentJob) ? 'Completed' : 'In Progress';

  // Step 8: Selected Job for Punch List Details Modal
  const [selectedJobIdForPunchModal, setSelectedJobIdForPunchModal] = useState<string | null>(null);
  const selectedJobForPunchModal = jobs.find(j => j.id === selectedJobIdForPunchModal) || null;

  // Cascading Hierarchy Options & Asset Data Mockup
  const allAssets = useMemo(() => getAllFlattenedAssets(), []);
  const hierarchyUnits = useMemo(() => getHierarchyUnits(), []);

  // Filter units matching selected plant
  const filteredHierarchyUnits = useMemo(() => {
    return hierarchyUnits.filter(u => {
      if (selectedPlant === 'Sriracha') {
        return u.id === 'unit-vps2';
      }
      return u.id === 'unit-aps1' || u.id === 'unit-khf1';
    });
  }, [hierarchyUnits, selectedPlant]);

  const availableSystems = useMemo(() => getSystemsForUnit(selectedUnitId), [selectedUnitId]);
  const availableEquipment = useMemo(() => getEquipmentForSystem(selectedUnitId, selectedSystemId), [selectedUnitId, selectedSystemId]);

  // Asset search & autocomplete
  const [assetSearchQuery, setAssetSearchQuery] = useState('');
  const quickMatchingAssets = useMemo(() => {
    if (!assetSearchQuery.trim()) {
      return allAssets.filter(a => a.isCriticalPath).slice(0, 5);
    }
    const q = assetSearchQuery.toLowerCase().trim();
    return allAssets
      .filter(a =>
        a.tag.toLowerCase().includes(q) ||
        (a.refCode && a.refCode.toLowerCase().includes(q)) ||
        (a.description && a.description.toLowerCase().includes(q)) ||
        a.systemName.toLowerCase().includes(q) ||
        a.unitName.toLowerCase().includes(q)
      )
      .slice(0, 6);
  }, [allAssets, assetSearchQuery]);

  // Handle selecting an asset from tree modal or quick chip
  const handleSelectAssetNode = (asset: FlatAssetHierarchyItem) => {
    setSelectedAsset(asset);
    setSelectedUnitId(asset.unitId);
    setSelectedSystemId(asset.systemId);
    setSelectedAssetTag(asset.tag);

    // Sync plant site based on asset unit
    if (asset.unitId === 'unit-vps2') {
      setSelectedPlant('Sriracha');
    } else {
      setSelectedPlant('Phra Khanong');
    }

    setJobTitle(`Overhaul & Inspection of ${asset.tag} (${asset.description || 'Process Equipment'})`);
    setJobWorkOrder(`WO-${asset.unitName.split(' ')[0]}-${Math.floor(100000 + Math.random() * 900000)}`);
    setJobDescriptionInput(
      `Turnaround mechanical package for ${asset.tag} (Ref ${asset.refCode || 'N/A'}) - ${asset.description || 'Process Equipment'}. ` +
      `Execute vessel blinding isolation, internal non-destructive testing (NDT), valve overhaul, and bolt torque certification under ${asset.systemName} boundary.`
    );

    // Sync Plot Plan Pin and Footprint with selected asset spatial coordinates
    if (asset.plotPlanMarker) {
      setJobPin({
        x: asset.plotPlanMarker.x,
        y: asset.plotPlanMarker.y,
        label: asset.tag || 'Asset Pin Location',
        radius: 15
      });
      setScaleBlock(prev => ({
        ...prev,
        x: asset.plotPlanMarker.x,
        y: asset.plotPlanMarker.y,
        label: `${asset.tag} Work Boundary`
      }));
    }
  };

  // Sync with global plant filter from Top Bar (Header)
  useEffect(() => {
    if (globalPlantFilter) {
      setDashboardPlantFilter(globalPlantFilter);
      setHubPlantFilter(globalPlantFilter);
      if (globalPlantFilter !== 'All') {
        setSelectedPlant(globalPlantFilter);
        if (globalPlantFilter === 'Sriracha') {
          handleUnitChange('unit-vps2');
        } else {
          handleUnitChange('unit-aps1');
        }
      }
    }
  }, [globalPlantFilter]);

  // Handle plant change with automatic unit sync
  const handlePlantChange = (plant: 'Phra Khanong' | 'Sriracha') => {
    setSelectedPlant(plant);
    if (onGlobalPlantFilterChange) {
      onGlobalPlantFilterChange(plant);
    }
    if (plant === 'Sriracha') {
      handleUnitChange('unit-vps2');
    } else {
      handleUnitChange('unit-aps1');
    }
  };

  // Handle unit dropdown change
  const handleUnitChange = (unitId: string) => {
    setSelectedUnitId(unitId);
    const systems = getSystemsForUnit(unitId);
    if (systems.length > 0) {
      setSelectedSystemId(systems[0].id);
      const eqList = systems[0].equipment;
      if (eqList.length > 0) {
        handleEquipmentTagChange(eqList[0].tag, unitId, systems[0].id);
      } else {
        setSelectedAssetTag('');
        setSelectedAsset(null);
      }
    }
  };

  // Handle system dropdown change
  const handleSystemChange = (sysId: string) => {
    setSelectedSystemId(sysId);
    const eqList = getEquipmentForSystem(selectedUnitId, sysId);
    if (eqList.length > 0) {
      handleEquipmentTagChange(eqList[0].tag, selectedUnitId, sysId);
    } else {
      setSelectedAssetTag('');
      setSelectedAsset(null);
    }
  };

  // Handle equipment tag dropdown change
  const handleEquipmentTagChange = (tag: string, unitId?: string, sysId?: string) => {
    setSelectedAssetTag(tag);
    const found = findAssetByTag(tag);
    if (found) {
      setSelectedAsset(found);
      setJobTitle(`Overhaul & Inspection of ${found.tag} (${found.description || 'Process Equipment'})`);
      setJobDescriptionInput(
        `Turnaround mechanical package for ${found.tag} (Ref ${found.refCode || 'N/A'}). ` +
        `Inspect internal components, execute hydro-testing, verify boundary limits, and complete sign-off prerequisites.`
      );
    }
  };

  // Handle Create Job Submission
  const handleCreateJob = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanJobId = formJobId.trim();

    // Strict duplicate check before proceeding
    if (checkJobIdExists(cleanJobId)) {
      alert(
        isTh
          ? `❌ รหัส Job ID "${cleanJobId}" มีอยู่ในระบบแล้ว ไม่สามารถสร้างซ้ำได้ กรุณาใช้รหัสอื่น`
          : `❌ Job ID "${cleanJobId}" already exists in the system. Duplicate Job ID is not allowed.`
      );
      return;
    }

    if (!isFormValid) {
      alert(
        isTh
          ? `กรุณากรอกข้อมูลในช่องที่จำเป็น (*) ให้ครบถ้วนก่อนสร้างงาน (ยังขาด: ${missingFieldLabels.join(', ')})`
          : `Please fill in all required fields (*) before creating the job (Missing: ${missingFieldLabels.join(', ')})`
      );
      return;
    }

    const newId = `job-${Date.now()}`;
    const directUrl = `https://bcp-turnover.enterprise.internal/jobs/${cleanJobId}`;
    const randomNum = Math.floor(1000 + Math.random() * 9000);

    const newJob: JobRecord = {
      id: newId,
      jobNo: cleanJobId,
      title: `${cleanJobId} — ${formJobDescription.trim().slice(0, 45)}${formJobDescription.length > 45 ? '...' : ''}`,
      eventName: `${selectedPlant} Turnaround 2026`,
      plant: selectedPlant,
      unit: formAreaUnit,
      unitId: formAreaUnit.split(' - ')[0]?.toLowerCase() || 's1',
      system: formTurnoverSystem.trim(),
      systemId: `sys-${Date.now()}`,
      workOrder: `WO-${randomNum}`,
      description: formJobDescription.trim(),
      // Linked Equipment & Metadata
      assetTag: formEquipmentTag.trim(),
      assetDescription: formEquipmentType || 'Process Equipment',
      hierarchyLevel: 'Level 3 • Equipment',
      hierarchyPath: `${formAreaUnit} > ${formTurnoverSystem.trim()} > ${formEquipmentTag.trim()}`,
      isCriticalPath: false,
      gridZone: formAreaUnit.includes('S1') ? 'Zone S1' : formAreaUnit.includes('S2') ? 'Zone S2' : 'Zone S3',
      plotPlanX: markingType === 'area' ? scaleBlock.x : (jobPin?.x ?? 50),
      plotPlanY: markingType === 'area' ? scaleBlock.y : (jobPin?.y ?? 50),
      plotPlanId: 'plan-scaffolding-cad',
      plotPlanRadius: jobPin?.radius || 15,
      plotPlanWidth: scaleBlock.width,
      plotPlanHeight: scaleBlock.height,
      plotPlanRotation: scaleBlock.rotation,
      markingType,
      attachments: [],
      signatures: [],
      punchList: [],
      createdAt: new Date().toISOString().split('T')[0],
      // Required & Optional Additional Fields
      targetStartDate: formTargetStartDate,
      plannedTurnoverDate: formPlannedTurnoverDate,
      equipmentType: formEquipmentType,
      discipline: formDiscipline,
      turnoverSystem: formTurnoverSystem.trim(),
      jobLead: formJobLead
    };

    const nextJobs = [newJob, ...jobs];
    setJobs(nextJobs);
    setSelectedJobId(newId);
    setCreatedJobLinkInfo({ id: newId, jobNo: cleanJobId, url: directUrl });

    try {
      localStorage.setItem('plantturn_shared_jobs_v3', JSON.stringify(nextJobs));
      window.dispatchEvent(new CustomEvent('plantturn_jobs_updated', { detail: { job: newJob } }));
    } catch (e) {
      console.error(e);
    }
    logActivity('Create Job', 'Job Location & Turnover', `Created new job ${newJob.jobNo} (${newJob.title})`, newId, newJob.jobNo);
  };

  // Download QR Code as PNG image
  const handleDownloadQR = () => {
    const svgElement = document.getElementById('job-qr-code-svg');
    if (!svgElement) return;
    const svgData = new XMLSerializer().serializeToString(svgElement);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();
    img.onload = () => {
      canvas.width = 320;
      canvas.height = 320;
      if (ctx) {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, 320, 320);
        ctx.drawImage(img, 10, 10, 300, 300);
      }
      const pngFile = canvas.toDataURL('image/png');
      const downloadLink = document.createElement('a');
      downloadLink.download = `${createdJobLinkInfo?.jobNo || 'Turnover_Job'}_QRCode.png`;
      downloadLink.href = pngFile;
      downloadLink.click();
    };
    img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)));
  };

  // Copy Direct Link
  const handleCopyDirectLink = () => {
    if (!createdJobLinkInfo?.url) return;
    navigator.clipboard.writeText(createdJobLinkInfo.url);
    setHasCopiedLink(true);
    setTimeout(() => setHasCopiedLink(false), 2000);
  };

  // File Upload for Attachments (handles FileList, File[], or ChangeEvent)
  const handleFileUpload = (source: FileList | File[] | React.ChangeEvent<HTMLInputElement>) => {
    let files: File[] = [];
    if ('target' in source) {
      if (source.target.files) {
        files = Array.from(source.target.files);
        source.target.value = '';
      }
    } else {
      files = Array.from(source as any);
    }
    if (files.length === 0) return;

    const newAttachments: JobAttachment[] = files.map((file: File) => {
      const sizeStr = file.size < 1024 * 1024
        ? `${(file.size / 1024).toFixed(1)} KB`
        : `${(file.size / (1024 * 1024)).toFixed(1)} MB`;
      const extension = file.name.split('.').pop()?.toLowerCase() || 'file';
      const fileUrl = URL.createObjectURL(file);
      const nowStr = new Date().toISOString().replace('T', ' ').slice(0, 16);

      return {
        name: file.name,
        size: sizeStr,
        type: extension,
        url: fileUrl,
        uploadedAt: nowStr
      };
    });

    setJobs(prev => prev.map(j => {
      if (j.id === currentJob.id) {
        return {
          ...j,
          attachments: [...j.attachments, ...newAttachments]
        };
      }
      return j;
    }));
  };


  // Photo Upload for Punch Resolution
  const handleResolutionPhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      setResolutionPhoto(event.target?.result as string);
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  // Punch Resolution Handlers
  const handleInitiatePunchResolution = (punch: PunchItem) => {
    if (punch.status === 'Resolved') {
      // Toggle back to Open
      setJobs(prev => prev.map(j => {
        if (j.id === currentJob.id) {
          return {
            ...j,
            punchList: j.punchList.map(p => p.id === punch.id ? { ...p, status: 'Open' } : p)
          };
        }
        return j;
      }));
      return;
    }

    if (punch.photoRequired) {
      setResolvingPunchItem(punch);
      setResolutionPhoto(null);
      setResolutionComment('');
    } else {
      // Direct resolution
      setJobs(prev => prev.map(j => {
        if (j.id === currentJob.id) {
          return {
            ...j,
            punchList: j.punchList.map(p => p.id === punch.id ? {
              ...p,
              status: 'Resolved',
              resolvedAt: new Date().toISOString().replace('T', ' ').slice(0, 16)
            } : p)
          };
        }
        return j;
      }));
    }
  };

  const handleConfirmPunchResolution = () => {
    if (!resolvingPunchItem) return;
    if (resolvingPunchItem.photoRequired && !resolutionPhoto) {
      alert('Photo proof is mandatory for closing this punch item.');
      return;
    }

    setJobs(prev => prev.map(j => {
      if (j.id === currentJob.id) {
        return {
          ...j,
          punchList: j.punchList.map(p => p.id === resolvingPunchItem.id ? {
            ...p,
            status: 'Resolved',
            resolutionPhotoUrl: resolutionPhoto || undefined,
            resolutionComment: resolutionComment.trim() || undefined,
            resolvedAt: new Date().toISOString().replace('T', ' ').slice(0, 16)
          } : p)
        };
      }
      return j;
    }));

    setResolvingPunchItem(null);
    setResolutionPhoto(null);
    setResolutionComment('');
  };

  // Export Sign Log (per Job) — signer NAMES as text, not hand-drawn signature images
  const handleExportSignatures = () => {
    const q = (v: unknown) => `"${String(v ?? '').replace(/"/g, '""')}"`;
    const headers = ['Job No', 'Job Title', 'Step', 'Signer Name', 'Role', 'Decision / Action', 'Date-Time', 'Reason / Remarks', 'Reference'];
    const rows: string[] = [];
    currentJob.signatures.forEach((s, idx) => {
      rows.push([
        currentJob.jobNo, currentJob.title, `Acceptance Round #${idx + 1}`, s.name, s.role, s.decision,
        s.signedAt, [s.rejectionReason && `Reject: ${s.rejectionReason}`, s.comment && `Remarks: ${s.comment}`].filter(Boolean).join(' | '),
        s.relatedAcceptanceId || ''
      ].map(q).join(','));
    });
    currentJob.punchList.forEach(p => {
      if (p.closedBy) rows.push([currentJob.jobNo, currentJob.title, 'Punch Close-out', p.closedBy, 'Contractor', 'Closed', p.closedDate || '', p.remedialWorks || p.description, p.id].map(q).join(','));
      if (p.verifiedBy) rows.push([currentJob.jobNo, currentJob.title, 'Punch Verification', p.verifiedBy, 'Job Lead', 'Verified', p.verificationTimestamp || '', p.remedialWorks || p.description, p.id].map(q).join(','));
    });
    if (rows.length === 0) {
      alert(isTh ? 'ยังไม่มีข้อมูลการลงนามให้ Export' : 'No sign records to export yet');
      return;
    }
    const csv = '\uFEFF' + [headers.map(q).join(','), ...rows].join('\r\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = `${currentJob.jobNo}_Sign_Log.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  // Add New Signer Role (to the plant being edited in Settings)
  const handleAddNewRole = () => {
    if (!newRoleInput.trim()) return;
    const role = newRoleInput.trim();
    setSignerRolesByPlant(prev => prev[rolesEditPlant].includes(role)
      ? prev
      : { ...prev, [rolesEditPlant]: [...prev[rolesEditPlant], role] });
    setNewRoleInput('');
    setIsAddingNewRoleModalOpen(false);
  };

  const handleRemoveRole = (role: string) => {
    setSignerRolesByPlant(prev => prev[rolesEditPlant].length <= 1
      ? prev
      : { ...prev, [rolesEditPlant]: prev[rolesEditPlant].filter(r => r !== role) });
  };

  // Open Sign Modal with Pre-filled Role
  const handleOpenSignModal = (roleTitle: string, defaultName?: string) => {
    setSignerRole(roleTitle);
    if (!signerName || signerName.trim() === '') {
      setSignerName(defaultName || '');
    }
    setSignDecision('Accept');
    setSignComment('');
    setDrawnSignatureDataUrl(null);
    setIsSignedPad(false);
    setIsSignModalOpen(true);
  };

  // Submit Acceptance Decision (Tab 1 — Sign)
  const handleSubmitAcceptance = (customSigUrl?: string) => {
    if (!signerName.trim()) {
      alert(isTh ? 'กรุณากรอกชื่อ-นามสกุล ผู้ลงนาม' : 'Please enter Signer Full Name');
      return;
    }

    const finalSigUrl = customSigUrl || drawnSignatureDataUrl;
    if (!finalSigUrl && !isSignedPad) {
      alert(isTh ? 'กรุณาลงลายเซ็นดิจิทัล (Digital Signature) ก่อนบันทึก' : 'Please sign using the digital signature pad before submission');
      return;
    }

    const effectiveRejectionReason = rejectionReason.trim() || signComment.trim();
    if (signDecision === 'Not Accept' && !effectiveRejectionReason) {
      alert(isTh ? 'กรณี Not Accept กรุณาระบุสาเหตุที่ไม่ยอมรับ (Rejection Reason)' : 'Please specify rejection reason for Not Accept decision');
      return;
    }

    const finalRole = isAddingCustomRole && customRoleInput.trim() ? customRoleInput.trim() : signerRole;
    const acceptanceId = `ACC-${Date.now().toString().slice(-6)}`;

    let newPunchItem: PunchItem | null = null;
    if (signDecision === 'Not Accept') {
      const finalRemedialWorks = notAcceptRemedialWorks.trim() || effectiveRejectionReason;
      newPunchItem = {
        id: `PB-${Date.now().toString().slice(-6)}`,
        itemType: notAcceptItemType,
        remedialWorks: finalRemedialWorks,
        discipline: notAcceptDiscipline,
        contractor: notAcceptContractor,
        punchCategory: notAcceptCategory,
        punchStatus: 'In Progress',
        plannedDate: notAcceptPlannedDate,
        relatedJobId: currentJob.jobNo || currentJob.id,
        relatedAcceptanceId: acceptanceId,
        type: `${notAcceptItemType}: ${finalRemedialWorks.slice(0, 30)}...`,
        category: notAcceptCategory,
        description: finalRemedialWorks,
        photoRequired: true,
        status: 'Open',
        reportedBy: `${signerName.trim()} (${finalRole})`,
        timestamp: new Date().toISOString().replace('T', ' ').slice(0, 16),
        isContractorClosed: false,
        isVerified: false
      };
    }

    const newSig: SignatureRecord = {
      id: `sig-${Date.now()}`,
      role: finalRole,
      name: signerName.trim(),
      decision: signDecision,
      comment: acceptanceRemarks.trim() || undefined,
      rejectionReason: signDecision === 'Not Accept' ? effectiveRejectionReason : undefined,
      signedAt: new Date().toISOString().replace('T', ' ').slice(0, 16),
      signatureDataUrl: finalSigUrl || undefined,
      photoUrl: signPhotoUrl || undefined,
      relatedAcceptanceId: acceptanceId
    };

    setJobs(prev => prev.map(j => {
      if (j.id === currentJob.id) {
        const nextSignatures = [...j.signatures, newSig];
        const nextPunches = newPunchItem ? [newPunchItem, ...j.punchList] : j.punchList;
        return {
          ...j,
          signatures: nextSignatures,
          punchList: nextPunches,
          acceptanceStatus: signDecision === 'Accept' ? 'Accepted' : 'Not Accepted',
          turnoverStatus: signDecision === 'Accept' ? 'Completed' : 'Rejected'
        };
      }
      return j;
    }));

    setIsSignedPad(false);
    setDrawnSignatureDataUrl(null);
    setSignPhotoUrl(null);
    setIsSignModalOpen(false);
    setIsReSigning(false);
    setNotAcceptPunchChoice('');
    setRejectionReason('');

    if (signDecision === 'Not Accept') {
      alert(isTh
        ? `บันทึกผล Not Accept และสร้างรายการ ${notAcceptItemType} รหัส ${newPunchItem?.id} เชื่อมโยงกับ Job แล้ว! ท่านสามารถติดตามสถานะการแก้ไขได้ที่แท็บ Punch List`
        : `Recorded Not Accept and generated punch item ${newPunchItem?.id} linked to this Job! View it under Punch List tab.`
      );
      setTurnoverSubTab('punchlist');
    } else {
      alert(isTh
        ? `บันทึกการส่งมอบระบบ (Accept) เรียบร้อยแล้ว! สถานะอัปเดตเป็น Accepted`
        : `Turnover accepted successfully! Acceptance status updated to Accepted.`
      );
    }
  };

  // Alias for backward compatibility with modal or direct calls
  const handleAddSignature = (customSigUrl?: string) => {
    handleSubmitAcceptance(customSigUrl);
  };

  // Convert Not Accept Comment to Punch List Item
  const handleCreateNotAcceptAsPunchList = () => {
    const effectiveRejectionReason = rejectionReason.trim() || signComment.trim();
    if (!effectiveRejectionReason) {
      alert(isTh ? 'กรุณาระบุสาเหตุที่ไม่ยอมรับก่อนสร้างรายการ Punch List' : 'Please enter a rejection reason before creating a punch list.');
      return;
    }

    const acceptanceId = `ACC-${Date.now().toString().slice(-6)}`;
    const newPunch: PunchItem = {
      id: `PB-${Date.now().toString().slice(-6)}`,
      itemType: notAcceptItemType,
      remedialWorks: notAcceptRemedialWorks.trim() || effectiveRejectionReason,
      discipline: notAcceptDiscipline,
      contractor: notAcceptContractor,
      punchCategory: notAcceptCategory,
      punchStatus: 'In Progress',
      plannedDate: notAcceptPlannedDate,
      relatedJobId: currentJob.jobNo || currentJob.id,
      relatedAcceptanceId: acceptanceId,
      type: `${notAcceptItemType}: ${(notAcceptRemedialWorks.trim() || effectiveRejectionReason).slice(0, 30)}...`,
      category: notAcceptCategory,
      description: notAcceptRemedialWorks.trim() || effectiveRejectionReason,
      photoRequired: true,
      status: 'Open',
      reportedBy: signerName.trim() || 'QA Inspector',
      timestamp: new Date().toISOString().replace('T', ' ').slice(0, 16),
      isContractorClosed: false,
      isVerified: false
    };

    setJobs(prev => prev.map(j => {
      if (j.id === currentJob.id) {
        return { ...j, punchList: [newPunch, ...j.punchList] };
      }
      return j;
    }));

    setIsSignModalOpen(false);
    setIsReSigning(false);
    setNotAcceptPunchChoice('');
    setRejectionReason('');
    setTurnoverSubTab('punchlist');
    alert(isTh ? `สร้างรายการ ${notAcceptItemType} เรียบร้อยแล้ว!` : `Punch list item created and added to list!`);
  };

  // Contractor Closes Punch / Butt Item
  const handleContractorClosePunch = (item: PunchItem, name: string, closeDate: string, signatureDataUrl?: string) => {
    if (!name.trim()) {
      alert(isTh ? 'กรุณาระบุชื่อผู้รับเหมาผู้ปิดงาน' : 'Please specify contractor name');
      return;
    }
    if (!signatureDataUrl) {
      alert(isTh ? 'กรุณาเซ็นลายเซ็นดิจิทัลเพื่อยืนยันการแจ้งปิดงาน' : 'Please sign to confirm the close-out');
      return;
    }
    setJobs(prev => prev.map(j => {
      if (j.id === currentJob.id) {
        const updatedList = j.punchList.map(p => {
          if (p.id === item.id) {
            return {
              ...p,
              isContractorClosed: true,
              closedBy: name.trim(),
              closedDate: closeDate || new Date().toISOString().slice(0, 10),
              closedSignatureDataUrl: signatureDataUrl,
              resolutionPhotoUrl: closePhotoUrl || p.resolutionPhotoUrl,
              punchStatus: p.punchStatus === 'Cancel' ? 'Cancel' : 'In Progress' // Remains In Progress until Job Lead verifies
            };
          }
          return p;
        });
        return { ...j, punchList: updatedList };
      }
      return j;
    }));
    setContractorClosingItem(null);
    setClosePhotoUrl(null);
    alert(isTh ? 'บันทึกการปิดงานของ Contractor เรียบร้อยแล้ว! อยู่ระหว่างรอ Job Lead ตรวจสอบยืนยัน' : 'Contractor close recorded! Awaiting Job Lead verification.');
  };

  // Job Lead Verifies Punch / Butt Item
  const handleJobLeadVerifyPunch = (item: PunchItem, leadName: string) => {
    if (!leadName.trim()) {
      alert(isTh ? 'กรุณาระบุชื่อ Job Lead ผู้ตรวจสอบ' : 'Please specify Job Lead name');
      return;
    }
    const verifyTime = new Date().toISOString().replace('T', ' ').slice(0, 16);
    setJobs(prev => prev.map(j => {
      if (j.id === currentJob.id) {
        const updatedList = j.punchList.map(p => {
          if (p.id === item.id) {
            return {
              ...p,
              isVerified: true,
              verifiedBy: leadName.trim(),
              verificationTimestamp: verifyTime,
              punchStatus: 'Closed' as PunchStatusTAM,
              status: 'Resolved' as 'Resolved'
            };
          }
          return p;
        });

        // Check if all punch items are now verified (no open/unverified items left)
        const openOrUnverified = updatedList.filter(p => p.status !== 'Cancel' && (!p.isContractorClosed || !p.isVerified));
        const allVerified = openOrUnverified.length === 0;

        // CRITICAL TAM RULE: Do not automatically change Not Accepted to Accepted after a Punch item is closed.
        // Instead, mark as 'Pending Re-Accept' and require authorized user to return to Sign tab!
        const newAcceptanceStatus = (j.acceptanceStatus === 'Not Accepted' && allVerified)
          ? 'Pending Re-Accept'
          : j.acceptanceStatus;

        const newTurnoverStatus = (newAcceptanceStatus === 'Pending Re-Accept')
          ? 'Reviewed'
          : j.turnoverStatus;

        return {
          ...j,
          punchList: updatedList,
          acceptanceStatus: newAcceptanceStatus,
          turnoverStatus: newTurnoverStatus
        };
      }
      return j;
    }));
    setJobLeadVerifyingItem(null);
    alert(isTh ? 'Job Lead ตรวจสอบและอนุมัติผ่าน (Verified) เรียบร้อยแล้ว! รายการถูกปิด (Closed) สมบูรณ์' : 'Job Lead verified item successfully! Item status is now Closed.');
  };

  // Tab 2: Add New Punch / Butt Item
  const handleAddNewPunchItemTab2 = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPunchRemedialWorks.trim()) {
      alert(isTh ? 'กรุณาระบุรายละเอียดงานแก้ไข (Remedial Works)' : 'Please specify remedial works');
      return;
    }

    const newItem: PunchItem = {
      id: `PB-${Date.now().toString().slice(-6)}`,
      itemType: newPunchItemType,
      remedialWorks: newPunchRemedialWorks.trim(),
      discipline: newPunchDiscipline,
      contractor: newPunchContractor,
      punchCategory: newPunchCategory,
      punchStatus: 'In Progress',
      plannedDate: newPunchPlannedDate,
      relatedJobId: currentJob.jobNo || currentJob.id,
      type: `${newPunchItemType}: ${newPunchRemedialWorks.trim().slice(0, 30)}...`,
      category: newPunchCategory,
      description: newPunchRemedialWorks.trim(),
      photoRequired: true,
      status: 'Open',
      reportedBy: `${signerName.trim()} (${signerRole})`,
      timestamp: new Date().toISOString().replace('T', ' ').slice(0, 16),
      isContractorClosed: false,
      isVerified: false
    };

    setJobs(prev => prev.map(j => {
      if (j.id === currentJob.id) {
        return {
          ...j,
          punchList: [newItem, ...j.punchList]
        };
      }
      return j;
    }));

    setNewPunchRemedialWorks('');
    setIsAddPunchModalOpen(false);
    alert(isTh ? `เพิ่มรายการ ${newPunchItemType} สำเร็จ!` : `New ${newPunchItemType} item added!`);
  };

  // Handle Add Punch List Item
  const handleAddPunchItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!punchDescription.trim()) {
      alert('Please describe the punch list item');
      return;
    }

    const finalType = punchType === 'Other' && punchCustomType.trim() ? punchCustomType.trim() : punchType;
    const newPunch: PunchItem = {
      id: `p-${Date.now()}`,
      type: finalType,
      category: punchCategory,
      description: punchDescription.trim(),
      photoRequired: punchPhotoRequired,
      status: 'Open',
      reportedBy: signerName.trim() || 'Field Inspector',
      timestamp: new Date().toISOString().replace('T', ' ').slice(0, 16)
    };

    setJobs(prev => prev.map(j => {
      if (j.id === currentJob.id) {
        return { ...j, punchList: [newPunch, ...j.punchList] };
      }
      return j;
    }));

    setPunchDescription('');
    setPunchCustomType('');
    alert('New punch list item logged!');
  };

  // Toggle Punch Status (Open <-> Resolved)
  const handleTogglePunchStatus = (punchId: string) => {
    setJobs(prev => prev.map(j => {
      if (j.id === currentJob.id) {
        return {
          ...j,
          punchList: j.punchList.map(p => {
            if (p.id === punchId) {
              return { ...p, status: p.status === 'Open' ? 'Resolved' : 'Open' };
            }
            return p;
          })
        };
      }
      return j;
    }));
  };


  // Delete Attachment
  const handleDeleteAttachment = (indexToDelete: number) => {
    setJobs(prev => prev.map(j => {
      if (j.id === currentJob.id) {
        return {
          ...j,
          attachments: j.attachments.filter((_, idx) => idx !== indexToDelete)
        };
      }
      return j;
    }));
  };

  // Turnover Handover Site Photo Capture Handler
  const handleSignPhotoCapture = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      setSignPhotoUrl(event.target?.result as string);
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleClosePhotoCapture = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => setClosePhotoUrl(event.target?.result as string);
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  // Executive Dashboard State & Filter Controls
  const [dashboardPlantFilter, setDashboardPlantFilter] = useState<'All' | 'Phra Khanong' | 'Sriracha'>('All');
  const [dashboardEventFilter, setDashboardEventFilter] = useState<string>('All');
  const [dashboardStatusFilter, setDashboardStatusFilter] = useState<'All' | 'Completed' | 'InProgress' | 'FullySigned' | 'PendingSign' | 'HasOpenPunches' | 'CriticalOnly' | 'HasCategoryA'>('All');
  const [dashboardSearch, setDashboardSearch] = useState<string>('');
  const [dashboardStageFilter, setDashboardStageFilter] = useState<number | null>(null);
  const [showExecutiveBriefingModal, setShowExecutiveBriefingModal] = useState<boolean>(false);
  const [isRefreshingDashboard, setIsRefreshingDashboard] = useState<boolean>(false);

  // Dashboard Aggregates across all jobs
  const totalJobsCount = jobs.length;
  const completedJobsCount = jobs.filter(isJobCompleted).length;
  const inProgressJobsCount = totalJobsCount - completedJobsCount;
  const readinessPercentage = Math.round((completedJobsCount / (totalJobsCount || 1)) * 100);

  const fullySignedJobsCount = jobs.filter(isJobSignaturesComplete).length;
  const pendingSignedJobsCount = totalJobsCount - fullySignedJobsCount;
  const signedPercentage = Math.round((fullySignedJobsCount / (totalJobsCount || 1)) * 100);

  const criticalJobs = jobs.filter(j => j.isCriticalPath);
  const criticalDoneCount = criticalJobs.filter(isJobCompleted).length;
  const criticalReadinessPercentage = Math.round((criticalDoneCount / (criticalJobs.length || 1)) * 100);

  const totalSignsAcrossJobs = jobs.reduce((acc, j) => acc + j.signatures.length, 0);
  const totalRequiredSigns = totalJobsCount * 2;
  const signCompliancePct = Math.round((totalSignsAcrossJobs / (totalRequiredSigns || 1)) * 100);
  const opsSignsCount = jobs.reduce((acc, j) => acc + (j.signatures.some(s => s.role === 'Operation') ? 1 : 0), 0);
  const ownerSignsCount = jobs.reduce((acc, j) => acc + (j.signatures.some(s => s.role === 'Job Owner') ? 1 : 0), 0);

  const totalPunchesAcrossJobs = jobs.flatMap(j => j.punchList);
  const countCategoryA = totalPunchesAcrossJobs.filter(p => (p.category === 'A' || p.punchCategory === 'A') && isPunchItemOpen(p)).length;
  const countCategoryB = totalPunchesAcrossJobs.filter(p => (p.category === 'B' || p.punchCategory === 'B') && isPunchItemOpen(p)).length;
  const countCategoryC = totalPunchesAcrossJobs.filter(p => (p.category === 'C' || p.punchCategory === 'C') && isPunchItemOpen(p)).length;
  const countResolvedPunches = totalPunchesAcrossJobs.filter(p => !isPunchItemOpen(p) && p.punchStatus !== 'Cancel').length;

  const phraKhanongCount = jobs.filter(j => j.plant === 'Phra Khanong').length;
  const srirachaCount = jobs.filter(j => j.plant === 'Sriracha').length;

  // EX02 Critical Path & Punch List State
  const [punchSeverityFilter, setPunchSeverityFilter] = useState<'All' | 'A' | 'B' | 'C' | 'Open' | 'Resolved'>('All');
  const [punchCriticalOnlyFilter, setPunchCriticalOnlyFilter] = useState<boolean>(false);
  const [punchPlantFilter, setPunchPlantFilter] = useState<'All' | 'Phra Khanong' | 'Sriracha'>('All');
  const [punchSearchQuery, setPunchSearchQuery] = useState<string>('');
  const [quickInspectPunchItem, setQuickInspectPunchItem] = useState<any | null>(null);
  const [showAddPunchModal, setShowAddPunchModal] = useState<boolean>(false);

  // New punch modal form state
  const [addPunchJobId, setAddPunchJobId] = useState<string>(jobs[0]?.id || 'job-101');
  const [addPunchType, setAddPunchType] = useState<string>('Flange Bolt Torquing');
  const [addPunchCategory, setAddPunchCategory] = useState<'A' | 'B' | 'C'>('A');
  const [addPunchDescription, setAddPunchDescription] = useState<string>('');
  const [addPunchPhotoRequired, setAddPunchPhotoRequired] = useState<boolean>(true);
  const [addPunchReportedBy, setAddPunchReportedBy] = useState<string>('QA Lead Inspector');

  // Toggle individual punch item status in real-time across any package
  const handleToggleJobPunchStatus = (jobId: string, punchId: string) => {
    setJobs(prevJobs => prevJobs.map(j => {
      if (j.id === jobId) {
        return {
          ...j,
          punchList: j.punchList.map(p => {
            if (p.id === punchId) {
              const newStatus: 'Open' | 'Resolved' = p.status === 'Open' ? 'Resolved' : 'Open';
              return { ...p, status: newStatus };
            }
            return p;
          })
        };
      }
      return j;
    }));
  };

  // Submit new punch from modal
  const handleCreatePunchItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!addPunchJobId || !addPunchDescription.trim()) return;
    const newPunch = {
      id: `p-${Date.now().toString().slice(-4)}`,
      type: addPunchType,
      category: addPunchCategory,
      description: addPunchDescription.trim(),
      photoRequired: addPunchPhotoRequired,
      status: 'Open' as const,
      reportedBy: addPunchReportedBy.trim() || 'QA Inspector',
      timestamp: new Date().toISOString().replace('T', ' ').slice(0, 16)
    };
    setJobs(prevJobs => prevJobs.map(j => {
      if (j.id === addPunchJobId) {
        return {
          ...j,
          punchList: [newPunch, ...j.punchList]
        };
      }
      return j;
    }));
    setShowAddPunchModal(false);
    setAddPunchDescription('');
  };

  // Master flattened punch list across all packages
  const allPunchItemsWithJob = useMemo(() => {
    return jobs.flatMap(j =>
      j.punchList.map(p => ({
        ...p,
        jobId: j.id,
        jobNo: j.jobNo,
        jobTitle: j.title,
        plant: j.plant,
        unit: j.unit,
        assetTag: j.assetTag,
        assetDescription: j.assetDescription,
        isCriticalPath: j.isCriticalPath,
        hierarchyPath: j.hierarchyPath,
        workOrder: j.workOrder,
        refCode: j.refCode,
        gridZone: j.gridZone
      }))
    );
  }, [jobs]);

  const filteredPunchItems = useMemo(() => {
    return allPunchItemsWithJob.filter(p => {
      if (punchPlantFilter !== 'All' && p.plant !== punchPlantFilter) return false;
      if (punchSeverityFilter === 'A' && p.category !== 'A') return false;
      if (punchSeverityFilter === 'B' && p.category !== 'B') return false;
      if (punchSeverityFilter === 'C' && p.category !== 'C') return false;
      if (punchSeverityFilter === 'Open' && p.status !== 'Open') return false;
      if (punchSeverityFilter === 'Resolved' && p.status !== 'Resolved') return false;
      if (punchCriticalOnlyFilter && !p.isCriticalPath) return false;
      if (punchSearchQuery.trim()) {
        const q = punchSearchQuery.toLowerCase();
        const mDesc = p.description.toLowerCase().includes(q);
        const mType = p.type.toLowerCase().includes(q);
        const mTag = (p.assetTag || '').toLowerCase().includes(q);
        const mJob = p.jobNo.toLowerCase().includes(q);
        const mBy = p.reportedBy.toLowerCase().includes(q);
        const mUnit = p.unit.toLowerCase().includes(q);
        const mWo = (p.workOrder || '').toLowerCase().includes(q);
        if (!mDesc && !mType && !mTag && !mJob && !mBy && !mUnit && !mWo) return false;
      }
      return true;
    });
  }, [allPunchItemsWithJob, punchPlantFilter, punchSeverityFilter, punchCriticalOnlyFilter, punchSearchQuery]);

  // Export punch items to CSV
  const handleExportPunchCsv = () => {
    const headers = ['Punch ID', 'Severity Category', 'Status', 'Asset Tag', 'Package Title', 'Job No', 'Unit', 'Plant', 'Defect Description', 'Evidence Required', 'Reported By', 'Reported At'];
    const rows = filteredPunchItems.map(p => [
      p.id,
      `Category ${p.category} (${p.category === 'A' ? 'Immediate Blocker' : p.category === 'B' ? 'Before Startup' : 'Minor'})`,
      p.status,
      `"${p.assetTag || ''}"`,
      `"${p.jobTitle.replace(/"/g, '""')}"`,
      p.jobNo,
      `"${p.unit}"`,
      p.plant,
      `"${p.description.replace(/"/g, '""')}"`,
      p.photoRequired ? 'Yes' : 'No',
      `"${p.reportedBy}"`,
      p.timestamp || ''
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Critical_Path_Punch_List_Report_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // EX02 Detailed Punch Metrics
  const openCatAPunches = useMemo(() => allPunchItemsWithJob.filter(p => (p.category === 'A' || p.punchCategory === 'A') && isPunchItemOpen(p)), [allPunchItemsWithJob]);
  const openCatBPunches = useMemo(() => allPunchItemsWithJob.filter(p => (p.category === 'B' || p.punchCategory === 'B') && isPunchItemOpen(p)), [allPunchItemsWithJob]);
  const openCatCPunches = useMemo(() => allPunchItemsWithJob.filter(p => (p.category === 'C' || p.punchCategory === 'C') && isPunchItemOpen(p)), [allPunchItemsWithJob]);
  const totalPunchesCount = allPunchItemsWithJob.length;
  const totalOpenPunches = openCatAPunches.length + openCatBPunches.length + openCatCPunches.length;
  const totalResolvedPunches = allPunchItemsWithJob.filter(p => !isPunchItemOpen(p) && p.punchStatus !== 'Cancel').length;
  const punchResolutionRate = Math.round((totalResolvedPunches / (totalPunchesCount || 1)) * 100);

  // Filtered jobs for the registry table
  const filteredDashboardJobs = useMemo(() => {
    return jobs.filter(job => {
      if (dashboardPlantFilter !== 'All' && job.plant !== dashboardPlantFilter) return false;
      if (dashboardEventFilter !== 'All' && job.eventName !== dashboardEventFilter) return false;

      const isDone = isJobCompleted(job);
      if (dashboardStatusFilter === 'Completed' && !isDone) return false;
      if (dashboardStatusFilter === 'InProgress' && isDone) return false;
      if (dashboardStatusFilter === 'FullySigned' && !isJobSignaturesComplete(job)) return false;
      if (dashboardStatusFilter === 'PendingSign' && isJobSignaturesComplete(job)) return false;
      if (dashboardStatusFilter === 'HasOpenPunches' && isJobPunchListComplete(job)) return false;
      if (dashboardStatusFilter === 'CriticalOnly' && !job.isCriticalPath) return false;
      if (dashboardStatusFilter === 'HasCategoryA') {
        const hasOpenCatA = job.punchList.some(p => p.category === 'A' && p.status === 'Open');
        if (!hasOpenCatA) return false;
      }

      if (dashboardStageFilter !== null) {
        if (dashboardStageFilter === 4 && !isDone) return false;
        if (dashboardStageFilter === 3 && (isDone || job.signatures.length === 0)) return false;
        if (dashboardStageFilter === 2 && (isDone || job.signatures.length > 0 || (job.punchList.length === 0 && job.attachments.length === 0))) return false;
        if (dashboardStageFilter === 1 && (job.signatures.length > 0 || job.punchList.length > 0)) return false;
      }

      if (dashboardSearch.trim()) {
        const q = dashboardSearch.toLowerCase();
        const mJobNo = (job.jobNo || '').toLowerCase().includes(q);
        const mTitle = (job.title || job.description || '').toLowerCase().includes(q);
        const mTag = (job.assetTag || '').toLowerCase().includes(q);
        const mUnit = (job.unit || '').toLowerCase().includes(q);
        const mRef = (job.refCode || '').toLowerCase().includes(q);
        if (!mJobNo && !mTitle && !mTag && !mUnit && !mRef) return false;
      }

      return true;
    });
  }, [jobs, dashboardPlantFilter, dashboardEventFilter, dashboardStatusFilter, dashboardStageFilter, dashboardSearch]);

  // Unit breakdown
  const unitBreakdown = useMemo(() => {
    const map = new Map<string, { total: number; done: number; critical: number; openPunches: number }>();
    jobs.forEach(j => {
      const uKey = (j.unit || '').split(' ')[0] || j.unit || 'General';
      const current = map.get(uKey) || { total: 0, done: 0, critical: 0, openPunches: 0 };
      current.total += 1;
      if (isJobCompleted(j)) current.done += 1;
      if (j.isCriticalPath) current.critical += 1;
      current.openPunches += (j.punchList || []).filter(p => p.status === 'Open').length;
      map.set(uKey, current);
    });
    return Array.from(map.entries()).map(([unitName, data]) => ({
      unitName,
      ...data,
      pct: Math.round((data.done / data.total) * 100)
    }));
  }, [jobs]);

  // Stage funnel statistics
  const stageStats = useMemo(() => {
    const s1 = jobs.length;
    const s2 = jobs.filter(j => j.attachments.length > 0 || j.punchList.length > 0 || j.signatures.length > 0).length;
    const s3 = jobs.filter(j => j.signatures.length > 0).length;
    const s4 = jobs.filter(isJobCompleted).length;
    return { s1, s2, s3, s4 };
  }, [jobs]);

  // Critical path attention item
  const attentionJob = useMemo(() => {
    return jobs.find(j => j.isCriticalPath && (j.punchList.some(p => p.category === 'A' && p.status === 'Open') || !isJobCompleted(j)));
  }, [jobs]);

  // Real CSV Export
  const handleExportCsv = () => {
    const headers = [
      'Job No',
      'Package Title',
      'Event Name',
      'Plant',
      'Unit',
      'Asset Tag',
      'Ref Code',
      'Critical Path',
      'Signatures Completed',
      'Open Punch A',
      'Open Punch B',
      'Open Punch C',
      'Overall Status',
      'Created Date'
    ];
    const rows = filteredDashboardJobs.map(j => {
      const isDone = isJobCompleted(j);
      const openA = j.punchList.filter(p => p.status === 'Open' && p.category === 'A').length;
      const openB = j.punchList.filter(p => p.status === 'Open' && p.category === 'B').length;
      const openC = j.punchList.filter(p => p.status === 'Open' && p.category === 'C').length;
      return [
        `"${j.jobNo || ''}"`,
        `"${(j.title || j.description || j.jobNo || '').replace(/"/g, '""')}"`,
        `"${j.eventName || ''}"`,
        `"${j.plant}"`,
        `"${j.unit}"`,
        `"${j.assetTag || ''}"`,
        `"${j.refCode || ''}"`,
        j.isCriticalPath ? 'YES' : 'NO',
        `"${j.signatures.length}/5"`,
        openA,
        openB,
        openC,
        isDone ? 'COMPLETED' : 'IN PROGRESS',
        `"${j.createdAt}"`
      ].join(',');
    });

    const csvData = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(','), ...rows].join('\r\n');
    const link = document.createElement('a');
    link.setAttribute('href', encodeURI(csvData));
    link.setAttribute('download', `Turnover_Executive_Dashboard_Report_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleRefreshDashboard = () => {
    setIsRefreshingDashboard(true);
    setTimeout(() => {
      setIsRefreshingDashboard(false);
    }, 600);
  };

  return (
    <div
      className="w-full max-w-7xl mx-auto space-y-6 pb-20"
      onClick={(e) => {
        const t = e.target as HTMLElement;
        if (t.tagName === 'IMG' && (t as HTMLImageElement).dataset.zoom) {
          e.preventDefault();
          setZoomImageUrl((t as HTMLImageElement).src);
        }
      }}
    >
      {/* Image lightbox: click any attached photo / signature to enlarge */}
      {zoomImageUrl && (
        <div
          className="fixed inset-0 z-[100] bg-black/85 backdrop-blur-sm flex items-center justify-center p-4 cursor-zoom-out animate-in fade-in duration-150"
          onClick={(e) => { e.stopPropagation(); setZoomImageUrl(null); }}
        >
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); setZoomImageUrl(null); }}
            className="absolute top-4 right-4 p-2 rounded-full bg-white/15 hover:bg-white/30 text-white cursor-pointer"
            aria-label="Close"
          >
            <X size={20} />
          </button>
          <img
            src={zoomImageUrl}
            alt="Enlarged"
            onClick={(e) => e.stopPropagation()}
            className="max-w-full max-h-full object-contain rounded-xl bg-white shadow-2xl cursor-default"
          />
        </div>
      )}

      {/* =========================================================================
          VIEW 1: CREATE EVENT & JOB VIEW (STEPS 1 & 2) OR BULK INSERT
         ========================================================================= */}
      {activeMainView === 'create' && (
        <div className="space-y-6 animate-in fade-in duration-200">

          {!isCreateFormOpen ? (
            /* ===============================================================
               1A: EVENT & JOB HUB (LANDING OVERVIEW WITH ACTION BUTTON)
               =============================================================== */
            <div className="space-y-6">
              {/* Hero Action Banner */}
              <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-5 sm:p-6 flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="space-y-1.5 max-w-2xl">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 font-mono">
                      {isTh ? 'ศูนย์บริหารจัดการ Event & Job' : 'Event & Job Package Hub'}
                    </span>
                    <span className="text-xs text-slate-400">
                      {isTh ? '· โรงกลั่นน้ำมันบางจาก พระโขนง & ศรีราชา' : '· Bangchak Refineries (PK & SR)'}
                    </span>
                  </div>
                  <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-slate-100 tracking-tight flex items-center gap-2">
                    <Building className="text-emerald-600 dark:text-emerald-400" size={24} />
                    <span>{isTh ? 'ระบบสร้างและจัดการอีเวนต์ & แพ็กเกจงาน' : 'Create Plant Event & Job Packages'}</span>
                  </h2>
                  <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                    {isTh
                      ? 'เริ่มต้นสร้างงานซ่อมบำรุงโรงกลั่น เชื่อมโยงผังโครงสร้างสินทรัพย์ ออก QR Code หน้างานสำหรับเดินตรวจส่งมอบระบบ และติดตามสถานะความพร้อม'
                      : 'Initialize turnaround job packages, link Functional Locations, generate on-site QR codes, and manage inspection readiness.'}
                  </p>
                </div>

                <div className="flex items-center gap-3 shrink-0 flex-wrap">
                  <button
                    type="button"
                    onClick={() => {
                      resetCreateForm();
                      setCreatePackageMode('single');
                      setIsCreateFormOpen(true);
                    }}
                    className="h-12 px-6 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-bold text-sm shadow-lg shadow-emerald-600/25 flex items-center gap-2.5 transition-all cursor-pointer"
                  >
                    <Plus size={18} className="stroke-[3]" />
                    <span>{isTh ? 'สร้าง Event & Job ใหม่' : 'Create Event & Job'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setCreatePackageMode('bulk');
                      setIsCreateFormOpen(true);
                    }}
                    className="h-12 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-750 text-slate-800 dark:text-slate-100 border border-slate-300 dark:border-slate-700 font-bold text-xs flex items-center gap-2 transition-all cursor-pointer shadow-xs hover:border-slate-400"
                  >
                    <Layers size={16} className="text-emerald-600 dark:text-emerald-400" />
                    <span>{isTh ? 'นำเข้าข้อมูลแบบกลุ่ม (50+)' : 'Bulk Ingestion (50+)'}</span>
                  </button>
                </div>
              </div>
            </div>
          ) : (
            /* ===============================================================
               1B: FIELD-OPTIMIZED CREATION FORM (DEDICATED FORM PAGE)
               =============================================================== */
            <div className="space-y-6">
              {/* Back Bar & Form Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      if (onNavigateToWorkspace) {
                        onNavigateToWorkspace();
                      } else {
                        setActiveMainView('workspace');
                      }
                    }}
                    className="p-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-200 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer shrink-0"
                    title={isTh ? 'ย้อนกลับไปหน้ารวมงาน' : 'Back to Job List'}
                  >
                    <ArrowLeft size={16} />
                    <span className="hidden sm:inline">{isTh ? 'ย้อนกลับ' : 'Back'}</span>
                  </button>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 font-mono">
                        {isTh ? 'โหมดสร้างงานหน้างาน' : 'Field Entry Mode'}
                      </span>
                      <span className="text-slate-400 text-xs">
                        {isTh ? '· กำหนดหมุดหมายโรงกลั่นและตำแหน่งหน้างาน' : '· Plant Milestone & Location Binding'}
                      </span>
                    </div>
                    <h2 className="text-lg sm:text-xl font-black text-slate-900 dark:text-slate-100 tracking-tight mt-0.5">
                      {isTh ? 'แบบฟอร์มสร้าง Event & Job หน้างาน' : 'On-Site Job Creation Form'}
                    </h2>
                  </div>
                </div>

                {/* Segmented Mode Selector Button Group */}
                <div className="inline-flex rounded-xl bg-slate-100 dark:bg-slate-800 p-1 border border-slate-200 dark:border-slate-700 shrink-0 self-start sm:self-auto">
                  <button
                    type="button"
                    onClick={() => setCreatePackageMode('single')}
                    className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${createPackageMode === 'single'
                      ? 'bg-white dark:bg-slate-700 text-emerald-600 dark:text-emerald-300 shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                      }`}
                  >
                    <FileText size={14} />
                    <span>{isTh ? 'แบบฟอร์มเดี่ยว' : 'Single Job Form'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setCreatePackageMode('bulk')}
                    className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${createPackageMode === 'bulk'
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                      }`}
                  >
                    <Layers size={14} />
                    <span>{isTh ? 'นำเข้าแบบกลุ่ม' : 'Bulk Ingestion'}</span>
                    <span className="bg-emerald-500/30 text-[9px] px-1.5 py-0.5 rounded font-mono font-bold">50+</span>
                  </button>
                </div>
              </div>

              {createPackageMode === 'bulk' ? (
                <BulkTurnoverJobIngestion
                  onClose={() => setCreatePackageMode('single')}
                  onSwitchToSingle={() => setCreatePackageMode('single')}
                  onBatchCreateTurnoverJobs={(newTurnoverJobs) => {
                    handleBatchCreateJobs(newTurnoverJobs);
                    setActiveMainView('workspace');
                    setWorkspaceTab('turnover');
                  }}
                  onSuccess={(count) => {
                    setActiveMainView('workspace');
                    setWorkspaceTab('turnover');
                  }}
                />
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-in fade-in duration-200">

                  {/* Left 2 Cols: Form Container */}
                  <div className="lg:col-span-2 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-6 space-y-6">
                    <div className="border-b border-slate-100 dark:border-slate-800 pb-4">
                      <div className="flex items-center justify-between gap-3 flex-wrap">
                        <div>
                          <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                            <Building className="text-emerald-600 dark:text-emerald-400" size={20} />
                            <span>{isTh ? 'สร้าง Job & กำหนดจุด Turnover (Create Job Package)' : 'Create Job & Turnover Location Package'}</span>
                          </h2>
                          <p className="text-xs text-slate-500 mt-1">
                            {isTh
                              ? 'กรอกข้อมูลฟอร์ม 12 รายการ กำหนดพิกัดผังโรงกลั่น และสร้างรหัส QR Code ประจำจุดปฏิบัติการ'
                              : 'Fill in the 12 job specifications, pin plot plan location, and generate on-site QR Code.'}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={`text-[11px] font-semibold px-2.5 py-1 rounded-full border flex items-center gap-1.5 ${
                            isFormValid
                              ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800'
                              : 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border-amber-300 dark:border-amber-800'
                          }`}>
                            {isFormValid ? (
                              <>
                                <CheckCircle2 size={13} className="text-emerald-600" />
                                <span>{isTh ? 'กรอกข้อมูลครบถ้วน' : 'All Required Filled'}</span>
                              </>
                            ) : (
                              <>
                                <span className="text-rose-500 font-bold">*</span>
                                <span>{isTh ? `ขาด ${missingFieldLabels.length} ช่องจำเป็น` : `${missingFieldLabels.length} Required Missing`}</span>
                              </>
                            )}
                          </span>
                        </div>
                      </div>
                    </div>

                    <form onSubmit={handleCreateJob} className="space-y-6">

                      {/* GENERAL JOB SPECIFICATIONS */}
                      <div className="p-4 sm:p-5 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-700/80 space-y-4">
                        {/* Row: Job ID & Plant Selection */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {/* Job ID */}
                          <div className="space-y-1.5">
                            <div className="flex items-center justify-between">
                              <label className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                                <Hash size={14} className={isJobIdDuplicate ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'} />
                                <span>Job ID <span className="text-rose-500 font-bold">*</span></span>
                              </label>
                              {isJobIdDuplicate && (
                                <span className="text-[10px] font-bold text-rose-600 dark:text-rose-400 flex items-center gap-1 animate-pulse">
                                  <AlertTriangle size={12} />
                                  <span>{isTh ? 'รหัสซ้ำในระบบ' : 'Duplicate ID'}</span>
                                </span>
                              )}
                            </div>
                            <input
                              type="text"
                              required
                              value={formJobId}
                              onChange={e => setFormJobId(e.target.value)}
                              placeholder="e.g. TO-PK-2026-001 or JOB-2026-101"
                              className={`w-full px-3.5 py-2.5 rounded-xl border text-xs font-mono font-bold outline-none transition-all ${
                                isJobIdDuplicate
                                  ? 'border-rose-500 bg-rose-50/40 dark:bg-rose-950/30 text-rose-900 dark:text-rose-100 ring-2 ring-rose-500/20'
                                  : 'border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600'
                              }`}
                            />
                            {isJobIdDuplicate ? (
                              <div className="flex items-center gap-1.5 p-2 rounded-xl bg-rose-50 dark:bg-rose-950/60 border border-rose-300 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-[11px] font-semibold animate-in fade-in">
                                <AlertTriangle size={14} className="shrink-0 text-rose-600 dark:text-rose-400" />
                                <span>
                                  {isTh
                                    ? `รหัส Job ID "${formJobId.trim()}" นี้มีอยู่ในระบบแล้ว (ห้ามสร้างซ้ำ กรุณาระบุรหัสอื่น)`
                                    : `Job ID "${formJobId.trim()}" already exists in the system (Duplicate ID is not allowed).`}
                                </span>
                              </div>
                            ) : (
                              <p className="text-[10px] text-slate-400">
                                {isTh ? 'หมายเลขงานอ้างอิงสำหรับติดตามสถานะและสร้าง QR Code' : 'Unique tracking ID for this job package and QR reference.'}
                              </p>
                            )}
                          </div>

                          {/* เลือก Plant */}
                          <div className="space-y-1.5">
                            <label className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                              <Building2 size={14} className="text-teal-600 dark:text-teal-400" />
                              <span>{isTh ? 'เลือก Plant' : 'Plant Selection'} <span className="text-rose-500 font-bold">*</span></span>
                            </label>
                            <div className="grid grid-cols-2 gap-2">
                              <button
                                type="button"
                                onClick={() => setSelectedPlant('Phra Khanong')}
                                className={`p-2.5 rounded-xl border-2 flex items-center justify-between transition-all cursor-pointer text-left ${
                                  selectedPlant === 'Phra Khanong'
                                    ? 'bg-teal-50 dark:bg-teal-950/40 border-teal-500 shadow-sm ring-2 ring-teal-500/20'
                                    : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 hover:border-slate-300'
                                }`}
                              >
                                <div className="flex items-center gap-2">
                                  <span className={`w-7 h-7 rounded-lg text-xs font-bold flex items-center justify-center shrink-0 ${
                                    selectedPlant === 'Phra Khanong' ? 'bg-teal-600 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                                  }`}>PK</span>
                                  <div className="min-w-0">
                                    <div className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate">Phra Khanong</div>
                                    <div className="text-[10px] text-slate-400 truncate">{isTh ? 'พระโขนง (กรุงเทพฯ)' : 'Bangkok'}</div>
                                  </div>
                                </div>
                                {selectedPlant === 'Phra Khanong' && <CheckCircle2 size={16} className="text-teal-600 dark:text-teal-400 shrink-0" />}
                              </button>

                              <button
                                type="button"
                                onClick={() => setSelectedPlant('Sriracha')}
                                className={`p-2.5 rounded-xl border-2 flex items-center justify-between transition-all cursor-pointer text-left ${
                                  selectedPlant === 'Sriracha'
                                    ? 'bg-teal-50 dark:bg-teal-950/40 border-teal-500 shadow-sm ring-2 ring-teal-500/20'
                                    : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 hover:border-slate-300'
                                }`}
                              >
                                <div className="flex items-center gap-2">
                                  <span className={`w-7 h-7 rounded-lg text-xs font-bold flex items-center justify-center shrink-0 ${
                                    selectedPlant === 'Sriracha' ? 'bg-teal-600 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                                  }`}>SR</span>
                                  <div className="min-w-0">
                                    <div className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate">Sriracha</div>
                                    <div className="text-[10px] text-slate-400 truncate">{isTh ? 'ศรีราชา (ชลบุรี)' : 'Chonburi'}</div>
                                  </div>
                                </div>
                                {selectedPlant === 'Sriracha' && <CheckCircle2 size={16} className="text-teal-600 dark:text-teal-400 shrink-0" />}
                              </button>
                            </div>
                          </div>
                        </div>

                        {/* Row: Location: Area/ Unit & Turnover System */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {/* Location: Area/ Unit */}
                          <div className="space-y-1.5">
                            <label className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                              <MapPin size={14} className="text-emerald-600 dark:text-emerald-400" />
                              <span>Location: Area/ Unit <span className="text-rose-500 font-bold">*</span></span>
                            </label>
                            <select
                              required
                              value={formAreaUnit}
                              onChange={e => setFormAreaUnit(e.target.value)}
                              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-semibold text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 outline-none cursor-pointer"
                            >
                              <option value="">-- {isTh ? 'เลือก Location: Area/ Unit' : 'Select Location: Area/ Unit'} --</option>
                              {AREA_UNIT_OPTIONS.map(opt => (
                                <option key={opt} value={opt}>{opt}</option>
                              ))}
                            </select>
                          </div>

                          {/* Turnover System */}
                          <div className="space-y-1.5">
                            <label className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                              <Workflow size={14} className="text-blue-600 dark:text-blue-400" />
                              <span>Turnover System <span className="text-rose-500 font-bold">*</span></span>
                            </label>
                            <input
                              type="text"
                              required
                              value={formTurnoverSystem}
                              onChange={e => setFormTurnoverSystem(e.target.value)}
                              placeholder="e.g. SYS-13 Crude Overhead & Reflux, SYS-02 Steam Distribution"
                              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 outline-none font-medium"
                            />
                          </div>
                        </div>

                        {/* Job description */}
                        <div className="space-y-1.5">
                          <label className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                            <FileText size={14} className="text-emerald-600 dark:text-emerald-400" />
                            <span>Job description <span className="text-rose-500 font-bold">*</span></span>
                          </label>
                          <textarea
                            rows={3}
                            required
                            value={formJobDescription}
                            onChange={e => setFormJobDescription(e.target.value)}
                            placeholder="ระบุรายละเอียดของงาน ขอบเขตการทำงาน ขั้นตอนซ่อมบำรุง จุดสกัดกั้น หรือข้อกำหนดสำหรับการส่งมอบงาน..."
                            className="w-full p-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 outline-none resize-y"
                          />
                        </div>
                      </div>

                      {/* SCHEDULE & DISCIPLINE / LEADERSHIP */}
                      <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {/* Target Start Date */}
                          <div className="space-y-1.5">
                            <label className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                              <Calendar size={14} className="text-blue-600 dark:text-blue-400" />
                              <span>Target Start Date <span className="text-rose-500 font-bold">*</span></span>
                            </label>
                            <input
                              type="date"
                              required
                              value={formTargetStartDate}
                              onChange={e => setFormTargetStartDate(e.target.value)}
                              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/60 text-xs font-medium text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 outline-none cursor-pointer"
                            />
                          </div>

                          {/* Planned Turnover Date */}
                          <div className="space-y-1.5">
                            <label className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                              <Clock size={14} className="text-amber-600 dark:text-amber-400" />
                              <span>Planned Turnover Date <span className="text-rose-500 font-bold">*</span></span>
                            </label>
                            <input
                              type="date"
                              required
                              value={formPlannedTurnoverDate}
                              onChange={e => setFormPlannedTurnoverDate(e.target.value)}
                              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/60 text-xs font-medium text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-amber-500/20 focus:border-amber-600 outline-none cursor-pointer"
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {/* Discipline */}
                          <div className="space-y-1.5">
                            <label className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                              <Layers size={14} className="text-purple-600 dark:text-purple-400" />
                              <span>Discipline <span className="text-rose-500 font-bold">*</span></span>
                            </label>
                            <select
                              required
                              value={formDiscipline}
                              onChange={e => setFormDiscipline(e.target.value)}
                              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-medium text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-purple-500/20 focus:border-purple-600 outline-none cursor-pointer"
                            >
                              <option value="">-- {isTh ? 'เลือก Discipline' : 'Select Discipline'} --</option>
                              {DISCIPLINE_OPTIONS.map(d => (
                                <option key={d} value={d}>{d}</option>
                              ))}
                            </select>
                          </div>

                          {/* Job Supervisor >> Job lead */}
                          <div className="space-y-1.5">
                            <label className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                              <UserCheck size={14} className="text-emerald-600 dark:text-emerald-400" />
                              <span>Job Supervisor &gt;&gt; Job lead <span className="text-rose-500 font-bold">*</span></span>
                            </label>
                            <select
                              required
                              value={formJobLead}
                              onChange={e => setFormJobLead(e.target.value)}
                              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-medium text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 outline-none cursor-pointer"
                            >
                              <option value="">-- {isTh ? 'เลือก Job Supervisor / Job Lead' : 'Select Job Lead'} --</option>
                              {JOB_LEAD_OPTIONS.map(lead => (
                                <option key={lead} value={lead}>{lead}</option>
                              ))}
                            </select>
                          </div>
                        </div>
                      </div>

                      {/* EQUIPMENT DETAILS */}
                      <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {/* Equipment tag */}
                          <div className="space-y-1.5">
                            <label className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                              <Tag size={14} className="text-amber-600 dark:text-amber-400" />
                              <span>Equipment tag <span className="text-rose-500 font-bold">*</span></span>
                            </label>
                            <input
                              type="text"
                              required
                              value={formEquipmentTag}
                              onChange={e => setFormEquipmentTag(e.target.value)}
                              placeholder="e.g. S2-DR-001D-180, 11-C-101, P-102A"
                              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-mono font-bold text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-amber-500/20 focus:border-amber-600 outline-none"
                            />
                          </div>

                          {/* Equipment Type (Optional) */}
                          <div className="space-y-1.5">
                            <div className="flex items-center justify-between">
                              <label className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                                <SlidersHorizontal size={14} className="text-slate-400" />
                                <span>Equipment Type</span>
                              </label>
                              <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 font-medium border border-slate-200 dark:border-slate-700">
                                {isTh ? 'ไม่บังคับ (Optional)' : 'Optional'}
                              </span>
                            </div>
                            <select
                              value={formEquipmentType}
                              onChange={e => setFormEquipmentType(e.target.value)}
                              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-700 dark:text-slate-300 focus:ring-2 focus:ring-slate-400/20 focus:border-slate-500 outline-none cursor-pointer"
                            >
                              <option value="">-- {isTh ? 'เลือกประเภทอุปกรณ์ (ไม่บังคับ)' : 'Select Equipment Type (Optional)'} --</option>
                              {EQUIPMENT_TYPE_OPTIONS.map(eq => (
                                <option key={eq} value={eq}>{eq}</option>
                              ))}
                            </select>
                          </div>
                        </div>
                      </div>

                      {/* JOB LOCATION & AREA MARKING */}
                      <div className="p-4 sm:p-5 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-700/80 space-y-4">
                        <div className="flex items-center justify-between pb-1 border-b border-slate-200/60 dark:border-slate-700/60">
                          <div className="flex items-center gap-2">
                            <MapPin size={16} className="text-emerald-600 dark:text-emerald-400" />
                            <h3 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
                              <span>{isTh ? 'ตำแหน่งหน้างานและผังระวางพื้นที่' : 'Job Location & Area Marking'}</span>
                              <span className="ml-2 text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 normal-case px-2 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950/60">
                                {isTh ? 'ผังระวาง Scaffolding CAD' : 'Scaffolding Plot Plan Background'}
                              </span>
                            </h3>
                          </div>
                          <button
                            type="button"
                            onClick={() => setShowPlotPlanPinning(!showPlotPlanPinning)}
                            className="text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1 cursor-pointer"
                          >
                            <span>{showPlotPlanPinning ? (isTh ? 'ซ่อนผังพิกัด' : 'Hide Plot Map') : (isTh ? '+ เปิดผังมาร์คพิกัด' : '+ Open Plot Map')}</span>
                            {showPlotPlanPinning ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                          </button>
                        </div>

                        {showPlotPlanPinning && (
                          <PlotPlanPinningSection
                            markingType={markingType}
                            onMarkingTypeChange={setMarkingType}
                            pin={jobPin}
                            onPinChange={setJobPin}
                            scaleBlock={scaleBlock}
                            onScaleBlockChange={setScaleBlock}
                            isTh={isTh}
                            equipmentId={formEquipmentTag || formJobId || 'Refinery Unit'}
                            isScaffolding={true}
                            craneCapacity={50}
                          />
                        )}
                      </div>

                      {/* BOTTOM ACTION BAR */}
                      <div className="flex items-center justify-between gap-3 pt-3 border-t border-slate-100 dark:border-slate-800 flex-wrap">
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={handleFillSampleData}
                            className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer border border-slate-200 dark:border-slate-700 flex items-center gap-1.5"
                          >
                            <Sparkles size={13} className="text-emerald-500" />
                            <span>{isTh ? 'เติมตัวอย่างข้อมูล (Sample)' : 'Fill Sample'}</span>
                          </button>

                          <button
                            type="button"
                            onClick={resetCreateForm}
                            className="px-4 py-2 rounded-xl text-xs font-bold text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer flex items-center gap-1"
                          >
                            <RefreshCw size={13} />
                            <span>{isTh ? 'ล้างข้อมูล' : 'Reset'}</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              if (onNavigateToWorkspace) {
                                onNavigateToWorkspace();
                              } else {
                                setActiveMainView('workspace');
                              }
                            }}
                            className="px-4 py-2 rounded-xl text-xs font-bold text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
                          >
                            {isTh ? 'ยกเลิก' : 'Cancel'}
                          </button>
                        </div>

                        <div className="flex items-center gap-3">
                          {!isFormValid && (
                            <span className="text-[11px] text-amber-600 dark:text-amber-400 font-medium">
                              {isTh 
                                ? `ยังกรอกไม่ครบ (${missingFieldLabels.length} ช่องจำเป็น)` 
                                : `Missing ${missingFieldLabels.length} required fields`}
                            </span>
                          )}
                          <button
                            type="submit"
                            disabled={!isFormValid}
                            className={`px-6 py-2.5 rounded-xl text-xs font-bold transition-all shadow-md flex items-center gap-2 ${
                              isFormValid
                                ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-500/20 cursor-pointer active:scale-95'
                                : 'bg-slate-200 dark:bg-slate-800 text-slate-400 dark:text-slate-500 cursor-not-allowed border border-slate-300 dark:border-slate-700'
                            }`}
                            title={!isFormValid ? `กรุณากรอก: ${missingFieldLabels.join(', ')}` : 'คลิกเพื่อสร้าง Job และ Gen QR Code'}
                          >
                            <QrCode size={16} />
                            <span>{isTh ? 'บันทึกและสร้าง QR Code หน้างาน' : 'Create Job & Generate QR'}</span>
                          </button>
                        </div>
                      </div>
                    </form>
                  </div>

                  {/* Right Col: Simulated QR Code & Direct URL Link Output */}
                  <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-6 flex flex-col items-center justify-center text-center space-y-4">
                    <div className="w-12 h-12 rounded-2xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shadow-xs">
                      <QrCode size={26} />
                    </div>

                    <div>
                      <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                        {isTh ? 'QR Code ประจำงานหน้างาน' : 'Job Location QR Code'}
                      </h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-xs">
                        {isTh
                          ? 'ทีมช่างหรือวิศวกรสามารถสแกน QR Code นี้จากหน้างานเพื่อเข้าสู่หน้า Turnover checklist & Punch List ได้ทันที'
                          : 'Field technicians can scan this on-site to directly access the Turnover checklist & Punch List pad.'}
                      </p>
                    </div>

                    {createdJobLinkInfo ? (
                      <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700 w-full space-y-4 animate-in zoom-in-95 duration-200">
                        <div className="flex justify-center p-3 bg-white dark:bg-white rounded-xl shadow-xs border border-slate-200 max-w-[180px] mx-auto">
                          <QRCodeSVG id="job-qr-code-svg" value={createdJobLinkInfo.url} size={150} />
                        </div>

                        <div className="space-y-1">
                          <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                            {isTh ? 'หมายเลขอ้างอิงงาน' : 'Generated Job Reference'}
                          </span>
                          <div className="font-mono text-sm font-bold text-emerald-600 dark:text-emerald-400">
                            {createdJobLinkInfo.jobNo}
                          </div>
                        </div>

                        <div className="p-2.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-[11px] font-mono text-slate-600 dark:text-slate-300 break-all select-all flex items-center justify-between gap-2">
                          <LinkIcon size={14} className="shrink-0 text-slate-400" />
                          <span className="truncate">{createdJobLinkInfo.url}</span>
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={handleDownloadQR}
                            className="flex-1 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                          >
                            <Download size={14} />
                            <span>{isTh ? 'บันทึกรูป QR' : 'Download'}</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              setSelectedJobId(createdJobLinkInfo.id);
                              setActiveMainView('workspace');
                              setWorkspaceTab('turnover');
                            }}
                            className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 shadow-xs transition-colors cursor-pointer"
                          >
                            <span>{isTh ? 'เปิดหน้างาน' : 'Open Job'}</span>
                            <ArrowRight size={14} />
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="p-6 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-dashed border-slate-300 dark:border-slate-700 w-full text-xs text-slate-400 flex flex-col items-center justify-center space-y-2">
                        <div className="w-24 h-24 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 flex items-center justify-center text-slate-300">
                          <QrCode size={48} className="opacity-40" />
                        </div>
                        <span>{isTh ? 'กรอกแบบฟอร์มแล้วกด "บันทึก" เพื่อสร้าง QR Code และลิงก์สำหรับหน้างาน' : 'Fill the form and click "Create Job" to generate the QR Code and direct link.'}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* =========================================================================
          VIEW 2 & 3: JOB WORKSPACE & TURNOVER (STEPS 3, 4, 5, 6, 7)
         ========================================================================= */}
      {activeMainView === 'workspace' && (
        <div className="space-y-6 animate-in fade-in duration-200">

          {/* Header Card: Job ID & Live Status Badge with Completion Checklist */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-5 sm:p-6 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1.5">
                <div className="flex items-center gap-2.5 flex-wrap">
                  <span className="font-mono text-xs font-black px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700">
                    {currentJob.jobNo}
                  </span>

                  {/* Prominent Overall Status Badge (Step 8 Logic) */}
                  <span className={`inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full text-xs font-extrabold uppercase tracking-wider shadow-2xs ${currentJobStatus === 'Completed'
                    ? 'bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-200 border border-emerald-300 dark:border-emerald-800 ring-2 ring-emerald-500/20'
                    : 'bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-200 border border-amber-300 dark:border-amber-800 ring-2 ring-amber-500/20'
                    }`}>
                    {currentJobStatus === 'Completed' ? <CheckCircle2 size={15} /> : <Clock size={15} className="animate-spin" />}
                    <span>{isTh ? `สถานะ: ${currentJobStatus === 'Completed' ? 'เสร็จสมบูรณ์' : 'กำลังดำเนินการ'}` : `Status: ${currentJobStatus}`}</span>
                  </span>

                  <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                    {isTh ? 'โรงงาน:' : 'Plant:'} <strong className="text-slate-800 dark:text-slate-200">{currentJob.plant === 'Phra Khanong' ? (isTh ? 'บางจาก พระโขนง' : 'Phra Khanong') : (isTh ? 'บางจาก ศรีราชา' : 'Sriracha')}</strong>
                  </span>
                  <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                    {isTh ? 'หน่วยผลิต:' : 'Unit:'} <strong className="text-slate-800 dark:text-slate-200">{(currentJob.unit || '').split(' ')[0] || '-'}</strong>
                  </span>
                </div>

                <h2 className="text-lg sm:text-xl font-black text-slate-900 dark:text-slate-100 tracking-tight">
                  {currentJob.title}
                </h2>
              </div>
            </div>

            {/* Live Criteria Checklist Banner (Step 8 Rule) */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1 text-xs">
              <div className={`p-2.5 rounded-xl border flex items-center gap-2 ${currentJob.signatures.some(s => s.role.toLowerCase().includes('operation') && s.decision === 'Accept')
                ? 'border-emerald-200 dark:border-emerald-900/60 bg-emerald-50/50 dark:bg-emerald-950/20 text-emerald-800 dark:text-emerald-300'
                : 'border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 text-slate-500'
                }`}>
                {currentJob.signatures.some(s => s.role.toLowerCase().includes('operation') && s.decision === 'Accept') ? (
                  <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
                ) : (
                  <Clock size={16} className="text-amber-500 shrink-0" />
                )}
                <span>
                  {isTh
                    ? `1. ฝ่ายปฏิบัติการ: ${currentJob.signatures.some(s => s.role.toLowerCase().includes('operation') && s.decision === 'Accept') ? 'อนุมัติแล้ว' : 'รอดำเนินการ'}`
                    : `1. Operation Sign: ${currentJob.signatures.some(s => s.role.toLowerCase().includes('operation') && s.decision === 'Accept') ? 'Accepted' : 'Pending'}`}
                </span>
              </div>

              <div className={`p-2.5 rounded-xl border flex items-center gap-2 ${currentJob.signatures.some(s => s.role.toLowerCase().includes('owner') && s.decision === 'Accept')
                ? 'border-emerald-200 dark:border-emerald-900/60 bg-emerald-50/50 dark:bg-emerald-950/20 text-emerald-800 dark:text-emerald-300'
                : 'border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 text-slate-500'
                }`}>
                {currentJob.signatures.some(s => s.role.toLowerCase().includes('owner') && s.decision === 'Accept') ? (
                  <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
                ) : (
                  <Clock size={16} className="text-amber-500 shrink-0" />
                )}
                <span>
                  {isTh
                    ? `2. เจ้าของงาน: ${currentJob.signatures.some(s => s.role.toLowerCase().includes('owner') && s.decision === 'Accept') ? 'อนุมัติแล้ว' : 'รอดำเนินการ'}`
                    : `2. Job Owner Sign: ${currentJob.signatures.some(s => s.role.toLowerCase().includes('owner') && s.decision === 'Accept') ? 'Accepted' : 'Pending'}`}
                </span>
              </div>

              <div className={`p-2.5 rounded-xl border flex items-center gap-2 ${currentJob.punchList.length === 0 || currentJob.punchList.every(p => p.status === 'Resolved')
                ? 'border-emerald-200 dark:border-emerald-900/60 bg-emerald-50/50 dark:bg-emerald-950/20 text-emerald-800 dark:text-emerald-300'
                : 'border-rose-200 dark:border-rose-900/60 bg-rose-50/50 dark:bg-rose-950/20 text-rose-800 dark:text-rose-300'
                }`}>
                {currentJob.punchList.length === 0 || currentJob.punchList.every(p => p.status === 'Resolved') ? (
                  <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
                ) : (
                  <AlertTriangle size={16} className="text-rose-600 shrink-0" />
                )}
                <span>
                  {isTh
                    ? `3. ข้อบกพร่อง: ${currentJob.punchList.filter(p => p.status === 'Open').length === 0 ? 'ปิดหมด (ผ่านเกณฑ์)' : `ค้าง ${currentJob.punchList.filter(p => p.status === 'Open').length} รายการ`}`
                    : `3. Punch List: ${currentJob.punchList.filter(p => p.status === 'Open').length === 0 ? 'All 0 Open (Clean)' : `${currentJob.punchList.filter(p => p.status === 'Open').length} Open Blocker`}`}
                </span>
              </div>
            </div>
          </div>


          {/* ================= STEP 3: 2 MAIN LARGE BUTTONS (TABLET & MOBILE OPTIMIZED) ================= */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-1">
            <button
              type="button"
              onClick={() => setWorkspaceTab('detail')}
              className={`p-4 sm:p-5 rounded-2xl border-2 transition-all cursor-pointer flex items-center justify-between text-left min-h-[58px] ${workspaceTab === 'detail'
                ? 'border-blue-600 bg-blue-50/80 dark:bg-blue-950/40 text-blue-950 dark:text-blue-100 shadow-md ring-4 ring-blue-500/15'
                : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:border-slate-300 hover:bg-slate-50'
                }`}
            >
              <div className="flex items-center gap-3.5">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${workspaceTab === 'detail' ? 'bg-blue-600 text-white shadow-md shadow-blue-500/30' : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
                  }`}>
                  <FileText size={22} />
                </div>
                <div>
                  <span className="text-[10px] font-mono font-bold text-blue-600 dark:text-blue-400 block uppercase">
                    {isTh ? 'ขั้นตอนที่ 4' : 'Step 4 Navigation'}
                  </span>
                  <span className="text-sm sm:text-base font-black tracking-tight block">
                    {isTh ? 'รายละเอียดงานและเอกสารแนบ' : 'Job Detail & Attachments'}
                  </span>
                  <span className="text-[11px] text-slate-500 block">
                    {isTh ? 'สเปกอุปกรณ์ ผังลำดับขั้น และอัปโหลดไฟล์' : 'Equipment specs, hierarchy & file uploads'}
                  </span>
                </div>
              </div>
              <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 shrink-0 font-mono">
                {currentJob.attachments.length} {isTh ? 'ไฟล์' : 'files'}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setWorkspaceTab('turnover')}
              className={`p-4 sm:p-5 rounded-2xl border-2 transition-all cursor-pointer flex items-center justify-between text-left min-h-[58px] ${workspaceTab === 'turnover'
                ? 'border-emerald-600 bg-emerald-50/80 dark:bg-emerald-950/40 text-emerald-950 dark:text-emerald-100 shadow-md ring-4 ring-emerald-500/15'
                : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:border-slate-300 hover:bg-slate-50'
                }`}
            >
              <div className="flex items-center gap-3.5">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${workspaceTab === 'turnover' ? 'bg-emerald-600 text-white shadow-md shadow-emerald-500/30' : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
                  }`}>
                  <ShieldCheck size={22} />
                </div>
                <div>
                  <span className="text-[10px] font-mono font-bold text-emerald-600 dark:text-emerald-400 block uppercase">
                    {isTh ? 'ขั้นตอนที่ 5, 6, 7' : 'Step 5, 6, 7 Navigation'}
                  </span>
                  <span className="text-sm sm:text-base font-black tracking-tight block">
                    {isTh ? 'ตรวจรับรองการส่งมอบ (T/O)' : 'Turnover (T/O) Verification'}
                  </span>
                  <span className="text-[11px] text-slate-500 block">
                    {isTh ? 'ลงนามดิจิทัล 5 บทบาทและจัดการข้อบกพร่อง' : 'Digital signature & punch list resolution'}
                  </span>
                </div>
              </div>
              <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 shrink-0">
                {isTh
                  ? `${currentJob.signatures.length}/5 ลงนาม • ค้าง ${currentJob.punchList.filter(p => p.status === 'Open').length}`
                  : `${currentJob.signatures.length}/5 Signs • ${currentJob.punchList.filter(p => p.status === 'Open').length} Open`}
              </span>
            </button>
          </div>

          {/* TAB 1: JOB DETAIL & ATTACHMENTS TAB */}
          {workspaceTab === 'detail' && (
            <div className="space-y-6 animate-in fade-in duration-200">

              {/* 1. Job Detail — Read-only Summary (11 Fields from Job Master & Location) */}
              <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-5 sm:p-6 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800 gap-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-xl bg-teal-50 dark:bg-teal-950/60 text-teal-700 dark:text-teal-300 flex items-center justify-center font-bold">
                      <FileText size={18} />
                    </div>
                    <div>
                      <h3 className="text-sm font-black text-slate-900 dark:text-slate-100 tracking-tight flex items-center gap-2">
                        <span>{isTh ? 'ข้อมูลงานและสถานที่ (Job Detail)' : 'Job Detail Summary'}</span>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                          Read-only
                        </span>
                      </h3>
                      <p className="text-[11px] text-slate-500">
                        {isTh ? 'ข้อมูลอ้างอิงจาก Job Master & Job Location ของงานที่เปิดอยู่' : 'Read-only data populated directly from the currently active Job Master'}
                      </p>
                    </div>
                  </div>

                  {/* Dual Status Badges: Turnover Status & Acceptance Status */}
                  <div className="flex items-center gap-2 flex-wrap">
                    {/* Acceptance Status Badge */}
                    <div className="flex items-center gap-1.5 px-3 py-1 rounded-xl border bg-slate-50 dark:bg-slate-800/80 border-slate-200 dark:border-slate-700">
                      <span className="text-[10px] uppercase font-bold text-slate-400">
                        {isTh ? 'ผลตรวจรับ:' : 'Acceptance:'}
                      </span>
                      <span className={`text-xs font-black px-2 py-0.5 rounded-full ${
                        getJobAcceptanceStatus(currentJob) === 'Accepted'
                          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                          : getJobAcceptanceStatus(currentJob) === 'Not Accepted'
                          ? 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                          : getJobAcceptanceStatus(currentJob) === 'Pending Re-Accept'
                          ? 'bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-200'
                          : 'bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-300'
                      }`}>
                        {getJobAcceptanceStatus(currentJob)}
                      </span>
                    </div>

                    {/* Turnover Status Badge */}
                    <div className="flex items-center gap-1.5 px-3 py-1 rounded-xl border bg-slate-50 dark:bg-slate-800/80 border-slate-200 dark:border-slate-700">
                      <span className="text-[10px] uppercase font-bold text-slate-400">
                        {isTh ? 'สถานะ T/O:' : 'T/O Status:'}
                      </span>
                      <span className={`text-xs font-black px-2 py-0.5 rounded-full ${
                        getJobTurnoverStatus(currentJob) === 'Completed'
                          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                          : getJobTurnoverStatus(currentJob) === 'Rejected'
                          ? 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                          : getJobTurnoverStatus(currentJob) === 'Reviewed'
                          ? 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300'
                          : 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300'
                      }`}>
                        {getJobTurnoverStatus(currentJob)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* 11 Fields Read-Only Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 text-xs">
                  {/* Field 1: Job ID */}
                  <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
                    <span className="text-[10px] uppercase font-bold text-slate-400 block mb-0.5">1. Job ID</span>
                    <span className="font-mono font-bold text-slate-900 dark:text-slate-100">{currentJob.jobNo || currentJob.id}</span>
                  </div>

                  {/* Field 2: Job Description */}
                  <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 sm:col-span-2 lg:col-span-3">
                    <span className="text-[10px] uppercase font-bold text-slate-400 block mb-0.5">2. Job Description</span>
                    <span className="font-semibold text-slate-800 dark:text-slate-200 line-clamp-1">{currentJob.description || currentJob.title}</span>
                  </div>

                  {/* Field 3: Event Name */}
                  <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
                    <span className="text-[10px] uppercase font-bold text-slate-400 block mb-0.5">3. Event Name</span>
                    <span className="font-semibold text-slate-800 dark:text-slate-200">{currentJob.eventName || eventName || 'Annual Turnaround 2026'}</span>
                  </div>

                  {/* Field 4: Site / Plant / Unit */}
                  <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
                    <span className="text-[10px] uppercase font-bold text-slate-400 block mb-0.5">4. Site / Plant / Unit</span>
                    <span className="font-semibold text-slate-800 dark:text-slate-200">{currentJob.plant || 'Phra Khanong'} / {currentJob.unit || 'APS-1'}</span>
                  </div>

                  {/* Field 5: Equipment Type */}
                  <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
                    <span className="text-[10px] uppercase font-bold text-slate-400 block mb-0.5">5. Equipment Type</span>
                    <span className="font-semibold text-slate-800 dark:text-slate-200">{currentJob.equipmentType || 'Column / Tower (หอกลั่น)'}</span>
                  </div>

                  {/* Field 6: Equipment Tag */}
                  <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
                    <span className="text-[10px] uppercase font-bold text-slate-400 block mb-0.5">6. Equipment Tag</span>
                    <span className="font-mono font-bold text-teal-700 dark:text-teal-400">{currentJob.assetTag || 'T-101'}</span>
                  </div>

                  {/* Field 7: Discipline */}
                  <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
                    <span className="text-[10px] uppercase font-bold text-slate-400 block mb-0.5">7. Discipline</span>
                    <span className="font-semibold text-slate-800 dark:text-slate-200">{currentJob.discipline || 'MAD — Mechanical Static & Piping'}</span>
                  </div>

                  {/* Field 8: Turnover System */}
                  <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
                    <span className="text-[10px] uppercase font-bold text-slate-400 block mb-0.5">8. Turnover System</span>
                    <span className="font-semibold text-slate-800 dark:text-slate-200">{currentJob.turnoverSystem || currentJob.system || 'System-13 (Overhead Circuit)'}</span>
                  </div>

                  {/* Field 9: Job Supervisor */}
                  <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
                    <span className="text-[10px] uppercase font-bold text-slate-400 block mb-0.5">9. Job Supervisor</span>
                    <span className="font-semibold text-slate-800 dark:text-slate-200">{currentJob.jobSupervisor || 'นายประสิทธิ์ มั่นคง (Job Supervisor)'}</span>
                  </div>

                  {/* Field 10: Job Lead */}
                  <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
                    <span className="text-[10px] uppercase font-bold text-slate-400 block mb-0.5">10. Job Lead</span>
                    <span className="font-semibold text-slate-800 dark:text-slate-200">{currentJob.jobLead || 'นายสมชาย ใจมั่น (Lead Mechanical Engineer)'}</span>
                  </div>
                </div>
              </div>

              {/* 2. File Upload Area & Attachments */}
              <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-6 space-y-5">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                    <UploadCloud className="text-blue-600" size={18} />
                    <span>{isTh ? 'อัปโหลดไฟล์และเอกสารแนบ (Attachments)' : 'File Upload & Attachments'}</span>
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {isTh ? 'อัปโหลดเอกสารตรวจสอบ ใบรายงานแรงขันน็อต หรือใบรับรอง QA' : 'Upload inspection dossiers, bolt torque sheets, or QA certificates.'}
                  </p>
                </div>

                {/* Hidden File Input for Real Uploads */}
                <input
                  ref={attachmentFileInputRef}
                  type="file"
                  multiple
                  accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg,.zip"
                  className="hidden"
                  onChange={(e) => {
                    if (e.target.files) {
                      handleFileUpload(e.target.files);
                      e.target.value = '';
                    }
                  }}
                />

                {/* Drag and Drop Upload Area */}
                <div
                  onClick={() => attachmentFileInputRef.current?.click()}
                  onDragOver={(e) => {
                    e.preventDefault();
                    setIsDragOverAttachment(true);
                  }}
                  onDragLeave={() => setIsDragOverAttachment(false)}
                  onDrop={(e) => {
                    e.preventDefault();
                    setIsDragOverAttachment(false);
                    if (e.dataTransfer.files) {
                      handleFileUpload(e.dataTransfer.files);
                    }
                  }}
                  className={`border-2 border-dashed rounded-2xl p-6 text-center transition-all cursor-pointer group ${isDragOverAttachment
                      ? 'border-blue-500 bg-blue-50/80 dark:bg-blue-950/40 ring-4 ring-blue-500/10'
                      : 'border-slate-300 dark:border-slate-700 hover:border-blue-500 dark:hover:border-blue-500 bg-slate-50/50 dark:bg-slate-800/30'
                    }`}
                >
                  <div className="w-12 h-12 rounded-xl bg-blue-100 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center mx-auto mb-3 group-hover:scale-105 transition-transform">
                    <UploadCloud size={24} />
                  </div>
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-300 block">
                    {isTh ? 'คลิกเพื่อเลือกไฟล์ หรือลากไฟล์มาวางที่นี่' : 'Click or Drag & Drop Documents'}
                  </span>
                  <span className="text-[10px] text-slate-400 mt-1 block">
                    {isTh ? 'รองรับ PDF, DOC, XLS, PNG, JPG (อัปโหลดได้หลายไฟล์)' : 'Supports PDF, PNG, JPG, XLS, DOC (Multi-file upload)'}
                  </span>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      attachmentFileInputRef.current?.click();
                    }}
                    className="mt-3 px-3 py-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/60 dark:hover:bg-blue-900 text-blue-700 dark:text-blue-300 text-[11px] font-bold border border-blue-200 dark:border-blue-900 transition-colors cursor-pointer"
                  >
                    + {isTh ? 'เลือกไฟล์อัปโหลด' : 'Add Attachment'}
                  </button>
                </div>

                {/* Attached Documents List */}
                <div className="space-y-2">
                  <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                    {isTh ? `รายการไฟล์ที่แนบแล้ว (${currentJob.attachments.length})` : `Attached Files (${currentJob.attachments.length})`}
                  </span>
                  {currentJob.attachments.length > 0 ? (
                    <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                      {currentJob.attachments.map((att, idx) => (
                        <div key={idx} className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 flex items-center justify-between text-xs hover:border-blue-300 dark:hover:border-slate-700 transition-colors">
                          <div className="flex items-center gap-2 truncate pr-2 min-w-0">
                            <FileText size={15} className="text-blue-600 shrink-0" />
                            <div className="truncate">
                              {att.url ? (
                                <a
                                  href={att.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  download={att.name}
                                  onClick={(e) => e.stopPropagation()}
                                  className="font-medium text-blue-600 dark:text-blue-400 hover:underline truncate block"
                                  title={isTh ? 'คลิกเพื่อดูตัวอย่าง / ดาวน์โหลด' : 'Click to preview / download'}
                                >
                                  {att.name}
                                </a>
                              ) : (
                                <span className="font-medium text-slate-700 dark:text-slate-200 truncate block">
                                  {att.name}
                                </span>
                              )}
                              {att.uploadedAt && (
                                <span className="text-[10px] text-slate-400 block">{att.uploadedAt}</span>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <span className="text-[10px] text-slate-400 font-mono">{att.size}</span>
                            {att.url && (
                              <a
                                href={att.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                download={att.name}
                                onClick={(e) => e.stopPropagation()}
                                className="p-1 rounded text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-slate-700 transition"
                                title={isTh ? 'ดาวน์โหลด' : 'Download'}
                              >
                                <Download size={13} />
                              </a>
                            )}
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteAttachment(idx);
                              }}
                              className="p-1 rounded text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition cursor-pointer"
                              title={isTh ? 'ลบไฟล์นี้' : 'Delete file'}
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-slate-400 italic">{isTh ? 'ยังไม่มีเอกสารแนบ' : 'No attachments uploaded yet.'}</p>
                  )}
                </div>
              </div>

            </div>
          )}

          {/* TAB 2: TURNOVER (T/O) VIEW (CONTAINS ONLY 2 TABS: SIGN & PUNCH LIST) */}
          {workspaceTab === 'turnover' && (
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden animate-in fade-in duration-200">

              {/* Turnover Sub-tabs Header: "Sign" and "Punch List" */}
              <div className="p-4 bg-slate-50/80 dark:bg-slate-800/40 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between flex-wrap gap-3">
                <div className="inline-flex rounded-xl bg-slate-200/80 dark:bg-slate-800 p-1">
                  <button
                    type="button"
                    onClick={() => setTurnoverSubTab('sign')}
                    className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
                      turnoverSubTab === 'sign'
                        ? 'bg-white dark:bg-slate-700 text-teal-700 dark:text-teal-300 shadow-xs'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                    }`}
                  >
                    <PenTool size={14} />
                    <span>{isTh ? 'การลงนาม (Sign Acceptance)' : 'Sign (Acceptance)'}</span>
                    {currentJob.signatures.length > 0 && (
                      <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => setTurnoverSubTab('punchlist')}
                    className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
                      turnoverSubTab === 'punchlist'
                        ? 'bg-white dark:bg-slate-700 text-rose-700 dark:text-rose-300 shadow-xs'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                    }`}
                  >
                    <AlertTriangle size={14} />
                    <span>{isTh ? 'รายการข้อบกพร่อง (Punch List)' : 'Punch List'}</span>
                    <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                      currentJob.punchList.filter(p => isPunchItemOpen(p)).length > 0
                        ? 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300'
                        : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
                    }`}>
                      {currentJob.punchList.filter(p => isPunchItemOpen(p)).length}
                    </span>
                  </button>
                </div>

                <div className="text-xs text-slate-500 font-medium">
                  {turnoverSubTab === 'sign'
                    ? (isTh ? 'การตรวจรับและลงนามรับรองการส่งมอบ (Accept / Not Accept)' : 'Handover acceptance verification and digital sign-off')
                    : (isTh ? 'รายการข้อบกพร่องและงานแก้ไข (TAM Corrective Action Workflow)' : 'Track, close, and verify punch list remedial items')}
                </div>
              </div>



                {/* ================= TAB 1: SIGN (ACCEPTANCE) ================= */}
                {turnoverSubTab === 'sign' && (
                  <div className="p-5 sm:p-7 space-y-6">

                    {/* Banner if Status is Pending Re-Accept */}
                    {getJobAcceptanceStatus(currentJob) === 'Pending Re-Accept' && (
                      <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800 text-amber-900 dark:text-amber-200 flex items-start gap-3">
                        <CheckCircle2 size={20} className="text-amber-600 shrink-0 mt-0.5" />
                        <div className="space-y-1">
                          <h4 className="text-xs font-bold uppercase tracking-wider">
                            {isTh ? 'งานแก้ไขได้รับการตรวจสอบผ่านแล้ว (Ready for Re-Acceptance)' : 'All Remedial Items Verified — Ready for Re-Acceptance'}
                          </h4>
                          <p className="text-xs">
                            {isTh
                              ? 'รายการ Punch/Butt ทั้งหมดได้รับการปิดงานโดย Contractor และตรวจสอบผ่านโดย Job Lead แล้ว กรุณาทำการตรวจรับซ้ำ (Re-Accept) และลงนามใหม่ด้านล่าง'
                              : 'All Punch/Butt remedial items have been closed by Contractor and verified by Job Lead. Please submit a new Acceptance Decision and signature below.'}
                          </p>
                        </div>
                      </div>
                    )}

                    {/* Current Acceptance Decision Form (No rigid numbered headings 1, 2, 3 as requested) */}
                    <div className="bg-slate-50/60 dark:bg-slate-900/70 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 sm:p-7 space-y-6">
                      
                      <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-700 pb-3">
                        <div>
                          <h4 className="text-base font-black text-slate-900 dark:text-slate-100">
                            {currentJob.signatures.length > 0 && !isReSigning
                              ? (isTh ? 'บันทึกการตรวจรับมอบระบบ (Acceptance Decision)' : 'Handover Acceptance Decision')
                              : (isTh ? 'ดำเนินการตรวจรับมอบระบบ (Handover Acceptance)' : 'Handover Acceptance Sign-off')}
                          </h4>
                          <p className="text-xs text-slate-500 mt-0.5">
                            {isTh ? 'เลือกผลการตรวจรับมอบ ลงลายเซ็นดิจิทัล และยืนยันข้อมูล' : 'Select decision, complete digital signature, and submit'}
                          </p>
                        </div>
                        {currentJob.signatures.length > 0 && !isReSigning && (
                          <button
                            type="button"
                            onClick={() => {
                              setIsReSigning(true);
                              setSignDecision('Accept');
                              setRejectionReason('');
                              setNotAcceptPunchChoice('');
                              setAcceptanceRemarks('');
                              setDrawnSignatureDataUrl(null);
                              setIsSignedPad(false);
                            }}
                            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold transition shadow-xs cursor-pointer"
                          >
                            <RefreshCw size={13} />
                            <span>{isTh ? 'ตรวจรับซ้ำ / ลงนามใหม่ (Re-Accept)' : 'Re-Accept / Sign Again'}</span>
                          </button>
                        )}
                      </div>

                      {/* When in Active Signing Mode (Initial or Re-Signing) */}
                      {(currentJob.signatures.length === 0 || isReSigning) && (
                        <div className="space-y-6">
                          
                          {/* Acceptance Decision Selection (Two Clear Cards) */}
                          <div className="space-y-2">
                            <label className="text-xs font-bold text-slate-800 dark:text-slate-200 block">
                              {isTh ? 'ผลการตรวจรับมอบ (Acceptance Decision) *' : 'Acceptance Decision *'}
                            </label>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                              <button
                                type="button"
                                onClick={() => setSignDecision('Accept')}
                                className={`p-4 rounded-2xl border-2 text-left transition-all cursor-pointer flex items-center gap-3.5 min-h-[58px] ${
                                  signDecision === 'Accept'
                                    ? 'border-emerald-600 bg-emerald-50/70 dark:bg-emerald-950/40 text-emerald-950 dark:text-emerald-100 ring-2 ring-emerald-500/20 shadow-xs'
                                    : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50'
                                }`}
                              >
                                <div className={`w-6 h-6 rounded-full border flex items-center justify-center shrink-0 ${
                                  signDecision === 'Accept' ? 'border-emerald-600 bg-emerald-600 text-white' : 'border-slate-400'
                                }`}>
                                  {signDecision === 'Accept' && <Check size={14} className="stroke-[3]" />}
                                </div>
                                <div>
                                  <span className="text-sm font-black block">{isTh ? '✓ ยอมรับการส่งมอบ (Accept)' : 'Accept Handover'}</span>
                                  <span className="text-[11px] text-slate-500 block">{isTh ? 'ระบบมีความพร้อมสมบูรณ์ พร้อมสำหรับการเริ่มเดินเครื่อง' : 'System is verified and ready for startup'}</span>
                                </div>
                              </button>

                              <button
                                type="button"
                                onClick={() => setSignDecision('Not Accept')}
                                className={`p-4 rounded-2xl border-2 text-left transition-all cursor-pointer flex items-center gap-3.5 min-h-[58px] ${
                                  signDecision === 'Not Accept'
                                    ? 'border-rose-600 bg-rose-50/70 dark:bg-rose-950/40 text-rose-950 dark:text-rose-100 ring-2 ring-rose-500/20 shadow-xs'
                                    : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50'
                                }`}
                              >
                                <div className={`w-6 h-6 rounded-full border flex items-center justify-center shrink-0 ${
                                  signDecision === 'Not Accept' ? 'border-rose-600 bg-rose-600 text-white' : 'border-slate-400'
                                }`}>
                                  {signDecision === 'Not Accept' && <X size={14} className="stroke-[3]" />}
                                </div>
                                <div>
                                  <span className="text-sm font-black block">{isTh ? '✕ ไม่ยอมรับ (Not Accept / พบข้อบกพร่อง)' : 'Not Accept (Reject)'}</span>
                                  <span className="text-[11px] text-slate-500 block">{isTh ? 'พบข้อบกพร่องที่ต้องแก้ไขก่อนส่งมอบ (สร้าง Punch/Butt)' : 'Defects found that must be resolved'}</span>
                                </div>
                              </button>
                            </div>
                          </div>

                          {/* Conditional Section for NOT ACCEPT: Rejection Reason & TAM Punch/Butt Creation */}
                          {signDecision === 'Not Accept' && (
                            <div className="p-5 rounded-2xl bg-rose-50/80 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/60 space-y-4 animate-in fade-in duration-200">
                              <div className="flex items-center gap-2 text-rose-800 dark:text-rose-300 text-xs font-bold border-b border-rose-200 dark:border-rose-800/60 pb-2">
                                <AlertTriangle size={16} />
                                <span>{isTh ? 'เหตุผลที่ไม่ยอมรับ และข้อมูลสร้างรายการแก้ไข (Punch List)' : 'Rejection Reason & Punch List Creation'}</span>
                              </div>

                              {/* Punch List dropdown: previously keyed items first, "Other" to type a new reason */}
                              <div className="space-y-1.5">
                                <label className="text-xs font-bold text-slate-800 dark:text-slate-200">
                                  {isTh ? 'Punch List (เลือกรายการที่ไม่ยอมรับ) *' : 'Punch List *'}
                                </label>
                                <select
                                  value={notAcceptPunchChoice}
                                  onChange={e => {
                                    const v = e.target.value;
                                    setNotAcceptPunchChoice(v);
                                    setRejectionReason(v === NOT_ACCEPT_OTHER ? '' : v);
                                  }}
                                  className="w-full px-3 py-2.5 rounded-xl border border-rose-300 dark:border-rose-800 bg-white dark:bg-slate-900 text-xs font-bold outline-none cursor-pointer focus:ring-2 focus:ring-rose-500/20"
                                >
                                  <option value="">{isTh ? '— เลือกรายการ Punch List —' : '— Select a Punch List item —'}</option>
                                  {NOT_ACCEPT_PRESET_TYPES.map(p => (
                                    <option key={p.value} value={p.value}>{isTh ? p.th : p.value}</option>
                                  ))}
                                  {previousPunchReasons.filter(r => !NOT_ACCEPT_PRESET_TYPES.some(p => p.value === r)).length > 0 && (
                                    <optgroup label={isTh ? 'รายการที่เคยบันทึก' : 'Previously keyed'}>
                                      {previousPunchReasons.filter(r => !NOT_ACCEPT_PRESET_TYPES.some(p => p.value === r)).map(r => (
                                        <option key={r} value={r}>{(r || '').length > 90 ? `${(r || '').slice(0, 90)}…` : r}</option>
                                      ))}
                                    </optgroup>
                                  )}
                                  <option value={NOT_ACCEPT_OTHER}>{isTh ? 'อื่นๆ (ระบุข้อความเอง)...' : 'Other (specify)...'}</option>
                                </select>
                                <p className="text-[11px] text-slate-500">
                                  {isTh ? 'รายการที่แสดงคือ Punch List ที่เคยบันทึกไว้ในระบบ' : 'Items shown are Punch List entries previously keyed in the system.'}
                                </p>
                              </div>

                              {/* Rejection Reason: only when "Other" is selected */}
                              {notAcceptPunchChoice === NOT_ACCEPT_OTHER && (
                                <div className="space-y-1.5 animate-in fade-in duration-150">
                                  <label className="text-xs font-bold text-slate-800 dark:text-slate-200">
                                    {isTh ? 'เหตุผลที่ไม่ยอมรับ (Rejection Reason) *' : 'Rejection Reason *'}
                                  </label>
                                  <textarea
                                    rows={2}
                                    required
                                    autoFocus
                                    value={rejectionReason}
                                    onChange={e => setRejectionReason(e.target.value)}
                                    placeholder={isTh ? 'ระบุเหตุผลที่ไม่ยอมรับ เช่น พบรอยรั่วที่หน้าแปลน, ขาดเอกสารรับรองแรงขัน...' : 'State clearly why handover cannot be accepted...'}
                                    className="w-full p-3 rounded-xl border border-rose-300 dark:border-rose-800 bg-white dark:bg-slate-900 text-xs outline-none focus:ring-2 focus:ring-rose-500/20"
                                  />
                                </div>
                              )}

                              {/* TAM Punch Fields */}
                              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5 pt-2">

                                <div className="space-y-1">
                                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                                    {isTh ? 'สาขาความรับผิดชอบ (Discipline) *' : 'Discipline *'}
                                  </label>
                                  <select
                                    value={notAcceptDiscipline}
                                    onChange={e => setNotAcceptDiscipline(e.target.value)}
                                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-semibold outline-none cursor-pointer"
                                  >
                                    {TAM_DISCIPLINE_OPTIONS.map(d => (
                                      <option key={d} value={d}>{d}</option>
                                    ))}
                                  </select>
                                </div>

                                <div className="space-y-1">
                                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                                    {isTh ? 'ผู้รับเหมาผู้รับผิดชอบ (Contractor) *' : 'Contractor *'}
                                  </label>
                                  <select
                                    value={notAcceptContractor}
                                    onChange={e => setNotAcceptContractor(e.target.value)}
                                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-semibold outline-none cursor-pointer"
                                  >
                                    {TAM_CONTRACTOR_OPTIONS.map(c => (
                                      <option key={c} value={c}>{c}</option>
                                    ))}
                                  </select>
                                </div>

                                <div className="space-y-1">
                                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                                    {isTh ? 'หมวดหมู่ความเสี่ยง (Punch Category) *' : 'Punch Category *'}
                                  </label>
                                  <select
                                    value={notAcceptCategory}
                                    onChange={e => setNotAcceptCategory(e.target.value as PunchCategory)}
                                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-bold outline-none cursor-pointer"
                                  >
                                    <option value="A">Category A</option>
                                    <option value="B">Category B</option>
                                    <option value="C">Category C</option>
                                  </select>
                                </div>

                                <div className="space-y-1">
                                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                                    {isTh ? 'กำหนดวันที่ต้องแก้ไข (Planned Date) *' : 'Planned Date *'}
                                  </label>
                                  <input
                                    type="date"
                                    value={notAcceptPlannedDate}
                                    onChange={e => setNotAcceptPlannedDate(e.target.value)}
                                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-semibold outline-none"
                                  />
                                </div>

                                <div className="space-y-1">
                                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                                    {isTh ? 'สถานะเริ่มต้น (Punch Status)' : 'Initial Punch Status'}
                                  </label>
                                  <div className="px-3 py-2 rounded-xl bg-slate-200/80 dark:bg-slate-700 font-bold text-slate-700 dark:text-slate-300 text-xs flex items-center justify-between">
                                    <span>In Progress</span>
                                    <span className="text-[10px] text-slate-500 font-normal">Auto</span>
                                  </div>
                                </div>
                              </div>

                              {/* Remedial Works Details */}
                              <div className="space-y-1">
                                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                                  {isTh ? 'รายละเอียดงานแก้ไข (Remedial Works) *' : 'Remedial Works Description *'}
                                </label>
                                <textarea
                                  rows={2}
                                  value={notAcceptRemedialWorks}
                                  onChange={e => setNotAcceptRemedialWorks(e.target.value)}
                                  placeholder={isTh ? 'ดึงมาจาก Rejection Reason เป็นค่าเริ่มต้น สามารถปรับปรุงคำอธิบายแนวทางแก้ไขได้...' : 'Remedial action plan to resolve this item...'}
                                  className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs outline-none focus:ring-2 focus:ring-teal-500/20"
                                />
                              </div>

                              <div className="flex items-center gap-3 text-[11px] text-slate-500 pt-1">
                                <span>Related Job ID: <strong className="font-mono text-slate-800 dark:text-slate-200">{currentJob.jobNo || currentJob.id}</strong></span>
                                <span>•</span>
                                <span>Related Acceptance ID: <strong className="font-mono text-slate-800 dark:text-slate-200">Auto (ACC-xxxxxx)</strong></span>
                              </div>
                            </div>
                          )}

                          {/* Signer Profile & Remarks */}
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="space-y-1">
                              <label className="text-xs font-bold text-slate-800 dark:text-slate-200">
                                {isTh ? 'ชื่อ-นามสกุล ผู้ลงนาม (Signer Full Name) *' : 'Signer Full Name *'}
                              </label>
                              <input
                                type="text"
                                required
                                value={signerName}
                                onChange={e => setSignerName(e.target.value)}
                                placeholder={isTh ? 'เช่น นายสมชาย ประเสริฐ' : 'Signer Name'}
                                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-bold text-slate-900 dark:text-slate-100 outline-none focus:ring-2 focus:ring-teal-500/20"
                              />
                            </div>

                            <div className="space-y-1">
                              <label className="text-xs font-bold text-slate-800 dark:text-slate-200">
                                {isTh ? 'ตำแหน่ง / บทบาทผู้ตรวจรับ (Signer Role) *' : 'Signer Role *'}
                              </label>
                              <select
                                value={signerRole}
                                onChange={e => setSignerRole(e.target.value)}
                                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-bold text-slate-900 dark:text-slate-100 outline-none cursor-pointer"
                              >
                                {currentPlantRoles.map(r => (
                                  <option key={r} value={r}>{r}</option>
                                ))}
                              </select>
                              <p className="text-[10px] text-slate-400">
                                {isTh
                                  ? `บทบาทของโรงงาน ${currentPlantKey} — ตั้งค่าได้ใน Settings`
                                  : `Roles for ${currentPlantKey} — configured in Settings`}
                              </p>
                            </div>
                          </div>

                          {/* Optional Acceptance Remarks */}
                          <div className="space-y-1">
                            <label className="text-xs font-bold text-slate-800 dark:text-slate-200">
                              {isTh ? 'หมายเหตุเพิ่มเติม (Acceptance Remarks)' : 'Acceptance Remarks (Optional)'}
                            </label>
                            <input
                              type="text"
                              value={acceptanceRemarks}
                              onChange={e => setAcceptanceRemarks(e.target.value)}
                              placeholder={isTh ? 'ระบุข้อสังเกตเพิ่มเติม (ถ้ามี)...' : 'Additional remarks or conditions...'}
                              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs outline-none focus:ring-2 focus:ring-teal-500/20"
                            />
                          </div>

                          {/* Site Evidence Photo Attachment (Available for BOTH Accept and Not Accept) */}
                          <div className="space-y-2">
                            <div className="flex items-center justify-between">
                              <label className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                                <Camera size={15} className="text-teal-600 dark:text-teal-400" />
                                <span>{isTh ? 'แนบรูปถ่ายหลักฐานหน้างาน (Site Evidence Photo)' : 'Site Evidence Photo (Camera / Upload)'}</span>
                              </label>
                              <span className="text-[10px] text-teal-600 dark:text-teal-400 font-medium">
                                {signDecision === 'Accept'
                                  ? (isTh ? 'รูปความพร้อมของระบบก่อนเริ่มเดินเครื่อง' : 'Readiness evidence')
                                  : (isTh ? 'รูปภาพข้อบกพร่องที่ต้องแก้ไข' : 'Defect evidence')}
                              </span>
                            </div>

                            {/* Hidden Photo Camera Input */}
                            <input
                              ref={signPhotoInputRef}
                              type="file"
                              accept="image/*"
                              capture="environment"
                              onChange={handleSignPhotoCapture}
                              className="hidden"
                            />

                            {!signPhotoUrl ? (
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <button
                                  type="button"
                                  onClick={() => {
                                    if (signPhotoInputRef.current) {
                                      signPhotoInputRef.current.setAttribute('capture', 'environment');
                                      signPhotoInputRef.current.click();
                                    }
                                  }}
                                  className="p-3.5 rounded-xl border-2 border-dashed border-teal-300 dark:border-teal-800 bg-teal-50/50 dark:bg-teal-950/30 hover:bg-teal-50 dark:hover:bg-teal-950/50 hover:border-teal-500 transition-all flex items-center gap-3 cursor-pointer group text-left"
                                >
                                  <div className="w-9 h-9 rounded-xl bg-teal-100 dark:bg-teal-900 text-teal-700 dark:text-teal-300 flex items-center justify-center shrink-0">
                                    <Camera size={18} />
                                  </div>
                                  <div>
                                    <span className="text-xs font-bold text-teal-900 dark:text-teal-200 block">
                                      {isTh ? '📸 ถ่ายรูปหน้างาน (Camera)' : '📸 Take Photo'}
                                    </span>
                                    <span className="text-[10px] text-teal-600 dark:text-teal-400 block">
                                      {isTh ? 'เปิดกล้องมือถือ / แท็บเล็ตถ่ายภาพ' : 'Open device camera'}
                                    </span>
                                  </div>
                                </button>

                                <button
                                  type="button"
                                  onClick={() => {
                                    if (signPhotoInputRef.current) {
                                      signPhotoInputRef.current.removeAttribute('capture');
                                      signPhotoInputRef.current.click();
                                    }
                                  }}
                                  className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/40 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all flex items-center gap-3 cursor-pointer group text-left"
                                >
                                  <div className="w-9 h-9 rounded-xl bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 flex items-center justify-center shrink-0">
                                    <UploadCloud size={18} />
                                  </div>
                                  <div>
                                    <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block">
                                      {isTh ? 'เลือกรูปภาพจากเครื่อง (Upload)' : 'Choose Image File'}
                                    </span>
                                    <span className="text-[10px] text-slate-400 block">
                                      {isTh ? 'JPG, PNG จากเครื่องหรือแกลเลอรี' : 'From local gallery/file'}
                                    </span>
                                  </div>
                                </button>
                              </div>
                            ) : (
                              <div className="p-3.5 rounded-2xl bg-teal-50/70 dark:bg-teal-950/30 border border-teal-200 dark:border-teal-900/60 flex items-center gap-4">
                                <img data-zoom="true"
                                  src={signPhotoUrl}
                                  alt="Evidence"
                                  className="w-24 h-20 object-cover rounded-xl border border-teal-300 dark:border-teal-800 shadow-2xs shrink-0"
                                />
                                <div className="flex-1 space-y-1">
                                  <div className="flex items-center gap-1.5 text-xs font-bold text-teal-900 dark:text-teal-200">
                                    <CheckCircle2 size={14} className="text-teal-600" />
                                    <span>{isTh ? 'แนบรูปถ่ายเรียบร้อยแล้ว' : 'Photo Attached'}</span>
                                  </div>
                                  <p className="text-[10px] text-slate-500">
                                    {isTh ? 'ภาพนี้จะถูกบันทึกรวมในประวัติการตรวจรับมอบและรายการ Punch/Butt' : 'Attached to this acceptance record.'}
                                  </p>
                                  <div className="flex items-center gap-2 pt-1">
                                    <button
                                      type="button"
                                      onClick={() => {
                                        if (signPhotoInputRef.current) {
                                          signPhotoInputRef.current.setAttribute('capture', 'environment');
                                          signPhotoInputRef.current.click();
                                        }
                                      }}
                                      className="px-2.5 py-1 rounded bg-teal-100 hover:bg-teal-200 dark:bg-teal-900/60 text-teal-800 dark:text-teal-200 text-[10px] font-bold cursor-pointer"
                                    >
                                      {isTh ? 'ถ่ายใหม่' : 'Retake'}
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => setSignPhotoUrl(null)}
                                      className="px-2.5 py-1 rounded bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 text-[10px] font-bold cursor-pointer"
                                    >
                                      {isTh ? 'ลบรูป' : 'Remove'}
                                    </button>
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>

                          {/* Digital Signature Pad */}
                          <div className="space-y-2">
                            <div className="flex items-center justify-between">
                              <label className="text-xs font-bold text-slate-800 dark:text-slate-200">
                                {isTh ? 'ลายเซ็นดิจิทัล (Digital Signature) *' : 'Digital Signature *'}
                              </label>
                              <span className="text-[10px] text-teal-600 dark:text-teal-400 font-medium">
                                {isTh ? 'เซ็นด้วยระบบสัมผัส เมาส์ หรือสไตลัส' : 'Touch / Stylus / Mouse'}
                              </span>
                            </div>

                            <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                              <DigitalSignaturePad
                                signerName={signerName}
                                onSignerNameChange={setSignerName}
                                onSaveSignature={(signatureDataUrl) => {
                                  setDrawnSignatureDataUrl(signatureDataUrl);
                                  setIsSignedPad(true);
                                  handleSubmitAcceptance(signatureDataUrl);
                                }}
                              />
                            </div>
                          </div>

                          {/* Form Action Buttons */}
                          <div className="flex items-center gap-3 pt-2">
                            <button
                              type="button"
                              onClick={() => handleSubmitAcceptance()}
                              className={`flex-1 py-3 px-6 rounded-2xl text-white text-xs font-black shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer min-h-[48px] active:scale-[0.99] ${
                                signDecision === 'Accept'
                                  ? 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 shadow-emerald-600/20'
                                  : 'bg-gradient-to-r from-rose-600 to-amber-600 hover:from-rose-500 hover:to-amber-500 shadow-rose-600/20'
                              }`}
                            >
                              <Check size={16} />
                              <span>
                                {signDecision === 'Accept'
                                  ? (isTh ? 'ยืนยันยอมรับการส่งมอบ (Confirm Acceptance)' : 'Confirm Acceptance')
                                  : (isTh ? 'ยืนยันปฏิเสธและสร้าง Punch/Butt (Confirm Not Accept)' : 'Confirm Not Accept & Log Punch')}
                              </span>
                            </button>

                            {isReSigning && (
                              <button
                                type="button"
                                onClick={() => setIsReSigning(false)}
                                className="px-4 py-3 rounded-2xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold hover:bg-slate-100 cursor-pointer min-h-[48px]"
                              >
                                {isTh ? 'ยกเลิก' : 'Cancel'}
                              </button>
                            )}
                          </div>

                        </div>
                      )}

                      {/* Display Latest Result Preview when NOT in re-sign mode */}
                      {currentJob.signatures.length > 0 && !isReSigning && (
                        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-5">
                          <div className="flex items-start gap-4">
                            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${
                              currentJob.signatures[currentJob.signatures.length - 1].decision === 'Accept'
                                ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
                                : 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300'
                            }`}>
                              {currentJob.signatures[currentJob.signatures.length - 1].decision === 'Accept' ? (
                                <CheckCircle2 size={24} />
                              ) : (
                                <AlertTriangle size={24} />
                              )}
                            </div>
                            <div className="space-y-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className={`px-2.5 py-0.5 rounded-full text-xs font-black ${
                                  currentJob.signatures[currentJob.signatures.length - 1].decision === 'Accept'
                                    ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200'
                                    : 'bg-rose-100 text-rose-800 dark:bg-rose-900 dark:text-rose-200'
                                }`}>
                                  {currentJob.signatures[currentJob.signatures.length - 1].decision === 'Accept'
                                    ? (isTh ? '✓ ตรวจรับมอบแล้ว (Accepted)' : 'Turnover Accepted')
                                    : (isTh ? '✕ ไม่ยอมรับการส่งมอบ (Not Accepted)' : 'Turnover Not Accepted')}
                                </span>
                                <span className="text-xs font-mono text-slate-400">
                                  {currentJob.signatures[currentJob.signatures.length - 1].signedAt}
                                </span>
                              </div>
                              <p className="text-xs text-slate-700 dark:text-slate-300 font-medium">
                                {isTh ? 'ผู้ลงนาม:' : 'Signer:'} <strong>{currentJob.signatures[currentJob.signatures.length - 1].name}</strong> ({currentJob.signatures[currentJob.signatures.length - 1].role})
                              </p>
                              {currentJob.signatures[currentJob.signatures.length - 1].rejectionReason && (
                                <p className="text-xs text-rose-600 dark:text-rose-400 font-semibold">
                                  {isTh ? 'สาเหตุที่ไม่ยอมรับ:' : 'Reason:'} "{currentJob.signatures[currentJob.signatures.length - 1].rejectionReason}"
                                </p>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center gap-3">
                            {currentJob.signatures[currentJob.signatures.length - 1].photoUrl && (
                              <div className="p-1.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex flex-col items-center">
                                <span className="text-[9px] text-slate-400 font-bold uppercase mb-1">Site Evidence</span>
                                <img data-zoom="true"
                                  src={currentJob.signatures[currentJob.signatures.length - 1].photoUrl}
                                  alt="Evidence"
                                  className="h-12 w-14 object-cover rounded-lg"
                                />
                              </div>
                            )}

                            {currentJob.signatures[currentJob.signatures.length - 1].signatureDataUrl && (
                              <div className="p-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex flex-col items-center">
                                <span className="text-[9px] text-slate-400 font-bold uppercase mb-1">Digital Signature</span>
                                <img data-zoom="true"
                                  src={currentJob.signatures[currentJob.signatures.length - 1].signatureDataUrl}
                                  alt="Signature"
                                  className="h-12 object-contain filter dark:invert"
                                />
                              </div>
                            )}

                            {currentJob.signatures[currentJob.signatures.length - 1].decision === 'Accept' && (
                              <button
                                type="button"
                                onClick={() => setShowCertificateModal(true)}
                                className="px-3.5 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold transition shadow-xs flex items-center gap-1.5 cursor-pointer"
                              >
                                <Award size={14} />
                                <span>{isTh ? 'ดูใบรับรองส่งมอบ' : 'Certificate'}</span>
                              </button>
                            )}
                          </div>
                        </div>
                      )}

                    </div>

                    {/* Acceptance History Section (Preserves previous decisions & rejection history) */}
                    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-5 sm:p-6 space-y-4">
                      <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                        <div className="flex items-center gap-2">
                          <Activity size={16} className="text-teal-600" />
                          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">
                            {isTh ? 'ประวัติการตรวจรับมอบ (Acceptance History)' : 'Acceptance History'}
                          </h4>
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                            {currentJob.signatures.length} {isTh ? 'ครั้ง' : 'records'}
                          </span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="hidden md:inline text-[11px] text-slate-400">
                            {isTh ? 'บันทึกประวัติการตัดสินใจและลายเซ็นทุกรอบ' : 'Preserves all historical rounds and decisions'}
                          </span>
                          <button
                            type="button"
                            onClick={handleExportSignatures}
                            title={isTh ? 'ส่งออกรายชื่อผู้ลงนามของ Job นี้เป็นไฟล์ CSV (ข้อความ ไม่รวมลายเซ็นมือ)' : 'Export this job\'s signer names as CSV (text only, no hand-drawn signatures)'}
                            className="group flex items-center gap-2 pl-2.5 pr-3 py-1.5 rounded-xl border border-teal-200 dark:border-teal-800 bg-teal-50 dark:bg-teal-950/40 hover:bg-teal-600 hover:border-teal-600 text-teal-800 dark:text-teal-200 hover:text-white text-[11px] font-bold transition-all shadow-2xs cursor-pointer"
                          >
                            <span className="w-6 h-6 rounded-lg bg-teal-100 dark:bg-teal-900 group-hover:bg-teal-500 flex items-center justify-center">
                              <Download size={13} />
                            </span>
                            <span className="text-left leading-tight">
                              <span className="block">{isTh ? 'Export รายชื่อผู้ลงนาม' : 'Export Sign Log'}</span>
                              <span className="block text-[9px] font-medium opacity-70">{currentJob.jobNo} · CSV</span>
                            </span>
                          </button>
                        </div>
                      </div>

                      {currentJob.signatures.length > 0 ? (
                        <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
                          <table className="w-full text-left text-xs">
                            <thead className="bg-slate-50 dark:bg-slate-800/80 text-[10px] uppercase font-bold text-slate-500 border-b border-slate-200 dark:border-slate-800">
                              <tr>
                                <th className="p-3">รอบที่ (Round)</th>
                                <th className="p-3">ผลตรวจรับ (Decision)</th>
                                <th className="p-3">ผู้ลงนาม (Signer)</th>
                                <th className="p-3">บทบาท (Role)</th>
                                <th className="p-3">วัน-เวลา (Timestamp)</th>
                                <th className="p-3">สาเหตุ/หมายเหตุ (Reason / Remarks)</th>
                                <th className="p-3 text-center">รูปถ่าย (Photo)</th>
                                <th className="p-3 text-center">ลายเซ็น (Signature)</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 bg-white dark:bg-slate-900">
                              {currentJob.signatures.map((sig, idx) => (
                                <tr key={sig.id || idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                                  <td className="p-3 font-mono font-bold text-slate-600 dark:text-slate-400">
                                    Round #{idx + 1}
                                  </td>
                                  <td className="p-3">
                                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                                      sig.decision === 'Accept'
                                        ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                                        : 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                                    }`}>
                                      {sig.decision}
                                    </span>
                                  </td>
                                  <td className="p-3 font-semibold text-slate-800 dark:text-slate-200">{sig.name}</td>
                                  <td className="p-3 text-slate-600 dark:text-slate-400">{sig.role}</td>
                                  <td className="p-3 font-mono text-[11px] text-slate-500">{sig.signedAt}</td>
                                  <td className="p-3 max-w-xs text-slate-600 dark:text-slate-400">
                                    {sig.rejectionReason && (
                                      <div className="text-rose-600 dark:text-rose-400 font-semibold mb-0.5">
                                        Reject Reason: {sig.rejectionReason}
                                      </div>
                                    )}
                                    {sig.comment && (
                                      <div className="text-slate-500 italic">
                                        Remarks: {sig.comment}
                                      </div>
                                    )}
                                    {!sig.rejectionReason && !sig.comment && '-'}
                                  </td>
                                  <td className="p-3 text-center">
                                    {sig.photoUrl ? (
                                      <a
                                        href={sig.photoUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        title={isTh ? 'คลิกดูภาพขยาย' : 'Click to view photo'}
                                        className="inline-block"
                                      >
                                        <img data-zoom="true"
                                          src={sig.photoUrl}
                                          alt="Site Evidence"
                                          className="h-9 w-12 object-cover rounded-md border border-slate-200 hover:scale-110 transition-transform"
                                        />
                                      </a>
                                    ) : (
                                      <span className="text-[10px] text-slate-400 italic">-</span>
                                    )}
                                  </td>
                                  <td className="p-3 text-center">
                                    {sig.signatureDataUrl ? (
                                      <img data-zoom="true"
                                        src={sig.signatureDataUrl}
                                        alt="Signature"
                                        className="h-8 object-contain mx-auto filter dark:invert"
                                      />
                                    ) : (
                                      <span className="text-[10px] text-slate-400 italic">E-Signature</span>
                                    )}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      ) : (
                        <div className="text-center py-6 text-xs text-slate-400 italic">
                          {isTh ? 'ยังไม่มีประวัติการตรวจรับมอบสำหรับงานนี้' : 'No acceptance history recorded for this job yet.'}
                        </div>
                      )}
                    </div>

                  </div>
                )}

                {/* ================= TAB 2: PUNCH LIST (TAM REQUIREMENTS) ================= */}
                {turnoverSubTab === 'punchlist' && (
                  <div className="p-5 sm:p-7 space-y-6">

                    {/* Punch List Header & Add Item Action */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800 gap-3">
                      <div>
                        <h4 className="text-sm font-black text-slate-900 dark:text-slate-100 flex items-center gap-2">
                          <AlertTriangle size={17} className="text-amber-500" />
                          <span>{isTh ? 'รายการข้อบกพร่องและงานแก้ไข (Punch & Butt List)' : 'Job Punch & Butt List'}</span>
                          <span className="text-xs font-mono font-bold text-slate-400">
                            ({currentJob.punchList.length} รายการสำหรับ {currentJob.jobNo || currentJob.id})
                          </span>
                        </h4>
                        <p className="text-xs text-slate-500 mt-0.5">
                          {isTh
                            ? 'กระบวนการ TAM: ผู้รับเหมาแจ้งปิดงาน (Contractor Close) และ Job Lead ตรวจสอบยืนยัน (Job Lead Verify)'
                            : 'TAM Workflow: Contractor closes remedial works, then Job Lead verifies.'}
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={() => setTurnoverSubTab('sign')}
                        title={isTh ? 'รายการ Punch สร้างจากการเลือก "ไม่ยอมรับ" ในแท็บการลงนามเท่านั้น' : 'Punch items are created only by choosing "Not Accept" in the Sign tab'}
                        className="px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold transition shadow-xs flex items-center gap-1.5 cursor-pointer self-start sm:self-auto"
                      >
                        <ArrowRight size={14} />
                        <span>{isTh ? 'ไปที่การลงนาม (Sign Acceptance)' : 'Go to Sign Acceptance'}</span>
                      </button>
                    </div>

                    {/* TAM Critical Rule Guidance Banner */}
                    <div className="p-4 rounded-xl bg-blue-50/70 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900/50 flex items-start gap-3 text-xs text-blue-900 dark:text-blue-200">
                      <CheckCircle2 size={16} className="text-blue-600 shrink-0 mt-0.5" />
                      <div>
                        <strong className="block font-bold mb-0.5">
                          {isTh ? '📌 กฎระเบียบด้าน Workflow ตามข้อกำหนด TAM:' : '📌 TAM Workflow Integrity Rule:'}
                        </strong>
                        <p className="leading-relaxed">
                          {isTh
                            ? 'เมื่อรายการ Punch/Butt ได้รับการแก้ไขและ Job Lead ตรวจสอบผ่านแล้ว ระบบจะไม่เปลี่ยนสถานะ Not Accepted เป็น Accepted โดยอัตโนมัติ สถานะจะเปลี่ยนเป็น "Pending Re-Accept" เพื่อให้ผู้มีอำนาจกลับไปที่แท็บ "การลงนาม (Sign)" ดำเนินการตรวจรับซ้ำและลงนามรับรองความพร้อมใหม่'
                            : 'When punch items are resolved and verified, status is set to "Pending Re-Accept" (never auto-accepted). The authorized user must return to Tab 1 (Sign) to re-evaluate and sign.'}
                        </p>
                      </div>
                    </div>

                    {/* Punch / Butt List Table */}
                    <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xs">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-slate-50 dark:bg-slate-800/80 text-[10px] uppercase font-bold text-slate-500 tracking-wider border-b border-slate-200 dark:border-slate-800">
                          <tr>
                            <th className="p-3">Punch/Butt ID</th>
                            <th className="p-3">ประเภท</th>
                            <th className="p-3">ความเสี่ยง (Cat)</th>
                            <th className="p-3">รายละเอียดงานแก้ไข (Remedial Works)</th>
                            <th className="p-3">Discipline</th>
                            <th className="p-3">Contractor</th>
                            <th className="p-3">กำหนดเสร็จ</th>
                            <th className="p-3">สถานะ (TAM)</th>
                            <th className="p-3">การปิดงาน (Contractor)</th>
                            <th className="p-3">การตรวจสอบ (Job Lead)</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800 bg-white dark:bg-slate-900">
                          {currentJob.punchList.length > 0 ? (
                            currentJob.punchList.map((item) => {
                              const isClosedByContractor = item.isContractorClosed || !!item.closedBy;
                              const isVerifiedByLead = item.isVerified || !!item.verifiedBy;

                              return (
                                <tr key={item.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                                  {/* Punch / Butt ID */}
                                  <td className="p-3 font-mono font-bold text-slate-800 dark:text-slate-200">
                                    {item.id}
                                  </td>

                                  {/* Item Type: Punch or Butt */}
                                  <td className="p-3">
                                    <span className={`px-2 py-0.5 rounded text-[10px] font-black ${
                                      item.itemType === 'Butt'
                                        ? 'bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300 border border-purple-200'
                                        : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border border-amber-200'
                                    }`}>
                                      {item.itemType || 'Punch'}
                                    </span>
                                  </td>

                                  {/* Category A / B / C / S */}
                                  <td className="p-3 font-bold">
                                    <span className={`px-2 py-0.5 rounded text-[10px] font-black ${
                                      item.category === 'A'
                                        ? 'bg-rose-100 text-rose-800 border border-rose-200'
                                        : item.category === 'B'
                                        ? 'bg-amber-100 text-amber-800 border border-amber-200'
                                        : item.category === 'S'
                                        ? 'bg-red-100 text-red-800 border border-red-200'
                                        : 'bg-blue-100 text-blue-800 border border-blue-200'
                                    }`}>
                                      Cat {item.category || item.punchCategory || 'A'}
                                    </span>
                                  </td>

                                  {/* Remedial Works */}
                                  <td className="p-3 text-slate-800 dark:text-slate-200 font-medium max-w-xs">
                                    {item.remedialWorks || item.description}
                                  </td>

                                  {/* Discipline */}
                                  <td className="p-3 text-slate-600 dark:text-slate-300 font-medium">
                                    {item.discipline || 'M - Mechanical'}
                                  </td>

                                  {/* Contractor */}
                                  <td className="p-3 text-slate-600 dark:text-slate-300">
                                    {item.contractor || 'BCP Maintenance Team'}
                                  </td>

                                  {/* Planned Date */}
                                  <td className="p-3 font-mono text-[11px] text-slate-500">
                                    {item.plannedDate || item.timestamp?.slice(0, 10) || '-'}
                                  </td>

                                  {/* Punch Status */}
                                  <td className="p-3">
                                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                      item.punchStatus === 'Closed' || item.status === 'Resolved' || item.status === 'Closed'
                                        ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                                        : item.punchStatus === 'Cancel'
                                        ? 'bg-slate-200 text-slate-600'
                                        : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                                    }`}>
                                      {item.punchStatus || (item.status === 'Resolved' ? 'Closed' : 'In Progress')}
                                    </span>
                                  </td>

                                  {/* Contractor Close Action */}
                                  <td className="p-3">
                                    {isClosedByContractor ? (
                                      <div className="space-y-0.5">
                                        <div className="flex items-center gap-1 text-[11px] font-bold text-emerald-700 dark:text-emerald-400">
                                          <Check size={12} className="stroke-[3]" />
                                          <span>ปิดงานแล้ว</span>
                                        </div>
                                        <div className="text-[10px] text-slate-500">
                                          {item.closedBy || 'Contractor'}
                                        </div>
                                        {item.closedDate && (
                                          <div className="text-[9px] font-mono text-slate-400">
                                            {item.closedDate}
                                          </div>
                                        )}
                                      </div>
                                    ) : (
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setContractorClosingItem(item);
                                          setContractorCloseDate(new Date().toISOString().slice(0, 10));
                                        }}
                                        className="px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-emerald-100 hover:text-emerald-800 text-slate-700 dark:bg-slate-800 dark:text-slate-300 text-[11px] font-bold transition cursor-pointer"
                                      >
                                        แจ้งปิดงาน
                                      </button>
                                    )}
                                  </td>

                                  {/* Job Lead Verify Action */}
                                  <td className="p-3">
                                    {isVerifiedByLead ? (
                                      <div className="space-y-0.5">
                                        <div className="flex items-center gap-1 text-[11px] font-bold text-indigo-700 dark:text-indigo-400">
                                          <CheckCircle2 size={12} />
                                          <span>Verified</span>
                                        </div>
                                        <div className="text-[10px] text-slate-500">
                                          {item.verifiedBy || 'Job Lead'}
                                        </div>
                                        {item.verificationTimestamp && (
                                          <div className="text-[9px] font-mono text-slate-400">
                                            {item.verificationTimestamp}
                                          </div>
                                        )}
                                      </div>
                                    ) : isClosedByContractor ? (
                                      <button
                                        type="button"
                                        onClick={() => setJobLeadVerifyingItem(item)}
                                        className="px-2.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-[11px] font-bold transition shadow-xs cursor-pointer animate-pulse"
                                      >
                                        ตรวจสอบผ่าน
                                      </button>
                                    ) : (
                                      <span className="text-[10px] text-slate-400 italic">
                                        รอช่างปิดงาน
                                      </span>
                                    )}
                                  </td>
                                </tr>
                              );
                            })
                          ) : (
                            <tr>
                              <td colSpan={10} className="p-6 text-center text-xs text-slate-400 italic">
                                {isTh ? 'ไม่มีรายการข้อบกพร่องสำหรับ Job นี้ ระบบผ่านเกณฑ์ความพร้อม' : 'No punch/butt items logged for this job.'}
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>

                  </div>
                )}

            </div>
          )}

          {/* ================= MODAL: ADD PUNCH / BUTT ITEM (TAB 2) ================= */}
          {isAddPunchModalOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
              <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-lg w-full border border-slate-200 dark:border-slate-800 shadow-2xl p-6 space-y-5">
                <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                  <h3 className="text-sm font-black text-slate-900 dark:text-slate-100 flex items-center gap-2">
                    <AlertTriangle size={17} className="text-amber-500" />
                    <span>{isTh ? 'บันทึกรายการ Punch / Butt เพิ่มเติม' : 'Log New Punch / Butt Item'}</span>
                  </h3>
                  <button
                    type="button"
                    onClick={() => setIsAddPunchModalOpen(false)}
                    className="p-1 rounded-lg text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    <X size={16} />
                  </button>
                </div>

                <form onSubmit={handleAddNewPunchItemTab2} className="space-y-4 text-xs">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    <div className="space-y-1">
                      <label className="font-bold text-slate-700 dark:text-slate-300">
                        ประเภทรายการ (Punch or Butt List) *
                      </label>
                      <select
                        value={newPunchItemType}
                        onChange={e => setNewPunchItemType(e.target.value as 'Punch' | 'Butt')}
                        className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-bold outline-none cursor-pointer"
                      >
                        <option value="Punch">Punch List (ข้อบกพร่อง)</option>
                        <option value="Butt">Butt List (งานค้างส่งมอบ)</option>
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="font-bold text-slate-700 dark:text-slate-300">
                        หมวดหมู่ (Punch Category) *
                      </label>
                      <select
                        value={newPunchCategory}
                        onChange={e => setNewPunchCategory(e.target.value as PunchCategory)}
                        className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-bold outline-none cursor-pointer"
                      >
                        <option value="A">Category A</option>
                        <option value="B">Category B</option>
                        <option value="C">Category C</option>
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="font-bold text-slate-700 dark:text-slate-300">
                        สาขา (Discipline) *
                      </label>
                      <select
                        value={newPunchDiscipline}
                        onChange={e => setNewPunchDiscipline(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 outline-none cursor-pointer"
                      >
                        {TAM_DISCIPLINE_OPTIONS.map(d => (
                          <option key={d} value={d}>{d}</option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="font-bold text-slate-700 dark:text-slate-300">
                        ผู้รับเหมา (Contractor) *
                      </label>
                      <select
                        value={newPunchContractor}
                        onChange={e => setNewPunchContractor(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 outline-none cursor-pointer"
                      >
                        {TAM_CONTRACTOR_OPTIONS.map(c => (
                          <option key={c} value={c}>{c}</option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-1 sm:col-span-2">
                      <label className="font-bold text-slate-700 dark:text-slate-300">
                        กำหนดวันที่ต้องแก้ไข (Planned Date) *
                      </label>
                      <input
                        type="date"
                        required
                        value={newPunchPlannedDate}
                        onChange={e => setNewPunchPlannedDate(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 outline-none"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="font-bold text-slate-700 dark:text-slate-300">
                      รายละเอียดงานแก้ไข (Remedial Works) *
                    </label>
                    <textarea
                      rows={3}
                      required
                      value={newPunchRemedialWorks}
                      onChange={e => setNewPunchRemedialWorks(e.target.value)}
                      placeholder="ระบุข้อบกพร่องและงานแก้ไข เช่น ตรวจพบประเก็นชำรุด ต้องถอดเปลี่ยนประเก็นใหม่และขันกวดตาม Torque spec..."
                      className="w-full p-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 outline-none focus:ring-2 focus:ring-blue-500/20"
                    />
                  </div>

                  <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 text-[11px] text-slate-500 flex items-center justify-between">
                    <span>Related Job ID: <strong className="font-mono text-slate-800 dark:text-slate-200">{currentJob.jobNo || currentJob.id}</strong></span>
                    <span>Status: <strong className="text-amber-600 font-bold">In Progress</strong></span>
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setIsAddPunchModalOpen(false)}
                      className="px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-400 font-bold hover:bg-slate-100 cursor-pointer"
                    >
                      ยกเลิก
                    </button>
                    <button
                      type="submit"
                      className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold transition shadow-xs cursor-pointer"
                    >
                      บันทึกรายการ
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* ================= MODAL: CONTRACTOR CLOSE PUNCH ================= */}
          {contractorClosingItem && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
              <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-lg w-full max-h-[90vh] overflow-y-auto border border-slate-200 dark:border-slate-800 shadow-2xl p-6 space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                  <h3 className="text-sm font-black text-slate-900 dark:text-slate-100 flex items-center gap-2">
                    <CheckCircle2 size={17} className="text-emerald-600" />
                    <span>{isTh ? 'ผู้รับเหมาแจ้งปิดงาน (Contractor Close)' : 'Contractor Close Action'}</span>
                  </h3>
                  <button
                    type="button"
                    onClick={() => setContractorClosingItem(null)}
                    className="p-1 rounded-lg text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    <X size={16} />
                  </button>
                </div>

                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 text-xs space-y-1">
                  <div>รายการ: <strong className="font-mono">{contractorClosingItem.id}</strong></div>
                  <div className="line-clamp-2 text-slate-600 dark:text-slate-300">{contractorClosingItem.remedialWorks || contractorClosingItem.description}</div>
                </div>

                <div className="space-y-3 text-xs">
                  <div className="space-y-1">
                    <label className="font-bold text-slate-700 dark:text-slate-300">
                      ชื่อผู้รับเหมาผู้ลงนามปิดงาน (Closed By) *
                    </label>
                    <input
                      type="text"
                      value={contractorCloseName}
                      onChange={e => setContractorCloseName(e.target.value)}
                      placeholder="ชื่อผู้รับเหมา..."
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-bold outline-none"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="font-bold text-slate-700 dark:text-slate-300">
                      วันที่ปิดงาน (Closed Date) *
                    </label>
                    <input
                      type="date"
                      value={contractorCloseDate}
                      onChange={e => setContractorCloseDate(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-semibold outline-none"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                      <Camera size={14} className="text-teal-600" />
                      {isTh ? 'แนบรูปถ่ายหลักฐานการปิดงาน (Close-out Photo)' : 'Close-out Photo (Camera / Upload)'}
                    </label>
                    <input
                      ref={closePhotoInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleClosePhotoCapture}
                      className="hidden"
                    />
                    {!closePhotoUrl ? (
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            closePhotoInputRef.current?.setAttribute('capture', 'environment');
                            closePhotoInputRef.current?.click();
                          }}
                          className="p-3 rounded-xl border-2 border-dashed border-teal-300 bg-teal-50/50 dark:bg-teal-950/30 hover:border-teal-500 flex items-center gap-2 cursor-pointer font-bold text-teal-800 dark:text-teal-200"
                        >
                          <Camera size={16} /> {isTh ? 'ถ่ายรูป' : 'Take Photo'}
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            closePhotoInputRef.current?.removeAttribute('capture');
                            closePhotoInputRef.current?.click();
                          }}
                          className="p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/40 hover:bg-slate-100 flex items-center gap-2 cursor-pointer font-bold text-slate-700 dark:text-slate-200"
                        >
                          <UploadCloud size={16} /> {isTh ? 'อัปโหลดรูป' : 'Upload'}
                        </button>
                      </div>
                    ) : (
                      <div className="p-3 rounded-xl bg-teal-50/70 dark:bg-teal-950/30 border border-teal-200 dark:border-teal-900/60 flex items-center gap-3">
                        <img data-zoom="true" src={closePhotoUrl} alt="Close-out evidence" className="w-20 h-16 object-cover rounded-lg border border-teal-300" />
                        <div className="flex-1 font-bold text-teal-900 dark:text-teal-200">{isTh ? 'แนบรูปเรียบร้อยแล้ว' : 'Photo attached'}</div>
                        <button
                          type="button"
                          onClick={() => setClosePhotoUrl(null)}
                          className="px-2.5 py-1 rounded bg-rose-50 hover:bg-rose-100 text-rose-700 text-[10px] font-bold cursor-pointer"
                        >
                          {isTh ? 'ลบรูป' : 'Remove'}
                        </button>
                      </div>
                    )}
                  </div>

                  <div className="space-y-2">
                    <label className="font-bold text-slate-700 dark:text-slate-300">
                      {isTh ? 'ลายเซ็นดิจิทัลผู้ปิดงาน (Digital Signature) * — กดยืนยันลายเซ็นเพื่อแจ้งปิดงาน' : 'Digital Signature * — apply to submit the close-out'}
                    </label>
                    <div className="p-3 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                      <DigitalSignaturePad
                        signerName={contractorCloseName}
                        onSignerNameChange={setContractorCloseName}
                        onSaveSignature={(sig) => handleContractorClosePunch(contractorClosingItem, contractorCloseName, contractorCloseDate, sig)}
                      />
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => { setContractorClosingItem(null); setClosePhotoUrl(null); }}
                    className="px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-400 font-bold hover:bg-slate-100 cursor-pointer"
                  >
                    ยกเลิก
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ================= MODAL: JOB LEAD VERIFY PUNCH ================= */}
          {jobLeadVerifyingItem && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
              <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-lg w-full max-h-[90vh] overflow-y-auto border border-slate-200 dark:border-slate-800 shadow-2xl p-6 space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                  <h3 className="text-sm font-black text-slate-900 dark:text-slate-100 flex items-center gap-2">
                    <CheckCircle2 size={17} className="text-indigo-600" />
                    <span>{isTh ? 'Job Lead ตรวจสอบและรับรอง (Verify & Close)' : 'Job Lead Verification'}</span>
                  </h3>
                  <button
                    type="button"
                    onClick={() => setJobLeadVerifyingItem(null)}
                    className="p-1 rounded-lg text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    <X size={16} />
                  </button>
                </div>

                {(() => {
                  const it = jobLeadVerifyingItem;
                  const originSig = currentJob.signatures.find(s => s.relatedAcceptanceId && s.relatedAcceptanceId === it.relatedAcceptanceId)
                    || [...currentJob.signatures].reverse().find(s => s.decision === 'Not Accept');
                  const defectPhoto = originSig?.photoUrl;
                  return (
                    <div className="space-y-3 text-xs">
                      <div className="flex items-center justify-between">
                        <span>{isTh ? 'รายการ' : 'Item'}: <strong className="font-mono">{it.id}</strong></span>
                        <span className="px-2 py-0.5 rounded bg-rose-100 text-rose-700 font-bold">Cat {it.punchCategory || it.category}</span>
                      </div>

                      {/* Original issue */}
                      <div className="p-3 rounded-xl bg-rose-50/70 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/60 space-y-2">
                        <div className="font-black text-rose-800 dark:text-rose-300">{isTh ? 'ปัญหาที่พบก่อนหน้านี้' : 'Original issue'}</div>
                        {originSig?.rejectionReason && (
                          <div><span className="text-slate-500">{isTh ? 'เหตุผลที่ไม่ยอมรับ: ' : 'Rejection reason: '}</span><strong>{originSig.rejectionReason}</strong></div>
                        )}
                        <div><span className="text-slate-500">{isTh ? 'งานแก้ไข: ' : 'Remedial works: '}</span>{it.remedialWorks || it.description}</div>
                        <div className="text-slate-500">{isTh ? 'แจ้งโดย' : 'Reported by'} {it.reportedBy} · {it.timestamp}</div>
                        {defectPhoto ? (
                          <a href={defectPhoto} target="_blank" rel="noreferrer">
                            <img data-zoom="true" src={defectPhoto} alt="Defect evidence" className="w-full max-h-40 object-cover rounded-lg border border-rose-200" />
                          </a>
                        ) : (
                          <div className="text-slate-400 italic">{isTh ? 'ไม่มีรูปข้อบกพร่องแนบไว้' : 'No defect photo attached'}</div>
                        )}
                      </div>

                      {/* Contractor close-out */}
                      <div className="p-3 rounded-xl bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/60 space-y-2">
                        <div className="font-black text-emerald-800 dark:text-emerald-300">{isTh ? 'การแจ้งปิดงานของผู้รับเหมา' : 'Contractor close-out'}</div>
                        <div>{isTh ? 'ผู้ปิดงาน' : 'Closed by'}: <strong>{it.closedBy || 'Contractor'}</strong> · {isTh ? 'วันที่' : 'on'} {it.closedDate || '-'}</div>
                        {it.resolutionPhotoUrl ? (
                          <a href={it.resolutionPhotoUrl} target="_blank" rel="noreferrer">
                            <img data-zoom="true" src={it.resolutionPhotoUrl} alt="Close-out evidence" className="w-full max-h-40 object-cover rounded-lg border border-emerald-200" />
                          </a>
                        ) : (
                          <div className="text-slate-400 italic">{isTh ? 'ไม่มีรูปหลักฐานการปิดงาน' : 'No close-out photo attached'}</div>
                        )}
                        {it.closedSignatureDataUrl && (
                          <div>
                            <div className="text-slate-500 mb-1">{isTh ? 'ลายเซ็นผู้ปิดงาน' : 'Closer signature'}</div>
                            <img data-zoom="true" src={it.closedSignatureDataUrl} alt="Closer signature" className="h-14 bg-white rounded border border-slate-200 p-1" />
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })()}

                <div className="space-y-1 text-xs">
                  <label className="font-bold text-slate-700 dark:text-slate-300">
                    ชื่อ Job Lead ผู้ตรวจสอบยืนยัน (Verified By) *
                  </label>
                  <input
                    type="text"
                    value={jobLeadVerifyName}
                    onChange={e => setJobLeadVerifyName(e.target.value)}
                    placeholder="ชื่อ Job Lead..."
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-bold outline-none"
                  />
                  <p className="text-[10px] text-slate-400 pt-1">
                    เมื่อตรวจสอบผ่าน รายการนี้จะเปลี่ยนสถานะเป็น Closed โดยสมบูรณ์
                  </p>
                </div>

                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setJobLeadVerifyingItem(null)}
                    className="px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-400 font-bold hover:bg-slate-100 cursor-pointer"
                  >
                    ยกเลิก
                  </button>
                  <button
                    type="button"
                    onClick={() => handleJobLeadVerifyPunch(jobLeadVerifyingItem, jobLeadVerifyName)}
                    className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold transition shadow-xs cursor-pointer"
                  >
                    อนุมัติผ่าน (Verify & Close)
                  </button>
                </div>
              </div>
            </div>
          )}

        </div>
      )}

      {/* =========================================================================
          VIEW 4: TURNOVER (T/O) EXECUTIVE DASHBOARD VIEW
         ========================================================================= */}
      {activeMainView === 'dashboard' && (
        <div className="space-y-6 animate-in fade-in duration-200">

          {/* Executive Header Command Banner */}
          <div className="bg-white dark:bg-slate-900 p-5 sm:p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2 flex-wrap text-xs text-slate-500 dark:text-slate-400">
                <span className="font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider text-[11px] flex items-center gap-1 font-mono">
                  <Activity size={14} className="text-emerald-500" />
                  <span>{isTh ? 'ศูนย์ติดตามสถานะงาน Turnaround' : 'Turnaround Steering Telemetry'}</span>
                </span>
                <span aria-hidden="true">·</span>
                <span>{isTh ? `อีเวนต์: ${eventName}` : `Active Event: ${eventName}`}</span>
                <span aria-hidden="true">·</span>
                <span>{isTh ? `กำหนดเริ่มเดินเครื่อง: ${eventTargetDate}` : `Target Startup: ${eventTargetDate}`}</span>
                <span aria-hidden="true">·</span>
                <span className="text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  {isTh ? 'เชื่อมต่อสด' : 'Live Sync'}
                </span>
              </div>
              <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-slate-100 tracking-tight flex items-center gap-2.5">
                <BarChart3 className="text-indigo-600 dark:text-indigo-400" size={26} />
                <span>{isTh ? 'Step 8: T/O Dashboard (แดชบอร์ดส่งมอบงานระบบ)' : 'Step 8: T/O Dashboard'}</span>
              </h2>
              <p className="text-xs text-slate-600 dark:text-slate-400 max-w-3xl">
                {isTh
                  ? 'ระบบติดตามความพร้อมส่งมอบระบบ (Turnover): แสดงจำนวนงานทั้งหมด, งานที่เสร็จ/ยังไม่เสร็จ, สถานะการ Sign, จำนวน Punch List (A/B/C) และรองรับการออกเอกสาร T/O Report / Handover Certificate'
                  : 'Turnover telemetry & handover governance: Total packages, completed vs in-progress, digital signatures compliance, Category A/B/C punch lists, and T/O certificate generation.'}
              </p>
            </div>

            {/* Executive Action Controls */}
            <div className="flex items-center gap-2 flex-wrap shrink-0">
              <button
                type="button"
                onClick={handleRefreshDashboard}
                disabled={isRefreshingDashboard}
                className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors cursor-pointer shadow-2xs"
                title={isTh ? "รีเฟรชข้อมูล" : "Refresh Metrics"}
              >
                <RefreshCw size={14} className={isRefreshingDashboard ? 'animate-spin text-indigo-500' : ''} />
              </button>

              <button
                type="button"
                onClick={() => window.print()}
                className="px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
                title={isTh ? "พิมพ์รายงานสรุป" : "Print Executive Summary"}
              >
                <Printer size={14} />
                <span className="hidden sm:inline">{isTh ? 'พิมพ์รายงาน' : 'Print Summary'}</span>
              </button>

              <button
                type="button"
                onClick={handleExportCsv}
                className="px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
              >
                <Download size={14} />
                <span>{isTh ? 'ส่งออก CSV' : 'Export CSV Report'}</span>
              </button>

              <button
                type="button"
                onClick={() => setShowCertificateModal(true)}
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-md shadow-emerald-600/30 transition-all cursor-pointer active:scale-95"
              >
                <Award size={15} />
                <span>{isTh ? 'ออกใบรับรองส่งมอบ (T/O)' : 'Generate T/O Report / Certificate'}</span>
              </button>

              <button
                type="button"
                onClick={() => setShowExecutiveBriefingModal(true)}
                className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm shadow-indigo-600/30 transition-all cursor-pointer active:scale-95"
              >
                <FileCheck size={14} />
                <span>{isTh ? 'สรุปข้อมูลผู้บริหาร' : 'Executive Briefing'}</span>
              </button>
            </div>
          </div>

          {/* Executive Sub-View Navigation Switcher */}
          <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-3 flex-wrap">
            <button
              type="button"
              onClick={() => setExecutiveSubTab('overview')}
              className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${executiveSubTab === 'overview'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/25 ring-2 ring-indigo-500/30'
                : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-750 border border-slate-200 dark:border-slate-700'
                }`}
            >
              <TrendingUp size={15} />
              <span>{isTh ? 'ภาพรวมการส่งมอบระบบ' : 'Turnover Overview'}</span>
            </button>

            <button
              type="button"
              onClick={() => setExecutiveSubTab('critical-path')}
              className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${executiveSubTab === 'critical-path'
                ? 'bg-amber-600 text-white shadow-md shadow-amber-600/25 ring-2 ring-amber-500/30'
                : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-750 border border-slate-200 dark:border-slate-700'
                }`}
            >
              <AlertOctagon size={15} className={executiveSubTab === 'critical-path' ? 'text-white' : 'text-amber-500'} />
              <span>{isTh ? 'เส้นทางวิกฤต & Punch List' : 'Critical Path & Punch List'}</span>
              {openCatAPunches.length > 0 ? (
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-black animate-pulse ${executiveSubTab === 'critical-path' ? 'bg-white text-rose-700' : 'bg-rose-500 text-white'
                  }`}>
                  {openCatAPunches.length} Cat A
                </span>
              ) : (
                <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-400">
                  Clean
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => setExecutiveSubTab('unit-funnel')}
              className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${executiveSubTab === 'unit-funnel'
                ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/25 ring-2 ring-emerald-500/30'
                : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-750 border border-slate-200 dark:border-slate-700'
                }`}
            >
              <Building2 size={15} />
              <span>{isTh ? 'ความพร้อมแยกตามหน่วยผลิต' : 'Unit Readiness Funnel'}</span>
            </button>
          </div>

          {/* ===============================================================
              SUB-TAB 1: EX01 TURNOVER OVERVIEW DASHBOARD
             =============================================================== */}
          {executiveSubTab === 'overview' && (
            <div className="space-y-6">

              {/* Step 9: Complete T/O Criterion Highlight Banner */}
              <div className="p-4 rounded-2xl bg-gradient-to-r from-emerald-50 via-teal-50 to-blue-50 dark:from-emerald-950/40 dark:via-teal-950/30 dark:to-blue-950/40 border border-emerald-200 dark:border-emerald-800/80 flex flex-col md:flex-row md:items-center justify-between gap-4 text-xs shadow-2xs">
                <div className="flex items-start gap-3">
                  <div className="p-2.5 rounded-xl bg-emerald-600 text-white shrink-0 mt-0.5 shadow-sm">
                    <ShieldCheck size={20} />
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-600 text-white font-mono">
                        Step 9: Complete T/O Rule
                      </span>
                      <span className="font-bold text-slate-800 dark:text-slate-200">
                        {isTh ? 'เกณฑ์การเปลี่ยนสถานะเป็น Completed' : 'Handover Completion Criteria'}
                      </span>
                    </div>
                    <p className="text-slate-600 dark:text-slate-300 leading-relaxed text-[11px]">
                      {isTh ? (
                        <>
                          Job จะเปลี่ยนเป็นสถานะ <strong className="text-emerald-600 dark:text-emerald-400 font-bold">Completed</strong> เมื่อ:
                          (1) <span className="underline font-semibold">Sign ครบตามที่กำหนด</span> (การตรวจรับรองดิจิทัลผ่านเกณฑ์) และ
                          (2) <span className="underline font-semibold">Punch List ดำเนินการครบทั้งหมด</span> (ไม่มีข้อค้างเปิด).
                          <span className="text-amber-700 dark:text-amber-400 font-medium ml-1">
                            *หากอย่างใดอย่างหนึ่งยังไม่ครบ ให้สถานะ T/O เป็น <strong className="font-bold">In Progress</strong>
                          </span>
                        </>
                      ) : (
                        <>
                          A Job shifts to <strong className="text-emerald-600 dark:text-emerald-400 font-bold">Completed</strong> only when:
                          (1) Required digital signatures are collected, and
                          (2) All Punch List items are completely resolved.
                          <span className="text-amber-700 dark:text-amber-400 font-medium ml-1">
                            *If either is incomplete, the T/O status remains <strong className="font-bold">In Progress</strong>.
                          </span>
                        </>
                      )}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  <div className="text-right font-mono">
                    <div className="text-[10px] text-slate-500 font-semibold">{isTh ? 'ความพร้อมสมบูรณ์' : 'Completion Rate'}</div>
                    <div className="text-base font-black text-emerald-600 dark:text-emerald-400">
                      {completedJobsCount} / {totalJobsCount} ({readinessPercentage}%)
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowCertificateModal(true)}
                    className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm transition-all cursor-pointer whitespace-nowrap active:scale-95"
                  >
                    <Award size={14} />
                    <span>{isTh ? 'ออกใบรับรอง T/O' : 'T/O Certificate'}</span>
                  </button>
                </div>
              </div>

              {/* Attention Items & Critical Path Alert Banner */}
              {attentionJob && (
                <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs shadow-2xs animate-in slide-in-from-top-1">
                  <div className="flex items-start gap-3">
                    <div className="p-2 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5">
                      <AlertOctagon size={18} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-amber-900 dark:text-amber-200 uppercase tracking-wider text-[10px]">
                          {isTh ? 'ต้องได้รับการดูแลเร่งด่วนในเส้นทางวิกฤต' : 'Critical Path Attention Required'}
                        </span>
                        <span aria-hidden="true" className="text-amber-400">·</span>
                        <span className="font-mono font-bold text-amber-800 dark:text-amber-300">
                          {attentionJob.assetTag || attentionJob.jobNo}
                        </span>
                        <span aria-hidden="true" className="text-amber-400">·</span>
                        <span className="text-amber-700 dark:text-amber-300">{attentionJob.unit}</span>
                      </div>
                      <p className="text-slate-700 dark:text-slate-300 mt-0.5">
                        {isTh ? (
                          <>
                            แพ็กเกจงาน <strong className="font-semibold">{attentionJob.title}</strong>{' '}
                            {attentionJob.punchList.filter(p => p.status === 'Open' && p.category === 'A').length > 0 ? (
                              <span className="text-rose-600 dark:text-rose-400 font-bold">
                                มีรายการข้อบกพร่อง Category A ที่ยังไม่ปิด {attentionJob.punchList.filter(p => p.status === 'Open' && p.category === 'A').length} รายการ
                              </span>
                            ) : (
                              'รอการลงนามดิจิทัลจากฝ่ายปฏิบัติการหรือเจ้าของงาน'
                            )}
                          </>
                        ) : (
                          <>
                            Package <strong className="font-semibold">{attentionJob.title}</strong> has{' '}
                            {attentionJob.punchList.filter(p => p.status === 'Open' && p.category === 'A').length > 0 ? (
                              <span className="text-rose-600 dark:text-rose-400 font-bold">
                                {attentionJob.punchList.filter(p => p.status === 'Open' && p.category === 'A').length} unresolved Category A punch item(s)
                              </span>
                            ) : (
                              'pending Operations or Job Owner dual digital authorization'
                            )}.
                          </>
                        )}
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setSelectedJobId(attentionJob.id);
                      setActiveMainView('workspace');
                      setWorkspaceTab('turnover');
                      setTurnoverSubTab('punchlist');
                    }}
                    className="px-3.5 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs shrink-0 flex items-center gap-1 transition-colors cursor-pointer self-start sm:self-center"
                  >
                    <span>{isTh ? 'ตรวจสอบในศูนย์งาน' : 'Investigate in Workspace'}</span>
                    <ChevronRight size={14} />
                  </button>
                </div>
              )}

              {/* 6 Executive KPI Scorecards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3.5">

                {/* 1. Overall Turnover Readiness */}
                <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono">
                      {isTh ? 'ความพร้อมการส่งมอบ' : 'Turnover Readiness'}
                    </span>
                    <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
                      {readinessPercentage}%
                    </span>
                  </div>
                  <div className="text-2xl font-black text-slate-900 dark:text-white">
                    {readinessPercentage}%
                  </div>
                  <div className="w-full bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
                    <div
                      className="bg-emerald-500 h-full rounded-full transition-all duration-500"
                      style={{ width: `${readinessPercentage}%` }}
                    />
                  </div>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400">
                    {isTh
                      ? `${completedJobsCount} จาก ${totalJobsCount} แพ็กเกจผ่านเกณฑ์ PSSR`
                      : `${completedJobsCount} of ${totalJobsCount} packages PSSR-sanctioned`}
                  </p>
                </div>

                {/* 2. Package Execution Velocity */}
                <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs space-y-2">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono">
                    {isTh ? 'ความคืบหน้ารายแพ็กเกจ' : 'Package Execution'}
                  </span>
                  <div className="text-2xl font-black text-slate-900 dark:text-white flex items-baseline gap-1.5">
                    <span>{completedJobsCount}</span>
                    <span className="text-xs font-normal text-slate-400">{isTh ? 'เสร็จ' : 'Done'}</span>
                    <span className="text-slate-300 dark:text-slate-700">/</span>
                    <span>{inProgressJobsCount}</span>
                    <span className="text-xs font-normal text-amber-500">{isTh ? 'กำลังทำ' : 'Active'}</span>
                  </div>
                  <div className="text-[11px] text-slate-600 dark:text-slate-300 flex items-center gap-1.5">
                    <TrendingUp size={13} className="text-emerald-500" />
                    <span>{isTh ? 'ความเร็วตามแผนงาน' : 'Pace on track'}</span>
                  </div>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400">
                    {isTh ? 'ครอบคลุมงานเครื่องกล 100%' : '100% mechanical coverage'}
                  </p>
                </div>

                {/* 3. Critical Path Safeguard (★) */}
                <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono flex items-center gap-1">
                      <span>{isTh ? 'เส้นทางวิกฤต' : 'Critical Path'}</span>
                      <span className="text-amber-500 font-bold">★</span>
                    </span>
                    <span className="text-[11px] font-bold text-amber-600 dark:text-amber-400">
                      {criticalReadinessPercentage}%
                    </span>
                  </div>
                  <div className="text-2xl font-black text-slate-900 dark:text-white">
                    {criticalDoneCount} <span className="text-xs font-normal text-slate-400">{isTh ? `จาก ${criticalJobs.length}` : `of ${criticalJobs.length}`}</span>
                  </div>
                  <div className="w-full bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
                    <div
                      className="bg-amber-500 h-full rounded-full transition-all duration-500"
                      style={{ width: `${criticalReadinessPercentage}%` }}
                    />
                  </div>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400">
                    {isTh ? 'วงจร Reactor, Column & Heater' : 'Reactor, Column & Heater circuits'}
                  </p>
                </div>

                {/* 4. Punch List Risk Matrix */}
                <div
                  onClick={() => setPunchDrillDownCategory('A')}
                  className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs space-y-2 cursor-pointer hover:border-indigo-400 dark:hover:border-indigo-600 transition-all group"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono group-hover:text-indigo-600 dark:group-hover:text-indigo-400">
                      {isTh ? 'ข้อบกพร่องค้างปิด' : 'Open Punch Items'}
                    </span>
                    <span className={`text-[10px] font-bold ${countCategoryA > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                      {countCategoryA > 0
                        ? (isTh ? `${countCategoryA} ค้าง Cat A` : `${countCategoryA} Cat A Blocker`)
                        : (isTh ? 'Cat A ผ่านเกณฑ์' : 'Cat A Clean')}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 pt-0.5" onClick={e => e.stopPropagation()}>
                    <button
                      type="button"
                      onClick={() => setPunchDrillDownCategory('A')}
                      className={`px-2 py-0.5 rounded text-xs font-black transition-all cursor-pointer ${countCategoryA > 0
                        ? 'bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300 hover:ring-2 hover:ring-rose-400'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-500 hover:bg-slate-200'
                        }`}
                      title="Drilldown Category A (Critical)"
                    >
                      A: {countCategoryA}
                    </button>
                    <button
                      type="button"
                      onClick={() => setPunchDrillDownCategory('B')}
                      className="px-2 py-0.5 rounded bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300 text-xs font-black hover:ring-2 hover:ring-amber-400 transition-all cursor-pointer"
                      title="Drilldown Category B (Before Oil-In)"
                    >
                      B: {countCategoryB}
                    </button>
                    <button
                      type="button"
                      onClick={() => setPunchDrillDownCategory('C')}
                      className="px-2 py-0.5 rounded bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 text-xs font-black hover:ring-2 hover:ring-blue-400 transition-all cursor-pointer"
                      title="Drilldown Category C (Not Urgent)"
                    >
                      C: {countCategoryC}
                    </button>
                  </div>
                  <div className="flex items-center justify-between text-[10px] text-slate-500 dark:text-slate-400">
                    <span>{isTh ? `${countResolvedPunches} รายการปิดเรียบร้อย` : `${countResolvedPunches} cleared & resolved`}</span>
                    <span className="text-indigo-600 dark:text-indigo-400 font-bold flex items-center">
                      {isTh ? 'ดูรายละเอียด →' : 'Drill down →'}
                    </span>
                  </div>
                </div>

                {/* 5. Dual-Sign Governance */}
                <div
                  onClick={() => setDashboardStatusFilter(prev => prev === 'FullySigned' ? 'All' : 'FullySigned')}
                  className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs space-y-2 cursor-pointer hover:border-blue-400 transition-all group"
                  title="คลิกเพื่อกรองงานที่ Sign ครบแล้ว"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono group-hover:text-blue-600 dark:group-hover:text-blue-400">
                      {isTh ? 'สถานะการ Sign' : 'Sign-Off Status'}
                    </span>
                    <span className={`text-[11px] font-bold ${fullySignedJobsCount === totalJobsCount ? 'text-emerald-600' : 'text-blue-600 dark:text-blue-400'}`}>
                      {signedPercentage}% ครบ
                    </span>
                  </div>
                  <div className="text-2xl font-black text-blue-600 dark:text-blue-400 flex items-baseline gap-1.5">
                    <span>{fullySignedJobsCount}</span>
                    <span className="text-xs font-normal text-slate-400">{isTh ? 'Sign ครบ' : 'Signed'}</span>
                    <span className="text-slate-300 dark:text-slate-700">/</span>
                    <span>{pendingSignedJobsCount}</span>
                    <span className="text-xs font-normal text-amber-500">{isTh ? 'รอ Sign' : 'Pending'}</span>
                  </div>
                  <div className="w-full bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
                    <div
                      className="bg-blue-500 h-full rounded-full transition-all duration-500"
                      style={{ width: `${signedPercentage}%` }}
                    />
                  </div>
                  <div className="text-[10px] text-slate-500 dark:text-slate-400 flex items-center justify-between pt-0.5">
                    <span>{isTh ? `ฝ่ายผลิต: ${opsSignsCount}` : `Ops: ${opsSignsCount}`} • {isTh ? `เจ้าของงาน: ${ownerSignsCount}` : `Owner: ${ownerSignsCount}`}</span>
                    <span className="text-blue-600 dark:text-blue-400 font-bold">{totalSignsAcrossJobs} ลายเซ็น</span>
                  </div>
                </div>

                {/* 6. Plant Site Allocation */}
                <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs space-y-2">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono">
                    {isTh ? 'สัดส่วนแยกตามโรงกลั่น' : 'Cross-Site Split'}
                  </span>
                  <div className="text-xl font-black text-slate-900 dark:text-white flex items-baseline justify-between">
                    <span>{isTh ? 'พระโขนง:' : 'PK:'} {phraKhanongCount}</span>
                    <span className="text-slate-300 dark:text-slate-700">·</span>
                    <span>{isTh ? 'ศรีราชา:' : 'SR:'} {srirachaCount}</span>
                  </div>
                  <div className="flex h-1.5 rounded-full overflow-hidden bg-slate-100 dark:bg-slate-800">
                    <div
                      className="bg-emerald-500"
                      style={{ width: `${(phraKhanongCount / (totalJobsCount || 1)) * 100}%` }}
                      title="Phra Khanong"
                    />
                    <div
                      className="bg-blue-500"
                      style={{ width: `${(srirachaCount / (totalJobsCount || 1)) * 100}%` }}
                      title="Sriracha"
                    />
                  </div>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400">
                    {isTh ? 'โรงกลั่นพระโขนง & ศรีราชา' : 'Phra Khanong & Sriracha plants'}
                  </p>
                </div>

              </div>

              {/* Analytical Visualizations (2 Columns) */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

                {/* Left Column: 4-Stage Turnover Pipeline Funnel */}
                <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                        <Workflow className="text-emerald-600 dark:text-emerald-400" size={16} />
                        <span>4-Stage Turnover Stage-Gate Pipeline</span>
                      </h3>
                      <p className="text-[11px] text-slate-500">
                        Sequential mechanical verification funnel leading to PSSR operational startup.
                      </p>
                    </div>
                    {dashboardStageFilter !== null && (
                      <button
                        type="button"
                        onClick={() => setDashboardStageFilter(null)}
                        className="text-[11px] text-indigo-600 dark:text-indigo-400 hover:underline font-semibold cursor-pointer"
                      >
                        Clear Filter
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {[
                      {
                        stageNo: 1,
                        title: 'Stage 1: Documentation & Butt List',
                        subtitle: 'QR tag scans, P&ID markups & blind list',
                        count: stageStats.s1,
                        color: 'emerald',
                        status: '100% Verified'
                      },
                      {
                        stageNo: 2,
                        title: 'Stage 2: Quality Inspection & NDT',
                        subtitle: 'Radiography, hydrostatic test & punch items',
                        count: stageStats.s2,
                        color: 'blue',
                        status: `${Math.round((stageStats.s2 / (totalJobsCount || 1)) * 100)}% Engaged`
                      },
                      {
                        stageNo: 3,
                        title: 'Stage 3: Flange Tightness & Blinds',
                        subtitle: 'Torque verification & Operations endorsement',
                        count: stageStats.s3,
                        color: 'indigo',
                        status: `${Math.round((stageStats.s3 / (totalJobsCount || 1)) * 100)}% Endorsed`
                      },
                      {
                        stageNo: 4,
                        title: 'Stage 4: T/O Certificate & PSSR',
                        subtitle: 'Dual sign-off & hydrocarbon sanction',
                        count: stageStats.s4,
                        color: 'emerald',
                        status: `${Math.round((stageStats.s4 / (totalJobsCount || 1)) * 100)}% Sanctioned`
                      }
                    ].map(stage => {
                      const isSelected = dashboardStageFilter === stage.stageNo;
                      return (
                        <button
                          key={stage.stageNo}
                          type="button"
                          onClick={() => setDashboardStageFilter(isSelected ? null : stage.stageNo)}
                          className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer ${isSelected
                            ? 'bg-indigo-50/80 dark:bg-indigo-950/40 border-indigo-400 ring-2 ring-indigo-500/20 shadow-xs'
                            : 'bg-slate-50/50 dark:bg-slate-800/40 border-slate-200/80 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                            }`}
                        >
                          <div className="flex items-center justify-between mb-1.5">
                            <span className="text-[10px] font-bold font-mono text-slate-500 uppercase">
                              Stage 0{stage.stageNo}
                            </span>
                            <span className="text-xs font-black text-slate-800 dark:text-slate-200">
                              {stage.count} <span className="text-[10px] font-normal text-slate-400">Packages</span>
                            </span>
                          </div>
                          <div className="font-bold text-xs text-slate-900 dark:text-white leading-snug">
                            {stage.title.split(': ')[1]}
                          </div>
                          <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-1 line-clamp-1">
                            {stage.subtitle}
                          </div>
                          <div className="mt-2.5 pt-2 border-t border-slate-200/60 dark:border-slate-700/60 flex items-center justify-between text-[10px]">
                            <span className="text-slate-400">Readiness:</span>
                            <span className="font-bold text-emerald-600 dark:text-emerald-400 font-mono">
                              {stage.status}
                            </span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Right Column: Plant Unit & Circuit Mechanical Turnover Readiness */}
                <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                      <Building2 className="text-indigo-600 dark:text-indigo-400" size={16} />
                      <span>Plant Operating Unit Turnover Status</span>
                    </h3>
                    <p className="text-[11px] text-slate-500">
                      Mechanical completion pace tracked across plant process areas and battery limits.
                    </p>
                  </div>

                  <div className="space-y-3">
                    {unitBreakdown.map(u => (
                      <div
                        key={u.unitName}
                        className="p-3 rounded-xl bg-slate-50/60 dark:bg-slate-800/40 border border-slate-200/70 dark:border-slate-800 space-y-2"
                      >
                        <div className="flex items-center justify-between text-xs">
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-bold text-slate-900 dark:text-white">
                              {u.unitName}
                            </span>
                            {u.critical > 0 && (
                              <span className="text-[10px] text-amber-500 font-bold flex items-center gap-0.5" title="Contains critical path assets">
                                ★ {u.critical} Critical
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-3">
                            {u.openPunches > 0 && (
                              <span className="text-[10px] font-bold text-rose-600 dark:text-rose-400">
                                {u.openPunches} open punch
                              </span>
                            )}
                            <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
                              {u.done}/{u.total} Done ({u.pct}%)
                            </span>
                          </div>
                        </div>

                        <div className="w-full bg-slate-200/80 dark:bg-slate-700/80 h-2 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-500 ${u.pct === 100
                              ? 'bg-emerald-500'
                              : u.pct >= 50
                                ? 'bg-indigo-500'
                                : 'bg-amber-500'
                              }`}
                            style={{ width: `${u.pct}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

              </div>

              {/* Interactive Executive Filter Toolbar */}
              <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">

                  {/* Plant Filter Segmented Tabs */}
                  <div className="inline-flex rounded-xl bg-slate-100 dark:bg-slate-800 p-1 border border-slate-200 dark:border-slate-700 text-xs">
                    {(['All', 'Phra Khanong', 'Sriracha'] as const).map(plant => (
                      <button
                        key={plant}
                        type="button"
                        onClick={() => setDashboardPlantFilter(plant)}
                        className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${dashboardPlantFilter === plant
                          ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-2xs'
                          : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                          }`}
                      >
                        {plant === 'All' ? `All Plants (${jobs.length})` : plant}
                      </button>
                    ))}
                  </div>

                  {/* Status & Search Filters */}
                  <div className="flex items-center gap-2 flex-wrap">
                    {/* Status Segmented Picker */}
                    <select
                      value={dashboardStatusFilter}
                      onChange={e => setDashboardStatusFilter(e.target.value as any)}
                      className="px-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-semibold text-slate-800 dark:text-slate-200 outline-none cursor-pointer"
                    >
                      <option value="All">All Statuses ({jobs.length})</option>
                      <option value="Completed">สถานะ: Completed (เสร็จสิ้น) ({completedJobsCount})</option>
                      <option value="InProgress">สถานะ: In Progress (ยังไม่เสร็จ) ({inProgressJobsCount})</option>
                      <option value="FullySigned">Sign ครบตามเกณฑ์ ({fullySignedJobsCount})</option>
                      <option value="PendingSign">รอการ Sign ({pendingSignedJobsCount})</option>
                      <option value="HasOpenPunches">มี Punch ค้างปิด ({jobs.filter(j => !isJobPunchListComplete(j)).length})</option>
                      <option value="CriticalOnly">เส้นทางวิกฤต ★ ({criticalJobs.length})</option>
                      <option value="HasCategoryA">ค้าง Punch Cat A ({countCategoryA})</option>
                    </select>

                    {/* Search input */}
                    <div className="relative">
                      <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        type="text"
                        value={dashboardSearch}
                        onChange={e => setDashboardSearch(e.target.value)}
                        placeholder="Search package, tag, unit..."
                        className="pl-8 pr-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-white outline-none w-48 sm:w-60 focus:ring-2 focus:ring-indigo-500/20"
                      />
                      {dashboardSearch && (
                        <button
                          type="button"
                          onClick={() => setDashboardSearch('')}
                          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                        >
                          <X size={12} />
                        </button>
                      )}
                    </div>

                    {(dashboardPlantFilter !== 'All' || dashboardStatusFilter !== 'All' || dashboardSearch || dashboardStageFilter !== null) && (
                      <button
                        type="button"
                        onClick={() => {
                          setDashboardPlantFilter('All');
                          setDashboardStatusFilter('All');
                          setDashboardSearch('');
                          setDashboardStageFilter(null);
                        }}
                        className="px-2.5 py-1.5 rounded-xl text-xs font-semibold text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                      >
                        Reset
                      </button>
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 pt-1 border-t border-slate-100 dark:border-slate-800/80">
                  <span>Showing <strong>{filteredDashboardJobs.length}</strong> of <strong>{jobs.length}</strong> registered turnover packages</span>
                  <span className="font-mono text-[10px]">Filter Scope: {dashboardPlantFilter} Sites • Status: {dashboardStatusFilter}</span>
                </div>
              </div>

              {/* Executive Turnover Package Registry (Data Table) */}
              <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
                <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
                  <div>
                    <h3 className="text-xs font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider flex items-center gap-2">
                      <FileText size={15} className="text-indigo-600 dark:text-indigo-400" />
                      <span>Turnover Package Master Registry</span>
                    </h3>
                    <span className="text-[11px] text-slate-400">
                      Click any row to open the complete package workspace with punch list and digital signatures.
                    </span>
                  </div>
                  <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                    {filteredDashboardJobs.length} Packages Listed
                  </span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 dark:bg-slate-800/80 text-[10px] uppercase font-bold text-slate-500 tracking-wider border-b border-slate-200 dark:border-slate-800">
                      <tr>
                        <th className="p-3.5">Job No.</th>
                        <th className="p-3.5">Package Scope & Title</th>
                        <th className="p-3.5">Asset Tag / Hierarchy</th>
                        <th className="p-3.5">Plant & Unit</th>
                        <th className="p-3.5">สถานะการ Sign</th>
                        <th className="p-3.5">Punch List (A/B/C)</th>
                        <th className="p-3.5">สถานะ T/O (Step 9)</th>
                        <th className="p-3.5 text-center">T/O Certificate</th>
                        <th className="p-3.5 text-right">Workspace</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                      {filteredDashboardJobs.map(job => {
                        const isDone = isJobCompleted(job);
                        const isSigned = isJobSignaturesComplete(job);
                        const isPunchDone = isJobPunchListComplete(job);
                        const status = isDone ? 'Completed' : 'In Progress';
                        const hasOps = job.signatures.some(s => s.role.toLowerCase().includes('operat') && s.decision === 'Accept');
                        const hasOwner = job.signatures.some(s => (s.role.toLowerCase().includes('owner') || s.role.toLowerCase().includes('maint') || s.role.toLowerCase().includes('lead')) && s.decision === 'Accept');
                        const openA = job.punchList.filter(p => p.status === 'Open' && p.category === 'A').length;
                        const openB = job.punchList.filter(p => p.status === 'Open' && p.category === 'B').length;
                        const openC = job.punchList.filter(p => p.status === 'Open' && p.category === 'C').length;
                        const totalOpen = openA + openB + openC;

                        return (
                          <tr
                            key={job.id}
                            className="hover:bg-indigo-50/40 dark:hover:bg-slate-800/60 transition-colors group"
                          >
                            <td
                              className="p-3.5 font-mono font-bold text-indigo-600 dark:text-indigo-400 group-hover:underline cursor-pointer"
                              onClick={() => {
                                setSelectedJobId(job.id);
                                setActiveMainView('workspace');
                                setWorkspaceTab('turnover');
                              }}
                            >
                              {job.jobNo}
                            </td>
                            <td
                              className="p-3.5 max-w-xs cursor-pointer"
                              onClick={() => {
                                setSelectedJobId(job.id);
                                setActiveMainView('workspace');
                                setWorkspaceTab('turnover');
                              }}
                            >
                              <div className="font-bold text-slate-900 dark:text-slate-100 line-clamp-1">
                                {job.title}
                              </div>
                              <div className="text-[10px] text-slate-500 line-clamp-1 mt-0.5">
                                {job.description}
                              </div>
                            </td>
                            <td
                              className="p-3.5 cursor-pointer"
                              onClick={() => {
                                setSelectedJobId(job.id);
                                setActiveMainView('workspace');
                                setWorkspaceTab('turnover');
                              }}
                            >
                              <div className="font-mono font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                                <span>{job.assetTag || 'S2-C-101'}</span>
                                {job.isCriticalPath && (
                                  <span className="text-amber-500 font-bold" title="Critical Path Asset">★</span>
                                )}
                              </div>
                              <div className="text-[10px] text-indigo-600 dark:text-indigo-400 font-mono">
                                Ref: {job.refCode || '10-03'} {job.gridZone ? `• Grid ${job.gridZone}` : ''}
                              </div>
                            </td>
                            <td
                              className="p-3.5 cursor-pointer"
                              onClick={() => {
                                setSelectedJobId(job.id);
                                setActiveMainView('workspace');
                                setWorkspaceTab('turnover');
                              }}
                            >
                              <div className="font-semibold text-slate-800 dark:text-slate-200">
                                {job.plant}
                              </div>
                              <div className="text-[10px] text-slate-500 font-mono">
                                {(job.unit || '').split(' ')[0] || '-'}
                              </div>
                            </td>

                            {/* สถานะการ Sign */}
                            <td className="p-3.5">
                              <div className="space-y-1">
                                <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${isSigned
                                    ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800'
                                    : 'bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300 border border-amber-300 dark:border-amber-800'
                                  }`}>
                                  {isSigned ? <CheckCircle2 size={11} /> : <Clock size={11} />}
                                  <span>{isSigned ? 'Sign ครบแล้ว' : `รอ Sign (${job.signatures.length}/2)`}</span>
                                </span>
                                <div className="flex items-center gap-1.5 text-[10px]">
                                  <span
                                    className={`w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-bold ${hasOps ? 'bg-emerald-500 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-400'
                                      }`}
                                    title={hasOps ? 'Operation Signed' : 'Operation Pending'}
                                  >
                                    O
                                  </span>
                                  <span
                                    className={`w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-bold ${hasOwner ? 'bg-emerald-500 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-400'
                                      }`}
                                    title={hasOwner ? 'Job Owner Signed' : 'Job Owner Pending'}
                                  >
                                    J
                                  </span>
                                  <span className="text-slate-400 font-mono">
                                    {job.signatures.length} คน
                                  </span>
                                </div>
                              </div>
                            </td>

                            {/* จำนวน Punch List แยกตาม A / B / C & ปุ่มกดดูรายละเอียด */}
                            <td className="p-3.5">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedJobIdForPunchModal(job.id);
                                }}
                                className="px-2.5 py-1.5 rounded-xl bg-slate-100 hover:bg-indigo-50 dark:bg-slate-800 dark:hover:bg-slate-750 border border-slate-200 dark:border-slate-700 hover:border-indigo-300 text-left transition-all cursor-pointer shadow-2xs group/punch"
                                title="คลิกเพื่อดูรายละเอียด Punch List ของแต่ละ Job"
                              >
                                {totalOpen > 0 ? (
                                  <div className="space-y-1">
                                    <div className="flex items-center gap-1 text-[10px] font-mono">
                                      {openA > 0 && <span className="px-1.5 py-0.2 rounded bg-rose-100 text-rose-700 font-bold dark:bg-rose-950 dark:text-rose-300">A:{openA}</span>}
                                      {openB > 0 && <span className="px-1.5 py-0.2 rounded bg-amber-100 text-amber-700 font-bold dark:bg-amber-950 dark:text-amber-300">B:{openB}</span>}
                                      {openC > 0 && <span className="px-1.5 py-0.2 rounded bg-blue-100 text-blue-700 font-bold dark:bg-blue-950 dark:text-blue-300">C:{openC}</span>}
                                    </div>
                                    <div className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 flex items-center gap-1">
                                      <ListFilter size={11} />
                                      <span>ดู Punch List ({job.punchList.length})</span>
                                    </div>
                                  </div>
                                ) : (
                                  <div className="space-y-1">
                                    <div className="flex items-center gap-1 text-emerald-600 font-bold text-[11px]">
                                      <Check size={12} />
                                      <span>0 Clean ({job.punchList.length} ข้อ)</span>
                                    </div>
                                    <div className="text-[10px] font-semibold text-slate-500 hover:text-indigo-600 flex items-center gap-1">
                                      <ListFilter size={11} />
                                      <span>ดูรายละเอียด</span>
                                    </div>
                                  </div>
                                )}
                              </button>
                            </td>

                            {/* สถานะ T/O (Step 9: Complete T/O) */}
                            <td className="p-3.5">
                              <div className="space-y-1">
                                <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${status === 'Completed'
                                    ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800'
                                    : 'bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300 border border-amber-300 dark:border-amber-800'
                                  }`}>
                                  {status === 'Completed' ? <CheckCircle2 size={12} /> : <Clock size={12} />}
                                  <span>{status}</span>
                                </span>
                                <div className="text-[10px] text-slate-500 font-medium">
                                  {isDone ? (
                                    <span className="text-emerald-600 dark:text-emerald-400 font-semibold">✓ Sign ครบ • ปิด Punch ครบ</span>
                                  ) : !isSigned && !isPunchDone ? (
                                    <span>รอ Sign & ปิด Punch</span>
                                  ) : !isSigned ? (
                                    <span>รอ Sign ให้ครบ</span>
                                  ) : (
                                    <span className="text-rose-600 dark:text-rose-400">ค้าง Punch {totalOpen} ข้อ</span>
                                  )}
                                </div>
                              </div>
                            </td>

                            {/* รองรับ T/O Report / Certificate */}
                            <td className="p-3.5 text-center">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedJobId(job.id);
                                  setShowCertificateModal(true);
                                }}
                                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-gradient-to-r from-emerald-50 to-teal-50 hover:from-emerald-100 hover:to-teal-100 dark:from-emerald-950/50 dark:to-teal-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 text-[11px] font-bold transition-all cursor-pointer shadow-2xs hover:scale-105 active:scale-95"
                                title="ออกเอกสาร T/O Report / Handover Certificate ของงานนี้"
                              >
                                <Award size={13} />
                                <span>Certificate</span>
                              </button>
                            </td>

                            {/* Workspace */}
                            <td className="p-3.5 text-right">
                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedJobId(job.id);
                                  setActiveMainView('workspace');
                                  setWorkspaceTab('turnover');
                                }}
                                className="text-indigo-600 dark:text-indigo-400 font-bold group-hover:underline inline-flex items-center gap-1 text-[11px] cursor-pointer"
                              >
                                <span>Open</span>
                                <ChevronRight size={13} />
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                      {filteredDashboardJobs.length === 0 && (
                        <tr>
                          <td colSpan={9} className="p-8 text-center text-xs text-slate-400">
                            No turnover packages match the selected criteria. Try adjusting your plant, event, or status filters.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ===============================================================
              SUB-TAB 2: EX02 CRITICAL PATH & PUNCH LIST COMMAND CENTER
             =============================================================== */}
          {executiveSubTab === 'critical-path' && (
            <div className="space-y-6 animate-in fade-in duration-200">

              {/* EX02 Telemetry & Alert Command Header */}
              <div className="p-5 sm:p-6 rounded-2xl bg-gradient-to-r from-amber-950/40 via-slate-900 to-slate-900 border border-amber-600/30 shadow-lg flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2 flex-wrap text-xs">
                    <span className="px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider text-[10px] bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center gap-1.5">
                      <Flame size={12} className="text-amber-400 animate-pulse" />
                      <span>EX02 CRITICAL PATH VELOCITY</span>
                    </span>
                    <span className="text-slate-500">·</span>
                    <span className="text-slate-300 font-mono">Turnaround Event: {eventName}</span>
                    <span className="text-slate-500">·</span>
                    <span className="text-amber-400 font-mono font-bold">Startup: {eventTargetDate} (7 Days Remaining)</span>
                  </div>
                  <h3 className="text-xl sm:text-2xl font-black text-white tracking-tight flex items-center gap-2">
                    <AlertOctagon className="text-amber-400" size={24} />
                    <span>EX02 เส้นทางวิกฤต & ทะเบียนข้อบกพร่อง (Critical Path & Punch List)</span>
                  </h3>
                  <p className="text-xs text-slate-400 max-w-3xl">
                    การควบคุมและเร่งรัดความก้าวหน้าแพ็กเกจบนเส้นทางวิกฤต (Shutdown Critical Path), กำกับดูแลการปลดล็อกข้อบกพร่องหมวด A (Category A Startup Blockers) ก่อนขั้นตอน PSSR และการจ่ายสารไฮโดรคาร์บอน (Oil-In).
                  </p>
                </div>

                <div className="flex items-center gap-2 flex-wrap shrink-0">
                  <button
                    type="button"
                    onClick={() => setShowAddPunchModal(true)}
                    className="px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 text-xs font-black flex items-center gap-1.5 transition-all shadow-md cursor-pointer active:scale-95"
                  >
                    <Plus size={15} />
                    <span>Log Punch Item</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleExportPunchCsv}
                    className="px-3.5 py-2 rounded-xl border border-slate-700 bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Download size={14} />
                    <span>Export Punch CSV</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => window.print()}
                    className="p-2.5 rounded-xl border border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors cursor-pointer"
                    title="Print Punch Register"
                  >
                    <Printer size={15} />
                  </button>
                </div>
              </div>

              {/* Startup Blockers Callout (Category A Alert) */}
              {openCatAPunches.length > 0 ? (
                <div className="p-4 sm:p-5 rounded-2xl bg-rose-950/40 border border-rose-500/40 shadow-md space-y-3 animate-in slide-in-from-top-1">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div className="flex items-center gap-2.5">
                      <div className="p-2 rounded-xl bg-rose-500/20 text-rose-400 shrink-0">
                        <ShieldAlert size={20} />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-black text-rose-300 uppercase tracking-wider">
                            PSSR Startup Blockers Detected (Category A)
                          </span>
                          <span className="px-2 py-0.2 rounded-full text-[10px] font-bold bg-rose-500 text-white">
                            {openCatAPunches.length} Item(s) Holding Oil-In
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-300 mt-0.5">
                          ตามมาตรฐาน API 510/570 ข้อบกพร่องระดับ Category A จะต้องได้รับการแก้ไขและรับรองทางเทคนิค 100% ก่อนอนุญาตให้ทดสอบแรงดันไนโตรเจนหรือจ่ายสารไฮโดรคาร์บอน
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5 pt-1">
                    {openCatAPunches.map(p => (
                      <div
                        key={p.id}
                        className="p-3 rounded-xl bg-slate-900/90 border border-rose-900/80 hover:border-rose-600/70 transition-all flex flex-col justify-between space-y-2"
                      >
                        <div className="space-y-1">
                          <div className="flex items-center justify-between text-[10px]">
                            <span className="font-mono font-bold text-rose-400 bg-rose-950/80 px-2 py-0.5 rounded border border-rose-800/60">
                              {p.id} • Cat A
                            </span>
                            <span className="font-mono text-slate-400 font-semibold">{(p.unit || '').split(' ')[0] || '-'}</span>
                          </div>
                          <div className="font-mono font-bold text-xs text-white flex items-center gap-1.5">
                            <span>{p.assetTag || p.jobNo}</span>
                            {p.isCriticalPath && <span className="text-amber-400 font-bold" title="Critical Path Asset">★</span>}
                          </div>
                          <p className="text-[11px] text-slate-300 line-clamp-2 leading-relaxed">
                            {p.description}
                          </p>
                        </div>

                        <div className="flex items-center justify-between pt-2 border-t border-slate-800 text-[10px]">
                          <span className="text-slate-400 font-mono">By: {p.reportedBy}</span>
                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => setQuickInspectPunchItem(p)}
                              className="px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold cursor-pointer"
                            >
                              Inspect
                            </button>
                            <button
                              type="button"
                              onClick={() => handleToggleJobPunchStatus(p.jobId, p.id)}
                              className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold cursor-pointer transition-all flex items-center gap-1"
                            >
                              <Check size={11} />
                              <span>Clear</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="p-4 rounded-2xl bg-emerald-950/30 border border-emerald-500/30 flex items-center justify-between text-xs text-emerald-300">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-xl bg-emerald-500/20 text-emerald-400">
                      <CheckCircle2 size={18} />
                    </div>
                    <div>
                      <span className="font-bold text-sm text-white">Cat A Startup Clean: 0 Blockers</span>
                      <p className="text-[11px] text-emerald-400/90">
                        All Category A punch list items are completely resolved across all plant systems. Systems meet technical integrity requirements for PSSR approval.
                      </p>
                    </div>
                  </div>
                  <span className="font-mono font-bold text-emerald-400 px-3 py-1 rounded-xl bg-emerald-900/40 border border-emerald-700/50">
                    PSSR CLEARED
                  </span>
                </div>
              )}

              {/* 6 Key EX02 Metric Scorecards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3.5">
                {/* 1. Critical Path Velocity */}
                <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono flex items-center gap-1">
                      <span>Critical Path</span>
                      <span className="text-amber-500 font-bold">★</span>
                    </span>
                    <span className="text-[11px] font-bold text-amber-600 dark:text-amber-400">
                      {criticalReadinessPercentage}%
                    </span>
                  </div>
                  <div className="text-2xl font-black text-slate-900 dark:text-white">
                    {criticalDoneCount} <span className="text-xs font-normal text-slate-400">/ {criticalJobs.length}</span>
                  </div>
                  <div className="w-full bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
                    <div
                      className="bg-amber-500 h-full rounded-full transition-all duration-500"
                      style={{ width: `${criticalReadinessPercentage}%` }}
                    />
                  </div>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400">
                    {criticalJobs.length - criticalDoneCount} packages actively in-flight
                  </p>
                </div>

                {/* 2. Cat A (Startup Blockers) */}
                <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono">
                      Cat A Blocker
                    </span>
                    <span className={`text-[10px] font-bold ${openCatAPunches.length > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                      {openCatAPunches.length > 0 ? 'Immediate Action' : 'Zero Open'}
                    </span>
                  </div>
                  <div className={`text-2xl font-black ${openCatAPunches.length > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-slate-900 dark:text-white'}`}>
                    {openCatAPunches.length}
                  </div>
                  <div className="text-[10px] text-slate-500 dark:text-slate-400">
                    Must clear before hydrocarbon feed
                  </div>
                  <p className="text-[10px] text-slate-400">
                    Zero-tolerance safety compliance
                  </p>
                </div>

                {/* 3. Cat B (Pre-Startup Action) */}
                <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono">
                      Cat B Pre-Startup
                    </span>
                    <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400">
                      Before Oil-In
                    </span>
                  </div>
                  <div className="text-2xl font-black text-amber-600 dark:text-amber-400">
                    {openCatBPunches.length}
                  </div>
                  <div className="text-[10px] text-slate-500 dark:text-slate-400">
                    Action required prior to commissioning
                  </div>
                  <p className="text-[10px] text-slate-400">
                    Instrumentation, tags & gaskets
                  </p>
                </div>

                {/* 4. Cat C (Minor / Post-Startup) */}
                <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono">
                      Cat C Minor
                    </span>
                    <span className="text-[10px] font-bold text-blue-600 dark:text-blue-400">
                      Post-Startup
                    </span>
                  </div>
                  <div className="text-2xl font-black text-blue-600 dark:text-blue-400">
                    {openCatCPunches.length}
                  </div>
                  <div className="text-[10px] text-slate-500 dark:text-slate-400">
                    Punch out post turnaround
                  </div>
                  <p className="text-[10px] text-slate-400">
                    Cosmetic, insulation wrapping
                  </p>
                </div>

                {/* 5. Overall Resolution SLA */}
                <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono">
                      Resolution Rate
                    </span>
                    <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
                      {punchResolutionRate}%
                    </span>
                  </div>
                  <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400">
                    {totalResolvedPunches} <span className="text-xs font-normal text-slate-400">/ {totalPunchesCount}</span>
                  </div>
                  <div className="w-full bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
                    <div
                      className="bg-emerald-500 h-full rounded-full transition-all duration-500"
                      style={{ width: `${punchResolutionRate}%` }}
                    />
                  </div>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400">
                    {totalOpenPunches} punch items pending verification
                  </p>
                </div>

                {/* 6. Critical Path Dual Sign-Off */}
                <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono">
                      CP 5-Signatures Compliance
                    </span>
                    <span className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400">
                      {Math.round((criticalJobs.reduce((acc, j) => acc + j.signatures.length, 0) / ((criticalJobs.length * 5) || 1)) * 100)}%
                    </span>
                  </div>
                  <div className="text-2xl font-black text-indigo-600 dark:text-indigo-400">
                    {criticalJobs.reduce((acc, j) => acc + j.signatures.length, 0)} <span className="text-xs font-normal text-slate-400">/ {criticalJobs.length * 5}</span>
                  </div>
                  <div className="text-[10px] text-slate-500 dark:text-slate-400 flex items-center justify-between">
                    <span>Ops: {criticalJobs.filter(j => j.signatures.some(s => s.role.toLowerCase().includes('operat'))).length}</span>
                    <span>Maint/Lead: {criticalJobs.filter(j => j.signatures.some(s => s.role.toLowerCase().includes('maint') || s.role.toLowerCase().includes('lead'))).length}</span>
                  </div>
                  <p className="text-[10px] text-slate-400">
                    Digital 5-Role authorization compliance
                  </p>
                </div>
              </div>

              {/* Critical Path Circuit Pipeline & Milestone Velocity (Visual Gantt / Stage Tracker) */}
              <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                      <Workflow className="text-amber-500" size={16} />
                      <span>ผังติดตามความก้าวหน้ารายแพ็กเกจเส้นทางวิกฤต (Critical Path Circuit Pipeline)</span>
                    </h3>
                    <p className="text-[11px] text-slate-500">
                      ติดตามลำดับขั้นตอน 4-Stage Mechanical Turnover ของแพ็กเกจวิกฤตเพื่อเตรียมความพร้อมรับรอง PSSR
                    </p>
                  </div>
                  <span className="text-xs font-mono font-bold px-2.5 py-1 rounded-xl bg-amber-500/10 text-amber-500 border border-amber-500/20 self-start sm:self-auto">
                    {criticalJobs.length} Critical Packages
                  </span>
                </div>

                <div className="space-y-3">
                  {criticalJobs.map(job => {
                    const isDone = isJobCompleted(job);
                    const openA = job.punchList.filter(p => p.status === 'Open' && p.category === 'A').length;
                    const openB = job.punchList.filter(p => p.status === 'Open' && p.category === 'B').length;
                    const hasOps = job.signatures.some(s => s.role === 'Operation');

                    return (
                      <div
                        key={job.id}
                        className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900 hover:border-amber-400/60 dark:hover:border-amber-500/50 transition-all space-y-3"
                      >
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-2">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2 flex-wrap text-xs">
                              <span className="font-mono font-bold text-amber-600 dark:text-amber-400 flex items-center gap-1">
                                <span>★ {job.assetTag || job.jobNo}</span>
                              </span>
                              <span className="text-slate-300 dark:text-slate-700">·</span>
                              <span className="font-semibold text-slate-800 dark:text-slate-200">{job.title}</span>
                              <span className="text-slate-300 dark:text-slate-700">·</span>
                              <span className="text-slate-500 font-mono text-[11px]">{(job.unit || '').split(' ')[0] || '-'} ({job.plant || ''})</span>
                              {job.gridZone && (
                                <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
                                  Grid {job.gridZone}
                                </span>
                              )}
                            </div>
                            <div className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-1">
                              Ref Code: {job.refCode || 'N/A'} • WO: {job.workOrder || 'N/A'} • {job.description}
                            </div>
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            {openA > 0 ? (
                              <span className="px-2.5 py-1 rounded-lg bg-rose-500/10 text-rose-500 dark:text-rose-400 text-xs font-bold border border-rose-500/20 flex items-center gap-1">
                                <AlertOctagon size={13} />
                                <span>{openA} Cat A Blocker</span>
                              </span>
                            ) : openB > 0 ? (
                              <span className="px-2 py-1 rounded-lg bg-amber-500/10 text-amber-500 text-xs font-bold">
                                {openB} Cat B Open
                              </span>
                            ) : (
                              <span className="px-2 py-1 rounded-lg bg-emerald-500/10 text-emerald-500 text-xs font-bold flex items-center gap-1">
                                <CheckCircle2 size={13} />
                                <span>Punches Clean</span>
                              </span>
                            )}

                            <button
                              type="button"
                              onClick={() => {
                                setSelectedJobId(job.id);
                                setActiveMainView('workspace');
                                setWorkspaceTab('punch');
                              }}
                              className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer"
                            >
                              <span>Workspace</span>
                              <ChevronRight size={13} />
                            </button>
                          </div>
                        </div>

                        {/* 4-Stage Visual Progress Funnel for this critical job */}
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-slate-200/60 dark:border-slate-800/80 text-[11px]">
                          {/* Stage 1 */}
                          <div className="p-2.5 rounded-lg bg-emerald-50/70 dark:bg-emerald-950/20 border border-emerald-200/60 dark:border-emerald-900/40 space-y-0.5">
                            <div className="flex items-center justify-between text-[10px] text-emerald-700 dark:text-emerald-400 font-bold uppercase">
                              <span>Stage 1: Butt List</span>
                              <Check size={12} />
                            </div>
                            <div className="text-xs font-bold text-slate-800 dark:text-slate-200">
                              QR & P&ID Scans
                            </div>
                            <div className="text-[10px] text-emerald-600 font-medium">100% Verified</div>
                          </div>

                          {/* Stage 2 */}
                          <div className={`p-2.5 rounded-lg border space-y-0.5 ${openA === 0 && job.attachments.length > 0
                            ? 'bg-emerald-50/70 dark:bg-emerald-950/20 border-emerald-200/60 dark:border-emerald-900/40 text-emerald-700'
                            : 'bg-amber-50/70 dark:bg-amber-950/20 border-amber-200/60 dark:border-amber-900/40 text-amber-700'
                            }`}>
                            <div className="flex items-center justify-between text-[10px] font-bold uppercase">
                              <span>Stage 2: QC & NDT</span>
                              {openA === 0 ? <Check size={12} /> : <Clock size={12} />}
                            </div>
                            <div className="text-xs font-bold text-slate-800 dark:text-slate-200">
                              NDT & Hydrotest
                            </div>
                            <div className="text-[10px] font-medium">
                              {openA > 0 ? `${openA} Cat A Pending` : 'QA Certified'}
                            </div>
                          </div>

                          {/* Stage 3 */}
                          <div className={`p-2.5 rounded-lg border space-y-0.5 ${hasOps
                            ? 'bg-emerald-50/70 dark:bg-emerald-950/20 border-emerald-200/60 dark:border-emerald-900/40 text-emerald-700'
                            : 'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-400'
                            }`}>
                            <div className="flex items-center justify-between text-[10px] font-bold uppercase">
                              <span>Stage 3: Flanges</span>
                              {hasOps ? <Check size={12} /> : <Clock size={12} />}
                            </div>
                            <div className="text-xs font-bold text-slate-800 dark:text-slate-200">
                              Torque & De-Blind
                            </div>
                            <div className="text-[10px] font-medium">
                              {hasOps ? 'Ops Endorsed' : 'Awaiting Torque'}
                            </div>
                          </div>

                          {/* Stage 4 */}
                          <div className={`p-2.5 rounded-lg border space-y-0.5 ${isDone
                            ? 'bg-emerald-50/70 dark:bg-emerald-950/20 border-emerald-200/60 dark:border-emerald-900/40 text-emerald-700'
                            : 'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-400'
                            }`}>
                            <div className="flex items-center justify-between text-[10px] font-bold uppercase">
                              <span>Stage 4: T/O Cert</span>
                              {isDone ? <Check size={12} /> : <Clock size={12} />}
                            </div>
                            <div className="text-xs font-bold text-slate-800 dark:text-slate-200">
                              5-Signatures & PSSR
                            </div>
                            <div className="text-[10px] font-medium">
                              {isDone ? 'PSSR Sanctioned' : `${job.signatures.length}/5 Signed`}
                            </div>
                          </div>
                        </div>

                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Master Punch List Register (Interactive Table & Action Center) */}
              <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">

                {/* Search & Filter Toolbar */}
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">

                  {/* Severity Tabs */}
                  <div className="inline-flex rounded-xl bg-slate-100 dark:bg-slate-800 p-1 border border-slate-200 dark:border-slate-700 text-xs flex-wrap gap-1">
                    {(['All', 'A', 'B', 'C', 'Open', 'Resolved'] as const).map(sev => (
                      <button
                        key={sev}
                        type="button"
                        onClick={() => setPunchSeverityFilter(sev)}
                        className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${punchSeverityFilter === sev
                          ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-2xs'
                          : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                          }`}
                      >
                        {sev === 'All' ? `All (${allPunchItemsWithJob.length})` :
                          sev === 'A' ? `Cat A (${allPunchItemsWithJob.filter(p => p.category === 'A').length})` :
                            sev === 'B' ? `Cat B (${allPunchItemsWithJob.filter(p => p.category === 'B').length})` :
                              sev === 'C' ? `Cat C (${allPunchItemsWithJob.filter(p => p.category === 'C').length})` :
                                sev === 'Open' ? `Open (${totalOpenPunches})` :
                                  `Resolved (${totalResolvedPunches})`}
                      </button>
                    ))}
                  </div>

                  {/* Filters: Plant, Critical Only, Search */}
                  <div className="flex items-center gap-2 flex-wrap">

                    {/* Plant Filter */}
                    <div className="inline-flex rounded-xl bg-slate-100 dark:bg-slate-800 p-1 border border-slate-200 dark:border-slate-700 text-xs">
                      {(['All', 'Phra Khanong', 'Sriracha'] as const).map(plant => (
                        <button
                          key={plant}
                          type="button"
                          onClick={() => setPunchPlantFilter(plant)}
                          className={`px-2.5 py-1 rounded-lg font-bold text-[11px] transition-all cursor-pointer ${punchPlantFilter === plant
                            ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-2xs'
                            : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                            }`}
                        >
                          {plant === 'All' ? 'All Plants' : plant.split(' ')[0]}
                        </button>
                      ))}
                    </div>

                    {/* Critical Path Toggle */}
                    <button
                      type="button"
                      onClick={() => setPunchCriticalOnlyFilter(!punchCriticalOnlyFilter)}
                      className={`px-3 py-1.5 rounded-xl border text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${punchCriticalOnlyFilter
                        ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-xs'
                        : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-50'
                        }`}
                    >
                      <span className="text-amber-500 font-bold">★</span>
                      <span>Critical Path Only</span>
                    </button>

                    {/* Search Input */}
                    <div className="relative">
                      <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        type="text"
                        value={punchSearchQuery}
                        onChange={e => setPunchSearchQuery(e.target.value)}
                        placeholder="Search punch, tag, defect..."
                        className="pl-8 pr-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-white outline-none w-44 sm:w-56 focus:ring-2 focus:ring-amber-500/20"
                      />
                      {punchSearchQuery && (
                        <button
                          type="button"
                          onClick={() => setPunchSearchQuery('')}
                          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                        >
                          <X size={12} />
                        </button>
                      )}
                    </div>

                    {(punchSeverityFilter !== 'All' || punchPlantFilter !== 'All' || punchCriticalOnlyFilter || punchSearchQuery) && (
                      <button
                        type="button"
                        onClick={() => {
                          setPunchSeverityFilter('All');
                          setPunchPlantFilter('All');
                          setPunchCriticalOnlyFilter(false);
                          setPunchSearchQuery('');
                        }}
                        className="text-xs font-semibold text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 cursor-pointer"
                      >
                        Reset
                      </button>
                    )}

                  </div>
                </div>

                {/* Punch Register Table */}
                <div className="rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50 dark:bg-slate-800/80 text-[10px] uppercase font-bold text-slate-500 tracking-wider border-b border-slate-200 dark:border-slate-800">
                        <tr>
                          <th className="p-3">Punch ID & Cat</th>
                          <th className="p-3">Asset Tag / Package</th>
                          <th className="p-3">Unit & Plant</th>
                          <th className="p-3">Defect Description & Remedial Requirement</th>
                          <th className="p-3 text-center">Photo</th>
                          <th className="p-3">Reported By</th>
                          <th className="p-3 text-center">Status Toggle</th>
                          <th className="p-3 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                        {filteredPunchItems.map(p => {
                          const isResolved = p.status === 'Resolved';
                          return (
                            <tr
                              key={`${p.jobId}-${p.id}`}
                              className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors"
                            >
                              {/* Punch ID & Category */}
                              <td className="p-3">
                                <div className="flex items-center gap-1.5">
                                  <span className="font-mono font-bold text-slate-900 dark:text-white">
                                    {p.id}
                                  </span>
                                  <span className={`px-2 py-0.5 rounded text-[10px] font-black ${p.category === 'A'
                                    ? 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 border border-rose-300 dark:border-rose-800'
                                    : p.category === 'B'
                                      ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border border-amber-300 dark:border-amber-800'
                                      : 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300 border border-blue-300 dark:border-blue-800'
                                    }`}>
                                    Cat {p.category}
                                  </span>
                                </div>
                                <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                                  {p.type}
                                </div>
                              </td>

                              {/* Asset Tag / Package */}
                              <td className="p-3">
                                <div className="font-mono font-bold text-slate-900 dark:text-white flex items-center gap-1">
                                  <span>{p.assetTag || p.jobNo}</span>
                                  {p.isCriticalPath && (
                                    <span className="text-amber-500 font-bold" title="Critical Path Asset">★</span>
                                  )}
                                </div>
                                <div className="text-[10px] text-slate-500 line-clamp-1 max-w-[180px]">
                                  {p.jobTitle}
                                </div>
                              </td>

                              {/* Unit & Plant */}
                              <td className="p-3">
                                <div className="font-semibold text-slate-800 dark:text-slate-200">
                                  {(p.unit || '').split(' ')[0] || '-'}
                                </div>
                                <div className="text-[10px] text-slate-400 font-mono">
                                  {p.plant}
                                </div>
                              </td>

                              {/* Defect Description */}
                              <td className="p-3 max-w-sm">
                                <p className="text-slate-800 dark:text-slate-200 line-clamp-2 leading-relaxed">
                                  {p.description}
                                </p>
                              </td>

                              {/* Photo Evidence */}
                              <td className="p-3 text-center">
                                {p.photoRequired ? (
                                  <span className="inline-flex items-center justify-center p-1 rounded-md bg-amber-500/10 text-amber-600 dark:text-amber-400" title="Photo verification required">
                                    <Camera size={14} />
                                  </span>
                                ) : (
                                  <span className="text-slate-300 dark:text-slate-600 font-mono text-[10px]">-</span>
                                )}
                              </td>

                              {/* Reporter & Timestamp */}
                              <td className="p-3">
                                <div className="text-slate-700 dark:text-slate-300 font-medium">
                                  {p.reportedBy}
                                </div>
                                <div className="text-[10px] text-slate-400 font-mono">
                                  {p.timestamp}
                                </div>
                              </td>

                              {/* Status with 1-Click Interactive Toggle */}
                              <td className="p-3 text-center">
                                <button
                                  type="button"
                                  onClick={() => handleToggleJobPunchStatus(p.jobId, p.id)}
                                  className={`px-3 py-1 rounded-full text-[11px] font-bold inline-flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs active:scale-95 ${isResolved
                                    ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200 dark:bg-emerald-950 dark:text-emerald-300 dark:hover:bg-emerald-900 border border-emerald-300 dark:border-emerald-800'
                                    : 'bg-rose-100 text-rose-800 hover:bg-rose-200 dark:bg-rose-950 dark:text-rose-300 dark:hover:bg-rose-900 border border-rose-300 dark:border-rose-800'
                                    }`}
                                  title="Click to toggle status: Open / Resolved"
                                >
                                  {isResolved ? <CheckCircle2 size={13} /> : <Clock size={13} />}
                                  <span>{isResolved ? 'Resolved' : 'Open'}</span>
                                </button>
                              </td>

                              {/* Actions */}
                              <td className="p-3 text-right">
                                <div className="flex items-center justify-end gap-1.5">
                                  <button
                                    type="button"
                                    onClick={() => setQuickInspectPunchItem(p)}
                                    className="px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 text-[11px] font-semibold transition-colors cursor-pointer"
                                  >
                                    Inspect
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setSelectedJobId(p.jobId);
                                      setActiveMainView('workspace');
                                      setWorkspaceTab('punch');
                                    }}
                                    className="p-1 rounded-lg text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 cursor-pointer"
                                    title="Open in Workspace"
                                  >
                                    <ChevronRight size={15} />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}

                        {filteredPunchItems.length === 0 && (
                          <tr>
                            <td colSpan={8} className="p-8 text-center text-xs text-slate-400">
                              No punch list items match the selected filters.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1">
                  <span>Showing <strong>{filteredPunchItems.length}</strong> of <strong>{allPunchItemsWithJob.length}</strong> total registered punch list defects</span>
                  <span className="font-mono text-[10px]">PSSR Pre-Condition: 0 Category A Blockers</span>
                </div>

              </div>

            </div>
          )}

          {/* ===============================================================
              SUB-TAB 3: EX03 UNIT READINESS FUNNEL VIEW
             =============================================================== */}
          {executiveSubTab === 'unit-funnel' && (
            <div className="space-y-6 animate-in fade-in duration-200">

              {/* EX03 Header Banner */}
              <div className="p-5 sm:p-6 rounded-2xl bg-gradient-to-r from-emerald-950/40 via-slate-900 to-slate-900 border border-emerald-600/30 shadow-lg flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2 flex-wrap text-xs">
                    <span className="px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider text-[10px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1.5">
                      <Building2 size={12} className="text-emerald-400" />
                      <span>EX03 UNIT READINESS FUNNEL</span>
                    </span>
                    <span className="text-slate-500">·</span>
                    <span className="text-slate-300 font-mono">Turnaround Event: {eventName}</span>
                  </div>
                  <h3 className="text-xl sm:text-2xl font-black text-white tracking-tight flex items-center gap-2">
                    <Building2 className="text-emerald-400" size={24} />
                    <span>EX03 ความพร้อมแยกตามหน่วยผลิต (Unit Readiness Funnel)</span>
                  </h3>
                  <p className="text-xs text-slate-400 max-w-3xl">
                    ติดตามความพร้อมการส่งมอบเครื่องจักรและระบบท่อแยกตามหน่วยกระบวนการผลิต (Process Units & Battery Limits) เพื่อจัดลำดับการเริ่มเดินระบบตามแผน PSSR
                  </p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={handleExportCsv}
                    className="px-3.5 py-2 rounded-xl border border-slate-700 bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Download size={14} />
                    <span>Export Unit Report</span>
                  </button>
                </div>
              </div>

              {/* Unit Readiness Cards Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {unitBreakdown.map(u => {
                  const unitJobs = jobs.filter(j => j.unit === u.unitName);
                  const catACount = unitJobs.flatMap(j => j.punchList).filter(p => p.category === 'A' && p.status === 'Open').length;

                  return (
                    <div
                      key={u.unitName}
                      className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4 hover:border-emerald-500/50 transition-all"
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <span className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider">
                            Operating Unit
                          </span>
                          <h4 className="text-base font-bold text-slate-900 dark:text-white mt-0.5">
                            {u.unitName}
                          </h4>
                        </div>
                        <span className={`text-sm font-black font-mono ${u.pct === 100 ? 'text-emerald-500' : u.pct >= 50 ? 'text-indigo-500' : 'text-amber-500'
                          }`}>
                          {u.pct}%
                        </span>
                      </div>

                      <div className="w-full bg-slate-100 dark:bg-slate-800 h-2.5 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${u.pct === 100 ? 'bg-emerald-500' : u.pct >= 50 ? 'bg-indigo-500' : 'bg-amber-500'
                            }`}
                          style={{ width: `${u.pct}%` }}
                        />
                      </div>

                      <div className="grid grid-cols-3 gap-2 text-center text-xs pt-1">
                        <div className="p-2 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60">
                          <div className="text-[9px] text-slate-400 font-mono uppercase">Packages</div>
                          <div className="font-bold text-slate-800 dark:text-slate-200 mt-0.5">{u.done}/{u.total}</div>
                        </div>
                        <div className="p-2 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60">
                          <div className="text-[9px] text-slate-400 font-mono uppercase">Critical</div>
                          <div className="font-bold text-amber-500 mt-0.5">{u.critical} ★</div>
                        </div>
                        <div className="p-2 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60">
                          <div className="text-[9px] text-slate-400 font-mono uppercase">Open Punch</div>
                          <div className={`font-bold mt-0.5 ${catACount > 0 ? 'text-rose-500' : 'text-slate-700 dark:text-slate-300'}`}>
                            {u.openPunches} {catACount > 0 ? `(${catACount}A)` : ''}
                          </div>
                        </div>
                      </div>

                      {/* Packages in this unit */}
                      <div className="space-y-1.5 pt-2 border-t border-slate-100 dark:border-slate-800">
                        <span className="text-[10px] font-mono text-slate-400 font-semibold uppercase">Registered Packages</span>
                        <div className="space-y-1">
                          {unitJobs.map(j => (
                            <button
                              key={j.id}
                              type="button"
                              onClick={() => {
                                setSelectedJobId(j.id);
                                setActiveMainView('workspace');
                                setWorkspaceTab('turnover');
                              }}
                              className="w-full text-left p-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 text-xs flex items-center justify-between group transition-colors cursor-pointer"
                            >
                              <div className="flex items-center gap-1.5 min-w-0">
                                <span className="font-mono font-bold text-indigo-600 dark:text-indigo-400 shrink-0 text-[11px]">
                                  {j.assetTag || j.jobNo}
                                </span>
                                {j.isCriticalPath && <span className="text-amber-500 font-bold text-[10px]">★</span>}
                                <span className="text-slate-700 dark:text-slate-300 truncate text-[11px]">{j.title}</span>
                              </div>
                              <span className={`text-[10px] font-semibold shrink-0 ml-2 ${isJobCompleted(j) ? 'text-emerald-500' : 'text-amber-500'
                                }`}>
                                {isJobCompleted(j) ? 'Done' : 'Active'}
                              </span>
                            </button>
                          ))}
                        </div>
                      </div>

                    </div>
                  );
                })}
              </div>

            </div>
          )}

          {/* Quick Punch Inspection & Evidence Modal */}
          {quickInspectPunchItem && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xs animate-in fade-in">
              <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl max-w-xl w-full p-5 sm:p-6 space-y-5 animate-in zoom-in-95">

                {/* Modal Header */}
                <div className="flex items-start justify-between border-b border-slate-100 dark:border-slate-800 pb-3.5">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-black text-sm text-slate-900 dark:text-white">
                        {quickInspectPunchItem.id}
                      </span>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-black ${quickInspectPunchItem.category === 'A'
                        ? 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 border border-rose-300 dark:border-rose-800'
                        : quickInspectPunchItem.category === 'B'
                          ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border border-amber-300 dark:border-amber-800'
                          : 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300 border border-blue-300 dark:border-blue-800'
                        }`}>
                        Category {quickInspectPunchItem.category} • {quickInspectPunchItem.category === 'A' ? 'Immediate Blocker' : quickInspectPunchItem.category === 'B' ? 'Before Startup' : 'Minor'}
                      </span>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${quickInspectPunchItem.status === 'Resolved'
                        ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                        : 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                        }`}>
                        {quickInspectPunchItem.status}
                      </span>
                    </div>
                    <h4 className="text-base font-bold text-slate-900 dark:text-slate-100">
                      {quickInspectPunchItem.type}
                    </h4>
                  </div>

                  <button
                    type="button"
                    onClick={() => setQuickInspectPunchItem(null)}
                    className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                  >
                    <X size={18} />
                  </button>
                </div>

                {/* Details Grid */}
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 space-y-1">
                    <span className="text-[10px] uppercase font-mono text-slate-400 font-bold">Asset Tag</span>
                    <div className="font-mono font-bold text-slate-900 dark:text-white flex items-center gap-1">
                      <span>{quickInspectPunchItem.assetTag || 'N/A'}</span>
                      {quickInspectPunchItem.isCriticalPath && (
                        <span className="text-amber-500 font-bold" title="Critical Path Asset">★ Critical</span>
                      )}
                    </div>
                    <div className="text-[10px] text-slate-500 line-clamp-1">
                      {quickInspectPunchItem.jobTitle}
                    </div>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 space-y-1">
                    <span className="text-[10px] uppercase font-mono text-slate-400 font-bold">Location & System</span>
                    <div className="font-bold text-slate-900 dark:text-white">
                      {quickInspectPunchItem.unit}
                    </div>
                    <div className="text-[10px] text-slate-500 font-mono">
                      Plant: {quickInspectPunchItem.plant} • WO: {quickInspectPunchItem.workOrder || 'WO-884021'}
                    </div>
                  </div>
                </div>

                {/* Description & Remedial Requirement */}
                <div className="space-y-1.5 text-xs">
                  <span className="text-[10px] uppercase font-mono text-slate-400 font-bold">Defect Description & Remedial Action</span>
                  <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 leading-relaxed font-medium">
                    {quickInspectPunchItem.description}
                  </div>
                </div>

                {/* API 510/570 Refinery Regulatory Notice */}
                <div className={`p-3 rounded-xl border text-xs space-y-1 ${quickInspectPunchItem.category === 'A'
                  ? 'bg-rose-50/80 dark:bg-rose-950/20 border-rose-300 dark:border-rose-900/50 text-rose-800 dark:text-rose-300'
                  : quickInspectPunchItem.category === 'B'
                    ? 'bg-amber-50/80 dark:bg-amber-950/20 border-amber-300 dark:border-amber-900/50 text-amber-800 dark:text-amber-300'
                    : 'bg-blue-50/80 dark:bg-blue-950/20 border-blue-300 dark:border-blue-900/50 text-blue-800 dark:text-blue-300'
                  }`}>
                  <div className="font-bold flex items-center gap-1.5 text-[11px]">
                    <Info size={13} />
                    <span>API 510/570 Turnaround Punch List Standard:</span>
                  </div>
                  <p className="text-[10px] leading-relaxed">
                    {quickInspectPunchItem.category === 'A' && (
                      'Category A items are direct startup blockers. No hydrocarbon feed or operational pressure test may proceed until this defect is certified and stamped resolved by the Lead QC Inspector.'
                    )}
                    {quickInspectPunchItem.category === 'B' && (
                      'Category B items must be resolved before hydrocarbon introduction (Oil-In), but allow preliminary nitrogen flushing and electrical dry run checks.'
                    )}
                    {quickInspectPunchItem.category === 'C' && (
                      'Category C items are minor non-critical punch items (e.g. nameplates, insulation cladding, touch-up paint) that can be cleared during post-startup handover.'
                    )}
                  </p>
                </div>

                {/* Photo Evidence Section */}
                {quickInspectPunchItem.photoRequired && (
                  <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/60 space-y-2 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] uppercase font-mono text-slate-400 font-bold flex items-center gap-1">
                        <Camera size={12} className="text-amber-500" />
                        <span>Photographic Evidence Required</span>
                      </span>
                      <span className="text-[10px] text-emerald-600 font-semibold flex items-center gap-1">
                        <Check size={11} />
                        <span>Evidence Attached</span>
                      </span>
                    </div>

                    <div className="h-28 rounded-lg bg-slate-900 flex items-center justify-center border border-slate-700 relative overflow-hidden group">
                      <div className="text-center p-3 space-y-1">
                        <Camera size={22} className="mx-auto text-amber-400" />
                        <div className="text-[10px] font-mono text-slate-300 font-bold">
                          EVIDENCE_PHOTO_{quickInspectPunchItem.id.toUpperCase()}.JPG
                        </div>
                        <div className="text-[9px] text-slate-500">
                          Timestamped GPS EX-Camera Scan • QA Tagged
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Audit & Reporter Metadata */}
                <div className="flex items-center justify-between text-[10px] text-slate-500 font-mono border-t border-slate-100 dark:border-slate-800 pt-3">
                  <span>Reported By: {quickInspectPunchItem.reportedBy}</span>
                  <span>Timestamp: {quickInspectPunchItem.timestamp}</span>
                </div>

                {/* Modal Footer Controls */}
                <div className="flex items-center justify-between pt-1 border-t border-slate-100 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedJobId(quickInspectPunchItem.jobId);
                      setActiveMainView('workspace');
                      setWorkspaceTab('punch');
                      setQuickInspectPunchItem(null);
                    }}
                    className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer flex items-center gap-1"
                  >
                    <span>Open in Package Workspace</span>
                    <ChevronRight size={13} />
                  </button>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setQuickInspectPunchItem(null)}
                      className="px-3.5 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                    >
                      Close
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        handleToggleJobPunchStatus(quickInspectPunchItem.jobId, quickInspectPunchItem.id);
                        setQuickInspectPunchItem((prev: any) => prev ? {
                          ...prev,
                          status: prev.status === 'Open' ? 'Resolved' : 'Open'
                        } : null);
                      }}
                      className={`px-4 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shadow-sm active:scale-95 ${quickInspectPunchItem.status === 'Resolved'
                        ? 'bg-amber-600 hover:bg-amber-700 text-white'
                        : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                        }`}
                    >
                      {quickInspectPunchItem.status === 'Resolved' ? (
                        <>
                          <Clock size={13} />
                          <span>Reopen Punch Item</span>
                        </>
                      ) : (
                        <>
                          <Check size={13} />
                          <span>Mark as Resolved</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>

              </div>
            </div>
          )}

          {/* Add New Punch Item Modal */}
          {showAddPunchModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xs animate-in fade-in">
              <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl max-w-lg w-full p-5 sm:p-6 space-y-4 animate-in zoom-in-95">

                <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                  <div>
                    <h4 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                      <Plus className="text-amber-500" size={18} />
                      <span>Log New Punch List Item</span>
                    </h4>
                    <p className="text-[11px] text-slate-500">
                      Record a mechanical defect or pre-startup clearance condition.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowAddPunchModal(false)}
                    className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                  >
                    <X size={18} />
                  </button>
                </div>

                <form onSubmit={handleCreatePunchItem} className="space-y-3.5 text-xs">
                  {/* Select Package */}
                  <div className="space-y-1">
                    <label className="font-semibold text-slate-700 dark:text-slate-300">
                      Target Turnover Package *
                    </label>
                    <select
                      value={addPunchJobId}
                      onChange={e => setAddPunchJobId(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white outline-none font-medium cursor-pointer"
                    >
                      {jobs.map(j => (
                        <option key={j.id} value={j.id}>
                          {j.isCriticalPath ? '★ [Critical Path] ' : ''}{j.assetTag || j.jobNo} — {(j.title || j.description || j.jobNo || '').slice(0, 48)}... ({j.unit ? j.unit.split(' ')[0] : ''})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    {/* Category Classification */}
                    <div className="space-y-1">
                      <label className="font-semibold text-slate-700 dark:text-slate-300">
                        Category Classification *
                      </label>
                      <select
                        value={addPunchCategory}
                        onChange={e => setAddPunchCategory(e.target.value as any)}
                        className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-bold outline-none cursor-pointer"
                      >
                        <option value="A">Cat A — Immediate Action (Startup Blocker)</option>
                        <option value="B">Cat B — Action before Oil In (Pre-startup)</option>
                        <option value="C">Cat C — Minor / Post-Startup</option>
                      </select>
                    </div>

                    {/* Defect Type */}
                    <div className="space-y-1">
                      <label className="font-semibold text-slate-700 dark:text-slate-300">
                        Defect Type *
                      </label>
                      <select
                        value={addPunchType}
                        onChange={e => setAddPunchType(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white outline-none cursor-pointer"
                      >
                        <option value="Flange Bolt Torquing">Flange Bolt Torquing</option>
                        <option value="Missing Blind List Sign-Off">Missing Blind List Sign-Off</option>
                        <option value="Burner FG Shut-Off Leak">Burner FG Shut-Off Leak</option>
                        <option value="NDT Weld Flaw">NDT Weld Flaw</option>
                        <option value="Instrument Wiring">Instrument Wiring</option>
                        <option value="Paint / Coating Damage">Paint / Coating Damage</option>
                        <option value="Grounding Bonding">Grounding Bonding</option>
                        <option value="Insulation Damage">Insulation Damage</option>
                        <option value="Valve Tag Stamp">Valve Tag Stamp</option>
                        <option value="Other Mechanical Defect">Other Mechanical Defect</option>
                      </select>
                    </div>
                  </div>

                  {/* Description */}
                  <div className="space-y-1">
                    <label className="font-semibold text-slate-700 dark:text-slate-300">
                      Defect Description & Remedial Requirement *
                    </label>
                    <textarea
                      required
                      rows={3}
                      value={addPunchDescription}
                      onChange={e => setAddPunchDescription(e.target.value)}
                      placeholder="Specify the exact location, discrepancy observed, and required remedial actions..."
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-amber-500/20"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3 items-center">
                    {/* Reporter Name */}
                    <div className="space-y-1">
                      <label className="font-semibold text-slate-700 dark:text-slate-300">
                        Reported By
                      </label>
                      <input
                        type="text"
                        value={addPunchReportedBy}
                        onChange={e => setAddPunchReportedBy(e.target.value)}
                        className="w-full px-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white outline-none"
                      />
                    </div>

                    {/* Photo Required Checkbox */}
                    <div className="pt-4">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={addPunchPhotoRequired}
                          onChange={e => setAddPunchPhotoRequired(e.target.checked)}
                          className="w-4 h-4 rounded text-amber-600 focus:ring-amber-500 cursor-pointer"
                        />
                        <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                          <Camera size={13} className="text-amber-500" />
                          <span>Photo Verification Required</span>
                        </span>
                      </label>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-2.5">
                    <button
                      type="button"
                      onClick={() => setShowAddPunchModal(false)}
                      className="px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-sm active:scale-95"
                    >
                      <Plus size={14} />
                      <span>Submit Punch Item</span>
                    </button>
                  </div>
                </form>

              </div>
            </div>
          )}

          {/* Executive Briefing Modal */}
          {showExecutiveBriefingModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
              <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl max-w-2xl w-full p-6 space-y-6">

                <div className="flex items-start justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider font-mono text-indigo-600 dark:text-indigo-400">
                      Steering Committee Briefing Document
                    </span>
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white mt-0.5">
                      Plant Turnaround (T/O) Executive Readiness Report
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Official mechanical handover status summary for Plant Site Leadership.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowExecutiveBriefingModal(false)}
                    className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                  >
                    <X size={18} />
                  </button>
                </div>

                <div className="space-y-4 text-xs">
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
                    <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                      <div className="text-[10px] text-slate-400 uppercase font-mono">Readiness</div>
                      <div className="text-xl font-black text-emerald-600 mt-1">{readinessPercentage}%</div>
                    </div>
                    <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                      <div className="text-[10px] text-slate-400 uppercase font-mono">Packages</div>
                      <div className="text-xl font-black text-slate-900 dark:text-white mt-1">{completedJobsCount}/{totalJobsCount}</div>
                    </div>
                    <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                      <div className="text-[10px] text-slate-400 uppercase font-mono">Critical Path</div>
                      <div className="text-xl font-black text-amber-500 mt-1">{criticalReadinessPercentage}%</div>
                    </div>
                    <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                      <div className="text-[10px] text-slate-400 uppercase font-mono">Open Cat A</div>
                      <div className={`text-xl font-black mt-1 ${countCategoryA > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                        {countCategoryA}
                      </div>
                    </div>
                  </div>

                  <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-2">
                    <div className="font-bold text-slate-800 dark:text-slate-200 text-xs">
                      1. Turnaround Governance Certification:
                    </div>
                    <p className="text-slate-600 dark:text-slate-300 leading-relaxed text-[11px]">
                      Mechanical turnover packages comply with refinery Standard Operating Procedure <strong>SOP-TO-402</strong>. All completed packages feature verified Butt List walk-downs, QA/QC NDT certifications, torque records, and dual Operations & Job Owner digital endorsements.
                    </p>
                  </div>

                  <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-2">
                    <div className="font-bold text-slate-800 dark:text-slate-200 text-xs">
                      2. Pre-Startup Safety Review (PSSR) Clearance:
                    </div>
                    <p className="text-slate-600 dark:text-slate-300 leading-relaxed text-[11px]">
                      {countCategoryA === 0 ? (
                        <span className="text-emerald-600 dark:text-emerald-400 font-bold">
                          ✓ All Category A critical punch items are 100% resolved across all systems. Refinery units are technically cleared for nitrogen leak hold and hydrocarbon re-introduction.
                        </span>
                      ) : (
                        <span className="text-rose-600 dark:text-rose-400 font-bold">
                          ⚠ Caution: {countCategoryA} Category A safety/isolation punch item(s) remain open. Hydrocarbon introduction cannot commence until Category A items are cleared.
                        </span>
                      )}
                    </p>
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-2.5">
                  <button
                    type="button"
                    onClick={() => setShowExecutiveBriefingModal(false)}
                    className="px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                  >
                    Close
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowExecutiveBriefingModal(false);
                      window.print();
                    }}
                    className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer shadow-sm"
                  >
                    <Printer size={14} />
                    <span>Print Briefing</span>
                  </button>
                </div>

              </div>
            </div>
          )}

        </div>
      )}

      {/* =========================================================================
          VIEW 5: SETTINGS & CONFIGURATION VIEW (PLANT & ROLE GOVERNANCE)
         ========================================================================= */}
      {activeMainView === 'settings' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 p-5 sm:p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-teal-100 dark:bg-teal-950 text-teal-700 dark:text-teal-300 border border-teal-200 dark:border-teal-800">
                  TO04 • System Governance
                </span>
                <span className="text-xs text-slate-400 font-mono">• Multi-Plant & Signer Roles</span>
              </div>
              <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-slate-100 tracking-tight mt-1 flex items-center gap-2">
                <Sliders className="text-teal-600 dark:text-teal-400" size={24} />
                <span>Job Location Settings & Authority Configuration</span>
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Manage multi-plant routing, dual sign-off roles (Operation, Job Owner), touch display ergonomics, and audit dossier backup.
              </p>
            </div>

            <button
              type="button"
              onClick={() => {
                const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(jobs, null, 2));
                const link = document.createElement('a');
                link.href = dataStr;
                link.download = `Turnover_Jobs_Full_Backup_${new Date().toISOString().slice(0, 10)}.json`;
                link.click();
              }}
              className="px-4 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs flex items-center gap-2 shadow-sm cursor-pointer shrink-0"
            >
              <Download size={15} />
              <span>Export Full Dossier (JSON)</span>
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

            {/* Setting Card 1: Multi-Plant Selection & Plant Operations Switcher */}
            <div className="p-5 sm:p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-teal-50 dark:bg-teal-950 text-teal-600 dark:text-teal-400">
                    <Building2 size={18} />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                      Plant Operations & Multi-Plant Switching
                    </h3>
                    <p className="text-xs text-slate-400">Manage multiple refineries under a single engineering profile</p>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block">
                  Select Active Primary Plant Location:
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div
                    onClick={() => handlePlantChange('Phra Khanong')}
                    className={`p-4 rounded-xl border-2 transition-all cursor-pointer ${selectedPlant === 'Phra Khanong'
                      ? 'border-teal-600 bg-teal-50/60 dark:bg-teal-950/40 text-teal-950 dark:text-teal-100 shadow-xs ring-2 ring-teal-500/20'
                      : 'border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 text-slate-700 dark:text-slate-300 hover:border-slate-300'
                      }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-sm">Phra Khanong (PK)</span>
                      {selectedPlant === 'Phra Khanong' && <CheckCircle2 size={18} className="text-teal-600 dark:text-teal-400" />}
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                      Complex crude distillation & reforming units (APS-1, CCR, HCU).
                    </p>
                    <span className="mt-2 inline-block text-[10px] font-mono px-2 py-0.5 rounded bg-white dark:bg-slate-800 font-bold text-teal-600">
                      {jobs.filter(j => j.plant === 'Phra Khanong').length} Packages Active
                    </span>
                  </div>

                  <div
                    onClick={() => handlePlantChange('Sriracha')}
                    className={`p-4 rounded-xl border-2 transition-all cursor-pointer ${selectedPlant === 'Sriracha'
                      ? 'border-teal-600 bg-teal-50/60 dark:bg-teal-950/40 text-teal-950 dark:text-teal-100 shadow-xs ring-2 ring-teal-500/20'
                      : 'border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 text-slate-700 dark:text-slate-300 hover:border-slate-300'
                      }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-sm">Si Racha (SR)</span>
                      {selectedPlant === 'Sriracha' && <CheckCircle2 size={18} className="text-teal-600 dark:text-teal-400" />}
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                      Deep conversion vacuum & hydrotreating units (VPS-2, DHT, SRU).
                    </p>
                    <span className="mt-2 inline-block text-[10px] font-mono px-2 py-0.5 rounded bg-white dark:bg-slate-800 font-bold text-teal-600">
                      {jobs.filter(j => j.plant === 'Sriracha').length} Packages Active
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Setting Card 2: Signer Roles Configuration */}
            <div className="p-5 sm:p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400">
                    <UserCheck size={18} />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                      Turnover Signer Roles & Authority
                    </h3>
                    <p className="text-xs text-slate-400">Step 6 default roles (Operation & Job Owner) and custom roles</p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setIsAddingNewRoleModalOpen(true)}
                  className="px-3 py-1.5 rounded-lg bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400 font-bold text-xs flex items-center gap-1 hover:bg-blue-100 cursor-pointer"
                >
                  <Plus size={13} />
                  <span>Add Role</span>
                </button>
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-2 pb-1">
                  {(['Phra Khanong', 'Sriracha'] as const).map(p => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setRolesEditPlant(p)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all cursor-pointer ${rolesEditPlant === p
                        ? 'bg-blue-600 border-blue-600 text-white'
                        : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50'}`}
                    >
                      {p === 'Phra Khanong' ? 'Phra Khanong (PK)' : 'Si Racha (SR)'}
                    </button>
                  ))}
                </div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block">
                  Signer Roles for {rolesEditPlant === 'Phra Khanong' ? 'Phra Khanong' : 'Si Racha'} (shown in Sign tab for this plant's jobs):
                </label>
                <div className="space-y-2">
                  {signerRolesByPlant[rolesEditPlant].map((role, idx) => (
                    <div
                      key={role}
                      className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 flex items-center justify-between text-xs"
                    >
                      <div className="flex items-center gap-2.5">
                        <span className="w-6 h-6 rounded-lg bg-white dark:bg-slate-700 text-slate-600 dark:text-slate-300 flex items-center justify-center font-bold font-mono text-[11px]">
                          {idx + 1}
                        </span>
                        <span className="font-bold text-slate-900 dark:text-slate-100">{role}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveRole(role)}
                        disabled={signerRolesByPlant[rolesEditPlant].length <= 1}
                        title="Remove role"
                        className="p-1 rounded-md text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* ================= PUNCH LIST DRILLDOWN MODAL (STEP 9) ================= */}
      {punchDrillDownCategory && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl max-w-3xl w-full max-h-[85vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`p-2.5 rounded-xl text-white ${punchDrillDownCategory === 'A' ? 'bg-rose-600' : punchDrillDownCategory === 'B' ? 'bg-amber-600' : 'bg-blue-600'
                  }`}>
                  <AlertTriangle size={20} />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900 dark:text-slate-100 flex items-center gap-2">
                    <span>Category {punchDrillDownCategory} Punch List Drilldown</span>
                    <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                      {allPunchItemsWithJob.filter(p => p.category === punchDrillDownCategory).length} Items
                    </span>
                  </h3>
                  <p className="text-xs text-slate-500">
                    {punchDrillDownCategory === 'A'
                      ? 'Critical Immediate Action (Blockers preventing hydrocarbon introduction)'
                      : punchDrillDownCategory === 'B'
                        ? 'High Priority (Must complete before Oil-in and startup)'
                        : 'Low Priority (Not urgent, post startup clearance)'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setPunchDrillDownCategory(null)}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-5 overflow-y-auto space-y-3 flex-1">
              {allPunchItemsWithJob.filter(p => p.category === punchDrillDownCategory).length > 0 ? (
                allPunchItemsWithJob.filter(p => p.category === punchDrillDownCategory).map((punch) => (
                  <div
                    key={punch.id}
                    className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono font-black text-slate-800 dark:text-slate-200 bg-white dark:bg-slate-800 px-2 py-0.5 rounded border border-slate-200 dark:border-slate-700">
                          {punch.jobNo}
                        </span>
                        <span className="font-bold text-slate-700 dark:text-slate-300">{punch.unit}</span>
                        <span className="text-slate-400">• Tag: <strong>{punch.assetTag || 'N/A'}</strong></span>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${punch.status === 'Resolved' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                          }`}>
                          {punch.status}
                        </span>
                      </div>
                      <p className="text-slate-800 dark:text-slate-200 font-medium">
                        {punch.description}
                      </p>
                      <div className="text-[10px] text-slate-400 flex items-center gap-2">
                        <span>Reported by: <strong>{punch.reportedBy}</strong></span>
                        <span>• Date: {punch.timestamp}</span>
                        {punch.photoRequired && <span>• 📷 Photo required for resolution</span>}
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        setSelectedJobId(punch.jobId);
                        setActiveMainView('workspace');
                        setWorkspaceTab('turnover');
                        setTurnoverSubTab('punchlist');
                        setPunchDrillDownCategory(null);
                      }}
                      className="px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shrink-0 flex items-center gap-1.5 transition-colors cursor-pointer self-start sm:self-center"
                    >
                      <span>Open in Job Hub</span>
                      <ArrowRight size={13} />
                    </button>
                  </div>
                ))
              ) : (
                <div className="p-8 text-center text-xs text-slate-400">
                  No punch list items registered under Category {punchDrillDownCategory}.
                </div>
              )}
            </div>

            <div className="p-4 border-t border-slate-200 dark:border-slate-800 flex justify-end">
              <button
                type="button"
                onClick={() => setPunchDrillDownCategory(null)}
                className="px-5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold text-xs cursor-pointer"
              >
                Close Drilldown
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= OFFICIAL TURNOVER CERTIFICATE MODAL (STEP 9) ================= */}
      {showCertificateModal && (
        <div className="fixed inset-0 z-50 bg-black/65 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl max-w-3xl w-full max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-950/30 dark:to-teal-950/30">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-emerald-600 text-white">
                  <Award size={22} />
                </div>
                <div>
                  <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-emerald-700 dark:text-emerald-400">
                    Official Engineering Handover Document (Step 8 & 9)
                  </span>
                  <h3 className="text-base font-black text-slate-900 dark:text-slate-100">
                    T/O Handover Certificate & Acceptance Dossier
                  </h3>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowCertificateModal(false)}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-200/50 cursor-pointer"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-5 flex-1 text-xs">
              {/* Certificate Header Banner */}
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1">
                  <span className="text-[10px] font-mono uppercase text-slate-400 font-bold">Certificate Number</span>
                  <div className="font-mono text-sm font-black text-slate-900 dark:text-slate-100">
                    CERT-TO-2026-{currentJob.plant === 'Phra Khanong' ? 'PK' : 'SR'}-{currentJob.jobNo}
                  </div>
                  <p className="text-[11px] text-slate-500">
                    Package: <strong className="text-slate-800 dark:text-slate-200">{currentJob.jobNo}</strong> • WO: <strong className="font-mono">{currentJob.workOrder}</strong>
                  </p>
                  <p className="text-[11px] text-slate-500">
                    Equipment: <strong className="text-indigo-600 dark:text-indigo-400 font-mono">{currentJob.assetTag || 'S2-C-101'}</strong> ({currentJob.assetDescription || 'Process Equipment'})
                  </p>
                </div>
                <div className="p-2 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 shrink-0 self-start sm:self-center">
                  <QRCodeSVG value={`https://bcp-turnover.enterprise.internal/certificate/${currentJob.jobNo}`} size={64} />
                </div>
              </div>

              {/* Step 9 Complete T/O Evaluation Status Badge */}
              <div className={`p-4 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${isJobCompleted(currentJob)
                  ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200'
                  : 'bg-amber-50 dark:bg-amber-950/40 border-amber-300 dark:border-amber-800 text-amber-900 dark:text-amber-200'
                }`}>
                <div className="flex items-start gap-3">
                  <div className={`p-2 rounded-xl text-white shrink-0 mt-0.5 ${isJobCompleted(currentJob) ? 'bg-emerald-600' : 'bg-amber-600'
                    }`}>
                    {isJobCompleted(currentJob) ? <CheckCircle2 size={18} /> : <Clock size={18} />}
                  </div>
                  <div className="space-y-0.5">
                    <div className="font-bold text-xs uppercase tracking-wide flex items-center gap-1.5">
                      <span>Step 9 Status: {isJobCompleted(currentJob) ? 'COMPLETED (อนุมัติส่งมอบสมบูรณ์)' : 'IN PROGRESS (ยังไม่เสร็จสิ้น)'}</span>
                    </div>
                    <p className="text-[11px] leading-relaxed opacity-90">
                      {isJobCompleted(currentJob)
                        ? 'ลายเซ็นดิจิทัลได้รับการตรวจรับรองครบตามที่กำหนด และรายการข้อบกพร่อง Punch List ได้รับการแก้ไขครบถ้วน 100%'
                        : (!isJobSignaturesComplete(currentJob) && !isJobPunchListComplete(currentJob))
                          ? `ยังไม่สามารถเปลี่ยนเป็น Completed ได้: รอการ Sign (${currentJob.signatures.length}/2) และยังมี Punch List ค้างดำเนินการ (${currentJob.punchList.filter(p => p.status === 'Open').length} ข้อ)`
                          : !isJobSignaturesComplete(currentJob)
                            ? `ยังไม่สามารถเปลี่ยนเป็น Completed ได้: รอการลงนามตรวจรับรองดิจิทัลให้ครบตามกำหนด (${currentJob.signatures.length}/2)`
                            : `ยังไม่สามารถเปลี่ยนเป็น Completed ได้: มีรายการ Punch List ค้างดำเนินการ (${currentJob.punchList.filter(p => p.status === 'Open').length} ข้อ)`}
                    </p>
                  </div>
                </div>

                <span className={`px-3 py-1 rounded-full text-[10px] font-mono font-bold tracking-wider uppercase shrink-0 self-start sm:self-center ${isJobCompleted(currentJob)
                    ? 'bg-emerald-600 text-white'
                    : 'bg-amber-600 text-white'
                  }`}>
                  {isJobCompleted(currentJob) ? 'PSSR SANCTIONED' : 'PENDING ACTION'}
                </span>
              </div>

              {/* Status Compliance Summary */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                  <span className="text-[10px] text-slate-400 block font-mono">Signatures Status</span>
                  <span className={`text-base font-black ${isJobSignaturesComplete(currentJob) ? 'text-emerald-600' : 'text-amber-600'}`}>
                    {currentJob.signatures.length}/2 {isJobSignaturesComplete(currentJob) ? '✓ ครบ' : 'รอ Sign'}
                  </span>
                </div>
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                  <span className="text-[10px] text-slate-400 block font-mono">Punch Open</span>
                  <span className={`text-base font-black ${isJobPunchListComplete(currentJob) ? 'text-emerald-600' : 'text-rose-600'}`}>
                    {currentJob.punchList.filter(p => p.status === 'Open').length} Open
                  </span>
                </div>
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                  <span className="text-[10px] text-slate-400 block font-mono">Cat A Blocker</span>
                  <span className={`text-base font-black ${currentJob.punchList.filter(p => p.category === 'A' && p.status === 'Open').length === 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                    {currentJob.punchList.filter(p => p.category === 'A' && p.status === 'Open').length}
                  </span>
                </div>
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                  <span className="text-[10px] text-slate-400 block font-mono">Overall T/O Status</span>
                  <span className={`text-base font-black ${isJobCompleted(currentJob) ? 'text-emerald-600' : 'text-amber-600'}`}>
                    {isJobCompleted(currentJob) ? 'Completed' : 'In Progress'}
                  </span>
                </div>
              </div>

              {/* Declaration Statement */}
              <div className="p-4 rounded-xl bg-emerald-50/60 dark:bg-emerald-950/20 border border-emerald-200/60 dark:border-emerald-900/40 text-slate-700 dark:text-slate-300 space-y-1.5 leading-relaxed">
                <div className="font-bold text-emerald-900 dark:text-emerald-200 text-xs flex items-center gap-1.5">
                  <CheckCheck size={16} className="text-emerald-600" />
                  <span>Refinery Technical Handover Declaration (SOP-TO-402)</span>
                </div>
                <p className="text-[11px]">
                  This certifies that package <strong>{currentJob.jobNo}</strong> covering asset <strong>{currentJob.assetTag || 'Process Circuit'}</strong> has been reviewed against turnaround engineering standards. All digital authorizations are verified with tamper-proof cryptographic logs.
                </p>
              </div>

              {/* Digital Signatures Authorization Manifest for this Job */}
              <div className="space-y-2">
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block uppercase tracking-wider">
                  Digital Signatures Authorization Manifest ({currentJob.signatures.length} Recorded):
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {currentJob.signatures.map((sig, idx) => (
                    <div key={sig.id || idx} className="p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] text-slate-400 font-mono block">{sig.role}</span>
                        <span className="text-[10px] font-bold text-emerald-600">✓ Accepted</span>
                      </div>
                      <span className="font-bold text-slate-900 dark:text-slate-100 block">{sig.name}</span>
                      <span className="text-[10px] text-slate-400 font-mono block">Signed: {sig.signedAt}</span>
                    </div>
                  ))}
                  {currentJob.signatures.length < 2 && (
                    <div className="p-3 rounded-xl border border-dashed border-amber-300 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-950/20 flex items-center justify-center text-amber-700 dark:text-amber-400 text-xs font-semibold">
                      <Clock size={14} className="mr-1.5" />
                      <span>รอการลงนามตรวจรับรองเพิ่มเติม ({2 - currentJob.signatures.length} ฝ่าย)</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="p-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setShowCertificateModal(false)}
                className="px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                Close
              </button>
              <button
                type="button"
                onClick={() => {
                  window.print();
                }}
                className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-2 shadow-md cursor-pointer"
              >
                <Printer size={15} />
                <span>Print Official Certificate</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= JOB-SPECIFIC PUNCH LIST DETAIL MODAL ================= */}
      {selectedJobForPunchModal && (
        <div className="fixed inset-0 z-50 bg-black/65 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl max-w-4xl w-full max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">

            {/* Modal Header */}
            <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-800/60">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-indigo-600 text-white">
                  <ListFilter size={20} />
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300">
                      {selectedJobForPunchModal.jobNo}
                    </span>
                    <span className="text-xs font-bold text-slate-700 dark:text-slate-300 font-mono">
                      {selectedJobForPunchModal.assetTag || 'S2-C-101'}
                    </span>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${isJobCompleted(selectedJobForPunchModal)
                        ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                        : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                      }`}>
                      {isJobCompleted(selectedJobForPunchModal) ? '✓ Completed' : '⏳ In Progress'}
                    </span>
                  </div>
                  <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-slate-100 mt-1 line-clamp-1">
                    {selectedJobForPunchModal.title}
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    {selectedJobForPunchModal.unit} • {selectedJobForPunchModal.system}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedJobIdForPunchModal(null)}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-200/50 cursor-pointer"
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-5 flex-1 text-xs">

              {/* Punch Breakdown Summary Pills */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                  <span className="text-[10px] text-slate-400 font-mono block">Total Punch Items</span>
                  <span className="text-lg font-black text-slate-900 dark:text-white">
                    {selectedJobForPunchModal.punchList.length}
                  </span>
                </div>
                <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/50">
                  <span className="text-[10px] text-rose-600 dark:text-rose-400 font-mono font-bold block">Category A (Blocker)</span>
                  <span className="text-lg font-black text-rose-700 dark:text-rose-300">
                    {selectedJobForPunchModal.punchList.filter(p => p.category === 'A' && p.status === 'Open').length} Open
                  </span>
                </div>
                <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50">
                  <span className="text-[10px] text-amber-600 dark:text-amber-400 font-mono font-bold block">Category B (Pre-Oil In)</span>
                  <span className="text-lg font-black text-amber-700 dark:text-amber-300">
                    {selectedJobForPunchModal.punchList.filter(p => p.category === 'B' && p.status === 'Open').length} Open
                  </span>
                </div>
                <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/50">
                  <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-mono font-bold block">Resolved / Closed</span>
                  <span className="text-lg font-black text-emerald-700 dark:text-emerald-300">
                    {selectedJobForPunchModal.punchList.filter(p => p.status === 'Resolved').length} Resolved
                  </span>
                </div>
              </div>

              {/* Step 9 Compliance Notice */}
              <div className={`p-3.5 rounded-xl border flex items-center justify-between text-[11px] ${isJobPunchListComplete(selectedJobForPunchModal)
                  ? 'bg-emerald-50/70 border-emerald-200 text-emerald-800 dark:bg-emerald-950/30 dark:border-emerald-800 dark:text-emerald-300'
                  : 'bg-amber-50/70 border-amber-200 text-amber-800 dark:bg-amber-950/30 dark:border-amber-800 dark:text-amber-300'
                }`}>
                <div className="flex items-center gap-2">
                  {isJobPunchListComplete(selectedJobForPunchModal) ? (
                    <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
                  ) : (
                    <AlertCircle size={16} className="text-amber-600 shrink-0" />
                  )}
                  <span>
                    {isJobPunchListComplete(selectedJobForPunchModal)
                      ? 'Punch List ของงานนี้ดำเนินการครบถ้วน 100% แล้ว (ผ่านเกณฑ์ข้อที่ 2 ของ Step 9)'
                      : `ยังมี Punch List ค้างดำเนินการ ${selectedJobForPunchModal.punchList.filter(p => p.status === 'Open').length} ข้อ (สถานะงานยังคงเป็น In Progress ตาม Step 9)`}
                  </span>
                </div>
                <span className="font-mono font-bold text-[10px]">
                  Signatures: {selectedJobForPunchModal.signatures.length}/2
                </span>
              </div>

              {/* Punch Items List */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
                  รายการข้อบกพร่อง (Punch Items Detail):
                </h4>

                {selectedJobForPunchModal.punchList.length === 0 ? (
                  <div className="p-8 text-center bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-200 dark:border-slate-800 text-slate-400">
                    <CheckCircle2 size={24} className="mx-auto text-emerald-500 mb-2" />
                    <p className="font-semibold text-slate-700 dark:text-slate-300">ไม่มีรายการข้อบกพร่อง (Zero Punch Items)</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">งานนี้ผ่านการตรวจสอบเบื้องต้นแล้วโดยไม่มี Punch List</p>
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {selectedJobForPunchModal.punchList.map(item => (
                      <div
                        key={item.id}
                        className={`p-3.5 rounded-2xl border transition-all ${item.status === 'Resolved'
                            ? 'bg-slate-50/60 dark:bg-slate-800/40 border-slate-200 dark:border-slate-800 opacity-80'
                            : item.category === 'A'
                              ? 'bg-rose-50/40 dark:bg-rose-950/20 border-rose-300 dark:border-rose-900/60'
                              : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700'
                          }`}
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase font-mono border ${item.category === 'A'
                                ? 'bg-rose-100 text-rose-800 border-rose-300 dark:bg-rose-950 dark:text-rose-300 dark:border-rose-800'
                                : item.category === 'B'
                                  ? 'bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-950 dark:text-amber-300 dark:border-amber-800'
                                  : 'bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-950 dark:text-blue-300 dark:border-blue-800'
                              }`}>
                              Category {item.category} {item.category === 'A' ? '(Blocker)' : item.category === 'B' ? '(Pre-Oil In)' : '(Minor)'}
                            </span>
                            <span className="font-mono text-[11px] font-bold text-slate-500">{item.id}</span>
                            <span className="text-[11px] font-semibold text-slate-800 dark:text-slate-200">{item.type}</span>
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            <button
                              type="button"
                              onClick={() => handleToggleJobPunchStatus(selectedJobForPunchModal.id, item.id)}
                              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shadow-2xs ${item.status === 'Resolved'
                                  ? 'bg-emerald-100 hover:bg-emerald-200 text-emerald-800 dark:bg-emerald-950 dark:hover:bg-emerald-900 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800'
                                  : 'bg-rose-100 hover:bg-rose-200 text-rose-800 dark:bg-rose-950 dark:hover:bg-rose-900 dark:text-rose-300 border border-rose-300 dark:border-rose-800'
                                }`}
                              title="คลิกเพื่อเปลี่ยนสถานะ Open / Resolved"
                            >
                              {item.status === 'Resolved' ? (
                                <>
                                  <CheckCircle2 size={12} />
                                  <span>Resolved (คลิกเพื่อ Re-open)</span>
                                </>
                              ) : (
                                <>
                                  <Clock size={12} />
                                  <span>Open (คลิกเพื่อ Resolve)</span>
                                </>
                              )}
                            </button>
                          </div>
                        </div>

                        <p className="text-slate-700 dark:text-slate-300 text-xs mt-2 leading-relaxed">
                          {item.description}
                        </p>

                        <div className="flex items-center justify-between text-[10px] text-slate-400 mt-2.5 pt-2 border-t border-slate-100 dark:border-slate-800 flex-wrap gap-2">
                          <div>
                            <span>Reported by: <strong>{item.reportedBy}</strong></span>
                            {item.timestamp && <span className="ml-2 font-mono">({item.timestamp})</span>}
                          </div>
                          {item.photoRequired && (
                            <span className="text-amber-600 dark:text-amber-400 font-semibold flex items-center gap-1">
                              <Camera size={11} /> Photo Verification Mandatory
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-900">
              <span className="text-[11px] text-slate-500">
                Tip: คลิกปุ่มสถานะของ Punch Item เพื่อสลับ Resolved / Open เพื่อทดสอบสถานะ Step 9 Complete T/O แบบเรียลไทม์
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedJobId(selectedJobForPunchModal.id);
                    setSelectedJobIdForPunchModal(null);
                    setShowCertificateModal(true);
                  }}
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm cursor-pointer"
                >
                  <Award size={14} />
                  <span>เปิด T/O Certificate ของงานนี้</span>
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedJobIdForPunchModal(null)}
                  className="px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                >
                  ปิด
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* ================= ADD NEW ROLE MODAL (STEP 6) ================= */}
      {isAddingNewRoleModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl max-w-md w-full p-6 space-y-4 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <UserCheck size={16} className="text-teal-600" />
                <span>Add New Signer Role</span>
              </h3>
              <button
                type="button"
                onClick={() => setIsAddingNewRoleModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                New Role Title *
              </label>
              <input
                type="text"
                value={newRoleInput}
                onChange={e => setNewRoleInput(e.target.value)}
                placeholder="e.g. Lead Piping Inspector, Process Safety Eng..."
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-semibold text-slate-900 dark:text-slate-100 outline-none focus:ring-2 focus:ring-teal-500/20"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsAddingNewRoleModalOpen(false)}
                className="px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleAddNewRole}
                className="px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs cursor-pointer shadow-xs"
              >
                Add Role
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= MOBILE & TABLET BOTTOM NAVIGATION BAR (LAYOUT 1) ================= */}
      <nav
        aria-label="Mobile and Tablet Bottom Navigation"
        className="sticky bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-t border-slate-200 dark:border-slate-800 shadow-2xl py-2 px-3 flex items-center justify-around rounded-b-2xl mt-4 lg:hidden"
      >
        <button
          type="button"
          onClick={() => setActiveMainView('workspace')}
          className={`flex flex-col items-center justify-center py-1 px-3 rounded-xl min-h-[48px] min-w-[64px] transition-all cursor-pointer ${activeMainView === 'workspace'
            ? 'text-emerald-600 dark:text-emerald-400 font-bold scale-105'
            : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
        >
          <div className="relative">
            <Home size={20} />
            <span className="absolute -top-1.5 -right-2 px-1 py-0.2 bg-emerald-500 text-white text-[9px] font-mono rounded-full font-bold">
              {jobs.length}
            </span>
          </div>
          <span className="text-[10px] mt-1 font-semibold">Turnover (T/O)</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveMainView('dashboard')}
          className={`flex flex-col items-center justify-center py-1 px-3 rounded-xl min-h-[48px] min-w-[64px] transition-all cursor-pointer ${activeMainView === 'dashboard'
            ? 'text-cyan-600 dark:text-cyan-400 font-bold scale-105'
            : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
        >
          <div className="relative">
            <BarChart3 size={20} />
            <span className="absolute -top-1.5 -right-2 px-1 py-0.2 bg-cyan-500 text-white text-[9px] font-mono rounded-full font-bold">
              {readinessPercentage}%
            </span>
          </div>
          <span className="text-[10px] mt-1 font-semibold">{isTh ? 'แดชบอร์ด' : 'Dashboard'}</span>
        </button>

        <button
          type="button"
          onClick={() => {
            resetCreateForm();
            setIsCreateFormOpen(true);
            setActiveMainView('create');
          }}
          className={`flex flex-col items-center justify-center -mt-5 py-2 px-3.5 rounded-2xl min-h-[52px] min-w-[64px] transition-all cursor-pointer shadow-lg ${activeMainView === 'create'
            ? 'bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-emerald-500/40 ring-4 ring-emerald-500/20 scale-105'
            : 'bg-emerald-600 text-white shadow-emerald-950/30 hover:bg-emerald-500'
            }`}
        >
          <Plus size={22} className="stroke-[2.5]" />
          <span className="text-[10px] font-bold mt-0.5">{isTh ? 'สร้างงาน' : 'Create'}</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveMainView('settings')}
          className={`flex flex-col items-center justify-center py-1 px-3 rounded-xl min-h-[48px] min-w-[64px] transition-all cursor-pointer ${activeMainView === 'settings'
            ? 'text-teal-600 dark:text-teal-400 font-bold scale-105'
            : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
        >
          <div className="relative">
            <Sliders size={20} />
            <span className="absolute -top-1.5 -right-2 px-1 py-0.2 bg-teal-500 text-white text-[9px] font-mono rounded-full font-bold">
              {selectedPlant === 'Phra Khanong' ? (isTh ? 'พระโขนง' : 'PK') : (isTh ? 'ศรีราชา' : 'SR')}
            </span>
          </div>
          <span className="text-[10px] mt-1 font-semibold">{isTh ? 'ตั้งค่า' : 'Settings'}</span>
        </button>
      </nav>

      {/* Asset Hierarchy Modal */}
      <AssetHierarchySelectModal
        isOpen={isHierarchyModalOpen}
        onClose={() => setIsHierarchyModalOpen(false)}
        onSelectAsset={handleSelectAssetNode}
        selectedAssetTag={selectedAssetTag}
        initialUnitId={selectedUnitId}
      />

    </div>
  );
}
