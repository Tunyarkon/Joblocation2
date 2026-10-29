import React, { useState, useEffect, useRef, MouseEvent as ReactMouseEvent, TouchEvent as ReactTouchEvent, useMemo } from 'react';
import { 
  MapPin, ZoomIn, ZoomOut, RotateCcw, Compass, Eye, EyeOff, 
  Search, Sliders, Check, CheckCircle2, AlertTriangle, Truck, 
  Building2, Factory, ShieldCheck, X, ChevronRight, Crosshair, 
  Sun, Moon, FileCheck, Info, Tag, Calendar, User, ExternalLink,
  Layers, Radio, AlertOctagon, Gauge, Wind, ShieldAlert, Sparkles, FileText
} from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { useThemeGate } from '../utils/themeGate';
import CranePermitDossierModal from './CranePermitDossierModal';
import essoPlotPlanBg from '../assets/esso_sriracha_master_plotplan.jpg';
import { INITIAL_JOBS, JobRecord } from '../data/turnoverJobsData';
import { 
  getAllCraneJobs, 
  subscribeToCraneOperations, 
  extractDateString, 
  UnifiedCraneJob,
  navigateToCraneView,
  getActiveCraneNavContext,
  clearActiveCraneNavContext
} from '../data/craneOperationsData';

export interface CraneMarker {
  id: string;
  tag: string; // e.g. 11-R-201
  capacity: string; // e.g. 250T, 100T, 50T
  capacityNum: number; // in tons
  type: 'pull' | 'spot'; // pull = Horizontal bundle pull, spot = Vertical lift
  safetyRadius: number; // in meters, e.g. 20m, 25m, 35m
  status: 'In Progress' | 'Completed' | 'Pending Approval';
  isHeavyLift: boolean; // >= 100T
  jobNo: string;
  title: string;
  contractor: string;
  plant: 'Phra Khanong' | 'Sriracha';
  areaName: string;
  gridZone: string;
  x: number; // percentage 0-100
  y: number; // percentage 0-100
  scheduledDate: string;
  shift: string;
  boomLength: string;
  windLimit: string;
  riggerLead: string;
  groundPressureKPa: number;
  outriggerMatSize: string;
  ptwNo: string;
  phorJor2Cert: string;
  isArea?: boolean;
  width?: number;
  height?: number;
  rotation?: number;
  markingType?: 'pin' | 'area' | 'both';
}

export interface ZoneDefinition {
  id: string;
  nameEn: string;
  nameTh: string;
  areaCode: string;
  descriptionEn: string;
  descriptionTh: string;
  gridZone: string;
  center: { x: number; y: number; zoom: number };
  bounds: { x: number; y: number; width: number; height: number };
  color: string;
  equipment: { name: string; tag: string; x: number; y: number; type: 'column' | 'furnace' | 'exchanger' | 'tank' | 'reactor' | 'sphere' }[];
}

// 1. Phra Khanong Operational Areas
const PHRA_KHANONG_ZONES: ZoneDefinition[] = [
  {
    id: 'pk-area-01',
    areaCode: 'พื้นที่ 01',
    nameEn: 'CDU-1 & Heat Exchangers',
    nameTh: 'หน่วยกลั่นน้ำมันดิบ CDU-1 & Heat Exchangers',
    descriptionEn: 'Atmospheric distillation column, desalter drum & main preheat bundle bay',
    descriptionTh: 'หอกลั่นบรรยากาศ 11-C-101, ถังดีซอลเตอร์ และลานดึงไส้ท่อแลกเปลี่ยนความร้อน',
    gridZone: 'GRID A1-B3',
    center: { x: 28, y: 30, zoom: 140 },
    bounds: { x: 8, y: 10, width: 40, height: 38 },
    color: '#008b52',
    equipment: [
      { name: 'Crude Column', tag: '11-C-101', x: 20, y: 22, type: 'column' },
      { name: 'Overhead Condensers', tag: '11-E-101A/D', x: 34, y: 18, type: 'exchanger' },
      { name: 'Crude Desalter', tag: '11-V-101', x: 18, y: 38, type: 'reactor' },
      { name: 'Preheat Train Bay', tag: '11-E-102~108', x: 36, y: 36, type: 'exchanger' }
    ]
  },
  {
    id: 'pk-area-02',
    areaCode: 'พื้นที่ 02',
    nameEn: 'Furnace Decoking & Heater Bay',
    nameTh: 'เตาเผาและชุดฮีตเตอร์ (Furnace Decoking & Heater Bay)',
    descriptionEn: 'Crude and vacuum fired heaters, convection banks & main flue gas stack',
    descriptionTh: 'เตาเผากลั่นน้ำมันดิบ 11-F-101, เตาเผาสุญญากาศ 11-F-102 และปล่องระบายควันสูง',
    gridZone: 'GRID C1-D3',
    center: { x: 72, y: 30, zoom: 140 },
    bounds: { x: 52, y: 10, width: 40, height: 38 },
    color: '#ea580c',
    equipment: [
      { name: 'Crude Heater', tag: '11-F-101', x: 62, y: 22, type: 'furnace' },
      { name: 'Vacuum Heater', tag: '11-F-102', x: 80, y: 22, type: 'furnace' },
      { name: 'Decoking Air Unit', tag: '11-K-102', x: 62, y: 36, type: 'reactor' },
      { name: 'Main Flue Stack', tag: '11-ST-101', x: 82, y: 36, type: 'column' }
    ]
  },
  {
    id: 'pk-area-03',
    areaCode: 'พื้นที่ 03',
    nameEn: 'Hydrotreater Exchanger Quad',
    nameTh: 'หน่วยปรับปรุงคุณภาพน้ำมัน (Hydrotreater Exchanger Quad)',
    descriptionEn: 'High pressure hydroprocessing reactors, strippers & four-shell exchangers',
    descriptionTh: 'รีแอคเตอร์บำบัดด้วยไฮโดรเจน 21-R-101, หอแยกสาร และชุดเครื่องแลกเปลี่ยนความร้อน 4 ตัว',
    gridZone: 'GRID A4-B6',
    center: { x: 28, y: 72, zoom: 140 },
    bounds: { x: 8, y: 52, width: 40, height: 38 },
    color: '#3b82f6',
    equipment: [
      { name: 'HDT Reactor', tag: '21-R-101', x: 18, y: 64, type: 'reactor' },
      { name: 'HP Separator', tag: '21-V-102', x: 22, y: 80, type: 'reactor' },
      { name: 'Stripper Column', tag: '21-C-101', x: 38, y: 64, type: 'column' },
      { name: 'Exchanger Quad', tag: '21-E-201A-D', x: 36, y: 80, type: 'exchanger' }
    ]
  },
  {
    id: 'pk-area-04',
    areaCode: 'พื้นที่ 04',
    nameEn: 'Marine Terminal & Tank Farm',
    nameTh: 'ท่าเทียบเรือและคลังถังเก็บ (Marine Terminal & Tank Farm)',
    descriptionEn: 'Crude day tanks, product distribution pumps & river offloading jetty corridor',
    descriptionTh: 'ถังพักน้ำมันดิบ TK-101 ~ TK-106, สถานีสูบจ่ายน้ำมัน และแนวสะพานท่อส่งเทียบเรือ',
    gridZone: 'GRID C4-D6',
    center: { x: 72, y: 72, zoom: 140 },
    bounds: { x: 52, y: 52, width: 40, height: 38 },
    color: '#8b5cf6',
    equipment: [
      { name: 'Day Tank 101', tag: 'TK-101', x: 62, y: 64, type: 'tank' },
      { name: 'Day Tank 102', tag: 'TK-102', x: 80, y: 64, type: 'tank' },
      { name: 'Loading Gantry', tag: 'L-PUMP-01', x: 62, y: 80, type: 'reactor' },
      { name: 'Chao Phraya Jetty', tag: 'JETTY-PK-1', x: 82, y: 80, type: 'column' }
    ]
  }
];

// 2. Si Racha Operational Zones
const SRIRACHA_ZONES: ZoneDefinition[] = [
  {
    id: 'sr-zone-01',
    areaCode: 'โซน 01',
    nameEn: 'CDU Crude Distillation Column',
    nameTh: 'หน่วยกลั่น CDU-1 & Desalter (Zone 01)',
    descriptionEn: 'Main distillation train, overhead condensers & desalter drum',
    descriptionTh: 'หอกลั่นน้ำมันดิบหลัก 11-C-101, แท่นชุดคอนเดนเซอร์ และดีซอลเตอร์',
    gridZone: 'GRID A1-B3',
    center: { x: 30, y: 35, zoom: 140 },
    bounds: { x: 10, y: 15, width: 40, height: 42 },
    color: '#0284c7',
    equipment: [
      { name: 'Crude Column', tag: '11-C-101', x: 28, y: 28, type: 'column' },
      { name: 'Condenser Bay', tag: '11-E-101', x: 38, y: 24, type: 'exchanger' },
      { name: 'Desalter Drum', tag: '11-V-101', x: 22, y: 44, type: 'reactor' },
      { name: 'Preheat Train', tag: '11-E-102~108', x: 36, y: 46, type: 'exchanger' }
    ]
  },
  {
    id: 'sr-zone-02',
    areaCode: 'โซน 02',
    nameEn: 'HCU High Pressure Reactors',
    nameTh: 'หน่วยไฮโดรแครกเกอร์ HCU & Reactor (Zone 02)',
    descriptionEn: '300-Bar heavy gas oil hydrocracking reactors & hot high-pressure separator',
    descriptionTh: 'รีแอคเตอร์ไฮโดรแครกเกอร์ 11-R-201 (300 Bar) และชุดเตาเผาฮีตเตอร์ 11-F-101',
    gridZone: 'GRID C1-D3',
    center: { x: 68, y: 35, zoom: 140 },
    bounds: { x: 52, y: 15, width: 42, height: 42 },
    color: '#e11d48',
    equipment: [
      { name: 'HCU Reactor', tag: '11-R-201', x: 62, y: 26, type: 'reactor' },
      { name: 'Fired Heater', tag: '11-F-101', x: 78, y: 26, type: 'furnace' },
      { name: 'HP Separator', tag: '11-V-202', x: 64, y: 44, type: 'reactor' },
      { name: 'Vacuum Heater', tag: '11-F-201', x: 82, y: 44, type: 'furnace' }
    ]
  },
  {
    id: 'sr-zone-03',
    areaCode: 'โซน 03',
    nameEn: 'Utilities, Cooling Tower & Substation',
    nameTh: 'สาธารณูปโภค คูลลิ่งทาวเวอร์ & สถานีไฟฟ้า (Zone 03)',
    descriptionEn: 'Plant water cooling system, pump stations and electrical substation SS-4',
    descriptionTh: 'ระบบหล่อเย็น CP-01, สถานีสูบน้ำ และสถานีไฟฟ้าย่อย Substation SS-4',
    gridZone: 'GRID A4-B6',
    center: { x: 30, y: 75, zoom: 140 },
    bounds: { x: 10, y: 60, width: 40, height: 35 },
    color: '#059669',
    equipment: [
      { name: 'Cooling Tower', tag: 'CP-01', x: 24, y: 70, type: 'column' },
      { name: 'Substation SS-4', tag: 'SS-4', x: 38, y: 72, type: 'column' },
      { name: 'Utility Pumps', tag: '11-P-101A/B', x: 26, y: 84, type: 'reactor' },
      { name: 'Effluent Plant', tag: '11-RR-01', x: 38, y: 86, type: 'reactor' }
    ]
  },
  {
    id: 'sr-zone-04',
    areaCode: 'โซน 04',
    nameEn: 'Coastal Tank Farm & LPG Spheres',
    nameTh: 'คลังถังเก็บน้ำมันชายฝั่ง & ทรงกลม LPG (Zone 04)',
    descriptionEn: 'Crude tanks TK-3807~3811, LPG spheres & truck loading rack terminal',
    descriptionTh: 'ถังน้ำมันดิบขนาดใหญ่ TK-3807~3811, ถังแก๊ส LPG และสถานีจ่ายรถบรรทุก',
    gridZone: 'GRID C4-D6',
    center: { x: 72, y: 75, zoom: 140 },
    bounds: { x: 52, y: 60, width: 44, height: 35 },
    color: '#d97706',
    equipment: [
      { name: 'Crude Oil Tank', tag: 'TK-3807', x: 62, y: 68, type: 'tank' },
      { name: 'Crude Oil Tank', tag: 'TK-3808', x: 78, y: 68, type: 'tank' },
      { name: 'Diesel Tank', tag: 'TK-3801', x: 88, y: 78, type: 'tank' },
      { name: 'Heavy Fuel Tank', tag: '11-TK-3001', x: 70, y: 84, type: 'tank' }
    ]
  }
];

