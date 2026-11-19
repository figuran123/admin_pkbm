export type ProgramType = 'Paket A' | 'Paket B' | 'Paket C' | 'Kursus Vokasi';

export type JenjangLabel =
  | 'Paket A (SD)'
  | 'Paket B (SMP)'
  | 'Paket C (SMA)'
  | 'Kursus Vokasi';

export type LearnerStatus = 'Aktif' | 'Cuti' | 'Lulus';

export type AttendanceStatus = 'Hadir' | 'Izin' | 'Sakit' | 'Alfa';

export type LearningMode = 'Tatap Muka' | 'Tutorial' | 'Mandiri';

export type DocumentCategory =
  | 'KTP / Identitas'
  | 'Ijazah Sebelumnya'
  | 'Kartu Keluarga'
  | 'Akta Kelahiran'
  | 'Portofolio Tugas'
  | 'Bukti Keaktifan'
  | 'Materi Belajar'
  | 'Surat Keterangan'
  | 'Dokumen Lainnya';

export interface SkkWeights {
  tatapMuka: number;
  tutorial: number;
  mandiri: number;
}

export interface GoogleWorkspaceConfig {
  spreadsheetId: string;
  spreadsheetUrl: string;
  driveFolderId: string;
  driveFolderUrl: string;
  lastSyncedAt?: string;
}

export interface ChannelSettings {
  enableGmail: boolean;
  enableWhatsApp: boolean;
  enableInAppBanner: boolean;
  autoPublishRemedial: boolean;
  senderAlias: string;
}

export interface Institution {
  id: string;
  kode: string;
  nama: string;
  kota: string;
  kepalaLembaga: string;
  telepon: string;
  skkWeights: SkkWeights;
  workspaceConfig: GoogleWorkspaceConfig | null;
  channelSettings: ChannelSettings;
}

export interface Learner {
  id: string;
  institutionId: string;
  nisn: string;
  nik?: string;
  pin: string;
  nama: string;
  jk?: 'L' | 'P';
  tempatLahir?: string;
  tanggalLahir?: string;
  program: ProgramType;
  kelas?: string; // e.g. 'Kelas 1' .. 'Kelas 12'
  tahunAjaran?: string; // e.g. '2026/2027'
  rombel: string;
  tutorNama: string;
  tutorEmail: string;
  tutorTelepon?: string;
  targetKompetensi: number;
  status: LearnerStatus;
  telepon: string;
  alamat: string;
  tanggalBergabung: string;
  fotoUrl?: string;
}

export interface LearnerDocument {
  id: string;
  institutionId: string;
  learnerId: string;
  learnerNama: string;
  nisn?: string;
  moduleId?: string;
  kategori: DocumentCategory;
  namaFile: string;
  mimeType: string;
  ukuranLabel: string;
  tanggalUnggah: string;
  driveFileId?: string;
  driveWebViewLink?: string;
  statusSinkron: 'Tersimpan di Drive' | 'Siap Diunggah ke Drive';
  catatan?: string;
}

export interface AttendanceRecord {
  id: string;
  institutionId: string;
  tanggal: string; // YYYY-MM-DD
  learnerId: string;
  status: AttendanceStatus;
  modePembelajaran: LearningMode;
  waktuCatat: string;
  catatan?: string;
  pendingSync?: boolean;
  sumber?: 'Manual' | 'QR Live' | 'QR Foto/PDF' | 'QR Offline' | 'Pengajuan Mandiri';
}

export interface SubjectMaster {
  id: string;
  institutionId: string;
  jenjang: JenjangLabel;
  kelas: string;
  namaMapel: string;
  tutorNama: string;
  kkm: number;
}

export interface LearningModule {
  id: string;
  institutionId: string;
  kode: string;
  judul: string;
  program: ProgramType;
  kelas?: string;
  mataPelajaran: string;
  bobotSkk: number;
  targetNilai: number;
  deskripsi: string;
  materiNama?: string;
  materiDriveUrl?: string;
  materiDriveFileId?: string;
}

export interface ScheduleItem {
  id: string;
  institutionId: string;
  hari: string;
  jamMulai: string;
  jamSelesai: string;
  jenjang: JenjangLabel;
  kelas: string;
  metode: 'Tatap Muka' | 'Tutorial' | 'Belajar Mandiri' | 'Daring / Online';
  mapel: string;
  tutor: string;
}

export interface Announcement {
  id: string;
  institutionId: string;
  judul: string;
  targetJenjang: string;
  isi: string;
  tanggal: string;
}

export interface LeaveRequest {
  id: string;
  institutionId: string;
  learnerId: string;
  learnerNama: string;
  tanggal: string;
  jenis: 'Izin' | 'Sakit';
  alasan: string;
  waktuAjukan: string;
  status: 'Menunggu' | 'Disetujui' | 'Ditolak';
}

export interface QuizQuestion {
  id: string;
  pertanyaan: string;
  pilihan: [string, string, string, string];
  kunciJawaban: number; // 0..3
  bobot: number;
  pembahasan: string;
}

export interface Quiz {
  id: string;
  institutionId: string;
  kodePaket?: string; // Unique CBT short link code e.g. MTK12A
  moduleId?: string;
  judul: string;
  mataPelajaran: string;
  program: ProgramType | 'Semua Program';
  kelas?: string;
  modePembelajaran: LearningMode;
  targetNilai: number;
  durasiMenit: number;
  tutorPembuat: string;
  tanggalDibuat: string;
  isRemedial?: boolean;
  assignedLearnerIds?: string[];
  parentQuizId?: string;
  soal: QuizQuestion[];
}

export interface QuestionAttemptDetail {
  questionId: string;
  jawabanDipilih: number | null;
  benar: boolean;
  durasiDetik: number;
}

export interface QuizAttempt {
  id: string;
  institutionId: string;
  quizId: string;
  quizJudul: string;
  mataPelajaran: string;
  moduleId?: string;
  modePembelajaran: LearningMode;
  learnerId: string;
  learnerNama: string;
  tanggalPengerjaan: string; // ISO string
  skor: number; // 0..100
  targetNilai: number;
  tuntas: boolean;
  totalBenar: number;
  totalSoal: number;
  totalDurasiDetik: number;
  detailSoal: QuestionAttemptDetail[];
}

export interface TutorNotification {
  id: string;
  institutionId: string;
  learnerId: string;
  learnerNama: string;
  program: ProgramType;
  tutorNama: string;
  tutorEmail: string;
  tutorTelepon?: string;
  kompetensi: string;
  skorCapaian: number;
  targetNilai: number;
  riskLevel: 'Tinggi (Drop-Out)' | 'Sedang' | 'Rendah';
  pemicu: string;
  waktuTerdeteksi: string;
  statusKirim:
    | 'Menunggu Tindakan'
    | 'Terkirim via Gmail'
    | 'Terkirim via WhatsApp'
    | 'Ditandai Selesai';
  waktuTerkirim?: string;
  remedialQuizId?: string;
}

export interface SyncBaseline {
  institutionId: string;
  hashes: Record<string, Record<string, string>>;
  lastDeltaSummary?: {
    timestamp: string;
    updatedRows: number;
    appendedRows: number;
    skippedRows: number;
  };
}

export type ActiveView =
  | 'dashboard'
  | 'learners'
  | 'attendance'
  | 'modules'
  | 'jadwal'
  | 'quizzes'
  | 'documents'
  | 'cards'
  | 'portal'
  | 'dinas'
  | 'settings';
