import { useEffect, useRef, useState } from 'react';
import { saveWorkspace, type CloudConfig, type LoadedWorkspace } from '../data/supabase';
import { createDataSource } from '../data/workspace';
import type { WorkspaceData } from '../types';

type SaveStatus = 'idle' | 'saving' | 'error' | 'conflict' | 'denied' | 'upgrade_required';

type Write = {
  payload: WorkspaceData;
  id: string;
  acknowledgements: (() => void)[];
};

export default function useCloudWorkspace(config: CloudConfig, initial: LoadedWorkspace) {
  const [data, setData] = useState(initial.payload);
  const [status, setStatus] = useState<SaveStatus>('idle');
  const draft = useRef(initial.payload);
  const revision = useRef(initial.revision);
  const pending = useRef<Write | null>(null);
  const active = useRef<Write | null>(null);
  const saving = useRef(false);
  const request = useRef<AbortController | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    request.current = controller;
    return () => {
      controller.abort();
      request.current = null;
    };
  }, []);

  const dirty = status !== 'idle';
  useEffect(() => {
    if (!dirty) return;
    const protectDraft = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener('beforeunload', protectDraft);
    return () => window.removeEventListener('beforeunload', protectDraft);
  }, [dirty]);

  async function flush() {
    const signal = request.current?.signal;
    const write = active.current ?? pending.current;
    if (!signal || signal.aborted || saving.current || !write) return;

    if (!active.current) {
      active.current = write;
      pending.current = null;
    }
    saving.current = true;
    setStatus('saving');

    try {
      const result = await saveWorkspace(config, write.payload, revision.current, write.id, signal);
      if (signal.aborted) return;

      if (result !== 'saved') {
        setStatus(result);
        return;
      }
      revision.current += 1;
      active.current = null;
      write.acknowledgements.forEach(resolve => resolve());
    } catch {
      if (!signal.aborted) setStatus('error');
      return;
    } finally {
      saving.current = false;
    }

    if (pending.current) {
      void flush();
    } else {
      setStatus('idle');
    }
  }

  const dataSource = createDataSource(data, (change, awaitSave) => {
    const next = change(draft.current);
    draft.current = next;
    setData(next);

    // Related operations from one interaction share the same database update.
    const write = pending.current ?? { payload: next, id: crypto.randomUUID(), acknowledgements: [] };
    write.payload = next;
    pending.current = write;
    setStatus('saving');
    queueMicrotask(() => void flush());

    if (awaitSave) {
      return new Promise<void>(resolve => write.acknowledgements.push(resolve));
    }
  });

  return { dataSource, status, retry: flush };
}
