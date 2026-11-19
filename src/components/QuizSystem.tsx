import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  Copy,
  Download,
  ExternalLink,
  FileCheck2,
  FileSpreadsheet,
  Link2,
  Play,
  Plus,
  Trash2,
  Upload,
  XCircle,
} from 'lucide-react';
import { getKelasOptionsForProgram } from '../data/seedData';
import {
  Learner,
  LearningMode,
  LearningModule,
  ProgramType,
  QuestionAttemptDetail,
  Quiz,
  QuizAttempt,
  QuizQuestion,
} from '../types';

interface QuizSystemProps {
  institutionId: string;
  learners: Learner[];
  modules: LearningModule[];
  quizzes: Quiz[];
  attempts: QuizAttempt[];
  initialTab?: 'buat-soal' | 'pengerjaan' | 'hasil';
  preselectedLearnerId?: string | null;
  preselectedQuizId?: string | null;
  onAddQuiz: (quiz: Quiz) => void;
  onAddQuestionToQuiz: (quizId: string, question: QuizQuestion) => void;
  onBulkAddQuestionsToQuiz: (
    quizId: string,
    questions: QuizQuestion[]
  ) => void;
  onDeleteQuiz: (quizId: string) => void;
  onSubmitAttempt: (attempt: QuizAttempt) => void;
  onOpenStandaloneExam: (kodePaket: string) => void;
}

