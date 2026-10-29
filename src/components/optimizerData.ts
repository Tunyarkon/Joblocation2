export interface EquipmentResource {
  id: string;
  name: string;
  type: string;
  capacityTon: number;
  boomLengthM: number;
  status: 'Available' | 'Assigned' | 'Maintenance' | 'Inspection';
  location: string;
  operator: string;
  hourlyRateThb: number;
  assignedJobId?: string;
  assignedTimeSlot?: string;
  maintenanceAlert?: string;
  fuelLevelPercent?: number;
  efficiencyRating?: number; // percentage
  // Engineering Certification & Physical Limits
  certNo?: string;
  certExpiryDate?: string;
  isCertValid?: boolean;
  maxAllowableWindKnots?: number;
  groundBearingPressureLimitKPa?: number;
}

export interface PlanningJobItem {
  id: string;
  jobNo: string;
  plant: string;
  area: string;
  description: string;
  type: string; // e.g., 'Mobile Crane', 'Tower Crane', 'Scaffolding Lift'
  date: string; // YYYY-MM-DD
  startTime: string; // e.g., '08:00'
  endTime: string; // e.g., '12:00'
  status: 'Pending Review' | 'Optimized' | 'Assigned' | 'Rejected' | 'Revision Required';
  contractor: string;
  requester: string;
  loadWeightTon: number;
  requiredRadiusM: number;
  elevationM: number;
  assignedCraneId?: string;
  assignedCraneName?: string;
  rejectReason?: string;
  revisionNote?: string;
  reviewedBy?: string;
  reviewedAt?: string;
  priority: 'High' | 'Medium' | 'Low' | 'Critical';
  markingLocation: {
    x: number; // percentage on plot map 0-100
    y: number; // percentage on plot map 0-100
    label: string;
    zone: string;
  };
  safetyClearancePassed: boolean;
  windLimitPassed: boolean;
  soilBearingCapacityKPa?: number;
  notes?: string;
  woNumber?: string | number;
  requestNo?: string;
  capacityRequired?: number;
  optimizeWith?: string;
  assignmentStatus?: 'Unassigned' | 'Assigned' | 'Locked' | 'Released';
  engineeringChecklist?: {
    liftPlanVerification: 'Pass' | 'Fail' | 'Pending';
    loadChartRef: string;
    siteGroundVerification: 'Pass' | 'Fail' | 'Pending';
    certVerification: 'Pass' | 'Fail' | 'Pending';
    engineeringReviewResult: 'Pass' | 'Fail' | 'Need Revision' | 'Pending';
    engineeringRemarks: string;
    reviewedBy: string;
    reviewedDateTime: string;
  };
}

