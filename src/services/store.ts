import { User, Course, AttendanceSession, AttendanceRecord, AuditLogItem } from '../types';
import { generateAdvertisingPayload, verifyAdvertisingPayload, calculateDistance, BLE_CONSTANTS } from './crypto';

const STORAGE_KEY = 'pulsebeacon_attendance_store_v2';

// Seed Initial Data
const SEED_USERS: User[] = [
  {
    id: 1,
    email: 'faculty@university.edu',
    fullName: 'Prof. Alan Turing',
    role: 'FACULTY',
    identifierCode: 'EMP-CS-0042',
    department: 'Computer Science & Engineering',
    avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120&auto=format&fit=crop&q=80',
  },
  {
    id: 2,
    email: 'student1@university.edu',
    fullName: 'Alex Rivera',
    role: 'STUDENT',
    identifierCode: 'CS2026-001',
    department: 'Computer Science & Engineering',
    semester: 6,
    avatarUrl: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=120&auto=format&fit=crop&q=80',
  },
  {
    id: 3,
    email: 'student2@university.edu',
    fullName: 'Elena Rostova',
    role: 'STUDENT',
    identifierCode: 'CS2026-002',
    department: 'Computer Science & Engineering',
    semester: 6,
  },
  {
    id: 4,
    email: 'student3@university.edu',
    fullName: 'Marcus Vance',
    role: 'STUDENT',
    identifierCode: 'CS2026-003',
    department: 'Computer Science & Engineering',
    semester: 6,
  },
  {
    id: 5,
    email: 'student4@university.edu',
    fullName: 'Priya Sharma',
    role: 'STUDENT',
    identifierCode: 'CS2026-004',
    department: 'Computer Science & Engineering',
    semester: 6,
  },
  {
    id: 7,
    email: 'ra2411003020197@srmist.edu.in',
    fullName: 'K S CHAKRADHAR DANESH',
    role: 'STUDENT',
    identifierCode: 'RA2411003020197',
    department: 'Computer Science & Engineering',
    semester: 4,
  },
  {
    id: 8,
    email: 'ra2411003020230@srmist.edu.in',
    fullName: 'AKHILESH',
    role: 'STUDENT',
    identifierCode: 'RA2411003020230',
    department: 'Computer Science & Engineering',
    semester: 4,
  },
  {
    id: 9,
    email: 'ra2411003020234@srmist.edu.in',
    fullName: 'P JASHWANTH',
    role: 'STUDENT',
    identifierCode: 'RA2411003020234',
    department: 'Computer Science & Engineering',
    semester: 4,
  },
  {
    id: 6,
    email: 'admin@university.edu',
    fullName: 'Dr. Sarah Jenkins (Registrar)',
    role: 'ADMIN',
    identifierCode: 'ADMIN-REG-01',
    department: 'Academic Affairs & Records',
    avatarUrl: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=120&auto=format&fit=crop&q=80',
  },
];

const SEED_COURSES: Course[] = [
  {
    id: 1,
    code: 'CS-401',
    title: 'Distributed Systems & Mobile BLE',
    department: 'Computer Science & Engineering',
    credits: 4,
    facultyId: 1,
    facultyName: 'Prof. Alan Turing',
    enrolledStudentIds: [2, 3, 4, 5, 7, 8, 9],
    roomNumber: 'Lab 304 (Wireless IoT Lab)',
  },
  {
    id: 2,
    code: 'CS-302',
    title: 'Operating Systems & Concurrency',
    department: 'Computer Science & Engineering',
    credits: 3,
    facultyId: 1,
    facultyName: 'Prof. Alan Turing',
    enrolledStudentIds: [2, 3],
    roomNumber: 'Auditorium B',
  },
  {
    id: 3,
    code: 'CS-480',
    title: 'Network Security & Applied Cryptography',
    department: 'Computer Science & Engineering',
    credits: 3,
    facultyId: 6,
    facultyName: 'Dr. Sarah Jenkins (Registrar)',
    enrolledStudentIds: [2, 4, 5],
    roomNumber: 'Seminar Hall 1',
  },
  {
    id: 4,
    code: 'EE-205',
    title: 'Embedded Sensors & RF Communications',
    department: 'Electrical Engineering',
    credits: 4,
    facultyId: 1,
    facultyName: 'Prof. Alan Turing',
    enrolledStudentIds: [3, 4],
    roomNumber: 'EE Core Lab 2',
  },
];

