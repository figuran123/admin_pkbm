import React, { useMemo, useState } from 'react';
import {
  CloudUpload,
  Download,
  ExternalLink,
  FileBarChart2,
  FolderOpen,
  Printer,
  Trash2,
  Upload,
  X,
} from 'lucide-react';
import { programToJenjangLabel } from '../data/seedData';
import {
  AttendanceRecord,
  DocumentCategory,
  GoogleWorkspaceConfig,
  Learner,
  LearnerDocument,
  QuizAttempt,
} from '../types';
import { GoogleSignInButton } from './GoogleSignInButton';
import { ProgressReports } from './ProgressReports';

interface PortfolioAndDocumentsProps {
  learners: Learner[];
  documents: LearnerDocument[];
  attendance: AttendanceRecord[];
  attempts: QuizAttempt[];
  isWorkspaceConnected: boolean;
  workspaceConfig: GoogleWorkspaceConfig | null;
  onUploadDocument: (payload: {
    learner: Learner;
    kategori: DocumentCategory;
    catatan: string;
    file: File;
  }) => Promise<void>;
  onDeleteDocument: (doc: LearnerDocument) => void;
  onConnectWorkspace: () => void;
  onSaveReportToDrive: (fileName: string, csvContent: string) => void;
}

const DOC_CATEGORIES: DocumentCategory[] = [
  'Kartu Keluarga',
  'KTP / Identitas',
  'Akta Kelahiran',
  'Ijazah Sebelumnya',
  'Portofolio Tugas',
  'Bukti Keaktifan',
  'Materi Belajar',
  'Surat Keterangan',
  'Dokumen Lainnya',
];

