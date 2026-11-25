import { Navigate, Route, Routes, useMatch } from 'react-router-dom';
import { AppProvider, DataContext, useAuth, useData } from './contexts/AppContext';
import { DEMO_PROJECT_ID, demoProjectData } from './data/demoProject';
import useMockData from './hooks/useMockData';
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
  return isLoggedIn ? <WorkspaceRoutes /> : <LoginPage />;
}

function WorkspaceRoutes() {
  const workspace = useData();
  const demo = useMockData(demoProjectData);
  const demoRoute = useMatch(`/projects/${DEMO_PROJECT_ID}/*`);
  const projectList = useMatch('/projects');
  const dataSource = demoRoute ? demo : projectList ? {
    ...workspace,
    projects: [...workspace.projects, ...demo.projects],
    studies: [...workspace.studies, ...demo.studies],
  } : workspace;

  return (
    <DataContext.Provider value={dataSource}>
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
    </DataContext.Provider>
  );
}

export default function PrivateApp() {
  return <AppProvider><PrivateRoutes /></AppProvider>;
}
