import React, { createContext, useContext, useState, useEffect, useMemo, ReactNode } from 'react';

// ==========================================
// SHARED TYPES FOR PLANTTURN SYSTEM
// ==========================================

export type PunchCategory = 'A' | 'B' | 'C' | 'S';
export type PunchOrButtType = 'Punch' | 'Butt';
export type PunchStatus = 'Open' | 'In Progress' | 'Resolved' | 'Cancel' | 'Closed';
export type AcceptanceDecision = 'Accept' | 'Not Accept';
export type AcceptanceStatus = 'Pending' | 'Accepted' | 'Not Accepted' | 'Pending Re-Accept';
export type TurnoverWorkflowStatus = 'In Progress' | 'Rejected' | 'Reviewed' | 'Completed' | 'Pending';

export interface PunchItem {
  id: string;
  jobId?: string;
  item?: string; // e.g. PL-11-001 or BL-11-002
  itemType?: PunchOrButtType; // 'Punch' | 'Butt'
  type?: string; // e.g. Flange Leaks / Gasket, Defect
  locationRef?: string; // e.g. Tube R14-C08 / Butt BW-104 / Nozzle N1
  testMethod?: string; // e.g. ECT / Hydrotest / RT / PT / Torque / Visual
  defectPhotoUrl?: string;
  remedialWorks?: string;
  category?: PunchCategory | string;
  punchCategory?: string;
  punchStatus?: string;
  description: string;
  discipline?: string; // 'M' | 'P' | 'E' | 'I' | 'Ins' | 'C' | 'S'
  contractor?: string;
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
  cpSign?: string;
  cpDate?: string;
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

export type TaskStatus = 'Pending' | 'In Progress' | 'Approved' | 'Rejected';
export type ApprovalRole = 'Turnover Lead' | 'TSS Inspector' | 'PES Engineer' | 'OPS Lead' | 'SD Manager';

export interface InspectionApprovalTask {
  id: string;
  jobId: string;
  taskCode: string;
  title: string;
  tabKey: 'tab1' | 'tab2' | 'tab3' | 'tab4';
  tabName: string;
  equipmentNo: string;
  systemNo: string;
  unitNo: string;
  initiator: string;
  assignedRole: ApprovalRole;
  approverName: string;
  submissionDate: string;
  approvalDate: string;
  status: TaskStatus;
  priority: 'High' | 'Medium' | 'Critical';
  comments: string;
  rejectionReason?: string;
  criteria: {
    label: string;
    verified: boolean;
  }[];
}

export interface ActivityLogEntry {
  id: string;
  timestamp: string;
  user: string;
  action: string;
  module: string;
  jobId?: string;
  jobNo?: string;
  details: string;
}

// Checksheet specific state models
export interface FlangeCheckItem {
  id: string;
  jobId: string;
  no: number;
  locationBlindTagNo: string;
  checks: {
    cleanFlange: 'Y' | 'N' | 'NA';
    cleanNewGasket: 'Y' | 'N' | 'NA';
    correctGasketSpec: 'Y' | 'N' | 'NA';
    correctBoltRating: 'Y' | 'N' | 'NA';
    correctBoltMaterial: 'Y' | 'N' | 'NA';
    applyThreadLube: 'Y' | 'N' | 'NA';
    boltSequence: 'Y' | 'N' | 'NA';
    correctTightness: 'Y' | 'N' | 'NA';
  };
  checkDate: string;
  signature: string;
}

export interface EquipmentClosingData {
  jobId: string;
  hxRows: {
    id: string;
    description: string;
    checked: boolean;
    pes: { name: string; date: string; isNA: boolean };
    tss: { name: string; date: string; isNA: boolean };
    ops: { name: string; date: string; isNA: boolean };
  }[];
  vesselRows: {
    id: string;
    description: string;
    checked: boolean;
    pes: { name: string; date: string; isNA: boolean };
    tss: { name: string; date: string; isNA: boolean };
    ops: { name: string; date: string; isNA: boolean };
  }[];
  manholesCleaned: boolean;
  fmeSweepDone: boolean;
  deBlindComplete: boolean;
}

export interface TurnoverEventRecord {
  id: string;
  eventCode: string;
  eventName: string;
  eventType: string;
  plant: 'Phra Khanong' | 'Sriracha' | 'All Plants';
  targetUnits: string[];
  startDate: string;
  targetTurnoverDate: string;
  milestone?: string;
  coordinator?: string;
  description?: string;
  status: 'Planning' | 'Active' | 'Turnover Phase' | 'Completed';
  createdAt: string;
}

export const INITIAL_SHARED_EVENTS: TurnoverEventRecord[] = [
  {
    id: 'evt-101',
    eventCode: 'EVT-PK-2026-TA1',
    eventName: 'Annual Turnaround 2026',
    eventType: 'Annual Turnaround (TA)',
    plant: 'Phra Khanong',
    targetUnits: ['S1 - CCR, SRU, TGCU, Utility', 'S2 - APS-1, APS-2, FCCU, GOHF-3'],
    startDate: '2026-09-20',
    targetTurnoverDate: '2026-10-15',
    milestone: 'Full Crude & Reforming Circuit Ready for Startup (RFSU)',
    coordinator: 'นายวิชัย เลิศวิทยา (Lead Turnaround Supervisor)',
    description: 'Annual refinery turnaround covering crude overhead condensers, naphtha stabilizer reboilers, and pressure vessel statutory inspections.',
    status: 'Turnover Phase',
    createdAt: '2026-09-01'
  },
  {
    id: 'evt-102',
    eventCode: 'EVT-SR-2026-Q3',
    eventName: 'Major Overhaul Q3',
    eventType: 'Major Overhaul',
    plant: 'Sriracha',
    targetUnits: ['S2 - APS-1, APS-2, FCCU, GOHF-3', 'S3 - Offsite, Jetty'],
    startDate: '2026-09-25',
    targetTurnoverDate: '2026-10-10',
    milestone: 'Vacuum Pipestill 2 & Transfer Pump Mechanical Completion',
    coordinator: 'นายสมชาย ใจมั่น (Lead Mechanical / Static Engineer)',
    description: 'Q3 Sriracha major mechanical overhaul for Vacuum Pipestill 2 complex, residue feed pumps, and transfer line tie-ins.',
    status: 'Active',
    createdAt: '2026-09-10'
  },
  {
    id: 'evt-103',
    eventCode: 'EVT-PK-2026-Q4',
    eventName: 'Major Overhaul Q4 2026',
    eventType: 'Major Overhaul',
    plant: 'Phra Khanong',
    targetUnits: ['S2 - APS-1, APS-2, FCCU, GOHF-3'],
    startDate: '2026-10-01',
    targetTurnoverDate: '2026-10-28',
    milestone: 'Desalter Electrostatic Grid & Pre-Heat Train Box-Up',
    coordinator: 'นายณัฐพล ชัยชนะ (Lead Instrument & Control Engineer)',
    description: 'Scheduled Q4 overhaul for Desalter vessel electrostatic grids, crude pre-heat train cleaning, and control valve calibration.',
    status: 'Active',
    createdAt: '2026-09-15'
  },
  {
    id: 'evt-104',
    eventCode: 'EVT-SR-2026-VAC',
    eventName: 'TA-2026 Vacuum Overhaul',
    eventType: 'Unit Pit-Stop / Mini-TA',
    plant: 'Sriracha',
    targetUnits: ['S2 - APS-1, APS-2, FCCU, GOHF-3'],
    startDate: '2026-10-05',
    targetTurnoverDate: '2026-10-22',
    milestone: 'Vacuum Heater & Ejector System Tightness Test',
    coordinator: 'นายเกรียงไกร เก่งวิชา (Refinery Operations Unit Lead)',
    description: 'Dedicated vacuum unit turnaround focusing on heater decoking, steam ejector nozzles, and overhead condenser bundle replacement.',
    status: 'Planning',
    createdAt: '2026-09-18'
  }
];

// ==========================================
// INITIAL BASE DATA
// ==========================================

export const INITIAL_SHARED_JOBS: JobRecord[] = [
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
    assetTag: '11-E-101A / 11-C-101',
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
      { name: 'Overhead_Condenser_Inspection_Report.pdf', size: '2.4 MB', type: 'pdf', uploadedAt: '2026-09-24 10:15' },
      { name: 'Flange_Bolt_Torque_Cert_Signed.pdf', size: '890 KB', type: 'pdf', uploadedAt: '2026-09-24 11:30' }
    ],
    signatures: [
      { id: 'sig-1', jobId: 'job-101', role: 'Operation', name: 'Kitti Chai (Operations Supt)', decision: 'Accept', signedAt: '2026-09-28 09:30' },
      { id: 'sig-2', jobId: 'job-101', role: 'Job Owner', name: 'Somchai Prasert (Lead Mech Eng)', decision: 'Accept', signedAt: '2026-09-28 11:15' }
    ],
    punchList: [
      {
        id: 'PNC-1101',
        jobId: 'job-101',
        item: 'PL-11-001',
        itemType: 'Punch',
        type: 'Flange Leaks / Gasket',
        locationRef: 'Nozzle N1 Suction Flange #4 (11-E-101A)',
        testMethod: 'Bolt Torque (280 Nm) & Vacuum Test',
        category: 'A',
        punchCategory: 'A',
        punchStatus: 'Closed',
        discipline: 'M - Mechanical',
        contractor: 'Rotary Engineering Co., Ltd.',
        remedialWorks: 'Replace cracked spiral wound gasket on suction nozzle N1 of 11-E-101A and re-torque to 280 Nm.',
        description: 'Replace cracked spiral wound gasket on suction nozzle N1 of 11-E-101A and re-torque to 280 Nm.',
        planDate: '2026-09-24',
        plannedDate: '2026-09-24',
        cpSign: 'M. Tanawat',
        cpDate: '2026-09-25',
        isContractorClosed: true,
        closedBy: 'M. Tanawat (Rotary Lead)',
        closedDate: '2026-09-25',
        isVerified: true,
        verifiedBy: 'Somchai Prasert (Job Lead)',
        verificationTimestamp: '2026-09-25 14:00',
        photoRequired: true,
        status: 'Resolved',
        reportedBy: 'J. Somchai (OPS Lead)',
        timestamp: '2026-09-24 10:10',
        resolutionComment: 'New 316SS spiral wound gasket installed, cross-pattern torqued to 280 Nm. Vacuum leak test passed.',
        resolvedAt: '2026-09-25 14:00'
      },
      {
        id: 'BUTT-1102',
        jobId: 'job-101',
        item: 'BL-11-002',
        itemType: 'Butt',
        type: 'Tube-to-Tubesheet Expansion & Seal Weld',
        locationRef: 'Tube Bundle Pass 2 (Row 14 Col 08-12)',
        testMethod: 'Eddy Current (ECT) & Pneumatic Shell Test',
        category: 'A',
        punchCategory: 'A',
        punchStatus: 'Closed',
        discipline: 'M - Mechanical',
        contractor: 'BCP Maintenance Team (ฝ่ายซ่อมบำรุงโรงกลั่น)',
        remedialWorks: 'Re-tubing & hydraulic roller expansion on 5 condenser tubes (Row 14 Col 08-12) + tapered SS316L plug weld on Row 06 Col 19 after ECT >60% wall loss.',
        description: 'Re-tubing & hydraulic roller expansion on 5 condenser tubes (Row 14 Col 08-12) + tapered SS316L plug weld on Row 06 Col 19 after ECT >60% wall loss.',
        planDate: '2026-09-26',
        plannedDate: '2026-09-26',
        cpSign: 'Sompong K.',
        cpDate: '2026-09-27',
        isContractorClosed: true,
        closedBy: 'Sompong K. (Exchanger Specialist)',
        closedDate: '2026-09-27',
        isVerified: true,
        verifiedBy: 'Somchai Prasert (Job Lead)',
        verificationTimestamp: '2026-09-27 16:30',
        photoRequired: true,
        status: 'Resolved',
        reportedBy: 'Dr. Anan S. (TSS QA)',
        timestamp: '2026-09-25 09:20',
        resolutionComment: '5 new SA-214 tubes expanded and 1 tube plugged; shell-side hydrotest held at 18.5 barg for 4 hrs with zero weep.',
        resolvedAt: '2026-09-27 16:30'
      },
      {
        id: 'BUTT-1103',
        jobId: 'job-101',
        item: 'BL-11-003',
        itemType: 'Butt',
        type: 'Piping Butt Weld NDT & Post-Hydro Insulation',
        locationRef: 'Overhead Vapor Spool Butt Joint BW-104 (16" Sch40)',
        testMethod: '100% Radiography (RT) & Dye Penetrant (PT)',
        category: 'B',
        punchCategory: 'B',
        punchStatus: 'Closed',
        discipline: 'M - Mechanical',
        contractor: 'Toyo-Thai Corporation',
        remedialWorks: 'Complete 100% RT film review on overhead condenser tie-in butt weld BW-104 and reinstall thermal insulation collar after hydrotest.',
        description: 'Complete 100% RT film review on overhead condenser tie-in butt weld BW-104 and reinstall thermal insulation collar after hydrotest.',
        planDate: '2026-09-27',
        plannedDate: '2026-09-27',
        cpSign: 'Wichai T.',
        cpDate: '2026-09-28',
        isContractorClosed: true,
        closedBy: 'Wichai T. (NDT Coordinator)',
        closedDate: '2026-09-28',
        isVerified: true,
        verifiedBy: 'Somchai Prasert (Job Lead)',
        verificationTimestamp: '2026-09-28 08:45',
        photoRequired: false,
        status: 'Resolved',
        reportedBy: 'Pongsakorn K. (QA Inspector)',
        timestamp: '2026-09-26 11:00',
        resolutionComment: 'RT Film #RT-101-BW104 accepted per ASME VIII Div.1. Insulation collar restored.',
        resolvedAt: '2026-09-28 08:45'
      }
    ],
    createdAt: '2026-09-24'
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
      { name: 'Seal_Plan53A_Alignment_Sheet.pdf', size: '1.2 MB', type: 'pdf', uploadedAt: '2026-09-27 09:00' }
    ],
    signatures: [
      { id: 'sig-3', jobId: 'job-102', role: 'Operation', name: 'Nattapong V. (OPS)', decision: 'Accept', signedAt: '2026-09-29 14:00' }
    ],
    punchList: [
      {
        id: 'p-2',
        jobId: 'job-102',
        item: 'PL-11-002',
        type: 'Missing Safety Guard',
        category: 'A',
        discipline: 'M',
        description: 'Coupling safety guard missing 2 grounding bolts on pump P-102A',
        contractor: 'Sriracha Construction PCL',
        planDate: '2026-09-29',
        cpSign: '',
        cpDate: '',
        photoRequired: true,
        status: 'Open',
        reportedBy: 'Safety Officer P.',
        timestamp: '2026-09-29 15:30'
      },
      {
        id: 'p-3',
        jobId: 'job-102',
        item: 'PL-11-003',
        type: 'Touch-up Painting',
        category: 'C',
        discipline: 'PA',
        description: 'Primer peeling off suction piping spool after insulation strip',
        contractor: 'Best Insulation Services Co.',
        planDate: '2026-09-30',
        cpSign: '',
        cpDate: '',
        photoRequired: false,
        status: 'Open',
        reportedBy: 'Inspector Korn',
        timestamp: '2026-09-29 16:00'
      }
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
    plotPlanId: 'plan-aps1',
    attachments: [
      { name: 'Grid_Voltage_Calibration_Log.pdf', size: '3.1 MB', type: 'pdf', uploadedAt: '2026-09-28 14:00' }
    ],
    signatures: [
      { id: 'sig-4', jobId: 'job-103', role: 'Operation', name: 'Tanin S. (OPS Lead)', decision: 'Accept', signedAt: '2026-09-30 10:15' },
      { id: 'sig-5', jobId: 'job-103', role: 'Job Owner', name: 'Somchai Prasert, PE', decision: 'Accept', signedAt: '2026-09-30 11:30' }
    ],
    punchList: [],
    createdAt: '2026-09-28'
  },
  {
    id: 'job-104',
    jobNo: 'TO-PK-2026-012',
    title: 'Naphtha Splitter Reboiler 11-E-104 Channel Head Box-up',
    eventName: 'Annual Turnaround 2026',
    plant: 'Phra Khanong',
    unit: 'APS-1 (Atmospheric Distillation Unit 1)',
    unitId: 'unit-aps1',
    system: 'System-14 (Naphtha Stabilizer & Splitter Train)',
    systemId: 'sys-14',
    workOrder: 'WO-885104',
    description: 'Channel head pass partition gasket replacement, ultrasonic bolt stress testing, and FME visual sweep before final box-up endorsement.',
    assetTag: '11-E-104',
    assetDescription: 'Naphtha Splitter Thermosiphon Reboiler',
    refCode: '10-18',
    isCriticalPath: false,
    gridZone: 'B2',
    attachments: [],
    signatures: [],
    punchList: [
      {
        id: 'p-4',
        jobId: 'job-104',
        item: 'PL-11-004',
        type: 'FME Verification',
        category: 'A',
        description: 'Channel head shell foreign material sweep incomplete; awaiting final borescope check',
        status: 'Open',
        reportedBy: 'Kamonrat P. (Safety)',
        timestamp: '2026-09-30 13:00'
      }
    ],
    createdAt: '2026-09-29'
  },
  {
    id: 'job-105',
    jobNo: 'TO-PK-2026-015',
    title: 'Raw Crude Booster Pump S2-P-101A/B API 682 Mechanical Seal & Suction Strainer Handover',
    eventName: 'Annual Turnaround 2026',
    plant: 'Phra Khanong',
    unit: 'APS-1 (Atmospheric Distillation Unit 1)',
    unitId: 'unit-aps1',
    system: 'System-11 (Crude Feed Preheat & Desalter System)',
    systemId: 'sys-11',
    workOrder: 'WO-885219',
    description: 'Complete overhaul of Raw Crude Booster Pumps S2-P-101A/B, installation of API 682 Plan 53B seal skid, laser alignment, and final turnover acceptance.',
    assetTag: 'S2-P-101A/B',
    assetDescription: 'Raw Crude Booster Pumps & Plan 53B Seal Skid',
    refCode: '10-34',
    hierarchyNodeId: 'unit-aps1-eq-S2_P_101A_B-4',
    hierarchyLevel: 'Level 3 • Equipment',
    hierarchyPath: 'APS-1 > System-11 > S2-P-101A/B',
    isCriticalPath: false,
    gridZone: 'B1',
    plotPlanX: 34.0,
    plotPlanY: 41.5,
    plotPlanId: 'plan-aps1',
    discipline: 'M - Mechanical',
    equipmentType: 'Rotating Equipment',
    jobLead: 'นายสมชาย ใจมั่น (Lead Mechanical Engineer)',
    attachments: [
      { name: 'Laser_Alignment_Certificate_P101AB.pdf', size: '1.5 MB', type: 'pdf', uploadedAt: '2026-09-29 16:20' }
    ],
    signatures: [
      { id: 'sig-105-1', jobId: 'job-105', role: 'Operations (ฝ่ายปฏิบัติการผลิต)', name: 'Kitti Chai (Operations Supt)', decision: 'Accept', signedAt: '2026-09-30 09:00', acceptanceStatus: 'Accepted' },
      { id: 'sig-105-2', jobId: 'job-105', role: 'QA-QC (ฝ่ายตรวจสอบและควบคุมคุณภาพ)', name: 'Dr. Anan S. (TSS QA)', decision: 'Accept', signedAt: '2026-09-30 10:30', acceptanceStatus: 'Accepted' },
      { id: 'sig-105-3', jobId: 'job-105', role: 'Lead Turnaround Engineer (หัวหน้าวิศวกรผู้รับมอบ)', name: 'Somchai Prasert, PE', decision: 'Accept', signedAt: '2026-09-30 11:45', acceptanceStatus: 'Accepted' }
    ],
    punchList: [],
    acceptanceStatus: 'Accepted',
    turnoverStatus: 'Completed',
    createdAt: '2026-09-26'
  },
  {
    id: 'job-106',
    jobNo: 'TO-SR-2026-009',
    title: 'HCU Feed Preheat Exchanger Bank A (E-204) High-Pressure Breech-Lock Closure & Hydro-test',
    eventName: 'Major Overhaul Q3',
    plant: 'Sriracha',
    unit: 'HCU Unit 4 (Hydrocracker Area)',
    unitId: 'floc-sr-area-hcu',
    system: 'SR-HCU-SYS-PREHEAT (Feed Preheat Exchanger Train)',
    systemId: 'floc-sr-sys-preheat',
    workOrder: 'WO-886410',
    description: 'High-pressure 160 bar shell & tube bundle extraction, eddy current inspection, diaphragm gasket renewal, and hydraulic bolt tensioning on E-204.',
    assetTag: 'E-204',
    assetDescription: 'HCU Feed Preheat Exchanger Bank A (350°C / 160 bar)',
    refCode: 'SR-HCU-EQ-E204',
    hierarchyNodeId: 'floc-sr-eq-e204',
    hierarchyLevel: 'Level 3 • Equipment',
    hierarchyPath: 'SR-AREA-HCU > SR-HCU-SYS-PREHEAT > E-204',
    isCriticalPath: true,
    gridZone: 'D4',
    plotPlanX: 50.8,
    plotPlanY: 57.5,
    plotPlanId: 'plan-overall',
    discipline: 'M - Mechanical',
    equipmentType: 'Static Equipment',
    jobLead: 'นายวิชัย เลิศวิทยา (Lead Turnaround Supervisor)',
    attachments: [
      { name: 'E204_160Bar_Hydrotest_Chart.pdf', size: '2.8 MB', type: 'pdf', uploadedAt: '2026-09-30 08:45' }
    ],
    signatures: [
      { id: 'sig-106-1', jobId: 'job-106', role: 'Operations (ฝ่ายปฏิบัติการผลิต)', name: 'Nattapong V. (OPS Lead)', decision: 'Accept', signedAt: '2026-09-30 13:20', acceptanceStatus: 'Accepted' },
      { id: 'sig-106-2', jobId: 'job-106', role: 'QA-QC (ฝ่ายตรวจสอบและควบคุมคุณภาพ)', name: 'Pongsakorn K. (QA Inspector)', decision: 'Accept', signedAt: '2026-09-30 14:10', acceptanceStatus: 'Accepted' }
    ],
    punchList: [
      {
        id: 'p-106-1',
        jobId: 'job-106',
        item: 'PL-04-001',
        type: 'Touch-up Painting',
        category: 'B',
        discipline: 'Ins',
        description: 'Install aluminum cladding weather shield on E-204 channel head acoustic insulation after hot bolting check.',
        contractor: 'Sriracha Thermal Insulation Co.',
        planDate: '2026-10-04',
        status: 'Open',
        reportedBy: 'Pongsakorn K. (QA)',
        timestamp: '2026-09-30 14:30'
      }
    ],
    createdAt: '2026-09-28'
  }
];

