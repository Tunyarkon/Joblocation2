// =========================================================================
// CRANE MASTER / FLEET MANAGEMENT DATA STORE & REPOSITORY
// Central Registry for Cranes & Lifting Machinery across Phra Khanong & Sriracha
// =========================================================================

import { EquipmentResource } from '../components/optimizerData';

export type CraneFleetStatus = 
  | 'Available'
  | 'Reserved'
  | 'Assigned'
  | 'Maintenance'
  | 'Inspection'
  | 'Inactive';

export type CraneCategory = 
  | 'Mobile Crane'
  | 'Crawler Crane'
  | 'Tower Crane'
  | 'Rough Terrain'
  | 'Truck Crane'
  | 'All Terrain';

export interface CraneMasterRecord {
  id: string; // Unique Crane ID e.g. 'CRN-001'
  craneType: CraneCategory;
  brand: string; // e.g. 'Liebherr', 'Tadano', 'Kato', 'Kobelco', 'Demag', 'Sany'
  model: string; // e.g. 'LTM 1300-6.2'
  serialNumber: string;
  ratedCapacityTon: number; // in Metric Tons
  maxBoomLengthM: number; // in Meters
  contractor: string; // Owner / Operator Company
  ownerType: 'Owner Crane' | 'Contractor Crane';
  homePlant: 'Phra Khanong' | 'Sriracha' | 'All';
  fleetStatus: CraneFleetStatus;

  // Technical Specifications
  craneConfiguration?: string; // e.g. 'Main Boom + Fixed Jib 21m'
  outriggerConfiguration?: string; // e.g. 'Full 8.5m x 8.5m / VarioBase'
  hasLoadChart: boolean;
  loadChartAttachment?: string;
  riggingEquipmentInfo?: string;
  maxAllowableWindKnots?: number;
  groundBearingPressureLimitKPa?: number;

  // Certification & Engineering Documents
  certNumber: string; // e.g. 'ปจ.2-BCP-2026-001'
  certIssueDate: string; // YYYY-MM-DD
  certExpiryDate: string; // YYYY-MM-DD
  isCertValid: boolean;
  certAttachment?: string;
  supportingDocuments?: string[];
  engineeringDataComplete: boolean; // Must be true + valid cert to pass Safety Validation!

  // Operational Metadata
  lastUpdated: string;
  operator?: string;
  hourlyRateThb?: number;
  assignedJobId?: string;
  assignedJobNo?: string;
  assignedTimeSlot?: string;
  notes?: string;
}

export const CRANE_MASTER_STORAGE_KEY = 'bcp_crane_master_fleet_v1';

