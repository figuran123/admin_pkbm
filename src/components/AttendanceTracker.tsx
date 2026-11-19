import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import * as pdfjsLib from 'pdfjs-dist';
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import {
  AlertCircle,
  CalendarCheck,
  Camera,
  Check,
  CheckCheck,
  Clock,
  CloudOff,
  FileUp,
  Image as ImageIcon,
  QrCode,
  RefreshCw,
  Square,
  Wifi,
  WifiOff,
  XCircle,
} from 'lucide-react';
import {
  AttendanceRecord,
  AttendanceStatus,
  Learner,
  LearningMode,
  LeaveRequest,
} from '../types';

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

interface AttendanceTrackerProps {
  institutionId: string;
  learners: Learner[];
  attendance: AttendanceRecord[];
  leaveRequests: LeaveRequest[];
  pendingOfflineCount: number;
  isOfflineSimulated: boolean;
  isOnlineBrowser: boolean;
  onToggleOfflineSim: () => void;
  onSyncOfflineQueue: () => void;
  onUpsertAttendance: (
    record: AttendanceRecord,
    forceOfflineQueue?: boolean
  ) => void;
  onBulkMarkPresent: (
    tanggal: string,
    learnerIds: string[],
    modePembelajaran: LearningMode
  ) => void;
  onResolveLeaveRequest: (id: string, approve: boolean) => void;
}

const STATUS_OPTIONS: Array<{
  value: AttendanceStatus;
  label: string;
  activeClass: string;
}> = [
  {
    value: 'Hadir',
    label: 'Hadir',
    activeClass: 'bg-emerald-700 text-white border-emerald-700',
  },
  {
    value: 'Izin',
    label: 'Izin',
    activeClass: 'bg-blue-700 text-white border-blue-700',
  },
  {
    value: 'Sakit',
    label: 'Sakit',
    activeClass: 'bg-amber-600 text-white border-amber-600',
  },
  {
    value: 'Alfa',
    label: 'Alfa',
    activeClass: 'bg-red-600 text-white border-red-600',
  },
];

const LEARNING_MODES: LearningMode[] = ['Tatap Muka', 'Tutorial', 'Mandiri'];

