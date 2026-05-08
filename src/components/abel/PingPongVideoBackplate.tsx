import { useEffect, useRef, useState } from 'react';
import './PingPongVideoBackplate.css';

interface Props {
  src?: string;
}

export default function PingPongVideoBackplate({ src = '/scene/main/main.mp4' }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      video.currentTime = 0;
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
        video.play().catch(() => {});
      } else {
        rafId = requestAnimationFrame(reverseStep);
      }
    }

    function handleEnded() {
      video!.pause();
      lastTimestamp = 0;
      rafId = requestAnimationFrame(reverseStep);
    }

    video.addEventListener('ended', handleEnded);
    video.play().catch(() => {});

    return () => {
      video.removeEventListener('ended', handleEnded);
      cancelAnimationFrame(rafId);
    };
  }, []);

  if (hasError) return null;

  return (
    <div className="ppv-root" aria-hidden="true">
      <video
        ref={videoRef}
        className="ppv-video"
        src={src}
        muted
        playsInline
        preload="auto"
        onError={() => setHasError(true)}
      />
      <div className="ppv-dark-veil" />
      <div className="ppv-vignette" />
      <div className="ppv-grain" />
    </div>
  );
}
