
import React, { Suspense } from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
// FIX: AppProvider was used but not imported, causing a 'Cannot find name' error.
import { AppProvider, useAuth } from './contexts/AppContext';
import LoginPage from './pages/LoginPage';
import EvaluatorPage from './pages/EvaluatorPage';
import QuickRatingPage from './pages/QuickRatingPage';
import AdminDashboardPage from './pages/AdminDashboardPage';
import Layout from './components/layout/Layout';
import AboutPage from './pages/AboutPage';

function AdminRoute() {
  const { mode, user } = useAuth();
  const allowedFirebaseRoles = ['admin', 'catalog_manager', 'study_manager', 'analyst'];
  if (mode === 'firebase' && (!user || user.status !== 'active' || !allowedFirebaseRoles.includes(user.role))) {
    return <Navigate to="/evaluator" replace />;
  }
  return <AdminDashboardPage />;
}

function AppRoutes() {
  const { isLoggedIn } = useAuth();

  return (
    <HashRouter>
      <Routes>
        <Route path="/login" element={isLoggedIn ? <Navigate to="/evaluator" /> : <LoginPage />} />
        <Route path="/*" element={
          isLoggedIn ? (
            <Layout>
              <Routes>
                <Route path="/evaluator" element={<EvaluatorPage />} />
                <Route path="/quick-rating" element={<QuickRatingPage />} />
                <Route path="/admin" element={<AdminRoute />} />
                <Route path="/about" element={<AboutPage />} />
                <Route path="/" element={<Navigate to="/evaluator" />} />
              </Routes>
            </Layout>
          ) : (
            <Navigate to="/login" />
          )
        } />
      </Routes>
    </HashRouter>
  );
}

export default function App() {
  return (
    <AppProvider>
      <Suspense fallback="loading">
        <AppRoutes />
      </Suspense>
    </AppProvider>
  );
}
