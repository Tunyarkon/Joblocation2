// =========================================================================
// SCAFFOLDING DATA STORE & RENTAL OFF-HIRE MANAGEMENT SERVICE
// PlantTurn System - Scaffolding Tracking & Overdue Cost Optimization
// =========================================================================

export type ScaffoldingStatus = 'Active' | 'Due Soon' | 'Overdue' | 'Off-Hired';

export interface ExtensionRecord {
  id: string;
  previousOffHireDate: string;
  newOffHireDate: string;
  reason: string;
  extendedAt: string;
  extendedBy: string;
}

export interface ScaffoldingItem {
  id: string; // e.g. SCF-2026-001
  jobId: string; // e.g. JOB-PK-2601
  plant: 'Phra Khanong' | 'Sriracha';
  area: string; // e.g. Area 01 - CDU-1
  locationDetails?: string; // e.g. Column C-101 North Platform, Elev +18.5m
  contractor: string; // e.g. Thai Industrial Scaffolding
  rentalStartDate: string; // YYYY-MM-DD
  plannedOffHireDate: string; // YYYY-MM-DD
  actualOffHireDate?: string | null; // YYYY-MM-DD
  dailyRentalRate: number; // THB/day
  responsiblePerson: string;
  remark?: string;
  extensionHistory: ExtensionRecord[];
  x?: number; // 0-100 percentage on CAD plot plan
  y?: number; // 0-100 percentage on CAD plot plan
  gridZone?: string; // e.g. "B3"
  bayDimension?: string; // e.g. "4m × 6m (Tower Bay)"
  createdAt: string;
  updatedAt: string;
}

export interface CalculatedScaffoldMetrics {
  status: ScaffoldingStatus;
  daysRemaining: number; // positive = days until due, 0 = due today, negative = days overdue
  overdueDays: number; // max(0, -daysRemaining) if not off-hired
  rentalDuration: number; // days rented based on rules
  estimatedRentalCost: number; // Duration * dailyRentalRate
  estimatedOverdueCost: number; // overdueDays * dailyRentalRate
  isDueSoon: boolean;
  isOverdue: boolean;
  isOffHired: boolean;
}

export interface ScaffoldingNotification {
  id: string;
  scaffoldId: string;
  jobId: string;
  location: string;
  plant: string;
  plannedOffHireDate: string;
  daysRemaining: number;
  overdueDays: number;
  responsiblePerson: string;
  triggerType: '3_DAYS_BEFORE' | '1_DAY_BEFORE' | 'ON_DUE_DATE' | 'OVERDUE';
  title: string;
  message: string;
  severity: 'warning' | 'critical' | 'info';
  timestamp: string;
}

// System reference date - aligned with PlantTurn project timeline (2026-10-17)
export const SYSTEM_CURRENT_DATE = '2026-10-17';

// Date math helper (day difference)
export function getDiffInDays(dateStrA: string, dateStrB: string): number {
  const dateA = new Date(dateStrA);
  const dateB = new Date(dateStrB);
  dateA.setHours(0, 0, 0, 0);
  dateB.setHours(0, 0, 0, 0);
  const diffTime = dateA.getTime() - dateB.getTime();
  return Math.round(diffTime / (1000 * 60 * 60 * 24));
}

/**
 * Core Calculation Logic for a Scaffolding Item
 * Separated as a pure function to allow easy adjustment according to actual rental contracts.
 */
