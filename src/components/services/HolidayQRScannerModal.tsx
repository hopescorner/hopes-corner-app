'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import {
    QrCode,
    Camera,
    X,
    AlertCircle,
    CheckCircle2,
    RotateCcw,
    Sparkles,
    UserCheck,
    Keyboard,
} from 'lucide-react';
import jsQR from 'jsqr';
import { HolidayRegistration } from '@/types/holiday';
import toast from 'react-hot-toast';

interface HolidayQRScannerModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSelectRegistration: (reg: HolidayRegistration) => void;
    onFastCheckIn?: (reg: HolidayRegistration) => Promise<boolean>;
}

export function HolidayQRScannerModal({
    isOpen,
    onClose,
    onSelectRegistration,
    onFastCheckIn,
}: HolidayQRScannerModalProps) {
    const videoRef = useRef<HTMLVideoElement | null>(null);
    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const animationFrameRef = useRef<number | null>(null);

    const [hasCamera, setHasCamera] = useState<boolean>(true);
    const [cameraError, setCameraError] = useState<string | null>(null);
    const [isScanning, setIsScanning] = useState<boolean>(true);
    const [manualCode, setManualCode] = useState<string>('');
    const [isVerifying, setIsVerifying] = useState<boolean>(false);
    const [scannedResult, setScannedResult] = useState<HolidayRegistration | null>(null);
    const [verificationError, setVerificationError] = useState<string | null>(null);
    const [fastCheckInMode, setFastCheckInMode] = useState<boolean>(false);

    const playSuccessChime = () => {
        try {
            const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
            osc.frequency.setValueAtTime(880, ctx.currentTime + 0.08); // A5
            gain.gain.setValueAtTime(0.15, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25);
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start();
            osc.stop(ctx.currentTime + 0.25);
            navigator.vibrate?.([60, 40, 60]);
        } catch {
            // AudioContext not supported
        }
    };

    const handleVerifyToken = useCallback(
        async (token: string) => {
            if (!token.trim()) return;
            setIsVerifying(true);
            setVerificationError(null);

            try {
                const res = await fetch('/api/holiday/staff/scan-ticket', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ token: token.trim() }),
                });

                const data = await res.json();

                if (!res.ok || !data.success) {
                    setVerificationError(data.error || 'Invalid or tampered ticket QR code');
                    toast.error(data.error || 'Invalid ticket QR code');
                    setIsVerifying(false);
                    return;
                }

                playSuccessChime();
                const reg: HolidayRegistration = data.registration;
                setScannedResult(reg);

                if (fastCheckInMode && onFastCheckIn && reg.status !== 'checked_in') {
                    const success = await onFastCheckIn(reg);
                    if (success) {
                        toast.success(`Fast checked-in Ticket #${reg.ticketNumber} (${reg.parentName})`);
                    }
                }
            } catch (err) {
                console.error('QR verification error:', err);
                setVerificationError('Network error while verifying ticket');
            } finally {
                setIsVerifying(false);
            }
        },
        [fastCheckInMode, onFastCheckIn]
    );

    const stopCamera = useCallback(() => {
        if (animationFrameRef.current) {
            cancelAnimationFrame(animationFrameRef.current);
            animationFrameRef.current = null;
        }
        if (streamRef.current) {
            streamRef.current.getTracks().forEach((track) => track.stop());
            streamRef.current = null;
        }
    }, []);

    const startCamera = useCallback(async () => {
        setCameraError(null);
        setIsScanning(true);
        setScannedResult(null);
        setVerificationError(null);

        if (!navigator.mediaDevices?.getUserMedia) {
            setHasCamera(false);
            setCameraError('Camera access not supported on this browser/device.');
            return;
        }

        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: {
                    facingMode: { ideal: 'environment' },
                    width: { ideal: 1280 },
                    height: { ideal: 720 },
                },
            });

            streamRef.current = stream;
            if (videoRef.current) {
                videoRef.current.srcObject = stream;
                await videoRef.current.play();
            }

            const scanFrame = async () => {
                if (!videoRef.current || !canvasRef.current) return;

                if (videoRef.current.readyState === videoRef.current.HAVE_ENOUGH_DATA) {
                    const canvas = canvasRef.current;
                    const ctx = canvas.getContext('2d', { willReadFrequently: true });
                    const video = videoRef.current;

                    canvas.width = video.videoWidth;
                    canvas.height = video.videoHeight;

                    if (ctx) {
                        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

                        let decodedText: string | null = null;

                        // Try native BarcodeDetector if available
                        if ('BarcodeDetector' in window) {
                            try {
                                const detector = new (window as any).BarcodeDetector({
                                    formats: ['qr_code'],
                                });
                                const barcodes = await detector.detect(canvas);
                                if (barcodes.length > 0 && barcodes[0].rawValue) {
                                    decodedText = barcodes[0].rawValue;
                                }
                            } catch {
                                // Fallback to jsQR
                            }
                        }

                        // Fallback to jsQR
                        if (!decodedText) {
                            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
                            const code = jsQR(imageData.data, imageData.width, imageData.height, {
                                inversionAttempts: 'dontInvert',
                            });
                            if (code && code.data) {
                                decodedText = code.data;
                            }
                        }

                        if (decodedText && decodedText.startsWith('HCT1.')) {
                            setIsScanning(false);
                            stopCamera();
                            void handleVerifyToken(decodedText);
                            return;
                        }
                    }
                }

                animationFrameRef.current = requestAnimationFrame(scanFrame);
            };

            animationFrameRef.current = requestAnimationFrame(scanFrame);
        } catch (err: any) {
            console.error('Camera startup error:', err);
            setHasCamera(false);
            setCameraError(
                err?.name === 'NotAllowedError'
                    ? 'Camera permission denied. Please allow camera access in browser settings.'
                    : 'Unable to start camera. You can use a USB barcode scanner or paste the token below.'
            );
        }
    }, [handleVerifyToken, stopCamera]);

    useEffect(() => {
        if (isOpen) {
            void startCamera();
        } else {
            stopCamera();
            setScannedResult(null);
            setVerificationError(null);
            setManualCode('');
        }
        return () => {
            stopCamera();
        };
    }, [isOpen, startCamera, stopCamera]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-xs">
            <div className="relative w-full max-w-lg overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
                {/* Header */}
                <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-5 py-4">
                    <div className="flex items-center gap-2.5">
                        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-100 text-emerald-800">
                            <QrCode className="h-5 w-5" />
                        </div>
                        <div>
                            <h3 className="text-base font-bold text-slate-900">Scan Ticket QR Code</h3>
                            <p className="text-xs text-slate-500">Fast check-in for holiday distribution</p>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-200 hover:text-slate-700"
                        title="Close Scanner"
                    >
                        <X className="h-5 w-5" />
                    </button>
                </div>

                <div className="p-5 space-y-4">
                    {/* Viewfinder / Camera Screen */}
                    {!scannedResult && (
                        <div className="relative overflow-hidden rounded-xl border border-slate-800 bg-slate-950 aspect-4/3 flex items-center justify-center">
                            {hasCamera && !cameraError ? (
                                <>
                                    <video
                                        ref={videoRef}
                                        playsInline
                                        autoPlay
                                        muted
                                        className="h-full w-full object-cover"
                                    />
                                    <canvas ref={canvasRef} className="hidden" />

                                    {/* Viewfinder Reticle Overlay */}
                                    <div className="pointer-events-none absolute inset-0 flex items-center justify-center p-8">
                                        <div className="relative h-48 w-48 rounded-2xl border-2 border-emerald-400 bg-emerald-400/10 shadow-inner">
                                            <div className="absolute top-0 left-0 h-4 w-4 border-t-4 border-l-4 border-emerald-400 -mt-1 -ml-1 rounded-tl" />
                                            <div className="absolute top-0 right-0 h-4 w-4 border-t-4 border-r-4 border-emerald-400 -mt-1 -mr-1 rounded-tr" />
                                            <div className="absolute bottom-0 left-0 h-4 w-4 border-b-4 border-l-4 border-emerald-400 -mb-1 -ml-1 rounded-bl" />
                                            <div className="absolute bottom-0 right-0 h-4 w-4 border-b-4 border-r-4 border-emerald-400 -mb-1 -mr-1 rounded-br" />
                                        </div>
                                    </div>
                                    <div className="absolute bottom-3 left-1/2 -translate-x-1/2 rounded-full bg-slate-900/80 px-3 py-1 text-center text-xs font-semibold text-emerald-300 backdrop-blur-xs">
                                        Align QR code inside box
                                    </div>
                                </>
                            ) : (
                                <div className="p-6 text-center space-y-2 text-slate-300">
                                    <Camera className="h-10 w-10 text-slate-500 mx-auto" />
                                    <p className="text-xs text-rose-400 font-medium">{cameraError}</p>
                                    <p className="text-xs text-slate-400">
                                        You can use a physical USB 2D scanner or paste the ticket token below.
                                    </p>
                                </div>
                            )}

                            {isVerifying && (
                                <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950/80 text-white backdrop-blur-xs space-y-2">
                                    <div className="h-8 w-8 animate-spin rounded-full border-3 border-emerald-400 border-t-transparent" />
                                    <span className="text-xs font-bold uppercase tracking-wider text-emerald-300">
                                        Verifying Signature...
                                    </span>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Verification Error Banner */}
                    {verificationError && (
                        <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-rose-800 text-sm space-y-2">
                            <div className="flex items-center gap-2 font-bold text-rose-900">
                                <AlertCircle className="h-5 w-5 text-rose-600 shrink-0" />
                                <span>Security Warning: Ticket Verification Failed</span>
                            </div>
                            <p className="text-xs">{verificationError}</p>
                            <button
                                type="button"
                                onClick={() => void startCamera()}
                                className="inline-flex items-center gap-1.5 rounded-lg bg-rose-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-rose-700"
                            >
                                <RotateCcw className="h-3.5 w-3.5" />
                                <span>Scan Another Code</span>
                            </button>
                        </div>
                    )}

                    {/* Verified Result Card */}
                    {scannedResult && (
                        <div className="space-y-4 rounded-xl border border-emerald-200 bg-emerald-50/70 p-5">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2 text-emerald-800 font-bold text-sm">
                                    <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
                                    <span>Verified Official Ticket</span>
                                </div>
                                <span
                                    className={`rounded-md px-2 py-0.5 text-xs font-bold uppercase tracking-wider ${scannedResult.status === 'checked_in'
                                        ? 'bg-purple-100 text-purple-800'
                                        : 'bg-emerald-200 text-emerald-900'
                                        }`}
                                >
                                    {scannedResult.status === 'checked_in' ? 'Already Checked In' : 'Ready for Check-In'}
                                </span>
                            </div>

                            <div className="rounded-lg border border-slate-200 bg-white p-4 space-y-3">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Ticket #</span>
                                        <div className="text-2xl font-black text-slate-900">#{scannedResult.ticketNumber}</div>
                                    </div>
                                    <div className="text-right">
                                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Assigned Slot</span>
                                        <div className="text-xs font-bold text-emerald-800">{scannedResult.timeSlot}</div>
                                    </div>
                                </div>

                                <div className="border-t border-slate-100 pt-2 grid grid-cols-2 gap-2 text-xs">
                                    <div>
                                        <span className="text-slate-400 block">Parent / Guardian:</span>
                                        <span className="font-semibold text-slate-800">{scannedResult.parentName}</span>
                                    </div>
                                    <div>
                                        <span className="text-slate-400 block">City &amp; Phone:</span>
                                        <span className="font-semibold text-slate-800">
                                            {scannedResult.city} ({scannedResult.phone})
                                        </span>
                                    </div>
                                    <div>
                                        <span className="text-slate-400 block">Children Count:</span>
                                        <span className="font-semibold text-slate-800">
                                            {scannedResult.children?.length || 0} Registered
                                        </span>
                                    </div>
                                    <div>
                                        <span className="text-slate-400 block">Card Allocation:</span>
                                        <span className="font-semibold text-slate-800">
                                            {scannedResult.groceryCards} Grocery, {scannedResult.teenCards} Teen
                                        </span>
                                    </div>
                                </div>
                            </div>

                            <div className="flex flex-col sm:flex-row gap-2 pt-1">
                                <button
                                    type="button"
                                    onClick={() => {
                                        onSelectRegistration(scannedResult);
                                        onClose();
                                    }}
                                    className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-700 px-4 py-3 text-sm font-bold text-white shadow-sm hover:bg-emerald-800"
                                >
                                    <UserCheck className="h-4 w-4" />
                                    <span>
                                        {scannedResult.status === 'checked_in'
                                            ? 'View / Edit Check-In'
                                            : 'Complete Check-In'}
                                    </span>
                                </button>
                                <button
                                    type="button"
                                    onClick={() => void startCamera()}
                                    className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                                >
                                    <RotateCcw className="h-4 w-4" />
                                    <span>Scan Next</span>
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Manual Code / USB Barcode Scanner Input */}
                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-3.5 space-y-2">
                        <div className="flex items-center justify-between text-xs font-semibold text-slate-700">
                            <span className="flex items-center gap-1.5">
                                <Keyboard className="h-3.5 w-3.5 text-slate-500" />
                                <span>USB Barcode Scanner / Manual Token</span>
                            </span>
                            <label className="flex items-center gap-1.5 text-slate-600 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={fastCheckInMode}
                                    onChange={(e) => setFastCheckInMode(e.target.checked)}
                                    className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                                />
                                <span className="text-[11px]">Auto Check-In</span>
                            </label>
                        </div>
                        <form
                            onSubmit={(e) => {
                                e.preventDefault();
                                void handleVerifyToken(manualCode);
                            }}
                            className="flex gap-2"
                        >
                            <input
                                type="text"
                                value={manualCode}
                                onChange={(e) => setManualCode(e.target.value)}
                                placeholder="Scan with USB reader or paste token..."
                                className="flex-1 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 placeholder-slate-400 focus:border-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-600/20"
                            />
                            <button
                                type="submit"
                                disabled={!manualCode.trim() || isVerifying}
                                className="rounded-lg bg-slate-900 px-3.5 py-2 text-xs font-bold text-white hover:bg-slate-800 disabled:opacity-50"
                            >
                                Verify
                            </button>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    );
}
