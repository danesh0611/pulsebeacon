export type UserRole = 'STUDENT' | 'FACULTY' | 'ADMIN';

export type SessionStatus = 'ACTIVE' | 'EXPIRED' | 'CLOSED';

export type AttendanceStatus = 'VERIFIED' | 'REJECTED' | 'MANUAL_OVERRIDE';

export interface User {
  id: number;
  email: string;
  fullName: string;
  role: UserRole;
  identifierCode: string; // Reg No for Student, Emp Code for Faculty
  department: string;
  semester?: number;
  avatarUrl?: string;
}

export interface Course {
  id: number;
  code: string;
  title: string;
  department: string;
  credits: number;
  facultyId?: number;
  facultyName: string;
  enrolledStudentIds: number[];
  roomNumber?: string;
}

export interface AttendanceSession {
  id: number;
  sessionCode: string;
  courseId: number;
  courseCode: string;
  courseTitle: string;
  facultyId: number;
  facultyName: string;
  roomNumber: string;
  durationMinutes: number;
  startTime: string; // ISO
  endTime: string;   // ISO
  status: SessionStatus;
  bleServiceUuid: string;
  bleSessionSecret: string;
  bleSalt: string;
  rssiThreshold: number; // e.g. -78 dBm
  totalEnrolled: number;
  totalPresent: number;
}

export interface AttendanceRecord {
  id: number;
  sessionId: number;
  courseCode: string;
  courseTitle: string;
  studentId: number;
  studentName: string;
  registrationNumber: string;
  department: string;
  checkInTime: string;
  status: AttendanceStatus;
  verificationMethod: string;
  observedRssi: number;
  estimatedDistanceM: number;
  overrideReason?: string;
  overrideByFacultyName?: string;
}

export interface AuditLogItem {
  id: number;
  action: string;
  performedByName: string;
  targetEntity: string;
  targetId: string;
  details: string;
  ipAddress: string;
  timestamp: string;
  severity: 'INFO' | 'WARNING' | 'ALERT';
}

export interface BleBeaconPacket {
  serviceUuid: string;
  sessionTagHex: string;
  windowIndex: number;
  saltHex: string;
  hmacHex: string;
  fullPayloadHex: string;
  rawAdFrameHex: string;
}
