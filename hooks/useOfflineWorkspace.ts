import { useCallback, useEffect, useRef, useState } from 'react';
import { loadWorkspace, saveWorkspace, type CloudConfig, type LoadedWorkspace } from '../data/supabase';
import { OfflineCopyChanged, updateOfflineCopy, type OfflineDocument, type OfflineVault } from '../data/offlineVault';
import { createDataSource, type WorkspaceChange } from '../data/workspace';
import { mergeWorkspace, resolveWorkspaceConflict, sameWorkspace, type WorkspaceConflict } from '../data/workspaceMerge';

type OfflineStatus = 'ready' | 'pending' | 'syncing' | 'unreachable' | 'conflicts' | 'storage_failed' | 'local_conflict';
type Review = { remote: LoadedWorkspace; conflicts: WorkspaceConflict[] };

export default function useOfflineWorkspace(
  config: CloudConfig, initial: OfflineVault, canSync: boolean, onDenied: () => void,
) {
  const current = useRef(initial);
  const [document, setDocument] = useState(initial.document);
  const [status, setStatus] = useState<OfflineStatus>('ready');
  const [review, setReview] = useState<Review | null>(null);
  const [reviewError, setReviewError] = useState(false);
  const [online, setOnline] = useState(navigator.onLine);
  const queue = useRef<Promise<unknown>>(Promise.resolve());
  const active = useRef<AbortController | null>(null);
  const requested = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const locked = useRef(false);
  const mounted = useRef(false);

  const enqueue = useCallback(<T,>(work: () => Promise<T>): Promise<T> => {
    const result = queue.current.then(work);
    queue.current = result.catch(() => {});
    return result;
  }, []);

  const persist = useCallback(async (next: OfflineDocument) => {
    try {
      current.current = await updateOfflineCopy(current.current, next);
      if (mounted.current) setDocument(next);
    } catch (error) {
      const changed = error instanceof OfflineCopyChanged;
      if (changed) locked.current = true;
      if (mounted.current) setStatus(changed ? 'local_conflict' : 'storage_failed');
      throw error;
    }
  }, []);

  const synchronize = useCallback(() => {
    if (!canSync || !navigator.onLine || active.current || locked.current) return;
    const controller = new AbortController();
    active.current = controller;
    void enqueue(async () => {
      if (!mounted.current || controller.signal.aborted || locked.current) return;
      const timeout = setTimeout(() => controller.abort(), 12000);
      try {
        setStatus('syncing');
        // A successful read also verifies that the Google account still owns this workspace.
        for (let attempt = 0; attempt < 3; attempt++) {
          const { data: remote, error } = await loadWorkspace(config, controller.signal);
          if (controller.signal.aborted || !mounted.current) break;
          if (error && !['42501', 'PGRST301', 'PGRST303'].includes(error.code)) throw error;
          if (!remote) {
            onDenied();
            return;
          }
          const before = current.current.document;
          const { payload, conflicts } = mergeWorkspace(before.base.payload, before.local, remote.payload);
          let latest = remote;
          if (!sameWorkspace(payload, remote.payload)) {
            const result = await saveWorkspace(config, payload, remote.revision, crypto.randomUUID(), controller.signal);
            if (controller.signal.aborted || !mounted.current) break;
            if (result === 'conflict') continue;
            if (result === 'denied') {
              onDenied();
              return;
            }
            latest = { payload, revision: remote.revision + 1 };
          }

          if (conflicts.length) {
            const remaining = mergeWorkspace(before.base.payload, before.local, latest.payload);
            setReview({ remote: latest, conflicts: remaining.conflicts });
            setStatus('conflicts');
            return;
          }

          if (latest.revision !== before.base.revision ||
              !sameWorkspace(before.local, latest.payload) ||
              !sameWorkspace(before.base.payload, latest.payload)) {
            await persist({ base: latest, local: latest.payload });
          }
          setReview(null);
          setReviewError(false);
          setStatus('ready');
          return;
        }
        if (mounted.current) setStatus('unreachable');
      } catch (error) {
        if (mounted.current && !(error instanceof OfflineCopyChanged)) {
          setStatus(previous => previous === 'storage_failed' ? previous : 'unreachable');
        }
      } finally {
        clearTimeout(timeout);
      }
    }).finally(() => {
      if (active.current === controller) active.current = null;
    });
  }, [canSync, config, enqueue, onDenied, persist]);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      active.current?.abort();
      active.current = null;
      clearTimeout(requested.current);
    };
  }, []);

  useEffect(() => {
    const connectionChanged = () => {
      setOnline(navigator.onLine);
      if (navigator.onLine) synchronize();
    };
    const onVisible = () => {
      if (window.document.visibilityState === 'visible') connectionChanged();
    };
    window.addEventListener('online', connectionChanged);
    window.addEventListener('offline', connectionChanged);
    window.document.addEventListener('visibilitychange', onVisible);
    connectionChanged();
    return () => {
      window.removeEventListener('online', connectionChanged);
      window.removeEventListener('offline', connectionChanged);
      window.document.removeEventListener('visibilitychange', onVisible);
    };
  }, [synchronize]);

  function requestSync() {
    clearTimeout(requested.current);
    requested.current = setTimeout(synchronize, 300);
  }

  function commit(change: WorkspaceChange, awaitSave?: boolean) {
    if (locked.current) throw new OfflineCopyChanged();
    const result = enqueue(async () => {
      if (locked.current) throw new OfflineCopyChanged();
      const previous = current.current.document;
      await persist({ ...previous, local: change(previous.local) });
      if (mounted.current) {
        setReview(null);
        setStatus('pending');
        requestSync();
      }
    });
    if (awaitSave) return result;
    void result.catch(() => {});
  }

  function resolve(conflict: WorkspaceConflict, side: 'local' | 'remote') {
    if (!review || locked.current) return;
    void enqueue(async () => {
      const before = current.current.document;
      const result = resolveWorkspaceConflict(before.base.payload, before.local, review.remote.payload, conflict, side);
      if (!result) {
        setReviewError(true);
        return;
      }
      await persist({ base: { ...before.base, payload: result.base }, local: result.local });
      setReviewError(false);
      const remaining = mergeWorkspace(result.base, result.local, review.remote.payload).conflicts;
      setReview(remaining.length ? { ...review, conflicts: remaining } : null);
      setStatus(remaining.length ? 'conflicts' : 'pending');
      requestSync();
    }).catch(() => {});
  }

  return {
    dataSource: createDataSource(document.local, commit),
    hasPending: !sameWorkspace(document.base.payload, document.local),
    status, review, reviewError, online, synchronize, resolve,
    finishLocalWrites: () => { active.current?.abort(); clearTimeout(requested.current); return queue.current.then(() => current.current); },
  };
}