export const INITIAL_APPROVAL_TASKS: InspectionApprovalTask[] = [
  {
    id: 'task-101',
    jobId: 'job-101',
    taskCode: 'APP-CL-1101',
    title: 'Heat Exchanger Bundle & Shell Box Up Acceptance (Appendix A & B)',
    tabKey: 'tab1',
    tabName: '1. Equipment Closing',
    equipmentNo: '11-E-101A',
    systemNo: 'SYS-11-CRUDE-01',
    unitNo: 'Unit 11',
    initiator: 'Narong B. (Field Sup)',
    assignedRole: 'PES Engineer',
    approverName: 'Eng. Somchai Prasert',
    submissionDate: '2026-09-24 09:30',
    approvalDate: '2026-09-24 14:15',
    status: 'Approved',
    priority: 'Critical',
    comments: 'Tube bundle cleanliness inspected with video borescope. Pass partition plate seal verified intact.',
    criteria: [
      { label: 'Bundle cleaning acceptance verified', verified: true },
      { label: 'Shell internal cleaning free of debris/FME', verified: true },
      { label: 'Flange Police QA torque verified to 280 Nm', verified: true },
      { label: 'De-blind certificate signed', verified: true }
    ]
  },
  {
    id: 'task-102',
    jobId: 'job-101',
    taskCode: 'APP-CL-1102',
    title: 'Crude Fractionator Tower 11-C-101 Manhole Closure Endorsement',
    tabKey: 'tab1',
    tabName: '1. Equipment Closing',
    equipmentNo: '11-C-101',
    systemNo: 'SYS-11-CRUDE-01',
    unitNo: 'Unit 11',
    initiator: 'W. Prasert (ME Leader)',
    assignedRole: 'OPS Lead',
    approverName: 'J. Somchai (OPS)',
    submissionDate: '2026-09-24 11:00',
    approvalDate: '',
    status: 'Pending',
    priority: 'Critical',
    comments: 'Awaiting final foreign material exclusion (FME) sweep inside tray #22 before closing TOP manhole.',
    criteria: [
      { label: 'Tray clamps tightness verified 100%', verified: true },
      { label: 'Bottom manhole closure accepted', verified: true },
      { label: 'Middle manhole closure accepted', verified: true },
      { label: 'Final top manhole closure sweep', verified: false }
    ]
  },
  {
    id: 'task-103',
    jobId: 'job-101',
    taskCode: 'APP-PL-1103',
    title: 'Category A Punch List Pre-Turnover Clearance Review',
    tabKey: 'tab2',
    tabName: '2. Punch & Butt List',
    equipmentNo: '11-E-101A / 11-C-101',
    systemNo: 'SYS-11-CRUDE-01',
    unitNo: 'Unit 11',
    initiator: 'Kamonrat P. (Safety)',
    assignedRole: 'TSS Inspector',
    approverName: 'Dr. Anan S. (TSS)',
    submissionDate: '2026-09-24 13:00',
    approvalDate: '2026-09-24 16:30',
    status: 'Approved',
    priority: 'High',
    comments: 'Item PL-11-001 gasket replaced and pressure tested; remaining Cat A items verified resolved.',
    criteria: [
      { label: 'Zero open Category A punch items', verified: true },
      { label: 'Contractor remedial works signed off (CP Sign)', verified: true },
      { label: 'NDE / RT examination records archived', verified: true }
    ]
  },
  {
    id: 'task-104',
    jobId: 'job-101',
    taskCode: 'APP-FL-1104',
    title: 'Overhead Vapor Line Flange Joint Tightness QA Approval',
    tabKey: 'tab3',
    tabName: '3. Flange Quality',
    equipmentNo: '11-C-101 (16" 150#)',
    systemNo: 'SYS-11-CRUDE-01',
    unitNo: 'Unit 11',
    initiator: 'Somboon S. (Mechanic)',
    assignedRole: 'Turnover Lead',
    approverName: 'Somchai Prasert, PE',
    submissionDate: '2026-09-24 14:00',
    approvalDate: '2026-09-24 15:45',
    status: 'Approved',
    priority: 'High',
    comments: 'Flange faces cleaned, new spiral gasket verified, cross-pattern bolt sequence executed with calibrated torque wrench.',
    criteria: [
      { label: 'หน้าแปลนสะอาด สภาพดี', verified: true },
      { label: 'ประเก็นใหม่และสะอาด', verified: true },
      { label: 'ชนิด ขนาด ของประเก็นถูกต้องตามกำหนด', verified: true },
      { label: 'ประกอบน็อตตามลำดับ (bolt sequence)', verified: true }
    ]
  },
  {
    id: 'task-105',
    jobId: 'job-101',
    taskCode: 'APP-TO-1105',
    title: 'Final System Turnover & Custody Transfer Certificate Authorization',
    tabKey: 'tab4',
    tabName: '4. Turnover Certificate',
    equipmentNo: 'SYS-11-CRUDE-01 Complex',
    systemNo: 'SYS-11-CRUDE-01',
    unitNo: 'Unit 11',
    initiator: 'Somchai Prasert, PE',
    assignedRole: 'SD Manager',
    approverName: 'Dr. Wichai Thongchai',
    submissionDate: '2026-09-24 15:00',
    approvalDate: '',
    status: 'Pending',
    priority: 'Critical',
    comments: 'All Stage 1-3 deliverables satisfied with documented carry-over exceptions in turnover register.',
    criteria: [
      { label: 'Turnover Lead prepared & digitally signed', verified: true },
      { label: 'Authorized exception list documented', verified: true },
      { label: 'De-blind clearance & Flange Police complete', verified: true },
      { label: 'SD Manager executive final sign-off', verified: false }
    ]
  }
];

