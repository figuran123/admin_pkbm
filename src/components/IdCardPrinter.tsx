import React, { useMemo, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import {
  CheckCircle2,
  FileText,
  Printer,
  QrCode,
  ScanLine,
  Search,
  ShieldCheck,
  User,
} from 'lucide-react';
import {
  AttendanceRecord,
  Learner,
  LearnerDocument,
  QuizAttempt,
} from '../types';

interface IdCardPrinterProps {
  learners: Learner[];
  documents: LearnerDocument[];
  attendance: AttendanceRecord[];
  attempts: QuizAttempt[];
  initialLearnerId?: string | null;
  initialVerifyCode?: string | null;
  onOpenQrProfile?: (nisn: string) => void;
}

export const IdCardPrinter: React.FC<IdCardPrinterProps> = ({
  learners,
  documents,
  attendance,
  attempts,
  initialLearnerId,
  initialVerifyCode,
  onOpenQrProfile,
}) => {
  const [selectedIds, setSelectedIds] = useState<string[]>(() =>
    initialLearnerId
      ? [initialLearnerId]
      : learners[0]
      ? [learners[0].id]
      : []
  );
  const [verifyInput, setVerifyInput] = useState<string>(
    initialVerifyCode || ''
  );
  const [verifiedLearnerId, setVerifiedLearnerId] = useState<string | null>(
    initialVerifyCode || null
  );

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const selectAll = () => {
    setSelectedIds(learners.map((l) => l.id));
  };

  const cardsToPrint = useMemo(() => {
    const list = learners.filter((l) => selectedIds.includes(l.id));
    return list.length > 0 ? list : learners.slice(0, 1);
  }, [learners, selectedIds]);

  const handleVerifyLookup = (raw: string) => {
    const cleaned = raw.trim();
    if (!cleaned) {
      setVerifiedLearnerId(null);
      return;
    }

    // Support full URL (?verify=WB-2026-001 or ?nisn=...) or direct ID / NISN
    let extracted = cleaned;
    try {
      if (cleaned.startsWith('http')) {
        const url = new URL(cleaned);
        extracted =
          url.searchParams.get('nisn') ||
          url.searchParams.get('verify') ||
          cleaned;
      } else if (cleaned.includes('nisn=')) {
        const match = cleaned.match(/nisn=([^&\s]+)/);
        if (match) extracted = match[1];
      } else if (cleaned.includes('verify=')) {
        const match = cleaned.match(/verify=([^&\s]+)/);
        if (match) extracted = match[1];
      }
    } catch {
      // ignore URL parse error
    }

    const found = learners.find(
      (l) =>
        l.id.toLowerCase() === extracted.toLowerCase() ||
        l.nisn.toLowerCase() === extracted.toLowerCase() ||
        l.nama.toLowerCase().includes(extracted.toLowerCase())
    );
    setVerifiedLearnerId(found ? found.id : 'NOT_FOUND');
  };

  const verifiedLearner = useMemo(
    () => learners.find((l) => l.id === verifiedLearnerId) || null,
    [learners, verifiedLearnerId]
  );

  const verifiedHistory = useMemo(() => {
    if (!verifiedLearner) return null;
    const lAtt = attendance.filter((a) => a.learnerId === verifiedLearner.id);
    const hadir = lAtt.filter((a) => a.status === 'Hadir').length;
    const attRate = lAtt.length > 0 ? Math.round((hadir / lAtt.length) * 100) : 100;
    const lAttempts = attempts
      .filter((at) => at.learnerId === verifiedLearner.id)
      .sort((a, b) => b.tanggalPengerjaan.localeCompare(a.tanggalPengerjaan));
    const avgScore =
      lAttempts.length > 0
        ? Math.round(
            lAttempts.reduce((s, a) => s + a.skor, 0) / lAttempts.length
          )
        : null;
    const lDocs = documents.filter((d) => d.learnerId === verifiedLearner.id);
    return { attRate, hadir, totalAtt: lAtt.length, lAttempts, avgScore, lDocs };
  }, [verifiedLearner, attendance, attempts, documents]);

  const buildQrPayload = (learner: Learner) => {
    const origin =
      typeof window !== 'undefined' ? window.location.origin : 'https://lenterabelajar.sch.id';
    return `${origin}/?nisn=${encodeURIComponent(learner.nisn)}&verify=${encodeURIComponent(
      learner.id
    )}`;
  };

  return (
    <div className="space-y-8">
      {/* Header (hidden on print) */}
      <div className="no-print flex flex-col gap-4 border-b border-slate-200 pb-6 dark:border-slate-800 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
            Kartu Identitas Resmi & Verifikasi Riwayat Belajar Berbasis QR Code
          </p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
            Cetak Kartu Warga Belajar (KTWB QR)
          </h1>
        </div>
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={selectAll}
            className="rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 whitespace-nowrap dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
          >
            Pilih Semua ({learners.length})
          </button>
          <button
            type="button"
            onClick={() => window.print()}
            className="inline-flex items-center gap-2 rounded-lg bg-blue-700 px-4 py-2 text-sm font-medium text-white hover:bg-blue-800 whitespace-nowrap"
          >
            <Printer className="h-4 w-4" />
            <span>Cetak Kartu ({cardsToPrint.length})</span>
          </button>
        </div>
      </div>

      {/* Selector & Quick QR Verification Layout */}
      <div className="no-print grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Left: Learner Checkboxes */}
        <div className="rounded-xl border border-slate-200 bg-white p-5 lg:col-span-5 dark:border-slate-800 dark:bg-slate-900">
          <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
            Pilih Warga Belajar untuk Dicetak
          </h2>
          <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
            Centang satu atau beberapa peserta untuk dicetak sekaligus
          </p>
          <div className="mt-4 max-h-64 space-y-2 overflow-y-auto pr-1">
            {learners.map((learner) => {
              const checked = selectedIds.includes(learner.id);
              return (
                <label
                  key={learner.id}
                  className={`flex cursor-pointer items-center justify-between rounded-lg border px-3 py-2.5 text-xs transition-colors ${
                    checked
                      ? 'border-blue-600 bg-blue-50/50 dark:border-blue-500 dark:bg-blue-950/40'
                      : 'border-slate-200 hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-800/60'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleSelect(learner.id)}
                      className="h-4 w-4 rounded border-slate-300 text-blue-700 focus:ring-blue-600"
                    />
                    <div>
                      <p className="font-semibold text-slate-900 dark:text-slate-100">
                        {learner.nama}
                      </p>
                      <p className="font-mono text-[11px] text-slate-500 tabular-nums dark:text-slate-400">
                        {learner.id} · NISN {learner.nisn} · {learner.program}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      setVerifyInput(learner.nisn);
                      handleVerifyLookup(learner.nisn);
                    }}
                    className="rounded border border-slate-200 bg-white px-2 py-1 text-[11px] font-medium text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
                  >
                    Uji QR
                  </button>
                </label>
              );
            })}
          </div>
        </div>

        {/* Right: Quick QR Verification Panel */}
        <div className="rounded-xl border border-slate-200 bg-white p-5 lg:col-span-7 dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center gap-2">
            <ScanLine className="h-4 w-4 text-blue-700 dark:text-blue-400" />
            <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
              Verifikasi Cepat QR & Akses Data Riwayat Belajar
            </h2>
          </div>
          <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
            Masukkan ID Kartu, NISN, atau tempel tautan hasil pindai QR Code untuk memverifikasi keaktifan dan riwayat belajar.
          </p>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleVerifyLookup(verifyInput);
            }}
            className="mt-4 flex flex-col gap-2 sm:flex-row"
          >
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={verifyInput}
                onChange={(e) => setVerifyInput(e.target.value)}
                placeholder="Contoh: WB-2026-001 atau 0084512901"
                className="w-full rounded-lg border border-slate-200 bg-white py-2 pr-3 pl-9 font-mono text-sm focus:border-blue-600 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
              />
            </div>
            <button
              type="submit"
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 whitespace-nowrap dark:bg-blue-700 dark:hover:bg-blue-600"
            >
              <ShieldCheck className="h-4 w-4" />
              <span>Verifikasi</span>
            </button>
          </form>

          {verifiedLearnerId === 'NOT_FOUND' && (
            <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-xs text-red-700 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-300">
              Kode verifikasi tidak ditemukan dalam direktori warga belajar.
            </div>
          )}

          {verifiedLearner && verifiedHistory && (
            <div className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50/40 p-4 dark:border-emerald-900/60 dark:bg-emerald-950/30">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  {verifiedLearner.fotoUrl ? (
                    <img
                      src={verifiedLearner.fotoUrl}
                      alt={verifiedLearner.nama}
                      referrerPolicy="no-referrer"
                      className="h-12 w-12 rounded-lg border border-slate-200 object-cover dark:border-slate-700"
                    />
                  ) : (
                    <div className="flex h-12 w-12 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
                      <User className="h-5 w-5" />
                    </div>
                  )}
                  <div>
                    <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-700 dark:text-emerald-400">
                      <CheckCircle2 className="h-4 w-4" />
                      <span>Terverifikasi Aktif · {verifiedLearner.status}</span>
                    </div>
                    <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                      {verifiedLearner.nama}
                    </h3>
                    <p className="font-mono text-xs text-slate-600 tabular-nums dark:text-slate-400">
                      {verifiedLearner.id} · NISN {verifiedLearner.nisn} ·{' '}
                      {verifiedLearner.program} ({verifiedLearner.rombel})
                    </p>
                  </div>
                </div>

                <div className="flex flex-col items-end gap-1.5 font-mono text-xs tabular-nums">
                  <div className="text-right">
                    <p className="text-slate-500 dark:text-slate-400">Kehadiran / Rerata Skor</p>
                    <p className="mt-0.5 text-sm font-bold text-slate-900 dark:text-slate-100">
                      {verifiedHistory.attRate}% ·{' '}
                      {verifiedHistory.avgScore !== null
                        ? `${verifiedHistory.avgScore} poin`
                        : 'Belum ada nilai'}
                    </p>
                  </div>
                  {onOpenQrProfile && (
                    <button
                      type="button"
                      onClick={() => onOpenQrProfile(verifiedLearner.nisn)}
                      className="rounded-md bg-slate-900 px-2.5 py-1 font-sans text-[11px] font-semibold text-white hover:bg-slate-800 dark:bg-blue-700 dark:hover:bg-blue-600"
                    >
                      Buka Halaman Info QR (?nisn)
                    </button>
                  )}
                </div>
              </div>

              <div className="mt-3 grid grid-cols-1 gap-3 border-t border-emerald-200/70 pt-3 text-xs dark:border-emerald-900/50 sm:grid-cols-2">
                <div>
                  <p className="font-semibold text-slate-700 dark:text-slate-300">
                    Riwayat Evaluasi Terbaru ({verifiedHistory.lAttempts.length})
                  </p>
                  {verifiedHistory.lAttempts.length === 0 ? (
                    <p className="mt-1 text-slate-500 dark:text-slate-400">Belum ada ujian.</p>
                  ) : (
                    <ul className="mt-1 space-y-1">
                      {verifiedHistory.lAttempts.slice(0, 3).map((at) => (
                        <li
                          key={at.id}
                          className="flex justify-between font-mono text-[11px] text-slate-700 tabular-nums dark:text-slate-300"
                        >
                          <span className="truncate pr-2">{at.mataPelajaran}</span>
                          <span
                            className={
                              at.tuntas
                                ? 'font-semibold text-emerald-700 dark:text-emerald-400'
                                : 'font-semibold text-red-700 dark:text-red-400'
                            }
                          >
                            {at.skor}/{at.targetNilai}
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
                <div>
                  <p className="font-semibold text-slate-700 dark:text-slate-300">
                    Arsip Dokumen Terkait ({verifiedHistory.lDocs.length})
                  </p>
                  {verifiedHistory.lDocs.length === 0 ? (
                    <p className="mt-1 text-slate-500 dark:text-slate-400">Belum ada dokumen.</p>
                  ) : (
                    <ul className="mt-1 space-y-1">
                      {verifiedHistory.lDocs.slice(0, 3).map((d) => (
                        <li
                          key={d.id}
                          className="flex items-center gap-1.5 text-[11px] text-slate-700 dark:text-slate-300"
                        >
                          <FileText className="h-3 w-3 shrink-0 text-blue-700 dark:text-blue-400" />
                          <span className="truncate">{d.namaFile}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Printable Cards Preview Grid */}
      <div className="print-only-container space-y-6">
        <div className="no-print flex items-center justify-between">
          <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
            Pratinjau Kartu Siap Cetak
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Format kartu standar 85.6 × 54 mm (Sisi Depan & Belakang)
          </p>
        </div>

        <div className="space-y-6">
          {cardsToPrint.map((learner) => {
            const qrUrl = buildQrPayload(learner);
            return (
              <div
                key={learner.id}
                className="print-card-break grid grid-cols-1 gap-4 rounded-xl border border-slate-200 bg-white p-5 md:grid-cols-2"
              >
                {/* Front Side */}
                <div className="flex flex-col justify-between rounded-xl border border-slate-300 bg-white p-5 shadow-xs">
                  <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                    <div className="flex items-center gap-2.5">
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-700 text-xs font-bold text-white">
                        LB
                      </div>
                      <div>
                        <p className="text-xs font-bold tracking-tight text-slate-900">
                          PKBM LENTERA BELAJAR
                        </p>
                        <p className="text-[10px] text-slate-500">
                          Kartu Identitas Resmi Warga Belajar
                        </p>
                      </div>
                    </div>
                    <span className="font-mono text-[11px] font-semibold text-blue-700 tabular-nums">
                      {learner.program}
                    </span>
                  </div>

                  <div className="my-4 flex items-center gap-4">
                    {learner.fotoUrl ? (
                      <img
                        src={learner.fotoUrl}
                        alt={learner.nama}
                        referrerPolicy="no-referrer"
                        className="h-20 w-16 rounded-lg border border-slate-200 object-cover shrink-0"
                      />
                    ) : (
                      <div className="flex h-20 w-16 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-slate-100 text-sm font-bold text-slate-600">
                        {learner.nama
                          .split(' ')
                          .slice(0, 2)
                          .map((n) => n[0])
                          .join('')}
                      </div>
                    )}

                    <div className="min-w-0 flex-1 space-y-1">
                      <p className="truncate text-sm font-bold text-slate-900">
                        {learner.nama}
                      </p>
                      <p className="font-mono text-xs text-slate-600 tabular-nums">
                        ID: {learner.id}
                      </p>
                      <p className="font-mono text-xs text-slate-600 tabular-nums">
                        NISN: {learner.nisn}
                      </p>
                      <p className="text-xs text-slate-600">
                        Rombel: {learner.rombel}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between border-t border-slate-200 pt-2.5 text-[11px] text-slate-500">
                    <span>Tutor: {learner.tutorNama}</span>
                    <span className="font-semibold text-emerald-700">
                      Status: {learner.status}
                    </span>
                  </div>
                </div>

                {/* Back Side with QR Code */}
                <div className="flex items-center justify-between gap-4 rounded-xl border border-slate-300 bg-slate-50 p-5">
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-900">
                      <QrCode className="h-4 w-4 text-blue-700" />
                      <span>Verifikasi QR Riwayat Belajar</span>
                    </div>
                    <p className="text-[11px] leading-relaxed text-slate-600">
                      Pindai kode QR di samping untuk memverifikasi status keaktifan, kehadiran harian, capaian kompetensi, dan arsip dokumen di Google Drive.
                    </p>
                    <div className="pt-1 font-mono text-[10px] text-slate-500 tabular-nums">
                      <div>Kode: {learner.id} · PIN Portal: {learner.pin}</div>
                      <div>Terdaftar: {learner.tanggalBergabung}</div>
                      <div>Target KKM: {learner.targetKompetensi} poin</div>
                    </div>
                  </div>

                  <div className="flex shrink-0 flex-col items-center rounded-lg border border-slate-200 bg-white p-2.5">
                    <QRCodeSVG
                      value={qrUrl}
                      size={104}
                      level="M"
                      includeMargin={false}
                    />
                    <span className="mt-1.5 font-mono text-[10px] font-medium text-slate-700 tabular-nums">
                      {learner.id}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
