import React, { useState, useEffect } from 'react';
import {
  generateAdvertisingPayload,
  verifyAdvertisingPayload,
  calculateDistance,
  calculateRssiFromDistance,
  BLE_CONSTANTS,
} from '../services/crypto';
import {
  webBluetooth,
  BluetoothDiagnosticState,
} from '../services/webBluetooth';
import {
  Binary,
  Radio,
  ShieldCheck,
  ShieldAlert,
  Sliders,
  CheckCircle2,
  XCircle,
  Layers,
  HelpCircle,
  Key,
  Wifi,
  Lock,
  AlertTriangle,
  Bluetooth,
  Smartphone,
  Cpu,
  Info,
  RefreshCw,
} from 'lucide-react';

export const BleProtocolLab: React.FC = () => {
  // Web Bluetooth state
  const [bleState, setBleState] = useState<BluetoothDiagnosticState>(webBluetooth.getState());
  const [isPromptingBle, setIsPromptingBle] = useState(false);

  useEffect(() => {
    return webBluetooth.subscribe((state) => {
      setBleState(state);
    });
  }, []);

  const handleTestBrowserBluetooth = async () => {
    setIsPromptingBle(true);
    try {
      await webBluetooth.requestBluetoothAccess();
    } finally {
      setIsPromptingBle(false);
    }
  };
  // Playground state
  const [testSessionCode, setTestSessionCode] = useState('SESS-CS401-LAB304');
  const [testSecret, setTestSecret] = useState('pulsebeacon_ble_hmac_master_secret_key_8842');
  const [testSalt, setTestSalt] = useState('9F28D1B4');
  const [tamperedPayload, setTamperedPayload] = useState<string>('');
  const [tamperWindowOffset, setTamperWindowOffset] = useState<number>(0);
  const [validationResult, setValidationResult] = useState<{
    isValid: boolean;
    reason: string;
    windowIndex: number;
  } | null>(null);

  // RF Path loss interactive calculator
  const [calcDistance, setCalcDistance] = useState<number>(3.0);
  const [calcTxPower, setCalcTxPower] = useState<number>(-59.0);
  const [calcPathLossExp, setCalcPathLossExp] = useState<number>(2.4);

  const calcRssi = calculateRssiFromDistance(calcDistance, calcTxPower, calcPathLossExp);

  // Generate test payload
  const handleGenerateFresh = async () => {
    const epochSec = Math.floor(Date.now() / 1000);
    const winIdx = Math.floor(epochSec / BLE_CONSTANTS.ROTATING_WINDOW_SECONDS) + tamperWindowOffset;
    const res = await generateAdvertisingPayload(testSessionCode, testSecret, testSalt, winIdx);
    setTamperedPayload(res.payloadHex);
    setValidationResult(null);
  };

  // Run verification
  const handleTestVerify = async () => {
    if (!tamperedPayload) return;
    const res = await verifyAdvertisingPayload(
      tamperedPayload,
      testSessionCode,
      testSecret,
      testSalt,
      1 // tolerance +/- 1 window
    );
    setValidationResult(res);
  };

  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      {/* Title Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-teal-950/40 to-slate-900 rounded-2xl border border-teal-800/40 p-6 flex flex-col md:flex-row items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-xl font-bold text-white">BLE Protocol & Security Architecture</h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-teal-500/20 text-teal-300 border border-teal-500/30">
              Technical Specification
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1 max-w-2xl">
            In-depth analysis of the 31-byte Bluetooth Low Energy advertisement frame, discrete time-window HMAC rotation,
            log-distance path-loss propagation modeling, and anti-abuse threat mitigations.
          </p>
        </div>
      </div>

      {/* Section 1: 31-Byte BLE Legacy Advertising Frame Layout */}
      <div className="bg-slate-900/60 rounded-2xl border border-slate-800 p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-white flex items-center space-x-2">
            <Binary className="w-5 h-5 text-teal-400" />
            <span>1. 31-Byte BLE Legacy Advertising PDU Structure</span>
          </h2>
          <span className="text-xs text-slate-400 font-mono">Max Payload: 31 Bytes (248 bits)</span>
        </div>

        <p className="text-xs text-slate-300 leading-relaxed">
          Legacy Bluetooth Low Energy advertising packets are capped at <strong>31 bytes</strong> in the primary
          advertising channels (37, 38, 39). PulseBeacon engineers the attendance payload into a single Service Data AD
          structure with 16-bit UUID <code>0xFD2A</code>, ensuring compatibility with virtually 100% of Android and iOS
          smartphones without requiring Bluetooth 5 Extended Advertising.
        </p>

        {/* Visual Byte Diagram */}
        <div className="space-y-3 pt-2">
          <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
            Packet Field Mapping:
          </div>

          <div className="grid grid-cols-1 md:grid-cols-6 gap-2 text-xs font-mono">
            {/* Flags */}
            <div className="p-3 rounded-xl bg-slate-800/80 border border-slate-700 space-y-1">
              <div className="text-[10px] text-slate-400 uppercase font-sans">Bytes 0..2 (3B)</div>
              <div className="font-bold text-white">02 01 06</div>
              <div className="text-[10px] text-slate-400 font-sans">Flags: General Disc, BR/EDR Not Supp.</div>
            </div>

            {/* AD Length & Type */}
            <div className="p-3 rounded-xl bg-blue-950/60 border border-blue-800/60 space-y-1">
              <div className="text-[10px] text-blue-400 uppercase font-sans">Bytes 3..4 (2B)</div>
              <div className="font-bold text-blue-300">17 16</div>
              <div className="text-[10px] text-slate-400 font-sans">Len: 23B, AD Type: Service Data 16-bit</div>
            </div>

            {/* Service UUID */}
            <div className="p-3 rounded-xl bg-indigo-950/60 border border-indigo-800/60 space-y-1">
              <div className="text-[10px] text-indigo-400 uppercase font-sans">Bytes 5..6 (2B)</div>
              <div className="font-bold text-indigo-300">2A FD</div>
              <div className="text-[10px] text-slate-400 font-sans">UUID: 0xFD2A (Little Endian)</div>
            </div>

            {/* Session Tag & Window */}
            <div className="p-3 rounded-xl bg-purple-950/60 border border-purple-800/60 space-y-1">
              <div className="text-[10px] text-purple-400 uppercase font-sans">Bytes 7..14 (8B)</div>
              <div className="font-bold text-purple-300">[Tag 4B][Win 4B]</div>
              <div className="text-[10px] text-slate-400 font-sans">Session ID hash + 30s Epoch window</div>
            </div>

            {/* Salt */}
            <div className="p-3 rounded-xl bg-amber-950/60 border border-amber-800/60 space-y-1">
              <div className="text-[10px] text-amber-400 uppercase font-sans">Bytes 15..18 (4B)</div>
              <div className="font-bold text-amber-300">[Salt 4B]</div>
              <div className="text-[10px] text-slate-400 font-sans">Session pseudo-random hex salt</div>
            </div>

            {/* HMAC Slice */}
            <div className="p-3 rounded-xl bg-emerald-950/60 border border-emerald-800/60 space-y-1">
              <div className="text-[10px] text-emerald-400 uppercase font-sans">Bytes 19..26 (8B)</div>
              <div className="font-bold text-emerald-300">[HMAC 8B]</div>
              <div className="text-[10px] text-slate-400 font-sans">HMAC-SHA256 slice (64 bits)</div>
            </div>
          </div>
          <div className="text-[11px] text-slate-400">
            Total Used: 27 of 31 available bytes. 4 spare bytes available for dynamic battery telemetry or manufacturer data.
          </div>
        </div>
      </div>

      {/* Section 2: RF Path-Loss Propagation Calculator */}
      <div className="bg-slate-900/60 rounded-2xl border border-slate-800 p-6 space-y-4">
        <h2 className="text-base font-bold text-white flex items-center space-x-2">
          <Radio className="w-5 h-5 text-indigo-400" />
          <span>2. Log-Distance Path-Loss Model & Distance Estimation</span>
        </h2>

        <p className="text-xs text-slate-300 leading-relaxed">
          Indoor radio frequency signals attenuate according to the log-distance path loss formula:
        </p>

        <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 font-mono text-xs text-center text-indigo-300">
          RSSI = A - 10 · n · log₁₀(d) &nbsp; ⟺ &nbsp; d = 10^((A - RSSI) / (10 · n))
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2 text-xs">
          <div>
            <label className="block text-slate-300 font-medium mb-1">
              Distance (d): <strong className="text-white font-mono">{calcDistance} meters</strong>
            </label>
            <input
              type="range"
              min="0.5"
              max="15.0"
              step="0.1"
              value={calcDistance}
              onChange={(e) => setCalcDistance(parseFloat(e.target.value))}
              className="w-full accent-indigo-500 cursor-pointer"
            />
          </div>

          <div>
            <label className="block text-slate-300 font-medium mb-1">
              Tx Power @ 1m (A): <strong className="text-white font-mono">{calcTxPower} dBm</strong>
            </label>
            <input
              type="range"
              min="-65"
              max="-50"
              step="1"
              value={calcTxPower}
              onChange={(e) => setCalcTxPower(parseFloat(e.target.value))}
              className="w-full accent-indigo-500 cursor-pointer"
            />
          </div>

          <div>
            <label className="block text-slate-300 font-medium mb-1">
              Path Loss Factor (n): <strong className="text-white font-mono">{calcPathLossExp}</strong>
            </label>
            <input
              type="range"
              min="1.8"
              max="3.5"
              step="0.1"
              value={calcPathLossExp}
              onChange={(e) => setCalcPathLossExp(parseFloat(e.target.value))}
              className="w-full accent-indigo-500 cursor-pointer"
            />
            <div className="text-[10px] text-slate-400 mt-0.5">2.0 = Free space, 2.4 = Classroom, 3.0 = Dense walls</div>
          </div>
        </div>

        <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between text-xs">
          <div>
            <span className="text-slate-400">Predicted Smartphone RSSI: </span>
            <span className="text-base font-bold font-mono text-emerald-400">{calcRssi} dBm</span>
          </div>
          <div className="text-right">
            <span className="text-slate-400">Classification: </span>
            <span className={`font-semibold ${calcRssi >= -78 ? 'text-emerald-400' : 'text-rose-400'}`}>
              {calcRssi >= -78 ? 'Inside Lecture Hall' : 'Outside Cutoff Boundary'}
            </span>
          </div>
        </div>
      </div>

      {/* Section 3: Interactive Cryptographic Token & Tampering Playground */}
      <div className="bg-slate-900/60 rounded-2xl border border-slate-800 p-6 space-y-4">
        <h2 className="text-base font-bold text-white flex items-center space-x-2">
          <Lock className="w-5 h-5 text-purple-400" />
          <span>3. Cryptographic Token Tampering & Anti-Replay Test Bench</span>
        </h2>

        <p className="text-xs text-slate-300">
          Simulate an attacker attempting to forge an attendance token, tamper with bytes, or replay an expired token.
        </p>

        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={handleGenerateFresh}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-xl shadow cursor-pointer"
            >
              Generate Fresh Beacon Token
            </button>

            <button
              onClick={() => {
                // Expire token by shifting window by -3 (90s in the past)
                setTamperWindowOffset(-3);
                handleGenerateFresh();
              }}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-amber-300 text-xs font-medium rounded-xl border border-amber-500/30 cursor-pointer"
            >
              Simulate Expired Replay Attack (-90s)
            </button>

            <button
              onClick={() => {
                // Byte flip in HMAC
                if (tamperedPayload.length >= 40) {
                  const chars = tamperedPayload.split('');
                  chars[35] = chars[35] === 'A' ? 'F' : 'A';
                  setTamperedPayload(chars.join(''));
                  setValidationResult(null);
                }
              }}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-rose-300 text-xs font-medium rounded-xl border border-rose-500/30 cursor-pointer"
            >
              Flip 1 Byte in Signature
            </button>
          </div>

          <div>
            <label className="block text-slate-400 text-xs mb-1 font-mono">
              Current Advertisement Payload Hex (40 Hex Chars = 20 Bytes):
            </label>
            <input
              type="text"
              value={tamperedPayload}
              onChange={(e) => {
                setTamperedPayload(e.target.value.toUpperCase());
                setValidationResult(null);
              }}
              placeholder="Click 'Generate Fresh Beacon Token' above or paste hex..."
              className="w-full bg-slate-950 border border-slate-700 text-white font-mono text-xs rounded-xl p-3 focus:ring-1 focus:ring-indigo-500"
            />
          </div>

          <button
            onClick={handleTestVerify}
            disabled={!tamperedPayload}
            className="w-full py-2.5 bg-teal-600 hover:bg-teal-500 disabled:opacity-50 text-white text-xs font-bold rounded-xl cursor-pointer"
          >
            Run Backend Verification Routine
          </button>

          {validationResult && (
            <div
              className={`p-4 rounded-xl border flex items-start space-x-3 text-xs ${
                validationResult.isValid
                  ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-300'
                  : 'bg-rose-950/40 border-rose-500/40 text-rose-300'
              }`}
            >
              {validationResult.isValid ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
              ) : (
                <XCircle className="w-5 h-5 text-rose-400 shrink-0" />
              )}
              <div>
                <div className="font-bold text-sm">
                  {validationResult.isValid ? 'Token Verification Passed' : 'Cryptographic Rejection'}
                </div>
                <div className="mt-0.5">{validationResult.reason}</div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Section 4: Web Bluetooth Hardware & Permission Diagnostic Bench */}
      <div className="bg-slate-900/60 rounded-2xl border border-slate-800 p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-bold text-white flex items-center space-x-2">
              <Bluetooth className="w-5 h-5 text-indigo-400" />
              <span>4. Web Bluetooth & Hardware Permission Diagnostic Bench</span>
            </h2>
            <p className="text-xs text-slate-300 mt-1">
              Live hardware diagnostics for the browser's Bluetooth stack, permissions policy, and native device pairing.
            </p>
          </div>

          <button
            type="button"
            onClick={handleTestBrowserBluetooth}
            disabled={isPromptingBle}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-xl shadow cursor-pointer flex items-center space-x-2 shrink-0 disabled:opacity-50"
          >
            <Bluetooth className="w-4 h-4" />
            <span>{isPromptingBle ? 'Browser Prompt Open...' : 'Trigger requestDevice() Prompt'}</span>
          </button>
        </div>

        {/* Real-time Status Card */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-xs">
          <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
            <span className="text-slate-400 text-[11px]">API Support</span>
            <div className={`font-bold flex items-center space-x-1.5 ${bleState.isSupported ? 'text-emerald-400' : 'text-rose-400'}`}>
              <span>{bleState.isSupported ? 'Supported' : 'Unavailable'}</span>
            </div>
            <div className="text-[10px] text-slate-400 font-mono">navigator.bluetooth</div>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
            <span className="text-slate-400 text-[11px]">Preview Sandbox</span>
            <div className={`font-bold ${bleState.isIframe ? 'text-amber-400' : 'text-emerald-400'}`}>
              {bleState.isIframe ? 'iFrame (Restricted Policy)' : 'Direct Window (Open)'}
            </div>
            <div className="text-[10px] text-slate-400">Permissions-Policy</div>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
            <span className="text-slate-400 text-[11px]">Hardware Radio</span>
            <div className="font-bold text-slate-200">
              {bleState.availability === null ? 'Checking...' : bleState.availability ? 'Radio Active' : 'Off / Unreachable'}
            </div>
            <div className="text-[10px] text-slate-400 font-mono">getAvailability()</div>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
            <span className="text-slate-400 text-[11px]">Permission State</span>
            <div className="font-bold text-indigo-400 capitalize">
              {bleState.permissionStatus}
            </div>
            <div className="text-[10px] text-slate-400">
              {bleState.connectedDevice ? bleState.connectedDevice.name : 'No device paired'}
            </div>
          </div>
        </div>

        {/* Explanatory notice */}
        <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 text-xs space-y-2">
          <div className="font-bold text-slate-200 flex items-center space-x-2">
            <Info className="w-4 h-4 text-indigo-400" />
            <span>Why isn't Bluetooth permission requested automatically?</span>
          </div>
          <ul className="list-disc list-inside space-y-1 text-slate-300 pl-1 leading-relaxed">
            <li>
              <strong>Mandatory User Gesture:</strong> W3C Web Bluetooth strictly enforces that{' '}
              <code className="text-indigo-300 font-mono">navigator.bluetooth.requestDevice()</code> can only be called from an explicit click event. Browsers do not support passive or page-load permission prompts.
            </li>
            <li>
              <strong>iFrame Sandbox Permissions-Policy:</strong> Embedded iframe previews require the host iframe to declare{' '}
              <code className="text-teal-300 font-mono">allow="bluetooth"</code>. Without this policy, Chrome throws a SecurityError.
            </li>
            <li>
              <strong>Android 12+ APK:</strong> The native Android application in <code className="text-emerald-300 font-mono">/android</code> automatically requests <code className="text-emerald-300 font-mono">BLUETOOTH_SCAN</code> and <code className="text-emerald-300 font-mono">BLUETOOTH_ADVERTISE</code> system dialogs when opened.
            </li>
          </ul>
        </div>
      </div>

      {/* Section 5: Security Threat Model & Proximity Limitations */}
      <div className="bg-slate-900/60 rounded-2xl border border-slate-800 p-6 space-y-4">
        <h2 className="text-base font-bold text-white flex items-center space-x-2">
          <ShieldAlert className="w-5 h-5 text-amber-400" />
          <span>5. Formal Threat Model & Proximity Limitations</span>
        </h2>

        <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-200 text-xs leading-relaxed space-y-2">
          <div className="font-bold text-amber-300 flex items-center space-x-1.5">
            <AlertTriangle className="w-4 h-4" />
            <span>Crucial Cybersecurity Note: Proximity Evidence vs. Physical Presence Proof</span>
          </div>
          <p>
            Bluetooth Low Energy radio waves prove that an antenna received a broadcast packet within a certain RF radius.
            However, radio signals alone cannot conclusively guarantee human physical presence without secondary
            verifications (such as biometric device lock or instructor visual audits).
          </p>
        </div>

        <div className="overflow-x-auto rounded-xl border border-slate-800">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-800/80 text-slate-400 font-semibold uppercase text-[10px] tracking-wider border-b border-slate-700/60">
              <tr>
                <th className="py-3 px-4">Threat Vector</th>
                <th className="py-3 px-4">Attack Scenario</th>
                <th className="py-3 px-4">PulseBeacon Mitigation</th>
                <th className="py-3 px-4 text-right">Residual Risk Level</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 bg-slate-900/40 text-[11px]">
              <tr>
                <td className="py-3 px-4 font-bold text-white">Replay Attack</td>
                <td className="py-3 px-4">Attacker sniffs a valid BLE broadcast packet and replays it 10 minutes later.</td>
                <td className="py-3 px-4 text-emerald-400">
                  Rejected. 30-second rolling epoch window. Expired challenges are discarded by backend HMAC verification.
                </td>
                <td className="py-3 px-4 text-right text-emerald-400 font-bold">Negligible</td>
              </tr>
              <tr>
                <td className="py-3 px-4 font-bold text-white">Duplicate Submissions</td>
                <td className="py-3 px-4">Student submits check-in multiple times to spoof attendance for peers.</td>
                <td className="py-3 px-4 text-emerald-400">
                  Database-level <code>UNIQUE(session_id, student_id)</code> constraint prevents multiple check-ins.
                </td>
                <td className="py-3 px-4 text-right text-emerald-400 font-bold">Zero</td>
              </tr>
              <tr>
                <td className="py-3 px-4 font-bold text-white">Hallway Loitering</td>
                <td className="py-3 px-4">Student stands in hallway outside classroom door to mark attendance.</td>
                <td className="py-3 px-4 text-emerald-400">
                  RSSI Cutoff Threshold (-78 dBm) enforces that student must be within ~7-8m lecture hall boundary.
                </td>
                <td className="py-3 px-4 text-right text-teal-400 font-bold">Low</td>
              </tr>
              <tr>
                <td className="py-3 px-4 font-bold text-white">Real-Time Relay Attack</td>
                <td className="py-3 px-4">
                  Colleague in classroom streams live BLE packet over cellular WebSocket to absent student at home in &lt; 5 seconds.
                </td>
                <td className="py-3 px-4 text-amber-400">
                  Client IP geolocation subnet checks, one phone account binding, and instructor manual roll-call audits.
                </td>
                <td className="py-3 px-4 text-right text-amber-400 font-bold">Medium (Requires collusion)</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