// ==========================================
// CONTEXT INTERFACE
// ==========================================

export interface PlantTurnSharedContextType {
  jobs: JobRecord[];
  setJobs: React.Dispatch<React.SetStateAction<JobRecord[]>>;
  selectedJobId: string;
  selectedJob: JobRecord;
  setSelectedJobId: (id: string) => void;

  // Event Registry CRUD
  events: TurnoverEventRecord[];
  createEvent: (eventData: Partial<TurnoverEventRecord>) => TurnoverEventRecord;
  updateEvent: (eventId: string, updates: Partial<TurnoverEventRecord>) => void;
  deleteEvent: (eventId: string) => void;
  checkEventExists: (nameOrCode: string, excludeId?: string) => boolean;

  // Job CRUD
  createJob: (jobData: Partial<JobRecord>) => JobRecord;
  updateJob: (jobId: string, updates: Partial<JobRecord>) => void;
  deleteJob: (jobId: string) => void;
  checkJobIdExists: (jobIdOrNo: string, excludeId?: string) => boolean;
  batchCreateJobs: (newJobs: JobRecord[]) => {
    success: boolean;
    addedCount: number;
    duplicateCount: number;
    duplicates: string[];
    error?: string;
  };

  // Punch List Operations (Single Source of Truth)
  addPunchItem: (jobId: string, punch: Partial<PunchItem>) => PunchItem;
  updatePunchItem: (jobId: string, punchId: string, updates: Partial<PunchItem>) => void;
  deletePunchItem: (jobId: string, punchId: string) => void;

