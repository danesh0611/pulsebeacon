import React, { useState } from 'react';
import {
  Smartphone,
  ShieldCheck,
  Radio,
  Cpu,
  Terminal,
  Download,
  CheckCircle2,
  AlertTriangle,
  FolderTree,
  Code2,
  Copy,
  ExternalLink,
  Layers,
  Sparkles
} from 'lucide-react';

export const AndroidAppView: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'overview' | 'permissions' | 'build-guide' | 'code'>('overview');
  const [copiedText, setCopiedText] = useState<string | null>(null);

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedText(id);
    setTimeout(() => setCopiedText(null), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-emerald-950/60 via-slate-900 to-indigo-950/60 border border-emerald-500/30 rounded-2xl p-6 shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 bottom-0 w-96 bg-gradient-to-l from-emerald-500/10 to-transparent pointer-events-none" />
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
          <div className="space-y-2 max-w-2xl">
            <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-semibold border border-emerald-500/30">
              <Smartphone className="w-3.5 h-3.5" />
              <span>Native Android App Included</span>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
              Native Android BLE Companion App
            </h1>
            <p className="text-sm text-slate-300 leading-relaxed">
              Unlike web browsers that restrict background scanning and peripheral advertising, the included
              <span className="text-emerald-400 font-semibold"> native Kotlin + Jetpack Compose app</span> has 100% direct hardware access,
              automatically triggers the Android system permission popups, broadcasts rolling HMAC beacons, and scans nearby classrooms.
            </p>
          </div>

          <div className="flex flex-wrap sm:flex-nowrap gap-3">
            <a
              href="#build-guide"
              onClick={() => setActiveTab('build-guide')}
              className="flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-sm transition-all shadow-lg shadow-emerald-600/30 cursor-pointer"
            >
              <Terminal className="w-4 h-4" />
              <span>How to Build APK</span>
            </a>
            <button
              onClick={() => setActiveTab('code')}
              className="flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-sm font-medium transition-all cursor-pointer"
            >
              <Code2 className="w-4 h-4" />
              <span>View Source Files</span>
            </button>
          </div>
        </div>
      </div>

      {/* Navigation Sub-Tabs */}
      <div className="flex border-b border-slate-800 space-x-2">
        <button
          onClick={() => setActiveTab('overview')}
          className={`flex items-center space-x-2 pb-3 px-3 text-sm font-medium border-b-2 transition-all cursor-pointer ${
            activeTab === 'overview'
              ? 'border-emerald-500 text-emerald-400'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>App Architecture</span>
        </button>
        <button
          onClick={() => setActiveTab('permissions')}
          className={`flex items-center space-x-2 pb-3 px-3 text-sm font-medium border-b-2 transition-all cursor-pointer ${
            activeTab === 'permissions'
              ? 'border-emerald-500 text-emerald-400'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <ShieldCheck className="w-4 h-4" />
          <span>Android Permissions Flow</span>
        </button>
        <button
          onClick={() => setActiveTab('build-guide')}
          className={`flex items-center space-x-2 pb-3 px-3 text-sm font-medium border-b-2 transition-all cursor-pointer ${
            activeTab === 'build-guide'
              ? 'border-emerald-500 text-emerald-400'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Terminal className="w-4 h-4" />
          <span>Build & Run in Android Studio</span>
        </button>
        <button
          onClick={() => setActiveTab('code')}
          className={`flex items-center space-x-2 pb-3 px-3 text-sm font-medium border-b-2 transition-all cursor-pointer ${
            activeTab === 'code'
              ? 'border-emerald-500 text-emerald-400'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Code2 className="w-4 h-4" />
          <span>Source Code Inspector</span>
        </button>
      </div>

      {/* Tab 1: Overview & Web vs App Comparison */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Comparison Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Web Limitations */}
            <div className="bg-slate-900/80 border border-amber-500/30 rounded-2xl p-6 relative">
              <div className="flex items-center space-x-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center border border-amber-500/30">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-semibold text-white">Web Browser (W3C Web Bluetooth)</h3>
                  <p className="text-xs text-amber-400">Strict sandboxing & spec limitations</p>
                </div>
              </div>
              <ul className="space-y-3 text-xs text-slate-300">
                <li className="flex items-start space-x-2">
                  <span className="text-rose-400 font-bold">✕</span>
                  <span><strong>No automatic permission prompt:</strong> Browsers forbid asking permissions on page load without manual button click.</span>
                </li>
                <li className="flex items-start space-x-2">
                  <span className="text-rose-400 font-bold">✕</span>
                  <span><strong>Cannot advertise (Broadcast):</strong> Web Bluetooth does NOT support GATT Peripheral mode or BLE broadcasting. Instructors cannot beacon from a website.</span>
                </li>
                <li className="flex items-start space-x-2">
                  <span className="text-rose-400 font-bold">✕</span>
                  <span><strong>Zero iOS Safari support:</strong> Apple completely disables Web Bluetooth API in Safari on iPhone/iPad.</span>
                </li>
                <li className="flex items-start space-x-2">
                  <span className="text-rose-400 font-bold">✕</span>
                  <span><strong>Iframe sandbox blocks:</strong> Cloud preview windows block `navigator.bluetooth` without explicit iframe permissions policy.</span>
                </li>
              </ul>
            </div>

            {/* Native Android App Advantage */}
            <div className="bg-slate-900/80 border border-emerald-500/30 rounded-2xl p-6 relative">
              <div className="flex items-center space-x-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/30">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-semibold text-white">Native Android App (`/android`)</h3>
                  <p className="text-xs text-emerald-400">Full hardware access & OS system dialogs</p>
                </div>
              </div>
              <ul className="space-y-3 text-xs text-slate-300">
                <li className="flex items-start space-x-2">
                  <span className="text-emerald-400 font-bold">✓</span>
                  <span><strong>Native System Permission Dialog:</strong> Automatically asks the user for "Nearby Devices / Bluetooth" permissions on app launch.</span>
                </li>
                <li className="flex items-start space-x-2">
                  <span className="text-emerald-400 font-bold">✓</span>
                  <span><strong>Full BLE Peripheral Advertising:</strong> Faculty phones can broadcast the 20-byte rolling token via `BluetoothLeAdvertiser`.</span>
                </li>
                <li className="flex items-start space-x-2">
                  <span className="text-emerald-400 font-bold">✓</span>
                  <span><strong>Continuous Low-Latency Scanning:</strong> Scans BLE channels using `ScanSettings.SCAN_MODE_LOW_LATENCY` with instant RSSI capture.</span>
                </li>
                <li className="flex items-start space-x-2">
                  <span className="text-emerald-400 font-bold">✓</span>
                  <span><strong>Works 100% reliably in real classrooms:</strong> No browser incompatibilities or cloud sandbox blocks.</span>
                </li>
              </ul>
            </div>
          </div>

          {/* Android Architecture Highlights */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6">
            <h3 className="text-base font-semibold text-white mb-4 flex items-center space-x-2">
              <Cpu className="w-5 h-5 text-indigo-400" />
              <span>Native App Modules in Repository (`/android/app/src/main`)</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800">
                <div className="flex items-center space-x-2 text-indigo-400 font-semibold text-sm mb-1">
                  <Radio className="w-4 h-4" />
                  <span>BleAdvertiser.kt</span>
                </div>
                <p className="text-xs text-slate-400">
                  Faculty mode: Encodes rolling HMAC-SHA256 packets and advertises under Service UUID 0xFD2A every 30 seconds.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800">
                <div className="flex items-center space-x-2 text-emerald-400 font-semibold text-sm mb-1">
                  <Smartphone className="w-4 h-4" />
                  <span>BleScanner.kt</span>
                </div>
                <p className="text-xs text-slate-400">
                  Student mode: Hardware scanner with hardware UUID filters, calculating real-time log-distance path loss distance.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800">
                <div className="flex items-center space-x-2 text-amber-400 font-semibold text-sm mb-1">
                  <ShieldCheck className="w-4 h-4" />
                  <span>MainActivity.kt</span>
                </div>
                <p className="text-xs text-slate-400">
                  Permission engine: Requests Android 12+ `BLUETOOTH_SCAN` and `BLUETOOTH_ADVERTISE` via `ActivityResultContracts`.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800">
                <div className="flex items-center space-x-2 text-purple-400 font-semibold text-sm mb-1">
                  <Sparkles className="w-4 h-4" />
                  <span>Jetpack Compose UI</span>
                </div>
                <p className="text-xs text-slate-400">
                  Declarative modern UI with animated radar sweep, dark mode palette, and real-time attendance verification feedback.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Android Permissions Flow */}
      {activeTab === 'permissions' && (
        <div className="space-y-6">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
            <h3 className="text-base font-semibold text-white mb-2 flex items-center space-x-2">
              <ShieldCheck className="w-5 h-5 text-emerald-400" />
              <span>How Bluetooth Permission Works on Android (Android 12 to 15)</span>
            </h3>
            <p className="text-xs text-slate-400 mb-6">
              In Google Android API 31+ (Android 12, 13, 14, and 15), Bluetooth permissions are classified under "Nearby Devices" and no longer require location tracking.
            </p>

            {/* Permission Flow Steps */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="p-5 rounded-xl bg-slate-950 border border-slate-800 flex flex-col justify-between">
                <div>
                  <div className="w-8 h-8 rounded-lg bg-indigo-500/20 text-indigo-400 font-bold flex items-center justify-center text-sm mb-3">
                    1
                  </div>
                  <h4 className="text-sm font-semibold text-white mb-1">App Launch Detection</h4>
                  <p className="text-xs text-slate-400">
                    `MainActivity.kt` executes `checkPermissions()` on startup. If any required permission is missing, it immediately invokes `permissionLauncher.launch()`.
                  </p>
                </div>
                <div className="mt-4 p-2.5 rounded-lg bg-slate-900 border border-slate-800 font-mono text-[11px] text-indigo-300">
                  LaunchedEffect(Unit) &#123; launcher.launch() &#125;
                </div>
              </div>

              <div className="p-5 rounded-xl bg-slate-950 border border-emerald-500/30 flex flex-col justify-between">
                <div>
                  <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 font-bold flex items-center justify-center text-sm mb-3">
                    2
                  </div>
                  <h4 className="text-sm font-semibold text-white mb-1">System Permission Dialog</h4>
                  <p className="text-xs text-slate-400">
                    The Android OS displays the standard system popup: <strong>"Allow PulseBeacon to find, connect to, and determine the relative position of nearby devices?"</strong>
                  </p>
                </div>
                <div className="mt-4 p-2.5 rounded-lg bg-emerald-950/40 border border-emerald-500/30 text-[11px] text-emerald-300">
                  ✓ Tap "Allow" once to grant permanent hardware scanning
                </div>
              </div>

              <div className="p-5 rounded-xl bg-slate-950 border border-slate-800 flex flex-col justify-between">
                <div>
                  <div className="w-8 h-8 rounded-lg bg-purple-500/20 text-purple-400 font-bold flex items-center justify-center text-sm mb-3">
                    3
                  </div>
                  <h4 className="text-sm font-semibold text-white mb-1">Direct BLE Scanning</h4>
                  <p className="text-xs text-slate-400">
                    Once granted, `BleScanner` activates `BluetoothLeScanner` with high accuracy. No further user confirmation or browser clicks are ever required!
                  </p>
                </div>
                <div className="mt-4 p-2.5 rounded-lg bg-slate-900 border border-slate-800 font-mono text-[11px] text-purple-300">
                  scanner.startScan(filters, settings, cb)
                </div>
              </div>
            </div>

            {/* Manifest Excerpt */}
            <div className="mt-6">
              <h4 className="text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                Declared in `/android/app/src/main/AndroidManifest.xml`:
              </h4>
              <div className="bg-slate-950 rounded-xl p-4 border border-slate-800 font-mono text-xs text-slate-300 overflow-x-auto">
                <span className="text-slate-500">&lt;!-- Modern Bluetooth Permissions (Android 12+ / API 31+) --&gt;</span><br />
                <span className="text-indigo-400">&lt;uses-permission</span> android:name=<span className="text-emerald-400">"android.permission.BLUETOOTH_SCAN"</span> android:usesPermissionFlags=<span className="text-amber-400">"neverForLocation"</span> /&gt;<br />
                <span className="text-indigo-400">&lt;uses-permission</span> android:name=<span className="text-emerald-400">"android.permission.BLUETOOTH_ADVERTISE"</span> /&gt;<br />
                <span className="text-indigo-400">&lt;uses-permission</span> android:name=<span className="text-emerald-400">"android.permission.BLUETOOTH_CONNECT"</span> /&gt;<br />
                <span className="text-indigo-400">&lt;uses-permission</span> android:name=<span className="text-emerald-400">"android.permission.ACCESS_FINE_LOCATION"</span> android:maxSdkVersion=<span className="text-amber-400">"30"</span> /&gt;
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 3: Build & Run in Android Studio */}
      {activeTab === 'build-guide' && (
        <div className="space-y-6" id="build-guide">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
            <h3 className="text-base font-semibold text-white mb-2 flex items-center space-x-2">
              <Terminal className="w-5 h-5 text-indigo-400" />
              <span>How to Build the Android APK</span>
            </h3>
            <p className="text-xs text-slate-400 mb-6">
              The full Android project is ready to compile with Gradle. Follow these steps to build the APK or install it directly to any Android smartphone.
            </p>

            <div className="space-y-6">
              {/* Step 1 */}
              <div className="flex items-start space-x-4">
                <div className="w-8 h-8 rounded-full bg-indigo-600 text-white font-bold flex items-center justify-center shrink-0 text-sm mt-0.5">
                  1
                </div>
                <div className="space-y-2 flex-1">
                  <h4 className="text-sm font-semibold text-white">Open the Project in Android Studio</h4>
                  <p className="text-xs text-slate-300">
                    Launch Android Studio, select <strong className="text-slate-100">"Open"</strong>, and choose the <code className="text-emerald-400 bg-slate-950 px-2 py-0.5 rounded border border-slate-800">/android</code> directory from this repository.
                  </p>
                </div>
              </div>

              {/* Step 2 */}
              <div className="flex items-start space-x-4">
                <div className="w-8 h-8 rounded-full bg-indigo-600 text-white font-bold flex items-center justify-center shrink-0 text-sm mt-0.5">
                  2
                </div>
                <div className="space-y-2 flex-1">
                  <h4 className="text-sm font-semibold text-white">Command Line / Terminal Build</h4>
                  <p className="text-xs text-slate-300">
                    If you prefer building from the terminal, run the following Gradle command inside the <code className="text-emerald-400 bg-slate-950 px-2 py-0.5 rounded border border-slate-800">android/</code> directory:
                  </p>
                  <div className="relative bg-slate-950 border border-slate-800 rounded-xl p-3 font-mono text-xs text-emerald-400 flex items-center justify-between">
                    <span>./gradlew assembleDebug</span>
                    <button
                      onClick={() => copyToClipboard('./gradlew assembleDebug', 'cmd1')}
                      className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-[11px] flex items-center space-x-1 cursor-pointer"
                    >
                      <Copy className="w-3 h-3" />
                      <span>{copiedText === 'cmd1' ? 'Copied!' : 'Copy'}</span>
                    </button>
                  </div>
                  <p className="text-xs text-slate-400">
                    The compiled APK file will be generated at: <br />
                    <code className="text-indigo-300 bg-slate-950 px-2 py-0.5 rounded border border-slate-800">android/app/build/outputs/apk/debug/app-debug.apk</code>
                  </p>
                </div>
              </div>

              {/* Step 3 */}
              <div className="flex items-start space-x-4">
                <div className="w-8 h-8 rounded-full bg-indigo-600 text-white font-bold flex items-center justify-center shrink-0 text-sm mt-0.5">
                  3
                </div>
                <div className="space-y-2 flex-1">
                  <h4 className="text-sm font-semibold text-white">Install Directly to Your Phone</h4>
                  <p className="text-xs text-slate-300">
                    Connect your phone via USB with USB Debugging enabled, and run:
                  </p>
                  <div className="relative bg-slate-950 border border-slate-800 rounded-xl p-3 font-mono text-xs text-emerald-400 flex items-center justify-between">
                    <span>./gradlew installDebug</span>
                    <button
                      onClick={() => copyToClipboard('./gradlew installDebug', 'cmd2')}
                      className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-[11px] flex items-center space-x-1 cursor-pointer"
                    >
                      <Copy className="w-3 h-3" />
                      <span>{copiedText === 'cmd2' ? 'Copied!' : 'Copy'}</span>
                    </button>
                  </div>
                  <p className="text-xs text-slate-400">
                    Or simply transfer the <code className="text-slate-200">app-debug.apk</code> to students/faculty to install directly on their phones.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 4: Code Inspector */}
      {activeTab === 'code' && (
        <div className="space-y-6">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
            <h3 className="text-base font-semibold text-white mb-2 flex items-center space-x-2">
              <FolderTree className="w-5 h-5 text-indigo-400" />
              <span>Native Android Code Structure in this Workspace</span>
            </h3>
            <p className="text-xs text-slate-400 mb-6">
              All files are already present and ready in the project. Here is where the core logic lives:
            </p>

            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800">
                <div className="flex items-center justify-between mb-2">
                  <div className="font-mono text-xs font-semibold text-emerald-400">
                    android/app/src/main/java/com/pulsebeacon/attendance/MainActivity.kt
                  </div>
                  <span className="text-[11px] text-slate-400">112 lines • Permissions & Navigation</span>
                </div>
                <p className="text-xs text-slate-300">
                  Initializes Bluetooth managers, registers the <code className="text-indigo-300">ActivityResultContracts.RequestMultiplePermissions</code> launcher, and triggers the Android system permission prompt.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800">
                <div className="flex items-center justify-between mb-2">
                  <div className="font-mono text-xs font-semibold text-indigo-400">
                    android/app/src/main/java/com/pulsebeacon/attendance/ble/BleScanner.kt
                  </div>
                  <span className="text-[11px] text-slate-400">177 lines • Low-Latency Scanner</span>
                </div>
                <p className="text-xs text-slate-300">
                  Activates <code className="text-indigo-300">BluetoothLeScanner</code> with service UUID filter <code className="text-indigo-300">0xFD2A</code> and calculates proximity distance using the log-distance path loss formula: <code className="text-emerald-400">d = 10^((TxPower - RSSI) / (10 * n))</code>.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800">
                <div className="flex items-center justify-between mb-2">
                  <div className="font-mono text-xs font-semibold text-amber-400">
                    android/app/src/main/java/com/pulsebeacon/attendance/ble/BleAdvertiser.kt
                  </div>
                  <span className="text-[11px] text-slate-400">205 lines • Rotating Beacon Peripheral</span>
                </div>
                <p className="text-xs text-slate-300">
                  Implements <code className="text-indigo-300">BluetoothLeAdvertiser</code> for instructors, re-calculating the 20-byte HMAC-SHA256 frame and advertising payload every 30-second epoch.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800">
                <div className="flex items-center justify-between mb-2">
                  <div className="font-mono text-xs font-semibold text-purple-400">
                    android/app/src/main/java/com/pulsebeacon/attendance/ui/screens/student/BleScanScreen.kt
                  </div>
                  <span className="text-[11px] text-slate-400">335 lines • Jetpack Compose UI</span>
                </div>
                <p className="text-xs text-slate-300">
                  Real-time pulse animation, radar view, live RSSI dBm readout, distance cutoff indicators, and automatic check-in submission button.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
