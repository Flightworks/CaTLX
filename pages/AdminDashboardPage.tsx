
import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth, useData, useSession } from '../contexts/AppContext';
import ManageEvaluators from './admin/ManageEvaluators';
import ManageStudies from './admin/ManageStudies';
import ViewStats from './admin/ViewStats';
import ManageMTEs from './admin/ManageMTEs';
import Card from '../components/ui/Card';
import Select from '../components/ui/Select';

type AdminTab = 'stats' | 'evaluators' | 'studies' | 'mtes';

const ProjectSelector = () => {
    const { t } = useTranslation();
    const { projects } = useData();
    const { selectedProjectId, setSelectedProjectId } = useSession();

    useEffect(() => {
        if (!selectedProjectId && projects.length > 0) {
            setSelectedProjectId(projects[0].id);
        }
    }, [projects, selectedProjectId, setSelectedProjectId]);
    
    // Do not render selector if there's only one project or none
    if (projects.length <= 1) {
        return null;
    }

    return (
        <Card>
            <div className="flex items-center gap-x-4">
                <label htmlFor="project-selector" className="text-sm font-medium text-nasa-gray-300 whitespace-nowrap">{t('admin.current_project')}</label>
                <div className="flex-grow max-w-md">
                     <select id="project-selector" value={selectedProjectId} onChange={e => setSelectedProjectId(e.target.value)}
                       className="block w-full pl-3 pr-10 py-2 text-base bg-nasa-gray-700 border-nasa-gray-600 focus:outline-none focus:ring-nasa-blue focus:border-nasa-blue sm:text-sm rounded-md text-white"
                     >
                        {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                </div>
            </div>
        </Card>
    );
};


const AdminDashboardPage: React.FC = () => {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<AdminTab>('stats');
  const { mode } = useAuth();

  const renderTabContent = () => {
    switch (activeTab) {
      case 'stats':
        return <ViewStats />;
      case 'evaluators':
        return <ManageEvaluators />;
      case 'studies':
        return <ManageStudies />;
      case 'mtes':
        return <ManageMTEs />;
      default:
        return null;
    }
  };

  const TabButton: React.FC<{ tabId: AdminTab; children: React.ReactNode }> = ({ tabId, children }) => (
    <button
      onClick={() => setActiveTab(tabId)}
      className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors border-b-2 ${
        activeTab === tabId
          ? 'text-nasa-blue border-nasa-blue bg-nasa-gray-800'
          : 'text-nasa-gray-300 border-transparent hover:text-white hover:border-nasa-gray-500'
      }`}
    >
      {children}
    </button>
  );

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-white">{t('admin.title')}</h1>

      {mode === 'local' && (
        <div className="bg-yellow-900 bg-opacity-50 text-yellow-200 p-4 rounded-lg text-center text-sm">
            {t('admin.local_mode_warning')}
        </div>
      )}

      <ProjectSelector />

      <div className="border-b border-nasa-gray-700">
        <nav className="-mb-px flex space-x-4 flex-wrap" aria-label="Tabs">
          <TabButton tabId="stats">{t('admin.statistics')}</TabButton>
          <TabButton tabId="studies">{t('admin.manage_studies')}</TabButton>
          <TabButton tabId="evaluators">{t('admin.manage_evaluators')}</TabButton>
          <TabButton tabId="mtes">{t('admin.mte_catalog')}</TabButton>
        </nav>
      </div>
      <div>{renderTabContent()}</div>
    </div>
  );
};

export default AdminDashboardPage;
