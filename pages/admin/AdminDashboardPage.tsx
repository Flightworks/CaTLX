import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../contexts/AppContext';
import ManageEvaluators from './ManageEvaluators';
import ManageStudies from './ManageStudies';
import ViewStats from './ViewStats';
import ManageMTEs from './ManageMTEs';

type AdminTab = 'stats' | 'evaluators' | 'studies' | 'mtes';

const AdminDashboardPage: React.FC = () => {
  const { t } = useTranslation();
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
          ? 'text-accent-ink border-nasa-blue bg-nasa-gray-800'
          : 'text-nasa-gray-300 border-transparent hover:text-foreground hover:border-nasa-gray-500'
      }`}
    >
      {children}
    </button>
  );

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-foreground">{t('admin.title')}</h1>

      {/* FIX: The condition was updated to check for 'local' mode, which matches the banner's text content. */}
      {mode === 'local' && (
        <div className="bg-warning-surface text-warning-ink p-4 rounded-lg text-center text-sm">
          {t('admin.local_mode_warning')}
        </div>
      )}

      <div className="border-b border-nasa-gray-700">
        <nav className="-mb-px flex space-x-4 flex-wrap" aria-label={t('admin.title')}>
          <TabButton tabId="stats">{t('admin.statistics')}</TabButton>
          <TabButton tabId="evaluators">{t('admin.manage_evaluators')}</TabButton>
          <TabButton tabId="studies">{t('admin.manage_studies')}</TabButton>
          <TabButton tabId="mtes">{t('admin.mte_catalog')}</TabButton>
        </nav>
      </div>
      <div>{renderTabContent()}</div>
    </div>
  );
};

export default AdminDashboardPage;
