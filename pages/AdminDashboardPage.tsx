
import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth, useData, useSession } from '../contexts/AppContext';
import ManageEvaluators from './admin/ManageEvaluators';
import ManageStudies from './admin/ManageStudies';
import ViewStats from './admin/ViewStats';
import ManageMTEs from './admin/ManageMTEs';
import Card from '../components/ui/Card';
import Select from '../components/ui/Select';
import Button from '../components/ui/Button';
import Modal from '../components/ui/Modal';
import { Project } from '../types';

type AdminTab = 'stats' | 'evaluators' | 'studies' | 'mtes';

const ProjectForm: React.FC<{
  onSave: (project: Omit<Project, 'id' | 'ownerId' | 'memberIds'>) => void;
  onCancel: () => void;
}> = ({ onSave, onCancel }) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({ name, description });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label htmlFor="project-name" className="block text-sm font-medium text-nasa-gray-300">Project Name</label>
        <input
          type="text"
          id="project-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="mt-1 block w-full bg-nasa-gray-700 border-nasa-gray-600 rounded-md shadow-sm focus:ring-nasa-blue focus:border-nasa-blue text-white"
          required
        />
      </div>
      <div>
        <label htmlFor="project-desc" className="block text-sm font-medium text-nasa-gray-300">Description</label>
        <textarea
          id="project-desc"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
          className="mt-1 block w-full bg-nasa-gray-700 border-nasa-gray-600 rounded-md shadow-sm focus:ring-nasa-blue focus:border-nasa-blue text-white"
          required
        />
      </div>
      <div className="flex justify-end space-x-2">
        <Button type="button" variant="secondary" onClick={onCancel}>Cancel</Button>
        <Button type="submit">Create Project</Button>
      </div>
    </form>
  );
};

const ProjectSelector: React.FC<{ onCreateNew: () => void }> = ({ onCreateNew }) => {
  const { t } = useTranslation();
  const { projects } = useData();
  const { selectedProjectId, setSelectedProjectId } = useSession();

  useEffect(() => {
    if (!selectedProjectId && projects.length > 0) {
      setSelectedProjectId(projects[0].id);
    }
  }, [projects, selectedProjectId, setSelectedProjectId]);

  return (
    <Card>
      <div className="flex flex-col sm:flex-row items-center gap-4">
        {projects.length > 0 ? (
          <>
            <label htmlFor="project-selector" className="text-sm font-medium text-nasa-gray-300 whitespace-nowrap">{t('admin.current_project')}</label>
            <div className="flex-grow w-full sm:max-w-md">
              <select id="project-selector" value={selectedProjectId} onChange={e => setSelectedProjectId(e.target.value)}
                className="block w-full pl-3 pr-10 py-2 text-base bg-nasa-gray-700 border-nasa-gray-600 focus:outline-none focus:ring-nasa-blue focus:border-nasa-blue sm:text-sm rounded-md text-white"
              >
                {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
            <Button size="sm" variant="secondary" onClick={onCreateNew}>New Project</Button>
          </>
        ) : (
          <div className="w-full text-center py-4">
            <p className="text-nasa-gray-300 mb-3">No projects found. Create your first project to get started.</p>
            <Button onClick={onCreateNew}>Create First Project</Button>
          </div>
        )}
      </div>
    </Card>
  );
};


const AdminDashboardPage: React.FC = () => {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<AdminTab>('stats');
  const { mode } = useAuth();
  const { addProject, projects } = useData();
  const { setSelectedProjectId } = useSession();
  const [isProjectModalOpen, setIsProjectModalOpen] = useState(false);

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
      className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors border-b-2 ${activeTab === tabId
          ? 'text-nasa-blue border-nasa-blue bg-nasa-gray-800'
          : 'text-nasa-gray-300 border-transparent hover:text-white hover:border-nasa-gray-500'
        }`}
    >
      {children}
    </button>
  );

  const handleCreateProject = (projectData: Omit<Project, 'id' | 'ownerId' | 'memberIds'>) => {
    // In local mode, ownerId doesn't matter much, but we need to pass something.
    // We can use a placeholder or generate one if auth is mocked.
    addProject(projectData, 'local-admin');
    setIsProjectModalOpen(false);
    // The new project will be selected automatically by the effect in ProjectSelector
    // but we can also force it if we had the ID. Since addProject is void in the interface (sync in local), 
    // we rely on the effect or we could update the hook to return the ID.
    // For now, reliance on the effect is fine as it selects the first one if none selected, 
    // or we can manually select the last one added if we want to be precise, but let's stick to simple for now.
  };

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-white">{t('admin.title')}</h1>

      {mode === 'local' && (
        <div className="bg-yellow-900 bg-opacity-50 text-yellow-200 p-4 rounded-lg text-center text-sm">
          {t('admin.local_mode_warning')}
        </div>
      )}

      <ProjectSelector onCreateNew={() => setIsProjectModalOpen(true)} />

      <div className="border-b border-nasa-gray-700">
        <nav className="-mb-px flex space-x-4 flex-wrap" aria-label="Tabs">
          <TabButton tabId="stats">{t('admin.statistics')}</TabButton>
          <TabButton tabId="studies">{t('admin.manage_studies')}</TabButton>
          <TabButton tabId="evaluators">{t('admin.manage_evaluators')}</TabButton>
          <TabButton tabId="mtes">{t('admin.mte_catalog')}</TabButton>
        </nav>
      </div>
      <div>{renderTabContent()}</div>

      <Modal isOpen={isProjectModalOpen} onClose={() => setIsProjectModalOpen(false)} title="Create New Project">
        <ProjectForm onSave={handleCreateProject} onCancel={() => setIsProjectModalOpen(false)} />
      </Modal>
    </div>
  );
};

export default AdminDashboardPage;
