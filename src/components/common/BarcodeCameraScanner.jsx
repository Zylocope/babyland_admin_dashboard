import { IconAlertCircle, IconCamera, IconLoader2, IconRefresh } from '@tabler/icons-react';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import Modal from './Modal';

const FORMATS = ['ean_13', 'ean_8', 'upc_a', 'upc_e', 'code_128', 'code_39', 'codabar', 'itf'];

const cameraErrorKey = (error) => {
  if (error?.name === 'NotAllowedError' || error?.name === 'SecurityError') return 'denied';
  if (error?.name === 'NotFoundError' || error?.name === 'OverconstrainedError') return 'notFound';
  if (error?.name === 'NotReadableError') return 'busy';
  return 'failed';
};

export default function BarcodeCameraScanner({ open, onClose, onDetected }) {
  const { t } = useTranslation();
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const controlsRef = useRef(null);
  const frameRef = useRef(0);
  const detectedRef = useRef(false);
  const onDetectedRef = useRef(onDetected);
  const onCloseRef = useRef(onClose);
  const [status, setStatus] = useState('starting');
  const [attempt, setAttempt] = useState(0);

  useEffect(() => { onDetectedRef.current = onDetected; }, [onDetected]);
  useEffect(() => { onCloseRef.current = onClose; }, [onClose]);

  useEffect(() => {
    if (!open) return undefined;

    let cancelled = false;
    let detecting = false;
    let lastCheck = 0;
    detectedRef.current = false;

    const stop = () => {
      cancelAnimationFrame(frameRef.current);
      controlsRef.current?.stop();
      controlsRef.current = null;
      streamRef.current?.getTracks().forEach(track => track.stop());
      streamRef.current = null;
      if (videoRef.current) videoRef.current.srcObject = null;
    };

    const start = async () => {
      if (!globalThis.isSecureContext || !navigator.mediaDevices?.getUserMedia) {
        setStatus('insecure');
        return;
      }
      try {
        const constraints = {
          audio: false,
          video: {
            facingMode: { ideal: 'environment' },
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
        };

        // Use the operating system's fast detector when it exists. Windows
        // does not currently expose it in Chrome, so ZXing is loaded only when
        // the camera opens there; it adds nothing to the normal page bundle.
        if (!globalThis.BarcodeDetector) {
          const { BrowserMultiFormatReader } = await import('@zxing/browser');
          const { DecodeHintType, BarcodeFormat } = await import('@zxing/library');
          if (cancelled) return;
          // Told what to look for and to work at it. Unhinted, ZXing tries every
          // symbology it knows on every frame and gives up early on a soft one —
          // which is exactly the frame a laptop webcam produces at close range.
          // TRY_HARDER costs CPU we have and buys reads we do not.
          const hints = new Map([
            [DecodeHintType.TRY_HARDER, true],
            [DecodeHintType.POSSIBLE_FORMATS, [
              BarcodeFormat.CODE_128, BarcodeFormat.CODE_39, BarcodeFormat.ITF,
              BarcodeFormat.EAN_13, BarcodeFormat.EAN_8,
              BarcodeFormat.UPC_A, BarcodeFormat.UPC_E, BarcodeFormat.CODABAR,
            ]],
          ]);
          const reader = new BrowserMultiFormatReader(hints, { delayBetweenScanAttempts: 180 });
          const controls = await reader.decodeFromConstraints(constraints, videoRef.current, (result, _error, scanControls) => {
            const value = result?.getText?.().trim();
            if (!value || cancelled || detectedRef.current) return;
            scanControls.stop();
            detectedRef.current = true;
            navigator.vibrate?.(40);
            stop();
            setStatus('starting');
            onDetectedRef.current(value);
            onCloseRef.current();
          });
          if (cancelled) controls.stop();
          else {
            controlsRef.current = controls;
            setStatus('scanning');
          }
          return;
        }

        const supported = globalThis.BarcodeDetector.getSupportedFormats
          ? await globalThis.BarcodeDetector.getSupportedFormats()
          : FORMATS;
        if (cancelled) return;
        const formats = FORMATS.filter(format => supported.includes(format));
        const detector = formats.length
          ? new globalThis.BarcodeDetector({ formats })
          : new globalThis.BarcodeDetector();
        const stream = await navigator.mediaDevices.getUserMedia(constraints);
        if (cancelled) {
          stream.getTracks().forEach(track => track.stop());
          return;
        }

        streamRef.current = stream;
        const video = videoRef.current;
        if (!video) return;
        video.srcObject = stream;
        await video.play();
        if (cancelled) return;
        setStatus('scanning');

        const scan = async (time) => {
          if (cancelled || detectedRef.current) return;
          frameRef.current = requestAnimationFrame(scan);
          if (detecting || video.readyState < 2 || time - lastCheck < 180) return;
          detecting = true;
          lastCheck = time;
          try {
            const codes = await detector.detect(video);
            const value = codes.find(code => code.rawValue?.trim())?.rawValue.trim();
            if (!value || cancelled || detectedRef.current) return;
            detectedRef.current = true;
            navigator.vibrate?.(40);
            stop();
            setStatus('starting');
            onDetectedRef.current(value);
            onCloseRef.current();
          } catch {
            // A frame can fail while the camera is focusing; keep scanning.
          } finally {
            detecting = false;
          }
        };
        frameRef.current = requestAnimationFrame(scan);
      } catch (error) {
        if (!cancelled) setStatus(cameraErrorKey(error));
        stop();
      }
    };

    start();
    return () => {
      cancelled = true;
      stop();
    };
  }, [open, attempt]);

  const error = status !== 'starting' && status !== 'scanning';

  return (
    <Modal
      open={open}
      onClose={() => {
        setStatus('starting');
        onClose();
      }}
      title={t('barcodeCamera.title')}
      size="md"
    >
      <div className="space-y-4">
        <div className="relative aspect-video overflow-hidden rounded-2xl bg-slate-950">
          <video
            ref={videoRef}
            muted
            playsInline
            aria-label={t('barcodeCamera.preview')}
            className={`h-full w-full object-cover transition-opacity duration-300 ${status === 'scanning' ? 'opacity-100' : 'opacity-25'}`}
          />

          {status === 'scanning' && (
            <div aria-hidden="true" className="pointer-events-none absolute inset-0 flex items-center justify-center">
              <div className="h-[42%] w-[76%] rounded-xl border-2 border-white/90 shadow-[0_0_0_999px_rgba(0,0,0,0.28)]" />
            </div>
          )}

          {status === 'starting' && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-white">
              <IconLoader2 size={26} className="animate-spin" />
              <span className="text-sm">{t('barcodeCamera.starting')}</span>
            </div>
          )}

          {error && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 px-6 text-center text-white">
              <IconAlertCircle size={30} />
              <p role="alert" className="text-sm leading-relaxed">{t(`barcodeCamera.${status}`)}</p>
              {status !== 'insecure' && (
                <button
                  type="button"
                  onClick={() => {
                    setStatus('starting');
                    setAttempt(value => value + 1);
                  }}
                  className="inline-flex items-center gap-2 rounded-lg bg-white/15 px-3 py-2 text-sm font-medium hover:bg-white/25 cursor-pointer"
                >
                  <IconRefresh size={16} /> {t('barcodeCamera.retry')}
                </button>
              )}
            </div>
          )}
        </div>

        <p className="flex items-center justify-center gap-2 text-center text-sm text-sub">
          <IconCamera size={17} className="text-brand" />
          {t('barcodeCamera.help')}
        </p>
      </div>
    </Modal>
  );
}