// Initial high-fidelity refinery crane fleet
export const INITIAL_CRANE_MASTER_FLEET: CraneMasterRecord[] = [
  {
    id: 'CR-001',
    craneType: 'Mobile Crane',
    brand: 'Liebherr',
    model: 'LTM 1300-6.2',
    serialNumber: 'SN-LTM1300-7821',
    ratedCapacityTon: 300,
    maxBoomLengthM: 78,
    contractor: 'Contractor Heavy Lift Solutions',
    ownerType: 'Contractor Crane',
    homePlant: 'Phra Khanong',
    fleetStatus: 'Assigned',
    craneConfiguration: 'Main Boom 78m + Heavy Duty Runner Jib',
    outriggerConfiguration: 'Full Span 8.85m x 8.5m with Timber Mats',
    hasLoadChart: true,
    loadChartAttachment: 'Liebherr_LTM1300_Chart_2026.pdf',
    riggingEquipmentInfo: '4-Leg Wire Sling 120T, 85T Bow Shackles, Spreader Beam 12m',
    maxAllowableWindKnots: 25,
    groundBearingPressureLimitKPa: 280,
    certNumber: 'PJ2-BCP-2026-001',
    certIssueDate: '2026-01-15',
    certExpiryDate: '2026-12-31',
    isCertValid: true,
    certAttachment: 'PhorJor2_CR001_Signed.pdf',
    supportingDocuments: ['ThirdParty_NDE_Certificate.pdf', 'WireRope_Inspection_2026.pdf'],
    engineeringDataComplete: true,
    lastUpdated: '2026-09-24T08:30:00.000Z',
    operator: 'Somchai Prasert (Level 3 Cert)',
    hourlyRateThb: 14500,
    assignedJobId: '260001',
    assignedJobNo: 'ICM-2600001',
    assignedTimeSlot: '2026-09-27 08:00 - 16:00',
    notes: 'Dedicated for Crude Distillation Column Overhead Condenser lift.'
  },
  {
    id: 'CR-002',
    craneType: 'Rough Terrain',
    brand: 'Kato',
    model: 'CR-250Rv City Crane',
    serialNumber: 'SN-CR250-9941',
    ratedCapacityTon: 25,
    maxBoomLengthM: 28,
    contractor: 'BCP Operations (Owner Crane)',
    ownerType: 'Owner Crane',
    homePlant: 'Phra Khanong',
    fleetStatus: 'Available',
    craneConfiguration: 'Compact Telescopic 28m',
    outriggerConfiguration: 'Asymmetric Outrigger Automatic Detect',
    hasLoadChart: true,
    loadChartAttachment: 'Kato_CR250Rv_Chart.pdf',
    riggingEquipmentInfo: 'Synthetic Webbing Slings 10T, Shackle Set Grade 80',
    maxAllowableWindKnots: 20,
    groundBearingPressureLimitKPa: 220,
    certNumber: 'PJ2-BCP-2026-002',
    certIssueDate: '2025-12-01',
    certExpiryDate: '2026-11-30',
    isCertValid: true,
    certAttachment: 'PhorJor2_CR002_Valid.pdf',
    supportingDocuments: ['Annual_Brake_Test.pdf'],
    engineeringDataComplete: true,
    lastUpdated: '2026-09-26T10:00:00.000Z',
    operator: 'Wichai Thongchai',
    hourlyRateThb: 4200,
    notes: 'Good condition, certified for process unit access.'
  },
  {
    id: 'CR-003',
    craneType: 'Rough Terrain',
    brand: 'Tadano',
    model: 'GR-1000XL-4',
    serialNumber: 'SN-GR1000-4412',
    ratedCapacityTon: 100,
    maxBoomLengthM: 47,
    contractor: 'BCP Operations (Owner Crane)',
    ownerType: 'Owner Crane',
    homePlant: 'Phra Khanong',
    fleetStatus: 'Reserved',
    craneConfiguration: 'Main Boom 47m + Bi-fold Jib',
    outriggerConfiguration: 'Full Span 7.3m x 7.3m Steel Mats',
    hasLoadChart: true,
    loadChartAttachment: 'Tadano_GR1000XL_Chart.pdf',
    riggingEquipmentInfo: 'G100 Chain Slings 45T, Swivel Hoist Rings',
    maxAllowableWindKnots: 22,
    groundBearingPressureLimitKPa: 250,
    certNumber: 'PJ2-BCP-2026-003',
    certIssueDate: '2026-02-10',
    certExpiryDate: '2027-02-09',
    isCertValid: true,
    certAttachment: 'PhorJor2_CR003_Valid.pdf',
    supportingDocuments: ['LoadCell_Calibration_2026.pdf'],
    engineeringDataComplete: true,
    lastUpdated: '2026-09-25T11:00:00.000Z',
    operator: 'Prasert Somchai',
    hourlyRateThb: 7500,
    assignedJobId: '260002',
    assignedJobNo: 'ICM-2600002',
    assignedTimeSlot: '2026-09-28 07:30 - 13:30',
    notes: 'Assigned for Reboiler Exchanger Tube Bundle Extraction.'
  },
  {
    id: 'CR-004',
    craneType: 'All Terrain',
    brand: 'Demag',
    model: 'AC 160-5',
    serialNumber: 'SN-AC160-5510',
    ratedCapacityTon: 160,
    maxBoomLengthM: 68,
    contractor: 'BCP Operations (Owner Crane)',
    ownerType: 'Owner Crane',
    homePlant: 'Sriracha',
    fleetStatus: 'Reserved',
    craneConfiguration: 'Main Boom 68m Single Cylinder Telescoping',
    outriggerConfiguration: 'Star Outriggers 8.0m with Steel Distribution Plates',
    hasLoadChart: true,
    loadChartAttachment: 'Demag_AC160_Chart.pdf',
    riggingEquipmentInfo: 'Heavy Rigging Package 65T, Equalizer Beam',
    maxAllowableWindKnots: 24,
    groundBearingPressureLimitKPa: 260,
    certNumber: 'PJ2-BCP-2026-004',
    certIssueDate: '2026-03-01',
    certExpiryDate: '2027-02-28',
    isCertValid: true,
    certAttachment: 'PhorJor2_CR004_Valid.pdf',
    supportingDocuments: ['Demag_Computer_System_Inspection.pdf'],
    engineeringDataComplete: true,
    lastUpdated: '2026-09-26T16:00:00.000Z',
    operator: 'Anan Chokchai',
    hourlyRateThb: 9500,
    assignedJobId: '260004',
    assignedJobNo: 'ICM-2600004',
    assignedTimeSlot: '2026-09-30 08:30 - 16:30',
    notes: 'Based at Sriracha Terminal Complex for Vacuum Furnace Tube lifting.'
  },
  {
    id: 'CR-005',
    craneType: 'Crawler Crane',
    brand: 'Kobelco',
    model: 'CKE 2500G-2',
    serialNumber: 'SN-CKE2500-1092',
    ratedCapacityTon: 250,
    maxBoomLengthM: 73,
    contractor: 'Maintenance Team B Heavy Machinery',
    ownerType: 'Contractor Crane',
    homePlant: 'Phra Khanong',
    fleetStatus: 'Available',
    craneConfiguration: 'Lattice Boom 73m + Fixed Jib 30m',
    outriggerConfiguration: 'Wide Track Crawlers 7.3m Gauge with Hardwood Mats',
    hasLoadChart: true,
    loadChartAttachment: 'Kobelco_CKE2500_LoadChart.pdf',
    riggingEquipmentInfo: 'Heavy Grommet Slings 150T, Shackle Set 120T',
    maxAllowableWindKnots: 20,
    groundBearingPressureLimitKPa: 190,
    certNumber: 'PJ2-BCP-2026-005',
    certIssueDate: '2026-04-15',
    certExpiryDate: '2027-04-14',
    isCertValid: true,
    certAttachment: 'PhorJor2_CR005_Certified.pdf',
    supportingDocuments: ['Crawler_Shoe_Inspection.pdf', 'Luffing_Winch_Test.pdf'],
    engineeringDataComplete: true,
    lastUpdated: '2026-09-25T14:00:00.000Z',
    operator: 'Somkiat Ratanakul (Senior Crawler Operator)',
    hourlyRateThb: 13000,
    notes: 'Assembled in Zone C Construction & Expansion yard.'
  },
  {
    id: 'CR-006',
    craneType: 'Mobile Crane',
    brand: 'Liebherr',
    model: 'LTM 1500-8.1',
    serialNumber: 'SN-LTM1500-0501',
    ratedCapacityTon: 500,
    maxBoomLengthM: 84,
    contractor: 'Contractor Heavy Lift Solutions',
    ownerType: 'Contractor Crane',
    homePlant: 'Phra Khanong',
    fleetStatus: 'Inspection',
    craneConfiguration: 'Telescopic Boom 84m with Y-Guying Superlift',
    outriggerConfiguration: 'Outrigger Base 10m x 9.6m with Composite Heavy Pads',
    hasLoadChart: true,
    loadChartAttachment: 'Liebherr_LTM1500_YGuy_Chart.pdf',
    riggingEquipmentInfo: 'Modular Spreader Frame 300T, Round Slings 200T',
    maxAllowableWindKnots: 22,
    groundBearingPressureLimitKPa: 320,
    certNumber: 'PJ2-BCP-2025-089',
    certIssueDate: '2025-09-10',
    certExpiryDate: '2026-09-09', // Expired!
    isCertValid: false,
    certAttachment: 'PhorJor2_CR006_PendingRenewal.pdf',
    supportingDocuments: ['Major_Overhaul_Report_2026.pdf'],
    engineeringDataComplete: true,
    lastUpdated: '2026-09-20T09:00:00.000Z',
    operator: 'Niwat Boonmee',
    hourlyRateThb: 22000,
    notes: 'Annual Phor.Jor.2 Certificate Expired. Under renewal inspection by authorized engineer. Cannot be assigned.'
  },
  {
    id: 'CR-007',
    craneType: 'Truck Crane',
    brand: 'Sany',
    model: 'STC 500S',
    serialNumber: 'SN-STC500-8830',
    ratedCapacityTon: 50,
    maxBoomLengthM: 43,
    contractor: 'External Rigging Hire Co.',
    ownerType: 'Contractor Crane',
    homePlant: 'Sriracha',
    fleetStatus: 'Available',
    craneConfiguration: '5-Section U-Shape Boom 43.5m',
    outriggerConfiguration: 'H-Type Outriggers 6.2m x 7.3m',
    hasLoadChart: false, // Engineering incomplete!
    loadChartAttachment: undefined,
    riggingEquipmentInfo: 'Standard 4-leg slings 20T',
    maxAllowableWindKnots: 18,
    groundBearingPressureLimitKPa: 210,
    certNumber: 'PJ2-SR-2026-112',
    certIssueDate: '2026-05-01',
    certExpiryDate: '2027-04-30',
    isCertValid: true,
    certAttachment: 'PhorJor2_STC500.pdf',
    supportingDocuments: [],
    engineeringDataComplete: false, // Incomplete engineering data!
    lastUpdated: '2026-09-22T13:30:00.000Z',
    operator: 'Thana Viroj',
    hourlyRateThb: 4800,
    notes: 'Engineering data incomplete: Certified Load Chart verification pending upload.'
  },
  {
    id: 'CR-008',
    craneType: 'Rough Terrain',
    brand: 'Tadano',
    model: 'GR-700EX',
    serialNumber: 'SN-GR700-1205',
    ratedCapacityTon: 70,
    maxBoomLengthM: 44,
    contractor: 'BCP Operations (Owner Crane)',
    ownerType: 'Owner Crane',
    homePlant: 'Phra Khanong',
    fleetStatus: 'Maintenance',
    craneConfiguration: 'Telescopic Boom 44m',
    outriggerConfiguration: 'Full Span 7.2m x 7.2m',
    hasLoadChart: true,
    loadChartAttachment: 'Tadano_GR700EX_Chart.pdf',
    riggingEquipmentInfo: 'Standard Shackle and Sling Set 40T',
    maxAllowableWindKnots: 20,
    groundBearingPressureLimitKPa: 235,
    certNumber: 'PJ2-BCP-2026-008',
    certIssueDate: '2026-01-20',
    certExpiryDate: '2027-01-19',
    isCertValid: true,
    certAttachment: 'PhorJor2_CR008.pdf',
    supportingDocuments: ['Hydraulic_Hose_Maintenance_Log.pdf'],
    engineeringDataComplete: true,
    lastUpdated: '2026-09-26T08:00:00.000Z',
    operator: 'Boonterm Petch',
    hourlyRateThb: 6200,
    notes: 'Scheduled hydraulic valve block maintenance in progress. Expected completion in 48 hours.'
  }
];

