import React, { useState, useMemo, useEffect } from 'react';
import { 
  Users, Settings, Plus, Search, Edit2, Trash2, 
  Check, X, Building2, Factory, ShieldCheck, UserCheck, Key,
  ExternalLink, LayoutGrid, List, RotateCcw, MapPin, Network,
  CheckCircle2, AlertCircle, Sliders, Download
} from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { usePlantTurnShared } from '../context/PlantTurnSharedContext';

const SIGNER_ROLES_STORAGE_KEY = 'turnover_signer_roles_by_plant_v1';
const DEFAULT_SIGNER_ROLES = [
  'Operations (ฝ่ายปฏิบัติการผลิต)',
  'QA-QC (ฝ่ายตรวจสอบและควบคุมคุณภาพ)',
  'Construction / Maintenance (ฝ่ายก่อสร้างและซ่อมบำรุง)',
  'Lead Turnaround Engineer (หัวหน้าวิศวกรผู้รับมอบ)',
  'Job Supervisor (หัวหน้างานหน้างาน)'
];

export interface UserRecord {
  id: number;
  name: string;
  role: string;
  roleType: 'engineer' | 'inspector' | 'operations' | 'contractor' | 'admin' | 'qaqc';
  email: string;
  status: 'Active' | 'Inactive';
  location: string;
  plant: 'Phra Khanong' | 'Sriracha' | 'Both';
  permissions: string[];
}

export type UserConfigTabType = 'users' | 'plant-role-settings';

interface UserConfigProps {
  globalPlantFilter?: 'All' | 'all' | 'Phra Khanong' | 'Sriracha';
  onPlantFilterChange?: (plant: any) => void;
  onNavigateToFunctionalLocation?: () => void;
  onNavigateToMasterPlotPlan?: () => void;
  initialTab?: UserConfigTabType;
}

const STORAGE_KEY = 'bcp_enterprise_users_v1';

const INITIAL_USERS: UserRecord[] = [
  { 
    id: 1, 
    name: 'Somchai Prasert', 
    role: 'Operations Representative (ฝ่ายปฏิบัติการผลิต)', 
    roleType: 'operations',
    email: 'somchai.p@bangchak.co.th', 
    status: 'Active', 
    location: 'Bangchak พระโขนง (APS-1/KHF-1)', 
    plant: 'Phra Khanong',
    permissions: ['Turnover S2', 'Crane CR01', 'Plot Plan CAD'] 
  },
  { 
    id: 2, 
    name: 'Kittisak Wongsuwan', 
    role: 'Lead Turnaround Maintenance Engineer', 
    roleType: 'engineer',
    email: 'kittisak.w@bangchak.co.th', 
    status: 'Active', 
    location: 'Bangchak พระโขนง & ศรีราชา', 
    plant: 'Both',
    permissions: ['Turnover S2', 'Crane CR01', 'Scaffolding SC01', 'Plot Plan CAD', 'AI Optimization'] 
  },
  { 
    id: 3, 
    name: 'Nattapong Chaiwut', 
    role: 'Inspection Engineering Lead (ฝ่ายตรวจสอบวิศวกรรม)', 
    roleType: 'inspector',
    email: 'nattapong.c@bangchak.co.th', 
    status: 'Active', 
    location: 'Bangchak พระโขนง', 
    plant: 'Phra Khanong',
    permissions: ['Turnover S2', 'QA/QC Punch List', 'Plot Plan CAD'] 
  },
  { 
    id: 4, 
    name: 'Supaporn Rattanachai', 
    role: 'QA/QC Lead Quality Inspector', 
    roleType: 'qaqc',
    email: 'supaporn.r@bangchak.co.th', 
    status: 'Active', 
    location: 'Bangchak ศรีราชา (VPS-2)', 
    plant: 'Sriracha',
    permissions: ['Turnover S2', 'QA/QC Punch List', 'Plot Plan CAD'] 
  },
  { 
    id: 5, 
    name: 'Wichai Thongdee', 
    role: 'Rigging & Crane Specialist (Contractor)', 
    roleType: 'contractor',
    email: 'wichai.t@heavycrane-partner.com', 
    status: 'Active', 
    location: 'Zone Crane Yard (APS-1)', 
    plant: 'Phra Khanong',
    permissions: ['Crane CR01'] 
  },
  { 
    id: 6, 
    name: 'David Smith', 
    role: 'Scaffolding Supervisor (Contractor)', 
    roleType: 'contractor',
    email: 'david.s@safescaff-intl.com', 
    status: 'Active', 
    location: 'Si Racha Complex Yard (CDU-2)', 
    plant: 'Sriracha',
    permissions: ['Scaffolding SC01'] 
  },
  { 
    id: 7, 
    name: 'Alex Johnson', 
    role: 'System Administrator (ผู้ดูแลระบบ)', 
    roleType: 'admin',
    email: 'admin.crane@bangchak.co.th', 
    status: 'Active', 
    location: 'Bangchak Headquarter & Central IT', 
    plant: 'Both',
    permissions: ['Turnover S2', 'Crane CR01', 'Scaffolding SC01', 'Plot Plan CAD', 'Master Data', 'AI Optimization'] 
  }
];

const AVAILABLE_PERMISSIONS = [
  'Turnover S2',
  'Crane CR01',
  'Scaffolding SC01',
  'QA/QC Punch List',
  'Plot Plan CAD',
  'Executive Dashboard',
  'AI Optimization',
  'Master Data'
];