export function calculateScaffoldMetrics(
  item: ScaffoldingItem,
  currentDate: string = SYSTEM_CURRENT_DATE
): CalculatedScaffoldMetrics {
  const isOffHired = Boolean(item.actualOffHireDate);

  if (isOffHired) {
    const actualDate = item.actualOffHireDate || currentDate;
    // Rental duration = days from start to actual off-hire date
    const duration = Math.max(1, getDiffInDays(actualDate, item.rentalStartDate) + 1);
    
    // Historical overdue check if actual off-hire was past planned
    const overduePastPlanned = Math.max(0, getDiffInDays(actualDate, item.plannedOffHireDate));
    const estimatedRentalCost = duration * (item.dailyRentalRate || 0);
    const estimatedOverdueCost = overduePastPlanned * (item.dailyRentalRate || 0);

    return {
      status: 'Off-Hired',
      daysRemaining: 0,
      overdueDays: 0,
      rentalDuration: duration,
      estimatedRentalCost,
      estimatedOverdueCost,
      isDueSoon: false,
      isOverdue: false,
      isOffHired: true
    };
  }

  // Active / Due Soon / Overdue
  const daysUntilDue = getDiffInDays(item.plannedOffHireDate, currentDate);
  let status: ScaffoldingStatus = 'Active';
  let overdueDays = 0;

  if (daysUntilDue < 0) {
    status = 'Overdue';
    overdueDays = Math.abs(daysUntilDue);
  } else if (daysUntilDue <= 3) {
    status = 'Due Soon';
    overdueDays = 0;
  } else {
    status = 'Active';
    overdueDays = 0;
  }

  // Rental duration: start to current date (if current > start), minimum 1 day
  const daysActiveSoFar = Math.max(1, getDiffInDays(currentDate, item.rentalStartDate) + 1);
  const plannedDuration = Math.max(1, getDiffInDays(item.plannedOffHireDate, item.rentalStartDate) + 1);
  
  // Base planned rental cost
  const estimatedRentalCost = plannedDuration * (item.dailyRentalRate || 0);
  // Surcharge for days exceeding planned off-hire date
  const estimatedOverdueCost = overdueDays * (item.dailyRentalRate || 0);

  return {
    status,
    daysRemaining: daysUntilDue,
    overdueDays,
    rentalDuration: status === 'Overdue' ? daysActiveSoFar : plannedDuration,
    estimatedRentalCost,
    estimatedOverdueCost,
    isDueSoon: status === 'Due Soon',
    isOverdue: status === 'Overdue',
    isOffHired: false
  };
}

/**
 * Generate Notification Triggers according to Requirement:
 * - 3 Days Before Due Date
 * - 1 Day Before Due Date
 * - On Due Date
 * - Overdue
 */
export function generateScaffoldingNotifications(
  items: ScaffoldingItem[],
  currentDate: string = SYSTEM_CURRENT_DATE
): ScaffoldingNotification[] {
  const notifications: ScaffoldingNotification[] = [];

  items.forEach(item => {
    // If already off-hired, alerts stop
    if (item.actualOffHireDate) return;

    const metrics = calculateScaffoldMetrics(item, currentDate);
    const location = `${item.plant} - ${item.area}${item.locationDetails ? ` (${item.locationDetails})` : ''}`;

    if (metrics.status === 'Overdue') {
      notifications.push({
        id: `NOTIF-OVD-${item.id}`,
        scaffoldId: item.id,
        jobId: item.jobId,
        location,
        plant: item.plant,
        plannedOffHireDate: item.plannedOffHireDate,
        daysRemaining: metrics.daysRemaining,
        overdueDays: metrics.overdueDays,
        responsiblePerson: item.responsiblePerson,
        triggerType: 'OVERDUE',
        title: `⚠️ Overdue Off-Hire Alert: ${item.id}`,
        message: `Scaffold ${item.id} (${item.contractor}) is ${metrics.overdueDays} day(s) overdue! Estimated surcharge: ฿${(metrics.estimatedOverdueCost).toLocaleString()}. Please confirm off-hire or extend immediately.`,
        severity: 'critical',
        timestamp: 'Just now'
      });
    } else if (metrics.daysRemaining === 0) {
      notifications.push({
        id: `NOTIF-TODAY-${item.id}`,
        scaffoldId: item.id,
        jobId: item.jobId,
        location,
        plant: item.plant,
        plannedOffHireDate: item.plannedOffHireDate,
        daysRemaining: 0,
        overdueDays: 0,
        responsiblePerson: item.responsiblePerson,
        triggerType: 'ON_DUE_DATE',
        title: `⏰ Due Today for Off-Hire: ${item.id}`,
        message: `Scaffold ${item.id} is scheduled for Off-Hire TODAY (${item.plannedOffHireDate}). Please contact contractor ${item.contractor} to release equipment.`,
        severity: 'warning',
        timestamp: 'Today 08:00'
      });
    } else if (metrics.daysRemaining === 1) {
      notifications.push({
        id: `NOTIF-1DAY-${item.id}`,
        scaffoldId: item.id,
        jobId: item.jobId,
        location,
        plant: item.plant,
        plannedOffHireDate: item.plannedOffHireDate,
        daysRemaining: 1,
        overdueDays: 0,
        responsiblePerson: item.responsiblePerson,
        triggerType: '1_DAY_BEFORE',
        title: `🔔 1 Day Before Due Date: ${item.id}`,
        message: `Scaffold ${item.id} will reach planned off-hire date tomorrow (${item.plannedOffHireDate}). Confirm field completion or submit rental extension.`,
        severity: 'warning',
        timestamp: 'Today 06:00'
      });
    } else if (metrics.daysRemaining <= 3 && metrics.daysRemaining > 1) {
      notifications.push({
        id: `NOTIF-3DAYS-${item.id}`,
        scaffoldId: item.id,
        jobId: item.jobId,
        location,
        plant: item.plant,
        plannedOffHireDate: item.plannedOffHireDate,
        daysRemaining: metrics.daysRemaining,
        overdueDays: 0,
        responsiblePerson: item.responsiblePerson,
        triggerType: '3_DAYS_BEFORE',
        title: `📅 ${metrics.daysRemaining} Days Before Due Date: ${item.id}`,
        message: `Scaffold ${item.id} has ${metrics.daysRemaining} days remaining until off-hire due date (${item.plannedOffHireDate}). Responsible: ${item.responsiblePerson}.`,
        severity: 'info',
        timestamp: 'Yesterday'
      });
    }
  });

  return notifications;
}