export const INITIAL_EQUIPMENT_FLEET: EquipmentResource[] = [
  {
    id: 'CR-001',
    name: 'Liebherr LTM 1300-6.2',
    type: 'Mobile Crane (300T)',
    capacityTon: 300,
    boomLengthM: 78,
    status: 'Available',
    location: 'Zone 1 - Main Yard',
    operator: 'Somchai Prasert',
    hourlyRateThb: 12500,
    efficiencyRating: 94,
    fuelLevelPercent: 88,
    certNo: 'PJ2-BCP-2026-001',
    certExpiryDate: '2026-12-31',
    isCertValid: true,
    maxAllowableWindKnots: 25,
    groundBearingPressureLimitKPa: 280,
  },
  {
    id: 'CR-002',
    name: 'Kato CR-250Rv City Crane',
    type: 'Rough Terrain (25T)',
    capacityTon: 25,
    boomLengthM: 28,
    status: 'Available',
    location: 'BCP Unit 3',
    operator: 'Wichai Thongchai',
    hourlyRateThb: 4200,
    efficiencyRating: 98,
    fuelLevelPercent: 75,
    certNo: 'PJ2-BCP-2026-002',
    certExpiryDate: '2026-11-30',
    isCertValid: true,
    maxAllowableWindKnots: 20,
    groundBearingPressureLimitKPa: 220,
  },
  {
    id: 'CR-003',
    name: 'Tadano GR-700EX',
    type: 'Rough Terrain (70T)',
    capacityTon: 70,
    boomLengthM: 44,
    status: 'Available',
    location: 'Storage Yard B',
    operator: 'Narong Boonchu',
    hourlyRateThb: 6500,
    efficiencyRating: 91,
    fuelLevelPercent: 92,
    certNo: 'PJ2-BCP-2026-003',
    certExpiryDate: '2026-12-15',
    isCertValid: true,
    maxAllowableWindKnots: 22,
    groundBearingPressureLimitKPa: 240,
  },
  {
    id: 'CR-004',
    name: 'Demag CC 2800-1 Crawler',
    type: 'Crawler Crane (600T)',
    capacityTon: 600,
    boomLengthM: 138,
    status: 'Assigned',
    location: 'Dock Area 4',
    operator: 'Anan Suksabai',
    hourlyRateThb: 24000,
    efficiencyRating: 89,
    assignedJobId: 'ICM-260003',
    assignedTimeSlot: '13:00 - 17:00',
    fuelLevelPercent: 64,
    certNo: 'PJ2-BCP-2026-004',
    certExpiryDate: '2027-01-31',
    isCertValid: true,
    maxAllowableWindKnots: 20,
    groundBearingPressureLimitKPa: 340,
  },
  {
    id: 'CR-005',
    name: 'Potain MDT 219 J10',
    type: 'Tower Crane (10T)',
    capacityTon: 10,
    boomLengthM: 65,
    status: 'Maintenance',
    location: 'Zone C Construction',
    operator: 'Kittisak V.',
    hourlyRateThb: 3800,
    efficiencyRating: 0,
    maintenanceAlert: 'Hydraulic Seal Overhaul - ETA 24 hrs',
    fuelLevelPercent: 40,
    certNo: 'PJ2-BCP-2026-005',
    certExpiryDate: '2026-10-20',
    isCertValid: true,
    maxAllowableWindKnots: 18,
    groundBearingPressureLimitKPa: 180,
  },
  {
    id: 'CR-006',
    name: 'Sany STC 500S (Expired Cert)',
    type: 'Truck Crane (50T)',
    capacityTon: 50,
    boomLengthM: 43.5,
    status: 'Available',
    location: 'BCP Main Gate',
    operator: 'Prasit Wannarat',
    hourlyRateThb: 5400,
    efficiencyRating: 96,
    fuelLevelPercent: 82,
    certNo: 'PJ2-BCP-2025-EXPIRED',
    certExpiryDate: '2026-08-30', // expired
    isCertValid: false,
    maxAllowableWindKnots: 20,
    groundBearingPressureLimitKPa: 250,
  },
  {
    id: 'CR-007',
    name: 'Kobelco CKE2500G-2',
    type: 'Crawler Crane (250T)',
    capacityTon: 250,
    boomLengthM: 73,
    status: 'Available',
    location: 'Zone 2 North',
    operator: 'Tawatchai Klahan',
    hourlyRateThb: 16000,
    efficiencyRating: 92,
    fuelLevelPercent: 70,
  },
  {
    id: 'CR-008',
    name: 'Grove GMK 5150L-1',
    type: 'Mobile Crane (150T)',
    capacityTon: 150,
    boomLengthM: 60,
    status: 'Available',
    location: 'Offsite Tank Farm A',
    operator: 'Niwat Somboon',
    hourlyRateThb: 9800,
    efficiencyRating: 95,
    fuelLevelPercent: 85,
  },
  {
    id: 'CR-009',
    name: 'Tadano ATF 100G-4',
    type: 'Mobile Crane (100T)',
    capacityTon: 100,
    boomLengthM: 51.2,
    status: 'Available',
    location: 'Marine Terminal Jetty',
    operator: 'Chalermpol S.',
    hourlyRateThb: 7800,
    efficiencyRating: 93,
    fuelLevelPercent: 78,
  },
  {
    id: 'CR-010',
    name: 'Palfinger PK 53002-SH',
    type: 'Knuckle Boom (18T)',
    capacityTon: 18,
    boomLengthM: 21,
    status: 'Available',
    location: 'Cogen Power Plant',
    operator: 'Boonsong K.',
    hourlyRateThb: 3600,
    efficiencyRating: 97,
    fuelLevelPercent: 90,
  },
  {
    id: 'CR-011',
    name: 'Zoomlion ZTC300V',
    type: 'Truck Crane (30T)',
    capacityTon: 30,
    boomLengthM: 42,
    status: 'Available',
    location: 'Storage Yard Bay 2',
    operator: 'Surasak D.',
    hourlyRateThb: 4600,
    efficiencyRating: 90,
    fuelLevelPercent: 81,
  },
  {
    id: 'CR-012',
    name: 'Liebherr LR 1300 SX',
    type: 'Crawler Crane (300T)',
    capacityTon: 300,
    boomLengthM: 86,
    status: 'Inspection',
    location: 'Zone C Reactor Bay',
    operator: 'Montri T.',
    hourlyRateThb: 18500,
    efficiencyRating: 88,
    maintenanceAlert: 'Annual load cell calibration due today',
    fuelLevelPercent: 65,
  }
];