// 14 Sriracha Mobile Cranes matching the plant CAD
const SRIRACHA_CRANE_DATA: CraneMarker[] = [
  {
    id: 'cr-sr-201',
    tag: '11-R-201',
    capacity: '250T',
    capacityNum: 250,
    type: 'spot',
    safetyRadius: 36,
    status: 'In Progress',
    isHeavyLift: true,
    jobNo: 'CR01-SR-2601',
    title: 'HCU Hydrocracker Reactor Catalyst Dump & Top Head Lift',
    contractor: 'Thai Rotary Engineering PCL',
    plant: 'Sriracha',
    areaName: 'โซน 02: หน่วยแตกโมเลกุลด้วยไฮโดรเจน (HCU)',
    gridZone: 'C2',
    x: 44.5,
    y: 48.5,
    scheduledDate: '2026-10-16',
    shift: 'Critical Lift (08:00 - 18:00)',
    boomLength: '58.0 m',
    windLimit: '9 m/s (17.5 knots)',
    riggerLead: 'Prasert Boonmee (Cert #RG-7412)',
    groundPressureKPa: 210,
    outriggerMatSize: '2.5m x 2.5m Heavy Steel',
    ptwNo: 'PTW-SR-2026-0881',
    phorJor2Cert: 'PJ2-SR-9921-APPROVED'
  },
  {
    id: 'cr-sr-202',
    tag: '11-C-201',
    capacity: '100T',
    capacityNum: 100,
    type: 'spot',
    safetyRadius: 28,
    status: 'In Progress',
    isHeavyLift: true,
    jobNo: 'CR01-SR-2602',
    title: 'Fractionator Column 11-C-201 Overhead Platform Replacement',
    contractor: 'Unimit Engineering',
    plant: 'Sriracha',
    areaName: 'โซน 02: หน่วยแตกโมเลกุลด้วยไฮโดรเจน (HCU)',
    gridZone: 'D2',
    x: 54.0,
    y: 46.5,
    scheduledDate: '2026-10-16',
    shift: 'Day Shift (08:00 - 17:00)',
    boomLength: '45.0 m',
    windLimit: '11 m/s (21.4 knots)',
    riggerLead: 'Wichai Thongchai (Cert #RG-9021)',
    groundPressureKPa: 165,
    outriggerMatSize: '2.0m x 2.0m Steel Mat',
    ptwNo: 'PTW-SR-2026-0882',
    phorJor2Cert: 'PJ2-SR-9922-APPROVED'
  },
  {
    id: 'cr-sr-203',
    tag: '11-C-101',
    capacity: '100T',
    capacityNum: 100,
    type: 'spot',
    safetyRadius: 26,
    status: 'In Progress',
    isHeavyLift: true,
    jobNo: 'CR01-SR-2603',
    title: 'CDU Crude Column Internal Trays Replacement (Heavy Crane)',
    contractor: 'BJC Heavy Industrial',
    plant: 'Sriracha',
    areaName: 'โซน 01: หน่วยกลั่น CDU-1 & Desalter',
    gridZone: 'C3',
    x: 51.5,
    y: 57.0,
    scheduledDate: '2026-10-16',
    shift: 'Day Shift (08:00 - 17:00)',
    boomLength: '42.0 m',
    windLimit: '10 m/s (19.4 knots)',
    riggerLead: 'Somchai Prasert (Cert #RG-5512)',
    groundPressureKPa: 155,
    outriggerMatSize: '2.0m x 2.0m Steel Mat',
    ptwNo: 'PTW-SR-2026-0883',
    phorJor2Cert: 'PJ2-SR-9923-APPROVED'
  },
  {
    id: 'cr-sr-204',
    tag: '11-F-101',
    capacity: '200T',
    capacityNum: 200,
    type: 'spot',
    safetyRadius: 32,
    status: 'In Progress',
    isHeavyLift: true,
    jobNo: 'CR01-SR-2604',
    title: 'Crude Fired Heater Convection Bank Coil Module Tandem Lift',
    contractor: 'Thai Rotary Engineering PCL',
    plant: 'Sriracha',
    areaName: 'โซน 01: หน่วยกลั่น CDU-1 & Desalter',
    gridZone: 'B2',
    x: 37.5,
    y: 52.0,
    scheduledDate: '2026-10-17',
    shift: 'Full Day Lift',
    boomLength: '52.0 m',
    windLimit: '10 m/s (19.4 knots)',
    riggerLead: 'Kitti Raksasook (Cert #SR-CR-1102)',
    groundPressureKPa: 195,
    outriggerMatSize: '2.5m x 2.5m Heavy Steel',
    ptwNo: 'PTW-SR-2026-0884',
    phorJor2Cert: 'PJ2-SR-9924-APPROVED'
  },
  {
    id: 'cr-sr-205',
    tag: '11-E-204',
    capacity: '160T',
    capacityNum: 160,
    type: 'pull',
    safetyRadius: 30,
    status: 'In Progress',
    isHeavyLift: true,
    jobNo: 'CR01-SR-2605',
    title: 'High Pressure Exchanger 11-E-204 Tube Bundle Pull & Clean',
    contractor: 'Unimit Engineering',
    plant: 'Sriracha',
    areaName: 'โซน 01: หน่วยกลั่น CDU-1 & Desalter',
    gridZone: 'C3',
    x: 46.5,
    y: 62.0,
    scheduledDate: '2026-10-17',
    shift: 'Day Shift (08:30 - 17:30)',
    boomLength: '48.0 m',
    windLimit: '11 m/s (21.4 knots)',
    riggerLead: 'Anan Petchdee (Cert #SR-CR-8821)',
    groundPressureKPa: 175,
    outriggerMatSize: '2.2m x 2.2m Steel Mat',
    ptwNo: 'PTW-SR-2026-0885',
    phorJor2Cert: 'PJ2-SR-9925-APPROVED'
  },
  {
    id: 'cr-sr-206',
    tag: '11-TK-3001',
    capacity: '300T',
    capacityNum: 300,
    type: 'spot',
    safetyRadius: 38,
    status: 'Pending Approval',
    isHeavyLift: true,
    jobNo: 'CR01-SR-2606',
    title: 'Crude Oil Storage Tank Floating Roof Plate Replacement Lift',
    contractor: 'Sriracha Heavy Crane Logistics',
    plant: 'Sriracha',
    areaName: 'โซน 04: คลังถังเก็บน้ำมันชายฝั่ง & ทรงกลม LPG',
    gridZone: 'D5',
    x: 78.0,
    y: 80.5,
    scheduledDate: '2026-10-19',
    shift: 'Full Day Heavy Lift',
    boomLength: '65.0 m',
    windLimit: '8.5 m/s (16.5 knots)',
    riggerLead: 'Narong Sakda (Cert #SR-CR-4401)',
    groundPressureKPa: 220,
    outriggerMatSize: '3.0m x 3.0m Composite Pad',
    ptwNo: 'PTW-SR-2026-0886',
    phorJor2Cert: 'PJ2-SR-9926-APPROVED'
  },
  {
    id: 'cr-sr-207',
    tag: '11-RR-01',
    capacity: '120T',
    capacityNum: 120,
    type: 'spot',
    safetyRadius: 28,
    status: 'In Progress',
    isHeavyLift: true,
    jobNo: 'CR01-SR-2607',
    title: 'Effluent Water Stripper Vessel Structural Skid Replacement',
    contractor: 'BJC Heavy Industrial',
    plant: 'Sriracha',
    areaName: 'โซน 03: สาธารณูปโภค คูลลิ่งทาวเวอร์ & สถานีไฟฟ้า',
    gridZone: 'B4',
    x: 31.5,
    y: 70.0,
    scheduledDate: '2026-10-16',
    shift: 'Day Shift (08:00 - 17:00)',
    boomLength: '46.0 m',
    windLimit: '12 m/s (23.3 knots)',
    riggerLead: 'Prasert Boonmee (Cert #RG-7412)',
    groundPressureKPa: 160,
    outriggerMatSize: '2.0m x 2.0m Steel Mat',
    ptwNo: 'PTW-SR-2026-0887',
    phorJor2Cert: 'PJ2-SR-9927-APPROVED'
  },
  {
    id: 'cr-sr-208',
    tag: '11-P-101A',
    capacity: '35T',
    capacityNum: 35,
    type: 'spot',
    safetyRadius: 18,
    status: 'In Progress',
    isHeavyLift: false,
    jobNo: 'CR01-SR-2608',
    title: 'Crude Booster Charge Pump 11-P-101A Motor Overhaul Lift',
    contractor: 'Bangchak Valve Special Services',
    plant: 'Sriracha',
    areaName: 'โซน 03: สาธารณูปโภค คูลลิ่งทาวเวอร์ & สถานีไฟฟ้า',
    gridZone: 'C4',
    x: 61.5,
    y: 66.5,
    scheduledDate: '2026-10-16',
    shift: 'Day Shift (08:00 - 17:00)',
    boomLength: '28.0 m',
    windLimit: '14 m/s (27.2 knots)',
    riggerLead: 'Wichai Thongchai (Cert #RG-9021)',
    groundPressureKPa: 95,
    outriggerMatSize: '1.5m x 1.5m Outrigger Pad',
    ptwNo: 'PTW-SR-2026-0888',
    phorJor2Cert: 'PJ2-SR-9928-APPROVED'
  },
  {
    id: 'cr-sr-209',
    tag: '11-K-301',
    capacity: '80T',
    capacityNum: 80,
    type: 'spot',
    safetyRadius: 24,
    status: 'Pending Approval',
    isHeavyLift: false,
    jobNo: 'CR01-SR-2609',
    title: 'Hydrogen Recycle Compressor 11-K-301 Rotor Extraction',
    contractor: 'Unimit Engineering',
    plant: 'Sriracha',
    areaName: 'โซน 02: หน่วยแตกโมเลกุลด้วยไฮโดรเจน (HCU)',
    gridZone: 'D3',
    x: 66.0,
    y: 53.5,
    scheduledDate: '2026-10-18',
    shift: 'Night Shift Scheduled',
    boomLength: '38.0 m',
    windLimit: '12 m/s (23.3 knots)',
    riggerLead: 'Somchai Prasert (Cert #RG-5512)',
    groundPressureKPa: 130,
    outriggerMatSize: '1.8m x 1.8m Steel Mat',
    ptwNo: 'PTW-SR-2026-0889',
    phorJor2Cert: 'PJ2-SR-9929-APPROVED'
  },
  {
    id: 'cr-sr-210',
    tag: '11-E-401',
    capacity: '90T',
    capacityNum: 90,
    type: 'pull',
    safetyRadius: 25,
    status: 'Pending Approval',
    isHeavyLift: false,
    jobNo: 'CR01-SR-2610',
    title: 'Gas Oil Cooler 11-E-401 Shell & Tube Hydrotest Alignment',
    contractor: 'Thai Rotary Engineering PCL',
    plant: 'Sriracha',
    areaName: 'โซน 04: คลังถังเก็บน้ำมันชายฝั่ง & ทรงกลม LPG',
    gridZone: 'D4',
    x: 71.5,
    y: 61.0,
    scheduledDate: '2026-10-17',
    shift: 'Day Shift (08:00 - 17:00)',
    boomLength: '40.0 m',
    windLimit: '12 m/s (23.3 knots)',
    riggerLead: 'Kitti Raksasook (Cert #SR-CR-1102)',
    groundPressureKPa: 140,
    outriggerMatSize: '1.8m x 1.8m Steel Mat',
    ptwNo: 'PTW-SR-2026-0890',
    phorJor2Cert: 'PJ2-SR-9930-APPROVED'
  },
  {
    id: 'cr-sr-211',
    tag: '11-F-201',
    capacity: '50T',
    capacityNum: 50,
    type: 'spot',
    safetyRadius: 22,
    status: 'Pending Approval',
    isHeavyLift: false,
    jobNo: 'CR01-SR-2611',
    title: 'Vacuum Fired Heater 11-F-201 Burner Assembly Replacement',
    contractor: 'BJC Heavy Industrial',
    plant: 'Sriracha',
    areaName: 'โซน 02: หน่วยแตกโมเลกุลด้วยไฮโดรเจน (HCU)',
    gridZone: 'D2',
    x: 66.5,
    y: 44.0,
    scheduledDate: '2026-10-18',
    shift: 'Day Shift',
    boomLength: '35.0 m',
    windLimit: '13 m/s (25.3 knots)',
    riggerLead: 'Anan Petchdee (Cert #SR-CR-8821)',
    groundPressureKPa: 110,
    outriggerMatSize: '1.5m x 1.5m Outrigger Pad',
    ptwNo: 'PTW-SR-2026-0891',
    phorJor2Cert: 'PJ2-SR-9931-APPROVED'
  },
  {
    id: 'cr-sr-212',
    tag: '11-V-202',
    capacity: '50T',
    capacityNum: 50,
    type: 'spot',
    safetyRadius: 20,
    status: 'Pending Approval',
    isHeavyLift: false,
    jobNo: 'CR01-SR-2612',
    title: 'Hot Separator Vessel 11-V-202 Relief Valve Flange Torquing',
    contractor: 'Bangchak Maintenance Services',
    plant: 'Sriracha',
    areaName: 'โซน 02: หน่วยแตกโมเลกุลด้วยไฮโดรเจน (HCU)',
    gridZone: 'C2',
    x: 50.0,
    y: 50.5,
    scheduledDate: '2026-10-16',
    shift: 'Day Shift (08:00 - 17:00)',
    boomLength: '32.0 m',
    windLimit: '14 m/s (27.2 knots)',
    riggerLead: 'Narong Sakda (Cert #SR-CR-4401)',
    groundPressureKPa: 105,
    outriggerMatSize: '1.5m x 1.5m Outrigger Pad',
    ptwNo: 'PTW-SR-2026-0892',
    phorJor2Cert: 'PJ2-SR-9932-APPROVED'
  },
  {
    id: 'cr-sr-213',
    tag: '11-P-102B',
    capacity: '25T',
    capacityNum: 25,
    type: 'spot',
    safetyRadius: 15,
    status: 'Pending Approval',
    isHeavyLift: false,
    jobNo: 'CR01-SR-2613',
    title: 'Desalter Recycle Water Pump 11-P-102B Seal Exchange',
    contractor: 'Bangchak Valve Special Services',
    plant: 'Sriracha',
    areaName: 'โซน 01: หน่วยกลั่น CDU-1 & Desalter',
    gridZone: 'C4',
    x: 62.0,
    y: 72.0,
    scheduledDate: '2026-10-17',
    shift: 'Afternoon Shift',
    boomLength: '24.0 m',
    windLimit: '15 m/s (29.1 knots)',
    riggerLead: 'Prasert Boonmee (Cert #RG-7412)',
    groundPressureKPa: 80,
    outriggerMatSize: '1.2m x 1.2m Outrigger Pad',
    ptwNo: 'PTW-SR-2026-0893',
    phorJor2Cert: 'PJ2-SR-9933-APPROVED'
  },
  {
    id: 'cr-sr-214',
    tag: '11-E-302',
    capacity: '70T',
    capacityNum: 70,
    type: 'pull',
    safetyRadius: 22,
    status: 'Pending Approval',
    isHeavyLift: false,
    jobNo: 'CR01-SR-2614',
    title: 'Kerosene Condenser 11-E-302 Bundle Withdrawal & Clean',
    contractor: 'Unimit Engineering',
    plant: 'Sriracha',
    areaName: 'โซน 01: หน่วยกลั่น CDU-1 & Desalter',
    gridZone: 'C3',
    x: 55.5,
    y: 60.5,
    scheduledDate: '2026-10-18',
    shift: 'Day Shift (08:00 - 17:00)',
    boomLength: '36.0 m',
    windLimit: '13 m/s (25.3 knots)',
    riggerLead: 'Wichai Thongchai (Cert #RG-9021)',
    groundPressureKPa: 125,
    outriggerMatSize: '1.8m x 1.8m Steel Mat',
    ptwNo: 'PTW-SR-2026-0894',
    phorJor2Cert: 'PJ2-SR-9934-APPROVED'
  }
];

