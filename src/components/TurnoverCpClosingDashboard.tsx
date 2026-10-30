import React, { useState, useMemo } from 'react';
import {
  Search, RotateCcw, Download, CheckCircle2, Filter, ArrowUpDown,
  ArrowUp, ArrowDown, Building2, Layers, ShieldCheck, Check,
  ExternalLink, Sparkles, SlidersHorizontal, FileSpreadsheet, Eye
} from 'lucide-react';
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip,
  PieChart, Pie, Cell, LabelList, CartesianGrid
} from 'recharts';
import { useLanguage } from '../context/LanguageContext';
import { usePlantTurnShared } from '../context/PlantTurnSharedContext';

export type CpEquipType = 'PIP' | 'IN' | 'HX' | 'SUP' | 'MA' | 'EL' | 'FR' | 'DR';
export type CpAreaCode = 'S1' | 'S2';
export type CpLeadParty = 'UNT' | 'TURBO' | 'CKC';

export interface CpSummaryMatrixRow {
  id: string;
  area: CpAreaCode;
  unit: string;
  type: CpEquipType;
  systemNo: string;
  baselineUnits: number;
  p6Items: number;
  turnoverCpUnits: number;
  toCompletePct: number;
  toNotCp: number;
  leadParty: CpLeadParty;
}

export interface CpWorkScopeDetailRow {
  id: string;
  executionLead: CpLeadParty;
  area: CpAreaCode;
  unit: string;
  type: CpEquipType;
  wsNo: string;
  equipmentNo: string;
  workScopeTitle: string;
  systemNo: string;
  eicNo: string;
  blindQuantity: number;
  jobLeader: string;
  leadParty: CpLeadParty;
  blFinishDate: string;
  p6FinishDate: string;
  p6SortKey: string;
  status: 'Completed' | 'In Progress';
}

export const CP_TYPE_META: Record<CpEquipType, { label: string; color: string; badgeClass: string }> = {
  PIP: { label: 'PIP (Piping)', color: '#0070C0', badgeClass: 'bg-[#0070C0]/15 text-[#0070C0] dark:text-sky-300 border-[#0070C0]/30' },
  IN:  { label: 'IN (Instrument)', color: '#002060', badgeClass: 'bg-[#002060]/15 text-[#002060] dark:text-indigo-300 border-[#002060]/30' },
  HX:  { label: 'HX (Heat Exchanger)', color: '#ED7D31', badgeClass: 'bg-[#ED7D31]/15 text-[#C55A11] dark:text-orange-300 border-[#ED7D31]/30' },
  SUP: { label: 'SUP (Support/Struct)', color: '#7030A0', badgeClass: 'bg-[#7030A0]/15 text-[#7030A0] dark:text-purple-300 border-[#7030A0]/30' },
  MA:  { label: 'MA (Machinery)', color: '#D63384', badgeClass: 'bg-[#D63384]/15 text-[#D63384] dark:text-pink-300 border-[#D63384]/30' },
  EL:  { label: 'EL (Electrical)', color: '#6F42C1', badgeClass: 'bg-[#6F42C1]/15 text-[#6F42C1] dark:text-violet-300 border-[#6F42C1]/30' },
  FR:  { label: 'FR (Furnace/Heater)', color: '#C00000', badgeClass: 'bg-[#C00000]/15 text-[#C00000] dark:text-rose-300 border-[#C00000]/30' },
  DR:  { label: 'DR (Drum/Vessel)', color: '#70AD47', badgeClass: 'bg-[#70AD47]/15 text-[#548235] dark:text-emerald-300 border-[#70AD47]/30' },
};

// Baseline reference Donut counts by TYPE (PIP: 58, IN: 27, HX: 24, SUP: 15, MA: 11, EL: 10, FR: 9, DR: 7)
export const BASELINE_DONUT_BY_TYPE: Array<{ type: CpEquipType; count: number; color: string }> = [
  { type: 'PIP', count: 58, color: '#0070C0' },
  { type: 'IN',  count: 27, color: '#002060' },
  { type: 'HX',  count: 24, color: '#ED7D31' },
  { type: 'SUP', count: 15, color: '#7030A0' },
  { type: 'MA',  count: 11, color: '#D63384' },
  { type: 'EL',  count: 10, color: '#6F42C1' },
  { type: 'FR',  count: 9,  color: '#C00000' },
  { type: 'DR',  count: 7,  color: '#70AD47' },
];

// Summary Matrix Table Data:
// Sums strictly to: Baseline Units = 157, P6 item = 164, Turnover CP Units = 164, % TO Complete = 100%, TO Not CP = 0
// Systems aggregate to the exact Bar Chart distribution:
// Sys.11 (27), Sys.28 (20), Sys.31 (19), Sys.14 (13), Sys.24 (12), Sys.13 (12),
// Sys.2 (5), Sys.4 (5), Sys.1 (5), Sys.5 (5), Sys.15 (4), Sys.16 (4), Sys.30 (4),
// Sys.8 (3), Sys.12 (3), Sys.18 (3), Sys.20 (3), Sys.22 (3), Sys.9 (2), Sys.10 (2),
// Sys.6 (2), Sys.7 (2), Sys.19 (2), Sys.21 (2), Sys.25 (2) => Total = 164
export const INITIAL_CP_SUMMARY_ROWS: CpSummaryMatrixRow[] = [
  // Top visible rows matching reference Summary Matrix
  { id: 'sum-01', area: 'S2', unit: 'APS-1',  type: 'PIP', systemNo: '11', baselineUnits: 14, p6Items: 15, turnoverCpUnits: 15, toCompletePct: 100, toNotCp: 0, leadParty: 'UNT' },
  { id: 'sum-02', area: 'S2', unit: 'APS-1',  type: 'HX',  systemNo: '11', baselineUnits: 7,  p6Items: 7,  turnoverCpUnits: 7,  toCompletePct: 100, toNotCp: 0, leadParty: 'UNT' },
  { id: 'sum-03', area: 'S2', unit: 'APS-1',  type: 'IN',  systemNo: '11', baselineUnits: 5,  p6Items: 5,  turnoverCpUnits: 5,  toCompletePct: 100, toNotCp: 0, leadParty: 'TURBO' },
  { id: 'sum-04', area: 'S2', unit: 'VPS-2',  type: 'PIP', systemNo: '28', baselineUnits: 12, p6Items: 13, turnoverCpUnits: 13, toCompletePct: 100, toNotCp: 0, leadParty: 'UNT' },
  { id: 'sum-05', area: 'S2', unit: 'VPS-2',  type: 'IN',  systemNo: '28', baselineUnits: 7,  p6Items: 7,  turnoverCpUnits: 7,  toCompletePct: 100, toNotCp: 0, leadParty: 'TURBO' },
  { id: 'sum-06', area: 'S2', unit: 'GOHF-3', type: 'PIP', systemNo: '31', baselineUnits: 10, p6Items: 11, turnoverCpUnits: 11, toCompletePct: 100, toNotCp: 0, leadParty: 'CKC' },
  { id: 'sum-07', area: 'S2', unit: 'GOHF-3', type: 'SUP', systemNo: '31', baselineUnits: 8,  p6Items: 8,  turnoverCpUnits: 8,  toCompletePct: 100, toNotCp: 0, leadParty: 'CKC' },
  { id: 'sum-08', area: 'S2', unit: 'APS-1',  type: 'PIP', systemNo: '14', baselineUnits: 8,  p6Items: 8,  turnoverCpUnits: 8,  toCompletePct: 100, toNotCp: 0, leadParty: 'UNT' },
  { id: 'sum-09', area: 'S2', unit: 'APS-1',  type: 'HX',  systemNo: '14', baselineUnits: 5,  p6Items: 5,  turnoverCpUnits: 5,  toCompletePct: 100, toNotCp: 0, leadParty: 'UNT' },
  { id: 'sum-10', area: 'S2', unit: 'NHF-1',  type: 'PIP', systemNo: '24', baselineUnits: 7,  p6Items: 7,  turnoverCpUnits: 7,  toCompletePct: 100, toNotCp: 0, leadParty: 'TURBO' },
  { id: 'sum-11', area: 'S2', unit: 'NHF-1',  type: 'MA',  systemNo: '24', baselineUnits: 5,  p6Items: 5,  turnoverCpUnits: 5,  toCompletePct: 100, toNotCp: 0, leadParty: 'TURBO' },
  { id: 'sum-12', area: 'S2', unit: 'APS-1',  type: 'HX',  systemNo: '13', baselineUnits: 6,  p6Items: 7,  turnoverCpUnits: 7,  toCompletePct: 100, toNotCp: 0, leadParty: 'UNT' },
  { id: 'sum-13', area: 'S2', unit: 'APS-1',  type: 'IN',  systemNo: '13', baselineUnits: 5,  p6Items: 5,  turnoverCpUnits: 5,  toCompletePct: 100, toNotCp: 0, leadParty: 'UNT' },
  { id: 'sum-14', area: 'S1', unit: 'CCR',    type: 'DR',  systemNo: '2',  baselineUnits: 5,  p6Items: 5,  turnoverCpUnits: 5,  toCompletePct: 100, toNotCp: 0, leadParty: 'UNT' },
  { id: 'sum-15', area: 'S1', unit: 'SRU',    type: 'IN',  systemNo: '4',  baselineUnits: 5,  p6Items: 5,  turnoverCpUnits: 5,  toCompletePct: 100, toNotCp: 0, leadParty: 'TURBO' },
  { id: 'sum-16', area: 'S1', unit: 'CCR',    type: 'PIP', systemNo: '1',  baselineUnits: 4,  p6Items: 5,  turnoverCpUnits: 5,  toCompletePct: 100, toNotCp: 0, leadParty: 'UNT' },
  { id: 'sum-17', area: 'S1', unit: 'TGCU',   type: 'FR',  systemNo: '5',  baselineUnits: 5,  p6Items: 5,  turnoverCpUnits: 5,  toCompletePct: 100, toNotCp: 0, leadParty: 'CKC' },
  { id: 'sum-18', area: 'S2', unit: 'APS-1',  type: 'EL',  systemNo: '15', baselineUnits: 4,  p6Items: 4,  turnoverCpUnits: 4,  toCompletePct: 100, toNotCp: 0, leadParty: 'CKC' },
  { id: 'sum-19', area: 'S2', unit: 'APS-1',  type: 'FR',  systemNo: '16', baselineUnits: 4,  p6Items: 4,  turnoverCpUnits: 4,  toCompletePct: 100, toNotCp: 0, leadParty: 'CKC' },
  { id: 'sum-20', area: 'S1', unit: 'CCR',    type: 'IN',  systemNo: '30', baselineUnits: 4,  p6Items: 4,  turnoverCpUnits: 4,  toCompletePct: 100, toNotCp: 0, leadParty: 'TURBO' },
  { id: 'sum-21', area: 'S1', unit: 'SRU',    type: 'SUP', systemNo: '8',  baselineUnits: 3,  p6Items: 3,  turnoverCpUnits: 3,  toCompletePct: 100, toNotCp: 0, leadParty: 'CKC' },
  { id: 'sum-22', area: 'S2', unit: 'APS-2',  type: 'HX',  systemNo: '12', baselineUnits: 3,  p6Items: 3,  turnoverCpUnits: 3,  toCompletePct: 100, toNotCp: 0, leadParty: 'UNT' },
  { id: 'sum-23', area: 'S2', unit: 'VPS-2',  type: 'MA',  systemNo: '18', baselineUnits: 3,  p6Items: 3,  turnoverCpUnits: 3,  toCompletePct: 100, toNotCp: 0, leadParty: 'TURBO' },
  { id: 'sum-24', area: 'S2', unit: 'GOHF-3', type: 'EL',  systemNo: '20', baselineUnits: 3,  p6Items: 3,  turnoverCpUnits: 3,  toCompletePct: 100, toNotCp: 0, leadParty: 'CKC' },
  { id: 'sum-25', area: 'S2', unit: 'NHF-1',  type: 'MA',  systemNo: '22', baselineUnits: 3,  p6Items: 3,  turnoverCpUnits: 3,  toCompletePct: 100, toNotCp: 0, leadParty: 'TURBO' },
  { id: 'sum-26', area: 'S1', unit: 'TGCU',   type: 'SUP', systemNo: '9',  baselineUnits: 2,  p6Items: 2,  turnoverCpUnits: 2,  toCompletePct: 100, toNotCp: 0, leadParty: 'CKC' },
  { id: 'sum-27', area: 'S1', unit: 'UTL',    type: 'EL',  systemNo: '10', baselineUnits: 2,  p6Items: 2,  turnoverCpUnits: 2,  toCompletePct: 100, toNotCp: 0, leadParty: 'CKC' },
  { id: 'sum-28', area: 'S1', unit: 'CCR',    type: 'DR',  systemNo: '6',  baselineUnits: 2,  p6Items: 2,  turnoverCpUnits: 2,  toCompletePct: 100, toNotCp: 0, leadParty: 'UNT' },
  { id: 'sum-29', area: 'S1', unit: 'SRU',    type: 'SUP', systemNo: '7',  baselineUnits: 2,  p6Items: 2,  turnoverCpUnits: 2,  toCompletePct: 100, toNotCp: 0, leadParty: 'CKC' },
  { id: 'sum-30', area: 'S2', unit: 'APS-2',  type: 'HX',  systemNo: '19', baselineUnits: 2,  p6Items: 2,  turnoverCpUnits: 2,  toCompletePct: 100, toNotCp: 0, leadParty: 'UNT' },
  { id: 'sum-31', area: 'S2', unit: 'VPS-2',  type: 'EL',  systemNo: '21', baselineUnits: 1,  p6Items: 2,  turnoverCpUnits: 2,  toCompletePct: 100, toNotCp: 0, leadParty: 'CKC' },
  { id: 'sum-32', area: 'S2', unit: 'GOHF-3', type: 'IN',  systemNo: '25', baselineUnits: 1,  p6Items: 2,  turnoverCpUnits: 2,  toCompletePct: 100, toNotCp: 0, leadParty: 'TURBO' },
];

