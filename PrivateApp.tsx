import { Navigate, Route, Routes } from 'react-router-dom';
import { AppProvider, useAuth } from './contexts/AppContext';
import LoginPage from './pages/LoginPage';
import EvaluatorPage from './pages/EvaluatorPage';
import AdminDashboardPage from './pages/AdminDashboardPage';
import Layout from './components/layout/Layout';
import AboutPage from './pages/AboutPage';
import ProjectsPage from './pages/ProjectsPage';

function PrivateRoutes() {
  const { isLoggedIn } = useAuth();
  if (!isLoggedIn) return <LoginPage />;

  return (
    <Layout>
      <Routes>
        <Route path="/projects/*" element={<ProjectsPage />} />
        <Route path="/admin" element={<AdminDashboardPage />} />
        <Route path="/evaluator" element={<EvaluatorPage />} />
        <Route path="/about" element={<AboutPage />} />
        <Route path="*" element={<Navigate to="/projects" replace />} />
      </Routes>
    </Layout>
  );
}

export default function PrivateApp() {
  return <AppProvider><PrivateRoutes /></AppProvider>;
}
