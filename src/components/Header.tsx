import React from 'react';
import { User } from '../types';
import { appStore } from '../services/store';
import { Radio, ShieldCheck, UserCheck, BarChart3, Binary, RotateCcw, Sparkles, LogOut, Smartphone } from 'lucide-react';

interface HeaderProps {
  currentTab: 'faculty' | 'student' | 'admin' | 'ble-lab' | 'android-app';
  setCurrentTab: (tab: 'faculty' | 'student' | 'admin' | 'ble-lab' | 'android-app') => void;
  currentUser: User;
  users: User[];
  onLogout: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentTab,
  setCurrentTab,
  currentUser,
  users,
  onLogout,
}) => {
  return (
    <header className="bg-slate-900 border-b border-slate-800 text-white sticky top-0 z-50 shadow-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & System Brand */}
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-teal-400 flex items-center justify-center shadow-lg shadow-indigo-500/25">
              <Radio className="w-5 h-5 text-white animate-pulse" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-bold text-lg tracking-tight bg-gradient-to-r from-white via-slate-100 to-indigo-200 bg-clip-text text-transparent">
                  PulseBeacon
                </span>
                <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  BLE 0xFD2A
                </span>
              </div>
              <p className="text-xs text-slate-400 hidden sm:block">
                Smart Classroom Proximity Attendance System
              </p>
            </div>
          </div>

          {/* Navigation Pills */}
          <nav className="hidden md:flex items-center space-x-1 bg-slate-800/80 p-1 rounded-xl border border-slate-700/60">
            <button
              onClick={() => setCurrentTab('faculty')}
              className={`flex items-center space-x-2 px-3.5 py-1.5 rounded-lg text-sm font-medium transition-all ${
                currentTab === 'faculty'
                  ? 'bg-indigo-600 text-white shadow'
                  : 'text-slate-300 hover:text-white hover:bg-slate-700/50'
              }`}
            >
              <UserCheck className="w-4 h-4" />
              <span>Faculty Dashboard</span>
            </button>

            <button
              onClick={() => setCurrentTab('student')}
              className={`flex items-center space-x-2 px-3.5 py-1.5 rounded-lg text-sm font-medium transition-all ${
                currentTab === 'student'
                  ? 'bg-indigo-600 text-white shadow'
                  : 'text-slate-300 hover:text-white hover:bg-slate-700/50'
              }`}
            >
              <Radio className="w-4 h-4" />
              <span>Student Check-In</span>
            </button>

            <button
              onClick={() => setCurrentTab('admin')}
              className={`flex items-center space-x-2 px-3.5 py-1.5 rounded-lg text-sm font-medium transition-all ${
                currentTab === 'admin'
                  ? 'bg-indigo-600 text-white shadow'
                  : 'text-slate-300 hover:text-white hover:bg-slate-700/50'
              }`}
            >
              <BarChart3 className="w-4 h-4" />
              <span>Admin & Analytics</span>
            </button>

            <button
              onClick={() => setCurrentTab('ble-lab')}
              className={`flex items-center space-x-2 px-3.5 py-1.5 rounded-lg text-sm font-medium transition-all ${
                currentTab === 'ble-lab'
                  ? 'bg-teal-600 text-white shadow'
                  : 'text-teal-300 hover:text-white hover:bg-slate-700/50'
              }`}
            >
              <Binary className="w-4 h-4" />
              <span>BLE Security Lab</span>
            </button>

            <button
              onClick={() => setCurrentTab('android-app')}
              className={`flex items-center space-x-2 px-3.5 py-1.5 rounded-lg text-sm font-medium transition-all ${
                currentTab === 'android-app'
                  ? 'bg-emerald-600 text-white shadow'
                  : 'text-emerald-300 hover:text-white hover:bg-slate-700/50'
              }`}
            >
              <Smartphone className="w-4 h-4" />
              <span>Android App</span>
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            </button>
          </nav>

          {/* User Role Switcher & Controls */}
          <div className="flex items-center space-x-3">
            <div className="relative">
              <select
                value={currentUser.id}
                onChange={(e) => {
                  const selected = users.find((u) => u.id === Number(e.target.value));
                  if (selected) {
                    appStore.setCurrentUser(selected);
                    // Automatically switch to role appropriate tab
                    if (selected.role === 'STUDENT') setCurrentTab('student');
                    else if (selected.role === 'FACULTY') setCurrentTab('faculty');
                    else if (selected.role === 'ADMIN') setCurrentTab('admin');
                  }
                }}
                className="bg-slate-800 border border-slate-700 text-xs text-slate-200 rounded-lg px-2.5 py-1.5 pr-7 focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer"
                title="Switch active authenticated user profile"
              >
                {users.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.role === 'FACULTY' ? '👨‍🏫 ' : u.role === 'STUDENT' ? '🎓 ' : '🏛️ '}
                    {u.fullName} ({u.identifierCode})
                  </option>
                ))}
              </select>
            </div>

            {/* Reset sample state */}
            <button
              onClick={() => {
                if (window.confirm('Reset all sessions, attendance records, and logs to sample state?')) {
                  appStore.resetToDefaults();
                }
              }}
              className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
              title="Reset Database to Default Samples"
            >
              <RotateCcw className="w-4 h-4" />
            </button>

            {/* Sign Out Button */}
            <button
              onClick={onLogout}
              className="flex items-center space-x-1.5 px-2.5 py-1.5 text-xs text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 rounded-lg border border-rose-500/20 transition-all cursor-pointer"
              title="Sign out to Login Screen"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Sign Out</span>
            </button>
          </div>
        </div>

        {/* Mobile Navigation bar */}
        <div className="flex md:hidden overflow-x-auto py-2 border-t border-slate-800 space-x-2 scrollbar-none">
          <button
            onClick={() => setCurrentTab('faculty')}
            className={`px-3 py-1 rounded-md text-xs whitespace-nowrap font-medium ${
              currentTab === 'faculty' ? 'bg-indigo-600 text-white' : 'text-slate-400'
            }`}
          >
            Faculty
          </button>
          <button
            onClick={() => setCurrentTab('student')}
            className={`px-3 py-1 rounded-md text-xs whitespace-nowrap font-medium ${
              currentTab === 'student' ? 'bg-indigo-600 text-white' : 'text-slate-400'
            }`}
          >
            Student Check-In
          </button>
          <button
            onClick={() => setCurrentTab('admin')}
            className={`px-3 py-1 rounded-md text-xs whitespace-nowrap font-medium ${
              currentTab === 'admin' ? 'bg-indigo-600 text-white' : 'text-slate-400'
            }`}
          >
            Admin & Analytics
          </button>
          <button
            onClick={() => setCurrentTab('ble-lab')}
            className={`px-3 py-1 rounded-md text-xs whitespace-nowrap font-medium ${
              currentTab === 'ble-lab' ? 'bg-teal-600 text-white' : 'text-teal-400'
            }`}
          >
            BLE Security Lab
          </button>
          <button
            onClick={() => setCurrentTab('android-app')}
            className={`px-3 py-1 rounded-md text-xs whitespace-nowrap font-medium ${
              currentTab === 'android-app' ? 'bg-emerald-600 text-white' : 'text-emerald-400'
            }`}
          >
            Android App
          </button>
        </div>
      </div>
    </header>
  );
};
