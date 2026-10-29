import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { format } from "date-fns";
import {
  Calendar as CalendarIcon,
  Check,
  ChevronsUpDown,
  ClipboardList,
  FolderPlus,
  HelpCircle,
  Info,
  Layers,
  Search,
  ShieldCheck,
  Sparkles,
  User,
  Workflow,
  X,
  Building2,
  Tag,
  Clock,
  HardHat,
  FolderTree
} from "lucide-react";
import AssetHierarchySelectModal from "./functional-location/AssetHierarchySelectModal";
import { FlatAssetHierarchyItem } from "../data/functionalLocationHierarchyHelper";

// shadcn/ui components
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetClose,
} from "./ui/sheet";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "./ui/form";
import { Input } from "./ui/input";
import { Select } from "./ui/select";
import { Textarea } from "./ui/textarea";
import { Button } from "./ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";
import { Calendar } from "./ui/calendar";
import { Badge } from "./ui/badge";

// ==========================================
// Zod Validation Schema
// ==========================================
export const createSystemTurnoverSchema = z.object({
  unitNo: z
    .string()
    .min(1, "Please select a Unit No."),
  systemNo: z
    .string()
    .min(2, "System No. must be at least 2 characters")
    .max(50, "System No. is too long"),
  workOrderNo: z
    .string()
    .min(3, "Work Order No. must be at least 3 characters")
    .regex(/^[A-Za-z0-9-_]+$/, "WO No. can only contain alphanumeric characters, hyphens, and underscores"),
  businessTeam: z
    .string()
    .min(2, "Business Team (BT) is required"),
  turnoverLead: z
    .string()
    .min(1, "Please select a Turnover Lead"),
  plannedTurnoverDate: z
    .date(),
  jobDescription: z
    .string()
    .min(10, "Job Description must be at least 10 characters long")
    .max(1000, "Job Description cannot exceed 1000 characters"),
});

export type CreateSystemTurnoverFormValues = z.infer<typeof createSystemTurnoverSchema>;

// Mock data options for Enterprise ERP
const UNIT_OPTIONS = [
  { value: "APS-1", label: "APS-1 (Atmospheric Pipestill Unit 1)" },
  { value: "KHF-1", label: "KHF-1 (Kerosene Hydrotreater Furnaces)" },
  { value: "VPS-2", label: "VPS-2 (Vacuum Pipestill Unit 2)" },
  { value: "GOHF-3", label: "GOHF-3 (Gas Oil Hydrofiner Complex)" },
  { value: "CDU-1", label: "CDU-1 (Crude Distillation Unit)" },
  { value: "HCU-2", label: "HCU-2 (Hydrocracking Unit 2)" },
  { value: "SRU-1", label: "SRU-1 (Sulfur Recovery Unit)" },
];

const TURNOVER_LEADS = [
  { id: "TL-001", name: "Somchai Prasert (Lead Commissioning Eng)", role: "Commissioning Lead", dept: "Turnover & Commissioning", avatar: "SP" },
  { id: "TL-002", name: "Dr. Anan Sakda (Technical Authority)", role: "Technical Authority", dept: "Technical Support Section (TSS)", avatar: "AS" },
  { id: "TL-003", name: "Narong Boonsri (Piping & Mechanical Lead)", role: "Discipline Lead", dept: "Plant Engineering Services (PES)", avatar: "NB" },
  { id: "TL-004", name: "Supot Kittikul (Operations Superintendent)", role: "Operations Lead", dept: "Refinery Operations (OPS)", avatar: "SK" },
  { id: "TL-005", name: "Wichai Pornchai (QA/QC Field Inspector)", role: "QC Lead", dept: "Quality Assurance & Inspection", avatar: "WP" },
  { id: "TL-006", name: "Kamon Panich (Electrical & Instrument Lead)", role: "E&I Authority", dept: "Instrumentation & Controls", avatar: "KP" },
];

