'use client';

import { useEffect, useId, useRef, useState } from 'react';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import { motion } from 'framer-motion';
import { X, Camera as CameraIcon, AlertTriangle } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { useFocusTrap } from '@/hooks/useFocusTrap';

interface Props {
  onScan: (code: string) => void;
  onClose: () => void;
}

const SUPPORTED_FORMATS = [
  Html5QrcodeSupportedFormats.EAN_13,
  Html5QrcodeSupportedFormats.EAN_8,
  Html5QrcodeSupportedFormats.CODE_128,
  Html5QrcodeSupportedFormats.CODE_39,
  Html5QrcodeSupportedFormats.UPC_A,
  Html5QrcodeSupportedFormats.UPC_E,
  Html5QrcodeSupportedFormats.QR_CODE,
];

/** Camera-based scanner for devices without a USB/Bluetooth barcode scanner. */
export default function BarcodeScannerModal({ onScan, onClose }: Props) {
  const elementId = `barcode-scanner-${useId().replace(/:/g, '')}`;
  const modalRef = useRef<HTMLDivElement>(null);
  const handledRef = useRef(false);
  const [error, setError] = useState<string | null>(null);

  useFocusTrap(modalRef);

  useEffect(() => {
    let cancelled = false;
    const scanner = new Html5Qrcode(elementId, { formatsToSupport: SUPPORTED_FORMATS, verbose: false });

    // React 18 dev mode mounts effects twice (mount → cleanup → mount) to
    // surface exactly this kind of bug: start() is async, so a cleanup that
    // fires before it resolves must wait for it — calling stop() on a
    // scanner that hasn't finished starting throws "not running or paused".
    const startPromise = scanner
      .start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: 250 },
        (decodedText) => {
          // html5-qrcode keeps calling this every frame the same code is in
          // view — only act on the first hit, then hand off to the caller.
          if (handledRef.current || cancelled) return;
          handledRef.current = true;
          onScan(decodedText);
        },
        () => { /* "no code in this frame" fires constantly — expected, ignore */ }
      )
      .catch((err) => {
        if (cancelled) return;
        setError(
          err?.name === 'NotAllowedError'
            ? 'Camera access was denied. Allow camera access in your browser settings to scan.'
            : "Could not start the camera. Make sure this device has one and it isn't in use elsewhere."
        );
      });

    return () => {
      cancelled = true;
      startPromise.finally(() => {
        // Best-effort teardown: isScanning can still race the library's own
        // internal state right after a React 18 dev-mode double-invoke, so
        // either branch can throw synchronously — that's fine, there's
        // nothing meaningful left to clean up if it does.
        try {
          if (scanner.isScanning) {
            scanner.stop().then(() => scanner.clear()).catch(() => {});
          } else {
            scanner.clear();
          }
        } catch {
          // already stopped/cleared by the other half of the double-invoke
        }
      });
    };
  }, [elementId, onScan]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <motion.div ref={modalRef} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }} className="relative z-10 w-full max-w-sm">
        <Card className="shadow-2xl overflow-hidden">
          <div className="px-4 py-3 border-b flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CameraIcon className="h-4 w-4 text-primary" />
              <h2 className="font-display font-bold text-sm">Scan Barcode</h2>
            </div>
            <button onClick={onClose} className="text-muted-foreground hover:text-foreground"><X className="h-4 w-4" /></button>
          </div>
          <div className="p-4">
            {error ? (
              <div className="flex flex-col items-center gap-2 text-center py-8 text-sm text-muted-foreground">
                <AlertTriangle className="h-6 w-6 text-destructive flex-shrink-0" />
                <p>{error}</p>
              </div>
            ) : (
              <div id={elementId} className="rounded-lg overflow-hidden bg-black min-h-[240px] [&_video]:w-full [&_video]:rounded-lg" />
            )}
            <p className="text-xs text-muted-foreground text-center mt-3">Point the camera at a barcode</p>
          </div>
        </Card>
      </motion.div>
    </div>
  );
}
