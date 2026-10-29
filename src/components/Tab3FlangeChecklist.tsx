import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from './ui/card';
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from './ui/table';
import { Input } from './ui/input';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { usePlantTurnShared } from '../context/PlantTurnSharedContext';
import { 
  Plus, Trash2, Wrench, ShieldCheck, CheckCircle2, 
  Search, Download, HardHat, FileSpreadsheet, Printer
} from 'lucide-react';

export type CheckStatus = 'Y' | 'N' | 'NA';

export interface QualityChecks {
  cleanFlange: CheckStatus;          // หน้าแปลนสะอาด สภาพดี
  cleanNewGasket: CheckStatus;       // ประเก็นใหม่และสะอาด
  correctGasketSpec: CheckStatus;    // ชนิด ขนาด ของประเก็นถูกต้องตามกำหนด
  correctBoltRating: CheckStatus;    // ขนาดของน็อตถูกต้องตามเรทติ้ง
  correctBoltMaterial: CheckStatus;  // วัสดุของน็อตถูกต้อง
  applyThreadLube: CheckStatus;      // ทาน้ำยาทาเกลียว
  boltSequence: CheckStatus;         // ประกอบน็อตตามลำดับ (bolt sequence)
  correctTightness: CheckStatus;     // ความแน่นของน็อตถูกต้อง
}

export interface FlangeItemRow {
  id: string;
  no: number;
  locationBlindTagNo: string;        // ตำแหน่ง / รายละเอียดงาน
  checks: QualityChecks;
  checkDate: string;                 // วันที่ตรวจเช็ค
  signature: string;                 // ลายเซ็น
}

export interface BottomSignatureBlock {
  title: string;
  name: string;
  signature: string;
  date: string;
  signed: boolean;
}

const INITIAL_FLANGE_ITEMS: FlangeItemRow[] = [
  {
    id: 'fl-1',
    no: 1,
    locationBlindTagNo: '11-E-101A Shell Inlet Nozzle (8" 300#) / BLD-11-01',
    checks: {
      cleanFlange: 'Y',
      cleanNewGasket: 'Y',
      correctGasketSpec: 'Y',
      correctBoltRating: 'Y',
      correctBoltMaterial: 'Y',
      applyThreadLube: 'Y',
      boltSequence: 'Y',
      correctTightness: 'Y'
    },
    checkDate: '2026-09-24',
    signature: 'S. Somboon'
  },
  {
    id: 'fl-2',
    no: 2,
    locationBlindTagNo: '11-C-101 Overhead Vapor Line (16" 150#) / BLD-11-02',
    checks: {
      cleanFlange: 'Y',
      cleanNewGasket: 'Y',
      correctGasketSpec: 'Y',
      correctBoltRating: 'Y',
      correctBoltMaterial: 'Y',
      applyThreadLube: 'Y',
      boltSequence: 'Y',
      correctTightness: 'Y'
    },
    checkDate: '2026-09-24',
    signature: 'W. Prasert'
  },
  {
    id: 'fl-3',
    no: 3,
    locationBlindTagNo: '11-V-104 Pre-flash Separator Bottom Drain (3" 300#) / BLD-11-03',
    checks: {
      cleanFlange: 'Y',
      cleanNewGasket: 'Y',
      correctGasketSpec: 'Y',
      correctBoltRating: 'Y',
      correctBoltMaterial: 'Y',
      applyThreadLube: 'Y',
      boltSequence: 'Y',
      correctTightness: 'N'
    },
    checkDate: '2026-09-24',
    signature: 'A. Chaiwat'
  },
  {
    id: 'fl-4',
    no: 4,
    locationBlindTagNo: '11-P-101A Reflux Pump Suction Flange (6" 300#)',
    checks: {
      cleanFlange: 'Y',
      cleanNewGasket: 'Y',
      correctGasketSpec: 'Y',
      correctBoltRating: 'Y',
      correctBoltMaterial: 'Y',
      applyThreadLube: 'Y',
      boltSequence: 'Y',
      correctTightness: 'Y'
    },
    checkDate: '2026-09-24',
    signature: 'T. Somkiat'
  }
];