const DEFAULT_BUSINESS_TEAMS = [
  "BT-1 (Refinery Heavy Oils & Cracking)",
  "BT-2 (Light Ends & Distillation)",
  "BT-3 (Utilities, Offsites & Nitrogen)",
  "BT-4 (Specialty Chemicals & Polymers)",
];

interface CreateTurnoverSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSystemCreated?: (newSystem: CreateSystemTurnoverFormValues) => void;
}

export function CreateTurnoverSheet({
  open,
  onOpenChange,
  onSystemCreated,
}: CreateTurnoverSheetProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [leadSearchQuery, setLeadSearchQuery] = useState("");
  const [isLeadPopoverOpen, setIsLeadPopoverOpen] = useState(false);
  const [isDatePopoverOpen, setIsDatePopoverOpen] = useState(false);
  const [creationSuccess, setCreationSuccess] = useState<CreateSystemTurnoverFormValues | null>(null);
  const [isHierarchyModalOpen, setIsHierarchyModalOpen] = useState(false);

  // Initialize React Hook Form with Zod validation resolver
  const form = useForm<CreateSystemTurnoverFormValues>({
    resolver: zodResolver(createSystemTurnoverSchema),
    defaultValues: {
      unitNo: "APS-1",
      systemNo: "System-11",
      workOrderNo: "WO-2026-9042",
      businessTeam: "BT-1 (Refinery Heavy Oils & Cracking)",
      turnoverLead: "Somchai Prasert (Lead Commissioning Eng)",
      plannedTurnoverDate: new Date(2026, 8, 30), // Sep 30, 2026
      jobDescription: "",
    },
    mode: "onBlur",
  });

  const handleSelectAsset = (asset: FlatAssetHierarchyItem) => {
    const unitPrefix = asset.unitName.split(' ')[0];
    form.setValue('unitNo', unitPrefix);
    form.setValue('systemNo', asset.systemName);
    form.setValue('workOrderNo', `WO-${unitPrefix}-${Math.floor(100000 + Math.random() * 900000)}`);
    form.setValue(
      'jobDescription',
      `Turnaround mechanical package for ${asset.tag} (Ref ${asset.refCode || 'N/A'}) - ${asset.description || 'Process Equipment'}. Execute vessel blinding isolation, internal non-destructive testing (NDT), valve overhaul, and bolt torque certification under ${asset.systemName} boundary.`
    );
    setIsHierarchyModalOpen(false);
  };

  const onSubmit = async (values: CreateSystemTurnoverFormValues) => {
    setIsSubmitting(true);
    // Simulate enterprise backend transaction
    await new Promise((resolve) => setTimeout(resolve, 800));
    setIsSubmitting(false);

    setCreationSuccess(values);
    onSystemCreated?.(values);

    // Save to local storage for persistence in demo
    try {
      const existingStr = localStorage.getItem("system_turnover_records");
      const existing = existingStr ? JSON.parse(existingStr) : [];
      localStorage.setItem(
        "system_turnover_records",
        JSON.stringify([
          {
            ...values,
            id: `TO-${Date.now()}`,
            createdAt: new Date().toISOString(),
            status: "Stage 1: In Progress",
          },
          ...existing,
        ])
      );
    } catch (e) {
      console.error(e);
    }
  };

  const handleResetAndClose = () => {
    setCreationSuccess(null);
    form.reset();
    onOpenChange(false);
  };

  // Filtered leads for the searchable combo-box
  const filteredLeads = TURNOVER_LEADS.filter(
    (lead) =>
      lead.name.toLowerCase().includes(leadSearchQuery.toLowerCase()) ||
      lead.dept.toLowerCase().includes(leadSearchQuery.toLowerCase()) ||
      lead.role.toLowerCase().includes(leadSearchQuery.toLowerCase())
  );

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" size="xl" className="flex flex-col h-full p-0 overflow-hidden">
        {/* Enterprise Slide-out Header */}
        <SheetHeader className="p-6 pb-5 bg-gradient-to-r from-slate-900 via-slate-800 to-emerald-950 text-white border-b border-slate-700/60 relative">
          <div className="flex items-center gap-2 mb-1.5">
            <span className="text-[10px] font-black uppercase tracking-widest text-emerald-400 bg-emerald-500/20 px-2.5 py-0.5 rounded-full border border-emerald-500/30 flex items-center gap-1">
              <Workflow size={11} />
              <span>Job Location Gateway</span>
            </span>
            <span className="text-slate-400 text-xs font-mono">• ERP Integration</span>
          </div>

          <SheetTitle className="text-xl font-black text-white tracking-tight flex items-center gap-2.5">
            <FolderPlus className="text-emerald-400 w-6 h-6 shrink-0" />
            <span>Create New Job Location</span>
          </SheetTitle>

          <SheetDescription className="text-xs text-slate-300 mt-1 max-w-lg leading-relaxed">
            Register a job location and mechanical completion package, establish boundary isolation limits, and assign the authorized team for multi-gate turnaround handover.
          </SheetDescription>
        </SheetHeader>

        {/* Success Confirmation State */}
        {creationSuccess ? (
          <div className="flex-1 p-8 flex flex-col items-center justify-center text-center space-y-5 animate-in fade-in zoom-in-95">
            <div className="w-16 h-16 rounded-2xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shadow-lg shadow-emerald-500/10">
              <ShieldCheck size={36} />
            </div>

            <div className="max-w-md space-y-1.5">
              <h3 className="text-lg font-black text-slate-900 dark:text-white">
                Job Location Package Initialized!
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Job Location package for <strong className="text-slate-800 dark:text-slate-200">{creationSuccess.systemNo}</strong> ({creationSuccess.unitNo}) has been formally created under Work Order <span className="font-mono font-bold text-blue-600 dark:text-blue-400">{creationSuccess.workOrderNo}</span>.
              </p>
            </div>

            {/* Metadata Summary Pill Card */}
            <div className="w-full max-w-md p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 text-left text-xs space-y-2 font-mono">
              <div className="flex justify-between border-b border-slate-200 dark:border-slate-700/60 pb-1.5">
                <span className="text-slate-500">Unit No:</span>
                <span className="font-bold text-slate-800 dark:text-slate-200">{creationSuccess.unitNo}</span>
              </div>
              <div className="flex justify-between border-b border-slate-200 dark:border-slate-700/60 pb-1.5">
                <span className="text-slate-500">System / EIC:</span>
                <span className="font-bold text-slate-800 dark:text-slate-200">{creationSuccess.systemNo}</span>
              </div>
              <div className="flex justify-between border-b border-slate-200 dark:border-slate-700/60 pb-1.5">
                <span className="text-slate-500">Turnover Lead:</span>
                <span className="font-bold text-emerald-600 dark:text-emerald-400">{creationSuccess.turnoverLead}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Target Date:</span>
                <span className="font-bold text-blue-600 dark:text-blue-400">
                  {format(creationSuccess.plannedTurnoverDate, "yyyy-MM-dd (EEEE)")}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-3 pt-4">
              <Button
                variant="outline"
                onClick={() => setCreationSuccess(null)}
                className="text-xs"
              >
                Create Another
              </Button>
              <Button
                onClick={handleResetAndClose}
                className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs gap-1.5"
              >
                <Check size={14} />
                <span>Go to Turnover Dashboard</span>
              </Button>
            </div>
          </div>
        ) : (
          /* Form Content Body */
          <Form {...form}>
            <form
              onSubmit={form.handleSubmit(onSubmit)}
              className="flex-1 flex flex-col justify-between overflow-hidden"
            >
              <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
                {/* Information Callout Banner with Hierarchy Linkage */}
                <div className="p-3.5 rounded-xl bg-blue-50/70 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-blue-900 dark:text-blue-200">
                  <div className="flex items-start gap-2.5">
                    <Info className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
                    <div className="leading-relaxed">
                      <span className="font-bold">Turnover Governance:</span> 4-Gate Quality Verification linked with Refinery Asset Hierarchy.
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setIsHierarchyModalOpen(true)}
                    className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer self-start sm:self-auto shrink-0 shadow-xs"
                  >
                    <FolderTree size={14} />
                    <span>Browse Asset Hierarchy (ผังโครงสร้าง)</span>
                  </button>
                </div>

                {/* 2-Column Responsive Form Layout */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-5 gap-y-4">
                  {/* Field 1: Unit No. (Select Dropdown) */}
                  <FormField
                    control={form.control}
                    name="unitNo"
                    render={({ field }) => (
                      <FormItem className="space-y-1.5">
                        <FormLabel className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center justify-between">
                          <span className="flex items-center gap-1.5">
                            <Building2 size={13} className="text-slate-400" />
                            <span>Unit No. *</span>
                          </span>
                          <span className="text-[10px] text-slate-400 font-normal font-mono">Refinery Unit</span>
                        </FormLabel>
                        <FormControl>
                          <Select
                            value={field.value}
                            onChange={field.onChange}
                            className="bg-white dark:bg-slate-800 text-xs font-semibold"
                          >
                            <option value="" disabled>-- Select Unit --</option>
                            {UNIT_OPTIONS.map((unit) => (
                              <option key={unit.value} value={unit.value}>
                                {unit.label}
                              </option>
                            ))}
                          </Select>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Field 2: System No. / EIC No. (Text Input) */}
                  <FormField
                    control={form.control}
                    name="systemNo"
                    render={({ field }) => (
                      <FormItem className="space-y-1.5">
                        <FormLabel className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center justify-between">
                          <span className="flex items-center gap-1.5">
                            <Tag size={13} className="text-slate-400" />
                            <span>System No. / EIC No. *</span>
                          </span>
                          <span className="text-[10px] text-slate-400 font-normal font-mono">e.g. System-11</span>
                        </FormLabel>
                        <FormControl>
                          <Input
                            placeholder="e.g. System-11, System-22, EIC-104"
                            {...field}
                            className="bg-white dark:bg-slate-800 font-mono text-xs"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Field 3: Work Order (WO) No. (Text Input) */}
                  <FormField
                    control={form.control}
                    name="workOrderNo"
                    render={({ field }) => (
                      <FormItem className="space-y-1.5">
                        <FormLabel className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center justify-between">
                          <span className="flex items-center gap-1.5">
                            <ClipboardList size={13} className="text-slate-400" />
                            <span>Work Order (WO) No. *</span>
                          </span>
                          <span className="text-[10px] text-slate-400 font-normal font-mono">SAP / Maximo</span>
                        </FormLabel>
                        <FormControl>
                          <Input
                            placeholder="e.g. WO-2026-9042"
                            {...field}
                            className="bg-white dark:bg-slate-800 font-mono text-xs uppercase"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Field 4: Business Team (BT) (Text Input or Select) */}
                  <FormField
                    control={form.control}
                    name="businessTeam"
                    render={({ field }) => (
                      <FormItem className="space-y-1.5">
                        <FormLabel className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center justify-between">
                          <span className="flex items-center gap-1.5">
                            <Layers size={13} className="text-slate-400" />
                            <span>Business Team (BT) *</span>
                          </span>
                          <span className="text-[10px] text-slate-400 font-normal font-mono">Operations Sector</span>
                        </FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Input
                              placeholder="e.g. BT-1 (Refinery Heavy Oils)"
                              {...field}
                              className="bg-white dark:bg-slate-800 text-xs"
                              list="bt-presets"
                            />
                            <datalist id="bt-presets">
                              {DEFAULT_BUSINESS_TEAMS.map((bt) => (
                                <option key={bt} value={bt} />
                              ))}
                            </datalist>
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Field 5: Turnover Lead (Searchable Combo-Box Popover) */}
                  <FormField
                    control={form.control}
                    name="turnoverLead"
                    render={({ field }) => (
                      <FormItem className="space-y-1.5">
                        <FormLabel className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center justify-between">
                          <span className="flex items-center gap-1.5">
                            <User size={13} className="text-slate-400" />
                            <span>Turnover Lead *</span>
                          </span>
                          <span className="text-[10px] text-slate-400 font-normal font-mono">Lead Authority</span>
                        </FormLabel>
                        <FormControl>
                          <Popover open={isLeadPopoverOpen} onOpenChange={setIsLeadPopoverOpen}>
                            <PopoverTrigger asChild>
                              <button
                                type="button"
                                className="w-full flex h-9 items-center justify-between rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs text-left ring-offset-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 cursor-pointer transition-colors"
                              >
                                <span className={field.value ? "text-slate-900 dark:text-white font-medium truncate" : "text-slate-400"}>
                                  {field.value || "Select or search engineer..."}
                                </span>
                                <ChevronsUpDown className="h-3.5 w-3.5 shrink-0 opacity-50 ml-2" />
                              </button>
                            </PopoverTrigger>
                            <PopoverContent className="w-80 p-2 z-50 shadow-2xl border border-slate-200 dark:border-slate-700" align="start">
                              {/* Search Input */}
                              <div className="flex items-center px-2 pb-2 border-b border-slate-100 dark:border-slate-700 gap-2">
                                <Search className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                <input
                                  type="text"
                                  value={leadSearchQuery}
                                  onChange={(e) => setLeadSearchQuery(e.target.value)}
                                  placeholder="Search by name, role, dept..."
                                  className="w-full bg-transparent text-xs text-slate-800 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none"
                                />
                                {leadSearchQuery && (
                                  <button
                                    type="button"
                                    onClick={() => setLeadSearchQuery("")}
                                    className="text-slate-400 hover:text-slate-600"
                                  >
                                    <X size={12} />
                                  </button>
                                )}
                              </div>

                              {/* Search Results List */}
                              <div className="max-h-52 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800/80 mt-1">
                                {filteredLeads.length > 0 ? (
                                  filteredLeads.map((lead) => {
                                    const isSelected = field.value === lead.name;
                                    return (
                                      <div
                                        key={lead.id}
                                        onClick={() => {
                                          field.onChange(lead.name);
                                          setIsLeadPopoverOpen(false);
                                        }}
                                        className={`p-2 rounded-lg flex items-center justify-between text-xs cursor-pointer transition-colors ${
                                          isSelected
                                            ? "bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 font-bold"
                                            : "hover:bg-slate-50 dark:hover:bg-slate-700/60 text-slate-700 dark:text-slate-200"
                                        }`}
                                      >
                                        <div className="flex items-center gap-2.5">
                                          <div className="w-7 h-7 rounded-full bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 font-bold text-[10px] flex items-center justify-center shrink-0">
                                            {lead.avatar}
                                          </div>
                                          <div>
                                            <div className="font-semibold text-slate-900 dark:text-white leading-tight">
                                              {lead.name}
                                            </div>
                                            <div className="text-[10px] text-slate-400 mt-0.5">
                                              {lead.dept} • {lead.role}
                                            </div>
                                          </div>
                                        </div>
                                        {isSelected && <Check size={14} className="text-blue-600" />}
                                      </div>
                                    );
                                  })
                                ) : (
                                  <div className="p-4 text-center text-xs text-slate-400">
                                    No users match "{leadSearchQuery}"
                                  </div>
                                )}
                              </div>
                            </PopoverContent>
                          </Popover>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Field 6: Planned Turnover Date (DatePicker Popover + Calendar) */}
                  <FormField
                    control={form.control}
                    name="plannedTurnoverDate"
                    render={({ field }) => (
                      <FormItem className="space-y-1.5">
                        <FormLabel className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center justify-between">
                          <span className="flex items-center gap-1.5">
                            <Clock size={13} className="text-slate-400" />
                            <span>Planned Turnover Date *</span>
                          </span>
                          <span className="text-[10px] text-slate-400 font-normal font-mono">Milestone Target</span>
                        </FormLabel>
                        <FormControl>
                          <Popover open={isDatePopoverOpen} onOpenChange={setIsDatePopoverOpen}>
                            <PopoverTrigger asChild>
                              <button
                                type="button"
                                className="w-full flex h-9 items-center justify-between rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs text-left ring-offset-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 cursor-pointer transition-colors"
                              >
                                <span className={field.value ? "text-slate-900 dark:text-white font-medium" : "text-slate-400"}>
                                  {field.value ? format(field.value, "PPP") : "Pick milestone date..."}
                                </span>
                                <CalendarIcon className="h-4 w-4 text-slate-400" />
                              </button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0 z-50 border border-slate-200 dark:border-slate-700 shadow-2xl" align="start">
                              <Calendar
                                selected={field.value}
                                onSelect={(picked) => {
                                  field.onChange(picked);
                                  setIsDatePopoverOpen(false);
                                }}
                              />
                            </PopoverContent>
                          </Popover>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Field 7: Job Description (Full-Width Textarea) */}
                <FormField
                  control={form.control}
                  name="jobDescription"
                  render={({ field }) => (
                    <FormItem className="space-y-1.5">
                      <FormLabel className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center justify-between">
                        <span className="flex items-center gap-1.5">
                          <ClipboardList size={13} className="text-slate-400" />
                          <span>Job Description & Scope of Turnover *</span>
                        </span>
                        <span className="text-[10px] text-slate-400 font-mono">
                          {field.value?.length || 0} / 1000 chars
                        </span>
                      </FormLabel>
                      <FormControl>
                        <Textarea
                          rows={4}
                          placeholder="Provide detailed description of equipment boundaries, piping isolation envelopes, overhaul scope, hydrotesting circuits, and handover milestones..."
                          {...field}
                          className="bg-white dark:bg-slate-800 text-xs resize-y min-h-[95px] leading-relaxed"
                        />
                      </FormControl>
                      <FormDescription className="text-[11px] text-slate-400">
                        Include critical tag numbers (e.g. 11-E-101A, 11-C-101) and discipline interfaces for contractor tracking.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Preset Quick Fill Scope Helpers */}
                <div className="pt-1">
                  <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 block mb-1.5">
                    Quick Scope Templates:
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {[
                      "Overhaul of Crude Distillation Column 11-C-101 internal trays, vortex breaker inspection & pass partition gasket replacement.",
                      "High-pressure Hydrocracker Reboiler 11-E-102B bundle withdrawal, hydrotest at 32 barG, and torque audit.",
                      "Furnace 11-H-101 radiant coil decoking, burner tile realignment, and refractory inspection.",
                    ].map((template, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => form.setValue("jobDescription", template, { shouldValidate: true })}
                        className="text-[11px] px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition-colors text-left truncate max-w-xs cursor-pointer"
                      >
                        + Template {idx + 1}: {template.slice(0, 32)}...
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Enterprise Action Buttons Footer */}
              <SheetFooter className="p-4 px-6 border-t border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/80 flex items-center justify-between sm:justify-between w-full">
                <div className="flex items-center gap-2 text-[11px] text-slate-500">
                  <ShieldCheck size={14} className="text-emerald-500" />
                  <span className="hidden sm:inline">Compliant with API 510 / ASME Sec VIII</span>
                </div>

                <div className="flex items-center gap-2.5">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => onOpenChange(false)}
                    className="text-xs h-9 px-4 cursor-pointer"
                    disabled={isSubmitting}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    variant="default"
                    className="bg-blue-600 hover:bg-blue-700 text-white text-xs h-9 px-5 font-bold shadow-md shadow-blue-600/20 cursor-pointer gap-2"
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? (
                      <>
                        <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        <span>Creating Package...</span>
                      </>
                    ) : (
                      <>
                        <FolderPlus size={15} />
                        <span>Create Job Location</span>
                      </>
                    )}
                  </Button>
                </div>
              </SheetFooter>
            </form>
          </Form>
        )}
      </SheetContent>

      <AssetHierarchySelectModal
        isOpen={isHierarchyModalOpen}
        onClose={() => setIsHierarchyModalOpen(false)}
        onSelectAsset={handleSelectAsset}
      />
    </Sheet>
  );
}

export default CreateTurnoverSheet;
