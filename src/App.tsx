import { useState, useEffect, useCallback } from 'react';
import type { PageId } from './types/abel';
import { AbelProvider } from './state/AbelProvider';
import OrbitalNav from './components/nav/OrbitalNav';
import MainPage from './pages/MainPage';
import ArchivePage from './pages/ArchivePage';
import QuestsPage from './pages/QuestsPage';
import FocusPage from './pages/FocusPage';
import GraphPage from './pages/GraphPage';
import SkillwebPage from './pages/SkillwebPage';
import EggHatchPage from './pages/EggHatchPage';
import TrophiesPage from './pages/TrophiesPage';
import ExhibitionPage from './pages/ExhibitionPage';
import SettingsPage from './pages/SettingsPage';

function AppInner() {
  const [page, setPage]       = useState<PageId>('main');
  const [navOpen, setNavOpen] = useState(false);

  const navigate = useCallback((id: PageId) => {
    setPage(id);
    setNavOpen(false);
  }, []);

  const openNav = useCallback(() => setNavOpen(true),  []);
  const closeNav = useCallback(() => setNavOpen(false), []);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (navOpen) { closeNav(); return; }
        openNav();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [navOpen, openNav, closeNav]);

  const sharedProps = { onNavigate: navigate };

  return (
    <>
      {page === 'main'       && <MainPage     {...sharedProps} onOpenNav={openNav} />}
      {page === 'archive'    && <ArchivePage  {...sharedProps} />}
      {page === 'quests'     && <QuestsPage   {...sharedProps} />}
      {page === 'focus'      && <FocusPage    {...sharedProps} />}
      {page === 'graph'      && <GraphPage    {...sharedProps} />}
      {page === 'skillweb'   && <SkillwebPage {...sharedProps} />}
      {page === 'egg-hatch'  && <EggHatchPage {...sharedProps} />}
      {page === 'trophies'   && <TrophiesPage {...sharedProps} />}
      {page === 'exhibition' && <ExhibitionPage {...sharedProps} />}
      {page === 'settings'   && <SettingsPage {...sharedProps} />}

      {navOpen && (
        <OrbitalNav
          currentPage={page}
          onNavigate={navigate}
          onClose={closeNav}
        />
      )}
    </>
  );
}

export default function App() {
  return (
    <AbelProvider>
      <AppInner />
    </AbelProvider>
  );
}
