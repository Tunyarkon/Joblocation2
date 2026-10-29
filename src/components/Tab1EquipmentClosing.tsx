import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from './ui/card';
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from './ui/table';
import { Checkbox } from './ui/checkbox';
import { Input } from './ui/input';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { usePlantTurnShared } from '../context/PlantTurnSharedContext';
import { 
  Plus, Trash2, CheckCircle2, ShieldCheck, PenTool, 
  AlertCircle, FileCheck, Layers, ArrowRight, Printer, Download, Building2, Wrench
} from 'lucide-react';

interface AppendixARowSignature {
  name: string;
  date: string;
  isNA: boolean;
}

interface AppendixATableRow {
  id: string;
  description: string;
  checked: boolean;
  pes: AppendixARowSignature;
  tss: AppendixARowSignature;
  ops: AppendixARowSignature;
}

interface ExceptionItem {
  id: string;
  no: number;
  description: string;
}

interface SignatureBlock {
  position: string;
  name: string;
  signature: string;
  date: string;
  signed: boolean;
}

export default function Tab1EquipmentClosing() {
  const { selectedJob, updateJob } = usePlantTurnShared();

  // ================= Header Fields =================
  const [header, setHeader] = useState({
    woNo: selectedJob?.workOrder || 'WO-2026-78441',
    equipmentNo: selectedJob?.assetTag || selectedJob?.jobNo || '11-E-101A / 11-C-101',
    unitNo: selectedJob?.unit || 'Unit 11 (Crude Distillation)',
    jobDescription: selectedJob?.description || selectedJob?.title || 'Major Overhaul, Internal Inspection, Tube Bundle Hydro-Cleaning & Final Closure',
    wsrEwrNo: selectedJob?.refCode ? `WSR-${selectedJob.refCode}-REV2` : 'WSR-CDU11-089-REV2',
    systemNoEicNo: selectedJob?.system || 'SYS-11-CRUDE / EIC-M-11-042',
    bt: selectedJob?.gridZone || 'BT-04-ZONE-A'
  });

  // Keep in sync when selected job changes
  useEffect(() => {
    if (selectedJob) {
      setHeader({
        woNo: selectedJob.workOrder,
        equipmentNo: selectedJob.assetTag || selectedJob.jobNo,
        unitNo: selectedJob.unit,
        jobDescription: selectedJob.description || selectedJob.title,
        wsrEwrNo: selectedJob.refCode ? `WSR-${selectedJob.refCode}-REV2` : 'WSR-CDU11-089-REV2',
        systemNoEicNo: selectedJob.system,
        bt: selectedJob.gridZone || 'BT-04-ZONE-A'
      });
    }
  }, [selectedJob]);

  // ================= Section 1: Appendix A =================
  // Table 1: Heat Exchanger (3 Rows)
  const [table1HeatExchanger, setTable1HeatExchanger] = useState<AppendixATableRow[]>([
    {
      id: 'hx-1',
      description: 'Accepted after tube bundle cleaning',
      checked: true,
      pes: { name: 'Eng. Somchai P.', date: '2026-09-24', isNA: false },
      tss: { name: 'Dr. Anan S.', date: '2026-09-24', isNA: false },
      ops: { name: 'Supot K.', date: '2026-09-24', isNA: false }
    },
    {
      id: 'hx-2',
      description: 'Accepted after shell cleaning',
      checked: true,
      pes: { name: 'Eng. Somchai P.', date: '2026-09-24', isNA: false },
      tss: { name: 'Dr. Anan S.', date: '2026-09-24', isNA: false },
      ops: { name: 'Supot K.', date: '2026-09-24', isNA: false }
    },
    {
      id: 'hx-3',
      description: 'Accepted before inserting tube bundle',
      checked: true,
      pes: { name: 'Eng. Somchai P.', date: '2026-09-24', isNA: false },
      tss: { name: 'Dr. Anan S.', date: '2026-09-24', isNA: false },
      ops: { name: 'Supot K.', date: '2026-09-24', isNA: false }
    }
  ]);

  // Table 2: Tower / Drum / Furnace / Reactor (5 Rows)
  const [table2Vessels, setTable2Vessels] = useState<AppendixATableRow[]>([
    {
      id: 'vsl-1',
      description: 'Accepted after internal cleaning',
      checked: true,
      pes: { name: 'Eng. Somchai P.', date: '2026-09-24', isNA: false },
      tss: { name: 'Dr. Anan S.', date: '2026-09-24', isNA: false },
      ops: { name: 'Supot K.', date: '2026-09-24', isNA: false }
    },
    {
      id: 'vsl-2',
      description: 'For Tower/Drum/Furnace Accepted before closing manhole',
      checked: true,
      pes: { name: 'Eng. Somchai P.', date: '2026-09-24', isNA: false },
      tss: { name: 'Dr. Anan S.', date: '2026-09-24', isNA: false },
      ops: { name: 'Supot K.', date: '2026-09-24', isNA: false }
    },
    {
      id: 'vsl-3',
      description: 'For Reactor Accepted before closing BOTTOM manhole',
      checked: false,
      pes: { name: '', date: '', isNA: true },
      tss: { name: '', date: '', isNA: true },
      ops: { name: '', date: '', isNA: true }
    },
    {
      id: 'vsl-4',
      description: 'MIDDLE manhole',
      checked: false,
      pes: { name: '', date: '', isNA: true },
      tss: { name: '', date: '', isNA: true },
      ops: { name: '', date: '', isNA: true }
    },
    {
      id: 'vsl-5',
      description: 'TOP manhole',
      checked: false,
      pes: { name: '', date: '', isNA: true },
      tss: { name: '', date: '', isNA: true },
      ops: { name: '', date: '', isNA: true }
    }
  ]);

  // ================= Section 2: Appendix B (Box up and Turnover equipment) =================
  const [exceptions, setExceptions] = useState<ExceptionItem[]>([
    {
      id: 'exc-1',
      no: 1,
      description: 'Channel head nozzle N1 sacrificial anode replacement deferred to Post-hydro inspection.'
    },
    {
      id: 'exc-2',
      no: 2,
      description: 'Demister pad final tie-wire inspection verified clean and boroscope images archived in master folder.'
    }
  ]);

  const [appendixBSignatures, setAppendixBSignatures] = useState<{
    jobLeader: SignatureBlock;
    tssRep: SignatureBlock;
    pes: SignatureBlock;
    ops: SignatureBlock;
  }>({
    jobLeader: {
      position: 'Job Leader / ME',
      name: 'Thawatchai Kittikun',
      signature: 'Thawatchai.K',
      date: '2026-09-24',
      signed: true
    },
    tssRep: {
      position: 'TSS Representative',
      name: 'Dr. Anan Sukprasert',
      signature: 'Dr. Anan S.',
      date: '2026-09-24',
      signed: true
    },
    pes: {
      position: 'Process Technical Contact Engineer (PES)',
      name: 'Narong Boonmee',
      signature: 'Narong.B',
      date: '2026-09-24',
      signed: true
    },
    ops: {
      position: 'Process Operation Representative (OPS)',
      name: 'Supot Kaewmanee',
      signature: 'Supot.K',
      date: '2026-09-24',
      signed: true
    }
  });

  // ================= Footer Section =================
  const [approveToProceed, setApproveToProceed] = useState<'Y' | 'N' | 'N/A'>('Y');
  const [aelSignature, setAelSignature] = useState({
    name: 'Wichai Thongchai (AEL Authority)',
    signature: 'Wichai.Th',
    date: '2026-09-24',
    signed: true
  });

  const [deBlindSection, setDeBlindSection] = useState({
    checked: true,
    signature: 'Op. Supot K.',
    date: '2026-09-24'
  });

  const [flangePoliceSection, setFlangePoliceSection] = useState({
    checked: true,
    signature: 'QC. Kamonrat P.',
    date: '2026-09-24'
  });

  // Handlers for Appendix A Table 1
  const updateTable1Row = (id: string, field: 'checked', val: boolean) => {
    setTable1HeatExchanger(prev => prev.map(r => r.id === id ? { ...r, checked: val } : r));
  };

  const updateTable1Sig = (
    id: string, 
    role: 'pes' | 'tss' | 'ops', 
    field: keyof AppendixARowSignature, 
    val: any
  ) => {
    setTable1HeatExchanger(prev => prev.map(r => {
      if (r.id === id) {
        return {
          ...r,
          [role]: { ...r[role], [field]: val }
        };
      }
      return r;
    }));
  };

  // Handlers for Appendix A Table 2
  const updateTable2Row = (id: string, field: 'checked', val: boolean) => {
    setTable2Vessels(prev => prev.map(r => r.id === id ? { ...r, checked: val } : r));
  };

  const updateTable2Sig = (
    id: string, 
    role: 'pes' | 'tss' | 'ops', 
    field: keyof AppendixARowSignature, 
    val: any
  ) => {
    setTable2Vessels(prev => prev.map(r => {
      if (r.id === id) {
        return {
          ...r,
          [role]: { ...r[role], [field]: val }
        };
      }
      return r;
    }));
  };

  // Handlers for Appendix B Exceptions
  const handleAddException = () => {
    setExceptions(prev => [
      ...prev,
      {
        id: `exc-${Date.now()}`,
        no: prev.length + 1,
        description: ''
      }
    ]);
  };

  const handleUpdateException = (id: string, description: string) => {
    setExceptions(prev => prev.map(e => e.id === id ? { ...e, description } : e));
  };

  const handleDeleteException = (id: string) => {
    setExceptions(prev => prev.filter(e => e.id !== id).map((item, idx) => ({ ...item, no: idx + 1 })));
  };

  const renderSignatureCell = (
    rowId: string,
    role: 'pes' | 'tss' | 'ops',
    roleLabel: string,
    sig: AppendixARowSignature,
    onUpdate: (id: string, role: 'pes' | 'tss' | 'ops', field: keyof AppendixARowSignature, val: any) => void
  ) => {
    return (
      <div className={`p-2 rounded-lg border text-xs space-y-1.5 transition-all ${
        sig.isNA 
          ? 'bg-slate-100 dark:bg-slate-800/40 border-slate-200 dark:border-slate-800 opacity-60' 
          : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 shadow-xs'
      }`}>
        <div className="flex items-center justify-between gap-1">
          <span className="font-bold text-[10px] uppercase text-slate-500 tracking-wider">
            {roleLabel}
          </span>
          <label className="flex items-center gap-1 text-[10px] cursor-pointer text-slate-400 hover:text-slate-600">
            <input 
              type="checkbox"
              checked={sig.isNA}
              onChange={(e) => onUpdate(rowId, role, 'isNA', e.target.checked)}
              className="rounded text-blue-600 focus:ring-blue-500 w-3 h-3"
            />
            <span>N/A</span>
          </label>
        </div>

        {!sig.isNA ? (
          <div className="space-y-1">
            <Input
              value={sig.name}
              onChange={(e) => onUpdate(rowId, role, 'name', e.target.value)}
              placeholder="Name / Sign"
              className="h-6 text-[11px] px-1.5 py-0.5"
            />
            <Input
              type="date"
              value={sig.date}
              onChange={(e) => onUpdate(rowId, role, 'date', e.target.value)}
              className="h-6 text-[10px] font-mono px-1 py-0.5"
            />
          </div>
        ) : (
          <div className="text-[11px] text-slate-400 font-mono italic text-center py-2">
            Not Applicable
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-blue-950 p-6 rounded-2xl text-white shadow-xl border border-slate-700/50 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Badge variant="default" className="bg-blue-600 text-white font-mono text-[10px]">
              FORM QA/QC-APP-A/B
            </Badge>
            <span className="text-slate-400 text-xs font-mono">• Rev. 05 Final Approved</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black tracking-tight mt-1 flex items-center gap-2">
            <FileCheck className="text-blue-400" size={26} />
            Equipment Closing Form (Appendix A & B)
          </h2>
          <p className="text-xs sm:text-sm text-slate-300 mt-1 max-w-3xl">
            Formal engineering protocol for equipment internal cleanliness inspection, manhole closure acceptance, box-up exception tracking, de-blinding authorization, and Flange Police QA sign-off.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Button onClick={() => window.print()} variant="outline" className="border-slate-600 text-slate-200 hover:bg-slate-800 gap-1.5 text-xs cursor-pointer">
            <Printer size={14} />
            <span>Print Form</span>
          </Button>
          <Button className="bg-blue-600 hover:bg-blue-700 text-white gap-1.5 text-xs shadow-md cursor-pointer">
            <Download size={14} />
            <span>Export Official PDF</span>
          </Button>
        </div>
      </div>

      {/* =========================================================================
          HEADER FIELDS SECTION
         ========================================================================= */}
      <Card className="border-2 border-slate-200 dark:border-slate-800 shadow-sm">
        <CardHeader className="bg-slate-50 dark:bg-slate-800/50 py-3 px-5 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black tracking-widest text-slate-600 dark:text-slate-300 uppercase">
              Form Header & Equipment Metadata
            </span>
            <span className="text-[10px] font-mono text-slate-400">PLANT OPERATIONS & MAINTENANCE</span>
          </div>
        </CardHeader>
        <CardContent className="p-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
            <div>
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                WO No.
              </label>
              <Input
                value={header.woNo}
                onChange={(e) => setHeader(prev => ({ ...prev, woNo: e.target.value }))}
                className="font-mono font-bold h-8 text-xs"
              />
            </div>

            <div>
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                Equipment No.
              </label>
              <Input
                value={header.equipmentNo}
                onChange={(e) => setHeader(prev => ({ ...prev, equipmentNo: e.target.value }))}
                className="font-bold text-blue-600 dark:text-blue-400 h-8 text-xs"
              />
            </div>

            <div>
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                Unit No.
              </label>
              <Input
                value={header.unitNo}
                onChange={(e) => setHeader(prev => ({ ...prev, unitNo: e.target.value }))}
                className="h-8 text-xs"
              />
            </div>

            <div>
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                BT
              </label>
              <Input
                value={header.bt}
                onChange={(e) => setHeader(prev => ({ ...prev, bt: e.target.value }))}
                className="font-mono h-8 text-xs"
              />
            </div>

            <div className="lg:col-span-2">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                Job Description
              </label>
              <Input
                value={header.jobDescription}
                onChange={(e) => setHeader(prev => ({ ...prev, jobDescription: e.target.value }))}
                className="h-8 text-xs"
              />
            </div>

            <div>
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                WSR / EWR / D-EWR No.
              </label>
              <Input
                value={header.wsrEwrNo}
                onChange={(e) => setHeader(prev => ({ ...prev, wsrEwrNo: e.target.value }))}
                className="font-mono h-8 text-xs"
              />
            </div>

            <div>
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                System No. / EIC No.
              </label>
              <Input
                value={header.systemNoEicNo}
                onChange={(e) => setHeader(prev => ({ ...prev, systemNoEicNo: e.target.value }))}
                className="font-mono h-8 text-xs"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* =========================================================================
          SECTION 1: APPENDIX A (Acceptance for Heat Exchanger, Tower, Drum, Furnace and Reactor)
         ========================================================================= */}
      <Card className="border-2 border-blue-200 dark:border-blue-900 shadow-md">
        <CardHeader className="bg-blue-50/60 dark:bg-blue-950/30 border-b border-blue-100 dark:border-blue-900/60 py-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-blue-600" />
                <CardTitle className="text-base text-blue-900 dark:text-blue-200">
                  Section 1: Appendix A (Acceptance for Heat Exchanger, Tower, Drum, Furnace and Reactor)
                </CardTitle>
              </div>
              <CardDescription className="text-blue-700 dark:text-blue-300">
                Multi-discipline cleanliness and pre-closing authorization. Mark inspection verification and provide signatures for PES, TSS, and OPS (or check N/A).
              </CardDescription>
            </div>
            <Badge variant="outline" className="border-blue-300 text-blue-700 dark:text-blue-300 bg-white dark:bg-slate-900">
              Tri-Party Signatures
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="p-6 space-y-8">
          {/* Table 1 (Heat Exchanger): 3 Rows */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-slate-200 flex items-center gap-2">
                <Layers size={16} className="text-blue-600" />
                <span>Table 1: Heat Exchanger Acceptance</span>
                <span className="text-slate-400 font-normal text-[11px]">(3 Standard Verification Stages)</span>
              </h3>
            </div>

            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50 dark:bg-slate-800/60">
                  <TableHead className="w-16 text-center">Mark</TableHead>
                  <TableHead className="min-w-64">Verification Item / Scope</TableHead>
                  <TableHead className="w-56 text-center">PES (Plant Eng Specialist)</TableHead>
                  <TableHead className="w-56 text-center">TSS (Technical Support)</TableHead>
                  <TableHead className="w-56 text-center">OPS (Operations Rep)</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {table1HeatExchanger.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell className="text-center align-middle">
                      <div className="flex items-center justify-center">
                        <Checkbox
                          checked={row.checked}
                          onCheckedChange={(checked) => updateTable1Row(row.id, 'checked', checked)}
                        />
                      </div>
                    </TableCell>
                    <TableCell className="align-middle">
                      <span className="font-semibold text-slate-900 dark:text-white text-xs block">
                        {row.description}
                      </span>
                    </TableCell>
                    <TableCell>
                      {renderSignatureCell(row.id, 'pes', 'PES Signature', row.pes, updateTable1Sig)}
                    </TableCell>
                    <TableCell>
                      {renderSignatureCell(row.id, 'tss', 'TSS Signature', row.tss, updateTable1Sig)}
                    </TableCell>
                    <TableCell>
                      {renderSignatureCell(row.id, 'ops', 'OPS Signature', row.ops, updateTable1Sig)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Table 2 (Tower/Drum/Furnace/Reactor): 5 Rows */}
          <div className="space-y-3 pt-4 border-t border-slate-200 dark:border-slate-800">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-slate-200 flex items-center gap-2">
                <Building2 size={16} className="text-indigo-600" />
                <span>Table 2: Tower, Drum, Furnace & Reactor Acceptance</span>
                <span className="text-slate-400 font-normal text-[11px]">(5 Standard Closure Stages)</span>
              </h3>
            </div>

            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50 dark:bg-slate-800/60">
                  <TableHead className="w-16 text-center">Mark</TableHead>
                  <TableHead className="min-w-64">Verification Item / Scope</TableHead>
                  <TableHead className="w-56 text-center">PES (Plant Eng Specialist)</TableHead>
                  <TableHead className="w-56 text-center">TSS (Technical Support)</TableHead>
                  <TableHead className="w-56 text-center">OPS (Operations Rep)</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {table2Vessels.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell className="text-center align-middle">
                      <div className="flex items-center justify-center">
                        <Checkbox
                          checked={row.checked}
                          onCheckedChange={(checked) => updateTable2Row(row.id, 'checked', checked)}
                        />
                      </div>
                    </TableCell>
                    <TableCell className="align-middle">
                      <span className="font-semibold text-slate-900 dark:text-white text-xs block">
                        {row.description}
                      </span>
                    </TableCell>
                    <TableCell>
                      {renderSignatureCell(row.id, 'pes', 'PES Signature', row.pes, updateTable2Sig)}
                    </TableCell>
                    <TableCell>
                      {renderSignatureCell(row.id, 'tss', 'TSS Signature', row.tss, updateTable2Sig)}
                    </TableCell>
                    <TableCell>
                      {renderSignatureCell(row.id, 'ops', 'OPS Signature', row.ops, updateTable2Sig)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* =========================================================================
          SECTION 2: APPENDIX B (Box up and Turnover equipment)
         ========================================================================= */}
      <Card className="border-2 border-emerald-200 dark:border-emerald-900 shadow-md">
        <CardHeader className="bg-emerald-50/60 dark:bg-emerald-950/30 border-b border-emerald-100 dark:border-emerald-900/60 py-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-600" />
                <CardTitle className="text-base text-emerald-900 dark:text-emerald-200">
                  Section 2: Appendix B (Box up and Turnover equipment)
                </CardTitle>
              </div>
              <CardDescription className="text-emerald-700 dark:text-emerald-300">
                Log authorized equipment closure reservations/exceptions and execute the 4 mandatory turnover custody signature blocks.
              </CardDescription>
            </div>
            <Button
              onClick={handleAddException}
              size="sm"
              variant="outline"
              className="gap-1.5 text-xs bg-white dark:bg-slate-900 cursor-pointer"
            >
              <Plus size={14} />
              <span>Add Exception Row</span>
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-6 space-y-8">
          {/* Exception List Table: Columns for No., Description, Action */}
          <div className="space-y-3">
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-slate-200">
              Exception List Table
            </h3>

            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50 dark:bg-slate-800/60">
                  <TableHead className="w-20 text-center font-bold">No.</TableHead>
                  <TableHead className="min-w-96">Description of Exception / Outstanding Work</TableHead>
                  <TableHead className="w-24 text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {exceptions.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center py-6 text-slate-400 text-xs">
                      No exceptions listed. Equipment box-up authorized without reservations.
                    </TableCell>
                  </TableRow>
                ) : (
                  exceptions.map((exc) => (
                    <TableRow key={exc.id}>
                      <TableCell className="text-center font-mono font-bold text-xs">
                        {exc.no}
                      </TableCell>
                      <TableCell>
                        <Input
                          value={exc.description}
                          onChange={(e) => handleUpdateException(exc.id, e.target.value)}
                          placeholder="Enter exception details..."
                          className="text-xs h-8"
                        />
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDeleteException(exc.id)}
                          className="text-red-500 hover:text-red-700 hover:bg-red-50 cursor-pointer"
                        >
                          <Trash2 size={15} />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {/* 4 Signature Blocks (Position, Signature, Name, Date) */}
          <div className="space-y-4 pt-4 border-t border-slate-200 dark:border-slate-800">
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-slate-200">
              Appendix B Turnover Signature Blocks
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Block 1: Job Leader / ME */}
              <div className="p-4 rounded-xl border-2 border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider">
                    {appendixBSignatures.jobLeader.position}
                  </span>
                  <Badge variant={appendixBSignatures.jobLeader.signed ? 'success' : 'secondary'}>
                    {appendixBSignatures.jobLeader.signed ? 'Signed' : 'Pending'}
                  </Badge>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase">Name:</label>
                  <Input
                    value={appendixBSignatures.jobLeader.name}
                    onChange={(e) => setAppendixBSignatures(prev => ({
                      ...prev,
                      jobLeader: { ...prev.jobLeader, name: e.target.value }
                    }))}
                    className="h-7 text-xs font-semibold"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase">Digital Signature:</label>
                  <div className="p-2 rounded border border-dashed border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-center">
                    <span className="font-serif italic font-bold text-sm text-blue-600 dark:text-blue-400">
                      {appendixBSignatures.jobLeader.signature}
                    </span>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase">Date:</label>
                  <Input
                    type="date"
                    value={appendixBSignatures.jobLeader.date}
                    onChange={(e) => setAppendixBSignatures(prev => ({
                      ...prev,
                      jobLeader: { ...prev.jobLeader, date: e.target.value }
                    }))}
                    className="h-7 text-xs font-mono"
                  />
                </div>
              </div>

              {/* Block 2: TSS Representative */}
              <div className="p-4 rounded-xl border-2 border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">
                    {appendixBSignatures.tssRep.position}
                  </span>
                  <Badge variant={appendixBSignatures.tssRep.signed ? 'success' : 'secondary'}>
                    {appendixBSignatures.tssRep.signed ? 'Signed' : 'Pending'}
                  </Badge>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase">Name:</label>
                  <Input
                    value={appendixBSignatures.tssRep.name}
                    onChange={(e) => setAppendixBSignatures(prev => ({
                      ...prev,
                      tssRep: { ...prev.tssRep, name: e.target.value }
                    }))}
                    className="h-7 text-xs font-semibold"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase">Digital Signature:</label>
                  <div className="p-2 rounded border border-dashed border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-center">
                    <span className="font-serif italic font-bold text-sm text-indigo-600 dark:text-indigo-400">
                      {appendixBSignatures.tssRep.signature}
                    </span>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase">Date:</label>
                  <Input
                    type="date"
                    value={appendixBSignatures.tssRep.date}
                    onChange={(e) => setAppendixBSignatures(prev => ({
                      ...prev,
                      tssRep: { ...prev.tssRep, date: e.target.value }
                    }))}
                    className="h-7 text-xs font-mono"
                  />
                </div>
              </div>

              {/* Block 3: Process Technical Contact Engineer (PES) */}
              <div className="p-4 rounded-xl border-2 border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-blue-700 dark:text-blue-300 uppercase tracking-wider">
                    {appendixBSignatures.pes.position}
                  </span>
                  <Badge variant={appendixBSignatures.pes.signed ? 'success' : 'secondary'}>
                    {appendixBSignatures.pes.signed ? 'Signed' : 'Pending'}
                  </Badge>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase">Name:</label>
                  <Input
                    value={appendixBSignatures.pes.name}
                    onChange={(e) => setAppendixBSignatures(prev => ({
                      ...prev,
                      pes: { ...prev.pes, name: e.target.value }
                    }))}
                    className="h-7 text-xs font-semibold"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase">Digital Signature:</label>
                  <div className="p-2 rounded border border-dashed border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-center">
                    <span className="font-serif italic font-bold text-sm text-blue-700 dark:text-blue-300">
                      {appendixBSignatures.pes.signature}
                    </span>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase">Date:</label>
                  <Input
                    type="date"
                    value={appendixBSignatures.pes.date}
                    onChange={(e) => setAppendixBSignatures(prev => ({
                      ...prev,
                      pes: { ...prev.pes, date: e.target.value }
                    }))}
                    className="h-7 text-xs font-mono"
                  />
                </div>
              </div>

              {/* Block 4: Process Operation Representative (OPS) */}
              <div className="p-4 rounded-xl border-2 border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">
                    {appendixBSignatures.ops.position}
                  </span>
                  <Badge variant={appendixBSignatures.ops.signed ? 'success' : 'secondary'}>
                    {appendixBSignatures.ops.signed ? 'Signed' : 'Pending'}
                  </Badge>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase">Name:</label>
                  <Input
                    value={appendixBSignatures.ops.name}
                    onChange={(e) => setAppendixBSignatures(prev => ({
                      ...prev,
                      ops: { ...prev.ops, name: e.target.value }
                    }))}
                    className="h-7 text-xs font-semibold"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase">Digital Signature:</label>
                  <div className="p-2 rounded border border-dashed border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-center">
                    <span className="font-serif italic font-bold text-sm text-emerald-600 dark:text-emerald-400">
                      {appendixBSignatures.ops.signature}
                    </span>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase">Date:</label>
                  <Input
                    type="date"
                    value={appendixBSignatures.ops.date}
                    onChange={(e) => setAppendixBSignatures(prev => ({
                      ...prev,
                      ops: { ...prev.ops, date: e.target.value }
                    }))}
                    className="h-7 text-xs font-mono"
                  />
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* =========================================================================
          FOOTER SECTION
         ========================================================================= */}
      <Card className="border-2 border-slate-300 dark:border-slate-700 shadow-xl bg-slate-50/50 dark:bg-slate-900/60">
        <CardHeader className="py-3 px-6 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <ShieldCheck size={20} className="text-emerald-600" />
            <CardTitle className="text-sm">Footer Section: Operational Authorization & Clearance Gates</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="p-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Gate 1: Approve to Proceed (Y, N, N/A, Signature/Name AEL, Date) */}
            <div className="p-5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/80 space-y-4">
              <div>
                <span className="text-xs font-black uppercase text-slate-900 dark:text-white block">
                  1. Approve to Proceed
                </span>
                <span className="text-[10px] text-slate-500 block">
                  Designated Area Execution Lead (AEL) formal stamp
                </span>
              </div>

              {/* Checkboxes Y, N, N/A */}
              <div className="flex items-center gap-4 bg-slate-50 dark:bg-slate-900/60 p-2.5 rounded-lg border border-slate-200 dark:border-slate-800 text-xs">
                {(['Y', 'N', 'N/A'] as const).map((opt) => (
                  <label key={opt} className="flex items-center gap-1.5 cursor-pointer font-bold">
                    <input
                      type="radio"
                      name="approveToProceedRadio"
                      checked={approveToProceed === opt}
                      onChange={() => setApproveToProceed(opt)}
                      className="text-emerald-600 focus:ring-emerald-500 w-4 h-4"
                    />
                    <span className={approveToProceed === opt ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-600 dark:text-slate-400'}>
                      {opt}
                    </span>
                  </label>
                ))}
              </div>

              {/* Signature / Name (AEL) */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase">Signature / Name (AEL):</label>
                <Input
                  value={aelSignature.name}
                  onChange={(e) => setAelSignature(prev => ({ ...prev, name: e.target.value }))}
                  className="h-8 text-xs font-semibold"
                />
              </div>

              {/* Date */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase">Date:</label>
                <Input
                  type="date"
                  value={aelSignature.date}
                  onChange={(e) => setAelSignature(prev => ({ ...prev, date: e.target.value }))}
                  className="h-8 text-xs font-mono"
                />
              </div>
            </div>

            {/* Gate 2: De-blind (Checkbox / Signature) */}
            <div className="p-5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/80 space-y-4">
              <div>
                <span className="text-xs font-black uppercase text-slate-900 dark:text-white block">
                  2. De-blind Clearance
                </span>
                <span className="text-[10px] text-slate-500 block">
                  Positive isolation spade removal verified on-site
                </span>
              </div>

              <div className="flex items-center gap-3 bg-slate-50 dark:bg-slate-900/60 p-2.5 rounded-lg border border-slate-200 dark:border-slate-800 text-xs">
                <Checkbox
                  checked={deBlindSection.checked}
                  onCheckedChange={(checked) => setDeBlindSection(prev => ({ ...prev, checked }))}
                  label="De-blind Verified Completed"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase">Authorized De-Blind Signature:</label>
                <Input
                  value={deBlindSection.signature}
                  onChange={(e) => setDeBlindSection(prev => ({ ...prev, signature: e.target.value }))}
                  className="h-8 text-xs font-semibold font-serif italic text-blue-600 dark:text-blue-400"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase">Verification Date:</label>
                <Input
                  type="date"
                  value={deBlindSection.date}
                  onChange={(e) => setDeBlindSection(prev => ({ ...prev, date: e.target.value }))}
                  className="h-8 text-xs font-mono"
                />
              </div>
            </div>

            {/* Gate 3: Flange Police (Checkbox / Signature) */}
            <div className="p-5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/80 space-y-4">
              <div>
                <span className="text-xs font-black uppercase text-slate-900 dark:text-white block">
                  3. Flange Police Clearance
                </span>
                <span className="text-[10px] text-slate-500 block">
                  100% torque sequence & QA tamper seal tag inspected
                </span>
              </div>

              <div className="flex items-center gap-3 bg-slate-50 dark:bg-slate-900/60 p-2.5 rounded-lg border border-slate-200 dark:border-slate-800 text-xs">
                <Checkbox
                  checked={flangePoliceSection.checked}
                  onCheckedChange={(checked) => setFlangePoliceSection(prev => ({ ...prev, checked }))}
                  label="Flange Police Check Completed"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase">Flange Police QC Signature:</label>
                <Input
                  value={flangePoliceSection.signature}
                  onChange={(e) => setFlangePoliceSection(prev => ({ ...prev, signature: e.target.value }))}
                  className="h-8 text-xs font-semibold font-serif italic text-emerald-600 dark:text-emerald-400"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase">QC Inspection Date:</label>
                <Input
                  type="date"
                  value={flangePoliceSection.date}
                  onChange={(e) => setFlangePoliceSection(prev => ({ ...prev, date: e.target.value }))}
                  className="h-8 text-xs font-mono"
                />
              </div>
            </div>
          </div>
        </CardContent>
        <CardFooter className="bg-slate-100/80 dark:bg-slate-800/80 p-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500">
          <div className="flex items-center gap-2">
            <CheckCircle2 size={16} className="text-emerald-600" />
            <span>Appendix A & B fully endorsed for handover to Turnaround Commissioning Team.</span>
          </div>
          <span className="font-mono text-[11px]">FORM-ID: QAQC-2026-APPAB-001</span>
        </CardFooter>
      </Card>
    </div>
  );
}
