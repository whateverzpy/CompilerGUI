import { useState } from 'react';
import { FirstFollowPage } from './features/firstFollow/FirstFollowPage';
import { HomePage, type PageKey } from './features/home/HomePage';
import { LL1Page } from './features/ll1/LL1Page';
import { LR0Page } from './features/lr0/LR0Page';
import { LR1Page } from './features/lr1/LR1Page';

export const App = () => {
  const [page, setPage] = useState<PageKey | 'home'>('home');

  if (page === 'first-follow') {
    return <FirstFollowPage onBack={() => setPage('home')} />;
  }

  if (page === 'll1') {
    return <LL1Page onBack={() => setPage('home')} />;
  }

  if (page === 'lr0') {
    return <LR0Page onBack={() => setPage('home')} />;
  }

  if (page === 'lr1') {
    return <LR1Page onBack={() => setPage('home')} />;
  }

  return <HomePage onOpen={setPage} />;
};