// --- 525 High-Fidelity Mock Planning Requests Generator (> 500 Requests) ---
const PLANTS: ('Phra Khanong' | 'Sriracha')[] = [
  'Phra Khanong',
  'Sriracha'
];

const AREAS_BY_PLANT: Record<'Phra Khanong' | 'Sriracha', string[]> = {
  'Phra Khanong': [
    'Unit 3 Flare Stack', 'Cooling Tower East', 'Crude Column C-101',
    'Furnace Heater F-101', 'Vacuum Tower V-102', 'LPG Recovery Skid',
    'High Pressure Reactor R-201', 'Recycle Gas Compressor K-201', 'Feed Exchanger Train',
    'High Pressure Separator V-203', 'Effluent Air Cooler Bay',
    'Deethanizer Column T-301', 'Cold Box Fractionation Skid', 'Molecular Sieve Drier',
    'Acid Gas Absorber C-302', 'Expander Compressor Skid',
    'Platforming Reactor Train', 'Charge Heater F-401', 'Debutanizer Reboiler E-404',
    'Regeneration Tower R-402', 'Stabilizer Reflux Drum',
    'Crude Tank T-101 Roof Deck', 'Floating Roof Seal Sector 3', 'Tank Manifold Valve Vault 2',
    'Foam Monitor Tower', 'Product Transfer Pump Skid',
    'Gas Turbine GT-01 Enclosure', 'HRSG Boiler Unit 1', 'Steam Turbine Casing ST-01',
    'Main Transformer 115kV', 'Auxiliary Boiler Stack',
    'Pipe Rack Overhead Bay 2', 'Main Substation 1', 'Central Workshop Laydown'
  ],
  'Sriracha': [
    'Yard Bay 4 Laydown', 'Steel Bundle Staging Sector', 'Heavy Spool Rack 3',
    'Scaffolding Depot B', 'Pre-assembly Yard North',
    'Reactor Foundation B', 'Column Bracket Erection Bay', 'Compressor Bay Pad',
    'Deep Trench Excavation Sector', 'Substation 3B Foundation',
    'Berth 1 Loading Arm Header', 'Berth 2 Mooring Dolphin Bay', 'Bunker Fuel Manifold 4',
    'Jetty Trestle Pipe Rack', 'Marine Vapor Recovery Unit',
    'Gasoline Blending Sphere S-201', 'Diesel Tank T-204', 'Butane Pressure Vessel V-208',
    'Dike Wall Access Trench', 'Truck Loading Bay 4',
    'API Oil-Water Separator Basin', 'Dissolved Air Flotation Unit', 'Aeration Lagoon Blower Skid',
    'Sludge Dewatering Centrifuge', 'Effluent Monitoring Station',
    'Claus Thermal Reactor Furnace', 'Sulphur Condenser E-501', 'Tail Gas Incinerator Stack',
    'Liquid Sulphur Pit P-502', 'Air Blower Skid K-501',
    'Cooling Water Pump House', 'Instrument Air Receiver V-601', 'Nitrogen Generation Skid',
    'Flare Knockout Drum V-602', 'BFW Deaerator Tower',
    'Warehouse Staging Pad', 'Main Fire Water Header'
  ]
};