// Phra Khanong realistic cranes
const PHRA_KHANONG_CRANE_DATA: CraneMarker[] = [
  {
    id: 'cr-pk-01',
    tag: 'CR-01 (50T)',
    capacity: '50T',
    capacityNum: 50,
    type: 'pull',
    safetyRadius: 20,
    status: 'In Progress',
    isHeavyLift: false,
    jobNo: 'CR01-PK-2601',
    title: 'CDU-1 Overhead Condenser 11-E-101A Tube Bundle Pull',
    contractor: 'Thai Rotary Engineering PCL',
    plant: 'Phra Khanong',
    areaName: 'พื้นที่ 01: CDU-1 & Heat Exchangers',
    gridZone: 'B2',
    x: 32,
    y: 26,
    scheduledDate: '2026-10-16',
    shift: 'Day Shift (08:00 - 17:00)',
    boomLength: '36.5 m',
    windLimit: '12 m/s (23.3 knots)',
    riggerLead: 'Prasert Boonmee (Cert #RG-7412)',
    groundPressureKPa: 110,
    outriggerMatSize: '1.5m x 1.5m Steel Pad',
    ptwNo: 'PTW-PK-2026-1102',
    phorJor2Cert: 'PJ2-PK-8812-APPROVED'
  },
  {
    id: 'cr-pk-02',
    tag: 'CR-02 (160T)',
    capacity: '160T',
    capacityNum: 160,
    type: 'spot',
    safetyRadius: 30,
    status: 'In Progress',
    isHeavyLift: true,
    jobNo: 'CR01-PK-2602',
    title: 'Fired Heater 11-F-101 Convection Module Heavy Spotting',
    contractor: 'Unimit Engineering',
    plant: 'Phra Khanong',
    areaName: 'พื้นที่ 02: เตาเผาและชุดฮีตเตอร์',
    gridZone: 'C2',
    x: 68,
    y: 28,
    scheduledDate: '2026-10-17',
    shift: 'Full Day Lift (07:00 - 19:00)',
    boomLength: '52.0 m',
    windLimit: '10 m/s (19.4 knots)',
    riggerLead: 'Wichai Thongchai (Cert #RG-9021)',
    groundPressureKPa: 180,
    outriggerMatSize: '2.5m x 2.5m Steel Pad',
    ptwNo: 'PTW-PK-2026-1103',
    phorJor2Cert: 'PJ2-PK-8813-APPROVED'
  },
  {
    id: 'cr-pk-03',
    tag: 'CR-04 (100T)',
    capacity: '100T',
    capacityNum: 100,
    type: 'pull',
    safetyRadius: 25,
    status: 'Completed',
    isHeavyLift: true,
    jobNo: 'CR01-PK-2603',
    title: 'Hydrotreater Exchanger Quad 21-E-201A Bundle Withdrawal',
    contractor: 'BJC Heavy Industrial',
    plant: 'Phra Khanong',
    areaName: 'พื้นที่ 03: หน่วยปรับปรุงคุณภาพน้ำมัน',
    gridZone: 'B5',
    x: 32,
    y: 74,
    scheduledDate: '2026-10-14',
    shift: 'Completed Lift',
    boomLength: '42.0 m',
    windLimit: '12 m/s (23.3 knots)',
    riggerLead: 'Somchai Prasert (Cert #RG-5512)',
    groundPressureKPa: 150,
    outriggerMatSize: '2.0m x 2.0m Steel Pad',
    ptwNo: 'PTW-PK-2026-1104',
    phorJor2Cert: 'PJ2-PK-8814-APPROVED'
  }
];

