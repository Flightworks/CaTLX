import { useId } from 'react';
import { useTranslation } from 'react-i18next';
import type { MteCriterion, MteObservation } from '../types';
import { useMteRateFormat } from './MteObservationSummary';

type Draft = Partial<Record<'score' | 'errors' | 'opportunities', string>>;
export type ObservationDrafts = Map<string, Draft>;
const scoreOptions = [1, 2, 3, 4, 5];

export function observationDrafts(observations: MteObservation[] = []): ObservationDrafts {
  return new Map(observations.map(({ criterion, score, errors, opportunities }) => [criterion.id, {
    score: score?.toString(),
    errors: errors?.toString(),
    opportunities: opportunities?.toString(),
  }]));
}

function readCounts(draft?: Draft) {
  const errorText = draft?.errors?.trim() ?? '';
  const opportunityText = draft?.opportunities?.trim() ?? '';
  if (!errorText && !opportunityText) return;
  const errors = Number(errorText);
  const opportunities = Number(opportunityText);
  if (!/^\d+$/.test(errorText) || !/^\d+$/.test(opportunityText) ||
      !Number.isSafeInteger(errors) || !Number.isSafeInteger(opportunities) || errors > opportunities) return null;
  return { errors, opportunities };
}

export function readObservations(criteria: MteCriterion[], drafts: ObservationDrafts) {
  const results: MteObservation[] = [];
  for (const criterion of criteria) {
    const draft = drafts.get(criterion.id);
    if (criterion.type === 'score') {
      if (draft?.score) results.push({ criterion, score: Number(draft.score) });
    } else {
      const counts = readCounts(draft);
      if (counts === null) return null;
      if (counts) results.push({ criterion, ...counts });
    }
  }
  return results;
}

export default function MteObserverFields({ criteria, drafts, open, onOpenChange, onChange, validate, disabled, fieldClass }: {
  criteria: MteCriterion[];
  drafts: ObservationDrafts;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onChange: (id: string, field: keyof Draft, value: string) => void;
  validate: boolean;
  disabled: boolean;
  fieldClass: string;
}) {
  const { t } = useTranslation();
  const percent = useMteRateFormat();
  const id = useId();

  return <details open={open} onToggle={event => onOpenChange(event.currentTarget.open)}
    className="space-y-2 rounded-md border border-separator px-2.5 py-2">
    <summary className="w-fit cursor-pointer rounded text-sm font-semibold text-accent-ink focus-visible:outline focus-visible:outline-2">
      {t('mte_observation.optional_title')}
    </summary>
    <p className="text-xs text-nasa-gray-300">{t('mte_observation.hint')}</p>
    {criteria.map((criterion, index) => {
      const draft = drafts.get(criterion.id);
      const counts = criterion.type === 'errorRate' ? readCounts(draft) : undefined;
      const invalid = counts === null && validate;
      const errorId = `${id}-count-error-${index}`;
      return <fieldset key={criterion.id} disabled={disabled} className="space-y-1.5 rounded-md border border-separator px-2.5 pb-2">
        <legend className="max-w-full break-words px-1 text-sm font-medium">{criterion.label}</legend>
        {criterion.instructions && <p className="whitespace-pre-wrap break-words text-xs text-nasa-gray-300">{criterion.instructions}</p>}
        {criterion.type === 'score' ? (
          <div className="max-w-xs space-y-0.5 text-xs">
            <label htmlFor={`${id}-score-${index}`}>{t('mte_observation.score')}</label>
            <select id={`${id}-score-${index}`} className={fieldClass} value={draft?.score ?? ''}
              onChange={event => onChange(criterion.id, 'score', event.target.value)}>
              <option value="">{t('mte_observation.not_observed')}</option>
              {scoreOptions.map(score => <option key={score} value={score}>{t(`mte_observation.score_${score}`)}</option>)}
            </select>
          </div>
        ) : <>
          <div className="grid max-w-sm grid-cols-2 gap-2">
            {(['errors', 'opportunities'] as const).map(field => <label className="min-w-0 space-y-0.5 text-xs" key={field}>
              <span className="block">{t(`mte_observation.${field}`)}</span>
              <input className={fieldClass} inputMode="numeric" value={draft?.[field] ?? ''} aria-invalid={invalid || undefined}
                aria-describedby={invalid ? errorId : undefined} onChange={event => onChange(criterion.id, field, event.target.value)} />
            </label>)}
          </div>
          {invalid && <p id={errorId} role="alert" className="text-xs text-danger-ink">{t('mte_observation.invalid_counts')}</p>}
          <p className="text-xs text-nasa-gray-300">
            {t('mte_observation.rate')} · <span aria-live="polite" className="font-medium tabular-nums text-foreground">
              {counts?.opportunities ? percent.format(counts.errors / counts.opportunities) : t('mte_observation.not_observed')}
            </span>
            {criterion.maxErrorRate !== undefined && ` · ${t('mte_observation.target', { rate: percent.format(criterion.maxErrorRate / 100) })}`}
          </p>
        </>}
      </fieldset>;
    })}
  </details>;
}