  // Signature & Endorsements
  addSignature: (jobId: string, signature: Partial<SignatureRecord>) => SignatureRecord;
  removeSignature: (jobId: string, signatureId: string) => void;

  // Approval Tasks Hub
  approvalTasks: InspectionApprovalTask[];
  approveTask: (taskId: string, approverName: string, comment?: string) => void;
  rejectTask: (taskId: string, approverName: string, reason: string) => void;
  updateTaskCriteria: (taskId: string, criteriaIndex: number, verified: boolean) => void;

  // Status & Validation Rules
  isJobCompleted: (job: JobRecord) => boolean;
  isJobTurnoverBlocked: (jobId: string) => { blocked: boolean; openCatACount: number; reasons: string[] };
  canIssueTurnoverCertificate: (jobId: string) => { canIssue: boolean; openCatACount: number; missingSignatures: string[]; reasons: string[] };

  // Activity Logs
  activityLogs: ActivityLogEntry[];
  logActivity: (action: string, module: string, details: string, jobId?: string, jobNo?: string) => void;

  // Quick reset for testing
  resetToDefaultData: () => void;
}

const PlantTurnSharedContext = createContext<PlantTurnSharedContextType | undefined>(undefined);

// ==========================================
// PROVIDER COMPONENT
// ==========================================

