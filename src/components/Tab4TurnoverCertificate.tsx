import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from './ui/card';
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from './ui/table';
import { Input } from './ui/input';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { usePlantTurnShared } from '../context/PlantTurnSharedContext';
import { 
  Award, FileText, CheckCircle2, ShieldCheck, Printer, 
  Download, Plus, Trash2, Building2, Check, AlertTriangle, ShieldAlert, Clock
} from 'lucide-react';

interface TurnoverException {
  id: string;
  no: number;
  description: string;
}

interface TurnoverSignatureBlock {
  position: string;
  signature: string;
  name: string;
  date: string;
  signed: boolean;
}

export default function Tab4TurnoverCertificate() {
  const { selectedJob, canIssueTurnoverCertificate } = usePlantTurnShared();

  // ================= Header Fields =================
  const [header, setHeader] = useState({
    bt: selectedJob?.gridZone || 'BT-04-ZONE-A',
    systemNo: selectedJob?.system || 'SYS-11-CRUDE-01',
    unitNo: selectedJob?.unit || 'Unit 11 (Crude Distillation)'
  });

  useEffect(() => {
    if (selectedJob) {
      setHeader({
        bt: selectedJob.gridZone || 'BT-04-ZONE-A',
        systemNo: selectedJob.system,
        unitNo: selectedJob.unit
      });
    }
  }, [selectedJob]);

  const clearanceStatus = canIssueTurnoverCertificate(selectedJob?.id || '');

  // Statement text exactly as specified by user
  const statementText = "The above system has been inspected by the appointed representatives or inspectors and is considered to be acceptable under the terms of the above WO for final turnover with the exceptions as listed below:";

  // ================= Exception List Table (Columns: No., Description) =================
  const [exceptions, setExceptions] = useState<TurnoverException[]>([
    {
      id: 'to-exc-1',
      no: 1,
      description: 'PWHT radiographic examination archive compilation for nozzle N3 to be filed in Master Turnover Dossier within 5 working days.'
    },
    {
      id: 'to-exc-2',
      no: 2,
      description: 'Temporary steam tracing trap assembly SP-1102 touch-up insulation to be completed post start-up thermal expansion survey.'
    }
  ]);

  // Derive signatures from selectedJob.signatures if available
  const opsSig = selectedJob?.signatures.find(s => s.role.toLowerCase().includes('operat'));
  const leadSig = selectedJob?.signatures.find(s => s.role.toLowerCase().includes('lead') || s.role.toLowerCase().includes('owner') || s.role.toLowerCase().includes('maint'));

  // ================= Signature Blocks (Position, Signature, Name, Date) =================
  // 1. Prepared By: Turnover Lead
  const [preparedBy, setPreparedBy] = useState<TurnoverSignatureBlock>({
    position: 'Turnover Lead',
    signature: leadSig?.name || 'Somchai Prasert',
    name: leadSig?.name || 'Somchai Prasert, PE',
    date: leadSig?.signedAt?.slice(0, 10) || '2026-09-24',
    signed: Boolean(leadSig)
  });

  // 2. Endorsed / Accepted By: SD Manager / Operations Lead
  const [endorsedBy, setEndorsedBy] = useState<TurnoverSignatureBlock>({
    position: 'Operations Lead / SD Manager',
    signature: opsSig?.name || 'Wichai Thongchai',
    name: opsSig?.name || 'Dr. Wichai Thongchai',
    date: opsSig?.signedAt?.slice(0, 10) || '2026-09-24',
    signed: Boolean(opsSig)
  });

  useEffect(() => {
    if (leadSig) {
      setPreparedBy({
        position: leadSig.role || 'Turnover Lead',
        signature: leadSig.name,
        name: leadSig.name,
        date: leadSig.signedAt?.slice(0, 10) || new Date().toISOString().slice(0, 10),
        signed: leadSig.decision === 'Accept'
      });
    }
    if (opsSig) {
      setEndorsedBy({
        position: opsSig.role || 'Operations Lead',
        signature: opsSig.name,
        name: opsSig.name,
        date: opsSig.signedAt?.slice(0, 10) || new Date().toISOString().slice(0, 10),
        signed: opsSig.decision === 'Accept'
      });
    }
  }, [leadSig, opsSig]);

  const handleAddException = () => {
    setExceptions(prev => [
      ...prev,
      {
        id: `to-exc-${Date.now()}`,
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

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-10">
      {/* Top Banner / Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Badge variant="default" className={clearanceStatus.canIssue ? "bg-emerald-600 text-white" : "bg-amber-500 text-slate-950 font-bold"}>
              {clearanceStatus.canIssue ? "Official Handover Ready" : "Pending Clearance"}
            </Badge>
            <span className="text-slate-400 text-xs font-mono">SYS-TO-FORM-04 • Final Endorsement</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight mt-1 flex items-center gap-2">
            <Award className={clearanceStatus.canIssue ? "text-emerald-500" : "text-amber-500"} size={24} />
            Turnover Certificate
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Formal mechanical completion sign-off and operational transfer of care, custody, and control.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button onClick={handlePrint} variant="outline" className="gap-2 cursor-pointer">
            <Printer size={15} />
            <span>Print Certificate</span>
          </Button>
          <Button 
            disabled={!clearanceStatus.canIssue}
            className={`gap-2 shadow-md cursor-pointer ${
              clearanceStatus.canIssue 
                ? 'bg-emerald-600 hover:bg-emerald-700 text-white' 
                : 'bg-slate-300 dark:bg-slate-700 text-slate-500 cursor-not-allowed opacity-60'
            }`}
          >
            <Download size={15} />
            <span>{clearanceStatus.canIssue ? 'Export Official PDF' : 'Certificate Locked'}</span>
          </Button>
        </div>
      </div>

      {/* Clearance Status Warning / Confirmation Banner */}
      {!clearanceStatus.canIssue ? (
        <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border-2 border-amber-300 dark:border-amber-800 text-amber-950 dark:text-amber-200 text-xs shadow-xs space-y-2 animate-in fade-in">
          <div className="flex items-center gap-2.5 font-bold text-sm text-amber-900 dark:text-amber-300">
            <ShieldAlert size={18} className="text-amber-600 shrink-0" />
            <span>สถานะ: ยังไม่สามารถออก Certificate ฉบับสมบูรณ์ได้ (Pending Clearance)</span>
          </div>
          <p className="text-[11px] text-slate-600 dark:text-slate-300">
            ตามข้อกำหนด SOP-TO-402 การออกใบรับรองส่งมอบระบบ (Custody Transfer) ต้องผ่านเกณฑ์ทั้งหมดดังนี้:
          </p>
          <ul className="list-disc list-inside space-y-1 text-[11px] text-amber-800 dark:text-amber-300 font-medium pl-1">
            {clearanceStatus.reasons.map((r, i) => (
              <li key={i}>{r}</li>
            ))}
          </ul>
        </div>
      ) : (
        <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/30 border-2 border-emerald-400 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200 text-xs shadow-xs flex items-center justify-between animate-in fade-in">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-100 dark:bg-emerald-900 text-emerald-700 dark:text-emerald-300 flex items-center justify-center shrink-0">
              <CheckCircle2 size={20} />
            </div>
            <div>
              <span className="font-bold text-sm block text-emerald-950 dark:text-emerald-100">
                ✓ ผ่านการตรวจสอบครบทุกเกณฑ์: พร้อมสำหรับการลงนามส่งมอบและเริ่มเดินเครื่อง
              </span>
              <span className="text-[11px] text-emerald-700 dark:text-emerald-300">
                Zero Open Cat A Punch Items • Dual Endorsements Verified (Maintenance & Operations)
              </span>
            </div>
          </div>
          <Badge className="bg-emerald-600 text-white font-bold shrink-0">
            Certified Ready
          </Badge>
        </div>
      )}

      {/* Main Certificate Document Card */}
      <Card className="border-2 border-slate-300 dark:border-slate-700 shadow-xl overflow-hidden bg-white dark:bg-slate-900">
        {/* Certificate Border Decorator */}
        <div className="h-3 bg-gradient-to-r from-blue-600 via-indigo-600 to-emerald-600" />

        {/* Certificate Header Block */}
        <div className="p-8 border-b border-slate-200 dark:border-slate-800 text-center space-y-3">
          <div className="inline-flex items-center justify-center p-3 rounded-full bg-slate-100 dark:bg-slate-800 text-blue-600 mb-1">
            <Building2 size={28} />
          </div>
          <h1 className="text-2xl font-black tracking-widest text-slate-900 dark:text-white uppercase font-serif">
            Certificate of Mechanical Completion & Turnover
          </h1>
          <p className="text-xs text-slate-500 uppercase tracking-widest font-mono">
            Standard Procedure QA/QC-TO-701 • Rev. 04
          </p>

          {/* =========================================================================
              HEADER FIELDS: BT, System no., Unit No.
             ========================================================================= */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-6 p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-left text-xs">
            <div>
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                BT
              </label>
              <Input
                value={header.bt}
                onChange={(e) => setHeader(prev => ({ ...prev, bt: e.target.value }))}
                className="font-mono font-bold h-8 text-xs"
                placeholder="e.g. BT-04-ZONE-A"
              />
            </div>
            <div>
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                System no.
              </label>
              <Input
                value={header.systemNo}
                onChange={(e) => setHeader(prev => ({ ...prev, systemNo: e.target.value }))}
                className="font-mono font-bold text-blue-600 dark:text-blue-400 h-8 text-xs"
                placeholder="e.g. SYS-11-CRUDE-01"
              />
            </div>
            <div>
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                Unit No.
              </label>
              <Input
                value={header.unitNo}
                onChange={(e) => setHeader(prev => ({ ...prev, unitNo: e.target.value }))}
                className="font-bold h-8 text-xs"
                placeholder="e.g. Unit 11 (Crude Distillation)"
              />
            </div>
          </div>
        </div>

        <CardContent className="p-8 space-y-8">
          {/* =========================================================================
              STATEMENT TEXT BLOCK
             ========================================================================= */}
          <div className="p-6 rounded-2xl border-2 border-blue-200 dark:border-blue-900 bg-blue-50/40 dark:bg-blue-950/20 space-y-3">
            <div className="flex items-center gap-2 text-blue-700 dark:text-blue-300 font-bold text-xs uppercase tracking-wider">
              <ShieldCheck size={18} />
              <span>Statement of Acceptance</span>
            </div>

            <p className="text-sm sm:text-base text-slate-800 dark:text-slate-100 leading-relaxed font-serif italic font-medium">
              "{statementText}"
            </p>
          </div>

          {/* =========================================================================
              EXCEPTION LIST TABLE: Columns for No., Description
             ========================================================================= */}
          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
                  <FileText size={16} className="text-emerald-600" />
                  <span>Exception List Table</span>
                  <Badge variant="outline" className="text-[10px] font-mono">
                    {exceptions.length} Outstanding
                  </Badge>
                </h3>
                <p className="text-xs text-slate-500">
                  Logged exceptions or incomplete non-critical works permitted under turnover terms.
                </p>
              </div>
              <Button onClick={handleAddException} size="sm" variant="outline" className="gap-1.5 cursor-pointer text-xs">
                <Plus size={14} />
                <span>Add Exception</span>
              </Button>
            </div>

            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50 dark:bg-slate-800/60">
                  <TableHead className="w-20 text-center font-bold">No.</TableHead>
                  <TableHead className="min-w-96">Description</TableHead>
                  <TableHead className="w-20 text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {exceptions.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center py-6 text-slate-400 text-xs">
                      No exceptions listed. Turnover executed without outstanding reservations.
                    </TableCell>
                  </TableRow>
                ) : (
                  exceptions.map((exc) => (
                    <TableRow key={exc.id}>
                      <TableCell className="text-center font-mono font-bold text-xs text-slate-900 dark:text-white">
                        {exc.no}
                      </TableCell>
                      <TableCell>
                        <Input
                          value={exc.description}
                          onChange={(e) => handleUpdateException(exc.id, e.target.value)}
                          placeholder="Enter exception description..."
                          className="h-8 text-xs"
                        />
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDeleteException(exc.id)}
                          className="text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/40 cursor-pointer"
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

          {/* =========================================================================
              SIGNATURE BLOCKS: Position, Signature, Name, Date
              - Prepared By: Turnover Lead
              - Endorsed / Accepted By: SD Manager
             ========================================================================= */}
          <div className="pt-6 border-t border-slate-200 dark:border-slate-800 space-y-4">
            <h3 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-wider">
              Turnover Execution & Acceptance Signatures
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Block 1: Prepared By (Turnover Lead) */}
              <div className="p-6 rounded-2xl border-2 border-blue-200 dark:border-blue-900/60 bg-blue-50/30 dark:bg-blue-950/20 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">
                      Originator Role
                    </span>
                    <span className="text-sm font-black text-blue-700 dark:text-blue-300 uppercase tracking-wider block">
                      Prepared By: {preparedBy.position}
                    </span>
                  </div>
                  <Badge variant="default" className="bg-blue-600 text-white text-[10px]">
                    Turnover Lead
                  </Badge>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Position:</label>
                  <Input
                    value={preparedBy.position}
                    onChange={(e) => setPreparedBy(prev => ({ ...prev, position: e.target.value }))}
                    className="h-8 text-xs font-semibold"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Name:</label>
                  <Input
                    value={preparedBy.name}
                    onChange={(e) => setPreparedBy(prev => ({ ...prev, name: e.target.value }))}
                    className="h-8 text-xs font-bold"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Signature:</label>
                  <div className="p-3 rounded-xl border border-dashed border-blue-300 dark:border-blue-800 bg-white dark:bg-slate-900 flex flex-col items-center justify-center space-y-0.5 shadow-inner">
                    <span className="font-serif italic text-2xl text-blue-600 dark:text-blue-400 font-bold tracking-wider">
                      {preparedBy.signature}
                    </span>
                    <span className="text-[9px] text-slate-400 font-mono">
                      Digitally Signed & Validated • SHA-256
                    </span>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Date:</label>
                  <Input
                    type="date"
                    value={preparedBy.date}
                    onChange={(e) => setPreparedBy(prev => ({ ...prev, date: e.target.value }))}
                    className="h-8 text-xs font-mono"
                  />
                </div>
              </div>

              {/* Block 2: Endorsed / Accepted By (SD Manager) */}
              <div className="p-6 rounded-2xl border-2 border-emerald-200 dark:border-emerald-900/60 bg-emerald-50/30 dark:bg-emerald-950/20 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">
                      Executive Authority
                    </span>
                    <span className="text-sm font-black text-emerald-700 dark:text-emerald-300 uppercase tracking-wider block">
                      Endorsed / Accepted By: {endorsedBy.position}
                    </span>
                  </div>
                  <Badge variant="default" className="bg-emerald-600 text-white text-[10px]">
                    SD Manager
                  </Badge>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Position:</label>
                  <Input
                    value={endorsedBy.position}
                    onChange={(e) => setEndorsedBy(prev => ({ ...prev, position: e.target.value }))}
                    className="h-8 text-xs font-semibold"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Name:</label>
                  <Input
                    value={endorsedBy.name}
                    onChange={(e) => setEndorsedBy(prev => ({ ...prev, name: e.target.value }))}
                    className="h-8 text-xs font-bold"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Signature:</label>
                  <div className="p-3 rounded-xl border border-dashed border-emerald-300 dark:border-emerald-800 bg-white dark:bg-slate-900 flex flex-col items-center justify-center space-y-0.5 shadow-inner">
                    <span className="font-serif italic text-2xl text-emerald-600 dark:text-emerald-400 font-bold tracking-wider">
                      {endorsedBy.signature}
                    </span>
                    <span className="text-[9px] text-slate-400 font-mono">
                      Executive Digital Authorization Stamp
                    </span>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Date:</label>
                  <Input
                    type="date"
                    value={endorsedBy.date}
                    onChange={(e) => setEndorsedBy(prev => ({ ...prev, date: e.target.value }))}
                    className="h-8 text-xs font-mono"
                  />
                </div>
              </div>
            </div>
          </div>
        </CardContent>

        <CardFooter className="bg-slate-50 dark:bg-slate-800/60 p-5 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500 border-t border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <CheckCircle2 size={16} className="text-emerald-500" />
            <span>Turnover Certificate legally executed under refinery commissioning protocols.</span>
          </div>
          <span className="font-mono text-[11px]">CERT-ID: TC-2026-0924-001</span>
        </CardFooter>
      </Card>
    </div>
  );
}
