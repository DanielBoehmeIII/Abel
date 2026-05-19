import type { PageId } from '../../types/abel';
import './MobileBottomNav.css';

const NAV_ITEMS: { id: PageId; label: string; glyph: string }[] = [
  { id: 'main',     label: 'Home',    glyph: '◉' },
  { id: 'archive',  label: 'Chat',    glyph: '◈' },
  { id: 'quests',   label: 'Quests',  glyph: '⊕' },
  { id: 'memory',   label: 'Memory',  glyph: '◐' },
];

interface Props {
  currentPage: PageId;
  onNavigate: (page: PageId) => void;
  onOpenNav: () => void;
}

export default function MobileBottomNav({ currentPage, onNavigate, onOpenNav }: Props) {
  return (
    <nav className="mob-nav" aria-label="Mobile navigation">
      {NAV_ITEMS.map(item => {
        const active = currentPage === item.id;
        return (
          <button
            key={item.id}
            className={`mob-nav-item${active ? ' mob-nav-item--active' : ''}`}
            onClick={() => onNavigate(item.id)}
            aria-label={item.label}
            aria-current={active ? 'page' : undefined}
          >
            <span className="mob-nav-glyph" aria-hidden="true">{item.glyph}</span>
            <span className="mob-nav-label">{item.label}</span>
          </button>
        );
      })}
      <button
        className="mob-nav-item mob-nav-item--more"
        onClick={onOpenNav}
        aria-label="More pages"
      >
        <span className="mob-nav-glyph" aria-hidden="true">+</span>
        <span className="mob-nav-label">More</span>
      </button>
    </nav>
  );
}
