// =========================================================================
// CRANE OPERATIONS - UNIFIED DATA STORE & LIFECYCLE SYNC SERVICE
// Links all 6 sub-functions in Module 3: Crane Operations:
// 1. Create Crane Job (CreateJob.tsx)
// 2. Request Lists (RequestList.tsx)
// 3. Review Plan & Optimize (ReviewPlanOptimize.tsx)
// 4. Job List (JobList.tsx)
// 5. Calendar Schedule (CalendarView.tsx)
// 6. Plot Plan (PlotPlan.tsx)
// =========================================================================

import { JobAttachment, getJobAttachments } from './jobAttachmentData';

export type CraneJobStatus =
  | 'Requested'         // รออนุมัติ / คำขอเปิดงานใหม่
  | 'Pending Review'    // อยู่ระหว่างตรวจสอบแผน
  | 'Approved'          // อนุมัติคำขอแล้ว
  | 'Assigned'          // จัดสรรเครื่องจักรเครนแล้ว
  | 'Optimized'         // ตรวจสอบความปลอดภัย & ผังยกแล้ว
  | 'In Progress'       // กำลังปฏิบัติงานยกหน้างาน
  | 'Completed'         // งานยกเสร็จสิ้นสมบูรณ์
  | 'Rejected'          // ไม่อนุมัติ
  | 'Revision Required' // ส่งกลับให้แก้ไข
  | 'Cancelled';        // ยกเลิก

export type CraneRequestStatus =
  | 'Draft'
  | 'Submitted'
  | 'Under Review'
  | 'Approved'
  | 'Rejected'
  | 'In Progress'
  | 'Completed'
  | 'Cancelled';

export type CraneAssignmentStatus =
  | 'Unassigned'
  | 'Proposed'
  | 'Assigned'
  | 'Locked'
  | 'Released';

export type CraneRequestType = 'CR01' | 'CR02' | 'CR03' | 'CR04' | 'CR05' | 'CR06';

export type CraneTypeOption = 'Crane Spot' | 'Crane Pull' | 'Mobile Crane' | 'Crawler Crane' | 'Tower Crane' | 'Rough Terrain';

export interface UnifiedCraneJob {
  id: number | string;
  jobNo: string;
  requestNo?: string;
  requestType?: CraneRequestType;
  requestStatus?: CraneRequestStatus;
  assignmentStatus?: CraneAssignmentStatus;
  equipmentId?: string;
  functionalLocation?: string;
  unit?: string;
  plant: 'Phra Khanong' | 'Sriracha';
  eventName?: string;
  eventCode?: string;
  area?: string;
  title?: string;
  description?: string;
  scheduledDate?: string;
  scheduledStartTime?: string;
  scheduledEndTime?: string;
  type?: string;                  // e.g. 'Crane Spot (50T)', 'Crane Pull (100T)'
  craneType?: CraneTypeOption;
  equipmentType?: string;        // e.g. 'Distillation Column', 'Heat Exchanger', 'Piping Spool'
  capacity?: number;              // in Tons
  duration?: string;             // e.g. '4 Hours', '2 Days'
  providerType?: 'Owner Crane' | 'Contractor Crane';
  dateFrom?: string;              // 'YYYY-MM-DD HH:mm'
  date?: string;                  // 'YYYY-MM-DD'
  time?: string;                  // 'HH:mm - HH:mm'
  status: CraneJobStatus;
  priority?: 'Urgent' | 'High' | 'Normal' | 'Low' | 'Critical';
  progress?: number;              // 0 to 100
  contractor?: string;
  requester?: string;
  department?: string;

  // Lifting Requirements (Section 3.3)
  loadDescription?: string;
  loadWeightTon?: number;
  riggingWeightTon?: number;
  grossLoadTon?: number;
  workingRadiusM?: number;
  requiredHookHeightM?: number;
  plannedStart?: string;
  plannedEnd?: string;

  // Site & Position Information
  gridReference?: string;
  siteConstraints?: string;
  safetyNotes?: string;
  assignedCraneId?: string;
  assignedCraneName?: string;
  x?: number;                    // 0 - 100 percentage on Plot Plan
  y?: number;                    // 0 - 100 percentage on Plot Plan
  isArea?: boolean;
  width?: number;
  height?: number;
  rotation?: number;
  safetyRadius?: number;         // safety exclusion zone radius in meters

  // Engineering & Safety
  riggerLead?: string;
  ptwNo?: string;
  phorJor2Cert?: string;
  groundPressureKPa?: number;
  remarks?: string;
  rejectReason?: string;
  // Extended Crane Job Request Fields (Requestor & Planner / Optimizer Specs)
  woNumber?: number | string;
  workOrder?: string;
  workOrderNo?: string;
  equipmentTag?: string;
  locationArea?: string;
  tradeSession?: string;
  workStartDateTime?: string;
  workEndDateTime?: string;
  shift?: 'Day' | 'Night' | 'All day';
  craneModel?: string;           // Ex. GR-250N, GR-500EXL
  machineType?: string;
  capacityRequired?: number;     // 8/10/25/50/80/100/120/160/200/360/400/500
  boomLength?: number;
  boomLengthM?: number;
  workingRadius?: number;
  totalWeightTon?: number;
  liftPlanLink?: string;
  additionalRemarks?: string;
  requestor?: string;
  provider?: string;
  submittedBy?: string;
  submissionDate?: string;
  reviewBy?: string;
  reviewedBy?: string;
  reviewedAt?: string;
  reviewNotes?: string;
  revisionNote?: string;
  optimizeWith?: string;
  markingType?: 'area' | 'pin' | 'both';
  dateTo?: string;
  radius?: number;

  // Execution Checklist (Section 7)
  executionChecklist?: {
    riggingTackle: { done: boolean; inspector?: string; timestamp?: string; remarks?: string };
    outriggerPads: { done: boolean; inspector?: string; timestamp?: string; remarks?: string };
    liftExecution: { done: boolean; inspector?: string; timestamp?: string; remarks?: string };
    siteDemobilization: { done: boolean; inspector?: string; timestamp?: string; remarks?: string };
  };

  inProgressChecklist?: {
    step1: boolean; // Ground & Matting Check
    step2: boolean; // Rigging & Sling Inspection
    step3: boolean; // Exclusion Zone Barricaded
    step4: boolean; // Lift Supervisor Final Signoff
  };

  // Activity History (Section 4 & 7)
  statusHistory?: Array<{
    status: string;
    changedBy: string;
    timestamp: string;
    reason?: string;
    action?: string;
  }>;

  attachments?: JobAttachment[];
  createdAt?: string;
}

export interface CraneAuditLogEntry {
  id: string;
  action:
  | 'Review Plan'
  | 'Run Optimization'
  | 'Adjust Crane Position'
  | 'Assign Crane'
  | 'Reassign Crane'
  | 'Reschedule & Assign Crane'
  | 'Unlock Assignment'
  | 'Engineering Review'
  | 'Conflict Resolution'
  | 'Change Assignment'
  | 'Reject Plan'
  | 'Return for Revision'
  | 'Cancel Assignment'
  | 'Create Request'
  | 'Import Requests'
  | 'Approve Request'
  | 'Cancel Request';
  jobNo: string;
  user: string;
  role: string;
  timestamp: string;
  previousValue?: string;
  newValue?: string;
  reason?: string;
}