// Initial Mock Scaffolding Dataset with CAD Plot Plan Coordinates
export const INITIAL_SCAFFOLDING_DATA: ScaffoldingItem[] = [
  {
    id: 'SCF-2026-001',
    jobId: 'JOB-PK-2601',
    plant: 'Phra Khanong',
    area: 'Area 01 - CDU-1',
    locationDetails: 'Column C-101 North Platform, Elev +18.5m',
    contractor: 'Thai Industrial Scaffolding',
    rentalStartDate: '2026-09-28',
    plannedOffHireDate: '2026-10-12', // 5 days overdue (Current: 2026-10-17)
    actualOffHireDate: null,
    dailyRentalRate: 2800,
    responsiblePerson: 'Somchai Prasert (Field Inspector)',
    remark: 'Tower scaffold for tray replacement and nozzle welding.',
    x: 38,
    y: 44,
    gridZone: 'B3',
    bayDimension: '4m × 6m (Tower Bay)',
    extensionHistory: [
      {
        id: 'EXT-001',
        previousOffHireDate: '2026-10-08',
        newOffHireDate: '2026-10-12',
        reason: 'NDT inspection delayed due to rain.',
        extendedAt: '2026-10-07 14:30',
        extendedBy: 'Somchai Prasert'
      }
    ],
    createdAt: '2026-09-26 09:00',
    updatedAt: '2026-10-07 14:30'
  },
  {
    id: 'SCF-2026-002',
    jobId: 'JOB-SR-2604',
    plant: 'Sriracha',
    area: 'Area 02 - Furnace',
    locationDetails: 'Furnace F-201 Burner Deck Lower Section',
    contractor: 'Siam Scaffold & Engineering',
    rentalStartDate: '2026-10-02',
    plannedOffHireDate: '2026-10-15', // 2 days overdue
    actualOffHireDate: null,
    dailyRentalRate: 3500,
    responsiblePerson: 'Anan Suwan (Turnover Lead)',
    remark: 'Heavy duty modular access for refractory repair.',
    x: 55,
    y: 32,
    gridZone: 'C2',
    bayDimension: '6m × 8m (Burner Deck)',
    extensionHistory: [],
    createdAt: '2026-10-01 11:20',
    updatedAt: '2026-10-01 11:20'
  },
  {
    id: 'SCF-2026-003',
    jobId: 'JOB-PK-2608',
    plant: 'Phra Khanong',
    area: 'Crude Distillation Unit',
    locationDetails: 'Exchanger E-104 Channel Head Access',
    contractor: 'Advance Access Co., Ltd.',
    rentalStartDate: '2026-10-05',
    plannedOffHireDate: '2026-10-17', // Due Today! (0 days remaining)
    actualOffHireDate: null,
    dailyRentalRate: 1800,
    responsiblePerson: 'Wichai Raksakul (Turnover Coordinator)',
    remark: 'Bundle pulling access platform. Work reported 95% complete.',
    x: 46,
    y: 52,
    gridZone: 'B4',
    bayDimension: '3m × 5m (Exchanger Bay)',
    extensionHistory: [],
    createdAt: '2026-10-04 10:15',
    updatedAt: '2026-10-04 10:15'
  },
  {
    id: 'SCF-2026-004',
    jobId: 'JOB-SR-2612',
    plant: 'Sriracha',
    area: 'Tank Farm B',
    locationDetails: 'Crude Storage Tank TK-502 Shell Plating',
    contractor: 'Summit Scaffolding Service',
    rentalStartDate: '2026-10-06',
    plannedOffHireDate: '2026-10-18', // 1 day remaining (Due Soon)
    actualOffHireDate: null,
    dailyRentalRate: 4200,
    responsiblePerson: 'Kittisak Chaipradit (Plant Inspector)',
    remark: 'Curved ring scaffolding for ultrasonic shell thickness measurement.',
    x: 74,
    y: 68,
    gridZone: 'D5',
    bayDimension: 'Ring Scaffold (Circumferential)',
    extensionHistory: [],
    createdAt: '2026-10-05 13:40',
    updatedAt: '2026-10-05 13:40'
  },
  {
    id: 'SCF-2026-005',
    jobId: 'JOB-PK-2615',
    plant: 'Phra Khanong',
    area: 'Pipe Rack Corridor East',
    locationDetails: 'Bay PR-14 to PR-16 High-level Steam Line',
    contractor: 'Thai Industrial Scaffolding',
    rentalStartDate: '2026-10-08',
    plannedOffHireDate: '2026-10-20', // 3 days remaining (Due Soon)
    actualOffHireDate: null,
    dailyRentalRate: 2200,
    responsiblePerson: 'Somchai Prasert (Field Inspector)',
    remark: 'Suspended pipe rack platform for insulation renewal.',
    x: 62,
    y: 48,
    gridZone: 'C3',
    bayDimension: '2m × 18m (Suspended Bay)',
    extensionHistory: [],
    createdAt: '2026-10-07 16:00',
    updatedAt: '2026-10-07 16:00'
  },
  {
    id: 'SCF-2026-006',
    jobId: 'JOB-PK-2620',
    plant: 'Phra Khanong',
    area: 'Area 01 - CDU-1',
    locationDetails: 'Fin-Fan Cooler Platform Air Bank 3',
    contractor: 'Siam Scaffold & Engineering',
    rentalStartDate: '2026-10-10',
    plannedOffHireDate: '2026-10-27', // 10 days remaining (Active)
    actualOffHireDate: null,
    dailyRentalRate: 3100,
    responsiblePerson: 'Nattapong Klinhom (Maintenance Tech)',
    remark: 'Access for motor and fan belt replacement.',
    x: 34,
    y: 38,
    gridZone: 'B2',
    bayDimension: '4m × 8m (Cooler Bay)',
    extensionHistory: [],
    createdAt: '2026-10-09 08:30',
    updatedAt: '2026-10-09 08:30'
  },
  {
    id: 'SCF-2026-007',
    jobId: 'JOB-SR-2625',
    plant: 'Sriracha',
    area: 'Area 03 - Utilities',
    locationDetails: 'Boiler B-301 Stack Flue Gas Duct',
    contractor: 'Advance Access Co., Ltd.',
    rentalStartDate: '2026-10-12',
    plannedOffHireDate: '2026-11-02', // 16 days remaining (Active)
    actualOffHireDate: null,
    dailyRentalRate: 2600,
    responsiblePerson: 'Anan Suwan (Turnover Lead)',
    remark: 'High elevation bird-cage structure for damper actuator overhaul.',
    x: 28,
    y: 72,
    gridZone: 'A5',
    bayDimension: '5m × 5m (Boiler Stack)',
    extensionHistory: [],
    createdAt: '2026-10-11 14:10',
    updatedAt: '2026-10-11 14:10'
  },
  {
    id: 'SCF-2026-008',
    jobId: 'JOB-PK-2590',
    plant: 'Phra Khanong',
    area: 'Flare System KOD',
    locationDetails: 'Knock-Out Drum V-109 Level Transmitter',
    contractor: 'Thai Industrial Scaffolding',
    rentalStartDate: '2026-09-15',
    plannedOffHireDate: '2026-10-05',
    actualOffHireDate: '2026-10-05', // Confirmed Off-Hired on schedule
    dailyRentalRate: 1500,
    responsiblePerson: 'Somchai Prasert (Field Inspector)',
    remark: 'Instrument replacement complete. Green tag signed off and equipment returned.',
    x: 82,
    y: 22,
    gridZone: 'D1',
    bayDimension: '3m × 3m (Drum Access)',
    extensionHistory: [],
    createdAt: '2026-09-14 10:00',
    updatedAt: '2026-10-05 17:00'
  },
  {
    id: 'SCF-2026-009',
    jobId: 'JOB-SR-2588',
    plant: 'Sriracha',
    area: 'Crude Distillation Unit',
    locationDetails: 'P-101A/B Charge Pump Foundation Access',
    contractor: 'Summit Scaffolding Service',
    rentalStartDate: '2026-09-20',
    plannedOffHireDate: '2026-10-02',
    actualOffHireDate: '2026-10-04', // Confirmed Off-Hired (2 days late, now finalized)
    dailyRentalRate: 2000,
    responsiblePerson: 'Kittisak Chaipradit (Plant Inspector)',
    remark: 'Mechanical seal piping alignment concluded. Final invoice confirmed.',
    x: 48,
    y: 42,
    gridZone: 'B3',
    bayDimension: '4m × 4m (Pump Foundation)',
    extensionHistory: [
      {
        id: 'EXT-002',
        previousOffHireDate: '2026-10-02',
        newOffHireDate: '2026-10-04',
        reason: 'Hydrotest punch list rectification required extra 2 days.',
        extendedAt: '2026-10-01 16:45',
        extendedBy: 'Kittisak Chaipradit'
      }
    ],
    createdAt: '2026-09-19 15:30',
    updatedAt: '2026-10-04 18:00'
  },
  {
    id: 'SCF-2026-010',
    jobId: 'JOB-SR-2630',
    plant: 'Sriracha',
    area: 'Hydrocracking Complex (HCU)',
    locationDetails: 'Reactor R-201 Head Flange Access Platform',
    contractor: 'Siam Scaffold & Engineering',
    rentalStartDate: '2026-10-08',
    plannedOffHireDate: '2026-10-14', // 3 days overdue
    actualOffHireDate: null,
    dailyRentalRate: 3800,
    responsiblePerson: 'Anan Suwan (Turnover Lead)',
    remark: 'Heavy modular tower for catalyst loading chute support.',
    x: 65,
    y: 28,
    gridZone: 'C2',
    bayDimension: '6m × 6m (Reactor Bay)',
    extensionHistory: [],
    createdAt: '2026-10-07 11:00',
    updatedAt: '2026-10-07 11:00'
  },
  {
    id: 'SCF-2026-011',
    jobId: 'JOB-PK-2632',
    plant: 'Phra Khanong',
    area: 'Storage & Offsite Yard',
    locationDetails: 'Nitrogen Manifold Skid Shelter',
    contractor: 'Thai Industrial Scaffolding',
    rentalStartDate: '2026-10-13',
    plannedOffHireDate: '2026-10-19', // 2 days left (Due Soon)
    actualOffHireDate: null,
    dailyRentalRate: 2400,
    responsiblePerson: 'Somchai Prasert (Field Inspector)',
    remark: 'Weather canopy scaffold for high-pressure valve testing.',
    x: 78,
    y: 56,
    gridZone: 'D4',
    bayDimension: '5m × 10m (Canopy Bay)',
    extensionHistory: [],
    createdAt: '2026-10-12 14:00',
    updatedAt: '2026-10-12 14:00'
  },
  {
    id: 'SCF-2026-012',
    jobId: 'JOB-SR-2635',
    plant: 'Sriracha',
    area: 'Marine Terminal Jetty',
    locationDetails: 'Jetty Loading Arm Berthing Platform 2',
    contractor: 'Advance Access Co., Ltd.',
    rentalStartDate: '2026-10-01',
    plannedOffHireDate: '2026-10-11',
    actualOffHireDate: '2026-10-11', // Finalized Off-Hire on schedule
    dailyRentalRate: 3000,
    responsiblePerson: 'Kittisak Chaipradit (Plant Inspector)',
    remark: 'Marine swivel joint repacking completed and certified.',
    x: 18,
    y: 85,
    gridZone: 'A6',
    bayDimension: '4m × 8m (Jetty Arm)',
    extensionHistory: [],
    createdAt: '2026-09-30 16:20',
    updatedAt: '2026-10-11 17:30'
  }
];

