import React, { useEffect, useMemo, useState } from 'react';
import { User } from 'firebase/auth';
import {
  BookOpen,
  BookOpenCheck,
  Building2,
  CalendarCheck2,
  CalendarClock,
  CheckCircle2,
  Clock,
  ExternalLink,
  FileSpreadsheet,
  FolderArchive,
  Globe2,
  GraduationCap,
  LayoutDashboard,
  LogOut,
  Moon,
  QrCode,
  RefreshCw,
  Settings,
  Sun,
  UploadCloud,
  UserCheck,
  Users,
  X,
} from 'lucide-react';
import {
  INITIAL_ANNOUNCEMENTS,
  INITIAL_ATTEMPTS,
  INITIAL_ATTENDANCE,
  INITIAL_DOCUMENTS,
  INITIAL_INSTITUTIONS,
  INITIAL_LEARNERS,
  INITIAL_LEAVE_REQUESTS,
  INITIAL_MODULES,
  INITIAL_NOTIFICATIONS,
  INITIAL_QUIZZES,
  INITIAL_SCHEDULES,
  INITIAL_SUBJECTS,
} from './data/seedData';
import {
  clearAccessToken,
  getAccessToken,
  googleSignIn,
  initAuth,
  logout,
} from './services/googleAuth';
import {
  deleteDriveFile,
  ensureWorkspaceResources,
  incrementalSyncToSheets,
  loadFromSheets,
  previewIncrementalDelta,
  sendTutorAlertEmail,
  uploadFileToDrive,
  uploadTextReportToDrive,
  WorkspaceDataset,
} from './services/googleWorkspace';
import {
  enqueueOfflineAttendance,
  getAllOfflineAttendance,
  getPendingOfflineAttendance,
  getSyncBaseline,
  markOfflineAttendanceSynced,
  saveSyncBaseline,
} from './services/offlineDb';
import {
  ActiveView,
  Announcement,
  AttendanceRecord,
  DocumentCategory,
  Institution,
  Learner,
  LearnerDocument,
  LearningMode,
  LearningModule,
  LeaveRequest,
  Quiz,
  QuizAttempt,
  QuizQuestion,
  ScheduleItem,
  SubjectMaster,
  SyncBaseline,
  TutorNotification,
} from './types';
import { AnalyticsDashboard } from './components/AnalyticsDashboard';
import { AttendanceTracker } from './components/AttendanceTracker';
import { ConfirmDialog } from './components/ConfirmDialog';
import { DinasDashboard } from './components/DinasDashboard';
import { GoogleSignInButton } from './components/GoogleSignInButton';
import { IdCardPrinter } from './components/IdCardPrinter';
import { InstitutionSettings } from './components/InstitutionSettings';
import { LearnerManagement } from './components/LearnerManagement';
import { LearnerPortal } from './components/LearnerPortal';
import { ModuleManager } from './components/ModuleManager';
import { PortfolioAndDocuments } from './components/PortfolioAndDocuments';
import { QuizSystem } from './components/QuizSystem';
import { ScheduleAndInfo } from './components/ScheduleAndInfo';
import {
  StandaloneExamView,
  StandaloneQrProfile,
} from './components/StandaloneViews';

const STORAGE_KEY = 'pkbm_digital_workspace_v3';
const THEME_KEY = 'pkbm_digital_theme';

interface PersistedAppState {
  institutions: Institution[];
  activeInstitutionId: string;
  learners: Learner[];
  documents: LearnerDocument[];
  attendance: AttendanceRecord[];
  subjects: SubjectMaster[];
  modules: LearningModule[];
  schedules: ScheduleItem[];
  announcements: Announcement[];
  quizzes: Quiz[];
  attempts: QuizAttempt[];
  leaveRequests: LeaveRequest[];
  notifications: TutorNotification[];
}

function loadPersistedState(): PersistedAppState {
  try {
    const raw =
      localStorage.getItem(STORAGE_KEY) ||
      localStorage.getItem('lentera_belajar_multi_v2');
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<PersistedAppState>;
      return {
        institutions: parsed.institutions?.length
          ? parsed.institutions
          : INITIAL_INSTITUTIONS,
        activeInstitutionId:
          parsed.activeInstitutionId || INITIAL_INSTITUTIONS[0].id,
        learners: parsed.learners?.length ? parsed.learners : INITIAL_LEARNERS,
        documents: parsed.documents || INITIAL_DOCUMENTS,
        attendance: parsed.attendance?.length
          ? parsed.attendance
          : INITIAL_ATTENDANCE,
        subjects: parsed.subjects?.length ? parsed.subjects : INITIAL_SUBJECTS,
        modules: parsed.modules?.length ? parsed.modules : INITIAL_MODULES,
        schedules: parsed.schedules?.length
          ? parsed.schedules
          : INITIAL_SCHEDULES,
        announcements: parsed.announcements?.length
          ? parsed.announcements
          : INITIAL_ANNOUNCEMENTS,
        quizzes: parsed.quizzes?.length ? parsed.quizzes : INITIAL_QUIZZES,
        attempts: parsed.attempts || INITIAL_ATTEMPTS,
        leaveRequests: parsed.leaveRequests || INITIAL_LEAVE_REQUESTS,
        notifications: parsed.notifications || INITIAL_NOTIFICATIONS,
      };
    }
  } catch {
    // fallback to seed
  }
  return {
    institutions: INITIAL_INSTITUTIONS,
    activeInstitutionId: INITIAL_INSTITUTIONS[0].id,
    learners: INITIAL_LEARNERS,
    documents: INITIAL_DOCUMENTS,
    attendance: INITIAL_ATTENDANCE,
    subjects: INITIAL_SUBJECTS,
    modules: INITIAL_MODULES,
    schedules: INITIAL_SCHEDULES,
    announcements: INITIAL_ANNOUNCEMENTS,
    quizzes: INITIAL_QUIZZES,
    attempts: INITIAL_ATTEMPTS,
    leaveRequests: INITIAL_LEAVE_REQUESTS,
    notifications: INITIAL_NOTIFICATIONS,
  };
}

interface PendingConfirmState {
  title: string;
  description: string;
  details?: string[];
  confirmLabel: string;
  tone?: 'primary' | 'danger';
  action: () => Promise<void>;
}

function formatWibClock(date: Date): string {
  const days = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];
  const months = [
    'Jan',
    'Feb',
    'Mar',
    'Apr',
    'Mei',
    'Jun',
    'Jul',
    'Agt',
    'Sep',
    'Okt',
    'Nov',
    'Des',
  ];
  const d = days[date.getDay()];
  const tgl = String(date.getDate()).padStart(2, '0');
  const bln = months[date.getMonth()];
  const thn = date.getFullYear();
  const hh = String(date.getHours()).padStart(2, '0');
  const mm = String(date.getMinutes()).padStart(2, '0');
  const ss = String(date.getSeconds()).padStart(2, '0');
  return `${d}, ${tgl} ${bln} ${thn} · ${hh}:${mm}:${ss} WIB`;
}

