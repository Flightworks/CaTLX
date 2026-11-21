import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import Button from '../ui/Button';
import Modal from '../ui/Modal';
import { TLX_DIMENSIONS_INFO } from '../../constants';
import type { WorkspaceConflict } from '../../data/workspaceMerge';

const inputClass = 'w-full rounded-md bg-nasa-gray-900 border border-nasa-gray-600 p-2 text-white';

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
        {error && <p role="alert" className="text-red-300">{t('offline.unlock_failed')}</p>}
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
      {error && <p role="alert" className="text-red-300">{t('offline.invalid_resolution')}</p>}
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
