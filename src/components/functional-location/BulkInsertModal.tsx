import React, { useState, useMemo } from 'react';
import { 
  FileSpreadsheet, Upload, Download, Copy, Check, Trash2, 
  Plus, Sparkles, FolderTree, AlertCircle, Layers, GitBranch, 
  Box, Tag, ShieldAlert, Cpu, ArrowRight, CornerDownRight, CheckCircle2
} from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Select } from '../ui/select';
import { Badge } from '../ui/badge';
import { HierarchyTreeNode, NodeLevelType } from '../FunctionalLocation';
import { RowHighlightType } from '../../data/s2FunctionalLocationData';

interface BulkInsertModalProps {
  isOpen: boolean;
  onClose: () => void;
  existingTree: HierarchyTreeNode[];
  onCommitBulkInsert: (nodesToInsert: HierarchyTreeNode[], mergeWithExisting: boolean) => void;
  isTh: boolean;
}

export interface BulkGridRow {
  id: string;
  parentId: string; // 'root' or existing node ID or path name
  levelType: NodeLevelType;
  tag: string;
  name: string;
  refCode: string;
  highlight: RowHighlightType;
  isCriticalPath: boolean;
  description: string;
}

const SAMPLE_PATH_TEXT = `APS-1 / SYS-01 Feed Pre-heat / P-101A Charge Pump [EWR] * / MTR-101A Electric Motor
APS-1 / SYS-01 Feed Pre-heat / P-101A Charge Pump / SEAL-101A Mechanical Seal
APS-1 / SYS-01 Feed Pre-heat / P-101B Charge Pump Standby / MTR-101B Motor Drive
APS-1 / SYS-02 Crude Column / COL-101 Atmospheric Fractionator [Project] * / TRAY-01 Sieve Tray Top
APS-1 / SYS-02 Crude Column / COL-101 Atmospheric Fractionator / TRAY-24 Bottom Bubble Cap Tray
KHF-1 / SYS-21 High Pressure Loop / R-201 Hydrocracker Reactor * / BED-01 Catalyst Bed Layer 1
KHF-1 / SYS-21 High Pressure Loop / R-201 Hydrocracker Reactor / NOZ-A1 Feed Inlet Nozzle
VPS-2 / SYS-31 Vacuum Overhead / E-301 Vacuum Surface Condenser [Project] / TB-01 Tube Bundle 316L`;

const SAMPLE_GRID_ROWS: BulkGridRow[] = [
  {
    id: 'row-1',
    parentId: 'root',
    levelType: 'unit',
    tag: 'CDU-3',
    name: 'Crude Distillation Unit 3',
    refCode: '10-U03',
    highlight: 'none',
    isCriticalPath: false,
    description: 'New 150K BPD Crude Distillation Unit Area'
  },
  {
    id: 'row-2',
    parentId: 'CDU-3',
    levelType: 'system',
    tag: 'SYS-31',
    name: 'Crude Desalting & Preflash System',
    refCode: '31-01',
    highlight: 'none',
    isCriticalPath: false,
    description: 'Electrostatic Desalter and Preflash Drum'
  },
  {
    id: 'row-3',
    parentId: 'SYS-31',
    levelType: 'equipment',
    tag: 'V-3101',
    name: 'Electrostatic Desalter Vessel',
    refCode: 'V-3101-A',
    highlight: 'Project',
    isCriticalPath: true,
    description: 'Dual grid transformer desalter vessel'
  },
  {
    id: 'row-4',
    parentId: 'V-3101',
    levelType: 'component',
    tag: 'TR-3101A',
    name: 'High Voltage Transformer 1',
    refCode: 'EE-01',
    highlight: 'none',
    isCriticalPath: false,
    description: 'Step-up high voltage grid supply'
  },
  {
    id: 'row-5',
    parentId: 'SYS-31',
    levelType: 'equipment',
    tag: 'P-3101A',
    name: 'Desalter Booster Pump A',
    refCode: 'P-31',
    highlight: 'EWR',
    isCriticalPath: false,
    description: 'Multi-stage horizontal centrifugal pump'
  },
  {
    id: 'row-6',
    parentId: 'P-3101A',
    levelType: 'instrument',
    tag: 'PIT-3101A',
    name: 'Discharge Pressure Transmitter',
    refCode: 'P&ID-31',
    highlight: 'none',
    isCriticalPath: false,
    description: 'Smart HART 4-20mA Pressure Transmitter'
  }
];