// Featured authentic Work Scope rows visible at the top of the Lower Tier Table
const FEATURED_WS_ROWS: CpWorkScopeDetailRow[] = [
  {
    id: 'ws-001',
    executionLead: 'UNT',
    area: 'S1',
    unit: 'CCR',
    type: 'DR',
    wsNo: 'S1-DR-001',
    equipmentNo: 'X-3414',
    workScopeTitle: 'SD25 X-3414 Sock Filter C/O (2 times/ year)',
    systemNo: '2',
    eicNo: '2022-104',
    blindQuantity: 4,
    jobLeader: 'Kantanop',
    leadParty: 'UNT',
    blFinishDate: '07-May-25',
    p6FinishDate: '07-May-25',
    p6SortKey: '2025-05-07',
    status: 'Completed',
  },
  {
    id: 'ws-002',
    executionLead: 'UNT',
    area: 'S1',
    unit: 'CCR',
    type: 'DR',
    wsNo: 'S1-DR-002',
    equipmentNo: 'X-3409X',
    workScopeTitle: 'SD25 X-3409X Catalyst Change Out',
    systemNo: '2',
    eicNo: '2024-664',
    blindQuantity: 2,
    jobLeader: 'Kantanop',
    leadParty: 'UNT',
    blFinishDate: '07-May-25',
    p6FinishDate: '07-May-25',
    p6SortKey: '2025-05-07',
    status: 'Completed',
  },
  {
    id: 'ws-003',
    executionLead: 'TURBO',
    area: 'S1',
    unit: 'CCR',
    type: 'IN',
    wsNo: 'S1-IN-001A',
    equipmentNo: 'P2XV4009/09A',
    workScopeTitle: 'SD25 P2XV4009/09A Emergency Blowdown Valve Overhaul & Stroke Test',
    systemNo: '30',
    eicNo: '35-03',
    blindQuantity: 0,
    jobLeader: 'Wisanu/ Y.',
    leadParty: 'TURBO',
    blFinishDate: '08-May-25',
    p6FinishDate: '08-May-25',
    p6SortKey: '2025-05-08',
    status: 'Completed',
  },
  {
    id: 'ws-004',
    executionLead: 'UNT',
    area: 'S2',
    unit: 'APS-1',
    type: 'HX',
    wsNo: 'S2-HX-006A',
    equipmentNo: 'E-3505',
    workScopeTitle: 'SD25 E-3505 M1 finfan baking soda cleaning',
    systemNo: '13',
    eicNo: '10-15',
    blindQuantity: 3,
    jobLeader: 'Peerawich A.',
    leadParty: 'UNT',
    blFinishDate: '09-May-25',
    p6FinishDate: '09-May-25',
    p6SortKey: '2025-05-09',
    status: 'Completed',
  },
  {
    id: 'ws-005',
    executionLead: 'UNT',
    area: 'S2',
    unit: 'APS-1',
    type: 'PIP',
    wsNo: 'S2-PIP-120',
    equipmentNo: 'APLC-104',
    workScopeTitle: 'SD25 APLC-104 Overhead Line Spool Replacement & Hydrotest',
    systemNo: '14',
    eicNo: '2024-118',
    blindQuantity: 4,
    jobLeader: 'Sumran A.',
    leadParty: 'UNT',
    blFinishDate: '10-May-25',
    p6FinishDate: '10-May-25',
    p6SortKey: '2025-05-10',
    status: 'Completed',
  },
  {
    id: 'ws-006',
    executionLead: 'UNT',
    area: 'S2',
    unit: 'APS-1',
    type: 'HX',
    wsNo: 'S2-HX-001A',
    equipmentNo: 'E-1102A/B',
    workScopeTitle: 'SD25 E-1102A/B Crude Column Overhead Condenser Inspection & Re-tubing',
    systemNo: '11',
    eicNo: '2025-011',
    blindQuantity: 6,
    jobLeader: 'Tanat W.',
    leadParty: 'UNT',
    blFinishDate: '11-May-25',
    p6FinishDate: '11-May-25',
    p6SortKey: '2025-05-11',
    status: 'Completed',
  },
  {
    id: 'ws-007',
    executionLead: 'CKC',
    area: 'S2',
    unit: 'GOHF-3',
    type: 'PIP',
    wsNo: 'S2-PIP-088',
    equipmentNo: 'L-3104-6"-P',
    workScopeTitle: 'SD25 GOHF-3 High Pressure Reactor Effluent Piping Butt Weld & PWHT',
    systemNo: '31',
    eicNo: '2024-512',
    blindQuantity: 2,
    jobLeader: 'Sumran A.',
    leadParty: 'CKC',
    blFinishDate: '11-May-25',
    p6FinishDate: '11-May-25',
    p6SortKey: '2025-05-11',
    status: 'Completed',
  },
  {
    id: 'ws-008',
    executionLead: 'UNT',
    area: 'S2',
    unit: 'VPS-2',
    type: 'PIP',
    wsNo: 'S2-PIP-204',
    equipmentNo: 'V-2801-OVHD',
    workScopeTitle: 'SD25 VPS-2 Vacuum Column Overhead Vapor Line Thickness UT & Flange Renewal',
    systemNo: '28',
    eicNo: '2024-809',
    blindQuantity: 5,
    jobLeader: 'Peerawich A.',
    leadParty: 'UNT',
    blFinishDate: '12-May-25',
    p6FinishDate: '12-May-25',
    p6SortKey: '2025-05-12',
    status: 'Completed',
  },
  {
    id: 'ws-009',
    executionLead: 'TURBO',
    area: 'S2',
    unit: 'NHF-1',
    type: 'MA',
    wsNo: 'S2-MA-014',
    equipmentNo: 'K-2401A',
    workScopeTitle: 'SD25 K-2401A Recycle Gas Compressor Dry Gas Seal & Bearing Overhaul',
    systemNo: '24',
    eicNo: '2024-330',
    blindQuantity: 0,
    jobLeader: 'Wisanu/ Y.',
    leadParty: 'TURBO',
    blFinishDate: '12-May-25',
    p6FinishDate: '12-May-25',
    p6SortKey: '2025-05-12',
    status: 'Completed',
  },
  {
    id: 'ws-010',
    executionLead: 'CKC',
    area: 'S1',
    unit: 'TGCU',
    type: 'FR',
    wsNo: 'S1-FR-005',
    equipmentNo: 'F-1501',
    workScopeTitle: 'SD25 F-1501 Incinerator Refractory Castable Repair & Burner Tip Replacement',
    systemNo: '5',
    eicNo: '2023-419',
    blindQuantity: 4,
    jobLeader: 'Tanat W.',
    leadParty: 'CKC',
    blFinishDate: '13-May-25',
    p6FinishDate: '13-May-25',
    p6SortKey: '2025-05-13',
    status: 'Completed',
  },
];

