import React, { useState } from 'react';
import { 
  ClipboardList, 
  Search, 
  ChevronDown, 
  Truck, 
  HardHat, 
  Calendar, 
  Clock, 
  CheckCircle2, 
  X, 
  Sparkles,
  ShieldCheck,
  Building,
  RotateCcw,
  ArrowRight,
  Info,
  Paperclip,
  ChevronUp
} from 'lucide-react';
import PlotPlanPinningSection, { PinData, ScaleBlockData } from './common/PlotPlanPinningSection';
import JobAttachmentSection from './common/JobAttachmentSection';
import { JobAttachment, saveJobAttachments } from '../data/jobAttachmentData';
import { useLanguage } from '../context/LanguageContext';

export interface JobRequestData {
  equipmentId: string;
  jobDescription: string;
  functionalLocation: string;
  locationArea: string;
  craneType: 'Crane Pull' | 'Crane Spot';
  craneCapacity: number;
  estimatedDuration: number;
  durationUnit: 'Hours' | 'Days';
  providerType: 'Owner Crane' | 'Contractor Crane';
  startDate?: string;
  startTime?: string;
  priority?: 'Normal' | 'High' | 'Urgent';
}

interface CreateJobRequestProps {
  initialData?: Partial<JobRequestData>;
  onSubmit?: (data: JobRequestData) => void;
  onCancel?: () => void;
  isScaffolding?: boolean;
}

// Preset Data for Dropdowns and Suggestions
export const PRESET_EQUIPMENT = [
  { id: '11-C-101', name: 'Crude Distillation Column', funcLoc: '11-APS1 (Atmospheric Pipestill 1)', area: 'BCP Refinery Area 1' },
  { id: '11-E-101', name: 'Crude Preheat Exchanger Train', funcLoc: '11-APS1 (Atmospheric Pipestill 1)', area: 'BCP Refinery Area 1' },
  { id: '11-E-102B', name: 'Reboiler Exchanger Tube Bundle', funcLoc: '11-APS1 (Atmospheric Pipestill 1)', area: 'BCP Refinery Area 1' },
  { id: '11-P-101A', name: 'Crude Charge Feed Pump', funcLoc: '11-APS1 (Atmospheric Pipestill 1)', area: 'BCP Refinery Area 1' },
  { id: '12-R-101', name: 'Hydrocracker High-Pressure Reactor', funcLoc: '12-HCU (Hydrocracking Unit)', area: 'Zone C Construction & Expansion' },
  { id: '12-C-102', name: 'Vacuum Flasher Tower', funcLoc: '12-HCU (Hydrocracking Unit)', area: 'Zone C Construction & Expansion' },
  { id: '21-B-201', name: 'High Pressure Steam Boiler Unit', funcLoc: '21-UTL (Utilities & Power Generation)', area: 'Workshop & Pre-assembly Yard' },
  { id: '31-TK-01', name: 'Heavy Fuel Oil Storage Tank #01', funcLoc: '31-TNK (Offsite Tank Farm & Wharf)', area: 'Storage Yard Sector B' },
  { id: '41-BERTH-02', name: 'Marine Loading Arm & Jetty Berth 2', funcLoc: '41-JTY (Marine Jetty & Berth)', area: 'Dock Area & Marine Terminal' }
];

export const PRESET_FUNCTIONAL_LOCATIONS = [
  '11-APS1 (Atmospheric Pipestill 1)',
  '12-HCU (Hydrocracking Unit)',
  '13-CRU (Catalytic Reforming Unit)',
  '21-UTL (Utilities & Power Generation)',
  '31-TNK (Offsite Tank Farm & Wharf)',
  '41-JTY (Marine Jetty & Berth)',
  '51-WKS (Central Maintenance Workshop)'
];

export const PRESET_LOCATION_AREAS = [
  'BCP Refinery Area 1',
  'Storage Yard Sector B',
  'Zone C Construction & Expansion',
  'Workshop & Pre-assembly Yard',
  'Dock Area & Marine Terminal',
  'Main Gate Logistics Staging'
];