const JOB_TEMPLATES = [
  { desc: 'De-header valve replacement & heavy lift piping module', type: 'Mobile Crane', minWeight: 14, maxWeight: 32, minRad: 18, maxRad: 28, minElev: 22, maxElev: 38 },
  { desc: 'Offload steel framing bundles and temporary structural support', type: 'Rough Terrain', minWeight: 8, maxWeight: 18, minRad: 12, maxRad: 20, minElev: 6, maxElev: 14 },
  { desc: 'Precast concrete slab hoisting & column bracket bolting', type: 'Crawler Crane', minWeight: 36, maxWeight: 68, minRad: 26, maxRad: 40, minElev: 20, maxElev: 34 },
  { desc: 'Exchanger tube bundle extraction during leak overhaul', type: 'Mobile Crane', minWeight: 24, maxWeight: 64, minRad: 22, maxRad: 36, minElev: 14, maxElev: 28 },
  { desc: 'Flare tip replacement & ignition pilot wire rigging', type: 'Mobile Crane', minWeight: 12, maxWeight: 26, minRad: 24, maxRad: 38, minElev: 46, maxElev: 68 },
  { desc: 'Hot tapping machine support and scaffolding platform hoist', type: 'Truck Crane', minWeight: 6, maxWeight: 14, minRad: 10, maxRad: 18, minElev: 12, maxElev: 22 },
  { desc: 'Centrifugal pump & motor base skid replacement', type: 'Rough Terrain', minWeight: 7, maxWeight: 16, minRad: 12, maxRad: 22, minElev: 4, maxElev: 12 },
  { desc: 'Step-up transformer 115kV replacement & pad skidding', type: 'Crawler Crane', minWeight: 58, maxWeight: 110, minRad: 20, maxRad: 34, minElev: 10, maxElev: 18 },
  { desc: 'Steam turbine upper casing removal for rotor inspection', type: 'Mobile Crane', minWeight: 42, maxWeight: 78, minRad: 18, maxRad: 28, minElev: 16, maxElev: 26 },
  { desc: 'Tower top condenser spool erection & flange bolting', type: 'Mobile Crane', minWeight: 18, maxWeight: 38, minRad: 26, maxRad: 42, minElev: 38, maxElev: 56 },
  { desc: 'Heavy duty pipe rack overhead bundle installation', type: 'Truck Crane', minWeight: 9, maxWeight: 22, minRad: 14, maxRad: 24, minElev: 14, maxElev: 24 },
  { desc: 'Safety relief valve (PSV) cluster replacement and manifold lift', type: 'Rough Terrain', minWeight: 4, maxWeight: 10, minRad: 10, maxRad: 18, minElev: 18, maxElev: 32 },
  { desc: 'Scrubber column internal tray package hoisting', type: 'Mobile Crane', minWeight: 15, maxWeight: 30, minRad: 20, maxRad: 34, minElev: 30, maxElev: 48 },
  { desc: 'Floating roof drain sump pipe assembly hoist', type: 'Knuckle Boom', minWeight: 3, maxWeight: 8, minRad: 8, maxRad: 16, minElev: 8, maxElev: 16 },
  { desc: 'Furnace convection section tube coil module lift', type: 'Crawler Crane', minWeight: 48, maxWeight: 95, minRad: 24, maxRad: 38, minElev: 26, maxElev: 44 },
  { desc: 'Compressor rotor & stator overhaul rigging inside shelter', type: 'Mobile Crane', minWeight: 16, maxWeight: 32, minRad: 16, maxRad: 26, minElev: 12, maxElev: 20 },
  { desc: 'Pig receiver barrel & quick opening closure installation', type: 'Truck Crane', minWeight: 8, maxWeight: 18, minRad: 12, maxRad: 22, minElev: 6, maxElev: 14 },
  { desc: 'Air cooler fin-fan blade & drive motor swap', type: 'Rough Terrain', minWeight: 5, maxWeight: 12, minRad: 14, maxRad: 24, minElev: 18, maxElev: 28 },
  { desc: 'Marine loading arm swivel joint replacement', type: 'Mobile Crane', minWeight: 12, maxWeight: 24, minRad: 20, maxRad: 32, minElev: 18, maxElev: 30 },
  { desc: 'Catalyst loading hopper overhead suspension rigging', type: 'Mobile Crane', minWeight: 14, maxWeight: 28, minRad: 22, maxRad: 36, minElev: 32, maxElev: 52 },
  { desc: 'Emergency generator container offload & ground tie-down', type: 'Truck Crane', minWeight: 10, maxWeight: 20, minRad: 12, maxRad: 20, minElev: 4, maxElev: 10 },
  { desc: 'High pressure gas filter coalescer vessel positioning', type: 'Rough Terrain', minWeight: 14, maxWeight: 26, minRad: 16, maxRad: 26, minElev: 10, maxElev: 18 }
];

