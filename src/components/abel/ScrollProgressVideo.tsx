import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import type { PageId } from '../../types/abel';
import './ScrollProgressVideo.css';

const LERP_FACTOR = 0.08;

interface Props {
  src: string;
  poster?: string;
  className?: string;
  onProgress?: (progress: number) => void;
  onNavigate?: (page: PageId) => void;
  trophyCount?: number;
}

export default function ScrollProgressVideo({
  src, poster, className, onProgress, onNavigate, trophyCount,
}: Props) {
  const rootRef     = useRef<HTMLDivElement>(null);
  const videoRef    = useRef<HTMLVideoElement>(null);
  const overlayRef  = useRef<HTMLDivElement>(null);
  const sectionRef  = useRef<HTMLDivElement>(null);

  const targetProgressRef    = useRef(0);
  const displayedProgressRef = useRef(0);
  const rafIdRef             = useRef(0);
  const metaLoadedRef        = useRef(false);
  const frameCountRef        = useRef(0);

  const onProgressRef = useRef(onProgress);
  useEffect(() => { onProgressRef.current = onProgress; }, [onProgress]);

  const [hasError, setHasError] = useState(false);

  const reducedMotion = typeof window !== 'undefined'
    && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const computeOverlayOpacity = useCallback((p: number): number => {
    if (p < 0.72) return 0;
    if (p < 0.86) return (p - 0.72) / 0.14;
    return 1;
  }, []);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    function handleMetadata() {
      if (!video) return;
      metaLoadedRef.current = true;
      video.pause();
      if (import.meta.env.DEV) {
        console.debug('[SPV] loadedmetadata — duration:', video.duration.toFixed(2), 's, src:', src);
      }
      video.play().then(() => video.pause()).catch(() => {});
    }

    function handleError() {
      if (import.meta.env.DEV) {
        console.warn('[SPV] video error — src:', src, video?.error);
      }
      setHasError(true);
    }

    video.addEventListener('loadedmetadata', handleMetadata);
    video.addEventListener('error', handleError);

    if (reducedMotion) {
      return () => {
        video.removeEventListener('loadedmetadata', handleMetadata);
        video.removeEventListener('error', handleError);
      };
    }

    function readProgress() {
      const sect = sectionRef.current;
      if (!sect) return;
      const rect = sect.getBoundingClientRect();
      const scrollRange = rect.height - window.innerHeight;
      if (scrollRange <= 0) return;
      targetProgressRef.current = Math.max(0, Math.min(1, -rect.top / scrollRange));
    }

    window.addEventListener('scroll', readProgress, { passive: true });

    function loop() {
      const tp = targetProgressRef.current;
      const dp = displayedProgressRef.current;
      const diff = tp - dp;

      const newDp = Math.abs(diff) < 0.0001 ? tp : dp + diff * LERP_FACTOR;
      displayedProgressRef.current = Math.max(0, Math.min(1, newDp));

      const p = displayedProgressRef.current;

      if (video && metaLoadedRef.current && video.duration > 0) {
        const newTime = p * video.duration;
        if (Math.abs(newTime - video.currentTime) > 0.01) {
          video.currentTime = newTime;
        }
      }

      if (rootRef.current) {
        rootRef.current.style.opacity = String(
          Math.max(0, Math.min(1, (p - 0.05) / 0.07))
        );
      }

      if (overlayRef.current) {
        overlayRef.current.style.opacity = String(computeOverlayOpacity(p));
      }

      onProgressRef.current?.(p);

      frameCountRef.current++;
      if (import.meta.env.DEV && frameCountRef.current % 30 === 0) {
        console.debug(
          '[SPV] duration', video?.duration?.toFixed(2),
          '| target', tp.toFixed(3),
          '| displayed', p.toFixed(3),
          '| currentTime', video?.currentTime?.toFixed(2),
        );
      }

      rafIdRef.current = requestAnimationFrame(loop);
    }

    rafIdRef.current = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(rafIdRef.current);
      window.removeEventListener('scroll', readProgress);
      video.removeEventListener('loadedmetadata', handleMetadata);
      video.removeEventListener('error', handleError);
    };
  }, [reducedMotion, src, computeOverlayOpacity]);

  if (hasError) {
    if (import.meta.env.DEV) {
      console.warn('[SPV] rendering dark fallback — place video at:', src);
    }
    return <div className="spv-error" aria-hidden="true" />;
  }

  return (
    <>
      {/* Fixed video overlay — covers viewport during transition */}
      <div
        ref={rootRef}
        className={['spv-root', className ?? ''].filter(Boolean).join(' ')}
        style={{ opacity: 0 }}
        aria-hidden="true"
      >
        <video
          ref={videoRef}
          src={src}
          poster={poster}
          preload="auto"
          muted
          playsInline
          disablePictureInPicture
        />
        <div className="spv-veil" />
        <div ref={overlayRef} className="spv-overlay" style={{ opacity: 0 }}>
          <span className="spv-eyebrow">TROPHY VAULT</span>
          <h2 className="spv-title">Artifacts of Your Journey</h2>
          <p className="spv-body">What you earn becomes visible.</p>
          {trophyCount != null && (
            <p className="spv-secondary">{trophyCount} collected</p>
          )}
          {onNavigate && (
            <button
              className="spv-cta"
              onClick={() => onNavigate('trophies')}
            >
              Enter Vault →
            </button>
          )}
        </div>
      </div>

      {/* Scroll driver — injected at body level to create real document scroll space */}
      {typeof document !== 'undefined' && createPortal(
        <div ref={sectionRef} className="spv-scroll-driver" aria-hidden="true" />,
        document.body,
      )}
    </>
  );
}