function initSeedSessions(): AttendanceSession[] {
  const now = new Date();
  const startTime = new Date(now.getTime() - 12 * 60 * 1000).toISOString();
  const endTime = new Date(now.getTime() + 38 * 60 * 1000).toISOString();

  return [
    {
      id: 101,
      sessionCode: 'SESS-CS401-LAB304',
      courseId: 1,
      courseCode: 'CS-401',
      courseTitle: 'Distributed Systems & Mobile BLE',
      facultyId: 1,
      facultyName: 'Prof. Alan Turing',
      roomNumber: 'Lab 304 (Wireless IoT Lab)',
      durationMinutes: 50,
      startTime,
      endTime,
      status: 'ACTIVE',
      bleServiceUuid: BLE_CONSTANTS.SERVICE_UUID_128,
      bleSessionSecret: 'pulsebeacon_ble_hmac_master_secret_key_8842',
      bleSalt: '9F28D1B4',
      rssiThreshold: -78.0,
      totalEnrolled: 32,
      totalPresent: 2,
    },
    {
      id: 100,
      sessionCode: 'SESS-CS302-LEC201',
      courseId: 2,
      courseCode: 'CS-302',
      courseTitle: 'Operating Systems & Concurrency',
      facultyId: 1,
      facultyName: 'Prof. Alan Turing',
      roomNumber: 'Auditorium B',
      durationMinutes: 60,
      startTime: new Date(now.getTime() - 86400000 * 2).toISOString(),
      endTime: new Date(now.getTime() - 86400000 * 2 + 3600000).toISOString(),
      status: 'CLOSED',
      bleServiceUuid: BLE_CONSTANTS.SERVICE_UUID_128,
      bleSessionSecret: 'old_secret_key_abc',
      bleSalt: 'A1B2C3D4',
      rssiThreshold: -80.0,
      totalEnrolled: 35,
      totalPresent: 31,
    },
  ];
}

function initSeedRecords(): AttendanceRecord[] {
  const now = new Date();
  return [
    {
      id: 1001,
      sessionId: 101,
      courseCode: 'CS-401',
      courseTitle: 'Distributed Systems & Mobile BLE',
      studentId: 3,
      studentName: 'Elena Rostova',
      registrationNumber: 'CS2026-002',
      department: 'Computer Science & Engineering',
      checkInTime: new Date(now.getTime() - 10 * 60 * 1000).toISOString(),
      status: 'VERIFIED',
      verificationMethod: 'BLE_PROXIMITY_HMAC_WINDOW',
      observedRssi: -64.2,
      estimatedDistanceM: 1.48,
    },
    {
      id: 1002,
      sessionId: 101,
      courseCode: 'CS-401',
      courseTitle: 'Distributed Systems & Mobile BLE',
      studentId: 5,
      studentName: 'Priya Sharma',
      registrationNumber: 'CS2026-004',
      department: 'Computer Science & Engineering',
      checkInTime: new Date(now.getTime() - 6 * 60 * 1000).toISOString(),
      status: 'VERIFIED',
      verificationMethod: 'BLE_PROXIMITY_HMAC_WINDOW',
      observedRssi: -69.0,
      estimatedDistanceM: 2.35,
    },
    {
      id: 1003,
      sessionId: 100,
      courseCode: 'CS-302',
      courseTitle: 'Operating Systems & Concurrency',
      studentId: 2,
      studentName: 'Alex Rivera',
      registrationNumber: 'CS2026-001',
      department: 'Computer Science & Engineering',
      checkInTime: new Date(now.getTime() - 86400000 * 2 + 10 * 60000).toISOString(),
      status: 'VERIFIED',
      verificationMethod: 'BLE_PROXIMITY_HMAC_WINDOW',
      observedRssi: -66.5,
      estimatedDistanceM: 1.82,
    },
  ];
}

