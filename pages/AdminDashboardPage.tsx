

import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AppContext';
import ManageEvaluators from './admin/ManageEvaluators';
import ManageProjects from './admin/ManageStudies';
import ViewStats from './admin/ViewStats';
import ManageMTEs from './admin/ManageMTEs';

type AdminTab = 'stats' | 'evaluators' | 'projects' | 'mtes';

const AdminDashboardPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<AdminTab>('stats');
  const { mode } = useAuth();

  const renderTabContent = () => {
    switch (activeTab) {
      case 'stats':
        return <ViewStats />;
      case 'evaluators':
        return <ManageEvaluators />;
      case 'projects':
        return <ManageProjects />;
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
      <h1 className="text-3xl font-bold text-white">Admin Dashboard</h1>

      {mode === 'local' && (
        <div className="bg-yellow-900 bg-opacity-50 text-yellow-200 p-4 rounded-lg text-center text-sm">
            You are in <span className="font-bold">Local Mode</span>. All data is saved on this device only. Use the Logout button to switch modes.
        </div>
      )}

      <div className="border-b border-nasa-gray-700">
        <nav className="-mb-px flex space-x-4 flex-wrap" aria-label="Tabs">
          <TabButton tabId="stats">Statistics</TabButton>
          <TabButton tabId="evaluators">Manage Evaluators</TabButton>
          <TabButton tabId="projects">Manage Projects</TabButton>
          <TabButton tabId="mtes">MTE Catalog</TabButton>
        </nav>
      </div>
      <div>{renderTabContent()}</div>
    </div>
  );
};

export default AdminDashboardPage;