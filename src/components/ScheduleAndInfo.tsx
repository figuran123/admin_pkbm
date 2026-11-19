import React, { useMemo, useState } from 'react';
import {
  Bell,
  CalendarClock,
  Megaphone,
  Plus,
  Trash2,
} from 'lucide-react';
import {
  getKelasOptionsForProgram,
  jenjangLabelToProgram,
} from '../data/seedData';
import {
  Announcement,
  JenjangLabel,
  ScheduleItem,
  SubjectMaster,
  TutorNotification,
} from '../types';
import { TutorNotifications } from './TutorNotifications';

interface ScheduleAndInfoProps {
  institutionId: string;
  schedules: ScheduleItem[];
  announcements: Announcement[];
  subjects: SubjectMaster[];
  notifications: TutorNotification[];
  isWorkspaceConnected: boolean;
  onAddSchedule: (item: ScheduleItem) => void;
  onDeleteSchedule: (id: string) => void;
  onAddAnnouncement: (ann: Announcement) => void;
  onDeleteAnnouncement: (id: string) => void;
  onScanCompetencies: () => number;
  onRequestSendEmail: (notif: TutorNotification, overrideEmail?: string) => void;
  onSendWhatsApp: (notif: TutorNotification) => void;
  onGenerateRemedialForAlert: (notif: TutorNotification) => void;
  onMarkResolved: (notifId: string) => void;
  onConnectWorkspace: () => void;
}

const HARI_OPTIONS = [
  'Senin',
  'Selasa',
  'Rabu',
  'Kamis',
  'Jumat',
  'Sabtu',
  'Minggu',
];

const JENJANG_OPTIONS: JenjangLabel[] = [
  'Paket A (SD)',
  'Paket B (SMP)',
  'Paket C (SMA)',
  'Kursus Vokasi',
];

const METODE_OPTIONS: ScheduleItem['metode'][] = [
  'Tatap Muka',
  'Tutorial',
  'Belajar Mandiri',
  'Daring / Online',
];

