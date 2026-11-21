import React, { createContext, useContext, useState, ReactNode, useEffect, useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { cloudConfig, loadWorkspace, type CloudConfig, type LoadedWorkspace } from '../data/supabase';
import useMockData from '../hooks/useMockData';
import useLocalStorageData from '../hooks/useLocalStorageData';
import useCloudWorkspace from '../hooks/useCloudWorkspace';
import useOfflineWorkspace from '../hooks/useOfflineWorkspace';
import { createOfflineCopy, forgetOfflineCopy, readOfflineCopy, unlockOfflineCopy, type OfflineVault } from '../data/offlineVault';
import { OfflineConflicts, OfflinePassphrase } from '../components/layout/OfflineControls';
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

function CloudWorkspaceProvider({ config, initial, auth, ownerId, onEnroll, onDenied, children }: {
  config: CloudConfig;
  initial: LoadedWorkspace;
  auth: AuthContextType;
  ownerId: string;
  onEnroll: (vault: OfflineVault) => void;
  onDenied: () => void;
  children: ReactNode;
}) {
  const { t } = useTranslation();
  const { dataSource, status, retry } = useCloudWorkspace(config, initial);
  const [enrolling, setEnrolling] = useState(false);
  const [online, setOnline] = useState(navigator.onLine);

  useEffect(() => {
    const update = () => setOnline(navigator.onLine);
    window.addEventListener('online', update);
    window.addEventListener('offline', update);
    return () => {
      window.removeEventListener('online', update);
      window.removeEventListener('offline', update);
    };
  }, []);

  async function enroll(phrase: string) {
    const { data, error } = await loadWorkspace(config, AbortSignal.timeout(12000));
    if (error) throw error;
    if (!data) {
      onDenied();
      return;
    }
    onEnroll(await createOfflineCopy(config.offlineScope, ownerId, phrase, data));
  }
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
      {status === 'idle' && online && (
        <div className="container mx-auto px-4 py-2 flex justify-end">
          <Button variant="secondary" size="sm" onClick={() => setEnrolling(true)}>{t('offline.enable')}</Button>
        </div>
      )}
      {enrolling && <OfflinePassphrase creating submit={enroll} onClose={() => setEnrolling(false)} />}
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

function EnrolledWorkspace({ config, vault, canSync, auth, lock, onDenied, children }: {
  config: CloudConfig;
  vault: OfflineVault;
  canSync: boolean;
  auth: AuthContextType;
  lock: () => void;
  onDenied: () => void;
  children: ReactNode;
}) {
  const { t } = useTranslation();
  const { dataSource, hasPending, status, review, reviewError, online, synchronize, resolve, finishLocalWrites } =
    useOfflineWorkspace(config, vault, canSync, onDenied);
  const lockedByOtherTab = status === 'local_conflict';
  const pendingLabel = t(hasPending ? 'offline.pending' : 'offline.ready');
  const notice = status === 'ready' || status === 'pending' ? null : status;

  return (
    <AuthContext.Provider value={{ ...auth, logout: () => { void finishLocalWrites().then(auth.logout); } }}>
      {config.environment === 'preprod' && (
        <p className="bg-nasa-blue px-4 py-2 text-center text-sm text-white">{t('cloud.preprod')}</p>
      )}
      <div className="bg-nasa-gray-800">
        <div className="container mx-auto px-4 py-2 flex flex-wrap items-center justify-between gap-3">
          <div className="text-sm">
            <p role="status">{!online && `${t('offline.offline_now')} · `}{pendingLabel}</p>
            {notice && <p role="status" className="text-nasa-gray-300">{t(`offline.${notice}`)}</p>}
          </div>
          <div className="flex flex-wrap gap-2">
            {online && !lockedByOtherTab && (canSync
              ? <Button size="sm" variant="secondary" disabled={status === 'syncing'} onClick={synchronize}>
                  {t('offline.sync_now')}
                </Button>
              : <Button size="sm" variant="secondary" onClick={() => void auth.signInWithGoogle?.()}>
                  {t('offline.reconnect')}
                </Button>)}
            <Button size="sm" variant="secondary" onClick={() => { void finishLocalWrites().then(lock); }}>{t('offline.lock')}</Button>
          </div>
        </div>
      </div>
      {review && !lockedByOtherTab && (
        <OfflineConflicts conflicts={review.conflicts} error={reviewError} resolve={resolve} />
      )}
      <div inert={lockedByOtherTab}>
        <DataContext.Provider value={dataSource}>
          <SessionProvider>{children}</SessionProvider>
        </DataContext.Provider>
      </div>
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
  const [record, setRecord] = useState<OfflineVault['record'] | null | undefined>(undefined);
  const [vault, setVault] = useState<OfflineVault | null>(null);
  const [unlocking, setUnlocking] = useState(false);
  const [deniedOwner, setDeniedOwner] = useState<string | null>(null);
  const [online, setOnline] = useState(navigator.onLine);
  const signingOut = useRef(false);
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

  useEffect(() => {
    let cancelled = false;
    const onStorage = (event: StorageEvent) => {
      if (event.key === 'catlx_offline_copy_removed' && event.newValue === config.offlineScope) {
        setRecord(null);
        setVault(null);
        setUnlocking(false);
      }
    };
    window.addEventListener('storage', onStorage);
    readOfflineCopy(config.offlineScope).then(
      entry => { if (!cancelled) setRecord(entry ?? null); },
      () => { if (!cancelled) setRecord(null); },
    );
    return () => {
      cancelled = true;
      window.removeEventListener('storage', onStorage);
    };
  }, [config]);

  useEffect(() => {
    const update = () => setOnline(navigator.onLine);
    window.addEventListener('online', update);
    window.addEventListener('offline', update);
    return () => {
      window.removeEventListener('online', update);
      window.removeEventListener('offline', update);
    };
  }, []);

  useEffect(() => {
    if (vault && ((userId && userId !== vault.record.ownerId) || access?.error === 'access_denied')) {
      setVault(null);
    }
  }, [access, userId, vault]);

  const onDenied = useCallback(() => {
    if (userId) setDeniedOwner(userId);
    setVault(null);
    setAuthError('access_denied');
  }, [userId]);

  const signInWithGoogle = async () => {
    try {
      setAuthError(undefined);
      setDeniedOwner(null);
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
    if (signingOut.current) return;
    if (record && !window.confirm(t('offline.logout_confirm'))) return;
    signingOut.current = true;
    void (async () => {
      try {
        if (record) {
          const latest = await readOfflineCopy(config.offlineScope);
          if (latest) await forgetOfflineCopy(latest);
          setVault(null);
          setRecord(null);
          localStorage.setItem('catlx_offline_copy_removed', config.offlineScope);
          localStorage.removeItem('catlx_offline_copy_removed');
        }
        if (navigator.onLine) {
          const { error } = await config.client.auth.signOut({ scope: 'local' });
          if (error && !record) throw error;
        }
        if (record || !navigator.onLine) {
          localStorage.removeItem(config.storageKey);
          localStorage.removeItem(`${config.storageKey}-code-verifier`);
          window.location.hash = '/login';
          window.location.reload();
        }
      } catch {
        setAuthError('signout_failed');
      } finally {
        signingOut.current = false;
      }
    })();
  };

  const denied = (deniedOwner !== null && (deniedOwner === userId || deniedOwner === record?.ownerId)) ||
    (access?.userId === userId && access?.error === 'access_denied');
  const workspace = access?.userId === userId && !denied ? access?.workspace : undefined;
  const compatibleRecord = record && (!userId || record.ownerId === userId) && !denied ? record : null;
  const auth: AuthContextType = {
    isLoggedIn: false,
    mode: 'cloud',
    login: () => {},
    logout,
    signInWithGoogle,
    cloudError: authError ?? (access?.userId === userId ? access?.error : undefined),
  };

  if (record === undefined ||
      (online && !compatibleRecord && (userId === undefined || (userId && access?.userId !== userId)))) {
    return <p role="status" className="p-8 text-center">{t('cloud.checking_access')}</p>;
  }

  if (compatibleRecord) {
    if (vault?.record.ownerId === compatibleRecord.ownerId) {
      return (
        <EnrolledWorkspace config={config} vault={vault} canSync={userId === compatibleRecord.ownerId}
          auth={{ ...auth, isLoggedIn: true }}
          lock={() => { setVault(null); setUnlocking(false); }} onDenied={onDenied}>
          {children}
        </EnrolledWorkspace>
      );
    }

    return (
      <AuthContext.Provider value={auth}>
        <div className="container mx-auto px-4 pt-6 text-center">
          <Button onClick={() => setUnlocking(true)}>{t('offline.unlock')}</Button>
        </div>
        {unlocking && <OfflinePassphrase creating={false} onClose={() => setUnlocking(false)} submit={async phrase => {
          const latest = await readOfflineCopy(config.offlineScope);
          if (!latest || latest.ownerId !== compatibleRecord.ownerId) throw new Error('Offline copy changed');
          setVault(await unlockOfflineCopy(latest, phrase));
          setUnlocking(false);
        }} />}
        {children}
      </AuthContext.Provider>
    );
  }

  if (workspace && userId) {
    return (
      <CloudWorkspaceProvider key={userId} config={config} auth={{ ...auth, isLoggedIn: true }}
        initial={workspace} ownerId={userId} onDenied={onDenied} onEnroll={entry => {
          setRecord(entry.record);
          setVault(entry);
        }}>
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
