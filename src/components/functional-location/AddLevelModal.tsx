import React, { useState, useEffect } from 'react';
import { 
  CornerDownRight, Plus, Trash2, Layers, GitBranch, Split, 
  Box, Cpu, Tag, Flame, ShieldAlert, Sparkles, AlertCircle,
  Copy, ListPlus, GitCommit, ArrowRight, Check
} from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Select } from '../ui/select';
import { Badge } from '../ui/badge';
import { HierarchyTreeNode, NodeLevelType } from '../FunctionalLocation';
import { RowHighlightType } from '../../data/s2FunctionalLocationData';

interface AddLevelModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetParentNode: HierarchyTreeNode | null;
  allNodes: HierarchyTreeNode[];
  onAddSingleNode: (node: HierarchyTreeNode, parentId?: string) => void;
  onAddBranch: (branchNodes: HierarchyTreeNode[], parentId?: string) => void;
  onAddBatchSiblings: (siblingNodes: HierarchyTreeNode[], parentId?: string) => void;
  isTh: boolean;
}

// Default level helper
function getDefaultTypeForLevel(level: number): NodeLevelType {
  if (level === 1) return 'unit';
  if (level === 2) return 'system';
  if (level === 3) return 'subsystem';
  if (level === 4) return 'equipment';
  if (level === 5) return 'component';
  if (level === 6) return 'instrument';
  return 'custom';
}

function getLevelLabel(level: number, type?: NodeLevelType): string {
  if (level === 1) return 'Unit / Plant Area';
  if (level === 2) return 'Process System';
  if (level === 3) return 'Sub-System / Process Circuit';
  if (level === 4) return 'Equipment / Machine Skid';
  if (level === 5) return 'Sub-Equipment / Component';
  if (level === 6) return 'Instrument / Loop / Transmitter';
  if (level === 7) return 'Piping Spool / Fitting / Line';
  if (level === 8) return 'Nozzle / Flange / Bolting';
  return `Level ${level} Custom Hierarchy`;
}

interface BranchStepItem {
  id: string;
  level: number;
  levelType: NodeLevelType;
  name: string;
  tag: string;
  refCode: string;
  highlight: RowHighlightType;
  isCriticalPath: boolean;
  description: string;
}

