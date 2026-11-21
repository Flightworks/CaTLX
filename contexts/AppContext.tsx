import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { cloudConfig, loadWorkspace, type CloudConfig, type LoadedWorkspace } from '../data/supabase';
import useMockData from '../hooks/useMockData';
import useLocalStorageData from '../hooks/useLocalStorageData';
import useCloudWorkspace from '../hooks/useCloudWorkspace';
import Button from '../components/ui/Button';
import type { IDataSource } from '../types';

type OfflineMode = 'demo' | 'local';
type CloudError = 'auth_failed' | 'access_denied' | 'load_failed' | 'signout_failed';

interface AuthContextType {
  isLoggedIn: boolean;
  mode: OfflineMode | 'cloud';
  login: (mode: OfflineMode) => void;
  logout: () => void;
  signInWithGoogle?: () => Promise<void>;
  cloudError?: CloudError;
}

interface SessionContextType {
  selectedEvaluatorId: string;
  setSelectedEvaluatorId: React.Dispatch<React.SetStateAction<string>>;
  selectedProjectId: string;
  setSelectedProjectId: React.Dispatch<React.SetStateAction<string>>;
  selectedStudyId: string;
  setSelectedStudyId: React.Dispatch<React.SetStateAction<string>>;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);
export const DataContext = createContext<IDataSource | undefined>(undefined);
export const SessionContext = createContext<SessionContextType | undefined>(undefined);

function SessionProvider({ children }: { children: ReactNode }) {
  const [selectedEvaluatorId, setSelectedEvaluatorId] = useState('');
  const [selectedProjectId, setSelectedProjectId] = useState('');
  const [selectedStudyId, setSelectedStudyId] = useState('');

  useEffect(() => {
    setSelectedStudyId('');
    setSelectedEvaluatorId('');
  }, [selectedProjectId]);

  return (
    <SessionContext.Provider value={{
      selectedEvaluatorId, setSelectedEvaluatorId,
      selectedProjectId, setSelectedProjectId,
      selectedStudyId, setSelectedStudyId,
    }}>
      {children}
    </SessionContext.Provider>
  );
}

function OfflineAppProvider({ children }: { children: ReactNode }) {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [mode, setMode] = useState<OfflineMode>('demo');
  const mockData = useMockData();
  const localData = useLocalStorageData();

  const login = (loginMode: OfflineMode) => {
    setMode(loginMode);
    setIsLoggedIn(true);
  };
  const logout = () => setIsLoggedIn(false);

  return (
    <AuthContext.Provider value={{ isLoggedIn, mode, login, logout }}>
      <DataContext.Provider value={mode === 'local' ? localData : mockData}>
        <SessionProvider key={String(isLoggedIn)}>{children}</SessionProvider>
      </DataContext.Provider>
    </AuthContext.Provider>
  );
}

function CloudWorkspaceProvider({ config, initial, auth, children }: {
  config: CloudConfig;
  initial: LoadedWorkspace;
  auth: AuthContextType;
  children: ReactNode;
}) {
  const { t } = useTranslation();
  const { dataSource, status, retry } = useCloudWorkspace(config, initial);
  const canEdit = status === 'idle' || status === 'saving';

  const logout = () => {
    if (status === 'idle' || window.confirm(t('cloud.discard_confirm'))) auth.logout();
  };

  return (
    <AuthContext.Provider value={{ ...auth, logout }}>
      {config.environment === 'preprod' && (
        <p className="bg-nasa-blue px-4 py-2 text-center text-sm text-white">{t('cloud.preprod')}</p>
      )}
      {auth.cloudError === 'signout_failed' && (
        <p role="alert" className="bg-nasa-gray-700 px-4 py-2 text-center">{t('cloud.signout_failed')}</p>
      )}
      {status === 'saving' && (
        <p role="status" className="bg-nasa-gray-700 px-4 py-2 text-center">{t('cloud.saving')}</p>
      )}
      {!canEdit && (
        <div className="flex flex-wrap items-center justify-center gap-3 bg-nasa-gray-700 p-4">
          <p role="alert">{t(`cloud.save_${status}`)}</p>
          {status === 'error' && <Button onClick={() => void retry()}>{t('cloud.retry')}</Button>}
          {status !== 'denied' && (
            <Button variant="secondary" onClick={() => {
              if (window.confirm(t('cloud.discard_confirm'))) window.location.reload();
            }}>
              {t('cloud.reload')}
            </Button>
          )}
          <Button variant="secondary" onClick={logout}>{t('header.logout')}</Button>
        </div>
      )}
      {status !== 'denied' && (
        <div inert={!canEdit}>
          <DataContext.Provider value={dataSource}>
            <SessionProvider>{children}</SessionProvider>
          </DataContext.Provider>
        </div>
      )}
    </AuthContext.Provider>
  );
}

