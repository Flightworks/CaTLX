import { useId, useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { mtePath } from '../../data/mte';
import type { MTE } from '../../types';
import Button from '../ui/Button';
import Select from '../ui/Select';

interface Props {
  mtes: ReadonlyMap<string, MTE>;
  available: MTE[];
  mte?: MTE;
  parent?: MTE;
  onSave: (mte: MTE, parent: MTE) => Promise<void>;
  onCancel: () => void;
}

export default function MteAttachmentForm({ mtes, available, mte, parent, onSave, onCancel }: Props) {
  const { t } = useTranslation();
  const id = useId();
  const [mteId, setMteId] = useState(mte?.id ?? '');
  const [parentId, setParentId] = useState(parent?.id ?? '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(false);
  const selected = available.find(entry => entry.id === mteId);
  const destination = mtes.get(parentId);

  function path(entry: MTE, withReference = false) {
    return mtePath(entry, mtes).map(item => withReference && item.refNumber ? `${item.name} (${item.refNumber})` : item.name).join(' › ');
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving || !selected || !destination) return;
    setSaving(true);
    setError(false);
    try {
      await onSave(selected, destination);
    } catch {
      setError(true);
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <fieldset disabled={saving} className="space-y-3">
        {mte ? <p className="break-words text-sm font-semibold">{mte.name}</p> : (
          <Select id={`${id}-mte`} label={t('catalog.choose_mte')} value={mteId} required autoFocus
            onChange={event => setMteId(event.target.value)}>
            <option value="">{t('passages.choose')}</option>
            {available.map(entry => <option key={entry.id} value={entry.id}>
              {entry.refNumber ? `[${entry.refNumber}] ${entry.name}` : entry.name}
            </option>)}
          </Select>
        )}
        {parent ? <p className="break-words rounded-md border border-separator bg-nasa-gray-900 px-3 py-2 text-sm text-nasa-gray-300">
          {t('catalog.under', { path: path(parent) })}
        </p> : (
          <Select id={`${id}-parent`} label={t('catalog.attach_destination')} value={parentId} required autoFocus
            onChange={event => setParentId(event.target.value)}>
            <option value="">{t('passages.choose')}</option>
            {[...mtes.values()].filter(entry => entry.level === 'phase' || entry.level === 'general')
              .map(entry => ({ id: entry.id, path: path(entry, true) })).sort((a, b) => a.path.localeCompare(b.path))
              .map(entry => <option key={entry.id} value={entry.id}>{entry.path}</option>)}
          </Select>
        )}
      </fieldset>
      {error && <p role="alert" className="text-sm text-danger-ink">{t('catalog.save_error')}</p>}
      <div className="flex flex-wrap justify-end gap-2">
        <Button type="button" variant="secondary" disabled={saving} onClick={onCancel}>{t('evaluator.cancel')}</Button>
        <Button type="submit" disabled={saving || !selected || !destination}>{t('catalog.attach')}</Button>
      </div>
    </form>
  );
}
