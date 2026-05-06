import { useState, useEffect, useCallback } from 'react';
import type { PageId } from './types/abel';
import { AbelProvider } from './state/AbelProvider';
import OrbitalNav from './components/nav/OrbitalNav';
import PageTransition from './components/ui/PageTransition';
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

  const openNav  = useCallback(() => setNavOpen(true),  []);
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

  const shared = { onNavigate: navigate };

  return (
    <>
      <PageTransition pageId={page}>
        {page === 'main'       && <MainPage     {...shared} onOpenNav={openNav} />}
        {page === 'archive'    && <ArchivePage  {...shared} />}
        {page === 'quests'     && <QuestsPage   {...shared} />}
        {page === 'focus'      && <FocusPage    {...shared} />}
        {page === 'graph'      && <GraphPage    {...shared} />}
        {page === 'skillweb'   && <SkillwebPage {...shared} />}
        {page === 'egg-hatch'  && <EggHatchPage {...shared} />}
        {page === 'trophies'   && <TrophiesPage {...shared} />}
        {page === 'exhibition' && <ExhibitionPage {...shared} />}
        {page === 'settings'   && <SettingsPage {...shared} />}
      </PageTransition>

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
