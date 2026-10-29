import React, { useState, useEffect, useRef } from 'react';
import { 
  X, Save, AlertCircle, Sparkles, Building2, Layers, Tag, ShieldAlert,
  Upload, MapPin, Eye, Trash2, Camera, FileText, Check, Crosshair,
  Image as ImageIcon, FileCode, CheckCircle2, ChevronRight, CornerDownRight
} from 'lucide-react';
import { 
  FunctionalLocation, 
  PlantId, 
  FlocLevel, 
  EquipmentCategory, 
  CriticalityLevel,
  PLANT_REGISTRY 
} from '../../data/flocMasterData';
import { useLanguage } from '../../context/LanguageContext';
import essoPlotPlanBg from '../../assets/esso_sriracha_master_plotplan.jpg';
import bcpPlotPlanBg from '../../assets/BG_BCP.jpg';

interface FlocModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (floc: FunctionalLocation) => void;
  editingFloc?: FunctionalLocation | null;
  parentPreset?: { parentId: string; plantId: PlantId; level: FlocLevel } | null;
  existingFlocs: FunctionalLocation[];
}

export default function FlocModal({
  isOpen,
  onClose,
  onSave,
  editingFloc,
  parentPreset,
  existingFlocs
}: FlocModalProps) {
  const { isTh } = useLanguage();

  const [plantId, setPlantId] = useState<PlantId>('sr');
  const [level, setLevel] = useState<FlocLevel>('Equipment');
  const [flocCode, setFlocCode] = useState('');
  const [name, setName] = useState('');
  const [equipmentTag, setEquipmentTag] = useState('');
  const [parentId, setParentId] = useState<string>('');
  const [category, setCategory] = useState<EquipmentCategory>('Static Equipment');
  const [criticality, setCriticality] = useState<CriticalityLevel>('B');
  const [description, setDescription] = useState('');
  const [unit, setUnit] = useState('');
  const [xPercent, setXPercent] = useState<number | undefined>(50);
  const [yPercent, setYPercent] = useState<number | undefined>(50);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Plot Plan & Attachment States
  const [plotPlanImage, setPlotPlanImage] = useState<string>('');
  const [drawingRef, setDrawingRef] = useState<string>('');
  const [attachments, setAttachments] = useState<{ id: string; name: string; url?: string; type?: string; sizeKb?: number }[]>([]);

  // Interactive Visual Coordinate Picker Modal State
  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const [pickerCoords, setPickerCoords] = useState<{ x: number; y: number }>({ x: 50, y: 50 });
  const [pickerHover, setPickerHover] = useState<{ x: number; y: number } | null>(null);
  const pickerCanvasRef = useRef<HTMLDivElement>(null);

  // Reset or populate state when modal opens
  useEffect(() => {
    if (!isOpen) return;

    if (editingFloc) {
      setPlantId(editingFloc.plantId);
      setLevel(editingFloc.level);
      setFlocCode(editingFloc.flocCode);
      setName(editingFloc.name);
      setEquipmentTag(editingFloc.equipmentTag || '');
      setParentId(editingFloc.parentId || '');
      setCategory(editingFloc.category || 'Static Equipment');
      setCriticality(editingFloc.criticality || 'B');
      setDescription(editingFloc.description || '');
      setUnit(editingFloc.unit || '');
      setXPercent(editingFloc.xPercent ?? 50);
      setYPercent(editingFloc.yPercent ?? 50);
      setPlotPlanImage(editingFloc.plotPlanImage || '');
      setDrawingRef(editingFloc.drawingRef || '');
      setAttachments(editingFloc.attachments || []);
      setErrors({});
    } else if (parentPreset) {
      setPlantId(parentPreset.plantId);
      setLevel(parentPreset.level);
      setParentId(parentPreset.parentId);
      
      const parentNode = existingFlocs.find(f => f.id === parentPreset.parentId);
      const prefix = parentPreset.plantId === 'sr' ? 'SR-' : parentPreset.plantId === 'pk' ? 'PK-' : 'BC-';
      const levelPrefix = parentPreset.level === 'System' ? 'SYS-' : 'EQ-';
      const parentTagPart = parentNode?.flocCode ? parentNode.flocCode.split('-').slice(1).join('-') + '-' : '';
      
      setFlocCode(`${prefix}${parentTagPart}${levelPrefix}`);
      setName('');
      setEquipmentTag('');
      setCategory('Static Equipment');
      setCriticality('B');
      setDescription('');
      setUnit(parentNode?.unit || '');
      setXPercent(parentNode?.xPercent ? Math.round((parentNode.xPercent + (Math.random() * 4 - 2)) * 10) / 10 : 50);
      setYPercent(parentNode?.yPercent ? Math.round((parentNode.yPercent + (Math.random() * 4 - 2)) * 10) / 10 : 50);
      setPlotPlanImage(parentNode?.plotPlanImage || '');
      setDrawingRef(parentNode?.drawingRef || '');
      setAttachments([]);
      setErrors({});
    } else {
      setPlantId('sr');
      setLevel('Area');
      setFlocCode('SR-AREA-');
      setName('');
      setEquipmentTag('');
      setParentId('');
      setCategory('Civil & Structures');
      setCriticality('B');
      setDescription('');
      setUnit('');
      setXPercent(50);
      setYPercent(50);
      setPlotPlanImage('');
      setDrawingRef('');
      setAttachments([]);
      setErrors({});
    }
  }, [isOpen, editingFloc, parentPreset, existingFlocs]);

  // Handle Plant or Level change: Auto generate code suggestion prefix if creating new
  const handlePlantOrLevelChange = (newPlant: PlantId, newLevel: FlocLevel) => {
    setPlantId(newPlant);
    setLevel(newLevel);

    if (!editingFloc) {
      const p = newPlant.toUpperCase();
      if (newLevel === 'Area') {
        setFlocCode(`${p}-AREA-`);
        setParentId('');
        setCategory('Civil & Structures');
      } else if (newLevel === 'System') {
        setFlocCode(`${p}-SYS-`);
        setCategory('Static Equipment');
      } else {
        setFlocCode(`${p}-EQ-`);
        setCategory('Static Equipment');
      }
    }
  };

  // Upload custom Plot Plan image (for Area / Plant)
  const handlePlotPlanUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.onload = (uploadEvent) => {
        if (uploadEvent.target?.result) {
          const dataUrl = uploadEvent.target.result as string;
          setPlotPlanImage(dataUrl);
          if (!drawingRef) {
            setDrawingRef(file.name.replace(/\.[^/.]+$/, ''));
          }
        }
      };
      reader.readAsDataURL(file);
    }
  };

  // Upload attachments (equipment photos, datasheets)
  const handleAttachmentUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      Array.from(e.target.files).forEach((file: File) => {
        const reader = new FileReader();
        reader.onload = (ev) => {
          if (ev.target?.result) {
            setAttachments(prev => [
              ...prev,
              {
                id: `att-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
                name: file.name,
                url: ev.target?.result as string,
                type: file.type.startsWith('image/') ? 'image' : 'pdf',
                sizeKb: Math.round(file.size / 1024)
              }
            ]);
          }
        };
        reader.readAsDataURL(file);
      });
    }
  };

  // Remove attachment
  const handleRemoveAttachment = (id: string) => {
    setAttachments(prev => prev.filter(a => a.id !== id));
  };

  // Open Visual Coordinate Picker
  const openVisualPicker = () => {
    setPickerCoords({ x: xPercent ?? 50, y: yPercent ?? 50 });
    setIsPickerOpen(true);
  };

  // Handle click on the visual picker canvas
  const handleCanvasClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!pickerCanvasRef.current) return;
    const rect = pickerCanvasRef.current.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;

    const calcX = Math.round((Math.max(0, Math.min(rect.width, clickX)) / rect.width) * 1000) / 10;
    const calcY = Math.round((Math.max(0, Math.min(rect.height, clickY)) / rect.height) * 1000) / 10;

    setPickerCoords({ x: calcX, y: calcY });
  };

  // Handle mouse move on picker canvas for live crosshair
  const handleCanvasMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!pickerCanvasRef.current) return;
    const rect = pickerCanvasRef.current.getBoundingClientRect();
    const moveX = e.clientX - rect.left;
    const moveY = e.clientY - rect.top;

    const calcX = Math.round((Math.max(0, Math.min(rect.width, moveX)) / rect.width) * 1000) / 10;
    const calcY = Math.round((Math.max(0, Math.min(rect.height, moveY)) / rect.height) * 1000) / 10;

    setPickerHover({ x: calcX, y: calcY });
  };

  // Confirm visual coordinates
  const handleConfirmPickerCoords = () => {
    setXPercent(pickerCoords.x);
    setYPercent(pickerCoords.y);
    setIsPickerOpen(false);
  };

  // Determine active plot plan background image
  const activeBlueprint = plotPlanImage || (plantId === 'sr' ? essoPlotPlanBg : bcpPlotPlanBg);

  // Filter parents: Same plant only, and strictly higher level
  const eligibleParents = existingFlocs.filter(f => {
    if (f.plantId !== plantId) return false;
    if (editingFloc && f.id === editingFloc.id) return false;
    if (level === 'System') return f.level === 'Area';
    if (level === 'Equipment') return f.level === 'Area' || f.level === 'System';
    return false;
  });

  const validate = (): boolean => {
    const errs: Record<string, string> = {};
    if (!flocCode.trim()) errs.flocCode = isTh ? 'กรุณาระบุรหัส FLOC' : 'FLOC code is required';
    if (!name.trim()) errs.name = isTh ? 'กรุณาระบุชื่อสถานที่ / อุปกรณ์' : 'Name is required';
    if (level !== 'Area' && !parentId) {
      errs.parentId = isTh ? 'กรุณาเลือกโหนดแม่ (Parent FLOC)' : 'Parent FLOC is required for this level';
    }

    const codeDup = existingFlocs.find(f => 
      f.flocCode.toLowerCase() === flocCode.trim().toLowerCase() && 
      (!editingFloc || f.id !== editingFloc.id)
    );
    if (codeDup) {
      errs.flocCode = isTh ? 'รหัส FLOC นี้มีอยู่ในระบบแล้ว' : 'FLOC code already exists';
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    const newRecord: FunctionalLocation = {
      id: editingFloc ? editingFloc.id : `floc-${plantId}-${Date.now().toString(36)}`,
      plantId,
      level,
      flocCode: flocCode.trim().toUpperCase(),
      name: name.trim(),
      equipmentTag: equipmentTag.trim() ? equipmentTag.trim().toUpperCase() : undefined,
      parentId: level === 'Area' ? null : parentId || null,
      category,
      criticality,
      description: description.trim() || undefined,
      unit: unit.trim() || undefined,
      isCriticalPath: criticality === 'A',
      xPercent: xPercent !== undefined ? Math.max(0, Math.min(100, Number(xPercent))) : 50,
      yPercent: yPercent !== undefined ? Math.max(0, Math.min(100, Number(yPercent))) : 50,
      plotPlanImage: plotPlanImage || undefined,
      drawingRef: drawingRef.trim() || undefined,
      attachments: attachments.length > 0 ? attachments : undefined
    };

    onSave(newRecord);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-sm animate-in fade-in duration-200">
        <div 
          className="w-full max-w-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-800/50">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                <Layers size={20} />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  {editingFloc 
                    ? (isTh ? 'แก้ไขข้อมูลโหนด FLOC' : 'Edit FLOC Node') 
                    : (isTh ? 'สร้างจุดโครงสร้าง FLOC ใหม่' : 'Create New FLOC Node')}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {isTh ? 'ระบบมาตรฐาน ISO 55001 / SAP PM 3-Tier Hierarchy' : 'ISO 55001 / SAP PM Asset Topology'}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-white rounded-lg hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <X size={18} />
            </button>
          </div>

          {/* Form Body */}
          <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-4 flex-1 text-slate-800 dark:text-slate-200 text-xs">
            {/* Plant & Level Selection */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1.5">
                  <Building2 size={13} className="text-emerald-500" />
                  {isTh ? 'โรงงาน (Plant)' : 'Plant'}
                </label>
                <select
                  value={plantId}
                  onChange={(e) => handlePlantOrLevelChange(e.target.value as PlantId, level)}
                  disabled={!!parentPreset}
                  className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800/80 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500 disabled:opacity-60"
                >
                  <option value="sr">{PLANT_REGISTRY.sr.nameTh}</option>
                  <option value="pk">{PLANT_REGISTRY.pk.nameTh}</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1.5">
                  <Layers size={13} className="text-emerald-500" />
                  {isTh ? 'ลำดับชั้นโครงสร้าง (Hierarchy Level)' : 'Hierarchy Level'}
                </label>
                <select
                  value={level}
                  onChange={(e) => handlePlantOrLevelChange(plantId, e.target.value as FlocLevel)}
                  disabled={!!parentPreset}
                  className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800/80 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500 disabled:opacity-60"
                >
                  <option value="Area">{isTh ? 'Level 1: Area (พื้นที่/ยูนิตผลิต)' : 'Level 1: Area'}</option>
                  <option value="System">{isTh ? 'Level 2: System (ระบบกระบวนการ)' : 'Level 2: System'}</option>
                  <option value="Equipment">{isTh ? 'Level 3: Equipment (อุปกรณ์/เครื่องจักร)' : 'Level 3: Equipment'}</option>
                </select>
              </div>
            </div>

            {/* Parent Node Selection (If Level 2 or 3) */}
            {level !== 'Area' && (
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1.5">
                  <Tag size={13} className="text-emerald-500" />
                  {isTh ? 'โหนดแม่ (Parent FLOC Node)' : 'Parent FLOC Node'}
                  <span className="text-rose-500">*</span>
                </label>
                <select
                  value={parentId}
                  onChange={(e) => setParentId(e.target.value)}
                  disabled={!!parentPreset}
                  className={`w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800/80 border rounded-lg text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500 ${
                    errors.parentId ? 'border-rose-500 ring-1 ring-rose-500' : 'border-slate-300 dark:border-slate-700'
                  }`}
                >
                  <option value="">{isTh ? '-- เลือกโหนดแม่ --' : '-- Select Parent Node --'}</option>
                  {eligibleParents.map(parent => (
                    <option key={parent.id} value={parent.id}>
                      [{parent.level}] {parent.flocCode} - {parent.name}
                    </option>
                  ))}
                </select>
                {errors.parentId && (
                  <p className="text-xs text-rose-500 mt-1 flex items-center gap-1">
                    <AlertCircle size={12} /> {errors.parentId}
                  </p>
                )}
              </div>
            )}

            {/* FLOC Code & Equipment Tag */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    {isTh ? 'รหัส FLOC (FLOC Code)' : 'FLOC Code'}
                    <span className="text-rose-500">*</span>
                  </label>
                  <span className="text-[10px] text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                    <Sparkles size={11} /> Auto-suggested
                  </span>
                </div>
                <input
                  type="text"
                  value={flocCode}
                  onChange={(e) => setFlocCode(e.target.value.toUpperCase())}
                  placeholder="เช่น SR-AREA-HCU หรือ SR-HCU-EQ-E204"
                  className={`w-full px-3 py-2 text-sm font-mono bg-slate-50 dark:bg-slate-800/80 border rounded-lg text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500 ${
                    errors.flocCode ? 'border-rose-500 ring-1 ring-rose-500' : 'border-slate-300 dark:border-slate-700'
                  }`}
                />
                {errors.flocCode && (
                  <p className="text-xs text-rose-500 mt-1 flex items-center gap-1">
                    <AlertCircle size={12} /> {errors.flocCode}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1">
                  <Tag size={13} className="text-slate-400" />
                  {isTh ? 'ป้ายชื่ออุปกรณ์หน้างาน (Equipment Tag)' : 'Equipment Tag'}
                </label>
                <input
                  type="text"
                  value={equipmentTag}
                  onChange={(e) => setEquipmentTag(e.target.value.toUpperCase())}
                  placeholder="เช่น E-204, RV-108, V-301, P-101A"
                  className="w-full px-3 py-2 text-sm font-mono bg-slate-50 dark:bg-slate-800/80 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>

            {/* Name & Operating Unit */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  {isTh ? 'ชื่อเรียกสถานที่ / อุปกรณ์ (Name)' : 'Name'}
                  <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="เช่น Unit 4 Hydrocracker Area (HCU) หรือ HCU Feed Exchanger"
                  className={`w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800/80 border rounded-lg text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500 ${
                    errors.name ? 'border-rose-500 ring-1 ring-rose-500' : 'border-slate-300 dark:border-slate-700'
                  }`}
                />
                {errors.name && (
                  <p className="text-xs text-rose-500 mt-1 flex items-center gap-1">
                    <AlertCircle size={12} /> {errors.name}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  {isTh ? 'ยูนิตปฏิบัติการ (Operating Unit)' : 'Operating Unit'}
                </label>
                <input
                  type="text"
                  value={unit}
                  onChange={(e) => setUnit(e.target.value)}
                  placeholder="เช่น HCU Unit 4, CDU-1"
                  className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800/80 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>

            {/* Category & Criticality */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  {isTh ? 'หมวดหมู่อุปกรณ์ (Asset Category)' : 'Asset Category'}
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value as EquipmentCategory)}
                  className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800/80 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="Static Equipment">Static Equipment (ถัง, หอกลั่น, ท่อแลกเปลี่ยนความร้อน)</option>
                  <option value="Rotating Equipment">Rotating Equipment (ปั๊ม, คอมเพรสเซอร์, กังหัน)</option>
                  <option value="Piping & Valves">Piping & Valves (ท่อ, วาล์วนิรภัย PSV/RV)</option>
                  <option value="Electrical">Electrical (สวิตช์เกียร์, มอเตอร์)</option>
                  <option value="Instrumentation">Instrumentation (เครื่องมือวัด, ทรานสมิตเตอร์)</option>
                  <option value="Civil & Structures">Civil & Structures (งานโยธา, ฐานราก, โครงสร้าง)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1.5">
                  <ShieldAlert size={13} className="text-amber-500" />
                  {isTh ? 'ระดับความวิกฤต (Criticality Level)' : 'Criticality Level'}
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setCriticality('A')}
                    className={`py-2 px-2 text-xs font-bold rounded-lg border transition-all text-center cursor-pointer ${
                      criticality === 'A'
                        ? 'bg-rose-500/20 text-rose-500 border-rose-500 shadow-sm ring-1 ring-rose-500'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-500 border-slate-300 dark:border-slate-700 hover:text-slate-700 dark:hover:text-slate-300'
                    }`}
                  >
                    Cat A (วิกฤต)
                  </button>
                  <button
                    type="button"
                    onClick={() => setCriticality('B')}
                    className={`py-2 px-2 text-xs font-bold rounded-lg border transition-all text-center cursor-pointer ${
                      criticality === 'B'
                        ? 'bg-amber-500/20 text-amber-500 border-amber-500 shadow-sm ring-1 ring-amber-500'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-500 border-slate-300 dark:border-slate-700 hover:text-slate-700 dark:hover:text-slate-300'
                    }`}
                  >
                    Cat B (Pre-Oil)
                  </button>
                  <button
                    type="button"
                    onClick={() => setCriticality('C')}
                    className={`py-2 px-2 text-xs font-bold rounded-lg border transition-all text-center cursor-pointer ${
                      criticality === 'C'
                        ? 'bg-emerald-500/20 text-emerald-500 border-emerald-500 shadow-sm ring-1 ring-emerald-500'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-500 border-slate-300 dark:border-slate-700 hover:text-slate-700 dark:hover:text-slate-300'
                    }`}
                  >
                    Cat C (ทั่วไป)
                  </button>
                </div>
              </div>
            </div>

            {/* =========================================================================
                NEW FEATURE: UPLOAD PLOT PLAN / UNIT LAYOUT DRAWING (FOR LEVEL 1 AREA OR PLANT)
               ========================================================================= */}
            {level === 'Area' && (
              <div className="p-4 rounded-xl bg-gradient-to-r from-blue-50/80 to-indigo-50/80 dark:from-slate-800/80 dark:to-indigo-950/40 border border-blue-200 dark:border-blue-900/60 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <FileCode size={16} className="text-blue-600 dark:text-blue-400" />
                    <div>
                      <span className="text-xs font-bold text-slate-800 dark:text-slate-100">
                        {isTh ? 'อัปโหลดผัง Plot Plan ประจำพื้นที่ (Area Plot Plan Blueprint)' : 'Area Plot Plan Blueprint'}
                      </span>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">
                        {isTh ? 'อัปโหลดภาพพิมพ์เขียวเฉพาะของ Unit นี้ เพื่อใช้เป็นผังประจำพื้นที่' : 'Attach layout blueprint specifically for this Area / Unit'}
                      </p>
                    </div>
                  </div>
                  {plotPlanImage && (
                    <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 flex items-center gap-1">
                      <CheckCircle2 size={10} /> {isTh ? 'มีแบบผังแล้ว' : 'Blueprint Attached'}
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  <div>
                    <label className="block text-[11px] text-slate-600 dark:text-slate-300 mb-1">
                      {isTh ? 'เลขที่แบบ Drawing Reference / Revision' : 'Drawing No. / Revision'}
                    </label>
                    <input
                      type="text"
                      value={drawingRef}
                      onChange={(e) => setDrawingRef(e.target.value)}
                      placeholder="เช่น HCU-SKID-04 Rev 6 หรือ RD-001-A"
                      className="w-full px-3 py-1.5 text-xs font-mono bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] text-slate-600 dark:text-slate-300 mb-1">
                      {isTh ? 'ไฟล์ภาพผังแบบแปลน (.png, .jpg, .svg)' : 'Plot Plan Image File'}
                    </label>
                    <label className="flex items-center justify-center gap-2 px-3 py-1.5 bg-white dark:bg-slate-900 border border-dashed border-blue-400 dark:border-blue-600 hover:border-blue-500 rounded-lg text-xs font-bold text-blue-600 dark:text-blue-400 cursor-pointer transition-colors shadow-2xs">
                      <Upload size={13} />
                      <span>{plotPlanImage ? (isTh ? 'เปลี่ยนไฟล์ผัง' : 'Replace File') : (isTh ? 'เลือกไฟล์ผังแปลน...' : 'Upload Blueprint...')}</span>
                      <input 
                        type="file" 
                        accept="image/*" 
                        onChange={handlePlotPlanUpload}
                        className="hidden" 
                      />
                    </label>
                  </div>
                </div>

                {plotPlanImage && (
                  <div className="relative mt-2 p-2 bg-slate-900 rounded-xl border border-slate-700 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5 overflow-hidden">
                      <img 
                        src={plotPlanImage} 
                        alt="Area Blueprint Preview" 
                        className="w-14 h-10 object-cover rounded-lg border border-slate-700 shrink-0" 
                      />
                      <div className="truncate text-[11px]">
                        <span className="font-bold text-slate-100 block truncate">{drawingRef || 'Custom Area Blueprint'}</span>
                        <span className="text-slate-400 text-[10px]">Active for this Area</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={openVisualPicker}
                        className="px-2.5 py-1 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-[11px] font-bold flex items-center gap-1 cursor-pointer"
                        title={isTh ? "ดูผังขนาดเต็ม" : "View Blueprint"}
                      >
                        <Eye size={12} />
                        <span>{isTh ? 'เปิดดูผัง' : 'View'}</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setPlotPlanImage('');
                          setDrawingRef('');
                        }}
                        className="p-1 rounded-lg text-slate-400 hover:text-red-400 hover:bg-slate-800 transition-colors cursor-pointer"
                        title={isTh ? "ลบผังนี้" : "Remove"}
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* =========================================================================
                CAD PLOT PLAN COORDINATES WITH "PICK ON PLOT PLAN" BUTTON
               ========================================================================= */}
            <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-100 block">
                    {isTh ? 'พิกัดเชิงพื้นที่บนผัง CAD (Spatial Coordinates)' : 'CAD Plot Plan Coordinates (%)'}
                  </span>
                  <span className="text-[11px] text-slate-500 dark:text-slate-400">
                    {isTh ? 'ระบุตำแหน่งของอุปกรณ์ หรือคลิกจิ้มจากภาพผังจริง' : 'Pinpoint exact lifting/installation location on the plot plan'}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={openVisualPicker}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 text-white font-bold text-xs shadow-md shadow-indigo-500/20 active:scale-95 transition-all cursor-pointer"
                >
                  <MapPin size={13} />
                  <span>{isTh ? '📍 จิ้มตำแหน่งจากผังจริง' : 'Pick on Plot Plan'}</span>
                </button>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] text-slate-500 dark:text-slate-400 mb-0.5 font-medium">
                    {isTh ? 'X-Axis (% จากซ้ายไปขวา)' : 'X-Axis (% Left to Right)'}
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      min="0"
                      max="100"
                      step="0.1"
                      value={xPercent ?? 50}
                      onChange={(e) => setXPercent(parseFloat(e.target.value) || 0)}
                      className="w-full px-3 py-1.5 text-xs font-mono bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
                    />
                    <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] font-mono text-slate-400">%</span>
                  </div>
                </div>
                <div>
                  <label className="block text-[11px] text-slate-500 dark:text-slate-400 mb-0.5 font-medium">
                    {isTh ? 'Y-Axis (% จากบนลงล่าง)' : 'Y-Axis (% Top to Bottom)'}
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      min="0"
                      max="100"
                      step="0.1"
                      value={yPercent ?? 50}
                      onChange={(e) => setYPercent(parseFloat(e.target.value) || 0)}
                      className="w-full px-3 py-1.5 text-xs font-mono bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
                    />
                    <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] font-mono text-slate-400">%</span>
                  </div>
                </div>
              </div>
            </div>

            {/* =========================================================================
                EQUIPMENT ATTACHMENTS (PHOTOS / GA DRAWINGS / DATASHEET)
               ========================================================================= */}
            {level === 'Equipment' && (
              <div className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200 dark:border-slate-800 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                    <Camera size={13} className="text-slate-400" />
                    {isTh ? 'รูปถ่ายอุปกรณ์หน้างาน & เอกสารสเปก (Photos & Docs)' : 'Equipment Photos & Engineering Docs'}
                  </span>
                  <label className="flex items-center gap-1 text-[11px] font-bold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer">
                    <Upload size={11} />
                    <span>{isTh ? 'แนบรูป/ไฟล์' : 'Attach File'}</span>
                    <input 
                      type="file" 
                      multiple 
                      accept="image/*,.pdf" 
                      onChange={handleAttachmentUpload}
                      className="hidden" 
                    />
                  </label>
                </div>

                {attachments.length === 0 ? (
                  <p className="text-[11px] text-slate-400 italic">
                    {isTh ? 'ยังไม่มีไฟล์แนบ (สามารถอัปโหลดรูปถ่ายสภาพอุปกรณ์จริงเพื่อประกอบการวางแผนยกได้)' : 'No attachments (Upload site photos or GA drawings to support lift planning)'}
                  </p>
                ) : (
                  <div className="flex flex-wrap gap-2 pt-1">
                    {attachments.map(att => (
                      <div 
                        key={att.id}
                        className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-[11px]"
                      >
                        {att.type === 'image' ? <ImageIcon size={12} className="text-blue-500" /> : <FileText size={12} className="text-amber-500" />}
                        <span className="max-w-[120px] truncate font-medium text-slate-700 dark:text-slate-300" title={att.name}>
                          {att.name}
                        </span>
                        {att.sizeKb && <span className="text-[9px] text-slate-400 font-mono">({att.sizeKb}KB)</span>}
                        <button
                          type="button"
                          onClick={() => handleRemoveAttachment(att.id)}
                          className="text-slate-400 hover:text-red-500 ml-1 cursor-pointer"
                        >
                          <X size={11} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Description */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                {isTh ? 'คำอธิบายขอบเขตงานหรือเงื่อนไขทางวิศวกรรม (Description)' : 'Engineering Description / Scope'}
              </label>
              <textarea
                rows={2}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="ระบุข้อกำหนดเฉพาะทางเทคนิค หรือสภาพการทำงาน..."
                className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800/80 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none"
              />
            </div>

            {/* Footer Actions */}
            <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
              >
                {isTh ? 'ยกเลิก' : 'Cancel'}
              </button>
              <button
                type="submit"
                className="px-5 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 rounded-lg shadow-md transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <Save size={14} />
                {editingFloc 
                  ? (isTh ? 'บันทึกการแก้ไข' : 'Save Changes') 
                  : (isTh ? 'สร้างโหนด FLOC' : 'Create Node')}
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* =========================================================================
          INTERACTIVE VISUAL PLOT PLAN COORDINATE PICKER MODAL
         ========================================================================= */}
      {isPickerOpen && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-in fade-in duration-200">
          <div 
            className="w-full max-w-4xl bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[95vh]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Picker Header */}
            <div className="px-5 py-3.5 border-b border-slate-800 flex items-center justify-between bg-slate-950/70">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-indigo-500/20 text-indigo-400 flex items-center justify-center">
                  <Crosshair size={18} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <span>{isTh ? 'คลิกบนผังเพื่อกำหนดพิกัด X/Y' : 'Click on Plot Plan to Pick Coordinates'}</span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/40">
                      {PLANT_REGISTRY[plantId].code}
                    </span>
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    {drawingRef || PLANT_REGISTRY[plantId].drawingRef}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="px-3 py-1 rounded-lg bg-slate-800 border border-slate-700 text-xs font-mono text-cyan-400 font-bold">
                  X: {pickerCoords.x}% | Y: {pickerCoords.y}%
                </div>
                <button
                  type="button"
                  onClick={() => setIsPickerOpen(false)}
                  className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 cursor-pointer"
                >
                  <X size={16} />
                </button>
              </div>
            </div>

            {/* Interactive Canvas */}
            <div className="relative flex-1 overflow-auto p-4 bg-slate-950 flex items-center justify-center min-h-[420px]">
              <div 
                ref={pickerCanvasRef}
                onClick={handleCanvasClick}
                onMouseMove={handleCanvasMouseMove}
                onMouseLeave={() => setPickerHover(null)}
                className="relative cursor-crosshair rounded-xl overflow-hidden shadow-2xl border-2 border-slate-700/80 select-none group"
                style={{ maxHeight: '70vh' }}
              >
                <img 
                  src={activeBlueprint} 
                  alt="Plot Plan Blueprint" 
                  className="w-full h-auto object-contain block max-h-[70vh] pointer-events-none" 
                />

                {/* Animated Picked Marker Pin */}
                <div 
                  className="absolute pointer-events-none -translate-x-1/2 -translate-y-1/2 transition-all duration-150 z-30"
                  style={{ left: `${pickerCoords.x}%`, top: `${pickerCoords.y}%` }}
                >
                  <div className="relative flex flex-col items-center">
                    <span className="absolute -inset-2 rounded-full bg-rose-500/50 animate-ping" />
                    <div className="w-8 h-8 rounded-full bg-rose-600 border-2 border-white shadow-xl flex items-center justify-center text-white">
                      <MapPin size={16} />
                    </div>
                    <div className="mt-1 px-2.5 py-1 rounded-md bg-slate-900/90 border border-slate-700 shadow-xl text-center whitespace-nowrap">
                      <p className="text-[10px] font-bold text-white font-mono">{equipmentTag || name || 'Selected Pin'}</p>
                      <p className="text-[9px] text-rose-400 font-mono font-bold">({pickerCoords.x}%, {pickerCoords.y}%)</p>
                    </div>
                  </div>
                </div>

                {/* Live Mouse Crosshair Guidance */}
                {pickerHover && (
                  <div 
                    className="absolute pointer-events-none -translate-x-1/2 -translate-y-1/2 opacity-75 z-20"
                    style={{ left: `${pickerHover.x}%`, top: `${pickerHover.y}%` }}
                  >
                    <div className="w-6 h-6 rounded-full border border-dashed border-cyan-400 flex items-center justify-center">
                      <div className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Picker Footer */}
            <div className="px-5 py-3 border-t border-slate-800 bg-slate-950/70 flex items-center justify-between">
              <span className="text-xs text-slate-400 flex items-center gap-1.5">
                <Sparkles size={13} className="text-amber-400" />
                <span>{isTh ? 'คลิกที่ใดก็ได้บนภาพเพื่อปักหมุดพิกัด' : 'Click anywhere on blueprint to set coordinate pin'}</span>
              </span>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsPickerOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 cursor-pointer"
                >
                  {isTh ? 'ยกเลิก' : 'Cancel'}
                </button>
                <button
                  type="button"
                  onClick={handleConfirmPickerCoords}
                  className="px-5 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 rounded-lg shadow-lg shadow-indigo-600/30 flex items-center gap-1.5 cursor-pointer"
                >
                  <Check size={14} />
                  <span>{isTh ? 'ยืนยันตำแหน่งนี้ (Confirm Coordinates)' : 'Confirm Coordinates'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