export default function PlotPlan({ isScaffolding = false, setActiveView }: { isScaffolding?: boolean; setActiveView?: (view: string) => void }) {
  const { language } = useLanguage();
  const isTh = language === 'th';

  // 1. Plant Selection: Bangchak Phra Khanong vs Sriracha
  const [selectedPlant, setSelectedPlant] = useState<'Phra Khanong' | 'Sriracha'>('Sriracha');

  // 2. Blueprint Theme Mode linked with Global Theme Gate: 'dark' (Dark Blueprint) vs 'paper' (Paper CAD)
  const [gateIsDark, setGlobalThemeGate] = useThemeGate();
  const [blueprintTheme, setBlueprintTheme] = useState<'dark' | 'paper'>(() => gateIsDark ? 'dark' : 'paper');

  useEffect(() => {
    setBlueprintTheme(gateIsDark ? 'dark' : 'paper');
  }, [gateIsDark]);

  // 3. Status Filter Selection
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'approved' | 'heavy'>('all');

  // 4. Layer Toggles
  const [showOutriggers, setShowOutriggers] = useState(true);
  const [showSafetyRadius, setShowSafetyRadius] = useState(true);
  const [showCraneLayer, setShowCraneLayer] = useState(true);
  const [showJobLayer, setShowJobLayer] = useState(false);
  const [showGridLines, setShowGridLines] = useState(true);

  // 5. Canvas Engine: Zoom (50% to 250%) & Pan
  const canvasContainerRef = useRef<HTMLDivElement>(null);
  const [zoomLevel, setZoomLevel] = useState<number>(100);
  const [panOffset, setPanOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [highlightedZoneId, setHighlightedZoneId] = useState<string | null>(null);

  // 6. Interactive Focus / Hovering state (fixes visual clutter!)
  const [hoveredCraneId, setHoveredCraneId] = useState<string | null>(null);
  const [selectedCrane, setSelectedCrane] = useState<CraneMarker | null>(null);
  const [selectedJob, setSelectedJob] = useState<JobRecord | null>(null);

  // Crane Permit Dossier Modal State
  const [isDossierModalOpen, setIsDossierModalOpen] = useState(false);
  const [dossierModalJob, setDossierModalJob] = useState<{
    id: string;
    description: string;
    area: string;
    contractor: string;
    type?: string;
    craneType?: string;
    capacity?: string;
    date?: string;
    time?: string;
    plant?: 'Phra Khanong' | 'Sriracha';
  } | null>(null);

  // 7. Pinning Mode
  const [isPinningModeActive, setIsPinningModeActive] = useState(false);
  const [candidatePin, setCandidatePin] = useState<{ x: number; y: number; tag: string; capacity: string; type: 'pull' | 'spot'; safetyRadius: number; title: string; contractor: string } | null>(null);

  // 8. Crane Marker Data with Unified Crane Store Integration
  const [customCraneJobs, setCustomCraneJobs] = useState<UnifiedCraneJob[]>(() => getAllCraneJobs());

  useEffect(() => {
    const unsubscribe = subscribeToCraneOperations((updated) => {
      setCustomCraneJobs(updated);
    });
    return unsubscribe;
  }, []);

  const [srirachaCranes, setSrirachaCranes] = useState<CraneMarker[]>(SRIRACHA_CRANE_DATA);
  const [phraKhanongCranes, setPhraKhanongCranes] = useState<CraneMarker[]>(PHRA_KHANONG_CRANE_DATA);
  const [turnoverJobs] = useState<JobRecord[]>(INITIAL_JOBS);

  // Helper to map custom crane jobs to plot plan markers
  const mapJobToCraneMarker = (job: UnifiedCraneJob): CraneMarker => {
    const isPull = job.craneType === 'Crane Pull';
    return {
      id: String(job.id),
      tag: job.equipmentId || job.jobNo,
      capacity: `${job.capacity}T`,
      capacityNum: job.capacity,
      type: isPull ? 'pull' : 'spot',
      safetyRadius: job.safetyRadius || Math.max(15, Math.round(job.capacity * 0.12 + 10)),
      status: job.status === 'Completed' ? 'Completed' : job.status === 'In Progress' ? 'In Progress' : 'Pending Approval',
      isHeavyLift: job.capacity >= 100,
      jobNo: job.jobNo,
      title: job.description,
      contractor: job.contractor,
      plant: job.plant,
      areaName: job.area || (job.plant === 'Sriracha' ? 'Sriracha Terminal Complex' : 'BCP Refinery Area 1'),
      gridZone: 'GRID B2',
      x: typeof job.x === 'number' ? job.x : 45.0,
      y: typeof job.y === 'number' ? job.y : 50.0,
      scheduledDate: job.date || extractDateString(job.dateFrom),
      shift: 'Turnaround Day Shift',
      boomLength: `${Math.round(job.capacity * 0.2 + 25)}m`,
      windLimit: '12.5 m/s (45 km/h)',
      riggerLead: job.riggerLead || 'Assigned Site Rigger',
      groundPressureKPa: job.groundPressureKPa || (job.capacity * 2.5 + 80),
      outriggerMatSize: (job as any).outriggerMatSize || (job.capacity >= 100 ? '2.5m x 2.5m Steel' : '1.8m x 1.8m Pad'),
      ptwNo: job.ptwNo || `PTW-2026-${String(job.jobNo).slice(-4)}`,
      phorJor2Cert: job.phorJor2Cert || `PJ2-BCP-2026-${String(job.jobNo).slice(-4)}`,
      isArea: job.isArea || job.markingType === 'area' || job.markingType === 'both',
      width: job.width || (job.capacity >= 100 ? 10 : job.capacity >= 50 ? 6 : 6),
      height: job.height || (job.capacity >= 100 ? 12.5 : job.capacity >= 50 ? 8 : 7),
      rotation: job.rotation || 0,
      markingType: job.markingType || (job.isArea ? 'area' : 'pin')
    };
  };

  // Dynamically merge custom crane pins into the active refinery markers
  const mergedPhraKhanongCranes = useMemo(() => {
    const customPk = customCraneJobs
      .filter(j => j.plant === 'Phra Khanong')
      .map(mapJobToCraneMarker);
    const customJobNos = new Set(customPk.map(c => c.jobNo));
    const baseFiltered = phraKhanongCranes.filter(c => !customJobNos.has(c.jobNo));
    return [...customPk, ...baseFiltered];
  }, [customCraneJobs, phraKhanongCranes]);

  const mergedSrirachaCranes = useMemo(() => {
    const customSr = customCraneJobs
      .filter(j => j.plant === 'Sriracha')
      .map(mapJobToCraneMarker);
    const customJobNos = new Set(customSr.map(c => c.jobNo));
    const baseFiltered = srirachaCranes.filter(c => !customJobNos.has(c.jobNo));
    return [...customSr, ...baseFiltered];
  }, [customCraneJobs, srirachaCranes]);

  // Active dataset based on selected plant
  const currentPlantCranes = useMemo(() => {
    return selectedPlant === 'Sriracha' ? mergedSrirachaCranes : mergedPhraKhanongCranes;
  }, [selectedPlant, mergedSrirachaCranes, mergedPhraKhanongCranes]);

  // Filtered cranes based on status filter
  const displayedCranes = useMemo(() => {
    return currentPlantCranes.filter(crane => {
      if (statusFilter === 'active') return crane.status === 'In Progress';
      if (statusFilter === 'approved') return crane.status === 'Pending Approval' || crane.status === 'Completed';
      if (statusFilter === 'heavy') return crane.isHeavyLift;
      return true;
    });
  }, [currentPlantCranes, statusFilter]);

  // Auto-focus crane job from Cross-function navigation context
  useEffect(() => {
    const nav = getActiveCraneNavContext();
    if (!nav) return;

    if (nav.plant && nav.plant !== selectedPlant) {
      setSelectedPlant(nav.plant);
    }

    if (nav.jobId && currentPlantCranes.length > 0) {
      const targetId = String(nav.jobId);
      const match = currentPlantCranes.find(c => c.id === targetId || c.jobNo === targetId || c.tag === targetId);
      if (match) {
        setSelectedCrane(match);
        setZoomLevel(125);
        setPanOffset({
          x: -(match.x - 50) * 8,
          y: -(match.y - 50) * 8
        });
        clearActiveCraneNavContext();
      }
    }
  }, [currentPlantCranes, selectedPlant]);

  // Statistics for Quick Badges
  const stats = useMemo(() => {
    const total = currentPlantCranes.length;
    const active = currentPlantCranes.filter(c => c.status === 'In Progress').length;
    const approved = currentPlantCranes.filter(c => c.status === 'Pending Approval' || c.status === 'Completed').length;
    const heavy = currentPlantCranes.filter(c => c.isHeavyLift).length;
    return { total, active, approved, heavy };
  }, [currentPlantCranes]);

  // Active Zones
  const activeZones = selectedPlant === 'Phra Khanong' ? PHRA_KHANONG_ZONES : SRIRACHA_ZONES;

  // Active Jobs
  const plantJobs = useMemo(() => {
    return turnoverJobs.filter(j => j.plant === selectedPlant);
  }, [turnoverJobs, selectedPlant]);

  // Pan boundary clamp to prevent black borders on zoom-out and panning
  const clampPan = (x: number, y: number, zoom: number) => {
    const scale = zoom / 100;
    if (scale <= 1) return { x: 0, y: 0 };
    const rect = canvasContainerRef.current?.getBoundingClientRect();
    const w = rect ? rect.width / scale : 1000;
    const h = rect ? rect.height / scale : 620;
    const maxPanX = Math.max(0, ((scale - 1) * w) / 2);
    const maxPanY = Math.max(0, ((scale - 1) * h) / 2);
    return {
      x: Math.max(-maxPanX, Math.min(maxPanX, x)),
      y: Math.max(-maxPanY, Math.min(maxPanY, y))
    };
  };

  const handleZoomChange = (newZoom: number) => {
    const clampedZoom = Math.max(50, Math.min(300, newZoom));
    setZoomLevel(clampedZoom);
    setPanOffset(prev => clampPan(prev.x, prev.y, clampedZoom));
  };

  // Pan & Zoom Handlers
  const handleMouseDown = (e: ReactMouseEvent) => {
    if (isPinningModeActive || zoomLevel < 100) return;
    setIsPanning(true);
    setPanStart({ x: e.clientX - panOffset.x, y: e.clientY - panOffset.y });
  };

  const handleMouseMove = (e: ReactMouseEvent) => {
    if (!isPanning) return;
    const rawX = e.clientX - panStart.x;
    const rawY = e.clientY - panStart.y;
    setPanOffset(clampPan(rawX, rawY, zoomLevel));
  };

  const handleMouseUp = () => setIsPanning(false);

  const handleTouchStart = (e: ReactTouchEvent) => {
    if (isPinningModeActive || e.touches.length !== 1 || zoomLevel < 100) return;
    setIsPanning(true);
    setPanStart({ x: e.touches[0].clientX - panOffset.x, y: e.touches[0].clientY - panOffset.y });
  };

  const handleTouchMove = (e: ReactTouchEvent) => {
    if (!isPanning || e.touches.length !== 1) return;
    const rawX = e.touches[0].clientX - panStart.x;
    const rawY = e.touches[0].clientY - panStart.y;
    setPanOffset(clampPan(rawX, rawY, zoomLevel));
  };

  const handleTouchEnd = () => setIsPanning(false);

  // Mouse wheel zoom supporting 50% to 300%
  const handleWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (e.deltaY < 0) {
      handleZoomChange(zoomLevel + 25);
    } else {
      handleZoomChange(zoomLevel - 25);
    }
  };

  const handleResetView = () => {
    setZoomLevel(100);
    setPanOffset({ x: 0, y: 0 });
    setHighlightedZoneId(null);
  };

  const handleJumpToZone = (zone: ZoneDefinition) => {
    setHighlightedZoneId(zone.id);
    const targetZoom = Math.max(100, zone.center.zoom);
    setZoomLevel(targetZoom);
    setPanOffset(clampPan((50 - zone.center.x) * 4, (50 - zone.center.y) * 4, targetZoom));
  };

  const handleCanvasClick = (e: ReactMouseEvent<HTMLDivElement>) => {
    if (!isPinningModeActive) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = ((e.clientX - rect.left) / rect.width) * 100;
    const clickY = ((e.clientY - rect.top) / rect.height) * 100;

    const clampedX = Math.max(5, Math.min(95, parseFloat(clickX.toFixed(1))));
    const clampedY = Math.max(5, Math.min(95, parseFloat(clickY.toFixed(1))));

    const nextNumber = currentPlantCranes.length + 1;
    setCandidatePin({
      x: clampedX,
      y: clampedY,
      tag: `CR-${String(nextNumber).padStart(2, '0')}`,
      capacity: '100T',
      type: 'spot',
      safetyRadius: 25,
      title: 'New Turnaround Lifting Operation Permit',
      contractor: 'Authorized Crane Specialist Co., Ltd.'
    });
  };

  const handleSaveCandidatePin = () => {
    if (!candidatePin) return;
    const gridLetter = String.fromCharCode(65 + Math.floor((candidatePin.x / 100) * 6));
    const gridNum = Math.floor((candidatePin.y / 100) * 8) + 1;
    const capNum = parseInt(candidatePin.capacity) || 50;

    const newMarker: CraneMarker = {
      id: `cr-${Date.now()}`,
      tag: candidatePin.tag,
      capacity: candidatePin.capacity,
      capacityNum: capNum,
      type: candidatePin.type,
      safetyRadius: candidatePin.safetyRadius,
      status: 'Pending Approval',
      isHeavyLift: capNum >= 100,
      jobNo: `CR01-${selectedPlant === 'Sriracha' ? 'SR' : 'PK'}-${Date.now().toString().slice(-4)}`,
      title: candidatePin.title,
      contractor: candidatePin.contractor,
      plant: selectedPlant,
      areaName: candidatePin.x < 50 ? (candidatePin.y < 50 ? 'พื้นที่ 01 / โซน 01' : 'พื้นที่ 03 / โซน 03') : (candidatePin.y < 50 ? 'พื้นที่ 02 / โซน 02' : 'พื้นที่ 04 / โซน 04'),
      gridZone: `${gridLetter}${gridNum}`,
      x: candidatePin.x,
      y: candidatePin.y,
      scheduledDate: new Date().toISOString().split('T')[0],
      shift: 'Day Shift (08:00 - 17:00)',
      boomLength: '42.0 m',
      windLimit: '12 m/s',
      riggerLead: 'Certified Rigging Specialist',
      groundPressureKPa: Math.round(capNum * 1.5),
      outriggerMatSize: capNum >= 100 ? '2.5m x 2.5m Steel' : '1.8m x 1.8m Pad',
      ptwNo: `PTW-${Date.now().toString().slice(-6)}`,
      phorJor2Cert: `PJ2-${Date.now().toString().slice(-4)}-PENDING`
    };

    if (selectedPlant === 'Sriracha') {
      setSrirachaCranes(prev => [newMarker, ...prev]);
    } else {
      setPhraKhanongCranes(prev => [newMarker, ...prev]);
    }

    setIsPinningModeActive(false);
    setCandidatePin(null);
    setSelectedCrane(newMarker);
  };

  const handleOpenCraneDossier = (crane: CraneMarker) => {
    setDossierModalJob({
      id: crane.id,
      craneType: crane.type === 'pull' ? 'Crane Pull (Horizontal)' : 'Crane Spot (Vertical)',
      type: `${crane.capacity} Mobile Crane`,
      area: `${crane.areaName} [Grid ${crane.gridZone}]`,
      description: crane.title,
      contractor: crane.contractor,
      date: crane.scheduledDate,
      time: crane.shift,
      plant: crane.plant
    });
    setIsDossierModalOpen(true);
  };

  const isDarkMode = blueprintTheme === 'dark';

  return (
    <div className="w-full space-y-3.5 animate-in fade-in duration-300 pb-12 select-none">
      
      {/* =========================================================================
          1. HEADER CONTROL DECK (Sleek Glassmorphism & Fast Toggles)
         ========================================================================= */}
      <div className={`p-3.5 sm:p-5 rounded-3xl border transition-all ${
        isDarkMode 
          ? 'bg-slate-900/95 border-slate-800 text-white shadow-xl shadow-cyan-950/20' 
          : 'bg-white/95 border-slate-200/90 text-slate-900 shadow-sm'
      }`}>
        <div className="flex flex-col gap-3">
          
          {/* Row 1: Title & Plant Switcher */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
            <div className="space-y-0.5">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="p-1.5 sm:p-2 rounded-xl bg-blue-600 text-white shadow-md shadow-blue-500/30 flex items-center justify-center shrink-0">
                  <Compass size={16} className="animate-spin" style={{ animationDuration: '18s' }} />
                </span>
                <h1 className="text-sm sm:text-lg font-black tracking-tight flex items-center gap-1.5 flex-wrap">
                  <span>{isTh ? 'ผัง CAD จุดตั้งเครน & ขอบเขตกั้นเขตความปลอดภัย' : 'CAD Plot Plan: Crane Setup & Safety'}</span>
                  <span className="px-2 py-0.5 rounded-full text-[9px] font-mono font-bold tracking-wider bg-blue-500/15 text-blue-600 dark:text-blue-400 border border-blue-500/30">
                    CR01 SPATIAL
                  </span>
                </h1>
              </div>
              <p className={`text-[11px] sm:text-xs line-clamp-1 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                {isTh
                  ? `พิกัดจอดเครน รัศมีสวิง 360° ขาช้าง และพื้นที่เสี่ยง Bangchak ${selectedPlant}`
                  : `Spatial crane positions, 360° swing perimeters & outrigger footprints.`}
              </p>
            </div>

            {/* Operating Plant Switcher (Compact & Clean) */}
            <div className={`inline-flex p-0.5 rounded-xl border shrink-0 self-start sm:self-auto ${
              isDarkMode ? 'bg-slate-950/80 border-slate-800' : 'bg-slate-100 border-slate-200'
            }`}>
              <button
                type="button"
                onClick={() => {
                  setSelectedPlant('Phra Khanong');
                  setSelectedCrane(null);
                  handleResetView();
                }}
                className={`h-7 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  selectedPlant === 'Phra Khanong'
                    ? 'bg-[#008b52] text-white shadow-xs'
                    : isDarkMode ? 'text-slate-400 hover:text-white' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Building2 size={12} />
                <span>{isTh ? 'พระโขนง' : 'Phra Khanong'}</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setSelectedPlant('Sriracha');
                  setSelectedCrane(null);
                  handleResetView();
                }}
                className={`h-7 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  selectedPlant === 'Sriracha'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : isDarkMode ? 'text-slate-400 hover:text-white' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Factory size={12} />
                <span>{isTh ? 'ศรีราชา' : 'Sriracha'}</span>
              </button>
            </div>
          </div>

          {/* Row 2: Secondary Tool Controls (Horizontal Swipeable / Never Wraps awkwardly) */}
          <div className="flex items-center gap-2 overflow-x-auto pb-0.5 custom-scrollbar flex-nowrap w-full">
            
            {/* Outrigger Toggle */}
            <button
              type="button"
              onClick={() => setShowOutriggers(!showOutriggers)}
              className={`h-7.5 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 border shrink-0 shadow-2xs ${
                showOutriggers
                  ? 'bg-amber-600 hover:bg-amber-500 text-white border-amber-500 shadow-amber-900/20'
                  : isDarkMode
                  ? 'bg-slate-800/80 text-slate-400 border-slate-700 hover:text-white'
                  : 'bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200'
              }`}
            >
              <div className="w-2 h-2 rounded-xs border border-white bg-amber-400" />
              <span>{isTh ? 'ขาช้าง (Outrigger)' : 'Outrigger'}</span>
            </button>

            {/* Theme Toggle */}
            <button
              type="button"
              onClick={() => {
                const nextIsDark = blueprintTheme !== 'dark';
                setBlueprintTheme(nextIsDark ? 'dark' : 'paper');
                setGlobalThemeGate(nextIsDark);
              }}
              className={`h-7.5 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 border shrink-0 shadow-2xs ${
                isDarkMode
                  ? 'bg-slate-800 text-cyan-300 border-cyan-500/40 hover:bg-slate-700'
                  : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
              }`}
            >
              {isDarkMode ? (
                <>
                  <Moon size={12} className="text-cyan-400" />
                  <span>Dark Blueprint</span>
                </>
              ) : (
                <>
                  <Sun size={12} className="text-amber-500" />
                  <span>Paper CAD</span>
                </>
              )}
            </button>

            {/* Zoom Controls with 50%, 75%, 100%, 150%, 200% Presets */}
            <div className={`inline-flex items-center h-7.5 px-1.5 rounded-xl border shrink-0 ${
              isDarkMode ? 'bg-slate-950/80 border-slate-800' : 'bg-slate-100 border-slate-200'
            }`}>
              {/* Presets Bar */}
              <div className="hidden sm:flex items-center border-r border-slate-700/50 pr-1 mr-1">
                {[50, 75, 100, 150, 200].map((preset) => {
                  const isCurrent = Math.abs(zoomLevel - preset) < 8;
                  return (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => handleZoomChange(preset)}
                      className={`px-1.5 py-0.5 text-[10px] font-mono font-bold transition-colors cursor-pointer rounded ${
                        isCurrent
                          ? (isDarkMode ? 'bg-cyan-500/20 text-cyan-300' : 'bg-blue-100 text-blue-700')
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                      title={`Zoom to ${preset}%`}
                    >
                      {preset}%
                    </button>
                  );
                })}
              </div>

              <button
                type="button"
                onClick={() => handleZoomChange(zoomLevel - 25)}
                className="p-1 hover:text-blue-500 transition-colors cursor-pointer"
                title="Zoom Out (ขยายออก)"
              >
                <ZoomOut size={13} />
              </button>
              <span className="text-[10px] font-mono font-bold px-1.5 text-blue-600 dark:text-cyan-400 min-w-[38px] text-center">
                {zoomLevel}%
              </span>
              <button
                type="button"
                onClick={() => handleZoomChange(zoomLevel + 25)}
                className="p-1 hover:text-blue-500 transition-colors cursor-pointer"
                title="Zoom In (ซูมเข้า)"
              >
                <ZoomIn size={13} />
              </button>
            </div>

            {/* Fit View button - locks to 100% borderless */}
            <button
              type="button"
              onClick={handleResetView}
              className={`h-7.5 px-2.5 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                isDarkMode ? 'bg-slate-900 border-slate-700 text-slate-300 hover:bg-slate-800' : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
              }`}
              title="Lock Plot Plan to Screen (ล็อคขนาดตามรูปไม่มีขอบดำ)"
            >
              Fit
            </button>

            {/* Pin New Crane CTA */}
            <button
              type="button"
              onClick={() => {
                setIsPinningModeActive(!isPinningModeActive);
                setCandidatePin(null);
              }}
              className={`h-7.5 px-3 rounded-xl text-xs font-extrabold transition-all cursor-pointer flex items-center gap-1.5 shadow-sm active:scale-95 shrink-0 ml-auto ${
                isPinningModeActive
                  ? 'bg-amber-500 text-slate-950 ring-2 ring-amber-300 animate-pulse'
                  : 'bg-indigo-600 hover:bg-indigo-500 text-white'
              }`}
            >
              <Crosshair size={13} />
              <span>{isPinningModeActive ? (isTh ? 'คลิกบนผัง' : 'Click Map') : (isTh ? '+ ขอจุดตั้ง' : '+ Request')}</span>
            </button>

          </div>
        </div>
      </div>

      {/* =========================================================================
          2. FILTER STATUS BAR & METRIC PILLS
         ========================================================================= */}
      <div className={`p-2 sm:p-2.5 rounded-2xl border flex items-center justify-between gap-2.5 text-xs ${
        isDarkMode 
          ? 'bg-slate-900/80 border-slate-800' 
          : 'bg-white border-slate-200/90 shadow-2xs'
      }`}>
        
        {/* Status Filter Chips (Horizontal Swipeable Carousel - NEVER WRAPS) */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 custom-scrollbar flex-nowrap min-w-0 flex-1">
          <div className="hidden sm:flex items-center gap-1 text-slate-400 font-bold text-[10px] mr-1 shrink-0">
            <Sliders size={12} />
            <span>{isTh ? 'กรอง:' : 'Filter:'}</span>
          </div>

          {/* All */}
          <button
            type="button"
            onClick={() => setStatusFilter('all')}
            className={`h-6.5 px-2.5 rounded-lg font-bold text-[11px] transition-all cursor-pointer flex items-center gap-1 shrink-0 ${
              statusFilter === 'all'
                ? 'bg-blue-600 text-white shadow-xs'
                : isDarkMode ? 'bg-slate-800/80 text-slate-300 hover:bg-slate-700' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            <span>{isTh ? 'ทั้งหมด' : 'All'}</span>
            <span className="font-mono text-[10px] opacity-90 font-black">({stats.total})</span>
          </button>

          {/* Active */}
          <button
            type="button"
            onClick={() => setStatusFilter('active')}
            className={`h-6.5 px-2.5 rounded-lg font-bold text-[11px] transition-all cursor-pointer flex items-center gap-1 border shrink-0 ${
              statusFilter === 'active'
                ? 'bg-emerald-600 text-white border-emerald-500 shadow-xs'
                : isDarkMode ? 'bg-emerald-950/30 text-emerald-300 border-emerald-800/40' : 'bg-emerald-50 text-emerald-700 border-emerald-200'
            }`}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping shrink-0" />
            <span>{isTh ? 'ขึ้นงาน' : 'Active'}</span>
            <span className="font-mono text-[10px] font-black">({stats.active})</span>
          </button>

          {/* Approved */}
          <button
            type="button"
            onClick={() => setStatusFilter('approved')}
            className={`h-6.5 px-2.5 rounded-lg font-bold text-[11px] transition-all cursor-pointer flex items-center gap-1 border shrink-0 ${
              statusFilter === 'approved'
                ? 'bg-cyan-600 text-white border-cyan-500 shadow-xs'
                : isDarkMode ? 'bg-cyan-950/30 text-cyan-300 border-cyan-800/40' : 'bg-cyan-50 text-cyan-700 border-cyan-200'
            }`}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 shrink-0" />
            <span>{isTh ? 'อนุมัติ' : 'Approved'}</span>
            <span className="font-mono text-[10px] font-black">({stats.approved})</span>
          </button>

          {/* Heavy Lift */}
          <button
            type="button"
            onClick={() => setStatusFilter('heavy')}
            className={`h-6.5 px-2.5 rounded-lg font-bold text-[11px] transition-all cursor-pointer flex items-center gap-1 border shrink-0 ${
              statusFilter === 'heavy'
                ? 'bg-rose-600 text-white border-rose-500 shadow-xs'
                : isDarkMode ? 'bg-rose-950/30 text-rose-300 border-rose-800/40' : 'bg-rose-50 text-rose-700 border-rose-200'
            }`}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-rose-500 shrink-0" />
            <span>{isTh ? 'ยกหนัก 100T+' : '100T+'}</span>
            <span className="font-mono text-[10px] font-black">({stats.heavy})</span>
          </button>
        </div>

        {/* Counter & Reset */}
        <div className="flex items-center gap-2 shrink-0">
          <span className={`text-[11px] font-mono font-bold whitespace-nowrap ${isDarkMode ? 'text-slate-300' : 'text-slate-600'}`}>
            <strong className="text-blue-600 dark:text-cyan-400 font-extrabold">{displayedCranes.length}</strong> {isTh ? 'จุด' : 'spots'}
          </span>
          <button
            type="button"
            onClick={handleResetView}
            className={`p-1 rounded-lg text-slate-400 hover:text-white transition-colors cursor-pointer ${
              isDarkMode ? 'hover:bg-slate-800' : 'hover:bg-slate-100'
            }`}
            title="Reset Pan & Zoom"
          >
            <RotateCcw size={13} />
          </button>
        </div>

      </div>

      {/* =========================================================================
          3. MAIN CAD BLUEPRINT CANVAS ENGINE (Interactive Vector CAD Map)
         ========================================================================= */}
      <div 
        ref={canvasContainerRef}
        onWheel={handleWheel}
        className={`relative rounded-3xl border-2 overflow-hidden shadow-2xl transition-colors duration-300 h-[400px] sm:h-[500px] lg:h-[620px] ${
          isDarkMode 
            ? 'bg-[#070d1e] border-slate-800 shadow-cyan-950/20' 
            : 'bg-[#f4f7fb] border-slate-300 shadow-slate-300/40'
        }`}
      >
        
        {/* Floating North Compass Indicator */}
        <div className="absolute top-3 left-3 sm:top-4 sm:left-4 z-30 flex items-center gap-1.5 sm:gap-2 bg-slate-900/90 text-white backdrop-blur-md px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-xl sm:rounded-2xl border border-slate-700/80 text-[10px] sm:text-xs font-mono shadow-lg">
          <Compass size={14} className="text-amber-400 animate-spin" style={{ animationDuration: '24s' }} />
          <span className="font-black tracking-wider">NORTH ▲</span>
          <span className="text-slate-400 hidden sm:inline">| CAD 1:500</span>
        </div>

        {/* Floating Bottom Left Badge */}
        <div className="absolute bottom-3 left-3 sm:bottom-4 sm:left-4 z-30 px-2.5 sm:px-3.5 py-1 sm:py-1.5 rounded-xl sm:rounded-2xl bg-slate-900/90 text-white backdrop-blur-md border border-slate-700/80 text-[10px] sm:text-[11px] font-mono shadow-lg flex items-center gap-1.5 sm:gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          <span className="font-bold">{selectedPlant} GIS</span>
          <span className="text-slate-400">· {displayedCranes.length} Spots</span>
        </div>

        {/* Floating Top Right Legend (Hidden on small mobile screen to prevent covering the map) */}
        <div className="hidden sm:block absolute top-4 right-4 z-30 p-2.5 rounded-2xl bg-slate-900/90 text-white backdrop-blur-md border border-slate-700/80 text-[10px] shadow-xl space-y-1.5 max-w-[190px]">
          <div className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400 border-b border-slate-800 pb-1 flex items-center justify-between">
            <span>LEGEND & HAZARDS</span>
            <ShieldCheck size={12} className="text-emerald-400" />
          </div>
          <div className="space-y-1.5 text-[10px]">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
              <span>กำลังขึ้นงาน (Active Lift)</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
              <span>ยกหนัก Heavy Lift (100T+)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-xs border border-amber-400 bg-amber-500" />
              <span>แผ่นเหล็ก Outrigger (4 จุด)</span>
            </div>
          </div>
        </div>

        {/* Pinning Active Alert Banner */}
        {isPinningModeActive && (
          <div className="absolute top-16 left-1/2 -translate-x-1/2 z-30 px-4 py-2 rounded-2xl bg-amber-500 text-slate-950 font-black text-xs flex items-center gap-2 shadow-2xl animate-bounce border-2 border-white">
            <Crosshair size={16} />
            <span>{isTh ? 'โหมดปักตำแหน่งเครน: คลิกลงบนผังเพื่อกำหนดจุดตั้ง' : 'Crane Pinning Active: Click on blueprint to place crane'}</span>
          </div>
        )}

        {/* The Scalable & Pannable Vector Blueprint Canvas */}
        <div
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          onClick={handleCanvasClick}
          className={`w-full h-full relative cursor-grab active:cursor-grabbing ${
            isPinningModeActive ? 'cursor-crosshair' : ''
          }`}
          style={{
            transform: `translate(${panOffset.x}px, ${panOffset.y}px) scale(${zoomLevel / 100})`,
            transformOrigin: 'center center',
            transition: isPanning ? 'none' : 'transform 0.15s ease-out'
          }}
        >
          {/* =========================================================================
              LAYER 0: AUTHENTIC MASTER PLOT PLAN ENGINEERING DRAWING BACKGROUND
             ========================================================================= */}
          <div className="absolute inset-0 pointer-events-none select-none overflow-hidden flex items-center justify-center">
            <img 
              src={essoPlotPlanBg} 
              alt="Master Plot Plan Esso Sriracha Refinery" 
              className={`w-full h-full object-cover transition-all duration-300 pointer-events-none select-none ${
                isDarkMode 
                  ? 'filter invert hue-rotate-180 brightness-[0.78] contrast-[1.25] opacity-60' 
                  : 'opacity-85 mix-blend-multiply'
              }`}
            />
          </div>

          {/* =========================================================================
              LAYER 0.5: VECTOR CAD BLUEPRINT OVERLAY
             ========================================================================= */}
          <svg className="absolute inset-0 w-full h-full pointer-events-none" xmlns="http://www.w3.org/2000/svg">
            <defs>
              {/* Subtle Grid Pattern */}
              <pattern id="cadGridSmall" width="20" height="20" patternUnits="userSpaceOnUse">
                <path 
                  d="M 20 0 L 0 0 0 20" 
                  fill="none" 
                  stroke={isDarkMode ? 'rgba(56, 189, 248, 0.07)' : 'rgba(100, 116, 139, 0.12)'} 
                  strokeWidth="0.8" 
                />
              </pattern>
              <pattern id="cadGridLarge" width="100" height="100" patternUnits="userSpaceOnUse">
                <rect width="100" height="100" fill="url(#cadGridSmall)" />
                <path 
                  d="M 100 0 L 0 0 0 100" 
                  fill="none" 
                  stroke={isDarkMode ? 'rgba(56, 189, 248, 0.18)' : 'rgba(100, 116, 139, 0.25)'} 
                  strokeWidth="1.2" 
                />
              </pattern>

              {/* Radar Glow Radial Gradient */}
              <radialGradient id="radarGlowActive" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="#10b981" stopOpacity="0.35" />
                <stop offset="70%" stopColor="#10b981" stopOpacity="0.12" />
                <stop offset="100%" stopColor="#10b981" stopOpacity="0" />
              </radialGradient>

              <radialGradient id="radarGlowHeavy" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="#f43f5e" stopOpacity="0.38" />
                <stop offset="70%" stopColor="#f43f5e" stopOpacity="0.15" />
                <stop offset="100%" stopColor="#f43f5e" stopOpacity="0" />
              </radialGradient>

              <radialGradient id="radarGlowNormal" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="#0284c7" stopOpacity="0.30" />
                <stop offset="70%" stopColor="#0284c7" stopOpacity="0.10" />
                <stop offset="100%" stopColor="#0284c7" stopOpacity="0" />
              </radialGradient>
            </defs>

            {/* Background Grid */}
            <rect width="100%" height="100%" fill="url(#cadGridLarge)" />

            {/* Outer CAD Border & Sheet Border */}
            <rect 
              x="20" y="20" width="calc(100% - 40px)" height="calc(100% - 40px)" 
              fill="none" 
              stroke={isDarkMode ? '#38bdf8' : '#334155'} 
              strokeWidth="2" 
              strokeOpacity={isDarkMode ? '0.4' : '0.6'}
            />

            {/* Coastal Waters / River Edge (Gulf of Thailand / Chao Phraya) */}
            <path 
              d={selectedPlant === 'Sriracha' 
                ? "M 20 20 L 140 20 C 140 200, 100 400, 120 700 L 20 700 Z"
                : "M 20 20 L 160 20 C 180 250, 140 450, 170 700 L 20 700 Z"
              }
              fill={isDarkMode ? "rgba(14, 165, 233, 0.05)" : "rgba(224, 242, 254, 0.6)"}
              stroke={isDarkMode ? "rgba(56, 189, 248, 0.3)" : "rgba(2, 132, 199, 0.4)"}
              strokeDasharray="4 4"
            />
            <text 
              x="45" y="360" 
              fill={isDarkMode ? '#38bdf8' : '#0369a1'} 
              fontSize="12" 
              fontFamily="monospace" 
              fontWeight="bold"
              letterSpacing="2"
              transform="rotate(-90 45 360)"
              opacity="0.6"
            >
              {selectedPlant === 'Sriracha' ? 'GULF OF THAILAND • COASTAL JETTY CORRIDOR' : 'CHAO PHRAYA RIVER • MARINE JETTY'}
            </text>

            {/* Main Battery Limit (Plant Boundary Rectangle) */}
            <rect 
              x="30%" y="16%" width="58%" height="70%" 
              rx="24"
              fill={isDarkMode ? "rgba(30, 41, 59, 0.3)" : "rgba(255, 255, 255, 0.5)"} 
              stroke={isDarkMode ? "#0ea5e9" : "#2563eb"} 
              strokeWidth="2.5" 
              strokeDasharray="8 4"
              strokeOpacity="0.5"
            />
            <text 
              x="32%" y="19%" 
              fill={isDarkMode ? '#38bdf8' : '#1e40af'} 
              fontSize="10" 
              fontFamily="monospace" 
              fontWeight="bold"
              letterSpacing="1.5"
              opacity="0.8"
            >
              MAIN PROCESS BATTERY LIMIT (ISBL / OSBL)
            </text>

            {/* Major Process Units & Equipment Footprints in CAD Style */}
            {/* 1. Large Storage Tanks (Spheres & Floating Roofs) */}
            <circle cx="68%" cy="26%" r="35" fill="none" stroke={isDarkMode ? '#38bdf8' : '#475569'} strokeWidth="1.5" opacity="0.6" />
            <circle cx="78%" cy="26%" r="35" fill="none" stroke={isDarkMode ? '#38bdf8' : '#475569'} strokeWidth="1.5" opacity="0.6" />
            <text x="68%" y="26%" textAnchor="middle" dominantBaseline="middle" fill={isDarkMode ? '#94a3b8' : '#64748b'} fontSize="9" fontFamily="monospace">TK-3807</text>
            <text x="78%" y="26%" textAnchor="middle" dominantBaseline="middle" fill={isDarkMode ? '#94a3b8' : '#64748b'} fontSize="9" fontFamily="monospace">TK-3808</text>

            {/* LPG Spheres in row */}
            <circle cx="20%" cy="30%" r="20" fill="none" stroke={isDarkMode ? '#38bdf8' : '#475569'} strokeWidth="1.5" opacity="0.5" />
            <circle cx="25%" cy="30%" r="20" fill="none" stroke={isDarkMode ? '#38bdf8' : '#475569'} strokeWidth="1.5" opacity="0.5" />
            <circle cx="20%" cy="37%" r="20" fill="none" stroke={isDarkMode ? '#38bdf8' : '#475569'} strokeWidth="1.5" opacity="0.5" />
            <circle cx="25%" cy="37%" r="20" fill="none" stroke={isDarkMode ? '#38bdf8' : '#475569'} strokeWidth="1.5" opacity="0.5" />
            <text x="22.5%" y="43%" textAnchor="middle" fill={isDarkMode ? '#94a3b8' : '#64748b'} fontSize="8" fontFamily="monospace">LPG SPHERES</text>

            {/* Pipe Rack Highways */}
            <line x1="32%" y1="56%" x2="86%" y2="56%" stroke={isDarkMode ? '#38bdf8' : '#64748b'} strokeWidth="2" strokeDasharray="3 3" opacity="0.5" />
            <text x="34%" y="54.5%" fill={isDarkMode ? '#94a3b8' : '#64748b'} fontSize="8" fontFamily="monospace">MAIN PIPEWAY 104-PW (H2 / HIGH PRESSURE HEADERS)</text>

            {/* Major Roadways */}
            <path d="M 88% 18% L 94% 88%" stroke={isDarkMode ? '#38bdf8' : '#94a3b8'} strokeWidth="6" strokeOpacity="0.2" fill="none" />
            <text x="91%" y="50%" fill={isDarkMode ? '#38bdf8' : '#475569'} fontSize="9" fontFamily="monospace" fontWeight="bold" transform="rotate(84 91 50)">
              TO SUKHUMVIT ROAD &gt;&gt;
            </text>
          </svg>

          {/* =========================================================================
              LAYER 1: CRANE 360° BOOM SWING RADIUS (RADAR / BARRICADE ZONES)
             ========================================================================= */}
          {showSafetyRadius && displayedCranes.map(crane => {
            const isHovered = hoveredCraneId === crane.id;
            const isSelected = selectedCrane?.id === crane.id;
            const isFocused = isHovered || isSelected;
            const hasFocusCrane = !!hoveredCraneId || !!selectedCrane;
            
            // Opacity handling: Dim non-focused cranes when user hovers or selects one
            const opacity = hasFocusCrane ? (isFocused ? 1 : 0.18) : 0.85;

            // Pixel Radius calculation on canvas (meter scale)
            const rPx = crane.safetyRadius * 3.4;

            // Colors based on status & heavy lift
            const strokeColor = crane.isHeavyLift 
              ? '#f43f5e' 
              : crane.status === 'In Progress' 
              ? '#10b981' 
              : '#0284c7';
            
            const gradientId = crane.isHeavyLift 
              ? 'url(#radarGlowHeavy)' 
              : crane.status === 'In Progress' 
              ? 'url(#radarGlowActive)' 
              : 'url(#radarGlowNormal)';

            return (
              <div
                key={`radius-${crane.id}`}
                style={{
                  left: `${crane.x}%`,
                  top: `${crane.y}%`,
                  width: `${rPx * 2}px`,
                  height: `${rPx * 2}px`,
                  opacity,
                  transition: 'opacity 0.25s ease, transform 0.25s ease'
                }}
                className="absolute -translate-x-1/2 -translate-y-1/2 rounded-full pointer-events-none z-10 flex items-center justify-center"
              >
                {/* Radial Gradient Radar Fill */}
                <div 
                  className="w-full h-full rounded-full transition-all"
                  style={{
                    background: crane.isHeavyLift 
                      ? 'radial-gradient(circle, rgba(244,63,94,0.25) 0%, rgba(244,63,94,0.08) 70%, transparent 100%)'
                      : crane.status === 'In Progress'
                      ? 'radial-gradient(circle, rgba(16,185,129,0.25) 0%, rgba(16,185,129,0.08) 70%, transparent 100%)'
                      : 'radial-gradient(circle, rgba(2,132,199,0.22) 0%, rgba(2,132,199,0.06) 70%, transparent 100%)'
                  }}
                />

                {/* Perimeter Dashed Safety Ring */}
                <div 
                  className={`absolute inset-0 rounded-full border-2 ${
                    isFocused ? 'ring-4 ring-white/50 border-solid animate-pulse' : 'border-dashed'
                  }`}
                  style={{ borderColor: strokeColor }}
                />

                {/* Animated Ping Ring for Active Lift Cranes */}
                {crane.status === 'In Progress' && (
                  <div 
                    className="absolute inset-0 rounded-full animate-ping opacity-25"
                    style={{ backgroundColor: strokeColor }}
                  />
                )}

                {/* Radius Distance Label */}
                <div 
                  className={`absolute -top-3.5 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded-full text-[9px] font-mono font-bold whitespace-nowrap shadow-md border ${
                    isFocused 
                      ? 'bg-white text-slate-950 border-slate-900 scale-110 z-20' 
                      : 'bg-slate-900/90 text-white border-slate-700'
                  }`}
                >
                  R = {crane.safetyRadius}m
                </div>
              </div>
            );
          })}

          {/* =========================================================================
              LAYER 1.5: CRANE FOOTPRINTS / SCALE BLOCKS (For jobs saved with Area/Both)
             ========================================================================= */}
          {showCraneLayer && displayedCranes.filter(c => c.isArea).map(crane => {
            const isHovered = hoveredCraneId === crane.id;
            const isSelected = selectedCrane?.id === crane.id;
            const isFocused = isHovered || isSelected;
            const hasFocusCrane = !!hoveredCraneId || !!selectedCrane;
            const opacity = hasFocusCrane ? (isFocused ? 1 : 0.35) : 0.9;
            const w = crane.width || (crane.capacityNum >= 100 ? 10 : 6);
            const h = crane.height || (crane.capacityNum >= 100 ? 12.5 : 8);
            const rot = crane.rotation || 0;

            return (
              <div
                key={`footprint-${crane.id}`}
                style={{
                  left: `${crane.x}%`,
                  top: `${crane.y}%`,
                  width: `${w * 1.5}%`,
                  height: `${h * 1.5}%`,
                  opacity,
                  transform: `translate(-50%, -50%) rotate(${rot}deg)`,
                  zIndex: isFocused ? 35 : 15
                }}
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedCrane(crane);
                  setSelectedJob(null);
                }}
                className={`absolute rounded-xl border-2 transition-all cursor-pointer select-none flex flex-col justify-between p-1 shadow-lg ${
                  crane.isHeavyLift
                    ? 'border-rose-500 bg-rose-500/20'
                    : crane.status === 'In Progress'
                    ? 'border-emerald-500 bg-emerald-500/20'
                    : 'border-amber-500 bg-amber-500/20'
                } ${isFocused ? 'ring-2 ring-white scale-105' : 'hover:ring-1 hover:ring-amber-300'}`}
              >
                {/* 4 Outrigger Corner Steel Mats */}
                <div className="absolute -top-1.5 -left-1.5 w-3 h-3 rounded-xs bg-amber-500 border border-amber-300 shadow-md flex items-center justify-center font-mono text-[5px] font-black text-slate-950" title="FL Outrigger Pad" />
                <div className="absolute -top-1.5 -right-1.5 w-3 h-3 rounded-xs bg-amber-500 border border-amber-300 shadow-md flex items-center justify-center font-mono text-[5px] font-black text-slate-950" title="FR Outrigger Pad" />
                <div className="absolute -bottom-1.5 -left-1.5 w-3 h-3 rounded-xs bg-amber-500 border border-amber-300 shadow-md flex items-center justify-center font-mono text-[5px] font-black text-slate-950" title="RL Outrigger Pad" />
                <div className="absolute -bottom-1.5 -right-1.5 w-3 h-3 rounded-xs bg-amber-500 border border-amber-300 shadow-md flex items-center justify-center font-mono text-[5px] font-black text-slate-950" title="RR Outrigger Pad" />

                {/* Boom Vector Arrow */}
                <div className="absolute -top-6 left-1/2 -translate-x-1/2 flex flex-col items-center pointer-events-none">
                  <div className="w-0 h-0 border-l-[4px] border-l-transparent border-r-[4px] border-r-transparent border-b-[6px] border-b-rose-500" />
                  <div className="w-0.5 h-2.5 bg-rose-500" />
                  <span className="text-[6.5px] font-mono font-bold px-1 bg-slate-950 text-rose-300 rounded whitespace-nowrap">
                    {rot}°
                  </span>
                </div>

                {/* Center Badge */}
                <div className="text-center pointer-events-none my-auto select-none overflow-hidden">
                  <div className="text-[8px] font-bold font-mono text-white drop-shadow-sm truncate">
                    {w}m × {h}m
                  </div>
                  <div className="text-[7px] font-mono text-amber-200 bg-black/60 px-1 py-0.2 rounded truncate">
                    {crane.tag}
                  </div>
                </div>
              </div>
            );
          })}

          {/* =========================================================================
              LAYER 2: OUTRIGGER FOOTPRINTS (ขาช้าง 4 จุด) & CRANE CABIN ICONS
             ========================================================================= */}
          {showCraneLayer && displayedCranes.filter(c => c.markingType !== 'area').map(crane => {
            const isHovered = hoveredCraneId === crane.id;
            const isSelected = selectedCrane?.id === crane.id;
            const isFocused = isHovered || isSelected;
            const hasFocusCrane = !!hoveredCraneId || !!selectedCrane;
            const opacity = hasFocusCrane ? (isFocused ? 1 : 0.35) : 1;

            const badgeBg = crane.isHeavyLift
              ? 'bg-rose-600 text-white border-rose-300'
              : crane.status === 'In Progress'
              ? 'bg-emerald-600 text-white border-emerald-300'
              : 'bg-blue-600 text-white border-blue-300';

            return (
              <div
                key={crane.id}
                style={{ left: `${crane.x}%`, top: `${crane.y}%`, opacity }}
                onMouseEnter={() => setHoveredCraneId(crane.id)}
                onMouseLeave={() => setHoveredCraneId(null)}
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedCrane(crane);
                  setSelectedJob(null);
                }}
                className={`absolute -translate-x-1/2 -translate-y-1/2 select-none cursor-pointer transition-transform ${
                  isFocused ? 'scale-125 z-40' : 'hover:scale-115 z-20'
                }`}
              >
                
                {/* 4 Outrigger Steel Pads (ขาช้าง 4 มุม) */}
                {showOutriggers && (
                  <div className="absolute -inset-3.5 pointer-events-none">
                    {/* Top-Left Outrigger Pad */}
                    <div 
                      className="absolute -top-1 -left-1 w-2.5 h-2.5 rounded-xs bg-amber-500 border border-amber-300 shadow-md flex items-center justify-center text-[6px] font-black text-slate-950 font-mono"
                      title="Outrigger Pad 1 (Front-Left)"
                    />
                    {/* Top-Right Outrigger Pad */}
                    <div 
                      className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-xs bg-amber-500 border border-amber-300 shadow-md flex items-center justify-center text-[6px] font-black text-slate-950 font-mono"
                      title="Outrigger Pad 2 (Front-Right)"
                    />
                    {/* Bottom-Left Outrigger Pad */}
                    <div 
                      className="absolute -bottom-1 -left-1 w-2.5 h-2.5 rounded-xs bg-amber-500 border border-amber-300 shadow-md flex items-center justify-center text-[6px] font-black text-slate-950 font-mono"
                      title="Outrigger Pad 3 (Rear-Left)"
                    />
                    {/* Bottom-Right Outrigger Pad */}
                    <div 
                      className="absolute -bottom-1 -right-1 w-2.5 h-2.5 rounded-xs bg-amber-500 border border-amber-300 shadow-md flex items-center justify-center text-[6px] font-black text-slate-950 font-mono"
                      title="Outrigger Pad 4 (Rear-Right)"
                    />
                  </div>
                )}

                {/* Crane Main Center Marker */}
                <div className="flex flex-col items-center">
                  <div className={`px-2 py-1 rounded-xl shadow-xl font-mono text-[10px] font-black flex items-center gap-1.5 border-2 backdrop-blur-xs ${badgeBg}`}>
                    <Truck size={12} className="shrink-0" />
                    <span>{crane.tag}</span>
                    <span className="bg-black/30 px-1 py-0.2 rounded text-[9px] font-mono">
                      {crane.capacity}
                    </span>
                    {crane.status === 'In Progress' && (
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-200 animate-ping" />
                    )}
                  </div>

                  {/* Outrigger Load Bearing Tooltip on Hover */}
                  {isFocused && (
                    <div className="mt-1 px-2 py-0.5 rounded-md bg-slate-950/95 text-cyan-300 border border-cyan-500/40 text-[9px] font-mono whitespace-nowrap shadow-lg flex items-center gap-1">
                      <Gauge size={10} className="text-amber-400" />
                      <span>{crane.groundPressureKPa} kPa</span>
                      <span className="text-slate-400">|</span>
                      <span>{(crane.outriggerMatSize || (crane.capacityNum >= 100 ? '2.5m x 2.5m' : '1.8m x 1.8m')).split(' ')[0]}</span>
                    </div>
                  )}
                </div>

              </div>
            );
          })}

          {/* Candidate Pin Placement Marker */}
          {candidatePin && (
            <div
              style={{ left: `${candidatePin.x}%`, top: `${candidatePin.y}%` }}
              className="absolute -translate-x-1/2 -translate-y-1/2 z-40 select-none animate-in zoom-in-75 duration-200"
            >
              <div
                style={{
                  width: `${candidatePin.safetyRadius * 6.8}px`,
                  height: `${candidatePin.safetyRadius * 6.8}px`
                }}
                className="absolute -translate-x-1/2 -translate-y-1/2 top-1/2 left-1/2 rounded-full border-2 border-dashed border-amber-400 bg-amber-500/20 pointer-events-none animate-pulse flex items-center justify-center"
              >
                <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 px-2 py-0.5 rounded-full bg-amber-500 text-slate-950 text-[9px] font-mono font-bold whitespace-nowrap shadow-lg">
                  R = {candidatePin.safetyRadius}m Barricade
                </div>
              </div>

              <div className="flex flex-col items-center">
                <div className="px-2.5 py-1 rounded-xl bg-amber-500 text-slate-950 font-mono text-xs font-black flex items-center gap-1.5 shadow-2xl border-2 border-white ring-4 ring-amber-400/40 animate-bounce">
                  <Crosshair size={14} />
                  <span>{candidatePin.tag} ({candidatePin.capacity})</span>
                </div>
              </div>
            </div>
          )}

        </div>

        {/* =========================================================================
            4. FLOATING TELEMETRY QUICK-CARD (SLIDE-OVER INSPECTION CARD)
           ========================================================================= */}
        {selectedCrane && (
          <div className={`absolute top-4 right-4 sm:w-[380px] z-50 p-5 rounded-3xl border shadow-2xl animate-in slide-in-from-right-4 duration-200 backdrop-blur-md space-y-4 ${
            isDarkMode 
              ? 'bg-slate-900/95 border-slate-700 text-white shadow-cyan-950/40' 
              : 'bg-white/95 border-slate-200 text-slate-900 shadow-xl'
          }`}>
            
            {/* Header Strip */}
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2.5">
                <div className={`p-2 rounded-2xl text-white shadow-md ${
                  selectedCrane.isHeavyLift ? 'bg-rose-600' : 'bg-blue-600'
                }`}>
                  <Truck size={20} />
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-mono font-bold text-blue-600 dark:text-cyan-400">{selectedCrane.tag}</span>
                    <span className={`px-2 py-0.2 rounded-full text-[9px] font-bold uppercase ${
                      selectedCrane.isHeavyLift ? 'bg-rose-500/20 text-rose-500' : 'bg-blue-500/20 text-blue-600 dark:text-blue-400'
                    }`}>
                      {selectedCrane.capacity} Rated
                    </span>
                  </div>
                  <h3 className="text-xs font-bold text-slate-900 dark:text-white mt-0.5 line-clamp-1">{selectedCrane.title}</h3>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedCrane(null)}
                className="p-1 rounded-xl text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Quick Metrics Grid */}
            <div className={`grid grid-cols-2 gap-2.5 p-3 rounded-2xl border text-xs font-mono ${
              isDarkMode ? 'bg-slate-950/60 border-slate-800' : 'bg-slate-50 border-slate-200'
            }`}>
              <div>
                <span className="text-[10px] text-slate-400 block font-sans">รัศมีสวิงบูม 360°:</span>
                <strong className="text-emerald-600 dark:text-emerald-400 text-sm font-black">{selectedCrane.safetyRadius} เมตร</strong>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 block font-sans">แรงกดพื้นดิน (Outrigger):</span>
                <strong className="text-amber-600 dark:text-amber-400 text-sm font-black">{selectedCrane.groundPressureKPa} kPa</strong>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 block font-sans">ความยาวบูม (Boom Length):</span>
                <span className="font-bold">{selectedCrane.boomLength}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 block font-sans">ขีดจำกัดแรงลม (Wind Limit):</span>
                <span className="font-bold">{selectedCrane.windLimit}</span>
              </div>
            </div>

            {/* Safety & Rigger Team Details */}
            <div className="space-y-1.5 text-xs">
              <div className="flex justify-between items-center text-slate-500 dark:text-slate-400">
                <span>แผ่นเหล็กรองขาช้าง:</span>
                <span className="font-mono font-bold text-slate-800 dark:text-slate-200">{selectedCrane.outriggerMatSize || (selectedCrane.capacityNum >= 100 ? '2.5m x 2.5m Heavy Steel' : '1.8m x 1.8m Steel Mat')}</span>
              </div>
              <div className="flex justify-between items-center text-slate-500 dark:text-slate-400">
                <span>ผู้รับเหมาเครน:</span>
                <span className="font-medium text-slate-800 dark:text-slate-200">{selectedCrane.contractor}</span>
              </div>
              <div className="flex justify-between items-center text-slate-500 dark:text-slate-400">
                <span>หัวหน้าผู้ควบคุมการยก:</span>
                <span className="font-medium text-slate-800 dark:text-slate-200">{selectedCrane.riggerLead}</span>
              </div>
            </div>

            {/* Verification Status Badges */}
            <div className="flex items-center gap-2 pt-1">
              <span className="flex-1 py-1 rounded-xl bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 text-[10px] font-mono font-bold flex items-center justify-center gap-1">
                <Check size={12} />
                <span>ปจ.2 ผ่านตรวจ</span>
              </span>
              <span className="flex-1 py-1 rounded-xl bg-blue-500/15 text-blue-700 dark:text-blue-300 border border-blue-500/30 text-[10px] font-mono font-bold flex items-center justify-center gap-1">
                <FileCheck size={12} />
                <span>PTW อนุมัติ</span>
              </span>
            </div>

            {/* Action Button: Open Official Dossier */}
            <button
              type="button"
              onClick={() => handleOpenCraneDossier(selectedCrane)}
              className="w-full py-2.5 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-all shadow-lg shadow-indigo-600/30 flex items-center justify-center gap-1.5 cursor-pointer active:scale-95"
            >
              <ExternalLink size={14} />
              <span>เปิดใบอนุญาต CR01 Permit Dossier</span>
            </button>

            {/* Cross-function Linking Actions */}
            <div className="grid grid-cols-3 gap-1.5 pt-1">
              <button
                type="button"
                onClick={() => navigateToCraneView({ view: 'list', jobId: selectedCrane.id })}
                className="py-1.5 px-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-[11px] font-bold text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white border border-slate-200/80 dark:border-slate-700/80 transition-all flex items-center justify-center gap-1 cursor-pointer shadow-2xs"
                title={isTh ? "เปิดดูรายละเอียดคำขอใน Request Registry" : "View in Request List"}
              >
                <FileText size={12} className="text-slate-500 dark:text-slate-400" />
                <span>{isTh ? 'เปิดคำขอ' : 'Request'}</span>
              </button>

              <button
                type="button"
                onClick={() => navigateToCraneView({ view: 'calendar', jobId: selectedCrane.id, date: selectedCrane.scheduledDate })}
                className="py-1.5 px-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-[11px] font-bold text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white border border-slate-200/80 dark:border-slate-700/80 transition-all flex items-center justify-center gap-1 cursor-pointer shadow-2xs"
                title={isTh ? "เปิดดูในปฏิทินงานเครน Calendar" : "View in Calendar"}
              >
                <Calendar size={12} className="text-slate-500 dark:text-slate-400" />
                <span>{isTh ? 'เปิดปฏิทิน' : 'Calendar'}</span>
              </button>

              <button
                type="button"
                onClick={() => navigateToCraneView({ view: 'optimize', jobId: selectedCrane.id })}
                className="py-1.5 px-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-[11px] font-bold text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white border border-slate-200/80 dark:border-slate-700/80 transition-all flex items-center justify-center gap-1 cursor-pointer shadow-2xs"
                title={isTh ? "ตรวจสอบและจัดสรรเครนใน Optimizer" : "Review & Optimize"}
              >
                <Sparkles size={12} className="text-slate-500 dark:text-slate-400" />
                <span>{isTh ? 'จัดสรรเครน' : 'Optimize'}</span>
              </button>
            </div>

          </div>
        )}

        {/* Candidate Pin Creation Dialog */}
        {candidatePin && (
          <div className={`absolute bottom-4 left-4 right-4 sm:left-auto sm:right-4 sm:w-[380px] z-50 p-5 rounded-3xl border-2 border-amber-500 shadow-2xl backdrop-blur-md space-y-3.5 animate-in slide-in-from-bottom-4 duration-200 ${
            isDarkMode ? 'bg-slate-900/95 text-white' : 'bg-white/95 text-slate-900'
          }`}>
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-2">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-amber-500 text-slate-950 font-bold">
                  <Crosshair size={16} />
                </div>
                <div>
                  <h4 className="text-xs font-black">ยื่นขอจุดตั้งเครนใหม่ (CR01 Pin)</h4>
                  <p className="text-[10px] text-amber-500 font-mono">พิกัด X: {candidatePin.x}% · Y: {candidatePin.y}%</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setCandidatePin(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-900 dark:hover:text-white"
              >
                <X size={16} />
              </button>
            </div>

            {/* Capacity Presets */}
            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase text-slate-400">ขนาดพิกัดยกเครน (Rated Capacity):</label>
              <div className="flex items-center gap-1.5 flex-wrap">
                {['25T', '35T', '50T', '100T', '160T', '250T', '300T'].map(cap => (
                  <button
                    key={cap}
                    type="button"
                    onClick={() => setCandidatePin(prev => prev ? { ...prev, capacity: cap } : null)}
                    className={`px-2.5 py-1 rounded-xl text-xs font-bold font-mono transition-all cursor-pointer ${
                      candidatePin.capacity === cap
                        ? 'bg-blue-600 text-white shadow-xs'
                        : isDarkMode ? 'bg-slate-800 text-slate-400' : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    {cap}
                  </button>
                ))}
              </div>
            </div>

            {/* Radius Slider */}
            <div className="space-y-1 bg-slate-950/40 p-2.5 rounded-2xl border border-slate-800/60">
              <div className="flex items-center justify-between text-xs font-bold">
                <span className="text-slate-400">รัศมีความปลอดภัย (Radius):</span>
                <span className="text-amber-400 font-mono text-sm">{candidatePin.safetyRadius} เมตร</span>
              </div>
              <input
                type="range"
                min="15"
                max="50"
                step="5"
                value={candidatePin.safetyRadius}
                onChange={e => setCandidatePin(prev => prev ? { ...prev, safetyRadius: parseInt(e.target.value) } : null)}
                className="w-full h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-amber-500"
              />
            </div>

            {/* Save Buttons */}
            <div className="flex gap-2 pt-1">
              <button
                type="button"
                onClick={() => setCandidatePin(null)}
                className="flex-1 py-2 rounded-xl text-xs font-bold border border-slate-700 text-slate-400 hover:text-white"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                onClick={handleSaveCandidatePin}
                className="flex-[2] py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all shadow-md flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <FileCheck size={14} />
                <span>บันทึกลงผัง &amp; ออก CR01</span>
              </button>
            </div>
          </div>
        )}

      </div>

      {/* Official CR01 Permit Dossier Modal */}
      {isDossierModalOpen && dossierModalJob && (
        <CranePermitDossierModal
          isOpen={isDossierModalOpen}
          onClose={() => setIsDossierModalOpen(false)}
          job={dossierModalJob}
        />
      )}

    </div>
  );
}
