import { useEffect, useRef, useState } from 'react';
import './CinematicIdleBackplate.css';

interface Props {
  src: string;
  poster?: string;
  pingPong?: boolean;
  className?: string;
}

const DEV = import.meta.env.DEV;

export default function CinematicIdleBackplate({
  src,
  poster,
  pingPong = true,
  className,
}: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [hasError, setHasError] = useState(false);

  const reducedMotion =
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  useEffect(() => {
    const video = videoRef.current;
    if (!video || hasError) return;

    if (DEV) {
      video.addEventListener('loadedmetadata', () =>
        console.log('[CinematicIdleBackplate] loadedmetadata', src)
      );
      video.addEventListener('canplay', () =>
        console.log('[CinematicIdleBackplate] canplay', src)
      );
    }

    if (reducedMotion) {
      video.currentTime = 0;
      return;
    }

    if (!pingPong) {
      video.play().catch((err) => {
        if (DEV) console.warn('[CinematicIdleBackplate] play rejected', err);
      });
      return;
    }

    let rafId = 0;
    let lastTimestamp = 0;

    function reverseStep(timestamp: number) {
      if (!video) return;
      if (lastTimestamp === 0) lastTimestamp = timestamp;
      const delta = (timestamp - lastTimestamp) / 1000;
      lastTimestamp = timestamp;

      const next = Math.max(0, video.currentTime - delta);
      video.currentTime = next;

      if (next <= 0.02) {
        video.currentTime = 0;
        lastTimestamp = 0;
        video.play().catch((err) => {
          if (DEV) console.warn('[CinematicIdleBackplate] play rejected (reverse)', err);
        });
      } else {
        rafId = requestAnimationFrame(reverseStep);
      }
    }

    function handleEnded() {
      if (!video) return;
      video.pause();
      lastTimestamp = 0;
      rafId = requestAnimationFrame(reverseStep);
    }

    video.addEventListener('ended', handleEnded);
    video.play().catch((err) => {
      if (DEV) console.warn('[CinematicIdleBackplate] play rejected', err);
    });

    return () => {
      video.removeEventListener('ended', handleEnded);
      cancelAnimationFrame(rafId);
    };
  }, [src, pingPong, reducedMotion, hasError]);

  const rootClass = ['cib-root', className].filter(Boolean).join(' ');

  if (hasError) {
    return <div className={`${rootClass} cib-error-fallback`} aria-hidden="true" />;
  }

  return (
    <div className={rootClass} aria-hidden="true">
      {reducedMotion && poster ? (
        <img className="cib-poster" src={poster} alt="" />
      ) : (
        <video
          ref={videoRef}
          className="cib-video"
          src={src}
          muted
          playsInline
          preload="auto"
          loop={!pingPong}
          onError={(e) => {
            if (DEV) console.error('[CinematicIdleBackplate] error', e);
            setHasError(true);
          }}
        />
      )}
      <div className="cib-dark-veil" />
      <div className="cib-vignette" />
      <div className="cib-grain" />
    </div>
  );
}