type CloudAccess = {
  userId: string;
  workspace?: LoadedWorkspace;
  error?: CloudError;
};

function CloudAppProvider({ config, children }: { config: CloudConfig; children: ReactNode }) {
  const { t } = useTranslation();
  const [userId, setUserId] = useState<string | null | undefined>(undefined);
  const [access, setAccess] = useState<CloudAccess | null>(null);
  const [authError, setAuthError] = useState<CloudError | undefined>(() => {
    const query = new URLSearchParams(window.location.search);
    const fragment = new URLSearchParams(window.location.hash.slice(1));
    return query.has('error') || fragment.has('error') ? 'auth_failed' : undefined;
  });

  useEffect(() => {
    const { data: { subscription } } = config.client.auth.onAuthStateChange((_event, session) => {
      setUserId(session?.user.id ?? null);
    });
    return () => subscription.unsubscribe();
  }, [config]);

  useEffect(() => {
    if (!userId) {
      setAccess(null);
      return;
    }

    const controller = new AbortController();
    void (async () => {
      try {
        const { data, error } = await loadWorkspace(config, controller.signal);
        if (controller.signal.aborted) return;
        if (error) {
          setAccess({ userId, error: error.code === '42501' ? 'access_denied' : 'load_failed' });
        } else {
          setAccess(data ? { userId, workspace: data } : { userId, error: 'access_denied' });
        }
      } catch {
        if (!controller.signal.aborted) setAccess({ userId, error: 'load_failed' });
      }
    })();
    return () => controller.abort();
  }, [config, userId]);

  if (userId === undefined || (userId && access?.userId !== userId)) {
    return <p role="status" className="p-8 text-center">{t('cloud.checking_access')}</p>;
  }

  const signInWithGoogle = async () => {
    try {
      setAuthError(undefined);
      if (userId) {
        const { error } = await config.client.auth.signOut({ scope: 'local' });
        if (error) throw error;
      }

      const redirectTo = config.siteUrl ?? new URL(import.meta.env.BASE_URL, window.location.origin).href;
      const { error } = await config.client.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo, queryParams: { prompt: 'select_account' } },
      });
      if (error) throw error;
    } catch {
      setAuthError('auth_failed');
    }
  };

  const logout = () => {
    const onError = () => setAuthError('signout_failed');
    void config.client.auth.signOut({ scope: 'local' }).then(({ error }) => {
      if (error) onError();
    }, onError);
  };

  const workspace = access?.userId === userId ? access?.workspace : undefined;
  const auth: AuthContextType = {
    isLoggedIn: Boolean(workspace),
    mode: 'cloud',
    login: () => {},
    logout,
    signInWithGoogle,
    cloudError: authError ?? (access?.userId === userId ? access?.error : undefined),
  };

  if (workspace) {
    return (
      <CloudWorkspaceProvider key={userId} config={config} auth={auth} initial={workspace}>
        {children}
      </CloudWorkspaceProvider>
    );
  }

  return <AuthContext.Provider value={auth}>{children}</AuthContext.Provider>;
}

export function AppProvider({ children }: { children: ReactNode }) {
  return cloudConfig
    ? <CloudAppProvider config={cloudConfig}>{children}</CloudAppProvider>
    : <OfflineAppProvider>{children}</OfflineAppProvider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AppProvider');
  return context;
}

export function useData() {
  const context = useContext(DataContext);
  if (!context) throw new Error('useData must be used within an AppProvider');
  return context;
}

export function useSession() {
  const context = useContext(SessionContext);
  if (!context) throw new Error('useSession must be used within an AppProvider');
  return context;
}
