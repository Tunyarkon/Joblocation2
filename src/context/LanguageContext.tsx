import React, { createContext, useContext, useState, useEffect } from 'react';

export type Language = 'en' | 'th';

export interface LanguageContextType {
  language: Language;
  isTh: boolean;
  setLanguage: (lang: Language) => void;
  toggleLanguage: () => void;
  t: (key: string, fallback?: string) => string;
}

export const translations: Record<Language, Record<string, string>> = {
  en: {
    // App & Header
    'app.title': 'CRANE & COMMISSIONING MANAGEMENT',
    'app.subtitle': 'Industrial Turnover & Heavy Lift Operations',
    'header.search': 'Search Jobs, Units, Systems, PIDs, Tags...',
    'header.weather': 'Plant Weather',
    'header.switch_lang': 'Switch to Thai',
    'header.switch_theme': 'Switch Theme',
    'header.light': 'Light',
    'header.dark': 'Dark',
    'header.notifications': 'Notifications',

    // Sidebar Sections & Items
    'nav.crane_module': 'Mobile Crane (CR01)',
    'nav.scaffold_module': 'Scaffolding (SF01)',
    'nav.turnover_module': 'Turnaround & QA/QC (S2)',
    'nav.settings_module': 'System & Settings',

    'nav.cr_request_list': 'CR01 Request List',
    'nav.cr_plot_plan': 'CR02 Plot Plan',
    'nav.cr_master_plot': 'CR03 Master Plot Plan',
    'nav.cr_create_job': 'CR04 Create Request',
    'nav.cr_job_list': 'CR05 Job List',
    'nav.cr_calendar': 'CR06 Calendar Schedule',
    'nav.cr_review_optimize': 'CR07 Review Plan & Optimize',
    'nav.cr_planning_dash': 'CR08 Planning Dashboard',

    'nav.sf_request_list': 'SF01 Request List',
    'nav.sf_plot_plan': 'SF02 Plot Plan',
    'nav.sf_master_plot': 'SF03 Master Plot Plan',
    'nav.sf_create_job': 'SF04 Create Request',
    'nav.sf_job_list': 'SF05 Job List',
    'nav.sf_calendar': 'SF06 Calendar Schedule',

    'nav.to_equipment_closing': 'TO01 Equipment Closing (App A&B)',
    'nav.to_punch_list': 'TO02 Master Punch & Butt List',
    'nav.to_flange_checklist': 'TO03 Flange Make-up Checklist',
    'nav.to_certificate': 'TO04 Turnover Certificate',
    'nav.to_approval_module': 'TO05 Task Approval Module',
    'nav.to_stages': 'TO06 S2 Turnover Stages (4-Stage)',
    'nav.to_functional_location': 'Functional Location',
    'nav.user_config': 'User Configuration & RBAC',

    // Common Actions & Badges
    'action.save': 'Save',
    'action.submit': 'Submit Request',
    'action.cancel': 'Cancel',
    'action.delete': 'Delete',
    'action.edit': 'Edit',
    'action.create': 'Create New',
    'action.export_csv': 'Export CSV',
    'action.export_pdf': 'Export PDF',
    'action.print': 'Print Document',
    'action.filter': 'Filter',
    'action.search': 'Search',
    'action.view_details': 'View Details',
    'action.expand_all': 'Expand All',
    'action.collapse_all': 'Collapse All',
    'action.switch_view': 'Switch View Mode',
    'action.approve': 'Approve & Sign',
    'action.reject': 'Reject Request',
    'action.dismiss': 'Dismiss',
    'action.back': 'Back',
    'action.confirm': 'Confirm',
    'action.refresh': 'Refresh',

    // Statuses
    'status.all': 'All Statuses',
    'status.requested': 'Requested',
    'status.in_progress': 'In Progress',
    'status.approved': 'Approved',
    'status.completed': 'Completed',
    'status.rejected': 'Rejected',
    'status.pending': 'Pending Review',
    'status.optimized': 'Optimized',
    'status.assigned': 'Assigned',
    'status.active': 'Active',
    'status.inactive': 'Inactive',

    // Calendar
    'calendar.title': 'Crane Master Schedule',
    'calendar.subtitle': 'Real-time booking and dispatch timeline for industrial heavy machinery',
    'calendar.view_month': 'Month',
    'calendar.view_week': 'Week',
    'calendar.view_day': 'Day',
    'calendar.today': 'Today',
    'calendar.job_record': 'Job Master Record',

    // Request List & Jobs
    'requests.title': 'Heavy Lift Request Registry',
    'requests.subtitle': 'Centralized log for crane and equipment access requests',
    'requests.total': 'Total Requests',
    'requests.search_placeholder': 'Search by Job ID, Plant, or Contractor...',
    'requests.col_id': 'Job ID',
    'requests.col_desc': 'Job Description',
    'requests.col_plant': 'Plant / Area',
    'requests.col_contractor': 'Contractor',
    'requests.col_datetime': 'Date / Time',
    'requests.col_status': 'Status',
    'requests.col_actions': 'Actions',

    // Create Job
    'create.title': 'Create New Lift / Scaffolding Request',
    'create.subtitle': 'Submit a new operational request for site machinery',
    'create.sec_general': '1. General Information',
    'create.sec_timing': '2. Timing & Schedule',
    'create.sec_machinery': '3. Machinery & Crane Specifications',
    'create.sec_location': '4. Operational Location & Map Pin',
    'create.desc_label': 'Job Description *',
    'create.plant_label': 'Plant / Area *',
    'create.start_date': 'Start Date *',
    'create.end_date': 'End Date *',
    'create.time_slot': 'Operating Shift / Time Slot *',
    'create.crane_type': 'Crane Type Needed *',
    'create.load_weight': 'Estimated Load Weight (Tons) *',
    'create.radius': 'Working Radius (Meters) *',

    // Review Plan & Optimize
    'optimizer.title': 'Review Plan & Fleet Optimizer',
    'optimizer.subtitle': 'Automated algorithm matching engineering lifts to available crane configurations with 1.25x safety margins',
    'optimizer.kpi_pending': 'Pending Review',
    'optimizer.kpi_optimized': 'Optimized / Matched',
    'optimizer.kpi_assigned': 'Assigned & Locked',
    'optimizer.kpi_rejected': 'Rejected Requests',
    'optimizer.suitability': 'Machinery Suitability Scoring',
    'optimizer.safety_margin': 'Safety Margin 1.25x',

    // Planning Dashboard
    'dashboard.title': 'Machinery Planning Dashboard',
    'dashboard.subtitle': 'Real-time overview of heavy lift commitments, crane utilization, and site safety distribution',
    'dashboard.total_requests': 'Total Requests',
    'dashboard.fleet_available': 'Available Fleet',
    'dashboard.total_tons': 'Total Load Weight',

    // QA/QC Forms
    'form.equipment_closing_title': 'Equipment Closing Form (Appendix A & B)',
    'form.equipment_closing_subtitle': 'Official vessel internal inspection, tray clearance, and final box-up authorization protocol',
    'form.punch_list_title': 'Punch & Butt List Form',
    'form.punch_list_subtitle': 'Centralized register for tracking field walkdown defects, butt weld quality items, contractor remedial plans, and authorized completion package (CP) sign-offs',
    'form.flange_checklist_title': 'Flange Make-up / Flange Quality Checklist',
    'form.flange_checklist_subtitle': 'Flange Assembly & Joint Tightness QA Checklist conforming to BSRC quality standards',
    'form.turnover_cert_title': 'Certificate of Mechanical Completion & Turnover',
    'form.turnover_cert_subtitle': 'Official document certifying completion of construction and turnover to Operations & Commissioning',

    // Functional Location
    'fl.title': 'Functional Location',
    'fl.subtitle': 'Hierarchical breakdown structure linking Top-Level Units, System Boundaries, and dense Equipment / Spool Registers with operational color codes',
    'fl.bulk_insert': 'Bulk Insert Hierarchy',
    'fl.add_level': 'Add Level / Branch',
    'fl.switch_diagram': 'Switch to Flow Diagram',
    'fl.switch_tree': 'Switch to Collapsible Tree',
    'fl.units_label': 'Units',
    'fl.systems_label': 'Systems',
    'fl.equipment_label': 'Equipment',
    'fl.ewrs_label': 'EWRs (Yellow)',
    'fl.projects_label': 'Projects (Green)',
    'fl.critical_label': 'Critical Path (*)',

    // Turnover Coordinator 4 Stages
    'stage.stage1': 'Stage 1: Punch & Butt Walk',
    'stage.stage2': 'Stage 2: Complete Closing Form',
    'stage.stage3': 'Stage 3: Box Up / De-blind',
    'stage.stage4': 'Stage 4: Closing & Handover',

    // User Config
    'user.title': 'User Configuration & Access Control',
    'user.subtitle': 'Manage operator profiles, system roles, and plant module permissions',
    'user.add_user': 'Add User',
    'user.col_name': 'Name',
    'user.col_role': 'Role',
    'user.col_email': 'Email',
    'user.col_location': 'Location',
    'user.col_modules': 'Modules Access',
    'user.col_status': 'Status',
    'user.col_actions': 'Actions'
  },
  th: {
    // App & Header
    'app.title': 'ระบบบริหารจัดการเครนและการส่งมอบงาน',
    'app.subtitle': 'ระบบปฏิบัติการยกของหนักและการตรวจรับมอบโรงกลั่น/ปิโตรเคมี',
    'header.search': 'ค้นหาคำขอ, หน่วยผลิต, ระบบ, P&ID, แท็กอุปกรณ์...',
    'header.weather': 'สภาพอากาศในโรงงาน',
    'header.switch_lang': 'เปลี่ยนเป็นภาษาอังกฤษ',
    'header.switch_theme': 'เปลี่ยนโหมดธีม',
    'header.light': 'สว่าง',
    'header.dark': 'มืด',
    'header.notifications': 'การแจ้งเตือน',

    // Sidebar Sections & Items
    'nav.crane_module': 'ระบบจัดการเครน (CR01)',
    'nav.scaffold_module': 'ระบบจัดการนั่งร้าน (SF01)',
    'nav.turnover_module': 'การหยุดซ่อมบำรุงและส่งมอบ (S2)',
    'nav.settings_module': 'การตั้งค่าและกำหนดค่าระบบ',

    'nav.cr_request_list': 'CR01 รายการคำขอใช้งาน',
    'nav.cr_plot_plan': 'CR02 แผนผังพื้นที่ยก (Plot Plan)',
    'nav.cr_master_plot': 'CR03 แผนที่รวมโรงงาน (Master)',
    'nav.cr_create_job': 'CR04 สร้างคำขอใช้งานเครน',
    'nav.cr_job_list': 'CR05 ทะเบียนงานปฏิบัติการ',
    'nav.cr_calendar': 'CR06 ตารางปฏิทินงานเครน',
    'nav.cr_review_optimize': 'CR07 ตรวจสอบและจัดสรรเครน',
    'nav.cr_planning_dash': 'CR08 แดชบอร์ดการวางแผน',

    'nav.sf_request_list': 'SF01 รายการคำขอนั่งร้าน',
    'nav.sf_plot_plan': 'SF02 แผนผังติดตั้งนั่งร้าน',
    'nav.sf_master_plot': 'SF03 แผนที่รวมนั่งร้านโรงงาน',
    'nav.sf_create_job': 'SF04 สร้างคำขอนั่งร้าน',
    'nav.sf_job_list': 'SF05 ทะเบียนงานนั่งร้าน',
    'nav.sf_calendar': 'SF06 ตารางปฏิทินนั่งร้าน',

    'nav.to_equipment_closing': 'TO01 แบบฟอร์มปิดอุปกรณ์ (App A&B)',
    'nav.to_punch_list': 'TO02 ทะเบียนข้อบกพร่อง (Punch & Butt)',
    'nav.to_flange_checklist': 'TO03 ตรวจสอบการประกอบหน้าแปลน',
    'nav.to_certificate': 'TO04 หนังสือรับรองการส่งมอบ (Turnover)',
    'nav.to_approval_module': 'TO05 โมดูลอนุมัติงานและลายมือชื่อ',
    'nav.to_stages': 'TO06 ลำดับขั้นตอนการส่งมอบ S2 (4 ขั้นตอน)',
    'nav.to_functional_location': 'ผังโครงสร้างตำแหน่ง (Functional Location)',
    'nav.user_config': 'การจัดการผู้ใช้งานและสิทธิ์ (RBAC)',

    // Common Actions & Badges
    'action.save': 'บันทึก',
    'action.submit': 'ส่งคำขอใช้งาน',
    'action.cancel': 'ยกเลิก',
    'action.delete': 'ลบ',
    'action.edit': 'แก้ไข',
    'action.create': 'สร้างใหม่',
    'action.export_csv': 'ส่งออก CSV',
    'action.export_pdf': 'ส่งออก PDF ทางการ',
    'action.print': 'พิมพ์เอกสาร',
    'action.filter': 'กรองข้อมูล',
    'action.search': 'ค้นหา',
    'action.view_details': 'ดูรายละเอียด',
    'action.expand_all': 'ขยายทั้งหมด',
    'action.collapse_all': 'ย่อทั้งหมด',
    'action.switch_view': 'สลับมุมมอง',
    'action.approve': 'อนุมัติและลงนาม',
    'action.reject': 'ปฏิเสธคำขอ',
    'action.dismiss': 'ปิดการแจ้งเตือน',
    'action.back': 'ย้อนกลับ',
    'action.confirm': 'ยืนยันดำเนินการ',
    'action.refresh': 'รีเฟรชข้อมูล',

    // Statuses
    'status.all': 'ทุกสถานะ',
    'status.requested': 'ส่งคำขอแล้ว',
    'status.in_progress': 'กำลังปฏิบัติงาน',
    'status.approved': 'อนุมัติแล้ว',
    'status.completed': 'เสร็จสิ้นสมบูรณ์',
    'status.rejected': 'ถูกปฏิเสธ',
    'status.pending': 'รอการตรวจสอบ',
    'status.optimized': 'ประมวลผลจัดสรรแล้ว',
    'status.assigned': 'จัดสรรรถเครนแล้ว',
    'status.active': 'ใช้งานอยู่',
    'status.inactive': 'ไม่ได้ใช้งาน',

    // Calendar
    'calendar.title': 'ตารางปฏิทินงานเครนรวม',
    'calendar.subtitle': 'ติดตามกำหนดการจองและจ่ายงานเครื่องจักรกลหนักแบบเรียลไทม์',
    'calendar.view_month': 'รายเดือน',
    'calendar.view_week': 'รายสัปดาห์',
    'calendar.view_day': 'รายวัน',
    'calendar.today': 'วันนี้',
    'calendar.job_record': 'บันทึกรายละเอียดงานยก',

    // Request List & Jobs
    'requests.title': 'ทะเบียนคำขอใช้งานเครื่องจักรหนัก',
    'requests.subtitle': 'ศูนย์รวมรายการคำขอใช้งานเครนและอุปกรณ์สนับสนุนหน้างาน',
    'requests.total': 'คำขอทั้งหมด',
    'requests.search_placeholder': 'ค้นหาด้วยรหัสคำขอ, โรงผลิต หรือผู้รับเหมา...',
    'requests.col_id': 'รหัสงาน (Job ID)',
    'requests.col_desc': 'รายละเอียดงาน',
    'requests.col_plant': 'โรงผลิต / โซน',
    'requests.col_contractor': 'ผู้รับเหมา / หน่วยงาน',
    'requests.col_datetime': 'วัน / เวลาที่ต้องการ',
    'requests.col_status': 'สถานะ',
    'requests.col_actions': 'การจัดการ',

    // Create Job
    'create.title': 'สร้างคำขอใช้งานเครน / นั่งร้านใหม่',
    'create.subtitle': 'กรอกข้อมูลรายละเอียดเพื่อขออนุมัติใช้งานเครื่องจักรหน้างาน',
    'create.sec_general': '1. ข้อมูลทั่วไปของงาน',
    'create.sec_timing': '2. กำหนดการและช่วงเวลา',
    'create.sec_machinery': '3. สเปกเครื่องจักรและรัศมีการยก',
    'create.sec_location': '4. ตำแหน่งหน้างานและปักหมุดบนแผนที่',
    'create.desc_label': 'รายละเอียดงานยก *',
    'create.plant_label': 'โรงผลิต / พื้นที่ทำงาน *',
    'create.start_date': 'วันที่เริ่มต้น *',
    'create.end_date': 'วันที่สิ้นสุด *',
    'create.time_slot': 'กะการทำงาน / ช่วงเวลา *',
    'create.crane_type': 'ประเภทเครนที่ต้องการ *',
    'create.load_weight': 'น้ำหนักชิ้นงานโดยประมาณ (ตัน) *',
    'create.radius': 'รัศมีทำการยก (เมตร) *',

    // Review Plan & Optimize
    'optimizer.title': 'ตรวจสอบแผนและจัดสรรเครื่องจักร (Optimizer)',
    'optimizer.subtitle': 'ระบบคำนวณและจับคู่งานยกกับสเปกเครนอัตโนมัติ โดยคิดค่าความปลอดภัย 1.25 เท่า',
    'optimizer.kpi_pending': 'รอตรวจสอบ',
    'optimizer.kpi_optimized': 'จับคู่สเปกสำเร็จ',
    'optimizer.kpi_assigned': 'จัดสรรรถและลงล็อกแล้ว',
    'optimizer.kpi_rejected': 'คำขอที่ถูกปฏิเสธ',
    'optimizer.suitability': 'คะแนนความเหมาะสมของเครื่องจักร',
    'optimizer.safety_margin': 'ค่าความปลอดภัย (Safety Margin) 1.25x',

    // Planning Dashboard
    'dashboard.title': 'แดชบอร์ดการวางแผนเครนและเครื่องจักร',
    'dashboard.subtitle': 'สรุปภาพรวมคำขอใช้งาน อัตราการใช้เครน และความปลอดภัยในการปฏิบัติงาน',
    'dashboard.total_requests': 'คำขอทั้งหมด',
    'dashboard.fleet_available': 'เครนที่พร้อมใช้งาน',
    'dashboard.total_tons': 'น้ำหนักยกรวม (ตัน)',

    // QA/QC Forms
    'form.equipment_closing_title': 'แบบฟอร์มปิดอุปกรณ์ (Appendix A & B)',
    'form.equipment_closing_subtitle': 'การตรวจสอบภายในถัง/หอกลั่น ความสะอาดของถาด และการอนุมัติปิดฝาแมนโฮลขั้นสุดท้าย',
    'form.punch_list_title': 'ทะเบียนข้อบกพร่องและแนวเชื่อม (Punch & Butt List)',
    'form.punch_list_subtitle': 'ระบบบันทึกข้อบกพร่องจากการเดินตรวจหน้างาน การซ่อมแซมของผู้รับเหมา และการลงนามปิดแพ็กเกจ (CP)',
    'form.flange_checklist_title': 'แบบฟอร์มตรวจสอบคุณภาพการประกอบหน้าแปลน (Flange Checklist)',
    'form.flange_checklist_subtitle': 'แบบฟอร์มตรวจสอบคุณภาพการประกอบหน้าแปลนและข้อต่อประเก็นตามมาตรฐานความปลอดภัย BSRC',
    'form.turnover_cert_title': 'หนังสือรับรองการส่งมอบงานกล (Turnover Certificate)',
    'form.turnover_cert_subtitle': 'เอกสารทางการรับรองการก่อสร้างแล้วเสร็จเพื่อส่งมอบให้ฝ่ายปฏิบัติการและการทดสอบเดินระบบ',

    // Functional Location
    'fl.title': 'ผังโครงสร้างตำแหน่ง (Functional Location)',
    'fl.subtitle': 'โครงสร้างลำดับชั้นเชื่อมโยงหน่วยผลิต (Units), ขอบเขตระบบ (Systems), และทะเบียนอุปกรณ์ (Equipment) พร้อมรหัสสีควบคุม',
    'fl.bulk_insert': 'นำเข้าโครงสร้างแบบกลุ่ม (Bulk Insert)',
    'fl.add_level': 'เพิ่มระดับชั้น/สาขา (Add Level)',
    'fl.switch_diagram': 'สลับเป็นผังไดอะแกรม (Flow)',
    'fl.switch_tree': 'สลับเป็นมุมมองต้นไม้ (Tree)',
    'fl.units_label': 'หน่วยผลิต (Units)',
    'fl.systems_label': 'ระบบย่อย (Systems)',
    'fl.equipment_label': 'อุปกรณ์ (Equipment)',
    'fl.ewrs_label': 'ขอบเขต EWR (สีเหลือง)',
    'fl.projects_label': 'ขอบเขตโปรเจกต์ (สีเขียว)',
    'fl.critical_label': 'เส้นทางวิกฤต Critical Path (*)',

    // Turnover Coordinator 4 Stages
    'stage.stage1': 'ขั้นตอนที่ 1: เดินตรวจ Punch & Butt Walk',
    'stage.stage2': 'ขั้นตอนที่ 2: กรอกแบบฟอร์มปิดงานสมบูรณ์',
    'stage.stage3': 'ขั้นตอนที่ 3: ปิดฝา Box Up / ถอดแผ่นบลายด์',
    'stage.stage4': 'ขั้นตอนที่ 4: ตรวจรับรอง PSSR และส่งมอบเดินระบบ',

    // User Config
    'user.title': 'การจัดการผู้ใช้งานและสิทธิ์เข้าถึง',
    'user.subtitle': 'กำหนดโปรไฟล์ผู้ใช้งาน บทบาทหน้าที่ และสิทธิ์การเข้าถึงโมดูลต่างๆ ในโรงงาน',
    'user.add_user': 'เพิ่มผู้ใช้งานใหม่',
    'user.col_name': 'ชื่อ-นามสกุล',
    'user.col_role': 'บทบาท',
    'user.col_email': 'อีเมล',
    'user.col_location': 'สถานที่/โซน',
    'user.col_modules': 'โมดูลที่เข้าถึงได้',
    'user.col_status': 'สถานะ',
    'user.col_actions': 'การจัดการ'
  }
};

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<Language>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('app_language');
      if (saved === 'th' || saved === 'en') return saved;
    }
    return 'en';
  });

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    if (typeof window !== 'undefined') {
      localStorage.setItem('app_language', lang);
      document.documentElement.lang = lang;
    }
  };

  const toggleLanguage = () => {
    setLanguage(language === 'en' ? 'th' : 'en');
  };

  useEffect(() => {
    if (typeof window !== 'undefined') {
      document.documentElement.lang = language;
    }
  }, [language]);

  const t = (key: string, fallback?: string): string => {
    const dict = translations[language] || translations.en;
    if (dict[key]) {
      return dict[key];
    }
    const enDict = translations.en;
    if (enDict[key]) {
      return enDict[key];
    }
    return fallback || key;
  };

  const isTh = language === 'th';

  return (
    <LanguageContext.Provider value={{ language, isTh, setLanguage, toggleLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = (): LanguageContextType => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};