// Build full 164 Work Scope records aligned 1-to-1 with INITIAL_CP_SUMMARY_ROWS
const JOB_LEADERS_BY_PARTY: Record<CpLeadParty, string[]> = {
  UNT: ['Kantanop', 'Peerawich A.', 'Sumran A.', 'Tanat W.'],
  TURBO: ['Wisanu/ Y.', 'Chaiwat K.', 'Nattapong S.'],
  CKC: ['Sumran A.', 'Tanat W.', 'Prasit M.'],
};

const EQUIP_PREFIX_BY_TYPE: Record<CpEquipType, string> = {
  PIP: 'APLC',
  IN: 'P2XV',
  HX: 'E',
  SUP: 'ST',
  MA: 'K',
  EL: 'MCC',
  FR: 'F',
  DR: 'X',
};

const SCOPE_DESC_BY_TYPE: Record<CpEquipType, string[]> = {
  PIP: [
    'Tie-in Spool Modification & Hydrostatic Pressure Test',
    'Flange Face Machining, Spiral Wound Gasket Renewal & Bolt Torque',
    'Underground Header Isolation Blind Installation & De-blinding',
    'High-Temperature Alloy Piping Butt Weld & 100% RT Inspection',
  ],
  IN: [
    'Control Valve Actuator Diaphragm Overhaul & Smart Positioner Calibration',
    'Safety Interlock Transmitter Loop Check & SIL Proof Testing',
    'Orifice Plate Inspection & Differential Pressure Impulse Line Flushing',
    'Emergency Shutdown Valve (ESDV) Full Stroke Timing Verification',
  ],
  HX: [
    'Tube Bundle Pulling, High-Pressure Hydro-Jetting & Eddy Current Test',
    'M1 Finfan Baking Soda Cleaning & Louver Actuator Alignment',
    'Floating Head Backing Ring Seal Weld PT & Shell Hydrotest',
    'Channel Cover Partition Plate Weld Repair & Gasket Replacement',
  ],
  SUP: [
    'Spring Hanger Cold/Hot Load Calibration & Pipe Shoe Replacement',
    'Structural Access Platform Modification & Grating Clip Securing',
    'Pipe Rack Guide Lug Welding & Thermal Expansion Clearance Check',
  ],
  MA: [
    'Centrifugal Pump Mechanical Seal Cartridge Replacement & Laser Alignment',
    'Compressor Lube Oil Console Flushing & Vibration Probe Verification',
    'Fin-Fan Cooler Gearbox Bearing Overhaul & Blade Pitch Angle Setting',
  ],
  EL: [
    'HV Motor Stator Winding Insulation Resistance (Megger) & Overhaul',
    'Substation Feeder Breaker Protection Relay Secondary Injection Test',
    'Explosion-Proof Junction Box Gland Sealing & Earth Continuity Check',
  ],
  FR: [
    'Fired Heater Radiant Tube Ultrasonic Thickness & Convection Bank Washing',
    'Burner Management System (BMS) Flame Scanner & Pilot Tip Overhaul',
    'Refractory Lining Anchor Weld Repair & Stack Damper Linkage Check',
  ],
  DR: [
    'Sock Filter C/O (2 times/ year) & Internal Demister Pad Replacement',
    'Catalyst Change Out, Inert Entry Inspection & Johnson Screen Check',
    'Knock-Out Drum Internal Vortex Breaker & Weld Seam WFMPI Inspection',
  ],
};

function generateFullWorkScopeDataset(): CpWorkScopeDetailRow[] {
  const result: CpWorkScopeDetailRow[] = [...FEATURED_WS_ROWS];

  // Track how many featured items already exist per summary key (area|unit|type|systemNo)
  const usedCounts = new Map<string, number>();
  FEATURED_WS_ROWS.forEach(r => {
    const key = `${r.area}|${r.unit}|${r.type}|${r.systemNo}`;
    usedCounts.set(key, (usedCounts.get(key) || 0) + 1);
  });

  let globalSeq = FEATURED_WS_ROWS.length + 1;
  const finishDates = [
    { label: '07-May-25', sort: '2025-05-07' },
    { label: '08-May-25', sort: '2025-05-08' },
    { label: '09-May-25', sort: '2025-05-09' },
    { label: '10-May-25', sort: '2025-05-10' },
    { label: '11-May-25', sort: '2025-05-11' },
    { label: '12-May-25', sort: '2025-05-12' },
    { label: '13-May-25', sort: '2025-05-13' },
    { label: '14-May-25', sort: '2025-05-14' },
    { label: '15-May-25', sort: '2025-05-15' },
  ];

  INITIAL_CP_SUMMARY_ROWS.forEach((sumRow, sumIdx) => {
    const key = `${sumRow.area}|${sumRow.unit}|${sumRow.type}|${sumRow.systemNo}`;
    const alreadyCreated = usedCounts.get(key) || 0;
    const remaining = Math.max(0, sumRow.turnoverCpUnits - alreadyCreated);

    for (let i = 0; i < remaining; i++) {
      const seqNum = alreadyCreated + i + 1;
      const wsNo = `${sumRow.area}-${sumRow.type}-${String(sumIdx * 10 + seqNum).padStart(3, '0')}`;
      const eqPrefix = EQUIP_PREFIX_BY_TYPE[sumRow.type];
      const eqNo = `${eqPrefix}-${sumRow.systemNo}${String(seqNum).padStart(2, '0')}${seqNum % 2 === 0 ? 'A' : ''}`;
      const descList = SCOPE_DESC_BY_TYPE[sumRow.type];
      const desc = descList[(globalSeq + i) % descList.length];
      const leaders = JOB_LEADERS_BY_PARTY[sumRow.leadParty];
      const leader = leaders[(globalSeq + i) % leaders.length];
      const dateObj = finishDates[(globalSeq + i) % finishDates.length];
      const blindQty = sumRow.type === 'EL' || sumRow.type === 'IN' || sumRow.type === 'SUP'
        ? (i % 3 === 0 ? 1 : 0)
        : ((globalSeq + i) % 5);

      result.push({
        id: `ws-${String(globalSeq).padStart(3, '0')}`,
        executionLead: sumRow.leadParty,
        area: sumRow.area,
        unit: sumRow.unit,
        type: sumRow.type,
        wsNo,
        equipmentNo: eqNo,
        workScopeTitle: `SD25 ${eqNo} ${desc}`,
        systemNo: sumRow.systemNo,
        eicNo: `${2023 + (globalSeq % 3)}-${String(100 + globalSeq * 3).slice(0, 3)}`,
        blindQuantity: blindQty,
        jobLeader: leader,
        leadParty: sumRow.leadParty,
        blFinishDate: dateObj.label,
        p6FinishDate: dateObj.label,
        p6SortKey: dateObj.sort,
        status: 'Completed',
      });
      globalSeq++;
    }
  });

  return result;
}

const ALL_WS_DETAIL_ROWS: CpWorkScopeDetailRow[] = generateFullWorkScopeDataset();

interface TurnoverCpClosingDashboardProps {
  globalPlantFilter?: 'All' | 'Phra Khanong' | 'Sriracha';
  onNavigateToWorkspace?: (jobId?: string) => void;
}