// Helper to check certificate validity based on expiry date
export function checkCertificateExpiry(expiryDateStr: string): { isValid: boolean; daysLeft: number; isExpiringSoon: boolean } {
  if (!expiryDateStr) return { isValid: false, daysLeft: -999, isExpiringSoon: false };
  const expiry = new Date(expiryDateStr);
  const now = new Date('2026-10-16'); // system benchmark date
  const diffTime = expiry.getTime() - now.getTime();
  const daysLeft = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return {
    isValid: daysLeft >= 0,
    daysLeft,
    isExpiringSoon: daysLeft >= 0 && daysLeft <= 30
  };
}

// Read all crane master fleet
export function getAllCraneMaster(): CraneMasterRecord[] {
  if (typeof window === 'undefined') return INITIAL_CRANE_MASTER_FLEET;
  try {
    const raw = localStorage.getItem(CRANE_MASTER_STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(CRANE_MASTER_STORAGE_KEY, JSON.stringify(INITIAL_CRANE_MASTER_FLEET));
      return [...INITIAL_CRANE_MASTER_FLEET];
    }
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed.map((item: any) => {
        const certCheck = checkCertificateExpiry(item.certExpiryDate);
        return {
          ...item,
          isCertValid: certCheck.isValid,
          engineeringDataComplete: item.engineeringDataComplete !== undefined 
            ? item.engineeringDataComplete 
            : Boolean(item.hasLoadChart && item.certNumber && certCheck.isValid)
        } as CraneMasterRecord;
      });
    }
    localStorage.setItem(CRANE_MASTER_STORAGE_KEY, JSON.stringify(INITIAL_CRANE_MASTER_FLEET));
    return [...INITIAL_CRANE_MASTER_FLEET];
  } catch (e) {
    console.error('Error reading crane master fleet:', e);
    return [...INITIAL_CRANE_MASTER_FLEET];
  }
}