export default function UserConfig({
  globalPlantFilter,
  onPlantFilterChange,
  onNavigateToFunctionalLocation,
  onNavigateToMasterPlotPlan,
  initialTab = 'users'
}: UserConfigProps = {}) {
  const { language } = useLanguage();
  const isTh = language === 'th';
  const { jobs } = usePlantTurnShared();

  const [activeTab, setActiveTab] = useState<UserConfigTabType>(initialTab);

  useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab]);

  // Plant & Role Settings State (Turnover Signer Roles by Plant)
  const [signerRolesByPlant, setSignerRolesByPlant] = useState<Record<'Phra Khanong' | 'Sriracha', string[]>>(() => {
    try {
      const saved = localStorage.getItem(SIGNER_ROLES_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed?.['Phra Khanong']) && Array.isArray(parsed?.['Sriracha'])) return parsed;
      }
    } catch {
      // fall back to defaults
    }
    return {
      'Phra Khanong': [...DEFAULT_SIGNER_ROLES],
      'Sriracha': [...DEFAULT_SIGNER_ROLES]
    };
  });
  const [rolesEditPlant, setRolesEditPlant] = useState<'Phra Khanong' | 'Sriracha'>('Phra Khanong');
  const [isAddingNewRoleModalOpen, setIsAddingNewRoleModalOpen] = useState(false);
  const [newRoleInput, setNewRoleInput] = useState('');

  useEffect(() => {
    try {
      localStorage.setItem(SIGNER_ROLES_STORAGE_KEY, JSON.stringify(signerRolesByPlant));
      window.dispatchEvent(new CustomEvent('turnover_signer_roles_updated', { detail: signerRolesByPlant }));
    } catch {
      // ignore storage errors
    }
  }, [signerRolesByPlant]);

  const handleAddNewRole = () => {
    if (!newRoleInput.trim()) return;
    const role = newRoleInput.trim();
    setSignerRolesByPlant(prev =>
      prev[rolesEditPlant].includes(role)
        ? prev
        : { ...prev, [rolesEditPlant]: [...prev[rolesEditPlant], role] }
    );
    setNewRoleInput('');
    setIsAddingNewRoleModalOpen(false);
    setBannerMessage(
      isTh
        ? `เพิ่มบทบาทผู้ลงนาม "${role}" สำหรับโรงงาน ${rolesEditPlant === 'Phra Khanong' ? 'พระโขนง (PK)' : 'ศรีราชา (SR)'} เรียบร้อยแล้ว`
        : `Added signer role "${role}" for ${rolesEditPlant === 'Phra Khanong' ? 'Phra Khanong (PK)' : 'Si Racha (SR)'}`
    );
  };

  const handleRemoveRole = (role: string) => {
    setSignerRolesByPlant(prev =>
      prev[rolesEditPlant].length <= 1
        ? prev
        : { ...prev, [rolesEditPlant]: prev[rolesEditPlant].filter(r => r !== role) }
    );
    setBannerMessage(
      isTh
        ? `ลบบทบาทผู้ลงนาม "${role}" ออกจากโรงงาน ${rolesEditPlant === 'Phra Khanong' ? 'พระโขนง (PK)' : 'ศรีราชา (SR)'} แล้ว`
        : `Removed signer role "${role}" from ${rolesEditPlant === 'Phra Khanong' ? 'Phra Khanong (PK)' : 'Si Racha (SR)'}`
    );
  };

  const handleResetDefaultRoles = () => {
    setSignerRolesByPlant(prev => ({
      ...prev,
      [rolesEditPlant]: [...DEFAULT_SIGNER_ROLES]
    }));
    setBannerMessage(
      isTh
        ? `คืนค่าบทบาทผู้ลงนามเริ่มต้นสำหรับโรงงาน ${rolesEditPlant === 'Phra Khanong' ? 'พระโขนง (PK)' : 'ศรีราชา (SR)'} เรียบร้อยแล้ว`
        : `Reset default signer roles for ${rolesEditPlant === 'Phra Khanong' ? 'Phra Khanong (PK)' : 'Si Racha (SR)'}`
    );
  };

  const [users, setUsers] = useState<UserRecord[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {
      // ignore storage errors
    }
    return INITIAL_USERS;
  });

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(users));
    } catch {
      // ignore storage errors
    }
  }, [users]);

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRoleFilter, setSelectedRoleFilter] = useState<string>('all');
  const [selectedPlantFilter, setSelectedPlantFilter] = useState<'all' | 'Phra Khanong' | 'Sriracha'>(
    globalPlantFilter === 'All' || !globalPlantFilter ? 'all' : globalPlantFilter
  );
  const [selectedUnitTag, setSelectedUnitTag] = useState<string | null>(null);
  const [viewLayout, setViewLayout] = useState<'table' | 'grid'>('table');
  const [statusFilter, setStatusFilter] = useState<'all' | 'Active' | 'Inactive'>('all');
  const [deletingUserId, setDeletingUserId] = useState<number | null>(null);
  const [bannerMessage, setBannerMessage] = useState<string | null>(null);

  // Sync with global plant filter if changed from top header
  useEffect(() => {
    if (globalPlantFilter) {
      setSelectedPlantFilter(globalPlantFilter === 'All' ? 'all' : globalPlantFilter);
    }
  }, [globalPlantFilter]);

  const handlePlantChange = (plant: 'all' | 'Phra Khanong' | 'Sriracha') => {
    setSelectedPlantFilter(plant);
    if (onPlantFilterChange) {
      onPlantFilterChange(plant === 'all' ? 'All' : plant);
    }
  };

  // Modal State for Add / Edit
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUserId, setEditingUserId] = useState<number | null>(null);
  const [formData, setFormData] = useState<Omit<UserRecord, 'id'>>({
    name: '',
    role: '',
    roleType: 'engineer',
    email: '',
    status: 'Active',
    location: 'Bangchak พระโขนง',
    plant: 'Phra Khanong',
    permissions: ['Turnover S2', 'Crane CR01']
  });

  const handleOpenAddModal = () => {
    setEditingUserId(null);
    setFormData({
      name: '',
      role: '',
      roleType: 'engineer',
      email: '',
      status: 'Active',
      location: selectedPlantFilter === 'Sriracha' ? 'Bangchak ศรีราชา (VPS-2)' : 'Bangchak พระโขนง (APS-1)',
      plant: selectedPlantFilter === 'all' ? 'Phra Khanong' : selectedPlantFilter,
      permissions: ['Turnover S2', 'Crane CR01']
    });
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (user: UserRecord) => {
    setEditingUserId(user.id);
    setFormData({
      name: user.name,
      role: user.role,
      roleType: user.roleType,
      email: user.email,
      status: user.status,
      location: user.location,
      plant: user.plant,
      permissions: [...user.permissions]
    });
    setIsModalOpen(true);
  };

  const handleSaveUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.email) return;

    if (editingUserId !== null) {
      setUsers(prev => prev.map(u => u.id === editingUserId ? { ...formData, id: editingUserId } : u));
      setBannerMessage(isTh ? `อัปเดตข้อมูลและสิทธิ์ของ "${formData.name}" เรียบร้อยแล้ว` : `Updated profile & permissions for "${formData.name}"`);
    } else {
      const newUser: UserRecord = {
        ...formData,
        id: Date.now()
      };
      setUsers(prev => [newUser, ...prev]);
      setBannerMessage(isTh ? `เพิ่มผู้ใช้งาน "${formData.name}" เข้าสู่ระบบสำเร็จ` : `Added user "${formData.name}" successfully`);
    }
    setIsModalOpen(false);
  };

  const handleToggleUserStatus = (user: UserRecord) => {
    const nextStatus = user.status === 'Active' ? 'Inactive' : 'Active';
    setUsers(prev => prev.map(u => u.id === user.id ? { ...u, status: nextStatus } : u));
    setBannerMessage(
      isTh
        ? `เปลี่ยนสถานะบัญชี "${user.name}" เป็น ${nextStatus === 'Active' ? 'ใช้งานปกติ' : 'ระงับชั่วคราว'}`
        : `Changed "${user.name}" status to ${nextStatus}`
    );
  };

  const handleConfirmDeleteUser = (id: number) => {
    const target = users.find(u => u.id === id);
    setUsers(prev => prev.filter(u => u.id !== id));
    setDeletingUserId(null);
    if (target) {
      setBannerMessage(isTh ? `ลบผู้ใช้งาน "${target.name}" ออกจากระบบแล้ว` : `Removed user "${target.name}"`);
    }
  };

  const handleResetFilters = () => {
    setSearchQuery('');
    setSelectedRoleFilter('all');
    handlePlantChange('all');
    setSelectedUnitTag(null);
    setStatusFilter('all');
  };

  const togglePermission = (perm: string) => {
    setFormData(prev => {
      const exists = prev.permissions.includes(perm);
      return {
        ...prev,
        permissions: exists 
          ? prev.permissions.filter(p => p !== perm) 
          : [...prev.permissions, perm]
      };
    });
  };

  // Filtered Users
  const filteredUsers = useMemo(() => {
    return users.filter(user => {
      if (selectedRoleFilter !== 'all' && user.roleType !== selectedRoleFilter) return false;
      if (selectedPlantFilter !== 'all' && user.plant !== 'Both' && user.plant !== selectedPlantFilter) return false;
      if (statusFilter !== 'all' && user.status !== statusFilter) return false;

      if (selectedUnitTag) {
        const uq = selectedUnitTag.toLowerCase();
        const inLoc = user.location.toLowerCase().includes(uq);
        const isBoth = user.plant === 'Both';
        if (!inLoc && !isBoth) return false;
      }

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesName = user.name.toLowerCase().includes(q);
        const matchesEmail = user.email.toLowerCase().includes(q);
        const matchesRole = user.role.toLowerCase().includes(q);
        const matchesLocation = user.location.toLowerCase().includes(q);
        const matchesPerms = user.permissions.some(p => p.toLowerCase().includes(q));
        if (!matchesName && !matchesEmail && !matchesRole && !matchesLocation && !matchesPerms) {
          return false;
        }
      }
      return true;
    });
  }, [users, searchQuery, selectedRoleFilter, selectedPlantFilter, statusFilter, selectedUnitTag]);

  const roleCounts = useMemo(() => {
    return {
      all: users.length,
      operations: users.filter(u => u.roleType === 'operations').length,
      engineer: users.filter(u => u.roleType === 'engineer').length,
      inspector: users.filter(u => u.roleType === 'inspector').length,
      qaqc: users.filter(u => u.roleType === 'qaqc').length,
      contractor: users.filter(u => u.roleType === 'contractor').length,
      admin: users.filter(u => u.roleType === 'admin').length
    };
  }, [users]);

  const hasActiveFilters =
    searchQuery.trim() !== '' ||
    selectedRoleFilter !== 'all' ||
    selectedPlantFilter !== 'all' ||
    selectedUnitTag !== null ||
    statusFilter !== 'all';

  return (
    <div className="w-full max-w-7xl mx-auto space-y-6 pb-16 animate-in fade-in duration-200">
      {/* 1. Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 p-5 sm:p-6 rounded-3xl text-white shadow-xl border border-slate-700/60 space-y-5">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-2.5 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/30 font-mono text-[11px] font-semibold flex items-center gap-1.5">
                <Key size={13} className="text-blue-400" />
                <span>MODULE 8: MASTER DATA & ADMIN</span>
              </span>
              <span className="text-slate-300 text-xs">
                • Bangchak Phra Khanong & Si Racha Enterprise Governance
              </span>
            </div>

            <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight flex items-center gap-2.5">
              {activeTab === 'users' ? (
                <Users size={26} className="text-blue-400 shrink-0" />
              ) : (
                <Sliders size={26} className="text-teal-400 shrink-0" />
              )}
              <span>
                {activeTab === 'users'
                  ? (isTh ? 'การตั้งค่าและจัดการข้อมูลระบบ (Master Data & Users)' : 'Master Data & User Configuration')
                  : (isTh ? 'ตั้งค่าโรงงานและสิทธิ์บทบาทผู้ลงนาม (Plant & Role Settings)' : 'Plant & Role Settings')}
              </span>
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 max-w-3xl leading-relaxed">
              {activeTab === 'users'
                ? (isTh 
                    ? 'จัดการโครงสร้างโรงงาน (Master FLOC & Plants) และบริหารสิทธิ์ผู้ใช้งาน: วิศวกร (Engineer), ผู้ตรวจสอบ (Inspector), ตัวแทนฝ่ายผลิต (Operations) และผู้รับเหมา (Contractor) สำหรับการลงนามตรวจรับและปฏิบัติงาน' 
                    : 'Enterprise administration for refinery Functional Locations, multi-plant master zones, and role-based access control (RBAC) across Engineering, Operations, Inspection, and Contractors.')
                : (isTh
                    ? 'บริหารจัดการการสลับโรงงานปฏิบัติการหลัก (Multi-Plant Routing), กำหนดบทบาทผู้มีอำนาจลงนามส่งมอบงาน (Turnover Signer Roles) แยกตามโรงงาน และสำรองข้อมูลแพ็กเกจงานทั้งหมด'
                    : 'Manage multi-plant routing, dual sign-off roles (Operation, Job Owner, QA/QC), and full turnover dossier backup.')}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 self-start lg:self-center shrink-0">
            {onNavigateToMasterPlotPlan && (
              <button
                type="button"
                onClick={onNavigateToMasterPlotPlan}
                className="px-3.5 py-2.5 rounded-xl bg-slate-800/90 hover:bg-slate-700 text-slate-200 border border-slate-600/80 font-bold text-xs flex items-center gap-1.5 cursor-pointer transition-colors"
              >
                <MapPin size={15} className="text-cyan-400" />
                <span>{isTh ? 'แผนผังโรงงาน (Master Plot)' : 'Master Plot Plan'}</span>
              </button>
            )}
            {onNavigateToFunctionalLocation && (
              <button
                type="button"
                onClick={onNavigateToFunctionalLocation}
                className="px-3.5 py-2.5 rounded-xl bg-slate-800/90 hover:bg-slate-700 text-slate-200 border border-slate-600/80 font-bold text-xs flex items-center gap-1.5 cursor-pointer transition-colors"
              >
                <Network size={15} className="text-indigo-400" />
                <span>{isTh ? 'โครงสร้าง FLOC' : 'FLOC Hierarchy'}</span>
              </button>
            )}
            {activeTab === 'users' ? (
              <button 
                type="button"
                onClick={handleOpenAddModal}
                className="bg-[#008b52] hover:bg-[#007b48] text-white font-bold py-2.5 px-4 rounded-xl shadow-lg shadow-emerald-950/40 transition-all text-xs flex items-center justify-center gap-2 cursor-pointer"
              >
                <Plus size={16} />
                <span>{isTh ? '+ เพิ่มผู้ใช้งานและสิทธิ์ใหม่' : '+ Add User & Permissions'}</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => {
                  const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(jobs, null, 2));
                  const link = document.createElement('a');
                  link.href = dataStr;
                  link.download = `Turnover_Jobs_Full_Backup_${new Date().toISOString().slice(0, 10)}.json`;
                  link.click();
                }}
                className="px-4 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs flex items-center gap-2 shadow-lg shadow-teal-950/40 cursor-pointer shrink-0 transition-all"
              >
                <Download size={15} />
                <span>{isTh ? 'ส่งออกข้อมูลระบบ (Export JSON)' : 'Export Full Dossier (JSON)'}</span>
              </button>
            )}
          </div>
        </div>

        {/* Top Tab Navigation Bar */}
        <div className="pt-4 border-t border-slate-700/60 flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setActiveTab('users')}
            className={`px-4 py-2.5 rounded-xl text-xs font-extrabold transition-all cursor-pointer flex items-center gap-2 ${
              activeTab === 'users'
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30 ring-1 ring-blue-400/50'
                : 'bg-slate-800/70 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-700/80'
            }`}
          >
            <Users size={15} />
            <span>{isTh ? '1. การจัดการผู้ใช้งาน (User Configuration)' : '1. User Configuration'}</span>
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono ${
              activeTab === 'users' ? 'bg-white/20 text-white' : 'bg-slate-700 text-slate-300'
            }`}>
              {users.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('plant-role-settings')}
            className={`px-4 py-2.5 rounded-xl text-xs font-extrabold transition-all cursor-pointer flex items-center gap-2 ${
              activeTab === 'plant-role-settings'
                ? 'bg-gradient-to-r from-teal-500 to-emerald-600 text-white shadow-lg shadow-teal-600/30 ring-1 ring-teal-400/50'
                : 'bg-slate-800/70 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-700/80'
            }`}
          >
            <Sliders size={15} />
            <span>{isTh ? '2. ตั้งค่าโรงงาน & สิทธิ์บทบาท (Plant & Role Settings)' : '2. Plant & Role Settings'}</span>
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono ${
              activeTab === 'plant-role-settings' ? 'bg-white/20 text-white' : 'bg-slate-700 text-slate-300'
            }`}>
              PK & SR
            </span>
          </button>
        </div>
      </div>

      {/* Feedback Banner */}
      {bannerMessage && (
        <div className="p-3.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-300 dark:border-emerald-800 flex items-center justify-between gap-3 text-xs font-bold text-emerald-800 dark:text-emerald-200 animate-in fade-in duration-150">
          <div className="flex items-center gap-2">
            <CheckCircle2 size={16} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
            <span>{bannerMessage}</span>
          </div>
          <button
            type="button"
            onClick={() => setBannerMessage(null)}
            className="p-1 rounded-lg hover:bg-emerald-100 dark:hover:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300 cursor-pointer"
          >
            <X size={14} />
          </button>
        </div>
      )}

      {activeTab === 'plant-role-settings' ? (
        /* =====================================================================
           TAB 2: PLANT & ROLE SETTINGS (RELOCATED FROM TURNOVER S/D & T/A)
           ===================================================================== */
        <div className="space-y-6 animate-in fade-in duration-200">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Setting Card 1: Multi-Plant Selection & Plant Operations Switcher */}
            <div className="p-5 sm:p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-2.5">
                  <div className="p-2.5 rounded-xl bg-teal-50 dark:bg-teal-950 text-teal-600 dark:text-teal-400 border border-teal-200/60 dark:border-teal-800">
                    <Building2 size={18} />
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-slate-900 dark:text-slate-100">
                      {isTh ? 'ตั้งค่าโรงงานปฏิบัติการหลัก (Plant Operations & Multi-Plant Switching)' : 'Plant Operations & Multi-Plant Switching'}
                    </h3>
                    <p className="text-xs text-slate-400">
                      {isTh ? 'เลือกโรงงานหลักสำหรับกรองข้อมูลและสลับโหมดการบริหารจัดการหลายโรงกลั่น' : 'Manage multiple refineries under a single engineering governance profile'}
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block">
                    {isTh ? 'เลือกโรงงานที่ต้องการแสดงผล (Active Plant Scope):' : 'Select Active Primary Plant Location:'}
                  </label>
                  {selectedPlantFilter !== 'all' && (
                    <button
                      type="button"
                      onClick={() => handlePlantChange('all')}
                      className="text-xs font-bold text-teal-600 dark:text-teal-400 hover:underline cursor-pointer"
                    >
                      {isTh ? 'แสดงทุกโรงงาน (All Plants)' : 'Reset to All Plants'}
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div
                    onClick={() => handlePlantChange('Phra Khanong')}
                    className={`p-4 rounded-2xl border-2 transition-all cursor-pointer ${
                      selectedPlantFilter === 'Phra Khanong'
                        ? 'border-teal-600 bg-teal-50/60 dark:bg-teal-950/40 text-teal-950 dark:text-teal-100 shadow-xs ring-2 ring-teal-500/20'
                        : 'border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 text-slate-700 dark:text-slate-300 hover:border-teal-400'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-black text-sm">
                        {isTh ? 'พระโขนง (Phra Khanong - PK)' : 'Phra Khanong (PK)'}
                      </span>
                      {selectedPlantFilter === 'Phra Khanong' && (
                        <CheckCircle2 size={18} className="text-teal-600 dark:text-teal-400" />
                      )}
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                      {isTh
                        ? 'หน่วยกลั่นน้ำมันดิบและปรับปรุงคุณภาพ (APS-1, KHF-1, CCR, HCU)'
                        : 'Complex crude distillation & reforming units (APS-1, CCR, HCU).'}
                    </p>
                    <div className="mt-3 flex items-center gap-2 flex-wrap">
                      <span className="text-[10px] font-mono px-2.5 py-0.5 rounded-lg bg-white dark:bg-slate-800 font-bold text-teal-600 dark:text-teal-400 border border-teal-200/60 dark:border-teal-800">
                        {jobs.filter(j => j.plant === 'Phra Khanong').length} {isTh ? 'แพ็กเกจงาน (T/O)' : 'Packages Active'}
                      </span>
                      <span className="text-[10px] font-mono px-2.5 py-0.5 rounded-lg bg-slate-100 dark:bg-slate-800 font-bold text-slate-600 dark:text-slate-300">
                        {users.filter(u => u.plant === 'Phra Khanong' || u.plant === 'Both').length} {isTh ? 'ผู้ใช้งาน' : 'Users'}
                      </span>
                    </div>
                  </div>

                  <div
                    onClick={() => handlePlantChange('Sriracha')}
                    className={`p-4 rounded-2xl border-2 transition-all cursor-pointer ${
                      selectedPlantFilter === 'Sriracha'
                        ? 'border-teal-600 bg-teal-50/60 dark:bg-teal-950/40 text-teal-950 dark:text-teal-100 shadow-xs ring-2 ring-teal-500/20'
                        : 'border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 text-slate-700 dark:text-slate-300 hover:border-teal-400'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-black text-sm">
                        {isTh ? 'ศรีราชา (Si Racha - SR)' : 'Si Racha (SR)'}
                      </span>
                      {selectedPlantFilter === 'Sriracha' && (
                        <CheckCircle2 size={18} className="text-teal-600 dark:text-teal-400" />
                      )}
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                      {isTh
                        ? 'หน่วยกลั่นสุญญากาศและไฮโดรทรีตติ้ง (VPS-2, CDU-2, DHT, SRU)'
                        : 'Deep conversion vacuum & hydrotreating units (VPS-2, DHT, SRU).'}
                    </p>
                    <div className="mt-3 flex items-center gap-2 flex-wrap">
                      <span className="text-[10px] font-mono px-2.5 py-0.5 rounded-lg bg-white dark:bg-slate-800 font-bold text-teal-600 dark:text-teal-400 border border-teal-200/60 dark:border-teal-800">
                        {jobs.filter(j => j.plant === 'Sriracha').length} {isTh ? 'แพ็กเกจงาน (T/O)' : 'Packages Active'}
                      </span>
                      <span className="text-[10px] font-mono px-2.5 py-0.5 rounded-lg bg-slate-100 dark:bg-slate-800 font-bold text-slate-600 dark:text-slate-300">
                        {users.filter(u => u.plant === 'Sriracha' || u.plant === 'Both').length} {isTh ? 'ผู้ใช้งาน' : 'Users'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Setting Card 2: Signer Roles Configuration */}
            <div className="p-5 sm:p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800 gap-2 flex-wrap">
                <div className="flex items-center gap-2.5">
                  <div className="p-2.5 rounded-xl bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400 border border-blue-200/60 dark:border-blue-800">
                    <UserCheck size={18} />
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-slate-900 dark:text-slate-100">
                      {isTh ? 'บทบาทผู้มีอำนาจลงนามส่งมอบงาน (Turnover Signer Roles & Authority)' : 'Turnover Signer Roles & Authority'}
                    </h3>
                    <p className="text-xs text-slate-400">
                      {isTh ? 'กำหนดรายชื่อบทบาทสำหรับหน้าลงนามรับมอบระบบ (Sign Tab) แยกตามโรงงาน' : 'Configure default and custom sign-off roles per refinery plant'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleResetDefaultRoles}
                    className="px-2.5 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold text-xs flex items-center gap-1 hover:bg-slate-200 dark:hover:bg-slate-700 cursor-pointer transition-colors"
                    title={isTh ? 'คืนค่าบทบาทเริ่มต้น' : 'Reset Default Roles'}
                  >
                    <RotateCcw size={13} />
                    <span>{isTh ? 'คืนค่าเริ่มต้น' : 'Reset'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsAddingNewRoleModalOpen(true)}
                    className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center gap-1 cursor-pointer shadow-xs transition-colors"
                  >
                    <Plus size={13} />
                    <span>{isTh ? 'เพิ่มบทบาท' : 'Add Role'}</span>
                  </button>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center gap-2 pb-1">
                  {(['Phra Khanong', 'Sriracha'] as const).map(p => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setRolesEditPlant(p)}
                      className={`px-3.5 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                        rolesEditPlant === p
                          ? 'bg-blue-600 border-blue-600 text-white shadow-xs'
                          : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50'
                      }`}
                    >
                      {p === 'Phra Khanong'
                        ? (isTh ? '🏢 พระโขนง (Phra Khanong - PK)' : 'Phra Khanong (PK)')
                        : (isTh ? '🏭 ศรีราชา (Si Racha - SR)' : 'Si Racha (SR)')}
                    </button>
                  ))}
                </div>

                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block">
                  {isTh
                    ? `รายการบทบาทผู้ลงนามสำหรับโรงงาน ${rolesEditPlant === 'Phra Khanong' ? 'พระโขนง (PK)' : 'ศรีราชา (SR)'} (${signerRolesByPlant[rolesEditPlant].length} บทบาท):`
                    : `Signer Roles for ${rolesEditPlant === 'Phra Khanong' ? 'Phra Khanong' : 'Si Racha'} (shown in Sign tab for this plant's jobs):`}
                </label>

                <div className="space-y-2">
                  {signerRolesByPlant[rolesEditPlant].map((role, idx) => (
                    <div
                      key={role}
                      className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 flex items-center justify-between text-xs"
                    >
                      <div className="flex items-center gap-2.5">
                        <span className="w-6 h-6 rounded-lg bg-white dark:bg-slate-700 text-slate-600 dark:text-slate-300 flex items-center justify-center font-bold font-mono text-[11px] border border-slate-200/70 dark:border-slate-600">
                          {idx + 1}
                        </span>
                        <span className="font-bold text-slate-900 dark:text-slate-100">{role}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveRole(role)}
                        disabled={signerRolesByPlant[rolesEditPlant].length <= 1}
                        title={isTh ? 'ลบบทบาทนี้' : 'Remove role'}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer transition-colors"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <>

      {/* 2. Interactive Master FLOC & Plants Quick Filter Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Plant 1: Phra Khanong */}
        <div
          onClick={() => handlePlantChange(selectedPlantFilter === 'Phra Khanong' ? 'all' : 'Phra Khanong')}
          className={`p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-900 border transition-all cursor-pointer space-y-3 ${
            selectedPlantFilter === 'Phra Khanong'
              ? 'border-emerald-500 ring-2 ring-emerald-500/20 shadow-md'
              : 'border-slate-200 dark:border-slate-800 hover:border-emerald-400 shadow-xs'
          }`}
        >
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2.5">
              <span className="p-2.5 rounded-xl bg-emerald-100 dark:bg-emerald-950/60 text-[#008b52] dark:text-emerald-400 border border-emerald-300 dark:border-emerald-800">
                <Building2 size={18} />
              </span>
              <div>
                <h4 className="font-black text-sm text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <span>{isTh ? 'โรงกลั่นบางจาก พระโขนง (Phra Khanong Refinery)' : 'Bangchak Phra Khanong Refinery'}</span>
                </h4>
                <span className="text-[10px] font-mono text-slate-400">FLOC Prefix: BCP-PK-TURNOVER-S2</span>
              </div>
            </div>
            <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold font-mono shrink-0 ${
              selectedPlantFilter === 'Phra Khanong'
                ? 'bg-emerald-600 text-white'
                : 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300'
            }`}>
              {selectedPlantFilter === 'Phra Khanong' ? (isTh ? '✓ กำลังกรอง' : '✓ Filtered') : '4 Zones • Active'}
            </span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 text-[11px] font-mono">
            {[
              { tag: 'APS-1', type: 'UNIT L1' },
              { tag: 'KHF-1', type: 'UNIT L1' },
              { tag: 'TANK FARM', type: 'LOGISTICS' },
              { tag: 'CO-GEN', type: 'UTILITIES' }
            ].map(unit => {
              const isUnitSelected = selectedUnitTag === unit.tag;
              return (
                <button
                  type="button"
                  key={unit.tag}
                  onClick={(e) => {
                    e.stopPropagation();
                    handlePlantChange('Phra Khanong');
                    setSelectedUnitTag(isUnitSelected ? null : unit.tag);
                  }}
                  className={`p-2 rounded-xl border text-center transition-all cursor-pointer ${
                    isUnitSelected
                      ? 'bg-emerald-600 text-white border-emerald-500 shadow-xs'
                      : 'bg-slate-50 dark:bg-slate-800/80 border-slate-200/80 dark:border-slate-700 hover:border-emerald-400'
                  }`}
                >
                  <span className={`block text-[9px] ${isUnitSelected ? 'text-emerald-100' : 'text-slate-400'}`}>{unit.type}</span>
                  <strong className={isUnitSelected ? 'text-white' : 'text-slate-800 dark:text-slate-200'}>{unit.tag}</strong>
                </button>
              );
            })}
          </div>
        </div>

        {/* Plant 2: Si Racha */}
        <div
          onClick={() => handlePlantChange(selectedPlantFilter === 'Sriracha' ? 'all' : 'Sriracha')}
          className={`p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-900 border transition-all cursor-pointer space-y-3 ${
            selectedPlantFilter === 'Sriracha'
              ? 'border-amber-500 ring-2 ring-amber-500/20 shadow-md'
              : 'border-slate-200 dark:border-slate-800 hover:border-amber-400 shadow-xs'
          }`}
        >
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2.5">
              <span className="p-2.5 rounded-xl bg-amber-100 dark:bg-amber-950/60 text-[#ff6800] dark:text-amber-400 border border-amber-300 dark:border-amber-800">
                <Factory size={18} />
              </span>
              <div>
                <h4 className="font-black text-sm text-slate-900 dark:text-slate-100">
                  {isTh ? 'โรงกลั่นบางจาก ศรีราชา (Si Racha Complex)' : 'Bangchak Si Racha Complex'}
                </h4>
                <span className="text-[10px] font-mono text-slate-400">FLOC Prefix: BCP-SR-TURNOVER-S2</span>
              </div>
            </div>
            <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold font-mono shrink-0 ${
              selectedPlantFilter === 'Sriracha'
                ? 'bg-amber-600 text-white'
                : 'bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300'
            }`}>
              {selectedPlantFilter === 'Sriracha' ? (isTh ? '✓ กำลังกรอง' : '✓ Filtered') : '4 Zones • Active'}
            </span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 text-[11px] font-mono">
            {[
              { tag: 'VPS-2', type: 'VACUUM' },
              { tag: 'CDU-2', type: 'CRUDE' },
              { tag: 'JETTY 1-3', type: 'OFFSHORE' },
              { tag: 'BITUMEN', type: 'DISPATCH' }
            ].map(unit => {
              const isUnitSelected = selectedUnitTag === unit.tag;
              return (
                <button
                  type="button"
                  key={unit.tag}
                  onClick={(e) => {
                    e.stopPropagation();
                    handlePlantChange('Sriracha');
                    setSelectedUnitTag(isUnitSelected ? null : unit.tag);
                  }}
                  className={`p-2 rounded-xl border text-center transition-all cursor-pointer ${
                    isUnitSelected
                      ? 'bg-amber-600 text-white border-amber-500 shadow-xs'
                      : 'bg-slate-50 dark:bg-slate-800/80 border-slate-200/80 dark:border-slate-700 hover:border-amber-400'
                  }`}
                >
                  <span className={`block text-[9px] ${isUnitSelected ? 'text-amber-100' : 'text-slate-400'}`}>{unit.type}</span>
                  <strong className={isUnitSelected ? 'text-white' : 'text-slate-800 dark:text-slate-200'}>{unit.tag}</strong>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* 3. Main Data Desk: Filter & User Table / Grid (Natural Page Scroll - No Fixed Viewport Clipping) */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-sm border border-slate-200 dark:border-slate-800 flex flex-col transition-colors">
        {/* Table Toolbar */}
        <div className="p-4 sm:p-5 border-b border-slate-200 dark:border-slate-800 flex flex-col gap-3.5 bg-slate-50/70 dark:bg-slate-800/40 rounded-t-3xl">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
            {/* Search Input & Active Filter Pills */}
            <div className="flex flex-wrap items-center gap-2 flex-1 min-w-0">
              <div className="relative w-full sm:w-72">
                <input 
                  type="text" 
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder={isTh ? 'ค้นหาชื่อ, อีเมล, สิทธิ์, โซน...' : 'Search users, email, permissions, zone...'}
                  className="w-full pl-9 pr-8 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <Search size={15} className="absolute left-3 top-2.5 text-slate-400" />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                  >
                    <X size={14} />
                  </button>
                )}
              </div>

              {selectedUnitTag && (
                <span className="px-2.5 py-1.5 rounded-xl bg-cyan-100 dark:bg-cyan-950 text-cyan-800 dark:text-cyan-300 border border-cyan-300 dark:border-cyan-800 text-xs font-mono font-bold flex items-center gap-1.5">
                  <span>Unit: {selectedUnitTag}</span>
                  <button
                    type="button"
                    onClick={() => setSelectedUnitTag(null)}
                    className="hover:text-rose-500 cursor-pointer"
                  >
                    <X size={13} />
                  </button>
                </span>
              )}

              {hasActiveFilters && (
                <button
                  type="button"
                  onClick={handleResetFilters}
                  className="px-3 py-1.5 rounded-xl bg-slate-200/80 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-colors"
                >
                  <RotateCcw size={13} />
                  <span>{isTh ? 'ล้างตัวกรอง' : 'Reset Filters'}</span>
                </button>
              )}
            </div>

            {/* Right Controls: Status Filter, Plant Filter & Layout Toggle */}
            <div className="flex flex-wrap items-center gap-2 shrink-0">
              {/* Status Filter */}
              <select
                value={statusFilter}
                onChange={e => setStatusFilter(e.target.value as any)}
                className="px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-bold text-slate-800 dark:text-slate-200 outline-none cursor-pointer"
              >
                <option value="all">{isTh ? 'ทุกสถานะ (All Status)' : 'All Status'}</option>
                <option value="Active">{isTh ? '✓ ใช้งานปกติ (Active)' : '✓ Active Only'}</option>
                <option value="Inactive">{isTh ? 'ระงับ (Inactive)' : 'Inactive Only'}</option>
              </select>

              {/* Plant Location Filter */}
              <div className="flex items-center gap-1.5 text-xs text-slate-500">
                <span className="font-bold text-[11px] text-slate-400 hidden sm:inline">{isTh ? 'โรงงาน:' : 'Plant:'}</span>
                <select
                  value={selectedPlantFilter}
                  onChange={e => handlePlantChange(e.target.value as any)}
                  className="px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-bold text-slate-800 dark:text-slate-200 outline-none cursor-pointer"
                >
                  <option value="all">{isTh ? 'ทุกโรงงาน (All Plants)' : 'All Plants'}</option>
                  <option value="Phra Khanong">🏢 Bangchak พระโขนง</option>
                  <option value="Sriracha">🏭 Bangchak ศรีราชา</option>
                </select>
              </div>

              {/* View Layout Switcher (Table vs Card Grid) */}
              <div className="inline-flex items-center rounded-xl bg-white dark:bg-slate-900 p-1 border border-slate-200 dark:border-slate-700">
                <button
                  type="button"
                  onClick={() => setViewLayout('table')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer transition-colors ${
                    viewLayout === 'table'
                      ? 'bg-blue-600 text-white'
                      : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                  }`}
                  title={isTh ? 'มุมมองตาราง' : 'Table View'}
                >
                  <List size={14} />
                  <span className="hidden sm:inline">{isTh ? 'ตาราง' : 'Table'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setViewLayout('grid')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer transition-colors ${
                    viewLayout === 'grid'
                      ? 'bg-blue-600 text-white'
                      : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                  }`}
                  title={isTh ? 'มุมมองการ์ด' : 'Card Grid View'}
                >
                  <LayoutGrid size={14} />
                  <span className="hidden sm:inline">{isTh ? 'การ์ด' : 'Cards'}</span>
                </button>
              </div>
            </div>
          </div>

          {/* Role Filter Tabs (Includes All 6 Role Classifications) */}
          <div className="flex items-center gap-1.5 flex-wrap text-[11px]">
            <button
              type="button"
              onClick={() => setSelectedRoleFilter('all')}
              className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer ${
                selectedRoleFilter === 'all' 
                  ? 'bg-blue-600 text-white shadow-xs' 
                  : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:border-blue-400'
              }`}
            >
              {isTh ? 'ทุกบทบาท' : 'All Roles'} ({roleCounts.all})
            </button>
            <button
              type="button"
              onClick={() => setSelectedRoleFilter('operations')}
              className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer ${
                selectedRoleFilter === 'operations' 
                  ? 'bg-emerald-600 text-white shadow-xs' 
                  : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:border-emerald-400'
              }`}
            >
              {isTh ? 'ฝ่ายผลิต (Operations)' : 'Operations'} ({roleCounts.operations})
            </button>
            <button
              type="button"
              onClick={() => setSelectedRoleFilter('engineer')}
              className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer ${
                selectedRoleFilter === 'engineer' 
                  ? 'bg-indigo-600 text-white shadow-xs' 
                  : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:border-indigo-400'
              }`}
            >
              {isTh ? 'วิศวกร (Engineer)' : 'Engineers'} ({roleCounts.engineer})
            </button>
            <button
              type="button"
              onClick={() => setSelectedRoleFilter('inspector')}
              className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer ${
                selectedRoleFilter === 'inspector' 
                  ? 'bg-purple-600 text-white shadow-xs' 
                  : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:border-purple-400'
              }`}
            >
              {isTh ? 'ผู้ตรวจสอบ (Inspector)' : 'Inspectors'} ({roleCounts.inspector})
            </button>
            <button
              type="button"
              onClick={() => setSelectedRoleFilter('qaqc')}
              className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer ${
                selectedRoleFilter === 'qaqc' 
                  ? 'bg-cyan-600 text-white shadow-xs' 
                  : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:border-cyan-400'
              }`}
            >
              {isTh ? 'ควบคุมคุณภาพ (QA/QC)' : 'QA/QC'} ({roleCounts.qaqc})
            </button>
            <button
              type="button"
              onClick={() => setSelectedRoleFilter('contractor')}
              className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer ${
                selectedRoleFilter === 'contractor' 
                  ? 'bg-amber-600 text-white shadow-xs' 
                  : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:border-amber-400'
              }`}
            >
              {isTh ? 'ผู้รับเหมา (Contractor)' : 'Contractors'} ({roleCounts.contractor})
            </button>
            <button
              type="button"
              onClick={() => setSelectedRoleFilter('admin')}
              className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer ${
                selectedRoleFilter === 'admin' 
                  ? 'bg-slate-700 text-white shadow-xs' 
                  : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:border-slate-400'
              }`}
            >
              {isTh ? 'ผู้ดูแลระบบ (Admin)' : 'System Admin'} ({roleCounts.admin})
            </button>
          </div>
        </div>

        {/* Users View: Table or Card Grid */}
        {viewLayout === 'table' ? (
          <div className="w-full overflow-x-auto custom-scrollbar">
            <table className="w-full min-w-[920px] text-left border-collapse">
              <thead className="bg-slate-50/90 dark:bg-slate-900/90 border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="p-4 text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">{isTh ? 'ชื่อและสังกัด' : 'User & Identity'}</th>
                  <th className="p-4 text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">{isTh ? 'บทบาทหน้าที่' : 'Designated Role'}</th>
                  <th className="p-4 text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">{isTh ? 'อีเมลทางการ' : 'Enterprise Email'}</th>
                  <th className="p-4 text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">{isTh ? 'โรงงานและพื้นที่' : 'Plant & Location'}</th>
                  <th className="p-4 text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">{isTh ? 'สิทธิ์การเข้าถึงโมดูล (8 Modules)' : 'Modular Security Access'}</th>
                  <th className="p-4 text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">{isTh ? 'สถานะ' : 'Status'}</th>
                  <th className="p-4 text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider text-right">{isTh ? 'จัดการ' : 'Actions'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
                {filteredUsers.map((user) => (
                  <tr key={user.id} className="hover:bg-slate-50/90 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800 flex items-center justify-center font-bold text-xs shrink-0">
                          {user.name.charAt(0)}
                        </div>
                        <div>
                          <span className="font-bold text-slate-900 dark:text-slate-100 block">{user.name}</span>
                          <span className="text-[10px] font-mono text-slate-400 uppercase">{user.roleType}</span>
                        </div>
                      </div>
                    </td>
                    <td className="p-4 text-slate-700 dark:text-slate-300 font-medium">
                      <div className="flex items-center gap-1.5">
                        <ShieldCheck size={14} className="text-emerald-500 shrink-0" />
                        <span>{user.role}</span>
                      </div>
                    </td>
                    <td className="p-4 text-slate-500 dark:text-slate-400 font-mono text-[11px]">{user.email}</td>
                    <td className="p-4">
                      <div className="space-y-1">
                        <span className="font-medium text-slate-800 dark:text-slate-200 block">{user.location}</span>
                        <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded inline-block ${
                          user.plant === 'Phra Khanong' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300' :
                          user.plant === 'Sriracha' ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300' :
                          'bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300'
                        }`}>
                          {user.plant === 'Both' ? 'Both Plants' : user.plant}
                        </span>
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="flex flex-wrap gap-1 max-w-xs">
                        {user.permissions.map(perm => (
                          <span key={perm} className="px-2 py-0.5 rounded-md text-[9px] font-mono font-bold uppercase tracking-wider bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                            {perm}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="p-4">
                      <button
                        type="button"
                        onClick={() => handleToggleUserStatus(user)}
                        className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider cursor-pointer transition-all ${
                          user.status === 'Active' 
                            ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 hover:bg-emerald-200' 
                            : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 border border-slate-300 hover:bg-slate-200'
                        }`}
                        title={isTh ? 'คลิกเพื่อสลับสถานะ Active / Inactive' : 'Click to toggle Active / Inactive'}
                      >
                        {user.status === 'Active' ? (isTh ? '✓ ใช้งานปกติ' : 'Active') : (isTh ? 'ระงับ' : 'Inactive')}
                      </button>
                    </td>
                    <td className="p-4 text-right">
                      {deletingUserId === user.id ? (
                        <div className="inline-flex items-center gap-1.5 bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 px-2 py-1 rounded-xl">
                          <span className="text-[10px] font-bold text-rose-700 dark:text-rose-300">
                            {isTh ? 'ยืนยันลบ?' : 'Delete?'}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleConfirmDeleteUser(user.id)}
                            className="px-2 py-0.5 rounded bg-rose-600 hover:bg-rose-700 text-white text-[10px] font-bold cursor-pointer"
                          >
                            {isTh ? 'ลบ' : 'Yes'}
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeletingUserId(null)}
                            className="px-2 py-0.5 rounded bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-[10px] font-bold cursor-pointer"
                          >
                            {isTh ? 'ยกเลิก' : 'No'}
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center justify-end gap-1.5">
                          <button 
                            type="button"
                            onClick={() => handleOpenEditModal(user)}
                            className="px-2.5 py-1.5 text-blue-600 dark:text-blue-400 bg-blue-50/70 dark:bg-blue-950/40 hover:bg-blue-100 dark:hover:bg-blue-900/50 border border-blue-200/70 dark:border-blue-800/60 rounded-lg cursor-pointer transition-colors flex items-center gap-1 text-[11px] font-bold" 
                            title={isTh ? "แก้ไขข้อมูลผู้ใช้" : "Edit User"}
                          >
                            <Edit2 size={13} />
                            <span>{isTh ? 'แก้ไข' : 'Edit'}</span>
                          </button>
                          <button 
                            type="button"
                            onClick={() => setDeletingUserId(user.id)}
                            className="p-1.5 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-900/30 rounded-lg cursor-pointer transition-colors" 
                            title={isTh ? "ลบผู้ใช้" : "Delete User"}
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
                {filteredUsers.length === 0 && (
                  <tr>
                    <td colSpan={7} className="p-10 text-center text-slate-400">
                      <div className="space-y-2">
                        <p className="text-sm font-bold text-slate-600 dark:text-slate-300">
                          {isTh ? 'ไม่พบรายชื่อผู้ใช้งานที่ตรงกับเงื่อนไข' : 'No users found matching your search criteria.'}
                        </p>
                        <button
                          type="button"
                          onClick={handleResetFilters}
                          className="px-3.5 py-1.5 rounded-xl bg-blue-600 text-white text-xs font-bold cursor-pointer"
                        >
                          {isTh ? 'แสดงผู้ใช้งานทั้งหมด' : 'Show All Users'}
                        </button>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        ) : (
          /* Card Grid View */
          <div className="p-4 sm:p-5 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredUsers.map(user => (
              <div
                key={user.id}
                className="p-4 rounded-2xl bg-slate-50/70 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/80 hover:border-blue-400 transition-all flex flex-col justify-between gap-3"
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800 flex items-center justify-center font-black text-sm shrink-0">
                        {user.name.charAt(0)}
                      </div>
                      <div>
                        <h4 className="font-bold text-sm text-slate-900 dark:text-white">{user.name}</h4>
                        <span className="text-[10px] font-mono text-slate-400 uppercase">{user.roleType} • {user.email}</span>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleToggleUserStatus(user)}
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase cursor-pointer ${
                        user.status === 'Active'
                          ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
                          : 'bg-slate-200 text-slate-600 dark:bg-slate-700 dark:text-slate-300'
                      }`}
                    >
                      {user.status}
                    </button>
                  </div>

                  <div className="text-xs font-medium text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                    <ShieldCheck size={14} className="text-emerald-500 shrink-0" />
                    <span>{user.role}</span>
                  </div>

                  <div className="flex items-center justify-between text-[11px] bg-white dark:bg-slate-900 p-2.5 rounded-xl border border-slate-200/70 dark:border-slate-800">
                    <span className="text-slate-600 dark:text-slate-300 truncate">{user.location}</span>
                    <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded shrink-0 ${
                      user.plant === 'Phra Khanong' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300' :
                      user.plant === 'Sriracha' ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300' :
                      'bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300'
                    }`}>
                      {user.plant === 'Both' ? 'Both Plants' : user.plant}
                    </span>
                  </div>

                  <div className="flex flex-wrap gap-1">
                    {user.permissions.map(perm => (
                      <span key={perm} className="px-2 py-0.5 rounded-md text-[9px] font-mono font-bold uppercase bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                        {perm}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-200/80 dark:border-slate-700/80 flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => handleOpenEditModal(user)}
                    className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold flex items-center gap-1 cursor-pointer"
                  >
                    <Edit2 size={12} />
                    <span>{isTh ? 'แก้ไขสิทธิ์' : 'Edit Profile'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleConfirmDeleteUser(user.id)}
                    className="p-1.5 rounded-xl text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/50 cursor-pointer"
                    title={isTh ? 'ลบผู้ใช้' : 'Delete User'}
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Table Footer Summary */}
        <div className="px-5 py-3.5 border-t border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 rounded-b-3xl flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-slate-500 dark:text-slate-400">
          <span>
            {isTh
              ? `แสดง ${filteredUsers.length} จากทั้งหมด ${users.length} บัญชีผู้ใช้งาน`
              : `Showing ${filteredUsers.length} of ${users.length} enterprise user accounts`}
          </span>
          <span className="font-mono text-[11px]">
            RBAC Governance • Bangchak Phra Khanong & Si Racha
          </span>
        </div>
      </div>

        </>
      )}

      {/* 4. Add / Edit User Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl max-w-lg w-full overflow-hidden flex flex-col animate-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-800/50">
              <div className="flex items-center gap-2.5">
                <span className="p-2 rounded-xl bg-blue-600 text-white">
                  <UserCheck size={18} />
                </span>
                <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                  {editingUserId ? (isTh ? 'แก้ไขข้อมูลผู้ใช้งาน' : 'Edit User Profile') : (isTh ? 'เพิ่มผู้ใช้งานและกำหนดสิทธิ์' : 'Add New User & Security Role')}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Body Form */}
            <form onSubmit={handleSaveUser} className="p-5 space-y-4 overflow-y-auto max-h-[75vh] text-xs">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block">
                  {isTh ? 'ชื่อ - นามสกุล:' : 'Full Name:'} *
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g. Somchai Prasert"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-medium outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block">
                    {isTh ? 'ประเภทบุคลากร:' : 'Role Classification:'}
                  </label>
                  <select
                    value={formData.roleType}
                    onChange={e => setFormData({ ...formData, roleType: e.target.value as any })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-medium outline-none cursor-pointer"
                  >
                    <option value="operations">Operations (ฝ่ายผลิต)</option>
                    <option value="engineer">Engineer (วิศวกร)</option>
                    <option value="inspector">Inspector (ผู้ตรวจสอบ)</option>
                    <option value="qaqc">QA/QC Quality</option>
                    <option value="contractor">Contractor (ผู้รับเหมา)</option>
                    <option value="admin">System Admin</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block">
                    {isTh ? 'โรงงานปฏิบัติการ:' : 'Primary Plant:'}
                  </label>
                  <select
                    value={formData.plant}
                    onChange={e => setFormData({ ...formData, plant: e.target.value as any })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-medium outline-none cursor-pointer"
                  >
                    <option value="Phra Khanong">🏢 Bangchak พระโขนง</option>
                    <option value="Sriracha">🏭 Bangchak ศรีราชา</option>
                    <option value="Both">🏢 + 🏭 ทั้งสองโรงงาน (Both)</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block">
                  {isTh ? 'ตำแหน่งทางการ:' : 'Official Designation Title:'} *
                </label>
                <input
                  type="text"
                  required
                  value={formData.role}
                  onChange={e => setFormData({ ...formData, role: e.target.value })}
                  placeholder="e.g. Operations Shift Supervisor (ฝ่ายปฏิบัติการผลิต)"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-medium outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block">
                  {isTh ? 'อีเมลทางการ:' : 'Email Address:'} *
                </label>
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={e => setFormData({ ...formData, email: e.target.value })}
                  placeholder="name@bangchak.co.th"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-mono outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block">
                  {isTh ? 'สถานที่ประจำการ / โซนหน้างาน:' : 'Duty Station / Battery Limit:'}
                </label>
                <input
                  type="text"
                  value={formData.location}
                  onChange={e => setFormData({ ...formData, location: e.target.value })}
                  placeholder="e.g. Unit APS-1 / KHF-1 or Si Racha VPS-2"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-medium outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Permissions Checklist */}
              <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block">
                  {isTh ? 'สิทธิ์การเข้าถึงโมดูล (Module Permissions):' : 'Module Permissions:'}
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {AVAILABLE_PERMISSIONS.map(perm => {
                    const checked = formData.permissions.includes(perm);
                    return (
                      <button
                        type="button"
                        key={perm}
                        onClick={() => togglePermission(perm)}
                        className={`p-2.5 rounded-xl border text-left text-xs font-bold transition-all flex items-center justify-between cursor-pointer ${
                          checked 
                            ? 'bg-blue-50 dark:bg-blue-950/40 border-blue-500 text-blue-700 dark:text-blue-300' 
                            : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                        }`}
                      >
                        <span>{perm}</span>
                        {checked && <Check size={14} className="text-blue-600 dark:text-blue-400" />}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Status */}
              <div className="flex items-center gap-4 pt-2">
                <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-700 dark:text-slate-300">
                  <input
                    type="checkbox"
                    checked={formData.status === 'Active'}
                    onChange={e => setFormData({ ...formData, status: e.target.checked ? 'Active' : 'Inactive' })}
                    className="w-4 h-4 text-emerald-600 rounded cursor-pointer"
                  />
                  <span>{isTh ? 'เปิดใช้งานบัญชีนี้ (Account Active)' : 'Account Active'}</span>
                </label>
              </div>

              {/* Form Buttons */}
              <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                >
                  {isTh ? 'ยกเลิก' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-md cursor-pointer"
                >
                  {isTh ? 'บันทึกข้อมูล' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 5. Add New Signer Role Modal (for Plant & Role Settings Tab) */}
      {isAddingNewRoleModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl max-w-md w-full p-6 space-y-4 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <UserCheck size={16} className="text-teal-600" />
                <span>{isTh ? 'เพิ่มบทบาทผู้ลงนามใหม่ (Add Signer Role)' : 'Add New Signer Role'}</span>
              </h3>
              <button
                type="button"
                onClick={() => setIsAddingNewRoleModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block">
                {isTh ? 'ชื่อบทบาทผู้มีอำนาจลงนาม *' : 'New Role Title *'}
              </label>
              <input
                type="text"
                value={newRoleInput}
                onChange={e => setNewRoleInput(e.target.value)}
                placeholder={isTh ? 'เช่น Lead Piping Inspector, Process Safety Eng...' : 'e.g. Lead Piping Inspector, Process Safety Eng...'}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-semibold text-slate-900 dark:text-slate-100 outline-none focus:ring-2 focus:ring-teal-500/20"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsAddingNewRoleModalOpen(false)}
                className="px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300 cursor-pointer"
              >
                {isTh ? 'ยกเลิก' : 'Cancel'}
              </button>
              <button
                type="button"
                onClick={handleAddNewRole}
                className="px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs cursor-pointer shadow-xs"
              >
                {isTh ? 'เพิ่มบทบาท' : 'Add Role'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

