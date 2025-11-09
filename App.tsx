
import React from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AppProvider, useAuth } from './contexts/AppContext';
import LandingPage from './pages/LandingPage';
import EvaluatorPage from './pages/EvaluatorPage';
import AdminDashboardPage from './pages/AdminDashboardPage';
import Layout from './components/layout/Layout';
import AboutPage from './pages/AboutPage';

function AppRoutes() {
  const { isLoggedIn } = useAuth();

  return (
    <HashRouter>
      <Routes>
        <Route path="/" element={
          isLoggedIn ? (
            <Layout>
              <Routes>
                <Route path="/evaluator" element={<EvaluatorPage />} />
                <Route path="/admin" element={<AdminDashboardPage />} />
                <Route path="/about" element={<AboutPage />} />
                <Route path="/" element={<Navigate to="/evaluator" />} />
              </Routes>
            </Layout>
          ) : (
            <LandingPage />
          )
        } />
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </HashRouter>
  );
}

export default function App() {
  return (
    <AppProvider>
      <AppRoutes />
    </AppProvider>
  );
}
