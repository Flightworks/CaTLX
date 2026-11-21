import { Navigate, Route, Routes } from 'react-router-dom';
import { AppProvider, useAuth } from './contexts/AppContext';
import LoginPage from './pages/LoginPage';
import EvaluatorPage from './pages/EvaluatorPage';
import AdminDashboardPage from './pages/AdminDashboardPage';
import Layout from './components/layout/Layout';
import AboutPage from './pages/AboutPage';
import QuickRatingPage from './pages/QuickRatingPage';
import ProjectsPage from './pages/ProjectsPage';
import ManageMTEs from './pages/admin/ManageMTEs';

function PrivateRoutes() {
  const { isLoggedIn } = useAuth();
  if (!isLoggedIn) return <LoginPage />;

  return (
    <Layout>
      <Routes>
        <Route path="/workspace/quick-rating" element={<QuickRatingPage />} />
        <Route path="/projects/*" element={<ProjectsPage />} />
        <Route path="/catalog" element={<ManageMTEs standalone />} />
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