export const PortfolioAndDocuments: React.FC<PortfolioAndDocumentsProps> = ({
  learners,
  documents,
  attendance,
  attempts,
  isWorkspaceConnected,
  workspaceConfig,
  onUploadDocument,
  onDeleteDocument,
  onConnectWorkspace,
  onSaveReportToDrive,
}) => {
  const [viewMode, setViewMode] = useState<'portofolio' | 'laporan'>(
    'portofolio'
  );
  const [taFilter, setTaFilter] = useState('Semua');
  const [jenjangFilter, setJenjangFilter] = useState('Semua');

  // Rincian Modal State
  const [selectedGroupKey, setSelectedGroupKey] = useState<string | null>(null);

  // Upload Form State
  const [selectedLearnerId, setSelectedLearnerId] = useState(
    learners[0]?.id || ''
  );
  const [kategori, setKategori] = useState<DocumentCategory>('Portofolio Tugas');
  const [catatan, setCatatan] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const portfolioGroups = useMemo(() => {
    const map = new Map<
      string,
      {
        key: string;
        tahunAjaran: string;
        jenjangLabel: string;
        kelas: string;
        learners: Learner[];
        docCount: number;
        attCount: number;
        attemptCount: number;
      }
    >();

    for (const l of learners) {
      const ta = l.tahunAjaran || '2026/2027';
      const jenjangLabel = programToJenjangLabel(l.program);
      const kelas = l.kelas || l.rombel || '-';

      if (taFilter !== 'Semua' && ta !== taFilter) continue;
      if (jenjangFilter !== 'Semua' && jenjangLabel !== jenjangFilter) continue;

      const key = `${ta}__${jenjangLabel}__${kelas}`;
      const curr = map.get(key) || {
        key,
        tahunAjaran: ta,
        jenjangLabel,
        kelas,
        learners: [],
        docCount: 0,
        attCount: 0,
        attemptCount: 0,
      };
      curr.learners.push(l);
      curr.docCount += documents.filter((d) => d.learnerId === l.id).length;
      curr.attCount += attendance.filter((a) => a.learnerId === l.id).length;
      curr.attemptCount += attempts.filter((a) => a.learnerId === l.id).length;
      map.set(key, curr);
    }

    return Array.from(map.values()).sort((a, b) =>
      a.jenjangLabel.localeCompare(b.jenjangLabel)
    );
  }, [learners, documents, attendance, attempts, taFilter, jenjangFilter]);

  const activeModalGroup = useMemo(
    () => portfolioGroups.find((g) => g.key === selectedGroupKey) || null,
    [portfolioGroups, selectedGroupKey]
  );

  const handleExportRecapCsv = () => {
    const headers = [
      'Tahun Ajaran',
      'Jenjang',
      'Kelas',
      'Jumlah WB',
      'Total Dokumen Drive',
      'Catatan Presensi',
      'Nilai Soal CBT',
    ];
    const rows = portfolioGroups.map((g) => [
      g.tahunAjaran,
      `"${g.jenjangLabel}"`,
      g.kelas,
      g.learners.length,
      g.docCount,
      g.attCount,
      g.attemptCount,
    ]);
    const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Rekap_Portofolio_PKBM_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleExportGroupModalCsv = () => {
    if (!activeModalGroup) return;
    const headers = [
      'NISN',
      'Nama',
      'Kelas',
      'Jumlah Dokumen',
      'Total Hadir',
      'Rerata Nilai CBT',
    ];
    const rows = activeModalGroup.learners.map((l) => {
      const dCount = documents.filter((d) => d.learnerId === l.id).length;
      const hCount = attendance.filter(
        (a) => a.learnerId === l.id && a.status === 'Hadir'
      ).length;
      const lAt = attempts.filter((a) => a.learnerId === l.id);
      const avg =
        lAt.length > 0
          ? Math.round(lAt.reduce((s, x) => s + x.skor, 0) / lAt.length)
          : 0;
      return [
        `'${l.nisn}`,
        `"${l.nama}"`,
        l.kelas || l.rombel,
        dCount,
        hCount,
        avg,
      ];
    });
    const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Rincian_Portofolio_${activeModalGroup.kelas.replace(/\s+/g, '_')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setUploadError(null);
    const learner = learners.find((l) => l.id === selectedLearnerId);
    if (!learner || !selectedFile) {
      setUploadError('Pilih warga belajar dan file dokumen terlebih dahulu.');
      return;
    }
    setUploading(true);
    try {
      await onUploadDocument({
        learner,
        kategori,
        catatan: catatan.trim(),
        file: selectedFile,
      });
      setSelectedFile(null);
      setCatatan('');
    } catch (err) {
      setUploadError(
        err instanceof Error ? err.message : 'Gagal mengunggah dokumen.'
      );
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header & Mode Switcher */}
      <div className="no-print flex flex-col gap-4 border-b border-slate-200 pb-5 dark:border-slate-800 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
            Rekapitulasi Portofolio Otomatis, Arsip Dokumen Google Drive & Laporan Kemajuan Pengajar
          </p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
            Portofolio & Dokumen Google Drive
          </h1>
        </div>

        <div className="inline-flex rounded-lg bg-slate-100 p-1 dark:bg-slate-800">
          <button
            type="button"
            onClick={() => setViewMode('portofolio')}
            className={`inline-flex items-center gap-1.5 rounded-md px-3.5 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap ${
              viewMode === 'portofolio'
                ? 'bg-white text-slate-900 shadow-xs dark:bg-slate-900 dark:text-slate-100'
                : 'text-slate-600 hover:text-slate-900 dark:text-slate-400'
            }`}
          >
            <FolderOpen className="h-3.5 w-3.5" />
            <span>Portofolio & Arsip Drive ({documents.length})</span>
          </button>
          <button
            type="button"
            onClick={() => setViewMode('laporan')}
            className={`inline-flex items-center gap-1.5 rounded-md px-3.5 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap ${
              viewMode === 'laporan'
                ? 'bg-white text-slate-900 shadow-xs dark:bg-slate-900 dark:text-slate-100'
                : 'text-slate-600 hover:text-slate-900 dark:text-slate-400'
            }`}
          >
            <FileBarChart2 className="h-3.5 w-3.5" />
            <span>Laporan Kemajuan Pengajar</span>
          </button>
        </div>
      </div>

      {viewMode === 'portofolio' ? (
        <div className="space-y-6">
          {/* Top Card: Rekapitulasi Portofolio Otomatis */}
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-4 dark:border-slate-800">
              <div>
                <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
                  Rekapitulasi Portofolio Otomatis (Klik Baris untuk Rincian Kelas)
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Gabungan dokumen Drive, catatan kehadiran QR, dan hasil ujian CBT per kelas
                </p>
              </div>
              <div className="no-print flex flex-wrap items-center gap-2">
                <select
                  value={taFilter}
                  onChange={(e) => setTaFilter(e.target.value)}
                  className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs dark:border-slate-700 dark:bg-slate-950"
                >
                  <option value="Semua">Semua TA</option>
                  <option value="2026/2027">2026/2027</option>
                  <option value="2025/2026">2025/2026</option>
                </select>
                <select
                  value={jenjangFilter}
                  onChange={(e) => setJenjangFilter(e.target.value)}
                  className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs dark:border-slate-700 dark:bg-slate-950"
                >
                  <option value="Semua">Semua Jenjang</option>
                  <option value="Paket A (SD)">Paket A (SD)</option>
                  <option value="Paket B (SMP)">Paket B (SMP)</option>
                  <option value="Paket C (SMA)">Paket C (SMA)</option>
                  <option value="Kursus Vokasi">Kursus Vokasi</option>
                </select>
                <button
                  type="button"
                  onClick={handleExportRecapCsv}
                  className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                >
                  <Download className="h-3.5 w-3.5" />
                  <span>Ekspor CSV</span>
                </button>
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="inline-flex items-center gap-1 rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-slate-800 dark:bg-blue-700"
                >
                  <Printer className="h-3.5 w-3.5" />
                  <span>Cetak PDF</span>
                </button>
              </div>
            </div>

            <div className="mt-4 overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/70 font-semibold text-slate-600 dark:border-slate-800 dark:bg-slate-800/50 dark:text-slate-300">
                    <th className="px-4 py-3">Tahun Ajaran</th>
                    <th className="px-4 py-3">Jenjang</th>
                    <th className="px-4 py-3">Kelas</th>
                    <th className="px-4 py-3 text-right">Warga Belajar</th>
                    <th className="px-4 py-3 text-right">Dokumen Drive</th>
                    <th className="px-4 py-3 text-right">Log Presensi</th>
                    <th className="px-4 py-3 text-right">Hasil CBT</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                  {portfolioGroups.map((g) => (
                    <tr
                      key={g.key}
                      onClick={() => setSelectedGroupKey(g.key)}
                      className="cursor-pointer transition-colors hover:bg-blue-50/50 dark:hover:bg-blue-950/30"
                    >
                      <td className="px-4 py-3 font-mono font-semibold text-slate-700 dark:text-slate-300">
                        {g.tahunAjaran}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`font-bold ${
                            g.jenjangLabel.includes('Paket A')
                              ? 'text-red-700 dark:text-red-400'
                              : g.jenjangLabel.includes('Paket B')
                              ? 'text-blue-800 dark:text-blue-400'
                              : 'text-slate-800 dark:text-slate-200'
                          }`}
                        >
                          {g.jenjangLabel}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-semibold text-slate-900 dark:text-slate-100">
                        {g.kelas}
                      </td>
                      <td className="px-4 py-3 text-right font-mono font-bold tabular-nums">
                        {g.learners.length} WB
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-blue-700 tabular-nums dark:text-blue-400">
                        {g.docCount} berkas
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-emerald-700 tabular-nums dark:text-emerald-400">
                        {g.attCount} catatan
                      </td>
                      <td className="px-4 py-3 text-right font-mono font-semibold text-slate-800 tabular-nums dark:text-slate-200">
                        {g.attemptCount} ujian
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Bottom 2-Col Grid: Upload Dokumen Susulan Left + Log Arsip Berkas Drive Right */}
          <div className="no-print grid grid-cols-1 gap-6 lg:grid-cols-12">
            <form
              onSubmit={handleUploadSubmit}
              className="space-y-4 rounded-xl border border-slate-200 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900 lg:col-span-5 text-xs"
            >
              <div className="flex items-center justify-between border-b border-slate-200 pb-3 dark:border-slate-800">
                <h2 className="flex items-center gap-2 text-base font-bold text-slate-900 dark:text-slate-100">
                  <CloudUpload className="h-4 w-4 text-blue-700 dark:text-blue-400" />
                  <span>Unggah Dokumen Susulan ke Drive</span>
                </h2>
              </div>

              {!isWorkspaceConnected && (
                <div className="space-y-2 rounded-lg border border-amber-200 bg-amber-50 p-3 dark:border-amber-800 dark:bg-amber-950/40">
                  <p className="text-amber-900 dark:text-amber-200">
                    Hubungkan akun Google Anda untuk mengunggah dokumen langsung ke folder Google Drive lembaga.
                  </p>
                  <GoogleSignInButton onClick={onConnectWorkspace} />
                </div>
              )}

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300">
                  Pilih Warga Belajar
                </label>
                <select
                  value={selectedLearnerId}
                  onChange={(e) => setSelectedLearnerId(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-950"
                >
                  {learners.map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.nama} ({l.nisn})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300">
                  Kategori Berkas
                </label>
                <select
                  value={kategori}
                  onChange={(e) =>
                    setKategori(e.target.value as DocumentCategory)
                  }
                  className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-950"
                >
                  {DOC_CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300">
                  Pilih File (PDF / JPG / PNG / DOCX)
                </label>
                <input
                  type="file"
                  onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                  className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-2.5 py-2 dark:border-slate-700 dark:bg-slate-950"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300">
                  Catatan / Keterangan
                </label>
                <input
                  type="text"
                  value={catatan}
                  onChange={(e) => setCatatan(e.target.value)}
                  placeholder="Mis. Legalisir ijazah SMP / tugas proyek..."
                  className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-950"
                />
              </div>

              {uploadError && (
                <p className="font-medium text-red-700 dark:text-red-400">
                  {uploadError}
                </p>
              )}

              <button
                type="submit"
                disabled={uploading || !selectedFile || !isWorkspaceConnected}
                className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-blue-700 py-2.5 font-bold text-white hover:bg-blue-800 disabled:opacity-50"
              >
                <Upload className="h-4 w-4" />
                <span>
                  {uploading
                    ? 'Mengunggah ke Google Drive...'
                    : 'Unggah ke Google Drive Lembaga'}
                </span>
              </button>
            </form>

            {/* Right: Log Arsip Berkas Terbaru */}
            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900 lg:col-span-7">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 pb-3 dark:border-slate-800">
                <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
                  Log Arsip Berkas Warga Belajar ({documents.length})
                </h2>
                {workspaceConfig?.driveFolderUrl && (
                  <a
                    href={workspaceConfig.driveFolderUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-xs font-semibold text-blue-700 hover:underline dark:text-blue-400"
                  >
                    <span>Buka Folder Drive</span>
                    <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                )}
              </div>

              <div className="mt-4 overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50/70 font-semibold text-slate-600 dark:border-slate-800 dark:bg-slate-800/50 dark:text-slate-300">
                      <th className="px-3 py-2.5">Nama File & Catatan</th>
                      <th className="px-3 py-2.5">Warga Belajar</th>
                      <th className="px-3 py-2.5">Kategori</th>
                      <th className="px-3 py-2.5">Status</th>
                      <th className="px-3 py-2.5 text-right">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                    {documents.map((doc) => (
                      <tr key={doc.id}>
                        <td className="px-3 py-2.5">
                          <p className="font-semibold text-slate-900 dark:text-slate-100">
                            {doc.namaFile}
                          </p>
                          <p className="font-mono text-[11px] text-slate-500">
                            {doc.ukuranLabel} · {doc.tanggalUnggah}
                          </p>
                        </td>
                        <td className="px-3 py-2.5 font-medium text-slate-800 dark:text-slate-200">
                          {doc.learnerNama}
                        </td>
                        <td className="px-3 py-2.5 text-slate-600 dark:text-slate-300">
                          {doc.kategori}
                        </td>
                        <td className="px-3 py-2.5">
                          <span
                            className={
                              doc.statusSinkron === 'Tersimpan di Drive'
                                ? 'font-semibold text-emerald-700 dark:text-emerald-400'
                                : 'font-medium text-amber-700 dark:text-amber-400'
                            }
                          >
                            {doc.statusSinkron}
                          </span>
                        </td>
                        <td className="px-3 py-2.5 text-right">
                          <div className="inline-flex items-center gap-1.5">
                            {doc.driveWebViewLink && (
                              <a
                                href={doc.driveWebViewLink}
                                target="_blank"
                                rel="noreferrer"
                                className="rounded border border-slate-200 px-2 py-1 text-[11px] font-medium text-blue-700 hover:bg-blue-50 dark:border-slate-700 dark:text-blue-400"
                              >
                                Drive
                              </a>
                            )}
                            <button
                              type="button"
                              onClick={() => onDeleteDocument(doc)}
                              className="rounded p-1 text-red-600 hover:bg-red-50 dark:text-red-400"
                              title="Hapus Dokumen"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <ProgressReports
          learners={learners}
          attendance={attendance}
          attempts={attempts}
          isWorkspaceConnected={isWorkspaceConnected}
          onSaveReportToDrive={onSaveReportToDrive}
        />
      )}

      {/* Modal Rincian Portofolio Kelas */}
      {activeModalGroup && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-[1px]"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-3xl rounded-xl border border-slate-200 bg-white p-6 shadow-xl dark:border-slate-800 dark:bg-slate-900">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 pb-3 dark:border-slate-800">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                  Rincian Portofolio {activeModalGroup.jenjangLabel} ·{' '}
                  {activeModalGroup.kelas}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Tahun Ajaran {activeModalGroup.tahunAjaran} ·{' '}
                  {activeModalGroup.learners.length} Warga Belajar
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleExportGroupModalCsv}
                  className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200"
                >
                  <Download className="h-3.5 w-3.5" />
                  <span>CSV</span>
                </button>
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="inline-flex items-center gap-1 rounded-lg bg-blue-700 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-800"
                >
                  <Printer className="h-3.5 w-3.5" />
                  <span>PDF</span>
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedGroupKey(null)}
                  className="rounded p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            <div className="mt-4 max-h-96 overflow-y-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/70 font-semibold text-slate-600 dark:border-slate-800 dark:bg-slate-800/50 dark:text-slate-300">
                    <th className="px-3 py-2">NISN & Nama</th>
                    <th className="px-3 py-2 text-right">Berkas Drive</th>
                    <th className="px-3 py-2 text-right">Kehadiran</th>
                    <th className="px-3 py-2 text-right">Rerata Nilai CBT</th>
                    <th className="px-3 py-2">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                  {activeModalGroup.learners.map((l) => {
                    const docs = documents.filter((d) => d.learnerId === l.id);
                    const att = attendance.filter((a) => a.learnerId === l.id);
                    const hadir = att.filter((a) => a.status === 'Hadir').length;
                    const attPct =
                      att.length > 0
                        ? Math.round((hadir / att.length) * 100)
                        : 100;
                    const lAt = attempts.filter((a) => a.learnerId === l.id);
                    const avg =
                      lAt.length > 0
                        ? Math.round(
                            lAt.reduce((s, x) => s + x.skor, 0) / lAt.length
                          )
                        : null;

                    return (
                      <tr key={l.id}>
                        <td className="px-3 py-2.5">
                          <div className="font-semibold text-slate-900 dark:text-slate-100">
                            {l.nama}
                          </div>
                          <div className="font-mono text-[11px] text-slate-500">
                            NISN {l.nisn}
                          </div>
                        </td>
                        <td className="px-3 py-2.5 text-right font-mono tabular-nums">
                          {docs.length} file
                        </td>
                        <td className="px-3 py-2.5 text-right font-mono tabular-nums">
                          {attPct}% ({hadir}/{att.length})
                        </td>
                        <td className="px-3 py-2.5 text-right font-mono font-bold tabular-nums">
                          {avg !== null ? `${avg} / ${l.targetKompetensi}` : '—'}
                        </td>
                        <td className="px-3 py-2.5 font-semibold text-emerald-700 dark:text-emerald-400">
                          {l.status}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
