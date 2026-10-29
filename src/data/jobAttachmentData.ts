export type AttachmentCategory = 
  | 'Lifting Plan' 
  | 'Permit-to-Work (PTW)' 
  | 'Inspection Cert (Phor.Jor.2)' 
  | 'Drawing / Blueprint' 
  | 'Safety Checklist / JSA' 
  | 'Site Photo' 
  | 'Other';

export interface JobAttachment {
  id: string;
  name: string;
  size: number; // in bytes
  type: string; // MIME type e.g. 'application/pdf', 'image/png'
  category: AttachmentCategory;
  url: string; // data URL or mock URL
  uploadedAt: string;
  uploadedBy?: string;
}

export const ATTACHMENT_CATEGORIES: { value: AttachmentCategory; labelEn: string; labelTh: string; color: string }[] = [
  { value: 'Lifting Plan', labelEn: 'Lifting / Rigging Plan', labelTh: 'แผนการยก / Rigging Plan', color: 'bg-indigo-500/20 text-indigo-400 border-indigo-500/30' },
  { value: 'Permit-to-Work (PTW)', labelEn: 'Permit-to-Work (PTW)', labelTh: 'ใบอนุญาตทำงาน (PTW)', color: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' },
  { value: 'Inspection Cert (Phor.Jor.2)', labelEn: 'Machinery Cert (Phor.Jor.2)', labelTh: 'เอกสารรับรองเครื่องจักร (ปจ.2)', color: 'bg-amber-500/20 text-amber-400 border-amber-500/30' },
  { value: 'Drawing / Blueprint', labelEn: 'Engineering Drawing', labelTh: 'แบบวิศวกรรม / แผนผัง', color: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30' },
  { value: 'Safety Checklist / JSA', labelEn: 'Safety Checklist / JSA', labelTh: 'รายการตรวจสอบความปลอดภัย / JSA', color: 'bg-rose-500/20 text-rose-400 border-rose-500/30' },
  { value: 'Site Photo', labelEn: 'Site Photo / Rigging Setup', labelTh: 'ภาพถ่ายหน้างาน / จุดยก', color: 'bg-blue-500/20 text-blue-400 border-blue-500/30' },
  { value: 'Other', labelEn: 'Other Supporting Document', labelTh: 'เอกสารประกอบอื่นๆ', color: 'bg-slate-500/20 text-slate-400 border-slate-500/30' },
];

export const SAMPLE_ATTACHMENT_TEMPLATES: Omit<JobAttachment, 'id' | 'uploadedAt'>[] = [
  {
    name: 'Approved_Tandem_Lifting_Plan_Rev2.pdf',
    size: 2450000,
    type: 'application/pdf',
    category: 'Lifting Plan',
    url: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
    uploadedBy: 'Safety Officer / TSS Lead'
  },
  {
    name: 'PTW_HotWork_ConfinedSpace_Signed.pdf',
    size: 1180000,
    type: 'application/pdf',
    category: 'Permit-to-Work (PTW)',
    url: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
    uploadedBy: 'Operations Superintendent'
  },
  {
    name: 'Crane_Cert_PhorJor2_Valid_2026.pdf',
    size: 920000,
    type: 'application/pdf',
    category: 'Inspection Cert (Phor.Jor.2)',
    url: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
    uploadedBy: 'Third Party Inspector'
  },
  {
    name: 'Lifting_Zone_Ground_Bearing_Inspection.jpg',
    size: 1640000,
    type: 'image/jpeg',
    category: 'Site Photo',
    url: 'https://images.unsplash.com/photo-1541888946425-d0fbb18f15f7?auto=format&fit=crop&w=1200&q=80',
    uploadedBy: 'Rigging Supervisor'
  }
];

export const formatFileSize = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

export const DEFAULT_INITIAL_ATTACHMENTS: Record<string, JobAttachment[]> = {
  'CRN-26001': [
    {
      id: 'att-seed-1',
      name: 'Approved_Tandem_Lifting_Plan_Rev2.pdf',
      size: 2450000,
      type: 'application/pdf',
      category: 'Lifting Plan',
      url: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
      uploadedAt: '2026-09-02T08:30:00.000Z',
      uploadedBy: 'Safety Lead Somchai'
    },
    {
      id: 'att-seed-2',
      name: 'PTW_HotWork_ConfinedSpace_Signed.pdf',
      size: 1180000,
      type: 'application/pdf',
      category: 'Permit-to-Work (PTW)',
      url: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
      uploadedAt: '2026-09-02T09:15:00.000Z',
      uploadedBy: 'Ops Superintendent'
    },
    {
      id: 'att-seed-3',
      name: 'Lifting_Zone_Ground_Bearing_Inspection.jpg',
      size: 1640000,
      type: 'image/jpeg',
      category: 'Site Photo',
      url: 'https://images.unsplash.com/photo-1541888946425-d0fbb18f15f7?auto=format&fit=crop&w=1200&q=80',
      uploadedAt: '2026-09-02T09:45:00.000Z',
      uploadedBy: 'Rigging Lead Anan'
    }
  ],
  'CRN-26002': [
    {
      id: 'att-seed-4',
      name: 'Crane_Cert_PhorJor2_Valid_2026.pdf',
      size: 920000,
      type: 'application/pdf',
      category: 'Inspection Cert (Phor.Jor.2)',
      url: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
      uploadedAt: '2026-09-03T07:30:00.000Z',
      uploadedBy: 'Inspector Prasert'
    },
    {
      id: 'att-seed-5',
      name: 'General_Rigging_Layout_Blueprint.pdf',
      size: 3120000,
      type: 'application/pdf',
      category: 'Drawing / Blueprint',
      url: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
      uploadedAt: '2026-09-03T07:45:00.000Z',
      uploadedBy: 'Civil Engineering Team'
    }
  ],
  'CRN-26003': [
    {
      id: 'att-seed-6',
      name: 'Safety_JSA_HeavyLift_V3.pdf',
      size: 780000,
      type: 'application/pdf',
      category: 'Safety Checklist / JSA',
      url: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
      uploadedAt: '2026-09-04T10:00:00.000Z',
      uploadedBy: 'SHE Officer'
    }
  ],
  'ICN-2600001': [
    {
      id: 'att-seed-7',
      name: 'Manhole3_Opening_PTW_Approved.pdf',
      size: 1420000,
      type: 'application/pdf',
      category: 'Permit-to-Work (PTW)',
      url: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
      uploadedAt: '2026-09-01T08:00:00.000Z',
      uploadedBy: 'Safety Supervisor'
    }
  ],
  '1': [
    {
      id: 'att-seed-8',
      name: 'Manhole3_Opening_PTW_Approved.pdf',
      size: 1420000,
      type: 'application/pdf',
      category: 'Permit-to-Work (PTW)',
      url: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
      uploadedAt: '2026-09-01T08:00:00.000Z',
      uploadedBy: 'Safety Supervisor'
    }
  ]
};

const STORAGE_KEY = 'job_attachments_registry_v1';

// Read all job attachments map from localStorage
export const getAllJobAttachmentsRegistry = (): Record<string, JobAttachment[]> => {
  if (typeof window === 'undefined') return DEFAULT_INITIAL_ATTACHMENTS;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_INITIAL_ATTACHMENTS));
      return { ...DEFAULT_INITIAL_ATTACHMENTS };
    }
    const parsed = JSON.parse(raw);
    return { ...DEFAULT_INITIAL_ATTACHMENTS, ...parsed };
  } catch (e) {
    console.error('Failed to read job attachments from storage:', e);
    return DEFAULT_INITIAL_ATTACHMENTS;
  }
};

