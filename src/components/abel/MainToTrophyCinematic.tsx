import { type ReactNode, useEffect, useRef, useState } from 'react';
import type { PageId } from '../../types/abel';
import './MainToTrophyCinematic.css';

const IDLE_SRC    = '/scene/main/main.mp4';
const TRANS_SRC   = '/scene/main/main-to-trophy.mp4';
const DEST_SRC    = '/scene/trophy/trophy.mp4';
// 145 frames @ 24fps. For smoother scrubbing re-export at 60fps → 360 frames and bump FRAME_COUNT.
// For video-currentTime scrubbing: export main-to-trophy-intra.mp4 with -g 1 (all-I-frame).
const FRAME_COUNT = 145;
const FRAMES_BASE = '/scene/main/main-to-trophy-frames/';
function frameUrl(i: number) {
  return `${FRAMES_BASE}frame-${String(i).padStart(4, '0')}.jpg`;
}

function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v));
}

interface Props {
  children: ReactNode;
  onProgress?: (p: number) => void;
  onNavigate?: (page: PageId) => void;
  trophyCount?: number;
}

export default function MainToTrophyCinematic({ children, onProgress, onNavigate, trophyCount }: Props) {
  const sectionRef  = useRef<HTMLElement>(null);
  const idleRef     = useRef<HTMLVideoElement>(null);
  const transRef    = useRef<HTMLVideoElement>(null);
  const destRef     = useRef<HTMLVideoElement>(null);
  const imgRef      = useRef<HTMLImageElement>(null);
  const trophyUiRef = useRef<HTMLDivElement>(null);

  const progressRef      = useRef(0);
  const prevProgressRef  = useRef(0);
  const rafIdRef         = useRef(0);
  const frameCountRef    = useRef(0);
  const prevFrameRef     = useRef(0);
  const preloadedRef     = useRef<Set<number>>(new Set());
  const framesErrorRef   = useRef(false);
  const destErrorRef     = useRef(false);

  const isScrollActiveRef        = useRef(false);
  const idleTimeAtScrollStartRef = useRef(0);

  const onProgressRef = useRef(onProgress);
  useEffect(() => { onProgressRef.current = onProgress; }, [onProgress]);

  const [idleError,   setIdleError]   = useState(false);
  const [transError,  setTransError]  = useState(false);
  const [framesError, setFramesError] = useState(false);
  const [destError,   setDestError]   = useState(false);

  const reducedMotion = typeof window !== 'undefined'
    && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  useEffect(() => {
    const idle = idleRef.current;
    if (!idle) return;

    if (reducedMotion) {
      idle.currentTime = 0;
      return;
    }

    idle.play().catch(() => {});

    function onIdleMeta() {
      if (import.meta.env.DEV && idle) {
        console.debug('[MTC] idle loadedmetadata — duration:', idle.duration.toFixed(2));
      }
    }
    idle.addEventListener('loadedmetadata', onIdleMeta, { once: true });

    const dest = destRef.current;
    if (dest && !destErrorRef.current) {
      if (import.meta.env.DEV) {
        dest.addEventListener('loadedmetadata', () =>
          console.debug('[MTC] dest loadedmetadata — duration:', dest.duration.toFixed(2))
        );
        dest.addEventListener('canplay', () =>
          console.debug('[MTC] dest canplay')
        );
      }
      dest.play().catch(err => {
        if (import.meta.env.DEV) console.warn('[MTC] dest play rejected:', err);
      });
    }

    function loop() {
      const trans = transRef.current;
      const img   = imgRef.current;

      // Read progress fresh every frame — perfectly in sync with rendering,
      // no lerp lag regardless of scroll speed.
      if (sectionRef.current) {
        const rect = sectionRef.current.getBoundingClientRect();
        const scrollRange = rect.height - window.innerHeight;
        if (scrollRange > 0) {
          progressRef.current = clamp(-rect.top / scrollRange, 0, 1);
        }
      }

      const p = progressRef.current;

      // Scroll velocity: how many progress-units moved since last frame.
      const vel = Math.abs(p - prevProgressRef.current);
      prevProgressRef.current = p;

      const idleDuration = idle && idle.duration > 0 ? idle.duration : 0;

      // Scroll-active state transitions
      if (p > 0.001 && !isScrollActiveRef.current) {
        isScrollActiveRef.current        = true;
        idleTimeAtScrollStartRef.current = idle ? idle.currentTime : 0;
        idle?.pause();
      } else if (p < 0.001 && isScrollActiveRef.current) {
        isScrollActiveRef.current        = false;
        idleTimeAtScrollStartRef.current = 0;
        idle?.play().catch(() => {});
      }

      // Phase 1: idle video scrub toward exit frame (p 0.00–0.16)
      if (idle && idleDuration > 0 && p > 0 && p <= 0.26) {
        const phase1 = easeInOutCubic(clamp(p / 0.16, 0, 1));
        const targetTime = lerp(idleTimeAtScrollStartRef.current, idleDuration - 0.05, phase1);
        if (Math.abs(targetTime - idle.currentTime) > 0.01) {
          idle.currentTime = targetTime;
        }
      }

      // Phase 2: idle crossfade out (p 0.12–0.26)
      if (idle) idle.style.opacity = String(clamp(1 - (p - 0.12) / 0.14, 0, 1));

      // Frame sequence: fade IN p 0.12→0.26, hold, fade OUT p 0.88→1.00
      const frameIn  = clamp((p - 0.12) / 0.14, 0, 1);
      const frameOut = destErrorRef.current ? 1 : clamp(1 - (p - 0.88) / 0.12, 0, 1);
      const frameOpacity = String(Math.min(frameIn, frameOut));
      if (!framesErrorRef.current && img) {
        img.style.opacity = frameOpacity;
      } else if (framesErrorRef.current && trans) {
        trans.style.opacity = frameOpacity;
      }

      // Destination idle video: fade IN p 0.82→0.96
      const dest = destRef.current;
      const destOpacity = destErrorRef.current ? 0 : clamp((p - 0.82) / 0.14, 0, 1);
      if (dest) dest.style.opacity = String(destOpacity);

      if (import.meta.env.DEV && p > 0.8 && frameCountRef.current % 30 === 0) {
        console.debug(
          '[MTC] p', p.toFixed(3),
          '| frameOpacity', Math.min(frameIn, frameOut).toFixed(3),
          '| destOpacity', destOpacity.toFixed(3),
          '| destErr', destErrorRef.current,
        );
      }

      // Phase 3: transition scrub (p 0.26–0.82)
      if (!framesErrorRef.current) {
        if (img) {
          const transProgress = clamp((p - 0.26) / 0.56, 0, 1);
          const fi = Math.round(transProgress * (FRAME_COUNT - 1)) + 1;
          if (fi !== prevFrameRef.current) {
            img.src = frameUrl(fi);
            prevFrameRef.current = fi;
            // Adaptive lookahead: at high scroll velocity, widen the preload window
            // so fast scrubs don't outrun cached frames.
            const radius = Math.max(10, Math.min(40, Math.round(vel * FRAME_COUNT * 5)));
            for (let j = Math.max(1, fi - radius); j <= Math.min(FRAME_COUNT, fi + radius); j++) {
              if (!preloadedRef.current.has(j)) {
                const pImg = new Image();
                pImg.src = frameUrl(j);
                preloadedRef.current.add(j);
              }
            }
          }
        }
      } else {
        // Fallback: MP4 scrub
        if (trans && trans.duration > 0) {
          const transProgress = clamp((p - 0.26) / 0.56, 0, 1);
          const targetTime    = transProgress * trans.duration;
          if (Math.abs(targetTime - trans.currentTime) > 0.01) {
            trans.currentTime = targetTime;
          }
        }
      }

      // Phase 4: trophy arrival UI (p 0.78–0.92)
      if (trophyUiRef.current) {
        trophyUiRef.current.style.opacity = String(clamp((p - 0.78) / 0.14, 0, 1));
      }

      onProgressRef.current?.(p);

      frameCountRef.current++;
      if (import.meta.env.DEV && frameCountRef.current % 30 === 0) {
        console.debug(
          '[MTC] idleDur', idleDuration.toFixed(2),
          '| p', p.toFixed(3),
          '| frameIdx', prevFrameRef.current,
          '| vel', vel.toFixed(4),
          '| framesErr', framesErrorRef.current,
          '| scrollActive', isScrollActiveRef.current,
        );
      }

      rafIdRef.current = requestAnimationFrame(loop);
    }

    rafIdRef.current = requestAnimationFrame(loop);

    // Preload frame 1 immediately
    { const p1 = new Image(); p1.src = frameUrl(1); preloadedRef.current.add(1); }

    // Background preload all remaining frames during idle time
    let bgIdx = 2;
    let idleCbId = 0;
    function preloadNext(deadline: IdleDeadline) {
      while (deadline.timeRemaining() > 0 && bgIdx <= FRAME_COUNT) {
        if (!preloadedRef.current.has(bgIdx)) {
          const pImg = new Image();
          pImg.src = frameUrl(bgIdx);
          preloadedRef.current.add(bgIdx);
        }
        bgIdx++;
      }
      if (bgIdx <= FRAME_COUNT) idleCbId = requestIdleCallback(preloadNext);
    }
    if (typeof requestIdleCallback !== 'undefined') idleCbId = requestIdleCallback(preloadNext);

    return () => {
      cancelAnimationFrame(rafIdRef.current);
      if (idleCbId) cancelIdleCallback(idleCbId);
    };
  }, [reducedMotion]);

  return (
    <section ref={sectionRef} className="mtc-section" aria-label="Cinematic transition to Trophy Vault">
      <div className="mtc-sticky">

        {/* Idle video — z-index 0, bottom layer */}
        {!idleError ? (
          <video
            ref={idleRef}
            className="mtc-idle"
            src={IDLE_SRC}
            muted
            loop
            playsInline
            preload="auto"
            disablePictureInPicture
            onError={() => {
              if (import.meta.env.DEV) console.warn('[MTC] idle video error:', IDLE_SRC);
              setIdleError(true);
            }}
            aria-hidden="true"
          />
        ) : (
          <div className="mtc-error-fallback" aria-hidden="true" />
        )}

        {/* Idle post-processing: dark veil + vignette + grain — z-index 1 */}
        <div className="mtc-idle-overlay" aria-hidden="true" />

        {/* Main UI children — z-index 3, fades via --transition-progress CSS var */}
        <div className="mtc-main-ui">
          {children}
        </div>

        {/* Primary: JPG frame sequence — z-index 5 */}
        <img
          ref={imgRef}
          className="mtc-trans-frame"
          src={frameUrl(1)}
          alt=""
          aria-hidden="true"
          style={{ opacity: 0, display: framesError ? 'none' : undefined }}
          onError={() => {
            if (import.meta.env.DEV) console.warn('[MTC] frame image error — falling back to video');
            framesErrorRef.current = true;
            setFramesError(true);
          }}
        />

        {/* Fallback: MP4 video (only if frame images fail) — z-index 5 */}
        {!transError && (
          <video
            ref={transRef}
            className="mtc-trans"
            src={TRANS_SRC}
            muted
            playsInline
            preload="auto"
            disablePictureInPicture
            style={{ opacity: 0, display: framesError ? undefined : 'none' }}
            onError={() => {
              if (import.meta.env.DEV) console.warn('[MTC] transition video error:', TRANS_SRC);
              setTransError(true);
            }}
            aria-hidden="true"
          />
        )}

        {/* Destination idle video (Trophy) — z-index 6, fades in near p 0.82 */}
        {!destError && (
          <video
            ref={destRef}
            className="mtc-dest-idle"
            src={DEST_SRC}
            muted
            loop
            playsInline
            preload="auto"
            disablePictureInPicture
            style={{ opacity: 0 }}
            onError={() => {
              if (import.meta.env.DEV) console.warn('[MTC] dest idle video error:', DEST_SRC);
              destErrorRef.current = true;
              setDestError(true);
            }}
            aria-hidden="true"
          />
        )}

        {/* Bottom-weighted cinematic veil above destination video — z-index 7 */}
        <div className="mtc-cinematic-veil" aria-hidden="true" />

        {/* Trophy arrival UI — z-index 10, opacity starts 0, rAF-controlled */}
        <div
          ref={trophyUiRef}
          className="mtc-trophy-ui"
          style={{ opacity: 0, pointerEvents: 'none' }}
          aria-hidden="true"
        >
          <span className="mtc-trophy-eyebrow">TROPHY VAULT</span>
          <h2 className="mtc-trophy-title">Artifacts of Your Journey</h2>
          <p className="mtc-trophy-body">What you earn becomes visible.</p>
          {trophyCount != null && (
            <p className="mtc-trophy-secondary">{trophyCount} collected</p>
          )}
          {onNavigate && (
            <button
              className="mtc-trophy-cta"
              style={{ pointerEvents: 'auto' }}
              onClick={() => onNavigate('trophies')}
            >
              Enter Vault →
            </button>
          )}
        </div>

      </div>
    </section>
  );
}