// Save all crane master fleet & dispatch updates
export function saveAllCraneMaster(records: CraneMasterRecord[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(CRANE_MASTER_STORAGE_KEY, JSON.stringify(records));
    window.dispatchEvent(new CustomEvent('bcp_crane_master_updated', { detail: records }));
  } catch (e) {
    console.error('Error saving crane master fleet:', e);
  }
}

// Add single crane record with uniqueness check
export function addCraneMaster(record: CraneMasterRecord): { success: boolean; message?: string } {
  const all = getAllCraneMaster();
  const exists = all.some(c => c.id.trim().toLowerCase() === record.id.trim().toLowerCase());
  if (exists) {
    return { success: false, message: `Crane ID '${record.id}' already exists in Crane Master.` };
  }
  const certCheck = checkCertificateExpiry(record.certExpiryDate);
  const updatedRecord: CraneMasterRecord = {
    ...record,
    isCertValid: certCheck.isValid,
    lastUpdated: new Date().toISOString()
  };
  const updated = [updatedRecord, ...all];
  saveAllCraneMaster(updated);
  return { success: true };
}

// Update single crane record
export function updateCraneMaster(id: string, updates: Partial<CraneMasterRecord>): void {
  const all = getAllCraneMaster();
  const index = all.findIndex(c => c.id.trim().toLowerCase() === id.trim().toLowerCase());
  if (index === -1) return;

  const current = all[index];
  const newExpiry = updates.certExpiryDate || current.certExpiryDate;
  const certCheck = checkCertificateExpiry(newExpiry);

  const updatedRecord: CraneMasterRecord = {
    ...current,
    ...updates,
    isCertValid: certCheck.isValid,
    lastUpdated: new Date().toISOString()
  };

  all[index] = updatedRecord;
  saveAllCraneMaster(all);
}