export const AttendanceTracker: React.FC<AttendanceTrackerProps> = ({
  institutionId,
  learners,
  attendance,
  leaveRequests,
  pendingOfflineCount,
  isOfflineSimulated,
  isOnlineBrowser,
  onToggleOfflineSim,
  onSyncOfflineQueue,
  onUpsertAttendance,
  onBulkMarkPresent,
  onResolveLeaveRequest,
}) => {
  const [selectedDate, setSelectedDate] = useState<string>('2026-11-15');
  const [selectedMode, setSelectedMode] = useState<LearningMode>('Tatap Muka');
  const [scanStatusChoice, setScanStatusChoice] =
    useState<AttendanceStatus>('Hadir');
  const [programFilter, setProgramFilter] = useState<string>('Semua');
  const [qrInput, setQrInput] = useState('');
  const [qrFeedback, setQrFeedback] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);

  // Camera & File/PDF Scanner state
  const [cameraActive, setCameraActive] = useState(false);
  const [scanningFile, setScanningFile] = useState(false);
  const cameraScannerRef = useRef<Html5Qrcode | null>(null);
  const cameraTimerRef = useRef<number | null>(null);
  const isMountedRef = useRef(true);

  const effectivelyOffline = isOfflineSimulated || !isOnlineBrowser;

  const safeDisposeScanner = async (scanner: Html5Qrcode | null) => {
    if (!scanner) return;
    try {
      const state =
        typeof scanner.getState === 'function' ? scanner.getState() : null;
      // Html5QrcodeScannerState: 2 = SCANNING, 3 = PAUSED
      if (scanner.isScanning || state === 2 || state === 3) {
        await scanner.stop();
      }
    } catch {
      // ignore synchronous or async stop error when scanner is not running
    }
    try {
      scanner.clear();
    } catch {
      // ignore DOM cleanup errors
    }
  };

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      if (cameraTimerRef.current !== null) {
        window.clearTimeout(cameraTimerRef.current);
        cameraTimerRef.current = null;
      }
      const activeScanner = cameraScannerRef.current;
      cameraScannerRef.current = null;
      void safeDisposeScanner(activeScanner);
    };
  }, []);

  const visibleLearners = useMemo(
    () =>
      learners.filter(
        (l) => programFilter === 'Semua' || l.program === programFilter
      ),
    [learners, programFilter]
  );

  const recordsByLearner = useMemo(() => {
    const map = new Map<string, AttendanceRecord>();
    for (const rec of attendance) {
      if (rec.tanggal === selectedDate) {
        map.set(rec.learnerId, rec);
      }
    }
    return map;
  }, [attendance, selectedDate]);

  const pendingLeaves = useMemo(
    () => leaveRequests.filter((lr) => lr.status === 'Menunggu'),
    [leaveRequests]
  );

  const dailySummary = useMemo(() => {
    let hadir = 0;
    let izin = 0;
    let sakit = 0;
    let alfa = 0;
    let belum = 0;

    for (const l of visibleLearners) {
      const rec = recordsByLearner.get(l.id);
      if (!rec) belum++;
      else if (rec.status === 'Hadir') hadir++;
      else if (rec.status === 'Izin') izin++;
      else if (rec.status === 'Sakit') sakit++;
      else if (rec.status === 'Alfa') alfa++;
    }
    return { hadir, izin, sakit, alfa, belum };
  }, [visibleLearners, recordsByLearner]);

  const handleSetStatus = (
    learnerId: string,
    status: AttendanceStatus,
    catatan = '',
    sumber: AttendanceRecord['sumber'] = 'Manual'
  ) => {
    const existing = recordsByLearner.get(learnerId);
    const now = new Date();
    const waktu = `${String(now.getHours()).padStart(2, '0')}:${String(
      now.getMinutes()
    ).padStart(2, '0')}`;

    onUpsertAttendance(
      {
        id: existing?.id || `ABS-${selectedDate}-${learnerId}`,
        institutionId,
        tanggal: selectedDate,
        learnerId,
        status,
        modePembelajaran: existing?.modePembelajaran || selectedMode,
        waktuCatat: existing?.waktuCatat || waktu,
        catatan: catatan !== '' ? catatan : existing?.catatan || '',
        sumber: effectivelyOffline ? 'QR Offline' : sumber,
        pendingSync: effectivelyOffline,
      },
      effectivelyOffline
    );
  };

  const handleNoteChange = (learnerId: string, catatan: string) => {
    const existing = recordsByLearner.get(learnerId);
    onUpsertAttendance(
      {
        id: existing?.id || `ABS-${selectedDate}-${learnerId}`,
        institutionId,
        tanggal: selectedDate,
        learnerId,
        status: existing?.status || 'Hadir',
        modePembelajaran: existing?.modePembelajaran || selectedMode,
        waktuCatat: existing?.waktuCatat || '08:00',
        catatan,
        sumber: existing?.sumber || 'Manual',
        pendingSync: effectivelyOffline,
      },
      effectivelyOffline
    );
  };

  const processQrDecodedValue = (
    raw: string,
    sumber: AttendanceRecord['sumber']
  ) => {
    let code = raw.trim();
    if (!code) return;

    try {
      if (code.startsWith('http')) {
        const u = new URL(code);
        code =
          u.searchParams.get('nisn') || u.searchParams.get('verify') || code;
      } else {
        const nisnMatch = code.match(/nisn=([^&\s]+)/);
        const verifyMatch = code.match(/verify=([^&\s]+)/);
        if (nisnMatch) code = nisnMatch[1];
        else if (verifyMatch) code = verifyMatch[1];
      }
    } catch {
      // ignore URL parse error
    }

    const found = learners.find(
      (l) =>
        l.id.toLowerCase() === code.toLowerCase() ||
        l.nisn.toLowerCase() === code.toLowerCase()
    );
    if (!found) {
      setQrFeedback({
        type: 'error',
        text: `Kode QR "${code}" tidak cocok dengan warga belajar lembaga aktif.`,
      });
      return;
    }

    handleSetStatus(
      found.id,
      scanStatusChoice,
      effectivelyOffline
        ? `Presensi ${sumber} Offline (${selectedMode}) — tersimpan di IndexedDB`
        : `Presensi ${sumber} (${selectedMode})`,
      sumber
    );
    setQrFeedback({
      type: 'success',
      text: effectivelyOffline
        ? `Tersimpan Offline (IndexedDB): ${found.nama} (${scanStatusChoice})`
        : `Berhasil dicatat ${scanStatusChoice}: ${found.nama} (NISN ${found.nisn})`,
    });
    setQrInput('');
  };

  const startLiveCamera = async () => {
    if (cameraActive) {
      await stopLiveCamera();
      return;
    }
    setQrFeedback(null);
    setCameraActive(true);

    if (cameraTimerRef.current !== null) {
      window.clearTimeout(cameraTimerRef.current);
    }

    cameraTimerRef.current = window.setTimeout(async () => {
      cameraTimerRef.current = null;
      if (!isMountedRef.current) return;
      const readerEl = document.getElementById('pkbm-qr-live-reader');
      if (!readerEl) {
        if (isMountedRef.current) setCameraActive(false);
        return;
      }

      const scanner = new Html5Qrcode('pkbm-qr-live-reader');
      try {
        await scanner.start(
          { facingMode: 'environment' },
          { fps: 10, qrbox: { width: 220, height: 220 } },
          (decodedText) => {
            processQrDecodedValue(decodedText, 'QR Live');
            void stopLiveCamera();
          },
          () => {
            // frame scan retry silently
          }
        );

        if (!isMountedRef.current) {
          await safeDisposeScanner(scanner);
          return;
        }
        cameraScannerRef.current = scanner;
      } catch (err) {
        await safeDisposeScanner(scanner);
        cameraScannerRef.current = null;
        if (isMountedRef.current) {
          setCameraActive(false);
          setQrFeedback({
            type: 'error',
            text:
              err instanceof Error
                ? `Kamera tidak dapat diakses: ${err.message}. Gunakan upload Foto atau PDF Kartu QR.`
                : 'Kamera tidak tersedia pada perangkat/iframe ini.',
          });
        }
      }
    }, 80);
  };

  const stopLiveCamera = async () => {
    if (cameraTimerRef.current !== null) {
      window.clearTimeout(cameraTimerRef.current);
      cameraTimerRef.current = null;
    }
    const scanner = cameraScannerRef.current;
    cameraScannerRef.current = null;
    await safeDisposeScanner(scanner);
    if (isMountedRef.current) {
      setCameraActive(false);
    }
  };

  const handleScanImageFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setScanningFile(true);
    setQrFeedback(null);
    const fileScanner = new Html5Qrcode('pkbm-qr-file-helper');
    try {
      const decoded = await fileScanner.scanFile(file, true);
      processQrDecodedValue(decoded, 'QR Foto/PDF');
    } catch {
      setQrFeedback({
        type: 'error',
        text: 'QR Code tidak terbaca pada foto kartu. Pastikan gambar jelas & tidak terpotong.',
      });
    } finally {
      try {
        fileScanner.clear();
      } catch {
        // ignore cleanup error
      }
      setScanningFile(false);
    }
  };

  const handleScanPdfFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setScanningFile(true);
    setQrFeedback(null);
    try {
      const arrayBuffer = await file.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      let foundDecoded: string | null = null;
      const totalPages = Math.min(pdf.numPages, 3);

      for (let pageNo = 1; pageNo <= totalPages; pageNo++) {
        const page = await pdf.getPage(pageNo);
        const viewport = page.getViewport({ scale: 2.2 });
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) continue;
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        await page.render({ canvas, canvasContext: ctx, viewport }).promise;

        const blob: Blob | null = await new Promise((resolve) =>
          canvas.toBlob((b) => resolve(b), 'image/png')
        );
        if (!blob) continue;
        const imgFile = new File([blob], `card_p${pageNo}.png`, {
          type: 'image/png',
        });
        const fileScanner = new Html5Qrcode('pkbm-qr-file-helper');
        try {
          foundDecoded = await fileScanner.scanFile(imgFile, false);
          fileScanner.clear();
          if (foundDecoded) break;
        } catch {
          fileScanner.clear();
        }
      }

      if (foundDecoded) {
        processQrDecodedValue(foundDecoded, 'QR Foto/PDF');
      } else {
        setQrFeedback({
          type: 'error',
          text: 'QR Code tidak ditemukan pada dokumen PDF kartu KTWB yang diunggah.',
        });
      }
    } catch (err) {
      setQrFeedback({
        type: 'error',
        text:
          err instanceof Error
            ? `Gagal memindai PDF: ${err.message}`
            : 'Gagal memproses file PDF.',
      });
    } finally {
      setScanningFile(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Hidden DOM container required by Html5Qrcode file scanner */}
      <div id="pkbm-qr-file-helper" className="hidden" />

      {/* Header + Offline-First Controls */}
      <div className="flex flex-col gap-4 border-b border-slate-200 pb-5 dark:border-slate-800 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
            Scan Kamera Live, Foto/PDF Kartu KTWB, Input NISN Manual & Antrean Offline IndexedDB
          </p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
            Presensi QR & Absensi Harian
          </h1>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={onToggleOfflineSim}
            className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-medium transition-colors whitespace-nowrap ${
              effectivelyOffline
                ? 'border-amber-300 bg-amber-50 text-amber-900 dark:border-amber-700 dark:bg-amber-950/50 dark:text-amber-200'
                : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200'
            }`}
          >
            {effectivelyOffline ? (
              <>
                <WifiOff className="h-3.5 w-3.5 text-amber-600" />
                <span>Mode Offline (IndexedDB)</span>
              </>
            ) : (
              <>
                <Wifi className="h-3.5 w-3.5 text-emerald-600" />
                <span>Online · Uji Mode Offline</span>
              </>
            )}
          </button>

          {pendingOfflineCount > 0 && (
            <button
              type="button"
              disabled={effectivelyOffline}
              onClick={onSyncOfflineQueue}
              className="inline-flex items-center gap-1.5 rounded-lg bg-amber-600 px-3.5 py-2 text-xs font-medium text-white hover:bg-amber-700 disabled:opacity-50 whitespace-nowrap"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              <span>Sinkron Offline ({pendingOfflineCount})</span>
            </button>
          )}

          <button
            type="button"
            onClick={() =>
              onBulkMarkPresent(
                selectedDate,
                visibleLearners.map((l) => l.id),
                selectedMode
              )
            }
            className="inline-flex items-center gap-1.5 rounded-lg bg-blue-700 px-3.5 py-2 text-xs font-semibold text-white hover:bg-blue-800 whitespace-nowrap"
          >
            <CheckCheck className="h-4 w-4" />
            <span>Tandai Semua Hadir</span>
          </button>
        </div>
      </div>

      {/* Offline Queue Banner */}
      {(effectivelyOffline || pendingOfflineCount > 0) && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-900 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-200">
          <div className="flex items-center gap-2">
            <CloudOff className="h-4 w-4 shrink-0 text-amber-700 dark:text-amber-400" />
            <span>
              {effectivelyOffline
                ? 'Mode offline aktif: seluruh pemindaian QR disimpan di IndexedDB lokal dan otomatis tersinkron saat internet kembali tersedia.'
                : `${pendingOfflineCount} data presensi dari IndexedDB offline siap disinkronkan.`}
            </span>
          </div>
          {!effectivelyOffline && pendingOfflineCount > 0 && (
            <button
              type="button"
              onClick={onSyncOfflineQueue}
              className="font-bold underline"
            >
              Sinkron Sekarang
            </button>
          )}
        </div>
      )}

      {/* Pending Leave Requests */}
      {pendingLeaves.length > 0 && (
        <div className="rounded-xl border border-blue-200 bg-blue-50/50 p-4 dark:border-blue-900 dark:bg-blue-950/30">
          <h2 className="text-xs font-bold text-blue-950 dark:text-blue-200">
            Pengajuan Izin Mandiri Warga Belajar ({pendingLeaves.length} Menunggu)
          </h2>
          <div className="mt-2.5 space-y-2">
            {pendingLeaves.map((lr) => (
              <div
                key={lr.id}
                className="flex flex-col justify-between gap-2 rounded-lg border border-blue-200 bg-white px-3.5 py-2.5 text-xs dark:border-blue-800 dark:bg-slate-900 sm:flex-row sm:items-center"
              >
                <div>
                  <span className="font-semibold text-slate-900 dark:text-slate-100">
                    {lr.learnerNama}
                  </span>{' '}
                  · <span className="font-mono">{lr.tanggal}</span> ·{' '}
                  <span className="font-semibold text-blue-700 dark:text-blue-400">
                    {lr.jenis}
                  </span>
                  <p className="mt-0.5 text-slate-600 dark:text-slate-400">
                    {lr.alasan}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => onResolveLeaveRequest(lr.id, true)}
                    className="rounded-md bg-emerald-700 px-3 py-1.5 font-medium text-white hover:bg-emerald-800"
                  >
                    Setujui
                  </button>
                  <button
                    type="button"
                    onClick={() => onResolveLeaveRequest(lr.id, false)}
                    className="rounded-md border border-slate-200 bg-white px-3 py-1.5 font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                  >
                    Tolak
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Main 2-Column Layout: Scanner Card Left + Daily Attendance Table Right */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Left: QR Scanner Card */}
        <div className="space-y-4 rounded-xl border border-slate-200 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900 lg:col-span-5">
          <div className="flex items-center gap-2 border-b border-slate-200 pb-3 dark:border-slate-800">
            <QrCode className="h-4 w-4 text-blue-700 dark:text-blue-400" />
            <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
              Scanner QR & Catat Presensi
            </h2>
          </div>

          <div className="grid grid-cols-2 gap-3 text-xs">
            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300">
                Tanggal Pertemuan
              </label>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-2.5 py-2 font-mono dark:border-slate-700 dark:bg-slate-950"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300">
                Jalur SKK
              </label>
              <select
                value={selectedMode}
                onChange={(e) => setSelectedMode(e.target.value as LearningMode)}
                className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-2.5 py-2 dark:border-slate-700 dark:bg-slate-950"
              >
                {LEARNING_MODES.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="text-xs">
            <label className="block font-semibold text-slate-700 dark:text-slate-300">
              Status Saat Pindai QR
            </label>
            <div className="mt-1 grid grid-cols-4 gap-1.5">
              {STATUS_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setScanStatusChoice(opt.value)}
                  className={`rounded-lg border py-1.5 text-center font-semibold transition-colors ${
                    scanStatusChoice === opt.value
                      ? opt.activeClass
                      : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-300'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* NISN / ID Manual / Hardware Scanner Input */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              processQrDecodedValue(qrInput, 'Manual');
            }}
            className="space-y-2"
          >
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
              Pindai Barcode / Ketik NISN atau ID WB
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={qrInput}
                onChange={(e) => setQrInput(e.target.value)}
                placeholder="Contoh: 0084512901 atau WB-2026-001"
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 font-mono text-xs focus:border-blue-600 focus:outline-none dark:border-slate-700 dark:bg-slate-950"
              />
              <button
                type="submit"
                className="rounded-lg bg-slate-900 px-3.5 py-2 text-xs font-bold text-white hover:bg-slate-800 dark:bg-blue-700 dark:hover:bg-blue-800 whitespace-nowrap"
              >
                Catat
              </button>
            </div>
          </form>

          {/* 3 QR Hardware/File Scan Modes */}
          <div className="grid grid-cols-3 gap-2 pt-1 text-xs">
            <button
              type="button"
              onClick={startLiveCamera}
              className={`inline-flex items-center justify-center gap-1.5 rounded-lg border px-2.5 py-2 font-semibold transition-colors ${
                cameraActive
                  ? 'border-red-600 bg-red-600 text-white'
                  : 'border-blue-700 bg-blue-50 text-blue-800 hover:bg-blue-100 dark:border-blue-800 dark:bg-blue-950/60 dark:text-blue-300'
              }`}
            >
              {cameraActive ? (
                <>
                  <Square className="h-3.5 w-3.5" />
                  <span>Stop Kamera</span>
                </>
              ) : (
                <>
                  <Camera className="h-3.5 w-3.5" />
                  <span>Kamera Live</span>
                </>
              )}
            </button>

            <label className="inline-flex cursor-pointer items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-2 font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200">
              <ImageIcon className="h-3.5 w-3.5 text-emerald-700 dark:text-emerald-400" />
              <span>Foto QR</span>
              <input
                type="file"
                accept="image/*"
                onChange={handleScanImageFile}
                className="hidden"
                disabled={scanningFile}
              />
            </label>

            <label className="inline-flex cursor-pointer items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-2 font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200">
              <FileUp className="h-3.5 w-3.5 text-amber-600" />
              <span>PDF Kartu</span>
              <input
                type="file"
                accept="application/pdf"
                onChange={handleScanPdfFile}
                className="hidden"
                disabled={scanningFile}
              />
            </label>
          </div>

          {cameraActive && (
            <div className="overflow-hidden rounded-lg border border-slate-200 bg-slate-950 p-2 dark:border-slate-700">
              <div id="pkbm-qr-live-reader" className="w-full" />
            </div>
          )}

          {scanningFile && (
            <p className="text-xs font-medium text-blue-700 dark:text-blue-400">
              Memindai kode QR pada berkas...
            </p>
          )}

          {qrFeedback && (
            <div
              className={`rounded-lg border px-3 py-2 text-xs font-medium ${
                qrFeedback.type === 'success'
                  ? 'border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/50 dark:text-emerald-300'
                  : 'border-red-200 bg-red-50 text-red-700 dark:border-red-900 dark:bg-red-950/50 dark:text-red-300'
              }`}
            >
              {qrFeedback.text}
            </div>
          )}
        </div>

        {/* Right: Daily Attendance Table & KPI */}
        <div className="space-y-4 lg:col-span-7">
          <div className="grid grid-cols-5 gap-2">
            <div className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 dark:border-slate-800 dark:bg-slate-900">
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Hadir
              </p>
              <p className="font-mono text-lg font-bold text-emerald-700 tabular-nums dark:text-emerald-400">
                {dailySummary.hadir}
              </p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 dark:border-slate-800 dark:bg-slate-900">
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Izin
              </p>
              <p className="font-mono text-lg font-bold text-blue-700 tabular-nums dark:text-blue-400">
                {dailySummary.izin}
              </p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 dark:border-slate-800 dark:bg-slate-900">
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Sakit
              </p>
              <p className="font-mono text-lg font-bold text-amber-700 tabular-nums dark:text-amber-400">
                {dailySummary.sakit}
              </p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 dark:border-slate-800 dark:bg-slate-900">
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Alfa
              </p>
              <p className="font-mono text-lg font-bold text-red-700 tabular-nums dark:text-red-400">
                {dailySummary.alfa}
              </p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 dark:border-slate-800 dark:bg-slate-900">
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Belum
              </p>
              <p className="font-mono text-lg font-bold text-slate-700 tabular-nums dark:text-slate-300">
                {dailySummary.belum}
              </p>
            </div>
          </div>

          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xs dark:border-slate-800 dark:bg-slate-900">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 px-4 py-3 dark:border-slate-800">
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                Log Kehadiran Tanggal {selectedDate}
              </h3>
              <div className="flex flex-wrap gap-1 rounded-lg bg-slate-100 p-1 dark:bg-slate-800">
                {['Semua', 'Paket A', 'Paket B', 'Paket C', 'Kursus Vokasi'].map(
                  (prog) => (
                    <button
                      key={prog}
                      type="button"
                      onClick={() => setProgramFilter(prog)}
                      className={`rounded px-2 py-1 text-[11px] font-medium transition-colors whitespace-nowrap ${
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

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/70 font-semibold text-slate-600 dark:border-slate-800 dark:bg-slate-800/50 dark:text-slate-300">
                    <th className="px-4 py-2.5">Warga Belajar</th>
                    <th className="px-3 py-2.5">Status</th>
                    <th className="px-3 py-2.5">Waktu & Sumber</th>
                    <th className="px-4 py-2.5">Catatan</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                  {visibleLearners.map((learner) => {
                    const rec = recordsByLearner.get(learner.id);
                    return (
                      <tr
                        key={learner.id}
                        className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40"
                      >
                        <td className="px-4 py-2.5">
                          <div className="font-semibold text-slate-900 dark:text-slate-100">
                            {learner.nama}
                          </div>
                          <div className="font-mono text-[11px] text-slate-500 tabular-nums dark:text-slate-400">
                            {learner.nisn} · {learner.program} (
                            {learner.kelas || learner.rombel})
                          </div>
                        </td>
                        <td className="px-3 py-2.5">
                          <div className="inline-flex flex-wrap gap-1">
                            {STATUS_OPTIONS.map((opt) => {
                              const isActive = rec?.status === opt.value;
                              return (
                                <button
                                  key={opt.value}
                                  type="button"
                                  onClick={() =>
                                    handleSetStatus(learner.id, opt.value)
                                  }
                                  className={`inline-flex items-center gap-1 rounded border px-2 py-1 text-[11px] font-medium transition-colors whitespace-nowrap ${
                                    isActive
                                      ? opt.activeClass
                                      : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300'
                                  }`}
                                >
                                  {opt.value === 'Hadir' && (
                                    <Check className="h-3 w-3" />
                                  )}
                                  {opt.value === 'Izin' && (
                                    <CalendarCheck className="h-3 w-3" />
                                  )}
                                  {opt.value === 'Sakit' && (
                                    <AlertCircle className="h-3 w-3" />
                                  )}
                                  {opt.value === 'Alfa' && (
                                    <XCircle className="h-3 w-3" />
                                  )}
                                  <span>{opt.label}</span>
                                </button>
                              );
                            })}
                          </div>
                        </td>
                        <td className="px-3 py-2.5 font-mono tabular-nums">
                          {rec ? (
                            <div>
                              <span className="inline-flex items-center gap-1 text-slate-800 dark:text-slate-200">
                                <Clock className="h-3 w-3 text-slate-400" />
                                {rec.waktuCatat}
                              </span>
                              <div className="text-[10px] text-slate-500 dark:text-slate-400">
                                {rec.pendingSync
                                  ? 'Antrean Offline'
                                  : rec.sumber || 'Manual'}
                              </div>
                            </div>
                          ) : (
                            '—'
                          )}
                        </td>
                        <td className="px-4 py-2.5">
                          <input
                            type="text"
                            value={rec?.catatan || ''}
                            onChange={(e) =>
                              handleNoteChange(learner.id, e.target.value)
                            }
                            placeholder="Catatan..."
                            className="w-full min-w-[120px] rounded border border-slate-200 bg-white px-2 py-1 text-[11px] text-slate-700 focus:border-blue-600 focus:outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200"
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