export default function TurnoverCpClosingDashboard({
  globalPlantFilter = 'All',
  onNavigateToWorkspace,
}: TurnoverCpClosingDashboardProps) {
  const { isTh } = useLanguage();
  const { events, jobs, setSelectedJobId } = usePlantTurnShared();

  // Interactive Cross-Filtering State
  const [selectedAreas, setSelectedAreas] = useState<CpAreaCode[]>(['S1', 'S2']);
  const [selectedType, setSelectedType] = useState<CpEquipType | 'All'>('All');
  const [selectedSystemNo, setSelectedSystemNo] = useState<string | null>(null);
  const [selectedSummaryRowId, setSelectedSummaryRowId] = useState<string | null>(null);
  const [selectedExecutionLead, setSelectedExecutionLead] = useState<CpLeadParty | 'All'>('All');
  const [selectedEventName, setSelectedEventName] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Sorting state for Summary Matrix (Turnover CP Units)
  const [summarySortDir, setSummarySortDir] = useState<'desc' | 'asc' | null>(null);
  // Sorting state for Lower Work Scope Table (P6 Finish Date)
  const [wsDateSortDir, setWsDateSortDir] = useState<'asc' | 'desc'>('asc');

  // Detail Modal for inspecting a Work Scope row
  const [inspectedWsRow, setInspectedWsRow] = useState<CpWorkScopeDetailRow | null>(null);

  const isAnyFilterActive = useMemo(() => {
    return (
      selectedAreas.length < 2 ||
      selectedType !== 'All' ||
      selectedSystemNo !== null ||
      selectedSummaryRowId !== null ||
      selectedExecutionLead !== 'All' ||
      selectedEventName !== 'All' ||
      searchQuery.trim() !== ''
    );
  }, [
    selectedAreas,
    selectedType,
    selectedSystemNo,
    selectedSummaryRowId,
    selectedExecutionLead,
    selectedEventName,
    searchQuery,
  ]);

  const handleResetAllFilters = () => {
    setSelectedAreas(['S1', 'S2']);
    setSelectedType('All');
    setSelectedSystemNo(null);
    setSelectedSummaryRowId(null);
    setSelectedExecutionLead('All');
    setSelectedEventName('All');
    setSearchQuery('');
  };

  const toggleArea = (area: CpAreaCode) => {
    setSelectedSummaryRowId(null);
    setSelectedAreas(prev => {
      if (prev.includes(area)) {
        // Don't allow empty selection; if unchecking the last one, select both
        return prev.length === 1 ? ['S1', 'S2'] : prev.filter(a => a !== area);
      }
      return [...prev, area];
    });
  };

  const selectAllAreas = () => {
    setSelectedSummaryRowId(null);
    setSelectedAreas(['S1', 'S2']);
  };

  // Filtered Summary Matrix Rows
  const filteredSummaryRows = useMemo(() => {
    const base = INITIAL_CP_SUMMARY_ROWS.filter(row => {
      if (!selectedAreas.includes(row.area)) return false;
      if (selectedType !== 'All' && row.type !== selectedType) return false;
      if (selectedSystemNo !== null && row.systemNo !== selectedSystemNo) return false;
      if (selectedExecutionLead !== 'All' && row.leadParty !== selectedExecutionLead) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const mUnit = row.unit.toLowerCase().includes(q);
        const mSys = `sys.${row.systemNo}`.includes(q) || row.systemNo.includes(q);
        const mType = row.type.toLowerCase().includes(q);
        // Also check if any WS in this summary group matches the search query
        const hasMatchingWs = ALL_WS_DETAIL_ROWS.some(
          ws =>
            ws.area === row.area &&
            ws.unit === row.unit &&
            ws.type === row.type &&
            ws.systemNo === row.systemNo &&
            (ws.wsNo.toLowerCase().includes(q) ||
              ws.equipmentNo.toLowerCase().includes(q) ||
              ws.workScopeTitle.toLowerCase().includes(q) ||
              ws.jobLeader.toLowerCase().includes(q))
        );
        if (!mUnit && !mSys && !mType && !hasMatchingWs) return false;
      }
      return true;
    });

    if (!summarySortDir) return base;
    return [...base].sort((a, b) =>
      summarySortDir === 'desc'
        ? b.turnoverCpUnits - a.turnoverCpUnits
        : a.turnoverCpUnits - b.turnoverCpUnits
    );
  }, [
    selectedAreas,
    selectedType,
    selectedSystemNo,
    selectedExecutionLead,
    searchQuery,
    summarySortDir,
  ]);

  // Summary Matrix Totals (Sticky Footer & Top KPI Badges)
  const summaryTotals = useMemo(() => {
    const activeRows = selectedSummaryRowId
      ? filteredSummaryRows.filter(r => r.id === selectedSummaryRowId)
      : filteredSummaryRows;

    const baselineUnits = activeRows.reduce((acc, r) => acc + r.baselineUnits, 0);
    const p6Items = activeRows.reduce((acc, r) => acc + r.p6Items, 0);
    const turnoverCpUnits = activeRows.reduce((acc, r) => acc + r.turnoverCpUnits, 0);
    const toNotCp = activeRows.reduce((acc, r) => acc + r.toNotCp, 0);
    const toCompletePct =
      activeRows.length > 0
        ? Math.round(activeRows.reduce((acc, r) => acc + r.toCompletePct, 0) / activeRows.length)
        : 0;

    return {
      baselineUnits,
      p6Items,
      turnoverCpUnits,
      toCompletePct,
      toNotCp,
    };
  }, [filteredSummaryRows, selectedSummaryRowId]);

  // Bar Chart Data: "CP Closing - By System" sorted descending by value
  const systemBarChartData = useMemo(() => {
    const rowsForChart = INITIAL_CP_SUMMARY_ROWS.filter(row => {
      if (!selectedAreas.includes(row.area)) return false;
      if (selectedType !== 'All' && row.type !== selectedType) return false;
      if (selectedExecutionLead !== 'All' && row.leadParty !== selectedExecutionLead) return false;
      return true;
    });

    const map = new Map<string, number>();
    rowsForChart.forEach(r => {
      map.set(r.systemNo, (map.get(r.systemNo) || 0) + r.turnoverCpUnits);
    });

    return Array.from(map.entries())
      .map(([systemNo, count]) => ({
        systemNo,
        label: `Sys.${systemNo}`,
        count,
      }))
      .sort((a, b) => {
        if (b.count !== a.count) return b.count - a.count;
        // Preserve canonical order from reference when counts tie
        const order = ['11', '28', '31', '14', '24', '13', '2', '4', '1', '5', '15', '16', '30', '8', '12', '18', '20', '22', '9', '10', '6', '7', '19', '21', '25'];
        return order.indexOf(a.systemNo) - order.indexOf(b.systemNo);
      });
  }, [selectedAreas, selectedType, selectedExecutionLead]);

  // Donut Chart Data: "Turnover CP" by TYPE
  // When unfiltered, displays exact reference counts (PIP: 58, IN: 27, HX: 24, SUP: 15, MA: 11, EL: 10, FR: 9, DR: 7)
  // When filtered by Area/System/Lead, computes dynamically so cross-filtering is live
  const donutChartData = useMemo(() => {
    const isAreaOrSysFiltered =
      selectedAreas.length < 2 ||
      selectedSystemNo !== null ||
      selectedSummaryRowId !== null ||
      selectedExecutionLead !== 'All';

    if (!isAreaOrSysFiltered) {
      return BASELINE_DONUT_BY_TYPE.map(d => ({
        name: d.type,
        value: d.count,
        color: d.color,
        callOut: `${d.type} ${d.count}`,
      }));
    }

    const activeSummary = INITIAL_CP_SUMMARY_ROWS.filter(row => {
      if (selectedSummaryRowId && row.id !== selectedSummaryRowId) return false;
      if (!selectedAreas.includes(row.area)) return false;
      if (selectedSystemNo !== null && row.systemNo !== selectedSystemNo) return false;
      if (selectedExecutionLead !== 'All' && row.leadParty !== selectedExecutionLead) return false;
      return true;
    });

    const byType = new Map<CpEquipType, number>();
    activeSummary.forEach(r => {
      byType.set(r.type, (byType.get(r.type) || 0) + r.turnoverCpUnits);
    });

    return BASELINE_DONUT_BY_TYPE.map(d => {
      const val = byType.get(d.type) || 0;
      return {
        name: d.type,
        value: val,
        color: d.color,
        callOut: `${d.type} ${val}`,
      };
    }).filter(d => d.value > 0);
  }, [selectedAreas, selectedSystemNo, selectedSummaryRowId, selectedExecutionLead]);

  // Filtered Lower Tier Work Scope (WS) Execution Detail Rows
  const filteredWsDetailRows = useMemo(() => {
    const activeSummaryRow = selectedSummaryRowId
      ? INITIAL_CP_SUMMARY_ROWS.find(r => r.id === selectedSummaryRowId) || null
      : null;

    const filtered = ALL_WS_DETAIL_ROWS.filter(ws => {
      if (activeSummaryRow) {
        if (
          ws.area !== activeSummaryRow.area ||
          ws.unit !== activeSummaryRow.unit ||
          ws.type !== activeSummaryRow.type ||
          ws.systemNo !== activeSummaryRow.systemNo
        ) {
          return false;
        }
      } else {
        if (!selectedAreas.includes(ws.area)) return false;
        if (selectedType !== 'All' && ws.type !== selectedType) return false;
        if (selectedSystemNo !== null && ws.systemNo !== selectedSystemNo) return false;
        if (selectedExecutionLead !== 'All' && ws.executionLead !== selectedExecutionLead) return false;
      }

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchWs = ws.wsNo.toLowerCase().includes(q);
        const matchEq = ws.equipmentNo.toLowerCase().includes(q);
        const matchTitle = ws.workScopeTitle.toLowerCase().includes(q);
        const matchEic = ws.eicNo.toLowerCase().includes(q);
        const matchLeader = ws.jobLeader.toLowerCase().includes(q);
        const matchSys = `sys.${ws.systemNo}`.includes(q) || ws.systemNo === q;
        if (!matchWs && !matchEq && !matchTitle && !matchEic && !matchLeader && !matchSys) {
          return false;
        }
      }

      return true;
    });

    return [...filtered].sort((a, b) => {
      const cmp = a.p6SortKey.localeCompare(b.p6SortKey);
      if (cmp !== 0) return wsDateSortDir === 'asc' ? cmp : -cmp;
      return a.id.localeCompare(b.id);
    });
  }, [
    selectedSummaryRowId,
    selectedAreas,
    selectedType,
    selectedSystemNo,
    selectedExecutionLead,
    searchQuery,
    wsDateSortDir,
  ]);

  // Export Filtered Work Scope Detail Table to CSV
  const handleExportCsv = () => {
    const q = (v: unknown) => `"${String(v ?? '').replace(/"/g, '""')}"`;
    const headers = [
      'Execution Lead',
      'Area',
      'Unit',
      'TYPE',
      'WS NO.',
      'EQUIPMENT NO.',
      'WORK SCOPE TITLE',
      'System No',
      'EIC No.',
      'Blind Quantity',
      'Job Leader',
      'Lead Party',
      'BL Finish Date',
      'P6 Finish Date',
      'Status',
    ];
    const rows = filteredWsDetailRows.map(r =>
      [
        r.executionLead,
        r.area,
        r.unit,
        r.type,
        r.wsNo,
        r.equipmentNo,
        r.workScopeTitle,
        r.systemNo,
        r.eicNo,
        r.blindQuantity,
        r.jobLeader,
        r.leadParty,
        r.blFinishDate,
        r.p6FinishDate,
        r.status,
      ]
        .map(q)
        .join(',')
    );
    const csv = '\uFEFF' + [headers.map(q).join(','), ...rows].join('\r\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = `Turnover_CP_Closing_WorkScopes_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  // Custom outer label renderer for the "Turnover CP" Donut Chart
  const renderDonutCalloutLabel = (props: any) => {
    const { cx, cy, midAngle, outerRadius, name, value } = props;
    const RADIAN = Math.PI / 180;
    const radius = outerRadius + 18;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);

    return (
      <text
        x={x}
        y={y}
        fill="#1E293B"
        textAnchor={x > cx ? 'start' : 'end'}
        dominantBaseline="central"
        className="text-[10px] font-extrabold font-mono fill-slate-800 dark:fill-slate-200"
      >
        {`${name} ${value}`}
      </text>
    );
  };

  return (
    <div className="w-full space-y-4 pb-12 text-slate-900 dark:text-slate-100 select-none">
      {/* =====================================================================
          1. TOP CONTROL & FILTER BAR (HEADER + KPI SUMMARY + QUICK FILTERS)
         ===================================================================== */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs p-4 space-y-3.5">
        {/* Top Row: Title + KPI Quick Stats + Area Slicer Pill Buttons */}
        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-800 pb-3">
          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-2 py-0.5 rounded bg-[#002060] text-white text-[10px] font-mono font-extrabold uppercase tracking-wider">
                SD25 / TA CONTROL POINT
              </span>
              <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                {globalPlantFilter === 'All'
                  ? (isTh ? 'ทุกโรงกลั่น (Phra Khanong & Sriracha)' : 'All Plants (PK & SR)')
                  : globalPlantFilter}
              </span>
              {selectedEventName !== 'All' && (
                <span className="text-xs text-emerald-700 dark:text-emerald-400 font-bold">
                  · {selectedEventName}
                </span>
              )}
            </div>
            <h1 className="text-lg sm:text-xl font-black tracking-tight text-[#0F172A] dark:text-white flex items-center gap-2">
              <ShieldCheck size={22} className="text-[#2563EB] shrink-0" />
              <span>Turnover S/D & TA — Control Point (CP) Closing Dashboard</span>
            </h1>
          </div>

          {/* KPI Summary Quick Stats Strip */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 shrink-0">
            <div className="px-3 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 text-right">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 block">
                Total Baseline Units
              </span>
              <span className="text-base font-black font-mono text-slate-900 dark:text-white">
                {summaryTotals.baselineUnits}
              </span>
            </div>

            <div className="px-3 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 text-right">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 block">
                Total P6 Items
              </span>
              <span className="text-base font-black font-mono text-[#1E3A8A] dark:text-blue-400">
                {summaryTotals.p6Items}
              </span>
            </div>

            <div className="px-3 py-1.5 rounded-xl bg-blue-50/70 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 text-right">
              <span className="text-[10px] font-bold uppercase tracking-wider text-blue-700 dark:text-blue-300 block">
                Turnover CP Units
              </span>
              <span className="text-base font-black font-mono text-[#2563EB] dark:text-blue-300">
                {summaryTotals.turnoverCpUnits}
              </span>
            </div>

            <div className="px-3 py-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-300 dark:border-emerald-800 text-right">
              <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-800 dark:text-emerald-300 block">
                Overall % TO Complete
              </span>
              <span className="text-base font-black font-mono text-[#10B981]">
                {summaryTotals.toCompletePct}%
              </span>
            </div>

            <div className="px-3 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 text-right col-span-2 sm:col-span-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 block">
                Pending TO (Not CP)
              </span>
              <span className="text-base font-black font-mono text-emerald-600 dark:text-emerald-400 flex items-center justify-end gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-[#10B981] inline-block" />
                {summaryTotals.toNotCp}
              </span>
            </div>
          </div>
        </div>

        {/* Second Row: Interactive Area Filter + Search + TYPE + Execution Lead + Event + Reset */}
        <div className="flex flex-wrap items-center justify-between gap-2.5">
          {/* Left: Search + Dropdowns */}
          <div className="flex flex-wrap items-center gap-2 flex-1 min-w-[260px]">
            {/* Search Input */}
            <div className="relative flex-1 min-w-[210px] max-w-xs">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder={
                  isTh
                    ? 'ค้นหา WS No., Equipment No., Title...'
                    : 'Search WS No., Equipment No., Title...'
                }
                className="w-full pl-8 pr-7 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-medium text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs cursor-pointer"
                >
                  ✕
                </button>
              )}
            </div>

            {/* Filter by TYPE */}
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400">TYPE:</span>
              <select
                value={selectedType}
                onChange={e => {
                  setSelectedSummaryRowId(null);
                  setSelectedType(e.target.value as CpEquipType | 'All');
                }}
                className="px-2.5 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-bold text-slate-800 dark:text-slate-200 outline-none cursor-pointer"
              >
                <option value="All">All Types (8)</option>
                {BASELINE_DONUT_BY_TYPE.map(t => (
                  <option key={t.type} value={t.type}>
                    {t.type} ({t.count})
                  </option>
                ))}
              </select>
            </div>

            {/* Filter by Execution Lead */}
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400">Lead:</span>
              <select
                value={selectedExecutionLead}
                onChange={e => {
                  setSelectedSummaryRowId(null);
                  setSelectedExecutionLead(e.target.value as CpLeadParty | 'All');
                }}
                className="px-2.5 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-bold text-slate-800 dark:text-slate-200 outline-none cursor-pointer"
              >
                <option value="All">All Leads (UNT / TURBO / CKC)</option>
                <option value="UNT">UNT</option>
                <option value="TURBO">TURBO</option>
                <option value="CKC">CKC</option>
              </select>
            </div>

            {/* Shared Event Context Selector */}
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400">Event:</span>
              <select
                value={selectedEventName}
                onChange={e => setSelectedEventName(e.target.value)}
                className="px-2.5 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-200 outline-none cursor-pointer max-w-[180px] truncate"
              >
                <option value="All">SD25 / All TA Events</option>
                {events.map(ev => (
                  <option key={ev.id} value={ev.eventName}>
                    {ev.eventName}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Right: Interactive Area Filter Slicer Pills + Reset + CSV */}
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl border border-slate-200 dark:border-slate-700">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 px-2">
                Area:
              </span>
              <button
                type="button"
                onClick={selectAllAreas}
                className={`px-2.5 py-1 rounded-lg text-xs font-extrabold transition cursor-pointer ${
                  selectedAreas.length === 2
                    ? 'bg-[#1E3A8A] text-white shadow-2xs'
                    : 'text-slate-600 dark:text-slate-300 hover:bg-white/60'
                }`}
              >
                All
              </button>
              {(['S1', 'S2'] as CpAreaCode[]).map(area => {
                const isActive = selectedAreas.includes(area);
                return (
                  <button
                    key={area}
                    type="button"
                    onClick={() => toggleArea(area)}
                    className={`px-3 py-1 rounded-lg text-xs font-extrabold transition flex items-center gap-1 cursor-pointer ${
                      isActive
                        ? 'bg-[#A9D18E] text-slate-950 border border-[#70AD47] shadow-2xs'
                        : 'bg-white dark:bg-slate-900 text-slate-500 border border-slate-200 dark:border-slate-700'
                    }`}
                  >
                    <span
                      className={`w-3 h-3 rounded-xs flex items-center justify-center text-[9px] border ${
                        isActive
                          ? 'bg-slate-900 text-white border-slate-900'
                          : 'border-slate-400 bg-transparent'
                      }`}
                    >
                      {isActive && '✓'}
                    </span>
                    <span>{area}</span>
                  </button>
                );
              })}
            </div>

            {isAnyFilterActive && (
              <button
                type="button"
                onClick={handleResetAllFilters}
                className="px-3 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800 text-xs font-extrabold flex items-center gap-1.5 transition cursor-pointer shadow-2xs"
              >
                <RotateCcw size={13} />
                <span>{isTh ? 'ล้างตัวกรอง (Reset Filters)' : 'Reset Filters'}</span>
              </button>
            )}

            <button
              type="button"
              onClick={handleExportCsv}
              className="px-3 py-1.5 rounded-xl bg-[#1E3A8A] hover:bg-[#172554] text-white text-xs font-bold flex items-center gap-1.5 transition cursor-pointer shadow-2xs"
            >
              <Download size={13} />
              <span>Export CSV</span>
            </button>
          </div>
        </div>

        {/* Active Cross-Filter Pill Indicator Strip */}
        {isAnyFilterActive && (
          <div className="flex items-center gap-2 flex-wrap pt-1 text-[11px]">
            <span className="font-bold text-slate-500 flex items-center gap-1">
              <Filter size={12} className="text-blue-600" />
              Active Cross-Filters:
            </span>
            {selectedAreas.length < 2 && (
              <span className="px-2 py-0.5 rounded bg-[#A9D18E]/40 border border-[#70AD47] text-slate-900 dark:text-emerald-200 font-bold">
                Area: {selectedAreas.join(', ')}
              </span>
            )}
            {selectedType !== 'All' && (
              <span className="px-2 py-0.5 rounded bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 text-blue-800 dark:text-blue-300 font-bold">
                TYPE: {selectedType}
              </span>
            )}
            {selectedSystemNo !== null && (
              <span className="px-2 py-0.5 rounded bg-emerald-50 dark:bg-emerald-950 border border-emerald-300 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 font-bold">
                System No: Sys.{selectedSystemNo}
              </span>
            )}
            {selectedExecutionLead !== 'All' && (
              <span className="px-2 py-0.5 rounded bg-indigo-50 dark:bg-indigo-950 border border-indigo-200 dark:border-indigo-800 text-indigo-800 dark:text-indigo-300 font-bold">
                Execution Lead: {selectedExecutionLead}
              </span>
            )}
            {selectedSummaryRowId && (
              <span className="px-2 py-0.5 rounded bg-amber-50 dark:bg-amber-950 border border-amber-300 dark:border-amber-800 text-amber-900 dark:text-amber-300 font-bold">
                Matrix Row Selected
              </span>
            )}
          </div>
        )}
      </div>

      {/* =====================================================================
          2. UPPER TIER: 12-COLUMN SPLIT GRID (5 Cols + 4.5 Cols + 2.5 Cols)
             Implemented with 24-col grid on desktop: 10 + 9 + 5 = 24
         ===================================================================== */}
      <div className="grid grid-cols-1 lg:grid-cols-24 gap-4 items-stretch">
        {/* -------------------------------------------------------------------
            A. LEFT PANEL (5/12 = 10/24 Cols): SUMMARY MATRIX TABLE
           ------------------------------------------------------------------- */}
        <div className="lg:col-span-10 bg-white dark:bg-slate-900 rounded-xl border border-slate-300 dark:border-slate-800 shadow-xs overflow-hidden flex flex-col">
          {/* Sub-banner */}
          <div className="bg-[#002060] text-white px-3 py-2 flex items-center justify-between border-b border-blue-950">
            <div className="flex items-center gap-2">
              <Layers size={14} className="text-sky-300" />
              <span className="text-xs font-extrabold tracking-wide uppercase">
                Turnover CP Summary by Area / Unit / System
              </span>
            </div>
            <span className="text-[10px] font-mono text-sky-200">
              Click row to cross-filter ({filteredSummaryRows.length} groups)
            </span>
          </div>

          {/* Scrollable Matrix Table with Sticky Header & Sticky Total Footer */}
          <div className="overflow-x-auto overflow-y-auto max-h-[340px] flex-1">
            <table className="w-full text-[11px] border-collapse">
              <thead className="sticky top-0 z-20 bg-[#002060] text-white shadow-xs">
                <tr className="border-b border-blue-900">
                  <th className="py-1.5 px-2 text-center font-bold border-r border-blue-800/60">Area</th>
                  <th className="py-1.5 px-2 text-left font-bold border-r border-blue-800/60">Unit</th>
                  <th className="py-1.5 px-2 text-center font-bold border-r border-blue-800/60">TYPE</th>
                  <th className="py-1.5 px-2 text-center font-bold border-r border-blue-800/60">System No</th>
                  <th className="py-1.5 px-2 text-right font-bold border-r border-blue-800/60">Baseline Units</th>
                  <th className="py-1.5 px-2 text-right font-bold border-r border-blue-800/60">P6 item</th>
                  <th
                    onClick={() =>
                      setSummarySortDir(prev => (prev === 'desc' ? 'asc' : prev === 'asc' ? null : 'desc'))
                    }
                    className="py-1.5 px-2 text-right font-bold border-r border-blue-800/60 cursor-pointer hover:bg-blue-900/80 transition select-none"
                    title="Sort by Turnover CP Units"
                  >
                    <div className="inline-flex items-center justify-end gap-1">
                      <span>Turnover CP Units</span>
                      {summarySortDir === 'desc' ? (
                        <ArrowDown size={11} className="text-emerald-300" />
                      ) : summarySortDir === 'asc' ? (
                        <ArrowUp size={11} className="text-emerald-300" />
                      ) : (
                        <ArrowUpDown size={11} className="opacity-60" />
                      )}
                    </div>
                  </th>
                  <th className="py-1.5 px-2 text-center font-bold border-r border-blue-800/60">% TO Complete</th>
                  <th className="py-1.5 px-2 text-center font-bold">TO Not CP</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                {filteredSummaryRows.map((row, idx) => {
                  const isRowSelected =
                    selectedSummaryRowId === row.id ||
                    (selectedSystemNo === row.systemNo && selectedSummaryRowId === null);

                  return (
                    <tr
                      key={row.id}
                      onClick={() => {
                        if (selectedSummaryRowId === row.id) {
                          setSelectedSummaryRowId(null);
                          setSelectedSystemNo(null);
                        } else {
                          setSelectedSummaryRowId(row.id);
                          setSelectedSystemNo(row.systemNo);
                        }
                      }}
                      className={`cursor-pointer transition-colors ${
                        selectedSummaryRowId === row.id
                          ? 'bg-blue-100/90 dark:bg-blue-950/80 font-bold ring-1 ring-inset ring-blue-500'
                          : isRowSelected
                          ? 'bg-emerald-50/70 dark:bg-emerald-950/30'
                          : idx % 2 === 0
                          ? 'bg-white dark:bg-slate-900 hover:bg-slate-100/80 dark:hover:bg-slate-800/60'
                          : 'bg-slate-50/70 dark:bg-slate-800/30 hover:bg-slate-100/80 dark:hover:bg-slate-800/60'
                      }`}
                    >
                      <td className="py-1 px-2 text-center font-mono font-bold text-slate-800 dark:text-slate-200 border-r border-slate-200/70 dark:border-slate-800">
                        {row.area}
                      </td>
                      <td className="py-1 px-2 text-left font-semibold text-slate-800 dark:text-slate-200 border-r border-slate-200/70 dark:border-slate-800 whitespace-nowrap">
                        {row.unit}
                      </td>
                      <td className="py-1 px-2 text-center font-mono font-bold border-r border-slate-200/70 dark:border-slate-800">
                        <span
                          className="px-1.5 py-0.2 rounded text-[10px]"
                          style={{
                            backgroundColor: `${CP_TYPE_META[row.type].color}18`,
                            color: CP_TYPE_META[row.type].color,
                          }}
                        >
                          {row.type}
                        </span>
                      </td>
                      <td className="py-1 px-2 text-center font-mono font-bold text-slate-700 dark:text-slate-300 border-r border-slate-200/70 dark:border-slate-800">
                        {row.systemNo}
                      </td>
                      <td className="py-1 px-2 text-right font-mono text-slate-700 dark:text-slate-300 border-r border-slate-200/70 dark:border-slate-800">
                        {row.baselineUnits}
                      </td>
                      <td className="py-1 px-2 text-right font-mono text-slate-700 dark:text-slate-300 border-r border-slate-200/70 dark:border-slate-800">
                        {row.p6Items}
                      </td>
                      <td className="py-1 px-2 text-right font-mono font-bold text-slate-900 dark:text-white border-r border-slate-200/70 dark:border-slate-800">
                        {row.turnoverCpUnits}
                      </td>
                      <td className="py-1 px-1.5 text-center border-r border-slate-200/70 dark:border-slate-800">
                        <span
                          className={`inline-block w-full px-1.5 py-0.5 rounded font-mono font-extrabold text-[10px] ${
                            row.toCompletePct === 100
                              ? 'bg-[#10B981] text-white'
                              : 'bg-amber-500 text-white'
                          }`}
                        >
                          {row.toCompletePct}%
                        </span>
                      </td>
                      <td className="py-1 px-2 text-right font-mono font-bold">
                        <div className="inline-flex items-center justify-end gap-1.5 w-full">
                          <span
                            className={`w-2.5 h-2.5 rounded-full inline-block ${
                              row.toNotCp === 0 ? 'bg-[#10B981]' : 'bg-rose-500'
                            }`}
                          />
                          <span>{row.toNotCp}</span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>

              {/* Sticky Footer Row (Total) */}
              <tfoot className="sticky bottom-0 z-20 bg-[#0F172A] text-white font-mono text-[11px] font-extrabold shadow-inner">
                <tr>
                  <td colSpan={4} className="py-1.5 px-2.5 text-left uppercase tracking-wider border-r border-slate-700">
                    Total
                  </td>
                  <td className="py-1.5 px-2 text-right border-r border-slate-700">
                    {summaryTotals.baselineUnits}
                  </td>
                  <td className="py-1.5 px-2 text-right border-r border-slate-700">
                    {summaryTotals.p6Items}
                  </td>
                  <td className="py-1.5 px-2 text-right text-sky-300 border-r border-slate-700">
                    {summaryTotals.turnoverCpUnits}
                  </td>
                  <td className="py-1.5 px-1.5 text-center border-r border-slate-700">
                    <span className="inline-block w-full px-1.5 py-0.5 rounded bg-[#10B981] text-white font-extrabold text-[10px]">
                      {summaryTotals.toCompletePct}%
                    </span>
                  </td>
                  <td className="py-1.5 px-2 text-right">
                    <div className="inline-flex items-center justify-end gap-1.5 w-full">
                      <span className="w-2.5 h-2.5 rounded-full bg-[#10B981] inline-block" />
                      <span>{summaryTotals.toNotCp}</span>
                    </div>
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

        {/* -------------------------------------------------------------------
            B. CENTER PANEL (4.5/12 = 9/24 Cols): "CP Closing - By System" BAR CHART
           ------------------------------------------------------------------- */}
        <div className="lg:col-span-9 bg-white dark:bg-slate-900 rounded-xl border border-slate-300 dark:border-slate-800 shadow-xs overflow-hidden flex flex-col">
          {/* Dark Blue Banner */}
          <div className="bg-[#002060] text-white px-3.5 py-2 flex items-center justify-between">
            <span className="text-xs font-extrabold tracking-wide uppercase">
              CP Closing - By System
            </span>
            <div className="flex items-center gap-2 text-[11px] font-semibold">
              <span className="text-slate-200">Execution Status</span>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-white/10 text-emerald-300 font-bold">
                <span className="w-2.5 h-2.5 rounded-full bg-[#10B981] inline-block" />
                Completed
              </span>
            </div>
          </div>

          <div className="px-3 pt-2 pb-1 flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 border-b border-slate-100 dark:border-slate-800">
            <span>Click any system bar to filter work scopes</span>
            {selectedSystemNo !== null && (
              <button
                type="button"
                onClick={() => {
                  setSelectedSystemNo(null);
                  setSelectedSummaryRowId(null);
                }}
                className="text-blue-600 dark:text-blue-400 font-bold hover:underline cursor-pointer"
              >
                Clear System (Sys.{selectedSystemNo})
              </button>
            )}
          </div>

          <div className="flex-1 min-h-[300px] p-2">
            <ResponsiveContainer width="100%" height={305}>
              <BarChart
                data={systemBarChartData}
                margin={{ top: 22, right: 10, left: -12, bottom: 28 }}
                onClick={(state: any) => {
                  if (state && state.activePayload && state.activePayload.length > 0) {
                    const clickedSys = state.activePayload[0].payload.systemNo;
                    setSelectedSummaryRowId(null);
                    setSelectedSystemNo(prev => (prev === clickedSys ? null : clickedSys));
                  }
                }}
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                <XAxis
                  dataKey="label"
                  angle={-45}
                  textAnchor="end"
                  interval={0}
                  height={48}
                  tick={{ fontSize: 10, fontWeight: 700, fill: '#334155' }}
                />
                <YAxis
                  domain={[0, (dataMax: number) => Math.max(30, Math.ceil(dataMax * 1.15))]}
                  tick={{ fontSize: 10, fontWeight: 700, fill: '#475569' }}
                  label={{
                    value: 'Number of WS',
                    angle: -90,
                    position: 'insideLeft',
                    offset: 18,
                    style: { fontSize: 10, fontWeight: 700, fill: '#475569' },
                  }}
                />
                <Tooltip
                  cursor={{ fill: 'rgba(37, 99, 235, 0.08)' }}
                  contentStyle={{
                    backgroundColor: '#0F172A',
                    borderColor: '#1E293B',
                    borderRadius: '8px',
                    color: '#FFFFFF',
                    fontSize: '11px',
                    fontWeight: 700,
                  }}
                  formatter={(value: any) => [`${value} WS (Completed)`, 'Turnover CP']}
                />
                <Bar
                  dataKey="count"
                  radius={[3, 3, 0, 0]}
                  cursor="pointer"
                >
                  {systemBarChartData.map(entry => {
                    const isSelected = selectedSystemNo === null || selectedSystemNo === entry.systemNo;
                    return (
                      <Cell
                        key={`cell-${entry.systemNo}`}
                        fill={isSelected ? '#10B981' : '#94A3B8'}
                        stroke={selectedSystemNo === entry.systemNo ? '#065F46' : 'none'}
                        strokeWidth={selectedSystemNo === entry.systemNo ? 2 : 0}
                      />
                    );
                  })}
                  <LabelList
                    dataKey="count"
                    position="top"
                    style={{ fontSize: '10px', fontWeight: 800, fill: '#0F172A' }}
                  />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* -------------------------------------------------------------------
            C. RIGHT PANEL (2.5/12 = 5/24 Cols): "Turnover CP" DONUT + "Area" SLICER
           ------------------------------------------------------------------- */}
        <div className="lg:col-span-5 flex flex-col gap-3">
          {/* Top Card: "Turnover CP" Donut Chart */}
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-300 dark:border-slate-800 shadow-xs overflow-hidden flex-1 flex flex-col">
            <div className="bg-[#002060] text-white px-3 py-1.5 flex items-center justify-between">
              <span className="text-xs font-extrabold uppercase tracking-wide">
                Turnover CP
              </span>
              {selectedType !== 'All' && (
                <button
                  type="button"
                  onClick={() => setSelectedType('All')}
                  className="text-[10px] text-sky-300 hover:underline font-bold cursor-pointer"
                >
                  All ({selectedType})
                </button>
              )}
            </div>

            <div className="flex-1 flex flex-col items-center justify-center p-2">
              <div className="w-full h-[185px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={donutChartData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius={32}
                      outerRadius={56}
                      paddingAngle={1.5}
                      label={renderDonutCalloutLabel}
                      labelLine={{ stroke: '#94A3B8', strokeWidth: 1 }}
                      onClick={(entry: any) => {
                        if (entry && entry.name) {
                          const clickedType = entry.name as CpEquipType;
                          setSelectedSummaryRowId(null);
                          setSelectedType(prev => (prev === clickedType ? 'All' : clickedType));
                        }
                      }}
                    >
                      {donutChartData.map(entry => {
                        const isSelected = selectedType === 'All' || selectedType === entry.name;
                        return (
                          <Cell
                            key={`pie-${entry.name}`}
                            fill={entry.color}
                            opacity={isSelected ? 1 : 0.3}
                            stroke={selectedType === entry.name ? '#0F172A' : '#FFFFFF'}
                            strokeWidth={selectedType === entry.name ? 2 : 1}
                            style={{ cursor: 'pointer' }}
                          />
                        );
                      })}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#0F172A',
                        borderColor: '#1E293B',
                        borderRadius: '8px',
                        color: '#FFFFFF',
                        fontSize: '11px',
                        fontWeight: 700,
                      }}
                      formatter={(val: any, name: any) => [`${val} Units`, `TYPE: ${name}`]}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              {/* Compact Interactive Type Badges Grid */}
              <div className="grid grid-cols-4 gap-1 w-full px-1 pt-1 border-t border-slate-100 dark:border-slate-800">
                {BASELINE_DONUT_BY_TYPE.map(item => {
                  const liveItem = donutChartData.find(d => d.name === item.type);
                  const countVal = liveItem ? liveItem.value : 0;
                  const active = selectedType === item.type;
                  return (
                    <button
                      key={item.type}
                      type="button"
                      onClick={() => {
                        setSelectedSummaryRowId(null);
                        setSelectedType(prev => (prev === item.type ? 'All' : item.type));
                      }}
                      className={`px-1 py-0.5 rounded text-[10px] font-mono font-extrabold flex items-center justify-between border transition cursor-pointer ${
                        active
                          ? 'ring-2 ring-blue-600 bg-slate-900 text-white border-slate-900'
                          : 'bg-slate-50 dark:bg-slate-800/70 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      <span className="flex items-center gap-1">
                        <span
                          className="w-2 h-2 rounded-xs shrink-0"
                          style={{ backgroundColor: item.color }}
                        />
                        {item.type}
                      </span>
                      <span>{countVal}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Bottom Card: "Area" Slicer Box (Matching Reference Light Green #A9D18E Bars) */}
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-300 dark:border-slate-800 shadow-xs overflow-hidden">
            <div className="bg-[#002060] text-white px-3 py-1.5 flex items-center justify-between">
              <span className="text-xs font-extrabold uppercase tracking-wide">Area</span>
              <button
                type="button"
                onClick={selectAllAreas}
                className="text-[10px] text-sky-200 hover:text-white font-semibold cursor-pointer"
                title="Reset Area Selection"
              >
                Select All
              </button>
            </div>
            <div className="p-2.5 space-y-1.5">
              {(['S1', 'S2'] as CpAreaCode[]).map(areaCode => {
                const checked = selectedAreas.includes(areaCode);
                return (
                  <button
                    key={areaCode}
                    type="button"
                    onClick={() => toggleArea(areaCode)}
                    className={`w-full px-3 py-1.5 rounded-md border flex items-center justify-between text-xs font-extrabold transition cursor-pointer ${
                      checked
                        ? 'bg-[#A9D18E] text-slate-950 border-[#70AD47] shadow-2xs'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border-slate-300 dark:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className={`w-4 h-4 rounded-xs border flex items-center justify-center ${
                          checked
                            ? 'bg-white border-slate-800 text-slate-950'
                            : 'bg-white dark:bg-slate-900 border-slate-400'
                        }`}
                      >
                        {checked && <Check size={12} className="stroke-[3]" />}
                      </span>
                      <span className="font-mono tracking-wide">{areaCode}</span>
                    </div>
                    <span className="text-[10px] font-mono opacity-80">
                      {areaCode === 'S1' ? 'CCR / SRU / TGCU' : 'APS-1 / VPS-2 / GOHF-3'}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* =====================================================================
          3. LOWER TIER: FULL-WIDTH WORK SCOPE (WS) EXECUTION DETAIL TABLE
         ===================================================================== */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-300 dark:border-slate-800 shadow-xs overflow-hidden">
        {/* Table Title Bar */}
        <div className="bg-[#0F172A] text-white px-4 py-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <FileSpreadsheet size={16} className="text-[#10B981]" />
            <h2 className="text-xs sm:text-sm font-extrabold uppercase tracking-wide">
              Work Scope (WS) Execution Detail & Blind / EIC Control Register
            </h2>
            <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-mono text-[11px] font-bold border border-emerald-500/30">
              {filteredWsDetailRows.length} of {ALL_WS_DETAIL_ROWS.length} Work Scopes
            </span>
          </div>

          <div className="flex items-center gap-2 text-[11px] text-slate-300">
            <span>
              Total Blinds:{' '}
              <strong className="font-mono text-white">
                {filteredWsDetailRows.reduce((sum, r) => sum + r.blindQuantity, 0)}
              </strong>
            </span>
            <span>·</span>
            <span>Click any Work Scope row to inspect package & open Turnover Workspace</span>
          </div>
        </div>

        {/* Scrollable High-Density Table */}
        <div className="overflow-x-auto overflow-y-auto max-h-[460px]">
          <table className="w-full text-[11px] border-collapse">
            <thead className="sticky top-0 z-20 bg-[#002060] text-white shadow-xs">
              <tr className="border-b border-blue-900">
                <th className="py-2 px-2.5 text-center font-bold border-r border-blue-800/60 whitespace-nowrap">
                  Execution Lead
                </th>
                <th className="py-2 px-2 text-center font-bold border-r border-blue-800/60 whitespace-nowrap">
                  Area
                </th>
                <th className="py-2 px-2 text-center font-bold border-r border-blue-800/60 whitespace-nowrap">
                  TYPE
                </th>
                <th className="py-2 px-2.5 text-left font-bold border-r border-blue-800/60 whitespace-nowrap">
                  WS NO.
                </th>
                <th className="py-2 px-2.5 text-left font-bold border-r border-blue-800/60 whitespace-nowrap">
                  EQUIPMENT NO.
                </th>
                <th className="py-2 px-3 text-left font-bold border-r border-blue-800/60 min-w-[260px]">
                  WORK SCOPE TITLE
                </th>
                <th className="py-2 px-2 text-center font-bold border-r border-blue-800/60 whitespace-nowrap">
                  System No
                </th>
                <th className="py-2 px-2.5 text-center font-bold border-r border-blue-800/60 whitespace-nowrap">
                  EIC No.
                </th>
                <th className="py-2 px-2 text-center font-bold border-r border-blue-800/60 whitespace-nowrap">
                  Blind Quantity
                </th>
                <th className="py-2 px-2.5 text-left font-bold border-r border-blue-800/60 whitespace-nowrap">
                  Job Leader
                </th>
                <th className="py-2 px-2 text-center font-bold border-r border-blue-800/60 whitespace-nowrap">
                  Lead Party
                </th>
                <th className="py-2 px-2.5 text-center font-bold border-r border-blue-800/60 whitespace-nowrap">
                  BL Finish Date
                </th>
                <th
                  onClick={() => setWsDateSortDir(prev => (prev === 'asc' ? 'desc' : 'asc'))}
                  className="py-2 px-2.5 text-center font-bold border-r border-blue-800/60 whitespace-nowrap cursor-pointer hover:bg-blue-900 transition select-none"
                  title="Sort by P6 Finish Date"
                >
                  <div className="inline-flex items-center justify-center gap-1">
                    <span>P6 Finish Date</span>
                    {wsDateSortDir === 'asc' ? (
                      <ArrowUp size={11} className="text-emerald-300" />
                    ) : (
                      <ArrowDown size={11} className="text-emerald-300" />
                    )}
                  </div>
                </th>
                <th className="py-2 px-2.5 text-center font-bold whitespace-nowrap">
                  Status
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
              {filteredWsDetailRows.length > 0 ? (
                filteredWsDetailRows.map((row, index) => (
                  <tr
                    key={row.id}
                    onClick={() => setInspectedWsRow(row)}
                    className={`cursor-pointer transition-colors ${
                      index % 2 === 0
                        ? 'bg-white dark:bg-slate-900 hover:bg-blue-50/70 dark:hover:bg-slate-800/70'
                        : 'bg-slate-50/70 dark:bg-slate-800/30 hover:bg-blue-50/70 dark:hover:bg-slate-800/70'
                    }`}
                  >
                    <td className="py-1.5 px-2.5 text-center font-mono font-bold text-slate-800 dark:text-slate-200 border-r border-slate-200/70 dark:border-slate-800">
                      {row.executionLead}
                    </td>
                    <td className="py-1.5 px-2 text-center font-mono font-bold text-slate-800 dark:text-slate-200 border-r border-slate-200/70 dark:border-slate-800">
                      {row.area}
                    </td>
                    <td className="py-1.5 px-2 text-center font-mono font-bold border-r border-slate-200/70 dark:border-slate-800">
                      <span
                        className="px-1.5 py-0.5 rounded text-[10px]"
                        style={{
                          backgroundColor: `${CP_TYPE_META[row.type].color}18`,
                          color: CP_TYPE_META[row.type].color,
                        }}
                      >
                        {row.type}
                      </span>
                    </td>
                    <td className="py-1.5 px-2.5 text-left font-mono font-extrabold text-[#1E3A8A] dark:text-sky-400 border-r border-slate-200/70 dark:border-slate-800 whitespace-nowrap">
                      {row.wsNo}
                    </td>
                    <td className="py-1.5 px-2.5 text-left font-mono font-bold text-slate-900 dark:text-slate-100 border-r border-slate-200/70 dark:border-slate-800 whitespace-nowrap">
                      {row.equipmentNo}
                    </td>
                    <td className="py-1.5 px-3 text-left font-medium text-slate-800 dark:text-slate-200 border-r border-slate-200/70 dark:border-slate-800">
                      {row.workScopeTitle}
                    </td>
                    <td className="py-1.5 px-2 text-center font-mono font-bold text-slate-700 dark:text-slate-300 border-r border-slate-200/70 dark:border-slate-800">
                      {row.systemNo}
                    </td>
                    <td className="py-1.5 px-2.5 text-center font-mono text-slate-700 dark:text-slate-300 border-r border-slate-200/70 dark:border-slate-800 whitespace-nowrap">
                      {row.eicNo}
                    </td>
                    <td className="py-1.5 px-2 text-center font-mono font-bold text-slate-800 dark:text-slate-200 border-r border-slate-200/70 dark:border-slate-800">
                      {row.blindQuantity}
                    </td>
                    <td className="py-1.5 px-2.5 text-left font-semibold text-slate-800 dark:text-slate-200 border-r border-slate-200/70 dark:border-slate-800 whitespace-nowrap">
                      {row.jobLeader}
                    </td>
                    <td className="py-1.5 px-2 text-center font-mono font-bold text-slate-700 dark:text-slate-300 border-r border-slate-200/70 dark:border-slate-800">
                      {row.leadParty}
                    </td>
                    <td className="py-1.5 px-2.5 text-center font-mono text-slate-700 dark:text-slate-300 border-r border-slate-200/70 dark:border-slate-800 whitespace-nowrap">
                      {row.blFinishDate}
                    </td>
                    <td className="py-1.5 px-2.5 text-center font-mono font-semibold text-slate-800 dark:text-slate-200 border-r border-slate-200/70 dark:border-slate-800 whitespace-nowrap">
                      {row.p6FinishDate}
                    </td>
                    <td className="py-1.5 px-2.5 text-center whitespace-nowrap">
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded bg-[#10B981] text-white font-extrabold text-[10px] shadow-2xs">
                        <CheckCircle2 size={11} />
                        <span>{row.status}</span>
                      </span>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={14} className="py-10 text-center text-xs text-slate-400">
                    No Work Scope records match the active filters. Click &ldquo;Reset Filters&rdquo; to restore all 164 CP items.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* =====================================================================
          WORK SCOPE QUICK-INSPECT & HANDOVER WORKSPACE LINK MODAL
         ===================================================================== */}
      {inspectedWsRow && (
        <div
          className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150"
          onClick={() => setInspectedWsRow(null)}
        >
          <div
            className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl max-w-lg w-full overflow-hidden"
            onClick={e => e.stopPropagation()}
          >
            <div className="bg-[#002060] text-white px-5 py-3.5 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded bg-white/15 font-mono text-xs font-extrabold">
                  {inspectedWsRow.wsNo}
                </span>
                <span className="text-sm font-bold">{inspectedWsRow.equipmentNo}</span>
              </div>
              <button
                type="button"
                onClick={() => setInspectedWsRow(null)}
                className="text-slate-300 hover:text-white text-sm font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="p-5 space-y-4 text-xs">
              <div>
                <span className="text-[10px] font-bold uppercase text-slate-400 block">
                  Work Scope Title
                </span>
                <p className="text-sm font-extrabold text-slate-900 dark:text-white mt-0.5">
                  {inspectedWsRow.workScopeTitle}
                </p>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 bg-slate-50 dark:bg-slate-800/60 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800">
                <div>
                  <span className="text-[10px] text-slate-400 block">Area / Unit</span>
                  <span className="font-mono font-bold text-slate-900 dark:text-white">
                    {inspectedWsRow.area} · {inspectedWsRow.unit}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block">TYPE</span>
                  <span className="font-mono font-bold text-blue-600 dark:text-blue-400">
                    {CP_TYPE_META[inspectedWsRow.type].label}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block">System No</span>
                  <span className="font-mono font-bold text-slate-900 dark:text-white">
                    Sys.{inspectedWsRow.systemNo}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block">EIC Certificate No.</span>
                  <span className="font-mono font-bold text-slate-900 dark:text-white">
                    {inspectedWsRow.eicNo}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block">Blind Quantity</span>
                  <span className="font-mono font-bold text-slate-900 dark:text-white">
                    {inspectedWsRow.blindQuantity} Spades
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block">Job Leader / Lead</span>
                  <span className="font-bold text-slate-900 dark:text-white">
                    {inspectedWsRow.jobLeader} ({inspectedWsRow.leadParty})
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block">BL Finish Date</span>
                  <span className="font-mono text-slate-700 dark:text-slate-300">
                    {inspectedWsRow.blFinishDate}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block">P6 Finish Date</span>
                  <span className="font-mono text-slate-700 dark:text-slate-300">
                    {inspectedWsRow.p6FinishDate}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block">CP Status</span>
                  <span className="inline-flex items-center gap-1 font-extrabold text-emerald-600 dark:text-emerald-400">
                    <CheckCircle2 size={12} /> {inspectedWsRow.status}
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedSystemNo(inspectedWsRow.systemNo);
                    setInspectedWsRow(null);
                  }}
                  className="px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 font-bold hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                >
                  Filter by Sys.{inspectedWsRow.systemNo}
                </button>
                {onNavigateToWorkspace && (
                  <button
                    type="button"
                    onClick={() => {
                      const matchedJob = jobs.find(
                        j =>
                          (j.assetTag &&
                            j.assetTag.toLowerCase().includes(inspectedWsRow.equipmentNo.toLowerCase())) ||
                          j.system.includes(inspectedWsRow.systemNo)
                      );
                      if (matchedJob) {
                        setSelectedJobId(matchedJob.id);
                      }
                      setInspectedWsRow(null);
                      onNavigateToWorkspace(matchedJob?.id);
                    }}
                    className="px-4 py-2 rounded-xl bg-[#1E3A8A] hover:bg-[#172554] text-white font-bold flex items-center gap-1.5 cursor-pointer shadow-xs"
                  >
                    <ExternalLink size={13} />
                    <span>Open in Turnover Workspace</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