function initSeedAuditLogs(): AuditLogItem[] {
  const now = new Date();
  return [
    {
      id: 1,
      action: 'SYSTEM_BOOTSTRAP',
      performedByName: 'Dr. Sarah Jenkins (Registrar)',
      targetEntity: 'SYSTEM',
      targetId: 'NODE-01',
      details: 'PulseBeacon service initialized with BLE Service UUID 0xFD2A',
      ipAddress: '127.0.0.1',
      timestamp: new Date(now.getTime() - 60 * 60 * 1000).toISOString(),
      severity: 'INFO',
    },
    {
      id: 2,
      action: 'SESSION_CREATE',
      performedByName: 'Prof. Alan Turing',
      targetEntity: 'ATTENDANCE_SESSION',
      targetId: '101',
      details: 'Created active session SESS-CS401-LAB304 in Lab 304 with duration 50m and RSSI threshold -78 dBm',
      ipAddress: '192.168.1.140',
      timestamp: new Date(now.getTime() - 12 * 60 * 1000).toISOString(),
      severity: 'INFO',
    },
    {
      id: 3,
      action: 'CHECKIN_VERIFIED',
      performedByName: 'Elena Rostova (CS2026-002)',
      targetEntity: 'ATTENDANCE_RECORD',
      targetId: '1001',
      details: 'Verified proximity challenge at RSSI -64.2 dBm (~1.48m) with valid rolling HMAC token',
      ipAddress: '10.20.4.15',
      timestamp: new Date(now.getTime() - 10 * 60 * 1000).toISOString(),
      severity: 'INFO',
    },
    {
      id: 4,
      action: 'CHECKIN_VERIFIED',
      performedByName: 'Priya Sharma (CS2026-004)',
      targetEntity: 'ATTENDANCE_RECORD',
      targetId: '1002',
      details: 'Verified proximity challenge at RSSI -69.0 dBm (~2.35m)',
      ipAddress: '10.20.4.82',
      timestamp: new Date(now.getTime() - 6 * 60 * 1000).toISOString(),
      severity: 'INFO',
    },
  ];
}

interface AppStoreState {
  isAuthenticated: boolean;
  currentUser: User;
  users: User[];
  courses: Course[];
  sessions: AttendanceSession[];
  records: AttendanceRecord[];
  auditLogs: AuditLogItem[];
}

class AppStore {
  private state: AppStoreState;
  private listeners: Set<() => void> = new Set();

  constructor() {
    this.state = this.loadState();
  }

