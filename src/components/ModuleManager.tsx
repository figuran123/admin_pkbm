import React, { useMemo, useState } from 'react';
import {
  BookOpen,
  CheckCircle2,
  ExternalLink,
  Layers,
  Plus,
  Trash2,
  UploadCloud,
} from 'lucide-react';
import {
  getKelasOptionsForProgram,
  jenjangLabelToProgram,
  programToJenjangLabel,
} from '../data/seedData';
import {
  AttendanceRecord,
  Institution,
  JenjangLabel,
  Learner,
  LearningModule,
  ProgramType,
  Quiz,
  QuizAttempt,
  SubjectMaster,
} from '../types';

interface ModuleManagerProps {
  institution: Institution;
  subjects: SubjectMaster[];
  modules: LearningModule[];
  learners: Learner[];
  attendance: AttendanceRecord[];
  quizzes: Quiz[];
  attempts: QuizAttempt[];
  isWorkspaceConnected: boolean;
  onAddSubject: (subj: SubjectMaster) => void;
  onDeleteSubject: (id: string) => void;
  onAddModuleWithFile: (
    mod: LearningModule,
    file: File | null
  ) => Promise<void>;
  onDeleteModule: (id: string) => void;
  onStartModuleQuiz: (quizId: string) => void;
}

const JENJANG_OPTIONS: JenjangLabel[] = [
  'Paket A (SD)',
  'Paket B (SMP)',
  'Paket C (SMA)',
  'Kursus Vokasi',
];