export default function Tab3FlangeChecklist() {
  const { selectedJob } = usePlantTurnShared();

  // ================= Header Fields =================
  const [header, setHeader] = useState({
    systemNoEicNo: selectedJob?.system || 'SYS-11-CRUDE / EIC-M-11-042',
    equipmentNo: selectedJob?.assetTag || selectedJob?.jobNo || '11-E-101A, 11-C-101, 11-V-104',
    description: selectedJob?.description || selectedJob?.title || 'Major Overhaul Turnaround Flange Make-up & Tightness Quality Verification'
  });

  useEffect(() => {
    if (selectedJob) {
      setHeader({
        systemNoEicNo: selectedJob.system,
        equipmentNo: selectedJob.assetTag || selectedJob.jobNo,
        description: selectedJob.description || selectedJob.title
      });
    }
  }, [selectedJob]);

  const [flangeItems, setFlangeItems] = useState<FlangeItemRow[]>(INITIAL_FLANGE_ITEMS);
  const [searchQuery, setSearchQuery] = useState('');

  // ================= Bottom Signature Blocks =================
  const [bottomSignatures, setBottomSignatures] = useState<{
    fieldFlsMechanic: BottomSignatureBlock;
    contractor: BottomSignatureBlock;
    maintenanceBsrc: BottomSignatureBlock;
    flangeQcSupervisor: BottomSignatureBlock;
  }>({
    fieldFlsMechanic: {
      title: 'FIELD FLS / MECHANIC',
      name: 'Somboon Sukprasert',
      signature: 'S. Somboon',
      date: '2026-09-24',
      signed: true
    },
    contractor: {
      title: 'CONTRACTOR',
      name: 'Kitti Rattanachai (Thai Nippon Steel)',
      signature: 'Kitti.R',
      date: '2026-09-24',
      signed: true
    },
    maintenanceBsrc: {
      title: 'MAINTENANCE (BSRC)',
      name: 'Wichai Thongchai (BSRC Engineer)',
      signature: 'Wichai.Th',
      date: '2026-09-24',
      signed: true
    },
    flangeQcSupervisor: {
      title: 'Flange QC Checks by Field Supervisor / Foreman',
      name: 'Kamonrat Prasert (Lead QC / Police)',
      signature: 'QC-Kamon.P',
      date: '2026-09-24',
      signed: true
    }
  });

  // Toggle check cycle: Y -> N -> NA -> Y
  const handleCycleCheck = (id: string, checkKey: keyof QualityChecks) => {
    setFlangeItems(prev => prev.map(row => {
      if (row.id === id) {
        const current = row.checks[checkKey];
        const next: CheckStatus = current === 'Y' ? 'N' : current === 'N' ? 'NA' : 'Y';
        return {
          ...row,
          checks: {
            ...row.checks,
            [checkKey]: next
          }
        };
      }
      return row;
    }));
  };

  const handleUpdateItem = (id: string, field: 'locationBlindTagNo' | 'checkDate' | 'signature', value: string) => {
    setFlangeItems(prev => prev.map(row => row.id === id ? { ...row, [field]: value } : row));
  };

  const handleAddItem = () => {
    const nextNo = flangeItems.length + 1;
    const newRow: FlangeItemRow = {
      id: `fl-${Date.now()}`,
      no: nextNo,
      locationBlindTagNo: '',
      checks: {
        cleanFlange: 'Y',
        cleanNewGasket: 'Y',
        correctGasketSpec: 'Y',
        correctBoltRating: 'Y',
        correctBoltMaterial: 'Y',
        applyThreadLube: 'Y',
        boltSequence: 'Y',
        correctTightness: 'Y'
      },
      checkDate: new Date().toISOString().slice(0, 10),
      signature: ''
    };
    setFlangeItems(prev => [...prev, newRow]);
  };

  const handleDeleteItem = (id: string) => {
    setFlangeItems(prev => prev.filter(r => r.id !== id).map((item, idx) => ({ ...item, no: idx + 1 })));
  };

  const filteredItems = flangeItems.filter(item => 
    item.locationBlindTagNo.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.signature.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const renderStatusButton = (val: CheckStatus, onClick: () => void) => {
    return (
      <button
        type="button"
        onClick={onClick}
        className={`w-7 h-7 rounded-md text-[11px] font-bold transition-all cursor-pointer inline-flex items-center justify-center ${
          val === 'Y'
            ? 'bg-emerald-600 text-white hover:bg-emerald-700 shadow-xs'
            : val === 'N'
            ? 'bg-red-600 text-white hover:bg-red-700 shadow-xs'
            : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-300'
        }`}
      >
        {val}
      </button>
    );
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-blue-950 p-6 rounded-2xl text-white shadow-xl border border-slate-700/50 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Badge variant="default" className="bg-blue-600 text-white font-mono text-[10px]">
              FORM QA/QC-FLANGE-03
            </Badge>
            <span className="text-slate-400 text-xs font-mono">• BSRC Quality Standard</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black tracking-tight mt-1 flex items-center gap-2">
            <Wrench className="text-blue-400" size={26} />
            Flange Make-up / Flange Quality Checklist
          </h2>
          <p className="text-xs sm:text-sm text-slate-300 mt-1 max-w-3xl">
            แบบฟอร์มตรวจสอบคุณภาพการประกอบหน้าแปลนและข้อต่อประเก็น (Flange Assembly & Joint Tightness QA Checklist) รองรับภาษาไทยและมาตรฐานความปลอดภัย BSRC
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Button
            onClick={() => window.print()}
            variant="outline"
            className="border-slate-600 text-slate-200 hover:bg-slate-800 gap-1.5 text-xs cursor-pointer"
          >
            <Printer size={14} />
            <span>Print Form</span>
          </Button>
          <Button
            onClick={handleAddItem}
            className="bg-blue-600 hover:bg-blue-700 text-white gap-1.5 text-xs shadow-md cursor-pointer"
          >
            <Plus size={14} />
            <span>Add Joint Record</span>
          </Button>
        </div>
      </div>

      {/* =========================================================================
          HEADER FIELDS: System No./EIC No., Equipment No., Description
         ========================================================================= */}
      <Card className="border-2 border-slate-200 dark:border-slate-800 shadow-sm">
        <CardHeader className="bg-slate-50 dark:bg-slate-800/50 py-3 px-5 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black tracking-widest text-slate-600 dark:text-slate-300 uppercase">
              Header Fields (ข้อมูลหัวเอกสาร)
            </span>
            <span className="text-[10px] font-mono text-slate-400">FLANGE JOINT QA/QC PROTOCOL</span>
          </div>
        </CardHeader>
        <CardContent className="p-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-xs">
            <div>
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                System No. / EIC No.
              </label>
              <Input
                value={header.systemNoEicNo}
                onChange={(e) => setHeader(prev => ({ ...prev, systemNoEicNo: e.target.value }))}
                className="font-mono font-bold h-8 text-xs text-blue-600 dark:text-blue-400"
              />
            </div>

            <div>
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                Equipment No.
              </label>
              <Input
                value={header.equipmentNo}
                onChange={(e) => setHeader(prev => ({ ...prev, equipmentNo: e.target.value }))}
                className="font-bold h-8 text-xs"
              />
            </div>

            <div className="sm:col-span-2 lg:col-span-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                Description
              </label>
              <Input
                value={header.description}
                onChange={(e) => setHeader(prev => ({ ...prev, description: e.target.value }))}
                className="h-8 text-xs"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* =========================================================================
          MAIN TABLE (Support Thai language headers):
          - Column 1: No.
          - Column 2: Location/Blind Tag No. (ตำแหน่ง / รายละเอียดงาน)
          - Quality Checks (8 columns with Y/N/NA):
              1. หน้าแปลนสะอาด สภาพดี
              2. ประเก็นใหม่และสะอาด
              3. ชนิด ขนาด ของประเก็นถูกต้องตามกำหนด
              4. ขนาดของน็อตถูกต้องตามเรทติ้ง
              5. วัสดุของน็อตถูกต้อง
              6. ทาน้ำยาทาเกลียว
              7. ประกอบน็อตตามลำดับ (bolt sequence)
              8. ความแน่นของน็อตถูกต้อง
          - Signatures row for each item:
              - วันที่ตรวจเช็ค
              - ลายเซ็น
         ========================================================================= */}
      <Card className="border-2 border-slate-200 dark:border-slate-800 shadow-md">
        <CardHeader className="py-4 px-6 border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                <span>ตารางตรวจสอบคุณภาพหน้าแปลน (Flange Quality Table)</span>
                <Badge variant="outline" className="text-xs font-mono font-bold">
                  {filteredItems.length} รายการ
                </Badge>
              </CardTitle>
              <CardDescription>
                คลิกปุ่มเพื่อเปลี่ยนสถานะการตรวจสอบ (Y = ผ่าน, N = ไม่ผ่าน, NA = ไม่เกี่ยวข้อง) พร้อมบันทึกวันที่และลายเซ็นผู้ตรวจ
              </CardDescription>
            </div>

            <div className="w-64">
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="ค้นหา ตำแหน่ง / Tag..."
                className="h-8 text-xs"
              />
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0 overflow-x-auto">
          <Table className="min-w-[1100px]">
            <TableHeader>
              <TableRow className="bg-slate-100 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700 text-xs">
                {/* Column 1: No. */}
                <TableHead className="w-14 text-center font-bold text-slate-900 dark:text-white">
                  No.
                </TableHead>

                {/* Column 2: Location/Blind Tag No. (ตำแหน่ง / รายละเอียดงาน) */}
                <TableHead className="min-w-64 font-bold text-slate-900 dark:text-white">
                  Location / Blind Tag No.<br />
                  <span className="text-[10px] text-slate-500 font-normal">(ตำแหน่ง / รายละเอียดงาน)</span>
                </TableHead>

                {/* 8 Thai Quality Check Columns */}
                <TableHead className="w-20 text-center font-semibold text-[11px] p-2">
                  หน้าแปลนสะอาด สภาพดี
                </TableHead>
                <TableHead className="w-20 text-center font-semibold text-[11px] p-2">
                  ประเก็นใหม่ และสะอาด
                </TableHead>
                <TableHead className="w-24 text-center font-semibold text-[11px] p-2">
                  ชนิด ขนาด ประเก็นถูกต้อง
                </TableHead>
                <TableHead className="w-20 text-center font-semibold text-[11px] p-2">
                  ขนาดน็อต ถูกต้องเรทติ้ง
                </TableHead>
                <TableHead className="w-20 text-center font-semibold text-[11px] p-2">
                  วัสดุของน็อต ถูกต้อง
                </TableHead>
                <TableHead className="w-20 text-center font-semibold text-[11px] p-2">
                  ทาน้ำยา ทาเกลียว
                </TableHead>
                <TableHead className="w-24 text-center font-semibold text-[11px] p-2">
                  ประกอบน็อต ตามลำดับ (bolt seq.)
                </TableHead>
                <TableHead className="w-20 text-center font-semibold text-[11px] p-2">
                  ความแน่นน็อต ถูกต้อง
                </TableHead>

                {/* Signatures row for each item */}
                <TableHead className="w-28 text-center font-bold text-blue-700 dark:text-blue-300">
                  วันที่ตรวจเช็ค
                </TableHead>
                <TableHead className="w-32 text-center font-bold text-blue-700 dark:text-blue-300">
                  ลายเซ็น
                </TableHead>

                <TableHead className="w-12 text-right">
                  ลบ
                </TableHead>
              </TableRow>
            </TableHeader>

            <TableBody>
              {filteredItems.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={13} className="text-center py-8 text-slate-400 text-xs">
                    ไม่พบข้อมูลรายการตรวจสอบหน้าแปลน
                  </TableCell>
                </TableRow>
              ) : (
                filteredItems.map((item) => (
                  <TableRow key={item.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40">
                    {/* No. */}
                    <TableCell className="text-center font-mono font-bold text-xs">
                      {item.no}
                    </TableCell>

                    {/* Location / Blind Tag No. */}
                    <TableCell>
                      <Input
                        value={item.locationBlindTagNo}
                        onChange={(e) => handleUpdateItem(item.id, 'locationBlindTagNo', e.target.value)}
                        placeholder="ระบุ ตำแหน่ง หรือ Blind Tag No..."
                        className="text-xs h-8 px-2 font-medium"
                      />
                    </TableCell>

                    {/* 8 Quality Check Toggles */}
                    <TableCell className="text-center p-1">
                      {renderStatusButton(item.checks.cleanFlange, () => handleCycleCheck(item.id, 'cleanFlange'))}
                    </TableCell>

                    <TableCell className="text-center p-1">
                      {renderStatusButton(item.checks.cleanNewGasket, () => handleCycleCheck(item.id, 'cleanNewGasket'))}
                    </TableCell>

                    <TableCell className="text-center p-1">
                      {renderStatusButton(item.checks.correctGasketSpec, () => handleCycleCheck(item.id, 'correctGasketSpec'))}
                    </TableCell>

                    <TableCell className="text-center p-1">
                      {renderStatusButton(item.checks.correctBoltRating, () => handleCycleCheck(item.id, 'correctBoltRating'))}
                    </TableCell>

                    <TableCell className="text-center p-1">
                      {renderStatusButton(item.checks.correctBoltMaterial, () => handleCycleCheck(item.id, 'correctBoltMaterial'))}
                    </TableCell>

                    <TableCell className="text-center p-1">
                      {renderStatusButton(item.checks.applyThreadLube, () => handleCycleCheck(item.id, 'applyThreadLube'))}
                    </TableCell>

                    <TableCell className="text-center p-1">
                      {renderStatusButton(item.checks.boltSequence, () => handleCycleCheck(item.id, 'boltSequence'))}
                    </TableCell>

                    <TableCell className="text-center p-1">
                      {renderStatusButton(item.checks.correctTightness, () => handleCycleCheck(item.id, 'correctTightness'))}
                    </TableCell>

                    {/* วันที่ตรวจเช็ค */}
                    <TableCell className="text-center p-1">
                      <Input
                        type="date"
                        value={item.checkDate}
                        onChange={(e) => handleUpdateItem(item.id, 'checkDate', e.target.value)}
                        className="h-8 text-[11px] font-mono px-1 w-28 mx-auto"
                      />
                    </TableCell>

                    {/* ลายเซ็น */}
                    <TableCell className="text-center p-1">
                      <Input
                        value={item.signature}
                        onChange={(e) => handleUpdateItem(item.id, 'signature', e.target.value)}
                        placeholder="ลายเซ็น / ชื่อผู้ตรวจ"
                        className="h-8 text-xs font-serif italic text-blue-600 dark:text-blue-400 px-2 w-32 mx-auto"
                      />
                    </TableCell>

                    {/* Action */}
                    <TableCell className="text-right p-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDeleteItem(item.id)}
                        className="text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/40 cursor-pointer"
                      >
                        <Trash2 size={14} />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
        <CardFooter className="bg-slate-50 dark:bg-slate-800/60 p-3 border-t border-slate-200 dark:border-slate-800 text-[11px] text-slate-500 flex items-center justify-between">
          <span>คำอธิบายสถานะ: <strong>Y</strong> = ผ่านเกณฑ์, <strong>N</strong> = ไม่ผ่านเกณฑ์ (ต้องแก้ไข), <strong>NA</strong> = ไม่เกี่ยวข้องในจุดนี้</span>
          <span className="font-mono">BSRC QA/QC STANDARD REV.03</span>
        </CardFooter>
      </Card>

      {/* =========================================================================
          BOTTOM SIGNATURE BLOCKS:
          1. FIELD FLS / MECHANIC
          2. CONTRACTOR
          3. MAINTENANCE (BSRC)
          4. Flange QC Checks by Field Supervisor / Foreman
         ========================================================================= */}
      <Card className="border-2 border-slate-300 dark:border-slate-700 shadow-lg">
        <CardHeader className="py-3 px-6 border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40">
          <div className="flex items-center gap-2">
            <ShieldCheck size={18} className="text-emerald-600" />
            <CardTitle className="text-sm">Bottom Signature Blocks (ลายเซ็นรับรองการตรวจหน้าแปลน)</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="p-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Block 1: FIELD FLS / MECHANIC */}
            <div className="p-4 rounded-xl border-2 border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider">
                  {bottomSignatures.fieldFlsMechanic.title}
                </span>
                <Badge variant={bottomSignatures.fieldFlsMechanic.signed ? 'success' : 'secondary'}>
                  {bottomSignatures.fieldFlsMechanic.signed ? 'Signed' : 'Pending'}
                </Badge>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase">ชื่อ-นามสกุล (Name):</label>
                <Input
                  value={bottomSignatures.fieldFlsMechanic.name}
                  onChange={(e) => setBottomSignatures(prev => ({
                    ...prev,
                    fieldFlsMechanic: { ...prev.fieldFlsMechanic, name: e.target.value }
                  }))}
                  className="h-7 text-xs font-semibold"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase">ลายเซ็น (Signature):</label>
                <div className="p-2 rounded border border-dashed border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-center">
                  <span className="font-serif italic font-bold text-sm text-blue-600 dark:text-blue-400">
                    {bottomSignatures.fieldFlsMechanic.signature}
                  </span>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase">วันที่ (Date):</label>
                <Input
                  type="date"
                  value={bottomSignatures.fieldFlsMechanic.date}
                  onChange={(e) => setBottomSignatures(prev => ({
                    ...prev,
                    fieldFlsMechanic: { ...prev.fieldFlsMechanic, date: e.target.value }
                  }))}
                  className="h-7 text-xs font-mono"
                />
              </div>
            </div>

            {/* Block 2: CONTRACTOR */}
            <div className="p-4 rounded-xl border-2 border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">
                  {bottomSignatures.contractor.title}
                </span>
                <Badge variant={bottomSignatures.contractor.signed ? 'success' : 'secondary'}>
                  {bottomSignatures.contractor.signed ? 'Signed' : 'Pending'}
                </Badge>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase">ชื่อ-นามสกุล (Name):</label>
                <Input
                  value={bottomSignatures.contractor.name}
                  onChange={(e) => setBottomSignatures(prev => ({
                    ...prev,
                    contractor: { ...prev.contractor, name: e.target.value }
                  }))}
                  className="h-7 text-xs font-semibold"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase">ลายเซ็น (Signature):</label>
                <div className="p-2 rounded border border-dashed border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-center">
                  <span className="font-serif italic font-bold text-sm text-indigo-600 dark:text-indigo-400">
                    {bottomSignatures.contractor.signature}
                  </span>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase">วันที่ (Date):</label>
                <Input
                  type="date"
                  value={bottomSignatures.contractor.date}
                  onChange={(e) => setBottomSignatures(prev => ({
                    ...prev,
                    contractor: { ...prev.contractor, date: e.target.value }
                  }))}
                  className="h-7 text-xs font-mono"
                />
              </div>
            </div>

            {/* Block 3: MAINTENANCE (BSRC) */}
            <div className="p-4 rounded-xl border-2 border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">
                  {bottomSignatures.maintenanceBsrc.title}
                </span>
                <Badge variant={bottomSignatures.maintenanceBsrc.signed ? 'success' : 'secondary'}>
                  {bottomSignatures.maintenanceBsrc.signed ? 'Signed' : 'Pending'}
                </Badge>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase">ชื่อ-นามสกุล (Name):</label>
                <Input
                  value={bottomSignatures.maintenanceBsrc.name}
                  onChange={(e) => setBottomSignatures(prev => ({
                    ...prev,
                    maintenanceBsrc: { ...prev.maintenanceBsrc, name: e.target.value }
                  }))}
                  className="h-7 text-xs font-semibold"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase">ลายเซ็น (Signature):</label>
                <div className="p-2 rounded border border-dashed border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-center">
                  <span className="font-serif italic font-bold text-sm text-emerald-600 dark:text-emerald-400">
                    {bottomSignatures.maintenanceBsrc.signature}
                  </span>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase">วันที่ (Date):</label>
                <Input
                  type="date"
                  value={bottomSignatures.maintenanceBsrc.date}
                  onChange={(e) => setBottomSignatures(prev => ({
                    ...prev,
                    maintenanceBsrc: { ...prev.maintenanceBsrc, date: e.target.value }
                  }))}
                  className="h-7 text-xs font-mono"
                />
              </div>
            </div>

            {/* Block 4: Flange QC Checks by Field Supervisor / Foreman */}
            <div className="p-4 rounded-xl border-2 border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider">
                  {bottomSignatures.flangeQcSupervisor.title}
                </span>
                <Badge variant={bottomSignatures.flangeQcSupervisor.signed ? 'success' : 'secondary'}>
                  {bottomSignatures.flangeQcSupervisor.signed ? 'Signed' : 'Pending'}
                </Badge>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase">ชื่อ-นามสกุล (Name):</label>
                <Input
                  value={bottomSignatures.flangeQcSupervisor.name}
                  onChange={(e) => setBottomSignatures(prev => ({
                    ...prev,
                    flangeQcSupervisor: { ...prev.flangeQcSupervisor, name: e.target.value }
                  }))}
                  className="h-7 text-xs font-semibold"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase">ลายเซ็น (Signature):</label>
                <div className="p-2 rounded border border-dashed border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-center">
                  <span className="font-serif italic font-bold text-sm text-amber-600 dark:text-amber-400">
                    {bottomSignatures.flangeQcSupervisor.signature}
                  </span>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase">วันที่ (Date):</label>
                <Input
                  type="date"
                  value={bottomSignatures.flangeQcSupervisor.date}
                  onChange={(e) => setBottomSignatures(prev => ({
                    ...prev,
                    flangeQcSupervisor: { ...prev.flangeQcSupervisor, date: e.target.value }
                  }))}
                  className="h-7 text-xs font-mono"
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
