import { useId, useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { mtePath } from '../../data/mte';
import { newId } from '../../data/workspace';
import type { IDataSource, MTE, MteCriterion, MteLevel } from '../../types';
import Button from '../ui/Button';

type MteInput = Parameters<IDataSource['saveMte']>[0];
type CriterionDraft = Omit<MteCriterion, 'maxErrorRate'> & { maxErrorRate: string };

const field = 'mt-1 block w-full rounded-md border-nasa-gray-600 bg-nasa-gray-700 text-foreground shadow-sm focus:border-nasa-blue focus:ring-nasa-blue';
const label = 'block text-sm font-medium text-nasa-gray-300';

interface MteFormProps {
  mte?: MTE;
  mtes: ReadonlyMap<string, MTE>;
  initialLevel?: MteLevel;
  initialParentId?: string;
  onSave: (input: MteInput) => Promise<void>;
  onCancel: () => void;
}

export default function MteForm({ mte, mtes, initialLevel, initialParentId, onSave, onCancel }: MteFormProps) {
  const { t } = useTranslation();
  const formId = useId();
  const [name, setName] = useState(mte?.name ?? '');
  const [description, setDescription] = useState(mte?.description ?? '');
  const [refNumber, setRefNumber] = useState(mte?.refNumber ?? '');
  const [level, setLevel] = useState<MteLevel | ''>(mte?.level ?? initialLevel ?? '');
  const [parentId, setParentId] = useState(mte?.parentId ?? initialParentId ?? '');
  const [criteria, setCriteria] = useState<CriterionDraft[]>(() => (mte?.criteria ?? []).map(criterion => ({
    ...criterion,
    maxErrorRate: criterion.maxErrorRate?.toString() ?? '',
  })));
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(false);

  const hasChildren = !!mte && [...mtes.values()].some(entry => entry.parentId === mte.id);
  const parentLevel = level === 'general' ? 'phase' : level === 'detail' ? 'general' : undefined;
  const parentOptions = parentLevel ? [...mtes.values()].filter(entry => entry.level === parentLevel && entry.id !== mte?.id) : [];

  function updateCriterion(id: string, changes: Partial<CriterionDraft>) {
    setCriteria(current => current.map(criterion => criterion.id === id ? { ...criterion, ...changes } : criterion));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving) return;
    setSaving(true);
    setSaveError(false);
    try {
      await onSave({
        id: mte?.id,
        name,
        description,
        refNumber,
        level: level || undefined,
        parentId: parentLevel ? parentId : undefined,
        criteria: criteria.map(({ maxErrorRate, ...criterion }) => ({
          ...criterion,
          maxErrorRate: criterion.type === 'errorRate' && maxErrorRate !== '' ? Number(maxErrorRate) : undefined,
        })),
      });
    } catch {
      setSaveError(true);
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <fieldset disabled={saving} className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_8rem]">
          <div>
            <label htmlFor={`${formId}-name`} className={label}>{t('evaluator.name')}</label>
            <input id={`${formId}-name`} className={field} value={name} onChange={event => setName(event.target.value)} required />
          </div>
          <div>
            <label htmlFor={`${formId}-ref`} className={label}>{t('evaluator.ref_number')}</label>
            <input id={`${formId}-ref`} className={field} value={refNumber} onChange={event => setRefNumber(event.target.value)} />
          </div>
        </div>
        <div>
          <label htmlFor={`${formId}-level`} className={label}>{t('catalog.level')}</label>
          <select
            id={`${formId}-level`}
            className={field}
            value={level}
            disabled={hasChildren}
            aria-describedby={hasChildren ? `${formId}-level-help` : undefined}
            onChange={event => {
              setLevel(event.target.value as MteLevel | '');
              setParentId('');
            }}
          >
            <option value="">{t('catalog.level_standalone')}</option>
            <option value="phase">{t('catalog.level_phase')}</option>
            <option value="general">{t('catalog.level_general')}</option>
            <option value="detail">{t('catalog.level_detail')}</option>
          </select>
          {hasChildren && <p id={`${formId}-level-help`} className="mt-1 text-xs text-nasa-gray-400">{t('catalog.level_locked')}</p>}
        </div>
        {parentLevel && (
          <div>
            <label htmlFor={`${formId}-parent`} className={label}>{t(`catalog.parent_${parentLevel}`)}</label>
            <select
              id={`${formId}-parent`}
              className={field}
              value={parentId}
              onChange={event => setParentId(event.target.value)}
              aria-describedby={parentOptions.length === 0 ? `${formId}-parent-help` : undefined}
              required
            >
              <option value="">{t('passages.choose')}</option>
              {parentOptions.map(parent => (
                <option key={parent.id} value={parent.id}>
                  {mtePath(parent, mtes).map(entry => entry.refNumber ? `${entry.name} (${entry.refNumber})` : entry.name).join(' › ')}
                </option>
              ))}
            </select>
            {parentOptions.length === 0 && <p id={`${formId}-parent-help`} className="mt-1 text-xs text-nasa-gray-400">{t('catalog.no_parent_available')}</p>}
          </div>
        )}
        <div>
          <label htmlFor={`${formId}-description`} className={label}>{t('evaluator.optional_description')}</label>
          <textarea
            id={`${formId}-description`}
            className={field}
            value={description}
            onChange={event => setDescription(event.target.value)}
            rows={3}
          />
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
      </fieldset>
      {saveError && <p role="alert" className="text-sm text-danger-ink">{t('catalog.save_error')}</p>}
      <div className="flex justify-end gap-2">
        <Button type="button" variant="secondary" disabled={saving} onClick={onCancel}>{t('evaluator.cancel')}</Button>
        <Button type="submit" disabled={saving}>{t('catalog.save')}</Button>
      </div>
    </form>
  );
}