  private loadState(): AppStoreState {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        return {
          isAuthenticated: parsed.isAuthenticated === true,
          currentUser: parsed.currentUser || SEED_USERS[5], // Default to Admin
          users: parsed.users || SEED_USERS,
          courses: parsed.courses || SEED_COURSES,
          sessions: parsed.sessions || initSeedSessions(),
          records: parsed.records || initSeedRecords(),
          auditLogs: parsed.auditLogs || initSeedAuditLogs(),
        };
      }
    } catch (e) {
      console.warn('Failed to load local storage state:', e);
    }

    return {
      isAuthenticated: false,
      currentUser: SEED_USERS[5], // Admin
      users: SEED_USERS,
      courses: SEED_COURSES,
      sessions: initSeedSessions(),
      records: initSeedRecords(),
      auditLogs: initSeedAuditLogs(),
    };
  }

  private saveState() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.state));
    } catch (e) {
      console.warn('Failed to save to local storage:', e);
    }
    this.notify();
  }

  private notify() {
    this.listeners.forEach(fn => fn());
  }

  public subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  public getState(): AppStoreState {
    return this.state;
  }

  public login(emailOrId: string, password?: string): boolean {
    const clean = emailOrId.toLowerCase().trim();
    const user = this.state.users.find(
      u => u.email.toLowerCase() === clean || u.identifierCode.toLowerCase() === clean
    );
    if (user) {
      this.state.currentUser = user;
      this.state.isAuthenticated = true;
      this.addAuditLog(
        'USER_LOGIN',
        'AUTH',
        String(user.id),
        `Authenticated ${user.role} user ${user.fullName} (${user.identifierCode})`,
        'INFO'
      );
      this.saveState();
      return true;
    }
    return false;
  }

  public logout() {
    if (this.state.currentUser) {
      this.addAuditLog(
        'USER_LOGOUT',
        'AUTH',
        String(this.state.currentUser.id),
        `User ${this.state.currentUser.fullName} signed out`,
        'INFO'
      );
    }
    this.state.isAuthenticated = false;
    this.saveState();
  }

  public setCurrentUser(user: User) {
    this.state.currentUser = user;
    this.state.isAuthenticated = true;
    this.saveState();
  }

  public createUserByAdmin(data: {
    email: string;
    fullName: string;
    role: 'STUDENT' | 'FACULTY';
    identifierCode: string;
    department: string;
    semester?: number;
    designation?: string;
  }): User {
    // Check email uniqueness
    const existingEmail = this.state.users.find(u => u.email.toLowerCase() === data.email.toLowerCase().trim());
    if (existingEmail) {
      throw new Error(`User with email "${data.email}" already exists`);
    }

    // Check identifier uniqueness
    const cleanId = data.identifierCode.trim().toUpperCase();
    const existingId = this.state.users.find(u => u.identifierCode.toUpperCase() === cleanId);
    if (existingId) {
      throw new Error(`Identifier code "${cleanId}" is already assigned to ${existingId.fullName}`);
    }

    const newUser: User = {
      id: Date.now() + Math.floor(Math.random() * 1000),
      email: data.email.toLowerCase().trim(),
      fullName: data.fullName.trim(),
      role: data.role,
      identifierCode: cleanId,
      department: data.department.trim(),
      semester: data.role === 'STUDENT' ? (data.semester || 1) : undefined,
    };

    this.state.users.unshift(newUser);

    this.addAuditLog(
      'ADMIN_CREATE_USER',
      'USER',
      String(newUser.id),
      `Administrator ${this.state.currentUser?.fullName || 'Admin'} created new ${data.role} account for ${newUser.fullName} (${newUser.identifierCode})`,
      'INFO'
    );

    this.saveState();
    return newUser;
  }

  public deleteUserByAdmin(userId: number) {
    if (this.state.currentUser && this.state.currentUser.id === userId) {
      throw new Error('You cannot delete your own active administrator account');
    }

    const userToDelete = this.state.users.find(u => u.id === userId);
    if (!userToDelete) throw new Error('User not found');

    this.state.users = this.state.users.filter(u => u.id !== userId);

    this.addAuditLog(
      'ADMIN_DELETE_USER',
      'USER',
      String(userId),
      `Administrator deleted ${userToDelete.role} account ${userToDelete.fullName} (${userToDelete.email})`,
      'WARNING'
    );

    this.saveState();
  }

  // --- Class & Roster Management ---
  public createClass(data: {
    code: string;
    title: string;
    department: string;
    credits: number;
    facultyId: number;
    roomNumber?: string;
    studentIds?: number[];
  }): Course {
    const cleanCode = data.code.trim().toUpperCase();
    const existing = this.state.courses.find(c => c.code.toUpperCase() === cleanCode);
    if (existing) {
      throw new Error(`Class with code "${cleanCode}" already exists`);
    }

    const faculty = this.state.users.find(u => u.id === data.facultyId);
    if (!faculty) throw new Error('Selected faculty instructor not found');

    const newCourse: Course = {
      id: Date.now() + Math.floor(Math.random() * 1000),
      code: cleanCode,
      title: data.title.trim(),
      department: data.department.trim(),
      credits: data.credits || 3,
      facultyId: faculty.id,
      facultyName: faculty.fullName,
      enrolledStudentIds: data.studentIds || [],
      roomNumber: data.roomNumber || 'Lecture Hall 101',
    };

    this.state.courses.unshift(newCourse);

    this.addAuditLog(
      'ADMIN_CREATE_CLASS',
      'COURSE',
      String(newCourse.id),
      `Administrator created class ${newCourse.code} (${newCourse.title}), mapped instructor ${faculty.fullName}, and enrolled ${newCourse.enrolledStudentIds.length} students.`,
      'INFO'
    );

    this.saveState();
    return newCourse;
  }

  public updateCourseFaculty(courseId: number, facultyId: number) {
    const course = this.state.courses.find(c => c.id === courseId);
    if (!course) throw new Error('Class not found');

    const faculty = this.state.users.find(u => u.id === facultyId);
    if (!faculty) throw new Error('Faculty not found');

    const prevFaculty = course.facultyName;
    course.facultyId = faculty.id;
    course.facultyName = faculty.fullName;

    this.addAuditLog(
      'ADMIN_MAP_FACULTY',
      'COURSE',
      String(course.id),
      `Mapped instructor for ${course.code} from "${prevFaculty}" to "${faculty.fullName}"`,
      'INFO'
    );

    this.saveState();
  }

  public toggleStudentEnrollment(courseId: number, studentId: number) {
    const course = this.state.courses.find(c => c.id === courseId);
    if (!course) throw new Error('Class not found');

    const student = this.state.users.find(u => u.id === studentId);
    if (!student) throw new Error('Student not found');

    if (!course.enrolledStudentIds) course.enrolledStudentIds = [];

    const isEnrolled = course.enrolledStudentIds.includes(studentId);
    if (isEnrolled) {
      course.enrolledStudentIds = course.enrolledStudentIds.filter(id => id !== studentId);
      this.addAuditLog(
        'ADMIN_UNENROLL_STUDENT',
        'COURSE',
        String(course.id),
        `Removed student ${student.fullName} (${student.identifierCode}) from ${course.code}`,
        'INFO'
      );
    } else {
      course.enrolledStudentIds.push(studentId);
      this.addAuditLog(
        'ADMIN_ENROLL_STUDENT',
        'COURSE',
        String(course.id),
        `Enrolled student ${student.fullName} (${student.identifierCode}) into ${course.code}`,
        'INFO'
      );
    }

    this.saveState();
  }

  public uploadStudentsToClass(
    courseId: number,
    data: string | { regNo: string; name: string; email?: string }[]
  ): { addedCount: number; newUsersCreated: number; errors: string[] } {
    const course = this.state.courses.find(c => c.id === courseId);
    if (!course) throw new Error('Class not found');
    if (!course.enrolledStudentIds) course.enrolledStudentIds = [];

    let parsedList: { regNo: string; name: string; email?: string }[] = [];

    if (Array.isArray(data)) {
      parsedList = data;
    } else {
      const lines = data.split(/\r?\n/).map(l => l.trim()).filter(l => l.length > 0);
      if (lines.length === 0) throw new Error('Uploaded file is empty');

      // Check if line 0 is a header
      const firstLineLower = lines[0].toLowerCase();
      const startIndex = (firstLineLower.includes('registration') || firstLineLower.includes('name') || firstLineLower.includes('reg no') || firstLineLower.includes('reg_no')) ? 1 : 0;

      for (let i = startIndex; i < lines.length; i++) {
        const line = lines[i];
        // Split by tab (Excel copy-paste), comma, or semicolon
        const parts = line.split(/\t|[,;]/).map(p => p.trim().replace(/^["']|["']$/g, ''));
        if (parts.length === 0 || !parts[0]) continue;

        const regNo = parts[0].toUpperCase();
        const name = parts.length > 1 ? parts[1] : `Student ${regNo}`;
        const email = parts.length > 2 && parts[2].includes('@') ? parts[2].toLowerCase() : '';

        parsedList.push({ regNo, name, email });
      }
    }

    let addedCount = 0;
    let newUsersCreated = 0;
    const errors: string[] = [];

    for (let i = 0; i < parsedList.length; i++) {
      const item = parsedList[i];
      const cleanReg = item.regNo.trim().toUpperCase();
      const cleanName = item.name.trim();

      if (!cleanReg) continue;

      // Auto-generate standard institutional email
      const domain = cleanReg.startsWith('RA') ? 'srmist.edu.in' : 'university.edu';
      const email = item.email || `${cleanReg.toLowerCase()}@${domain}`;

      // Check if user already exists
      let existingUser = this.state.users.find(
        u => u.identifierCode.toUpperCase() === cleanReg || u.email.toLowerCase() === email.toLowerCase()
      );

      if (!existingUser) {
        // Automatically create student account with initial password = <RegNo>@2026
        existingUser = {
          id: Date.now() + Math.floor(Math.random() * 10000) + i,
          email: email.toLowerCase(),
          fullName: cleanName,
          role: 'STUDENT',
          identifierCode: cleanReg,
          department: course.department,
          semester: 6,
        };
        this.state.users.push(existingUser);
        newUsersCreated++;
      }

      // Enroll in course if not already enrolled
      if (!course.enrolledStudentIds.includes(existingUser.id)) {
        course.enrolledStudentIds.push(existingUser.id);
        addedCount++;
      }
    }

    this.addAuditLog(
      'ADMIN_CLASS_ROSTER_UPLOAD',
      'COURSE',
      String(course.id),
      `Imported Excel student list for ${course.code}: mapped ${addedCount} students (${newUsersCreated} new accounts auto-created with initial password).`,
      'INFO'
    );

    this.saveState();
    return { addedCount, newUsersCreated, errors };
  }

  public uploadFacultyAccounts(
    data: string | { empCode: string; name: string; department?: string; designation?: string }[]
  ): { createdCount: number; errors: string[] } {
    let parsedList: { empCode: string; name: string; department?: string; designation?: string }[] = [];

    if (Array.isArray(data)) {
      parsedList = data;
    } else {
      const lines = data.split(/\r?\n/).map(l => l.trim()).filter(l => l.length > 0);
      if (lines.length === 0) throw new Error('Uploaded file is empty');

      const firstLineLower = lines[0].toLowerCase();
      const startIndex = (firstLineLower.includes('emp') || firstLineLower.includes('name') || firstLineLower.includes('faculty')) ? 1 : 0;

      for (let i = startIndex; i < lines.length; i++) {
        const line = lines[i];
        const parts = line.split(/\t|[,;]/).map(p => p.trim().replace(/^["']|["']$/g, ''));
        if (parts.length === 0 || !parts[0]) continue;

        const empCode = parts[0].toUpperCase();
        const name = parts.length > 1 ? parts[1] : `Faculty ${empCode}`;
        const department = parts.length > 2 ? parts[2] : 'Computer Science & Engineering';
        const designation = parts.length > 3 ? parts[3] : 'Assistant Professor';

        parsedList.push({ empCode, name, department, designation });
      }
    }

    let createdCount = 0;
    const errors: string[] = [];

    for (let i = 0; i < parsedList.length; i++) {
      const item = parsedList[i];
      const cleanEmp = item.empCode.trim().toUpperCase();
      const cleanName = item.name.trim();

      if (!cleanEmp) continue;

      const existingUser = this.state.users.find(
        u => u.identifierCode.toUpperCase() === cleanEmp || u.email.toLowerCase() === `${cleanEmp.toLowerCase()}@university.edu`
      );

      if (!existingUser) {
        const newUser: User = {
          id: Date.now() + Math.floor(Math.random() * 10000) + i,
          email: `${cleanEmp.toLowerCase().replace(/[^a-z0-9]/g, '')}@university.edu`,
          fullName: cleanName,
          role: 'FACULTY',
          identifierCode: cleanEmp,
          department: item.department || 'Computer Science & Engineering',
        };
        this.state.users.push(newUser);
        createdCount++;
      }
    }

    this.addAuditLog(
      'ADMIN_BULK_FACULTY_UPLOAD',
      'USER',
      'BULK',
      `Imported faculty Excel list: ${createdCount} faculty accounts auto-provisioned with default password.`,
      'INFO'
    );

    this.saveState();
    return { createdCount, errors };
  }

  public deleteClass(courseId: number) {
    const courseToDelete = this.state.courses.find(c => c.id === courseId);
    if (!courseToDelete) throw new Error('Class not found');

    this.state.courses = this.state.courses.filter(c => c.id !== courseId);

    this.addAuditLog(
      'ADMIN_DELETE_CLASS',
      'COURSE',
      String(courseId),
      `Deleted class ${courseToDelete.code} (${courseToDelete.title})`,
      'WARNING'
    );

    this.saveState();
  }

  public resetToDefaults() {
    this.state = {
      isAuthenticated: false,
      currentUser: SEED_USERS[5], // Admin
      users: SEED_USERS,
      courses: SEED_COURSES,
      sessions: initSeedSessions(),
      records: initSeedRecords(),
      auditLogs: initSeedAuditLogs(),
    };
    this.saveState();
  }

  // --- Session Management ---
  public createSession(courseId: number, roomNumber: string, durationMinutes: number, rssiThreshold: number): AttendanceSession {
    const course = this.state.courses.find(c => c.id === courseId);
    if (!course) throw new Error('Course not found');

    const now = new Date();
    const startTime = now.toISOString();
    const endTime = new Date(now.getTime() + durationMinutes * 60000).toISOString();

    const randomHex = (len: number) => Array.from({ length: len }, () => Math.floor(Math.random() * 16).toString(16)).join('').toUpperCase();
    const sessionCode = `SESS-${course.code.replace(/[^A-Z0-9]/g, '')}-${randomHex(6)}`;
    const secret = `pulsebeacon_key_${randomHex(32)}`;
    const salt = randomHex(8);

    const newSession: AttendanceSession = {
      id: Date.now(),
      sessionCode,
      courseId: course.id,
      courseCode: course.code,
      courseTitle: course.title,
      facultyId: this.state.currentUser.id,
      facultyName: this.state.currentUser.fullName,
      roomNumber,
      durationMinutes,
      startTime,
      endTime,
      status: 'ACTIVE',
      bleServiceUuid: BLE_CONSTANTS.SERVICE_UUID_128,
      bleSessionSecret: secret,
      bleSalt: salt,
      rssiThreshold,
      totalEnrolled: course.enrolledStudentIds && course.enrolledStudentIds.length > 0 ? course.enrolledStudentIds.length : 30,
      totalPresent: 0,
    };

    this.state.sessions.unshift(newSession);

    this.addAuditLog(
      'SESSION_CREATE',
      'ATTENDANCE_SESSION',
      String(newSession.id),
      `Faculty created session ${sessionCode} for ${course.code} (${roomNumber}) with ${durationMinutes}m duration and threshold ${rssiThreshold} dBm.`,
      'INFO'
    );

    this.saveState();
    return newSession;
  }

  public closeSession(sessionId: number) {
    const session = this.state.sessions.find(s => s.id === sessionId);
    if (session) {
      session.status = 'CLOSED';
      session.endTime = new Date().toISOString();

      this.addAuditLog(
        'SESSION_CLOSE',
        'ATTENDANCE_SESSION',
        String(session.id),
        `Session ${session.sessionCode} (${session.courseCode}) closed by ${this.state.currentUser.fullName}`,
        'INFO'
      );
      this.saveState();
    }
  }

  // --- Student Attendance Check-in ---
  public async submitStudentCheckIn(
    sessionId: number,
    payloadHex: string,
    observedRssi: number
  ): Promise<{ success: boolean; message: string; record?: AttendanceRecord }> {
    const student = this.state.currentUser;
    if (student.role !== 'STUDENT') {
      return { success: false, message: 'Only authenticated student accounts can submit attendance.' };
    }

    const session = this.state.sessions.find(s => s.id === sessionId);
    if (!session) {
      return { success: false, message: 'Classroom attendance session not found.' };
    }

    // 1. Session Status Check
    const now = new Date();
    if (session.status !== 'ACTIVE') {
      return { success: false, message: `Session is ${session.status.toLowerCase()}. Cannot mark attendance.` };
    }
    if (now > new Date(session.endTime)) {
      session.status = 'EXPIRED';
      this.saveState();
      return { success: false, message: 'Attendance session has expired.' };
    }

    // 2. Duplicate Check-in Check (Database uniqueness requirement)
    const existing = this.state.records.find(
      r => r.sessionId === session.id && r.studentId === student.id && (r.status === 'VERIFIED' || r.status === 'MANUAL_OVERRIDE')
    );
    if (existing) {
      return {
        success: false,
        message: `Duplicate check-in rejected: Attendance already recorded at ${new Date(existing.checkInTime).toLocaleTimeString()}.`,
      };
    }

    // 3. Cryptographic BLE Verification
    const verification = await verifyAdvertisingPayload(
      payloadHex,
      session.sessionCode,
      session.bleSessionSecret,
      session.bleSalt,
      1
    );

    if (!verification.isValid) {
      this.addAuditLog(
        'CHECKIN_SECURITY_FAILURE',
        'ATTENDANCE_SESSION',
        String(session.id),
        `Failed check-in for student ${student.identifierCode} (${student.fullName}): ${verification.reason}`,
        'ALERT'
      );
      return { success: false, message: `BLE Verification Failed: ${verification.reason}` };
    }

    // 4. RSSI Proximity Cutoff Check
    const estimatedDistance = calculateDistance(observedRssi);
    if (observedRssi < session.rssiThreshold) {
      this.addAuditLog(
        'CHECKIN_OUT_OF_BOUNDS',
        'ATTENDANCE_SESSION',
        String(session.id),
        `Student ${student.identifierCode} rejected: RSSI ${observedRssi} dBm below threshold ${session.rssiThreshold} dBm (~${estimatedDistance}m).`,
        'WARNING'
      );
      return {
        success: false,
        message: `Signal too weak (${observedRssi} dBm, ~${estimatedDistance}m). You appear to be outside the classroom. Move closer to the faculty beacon.`,
      };
    }

    // 5. Success: Create Attendance Record
    const newRecord: AttendanceRecord = {
      id: Date.now(),
      sessionId: session.id,
      courseCode: session.courseCode,
      courseTitle: session.courseTitle,
      studentId: student.id,
      studentName: student.fullName,
      registrationNumber: student.identifierCode,
      department: student.department,
      checkInTime: now.toISOString(),
      status: 'VERIFIED',
      verificationMethod: 'BLE_PROXIMITY_HMAC_WINDOW',
      observedRssi,
      estimatedDistanceM: estimatedDistance,
    };

    this.state.records.unshift(newRecord);
    session.totalPresent = this.state.records.filter(r => r.sessionId === session.id).length;

    this.addAuditLog(
      'CHECKIN_VERIFIED',
      'ATTENDANCE_RECORD',
      String(newRecord.id),
      `Verified attendance for ${student.fullName} (${student.identifierCode}) at ~${estimatedDistance}m (RSSI: ${observedRssi} dBm)`,
      'INFO'
    );

    this.saveState();
    return { success: true, message: 'Attendance verified and recorded successfully!', record: newRecord };
  }

  // --- Manual Override ---
  public manualOverrideAttendance(sessionId: number, studentId: number, reason: string): AttendanceRecord {
    const session = this.state.sessions.find(s => s.id === sessionId);
    const student = this.state.users.find(u => u.id === studentId);
    if (!session || !student) throw new Error('Session or Student not found');

    const now = new Date();
    let record = this.state.records.find(r => r.sessionId === sessionId && r.studentId === studentId);

    if (record) {
      record.status = 'MANUAL_OVERRIDE';
      record.overrideReason = reason;
      record.overrideByFacultyName = this.state.currentUser.fullName;
    } else {
      record = {
        id: Date.now(),
        sessionId: session.id,
        courseCode: session.courseCode,
        courseTitle: session.courseTitle,
        studentId: student.id,
        studentName: student.fullName,
        registrationNumber: student.identifierCode,
        department: student.department,
        checkInTime: now.toISOString(),
        status: 'MANUAL_OVERRIDE',
        verificationMethod: 'MANUAL_FACULTY_OVERRIDE',
        observedRssi: -60.0,
        estimatedDistanceM: 1.0,
        overrideReason: reason,
        overrideByFacultyName: this.state.currentUser.fullName,
      };
      this.state.records.unshift(record);
    }

    session.totalPresent = this.state.records.filter(r => r.sessionId === session.id).length;

    this.addAuditLog(
      'MANUAL_ATTENDANCE_OVERRIDE',
      'ATTENDANCE_RECORD',
      String(record.id),
      `Manual attendance override for ${student.fullName} (${student.identifierCode}) by ${this.state.currentUser.fullName}. Reason: ${reason}`,
      'WARNING'
    );

    this.saveState();
    return record;
  }

  public addAuditLog(
    action: string,
    targetEntity: string,
    targetId: string,
    details: string,
    severity: 'INFO' | 'WARNING' | 'ALERT' = 'INFO'
  ) {
    const log: AuditLogItem = {
      id: Date.now() + Math.floor(Math.random() * 1000),
      action,
      performedByName: this.state.currentUser ? this.state.currentUser.fullName : 'System',
      targetEntity,
      targetId,
      details,
      ipAddress: '192.168.1.104',
      timestamp: new Date().toISOString(),
      severity,
    };
    this.state.auditLogs.unshift(log);
  }

  public exportCsv(sessionId: number): string {
    const session = this.state.sessions.find(s => s.id === sessionId);
    if (!session) return '';

    const records = this.state.records.filter(r => r.sessionId === sessionId);
    const headers = [
      'Record ID',
      'Registration Number',
      'Student Name',
      'Department',
      'Course Code',
      'Course Title',
      'Room',
      'Check-in Timestamp (ISO)',
      'Status',
      'Verification Method',
      'Observed RSSI (dBm)',
      'Estimated Distance (m)',
      'Manual Override Reason',
      'Overridden By',
    ];

    const rows = records.map(r => [
      r.id,
      `"${r.registrationNumber}"`,
      `"${r.studentName}"`,
      `"${r.department}"`,
      `"${r.courseCode}"`,
      `"${r.courseTitle}"`,
      `"${session.roomNumber}"`,
      r.checkInTime,
      r.status,
      r.verificationMethod,
      r.observedRssi ?? '',
      r.estimatedDistanceM ?? '',
      `"${r.overrideReason || ''}"`,
      `"${r.overrideByFacultyName || ''}"`,
    ]);

    return [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
  }
}

export const appStore = new AppStore();
