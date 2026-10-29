import React, { useState, useMemo, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Select } from './ui/select';
import { 
  Network, Search, Filter, Layers, CheckCircle2, 
  ChevronRight, ChevronDown, Download, 
  Printer, Sparkles, FolderTree, Minimize2, Maximize2, 
  Compass, Flame, Cpu, GitBranch, Plus, 
  PlusCircle, FolderPlus, Trash2, Check, FileSpreadsheet, Eye, Activity,
  Folder, FolderOpen, Box, Tag, FileText, ExternalLink, ShieldCheck,
  Building2, Hash, AlertOctagon, RefreshCw, Table as TableIcon,
  LayoutList, Workflow, Info, CornerDownRight, GitCommit, Split, MapPin
} from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { 
  S2_TURNOVER_HIERARCHY, 
  UnitRecord, 
  SystemRecord, 
  EquipmentRecord, 
  RowHighlightType 
} from '../data/s2FunctionalLocationData';
import { 
  MappedLocationMarker, 
  getStoredMappedMarkers, 
  deleteStoredMarker,
  PLOT_PLAN_UPDATED_EVENT 
} from '../data/plotPlanMappingData';
import AddLevelModal from './functional-location/AddLevelModal';
import BulkInsertModal from './functional-location/BulkInsertModal';
import AddPlotPlanMappingModal from './functional-location/AddPlotPlanMappingModal';
import FunctionalLocationPlotPlanView from './functional-location/FunctionalLocationPlotPlanView';
import essoPlotPlanBg from '../assets/esso_sriracha_master_plotplan.jpg';
import { useThemeGate } from '../utils/themeGate';
import FlocSettingsTab from './Settings/FlocSettingsTab';
import PlantFacilityMapView from './Settings/PlantFacilityMapView';
import { 
  FunctionalLocation as FlocItem, 
  getStoredFlocData, 
  saveFlocData, 
  PLANT_REGISTRY 
} from '../data/flocMasterData';

export type NodeLevelType = 
  | 'unit'         // Level 1: Plant Area / Unit
  | 'system'       // Level 2: Main Process System
  | 'subsystem'    // Level 3: Sub-System / Process Circuit / Loop
  | 'equipment'    // Level 4: Equipment / Machine / Skid
  | 'component'    // Level 5: Sub-Equipment / Component / Part
  | 'instrument'   // Level 6: Instrument / Spool / Valve
  | 'custom';      // Level 7+: Custom Sub-level

export interface HierarchyTreeNode {
  id: string;
  level: number; // 1, 2, 3, 4, 5, 6+
  levelType: NodeLevelType;
  name: string;
  tag?: string;
  refCode?: string;
  fullName?: string;
  description?: string;
  highlight?: RowHighlightType;
  isCriticalPath?: boolean;
  status?: string;
  children: HierarchyTreeNode[];
  parentId?: string;
}

interface FunctionalLocationProps {
  onSelectEquipment?: (equipment: EquipmentRecord, system: SystemRecord, unit: UnitRecord) => void;
  onOpenActivityLog?: () => void;
  onNavigateToMasterPlotPlan?: (nodeId?: string) => void;
  initialSelectedNodeId?: string;
}

// Convert legacy seed hierarchy into a recursive multi-level tree
function buildInitialTree(units: UnitRecord[]): HierarchyTreeNode[] {
  return units.map((u) => {
    const unitNode: HierarchyTreeNode = {
      id: u.id,
      level: 1,
      levelType: 'unit',
      name: u.name,
      fullName: u.fullName,
      description: u.fullName,
      children: u.systems.map((s) => {
        const sysNode: HierarchyTreeNode = {
          id: s.id,
          level: 2,
          levelType: 'system',
          name: s.name,
          description: s.description || 'Process System Boundary',
          parentId: u.id,
          children: s.equipment.map((eq, eqIdx) => {
            const mapEquipmentToNode = (item: EquipmentRecord, parentNodeId: string, currentLevel: number): HierarchyTreeNode => {
              const eqId = `${parentNodeId}-eq-${item.tag.replace(/[^a-zA-Z0-9]/g, '_')}-${eqIdx}`;
              const levelType: NodeLevelType = currentLevel === 3 ? 'equipment' : currentLevel === 4 ? 'component' : 'instrument';
              return {
                id: eqId,
                level: currentLevel,
                levelType,
                name: item.tag,
                tag: item.tag,
                refCode: item.refCode,
                description: item.description,
                highlight: item.highlight || 'none',
                isCriticalPath: !!item.isCriticalPath,
                status: item.status || 'Ready for Turnover',
                parentId: parentNodeId,
                children: (item.children || []).map((ch, chIdx) => 
                  mapEquipmentToNode(ch, eqId, currentLevel + 1)
                )
              };
            };
            return mapEquipmentToNode(eq, s.id, 3);
          })
        };
        return sysNode;
      })
    };
    return unitNode;
  });
}

