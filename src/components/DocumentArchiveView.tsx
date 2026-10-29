import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from './ui/card';
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from './ui/table';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Select } from './ui/select';
import { 
  Archive, FileText, Download, Search, Filter, 
  CheckCircle2, Clock, Eye, FolderLock, ExternalLink, QrCode 
} from 'lucide-react';

interface ArchivedDoc {
  id: string;
  docNo: string;
  title: string;
  stage: string;
  equipmentTag: string;
  uploadedBy: string;
  role: string;
  date: string;
  size: string;
  status: 'Approved' | 'Archived' | 'Pending Review';
  qrLinked: boolean;
}

const INITIAL_ARCHIVE: ArchivedDoc[] = [
  {
    id: 'arc-1',
    docNo: 'DOC-TO-11-001',
    title: 'Punch & Butt List Walk Log (Stage 1 Photographic Dossier)',
    stage: 'Stage 1: Punch & Butt walk',
    equipmentTag: '11-E-101A / 11-C-101',
    uploadedBy: 'Thawatchai K.',
    role: 'Job lead/ Contractor',
    date: '2026-09-24 09:30',
    size: '4.8 MB',
    status: 'Approved',
    qrLinked: true
  },
  {
    id: 'arc-2',
    docNo: 'DOC-TO-11-002',
    title: 'Appendix A: Internal Vessel Cleanliness & Tube Cleaning Record',
    stage: 'Stage 2: Complete Closing form',
    equipmentTag: '11-E-101A',
    uploadedBy: 'Dr. Anan Suksabai',
    role: 'TSS Representative',
    date: '2026-09-24 11:15',
    size: '3.2 MB',
    status: 'Approved',
    qrLinked: true
  },
  {
    id: 'arc-3',
    docNo: 'DOC-TO-11-003',
    title: 'Appendix B: Vessel Box-Up & Exception Waiver Protocol',
    stage: 'Stage 3: Box up/ De-blind',
    equipmentTag: '11-V-104',
    uploadedBy: 'Narong B.',
    role: 'Operator/ Engineer',
    date: '2026-09-24 14:05',
    size: '2.1 MB',
    status: 'Approved',
    qrLinked: true
  },
  {
    id: 'arc-4',
    docNo: 'DOC-TO-11-004',
    title: 'Flange QC Star Pattern Torque Reports & Tamper Tag Photos',
    stage: 'Stage 3: Box up/ De-blind',
    equipmentTag: 'FL-11-E101-N1 / N2',
    uploadedBy: 'QC Police Kamon.P',
    role: 'Turnover Coordinator',
    date: '2026-09-24 15:40',
    size: '8.4 MB',
    status: 'Approved',
    qrLinked: true
  },
  {
    id: 'arc-5',
    docNo: 'DOC-TO-11-005',
    title: 'AEL De-Blind Instruction Certificate & Blind Spade Ledger',
    stage: 'Stage 2: Complete Closing form',
    equipmentTag: 'Area 11 Header Lines',
    uploadedBy: 'Eng. Somchai P.',
    role: 'AEL',
    date: '2026-09-24 16:10',
    size: '1.9 MB',
    status: 'Approved',
    qrLinked: true
  },
  {
    id: 'arc-6',
    docNo: 'DOC-TO-11-006',
    title: 'Master Turnover Certificate & TAM Manager Endorsement (TC-2026-001)',
    stage: 'Stage 4: Closing',
    equipmentTag: 'SYS-11-CRUDE-01',
    uploadedBy: 'Dr. Wichai Thongchai',
    role: 'Turnover Coordinator',
    date: '2026-09-24 17:50',
    size: '5.6 MB',
    status: 'Archived',
    qrLinked: true
  }
];

