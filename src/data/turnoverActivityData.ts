export type ActivityType = 'status_change' | 'sign_off' | 'edit' | 'alert_reject' | 'creation';

export interface ActivityChangeDiff {
  field: string;
  fieldTh?: string;
  oldValue: string;
  newValue: string;
}

export interface TurnoverActivityRecord {
  id: string;
  timestamp: string; // ISO string
  type: ActivityType;
  stageId?: 1 | 2 | 3 | 4;
  unitId?: string;
  unitName?: string;
  systemId?: string;
  systemName?: string;
  equipmentTag?: string;
  actionTitleEn: string;
  actionTitleTh: string;
  descriptionEn: string;
  descriptionTh: string;
  user: {
    name: string;
    role: string;
    roleTh: string;
    department?: string;
    initials: string;
  };
  diffs?: ActivityChangeDiff[];
  signOffMeta?: {
    certificateId: string;
    signatureType: 'Digital Token' | 'Biometric QR' | 'Supervisor Override';
    roleAuthorized: string;
    stampTime: string;
  };
  severity: 'info' | 'success' | 'warning' | 'error';
  tagBadge?: string;
}

export const INITIAL_TURNOVER_ACTIVITIES: TurnoverActivityRecord[] = [
  {
    id: 'act-101',
    timestamp: '2026-09-24T06:18:20Z',
    type: 'sign_off',
    stageId: 4,
    unitId: 'unit-khf1',
    unitName: 'KHF-1 / SE / NHF-1',
    systemId: 'sys-24',
    systemName: 'System-24 (React & Frac)',
    equipmentTag: 'S2-C-202 COMP',
    actionTitleEn: 'PSSR Handover Sign-Off Approved',
    actionTitleTh: 'อนุมัติลงนามส่งมอบงาน PSSR ขั้นสุดท้าย',
    descriptionEn: 'Pre-Startup Safety Review (PSSR) executed by Operations Superintendent. All punch items resolved.',
    descriptionTh: 'การตรวจประเมินความปลอดภัยก่อนเดินเครื่อง (PSSR) ดำเนินการโดยหัวหน้าฝ่ายปฏิบัติการ รายการข้อบกพร่องปิดสมบูรณ์',
    user: {
      name: 'Malinee Ph.',
      role: 'Operations Superintendent',
      roleTh: 'หัวหน้าฝ่ายปฏิบัติการโรงกลั่น',
      department: 'Operations & Production',
      initials: 'MP'
    },
    signOffMeta: {
      certificateId: 'CERT-PSSR-2026-0941',
      signatureType: 'Digital Token',
      roleAuthorized: 'Lead Operations Authority',
      stampTime: '2026-09-24 06:18:20'
    },
    diffs: [
      { field: 'System Status', fieldTh: 'สถานะระบบ', oldValue: 'Pending Handover', newValue: 'Approved for Startup' },
      { field: 'Punch List Cat A', fieldTh: 'รายการพันช์ข้อ A', oldValue: '1 Pending', newValue: '0 (Cleared)' }
    ],
    severity: 'success',
    tagBadge: 'PSSR Approved'
  },
  {
    id: 'act-102',
    timestamp: '2026-09-24T05:45:10Z',
    type: 'status_change',
    stageId: 3,
    unitId: 'unit-khf1',
    unitName: 'KHF-1 / SE / NHF-1',
    systemId: 'sys-24',
    systemName: 'System-24 (React & Frac)',
    equipmentTag: '11-V-104',
    actionTitleEn: 'Appendix B Box-Up Verified by Flange Police',
    actionTitleTh: 'ตรวจสอบการปิดฝาปิดระบบ (Appendix B) โดย Flange Police',
    descriptionEn: 'Torque verification completed with calibrated hydraulic torque wrench. Final clearance 380 N.m accepted.',
    descriptionTh: 'ยืนยันค่าแรงขันน็อตด้วยประแจไฮดรอลิกมาตรฐาน ค่าแรงขัน 380 N.m ผ่านเกณฑ์มาตรฐาน',
    user: {
      name: 'Anupong K.',
      role: 'QA/QC Flange Specialist',
      roleTh: 'ผู้เชี่ยวชาญตรวจสอบหน้าแปลน QA/QC',
      department: 'Quality Assurance',
      initials: 'AK'
    },
    diffs: [
      { field: 'Box-up Status', fieldTh: 'สถานะการปิดกล่อง', oldValue: 'Torque Pending', newValue: 'Verified & Sealed' },
      { field: 'Gasket Inspection', fieldTh: 'การตรวจปะเก็น', oldValue: 'Spiral Wound SS316', newValue: 'Inspected & Accepted' }
    ],
    severity: 'success',
    tagBadge: 'Box-Up Pass'
  },
  {
    id: 'act-103',
    timestamp: '2026-09-24T04:22:45Z',
    type: 'edit',
    stageId: 1,
    unitId: 'unit-khf1',
    unitName: 'KHF-1 / SE / NHF-1',
    systemId: 'sys-24',
    systemName: 'System-24 (React & Frac)',
    equipmentTag: 'S2-C-202 COMP',
    actionTitleEn: 'Critical Path Flag Enabled',
    actionTitleTh: 'กำหนดสถานะเป็นอุปกรณ์ในสายงานวิกฤต (Critical Path)',
    descriptionEn: 'Flagged equipment as turnaround critical path milestone based on lead-time of titanium impeller alignment.',
    descriptionTh: 'ตั้งค่าแท็กเป็นอุปกรณ์วิกฤตเนื่องจากระยะเวลาการตั้งศูนย์ใบพัดไททาเนียม',
    user: {
      name: 'Somchai W.',
      role: 'Turnaround Planner',
      roleTh: 'วิศวกรวางแผนงานหยุดซ่อมบำรุง',
      department: 'Maintenance Planning',
      initials: 'SW'
    },
    diffs: [
      { field: 'isCriticalPath', fieldTh: 'สายงานวิกฤต', oldValue: 'false (Standard)', newValue: 'true (Critical*)' },
      { field: 'Ref Code', fieldTh: 'รหัสอ้างอิง', oldValue: '30-19', newValue: '30-20' }
    ],
    severity: 'info',
    tagBadge: 'Critical Path*'
  },
  {
    id: 'act-104',
    timestamp: '2026-09-24T03:50:00Z',
    type: 'alert_reject',
    stageId: 3,
    unitId: 'unit-aps1',
    unitName: 'APS-1 / ADU-1 / DHT / VDU',
    systemId: 'sys-11',
    systemName: 'System-11 (Crude Distillation)',
    equipmentTag: '11-E-101B',
    actionTitleEn: 'Flange Joint Rejected - Gasket Score Mark',
    actionTitleTh: 'ปฏิเสธงานหน้าแปลน - พบรอยขูดขีดบนหน้าสัมผัสปะเก็น',
    descriptionEn: 'Inspection team spotted radial scratches >0.25mm across RF face. Rejected for refacing and gasket swap.',
    descriptionTh: 'ทีมตรวจสอบพบรอยขูดขีดตามแนวรัศมีเกิน 0.25 มม. บนผิวหน้าแปลน สั่งส่งไสหน้าใหม่และเปลี่ยนปะเก็น',
    user: {
      name: 'Preecha T.',
      role: 'Senior Piping Inspector',
      roleTh: 'ผู้ตรวจการงานท่ออาวุโส',
      department: 'TSS Inspection',
      initials: 'PT'
    },
    diffs: [
      { field: 'Inspection Result', fieldTh: 'ผลการตรวจสอบ', oldValue: 'Under Review', newValue: 'REJECTED - Rework Required' },
      { field: 'Punch Item', fieldTh: 'รายการแก้ไข', oldValue: 'None', newValue: 'PUNCH-RF-11B-003 Created' }
    ],
    severity: 'error',
    tagBadge: 'Rework Rejection'
  },
  {
    id: 'act-105',
    timestamp: '2026-09-24T02:15:30Z',
    type: 'sign_off',
    stageId: 2,
    unitId: 'unit-khf1',
    unitName: 'KHF-1 / SE / NHF-1',
    systemId: 'sys-24',
    systemName: 'System-24 (React & Frac)',
    equipmentTag: 'EWR-002 E-301E',
    actionTitleEn: 'Appendix A TSS Discipline Sign-Off Completed',
    actionTitleTh: 'ลงนามรับรองสายงานเทคนิค TSS (Appendix A)',
    descriptionEn: 'Technical Service Section sign-off stamped for heat exchanger tube bundle replacement package.',
    descriptionTh: 'ฝ่ายบริการเทคนิค (TSS) ลงนามอนุมัติเอกสารส่งมอบงานเปลี่ยนมัดท่อเครื่องแลกเปลี่ยนความร้อน',
    user: {
      name: 'Dr. Kiatisak M.',
      role: 'Chief Metallurgist',
      roleTh: 'หัวหน้านักโลหะวิทยา',
      department: 'Technical Services (TSS)',
      initials: 'KM'
    },
    signOffMeta: {
      certificateId: 'CERT-APP-A-TSS-8831',
      signatureType: 'Digital Token',
      roleAuthorized: 'Discipline Lead Engineer',
      stampTime: '2026-09-24 02:15:30'
    },
    diffs: [
      { field: 'Appendix A Status', fieldTh: 'สถานะแบบฟอร์ม A', oldValue: '3/5 Approved', newValue: '4/5 Approved' },
      { field: 'PMI Report', fieldTh: 'รายงานผล PMI', oldValue: 'Pending Review', newValue: 'Verified Inconel 625' }
    ],
    severity: 'success',
    tagBadge: 'Appendix A Sign'
  },
  {
    id: 'act-106',
    timestamp: '2026-09-24T01:05:12Z',
    type: 'status_change',
    stageId: 1,
    unitId: 'unit-khf1',
    unitName: 'KHF-1 / SE / NHF-1',
    systemId: 'sys-24',
    systemName: 'System-24 (React & Frac)',
    equipmentTag: 'BL-11-02',
    actionTitleEn: 'Butt Joint Field Walk RT Cleared',
    actionTitleTh: 'การตรวจสอบแนวเชื่อมสนามผ่านการตรวจฟิล์ม RT',
    descriptionEn: '100% Radiographic test cleared with zero weld defects. Field verification checkbox confirmed.',
    descriptionTh: 'การตรวจสอบด้วยภาพถ่ายรังสี 100% ผ่านเกณฑ์มาตรฐาน ไม่พบข้อบกพร่องแนวเชื่อม',
    user: {
      name: 'Narong B.',
      role: 'NDT Level III Lead',
      roleTh: 'หัวหน้างานตรวจสอบไม่ทำลาย NDT',
      department: 'QA/QC Inspection',
      initials: 'NB'
    },
    diffs: [
      { field: 'Field Verified', fieldTh: 'การตรวจหน้างาน', oldValue: 'Pending Walk', newValue: 'Verified on-site (QR Scanned)' },
      { field: 'Completion Checkpoint', fieldTh: 'จุดตรวจสอบ', oldValue: 'Fit up', newValue: 'RT Film Cleared (ASME Sec VIII)' }
    ],
    severity: 'success',
    tagBadge: 'NDT Cleared'
  },
  {
    id: 'act-107',
    timestamp: '2026-09-23T22:40:15Z',
    type: 'creation',
    stageId: 1,
    unitId: 'unit-vps2',
    unitName: 'VPS-2 / FCCU / SWS-2 / NHF-2',
    systemId: 'sys-30',
    systemName: 'System-30 (NHF-2 Distillation)',
    equipmentTag: 'S2-SUP-PROJ-007',
    actionTitleEn: 'New Project Tie-in Tag Registered',
    actionTitleTh: 'ลงทะเบียนแท็กจุดเชื่อมต่อโครงการใหม่ (Project Tie-in)',
    descriptionEn: 'Added tie-in spool record into Functional Location hierarchy with Project green highlight scope.',
    descriptionTh: 'เพิ่มรายการแท็กท่อเชื่อมต่อโครงการในผังโครงสร้างตำแหน่ง พร้อมแถบสีเขียวแสดงขอบเขตงานโครงการ',
    user: {
      name: 'Chatchai R.',
      role: 'Turnover Coordinator',
      roleTh: 'ผู้ประสานงานการส่งมอบระบบ',
      department: 'Commissioning & Turnover',
      initials: 'CR'
    },
    diffs: [
      { field: 'Highlight Category', fieldTh: 'หมวดหมู่งาน', oldValue: 'Unassigned', newValue: 'Project (Tie-in)' },
      { field: 'Ref Code', fieldTh: 'รหัสอ้างอิง', oldValue: 'None', newValue: '30-03' }
    ],
    severity: 'info',
    tagBadge: 'Tag Created'
  },
  {
    id: 'act-108',
    timestamp: '2026-09-23T20:10:00Z',
    type: 'edit',
    stageId: 2,
    unitId: 'unit-aps1',
    unitName: 'APS-1 / ADU-1 / DHT / VDU',
    systemId: 'sys-11',
    systemName: 'System-11 (Crude Distillation)',
    equipmentTag: '11-P-101A',
    actionTitleEn: 'Mechanical Seal Alignment Data Logged',
    actionTitleTh: 'บันทึกข้อมูลการตั้งศูนย์ซีลปั๊ม (Dial Gauge Alignment)',
    descriptionEn: 'Radial alignment offset measured at 0.02mm, well within the 0.05mm tolerance specification.',
    descriptionTh: 'ค่าเบี่ยงเบนแนวศูนย์วัดได้ 0.02 มม. อยู่ในเกณฑ์มาตรฐานกำหนดไม่เกิน 0.05 มม.',
    user: {
      name: 'Surasak P.',
      role: 'Rotating Machinery Specialist',
      roleTh: 'วิศวกรเครื่องจักรกลหมุน',
      department: 'Mechanical Maintenance',
      initials: 'SP'
    },
    diffs: [
      { field: 'Coupling Alignment', fieldTh: 'การตั้งศูนย์คับปลิ้ง', oldValue: 'Draft Measured', newValue: '0.02 mm (Accepted)' },
      { field: 'Cold Run Test', fieldTh: 'การทดสอบหมุนเปล่า', oldValue: 'Pending', newValue: 'Completed 2-hr run' }
    ],
    severity: 'info',
    tagBadge: 'Alignment Done'
  },
  {
    id: 'act-109',
    timestamp: '2026-09-23T18:30:45Z',
    type: 'sign_off',
    stageId: 3,
    unitId: 'unit-aps1',
    unitName: 'APS-1 / ADU-1 / DHT / VDU',
    systemId: 'sys-11',
    systemName: 'System-11 (Crude Distillation)',
    equipmentTag: 'BLD-11-04A',
    actionTitleEn: 'De-Blind Authorization Signed',
    actionTitleTh: 'ลงนามอนุญาตถอดแผ่นบลายด์ (De-blind Sign-Off)',
    descriptionEn: 'De-blind permit authorized by Area Operations Manager following positive hydrotest draining check.',
    descriptionTh: 'ใบอนุญาตถอดแผ่นบลายด์ได้รับการลงนามโดยผู้จัดการฝ่ายผลิต หลังระบายน้ำทดสอบแรงดันเรียบร้อย',
    user: {
      name: 'Wichai J.',
      role: 'Area Operations Manager',
      roleTh: 'ผู้จัดการฝ่ายเดินเครื่องพื้นที่',
      department: 'Production Area 1',
      initials: 'WJ'
    },
    signOffMeta: {
      certificateId: 'PERMIT-DBL-2026-0412',
      signatureType: 'Digital Token',
      roleAuthorized: 'Area Operating Authority',
      stampTime: '2026-09-23 18:30:45'
    },
    diffs: [
      { field: 'Blind Tag Status', fieldTh: 'สถานะแผ่นกั้นบลายด์', oldValue: 'Blinded for Hydrotest', newValue: 'De-blinded & Removed' },
      { field: 'Isolation Register', fieldTh: 'สมุดบันทึกการตัดแยก', oldValue: 'Isolated', newValue: 'Reconnected' }
    ],
    severity: 'success',
    tagBadge: 'De-Blind Executed'
  },
  {
    id: 'act-110',
    timestamp: '2026-09-23T15:12:00Z',
    type: 'status_change',
    stageId: 4,
    unitId: 'unit-vps2',
    unitName: 'VPS-2 / FCCU / SWS-2 / NHF-2',
    systemId: 'sys-28',
    systemName: 'System-28 (VPS-2 Vacuum)',
    equipmentTag: 'VPS-2-STAGE-4',
    actionTitleEn: 'Handover Dossier Compiled & Forwarded',
    actionTitleTh: 'รวบรวมแฟ้มเอกสารส่งมอบและส่งต่อฝ่ายปฏิบัติการ',
    descriptionEn: 'Final QA dossier including 14 test packs, 38 RT reports, and 24 calibration certificates assembled.',
    descriptionTh: 'รวบรวมแฟ้มเอกสาร QA ฉบับสมบูรณ์ประกอบด้วย 14 แพ็คเกจทดสอบ และ 38 ผลตรวจฟิล์ม RT',
    user: {
      name: 'Malinee Ph.',
      role: 'Turnaround QA/QC Lead',
      roleTh: 'หัวหน้างานควบคุมคุณภาพ QA/QC',
      department: 'Turnover Management',
      initials: 'MP'
    },
    diffs: [
      { field: 'Dossier Verification', fieldTh: 'การตรวจรับรองแฟ้ม', oldValue: 'Assembly in progress', newValue: '100% Ready for Audit' }
    ],
    severity: 'info',
    tagBadge: 'Dossier Ready'
  }
];
