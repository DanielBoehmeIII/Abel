import { useEffect, useState } from 'react';

const BREAKPOINT = 768;
const MQ = `(max-width: ${BREAKPOINT - 1}px)`;

function getMatch() {
  return typeof window !== 'undefined' && window.matchMedia(MQ).matches;
}

export function useIsMobile(): boolean {
  const [isMobile, setIsMobile] = useState(getMatch);

  useEffect(() => {
    const mq = window.matchMedia(MQ);
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  return isMobile;
}
