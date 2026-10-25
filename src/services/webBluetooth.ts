// Web Bluetooth API Integration and Permission Management Service

// Ambient type augmentation for browsers supporting Web Bluetooth API
declare global {
  interface Navigator {
    bluetooth?: {
      getAvailability?: () => Promise<boolean>;
      requestDevice: (options: {
        acceptAllDevices?: boolean;
        filters?: Array<{
          name?: string;
          namePrefix?: string;
          services?: Array<string | number>;
        }>;
        optionalServices?: Array<string | number>;
      }) => Promise<any>;
      getDevices?: () => Promise<any[]>;
    };
  }
}

export interface BluetoothDiagnosticState {
  isSupported: boolean;
  isSecureContext: boolean;
  isIframe: boolean;
  availability: boolean | null; // null if unknown, true/false if checked
  permissionStatus: 'unasked' | 'prompting' | 'granted' | 'denied' | 'unsupported' | 'iframe_blocked';
  connectedDevice: {
    id: string;
    name: string;
    connected: boolean;
  } | null;
  lastError: string | null;
  errorType?: 'SecurityError' | 'NotFoundError' | 'NotAllowedError' | 'NotSupportedError' | 'Unknown';
}

export class WebBluetoothService {
  private static instance: WebBluetoothService;
  private state: BluetoothDiagnosticState = {
    isSupported: typeof navigator !== 'undefined' && 'bluetooth' in navigator,
    isSecureContext: typeof window !== 'undefined' && window.isSecureContext,
    isIframe: typeof window !== 'undefined' && window.self !== window.top,
    availability: null,
    permissionStatus: 'unasked',
    connectedDevice: null,
    lastError: null,
  };

  private listeners: Array<(state: BluetoothDiagnosticState) => void> = [];

  private constructor() {
    this.checkInitialSupport();
  }

  public static getInstance(): WebBluetoothService {
    if (!WebBluetoothService.instance) {
      WebBluetoothService.instance = new WebBluetoothService();
    }
    return WebBluetoothService.instance;
  }

  public getState(): BluetoothDiagnosticState {
    return { ...this.state };
  }

  public subscribe(callback: (state: BluetoothDiagnosticState) => void): () => void {
    this.listeners.push(callback);
    callback(this.getState());
    return () => {
      this.listeners = this.listeners.filter((l) => l !== callback);
    };
  }

  private notify() {
    const currentState = this.getState();
    this.listeners.forEach((l) => l(currentState));
  }

  private async checkInitialSupport() {
    if (typeof navigator === 'undefined') return;

    const nav = navigator as any;
    const hasBluetooth = typeof nav.bluetooth !== 'undefined';
    this.state.isSupported = hasBluetooth;
    this.state.isSecureContext = window.isSecureContext;
    this.state.isIframe = window.self !== window.top;

    if (!hasBluetooth) {
      this.state.permissionStatus = 'unsupported';
      this.notify();
      return;
    }

    try {
      if (nav.bluetooth && typeof nav.bluetooth.getAvailability === 'function') {
        const isAvailable = await nav.bluetooth.getAvailability();
        this.state.availability = isAvailable;
      }
    } catch (e) {
      // getAvailability can throw inside certain iframes
      console.warn('Bluetooth getAvailability check warning:', e);
    }
    this.notify();
  }

  /**
   * Triggers the native browser Bluetooth permission prompt & device selector modal.
   * MUST be invoked directly from a user gesture (e.g. click event handler).
   */
  public async requestBluetoothAccess(options?: {
    customServiceName?: string;
  }): Promise<{ success: boolean; device?: any; error?: string }> {
    if (!this.state.isSupported) {
      this.state.permissionStatus = 'unsupported';
      this.state.lastError =
        'Web Bluetooth is not supported in this browser. Please use Google Chrome, Microsoft Edge, or Samsung Internet on a device with Bluetooth enabled.';
      this.state.errorType = 'NotSupportedError';
      this.notify();
      return { success: false, error: this.state.lastError };
    }

    this.state.permissionStatus = 'prompting';
    this.state.lastError = null;
    this.notify();

    try {
      const nav = navigator as any;
      // Standard services that many BLE peripherals expose
      const optionalServices = [
        'battery_service',
        'device_information',
        'generic_access',
        // Common standard 16-bit UUID representations
        '0000180f-0000-1000-8000-00805f9b34fb', // Battery Service
        '0000180a-0000-1000-8000-00805f9b34fb', // Device Information
        '0000fd2a-0000-1000-8000-00805f9b34fb', // PulseBeacon custom service
      ];

      // Native browser prompt invocation:
      const device = await nav.bluetooth.requestDevice({
        acceptAllDevices: true,
        optionalServices,
      });

      this.state.permissionStatus = 'granted';
      this.state.connectedDevice = {
        id: device.id,
        name: device.name || 'Unnamed BLE Device',
        connected: device.gatt?.connected || false,
      };
      this.state.lastError = null;
      this.notify();

      // Listen for disconnects
      if (device.addEventListener) {
        device.addEventListener('gattserverdisconnected', () => {
          if (this.state.connectedDevice && this.state.connectedDevice.id === device.id) {
            this.state.connectedDevice.connected = false;
            this.notify();
          }
        });
      }

      return { success: true, device };
    } catch (err: any) {
      const errorName = err?.name || '';
      const errorMessage = err?.message || String(err);
      this.state.lastError = errorMessage;

      if (errorName === 'SecurityError') {
        this.state.permissionStatus = 'iframe_blocked';
        this.state.errorType = 'SecurityError';
      } else if (errorName === 'NotFoundError') {
        // User closed or cancelled the device chooser dialog, or no devices matched
        this.state.permissionStatus = 'unasked';
        this.state.errorType = 'NotFoundError';
      } else if (errorName === 'NotAllowedError') {
        this.state.permissionStatus = 'denied';
        this.state.errorType = 'NotAllowedError';
      } else {
        this.state.permissionStatus = 'denied';
        this.state.errorType = 'Unknown';
      }

      this.notify();
      return { success: false, error: errorMessage };
    }
  }

  /**
   * Disconnects or resets current paired device state in memory
   */
  public disconnect() {
    this.state.connectedDevice = null;
    this.state.permissionStatus = 'unasked';
    this.state.lastError = null;
    this.notify();
  }
}

export const webBluetooth = WebBluetoothService.getInstance();