export const ModuleManager: React.FC<ModuleManagerProps> = ({
  institution,
  subjects,
  modules,
  learners,
  attendance,
  quizzes,
  attempts,
  isWorkspaceConnected,
  onAddSubject,
  onDeleteSubject,
  onAddModuleWithFile,
  onDeleteModule,
  onStartModuleQuiz,
}) => {
  const [programFilter, setProgramFilter] = useState<string>('Semua');

  // Master Mapel Form
  const [mapelJenjang, setMapelJenjang] =
    useState<JenjangLabel>('Paket C (SMA)');
  const [mapelKelas, setMapelKelas] = useState('Kelas 12');
  const [mapelKkm, setMapelKkm] = useState(75);
  const [namaMapel, setNamaMapel] = useState('');
  const [tutorMapel, setTutorMapel] = useState('');

  // Upload & Publikasi Materi Form
  const [modKode, setModKode] = useState('');
  const [modJudul, setModJudul] = useState('');
  const [modProgram, setModProgram] = useState<ProgramType>('Paket C');
  const [modKelas, setModKelas] = useState('Kelas 12');
  const [modMapel, setModMapel] = useState('');
  const [modSkk, setModSkk] = useState(3);
  const [modTarget, setModTarget] = useState(75);
  const [modDeskripsi, setModDeskripsi] = useState('');
  const [modDriveUrl, setModDriveUrl] = useState('');
  const [modFile, setModFile] = useState<File | null>(null);
  const [uploadingMod, setUploadingMod] = useState(false);

  const filteredModules = useMemo(
    () =>
      modules.filter(
        (m) => programFilter === 'Semua' || m.program === programFilter
      ),
    [modules, programFilter]
  );

  // SKK Progress calculation per learner across Tatap Muka, Tutorial, Mandiri
  const learnerSkkRows = useMemo(() => {
    const weights = institution.skkWeights;
    return learners.map((learner) => {
      const lAtt = attendance.filter((a) => a.learnerId === learner.id);
      const lAt = attempts.filter((a) => a.learnerId === learner.id);

      const calcMode = (mode: AttendanceRecord['modePembelajaran']) => {
        const mAtt = lAtt.filter((a) => a.modePembelajaran === mode);
        const mPres = mAtt.filter((a) => a.status === 'Hadir').length;
        const attPct = mAtt.length > 0 ? (mPres / mAtt.length) * 100 : 100;
        const mQuiz = lAt.filter((a) => a.modePembelajaran === mode);
        const quizPct =
          mQuiz.length > 0
            ? mQuiz.reduce((s, q) => s + q.skor, 0) / mQuiz.length
            : lAt.length > 0
            ? lAt.reduce((s, q) => s + q.skor, 0) / lAt.length
            : 75;
        return Math.round(attPct * 0.35 + quizPct * 0.65);
      };

      const tm = calcMode('Tatap Muka');
      const tut = calcMode('Tutorial');
      const man = calcMode('Mandiri');
      const totalSkkScore = Math.round(
        (tm * weights.tatapMuka +
          tut * weights.tutorial +
          man * weights.mandiri) /
          100
      );

      const programModules = modules.filter(
        (m) => m.program === learner.program
      );
      const completedModules = programModules.filter((m) =>
        lAt.some((a) => a.moduleId === m.id && a.tuntas)
      ).length;

      return {
        learner,
        tm,
        tut,
        man,
        totalSkkScore,
        completedModules,
        totalModules: programModules.length,
      };
    });
  }, [learners, attendance, attempts, modules, institution.skkWeights]);

  const handleSubmitSubject = (e: React.FormEvent) => {
    e.preventDefault();
    if (!namaMapel.trim()) return;
    onAddSubject({
      id: `MPL-${Date.now().toString().slice(-5)}`,
      institutionId: institution.id,
      jenjang: mapelJenjang,
      kelas: mapelKelas,
      namaMapel: namaMapel.trim(),
      tutorNama: tutorMapel.trim() || 'Tutor Pengampu',
      kkm: mapelKkm,
    });
    setNamaMapel('');
    setTutorMapel('');
  };

  const handleSubmitModule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!modJudul.trim() || !modMapel.trim()) return;
    setUploadingMod(true);
    try {
      await onAddModuleWithFile(
        {
          id: `MOD-${Date.now().toString().slice(-5)}`,
          institutionId: institution.id,
          kode: modKode.trim() || `MOD-${modules.length + 1}`,
          judul: modJudul.trim(),
          program: modProgram,
          kelas: modKelas,
          mataPelajaran: modMapel.trim(),
          bobotSkk: modSkk,
          targetNilai: modTarget,
          deskripsi: modDeskripsi.trim(),
          materiNama: modFile ? modFile.name : modJudul.trim(),
          materiDriveUrl: modDriveUrl.trim() || undefined,
        },
        modFile
      );
      setModKode('');
      setModJudul('');
      setModMapel('');
      setModDeskripsi('');
      setModDriveUrl('');
      setModFile(null);
    } finally {
      setUploadingMod(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 border-b border-slate-200 pb-5 dark:border-slate-800 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
            Master Mata Pelajaran, Publikasi Materi Google Drive & Kurikulum SKK (TM{' '}
            {institution.skkWeights.tatapMuka}% · Tut{' '}
            {institution.skkWeights.tutorial}% · Mdr{' '}
            {institution.skkWeights.mandiri}%)
          </p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
            Mata Pelajaran, Materi & Modul SKK
          </h1>
        </div>
      </div>

      {/* 2-Column Top Grid: Master Mapel Left + Upload Materi & Modul Right */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Left: Master Mata Pelajaran */}
        <div className="space-y-4 rounded-xl border border-slate-200 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900 lg:col-span-6">
          <div className="flex items-center justify-between border-b border-slate-200 pb-3 dark:border-slate-800">
            <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
              Master Mata Pelajaran (Mapel)
            </h2>
            <span className="font-mono text-xs text-slate-500 dark:text-slate-400">
              {subjects.length} mapel
            </span>
          </div>

          <form onSubmit={handleSubmitSubject} className="space-y-3 text-xs">
            <div className="grid grid-cols-3 gap-2.5">
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300">
                  Jenjang
                </label>
                <select
                  value={mapelJenjang}
                  onChange={(e) => {
                    const nextJ = e.target.value as JenjangLabel;
                    setMapelJenjang(nextJ);
                    const opts = getKelasOptionsForProgram(
                      jenjangLabelToProgram(nextJ)
                    );
                    if (opts.length > 0) setMapelKelas(opts[opts.length - 1]);
                  }}
                  className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-2 py-2 dark:border-slate-700 dark:bg-slate-950"
                >
                  {JENJANG_OPTIONS.map((j) => (
                    <option key={j} value={j}>
                      {j}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300">
                  Kelas
                </label>
                <select
                  value={mapelKelas}
                  onChange={(e) => setMapelKelas(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-2 py-2 dark:border-slate-700 dark:bg-slate-950"
                >
                  {getKelasOptionsForProgram(
                    jenjangLabelToProgram(mapelJenjang)
                  ).map((k) => (
                    <option key={k} value={k}>
                      {k}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300">
                  KKM
                </label>
                <input
                  type="number"
                  min={50}
                  max={100}
                  value={mapelKkm}
                  onChange={(e) => setMapelKkm(Number(e.target.value))}
                  className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-2.5 py-2 font-mono dark:border-slate-700 dark:bg-slate-950"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300">
                  Nama Mata Pelajaran *
                </label>
                <input
                  type="text"
                  required
                  value={namaMapel}
                  onChange={(e) => setNamaMapel(e.target.value)}
                  placeholder="Mis. Matematika Terapan"
                  className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-950"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300">
                  Tutor Pengampu
                </label>
                <input
                  type="text"
                  value={tutorMapel}
                  onChange={(e) => setTutorMapel(e.target.value)}
                  placeholder="Nama Tutor"
                  className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-950"
                />
              </div>
            </div>

            <button
              type="submit"
              className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-4 py-2 font-bold text-white hover:bg-slate-800 dark:bg-blue-700 dark:hover:bg-blue-800"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Simpan Mata Pelajaran</span>
            </button>
          </form>

          <div className="overflow-x-auto border-t border-slate-200 pt-3 dark:border-slate-800">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/70 font-semibold text-slate-600 dark:border-slate-800 dark:bg-slate-800/50 dark:text-slate-300">
                  <th className="px-3 py-2">Mapel</th>
                  <th className="px-3 py-2">Jenjang & Kelas</th>
                  <th className="px-3 py-2 text-right">KKM</th>
                  <th className="px-2 py-2 text-right">Hapus</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                {subjects.map((s) => (
                  <tr key={s.id}>
                    <td className="px-3 py-2">
                      <p className="font-semibold text-slate-900 dark:text-slate-100">
                        {s.namaMapel}
                      </p>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">
                        {s.tutorNama}
                      </p>
                    </td>
                    <td className="px-3 py-2 text-slate-600 dark:text-slate-300">
                      {s.jenjang} · {s.kelas}
                    </td>
                    <td className="px-3 py-2 text-right font-mono font-bold text-blue-700 dark:text-blue-400">
                      {s.kkm}
                    </td>
                    <td className="px-2 py-2 text-right">
                      <button
                        type="button"
                        onClick={() => onDeleteSubject(s.id)}
                        className="rounded p-1 text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/40"
                        title="Hapus mapel"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right: Upload & Publikasi Materi Belajar ke Drive */}
        <form
          onSubmit={handleSubmitModule}
          className="space-y-3 rounded-xl border border-slate-200 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900 lg:col-span-6 text-xs"
        >
          <div className="flex items-center justify-between border-b border-slate-200 pb-3 dark:border-slate-800">
            <h2 className="flex items-center gap-2 text-base font-bold text-slate-900 dark:text-slate-100">
              <UploadCloud className="h-4 w-4 text-blue-700 dark:text-blue-400" />
              <span>Upload & Publikasi Materi Belajar / Modul</span>
            </h2>
          </div>

          <div className="grid grid-cols-3 gap-2.5">
            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300">
                Jenjang
              </label>
              <select
                value={modProgram}
                onChange={(e) => {
                  const p = e.target.value as ProgramType;
                  setModProgram(p);
                  const opts = getKelasOptionsForProgram(p);
                  if (opts.length > 0) setModKelas(opts[opts.length - 1]);
                }}
                className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-2 py-2 dark:border-slate-700 dark:bg-slate-950"
              >
                <option value="Paket A">Paket A (SD)</option>
                <option value="Paket B">Paket B (SMP)</option>
                <option value="Paket C">Paket C (SMA)</option>
                <option value="Kursus Vokasi">Vokasi</option>
              </select>
            </div>
            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300">
                Kelas
              </label>
              <select
                value={modKelas}
                onChange={(e) => setModKelas(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-2 py-2 dark:border-slate-700 dark:bg-slate-950"
              >
                {getKelasOptionsForProgram(modProgram).map((k) => (
                  <option key={k} value={k}>
                    {k}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300">
                Kode Modul
              </label>
              <input
                type="text"
                value={modKode}
                onChange={(e) => setModKode(e.target.value)}
                placeholder="PKC-EKO-01"
                className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-2.5 py-2 font-mono dark:border-slate-700 dark:bg-slate-950"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300">
                Mata Pelajaran *
              </label>
              <input
                type="text"
                required
                list="mapel-datalist"
                value={modMapel}
                onChange={(e) => setModMapel(e.target.value)}
                placeholder="Pilih atau ketik mapel"
                className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-950"
              />
              <datalist id="mapel-datalist">
                {subjects.map((s) => (
                  <option key={s.id} value={s.namaMapel} />
                ))}
              </datalist>
            </div>
            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300">
                Judul Materi / Modul *
              </label>
              <input
                type="text"
                required
                value={modJudul}
                onChange={(e) => setModJudul(e.target.value)}
                placeholder="Mis. Modul 1 Persamaan Linear"
                className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-950"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300">
                Bobot SKK
              </label>
              <input
                type="number"
                min={1}
                max={10}
                value={modSkk}
                onChange={(e) => setModSkk(Number(e.target.value))}
                className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 font-mono dark:border-slate-700 dark:bg-slate-950"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300">
                Target KKM
              </label>
              <input
                type="number"
                min={50}
                max={100}
                value={modTarget}
                onChange={(e) => setModTarget(Number(e.target.value))}
                className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 font-mono dark:border-slate-700 dark:bg-slate-950"
              />
            </div>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 dark:text-slate-300">
              Deskripsi Singkat
            </label>
            <textarea
              rows={2}
              value={modDeskripsi}
              onChange={(e) => setModDeskripsi(e.target.value)}
              placeholder="Ringkasan materi pembelajaran mandiri..."
              className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-950"
            />
          </div>

          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300">
                Unggah File Materi ke Drive
              </label>
              <input
                type="file"
                accept=".pdf,.doc,.docx,.ppt,.pptx,.jpg,.png"
                onChange={(e) => setModFile(e.target.files?.[0] || null)}
                className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-[11px] dark:border-slate-700 dark:bg-slate-950"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300">
                Atau Tautan URL Materi
              </label>
              <input
                type="url"
                value={modDriveUrl}
                onChange={(e) => setModDriveUrl(e.target.value)}
                placeholder="https://drive.google.com/..."
                className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-950"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={uploadingMod}
            className="w-full rounded-lg bg-blue-700 py-2.5 font-bold text-white hover:bg-blue-800 disabled:opacity-50"
          >
            {uploadingMod
              ? 'Mengunggah ke Google Drive...'
              : isWorkspaceConnected
              ? 'Publikasikan Modul & Simpan ke Drive'
              : 'Publikasikan Modul'}
          </button>
        </form>
      </div>

      {/* Program Filter & Modules Grid */}
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
            Katalog Modul & Bahan Ajar ({filteredModules.length})
          </h2>
          <div className="flex flex-wrap items-center gap-1 rounded-lg bg-slate-100 p-1 dark:bg-slate-800">
            {['Semua', 'Paket A', 'Paket B', 'Paket C', 'Kursus Vokasi'].map(
              (prog) => (
                <button
                  key={prog}
                  type="button"
                  onClick={() => setProgramFilter(prog)}
                  className={`rounded-md px-3 py-1 text-xs font-medium transition-colors whitespace-nowrap ${
                    programFilter === prog
                      ? 'bg-white text-slate-900 shadow-xs dark:bg-slate-900 dark:text-slate-100'
                      : 'text-slate-600 hover:text-slate-900 dark:text-slate-400'
                  }`}
                >
                  {prog}
                </button>
              )
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredModules.map((mod) => {
            const linkedQuizzes = quizzes.filter(
              (q) => q.moduleId === mod.id && !q.isRemedial
            );
            const moduleAttempts = attempts.filter(
              (a) => a.moduleId === mod.id
            );
            const tuntasCount = moduleAttempts.filter((a) => a.tuntas).length;

            return (
              <div
                key={mod.id}
                className="flex flex-col justify-between rounded-xl border border-slate-200 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900"
              >
                <div>
                  <div className="flex items-center justify-between font-mono text-xs text-slate-500 tabular-nums dark:text-slate-400">
                    <span>
                      {mod.kode} · {programToJenjangLabel(mod.program)}
                      {mod.kelas ? ` (${mod.kelas})` : ''}
                    </span>
                    <button
                      type="button"
                      onClick={() => onDeleteModule(mod.id)}
                      className="rounded p-1 text-slate-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/40"
                      title="Hapus modul"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  <h3 className="mt-1.5 text-sm font-bold text-slate-900 dark:text-slate-100">
                    {mod.judul}
                  </h3>
                  <p className="mt-1 text-xs font-medium text-blue-700 dark:text-blue-400">
                    {mod.mataPelajaran} · {mod.bobotSkk} SKK · KKM{' '}
                    {mod.targetNilai}
                  </p>
                  <p className="mt-2 text-xs leading-relaxed text-slate-500 dark:text-slate-400">
                    {mod.deskripsi || 'Bahan ajar kurikulum kesetaraan.'}
                  </p>
                </div>

                <div className="mt-4 space-y-2.5 border-t border-slate-200 pt-3 text-xs dark:border-slate-800">
                  <div className="flex items-center justify-between text-slate-600 dark:text-slate-400">
                    <span>Ketuntasan Modul:</span>
                    <span className="font-mono font-semibold text-slate-900 tabular-nums dark:text-slate-100">
                      {tuntasCount} / {moduleAttempts.length} selesai
                    </span>
                  </div>

                  {(mod.materiNama || mod.materiDriveUrl) && (
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-1.5 truncate text-slate-700 dark:text-slate-300">
                        <BookOpen className="h-3.5 w-3.5 shrink-0 text-blue-700 dark:text-blue-400" />
                        <span className="truncate">
                          {mod.materiNama || 'Materi Drive'}
                        </span>
                      </span>
                      {mod.materiDriveUrl && (
                        <a
                          href={mod.materiDriveUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="ml-2 inline-flex items-center gap-1 font-medium text-blue-700 hover:underline shrink-0 dark:text-blue-400"
                        >
                          <span>Drive</span>
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      )}
                    </div>
                  )}

                  {linkedQuizzes.length > 0 && (
                    <button
                      type="button"
                      onClick={() => onStartModuleQuiz(linkedQuizzes[0].id)}
                      className="w-full rounded-lg border border-slate-200 bg-slate-50 py-1.5 text-center font-medium text-slate-800 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
                    >
                      Buka Evaluasi Modul ({linkedQuizzes[0].soal.length} Soal)
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* SKK Breakdown Table */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-xs dark:border-slate-800 dark:bg-slate-900">
        <div className="border-b border-slate-200 px-6 py-4 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <Layers className="h-4 w-4 text-blue-700 dark:text-blue-400" />
            <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
              Rekapitulasi Nilai SKK per Jalur Pembelajaran & Progres Self-Paced
            </h2>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/70 text-xs font-semibold text-slate-600 dark:border-slate-800 dark:bg-slate-800/50 dark:text-slate-300">
                <th className="px-6 py-3">Warga Belajar</th>
                <th className="px-4 py-3">Program</th>
                <th className="px-4 py-3 text-right">
                  Tatap Muka ({institution.skkWeights.tatapMuka}%)
                </th>
                <th className="px-4 py-3 text-right">
                  Tutorial ({institution.skkWeights.tutorial}%)
                </th>
                <th className="px-4 py-3 text-right">
                  Mandiri ({institution.skkWeights.mandiri}%)
                </th>
                <th className="px-4 py-3 text-right">Nilai Akhir SKK</th>
                <th className="px-6 py-3 text-right">Modul Tuntas</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
              {learnerSkkRows.map(
                ({
                  learner,
                  tm,
                  tut,
                  man,
                  totalSkkScore,
                  completedModules,
                  totalModules,
                }) => (
                  <tr
                    key={learner.id}
                    className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40"
                  >
                    <td className="px-6 py-3">
                      <p className="font-medium text-slate-900 dark:text-slate-100">
                        {learner.nama}
                      </p>
                      <p className="font-mono text-xs text-slate-500 tabular-nums dark:text-slate-400">
                        {learner.id}
                      </p>
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-600 dark:text-slate-300">
                      {learner.program} · {learner.kelas || learner.rombel}
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-xs text-slate-700 tabular-nums dark:text-slate-300">
                      {tm}
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-xs text-slate-700 tabular-nums dark:text-slate-300">
                      {tut}
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-xs text-slate-700 tabular-nums dark:text-slate-300">
                      {man}
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-sm font-bold tabular-nums">
                      <span
                        className={
                          totalSkkScore >= learner.targetKompetensi
                            ? 'text-emerald-700 dark:text-emerald-400'
                            : 'text-red-700 dark:text-red-400'
                        }
                      >
                        {totalSkkScore}
                      </span>
                    </td>
                    <td className="px-6 py-3 text-right font-mono text-xs tabular-nums">
                      <span className="inline-flex items-center gap-1 text-slate-800 dark:text-slate-200">
                        <CheckCircle2 className="h-3.5 w-3.5 text-blue-700 dark:text-blue-400" />
                        {completedModules} / {totalModules} modul
                      </span>
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
