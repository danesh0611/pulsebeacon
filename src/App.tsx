/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { appStore } from './services/store';
import { Header } from './components/Header';
import { LoginView } from './components/LoginView';
import { FacultyView } from './components/FacultyView';
import { StudentView } from './components/StudentView';
import { AdminView } from './components/AdminView';
import { BleProtocolLab } from './components/BleProtocolLab';
import { AndroidAppView } from './components/AndroidAppView';

export default function App() {
  const [storeState, setStoreState] = useState(() => appStore.getState());
  const [currentTab, setCurrentTab] = useState<'faculty' | 'student' | 'admin' | 'ble-lab' | 'android-app'>('android-app');

  useEffect(() => {
    const unsubscribe = appStore.subscribe(() => {
      setStoreState({ ...appStore.getState() });
    });
    return unsubscribe;
  }, []);

  // If unauthenticated, show the Login View
  if (!storeState.isAuthenticated) {
    return (
      <LoginView
        onLoginSuccess={(role) => {
          if (role === 'ADMIN') setCurrentTab('admin');
          else if (role === 'FACULTY') setCurrentTab('faculty');
          else if (role === 'STUDENT') setCurrentTab('student');
        }}
      />
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-indigo-500 selection:text-white">
      {/* Global Navigation Header */}
      <Header
        currentTab={currentTab}
        setCurrentTab={setCurrentTab}
        currentUser={storeState.currentUser}
        users={storeState.users}
        onLogout={() => appStore.logout()}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {currentTab === 'faculty' && (
          <FacultyView
            currentUser={storeState.currentUser}
            courses={storeState.courses}
            sessions={storeState.sessions}
            records={storeState.records}
            allUsers={storeState.users}
          />
        )}

        {currentTab === 'student' && (
          <StudentView
            currentUser={storeState.currentUser}
            sessions={storeState.sessions}
            records={storeState.records}
          />
        )}

        {currentTab === 'admin' && (
          <AdminView
            users={storeState.users}
            courses={storeState.courses}
            sessions={storeState.sessions}
            records={storeState.records}
            auditLogs={storeState.auditLogs}
          />
        )}

        {currentTab === 'ble-lab' && <BleProtocolLab />}
        {currentTab === 'android-app' && <AndroidAppView />}
      </main>

      {/* Global Footer */}
      <footer className="border-t border-slate-900 bg-slate-950 text-slate-400 py-6 text-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center space-x-2">
            <span className="font-semibold text-slate-300">PulseBeacon BLE Smart Attendance</span>
            <span>•</span>
            <span>16-bit Service UUID: 0xFD2A</span>
            <span>•</span>
            <span>FastAPI Backend & Android Jetpack Compose</span>
          </div>

          <div className="flex items-center space-x-4 text-slate-400">
            <span>Anti-Replay: 30s Window</span>
            <span>•</span>
            <span>Path-Loss Factor: n = 2.4</span>
            <span>•</span>
            <span>Classroom Cutoff: -78 dBm</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
