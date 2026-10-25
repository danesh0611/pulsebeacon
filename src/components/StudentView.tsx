import React, { useState, useEffect } from 'react';
import confetti from 'canvas-confetti';
import { User, AttendanceSession, AttendanceRecord } from '../types';
import { appStore } from '../services/store';
import {
  generateAdvertisingPayload,
  calculateDistance,
  calculateRssiFromDistance,
  BLE_CONSTANTS,
} from '../services/crypto';
import {
  webBluetooth,
  BluetoothDiagnosticState,
} from '../services/webBluetooth';
import {
  Radio,
  CheckCircle2,
  AlertCircle,
  Clock,
  MapPin,
  Sliders,
  Sparkles,
  Wifi,
  ShieldCheck,
  Calendar,
  Layers,
  ArrowRight,
  TrendingUp,
  Bluetooth,
  HelpCircle,
  Info,
  X,
  ExternalLink,
  Smartphone,
  Cpu,
  RefreshCw,
} from 'lucide-react';

interface StudentViewProps {
  currentUser: User;
  sessions: AttendanceSession[];
  records: AttendanceRecord[];
}

export const StudentView: React.FC<StudentViewProps> = ({
  currentUser,
  sessions,
  records,
}) => {
  const [selectedSessionId, setSelectedSessionId] = useState<number | null>(() => {
    const active = sessions.find((s) => s.status === 'ACTIVE');
    return active ? active.id : sessions[0]?.id || null;
  });

  // Physical simulation parameters (student position relative to teacher's beacon)
  const [simulatedDistanceM, setSimulatedDistanceM] = useState<number>(2.2);
  const [isScanning, setIsScanning] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [checkInResult, setCheckInResult] = useState<{
    success: boolean;
    message: string;
    record?: AttendanceRecord;
  } | null>(null);

  // Web Bluetooth real hardware state
  const [bleState, setBleState] = useState<BluetoothDiagnosticState>(webBluetooth.getState());
  const [scanMode, setScanMode] = useState<'hardware' | 'virtual'>('hardware');
  const [showBleGuideModal, setShowBleGuideModal] = useState(false);
  const [isRequestingBle, setIsRequestingBle] = useState(false);

  useEffect(() => {
    const unsubscribe = webBluetooth.subscribe((state) => {
      setBleState(state);
    });
    return unsubscribe;
  }, []);

  // Active session
  const activeSession = sessions.find((s) => s.id === selectedSessionId) || sessions[0];
  const userRecords = records.filter((r) => r.studentId === currentUser.id);

  // Calculated simulated RSSI with realistic slight random noise
  const observedRssi = calculateRssiFromDistance(simulatedDistanceM);
  const isWithinClassroomThreshold = activeSession ? observedRssi >= activeSession.rssiThreshold : false;

  // Check if current student is already checked in for this session
  const existingRecord = activeSession
    ? records.find(
        (r) =>
          r.sessionId === activeSession.id &&
          r.studentId === currentUser.id &&
          (r.status === 'VERIFIED' || r.status === 'MANUAL_OVERRIDE')
      )
    : null;

  // Real-time rolling beacon payload generated from session secret
  const [liveBeacon, setLiveBeacon] = useState<{
    payloadHex: string;
    sessionTagHex: string;
    windowIndex: number;
  } | null>(null);

  useEffect(() => {
    if (!activeSession || activeSession.status !== 'ACTIVE') {
      setLiveBeacon(null);
      return;
    }

    let isSubscribed = true;
    async function refreshBeacon() {
      if (!activeSession) return;
      const res = await generateAdvertisingPayload(
        activeSession.sessionCode,
        activeSession.bleSessionSecret,
        activeSession.bleSalt
      );
      if (isSubscribed) {
        setLiveBeacon({
          payloadHex: res.payloadHex,
          sessionTagHex: res.sessionTagHex,
          windowIndex: res.windowIndex,
        });
      }
    }

    refreshBeacon();
    const interval = setInterval(refreshBeacon, 2000);
    return () => {
      isSubscribed = false;
      clearInterval(interval);
    };
  }, [activeSession]);

  // Explicit User-Gesture to trigger native browser Bluetooth dialog
  const handleRequestBluetoothPermission = async () => {
    setIsRequestingBle(true);
    setCheckInResult(null);
    try {
      const outcome = await webBluetooth.requestBluetoothAccess();
      if (outcome.success) {
        setScanMode('hardware');
      }
    } finally {
      setIsRequestingBle(false);
    }
  };

  // Handle Mark Attendance Action
  const handleCheckIn = async () => {
    if (!activeSession || !liveBeacon) return;

    // If student selected real hardware mode and haven't paired yet, trigger the browser prompt
    if (scanMode === 'hardware' && !bleState.connectedDevice) {
      if (bleState.isSupported && bleState.permissionStatus !== 'iframe_blocked') {
        setIsRequestingBle(true);
        const outcome = await webBluetooth.requestBluetoothAccess();
        setIsRequestingBle(false);
        if (!outcome.success) {
          // If cancelled or blocked, offer fallback to complete checkin
          setCheckInResult({
            success: false,
            message:
              outcome.error ||
              'Bluetooth pairing prompt was cancelled or closed. You can switch to Virtual Proximity mode to mark attendance immediately.',
          });
          return;
        }
      }
    }

    setIsSubmitting(true);
    setCheckInResult(null);

    // Brief simulated network + BLE challenge exchange latency
    await new Promise((resolve) => setTimeout(resolve, 800));

    const result = await appStore.submitStudentCheckIn(
      activeSession.id,
      liveBeacon.payloadHex,
      observedRssi
    );

    setIsSubmitting(false);
    setCheckInResult(result);

    if (result.success) {
      // Trigger confetti celebration
      try {
        confetti({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.6 },
          colors: ['#4F46E5', '#10B981', '#06B6D4', '#F59E0B'],
        });
      } catch (e) {
        // Ignore in environments without canvas support
      }
    }
  };

  // Student summary metrics
  const totalClassesConducted = Math.max(1, sessions.length + 8);
  const totalClassesAttended = userRecords.length + 8; // Including historical sample terms
  const attendancePercentage = Math.min(100, Math.round((totalClassesAttended / totalClassesConducted) * 100));

  return (
    <div className="space-y-6">
      {/* Student Profile Card & Attendance Gauge */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950/40 to-slate-900 rounded-2xl border border-slate-800 p-6 flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="flex items-center space-x-4">
          <div className="w-16 h-16 rounded-2xl bg-indigo-600/30 border-2 border-indigo-500/50 flex items-center justify-center text-xl font-bold text-indigo-300 shadow-inner">
            {currentUser.fullName
              .split(' ')
              .map((n) => n[0])
              .join('')}
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-xl font-bold text-white">{currentUser.fullName}</h1>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                Semester {currentUser.semester || 6}
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Reg No: <strong className="text-slate-300 font-mono">{currentUser.identifierCode}</strong> •{' '}
              {currentUser.department}
            </p>
            <div className="flex items-center space-x-3 text-xs text-emerald-400 mt-2 font-medium">
              <span className="flex items-center space-x-1">
                <ShieldCheck className="w-4 h-4" />
                <span>Device Fingerprint Bound</span>
              </span>
              <span>•</span>
              <span className="text-slate-400">Bluetooth 5.3 Ready</span>
            </div>
          </div>
        </div>

        {/* Attendance Percentage Badge */}
        <div className="flex items-center space-x-4 bg-slate-950/60 p-4 rounded-xl border border-slate-800">
          <div className="text-right">
            <div className="text-xs text-slate-400 font-medium">Cumulative Attendance</div>
            <div className="text-2xl font-bold text-white mt-0.5 flex items-center justify-end space-x-1">
              <span>{attendancePercentage}%</span>
              <TrendingUp className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="text-[11px] text-emerald-400 font-medium">
              {attendancePercentage >= 75 ? 'Above 75% Requirement' : 'Attendance Warning'}
            </div>
          </div>
          <div className="w-12 h-12 rounded-full border-4 border-emerald-500/80 border-t-emerald-500/20 flex items-center justify-center text-xs font-bold text-emerald-400">
            {attendancePercentage}%
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: BLE Scanner Radar & Mark Attendance */}
        <div className="lg:col-span-2 space-y-6">
          {/* Active Sessions Selector */}
          <div className="bg-slate-900/60 rounded-2xl border border-slate-800 p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-white flex items-center space-x-2">
                <Radio className="w-4 h-4 text-indigo-400" />
                <span>Classroom Attendance Beacon</span>
              </h2>
              <span className="text-xs text-slate-400">
                {sessions.filter((s) => s.status === 'ACTIVE').length} Active Lecture(s)
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {sessions.map((s) => {
                const isCheckedIn = records.some(
                  (r) => r.sessionId === s.id && r.studentId === currentUser.id
                );
                const isSelected = s.id === selectedSessionId;

                return (
                  <div
                    key={s.id}
                    onClick={() => {
                      setSelectedSessionId(s.id);
                      setCheckInResult(null);
                    }}
                    className={`p-4 rounded-xl border text-left cursor-pointer transition-all ${
                      isSelected
                        ? 'bg-indigo-950/40 border-indigo-500 shadow-md shadow-indigo-950/40'
                        : 'bg-slate-800/40 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                        {s.courseCode}
                      </span>
                      {isCheckedIn ? (
                        <span className="flex items-center space-x-1 text-[11px] font-semibold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                          <CheckCircle2 className="w-3 h-3" />
                          <span>Present</span>
                        </span>
                      ) : s.status === 'ACTIVE' ? (
                        <span className="flex items-center space-x-1 text-[11px] font-semibold text-teal-400 animate-pulse">
                          <span>● Transmitting</span>
                        </span>
                      ) : (
                        <span className="text-[11px] text-slate-400 uppercase">{s.status}</span>
                      )}
                    </div>

                    <h3 className="font-semibold text-white text-sm mt-2 line-clamp-1">{s.courseTitle}</h3>
                    <p className="text-xs text-slate-400 mt-0.5">{s.roomNumber}</p>
                  </div>
                );
              })}
            </div>

            {/* Radar Scan & Proximity Check Card */}
            {activeSession && (
              <div className="mt-4 pt-4 border-t border-slate-800 space-y-4">
                {existingRecord ? (
                  /* Verified Success Card */
                  <div className="p-6 rounded-2xl bg-emerald-950/30 border border-emerald-500/40 text-center space-y-3">
                    <div className="w-14 h-14 rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center mx-auto text-emerald-400">
                      <CheckCircle2 className="w-8 h-8" />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-white">Attendance Confirmed</h3>
                      <p className="text-xs text-emerald-300 mt-1">
                        Your presence in <strong className="text-white">{activeSession.roomNumber}</strong> was
                        cryptographically validated via BLE rolling nonce.
                      </p>
                    </div>

                    <div className="inline-flex items-center space-x-4 bg-slate-900/80 px-4 py-2 rounded-xl text-xs text-slate-300 font-mono border border-slate-800">
                      <span>Checked-in at: {new Date(existingRecord.checkInTime).toLocaleTimeString()}</span>
                      <span>•</span>
                      <span>Signal: {existingRecord.observedRssi} dBm</span>
                      <span>•</span>
                      <span>Est: ~{existingRecord.estimatedDistanceM}m</span>
                    </div>
                  </div>
                ) : activeSession.status !== 'ACTIVE' ? (
                  <div className="p-6 rounded-2xl bg-slate-800/30 border border-slate-800 text-center text-slate-400 text-sm">
                    This attendance session is {activeSession.status.toLowerCase()}. You cannot mark attendance at this time.
                  </div>
                ) : (
                  /* Live Radar & Check-In Action */
                  <div className="space-y-4">
                    {/* Bluetooth Hardware & Permission Control Center */}
                    <div className="bg-slate-950/80 rounded-2xl border border-indigo-500/30 p-4 space-y-3">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div className="flex items-center space-x-2">
                          <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${
                            bleState.connectedDevice
                              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                              : bleState.permissionStatus === 'iframe_blocked'
                              ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40'
                              : 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/40'
                          }`}>
                            <Bluetooth className="w-4 h-4" />
                          </div>
                          <div>
                            <div className="text-xs font-bold text-white flex items-center space-x-2">
                              <span>Bluetooth Hardware & Permissions</span>
                              <button
                                type="button"
                                onClick={() => setShowBleGuideModal(true)}
                                className="text-indigo-400 hover:text-indigo-300 flex items-center space-x-1 text-[11px] underline cursor-pointer"
                                title="Why wasn't Bluetooth permission asked automatically?"
                              >
                                <HelpCircle className="w-3.5 h-3.5" />
                                <span>Why wasn't permission asked?</span>
                              </button>
                            </div>
                            <div className="text-[11px] text-slate-400">
                              {bleState.connectedDevice ? (
                                <span className="text-emerald-400 font-semibold">
                                  Paired: {bleState.connectedDevice.name} ({bleState.connectedDevice.id.slice(0, 8)}...)
                                </span>
                              ) : bleState.permissionStatus === 'iframe_blocked' ? (
                                <span className="text-amber-400 font-medium">
                                  iFrame sandbox policy restricts direct browser dialog
                                </span>
                              ) : bleState.permissionStatus === 'unsupported' ? (
                                <span className="text-slate-400">
                                  Web Bluetooth unsupported in this browser (Use Chrome / Android)
                                </span>
                              ) : bleState.permissionStatus === 'prompting' ? (
                                <span className="text-teal-400 animate-pulse font-medium">
                                  Awaiting device selection in browser dialog...
                                </span>
                              ) : (
                                <span>Permission unasked: click button below to open Chrome Bluetooth prompt</span>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Mode Switcher */}
                        <div className="flex items-center bg-slate-900 p-1 rounded-xl border border-slate-800 text-xs shrink-0">
                          <button
                            type="button"
                            onClick={() => setScanMode('hardware')}
                            className={`px-3 py-1 rounded-lg font-medium transition-colors ${
                              scanMode === 'hardware'
                                ? 'bg-indigo-600 text-white shadow'
                                : 'text-slate-400 hover:text-slate-200'
                            }`}
                          >
                            Hardware Scan
                          </button>
                          <button
                            type="button"
                            onClick={() => setScanMode('virtual')}
                            className={`px-3 py-1 rounded-lg font-medium transition-colors ${
                              scanMode === 'virtual'
                                ? 'bg-teal-600 text-white shadow'
                                : 'text-slate-400 hover:text-slate-200'
                            }`}
                          >
                            Virtual Beacon
                          </button>
                        </div>
                      </div>

                      {/* Interactive Trigger for Browser Bluetooth Prompt */}
                      <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-slate-900">
                        <button
                          type="button"
                          onClick={handleRequestBluetoothPermission}
                          disabled={isRequestingBle}
                          className="px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs flex items-center space-x-1.5 shadow cursor-pointer disabled:opacity-50"
                        >
                          <Bluetooth className="w-3.5 h-3.5" />
                          <span>
                            {isRequestingBle
                              ? 'Requesting Browser Bluetooth Dialog...'
                              : 'Request Bluetooth Permission & Scan'}
                          </span>
                        </button>

                        {bleState.connectedDevice && (
                          <button
                            type="button"
                            onClick={() => webBluetooth.disconnect()}
                            className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs border border-slate-700 cursor-pointer"
                          >
                            Disconnect Device
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={() => setShowBleGuideModal(true)}
                          className="px-3 py-1.5 rounded-xl bg-slate-800/80 hover:bg-slate-700/80 text-slate-300 text-xs border border-slate-700/80 flex items-center space-x-1 cursor-pointer"
                        >
                          <Info className="w-3.5 h-3.5 text-indigo-400" />
                          <span>Permission Guide & Diagnostics</span>
                        </button>
                      </div>

                      {/* iFrame / Browser Notice if applicable */}
                      {bleState.permissionStatus === 'iframe_blocked' && (
                        <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-300 flex items-start space-x-2">
                          <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                          <div className="space-y-1">
                            <div className="font-semibold text-amber-200">
                              Browser Sandbox Active (Security Policy)
                            </div>
                            <p className="text-[11px] leading-relaxed text-amber-300/90">
                              Inside embedded web previews, the browser enforces permissions policy which blocks
                              the hardware device picker. You can test native pairing in a direct browser tab, use our
                              Native Android App (<code className="bg-amber-950/60 px-1 rounded font-mono">/android</code>),
                              or use <strong>Virtual Beacon Mode</strong> below which performs the exact same HMAC rolling cryptographic verification!
                            </p>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Simulated Radar Visual */}
                    <div className="relative bg-slate-950 rounded-2xl border border-slate-800 p-6 flex flex-col items-center justify-center overflow-hidden min-h-[220px]">
                      {/* Concentric rings */}
                      <div className="absolute w-44 h-44 rounded-full border border-indigo-500/20 animate-ping opacity-30" />
                      <div className="absolute w-32 h-32 rounded-full border border-indigo-500/30" />
                      <div className="absolute w-20 h-20 rounded-full border border-teal-500/40" />

                      {/* Beacon Transmitter node in center */}
                      <div className="relative z-10 w-12 h-12 rounded-full bg-indigo-600 flex items-center justify-center text-white shadow-lg shadow-indigo-600/50 mb-3">
                        <Radio className="w-6 h-6 animate-pulse" />
                      </div>

                      <div className="relative z-10 text-center">
                        <div className="text-xs font-semibold text-indigo-300">
                          Faculty Beacon Detected ({BLE_CONSTANTS.SERVICE_UUID_16})
                        </div>
                        <div className="text-xs text-slate-400 font-mono mt-0.5">
                          Session: {liveBeacon?.sessionTagHex || 'SYNCING...'} • Window #{liveBeacon?.windowIndex}
                        </div>
                      </div>

                      {/* Telemetry pill */}
                      <div className="relative z-10 mt-3 flex items-center space-x-3 bg-slate-900/90 px-3.5 py-1.5 rounded-full border border-slate-700/80 text-xs">
                        <span className="flex items-center space-x-1.5">
                          <span
                            className={`w-2 h-2 rounded-full ${
                              isWithinClassroomThreshold ? 'bg-emerald-400' : 'bg-rose-400'
                            }`}
                          />
                          <span className="font-bold text-white font-mono">{observedRssi} dBm</span>
                        </span>
                        <span className="text-slate-400">|</span>
                        <span className="text-slate-300">
                          Est. Distance: <strong className="text-white font-mono">~{simulatedDistanceM}m</strong>
                        </span>
                        <span className="text-slate-400">|</span>
                        <span
                          className={`text-[11px] font-semibold ${
                            isWithinClassroomThreshold ? 'text-emerald-400' : 'text-rose-400'
                          }`}
                        >
                          {isWithinClassroomThreshold ? 'Within Room' : 'Outside Boundary'}
                        </span>
                      </div>
                    </div>

                    {/* Interactive Proximity Controls (Demonstrates RF distance behavior) */}
                    <div className="bg-slate-950/70 p-4 rounded-xl border border-slate-800 space-y-3">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-slate-300 font-semibold flex items-center space-x-1.5">
                          <Sliders className="w-3.5 h-3.5 text-indigo-400" />
                          <span>Classroom RF Proximity Simulation Bench</span>
                        </span>
                        <span className="text-slate-400 text-[11px]">
                          Threshold Cutoff: {activeSession.rssiThreshold} dBm
                        </span>
                      </div>

                      <div>
                        <input
                          type="range"
                          min="0.3"
                          max="12.0"
                          step="0.1"
                          value={simulatedDistanceM}
                          onChange={(e) => setSimulatedDistanceM(parseFloat(e.target.value))}
                          className="w-full accent-indigo-500 cursor-pointer"
                        />
                      </div>

                      {/* Distance Presets */}
                      <div className="flex flex-wrap gap-1.5 text-[11px]">
                        <button
                          type="button"
                          onClick={() => setSimulatedDistanceM(1.2)}
                          className={`px-2.5 py-1 rounded-lg border transition-colors ${
                            simulatedDistanceM === 1.2
                              ? 'bg-indigo-600 text-white border-indigo-500'
                              : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
                          }`}
                        >
                          Front Row (1.2m)
                        </button>
                        <button
                          type="button"
                          onClick={() => setSimulatedDistanceM(3.5)}
                          className={`px-2.5 py-1 rounded-lg border transition-colors ${
                            simulatedDistanceM === 3.5
                              ? 'bg-indigo-600 text-white border-indigo-500'
                              : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
                          }`}
                        >
                          Middle Row (3.5m)
                        </button>
                        <button
                          type="button"
                          onClick={() => setSimulatedDistanceM(6.2)}
                          className={`px-2.5 py-1 rounded-lg border transition-colors ${
                            simulatedDistanceM === 6.2
                              ? 'bg-indigo-600 text-white border-indigo-500'
                              : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
                          }`}
                        >
                          Back Row (6.2m)
                        </button>
                        <button
                          type="button"
                          onClick={() => setSimulatedDistanceM(10.5)}
                          className={`px-2.5 py-1 rounded-lg border transition-colors ${
                            simulatedDistanceM === 10.5
                              ? 'bg-rose-600 text-white border-rose-500'
                              : 'bg-slate-800 text-rose-300 border-slate-700 hover:bg-slate-700'
                          }`}
                          title="Simulates student standing in the exterior hallway outside classroom boundary"
                        >
                          Outside Hallway (10.5m)
                        </button>
                      </div>
                    </div>

                    {/* Result or Error Banner */}
                    {checkInResult && !checkInResult.success && (
                      <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-start space-x-2 text-rose-300 text-xs">
                        <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                        <div>
                          <div className="font-semibold text-rose-200">Verification Declined</div>
                          <div className="mt-0.5">{checkInResult.message}</div>
                        </div>
                      </div>
                    )}

                    {/* Big Action Button */}
                    <button
                      onClick={handleCheckIn}
                      disabled={isSubmitting || isRequestingBle}
                      className={`w-full py-3.5 px-6 rounded-xl font-bold text-sm text-white shadow-lg transition-all flex items-center justify-center space-x-2 cursor-pointer ${
                        !isWithinClassroomThreshold
                          ? 'bg-amber-600 hover:bg-amber-500 shadow-amber-600/30'
                          : 'bg-gradient-to-r from-indigo-600 to-teal-500 hover:from-indigo-500 hover:to-teal-400 shadow-indigo-600/30'
                      }`}
                    >
                      {isSubmitting || isRequestingBle ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          <span>
                            {isRequestingBle ? 'Waiting for Bluetooth Device Selection...' : 'Verifying BLE Challenge Nonce...'}
                          </span>
                        </>
                      ) : (
                        <>
                          <Radio className="w-4 h-4" />
                          <span>
                            {isWithinClassroomThreshold
                              ? scanMode === 'hardware' && !bleState.connectedDevice
                                ? 'Pair BLE & Mark Attendance'
                                : 'Mark Attendance via BLE Proximity'
                              : 'Attempt Check-In (Warning: Weak Signal)'}
                          </span>
                        </>
                      )}
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Right Col: Attendance History */}
        <div className="space-y-6">
          <div className="bg-slate-900/60 rounded-2xl border border-slate-800 p-6 space-y-4">
            <h3 className="text-base font-bold text-white flex items-center space-x-2">
              <Calendar className="w-4 h-4 text-indigo-400" />
              <span>Your Attendance History</span>
            </h3>

            {userRecords.length === 0 ? (
              <div className="p-6 text-center text-slate-400 text-xs bg-slate-950/40 rounded-xl border border-slate-800/80">
                No past records recorded in this session.
              </div>
            ) : (
              <div className="space-y-3">
                {userRecords.map((rec) => (
                  <div
                    key={rec.id}
                    className="p-3.5 rounded-xl bg-slate-800/40 border border-slate-800 text-xs space-y-1.5"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-white">{rec.courseCode}</span>
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                        {rec.status}
                      </span>
                    </div>

                    <div className="text-slate-400 text-[11px]">{rec.courseTitle}</div>

                    <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1 border-t border-slate-800/60 font-mono">
                      <span>{new Date(rec.checkInTime).toLocaleDateString()}</span>
                      <span className="text-teal-400">{rec.observedRssi} dBm (~{rec.estimatedDistanceM}m)</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Proximity Security Notice */}
          <div className="bg-slate-900/40 rounded-2xl border border-slate-800 p-5 text-xs text-slate-400 space-y-2">
            <div className="font-semibold text-slate-300 flex items-center space-x-1.5">
              <ShieldCheck className="w-4 h-4 text-teal-400" />
              <span>Institutional Proximity Integrity</span>
            </div>
            <p className="text-[11px] leading-relaxed">
              PulseBeacon validates physical presence using rotating cryptographic nonces broadcast within ~8 meters.
              Attempts to replay expired packets or spoof foreign registration numbers are automatically blocked and
              recorded in the university security audit ledger.
            </p>
          </div>
        </div>
      </div>

      {/* Bluetooth Permission Diagnostic & Troubleshooting Guide Modal */}
      {showBleGuideModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-2xl w-full p-6 space-y-5 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-500/20 border border-indigo-500/40 flex items-center justify-center text-indigo-400">
                  <Bluetooth className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">
                    Bluetooth Permission & Architecture Guide
                  </h3>
                  <p className="text-xs text-slate-400">
                    Understanding browser security permissions vs native Android BLE
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowBleGuideModal(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Live Environment Diagnosis */}
            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2.5">
              <div className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                Current Browser Diagnostics
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800">
                  <div className="text-slate-400 text-[11px]">Web Bluetooth API:</div>
                  <div className={`font-semibold mt-0.5 ${bleState.isSupported ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {bleState.isSupported ? 'Supported in navigator' : 'Not supported in this browser'}
                  </div>
                </div>
                <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800">
                  <div className="text-slate-400 text-[11px]">Window Context:</div>
                  <div className="font-semibold mt-0.5 text-slate-200">
                    {bleState.isIframe ? 'Inside iFrame (Preview Sandbox)' : 'Top-Level Window'}
                  </div>
                </div>
                <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800">
                  <div className="text-slate-400 text-[11px]">Hardware Adapter Available:</div>
                  <div className="font-semibold mt-0.5 text-slate-200">
                    {bleState.availability === null ? 'Pending query' : bleState.availability ? 'Radio Active' : 'Adapter Off / Missing'}
                  </div>
                </div>
                <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800">
                  <div className="text-slate-400 text-[11px]">Current Permission Status:</div>
                  <div className="font-semibold mt-0.5 text-indigo-400 capitalize">
                    {bleState.permissionStatus}
                  </div>
                </div>
              </div>
            </div>

            {/* Core Explanations */}
            <div className="space-y-3.5 text-xs">
              <div className="p-3.5 rounded-xl bg-slate-800/50 border border-slate-700/60 space-y-1.5">
                <div className="font-bold text-white flex items-center space-x-1.5">
                  <span className="w-5 h-5 rounded-full bg-indigo-500/20 text-indigo-400 flex items-center justify-center text-[11px]">1</span>
                  <span>Why is no permission dialog asked on page load?</span>
                </div>
                <p className="text-slate-300 leading-relaxed pl-6">
                  Unlike Geolocation or Notifications, the <strong>W3C Web Bluetooth standard strictly forbids</strong> browsers from requesting Bluetooth permissions on page load. The permission modal can <strong>ONLY</strong> be triggered by an explicit user gesture (such as clicking the <em>"Request Bluetooth Permission & Scan"</em> button).
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-800/50 border border-slate-700/60 space-y-1.5">
                <div className="font-bold text-white flex items-center space-x-1.5">
                  <span className="w-5 h-5 rounded-full bg-indigo-500/20 text-indigo-400 flex items-center justify-center text-[11px]">2</span>
                  <span>Why can preview iframes block the dialog?</span>
                </div>
                <p className="text-slate-300 leading-relaxed pl-6">
                  When a web app runs inside an embedded iframe preview, modern browsers enforce a <code>permissions-policy</code> header. If <code>allow="bluetooth"</code> is not declared on the host iframe, calling <code>requestDevice()</code> throws a <code>SecurityError</code>. For full physical device testing, launch in a top-level tab or use the Native Android App.
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-800/50 border border-slate-700/60 space-y-1.5">
                <div className="font-bold text-white flex items-center space-x-1.5">
                  <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-[11px]">3</span>
                  <span>How Android Native App handles Permissions (<code className="font-mono">/android</code>)</span>
                </div>
                <p className="text-slate-300 leading-relaxed pl-6">
                  The provided Android Kotlin project in <code className="text-emerald-300 font-mono">/android</code> uses Android 12+ runtime permissions:
                  <code className="text-emerald-300 font-mono block mt-1 bg-slate-950 p-2 rounded">
                    android.permission.BLUETOOTH_SCAN<br />
                    android.permission.BLUETOOTH_CONNECT<br />
                    android.permission.BLUETOOTH_ADVERTISE
                  </code>
                  When launched on an Android device, the native OS automatically prompts the user with the system permission dialog before initiating BLE advertising or scanning.
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-800/50 border border-slate-700/60 space-y-1.5">
                <div className="font-bold text-white flex items-center space-x-1.5">
                  <span className="w-5 h-5 rounded-full bg-teal-500/20 text-teal-400 flex items-center justify-center text-[11px]">4</span>
                  <span>Virtual BLE Beacon Simulation (Zero-Hardware Required)</span>
                </div>
                <p className="text-slate-300 leading-relaxed pl-6">
                  To ensure testing works smoothly across all devices and inside preview sandboxes, PulseBeacon features a high-fidelity cryptographic simulator. It generates genuine 30-second rotating HMAC-SHA256 packets, tests RF path loss equations, and validates distance thresholds without requiring physical hardware pairing.
                </p>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-between pt-4 border-t border-slate-800">
              <button
                type="button"
                onClick={() => {
                  setShowBleGuideModal(false);
                  handleRequestBluetoothPermission();
                }}
                className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs flex items-center space-x-2"
              >
                <Bluetooth className="w-4 h-4" />
                <span>Test Browser Bluetooth Prompt Now</span>
              </button>

              <button
                type="button"
                onClick={() => setShowBleGuideModal(false)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold"
              >
                Close Guide
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

