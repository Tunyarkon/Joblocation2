import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from './ui/card';
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from './ui/table';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Input } from './ui/input';
import { Checkbox } from './ui/checkbox';
import { QRCodeSVG } from 'qrcode.react';
import { useLanguage } from '../context/LanguageContext';
import { 
  Workflow, CheckCircle2, AlertTriangle, Clock, ShieldCheck, 
  ArrowRight, FileText, Wrench, ShieldAlert, Award, 
  Building2, UserCheck, HardHat, FileSpreadsheet, Eye, 
  Send, ChevronRight, XCircle, RotateCcw, AlertCircle, 
  Sparkles, Check, CheckSquare, QrCode, Upload, FileUp, 
  Flame, Gauge, Zap, PlayCircle, Lock, Smartphone, Camera, ExternalLink, Activity,
  Download, X, CheckCheck, FileCheck, Layers, FileDown, FolderPlus, Tag, Calendar as CalendarIcon
} from 'lucide-react';
import CreateTurnoverSheet, { CreateSystemTurnoverFormValues } from './CreateTurnoverSheet';

export type StageId = 1 | 2 | 3 | 4;
export type UserPersona = 'Operator' | 'Technical' | 'Engineer';

interface StageInfo {
  id: StageId;
  name: string;
  tag: string;
  desc: string;
  badge: string;
}

const STAGES: StageInfo[] = [
  {
    id: 1,
    name: 'Stage 1: Punch & Butt Walk',
    tag: 'Field Walk & QR Verify',
    desc: 'Butt list walk to verify field completion, scan on-site QR codes, review uploaded inspection dossiers.',
    badge: 'Butt List & QR'
  },
  {
    id: 2,
    name: 'Stage 2: Complete Closing Form',
    tag: 'EIC Complete & Sign-off',
    desc: 'Verify EIC discipline completion packages and execute digital sign-offs for Appendix A.',
    badge: 'Appendix A Sign'
  },
  {
    id: 3,
    name: 'Stage 3: Box Up / De-blind',
    tag: 'On-site QR & Appendix B',
    desc: 'Scan on-site vessel QR, execute Appendix B digital box-up, dispatch Flange Police & resolve rejects.',
    badge: 'QR & Appendix B'
  },
  {
    id: 4,
    name: 'Stage 4: Closing & Handover',
    tag: 'PSSR & Start-up Sanction',
    desc: 'Execute Pre-Startup Safety Review (PSSR), verify operational sanctioning, grant startup authorization.',
    badge: 'PSSR & Sanction'
  }
];

export interface SystemRecord {
  id: string;
  systemNo: string;
  unitNo: string;
  workOrderNo: string;
  businessTeam: string;
  turnoverLead: string;
  plannedTurnoverDate: string | Date;
  jobDescription: string;
  status: string;
}

const DEFAULT_SYSTEMS: SystemRecord[] = [
  {
    id: 'sys-11',
    systemNo: 'System-11',
    unitNo: 'APS-1',
    workOrderNo: 'WO-2026-9042',
    businessTeam: 'BT-1 (Refinery Heavy Oils & Cracking)',
    turnoverLead: 'Somchai Prasert (Lead Commissioning Eng)',
    plannedTurnoverDate: '2026-09-30',
    jobDescription: 'Crude Distillation & Fractionation Unit Overhaul: Overhaul of Crude Distillation Column 11-C-101 internal trays, Reboiler 11-E-101A/B bundle extraction, and furnace coil decoking.',
    status: 'In Progress (Active)'
  },
  {
    id: 'sys-22',
    systemNo: 'System-22',
    unitNo: 'KHF-1',
    workOrderNo: 'WO-2026-8819',
    businessTeam: 'BT-2 (Light Ends & Distillation)',
    turnoverLead: 'Dr. Anan Sakda (Technical Authority)',
    plannedTurnoverDate: '2026-10-05',
    jobDescription: 'Kerosene Hydrotreater Reactor Section: catalyst regeneration loop and effluent cooler tube retubing.',
    status: 'Planned'
  }
];

interface TurnoverCoordinatorProps {
  onOpenCheckSheetTab?: (tab: string) => void;
  onOpenActivityLog?: () => void;
  isCreateSheetOpenProp?: boolean;
  onOpenCreateSheet?: () => void;
  onCloseCreateSheet?: () => void;
}