export const normalizeJobRecord = (j: any): JobRecord => {
  const fallbackId = j.id || `job-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
  const fallbackJobNo = (j.jobNo || j.orderNo || j.id || 'JOB-UNKNOWN').toString().trim();
  const fallbackTitle = j.title || j.jobDescription || j.description || j.scopeSummary || `${fallbackJobNo} Turnover Package`;
  return {
    id: fallbackId,
    jobNo: fallbackJobNo,
    title: fallbackTitle,
    eventName: j.eventName || 'Annual Turnaround 2026',
    plant: j.plant === 'Sriracha' ? 'Sriracha' : 'Phra Khanong',
    unit: j.unit || j.area || 'APS-1 (Atmospheric Distillation Unit 1)',
    unitId: j.unitId,
    system: j.system || j.turnoverSystem || 'General System',
    systemId: j.systemId,
    workOrder: j.workOrder || j.jobNo || '',
    description: j.description || j.jobDescription || fallbackTitle,
    assetTag: j.assetTag || fallbackJobNo,
    assetDescription: j.assetDescription || fallbackTitle,
    refCode: j.refCode,
    hierarchyNodeId: j.hierarchyNodeId,
    hierarchyLevel: j.hierarchyLevel || 'Level 3 • Equipment',
    hierarchyPath: j.hierarchyPath,
    isCriticalPath: Boolean(j.isCriticalPath),
    gridZone: j.gridZone || 'B2',
    plotPlanX: typeof j.plotPlanX === 'number' ? j.plotPlanX : 50,
    plotPlanY: typeof j.plotPlanY === 'number' ? j.plotPlanY : 50,
    plotPlanId: j.plotPlanId,
    plotPlanRadius: j.plotPlanRadius,
    plotPlanWidth: j.plotPlanWidth,
    plotPlanHeight: j.plotPlanHeight,
    plotPlanRotation: j.plotPlanRotation,
    markingType: j.markingType || 'pin',
    attachments: Array.isArray(j.attachments) ? j.attachments : [],
    signatures: Array.isArray(j.signatures) ? j.signatures : [],
    punchList: Array.isArray(j.punchList) ? j.punchList : [],
    createdAt: j.createdAt || new Date().toISOString().slice(0, 10),
    targetStartDate: j.targetStartDate,
    plannedTurnoverDate: j.plannedTurnoverDate,
    equipmentType: j.equipmentType,
    discipline: j.discipline,
    turnoverSystem: j.turnoverSystem,
    jobLead: j.jobLead,
    jobSupervisor: j.jobSupervisor
  };
};

const STORAGE_KEYS = {
  JOBS: 'plantturn_shared_jobs_v3',
  EVENTS: 'plantturn_shared_events_v1',
  SELECTED_JOB_ID: 'plantturn_selected_job_id_v3',
  TASKS: 'plantturn_approval_tasks_v3',
  LOGS: 'plantturn_activity_logs_v3'
};

export const PlantTurnSharedProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  // Load persisted events or fallback to initial events
  const [events, setEvents] = useState<TurnoverEventRecord[]>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem(STORAGE_KEYS.EVENTS);
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed) && parsed.length > 0) {
            return parsed;
          }
        }
      } catch (err) {
        console.warn('Failed to parse saved events from localStorage', err);
      }
    }
    return INITIAL_SHARED_EVENTS;
  });

  // Load persisted jobs or fallback to initial data, always normalized
  const [jobs, setJobsState] = useState<JobRecord[]>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem(STORAGE_KEYS.JOBS);
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed) && parsed.length > 0) {
            const normalizedSaved = parsed.map(normalizeJobRecord);
            const savedIds = new Set(normalizedSaved.map(j => j.id));
            const missingSeedJobs = INITIAL_SHARED_JOBS
              .filter(seed => !savedIds.has(seed.id))
              .map(normalizeJobRecord);
            return [...normalizedSaved, ...missingSeedJobs];
          }
        }
      } catch (err) {
        console.warn('Failed to parse saved jobs from localStorage', err);
      }
    }
    return INITIAL_SHARED_JOBS.map(normalizeJobRecord);
  });

  const setJobs = (newJobsOrFn: JobRecord[] | ((prev: JobRecord[]) => JobRecord[])) => {
    setJobsState(prev => {
      const next = typeof newJobsOrFn === 'function' ? newJobsOrFn(prev) : newJobsOrFn;
      return Array.isArray(next) ? next.map(normalizeJobRecord) : prev;
    });
  };

  // Selected Job ID
  const [selectedJobId, setSelectedJobIdState] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(STORAGE_KEYS.SELECTED_JOB_ID);
      if (saved) return saved;
    }
    return INITIAL_SHARED_JOBS[0].id;
  });

  // Approval Tasks
  const [approvalTasks, setApprovalTasks] = useState<InspectionApprovalTask[]>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem(STORAGE_KEYS.TASKS);
        if (saved) return JSON.parse(saved);
      } catch (err) {
        console.warn('Failed to parse approval tasks', err);
      }
    }
    return INITIAL_APPROVAL_TASKS;
  });

  // Activity Logs
  const [activityLogs, setActivityLogs] = useState<ActivityLogEntry[]>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem(STORAGE_KEYS.LOGS);
        if (saved) return JSON.parse(saved);
      } catch (err) {
        console.warn('Failed to parse activity logs', err);
      }
    }
    return [
      {
        id: 'log-init-1',
        timestamp: new Date().toISOString().replace('T', ' ').slice(0, 16),
        user: 'System Boot',
        action: 'System Initialized',
        module: 'Core System',
        details: 'PlantTurn Single Source of Truth Shared Data Store mounted.'
      }
    ];
  });

  // Persist jobs on changes and broadcast update event
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.JOBS, JSON.stringify(jobs));
    } catch (err) {
      console.error('Storage write error for jobs', err);
    }
  }, [jobs]);

  // Persist events on changes
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.EVENTS, JSON.stringify(events));
    } catch (err) {
      console.error('Storage write error for events', err);
    }
  }, [events]);

  // Synchronize across tabs and custom broadcast events
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === STORAGE_KEYS.JOBS && e.newValue) {
        try {
          const parsed = JSON.parse(e.newValue);
          if (Array.isArray(parsed)) {
            setJobs(parsed);
          }
        } catch (err) {
          console.warn('Failed to sync jobs from storage event', err);
        }
      }
    };

    const handleCustomBroadcast = () => {
      try {
        const saved = localStorage.getItem(STORAGE_KEYS.JOBS);
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed)) {
            setJobs(parsed);
          }
        }
      } catch (err) {
        console.warn('Failed to reload jobs on custom broadcast event', err);
      }
    };

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('plantturn_jobs_updated', handleCustomBroadcast);
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('plantturn_jobs_updated', handleCustomBroadcast);
    };
  }, []);

  // Persist selectedJobId
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.SELECTED_JOB_ID, selectedJobId);
    } catch (err) {
      console.error('Storage write error for selectedJobId', err);
    }
  }, [selectedJobId]);

  // Persist approval tasks
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.TASKS, JSON.stringify(approvalTasks));
    } catch (err) {
      console.error('Storage write error for approvalTasks', err);
    }
  }, [approvalTasks]);

  // Persist logs
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.LOGS, JSON.stringify(activityLogs.slice(-200)));
    } catch (err) {
      console.error('Storage write error for logs', err);
    }
  }, [activityLogs]);

  // Current active job
  const selectedJob = useMemo(() => {
    return jobs.find(j => j.id === selectedJobId) || jobs[0] || INITIAL_SHARED_JOBS[0];
  }, [jobs, selectedJobId]);

  const setSelectedJobId = (id: string) => {
    const jobExists = jobs.some(j => j.id === id);
    if (jobExists) {
      setSelectedJobIdState(id);
    } else if (jobs.length > 0) {
      setSelectedJobIdState(jobs[0].id);
    }
  };

  // Activity logger helper
  const logActivity = (action: string, module: string, details: string, jobId?: string, jobNo?: string) => {
    const newEntry: ActivityLogEntry = {
      id: `act-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      timestamp: new Date().toISOString().replace('T', ' ').slice(0, 16),
      user: 'Current User',
      action,
      module,
      jobId: jobId || selectedJobId,
      jobNo: jobNo || selectedJob.jobNo,
      details
    };
    setActivityLogs(prev => [newEntry, ...prev.slice(0, 199)]);
  };

  // Check if Job ID or Job Number already exists (prevents duplicates)
  const checkJobIdExists = (jobIdOrNo: string, excludeId?: string): boolean => {
    if (!jobIdOrNo || !jobIdOrNo.trim()) return false;
    const target = jobIdOrNo.trim().toLowerCase();
    return jobs.some(j => {
      if (excludeId && (j.id === excludeId || j.jobNo === excludeId)) return false;
      return (
        (j.jobNo && j.jobNo.trim().toLowerCase() === target) ||
        (j.id && j.id.trim().toLowerCase() === target)
      );
    });
  };

  // Check if Event Name or Event Code already exists
  const checkEventExists = (nameOrCode: string, excludeId?: string): boolean => {
    if (!nameOrCode || !nameOrCode.trim()) return false;
    const target = nameOrCode.trim().toLowerCase();
    return events.some(ev => {
      if (excludeId && ev.id === excludeId) return false;
      return (
        ev.eventName.trim().toLowerCase() === target ||
        ev.eventCode.trim().toLowerCase() === target
      );
    });
  };

  // Event CRUD
  const createEvent = (eventData: Partial<TurnoverEventRecord>): TurnoverEventRecord => {
    const seq = events.length + 1;
    const plantCode = eventData.plant === 'Sriracha' ? 'SR' : eventData.plant === 'All Plants' ? 'ALL' : 'PK';
    const eventCode = (eventData.eventCode || `EVT-${plantCode}-2026-${String(seq).padStart(2, '0')}`).trim();
    const eventName = (eventData.eventName || `Turnaround Event ${seq}`).trim();

    const newEvent: TurnoverEventRecord = {
      id: eventData.id || `evt-${Date.now()}`,
      eventCode,
      eventName,
      eventType: eventData.eventType || 'Annual Turnaround (TA)',
      plant: eventData.plant || 'Phra Khanong',
      targetUnits: Array.isArray(eventData.targetUnits) && eventData.targetUnits.length > 0
        ? eventData.targetUnits
        : ['S2 - APS-1, APS-2, FCCU, GOHF-3'],
      startDate: eventData.startDate || new Date().toISOString().slice(0, 10),
      targetTurnoverDate: eventData.targetTurnoverDate || new Date(Date.now() + 86400000 * 14).toISOString().slice(0, 10),
      milestone: eventData.milestone || 'Mechanical Completion & Ready for Startup (RFSU)',
      coordinator: eventData.coordinator || 'นายวิชัย เลิศวิทยา (Lead Turnaround Supervisor)',
      description: eventData.description || '',
      status: eventData.status || 'Planning',
      createdAt: eventData.createdAt || new Date().toISOString().slice(0, 10)
    };

    setEvents(prev => [newEvent, ...prev]);
    logActivity('Create Event', 'Event & Job Management', `Created new event "${newEvent.eventName}" (${newEvent.eventCode}) for ${newEvent.plant}`);
    return newEvent;
  };

  const updateEvent = (eventId: string, updates: Partial<TurnoverEventRecord>) => {
    setEvents(prev => prev.map(ev => {
      if (ev.id !== eventId) return ev;
      const updated = { ...ev, ...updates };
      // If eventName changed, also update jobs referencing the old eventName
      if (updates.eventName && updates.eventName !== ev.eventName) {
        setJobs(prevJobs => prevJobs.map(j => j.eventName === ev.eventName ? { ...j, eventName: updates.eventName! } : j));
      }
      return updated;
    }));
    logActivity('Update Event', 'Event & Job Management', `Updated event ${eventId}`);
  };

  const deleteEvent = (eventId: string) => {
    const target = events.find(e => e.id === eventId);
    setEvents(prev => prev.filter(ev => ev.id !== eventId));
    if (target) {
      logActivity('Delete Event', 'Event & Job Management', `Removed event "${target.eventName}" (${target.eventCode})`);
    }
  };

  // Job CRUD
  const createJob = (jobData: Partial<JobRecord>): JobRecord => {
    const nextSeq = jobs.length + 1;
    const plantCode = jobData.plant === 'Sriracha' ? 'SR' : 'PK';
    const jobNo = (jobData.jobNo || `TO-${plantCode}-2026-${String(nextSeq).padStart(3, '0')}`).trim();

    // Duplicate Check: Block create if Job ID already exists!
    if (checkJobIdExists(jobNo)) {
      throw new Error(`รหัส Job ID "${jobNo}" มีอยู่ในระบบแล้ว ไม่สามารถสร้างซ้ำได้`);
    }

    const newId = jobData.id || `job-${Date.now()}`;

    const newJob: JobRecord = {
      id: newId,
      jobNo,
      title: jobData.title || `Turnover Job ${jobNo}`,
      eventName: jobData.eventName || 'Annual Turnaround 2026',
      plant: jobData.plant || 'Phra Khanong',
      unit: jobData.unit || 'APS-1 (Atmospheric Distillation Unit 1)',
      unitId: jobData.unitId || 'unit-aps1',
      system: jobData.system || 'System-11 (Crude Feed & Desalter)',
      systemId: jobData.systemId || 'sys-11',
      workOrder: jobData.workOrder || `WO-${Math.floor(100000 + Math.random() * 900000)}`,
      description: jobData.description || 'Turnaround maintenance and inspection scope.',
      assetTag: jobData.assetTag || 'TAG-NEW-01',
      assetDescription: jobData.assetDescription || jobData.title || 'Equipment Asset',
      refCode: jobData.refCode || '10-01',
      hierarchyNodeId: jobData.hierarchyNodeId,
      hierarchyLevel: jobData.hierarchyLevel,
      hierarchyPath: jobData.hierarchyPath,
      isCriticalPath: Boolean(jobData.isCriticalPath),
      gridZone: jobData.gridZone || 'B2',
      plotPlanX: jobData.plotPlanX || 50,
      plotPlanY: jobData.plotPlanY || 50,
      plotPlanId: jobData.plotPlanId || 'plan-aps1',
      attachments: jobData.attachments || [],
      signatures: jobData.signatures || [],
      punchList: jobData.punchList || [],
      createdAt: new Date().toISOString().slice(0, 10),
      targetStartDate: jobData.targetStartDate,
      plannedTurnoverDate: jobData.plannedTurnoverDate,
      equipmentType: jobData.equipmentType,
      discipline: jobData.discipline,
      turnoverSystem: jobData.turnoverSystem,
      jobLead: jobData.jobLead
    };

    const nextJobs = [newJob, ...jobs];
    setJobs(nextJobs);
    setSelectedJobIdState(newId);

    // Automatically generate inspection approval tasks for the newly created job
    const newTasks: InspectionApprovalTask[] = [
      {
        id: `task-${Date.now()}-1`,
        jobId: newId,
        taskCode: `APP-CL-${Math.floor(1000 + Math.random() * 9000)}`,
        title: `${newJob.assetTag || newJob.title} Equipment Closing & Box-up`,
        tabKey: 'tab1',
        tabName: '1. Equipment Closing',
        equipmentNo: newJob.assetTag || newJob.jobNo,
        systemNo: newJob.system,
        unitNo: newJob.unit,
        initiator: 'Maintenance Supervisor',
        assignedRole: 'PES Engineer',
        approverName: 'Eng. Somchai Prasert',
        submissionDate: new Date().toISOString().replace('T', ' ').slice(0, 16),
        approvalDate: '',
        status: 'Pending',
        priority: newJob.isCriticalPath ? 'Critical' : 'High',
        comments: `Initial box-up check for ${newJob.jobNo}`,
        criteria: [
          { label: 'Cleaning acceptance verified', verified: false },
          { label: 'FME foreign material sweep completed', verified: false },
          { label: 'De-blind certificate signed', verified: false }
        ]
      },
      {
        id: `task-${Date.now()}-2`,
        jobId: newId,
        taskCode: `APP-TO-${Math.floor(1000 + Math.random() * 9000)}`,
        title: `${newJob.jobNo} Final Turnover Certificate Authorization`,
        tabKey: 'tab4',
        tabName: '4. Turnover Certificate',
        equipmentNo: newJob.assetTag || newJob.jobNo,
        systemNo: newJob.system,
        unitNo: newJob.unit,
        initiator: 'Turnover Lead',
        assignedRole: 'SD Manager',
        approverName: 'Dr. Wichai Thongchai',
        submissionDate: new Date().toISOString().replace('T', ' ').slice(0, 16),
        approvalDate: '',
        status: 'Pending',
        priority: newJob.isCriticalPath ? 'Critical' : 'High',
        comments: 'Awaiting completion of all quality gates and punch list clearance.',
        criteria: [
          { label: 'Zero open Category A punch items', verified: false },
          { label: 'Dual Maintenance & Operations sign-offs verified', verified: false },
          { label: 'Turnover Lead certified', verified: false }
        ]
      }
    ];

    setApprovalTasks(prev => [...newTasks, ...prev]);

    // Persist and notify all modules immediately
    try {
      localStorage.setItem(STORAGE_KEYS.JOBS, JSON.stringify(nextJobs));
      window.dispatchEvent(new CustomEvent('plantturn_jobs_updated', { detail: { job: newJob } }));
    } catch (e) {
      console.error(e);
    }

    logActivity('Create Job', 'Job Location & Turnover', `Created new job ${newJob.jobNo} (${newJob.title})`, newId, newJob.jobNo);
    return newJob;
  };

  // Batch Create Jobs for Bulk Ingestion with Duplicate Check & Global Sync
  const batchCreateJobs = (incomingJobs: JobRecord[]): {
    success: boolean;
    addedCount: number;
    duplicateCount: number;
    duplicates: string[];
    error?: string;
  } => {
    if (!incomingJobs || incomingJobs.length === 0) {
      return { success: true, addedCount: 0, duplicateCount: 0, duplicates: [] };
    }

    const newJobs = incomingJobs.map(normalizeJobRecord);

    // 1. Build lookup sets for existing IDs
    const existingJobNos = new Set<string>();
    jobs.forEach(j => {
      if (j.jobNo) existingJobNos.add(j.jobNo.trim().toLowerCase());
      if (j.id) existingJobNos.add(j.id.trim().toLowerCase());
    });

    const duplicates: string[] = [];
    const seenInBatch = new Set<string>();

    for (const job of newJobs) {
      const cleanJobNo = (job.jobNo || '').trim().toLowerCase();
      const cleanId = (job.id || '').trim().toLowerCase();
      const identifier = job.jobNo || job.id || 'Unknown';

      // Check duplicate with existing jobs
      if (cleanJobNo && existingJobNos.has(cleanJobNo)) {
        duplicates.push(job.jobNo);
      } else if (cleanId && existingJobNos.has(cleanId)) {
        duplicates.push(identifier);
      } else if (cleanJobNo && seenInBatch.has(cleanJobNo)) {
        // Check duplicate within the current batch
        duplicates.push(`${job.jobNo} (ซ้ำในไฟล์)`);
      } else {
        if (cleanJobNo) seenInBatch.add(cleanJobNo);
        if (cleanId) seenInBatch.add(cleanId);
      }
    }

    // If any duplicates exist, reject the batch insert!
    if (duplicates.length > 0) {
      const uniqueDupes = Array.from(new Set(duplicates));
      return {
        success: false,
        addedCount: 0,
        duplicateCount: uniqueDupes.length,
        duplicates: uniqueDupes,
        error: `พบรหัส Job ID ซ้ำกัน ${uniqueDupes.length} รายการ (${uniqueDupes.slice(0, 3).join(', ')}${uniqueDupes.length > 3 ? '...' : ''}) ห้ามนำเข้าข้อมูลที่มีรหัสซ้ำ`
      };
    }

    // 2. Generate approval tasks for each new job
    const newTasks: InspectionApprovalTask[] = [];
    const now = new Date().toISOString().replace('T', ' ').slice(0, 16);

    for (const j of newJobs) {
      newTasks.push(
        {
          id: `task-${Date.now()}-${Math.floor(Math.random() * 10000)}-1`,
          jobId: j.id,
          taskCode: `APP-CL-${Math.floor(1000 + Math.random() * 9000)}`,
          title: `${j.assetTag || j.title} Equipment Closing & Box-up`,
          tabKey: 'tab1',
          tabName: '1. Equipment Closing',
          equipmentNo: j.assetTag || j.jobNo,
          systemNo: j.system,
          unitNo: j.unit,
          initiator: j.jobLead || 'Turnover Engineer',
          assignedRole: 'PES Engineer',
          approverName: 'Eng. Somchai Prasert',
          submissionDate: now,
          approvalDate: '',
          status: 'Pending',
          priority: j.isCriticalPath ? 'Critical' : 'High',
          comments: `Batch imported check for ${j.jobNo}`,
          criteria: [
            { label: 'Cleaning acceptance verified', verified: false },
            { label: 'FME foreign material sweep completed', verified: false },
            { label: 'De-blind certificate signed', verified: false }
          ]
        },
        {
          id: `task-${Date.now()}-${Math.floor(Math.random() * 10000)}-2`,
          jobId: j.id,
          taskCode: `APP-TO-${Math.floor(1000 + Math.random() * 9000)}`,
          title: `${j.jobNo} Final Turnover Certificate Authorization`,
          tabKey: 'tab4',
          tabName: '4. Turnover Certificate',
          equipmentNo: j.assetTag || j.jobNo,
          systemNo: j.system,
          unitNo: j.unit,
          initiator: 'Turnover Lead',
          assignedRole: 'SD Manager',
          approverName: 'Dr. Wichai Thongchai',
          submissionDate: now,
          approvalDate: '',
          status: 'Pending',
          priority: j.isCriticalPath ? 'Critical' : 'High',
          comments: 'Awaiting completion of all quality gates and punch list clearance.',
          criteria: [
            { label: 'Zero open Category A punch items', verified: false },
            { label: 'Dual Maintenance & Operations sign-offs verified', verified: false },
            { label: 'Turnover Lead certified', verified: false }
          ]
        }
      );
    }

    const updatedJobs = [...newJobs, ...jobs];
    setJobs(updatedJobs);
    setApprovalTasks(prev => [...newTasks, ...prev]);
    if (newJobs.length > 0) {
      setSelectedJobIdState(newJobs[0].id);
    }

    // Persist immediately & broadcast update event to sync all pages
    try {
      localStorage.setItem(STORAGE_KEYS.JOBS, JSON.stringify(updatedJobs));
      window.dispatchEvent(new CustomEvent('plantturn_jobs_updated', { detail: { count: newJobs.length } }));
    } catch (err) {
      console.error('Storage write error on batch create', err);
    }

    logActivity(
      'Bulk Ingest Jobs',
      'Turnover Bulk Ingestion',
      `Imported ${newJobs.length} turnover packages into the system.`,
      newJobs[0]?.id,
      newJobs[0]?.jobNo
    );

    return {
      success: true,
      addedCount: newJobs.length,
      duplicateCount: 0,
      duplicates: []
    };
  };

  const updateJob = (jobId: string, updates: Partial<JobRecord>) => {
    setJobs(prev => prev.map(j => {
      if (j.id === jobId) {
        return { ...j, ...updates };
      }
      return j;
    }));
    logActivity('Update Job', 'Shared Store', `Updated Job details for ID: ${jobId}`, jobId);
  };

  const deleteJob = (jobId: string) => {
    setJobs(prev => prev.filter(j => j.id !== jobId));
    if (selectedJobId === jobId) {
      const remaining = jobs.filter(j => j.id !== jobId);
      if (remaining.length > 0) setSelectedJobIdState(remaining[0].id);
    }
    logActivity('Delete Job', 'Shared Store', `Deleted Job ID: ${jobId}`, jobId);
  };

  // Punch List Operations (Single Source of Truth)
  const addPunchItem = (jobId: string, punch: Partial<PunchItem>): PunchItem => {
    const targetJob = jobs.find(j => j.id === jobId) || selectedJob;
    const itemSeq = (targetJob.punchList?.length || 0) + 1;
    const newItemCode = punch.item || `PL-${targetJob.jobNo.split('-').pop() || '01'}-${String(itemSeq).padStart(3, '0')}`;

    const newPunch: PunchItem = {
      id: punch.id || `punch-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      jobId: targetJob.id,
      item: newItemCode,
      type: punch.type || 'Field Defect',
      category: punch.category || 'A',
      discipline: punch.discipline || 'M',
      description: punch.description || 'Punch item reported during inspection',
      contractor: punch.contractor || 'General Contractor',
      planDate: punch.planDate || new Date().toISOString().slice(0, 10),
      cpSign: punch.cpSign || '',
      cpDate: punch.cpDate || '',
      photoRequired: punch.photoRequired ?? true,
      status: punch.status || 'Open',
      reportedBy: punch.reportedBy || 'Inspector',
      timestamp: punch.timestamp || new Date().toISOString().replace('T', ' ').slice(0, 16),
      resolutionPhotoUrl: punch.resolutionPhotoUrl,
      resolutionComment: punch.resolutionComment,
      resolvedAt: punch.resolvedAt
    };

    setJobs(prev => prev.map(j => {
      if (j.id === targetJob.id) {
        return {
          ...j,
          punchList: [...j.punchList, newPunch]
        };
      }
      return j;
    }));

    logActivity('Create Punch Item', 'Punch List', `Added [Cat ${newPunch.category}] ${newPunch.description} (${newPunch.item})`, targetJob.id, targetJob.jobNo);
    return newPunch;
  };

  const updatePunchItem = (jobId: string, punchId: string, updates: Partial<PunchItem>) => {
    setJobs(prev => prev.map(j => {
      if (j.id === jobId) {
        return {
          ...j,
          punchList: j.punchList.map(p => {
            if (p.id === punchId) {
              const updated = { ...p, ...updates };
              if (updates.status === 'Resolved' && !p.resolvedAt) {
                updated.resolvedAt = new Date().toISOString().replace('T', ' ').slice(0, 16);
              }
              return updated;
            }
            return p;
          })
        };
      }
      return j;
    }));

    logActivity('Update Punch Item', 'Punch List', `Updated Punch ID: ${punchId} status to ${updates.status || 'updated'}`, jobId);
  };

  const deletePunchItem = (jobId: string, punchId: string) => {
    setJobs(prev => prev.map(j => {
      if (j.id === jobId) {
        return {
          ...j,
          punchList: j.punchList.filter(p => p.id !== punchId)
        };
      }
      return j;
    }));

    logActivity('Delete Punch Item', 'Punch List', `Removed punch item ${punchId}`, jobId);
  };

  // Signature and Endorsement
  const addSignature = (jobId: string, signature: Partial<SignatureRecord>): SignatureRecord => {
    const targetJob = jobs.find(j => j.id === jobId) || selectedJob;
    const finalRole = signature.role || 'Inspector';

    const newSig: SignatureRecord = {
      id: signature.id || `sig-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      jobId: targetJob.id,
      role: finalRole,
      name: signature.name || 'Somchai Prasert',
      decision: signature.decision || 'Accept',
      comment: signature.comment,
      signedAt: signature.signedAt || new Date().toISOString().replace('T', ' ').slice(0, 16),
      signatureDataUrl: signature.signatureDataUrl,
      photoUrl: signature.photoUrl
    };

    setJobs(prev => prev.map(j => {
      if (j.id === targetJob.id) {
        // Prevent duplicate signature by exact same role on the same decision if already exists
        const filteredSigs = j.signatures.filter(s => s.role !== finalRole);
        return {
          ...j,
          signatures: [...filteredSigs, newSig]
        };
      }
      return j;
    }));

    // If an approval task exists for this role and job, auto-approve it
    setApprovalTasks(prev => prev.map(t => {
      if (t.jobId === targetJob.id && t.status === 'Pending') {
        const matchesRole = t.assignedRole.toLowerCase().includes(finalRole.toLowerCase()) ||
                            finalRole.toLowerCase().includes(t.assignedRole.toLowerCase());
        if (matchesRole && newSig.decision === 'Accept') {
          return {
            ...t,
            status: 'Approved',
            approvalDate: newSig.signedAt,
            approverName: newSig.name,
            comments: newSig.comment || t.comments,
            criteria: t.criteria.map(c => ({ ...c, verified: true }))
          };
        } else if (matchesRole && newSig.decision === 'Not Accept') {
          return {
            ...t,
            status: 'Rejected',
            approvalDate: newSig.signedAt,
            approverName: newSig.name,
            rejectionReason: newSig.comment || 'Rejected during field inspection'
          };
        }
      }
      return t;
    }));

    logActivity('Sign Endorsement', 'Digital Sign-off', `Recorded ${newSig.decision} sign-off as ${newSig.role} by ${newSig.name}`, targetJob.id, targetJob.jobNo);
    return newSig;
  };

  const removeSignature = (jobId: string, signatureId: string) => {
    setJobs(prev => prev.map(j => {
      if (j.id === jobId) {
        return {
          ...j,
          signatures: j.signatures.filter(s => s.id !== signatureId)
        };
      }
      return j;
    }));
    logActivity('Remove Signature', 'Digital Sign-off', `Removed signature ${signatureId}`, jobId);
  };

  // Task Approval Hub
  const approveTask = (taskId: string, approverName: string, comment?: string) => {
    const now = new Date().toISOString().replace('T', ' ').slice(0, 16);
    let targetJobId = selectedJobId;
    let targetRole = 'Turnover Lead';

    setApprovalTasks(prev => prev.map(t => {
      if (t.id === taskId) {
        targetJobId = t.jobId;
        targetRole = t.assignedRole;
        return {
          ...t,
          status: 'Approved',
          approvalDate: now,
          approverName: approverName || t.approverName,
          comments: comment || t.comments,
          criteria: t.criteria.map(c => ({ ...c, verified: true }))
        };
      }
      return t;
    }));

    // Record as signature in the linked job
    addSignature(targetJobId, {
      role: targetRole,
      name: approverName,
      decision: 'Accept',
      comment: comment || 'Approved via Task Approval Hub',
      signedAt: now
    });

    logActivity('Task Approved', 'Task Approval Hub', `Approved task ${taskId} by ${approverName}`, targetJobId);
  };

  const rejectTask = (taskId: string, approverName: string, reason: string) => {
    const now = new Date().toISOString().replace('T', ' ').slice(0, 16);
    let targetJobId = selectedJobId;
    let targetRole = 'Turnover Lead';

    setApprovalTasks(prev => prev.map(t => {
      if (t.id === taskId) {
        targetJobId = t.jobId;
        targetRole = t.assignedRole;
        return {
          ...t,
          status: 'Rejected',
          approvalDate: now,
          approverName: approverName || t.approverName,
          rejectionReason: reason
        };
      }
      return t;
    }));

    // Also record Not Accept in the job
    addSignature(targetJobId, {
      role: targetRole,
      name: approverName,
      decision: 'Not Accept',
      comment: reason,
      signedAt: now
    });

    // Automatically create a Category A punch list item if reason is provided
    if (reason && reason.trim()) {
      addPunchItem(targetJobId, {
        category: 'A',
        type: 'Approval Reject',
        description: `Rejected by ${targetRole} (${approverName}): ${reason}`,
        reportedBy: approverName,
        status: 'Open'
      });
    }

    logActivity('Task Rejected', 'Task Approval Hub', `Rejected task ${taskId}: ${reason}`, targetJobId);
  };

  const updateTaskCriteria = (taskId: string, criteriaIndex: number, verified: boolean) => {
    setApprovalTasks(prev => prev.map(t => {
      if (t.id === taskId) {
        const nextCriteria = [...t.criteria];
        if (nextCriteria[criteriaIndex]) {
          nextCriteria[criteriaIndex] = { ...nextCriteria[criteriaIndex], verified };
        }
        return { ...t, criteria: nextCriteria };
      }
      return t;
    }));
  };

  // Status & Validation Rules
  const isJobCompleted = (job: JobRecord): boolean => {
    const hasOperationSign = job.signatures.some(s => s.role.toLowerCase().includes('operat') && s.decision === 'Accept');
    const hasKeyAccept = job.signatures.some(s => (s.role.toLowerCase().includes('maint') || s.role.toLowerCase().includes('owner') || s.role.toLowerCase().includes('lead')) && s.decision === 'Accept');
    const allSignsAccepted = (job.signatures.length >= 2 && hasOperationSign && hasKeyAccept) || job.signatures.length >= 3;
    const allPunchResolved = job.punchList.length === 0 || job.punchList.every(p => p.status === 'Resolved');
    return allSignsAccepted && allPunchResolved;
  };

  // Category A blocker rule
  const isJobTurnoverBlocked = (jobId: string) => {
    const job = jobs.find(j => j.id === jobId) || selectedJob;
    const openCatA = job.punchList.filter(p => p.category === 'A' && p.status !== 'Resolved');
    const reasons: string[] = [];

    if (openCatA.length > 0) {
      reasons.push(`มี Punch List Category A ที่ยังไม่ได้รับการแก้ไข (${openCatA.length} รายการ) ห้ามส่งมอบระบบเด็ดขาด`);
    }

    const hasReject = job.signatures.some(s => s.decision === 'Not Accept');
    if (hasReject) {
      reasons.push('มีผลการตรวจประเมิน Not Accept / ถูก Reject จากผู้ตรวจรับมอบ');
    }

    return {
      blocked: openCatA.length > 0 || hasReject,
      openCatACount: openCatA.length,
      reasons
    };
  };

  // Turnover Certificate Clearance Rule
  const canIssueTurnoverCertificate = (jobId: string) => {
    const job = jobs.find(j => j.id === jobId) || selectedJob;
    const openCatA = job.punchList.filter(p => p.category === 'A' && p.status !== 'Resolved');
    const reasons: string[] = [];
    const missingSignatures: string[] = [];

    if (openCatA.length > 0) {
      reasons.push(`ยังมีรายการ Punch List Category A ค้างอยู่ ${openCatA.length} รายการ (ต้องแก้ไขและผ่านการตรวจรับซ้ำก่อน)`);
    }

    const hasOps = job.signatures.some(s => s.role.toLowerCase().includes('operat') && s.decision === 'Accept');
    const hasLead = job.signatures.some(s => (s.role.toLowerCase().includes('owner') || s.role.toLowerCase().includes('lead') || s.role.toLowerCase().includes('maint')) && s.decision === 'Accept');

    if (!hasOps) {
      missingSignatures.push('Operations Sign-off');
      reasons.push('ยังขาดลายเซ็นรับมอบจากตัวแทนฝ่ายปฏิบัติการ (Operations Lead)');
    }
    if (!hasLead) {
      missingSignatures.push('Turnover Lead / Maintenance Sign-off');
      reasons.push('ยังขาดลายเซ็นรับรองจากหัวหน้าวิศวกรผู้ส่งมอบ (Turnover Lead / Job Owner)');
    }

    return {
      canIssue: openCatA.length === 0 && hasOps && hasLead,
      openCatACount: openCatA.length,
      missingSignatures,
      reasons
    };
  };

  // Reset helper
  const resetToDefaultData = () => {
    setEvents(INITIAL_SHARED_EVENTS);
    setJobs(INITIAL_SHARED_JOBS);
    setSelectedJobIdState(INITIAL_SHARED_JOBS[0].id);
    setApprovalTasks(INITIAL_APPROVAL_TASKS);
    setActivityLogs([
      {
        id: `act-reset-${Date.now()}`,
        timestamp: new Date().toISOString().replace('T', ' ').slice(0, 16),
        user: 'Administrator',
        action: 'Reset Shared Store',
        module: 'Core System',
        details: 'Reset system data back to default initial records.'
      }
    ]);
  };

  return (
    <PlantTurnSharedContext.Provider
      value={{
        jobs,
        setJobs,
        selectedJobId,
        selectedJob,
        setSelectedJobId,
        events,
        createEvent,
        updateEvent,
        deleteEvent,
        checkEventExists,
        createJob,
        updateJob,
        deleteJob,
        checkJobIdExists,
        batchCreateJobs,
        addPunchItem,
        updatePunchItem,
        deletePunchItem,
        addSignature,
        removeSignature,
        approvalTasks,
        approveTask,
        rejectTask,
        updateTaskCriteria,
        isJobCompleted,
        isJobTurnoverBlocked,
        canIssueTurnoverCertificate,
        activityLogs,
        logActivity,
        resetToDefaultData
      }}
    >
      {children}
    </PlantTurnSharedContext.Provider>
  );
};

export const usePlantTurnShared = (): PlantTurnSharedContextType => {
  const context = useContext(PlantTurnSharedContext);
  if (!context) {
    throw new Error('usePlantTurnShared must be used within a PlantTurnSharedProvider');
  }
  return context;
};
