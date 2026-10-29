export type PunchCategory = 'A' | 'B' | 'C';

export interface PunchItem {
  id: string;
  type: string;
  category: PunchCategory;
  description: string;
  photoRequired: boolean;
  status: 'Open' | 'Resolved';
  reportedBy: string;
  timestamp: string;
}

export interface SignatureRecord {
  id: string;
  role: string;
  name: string;
  decision: 'Accept' | 'Not Accept';
  comment?: string;
  signedAt: string;
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
  attachments: { name: string; size: string; type: string }[];
  signatures: SignatureRecord[];
  punchList: PunchItem[];
  createdAt: string;
}

export const isJobCompleted = (job: JobRecord): boolean => {
  const hasOps = job.signatures.some(s => s.role === 'Operation');
  const hasOwner = job.signatures.some(s => s.role === 'Job Owner');
  const hasOpenCatA = job.punchList.some(p => p.category === 'A' && p.status === 'Open');
  return hasOps && hasOwner && !hasOpenCatA;
};

// Initial Mock Data with Functional Location & Asset Hierarchy Linkage
export const INITIAL_JOBS: JobRecord[] = [
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