const CONTRACTORS = [
  'Contractor A Solutions',
  'Operations Dept',
  'Contractor B Engineering',
  'External Specialist Rigging',
  'Siam Mechanical Services',
  'Apex Heavy Rigging Ltd.',
  'Thai Engineering & Construction',
  'Maintenance Team Alpha',
  'Turnaround Rigger Logistics',
  'Power & Piping Industrial Co.'
];

const REQUESTERS = [
  'Ekarat M. (Maintenance)',
  'Kamonrat P. (Logistics)',
  'Siriporn T. (Civil Team)',
  'Damrong S. (Operations)',
  'Nattawut J. (Piping)',
  'Pichai S. (E&I)',
  'Somboon K. (Turnaround)',
  'Adisak W. (Machinery)',
  'Anong L. (Inspection)',
  'Thawat C. (Safety)',
  'Prasert N. (Commissioning)',
  'Charnchai V. (Planning)'
];

const REJECT_REASONS = [
  'Exceeds crane safe load capacity / radius chart; outrigger ground pressure exceeds 250 kPa',
  'Missing approved PE signed lifting plan & soil compaction test certification',
  'Working radius interferes with energized 115kV overhead transmission corridor',
  'Forecast wind gust exceeds 25 knots operating limit for lattice boom extension',
  'Dual crane tandem lift requires certified level-3 lifting supervisor on site',
  'Sub-surface utility scan reveals active underground hydrocarbon line beneath outrigger pad',
  'Missing blind flange isolation permit for adjacent pressurized lines',
  'Uncertified wire rope slings & non-calibrated load indicator'
];

