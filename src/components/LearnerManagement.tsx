import React, { useMemo, useState } from 'react';
import {
  Download,
  Edit3,
  ExternalLink,
  FolderPlus,
  Plus,
  QrCode,
  Search,
  Trash2,
  UserPlus,
  X,
} from 'lucide-react';
import {
  getKelasOptionsForProgram,
  programToJenjangLabel,
} from '../data/seedData';
import {
  AttendanceRecord,
  DocumentCategory,
  Learner,
  LearnerDocument,
  LearnerStatus,
  ProgramType,
  QuizAttempt,
} from '../types';

interface StagedIdentityDoc {
  id: string;
  kategori: DocumentCategory;
  namaDokumen: string;
  file: File | null;
}

interface LearnerManagementProps {
  institutionId: string;
  learners: Learner[];
  documents: LearnerDocument[];
  attendance: AttendanceRecord[];
  attempts: QuizAttempt[];
  isWorkspaceConnected: boolean;
  selectedLearnerId: string | null;
  onSelectLearnerId: (id: string | null) => void;
  onAddLearnerWithDocs: (
    learner: Learner,
    stagedDocs: StagedIdentityDoc[]
  ) => Promise<void>;
  onUpdateLearner: (learner: Learner) => void;
  onDeleteLearner: (id: string) => void;
  onOpenCard: (id: string) => void;
  onOpenQrProfile: (nisn: string) => void;
}

const IDENTITY_DOC_CATEGORIES: DocumentCategory[] = [
  'Kartu Keluarga',
  'KTP / Identitas',
  'Akta Kelahiran',
  'Ijazah Sebelumnya',
  'Dokumen Lainnya',
];

const ALL_KELAS_OPTIONS = Array.from(
  { length: 12 },
  (_, i) => `Kelas ${i + 1}`
);

