import { useId, useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { indexMtePaths, mteBranchReferences, MteReferenceError } from '../../data/mte';
import { newId } from '../../data/workspace';
import type { IDataSource, MTE, MteCriterion } from '../../types';
import Button from '../ui/Button';

type MteInput = Parameters<IDataSource['saveMte']>[0];
type CriterionDraft = Omit<MteCriterion, 'maxErrorRate'> & { maxErrorRate: string };

const field = 'mt-1 block w-full rounded-md border-nasa-gray-600 bg-nasa-gray-700 text-foreground shadow-sm focus:border-nasa-blue focus:ring-nasa-blue';
const label = 'block text-sm font-medium text-nasa-gray-300';

interface MteFormProps {
  mte?: MTE;
  mtes: MTE[];
  paths: ReadonlyMap<string, MTE[]>;
  initialReference?: string;
  requireReference?: boolean;
  onSave: (input: MteInput) => Promise<void>;
  onCancel: () => void;
}

export default function MteForm({ mte, mtes, paths, initialReference, requireReference, onSave, onCancel }: MteFormProps) {
  const { t } = useTranslation();
  const formId = useId();
  const [name, setName] = useState(mte?.name ?? '');
  const [description, setDescription] = useState(mte?.description ?? '');
  const [refNumber, setRefNumber] = useState(mte?.refNumber ?? initialReference ?? '');
  const [criteria, setCriteria] = useState<CriterionDraft[]>(() => (mte?.criteria ?? []).map(criterion => ({
    ...criterion,
    maxErrorRate: criterion.maxErrorRate?.toString() ?? '',
  })));
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const reference = refNumber.trim();
  const required = !mte || Boolean(mte.refNumber) || requireReference;
  const draft = { ...mte, id: mte?.id ?? formId, name, refNumber: reference, description };
  const draftPaths = indexMtePaths([...mtes.filter(entry => entry.id !== draft.id), draft]);
  const parent = reference ? draftPaths.get(draft.id)?.at(-2) : undefined;
  const renumbered = mte && reference ? mteBranchReferences(paths, mte, reference).size - 1 : 0;

  function updateCriterion(id: string, changes: Partial<CriterionDraft>) {
    setCriteria(current => current.map(criterion => criterion.id === id ? { ...criterion, ...changes } : criterion));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving || !name.trim() || (required && !reference)) return;
    setSaving(true);
    setSaveError('');
    try {
      await onSave({
        ...mte,
        name,
        description,
        refNumber: reference,
        criteria: criteria.map(({ maxErrorRate, ...criterion }) => ({
          ...criterion,
          maxErrorRate: criterion.type === 'errorRate' && maxErrorRate !== '' ? Number(maxErrorRate) : undefined,
        })),
      });
    } catch (error) {
      setSaveError(error instanceof MteReferenceError ? `catalog.reference_${error.reason}` : 'catalog.save_error');
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <fieldset disabled={saving} className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-[minmax(8rem,1fr)_minmax(0,2fr)]">
          <div>
            <label htmlFor={`${formId}-ref`} className={label}>{t('catalog.reference')}</label>
            <input id={`${formId}-ref`} className={field} value={refNumber} onChange={event => setRefNumber(event.target.value)}
              required={required} autoFocus={!initialReference} autoComplete="off" spellCheck={false} />
          </div>
          <div>
            <label htmlFor={`${formId}-name`} className={label}>{t('catalog.task_name')}</label>
            <input id={`${formId}-name`} className={field} value={name} onChange={event => setName(event.target.value)}
              required autoFocus={Boolean(initialReference)} />
          </div>
        </div>
        {parent && <p className="break-words text-sm text-nasa-gray-300">
          {t('catalog.child_of', { reference: parent.refNumber || parent.name })}
        </p>}
        {renumbered > 0 && <p className="text-sm text-nasa-gray-300">{t('catalog.renumber', { count: renumbered })}</p>}
        <details className="rounded-lg border border-separator px-3 py-2.5"
          onInvalid={event => { event.currentTarget.open = true; }}>
          <summary className="cursor-pointer text-sm font-medium text-accent-ink">{t('catalog.optional_details')}</summary>
          <div className="mt-3 space-y-3">
            <div>
              <label htmlFor={`${formId}-description`} className={label}>{t('evaluator.description')}</label>
              <textarea id={`${formId}-description`} className={field} value={description}
                onChange={event => setDescription(event.target.value)} rows={2} />
            </div>
            <fieldset className="space-y-3 border-t border-separator pt-3">
              <legend className="pr-2 text-sm font-semibold text-foreground">{t('catalog.criteria')}</legend>
              {criteria.map(criterion => {
                const id = `${formId}-${criterion.id}`;
                return (
                  <div key={criterion.id} className="space-y-3 rounded-md border border-separator p-3">
                    <div className="flex items-end gap-2">
                      <div className="min-w-0 flex-1">
                        <label htmlFor={`${id}-label`} className={label}>{t('catalog.criterion_label')}</label>
                        <input
                          id={`${id}-label`}
                          className={field}
                          value={criterion.label}
                          onChange={event => updateCriterion(criterion.id, { label: event.target.value })}
                          required
                        />
                      </div>
                      <Button
                        type="button"
                        size="sm"
                        variant="secondary"
                        className="min-h-8"
                        onClick={() => setCriteria(current => current.filter(entry => entry.id !== criterion.id))}
                      >
                        {t('catalog.remove_criterion')}
                      </Button>
                    </div>
                    <div>
                      <label htmlFor={`${id}-type`} className={label}>{t('catalog.criterion_type')}</label>
                      <select
                        id={`${id}-type`}
                        className={field}
                        value={criterion.type}
                        aria-describedby={`${id}-hint`}
                        onChange={event => updateCriterion(criterion.id, { type: event.target.value as MteCriterion['type'] })}
                      >
                        <option value="score">{t('catalog.criterion_score')}</option>
                        <option value="errorRate">{t('catalog.criterion_error_rate')}</option>
                      </select>
                      <p id={`${id}-hint`} className="mt-1 text-xs text-nasa-gray-400">
                        {t(criterion.type === 'errorRate' ? 'catalog.error_rate_hint' : 'catalog.score_hint')}
                      </p>
                    </div>
                    <div>
                      <label htmlFor={`${id}-instructions`} className={label}>{t('catalog.criterion_instructions')}</label>
                      <textarea
                        id={`${id}-instructions`}
                        className={field}
                        value={criterion.instructions}
                        onChange={event => updateCriterion(criterion.id, { instructions: event.target.value })}
                        rows={2}
                      />
                    </div>
                    {criterion.type === 'errorRate' && (
                      <div>
                        <label htmlFor={`${id}-max-error-rate`} className={label}>{t('catalog.max_error_rate')}</label>
                        <input
                          type="number"
                          id={`${id}-max-error-rate`}
                          className={`${field} max-w-36`}
                          min={0}
                          max={100}
                          step="any"
                          value={criterion.maxErrorRate}
                          onChange={event => updateCriterion(criterion.id, { maxErrorRate: event.target.value })}
                        />
                      </div>
                    )}
                  </div>
                );
              })}
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => {
                  const criterion: CriterionDraft = { id: newId(), label: '', instructions: '', type: 'score', maxErrorRate: '' };
                  setCriteria(current => [...current, criterion]);
                }}
              >
                {t('catalog.add_criterion')}
              </Button>
            </fieldset>
          </div>
        </details>
      </fieldset>
      {saveError && <p role="alert" className="text-sm text-danger-ink">{t(saveError)}</p>}
      <div className="flex justify-end gap-2">
        <Button type="button" variant="secondary" disabled={saving} onClick={onCancel}>{t('evaluator.cancel')}</Button>
        <Button type="submit" disabled={saving || !name.trim() || (required && !reference)}>{t('catalog.save')}</Button>
      </div>
    </form>
  );
}
