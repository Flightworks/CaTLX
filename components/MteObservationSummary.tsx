import { useTranslation } from 'react-i18next';
import type { MteObservation } from '../types';

export function useMteRateFormat() {
  const { i18n } = useTranslation();
  return new Intl.NumberFormat(i18n.resolvedLanguage, { style: 'percent', maximumFractionDigits: 2 });
}

export function MteObservationSummary({ observations }: { observations?: MteObservation[] }) {
  const { t } = useTranslation();
  const percent = useMteRateFormat();
  if (!observations?.length) return null;

  return <div className="space-y-1 text-xs">
    <p className="font-semibold text-foreground">{t('mte_observation.title')}</p>
    <dl className="space-y-1">
      {observations.map(({ criterion, score, errors, opportunities }) => (
        <div key={criterion.id} className="break-words">
          <dt className="font-medium text-foreground">{criterion.label}</dt>
          <dd className="text-nasa-gray-300">
            {criterion.instructions && <span className="block whitespace-pre-wrap">{criterion.instructions}</span>}
            {criterion.type === 'score' && score !== undefined && t(`mte_observation.score_${score}`)}
            {criterion.type === 'errorRate' && errors !== undefined && opportunities !== undefined && <>
              {opportunities ? percent.format(errors / opportunities) : t('mte_observation.not_observed')}
              {' · '}{t('mte_observation.counts', { errors, opportunities })}
              {criterion.maxErrorRate !== undefined && ` · ${t('mte_observation.target', { rate: percent.format(criterion.maxErrorRate / 100) })}`}
            </>}
          </dd>
        </div>
      ))}
    </dl>
  </div>;
}
