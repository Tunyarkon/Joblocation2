import React, { useState } from 'react';
import { Eye, EyeOff, ShieldCheck, Mail, Lock, Check, Sparkles } from 'lucide-react';
import bgBcp from '../assets/BG_BCP.jpg';
import bcpLogo from '../assets/bcp_logo.png';

interface LoginPageProps {
  onLogin: (userData: { email: string; name: string; role: string }) => void;
}

export default function LoginPage({ onLogin }: LoginPageProps) {
  const [email, setEmail] = useState('Admin');
  const [password, setPassword] = useState('Admin');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [activeModal, setActiveModal] = useState<'policy' | 'help' | 'privacy' | null>(null);

  // Logo component using clean transparent PNG
  const BangchakLeafLogo = ({ className = "w-16 h-16" }: { className?: string }) => (
    <img 
      src={bcpLogo} 
      alt="Bangchak Logo" 
      className={`object-contain ${className}`} 
    />
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      setErrorMessage('กรุณาระบุ Username (เช่น Admin)');
      return;
    }
    if (!password.trim()) {
      setErrorMessage('กรุณาระบุ Password (เช่น Admin)');
      return;
    }
    setIsLoading(true);
    setErrorMessage('');

    setTimeout(() => {
      setIsLoading(false);
      const isAdmUser = email.trim().toLowerCase() === 'admin';
      const isAdmPass = password.trim() === 'Admin' || password.trim().toLowerCase() === 'admin';

      if (isAdmUser && isAdmPass) {
        onLogin({
          email: 'admin@bangchak.co.th',
          name: 'Admin',
          role: 'System Administrator'
        });
      } else if (isAdmUser && !isAdmPass) {
        setErrorMessage('รหัสผ่านไม่ถูกต้อง (กรุณาระบุ Password: Admin)');
      } else {
        onLogin({
          email,
          name: email.includes('@') ? email.split('@')[0].replace('.', ' ').toUpperCase() : email.toUpperCase(),
          role: email.toLowerCase().includes('manager') ? 'Plant Operations Manager' : 'Turnaround Lead Engineer'
        });
      }
    }, 450);
  };

  const handleSsoLogin = () => {
    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
      onLogin({
        email: 'admin@bangchak.co.th',
        name: 'Admin',
        role: 'System Administrator'
      });
    }, 450);
  };

  const handleQuickSelect = (demoUsername: string, demoRole: string) => {
    setEmail(demoUsername);
    setPassword(demoUsername === 'Admin' ? 'Admin' : '••••••••••••');
    onLogin({
      email: demoUsername === 'Admin' ? 'admin@bangchak.co.th' : demoUsername,
      name: demoUsername === 'Admin' ? 'Admin' : demoUsername.split('@')[0].replace('.', ' ').toUpperCase(),
      role: demoRole
    });
  };

  return (
    <div className="min-h-screen w-full flex flex-col lg:flex-row bg-[#0B132B] text-white overflow-hidden select-none font-sans">
      
      {/* =========================================================================
          LEFT PANEL: HIGH-RES STATIC SUNSET REFINERY LANDSCAPE (NO ANIMATION, CRYSTAL CLEAR)
         ========================================================================= */}
      <div className="relative w-full lg:w-[62%] h-[320px] sm:h-[400px] lg:h-screen shrink-0 overflow-hidden bg-slate-950">
        {/* 100% Static Crystal-Clear 2.5K Image (No scale, no transform, no transition, no movement) */}
        <img 
          src={bgBcp} 
          alt="Bangchak Phra Khanong Refinery Sunset Landscape" 
          loading="eager"
          decoding="sync"
          className="w-full h-full object-cover object-center pointer-events-none block"
          style={{ imageRendering: 'auto' }}
        />

        {/* Cinematic Vignette Overlays for Depth and Contrast */}
        <div className="absolute inset-0 bg-gradient-to-r from-black/55 via-transparent to-[#0B132B] lg:block hidden pointer-events-none" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#0B132B] via-transparent to-black/50 lg:hidden block pointer-events-none" />
        <div className="absolute inset-0 bg-black/15 pointer-events-none" />

        {/* Top-Left Authentic Bangchak Group Brand Header */}
        <div className="absolute top-6 left-6 sm:top-9 sm:left-10 z-20 flex items-center gap-3.5">
          <BangchakLeafLogo className="w-11 h-11 sm:w-13 sm:h-13 shrink-0 drop-shadow-2xl" />
          <div className="flex flex-col">
            <div className="flex items-baseline gap-2 leading-none">
              <span className="text-2xl sm:text-3xl font-black lowercase tracking-tight text-white drop-shadow-lg">
                bangchak
              </span>
              <span className="text-xs sm:text-sm font-bold uppercase tracking-widest text-white/95 drop-shadow-md">
                GROUP
              </span>
            </div>
            <span className="text-[8.5px] sm:text-[10px] font-extrabold uppercase tracking-[0.22em] text-white/90 mt-1.5 drop-shadow-md">
              THE LEADING GREENOVATION GROUP
            </span>
          </div>
        </div>

        {/* Bottom Operational Telemetry Badge */}
        <div className="hidden lg:flex absolute bottom-8 left-10 z-20 items-center gap-3 text-[11px] text-white/80 bg-slate-950/70 backdrop-blur-md px-4 py-2 rounded-xl border border-white/10 font-mono shadow-xl">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="font-semibold text-slate-200">BANGCHAK REFINERY COMPLEX</span>
          <span className="text-slate-500">•</span>
          <span className="text-emerald-400 font-bold">120,000 BPD</span>
          <span className="text-slate-500">•</span>
          <span className="text-slate-400">TURNAROUND MANAGEMENT SYSTEM</span>
        </div>
      </div>

      {/* =========================================================================
          RIGHT PANEL: ENTERPRISE CAD-GRID LOGIN PORTAL
         ========================================================================= */}
      <div 
        className="relative flex-1 min-h-[580px] lg:h-screen flex flex-col justify-between p-6 sm:p-10 lg:p-14 z-10 bg-[#0B132B]"
        style={{
          backgroundImage: `
            linear-gradient(to right, rgba(56, 189, 248, 0.04) 1px, transparent 1px),
            linear-gradient(to bottom, rgba(56, 189, 248, 0.04) 1px, transparent 1px)
          `,
          backgroundSize: '40px 40px'
        }}
      >
        {/* Subtle Ambient Radial Lighting */}
        <div className="absolute top-1/4 right-1/4 w-80 h-80 rounded-full bg-emerald-500/10 blur-[120px] pointer-events-none" />
        <div className="absolute bottom-10 left-10 w-64 h-64 rounded-full bg-blue-600/10 blur-[100px] pointer-events-none" />

        {/* Top Status Header */}
        <div className="flex justify-end items-center gap-2 text-[10px] text-slate-400 font-mono">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          <span className="font-semibold text-slate-300">ENTERPRISE SSO SECURED</span>
          <span className="text-slate-600">|</span>
          <span className="text-slate-500">TLS 1.3</span>
        </div>

        {/* Center Main Form Card */}
        <div className="w-full max-w-[390px] mx-auto my-auto space-y-6">
          {/* Central Logo & Titles */}
          <div className="flex flex-col items-center text-center space-y-3">
            <div className="relative">
              <BangchakLeafLogo className="w-18 h-18 sm:w-20 sm:h-20 drop-shadow-2xl" />
              <div className="absolute inset-0 bg-emerald-400/20 blur-xl -z-10 rounded-full" />
            </div>
            
            <div className="space-y-1">
              <h1 className="text-2xl sm:text-[28px] font-black text-white tracking-tight">
                Enterprise Portal
              </h1>
              <p className="text-xs sm:text-[13px] text-slate-400 font-medium">
                Sign in to your BCP Group account
              </p>
            </div>
          </div>

          {/* Authen with Microsoft Azure Button (Above Username/Password) */}
          <div className="space-y-4 pt-1">
            <button
              type="button"
              onClick={handleSsoLogin}
              disabled={isLoading}
              className="w-full h-11 px-4 rounded-lg bg-[#18233C] hover:bg-[#1E2E4E] border border-[#2B3B5E] hover:border-slate-500 transition-all cursor-pointer shadow-md group active:scale-[0.99] flex items-center justify-center gap-3 text-sm font-semibold text-slate-200 hover:text-white"
              title="Authen with Microsoft Azure"
            >
              {/* Microsoft 4-Color Windows Tile SVG */}
              <svg className="w-4 h-4 shrink-0" viewBox="0 0 21 21">
                <rect x="1" y="1" width="9" height="9" fill="#f25022" />
                <rect x="11" y="1" width="9" height="9" fill="#7fba00" />
                <rect x="1" y="11" width="9" height="9" fill="#00a4ef" />
                <rect x="11" y="11" width="9" height="9" fill="#ffb900" />
              </svg>
              <span>Authen with Microsoft Azure</span>
            </button>

            {/* SSO Divider */}
            <div className="relative py-1">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-700/60" />
              </div>
              <div className="relative flex justify-center text-[10px] uppercase">
                <span className="bg-[#0B132B] px-3 text-slate-500 font-mono tracking-wider">
                  Or
                </span>
              </div>
            </div>

            {/* Login Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              {errorMessage && (
                <div className="p-3 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs text-center font-medium animate-in fade-in">
                  {errorMessage}
                </div>
              )}

              {/* Corporate Email / Username Input */}
              <div className="space-y-1.5">
                <div className="relative flex items-center">
                  <input
                    type="text"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Username (Admin)"
                    className="w-full h-11 px-3.5 rounded-lg bg-[#18233C] border border-[#2B3B5E] text-white text-sm placeholder:text-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/25 transition-all font-mono shadow-inner"
                  />
                </div>
              </div>

              {/* Password Input */}
              <div className="space-y-1.5">
                <div className="relative flex items-center">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Password (Admin)"
                    className="w-full h-11 pl-3.5 pr-11 rounded-lg bg-[#18233C] border border-[#2B3B5E] text-white text-sm placeholder:text-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/25 transition-all font-mono shadow-inner"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 text-slate-400 hover:text-white transition-colors cursor-pointer"
                    title={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              {/* Sign In Primary Button */}
              <button
                type="submit"
                disabled={isLoading}
                className="w-full h-11 rounded-lg bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-500 hover:from-emerald-500 hover:via-teal-500 hover:to-emerald-400 active:scale-[0.99] text-white font-bold text-sm transition-all duration-200 shadow-lg shadow-emerald-950/50 hover:shadow-emerald-600/30 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-70 mt-2"
              >
                {isLoading ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>กำลังเข้าสู่ระบบ...</span>
                  </>
                ) : (
                  <span className="tracking-wide">Sign In</span>
                )}
              </button>

              {/* Forgot Password Link */}
              <div className="text-center pt-0.5">
                <button
                  type="button"
                  onClick={() => setActiveModal('help')}
                  className="text-xs text-slate-400 hover:text-slate-200 underline transition-colors cursor-pointer font-medium"
                >
                  Forgot Password?
                </button>
              </div>
            </form>
          </div>

            {/* Quick Demo Accounts for Pairing & Testing */}
            <div className="pt-3 border-t border-slate-800/80">
              <div className="text-[9.5px] text-slate-400 uppercase tracking-wider text-center font-mono mb-2 flex items-center justify-center gap-1">
                <Sparkles size={11} className="text-amber-400" />
                <span>คลิกเลือกเพื่อเข้าสู่ระบบทดสอบทันที:</span>
              </div>
              <div className="flex flex-wrap items-center justify-center gap-1.5">
                <button
                  type="button"
                  onClick={() => handleQuickSelect('Admin', 'System Administrator')}
                  className="px-2.5 py-1 rounded-md bg-emerald-950/60 hover:bg-emerald-900/80 border border-emerald-500/60 text-[10.5px] text-emerald-300 font-mono font-bold transition-all cursor-pointer shadow-xs flex items-center gap-1"
                >
                  <Sparkles size={11} className="text-emerald-400" />
                  <span>Admin (Default)</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickSelect('somchai.p@bangchak.co.th', 'Turnaround Lead Engineer')}
                  className="px-2.5 py-1 rounded-md bg-[#18233C] hover:bg-emerald-950/40 hover:border-emerald-500/50 border border-[#2B3B5E] text-[10.5px] text-slate-300 hover:text-emerald-300 font-mono transition-all cursor-pointer"
                >
                  Lead Engineer
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickSelect('manager.ops@bangchak.co.th', 'Plant Operations Manager')}
                  className="px-2.5 py-1 rounded-md bg-[#18233C] hover:bg-blue-950/40 hover:border-blue-500/50 border border-[#2B3B5E] text-[10.5px] text-slate-300 hover:text-blue-300 font-mono transition-all cursor-pointer"
                >
                  Ops Manager
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickSelect('safety.officer@bangchak.co.th', 'Safety & Rigging Inspector')}
                  className="px-2.5 py-1 rounded-md bg-[#18233C] hover:bg-amber-950/40 hover:border-amber-500/50 border border-[#2B3B5E] text-[10.5px] text-slate-300 hover:text-amber-300 font-mono transition-all cursor-pointer"
                >
                  Safety Officer
                </button>
              </div>
            </div>
        </div>

        {/* Bottom Footer Links */}
        <div className="pt-4 flex items-center justify-center gap-6 text-[11px] text-slate-400 font-medium">
          <button 
            type="button" 
            onClick={() => setActiveModal('policy')}
            className="hover:text-white transition-colors cursor-pointer"
          >
            Security &amp; Policy
          </button>
          <span>•</span>
          <button 
            type="button" 
            onClick={() => setActiveModal('help')}
            className="hover:text-white transition-colors cursor-pointer"
          >
            Help Desk
          </button>
          <span>•</span>
          <button 
            type="button" 
            onClick={() => setActiveModal('privacy')}
            className="hover:text-white transition-colors cursor-pointer"
          >
            Privacy Statement
          </button>
        </div>

      </div>

      {/* Info Dialog Modals */}
      {activeModal && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in"
          onClick={() => setActiveModal(null)}
        >
          <div 
            className="bg-[#101A33] border border-slate-700/80 rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-700/60 pb-3">
              <h3 className="font-bold text-base text-white flex items-center gap-2">
                <ShieldCheck size={18} className="text-emerald-400" />
                <span>
                  {activeModal === 'policy' && 'Enterprise Security & Policy'}
                  {activeModal === 'help' && 'BCP IT Help Desk Support'}
                  {activeModal === 'privacy' && 'Enterprise Data Privacy'}
                </span>
              </h3>
              <button 
                type="button" 
                onClick={() => setActiveModal(null)} 
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                ✕
              </button>
            </div>
            
            <div className="text-xs text-slate-300 space-y-2 leading-relaxed font-mono">
              {activeModal === 'policy' && (
                <>
                  <p>ระบบนี้สงวนสิทธิ์เฉพาะพนักงานและผู้รับเหมาที่ได้รับอนุญาตจากบริษัท บางจาก คอร์ปอเรชั่น จำกัด (มหาชน) เท่านั้น</p>
                  <p className="text-emerald-400">• เชื่อมต่อผ่านโปรโตคอล TLS 1.3 ปลอดภัยขั้นสูง</p>
                  <p className="text-emerald-400">• มีระบบ Audit Log ตรวจจับพฤติกรรมการเข้าใช้งานทุกช่วงเวลา</p>
                </>
              )}
              {activeModal === 'help' && (
                <>
                  <p className="font-bold text-white">ต้องการความช่วยเหลือหรือรีเซ็ตรหัสผ่าน:</p>
                  <p>• Hotline 24 ชม.: 02-335-4999 (ภายใน: 1122)</p>
                  <p>• Email: it-helpdesk@bangchak.co.th</p>
                  <p>• จุดบริการ: IT Service Counter อาคารสำนักงานโรงกลั่นพระโขนง ชั้น 2</p>
                </>
              )}
              {activeModal === 'privacy' && (
                <>
                  <p>ข้อมูลการล็อกอินและบันทึกการส่งมอบงานทั้งหมดอยู่ภายใต้นโยบายคุ้มครองข้อมูลส่วนบุคคล (PDPA) ของกลุ่มบริษัทบางจาก</p>
                  <p className="text-slate-400">ข้อมูลจะถูกจัดเก็บในเซิร์ฟเวอร์ภายในองค์กร (On-Premises Data Center) ปลอดภัย 100%</p>
                </>
              )}
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={() => setActiveModal(null)}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer"
              >
                รับทราบ (OK)
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