export default function AddLevelModal({
  isOpen,
  onClose,
  targetParentNode,
  allNodes,
  onAddSingleNode,
  onAddBranch,
  onAddBatchSiblings,
  isTh
}: AddLevelModalProps) {
  // Modal Creation Mode: 'single' | 'branch' | 'batch'
  const [mode, setMode] = useState<'single' | 'branch' | 'batch'>('single');

  // Selected parent node ID (defaults to targetParentNode.id or 'root')
  const [selectedParentId, setSelectedParentId] = useState<string>(targetParentNode ? targetParentNode.id : 'root');

  // Single Mode State
  const [singleLevel, setSingleLevel] = useState<number>(targetParentNode ? targetParentNode.level + 1 : 1);
  const [singleLevelType, setSingleLevelType] = useState<NodeLevelType>(getDefaultTypeForLevel(targetParentNode ? targetParentNode.level + 1 : 1));
  const [singleName, setSingleName] = useState('');
  const [singleTag, setSingleTag] = useState('');
  const [singleRefCode, setSingleRefCode] = useState('');
  const [singleHighlight, setSingleHighlight] = useState<RowHighlightType>('none');
  const [singleIsCritical, setSingleIsCritical] = useState(false);
  const [singleDescription, setSingleDescription] = useState('');

  // Multi-Level Branch State (Creating an entire linked chain of levels at once)
  const [branchSteps, setBranchSteps] = useState<BranchStepItem[]>([]);

  // Batch Siblings State (Creating multiple sibling nodes under parent at once)
  const [batchTagsText, setBatchTagsText] = useState('');
  const [batchLevelType, setBatchLevelType] = useState<NodeLevelType>('equipment');
  const [batchHighlight, setBatchHighlight] = useState<RowHighlightType>('none');
  const [batchIsCritical, setBatchIsCritical] = useState(false);

  // Quick series generator in batch mode
  const [seriesPrefix, setSeriesPrefix] = useState('P-');
  const [seriesStart, setSeriesStart] = useState('101');
  const [seriesCount, setSeriesCount] = useState('4');
  const [seriesSuffix, setSeriesSuffix] = useState('');

  // Initialize state whenever targetParentNode changes
  useEffect(() => {
    const parentId = targetParentNode ? targetParentNode.id : 'root';
    setSelectedParentId(parentId);

    const baseLevel = targetParentNode ? targetParentNode.level + 1 : 1;
    setSingleLevel(baseLevel);
    setSingleLevelType(getDefaultTypeForLevel(baseLevel));
    setBatchLevelType(getDefaultTypeForLevel(baseLevel));

    // Initialize Multi-level branch with 2 initial steps (e.g. Equipment -> Component)
    const step1Level = baseLevel;
    const step2Level = baseLevel + 1;
    setBranchSteps([
      {
        id: 'step-1',
        level: step1Level,
        levelType: getDefaultTypeForLevel(step1Level),
        name: '',
        tag: '',
        refCode: '',
        highlight: 'none',
        isCriticalPath: false,
        description: ''
      },
      {
        id: 'step-2',
        level: step2Level,
        levelType: getDefaultTypeForLevel(step2Level),
        name: '',
        tag: '',
        refCode: '',
        highlight: 'none',
        isCriticalPath: false,
        description: ''
      }
    ]);
  }, [targetParentNode, isOpen]);

  if (!isOpen) return null;

  // Flatten all existing nodes for parent selector dropdown
  const flattenNodesForSelect = (nodes: HierarchyTreeNode[], list: { id: string; label: string; level: number }[] = []) => {
    nodes.forEach(n => {
      const indent = '—'.repeat(n.level - 1);
      list.push({
        id: n.id,
        label: `${indent} L${n.level}: ${n.name} (${n.refCode || n.levelType})`,
        level: n.level
      });
      if (n.children && n.children.length > 0) {
        flattenNodesForSelect(n.children, list);
      }
    });
    return list;
  };
  const parentOptions = flattenNodesForSelect(allNodes);

  // Find currently selected parent
  const activeParentNode = selectedParentId === 'root' ? null : allNodes.reduce<HierarchyTreeNode | null>((found, node) => {
    if (found) return found;
    const findRec = (curr: HierarchyTreeNode): HierarchyTreeNode | null => {
      if (curr.id === selectedParentId) return curr;
      for (const ch of curr.children || []) {
        const res = findRec(ch);
        if (res) return res;
      }
      return null;
    };
    return findRec(node);
  }, null);

  // ===================== SUBMIT HANDLERS =====================

  // 1. Submit Single Node
  const handleSaveSingle = (e: React.FormEvent) => {
    e.preventDefault();
    const tagOrName = singleTag.trim() || singleName.trim();
    if (!tagOrName) {
      alert('Please enter a Name or Equipment Tag.');
      return;
    }

    const newNode: HierarchyTreeNode = {
      id: `node-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      level: singleLevel,
      levelType: singleLevelType,
      name: tagOrName,
      tag: singleTag.trim() || tagOrName,
      refCode: singleRefCode.trim() || undefined,
      description: singleDescription.trim() || undefined,
      highlight: singleHighlight,
      isCriticalPath: singleIsCritical,
      status: 'Ready for Turnover',
      children: [],
      parentId: selectedParentId === 'root' ? undefined : selectedParentId
    };

    onAddSingleNode(newNode, selectedParentId === 'root' ? undefined : selectedParentId);
    onClose();
  };

  // 2. Submit Multi-Level Branch
  const handleSaveBranch = (e: React.FormEvent) => {
    e.preventDefault();
    const validSteps = branchSteps.filter(s => s.name.trim().length > 0 || s.tag.trim().length > 0);
    if (validSteps.length === 0) {
      alert('Please fill in at least one level step in your branch.');
      return;
    }

    // Convert flat steps into a nested parent-child branch hierarchy
    const createNestedBranch = (steps: BranchStepItem[], index: number, parentId?: string): HierarchyTreeNode => {
      const step = steps[index];
      const tagOrName = step.tag.trim() || step.name.trim();
      const nodeId = `branch-${Date.now()}-${index}-${Math.random().toString(36).substring(2, 6)}`;
      
      const node: HierarchyTreeNode = {
        id: nodeId,
        level: step.level,
        levelType: step.levelType,
        name: tagOrName,
        tag: step.tag.trim() || tagOrName,
        refCode: step.refCode.trim() || undefined,
        description: step.description.trim() || undefined,
        highlight: step.highlight,
        isCriticalPath: step.isCriticalPath,
        status: 'Ready for Turnover',
        children: index < steps.length - 1 ? [createNestedBranch(steps, index + 1, nodeId)] : [],
        parentId
      };
      return node;
    };

    const rootBranchNode = createNestedBranch(validSteps, 0, selectedParentId === 'root' ? undefined : selectedParentId);
    onAddBranch([rootBranchNode], selectedParentId === 'root' ? undefined : selectedParentId);
    onClose();
  };

  // 3. Submit Batch Siblings
  const handleSaveBatch = (e: React.FormEvent) => {
    e.preventDefault();
    const rawTokens = batchTagsText
      .split(/[\n,;]+/)
      .map(t => t.trim())
      .filter(t => t.length > 0);

    if (rawTokens.length === 0) {
      alert('Please enter one or more tags or use the Series Generator.');
      return;
    }

    const targetLevel = activeParentNode ? activeParentNode.level + 1 : 1;
    const newNodes: HierarchyTreeNode[] = rawTokens.map((token, idx) => {
      // Check if line contains flags like [EWR] or [Project] or *
      let highlight = batchHighlight;
      let isCritical = batchIsCritical;
      let cleanTag = token;

      if (cleanTag.includes('[EWR]') || cleanTag.toLowerCase().includes('(ewr)')) {
        highlight = 'EWR';
        cleanTag = cleanTag.replace(/\[EWR\]|\(ewr\)/gi, '').trim();
      } else if (cleanTag.includes('[Project]') || cleanTag.toLowerCase().includes('(project)')) {
        highlight = 'Project';
        cleanTag = cleanTag.replace(/\[Project\]|\(project\)/gi, '').trim();
      }

      if (cleanTag.includes('*') || cleanTag.toLowerCase().includes('[critical]')) {
        isCritical = true;
        cleanTag = cleanTag.replace(/\*|\[critical\]/gi, '').trim();
      }

      return {
        id: `batch-${Date.now()}-${idx}-${Math.random().toString(36).substring(2, 6)}`,
        level: targetLevel,
        levelType: batchLevelType,
        name: cleanTag,
        tag: cleanTag,
        highlight,
        isCriticalPath: isCritical,
        status: 'Ready for Turnover',
        children: [],
        parentId: selectedParentId === 'root' ? undefined : selectedParentId
      };
    });

    onAddBatchSiblings(newNodes, selectedParentId === 'root' ? undefined : selectedParentId);
    onClose();
  };

  // Quick series generator helper
  const handleGenerateSeries = () => {
    const count = parseInt(seriesCount, 10);
    const start = parseInt(seriesStart, 10);
    if (isNaN(count) || count <= 0 || isNaN(start)) {
      alert('Please enter a valid start number and count.');
      return;
    }

    const generated: string[] = [];
    for (let i = 0; i < count; i++) {
      const numStr = (start + i).toString();
      generated.push(`${seriesPrefix}${numStr}${seriesSuffix}`);
    }

    setBatchTagsText(prev => {
      const existing = prev.trim();
      return existing ? `${existing}\n${generated.join('\n')}` : generated.join('\n');
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-950/70 backdrop-blur-xs animate-in fade-in overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 rounded-2xl border-2 border-slate-200 dark:border-slate-800 shadow-2xl max-w-2xl w-full my-auto overflow-hidden flex flex-col max-h-[92vh]">
        {/* Modal Header */}
        <div className="bg-gradient-to-r from-indigo-950 via-slate-900 to-emerald-950 p-5 text-white flex items-center justify-between border-b border-slate-700/80 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/20 border border-indigo-400/40 flex items-center justify-center shrink-0">
              <CornerDownRight size={20} className="text-amber-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono uppercase tracking-widest text-emerald-300 font-bold bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-500/30">
                  {isTh ? 'โครงสร้างหลายระดับ' : 'Multi-Level Hierarchy Builder'}
                </span>
                <span className="text-slate-400 text-xs">
                  {activeParentNode ? `Parent: L${activeParentNode.level} ${activeParentNode.name}` : 'Root Level (L1)'}
                </span>
              </div>
              <h2 className="text-base sm:text-lg font-black tracking-tight mt-0.5">
                {isTh ? 'สร้างระดับชั้นในผังตำแหน่ง (Add Level)' : 'Create Levels in Asset & Location Hierarchy'}
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

        {/* Mode Selector Navigation Tabs */}
        <div className="bg-slate-100 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700 px-5 py-2.5 flex items-center justify-between gap-2 shrink-0">
          <div className="flex items-center gap-1.5 p-1 bg-slate-200 dark:bg-slate-900 rounded-xl text-xs font-bold">
            <button
              type="button"
              onClick={() => setMode('single')}
              className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer ${
                mode === 'single'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Plus size={13} />
              <span>{isTh ? 'สร้าง 1 ระดับ' : 'Single Level'}</span>
            </button>

            <button
              type="button"
              onClick={() => setMode('branch')}
              className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer ${
                mode === 'branch'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <GitBranch size={13} className="text-amber-400" />
              <span>{isTh ? 'สร้างกิ่งหลายระดับ (Branch)' : 'Multi-Level Branch'}</span>
              <Badge className="bg-amber-500/20 text-amber-300 border-amber-500/40 text-[9px] px-1 py-0 ml-0.5">
                New
              </Badge>
            </button>

            <button
              type="button"
              onClick={() => setMode('batch')}
              className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer ${
                mode === 'batch'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <ListPlus size={13} />
              <span>{isTh ? 'สร้างหลายรายการพร้อมกัน' : 'Batch Items (Lvl)'}</span>
            </button>
          </div>

          <div className="text-[11px] text-slate-500 hidden sm:block font-mono">
            Depth: Level 1 – 10+
          </div>
        </div>

        {/* Modal Scrollable Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-4 text-xs">
          {/* Target Parent Selector */}
          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
            <label className="font-bold text-slate-700 dark:text-slate-200 block mb-1.5 flex items-center justify-between">
              <span>{isTh ? 'ตำแหน่งต้นสังกัด (Attach Under Parent):' : 'Parent Node (Attach Under):'}</span>
              <span className="text-[11px] font-mono text-indigo-600 dark:text-indigo-400">
                {selectedParentId === 'root' ? 'Top-Level (Root Area)' : `Selected: L${activeParentNode?.level}`}
              </span>
            </label>
            <select
              value={selectedParentId}
              onChange={(e) => {
                setSelectedParentId(e.target.value);
                const p = parentOptions.find(opt => opt.id === e.target.value);
                const nextLvl = p ? p.level + 1 : 1;
                setSingleLevel(nextLvl);
                setSingleLevelType(getDefaultTypeForLevel(nextLvl));
              }}
              className="w-full text-xs font-mono p-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100"
            >
              <option value="root">★ Root / Top-Level Plant (Creates Level 1 Unit)</option>
              {parentOptions.map(p => (
                <option key={p.id} value={p.id}>
                  {p.label}
                </option>
              ))}
            </select>
          </div>

          {/* ===================== MODE 1: SINGLE LEVEL ===================== */}
          {mode === 'single' && (
            <form id="single-level-form" onSubmit={handleSaveSingle} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Level Depth Number */}
                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    Level Depth (1 - 10+) *
                  </label>
                  <Input
                    type="number"
                    min={1}
                    max={20}
                    value={singleLevel}
                    onChange={(e) => {
                      const lvl = parseInt(e.target.value, 10) || 1;
                      setSingleLevel(lvl);
                      setSingleLevelType(getDefaultTypeForLevel(lvl));
                    }}
                    required
                    className="font-mono text-xs"
                  />
                  <span className="text-[10px] text-slate-500 font-mono mt-0.5 block">
                    {getLevelLabel(singleLevel, singleLevelType)}
                  </span>
                </div>

                {/* Level Classification */}
                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    Classification / Level Type *
                  </label>
                  <Select
                    value={singleLevelType}
                    onChange={(e) => setSingleLevelType(e.target.value as NodeLevelType)}
                    options={[
                      { value: 'unit', label: 'Level 1: Plant Unit / Area' },
                      { value: 'system', label: 'Level 2: Main Process System' },
                      { value: 'subsystem', label: 'Level 3: Sub-System / Process Circuit' },
                      { value: 'equipment', label: 'Level 4: Equipment / Machine Skid' },
                      { value: 'component', label: 'Level 5: Component / Sub-Equipment' },
                      { value: 'instrument', label: 'Level 6: Instrument / Loop / Transmitter' },
                      { value: 'custom', label: 'Level 7+: Piping Spool / Flange / Custom' },
                    ]}
                    className="text-xs"
                  />
                </div>
              </div>

              {/* Tag and Ref Code */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    Tag / Node Code *
                  </label>
                  <Input
                    value={singleTag}
                    onChange={(e) => {
                      setSingleTag(e.target.value);
                      if (!singleName) setSingleName(e.target.value);
                    }}
                    placeholder="e.g. S2-DR-001D-MTR-01, P-101A"
                    required
                    className="font-mono text-xs"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    Reference Code / P&ID ID
                  </label>
                  <Input
                    value={singleRefCode}
                    onChange={(e) => setSingleRefCode(e.target.value)}
                    placeholder="e.g. 10-03-A, P&ID-108"
                    className="font-mono text-xs"
                  />
                </div>
              </div>

              {/* Scope Highlight */}
              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Work Scope & Highlight Color
                </label>
                <Select
                  value={singleHighlight}
                  onChange={(e) => setSingleHighlight(e.target.value as RowHighlightType)}
                  options={[
                    { value: 'none', label: 'Standard White / Base Scope' },
                    { value: 'EWR', label: 'EWR Scope (Yellow Background)' },
                    { value: 'Project', label: 'Project Tie-in (Green Background)' },
                  ]}
                  className="text-xs"
                />
              </div>

              {/* Critical Path */}
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 flex items-center justify-between">
                <div>
                  <div className="font-bold text-slate-800 dark:text-slate-100 flex items-center gap-1.5">
                    <span className="text-red-600 font-black text-sm">*</span>
                    <span>Critical Path Gate Item</span>
                  </div>
                  <div className="text-[11px] text-slate-500">
                    Appends milestone asterisk (*) designation to this node.
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={singleIsCritical}
                  onChange={(e) => setSingleIsCritical(e.target.checked)}
                  className="w-5 h-5 rounded text-red-600 cursor-pointer"
                />
              </div>

              {/* Description */}
              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Description / Functional Scope Notes
                </label>
                <Input
                  value={singleDescription}
                  onChange={(e) => setSingleDescription(e.target.value)}
                  placeholder="e.g. Dual Grid Electric Transformer & Agitator Motor Skid"
                  className="text-xs"
                />
              </div>
            </form>
          )}

          {/* ===================== MODE 2: MULTI-LEVEL BRANCH BUILDER ===================== */}
          {mode === 'branch' && (
            <form id="branch-level-form" onSubmit={handleSaveBranch} className="space-y-4">
              <div className="p-3 rounded-xl bg-indigo-50/70 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-900/60">
                <div className="flex items-center gap-2 text-indigo-900 dark:text-indigo-200 font-bold text-xs">
                  <GitBranch size={15} className="text-indigo-600 dark:text-indigo-400" />
                  <span>{isTh ? 'สร้างสายสาขาย่อยหลายระดับชั้นพร้อมกัน' : 'Multi-Depth Linked Branch Chain'}</span>
                </div>
                <p className="text-[11px] text-indigo-700 dark:text-indigo-300 mt-1">
                  {isTh 
                    ? 'สามารถสร้างระดับชั้นลึกลงไปพร้อมกันได้ เช่น Subsystem > Equipment > Component > Instrument ในการบันทึกครั้งเดียว' 
                    : 'Construct an entire vertical parent-to-child branch in one submission (e.g. Subsystem → Equipment → Component → Instrument Loop).'}
                </p>
              </div>

              {/* Branch Steps Stack */}
              <div className="space-y-3">
                {branchSteps.map((step, idx) => (
                  <div 
                    key={step.id} 
                    className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/80 shadow-xs relative"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="w-5 h-5 rounded-full bg-indigo-600 text-white font-mono font-bold text-[10px] flex items-center justify-center">
                          {idx + 1}
                        </span>
                        <span className="font-bold text-slate-800 dark:text-slate-100 text-xs">
                          Level {step.level}: {getLevelLabel(step.level, step.levelType)}
                        </span>
                      </div>

                      {branchSteps.length > 1 && (
                        <button
                          type="button"
                          onClick={() => {
                            setBranchSteps(prev => prev.filter(s => s.id !== step.id));
                          }}
                          className="text-red-500 hover:text-red-700 p-1 rounded hover:bg-red-50 dark:hover:bg-red-950/40 text-xs cursor-pointer"
                          title="Remove level step"
                        >
                          <Trash2 size={13} />
                        </button>
                      )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                      <div className="sm:col-span-1">
                        <label className="text-[10px] font-bold text-slate-500 block mb-0.5">Tag / ID *</label>
                        <Input
                          value={step.tag}
                          onChange={(e) => {
                            const val = e.target.value;
                            setBranchSteps(prev => prev.map(s => s.id === step.id ? { ...s, tag: val, name: val } : s));
                          }}
                          placeholder={`e.g. ${idx === 0 ? 'SYS-11-L01' : idx === 1 ? 'P-101A' : 'MTR-101'}`}
                          required
                          className="font-mono text-xs"
                        />
                      </div>

                      <div className="sm:col-span-1">
                        <label className="text-[10px] font-bold text-slate-500 block mb-0.5">Ref Code</label>
                        <Input
                          value={step.refCode}
                          onChange={(e) => {
                            const val = e.target.value;
                            setBranchSteps(prev => prev.map(s => s.id === step.id ? { ...s, refCode: val } : s));
                          }}
                          placeholder="e.g. 10-02"
                          className="font-mono text-xs"
                        />
                      </div>

                      <div className="sm:col-span-1">
                        <label className="text-[10px] font-bold text-slate-500 block mb-0.5">Scope Highlight</label>
                        <select
                          value={step.highlight}
                          onChange={(e) => {
                            const val = e.target.value as RowHighlightType;
                            setBranchSteps(prev => prev.map(s => s.id === step.id ? { ...s, highlight: val } : s));
                          }}
                          className="w-full text-xs p-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800"
                        >
                          <option value="none">Standard Base</option>
                          <option value="EWR">EWR (Yellow)</option>
                          <option value="Project">Project (Green)</option>
                        </select>
                      </div>
                    </div>

                    <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-100 dark:border-slate-700/60">
                      <Input
                        value={step.description}
                        onChange={(e) => {
                          const val = e.target.value;
                          setBranchSteps(prev => prev.map(s => s.id === step.id ? { ...s, description: val } : s));
                        }}
                        placeholder="Description (e.g. High Pressure Lube Circulation Pump)"
                        className="text-xs max-w-md"
                      />

                      <label className="flex items-center gap-1.5 text-[11px] text-slate-600 dark:text-slate-300 cursor-pointer font-bold shrink-0 ml-2">
                        <input
                          type="checkbox"
                          checked={step.isCriticalPath}
                          onChange={(e) => {
                            const val = e.target.checked;
                            setBranchSteps(prev => prev.map(s => s.id === step.id ? { ...s, isCriticalPath: val } : s));
                          }}
                          className="rounded text-red-600"
                        />
                        <span className="text-red-600">* Critical</span>
                      </label>
                    </div>
                  </div>
                ))}
              </div>

              {/* Add Next Level Step Button */}
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  const lastStep = branchSteps[branchSteps.length - 1];
                  const nextLvl = lastStep ? lastStep.level + 1 : 2;
                  setBranchSteps(prev => [
                    ...prev,
                    {
                      id: `step-${Date.now()}`,
                      level: nextLvl,
                      levelType: getDefaultTypeForLevel(nextLvl),
                      name: '',
                      tag: '',
                      refCode: '',
                      highlight: 'none',
                      isCriticalPath: false,
                      description: ''
                    }
                  ]);
                }}
                className="w-full border-dashed border-indigo-300 dark:border-indigo-800 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 text-xs font-bold gap-1.5 py-2 cursor-pointer"
              >
                <Plus size={14} />
                <span>+ Add Deeper Level (L{branchSteps.length > 0 ? branchSteps[branchSteps.length - 1].level + 1 : 2})</span>
              </Button>
            </form>
          )}

          {/* ===================== MODE 3: BATCH SIBLING ITEMS ===================== */}
          {mode === 'batch' && (
            <form id="batch-level-form" onSubmit={handleSaveBatch} className="space-y-4">
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                <div className="font-bold text-slate-800 dark:text-slate-100 text-xs mb-1.5 flex items-center justify-between">
                  <span>Fast Series Generator</span>
                  <span className="text-[10px] text-slate-400 font-normal">Auto-populate tags</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <div>
                    <label className="text-[10px] text-slate-500 font-bold block mb-0.5">Prefix</label>
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
                      placeholder="101"
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
                  <div>
                    <label className="text-[10px] text-slate-500 font-bold block mb-0.5">Suffix</label>
                    <Input
                      value={seriesSuffix}
                      onChange={(e) => setSeriesSuffix(e.target.value)}
                      placeholder="e.g. A"
                      className="font-mono text-xs"
                    />
                  </div>
                </div>
                <div className="mt-2 flex justify-end">
                  <Button
                    type="button"
                    size="sm"
                    onClick={handleGenerateSeries}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold gap-1 cursor-pointer py-1"
                  >
                    <Sparkles size={12} />
                    <span>Generate into List</span>
                  </Button>
                </div>
              </div>

              {/* Textarea for Tags */}
              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Tag List (One item per line, or comma-separated) *
                </label>
                <textarea
                  value={batchTagsText}
                  onChange={(e) => setBatchTagsText(e.target.value)}
                  placeholder={`P-101A [Critical] [EWR]\nP-101B\nP-102A [Project]\nP-102B`}
                  rows={5}
                  className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-mono text-xs focus:ring-2 focus:ring-indigo-500"
                />
                <span className="text-[10px] text-slate-400 mt-1 block">
                  Tip: Append `*` or `[Critical]` for critical path, or `[EWR]`, `[Project]` for color highlighting.
                </span>
              </div>

              {/* Shared Properties */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    Classification / Level Type
                  </label>
                  <Select
                    value={batchLevelType}
                    onChange={(e) => setBatchLevelType(e.target.value as NodeLevelType)}
                    options={[
                      { value: 'equipment', label: 'Equipment / Machine Skid' },
                      { value: 'subsystem', label: 'Sub-System / Circuit' },
                      { value: 'component', label: 'Component / Part' },
                      { value: 'instrument', label: 'Instrument / Valve / Loop' },
                      { value: 'custom', label: 'Custom Depth Level' },
                    ]}
                    className="text-xs"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    Default Work Scope
                  </label>
                  <Select
                    value={batchHighlight}
                    onChange={(e) => setBatchHighlight(e.target.value as RowHighlightType)}
                    options={[
                      { value: 'none', label: 'Standard White / Base' },
                      { value: 'EWR', label: 'EWR Scope (Yellow)' },
                      { value: 'Project', label: 'Project Tie-in (Green)' },
                    ]}
                    className="text-xs"
                  />
                </div>
              </div>
            </form>
          )}
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

          {mode === 'single' && (
            <Button
              type="submit"
              form="single-level-form"
              size="sm"
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold gap-1.5 text-xs cursor-pointer shadow-md"
            >
              <Plus size={14} />
              <span>Create Level {singleLevel} ({getLevelLabel(singleLevel, singleLevelType)})</span>
            </Button>
          )}

          {mode === 'branch' && (
            <Button
              type="submit"
              form="branch-level-form"
              size="sm"
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold gap-1.5 text-xs cursor-pointer shadow-md"
            >
              <GitBranch size={14} />
              <span>Create {branchSteps.length}-Level Branch</span>
            </Button>
          )}

          {mode === 'batch' && (
            <Button
              type="submit"
              form="batch-level-form"
              size="sm"
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold gap-1.5 text-xs cursor-pointer shadow-md"
            >
              <ListPlus size={14} />
              <span>Insert Batch Items</span>
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