export const LearnerManagement: React.FC<LearnerManagementProps> = ({
  institutionId,
  learners,
  documents,
  attendance,
  attempts,
  isWorkspaceConnected,
  selectedLearnerId,
  onSelectLearnerId,
  onAddLearnerWithDocs,
  onUpdateLearner,
  onDeleteLearner,
  onOpenCard,
  onOpenQrProfile,
}) => {
  // Filter bar state
  const [searchQuery, setSearchQuery] = useState('');
  const [filterTa, setFilterTa] = useState('Semua');
  const [filterProgram, setFilterProgram] = useState('Semua');
  const [filterKelas, setFilterKelas] = useState('Semua');

  // Registration Form State (Left column)
  const [nisn, setNisn] = useState('');
  const [nik, setNik] = useState('');
  const [nama, setNama] = useState('');
  const [jk, setJk] = useState<'L' | 'P'>('L');
  const [telepon, setTelepon] = useState('');
  const [tempatLahir, setTempatLahir] = useState('');
  const [tanggalLahir, setTanggalLahir] = useState('');
  const [program, setProgram] = useState<ProgramType>('Paket C');
  const [kelas, setKelas] = useState('Kelas 12');
  const [tahunAjaran, setTahunAjaran] = useState('2026/2027');
  const [rombel, setRombel] = useState('XII-IPS-1');
  const [alamat, setAlamat] = useState('');
  const [tutorNama, setTutorNama] = useState('Drs. Hendra Kusuma, M.Pd.');
  const [tutorEmail, setTutorEmail] = useState(
    'hendra.kusuma@lenterabelajar.sch.id'
  );
  const [targetKompetensi, setTargetKompetensi] = useState(75);
  const [stagedDocs, setStagedDocs] = useState<StagedIdentityDoc[]>([
    {
      id: 'DOC-STAGE-1',
      kategori: 'Kartu Keluarga',
      namaDokumen: '',
      file: null,
    },
  ]);
  const [submitting, setSubmitting] = useState(false);

  // Edit Modal State
  const [editingLearner, setEditingLearner] = useState<Learner | null>(null);

  const dynamicKelasOptions = useMemo(
    () => getKelasOptionsForProgram(program),
    [program]
  );

  const handleProgramChange = (nextProg: ProgramType) => {
    setProgram(nextProg);
    const opts = getKelasOptionsForProgram(nextProg);
    if (opts.length > 0) setKelas(opts[opts.length - 1]);
  };

  const filteredLearners = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return learners.filter((l) => {
      if (filterTa !== 'Semua' && (l.tahunAjaran || '2026/2027') !== filterTa)
        return false;
      if (filterProgram !== 'Semua' && l.program !== filterProgram) return false;
      if (filterKelas !== 'Semua' && (l.kelas || '') !== filterKelas)
        return false;
      if (!q) return true;
      return (
        l.nama.toLowerCase().includes(q) ||
        l.nisn.toLowerCase().includes(q) ||
        (l.nik || '').toLowerCase().includes(q) ||
        l.id.toLowerCase().includes(q)
      );
    });
  }, [learners, searchQuery, filterTa, filterProgram, filterKelas]);

  const inspectedLearner = useMemo(
    () => learners.find((l) => l.id === selectedLearnerId) || null,
    [learners, selectedLearnerId]
  );

  const inspectedDetail = useMemo(() => {
    if (!inspectedLearner) return null;
    const lDocs = documents.filter((d) => d.learnerId === inspectedLearner.id);
    const lAtt = attendance.filter((a) => a.learnerId === inspectedLearner.id);
    const hadir = lAtt.filter((a) => a.status === 'Hadir').length;
    const attRate =
      lAtt.length > 0 ? Math.round((hadir / lAtt.length) * 100) : 100;
    const lAt = attempts.filter((a) => a.learnerId === inspectedLearner.id);
    return { lDocs, lAtt, attRate, lAt };
  }, [inspectedLearner, documents, attendance, attempts]);

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nisn.trim() || !nama.trim()) return;
    setSubmitting(true);
    try {
      const newId = `WB-${new Date().getFullYear()}-${String(
        learners.length + 101
      )}`;
      const newLearner: Learner = {
        id: newId,
        institutionId,
        nisn: nisn.trim(),
        nik: nik.trim(),
        pin: String(Math.floor(1000 + Math.random() * 9000)),
        nama: nama.trim(),
        jk,
        tempatLahir: tempatLahir.trim(),
        tanggalLahir: tanggalLahir.trim(),
        program,
        kelas,
        tahunAjaran,
        rombel: rombel.trim() || kelas,
        tutorNama: tutorNama.trim() || 'Tutor Pembimbing',
        tutorEmail: tutorEmail.trim(),
        targetKompetensi,
        status: 'Aktif',
        telepon: telepon.trim() || '-',
        alamat: alamat.trim() || '-',
        tanggalBergabung: new Date().toISOString().slice(0, 10),
      };
      await onAddLearnerWithDocs(
        newLearner,
        stagedDocs.filter((d) => d.file !== null || d.namaDokumen.trim())
      );
      setNisn('');
      setNik('');
      setNama('');
      setTelepon('');
      setTempatLahir('');
      setTanggalLahir('');
      setAlamat('');
      setStagedDocs([
        {
          id: `DOC-STAGE-${Date.now()}`,
          kategori: 'Kartu Keluarga',
          namaDokumen: '',
          file: null,
        },
      ]);
    } finally {
      setSubmitting(false);
    }
  };

  const handleExportCsv = () => {
    const headers = [
      'ID',
      'NISN',
      'NIK',
      'Nama',
      'JK',
      'Tempat Lahir',
      'Tanggal Lahir',
      'Jenjang',
      'Kelas',
      'Tahun Ajaran',
      'Rombel',
      'No HP',
      'Status',
    ];
    const rows = filteredLearners.map((l) => [
      l.id,
      `'${l.nisn}`,
      l.nik ? `'${l.nik}` : '',
      `"${l.nama}"`,
      l.jk || 'L',
      `"${l.tempatLahir || ''}"`,
      l.tanggalLahir || '',
      programToJenjangLabel(l.program),
      l.kelas || '',
      l.tahunAjaran || '2026/2027',
      l.rombel,
      l.telepon,
      l.status,
    ]);
    const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Data_Warga_Belajar_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Header & Multi Filter Bar */}
      <div className="flex flex-col gap-4 border-b border-slate-200 pb-5 dark:border-slate-800 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
            Registrasi Biodata Dapodik Kesetaraan, Berkas Identitas Drive & Direktori
          </p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
            Manajemen Warga Belajar
          </h1>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <Search className="pointer-events-none absolute top-1/2 left-3 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari NISN / NIK / Nama..."
              className="rounded-lg border border-slate-200 bg-white py-1.5 pr-3 pl-8 text-xs text-slate-900 focus:border-blue-600 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
            />
          </div>
          <select
            value={filterTa}
            onChange={(e) => setFilterTa(e.target.value)}
            className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-800 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
          >
            <option value="Semua">Semua TA</option>
            <option value="2026/2027">2026/2027</option>
            <option value="2025/2026">2025/2026</option>
            <option value="2024/2025">2024/2025</option>
          </select>
          <select
            value={filterProgram}
            onChange={(e) => setFilterProgram(e.target.value)}
            className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-800 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
          >
            <option value="Semua">Semua Jenjang</option>
            <option value="Paket A">Paket A (SD)</option>
            <option value="Paket B">Paket B (SMP)</option>
            <option value="Paket C">Paket C (SMA)</option>
            <option value="Kursus Vokasi">Kursus Vokasi</option>
          </select>
          <select
            value={filterKelas}
            onChange={(e) => setFilterKelas(e.target.value)}
            className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-800 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
          >
            <option value="Semua">Semua Kelas</option>
            {ALL_KELAS_OPTIONS.map((k) => (
              <option key={k} value={k}>
                {k}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Inspected Learner Quick Detail Drawer (when clicked from Dashboard) */}
      {inspectedLearner && inspectedDetail && (
        <div className="rounded-xl border border-blue-200 bg-blue-50/50 p-5 dark:border-blue-900 dark:bg-blue-950/30">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="font-mono text-xs text-blue-700 dark:text-blue-400">
                {inspectedLearner.id} · NISN {inspectedLearner.nisn} · NIK{' '}
                {inspectedLearner.nik || '-'}
              </p>
              <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">
                {inspectedLearner.nama} ({inspectedLearner.program} ·{' '}
                {inspectedLearner.kelas || inspectedLearner.rombel})
              </h2>
              <p className="mt-0.5 text-xs text-slate-600 dark:text-slate-300">
                TTL: {inspectedLearner.tempatLahir || '-'},{' '}
                {inspectedLearner.tanggalLahir || '-'} · Tutor:{' '}
                {inspectedLearner.tutorNama} · Kehadiran {inspectedDetail.attRate}% ·{' '}
                {inspectedDetail.lAt.length} evaluasi ·{' '}
                {inspectedDetail.lDocs.length} dokumen Drive
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => onOpenQrProfile(inspectedLearner.nisn)}
                className="inline-flex items-center gap-1 rounded-lg bg-blue-700 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-800"
              >
                <ExternalLink className="h-3.5 w-3.5" />
                <span>Info QR (?nisn)</span>
              </button>
              <button
                type="button"
                onClick={() => onOpenCard(inspectedLearner.id)}
                className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
              >
                <QrCode className="h-3.5 w-3.5" />
                <span>Kartu KTWB</span>
              </button>
              <button
                type="button"
                onClick={() => onSelectLearnerId(null)}
                className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-200/60 dark:hover:bg-slate-800"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 2-Column Layout: Left Registrasi Form + Multi-file Identity Docs, Right Directory Table */}
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-12">
        {/* Left: Form Registrasi Warga Belajar + Multi-File Google Drive */}
        <form
          onSubmit={handleRegisterSubmit}
          className="space-y-4 rounded-xl border border-slate-200 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900 xl:col-span-5"
        >
          <div className="flex items-center gap-2 border-b border-slate-200 pb-3 dark:border-slate-800">
            <UserPlus className="h-4 w-4 text-blue-700 dark:text-blue-400" />
            <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
              Registrasi Warga Belajar Baru
            </h2>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                NISN (8–10 Digit) *
              </label>
              <input
                type="text"
                required
                value={nisn}
                onChange={(e) => setNisn(e.target.value)}
                placeholder="0098123456"
                className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 font-mono text-xs text-slate-900 focus:border-blue-600 focus:outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                NIK (16 Digit)
              </label>
              <input
                type="text"
                value={nik}
                onChange={(e) => setNik(e.target.value)}
                placeholder="357301..."
                className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 font-mono text-xs text-slate-900 focus:border-blue-600 focus:outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
              Nama Lengkap *
            </label>
            <input
              type="text"
              required
              value={nama}
              onChange={(e) => setNama(e.target.value)}
              placeholder="Sesuai Ijazah / Kartu Keluarga"
              className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 focus:border-blue-600 focus:outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                Jenis Kelamin
              </label>
              <select
                value={jk}
                onChange={(e) => setJk(e.target.value as 'L' | 'P')}
                className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
              >
                <option value="L">Laki-laki (L)</option>
                <option value="P">Perempuan (P)</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                No. HP / WhatsApp
              </label>
              <input
                type="text"
                value={telepon}
                onChange={(e) => setTelepon(e.target.value)}
                placeholder="0812..."
                className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 font-mono text-xs text-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                Tempat Lahir
              </label>
              <input
                type="text"
                value={tempatLahir}
                onChange={(e) => setTempatLahir(e.target.value)}
                placeholder="Kota/Kabupaten"
                className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                Tanggal Lahir
              </label>
              <input
                type="date"
                value={tanggalLahir}
                onChange={(e) => setTanggalLahir(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 font-mono text-xs text-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2.5">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                Jenjang
              </label>
              <select
                value={program}
                onChange={(e) =>
                  handleProgramChange(e.target.value as ProgramType)
                }
                className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-xs text-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
              >
                <option value="Paket A">Paket A (SD)</option>
                <option value="Paket B">Paket B (SMP)</option>
                <option value="Paket C">Paket C (SMA)</option>
                <option value="Kursus Vokasi">Vokasi</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                Kelas
              </label>
              <select
                value={kelas}
                onChange={(e) => setKelas(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-xs text-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
              >
                {dynamicKelasOptions.map((k) => (
                  <option key={k} value={k}>
                    {k}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                Tahun Ajaran
              </label>
              <select
                value={tahunAjaran}
                onChange={(e) => setTahunAjaran(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-xs text-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
              >
                <option value="2026/2027">2026/2027</option>
                <option value="2025/2026">2025/2026</option>
                <option value="2024/2025">2024/2025</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2.5">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                Rombel
              </label>
              <input
                type="text"
                value={rombel}
                onChange={(e) => setRombel(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-xs text-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                Tutor Wali
              </label>
              <input
                type="text"
                value={tutorNama}
                onChange={(e) => setTutorNama(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-xs text-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                Target KKM
              </label>
              <input
                type="number"
                min={50}
                max={100}
                value={targetKompetensi}
                onChange={(e) => setTargetKompetensi(Number(e.target.value))}
                className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-2.5 py-2 font-mono text-xs text-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
              Alamat Domisili
            </label>
            <input
              type="text"
              value={alamat}
              onChange={(e) => setAlamat(e.target.value)}
              placeholder="Alamat lengkap warga belajar"
              className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
            />
          </div>

          {/* Multi-File Identity Docs Section (Google Drive) */}
          <div className="space-y-2.5 rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-950">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-xs font-bold text-slate-800 dark:text-slate-200">
                <FolderPlus className="h-3.5 w-3.5 text-blue-700 dark:text-blue-400" />
                <span>Berkas Identitas (KK, KTP/KIA, Akta, Ijazah)</span>
              </span>
              <button
                type="button"
                onClick={() =>
                  setStagedDocs((prev) => [
                    ...prev,
                    {
                      id: `DOC-STAGE-${Date.now()}`,
                      kategori: 'KTP / Identitas',
                      namaDokumen: '',
                      file: null,
                    },
                  ])
                }
                className="inline-flex items-center gap-1 rounded border border-slate-300 bg-white px-2 py-1 text-[11px] font-semibold text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
              >
                <Plus className="h-3 w-3" />
                <span>Tambah File</span>
              </button>
            </div>

            {stagedDocs.map((row, idx) => (
              <div
                key={row.id}
                className="grid grid-cols-1 gap-2 rounded border border-slate-200 bg-white p-2 dark:border-slate-800 dark:bg-slate-900 sm:grid-cols-12"
              >
                <select
                  value={row.kategori}
                  onChange={(e) =>
                    setStagedDocs((prev) =>
                      prev.map((d, i) =>
                        i === idx
                          ? {
                              ...d,
                              kategori: e.target.value as DocumentCategory,
                            }
                          : d
                      )
                    )
                  }
                  className="rounded border border-slate-200 px-2 py-1 text-[11px] dark:border-slate-700 dark:bg-slate-950 sm:col-span-5"
                >
                  {IDENTITY_DOC_CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
                <input
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png"
                  onChange={(e) => {
                    const file = e.target.files?.[0] || null;
                    setStagedDocs((prev) =>
                      prev.map((d, i) =>
                        i === idx
                          ? {
                              ...d,
                              file,
                              namaDokumen: file ? file.name : d.namaDokumen,
                            }
                          : d
                      )
                    );
                  }}
                  className="text-[11px] text-slate-600 dark:text-slate-300 sm:col-span-6"
                />
                {stagedDocs.length > 1 && (
                  <button
                    type="button"
                    onClick={() =>
                      setStagedDocs((prev) => prev.filter((_, i) => i !== idx))
                    }
                    className="text-red-600 hover:text-red-700 sm:col-span-1 flex items-center justify-center"
                    title="Hapus baris berkas"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            ))}
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              {isWorkspaceConnected
                ? 'Google Drive terhubung: file lampiran akan otomatis diunggah ke folder Drive lembaga.'
                : 'Mode lokal: file dicatat pada portofolio dan siap disinkronkan setelah login Google.'}
            </p>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-lg bg-blue-700 py-2.5 text-xs font-bold text-white transition-colors hover:bg-blue-800 disabled:opacity-50"
          >
            {submitting
              ? 'Menyimpan Data & Mengunggah ke Drive...'
              : 'Daftarkan Warga Belajar & Simpan Berkas'}
          </button>
        </form>

        {/* Right: Directory Table */}
        <div className="rounded-xl border border-slate-200 bg-white shadow-xs dark:border-slate-800 dark:bg-slate-900 xl:col-span-7">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-5 py-4 dark:border-slate-800">
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
                Daftar Warga Belajar ({filteredLearners.length})
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Klik Info QR untuk halaman profil kartu, Edit, atau Cetak KTWB
              </p>
            </div>
            <button
              type="button"
              onClick={handleExportCsv}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
            >
              <Download className="h-3.5 w-3.5" />
              <span>Ekspor CSV</span>
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/70 font-semibold text-slate-600 dark:border-slate-800 dark:bg-slate-800/50 dark:text-slate-300">
                  <th className="px-4 py-3">NISN / NIK</th>
                  <th className="px-4 py-3">Nama & TTL</th>
                  <th className="px-4 py-3">Jenjang / Kelas</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                {filteredLearners.length === 0 ? (
                  <tr>
                    <td
                      colSpan={5}
                      className="px-4 py-10 text-center text-slate-500 dark:text-slate-400"
                    >
                      Tidak ada warga belajar sesuai filter pencarian.
                    </td>
                  </tr>
                ) : (
                  filteredLearners.map((l) => (
                    <tr
                      key={l.id}
                      className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40"
                    >
                      <td className="px-4 py-3 font-mono tabular-nums">
                        <div className="font-semibold text-slate-900 dark:text-slate-100">
                          {l.nisn}
                        </div>
                        <div className="text-[11px] text-slate-400">
                          NIK {l.nik || '—'}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-semibold text-slate-900 dark:text-slate-100">
                          {l.nama} ({l.jk || 'L'})
                        </div>
                        <div className="text-[11px] text-slate-500 dark:text-slate-400">
                          {l.tempatLahir || '-'}, {l.tanggalLahir || '-'}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`font-semibold ${
                            l.program === 'Paket A'
                              ? 'text-red-700 dark:text-red-400'
                              : l.program === 'Paket B'
                              ? 'text-blue-800 dark:text-blue-400'
                              : 'text-slate-700 dark:text-slate-200'
                          }`}
                        >
                          {l.program} · {l.kelas || l.rombel}
                        </span>
                        <div className="text-[11px] text-slate-500 dark:text-slate-400">
                          TA {l.tahunAjaran || '2026/2027'}
                        </div>
                      </td>
                      <td className="px-4 py-3 font-semibold">
                        <span
                          className={
                            l.status === 'Aktif'
                              ? 'text-emerald-700 dark:text-emerald-400'
                              : l.status === 'Lulus'
                              ? 'text-blue-700 dark:text-blue-400'
                              : 'text-amber-700 dark:text-amber-400'
                          }
                        >
                          {l.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="inline-flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => onOpenQrProfile(l.nisn)}
                            className="rounded border border-slate-200 bg-white px-2 py-1 text-[11px] font-medium text-blue-700 hover:bg-blue-50 dark:border-slate-700 dark:bg-slate-800 dark:text-blue-400"
                            title="Buka tampilan profil QR (?nisn=...)"
                          >
                            Info QR
                          </button>
                          <button
                            type="button"
                            onClick={() => onOpenCard(l.id)}
                            className="rounded border border-slate-200 bg-white px-2 py-1 text-[11px] font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                            title="Cetak Kartu KTWB QR"
                          >
                            KTWB
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditingLearner(l)}
                            className="rounded border border-slate-200 bg-white p-1 text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
                            title="Edit Warga Belajar"
                          >
                            <Edit3 className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => onDeleteLearner(l.id)}
                            className="rounded border border-slate-200 bg-white p-1 text-red-600 hover:bg-red-50 dark:border-slate-700 dark:bg-slate-800 dark:text-red-400"
                            title="Hapus"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Modal Edit Warga Belajar */}
      {editingLearner && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-[1px]"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-xl rounded-xl border border-slate-200 bg-white p-6 shadow-xl dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3 dark:border-slate-800">
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                Edit Data Warga Belajar — {editingLearner.nama}
              </h3>
              <button
                type="button"
                onClick={() => setEditingLearner(null)}
                className="rounded p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                onUpdateLearner(editingLearner);
                setEditingLearner(null);
              }}
              className="mt-4 space-y-3 text-xs"
            >
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300">
                    NISN
                  </label>
                  <input
                    type="text"
                    required
                    value={editingLearner.nisn}
                    onChange={(e) =>
                      setEditingLearner({
                        ...editingLearner,
                        nisn: e.target.value,
                      })
                    }
                    className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 font-mono dark:border-slate-700 dark:bg-slate-950"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300">
                    NIK
                  </label>
                  <input
                    type="text"
                    value={editingLearner.nik || ''}
                    onChange={(e) =>
                      setEditingLearner({
                        ...editingLearner,
                        nik: e.target.value,
                      })
                    }
                    className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 font-mono dark:border-slate-700 dark:bg-slate-950"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2">
                  <label className="block font-semibold text-slate-700 dark:text-slate-300">
                    Nama Lengkap
                  </label>
                  <input
                    type="text"
                    required
                    value={editingLearner.nama}
                    onChange={(e) =>
                      setEditingLearner({
                        ...editingLearner,
                        nama: e.target.value,
                      })
                    }
                    className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 dark:border-slate-700 dark:bg-slate-950"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300">
                    Status
                  </label>
                  <select
                    value={editingLearner.status}
                    onChange={(e) =>
                      setEditingLearner({
                        ...editingLearner,
                        status: e.target.value as LearnerStatus,
                      })
                    }
                    className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 dark:border-slate-700 dark:bg-slate-950"
                  >
                    <option value="Aktif">Aktif</option>
                    <option value="Cuti">Cuti</option>
                    <option value="Lulus">Lulus</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300">
                    Jenjang
                  </label>
                  <select
                    value={editingLearner.program}
                    onChange={(e) => {
                      const nextP = e.target.value as ProgramType;
                      const opts = getKelasOptionsForProgram(nextP);
                      setEditingLearner({
                        ...editingLearner,
                        program: nextP,
                        kelas: opts[opts.length - 1],
                      });
                    }}
                    className="mt-1 w-full rounded-lg border border-slate-200 px-2.5 py-2 dark:border-slate-700 dark:bg-slate-950"
                  >
                    <option value="Paket A">Paket A</option>
                    <option value="Paket B">Paket B</option>
                    <option value="Paket C">Paket C</option>
                    <option value="Kursus Vokasi">Kursus Vokasi</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300">
                    Kelas
                  </label>
                  <select
                    value={editingLearner.kelas || ''}
                    onChange={(e) =>
                      setEditingLearner({
                        ...editingLearner,
                        kelas: e.target.value,
                      })
                    }
                    className="mt-1 w-full rounded-lg border border-slate-200 px-2.5 py-2 dark:border-slate-700 dark:bg-slate-950"
                  >
                    {getKelasOptionsForProgram(editingLearner.program).map(
                      (k) => (
                        <option key={k} value={k}>
                          {k}
                        </option>
                      )
                    )}
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300">
                    Tahun Ajaran
                  </label>
                  <input
                    type="text"
                    value={editingLearner.tahunAjaran || '2026/2027'}
                    onChange={(e) =>
                      setEditingLearner({
                        ...editingLearner,
                        tahunAjaran: e.target.value,
                      })
                    }
                    className="mt-1 w-full rounded-lg border border-slate-200 px-2.5 py-2 font-mono dark:border-slate-700 dark:bg-slate-950"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300">
                    Tempat Lahir
                  </label>
                  <input
                    type="text"
                    value={editingLearner.tempatLahir || ''}
                    onChange={(e) =>
                      setEditingLearner({
                        ...editingLearner,
                        tempatLahir: e.target.value,
                      })
                    }
                    className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 dark:border-slate-700 dark:bg-slate-950"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300">
                    No. HP / WA
                  </label>
                  <input
                    type="text"
                    value={editingLearner.telepon}
                    onChange={(e) =>
                      setEditingLearner({
                        ...editingLearner,
                        telepon: e.target.value,
                      })
                    }
                    className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 font-mono dark:border-slate-700 dark:bg-slate-950"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 border-t border-slate-200 pt-4 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setEditingLearner(null)}
                  className="rounded-lg border border-slate-200 px-4 py-2 font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="rounded-lg bg-blue-700 px-4 py-2 font-bold text-white hover:bg-blue-800"
                >
                  Simpan Perubahan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