export const ScheduleAndInfo: React.FC<ScheduleAndInfoProps> = ({
  institutionId,
  schedules,
  announcements,
  subjects,
  notifications,
  isWorkspaceConnected,
  onAddSchedule,
  onDeleteSchedule,
  onAddAnnouncement,
  onDeleteAnnouncement,
  onScanCompetencies,
  onRequestSendEmail,
  onSendWhatsApp,
  onGenerateRemedialForAlert,
  onMarkResolved,
  onConnectWorkspace,
}) => {
  const [subTab, setSubTab] = useState<'jadwal' | 'ews'>('jadwal');
  const [filterJenjang, setFilterJenjang] = useState<string>('Semua');

  // Schedule Form
  const [hari, setHari] = useState('Senin');
  const [jamMulai, setJamMulai] = useState('08:00');
  const [jamSelesai, setJamSelesai] = useState('10:00');
  const [jenjang, setJenjang] = useState<JenjangLabel>('Paket C (SMA)');
  const [kelas, setKelas] = useState('Kelas 12');
  const [metode, setMetode] = useState<ScheduleItem['metode']>('Tatap Muka');
  const [mapel, setMapel] = useState('');
  const [tutor, setTutor] = useState('');

  // Announcement Form
  const [annJudul, setAnnJudul] = useState('');
  const [annTarget, setAnnTarget] = useState('Semua Jenjang');
  const [annIsi, setAnnIsi] = useState('');

  const filteredSchedules = useMemo(
    () =>
      schedules.filter(
        (j) => filterJenjang === 'Semua' || j.jenjang === filterJenjang
      ),
    [schedules, filterJenjang]
  );

  const pendingEwsCount = useMemo(
    () =>
      notifications.filter((n) => n.statusKirim === 'Menunggu Tindakan').length,
    [notifications]
  );

  const handleScheduleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!mapel.trim()) return;
    onAddSchedule({
      id: `JDW-${Date.now().toString().slice(-5)}`,
      institutionId,
      hari,
      jamMulai,
      jamSelesai,
      jenjang,
      kelas,
      metode,
      mapel: mapel.trim(),
      tutor: tutor.trim() || 'Tutor Pengampu',
    });
    setMapel('');
    setTutor('');
  };

  const handleAnnouncementSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!annJudul.trim() || !annIsi.trim()) return;
    onAddAnnouncement({
      id: `INF-${Date.now().toString().slice(-5)}`,
      institutionId,
      judul: annJudul.trim(),
      targetJenjang: annTarget,
      isi: annIsi.trim(),
      tanggal: new Date().toISOString().slice(0, 10),
    });
    setAnnJudul('');
    setAnnIsi('');
  };

  return (
    <div className="space-y-6">
      {/* Header & Switcher */}
      <div className="flex flex-col gap-4 border-b border-slate-200 pb-5 dark:border-slate-800 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
            Agenda Pertemuan Tatap Muka/Tutorial/Mandiri, Pengumuman PKBM & Notifikasi EWS Tutor
          </p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
            Jadwal KBM, Informasi & Peringatan Tutor
          </h1>
        </div>

        <div className="inline-flex rounded-lg bg-slate-100 p-1 dark:bg-slate-800">
          <button
            type="button"
            onClick={() => setSubTab('jadwal')}
            className={`inline-flex items-center gap-1.5 rounded-md px-3.5 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap ${
              subTab === 'jadwal'
                ? 'bg-white text-slate-900 shadow-xs dark:bg-slate-900 dark:text-slate-100'
                : 'text-slate-600 hover:text-slate-900 dark:text-slate-400'
            }`}
          >
            <CalendarClock className="h-3.5 w-3.5" />
            <span>Jadwal & Info KBM</span>
          </button>
          <button
            type="button"
            onClick={() => setSubTab('ews')}
            className={`inline-flex items-center gap-1.5 rounded-md px-3.5 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap ${
              subTab === 'ews'
                ? 'bg-white text-slate-900 shadow-xs dark:bg-slate-900 dark:text-slate-100'
                : 'text-slate-600 hover:text-slate-900 dark:text-slate-400'
            }`}
          >
            <Bell className="h-3.5 w-3.5 text-amber-600" />
            <span>EWS & Notifikasi Tutor ({pendingEwsCount})</span>
          </button>
        </div>
      </div>

      {subTab === 'jadwal' ? (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          {/* Left: Jadwal KBM */}
          <div className="space-y-4 rounded-xl border border-slate-200 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900 lg:col-span-7">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 pb-3 dark:border-slate-800">
              <h2 className="flex items-center gap-2 text-base font-bold text-slate-900 dark:text-slate-100">
                <CalendarClock className="h-4 w-4 text-blue-700 dark:text-blue-400" />
                <span>Jadwal Kegiatan Belajar Mengajar (KBM)</span>
              </h2>
              <select
                value={filterJenjang}
                onChange={(e) => setFilterJenjang(e.target.value)}
                className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs dark:border-slate-700 dark:bg-slate-950"
              >
                <option value="Semua">Semua Jenjang</option>
                {JENJANG_OPTIONS.map((j) => (
                  <option key={j} value={j}>
                    {j}
                  </option>
                ))}
              </select>
            </div>

            <form
              onSubmit={handleScheduleSubmit}
              className="grid grid-cols-1 gap-2.5 rounded-lg border border-slate-200 bg-slate-50/70 p-3.5 text-xs dark:border-slate-800 dark:bg-slate-950 sm:grid-cols-4"
            >
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300">
                  Hari
                </label>
                <select
                  value={hari}
                  onChange={(e) => setHari(e.target.value)}
                  className="mt-1 w-full rounded border border-slate-200 bg-white px-2 py-1.5 dark:border-slate-700 dark:bg-slate-900"
                >
                  {HARI_OPTIONS.map((h) => (
                    <option key={h} value={h}>
                      {h}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300">
                  Jam Mulai
                </label>
                <input
                  type="time"
                  value={jamMulai}
                  onChange={(e) => setJamMulai(e.target.value)}
                  className="mt-1 w-full rounded border border-slate-200 bg-white px-2 py-1.5 font-mono dark:border-slate-700 dark:bg-slate-900"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300">
                  Jam Selesai
                </label>
                <input
                  type="time"
                  value={jamSelesai}
                  onChange={(e) => setJamSelesai(e.target.value)}
                  className="mt-1 w-full rounded border border-slate-200 bg-white px-2 py-1.5 font-mono dark:border-slate-700 dark:bg-slate-900"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300">
                  Metode KBM
                </label>
                <select
                  value={metode}
                  onChange={(e) =>
                    setMetode(e.target.value as ScheduleItem['metode'])
                  }
                  className="mt-1 w-full rounded border border-slate-200 bg-white px-2 py-1.5 dark:border-slate-700 dark:bg-slate-900"
                >
                  {METODE_OPTIONS.map((m) => (
                    <option key={m} value={m}>
                      {m}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300">
                  Jenjang
                </label>
                <select
                  value={jenjang}
                  onChange={(e) => {
                    const nextJ = e.target.value as JenjangLabel;
                    setJenjang(nextJ);
                    const opts = getKelasOptionsForProgram(
                      jenjangLabelToProgram(nextJ)
                    );
                    if (opts.length > 0) setKelas(opts[opts.length - 1]);
                  }}
                  className="mt-1 w-full rounded border border-slate-200 bg-white px-2 py-1.5 dark:border-slate-700 dark:bg-slate-900"
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
                  value={kelas}
                  onChange={(e) => setKelas(e.target.value)}
                  className="mt-1 w-full rounded border border-slate-200 bg-white px-2 py-1.5 dark:border-slate-700 dark:bg-slate-900"
                >
                  {getKelasOptionsForProgram(jenjangLabelToProgram(jenjang)).map(
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
                  Mata Pelajaran *
                </label>
                <input
                  type="text"
                  required
                  list="sched-mapel-list"
                  value={mapel}
                  onChange={(e) => setMapel(e.target.value)}
                  placeholder="Nama Mapel"
                  className="mt-1 w-full rounded border border-slate-200 bg-white px-2.5 py-1.5 dark:border-slate-700 dark:bg-slate-900"
                />
                <datalist id="sched-mapel-list">
                  {subjects.map((s) => (
                    <option key={s.id} value={s.namaMapel} />
                  ))}
                </datalist>
              </div>
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300">
                  Tutor
                </label>
                <input
                  type="text"
                  value={tutor}
                  onChange={(e) => setTutor(e.target.value)}
                  placeholder="Nama Tutor"
                  className="mt-1 w-full rounded border border-slate-200 bg-white px-2.5 py-1.5 dark:border-slate-700 dark:bg-slate-900"
                />
              </div>

              <div className="sm:col-span-4 flex justify-end pt-1">
                <button
                  type="submit"
                  className="inline-flex items-center gap-1.5 rounded-lg bg-blue-700 px-3.5 py-1.5 font-bold text-white hover:bg-blue-800"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>Tambah Jadwal KBM</span>
                </button>
              </div>
            </form>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/70 font-semibold text-slate-600 dark:border-slate-800 dark:bg-slate-800/50 dark:text-slate-300">
                    <th className="px-3 py-2.5">Hari & Jam</th>
                    <th className="px-3 py-2.5">Jenjang / Kelas</th>
                    <th className="px-3 py-2.5">Mapel & Tutor</th>
                    <th className="px-3 py-2.5">Metode</th>
                    <th className="px-2 py-2.5 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                  {filteredSchedules.length === 0 ? (
                    <tr>
                      <td
                        colSpan={5}
                        className="px-3 py-8 text-center text-slate-500"
                      >
                        Belum ada jadwal KBM untuk filter ini.
                      </td>
                    </tr>
                  ) : (
                    filteredSchedules.map((j) => (
                      <tr key={j.id}>
                        <td className="px-3 py-2.5 font-mono tabular-nums">
                          <div className="font-semibold text-slate-900 dark:text-slate-100">
                            {j.hari}
                          </div>
                          <div className="text-[11px] text-slate-500">
                            {j.jamMulai} – {j.jamSelesai}
                          </div>
                        </td>
                        <td className="px-3 py-2.5">
                          <div className="font-medium text-slate-800 dark:text-slate-200">
                            {j.jenjang}
                          </div>
                          <div className="text-[11px] text-slate-500">
                            {j.kelas}
                          </div>
                        </td>
                        <td className="px-3 py-2.5">
                          <div className="font-semibold text-slate-900 dark:text-slate-100">
                            {j.mapel}
                          </div>
                          <div className="text-[11px] text-slate-500">
                            {j.tutor}
                          </div>
                        </td>
                        <td className="px-3 py-2.5 font-medium text-blue-700 dark:text-blue-400">
                          {j.metode}
                        </td>
                        <td className="px-2 py-2.5 text-right">
                          <button
                            type="button"
                            onClick={() => onDeleteSchedule(j.id)}
                            className="rounded p-1 text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/40"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Right: Pengumuman & Agenda */}
          <div className="space-y-4 rounded-xl border border-slate-200 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900 lg:col-span-5">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3 dark:border-slate-800">
              <h2 className="flex items-center gap-2 text-base font-bold text-slate-900 dark:text-slate-100">
                <Megaphone className="h-4 w-4 text-amber-600" />
                <span>Pengumuman & Agenda PKBM</span>
              </h2>
            </div>

            <form
              onSubmit={handleAnnouncementSubmit}
              className="space-y-2.5 rounded-lg border border-slate-200 bg-slate-50/70 p-3.5 text-xs dark:border-slate-800 dark:bg-slate-950"
            >
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300">
                  Judul Pengumuman *
                </label>
                <input
                  type="text"
                  required
                  value={annJudul}
                  onChange={(e) => setAnnJudul(e.target.value)}
                  placeholder="Mis. Pengambilan Kartu Ujian Paket C"
                  className="mt-1 w-full rounded border border-slate-200 bg-white px-2.5 py-1.5 dark:border-slate-700 dark:bg-slate-900"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300">
                  Sasaran Jenjang
                </label>
                <select
                  value={annTarget}
                  onChange={(e) => setAnnTarget(e.target.value)}
                  className="mt-1 w-full rounded border border-slate-200 bg-white px-2.5 py-1.5 dark:border-slate-700 dark:bg-slate-900"
                >
                  <option value="Semua Jenjang">Semua Jenjang</option>
                  {JENJANG_OPTIONS.map((j) => (
                    <option key={j} value={j}>
                      {j}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300">
                  Isi Informasi *
                </label>
                <textarea
                  rows={2}
                  required
                  value={annIsi}
                  onChange={(e) => setAnnIsi(e.target.value)}
                  placeholder="Tuliskan detail jadwal atau pengumuman resmi..."
                  className="mt-1 w-full rounded border border-slate-200 bg-white px-2.5 py-1.5 dark:border-slate-700 dark:bg-slate-900"
                />
              </div>
              <button
                type="submit"
                className="w-full rounded-lg bg-slate-900 py-2 font-bold text-white hover:bg-slate-800 dark:bg-blue-700 dark:hover:bg-blue-800"
              >
                Terbitkan Pengumuman
              </button>
            </form>

            <div className="space-y-3">
              {announcements.map((ann) => (
                <div
                  key={ann.id}
                  className="rounded-lg border border-slate-200 bg-white p-3.5 text-xs dark:border-slate-800 dark:bg-slate-950"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-mono text-[11px] font-semibold text-blue-700 dark:text-blue-400">
                        {ann.tanggal} · {ann.targetJenjang}
                      </p>
                      <h3 className="mt-0.5 text-sm font-bold text-slate-900 dark:text-slate-100">
                        {ann.judul}
                      </h3>
                    </div>
                    <button
                      type="button"
                      onClick={() => onDeleteAnnouncement(ann.id)}
                      className="rounded p-1 text-slate-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/40"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  <p className="mt-1.5 leading-relaxed text-slate-600 dark:text-slate-300">
                    {ann.isi}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <TutorNotifications
          notifications={notifications}
          isWorkspaceConnected={isWorkspaceConnected}
          onScanCompetencies={onScanCompetencies}
          onRequestSendEmail={onRequestSendEmail}
          onSendWhatsApp={onSendWhatsApp}
          onGenerateRemedialForAlert={onGenerateRemedialForAlert}
          onMarkResolved={onMarkResolved}
          onConnectWorkspace={onConnectWorkspace}
        />
      )}
    </div>
  );
};