export default function DocumentArchiveView() {
  const [docs, setDocs] = useState<ArchivedDoc[]>(INITIAL_ARCHIVE);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStage, setFilterStage] = useState('All');

  const filteredDocs = docs.filter(d => {
    const matchesStage = filterStage === 'All' || d.stage === filterStage;
    const matchesSearch = d.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          d.docNo.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          d.equipmentTag.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          d.uploadedBy.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesStage && matchesSearch;
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto w-full">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-emerald-950 p-6 rounded-2xl text-white shadow-xl border border-slate-700/50 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-600/30 text-emerald-400 border border-emerald-500/30 flex items-center justify-center font-bold">
            <Archive size={26} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <Badge variant="default" className="bg-emerald-600 text-white">
                Global Repository
              </Badge>
              <span className="text-slate-400 text-xs font-mono">SYS-TO-ARCHIVE</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black tracking-tight mt-1">
              Document Archive & Turnover Records
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 mt-0.5">
              Secure centralized repository for all on-site QR uploads, Appendix A/B closing forms, flange police reports, and TAM endorsements.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="text-right">
            <span className="text-[10px] uppercase font-bold text-slate-400 block">Archived Dossiers</span>
            <span className="text-lg font-black text-emerald-400 font-mono">
              {docs.length} Official Files
            </span>
          </div>
        </div>
      </div>

      <Card>
        <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <CardTitle>Turnover Platform Document Vault</CardTitle>
            <CardDescription>
              All records indexed by QR code, equipment tag, and turnaround stage with immutable audit trails.
            </CardDescription>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <div className="relative w-56">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search Title, Tag, Doc #..."
                className="w-full pl-8 pr-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
              <Search size={14} className="absolute left-2.5 top-2 text-slate-400" />
            </div>

            <div className="w-44">
              <Select
                value={filterStage}
                onChange={(e) => setFilterStage(e.target.value)}
                options={[
                  { value: 'All', label: 'All Stages' },
                  { value: 'Stage 1: Punch & Butt walk', label: 'Stage 1: Punch Walk' },
                  { value: 'Stage 2: Complete Closing form', label: 'Stage 2: Closing Form' },
                  { value: 'Stage 3: Box up/ De-blind', label: 'Stage 3: Box up/De-blind' },
                  { value: 'Stage 4: Closing', label: 'Stage 4: Closing' },
                ]}
              />
            </div>
          </div>
        </CardHeader>

        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-32">Document #</TableHead>
                <TableHead className="min-w-64">Document Title</TableHead>
                <TableHead className="w-48">Workflow Stage</TableHead>
                <TableHead className="w-36">Equipment Tag</TableHead>
                <TableHead className="w-40">Uploaded By & Role</TableHead>
                <TableHead className="w-36">Timestamp</TableHead>
                <TableHead className="w-20 text-center">QR Link</TableHead>
                <TableHead className="w-24 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredDocs.map((doc) => (
                <TableRow key={doc.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                  <TableCell className="font-mono font-bold text-slate-900 dark:text-white">
                    {doc.docNo}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <FileText size={16} className="text-emerald-600 shrink-0" />
                      <div>
                        <div className="font-semibold text-slate-900 dark:text-slate-100">{doc.title}</div>
                        <div className="text-[10px] text-slate-400 font-mono">{doc.size} • PDF Document</div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="text-[10px]">
                      {doc.stage}
                    </Badge>
                  </TableCell>
                  <TableCell className="font-mono font-bold text-slate-700 dark:text-slate-300 text-xs">
                    {doc.equipmentTag}
                  </TableCell>
                  <TableCell>
                    <div className="text-xs font-semibold text-slate-800 dark:text-slate-200">{doc.uploadedBy}</div>
                    <div className="text-[10px] text-slate-400">{doc.role}</div>
                  </TableCell>
                  <TableCell className="text-[11px] font-mono text-slate-500">
                    {doc.date}
                  </TableCell>
                  <TableCell className="text-center">
                    {doc.qrLinked && (
                      <span className="inline-flex items-center justify-center p-1 rounded-md bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800" title="Scanned and verified via on-site QR tag">
                        <QrCode size={16} />
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-slate-500 hover:text-slate-900">
                        <Eye size={14} />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-blue-600 hover:text-blue-700">
                        <Download size={14} />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