export const CRANE_STORAGE_KEY = 'crane_custom_job_requests';
export const CRANE_AUDIT_LOG_KEY = 'crane_operations_audit_logs';

// =========================================================================
// CRANE UNIFIED NAVIGATION CONTEXT & CROSS-LINKING DISPATCHER
// =========================================================================
export interface CraneNavigationContext {
  view: 'create' | 'crane-master' | 'list' | 'optimize' | 'job-list' | 'calendar' | 'plan';
  jobId?: string | number;
  craneId?: string;
  date?: string;
  plant?: 'Phra Khanong' | 'Sriracha';
  timestamp?: number;
}

let activeCraneNavContext: CraneNavigationContext | null = null;

export function getActiveCraneNavContext(): CraneNavigationContext | null {
  return activeCraneNavContext;
}

export function clearActiveCraneNavContext(): void {
  activeCraneNavContext = null;
}

export function navigateToCraneView(context: CraneNavigationContext): void {
  const fullContext: CraneNavigationContext = {
    ...context,
    timestamp: Date.now()
  };
  activeCraneNavContext = fullContext;
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('crane_navigate_view', { detail: fullContext }));
  }
}

export function subscribeToCraneNavigation(callback: (context: CraneNavigationContext) => void): () => void {
  if (typeof window === 'undefined') return () => { };
  const handler = (e: any) => {
    if (e.detail) callback(e.detail);
  };
  window.addEventListener('crane_navigate_view', handler);
  return () => window.removeEventListener('crane_navigate_view', handler);
}

