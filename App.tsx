import { lazy, Suspense } from 'react';
import { HashRouter, Route, Routes } from 'react-router-dom';
import PublicQuickRating from './pages/PublicQuickRating';

const PrivateApp = lazy(() => import('./PrivateApp'));

export default function App() {
  return (
    <HashRouter>
      <Suspense fallback={<p role="status">CaTLX…</p>}>
        <Routes>
          <Route path="/quick-rating" element={<PublicQuickRating />} />
          <Route path="/*" element={<PrivateApp />} />
        </Routes>
      </Suspense>
    </HashRouter>
  );
}
