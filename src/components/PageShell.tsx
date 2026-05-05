import type { ReactNode } from 'react';
import type { PageId } from '../types';
import './PageShell.css';

interface Props {
  onBack: () => void;
  children: ReactNode;
  page: PageId;
}

export default function PageShell({ onBack, children, page: _page }: Props) {
  return (
    <>
      {children}
      <button className="back-btn" onClick={onBack}>
        <span className="ctrl-key">Esc</span> Back
      </button>
    </>
  );
}
