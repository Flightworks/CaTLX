import { useEffect, useId, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import Button from '../ui/Button';
import Modal from '../ui/Modal';
import { TLX_DIMENSIONS_INFO } from '../../constants';
import type { WorkspaceConflict } from '../../data/workspaceMerge';

const inputClass = 'w-full rounded-md bg-nasa-gray-900 border border-nasa-gray-600 p-2 text-foreground';

export function OfflineStatus({ online, inSync, hasPending, lastSyncedAt }: {
  online: boolean; inSync: boolean; hasPending: boolean; lastSyncedAt?: number;
}) {
  const { t, i18n } = useTranslation();
  const [now, setNow] = useState(Date.now);
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 30_000);
    return () => window.clearInterval(timer);
  }, []);

  const language = i18n.resolvedLanguage;
  let syncTime;
  if (lastSyncedAt !== undefined) {
    const minutes = Math.floor(Math.max(0, now - lastSyncedAt) / 60_000);
    const relative = new Intl.RelativeTimeFormat(language);
    const elapsed = minutes < 1 ? t('offline.sync_just_now')
      : minutes < 60 ? relative.format(-minutes, 'minute')
        : minutes < 1_440 ? relative.format(-Math.floor(minutes / 60), 'hour')
          : relative.format(-Math.floor(minutes / 1_440), 'day');
    syncTime = (
      <time dateTime={new Date(lastSyncedAt).toISOString()} title={new Intl.DateTimeFormat(language, {
        dateStyle: 'medium', timeStyle: 'short',
      }).format(lastSyncedAt)}>
        {t('offline.last_sync', { elapsed })}
      </time>
    );
  }

  return (
    <p role="status" className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
      {inSync && <strong className="text-success-ink">{t('offline.online_now')}</strong>}
      {!online && <>
        <strong className="text-warning-ink">{t('offline.offline_now')}</strong>
        <span>{t('offline.local_work')}</span>
      </>}
      <span className="text-nasa-gray-300">{syncTime ?? t('offline.sync_unknown')}</span>
      {hasPending && <span className="font-medium">{t('offline.pending')}</span>}
    </p>
  );
}

export function OfflineLogoutDialog({ open, hasPending, onClose, onLock, onForget }: {
  open: boolean; hasPending: boolean; onClose: () => void; onLock: () => void; onForget: () => void;
}) {
  const { t } = useTranslation();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);
  const titleId = useId();
  const descriptionId = useId();

  useEffect(() => {
    const dialog = dialogRef.current;
    if (open && dialog && !dialog.open) {
      dialog.showModal();
      cancelRef.current?.focus();
    }
    if (!open && dialog?.open) dialog.close();
  }, [open]);

  return (
    <dialog ref={dialogRef} aria-labelledby={titleId} aria-describedby={descriptionId} onClose={onClose}
      className="m-auto max-h-[90dvh] w-[calc(100%-2rem)] max-w-lg overflow-auto rounded-xl border border-separator bg-nasa-gray-800 p-5 text-foreground shadow-xl backdrop:bg-black/60 sm:p-6">
      <h2 id={titleId} className="text-xl font-semibold">{t('offline.logout_title')}</h2>
      <div id={descriptionId} className="mt-3 space-y-2 text-sm text-nasa-gray-200">
        <p>{t('offline.logout_copy')}</p>
        {hasPending && <p className="font-medium text-danger-ink">{t('offline.logout_pending')}</p>}
      </div>
      <div className="mt-5 flex flex-wrap items-center justify-end gap-2">
        <button ref={cancelRef} type="button" onClick={onClose}
          className="rounded-md px-3 py-1 text-sm font-medium hover:bg-hover-surface focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent-ink">
          {t('evaluator.cancel')}
        </button>
        <Button type="button" size="sm" variant="secondary" onClick={onLock}>{t('offline.logout_keep')}</Button>
        <Button type="button" size="sm" variant="danger" onClick={onForget}>{t('offline.logout_forget')}</Button>
      </div>
    </dialog>
  );
}

export function OfflinePassphrase({ submit, onClose }: {
  submit: (phrase: string) => Promise<void>; onClose: () => void;
}) {
  const { t } = useTranslation();
  const [phrase, setPhrase] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setError(false);
    try {
      await submit(phrase);
    } catch {
      setError(true);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal isOpen onClose={() => { if (!busy) onClose(); }} title={t('offline.legacy_unlock')}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <p>{t('offline.legacy_hint')}</p>
        <label className="block space-y-1">
          <span>{t('offline.phrase')}</span>
          <input type="password" autoComplete="current-password" className={inputClass}
            value={phrase} required onChange={event => setPhrase(event.target.value)} />
        </label>
        {error && <p role="alert" className="text-danger-ink">{t('offline.unlock_failed')}</p>}
        <Button type="submit" disabled={busy}>{t('offline.legacy_unlock')}</Button>
      </form>
    </Modal>
  );
}

const kind = {
  projects: 'project', studies: 'study', scenarios: 'scenario', mtes: 'task', evaluators: 'evaluator',
  ratings: 'rating', pairwiseComparisons: 'weights',
} as const;

export function OfflineConflicts({ conflicts, error, resolve }: {
  conflicts: WorkspaceConflict[];
  error: boolean;
  resolve: (conflict: WorkspaceConflict, side: 'local' | 'remote') => void;
}) {
  const { t } = useTranslation();
  return (
    <section className="container mx-auto my-4 rounded-lg bg-nasa-gray-800 p-4 space-y-4" aria-label={t('offline.conflicts')}>
      <p role="alert">{t('offline.conflicts')}</p>
      {error && <p role="alert" className="text-danger-ink">{t('offline.invalid_resolution')}</p>}
      {conflicts.map(conflict => (
        <div className="border border-nasa-gray-600 rounded-md p-3 space-y-3" key={JSON.stringify(conflict.keys)}>
          <div className="grid gap-4 sm:grid-cols-2">
            {(['local', 'remote'] as const).map(side => (
              <div className="min-w-0" key={side}>
                <h2 className="font-semibold mb-1">{t(`offline.${side}`)}</h2>
                {!conflict[side].length && <p>{t('offline.deleted')}</p>}
                {conflict[side].map(({ collection, value }, index) => (
                  <details key={index} className="mb-2 break-words">
                    <summary>
                      {t(`offline.${kind[collection]}`)}
                      {'name' in value && ` · ${value.name}`}
                      {'scores' in value && ` · ${TLX_DIMENSIONS_INFO.map(dim => value.scores[dim.id]).join(' / ')}`}
                    </summary>
                    <pre className="whitespace-pre-wrap text-xs">{JSON.stringify(value, null, 2)}</pre>
                  </details>
                ))}
              </div>
            ))}
          </div>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="secondary" onClick={() => resolve(conflict, 'local')}>{t('offline.keep_local')}</Button>
            <Button size="sm" variant="secondary" onClick={() => resolve(conflict, 'remote')}>{t('offline.keep_remote')}</Button>
          </div>
        </div>
      ))}
    </section>
  );
}