export default function BulkInsertModal({
  isOpen,
  onClose,
  existingTree,
  onCommitBulkInsert,
  isTh
}: BulkInsertModalProps) {
  // Tabs: 'path-paste' | 'spreadsheet-grid' | 'csv-file'
  const [activeTab, setActiveTab] = useState<'path-paste' | 'spreadsheet-grid' | 'csv-file'>('path-paste');

  // Tab 1: Path Paste State
  const [pathText, setPathText] = useState<string>(SAMPLE_PATH_TEXT);
  const [delimiter, setDelimiter] = useState<string>('/');

  // Tab 2: Spreadsheet Grid State
  const [gridRows, setGridRows] = useState<BulkGridRow[]>(SAMPLE_GRID_ROWS);
  const [seriesPrefix, setSeriesPrefix] = useState('P-');
  const [seriesStart, setSeriesStart] = useState('201');
  const [seriesCount, setSeriesCount] = useState('4');
  const [seriesSuffix, setSeriesSuffix] = useState('');
  const [seriesParent, setSeriesParent] = useState('root');

  // Options
  const [mergeWithExisting, setMergeWithExisting] = useState(true);
  const [copiedTemplate, setCopiedTemplate] = useState(false);

  // Parent Options dropdown
  const flattenNodesForSelect = (nodes: HierarchyTreeNode[], list: { id: string; label: string; name: string }[] = []) => {
    nodes.forEach(n => {
      const indent = '—'.repeat(n.level - 1);
      list.push({
        id: n.id,
        name: n.name,
        label: `${indent} L${n.level}: ${n.name} (${n.refCode || n.levelType})`
      });
      if (n.children && n.children.length > 0) {
        flattenNodesForSelect(n.children, list);
      }
    });
    return list;
  };
  const parentOptions = useMemo(() => flattenNodesForSelect(existingTree), [existingTree]);

  // ===================== TAB 1: SMART PATH PARSER =====================
  const parsedPathTree = useMemo(() => {
    if (!pathText.trim()) return [];

    const lines = pathText.split('\n').map(l => l.trim()).filter(l => l.length > 0 && !l.startsWith('#') && !l.startsWith('//'));
    const rootNodes: HierarchyTreeNode[] = [];

    // Helper to find or create child in node list
    const findOrCreateChild = (
      list: HierarchyTreeNode[], 
      rawToken: string, 
      level: number, 
      parentId?: string
    ): HierarchyTreeNode => {
      // Parse token: extract name, tag, flags
      let clean = rawToken.trim();
      let isCritical = false;
      let highlight: RowHighlightType = 'none';

      if (clean.includes('*') || clean.toLowerCase().includes('[critical]')) {
        isCritical = true;
        clean = clean.replace(/\*|\[critical\]/gi, '').trim();
      }
      if (clean.includes('[EWR]') || clean.toLowerCase().includes('(ewr)')) {
        highlight = 'EWR';
        clean = clean.replace(/\[EWR\]|\(ewr\)/gi, '').trim();
      } else if (clean.includes('[Project]') || clean.toLowerCase().includes('(project)')) {
        highlight = 'Project';
        clean = clean.replace(/\[Project\]|\(project\)/gi, '').trim();
      }

      // Check if existing child matches clean name
      let found = list.find(n => n.name.toLowerCase() === clean.toLowerCase());
      if (!found) {
        let levelType: NodeLevelType = 'custom';
        if (level === 1) levelType = 'unit';
        else if (level === 2) levelType = 'system';
        else if (level === 3) levelType = 'subsystem';
        else if (level === 4) levelType = 'equipment';
        else if (level === 5) levelType = 'component';
        else if (level >= 6) levelType = 'instrument';

        found = {
          id: `bulk-path-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          level,
          levelType,
          name: clean,
          tag: clean,
          highlight,
          isCriticalPath: isCritical,
          status: 'Ready for Turnover',
          children: [],
          parentId
        };
        list.push(found);
      } else {
        // If flags present on this line, update found node
        if (isCritical) found.isCriticalPath = true;
        if (highlight !== 'none') found.highlight = highlight;
      }

      return found;
    };

    lines.forEach(line => {
      // Split by delimiter or arrows
      const tokens = line
        .split(delimiter === 'tab' ? '\t' : delimiter)
        .map(t => t.trim())
        .filter(t => t.length > 0);

      let currentList = rootNodes;
      let currentParentId: string | undefined = undefined;

      tokens.forEach((tok, idx) => {
        const level = idx + 1;
        const node = findOrCreateChild(currentList, tok, level, currentParentId);
        currentList = node.children;
        currentParentId = node.id;
      });
    });

    return rootNodes;
  }, [pathText, delimiter]);

  // Statistics for Path Parse
  const pathStats = useMemo(() => {
    let count = 0;
    let maxDepth = 0;
    const countRec = (nodes: HierarchyTreeNode[]) => {
      nodes.forEach(n => {
        count++;
        if (n.level > maxDepth) maxDepth = n.level;
        if (n.children && n.children.length > 0) countRec(n.children);
      });
    };
    countRec(parsedPathTree);
    return { count, maxDepth, rootUnits: parsedPathTree.length };
  }, [parsedPathTree]);

  // ===================== TAB 2: GRID ROW ACTIONS =====================
  const handleAddGridRow = () => {
    const newRow: BulkGridRow = {
      id: `row-${Date.now()}`,
      parentId: gridRows.length > 0 ? gridRows[gridRows.length - 1].tag : 'root',
      levelType: 'equipment',
      tag: '',
      name: '',
      refCode: '',
      highlight: 'none',
      isCriticalPath: false,
      description: ''
    };
    setGridRows(prev => [...prev, newRow]);
  };

  const handleDuplicateRow = (index: number) => {
    const source = gridRows[index];
    const duplicated: BulkGridRow = {
      ...source,
      id: `row-${Date.now()}`,
      tag: `${source.tag}-COPY`
    };
    const updated = [...gridRows];
    updated.splice(index + 1, 0, duplicated);
    setGridRows(updated);
  };

  const handleDeleteRow = (index: number) => {
    setGridRows(prev => prev.filter((_, i) => i !== index));
  };

  const handleUpdateRow = (index: number, field: keyof BulkGridRow, value: any) => {
    setGridRows(prev => prev.map((r, i) => i === index ? { ...r, [field]: value } : r));
  };

  const handleGenerateGridSeries = () => {
    const count = parseInt(seriesCount, 10);
    const start = parseInt(seriesStart, 10);
    if (isNaN(count) || count <= 0 || isNaN(start)) {
      alert('Please enter a valid start number and count.');
      return;
    }

    const newRows: BulkGridRow[] = [];
    for (let i = 0; i < count; i++) {
      const numStr = (start + i).toString();
      const tag = `${seriesPrefix}${numStr}${seriesSuffix}`;
      newRows.push({
        id: `gen-${Date.now()}-${i}`,
        parentId: seriesParent,
        levelType: 'equipment',
        tag,
        name: `Process Equipment ${tag}`,
        refCode: `${seriesStart}-${i + 1}`,
        highlight: 'none',
        isCriticalPath: false,
        description: `Automated batch entry for ${tag}`
      });
    }

    setGridRows(prev => [...prev, ...newRows]);
  };

  // Convert Grid Rows into a Nested Tree Structure
  const buildTreeFromGrid = (rows: BulkGridRow[]): HierarchyTreeNode[] => {
    const valid = rows.filter(r => r.tag.trim().length > 0 || r.name.trim().length > 0);
    const nodeMap = new Map<string, HierarchyTreeNode>();
    const rootNodes: HierarchyTreeNode[] = [];

    // First pass: create all node objects
    valid.forEach(r => {
      const tagOrName = r.tag.trim() || r.name.trim();
      let level = 1;
      if (r.levelType === 'unit') level = 1;
      else if (r.levelType === 'system') level = 2;
      else if (r.levelType === 'subsystem') level = 3;
      else if (r.levelType === 'equipment') level = 4;
      else if (r.levelType === 'component') level = 5;
      else if (r.levelType === 'instrument') level = 6;
      else level = 7;

      const node: HierarchyTreeNode = {
        id: `grid-${Date.now()}-${r.id}`,
        level,
        levelType: r.levelType,
        name: tagOrName,
        tag: r.tag.trim() || tagOrName,
        refCode: r.refCode.trim() || undefined,
        description: r.description.trim() || r.name.trim() || undefined,
        highlight: r.highlight,
        isCriticalPath: r.isCriticalPath,
        status: 'Ready for Turnover',
        children: [],
        parentId: r.parentId !== 'root' ? r.parentId : undefined
      };
      nodeMap.set(r.tag.toLowerCase(), node);
      nodeMap.set(r.id, node);
    });

    // Second pass: link parents and children
    valid.forEach(r => {
      const selfNode = nodeMap.get(r.id);
      if (!selfNode) return;

      if (r.parentId === 'root' || !r.parentId) {
        rootNodes.push(selfNode);
      } else {
        const parentNode = nodeMap.get(r.parentId.toLowerCase());
        if (parentNode) {
          selfNode.level = parentNode.level + 1;
          parentNode.children.push(selfNode);
        } else {
          // If parent is not in this batch, it might match an existing tree node or treat as root
          rootNodes.push(selfNode);
        }
      }
    });

    return rootNodes;
  };

  // ===================== TAB 3: CSV IMPORT & TEMPLATE DOWNLOAD =====================
  const handleDownloadCsvTemplate = () => {
    const csvContent = [
      'Level_1_Unit,Level_2_System,Level_3_Subsystem,Level_4_Equipment,Level_5_Component,Ref_Code,Highlight,Critical_Path,Description',
      'APS-1,SYS-11 Feed System,CIR-01 Pre-heat,P-101A,Motor Skid,10-01,EWR,YES,Atmospheric Crude Booster Charge Pump',
      'APS-1,SYS-11 Feed System,CIR-01 Pre-heat,P-101A,Impeller Assembly,10-02,none,NO,316SS Closed Impeller',
      'APS-1,SYS-11 Feed System,CIR-01 Pre-heat,P-101B,Motor Skid,10-03,none,NO,Atmospheric Crude Standby Pump',
      'APS-1,SYS-12 Tower System,,COL-101,Fractionator Body,12-01,Project,YES,Atmospheric Distillation Tower',
      'KHF-1,SYS-24 Hydrogen Circuit,,C-2401,Compressor Rotor,24-01,none,YES,High Pressure Hydrogen Recycle Machine'
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.setAttribute('download', 'Functional_Location_Hierarchy_Template.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleCopyCsvTemplate = () => {
    const csvContent = [
      'Level_1_Unit,Level_2_System,Level_3_Subsystem,Level_4_Equipment,Level_5_Component,Ref_Code,Highlight,Critical_Path,Description',
      'APS-1,SYS-11 Feed System,CIR-01 Pre-heat,P-101A,Motor Skid,10-01,EWR,YES,Atmospheric Crude Booster Charge Pump',
      'APS-1,SYS-11 Feed System,CIR-01 Pre-heat,P-101B,Motor Skid,10-03,none,NO,Atmospheric Crude Standby Pump'
    ].join('\n');

    navigator.clipboard.writeText(csvContent);
    setCopiedTemplate(true);
    setTimeout(() => setCopiedTemplate(false), 3000);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      if (!text) return;

      // Convert CSV lines into path text format
      const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);
      if (lines.length <= 1) return;

      const pathLines: string[] = [];
      // Skip header if first line has "level" or "unit"
      const startIndex = lines[0].toLowerCase().includes('unit') ? 1 : 0;

      for (let i = startIndex; i < lines.length; i++) {
        const parts = lines[i].split(',').map(p => p.trim());
        const validParts = parts.filter(p => p.length > 0);
        if (validParts.length > 0) {
          pathLines.push(validParts.join(' / '));
        }
      }

      setPathText(pathLines.join('\n'));
      setActiveTab('path-paste');
    };
    reader.readAsText(file);
  };

  // ===================== FINAL COMMIT =====================
  const handleCommit = () => {
    let nodesToCommit: HierarchyTreeNode[] = [];

    if (activeTab === 'path-paste' || activeTab === 'csv-file') {
      nodesToCommit = parsedPathTree;
    } else {
      nodesToCommit = buildTreeFromGrid(gridRows);
    }

    if (nodesToCommit.length === 0) {
      alert('No valid hierarchy records found to insert. Please enter data or check syntax.');
      return;
    }

    onCommitBulkInsert(nodesToCommit, mergeWithExisting);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-950/70 backdrop-blur-xs animate-in fade-in overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 rounded-2xl border-2 border-slate-200 dark:border-slate-800 shadow-2xl max-w-5xl w-full my-auto overflow-hidden flex flex-col max-h-[92vh]">
        {/* Modal Header */}
        <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-emerald-950 p-5 text-white flex items-center justify-between border-b border-slate-700/80 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/20 border border-indigo-400/40 flex items-center justify-center shrink-0">
              <FileSpreadsheet size={22} className="text-emerald-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono uppercase tracking-widest text-emerald-300 font-bold bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-500/30">
                  {isTh ? 'นำเข้าข้อมูลแบบกลุ่ม' : 'Bulk Insert Engine'}
                </span>
                <span className="text-slate-300 text-xs font-mono">
                  Functional Location & Asset Hierarchy
                </span>
              </div>
              <h2 className="text-base sm:text-lg font-black tracking-tight mt-0.5">
                {isTh ? 'นำเข้าโครงสร้างตำแหน่งและเครื่องจักรแบบกลุ่ม' : 'Bulk Insert Functional Location & Asset Hierarchy'}
              </h2>
            </div>
          </div>
          <button 
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 text-white flex items-center justify-center cursor-pointer transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Tab Switcher & Quick Utilities */}
        <div className="bg-slate-100 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700 px-5 py-2.5 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-1.5 p-1 bg-slate-200 dark:bg-slate-900 rounded-xl text-xs font-bold">
            <button
              type="button"
              onClick={() => setActiveTab('path-paste')}
              className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer ${
                activeTab === 'path-paste'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <FolderTree size={13} />
              <span>{isTh ? 'วางเส้นทางลำดับชั้น (Path Syntax)' : 'Smart Path Paste'}</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('spreadsheet-grid')}
              className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer ${
                activeTab === 'spreadsheet-grid'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <FileSpreadsheet size={13} />
              <span>{isTh ? 'ตารางกรอกข้อมูล (Grid Matrix)' : 'Interactive Grid'}</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('csv-file')}
              className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer ${
                activeTab === 'csv-file'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Upload size={13} />
              <span>{isTh ? 'อัปโหลดไฟล์ CSV' : 'CSV Upload / Template'}</span>
            </button>
          </div>

          {/* Quick Actions */}
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleDownloadCsvTemplate}
              className="text-xs gap-1 py-1 cursor-pointer border-slate-300 dark:border-slate-600"
            >
              <Download size={12} />
              <span>Template.csv</span>
            </Button>

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleCopyCsvTemplate}
              className="text-xs gap-1 py-1 cursor-pointer border-slate-300 dark:border-slate-600"
            >
              {copiedTemplate ? <Check size={12} className="text-emerald-500" /> : <Copy size={12} />}
              <span>{copiedTemplate ? 'Copied!' : 'Copy Template'}</span>
            </Button>
          </div>
        </div>

        {/* Modal Scrollable Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-4 text-xs">
          {/* ===================== TAB 1: SMART PATH PASTE ===================== */}
          {activeTab === 'path-paste' && (
            <div className="space-y-4">
              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <div className="font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                    <span className="text-indigo-600 dark:text-indigo-400 font-mono">Syntax Guide:</span>
                    <span>Unit / System / Subsystem / Equipment / Component / Instrument</span>
                  </div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                    Paste lines with slashes (`/`), chevrons (`&gt;`), or tabs. Tag flags: `*` or `[Critical]` for critical path, `[EWR]` for yellow highlight, `[Project]` for green tie-in.
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-[11px] text-slate-500 font-bold">Delimiter:</span>
                  <select
                    value={delimiter}
                    onChange={(e) => setDelimiter(e.target.value)}
                    className="p-1.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 font-mono text-xs font-bold"
                  >
                    <option value="/">Slash ( / )</option>
                    <option value=">">Chevron ( &gt; )</option>
                    <option value="\">Backslash ( \ )</option>
                    <option value="tab">Tab Character</option>
                    <option value=",">Comma ( , )</option>
                  </select>
                </div>
              </div>

              {/* Textarea */}
              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Hierarchical Path Text (One item per line)
                </label>
                <textarea
                  value={pathText}
                  onChange={(e) => setPathText(e.target.value)}
                  rows={8}
                  placeholder={`APS-1 / Atmospheric Distillation / P-101A / Motor Skid [Critical] [EWR]\nAPS-1 / Atmospheric Distillation / P-101B\nKHF-1 / Hydrocracker / R-101 / Catalyst Bed`}
                  className="w-full p-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-950 text-emerald-400 font-mono text-xs focus:ring-2 focus:ring-indigo-500 leading-relaxed"
                />
              </div>

              {/* Live Parse Statistics & Preview */}
              <div className="p-3.5 rounded-xl bg-indigo-50/70 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-900/60">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-bold text-indigo-900 dark:text-indigo-200 text-xs flex items-center gap-1.5">
                    <CheckCircle2 size={14} className="text-emerald-500" />
                    <span>Live Parse Verification: {pathStats.count} Total Hierarchy Nodes Found</span>
                  </span>
                  <div className="flex items-center gap-2 font-mono text-[11px]">
                    <span className="bg-indigo-200/60 dark:bg-indigo-900/60 px-2 py-0.5 rounded text-indigo-900 dark:text-indigo-200">
                      {pathStats.rootUnits} Root Units
                    </span>
                    <span className="bg-emerald-200/60 dark:bg-emerald-900/60 px-2 py-0.5 rounded text-emerald-900 dark:text-emerald-200">
                      Max Depth: {pathStats.maxDepth} Levels
                    </span>
                  </div>
                </div>

                {/* Tree Outline Preview */}
                <div className="max-h-40 overflow-y-auto font-mono text-[11px] bg-white dark:bg-slate-900 p-2.5 rounded-lg border border-indigo-100 dark:border-indigo-950 space-y-1">
                  {parsedPathTree.length === 0 ? (
                    <div className="text-slate-400 italic">No valid hierarchy parsed. Please enter paths above.</div>
                  ) : (
                    parsedPathTree.map(unit => (
                      <div key={unit.id} className="text-emerald-600 dark:text-emerald-400 font-bold">
                        📁 Level 1 Unit: {unit.name}
                        {unit.children.map(sys => (
                          <div key={sys.id} className="ml-4 text-amber-600 dark:text-amber-400 font-semibold">
                            ↳ L2 System: {sys.name}
                            {sys.children.map(eq => (
                              <div key={eq.id} className="ml-4 text-indigo-600 dark:text-indigo-300 font-normal">
                                ↳ L3/4: {eq.name} {eq.isCriticalPath && <span className="text-red-500 font-bold">*</span>}
                                {eq.highlight !== 'none' && <span className="text-[10px] ml-1 text-slate-400">[{eq.highlight}]</span>}
                                {eq.children.map(sub => (
                                  <div key={sub.id} className="ml-4 text-purple-600 dark:text-purple-300">
                                    ↳ L5+: {sub.name}
                                  </div>
                                ))}
                              </div>
                            ))}
                          </div>
                        ))}
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ===================== TAB 2: INTERACTIVE SPREADSHEET GRID ===================== */}
          {activeTab === 'spreadsheet-grid' && (
            <div className="space-y-4">
              {/* Batch Series Generator */}
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                <div className="font-bold text-slate-800 dark:text-slate-100 text-xs mb-1.5 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Sparkles size={13} className="text-amber-500" />
                    <span>Auto-Series Injection</span>
                  </span>
                  <span className="text-[10px] text-slate-400">Generates sequential equipment tags into the grid</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                  <div>
                    <label className="text-[10px] text-slate-500 font-bold block mb-0.5">Parent Node</label>
                    <select
                      value={seriesParent}
                      onChange={(e) => setSeriesParent(e.target.value)}
                      className="w-full text-xs font-mono p-1.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800"
                    >
                      <option value="root">Root (L1 Unit)</option>
                      {parentOptions.map(p => (
                        <option key={p.id} value={p.name}>{p.label}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-500 font-bold block mb-0.5">Tag Prefix</label>
                    <Input
                      value={seriesPrefix}
                      onChange={(e) => setSeriesPrefix(e.target.value)}
                      placeholder="e.g. P-"
                      className="font-mono text-xs"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-500 font-bold block mb-0.5">Start No.</label>
                    <Input
                      value={seriesStart}
                      onChange={(e) => setSeriesStart(e.target.value)}
                      placeholder="201"
                      className="font-mono text-xs"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-500 font-bold block mb-0.5">Count</label>
                    <Input
                      value={seriesCount}
                      onChange={(e) => setSeriesCount(e.target.value)}
                      placeholder="4"
                      className="font-mono text-xs"
                    />
                  </div>
                  <div className="flex items-end">
                    <Button
                      type="button"
                      size="sm"
                      onClick={handleGenerateGridSeries}
                      className="w-full bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold gap-1 cursor-pointer py-2"
                    >
                      <Plus size={13} />
                      <span>Inject Rows</span>
                    </Button>
                  </div>
                </div>
              </div>

              {/* Grid Table Toolbar */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    size="sm"
                    onClick={handleAddGridRow}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold gap-1 cursor-pointer py-1"
                  >
                    <Plus size={13} />
                    <span>Add Row</span>
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setGridRows(SAMPLE_GRID_ROWS)}
                    className="text-xs cursor-pointer py-1"
                  >
                    Reset Sample Rows
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setGridRows([])}
                    className="text-xs text-red-600 hover:text-red-700 cursor-pointer py-1"
                  >
                    Clear All
                  </Button>
                </div>
                <span className="text-[11px] font-mono text-slate-500">
                  {gridRows.length} Rows Configured
                </span>
              </div>

              {/* Grid Table */}
              <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-x-auto max-h-72">
                <table className="w-full text-left border-collapse text-xs min-w-[700px]">
                  <thead>
                    <tr className="bg-slate-100 dark:bg-slate-800 text-[10px] font-bold text-slate-500 uppercase border-b border-slate-200 dark:border-slate-700">
                      <th className="py-2 px-2.5 w-10 text-center">#</th>
                      <th className="py-2 px-2 w-36">Parent Node</th>
                      <th className="py-2 px-2 w-28">Classification</th>
                      <th className="py-2 px-2 w-32">Tag / Code *</th>
                      <th className="py-2 px-2">Description / Name</th>
                      <th className="py-2 px-2 w-24">Ref Code</th>
                      <th className="py-2 px-2 w-28">Highlight</th>
                      <th className="py-2 px-2 w-14 text-center">Critical</th>
                      <th className="py-2 px-2 w-16 text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {gridRows.length === 0 ? (
                      <tr>
                        <td colSpan={9} className="py-6 text-center text-slate-400 italic">
                          No rows added yet. Click &quot;Add Row&quot; or &quot;Inject Rows&quot; above.
                        </td>
                      </tr>
                    ) : (
                      gridRows.map((row, idx) => (
                        <tr 
                          key={row.id}
                          className="border-b border-slate-100 dark:border-slate-800/80 hover:bg-slate-50 dark:hover:bg-slate-800/40"
                        >
                          <td className="py-1 px-2.5 text-center text-slate-400 font-mono text-[10px]">
                            {idx + 1}
                          </td>

                          {/* Parent */}
                          <td className="py-1 px-1.5">
                            <input
                              type="text"
                              value={row.parentId}
                              onChange={(e) => handleUpdateRow(idx, 'parentId', e.target.value)}
                              placeholder="root or parent tag"
                              className="w-full p-1 rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 font-mono text-[11px]"
                            />
                          </td>

                          {/* Classification */}
                          <td className="py-1 px-1.5">
                            <select
                              value={row.levelType}
                              onChange={(e) => handleUpdateRow(idx, 'levelType', e.target.value as NodeLevelType)}
                              className="w-full p-1 rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-[11px]"
                            >
                              <option value="unit">L1 Unit</option>
                              <option value="system">L2 System</option>
                              <option value="subsystem">L3 Subsystem</option>
                              <option value="equipment">L4 Equipment</option>
                              <option value="component">L5 Component</option>
                              <option value="instrument">L6 Instrument</option>
                              <option value="custom">L7+ Custom</option>
                            </select>
                          </td>

                          {/* Tag */}
                          <td className="py-1 px-1.5">
                            <input
                              type="text"
                              value={row.tag}
                              onChange={(e) => handleUpdateRow(idx, 'tag', e.target.value)}
                              placeholder="e.g. P-101A"
                              required
                              className="w-full p-1 rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 font-mono text-[11px] font-bold"
                            />
                          </td>

                          {/* Description */}
                          <td className="py-1 px-1.5">
                            <input
                              type="text"
                              value={row.name}
                              onChange={(e) => handleUpdateRow(idx, 'name', e.target.value)}
                              placeholder="Name / Scope description"
                              className="w-full p-1 rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-[11px]"
                            />
                          </td>

                          {/* Ref Code */}
                          <td className="py-1 px-1.5">
                            <input
                              type="text"
                              value={row.refCode}
                              onChange={(e) => handleUpdateRow(idx, 'refCode', e.target.value)}
                              placeholder="10-01"
                              className="w-full p-1 rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 font-mono text-[11px]"
                            />
                          </td>

                          {/* Highlight */}
                          <td className="py-1 px-1.5">
                            <select
                              value={row.highlight}
                              onChange={(e) => handleUpdateRow(idx, 'highlight', e.target.value as RowHighlightType)}
                              className="w-full p-1 rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-[11px]"
                            >
                              <option value="none">Base White</option>
                              <option value="EWR">EWR (Yellow)</option>
                              <option value="Project">Project (Green)</option>
                            </select>
                          </td>

                          {/* Critical */}
                          <td className="py-1 px-1 text-center">
                            <input
                              type="checkbox"
                              checked={row.isCriticalPath}
                              onChange={(e) => handleUpdateRow(idx, 'isCriticalPath', e.target.checked)}
                              className="rounded text-red-600 cursor-pointer"
                            />
                          </td>

                          {/* Actions */}
                          <td className="py-1 px-1.5 text-center">
                            <div className="flex items-center justify-center gap-1">
                              <button
                                type="button"
                                onClick={() => handleDuplicateRow(idx)}
                                className="p-1 rounded text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 cursor-pointer"
                                title="Duplicate row"
                              >
                                <Copy size={12} />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteRow(idx)}
                                className="p-1 rounded text-red-500 hover:text-red-700 cursor-pointer"
                                title="Delete row"
                              >
                                <Trash2 size={12} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ===================== TAB 3: CSV FILE UPLOAD ===================== */}
          {activeTab === 'csv-file' && (
            <div className="space-y-4">
              <div className="border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-2xl p-8 text-center bg-slate-50/50 dark:bg-slate-800/40">
                <Upload size={36} className="mx-auto text-indigo-500 mb-3" />
                <h3 className="font-bold text-slate-800 dark:text-slate-100 text-sm mb-1">
                  Upload CSV / TSV Hierarchy File
                </h3>
                <p className="text-xs text-slate-500 max-w-md mx-auto mb-4">
                  Select a CSV spreadsheet formatted with unit, system, and equipment columns. The system will automatically parse parent-child relationships and import them.
                </p>
                <div className="inline-block relative">
                  <input
                    type="file"
                    accept=".csv,.tsv,.txt"
                    onChange={handleFileUpload}
                    className="absolute inset-0 opacity-0 cursor-pointer"
                  />
                  <Button
                    type="button"
                    className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs gap-1.5 cursor-pointer shadow-md"
                  >
                    <Upload size={14} />
                    <span>Choose CSV File</span>
                  </Button>
                </div>
              </div>

              {/* Format Reference Card */}
              <div className="p-4 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                <div className="font-bold text-slate-800 dark:text-slate-200 text-xs mb-1.5">
                  Expected CSV Column Headers:
                </div>
                <pre className="font-mono text-[11px] text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-900 p-2.5 rounded-lg border border-slate-200 dark:border-slate-700 overflow-x-auto">
Level_1_Unit, Level_2_System, Level_3_Subsystem, Level_4_Equipment, Level_5_Component, Ref_Code, Highlight, Critical_Path, Description
                </pre>
              </div>
            </div>
          )}

          {/* Integration & Merge Options */}
          <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <label className="font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={mergeWithExisting}
                  onChange={(e) => setMergeWithExisting(e.target.checked)}
                  className="w-4 h-4 rounded text-indigo-600"
                />
                <span>Merge with Existing Hierarchy Tree</span>
              </label>
              <div className="text-[11px] text-slate-500 mt-0.5 ml-6">
                When enabled, child items matching existing Unit or System tags (e.g. `APS-1`, `SYS-11`) will attach directly under existing nodes instead of creating duplicate root units.
              </div>
            </div>

            <Badge variant="outline" className="text-xs font-mono font-bold text-emerald-600 dark:text-emerald-400 border-emerald-500/40 bg-emerald-500/10">
              Auto-Expand Newly Added Branches
            </Badge>
          </div>
        </div>

        {/* Modal Footer Actions */}
        <div className="p-4 bg-slate-100 dark:bg-slate-800/80 border-t border-slate-200 dark:border-slate-700 flex items-center justify-between shrink-0">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onClose}
            className="text-xs cursor-pointer"
          >
            Cancel
          </Button>

          <Button
            type="button"
            size="sm"
            onClick={handleCommit}
            className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold gap-1.5 text-xs cursor-pointer shadow-md shadow-emerald-900/30"
          >
            <FolderTree size={14} />
            <span>
              {activeTab === 'path-paste'
                ? `Commit & Insert ${pathStats.count} Hierarchy Nodes`
                : activeTab === 'spreadsheet-grid'
                ? `Commit & Insert ${gridRows.length} Grid Rows`
                : 'Commit & Insert Hierarchy'}
            </span>
          </Button>
        </div>
      </div>
    </div>
  );
}