// Local Storage Key (v3 for spatial coordinate dataset)
const STORAGE_KEY = 'plantturn_scaffolding_items_v3';

// In-Memory store with LocalStorage persistence & subscribers
let scaffoldingState: ScaffoldingItem[] = (() => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (err) {
    console.warn('Failed to load scaffolding from localStorage, using initial mock dataset', err);
  }
  return [...INITIAL_SCAFFOLDING_DATA];
})();

type Listener = (items: ScaffoldingItem[]) => void;
const listeners = new Set<Listener>();

function notifySubscribers() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(scaffoldingState));
  } catch (err) {
    console.error('Failed to save scaffolding to localStorage', err);
  }
  listeners.forEach(fn => fn([...scaffoldingState]));
}

export function subscribeToScaffoldingStore(callback: Listener): () => void {
  listeners.add(callback);
  callback([...scaffoldingState]);
  return () => {
    listeners.delete(callback);
  };
}

export function getAllScaffolding(): ScaffoldingItem[] {
  return [...scaffoldingState];
}

export function getScaffoldingById(id: string): ScaffoldingItem | undefined {
  return scaffoldingState.find(s => s.id === id);
}

/**
 * Add New Scaffolding
 */
export function addScaffolding(
  data: Omit<ScaffoldingItem, 'id' | 'extensionHistory' | 'createdAt' | 'updatedAt'> & { id?: string }
): ScaffoldingItem {
  const nextNum = scaffoldingState.length + 1;
  const autoId = data.id || `SCF-2026-${String(nextNum).padStart(3, '0')}`;
  
  const now = new Date().toISOString().replace('T', ' ').substring(0, 16);
  const newItem: ScaffoldingItem = {
    ...data,
    id: autoId,
    extensionHistory: [],
    createdAt: now,
    updatedAt: now
  };

  scaffoldingState = [newItem, ...scaffoldingState];
  notifySubscribers();
  return newItem;
}

