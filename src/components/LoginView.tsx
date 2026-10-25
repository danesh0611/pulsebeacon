import React, { useState } from 'react';
import { appStore } from '../services/store';
import {
  Radio,
  Lock,
  Mail,
  ShieldCheck,
  UserCheck,
  GraduationCap,
  ArrowRight,
  AlertCircle,
  Eye,
  EyeOff,
  CheckCircle2,
  KeyRound,
  Cpu,
  Layers,
  Sparkles,
  HelpCircle,
} from 'lucide-react';

interface LoginViewProps {
  onLoginSuccess: (role: 'ADMIN' | 'FACULTY' | 'STUDENT') => void;
}

export const LoginView: React.FC<LoginViewProps> = ({ onLoginSuccess }) => {
  const [selectedRoleTab, setSelectedRoleTab] = useState<'ADMIN' | 'FACULTY' | 'STUDENT'>('ADMIN');
  const [emailOrId, setEmailOrId] = useState('admin@university.edu');
  const [password, setPassword] = useState('Admin@1234');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Switch role tabs and populate default sample credentials
  const handleRoleTabChange = (role: 'ADMIN' | 'FACULTY' | 'STUDENT') => {
    setSelectedRoleTab(role);
    setError(null);
    if (role === 'ADMIN') {
      setEmailOrId('admin@university.edu');
      setPassword('Admin@1234');
    } else if (role === 'FACULTY') {
      setEmailOrId('faculty@university.edu');
      setPassword('Faculty@1234');
    } else {
      setEmailOrId('student1@university.edu');
      setPassword('Student@1234');
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    setTimeout(() => {
      // Find user by email OR identifierCode (Registration Number / Employee Code)
      const allUsers = appStore.getState().users;
      const cleanInput = emailOrId.trim().toLowerCase();
      const matchedUser = allUsers.find(
        (u) =>
          u.email.toLowerCase() === cleanInput ||
          u.identifierCode.toLowerCase() === cleanInput
      );

      if (matchedUser) {
        const success = appStore.login(matchedUser.email, password);
        setIsSubmitting(false);
        if (success) {
          onLoginSuccess(matchedUser.role);
          return;
        }
      }

      setIsSubmitting(false);
      setError('Invalid university email or registration number. Please verify your credentials or select a sample account below.');
    }, 450);
  };

  const handleQuickFill = (role: 'ADMIN' | 'FACULTY' | 'STUDENT', email: string, pass: string) => {
    setSelectedRoleTab(role);
    setEmailOrId(email);
    setPassword(pass);
    setError(null);
  };

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4 sm:p-6 lg:p-8 relative overflow-hidden selection:bg-indigo-500 selection:text-white">
      {/* Background ambient lighting effects */}
      <div className="absolute w-[600px] h-[600px] bg-indigo-600/15 rounded-full blur-[120px] -top-40 -left-40 pointer-events-none" />
      <div className="absolute w-[600px] h-[600px] bg-teal-600/15 rounded-full blur-[120px] -bottom-40 -right-40 pointer-events-none" />
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#1e293b12_1px,transparent_1px),linear-gradient(to_bottom,#1e293b12_1px,transparent_1px)] bg-[size:32px_32px] pointer-events-none" />

      {/* Main Container: Split-Screen Card */}
      <div className="max-w-5xl w-full grid grid-cols-1 lg:grid-cols-12 bg-slate-900/90 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden backdrop-blur-xl relative z-10">
        {/* Left Column: Institutional Brand & Features (5 cols) */}
        <div className="lg:col-span-5 bg-gradient-to-br from-indigo-950 via-slate-900 to-slate-950 p-8 sm:p-10 border-b lg:border-b-0 lg:border-r border-slate-800/80 flex flex-col justify-between relative overflow-hidden">
          {/* Subtle radar pulse in background */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 rounded-full border border-indigo-500/10 pointer-events-none animate-pulse" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-56 h-56 rounded-full border border-teal-500/15 pointer-events-none" />

          {/* Top: Logo & System Identity */}
          <div className="space-y-4 relative z-10">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-indigo-500 via-indigo-600 to-teal-400 flex items-center justify-center shadow-lg shadow-indigo-500/30">
                <Radio className="w-6 h-6 text-white animate-pulse" />
              </div>
              <div>
                <span className="text-xl font-bold tracking-tight text-white flex items-center space-x-2">
                  <span>PulseBeacon</span>
                  <span className="text-[10px] bg-teal-500/20 text-teal-300 border border-teal-500/30 px-2 py-0.5 rounded-full font-mono">
                    0xFD2A
                  </span>
                </span>
                <p className="text-xs text-slate-400">BLE Smart Classroom Attendance</p>
              </div>
            </div>

            <div className="pt-4">
              <h2 className="text-2xl font-extrabold text-white leading-tight tracking-tight">
                Enterprise Proximity Verification for Universities.
              </h2>
              <p className="text-xs text-slate-300 mt-2 leading-relaxed">
                Seamless Bluetooth Low Energy attendance on standard smartphones and laptops.
                No RFID tags, no barcode cards, and zero external hardware.
              </p>
            </div>
          </div>

          {/* Middle: Key Security & Architectural Highlights */}
          <div className="my-8 space-y-3 relative z-10 text-xs">
            <div className="flex items-start space-x-3 p-3 rounded-xl bg-slate-900/60 border border-slate-800/80">
              <div className="w-6 h-6 rounded-lg bg-indigo-500/20 text-indigo-400 flex items-center justify-center shrink-0 mt-0.5">
                <KeyRound className="w-3.5 h-3.5" />
              </div>
              <div>
                <div className="font-semibold text-white">30-Second Rolling HMAC Nonces</div>
                <div className="text-[11px] text-slate-400 mt-0.5">
                  Replay attacks are mathematically rejected outside the 30s epoch slot.
                </div>
              </div>
            </div>

            <div className="flex items-start space-x-3 p-3 rounded-xl bg-slate-900/60 border border-slate-800/80">
              <div className="w-6 h-6 rounded-lg bg-teal-500/20 text-teal-400 flex items-center justify-center shrink-0 mt-0.5">
                <Cpu className="w-3.5 h-3.5" />
              </div>
              <div>
                <div className="font-semibold text-white">RF Path-Loss Classroom Boundary</div>
                <div className="text-[11px] text-slate-400 mt-0.5">
                  Cutoff threshold (-78 dBm) ensures attendance is only marked inside the room.
                </div>
              </div>
            </div>

            <div className="flex items-start space-x-3 p-3 rounded-xl bg-slate-900/60 border border-slate-800/80">
              <div className="w-6 h-6 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0 mt-0.5">
                <ShieldCheck className="w-3.5 h-3.5" />
              </div>
              <div>
                <div className="font-semibold text-white">Database-Enforced ACID Uniqueness</div>
                <div className="text-[11px] text-slate-400 mt-0.5">
                  Strictly 1 student per session. Zero duplicate check-ins under high concurrency.
                </div>
              </div>
            </div>
          </div>

          {/* Bottom: Institutional Footer */}
          <div className="pt-4 border-t border-slate-800/60 text-[11px] text-slate-400 flex items-center justify-between relative z-10">
            <span>Academic Term 2026</span>
            <span className="flex items-center space-x-1 text-emerald-400">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
              <span>Supabase / PostgreSQL Ready</span>
            </span>
          </div>
        </div>

        {/* Right Column: Interactive Login Portal (7 cols) */}
        <div className="lg:col-span-7 p-8 sm:p-10 flex flex-col justify-between space-y-6">
          <div>
            {/* Header: Portal Title */}
            <div className="flex items-center justify-between border-b border-slate-800/80 pb-4">
              <div>
                <h3 className="text-lg font-bold text-white flex items-center space-x-2">
                  <Lock className="w-4 h-4 text-indigo-400" />
                  <span>University Single Sign-On</span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Select your role to access the corresponding college interface.
                </p>
              </div>

              <div className="hidden sm:flex items-center space-x-1 text-[11px] text-slate-400 bg-slate-800/80 px-2.5 py-1 rounded-full border border-slate-700/60">
                <ShieldCheck className="w-3 h-3 text-emerald-400" />
                <span>SSL Encrypted</span>
              </div>
            </div>

            {/* Role Switcher Tabs */}
            <div className="grid grid-cols-3 gap-2 mt-5 p-1 bg-slate-950/80 rounded-2xl border border-slate-800">
              <button
                type="button"
                onClick={() => handleRoleTabChange('ADMIN')}
                className={`py-2 px-3 rounded-xl text-xs font-semibold flex items-center justify-center space-x-1.5 transition-all cursor-pointer ${
                  selectedRoleTab === 'ADMIN'
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Admin</span>
              </button>

              <button
                type="button"
                onClick={() => handleRoleTabChange('FACULTY')}
                className={`py-2 px-3 rounded-xl text-xs font-semibold flex items-center justify-center space-x-1.5 transition-all cursor-pointer ${
                  selectedRoleTab === 'FACULTY'
                    ? 'bg-teal-600 text-white shadow-md shadow-teal-600/30'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <UserCheck className="w-3.5 h-3.5" />
                <span>Faculty</span>
              </button>

              <button
                type="button"
                onClick={() => handleRoleTabChange('STUDENT')}
                className={`py-2 px-3 rounded-xl text-xs font-semibold flex items-center justify-center space-x-1.5 transition-all cursor-pointer ${
                  selectedRoleTab === 'STUDENT'
                    ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/30'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <GraduationCap className="w-3.5 h-3.5" />
                <span>Student</span>
              </button>
            </div>

            {/* Error Notification */}
            {error && (
              <div className="mt-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-start space-x-2 animate-in fade-in">
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            {/* Login Form */}
            <form onSubmit={handleSubmit} className="mt-5 space-y-4 text-xs">
              <div>
                <label className="block text-slate-300 font-medium mb-1">
                  {selectedRoleTab === 'STUDENT'
                    ? 'Student Email or Registration Number'
                    : selectedRoleTab === 'FACULTY'
                    ? 'Faculty Email or Employee Code'
                    : 'Administrator Email'}
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
                  <input
                    type="text"
                    required
                    value={emailOrId}
                    onChange={(e) => setEmailOrId(e.target.value)}
                    placeholder={
                      selectedRoleTab === 'STUDENT'
                        ? 'e.g. RA2411003020197 or student1@university.edu'
                        : selectedRoleTab === 'FACULTY'
                        ? 'e.g. faculty@university.edu or EMP-CS-0042'
                        : 'admin@university.edu'
                    }
                    className="w-full bg-slate-950 border border-slate-700/80 rounded-xl pl-10 pr-4 py-2.5 text-white text-xs placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-slate-300 font-medium">Password</label>
                  <button
                    type="button"
                    onClick={() => {
                      setError('Tip: Default password for imported students is their Registration Number followed by @2026 (or Student@1234). Use instant test logins below.');
                    }}
                    className="text-[11px] text-indigo-400 hover:text-indigo-300 cursor-pointer"
                  >
                    Forgot password?
                  </button>
                </div>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full bg-slate-950 border border-slate-700/80 rounded-xl pl-10 pr-10 py-2.5 text-white text-xs placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-3 text-slate-400 hover:text-slate-200 cursor-pointer"
                    title={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between pt-1">
                <label className="flex items-center space-x-2 text-slate-400 text-xs cursor-pointer">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="rounded bg-slate-950 border-slate-700 text-indigo-600 focus:ring-indigo-500 w-3.5 h-3.5 accent-indigo-600"
                  />
                  <span>Remember this terminal session</span>
                </label>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-3 bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-lg shadow-indigo-600/30 transition-all flex items-center justify-center space-x-2 cursor-pointer mt-4"
              >
                {isSubmitting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Verifying Institutional Credentials...</span>
                  </>
                ) : (
                  <>
                    <span>
                      Sign In to {selectedRoleTab === 'ADMIN' ? 'Administration' : selectedRoleTab === 'FACULTY' ? 'Faculty Portal' : 'Student Hub'}
                    </span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          </div>

          {/* Quick-Access 1-Click Fill Chips */}
          <div className="pt-4 border-t border-slate-800/80 space-y-2">
            <div className="flex items-center justify-between text-[11px] text-slate-400">
              <span className="font-semibold uppercase tracking-wider">Instant Test Logins:</span>
              <span>Tap to auto-fill</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 text-xs">
              <button
                type="button"
                onClick={() => handleQuickFill('ADMIN', 'admin@university.edu', 'Admin@1234')}
                className="p-2.5 rounded-xl bg-slate-800/50 hover:bg-slate-800 border border-slate-700/60 hover:border-indigo-500/50 text-left transition-all cursor-pointer group"
              >
                <div className="font-semibold text-white group-hover:text-indigo-300 text-[11px] truncate">
                  🏛️ Dr. Jenkins (Admin)
                </div>
                <div className="text-[10px] text-slate-400 font-mono mt-0.5 truncate">admin@university.edu</div>
              </button>

              <button
                type="button"
                onClick={() => handleQuickFill('FACULTY', 'faculty@university.edu', 'Faculty@1234')}
                className="p-2.5 rounded-xl bg-slate-800/50 hover:bg-slate-800 border border-slate-700/60 hover:border-teal-500/50 text-left transition-all cursor-pointer group"
              >
                <div className="font-semibold text-white group-hover:text-teal-300 text-[11px] truncate">
                  👨‍🏫 Prof. Turing (Faculty)
                </div>
                <div className="text-[10px] text-slate-400 font-mono mt-0.5 truncate">faculty@university.edu</div>
              </button>

              <button
                type="button"
                onClick={() => handleQuickFill('STUDENT', 'RA2411003020197', 'Student@1234')}
                className="p-2.5 rounded-xl bg-slate-800/50 hover:bg-slate-800 border border-slate-700/60 hover:border-emerald-500/50 text-left transition-all cursor-pointer group"
              >
                <div className="font-semibold text-white group-hover:text-emerald-300 text-[11px] truncate">
                  🎓 Chakradhar (Student)
                </div>
                <div className="text-[10px] text-emerald-400 font-mono mt-0.5 truncate">RA2411003020197</div>
              </button>

              <button
                type="button"
                onClick={() => handleQuickFill('STUDENT', 'student1@university.edu', 'Student@1234')}
                className="p-2.5 rounded-xl bg-slate-800/50 hover:bg-slate-800 border border-slate-700/60 hover:border-emerald-500/50 text-left transition-all cursor-pointer group"
              >
                <div className="font-semibold text-white group-hover:text-emerald-300 text-[11px] truncate">
                  🎓 Alex Rivera (Student)
                </div>
                <div className="text-[10px] text-slate-400 font-mono mt-0.5 truncate">CS2026-001</div>
              </button>
            </div>

            <div className="text-[10px] text-slate-500 text-center pt-2">
              University IT Registry • Automatic student account creation & Excel roster integration active
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