export default function App() {
  const initialState = useMemo(() => loadPersistedState(), []);

  const initialQueryParams = useMemo(() => {
    if (typeof window === 'undefined') {
      return { nisn: null, verify: null, ujian: null };
    }
    const params = new URLSearchParams(window.location.search);
    return {
      nisn: params.get('nisn'),
      verify: params.get('verify'),
      ujian: params.get('ujian'),
    };
  }, []);

  const [standaloneNisn, setStandaloneNisn] = useState<string | null>(
    initialQueryParams.nisn || initialQueryParams.verify
  );
  const [standaloneExamCode, setStandaloneExamCode] = useState<string | null>(
    initialQueryParams.ujian
  );

  const [activeView, setActiveView] = useState<ActiveView>('dashboard');
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    try {
      const saved = localStorage.getItem(THEME_KEY);
      if (saved === 'dark' || saved === 'light') return saved;
    } catch {
      // ignore
    }
    return 'light';
  });
  const [clockText, setClockText] = useState<string>(() =>
    formatWibClock(new Date())
  );

  // Multi-institution & Domain State
  const [institutions, setInstitutions] = useState<Institution[]>(
    initialState.institutions
  );
  const [activeInstitutionId, setActiveInstitutionId] = useState<string>(
    initialState.activeInstitutionId
  );
  const [learners, setLearners] = useState<Learner[]>(initialState.learners);
  const [documents, setDocuments] = useState<LearnerDocument[]>(
    initialState.documents
  );
  const [attendance, setAttendance] = useState<AttendanceRecord[]>(
    initialState.attendance
  );
  const [subjects, setSubjects] = useState<SubjectMaster[]>(
    initialState.subjects
  );
  const [modules, setModules] = useState<LearningModule[]>(
    initialState.modules
  );
  const [schedules, setSchedules] = useState<ScheduleItem[]>(
    initialState.schedules
  );
  const [announcements, setAnnouncements] = useState<Announcement[]>(
    initialState.announcements
  );
  const [quizzes, setQuizzes] = useState<Quiz[]>(initialState.quizzes);
  const [attempts, setAttempts] = useState<QuizAttempt[]>(initialState.attempts);
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>(
    initialState.leaveRequests
  );
  const [notifications, setNotifications] = useState<TutorNotification[]>(
    initialState.notifications
  );

  // Sub-navigation state
  const [selectedLearnerId, setSelectedLearnerId] = useState<string | null>(
    null
  );
  const [cardTargetLearnerId, setCardTargetLearnerId] = useState<string | null>(
    null
  );
  const [quizDefaultTab, setQuizDefaultTab] = useState<
    'buat-soal' | 'pengerjaan' | 'hasil'
  >('buat-soal');
  const [quizPreselectedLearnerId, setQuizPreselectedLearnerId] = useState<
    string | null
  >(null);
  const [quizPreselectedQuizId, setQuizPreselectedQuizId] = useState<
    string | null
  >(null);

  // Auth & Sync State
  const [user, setUser] = useState<User | null>(null);
  const [needsAuth, setNeedsAuth] = useState(true);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncBaseline, setSyncBaseline] = useState<SyncBaseline | null>(null);

  // Offline-first IndexedDB State
  const [isOnlineBrowser, setIsOnlineBrowser] = useState<boolean>(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );
  const [isOfflineSimulated, setIsOfflineSimulated] = useState(false);
  const [pendingOfflineCount, setPendingOfflineCount] = useState(0);

  // Toast, Confirmation & WhatsApp Dispatch Modal
  const [toast, setToast] = useState<{
    type: 'success' | 'error' | 'info';
    text: string;
  } | null>(null);
  const [confirmState, setConfirmState] = useState<PendingConfirmState | null>(
    null
  );
  const [confirmLoading, setConfirmLoading] = useState(false);
  const [waPreviewModal, setWaPreviewModal] = useState<{
    notif: TutorNotification;
    url: string;
    message: string;
  } | null>(null);

  // Apply Dark Mode class on <html>
  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
    try {
      localStorage.setItem(THEME_KEY, theme);
    } catch {
      // ignore
    }
  }, [theme]);

  // Live WIB Clock
  useEffect(() => {
    const id = window.setInterval(() => {
      setClockText(formatWibClock(new Date()));
    }, 1000);
    return () => window.clearInterval(id);
  }, []);

  const activeInstitution = useMemo(
    () =>
      institutions.find((i) => i.id === activeInstitutionId) || institutions[0],
    [institutions, activeInstitutionId]
  );

  // Scoped datasets for the active institution
  const instLearners = useMemo(
    () => learners.filter((l) => l.institutionId === activeInstitution.id),
    [learners, activeInstitution.id]
  );
  const instDocuments = useMemo(
    () => documents.filter((d) => d.institutionId === activeInstitution.id),
    [documents, activeInstitution.id]
  );
  const instAttendance = useMemo(
    () => attendance.filter((a) => a.institutionId === activeInstitution.id),
    [attendance, activeInstitution.id]
  );
  const instSubjects = useMemo(
    () => subjects.filter((s) => s.institutionId === activeInstitution.id),
    [subjects, activeInstitution.id]
  );
  const instModules = useMemo(
    () => modules.filter((m) => m.institutionId === activeInstitution.id),
    [modules, activeInstitution.id]
  );
  const instSchedules = useMemo(
    () => schedules.filter((s) => s.institutionId === activeInstitution.id),
    [schedules, activeInstitution.id]
  );
  const instAnnouncements = useMemo(
    () => announcements.filter((a) => a.institutionId === activeInstitution.id),
    [announcements, activeInstitution.id]
  );
  const instQuizzes = useMemo(
    () => quizzes.filter((q) => q.institutionId === activeInstitution.id),
    [quizzes, activeInstitution.id]
  );
  const instAttempts = useMemo(
    () => attempts.filter((a) => a.institutionId === activeInstitution.id),
    [attempts, activeInstitution.id]
  );
  const instLeaveRequests = useMemo(
    () => leaveRequests.filter((lr) => lr.institutionId === activeInstitution.id),
    [leaveRequests, activeInstitution.id]
  );
  const instNotifications = useMemo(
    () => notifications.filter((n) => n.institutionId === activeInstitution.id),
    [notifications, activeInstitution.id]
  );

  const instDataset: WorkspaceDataset = useMemo(
    () => ({
      learners: instLearners,
      documents: instDocuments,
      attendance: instAttendance,
      subjects: instSubjects,
      modules: instModules,
      schedules: instSchedules,
      announcements: instAnnouncements,
      quizzes: instQuizzes,
      attempts: instAttempts,
      leaveRequests: instLeaveRequests,
      notifications: instNotifications,
    }),
    [
      instLearners,
      instDocuments,
      instAttendance,
      instSubjects,
      instModules,
      instSchedules,
      instAnnouncements,
      instQuizzes,
      instAttempts,
      instLeaveRequests,
      instNotifications,
    ]
  );

  const deltaPreview = useMemo(
    () => previewIncrementalDelta(instDataset, syncBaseline?.hashes || {}),
    [instDataset, syncBaseline]
  );

  const showToast = (type: 'success' | 'error' | 'info', text: string) => {
    setToast({ type, text });
  };

  useEffect(() => {
    if (!toast) return;
    const t = window.setTimeout(() => setToast(null), 5500);
    return () => window.clearTimeout(t);
  }, [toast]);

  // Persist domain state
  useEffect(() => {
    try {
      const payload: PersistedAppState = {
        institutions,
        activeInstitutionId,
        learners,
        documents,
        attendance,
        subjects,
        modules,
        schedules,
        announcements,
        quizzes,
        attempts,
        leaveRequests,
        notifications,
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    } catch {
      // ignore quota error
    }
  }, [
    institutions,
    activeInstitutionId,
    learners,
    documents,
    attendance,
    subjects,
    modules,
    schedules,
    announcements,
    quizzes,
    attempts,
    leaveRequests,
    notifications,
  ]);

  // Load IndexedDB sync baseline & pending offline attendance on institution switch
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [baseline, pending, allOffline] = await Promise.all([
        getSyncBaseline(activeInstitution.id),
        getPendingOfflineAttendance(activeInstitution.id),
        getAllOfflineAttendance(activeInstitution.id),
      ]);
      if (cancelled) return;
      setSyncBaseline(baseline);
      setPendingOfflineCount(pending.length);
      if (allOffline.length > 0) {
        setAttendance((prev) => {
          const map = new Map<string, AttendanceRecord>();
          prev.forEach((a) => map.set(a.id, a));
          allOffline.forEach((o) => {
            if (o.pendingSync || !map.has(o.id)) map.set(o.id, o);
          });
          return Array.from(map.values());
        });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [activeInstitution.id]);

  // Browser online/offline listener
  useEffect(() => {
    const handleOnline = () => setIsOnlineBrowser(true);
    const handleOffline = () => setIsOnlineBrowser(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const handleSyncOfflineQueue = async () => {
    const pending = await getPendingOfflineAttendance(activeInstitution.id);
    if (pending.length === 0) return;
    await markOfflineAttendanceSynced(pending.map((p) => p.id));
    setAttendance((prev) =>
      prev.map((a) =>
        pending.some((p) => p.id === a.id) ? { ...a, pendingSync: false } : a
      )
    );
    setPendingOfflineCount(0);
    showToast(
      'success',
      `${pending.length} data presensi dari IndexedDB offline berhasil disinkronkan.`
    );
  };

  useEffect(() => {
    if (isOnlineBrowser && !isOfflineSimulated && pendingOfflineCount > 0) {
      void handleSyncOfflineQueue();
    }
  }, [isOnlineBrowser, isOfflineSimulated]);

  // Firebase Auth listener
  useEffect(() => {
    const unsubscribe = initAuth(
      (authedUser) => {
        setUser(authedUser);
        setNeedsAuth(false);
      },
      (maybeUser) => {
        setUser(maybeUser);
        setNeedsAuth(true);
      }
    );
    return () => unsubscribe();
  }, []);

  const requireToken = (): string | null => {
    const token = getAccessToken();
    if (!token) {
      setNeedsAuth(true);
      showToast(
        'error',
        'Sesi akses Google Workspace belum aktif. Silakan klik "Hubungkan Google".'
      );
      return null;
    }
    return token;
  };

  const updateInstitutionConfig = (
    instId: string,
    cfg: Institution['workspaceConfig']
  ) => {
    setInstitutions((prev) =>
      prev.map((inst) =>
        inst.id === instId ? { ...inst, workspaceConfig: cfg } : inst
      )
    );
  };

  const handleGoogleLogin = async () => {
    setIsLoggingIn(true);
    try {
      const res = await googleSignIn();
      if (res) {
        setUser(res.user);
        setNeedsAuth(false);
        setIsSyncing(true);
        const cfg = await ensureWorkspaceResources(
          res.accessToken,
          activeInstitution.workspaceConfig?.spreadsheetId,
          activeInstitution.workspaceConfig?.driveFolderId,
          activeInstitution.nama
        );
        updateInstitutionConfig(activeInstitution.id, {
          ...cfg,
          lastSyncedAt: activeInstitution.workspaceConfig?.lastSyncedAt,
        });
        showToast(
          'success',
          `Terhubung ke Google Sheets, Drive & Gmail untuk ${activeInstitution.nama}.`
        );
      }
    } catch (err) {
      showToast(
        'error',
        err instanceof Error ? err.message : 'Gagal masuk dengan akun Google.'
      );
    } finally {
      setIsLoggingIn(false);
      setIsSyncing(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    setUser(null);
    setNeedsAuth(true);
    showToast('info', 'Sesi Google Workspace diakhiri.');
  };

  const handleProvisionWorkspaceForInst = async (
    customSpreadsheetId?: string,
    customFolderId?: string
  ) => {
    const token = requireToken();
    if (!token) return;
    setIsSyncing(true);
    try {
      const cfg = await ensureWorkspaceResources(
        token,
        customSpreadsheetId,
        customFolderId,
        activeInstitution.nama
      );
      updateInstitutionConfig(activeInstitution.id, cfg);
      showToast(
        'success',
        `Resource Google Sheets & Drive untuk ${activeInstitution.nama} berhasil dihubungkan.`
      );
    } catch (err) {
      showToast(
        'error',
        err instanceof Error ? err.message : 'Gagal menghubungkan resource.'
      );
    } finally {
      setIsSyncing(false);
    }
  };

  // --- INCREMENTAL DELTA SYNC TO GOOGLE SHEETS ---
  const requestIncrementalSync = () => {
    const token = requireToken();
    if (!token) return;

    const totalChanges = deltaPreview.newCount + deltaPreview.changedCount;
    setConfirmState({
      title: `Jalankan Incremental Sync (${activeInstitution.nama})?`,
      description:
        totalChanges === 0
          ? 'Seluruh 11 tab data lembaga ini sudah sama dengan snapshot terakhir di Google Sheets.'
          : 'Hanya baris baru dan baris yang berubah pada 11 tab Spreadsheet yang akan dikirim ke Google Sheets (delta update), sehingga cepat dan bebas timeout.',
      details: [
        `Spreadsheet ID: ${
          activeInstitution.workspaceConfig?.spreadsheetId ||
          'Akan dibuat otomatis'
        }`,
        `Baris baru ditambahkan: ${deltaPreview.newCount}`,
        `Baris diubah diperbarui: ${deltaPreview.changedCount}`,
        `Baris identik dilewati: ${deltaPreview.unchangedCount}`,
      ],
      confirmLabel: 'Sinkronkan Delta Sekarang',
      tone: 'primary',
      action: async () => {
        const activeToken = requireToken();
        if (!activeToken) return;
        let cfg = activeInstitution.workspaceConfig;
        if (!cfg?.spreadsheetId) {
          cfg = await ensureWorkspaceResources(
            activeToken,
            undefined,
            undefined,
            activeInstitution.nama
          );
          updateInstitutionConfig(activeInstitution.id, cfg);
        }
        const res = await incrementalSyncToSheets(
          activeToken,
          cfg.spreadsheetId,
          instDataset,
          syncBaseline?.hashes || {}
        );
        const nextBaseline: SyncBaseline = {
          institutionId: activeInstitution.id,
          hashes: res.nextHashes,
          lastDeltaSummary: {
            timestamp: res.syncedAt,
            updatedRows: res.updatedRows,
            appendedRows: res.appendedRows,
            skippedRows: res.skippedRows,
          },
        };
        await saveSyncBaseline(nextBaseline);
        setSyncBaseline(nextBaseline);
        updateInstitutionConfig(activeInstitution.id, {
          ...cfg,
          lastSyncedAt: res.syncedAt,
        });
        showToast(
          'success',
          `Incremental Sync 11 tab selesai: +${res.appendedRows} baru, ${res.updatedRows} diperbarui, ${res.skippedRows} dilewati.`
        );
      },
    });
  };

  const handleLoadFromSheets = async () => {
    const token = requireToken();
    if (!token) return;
    const sheetId = activeInstitution.workspaceConfig?.spreadsheetId;
    if (!sheetId) {
      showToast('error', 'Spreadsheet lembaga belum dikonfigurasi.');
      return;
    }

    setIsSyncing(true);
    try {
      const loaded = await loadFromSheets(token, sheetId, activeInstitution.id);
      const replaceInst = <T extends { institutionId: string }>(
        current: T[],
        incoming?: T[]
      ): T[] => {
        if (!incoming) return current;
        return [
          ...current.filter((x) => x.institutionId !== activeInstitution.id),
          ...incoming,
        ];
      };
      if (loaded.learners?.length)
        setLearners((prev) => replaceInst(prev, loaded.learners));
      if (loaded.documents)
        setDocuments((prev) => replaceInst(prev, loaded.documents));
      if (loaded.attendance)
        setAttendance((prev) => replaceInst(prev, loaded.attendance));
      if (loaded.subjects?.length)
        setSubjects((prev) => replaceInst(prev, loaded.subjects));
      if (loaded.modules?.length)
        setModules((prev) => replaceInst(prev, loaded.modules));
      if (loaded.schedules?.length)
        setSchedules((prev) => replaceInst(prev, loaded.schedules));
      if (loaded.announcements?.length)
        setAnnouncements((prev) => replaceInst(prev, loaded.announcements));
      if (loaded.quizzes?.length)
        setQuizzes((prev) => replaceInst(prev, loaded.quizzes));
      if (loaded.attempts)
        setAttempts((prev) => replaceInst(prev, loaded.attempts));
      if (loaded.leaveRequests)
        setLeaveRequests((prev) => replaceInst(prev, loaded.leaveRequests));
      if (loaded.notifications)
        setNotifications((prev) => replaceInst(prev, loaded.notifications));

      showToast(
        'success',
        `Data ${activeInstitution.nama} berhasil dimuat dari Google Sheets.`
      );
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : 'Gagal memuat data Spreadsheet.';
      if (msg.includes('401')) {
        clearAccessToken();
        setNeedsAuth(true);
      }
      showToast('error', msg);
    } finally {
      setIsSyncing(false);
    }
  };

  // --- REGISTER LEARNER + MULTI-FILE DRIVE UPLOAD ---
  const handleAddLearnerWithDocs = async (
    learner: Learner,
    stagedDocs: Array<{
      id: string;
      kategori: DocumentCategory;
      namaDokumen: string;
      file: File | null;
    }>
  ) => {
    setLearners((prev) => [...prev, learner]);

    const filesToUpload = stagedDocs.filter((d) => d.file !== null);
    if (filesToUpload.length === 0) {
      showToast('success', `Warga belajar ${learner.nama} berhasil didaftarkan.`);
      return;
    }

    const token = getAccessToken();
    let cfg = activeInstitution.workspaceConfig;
    if (token && !cfg?.driveFolderId) {
      cfg = await ensureWorkspaceResources(
        token,
        cfg?.spreadsheetId,
        cfg?.driveFolderId,
        activeInstitution.nama
      );
      updateInstitutionConfig(activeInstitution.id, cfg);
    }

    const createdDocs: LearnerDocument[] = [];
    for (const item of filesToUpload) {
      const file = item.file!;
      const sizeKb = Math.round(file.size / 1024);
      const ukuranLabel =
        sizeKb >= 1024 ? `${(sizeKb / 1024).toFixed(1)} MB` : `${sizeKb} KB`;

      if (token && cfg?.driveFolderId) {
        const uploaded = await uploadFileToDrive(
          token,
          cfg.driveFolderId,
          file,
          `${learner.nisn}_${item.kategori.replace(/[^a-zA-Z0-9]/g, '_')}_${file.name}`
        );
        createdDocs.push({
          id: `DOC-${Date.now().toString().slice(-5)}-${createdDocs.length}`,
          institutionId: activeInstitution.id,
          learnerId: learner.id,
          learnerNama: learner.nama,
          nisn: learner.nisn,
          kategori: item.kategori,
          namaFile: uploaded.name,
          mimeType: uploaded.mimeType,
          ukuranLabel,
          tanggalUnggah: new Date().toISOString().slice(0, 10),
          driveFileId: uploaded.id,
          driveWebViewLink: uploaded.webViewLink,
          statusSinkron: 'Tersimpan di Drive',
          catatan: item.namaDokumen,
        });
      } else {
        createdDocs.push({
          id: `DOC-${Date.now().toString().slice(-5)}-${createdDocs.length}`,
          institutionId: activeInstitution.id,
          learnerId: learner.id,
          learnerNama: learner.nama,
          nisn: learner.nisn,
          kategori: item.kategori,
          namaFile: file.name,
          mimeType: file.type || 'application/octet-stream',
          ukuranLabel,
          tanggalUnggah: new Date().toISOString().slice(0, 10),
          statusSinkron: 'Siap Diunggah ke Drive',
          catatan: item.namaDokumen,
        });
      }
    }

    setDocuments((prev) => [...createdDocs, ...prev]);
    showToast(
      'success',
      token
        ? `Warga belajar ${learner.nama} dan ${createdDocs.length} dokumen berhasil diunggah ke Google Drive.`
        : `Warga belajar ${learner.nama} & ${createdDocs.length} dokumen dicatat (hubungkan Google Drive untuk unggah otomatis).`
    );
  };

  // --- GOOGLE DRIVE DOCUMENT & MODULE MATERIAL HANDLERS ---
  const handleUploadDocument = async ({
    learner,
    kategori,
    catatan,
    file,
  }: {
    learner: Learner;
    kategori: DocumentCategory;
    catatan: string;
    file: File;
  }) => {
    const sizeKb = Math.round(file.size / 1024);
    const ukuranLabel =
      sizeKb >= 1024 ? `${(sizeKb / 1024).toFixed(1)} MB` : `${sizeKb} KB`;

    const token = getAccessToken();
    if (!token) {
      throw new Error(
        'Silakan klik "Hubungkan Google" terlebih dahulu untuk mengunggah dokumen ke Google Drive.'
      );
    }

    let cfg = activeInstitution.workspaceConfig;
    if (!cfg?.driveFolderId) {
      cfg = await ensureWorkspaceResources(
        token,
        cfg?.spreadsheetId,
        cfg?.driveFolderId,
        activeInstitution.nama
      );
      updateInstitutionConfig(activeInstitution.id, cfg);
    }

    const uploaded = await uploadFileToDrive(
      token,
      cfg.driveFolderId,
      file,
      `${learner.id}_${kategori.replace(/[^a-zA-Z0-9]/g, '_')}_${file.name}`
    );

    const newDoc: LearnerDocument = {
      id: `DOC-${Date.now().toString().slice(-5)}`,
      institutionId: activeInstitution.id,
      learnerId: learner.id,
      learnerNama: learner.nama,
      nisn: learner.nisn,
      kategori,
      namaFile: uploaded.name,
      mimeType: uploaded.mimeType,
      ukuranLabel,
      tanggalUnggah: new Date().toISOString().slice(0, 10),
      driveFileId: uploaded.id,
      driveWebViewLink: uploaded.webViewLink,
      statusSinkron: 'Tersimpan di Drive',
      catatan,
    };
    setDocuments((prev) => [newDoc, ...prev]);
    showToast(
      'success',
      `Dokumen "${uploaded.name}" berhasil diunggah ke Google Drive.`
    );
  };

  const handleAddModuleWithFile = async (
    mod: LearningModule,
    file: File | null
  ) => {
    let finalMod = { ...mod };
    if (file) {
      const token = getAccessToken();
      if (token) {
        let cfg = activeInstitution.workspaceConfig;
        if (!cfg?.driveFolderId) {
          cfg = await ensureWorkspaceResources(
            token,
            cfg?.spreadsheetId,
            cfg?.driveFolderId,
            activeInstitution.nama
          );
          updateInstitutionConfig(activeInstitution.id, cfg);
        }
        const uploaded = await uploadFileToDrive(
          token,
          cfg.driveFolderId,
          file,
          `MATERI_${mod.kode}_${file.name}`
        );
        finalMod = {
          ...finalMod,
          materiNama: uploaded.name,
          materiDriveUrl: uploaded.webViewLink,
          materiDriveFileId: uploaded.id,
        };
      } else {
        finalMod = {
          ...finalMod,
          materiNama: file.name,
        };
      }
    }
    setModules((prev) => [finalMod, ...prev]);
    showToast(
      'success',
      file && getAccessToken()
        ? `Materi "${finalMod.judul}" dipublikasikan ke Google Drive.`
        : `Materi "${finalMod.judul}" berhasil ditambahkan.`
    );
  };

  const handleDeleteDocument = (doc: LearnerDocument) => {
    setConfirmState({
      title: 'Hapus Dokumen Warga Belajar?',
      description: doc.driveFileId
        ? `File "${doc.namaFile}" akan dihapus secara permanen dari Google Drive dan daftar arsip.`
        : `Hapus catatan dokumen "${doc.namaFile}" dari daftar arsip aplikasi?`,
      details: [
        `Warga Belajar: ${doc.learnerNama}`,
        `Kategori: ${doc.kategori}`,
        ...(doc.driveFileId ? [`Drive File ID: ${doc.driveFileId}`] : []),
      ],
      confirmLabel: 'Hapus Dokumen',
      tone: 'danger',
      action: async () => {
        if (doc.driveFileId) {
          const token = requireToken();
          if (!token) return;
          await deleteDriveFile(token, doc.driveFileId);
        }
        setDocuments((prev) => prev.filter((d) => d.id !== doc.id));
        showToast('success', `Dokumen "${doc.namaFile}" berhasil dihapus.`);
      },
    });
  };

  const handleSaveReportToDrive = (fileName: string, csvContent: string) => {
    const token = requireToken();
    if (!token) return;

    setConfirmState({
      title: 'Simpan Laporan Kemajuan ke Google Drive?',
      description:
        'Laporan periode terpilih akan diunggah sebagai file CSV ke folder Google Drive lembaga.',
      details: [
        `Lembaga: ${activeInstitution.nama}`,
        `Nama File: ${fileName}`,
      ],
      confirmLabel: 'Simpan ke Drive',
      tone: 'primary',
      action: async () => {
        const activeToken = requireToken();
        if (!activeToken) return;
        let cfg = activeInstitution.workspaceConfig;
        if (!cfg?.driveFolderId) {
          cfg = await ensureWorkspaceResources(
            activeToken,
            undefined,
            undefined,
            activeInstitution.nama
          );
          updateInstitutionConfig(activeInstitution.id, cfg);
        }
        await uploadTextReportToDrive(
          activeToken,
          cfg.driveFolderId,
          fileName,
          csvContent,
          'text/csv;charset=utf-8'
        );
        showToast(
          'success',
          `Laporan "${fileName}" disimpan ke Drive ${activeInstitution.nama}.`
        );
      },
    });
  };

  // --- AUTO-REMEDIAL QUIZ GENERATOR ---
  const createRemedialQuizForLearner = (
    learner: Learner,
    sourceQuiz: Quiz,
    failedDetailIds?: string[]
  ): Quiz => {
    const missedQuestions = failedDetailIds?.length
      ? sourceQuiz.soal.filter((q) => failedDetailIds.includes(q.id))
      : sourceQuiz.soal;
    const selectedPool =
      missedQuestions.length > 0 ? missedQuestions : sourceQuiz.soal.slice(0, 2);

    const remedialQuiz: Quiz = {
      id: `REM-${Date.now().toString().slice(-5)}`,
      institutionId: learner.institutionId,
      kodePaket: `REM${Date.now().toString().slice(-4)}`,
      moduleId: sourceQuiz.moduleId,
      judul: `Remidial: ${sourceQuiz.judul} (${learner.nama})`,
      mataPelajaran: sourceQuiz.mataPelajaran,
      program: learner.program,
      kelas: learner.kelas,
      modePembelajaran: 'Mandiri',
      targetNilai: sourceQuiz.targetNilai,
      durasiMenit: Math.max(10, selectedPool.length * 3),
      tutorPembuat: learner.tutorNama,
      tanggalDibuat: new Date().toISOString().slice(0, 10),
      isRemedial: true,
      assignedLearnerIds: [learner.id],
      parentQuizId: sourceQuiz.id,
      soal: selectedPool.map((q, i) => ({
        ...q,
        id: `${q.id}-REM-${i + 1}`,
        bobot: Math.round(100 / Math.max(1, selectedPool.length)),
      })),
    };
    setQuizzes((prev) => [remedialQuiz, ...prev]);
    return remedialQuiz;
  };

  const handleGenerateRemedialFromAlert = (notif: TutorNotification) => {
    const learner = learners.find((l) => l.id === notif.learnerId);
    if (!learner) return;
    const matchingQuiz =
      instQuizzes.find(
        (q) => q.mataPelajaran === notif.kompetensi && !q.isRemedial
      ) || instQuizzes[0];
    if (!matchingQuiz) return;

    const rem = createRemedialQuizForLearner(learner, matchingQuiz);
    setNotifications((prev) =>
      prev.map((n) =>
        n.id === notif.id ? { ...n, remedialQuizId: rem.id } : n
      )
    );
    showToast(
      'success',
      `Paket soal remidial (${rem.id}) otomatis diterbitkan ke Portal Mandiri ${learner.nama}.`
    );
  };

  // --- MULTI-CHANNEL ALERT: GMAIL & WHATSAPP ---
  const handleRequestSendEmail = (
    notif: TutorNotification,
    overrideEmail?: string
  ) => {
    const token = requireToken();
    if (!token) return;

    const recipient = (overrideEmail || notif.tutorEmail).trim();
    if (!recipient) {
      showToast('error', 'Alamat email tutor tidak boleh kosong.');
      return;
    }

    const subject = `[${activeInstitution.nama}] Peringatan EWS: ${notif.learnerNama}`;
    const bodyText = [
      `Yth. ${notif.tutorNama},`,
      '',
      `Sistem Early Warning System (EWS) ${activeInstitution.nama} mendeteksi:`,
      `- Warga Belajar : ${notif.learnerNama} (${notif.program})`,
      `- Kompetensi    : ${notif.kompetensi}`,
      `- Skor Capaian  : ${notif.skorCapaian} (Target KKM: ${notif.targetNilai})`,
      `- Tingkat Risiko: ${notif.riskLevel}`,
      `- Keterangan    : ${notif.pemicu}`,
      '',
      notif.remedialQuizId
        ? `Soal remidial otomatis (${notif.remedialQuizId}) telah diterbitkan di Portal Mandiri Warga Belajar.`
        : `Mohon jadwalkan pendampingan atau terbitkan soal remidial.`,
      '',
      `Salam,`,
      `${activeInstitution.channelSettings.senderAlias}`,
    ].join('\n');

    setConfirmState({
      title: 'Kirim Email Peringatan ke Tutor via Gmail?',
      description:
        'Email peringatan akan dikirim melalui akun Gmail Anda yang terhubung.',
      details: [
        `Penerima: ${recipient}`,
        `Subjek: ${subject}`,
        `Tingkat Risiko EWS: ${notif.riskLevel}`,
      ],
      confirmLabel: 'Kirim Email Sekarang',
      tone: 'primary',
      action: async () => {
        const activeToken = requireToken();
        if (!activeToken) return;
        await sendTutorAlertEmail(activeToken, recipient, subject, bodyText);
        setNotifications((prev) =>
          prev.map((n) =>
            n.id === notif.id
              ? {
                  ...n,
                  tutorEmail: recipient,
                  statusKirim: 'Terkirim via Gmail',
                  waktuTerkirim: new Date().toISOString(),
                }
              : n
          )
        );
        showToast('success', `Email notifikasi berhasil dikirim ke ${recipient}.`);
      },
    });
  };

  const handleOpenWhatsAppAlert = (notif: TutorNotification) => {
    const phone = (notif.tutorTelepon || '6281234567890').replace(/\D/g, '');
    const message = [
      `*PERINGATAN EWS — ${activeInstitution.nama}*`,
      `Yth. ${notif.tutorNama},`,
      `Warga Belajar: *${notif.learnerNama}* (${notif.program})`,
      `Kompetensi: ${notif.kompetensi}`,
      `Capaian: ${notif.skorCapaian} / Target ${notif.targetNilai}`,
      `Risiko: *${notif.riskLevel}*`,
      `Catatan: ${notif.pemicu}`,
      notif.remedialQuizId
        ? `Soal Remidial (${notif.remedialQuizId}) sudah aktif di Portal Siswa.`
        : `Mohon segera lakukan tindak lanjut pendampingan.`,
    ].join('\n');
    const url = `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
    setWaPreviewModal({ notif, url, message });
  };

  // --- QUIZ SUBMISSION & EWS AUTO-REMEDIAL ---
  const handleSubmitAttempt = (attempt: QuizAttempt) => {
    setAttempts((prev) => [attempt, ...prev]);

    if (!attempt.tuntas) {
      const learner = learners.find((l) => l.id === attempt.learnerId);
      const sourceQuiz = quizzes.find((q) => q.id === attempt.quizId);
      if (learner && sourceQuiz) {
        const lAtt = instAttendance.filter((a) => a.learnerId === learner.id);
        const hadir = lAtt.filter((a) => a.status === 'Hadir').length;
        const attRate =
          lAtt.length > 0 ? Math.round((hadir / lAtt.length) * 100) : 100;
        const isHighRisk = attRate < 75 || attempt.skor < attempt.targetNilai - 15;

        let remedialId: string | undefined;
        if (
          activeInstitution.channelSettings.autoPublishRemedial &&
          !sourceQuiz.isRemedial
        ) {
          const missedIds = attempt.detailSoal
            .filter((d) => !d.benar)
            .map((d) => d.questionId);
          const rem = createRemedialQuizForLearner(
            learner,
            sourceQuiz,
            missedIds
          );
          remedialId = rem.id;
        }

        const newNotif: TutorNotification = {
          id: `NOTIF-${Date.now().toString().slice(-5)}`,
          institutionId: learner.institutionId,
          learnerId: learner.id,
          learnerNama: learner.nama,
          program: learner.program,
          tutorNama: learner.tutorNama,
          tutorEmail: learner.tutorEmail,
          tutorTelepon: learner.tutorTelepon,
          kompetensi: attempt.mataPelajaran,
          skorCapaian: attempt.skor,
          targetNilai: attempt.targetNilai,
          riskLevel: isHighRisk ? 'Tinggi (Drop-Out)' : 'Sedang',
          pemicu: isHighRisk
            ? `EWS Risiko Tinggi: Nilai ${attempt.skor} (< KKM ${attempt.targetNilai}) · Kehadiran ${attRate}%`
            : `Evaluasi "${attempt.quizJudul}" di bawah KKM (${attempt.skor} vs ${attempt.targetNilai})`,
          waktuTerdeteksi: attempt.tanggalPengerjaan,
          statusKirim: 'Menunggu Tindakan',
          remedialQuizId: remedialId,
        };
        setNotifications((prev) => [newNotif, ...prev]);
        showToast(
          'info',
          `Skor ${learner.nama} (${attempt.skor}) di bawah KKM. EWS aktif & soal remidial diterbitkan.`
        );
      }
    } else {
      showToast(
        'success',
        `Evaluasi tuntas! ${attempt.learnerNama} memperoleh skor ${attempt.skor}.`
      );
    }
  };

  const handleScanCompetencies = (): number => {
    let added = 0;
    const newAlerts: TutorNotification[] = [];

    for (const learner of instLearners) {
      const lAttempts = instAttempts.filter((a) => a.learnerId === learner.id);
      const lAtt = instAttendance.filter((a) => a.learnerId === learner.id);
      const present = lAtt.filter((a) => a.status === 'Hadir').length;
      const attRate =
        lAtt.length > 0 ? Math.round((present / lAtt.length) * 100) : 100;

      const latestAvg =
        lAttempts.length > 0
          ? Math.round(
              lAttempts.reduce((s, a) => s + a.skor, 0) / lAttempts.length
            )
          : null;

      if (
        attRate < 75 &&
        latestAvg !== null &&
        latestAvg < learner.targetKompetensi
      ) {
        const exists = instNotifications.some(
          (n) =>
            n.learnerId === learner.id && n.riskLevel === 'Tinggi (Drop-Out)'
        );
        if (!exists) {
          added++;
          newAlerts.push({
            id: `NOTIF-EWS-${Date.now().toString().slice(-4)}-${added}`,
            institutionId: activeInstitution.id,
            learnerId: learner.id,
            learnerNama: learner.nama,
            program: learner.program,
            tutorNama: learner.tutorNama,
            tutorEmail: learner.tutorEmail,
            tutorTelepon: learner.tutorTelepon,
            kompetensi: 'Kehadiran & Kompetensi Terpadu',
            skorCapaian: latestAvg,
            targetNilai: learner.targetKompetensi,
            riskLevel: 'Tinggi (Drop-Out)',
            pemicu: `EWS Drop-Out: Kehadiran ${attRate}% (<75%) dan rerata nilai ${latestAvg} (<${learner.targetKompetensi})`,
            waktuTerdeteksi: new Date().toISOString(),
            statusKirim: 'Menunggu Tindakan',
          });
        }
      }
    }

    if (newAlerts.length > 0) {
      setNotifications((prev) => [...newAlerts, ...prev]);
    }
    return added;
  };

  const handleUpsertAttendance = async (
    record: AttendanceRecord,
    forceOfflineQueue = false
  ) => {
    setAttendance((prev) => {
      const idx = prev.findIndex(
        (a) => a.tanggal === record.tanggal && a.learnerId === record.learnerId
      );
      if (idx >= 0) {
        const copy = [...prev];
        copy[idx] = record;
        return copy;
      }
      return [...prev, record];
    });

    if (forceOfflineQueue || isOfflineSimulated || !isOnlineBrowser) {
      await enqueueOfflineAttendance(record);
      const pending = await getPendingOfflineAttendance(activeInstitution.id);
      setPendingOfflineCount(pending.length);
    }
  };

  const handleResolveLeaveRequest = (id: string, approve: boolean) => {
    const req = leaveRequests.find((lr) => lr.id === id);
    setLeaveRequests((prev) =>
      prev.map((lr) =>
        lr.id === id ? { ...lr, status: approve ? 'Disetujui' : 'Ditolak' } : lr
      )
    );
    if (approve && req) {
      void handleUpsertAttendance({
        id: `ABS-${req.tanggal}-${req.learnerId}`,
        institutionId: req.institutionId,
        tanggal: req.tanggal,
        learnerId: req.learnerId,
        status: req.jenis,
        modePembelajaran: 'Tatap Muka',
        waktuCatat: '08:00',
        sumber: 'Pengajuan Mandiri',
        catatan: req.alasan,
      });
      showToast(
        'success',
        `Pengajuan ${req.jenis} ${req.learnerNama} disetujui dan masuk ke daftar presensi.`
      );
    }
  };

  const pendingAlertCount = useMemo(
    () =>
      instNotifications.filter((n) => n.statusKirim === 'Menunggu Tindakan')
        .length,
    [instNotifications]
  );

  const pendingDeltaTotal = deltaPreview.newCount + deltaPreview.changedCount;

  // --- STANDALONE ROUTES (?nisn= / ?verify= and ?ujian=) ---
  if (standaloneNisn) {
    return (
      <StandaloneQrProfile
        nisnOrVerifyParam={standaloneNisn}
        institutionName={activeInstitution.nama}
        learners={instLearners}
        documents={instDocuments}
        attendance={instAttendance}
        attempts={instAttempts}
        modules={instModules}
        schedules={instSchedules}
        onBackToPortal={() => {
          setStandaloneNisn(null);
          if (typeof window !== 'undefined' && window.location.search) {
            window.history.replaceState({}, '', window.location.pathname);
          }
        }}
      />
    );
  }

  if (standaloneExamCode) {
    return (
      <StandaloneExamView
        kodePaket={standaloneExamCode}
        institutionName={activeInstitution.nama}
        learners={instLearners}
        quizzes={instQuizzes}
        onSubmitAttempt={handleSubmitAttempt}
        onBackToPortal={() => {
          setStandaloneExamCode(null);
          if (typeof window !== 'undefined' && window.location.search) {
            window.history.replaceState({}, '', window.location.pathname);
          }
        }}
      />
    );
  }

  const primaryTabs: Array<{
    id: ActiveView;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    badge?: number;
    highlight?: boolean;
  }> = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'learners', label: 'Warga Belajar', icon: Users },
    {
      id: 'attendance',
      label: 'Presensi QR',
      icon: CalendarCheck2,
      badge: pendingOfflineCount > 0 ? pendingOfflineCount : undefined,
    },
    { id: 'modules', label: 'Mapel & Materi', icon: BookOpen },
    {
      id: 'jadwal',
      label: 'Jadwal & Info KBM',
      icon: CalendarClock,
      badge: pendingAlertCount > 0 ? pendingAlertCount : undefined,
    },
    {
      id: 'quizzes',
      label: 'Bank Soal & Ujian',
      icon: BookOpenCheck,
      highlight: true,
    },
    {
      id: 'documents',
      label: 'Portofolio & Laporan',
      icon: FolderArchive,
    },
  ];

  const utilityTabs: Array<{
    id: ActiveView;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
  }> = [
    { id: 'dinas', label: 'Dasbor Dinas', icon: Globe2 },
    { id: 'cards', label: 'Cetak Kartu KTWB QR', icon: QrCode },
    { id: 'portal', label: 'Portal Warga Belajar', icon: UserCheck },
    { id: 'settings', label: 'Pengaturan Sheets & Lembaga', icon: Settings },
  ];

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      {/* Sticky Topbar (PKBM Digital Style) */}
      <header className="no-print sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur-sm dark:border-slate-800 dark:bg-slate-900/95">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6">
          {/* Brand */}
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-blue-700 to-indigo-800 text-white shadow-xs">
              <GraduationCap className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-sm font-extrabold tracking-tight text-slate-900 dark:text-slate-100 sm:text-base">
                SISTEM INFORMASI PKBM DIGITAL
              </h1>
              <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                Administrasi, CBT & Portofolio · Terintegrasi Google Sheets & Drive
              </p>
            </div>
          </div>

          {/* Right Controls: Clock, Theme, Institution, Workspace Sync */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="hidden items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 font-mono text-[11px] font-medium text-slate-600 tabular-nums dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 md:flex">
              <Clock className="h-3.5 w-3.5 text-blue-700 dark:text-blue-400" />
              <span>{clockText}</span>
            </div>

            <button
              type="button"
              onClick={() => setTheme((t) => (t === 'light' ? 'dark' : 'light'))}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
              title="Ganti tema Terang / Gelap"
            >
              {theme === 'dark' ? (
                <>
                  <Sun className="h-3.5 w-3.5 text-amber-400" />
                  <span className="hidden sm:inline">Mode Terang</span>
                </>
              ) : (
                <>
                  <Moon className="h-3.5 w-3.5 text-slate-600" />
                  <span className="hidden sm:inline">Mode Gelap</span>
                </>
              )}
            </button>

            <div className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 dark:border-slate-700 dark:bg-slate-800">
              <Building2 className="h-3.5 w-3.5 shrink-0 text-blue-700 dark:text-blue-400" />
              <select
                value={activeInstitution.id}
                onChange={(e) => {
                  setActiveInstitutionId(e.target.value);
                  setSelectedLearnerId(null);
                }}
                aria-label="Pilih Lembaga Aktif"
                className="max-w-[190px] bg-transparent text-xs font-semibold text-slate-800 focus:outline-none dark:text-slate-100"
              >
                {institutions.map((inst) => (
                  <option
                    key={inst.id}
                    value={inst.id}
                    className="bg-white text-slate-900 dark:bg-slate-900 dark:text-slate-100"
                  >
                    {inst.nama}
                  </option>
                ))}
              </select>
            </div>

            {needsAuth ? (
              <div className="shrink-0">
                <GoogleSignInButton
                  onClick={handleGoogleLogin}
                  disabled={isLoggingIn}
                />
              </div>
            ) : (
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={requestIncrementalSync}
                  disabled={isSyncing}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-slate-800 disabled:opacity-60 whitespace-nowrap dark:bg-blue-700 dark:hover:bg-blue-600"
                >
                  <UploadCloud className="h-3.5 w-3.5" />
                  <span>
                    {isSyncing
                      ? 'Menyinkron...'
                      : `Delta Sync (${pendingDeltaTotal})`}
                  </span>
                </button>
                <button
                  type="button"
                  onClick={handleLoadFromSheets}
                  disabled={
                    isSyncing || !activeInstitution.workspaceConfig?.spreadsheetId
                  }
                  className="rounded-lg border border-slate-200 bg-white p-1.5 text-slate-600 hover:bg-slate-50 disabled:opacity-40 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
                  title="Muat Data dari Google Sheets"
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                </button>
                {activeInstitution.workspaceConfig?.spreadsheetUrl && (
                  <a
                    href={activeInstitution.workspaceConfig.spreadsheetUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="rounded-lg border border-slate-200 bg-white p-1.5 text-emerald-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-emerald-400"
                    title="Buka Google Spreadsheet Lembaga"
                  >
                    <FileSpreadsheet className="h-3.5 w-3.5" />
                  </a>
                )}
                <button
                  type="button"
                  onClick={handleLogout}
                  className="rounded-lg border border-slate-200 bg-white p-1.5 text-slate-500 hover:bg-slate-50 hover:text-red-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400"
                  title={`Keluar (${user?.email || 'Google'})`}
                >
                  <LogOut className="h-3.5 w-3.5" />
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Navigation Tab Bar */}
        <div className="border-t border-slate-200 bg-slate-50/70 dark:border-slate-800 dark:bg-slate-900/70">
          <div className="mx-auto flex max-w-7xl flex-col gap-2 px-4 py-2 sm:px-6">
            {/* Primary 7 Tabs */}
            <nav
              aria-label="Navigasi Utama PKBM Digital"
              className="flex flex-wrap items-center gap-1.5"
            >
              {primaryTabs.map((tab) => {
                const Icon = tab.icon;
                const active = activeView === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveView(tab.id)}
                    className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap ${
                      active
                        ? tab.highlight
                          ? 'bg-amber-600 text-white shadow-xs'
                          : 'bg-blue-700 text-white shadow-xs'
                        : tab.highlight
                        ? 'border border-dashed border-amber-500 bg-amber-50 text-amber-800 hover:bg-amber-100 dark:border-amber-500/70 dark:bg-amber-950/40 dark:text-amber-300 dark:hover:bg-amber-900/50'
                        : 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700'
                    }`}
                  >
                    <Icon className="h-3.5 w-3.5 shrink-0" />
                    <span>{tab.label}</span>
                    {tab.badge !== undefined && (
                      <span
                        className={`ml-0.5 rounded-full px-1.5 py-0.5 font-mono text-[10px] font-bold leading-none ${
                          active
                            ? 'bg-white/20 text-white'
                            : 'bg-red-100 text-red-700 dark:bg-red-950/70 dark:text-red-300'
                        }`}
                      >
                        {tab.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </nav>

            {/* Secondary Utility Strip */}
            <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-200/80 pt-1.5 text-[11px] dark:border-slate-800">
              <div className="flex flex-wrap items-center gap-1.5">
                {utilityTabs.map((ut) => {
                  const Icon = ut.icon;
                  const active = activeView === ut.id;
                  return (
                    <button
                      key={ut.id}
                      type="button"
                      onClick={() => setActiveView(ut.id)}
                      className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 font-medium transition-colors whitespace-nowrap ${
                        active
                          ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900'
                          : 'text-slate-600 hover:bg-slate-200/60 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100'
                      }`}
                    >
                      <Icon className="h-3.5 w-3.5 shrink-0" />
                      <span>{ut.label}</span>
                    </button>
                  );
                })}
              </div>
              <div className="hidden items-center gap-2 font-mono text-[11px] text-slate-500 dark:text-slate-400 lg:flex">
                <span>
                  Lembaga: <strong className="text-slate-700 dark:text-slate-200">{activeInstitution.kode}</strong>
                </span>
                <span>·</span>
                <span>{instLearners.length} WB</span>
                <span>·</span>
                <span>
                  {activeInstitution.workspaceConfig?.spreadsheetId
                    ? 'Sheets & Drive Terhubung'
                    : 'Sheets Lokal (Siap Sinkron)'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Toast Notification */}
      {toast && (
        <div className="no-print mx-auto max-w-7xl px-4 pt-4 sm:px-6">
          <div
            className={`flex items-center justify-between gap-3 rounded-xl border px-4 py-2.5 text-xs font-medium shadow-xs ${
              toast.type === 'success'
                ? 'border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900/60 dark:bg-emerald-950/60 dark:text-emerald-200'
                : toast.type === 'error'
                ? 'border-red-200 bg-red-50 text-red-800 dark:border-red-900/60 dark:bg-red-950/60 dark:text-red-200'
                : 'border-blue-200 bg-blue-50 text-blue-800 dark:border-blue-900/60 dark:bg-blue-950/60 dark:text-blue-200'
            }`}
          >
            <span className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 shrink-0" />
              <span>{toast.text}</span>
            </span>
            <button
              type="button"
              onClick={() => setToast(null)}
              className="rounded p-0.5 hover:bg-black/5 dark:hover:bg-white/10"
              aria-label="Tutup pesan"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Main Content Workspace */}
      <main className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 sm:py-8">
        {activeView === 'dashboard' && (
          <AnalyticsDashboard
            learners={instLearners}
            documents={instDocuments}
            attendance={instAttendance}
            quizzes={instQuizzes}
            attempts={instAttempts}
            notifications={instNotifications}
            onInspectLearner={(id) => {
              setSelectedLearnerId(id);
              setActiveView('learners');
            }}
            onOpenCard={(id) => {
              setCardTargetLearnerId(id);
              setActiveView('cards');
            }}
            onOpenNotifications={() => setActiveView('jadwal')}
            onStartQuiz={() => {
              setQuizDefaultTab('pengerjaan');
              setActiveView('quizzes');
            }}
          />
        )}

        {activeView === 'learners' && (
          <LearnerManagement
            institutionId={activeInstitution.id}
            learners={instLearners}
            documents={instDocuments}
            attendance={instAttendance}
            attempts={instAttempts}
            isWorkspaceConnected={!needsAuth}
            selectedLearnerId={selectedLearnerId}
            onSelectLearnerId={setSelectedLearnerId}
            onAddLearnerWithDocs={handleAddLearnerWithDocs}
            onUpdateLearner={(l) => {
              setLearners((prev) =>
                prev.map((item) => (item.id === l.id ? l : item))
              );
              showToast('success', `Data ${l.nama} diperbarui.`);
            }}
            onDeleteLearner={(id) => {
              const target = learners.find((l) => l.id === id);
              setConfirmState({
                title: 'Hapus Data Warga Belajar?',
                description: `Data profil ${
                  target?.nama || id
                } akan dihapus dari daftar aktif lembaga.`,
                confirmLabel: 'Hapus Data',
                tone: 'danger',
                action: async () => {
                  setLearners((prev) => prev.filter((l) => l.id !== id));
                  showToast('success', 'Data warga belajar dihapus.');
                },
              });
            }}
            onOpenCard={(id) => {
              setCardTargetLearnerId(id);
              setActiveView('cards');
            }}
            onOpenQrProfile={(nisn) => setStandaloneNisn(nisn)}
          />
        )}

        {activeView === 'attendance' && (
          <AttendanceTracker
            institutionId={activeInstitution.id}
            learners={instLearners}
            attendance={instAttendance}
            leaveRequests={instLeaveRequests}
            pendingOfflineCount={pendingOfflineCount}
            isOfflineSimulated={isOfflineSimulated}
            isOnlineBrowser={isOnlineBrowser}
            onToggleOfflineSim={() => setIsOfflineSimulated((v) => !v)}
            onSyncOfflineQueue={handleSyncOfflineQueue}
            onUpsertAttendance={handleUpsertAttendance}
            onBulkMarkPresent={(tanggal, learnerIds, modePembelajaran) => {
              setAttendance((prev) => {
                const next = [...prev];
                for (const lid of learnerIds) {
                  const idx = next.findIndex(
                    (a) => a.tanggal === tanggal && a.learnerId === lid
                  );
                  const rec: AttendanceRecord = {
                    id: `ABS-${tanggal}-${lid}`,
                    institutionId: activeInstitution.id,
                    tanggal,
                    learnerId: lid,
                    status: 'Hadir',
                    modePembelajaran,
                    waktuCatat: '08:00',
                    sumber: 'Manual',
                    catatan: '',
                  };
                  if (idx >= 0) next[idx] = rec;
                  else next.push(rec);
                }
                return next;
              });
              showToast(
                'success',
                `Seluruh warga belajar pada ${tanggal} (${modePembelajaran}) ditandai Hadir.`
              );
            }}
            onResolveLeaveRequest={handleResolveLeaveRequest}
          />
        )}

        {activeView === 'modules' && (
          <ModuleManager
            institution={activeInstitution}
            subjects={instSubjects}
            modules={instModules}
            learners={instLearners}
            attendance={instAttendance}
            quizzes={instQuizzes}
            attempts={instAttempts}
            isWorkspaceConnected={!needsAuth}
            onAddSubject={(subj) => {
              setSubjects((prev) => [subj, ...prev]);
              showToast('success', `Mata pelajaran "${subj.namaMapel}" ditambahkan.`);
            }}
            onDeleteSubject={(id) => {
              setSubjects((prev) => prev.filter((s) => s.id !== id));
              showToast('info', 'Mata pelajaran dihapus.');
            }}
            onAddModuleWithFile={handleAddModuleWithFile}
            onDeleteModule={(id) => {
              setModules((prev) => prev.filter((m) => m.id !== id));
              showToast('info', 'Materi belajar dihapus.');
            }}
            onStartModuleQuiz={(quizId) => {
              setQuizPreselectedQuizId(quizId);
              setQuizDefaultTab('pengerjaan');
              setActiveView('quizzes');
            }}
          />
        )}

        {activeView === 'jadwal' && (
          <ScheduleAndInfo
            institutionId={activeInstitution.id}
            schedules={instSchedules}
            announcements={instAnnouncements}
            subjects={instSubjects}
            notifications={instNotifications}
            isWorkspaceConnected={!needsAuth}
            onAddSchedule={(item) => {
              setSchedules((prev) => [item, ...prev]);
              showToast('success', `Jadwal ${item.mapel} (${item.hari}) disimpan.`);
            }}
            onDeleteSchedule={(id) => {
              setSchedules((prev) => prev.filter((s) => s.id !== id));
              showToast('info', 'Jadwal KBM dihapus.');
            }}
            onAddAnnouncement={(ann) => {
              setAnnouncements((prev) => [ann, ...prev]);
              showToast('success', `Pengumuman "${ann.judul}" diterbitkan.`);
            }}
            onDeleteAnnouncement={(id) => {
              setAnnouncements((prev) => prev.filter((a) => a.id !== id));
              showToast('info', 'Pengumuman dihapus.');
            }}
            onScanCompetencies={handleScanCompetencies}
            onRequestSendEmail={handleRequestSendEmail}
            onSendWhatsApp={handleOpenWhatsAppAlert}
            onGenerateRemedialForAlert={handleGenerateRemedialFromAlert}
            onMarkResolved={(id) => {
              setNotifications((prev) =>
                prev.map((n) =>
                  n.id === id ? { ...n, statusKirim: 'Ditandai Selesai' } : n
                )
              );
            }}
            onConnectWorkspace={handleGoogleLogin}
          />
        )}

        {activeView === 'quizzes' && (
          <QuizSystem
            institutionId={activeInstitution.id}
            learners={instLearners}
            modules={instModules}
            quizzes={instQuizzes}
            attempts={instAttempts}
            initialTab={quizDefaultTab}
            preselectedLearnerId={quizPreselectedLearnerId}
            preselectedQuizId={quizPreselectedQuizId}
            onAddQuiz={(q) => {
              setQuizzes((prev) => [q, ...prev]);
              showToast('success', `Paket soal "${q.judul}" disimpan.`);
            }}
            onAddQuestionToQuiz={(quizId, question: QuizQuestion) => {
              setQuizzes((prev) =>
                prev.map((q) =>
                  q.id === quizId ? { ...q, soal: [...q.soal, question] } : q
                )
              );
              showToast('success', 'Soal baru ditambahkan ke paket ujian.');
            }}
            onBulkAddQuestionsToQuiz={(quizId, newQuestions: QuizQuestion[]) => {
              setQuizzes((prev) =>
                prev.map((q) =>
                  q.id === quizId
                    ? { ...q, soal: [...q.soal, ...newQuestions] }
                    : q
                )
              );
              showToast(
                'success',
                `${newQuestions.length} soal massal berhasil diimpor ke paket ujian.`
              );
            }}
            onDeleteQuiz={(id) => {
              setQuizzes((prev) => prev.filter((q) => q.id !== id));
              showToast('info', 'Paket soal dihapus.');
            }}
            onSubmitAttempt={handleSubmitAttempt}
            onOpenStandaloneExam={(kodePaket) =>
              setStandaloneExamCode(kodePaket)
            }
          />
        )}

        {activeView === 'documents' && (
          <PortfolioAndDocuments
            learners={instLearners}
            documents={instDocuments}
            attendance={instAttendance}
            attempts={instAttempts}
            isWorkspaceConnected={!needsAuth}
            workspaceConfig={activeInstitution.workspaceConfig}
            onUploadDocument={handleUploadDocument}
            onDeleteDocument={handleDeleteDocument}
            onConnectWorkspace={handleGoogleLogin}
            onSaveReportToDrive={handleSaveReportToDrive}
          />
        )}

        {activeView === 'dinas' && (
          <DinasDashboard
            institutions={institutions}
            learners={learners}
            attendance={attendance}
            attempts={attempts}
            modules={modules}
            notifications={notifications}
            onSwitchInstitution={(instId) => {
              setActiveInstitutionId(instId);
              setActiveView('dashboard');
            }}
          />
        )}

        {activeView === 'cards' && (
          <IdCardPrinter
            learners={instLearners}
            documents={instDocuments}
            attendance={instAttendance}
            attempts={instAttempts}
            initialLearnerId={cardTargetLearnerId}
            initialVerifyCode={
              initialQueryParams.nisn || initialQueryParams.verify
            }
            onOpenQrProfile={(nisn) => setStandaloneNisn(nisn)}
          />
        )}

        {activeView === 'portal' && (
          <LearnerPortal
            institution={activeInstitution}
            learners={instLearners}
            modules={instModules}
            documents={instDocuments}
            attendance={instAttendance}
            quizzes={instQuizzes}
            attempts={instAttempts}
            leaveRequests={instLeaveRequests}
            onSubmitLeaveRequest={(req) => {
              setLeaveRequests((prev) => [req, ...prev]);
              showToast(
                'success',
                `Pengajuan ${req.jenis} tanggal ${req.tanggal} tercatat.`
              );
            }}
            onStartQuizAsLearner={(learnerId, quizId) => {
              setQuizPreselectedLearnerId(learnerId);
              setQuizPreselectedQuizId(quizId);
              setQuizDefaultTab('pengerjaan');
              setActiveView('quizzes');
            }}
          />
        )}

        {activeView === 'settings' && (
          <InstitutionSettings
            institutions={institutions}
            activeInstitution={activeInstitution}
            isWorkspaceConnected={!needsAuth}
            isLoggingIn={isLoggingIn}
            isSyncing={isSyncing}
            deltaPreview={deltaPreview}
            syncBaseline={syncBaseline}
            onSelectInstitution={(id) => {
              setActiveInstitutionId(id);
              setSelectedLearnerId(null);
            }}
            onAddInstitution={(inst) => {
              setInstitutions((prev) => [...prev, inst]);
              showToast(
                'success',
                `Lembaga "${inst.nama}" berhasil ditambahkan.`
              );
            }}
            onUpdateInstitution={(inst) => {
              setInstitutions((prev) =>
                prev.map((i) => (i.id === inst.id ? inst : i))
              );
            }}
            onGoogleSignIn={handleGoogleLogin}
            onProvisionWorkspaceForInst={handleProvisionWorkspaceForInst}
            onRunIncrementalSync={requestIncrementalSync}
            onLoadFromSheets={handleLoadFromSheets}
          />
        )}
      </main>

      {/* Confirmation Dialog */}
      <ConfirmDialog
        open={Boolean(confirmState)}
        title={confirmState?.title || ''}
        description={confirmState?.description || ''}
        details={confirmState?.details}
        confirmLabel={confirmState?.confirmLabel}
        tone={confirmState?.tone}
        loading={confirmLoading}
        onCancel={() => {
          if (!confirmLoading) setConfirmState(null);
        }}
        onConfirm={async () => {
          if (!confirmState) return;
          setConfirmLoading(true);
          try {
            await confirmState.action();
          } catch (err) {
            const msg =
              err instanceof Error ? err.message : 'Operasi gagal dijalankan.';
            if (msg.includes('401')) {
              clearAccessToken();
              setNeedsAuth(true);
            }
            showToast('error', msg);
          } finally {
            setConfirmLoading(false);
            setConfirmState(null);
          }
        }}
      />

      {/* WhatsApp Direct Alert Preview Modal */}
      {waPreviewModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-6 shadow-xl dark:border-slate-800 dark:bg-slate-900">
            <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
              Pratinjau Pesan WhatsApp ke Tutor
            </h3>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              Penerima: {waPreviewModal.notif.tutorNama} (
              {waPreviewModal.notif.tutorTelepon || 'Nomor WhatsApp Tutor'})
            </p>
            <pre className="mt-4 whitespace-pre-wrap rounded-lg border border-slate-200 bg-slate-50 p-3.5 font-sans text-xs leading-relaxed text-slate-800 dark:border-slate-800 dark:bg-slate-800/70 dark:text-slate-200">
              {waPreviewModal.message}
            </pre>
            <div className="mt-5 flex flex-wrap items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setWaPreviewModal(null)}
                className="rounded-lg border border-slate-200 px-3.5 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
              >
                Tutup
              </button>
              <a
                href={waPreviewModal.url}
                target="_blank"
                rel="noreferrer"
                onClick={() => {
                  const id = waPreviewModal.notif.id;
                  setNotifications((prev) =>
                    prev.map((n) =>
                      n.id === id
                        ? {
                            ...n,
                            statusKirim: 'Terkirim via WhatsApp',
                            waktuTerkirim: new Date().toISOString(),
                          }
                        : n
                    )
                  );
                  setWaPreviewModal(null);
                }}
                className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-700 px-4 py-2 text-xs font-medium text-white hover:bg-emerald-800"
              >
                <span>Buka WhatsApp & Tandai Terkirim</span>
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
