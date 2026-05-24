import { useState, useEffect, useCallback } from 'react';
import type { PageId } from './types/abel';
import { AbelProvider } from './state/AbelProvider';
import { AuthProvider, useAuth } from './state/AuthContext';
import SignInPage from './pages/SignInPage';
import OrbitalNav from './components/nav/OrbitalNav';
import MobileBottomNav from './components/nav/MobileBottomNav';
import { useIsMobile } from './hooks/useIsMobile';
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
import MemoryPage from './pages/MemoryPage';
import OnboardingFlow from './components/onboarding/OnboardingFlow';
import BetaAccessGate from './components/system/BetaAccessGate';
import FeedbackWidget from './components/system/FeedbackWidget';
import { trackEvent } from './lib/analytics';

function AppInner() {
  const { isAuthenticated, userEmail } = useAuth();
  const [page, setPage]       = useState<PageId>('main');
  const [navOpen, setNavOpen] = useState(false);
  const isMobile              = useIsMobile();

  const navigate = useCallback((id: PageId) => {
    trackEvent('navigate', { page: id });
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

  if (!isAuthenticated) return <SignInPage />;

  const shared = { onNavigate: navigate };

  return (
    <BetaAccessGate>
      <PageTransition pageId={page}>
        {page === 'main'       && <MainPage     {...shared} />}
        {page === 'archive'    && <ArchivePage  {...shared} />}
        {page === 'quests'     && <QuestsPage   {...shared} />}
        {page === 'focus'      && <FocusPage    {...shared} />}
        {page === 'graph'      && <GraphPage    {...shared} />}
        {page === 'skillweb'   && <SkillwebPage {...shared} />}
        {page === 'egg-hatch'  && <EggHatchPage {...shared} />}
        {page === 'trophies'   && <TrophiesPage {...shared} />}
        {page === 'exhibition' && <ExhibitionPage {...shared} />}
        {page === 'settings'   && <SettingsPage {...shared} />}
        {page === 'memory'     && <MemoryPage   {...shared} />}
      </PageTransition>

      {/* Orbital nav — desktop primary nav; on mobile serves as "all pages" overlay */}
      {navOpen && (
        <OrbitalNav
          currentPage={page}
          onNavigate={navigate}
          onClose={closeNav}
        />
      )}

      {/* Desktop orbit trigger — hidden on mobile via CSS */}
      <div className="global-nav">
        <button className="global-nav-btn" onClick={openNav} title="Navigator (Esc)">
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
            <circle cx="9" cy="9" r="7" stroke="currentColor" strokeWidth="1" strokeOpacity="0.6" />
            <circle cx="9" cy="9" r="3" stroke="currentColor" strokeWidth="1" />
            <circle cx="9" cy="9" r="1" fill="currentColor" />
            <line x1="9" y1="2" x2="9" y2="0" stroke="currentColor" strokeWidth="1" strokeOpacity="0.4" />
            <line x1="9" y1="16" x2="9" y2="18" stroke="currentColor" strokeWidth="1" strokeOpacity="0.4" />
            <line x1="2" y1="9" x2="0" y2="9" stroke="currentColor" strokeWidth="1" strokeOpacity="0.4" />
            <line x1="16" y1="9" x2="18" y2="9" stroke="currentColor" strokeWidth="1" strokeOpacity="0.4" />
          </svg>
        </button>
        <span className="global-nav-label">Nav</span>
      </div>

      {/* Mobile bottom navigation — shown only on phone/small tablet */}
      {isMobile && (
        <MobileBottomNav currentPage={page} onNavigate={navigate} onOpenNav={openNav} />
      )}

      <OnboardingFlow userEmail={userEmail} onNavigate={navigate} />
      <FeedbackWidget />
    </BetaAccessGate>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AbelProvider>
        <AppInner />
      </AbelProvider>
    </AuthProvider>
  );
}