// Deactivate crane (sets to Inactive)
export function deactivateCraneMaster(id: string): void {
  updateCraneMaster(id, { fleetStatus: 'Inactive' });
}

// Subscribe to real-time updates
export function subscribeToCraneMaster(callback: (records: CraneMasterRecord[]) => void): () => void {
  if (typeof window === 'undefined') return () => {};
  const handler = (e: any) => {
    callback(e.detail || getAllCraneMaster());
  };
  window.addEventListener('bcp_crane_master_updated', handler);
  window.addEventListener('storage', (e) => {
    if (e.key === CRANE_MASTER_STORAGE_KEY) {
      callback(getAllCraneMaster());
    }
  });
  return () => {
    window.removeEventListener('bcp_crane_master_updated', handler);
  };
}

// Convert CraneMasterRecord to EquipmentResource for ReviewPlanOptimize & PlanningDashboard
export function mapCraneMasterToEquipmentResource(c: CraneMasterRecord): EquipmentResource {
  return {
    id: c.id,
    name: `${c.brand} ${c.model}`,
    type: `${c.craneType} (${c.ratedCapacityTon}T)`,
    capacityTon: c.ratedCapacityTon,
    boomLengthM: c.maxBoomLengthM,
    status: c.fleetStatus === 'Available' ? 'Available' :
            c.fleetStatus === 'Assigned' || c.fleetStatus === 'Reserved' ? 'Assigned' :
            c.fleetStatus === 'Maintenance' ? 'Maintenance' : 'Inspection',
    location: c.homePlant === 'Sriracha' ? 'Sriracha Terminal Complex' : 'Phra Khanong Refinery',
    operator: c.operator || 'Assigned Operator',
    hourlyRateThb: c.hourlyRateThb || 5000,
    assignedJobId: c.assignedJobId,
    assignedTimeSlot: c.assignedTimeSlot,
    certNo: c.certNumber,
    certExpiryDate: c.certExpiryDate,
    isCertValid: c.isCertValid && c.engineeringDataComplete,
    maxAllowableWindKnots: c.maxAllowableWindKnots || 22,
    groundBearingPressureLimitKPa: c.groundBearingPressureLimitKPa || 250
  };
}

// Sync helper that gets fleet formatted for Optimizer
export function getOptimizerEquipmentFleet(): EquipmentResource[] {
  const master = getAllCraneMaster();
  return master.map(mapCraneMasterToEquipmentResource);
}
