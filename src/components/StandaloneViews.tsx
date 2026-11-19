import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowLeft,
  BookOpen,
  CalendarClock,
  CheckCircle2,
  Clock,
  ExternalLink,
  FileText,
  GraduationCap,
  Play,
  QrCode,
  ShieldCheck,
  UserCheck,
  XCircle,
} from 'lucide-react';
import {
  jenjangLabelToProgram,
  programToJenjangLabel,
} from '../data/seedData';
import {
  AttendanceRecord,
  Learner,
  LearnerDocument,
  LearningModule,
  QuestionAttemptDetail,
  Quiz,
  QuizAttempt,
  ScheduleItem,
} from '../types';

interface StandaloneQrProfileProps {
  nisnOrVerifyParam: string;
  institutionName: string;
  learners: Learner[];
  documents: LearnerDocument[];
  attendance: AttendanceRecord[];
  attempts: QuizAttempt[];
  modules: LearningModule[];
  schedules: ScheduleItem[];
  onBackToPortal: () => void;
  onStartQuiz?: (learnerId: string, quizId: string) => void;
}

export const StandaloneQrProfile: React.FC<StandaloneQrProfileProps> = ({
  nisnOrVerifyParam,
  institutionName,
  learners,
  documents,
  attendance,
  attempts,
  modules,
  schedules,
  onBackToPortal,
}) => {
  const cleaned = useMemo(() => {
    const raw = nisnOrVerifyParam.trim();
    try {
      if (raw.startsWith('http')) {
        const u = new URL(raw);
        return u.searchParams.get('nisn') || u.searchParams.get('verify') || raw;
      }
    } catch {
      // ignore
    }
    return raw;
  }, [nisnOrVerifyParam]);

  const learner = useMemo(
    () =>
      learners.find(
        (l) =>
          l.nisn.toLowerCase() === cleaned.toLowerCase() ||
          l.id.toLowerCase() === cleaned.toLowerCase()
      ) || null,
    [learners, cleaned]
  );

  const lDocs = useMemo(
    () =>
      learner
        ? documents.filter(
            (d) =>
              d.learnerId === learner.id ||
              (learner.nisn && d.nisn === learner.nisn)
          )
        : [],
    [learner, documents]
  );

  const lAttendance = useMemo(
    () =>
      learner
        ? attendance
            .filter((a) => a.learnerId === learner.id)
            .sort((a, b) => b.tanggal.localeCompare(a.tanggal))
        : [],
    [learner, attendance]
  );

  const lAttempts = useMemo(
    () =>
      learner
        ? attempts
            .filter((at) => at.learnerId === learner.id)
            .sort((a, b) => b.tanggalPengerjaan.localeCompare(a.tanggalPengerjaan))
        : [],
    [learner, attempts]
  );

  const lModules = useMemo(() => {
    if (!learner) return [];
    return modules.filter(
      (m) =>
        m.program === learner.program &&
        (!m.kelas || !learner.kelas || m.kelas === learner.kelas)
    );
  }, [learner, modules]);

  const lSchedules = useMemo(() => {
    if (!learner) return [];
    return schedules.filter(
      (s) =>
        jenjangLabelToProgram(s.jenjang) === learner.program &&
        (!s.kelas || !learner.kelas || s.kelas === learner.kelas)
    );
  }, [learner, schedules]);

  const attSummary = useMemo(() => {
    const total = lAttendance.length;
    const hadir = lAttendance.filter((a) => a.status === 'Hadir').length;
    const pct = total > 0 ? Math.round((hadir / total) * 100) : 100;
    return { total, hadir, pct };
  }, [lAttendance]);

  if (!learner) {
    return (
      <div className="min-h-screen bg-slate-50 px-4 py-12 dark:bg-slate-950">
        <div className="mx-auto max-w-xl rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <QrCode className="mx-auto h-10 w-10 text-red-600 dark:text-red-400" />
          <h1 className="mt-3 text-xl font-bold text-slate-900 dark:text-slate-100">
            Data Warga Belajar Tidak Ditemukan
          </h1>
          <p className="mt-1.5 text-sm text-slate-600 dark:text-slate-400">
            Kode verifikasi QR (<span className="font-mono">{cleaned}</span>) tidak cocok dengan arsip aktif di {institutionName}.
          </p>
          <button
            type="button"
            onClick={onBackToPortal}
            className="mt-6 inline-flex items-center gap-2 rounded-xl bg-blue-700 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-800"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Kembali ke Portal Admin</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 px-4 py-6 dark:bg-slate-950 sm:px-6">
      <div className="mx-auto max-w-4xl space-y-6">
        {/* Top Action Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <button
            type="button"
            onClick={onBackToPortal}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 shadow-xs hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Kembali ke Portal Admin</span>
          </button>
          <div className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
            <ShieldCheck className="h-4 w-4" />
            <span>Terverifikasi Digital · {institutionName}</span>
          </div>
        </div>

        {/* Dark Navy Identity Banner (PKBM Digital style) */}
        <div className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900 text-white shadow-lg">
          <div className="flex flex-col justify-between gap-4 bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 p-6 sm:flex-row sm:items-center sm:p-8">
            <div className="flex items-center gap-4">
              {learner.fotoUrl ? (
                <img
                  src={learner.fotoUrl}
                  alt={learner.nama}
                  referrerPolicy="no-referrer"
                  className="h-20 w-16 shrink-0 rounded-xl border-2 border-blue-400/50 object-cover"
                />
              ) : (
                <div className="flex h-20 w-16 shrink-0 items-center justify-center rounded-xl border border-blue-400/40 bg-blue-900/50 text-xl font-bold text-blue-100">
                  {learner.nama
                    .split(' ')
                    .slice(0, 2)
                    .map((n) => n[0])
                    .join('')}
                </div>
              )}
              <div>
                <p className="text-xs font-semibold tracking-wide text-blue-300 uppercase">
                  {programToJenjangLabel(learner.program)} •{' '}
                  {learner.kelas || learner.rombel}
                </p>
                <h1 className="mt-1 text-2xl font-bold tracking-tight text-white">
                  {learner.nama}
                </h1>
                <p className="mt-1 font-mono text-xs text-slate-300 tabular-nums">
                  NISN {learner.nisn} | TA {learner.tahunAjaran || '2026/2027'} | ID{' '}
                  {learner.id}
                </p>
              </div>
            </div>

            <div className="flex flex-col items-start gap-2 sm:items-end">
              <span
                className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold ${
                  learner.status === 'Aktif'
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                    : learner.status === 'Lulus'
                    ? 'bg-blue-500/20 text-blue-300 border border-blue-500/40'
                    : 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                }`}
              >
                <CheckCircle2 className="h-3.5 w-3.5" />
                Status: {learner.status}
              </span>
              <p className="text-xs text-slate-400">
                Tutor: {learner.tutorNama}
              </p>
            </div>
          </div>

          {/* 6 Biodata Boxes */}
          <div className="grid grid-cols-2 gap-px bg-slate-800 sm:grid-cols-3 lg:grid-cols-6">
            <div className="bg-slate-900/95 p-3.5">
              <p className="text-[11px] font-medium text-slate-400">NISN</p>
              <p className="mt-0.5 font-mono text-xs font-semibold text-white tabular-nums">
                {learner.nisn}
              </p>
            </div>
            <div className="bg-slate-900/95 p-3.5">
              <p className="text-[11px] font-medium text-slate-400">NIK</p>
              <p className="mt-0.5 font-mono text-xs font-semibold text-white tabular-nums">
                {learner.nik || '-'}
              </p>
            </div>
            <div className="bg-slate-900/95 p-3.5">
              <p className="text-[11px] font-medium text-slate-400">
                Jenis Kelamin
              </p>
              <p className="mt-0.5 text-xs font-semibold text-white">
                {learner.jk === 'P' ? 'Perempuan (P)' : 'Laki-laki (L)'}
              </p>
            </div>
            <div className="bg-slate-900/95 p-3.5">
              <p className="text-[11px] font-medium text-slate-400">
                Tempat, Tgl Lahir
              </p>
              <p className="mt-0.5 text-xs font-semibold text-white">
                {learner.tempatLahir || '-'}, {learner.tanggalLahir || '-'}
              </p>
            </div>
            <div className="bg-slate-900/95 p-3.5">
              <p className="text-[11px] font-medium text-slate-400">No. HP</p>
              <p className="mt-0.5 font-mono text-xs font-semibold text-white tabular-nums">
                {learner.telepon || '-'}
              </p>
            </div>
            <div className="bg-slate-900/95 p-3.5">
              <p className="text-[11px] font-medium text-slate-400">
                Kehadiran
              </p>
              <p className="mt-0.5 font-mono text-xs font-bold text-emerald-400 tabular-nums">
                {attSummary.pct}% ({attSummary.hadir}/{attSummary.total})
              </p>
            </div>
          </div>
        </div>

        {/* Attendance Log & CBT Scores */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900">
            <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">
              Riwayat Presensi Harian ({lAttendance.length})
            </h2>
            {lAttendance.length === 0 ? (
              <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">
                Belum ada catatan presensi.
              </p>
            ) : (
              <div className="mt-3 max-h-64 divide-y divide-slate-100 overflow-y-auto dark:divide-slate-800">
                {lAttendance.slice(0, 12).map((a) => (
                  <div
                    key={a.id}
                    className="flex items-center justify-between py-2.5 text-xs"
                  >
                    <div>
                      <span className="font-mono font-semibold text-slate-800 dark:text-slate-200">
                        {a.tanggal}
                      </span>
                      <span className="ml-2 text-slate-500 dark:text-slate-400">
                        {a.modePembelajaran} · {a.waktuCatat}
                      </span>
                    </div>
                    <span
                      className={`rounded-md px-2 py-0.5 font-semibold ${
                        a.status === 'Hadir'
                          ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300'
                          : a.status === 'Alfa'
                          ? 'bg-red-50 text-red-700 dark:bg-red-950/60 dark:text-red-300'
                          : 'bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300'
                      }`}
                    >
                      {a.status}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900">
            <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">
              Riwayat Nilai Evaluasi CBT ({lAttempts.length})
            </h2>
            {lAttempts.length === 0 ? (
              <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">
                Belum ada riwayat ujian CBT.
              </p>
            ) : (
              <div className="mt-3 max-h-64 divide-y divide-slate-100 overflow-y-auto dark:divide-slate-800">
                {lAttempts.map((at) => (
                  <div
                    key={at.id}
                    className="flex items-center justify-between py-2.5 text-xs"
                  >
                    <div className="min-w-0 pr-3">
                      <p className="truncate font-semibold text-slate-900 dark:text-slate-100">
                        {at.quizJudul}
                      </p>
                      <p className="font-mono text-[11px] text-slate-500 dark:text-slate-400">
                        {at.mataPelajaran} · {at.tanggalPengerjaan.slice(0, 10)}
                      </p>
                    </div>
                    <div className="shrink-0 text-right font-mono tabular-nums">
                      <span
                        className={`text-sm font-bold ${
                          at.tuntas
                            ? 'text-emerald-700 dark:text-emerald-400'
                            : 'text-red-700 dark:text-red-400'
                        }`}
                      >
                        {at.skor}
                      </span>
                      <span className="text-slate-400">/{at.targetNilai}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Documents, Materials & Class Schedule */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Arsip Dokumen Drive */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center gap-2 text-sm font-bold text-slate-900 dark:text-slate-100">
              <FileText className="h-4 w-4 text-blue-700 dark:text-blue-400" />
              <span>Arsip Dokumen ({lDocs.length})</span>
            </div>
            {lDocs.length === 0 ? (
              <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">
                Belum ada dokumen terunggah.
              </p>
            ) : (
              <ul className="mt-3 space-y-2 text-xs">
                {lDocs.map((d) => (
                  <li
                    key={d.id}
                    className="flex items-center justify-between rounded-lg border border-slate-200 p-2.5 dark:border-slate-800"
                  >
                    <div className="min-w-0 pr-2">
                      <p className="truncate font-semibold text-slate-800 dark:text-slate-200">
                        {d.kategori}
                      </p>
                      <p className="truncate text-[11px] text-slate-500 dark:text-slate-400">
                        {d.namaFile}
                      </p>
                    </div>
                    {d.driveWebViewLink && (
                      <a
                        href={d.driveWebViewLink}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex shrink-0 items-center gap-1 font-medium text-blue-700 hover:underline dark:text-blue-400"
                      >
                        <span>Drive</span>
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Materi Belajar Kelas */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center gap-2 text-sm font-bold text-slate-900 dark:text-slate-100">
              <BookOpen className="h-4 w-4 text-emerald-700 dark:text-emerald-400" />
              <span>Materi Belajar ({lModules.length})</span>
            </div>
            {lModules.length === 0 ? (
              <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">
                Belum ada materi untuk kelas ini.
              </p>
            ) : (
              <ul className="mt-3 space-y-2 text-xs">
                {lModules.map((m) => (
                  <li
                    key={m.id}
                    className="flex items-center justify-between rounded-lg border border-slate-200 p-2.5 dark:border-slate-800"
                  >
                    <div className="min-w-0 pr-2">
                      <p className="truncate font-semibold text-slate-800 dark:text-slate-200">
                        {m.judul}
                      </p>
                      <p className="truncate text-[11px] text-slate-500 dark:text-slate-400">
                        {m.mataPelajaran} · {m.bobotSkk} SKK
                      </p>
                    </div>
                    {m.materiDriveUrl && (
                      <a
                        href={m.materiDriveUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex shrink-0 items-center gap-1 font-medium text-blue-700 hover:underline dark:text-blue-400"
                      >
                        <span>Unduh</span>
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Jadwal KBM Kelas */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center gap-2 text-sm font-bold text-slate-900 dark:text-slate-100">
              <CalendarClock className="h-4 w-4 text-amber-600 dark:text-amber-400" />
              <span>Jadwal KBM Kelas ({lSchedules.length})</span>
            </div>
            {lSchedules.length === 0 ? (
              <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">
                Belum ada jadwal khusus kelas ini.
              </p>
            ) : (
              <ul className="mt-3 space-y-2 text-xs">
                {lSchedules.map((s) => (
                  <li
                    key={s.id}
                    className="rounded-lg border border-slate-200 p-2.5 dark:border-slate-800"
                  >
                    <div className="flex items-center justify-between font-semibold text-slate-800 dark:text-slate-200">
                      <span>{s.mapel}</span>
                      <span className="font-mono text-[11px] text-blue-700 dark:text-blue-400">
                        {s.hari}
                      </span>
                    </div>
                    <p className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-400">
                      {s.jamMulai}–{s.jamSelesai} · {s.metode} · {s.tutor}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

interface StandaloneExamViewProps {
  kodePaket: string;
  institutionName: string;
  learners: Learner[];
  quizzes: Quiz[];
  onSubmitAttempt: (attempt: QuizAttempt) => void;
  onBackToPortal: () => void;
}

export const StandaloneExamView: React.FC<StandaloneExamViewProps> = ({
  kodePaket,
  institutionName,
  learners,
  quizzes,
  onSubmitAttempt,
  onBackToPortal,
}) => {
  const quiz = useMemo(() => {
    const clean = kodePaket.trim().toLowerCase();
    return (
      quizzes.find(
        (q) =>
          (q.kodePaket && q.kodePaket.toLowerCase() === clean) ||
          q.id.toLowerCase() === clean
      ) || null
    );
  }, [quizzes, kodePaket]);

  const [nisnInput, setNisnInput] = useState('');
  const [verifiedLearner, setVerifiedLearner] = useState<Learner | null>(null);
  const [lookupError, setLookupError] = useState<string | null>(null);

  const [examStarted, setExamStarted] = useState(false);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [questionDurations, setQuestionDurations] = useState<
    Record<string, number>
  >({});
  const [remainingSeconds, setRemainingSeconds] = useState(0);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [activeQIdx, setActiveQIdx] = useState(0);
  const [submittedAttempt, setSubmittedAttempt] = useState<QuizAttempt | null>(
    null
  );

  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    if (!examStarted || !quiz || submittedAttempt) return;
    timerRef.current = window.setInterval(() => {
      setElapsedSeconds((e) => e + 1);
      setRemainingSeconds((r) => (r > 0 ? r - 1 : 0));
      const curQ = quiz.soal[activeQIdx];
      if (curQ) {
        setQuestionDurations((prev) => ({
          ...prev,
          [curQ.id]: (prev[curQ.id] || 0) + 1,
        }));
      }
    }, 1000);
    return () => {
      if (timerRef.current !== null) window.clearInterval(timerRef.current);
    };
  }, [examStarted, quiz, activeQIdx, submittedAttempt]);

  const handleVerifyLearner = (e: React.FormEvent) => {
    e.preventDefault();
    setLookupError(null);
    const cleaned = nisnInput.trim().toLowerCase();
    const found = learners.find(
      (l) =>
        l.nisn.toLowerCase() === cleaned || l.id.toLowerCase() === cleaned
    );
    if (!found) {
      setLookupError('NISN / ID Warga Belajar tidak ditemukan di lembaga ini.');
      return;
    }
    setVerifiedLearner(found);
  };

  const handleStartExam = () => {
    if (!quiz || !verifiedLearner) return;
    setAnswers({});
    setQuestionDurations({});
    setElapsedSeconds(0);
    setRemainingSeconds(quiz.durasiMenit * 60);
    setActiveQIdx(0);
    setSubmittedAttempt(null);
    setExamStarted(true);
  };

  const handleFinishExam = () => {
    if (!quiz || !verifiedLearner || submittedAttempt) return;
    let totalWeight = 0;
    let earnedWeight = 0;
    let totalBenar = 0;

    const detailSoal: QuestionAttemptDetail[] = quiz.soal.map((q) => {
      const chosen = answers[q.id] ?? null;
      const benar = chosen === q.kunciJawaban;
      const w = q.bobot || 10;
      totalWeight += w;
      if (benar) {
        earnedWeight += w;
        totalBenar++;
      }
      return {
        questionId: q.id,
        jawabanDipilih: chosen,
        benar,
        durasiDetik: questionDurations[q.id] || 0,
      };
    });

    const skor =
      totalWeight > 0 ? Math.round((earnedWeight / totalWeight) * 100) : 0;

    const attempt: QuizAttempt = {
      id: `ATT-${Date.now().toString().slice(-6)}`,
      institutionId: verifiedLearner.institutionId,
      quizId: quiz.id,
      quizJudul: quiz.judul,
      mataPelajaran: quiz.mataPelajaran,
      moduleId: quiz.moduleId,
      modePembelajaran: quiz.modePembelajaran,
      learnerId: verifiedLearner.id,
      learnerNama: verifiedLearner.nama,
      tanggalPengerjaan: new Date().toISOString(),
      skor,
      targetNilai: quiz.targetNilai,
      tuntas: skor >= quiz.targetNilai,
      totalBenar,
      totalSoal: quiz.soal.length,
      totalDurasiDetik: elapsedSeconds,
      detailSoal,
    };

    onSubmitAttempt(attempt);
    setSubmittedAttempt(attempt);
    setExamStarted(false);
  };

  useEffect(() => {
    if (examStarted && remainingSeconds === 0 && quiz && !submittedAttempt) {
      handleFinishExam();
    }
  }, [remainingSeconds, examStarted]);

  if (!quiz) {
    return (
      <div className="min-h-screen bg-slate-50 px-4 py-12 dark:bg-slate-950">
        <div className="mx-auto max-w-xl rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <GraduationCap className="mx-auto h-10 w-10 text-amber-600" />
          <h1 className="mt-3 text-xl font-bold text-slate-900 dark:text-slate-100">
            Paket Ujian Tidak Ditemukan
          </h1>
          <p className="mt-1.5 text-sm text-slate-600 dark:text-slate-400">
            Kode Paket <span className="font-mono font-bold">{kodePaket}</span> tidak terdaftar di {institutionName}.
          </p>
          <button
            type="button"
            onClick={onBackToPortal}
            className="mt-6 inline-flex items-center gap-2 rounded-xl bg-blue-700 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-800"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Kembali ke Portal Admin</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 px-4 py-6 dark:bg-slate-950 sm:px-6">
      <div className="mx-auto max-w-3xl space-y-6">
        {/* Top Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <button
            type="button"
            onClick={onBackToPortal}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Kembali ke Portal Admin</span>
          </button>
          <span className="rounded-lg bg-blue-900 px-3 py-1 font-mono text-xs font-bold text-blue-100">
            CBT · KODE {quiz.kodePaket || quiz.id}
          </span>
        </div>

        {/* Quiz Header Card */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs dark:border-slate-800 dark:bg-slate-900">
          <p className="text-xs font-semibold text-blue-700 dark:text-blue-400">
            {institutionName} · {quiz.mataPelajaran} ({quiz.program})
          </p>
          <h1 className="mt-1 text-xl font-bold text-slate-900 dark:text-slate-100">
            {quiz.judul}
          </h1>
          <div className="mt-3 flex flex-wrap gap-4 font-mono text-xs text-slate-600 dark:text-slate-400">
            <span>{quiz.soal.length} Soal</span>
            <span>Durasi: {quiz.durasiMenit} menit</span>
            <span>Target KKM: {quiz.targetNilai}</span>
            <span>Tutor: {quiz.tutorPembuat}</span>
          </div>
        </div>

        {/* Step 1: Identify Learner */}
        {!verifiedLearner && !submittedAttempt && (
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs dark:border-slate-800 dark:bg-slate-900">
            <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
              Verifikasi Identitas Peserta Ujian
            </h2>
            <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">
              Masukkan NISN atau ID Warga Belajar Anda untuk memulai sesi CBT.
            </p>
            <form onSubmit={handleVerifyLearner} className="mt-4 flex flex-col gap-2 sm:flex-row">
              <input
                type="text"
                required
                value={nisnInput}
                onChange={(e) => setNisnInput(e.target.value)}
                placeholder="Masukkan NISN atau ID (contoh: 0084512901)"
                className="flex-1 rounded-xl border border-slate-200 bg-white px-4 py-2.5 font-mono text-sm focus:border-blue-600 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
              />
              <button
                type="submit"
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-700 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-800"
              >
                <UserCheck className="h-4 w-4" />
                <span>Verifikasi Peserta</span>
              </button>
            </form>
            {lookupError && (
              <p className="mt-2 text-xs font-medium text-red-600 dark:text-red-400">
                {lookupError}
              </p>
            )}
            <div className="mt-4 border-t border-slate-200 pt-3 dark:border-slate-800">
              <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                Pilih cepat peserta aktif:
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                {learners.slice(0, 4).map((l) => (
                  <button
                    key={l.id}
                    type="button"
                    onClick={() => {
                      setNisnInput(l.nisn);
                      setVerifiedLearner(l);
                    }}
                    className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
                  >
                    {l.nama} ({l.nisn})
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Step 2: Start Confirmation */}
        {verifiedLearner && !examStarted && !submittedAttempt && (
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50/50 p-6 dark:border-emerald-900/60 dark:bg-emerald-950/30">
            <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
              <div>
                <p className="text-xs font-semibold text-emerald-700 dark:text-emerald-400">
                  Peserta Terverifikasi
                </p>
                <h2 className="mt-0.5 text-lg font-bold text-slate-900 dark:text-slate-100">
                  {verifiedLearner.nama}
                </h2>
                <p className="font-mono text-xs text-slate-600 dark:text-slate-300">
                  NISN {verifiedLearner.nisn} · {verifiedLearner.program} ({verifiedLearner.kelas || verifiedLearner.rombel})
                </p>
              </div>
              <button
                type="button"
                onClick={handleStartExam}
                className="inline-flex items-center gap-2 rounded-xl bg-emerald-700 px-6 py-3 text-sm font-bold text-white hover:bg-emerald-800"
              >
                <Play className="h-4 w-4" />
                <span>Mulai Ujian Sekarang</span>
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Active CBT Workspace */}
        {examStarted && quiz.soal[activeQIdx] && !submittedAttempt && (
          <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-xs dark:border-slate-800 dark:bg-slate-900">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-4 dark:border-slate-800">
              <div className="font-mono text-xs text-slate-600 dark:text-slate-300">
                Soal {activeQIdx + 1} / {quiz.soal.length} · Terjawab{' '}
                {Object.keys(answers).length}/{quiz.soal.length}
              </div>
              <div className="inline-flex items-center gap-1.5 rounded-lg bg-amber-50 px-3 py-1 font-mono text-xs font-bold text-amber-800 dark:bg-amber-950/60 dark:text-amber-300">
                <Clock className="h-3.5 w-3.5" />
                <span>
                  Sisa {String(Math.floor(remainingSeconds / 60)).padStart(2, '0')}:
                  {String(remainingSeconds % 60).padStart(2, '0')}
                </span>
              </div>
            </div>

            <div className="flex flex-wrap gap-1.5">
              {quiz.soal.map((q, idx) => {
                const answered = answers[q.id] !== undefined;
                const current = idx === activeQIdx;
                return (
                  <button
                    key={q.id}
                    type="button"
                    onClick={() => setActiveQIdx(idx)}
                    className={`h-8 w-8 rounded-lg font-mono text-xs font-bold transition-colors ${
                      current
                        ? 'bg-blue-700 text-white'
                        : answered
                        ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                        : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'
                    }`}
                  >
                    {idx + 1}
                  </button>
                );
              })}
            </div>

            {(() => {
              const q = quiz.soal[activeQIdx];
              const chosen = answers[q.id];
              return (
                <div className="space-y-4 pt-2">
                  <p className="text-base font-semibold leading-relaxed text-slate-900 dark:text-slate-100">
                    {activeQIdx + 1}. {q.pertanyaan}
                  </p>
                  <div className="space-y-2.5">
                    {q.pilihan.map((opt, oIdx) => {
                      const selected = chosen === oIdx;
                      return (
                        <button
                          key={oIdx}
                          type="button"
                          onClick={() =>
                            setAnswers((prev) => ({ ...prev, [q.id]: oIdx }))
                          }
                          className={`flex w-full items-center gap-3 rounded-xl border px-4 py-3 text-left text-sm transition-colors ${
                            selected
                              ? 'border-blue-700 bg-blue-50 font-semibold text-blue-900 dark:border-blue-500 dark:bg-blue-950/50 dark:text-blue-200'
                              : 'border-slate-200 bg-white text-slate-800 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800/60 dark:text-slate-200 dark:hover:bg-slate-800'
                          }`}
                        >
                          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md border border-current font-mono text-xs font-bold">
                            {String.fromCharCode(65 + oIdx)}
                          </span>
                          <span>{opt}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })()}

            <div className="flex items-center justify-between border-t border-slate-200 pt-4 dark:border-slate-800">
              <button
                type="button"
                disabled={activeQIdx === 0}
                onClick={() => setActiveQIdx((i) => Math.max(0, i - 1))}
                className="rounded-lg border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-700 disabled:opacity-40 dark:border-slate-700 dark:text-slate-200"
              >
                Sebelumnya
              </button>
              <div className="flex items-center gap-2">
                {activeQIdx < quiz.soal.length - 1 ? (
                  <button
                    type="button"
                    onClick={() =>
                      setActiveQIdx((i) => Math.min(quiz.soal.length - 1, i + 1))
                    }
                    className="rounded-lg bg-slate-900 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-900"
                  >
                    Soal Berikutnya
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleFinishExam}
                    className="rounded-lg bg-emerald-700 px-5 py-2 text-xs font-bold text-white hover:bg-emerald-800"
                  >
                    Selesai & Kumpulkan
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Step 4: Auto-Graded Result */}
        {submittedAttempt && (
          <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-xs dark:border-slate-800 dark:bg-slate-900">
            <div className="flex flex-col justify-between gap-4 border-b border-slate-200 pb-4 sm:flex-row sm:items-center dark:border-slate-800">
              <div>
                <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                  Hasil Evaluasi Otomatis ({submittedAttempt.learnerNama})
                </p>
                <h2 className="mt-1 text-2xl font-bold text-slate-900 dark:text-slate-100">
                  Skor Akhir:{' '}
                  <span
                    className={
                      submittedAttempt.tuntas
                        ? 'text-emerald-700 dark:text-emerald-400'
                        : 'text-red-700 dark:text-red-400'
                    }
                  >
                    {submittedAttempt.skor}
                  </span>{' '}
                  / 100
                </h2>
                <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">
                  Benar {submittedAttempt.totalBenar} dari {submittedAttempt.totalSoal} soal · Durasi {Math.floor(submittedAttempt.totalDurasiDetik / 60)}m {submittedAttempt.totalDurasiDetik % 60}d
                </p>
              </div>
              <span
                className={`inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-bold ${
                  submittedAttempt.tuntas
                    ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                    : 'bg-red-100 text-red-800 dark:bg-red-950/60 dark:text-red-300'
                }`}
              >
                {submittedAttempt.tuntas ? (
                  <CheckCircle2 className="h-4 w-4" />
                ) : (
                  <XCircle className="h-4 w-4" />
                )}
                {submittedAttempt.tuntas ? 'Tuntas Memenuhi KKM' : 'Belum Mencapai KKM'}
              </span>
            </div>

            <div className="space-y-2.5">
              {quiz.soal.map((q, idx) => {
                const detail = submittedAttempt.detailSoal.find(
                  (d) => d.questionId === q.id
                );
                return (
                  <div
                    key={q.id}
                    className="rounded-xl border border-slate-200 p-4 text-xs dark:border-slate-800"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <p className="font-semibold text-slate-900 dark:text-slate-100">
                        {idx + 1}. {q.pertanyaan}
                      </p>
                      <span
                        className={
                          detail?.benar
                            ? 'font-bold text-emerald-700 dark:text-emerald-400'
                            : 'font-bold text-red-700 dark:text-red-400'
                        }
                      >
                        {detail?.benar ? 'Benar' : 'Salah'}
                      </span>
                    </div>
                    <p className="mt-1 text-slate-600 dark:text-slate-400">
                      Kunci: <strong>{String.fromCharCode(65 + q.kunciJawaban)}</strong> ({q.pilihan[q.kunciJawaban]})
                    </p>
                    {q.pembahasan && (
                      <p className="mt-1 text-slate-500 dark:text-slate-400">
                        Pembahasan: {q.pembahasan}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
