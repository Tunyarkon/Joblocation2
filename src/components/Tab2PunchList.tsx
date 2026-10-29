import React, { useState, useMemo, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from './ui/card';
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from './ui/table';
import { Input } from './ui/input';
import { Select } from './ui/select';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { usePlantTurnShared } from '../context/PlantTurnSharedContext';
import { 
  Plus, Trash2, Search, Filter, Download, 
  FileSpreadsheet, AlertTriangle, CheckCircle2, 
  ShieldAlert, BookOpen, Layers, Camera, Upload, Eye, Check, X, Image
} from 'lucide-react';

export type DisciplineCode = 'I' | 'Ins' | 'A' | 'C' | 'E' | 'Eng' | 'S' | 'M' | 'P' | 'PA';
export type CategoryCode = 'A' | 'B' | 'C' | 'S';

export interface PunchItem {
  id: string;
  item: string;
  initiator: string;
  remedialWorks: string;
  discipline: DisciplineCode;
  contractor: string;
  planCat: CategoryCode;
  planDate: string;
  cpSign: string;
  cpDate: string;
  beforePhoto?: string;
  afterPhoto?: string;
  status?: 'Open' | 'Resolved';
}

export const DISCIPLINE_LEGEND: { code: DisciplineCode; name: string }[] = [
  { code: 'I', name: 'Instrument' },
  { code: 'Ins', name: 'Insulation' },
  { code: 'A', name: 'Analyser' },
  { code: 'C', name: 'Civil' },
  { code: 'E', name: 'Electrical' },
  { code: 'Eng', name: 'Engineering' },
  { code: 'S', name: 'Structural' },
  { code: 'M', name: 'Mechanical' },
  { code: 'P', name: 'Piping' },
  { code: 'PA', name: 'Painting' },
];

export const CATEGORY_LEGEND: { code: CategoryCode; label: string; desc: string }[] = [
  { code: 'A', label: 'Cat A', desc: 'before Turnover' },
  { code: 'B', label: 'Cat B', desc: 'before Oil-in' },
  { code: 'C', label: 'Cat C', desc: 'after Oil-in' },
  { code: 'S', label: 'Cat S', desc: 'Owner' },
];

const INITIAL_PUNCH_ITEMS: PunchItem[] = [
  {
    id: 'p-1',
    item: 'PL-11-001',
    initiator: 'J. Somchai (OPS Lead)',
    remedialWorks: 'Replace cracked spiral wound gasket on suction nozzle N1 of 11-E-101A and re-torque to 280 Nm.',
    discipline: 'P',
    contractor: 'Thai Nippon Steel Engineering',
    planCat: 'A',
    planDate: '2026-09-24',
    cpSign: 'M. Tanawat',
    cpDate: '2026-09-25'
  },
  {
    id: 'p-2',
    item: 'PL-11-002',
    initiator: 'Dr. Anan S. (TSS)',
    remedialWorks: 'Internal tray #14 clamp loose on distillation column 11-C-101; install new 316SS locking washers.',
    discipline: 'M',
    contractor: 'Sriracha Construction PCL',
    planCat: 'A',
    planDate: '2026-09-24',
    cpSign: 'W. Prasert',
    cpDate: '2026-09-25'
  },
  {
    id: 'p-3',
    item: 'PL-11-003',
    initiator: 'Ekarat M. (PES)',
    remedialWorks: 'Pressure transmitter PT-11045 impulse tubing slope reversed; re-route to minimum 1:12 fall toward process tap.',
    discipline: 'I',
    contractor: 'Yokogawa Industrial Systems',
    planCat: 'B',
    planDate: '2026-09-26',
    cpSign: '',
    cpDate: ''
  },
  {
    id: 'p-4',
    item: 'PL-11-004',
    initiator: 'Kamonrat P. (Safety)',
    remedialWorks: 'Emergency eyewash station EW-11-02 water pressure regulator reading low (below 30 psi). Replace filter mesh.',
    discipline: 'S',
    contractor: 'Refinery Maintenance Services',
    planCat: 'S',
    planDate: '2026-09-24',
    cpSign: 'K. Boonchu',
    cpDate: '2026-09-24'
  },
  {
    id: 'p-5',
    item: 'PL-11-005',
    initiator: 'Narong B. (Field Sup)',
    remedialWorks: 'Thermal insulation jacket missing on bottom outlet line 4"-HC-11002-A1A around flange FL-08.',
    discipline: 'Ins',
    contractor: 'Best Insulation Services Co.',
    planCat: 'C',
    planDate: '2026-09-28',
    cpSign: '',
    cpDate: ''
  },
  {
    id: 'p-6',
    item: 'PL-11-006',
    initiator: 'Surachai V. (Electrical)',
    remedialWorks: 'Motor bonding copper braid on reflux pump 11-P-101B loose at grounding boss; wire brush & bolt tightly.',
    discipline: 'E',
    contractor: 'ABB Power Services',
    planCat: 'A',
    planDate: '2026-09-24',
    cpSign: 'T. Narin',
    cpDate: '2026-09-25'
  },
  {
    id: 'p-7',
    item: 'PL-11-007',
    initiator: 'Damrong S. (OPS)',
    remedialWorks: 'Touch up damaged epoxy zinc coating on reactor skirt structural gusset plate after bolt replacement.',
    discipline: 'PA',
    contractor: 'Jotun Protective Coatings',
    planCat: 'C',
    planDate: '2026-09-29',
    cpSign: '',
    cpDate: ''
  }
];

export default function Tab2PunchList() {
  const { 
    selectedJob, 
    addPunchItem, 
    updatePunchItem, 
    deletePunchItem,
    isJobTurnoverBlocked 
  } = usePlantTurnShared();

  // ================= Header Fields =================
  const [header, setHeader] = useState({
    woNo: selectedJob?.workOrder || 'WO-2026-78441',
    wsrEwrNo: selectedJob?.refCode ? `WSR-${selectedJob.refCode}-REV2` : 'WSR-CDU11-089-REV2',
    equipmentNo: selectedJob?.assetTag || selectedJob?.jobNo || '11-E-101A / 11-C-101',
    systemNo: selectedJob?.system || 'SYS-11-CRUDE-01',
    unitNo: selectedJob?.unit || 'Unit 11 (Crude Distillation)',
    bt: selectedJob?.gridZone || 'BT-04-ZONE-A'
  });

  useEffect(() => {
    if (selectedJob) {
      setHeader({
        woNo: selectedJob.workOrder,
        wsrEwrNo: selectedJob.refCode ? `WSR-${selectedJob.refCode}-REV2` : 'WSR-CDU11-089-REV2',
        equipmentNo: selectedJob.assetTag || selectedJob.jobNo,
        systemNo: selectedJob.system,
        unitNo: selectedJob.unit,
        bt: selectedJob.gridZone || 'BT-04-ZONE-A'
      });
    }
  }, [selectedJob]);

  // Map shared punch list to Tab2PunchList structure
  const punchList: PunchItem[] = useMemo(() => {
    if (!selectedJob || !selectedJob.punchList) return [];
    return selectedJob.punchList.map((p, idx) => ({
      id: p.id,
      item: p.item || `PL-${selectedJob.jobNo.split('-').pop() || '01'}-${String(idx + 1).padStart(3, '0')}`,
      initiator: p.reportedBy || 'Field Inspector',
      remedialWorks: p.description || '',
      discipline: (p.discipline as DisciplineCode) || 'M',
      contractor: p.contractor || 'General Maintenance Contractor',
      planCat: (p.category as CategoryCode) || 'A',
      planDate: p.planDate || p.timestamp?.slice(0, 10) || new Date().toISOString().slice(0, 10),
      cpSign: p.status === 'Resolved' ? (p.cpSign || 'Inspector Certified') : (p.cpSign || ''),
      cpDate: p.status === 'Resolved' ? (p.cpDate || p.resolvedAt?.slice(0, 10) || new Date().toISOString().slice(0, 10)) : (p.cpDate || ''),
      status: p.status,
      beforePhoto: p.resolutionPhotoUrl,
      afterPhoto: p.resolutionPhotoUrl
    }));
  }, [selectedJob]);

  const [filterDiscipline, setFilterDiscipline] = useState<string>('All');
  const [filterCategory, setFilterCategory] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [exportNotice, setExportNotice] = useState<string | null>(null);

  // Add new punch item directly to shared store
  const handleAddItem = () => {
    const nextNum = String((selectedJob.punchList?.length || 0) + 1).padStart(3, '0');
    addPunchItem(selectedJob.id, {
      item: `PL-${selectedJob.jobNo.split('-').pop() || '01'}-${nextNum}`,
      reportedBy: 'Field Inspector',
      description: 'Field walkdown defect item',
      discipline: 'M',
      contractor: 'General Maintenance Contractor',
      category: 'A',
      planDate: new Date().toISOString().slice(0, 10),
      status: 'Open'
    });
  };

  const handleUpdateItem = (id: string, field: keyof PunchItem, value: any) => {
    const updates: any = {};
    if (field === 'remedialWorks') updates.description = value;
    else if (field === 'initiator') updates.reportedBy = value;
    else if (field === 'planCat') updates.category = value;
    else if (field === 'cpSign') {
      updates.cpSign = value;
      if (value && value.trim()) updates.status = 'Resolved';
    }
    else if (field === 'cpDate') updates.cpDate = value;
    else if (field === 'discipline') updates.discipline = value;
    else if (field === 'contractor') updates.contractor = value;
    else if (field === 'planDate') updates.planDate = value;
    else updates[field] = value;

    updatePunchItem(selectedJob.id, id, updates);
  };

  const handleDeleteItem = (id: string) => {
    deletePunchItem(selectedJob.id, id);
  };

  // Filtered list
  const filteredList = punchList.filter(item => {
    const matchesDiscipline = filterDiscipline === 'All' || item.discipline === filterDiscipline;
    const matchesCategory = filterCategory === 'All' || item.planCat === filterCategory;
    const matchesSearch = item.item.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          item.remedialWorks.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          item.initiator.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          item.contractor.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesDiscipline && matchesCategory && matchesSearch;
  });

  // Summary counts
  const catACount = punchList.filter(i => i.planCat === 'A').length;
  const catAOpen = punchList.filter(i => i.planCat === 'A' && (!i.cpSign || !i.cpDate)).length;
  const catBCount = punchList.filter(i => i.planCat === 'B').length;
  const catSCount = punchList.filter(i => i.planCat === 'S').length;

  const [selectedPhotoPunch, setSelectedPhotoPunch] = useState<PunchItem | null>(null);

  const handleExportCSV = () => {
    const headers = ['Item', 'Initiator', 'REMEDIAL WORKS', 'DISCIPLINE', 'Contractor', 'Plan Cat', 'Plan Date', 'CP Sign', 'CP Date'];
    const rows = filteredList.map(item => [
      `"${item.item}"`,
      `"${item.initiator}"`,
      `"${item.remedialWorks.replace(/"/g, '""')}"`,
      `"${item.discipline}"`,
      `"${item.contractor}"`,
      `"${item.planCat}"`,
      `"${item.planDate}"`,
      `"${item.cpSign}"`,
      `"${item.cpDate}"`
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Punch_and_Butt_List_${header.systemNo}_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    setExportNotice('Punch & Butt list exported to CSV successfully!');
    setTimeout(() => setExportNotice(null), 3000);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 p-6 rounded-2xl text-white shadow-xl border border-slate-700/50 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Badge variant="default" className="bg-indigo-600 text-white font-mono text-[10px]">
              FORM QA/QC-PUNCH-02
            </Badge>
            <span className="text-slate-400 text-xs font-mono">• Master Punch & Butt Register</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black tracking-tight mt-1 flex items-center gap-2">
            <FileSpreadsheet className="text-indigo-400" size={26} />
            Punch & Butt List Form
          </h2>
          <p className="text-xs sm:text-sm text-slate-300 mt-1 max-w-3xl">
            Centralized register for tracking field walkdown defects, butt weld quality items, contractor remedial plans, and authorized completion package (CP) sign-offs.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Button
            onClick={handleExportCSV}
            variant="outline"
            className="border-slate-600 text-slate-200 hover:bg-slate-800 gap-1.5 text-xs cursor-pointer"
          >
            <Download size={14} />
            <span>Export CSV</span>
          </Button>
          <Button
            onClick={handleAddItem}
            className="bg-indigo-600 hover:bg-indigo-700 text-white gap-1.5 text-xs shadow-md cursor-pointer"
          >
            <Plus size={14} />
            <span>Log New Item</span>
          </Button>
        </div>
      </div>

      {exportNotice && (
        <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 text-xs flex items-center gap-2">
          <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
          <span>{exportNotice}</span>
        </div>
      )}

      {/* Category A Turnover Blocker Alert */}
      {catAOpen > 0 ? (
        <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/40 border-2 border-rose-300 dark:border-rose-800 text-rose-900 dark:text-rose-200 text-xs flex items-center justify-between shadow-xs animate-in fade-in">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-rose-200 dark:bg-rose-900 text-rose-700 dark:text-rose-200 flex items-center justify-center shrink-0">
              <ShieldAlert size={18} />
            </div>
            <div>
              <span className="font-bold text-sm block">⚠️ การส่งมอบระบบถูกระงับ (Turnover Blocked)</span>
              <span className="text-[11px] text-rose-700 dark:text-rose-300">
                พบรายการ Category A ที่ยังไม่ได้รับการตรวจรับรองจำนวน {catAOpen} รายการ (ข้อกำหนด SOP-TO-402: ห้ามส่งมอบระบบเด็ดขาดจนกว่าจะแก้ไขและตรวจรับซ้ำแล้วเสร็จ)
              </span>
            </div>
          </div>
          <Badge variant="destructive" className="font-bold shrink-0">
            {catAOpen} Open Cat A
          </Badge>
        </div>
      ) : (
        <div className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-300 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 text-xs flex items-center gap-2.5">
          <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
          <span><strong>Zero Category A Defects:</strong> ระบบไม่มีข้อบกพร่องระดับวิกฤต พร้อมสำหรับการตรวจรับมอบ (Turnover Ready)</span>
        </div>
      )}

      {/* =========================================================================
          HEADER FIELDS: WO NO, WSR/EWR/D-EWR NO, EQUIPMENT NO, SYSTEM NO, UNIT NO, BT
         ========================================================================= */}
      <Card className="border-2 border-slate-200 dark:border-slate-800 shadow-sm">
        <CardHeader className="bg-slate-50 dark:bg-slate-800/50 py-3 px-5 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black tracking-widest text-slate-600 dark:text-slate-300 uppercase">
              Form Header Fields
            </span>
            <span className="text-[10px] font-mono text-slate-400">PUNCH & BUTT WALKDOWN METADATA</span>
          </div>
        </CardHeader>
        <CardContent className="p-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3 text-xs">
            <div>
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                WO NO
              </label>
              <Input
                value={header.woNo}
                onChange={(e) => setHeader(prev => ({ ...prev, woNo: e.target.value }))}
                className="font-mono font-bold h-8 text-xs"
              />
            </div>

            <div>
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                WSR/EWR/D-EWR NO
              </label>
              <Input
                value={header.wsrEwrNo}
                onChange={(e) => setHeader(prev => ({ ...prev, wsrEwrNo: e.target.value }))}
                className="font-mono h-8 text-xs"
              />
            </div>

            <div>
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                EQUIPMENT NO
              </label>
              <Input
                value={header.equipmentNo}
                onChange={(e) => setHeader(prev => ({ ...prev, equipmentNo: e.target.value }))}
                className="font-bold text-indigo-600 dark:text-indigo-400 h-8 text-xs"
              />
            </div>

            <div>
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                SYSTEM NO
              </label>
              <Input
                value={header.systemNo}
                onChange={(e) => setHeader(prev => ({ ...prev, systemNo: e.target.value }))}
                className="font-mono font-bold h-8 text-xs"
              />
            </div>

            <div>
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                UNIT NO
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
          </div>
        </CardContent>
      </Card>

      {/* Quick Summary Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-3.5 rounded-xl border border-red-200 dark:border-red-900 bg-red-50/50 dark:bg-red-950/20">
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-500">Cat A (Turnover Gate)</span>
            <Badge variant="destructive" className="text-[10px]">
              {catAOpen > 0 ? `${catAOpen} Open` : 'Cleared'}
            </Badge>
          </div>
          <div className="text-xl font-black text-red-600 dark:text-red-400 mt-1">
            {catACount} Items
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5">before Turnover</div>
        </div>

        <div className="p-3.5 rounded-xl border border-blue-200 dark:border-blue-900 bg-blue-50/50 dark:bg-blue-950/20">
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-500">Cat B (Oil-in Gate)</span>
            <Badge variant="outline" className="text-[10px]">Active</Badge>
          </div>
          <div className="text-xl font-black text-blue-600 dark:text-blue-400 mt-1">
            {catBCount} Items
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5">before Oil-in</div>
        </div>

        <div className="p-3.5 rounded-xl border border-amber-200 dark:border-amber-900 bg-amber-50/50 dark:bg-amber-950/20">
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-500">Cat S (Owner Scope)</span>
            <Badge variant="warning" className="text-[10px]">Owner</Badge>
          </div>
          <div className="text-xl font-black text-amber-600 dark:text-amber-400 mt-1">
            {catSCount} Items
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5">Owner / HSE items</div>
        </div>

        <div className="p-3.5 rounded-xl border border-emerald-200 dark:border-emerald-900 bg-emerald-50/50 dark:bg-emerald-950/20">
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-500">Total Cleared CP</span>
            <Badge variant="success" className="text-[10px]">Completed</Badge>
          </div>
          <div className="text-xl font-black text-emerald-600 dark:text-emerald-400 mt-1">
            {punchList.filter(i => i.cpSign && i.cpDate).length} / {punchList.length}
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5">Signed off</div>
        </div>
      </div>

      {/* =========================================================================
          MAIN TABLE: Item, Initiator, REMEDIAL WORKS, DISCIPLINE, Contractor,
          COMPLETION (Plan Cat, Plan Date, CP Sign, CP Date)
         ========================================================================= */}
      <Card className="border-2 border-slate-200 dark:border-slate-800 shadow-md">
        <CardHeader className="py-4 px-6 border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                <span>Punch & Butt List Data Table</span>
                <Badge variant="outline" className="text-xs font-mono font-bold">
                  {filteredList.length} Records
                </Badge>
              </CardTitle>
              <CardDescription>
                Detailed punch items and butt list verification records.
              </CardDescription>
            </div>

            {/* Filter and Search Bar */}
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative min-w-44">
                <Search size={14} className="absolute left-2.5 top-2.5 text-slate-400" />
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search item, contractor, remedial..."
                  className="pl-8 h-8 text-xs"
                />
              </div>

              <div className="w-32">
                <Select
                  value={filterDiscipline}
                  onChange={(e) => setFilterDiscipline(e.target.value)}
                  options={[
                    { value: 'All', label: 'All Disciplines' },
                    ...DISCIPLINE_LEGEND.map(d => ({ value: d.code, label: `${d.code} (${d.name})` }))
                  ]}
                  className="h-8 text-xs"
                />
              </div>

              <div className="w-32">
                <Select
                  value={filterCategory}
                  onChange={(e) => setFilterCategory(e.target.value)}
                  options={[
                    { value: 'All', label: 'All Categories' },
                    { value: 'A', label: 'Cat A (before Turnover)' },
                    { value: 'B', label: 'Cat B (before Oil-in)' },
                    { value: 'C', label: 'Cat C (after Oil-in)' },
                    { value: 'S', label: 'Cat S (Owner)' },
                  ]}
                  className="h-8 text-xs"
                />
              </div>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          <Table>
            <TableHeader>
              {/* Two-level header for COMPLETION sub-columns */}
              <TableRow className="bg-slate-100 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700">
                <TableHead rowSpan={2} className="w-28 text-center align-middle font-bold text-slate-900 dark:text-white">
                  1. Item
                </TableHead>
                <TableHead rowSpan={2} className="w-40 align-middle font-bold text-slate-900 dark:text-white">
                  2. Initiator
                </TableHead>
                <TableHead rowSpan={2} className="min-w-64 align-middle font-bold text-slate-900 dark:text-white">
                  3. REMEDIAL WORKS
                </TableHead>
                <TableHead rowSpan={2} className="w-24 text-center align-middle font-bold text-slate-900 dark:text-white">
                  4. DISCIPLINE
                </TableHead>
                <TableHead rowSpan={2} className="w-48 align-middle font-bold text-slate-900 dark:text-white">
                  5. Contractor
                </TableHead>
                <TableHead colSpan={4} className="text-center bg-indigo-50/60 dark:bg-indigo-950/40 border-l border-indigo-200 dark:border-indigo-900 font-bold text-indigo-900 dark:text-indigo-200 py-1.5">
                  6. COMPLETION
                </TableHead>
                <TableHead rowSpan={2} className="w-28 text-center align-middle font-bold text-slate-900 dark:text-white">
                  7. Photo Evidence
                </TableHead>
                <TableHead rowSpan={2} className="w-14 text-right align-middle">
                  Action
                </TableHead>
              </TableRow>

              {/* Sub-columns for COMPLETION */}
              <TableRow className="bg-indigo-50/30 dark:bg-indigo-950/20 border-b border-slate-200 dark:border-slate-800 text-[11px]">
                <TableHead className="w-28 text-center border-l border-indigo-200 dark:border-indigo-900 font-semibold text-slate-700 dark:text-slate-300">
                  Plan Cat
                </TableHead>
                <TableHead className="w-32 text-center font-semibold text-slate-700 dark:text-slate-300">
                  Plan Date
                </TableHead>
                <TableHead className="w-32 text-center font-semibold text-slate-700 dark:text-slate-300">
                  CP Sign
                </TableHead>
                <TableHead className="w-32 text-center font-semibold text-slate-700 dark:text-slate-300">
                  CP Date
                </TableHead>
              </TableRow>
            </TableHeader>

            <TableBody>
              {filteredList.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={10} className="text-center py-10 text-slate-400 text-xs">
                    No punch & butt list items found matching your filters.
                  </TableCell>
                </TableRow>
              ) : (
                filteredList.map((item) => (
                  <TableRow key={item.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40">
                    {/* 1. Item */}
                    <TableCell className="font-mono font-bold text-slate-900 dark:text-white">
                      <Input
                        value={item.item}
                        onChange={(e) => handleUpdateItem(item.id, 'item', e.target.value)}
                        className="font-mono font-bold h-7 text-xs px-2"
                      />
                    </TableCell>

                    {/* 2. Initiator */}
                    <TableCell>
                      <Input
                        value={item.initiator}
                        onChange={(e) => handleUpdateItem(item.id, 'initiator', e.target.value)}
                        placeholder="Initiator..."
                        className="h-7 text-xs px-2"
                      />
                    </TableCell>

                    {/* 3. REMEDIAL WORKS */}
                    <TableCell>
                      <textarea
                        rows={2}
                        value={item.remedialWorks}
                        onChange={(e) => handleUpdateItem(item.id, 'remedialWorks', e.target.value)}
                        placeholder="Detailed remedial instructions..."
                        className="w-full text-xs p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-indigo-500 resize-none"
                      />
                    </TableCell>

                    {/* 4. DISCIPLINE */}
                    <TableCell className="text-center">
                      <Select
                        value={item.discipline}
                        onChange={(e) => handleUpdateItem(item.id, 'discipline', e.target.value as DisciplineCode)}
                        options={DISCIPLINE_LEGEND.map(d => ({ value: d.code, label: d.code }))}
                        className="h-7 text-xs font-bold w-16 mx-auto text-center"
                      />
                    </TableCell>

                    {/* 5. Contractor */}
                    <TableCell>
                      <Input
                        value={item.contractor}
                        onChange={(e) => handleUpdateItem(item.id, 'contractor', e.target.value)}
                        placeholder="Contractor company..."
                        className="h-7 text-xs px-2"
                      />
                    </TableCell>

                    {/* 6. COMPLETION Sub-columns */}
                    {/* 6.1 Plan Cat */}
                    <TableCell className="border-l border-indigo-100 dark:border-indigo-900/60 text-center">
                      <div className="flex flex-col items-center gap-1">
                        <Select
                          value={item.planCat}
                          onChange={(e) => handleUpdateItem(item.id, 'planCat', e.target.value as CategoryCode)}
                          options={CATEGORY_LEGEND.map(c => ({ value: c.code, label: c.code }))}
                          className="h-7 text-xs font-bold w-16 text-center"
                        />
                        <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded-full ${
                          item.planCat === 'A' ? 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300' :
                          item.planCat === 'B' ? 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300' :
                          item.planCat === 'S' ? 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300' :
                          'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                        }`}>
                          {item.planCat === 'A' ? 'Turnover' : item.planCat === 'B' ? 'Oil-in' : item.planCat === 'C' ? 'Post-Oil' : 'Owner'}
                        </span>
                      </div>
                    </TableCell>

                    {/* 6.2 Plan Date */}
                    <TableCell className="text-center">
                      <Input
                        type="date"
                        value={item.planDate}
                        onChange={(e) => handleUpdateItem(item.id, 'planDate', e.target.value)}
                        className="h-7 text-[10px] font-mono px-1 w-28 mx-auto"
                      />
                    </TableCell>

                    {/* 6.3 CP Sign */}
                    <TableCell className="text-center">
                      <Input
                        value={item.cpSign}
                        onChange={(e) => handleUpdateItem(item.id, 'cpSign', e.target.value)}
                        placeholder="CP Sign"
                        className="h-7 text-xs font-serif italic text-emerald-600 dark:text-emerald-400 px-1.5 w-28 mx-auto"
                      />
                    </TableCell>

                    {/* 6.4 CP Date */}
                    <TableCell className="text-center">
                      <Input
                        type="date"
                        value={item.cpDate}
                        onChange={(e) => handleUpdateItem(item.id, 'cpDate', e.target.value)}
                        className="h-7 text-[10px] font-mono px-1 w-28 mx-auto"
                      />
                    </TableCell>

                    {/* 7. Photo Evidence */}
                    <TableCell className="text-center">
                      <button
                        type="button"
                        onClick={() => setSelectedPhotoPunch(item)}
                        className={`px-2.5 py-1 rounded-lg border text-[11px] font-bold flex items-center justify-center gap-1 mx-auto transition-all cursor-pointer ${
                          item.status === 'Resolved' || item.afterPhoto
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-300 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800'
                            : 'bg-slate-100 text-slate-700 border-slate-300 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700 hover:border-indigo-400'
                        }`}
                        title="ดูและแนบรูปหลักฐานก่อน-หลังแก้ไข (Photo Evidence)"
                      >
                        <Camera size={13} />
                        <span>{item.status === 'Resolved' ? 'Resolved' : 'Photos'}</span>
                      </button>
                    </TableCell>

                    {/* Action */}
                    <TableCell className="text-right">
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

        <CardFooter className="bg-slate-50 dark:bg-slate-800/60 p-4 border-t border-slate-200 dark:border-slate-800 flex flex-col space-y-3 text-[11px] text-slate-600 dark:text-slate-300">
          <div className="flex items-start gap-2">
            <BookOpen size={14} className="text-indigo-600 shrink-0 mt-0.5" />
            <div className="space-y-1.5 w-full">
              {/* Disciplines Legend */}
              <div className="leading-relaxed">
                <span className="font-bold uppercase tracking-wider text-slate-700 dark:text-slate-200">
                  Disciplines:&nbsp;
                </span>
                <span className="font-mono text-[10px]">
                  <strong>I</strong> (Instrument),&nbsp;
                  <strong>Ins</strong> (Insulation),&nbsp;
                  <strong>A</strong> (Analyser),&nbsp;
                  <strong>C</strong> (Civil),&nbsp;
                  <strong>E</strong> (Electrical),&nbsp;
                  <strong>Eng</strong> (Engineering),&nbsp;
                  <strong>S</strong> (Structural),&nbsp;
                  <strong>M</strong> (Mechanical),&nbsp;
                  <strong>P</strong> (Piping),&nbsp;
                  <strong>PA</strong> (Painting).
                </span>
              </div>

              {/* Categories Legend */}
              <div className="leading-relaxed">
                <span className="font-bold uppercase tracking-wider text-slate-700 dark:text-slate-200">
                  Categories:&nbsp;
                </span>
                <span className="font-mono text-[10px]">
                  <strong className="text-red-600 dark:text-red-400">A</strong> (before Turnover),&nbsp;
                  <strong className="text-blue-600 dark:text-blue-400">B</strong> (before Oil-in),&nbsp;
                  <strong className="text-slate-600 dark:text-slate-400">C</strong> (after Oil-in),&nbsp;
                  <strong className="text-amber-600 dark:text-amber-400">S</strong> (Owner).
                </span>
              </div>
            </div>
          </div>
        </CardFooter>
      </Card>

      {/* Photo Evidence & Inspector Sign-off Modal */}
      {selectedPhotoPunch && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-2xl bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-4 sm:p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-800/60">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-bold">
                  <Camera size={18} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono font-bold text-indigo-600 dark:text-indigo-400">{selectedPhotoPunch.item}</span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      selectedPhotoPunch.planCat === 'A' ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'
                    }`}>
                      Cat {selectedPhotoPunch.planCat}
                    </span>
                  </div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white mt-0.5">
                    หลักฐานภาพถ่ายหน้างาน & การลงนามปิดรายการ (Photo Evidence & Sign-off)
                  </h3>
                </div>
              </div>
              <button
                onClick={() => setSelectedPhotoPunch(null)}
                className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-6 space-y-6 overflow-y-auto custom-scrollbar flex-1">
              <div>
                <span className="text-[10px] font-bold uppercase text-slate-400 block mb-1">Remedial Work Description</span>
                <p className="text-xs font-medium text-slate-800 dark:text-slate-200 bg-slate-50 dark:bg-slate-800/60 p-3 rounded-xl border border-slate-200 dark:border-slate-700">
                  {selectedPhotoPunch.remedialWorks}
                </p>
              </div>

              {/* Before & After Photo Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Before Photo */}
                <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/40 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-red-600 dark:text-red-400 uppercase tracking-wider flex items-center gap-1.5">
                      <AlertTriangle size={14} /> ก่อนแก้ไข (Before)
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono">Walkdown Defect</span>
                  </div>
                  <div className="h-44 rounded-xl overflow-hidden bg-slate-200 dark:bg-slate-800 flex items-center justify-center relative group">
                    <img 
                      src={selectedPhotoPunch.beforePhoto || "https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=600&q=80"} 
                      alt="Before Rectification"
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <label className="px-3 py-1.5 rounded-lg bg-white/90 text-slate-900 text-xs font-bold cursor-pointer hover:bg-white flex items-center gap-1.5">
                        <Upload size={14} /> เปลี่ยนรูป (Upload)
                        <input type="file" accept="image/*" className="hidden" onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            const url = URL.createObjectURL(file);
                            handleUpdateItem(selectedPhotoPunch.id, 'beforePhoto' as any, url);
                            setSelectedPhotoPunch(prev => prev ? { ...prev, beforePhoto: url } : null);
                          }
                        }} />
                      </label>
                    </div>
                  </div>
                </div>

                {/* After Photo */}
                <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/40 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
                      <CheckCircle2 size={14} /> หลังแก้ไขเสร็จ (After)
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono">Resolved Work</span>
                  </div>
                  <div className="h-44 rounded-xl overflow-hidden bg-slate-200 dark:bg-slate-800 flex items-center justify-center relative group">
                    <img 
                      src={selectedPhotoPunch.afterPhoto || "https://images.unsplash.com/photo-1581092335397-9583fe92d232?auto=format&fit=crop&w=600&q=80"} 
                      alt="After Rectification"
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <label className="px-3 py-1.5 rounded-lg bg-white/90 text-slate-900 text-xs font-bold cursor-pointer hover:bg-white flex items-center gap-1.5">
                        <Upload size={14} /> อัปโหลดผลงาน (Upload)
                        <input type="file" accept="image/*" className="hidden" onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            const url = URL.createObjectURL(file);
                            handleUpdateItem(selectedPhotoPunch.id, 'afterPhoto' as any, url);
                            setSelectedPhotoPunch(prev => prev ? { ...prev, afterPhoto: url } : null);
                          }
                        }} />
                      </label>
                    </div>
                  </div>
                </div>
              </div>

              {/* Inspector Sign-off Box */}
              <div className="p-4 rounded-2xl bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-200 dark:border-indigo-800/40 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-indigo-950 dark:text-indigo-200 uppercase tracking-wider">
                    Inspector Sign-off & Completion Verification
                  </span>
                  <span className="text-[10px] font-mono text-indigo-600">QA/QC Endorsement</span>
                </div>
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">ผู้ตรวจรับรอง (Inspector Sign):</label>
                    <Input
                      value={selectedPhotoPunch.cpSign || 'Somchai P. (QA Lead)'}
                      onChange={(e) => {
                        handleUpdateItem(selectedPhotoPunch.id, 'cpSign', e.target.value);
                        setSelectedPhotoPunch(prev => prev ? { ...prev, cpSign: e.target.value } : null);
                      }}
                      className="font-serif italic font-bold h-9 text-xs"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">วันที่รับรอง (Date):</label>
                    <Input
                      type="date"
                      value={selectedPhotoPunch.cpDate || new Date().toISOString().slice(0, 10)}
                      onChange={(e) => {
                        handleUpdateItem(selectedPhotoPunch.id, 'cpDate', e.target.value);
                        setSelectedPhotoPunch(prev => prev ? { ...prev, cpDate: e.target.value } : null);
                      }}
                      className="h-9 text-xs font-mono"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="p-4 border-t border-slate-200 dark:border-slate-800 flex justify-end gap-2 bg-slate-50 dark:bg-slate-800/40">
              <Button
                variant="outline"
                onClick={() => setSelectedPhotoPunch(null)}
                className="text-xs"
              >
                Close
              </Button>
              <Button
                onClick={() => {
                  handleUpdateItem(selectedPhotoPunch.id, 'status' as any, 'Resolved');
                  if (!selectedPhotoPunch.cpSign) {
                    handleUpdateItem(selectedPhotoPunch.id, 'cpSign', 'Somchai P. (QA Lead)');
                  }
                  if (!selectedPhotoPunch.cpDate) {
                    handleUpdateItem(selectedPhotoPunch.id, 'cpDate', new Date().toISOString().slice(0, 10));
                  }
                  setSelectedPhotoPunch(null);
                }}
                className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold gap-1.5 shadow-md cursor-pointer"
              >
                <Check size={16} />
                <span>ยืนยันปิดรายการ (Mark as Resolved)</span>
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