// Get attachments for a specific job ID or jobNo
export const getJobAttachments = (jobKey: string | number): JobAttachment[] => {
  const key = String(jobKey);
  const registry = getAllJobAttachmentsRegistry();
  return registry[key] || [];
};

// Save attachments for a specific job ID or jobNo
export const saveJobAttachments = (jobKey: string | number, attachments: JobAttachment[]): void => {
  if (typeof window === 'undefined') return;
  try {
    const key = String(jobKey);
    const registry = getAllJobAttachmentsRegistry();
    registry[key] = attachments;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(registry));
    window.dispatchEvent(new CustomEvent('job_attachments_updated', { detail: { jobKey: key, attachments } }));
  } catch (e) {
    console.error('Failed to save job attachments to storage:', e);
  }
};

// Add a single attachment to a job
export const addJobAttachment = (jobKey: string | number, attachment: JobAttachment): JobAttachment[] => {
  const current = getJobAttachments(jobKey);
  const updated = [...current, attachment];
  saveJobAttachments(jobKey, updated);
  return updated;
};

// Remove an attachment from a job
export const removeJobAttachment = (jobKey: string | number, attachmentId: string): JobAttachment[] => {
  const current = getJobAttachments(jobKey);
  const updated = current.filter(a => a.id !== attachmentId);
  saveJobAttachments(jobKey, updated);
  return updated;
};
