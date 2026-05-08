import { useEffect, useRef, useState } from 'react';
import './ScrollVelocityVideo.css';

const SENSITIVITY   = 0.6;   // wheel delta multiplier
const FRICTION      = 0.88;  // per-frame deceleration (lower = stops faster)
const MAX_VIRTUAL   = 2400;  // total virtual scroll range (~240vh feel)
const ENTER_THRESHOLD = 100; // virtualScroll value where overlay fades in
const VELOCITY_STOP = 0.01;  // velocity magnitude below which we zero out

interface Props {
  src: string;
  poster?: string;
  className?: string;
}

export default function ScrollVelocityVideo({ src, poster, className }: Props) {
  const videoRef      = useRef<HTMLVideoElement>(null);
  const virtualScroll = useRef(0);
  const velocity      = useRef(0);
  const rafId         = useRef(0);
  const frameCount    = useRef(0);
  const metaLoaded    = useRef(false);

  const [isActive, setIsActive] = useState(false);
  const [hasError, setHasError] = useState(false);

  const reducedMotion = typeof window !== 'undefined'
    && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    function handleMetadata() {
      if (!video) return;
      metaLoaded.current = true;
      if (import.meta.env.DEV) {
        console.debug('[SVV] loadedmetadata — duration:', video.duration.toFixed(2), 's, src:', src);
      }
    }

    function handleCanPlay() {
      if (import.meta.env.DEV) {
        console.debug('[SVV] canplay — ready to seek');
      }
    }

    function handleError() {
      if (import.meta.env.DEV) {
        console.warn('[SVV] video error — src:', src, video?.error);
      }
      setHasError(true);
    }

    video.addEventListener('loadedmetadata', handleMetadata);
    video.addEventListener('canplay', handleCanPlay);
    video.addEventListener('error', handleError);

    if (reducedMotion) {
      return () => {
        video.removeEventListener('loadedmetadata', handleMetadata);
        video.removeEventListener('canplay', handleCanPlay);
        video.removeEventListener('error', handleError);
      };
    }

    function loop() {
      velocity.current *= FRICTION;
      if (Math.abs(velocity.current) < VELOCITY_STOP) velocity.current = 0;

      virtualScroll.current = Math.max(
        0,
        Math.min(MAX_VIRTUAL, virtualScroll.current + velocity.current),
      );

      const v = videoRef.current;
      if (v && metaLoaded.current && v.duration > 0) {
        const t = (virtualScroll.current / MAX_VIRTUAL) * v.duration;
        v.currentTime = t;

        frameCount.current++;
        if (import.meta.env.DEV && frameCount.current % 30 === 0) {
          console.debug('[SVV] currentTime', t.toFixed(2), '/ virtualScroll', virtualScroll.current.toFixed(0));
        }
      }

      const shouldBeActive = virtualScroll.current > ENTER_THRESHOLD;
      setIsActive(prev => (shouldBeActive !== prev ? shouldBeActive : prev));

      rafId.current = requestAnimationFrame(loop);
    }

    rafId.current = requestAnimationFrame(loop);

    function handleWheel(e: WheelEvent) {
      velocity.current += e.deltaY * SENSITIVITY;
    }

    window.addEventListener('wheel', handleWheel, { passive: true });

    return () => {
      cancelAnimationFrame(rafId.current);
      window.removeEventListener('wheel', handleWheel);
      video.removeEventListener('loadedmetadata', handleMetadata);
      video.removeEventListener('canplay', handleCanPlay);
      video.removeEventListener('error', handleError);
    };
  }, [reducedMotion, src]);

  if (hasError) {
    if (import.meta.env.DEV) {
      console.warn('[SVV] rendering dark fallback — place video at:', src);
    }
    return <div className="svv-error" aria-hidden="true" />;
  }

  return (
    <div
      className={[
        'svv-root',
        isActive ? 'svv-root--active' : '',
        className ?? '',
      ].join(' ').trim()}
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
      <div className="svv-veil" />
      <div className="svv-copy">
        <span className="svv-eyebrow">ARTIFACT VAULT</span>
        <h2 className="svv-title">What you earn becomes visible.</h2>
        <p className="svv-body">Abel turns progress into objects of memory.</p>
      </div>
    </div>
  );
}