function formatClock(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function generateUniqueCode(mapel: string): string {
  const prefix = (mapel.replace(/[^a-zA-Z]/g, '').toUpperCase() || 'PKT').slice(
    0,
    3
  );
  const rand = Math.random().toString(36).substring(2, 5).toUpperCase();
  return `${prefix}${rand}`;
}

export const QuizSystem: React.FC<QuizSystemProps> = ({
  institutionId,
  learners,
  modules,
  quizzes,
  attempts,
  initialTab = 'buat-soal',
  preselectedLearnerId,
  preselectedQuizId,
  onAddQuiz,
  onAddQuestionToQuiz,
  onBulkAddQuestionsToQuiz,
  onDeleteQuiz,
  onSubmitAttempt,
  onOpenStandaloneExam,
}) => {
  const [activeTab, setActiveTab] = useState<
    'buat-soal' | 'pengerjaan' | 'hasil'
  >(initialTab);

  // --- PANEL TUTOR STATE ---
  const [judul, setJudul] = useState('');
  const [mataPelajaran, setMataPelajaran] = useState('');
  const [program, setProgram] = useState<ProgramType | 'Semua Program'>(
    'Paket C'
  );
  const [kelas, setKelas] = useState('Kelas 12');
  const [moduleId, setModuleId] = useState<string>(modules[0]?.id || '');
  const [modePembelajaran, setModePembelajaran] =
    useState<LearningMode>('Tatap Muka');
  const [targetNilai, setTargetNilai] = useState(75);
  const [durasiMenit, setDurasiMenit] = useState(30);
  const [tutorPembuat, setTutorPembuat] = useState('Drs. Hendra Kusuma, M.Pd.');

  // Import Massal Semicolon CSV/Textarea State
  const [bulkQuizId, setBulkQuizId] = useState<string>(quizzes[0]?.id || '');
  const [bulkText, setBulkText] = useState('');
  const [bulkStatusMsg, setBulkStatusMsg] = useState<string | null>(null);

  // Tambah Soal Satuan State
  const [singleQuizId, setSingleQuizId] = useState<string>(
    quizzes[0]?.id || ''
  );
  const [qText, setQText] = useState('');
  const [opsiA, setOpsiA] = useState('');
  const [opsiB, setOpsiB] = useState('');
  const [opsiC, setOpsiC] = useState('');
  const [opsiD, setOpsiD] = useState('');
  const [kunciLetter, setKunciLetter] = useState<'A' | 'B' | 'C' | 'D'>('A');
  const [qPembahasan, setQPembahasan] = useState('');
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  useEffect(() => {
    if (quizzes.length > 0 && !quizzes.some((q) => q.id === bulkQuizId)) {
      setBulkQuizId(quizzes[0].id);
    }
    if (quizzes.length > 0 && !quizzes.some((q) => q.id === singleQuizId)) {
      setSingleQuizId(quizzes[0].id);
    }
  }, [quizzes, bulkQuizId, singleQuizId]);

  const handleCreatePacket = (e: React.FormEvent) => {
    e.preventDefault();
    if (!judul.trim() || !mataPelajaran.trim()) return;
    const kodePaket = generateUniqueCode(mataPelajaran);
    const newQuiz: Quiz = {
      id: `QZ-${Date.now().toString().slice(-5)}`,
      institutionId,
      kodePaket,
      moduleId: moduleId || undefined,
      judul: judul.trim(),
      mataPelajaran: mataPelajaran.trim(),
      program,
      kelas,
      modePembelajaran,
      targetNilai,
      durasiMenit,
      tutorPembuat,
      tanggalDibuat: new Date().toISOString().slice(0, 10),
      soal: [],
    };
    onAddQuiz(newQuiz);
    setBulkQuizId(newQuiz.id);
    setSingleQuizId(newQuiz.id);
    setJudul('');
    setMataPelajaran('');
  };

  const handleDownloadBulkTemplate = () => {
    const template = [
      'Pertanyaan;Opsi A;Opsi B;Opsi C;Opsi D;Kunci;Pembahasan',
      'Hasil dari 25% dari Rp400.000 adalah...;Rp80.000;Rp100.000;Rp120.000;Rp150.000;B;25/100 x 400.000 = Rp100.000',
      'Fungsi Google Sheets untuk menjumlahkan dengan syarat tertentu adalah...;SUM;COUNT;SUMIF;AVERAGE;C;SUMIF menjumlahkan rentang berdasarkan kriteria',
    ].join('\n');
    const blob = new Blob([template], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'Template_Import_Soal_PKBM.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleFillBulkExample = () => {
    setBulkText(
      [
        'Hasil dari 25% dari Rp400.000 adalah...;Rp80.000;Rp100.000;Rp120.000;Rp150.000;B;25/100 x 400.000 = Rp100.000',
        'Dalam penyusunan laporan resmi lembaga, kalimat yang dipakai harus bersifat...;Lugas dan baku;Puitis;Ambigu;Hiperbolis;A;Laporan resmi menuntut bahasa baku dan lugas sesuai EYD V',
      ].join('\n')
    );
  };

  const handleUploadBulkFile = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    const text = await file.text();
    setBulkText(text);
  };

  const handleImportBulk = (e: React.FormEvent) => {
    e.preventDefault();
    if (!bulkQuizId || !bulkText.trim()) return;
    const lines = bulkText
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter(Boolean);

    const parsed: QuizQuestion[] = [];
    for (const line of lines) {
      if (line.toLowerCase().startsWith('pertanyaan;')) continue;
      const parts = line.split(';').map((p) => p.trim());
      if (parts.length < 6) continue;
      const [pert, a, b, c, d, keyRaw, pemb = ''] = parts;
      const keyChar = keyRaw.toUpperCase().charAt(0);
      const keyIdx =
        keyChar === 'A'
          ? 0
          : keyChar === 'B'
          ? 1
          : keyChar === 'C'
          ? 2
          : keyChar === 'D'
          ? 3
          : 0;
      parsed.push({
        id: `Q-IMP-${Date.now()}-${parsed.length + 1}`,
        pertanyaan: pert,
        pilihan: [a, b, c, d],
        kunciJawaban: keyIdx,
        bobot: 20,
        pembahasan: pemb,
      });
    }

    if (parsed.length === 0) {
      setBulkStatusMsg(
        'Format tidak valid. Gunakan pemisah titik koma (;): Pertanyaan;Opsi A;Opsi B;Opsi C;Opsi D;Kunci(A/B/C/D);Pembahasan'
      );
      return;
    }

    onBulkAddQuestionsToQuiz(bulkQuizId, parsed);
    setBulkStatusMsg(
      `Berhasil mengimpor ${parsed.length} butir soal ke paket soal terpilih.`
    );
    setBulkText('');
  };

  const handleAddSingleQuestion = (e: React.FormEvent) => {
    e.preventDefault();
    if (
      !singleQuizId ||
      !qText.trim() ||
      !opsiA.trim() ||
      !opsiB.trim() ||
      !opsiC.trim() ||
      !opsiD.trim()
    ) {
      return;
    }
    const keyMap = { A: 0, B: 1, C: 2, D: 3 } as const;
    onAddQuestionToQuiz(singleQuizId, {
      id: `Q-${Date.now()}`,
      pertanyaan: qText.trim(),
      pilihan: [opsiA.trim(), opsiB.trim(), opsiC.trim(), opsiD.trim()],
      kunciJawaban: keyMap[kunciLetter],
      bobot: 25,
      pembahasan: qPembahasan.trim(),
    });
    setQText('');
    setOpsiA('');
    setOpsiB('');
    setOpsiC('');
    setOpsiD('');
    setQPembahasan('');
  };

  const buildShortLink = (kodePaket: string) => {
    const origin =
      typeof window !== 'undefined'
        ? window.location.origin
        : 'https://pkbmdigital.sch.id';
    return `${origin}/?ujian=${encodeURIComponent(kodePaket)}`;
  };

  const handleCopyShortLink = async (kodePaket: string) => {
    try {
      await navigator.clipboard.writeText(buildShortLink(kodePaket));
      setCopiedCode(kodePaket);
      window.setTimeout(() => setCopiedCode(null), 2500);
    } catch {
      // ignore clipboard errors
    }
  };

  // --- TAB 2: LIVE TIMED QUIZ RUNNER STATE ---
  const [selectedLearnerId, setSelectedLearnerId] = useState<string>(
    preselectedLearnerId || learners[0]?.id || ''
  );
  const [selectedQuizId, setSelectedQuizId] = useState<string>(
    preselectedQuizId || quizzes[0]?.id || ''
  );
  const [sessionStatus, setSessionStatus] = useState<
    'idle' | 'running' | 'completed'
  >('idle');
  const [currentQIndex, setCurrentQIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [questionDurations, setQuestionDurations] = useState<
    Record<string, number>
  >({});
  const [totalElapsedSeconds, setTotalElapsedSeconds] = useState(0);
  const [lastCompletedAttempt, setLastCompletedAttempt] =
    useState<QuizAttempt | null>(null);

  useEffect(() => {
    if (preselectedLearnerId) setSelectedLearnerId(preselectedLearnerId);
  }, [preselectedLearnerId]);

  useEffect(() => {
    if (preselectedQuizId) {
      setSelectedQuizId(preselectedQuizId);
      setActiveTab('pengerjaan');
    }
  }, [preselectedQuizId]);

  useEffect(() => {
    if (
      learners.length > 0 &&
      !learners.some((l) => l.id === selectedLearnerId)
    ) {
      setSelectedLearnerId(learners[0].id);
    }
  }, [learners, selectedLearnerId]);

  useEffect(() => {
    if (quizzes.length > 0 && !quizzes.some((q) => q.id === selectedQuizId)) {
      setSelectedQuizId(quizzes[0].id);
    }
  }, [quizzes, selectedQuizId]);

  const activeQuiz = useMemo(
    () => quizzes.find((q) => q.id === selectedQuizId) || quizzes[0] || null,
    [quizzes, selectedQuizId]
  );

  const currentQuestion =
    activeQuiz && activeQuiz.soal[currentQIndex]
      ? activeQuiz.soal[currentQIndex]
      : null;

  const currentQuestionIdRef = useRef<string | null>(null);
  useEffect(() => {
    currentQuestionIdRef.current = currentQuestion?.id || null;
  }, [currentQuestion?.id]);

  useEffect(() => {
    if (sessionStatus !== 'running') return;
    const interval = window.setInterval(() => {
      setTotalElapsedSeconds((prev) => prev + 1);
      const qId = currentQuestionIdRef.current;
      if (qId) {
        setQuestionDurations((prev) => ({
          ...prev,
          [qId]: (prev[qId] || 0) + 1,
        }));
      }
    }, 1000);
    return () => window.clearInterval(interval);
  }, [sessionStatus]);

  const startQuizSession = (quizIdOverride?: string) => {
    const targetQuizId = quizIdOverride || selectedQuizId;
    if (quizIdOverride) setSelectedQuizId(quizIdOverride);
    const quizObj = quizzes.find((q) => q.id === targetQuizId);
    if (!quizObj || quizObj.soal.length === 0) return;

    setAnswers({});
    setQuestionDurations({});
    setTotalElapsedSeconds(0);
    setCurrentQIndex(0);
    setLastCompletedAttempt(null);
    setSessionStatus('running');
  };

  const finishQuizSession = () => {
    if (!activeQuiz) return;
    const learner = learners.find((l) => l.id === selectedLearnerId);
    if (!learner) return;

    let earnedWeight = 0;
    let totalWeight = 0;
    let totalBenar = 0;

    const detailSoal: QuestionAttemptDetail[] = activeQuiz.soal.map((q) => {
      const chosen = answers[q.id] !== undefined ? answers[q.id] : null;
      const benar = chosen === q.kunciJawaban;
      totalWeight += q.bobot || 1;
      if (benar) {
        earnedWeight += q.bobot || 1;
        totalBenar += 1;
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
    const tuntas = skor >= activeQuiz.targetNilai;

    const attempt: QuizAttempt = {
      id: `ATT-${Date.now().toString().slice(-6)}`,
      institutionId,
      quizId: activeQuiz.id,
      quizJudul: activeQuiz.judul,
      mataPelajaran: activeQuiz.mataPelajaran,
      moduleId: activeQuiz.moduleId,
      modePembelajaran: activeQuiz.modePembelajaran,
      learnerId: learner.id,
      learnerNama: learner.nama,
      tanggalPengerjaan: new Date().toISOString(),
      skor,
      targetNilai: activeQuiz.targetNilai,
      tuntas,
      totalBenar,
      totalSoal: activeQuiz.soal.length,
      totalDurasiDetik: Math.max(1, totalElapsedSeconds),
      detailSoal,
    };

    onSubmitAttempt(attempt);
    setLastCompletedAttempt(attempt);
    setSessionStatus('completed');
  };

  // --- TAB 3: ATTEMPT HISTORY FILTER ---
  const [historyLearnerFilter, setHistoryLearnerFilter] = useState('Semua');
  const [expandedAttemptId, setExpandedAttemptId] = useState<string | null>(
    null
  );

  const filteredAttempts = useMemo(() => {
    return attempts
      .filter(
        (a) =>
          historyLearnerFilter === 'Semua' ||
          a.learnerId === historyLearnerFilter
      )
      .sort((a, b) => b.tanggalPengerjaan.localeCompare(a.tanggalPengerjaan));
  }, [attempts, historyLearnerFilter]);

  return (
    <div className="space-y-6">
      {/* Header + Sub-tabs */}
      <div className="flex flex-col gap-4 border-b border-slate-200 pb-5 dark:border-slate-800 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
            Bank Soal CBT, Short Link Ujian Mandiri (?ujian=KODE), Import Massal CSV (;) & Stopwatch Real-Time
          </p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
            Bank Soal & Ujian CBT Digital
          </h1>
        </div>

        <div className="inline-flex flex-wrap rounded-lg bg-slate-100 p-1 dark:bg-slate-800">
          <button
            type="button"
            onClick={() => setActiveTab('buat-soal')}
            className={`rounded-md px-3.5 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap ${
              activeTab === 'buat-soal'
                ? 'bg-white text-slate-900 shadow-xs dark:bg-slate-900 dark:text-slate-100'
                : 'text-slate-600 hover:text-slate-900 dark:text-slate-400'
            }`}
          >
            Panel Tutor & Bank Soal ({quizzes.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('pengerjaan')}
            className={`rounded-md px-3.5 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap ${
              activeTab === 'pengerjaan'
                ? 'bg-white text-slate-900 shadow-xs dark:bg-slate-900 dark:text-slate-100'
                : 'text-slate-600 hover:text-slate-900 dark:text-slate-400'
            }`}
          >
            Ruang Ujian / Simulasi Portal
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('hasil')}
            className={`rounded-md px-3.5 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap ${
              activeTab === 'hasil'
                ? 'bg-white text-slate-900 shadow-xs dark:bg-slate-900 dark:text-slate-100'
                : 'text-slate-600 hover:text-slate-900 dark:text-slate-400'
            }`}
          >
            Hasil Individu ({attempts.length})
          </button>
        </div>
      </div>

      {/* TAB 1: PANEL TUTOR (PAKET SOAL + SHORT LINK + IMPORT MASSAL + SOAL SATUAN) */}
      {activeTab === 'buat-soal' && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          {/* Left Column: 1. Buat Paket Soal & 2. Import Soal Massal */}
          <div className="space-y-6 lg:col-span-5">
            {/* 1. Buat Paket Soal Baru */}
            <form
              onSubmit={handleCreatePacket}
              className="space-y-3 rounded-xl border border-slate-200 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900 text-xs"
            >
              <h2 className="border-b border-slate-200 pb-2.5 text-base font-bold text-slate-900 dark:border-slate-800 dark:text-slate-100">
                1. Buat Paket Soal Baru & Short Link
              </h2>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300">
                    Jenjang Sasaran
                  </label>
                  <select
                    value={program}
                    onChange={(e) => {
                      const p = e.target.value as ProgramType | 'Semua Program';
                      setProgram(p);
                      if (p !== 'Semua Program') {
                        const opts = getKelasOptionsForProgram(p);
                        if (opts.length > 0) setKelas(opts[opts.length - 1]);
                      }
                    }}
                    className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-2.5 py-2 dark:border-slate-700 dark:bg-slate-950"
                  >
                    <option value="Paket A">Paket A (SD)</option>
                    <option value="Paket B">Paket B (SMP)</option>
                    <option value="Paket C">Paket C (SMA)</option>
                    <option value="Kursus Vokasi">Kursus Vokasi</option>
                    <option value="Semua Program">Semua Program</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300">
                    Kelas
                  </label>
                  <select
                    value={kelas}
                    onChange={(e) => setKelas(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-2.5 py-2 dark:border-slate-700 dark:bg-slate-950"
                  >
                    {getKelasOptionsForProgram(program).map((k) => (
                      <option key={k} value={k}>
                        {k}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300">
                  Mata Pelajaran *
                </label>
                <input
                  type="text"
                  required
                  value={mataPelajaran}
                  onChange={(e) => setMataPelajaran(e.target.value)}
                  placeholder="Mis. Matematika / Bahasa Indonesia"
                  className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-950"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300">
                  Judul Paket Ujian / Evaluasi *
                </label>
                <input
                  type="text"
                  required
                  value={judul}
                  onChange={(e) => setJudul(e.target.value)}
                  placeholder="Mis. Ujian Modul 2 Semester Ganjil"
                  className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-950"
                />
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300">
                    Durasi (Mnt)
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={180}
                    value={durasiMenit}
                    onChange={(e) => setDurasiMenit(Number(e.target.value))}
                    className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-2.5 py-2 font-mono dark:border-slate-700 dark:bg-slate-950"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300">
                    KKM
                  </label>
                  <input
                    type="number"
                    min={50}
                    max={100}
                    value={targetNilai}
                    onChange={(e) => setTargetNilai(Number(e.target.value))}
                    className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-2.5 py-2 font-mono dark:border-slate-700 dark:bg-slate-950"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300">
                    Jalur SKK
                  </label>
                  <select
                    value={modePembelajaran}
                    onChange={(e) =>
                      setModePembelajaran(e.target.value as LearningMode)
                    }
                    className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-2 py-2 dark:border-slate-700 dark:bg-slate-950"
                  >
                    <option value="Tatap Muka">Tatap Muka</option>
                    <option value="Tutorial">Tutorial</option>
                    <option value="Mandiri">Mandiri</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300">
                    Kaitkan Modul (Opsional)
                  </label>
                  <select
                    value={moduleId}
                    onChange={(e) => setModuleId(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-2.5 py-2 dark:border-slate-700 dark:bg-slate-950"
                  >
                    <option value="">Umum</option>
                    {modules.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.kode}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300">
                    Tutor Penyusun
                  </label>
                  <input
                    type="text"
                    value={tutorPembuat}
                    onChange={(e) => setTutorPembuat(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-2.5 py-2 dark:border-slate-700 dark:bg-slate-950"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full rounded-lg bg-blue-700 py-2.5 font-bold text-white hover:bg-blue-800"
              >
                + Buat Paket Soal & Generate Kode Unik
              </button>
            </form>

            {/* 2. Import Soal Massal */}
            <form
              onSubmit={handleImportBulk}
              className="space-y-3 rounded-xl border border-slate-200 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900 text-xs"
            >
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 pb-2.5 dark:border-slate-800">
                <h2 className="flex items-center gap-1.5 text-base font-bold text-slate-900 dark:text-slate-100">
                  <FileSpreadsheet className="h-4 w-4 text-emerald-700 dark:text-emerald-400" />
                  <span>2. Import Soal Massal (CSV / Copy-Paste ;)</span>
                </h2>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300">
                  Target Paket Soal
                </label>
                <select
                  value={bulkQuizId}
                  onChange={(e) => setBulkQuizId(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-2.5 py-2 dark:border-slate-700 dark:bg-slate-950"
                >
                  {quizzes.map((q) => (
                    <option key={q.id} value={q.id}>
                      [{q.kodePaket || q.id}] {q.judul} ({q.soal.length} soal)
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={handleDownloadBulkTemplate}
                  className="inline-flex items-center gap-1 rounded border border-slate-200 bg-slate-50 px-2.5 py-1 font-semibold text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                >
                  <Download className="h-3 w-3" />
                  <span>Template CSV</span>
                </button>
                <button
                  type="button"
                  onClick={handleFillBulkExample}
                  className="inline-flex items-center gap-1 rounded border border-blue-200 bg-blue-50 px-2.5 py-1 font-semibold text-blue-700 hover:bg-blue-100 dark:border-blue-800 dark:bg-blue-950/60 dark:text-blue-300"
                >
                  <span>Contoh</span>
                </button>
                <label className="inline-flex cursor-pointer items-center gap-1 rounded border border-slate-200 bg-slate-50 px-2.5 py-1 font-semibold text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200">
                  <Upload className="h-3 w-3" />
                  <span>File .csv/.txt</span>
                  <input
                    type="file"
                    accept=".csv,.txt"
                    onChange={handleUploadBulkFile}
                    className="hidden"
                  />
                </label>
              </div>

              <div>
                <textarea
                  rows={4}
                  value={bulkText}
                  onChange={(e) => setBulkText(e.target.value)}
                  placeholder="Format per baris: Pertanyaan;Opsi A;Opsi B;Opsi C;Opsi D;Kunci (A/B/C/D);Pembahasan"
                  className="w-full rounded-lg border border-slate-200 bg-white p-2.5 font-mono text-[11px] dark:border-slate-700 dark:bg-slate-950"
                />
              </div>

              {bulkStatusMsg && (
                <p className="font-medium text-emerald-700 dark:text-emerald-400">
                  {bulkStatusMsg}
                </p>
              )}

              <button
                type="submit"
                className="w-full rounded-lg bg-emerald-700 py-2 font-bold text-white hover:bg-emerald-800"
              >
                Import Butir Soal ke Paket Terpilih
              </button>
            </form>
          </div>

          {/* Right Column: Daftar Paket Soal & Short Link + Tambah Soal Satuan */}
          <div className="space-y-6 lg:col-span-7">
            {/* Daftar Paket Soal & Short Link */}
            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900">
              <div className="flex items-center justify-between border-b border-slate-200 pb-3 dark:border-slate-800">
                <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
                  Daftar Paket Soal & Short Link Ujian ({quizzes.length})
                </h2>
              </div>

              <div className="mt-4 space-y-3">
                {quizzes.map((q) => {
                  const kode = q.kodePaket || q.id;
                  return (
                    <div
                      key={q.id}
                      className="rounded-lg border border-slate-200 bg-slate-50/50 p-3.5 text-xs dark:border-slate-800 dark:bg-slate-950"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="rounded bg-blue-900 px-2 py-0.5 font-mono text-[11px] font-bold text-white">
                              KODE: {kode}
                            </span>
                            {q.isRemedial && (
                              <span className="font-bold text-red-700 dark:text-red-400">
                                [Remidial]
                              </span>
                            )}
                            <span className="font-bold text-slate-900 dark:text-slate-100 text-sm">
                              {q.judul}
                            </span>
                          </div>
                          <p className="mt-1 text-slate-600 dark:text-slate-400">
                            {q.mataPelajaran} · {q.program}
                            {q.kelas ? ` (${q.kelas})` : ''} ·{' '}
                            {q.modePembelajaran} ·{' '}
                            <strong className="font-mono text-slate-800 dark:text-slate-200">
                              {q.soal.length} Soal
                            </strong>{' '}
                            · {q.durasiMenit} mnt · KKM {q.targetNilai}
                          </p>
                        </div>

                        <div className="flex flex-wrap items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleCopyShortLink(kode)}
                            className="inline-flex items-center gap-1 rounded border border-slate-200 bg-white px-2.5 py-1 font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                          >
                            {copiedCode === kode ? (
                              <>
                                <Check className="h-3 w-3 text-emerald-600" />
                                <span>Tersalin</span>
                              </>
                            ) : (
                              <>
                                <Copy className="h-3 w-3 text-blue-600" />
                                <span>Salin Link</span>
                              </>
                            )}
                          </button>
                          <button
                            type="button"
                            onClick={() => onOpenStandaloneExam(kode)}
                            className="inline-flex items-center gap-1 rounded border border-blue-200 bg-blue-50 px-2.5 py-1 font-semibold text-blue-700 hover:bg-blue-100 dark:border-blue-800 dark:bg-blue-950/60 dark:text-blue-300"
                          >
                            <ExternalLink className="h-3 w-3" />
                            <span>Buka CBT (?ujian)</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedQuizId(q.id);
                              setActiveTab('pengerjaan');
                            }}
                            className="inline-flex items-center gap-1 rounded bg-slate-900 px-2.5 py-1 font-semibold text-white hover:bg-slate-800 dark:bg-blue-700"
                          >
                            <Play className="h-3 w-3" />
                            <span>Simulasi</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => onDeleteQuiz(q.id)}
                            className="rounded p-1 text-red-600 hover:bg-red-50 dark:text-red-400"
                            title="Hapus paket soal"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                      <div className="mt-2 flex items-center gap-1.5 font-mono text-[11px] text-slate-500 dark:text-slate-400">
                        <Link2 className="h-3 w-3 shrink-0" />
                        <span className="truncate">{buildShortLink(kode)}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Tambah Soal Satuan */}
            <form
              onSubmit={handleAddSingleQuestion}
              className="space-y-3 rounded-xl border border-slate-200 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900 text-xs"
            >
              <div className="flex items-center justify-between border-b border-slate-200 pb-2.5 dark:border-slate-800">
                <h2 className="flex items-center gap-1.5 text-base font-bold text-slate-900 dark:text-slate-100">
                  <Plus className="h-4 w-4 text-blue-700 dark:text-blue-400" />
                  <span>Tambah Soal Satuan</span>
                </h2>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <div className="sm:col-span-2">
                  <label className="block font-semibold text-slate-700 dark:text-slate-300">
                    Pilih Paket Soal
                  </label>
                  <select
                    value={singleQuizId}
                    onChange={(e) => setSingleQuizId(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-2.5 py-2 dark:border-slate-700 dark:bg-slate-950"
                  >
                    {quizzes.map((q) => (
                      <option key={q.id} value={q.id}>
                        [{q.kodePaket || q.id}] {q.judul}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300">
                    Kunci Jawaban
                  </label>
                  <select
                    value={kunciLetter}
                    onChange={(e) =>
                      setKunciLetter(e.target.value as 'A' | 'B' | 'C' | 'D')
                    }
                    className="mt-1 w-full rounded-lg border border-emerald-300 bg-emerald-50 px-2.5 py-2 font-bold text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300"
                  >
                    <option value="A">Kunci: A</option>
                    <option value="B">Kunci: B</option>
                    <option value="C">Kunci: C</option>
                    <option value="D">Kunci: D</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300">
                  Pertanyaan *
                </label>
                <textarea
                  rows={2}
                  required
                  value={qText}
                  onChange={(e) => setQText(e.target.value)}
                  placeholder="Tuliskan soal pilihan ganda..."
                  className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-950"
                />
              </div>

              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                <input
                  type="text"
                  required
                  value={opsiA}
                  onChange={(e) => setOpsiA(e.target.value)}
                  placeholder="Opsi A"
                  className="rounded-lg border border-slate-200 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-950"
                />
                <input
                  type="text"
                  required
                  value={opsiB}
                  onChange={(e) => setOpsiB(e.target.value)}
                  placeholder="Opsi B"
                  className="rounded-lg border border-slate-200 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-950"
                />
                <input
                  type="text"
                  required
                  value={opsiC}
                  onChange={(e) => setOpsiC(e.target.value)}
                  placeholder="Opsi C"
                  className="rounded-lg border border-slate-200 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-950"
                />
                <input
                  type="text"
                  required
                  value={opsiD}
                  onChange={(e) => setOpsiD(e.target.value)}
                  placeholder="Opsi D"
                  className="rounded-lg border border-slate-200 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-950"
                />
              </div>

              <input
                type="text"
                value={qPembahasan}
                onChange={(e) => setQPembahasan(e.target.value)}
                placeholder="Pembahasan kunci jawaban (opsional)"
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-950"
              />

              <button
                type="submit"
                className="rounded-lg bg-slate-900 px-4 py-2 font-bold text-white hover:bg-slate-800 dark:bg-blue-700 dark:hover:bg-blue-800"
              >
                + Tambahkan Butir Soal
              </button>
            </form>
          </div>
        </div>
      )}

      {/* TAB 2: LIVE TIMED CBT ASSESSMENT RUNNER */}
      {activeTab === 'pengerjaan' && (
        <div className="space-y-6">
          {sessionStatus === 'idle' && (
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
              <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-xs dark:border-slate-800 dark:bg-slate-900 lg:col-span-5">
                <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
                  Mulai Sesi Evaluasi CBT Real-Time
                </h2>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  Menghitung durasi per soal dan total waktu secara real-time, lalu menilai otomatis & menerbitkan soal remidial bila skor di bawah KKM.
                </p>

                <div className="mt-5 space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                      Pilih Warga Belajar
                    </label>
                    <select
                      value={selectedLearnerId}
                      onChange={(e) => setSelectedLearnerId(e.target.value)}
                      className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950"
                    >
                      {learners.map((l) => (
                        <option key={l.id} value={l.id}>
                          {l.nama} — {l.program} ({l.kelas || l.rombel})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                      Pilih Paket Soal Evaluasi
                    </label>
                    <select
                      value={selectedQuizId}
                      onChange={(e) => setSelectedQuizId(e.target.value)}
                      className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950"
                    >
                      {quizzes.map((q) => (
                        <option key={q.id} value={q.id}>
                          {q.isRemedial ? '[REMIDIAL] ' : `[${q.kodePaket || q.id}] `}
                          {q.judul} ({q.soal.length} soal · KKM {q.targetNilai})
                        </option>
                      ))}
                    </select>
                  </div>

                  {activeQuiz && (
                    <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-xs text-slate-700 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300">
                      <div className="grid grid-cols-2 gap-2 font-mono tabular-nums">
                        <div>
                          <span className="text-slate-500">Mata Pelajaran:</span>
                          <p className="font-sans font-semibold text-slate-900 dark:text-slate-100">
                            {activeQuiz.mataPelajaran}
                          </p>
                        </div>
                        <div>
                          <span className="text-slate-500">Kode Short Link:</span>
                          <p className="font-semibold text-blue-700 dark:text-blue-400">
                            {activeQuiz.kodePaket || activeQuiz.id}
                          </p>
                        </div>
                        <div>
                          <span className="text-slate-500">Target KKM:</span>
                          <p className="font-semibold text-slate-900 dark:text-slate-100">
                            {activeQuiz.targetNilai} poin
                          </p>
                        </div>
                        <div>
                          <span className="text-slate-500">Batas Waktu:</span>
                          <p className="font-semibold text-slate-900 dark:text-slate-100">
                            {activeQuiz.durasiMenit} menit
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={() => startQuizSession()}
                    disabled={!activeQuiz || activeQuiz.soal.length === 0}
                    className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-blue-700 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-800 disabled:opacity-50"
                  >
                    <Play className="h-4 w-4" />
                    <span>Mulai Pengerjaan & Aktifkan Timer</span>
                  </button>
                </div>
              </div>

              <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-xs dark:border-slate-800 dark:bg-slate-900 lg:col-span-7">
                <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
                  Daftar Paket Soal & Remidial Tersedia
                </h2>
                <div className="mt-4 divide-y divide-slate-200 dark:divide-slate-800">
                  {quizzes.map((q) => (
                    <div
                      key={q.id}
                      className="flex flex-col justify-between gap-3 py-4 first:pt-0 last:pb-0 sm:flex-row sm:items-center"
                    >
                      <div>
                        <p className="font-semibold text-slate-900 dark:text-slate-100">
                          {q.isRemedial && (
                            <span className="mr-1.5 text-xs font-bold text-red-700 dark:text-red-400">
                              [Remidial Otomatis]
                            </span>
                          )}
                          {q.judul}
                        </p>
                        <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                          Kode: {q.kodePaket || q.id} · {q.mataPelajaran} ·{' '}
                          {q.soal.length} soal · KKM {q.targetNilai}
                        </p>
                      </div>
                      <button
                        type="button"
                        disabled={q.soal.length === 0}
                        onClick={() => startQuizSession(q.id)}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-xs font-medium text-slate-800 hover:bg-slate-50 disabled:opacity-40 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 whitespace-nowrap shrink-0"
                      >
                        <Play className="h-3.5 w-3.5 text-blue-700 dark:text-blue-400" />
                        <span>Kerjakan</span>
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {sessionStatus === 'running' && activeQuiz && currentQuestion && (
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
              <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-xs dark:border-slate-800 dark:bg-slate-900 lg:col-span-8">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-4 dark:border-slate-800">
                  <div>
                    <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                      {activeQuiz.judul} ·{' '}
                      {learners.find((l) => l.id === selectedLearnerId)?.nama}
                    </p>
                    <h2 className="mt-0.5 text-base font-bold text-slate-900 dark:text-slate-100">
                      Soal {currentQIndex + 1} dari {activeQuiz.soal.length}
                    </h2>
                  </div>

                  <div className="flex items-center gap-4 rounded-lg border border-slate-200 bg-slate-50 px-3.5 py-2 font-mono text-xs tabular-nums dark:border-slate-700 dark:bg-slate-950">
                    <div>
                      <span className="block text-[10px] text-slate-500">
                        Durasi Soal Ini
                      </span>
                      <span className="font-semibold text-blue-700 dark:text-blue-400">
                        {formatClock(questionDurations[currentQuestion.id] || 0)}
                      </span>
                    </div>
                    <div className="h-6 w-px bg-slate-200 dark:bg-slate-800" />
                    <div>
                      <span className="block text-[10px] text-slate-500">
                        Total Waktu Berjalan
                      </span>
                      <span className="font-semibold text-slate-900 dark:text-slate-100">
                        {formatClock(totalElapsedSeconds)} /{' '}
                        {formatClock(activeQuiz.durasiMenit * 60)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Progress Strip: Total / Terjawab / Belum */}
                <div className="mt-4 grid grid-cols-3 gap-2 rounded-lg border border-slate-200 bg-slate-50 p-2.5 text-center font-mono text-xs tabular-nums dark:border-slate-800 dark:bg-slate-950">
                  <div>
                    <span className="text-slate-500">Total Soal:</span>{' '}
                    <strong className="text-slate-900 dark:text-slate-100">
                      {activeQuiz.soal.length}
                    </strong>
                  </div>
                  <div>
                    <span className="text-emerald-700 dark:text-emerald-400">
                      Terjawab:
                    </span>{' '}
                    <strong className="text-emerald-700 dark:text-emerald-400">
                      {Object.keys(answers).length}
                    </strong>
                  </div>
                  <div>
                    <span className="text-amber-700 dark:text-amber-400">
                      Belum:
                    </span>{' '}
                    <strong className="text-amber-700 dark:text-amber-400">
                      {activeQuiz.soal.length - Object.keys(answers).length}
                    </strong>
                  </div>
                </div>

                <div className="py-6">
                  <p className="text-base font-medium leading-relaxed text-slate-900 dark:text-slate-100">
                    {currentQuestion.pertanyaan}
                  </p>

                  <div className="mt-5 space-y-2.5">
                    {currentQuestion.pilihan.map((optText, optIdx) => {
                      const isSelected =
                        answers[currentQuestion.id] === optIdx;
                      const letter = String.fromCharCode(65 + optIdx);
                      return (
                        <button
                          key={optIdx}
                          type="button"
                          onClick={() =>
                            setAnswers((prev) => ({
                              ...prev,
                              [currentQuestion.id]: optIdx,
                            }))
                          }
                          className={`flex w-full items-start gap-3 rounded-lg border p-3.5 text-left text-sm transition-colors ${
                            isSelected
                              ? 'border-blue-700 bg-blue-50/70 text-slate-900 dark:border-blue-500 dark:bg-blue-950/60 dark:text-slate-100'
                              : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-300 dark:hover:bg-slate-800'
                          }`}
                        >
                          <span
                            className={`flex h-6 w-6 shrink-0 items-center justify-center rounded font-mono text-xs font-semibold ${
                              isSelected
                                ? 'bg-blue-700 text-white'
                                : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                            }`}
                          >
                            {letter}
                          </span>
                          <span className="leading-relaxed">{optText}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="flex items-center justify-between border-t border-slate-200 pt-4 dark:border-slate-800">
                  <button
                    type="button"
                    disabled={currentQIndex === 0}
                    onClick={() => setCurrentQIndex((i) => Math.max(0, i - 1))}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-40 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                  >
                    <ChevronLeft className="h-4 w-4" />
                    <span>Sebelumnya</span>
                  </button>

                  {currentQIndex < activeQuiz.soal.length - 1 ? (
                    <button
                      type="button"
                      onClick={() =>
                        setCurrentQIndex((i) =>
                          Math.min(activeQuiz.soal.length - 1, i + 1)
                        )
                      }
                      className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 dark:bg-blue-700"
                    >
                      <span>Soal Berikutnya</span>
                      <ChevronRight className="h-4 w-4" />
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={finishQuizSession}
                      className="inline-flex items-center gap-2 rounded-lg bg-blue-700 px-4 py-2 text-sm font-medium text-white hover:bg-blue-800"
                    >
                      <FileCheck2 className="h-4 w-4" />
                      <span>Selesaikan & Nilai Otomatis</span>
                    </button>
                  )}
                </div>
              </div>

              <div className="space-y-4 lg:col-span-4">
                <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900">
                  <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                    Navigasi Nomor Soal
                  </h3>
                  <div className="mt-3 grid grid-cols-5 gap-2">
                    {activeQuiz.soal.map((q, idx) => {
                      const answered = answers[q.id] !== undefined;
                      const current = idx === currentQIndex;
                      return (
                        <button
                          key={q.id}
                          type="button"
                          onClick={() => setCurrentQIndex(idx)}
                          className={`rounded-lg border py-2 font-mono text-xs font-semibold tabular-nums transition-colors ${
                            current
                              ? 'border-blue-700 bg-blue-700 text-white'
                              : answered
                              ? 'border-emerald-300 bg-emerald-50 text-emerald-800 dark:border-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300'
                              : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300'
                          }`}
                        >
                          {idx + 1}
                        </button>
                      );
                    })}
                  </div>

                  <button
                    type="button"
                    onClick={finishQuizSession}
                    className="mt-4 w-full rounded-lg border border-blue-700 bg-blue-50 px-3 py-2 text-xs font-semibold text-blue-800 hover:bg-blue-100 dark:border-blue-600 dark:bg-blue-950/60 dark:text-blue-300"
                  >
                    Kirim Jawaban Sekarang
                  </button>
                </div>
              </div>
            </div>
          )}

          {sessionStatus === 'completed' &&
            lastCompletedAttempt &&
            activeQuiz && (
              <div className="space-y-6 rounded-xl border border-slate-200 bg-white p-6 shadow-xs dark:border-slate-800 dark:bg-slate-900">
                <div className="flex flex-col gap-4 border-b border-slate-200 pb-5 dark:border-slate-800 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <div className="flex items-center gap-2 text-sm font-semibold">
                      {lastCompletedAttempt.tuntas ? (
                        <span className="inline-flex items-center gap-1.5 text-emerald-700 dark:text-emerald-400">
                          <CheckCircle2 className="h-5 w-5" />
                          Target Kompetensi Tercapai
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 text-red-700 dark:text-red-400">
                          <AlertTriangle className="h-5 w-5" />
                          Target Belum Tercapai — EWS & Soal Remidial Otomatis Diterbitkan
                        </span>
                      )}
                    </div>
                    <h2 className="mt-1 text-xl font-bold text-slate-900 dark:text-slate-100">
                      {lastCompletedAttempt.learnerNama} ·{' '}
                      {lastCompletedAttempt.quizJudul}
                    </h2>
                  </div>

                  <div className="flex items-center gap-6 font-mono tabular-nums">
                    <div>
                      <p className="text-xs text-slate-500">Skor Akhir</p>
                      <p
                        className={`text-3xl font-bold ${
                          lastCompletedAttempt.tuntas
                            ? 'text-emerald-700 dark:text-emerald-400'
                            : 'text-red-700 dark:text-red-400'
                        }`}
                      >
                        {lastCompletedAttempt.skor}
                        <span className="text-sm font-normal text-slate-400">
                          /{lastCompletedAttempt.targetNilai}
                        </span>
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500">Total Durasi</p>
                      <p className="text-xl font-semibold text-slate-900 dark:text-slate-100">
                        {formatClock(lastCompletedAttempt.totalDurasiDetik)}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                    Pembahasan Kunci Jawaban Otomatis & Rincian Waktu per Soal
                  </h3>
                  {activeQuiz.soal.map((q, idx) => {
                    const detail = lastCompletedAttempt.detailSoal.find(
                      (d) => d.questionId === q.id
                    );
                    const chosenIdx = detail?.jawabanDipilih ?? null;
                    return (
                      <div
                        key={q.id}
                        className="rounded-lg border border-slate-200 p-4 text-sm dark:border-slate-800"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <p className="font-medium text-slate-900 dark:text-slate-100">
                            {idx + 1}. {q.pertanyaan}
                          </p>
                          <div className="flex items-center gap-3 shrink-0 font-mono text-xs tabular-nums">
                            <span className="text-slate-500">
                              <Clock className="mr-1 inline h-3.5 w-3.5" />
                              {detail?.durasiDetik || 0}d
                            </span>
                            {detail?.benar ? (
                              <span className="inline-flex items-center gap-1 font-semibold text-emerald-700 dark:text-emerald-400">
                                <CheckCircle2 className="h-4 w-4" />
                                Benar
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 font-semibold text-red-700 dark:text-red-400">
                                <XCircle className="h-4 w-4" />
                                Salah
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="mt-2 grid grid-cols-1 gap-1.5 text-xs sm:grid-cols-2">
                          <p className="text-slate-600 dark:text-slate-400">
                            Jawaban Peserta:{' '}
                            <span className="font-semibold text-slate-900 dark:text-slate-100">
                              {chosenIdx !== null
                                ? `${String.fromCharCode(65 + chosenIdx)}. ${
                                    q.pilihan[chosenIdx]
                                  }`
                                : 'Tidak dijawab'}
                            </span>
                          </p>
                          <p className="text-emerald-700 dark:text-emerald-400">
                            Kunci Jawaban:{' '}
                            <span className="font-semibold">
                              {String.fromCharCode(65 + q.kunciJawaban)}.{' '}
                              {q.pilihan[q.kunciJawaban]}
                            </span>
                          </p>
                        </div>
                        {q.pembahasan && (
                          <p className="mt-2 text-xs text-slate-600 dark:text-slate-400">
                            Pembahasan: {q.pembahasan}
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>

                <div className="flex justify-end border-t border-slate-200 pt-4 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={() => setSessionStatus('idle')}
                    className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 dark:bg-blue-700"
                  >
                    Kembali ke Pemilihan Soal
                  </button>
                </div>
              </div>
            )}
        </div>
      )}

      {/* TAB 3: ATTEMPT HISTORY & DURATION ANALYSIS */}
      {activeTab === 'hasil' && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
            <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">
              Riwayat Pengerjaan & Analisis Durasi Individu ({filteredAttempts.length})
            </h2>
            <select
              value={historyLearnerFilter}
              onChange={(e) => setHistoryLearnerFilter(e.target.value)}
              className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs dark:border-slate-700 dark:bg-slate-950"
            >
              <option value="Semua">Semua Warga Belajar</option>
              {learners.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.nama} ({l.nisn})
                </option>
              ))}
            </select>
          </div>

          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/70 font-semibold text-slate-600 dark:border-slate-800 dark:bg-slate-800/50 dark:text-slate-300">
                    <th className="px-4 py-3">Tanggal</th>
                    <th className="px-4 py-3">Warga Belajar</th>
                    <th className="px-4 py-3">Paket Soal</th>
                    <th className="px-4 py-3 text-right">Benar</th>
                    <th className="px-4 py-3 text-right">Durasi</th>
                    <th className="px-4 py-3 text-right">Skor / KKM</th>
                    <th className="px-4 py-3 text-right">Detail</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                  {filteredAttempts.map((at) => {
                    const expanded = expandedAttemptId === at.id;
                    return (
                      <React.Fragment key={at.id}>
                        <tr className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40">
                          <td className="px-4 py-3 font-mono text-slate-500 tabular-nums">
                            {at.tanggalPengerjaan.slice(0, 16).replace('T', ' ')}
                          </td>
                          <td className="px-4 py-3 font-semibold text-slate-900 dark:text-slate-100">
                            {at.learnerNama}
                          </td>
                          <td className="px-4 py-3">
                            <p className="font-medium text-slate-800 dark:text-slate-200">
                              {at.quizJudul}
                            </p>
                            <p className="text-[11px] text-slate-500">
                              {at.mataPelajaran} · {at.modePembelajaran}
                            </p>
                          </td>
                          <td className="px-4 py-3 text-right font-mono tabular-nums">
                            {at.totalBenar}/{at.totalSoal}
                          </td>
                          <td className="px-4 py-3 text-right font-mono tabular-nums">
                            {formatClock(at.totalDurasiDetik)}
                          </td>
                          <td className="px-4 py-3 text-right font-mono font-bold tabular-nums">
                            <span
                              className={
                                at.tuntas
                                  ? 'text-emerald-700 dark:text-emerald-400'
                                  : 'text-red-700 dark:text-red-400'
                              }
                            >
                              {at.skor} / {at.targetNilai}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right">
                            <button
                              type="button"
                              onClick={() =>
                                setExpandedAttemptId(expanded ? null : at.id)
                              }
                              className="rounded border border-slate-200 px-2.5 py-1 text-[11px] font-medium hover:bg-slate-100 dark:border-slate-700 dark:hover:bg-slate-800"
                            >
                              {expanded ? 'Tutup' : 'Rincian'}
                            </button>
                          </td>
                        </tr>
                        {expanded && (
                          <tr>
                            <td
                              colSpan={7}
                              className="bg-slate-50 px-6 py-3 dark:bg-slate-950"
                            >
                              <div className="flex flex-wrap gap-2">
                                {at.detailSoal.map((d, i) => (
                                  <div
                                    key={d.questionId}
                                    className={`rounded border px-2.5 py-1 font-mono text-[11px] tabular-nums ${
                                      d.benar
                                        ? 'border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300'
                                        : 'border-red-200 bg-red-50 text-red-800 dark:border-red-800 dark:bg-red-950/50 dark:text-red-300'
                                    }`}
                                  >
                                    No.{i + 1}: {d.benar ? 'Benar' : 'Salah'} (
                                    {d.durasiDetik}d)
                                  </div>
                                ))}
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
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
