import React, { useState, useEffect } from 'react';
import { User, Course, AttendanceSession, AttendanceRecord } from '../types';
import { appStore } from '../services/store';
import { generateAdvertisingPayload, BLE_CONSTANTS } from '../services/crypto';
import {
  Radio,
  Plus,
  Download,
  ShieldAlert,
  Clock,
  MapPin,
  Users,
  CheckCircle2,
  AlertTriangle,
  StopCircle,
  Search,
  Filter,
  Activity,
  KeyRound,
  ExternalLink,
} from 'lucide-react';

interface FacultyViewProps {
  currentUser: User;
  courses: Course[];
  sessions: AttendanceSession[];
  records: AttendanceRecord[];
  allUsers: User[];
}

export const FacultyView: React.FC<FacultyViewProps> = ({
  currentUser,
  courses,
  sessions,
  records,
  allUsers,
}) => {
  const [selectedSessionId, setSelectedSessionId] = useState<number | null>(() => {
    const active = sessions.find((s) => s.status === 'ACTIVE');
    return active ? active.id : sessions[0]?.id || null;
  });

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showOverrideModal, setShowOverrideModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Create Session Form State
  const [formCourseId, setFormCourseId] = useState<number>(courses[0]?.id || 1);
  const [formRoom, setFormRoom] = useState('Lab 304 (Wireless Systems)');
  const [formDuration, setFormDuration] = useState(45);
  const [formRssi, setFormRssi] = useState(-78);

  // Manual Override Form State
  const [overrideStudentId, setOverrideStudentId] = useState<number>(allUsers.find((u) => u.role === 'STUDENT')?.id || 2);
  const [overrideReason, setOverrideReason] = useState('Student phone battery depleted; physical presence confirmed by instructor');
  const [overrideError, setOverrideError] = useState<string | null>(null);

  // Live rotating BLE payload state for currently selected active session
  const [currentPayload, setCurrentPayload] = useState<{
    payloadHex: string;
    sessionTagHex: string;
    windowHex: string;
    saltHex: string;
    hmacHex: string;
    windowIndex: number;
  } | null>(null);

  const [secondsUntilRotate, setSecondsUntilRotate] = useState(30);

  // Active selected session object
  const activeSession = sessions.find((s) => s.id === selectedSessionId) || sessions[0];
  const sessionRecords = records.filter((r) => r.sessionId === activeSession?.id);

  // Students enrolled but not yet checked in
  const students = allUsers.filter((u) => u.role === 'STUDENT');
  const checkedInStudentIds = new Set(sessionRecords.map((r) => r.studentId));
  const absentStudents = students.filter((s) => !checkedInStudentIds.has(s.id));

  // Compute countdown timer
  const [remainingTimeSec, setRemainingTimeSec] = useState<number>(() => {
    if (!activeSession) return 0;
    const diff = Math.max(0, Math.floor((new Date(activeSession.endTime).getTime() - Date.now()) / 1000));
    return activeSession.status === 'ACTIVE' ? diff : 0;
  });

  useEffect(() => {
    if (!activeSession || activeSession.status !== 'ACTIVE') {
      setRemainingTimeSec(0);
      return;
    }
    const timer = setInterval(() => {
      const diff = Math.max(0, Math.floor((new Date(activeSession.endTime).getTime() - Date.now()) / 1000));
      setRemainingTimeSec(diff);
      if (diff === 0 && activeSession.status === 'ACTIVE') {
        appStore.closeSession(activeSession.id);
      }
    }, 1000);
    return () => clearInterval(timer);
  }, [activeSession]);

  // Compute live rotating BLE advertisement payload every second
  useEffect(() => {
    if (!activeSession || activeSession.status !== 'ACTIVE') {
      setCurrentPayload(null);
      return;
    }

    let isSubscribed = true;

    async function updatePayload() {
      if (!activeSession) return;
      const res = await generateAdvertisingPayload(
        activeSession.sessionCode,
        activeSession.bleSessionSecret,
        activeSession.bleSalt
      );
      if (isSubscribed) {
        setCurrentPayload(res);
        const epochSec = Math.floor(Date.now() / 1000);
        setSecondsUntilRotate(BLE_CONSTANTS.ROTATING_WINDOW_SECONDS - (epochSec % BLE_CONSTANTS.ROTATING_WINDOW_SECONDS));
      }
    }

    updatePayload();
    const interval = setInterval(updatePayload, 1000);
    return () => {
      isSubscribed = false;
      clearInterval(interval);
    };
  }, [activeSession]);

  // Handle CSV export
  const handleExportCsv = () => {
    if (!activeSession) return;
    const csvContent = appStore.exportCsv(activeSession.id);
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Attendance_${activeSession.courseCode}_${activeSession.sessionCode}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleCreateSession = (e: React.FormEvent) => {
    e.preventDefault();
    const newSession = appStore.createSession(formCourseId, formRoom, formDuration, formRssi);
    setSelectedSessionId(newSession.id);
    setShowCreateModal(false);
  };

  const handleManualOverride = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeSession) return;
    if (!overrideReason.trim()) {
      setOverrideError('An audited reason is mandatory for manual attendance overrides.');
      return;
    }
    try {
      appStore.manualOverrideAttendance(activeSession.id, overrideStudentId, overrideReason.trim());
      setShowOverrideModal(false);
      setOverrideReason('');
      setOverrideError(null);
    } catch (err: any) {
      setOverrideError(err.message || 'Failed to submit override');
    }
  };

  const filteredRecords = sessionRecords.filter(
    (r) =>
      r.studentName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.registrationNumber.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Top Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900/60 p-4 rounded-2xl border border-slate-800">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center space-x-2">
            <span>Faculty Attendance Console</span>
            <span className="text-xs bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 px-2 py-0.5 rounded-full font-medium">
              Instructor: {currentUser.fullName}
            </span>
          </h1>
          <p className="text-sm text-slate-400">
            Control BLE classroom broadcasting, inspect real-time rolling nonces, and verify student attendance.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          {/* Session Selector */}
          <select
            value={selectedSessionId || ''}
            onChange={(e) => setSelectedSessionId(Number(e.target.value))}
            className="bg-slate-800 border border-slate-700 text-slate-200 text-sm rounded-xl px-3 py-2 focus:ring-1 focus:ring-indigo-500"
          >
            {sessions.map((s) => (
              <option key={s.id} value={s.id}>
                {s.status === 'ACTIVE' ? '🟢 ' : '⚪ '}
                {s.courseCode} - {s.roomNumber} ({s.status})
              </option>
            ))}
          </select>

          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center space-x-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold rounded-xl shadow-lg shadow-indigo-600/30 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>New Session</span>
          </button>
        </div>
      </div>

      {activeSession ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Column 1 & 2: Active Broadcast & Attendee Stream */}
          <div className="lg:col-span-2 space-y-6">
            {/* Live Broadcast Card */}
            <div
              className={`rounded-2xl border p-6 transition-all ${
                activeSession.status === 'ACTIVE'
                  ? 'bg-gradient-to-br from-slate-900 via-indigo-950/40 to-slate-900 border-indigo-700/60 shadow-xl shadow-indigo-950/30'
                  : 'bg-slate-900/50 border-slate-800'
              }`}
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-800/80 gap-3">
                <div className="flex items-center space-x-3">
                  <div
                    className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                      activeSession.status === 'ACTIVE'
                        ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                        : 'bg-slate-800 text-slate-400'
                    }`}
                  >
                    <Radio className={`w-6 h-6 ${activeSession.status === 'ACTIVE' ? 'animate-pulse' : ''}`} />
                  </div>
                  <div>
                    <div className="flex items-center space-x-2">
                      <h2 className="text-lg font-bold text-white">{activeSession.courseTitle}</h2>
                      <span className="text-xs font-semibold px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                        {activeSession.courseCode}
                      </span>
                    </div>
                    <div className="flex items-center space-x-4 text-xs text-slate-400 mt-1">
                      <span className="flex items-center space-x-1">
                        <MapPin className="w-3.5 h-3.5 text-slate-400" />
                        <span>{activeSession.roomNumber}</span>
                      </span>
                      <span>•</span>
                      <span>Cutoff: {activeSession.rssiThreshold} dBm (~7.5m)</span>
                    </div>
                  </div>
                </div>

                {/* Session Status & Countdown */}
                <div className="flex items-center space-x-3 self-end sm:self-auto">
                  {activeSession.status === 'ACTIVE' ? (
                    <div className="text-right">
                      <div className="text-xs text-slate-400 font-medium">Session Closes In</div>
                      <div className="text-2xl font-mono font-bold text-emerald-400">
                        {String(Math.floor(remainingTimeSec / 60)).padStart(2, '0')}:
                        {String(remainingTimeSec % 60).padStart(2, '0')}
                      </div>
                    </div>
                  ) : (
                    <span className="px-3 py-1 rounded-full text-xs font-semibold bg-slate-800 text-slate-300 border border-slate-700">
                      SESSION {activeSession.status}
                    </span>
                  )}
                </div>
              </div>

              {/* Real-Time BLE Advertising Telemetry */}
              {activeSession.status === 'ACTIVE' && currentPayload && (
                <div className="mt-5 p-4 rounded-xl bg-slate-950/70 border border-indigo-900/40 space-y-3">
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center space-x-2 text-indigo-300 font-semibold">
                      <Activity className="w-4 h-4 text-indigo-400 animate-spin" />
                      <span>Transmitting BLE Beacon (UUID: {BLE_CONSTANTS.SERVICE_UUID_16})</span>
                    </div>
                    <span className="text-slate-400">
                      Payload rotates in <strong className="text-emerald-400">{secondsUntilRotate}s</strong>
                    </span>
                  </div>

                  {/* 20-Byte Advertisement Frame Breakdown */}
                  <div>
                    <div className="text-[11px] font-mono text-slate-400 uppercase tracking-wider mb-1">
                      Live 20-Byte Service Data Payload (0x16):
                    </div>
                    <div className="bg-slate-900 p-2.5 rounded-lg border border-slate-800 flex flex-wrap gap-1 font-mono text-xs overflow-x-auto">
                      <span className="px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-300 border border-blue-500/30" title="4-Byte Session Tag">
                        {currentPayload.sessionTagHex}
                      </span>
                      <span className="px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-300 border border-purple-500/30" title="4-Byte Window Index">
                        {currentPayload.windowHex}
                      </span>
                      <span className="px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30" title="4-Byte Salt">
                        {currentPayload.saltHex}
                      </span>
                      <span className="px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30" title="8-Byte HMAC Signature">
                        {currentPayload.hmacHex}
                      </span>
                    </div>
                    <div className="flex items-center space-x-4 text-[10px] text-slate-400 mt-1.5 font-medium">
                      <span className="flex items-center space-x-1">
                        <span className="w-2 h-2 rounded-full bg-blue-400"></span>
                        <span>Session Tag (4B)</span>
                      </span>
                      <span className="flex items-center space-x-1">
                        <span className="w-2 h-2 rounded-full bg-purple-400"></span>
                        <span>Window #{currentPayload.windowIndex} (4B)</span>
                      </span>
                      <span className="flex items-center space-x-1">
                        <span className="w-2 h-2 rounded-full bg-amber-400"></span>
                        <span>Salt (4B)</span>
                      </span>
                      <span className="flex items-center space-x-1">
                        <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                        <span>HMAC-SHA256 Slice (8B)</span>
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="mt-5 flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-slate-800">
                <div className="flex items-center space-x-2">
                  <button
                    onClick={handleExportCsv}
                    className="flex items-center space-x-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium rounded-lg border border-slate-700 transition-colors cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Export CSV</span>
                  </button>

                  <button
                    onClick={() => setShowOverrideModal(true)}
                    className="flex items-center space-x-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-amber-300 text-xs font-medium rounded-lg border border-amber-500/30 transition-colors cursor-pointer"
                  >
                    <ShieldAlert className="w-3.5 h-3.5" />
                    <span>Manual Override</span>
                  </button>
                </div>

                {activeSession.status === 'ACTIVE' && (
                  <button
                    onClick={() => appStore.closeSession(activeSession.id)}
                    className="flex items-center space-x-1.5 px-3.5 py-1.5 bg-rose-600/80 hover:bg-rose-600 text-white text-xs font-semibold rounded-lg shadow transition-all cursor-pointer"
                  >
                    <StopCircle className="w-3.5 h-3.5" />
                    <span>End Session</span>
                  </button>
                )}
              </div>
            </div>

            {/* Live Attendees Feed & Table */}
            <div className="bg-slate-900/60 rounded-2xl border border-slate-800 p-6 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center space-x-3">
                  <h3 className="text-base font-bold text-white">Live Attendance Roster</h3>
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                    {sessionRecords.length} / {activeSession.totalEnrolled} Verified (
                    {Math.round((sessionRecords.length / Math.max(1, activeSession.totalEnrolled)) * 100)}%)
                  </span>
                </div>

                {/* Search Bar */}
                <div className="relative w-full sm:w-64">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    placeholder="Search name or reg no..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-slate-800/80 border border-slate-700 rounded-xl pl-9 pr-3 py-1.5 text-xs text-white placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
              </div>

              {filteredRecords.length === 0 ? (
                <div className="text-center py-12 text-slate-400 text-sm bg-slate-950/40 rounded-xl border border-slate-800/60">
                  <Users className="w-8 h-8 text-slate-500 mx-auto mb-2 opacity-50" />
                  <p>No verified attendance records found.</p>
                  <p className="text-xs text-slate-400 mt-1">
                    Students will appear here immediately upon successful BLE proximity verification.
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto rounded-xl border border-slate-800">
                  <table className="w-full text-left text-xs text-slate-300">
                    <thead className="bg-slate-800/80 text-slate-400 font-semibold uppercase text-[10px] tracking-wider border-b border-slate-700/60">
                      <tr>
                        <th className="py-3 px-4">Student</th>
                        <th className="py-3 px-4">Reg Number</th>
                        <th className="py-3 px-4">Time</th>
                        <th className="py-3 px-4">Verification</th>
                        <th className="py-3 px-4">Observed RSSI</th>
                        <th className="py-3 px-4">Est. Distance</th>
                        <th className="py-3 px-4 text-right">Audit Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60 bg-slate-900/40 font-mono">
                      {filteredRecords.map((r) => (
                        <tr key={r.id} className="hover:bg-slate-800/40 transition-colors">
                          <td className="py-3 px-4 font-sans font-medium text-white flex items-center space-x-2">
                            <span className="w-6 h-6 rounded-full bg-indigo-600/40 border border-indigo-500/50 flex items-center justify-center text-[10px] font-bold">
                              {r.studentName[0]}
                            </span>
                            <span>{r.studentName}</span>
                          </td>
                          <td className="py-3 px-4 text-slate-400">{r.registrationNumber}</td>
                          <td className="py-3 px-4 text-slate-400 font-sans">
                            {new Date(r.checkInTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                          </td>
                          <td className="py-3 px-4 font-sans">
                            {r.status === 'VERIFIED' ? (
                              <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                                <CheckCircle2 className="w-3 h-3" />
                                <span>BLE Nonce</span>
                              </span>
                            ) : (
                              <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-amber-500/20 text-amber-400 border border-amber-500/30" title={r.overrideReason}>
                                <AlertTriangle className="w-3 h-3" />
                                <span>Faculty Override</span>
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-teal-400 font-bold">{r.observedRssi} dBm</td>
                          <td className="py-3 px-4 text-slate-300">~{r.estimatedDistanceM} m</td>
                          <td className="py-3 px-4 text-right font-sans">
                            {r.overrideReason ? (
                              <span className="text-[11px] text-amber-300 underline decoration-dotted cursor-pointer" title={r.overrideReason}>
                                Audited
                              </span>
                            ) : (
                              <span className="text-[11px] text-emerald-400">Cryptographically Proofed</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>

          {/* Column 3: Absent Students & Proximity Rules */}
          <div className="space-y-6">
            {/* Session Parameters Card */}
            <div className="bg-slate-900/60 rounded-2xl border border-slate-800 p-6 space-y-4">
              <h3 className="text-base font-bold text-white flex items-center space-x-2">
                <KeyRound className="w-4 h-4 text-indigo-400" />
                <span>Session Security Parameters</span>
              </h3>

              <div className="space-y-3 text-xs">
                <div className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800/80">
                  <div className="text-slate-400">BLE 16-Bit Service UUID</div>
                  <div className="font-mono font-bold text-indigo-300 text-sm mt-0.5">
                    {BLE_CONSTANTS.SERVICE_UUID_16}
                  </div>
                  <div className="text-[10px] text-slate-400 truncate mt-0.5">
                    {BLE_CONSTANTS.SERVICE_UUID_128}
                  </div>
                </div>

                <div className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800/80">
                  <div className="text-slate-400">Replay Protection Window</div>
                  <div className="font-semibold text-white mt-0.5">
                    30 Seconds (±1 Drift Window tolerance)
                  </div>
                  <div className="text-[10px] text-slate-400 mt-0.5">
                    Expired nonces are immediately rejected by backend.
                  </div>
                </div>

                <div className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800/80">
                  <div className="text-slate-400">RSSI Boundary Enforcement</div>
                  <div className="font-semibold text-white mt-0.5">
                    Threshold: {activeSession.rssiThreshold} dBm (~7.5m)
                  </div>
                  <div className="text-[10px] text-slate-400 mt-0.5">
                    Path-loss model exponent n = 2.4 (indoor classroom).
                  </div>
                </div>
              </div>
            </div>

            {/* Unverified Students Card */}
            <div className="bg-slate-900/60 rounded-2xl border border-slate-800 p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-bold text-white">Pending Attendance ({absentStudents.length})</h3>
                <span className="text-xs text-slate-400">Not yet verified</span>
              </div>

              {absentStudents.length === 0 ? (
                <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs text-center font-medium">
                  🎉 100% of class present!
                </div>
              ) : (
                <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                  {absentStudents.map((s) => (
                    <div
                      key={s.id}
                      className="flex items-center justify-between p-2.5 rounded-xl bg-slate-800/40 border border-slate-800 text-xs"
                    >
                      <div>
                        <div className="font-semibold text-white">{s.fullName}</div>
                        <div className="text-[11px] text-slate-400 font-mono">{s.identifierCode}</div>
                      </div>
                      <button
                        onClick={() => {
                          setOverrideStudentId(s.id);
                          setShowOverrideModal(true);
                        }}
                        className="text-[11px] px-2 py-1 bg-indigo-600/30 hover:bg-indigo-600 text-indigo-300 hover:text-white rounded-lg transition-colors cursor-pointer"
                      >
                        Override
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        <div className="text-center py-16 bg-slate-900/40 rounded-2xl border border-slate-800">
          <Radio className="w-12 h-12 text-slate-600 mx-auto mb-3" />
          <h2 className="text-lg font-bold text-white">No Attendance Session Active</h2>
          <p className="text-sm text-slate-400 mt-1 mb-4">
            Create an attendance session for your course to begin broadcasting the BLE proximity challenge.
          </p>
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-5 py-2.5 bg-indigo-600 text-white font-semibold text-sm rounded-xl shadow-lg shadow-indigo-600/30"
          >
            Create Session
          </button>
        </div>
      )}

      {/* Modal: Create Attendance Session */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-white flex items-center space-x-2">
                <Plus className="w-5 h-5 text-indigo-400" />
                <span>Create Attendance Session</span>
              </h3>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-slate-400 hover:text-white text-sm"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateSession} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-300 font-medium mb-1">Subject / Course</label>
                <select
                  value={formCourseId}
                  onChange={(e) => setFormCourseId(Number(e.target.value))}
                  className="w-full bg-slate-800 border border-slate-700 text-slate-200 rounded-xl px-3 py-2 text-sm focus:ring-1 focus:ring-indigo-500"
                >
                  {courses.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.code} - {c.title}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">Classroom / Lecture Hall</label>
                <input
                  type="text"
                  value={formRoom}
                  onChange={(e) => setFormRoom(e.target.value)}
                  required
                  className="w-full bg-slate-800 border border-slate-700 text-slate-200 rounded-xl px-3 py-2 text-sm focus:ring-1 focus:ring-indigo-500"
                  placeholder="e.g. Lab 304, Lecture Hall B"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">
                  Session Duration: <strong className="text-indigo-400">{formDuration} minutes</strong>
                </label>
                <input
                  type="range"
                  min="5"
                  max="120"
                  step="5"
                  value={formDuration}
                  onChange={(e) => setFormDuration(Number(e.target.value))}
                  className="w-full accent-indigo-500 cursor-pointer"
                />
                <div className="flex justify-between text-[11px] text-slate-400 mt-1">
                  <span>5 mins (Quick roll)</span>
                  <span>45 mins (Standard class)</span>
                  <span>120 mins (Lab)</span>
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">
                  Classroom Proximity Cutoff: <strong className="text-teal-400">{formRssi} dBm (~7.5m)</strong>
                </label>
                <input
                  type="range"
                  min="-90"
                  max="-60"
                  step="1"
                  value={formRssi}
                  onChange={(e) => setFormRssi(Number(e.target.value))}
                  className="w-full accent-teal-500 cursor-pointer"
                />
                <div className="flex justify-between text-[10px] text-slate-400 mt-1">
                  <span>-90 dBm (Whole floor)</span>
                  <span>-78 dBm (Classroom door)</span>
                  <span>-65 dBm (Front rows only)</span>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-800 flex items-center justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 bg-slate-800 text-slate-300 rounded-xl hover:bg-slate-700 font-medium cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-xl shadow-lg shadow-indigo-600/30 cursor-pointer"
                >
                  Start Beacon Session
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Audited Manual Override */}
      {showOverrideModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-white flex items-center space-x-2">
                <ShieldAlert className="w-5 h-5 text-amber-400" />
                <span>Manual Attendance Override</span>
              </h3>
              <button
                onClick={() => setShowOverrideModal(false)}
                className="text-slate-400 hover:text-white text-sm"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-400">
              This action bypasses the BLE proximity challenge and creates a permanent entry in the institutional
              audit log with your identity as the authorizing faculty member.
            </p>

            {overrideError && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs">
                {overrideError}
              </div>
            )}

            <form onSubmit={handleManualOverride} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-300 font-medium mb-1">Select Student</label>
                <select
                  value={overrideStudentId}
                  onChange={(e) => setOverrideStudentId(Number(e.target.value))}
                  className="w-full bg-slate-800 border border-slate-700 text-slate-200 rounded-xl px-3 py-2 text-sm focus:ring-1 focus:ring-amber-500"
                >
                  {students.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.fullName} ({s.identifierCode})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">Mandatory Audit Justification</label>
                <textarea
                  rows={3}
                  value={overrideReason}
                  onChange={(e) => setOverrideReason(e.target.value)}
                  required
                  placeholder="e.g. Student phone Bluetooth hardware failure; instructor visually confirmed student was seated in row 3."
                  className="w-full bg-slate-800 border border-slate-700 text-slate-200 rounded-xl p-3 text-xs focus:ring-1 focus:ring-amber-500"
                />
              </div>

              <div className="pt-3 border-t border-slate-800 flex items-center justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setShowOverrideModal(false)}
                  className="px-4 py-2 bg-slate-800 text-slate-300 rounded-xl hover:bg-slate-700 font-medium cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-amber-600 hover:bg-amber-500 text-white font-semibold rounded-xl shadow-lg shadow-amber-600/30 cursor-pointer"
                >
                  Authorize & Commit Override
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
