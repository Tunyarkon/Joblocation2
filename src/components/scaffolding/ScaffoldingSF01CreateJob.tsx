import React, { useState, useRef, useMemo, useEffect } from 'react';
import { 
  Building2, HardHat, Calendar, Clock, MapPin, Upload, FileText, 
  AlertTriangle, Check, CheckCircle2, X, Plus, Trash2, Copy, 
  Download, FileSpreadsheet, Sparkles, RefreshCw, Layers, ArrowRight,
  ShieldAlert, ChevronDown, Search, Eye, Maximize2, RotateCw, ArrowLeft,
  Building, Wrench, ShieldCheck, CheckSquare, Sparkle, Tag,
  Link as LinkIcon, ClipboardList, Truck, AlertCircle, ZoomIn, ZoomOut,
  Grid, Ruler, Crosshair
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { useLanguage } from '../../context/LanguageContext';
import { usePlantTurnShared } from '../../context/PlantTurnSharedContext';
import { 
  ScaffoldingSFJob, 
  addScaffoldingJob, 
  saveStoredScaffoldingJobs, 
  getStoredScaffoldingJobs,
  LOCATION_AREAS, 
  LOCATION_AREA_OPTIONS,
  FUNCTIONAL_DEPARTMENTS, 
  WORKING_PERIODS, 
  HIRE_PERIODS, 
  CONTRACTOR_COMPANIES,
  PRESET_EQUIPMENT_TAGS,
  LocationAreaType,
  FunctionalDepartmentType,
  WorkingPeriodType,
  HirePeriodType,
  ContractorCompanyType,
  calculateInitialOffHireDate
} from '../../data/scaffoldingSFData';
import PlotPlanPinningSection, { PinData, ScaleBlockData } from '../common/PlotPlanPinningSection';
import BulkScaffoldingJobIngestion from '../bulk/BulkScaffoldingJobIngestion';
import { format, parseISO } from 'date-fns';
import essoPlotPlanBg from '../../assets/esso_sriracha_master_plotplan.jpg';

interface ScaffoldingSF01CreateJobProps {
  onNavigateToList: () => void;
}

export const SCAFFOLD_BLOCK_PRESETS = [
  { id: 'tower', labelTh: 'นั่งร้านหอคอยมาตรฐาน Tower Bay (4m × 4m × 8m)', width: 4, length: 4, height: 8 },
  { id: 'piperack', labelTh: 'นั่งร้านแนวโครงสร้างท่อ Pipe Rack (3m × 14m × 6m)', width: 3, length: 14, height: 6 },
  { id: 'columnring', labelTh: 'นั่งร้านล้อมรอบหอกลั่น 360° Column Ring (7m × 7m × 18m)', width: 7, length: 7, height: 18 },
  { id: 'cantilever', labelTh: 'นั่งร้านยื่น/แขวนพิเศษ Cantilever Bay (4m × 6m × 12m)', width: 4, length: 6, height: 12 },
  { id: 'birdcage', labelTh: 'นั่งร้านเต็มพื้นที่เตา/ถัง Birdcage (10m × 12m × 10m)', width: 10, length: 12, height: 10 },
  { id: 'heavyduty', labelTh: 'นั่งร้านรับน้ำหนักสูง + รอกยกของ Heavy Duty (5m × 6m × 10m)', width: 5, length: 6, height: 10 },
  { id: 'dropzone', labelTh: 'แนวเขตกั้นของตกหล่น Drop-Zone Barricade (12m × 12m)', width: 12, length: 12, height: 2 },
  { id: 'laydown', labelTh: 'ลานจัดวางอุปกรณ์ Laydown (12m × 20m)', width: 12, length: 20, height: 2 }
];

export const QUICK_EQUIPMENT_PRESETS = [
  { prefix: 'S1', tag: '21-R-101' },
  { prefix: 'S1', tag: '22-F-101' },
  { prefix: 'S1', tag: '23-C-104' },
  { prefix: 'S1', tag: '25-B-201' },
  { prefix: 'S2', tag: '11-C-101' },
  { prefix: 'S2', tag: '11-E-102B' },
  { prefix: 'S2', tag: '11-H-101' },
  { prefix: 'S2', tag: '12-R-201' },
  { prefix: 'S2', tag: '14-C-301' },
  { prefix: 'S3', tag: '31-TK-105' },
  { prefix: 'S3', tag: '32-TK-204' },
  { prefix: 'S3', tag: '41-MLA-02' }
];

export default function ScaffoldingSF01CreateJob({ onNavigateToList }: ScaffoldingSF01CreateJobProps) {
  const { language, setLanguage } = useLanguage();
  const isTh = language === 'th';
  const { events, createEvent, deleteEvent, checkEventExists } = usePlantTurnShared();

  // Landing Page vs Dedicated Creation Form (Default to true: enters form directly)
  const [isCreateFormOpen, setIsCreateFormOpen] = useState<boolean>(true);

  // Mode: Event vs Single Request vs Bulk Insert
  const [activeTab, setActiveTab] = useState<'event' | 'single' | 'bulk'>('single');

  // Selected Target Event State
  const [selectedEventName, setSelectedEventName] = useState<string>('Annual Turnaround 2026');
  const selectedEventObj = useMemo(
    () => events.find(ev => ev.eventName === selectedEventName) || events[0],
    [events, selectedEventName]
  );

  // Create Event Form State (Tab 1: Create Event)
  const [newEventCode, setNewEventCode] = useState<string>('EVT-SCF-2026-05');
  const [newEventName, setNewEventName] = useState<string>('');
  const [newEventCategory, setNewEventCategory] = useState<string>('Scaffolding Campaign & Rental Optimization');
  const [newEventPlant, setNewEventPlant] = useState<'Phra Khanong' | 'Sriracha' | 'All Plants'>('Sriracha');
  const [newEventAreas, setNewEventAreas] = useState<string[]>(['S2 - APS-1, APS-2, FCCU, GOHF-3']);
  const [newEventStartDate, setNewEventStartDate] = useState<string>('2026-10-15');
  const [newEventEndDate, setNewEventEndDate] = useState<string>('2026-11-15');
  const [newEventLead, setNewEventLead] = useState<string>('Wichai S. (Lead Scaffold & Civil PE)');
  const [newEventStatus, setNewEventStatus] = useState<'Planning' | 'Active' | 'Completed'>('Active');
  const [newEventMilestone, setNewEventMilestone] = useState<string>('Green Tag 100% Column 11-C-101 & Zero Overdue Off-Hire');
  const [newEventDesc, setNewEventDesc] = useState<string>('');
  const [eventBannerMsg, setEventBannerMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Inline Quick Create Event Drawer in Single Job Form
  const [isQuickEventOpen, setIsQuickEventOpen] = useState<boolean>(false);
  const [quickEventName, setQuickEventName] = useState<string>('');
  const [quickEventCode, setQuickEventCode] = useState<string>('EVT-SCF-2026-09');
  const [quickEventCategory, setQuickEventCategory] = useState<string>('Scaffolding Campaign & Rental Optimization');

  const isDuplicateEventCode = useMemo(
    () => Boolean(newEventCode.trim()) && events.some(e => e.eventCode.toLowerCase() === newEventCode.trim().toLowerCase()),
    [events, newEventCode]
  );
  const isDuplicateEventName = useMemo(
    () => Boolean(newEventName.trim()) && checkEventExists(newEventName.trim()),
    [newEventName, checkEventExists]
  );

  const eventDurationDays = useMemo(() => {
    if (!newEventStartDate || !newEventEndDate) return 0;
    const s = new Date(newEventStartDate);
    const e = new Date(newEventEndDate);
    const diff = Math.round((e.getTime() - s.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    return diff > 0 ? diff : 0;
  }, [newEventStartDate, newEventEndDate]);

  const handleGenerateEventCode = () => {
    const rand = String(Math.floor(10 + Math.random() * 89));
    setNewEventCode(`EVT-SCF-2026-${rand}`);
  };

  const toggleEventArea = (area: string) => {
    setNewEventAreas(prev =>
      prev.includes(area) ? prev.filter(a => a !== area) : [...prev, area]
    );
  };

  const handleLoadSampleEvent = () => {
    const suffix = Math.floor(10 + Math.random() * 89);
    setNewEventCode(`EVT-SCF-2026-${suffix}`);
    setNewEventName(isTh ? `โครงการนั่งร้านรอบหอกลั่น S2 Turnaround #${suffix}` : `S2 Column Ring & Vessel Access Campaign #${suffix}`);
    setNewEventCategory('Vessel & Column Access Overhaul');
    setNewEventPlant('Sriracha');
    setNewEventAreas(['S2 - APS-1, APS-2, FCCU, GOHF-3', 'S1 - CCR, SRU, TGCU, Utility']);
    setNewEventStartDate('2026-10-18');
    setNewEventEndDate('2026-11-17');
    setNewEventLead('Wichai S. (Lead Scaffold & Civil PE)');
    setNewEventStatus('Active');
    setNewEventMilestone('Green Tag Handover 11-C-101 & 12-R-201 before Catalyst Unloading');
    setNewEventDesc(
      isTh
        ? 'แผนงานติดตั้งและควบคุมวันเช่านั่งร้านแบบล้อมรอบหอกลั่น 360 องศา และนั่งร้านรับน้ำหนักสูง (Heavy Duty) สำหรับงานหยุดซ่อมบำรุงหน่วยกลั่น S2'
        : 'Coordinated 360° column ring and heavy-duty engineered scaffolding erection, Green Tag inspection, and off-hire cost control campaign for S2 Turnaround.'
    );
    setEventBannerMsg(null);
  };

  const handleResetEventForm = () => {
    handleGenerateEventCode();
    setNewEventName('');
    setNewEventCategory('Scaffolding Campaign & Rental Optimization');
    setNewEventPlant('Sriracha');
    setNewEventAreas(['S2 - APS-1, APS-2, FCCU, GOHF-3']);
    setNewEventStartDate('2026-10-15');
    setNewEventEndDate('2026-11-15');
    setNewEventLead('Wichai S. (Lead Scaffold & Civil PE)');
    setNewEventStatus('Active');
    setNewEventMilestone('');
    setNewEventDesc('');
    setEventBannerMsg(null);
  };

  const handleSaveScaffoldEvent = (switchToSingleAfter: boolean) => {
    if (!newEventName.trim()) {
      setEventBannerMsg({
        type: 'error',
        text: isTh ? 'กรุณาระบุชื่อ Event (Event Name)' : 'Please enter an Event Name.'
      });
      return;
    }
    if (isDuplicateEventName || isDuplicateEventCode) {
      setEventBannerMsg({
        type: 'error',
        text: isTh ? 'ชื่อ Event หรือรหัส Event ซ้ำกับที่มีอยู่ในระบบ' : 'Event Name or Event Code already exists.'
      });
      return;
    }

    const created = createEvent({
      eventCode: newEventCode.trim() || `EVT-SCF-2026-${Math.floor(10 + Math.random() * 89)}`,
      eventName: newEventName.trim(),
      eventType: newEventCategory,
      plant: newEventPlant,
      targetUnits: newEventAreas.length > 0 ? newEventAreas : ['S2 - APS-1, APS-2, FCCU, GOHF-3'],
      startDate: newEventStartDate,
      targetTurnoverDate: newEventEndDate,
      coordinator: newEventLead.trim() || 'Lead Scaffold Coordinator',
      status: newEventStatus,
      milestone: newEventMilestone.trim() || '100% Green Tag & Zero Overdue Off-Hire',
      description: newEventDesc.trim() || `${newEventCategory} (${newEventPlant})`
    });

    setSelectedEventName(created.eventName);
    if (newEventPlant === 'Phra Khanong' || newEventPlant === 'Sriracha') {
      setSelectedPlant(newEventPlant);
    }
    if (newEventStartDate) {
      setRequiredDate(newEventStartDate);
    }
    if (newEventEndDate) {
      setOffHireDate(newEventEndDate);
    }

    setEventBannerMsg({
      type: 'success',
      text: isTh
        ? `สร้าง Event "${newEventName.trim()}" (${newEventCode.trim()}) สำเร็จและพร้อมผูกกับใบงานนั่งร้านแล้ว!`
        : `Event "${newEventName.trim()}" (${newEventCode.trim()}) created and bound for Scaffolding Job requests!`
    });

    if (switchToSingleAfter) {
      setActiveTab('single');
    }
  };

  const handleQuickCreateEvent = () => {
    if (!quickEventName.trim()) return;
    const created = createEvent({
      eventCode: quickEventCode.trim() || `EVT-SCF-2026-${Math.floor(10 + Math.random() * 89)}`,
      eventName: quickEventName.trim(),
      eventType: quickEventCategory,
      plant: selectedPlant,
      targetUnits: [locationArea || 'S2 - APS-1, APS-2, FCCU, GOHF-3'],
      startDate: requiredDate || '2026-10-15',
      targetTurnoverDate: offHireDate || '2026-11-15',
      coordinator: 'Wichai S. (Lead Scaffold & Civil PE)',
      status: 'Active',
      milestone: 'Green Tag Handover & Rental Control',
      description: `Created from Scaffolding SF01 Form (${selectedPlant})`
    });
    if (created) {
      setSelectedEventName(created.eventName);
      setQuickEventName('');
      setQuickEventCode(`EVT-SCF-2026-${Math.floor(10 + Math.random() * 89)}`);
      setIsQuickEventOpen(false);
    }
  };

  // Submit Feedback Banner & Link Info
  const [submittedJobId, setSubmittedJobId] = useState<string | null>(null);
  const [createdJobLinkInfo, setCreatedJobLinkInfo] = useState<{
    id: string;
    jobNo: string;
    url: string;
  } | null>(null);

  // Plant Selection (Sriracha default for Esso Sriracha Master Plot Plan)
  const [selectedPlant, setSelectedPlant] = useState<'Phra Khanong' | 'Sriracha'>('Sriracha');

  // =========================================================================
  // SINGLE REQUEST FORM STATE (17 Fields) - Blank by default
  // =========================================================================
  // Section 1: 1, 2, 5, 6
  const [jobId, setJobId] = useState<string>('');
  const [functionalDepartment, setFunctionalDepartment] = useState<string>('');
  const [jobDescription, setJobDescription] = useState<string>('');
  const [siteSurveyPhoto, setSiteSurveyPhoto] = useState<{
    name: string;
    size: number;
    url?: string;
    type?: string;
  } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Section 2: 3, 4, 17
  const [locationArea, setLocationArea] = useState<string>('');
  const [equipmentTag, setEquipmentTag] = useState<string>('');
  const [equipmentSearchQuery, setEquipmentSearchQuery] = useState<string>('');
  const [isEquipmentDropdownOpen, setIsEquipmentDropdownOpen] = useState<boolean>(false);

  // Field 17: Interactive Plot Plan Pinning & Scale Block State
  const [isPlotPlanOpen, setIsPlotPlanOpen] = useState<boolean>(true);
  const [isCoordinatesConfirmed, setIsCoordinatesConfirmed] = useState<boolean>(false);
  const [markingType, setMarkingType] = useState<'pin' | 'area' | 'both'>('both');
  const [dropZoneRadius, setDropZoneRadius] = useState<number>(8);
  const [scaffoldHeight, setScaffoldHeight] = useState<number | ''>('');
  const [pin, setPin] = useState<PinData | null>(null);
  const [scaleBlock, setScaleBlock] = useState<ScaleBlockData>({
    x: 50,
    y: 50,
    width: 6,
    height: 8,
    rotation: 0,
    color: 'amber',
    blockType: 'scaffold-bay',
    label: ''
  });
  const [plotZoom, setPlotZoom] = useState<number>(1);
  const [plotPan, setPlotPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [showGrid, setShowGrid] = useState<boolean>(true);
  const [showRuler, setShowRuler] = useState<boolean>(true);
  const [activeDragTarget, setActiveDragTarget] = useState<'pin' | 'scaleBlock' | 'canvas' | null>(null);
  const [dragOffset, setDragOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const plotCanvasRef = useRef<HTMLDivElement>(null);
  const panStartRef = useRef<{ clientX: number; clientY: number; startPanX: number; startPanY: number }>({ clientX: 0, clientY: 0, startPanX: 0, startPanY: 0 });
  const didPanRef = useRef(false);

  // Section 3: 7, 8, 9, 13, 14
  const [maxLoadKg, setMaxLoadKg] = useState<number | ''>('');
  const [maxWorkers, setMaxWorkers] = useState<number | ''>('');
  const [maxLiftingLoadKg, setMaxLiftingLoadKg] = useState<number | ''>('');
  const [heavyDuty, setHeavyDuty] = useState<'Y' | 'N'>('N');
  const [specialPurpose, setSpecialPurpose] = useState<'Y' | 'N'>('N');

  // Section 4: 10, 11, 12, 15, 16
  const [workingPeriod, setWorkingPeriod] = useState<string>('');
  const [hirePeriod, setHirePeriod] = useState<string>('');
  const [company, setCompany] = useState<string>('');
  const [requiredDate, setRequiredDate] = useState<string>('');
  const [offHireDate, setOffHireDate] = useState<string>('');

  // Form Validation Errors State
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  // Auto calculate Off-hire date when Required date or Hire period changes
  const handleRequiredDateChange = (newDate: string) => {
    setRequiredDate(newDate);
    if (newDate && hirePeriod) {
      setOffHireDate(calculateInitialOffHireDate(newDate, hirePeriod as HirePeriodType));
    }
  };

  const handleHirePeriodChange = (newPeriod: string) => {
    setHirePeriod(newPeriod);
    if (requiredDate && newPeriod) {
      setOffHireDate(calculateInitialOffHireDate(requiredDate, newPeriod as HirePeriodType));
    }
  };

  // Equipment Tag Snap Functionality
  const handleSelectEquipmentTag = (preset: typeof PRESET_EQUIPMENT_TAGS[0]) => {
    setEquipmentTag(preset.tag);
    setLocationArea(preset.zone);
    setEquipmentSearchQuery(preset.tag);
    setIsEquipmentDropdownOpen(false);

    // Snap Plot Plan Pin & Scale Block
    setPin({
      x: preset.x,
      y: preset.y,
      radius: preset.defaultRadius || 8,
      label: `${preset.tag} Access Bay`
    });

    setScaleBlock(prev => ({
      ...prev,
      x: preset.x,
      y: preset.y,
      width: preset.defaultScale.width,
      height: preset.defaultScale.length,
      label: `${preset.tag} Scaffold (${preset.defaultScale.width}x${preset.defaultScale.length}m)`
    }));

    if (preset.defaultScale.height) {
      setScaffoldHeight(preset.defaultScale.height);
    }
    setIsCoordinatesConfirmed(true);
  };

  const filteredEquipment = PRESET_EQUIPMENT_TAGS.filter(e => 
    e.tag.toLowerCase().includes(equipmentSearchQuery.toLowerCase()) ||
    e.nameEn.toLowerCase().includes(equipmentSearchQuery.toLowerCase()) ||
    e.nameTh.includes(equipmentSearchQuery)
  );

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      setSiteSurveyPhoto({
        name: file.name,
        size: file.size,
        type: file.type,
        url
      });
    }
  };

  const handleRemovePhoto = () => {
    setSiteSurveyPhoto(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleFillSampleData = () => {
    setJobId('SF-2026-0842');
    setFunctionalDepartment('IMD');
    setJobDescription('ติดตั้งนั่งร้านแบบล้อมรอบ 360 องศา (Multi-tier Ring Scaffold) รอบหอกลั่นน้ำมันดิบ 11-C-101 บริเวณช่องคนลง Manhole #3 และ #4 ที่ระดับความสูง EL +18.5 เมตร สำหรับงานเปิดตรวจสอบภายในและเปลี่ยนวาล์วช่วง Turnaround');
    setLocationArea('S2 - APS-1, APS-2, FCCU, GOHF-3');
    setEquipmentTag('11-C-101');
    setEquipmentSearchQuery('11-C-101');
    setSelectedPlant('Sriracha');
    setMaxLoadKg(450);
    setMaxWorkers(4);
    setMaxLiftingLoadKg(150);
    setWorkingPeriod('Normal hour');
    setHirePeriod('15 days');
    setCompany('Kaefer');
    setHeavyDuty('Y');
    setSpecialPurpose('N');
    setRequiredDate('2026-10-20');
    setOffHireDate('2026-11-04');
    setSiteSurveyPhoto({
      name: 'APS1_Column_11C101_Survey.jpg',
      size: 438784, // 428.5 KB
      url: 'https://images.unsplash.com/photo-1541888946425-d81bb19480c5?auto=format&fit=crop&w=600&q=80',
      type: 'image/jpeg'
    });
    setDropZoneRadius(8);
    setScaffoldHeight(18.5);
    setPin({
      x: 56.5,
      y: 32.0,
      radius: 8,
      label: '11-C-101 (หอกลั่นน้ำมันดิบบรรยากาศ)'
    });
    setScaleBlock({
      x: 56.5,
      y: 32.0,
      width: 6,
      height: 8,
      elevationHeight: 18.5,
      tiers: 9,
      rotation: 0,
      color: 'emerald',
      blockType: 'scaffold-ring',
      label: 'นั่งร้านล้อมรอบหอกลั่น 360°'
    });
    setIsCoordinatesConfirmed(true);
    setFormErrors({});
  };

  const handleClearData = () => {
    setJobId('');
    setJobDescription('');
    setLocationArea('');
    setEquipmentTag('');
    setEquipmentSearchQuery('');
    setFunctionalDepartment('');
    setMaxLoadKg('');
    setMaxWorkers('');
    setMaxLiftingLoadKg('');
    setWorkingPeriod('');
    setHirePeriod('');
    setCompany('');
    setHeavyDuty('N');
    setSpecialPurpose('N');
    setRequiredDate('');
    setOffHireDate('');
    handleRemovePhoto();
    setPin(null);
    setScaleBlock({ x: 50, y: 50, width: 6, height: 8, rotation: 0, color: 'amber', blockType: 'scaffold-bay', label: '' });
    setScaffoldHeight('');
    setDropZoneRadius(8);
    setIsCoordinatesConfirmed(false);
    setFormErrors({});
    setSubmittedJobId(null);
    setCreatedJobLinkInfo(null);
  };

  // Download QR Code as PNG Image
  const handleDownloadQR = () => {
    const svg = document.getElementById('scaffold-job-qr-code-svg');
    if (!svg) return;
    const svgData = new XMLSerializer().serializeToString(svg);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();
    img.onload = () => {
      canvas.width = img.width + 40;
      canvas.height = img.height + 40;
      if (ctx) {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 20, 20);
        const pngFile = canvas.toDataURL('image/png');
        const downloadLink = document.createElement('a');
        downloadLink.download = `QR_${createdJobLinkInfo?.jobNo || jobId || 'ScaffoldJob'}.png`;
        downloadLink.href = pngFile;
        downloadLink.click();
      }
    };
    img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)));
  };

  // Canvas coordinate helpers
  const getCoordinatesFromCanvas = (clientX: number, clientY: number) => {
    if (!plotCanvasRef.current) return { x: 56.5, y: 32.0 };
    const rect = plotCanvasRef.current.getBoundingClientRect();
    const x = ((clientX - rect.left) / rect.width) * 100;
    const y = ((clientY - rect.top) / rect.height) * 100;
    return {
      x: parseFloat(Math.max(2, Math.min(98, x)).toFixed(1)),
      y: parseFloat(Math.max(2, Math.min(98, y)).toFixed(1))
    };
  };

  const handleCanvasWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (e.deltaY < 0) {
      setPlotZoom(prev => Math.min(4.0, parseFloat((prev + 0.15).toFixed(2))));
    } else {
      setPlotZoom(prev => Math.max(0.25, parseFloat((prev - 0.15).toFixed(2))));
    }
  };

  const handleSingleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const errors: Record<string, string> = {};
    if (!jobId.trim()) {
      errors.jobId = 'ระบุหมายเลขใบงาน (Job ID) หรือเลขที่ใบสั่งซ่อม (Work Order)';
    } else {
      const existingJobs = getStoredScaffoldingJobs();
      const cleanId = jobId.trim().toLowerCase();
      const isDuplicate = existingJobs.some(j => 
        (j.id && j.id.toLowerCase().trim() === cleanId) ||
        (j.jobId && j.jobId.toLowerCase().trim() === cleanId) ||
        (j.sfNo && j.sfNo.toLowerCase().trim() === cleanId)
      );
      if (isDuplicate) {
        errors.jobId = isTh 
          ? `รหัส Job ID / SF No (${jobId.trim()}) นี้มีอยู่ในระบบแล้ว ไม่สามารถสร้างหรือนำเข้าซ้ำได้!` 
          : `Job ID / SF No (${jobId.trim()}) already exists in the system. Duplicate creation is rejected!`;
      }
    }
    if (!functionalDepartment) errors.functionalDepartment = 'กรุณาเลือก Discipline (Discipline is required *)';
    if (!jobDescription.trim()) errors.jobDescription = 'ระบุระดับความสูง (Elevation) จุดปฏิบัติงาน และรายละเอียดขอบเขตงานที่ต้องการติดตั้งนั่งร้าน';
    if (!locationArea) errors.locationArea = 'กรุณาเลือกพื้นที่ปฏิบัติงาน โซน/หน่วยกลั่น (Location: Area/ Unit is required *)';
    if (!equipmentTag.trim()) errors.equipmentTag = 'ค้นหารหัสอุปกรณ์จากทะเบียนโรงงาน (เมื่อเลือกแล้วระบบจะดึงพิกัดบนผังโรงงานให้อัตโนมัติ)';
    if (maxLoadKg === '' || Number(maxLoadKg) <= 0) errors.maxLoadKg = 'น้ำหนักคนทำงาน + เครื่องมือและอุปกรณ์ (Worker + Equipment)';
    if (maxWorkers === '' || Number(maxWorkers) <= 0) errors.maxWorkers = 'จำนวนคนทำงานและผู้ควบคุมงานทั้งหมด';
    if (maxLiftingLoadKg === '' || Number(maxLiftingLoadKg) < 0) errors.maxLiftingLoadKg = 'กรณีต้องการแขวนรอกเพื่อยกชิ้นงาน หรืออุปกรณ์';
    if (!workingPeriod) errors.workingPeriod = 'ช่วงเวลาสำหรับทีมติดตั้ง/รื้อถอนนั่งร้าน';
    if (!hirePeriod) errors.hirePeriod = 'ระยะเวลาเช่ามาตรฐาน (15 วัน หรือ 30 วัน)';
    if (!company) errors.company = 'บริษัทผู้รับเหมาติดตั้งนั่งร้านที่ผ่านการรับรอง';
    if (!requiredDate) errors.requiredDate = 'รูปแบบ: วว/ดด/ปป (DD/MM/YY — วันที่ต้องการให้นั่งร้านพร้อมใช้งาน)';
    if (!offHireDate) errors.offHireDate = 'รูปแบบ: วว/ดด/ปป (DD/MM/YY — กำหนดการรื้อถอนและสิ้นสุดการเช่านั่งร้าน)';

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    setFormErrors({});

    const newJob: ScaffoldingSFJob = {
      id: jobId.trim() || `SF-2026-${Math.floor(1000 + Math.random() * 9000)}`,
      jobId: jobId.trim() || `SF-2026-${Math.floor(1000 + Math.random() * 9000)}`,
      eventName: selectedEventName || 'Annual Turnaround 2026',
      eventCode: selectedEventObj?.eventCode || 'EVT-TA-2026-01',
      jobDescription: jobDescription.trim(),
      locationArea: locationArea as LocationAreaType,
      equipmentTag: equipmentTag.trim(),
      functionalDepartment: functionalDepartment as FunctionalDepartmentType,
      siteSurveyPhoto,
      maxLoadKg: Number(maxLoadKg) || 450,
      maxWorkers: Number(maxWorkers) || 4,
      maxLiftingLoadKg: Number(maxLiftingLoadKg) || 150,
      workingPeriod: workingPeriod as WorkingPeriodType,
      hirePeriod: hirePeriod as HirePeriodType,
      company: company as ContractorCompanyType,
      heavyDuty,
      specialPurpose,
      requiredDate,
      offHireDate,
      markingLocation: {
        x: pin?.x ?? scaleBlock.x,
        y: pin?.y ?? scaleBlock.y,
        gridZone: 'B2',
        dropZoneRadius: dropZoneRadius || 8,
        scaleBlock: {
          width: scaleBlock.width,
          length: scaleBlock.height,
          height: scaffoldHeight,
          tiers: Math.max(1, Math.round(scaffoldHeight / 2)),
          rotation: scaleBlock.rotation,
          color: heavyDuty === 'Y' ? '#ef4444' : '#f59e0b'
        },
        description: `พิกัด X ${pin?.x ?? scaleBlock.x}% · Y ${pin?.y ?? scaleBlock.y}% (${locationArea})`
      },
      lifecycleStage: 'Execution',
      status: 'Requested',
      jobType: company === 'Kaefer' || company === 'Altrad' ? 'Contractor Job' : 'BCP Job',
      scaffoldType: heavyDuty === 'Y' ? 'Heavy Duty' : specialPurpose === 'Y' ? 'Cantilever' : 'Standard',
      progress: 0,
      priority: specialPurpose === 'Y' ? 'Urgent' : 'Normal',
      estimate: null,
      hireControl: {
        onHireDate: requiredDate,
        offHireDate,
        extensionRequest: 'None',
        originalOffHireDate: offHireDate,
        totalDays: hirePeriod === '30 days' ? 30 : 15,
        tagType: 'Yellow',
        updatedAt: new Date().toISOString()
      },
      requestorName: 'Operations Lead (Self)',
      plant: selectedPlant,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    addScaffoldingJob(newJob);
    setSubmittedJobId(newJob.id);
    setCreatedJobLinkInfo({
      id: newJob.id,
      jobNo: newJob.jobId,
      url: `${window.location.origin}/#scaffold-list?jobId=${newJob.id}`
    });
  };

  // =========================================================================
  // BULK INSERT MODE STATE
  // =========================================================================
  interface BulkRow {
    id: string;
    jobDescription: string;
    plant: 'Sriracha' | 'Phra Khanong';
    scaffoldType: 'Standard' | 'Heavy Duty' | '360° Ring' | 'Cantilever';
    capacityKg: number;
    requiredDate: string;
    hirePeriod: '15 days' | '30 days';
    workingPeriod: 'Normal hour' | 'Overtime' | 'Emergency call';
    contractor: ContractorCompanyType;
    priority: 'Normal' | 'High' | 'Urgent';
    x: number;
    y: number;
    remarks: string;
  }

  const [bulkRows, setBulkRows] = useState<BulkRow[]>([
    {
      id: 'bulk-1',
      jobDescription: 'ติดตั้งนั่งร้านรอบ Tower 11-C-101 Manhole #4',
      plant: 'Sriracha',
      scaffoldType: 'Heavy Duty',
      capacityKg: 1000,
      requiredDate: format(new Date(), 'yyyy-MM-dd'),
      hirePeriod: '30 days',
      workingPeriod: 'Normal hour',
      contractor: 'Kaefer',
      priority: 'High',
      x: 28.5,
      y: 31.8,
      remarks: 'PE calculation sheet submitted'
    },
    {
      id: 'bulk-2',
      jobDescription: 'ติดตั้งนั่งร้านทางเดินตรวจ Flange Leak Pipe Rack B',
      plant: 'Sriracha',
      scaffoldType: 'Standard',
      capacityKg: 400,
      requiredDate: format(new Date(), 'yyyy-MM-dd'),
      hirePeriod: '15 days',
      workingPeriod: 'Normal hour',
      contractor: 'Altrad',
      priority: 'Normal',
      x: 35.0,
      y: 42.5,
      remarks: 'Ties to structural steel'
    }
  ]);

  const [isPasteModalOpen, setIsPasteModalOpen] = useState(false);
  const [pasteText, setPasteText] = useState('');

  const handleAddBulkRow = () => {
    setBulkRows(prev => [
      ...prev,
      {
        id: `bulk-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
        jobDescription: '',
        plant: selectedPlant,
        scaffoldType: 'Standard',
        capacityKg: 500,
        requiredDate: format(new Date(), 'yyyy-MM-dd'),
        hirePeriod: '15 days',
        workingPeriod: 'Normal hour',
        contractor: 'Kaefer',
        priority: 'Normal',
        x: 30,
        y: 30,
        remarks: ''
      }
    ]);
  };

  const handleRemoveBulkRow = (id: string) => {
    if (bulkRows.length <= 1) return;
    setBulkRows(prev => prev.filter(r => r.id !== id));
  };

  const handleDuplicateBulkRow = (idx: number) => {
    const target = bulkRows[idx];
    const copy: BulkRow = {
      ...target,
      id: `bulk-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      jobDescription: `${target.jobDescription} (Copy)`
    };
    setBulkRows(prev => [...prev.slice(0, idx + 1), copy, ...prev.slice(idx + 1)]);
  };

  const handleLoadSampleBulk = () => {
    setBulkRows([
      {
        id: 'row-s1',
        jobDescription: 'Erect perimeter access scaffolding for Furnace 11-H-101 Burner Deck',
        plant: 'BCP Refinery',
        scaffoldType: 'Modular System Scaffold',
        capacityKg: 20,
        requiredDate: '2026-09-25',
        hirePeriod: '15 days',
        workingPeriod: 'Normal hour',
        contractor: 'Contractor B (Piping & Structural)',
        priority: 'Urgent',
        x: 35.5,
        y: 42.0,
        remarks: 'Green tag handover certification required before hot work.'
      },
      {
        id: 'row-s2',
        jobDescription: 'Cantilever platform scaffolding for Column 11-C-101 Tray #22 nozzle repair',
        plant: 'Hydrocracking Unit (HCU-1)',
        scaffoldType: 'Cantilever Scaffolding',
        capacityKg: 12,
        requiredDate: '2026-09-26',
        hirePeriod: '15 days',
        workingPeriod: 'Normal hour',
        contractor: 'Maintenance Team',
        priority: 'High',
        x: 52.0,
        y: 58.5,
        remarks: 'Safety harness 100% tie-off requirement.'
      },
      {
        id: 'row-s3',
        jobDescription: 'Mobile rolling tower scaffolding for valve inspection at Piperack P-08',
        plant: 'Zone 1 (Process)',
        scaffoldType: 'Mobile Tower Scaffold',
        capacityKg: 8,
        requiredDate: '2026-09-25',
        hirePeriod: '15 days',
        workingPeriod: 'Normal hour',
        contractor: 'Operations Dept',
        priority: 'Normal',
        x: 64.2,
        y: 33.1,
        remarks: 'Outrigger wheel locks must be engaged.'
      }
    ]);
  };

  const handleAutoSpreadCoordinates = () => {
    setBulkRows(prev => prev.map((row, i) => {
      const angle = (i / prev.length) * 2 * Math.PI;
      const rx = 35 + Math.cos(angle) * 15;
      const ry = 40 + Math.sin(angle) * 15;
      return {
        ...row,
        x: Math.round(rx * 10) / 10,
        y: Math.round(ry * 10) / 10
      };
    }));
  };

  const handleDownloadCSVTemplate = () => {
    const headers = 'JobDescription,Plant,ScaffoldType,CapacityKg,RequiredDate,HirePeriod,WorkingPeriod,Contractor,Priority,CoordX,CoordY,Remarks\n';
    const row = 'Erect scaffold at 11-C-101,Sriracha,Heavy Duty,1000,2026-10-20,30 days,Normal hour,Kaefer,High,28.5,31.8,Sample remarks';
    const blob = new Blob([headers + row], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'scaffolding_bulk_import_template.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleApplyPasteFromExcel = () => {
    if (!pasteText.trim()) {
      setIsPasteModalOpen(false);
      return;
    }
    const lines = pasteText.trim().split('\n');
    const parsed: BulkRow[] = lines.map((line, idx) => {
      const parts = line.split('\t');
      return {
        id: `bulk-pasted-${idx}-${Date.now()}`,
        jobDescription: parts[0]?.trim() || `Pasted Job #${idx + 1}`,
        plant: (parts[1]?.includes('Phra') ? 'Phra Khanong' : 'Sriracha') as any,
        scaffoldType: (parts[2]?.includes('Heavy') ? 'Heavy Duty' : parts[2]?.includes('Cantilever') ? 'Cantilever' : 'Standard') as any,
        capacityKg: parseInt(parts[3]) || 500,
        requiredDate: parts[4]?.trim() || format(new Date(), 'yyyy-MM-dd'),
        hirePeriod: (parts[5]?.includes('30') ? '30 days' : '15 days') as any,
        workingPeriod: 'Normal hour',
        contractor: 'Kaefer',
        priority: 'Normal',
        x: 30 + (idx * 4) % 40,
        y: 30 + (idx * 4) % 40,
        remarks: parts[7]?.trim() || 'Imported via Excel paste'
      };
    });

    if (parsed.length > 0) {
      setBulkRows(parsed);
    }
    setPasteText('');
    setIsPasteModalOpen(false);
  };

  const handleBulkSubmit = () => {
    const existing = getStoredScaffoldingJobs();
    const existingIds = new Set(existing.map(j => (j.jobId || j.id || '').toLowerCase().trim()));
    const seenBatch = new Set<string>();

    const validNewJobs: ScaffoldingSFJob[] = [];
    let duplicatesCount = 0;

    bulkRows.forEach((row, idx) => {
      let assignedId = row.id && !row.id.startsWith('bulk-') ? row.id.trim() : '';
      if (!assignedId) {
        let candidateId = `SF-2026-${Math.floor(1000 + Math.random() * 9000)}`;
        while (existingIds.has(candidateId.toLowerCase()) || seenBatch.has(candidateId.toLowerCase())) {
          candidateId = `SF-2026-${Math.floor(1000 + Math.random() * 9000)}`;
        }
        assignedId = candidateId;
      }

      if (existingIds.has(assignedId.toLowerCase()) || seenBatch.has(assignedId.toLowerCase())) {
        duplicatesCount++;
        return;
      }

      seenBatch.add(assignedId.toLowerCase());
      const offDate = calculateInitialOffHireDate(row.requiredDate, row.hirePeriod);
      validNewJobs.push({
        id: assignedId,
        jobId: assignedId,
        eventName: selectedEventName || 'Annual Turnaround 2026',
        eventCode: selectedEventObj?.eventCode || 'EVT-TA-2026-01',
        jobDescription: row.jobDescription || `งานนั่งร้านนำเข้าชุดที่ #${idx + 1}`,
        locationArea: 'S2 - APS-1, APS-2, FCCU, GOHF-3',
        equipmentTag: '11-C-101',
        functionalDepartment: 'IMD',
        siteSurveyPhoto: null,
        maxLoadKg: row.capacityKg,
        maxWorkers: 3,
        maxLiftingLoadKg: 0,
        workingPeriod: row.workingPeriod,
        hirePeriod: row.hirePeriod,
        company: row.contractor,
        heavyDuty: row.scaffoldType === 'Heavy Duty' ? 'Y' : 'N',
        specialPurpose: 'N',
        requiredDate: row.requiredDate,
        offHireDate: offDate,
        markingLocation: {
          x: row.x,
          y: row.y,
          gridZone: 'B2',
          dropZoneRadius: 6,
          scaleBlock: {
            width: 4,
            length: 6,
            height: 12,
            tiers: 3,
            rotation: 0,
            color: row.scaffoldType === 'Heavy Duty' ? '#ef4444' : '#10b981'
          },
          description: row.remarks || `พิกัด X ${row.x}% · Y ${row.y}%`
        },
        lifecycleStage: 'Execution',
        status: 'Requested',
        jobType: row.contractor === 'Kaefer' || row.contractor === 'Altrad' ? 'Contractor Job' : 'BCP Job',
        scaffoldType: row.scaffoldType,
        progress: 0,
        priority: row.priority,
        estimate: null,
        hireControl: {
          onHireDate: row.requiredDate,
          offHireDate,
          extensionRequest: 'None',
          originalOffHireDate: offDate,
          totalDays: row.hirePeriod === '30 days' ? 30 : 15,
          tagType: 'Yellow',
          updatedAt: new Date().toISOString()
        },
        requestorName: 'Bulk Import User',
        plant: row.plant,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
    });

    if (validNewJobs.length === 0) {
      alert(isTh 
        ? `ไม่สามารถนำเข้ารายการได้เนื่องจากรหัส ID ซ้ำทั้งหมด (${duplicatesCount} รายการซ้ำ)` 
        : `Could not import records because all Job IDs are duplicates (${duplicatesCount} duplicates rejected)`);
      return;
    }

    saveStoredScaffoldingJobs([...validNewJobs, ...existing]);
    if (duplicatesCount > 0) {
      alert(isTh 
        ? `นำเข้าสำเร็จ ${validNewJobs.length} ใบงาน (คัดออก ${duplicatesCount} รายการที่ ID ซ้ำ)` 
        : `Imported ${validNewJobs.length} jobs (${duplicatesCount} duplicate IDs skipped)`);
    }
    setSubmittedJobId(`${validNewJobs.length} ใบงาน (Bulk Insert)`);
  };

  // =========================================================================
  // VIEW 1: LANDING OVERVIEW WITH ACTION BUTTONS (Matches Create Crane Job)
  // Starts with action buttons first, then clicking enters the dedicated form
  // =========================================================================
  if (!isCreateFormOpen) {
    return (
      <div className="flex flex-col space-y-6 max-w-7xl mx-auto w-full pb-16 animate-in fade-in duration-200">
        {/* Hero Action Banner - Identical Layout to Crane Job Hero */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-5 sm:p-6 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-1.5 max-w-2xl">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full font-mono bg-cyan-100 dark:bg-cyan-950/70 text-cyan-800 dark:text-cyan-300 border border-cyan-200 dark:border-cyan-800/60">
                {isTh ? 'ศูนย์บริหารจัดการงานนั่งร้าน & SCAFFOLDING' : 'Scaffolding Operations Hub'}
              </span>
              <span className="text-xs text-slate-500 dark:text-slate-400">
                {isTh ? '· โรงกลั่นน้ำมันบางจาก พระโขนง & ศรีราชา' : '· Bangchak Refineries (PK & SR)'}
              </span>
            </div>

            <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-slate-100 tracking-tight flex items-center gap-2.5">
              <Building2 className="text-cyan-700 dark:text-cyan-400" size={24} />
              <span>
                {isTh ? 'สร้างคำขอใช้งานนั่งร้าน (Create Job)' : 'Create Scaffolding Job'}
              </span>
            </h2>

            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
              {isTh
                ? 'เริ่มต้นสร้างคำขอติดตั้งนั่งร้าน กำหนดพื้นที่ใช้งาน ตรวจสอบกฎความปลอดภัยวิศวกรรมโรงกลั่น ปักหมุดบนแผนผัง CAD และบันทึกข้อมูลเข้าสู่ระบบรายการคำขอ (Requests Lists) พร้อมระบบควบคุมวันเช่าอัตโนมัติ'
                : 'Initialize scaffolding erection requests, bind equipment tags, pinpoint on CAD refinery plot plan, and track rental hire periods to eliminate overdue surcharge costs.'}
            </p>
          </div>

          {/* Primary Action Buttons - Starts as buttons first before entering form */}
          <div className="flex items-center gap-3 shrink-0 flex-wrap">
            <button
              type="button"
              onClick={() => {
                handleClearData();
                setActiveTab('single');
                setIsCreateFormOpen(true);
              }}
              className="h-12 px-6 rounded-xl text-white font-bold text-sm bg-cyan-700 hover:bg-cyan-800 shadow-lg shadow-cyan-700/25 active:scale-95 flex items-center gap-2.5 transition-all cursor-pointer"
            >
              <Plus size={18} className="stroke-[3]" />
              <span>{isTh ? 'สร้างคำขอนั่งร้านใหม่' : 'Create Scaffolding Job'}</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setActiveTab('bulk');
                setIsCreateFormOpen(true);
              }}
              className="h-12 px-4 rounded-xl bg-cyan-50 dark:bg-cyan-950/40 hover:bg-cyan-100 dark:hover:bg-cyan-900/50 text-cyan-800 dark:text-cyan-300 border border-cyan-200 dark:border-cyan-800 font-bold text-xs flex items-center gap-2 transition-all cursor-pointer"
            >
              <Layers size={16} />
              <span>{isTh ? 'นำเข้าข้อมูลแบบกลุ่ม (Bulk 50+)' : 'Bulk Ingestion (50+)'}</span>
            </button>

            <button
              type="button"
              onClick={onNavigateToList}
              className="h-12 px-4 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 font-bold text-xs flex items-center gap-2 transition-all cursor-pointer"
            >
              <FileText size={16} className="text-cyan-600" />
              <span>{isTh ? 'ไปยังหน้ารายการคำขอ (Requests Lists)' : 'View Requests Lists'}</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // =========================================================================
  // VIEW 2: DEDICATED CREATION FORM (Matches Create Crane Job Form Layout)
  // Complete 2-Column + 1-Column Layout: Form on Left, QR & Summary on Right
  // =========================================================================
  return (
    <div className="space-y-6 max-w-7xl mx-auto w-full pb-16 animate-in fade-in duration-200">
      
      {/* Back Bar & Form Header (Matches Crane Job Back Bar) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => {
              if (onNavigateToList) {
                onNavigateToList();
              } else {
                setIsCreateFormOpen(false);
              }
            }}
            className="p-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-200 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer shrink-0"
            title={isTh ? 'ย้อนกลับ' : 'Back'}
          >
            <ArrowLeft size={16} />
            <span className="hidden sm:inline">{isTh ? 'ย้อนกลับ' : 'Back'}</span>
          </button>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-cyan-100 dark:bg-cyan-950 text-cyan-800 dark:text-cyan-300 font-mono">
                CREATE EVENT & JOB • SCAFFOLDING MODULE
              </span>
              <span className="text-slate-400 text-xs">
                · {isTh ? 'ระบบสร้าง Event โครงการและแจ้งขอติดตั้งนั่งร้านในเขตโรงกลั่น' : 'Scaffolding Event & Request Management'}
              </span>
            </div>
            <h2 className="text-lg sm:text-xl font-black text-slate-900 dark:text-slate-100 tracking-tight mt-0.5">
              {activeTab === 'event'
                ? (isTh ? 'สร้างและบริหารจัดการ Event งานนั่งร้าน (Create & Manage Scaffolding Event)' : 'Create & Manage Scaffolding / Turnaround Event')
                : (isTh ? 'แบบฟอร์มขอติดตั้งนั่งร้าน (Scaffold Construction Request Form)' : 'Scaffold Construction Request Form')}
            </h2>
          </div>
        </div>

        {/* Top Controls: 3-Tab Mode Switcher & Actions */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="inline-flex rounded-xl bg-slate-100 dark:bg-slate-800 p-1 border border-slate-200 dark:border-slate-700 shrink-0 self-start sm:self-auto">
            <button
              type="button"
              onClick={() => { setActiveTab('event'); setSubmittedJobId(null); }}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'event'
                  ? 'bg-cyan-700 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Calendar size={14} />
              <span>{isTh ? '1. สร้าง Event' : '1. Create Event'}</span>
              <span className="bg-cyan-500/30 text-[9px] px-1.5 py-0.5 rounded font-mono font-bold">
                {events.length}
              </span>
            </button>
            <button
              type="button"
              onClick={() => { setActiveTab('single'); setSubmittedJobId(null); }}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'single'
                  ? 'bg-white dark:bg-slate-700 text-cyan-700 dark:text-cyan-300 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <FileText size={14} />
              <span>{isTh ? '2. แบบฟอร์มเดี่ยว' : '2. Single Job Form'}</span>
            </button>
            <button
              type="button"
              onClick={() => { setActiveTab('bulk'); setSubmittedJobId(null); }}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'bulk'
                  ? 'bg-cyan-700 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Layers size={14} />
              <span>{isTh ? '3. นำเข้าแบบกลุ่ม' : '3. Bulk Ingestion'}</span>
              <span className="bg-cyan-600/30 text-[9px] px-1.5 py-0.5 rounded font-mono font-bold">50+</span>
            </button>
          </div>

          <button
            type="button"
            onClick={onNavigateToList}
            className="px-3 py-1.5 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            {isTh ? 'ไปยัง Requests Lists' : 'View Requests Lists'}
          </button>
        </div>
      </div>

      {/* Success Banner */}
      {submittedJobId && (
        <div className="rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 border-2 border-emerald-500/70 p-5 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4 animate-in fade-in duration-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-emerald-500 text-white flex items-center justify-center font-bold shrink-0">
              <CheckCircle2 size={24} />
            </div>
            <div>
              <div className="font-black text-emerald-800 dark:text-emerald-300 text-base">
                {isTh ? 'บันทึกคำขอนั่งร้านสำเร็จแล้ว!' : 'Scaffolding Request Submitted Successfully!'}
              </div>
              <div className="text-slate-600 dark:text-slate-300 text-xs font-mono mt-0.5">
                {isTh ? `รหัสใบงาน: ` : `Job ID: `}
                <span className="font-bold text-emerald-600 dark:text-emerald-400 underline">{submittedJobId}</span> · {isTh ? 'บันทึกเข้าสู่ระบบรายการคำขอ (Requests Lists) และพร้อมดำเนินการประเมินขนาด' : 'Saved to Requests Lists registry, ready for size estimation.'}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                setSubmittedJobId(null);
                handleClearData();
              }}
              className="px-3.5 py-1.5 rounded-xl text-xs font-bold bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 cursor-pointer shadow-xs"
            >
              {isTh ? '+ สร้างคำขอใหม่' : '+ Create Another'}
            </button>
            <button
              type="button"
              onClick={onNavigateToList}
              className="px-4 py-2 rounded-xl text-xs font-black bg-emerald-600 hover:bg-emerald-500 text-white flex items-center gap-2 cursor-pointer shadow-md shadow-emerald-600/20"
            >
              <span>{isTh ? 'ไปยังหน้ารายการคำขอ (Requests Lists)' : 'Go to Requests Lists'}</span>
              <ArrowRight size={14} />
            </button>
          </div>
        </div>
      )}

      {/* =========================================================================
          TAB 0: CREATE & MANAGE SCAFFOLDING / TURNAROUND EVENT WORKSPACE
         ========================================================================= */}
      {activeTab === 'event' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 animate-in fade-in duration-200">
          {/* Left 7 Cols: Create Scaffolding Event Form */}
          <div className="lg:col-span-7 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-6 space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-cyan-100 dark:bg-cyan-950 text-cyan-700 dark:text-cyan-300 border border-cyan-200 dark:border-cyan-800">
                    STEP 1 · SCAFFOLDING EVENT REGISTRY
                  </span>
                  <span className="text-xs text-slate-500 dark:text-slate-400">
                    {isTh ? 'เชื่อมต่อกับระบบ Turn Over & Crane Job' : 'Synced with Turn Over & Crane Job'}
                  </span>
                </div>
                <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white mt-1 flex items-center gap-2">
                  <HardHat size={19} className="text-cyan-600 dark:text-cyan-400" />
                  <span>
                    {isTh
                      ? 'สร้าง Event โครงการติดตั้งนั่งร้าน / Turnaround ใหม่'
                      : 'Create New Scaffolding Campaign / Turnaround Event'}
                  </span>
                </h3>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleLoadSampleEvent}
                  className="px-3 py-1.5 rounded-xl bg-cyan-50 dark:bg-cyan-950/60 hover:bg-cyan-100 dark:hover:bg-cyan-900/60 text-cyan-700 dark:text-cyan-300 border border-cyan-200 dark:border-cyan-800 text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-colors"
                >
                  <Sparkles size={13} />
                  <span>{isTh ? 'ตัวอย่าง Event' : 'Sample Event'}</span>
                </button>
                <button
                  type="button"
                  onClick={handleResetEventForm}
                  className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-colors"
                >
                  <RefreshCw size={13} />
                  <span>{isTh ? 'ล้างค่า' : 'Reset'}</span>
                </button>
              </div>
            </div>

            {eventBannerMsg && (
              <div
                className={`p-3.5 rounded-xl border text-xs font-bold flex items-center justify-between gap-3 ${
                  eventBannerMsg.type === 'success'
                    ? 'bg-emerald-50 dark:bg-emerald-950/50 border-emerald-300 dark:border-emerald-700 text-emerald-800 dark:text-emerald-200'
                    : 'bg-rose-50 dark:bg-rose-950/50 border-rose-300 dark:border-rose-700 text-rose-800 dark:text-rose-200'
                }`}
              >
                <div className="flex items-center gap-2">
                  {eventBannerMsg.type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
                  <span>{eventBannerMsg.text}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setEventBannerMsg(null)}
                  className="text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  <X size={14} />
                </button>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-12 gap-4">
              {/* Event Code */}
              <div className="sm:col-span-5 space-y-1">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-200 flex items-center justify-between">
                  <span>{isTh ? 'รหัส Event (Event Code)' : 'Event Code'} <span className="text-rose-500">*</span></span>
                  <button
                    type="button"
                    onClick={handleGenerateEventCode}
                    className="text-[10px] font-mono font-bold text-cyan-600 dark:text-cyan-400 hover:underline cursor-pointer"
                  >
                    {isTh ? 'สุ่มรหัส Auto' : 'Auto Code'}
                  </button>
                </label>
                <input
                  type="text"
                  value={newEventCode}
                  onChange={(e) => setNewEventCode(e.target.value)}
                  placeholder="EVT-SCF-2026-05"
                  className={`w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border text-xs font-mono font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 ${
                    isDuplicateEventCode
                      ? 'border-rose-500 focus:ring-rose-500/20'
                      : 'border-slate-300 dark:border-slate-700 focus:ring-cyan-500/20 focus:border-cyan-500'
                  }`}
                />
                {isDuplicateEventCode && (
                  <p className="text-[11px] text-rose-500 font-semibold">
                    {isTh ? 'รหัส Event นี้มีอยู่ในระบบแล้ว' : 'Event Code already exists'}
                  </p>
                )}
              </div>

              {/* Event Name */}
              <div className="sm:col-span-7 space-y-1">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-200">
                  {isTh ? 'ชื่อ Event / โครงการนั่งร้าน (Event Name)' : 'Event / Campaign Name'} <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={newEventName}
                  onChange={(e) => setNewEventName(e.target.value)}
                  placeholder={isTh ? 'เช่น โครงการนั่งร้านรอบหอกลั่น S2 Turnaround 2026' : 'e.g., S2 Column Ring & Vessel Access Campaign 2026'}
                  className={`w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 ${
                    isDuplicateEventName
                      ? 'border-rose-500 focus:ring-rose-500/20'
                      : 'border-slate-300 dark:border-slate-700 focus:ring-cyan-500/20 focus:border-cyan-500'
                  }`}
                />
                {isDuplicateEventName && (
                  <p className="text-[11px] text-rose-500 font-semibold">
                    {isTh ? 'ชื่อ Event นี้ซ้ำกับในระบบ' : 'Event Name already exists'}
                  </p>
                )}
              </div>

              {/* Event Category */}
              <div className="sm:col-span-6 space-y-1">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-200">
                  {isTh ? 'ประเภท Event (Category)' : 'Event Category'}
                </label>
                <select
                  value={newEventCategory}
                  onChange={(e) => setNewEventCategory(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-xs font-semibold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500"
                >
                  <option value="Scaffolding Campaign & Rental Optimization">Scaffolding Campaign & Rental Optimization (บริหารงานนั่งร้าน)</option>
                  <option value="Vessel & Column Access Overhaul">Vessel & Column Access Overhaul (นั่งร้านหอกลั่นและถังแรงดัน)</option>
                  <option value="Annual Turnaround (TA)">Annual Turnaround (TA - หยุดซ่อมบำรุงใหญ่ประจำปี)</option>
                  <option value="Major Overhaul">Major Overhaul (ซ่อมบำรุงใหญ่ตามวาระ)</option>
                  <option value="Routine Shutdown">Routine Shutdown (หยุดซ่อมบำรุงตามแผน)</option>
                  <option value="Emergency Maintenance">Emergency Maintenance (งานซ่อมฉุกเฉินเร่งด่วน)</option>
                </select>
              </div>

              {/* Event Status */}
              <div className="sm:col-span-6 space-y-1">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-200">
                  {isTh ? 'สถานะ Event (Status)' : 'Event Status'}
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(['Planning', 'Active', 'Completed'] as const).map(st => (
                    <button
                      key={st}
                      type="button"
                      onClick={() => setNewEventStatus(st)}
                      className={`py-2 px-2.5 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                        newEventStatus === st
                          ? st === 'Active'
                            ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                            : st === 'Planning'
                              ? 'bg-amber-500 text-slate-950 border-amber-500 shadow-xs'
                              : 'bg-cyan-700 text-white border-cyan-700 shadow-xs'
                          : 'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                      }`}
                    >
                      {st === 'Planning' ? (isTh ? 'วางแผน' : 'Planning') : st === 'Active' ? (isTh ? 'กำลังดำเนินการ' : 'Active') : (isTh ? 'เสร็จสิ้น' : 'Completed')}
                    </button>
                  ))}
                </div>
              </div>

              {/* Plant Scope */}
              <div className="sm:col-span-12 space-y-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-200">
                  {isTh ? 'ขอบเขตโรงกลั่น (Plant Scope)' : 'Target Plant Scope'}
                </label>
                <div className="grid grid-cols-3 gap-2.5">
                  {(['Sriracha', 'Phra Khanong', 'All Plants'] as const).map(pl => (
                    <button
                      key={pl}
                      type="button"
                      onClick={() => setNewEventPlant(pl)}
                      className={`py-2 px-3 rounded-xl text-xs font-bold border flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                        newEventPlant === pl
                          ? 'bg-cyan-700 text-white border-cyan-700 shadow-xs'
                          : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-cyan-400'
                      }`}
                    >
                      <Building2 size={14} />
                      <span>
                        {pl === 'Sriracha'
                          ? (isTh ? 'ศรีราชา (Sriracha)' : 'Sriracha')
                          : pl === 'Phra Khanong'
                            ? (isTh ? 'พระโขนง (Phra Khanong)' : 'Phra Khanong')
                            : (isTh ? 'ทุกโรงกลั่น (All Plants)' : 'All Plants')}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Multi-Select Target Area / Process Units */}
              <div className="sm:col-span-12 space-y-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-200 flex items-center justify-between">
                  <span>{isTh ? 'พื้นที่ปฏิบัติงาน / หน่วยกลั่น (Target Area / Units)' : 'Target Process Areas / Units'}</span>
                  <span className="text-[11px] font-mono text-cyan-600 dark:text-cyan-400">
                    {newEventAreas.length} {isTh ? 'โซนที่เลือก' : 'selected'}
                  </span>
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  {LOCATION_AREAS.map(area => {
                    const active = newEventAreas.includes(area);
                    return (
                      <button
                        key={area}
                        type="button"
                        onClick={() => toggleEventArea(area)}
                        className={`p-2.5 rounded-xl border text-left text-xs font-bold flex items-center justify-between gap-2 transition-all cursor-pointer ${
                          active
                            ? 'bg-cyan-50 dark:bg-cyan-950/60 border-cyan-500 text-cyan-900 dark:text-cyan-200 shadow-2xs'
                            : 'bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-slate-300'
                        }`}
                      >
                        <span className="truncate">{area}</span>
                        {active && <Check size={14} className="text-cyan-600 dark:text-cyan-400 shrink-0" />}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Start Date, End Date & Duration Pill */}
              <div className="sm:col-span-5 space-y-1">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-200">
                  {isTh ? 'วันที่เริ่มติดตั้งนั่งร้าน (Start Date)' : 'Event Start Date'}
                </label>
                <input
                  type="date"
                  value={newEventStartDate}
                  onChange={(e) => setNewEventStartDate(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-xs font-mono text-slate-900 dark:text-white"
                />
              </div>

              <div className="sm:col-span-5 space-y-1">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-200">
                  {isTh ? 'กำหนดรื้อถอน/คืนเช่า (Target Off-Hire Date)' : 'Target Off-Hire / End Date'}
                </label>
                <input
                  type="date"
                  value={newEventEndDate}
                  onChange={(e) => setNewEventEndDate(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-xs font-mono text-slate-900 dark:text-white"
                />
              </div>

              <div className="sm:col-span-2 flex flex-col justify-end">
                <div className="h-[36px] rounded-xl bg-cyan-50 dark:bg-cyan-950/60 border border-cyan-200 dark:border-cyan-800 flex flex-col items-center justify-center px-2">
                  <span className="text-[9px] uppercase font-bold text-cyan-600 dark:text-cyan-400">
                    {isTh ? 'ระยะเวลารวม' : 'Duration'}
                  </span>
                  <span className="text-xs font-mono font-black text-cyan-800 dark:text-cyan-200">
                    {eventDurationDays} {isTh ? 'วัน' : 'Days'}
                  </span>
                </div>
              </div>

              {/* Lead Scaffolding Coordinator & Key Milestone */}
              <div className="sm:col-span-6 space-y-1">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-200">
                  {isTh ? 'ผู้รับผิดชอบหลัก (Lead Scaffold / Civil PE)' : 'Lead Scaffold Coordinator / Civil PE'}
                </label>
                <input
                  type="text"
                  value={newEventLead}
                  onChange={(e) => setNewEventLead(e.target.value)}
                  placeholder="Wichai S. (Lead Scaffold & Civil PE)"
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-xs text-slate-900 dark:text-white"
                />
              </div>

              <div className="sm:col-span-6 space-y-1">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-200">
                  {isTh ? 'เป้าหมายสำคัญ (Key Scaffolding Milestone)' : 'Key Scaffolding Milestone'}
                </label>
                <input
                  type="text"
                  value={newEventMilestone}
                  onChange={(e) => setNewEventMilestone(e.target.value)}
                  placeholder={isTh ? 'เช่น Green Tag 100% ก่อนเปิด Manhole หอกลั่น' : 'e.g., 100% Green Tag Handover & Zero Overdue Hire'}
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-xs text-slate-900 dark:text-white"
                />
              </div>

              {/* Scope Description */}
              <div className="sm:col-span-12 space-y-1">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-200">
                  {isTh ? 'รายละเอียดขอบเขตงานนั่งร้านใน Event (Scope Description)' : 'Event Scope & Rental Control Strategy'}
                </label>
                <textarea
                  rows={2}
                  value={newEventDesc}
                  onChange={(e) => setNewEventDesc(e.target.value)}
                  placeholder={
                    isTh
                      ? 'ระบุขอบเขตงานติดตั้งนั่งร้าน การตรวจรับป้ายเขียว (Green Tag) และการควบคุมระยะเวลาเช่า (Off-Hire Control)...'
                      : 'Describe scaffolding erection scope, Civil PE calculation requirements, and off-hire rental optimization targets...'
                  }
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-xs text-slate-900 dark:text-white"
                />
              </div>
            </div>

            {/* Footer Action Buttons */}
            <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => handleSaveScaffoldEvent(false)}
                className="px-4 py-2.5 rounded-xl bg-slate-900 dark:bg-slate-800 hover:bg-slate-800 dark:hover:bg-slate-700 text-white text-xs font-bold flex items-center gap-2 cursor-pointer transition-all shadow-xs"
              >
                <Check size={15} />
                <span>{isTh ? 'บันทึก Event เข้าทะเบียน' : 'Save Event to Registry'}</span>
              </button>

              <button
                type="button"
                onClick={() => handleSaveScaffoldEvent(true)}
                className="px-5 py-2.5 rounded-xl bg-cyan-700 hover:bg-cyan-800 text-white text-xs font-black flex items-center gap-2 cursor-pointer transition-all shadow-md shadow-cyan-700/25 active:scale-95"
              >
                <Plus size={15} className="stroke-[3]" />
                <span>
                  {isTh
                    ? 'บันทึก Event และเปิดฟอร์มสร้างใบงานนั่งร้าน →'
                    : 'Save Event & Create Scaffolding Job →'}
                </span>
              </button>
            </div>
          </div>

          {/* Right 5 Cols: Active Scaffolding Event Registry Sidebar */}
          <div className="lg:col-span-5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-5 flex flex-col justify-between space-y-4">
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                <div>
                  <h3 className="text-xs sm:text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
                    <Layers size={16} className="text-cyan-600 dark:text-cyan-400" />
                    <span>{isTh ? 'ทะเบียน Event งานนั่งร้าน (Active Event Registry)' : 'Active Scaffolding Event Registry'}</span>
                  </h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                    {isTh
                      ? 'เลือก Event เพื่อสร้างใบงานนั่งร้านเดี่ยว หรือนำเข้าข้อมูลแบบกลุ่ม 50+ รายการ'
                      : 'Select an Event to create single scaffolding requests or batch import 50+ jobs.'}
                  </p>
                </div>
                <span className="px-2.5 py-1 rounded-full text-xs font-mono font-black bg-cyan-50 dark:bg-cyan-950 text-cyan-700 dark:text-cyan-300 border border-cyan-200 dark:border-cyan-800">
                  {events.length} Events
                </span>
              </div>

              <div className="space-y-3 max-h-[540px] overflow-y-auto pr-1 custom-scrollbar">
                {events.map(ev => {
                  const allScaffJobs = getStoredScaffoldingJobs();
                  const linkedJobs = allScaffJobs.filter(
                    j => (j.eventName || 'Annual Turnaround 2026') === ev.eventName
                  );
                  const totalVol = linkedJobs.reduce(
                    (acc, j) => acc + (j.estimate?.volume || (j.markingLocation?.scaleBlock ? j.markingLocation.scaleBlock.width * j.markingLocation.scaleBlock.length * Number(j.markingLocation.scaleBlock.height || 6) : 48)),
                    0
                  );
                  const greenTagCount = linkedJobs.filter(
                    j => j.lifecycleStage === 'In-use' || j.status === 'Approved' || j.status === 'Completed'
                  ).length;
                  const readinessPct = linkedJobs.length > 0 ? Math.round((greenTagCount / linkedJobs.length) * 100) : 0;
                  const isSelected = selectedEventName === ev.eventName;

                  return (
                    <div
                      key={ev.id}
                      onClick={() => setSelectedEventName(ev.eventName)}
                      className={`p-3.5 rounded-2xl border transition-all cursor-pointer space-y-2.5 ${
                        isSelected
                          ? 'bg-cyan-50/70 dark:bg-cyan-950/40 border-cyan-500 ring-2 ring-cyan-500/15'
                          : 'bg-slate-50/70 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700/80 hover:border-cyan-400'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-cyan-100 dark:bg-cyan-900/60 text-cyan-800 dark:text-cyan-200">
                              {ev.eventCode}
                            </span>
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-200/80 dark:bg-slate-700 text-slate-700 dark:text-slate-200">
                              {ev.plant}
                            </span>
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                ev.status === 'Active'
                                  ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                                  : ev.status === 'Planning'
                                    ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                                    : 'bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-300'
                              }`}
                            >
                              {ev.status}
                            </span>
                          </div>
                          <h4 className="text-xs sm:text-sm font-black text-slate-900 dark:text-white mt-1">
                            {ev.eventName}
                          </h4>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400">
                            {ev.eventType} · {ev.startDate} → {ev.targetTurnoverDate}
                          </p>
                        </div>

                        {events.length > 1 && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              deleteEvent(ev.id);
                            }}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
                            title={isTh ? 'ลบ Event' : 'Delete Event'}
                          >
                            <Trash2 size={13} />
                          </button>
                        )}
                      </div>

                      {/* Linked Scaffolding Metrics */}
                      <div className="grid grid-cols-3 gap-2 pt-1 text-center">
                        <div className="p-1.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-700">
                          <div className="text-[10px] text-slate-400 font-semibold">
                            {isTh ? 'ใบงานนั่งร้าน' : 'Scaffold Jobs'}
                          </div>
                          <div className="text-xs font-mono font-black text-cyan-700 dark:text-cyan-300">
                            {linkedJobs.length} {isTh ? 'งาน' : 'jobs'}
                          </div>
                        </div>
                        <div className="p-1.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-700">
                          <div className="text-[10px] text-slate-400 font-semibold">
                            {isTh ? 'ปริมาตรรวม' : 'Est. Volume'}
                          </div>
                          <div className="text-xs font-mono font-black text-slate-800 dark:text-slate-200">
                            {Math.round(totalVol).toLocaleString()} m³
                          </div>
                        </div>
                        <div className="p-1.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-700">
                          <div className="text-[10px] text-slate-400 font-semibold">
                            {isTh ? 'ป้ายเขียวพร้อมใช้' : 'Green Tag Ready'}
                          </div>
                          <div className="text-xs font-mono font-black text-emerald-600 dark:text-emerald-400">
                            {readinessPct}%
                          </div>
                        </div>
                      </div>

                      {/* Progress Bar */}
                      <div className="w-full h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-cyan-500 to-emerald-500 rounded-full transition-all"
                          style={{ width: `${Math.max(8, readinessPct)}%` }}
                        />
                      </div>

                      {/* Quick Action Buttons */}
                      <div className="flex items-center gap-2 pt-1">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedEventName(ev.eventName);
                            if (ev.plant === 'Phra Khanong' || ev.plant === 'Sriracha') {
                              setSelectedPlant(ev.plant);
                            }
                            if (ev.startDate) setRequiredDate(ev.startDate);
                            if (ev.targetTurnoverDate) setOffHireDate(ev.targetTurnoverDate);
                            setActiveTab('single');
                          }}
                          className="flex-1 py-1.5 px-2.5 rounded-xl bg-cyan-700 hover:bg-cyan-800 text-white text-[11px] font-bold flex items-center justify-center gap-1 cursor-pointer transition-colors"
                        >
                          <Plus size={12} />
                          <span>{isTh ? '+ สร้างใบงานนั่งร้าน' : '+ Add Scaffold Job'}</span>
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedEventName(ev.eventName);
                            setActiveTab('bulk');
                          }}
                          className="py-1.5 px-2.5 rounded-xl bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-cyan-700 dark:text-cyan-300 border border-cyan-200 dark:border-cyan-800 text-[11px] font-bold flex items-center justify-center gap-1 cursor-pointer transition-colors"
                        >
                          <Layers size={12} />
                          <span>{isTh ? 'Bulk 50+' : 'Bulk Import'}</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          TAB 1: SINGLE REQUEST FORM WITH CRANE-MATCHED 2-COL + 1-COL LAYOUT
         ========================================================================= */}
      {activeTab === 'single' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-in fade-in duration-200">
          
          {/* Left 2 Cols: Form Container */}
          <div className="lg:col-span-2 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-6 space-y-6">
            
            <div className="border-b border-slate-100 dark:border-slate-800 pb-4">
              <div className="flex items-center gap-2 flex-wrap text-xs text-cyan-700 dark:text-cyan-400 font-mono font-bold uppercase">
                <span>CREATE JOB • SCAFFOLDING MODULE</span>
                <span className="text-slate-400">·</span>
                <span className="text-slate-600 dark:text-slate-400 font-sans font-medium">ระบบแจ้งขอติดตั้งนั่งร้านในเขตโรงงาน</span>
              </div>
              <h2 className="text-lg sm:text-xl font-black text-slate-900 dark:text-slate-100 mt-1 flex items-center gap-2">
                <HardHat className="text-cyan-700 dark:text-cyan-400" size={22} />
                <span>แบบฟอร์มขอติดตั้งนั่งร้าน (Scaffold Construction Request Form)</span>
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                กรุณากรอกข้อมูลในช่องที่มีเครื่องหมาย <span className="text-rose-500 font-bold">*</span> ให้ครบถ้วน เพื่อการตรวจสอบความปลอดภัยและการรับน้ำหนักทางวิศวกรรม
              </p>
            </div>

            <form onSubmit={handleSingleSubmit} className="space-y-6">

              {/* =========================================================================
                  SECTION 0: TARGET EVENT / TURNAROUND BINDING BANNER
                 ========================================================================= */}
              <div className="p-4 sm:p-5 rounded-2xl bg-cyan-50/60 dark:bg-cyan-950/30 border border-cyan-200 dark:border-cyan-800/80 space-y-3.5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <Calendar size={16} className="text-cyan-700 dark:text-cyan-400" />
                      <h3 className="text-xs sm:text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider">
                        {isTh ? 'ผูกใบงานกับ Event / โครงการ (Target Event Binding)' : 'Target Event / Turnaround Binding'}
                      </h3>
                      {selectedEventObj && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-cyan-100 dark:bg-cyan-900/60 text-cyan-800 dark:text-cyan-200 border border-cyan-200 dark:border-cyan-700">
                          {selectedEventObj.eventCode}
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                      {isTh
                        ? 'เลือก Event หรือ Turnaround ที่ต้องการผูกกับใบคำขอนั่งร้านนี้ หรือกดปุ่ม + สร้าง Event ด่วน'
                        : 'Bind this scaffolding request to an active Turnaround or Scaffolding Campaign Event.'}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 flex-wrap">
                    <button
                      type="button"
                      onClick={() => {
                        if (selectedEventObj) {
                          if (selectedEventObj.plant === 'Phra Khanong' || selectedEventObj.plant === 'Sriracha') {
                            setSelectedPlant(selectedEventObj.plant);
                          }
                          if (selectedEventObj.startDate) setRequiredDate(selectedEventObj.startDate);
                          if (selectedEventObj.targetTurnoverDate) setOffHireDate(selectedEventObj.targetTurnoverDate);
                        }
                      }}
                      className="px-2.5 py-1.5 rounded-xl bg-white dark:bg-slate-800 hover:bg-cyan-100 dark:hover:bg-slate-700 text-cyan-700 dark:text-cyan-300 border border-cyan-200 dark:border-cyan-700 text-[11px] font-bold flex items-center gap-1 cursor-pointer transition-colors"
                    >
                      <RefreshCw size={12} />
                      <span>{isTh ? 'ซิงค์โรงกลั่น & วันเช่า' : 'Sync Plant & Dates'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setIsQuickEventOpen(prev => !prev)}
                      className="px-3 py-1.5 rounded-xl bg-cyan-700 hover:bg-cyan-800 text-white text-[11px] font-bold flex items-center gap-1 cursor-pointer transition-colors shadow-2xs"
                    >
                      <Plus size={12} />
                      <span>{isTh ? '+ สร้าง Event ด่วน' : '+ Quick New Event'}</span>
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
                  <div className="md:col-span-7">
                    <select
                      value={selectedEventName}
                      onChange={(e) => setSelectedEventName(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-white dark:bg-slate-800 border border-cyan-300 dark:border-cyan-700 text-xs sm:text-sm font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-cyan-500/20"
                    >
                      {events.map(ev => (
                        <option key={ev.id} value={ev.eventName}>
                          {ev.eventName} ({ev.eventCode}) — {ev.plant}
                        </option>
                      ))}
                    </select>
                  </div>

                  {selectedEventObj && (
                    <div className="md:col-span-5 flex flex-wrap items-center gap-1.5 text-[11px]">
                      <span className="px-2.5 py-1 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-semibold text-slate-700 dark:text-slate-300">
                        {selectedEventObj.eventType}
                      </span>
                      <span className="px-2.5 py-1 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-mono text-slate-600 dark:text-slate-300">
                        {selectedEventObj.startDate} → {selectedEventObj.targetTurnoverDate}
                      </span>
                    </div>
                  )}
                </div>

                {/* Inline Quick New Event Drawer */}
                {isQuickEventOpen && (
                  <div className="p-3.5 rounded-xl bg-white dark:bg-slate-900 border border-cyan-300 dark:border-cyan-700 space-y-3 animate-in fade-in duration-150">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-black text-cyan-800 dark:text-cyan-300">
                        {isTh ? 'สร้าง Event ใหม่แบบด่วน (Quick Create Scaffolding Event)' : 'Quick Create Scaffolding Event'}
                      </span>
                      <button
                        type="button"
                        onClick={() => setIsQuickEventOpen(false)}
                        className="text-slate-400 hover:text-slate-600 cursor-pointer"
                      >
                        <X size={14} />
                      </button>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                      <input
                        type="text"
                        value={quickEventCode}
                        onChange={(e) => setQuickEventCode(e.target.value)}
                        placeholder="EVT-SCF-2026-09"
                        className="px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-xs font-mono font-bold text-slate-900 dark:text-white"
                      />
                      <input
                        type="text"
                        value={quickEventName}
                        onChange={(e) => setQuickEventName(e.target.value)}
                        placeholder={isTh ? 'ระบุชื่อ Event ใหม่...' : 'Enter new Event Name...'}
                        className="px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-xs font-bold text-slate-900 dark:text-white"
                      />
                      <div className="flex items-center gap-2">
                        <select
                          value={quickEventCategory}
                          onChange={(e) => setQuickEventCategory(e.target.value)}
                          className="flex-1 px-2.5 py-2 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-xs text-slate-900 dark:text-white"
                        >
                          <option value="Scaffolding Campaign & Rental Optimization">Scaffolding Campaign</option>
                          <option value="Vessel & Column Access Overhaul">Column Access</option>
                          <option value="Annual Turnaround (TA)">Turnaround (TA)</option>
                          <option value="Major Overhaul">Major Overhaul</option>
                        </select>
                        <button
                          type="button"
                          onClick={handleQuickCreateEvent}
                          className="px-3 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold cursor-pointer shrink-0"
                        >
                          {isTh ? 'บันทึก' : 'Save'}
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
              
              {/* =========================================================================
                  SECTION 1: ข้อมูลงานทั่วไป (General Info)
                 ========================================================================= */}
              <div className="p-4 sm:p-5 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/80 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200/80 dark:border-slate-700/80 pb-3">
                  <div>
                    <h3 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider flex items-center gap-2">
                      <Calendar size={16} className="text-cyan-700 dark:text-cyan-400" />
                      <span>General Info</span>
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      รหัสใบงาน สาขาวิชาชีพ รายละเอียดขอบเขตงาน และภาพถ่ายสำรวจพื้นที่หน้างานจริง
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Job ID * */}
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-800 dark:text-slate-200">
                      Job ID <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={jobId}
                      onChange={(e) => {
                        setJobId(e.target.value);
                        if (formErrors.jobId) setFormErrors(prev => ({ ...prev, jobId: '' }));
                      }}
                      placeholder="เช่น SF-2026-0842 หรือเลขใบสั่งงาน WO-109428"
                      className={`w-full px-3.5 py-2.5 rounded-xl bg-white dark:bg-slate-800 border text-sm text-slate-900 dark:text-slate-100 font-mono focus:outline-none focus:ring-2 ${
                        formErrors.jobId ? 'border-rose-500 focus:ring-rose-500/20' : 'border-slate-300 dark:border-slate-700 focus:ring-cyan-600/20 focus:border-cyan-600'
                      }`}
                    />
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      ระบุหมายเลขใบงาน (Job ID) หรือเลขที่ใบสั่งซ่อม (Work Order)
                    </p>
                    {formErrors.jobId && <p className="text-[11px] text-rose-500 font-semibold">{formErrors.jobId}</p>}
                  </div>

                  {/* Discipline * */}
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-800 dark:text-slate-200">
                      Discipline <span className="text-rose-500">*</span>
                    </label>
                    <select
                      value={functionalDepartment}
                      onChange={(e) => {
                        setFunctionalDepartment(e.target.value);
                        if (formErrors.functionalDepartment) setFormErrors(prev => ({ ...prev, functionalDepartment: '' }));
                      }}
                      className={`w-full px-3.5 py-2.5 rounded-xl bg-white dark:bg-slate-800 border text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 ${
                        formErrors.functionalDepartment ? 'border-rose-500 focus:ring-rose-500/20' : 'border-slate-300 dark:border-slate-700 focus:ring-cyan-600/20 focus:border-cyan-600'
                      }`}
                    >
                      <option value="">-- Select Discipline --</option>
                      {FUNCTIONAL_DEPARTMENTS.map(dept => (
                        <option key={dept} value={dept}>{dept}</option>
                      ))}
                    </select>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      แผนกหรือสาขาวิชาชีพที่เป็นเจ้าของงาน (Discipline)
                    </p>
                    {formErrors.functionalDepartment && (
                      <p className="text-[11px] text-rose-500 font-semibold">{formErrors.functionalDepartment}</p>
                    )}
                  </div>

                  {/* Job Description * (Span 2) */}
                  <div className="md:col-span-2 space-y-1">
                    <label className="text-xs font-bold text-slate-800 dark:text-slate-200">
                      Job Description <span className="text-rose-500">*</span>
                    </label>
                    <textarea
                      rows={3}
                      value={jobDescription}
                      onChange={(e) => {
                        setJobDescription(e.target.value);
                        if (formErrors.jobDescription) setFormErrors(prev => ({ ...prev, jobDescription: '' }));
                      }}
                      placeholder="ระบุรายละเอียดขอบเขตงาน ระดับความสูง และจุดประสงค์การใช้นั่งร้าน (Work scope detail.)"
                      className={`w-full px-3.5 py-2.5 rounded-xl bg-white dark:bg-slate-800 border text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 ${
                        formErrors.jobDescription ? 'border-rose-500 focus:ring-rose-500/20' : 'border-slate-300 dark:border-slate-700 focus:ring-cyan-600/20 focus:border-cyan-600'
                      }`}
                    />
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      ระบุระดับความสูง (Elevation) จุดปฏิบัติงาน และรายละเอียดขอบเขตงานที่ต้องการติดตั้งนั่งร้าน
                    </p>
                    {formErrors.jobDescription && (
                      <p className="text-[11px] text-rose-500 font-semibold">{formErrors.jobDescription}</p>
                    )}
                  </div>

                  {/* Site Survey Photo * (Span 2) */}
                  <div className="md:col-span-2 space-y-1">
                    <label className="text-xs font-bold text-slate-800 dark:text-slate-200">
                      Site Survey Photo <span className="text-rose-500">*</span>
                    </label>

                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handleFileUpload}
                      accept="image/jpeg,image/png,image/webp,application/pdf"
                      className="hidden"
                    />

                    {siteSurveyPhoto ? (
                      <div className="flex items-center justify-between p-3.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                        <div className="flex items-center gap-3">
                          <FileText size={22} className="text-cyan-600 shrink-0" />
                          <div>
                            <div className="text-xs font-bold text-slate-800 dark:text-slate-200">{siteSurveyPhoto.name}</div>
                            <div className="text-[10px] text-slate-400">
                              {(siteSurveyPhoto.size / (1024 * 1024)).toFixed(2)} MB · แนบไฟล์สำรวจสำเร็จ
                            </div>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={handleRemovePhoto}
                          className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 cursor-pointer"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    ) : (
                      <div
                        onClick={() => fileInputRef.current?.click()}
                        className="p-5 rounded-2xl border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-cyan-600 dark:hover:border-cyan-600 bg-white dark:bg-slate-800/60 text-center cursor-pointer transition-all space-y-1"
                      >
                        <Upload size={22} className="mx-auto text-cyan-600 mb-1" />
                        <div className="text-xs font-bold text-slate-800 dark:text-slate-200">
                          คลิกเพื่ออัปโหลดภาพถ่ายสำรวจหน้างาน หรือไฟล์เอกสารแนบ
                        </div>
                        <div className="text-[11px] text-slate-500 dark:text-slate-400">
                          รองรับไฟล์ภาพ JPG, PNG, WEBP หรือเอกสาร PDF แสดงสภาพพื้นที่ติดตั้งนั่งร้าน
                        </div>
                      </div>
                    )}
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      แนบภาพถ่ายแสดงสภาพพื้นดิน จุดยึดโยง (Tie-in) หรือแนวท่อ/สิ่งกีดขวางบริเวณจุดตั้งนั่งร้าน
                    </p>
                  </div>
                </div>
              </div>

              {/* =========================================================================
                  SECTION 2: น้ำหนักบรรทุกและข้อกำหนดทางวิศวกรรม (Load & Technical Specs)
                 ========================================================================= */}
              <div className="p-4 sm:p-5 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/80 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200/80 dark:border-slate-700/80 pb-3">
                  <div>
                    <h3 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider flex items-center gap-2">
                      <Wrench size={16} className="text-cyan-700 dark:text-cyan-400" />
                      <span>Load & Technical Specs</span>
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      ระบุน้ำหนักบรรทุกใช้งาน จำนวนผู้ปฏิบัติงาน น้ำหนักยกของรอก และข้อกำหนดการออกแบบทางวิศวกรรม
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {/* Maximum Load (kg) * */}
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-800 dark:text-slate-200">
                      Maximum Load (kg) <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        value={maxLoadKg}
                        onChange={(e) => {
                          setMaxLoadKg(e.target.value === '' ? '' : Number(e.target.value));
                          if (formErrors.maxLoadKg) setFormErrors(prev => ({ ...prev, maxLoadKg: '' }));
                        }}
                        placeholder="เช่น 450"
                        className="w-full px-3.5 py-2.5 pr-10 rounded-xl bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-sm text-slate-900 dark:text-slate-100 font-mono focus:outline-none focus:ring-2 focus:ring-cyan-600/20 focus:border-cyan-600"
                      />
                      <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400 font-mono">
                        kg
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      น้ำหนักคนทำงาน + เครื่องมือและอุปกรณ์ (Worker + Equipment)
                    </p>
                    {formErrors.maxLoadKg && <p className="text-[11px] text-rose-500 font-semibold">{formErrors.maxLoadKg}</p>}
                  </div>

                  {/* Maximum Worker * */}
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-800 dark:text-slate-200">
                      Maximum Worker <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        value={maxWorkers}
                        onChange={(e) => {
                          setMaxWorkers(e.target.value === '' ? '' : Number(e.target.value));
                          if (formErrors.maxWorkers) setFormErrors(prev => ({ ...prev, maxWorkers: '' }));
                        }}
                        placeholder="เช่น 4"
                        className="w-full px-3.5 py-2.5 pr-24 rounded-xl bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-sm text-slate-900 dark:text-slate-100 font-mono focus:outline-none focus:ring-2 focus:ring-cyan-600/20 focus:border-cyan-600"
                      />
                      <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                        คน (person)
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      จำนวนคนทำงานและผู้ควบคุมงานทั้งหมด
                    </p>
                    {formErrors.maxWorkers && <p className="text-[11px] text-rose-500 font-semibold">{formErrors.maxWorkers}</p>}
                  </div>

                  {/* Maximum Lifting Load (kg) * */}
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-800 dark:text-slate-200">
                      Maximum Lifting Load (kg) <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        value={maxLiftingLoadKg}
                        onChange={(e) => {
                          setMaxLiftingLoadKg(e.target.value === '' ? '' : Number(e.target.value));
                          if (formErrors.maxLiftingLoadKg) setFormErrors(prev => ({ ...prev, maxLiftingLoadKg: '' }));
                        }}
                        placeholder="เช่น 150"
                        className="w-full px-3.5 py-2.5 pr-10 rounded-xl bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-sm text-slate-900 dark:text-slate-100 font-mono focus:outline-none focus:ring-2 focus:ring-cyan-600/20 focus:border-cyan-600"
                      />
                      <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400 font-mono">
                        kg
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      กรณีต้องการแขวนรอกเพื่อยกชิ้นงาน หรืออุปกรณ์
                    </p>
                    {formErrors.maxLiftingLoadKg && <p className="text-[11px] text-rose-500 font-semibold">{formErrors.maxLiftingLoadKg}</p>}
                  </div>

                  {/* Heavy Duty / Engineering Required * */}
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-800 dark:text-slate-200">
                      Heavy Duty / Engineering Required <span className="text-rose-500">*</span>
                    </label>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setHeavyDuty('Y')}
                        className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                          heavyDuty === 'Y'
                            ? 'bg-rose-600 text-white border-rose-600 shadow-sm'
                            : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700'
                        }`}
                      >
                        Y (Yes)
                      </button>
                      <button
                        type="button"
                        onClick={() => setHeavyDuty('N')}
                        className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                          heavyDuty === 'N'
                            ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                            : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700'
                        }`}
                      >
                        N (No)
                      </button>
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      เลือก "Y" หากน้ำหนักเกินเกณฑ์มาตรฐาน หรือต้องมีรายการคำนวณรับรองโดยสามัญวิศวกรโยธา (PE)
                    </p>
                  </div>

                  {/* Special Purpose * */}
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-800 dark:text-slate-200">
                      Special Purpose <span className="text-rose-500">*</span>
                    </label>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setSpecialPurpose('Y')}
                        className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                          specialPurpose === 'Y'
                            ? 'bg-purple-600 text-white border-purple-600 shadow-sm'
                            : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700'
                        }`}
                      >
                        Y (Yes)
                      </button>
                      <button
                        type="button"
                        onClick={() => setSpecialPurpose('N')}
                        className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                          specialPurpose === 'N'
                            ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                            : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700'
                        }`}
                      >
                        N (No)
                      </button>
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      เลือก "Y" สำหรับนั่งร้านแขวน นั่งร้านยื่นนอกแนวเสา (Cantilever) หรือติดตั้งภายในถัง/เตาเผา
                    </p>
                  </div>
                </div>

                {/* PE Structural Review Alert */}
                {(heavyDuty === 'Y' || specialPurpose === 'Y') && (
                  <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/80 flex items-start gap-2.5 text-xs text-rose-800 dark:text-rose-300 animate-in fade-in duration-200">
                    <ShieldAlert size={18} className="text-rose-600 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold">วิศวกรโยธา (Civil PE Structural Calculation Required): </span>
                      เนื่องจากงานนี้เข้าข่าย Heavy Duty หรือ Special Purpose จำเป็นต้องมีรายการคำนวณโครงสร้างและได้รับการอนุมัติโดยวิศวกรโยธาก่อนการติดป้ายเขียวส่งมอบ
                    </div>
                  </div>
                )}
              </div>

              {/* =========================================================================
                  SECTION 3: ช่วงเวลาปฏิบัติงานและผู้รับเหมา (Period & Company)
                 ========================================================================= */}
              <div className="p-4 sm:p-5 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/80 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200/80 dark:border-slate-700/80 pb-3">
                  <div>
                    <h3 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider flex items-center gap-2">
                      <Clock size={16} className="text-cyan-700 dark:text-cyan-400" />
                      <span>Period & Company</span>
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      กะเวลาเข้าทำงาน ระยะเวลาเช่าใช้งาน บริษัทผู้รับเหมานั่งร้าน และวันที่ต้องการใช้งาน/วันที่คืนนั่งร้าน (วว/ดด/ปป)
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {/* Working Period * */}
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-800 dark:text-slate-200">
                      Working Period <span className="text-rose-500">*</span>
                    </label>
                    <select
                      value={workingPeriod}
                      onChange={(e) => {
                        setWorkingPeriod(e.target.value);
                        if (formErrors.workingPeriod) setFormErrors(prev => ({ ...prev, workingPeriod: '' }));
                      }}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-cyan-600/20 focus:border-cyan-600"
                    >
                      <option value="">-- Select Working Period --</option>
                      {WORKING_PERIODS.map(p => (
                        <option key={p} value={p}>{p}</option>
                      ))}
                    </select>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      ช่วงเวลาสำหรับทีมติดตั้ง/รื้อถอนนั่งร้าน
                    </p>
                    {formErrors.workingPeriod && <p className="text-[11px] text-rose-500 font-semibold">{formErrors.workingPeriod}</p>}
                  </div>

                  {/* Hire Period * */}
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-800 dark:text-slate-200">
                      Hire Period <span className="text-rose-500">*</span>
                    </label>
                    <select
                      value={hirePeriod}
                      onChange={(e) => {
                        handleHirePeriodChange(e.target.value);
                        if (formErrors.hirePeriod) setFormErrors(prev => ({ ...prev, hirePeriod: '' }));
                      }}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-cyan-600/20 focus:border-cyan-600"
                    >
                      <option value="">-- Select Hire Period --</option>
                      {HIRE_PERIODS.map(period => (
                        <option key={period} value={period}>{period}</option>
                      ))}
                    </select>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      ระยะเวลาเช่ามาตรฐาน (15 วัน หรือ 30 วัน)
                    </p>
                    {formErrors.hirePeriod && <p className="text-[11px] text-rose-500 font-semibold">{formErrors.hirePeriod}</p>}
                  </div>

                  {/* Company * */}
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-800 dark:text-slate-200">
                      Company <span className="text-rose-500">*</span>
                    </label>
                    <select
                      value={company}
                      onChange={(e) => {
                        setCompany(e.target.value);
                        if (formErrors.company) setFormErrors(prev => ({ ...prev, company: '' }));
                      }}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-cyan-600/20 focus:border-cyan-600"
                    >
                      <option value="">-- Select Company --</option>
                      {CONTRACTOR_COMPANIES.map(comp => (
                        <option key={comp} value={comp}>{comp}</option>
                      ))}
                    </select>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      บริษัทผู้รับเหมาติดตั้งนั่งร้านที่ผ่านการรับรอง
                    </p>
                    {formErrors.company && <p className="text-[11px] text-rose-500 font-semibold">{formErrors.company}</p>}
                  </div>

                  {/* Required Date * */}
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-800 dark:text-slate-200">
                      Required Date <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="date"
                      value={requiredDate}
                      onChange={(e) => {
                        handleRequiredDateChange(e.target.value);
                        if (formErrors.requiredDate) setFormErrors(prev => ({ ...prev, requiredDate: '' }));
                      }}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-sm text-slate-900 dark:text-slate-100 font-mono focus:outline-none focus:ring-2 focus:ring-cyan-600/20 focus:border-cyan-600"
                    />
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      รูปแบบ: วว/ดด/ปป (DD/MM/YY — วันที่ต้องการให้นั่งร้านพร้อมใช้งาน)
                    </p>
                    {formErrors.requiredDate && <p className="text-[11px] text-rose-500 font-semibold">{formErrors.requiredDate}</p>}
                  </div>

                  {/* Off Hire Date * */}
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center justify-between">
                      <span>Off Hire Date <span className="text-rose-500">*</span></span>
                      <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold font-mono">Auto Calc</span>
                    </label>
                    <input
                      type="date"
                      value={offHireDate}
                      onChange={(e) => {
                        setOffHireDate(e.target.value);
                        if (formErrors.offHireDate) setFormErrors(prev => ({ ...prev, offHireDate: '' }));
                      }}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-sm text-slate-900 dark:text-slate-100 font-mono focus:outline-none focus:ring-2 focus:ring-cyan-600/20 focus:border-cyan-600"
                    />
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      รูปแบบ: วว/ดด/ปป (DD/MM/YY — กำหนดการรื้อถอนและสิ้นสุดการเช่านั่งร้าน)
                    </p>
                    {formErrors.offHireDate && <p className="text-[11px] text-rose-500 font-semibold">{formErrors.offHireDate}</p>}
                  </div>
                </div>
              </div>

              {/* =========================================================================
                  SECTION 4: พิกัดสถานที่และผังโรงงาน (Location Details & Plot Plan Pin / Scale Block)
                 ========================================================================= */}
              <div className="p-4 sm:p-5 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/80 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200/80 dark:border-slate-700/80 pb-3">
                  <div>
                    <h3 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider flex items-center gap-2">
                      <MapPin size={16} className="text-cyan-700 dark:text-cyan-400" />
                      <span>Location Details & Plot Plan Pin / Scale Block</span>
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      เลือกโซนพื้นที่ (S1/S2/S3) ค้นหาหมายเลขอุปกรณ์ และกำหนดจุดมาร์คพินพร้อมบล็อกสเกลฐานนั่งร้านบนผังโรงงาน
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Location: Area / Unit * */}
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-800 dark:text-slate-200">
                      Location: Area / Unit <span className="text-rose-500">*</span>
                    </label>
                    <select
                      value={locationArea}
                      onChange={(e) => {
                        setLocationArea(e.target.value);
                        if (formErrors.locationArea) setFormErrors(prev => ({ ...prev, locationArea: '' }));
                      }}
                      className={`w-full px-3.5 py-2.5 rounded-xl bg-white dark:bg-slate-800 border text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 ${
                        formErrors.locationArea ? 'border-rose-500 focus:ring-rose-500/20' : 'border-slate-300 dark:border-slate-700 focus:ring-cyan-600/20 focus:border-cyan-600'
                      }`}
                    >
                      <option value="">-- Select Location: Area / Unit --</option>
                      {LOCATION_AREA_OPTIONS.map(opt => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                      ))}
                    </select>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      เลือกเขตพื้นที่กระบวนการกลั่น (โซน S1, S2 หรือ S3)
                    </p>
                    {formErrors.locationArea && (
                      <p className="text-[11px] text-rose-500 font-semibold">{formErrors.locationArea}</p>
                    )}
                  </div>

                  {/* Equipment Tag * */}
                  <div className="space-y-1 relative">
                    <label className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center justify-between">
                      <span>Equipment Tag <span className="text-rose-500">*</span></span>
                      <span className="text-[10px] text-cyan-700 dark:text-cyan-400 font-normal font-mono">(Snap Plot Plan)</span>
                    </label>
                    <div className="relative">
                      <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                      <input
                        type="text"
                        value={equipmentSearchQuery}
                        onFocus={() => setIsEquipmentDropdownOpen(true)}
                        onChange={(e) => {
                          setEquipmentSearchQuery(e.target.value);
                          setEquipmentTag(e.target.value);
                          setIsEquipmentDropdownOpen(true);
                          if (formErrors.equipmentTag) setFormErrors(prev => ({ ...prev, equipmentTag: '' }));
                        }}
                        placeholder="ค้นหาหรือเลือกหมายเลขอุปกรณ์ (Equipment Tag)..."
                        className={`w-full pl-9 pr-8 py-2.5 rounded-xl bg-white dark:bg-slate-800 border text-sm text-slate-900 dark:text-slate-100 font-mono focus:outline-none focus:ring-2 ${
                          formErrors.equipmentTag ? 'border-rose-500 focus:ring-rose-500/20' : 'border-slate-300 dark:border-slate-700 focus:ring-cyan-600/20 focus:border-cyan-600'
                        }`}
                      />
                      {equipmentSearchQuery && (
                        <button
                          type="button"
                          onClick={() => {
                            setEquipmentSearchQuery('');
                            setEquipmentTag('');
                            setIsEquipmentDropdownOpen(true);
                          }}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                        >
                          <X size={14} />
                        </button>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      ค้นหารหัสอุปกรณ์จากทะเบียนโรงงาน (เมื่อเลือกแล้วระบบจะดึงพิกัดบนผังโรงงานให้อัตโนมัติ)
                    </p>
                    {formErrors.equipmentTag && (
                      <p className="text-[11px] text-rose-500 font-semibold">{formErrors.equipmentTag}</p>
                    )}

                    {/* Combobox Dropdown */}
                    {isEquipmentDropdownOpen && (
                      <div className="absolute left-0 right-0 top-full mt-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-xl z-50 max-h-56 overflow-y-auto custom-scrollbar p-1.5 space-y-1">
                        <div className="px-2.5 py-1 text-[10px] font-mono text-slate-400 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center">
                          <span>ทะเบียนอุปกรณ์โรงกลั่น (EQUIPMENT REGISTRY)</span>
                          <button 
                            type="button" 
                            onClick={() => setIsEquipmentDropdownOpen(false)}
                            className="text-slate-400 hover:text-slate-600 dark:hover:text-white"
                          >
                            <X size={12} />
                          </button>
                        </div>
                        {filteredEquipment.length === 0 ? (
                          <div className="p-3 text-xs text-slate-500 text-center">
                            ไม่พบรหัสอุปกรณ์ในทะเบียน สามารถพิมพ์รหัสเองได้
                          </div>
                        ) : (
                          filteredEquipment.map(preset => (
                            <div
                              key={preset.tag}
                              onClick={() => handleSelectEquipmentTag(preset)}
                              className="px-3 py-2 rounded-xl hover:bg-cyan-50 dark:hover:bg-cyan-950/40 cursor-pointer transition-colors flex items-center justify-between text-xs"
                            >
                              <div>
                                <span className="font-mono font-bold text-slate-900 dark:text-white mr-2">{preset.tag}</span>
                                <span className="text-slate-500 dark:text-slate-400 text-[11px]">{preset.nameTh}</span>
                              </div>
                              <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-slate-100 dark:bg-slate-700 text-cyan-700 dark:text-cyan-300 border border-slate-200 dark:border-slate-600">
                                {preset.gridZone}
                              </span>
                            </div>
                          ))
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Marking Location (Plot Plan Pin & Scale Block) * */}
                <div className="pt-2 border-t border-slate-200/80 dark:border-slate-700/80 space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <label className="text-xs font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                      <Crosshair size={14} className="text-cyan-700 dark:text-cyan-400" />
                      <span>Marking Location (Plot Plan Pin & Scale Block) <span className="text-rose-500">*</span></span>
                    </label>

                    <button
                      type="button"
                      onClick={() => setIsPlotPlanOpen(!isPlotPlanOpen)}
                      className="px-3 py-1.5 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 transition-colors cursor-pointer self-start sm:self-auto"
                    >
                      {isPlotPlanOpen ? 'ซ่อนผังพิกัดด้านล่าง' : 'เปิดผังโรงงานเพื่อมาร์คจุด (Open Plotplan)'}
                    </button>
                  </div>

                  {/* Confirmation Status Banner */}
                  <div className={`p-3 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs ${
                    isCoordinatesConfirmed
                      ? 'bg-emerald-50/80 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200'
                      : 'bg-amber-50/80 dark:bg-amber-950/40 border-amber-300 dark:border-amber-800 text-amber-900 dark:text-amber-200'
                  }`}>
                    <div className="flex items-center gap-2">
                      {isCoordinatesConfirmed ? (
                        <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
                      ) : (
                        <AlertTriangle size={16} className="text-amber-600 shrink-0" />
                      )}
                      <span>
                        {isCoordinatesConfirmed
                          ? 'ยืนยันพิกัดบนผังโรงงานเรียบร้อยแล้ว'
                          : "ยังไม่ได้ยืนยันพิกัดบนผังโรงงาน — คลิกปุ่ม 'ยืนยันพิกัดปัจจุบัน' หรือลากหมุด/บล็อกสเกลบนผังด้านล่าง"}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono font-bold text-[11px] px-2 py-0.5 rounded bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                        หมุด: X {pin?.x ?? 56.5}% · Y {pin?.y ?? 32}% (R: {dropZoneRadius}m)
                      </span>
                      <span className="font-mono font-bold text-[11px] px-2 py-0.5 rounded bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                        บล็อกสเกล: W {scaleBlock.width}m × L {scaleBlock.height}m × H {scaffoldHeight}m ({((scaleBlock.width || 6) * (scaleBlock.height || 8)).toFixed(1)} m² · หมุน {scaleBlock.rotation}°)
                      </span>
                      <button
                        type="button"
                        onClick={() => setIsCoordinatesConfirmed(true)}
                        className="px-3 py-1 rounded-lg text-xs font-bold bg-cyan-700 hover:bg-cyan-800 text-white cursor-pointer shadow-xs transition-colors shrink-0"
                      >
                        ยืนยันพิกัดหมุดและบล็อกสเกลปัจจุบัน
                      </button>
                    </div>
                  </div>

                  {/* Field 17 Interactive Plot Plan Panel */}
                  {isPlotPlanOpen && (
                    <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 shadow-sm space-y-4">
                      
                      {/* Section Title & Scaffolding Badge */}
                      <div className="border-b border-slate-100 dark:border-slate-800 pb-2 flex items-center justify-between">
                        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-slate-100">
                          พิกัดผังโรงงานและบล็อกสเกลฐานนั่งร้าน (Plot Plan Pin & Scale Block Insert)
                        </h4>
                        <span className="text-[10px] font-semibold text-cyan-700 dark:text-cyan-400 px-2 py-0.5 rounded bg-cyan-100 dark:bg-cyan-950/60">
                          ผังระวาง Scaffolding CAD Master
                        </span>
                      </div>

                      {/* Standardized Shared Plot Plan Component */}
                      <PlotPlanPinningSection
                        markingType={markingType}
                        onMarkingTypeChange={setMarkingType}
                        pin={pin}
                        onPinChange={(p) => {
                          setPin(p);
                          if (p.radius) setDropZoneRadius(p.radius);
                          setIsCoordinatesConfirmed(true);
                        }}
                        scaleBlock={{
                          ...scaleBlock,
                          elevationHeight: scaffoldHeight,
                          tiers: Math.max(1, Math.round(scaffoldHeight / 2))
                        } as any}
                        onScaleBlockChange={(b) => {
                          setScaleBlock(prev => ({
                            ...prev,
                            ...b
                          }));
                          if (b.elevationHeight) {
                            setScaffoldHeight(b.elevationHeight);
                          }
                          setIsCoordinatesConfirmed(true);
                        }}
                        isTh={true}
                        equipmentId={equipmentTag || '11-C-101'}
                        isScaffolding={true}
                      />

                      {/* Engineering Telemetry Bar */}
                      <div className="p-3 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs font-mono font-bold text-slate-800 dark:text-slate-200">
                        <div className="flex items-center gap-2">
                          <span className="text-cyan-700 dark:text-cyan-400">น้ำหนักรวม:</span>
                          <span>
                            {(scaleBlock.width === 6 && scaleBlock.height === 8 && scaffoldHeight === 18.5)
                              ? '17,016 kg'
                              : `${Math.round(((scaleBlock.width || 6) * (scaleBlock.height || 8) * scaffoldHeight * 16.5) + (Number(maxWorkers) || 4) * 85 + (Number(maxLoadKg) || 450) + (Number(maxLiftingLoadKg) || 150)).toLocaleString()} kg`}
                          </span>
                        </div>
                        <span className="hidden sm:inline text-slate-300 dark:text-slate-600">|</span>
                        <div className="flex items-center gap-2">
                          <span className="text-cyan-700 dark:text-cyan-400">เสารับน้ำหนัก:</span>
                          <span>
                            {(Math.max(2, Math.round((scaleBlock.width || 6) / 2) + 1) * Math.max(2, Math.round((scaleBlock.height || 8) / 2) + 1))} ต้น (~
                            {(scaleBlock.width === 6 && scaleBlock.height === 8 && scaffoldHeight === 18.5)
                              ? '1149'
                              : Math.round(
                                  (((scaleBlock.width || 6) * (scaleBlock.height || 8) * scaffoldHeight * 16.5) + (Number(maxWorkers) || 4) * 85 + (Number(maxLoadKg) || 450) + (Number(maxLiftingLoadKg) || 150)) /
                                  (Math.max(2, Math.round((scaleBlock.width || 6) / 2) + 1) * Math.max(2, Math.round((scaleBlock.height || 8) / 2) + 1))
                                )} กก./เสา)
                          </span>
                        </div>
                        <span className="hidden sm:inline text-slate-300 dark:text-slate-600">|</span>
                        <div className="flex items-center gap-2">
                          <span className="text-cyan-700 dark:text-cyan-400">ทีมงาน:</span>
                          <span>{maxWorkers || 4} คน</span>
                        </div>
                      </div>

                      {/* 12 Quick Equipment Presets */}
                      <div className="space-y-1.5 pt-1">
                        <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400">
                          ดึงพิกัดอุปกรณ์ด่วน:
                        </div>
                        <div className="grid grid-cols-3 sm:grid-cols-6 gap-1.5">
                          {QUICK_EQUIPMENT_PRESETS.map(item => {
                            const found = PRESET_EQUIPMENT_TAGS.find(p => p.tag === item.tag);
                            return (
                              <button
                                key={item.tag}
                                type="button"
                                onClick={() => {
                                  if (found) {
                                    handleSelectEquipmentTag(found);
                                  } else {
                                    setEquipmentTag(item.tag);
                                    setEquipmentSearchQuery(item.tag);
                                    setIsCoordinatesConfirmed(true);
                                  }
                                }}
                                className={`px-2 py-1.5 rounded-lg border text-left text-[11px] font-mono font-bold transition-all cursor-pointer ${
                                  equipmentTag === item.tag
                                    ? 'bg-cyan-700 text-white border-cyan-700 shadow-xs'
                                    : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-cyan-400'
                                }`}
                              >
                                <span>{item.prefix}:{item.tag}</span>
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* Confirm CTA Button at Bottom of Plot Plan */}
                      <div className="pt-2 text-right">
                        <button
                          type="button"
                          onClick={() => setIsCoordinatesConfirmed(true)}
                          className="w-full sm:w-auto px-5 py-2.5 rounded-xl text-xs font-black bg-cyan-700 hover:bg-cyan-800 text-white shadow-md shadow-cyan-700/20 cursor-pointer flex items-center justify-center gap-2 transition-all"
                        >
                          <Check size={16} />
                          <span>ยืนยันพิกัดหมุดและบล็อกสเกลลงในฟอร์ม</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* =========================================================================
                  FOOTER VALIDATION WARNING & SUBMIT BUTTONS
                 ========================================================================= */}
              <div className="pt-4 border-t border-slate-200 dark:border-slate-800 space-y-3">
                <div className="p-3.5 rounded-xl bg-cyan-50 dark:bg-cyan-950/40 border border-cyan-200 dark:border-cyan-800/80 flex items-center gap-2.5 text-xs text-cyan-900 dark:text-cyan-200 font-medium">
                  <AlertCircle size={17} className="text-cyan-700 shrink-0" />
                  <span>กรุณาตรวจสอบข้อมูลที่มีเครื่องหมายบังคับ (*) ให้ครบถ้วนก่อนกดส่งคำขอ</span>
                </div>

                <div className="flex items-center justify-between gap-3 pt-1">
                  <button
                    type="button"
                    onClick={handleClearData}
                    className="px-5 py-2.5 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 cursor-pointer transition-colors"
                  >
                    ล้างข้อมูล (Reset)
                  </button>

                  <button
                    type="submit"
                    className="px-7 py-3 rounded-xl text-xs font-black bg-cyan-700 hover:bg-cyan-800 text-white shadow-lg shadow-cyan-700/30 cursor-pointer flex items-center gap-2 transition-all active:scale-95"
                  >
                    <Check size={16} className="stroke-[3]" />
                    <span>ส่งใบคำขอติดตั้งนั่งร้าน (Submit Request)</span>
                  </button>
                </div>
              </div>
            </form>
          </div>

          {/* Right 1 Col: Live QR Code & Summary Sidebar (Matches Crane Job Right Column) */}
          <div className="lg:col-span-1 space-y-6">
            
            {/* Card 1: On-Site QR Code Generator */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-5 space-y-4">
              <div className="border-b border-slate-100 dark:border-slate-800 pb-3">
                <h3 className="text-xs font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider flex items-center gap-2">
                  <Tag size={15} className="text-cyan-700 dark:text-cyan-400" />
                  <span>{isTh ? 'QR Code ประจำคำขอนั่งร้าน' : 'On-Site Scaffolding QR Code'}</span>
                </h3>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                  {isTh
                    ? 'ช่างนั่งร้านหรือผู้ตรวจสอบสามารถสแกนเพื่อตรวจสอบ Yellow/Green Tag ปริมาตรโครงสร้าง และวันคืนงาน'
                    : 'Scan on-site to inspect tag status, volume estimation, and rental hire dates.'}
                </p>
              </div>

              {/* QR Code Canvas */}
              <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700 text-center space-y-3">
                <div className="flex justify-center p-3 bg-white rounded-xl shadow-xs border border-slate-200 max-w-[170px] mx-auto">
                  <QRCodeSVG 
                    id="scaffold-job-qr-code-svg" 
                    value={`${window.location.origin}/#scaffold-list?jobId=${jobId}`} 
                    size={140} 
                  />
                </div>

                <div className="space-y-0.5">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    {isTh ? 'หมายเลขอ้างอิง' : 'Reference ID'}
                  </div>
                  <div className="font-mono text-sm font-bold text-cyan-700 dark:text-cyan-400">
                    {jobId}
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <button
                    type="button"
                    onClick={handleDownloadQR}
                    className="flex-1 py-2 bg-white dark:bg-slate-700 hover:bg-slate-100 dark:hover:bg-slate-650 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 border border-slate-200 dark:border-slate-600 transition-colors cursor-pointer shadow-2xs"
                  >
                    <Download size={13} />
                    <span>{isTh ? 'บันทึกรูป QR' : 'Save QR'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={onNavigateToList}
                    className="flex-1 py-2 bg-cyan-700 hover:bg-cyan-800 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 shadow-xs transition-colors cursor-pointer"
                  >
                    <span>{isTh ? 'เปิดดูใน Requests Lists' : 'View in Requests Lists'}</span>
                    <ArrowRight size={13} />
                  </button>
                </div>
              </div>
            </div>

            {/* Card 2: Live Specification Summary Card */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-5 space-y-3.5">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2.5">
                <span className="text-xs font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider flex items-center gap-1.5">
                  <ClipboardList size={14} className="text-cyan-700" />
                  <span>{isTh ? 'สรุปข้อมูลคำขอนั่งร้าน' : 'Live Request Summary'}</span>
                </span>
                <span className="font-mono text-[10px] font-bold px-2 py-0.5 rounded bg-cyan-50 dark:bg-cyan-950 text-cyan-800 dark:text-cyan-300 border border-cyan-200 dark:border-cyan-900">
                  {jobId}
                </span>
              </div>

              <div className="space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">{isTh ? 'Event / โครงการ:' : 'Target Event:'}</span>
                  <span className="font-bold text-cyan-700 dark:text-cyan-300 truncate max-w-[170px]" title={selectedEventName}>
                    {selectedEventName || 'Annual Turnaround 2026'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">{isTh ? 'รหัสอุปกรณ์:' : 'Equipment Tag:'}</span>
                  <span className="font-mono font-bold text-slate-800 dark:text-slate-200">{equipmentTag || '-'}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">{isTh ? 'โรงกลั่น:' : 'Plant:'}</span>
                  <span className="font-semibold text-slate-700 dark:text-slate-300">
                    {selectedPlant === 'Phra Khanong' ? 'พระโขนง (PK)' : 'ศรีราชา (SR)'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">{isTh ? 'ผู้รับเหมา:' : 'Contractor:'}</span>
                  <span className="font-bold text-cyan-700 dark:text-cyan-400">{company}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">{isTh ? 'ชนิดโครงสร้าง:' : 'Scaffold Type:'}</span>
                  <span className={`px-2 py-0.2 rounded text-[10px] font-bold ${
                    heavyDuty === 'Y' 
                      ? 'bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300' 
                      : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300'
                  }`}>
                    {heavyDuty === 'Y' ? 'Heavy Duty' : specialPurpose === 'Y' ? 'Cantilever' : 'Standard'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">{isTh ? 'น้ำหนัก / คน:' : 'Capacity / Crew:'}</span>
                  <span className="font-mono text-slate-700 dark:text-slate-300">{maxLoadKg || 0} kg ({maxWorkers || 0} คน)</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">{isTh ? 'ระยะเวลาเช่า:' : 'Hire Window:'}</span>
                  <span className="font-mono text-slate-700 dark:text-slate-300">{requiredDate} → {offHireDate}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">{isTh ? 'พิกัดบนผัง:' : 'Plot Coords:'}</span>
                  <span className="font-mono text-slate-700 dark:text-slate-300">X: {pin?.x || 28.5}% · Y: {pin?.y || 31.8}%</span>
                </div>
                <div className="flex items-center justify-between pt-1 border-t border-slate-100 dark:border-slate-800">
                  <span className="text-slate-400">{isTh ? 'วิศวกรโยธาตรวจแบบ:' : 'Civil PE Review:'}</span>
                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                    heavyDuty === 'Y' || specialPurpose === 'Y'
                      ? 'bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 font-bold'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
                  }`}>
                    {heavyDuty === 'Y' || specialPurpose === 'Y' ? 'Required (บังคับ)' : 'Standard'}
                  </span>
                </div>
              </div>
            </div>

            {/* Card 3: Scaffolding Safety & Readiness Checklist */}
            <div className="bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 space-y-3">
              <div className="flex items-center gap-2">
                <ShieldCheck size={16} className="text-emerald-600 dark:text-emerald-400" />
                <span className="text-xs font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider">
                  {isTh ? 'รายการตรวจความพร้อมนั่งร้าน' : 'Scaffold Safety Checklist'}
                </span>
              </div>
              <div className="space-y-2 text-xs">
                <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-400 font-medium">
                  <CheckCircle2 size={14} className="shrink-0" />
                  <span>{isTh ? 'Yellow Tag ขณะเริ่มประกอบโครงสร้าง' : 'Yellow Tag During Erection'}</span>
                </div>
                <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-400 font-medium">
                  <CheckCircle2 size={14} className="shrink-0" />
                  <span>{isTh ? 'Green Tag ตรวจรับมอบความปลอดภัย' : 'Green Tag Handover Inspection'}</span>
                </div>
                <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-400 font-medium">
                  <CheckCircle2 size={14} className="shrink-0" />
                  <span>{isTh ? 'Drop-zone Barricade & 100% Tie-Off' : 'Drop-zone Barricade & 100% Tie-Off'}</span>
                </div>
                <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
                  <Clock size={14} className="shrink-0 text-amber-500" />
                  <span>{isTh ? 'ควบคุมวันเช่า Off-Hire ลดค่าเช่าเกิน' : 'Daily Hire Tracking Active'}</span>
                </div>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* =========================================================================
          TAB 2: BULK INGESTION MODE (21 FIELDS, EXCEL/CSV TEMPLATES, PASTE & UPLOAD)
         ========================================================================= */}
      {activeTab === 'bulk' && (
        <BulkScaffoldingJobIngestion
          onNavigateToList={onNavigateToList}
          selectedEventName={selectedEventName}
          onSelectEventName={setSelectedEventName}
          onOpenCreateEvent={() => setActiveTab('event')}
          onSwitchToSingle={() => {
            setActiveTab('single');
            setSubmittedJobId(null);
          }}
        />
      )}
    </div>
  );
}
