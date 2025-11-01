import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AppContext';
import ManageEvaluators from './ManageEvaluators';
import ManageStudies from './ManageStudies';
import ViewStats from './ViewStats';
import ManageMTEs from './ManageMTEs';

type AdminTab = 'stats' | 'evaluators' | 'studies' | 'mtes';

const AdminDashboardPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<AdminTab>('stats');
  // FIX: Replaced `isAuthenticated` with `mode` as `isAuthenticated` does not exist on `AuthContextType`.
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
      <h1 className="text-3xl font-bold text-white">Admin Dashboard</h1>

      {/* FIX: The condition was updated to check for 'local' mode, which matches the banner's text content. */}
      {mode === 'local' && (
        <div className="bg-yellow-900 bg-opacity-50 text-yellow-200 p-4 rounded-lg text-center text-sm">
            You are in <span className="font-bold">Local Mode</span>. All data is saved on this device only. 
            <Link to="/login" className="font-bold underline text-white ml-1 hover:text-yellow-100">Log in</Link> to access shared studies.
        </div>
      )}

      <div className="border-b border-nasa-gray-700">
        <nav className="-mb-px flex space-x-4 flex-wrap" aria-label="Tabs">
          <TabButton tabId="stats">Statistics</TabButton>
          <TabButton tabId="evaluators">Manage Evaluators</TabButton>
          <TabButton tabId="studies">Manage Studies</TabButton>
          <TabButton tabId="mtes">MTE Catalog</TabButton>
        </nav>
      </div>
      <div>{renderTabContent()}</div>
    </div>
  );
};

export default AdminDashboardPage;
