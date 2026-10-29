import React, { useState, useMemo } from 'react';
import { 
  Users, Settings, Plus, Search, MoreVertical, Edit2, Trash2, 
  Check, X, Building2, Factory, ShieldCheck, UserCheck, Key,
  ExternalLink, FileSpreadsheet, Lock, Sparkles
} from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';

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
    location: 'Zone Crane Yard', 
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
    location: 'Si Racha Complex Yard', 
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

export default function UserConfig() {
  const { language } = useLanguage();
  const isTh = language === 'th';

  const [users, setUsers] = useState<UserRecord[]>(INITIAL_USERS);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRoleFilter, setSelectedRoleFilter] = useState<string>('all');
  const [selectedPlantFilter, setSelectedPlantFilter] = useState<'all' | 'Phra Khanong' | 'Sriracha'>('all');

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
      location: 'Bangchak พระโขนง',
      plant: 'Phra Khanong',
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
    } else {
      const newUser: UserRecord = {
        ...formData,
        id: Date.now()
      };
      setUsers(prev => [newUser, ...prev]);
    }
    setIsModalOpen(false);
  };

  const handleDeleteUser = (id: number) => {
    if (confirm(isTh ? 'ยืนยันการลบผู้ใช้งานรายนี้ออกจากระบบ?' : 'Are you sure you want to remove this user?')) {
      setUsers(prev => prev.filter(u => u.id !== id));
    }
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
  }, [users, searchQuery, selectedRoleFilter, selectedPlantFilter]);

  return (
    <div className="flex flex-col h-full space-y-6 pb-12 animate-in fade-in duration-200">
      {/* 1. Header Banner */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 shrink-0 bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 p-6 rounded-3xl text-white shadow-xl border border-slate-700/60">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full bg-blue-500/20 text-blue-400 border border-blue-500/30 font-mono text-[11px] font-semibold flex items-center gap-1.5">
              <Key size={13} className="text-blue-400" />
              <span>MODULE 8: MASTER DATA & ADMIN</span>
            </span>
            <span className="text-slate-400 text-xs">
              • Bangchak Phra Khanong & Si Racha Enterprise Governance
            </span>
          </div>

          <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight flex items-center gap-2.5">
            <Users size={26} className="text-blue-400" />
            <span>{isTh ? 'การตั้งค่าและจัดการข้อมูลระบบ (Master Data & Users)' : 'Master Data & User Configuration'}</span>
          </h2>
          <p className="text-xs sm:text-sm text-slate-300 max-w-3xl leading-relaxed">
            {isTh 
              ? 'จัดการโครงสร้างโรงงาน (Master FLOC & Plants) และบริหารสิทธิ์ผู้ใช้งาน: วิศวกร (Engineer), ผู้ตรวจสอบ (Inspector), ตัวแทนฝ่ายผลิต (Operations) และผู้รับเหมา (Contractor) สำหรับการลงนามตรวจรับและปฏิบัติงาน' 
              : 'Enterprise administration for refinery Functional Locations, multi-plant master zones, and role-based access control (RBAC) across Engineering, Operations, Inspection, and Contractors.'}
          </p>
        </div>

        <div className="flex items-center gap-2.5 self-start lg:self-center shrink-0">
          <button 
            type="button"
            onClick={handleOpenAddModal}
            className="bg-[#008b52] hover:bg-[#007b48] text-white font-bold py-2.5 px-4 rounded-xl shadow-lg shadow-emerald-950/40 transition-all text-xs flex items-center justify-center gap-2 cursor-pointer"
          >
            <Plus size={16} />
            <span>{isTh ? '+ เพิ่มผู้ใช้งานและสิทธิ์ใหม่' : '+ Add User & Permissions'}</span>
          </button>
        </div>
      </div>

      {/* 2. Master FLOC & Plants Quick Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Plant 1: Phra Khanong */}
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="p-2 rounded-xl bg-emerald-100 dark:bg-emerald-950/60 text-[#008b52] border border-emerald-300 dark:border-emerald-800">
                <Building2 size={18} />
              </span>
              <div>
                <h4 className="font-black text-sm text-slate-900 dark:text-slate-100">
                  {isTh ? 'โรงกลั่นบางจาก พระโขนง (Phra Khanong Refinery)' : 'Bangchak Phra Khanong Refinery'}
                </h4>
                <span className="text-[10px] font-mono text-slate-400">FLOC Prefix: BCP-PK-TURNOVER-S2</span>
              </div>
            </div>
            <span className="px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 text-[10px] font-bold font-mono">
              4 Zones • Active
            </span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 text-[11px] font-mono">
            <div className="p-2 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 text-center">
              <span className="text-slate-400 block text-[9px]">UNIT L1</span>
              <strong className="text-slate-800 dark:text-slate-200">APS-1</strong>
            </div>
            <div className="p-2 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 text-center">
              <span className="text-slate-400 block text-[9px]">UNIT L1</span>
              <strong className="text-slate-800 dark:text-slate-200">KHF-1</strong>
            </div>
            <div className="p-2 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 text-center">
              <span className="text-slate-400 block text-[9px]">LOGISTICS</span>
              <strong className="text-slate-800 dark:text-slate-200">TANK FARM</strong>
            </div>
            <div className="p-2 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 text-center">
              <span className="text-slate-400 block text-[9px]">UTILITIES</span>
              <strong className="text-slate-800 dark:text-slate-200">CO-GEN</strong>
            </div>
          </div>
        </div>

        {/* Plant 2: Si Racha */}
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="p-2 rounded-xl bg-amber-100 dark:bg-amber-950/60 text-[#ff6800] border border-amber-300 dark:border-amber-800">
                <Factory size={18} />
              </span>
              <div>
                <h4 className="font-black text-sm text-slate-900 dark:text-slate-100">
                  {isTh ? 'โรงกลั่นบางจาก ศรีราชา (Si Racha Complex)' : 'Bangchak Si Racha Complex'}
                </h4>
                <span className="text-[10px] font-mono text-slate-400">FLOC Prefix: BCP-SR-TURNOVER-S2</span>
              </div>
            </div>
            <span className="px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 text-[10px] font-bold font-mono">
              4 Zones • Active
            </span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 text-[11px] font-mono">
            <div className="p-2 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 text-center">
              <span className="text-slate-400 block text-[9px]">VACUUM</span>
              <strong className="text-slate-800 dark:text-slate-200">VPS-2</strong>
            </div>
            <div className="p-2 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 text-center">
              <span className="text-slate-400 block text-[9px]">CRUDE</span>
              <strong className="text-slate-800 dark:text-slate-200">CDU-2</strong>
            </div>
            <div className="p-2 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 text-center">
              <span className="text-slate-400 block text-[9px]">OFFSHORE</span>
              <strong className="text-slate-800 dark:text-slate-200">JETTY 1-3</strong>
            </div>
            <div className="p-2 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 text-center">
              <span className="text-slate-400 block text-[9px]">DISPATCH</span>
              <strong className="text-slate-800 dark:text-slate-200">BITUMEN</strong>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Main Data Desk: Filter & User Table */}
      <div className="flex-1 bg-white dark:bg-slate-900 rounded-3xl shadow-sm border border-slate-200 dark:border-slate-800 flex flex-col overflow-hidden transition-colors">
        {/* Table Toolbar */}
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-3 bg-slate-50/70 dark:bg-slate-800/40">
          <div className="flex flex-wrap items-center gap-2 flex-1 min-w-0">
            {/* Search Input */}
            <div className="relative w-full sm:w-64">
              <input 
                type="text" 
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder={isTh ? 'ค้นหาชื่อ, อีเมล, สิทธิ์...' : 'Search users, email, permissions...'}
                className="w-full pl-9 pr-4 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <Search size={15} className="absolute left-3 top-2.5 text-slate-400" />
            </div>

            {/* Role Filter Tabs */}
            <div className="flex items-center gap-1 overflow-x-auto text-[11px] pb-1 sm:pb-0">
              <button
                type="button"
                onClick={() => setSelectedRoleFilter('all')}
                className={`px-2.5 py-1.5 rounded-lg font-bold transition-colors cursor-pointer ${
                  selectedRoleFilter === 'all' 
                    ? 'bg-blue-600 text-white' 
                    : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
                }`}
              >
                {isTh ? 'ทุกบทบาท' : 'All Roles'} ({users.length})
              </button>
              <button
                type="button"
                onClick={() => setSelectedRoleFilter('operations')}
                className={`px-2.5 py-1.5 rounded-lg font-bold transition-colors cursor-pointer ${
                  selectedRoleFilter === 'operations' 
                    ? 'bg-emerald-600 text-white' 
                    : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
                }`}
              >
                {isTh ? 'ฝ่ายผลิต (Operations)' : 'Operations'}
              </button>
              <button
                type="button"
                onClick={() => setSelectedRoleFilter('engineer')}
                className={`px-2.5 py-1.5 rounded-lg font-bold transition-colors cursor-pointer ${
                  selectedRoleFilter === 'engineer' 
                    ? 'bg-indigo-600 text-white' 
                    : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
                }`}
              >
                {isTh ? 'วิศวกร (Engineer)' : 'Engineers'}
              </button>
              <button
                type="button"
                onClick={() => setSelectedRoleFilter('inspector')}
                className={`px-2.5 py-1.5 rounded-lg font-bold transition-colors cursor-pointer ${
                  selectedRoleFilter === 'inspector' 
                    ? 'bg-purple-600 text-white' 
                    : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
                }`}
              >
                {isTh ? 'ผู้ตรวจสอบ (Inspector)' : 'Inspectors'}
              </button>
              <button
                type="button"
                onClick={() => setSelectedRoleFilter('contractor')}
                className={`px-2.5 py-1.5 rounded-lg font-bold transition-colors cursor-pointer ${
                  selectedRoleFilter === 'contractor' 
                    ? 'bg-amber-600 text-white' 
                    : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
                }`}
              >
                {isTh ? 'ผู้รับเหมา (Contractor)' : 'Contractors'}
              </button>
            </div>
          </div>

          {/* Plant Location Filter */}
          <div className="flex items-center gap-1.5 text-xs text-slate-500 shrink-0">
            <span className="font-bold text-[11px] text-slate-400">{isTh ? 'โรงงาน:' : 'Plant:'}</span>
            <select
              value={selectedPlantFilter}
              onChange={e => setSelectedPlantFilter(e.target.value as any)}
              className="px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-bold text-slate-800 dark:text-slate-200 outline-none cursor-pointer"
            >
              <option value="all">{isTh ? 'ทุกโรงงาน (All Plants)' : 'All Plants'}</option>
              <option value="Phra Khanong">🏢 Bangchak พระโขนง</option>
              <option value="Sriracha">🏭 Bangchak ศรีราชา</option>
            </select>
          </div>
        </div>

        {/* Users Table */}
        <div className="flex-1 overflow-auto custom-scrollbar">
          <table className="w-full text-left border-collapse">
            <thead className="bg-white dark:bg-slate-900 sticky top-0 z-10 border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="p-4 text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">{isTh ? 'ชื่อและสังกัด' : 'User & Identity'}</th>
                <th className="p-4 text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">{isTh ? 'บทบาทหน้าที่' : 'Designated Role'}</th>
                <th className="p-4 text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">{isTh ? 'อีเมลทางการ' : 'Enterprise Email'}</th>
                <th className="p-4 text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">{isTh ? 'โรงงานและพื้นที่' : 'Plant & Location'}</th>
                <th className="p-4 text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">{isTh ? 'สิทธิ์การเข้าถึงโมดูล (8 Modules)' : 'Modular Security Access'}</th>
                <th className="p-4 text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">{isTh ? 'สถานะ' : 'Status'}</th>
                <th className="p-4 text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider text-right">{isTh ? 'จัดการ' : 'Actions'}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
              {filteredUsers.map((user) => (
                <tr key={user.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors group">
                  <td className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800 flex items-center justify-center font-bold text-xs shrink-0">
                        {user.name.charAt(0)}
                      </div>
                      <div>
                        <span className="font-bold text-slate-900 dark:text-slate-100 block">{user.name}</span>
                        <span className="text-[10px] font-mono text-slate-400 capitalize">{user.roleType}</span>
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
                    <div className="space-y-0.5">
                      <span className="font-medium text-slate-800 dark:text-slate-200 block">{user.location}</span>
                      <span className={`text-[10px] font-mono font-bold px-1.5 py-0.2 rounded inline-block ${
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
                    <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                      user.status === 'Active' 
                        ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800' 
                        : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 border border-slate-300'
                    }`}>
                      {user.status === 'Active' ? (isTh ? '✓ ใช้งานปกติ' : 'Active') : (isTh ? 'ระงับ' : 'Inactive')}
                    </span>
                  </td>
                  <td className="p-4 text-right">
                    <div className="flex items-center justify-end gap-1.5 opacity-80 sm:opacity-0 group-hover:opacity-100 transition-opacity">
                      <button 
                        type="button"
                        onClick={() => handleOpenEditModal(user)}
                        className="p-1.5 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg cursor-pointer transition-colors" 
                        title={isTh ? "แก้ไขข้อมูลผู้ใช้" : "Edit User"}
                      >
                        <Edit2 size={15} />
                      </button>
                      <button 
                        type="button"
                        onClick={() => handleDeleteUser(user.id)}
                        className="p-1.5 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg cursor-pointer transition-colors" 
                        title={isTh ? "ลบผู้ใช้" : "Delete User"}
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filteredUsers.length === 0 && (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-slate-400">
                    {isTh ? 'ไม่พบรายชื่อผู้ใช้งานที่ตรงกับเงื่อนไข' : 'No users found matching your search criteria.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

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
    </div>
  );
}