export default function CreateJobRequest({
  initialData,
  onSubmit,
  onCancel,
  isScaffolding = false
}: CreateJobRequestProps) {
  const { isTh } = useLanguage();

  // Form State - Section 1: General Information
  const [equipmentId, setEquipmentId] = useState(initialData?.equipmentId || '11-C-101');
  const [isEquipmentDropdownOpen, setIsEquipmentDropdownOpen] = useState(false);
  const [jobDescription, setJobDescription] = useState(initialData?.jobDescription || '');
  const [functionalLocation, setFunctionalLocation] = useState(initialData?.functionalLocation || PRESET_FUNCTIONAL_LOCATIONS[0]);
  const [locationArea, setLocationArea] = useState(initialData?.locationArea || PRESET_LOCATION_AREAS[0]);

  // Form State - Section 2: Crane Requirements
  const [craneType, setCraneType] = useState<'Crane Pull' | 'Crane Spot'>(initialData?.craneType || 'Crane Spot');
  const [craneCapacity, setCraneCapacity] = useState<number | string>(initialData?.craneCapacity || 50);
  const [estimatedDuration, setEstimatedDuration] = useState<number | string>(initialData?.estimatedDuration || 8);
  const [durationUnit, setDurationUnit] = useState<'Hours' | 'Days'>(initialData?.durationUnit || 'Hours');
  const [providerType, setProviderType] = useState<'Owner Crane' | 'Contractor Crane'>(initialData?.providerType || 'Owner Crane');

  // Additional Operational Details
  const [startDate, setStartDate] = useState(initialData?.startDate || '2026-09-25');
  const [startTime, setStartTime] = useState(initialData?.startTime || '08:00');
  const [priority, setPriority] = useState<'Normal' | 'High' | 'Urgent'>(initialData?.priority || 'Normal');

  // Section 3: Attachments & Plot Plan Pinning with Pin & Scale Block Insert
  const [showPlotPlanPinning, setShowPlotPlanPinning] = useState(true);
  const [markingType, setMarkingType] = useState<'pin' | 'area' | 'both'>('pin');
  const [jobPin, setJobPin] = useState<PinData | null>({ x: 45.0, y: 50.0, label: initialData?.equipmentId || '11-C-101', radius: 12 });
  const [scaleBlock, setScaleBlock] = useState<ScaleBlockData>({
    x: 45.0,
    y: 50.0,
    width: isScaffolding ? 6 : 10,
    height: isScaffolding ? 8 : 12,
    rotation: 0,
    color: isScaffolding ? 'emerald' : 'amber',
    blockType: isScaffolding ? 'scaffold-bay' : 'crane-footprint',
    label: isScaffolding ? 'Scaffolding Footprint' : 'Crane Outrigger Footprint'
  });
  const [singleAttachments, setSingleAttachments] = useState<JobAttachment[]>([]);

  // UI / Feedback State
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [submittedJobNumber, setSubmittedJobNumber] = useState('');
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  // Filter suggested equipment
  const filteredEquipment = PRESET_EQUIPMENT.filter(item => 
    item.id.toLowerCase().includes(equipmentId.toLowerCase()) ||
    item.name.toLowerCase().includes(equipmentId.toLowerCase())
  );

  const validateForm = () => {
    const errors: Record<string, string> = {};
    if (!equipmentId.trim()) errors.equipmentId = 'Equipment ID is required';
    if (!jobDescription.trim()) errors.jobDescription = 'Job description is required';
    if (!functionalLocation.trim()) errors.functionalLocation = 'Functional location is required';
    if (!locationArea.trim()) errors.locationArea = 'Location/Area is required';
    if (!craneCapacity || Number(craneCapacity) <= 0) errors.craneCapacity = 'Capacity must be greater than 0';
    if (!estimatedDuration || Number(estimatedDuration) <= 0) errors.estimatedDuration = 'Duration must be greater than 0';
    
    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    const requestPayload: JobRequestData = {
      equipmentId: equipmentId.trim(),
      jobDescription: jobDescription.trim(),
      functionalLocation,
      locationArea,
      craneType,
      craneCapacity: Number(craneCapacity) || 50,
      estimatedDuration: Number(estimatedDuration) || 8,
      durationUnit,
      providerType,
      startDate,
      startTime,
      priority
    };

    // Generate reference code
    const randomId = Math.floor(10000 + Math.random() * 90000);
    const generatedJobNo = isScaffolding ? `SF-26${randomId}` : `ICM-26${randomId}`;
    setSubmittedJobNumber(generatedJobNo);

    // Save to localStorage for integration with existing Request List
    try {
      const existingReqs = JSON.parse(localStorage.getItem('crane_custom_job_requests') || '[]');
      const newRecord = {
        id: randomId,
        jobNo: generatedJobNo,
        equipmentId: requestPayload.equipmentId,
        functionalLocation: requestPayload.functionalLocation,
        plant: requestPayload.locationArea,
        description: requestPayload.jobDescription,
        type: `${requestPayload.craneType} (${requestPayload.craneCapacity}T)`,
        craneType: requestPayload.craneType,
        capacity: requestPayload.craneCapacity,
        duration: `${requestPayload.estimatedDuration} ${requestPayload.durationUnit}`,
        providerType: requestPayload.providerType,
        dateFrom: `${requestPayload.startDate} ${requestPayload.startTime}`,
        status: 'Requested',
        contractor: requestPayload.providerType === 'Owner Crane' ? 'BCP Operations (Owner Crane)' : 'Contractor Heavy Lift (Contractor Crane)',
        priority: requestPayload.priority,
        x: markingType === 'area' ? scaleBlock.x : (jobPin ? jobPin.x : 45.0),
        y: markingType === 'area' ? scaleBlock.y : (jobPin ? jobPin.y : 50.0),
        isArea: markingType === 'area',
        width: markingType === 'area' ? scaleBlock.width : 8,
        height: markingType === 'area' ? scaleBlock.height : 6,
        rotation: markingType === 'area' ? scaleBlock.rotation : 0,
        attachments: singleAttachments
      };
      localStorage.setItem('crane_custom_job_requests', JSON.stringify([newRecord, ...existingReqs]));
      if (singleAttachments.length > 0) {
        saveJobAttachments(generatedJobNo, singleAttachments);
        saveJobAttachments(randomId, singleAttachments);
      }
    } catch (err) {
      console.error('Storage error:', err);
    }

    if (onSubmit) {
      onSubmit(requestPayload);
    }

    setIsSubmitted(true);
  };

  const handleResetForm = () => {
    setEquipmentId('11-C-101');
    setJobDescription('');
    setFunctionalLocation(PRESET_FUNCTIONAL_LOCATIONS[0]);
    setLocationArea(PRESET_LOCATION_AREAS[0]);
    setCraneType('Crane Spot');
    setCraneCapacity(50);
    setEstimatedDuration(8);
    setDurationUnit('Hours');
    setProviderType('Owner Crane');
    setStartDate('2026-09-25');
    setStartTime('08:00');
    setPriority('Normal');
    setValidationErrors({});
    setIsSubmitted(false);
  };

  const handleCancelClick = () => {
    if (onCancel) {
      onCancel();
    } else {
      handleResetForm();
    }
  };

  // If submitted successfully, show a neat confirmation state
  if (isSubmitted) {
    return (
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-8 sm:p-10 max-w-3xl mx-auto text-center animate-in fade-in zoom-in-95 duration-200">
        <div className="w-16 h-16 rounded-2xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto mb-5 shadow-xs">
          <CheckCircle2 size={36} />
        </div>
        
        <span className="text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-3 py-1 rounded-full border border-emerald-200 dark:border-emerald-800/60">
          Request Submitted Successfully
        </span>

        <h3 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mt-3 tracking-tight">
          Job Request Registered: <span className="text-blue-600 dark:text-blue-400 font-mono">{submittedJobNumber}</span>
        </h3>
        
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-2 max-w-md mx-auto">
          The job request has been dispatched to plant dispatchers and operations with status <span className="font-semibold text-slate-700 dark:text-slate-200">"Requested"</span>.
        </p>

        {/* Summary Card */}
        <div className="mt-6 p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/60 text-left max-w-lg mx-auto text-xs space-y-2">
          <div className="flex justify-between py-1 border-b border-slate-200 dark:border-slate-700">
            <span className="text-slate-500">Equipment:</span>
            <span className="font-mono font-bold text-slate-800 dark:text-slate-200">{equipmentId}</span>
          </div>
          <div className="flex justify-between py-1 border-b border-slate-200 dark:border-slate-700">
            <span className="text-slate-500">Functional Location:</span>
            <span className="font-medium text-slate-800 dark:text-slate-200">{functionalLocation}</span>
          </div>
          <div className="flex justify-between py-1 border-b border-slate-200 dark:border-slate-700">
            <span className="text-slate-500">Crane Requirement:</span>
            <span className="font-medium text-slate-800 dark:text-slate-200">{craneType} ({craneCapacity} Tons)</span>
          </div>
          <div className="flex justify-between py-1">
            <span className="text-slate-500">Resource Provider:</span>
            <span className="font-bold text-blue-600 dark:text-blue-400">{providerType}</span>
          </div>
        </div>

        <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
          <button
            type="button"
            onClick={handleResetForm}
            className="w-full sm:w-auto px-6 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold transition-all cursor-pointer shadow-xs"
          >
            Create Another Request
          </button>
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-all cursor-pointer shadow-md shadow-blue-500/20 flex items-center justify-center gap-2"
            >
              <span>View All Requests</span>
              <ArrowRight size={14} />
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-4xl mx-auto">
      {/* Neat Card Layout */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden">
        
        {/* ================= HEADER ================= */}
        <div className="border-b border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            {/* Header Icon */}
            <div className="w-11 h-11 rounded-xl bg-blue-100 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0 shadow-xs border border-blue-200 dark:border-blue-900/60">
              <ClipboardList size={22} className="stroke-[2.2]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">
                  Create New Job Request
                </h2>
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-950/80 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-900">
                  {isScaffolding ? 'Scaffolding' : 'Crane Lift'}
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Industrial Plant Heavy Machinery & Equipment Mobilization Form
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => {
                // Quick load demo data
                setEquipmentId('11-E-102B');
                setJobDescription('Lift and position Reboiler Tube Bundle 11-E-102B during Atmospheric Pipestill turnaround maintenance.');
                setFunctionalLocation('11-APS1 (Atmospheric Pipestill 1)');
                setLocationArea('BCP Refinery Area 1');
                setCraneType('Crane Spot');
                setCraneCapacity(85);
                setEstimatedDuration(12);
                setDurationUnit('Hours');
                setProviderType('Contractor Crane');
              }}
              className="text-xs text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-semibold flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-50 dark:bg-blue-950/50 border border-blue-200/80 dark:border-blue-900/50 transition-colors cursor-pointer"
            >
              <Sparkles size={13} />
              <span>Fill Sample</span>
            </button>
          </div>
        </div>

        {/* ================= FORM BODY ================= */}
        <form onSubmit={handleSubmit}>
          <div className="p-6 sm:p-8 space-y-8">

            {/* ================= SECTION 1: GENERAL INFORMATION ================= */}
            <div className="space-y-5">
              <div className="flex items-center gap-2.5 pb-2.5 border-b border-slate-100 dark:border-slate-800">
                <HardHat size={17} className="text-blue-600 dark:text-blue-400 shrink-0" />
                <h3 className="text-xs font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider">
                  Section 1: General Information
                </h3>
              </div>

              {/* 2-Column Grid for General Information */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-5">
                
                {/* 1. Equipment ID */}
                <div className="space-y-1.5 relative">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center justify-between">
                    <span>Equipment ID <span className="text-rose-500">*</span></span>
                    <span className="text-[10px] text-slate-400 font-normal">Search or type</span>
                  </label>
                  <div className="relative">
                    <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                    <input
                      type="text"
                      required
                      value={equipmentId}
                      onChange={(e) => {
                        setEquipmentId(e.target.value);
                        setIsEquipmentDropdownOpen(true);
                      }}
                      onFocus={() => setIsEquipmentDropdownOpen(true)}
                      placeholder="e.g. 11-C-101, 11-E-102B"
                      className={`w-full pl-10 pr-9 py-2.5 rounded-xl border bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-all font-mono placeholder:text-slate-400 ${
                        validationErrors.equipmentId ? 'border-rose-400 ring-1 ring-rose-400' : 'border-slate-300 dark:border-slate-700'
                      }`}
                    />
                    {equipmentId && (
                      <button
                        type="button"
                        onClick={() => {
                          setEquipmentId('');
                          setIsEquipmentDropdownOpen(true);
                        }}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer p-0.5"
                      >
                        <X size={14} />
                      </button>
                    )}
                  </div>

                  {validationErrors.equipmentId && (
                    <p className="text-[11px] text-rose-500 mt-1">{validationErrors.equipmentId}</p>
                  )}

                  {/* Autocomplete / Suggested Equipment Dropdown */}
                  {isEquipmentDropdownOpen && (
                    <>
                      <div 
                        className="fixed inset-0 z-10" 
                        onClick={() => setIsEquipmentDropdownOpen(false)} 
                      />
                      <div className="absolute left-0 right-0 top-full mt-1 z-20 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl max-h-56 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-700/60">
                        <div className="p-2 text-[10px] font-bold text-slate-400 uppercase tracking-wider bg-slate-50 dark:bg-slate-800/90 sticky top-0">
                          Suggested Equipment Database
                        </div>
                        {filteredEquipment.length > 0 ? (
                          filteredEquipment.map((opt) => (
                            <button
                              key={opt.id}
                              type="button"
                              onClick={() => {
                                setEquipmentId(opt.id);
                                setFunctionalLocation(opt.funcLoc);
                                setLocationArea(opt.area);
                                setIsEquipmentDropdownOpen(false);
                              }}
                              className="w-full p-2.5 text-left hover:bg-blue-50 dark:hover:bg-slate-700/60 transition-colors flex items-center justify-between text-xs cursor-pointer group"
                            >
                              <div>
                                <span className="font-mono font-bold text-blue-600 dark:text-blue-400 group-hover:underline">
                                  {opt.id}
                                </span>
                                <span className="text-slate-600 dark:text-slate-300 ml-2 font-medium">
                                  {opt.name}
                                </span>
                              </div>
                              <span className="text-[10px] text-slate-400 font-mono hidden sm:inline">
                                {opt.funcLoc.split(' ')[0]}
                              </span>
                            </button>
                          ))
                        ) : (
                          <div className="p-3 text-xs text-slate-400 text-center">
                            Press Enter or select below to use "{equipmentId}"
                          </div>
                        )}
                      </div>
                    </>
                  )}
                </div>

                {/* 3. Functional Location (Select dropdown styling with search icon) */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block">
                    Functional Location <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                    <select
                      value={functionalLocation}
                      onChange={(e) => setFunctionalLocation(e.target.value)}
                      className={`w-full pl-10 pr-9 py-2.5 rounded-xl border bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-all appearance-none cursor-pointer ${
                        validationErrors.functionalLocation ? 'border-rose-400 ring-1 ring-rose-400' : 'border-slate-300 dark:border-slate-700'
                      }`}
                    >
                      {PRESET_FUNCTIONAL_LOCATIONS.map((loc) => (
                        <option key={loc} value={loc}>
                          {loc}
                        </option>
                      ))}
                    </select>
                    <ChevronDown size={16} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                  </div>
                  {validationErrors.functionalLocation && (
                    <p className="text-[11px] text-rose-500 mt-1">{validationErrors.functionalLocation}</p>
                  )}
                </div>

                {/* 2. Job Description (Full width multi-line textarea approx 4 rows) */}
                <div className="space-y-1.5 col-span-1 md:col-span-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                      Job Description <span className="text-rose-500">*</span>
                    </label>
                    <span className="text-[10px] text-slate-400">
                      Approx. 4 rows • {jobDescription.length} characters
                    </span>
                  </div>
                  <textarea
                    required
                    rows={4}
                    value={jobDescription}
                    onChange={(e) => setJobDescription(e.target.value)}
                    placeholder="Provide a comprehensive job description (e.g. Unbolt and extract heavy tube bundle for Reboiler 11-E-102B, rig and lift across piperack corridor into transport trailer, verify rigging angle and sling load capacity...)"
                    className={`w-full p-3.5 rounded-xl border bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-all leading-relaxed placeholder:text-slate-400 resize-y ${
                      validationErrors.jobDescription ? 'border-rose-400 ring-1 ring-rose-400' : 'border-slate-300 dark:border-slate-700'
                    }`}
                  />
                  {validationErrors.jobDescription && (
                    <p className="text-[11px] text-rose-500 mt-1">{validationErrors.jobDescription}</p>
                  )}
                </div>

                {/* 4. Location / Area (Select dropdown styling with search icon) */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block">
                    Location / Area <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                    <select
                      value={locationArea}
                      onChange={(e) => setLocationArea(e.target.value)}
                      className={`w-full pl-10 pr-9 py-2.5 rounded-xl border bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-all appearance-none cursor-pointer ${
                        validationErrors.locationArea ? 'border-rose-400 ring-1 ring-rose-400' : 'border-slate-300 dark:border-slate-700'
                      }`}
                    >
                      {PRESET_LOCATION_AREAS.map((area) => (
                        <option key={area} value={area}>
                          {area}
                        </option>
                      ))}
                    </select>
                    <ChevronDown size={16} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                  </div>
                  {validationErrors.locationArea && (
                    <p className="text-[11px] text-rose-500 mt-1">{validationErrors.locationArea}</p>
                  )}
                </div>

                {/* Target Execution Schedule Date & Time */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block">
                    Scheduled Start Date & Time <span className="text-rose-500">*</span>
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="relative">
                      <Calendar size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                      <input
                        type="date"
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                        className="w-full pl-8 pr-2.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-all font-mono"
                      />
                    </div>
                    <div className="relative">
                      <Clock size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                      <input
                        type="time"
                        value={startTime}
                        onChange={(e) => setStartTime(e.target.value)}
                        className="w-full pl-8 pr-2.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-all font-mono"
                      />
                    </div>
                  </div>
                </div>

                {/* Priority Level */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block">
                    Priority Level <span className="text-rose-500">*</span>
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {(['Normal', 'High', 'Urgent'] as const).map((p) => (
                      <button
                        key={p}
                        type="button"
                        onClick={() => setPriority(p)}
                        className={`py-2 px-2 rounded-xl text-xs font-bold border transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                          priority === p
                            ? p === 'Urgent'
                              ? 'bg-rose-50 border-rose-500 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300 ring-1 ring-rose-500'
                              : p === 'High'
                              ? 'bg-amber-50 border-amber-500 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 ring-1 ring-amber-500'
                              : 'bg-blue-50 border-blue-500 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300 ring-1 ring-blue-500'
                            : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-slate-400'
                        }`}
                      >
                        <span className={`w-2 h-2 rounded-full ${
                          p === 'Urgent' ? 'bg-rose-500' : p === 'High' ? 'bg-amber-500' : 'bg-blue-500'
                        }`} />
                        {p}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Estimated Duration: Relocated directly under Scheduled Start Date & Time */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block">
                      Estimated Duration <span className="text-rose-500">*</span>
                    </label>
                    <span className="text-[10px] text-slate-400">Duration required</span>
                  </div>
                  <div className={`relative flex rounded-xl border overflow-hidden bg-white dark:bg-slate-800 focus-within:ring-2 focus-within:ring-blue-500/20 focus-within:border-blue-600 transition-all ${
                    validationErrors.estimatedDuration ? 'border-rose-400 ring-1 ring-rose-400' : 'border-slate-300 dark:border-slate-700'
                  }`}>
                    <input
                      type="number"
                      min="1"
                      max="168"
                      required
                      value={estimatedDuration}
                      onChange={(e) => setEstimatedDuration(e.target.value)}
                      placeholder="8"
                      className="w-full px-3.5 py-2.5 text-sm text-slate-900 dark:text-slate-100 bg-transparent focus:outline-none font-bold"
                    />
                    <select
                      value={durationUnit}
                      onChange={(e) => setDurationUnit(e.target.value as 'Hours' | 'Days')}
                      className="bg-slate-100 dark:bg-slate-800/90 border-l border-slate-200 dark:border-slate-700 px-3 text-xs font-bold text-slate-600 dark:text-slate-300 focus:outline-none cursor-pointer"
                    >
                      <option value="Hours">Hours (ชั่วโมง)</option>
                      <option value="Days">Days (วัน)</option>
                    </select>
                  </div>

                  {/* Duration Presets */}
                  <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
                    <span className="text-[10px] text-slate-400 font-mono">Quick:</span>
                    {[
                      { val: 4, label: '4h (ครึ่งวัน)' },
                      { val: 8, label: '8h (1 กะงาน)' },
                      { val: 12, label: '12h (กะยาว)' },
                      { val: 24, label: '24h (1 วัน)' },
                    ].map(item => (
                      <button
                        key={item.val}
                        type="button"
                        onClick={() => {
                          setEstimatedDuration(item.val);
                          setDurationUnit('Hours');
                        }}
                        className={`px-2 py-0.5 rounded text-[10px] font-bold border transition-colors cursor-pointer ${
                          Number(estimatedDuration) === item.val && durationUnit === 'Hours'
                            ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                            : 'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-slate-400'
                        }`}
                      >
                        {item.label}
                      </button>
                    ))}
                  </div>
                </div>

              </div>
            </div>

            {/* ================= SECTION 2: CRANE REQUIREMENTS ================= */}
            <div className="space-y-5 pt-3 border-t border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2.5 pb-2.5 border-b border-slate-100 dark:border-slate-800">
                <Truck size={17} className="text-blue-600 dark:text-blue-400 shrink-0" />
                <h3 className="text-xs font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider">
                  Section 2: Crane Requirements
                </h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-6">

                {/* 5. Crane Type: Radio Button Group (Crane Pull vs Crane Spot) */}
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block">
                    Crane Type <span className="text-rose-500">*</span>
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    
                    {/* Option: Crane Pull */}
                    <label 
                      className={`relative flex items-center p-3 rounded-xl border-2 cursor-pointer transition-all min-h-[64px] ${
                        craneType === 'Crane Pull'
                          ? 'border-blue-600 bg-blue-50/80 dark:bg-blue-950/40 text-blue-950 dark:text-blue-100 ring-2 ring-blue-500/20 shadow-xs'
                          : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 bg-white dark:bg-slate-800/60 text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      <input
                        type="radio"
                        name="craneType"
                        value="Crane Pull"
                        checked={craneType === 'Crane Pull'}
                        onChange={() => setCraneType('Crane Pull')}
                        className="sr-only"
                      />
                      <div className="flex items-center gap-3 min-w-0">
                        <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 ${
                          craneType === 'Crane Pull' ? 'border-blue-600 bg-blue-600' : 'border-slate-400 bg-white dark:bg-slate-800'
                        }`}>
                          {craneType === 'Crane Pull' && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                        </div>
                        <div className="min-w-0">
                          <span className="text-sm font-bold block truncate">Crane Pull</span>
                          <span className="text-[10px] text-slate-500 dark:text-slate-400 block truncate">
                            Traction & Horizontal Pull
                          </span>
                        </div>
                      </div>
                    </label>

                    {/* Option: Crane Spot */}
                    <label 
                      className={`relative flex items-center p-3 rounded-xl border-2 cursor-pointer transition-all min-h-[64px] ${
                        craneType === 'Crane Spot'
                          ? 'border-blue-600 bg-blue-50/80 dark:bg-blue-950/40 text-blue-950 dark:text-blue-100 ring-2 ring-blue-500/20 shadow-xs'
                          : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 bg-white dark:bg-slate-800/60 text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      <input
                        type="radio"
                        name="craneType"
                        value="Crane Spot"
                        checked={craneType === 'Crane Spot'}
                        onChange={() => setCraneType('Crane Spot')}
                        className="sr-only"
                      />
                      <div className="flex items-center gap-3 min-w-0">
                        <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 ${
                          craneType === 'Crane Spot' ? 'border-blue-600 bg-blue-600' : 'border-slate-400 bg-white dark:bg-slate-800'
                        }`}>
                          {craneType === 'Crane Spot' && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                        </div>
                        <div className="min-w-0">
                          <span className="text-sm font-bold block truncate">Crane Spot</span>
                          <span className="text-[10px] text-slate-500 dark:text-slate-400 block truncate">
                            Precision Spotting & Lift
                          </span>
                        </div>
                      </div>
                    </label>

                  </div>
                </div>

                {/* 6. Crane Capacity: Number input with unit suffix "Tons" */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block">
                      Crane Capacity <span className="text-rose-500">*</span>
                    </label>
                    <span className="text-[10px] text-slate-400">Unit: Metric Tons</span>
                  </div>
                  <div className={`relative flex rounded-xl border overflow-hidden bg-white dark:bg-slate-800 focus-within:ring-2 focus-within:ring-blue-500/20 focus-within:border-blue-600 transition-all ${
                    validationErrors.craneCapacity ? 'border-rose-400 ring-1 ring-rose-400' : 'border-slate-300 dark:border-slate-700'
                  }`}>
                    <input
                      type="number"
                      min="1"
                      max="1200"
                      required
                      value={craneCapacity}
                      onChange={(e) => setCraneCapacity(e.target.value)}
                      placeholder="50"
                      className="w-full px-3.5 py-2.5 text-sm text-slate-900 dark:text-slate-100 bg-transparent focus:outline-none font-bold"
                    />
                    <span className="inline-flex items-center px-4 bg-slate-100 dark:bg-slate-800/90 border-l border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-600 dark:text-slate-300 shrink-0">
                      Tons
                    </span>
                  </div>

                  {/* Capacity Presets */}
                  <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
                    <span className="text-[10px] text-slate-400 font-mono">Presets:</span>
                    {['25', '50', '80', '100', '300'].map((cap) => (
                      <button
                        key={cap}
                        type="button"
                        onClick={() => setCraneCapacity(Number(cap))}
                        className={`px-2 py-0.5 rounded text-[10px] font-bold border transition-colors cursor-pointer ${
                          Number(craneCapacity) === Number(cap)
                            ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                            : 'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-slate-400'
                        }`}
                      >
                        {cap}T
                      </button>
                    ))}
                  </div>
                </div>

                {/* 7. Resource / Provider Type: Visually Appealing Selection Cards with Thai options */}
                <div className="space-y-2 col-span-1 md:col-span-2">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block">
                    Resource / Provider Type <span className="text-rose-500">*</span>
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    
                    {/* Thai Option 1: Owner Crane (เครนของเจ้าของงาน) */}
                    <label 
                      className={`relative flex items-start p-3 rounded-xl border cursor-pointer transition-all ${
                        providerType === 'Owner Crane'
                          ? 'border-blue-600 bg-blue-50/60 dark:bg-blue-950/30 text-blue-950 dark:text-blue-100 ring-1 ring-blue-600 shadow-xs'
                          : 'border-slate-300 dark:border-slate-700 hover:border-slate-400 bg-white dark:bg-slate-800/60 text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      <input
                        type="radio"
                        name="providerType"
                        value="Owner Crane"
                        checked={providerType === 'Owner Crane'}
                        onChange={() => setProviderType('Owner Crane')}
                        className="sr-only"
                      />
                      <div className="flex items-start gap-2.5 w-full">
                        <div className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 mt-0.5 ${
                          providerType === 'Owner Crane' ? 'border-blue-600 bg-blue-600' : 'border-slate-400 bg-white dark:bg-slate-800'
                        }`}>
                          {providerType === 'Owner Crane' && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-slate-900 dark:text-white leading-tight">
                              Owner Crane
                            </span>
                            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300">
                              Internal
                            </span>
                          </div>
                          <span className="text-[11px] font-semibold text-blue-600 dark:text-blue-400 block mt-0.5">
                            เครนของเจ้าของงาน (Owner Crane)
                          </span>
                          <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1 leading-normal">
                            เครนประจำโรงงาน BCP จัดสรรภายใน
                          </p>
                        </div>
                      </div>
                    </label>

                    {/* Thai Option 2: Contractor Crane (เครนของผู้รับเหมา) */}
                    <label 
                      className={`relative flex items-start p-3 rounded-xl border cursor-pointer transition-all ${
                        providerType === 'Contractor Crane'
                          ? 'border-blue-600 bg-blue-50/60 dark:bg-blue-950/30 text-blue-950 dark:text-blue-100 ring-1 ring-blue-600 shadow-xs'
                          : 'border-slate-300 dark:border-slate-700 hover:border-slate-400 bg-white dark:bg-slate-800/60 text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      <input
                        type="radio"
                        name="providerType"
                        value="Contractor Crane"
                        checked={providerType === 'Contractor Crane'}
                        onChange={() => setProviderType('Contractor Crane')}
                        className="sr-only"
                      />
                      <div className="flex items-start gap-2.5 w-full">
                        <div className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 mt-0.5 ${
                          providerType === 'Contractor Crane' ? 'border-blue-600 bg-blue-600' : 'border-slate-400 bg-white dark:bg-slate-800'
                        }`}>
                          {providerType === 'Contractor Crane' && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-slate-900 dark:text-white leading-tight">
                              Contractor Crane
                            </span>
                            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-amber-100 dark:bg-amber-900/60 text-amber-700 dark:text-amber-300">
                              External
                            </span>
                          </div>
                          <span className="text-[11px] font-semibold text-amber-600 dark:text-amber-400 block mt-0.5">
                            เครนของผู้รับเหมา (Contractor Crane)
                          </span>
                          <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1 leading-normal">
                            จัดหาโดยผู้รับเหมา พร้อมใบ ปจ.2
                          </p>
                        </div>
                      </div>
                    </label>

                  </div>
                </div>

              </div>
            </div>

            {/* ================= SECTION 3: ATTACHMENTS & PLOT PLAN PINNING ================= */}
            <div className="space-y-5 pt-6 border-t border-slate-200 dark:border-slate-800">
              
              {/* Section Header with Expand/Collapse & Badge */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-950/80 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                    <Paperclip size={18} />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                      <span>{isTh ? 'ส่วนที่ 3: เอกสารแนบและพิกัดผังโรงกลั่น (Plot Plan)' : 'Section 3: Attachments & Plot Plan Pinning'}</span>
                      <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300">
                        {singleAttachments.length} {isTh ? 'ไฟล์แนบ' : 'Files Attached'}
                      </span>
                    </h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      {isTh 
                        ? 'ระบุตำแหน่งเครื่องจักรบนผัง CAD พร้อมจำลองฐานขาช้าง Outriggers และแนบไฟล์ Lifting Plan, PTW หรือ ปจ.2'
                        : 'Mark equipment location on refinery CAD plot plan with scaled outrigger footprint, and attach PTW, Lifting Plan, or Phor.Jor.2 certs.'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-start sm:self-auto">
                  <button
                    type="button"
                    onClick={() => setShowPlotPlanPinning(!showPlotPlanPinning)}
                    className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-xs font-bold text-blue-600 dark:text-blue-400 flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
                  >
                    <span>{showPlotPlanPinning 
                      ? (isTh ? 'ซ่อนผังพิกัด CAD' : 'Hide Plot Map') 
                      : (isTh ? '+ มาร์คพิน / บล็อกสเกลบนผัง CAD' : '+ Pin & Scale Block on Plot Plan')}</span>
                    {showPlotPlanPinning ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                  </button>
                </div>
              </div>

              {/* Plot Plan Interactive Map Drawer with Pin & Scale Block Insert */}
              {showPlotPlanPinning && (
                <div className="animate-in fade-in duration-200">
                  <PlotPlanPinningSection
                    markingType={markingType}
                    onMarkingTypeChange={setMarkingType}
                    pin={jobPin}
                    onPinChange={setJobPin}
                    scaleBlock={scaleBlock}
                    onScaleBlockChange={setScaleBlock}
                    isTh={isTh}
                    equipmentId={equipmentId}
                    isScaffolding={isScaffolding}
                    craneCapacity={craneCapacity}
                  />
                </div>
              )}

              {/* Supporting Job Attachments Component */}
              <div className="p-4 sm:p-5 rounded-2xl bg-slate-50/70 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/80">
                <JobAttachmentSection
                  attachments={singleAttachments}
                  onAddAttachment={(att) => setSingleAttachments(prev => [...prev, att])}
                  onRemoveAttachment={(id) => setSingleAttachments(prev => prev.filter(a => a.id !== id))}
                  isTh={isTh}
                  title={isTh ? 'เอกสารแนบประกอบงานและความปลอดภัย' : 'Job Attachments & Safety Documents'}
                  description={isTh ? 'อัปโหลดแผนการยก Lifting Plan, ใบอนุญาตทำงาน PTW, ปจ.2 หรือเอกสารตรวจสอบอุปกรณ์' : 'Upload Lifting Plan, PTW Permit-to-Work, Phor.Jor.2 Cert, or rigging gear inspection sheets.'}
                />
              </div>

            </div>

          </div>

          {/* ================= CARD FOOTER & ACTION BUTTONS ================= */}
          <div className="p-5 sm:p-6 bg-slate-50 dark:bg-slate-800/60 border-t border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4">
            
            {/* Status Information Note */}
            <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 order-2 sm:order-1">
              <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
              <span>Submission state will default to <strong className="font-semibold text-slate-700 dark:text-slate-200">Requested</strong></span>
            </div>

            {/* Bottom Right Action Buttons */}
            <div className="flex items-center justify-end gap-3 w-full sm:w-auto order-1 sm:order-2">
              
              {/* Cancel Button (Ghost / Outline Style) */}
              <button
                type="button"
                onClick={handleCancelClick}
                className="w-full sm:w-auto px-5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-semibold transition-all cursor-pointer shadow-xs active:scale-95"
              >
                Cancel
              </button>

              {/* Submit Request Button (Solid Primary Color) */}
              <button
                type="submit"
                className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-md shadow-blue-500/25 transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-95"
              >
                <ClipboardList size={16} />
                <span>Submit Request</span>
              </button>

            </div>
          </div>
        </form>

      </div>
    </div>
  );
}
