
import React, { useState } from 'react';
import ManageEvaluators from './admin/ManageEvaluators';
import ManageStudies from './admin/ManageStudies';
import ViewStats from './admin/ViewStats';

type AdminTab = 'stats' | 'evaluators' | 'studies';

const AdminDashboardPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<AdminTab>('stats');

  const renderTabContent = () => {
    switch (activeTab) {
      case 'stats':
        return <ViewStats />;
      case 'evaluators':
        return <ManageEvaluators />;
      case 'studies':
        return <ManageStudies />;
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
      <div className="border-b border-nasa-gray-700">
        <nav className="-mb-px flex space-x-4" aria-label="Tabs">
          <TabButton tabId="stats">Statistics</TabButton>
          <TabButton tabId="evaluators">Manage Evaluators</TabButton>
          <TabButton tabId="studies">Manage Studies</TabButton>
        </nav>
      </div>
      <div>{renderTabContent()}</div>
    </div>
  );
};

export default AdminDashboardPage;
