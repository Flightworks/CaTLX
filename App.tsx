
import React from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
// FIX: AppProvider was used but not imported, causing a 'Cannot find name' error.
import { AppProvider, useAuth } from './contexts/AppContext';
import LoginPage from './pages/LoginPage';
import EvaluatorPage from './pages/EvaluatorPage';
import AdminDashboardPage from './pages/AdminDashboardPage';
import Layout from './components/layout/Layout';

function AppRoutes() {
  const { isAuthenticated } = useAuth();

  return (
    <HashRouter>
      <Routes>
        <Route path="/login" element={isAuthenticated ? <Navigate to="/evaluator" /> : <LoginPage />} />
        <Route path="/*" element={
            <Layout>
                <Routes>
                    <Route path="/evaluator" element={<EvaluatorPage />} />
                    <Route path="/admin" element={<AdminDashboardPage />} />
                    <Route path="/" element={<Navigate to="/evaluator" />} />
                </Routes>
            </Layout>
        } />
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
