/**
 * Cryptographic operations and RF path-loss modeling matching the backend Python service.
 */

export const BLE_CONSTANTS = {
  SERVICE_UUID_16: '0xFD2A',
  SERVICE_UUID_128: '0000FD2A-0000-1000-8000-00805F9B34FB',
  ROTATING_WINDOW_SECONDS: 30,
  DEFAULT_TX_POWER_1M: -59.0, // dBm
  PATH_LOSS_EXPONENT: 2.4,    // Classroom propagation
  DEFAULT_RSSI_THRESHOLD: -78.0, // dBm
};

/**
 * Calculates discrete time window index.
 */
export function getEpochWindow(timestampMs?: number): number {
  const ts = (timestampMs ?? Date.now()) / 1000;
  return Math.floor(ts / BLE_CONSTANTS.ROTATING_WINDOW_SECONDS);
}

/**
 * Calculates distance from RSSI using log-distance path loss:
 * RSSI = -10 * n * log10(d) + A
 * d = 10 ^ ((A - RSSI) / (10 * n))
 */
export function calculateDistance(
  rssi: number,
  txPower1m: number = BLE_CONSTANTS.DEFAULT_TX_POWER_1M,
  pathLossExp: number = BLE_CONSTANTS.PATH_LOSS_EXPONENT
): number {
  if (rssi >= 0) return 0.1;
  const ratio = (txPower1m - rssi) / (10.0 * pathLossExp);
  const distance = Math.pow(10.0, ratio);
  return Math.round(distance * 100) / 100;
}

/**
 * Calculates RSSI from distance:
 * RSSI = A - 10 * n * log10(d)
 */
export function calculateRssiFromDistance(
  distanceM: number,
  txPower1m: number = BLE_CONSTANTS.DEFAULT_TX_POWER_1M,
  pathLossExp: number = BLE_CONSTANTS.PATH_LOSS_EXPONENT
): number {
  const d = Math.max(0.1, distanceM);
  const rssi = txPower1m - 10.0 * pathLossExp * Math.log10(d);
  return Math.round(rssi * 10) / 10;
}

// Simple fast SHA256 & HMAC for browser simulation and demonstration
async function sha256Hex(text: string): Promise<string> {
  const enc = new TextEncoder();
  const data = enc.encode(text);
  const hashBuf = await crypto.subtle.digest('SHA-256', data);
  const hashArr = Array.from(new Uint8Array(hashBuf));
  return hashArr.map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Computes 20-byte BLE advertising payload hex:
 * [0..3]: Session Tag (SHA256(sessionCode)[0..3]) -> 4 bytes
 * [4..7]: Window Index (uint32 big-endian) -> 4 bytes
 * [8..11]: Salt -> 4 bytes
 * [12..19]: HMAC-SHA256 slice -> 8 bytes
 */
export async function generateAdvertisingPayload(
  sessionCode: string,
  sessionSecret: string,
  saltHex: string,
  windowIndex?: number
): Promise<{
  payloadHex: string;
  sessionTagHex: string;
  windowHex: string;
  saltHex: string;
  hmacHex: string;
  windowIndex: number;
}> {
  const winIdx = windowIndex ?? getEpochWindow();

  // 1. Session Tag (4 bytes)
  const codeHash = await sha256Hex(sessionCode);
  const sessionTagHex = codeHash.substring(0, 8).toUpperCase();

  // 2. Window Index (4 bytes, 8 hex chars)
  const windowHex = (winIdx >>> 0).toString(16).padStart(8, '0').toUpperCase();

  // 3. Salt (4 bytes)
  const cleanSalt = (saltHex.replace(/[^0-9A-Fa-f]/g, '').padEnd(8, '0')).substring(0, 8).toUpperCase();

  // 4. HMAC over (sessionTag + window + salt)
  const messageStr = sessionTagHex + windowHex + cleanSalt;
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    enc.encode(sessionSecret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(messageStr));
  const sigArr = Array.from(new Uint8Array(sig));
  const fullSigHex = sigArr.map(b => b.toString(16).padStart(2, '0')).join('').toUpperCase();
  const hmacHex = fullSigHex.substring(0, 16); // 8 bytes = 16 hex chars

  const payloadHex = sessionTagHex + windowHex + cleanSalt + hmacHex;

  return {
    payloadHex,
    sessionTagHex,
    windowHex,
    saltHex: cleanSalt,
    hmacHex,
    windowIndex: winIdx,
  };
}

/**
 * Validates a received 20-byte BLE advertisement payload against session secrets.
 */
export async function verifyAdvertisingPayload(
  payloadHex: string,
  sessionCode: string,
  sessionSecret: string,
  saltHex: string,
  toleranceWindows: number = 1
): Promise<{ isValid: boolean; reason: string; windowIndex: number }> {
  const clean = payloadHex.trim().toUpperCase();
  if (clean.length !== 40) {
    return { isValid: false, reason: `Invalid payload length: expected 40 hex chars (20 bytes), got ${clean.length}`, windowIndex: 0 };
  }

  const rxSessionTag = clean.substring(0, 8);
  const rxWindowHex = clean.substring(8, 16);
  const rxWindow = parseInt(rxWindowHex, 16);
  const rxSalt = clean.substring(16, 24);
  const rxHmac = clean.substring(24, 40);

  // Check tag
  const codeHash = await sha256Hex(sessionCode);
  const expectedTag = codeHash.substring(0, 8).toUpperCase();
  if (rxSessionTag !== expectedTag) {
    return { isValid: false, reason: 'Session tag mismatch. Advertised beacon belongs to another class.', windowIndex: rxWindow };
  }

  // Check window drift
  const currentWindow = getEpochWindow();
  const drift = Math.abs(currentWindow - rxWindow);
  if (drift > toleranceWindows) {
    return { isValid: false, reason: `Rolling challenge expired. Token is ${drift} window(s) old (> 45s).`, windowIndex: rxWindow };
  }

  // Verify HMAC
  const messageStr = rxSessionTag + rxWindowHex + rxSalt;
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    enc.encode(sessionSecret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(messageStr));
  const sigArr = Array.from(new Uint8Array(sig));
  const expectedHmac = sigArr.map(b => b.toString(16).padStart(2, '0')).join('').toUpperCase().substring(0, 16);

  if (rxHmac !== expectedHmac) {
    return { isValid: false, reason: 'HMAC signature verification failed. Beacon packet was spoofed or altered.', windowIndex: rxWindow };
  }

  return { isValid: true, reason: 'Cryptographic beacon challenge passed.', windowIndex: rxWindow };
}