export function getCraneAuditLogs(): CraneAuditLogEntry[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(CRANE_AUDIT_LOG_KEY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

export function addCraneAuditLog(entry: Omit<CraneAuditLogEntry, 'id' | 'timestamp'>): CraneAuditLogEntry {
  const all = getCraneAuditLogs();
  const fullEntry: CraneAuditLogEntry = {
    ...entry,
    id: `LOG-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    timestamp: new Date().toISOString()
  };
  const updated = [fullEntry, ...all].slice(0, 100); // keep last 100 logs
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(CRANE_AUDIT_LOG_KEY, JSON.stringify(updated));
    } catch { }
  }
  return fullEntry;
}

// Default initial high-quality seed jobs across Phra Khanong and Sriracha
export const DEFAULT_INITIAL_CRANE_JOBS: UnifiedCraneJob[] = [
  {
    id: 260001,
    jobNo: 'ICM-2600001',
    equipmentId: '11-C-101',
    functionalLocation: '11-APS1 (Atmospheric Pipestill 1)',
    plant: 'Phra Khanong',
    eventName: 'Annual Turnaround 2026',
    eventCode: 'EVT-PK-2026-01',
    area: 'BCP Refinery Area 1 (CDU-1)',
    description: 'Crude Distillation Column Overhead Condenser Heavy Lift & Replacement',
    type: 'Crane Spot (300T)',
    craneType: 'Crane Spot',
    capacity: 300,
    duration: '8 Hours',
    providerType: 'Contractor Crane',
    dateFrom: '2026-09-27 08:00',
    date: '2026-09-27',
    time: '08:00 - 16:00',
    status: 'In Progress',
    priority: 'Urgent',
    progress: 50,
    contractor: 'Contractor Heavy Lift (Contractor Crane)',
    assignedCraneId: 'CR-001',
    assignedCraneName: 'Liebherr LTM 1300-6.2 (300T)',
    x: 22.5,
    y: 26.0,
    isArea: false,
    width: 10,
    height: 8,
    rotation: 0,
    safetyRadius: 35,
    riggerLead: 'Wichai Thongdee (Level 3 Rigger)',
    ptwNo: 'PTW-2026-0927-CRN1',
    phorJor2Cert: 'PJ2-BCP-2026-7881',
    groundPressureKPa: 240,
    remarks: 'Approved by Turnaround Rigging Superintendent. Ground mats inspected.',
    inProgressChecklist: {
      step1: true,
      step2: true,
      step3: false,
      step4: false
    },
    createdAt: '2026-09-24T08:30:00.000Z'
  },
  {
    id: 260002,
    jobNo: 'ICM-2600002',
    equipmentId: '11-E-102B',
    functionalLocation: '11-APS1 (Atmospheric Pipestill 1)',
    plant: 'Phra Khanong',
    eventName: 'Annual Turnaround 2026',
    eventCode: 'EVT-PK-2026-01',
    area: 'BCP Refinery Area 1 (Preheat Bay)',
    description: 'Reboiler Exchanger Tube Bundle Extraction & Winch Traction',
    type: 'Crane Pull (100T)',
    craneType: 'Crane Pull',
    capacity: 100,
    duration: '6 Hours',
    providerType: 'Owner Crane',
    dateFrom: '2026-09-28 07:30',
    date: '2026-09-28',
    time: '07:30 - 13:30',
    status: 'Approved',
    priority: 'High',
    progress: 0,
    contractor: 'BCP Operations (Owner Crane)',
    assignedCraneId: 'CR-003',
    assignedCraneName: 'Tadano GR-1000XL (100T)',
    x: 36.0,
    y: 36.5,
    isArea: false,
    width: 8,
    height: 6,
    rotation: 15,
    safetyRadius: 25,
    riggerLead: 'Prasert Somchai',
    ptwNo: 'PTW-2026-0928-CRN2',
    phorJor2Cert: 'PJ2-BCP-2026-9042',
    groundPressureKPa: 185,
    remarks: 'Permit endorsed. Horizontal bundle extractor team on standby.',
    inProgressChecklist: {
      step1: false,
      step2: false,
      step3: false,
      step4: false
    },
    createdAt: '2026-09-25T10:15:00.000Z'
  },
  {
    id: 260003,
    jobNo: 'ICM-2600003',
    equipmentId: '12-R-101',
    functionalLocation: '12-HCU (Hydrocracking Unit)',
    plant: 'Phra Khanong',
    eventName: 'Major Overhaul Q3',
    eventCode: 'EVT-PK-2026-02',
    area: 'Zone C Construction & Expansion',
    description: 'Hydrocracker High-Pressure Reactor Catalyst Loading & Crane Spool Lift',
    type: 'Crane Spot (500T)',
    craneType: 'Crane Spot',
    capacity: 500,
    duration: '12 Hours',
    providerType: 'Contractor Crane',
    dateFrom: '2026-09-29 06:00',
    date: '2026-09-29',
    time: '06:00 - 18:00',
    status: 'Requested',
    priority: 'Urgent',
    progress: 0,
    contractor: 'Contractor Heavy Lift (Contractor Crane)',
    x: 28.0,
    y: 68.0,
    isArea: false,
    width: 12,
    height: 10,
    rotation: 0,
    safetyRadius: 45,
    riggerLead: 'Somkiat Ratanakul',
    ptwNo: 'PTW-2026-0929-CRN3',
    phorJor2Cert: 'PJ2-BCP-2026-5511',
    groundPressureKPa: 310,
    remarks: 'Requires 500T Mobile Crane and dual rigging permit endorsement.',
    createdAt: '2026-09-26T14:20:00.000Z'
  },
  {
    id: 260004,
    jobNo: 'ICM-2600004',
    equipmentId: 'SR-V-201',
    functionalLocation: 'Sriracha Crude Unit Complex',
    plant: 'Sriracha',
    eventName: 'TA-2026 Vacuum Overhaul',
    eventCode: 'EVT-SR-2026-01',
    area: 'Sriracha Terminal Complex',
    description: 'Vacuum Furnace Convection Tube Module Structural Lifting',
    type: 'Crane Spot (160T)',
    craneType: 'Crane Spot',
    capacity: 160,
    duration: '8 Hours',
    providerType: 'Owner Crane',
    dateFrom: '2026-09-30 08:30',
    date: '2026-09-30',
    time: '08:30 - 16:30',
    status: 'Approved',
    priority: 'Normal',
    progress: 0,
    contractor: 'BCP Operations (Owner Crane)',
    assignedCraneId: 'CR-004',
    assignedCraneName: 'Demag AC 160-5 (160T)',
    x: 48.0,
    y: 52.0,
    isArea: false,
    width: 9,
    height: 7,
    rotation: -10,
    safetyRadius: 28,
    riggerLead: 'Anan Chokchai',
    ptwNo: 'PTW-2026-0930-CRN4',
    phorJor2Cert: 'PJ2-BCP-2026-3390',
    groundPressureKPa: 215,
    remarks: 'Scheduled during morning low-wind window.',
    createdAt: '2026-09-26T16:00:00.000Z'
  },
  {
    id: 260005,
    jobNo: 'ICM-2600005',
    equipmentId: '11-H-101',
    functionalLocation: '11-APS1 (Atmospheric Pipestill 1)',
    plant: 'Phra Khanong',
    eventName: 'Annual Turnaround 2026',
    eventCode: 'EVT-PK-2026-01',
    area: 'BCP Refinery Area 1 (Furnaces)',
    description: 'Furnace Fired Heater Burner Deck Component Replacement & Rigging',
    type: 'Crane Spot (50T)',
    craneType: 'Crane Spot',
    capacity: 50,
    duration: '4 Hours',
    providerType: 'Owner Crane',
    dateFrom: '2026-09-26 09:00',
    date: '2026-09-26',
    time: '09:00 - 13:00',
    status: 'Completed',
    priority: 'Normal',
    progress: 100,
    contractor: 'BCP Operations (Owner Crane)',
    assignedCraneId: 'CR-002',
    assignedCraneName: 'Kato CR-250Rv (25T x 2)',
    x: 64.0,
    y: 32.0,
    isArea: false,
    width: 7,
    height: 5,
    rotation: 0,
    safetyRadius: 20,
    riggerLead: 'Kitti Kongsuk',
    ptwNo: 'PTW-2026-0926-CRN5',
    phorJor2Cert: 'PJ2-BCP-2026-1144',
    groundPressureKPa: 160,
    remarks: 'Lifting completed safely and signed off by TSS Inspector.',
    inProgressChecklist: {
      step1: true,
      step2: true,
      step3: true,
      step4: true
    },
    createdAt: '2026-09-23T11:00:00.000Z'
  },
  {
    id: 260006,
    jobNo: 'CR-2026-0915',
    requestNo: 'REQ-01',
    woNumber: 'WO-89104',
    workOrder: 'WO-89104',
    equipmentId: 'E-1102',
    equipmentTag: 'E-1102',
    functionalLocation: '11-APS1 (Atmospheric Pipestill 1)',
    plant: 'Phra Khanong',
    area: 'Area 01: Crude Distillation Unit (CDU-1)',
    title: 'Heat Exchanger E-1102 Bundle Extraction & Retubing Rigging',
    description: 'Heat Exchanger E-1102 Bundle Extraction & Retubing Rigging',
    type: 'Crane Spot (100T)',
    craneType: 'Crane Spot',
    capacity: 100,
    duration: '4 Hours',
    providerType: 'Contractor Crane',
    dateFrom: '2026-09-28 08:00',
    date: '2026-09-28',
    time: '08:00 - 12:00',
    status: 'Pending Review',
    priority: 'High',
    progress: 0,
    contractor: 'Thai Rotary Engineering Co., Ltd.',
    loadWeightTon: 42.5,
    workingRadiusM: 24.0,
    boomLengthM: 38.5,
    x: 47.5,
    y: 38.0,
    ptwNo: 'PTW-2026-0915-CR',
    phorJor2Cert: 'PJ2-BCP-2026-8910',
    riggerLead: 'Somchai V. (Turnaround Rigging Lead)',
    createdAt: '2026-09-24T09:00:00.000Z'
  },
  {
    id: 260007,
    jobNo: 'CR-2026-0918',
    requestNo: 'REQ-02',
    woNumber: 'WO-89211',
    workOrder: 'WO-89211',
    equipmentId: 'C-101',
    equipmentTag: 'C-101',
    functionalLocation: '11-APS1 (Atmospheric Pipestill 1)',
    plant: 'Phra Khanong',
    area: 'Area 01: Crude Distillation Unit (CDU-1)',
    title: 'Tower Column C-101 Top Head Removal & Internal Demister Lift',
    description: 'Tower Column C-101 Top Head Removal & Internal Demister Lift',
    type: 'Crane Spot (50T)',
    craneType: 'Crane Spot',
    capacity: 50,
    duration: '4 Hours',
    providerType: 'Owner Crane',
    dateFrom: '2026-09-28 08:00',
    date: '2026-09-28',
    time: '08:00 - 12:00',
    status: 'Pending Review',
    priority: 'Normal',
    progress: 0,
    contractor: 'Crane & Rigging Services Asia',
    loadWeightTon: 26.0,
    workingRadiusM: 18.5,
    boomLengthM: 32.0,
    x: 52.0,
    y: 41.5,
    ptwNo: 'PTW-2026-0918-CR',
    phorJor2Cert: 'PJ2-BCP-2026-8921',
    riggerLead: 'Wichai T. (Maintenance Supt.)',
    createdAt: '2026-09-24T10:00:00.000Z'
  },
  {
    id: 260008,
    jobNo: 'CR-2026-0922',
    requestNo: 'REQ-03',
    woNumber: 'WO-89304',
    workOrder: 'WO-89304',
    equipmentId: 'F-101',
    equipmentTag: 'F-101',
    functionalLocation: '11-APS1 (Atmospheric Pipestill 1)',
    plant: 'Phra Khanong',
    area: 'Area 02: Furnaces & Stack Bay',
    title: 'Furnace F-101 Convection Section Tube Bank Heavy Rigging',
    description: 'Furnace F-101 Convection Section Tube Bank Heavy Rigging',
    type: 'Crane Spot (250T)',
    craneType: 'Crane Spot',
    capacity: 250,
    duration: '7 Hours',
    providerType: 'Contractor Crane',
    dateFrom: '2026-09-29 09:00',
    date: '2026-09-29',
    time: '09:00 - 16:00',
    status: 'Pending Review',
    priority: 'Urgent',
    progress: 0,
    contractor: 'Thai Shinryo Engineering Co., Ltd.',
    loadWeightTon: 145.0,
    workingRadiusM: 32.0,
    boomLengthM: 52.0,
    x: 62.0,
    y: 28.0,
    ptwNo: 'PTW-2026-0922-CR',
    phorJor2Cert: 'PJ2-BCP-2026-8930',
    riggerLead: 'Narong K. (Mechanical Supt.)',
    createdAt: '2026-09-24T11:00:00.000Z'
  },
  {
    id: 260009,
    jobNo: 'CR-2026-0925',
    requestNo: 'REQ-04',
    woNumber: 'WO-88762',
    workOrder: 'WO-88762',
    equipmentId: 'V-201',
    equipmentTag: 'V-201',
    functionalLocation: 'Sriracha Crude Unit Complex',
    plant: 'Sriracha',
    area: 'Area 03: Desalter & Flash Vessel Pad',
    title: 'Desalter Vessel V-201 Electrostatic Grid Overhaul Lift',
    description: 'Desalter Vessel V-201 Electrostatic Grid Overhaul Lift',
    type: 'Crane Spot (80T)',
    craneType: 'Crane Spot',
    capacity: 80,
    duration: '5 Hours',
    providerType: 'Owner Crane',
    dateFrom: '2026-09-29 13:00',
    date: '2026-09-29',
    time: '13:00 - 18:00',
    status: 'Assigned',
    priority: 'Normal',
    progress: 0,
    contractor: 'BCP Rigging Crew (Internal)',
    assignedCraneId: 'CR-004',
    assignedCraneName: 'Demag AC 160-5 (160T)',
    loadWeightTon: 34.0,
    workingRadiusM: 20.0,
    boomLengthM: 36.0,
    x: 35.0,
    y: 55.0,
    ptwNo: 'PTW-2026-0925-CR',
    phorJor2Cert: 'PJ2-BCP-2026-8876',
    riggerLead: 'Prasert S. (Rigging Supervisor)',
    createdAt: '2026-09-24T12:00:00.000Z'
  },
  {
    id: 260010,
    jobNo: 'CR-2026-0929',
    requestNo: 'REQ-05',
    woNumber: 'WO-882910',
    workOrder: 'WO-882910',
    equipmentId: '11-C-101',
    equipmentTag: '11-C-101',
    functionalLocation: '11-APS1 (Atmospheric Pipestill 1)',
    plant: 'Phra Khanong',
    area: 'Area 01: Crude Distillation Unit (CDU-1)',
    title: 'Crude Tower 11-C-101 Overhead Vapor Line Spool Lifting',
    description: 'Crude Tower 11-C-101 Overhead Vapor Line Spool Lifting',
    type: 'Crane Spot (60T)',
    craneType: 'Crane Spot',
    capacity: 60,
    duration: '4 Hours',
    providerType: 'Owner Crane',
    dateFrom: '2026-09-30 08:30',
    date: '2026-09-30',
    time: '08:30 - 12:30',
    status: 'Assigned',
    priority: 'Normal',
    progress: 0,
    contractor: 'BCP Operations (Owner Crane)',
    assignedCraneId: 'CR-002',
    assignedCraneName: 'Kato CR-250Rv (25T x 2)',
    loadWeightTon: 22.0,
    workingRadiusM: 16.0,
    boomLengthM: 30.0,
    x: 42.0,
    y: 38.0,
    ptwNo: 'PTW-2026-0929-CR5',
    phorJor2Cert: 'PJ2-BCP-2026-8829',
    riggerLead: 'Anan C. (Lead Rigging Eng)',
    createdAt: '2026-09-24T13:00:00.000Z'
  },
  {
    id: 260011,
    jobNo: 'CRN-26011',
    requestNo: 'CR-2026-0931',
    woNumber: 'WO-885011',
    workOrder: 'WO-885011',
    equipmentId: '12-E-105A',
    equipmentTag: '12-E-105A',
    functionalLocation: '12-HCU (Hydrocracking Unit)',
    plant: 'Phra Khanong',
    area: 'BCP Refinery Area 1 (CDU-1)',
    title: 'High Pressure Exchanger Channel Head & Tube Bundle Lift',
    description: 'High Pressure Exchanger Channel Head & Tube Bundle Lift',
    type: 'Crane Spot (120T)',
    craneType: 'Crane Spot',
    capacity: 120,
    duration: '6 Hours',
    providerType: 'Contractor Crane',
    dateFrom: '2026-09-27 10:00',
    date: '2026-09-27',
    time: '10:00 - 16:00',
    status: 'In Progress',
    priority: 'Urgent',
    progress: 45,
    contractor: 'Contractor Heavy Lift',
    assignedCraneId: 'CR-003',
    assignedCraneName: 'Tadano GR-1000XL (100T)',
    loadWeightTon: 58.0,
    workingRadiusM: 22.0,
    boomLengthM: 40.0,
    x: 55.0,
    y: 44.0,
    ptwNo: 'PTW-2026-0927-CRN6',
    phorJor2Cert: 'PJ2-BCP-2026-8850',
    riggerLead: 'Kitti Kongsuk',
    createdAt: '2026-09-24T14:00:00.000Z'
  },
  {
    id: 260012,
    jobNo: 'CRN-26012',
    requestNo: 'CR-2026-0932',
    woNumber: 'WO-885012',
    workOrder: 'WO-885012',
    equipmentId: '14-C-301',
    equipmentTag: '14-C-301',
    functionalLocation: 'Sriracha Crude Unit Complex',
    plant: 'Sriracha',
    area: 'Sriracha Terminal Complex',
    title: 'Vacuum Column Ejector Train Module Replacement Lift',
    description: 'Vacuum Column Ejector Train Module Replacement Lift',
    type: 'Crane Spot (80T)',
    craneType: 'Crane Spot',
    capacity: 80,
    duration: '5 Hours',
    providerType: 'Owner Crane',
    dateFrom: '2026-09-25 09:00',
    date: '2026-09-25',
    time: '09:00 - 14:00',
    status: 'Completed',
    priority: 'Normal',
    progress: 100,
    contractor: 'BCP Operations (Owner Crane)',
    assignedCraneId: 'CR-004',
    assignedCraneName: 'Demag AC 160-5 (160T)',
    loadWeightTon: 28.0,
    workingRadiusM: 19.0,
    boomLengthM: 34.0,
    x: 48.0,
    y: 60.0,
    ptwNo: 'PTW-2026-0925-CRN7',
    phorJor2Cert: 'PJ2-BCP-2026-8851',
    riggerLead: 'Somchai Prasert',
    createdAt: '2026-09-23T08:00:00.000Z'
  },
  {
    id: 260013,
    jobNo: 'CRN-26013',
    requestNo: 'CR-2026-0933',
    woNumber: 'WO-885013',
    workOrder: 'WO-885013',
    equipmentId: '21-B-201',
    equipmentTag: '21-B-201',
    functionalLocation: '11-APS1 (Atmospheric Pipestill 1)',
    plant: 'Phra Khanong',
    area: 'BCP Refinery Area 1 (Furnaces)',
    title: 'High Pressure Boiler Piping Header Structural Rigging',
    description: 'High Pressure Boiler Piping Header Structural Rigging',
    type: 'Crane Pull (50T)',
    craneType: 'Crane Pull',
    capacity: 50,
    duration: '4 Hours',
    providerType: 'Owner Crane',
    dateFrom: '2026-10-01 08:00',
    date: '2026-10-01',
    time: '08:00 - 12:00',
    status: 'Pending Review',
    priority: 'Normal',
    progress: 0,
    contractor: 'Contractor B (Piping)',
    loadWeightTon: 15.0,
    workingRadiusM: 15.0,
    boomLengthM: 28.0,
    x: 60.0,
    y: 35.0,
    ptwNo: 'PTW-2026-1001-CRN8',
    phorJor2Cert: 'PJ2-BCP-2026-8852',
    riggerLead: 'Wichai Thongdee',
    createdAt: '2026-09-25T15:00:00.000Z'
  },
  {
    id: 260014,
    jobNo: 'CRN-26014',
    requestNo: 'CR-2026-0934',
    woNumber: 'WO-885104',
    workOrder: 'WO-885104',
    equipmentId: '31-TK-01',
    equipmentTag: '31-TK-01',
    functionalLocation: 'Sriracha Crude Unit Complex',
    plant: 'Sriracha',
    area: 'Sriracha Terminal Complex',
    title: 'Crude Storage Tank 31-TK-01 Center Mixer Agitator Lift',
    description: 'Crude Storage Tank 31-TK-01 Center Mixer Agitator Lift',
    type: 'Crane Spot (100T)',
    craneType: 'Crane Spot',
    capacity: 100,
    duration: '8 Hours',
    providerType: 'Contractor Crane',
    dateFrom: '2026-09-30 08:00',
    date: '2026-09-30',
    time: '08:00 - 16:00',
    status: 'Assigned',
    priority: 'High',
    progress: 0,
    contractor: 'Contractor Heavy Lift',
    assignedCraneId: 'CR-004',
    assignedCraneName: 'Demag AC 160-5 (160T)',
    loadWeightTon: 38.0,
    workingRadiusM: 26.0,
    boomLengthM: 42.0,
    x: 65.0,
    y: 70.0,
    ptwNo: 'PTW-2026-0930-CRN9',
    phorJor2Cert: 'PJ2-BCP-2026-8853',
    riggerLead: 'Narong K.',
    createdAt: '2026-09-25T16:00:00.000Z'
  },
  {
    id: 260015,
    jobNo: 'CRN-26015',
    requestNo: 'CR-2026-0935',
    woNumber: 'WO-884033',
    workOrder: 'WO-884033',
    equipmentId: '41-BERTH-02',
    equipmentTag: '41-BERTH-02',
    functionalLocation: 'Sriracha Crude Unit Complex',
    plant: 'Sriracha',
    area: 'Sriracha Terminal Complex',
    title: 'Marine Loading Arm Hydraulic Actuator & Swivel Joint Lift',
    description: 'Marine Loading Arm Hydraulic Actuator & Swivel Joint Lift',
    type: 'Crane Spot (50T)',
    craneType: 'Crane Spot',
    capacity: 50,
    duration: '4 Hours',
    providerType: 'Owner Crane',
    dateFrom: '2026-09-25 13:00',
    date: '2026-09-25',
    time: '13:00 - 17:00',
    status: 'Completed',
    priority: 'Normal',
    progress: 100,
    contractor: 'BCP Operations (Owner Crane)',
    assignedCraneId: 'CR-002',
    assignedCraneName: 'Kato CR-250Rv (25T x 2)',
    loadWeightTon: 18.0,
    workingRadiusM: 14.0,
    boomLengthM: 25.0,
    x: 75.0,
    y: 80.0,
    ptwNo: 'PTW-2026-0925-CRN10',
    phorJor2Cert: 'PJ2-BCP-2026-8854',
    riggerLead: 'Somkiat Ratanakul',
    createdAt: '2026-09-23T14:00:00.000Z'
  },
  {
    id: 260016,
    jobNo: 'CRN-26016',
    requestNo: 'CR-2026-0936',
    woNumber: 'WO-884042',
    workOrder: 'WO-884042',
    equipmentId: '11-P-103A',
    equipmentTag: '11-P-103A',
    functionalLocation: '11-APS1 (Atmospheric Pipestill 1)',
    plant: 'Phra Khanong',
    area: 'BCP Refinery Area 1 (CDU-1)',
    title: 'Heavy Distillate Charge Pump 11-P-103A 400kW Motor Rigging',
    description: 'Heavy Distillate Charge Pump 11-P-103A 400kW Motor Rigging',
    type: 'Crane Spot (25T)',
    craneType: 'Crane Spot',
    capacity: 25,
    duration: '3 Hours',
    providerType: 'Owner Crane',
    dateFrom: '2026-09-26 14:00',
    date: '2026-09-26',
    time: '14:00 - 17:00',
    status: 'Completed',
    priority: 'Normal',
    progress: 100,
    contractor: 'BCP Operations (Owner Crane)',
    assignedCraneId: 'CR-002',
    assignedCraneName: 'Kato CR-250Rv (25T x 2)',
    loadWeightTon: 8.5,
    workingRadiusM: 12.0,
    boomLengthM: 22.0,
    x: 38.0,
    y: 30.0,
    ptwNo: 'PTW-2026-0926-CRN11',
    phorJor2Cert: 'PJ2-BCP-2026-8855',
    riggerLead: 'Prasert Somchai',
    createdAt: '2026-09-24T07:30:00.000Z'
  }
];

// Helper to normalize dates into clean YYYY-MM-DD
export function extractDateString(dateFrom?: string): string {
  if (!dateFrom) return '2026-09-28';
  const clean = dateFrom.trim();
  if (clean.includes('T')) return clean.split('T')[0];
  if (clean.includes(' ')) return clean.split(' ')[0];
  return clean.slice(0, 10);
}

// Helper to normalize time slot
export function extractTimeString(dateFrom?: string, duration?: string): string {
  if (!dateFrom) return '08:00 - 16:00';
  const parts = dateFrom.trim().split(' ');
  const startTime = parts[1] || '08:00';
  const [startH] = startTime.split(':').map(Number);
  const endH = Math.min(23, (startH || 8) + 4);
  const endTime = `${String(endH).padStart(2, '0')}:00`;
  return `${startTime} - ${endTime}`;
}

// Read all jobs from storage
export function getAllCraneJobs(): UnifiedCraneJob[] {
  if (typeof window === 'undefined') return DEFAULT_INITIAL_CRANE_JOBS;
  try {
    const raw = localStorage.getItem(CRANE_STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(CRANE_STORAGE_KEY, JSON.stringify(DEFAULT_INITIAL_CRANE_JOBS));
      return [...DEFAULT_INITIAL_CRANE_JOBS];
    }
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) {
      // Normalize any older records
      const normalized: UnifiedCraneJob[] = parsed.map((item: any, idx: number) => {
        const id = item.id || 260100 + idx;
        const jobNo = item.jobNo || `ICM-26${String(id).slice(-5)}`;
        const date = extractDateString(item.dateFrom || item.date);
        const time = item.time || extractTimeString(item.dateFrom, item.duration);
        const capacity = Number(item.capacity) || 50;
        const safetyRadius = item.safetyRadius || Math.max(15, Math.min(50, Math.round(capacity * 0.12 + 10)));

        // Derive request registry metadata
        const requestNo = item.requestNo || `REQ-CR26-${String(id).slice(-4)}`;
        const requestType: CraneRequestType = item.requestType || (capacity >= 300 ? 'CR01' : capacity >= 150 ? 'CR02' : capacity >= 80 ? 'CR03' : capacity >= 40 ? 'CR04' : 'CR05');

        // Status normalization
        const reqStatus: CraneRequestStatus = item.requestStatus || (
          item.status === 'Requested' ? 'Submitted' :
            item.status === 'Approved' ? 'Approved' :
              item.status === 'In Progress' ? 'In Progress' :
                item.status === 'Completed' ? 'Completed' :
                  item.status === 'Rejected' ? 'Rejected' :
                    item.status === 'Revision Required' ? 'Under Review' : 'Submitted'
        );

        const assignStatus: CraneAssignmentStatus = item.assignmentStatus || (
          item.assignedCraneId ? 'Assigned' : 'Unassigned'
        );

        const loadWeightTon = typeof item.loadWeightTon === 'number' ? item.loadWeightTon : Math.round(capacity * 0.65);
        const riggingWeightTon = typeof item.riggingWeightTon === 'number' ? item.riggingWeightTon : Math.round(loadWeightTon * 0.08 + 1);
        const grossLoadTon = typeof item.grossLoadTon === 'number' ? item.grossLoadTon : (loadWeightTon + riggingWeightTon);
        const workingRadiusM = typeof item.workingRadiusM === 'number' ? item.workingRadiusM : Math.round(capacity * 0.14 + 10);
        const requiredHookHeightM = typeof item.requiredHookHeightM === 'number' ? item.requiredHookHeightM : Math.round(capacity * 0.18 + 14);

        return {
          ...item,
          id,
          jobNo,
          requestNo,
          requestType,
          requestStatus: reqStatus,
          assignmentStatus: assignStatus,
          unit: item.unit || (item.functionalLocation ? item.functionalLocation.split(' ')[0] : '11-APS1'),
          equipmentType: item.equipmentType || (item.equipmentId?.includes('-C-') ? 'Distillation Column' : item.equipmentId?.includes('-E-') ? 'Heat Exchanger' : item.equipmentId?.includes('-H-') ? 'Fired Heater' : 'Process Vessel'),
          plant: item.plant || 'Phra Khanong',
          craneType: item.craneType || (item.type?.toLowerCase().includes('pull') ? 'Crane Pull' : 'Crane Spot'),
          capacity,
          loadWeightTon,
          riggingWeightTon,
          grossLoadTon,
          workingRadiusM,
          requiredHookHeightM,
          date,
          time,
          safetyRadius,
          status: item.status || 'Requested',
          progress: typeof item.progress === 'number' ? item.progress : (item.status === 'Completed' ? 100 : item.status === 'In Progress' ? 50 : 0),
          executionChecklist: item.executionChecklist || {
            riggingTackle: { done: item.inProgressChecklist?.step2 || false, inspector: 'Site Rigging Inspector' },
            outriggerPads: { done: item.inProgressChecklist?.step1 || false, inspector: 'Civil & Foundation Inspector' },
            liftExecution: { done: item.status === 'In Progress' || item.status === 'Completed', inspector: 'Lift Supervisor' },
            siteDemobilization: { done: item.status === 'Completed', inspector: 'Operations Lead' }
          },
          statusHistory: item.statusHistory || [
            {
              status: reqStatus,
              changedBy: item.reviewedBy || 'System Initializer',
              timestamp: item.createdAt || '2026-09-24T08:00:00Z',
              action: 'Initial Creation'
            }
          ],
        } as UnifiedCraneJob;
      });

      // Ensure any newly added seed jobs are merged in so that all modules have the full linked dataset
      const existingJobNos = new Set(normalized.map(j => j.jobNo));
      const missingDefaults = DEFAULT_INITIAL_CRANE_JOBS.filter(d => !existingJobNos.has(d.jobNo));
      if (missingDefaults.length > 0) {
        const merged = [...normalized, ...missingDefaults];
        try {
          localStorage.setItem(CRANE_STORAGE_KEY, JSON.stringify(merged));
        } catch { }
        return merged;
      }

      return normalized;
    }
    localStorage.setItem(CRANE_STORAGE_KEY, JSON.stringify(DEFAULT_INITIAL_CRANE_JOBS));
    return [...DEFAULT_INITIAL_CRANE_JOBS];
  } catch (e) {
    console.error('Failed to read crane operations jobs:', e);
    return [...DEFAULT_INITIAL_CRANE_JOBS];
  }
}

// Save entire array
export function saveAllCraneJobs(jobs: UnifiedCraneJob[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(CRANE_STORAGE_KEY, JSON.stringify(jobs));
    window.dispatchEvent(new CustomEvent('crane_operations_updated', { detail: { jobs } }));
  } catch (e) {
    console.error('Failed to save crane operations jobs:', e);
  }
}

// Add a newly created job
export function addCraneJob(newJob: Partial<UnifiedCraneJob>): UnifiedCraneJob {
  const all = getAllCraneJobs();
  const nextId = newJob.id || Math.floor(260550 + Math.random() * 9000);
  const jobNo = newJob.jobNo || `ICM-26${String(nextId).slice(-5)}`;
  const requestNo = newJob.requestNo || `REQ-CR26-${String(nextId).slice(-4)}`;
  const date = extractDateString(newJob.dateFrom || newJob.date || (newJob.workStartDateTime ? newJob.workStartDateTime.split(' ')[0] : ''));
  const time = newJob.time || (newJob.workStartDateTime && newJob.workEndDateTime ? `${newJob.workStartDateTime.split(' ')[1] || '08:00'} - ${newJob.workEndDateTime.split(' ')[1] || '17:00'}` : extractTimeString(newJob.dateFrom, newJob.duration));
  const capacity = Number(newJob.capacityRequired) || Number(newJob.capacity) || 50;
  const safetyRadius = newJob.safetyRadius || Math.max(15, Math.min(50, Math.round(capacity * 0.12 + 10)));

  const loadWeightTon = typeof newJob.totalWeightTon === 'number' ? newJob.totalWeightTon : (typeof newJob.loadWeightTon === 'number' ? newJob.loadWeightTon : Math.round(capacity * 0.65));
  const riggingWeightTon = typeof newJob.riggingWeightTon === 'number' ? newJob.riggingWeightTon : Math.round(loadWeightTon * 0.08 + 1);
  const grossLoadTon = typeof newJob.grossLoadTon === 'number' ? newJob.grossLoadTon : (loadWeightTon + riggingWeightTon);

  const fullJob: UnifiedCraneJob = {
    ...newJob,
    id: nextId,
    jobNo,
    requestNo,
    requestType: newJob.requestType || (capacity >= 200 ? 'CR01' : capacity >= 100 ? 'CR02' : 'CR03'),
    requestStatus: newJob.requestStatus || 'Submitted',
    assignmentStatus: newJob.assignmentStatus || (newJob.assignedCraneId ? 'Assigned' : 'Unassigned'),
    equipmentId: newJob.equipmentTag || newJob.equipmentId || '',
    equipmentTag: newJob.equipmentTag || newJob.equipmentId || '',
    woNumber: newJob.woNumber,
    workOrder: newJob.workOrder || (newJob.woNumber ? `WO-${newJob.woNumber}` : undefined),
    functionalLocation: newJob.functionalLocation || '',
    unit: newJob.unit || (newJob.functionalLocation ? newJob.functionalLocation.split(' ')[0] : '11-APS1'),
    equipmentType: newJob.equipmentType || 'Heavy Equipment',
    plant: newJob.plant || 'Phra Khanong',
    area: newJob.locationArea || newJob.area || (newJob.plant === 'Sriracha' ? 'Sriracha Terminal Complex' : 'BCP Refinery Area 1'),
    locationArea: newJob.locationArea || newJob.area,
    tradeSession: newJob.tradeSession || 'IMD',
    workStartDateTime: newJob.workStartDateTime,
    workEndDateTime: newJob.workEndDateTime,
    shift: newJob.shift || 'Day',
    description: newJob.description || 'Turnaround Crane Heavy Lift Package',
    type: newJob.type || `${newJob.craneType || 'Crane Spot'} (${capacity}T)${newJob.craneModel ? ` - ${newJob.craneModel}` : ''}`,
    craneType: newJob.craneType || 'Crane Spot',
    craneModel: newJob.craneModel,
    capacity,
    capacityRequired: capacity,
    boomLengthM: newJob.boomLengthM,
    workingRadiusM: newJob.workingRadiusM || Math.round(capacity * 0.14 + 10),
    totalWeightTon: newJob.totalWeightTon,
    loadDescription: newJob.loadDescription || newJob.description,
    loadWeightTon,
    riggingWeightTon,
    grossLoadTon,
    requiredHookHeightM: newJob.requiredHookHeightM || Math.round(capacity * 0.18 + 14),
    duration: newJob.duration || '4 Hours',
    providerType: newJob.providerType || 'Owner Crane',
    dateFrom: newJob.dateFrom || (newJob.workStartDateTime ? newJob.workStartDateTime : `${date} 08:00`),
    date,
    time,
    status: (newJob.status as CraneJobStatus) || 'Requested',
    priority: newJob.priority || (capacity >= 100 ? 'Urgent' : capacity >= 50 ? 'High' : 'Normal'),
    progress: newJob.progress || 0,
    contractor: newJob.contractor || (newJob.providerType === 'Owner Crane' ? 'BCP Operations (Owner Crane)' : 'Contractor Heavy Lift (Contractor Crane)'),
    requester: newJob.submittedBy || newJob.requester || 'Turnaround Rigging Lead',
    submittedBy: newJob.submittedBy || newJob.requester || 'Turnaround Rigging Lead',
    submissionDate: newJob.submissionDate,
    department: newJob.department || 'Turnaround Maintenance & Rigging Dept',
    gridReference: newJob.gridReference || 'GRID-C4-12',
    siteConstraints: newJob.siteConstraints || 'Overhead pipe rack clearance required.',
    safetyNotes: newJob.safetyNotes || 'Ground pressure check and double rigging permit required.',
    assignedCraneId: newJob.assignedCraneId,
    assignedCraneName: newJob.assignedCraneName,
    reviewBy: newJob.reviewBy,
    reviewedBy: newJob.reviewBy || newJob.reviewedBy,
    reviewNotes: newJob.reviewNotes,
    optimizeWith: newJob.optimizeWith,
    x: typeof newJob.x === 'number' ? newJob.x : 45.0,
    y: typeof newJob.y === 'number' ? newJob.y : 50.0,
    isArea: Boolean(newJob.isArea),
    width: newJob.width || 8,
    height: newJob.height || 6,
    rotation: newJob.rotation || 0,
    safetyRadius,
    riggerLead: newJob.riggerLead || 'Assigned Site Rigger',
    ptwNo: newJob.ptwNo || `PTW-2026-${String(jobNo).slice(-4)}`,
    phorJor2Cert: newJob.phorJor2Cert || `PJ2-BCP-2026-${String(jobNo).slice(-4)}`,
    groundPressureKPa: newJob.groundPressureKPa || (capacity * 2.5 + 80),
    remarks: newJob.remarks || newJob.additionalRemarks,
    additionalRemarks: newJob.additionalRemarks || newJob.remarks,
    executionChecklist: newJob.executionChecklist || {
      riggingTackle: { done: false },
      outriggerPads: { done: false },
      liftExecution: { done: false },
      siteDemobilization: { done: false }
    },
    statusHistory: newJob.statusHistory || [
      {
        status: newJob.requestStatus || 'Submitted',
        changedBy: newJob.submittedBy || newJob.requester || 'Requester',
        timestamp: new Date().toISOString(),
        action: 'Created Request'
      }
    ],
    attachments: newJob.attachments || [],
    createdAt: newJob.createdAt || new Date().toISOString()
  };

  const updated = [fullJob, ...all.filter(j => String(j.id) !== String(fullJob.id) && j.jobNo !== fullJob.jobNo)];
  saveAllCraneJobs(updated);

  addCraneAuditLog({
    action: 'Create Request',
    jobNo,
    user: newJob.requester || 'Operator',
    role: 'Turnaround Engineer',
    newValue: `Request ${requestNo} (${fullJob.requestType}) created.`
  });

  return fullJob;
}

// Update an existing job by ID or jobNo
export function updateCraneJob(identifier: string | number, patch: Partial<UnifiedCraneJob>): UnifiedCraneJob | null {
  const all = getAllCraneJobs();
  const idStr = String(identifier);
  let found: UnifiedCraneJob | null = null;

  const updated = all.map(job => {
    if (String(job.id) === idStr || job.jobNo === idStr || job.requestNo === idStr) {
      const merged: UnifiedCraneJob = {
        ...job,
        ...patch,
        // Auto-recalculate progress if status is changed to Completed or In Progress
        status: (patch.status as CraneJobStatus) || job.status,
        progress: typeof patch.progress === 'number'
          ? patch.progress
          : patch.status === 'Completed' ? 100 : patch.status === 'In Progress' && job.progress === 0 ? 25 : job.progress
      };
      found = merged;
      return merged;
    }
    return job;
  });

  if (found) {
    saveAllCraneJobs(updated);
  }
  return found;
}

// Check Double Booking: Check if target crane is already assigned to another job with overlapping date & time
export function checkCraneDoubleBooking(
  craneId: string,
  date: string,
  timeSlot: string,
  currentJobId?: string | number
): { hasConflict: boolean; conflictingJobNo?: string; conflictingTime?: string } {
  if (!craneId) return { hasConflict: false };
  const all = getAllCraneJobs();

  const conflict = all.find(job => {
    if (currentJobId && (String(job.id) === String(currentJobId) || job.jobNo === String(currentJobId))) {
      return false;
    }
    if (job.assignedCraneId !== craneId) return false;
    if (job.status === 'Completed' || job.status === 'Cancelled' || job.status === 'Rejected') return false;
    if (job.assignmentStatus === 'Released' || job.assignmentStatus === 'Unassigned') return false;

    // Compare date
    const jobDate = job.date || extractDateString(job.dateFrom);
    if (jobDate !== date) return false;

    // Both are on the same date and assigned to the same crane!
    return true;
  });

  if (conflict) {
    return {
      hasConflict: true,
      conflictingJobNo: conflict.jobNo,
      conflictingTime: conflict.time || conflict.dateFrom
    };
  }

  return { hasConflict: false };
}

// Assign crane to a job and update both job and crane master, recording audit log
export function assignCraneToJob(
  jobId: string | number,
  craneId: string,
  craneName: string,
  user: string = 'Rigging Superintendent'
): { success: boolean; message?: string } {
  const all = getAllCraneJobs();
  const idStr = String(jobId);
  const targetJob = all.find(j => String(j.id) === idStr || j.jobNo === idStr);
  if (!targetJob) return { success: false, message: 'Job not found' };

  // Double booking check
  const doubleBooking = checkCraneDoubleBooking(craneId, targetJob.date || '2026-09-28', targetJob.time || '08:00 - 16:00', jobId);
  if (doubleBooking.hasConflict) {
    return {
      success: false,
      message: `Crane ${craneId} is already booked on ${targetJob.date} by Job ${doubleBooking.conflictingJobNo} (${doubleBooking.conflictingTime})! Double booking prevented.`
    };
  }

  const previousCrane = targetJob.assignedCraneId;
  const historyEntry = {
    status: 'Assigned',
    changedBy: user,
    timestamp: new Date().toISOString(),
    action: `Crane Assigned: ${craneId} (${craneName})`
  };

  updateCraneJob(jobId, {
    assignedCraneId: craneId,
    assignedCraneName: craneName,
    assignmentStatus: 'Assigned',
    status: 'Assigned',
    statusHistory: [...(targetJob.statusHistory || []), historyEntry]
  });

  addCraneAuditLog({
    action: 'Assign Crane',
    jobNo: targetJob.jobNo,
    user,
    role: 'Rigging Superintendent',
    previousValue: previousCrane || 'None',
    newValue: `${craneId} - ${craneName}`
  });

  return { success: true };
}

// Release / cancel crane assignment
export function releaseCraneAssignment(
  jobId: string | number,
  reason: string,
  user: string = 'Rigging Superintendent'
): { success: boolean; message?: string } {
  const all = getAllCraneJobs();
  const idStr = String(jobId);
  const targetJob = all.find(j => String(j.id) === idStr || j.jobNo === idStr);
  if (!targetJob) return { success: false, message: 'Job not found' };

  const previousCrane = targetJob.assignedCraneId;
  const historyEntry = {
    status: 'Released',
    changedBy: user,
    timestamp: new Date().toISOString(),
    action: `Crane Assignment Released (Previously: ${previousCrane}). Reason: ${reason}`
  };

  updateCraneJob(jobId, {
    assignedCraneId: undefined,
    assignedCraneName: undefined,
    assignmentStatus: 'Released',
    status: targetJob.status === 'Assigned' ? 'Approved' : targetJob.status,
    statusHistory: [...(targetJob.statusHistory || []), historyEntry]
  });

  addCraneAuditLog({
    action: 'Cancel Assignment',
    jobNo: targetJob.jobNo,
    user,
    role: 'Rigging Superintendent',
    previousValue: previousCrane || 'None',
    newValue: 'Unassigned',
    reason
  });

  return { success: true };
}

// Transition request status with audit log and reason
export function updateCraneRequestWorkflow(
  jobId: string | number,
  newStatus: CraneRequestStatus,
  user: string,
  role: string,
  reason?: string
): { success: boolean; message?: string } {
  const all = getAllCraneJobs();
  const idStr = String(jobId);
  const targetJob = all.find(j => String(j.id) === idStr || j.jobNo === idStr);
  if (!targetJob) return { success: false, message: 'Job not found' };

  const prevStatus = targetJob.requestStatus;
  const historyEntry = {
    status: newStatus,
    changedBy: user,
    timestamp: new Date().toISOString(),
    action: `Request status transitioned from ${prevStatus} to ${newStatus}`,
    reason
  };

  const statusVal: CraneJobStatus =
    newStatus === 'Approved' ? 'Approved' :
      newStatus === 'Rejected' ? 'Rejected' :
        newStatus === 'In Progress' ? 'In Progress' :
          newStatus === 'Completed' ? 'Completed' :
            newStatus === 'Cancelled' ? 'Cancelled' :
              targetJob.status;

  updateCraneJob(jobId, {
    requestStatus: newStatus,
    status: statusVal,
    rejectReason: newStatus === 'Rejected' ? reason : targetJob.rejectReason,
    revisionNote: newStatus === 'Under Review' ? reason : targetJob.revisionNote,
    reviewedBy: user,
    reviewedAt: new Date().toISOString(),
    statusHistory: [...(targetJob.statusHistory || []), historyEntry]
  });

  addCraneAuditLog({
    action: newStatus === 'Approved' ? 'Approve Request' : newStatus === 'Rejected' ? 'Reject Plan' : newStatus === 'Cancelled' ? 'Cancel Request' : 'Return for Revision',
    jobNo: targetJob.jobNo,
    user,
    role,
    previousValue: prevStatus,
    newValue: newStatus,
    reason
  });

  return { success: true };
}

// Delete a crane job
export function deleteCraneJob(identifier: string | number): void {
  const all = getAllCraneJobs();
  const idStr = String(identifier);
  const filtered = all.filter(j => String(j.id) !== idStr && j.jobNo !== idStr);
  saveAllCraneJobs(filtered);
}

// Subscribe to real-time cross-tab & cross-component updates
export function subscribeToCraneOperations(callback: (jobs: UnifiedCraneJob[]) => void): () => void {
  if (typeof window === 'undefined') return () => { };

  const handler = () => {
    callback(getAllCraneJobs());
  };

  window.addEventListener('crane_operations_updated', handler);
  window.addEventListener('storage', handler);

  return () => {
    window.removeEventListener('crane_operations_updated', handler);
    window.removeEventListener('storage', handler);
  };
}

