import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import type { PageId } from '../../types/abel';

interface Props {
  pageId: PageId;
  children: ReactNode;
}

export default function PageTransition({ pageId, children }: Props) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    setVisible(false);
    const t = requestAnimationFrame(() => {
      requestAnimationFrame(() => setVisible(true));
    });
    return () => cancelAnimationFrame(t);
  }, [pageId]);

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      opacity: visible ? 1 : 0,
      transform: visible ? 'translateY(0) scale(1)' : 'translateY(6px) scale(0.997)',
      transition: 'opacity 0.38s cubic-bezier(0.16,1,0.3,1), transform 0.38s cubic-bezier(0.16,1,0.3,1)',
      willChange: 'opacity, transform',
    }}>
      {children}
    </div>
  );
}
