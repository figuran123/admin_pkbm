import React, { useMemo, useState } from 'react';
import {
  AlertTriangle,
  ArrowUpRight,
  BarChart3,
  CheckCircle2,
  Clock,
  FileSpreadsheet,
  QrCode,
  Send,
} from 'lucide-react';
import {
  AttendanceRecord,
  Learner,
  LearnerDocument,
  Quiz,
  QuizAttempt,
  TutorNotification,
} from '../types';

interface AnalyticsDashboardProps {
  learners: Learner[];
  documents: LearnerDocument[];
  attendance: AttendanceRecord[];
  quizzes: Quiz[];
  attempts: QuizAttempt[];
  notifications: TutorNotification[];
  onInspectLearner: (learnerId: string) => void;
  onOpenCard: (learnerId: string) => void;
  onOpenNotifications: () => void;
  onStartQuiz: () => void;
}

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.round(seconds % 60);
  return `${m}m ${String(s).padStart(2, '0')}d`;
}

function extractKelasNumber(kelas?: string, program?: string): number {
  if (kelas) {
    const m = kelas.match(/(\d+)/);
    if (m) return Number(m[1]);
  }
  if (program === 'Paket A') return 6;
  if (program === 'Paket B') return 9;
  return 12;
}

export const AnalyticsDashboard: React.FC<AnalyticsDashboardProps> = ({
  learners,
  documents,
  attendance,
  quizzes,
  attempts,
  notifications,
  onInspectLearner,
  onOpenCard,
  onOpenNotifications,
  onStartQuiz,
}) => {
  const [taFilter, setTaFilter] = useState<string>('Semua');
  const [programFilter, setProgramFilter] = useState<string>('Semua');
  const [hoveredClassIdx, setHoveredClassIdx] = useState<number | null>(null);
  const [hoveredSubject, setHoveredSubject] = useState<string | null>(null);
  const [hoveredDayIndex, setHoveredDayIndex] = useState<number | null>(null);

  const availableTAs = useMemo(() => {
    const set = new Set<string>(['2026/2027', '2025/2026', '2024/2025']);
    learners.forEach((l) => {
      if (l.tahunAjaran) set.add(l.tahunAjaran);
    });
    return Array.from(set).sort().reverse();
  }, [learners]);

  const taLearners = useMemo(
    () =>
      learners.filter(
        (l) => taFilter === 'Semua' || (l.tahunAjaran || '2026/2027') === taFilter
      ),
    [learners, taFilter]
  );

  const activeLearners = useMemo(
    () => taLearners.filter((l) => l.status === 'Aktif'),
    [taLearners]
  );

  const jenjangCounts = useMemo(() => {
    const a = activeLearners.filter((l) => l.program === 'Paket A').length;
    const b = activeLearners.filter((l) => l.program === 'Paket B').length;
    const c = activeLearners.filter(
      (l) => l.program === 'Paket C' || l.program === 'Kursus Vokasi'
    ).length;
    return { a, b, c };
  }, [activeLearners]);

  const latestAttendanceDate = useMemo(() => {
    if (attendance.length === 0) return '2026-11-15';
    return attendance
      .map((a) => a.tanggal)
      .sort()
      .slice(-1)[0];
  }, [attendance]);

  const hadirHariIni = useMemo(() => {
    const ids = new Set(taLearners.map((l) => l.id));
    return attendance.filter(
      (a) =>
        a.tanggal === latestAttendanceDate &&
        a.status === 'Hadir' &&
        ids.has(a.learnerId)
    ).length;
  }, [attendance, latestAttendanceDate, taLearners]);

  const classCounts = useMemo(() => {
    const counts = Array.from({ length: 12 }, (_, idx) => ({
      kelasNum: idx + 1,
      label: `K${idx + 1}`,
      fullLabel: `Kelas ${idx + 1}`,
      count: 0,
      jenjang:
        idx < 6 ? 'Paket A' : idx < 9 ? 'Paket B' : 'Paket C / Vokasi',
    }));
    for (const l of activeLearners) {
      const kNum = extractKelasNumber(l.kelas, l.program);
      if (kNum >= 1 && kNum <= 12) {
        counts[kNum - 1].count += 1;
      }
    }
    return counts;
  }, [activeLearners]);

  const maxClassCount = useMemo(
    () => Math.max(1, ...classCounts.map((c) => c.count)),
    [classCounts]
  );

  const overallAttendanceRate = useMemo(() => {
    if (attendance.length === 0) return 0;
    const present = attendance.filter((a) => a.status === 'Hadir').length;
    return Math.round((present / attendance.length) * 100);
  }, [attendance]);

  const competencyStats = useMemo(() => {
    if (attempts.length === 0) {
      return { avgScore: 0, passRate: 0, avgDuration: 0 };
    }
    const avgScore = Math.round(
      attempts.reduce((sum, a) => sum + a.skor, 0) / attempts.length
    );
    const passed = attempts.filter((a) => a.tuntas).length;
    const passRate = Math.round((passed / attempts.length) * 100);
    const avgDuration = Math.round(
      attempts.reduce((sum, a) => sum + a.totalDurasiDetik, 0) / attempts.length
    );
    return { avgScore, passRate, avgDuration };
  }, [attempts]);

  const pendingAlertsCount = useMemo(
    () =>
      notifications.filter((n) => n.statusKirim === 'Menunggu Tindakan').length,
    [notifications]
  );

  // Subject breakdown for Bar Chart
  const subjectData = useMemo(() => {
    const map = new Map<
      string,
      { subject: string; totalScore: number; totalTarget: number; count: number }
    >();
    for (const att of attempts) {
      const curr = map.get(att.mataPelajaran) || {
        subject: att.mataPelajaran,
        totalScore: 0,
        totalTarget: 0,
        count: 0,
      };
      curr.totalScore += att.skor;
      curr.totalTarget += att.targetNilai;
      curr.count += 1;
      map.set(att.mataPelajaran, curr);
    }
    return Array.from(map.values()).map((item) => ({
      subject: item.subject,
      avgScore: Math.round(item.totalScore / item.count),
      avgTarget: Math.round(item.totalTarget / item.count),
      count: item.count,
    }));
  }, [attempts]);

  // Daily attendance trend (last 10 distinct dates)
  const attendanceTrend = useMemo(() => {
    const dateMap = new Map<string, { present: number; total: number }>();
    for (const rec of attendance) {
      const curr = dateMap.get(rec.tanggal) || { present: 0, total: 0 };
      curr.total += 1;
      if (rec.status === 'Hadir') curr.present += 1;
      dateMap.set(rec.tanggal, curr);
    }
    return Array.from(dateMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-10)
      .map(([tanggal, val]) => ({
        tanggal,
        label: tanggal.slice(5),
        rate: val.total > 0 ? Math.round((val.present / val.total) * 100) : 0,
        present: val.present,
        total: val.total,
      }));
  }, [attendance]);

  // Individual evaluation matrix
  const learnerRows = useMemo(() => {
    return taLearners
      .filter((l) => programFilter === 'Semua' || l.program === programFilter)
      .map((learner) => {
        const lAtt = attendance.filter((a) => a.learnerId === learner.id);
        const lPresent = lAtt.filter((a) => a.status === 'Hadir').length;
        const attRate =
          lAtt.length > 0 ? Math.round((lPresent / lAtt.length) * 100) : 100;

        const lAttempts = attempts
          .filter((at) => at.learnerId === learner.id)
          .sort((a, b) => b.tanggalPengerjaan.localeCompare(a.tanggalPengerjaan));
        const avgScore =
          lAttempts.length > 0
            ? Math.round(
                lAttempts.reduce((sum, a) => sum + a.skor, 0) / lAttempts.length
              )
            : null;
        const avgDuration =
          lAttempts.length > 0
            ? Math.round(
                lAttempts.reduce((sum, a) => sum + a.totalDurasiDetik, 0) /
                  lAttempts.length
              )
            : 0;

        const isAchieved =
          avgScore !== null
            ? avgScore >= learner.targetKompetensi && attRate >= 75
            : attRate >= 75;

        return {
          learner,
          attRate,
          avgScore,
          attemptCount: lAttempts.length,
          avgDuration,
          isAchieved,
        };
      });
  }, [taLearners, attendance, attempts, programFilter]);

  return (
    <div className="space-y-6">
      {/* Header Row with Tahun Ajaran Filter */}
      <div className="flex flex-col gap-4 border-b border-slate-200 pb-5 dark:border-slate-800 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
            Ringkasan Data Warga Belajar, Kelas 1–12 & Analitik Kompetensi Real-Time
          </p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
            Dashboard Utama PKBM Digital
          </h1>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-1.5 dark:border-slate-800 dark:bg-slate-900">
            <label
              htmlFor="dashTaFilter"
              className="text-xs font-semibold text-slate-600 dark:text-slate-400 whitespace-nowrap"
            >
              Tahun Ajaran:
            </label>
            <select
              id="dashTaFilter"
              value={taFilter}
              onChange={(e) => setTaFilter(e.target.value)}
              className="bg-transparent text-xs font-semibold text-slate-900 focus:outline-none dark:text-slate-100"
            >
              <option value="Semua" className="dark:bg-slate-900">
                Semua Tahun Ajaran
              </option>
              {availableTAs.map((ta) => (
                <option key={ta} value={ta} className="dark:bg-slate-900">
                  {ta}
                </option>
              ))}
            </select>
          </div>

          <button
            type="button"
            onClick={onOpenNotifications}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800 whitespace-nowrap"
          >
            <AlertTriangle className="h-4 w-4 text-amber-600" />
            <span className="tabular-nums">EWS Tutor ({pendingAlertsCount})</span>
          </button>

          <button
            type="button"
            onClick={onStartQuiz}
            className="inline-flex items-center gap-2 rounded-lg bg-blue-700 px-3.5 py-2 text-xs font-semibold text-white transition-colors hover:bg-blue-800 whitespace-nowrap"
          >
            <span>Ruang Ujian CBT</span>
            <ArrowUpRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* 5-Column PKBM Digital KPI Row */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <div className="rounded-xl border border-slate-200 border-t-4 border-t-sky-600 bg-white p-4 shadow-xs dark:border-slate-800 dark:border-t-sky-500 dark:bg-slate-900">
          <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
            Warga Belajar Aktif
          </p>
          <p className="mt-2 font-mono text-3xl font-bold text-slate-900 tabular-nums dark:text-slate-100">
            {activeLearners.length}
          </p>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            Total {taLearners.length} terdaftar · Kehadiran {overallAttendanceRate}%
          </p>
        </div>

        <div className="rounded-xl border border-slate-200 border-t-4 border-t-red-600 bg-white p-4 shadow-xs dark:border-slate-800 dark:border-t-red-500 dark:bg-slate-900">
          <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
            Paket A (SD)
          </p>
          <p className="mt-2 font-mono text-3xl font-bold text-red-700 tabular-nums dark:text-red-400">
            {jenjangCounts.a}
          </p>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            Kelas 1 s.d. Kelas 6
          </p>
        </div>

        <div className="rounded-xl border border-slate-200 border-t-4 border-t-blue-900 bg-white p-4 shadow-xs dark:border-slate-800 dark:border-t-blue-500 dark:bg-slate-900">
          <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
            Paket B (SMP)
          </p>
          <p className="mt-2 font-mono text-3xl font-bold text-blue-900 tabular-nums dark:text-blue-400">
            {jenjangCounts.b}
          </p>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            Kelas 7 s.d. Kelas 9
          </p>
        </div>

        <div className="rounded-xl border border-slate-200 border-t-4 border-t-slate-600 bg-white p-4 shadow-xs dark:border-slate-800 dark:border-t-slate-400 dark:bg-slate-900">
          <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
            Paket C (SMA) / Vokasi
          </p>
          <p className="mt-2 font-mono text-3xl font-bold text-slate-700 tabular-nums dark:text-slate-200">
            {jenjangCounts.c}
          </p>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            Kelas 10 s.d. Kelas 12
          </p>
        </div>

        <div className="rounded-xl border border-slate-200 border-t-4 border-t-amber-500 bg-white p-4 shadow-xs dark:border-slate-800 dark:border-t-amber-400 dark:bg-slate-900">
          <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
            Hadir Hari Ini ({latestAttendanceDate.slice(5)})
          </p>
          <p className="mt-2 font-mono text-3xl font-bold text-amber-600 tabular-nums dark:text-amber-400">
            {hadirHariIni}
          </p>
          <p className="mt-1 font-mono text-xs text-slate-500 tabular-nums dark:text-slate-400">
            {quizzes.length} Paket Soal · {documents.length} Berkas
          </p>
        </div>
      </div>

      {/* 2-Column Class Distribution Chart + K1..K12 Breakdown */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Left: Grafik Warga Belajar per Kelas (1 - 12) */}
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-xs dark:border-slate-800 dark:bg-slate-900 lg:col-span-7">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="flex items-center gap-2 text-base font-bold text-slate-900 dark:text-slate-100">
                <BarChart3 className="h-4 w-4 text-blue-700 dark:text-blue-400" />
                <span>Grafik Warga Belajar per Kelas (Kelas 1 – 12)</span>
              </h2>
              <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                Sebaran peserta didik aktif berdasarkan jenjang kesetaraan
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3 text-[11px] font-medium text-slate-600 dark:text-slate-400">
              <span className="flex items-center gap-1.5">
                <span className="inline-block h-2.5 w-2.5 rounded-xs bg-red-600" />
                Paket A (K1–6)
              </span>
              <span className="flex items-center gap-1.5">
                <span className="inline-block h-2.5 w-2.5 rounded-xs bg-blue-900 dark:bg-blue-500" />
                Paket B (K7–9)
              </span>
              <span className="flex items-center gap-1.5">
                <span className="inline-block h-2.5 w-2.5 rounded-xs bg-slate-600 dark:bg-slate-400" />
                Paket C (K10–12)
              </span>
            </div>
          </div>

          <div className="mt-6 flex h-56 items-end gap-2 border-b border-slate-200 pb-2 dark:border-slate-800">
            {classCounts.map((item, idx) => {
              const heightPct = Math.round((item.count / maxClassCount) * 100);
              const barColor =
                item.kelasNum <= 6
                  ? 'bg-red-600 hover:bg-red-500'
                  : item.kelasNum <= 9
                  ? 'bg-blue-900 hover:bg-blue-800 dark:bg-blue-600 dark:hover:bg-blue-500'
                  : 'bg-slate-600 hover:bg-slate-500 dark:bg-slate-500 dark:hover:bg-slate-400';

              return (
                <div
                  key={item.label}
                  onMouseEnter={() => setHoveredClassIdx(idx)}
                  onMouseLeave={() => setHoveredClassIdx(null)}
                  className="group flex flex-1 flex-col items-center justify-end h-full"
                >
                  <span
                    className={`mb-1 font-mono text-[11px] font-bold tabular-nums transition-opacity ${
                      hoveredClassIdx === idx || item.count > 0
                        ? 'text-slate-700 dark:text-slate-200'
                        : 'text-slate-300 dark:text-slate-600'
                    }`}
                  >
                    {item.count}
                  </span>
                  <div className="flex w-full flex-1 items-end justify-center px-0.5">
                    <div
                      className={`w-full max-w-[34px] rounded-t transition-all duration-300 ${barColor}`}
                      style={{
                        height: `${Math.max(item.count > 0 ? 12 : 3, heightPct)}%`,
                        opacity: item.count > 0 ? 1 : 0.2,
                      }}
                      title={`${item.fullLabel} (${item.jenjang}): ${item.count} WB`}
                    />
                  </div>
                </div>
              );
            })}
          </div>
          <div className="mt-2 flex gap-2">
            {classCounts.map((item) => (
              <div
                key={item.label}
                className="flex-1 text-center font-mono text-[11px] font-semibold text-slate-600 dark:text-slate-400"
              >
                {item.label}
              </div>
            ))}
          </div>
        </div>

        {/* Right: Rincian Jumlah per Tingkatan Kelas */}
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-xs dark:border-slate-800 dark:bg-slate-900 lg:col-span-5 space-y-4">
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
              Rincian Jumlah per Tingkatan Kelas
            </h2>
            <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
              Rekapitulasi jumlah warga belajar aktif per kelas
            </p>
          </div>

          <div className="space-y-3">
            <div>
              <p className="mb-1.5 text-xs font-bold text-red-700 dark:text-red-400">
                Paket A (SD / Kelas 1–6)
              </p>
              <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
                {classCounts.slice(0, 6).map((c) => (
                  <div
                    key={c.label}
                    className="rounded-lg border border-red-200 bg-red-50/60 px-2 py-2 text-center dark:border-red-900/50 dark:bg-red-950/30"
                  >
                    <p className="font-mono text-[10px] font-semibold text-red-700 dark:text-red-400">
                      {c.label}
                    </p>
                    <p className="font-mono text-base font-bold text-slate-900 tabular-nums dark:text-slate-100">
                      {c.count}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <p className="mb-1.5 text-xs font-bold text-blue-900 dark:text-blue-400">
                Paket B (SMP / Kelas 7–9)
              </p>
              <div className="grid grid-cols-3 gap-2">
                {classCounts.slice(6, 9).map((c) => (
                  <div
                    key={c.label}
                    className="rounded-lg border border-blue-200 bg-blue-50/60 px-2 py-2 text-center dark:border-blue-900/50 dark:bg-blue-950/30"
                  >
                    <p className="font-mono text-[10px] font-semibold text-blue-800 dark:text-blue-400">
                      {c.label}
                    </p>
                    <p className="font-mono text-base font-bold text-slate-900 tabular-nums dark:text-slate-100">
                      {c.count}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <p className="mb-1.5 text-xs font-bold text-slate-700 dark:text-slate-300">
                Paket C (SMA / Kelas 10–12)
              </p>
              <div className="grid grid-cols-3 gap-2">
                {classCounts.slice(9, 12).map((c) => (
                  <div
                    key={c.label}
                    className="rounded-lg border border-slate-200 bg-slate-50 px-2 py-2 text-center dark:border-slate-700 dark:bg-slate-800/70"
                  >
                    <p className="font-mono text-[10px] font-semibold text-slate-600 dark:text-slate-400">
                      {c.label}
                    </p>
                    <p className="font-mono text-base font-bold text-slate-900 tabular-nums dark:text-slate-100">
                      {c.count}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between border-t border-slate-200 pt-3 text-xs dark:border-slate-800">
            <span className="text-slate-500 dark:text-slate-400">
              Ketuntasan Evaluasi ({competencyStats.passRate}%) · Rerata{' '}
              <strong className="font-mono text-slate-900 dark:text-slate-100">
                {competencyStats.avgScore}
              </strong>{' '}
              poin
            </span>
            <span className="flex items-center gap-1 font-mono text-slate-500 tabular-nums dark:text-slate-400">
              <Clock className="h-3.5 w-3.5" />
              {formatDuration(competencyStats.avgDuration)}
            </span>
          </div>
        </div>
      </div>

      {/* Competency Charts Row */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Chart 1: Capaian per Mata Pelajaran vs Target KKM */}
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-xs dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
                Capaian Kompetensi per Bidang vs Target KKM
              </h2>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                Perbandingan skor rata-rata individu terhadap ambang ketuntasan
              </p>
            </div>
            <div className="flex items-center gap-4 text-xs text-slate-600 dark:text-slate-400 shrink-0">
              <span className="flex items-center gap-1.5">
                <span className="inline-block h-2.5 w-2.5 rounded-xs bg-blue-700" />
                Skor
              </span>
              <span className="flex items-center gap-1.5">
                <span className="inline-block h-2.5 w-2.5 rounded-xs bg-slate-400" />
                KKM
              </span>
            </div>
          </div>

          <div className="mt-5 space-y-4">
            {subjectData.length === 0 ? (
              <p className="py-10 text-center text-sm text-slate-500 dark:text-slate-400">
                Belum ada data pengerjaan soal.
              </p>
            ) : (
              subjectData.map((item) => {
                const isMet = item.avgScore >= item.avgTarget;
                const isHovered = hoveredSubject === item.subject;
                return (
                  <div
                    key={item.subject}
                    onMouseEnter={() => setHoveredSubject(item.subject)}
                    onMouseLeave={() => setHoveredSubject(null)}
                    className={`rounded-lg p-2 transition-colors ${
                      isHovered ? 'bg-slate-50 dark:bg-slate-800/60' : ''
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2 text-sm">
                      <span className="font-medium text-slate-800 dark:text-slate-200">
                        {item.subject}
                      </span>
                      <div className="flex items-center gap-3 font-mono text-xs tabular-nums">
                        <span
                          className={
                            isMet
                              ? 'font-semibold text-emerald-700 dark:text-emerald-400'
                              : 'font-semibold text-amber-700 dark:text-amber-400'
                          }
                        >
                          {item.avgScore} / {item.avgTarget}
                        </span>
                        <span className="text-slate-400">({item.count} sesi)</span>
                      </div>
                    </div>

                    <div className="relative mt-2 h-4 w-full overflow-hidden rounded bg-slate-100 dark:bg-slate-800">
                      <div
                        className="absolute top-0 bottom-0 z-10 w-0.5 bg-slate-500 dark:bg-slate-300"
                        style={{ left: `${Math.min(100, item.avgTarget)}%` }}
                        title={`Target KKM: ${item.avgTarget}`}
                      />
                      <div
                        className={`h-full rounded-l transition-all duration-300 ${
                          isMet ? 'bg-blue-700' : 'bg-amber-600'
                        }`}
                        style={{ width: `${Math.min(100, item.avgScore)}%` }}
                      />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Chart 2: Tren Kehadiran Harian SVG */}
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-xs dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
                Tren Kehadiran Harian Warga Belajar
              </h2>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                Persentase kehadiran pada 10 hari pertemuan terakhir
              </p>
            </div>
            {hoveredDayIndex !== null && attendanceTrend[hoveredDayIndex] && (
              <div className="text-right font-mono text-xs tabular-nums">
                <p className="font-semibold text-slate-900 dark:text-slate-100">
                  {attendanceTrend[hoveredDayIndex].tanggal}
                </p>
                <p className="text-blue-700 dark:text-blue-400">
                  {attendanceTrend[hoveredDayIndex].rate}% (
                  {attendanceTrend[hoveredDayIndex].present}/
                  {attendanceTrend[hoveredDayIndex].total} hadir)
                </p>
              </div>
            )}
          </div>

          <div className="mt-5">
            {attendanceTrend.length === 0 ? (
              <p className="py-10 text-center text-sm text-slate-500 dark:text-slate-400">
                Belum ada catatan absensi harian.
              </p>
            ) : (
              <div className="w-full overflow-x-auto">
                <svg
                  viewBox="0 0 560 210"
                  className="h-52 w-full"
                  role="img"
                  aria-label="Grafik tren kehadiran harian"
                >
                  {[25, 50, 75, 100].map((val) => {
                    const y = 170 - (val / 100) * 140;
                    return (
                      <g key={val}>
                        <line
                          x1="42"
                          y1={y}
                          x2="540"
                          y2={y}
                          stroke={val === 75 ? '#f59e0b' : '#94a3b8'}
                          strokeOpacity={val === 75 ? 0.9 : 0.25}
                          strokeDasharray={val === 75 ? '4 4' : undefined}
                          strokeWidth="1"
                        />
                        <text
                          x="34"
                          y={y + 4}
                          textAnchor="end"
                          className="fill-slate-400 font-mono text-[10px]"
                        >
                          {val}%
                        </text>
                      </g>
                    );
                  })}

                  {(() => {
                    const pts = attendanceTrend.map((d, idx) => {
                      const x =
                        48 +
                        (attendanceTrend.length === 1
                          ? 240
                          : (idx / (attendanceTrend.length - 1)) * 484);
                      const y = 170 - (d.rate / 100) * 140;
                      return { x, y, ...d };
                    });

                    const linePath = pts
                      .map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`)
                      .join(' ');
                    const areaPath = `${linePath} L ${pts[pts.length - 1].x} 170 L ${pts[0].x} 170 Z`;

                    return (
                      <>
                        <path d={areaPath} fill="#1d4ed8" fillOpacity="0.12" />
                        <path
                          d={linePath}
                          fill="none"
                          stroke="#2563eb"
                          strokeWidth="2.5"
                          strokeLinejoin="round"
                          strokeLinecap="round"
                        />
                        {pts.map((p, idx) => (
                          <g
                            key={p.tanggal}
                            onMouseEnter={() => setHoveredDayIndex(idx)}
                            onMouseLeave={() => setHoveredDayIndex(null)}
                            className="cursor-pointer"
                          >
                            <circle
                              cx={p.x}
                              cy={p.y}
                              r={hoveredDayIndex === idx ? 6 : 4}
                              fill={p.rate < 75 ? '#d97706' : '#2563eb'}
                              stroke="#ffffff"
                              strokeWidth="2"
                            />
                            <text
                              x={p.x}
                              y="194"
                              textAnchor="middle"
                              className="fill-slate-500 font-mono text-[10px]"
                            >
                              {p.label}
                            </text>
                          </g>
                        ))}
                      </>
                    );
                  })()}
                </svg>
              </div>
            )}
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              Garis putus-putus amber menandakan batas minimal kehadiran 75%.
            </p>
          </div>
        </div>
      </div>

      {/* Individual Competency Evaluation Matrix */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-xs dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-col gap-3 border-b border-slate-200 px-6 py-4 dark:border-slate-800 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
              Pemantauan Kompetensi Individu Real-Time
            </h2>
            <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
              Status ketercapaian target KKM dan kehadiran per warga belajar
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-1 rounded-lg bg-slate-100 p-1 dark:bg-slate-800">
            {['Semua', 'Paket A', 'Paket B', 'Paket C', 'Kursus Vokasi'].map(
              (prog) => (
                <button
                  key={prog}
                  type="button"
                  onClick={() => setProgramFilter(prog)}
                  className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                    programFilter === prog
                      ? 'bg-white text-slate-900 shadow-xs dark:bg-slate-900 dark:text-slate-100'
                      : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200'
                  }`}
                >
                  {prog}
                </button>
              )
            )}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/70 text-xs font-semibold text-slate-600 dark:border-slate-800 dark:bg-slate-800/50 dark:text-slate-300">
                <th className="px-6 py-3">Warga Belajar</th>
                <th className="px-4 py-3">Jenjang / Kelas</th>
                <th className="px-4 py-3 text-right">Kehadiran</th>
                <th className="px-4 py-3 text-right">Rata-Rata Skor</th>
                <th className="px-4 py-3 text-right">Durasi Rerata</th>
                <th className="px-4 py-3">Status Kompetensi</th>
                <th className="px-6 py-3 text-right">Aksi Cepat</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
              {learnerRows.map(
                ({
                  learner,
                  attRate,
                  avgScore,
                  attemptCount,
                  avgDuration,
                  isAchieved,
                }) => (
                  <tr
                    key={learner.id}
                    className="transition-colors hover:bg-slate-50/80 dark:hover:bg-slate-800/40"
                  >
                    <td className="px-6 py-3.5">
                      <div className="font-medium text-slate-900 dark:text-slate-100">
                        {learner.nama}
                      </div>
                      <div className="mt-0.5 font-mono text-xs text-slate-500 tabular-nums dark:text-slate-400">
                        {learner.id} · NISN {learner.nisn}
                      </div>
                    </td>
                    <td className="px-4 py-3.5 text-xs text-slate-600 dark:text-slate-300">
                      <div className="font-medium text-slate-800 dark:text-slate-200">
                        {learner.program} · {learner.kelas || learner.rombel}
                      </div>
                      <div className="text-slate-500 dark:text-slate-400">
                        {learner.tahunAjaran || '2026/2027'}
                      </div>
                    </td>
                    <td className="px-4 py-3.5 text-right font-mono text-xs tabular-nums">
                      <span
                        className={
                          attRate >= 75
                            ? 'font-semibold text-slate-800 dark:text-slate-200'
                            : 'font-semibold text-red-700 dark:text-red-400'
                        }
                      >
                        {attRate}%
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-right font-mono text-xs tabular-nums">
                      {avgScore !== null ? (
                        <div>
                          <span
                            className={
                              avgScore >= learner.targetKompetensi
                                ? 'font-semibold text-emerald-700 dark:text-emerald-400'
                                : 'font-semibold text-red-700 dark:text-red-400'
                            }
                          >
                            {avgScore}
                          </span>
                          <span className="text-slate-400">
                            {' '}
                            / {learner.targetKompetensi}
                          </span>
                          <div className="text-[11px] text-slate-400">
                            {attemptCount} evaluasi
                          </div>
                        </div>
                      ) : (
                        <span className="text-slate-400">Belum ada ujian</span>
                      )}
                    </td>
                    <td className="px-4 py-3.5 text-right font-mono text-xs text-slate-600 tabular-nums dark:text-slate-400">
                      {attemptCount > 0 ? formatDuration(avgDuration) : '—'}
                    </td>
                    <td className="px-4 py-3.5">
                      {isAchieved ? (
                        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-700 dark:text-emerald-400">
                          <CheckCircle2 className="h-4 w-4 shrink-0" />
                          <span>Target Tercapai</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-red-700 dark:text-red-400">
                          <AlertTriangle className="h-4 w-4 shrink-0" />
                          <span>Perlu Pendampingan</span>
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-3.5 text-right">
                      <div className="inline-flex items-center justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => onInspectLearner(learner.id)}
                          className="rounded-md border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700 whitespace-nowrap"
                        >
                          <FileSpreadsheet className="mr-1 inline h-3.5 w-3.5" />
                          Detail
                        </button>
                        <button
                          type="button"
                          onClick={() => onOpenCard(learner.id)}
                          className="rounded-md border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700 whitespace-nowrap"
                        >
                          <QrCode className="mr-1 inline h-3.5 w-3.5" />
                          Kartu QR
                        </button>
                        {!isAchieved && (
                          <button
                            type="button"
                            onClick={onOpenNotifications}
                            className="rounded-md bg-amber-50 px-2.5 py-1.5 text-xs font-medium text-amber-800 hover:bg-amber-100 dark:bg-amber-950/60 dark:text-amber-300 dark:hover:bg-amber-900/60 whitespace-nowrap"
                          >
                            <Send className="mr-1 inline h-3.5 w-3.5" />
                            Tutor
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
