import { useEffect, useRef } from 'react';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import { X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface ScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onScan: (decodedText: string) => void;
}

export default function ScannerModal({ isOpen, onClose, onScan }: ScannerModalProps) {
  const scannerRef = useRef<Html5Qrcode | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    const startScanner = async () => {
      try {
        // Berikan waktu sejenak agar element DOM siap
        await new Promise(resolve => setTimeout(resolve, 300));
        
        const html5QrCode = new Html5Qrcode("reader");
        scannerRef.current = html5QrCode;

        const config = { 
          fps: 20, 
          qrbox: (viewfinderWidth: number, viewfinderHeight: number) => {
            const width = viewfinderWidth * 0.85;
            const height = viewfinderHeight * 0.45;
            return { width, height };
          },
          aspectRatio: 1.0,
          formatsToSupport: [ 
            Html5QrcodeSupportedFormats.QR_CODE, 
            Html5QrcodeSupportedFormats.CODE_128,
            Html5QrcodeSupportedFormats.CODE_39,
            Html5QrcodeSupportedFormats.EAN_13,
            Html5QrcodeSupportedFormats.UPC_A,
            Html5QrcodeSupportedFormats.ITF
          ],
          showTorchButtonIfSupported: true, // Tambahkan tombol lampu jika didukung
        };

        await html5QrCode.start(
          { facingMode: "environment" }, 
          config,
          (decodedText) => {
            if (decodedText) {
              onScan(decodedText);
              stopScanner();
              onClose();
            }
          },
          () => {} // Abaikan kegagalan scan per frame
        );
      } catch (err) {
        console.error("Gagal menyalakan kamera:", err);
      }
    };

    const stopScanner = async () => {
      if (scannerRef.current && scannerRef.current.isScanning) {
        try {
          await scannerRef.current.stop();
          scannerRef.current = null;
        } catch (err) {
          console.error("Gagal menghentikan kamera:", err);
        }
      }
    };

    startScanner();

    return () => {
      stopScanner();
    };
  }, [isOpen, onScan, onClose]);

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center px-4">
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-slate-900/90 backdrop-blur-md"
          />
          <motion.div 
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="relative w-full max-w-md rounded-[40px] overflow-hidden bg-white dark:bg-slate-800 shadow-2xl border dark:border-slate-700"
          >
            <div className="p-6 border-b dark:border-slate-700 flex items-center justify-between">
              <h3 className="text-xl font-bold font-display flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                Scanning Active
              </h3>
              <button 
                onClick={onClose}
                className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-full transition-all text-slate-500"
              >
                <X size={24} />
              </button>
            </div>
            
            <div className="p-6">
              {/* Container for Video */}
              <div className="relative aspect-square overflow-hidden rounded-[32px] border-4 border-jt-red shadow-inner bg-slate-900">
                <div id="reader" className="w-full h-full object-cover"></div>
                
                {/* Custom Overlay */}
                <div className="absolute inset-0 border-[40px] border-black/40 pointer-events-none">
                   <div className="w-full h-full border-2 border-white/50 relative">
                      {/* Corner Accents */}
                      <div className="absolute -top-1 -left-1 w-6 h-6 border-t-4 border-l-4 border-jt-red"></div>
                      <div className="absolute -top-1 -right-1 w-6 h-6 border-t-4 border-r-4 border-jt-red"></div>
                      <div className="absolute -bottom-1 -left-1 w-6 h-6 border-b-4 border-l-4 border-jt-red"></div>
                      <div className="absolute -bottom-1 -right-1 w-6 h-6 border-b-4 border-r-4 border-jt-red"></div>
                   </div>
                </div>

                <div className="absolute top-1/2 left-0 w-full h-[2px] bg-jt-red/50 shadow-[0_0_15px_rgba(227,30,36,0.8)] animate-[scan_2s_ease-in-out_infinite]" />
              </div>
              
              <div className="mt-6 p-5 rounded-3xl bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-700 text-sm text-center">
                <p className="opacity-70 font-medium leading-relaxed">
                  Posisikan barcode di dalam kotak merah.<br/>
                  Pastikan pencahayaan cukup terang.
                </p>
              </div>
            </div>
            
            <style>{`
              @keyframes scan {
                0%, 100% { top: 10%; }
                50% { top: 90%; }
              }
              #reader video {
                object-fit: cover !important;
                width: 100% !important;
                height: 100% !important;
              }
            `}</style>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
