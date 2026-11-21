import React, { createContext, useContext, useState, ReactNode, useEffect, useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { cloudConfig, loadWorkspace, type CloudConfig, type LoadedWorkspace } from '../data/supabase';
import useMockData from '../hooks/useMockData';
import useLocalStorageData from '../hooks/useLocalStorageData';
import useCloudWorkspace from '../hooks/useCloudWorkspace';
import useOfflineWorkspace from '../hooks/useOfflineWorkspace';
import { convertOfflineCopy, createOfflineCopy, forgetOfflineCopy, readOfflineCopy, unlockLegacyCopy, unlockWithDevice, type OfflineVault } from '../data/offlineVault';
import { DeviceUnlockUnavailable, registerDevice } from '../data/deviceUnlock';
import { OfflineConflicts, OfflineLogoutDialog, OfflinePassphrase, OfflineStatus } from '../components/layout/OfflineControls';
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
  continueOnline?: () => Promise<void>;
  checkingOnlineAccess?: boolean;
  offlineUnlock?: { activate: () => void; busy: boolean; error: string | null };
  offlineEnrollment?: { activate: () => void; busy: boolean; error: string | null };
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

function CloudWorkspaceProvider({ config, initial, auth, ownerId, onEnroll, onOpenOfflineCopy, onDenied, children }: {
  config: CloudConfig;
  initial: LoadedWorkspace;
  auth: AuthContextType;
  ownerId: string;
  onEnroll: (vault: OfflineVault) => void;
  onOpenOfflineCopy?: () => void;
  onDenied: () => void;
  children: ReactNode;
}) {
  const { t } = useTranslation();
  const { dataSource, status, retry } = useCloudWorkspace(config, initial);
  const [enrolling, setEnrolling] = useState(false);
  const [enrollmentFailed, setEnrollmentFailed] = useState<string | null>(null);
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

  async function enroll() {
    setEnrolling(true);
    setEnrollmentFailed(null);
    try {
      const device = await registerDevice();
      const { data, error } = await loadWorkspace(config, AbortSignal.timeout(12000));
      if (error) throw error;
      if (!data) {
        onDenied();
        return;
      }
      onEnroll(await createOfflineCopy(config.offlineScope, ownerId, device, data));
    } catch (error) {
      setEnrollmentFailed(error instanceof DeviceUnlockUnavailable ? 'offline.device_unavailable' : 'offline.device_failed');
    } finally {
      setEnrolling(false);
    }
  }

  const canEdit = status === 'idle' || status === 'saving';

  const logout = () => {
    if (status === 'idle' || window.confirm(t('cloud.discard_confirm'))) auth.logout();
  };

  return (
    <AuthContext.Provider value={{
      ...auth, logout,
      offlineEnrollment: !onOpenOfflineCopy && status === 'idle' && online
        ? { activate: () => void enroll(), busy: enrolling, error: enrollmentFailed }
        : undefined,
    }}>
      {config.environment === 'preprod' && (
        <p className="border-b border-separator bg-nasa-gray-800 px-4 py-1 text-center text-xs text-accent-ink">{t('cloud.preprod')}</p>
      )}
      {onOpenOfflineCopy && (
        <div className="flex flex-wrap items-center justify-between gap-2 bg-nasa-gray-800 px-4 py-2 text-sm">
          <p>{t('offline.copy_locked')}</p>
          <Button size="sm" variant="secondary" disabled={status !== 'idle'} onClick={onOpenOfflineCopy}>{t('offline.open_copy')}</Button>
        </div>
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

function EnrolledWorkspace({ config, vault, canSync, auth, lock, forgetAndLogout, onDenied, onConverted, children }: {
  config: CloudConfig;
  vault: OfflineVault;
  canSync: boolean;
  auth: AuthContextType;
  lock: () => void;
  forgetAndLogout: () => void;
  onConverted: (entry: OfflineVault) => void;
  onDenied: () => void;
  children: ReactNode;
}) {
  const { t } = useTranslation();
  const { dataSource, hasPending, lastSyncedAt, status, review, reviewError, online, synchronize, resolve, finishLocalWrites } =
    useOfflineWorkspace(config, vault, canSync, onDenied);
  const [converting, setConverting] = useState(false);
  const [conversionError, setConversionError] = useState<string | null>(null);
  const [confirmLogout, setConfirmLogout] = useState(false);

  function leaveWorkspace(leave: () => void) {
    setConfirmLogout(false);
    void finishLocalWrites().then(leave);
  }

  async function convert() {
    setConverting(true);
    setConversionError(null);
    try {
      const device = await registerDevice();
      onConverted(await convertOfflineCopy(await finishLocalWrites(), device));
    } catch (error) {
      setConversionError(error instanceof DeviceUnlockUnavailable ? 'offline.device_unavailable' : 'offline.device_failed');
    } finally {
      setConverting(false);
    }
  }

  const lockedByOtherTab = status === 'local_conflict';
  const canReachServer = online && status !== 'unreachable';
  const notice = status === 'ready' || status === 'pending' ? null : status;
  const compactActions = online && canSync && !hasPending && (status === 'ready' || status === 'syncing');
  const actions = (
    <div className="flex flex-wrap gap-2">
      {!vault.record.credentialId && !lockedByOtherTab && (
        <Button size="sm" variant="secondary" disabled={converting} onClick={() => void convert()}>
          {t('offline.convert_device')}
        </Button>
      )}
      {online && !lockedByOtherTab && (canSync
        ? <Button size="sm" variant="secondary" disabled={status === 'syncing'} onClick={synchronize}>
            {t('offline.sync_now')}
          </Button>
        : <Button size="sm" variant="secondary" onClick={() => void auth.signInWithGoogle?.()}>
            {t('offline.reconnect')}
          </Button>)}
      <Button size="sm" variant="secondary" onClick={() => leaveWorkspace(lock)}>{t('offline.lock')}</Button>
    </div>
  );

  return (
    <AuthContext.Provider value={{ ...auth, logout: () => setConfirmLogout(true) }}>
      <OfflineLogoutDialog open={confirmLogout} hasPending={hasPending} onClose={() => setConfirmLogout(false)}
        onLock={() => leaveWorkspace(lock)} onForget={() => leaveWorkspace(forgetAndLogout)} />
      {config.environment === 'preprod' && (
        <p className="border-b border-separator bg-nasa-gray-800 px-4 py-1 text-center text-xs text-accent-ink">{t('cloud.preprod')}</p>
      )}
      <div className={canReachServer ? 'bg-nasa-gray-800' : 'bg-warning-surface'}>
        <div className="container mx-auto px-4 py-2 flex flex-wrap items-center justify-between gap-3">
          <div className="text-sm">
            <OfflineStatus online={canReachServer} inSync={compactActions && status === 'ready'}
              hasPending={hasPending} lastSyncedAt={lastSyncedAt} />
            {notice && <p role="status" className="text-nasa-gray-300">{t(`offline.${notice}`)}</p>}
          </div>
          {compactActions ? (
            <details className="relative text-sm">
              <summary className="cursor-pointer rounded px-2 py-1 text-nasa-gray-300 hover:bg-hover-surface">
                {t('offline.sync_options')}
              </summary>
              <div className="mt-2 rounded-lg border border-separator bg-nasa-gray-800 p-2 sm:absolute sm:right-0 sm:z-20 sm:w-max sm:shadow-md">
                {actions}
              </div>
            </details>
          ) : actions}
        </div>
      </div>
      {auth.cloudError === 'signout_failed' && (
        <p role="alert" className="bg-nasa-gray-700 px-4 py-2 text-center">{t('cloud.signout_failed')}</p>
      )}
      {conversionError && <p role="alert" className="p-2 text-center text-danger-ink">{t(conversionError)}</p>}
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
  const [deviceBusy, setDeviceBusy] = useState(false);
  const [deviceError, setDeviceError] = useState<string | null>(null);
  const [deniedOwner, setDeniedOwner] = useState<string | null>(null);
  const [online, setOnline] = useState(navigator.onLine);
  const onlinePreferenceKey = `catlx-online-only:${config.offlineScope}`;
  const [preferOnline, setPreferOnline] = useState(() => {
    try { return sessionStorage.getItem(onlinePreferenceKey) === 'true'; } catch { return false; }
  });
  const [accessAttempt, setAccessAttempt] = useState(0);
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
    let cancelled = false;
    const timeout = window.setTimeout(() => controller.abort(), 12_000);
    void (async () => {
      try {
        const { data, error } = await loadWorkspace(config, controller.signal);
        if (cancelled) return;
        if (error) {
          setAccess({ userId, error: error.code === '42501' ? 'access_denied' : 'load_failed' });
        } else {
          setAccess(data ? { userId, workspace: data } : { userId, error: 'access_denied' });
        }
      } catch {
        if (!cancelled) setAccess({ userId, error: 'load_failed' });
      } finally {
        window.clearTimeout(timeout);
      }
    })();
    return () => {
      cancelled = true;
      window.clearTimeout(timeout);
      controller.abort();
    };
  }, [config, userId, accessAttempt]);

  function selectOnline(preferred: boolean) {
    setPreferOnline(preferred);
    try {
      if (preferred) sessionStorage.setItem(onlinePreferenceKey, 'true');
      else sessionStorage.removeItem(onlinePreferenceKey);
    } catch {
      // The choice still applies until this page is reloaded.
    }
  }

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

  const logout = (forgetCopy = false) => {
    if (signingOut.current) return;
    signingOut.current = true;
    void (async () => {
      try {
        if (forgetCopy && record) {
          const latest = await readOfflineCopy(config.offlineScope);
          if (latest) await forgetOfflineCopy(latest);
          setVault(null);
          setRecord(null);
          localStorage.setItem('catlx_offline_copy_removed', config.offlineScope);
          localStorage.removeItem('catlx_offline_copy_removed');
        }
        if (navigator.onLine) {
          const { error } = await config.client.auth.signOut({ scope: 'local' });
          if (error && !forgetCopy) throw error;
        }
        selectOnline(false);
        if (forgetCopy || !navigator.onLine) {
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
    logout: () => logout(),
    signInWithGoogle,
    cloudError: authError ?? (access?.userId === userId ? access?.error : undefined),
  };

  if (record === undefined ||
      (online && !compatibleRecord && (userId === undefined || (userId && access?.userId !== userId)))) {
    return <p role="status" className="p-8 text-center">{t('cloud.checking_access')}</p>;
  }

  if (compatibleRecord && vault?.record.ownerId === compatibleRecord.ownerId) {
    return (
      <EnrolledWorkspace key={vault.record.credentialId ? 'device' : 'legacy'} config={config}
        vault={vault} canSync={userId === compatibleRecord.ownerId}
        auth={{ ...auth, isLoggedIn: true }} onConverted={entry => {
          setRecord(entry.record);
          setVault(entry);
        }}
        lock={() => { selectOnline(false); setVault(null); setUnlocking(false); }}
        forgetAndLogout={() => logout(true)} onDenied={onDenied}>
        {children}
      </EnrolledWorkspace>
    );
  }

  if (workspace && userId && (preferOnline || !compatibleRecord)) {
    return (
      <CloudWorkspaceProvider key={userId} config={config} auth={{ ...auth, isLoggedIn: true }}
        initial={workspace} ownerId={userId} onDenied={onDenied}
        onOpenOfflineCopy={compatibleRecord ? () => selectOnline(false) : undefined} onEnroll={entry => {
          setRecord(entry.record);
          setVault(entry);
        }}>
        {children}
      </CloudWorkspaceProvider>
    );
  }

  if (compatibleRecord) {
    const openOfflineCopy = async () => {
      if (!compatibleRecord.credentialId) {
        setUnlocking(true);
        return;
      }
      setDeviceBusy(true);
      setDeviceError(null);
      try {
        const unlocked = await unlockWithDevice(compatibleRecord);
        selectOnline(false);
        setVault(unlocked);
      } catch (error) {
        setDeviceError(error instanceof DeviceUnlockUnavailable ? 'offline.device_unavailable' : 'offline.device_failed');
      } finally {
        setDeviceBusy(false);
      }
    };
    const continueOnline = async () => {
      selectOnline(true);
      if (!userId) await signInWithGoogle();
      else {
        setAccess(null);
        setAccessAttempt(attempt => attempt + 1);
      }
    };

    return (
      <AuthContext.Provider value={{
        ...auth,
        continueOnline: online ? continueOnline : undefined,
        checkingOnlineAccess: preferOnline && !!userId && access?.userId !== userId,
        offlineUnlock: { activate: () => void openOfflineCopy(), busy: deviceBusy, error: deviceError },
      }}>
        {unlocking && !compatibleRecord.credentialId && <OfflinePassphrase onClose={() => setUnlocking(false)} submit={async phrase => {
          const latest = await readOfflineCopy(config.offlineScope);
          if (!latest || latest.ownerId !== compatibleRecord.ownerId) throw new Error('Offline copy changed');
          const unlocked = await unlockLegacyCopy(latest, phrase);
          selectOnline(false);
          setVault(unlocked);
          setUnlocking(false);
        }} />}
        {children}
      </AuthContext.Provider>
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
