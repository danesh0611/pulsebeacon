import React, { useState, useRef } from 'react';
import * as XLSX from 'xlsx';
import { User, Course, AttendanceSession, AttendanceRecord, AuditLogItem } from '../types';
import { appStore } from '../services/store';
import {
  Users,
  GraduationCap,
  CalendarCheck,
  CheckCircle2,
  TrendingUp,
  ShieldCheck,
  FileText,
  Search,
  Filter,
  AlertTriangle,
  Building2,
  Activity,
  UserPlus,
  Trash2,
  KeyRound,
  BookOpen,
  Plus,
  Mail,
  UserCheck,
  Upload,
  FileSpreadsheet,
  Download,
  FolderPlus,
  X,
  ChevronRight,
  Sparkles,
} from 'lucide-react';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

interface AdminViewProps {
  users: User[];
  courses: Course[];
  sessions: AttendanceSession[];
  records: AttendanceRecord[];
  auditLogs: AuditLogItem[];
}

export const AdminView: React.FC<AdminViewProps> = ({
  users,
  courses,
  sessions,
  records,
  auditLogs,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'classes' | 'users' | 'overview' | 'audit'>('classes');

  // Search & Filter States
  const [auditSearch, setAuditSearch] = useState('');
  const [selectedSeverity, setSelectedSeverity] = useState<string>('ALL');
  const [userSearch, setUserSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<'ALL' | 'STUDENT' | 'FACULTY'>('ALL');
  const [classSearch, setClassSearch] = useState('');

  // Modals
  const [showCreateUserModal, setShowCreateUserModal] = useState(false);
  const [showCreateClassModal, setShowCreateClassModal] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [selectedCourseForUpload, setSelectedCourseForUpload] = useState<Course | null>(null);
  const [selectedCourseForRoster, setSelectedCourseForRoster] = useState<Course | null>(null);

  // Create User Form State
  const [createRole, setCreateRole] = useState<'STUDENT' | 'FACULTY'>('STUDENT');
  const [createFullName, setCreateFullName] = useState('');
  const [createEmail, setCreateEmail] = useState('');
  const [createPassword, setCreatePassword] = useState('Welcome@1234');
  const [createDepartment, setCreateDepartment] = useState('Computer Science & Engineering');
  const [createIdentifier, setCreateIdentifier] = useState('');
  const [createSemester, setCreateSemester] = useState(1);
  const [createDesignation, setCreateDesignation] = useState('Assistant Professor');
  const [userFormError, setUserFormError] = useState<string | null>(null);
  const [userFormSuccess, setUserFormSuccess] = useState<string | null>(null);

  // Create Class Form State
  const [classCode, setClassCode] = useState('');
  const [classTitle, setClassTitle] = useState('');
  const [classDept, setClassDept] = useState('Computer Science & Engineering');
  const [classCredits, setClassCredits] = useState(3);
  const [classRoom, setClassRoom] = useState('Lecture Hall 201');
  const [selectedFacultyId, setSelectedFacultyId] = useState<number>(
    users.find((u) => u.role === 'FACULTY')?.id || 1
  );
  const [selectedStudentIds, setSelectedStudentIds] = useState<number[]>([]);
  const [classFormError, setClassFormError] = useState<string | null>(null);
  const [classFormSuccess, setClassFormSuccess] = useState<string | null>(null);

  // Bulk Student Upload State (Default format: REG NO & NAME)
  const [bulkCsvText, setBulkCsvText] = useState(
    "RA2411003020197\tK S CHAKRADHAR DANESH\nRA2411003020230\tAKHILESH\nRA2411003020234\tP JASHWANTH\nRA2411003020240\tSNEHA REDDY\nRA2411003020245\tROHAN VERMA"
  );
  const [uploadFeedback, setUploadFeedback] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Bulk Faculty Upload State
  const [showFacultyUploadModal, setShowFacultyUploadModal] = useState(false);
  const [facultyBulkText, setFacultyBulkText] = useState(
    "EMP-CS-0050\tDr. Arvind Swaminathan\tComputer Science & Engineering\tAssociate Professor\nEMP-CS-0051\tProf. Meenakshi Sundaram\tComputer Science & Engineering\tProfessor\nEMP-CS-0052\tDr. Rajesh Kanna\tComputer Science & Engineering\tAssistant Professor"
  );
  const [facultyUploadFeedback, setFacultyUploadFeedback] = useState<string | null>(null);
  const facultyFileInputRef = useRef<HTMLInputElement>(null);

  const students = users.filter((u) => u.role === 'STUDENT');
  const faculty = users.filter((u) => u.role === 'FACULTY');

  const verifiedCheckins = records.filter(
    (r) => r.status === 'VERIFIED' || r.status === 'MANUAL_OVERRIDE'
  ).length;

  const potentialTotal = Math.max(1, sessions.length * students.length);
  const overallRate = Math.min(100, Math.round((verifiedCheckins / potentialTotal) * 100));

  // Analytics Data
  const weeklyTrends = [
    { day: 'Mon', present: 148, absent: 16, attendanceRate: 90.2 },
    { day: 'Tue', present: 154, absent: 10, attendanceRate: 93.9 },
    { day: 'Wed', present: 162, absent: 8, attendanceRate: 95.3 },
    { day: 'Thu', present: 145, absent: 22, attendanceRate: 86.8 },
    { day: 'Fri', present: 159, absent: 12, attendanceRate: 93.0 },
    { day: 'Sat', present: 88, absent: 24, attendanceRate: 78.5 },
  ];

  const subjectPerformance = courses.map((c) => {
    const courseSessions = sessions.filter((s) => s.courseId === c.id);
    const courseRecords = records.filter((r) => r.courseCode === c.code);
    const rate =
      courseSessions.length > 0
        ? Math.min(100, Math.round((courseRecords.length / Math.max(1, courseSessions.length * 30)) * 100))
        : 88;
    return {
      name: c.code,
      title: c.title,
      rate: rate > 0 ? rate : 85,
      sessions: Math.max(1, courseSessions.length),
    };
  });

  const filteredLogs = auditLogs.filter((log) => {
    const matchesSearch =
      log.action.toLowerCase().includes(auditSearch.toLowerCase()) ||
      log.performedByName.toLowerCase().includes(auditSearch.toLowerCase()) ||
      log.details.toLowerCase().includes(auditSearch.toLowerCase()) ||
      log.targetEntity.toLowerCase().includes(auditSearch.toLowerCase());

    const matchesSeverity =
      selectedSeverity === 'ALL' || log.severity === selectedSeverity;

    return matchesSearch && matchesSeverity;
  });

  const filteredUsers = users.filter((u) => {
    const matchesRole = roleFilter === 'ALL' || u.role === roleFilter;
    const matchesSearch =
      u.fullName.toLowerCase().includes(userSearch.toLowerCase()) ||
      u.email.toLowerCase().includes(userSearch.toLowerCase()) ||
      u.identifierCode.toLowerCase().includes(userSearch.toLowerCase()) ||
      u.department.toLowerCase().includes(userSearch.toLowerCase());
    return matchesRole && matchesSearch;
  });

  const filteredCourses = courses.filter((c) => {
    const query = classSearch.toLowerCase();
    return (
      c.code.toLowerCase().includes(query) ||
      c.title.toLowerCase().includes(query) ||
      c.facultyName.toLowerCase().includes(query) ||
      c.department.toLowerCase().includes(query)
    );
  });

  // Handle Create User
  const handleCreateUser = (e: React.FormEvent) => {
    e.preventDefault();
    setUserFormError(null);
    setUserFormSuccess(null);

    if (!createFullName.trim() || !createEmail.trim() || !createIdentifier.trim()) {
      setUserFormError('Please fill in all mandatory fields');
      return;
    }

    try {
      const created = appStore.createUserByAdmin({
        email: createEmail.trim(),
        fullName: createFullName.trim(),
        role: createRole,
        identifierCode: createIdentifier.trim(),
        department: createDepartment.trim(),
        semester: createRole === 'STUDENT' ? createSemester : undefined,
        designation: createRole === 'FACULTY' ? createDesignation : undefined,
      });

      setUserFormSuccess(`Created ${created.role} account for ${created.fullName} (${created.identifierCode})`);
      setCreateFullName('');
      setCreateEmail('');
      setCreateIdentifier('');
      setTimeout(() => {
        setShowCreateUserModal(false);
        setUserFormSuccess(null);
      }, 1200);
    } catch (err: any) {
      setUserFormError(err.message || 'Failed to create user account');
    }
  };

  // Handle Create Class with Faculty & Students
  const handleCreateClass = (e: React.FormEvent) => {
    e.preventDefault();
    setClassFormError(null);
    setClassFormSuccess(null);

    if (!classCode.trim() || !classTitle.trim()) {
      setClassFormError('Class Code and Title are required');
      return;
    }

    try {
      const newCourse = appStore.createClass({
        code: classCode.trim(),
        title: classTitle.trim(),
        department: classDept,
        credits: classCredits,
        facultyId: selectedFacultyId,
        roomNumber: classRoom,
        studentIds: selectedStudentIds,
      });

      setClassFormSuccess(`Class ${newCourse.code} created! Faculty "${newCourse.facultyName}" mapped with ${newCourse.enrolledStudentIds.length} students.`);
      setClassCode('');
      setClassTitle('');
      setSelectedStudentIds([]);
      setTimeout(() => {
        setShowCreateClassModal(false);
        setClassFormSuccess(null);
      }, 1400);
    } catch (err: any) {
      setClassFormError(err.message || 'Failed to create class');
    }
  };

  // Handle Bulk Upload of Students
  // Handle Bulk Upload of Students
  const handleBulkUpload = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCourseForUpload) return;
    setUploadFeedback(null);

    try {
      const res = appStore.uploadStudentsToClass(selectedCourseForUpload.id, bulkCsvText);
      setUploadFeedback(`Successfully mapped ${res.addedCount} students to ${selectedCourseForUpload.code} (${res.newUsersCreated} new accounts auto-registered).`);
      setTimeout(() => {
        setShowUploadModal(false);
        setUploadFeedback(null);
      }, 1800);
    } catch (err: any) {
      setUploadFeedback(`Error: ${err.message}`);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const fileName = file.name.toLowerCase();
    const isExcel = fileName.endsWith('.xlsx') || fileName.endsWith('.xls');

    if (isExcel) {
      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const data = new Uint8Array(event.target?.result as ArrayBuffer);
          const workbook = XLSX.read(data, { type: 'array' });
          const firstSheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[firstSheetName];
          const rows = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];

          // Format: Column 0 = REG NO, Column 1 = NAME
          const lines = rows
            .filter((r) => r && r.length > 0 && String(r[0] || '').trim().length > 0)
            .map((r) => {
              const reg = String(r[0] || '').trim();
              const name = String(r[1] || '').trim();
              return `${reg}\t${name}`;
            })
            .join('\n');

          setBulkCsvText(lines);
          setUploadFeedback(`Parsed ${rows.length} rows from Excel file "${file.name}".`);
        } catch (err: any) {
          setUploadFeedback(`Failed to read Excel file: ${err.message}`);
        }
      };
      reader.readAsArrayBuffer(file);
    } else {
      const reader = new FileReader();
      reader.onload = (event) => {
        const text = event.target?.result as string;
        if (text) {
          setBulkCsvText(text);
          setUploadFeedback(`Loaded text roster "${file.name}".`);
        }
      };
      reader.readAsText(file);
    }
  };

  const downloadStudentExcelTemplate = () => {
    const wb = XLSX.utils.book_new();
    const wsData = [
      ['REG NO', 'NAME'],
      ['RA2411003020197', 'K S CHAKRADHAR DANESH'],
      ['RA2411003020230', 'AKHILESH'],
      ['RA2411003020234', 'P JASHWANTH'],
      ['RA2411003020240', 'SNEHA REDDY'],
      ['RA2411003020245', 'ROHAN VERMA'],
    ];
    const ws = XLSX.utils.aoa_to_sheet(wsData);
    XLSX.utils.book_append_sheet(wb, ws, 'Student_Roster');
    XLSX.writeFile(wb, 'Student_Roster_Template.xlsx');
  };

  // Faculty Bulk Upload Handlers
  const handleFacultyFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const fileName = file.name.toLowerCase();
    const isExcel = fileName.endsWith('.xlsx') || fileName.endsWith('.xls');

    if (isExcel) {
      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const data = new Uint8Array(event.target?.result as ArrayBuffer);
          const workbook = XLSX.read(data, { type: 'array' });
          const firstSheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[firstSheetName];
          const rows = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];

          const lines = rows
            .filter((r) => r && r.length > 0 && String(r[0] || '').trim().length > 0)
            .map((r) => {
              const code = String(r[0] || '').trim();
              const name = String(r[1] || '').trim();
              const dept = String(r[2] || 'Computer Science & Engineering').trim();
              const desig = String(r[3] || 'Assistant Professor').trim();
              return `${code}\t${name}\t${dept}\t${desig}`;
            })
            .join('\n');

          setFacultyBulkText(lines);
          setFacultyUploadFeedback(`Parsed ${rows.length} rows from Excel file "${file.name}".`);
        } catch (err: any) {
          setFacultyUploadFeedback(`Failed to read Excel file: ${err.message}`);
        }
      };
      reader.readAsArrayBuffer(file);
    } else {
      const reader = new FileReader();
      reader.onload = (event) => {
        const text = event.target?.result as string;
        if (text) {
          setFacultyBulkText(text);
          setFacultyUploadFeedback(`Loaded text file "${file.name}".`);
        }
      };
      reader.readAsText(file);
    }
  };

  const handleBulkFacultyUpload = (e: React.FormEvent) => {
    e.preventDefault();
    setFacultyUploadFeedback(null);
    try {
      const res = appStore.uploadFacultyAccounts(facultyBulkText);
      setFacultyUploadFeedback(`Successfully imported ${res.createdCount} faculty accounts.`);
      setTimeout(() => {
        setShowFacultyUploadModal(false);
        setFacultyUploadFeedback(null);
      }, 1800);
    } catch (err: any) {
      setFacultyUploadFeedback(`Error: ${err.message}`);
    }
  };

  const downloadFacultyExcelTemplate = () => {
    const wb = XLSX.utils.book_new();
    const wsData = [
      ['EMP CODE', 'NAME', 'DEPARTMENT', 'DESIGNATION'],
      ['EMP-CS-0050', 'Dr. Arvind Swaminathan', 'Computer Science & Engineering', 'Associate Professor'],
      ['EMP-CS-0051', 'Prof. Meenakshi Sundaram', 'Computer Science & Engineering', 'Professor'],
      ['EMP-CS-0052', 'Dr. Rajesh Kanna', 'Computer Science & Engineering', 'Assistant Professor'],
    ];
    const ws = XLSX.utils.aoa_to_sheet(wsData);
    XLSX.utils.book_append_sheet(wb, ws, 'Faculty_Roster');
    XLSX.writeFile(wb, 'Faculty_Roster_Template.xlsx');
  };

  // Live preview helpers
  const previewStudentRows = React.useMemo(() => {
    const lines = bulkCsvText.split(/\r?\n/).map((l) => l.trim()).filter((l) => l.length > 0);
    const firstLineLower = (lines[0] || '').toLowerCase();
    const startIndex = firstLineLower.includes('reg') || firstLineLower.includes('name') ? 1 : 0;
    const rows: { regNo: string; name: string; passwordPreview: string }[] = [];

    for (let i = startIndex; i < lines.length; i++) {
      const parts = lines[i].split(/\t|[,;]/).map((p) => p.trim().replace(/^["']|["']$/g, ''));
      if (parts.length === 0 || !parts[0]) continue;
      const regNo = parts[0].toUpperCase();
      const name = parts[1] || `Student ${regNo}`;
      rows.push({
        regNo,
        name,
        passwordPreview: `${regNo}@2026`,
      });
    }
    return rows;
  }, [bulkCsvText]);

  const previewFacultyRows = React.useMemo(() => {
    const lines = facultyBulkText.split(/\r?\n/).map((l) => l.trim()).filter((l) => l.length > 0);
    const firstLineLower = (lines[0] || '').toLowerCase();
    const startIndex = firstLineLower.includes('emp') || firstLineLower.includes('name') ? 1 : 0;
    const rows: { empCode: string; name: string; dept: string; desig: string }[] = [];

    for (let i = startIndex; i < lines.length; i++) {
      const parts = lines[i].split(/\t|[,;]/).map((p) => p.trim().replace(/^["']|["']$/g, ''));
      if (parts.length === 0 || !parts[0]) continue;
      rows.push({
        empCode: parts[0].toUpperCase(),
        name: parts[1] || `Faculty ${parts[0]}`,
        dept: parts[2] || 'Computer Science & Engineering',
        desig: parts[3] || 'Assistant Professor',
      });
    }
    return rows;
  }, [facultyBulkText]);

  return (
    <div className="space-y-6">
      {/* Top Header & Sub-Navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900/60 p-4 rounded-2xl border border-slate-800">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center space-x-2">
            <span>Administration & Registry Portal</span>
            <span className="text-xs bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 px-2.5 py-0.5 rounded-full font-semibold">
              Admin Access
            </span>
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Create classes, map faculty to courses, upload student rosters, and manage institutional records.
          </p>
        </div>

        {/* Subtabs */}
        <div className="flex items-center space-x-1.5 bg-slate-800/80 p-1 rounded-xl border border-slate-700/60 overflow-x-auto scrollbar-none">
          <button
            onClick={() => setActiveSubTab('classes')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center space-x-1.5 transition-all cursor-pointer whitespace-nowrap ${
              activeSubTab === 'classes' ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-white'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>Classes & Rosters ({courses.length})</span>
          </button>

          <button
            onClick={() => setActiveSubTab('users')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center space-x-1.5 transition-all cursor-pointer whitespace-nowrap ${
              activeSubTab === 'users' ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Accounts ({users.length})</span>
          </button>

          <button
            onClick={() => setActiveSubTab('overview')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center space-x-1.5 transition-all cursor-pointer whitespace-nowrap ${
              activeSubTab === 'overview' ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-white'
            }`}
          >
            <TrendingUp className="w-3.5 h-3.5" />
            <span>Campus Analytics</span>
          </button>

          <button
            onClick={() => setActiveSubTab('audit')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center space-x-1.5 transition-all cursor-pointer whitespace-nowrap ${
              activeSubTab === 'audit' ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-white'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Audit Ledger</span>
          </button>
        </div>
      </div>

      {/* KPI Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="bg-slate-900/60 rounded-2xl border border-slate-800 p-5 flex items-center space-x-4">
          <div className="w-12 h-12 rounded-xl bg-blue-500/20 text-blue-400 border border-blue-500/30 flex items-center justify-center">
            <BookOpen className="w-6 h-6" />
          </div>
          <div>
            <div className="text-xs text-slate-400 font-medium">Classes Active</div>
            <div className="text-2xl font-bold text-white mt-0.5">{courses.length}</div>
            <div className="text-[11px] text-blue-400 font-medium">With Faculty Mapped</div>
          </div>
        </div>

        <div className="bg-slate-900/60 rounded-2xl border border-slate-800 p-5 flex items-center space-x-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center">
            <GraduationCap className="w-6 h-6" />
          </div>
          <div>
            <div className="text-xs text-slate-400 font-medium">Total Students</div>
            <div className="text-2xl font-bold text-white mt-0.5">{students.length}</div>
            <div className="text-[11px] text-emerald-400 font-medium">Enrolled in Rosters</div>
          </div>
        </div>

        <div className="bg-slate-900/60 rounded-2xl border border-slate-800 p-5 flex items-center space-x-4">
          <div className="w-12 h-12 rounded-xl bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 flex items-center justify-center">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <div className="text-xs text-slate-400 font-medium">Faculty Instructors</div>
            <div className="text-2xl font-bold text-white mt-0.5">{faculty.length}</div>
            <div className="text-[11px] text-indigo-400 font-medium">BLE Broadcasters</div>
          </div>
        </div>

        <div className="bg-slate-900/60 rounded-2xl border border-slate-800 p-5 flex items-center space-x-4">
          <div className="w-12 h-12 rounded-xl bg-teal-500/20 text-teal-400 border border-teal-500/30 flex items-center justify-center">
            <CalendarCheck className="w-6 h-6" />
          </div>
          <div>
            <div className="text-xs text-slate-400 font-medium">Class Sessions</div>
            <div className="text-2xl font-bold text-white mt-0.5">{sessions.length}</div>
            <div className="text-[11px] text-teal-400 font-medium">
              {sessions.filter((s) => s.status === 'ACTIVE').length} Live Now
            </div>
          </div>
        </div>

        <div className="bg-slate-900/60 rounded-2xl border border-slate-800 p-5 flex items-center space-x-4">
          <div className="w-12 h-12 rounded-xl bg-purple-500/20 text-purple-400 border border-purple-500/30 flex items-center justify-center">
            <TrendingUp className="w-6 h-6" />
          </div>
          <div>
            <div className="text-xs text-slate-400 font-medium">Campus Attendance</div>
            <div className="text-2xl font-bold text-white mt-0.5">{overallRate}%</div>
            <div className="text-[11px] text-purple-400 font-medium">Aggregate Presence</div>
          </div>
        </div>
      </div>

      {/* SUBTAB 1: MANAGE CLASSES, UPLOAD STUDENTS & MAP FACULTY */}
      {activeSubTab === 'classes' && (
        <div className="space-y-6">
          <div className="bg-slate-900/60 rounded-2xl border border-slate-800 p-6 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h2 className="text-base font-bold text-white flex items-center space-x-2">
                  <BookOpen className="w-5 h-5 text-indigo-400" />
                  <span>College Classes & Faculty-Student Mappings</span>
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Create new classes, assign faculty instructors, and upload CSV student rosters.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    placeholder="Search class or faculty..."
                    value={classSearch}
                    onChange={(e) => setClassSearch(e.target.value)}
                    className="bg-slate-800/80 border border-slate-700 rounded-xl pl-8 pr-3 py-1.5 text-xs text-white placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>

                <button
                  onClick={() => {
                    setClassFormError(null);
                    setClassFormSuccess(null);
                    setShowCreateClassModal(true);
                  }}
                  className="flex items-center space-x-1.5 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-xl shadow-lg shadow-indigo-600/30 transition-all cursor-pointer"
                >
                  <FolderPlus className="w-3.5 h-3.5" />
                  <span>Create Class & Map Students</span>
                </button>
              </div>
            </div>

            {/* Classes Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pt-2">
              {filteredCourses.map((c) => {
                const enrolledCount = c.enrolledStudentIds ? c.enrolledStudentIds.length : 0;
                return (
                  <div
                    key={c.id}
                    className="bg-slate-950/60 rounded-2xl border border-slate-800/90 p-5 space-y-4 hover:border-slate-700 transition-all"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <span className="text-xs font-bold px-2.5 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 font-mono">
                          {c.code}
                        </span>
                        <h3 className="font-bold text-white text-sm mt-2 line-clamp-1">{c.title}</h3>
                        <p className="text-xs text-slate-400 mt-0.5">{c.department}</p>
                      </div>
                      <span className="text-xs text-slate-400 bg-slate-800 px-2 py-0.5 rounded font-mono">
                        {c.credits} Credits
                      </span>
                    </div>

                    {/* Mapped Faculty Badge */}
                    <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 text-xs space-y-1">
                      <div className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold flex items-center justify-between">
                        <span>Mapped Faculty</span>
                        <UserCheck className="w-3.5 h-3.5 text-teal-400" />
                      </div>
                      <div className="font-semibold text-white">{c.facultyName}</div>
                    </div>

                    {/* Mapped Students Counter */}
                    <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-800/80">
                      <span className="text-slate-400">Class Roster:</span>
                      <span className="font-bold text-emerald-400 font-mono">
                        {enrolledCount} Students Enrolled
                      </span>
                    </div>

                    {/* Actions: View Roster & Upload List */}
                    <div className="grid grid-cols-2 gap-2 pt-1">
                      <button
                        onClick={() => setSelectedCourseForRoster(c)}
                        className="py-1.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium flex items-center justify-center space-x-1.5 transition-colors cursor-pointer"
                      >
                        <Users className="w-3.5 h-3.5 text-indigo-400" />
                        <span>View Roster</span>
                      </button>

                      <button
                        onClick={() => {
                          setSelectedCourseForUpload(c);
                          setUploadFeedback(null);
                          setShowUploadModal(true);
                        }}
                        className="py-1.5 px-3 rounded-xl bg-indigo-600/20 hover:bg-indigo-600 text-indigo-300 hover:text-white border border-indigo-500/30 text-xs font-medium flex items-center justify-center space-x-1.5 transition-colors cursor-pointer"
                      >
                        <Upload className="w-3.5 h-3.5" />
                        <span>Upload Students</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* SUBTAB 2: USER & ACCOUNT MANAGEMENT */}
      {activeSubTab === 'users' && (
        <div className="bg-slate-900/60 rounded-2xl border border-slate-800 p-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-bold text-white flex items-center space-x-2">
                <Users className="w-5 h-5 text-indigo-400" />
                <span>University Accounts Directory</span>
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Register faculty and students with unique college IDs and employee codes.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value as any)}
                className="bg-slate-800 border border-slate-700 text-slate-200 text-xs rounded-xl px-2.5 py-2 focus:ring-1 focus:ring-indigo-500"
              >
                <option value="ALL">All Roles ({users.length})</option>
                <option value="STUDENT">Students ({students.length})</option>
                <option value="FACULTY">Faculty ({faculty.length})</option>
              </select>

              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Search name, email, ID..."
                  value={userSearch}
                  onChange={(e) => setUserSearch(e.target.value)}
                  className="bg-slate-800/80 border border-slate-700 rounded-xl pl-8 pr-3 py-1.5 text-xs text-white placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <button
                onClick={() => {
                  setFacultyUploadFeedback(null);
                  setShowFacultyUploadModal(true);
                }}
                className="flex items-center space-x-1.5 px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-teal-300 border border-teal-500/30 text-xs font-semibold rounded-xl transition-all cursor-pointer shadow"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-teal-400" />
                <span>Upload Faculty (Excel)</span>
              </button>

              <button
                onClick={() => {
                  setUserFormError(null);
                  setUserFormSuccess(null);
                  setShowCreateUserModal(true);
                }}
                className="flex items-center space-x-1.5 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-xl shadow-lg shadow-indigo-600/30 transition-all cursor-pointer"
              >
                <UserPlus className="w-3.5 h-3.5" />
                <span>Create New Account</span>
              </button>
            </div>
          </div>

          {/* Accounts Table */}
          <div className="overflow-x-auto rounded-xl border border-slate-800">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-800/80 text-slate-400 font-semibold uppercase text-[10px] tracking-wider border-b border-slate-700/60">
                <tr>
                  <th className="py-3 px-4">User</th>
                  <th className="py-3 px-4">Role</th>
                  <th className="py-3 px-4">Unique Identifier</th>
                  <th className="py-3 px-4">Department</th>
                  <th className="py-3 px-4">Details</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 bg-slate-900/40 font-mono text-[11px]">
                {filteredUsers.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="py-3 px-4 font-sans font-medium text-white flex items-center space-x-2.5">
                      <div
                        className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                          u.role === 'ADMIN'
                            ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                            : u.role === 'FACULTY'
                            ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30'
                            : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                        }`}
                      >
                        {u.fullName[0]}
                      </div>
                      <div>
                        <div>{u.fullName}</div>
                        <div className="text-[10px] text-slate-400 font-mono">{u.email}</div>
                      </div>
                    </td>

                    <td className="py-3 px-4 font-sans">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold ${
                          u.role === 'ADMIN'
                            ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30'
                            : u.role === 'FACULTY'
                            ? 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/30'
                            : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                        }`}
                      >
                        {u.role}
                      </span>
                    </td>

                    <td className="py-3 px-4 font-bold text-white">{u.identifierCode}</td>
                    <td className="py-3 px-4 text-slate-300 font-sans">{u.department}</td>

                    <td className="py-3 px-4 text-slate-400 font-sans">
                      {u.role === 'STUDENT' ? `Semester ${u.semester || 1}` : u.role === 'FACULTY' ? 'Instructor' : 'System Registrar'}
                    </td>

                    <td className="py-3 px-4 text-right font-sans">
                      {u.role !== 'ADMIN' && (
                        <button
                          onClick={() => {
                            if (window.confirm(`Delete user ${u.fullName}?`)) {
                              appStore.deleteUserByAdmin(u.id);
                            }
                          }}
                          className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors cursor-pointer"
                          title="Delete user account"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* SUBTAB 3: CAMPUS ANALYTICS CHARTS */}
      {activeSubTab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-slate-900/60 rounded-2xl border border-slate-800 p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-white">Weekly Attendance Flow</h2>
                <p className="text-xs text-slate-400">Total student verified check-ins by day</p>
              </div>
              <span className="text-xs px-2.5 py-1 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 font-medium">
                Live Aggregate
              </span>
            </div>

            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={weeklyTrends} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorPresent" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#4F46E5" stopOpacity={0.8} />
                      <stop offset="95%" stopColor="#4F46E5" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.5} />
                  <XAxis dataKey="day" stroke="#94A3B8" fontSize={11} tickLine={false} />
                  <YAxis stroke="#94A3B8" fontSize={11} tickLine={false} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#0F172A', borderColor: '#334155', borderRadius: '0.75rem', fontSize: '12px' }}
                  />
                  <Area type="monotone" dataKey="present" stroke="#6366F1" strokeWidth={2} fillOpacity={1} fill="url(#colorPresent)" name="Present" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="bg-slate-900/60 rounded-2xl border border-slate-800 p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-white">Course Attendance Compliance</h2>
                <p className="text-xs text-slate-400">Average percentage of present students per subject</p>
              </div>
              <span className="text-xs px-2.5 py-1 rounded-full bg-teal-500/10 text-teal-400 border border-teal-500/20 font-medium">
                Benchmark: 75%
              </span>
            </div>

            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={subjectPerformance} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.5} />
                  <XAxis dataKey="name" stroke="#94A3B8" fontSize={11} tickLine={false} />
                  <YAxis domain={[0, 100]} stroke="#94A3B8" fontSize={11} tickLine={false} unit="%" />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#0F172A', borderColor: '#334155', borderRadius: '0.75rem', fontSize: '12px' }}
                  />
                  <Bar dataKey="rate" fill="#0D9488" radius={[6, 6, 0, 0]} name="Attendance %" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {/* SUBTAB 4: AUDIT LEDGER */}
      {activeSubTab === 'audit' && (
        <div className="bg-slate-900/60 rounded-2xl border border-slate-800 p-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-bold text-white flex items-center space-x-2">
                <ShieldCheck className="w-5 h-5 text-indigo-400" />
                <span>Immutable Institutional Audit Ledger</span>
              </h2>
              <p className="text-xs text-slate-400">
                Complete historical trail of session lifecycle, BLE nonces, account registrations, and manual overrides.
              </p>
            </div>

            <div className="flex items-center space-x-2">
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Filter logs..."
                  value={auditSearch}
                  onChange={(e) => setAuditSearch(e.target.value)}
                  className="bg-slate-800/80 border border-slate-700 rounded-xl pl-9 pr-3 py-1.5 text-xs text-white placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <select
                value={selectedSeverity}
                onChange={(e) => setSelectedSeverity(e.target.value)}
                className="bg-slate-800 border border-slate-700 text-xs text-slate-200 rounded-xl px-2.5 py-1.5 focus:ring-1 focus:ring-indigo-500"
              >
                <option value="ALL">All Severities</option>
                <option value="INFO">INFO Only</option>
                <option value="WARNING">WARNING Only</option>
                <option value="ALERT">ALERT Only</option>
              </select>
            </div>
          </div>

          <div className="overflow-x-auto rounded-xl border border-slate-800 max-h-96">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-800/80 text-slate-400 font-semibold uppercase text-[10px] tracking-wider sticky top-0 border-b border-slate-700/60 z-10">
                <tr>
                  <th className="py-3 px-4">Timestamp (UTC)</th>
                  <th className="py-3 px-4">Action</th>
                  <th className="py-3 px-4">Actor</th>
                  <th className="py-3 px-4">Entity</th>
                  <th className="py-3 px-4">Details</th>
                  <th className="py-3 px-4 text-right">IP Address</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 bg-slate-900/40 font-mono text-[11px]">
                {filteredLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="py-2.5 px-4 text-slate-400 whitespace-nowrap font-sans">
                      {new Date(log.timestamp).toLocaleString()}
                    </td>
                    <td className="py-2.5 px-4 font-sans whitespace-nowrap">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold ${
                          log.severity === 'ALERT'
                            ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                            : log.severity === 'WARNING'
                            ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                            : 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/30'
                        }`}
                      >
                        {log.action}
                      </span>
                    </td>
                    <td className="py-2.5 px-4 text-white font-sans">{log.performedByName}</td>
                    <td className="py-2.5 px-4 text-slate-400">{log.targetEntity}</td>
                    <td className="py-2.5 px-4 text-slate-300 font-sans max-w-md truncate" title={log.details}>
                      {log.details}
                    </td>
                    <td className="py-2.5 px-4 text-right text-slate-400">{log.ipAddress}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* MODAL 1: CREATE CLASS, MAP FACULTY & ENROLL STUDENTS */}
      {showCreateClassModal && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-2xl w-full p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-150 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-lg font-bold text-white flex items-center space-x-2">
                <FolderPlus className="w-5 h-5 text-indigo-400" />
                <span>Create Class & Map Faculty & Students</span>
              </h3>
              <button
                onClick={() => setShowCreateClassModal(false)}
                className="text-slate-400 hover:text-white text-sm"
              >
                ✕
              </button>
            </div>

            {classFormError && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center space-x-2">
                <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                <span>{classFormError}</span>
              </div>
            )}

            {classFormSuccess && (
              <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center space-x-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>{classFormSuccess}</span>
              </div>
            )}

            <form onSubmit={handleCreateClass} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Course Code</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. CS-501"
                    value={classCode}
                    onChange={(e) => setClassCode(e.target.value.toUpperCase())}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-white font-mono uppercase text-xs focus:ring-1 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-medium mb-1">Course Title</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Cloud Systems & Wireless IoT"
                    value={classTitle}
                    onChange={(e) => setClassTitle(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-white text-xs focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Department</label>
                  <select
                    value={classDept}
                    onChange={(e) => setClassDept(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 text-slate-200 rounded-xl p-2.5 text-xs focus:ring-1 focus:ring-indigo-500"
                  >
                    <option value="Computer Science & Engineering">Computer Science & Engineering</option>
                    <option value="Electrical Engineering">Electrical Engineering</option>
                    <option value="Information Technology">Information Technology</option>
                    <option value="Data Science & AI">Data Science & AI</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-300 font-medium mb-1">Credits</label>
                  <input
                    type="number"
                    min="1"
                    max="6"
                    value={classCredits}
                    onChange={(e) => setClassCredits(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-white text-xs focus:ring-1 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-medium mb-1">Default Classroom</label>
                  <input
                    type="text"
                    value={classRoom}
                    onChange={(e) => setClassRoom(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-white text-xs focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
              </div>

              {/* FACULTY MAPPING SECTION */}
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                <label className="block text-slate-200 font-bold flex items-center space-x-1.5">
                  <UserCheck className="w-4 h-4 text-teal-400" />
                  <span>Map Faculty Instructor to Class</span>
                </label>
                <p className="text-[11px] text-slate-400">
                  Select the faculty member who will conduct lectures and broadcast the BLE beacon.
                </p>

                <select
                  value={selectedFacultyId}
                  onChange={(e) => setSelectedFacultyId(Number(e.target.value))}
                  className="w-full bg-slate-900 border border-slate-700 text-slate-200 rounded-xl p-2.5 text-xs font-semibold focus:ring-1 focus:ring-teal-500"
                >
                  {faculty.map((f) => (
                    <option key={f.id} value={f.id}>
                      👨‍🏫 {f.fullName} ({f.identifierCode}) — {f.department}
                    </option>
                  ))}
                </select>
              </div>

              {/* STUDENT ENROLLMENT SELECTOR */}
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="block text-slate-200 font-bold flex items-center space-x-1.5">
                    <GraduationCap className="w-4 h-4 text-indigo-400" />
                    <span>Enroll Students in Class ({selectedStudentIds.length} Selected)</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      if (selectedStudentIds.length === students.length) setSelectedStudentIds([]);
                      else setSelectedStudentIds(students.map((s) => s.id));
                    }}
                    className="text-[11px] text-indigo-400 hover:text-indigo-300 font-semibold cursor-pointer"
                  >
                    {selectedStudentIds.length === students.length ? 'Deselect All' : 'Select All Registered'}
                  </button>
                </div>

                <div className="max-h-44 overflow-y-auto space-y-1.5 pr-1 divide-y divide-slate-800/60">
                  {students.map((stu) => {
                    const isChecked = selectedStudentIds.includes(stu.id);
                    return (
                      <label
                        key={stu.id}
                        className={`flex items-center justify-between p-2 rounded-lg cursor-pointer transition-colors ${
                          isChecked ? 'bg-indigo-950/40 text-white' : 'text-slate-400 hover:bg-slate-900'
                        }`}
                      >
                        <div className="flex items-center space-x-2.5">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => {
                              if (isChecked) setSelectedStudentIds(selectedStudentIds.filter((id) => id !== stu.id));
                              else setSelectedStudentIds([...selectedStudentIds, stu.id]);
                            }}
                            className="rounded bg-slate-900 border-slate-700 text-indigo-600 focus:ring-indigo-500 w-3.5 h-3.5 accent-indigo-600"
                          />
                          <div>
                            <div className="font-semibold text-white">{stu.fullName}</div>
                            <div className="text-[10px] text-slate-400 font-mono">
                              {stu.identifierCode} • {stu.email}
                            </div>
                          </div>
                        </div>
                        <span className="text-[10px] bg-slate-800 px-2 py-0.5 rounded text-slate-300">
                          Sem {stu.semester || 6}
                        </span>
                      </label>
                    );
                  })}
                </div>
              </div>

              <div className="pt-3 border-t border-slate-800 flex items-center justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setShowCreateClassModal(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-medium cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-xl shadow-lg shadow-indigo-600/30 cursor-pointer"
                >
                  Create Class & Save Mapping
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: UPLOAD EXCEL / CSV / BULK PASTE STUDENT ROSTER */}
      {showUploadModal && selectedCourseForUpload && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-2xl w-full p-6 sm:p-7 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-150 max-h-[92vh] flex flex-col">
            <div className="flex items-start justify-between border-b border-slate-800/80 pb-3.5">
              <div>
                <div className="flex items-center space-x-2">
                  <span className="text-xs font-bold px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 font-mono">
                    {selectedCourseForUpload.code}
                  </span>
                  <h3 className="text-lg font-bold text-white flex items-center space-x-2">
                    <FileSpreadsheet className="w-5 h-5 text-indigo-400" />
                    <span>Upload Student Roster (Excel / CSV)</span>
                  </h3>
                </div>
                <p className="text-xs text-slate-400 mt-1">
                  Course: <span className="text-slate-200 font-medium">{selectedCourseForUpload.title}</span> • Instructor:{' '}
                  <span className="text-indigo-400 font-medium">{selectedCourseForUpload.facultyName}</span>
                </p>
              </div>
              <button
                onClick={() => setShowUploadModal(false)}
                className="text-slate-400 hover:text-white text-base p-1"
              >
                ✕
              </button>
            </div>

            {uploadFeedback && (
              <div
                className={`p-3 rounded-xl border text-xs flex items-center space-x-2 ${
                  uploadFeedback.startsWith('Error') || uploadFeedback.startsWith('Failed')
                    ? 'bg-rose-500/10 border-rose-500/30 text-rose-300'
                    : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                }`}
              >
                {uploadFeedback.startsWith('Error') || uploadFeedback.startsWith('Failed') ? (
                  <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                ) : (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                )}
                <span>{uploadFeedback}</span>
              </div>
            )}

            <form onSubmit={handleBulkUpload} className="space-y-4 text-xs flex-1 overflow-y-auto pr-1">
              {/* Excel Template & Quick Actions */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={downloadStudentExcelTemplate}
                  className="flex items-center justify-center space-x-2 p-2.5 rounded-xl bg-slate-800/70 hover:bg-slate-800 border border-slate-700/60 text-slate-200 hover:text-white transition-all cursor-pointer font-medium"
                >
                  <Download className="w-4 h-4 text-emerald-400" />
                  <span>Download Sample .xlsx Template</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setBulkCsvText(
                      "RA2411003020197\tK S CHAKRADHAR DANESH\nRA2411003020230\tAKHILESH\nRA2411003020234\tP JASHWANTH\nRA2411003020240\tSNEHA REDDY\nRA2411003020245\tROHAN VERMA"
                    );
                    setUploadFeedback('Loaded sample SRMIST roster format (Reg No & Name)');
                  }}
                  className="flex items-center justify-center space-x-2 p-2.5 rounded-xl bg-indigo-950/40 hover:bg-indigo-900/40 border border-indigo-500/30 text-indigo-300 hover:text-white transition-all cursor-pointer font-medium"
                >
                  <Sparkles className="w-4 h-4 text-indigo-400" />
                  <span>Use SRMIST Format (from Screenshot)</span>
                </button>
              </div>

              {/* File upload drag drop button for Excel */}
              <div>
                <label className="block text-slate-300 font-medium mb-1">
                  Upload Excel (.xlsx, .xls) or CSV Roster
                </label>
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-slate-700 hover:border-indigo-500 p-4 rounded-2xl text-center cursor-pointer bg-slate-950/60 hover:bg-slate-900/80 transition-colors group"
                >
                  <div className="w-10 h-10 rounded-xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center mx-auto mb-2 group-hover:scale-105 transition-transform">
                    <Upload className="w-5 h-5 text-indigo-400" />
                  </div>
                  <span className="text-white font-semibold">Drop or click to select Excel (.xlsx, .xls, .csv) file</span>
                  <p className="text-[11px] text-slate-400 mt-1">
                    Columns required: <strong>REG NO</strong> & <strong>NAME</strong> (e.g. RA2411003020197, K S CHAKRADHAR DANESH)
                  </p>
                  <input
                    type="file"
                    ref={fileInputRef}
                    accept=".xlsx,.xls,.csv,.txt"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                </div>
              </div>

              {/* Paste or edit raw text */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-slate-300 font-medium">
                    Or Paste Columns Direct from Excel (Tab / Comma Separated)
                  </label>
                  <span className="text-[10px] text-slate-400 font-mono">Format: REG NO [Tab] NAME</span>
                </div>
                <textarea
                  rows={4}
                  value={bulkCsvText}
                  onChange={(e) => setBulkCsvText(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700/80 rounded-xl p-2.5 font-mono text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  placeholder="RA2411003020197	K S CHAKRADHAR DANESH&#10;RA2411003020230	AKHILESH&#10;RA2411003020234	P JASHWANTH"
                />
              </div>

              {/* Live Parsed Preview Table */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-slate-300 font-semibold flex items-center space-x-1.5">
                    <span>Parsed Roster Preview</span>
                    <span className="bg-emerald-500/20 text-emerald-300 text-[10px] px-2 py-0.5 rounded-full font-mono font-bold">
                      {previewStudentRows.length} students detected
                    </span>
                  </span>
                  <span className="text-[10px] text-slate-400">
                    Auto-generated password: <strong className="text-slate-200">&lt;RegNo&gt;@2026</strong>
                  </span>
                </div>

                <div className="max-h-36 overflow-y-auto rounded-xl border border-slate-800 bg-slate-950/70">
                  <table className="w-full text-left text-[11px] text-slate-300">
                    <thead className="bg-slate-900 sticky top-0 border-b border-slate-800 text-slate-400 text-[10px] uppercase font-mono tracking-wider">
                      <tr>
                        <th className="py-1.5 px-3">#</th>
                        <th className="py-1.5 px-3">Reg No</th>
                        <th className="py-1.5 px-3">Student Name</th>
                        <th className="py-1.5 px-3">Default Password</th>
                        <th className="py-1.5 px-3 text-right">Account Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60 font-mono">
                      {previewStudentRows.slice(0, 15).map((row, idx) => (
                        <tr key={idx} className="hover:bg-slate-900/50">
                          <td className="py-1.5 px-3 text-slate-500">{idx + 1}</td>
                          <td className="py-1.5 px-3 font-bold text-indigo-300">{row.regNo}</td>
                          <td className="py-1.5 px-3 font-sans text-white">{row.name}</td>
                          <td className="py-1.5 px-3 text-emerald-400">{row.passwordPreview}</td>
                          <td className="py-1.5 px-3 text-right text-emerald-400 font-sans text-[10px]">
                            Auto-Create & Enroll
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Informative Security & Credentials Note */}
              <div className="p-3 rounded-xl bg-slate-800/50 border border-slate-700/60 text-[11px] text-slate-300 flex items-start space-x-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <p>
                  Students can log in to the mobile app or web portal immediately using their <strong>Registration Number</strong> and default password. They will be automatically enrolled in <strong>{selectedCourseForUpload.code}</strong>.
                </p>
              </div>

              <div className="pt-2 border-t border-slate-800 flex items-center justify-between">
                <span className="text-[11px] text-slate-400">
                  Total: {previewStudentRows.length} student records
                </span>
                <div className="flex items-center space-x-2">
                  <button
                    type="button"
                    onClick={() => setShowUploadModal(false)}
                    className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-medium cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={previewStudentRows.length === 0}
                    className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-semibold rounded-xl shadow-lg shadow-indigo-600/30 cursor-pointer"
                  >
                    Import & Enroll ({previewStudentRows.length}) Students
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: VIEW CLASS ROSTER DRAWER */}
      {selectedCourseForRoster && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-xl w-full p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-150 max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <div className="flex items-center space-x-2">
                  <span className="text-xs font-bold px-2.5 py-0.5 rounded bg-indigo-500/20 text-indigo-300 font-mono">
                    {selectedCourseForRoster.code}
                  </span>
                  <h3 className="text-lg font-bold text-white">Class Roster</h3>
                </div>
                <p className="text-xs text-slate-400 mt-0.5">
                  Instructor: <strong className="text-white">{selectedCourseForRoster.facultyName}</strong>
                </p>
              </div>
              <button
                onClick={() => setSelectedCourseForRoster(null)}
                className="text-slate-400 hover:text-white text-sm"
              >
                ✕
              </button>
            </div>

            {/* Students List in this Course */}
            <div className="flex-1 overflow-y-auto space-y-2 pr-1">
              {(() => {
                const enrolledIds = selectedCourseForRoster.enrolledStudentIds || [];
                const enrolledList = students.filter((s) => enrolledIds.includes(s.id));

                if (enrolledList.length === 0) {
                  return (
                    <div className="p-8 text-center text-slate-400 text-xs bg-slate-950/60 rounded-xl border border-slate-800">
                      No students are currently enrolled in this class. Click "Upload Students" to import a roster.
                    </div>
                  );
                }

                return enrolledList.map((stu) => (
                  <div
                    key={stu.id}
                    className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 flex items-center justify-between text-xs"
                  >
                    <div className="flex items-center space-x-2.5">
                      <div className="w-7 h-7 rounded-full bg-emerald-500/20 text-emerald-300 flex items-center justify-center font-bold text-[11px]">
                        {stu.fullName[0]}
                      </div>
                      <div>
                        <div className="font-semibold text-white">{stu.fullName}</div>
                        <div className="text-[10px] text-slate-400 font-mono">
                          {stu.identifierCode} • {stu.email}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center space-x-3">
                      <span className="text-[10px] text-slate-400">Sem {stu.semester || 6}</span>
                      <button
                        onClick={() => {
                          appStore.toggleStudentEnrollment(selectedCourseForRoster.id, stu.id);
                        }}
                        className="text-slate-500 hover:text-rose-400 p-1 cursor-pointer"
                        title="Remove student from class"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ));
              })()}
            </div>

            <div className="pt-3 border-t border-slate-800 flex items-center justify-between">
              <span className="text-xs text-slate-400">
                Total: {(selectedCourseForRoster.enrolledStudentIds || []).length} Students
              </span>
              <button
                onClick={() => setSelectedCourseForRoster(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-semibold cursor-pointer"
              >
                Close Roster
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 4: CREATE FACULTY OR STUDENT ACCOUNT */}
      {showCreateUserModal && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-lg font-bold text-white flex items-center space-x-2">
                <UserPlus className="w-5 h-5 text-indigo-400" />
                <span>Create Institutional Account</span>
              </h3>
              <button
                onClick={() => setShowCreateUserModal(false)}
                className="text-slate-400 hover:text-white text-sm"
              >
                ✕
              </button>
            </div>

            {userFormError && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center space-x-2">
                <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                <span>{userFormError}</span>
              </div>
            )}

            {userFormSuccess && (
              <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center space-x-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>{userFormSuccess}</span>
              </div>
            )}

            <form onSubmit={handleCreateUser} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-300 font-medium mb-1.5">Account Role</label>
                <div className="grid grid-cols-2 gap-3">
                  <div
                    onClick={() => {
                      setCreateRole('STUDENT');
                      if (!createIdentifier || createIdentifier.startsWith('EMP-')) setCreateIdentifier('CS2026-006');
                    }}
                    className={`p-3 rounded-xl border flex items-center space-x-2.5 cursor-pointer transition-all ${
                      createRole === 'STUDENT'
                        ? 'bg-emerald-950/40 border-emerald-500 text-emerald-300 shadow'
                        : 'bg-slate-800/40 border-slate-800 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <GraduationCap className="w-4 h-4" />
                    <div>
                      <div className="font-bold text-white text-xs">Student Account</div>
                      <div className="text-[10px] text-slate-400">College Reg ID & Semester</div>
                    </div>
                  </div>

                  <div
                    onClick={() => {
                      setCreateRole('FACULTY');
                      if (!createIdentifier || createIdentifier.startsWith('CS2026-')) setCreateIdentifier('EMP-CS-0088');
                    }}
                    className={`p-3 rounded-xl border flex items-center space-x-2.5 cursor-pointer transition-all ${
                      createRole === 'FACULTY'
                        ? 'bg-indigo-950/40 border-indigo-500 text-indigo-300 shadow'
                        : 'bg-slate-800/40 border-slate-800 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <UserCheck className="w-4 h-4" />
                    <div>
                      <div className="font-bold text-white text-xs">Faculty Account</div>
                      <div className="text-[10px] text-slate-400">Employee Code & BLE Beacon</div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Full Name</label>
                  <input
                    type="text"
                    required
                    placeholder={createRole === 'STUDENT' ? 'e.g. Maya Lin' : 'e.g. Dr. Robert Vance'}
                    value={createFullName}
                    onChange={(e) => setCreateFullName(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-white text-xs focus:ring-1 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-medium mb-1">University Email</label>
                  <input
                    type="email"
                    required
                    placeholder={createRole === 'STUDENT' ? 'student@university.edu' : 'faculty@university.edu'}
                    value={createEmail}
                    onChange={(e) => setCreateEmail(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-white text-xs focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-medium mb-1">
                    {createRole === 'STUDENT' ? 'Registration Number (Unique)' : 'Employee Code (Unique)'}
                  </label>
                  <input
                    type="text"
                    required
                    placeholder={createRole === 'STUDENT' ? 'e.g. CS2026-006' : 'e.g. EMP-CS-0088'}
                    value={createIdentifier}
                    onChange={(e) => setCreateIdentifier(e.target.value.toUpperCase())}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-white text-xs font-mono uppercase focus:ring-1 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-medium mb-1">Initial Password</label>
                  <input
                    type="password"
                    required
                    value={createPassword}
                    onChange={(e) => setCreatePassword(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-white text-xs focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Department</label>
                  <select
                    value={createDepartment}
                    onChange={(e) => setCreateDepartment(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 text-slate-200 rounded-xl p-2.5 text-xs focus:ring-1 focus:ring-indigo-500"
                  >
                    <option value="Computer Science & Engineering">Computer Science & Engineering</option>
                    <option value="Electrical Engineering">Electrical Engineering</option>
                    <option value="Mechanical Engineering">Mechanical Engineering</option>
                    <option value="Information Technology">Information Technology</option>
                    <option value="Data Science & AI">Data Science & AI</option>
                  </select>
                </div>

                {createRole === 'STUDENT' ? (
                  <div>
                    <label className="block text-slate-300 font-medium mb-1">Semester</label>
                    <select
                      value={createSemester}
                      onChange={(e) => setCreateSemester(Number(e.target.value))}
                      className="w-full bg-slate-950 border border-slate-700 text-slate-200 rounded-xl p-2.5 text-xs focus:ring-1 focus:ring-indigo-500"
                    >
                      {[1, 2, 3, 4, 5, 6, 7, 8].map((sem) => (
                        <option key={sem} value={sem}>
                          Semester {sem}
                        </option>
                      ))}
                    </select>
                  </div>
                ) : (
                  <div>
                    <label className="block text-slate-300 font-medium mb-1">Designation</label>
                    <select
                      value={createDesignation}
                      onChange={(e) => setCreateDesignation(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-700 text-slate-200 rounded-xl p-2.5 text-xs focus:ring-1 focus:ring-indigo-500"
                    >
                      <option value="Assistant Professor">Assistant Professor</option>
                      <option value="Associate Professor">Associate Professor</option>
                      <option value="Professor">Professor</option>
                      <option value="Department Head (HOD)">Department Head (HOD)</option>
                    </select>
                  </div>
                )}
              </div>

              <div className="pt-3 border-t border-slate-800 flex items-center justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setShowCreateUserModal(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-medium cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-xl shadow-lg shadow-indigo-600/30 cursor-pointer"
                >
                  Create {createRole} Account
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 5: BULK UPLOAD FACULTY VIA EXCEL / CSV */}
      {showFacultyUploadModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-2xl w-full p-6 sm:p-7 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-150 max-h-[92vh] flex flex-col">
            <div className="flex items-start justify-between border-b border-slate-800/80 pb-3.5">
              <div>
                <h3 className="text-lg font-bold text-white flex items-center space-x-2">
                  <FileSpreadsheet className="w-5 h-5 text-teal-400" />
                  <span>Bulk Upload Faculty Accounts (Excel / CSV)</span>
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  Upload an Excel sheet of professors and instructors. Accounts and default login credentials will be automatically generated.
                </p>
              </div>
              <button
                onClick={() => setShowFacultyUploadModal(false)}
                className="text-slate-400 hover:text-white text-base p-1"
              >
                ✕
              </button>
            </div>

            {facultyUploadFeedback && (
              <div
                className={`p-3 rounded-xl border text-xs flex items-center space-x-2 ${
                  facultyUploadFeedback.startsWith('Error') || facultyUploadFeedback.startsWith('Failed')
                    ? 'bg-rose-500/10 border-rose-500/30 text-rose-300'
                    : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                }`}
              >
                {facultyUploadFeedback.startsWith('Error') || facultyUploadFeedback.startsWith('Failed') ? (
                  <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                ) : (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                )}
                <span>{facultyUploadFeedback}</span>
              </div>
            )}

            <form onSubmit={handleBulkFacultyUpload} className="space-y-4 text-xs flex-1 overflow-y-auto pr-1">
              {/* Template & Quick Actions */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={downloadFacultyExcelTemplate}
                  className="flex items-center justify-center space-x-2 p-2.5 rounded-xl bg-slate-800/70 hover:bg-slate-800 border border-slate-700/60 text-slate-200 hover:text-white transition-all cursor-pointer font-medium"
                >
                  <Download className="w-4 h-4 text-teal-400" />
                  <span>Download Faculty .xlsx Template</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setFacultyBulkText(
                      "EMP-CS-0050\tDr. Arvind Swaminathan\tComputer Science & Engineering\tAssociate Professor\nEMP-CS-0051\tProf. Meenakshi Sundaram\tComputer Science & Engineering\tProfessor\nEMP-CS-0052\tDr. Rajesh Kanna\tComputer Science & Engineering\tAssistant Professor\nEMP-CS-0053\tDr. Priya Anand\tComputer Science & Engineering\tAssistant Professor"
                    );
                    setFacultyUploadFeedback('Loaded sample faculty roster data');
                  }}
                  className="flex items-center justify-center space-x-2 p-2.5 rounded-xl bg-teal-950/40 hover:bg-teal-900/40 border border-teal-500/30 text-teal-300 hover:text-white transition-all cursor-pointer font-medium"
                >
                  <Sparkles className="w-4 h-4 text-teal-400" />
                  <span>Load Sample Faculty List</span>
                </button>
              </div>

              {/* Upload Box */}
              <div>
                <label className="block text-slate-300 font-medium mb-1">
                  Upload Excel (.xlsx, .xls) or CSV File
                </label>
                <div
                  onClick={() => facultyFileInputRef.current?.click()}
                  className="border-2 border-dashed border-slate-700 hover:border-teal-500 p-4 rounded-2xl text-center cursor-pointer bg-slate-950/60 hover:bg-slate-900/80 transition-colors group"
                >
                  <div className="w-10 h-10 rounded-xl bg-teal-500/10 text-teal-400 flex items-center justify-center mx-auto mb-2 group-hover:scale-105 transition-transform">
                    <Upload className="w-5 h-5 text-teal-400" />
                  </div>
                  <span className="text-white font-semibold">Drop or click to select Faculty Excel (.xlsx, .xls) file</span>
                  <p className="text-[11px] text-slate-400 mt-1">
                    Columns: <strong>EMP CODE</strong>, <strong>FACULTY NAME</strong>, <strong>DEPARTMENT</strong> (optional), <strong>DESIGNATION</strong> (optional)
                  </p>
                  <input
                    type="file"
                    ref={facultyFileInputRef}
                    accept=".xlsx,.xls,.csv,.txt"
                    onChange={handleFacultyFileUpload}
                    className="hidden"
                  />
                </div>
              </div>

              {/* Paste Text */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-slate-300 font-medium">
                    Or Paste Faculty List Direct from Excel
                  </label>
                  <span className="text-[10px] text-slate-400 font-mono">Format: EMP CODE [Tab] NAME [Tab] DEPARTMENT</span>
                </div>
                <textarea
                  rows={4}
                  value={facultyBulkText}
                  onChange={(e) => setFacultyBulkText(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700/80 rounded-xl p-2.5 font-mono text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-teal-500"
                />
              </div>

              {/* Live Preview Table */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-slate-300 font-semibold flex items-center space-x-1.5">
                    <span>Parsed Faculty Preview</span>
                    <span className="bg-teal-500/20 text-teal-300 text-[10px] px-2 py-0.5 rounded-full font-mono font-bold">
                      {previewFacultyRows.length} faculty members
                    </span>
                  </span>
                  <span className="text-[10px] text-slate-400">
                    Default login password: <strong className="text-slate-200">Faculty@1234</strong>
                  </span>
                </div>

                <div className="max-h-36 overflow-y-auto rounded-xl border border-slate-800 bg-slate-950/70">
                  <table className="w-full text-left text-[11px] text-slate-300">
                    <thead className="bg-slate-900 sticky top-0 border-b border-slate-800 text-slate-400 text-[10px] uppercase font-mono tracking-wider">
                      <tr>
                        <th className="py-1.5 px-3">#</th>
                        <th className="py-1.5 px-3">Employee Code</th>
                        <th className="py-1.5 px-3">Faculty Name</th>
                        <th className="py-1.5 px-3">Department</th>
                        <th className="py-1.5 px-3 text-right">Designation</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60 font-mono">
                      {previewFacultyRows.map((row, idx) => (
                        <tr key={idx} className="hover:bg-slate-900/50">
                          <td className="py-1.5 px-3 text-slate-500">{idx + 1}</td>
                          <td className="py-1.5 px-3 font-bold text-teal-300">{row.empCode}</td>
                          <td className="py-1.5 px-3 font-sans text-white">{row.name}</td>
                          <td className="py-1.5 px-3 text-slate-400 font-sans">{row.dept}</td>
                          <td className="py-1.5 px-3 text-right text-indigo-400 font-sans text-[10px]">
                            {row.desig}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-800 flex items-center justify-between">
                <span className="text-[11px] text-slate-400">
                  Total: {previewFacultyRows.length} faculty records
                </span>
                <div className="flex items-center space-x-2">
                  <button
                    type="button"
                    onClick={() => setShowFacultyUploadModal(false)}
                    className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-medium cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={previewFacultyRows.length === 0}
                    className="px-5 py-2 bg-teal-600 hover:bg-teal-500 disabled:opacity-50 text-white font-semibold rounded-xl shadow-lg shadow-teal-600/30 cursor-pointer"
                  >
                    Import ({previewFacultyRows.length}) Faculty Accounts
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