/**
 * Update Existing Scaffolding
 */
export function updateScaffolding(
  id: string,
  updates: Partial<Omit<ScaffoldingItem, 'id' | 'extensionHistory'>>
): ScaffoldingItem {
  const index = scaffoldingState.findIndex(s => s.id === id);
  if (index === -1) {
    throw new Error(`Scaffold item ${id} not found`);
  }

  const now = new Date().toISOString().replace('T', ' ').substring(0, 16);
  const updatedItem: ScaffoldingItem = {
    ...scaffoldingState[index],
    ...updates,
    updatedAt: now
  };

  scaffoldingState = [
    ...scaffoldingState.slice(0, index),
    updatedItem,
    ...scaffoldingState.slice(index + 1)
  ];
  notifySubscribers();
  return updatedItem;
}

/**
 * Extend Off-Hire Date Modal Action
 */
export function extendScaffoldingOffHire(
  id: string,
  newOffHireDate: string,
  reason: string,
  extendedBy: string = 'Current User'
): ScaffoldingItem {
  const item = getScaffoldingById(id);
  if (!item) throw new Error(`Scaffold item ${id} not found`);
  if (item.actualOffHireDate) throw new Error(`Cannot extend an already off-hired scaffold`);

  const now = new Date().toISOString().replace('T', ' ').substring(0, 16);
  const extRecord: ExtensionRecord = {
    id: `EXT-${Date.now().toString().slice(-4)}`,
    previousOffHireDate: item.plannedOffHireDate,
    newOffHireDate,
    reason,
    extendedAt: now,
    extendedBy
  };

  const updated: ScaffoldingItem = {
    ...item,
    plannedOffHireDate: newOffHireDate,
    extensionHistory: [extRecord, ...item.extensionHistory],
    updatedAt: now
  };

  const index = scaffoldingState.findIndex(s => s.id === id);
  scaffoldingState = [
    ...scaffoldingState.slice(0, index),
    updated,
    ...scaffoldingState.slice(index + 1)
  ];
  notifySubscribers();
  return updated;
}

/**
 * Confirm Off-Hire Modal Action
 */
export function confirmScaffoldingOffHire(
  id: string,
  actualOffHireDate: string,
  remark?: string
): ScaffoldingItem {
  const item = getScaffoldingById(id);
  if (!item) throw new Error(`Scaffold item ${id} not found`);

  const now = new Date().toISOString().replace('T', ' ').substring(0, 16);
  const updated: ScaffoldingItem = {
    ...item,
    actualOffHireDate,
    remark: remark ? `${item.remark ? item.remark + ' | ' : ''}Off-Hire Note: ${remark}` : item.remark,
    updatedAt: now
  };

  const index = scaffoldingState.findIndex(s => s.id === id);
  scaffoldingState = [
    ...scaffoldingState.slice(0, index),
    updated,
    ...scaffoldingState.slice(index + 1)
  ];
  notifySubscribers();
  return updated;
}

/**
 * Reset Store to Initial Dataset (Useful for demonstrations)
 */
export function resetScaffoldingData(): void {
  scaffoldingState = [...INITIAL_SCAFFOLDING_DATA];
  notifySubscribers();
}