export default function TurnoverCoordinator({ 
  onOpenCheckSheetTab, 
  onOpenActivityLog,
  isCreateSheetOpenProp,
  onOpenCreateSheet,
  onCloseCreateSheet 
}: TurnoverCoordinatorProps) {
  const { isTh } = useLanguage();
  const [activeStage, setActiveStage] = useState<StageId>(1);
  const [persona, setPersona] = useState<UserPersona>('Engineer');

  // ================= SYSTEM TURNOVER REGISTRY STATE =================
  const [registeredSystems, setRegisteredSystems] = useState<SystemRecord[]>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('system_turnover_records');
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed) && parsed.length > 0) {
            return [...parsed, ...DEFAULT_SYSTEMS];
          }
        }
      } catch (e) {
        console.error(e);
      }
    }
    return DEFAULT_SYSTEMS;
  });
  const [selectedSystemId, setSelectedSystemId] = useState<string>('sys-11');
  const [isInternalCreateOpen, setIsInternalCreateOpen] = useState(false);

  const isCreateOpen = isCreateSheetOpenProp !== undefined ? isCreateSheetOpenProp : isInternalCreateOpen;
  const setCreateOpen = (val: boolean) => {
    if (val) {
      if (onOpenCreateSheet) onOpenCreateSheet();
      else setIsInternalCreateOpen(true);
    } else {
      if (onCloseCreateSheet) onCloseCreateSheet();
      else setIsInternalCreateOpen(false);
    }
  };

  const currentSystem = registeredSystems.find(s => s.id === selectedSystemId) || registeredSystems[0];

  // ================= BATCH SELECTION & ACTION STATE =================
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [showRejectModal, setShowRejectModal] = useState<boolean>(false);
  const [rejectReasonPreset, setRejectReasonPreset] = useState<string>('Missing NDT / RT film inspection certificate');
  const [customRejectReason, setCustomRejectReason] = useState<string>('');
  const [toastMessage, setToastMessage] = useState<{ type: 'success' | 'danger' | 'info'; text: string } | null>(null);

  // ================= STAGE 1: Punch & Butt Walk + QR On-site =================
  const [buttItems, setButtItems] = useState([
    { id: 'bt-1', buttNo: 'BL-11-01', location: '11-E-101A Channel Head Weld Butt #04', discipline: 'Piping', contractorPlan: '2026-09-23 (Weld pass)', completionCp: '2026-09-24 (RT Cleared)', fieldVerified: true, verifiedBy: 'Tech. Somchai', status: 'Completed', rejectReason: '' },
    { id: 'bt-2', buttNo: 'BL-11-02', location: '11-C-101 Feed Inlet Butt Weld #12', discipline: 'Mechanical', contractorPlan: '2026-09-23 (Fit up)', completionCp: '2026-09-24 (PMI passed)', fieldVerified: true, verifiedBy: 'Eng. Narong B.', status: 'Completed', rejectReason: '' },
    { id: 'bt-3', buttNo: 'BL-11-03', location: '11-P-101A Suction Strainer Butt Joint', discipline: 'Mechanical', contractorPlan: '2026-09-24 (Alignment)', completionCp: 'Pending Torque Test', fieldVerified: false, verifiedBy: 'Awaiting Walk', status: 'In Progress', rejectReason: '' },
    { id: 'bt-4', buttNo: 'BL-11-04', location: '11-V-104 Vapor Line Tie-in Butt Joint #08', discipline: 'Piping', contractorPlan: '2026-09-24 (PWHT)', completionCp: '2026-09-24 (Hardness Test)', fieldVerified: true, verifiedBy: 'Op. Supot K.', status: 'Completed', rejectReason: '' },
    { id: 'bt-5', buttNo: 'BL-11-05', location: '11-H-101 Convection Bank Header Return Butt #02', discipline: 'Piping', contractorPlan: '2026-09-24 (PWHT)', completionCp: 'Pending Magnetic Particle MT', fieldVerified: false, verifiedBy: 'Pending MT Test', status: 'In Progress', rejectReason: '' },
    { id: 'bt-6', buttNo: 'BL-11-06', location: '11-E-102B Shell Reboiler Return Flange Weld', discipline: 'Mechanical', contractorPlan: '2026-09-24 (Hydrotest)', completionCp: '2026-09-24 (Pass 28 barG)', fieldVerified: true, verifiedBy: 'Tech. Somchai', status: 'Completed', rejectReason: '' }
  ]);

  const [uploadedDocs, setUploadedDocs] = useState([
    { id: 'doc-1', docNo: 'NDT-26-011', title: 'Radiographic Examination (RT) Film Report - 11-E-101A', type: 'NDT Certificate', uploadedBy: 'QA Inspector', time: '2026-09-24 10:15', size: '3.4 MB', verified: true, status: 'Approved', rejectReason: '' },
    { id: 'doc-2', docNo: 'PMI-26-042', title: 'Positive Material Identification (PMI) Alloy 20 Flange Report', type: 'Metallurgy Dossier', uploadedBy: 'TSS Metallurgist', time: '2026-09-24 11:30', size: '1.8 MB', verified: true, status: 'Approved', rejectReason: '' },
    { id: 'doc-3', docNo: 'HYD-26-088', title: 'Hydrostatic Pressure Test Chart - Circuit 11-HC-301 (32 barG)', type: 'Hydrotest Record', uploadedBy: 'Piping EIC', time: '2026-09-24 13:45', size: '5.2 MB', verified: true, status: 'Approved', rejectReason: '' },
    { id: 'doc-4', docNo: 'TRQ-26-104', title: 'Flange Bolt Hydraulic Tensioning Calibration Certificate', type: 'Torque Audit', uploadedBy: 'Mechanical Lead', time: '2026-09-24 14:10', size: '2.1 MB', verified: false, status: 'Pending Review', rejectReason: '' },
    { id: 'doc-5', docNo: 'FME-26-019', title: 'Foreign Material Exclusion (FME) Cleanliness Sweep Dossier', type: 'QA/QC Cleanliness', uploadedBy: 'Inspector Wichit', time: '2026-09-24 14:50', size: '4.6 MB', verified: true, status: 'Approved', rejectReason: '' }
  ]);

  // QR Simulator state
  const [activeQrTarget, setActiveQrTarget] = useState<string | null>(null);
  const [scannedTagInfo, setScannedTagInfo] = useState<string | null>(null);
  const [scanSuccessMessage, setScanSuccessMessage] = useState<string | null>(null);

  // ================= STAGE 2: Complete Closing Form + Digital Sign-off Appendix A =================
  const [appendixASignoffs, setAppendixASignoffs] = useState([
    { id: 'app-a-1', equipment: 'Heat Exchanger 11-E-101A/B', inspectionTask: 'Bundle insertion, pass partition gasket check & channel head torque', pesSigned: true, pesName: 'Eng. Somchai P.', pesDate: '2026-09-24 14:00', tssSigned: true, tssName: 'Dr. Anan S.', tssDate: '2026-09-24 14:15', opsSigned: false, opsName: 'Op. Supot K.', opsDate: '', status: 'Hold / Pending', rejectReason: '' },
    { id: 'app-a-2', equipment: 'Crude Fractionator Tower 11-C-101', inspectionTask: 'Tray #1 to #36 cleanliness sweep, downcomer clamp tightness, FME check', pesSigned: true, pesName: 'Eng. Somchai P.', pesDate: '2026-09-24 14:00', tssSigned: true, tssName: 'Dr. Anan S.', tssDate: '2026-09-24 14:15', opsSigned: true, opsName: 'Op. Supot K.', opsDate: '2026-09-24 15:30', status: 'Approved to Box Up', rejectReason: '' },
    { id: 'app-a-3', equipment: 'Pre-flash Separator Drum 11-V-104', inspectionTask: 'Demister pad inspection, vortex breaker clearing, bottom nozzle inspection', pesSigned: true, pesName: 'Eng. Somchai P.', pesDate: '2026-09-24 14:00', tssSigned: false, tssName: 'Dr. Anan S.', tssDate: '', opsSigned: false, opsName: 'Op. Supot K.', opsDate: '', status: 'Hold / Pending', rejectReason: '' },
    { id: 'app-a-4', equipment: 'Charge Furnace 11-H-101 Firebox', inspectionTask: 'Refractory integrity survey, burner tile alignment, tube skin TC check', pesSigned: true, pesName: 'Eng. Somchai P.', pesDate: '2026-09-24 14:00', tssSigned: true, tssName: 'Dr. Anan S.', tssDate: '2026-09-24 14:15', opsSigned: true, opsName: 'Op. Supot K.', opsDate: '2026-09-24 16:00', status: 'Approved to Box Up', rejectReason: '' }
  ]);

  const [appendixAStatementAgreed, setAppendixAStatementAgreed] = useState(true);

  // ================= STAGE 3: Box Up / De-blind + Scan QR On site + Appendix B Sign =================
  const [appendixBExceptions, setAppendixBExceptions] = useState([
    { id: 'app-b-1', tag: 'V-11-M1', equipment: '11-C-101 Bottom Manhole M1', exceptionDesc: 'Temporary FME mesh removed; final closure with new 24" 300# spiral gasket', signedBy: 'Job Leader (Wichai P.)', tssWitness: 'TSS-Kamon.P', date: '2026-09-24', status: 'Box-Up Authorized', rejectReason: '' },
    { id: 'app-b-2', tag: 'V-11-M2', equipment: '11-V-104 Top Head Manway', exceptionDesc: 'Internal visual check completed. Nitrogen blanketing purge point configured', signedBy: 'Job Leader (Wichai P.)', tssWitness: 'TSS-Kamon.P', date: '2026-09-24', status: 'Box-Up Authorized', rejectReason: '' },
    { id: 'app-b-3', tag: 'V-11-M3', equipment: '11-E-101A Channel Cover M3', exceptionDesc: 'Pass partition baffle verified aligned; torque check to 480 Nm with 4-stage cross-pattern', signedBy: 'Awaiting Sign-off', tssWitness: 'Pending TSS', date: '2026-09-24', status: 'Under Review', rejectReason: '' }
  ]);

  const [stage3Blinds, setStage3Blinds] = useState([
    { id: 'bld-01', tag: 'BLD-11-01', service: '11-E-101A Shell Inlet (8" 300#)', qrScanned: true, deBlinded: true, confirmedBy: 'Operator Supot K.', timestamp: '14:20', status: 'De-Blinded (Open)', rejectReason: '' },
    { id: 'bld-02', tag: 'BLD-11-02', service: '11-C-101 Overhead Vapor (16" 150#)', qrScanned: true, deBlinded: true, confirmedBy: 'Operator Supot K.', timestamp: '14:45', status: 'De-Blinded (Open)', rejectReason: '' },
    { id: 'bld-03', tag: 'BLD-11-03', service: '11-V-104 Bottom Drain (3" 300#)', qrScanned: false, deBlinded: false, confirmedBy: 'Scan Required', timestamp: '-', status: 'Blind Installed', rejectReason: '' },
    { id: 'bld-04', tag: 'BLD-11-04', service: '11-P-101A Pump Discharge Isolation (4" 600#)', qrScanned: true, deBlinded: true, confirmedBy: 'Tech. Somchai', timestamp: '15:10', status: 'De-Blinded (Open)', rejectReason: '' }
  ]);

  // ================= STAGE 4: Closing + PSSR / Sanctioning / Start up =================
  const [pssrChecklist, setPssrChecklist] = useState([
    { id: 'pssr-1', category: 'Safety & Safeguarding', item: 'Relief valves (PSV-1101/02) bench tested, installed with intact lead car-seals', status: true, owner: 'Technical (Safety)', signed: 'Dr. Anan S.', rejectReason: '' },
    { id: 'pssr-2', category: 'Operational Readiness', item: 'Process boundary blind reversal verified 100% against P&ID master schedule', status: true, owner: 'Operator (Field)', signed: 'Supot K.', rejectReason: '' },
    { id: 'pssr-3', category: 'Instrumentation & Interlocks', item: 'Emergency Shutdown (ESD) loop 11-ESD-01 trip solenoids functionally verified', status: true, owner: 'Engineer (Instrument)', signed: 'Somkiat P.', rejectReason: '' },
    { id: 'pssr-4', category: 'Tightness & Inerting', item: 'Nitrogen leak test at 6 barG completed with 0.0 bar/hr pressure drop. O2 < 0.5%', status: false, owner: 'Operator (Operations)', signed: 'Pending N2 Pressurization', rejectReason: '' },
    { id: 'pssr-5', category: 'Fire & Gas Protection', item: 'Hydrocarbon LEL detectors and flame detectors online and calibrated', status: true, owner: 'Technical (F&G)', signed: 'Wichit S.', rejectReason: '' }
  ]);

  const [sanctioningStatus, setSanctioningStatus] = useState({
    hydrocarbonIntroductionGranted: false,
    opsManagerSanctioned: false,
    leadEngineerSanctioned: true,
    technicalManagerSanctioned: true,
    sanctionDate: '',
    sanctionCertNo: 'SANCT-2026-SYS11-CRUDE'
  });

  // ================= SELECTION LOGIC =================
  const toggleSelectItem = (id: string) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const toggleSelectAllInList = (ids: string[]) => {
    const allSelected = ids.every(id => selectedIds.includes(id));
    if (allSelected) {
      setSelectedIds(prev => prev.filter(id => !ids.includes(id)));
    } else {
      setSelectedIds(prev => Array.from(new Set([...prev, ...ids])));
    }
  };

  const deselectIdsInList = (ids: string[]) => {
    setSelectedIds(prev => prev.filter(id => !ids.includes(id)));
  };

  const clearSelection = () => {
    setSelectedIds([]);
  };

  // ================= BATCH APPROVE =================
  const handleBatchApprove = () => {
    if (selectedIds.length === 0) return;
    const now = new Date().toISOString().slice(0, 16).replace('T', ' ');
    const timeNow = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const today = new Date().toISOString().slice(0, 10);
    const verifierTag = `${persona} (${persona === 'Operator' ? 'Supot K.' : persona === 'Technical' ? 'Dr. Anan S.' : 'Narong B.'})`;

    // Update Stage 1 Butt Items
    setButtItems(prev => prev.map(item => {
      if (selectedIds.includes(item.id)) {
        return {
          ...item,
          fieldVerified: true,
          verifiedBy: `${verifierTag} - Batch Approved`,
          status: 'Completed',
          rejectReason: ''
        };
      }
      return item;
    }));

    // Update Stage 1 Uploaded Docs
    setUploadedDocs(prev => prev.map(doc => {
      if (selectedIds.includes(doc.id)) {
        return {
          ...doc,
          verified: true,
          status: 'Approved',
          rejectReason: ''
        };
      }
      return doc;
    }));

    // Update Stage 2 Appendix A
    setAppendixASignoffs(prev => prev.map(row => {
      if (selectedIds.includes(row.id)) {
        return {
          ...row,
          pesSigned: true,
          pesDate: row.pesDate || now,
          tssSigned: true,
          tssDate: row.tssDate || now,
          opsSigned: true,
          opsDate: row.opsDate || now,
          status: 'Approved to Box Up',
          rejectReason: ''
        };
      }
      return row;
    }));

    // Update Stage 3 Blinds
    setStage3Blinds(prev => prev.map(b => {
      if (selectedIds.includes(b.id)) {
        return {
          ...b,
          deBlinded: true,
          qrScanned: true,
          confirmedBy: `${persona} Batch Authorized`,
          timestamp: timeNow,
          status: 'De-Blinded (Open)',
          rejectReason: ''
        };
      }
      return b;
    }));

    // Update Stage 3 Appendix B
    setAppendixBExceptions(prev => prev.map(exc => {
      if (selectedIds.includes(exc.id)) {
        return {
          ...exc,
          status: 'Box-Up Authorized',
          signedBy: `Job Leader / ${persona} (Batch)`,
          date: today,
          rejectReason: ''
        };
      }
      return exc;
    }));

    // Update Stage 4 PSSR
    setPssrChecklist(prev => prev.map(p => {
      if (selectedIds.includes(p.id)) {
        return {
          ...p,
          status: true,
          signed: `${persona} - Cleared (${timeNow})`,
          rejectReason: ''
        };
      }
      return p;
    }));

    const approvedCount = selectedIds.length;
    setToastMessage({
      type: 'success',
      text: isTh 
        ? `อนุมัติสำเร็จ: ${approvedCount} รายการได้รับการตรวจสอบและลงนามอนุมัติโดย ${persona}`
        : `Batch Approved: ${approvedCount} document(s) & inspection record(s) formally approved by ${persona}.`
    });
    setSelectedIds([]);
  };

  // ================= BATCH REJECT =================
  const handleConfirmBatchReject = () => {
    if (selectedIds.length === 0) return;
    const finalReason = customRejectReason.trim() || rejectReasonPreset;
    const now = new Date().toISOString().slice(0, 16).replace('T', ' ');

    // Update Stage 1 Butt Items
    setButtItems(prev => prev.map(item => {
      if (selectedIds.includes(item.id)) {
        return {
          ...item,
          fieldVerified: false,
          verifiedBy: `Rejected by ${persona}`,
          status: 'Rejected',
          rejectReason: finalReason
        };
      }
      return item;
    }));

    // Update Stage 1 Uploaded Docs
    setUploadedDocs(prev => prev.map(doc => {
      if (selectedIds.includes(doc.id)) {
        return {
          ...doc,
          verified: false,
          status: 'Rejected',
          rejectReason: finalReason
        };
      }
      return doc;
    }));

    // Update Stage 2 Appendix A
    setAppendixASignoffs(prev => prev.map(row => {
      if (selectedIds.includes(row.id)) {
        return {
          ...row,
          pesSigned: false,
          tssSigned: false,
          opsSigned: false,
          status: 'Rejected / Hold',
          rejectReason: finalReason
        };
      }
      return row;
    }));

    // Update Stage 3 Blinds
    setStage3Blinds(prev => prev.map(b => {
      if (selectedIds.includes(b.id)) {
        return {
          ...b,
          deBlinded: false,
          confirmedBy: `Rejected by ${persona}`,
          status: 'Rejected',
          rejectReason: finalReason
        };
      }
      return b;
    }));

    // Update Stage 3 Appendix B
    setAppendixBExceptions(prev => prev.map(exc => {
      if (selectedIds.includes(exc.id)) {
        return {
          ...exc,
          status: 'Rejected',
          signedBy: `Rejected by ${persona}`,
          rejectReason: finalReason
        };
      }
      return exc;
    }));

    // Update Stage 4 PSSR
    setPssrChecklist(prev => prev.map(p => {
      if (selectedIds.includes(p.id)) {
        return {
          ...p,
          status: false,
          signed: `Rejected by ${persona}`,
          rejectReason: finalReason
        };
      }
      return p;
    }));

    const rejectedCount = selectedIds.length;
    setToastMessage({
      type: 'danger',
      text: isTh
        ? `ไม่อนุมัติ/ส่งกลับ: ${rejectedCount} รายการถูกบันทึกปฏิเสธเนื่องจาก "${finalReason}"`
        : `Batch Rejected: ${rejectedCount} item(s) rejected with reason: "${finalReason}". Remediation required.`
    });
    setSelectedIds([]);
    setShowRejectModal(false);
    setCustomRejectReason('');
  };

  // ================= EXPORT SELECTED =================
  const handleExportSelected = () => {
    if (selectedIds.length === 0) return;

    const exportRows: string[][] = [
      ['Turnover Module', 'Item ID', 'Reference / Tag', 'Scope / Location / Description', 'Discipline / Category', 'Status', 'Verified / Signed By', 'Rejection Reason', 'Exported At']
    ];
    const timestamp = new Date().toISOString().replace('T', ' ').slice(0, 19);

    // Collect Stage 1 Butt Items
    buttItems.forEach(b => {
      if (selectedIds.includes(b.id)) {
        exportRows.push([
          'Stage 1: Butt List Walk',
          b.id,
          b.buttNo,
          b.location,
          b.discipline,
          b.status,
          b.verifiedBy,
          b.rejectReason || 'N/A',
          timestamp
        ]);
      }
    });

    // Collect Stage 1 Uploaded Docs
    uploadedDocs.forEach(d => {
      if (selectedIds.includes(d.id)) {
        exportRows.push([
          'Stage 1: Document Dossier',
          d.id,
          d.docNo,
          d.title,
          d.type,
          d.status,
          d.uploadedBy,
          d.rejectReason || 'N/A',
          timestamp
        ]);
      }
    });

    // Collect Stage 2 Appendix A
    appendixASignoffs.forEach(a => {
      if (selectedIds.includes(a.id)) {
        exportRows.push([
          'Stage 2: Appendix A Sign-Off',
          a.id,
          a.equipment,
          a.inspectionTask,
          'Equipment Closing',
          a.status,
          `PES:${a.pesSigned ? 'Signed' : 'Open'} | TSS:${a.tssSigned ? 'Signed' : 'Open'} | OPS:${a.opsSigned ? 'Signed' : 'Open'}`,
          a.rejectReason || 'N/A',
          timestamp
        ]);
      }
    });

    // Collect Stage 3 Blinds
    stage3Blinds.forEach(bld => {
      if (selectedIds.includes(bld.id)) {
        exportRows.push([
          'Stage 3: De-Blind Registry',
          bld.id,
          bld.tag,
          bld.service,
          'Positive Isolation',
          bld.status,
          bld.confirmedBy,
          bld.rejectReason || 'N/A',
          timestamp
        ]);
      }
    });

    // Collect Stage 3 Appendix B
    appendixBExceptions.forEach(exc => {
      if (selectedIds.includes(exc.id)) {
        exportRows.push([
          'Stage 3: Appendix B Manway',
          exc.id,
          exc.tag,
          `${exc.equipment} - ${exc.exceptionDesc}`,
          'Manway Box-Up',
          exc.status,
          `${exc.signedBy} / ${exc.tssWitness}`,
          exc.rejectReason || 'N/A',
          timestamp
        ]);
      }
    });

    // Collect Stage 4 PSSR
    pssrChecklist.forEach(p => {
      if (selectedIds.includes(p.id)) {
        exportRows.push([
          'Stage 4: PSSR Checklist',
          p.id,
          p.category,
          p.item,
          p.owner,
          p.status ? 'PASSED' : 'HOLD',
          p.signed,
          p.rejectReason || 'N/A',
          timestamp
        ]);
      }
    });

    const csvContent = '\uFEFF' + exportRows.map(row => 
      row.map(field => `"${String(field || '').replace(/"/g, '""')}"`).join(',')
    ).join('\r\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Turnover_Selected_Dossier_Stage${activeStage}_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    setToastMessage({
      type: 'info',
      text: isTh
        ? `ส่งออกข้อมูลสำเร็จ: ดาวน์โหลดไฟล์ CSV สำหรับ ${selectedIds.length} รายการที่เลือกเรียบร้อยแล้ว`
        : `Export Complete: Generated and downloaded CSV dossier with ${selectedIds.length} selected record(s).`
    });
  };

  // Handler for QR simulation
  const handleSimulateScan = (qrCodeString: string, label: string) => {
    setActiveQrTarget(qrCodeString);
    setScannedTagInfo(label);
    setScanSuccessMessage(`Successfully scanned ${label} on-site via tablet camera! Inspection checklist & document dossiers synchronised.`);
  };

  const handleVerifyButtItem = (id: string) => {
    setButtItems(prev => prev.map(item => {
      if (item.id === id) {
        const next = !item.fieldVerified;
        return {
          ...item,
          fieldVerified: next,
          verifiedBy: next ? `${persona} (${persona === 'Operator' ? 'Supot K.' : persona === 'Technical' ? 'Dr. Anan S.' : 'Narong B.'})` : 'Pending Walk',
          status: next ? 'Completed' : 'In Progress',
          rejectReason: next ? '' : item.rejectReason
        };
      }
      return item;
    }));
  };

  const handleSignAppendixA = (id: string, role: 'pes' | 'tss' | 'ops') => {
    setAppendixASignoffs(prev => prev.map(row => {
      if (row.id === id) {
        const next = role === 'pes' ? !row.pesSigned : role === 'tss' ? !row.tssSigned : !row.opsSigned;
        const now = new Date().toISOString().slice(0, 16).replace('T', ' ');
        const updated = { ...row };
        if (role === 'pes') {
          updated.pesSigned = next;
          updated.pesDate = next ? now : '';
        } else if (role === 'tss') {
          updated.tssSigned = next;
          updated.tssDate = next ? now : '';
        } else {
          updated.opsSigned = next;
          updated.opsDate = next ? now : '';
        }
        const allSigned = updated.pesSigned && updated.tssSigned && updated.opsSigned;
        updated.status = allSigned ? 'Approved to Box Up' : 'Hold / Pending';
        return updated;
      }
      return row;
    }));
  };

  const handleToggleBlindDeBlind = (id: string) => {
    setStage3Blinds(prev => prev.map(b => {
      if (b.id === id) {
        const next = !b.deBlinded;
        return {
          ...b,
          deBlinded: next,
          qrScanned: next ? true : b.qrScanned,
          confirmedBy: next ? `${persona} On-site` : 'Scan Required',
          timestamp: next ? new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '-',
          status: next ? 'De-Blinded (Open)' : 'Blind Installed'
        };
      }
      return b;
    }));
  };

  const handleTogglePssr = (id: string) => {
    setPssrChecklist(prev => prev.map(p => {
      if (p.id === id) {
        const next = !p.status;
        return {
          ...p,
          status: next,
          signed: next ? `${persona} (${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })})` : 'Pending',
          rejectReason: next ? '' : p.rejectReason
        };
      }
      return p;
    }));
  };

  const handleExecuteSanction = () => {
    setSanctioningStatus(prev => ({
      ...prev,
      hydrocarbonIntroductionGranted: true,
      opsManagerSanctioned: true,
      sanctionDate: new Date().toISOString().slice(0, 10)
    }));
  };

  // Reusable Table Action Row Component
  const renderTableActionRow = (tableItemIds: string[], tableName: string) => {
    const selectedInTable = tableItemIds.filter(id => selectedIds.includes(id));
    if (selectedInTable.length === 0) return null;

    const allInTableSelected = selectedInTable.length === tableItemIds.length;

    return (
      <div className="mb-3.5 p-2.5 px-3.5 rounded-xl bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/40 dark:to-indigo-950/40 border border-blue-200 dark:border-blue-800 flex flex-wrap items-center justify-between gap-2.5 text-xs animate-in fade-in duration-150 shadow-xs">
        <div className="flex items-center gap-2.5">
          <div className="w-6 h-6 rounded-lg bg-blue-600 text-white font-mono font-bold text-[11px] flex items-center justify-center">
            {selectedInTable.length}
          </div>
          <span className="font-bold text-blue-950 dark:text-blue-200">
            {selectedInTable.length} of {tableItemIds.length} {tableName} {isTh ? 'รายการที่เลือก' : 'selected'}
          </span>
          <button
            type="button"
            onClick={() => toggleSelectAllInList(tableItemIds)}
            className="text-[11px] text-blue-600 dark:text-blue-400 hover:underline cursor-pointer font-medium ml-1"
          >
            {allInTableSelected ? (isTh ? 'ยกเลิกทั้งตาราง' : 'Deselect table') : (isTh ? 'เลือกทั้งหมดในตาราง' : 'Select all in table')}
          </button>
        </div>

        <div className="flex items-center gap-1.5 flex-wrap">
          <button
            type="button"
            onClick={handleBatchApprove}
            className="px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold flex items-center gap-1.5 cursor-pointer transition-colors shadow-xs"
          >
            <CheckCircle2 size={13} />
            <span>{isTh ? 'อนุมัติที่เลือก' : 'Batch Approve'} ({selectedInTable.length})</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setShowRejectModal(true);
            }}
            className="px-2.5 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-[11px] font-bold flex items-center gap-1.5 cursor-pointer transition-colors shadow-xs"
          >
            <XCircle size={13} />
            <span>{isTh ? 'ส่งกลับแก้ไข' : 'Batch Reject'} ({selectedInTable.length})</span>
          </button>
          <button
            type="button"
            onClick={handleExportSelected}
            className="px-2.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-[11px] font-bold flex items-center gap-1.5 cursor-pointer transition-colors shadow-xs"
          >
            <Download size={13} />
            <span>{isTh ? 'ส่งออก CSV' : 'Export CSV'}</span>
          </button>
          <button
            type="button"
            onClick={() => deselectIdsInList(tableItemIds)}
            className="px-2 py-1 rounded-lg text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 text-[11px] cursor-pointer hover:bg-slate-200/60 dark:hover:bg-slate-800 transition-colors"
          >
            {isTh ? 'ล้าง' : 'Clear'}
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="flex flex-col space-y-6 max-w-7xl mx-auto w-full pb-24 relative">
      {/* Top Banner Header with Persona Selector */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-emerald-950 p-6 rounded-2xl text-white shadow-xl border border-slate-700/50 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-black uppercase tracking-widest text-emerald-400 bg-emerald-500/20 px-2.5 py-0.5 rounded-full border border-emerald-500/30">
              Job Location Engine
            </span>
            <span className="text-slate-400 text-xs font-mono">• Field Operator / Tech / Engineer Mode</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black tracking-tight mt-1 flex items-center gap-2">
            <Workflow className="text-emerald-400" size={26} />
            Job Location Execution Hub
          </h1>
          <p className="text-xs sm:text-sm text-slate-300 mt-1 max-w-3xl">
            Streamlined on-site workflow: Butt List Walk, QR Code Tag Scans, Appendix A & B Digital Sign-Offs, and PSSR Operational Sanctioning for Unit Startup.
          </p>
        </div>

        {/* Persona Switcher Strip & Action Buttons */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Create New Job Location Action */}
          <button
            type="button"
            onClick={() => setCreateOpen(true)}
            className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1.5 transition-colors shadow-md shadow-emerald-900/30 cursor-pointer active:scale-95"
          >
            <FolderPlus size={15} />
            <span>{isTh ? '+ สร้างสถานที่ปฏิบัติงานใหม่' : '+ Create New Job Location'}</span>
          </button>

          {onOpenActivityLog && (
            <button
              type="button"
              onClick={onOpenActivityLog}
              className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-emerald-400 hover:text-emerald-300 text-xs font-bold flex items-center gap-1.5 transition-colors border border-emerald-500/30 shadow-xs cursor-pointer"
            >
              <Activity size={14} />
              <span>Activity Log</span>
            </button>
          )}

          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 bg-slate-800/80 p-2 rounded-xl border border-slate-700">
            <span className="text-[11px] font-bold text-slate-300 uppercase px-2 flex items-center gap-1.5">
              <HardHat size={14} className="text-amber-400" />
              <span>Active Persona:</span>
            </span>
            <div className="inline-flex rounded-lg bg-slate-900/90 p-1 border border-slate-700/60 text-xs">
              {(['Operator', 'Technical', 'Engineer'] as UserPersona[]).map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setPersona(p)}
                  className={`px-3 py-1.5 rounded-md font-bold transition-all cursor-pointer ${
                    persona === p
                      ? 'bg-emerald-600 text-white shadow-sm'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Active System Package Selector & Status Bar */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold text-sm shrink-0 border border-emerald-200 dark:border-emerald-800">
            <Layers size={20} />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-black text-slate-900 dark:text-white flex items-center gap-1.5">
                <span>{currentSystem.systemNo}</span>
                <span className="text-slate-400">•</span>
                <span className="text-emerald-600 dark:text-emerald-400">{currentSystem.unitNo}</span>
              </span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold border border-slate-200 dark:border-slate-700">
                {currentSystem.workOrderNo}
              </span>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                {currentSystem.businessTeam}
              </span>
              <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400">
                Lead: <strong className="text-slate-700 dark:text-slate-200">{currentSystem.turnoverLead}</strong>
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 line-clamp-1 max-w-2xl">
              {currentSystem.jobDescription}
            </p>
          </div>
        </div>

        {/* System Switcher & Actions */}
        <div className="flex items-center gap-2.5 shrink-0">
          <div className="flex items-center gap-1.5 text-xs text-slate-500">
            <span className="text-[11px] font-bold text-slate-400">System:</span>
            <select
              value={selectedSystemId}
              onChange={(e) => setSelectedSystemId(e.target.value)}
              className="px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-semibold text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer"
            >
              {registeredSystems.map((sys) => (
                <option key={sys.id} value={sys.id}>
                  {sys.systemNo} ({sys.unitNo}) - {sys.workOrderNo}
                </option>
              ))}
            </select>
          </div>

          <button
            type="button"
            onClick={() => setCreateOpen(true)}
            className="px-3 py-1.5 rounded-lg border border-emerald-300 dark:border-emerald-700 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-950/50 text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer"
          >
            <FolderPlus size={13} />
            <span>{isTh ? 'สร้างใหม่' : 'New Package'}</span>
          </button>
        </div>
      </div>

      {/* Action Feedback Toast */}
      {toastMessage && (
        <div className={`p-4 rounded-xl border flex items-center justify-between gap-3 text-xs animate-in slide-in-from-top-2 ${
          toastMessage.type === 'success'
            ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200'
            : toastMessage.type === 'danger'
            ? 'bg-rose-50 dark:bg-rose-950/40 border-rose-300 dark:border-rose-800 text-rose-900 dark:text-rose-200'
            : 'bg-blue-50 dark:bg-blue-950/40 border-blue-300 dark:border-blue-800 text-blue-900 dark:text-blue-200'
        }`}>
          <div className="flex items-center gap-2.5">
            {toastMessage.type === 'success' && <CheckCircle2 size={18} className="text-emerald-600 shrink-0" />}
            {toastMessage.type === 'danger' && <AlertTriangle size={18} className="text-rose-600 shrink-0" />}
            {toastMessage.type === 'info' && <FileSpreadsheet size={18} className="text-blue-600 shrink-0" />}
            <span className="font-semibold">{toastMessage.text}</span>
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setToastMessage(null)}
            className="text-[11px] h-7 border-slate-300 dark:border-slate-700 cursor-pointer"
          >
            Dismiss
          </Button>
        </div>
      )}

      {/* 4-Stage Stepper Navigation */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {STAGES.map((s) => {
          const isSelected = activeStage === s.id;
          return (
            <div
              key={s.id}
              onClick={() => setActiveStage(s.id)}
              className={`p-4 rounded-xl border transition-all cursor-pointer select-none flex flex-col justify-between ${
                isSelected
                  ? 'bg-blue-600 text-white border-blue-500 shadow-md ring-2 ring-blue-500/20 dark:bg-blue-600'
                  : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 text-slate-800 dark:text-slate-100'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className={`text-[10px] font-bold uppercase tracking-wider ${isSelected ? 'text-blue-100' : 'text-slate-400'}`}>
                  {s.tag}
                </span>
                <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full ${isSelected ? 'bg-white/20 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'}`}>
                  {s.badge}
                </span>
              </div>

              <div>
                <h3 className={`text-sm font-black leading-snug ${isSelected ? 'text-white' : 'text-slate-900 dark:text-white'}`}>
                  {s.name}
                </h3>
                <p className={`text-[11px] mt-1 line-clamp-2 ${isSelected ? 'text-blue-100' : 'text-slate-500 dark:text-slate-400'}`}>
                  {s.desc}
                </p>
              </div>

              <div className="mt-3 pt-2 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-[10px]">
                <span className={isSelected ? 'text-blue-200 font-bold' : 'text-slate-400'}>
                  Gate {s.id}
                </span>
                <ChevronRight size={13} className={isSelected ? 'text-white' : 'text-slate-400'} />
              </div>
            </div>
          );
        })}
      </div>

      {/* QR Simulation Toast Alert if active */}
      {scanSuccessMessage && (
        <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200 flex items-center justify-between gap-3 text-xs animate-in slide-in-from-top-2">
          <div className="flex items-center gap-2">
            <CheckCircle2 size={18} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
            <span>{scanSuccessMessage}</span>
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setScanSuccessMessage(null)}
            className="text-[11px] h-7 border-emerald-400 text-emerald-700 dark:text-emerald-300 cursor-pointer"
          >
            Dismiss
          </Button>
        </div>
      )}

      {/* =========================================================================
          STAGE 1: Punch & Butt Walk (Butt List Walk + Scan QR on site)
         ========================================================================= */}
      {activeStage === 1 && (
        <div className="space-y-6 animate-in fade-in duration-200">
          {/* Header Strip */}
          <Card className="border-blue-200 dark:border-blue-900 bg-blue-50/40 dark:bg-blue-950/20">
            <CardContent className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0">
                  <QrCode size={20} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <span>Stage 1: Butt List Walk & On-site QR Document Hub</span>
                    <Badge variant="default" className="text-[10px] bg-blue-600">
                      Logged as {persona}
                    </Badge>
                  </h3>
                  <p className="text-xs text-slate-600 dark:text-slate-300 mt-0.5">
                    Field engineers and operators conduct physical butt list walks, scan welded tags via tablet QR, and verify uploaded RT/PMI test records. Multi-select items to perform batch approval or rejection.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  onClick={() => handleSimulateScan('SYS11-BUTT-WALK-QR', 'Area 11 Pre-flash Column Butt Weld Racks')}
                  className="gap-2 cursor-pointer bg-blue-600 hover:bg-blue-700 text-xs shadow-sm"
                >
                  <Camera size={14} />
                  <span>Scan QR on Site</span>
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Section 1A: Butt List Walk (Verify Field Completion) */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <div>
                <CardTitle>1. Butt List Walkdown (Verify Field Completion)</CardTitle>
                <CardDescription>
                  Physical field verification of piping butt welds, contractor completion dates, and CP sign-offs.
                </CardDescription>
              </div>
              <Badge variant="outline" className="text-xs font-mono">
                {buttItems.filter(b => b.fieldVerified).length} / {buttItems.length} Field Verified
              </Badge>
            </CardHeader>
            <CardContent>
              {/* Table Action Row */}
              {renderTableActionRow(buttItems.map(b => b.id), 'Butt Weld Joints')}

              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-10 text-center">
                      <Checkbox
                        checked={buttItems.length > 0 && buttItems.every(b => selectedIds.includes(b.id))}
                        onCheckedChange={() => toggleSelectAllInList(buttItems.map(b => b.id))}
                      />
                    </TableHead>
                    <TableHead className="w-28">Butt Joint #</TableHead>
                    <TableHead className="min-w-56">Physical Location & Weld Description</TableHead>
                    <TableHead className="w-24">Discipline</TableHead>
                    <TableHead className="w-36">Contractor Plan</TableHead>
                    <TableHead className="w-36">Completion CP</TableHead>
                    <TableHead className="w-28 text-center">Status</TableHead>
                    <TableHead className="w-32">Verifier</TableHead>
                    <TableHead className="w-24 text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {buttItems.map(item => {
                    const isSelected = selectedIds.includes(item.id);
                    return (
                      <TableRow 
                        key={item.id} 
                        className={`${
                          isSelected 
                            ? 'bg-blue-50/70 dark:bg-blue-950/30 ring-1 ring-blue-400/30' 
                            : item.status === 'Completed'
                            ? 'bg-emerald-50/20 dark:bg-emerald-950/10'
                            : item.status === 'Rejected'
                            ? 'bg-rose-50/20 dark:bg-rose-950/10'
                            : ''
                        }`}
                      >
                        <TableCell className="text-center">
                          <Checkbox
                            checked={isSelected}
                            onCheckedChange={() => toggleSelectItem(item.id)}
                          />
                        </TableCell>
                        <TableCell className="font-mono font-bold text-slate-900 dark:text-white">
                          {item.buttNo}
                        </TableCell>
                        <TableCell className="text-xs text-slate-700 dark:text-slate-300">
                          <div>{item.location}</div>
                          {item.rejectReason && (
                            <div className="text-[10px] text-rose-600 dark:text-rose-400 font-medium mt-0.5 flex items-center gap-1">
                              <AlertCircle size={11} />
                              <span>Reason: {item.rejectReason}</span>
                            </div>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-[10px]">
                            {item.discipline}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs font-mono text-slate-600 dark:text-slate-400">
                          {item.contractorPlan}
                        </TableCell>
                        <TableCell className="text-xs font-mono font-semibold text-blue-600 dark:text-blue-400">
                          {item.completionCp}
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge variant={item.status === 'Completed' ? 'success' : item.status === 'Rejected' ? 'destructive' : 'warning'}>
                            {item.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs font-mono text-slate-600 dark:text-slate-300">
                          {item.verifiedBy}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            size="sm"
                            variant={item.fieldVerified ? 'outline' : 'default'}
                            onClick={() => handleVerifyButtItem(item.id)}
                            className="text-[11px] h-7 cursor-pointer"
                          >
                            {item.fieldVerified ? 'Re-inspect' : 'Verify Walk'}
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Section 1B: Scan QR on Site & Uploaded Inspection Docs Dossier Table */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Tablet QR Code Generator Card */}
            <Card className="border border-slate-200 dark:border-slate-800">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <QrCode size={18} className="text-blue-600" />
                  <CardTitle className="text-sm">On-Site QR Equipment Tag</CardTitle>
                </div>
                <CardDescription>
                  Scan with field device to pull up real-time inspection records for System 11.
                </CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col items-center justify-center p-6 space-y-4">
                <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-inner flex items-center justify-center">
                  <QRCodeSVG 
                    value="https://system-turnover.refinery.internal/sys11-crude-butt-checklist" 
                    size={140}
                    level="H"
                  />
                </div>
                <div className="text-center space-y-1">
                  <span className="font-mono text-xs font-bold text-slate-700 dark:text-slate-300 block">
                    TAG: QR-SYS11-CRUDE-01
                  </span>
                  <span className="text-[11px] text-slate-400 block">
                    Area 11 Crude & Fractionation Unit
                  </span>
                </div>
                <Button
                  size="sm"
                  onClick={() => handleSimulateScan('QR-SYS11-CRUDE-01', 'Crude Distillation Unit (SYS-11)')}
                  variant="outline"
                  className="w-full gap-2 text-xs cursor-pointer"
                >
                  <Smartphone size={14} />
                  <span>Simulate On-Site Tablet Scan</span>
                </Button>
              </CardContent>
            </Card>

            {/* Uploaded Documents Dossier Table */}
            <Card className="lg:col-span-2 border border-slate-200 dark:border-slate-800">
              <CardHeader className="flex flex-row items-center justify-between pb-3">
                <div>
                  <div className="flex items-center gap-2">
                    <FileText size={18} className="text-indigo-600" />
                    <CardTitle className="text-sm">Inspection Dossier & Document Registry</CardTitle>
                  </div>
                  <CardDescription>
                    NDT reports, RT films, PMI certifications uploaded during site walkdown. Select items to Batch Approve or Export.
                  </CardDescription>
                </div>
                <Button size="sm" variant="outline" className="gap-1.5 text-xs cursor-pointer">
                  <Upload size={13} />
                  <span>Upload File</span>
                </Button>
              </CardHeader>
              <CardContent>
                {/* Table Action Row */}
                {renderTableActionRow(uploadedDocs.map(d => d.id), 'Inspection Documents')}

                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-10 text-center">
                        <Checkbox
                          checked={uploadedDocs.length > 0 && uploadedDocs.every(d => selectedIds.includes(d.id))}
                          onCheckedChange={() => toggleSelectAllInList(uploadedDocs.map(d => d.id))}
                        />
                      </TableHead>
                      <TableHead className="w-24">Doc Code</TableHead>
                      <TableHead className="min-w-44">Document Title & Dossier Type</TableHead>
                      <TableHead className="w-24">Size</TableHead>
                      <TableHead className="w-32">Uploaded By</TableHead>
                      <TableHead className="w-24 text-center">Status</TableHead>
                      <TableHead className="w-20 text-right">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {uploadedDocs.map(doc => {
                      const isSelected = selectedIds.includes(doc.id);
                      return (
                        <TableRow 
                          key={doc.id}
                          className={`${
                            isSelected
                              ? 'bg-blue-50/70 dark:bg-blue-950/30 ring-1 ring-blue-400/30'
                              : doc.status === 'Approved'
                              ? 'bg-emerald-50/20 dark:bg-emerald-950/10'
                              : doc.status === 'Rejected'
                              ? 'bg-rose-50/20 dark:bg-rose-950/10'
                              : ''
                          }`}
                        >
                          <TableCell className="text-center">
                            <Checkbox
                              checked={isSelected}
                              onCheckedChange={() => toggleSelectItem(doc.id)}
                            />
                          </TableCell>
                          <TableCell className="font-mono text-xs font-bold text-slate-800 dark:text-slate-200">
                            {doc.docNo}
                          </TableCell>
                          <TableCell className="text-xs">
                            <div className="font-semibold text-slate-900 dark:text-white leading-tight">{doc.title}</div>
                            <div className="text-[10px] text-slate-500 mt-0.5">{doc.type}</div>
                            {doc.rejectReason && (
                              <div className="text-[10px] text-rose-600 dark:text-rose-400 mt-0.5 flex items-center gap-1 font-medium">
                                <AlertCircle size={10} />
                                <span>{doc.rejectReason}</span>
                              </div>
                            )}
                          </TableCell>
                          <TableCell className="font-mono text-[11px] text-slate-500">
                            {doc.size}
                          </TableCell>
                          <TableCell className="text-[11px] text-slate-600 dark:text-slate-300">
                            <div>{doc.uploadedBy}</div>
                            <div className="text-[9px] text-slate-400">{doc.time}</div>
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge variant={doc.status === 'Approved' ? 'success' : doc.status === 'Rejected' ? 'destructive' : 'warning'}>
                              {doc.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <button
                              type="button"
                              onClick={() => {
                                setUploadedDocs(prev => prev.map(d => d.id === doc.id ? { ...d, verified: !d.verified, status: !d.verified ? 'Approved' : 'Pending Review' } : d));
                              }}
                              className="p-1 rounded-md text-slate-500 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                              title="Toggle verification"
                            >
                              <CheckCircle2 size={15} className={doc.verified ? 'text-emerald-600' : 'text-slate-400'} />
                            </button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </CardContent>
              <CardFooter className="bg-slate-50 dark:bg-slate-800/40 p-4 flex items-center justify-between text-xs text-slate-500">
                <span>Select multiple documents to batch approve or export to CSV dossier.</span>
                <Button
                  size="sm"
                  onClick={() => setActiveStage(2)}
                  className="gap-1.5 bg-blue-600 hover:bg-blue-700 cursor-pointer"
                >
                  <span>Proceed to Stage 2: Complete Closing Form</span>
                  <ArrowRight size={14} />
                </Button>
              </CardFooter>
            </Card>
          </div>
        </div>
      )}

      {/* =========================================================================
          STAGE 2: Complete Closing form (Digital sign-off Appendix A)
         ========================================================================= */}
      {activeStage === 2 && (
        <div className="space-y-6 animate-in fade-in duration-200">
          <Card className="border-indigo-200 dark:border-indigo-900 bg-indigo-50/40 dark:bg-indigo-950/20">
            <CardContent className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center shrink-0">
                  <UserCheck size={20} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <span>Stage 2: Digital Sign-Off Appendix A (Equipment Closing & Cleanliness)</span>
                    <Badge variant="default" className="text-[10px] bg-indigo-600">
                      Logged as {persona}
                    </Badge>
                  </h3>
                  <p className="text-xs text-slate-600 dark:text-slate-300 mt-0.5">
                    Before manhole box-up, every vessel, tower, heat exchanger, and furnace must receive tri-party digital endorsements from PES, TSS, and OPS. Select equipment to perform batch endorsement.
                  </p>
                </div>
              </div>

              {onOpenCheckSheetTab && (
                <Button
                  onClick={() => onOpenCheckSheetTab('tab1')}
                  variant="outline"
                  className="gap-1.5 text-xs cursor-pointer"
                >
                  <Eye size={14} />
                  <span>Open Full Appendix A Sheet</span>
                </Button>
              )}
            </CardContent>
          </Card>

          {/* Section 2: Appendix A Digital Sign-Off Table */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <div>
                <CardTitle>Digital Sign-Off Appendix A: Multi-Role Equipment Acceptance</CardTitle>
                <CardDescription>
                  Sign on-site as <strong className="text-indigo-600 dark:text-indigo-400">{persona}</strong>. Each role must provide electronic authorization.
                </CardDescription>
              </div>
              <Badge variant="outline" className="text-xs font-mono">
                {appendixASignoffs.filter(r => r.pesSigned && r.tssSigned && r.opsSigned).length} / {appendixASignoffs.length} 100% Cleared
              </Badge>
            </CardHeader>
            <CardContent>
              {/* Table Action Row */}
              {renderTableActionRow(appendixASignoffs.map(a => a.id), 'Appendix A Vessels')}

              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-10 text-center">
                      <Checkbox
                        checked={appendixASignoffs.length > 0 && appendixASignoffs.every(a => selectedIds.includes(a.id))}
                        onCheckedChange={() => toggleSelectAllInList(appendixASignoffs.map(a => a.id))}
                      />
                    </TableHead>
                    <TableHead className="w-44">Equipment Tag</TableHead>
                    <TableHead className="min-w-56">Mandatory Inspection Scope</TableHead>
                    <TableHead className="w-32 text-center">
                      <div className="font-bold text-blue-600">PES Endorsement</div>
                      <div className="text-[9px] text-slate-400 font-normal">Specialist</div>
                    </TableHead>
                    <TableHead className="w-32 text-center">
                      <div className="font-bold text-indigo-600">TSS Endorsement</div>
                      <div className="text-[9px] text-slate-400 font-normal">Technical</div>
                    </TableHead>
                    <TableHead className="w-32 text-center">
                      <div className="font-bold text-emerald-600">OPS Endorsement</div>
                      <div className="text-[9px] text-slate-400 font-normal">Operations</div>
                    </TableHead>
                    <TableHead className="w-28 text-center">Closing Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {appendixASignoffs.map(row => {
                    const allDone = row.pesSigned && row.tssSigned && row.opsSigned;
                    const isSelected = selectedIds.includes(row.id);

                    return (
                      <TableRow 
                        key={row.id} 
                        className={`${
                          isSelected
                            ? 'bg-blue-50/70 dark:bg-blue-950/30 ring-1 ring-blue-400/30'
                            : allDone
                            ? 'bg-emerald-50/20 dark:bg-emerald-950/10'
                            : row.status.includes('Rejected')
                            ? 'bg-rose-50/20 dark:bg-rose-950/10'
                            : ''
                        }`}
                      >
                        <TableCell className="text-center">
                          <Checkbox
                            checked={isSelected}
                            onCheckedChange={() => toggleSelectItem(row.id)}
                          />
                        </TableCell>
                        <TableCell className="font-bold text-slate-900 dark:text-white">
                          {row.equipment}
                        </TableCell>
                        <TableCell className="text-xs text-slate-700 dark:text-slate-300">
                          <div>{row.inspectionTask}</div>
                          {row.rejectReason && (
                            <div className="text-[10px] text-rose-600 dark:text-rose-400 font-medium mt-0.5 flex items-center gap-1">
                              <AlertCircle size={11} />
                              <span>{row.rejectReason}</span>
                            </div>
                          )}
                        </TableCell>

                        {/* PES Role Button */}
                        <TableCell className="text-center">
                          <button
                            type="button"
                            onClick={() => handleSignAppendixA(row.id, 'pes')}
                            className={`w-full py-1.5 px-2 rounded-lg text-xs font-bold transition-all cursor-pointer flex flex-col items-center justify-center ${
                              row.pesSigned
                                ? 'bg-blue-600 text-white shadow-sm'
                                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
                            }`}
                          >
                            <span className="flex items-center gap-1">
                              {row.pesSigned && <Check size={12} />}
                              <span>{row.pesSigned ? 'PES Signed' : 'Sign PES'}</span>
                            </span>
                            {row.pesDate && (
                              <span className="text-[9px] opacity-80 font-mono mt-0.5">{row.pesDate}</span>
                            )}
                          </button>
                        </TableCell>

                        {/* TSS Role Button */}
                        <TableCell className="text-center">
                          <button
                            type="button"
                            onClick={() => handleSignAppendixA(row.id, 'tss')}
                            className={`w-full py-1.5 px-2 rounded-lg text-xs font-bold transition-all cursor-pointer flex flex-col items-center justify-center ${
                              row.tssSigned
                                ? 'bg-indigo-600 text-white shadow-sm'
                                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
                            }`}
                          >
                            <span className="flex items-center gap-1">
                              {row.tssSigned && <Check size={12} />}
                              <span>{row.tssSigned ? 'TSS Signed' : 'Sign TSS'}</span>
                            </span>
                            {row.tssDate && (
                              <span className="text-[9px] opacity-80 font-mono mt-0.5">{row.tssDate}</span>
                            )}
                          </button>
                        </TableCell>

                        {/* OPS Role Button */}
                        <TableCell className="text-center">
                          <button
                            type="button"
                            onClick={() => handleSignAppendixA(row.id, 'ops')}
                            className={`w-full py-1.5 px-2 rounded-lg text-xs font-bold transition-all cursor-pointer flex flex-col items-center justify-center ${
                              row.opsSigned
                                ? 'bg-emerald-600 text-white shadow-sm'
                                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
                            }`}
                          >
                            <span className="flex items-center gap-1">
                              {row.opsSigned && <Check size={12} />}
                              <span>{row.opsSigned ? 'OPS Signed' : 'Sign OPS'}</span>
                            </span>
                            {row.opsDate && (
                              <span className="text-[9px] opacity-80 font-mono mt-0.5">{row.opsDate}</span>
                            )}
                          </button>
                        </TableCell>

                        <TableCell className="text-center">
                          <Badge variant={allDone ? 'success' : row.status.includes('Rejected') ? 'destructive' : 'warning'}>
                            {row.status}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
            <CardFooter className="bg-slate-50 dark:bg-slate-800/40 p-4 flex items-center justify-between text-xs text-slate-500">
              <div className="flex items-center gap-2">
                <Checkbox
                  checked={appendixAStatementAgreed}
                  onCheckedChange={(val) => setAppendixAStatementAgreed(val)}
                  label="I certify all equipment internals are inspected clean with zero foreign materials."
                />
              </div>
              <Button
                size="sm"
                onClick={() => setActiveStage(3)}
                className="gap-1.5 bg-blue-600 hover:bg-blue-700 cursor-pointer"
              >
                <span>Proceed to Stage 3: Box up / De-blind</span>
                <ArrowRight size={14} />
              </Button>
            </CardFooter>
          </Card>
        </div>
      )}

      {/* =========================================================================
          STAGE 3: Box up/ De-blind (Scan QR on site + Digital sign-off Appendix B)
         ========================================================================= */}
      {activeStage === 3 && (
        <div className="space-y-6 animate-in fade-in duration-200">
          <Card className="border-amber-200 dark:border-amber-900 bg-amber-50/40 dark:bg-amber-950/20">
            <CardContent className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-600 text-white flex items-center justify-center shrink-0">
                  <ShieldCheck size={20} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <span>Stage 3: On-Site QR Tag Verification & Appendix B Box-Up Sign-Off</span>
                    <Badge variant="default" className="text-[10px] bg-amber-600">
                      Logged as {persona}
                    </Badge>
                  </h3>
                  <p className="text-xs text-slate-600 dark:text-slate-300 mt-0.5">
                    Field personnel scan the physical vessel QR tag to unlock the de-blind authorization, inform Flange Police, and record the digital Appendix B Exception Schedule.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  onClick={() => handleSimulateScan('QR-BLD-11-V104', 'Pre-flash Separator Bottom Drain Spade BLD-11-03')}
                  className="gap-2 cursor-pointer bg-amber-600 hover:bg-amber-700 text-white text-xs"
                >
                  <Camera size={14} />
                  <span>Scan Vessel Manway QR</span>
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Section 3A: QR De-Blind Positive Isolation Registry */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <div>
                <CardTitle>1. On-Site QR Scan & De-Blind Reconciliation</CardTitle>
                <CardDescription>
                  Scan QR tags affixed to blind spades to verify physical removal before torquing flange pairs. Select rows for Batch Action.
                </CardDescription>
              </div>
              <Badge variant="outline" className="text-xs font-mono">
                {stage3Blinds.filter(b => b.deBlinded).length} / {stage3Blinds.length} De-Blinded
              </Badge>
            </CardHeader>
            <CardContent>
              {/* Table Action Row */}
              {renderTableActionRow(stage3Blinds.map(b => b.id), 'Isolation Blinds')}

              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-10 text-center">
                      <Checkbox
                        checked={stage3Blinds.length > 0 && stage3Blinds.every(b => selectedIds.includes(b.id))}
                        onCheckedChange={() => toggleSelectAllInList(stage3Blinds.map(b => b.id))}
                      />
                    </TableHead>
                    <TableHead className="w-32">Blind Tag #</TableHead>
                    <TableHead className="min-w-56">Service & Flange Rating</TableHead>
                    <TableHead className="w-32 text-center">QR Tag Status</TableHead>
                    <TableHead className="w-36 text-center">De-Blind State</TableHead>
                    <TableHead className="w-36">Confirmed By</TableHead>
                    <TableHead className="w-24">Timestamp</TableHead>
                    <TableHead className="w-32 text-right">Field Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {stage3Blinds.map(b => {
                    const isSelected = selectedIds.includes(b.id);
                    return (
                      <TableRow 
                        key={b.id} 
                        className={`${
                          isSelected
                            ? 'bg-blue-50/70 dark:bg-blue-950/30 ring-1 ring-blue-400/30'
                            : b.deBlinded
                            ? 'bg-emerald-50/20 dark:bg-emerald-950/10'
                            : b.status === 'Rejected'
                            ? 'bg-rose-50/20 dark:bg-rose-950/10'
                            : ''
                        }`}
                      >
                        <TableCell className="text-center">
                          <Checkbox
                            checked={isSelected}
                            onCheckedChange={() => toggleSelectItem(b.id)}
                          />
                        </TableCell>
                        <TableCell className="font-mono font-bold text-slate-900 dark:text-white">
                          {b.tag}
                        </TableCell>
                        <TableCell className="text-xs text-slate-700 dark:text-slate-300">
                          <div>{b.service}</div>
                          {b.rejectReason && (
                            <div className="text-[10px] text-rose-600 dark:text-rose-400 font-medium mt-0.5 flex items-center gap-1">
                              <AlertCircle size={10} />
                              <span>{b.rejectReason}</span>
                            </div>
                          )}
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge variant={b.qrScanned ? 'success' : 'secondary'} className="gap-1">
                            <QrCode size={11} />
                            <span>{b.qrScanned ? 'QR Scanned' : 'Pending Scan'}</span>
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge variant={b.deBlinded ? 'success' : b.status === 'Rejected' ? 'destructive' : 'warning'}>
                            {b.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs font-mono text-slate-700 dark:text-slate-300">
                          {b.confirmedBy}
                        </TableCell>
                        <TableCell className="text-xs font-mono text-slate-500">
                          {b.timestamp}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleToggleBlindDeBlind(b.id)}
                            className="text-[11px] h-7 cursor-pointer"
                          >
                            {b.deBlinded ? 'Re-install' : 'Scan & De-blind'}
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Section 3B: Digital Sign-Off Appendix B (Box Up Exception Schedule) */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <div>
                <CardTitle>2. Digital Sign-Off Appendix B (Box Up Exception List)</CardTitle>
                <CardDescription>
                  Formal vessel closure authorization with recorded non-conformances, witness signatures, and closure stamps.
                </CardDescription>
              </div>
              <Badge variant="outline" className="text-xs">
                {appendixBExceptions.length} Manways Authorized
              </Badge>
            </CardHeader>
            <CardContent>
              {/* Table Action Row */}
              {renderTableActionRow(appendixBExceptions.map(exc => exc.id), 'Appendix B Manways')}

              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-10 text-center">
                      <Checkbox
                        checked={appendixBExceptions.length > 0 && appendixBExceptions.every(exc => selectedIds.includes(exc.id))}
                        onCheckedChange={() => toggleSelectAllInList(appendixBExceptions.map(exc => exc.id))}
                      />
                    </TableHead>
                    <TableHead className="w-28">Manway Tag</TableHead>
                    <TableHead className="w-48">Equipment Reference</TableHead>
                    <TableHead className="min-w-64">Appendix B Exception / Closure Notes</TableHead>
                    <TableHead className="w-36">Job Leader Sign-Off</TableHead>
                    <TableHead className="w-32">TSS Witness</TableHead>
                    <TableHead className="w-32">Closure Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {appendixBExceptions.map(exc => {
                    const isSelected = selectedIds.includes(exc.id);
                    return (
                      <TableRow 
                        key={exc.id}
                        className={`${
                          isSelected
                            ? 'bg-blue-50/70 dark:bg-blue-950/30 ring-1 ring-blue-400/30'
                            : exc.status === 'Box-Up Authorized'
                            ? 'bg-emerald-50/20 dark:bg-emerald-950/10'
                            : exc.status === 'Rejected'
                            ? 'bg-rose-50/20 dark:bg-rose-950/10'
                            : ''
                        }`}
                      >
                        <TableCell className="text-center">
                          <Checkbox
                            checked={isSelected}
                            onCheckedChange={() => toggleSelectItem(exc.id)}
                          />
                        </TableCell>
                        <TableCell className="font-mono font-bold text-slate-900 dark:text-white">
                          {exc.tag}
                        </TableCell>
                        <TableCell className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                          {exc.equipment}
                        </TableCell>
                        <TableCell className="text-xs text-slate-600 dark:text-slate-400">
                          <div>{exc.exceptionDesc}</div>
                          {exc.rejectReason && (
                            <div className="text-[10px] text-rose-600 dark:text-rose-400 font-medium mt-0.5 flex items-center gap-1">
                              <AlertCircle size={10} />
                              <span>{exc.rejectReason}</span>
                            </div>
                          )}
                        </TableCell>
                        <TableCell className="text-xs font-mono text-blue-600 dark:text-blue-400 font-bold">
                          {exc.signedBy}
                        </TableCell>
                        <TableCell className="text-xs font-mono text-slate-700 dark:text-slate-300">
                          {exc.tssWitness}
                        </TableCell>
                        <TableCell>
                          <Badge variant={exc.status === 'Box-Up Authorized' ? 'success' : exc.status === 'Rejected' ? 'destructive' : 'warning'} className="text-[10px]">
                            {exc.status}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
            <CardFooter className="bg-slate-50 dark:bg-slate-800/40 p-4 flex items-center justify-between text-xs text-slate-500">
              <span>All Appendix B vessel closures witnessed by TSS and Operations.</span>
              <Button
                size="sm"
                onClick={() => setActiveStage(4)}
                className="gap-1.5 bg-blue-600 hover:bg-blue-700 cursor-pointer"
              >
                <span>Proceed to Stage 4: Closing & PSSR</span>
                <ArrowRight size={14} />
              </Button>
            </CardFooter>
          </Card>
        </div>
      )}

      {/* =========================================================================
          STAGE 4: Closing (PSSR / Sanctioning / Start up)
         ========================================================================= */}
      {activeStage === 4 && (
        <div className="space-y-6 animate-in fade-in duration-200">
          <Card className="border-emerald-200 dark:border-emerald-900 bg-emerald-50/40 dark:bg-emerald-950/20">
            <CardContent className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0">
                  <Flame size={20} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <span>Stage 4: PSSR Walk, Sanctioning & Startup Authorization</span>
                    <Badge variant="default" className="text-[10px] bg-emerald-600">
                      Logged as {persona}
                    </Badge>
                  </h3>
                  <p className="text-xs text-slate-600 dark:text-slate-300 mt-0.5">
                    Pre-Startup Safety Review (PSSR) multi-discipline verification. Multi-select items to perform batch approval or audit sign-off.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Badge 
                  variant={sanctioningStatus.hydrocarbonIntroductionGranted ? 'success' : 'warning'}
                  className="px-3 py-1 text-xs"
                >
                  {sanctioningStatus.hydrocarbonIntroductionGranted ? 'Live Plant Sanctioned' : 'Pre-Sanctioning Gate'}
                </Badge>
              </div>
            </CardContent>
          </Card>

          {/* Section 4A: PSSR Multi-Discipline Checklist */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <div>
                <CardTitle>1. Pre-Startup Safety Review (PSSR) Gate Checklist</CardTitle>
                <CardDescription>
                  Verified jointly by Safety, Technical, Field Operations, and Process Engineering.
                </CardDescription>
              </div>
              <Badge variant="outline" className="text-xs font-mono">
                {pssrChecklist.filter(p => p.status).length} / {pssrChecklist.length} Items Cleared
              </Badge>
            </CardHeader>
            <CardContent>
              {/* Table Action Row */}
              {renderTableActionRow(pssrChecklist.map(p => p.id), 'PSSR Safety Items')}

              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-10 text-center">
                      <Checkbox
                        checked={pssrChecklist.length > 0 && pssrChecklist.every(p => selectedIds.includes(p.id))}
                        onCheckedChange={() => toggleSelectAllInList(pssrChecklist.map(p => p.id))}
                      />
                    </TableHead>
                    <TableHead className="w-48">PSSR Category</TableHead>
                    <TableHead className="min-w-64">Safety Verification Requirement</TableHead>
                    <TableHead className="w-40">Discipline Owner</TableHead>
                    <TableHead className="w-28 text-center">Safety Clearance</TableHead>
                    <TableHead className="w-44">Signed Authority</TableHead>
                    <TableHead className="w-24 text-right">PSSR Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pssrChecklist.map(p => {
                    const isSelected = selectedIds.includes(p.id);
                    return (
                      <TableRow 
                        key={p.id} 
                        className={`${
                          isSelected
                            ? 'bg-blue-50/70 dark:bg-blue-950/30 ring-1 ring-blue-400/30'
                            : p.status
                            ? 'bg-emerald-50/20 dark:bg-emerald-950/10'
                            : p.rejectReason
                            ? 'bg-rose-50/20 dark:bg-rose-950/10'
                            : ''
                        }`}
                      >
                        <TableCell className="text-center">
                          <Checkbox
                            checked={isSelected}
                            onCheckedChange={() => toggleSelectItem(p.id)}
                          />
                        </TableCell>
                        <TableCell className="font-bold text-slate-900 dark:text-white">
                          {p.category}
                        </TableCell>
                        <TableCell className="text-xs text-slate-700 dark:text-slate-300">
                          <div>{p.item}</div>
                          {p.rejectReason && (
                            <div className="text-[10px] text-rose-600 dark:text-rose-400 font-medium mt-0.5 flex items-center gap-1">
                              <AlertCircle size={10} />
                              <span>{p.rejectReason}</span>
                            </div>
                          )}
                        </TableCell>
                        <TableCell className="text-xs font-medium text-slate-600 dark:text-slate-400">
                          {p.owner}
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge variant={p.status ? 'success' : 'destructive'}>
                            {p.status ? 'PASSED' : 'HOLD'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs font-mono text-slate-800 dark:text-slate-200">
                          {p.signed}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleTogglePssr(p.id)}
                            className="text-[11px] h-7 cursor-pointer"
                          >
                            {p.status ? 'Re-audit' : 'Sign PSSR'}
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Section 4B: Operational Sanctioning & Startup Certificate */}
          <Card className="border-2 border-emerald-500/50 dark:border-emerald-600/50 shadow-xl overflow-hidden">
            <div className="h-2 bg-gradient-to-r from-emerald-500 via-teal-500 to-blue-600" />
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base flex items-center gap-2">
                    <PlayCircle className="text-emerald-600" size={20} />
                    <span>2. Operational Sanctioning & Startup Authorization Certificate</span>
                  </CardTitle>
                  <CardDescription>
                    Official certificate releasing System 11 from Turnaround Mechanical Handover into Live Operating Plant.
                  </CardDescription>
                </div>
                <span className="font-mono text-xs font-bold text-emerald-600 dark:text-emerald-400">
                  {sanctioningStatus.sanctionCertNo}
                </span>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 text-xs space-y-3 font-serif leading-relaxed text-slate-700 dark:text-slate-300">
                <p>
                  "The undersigned Operations Asset Manager, Lead Technical Authority, and Lead Commissioning Engineer hereby grant <strong>Formal Sanctioning</strong> for the introduction of hot crude feedstock, fuel gas firing, and chemical injection into System 11. All PSSR safety items are validated, blind reversals are certified 100%, and vessel closures are locked under Appendix A & B protocols."
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 font-sans text-xs">
                  <div className="p-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900">
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">Lead Technical Authority</span>
                    <span className="font-bold text-slate-800 dark:text-slate-100 block mt-1">Dr. Anan S.</span>
                    <span className="text-[10px] text-emerald-600 font-mono mt-0.5 block">✓ Sanction Endorsed</span>
                  </div>

                  <div className="p-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900">
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">Lead Commissioning Engineer</span>
                    <span className="font-bold text-slate-800 dark:text-slate-100 block mt-1">Eng. Somchai P.</span>
                    <span className="text-[10px] text-emerald-600 font-mono mt-0.5 block">✓ Sanction Endorsed</span>
                  </div>

                  <div className="p-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900">
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">Operations Asset Manager</span>
                    <span className="font-bold text-slate-800 dark:text-slate-100 block mt-1">Kitisak Wongsuwan, P.E.</span>
                    <span className={`text-[10px] font-mono mt-0.5 block ${sanctioningStatus.opsManagerSanctioned ? 'text-emerald-600' : 'text-amber-500'}`}>
                      {sanctioningStatus.opsManagerSanctioned ? '✓ Executive Endorsed' : '○ Pending Sign'}
                    </span>
                  </div>
                </div>
              </div>

              {sanctioningStatus.hydrocarbonIntroductionGranted ? (
                <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-300 dark:border-emerald-800 text-xs flex items-center justify-between">
                  <div className="flex items-center gap-2 text-emerald-900 dark:text-emerald-200">
                    <CheckCircle2 size={18} className="text-emerald-600 dark:text-emerald-400" />
                    <span className="font-bold">
                      Hydrocarbon Introduction & Live Plant Startup Sanctioned on {sanctioningStatus.sanctionDate}
                    </span>
                  </div>
                  <Badge variant="success">READY FOR STARTUP</Badge>
                </div>
              ) : (
                <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
                  <span className="text-xs text-slate-500">
                    4 of 5 PSSR safety gates passed. Click below to execute live system startup sanctioning.
                  </span>
                  <Button
                    onClick={handleExecuteSanction}
                    className="gap-2 cursor-pointer bg-emerald-600 hover:bg-emerald-700 text-white font-bold shadow-md"
                  >
                    <Zap size={16} />
                    <span>Authorize Live Plant Sanctioning & Startup</span>
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* =========================================================================
          FLOATING ACTION TOOLBAR (Appears whenever items are selected)
         ========================================================================= */}
      {selectedIds.length > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 w-[94%] max-w-4xl animate-in slide-in-from-bottom-5 duration-300">
          <div className="bg-slate-900/95 dark:bg-slate-900/95 backdrop-blur-md text-white border border-slate-700/90 shadow-2xl rounded-2xl p-3.5 sm:p-4 flex flex-col sm:flex-row items-center justify-between gap-3.5 ring-1 ring-white/10">
            {/* Left: Selected Counter & Status info */}
            <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-start">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-blue-600 text-white font-black text-sm flex items-center justify-center shadow-inner">
                  {selectedIds.length}
                </div>
                <div>
                  <div className="text-xs font-black tracking-wide flex items-center gap-2">
                    <span>
                      {isTh 
                        ? `เลือกไว้ ${selectedIds.length} รายการ` 
                        : `${selectedIds.length} Record(s) Selected`}
                    </span>
                    <span className="text-[10px] text-blue-300 bg-blue-500/20 px-2 py-0.5 rounded-full font-mono border border-blue-500/30">
                      {persona}
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-400">
                    {isTh ? 'เลือกคำสั่งด้านขวาเพื่อดำเนินการพร้อมกัน' : 'Ready for bulk coordination across turnover gates'}
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={clearSelection}
                className="text-xs text-slate-400 hover:text-white underline underline-offset-2 cursor-pointer sm:ml-3"
              >
                {isTh ? 'ยกเลิกการเลือก' : 'Clear all'}
              </button>
            </div>

            {/* Right: Floating Actions Group */}
            <div className="flex items-center gap-2 w-full sm:w-auto justify-end flex-wrap">
              {/* Batch Approve Button */}
              <Button
                size="sm"
                onClick={handleBatchApprove}
                className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold gap-1.5 h-9 px-3.5 rounded-xl shadow-md cursor-pointer transition-all active:scale-95"
              >
                <CheckCircle2 size={15} className="text-emerald-200" />
                <span>{isTh ? 'อนุมัติพร้อมกัน' : 'Batch Approve'}</span>
                <span className="bg-emerald-700/90 text-emerald-100 text-[10px] px-1.5 py-0.5 rounded-md font-mono">
                  {selectedIds.length}
                </span>
              </Button>

              {/* Batch Reject Button */}
              <Button
                size="sm"
                onClick={() => {
                  setShowRejectModal(true);
                }}
                className="bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold gap-1.5 h-9 px-3.5 rounded-xl shadow-md cursor-pointer transition-all active:scale-95"
              >
                <XCircle size={15} className="text-rose-200" />
                <span>{isTh ? 'ส่งกลับแก้ไข' : 'Batch Reject'}</span>
                <span className="bg-rose-700/90 text-rose-100 text-[10px] px-1.5 py-0.5 rounded-md font-mono">
                  {selectedIds.length}
                </span>
              </Button>

              {/* Export Selected Button */}
              <Button
                size="sm"
                onClick={handleExportSelected}
                className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold gap-1.5 h-9 px-3.5 rounded-xl shadow-md cursor-pointer transition-all active:scale-95"
              >
                <FileSpreadsheet size={15} className="text-indigo-200" />
                <span>{isTh ? 'ส่งออกรายการที่เลือก' : 'Export Selected'}</span>
              </Button>

              {/* Dismiss button */}
              <button
                type="button"
                onClick={clearSelection}
                className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-colors cursor-pointer ml-1"
                title="Deselect and close toolbar"
              >
                <X size={16} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          BATCH REJECT MODAL
         ========================================================================= */}
      {showRejectModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-lg w-full shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="h-1.5 bg-rose-600" />
            <div className="p-6 space-y-4">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-rose-100 dark:bg-rose-950/60 text-rose-600 flex items-center justify-center shrink-0">
                    <ShieldAlert size={20} />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-900 dark:text-white">
                      {isTh ? 'ยืนยันการปฏิเสธ / ส่งกลับแก้ไข' : 'Batch Reject Selected Items'}
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {isTh
                        ? `คุณกำลังปฏิเสธ ${selectedIds.length} รายการที่เลือก กรุณาระบุสาเหตุ`
                        : `Rejecting ${selectedIds.length} selected record(s) under ${persona} authority.`}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowRejectModal(false)}
                  className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 rounded-lg cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Quick Preset Reason Tags */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  {isTh ? 'เลือกสาเหตุมาตรฐาน (Quick Preset)' : 'Standard Rejection Presets'}
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {[
                    'Missing NDT / RT film inspection certificate',
                    'Flange face scratched / gasket standard mismatch',
                    'Torque calibration certificate expired or out of spec',
                    'Foreign material / cleanliness sweep failed',
                    'Tag mismatch or physical QR tag unreadable',
                    'Nitrogen leak tightness test pressure drop detected'
                  ].map((reason) => (
                    <button
                      key={reason}
                      type="button"
                      onClick={() => setRejectReasonPreset(reason)}
                      className={`text-[11px] px-2.5 py-1 rounded-lg border transition-all cursor-pointer text-left ${
                        rejectReasonPreset === reason
                          ? 'bg-rose-50 dark:bg-rose-950/50 border-rose-400 text-rose-700 dark:text-rose-300 font-bold'
                          : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-slate-400'
                      }`}
                    >
                      {reason}
                    </button>
                  ))}
                </div>
              </div>

              {/* Additional Custom Remediation Remarks */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  {isTh ? 'ข้อสังเกตเพิ่มเติม / สิ่งที่ต้องแก้ไข' : 'Custom Remarks / Remediation Required'}
                </label>
                <textarea
                  rows={3}
                  value={customRejectReason}
                  onChange={(e) => setCustomRejectReason(e.target.value)}
                  placeholder={isTh ? 'ระบุรายละเอียดเพิ่มเติมสำหรับการแก้ไขในภาคสนาม...' : 'Specify additional field rectification steps or contractor instructions...'}
                  className="w-full text-xs p-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-rose-500"
                />
              </div>

              {/* Selected IDs summary badge list */}
              <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">
                  Selected Item References ({selectedIds.length})
                </span>
                <div className="flex flex-wrap gap-1 max-h-20 overflow-y-auto">
                  {selectedIds.map(id => (
                    <span key={id} className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200">
                      {id}
                    </span>
                  ))}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-2 flex items-center justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowRejectModal(false)}
                  className="text-xs cursor-pointer"
                >
                  {isTh ? 'ยกเลิก' : 'Cancel'}
                </Button>
                <Button
                  type="button"
                  size="sm"
                  onClick={handleConfirmBatchReject}
                  className="bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold gap-1.5 cursor-pointer shadow-sm"
                >
                  <XCircle size={14} />
                  <span>{isTh ? 'ยืนยันการปฏิเสธ' : 'Confirm Batch Reject'}</span>
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* Slide-out Drawer (Sheet) for Create New Job Location */}
      <CreateTurnoverSheet
        open={isCreateOpen}
        onOpenChange={setCreateOpen}
        onSystemCreated={(newValues) => {
          const newSys: SystemRecord = {
            id: `sys-${Date.now()}`,
            systemNo: newValues.systemNo,
            unitNo: newValues.unitNo,
            workOrderNo: newValues.workOrderNo,
            businessTeam: newValues.businessTeam,
            turnoverLead: newValues.turnoverLead,
            plannedTurnoverDate: newValues.plannedTurnoverDate,
            jobDescription: newValues.jobDescription,
            status: 'Stage 1: In Progress'
          };
          setRegisteredSystems(prev => [newSys, ...prev]);
          setSelectedSystemId(newSys.id);
          setToastMessage({
            type: 'success',
            text: isTh 
              ? `สร้างสถานที่ปฏิบัติงาน ${newValues.systemNo} (${newValues.unitNo}) เรียบร้อยแล้ว!` 
              : `Created new Job Location package ${newValues.systemNo} (${newValues.unitNo}) under Work Order ${newValues.workOrderNo}!`
          });
        }}
      />
    </div>
  );
}