function generateDeterministicJobs(count: number = 525): PlanningJobItem[] {
  const jobs: PlanningJobItem[] = [];
  // Schedule tracker to ensure realistic, non-crowded allocations: key = `${date}_${craneId}_${slot}`
  const bookedSlots = new Map<string, string>();

  for (let i = 1; i <= count; i++) {
    const jobNumStr = String(i).padStart(4, '0');
    const id = `PLN-26${jobNumStr}`;
    const jobNo = `ICM-26${String(i).padStart(5, '0')}`;

    const plantIndex = (i * 3 + 1) % PLANTS.length;
    const plant = PLANTS[plantIndex];
    const areas = AREAS_BY_PLANT[plant] || ['General Battery Limits'];
    const area = areas[i % areas.length];

    const tmplIndex = (i * 7 + 2) % JOB_TEMPLATES.length;
    const tmpl = JOB_TEMPLATES[tmplIndex];

    const contractor = CONTRACTORS[(i * 2 + 3) % CONTRACTORS.length];
    const requester = REQUESTERS[(i * 4 + 1) % REQUESTERS.length];

    // Dates spanning 2026-09-24 through 2026-10-15 (22 days) - evenly distributed
    const dayOffset = (i * 7 + 3) % 22;
    const day = 24 + dayOffset;
    let dateStr = '';
    if (day <= 30) {
      dateStr = `2026-09-${String(day).padStart(2, '0')}`;
    } else {
      dateStr = `2026-10-${String(day - 30).padStart(2, '0')}`;
    }

    // Time windows
    const timeSlots = [
      { start: '08:00', end: '12:00' },
      { start: '08:30', end: '13:00' },
      { start: '10:00', end: '15:30' },
      { start: '13:00', end: '17:00' },
      { start: '14:00', end: '18:00' }
    ];
    const timeSlotIndex = (i * 3 + 2) % timeSlots.length;
    let { start: startTime, end: endTime } = timeSlots[timeSlotIndex];

    // Priority
    let priority: 'Critical' | 'High' | 'Medium' | 'Low' = 'Medium';
    if (i % 14 === 0 || i === 1 || i === 4) {
      priority = 'Critical';
    } else if (i % 4 === 0) {
      priority = 'High';
    } else if (i % 4 === 1) {
      priority = 'Medium';
    } else {
      priority = 'Low';
    }

    // Calculate weight & radius
    const weightRange = tmpl.maxWeight - tmpl.minWeight;
    const loadWeightTon = Number((tmpl.minWeight + ((i * 17) % (weightRange * 10)) / 10).toFixed(1));
    const radiusRange = tmpl.maxRad - tmpl.minRad;
    const requiredRadiusM = Math.round(tmpl.minRad + ((i * 13) % (radiusRange * 10)) / 10);
    const elevRange = tmpl.maxElev - tmpl.minElev;
    const elevationM = Math.round(tmpl.minElev + ((i * 19) % (elevRange * 10)) / 10);

    // Status: ~10% Rejected, ~20% Assigned, ~28% Optimized, ~42% Pending Review
    let status: 'Pending Review' | 'Optimized' | 'Assigned' | 'Rejected' = 'Pending Review';
    let assignedCraneId: string | undefined = undefined;
    let assignedCraneName: string | undefined = undefined;
    let rejectReason: string | undefined = undefined;
    let safetyClearancePassed = true;
    let windLimitPassed = true;

    // Helper to test interval overlap
    const checkOverlap = (s1: string, e1: string, s2: string, e2: string) => {
      const [h1, m1] = s1.split(':').map(Number);
      const [h2, m2] = e1.split(':').map(Number);
      const [h3, m3] = s2.split(':').map(Number);
      const [h4, m4] = e2.split(':').map(Number);
      return (h1 * 60 + (m1 || 0)) < (h4 * 60 + (m4 || 0)) && (h2 * 60 + (m2 || 0)) > (h3 * 60 + (m3 || 0));
    };

    const modStatus = i % 10;
    if (modStatus === 0) {
      status = 'Rejected';
      rejectReason = REJECT_REASONS[i % REJECT_REASONS.length];
      safetyClearancePassed = i % 2 === 0;
      windLimitPassed = i % 3 === 0;
    } else if (i === 5 || i === 11) {
      // Intentional Mockup Conflict 1: Single clean conflict on CR-002 (ICM-2600005 vs ICM-2600011)
      status = 'Assigned';
      dateStr = '2026-10-05';
      if (i === 5) {
        startTime = '08:30';
        endTime = '12:30';
      } else {
        startTime = '10:00';
        endTime = '14:00';
      }
      const cr2 = INITIAL_EQUIPMENT_FLEET.find(c => c.id === 'CR-002') || INITIAL_EQUIPMENT_FLEET[1];
      assignedCraneId = cr2.id;
      assignedCraneName = `${cr2.name} (${cr2.capacityTon}T)`;
    } else if (i === 15 || i === 22) {
      // Intentional Mockup Conflict 2: Single clean conflict on CR-007
      status = 'Assigned';
      dateStr = '2026-10-08';
      if (i === 15) {
        startTime = '09:00';
        endTime = '13:00';
      } else {
        startTime = '11:00';
        endTime = '15:00';
      }
      const cr7 = INITIAL_EQUIPMENT_FLEET.find(c => c.id === 'CR-007') || INITIAL_EQUIPMENT_FLEET[0];
      assignedCraneId = cr7.id;
      assignedCraneName = `${cr7.name} (${cr7.capacityTon}T)`;
    } else if (modStatus === 1 || modStatus === 5 || modStatus === 2 || modStatus === 6 || modStatus === 8) {
      // Find crane without any overlapping time on the same date
      const isAssigned = (modStatus === 1 || modStatus === 5);
      const suitableCranes = INITIAL_EQUIPMENT_FLEET.filter(
        c => (c.status === 'Available' || c.id === 'CR-004') && c.capacityTon >= loadWeightTon * 1.15
      );

      let chosen: EquipmentResource | undefined;
      for (let attempt = 0; attempt < suitableCranes.length; attempt++) {
        const cand = suitableCranes[(i * 3 + dayOffset + attempt) % suitableCranes.length];
        // Don't assign to CR-002 on 2026-10-05 or CR-007 on 2026-10-08 to keep the intentional conflict 1-to-1
        if (cand.id === 'CR-002' && dateStr === '2026-10-05') continue;
        if (cand.id === 'CR-007' && dateStr === '2026-10-08') continue;

        const bookedKey = `${dateStr}_${cand.id}`;
        const existing = bookedSlots.get(bookedKey) || '';
        // Check if candidate already has an overlapping slot today
        if (!existing) {
          chosen = cand;
          bookedSlots.set(bookedKey, `${startTime}-${endTime}`);
          break;
        } else {
          const [existS, existE] = existing.split('-');
          if (!checkOverlap(startTime, endTime, existS, existE)) {
            chosen = cand;
            bookedSlots.set(bookedKey, `${existing},${startTime}-${endTime}`);
            break;
          }
        }
      }

      if (chosen) {
        status = isAssigned ? 'Assigned' : 'Optimized';
        assignedCraneId = chosen.id;
        assignedCraneName = `${chosen.name} (${chosen.capacityTon}T)`;
      } else {
        status = 'Pending Review';
      }
    } else {
      status = 'Pending Review';
    }

    // Coordinates distributed realistically across 2D plot plan (0-100%)
    // Multiplied by primes to create organic, non-overlapping clusters across plant sectors
    const x = Math.round(7 + ((i * 37 + (i % 7) * 11) % 86));
    const y = Math.round(11 + ((i * 53 + (i % 5) * 13) % 78));

    const zoneNames = [
      'Zone 1 - Unit 3', 'Storage Yard B', 'Zone C Foundation', 'Cooling Complex',
      'Workshop Laydown', 'Main Gate', 'Zone 1 - Overhead', 'HCU Reactor Bay',
      'Marine Jetty Berth 2', 'Tank Farm Sector 4', 'Cogen Power Block', 'SRU Unit Bay'
    ];
    const zone = zoneNames[i % zoneNames.length];

    jobs.push({
      id,
      jobNo,
      plant,
      area,
      description: tmpl.desc,
      type: tmpl.type,
      date: dateStr,
      startTime,
      endTime,
      status,
      contractor,
      requester,
      loadWeightTon,
      requiredRadiusM,
      elevationM,
      assignedCraneId,
      assignedCraneName,
      rejectReason,
      priority,
      markingLocation: {
        x,
        y,
        label: `${jobNo}: ${tmpl.desc.slice(0, 24)}...`,
        zone
      },
      safetyClearancePassed,
      windLimitPassed,
      notes: status === 'Assigned'
        ? 'Rigging verified by Lead Rigging Supervisor; ground load test certified.'
        : status === 'Optimized'
          ? 'AI algorithm suggested optimal boom radius & crane capacity.'
          : status === 'Rejected'
            ? 'Revision requested from contractor.'
            : 'Awaiting engineer review and site marking inspection.'
    });
  }

  return jobs;
}

// Exactly 525 realistic planning requests (> 500 Requests)
export const INITIAL_PLANNING_JOBS: PlanningJobItem[] = generateDeterministicJobs(525);