export default function FunctionalLocation({ 
  onSelectEquipment, 
  onOpenActivityLog, 
  onNavigateToMasterPlotPlan,
  initialSelectedNodeId 
}: FunctionalLocationProps) {
  const { language } = useLanguage();
  const isTh = language === 'th';

  // =========================================================================
  // ENTERPRISE 2-TAB MODULE: FLOC HIERARCHY & CAD PLOT PLAN SYSTEM
  // =========================================================================
  const [activeTab, setActiveTab] = useState<'floc' | 'map'>('floc');
  const [flocList, setFlocList] = useState<FlocItem[]>(() => getStoredFlocData());
  const [selectedFlocId, setSelectedFlocId] = useState<string | undefined>(initialSelectedNodeId);
  const [showLegacyView, setShowLegacyView] = useState(false);
  const isGlobalDark = useThemeGate();

  useEffect(() => {
    if (initialSelectedNodeId) {
      setSelectedFlocId(initialSelectedNodeId);
      const target = flocList.find(f => f.id === initialSelectedNodeId || f.equipmentTag === initialSelectedNodeId);
      if (target && target.xPercent !== undefined) {
        setActiveTab('map');
      }
    }
  }, [initialSelectedNodeId, flocList]);

  const handleAddFloc = (newFloc: FlocItem) => {
    const updated = [...flocList, newFloc];
    setFlocList(updated);
    saveFlocData(updated);
  };

  const handleUpdateFloc = (updatedFloc: FlocItem) => {
    const updated = flocList.map(f => f.id === updatedFloc.id ? updatedFloc : f);
    setFlocList(updated);
    saveFlocData(updated);
  };

  const handleDeleteFloc = (id: string) => {
    const toDelete = new Set<string>([id]);
    let added = true;
    while (added) {
      added = false;
      for (const f of flocList) {
        if (f.parentId && toDelete.has(f.parentId) && !toDelete.has(f.id)) {
          toDelete.add(f.id);
          added = true;
        }
      }
    }
    const updated = flocList.filter(f => !toDelete.has(f.id));
    setFlocList(updated);
    saveFlocData(updated);
  };

  const handleExportSystemBackup = () => {
    const backupData = {
      system: "PlantTurn Enterprise System",
      module: "Settings & Functional Location Configuration",
      version: "2.5.0",
      exportDate: new Date().toISOString(),
      supportedPlants: PLANT_REGISTRY,
      telemetry: {
        totalPlants: Object.keys(PLANT_REGISTRY).length,
        totalFlocNodes: flocList.length,
        activeUsers: 18,
        totalUsers: 24
      },
      functionalLocations: flocList
    };
    const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `PlantTurn_System_Config_Backup_${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Recursive Multi-Level Hierarchy Tree State
  const [treeData, setTreeData] = useState<HierarchyTreeNode[]>(() => buildInitialTree(S2_TURNOVER_HIERARCHY));

  // Navigation & Search State
  const [searchQuery, setSearchQuery] = useState('');
  const [filterHighlight, setFilterHighlight] = useState<string>('All');
  const [filterCriticalOnly, setFilterCriticalOnly] = useState(false);
  const [viewMode, setViewMode] = useState<'tree' | 'tree-table' | 'diagram' | 'plot-map'>('tree');
  const [isLegendOpen, setIsLegendOpen] = useState(false);

  // Plot Plan Mapped Markers State
  const [markers, setMarkers] = useState<MappedLocationMarker[]>(() => getStoredMappedMarkers());
  const [isAddPlotMappingModalOpen, setIsAddPlotMappingModalOpen] = useState(false);
  const [plotMappingTargetNode, setPlotMappingTargetNode] = useState<HierarchyTreeNode | null>(null);
  const [plotMappingExistingMarker, setPlotMappingExistingMarker] = useState<MappedLocationMarker | null>(null);

  // Sync markers with storage events
  useEffect(() => {
    const handleUpdate = () => {
      setMarkers(getStoredMappedMarkers());
    };
    window.addEventListener(PLOT_PLAN_UPDATED_EVENT, handleUpdate);
    window.addEventListener('storage', handleUpdate);
    return () => {
      window.removeEventListener(PLOT_PLAN_UPDATED_EVENT, handleUpdate);
      window.removeEventListener('storage', handleUpdate);
    };
  }, []);

  // Expanded Tree Node IDs (Supports any depth)
  const [expandedNodeIds, setExpandedNodeIds] = useState<string[]>([
    'unit-aps1', 
    'sys-11', 
    'unit-khf1', 
    'sys-24'
  ]);

  // Selected Node for the Right-Side Inspector
  const [selectedNodeId, setSelectedNodeId] = useState<string>(() => initialSelectedNodeId || 'unit-aps1');

  useEffect(() => {
    if (initialSelectedNodeId) {
      setSelectedNodeId(initialSelectedNodeId);
      const ancestors = findAncestors(treeData, initialSelectedNodeId);
      if (ancestors && ancestors.length > 0) {
        setExpandedNodeIds(prev => Array.from(new Set([...prev, ...ancestors.map(a => a.id)])));
      }
    }
  }, [initialSelectedNodeId, treeData]);

  // Helper to check if a node has a mapped plot plan pin
  const getNodePlotPlanMarker = (nodeId: string): MappedLocationMarker | null => {
    return markers.find(m => m.nodeId === nodeId) || null;
  };

  // Open Add / Edit Plot Plan Mapping Modal
  const openAddPlotMappingModal = (node?: HierarchyTreeNode | null, existing?: MappedLocationMarker | null) => {
    const target = node || selectedNode || null;
    const marker = existing || (target ? getNodePlotPlanMarker(target.id) : null);
    setPlotMappingTargetNode(target);
    setPlotMappingExistingMarker(marker);
    setIsAddPlotMappingModalOpen(true);
  };

  // Flattened nodes list for search selector
  const allNodesFlat = useMemo(() => {
    const list: HierarchyTreeNode[] = [];
    const traverse = (nodes: HierarchyTreeNode[]) => {
      nodes.forEach(n => {
        list.push(n);
        if (n.children && n.children.length > 0) traverse(n.children);
      });
    };
    traverse(treeData);
    return list;
  }, [treeData]);

  // Success / Status Toast Notification
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'info' | 'error' } | null>(null);

  // Modal State for "+ Add Level / Multi-Level Branch" and "Bulk Insert"
  const [isAddLevelModalOpen, setIsAddLevelModalOpen] = useState(false);
  const [targetParentNode, setTargetParentNode] = useState<HierarchyTreeNode | null>(null);
  const [isBulkInsertModalOpen, setIsBulkInsertModalOpen] = useState(false);

  const showToast = (message: string, type: 'success' | 'info' | 'error' = 'success') => {
    setNotification({ message, type });
    setTimeout(() => {
      setNotification(null);
    }, 4500);
  };

  // Find a node by ID in the tree recursively
  const findNodeById = (nodes: HierarchyTreeNode[], id: string): HierarchyTreeNode | null => {
    for (const node of nodes) {
      if (node.id === id) return node;
      if (node.children && node.children.length > 0) {
        const found = findNodeById(node.children, id);
        if (found) return found;
      }
    }
    return null;
  };

  // Find node path (ancestor chain)
  const findAncestors = (nodes: HierarchyTreeNode[], targetId: string, currentPath: HierarchyTreeNode[] = []): HierarchyTreeNode[] | null => {
    for (const node of nodes) {
      if (node.id === targetId) return [...currentPath, node];
      if (node.children && node.children.length > 0) {
        const found = findAncestors(node.children, targetId, [...currentPath, node]);
        if (found) return found;
      }
    }
    return null;
  };

  const selectedNode = useMemo(() => {
    return findNodeById(treeData, selectedNodeId) || treeData[0];
  }, [treeData, selectedNodeId]);

  const selectedNodeAncestors = useMemo(() => {
    if (!selectedNode) return [];
    return findAncestors(treeData, selectedNode.id) || [selectedNode];
  }, [treeData, selectedNode]);

  // Toggle node expansion
  const toggleNodeExpand = (nodeId: string) => {
    setExpandedNodeIds(prev => 
      prev.includes(nodeId) ? prev.filter(id => id !== nodeId) : [...prev, nodeId]
    );
  };

  // Collect all node IDs recursively
  const getAllNodeIds = (nodes: HierarchyTreeNode[]): string[] => {
    const ids: string[] = [];
    nodes.forEach(n => {
      ids.push(n.id);
      if (n.children && n.children.length > 0) {
        ids.push(...getAllNodeIds(n.children));
      }
    });
    return ids;
  };

  // Expand / Collapse all helper
  const handleExpandAll = () => {
    setExpandedNodeIds(getAllNodeIds(treeData));
  };

  const handleCollapseAll = () => {
    setExpandedNodeIds([]);
  };

  // Open modal to add child node or branch under any level or at root
  const openAddLevelModal = (parentNode: HierarchyTreeNode | null = null) => {
    setTargetParentNode(parentNode);
    setIsAddLevelModalOpen(true);
  };

  // Submit Handler: Add Single Node
  const handleAddSingleNode = (newNode: HierarchyTreeNode, parentId?: string) => {
    if (!parentId || parentId === 'root') {
      setTreeData(prev => [...prev, newNode]);
      setSelectedNodeId(newNode.id);
      setExpandedNodeIds(prev => Array.from(new Set([...prev, newNode.id])));
      showToast(isTh ? `สร้างระดับ ${newNode.level} "${newNode.name}" สำเร็จ!` : `Created new Level ${newNode.level} "${newNode.name}"!`, 'success');
      return;
    }

    const attachRec = (nodes: HierarchyTreeNode[]): HierarchyTreeNode[] => {
      return nodes.map(n => {
        if (n.id === parentId) {
          return {
            ...n,
            children: [...(n.children || []), newNode]
          };
        }
        if (n.children && n.children.length > 0) {
          return {
            ...n,
            children: attachRec(n.children)
          };
        }
        return n;
      });
    };

    setTreeData(prev => attachRec(prev));
    setSelectedNodeId(newNode.id);
    setExpandedNodeIds(prev => Array.from(new Set([...prev, parentId, newNode.id])));
    showToast(isTh ? `สร้างระดับ ${newNode.level} (${getLevelLabel(newNode.level, newNode.levelType)}) เรียบร้อย!` : `Created Level ${newNode.level} (${getLevelLabel(newNode.level, newNode.levelType)})!`, 'success');
  };

  // Submit Handler: Add Multi-Level Branch
  const handleAddBranch = (branchNodes: HierarchyTreeNode[], parentId?: string) => {
    const collectIds = (nodes: HierarchyTreeNode[], list: string[] = []) => {
      nodes.forEach(n => {
        list.push(n.id);
        if (n.children && n.children.length > 0) collectIds(n.children, list);
      });
      return list;
    };
    const allBranchIds = collectIds(branchNodes);

    if (!parentId || parentId === 'root') {
      setTreeData(prev => [...prev, ...branchNodes]);
      setExpandedNodeIds(prev => Array.from(new Set([...prev, ...allBranchIds])));
      if (branchNodes.length > 0) setSelectedNodeId(branchNodes[0].id);
      showToast(isTh ? `สร้างสายสาขาย่อย ${allBranchIds.length} ระดับสำเร็จ!` : `Created multi-level branch (${allBranchIds.length} levels deep)!`, 'success');
      return;
    }

    const attachRec = (nodes: HierarchyTreeNode[]): HierarchyTreeNode[] => {
      return nodes.map(n => {
        if (n.id === parentId) {
          return {
            ...n,
            children: [...(n.children || []), ...branchNodes]
          };
        }
        if (n.children && n.children.length > 0) {
          return {
            ...n,
            children: attachRec(n.children)
          };
        }
        return n;
      });
    };

    setTreeData(prev => attachRec(prev));
    setExpandedNodeIds(prev => Array.from(new Set([...prev, parentId, ...allBranchIds])));
    if (branchNodes.length > 0) setSelectedNodeId(branchNodes[0].id);
    showToast(isTh ? `สร้างสายสาขาย่อย ${allBranchIds.length} ระดับเรียบร้อย!` : `Created multi-level branch (${allBranchIds.length} levels deep)!`, 'success');
  };

  // Submit Handler: Add Batch Siblings at Current Level
  const handleAddBatchSiblings = (siblingNodes: HierarchyTreeNode[], parentId?: string) => {
    const ids = siblingNodes.map(s => s.id);

    if (!parentId || parentId === 'root') {
      setTreeData(prev => [...prev, ...siblingNodes]);
      setExpandedNodeIds(prev => Array.from(new Set([...prev, ...ids])));
      if (siblingNodes.length > 0) setSelectedNodeId(siblingNodes[0].id);
      showToast(isTh ? `เพิ่มรายการแบบกลุ่ม ${siblingNodes.length} รายการที่ระดับหลักสำเร็จ!` : `Added ${siblingNodes.length} batch items at root level!`, 'success');
      return;
    }

    const attachRec = (nodes: HierarchyTreeNode[]): HierarchyTreeNode[] => {
      return nodes.map(n => {
        if (n.id === parentId) {
          return {
            ...n,
            children: [...(n.children || []), ...siblingNodes]
          };
        }
        if (n.children && n.children.length > 0) {
          return {
            ...n,
            children: attachRec(n.children)
          };
        }
        return n;
      });
    };

    setTreeData(prev => attachRec(prev));
    setExpandedNodeIds(prev => Array.from(new Set([...prev, parentId, ...ids])));
    if (siblingNodes.length > 0) setSelectedNodeId(siblingNodes[0].id);
    showToast(isTh ? `เพิ่มรายการแบบกลุ่ม ${siblingNodes.length} รายการสำเร็จ!` : `Batch added ${siblingNodes.length} items to level!`, 'success');
  };

  // Submit Handler: Bulk Insert Hierarchy
  const handleCommitBulkInsert = (nodesToInsert: HierarchyTreeNode[], mergeWithExisting: boolean) => {
    const newExpandedIds: string[] = [];
    const collectIds = (nodes: HierarchyTreeNode[]) => {
      nodes.forEach(n => {
        newExpandedIds.push(n.id);
        if (n.children && n.children.length > 0) collectIds(n.children);
      });
    };
    collectIds(nodesToInsert);

    if (!mergeWithExisting) {
      setTreeData(prev => [...prev, ...nodesToInsert]);
      setExpandedNodeIds(prev => Array.from(new Set([...prev, ...newExpandedIds])));
      if (nodesToInsert.length > 0) setSelectedNodeId(nodesToInsert[0].id);
      showToast(isTh ? `นำเข้าโครงสร้างตำแหน่ง ${nodesToInsert.length} กลุ่มสำเร็จ!` : `Bulk inserted ${nodesToInsert.length} hierarchy trees!`, 'success');
      return;
    }

    const mergeNodesRec = (existingList: HierarchyTreeNode[], incomingList: HierarchyTreeNode[]): HierarchyTreeNode[] => {
      const result = [...existingList];

      incomingList.forEach(incoming => {
        const matchIdx = result.findIndex(
          ex => ex.name.toLowerCase() === incoming.name.toLowerCase() ||
                (ex.tag && incoming.tag && ex.tag.toLowerCase() === incoming.tag.toLowerCase())
        );

        if (matchIdx !== -1) {
          const existing = result[matchIdx];
          const mergedChildren = mergeNodesRec(existing.children || [], incoming.children || []);
          result[matchIdx] = {
            ...existing,
            children: mergedChildren,
            highlight: incoming.highlight !== 'none' ? incoming.highlight : existing.highlight,
            isCriticalPath: incoming.isCriticalPath || existing.isCriticalPath,
            description: incoming.description || existing.description
          };
          newExpandedIds.push(existing.id);
        } else {
          result.push(incoming);
        }
      });

      return result;
    };

    setTreeData(prev => mergeNodesRec(prev, nodesToInsert));
    setExpandedNodeIds(prev => Array.from(new Set([...prev, ...newExpandedIds])));
    if (nodesToInsert.length > 0) {
      setSelectedNodeId(nodesToInsert[0].id);
    }
    showToast(isTh ? `ผสานและนำเข้าโครงสร้างตำแหน่ง ${newExpandedIds.length} รายการสำเร็จ!` : `Successfully merged and bulk inserted hierarchy into Tree View!`, 'success');
  };

  // Delete node recursively
  const handleDeleteNode = (nodeId: string, nodeName: string) => {
    if (!confirm(`Are you sure you want to delete "${nodeName}" and all of its child levels?`)) return;

    const deleteRecursively = (nodes: HierarchyTreeNode[]): HierarchyTreeNode[] => {
      return nodes
        .filter(n => n.id !== nodeId)
        .map(n => ({
          ...n,
          children: deleteRecursively(n.children)
        }));
    };

    setTreeData(prev => deleteRecursively(prev));
    setSelectedNodeId('unit-aps1');
    showToast(`Deleted level "${nodeName}" and its sub-tree`, 'info');
  };

  // Toggle critical path for selected node
  const handleToggleCritical = (nodeId: string) => {
    const toggleRecursively = (nodes: HierarchyTreeNode[]): HierarchyTreeNode[] => {
      return nodes.map(node => {
        if (node.id === nodeId) {
          const updated = !node.isCriticalPath;
          showToast(`${node.name} Critical Path (*): ${updated ? 'MARKED (*)' : 'REMOVED'}`, 'info');
          return { ...node, isCriticalPath: updated };
        }
        if (node.children && node.children.length > 0) {
          return { ...node, children: toggleRecursively(node.children) };
        }
        return node;
      });
    };

    setTreeData(prev => toggleRecursively(prev));
  };

  // Recursive filter predicate
  const filterNode = (node: HierarchyTreeNode, q: string): HierarchyTreeNode | null => {
    const matchName = !q || node.name.toLowerCase().includes(q);
    const matchTag = !q || (node.tag && node.tag.toLowerCase().includes(q));
    const matchRef = !q || (node.refCode && node.refCode.toLowerCase().includes(q));
    const matchDesc = !q || (node.description && node.description.toLowerCase().includes(q));
    const matchesSearch = matchName || matchTag || matchRef || matchDesc;

    const matchesHighlight = filterHighlight === 'All' || node.highlight === filterHighlight;
    const matchesCritical = !filterCriticalOnly || !!node.isCriticalPath;

    const isSelfMatch = matchesSearch && matchesHighlight && matchesCritical;

    // Filter children
    const filteredChildren = (node.children || [])
      .map(child => filterNode(child, q))
      .filter((ch): ch is HierarchyTreeNode => ch !== null);

    if (isSelfMatch || filteredChildren.length > 0) {
      return {
        ...node,
        children: filteredChildren
      };
    }

    return null;
  };

  // Filtered tree
  const filteredTree = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return treeData
      .map(node => filterNode(node, q))
      .filter((n): n is HierarchyTreeNode => n !== null);
  }, [treeData, searchQuery, filterHighlight, filterCriticalOnly]);

  // Statistics calculation across all levels
  const stats = useMemo(() => {
    let units = 0;
    let systems = 0;
    let equipment = 0;
    let components = 0;
    let ewr = 0;
    let projects = 0;
    let critical = 0;
    let totalNodes = 0;

    const traverse = (nodes: HierarchyTreeNode[]) => {
      nodes.forEach(n => {
        totalNodes++;
        if (n.level === 1) units++;
        else if (n.level === 2) systems++;
        else if (n.level === 3 || n.level === 4) equipment++;
        else components++;

        if (n.highlight === 'EWR') ewr++;
        if (n.highlight === 'Project') projects++;
        if (n.isCriticalPath) critical++;

        if (n.children && n.children.length > 0) {
          traverse(n.children);
        }
      });
    };

    traverse(treeData);
    return { units, systems, equipment, components, ewr, projects, critical, totalNodes };
  }, [treeData]);

  // Helper for human-readable level titles
  function getLevelLabel(level: number, type?: NodeLevelType): string {
    if (level === 1) return 'Unit / Area';
    if (level === 2) return 'Process System';
    if (level === 3) return 'Sub-System / Circuit';
    if (level === 4) return 'Equipment / Package';
    if (level === 5) return 'Sub-Equipment / Component';
    if (level >= 6) return 'Instrument / Spool / Loop';
    return `Level ${level}`;
  }

  // Get color badge per level
  const getLevelBadge = (level: number, type?: NodeLevelType) => {
    if (level === 1) {
      return <span className="text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded bg-emerald-800 text-emerald-100">L1 Unit</span>;
    }
    if (level === 2) {
      return <span className="text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded bg-amber-800 text-amber-100">L2 System</span>;
    }
    if (level === 3) {
      return <span className="text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded bg-orange-700 text-orange-100">L3 Sub-Sys</span>;
    }
    if (level === 4) {
      return <span className="text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded bg-indigo-700 text-indigo-100">L4 Equip</span>;
    }
    if (level === 5) {
      return <span className="text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded bg-teal-700 text-teal-100">L5 Comp</span>;
    }
    return <span className="text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded bg-purple-700 text-purple-100">L{level} Tag</span>;
  };

  // Helper for equipment icon
  const getNodeIcon = (node: HierarchyTreeNode) => {
    if (node.level === 1) return <Layers size={14} className="text-white shrink-0" />;
    if (node.level === 2) return <GitBranch size={13} className="text-white shrink-0" />;
    if (node.level === 3) return <Split size={13} className="text-amber-300 shrink-0" />;
    
    const t = node.name.toUpperCase();
    if (t.includes('DR') || t.includes('VESSEL') || t.includes('V-')) return <Box size={14} className="text-blue-500 shrink-0" />;
    if (t.includes('PIP') || t.includes('SPOOL') || t.includes('SUP')) return <Workflow size={14} className="text-amber-500 shrink-0" />;
    if (t.includes('P-') || t.includes('PUMP')) return <Cpu size={14} className="text-emerald-500 shrink-0" />;
    if (t.includes('HX') || t.includes('E-') || t.includes('EXCHANGER') || t.includes('FUR')) return <Flame size={14} className="text-orange-500 shrink-0" />;
    if (t.includes('IN-') || t.includes('PCV') || t.includes('FCV') || t.includes('VALVE') || t.includes('PT-')) return <Tag size={14} className="text-purple-500 shrink-0" />;
    return <Box size={13} className="text-slate-400 shrink-0" />;
  };

  // Recursive Tree Node Renderer for Tree Explorer
  const renderTreeNode = (node: HierarchyTreeNode, depth: number = 0) => {
    const isExpanded = expandedNodeIds.includes(node.id);
    const isSelected = selectedNode?.id === node.id;
    const hasChildren = node.children && node.children.length > 0;

    // Visual styles strictly matching reference rules for Level 1 (Green), Level 2 (Orange), and Highlights
    let containerStyle = 'bg-white dark:bg-slate-800/90 text-slate-800 dark:text-slate-200 border-slate-200 dark:border-slate-700 hover:border-slate-400';
    let textStyle = 'text-slate-900 dark:text-slate-100';

    if (node.level === 1) {
      // Level 1: Green Background (#008b52), Bold White Font per reference
      containerStyle = 'bg-[#008b52] hover:bg-[#007b48] text-white border-[#006e41] shadow-xs';
      textStyle = 'text-white font-black tracking-wider uppercase font-mono text-sm';
    } else if (node.level === 2) {
      // Level 2: Vibrant Orange Header (#ff6800) per reference
      containerStyle = 'bg-[#ff6800] hover:bg-[#f26300] text-slate-950 border-[#e65c00] shadow-xs';
      textStyle = 'text-white font-black tracking-wide font-mono text-xs drop-shadow-xs';
    } else if (node.level === 3 && node.children.length > 0) {
      // Level 3 with children: Rich Amber / Circuit header
      containerStyle = 'bg-amber-600 hover:bg-amber-700 text-white border-amber-700 shadow-xs';
      textStyle = 'text-white font-bold font-mono text-xs';
    } else {
      // Leaf / Component levels: Apply EWR / Project highlights
      if (node.highlight === 'EWR') {
        containerStyle = 'bg-yellow-100/90 dark:bg-yellow-950/40 text-yellow-950 dark:text-yellow-100 border-yellow-300 dark:border-yellow-700/60 font-semibold';
      } else if (node.highlight === 'Project') {
        containerStyle = 'bg-emerald-100/90 dark:bg-emerald-950/40 text-emerald-950 dark:text-emerald-100 border-emerald-300 dark:border-emerald-700/60 font-semibold';
      }
    }

    return (
      <div key={node.id} className="relative select-none">
        {/* Horizontal branch elbow line connecting to parent's vertical guide line */}
        {depth > 0 && (
          <div className="absolute -left-3 sm:-left-3.5 top-4 w-3 sm:w-3.5 h-0.5 bg-slate-300 dark:bg-slate-700 pointer-events-none" />
        )}

        {/* Node Card Row */}
        <div
          onClick={() => {
            setSelectedNodeId(node.id);
            // Legacy callback support if equipment
            if (node.level >= 3 && onSelectEquipment) {
              const rootUnit = treeData.find(u => u.id === node.parentId || node.id.startsWith(u.id));
              const dummyUnit: UnitRecord = { id: rootUnit?.id || 'u', name: rootUnit?.name || 'Unit', fullName: rootUnit?.fullName || '', systems: [] };
              const dummySys: SystemRecord = { id: 's', name: 'System', equipment: [] };
              const dummyEq: EquipmentRecord = { tag: node.tag || node.name, refCode: node.refCode || '', highlight: node.highlight || 'none', isCriticalPath: node.isCriticalPath };
              onSelectEquipment(dummyEq, dummySys, dummyUnit);
            }
          }}
          className={`group flex items-center justify-between p-2 sm:p-2.5 rounded-xl transition-colors cursor-pointer border text-xs ${containerStyle} ${
            isSelected ? 'ring-2 ring-indigo-500 shadow-sm border-indigo-500' : 'hover:shadow-xs'
          }`}
        >
          <div className="flex items-center gap-2 min-w-0 flex-1 truncate mr-2">
            {/* Expand / Collapse Toggle Button */}
            {hasChildren ? (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  toggleNodeExpand(node.id);
                }}
                className={`w-5 h-5 rounded flex items-center justify-center shrink-0 transition-transform cursor-pointer ${
                  node.level <= 2 ? 'bg-white/20 hover:bg-white/40 text-white' : 'bg-slate-200 dark:bg-slate-700 hover:bg-slate-300'
                }`}
                title={isExpanded ? 'Collapse' : 'Expand'}
              >
                <ChevronRight
                  size={13}
                  className={`transition-transform duration-200 ${isExpanded ? 'rotate-90' : ''}`}
                />
              </button>
            ) : (
              <div className="w-5 h-5 flex items-center justify-center shrink-0">
                <span className="w-1.5 h-1.5 rounded-full bg-slate-300 dark:bg-slate-600" />
              </div>
            )}

            {/* Icon & Level Badge */}
            {getNodeIcon(node)}
            {getLevelBadge(node.level, node.levelType)}

            {/* Tag / Name & Critical Flag */}
            <div className="min-w-0 flex-1 truncate">
              <span className={textStyle}>
                {node.name}
              </span>
              {node.isCriticalPath && (
                <span className="text-red-600 dark:text-red-400 font-black text-sm ml-1 shrink-0" title="Critical Path (*)">
                  *
                </span>
              )}
              {node.description && (
                <span className={`text-[10px] ml-1.5 truncate max-w-xs hidden sm:inline ${
                  node.level <= 2 ? 'text-white/80 font-medium' : 'text-slate-500 dark:text-slate-400'
                }`}>
                  • {node.description}
                </span>
              )}
            </div>
          </div>

          {/* Right-Side Badges & Actions */}
          <div className="flex items-center gap-1.5 shrink-0">
            {/* Plot Plan Mapped Badge */}
            {getNodePlotPlanMarker(node.id) ? (
              <span
                onClick={(e) => {
                  e.stopPropagation();
                  openAddPlotMappingModal(node, getNodePlotPlanMarker(node.id));
                }}
                className={`font-mono text-[9px] font-bold px-1.5 py-0.5 rounded flex items-center gap-0.5 cursor-pointer hover:scale-105 transition-transform ${
                  node.level <= 2 
                    ? 'bg-cyan-400 text-slate-950 font-black' 
                    : 'bg-cyan-50 dark:bg-cyan-950/60 text-cyan-700 dark:text-cyan-300 border border-cyan-300 dark:border-cyan-700'
                }`}
                title={`Mapped on Plot Plan: Zone ${getNodePlotPlanMarker(node.id)?.gridZone} (${getNodePlotPlanMarker(node.id)?.x}%, ${getNodePlotPlanMarker(node.id)?.y}%)`}
              >
                <MapPin size={9} />
                <span>{getNodePlotPlanMarker(node.id)?.gridZone}</span>
              </span>
            ) : null}

            {node.refCode && (
              <span className={`font-mono text-[10px] font-bold px-1.5 py-0.5 rounded ${
                node.level <= 2 
                  ? 'bg-black/20 text-white' 
                  : 'bg-slate-100 dark:bg-slate-700/60 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-600'
              }`}>
                {node.refCode}
              </span>
            )}

            {node.highlight && node.highlight !== 'none' && (
              <span className={`text-[9px] px-1.5 py-0.5 rounded font-black font-mono uppercase ${
                node.highlight === 'EWR' ? 'bg-yellow-300 text-yellow-950 border border-yellow-400' : 'bg-emerald-300 text-emerald-950 border border-emerald-400'
              }`}>
                {node.highlight}
              </span>
            )}

            {hasChildren && (
              <span className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded ${
                node.level === 1 ? 'bg-[#005a35] text-white' : node.level === 2 ? 'bg-[#ffe28a] text-[#421400]' : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
              }`}>
                {node.children.length}
              </span>
            )}

            {/* Quick Actions (Map, Add & Critical Path) */}
            <div className="flex items-center gap-1 opacity-70 group-hover:opacity-100 transition-opacity">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  openAddPlotMappingModal(node, getNodePlotPlanMarker(node.id));
                }}
                className={`p-1 px-1.5 rounded text-[10px] font-bold flex items-center gap-0.5 cursor-pointer transition-colors ${
                  node.level <= 2 
                    ? 'bg-white/20 hover:bg-white/30 text-white' 
                    : getNodePlotPlanMarker(node.id)
                    ? 'bg-cyan-100 dark:bg-cyan-950 text-cyan-700 dark:text-cyan-300 hover:bg-cyan-200'
                    : 'bg-slate-100 dark:bg-slate-700 hover:bg-cyan-50 dark:hover:bg-cyan-900/40 text-slate-600 dark:text-slate-300 hover:text-cyan-600'
                }`}
                title={`Map ${node.name} on Plot Plan`}
              >
                <MapPin size={11} />
                <span className="text-[9px] hidden lg:inline">
                  {getNodePlotPlanMarker(node.id) ? 'Remap' : 'Map'}
                </span>
              </button>

              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  openAddLevelModal(node);
                }}
                className={`p-1 px-1.5 rounded text-[10px] font-bold flex items-center gap-0.5 cursor-pointer transition-colors ${
                  node.level <= 2 
                    ? 'bg-white/20 hover:bg-white/30 text-white' 
                    : 'bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/60 dark:hover:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300'
                }`}
                title={`Add Child Level / Branch under ${node.name}`}
              >
                <Plus size={11} />
                <span className="text-[9px] hidden md:inline">Add</span>
              </button>

              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleToggleCritical(node.id);
                }}
                className={`p-1 px-1.5 rounded text-[10px] font-bold flex items-center gap-0.5 cursor-pointer transition-colors ${
                  node.isCriticalPath 
                    ? 'bg-red-500 text-white' 
                    : node.level <= 2 
                    ? 'bg-white/10 hover:bg-white/20 text-white' 
                    : 'hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-400'
                }`}
                title={node.isCriticalPath ? 'Unmark Critical Path (*)' : 'Mark as Critical Path (*)'}
              >
                <span>*</span>
              </button>
            </div>
          </div>
        </div>

        {/* Recursive Children Rendering with clean left tree guide border */}
        {hasChildren && isExpanded && (
          <div className="ml-3 sm:ml-4 pl-3 sm:pl-3.5 border-l-2 border-slate-200 dark:border-slate-700/80 space-y-1.5 pt-1.5 relative">
            {node.children.map(child => renderTreeNode(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  // Flatten tree for Multi-column Tree Table
  const flattenedTableRows = useMemo(() => {
    const rows: { node: HierarchyTreeNode; depth: number }[] = [];
    const flatten = (nodes: HierarchyTreeNode[], depth: number) => {
      nodes.forEach(node => {
        rows.push({ node, depth });
        if (node.children && node.children.length > 0) {
          flatten(node.children, depth + 1);
        }
      });
    };
    flatten(filteredTree, 0);
    return rows;
  }, [filteredTree]);

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      {/* =========================================================================
          DESKTOP COMMAND BANNER, BREADCRUMB & TELEMETRY
         ========================================================================= */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 p-5 sm:p-6 rounded-2xl text-white shadow-xl border border-slate-700/60 space-y-4">
        {/* Top Tier: Breadcrumbs & Actions */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-700/50">
          <div className="flex items-center gap-2 flex-wrap text-xs">
            <span className="text-slate-400 font-medium">
              {isTh ? 'ระบบบริหารจัดการ (Settings)' : 'Settings & Plant Configuration'}
            </span>
            <ChevronRight size={14} className="text-slate-600" />
            <span className="font-bold text-emerald-400">
              {activeTab === 'floc' 
                ? (isTh ? 'โครงสร้าง FLOC & รหัสอุปกรณ์' : 'FLOC Hierarchy & Asset Topology')
                : (isTh ? 'ผังโรงงาน CAD & พิกัด' : 'Plant Facility CAD Plot Plan')}
            </span>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {onOpenActivityLog && (
              <Button
                size="sm"
                variant="outline"
                onClick={onOpenActivityLog}
                className="border-slate-700 bg-slate-800/70 text-slate-300 hover:bg-slate-700 hover:text-white gap-1.5 text-xs h-8 cursor-pointer"
              >
                <Activity size={13} />
                <span>{isTh ? 'บันทึกกิจกรรม' : 'Activity Log'}</span>
              </Button>
            )}

            <Button
              size="sm"
              variant="outline"
              onClick={handleExportSystemBackup}
              className="border-emerald-500/40 bg-emerald-950/40 text-emerald-300 hover:bg-emerald-900/60 gap-1.5 text-xs h-8 cursor-pointer"
              title="Download PlantTurn_System_Config_Backup.json"
            >
              <Download size={13} />
              <span>{isTh ? 'สำรองข้อมูลระบบ' : 'Export System Backup'}</span>
            </Button>

            <button
              type="button"
              onClick={() => setShowLegacyView(!showLegacyView)}
              className="px-2.5 py-1 text-[11px] rounded-lg border border-slate-700 text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
              title="สลับมุมมองเดิม"
            >
              {showLegacyView ? (isTh ? 'กลับสู่หน้าใหม่ (New FLOC & CAD)' : 'Back to New View') : (isTh ? 'มุมมองเดิม (Legacy)' : 'Legacy View')}
            </button>
          </div>
        </div>

        {/* Middle Tier: Telemetry Badges */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
          <div>
            <h2 className="text-lg sm:text-xl font-black text-white tracking-tight flex items-center gap-2">
              <Layers className="text-emerald-400" size={22} />
              <span>{isTh ? 'ตั้งค่าโครงสร้างและผังโรงงาน (Plant & FLOC Master)' : 'Plant & FLOC Master Topology'}</span>
            </h2>
            <p className="text-xs text-slate-300 mt-0.5">
              {isTh 
                ? 'มาตรฐาน ISO 55001 / SAP PM สำหรับโครงสร้างอุปกรณ์และระบบพิกัด CAD เครือข่ายอุตสาหกรรม'
                : 'Enterprise ISO 55001 / SAP PM asset hierarchy and high-precision CAD coordinate systems'}
            </p>
          </div>

          {/* Telemetry Status Badges */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="px-3 py-1 rounded-xl bg-slate-800/80 border border-slate-700 text-slate-200 text-xs font-mono flex items-center gap-1.5">
              <Building2 size={13} className="text-blue-400" />
              <span>{Object.keys(PLANT_REGISTRY).length} {isTh ? 'โรงงาน (SR, PK)' : 'Plants (SR, PK)'}</span>
            </span>
            <span className="px-3 py-1 rounded-xl bg-slate-800/80 border border-slate-700 text-slate-200 text-xs font-mono flex items-center gap-1.5">
              <ShieldCheck size={13} className="text-emerald-400" />
              <span>18 / 24 {isTh ? 'ผู้ใช้ Active' : 'Active Users'}</span>
            </span>
            <span className="px-3 py-1 rounded-xl bg-slate-800/80 border border-slate-700 text-slate-200 text-xs font-mono flex items-center gap-1.5">
              <Tag size={13} className="text-purple-400" />
              <span>{flocList.length} {isTh ? 'จุดอ้างอิง FLOC' : 'FLOC Nodes'}</span>
            </span>
          </div>
        </div>

        {/* Bottom Tier: 2-Tab Navigation Switcher */}
        {!showLegacyView && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
            <button
              type="button"
              onClick={() => setActiveTab('floc')}
              className={`p-3.5 rounded-xl border text-left transition-all flex items-start gap-3 cursor-pointer ${
                activeTab === 'floc'
                  ? 'bg-emerald-500/15 border-emerald-500 text-white shadow-lg ring-1 ring-emerald-500/50'
                  : 'bg-slate-900/60 border-slate-700/80 text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <div className={`p-2 rounded-lg shrink-0 ${activeTab === 'floc' ? 'bg-emerald-500 text-white' : 'bg-slate-800 text-slate-400'}`}>
                <FolderTree size={18} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-sm text-white">
                    {isTh ? 'โครงสร้าง FLOC & รหัสอุปกรณ์' : 'FLOC Hierarchy & Asset Topology'}
                  </span>
                  <span className="text-[10px] px-1.5 py-0.2 rounded font-mono bg-emerald-500/20 text-emerald-300">
                    Tab 1
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-0.5">
                  {isTh ? 'ผังต้นไม้ ISO 55001 / SAP PM 3 ระดับ (Area L1 -> System L2 -> Equipment L3)' : '3-tier ISO 55001 tree and asset matrix table'}
                </p>
              </div>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('map')}
              className={`p-3.5 rounded-xl border text-left transition-all flex items-start gap-3 cursor-pointer ${
                activeTab === 'map'
                  ? 'bg-indigo-500/15 border-indigo-500 text-white shadow-lg ring-1 ring-indigo-500/50'
                  : 'bg-slate-900/60 border-slate-700/80 text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <div className={`p-2 rounded-lg shrink-0 ${activeTab === 'map' ? 'bg-indigo-500 text-white' : 'bg-slate-800 text-slate-400'}`}>
                <Compass size={18} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-sm text-white">
                    {isTh ? 'ผังโรงงาน CAD & พิกัด' : 'Facility Map & CAD Plot Plan'}
                  </span>
                  <span className="text-[10px] px-1.5 py-0.2 rounded font-mono bg-indigo-500/20 text-indigo-300">
                    Tab 2
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-0.5">
                  {isTh ? 'พิมพ์เขียววิศวกรรมจริง, ระบบพิกัด %, ไฟกะพริบ Cat A/B/C และ Inspector Drawer' : 'Architectural blueprints, calibrated hotspots & zoom'}
                </p>
              </div>
            </button>
          </div>
        )}
      </div>

      {/* =========================================================================
          ACTIVE TAB RENDER (NEW ENTERPRISE MODULE)
         ========================================================================= */}
      {!showLegacyView ? (
        activeTab === 'floc' ? (
          <FlocSettingsTab
            flocList={flocList}
            onAddFloc={handleAddFloc}
            onUpdateFloc={handleUpdateFloc}
            onDeleteFloc={handleDeleteFloc}
            onSwitchToMapTab={(nodeId) => {
              if (nodeId) setSelectedFlocId(nodeId);
              setActiveTab('map');
            }}
            selectedNodeId={selectedFlocId}
            onSelectNode={(nodeId) => setSelectedFlocId(nodeId)}
          />
        ) : (
          <PlantFacilityMapView
            flocList={flocList}
            onAddFloc={handleAddFloc}
            onUpdateFloc={handleUpdateFloc}
            onDeleteFloc={handleDeleteFloc}
            initialSelectedId={selectedFlocId}
            onNavigateToMasterPlotPlan={onNavigateToMasterPlotPlan}
          />
        )
      ) : (
        /* Legacy view container (hidden by default) */
        <div className="space-y-6">
          <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl text-xs text-amber-500 flex items-center justify-between">
            <span>⚠️ {isTh ? 'กำลังแสดงข้อมูลเดิม (Legacy Mode) เพื่อความเข้ากันได้ย้อนหลัง' : 'Displaying legacy view for backward compatibility'}</span>
            <button
              type="button"
              onClick={() => setShowLegacyView(false)}
              className="px-2.5 py-1 rounded bg-amber-500 text-slate-900 font-bold hover:bg-amber-400 transition-colors"
            >
              {isTh ? 'กลับสู่หน้าหลัก' : 'Back to Main'}
            </button>
          </div>

          {/* Top Banner & Control Deck */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 p-5 sm:p-6 rounded-2xl text-white shadow-xl border border-slate-700/60 space-y-4">
        {/* Top Tier: System Tag & Quick Utilities */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-700/50">
          <div className="flex flex-wrap items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-mono text-[11px] font-semibold tracking-wide flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              {isTh ? 'ผังการส่งมอบระบบ S2' : 'S2 SYSTEM TURNOVER'}
            </span>
            <span className="text-slate-400 text-xs font-medium">
              • {isTh ? 'โครงสร้างต้นไม้หลายระดับ (Multi-Level Tree)' : 'Multi-Level Asset & Location Hierarchy'}
            </span>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto">
            {onOpenActivityLog && (
              <Button
                size="sm"
                variant="outline"
                onClick={onOpenActivityLog}
                className="border-emerald-500/40 bg-emerald-950/30 text-emerald-300 hover:bg-emerald-900/50 gap-1.5 text-xs h-8 cursor-pointer"
              >
                <Activity size={13} />
                <span>{isTh ? 'บันทึกกิจกรรม' : 'Activity Log'}</span>
              </Button>
            )}

            <Button
              size="sm"
              variant="outline"
              onClick={handleExpandAll}
              className="border-slate-700 bg-slate-800/70 text-slate-300 hover:bg-slate-700 hover:text-white gap-1 text-xs h-8 cursor-pointer"
            >
              <Maximize2 size={13} />
              <span>{isTh ? 'ขยายทั้งหมด' : 'Expand All'}</span>
            </Button>

            <Button
              size="sm"
              variant="outline"
              onClick={handleCollapseAll}
              className="border-slate-700 bg-slate-800/70 text-slate-300 hover:bg-slate-700 hover:text-white gap-1 text-xs h-8 cursor-pointer"
            >
              <Minimize2 size={13} />
              <span>{isTh ? 'ย่อทั้งหมด' : 'Collapse'}</span>
            </Button>
          </div>
        </div>

        {/* Main Tier: Header Title & Main Action Buttons */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1.5 flex-1 min-w-0">
            <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white flex items-center gap-2.5">
              <span className="p-2 rounded-xl bg-amber-400/10 text-amber-400 border border-amber-400/20 shadow-xs shrink-0">
                <FolderTree size={22} />
              </span>
              <span className="break-words sm:truncate">
                {isTh ? 'ผังโครงสร้างตำแหน่งและระบบส่งมอบ' : 'Functional Location & Asset Hierarchy (Tree View)'}
              </span>
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 max-w-3xl leading-relaxed">
              {isTh
                ? 'โครงสร้างตำแหน่งหลายระดับ (Multi-Level Hierarchy): สร้างและขยายระดับชั้นได้ไม่จำกัด เช่น Unit > System > Sub-System > Equipment > Component > Instrument พร้อมรหัสสีและเส้นทางวิกฤต'
                : 'Multi-level asset tree supporting arbitrary nested levels: Unit > Process System > Sub-System / Circuit > Equipment > Sub-Equipment / Component > Instrument Loop with dynamic child creation.'}
            </p>
          </div>

          {/* Primary Call-to-Actions (Add, Bulk Insert & Plot Plan Mapping) */}
          <div className="flex flex-wrap items-center gap-2.5 shrink-0 self-start lg:self-center">
            {/* Add Plot Plan Mapping Button */}
            <Button
              size="sm"
              onClick={() => openAddPlotMappingModal(selectedNode, getNodePlotPlanMarker(selectedNode?.id))}
              className="bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold gap-1.5 shadow-md shadow-cyan-900/30 h-9 px-3.5 cursor-pointer transition-all hover:scale-[1.02]"
            >
              <Compass size={15} />
              <span>{isTh ? 'ระบุพิกัดผัง (Plot Plan)' : 'Map on Plot Plan'}</span>
            </Button>

            {/* Enterprise Bulk Insert Button */}
            <Button
              size="sm"
              onClick={() => setIsBulkInsertModalOpen(true)}
              className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold gap-1.5 shadow-md shadow-indigo-900/30 h-9 px-3.5 cursor-pointer transition-all hover:scale-[1.02]"
            >
              <FileSpreadsheet size={15} />
              <span>{isTh ? 'นำเข้าแบบกลุ่ม (Bulk Insert)' : 'Bulk Insert Hierarchy'}</span>
            </Button>

            {/* Quick Button to Add Level / Branch */}
            <Button
              size="sm"
              onClick={() => openAddLevelModal(null)}
              className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold gap-1.5 shadow-md shadow-emerald-900/30 h-9 px-3.5 cursor-pointer transition-all hover:scale-[1.02]"
            >
              <Plus size={15} />
              <span>{isTh ? 'เพิ่มระดับ (Add Level)' : 'Add Level / Branch'}</span>
            </Button>
          </div>
        </div>

        {/* Lower Tier: View Mode Switcher Strip & Index Stats */}
        <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-t border-slate-700/50">
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              {isTh ? 'มุมมอง:' : 'View Mode:'}
            </span>
            <div className="inline-flex rounded-lg bg-slate-900/90 p-1 border border-slate-700/80 shadow-xs">
              <button
                type="button"
                onClick={() => setViewMode('tree')}
                className={`px-3 py-1 rounded-md text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                  viewMode === 'tree' ? 'bg-emerald-600 text-white shadow-xs' : 'text-slate-400 hover:text-slate-200'
                }`}
                title="Tree Explorer & Detail Inspector"
              >
                <FolderTree size={13} />
                <span>Tree Explorer</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode('tree-table')}
                className={`px-3 py-1 rounded-md text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                  viewMode === 'tree-table' ? 'bg-emerald-600 text-white shadow-xs' : 'text-slate-400 hover:text-slate-200'
                }`}
                title="Dense Multi-Level Tree Table"
              >
                <TableIcon size={13} />
                <span>Tree Table</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode('diagram')}
                className={`px-3 py-1 rounded-md text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                  viewMode === 'diagram' ? 'bg-emerald-600 text-white shadow-xs' : 'text-slate-400 hover:text-slate-200'
                }`}
                title="Engineering Flow Diagram"
              >
                <GitBranch size={13} />
                <span>Flow Diagram</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode('plot-map')}
                className={`px-3 py-1 rounded-md text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                  viewMode === 'plot-map' ? 'bg-cyan-600 text-white shadow-xs' : 'text-slate-400 hover:text-slate-200'
                }`}
                title="Refinery Plot Plan Spatial Mapping"
              >
                <Compass size={13} />
                <span>Plot Plan Map</span>
              </button>
            </div>
          </div>

          <div className="text-xs text-slate-400 flex items-center gap-2 sm:gap-3 flex-wrap">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
              <span className="font-semibold text-slate-200">{stats.totalNodes}</span>
              <span>Total Assets</span>
            </span>
            <span className="text-slate-600 hidden sm:inline">•</span>
            <span><strong className="text-slate-200">{filteredTree.length}</strong> Top Units</span>
            <span className="text-slate-600 hidden sm:inline">•</span>
            <span><strong className="text-slate-200">{stats.systems}</strong> Systems</span>
            <span className="text-slate-600 hidden sm:inline">•</span>
            <span className="text-cyan-400 font-mono font-bold flex items-center gap-1">
              <MapPin size={11} />
              <span>{markers.length} Mapped Pins</span>
            </span>
          </div>
        </div>
      </div>

      {/* Toast Notification Banner */}
      {notification && (
        <div className={`p-3.5 rounded-xl border flex items-center justify-between text-xs animate-in fade-in shadow-sm ${
          notification.type === 'success' 
            ? 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-300 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200' 
            : notification.type === 'error'
            ? 'bg-red-50 dark:bg-red-950/60 border-red-300 dark:border-red-800 text-red-800 dark:text-red-200'
            : 'bg-blue-50 dark:bg-blue-950/60 border-blue-300 dark:border-blue-800 text-blue-800 dark:text-blue-200'
        }`}>
          <div className="flex items-center gap-2">
            <CheckCircle2 size={16} className="shrink-0" />
            <span className="font-semibold">{notification.message}</span>
          </div>
          <button onClick={() => setNotification(null)} className="text-xs font-bold opacity-75 hover:opacity-100 cursor-pointer">
            Dismiss
          </button>
        </div>
      )}

      {/* Visual & Color Coding Rules (Collapsible Hierarchy Legend) */}
      <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs overflow-hidden transition-all">
        <button
          type="button"
          onClick={() => setIsLegendOpen(!isLegendOpen)}
          className="w-full py-2.5 px-4 bg-slate-50/80 dark:bg-slate-800/40 flex items-center justify-between text-xs cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800/60 transition-colors"
        >
          <div className="flex items-center gap-2">
            <Sparkles size={14} className="text-amber-500" />
            <span className="font-bold text-slate-800 dark:text-slate-100">
              {isTh ? 'คำอธิบายระดับชั้นโครงสร้างและรหัสสี (Hierarchy & Color Guide)' : 'Hierarchy Architecture & Color Legend'}
            </span>
            <span className="text-[10px] text-slate-400 font-mono hidden sm:inline">
              • L1 Green (#008b52), L2 Orange (#ff6800), L3+ Sub-tree, Yellow EWR, Green PROJ, Red (*) Critical
            </span>
          </div>
          <div className="flex items-center gap-1 text-xs text-indigo-600 dark:text-indigo-400 font-bold">
            <span>{isLegendOpen ? (isTh ? 'ซ่อนคำอธิบาย' : 'Hide Guide') : (isTh ? 'แสดงคำอธิบาย' : 'Show Guide')}</span>
            <ChevronDown size={14} className={`transition-transform duration-200 ${isLegendOpen ? 'rotate-180' : ''}`} />
          </div>
        </button>

        {isLegendOpen && (
          <div className="p-4 border-t border-slate-200 dark:border-slate-800 animate-in fade-in">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 text-xs">
              {/* Level 1: Unit */}
              <div className="flex items-center gap-2.5 p-2 rounded-lg border border-emerald-200 dark:border-emerald-900 bg-emerald-50 dark:bg-emerald-950/30">
                <div className="w-8 h-8 rounded-md bg-[#008b52] text-white font-bold text-xs flex items-center justify-center shrink-0 shadow-xs">
                  L1
                </div>
                <div>
                  <span className="font-bold text-slate-800 dark:text-slate-100 block text-xs">
                    {isTh ? 'ระดับที่ 1: Unit (หน่วยงาน)' : 'Level 1: Unit Nodes'}
                  </span>
                  <span className="text-[10px] text-slate-500">
                    {isTh ? 'พื้นหลังสีเขียว ตัวหนา (เช่น APS-1, KHF-1)' : 'Green background, bold (e.g. APS-1, KHF-1)'}
                  </span>
                </div>
              </div>

              {/* Level 2: System */}
              <div className="flex items-center gap-2.5 p-2 rounded-lg border border-amber-200 dark:border-amber-900 bg-amber-50 dark:bg-amber-950/30">
                <div className="w-8 h-8 rounded-md bg-[#ff6800] text-white font-bold text-[10px] flex items-center justify-center shrink-0 shadow-xs">
                  L2
                </div>
                <div>
                  <span className="font-bold text-slate-800 dark:text-slate-100 block text-xs">
                    {isTh ? 'ระดับที่ 2: System (ระบบ)' : 'Level 2: System Nodes'}
                  </span>
                  <span className="text-[10px] text-slate-500">
                    {isTh ? 'แถบสีส้ม (เช่น System-11, System-22)' : 'Orange header (e.g. System-11)'}
                  </span>
                </div>
              </div>

              {/* Level 3+: Sub-System & Equipment */}
              <div className="flex items-center gap-2.5 p-2 rounded-lg border border-indigo-200 dark:border-indigo-900 bg-indigo-50 dark:bg-indigo-950/30">
                <div className="w-8 h-8 rounded-md bg-indigo-600 text-white font-bold text-[10px] flex items-center justify-center shrink-0 shadow-xs">
                  L3+
                </div>
                <div>
                  <span className="font-bold text-slate-800 dark:text-slate-100 block text-xs">
                    {isTh ? 'ระดับที่ 3+: Sub-Sys & Equipment' : 'Level 3+: Sub-System / Equipment'}
                  </span>
                  <span className="text-[10px] text-slate-500">
                    {isTh ? 'แตกย่อยได้ไม่จำกัด (Component, Loop)' : 'Recursive depth (Package, Spool, Loop)'}
                  </span>
                </div>
              </div>

              {/* Highlight Scopes */}
              <div className="flex items-center gap-2.5 p-2 rounded-lg border border-yellow-300 dark:border-yellow-800 bg-yellow-100/60 dark:bg-yellow-950/30">
                <div className="w-8 h-8 rounded-md bg-yellow-300 text-yellow-950 font-bold text-[10px] flex items-center justify-center shrink-0 border border-yellow-400">
                  EWR
                </div>
                <div>
                  <span className="font-bold text-yellow-900 dark:text-yellow-200 block text-xs">
                    {isTh ? 'สีเหลือง EWR / สีเขียว PROJ' : 'Yellow EWR / Green PROJ'}
                  </span>
                  <span className="text-[10px] text-yellow-700 dark:text-yellow-400 font-mono">
                    {isTh ? 'ไฮไลต์ขอบเขตงานพิเศษ' : 'Special work scope highlights'}
                  </span>
                </div>
              </div>

              {/* Critical Path */}
              <div className="flex items-center gap-2.5 p-2 rounded-lg border border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950/30">
                <div className="w-8 h-8 rounded-md bg-red-600 text-white font-black text-sm flex items-center justify-center shrink-0 shadow-xs">
                  *
                </div>
                <div>
                  <span className="font-bold text-red-900 dark:text-red-200 block text-xs">
                    {isTh ? 'เส้นทางวิกฤต (*)' : 'Critical Path (*)'}
                  </span>
                  <span className="text-[10px] text-red-700 dark:text-red-400">
                    {isTh ? 'ดอกจันแดงกำกับงานจุดวิกฤต' : 'Turnaround critical path gate item'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* KPI Telemetry & Search Toolbar */}
      <div className="bg-white dark:bg-slate-900 p-3 sm:p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-3">
        {/* Unified Industrial Telemetry Strip */}
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs border-b border-slate-100 dark:border-slate-800 pb-3">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            <span className="text-slate-400">{isTh ? 'หน่วยผลิต (L1):' : 'Units (L1):'}</span>
            <strong className="font-mono text-slate-900 dark:text-slate-100">{stats.units}</strong>
          </div>
          <span className="text-slate-300 dark:text-slate-700 hidden sm:inline">|</span>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-amber-500" />
            <span className="text-slate-400">{isTh ? 'ระบบ (L2):' : 'Systems (L2):'}</span>
            <strong className="font-mono text-slate-900 dark:text-slate-100">{stats.systems}</strong>
          </div>
          <span className="text-slate-300 dark:text-slate-700 hidden sm:inline">|</span>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-indigo-500" />
            <span className="text-slate-400">{isTh ? 'อุปกรณ์ (L3/L4):' : 'Equip (L3/L4):'}</span>
            <strong className="font-mono text-slate-900 dark:text-slate-100">{stats.equipment}</strong>
          </div>
          <span className="text-slate-300 dark:text-slate-700 hidden sm:inline">|</span>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-teal-500" />
            <span className="text-slate-400">{isTh ? 'ชิ้นส่วน (L5+):' : 'Components (L5+):'}</span>
            <strong className="font-mono text-slate-900 dark:text-slate-100">{stats.components}</strong>
          </div>
          <span className="text-slate-300 dark:text-slate-700 hidden sm:inline">|</span>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-yellow-400" />
            <span className="text-slate-400">EWR:</span>
            <strong className="font-mono text-amber-600 dark:text-amber-400">{stats.ewr}</strong>
          </div>
          <span className="text-slate-300 dark:text-slate-700 hidden sm:inline">|</span>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            <span className="text-slate-400">Project:</span>
            <strong className="font-mono text-emerald-600 dark:text-emerald-400">{stats.projects}</strong>
          </div>
          <span className="text-slate-300 dark:text-slate-700 hidden sm:inline">|</span>
          <div className="flex items-center gap-1.5">
            <span className="text-red-500 font-black text-sm">*</span>
            <span className="text-slate-400">{isTh ? 'วิกฤต (*):' : 'Critical (*):'}</span>
            <strong className="font-mono text-red-600 dark:text-red-400">{stats.critical}</strong>
          </div>
        </div>

        {/* Filter Controls Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex flex-1 items-center gap-2">
            <div className="relative flex-1 max-w-md">
              <Search size={14} className="absolute left-2.5 top-2.5 text-slate-400" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={isTh ? 'ค้นหา Tag, รหัสอ้างอิง, ทุกระดับ...' : 'Search Tag, Ref, any level...'}
                className="pl-8 h-8 text-xs"
              />
            </div>

            <div className="w-36">
              <Select
                value={filterHighlight}
                onChange={(e) => setFilterHighlight(e.target.value)}
                options={[
                  { value: 'All', label: isTh ? 'ทุกขอบเขตงาน' : 'All Scopes' },
                  { value: 'EWR', label: isTh ? 'EWR (สีเหลือง)' : 'EWR (Yellow)' },
                  { value: 'Project', label: isTh ? 'Project (สีเขียว)' : 'Project (Green)' },
                  { value: 'none', label: isTh ? 'ฐานมาตรฐาน' : 'Standard Base' },
                ]}
                className="h-8 text-xs"
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant={filterCriticalOnly ? 'default' : 'outline'}
              onClick={() => setFilterCriticalOnly(!filterCriticalOnly)}
              className={`h-8 text-xs cursor-pointer ${
                filterCriticalOnly ? 'bg-red-600 hover:bg-red-700 text-white' : ''
              }`}
            >
              <span>{isTh ? 'เฉพาะเส้นทางวิกฤต (*)' : 'Critical Path Only (*)'}</span>
            </Button>

            {(searchQuery || filterHighlight !== 'All' || filterCriticalOnly) && (
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  setSearchQuery('');
                  setFilterHighlight('All');
                  setFilterCriticalOnly(false);
                }}
                className="h-8 text-xs text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 cursor-pointer"
              >
                Reset
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* =========================================================================
          VIEW MODE 1: MULTI-LEVEL TREE EXPLORER & DETAIL INSPECTOR WORKDESK
         ========================================================================= */}
      {viewMode === 'tree' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Column: Multi-Level Recursive Tree View (7 cols) */}
          <div className="lg:col-span-7 bg-white dark:bg-slate-900 rounded-2xl border-2 border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
            <div className="p-3.5 px-4 bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FolderTree size={16} className="text-emerald-600 dark:text-emerald-400" />
                <span className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-slate-100">
                  {isTh ? 'โครงสร้างต้นไม้หลายระดับ (Multi-Level Tree)' : 'Multi-Level Asset & Location Hierarchy'}
                </span>
              </div>
              <div className="flex items-center gap-2 text-[11px] text-slate-400">
                <span>{filteredTree.length} Top Units</span>
                <span>•</span>
                <span className="font-mono text-emerald-600 dark:text-emerald-400 font-bold">
                  {stats.totalNodes} Nodes Total
                </span>
              </div>
            </div>

            <div className="p-4 space-y-2.5 max-h-[780px] overflow-y-auto">
              {/* Root Plant Node */}
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 font-bold text-xs text-slate-800 dark:text-slate-200">
                <div className="flex items-center gap-2">
                  <Building2 size={16} className="text-indigo-600 dark:text-indigo-400 shrink-0" />
                  <span>Refinery Complex • S2 Commissioning & Turnover Block</span>
                </div>
                <button
                  type="button"
                  onClick={() => openAddLevelModal(null)}
                  className="px-2 py-0.5 rounded bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-bold flex items-center gap-1 cursor-pointer shadow-xs"
                  title="Add New Level 1 Unit Area"
                >
                  <Plus size={11} />
                  <span>Add Unit</span>
                </button>
              </div>

              {filteredTree.length === 0 ? (
                <div className="p-10 text-center text-slate-400 space-y-2">
                  <AlertOctagon size={32} className="mx-auto text-slate-300" />
                  <div className="text-xs font-semibold">No assets found matching current search criteria.</div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setSearchQuery('');
                      setFilterHighlight('All');
                      setFilterCriticalOnly(false);
                    }}
                    className="text-xs mt-2 cursor-pointer"
                  >
                    Clear Filters
                  </Button>
                </div>
              ) : (
                <div className="space-y-2 pl-1 relative">
                  {filteredTree.map(rootNode => renderTreeNode(rootNode, 0))}
                </div>
              )}
            </div>
          </div>

          {/* Right Column: Asset / Location Inspector Workdesk (5 cols) */}
          <div className="lg:col-span-5 space-y-4 lg:sticky lg:top-4 self-start max-h-[calc(100vh-2rem)] overflow-y-auto pr-1">
            {selectedNode && (
              <Card className="border-2 border-indigo-200 dark:border-indigo-900 bg-white dark:bg-slate-900 shadow-md overflow-hidden">
                <CardHeader className="py-4 px-5 bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 text-white">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {getLevelBadge(selectedNode.level, selectedNode.levelType)}
                      <span className="text-[10px] uppercase tracking-widest text-indigo-200 font-bold">
                        {getLevelLabel(selectedNode.level, selectedNode.levelType)}
                      </span>
                    </div>
                    {selectedNode.isCriticalPath && (
                      <Badge variant="destructive" className="text-[10px] font-black uppercase flex items-center gap-1">
                        <span>* CRITICAL PATH</span>
                      </Badge>
                    )}
                  </div>

                  <CardTitle className="text-base font-black tracking-tight font-mono text-white mt-2 flex items-center gap-2">
                    {getNodeIcon(selectedNode)}
                    <span>{selectedNode.name}</span>
                  </CardTitle>

                  {/* Hierarchical Breadcrumb */}
                  <div className="flex items-center flex-wrap gap-1 text-[11px] text-slate-300 pt-1 font-mono">
                    {selectedNodeAncestors.map((anc, idx) => (
                      <React.Fragment key={anc.id}>
                        {idx > 0 && <span className="text-slate-500">&gt;</span>}
                        <span 
                          onClick={() => setSelectedNodeId(anc.id)}
                          className={`cursor-pointer hover:underline ${
                            anc.id === selectedNode.id ? 'text-amber-400 font-bold' : 'text-slate-300'
                          }`}
                        >
                          {anc.name}
                        </span>
                      </React.Fragment>
                    ))}
                  </div>
                </CardHeader>

                <CardContent className="p-5 space-y-4 text-xs">
                  {/* Metadata Summary Pill Grid */}
                  <div className="grid grid-cols-2 gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                    <div>
                      <span className="text-[10px] text-slate-400 uppercase font-bold block">Level Depth:</span>
                      <span className="font-bold text-slate-800 dark:text-slate-100">
                        Level {selectedNode.level} ({getLevelLabel(selectedNode.level, selectedNode.levelType)})
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 uppercase font-bold block">Reference Code / ID:</span>
                      <span className="font-mono font-bold text-slate-900 dark:text-slate-100">
                        {selectedNode.refCode || 'N/A'}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 uppercase font-bold block">Work Scope:</span>
                      <span className={`text-[10px] font-bold block ${
                        selectedNode.highlight === 'EWR' ? 'text-yellow-600 font-mono' :
                        selectedNode.highlight === 'Project' ? 'text-emerald-600 font-mono' :
                        'text-slate-500'
                      }`}>
                        {selectedNode.highlight === 'none' || !selectedNode.highlight ? 'Standard Base Scope' : selectedNode.highlight}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 uppercase font-bold block">Direct Children:</span>
                      <span className="font-mono font-bold text-indigo-600 dark:text-indigo-400">
                        {selectedNode.children.length} sub-items
                      </span>
                    </div>
                  </div>

                  {/* Description Box */}
                  <div>
                    <label className="text-[10px] font-bold uppercase text-slate-400 block mb-1">Description / Functional Scope</label>
                    <div className="p-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-medium">
                      {selectedNode.description || selectedNode.fullName || 'No additional scope notes entered for this level.'}
                    </div>
                  </div>

                  {/* Plot Plan Spatial Mapping Card in Inspector */}
                  <div className="p-3.5 rounded-xl border border-cyan-200 dark:border-cyan-900/60 bg-gradient-to-br from-cyan-50/50 to-blue-50/30 dark:from-cyan-950/20 dark:to-slate-900/50 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="p-1.5 rounded-lg bg-cyan-600 text-white shadow-xs">
                          <MapPin size={14} />
                        </span>
                        <div>
                          <span className="font-bold text-xs text-slate-900 dark:text-slate-100 block">
                            {isTh ? 'พิกัดแผนผังโรงงาน (Plot Plan)' : 'Plot Plan Spatial Mapping'}
                          </span>
                          <span className="text-[10px] text-slate-500 dark:text-slate-400">
                            {isTh ? 'เชื่อมโยงพิกัด CAD Blueprint และโซนวิศวกรรม' : 'Refinery CAD Blueprint Coordinates & Grid'}
                          </span>
                        </div>
                      </div>

                      {getNodePlotPlanMarker(selectedNode.id) ? (
                        <Badge className="bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border-emerald-500/40 text-[10px] font-mono font-bold">
                          📍 MAPPED
                        </Badge>
                      ) : (
                        <Badge className="bg-amber-500/20 text-amber-700 dark:text-amber-300 border-amber-500/40 text-[10px] font-mono">
                          UNMAPPED
                        </Badge>
                      )}
                    </div>

                    {getNodePlotPlanMarker(selectedNode.id) ? (
                      <div className="space-y-2 pt-1">
                        {/* Grid Coordinates Telemetry */}
                        <div className="grid grid-cols-2 gap-2 text-[11px] font-mono">
                          <div className="p-2 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                            <span className="text-[9px] uppercase text-slate-400 font-bold block">Grid Zone:</span>
                            <span className="font-bold text-cyan-600 dark:text-cyan-400 text-xs">
                              Zone {getNodePlotPlanMarker(selectedNode.id)?.gridZone}
                            </span>
                          </div>
                          <div className="p-2 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                            <span className="text-[9px] uppercase text-slate-400 font-bold block">Coordinates:</span>
                            <span className="font-bold text-slate-800 dark:text-slate-200 text-xs">
                              X: {getNodePlotPlanMarker(selectedNode.id)?.x}% | Y: {getNodePlotPlanMarker(selectedNode.id)?.y}%
                            </span>
                          </div>
                        </div>

                        {/* Mini CAD Radar Locator Preview */}
                        <div 
                          onClick={() => openAddPlotMappingModal(selectedNode, getNodePlotPlanMarker(selectedNode.id))}
                          className="relative h-16 rounded-lg border border-cyan-500/40 overflow-hidden cursor-pointer hover:border-cyan-400 transition-colors"
                          style={{
                            backgroundColor: isGlobalDark ? '#0c192c' : '#f4f7fb',
                            backgroundImage: isGlobalDark ? `
                              linear-gradient(rgba(56, 189, 248, 0.12) 1px, transparent 1px),
                              linear-gradient(90deg, rgba(56, 189, 248, 0.12) 1px, transparent 1px)
                            ` : `
                              linear-gradient(rgba(100, 116, 139, 0.16) 1px, transparent 1px),
                              linear-gradient(90deg, rgba(100, 116, 139, 0.16) 1px, transparent 1px)
                            `,
                            backgroundSize: '16px 16px'
                          }}
                          title="Click to adjust pin location on CAD blueprint"
                        >
                          {/* Authentic Master Plot Plan Background */}
                          <div className="absolute inset-0 pointer-events-none select-none overflow-hidden flex items-center justify-center">
                            <img 
                              src={essoPlotPlanBg} 
                              alt="Master Plot Plan" 
                              className={`w-full h-full object-contain pointer-events-none select-none transition-all duration-300 ${
                                isGlobalDark
                                  ? 'filter invert hue-rotate-180 brightness-[0.78] contrast-[1.25] opacity-50'
                                  : 'opacity-85 mix-blend-multiply'
                              }`}
                            />
                          </div>
                          <div 
                            className="absolute -translate-x-1/2 -translate-y-1/2"
                            style={{ 
                              left: `${getNodePlotPlanMarker(selectedNode.id)?.x}%`, 
                              top: `${getNodePlotPlanMarker(selectedNode.id)?.y}%` 
                            }}
                          >
                            <div className="w-5 h-5 rounded-full border-2 border-amber-400 bg-amber-500/40 animate-ping absolute" />
                            <div className="w-4 h-4 rounded-full border-2 border-amber-300 bg-amber-500 flex items-center justify-center text-white text-[8px] font-black shadow-md">
                              📍
                            </div>
                          </div>
                          <div className="absolute bottom-1 right-2 text-[8px] font-mono text-cyan-400/80">
                            Zone {getNodePlotPlanMarker(selectedNode.id)?.gridZone} • Click to adjust
                          </div>
                        </div>

                        {/* Buttons */}
                        <div className="flex items-center gap-2 pt-1">
                          <Button
                            size="sm"
                            onClick={() => {
                              if (onNavigateToMasterPlotPlan) {
                                onNavigateToMasterPlotPlan(selectedNode.id);
                              } else {
                                setViewMode('plot-map');
                              }
                            }}
                            className="flex-1 bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs gap-1.5 h-8 cursor-pointer shadow-xs"
                          >
                            <Compass size={13} />
                            <span>{isTh ? 'ดูบน Plot Plan' : 'View on Plot Plan'}</span>
                          </Button>

                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => openAddPlotMappingModal(selectedNode, getNodePlotPlanMarker(selectedNode.id))}
                            className="border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs h-8 cursor-pointer"
                          >
                            {isTh ? 'ปรับพิกัด' : 'Adjust Pin'}
                          </Button>

                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              if (confirm(isTh ? 'ต้องการลบจุดพิกัดนี้ออกจาก Plot Plan หรือไม่?' : 'Remove this node from the Plot Plan?')) {
                                deleteStoredMarker(selectedNode.id);
                                showToast(isTh ? `ลบพิกัด ${selectedNode.name} ออกจาก Plot Plan แล้ว` : `Removed ${selectedNode.name} from Plot Plan`, 'info');
                              }
                            }}
                            className="border-red-300 dark:border-red-800/60 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 text-xs h-8 px-2.5 cursor-pointer"
                            title="Unmap from Plot Plan"
                          >
                            <Trash2 size={13} />
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-2 pt-1">
                        <p className="text-[11px] text-slate-500 dark:text-slate-400">
                          {isTh 
                            ? 'อุปกรณ์นี้ยังไม่ได้ถูกระบุพิกัดบนแผนผัง Master Plot Plan' 
                            : 'This asset has not been assigned engineering spatial coordinates on the refinery master plot plan.'}
                        </p>
                        <Button
                          size="sm"
                          onClick={() => openAddPlotMappingModal(selectedNode, null)}
                          className="w-full bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs gap-1.5 h-8 cursor-pointer shadow-xs"
                        >
                          <MapPin size={13} />
                          <span>{isTh ? '+ เพิ่มพิกัดบนผัง (Add Plot Mapping)' : '+ Add Plot Plan Mapping'}</span>
                        </Button>
                      </div>
                    )}
                  </div>

                  {/* Prominent Multi-Level & Bulk Action Cards in Inspector */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <div className="p-3 rounded-xl border border-indigo-200 dark:border-indigo-900/60 bg-indigo-50/50 dark:bg-indigo-950/30 flex flex-col justify-between">
                      <div>
                        <div className="font-bold text-indigo-950 dark:text-indigo-200 text-xs flex items-center gap-1.5">
                          <CornerDownRight size={14} className="text-indigo-600 dark:text-indigo-400" />
                          <span>Create Child Levels / Branch</span>
                        </div>
                        <div className="text-[10px] text-indigo-700 dark:text-indigo-400 mt-0.5">
                          Add single or multi-level branches (L{selectedNode.level + 1}+).
                        </div>
                      </div>
                      <Button
                        size="sm"
                        onClick={() => openAddLevelModal(selectedNode)}
                        className="mt-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs gap-1.5 shadow-sm cursor-pointer w-full"
                      >
                        <Plus size={13} />
                        <span>Add Level / Branch</span>
                      </Button>
                    </div>

                    <div className="p-3 rounded-xl border border-emerald-200 dark:border-emerald-900/60 bg-emerald-50/50 dark:bg-emerald-950/30 flex flex-col justify-between">
                      <div>
                        <div className="font-bold text-emerald-950 dark:text-emerald-200 text-xs flex items-center gap-1.5">
                          <FileSpreadsheet size={14} className="text-emerald-600 dark:text-emerald-400" />
                          <span>Bulk Insert Children</span>
                        </div>
                        <div className="text-[10px] text-emerald-700 dark:text-emerald-400 mt-0.5">
                          Batch insert multiple items into this node.
                        </div>
                      </div>
                      <Button
                        size="sm"
                        onClick={() => setIsBulkInsertModalOpen(true)}
                        className="mt-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs gap-1.5 shadow-sm cursor-pointer w-full"
                      >
                        <FileSpreadsheet size={13} />
                        <span>Bulk Insert Hierarchy</span>
                      </Button>
                    </div>
                  </div>

                  {/* Direct Child Levels Table */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">
                        Child Levels under this Node ({selectedNode.children.length})
                      </span>
                    </div>

                    <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden max-h-56 overflow-y-auto">
                      <table className="w-full text-left border-collapse text-xs">
                        <thead>
                          <tr className="bg-slate-100 dark:bg-slate-800 text-[10px] font-bold text-slate-500 uppercase border-b border-slate-200 dark:border-slate-700">
                            <th className="py-2 px-3">Child Level & Name</th>
                            <th className="py-2 px-2 text-center w-16">Ref</th>
                            <th className="py-2 px-2 text-center w-16">Children</th>
                          </tr>
                        </thead>
                        <tbody>
                          {selectedNode.children.length === 0 ? (
                            <tr>
                              <td colSpan={3} className="py-4 text-center text-slate-400 italic">
                                No child levels created yet under this node.
                              </td>
                            </tr>
                          ) : (
                            selectedNode.children.map(ch => (
                              <tr 
                                key={ch.id} 
                                onClick={() => setSelectedNodeId(ch.id)}
                                className="border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer"
                              >
                                <td className="py-1.5 px-3">
                                  <div className="flex items-center gap-1.5">
                                    {getLevelBadge(ch.level, ch.levelType)}
                                    <span className="font-mono font-bold text-slate-800 dark:text-slate-200 truncate">
                                      {ch.name}
                                    </span>
                                    {ch.isCriticalPath && <span className="text-red-600 font-bold">*</span>}
                                  </div>
                                </td>
                                <td className="py-1.5 px-2 text-center font-mono text-[11px] text-slate-500">
                                  {ch.refCode || '-'}
                                </td>
                                <td className="py-1.5 px-2 text-center font-mono text-xs text-indigo-600 font-bold">
                                  {ch.children.length}
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Operational Toolbar */}
                  <div className="pt-2 border-t border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleToggleCritical(selectedNode.id)}
                      className="text-xs cursor-pointer gap-1.5"
                    >
                      <AlertOctagon size={13} className={selectedNode.isCriticalPath ? 'text-red-500' : 'text-slate-400'} />
                      <span>{selectedNode.isCriticalPath ? 'Remove Critical (*)' : 'Mark as Critical (*)'}</span>
                    </Button>

                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleDeleteNode(selectedNode.id, selectedNode.name)}
                      className="text-xs text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/40 border-red-200 dark:border-red-900 cursor-pointer gap-1"
                    >
                      <Trash2 size={13} />
                      <span>Delete Level</span>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      )}

      {/* =========================================================================
          VIEW MODE 2: MULTI-LEVEL TREE TABLE (GRID VIEW)
         ========================================================================= */}
      {viewMode === 'tree-table' && (
        <Card className="border-2 border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm overflow-hidden">
          <CardHeader className="py-3 px-5 border-b border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 flex flex-row items-center justify-between">
            <div className="flex items-center gap-2">
              <TableIcon size={16} className="text-emerald-600" />
              <CardTitle className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-slate-100">
                Multi-Level Hierarchical Tree Table
              </CardTitle>
            </div>
            <span className="text-[10px] text-slate-400 font-mono">
              LEVEL DEPTH INDENTATION • RECURSIVE HIERARCHY
            </span>
          </CardHeader>
          <CardContent className="p-0 overflow-x-auto">
            <table className="w-full border-collapse text-left text-xs">
              <thead>
                <tr className="bg-slate-100 dark:bg-slate-800 text-[10px] font-black text-slate-600 dark:text-slate-300 uppercase border-b border-slate-200 dark:border-slate-700">
                  <th className="py-2.5 px-4">HIERARCHY TREE & LEVEL NAME</th>
                  <th className="py-2.5 px-3 text-center w-24">LEVEL</th>
                  <th className="py-2.5 px-3 text-center w-24">REF CODE</th>
                  <th className="py-2.5 px-3 text-center w-24">SCOPE</th>
                  <th className="py-2.5 px-3 text-center w-28">CRITICAL PATH</th>
                  <th className="py-2.5 px-3 text-center w-36">ACTIONS</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {flattenedTableRows.map(({ node, depth }) => {
                  let rowBg = 'hover:bg-slate-50 dark:hover:bg-slate-800/60';
                  if (node.level === 1) rowBg = 'bg-[#008b52] text-white font-bold hover:bg-[#007b48]';
                  else if (node.level === 2) rowBg = 'bg-[#ff6800] text-slate-950 font-bold hover:bg-[#f26300]';
                  else if (node.highlight === 'EWR') rowBg = 'bg-yellow-100/70 hover:bg-yellow-100 dark:bg-yellow-950/30';
                  else if (node.highlight === 'Project') rowBg = 'bg-emerald-100/70 hover:bg-emerald-100 dark:bg-emerald-950/30';

                  return (
                    <tr key={node.id} className={`transition-colors ${rowBg}`}>
                      <td className="py-2 px-4" style={{ paddingLeft: `${Math.min(depth * 20 + 16, 160)}px` }}>
                        <div className="flex items-center gap-2">
                          {depth > 0 && <span className="text-slate-400 font-mono">└──</span>}
                          {getNodeIcon(node)}
                          <span className={`font-mono font-bold ${node.level === 1 || node.level === 2 ? 'text-white' : 'text-slate-900 dark:text-slate-100'}`}>
                            {node.name}
                          </span>
                          {node.isCriticalPath && <span className="text-red-600 font-black text-sm">*</span>}
                          {node.description && (
                            <span className={`text-[11px] truncate max-w-sm hidden md:inline ${
                              node.level <= 2 ? 'text-white/80' : 'text-slate-500'
                            }`}>
                              - {node.description}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-2 px-3 text-center">
                        {getLevelBadge(node.level, node.levelType)}
                      </td>
                      <td className="py-2 px-3 text-center font-mono font-bold">
                        {node.refCode || '-'}
                      </td>
                      <td className="py-2 px-3 text-center">
                        <span className={`text-[10px] px-2 py-0.5 rounded font-mono font-bold ${
                          node.highlight === 'EWR' ? 'bg-yellow-300 text-yellow-950 border border-yellow-400' :
                          node.highlight === 'Project' ? 'bg-emerald-300 text-emerald-950 border border-emerald-400' :
                          'text-slate-400'
                        }`}>
                          {node.highlight && node.highlight !== 'none' ? node.highlight : '-'}
                        </span>
                      </td>
                      <td className="py-2 px-3 text-center">
                        {node.isCriticalPath ? (
                          <Badge variant="destructive" className="text-[9px] font-black uppercase">
                            CRITICAL (*)
                          </Badge>
                        ) : (
                          <span className="text-slate-400 font-mono text-[10px]">-</span>
                        )}
                      </td>
                      <td className="py-2 px-3 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => openAddPlotMappingModal(node, getNodePlotPlanMarker(node.id))}
                            className={`px-2 py-1 rounded text-[10px] font-bold flex items-center gap-1 cursor-pointer transition-colors ${
                              getNodePlotPlanMarker(node.id)
                                ? 'bg-cyan-100 hover:bg-cyan-200 text-cyan-800 dark:bg-cyan-950 dark:hover:bg-cyan-900 text-cyan-300'
                                : 'bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-300'
                            }`}
                            title={`Map on Plot Plan: ${getNodePlotPlanMarker(node.id) ? `Zone ${getNodePlotPlanMarker(node.id)?.gridZone}` : 'Unmapped'}`}
                          >
                            <MapPin size={11} />
                            <span>{getNodePlotPlanMarker(node.id) ? getNodePlotPlanMarker(node.id)?.gridZone : 'Map'}</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => openAddLevelModal(node)}
                            className="px-2 py-1 rounded bg-indigo-50 hover:bg-indigo-100 text-indigo-700 dark:bg-slate-800 dark:hover:bg-slate-700 text-[10px] font-bold flex items-center gap-1 cursor-pointer"
                            title="Add Child Level / Branch"
                          >
                            <Plus size={11} />
                            <span>Add</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleToggleCritical(node.id)}
                            className="text-[10px] text-slate-500 hover:text-slate-800 px-1 py-0.5 cursor-pointer"
                          >
                            *
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}

      {/* =========================================================================
          VIEW MODE 3: SCHEMATIC FLOW DIAGRAM
         ========================================================================= */}
      {viewMode === 'diagram' && (
        <div className="overflow-x-auto pb-8">
          <div className="min-w-[1050px] p-6 rounded-2xl border-2 border-slate-300 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-md space-y-10">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <div>
                <h3 className="text-sm font-black uppercase tracking-wider text-slate-800 dark:text-slate-100 flex items-center gap-2">
                  <GitBranch size={16} className="text-orange-500" />
                  <span>S2 Turnover Multi-Level Schematic Diagram</span>
                </h3>
                <p className="text-xs text-slate-500">
                  Left-to-right branch tree representing Unit boundaries, distributed systems, and attached multi-level sub-trees.
                </p>
              </div>
              <Badge variant="outline" className="font-mono text-xs">
                Ref: FLOW-S2-MULTI-LEVEL
              </Badge>
            </div>

            {filteredTree.map((unit) => (
              <div key={unit.id} className="relative flex items-start gap-8">
                {/* 1. Unit Node (Top Level) */}
                <div className="w-56 shrink-0 z-10 sticky left-0">
                  <div className="p-4 rounded-xl bg-[#008b52] text-white shadow-lg border-2 border-emerald-700">
                    <div className="text-[10px] uppercase tracking-widest text-emerald-200 font-bold">Level 1 Unit Area</div>
                    <div className="text-base font-black tracking-wider uppercase font-mono mt-0.5">
                      {unit.name}
                    </div>
                    <div className="text-[11px] text-emerald-100 mt-1 line-clamp-2">
                      {unit.description || unit.fullName}
                    </div>
                    <div className="mt-3 pt-2 border-t border-emerald-500/50 flex items-center justify-between text-[10px]">
                      <span>{unit.children.length} Children</span>
                    </div>
                    <button
                      onClick={() => openAddLevelModal(unit)}
                      className="w-full mt-2 py-1 rounded-lg bg-[#005a35] hover:bg-[#004d2c] text-[10px] font-bold text-white flex items-center justify-center gap-1 transition-colors border border-emerald-400/30 cursor-pointer"
                    >
                      <Plus size={12} />
                      <span>Add Level 2 (Sys)</span>
                    </button>
                  </div>
                </div>

                {/* Connecting Line from Unit to Children */}
                <div className="flex-1 space-y-6 relative border-l-4 border-dashed border-emerald-400 dark:border-emerald-600 pl-6">
                  {unit.children.map((childLevel2) => (
                    <div key={childLevel2.id} className="relative flex items-start gap-4">
                      {/* Horizontal Connector Line */}
                      <div className="absolute -left-6 top-5 w-6 h-0.5 bg-amber-400" />

                      {/* Level 2 System Node */}
                      <div className="w-68 shrink-0 rounded-xl overflow-hidden border-2 border-[#f59e0b] dark:border-amber-500 shadow-sm bg-white dark:bg-slate-900">
                        <div className="bg-[#ff6800] text-slate-950 p-2.5 flex items-center justify-between">
                          <div>
                            <div className="text-[9px] uppercase font-bold text-[#421400]">Level 2: {childLevel2.levelType}</div>
                            <div className="font-black text-xs font-mono text-white drop-shadow-xs">
                              {childLevel2.name}
                            </div>
                            {childLevel2.description && (
                              <div className="text-[10px] text-[#421400] truncate max-w-[150px] font-medium">
                                {childLevel2.description}
                              </div>
                            )}
                          </div>
                          <button
                            onClick={() => openAddLevelModal(childLevel2)}
                            className="px-2 py-1 rounded bg-white text-slate-900 text-[10px] font-bold shadow-xs hover:bg-slate-100 flex items-center gap-0.5 cursor-pointer"
                            title="Add Child Level / Branch"
                          >
                            <Plus size={12} />
                            <span>Add</span>
                          </button>
                        </div>

                        {/* Level 3 Children List */}
                        <div className="max-h-60 overflow-y-auto">
                          <table className="w-full border-collapse text-left">
                            <thead>
                              <tr className="bg-slate-100 dark:bg-slate-800 text-[9px] font-bold text-slate-500 uppercase border-b border-slate-200 dark:border-slate-700">
                                <th className="py-1 px-2">Child Level Tag</th>
                                <th className="py-1 px-1.5 text-center w-14">Ref Code</th>
                              </tr>
                            </thead>
                            <tbody>
                              {childLevel2.children.map((subItem) => (
                                <tr key={subItem.id} className="border-b border-slate-200 dark:border-slate-800 text-[11px]">
                                  <td className="py-1.5 px-2 font-mono font-bold truncate">
                                    {subItem.name} {subItem.isCriticalPath && <span className="text-red-600 font-black">*</span>}
                                  </td>
                                  <td className="py-1.5 px-1.5 text-center font-mono font-bold text-slate-600 dark:text-slate-300">
                                    {subItem.refCode || '-'}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* =========================================================================
          VIEW MODE 4: INTEGRATED PLOT PLAN MAPPING VIEW
         ========================================================================= */}
      {viewMode === 'plot-map' && (
        <FunctionalLocationPlotPlanView
          treeData={treeData}
          markers={markers}
          onSelectNode={(nodeId) => {
            setSelectedNodeId(nodeId);
            const ancestors = findAncestors(treeData, nodeId);
            if (ancestors && ancestors.length > 0) {
              setExpandedNodeIds(prev => Array.from(new Set([...prev, ...ancestors.map(a => a.id)])));
            }
          }}
          onOpenAddMappingModal={(node, marker) => openAddPlotMappingModal(node, marker)}
          onNavigateToMasterPlotPlan={onNavigateToMasterPlotPlan}
          isTh={isTh}
        />
      )}

      {/* =========================================================================
          MODAL 1: ADD LEVEL / MULTI-LEVEL BRANCH BUILDER (ARBITRARY DEPTH)
         ========================================================================= */}
      <AddLevelModal
        isOpen={isAddLevelModalOpen}
        onClose={() => setIsAddLevelModalOpen(false)}
        targetParentNode={targetParentNode}
        allNodes={treeData}
        onAddSingleNode={handleAddSingleNode}
        onAddBranch={handleAddBranch}
        onAddBatchSiblings={handleAddBatchSiblings}
        isTh={isTh}
      />

      {/* =========================================================================
          MODAL 2: ENTERPRISE BULK INSERT FUNCTIONAL LOCATION & ASSET HIERARCHY
         ========================================================================= */}
      <BulkInsertModal
        isOpen={isBulkInsertModalOpen}
        onClose={() => setIsBulkInsertModalOpen(false)}
        existingTree={treeData}
        onCommitBulkInsert={handleCommitBulkInsert}
        isTh={isTh}
      />

      {/* =========================================================================
          MODAL 3: ADD / EDIT PLOT PLAN MAPPING MODAL
         ========================================================================= */}
      <AddPlotPlanMappingModal
        isOpen={isAddPlotMappingModalOpen}
        onClose={() => setIsAddPlotMappingModalOpen(false)}
        targetNode={plotMappingTargetNode}
        allNodes={allNodesFlat}
        existingMarker={plotMappingExistingMarker}
        onSaved={(savedMarker, openInMaster) => {
          setMarkers(getStoredMappedMarkers());
          showToast(
            isTh 
              ? `📍 บันทึกพิกัด ${savedMarker.tag} บนผัง Zone ${savedMarker.gridZone} (${savedMarker.x}%, ${savedMarker.y}%) สำเร็จ`
              : `📍 ${savedMarker.tag} successfully mapped to Zone ${savedMarker.gridZone} (${savedMarker.x}%, ${savedMarker.y}%)`,
            'success'
          );
          if (openInMaster && onNavigateToMasterPlotPlan) {
            onNavigateToMasterPlotPlan(savedMarker.nodeId);
          }
        }}
        isTh={isTh}
      />
        </div>
      )}
    </div>
  );
}
