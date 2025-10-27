
import React from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AppProvider, useAuth } from './contexts/AppContext';
import LoginPage from './pages/LoginPage';
import EvaluatorPage from './pages/EvaluatorPage';
import AdminDashboardPage from './pages/AdminDashboardPage';
import Layout from './components/layout/Layout';

const PrivateRoute: React.FC<{ children: React.ReactElement }> = ({ children }) => {
  const { isAuthenticated } = useAuth();
  return isAuthenticated ? children : <Navigate to="/" />;
};

function AppRoutes() {
  const { isAuthenticated } = useAuth();

  return (
    <HashRouter>
      <Routes>
        <Route path="/" element={isAuthenticated ? <Navigate to="/evaluator" /> : <LoginPage />} />
        <Route path="/evaluator" element={<PrivateRoute><Layout><EvaluatorPage /></Layout></PrivateRoute>} />
        <Route path="/admin" element={<PrivateRoute><Layout><AdminDashboardPage /></Layout></PrivateRoute>} />
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
