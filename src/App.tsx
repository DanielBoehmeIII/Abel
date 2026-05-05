import { useState, useEffect, useCallback } from 'react';
import type { PageId } from './types';
import MainMenu from './components/MainMenu';
import PageShell from './components/PageShell';
import SkillTreePage from './pages/SkillTreePage';
import JournalPage from './pages/JournalPage';
import TrophyPage from './pages/TrophyPage';
import ArchetypesPage from './pages/ArchetypesPage';
import { FocusPage, HabitPage, PlannerPage, SleepPage, FitnessPage, LearningPage } from './pages/ModuleGrid';
import './App.css';

export default function App() {
  const [page, setPage] = useState<PageId>('menu');
  const [menuSelected, setMenuSelected] = useState<PageId>('skilltree');

  const goBack = useCallback(() => setPage('menu'), []);
  const openPage = useCallback((id: PageId) => setPage(id), []);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && page !== 'menu') goBack();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [page, goBack]);

  if (page === 'menu') {
    return (
      <MainMenu
        selected={menuSelected}
        onSelect={setMenuSelected}
        onOpen={openPage}
      />
    );
  }

  const inner = (() => {
    switch (page) {
      case 'skilltree':  return <SkillTreePage />;
      case 'journal':    return <JournalPage onBack={goBack} />;
      case 'trophies':   return <TrophyPage />;
      case 'archetypes': return <ArchetypesPage />;
      case 'focus':      return <FocusPage />;
      case 'habit':      return <HabitPage />;
      case 'planner':    return <PlannerPage />;
      case 'sleep':      return <SleepPage />;
      case 'fitness':    return <FitnessPage />;
      case 'learning':   return <LearningPage />;
      default:           return null;
    }
  })();

  return (
    <PageShell onBack={goBack} page={page}>
      {inner}
    </PageShell>
  );
}
