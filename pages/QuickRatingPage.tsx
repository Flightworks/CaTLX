
import React, { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { TLXDimension } from '../types';
import { TLX_DIMENSIONS_INFO, PAIRWISE_COMBINATIONS, DEFAULT_WEIGHTS } from '../constants';
import ExpressTlxControl from '../components/ui/ExpressTlxControl';
import Button from '../components/ui/Button';
import { downloadCsv } from '../data/csv';
import ToggleSwitch from '../components/ui/ToggleSwitch';

const initialScores = TLX_DIMENSIONS_INFO.reduce((acc, dim) => {
    acc[dim.id] = 50;
    return acc;
}, {} as Record<TLXDimension, number>);

const dimensionKey = (id: TLXDimension) => id.toLowerCase().replaceAll(' ', '_');

const getScoreColor = (score: number): string => {
    const green = [74, 222, 128];
    const blue = [96, 165, 250];
    const red = [248, 113, 113];

    let r, g, b;

    if (score <= 50) {
        const t = score / 50;
        r = Math.round(green[0] + t * (blue[0] - green[0]));
        g = Math.round(green[1] + t * (blue[1] - green[1]));
        b = Math.round(green[2] + t * (blue[2] - green[2]));
    } else {
        const t = (score - 50) / 50;
        r = Math.round(blue[0] + t * (red[0] - blue[0]));
        g = Math.round(blue[1] + t * (red[1] - blue[1]));
        b = Math.round(blue[2] + t * (red[2] - blue[2]));
    }

    return `rgb(${r}, ${g}, ${b})`;
};

const PairwiseComparisonView: React.FC<{
    onSubmit: (weights: Record<TLXDimension, number>, isWeighted: boolean) => void;
    onCancel: () => void;
}> = ({ onSubmit, onCancel }) => {
    const { t } = useTranslation();
    const [currentPairIndex, setCurrentPairIndex] = useState(0);
    const [selections, setSelections] = useState<Record<string, TLXDimension | null>>({});

    const handleSubmit = (finalSelections: Record<string, TLXDimension | null>) => {
        const weights = TLX_DIMENSIONS_INFO.reduce((acc, dim) => {
            acc[dim.id] = 0;
            return acc;
        }, {} as Record<TLXDimension, number>);

        (Object.values(finalSelections) as (TLXDimension | null)[]).forEach(dim => {
            if (dim) {
                weights[dim]++;
            }
        });
        onSubmit(weights, true);
    };

    const handleSelect = (dimension: TLXDimension) => {
        const newSelections = { ...selections, [currentPairIndex]: dimension };
        setSelections(newSelections);

        if (currentPairIndex < PAIRWISE_COMBINATIONS.length - 1) {
            setCurrentPairIndex(prev => prev + 1);
        } else {
            handleSubmit(newSelections);
        }
    };

    const currentPair = PAIRWISE_COMBINATIONS[currentPairIndex];
    const dimensionA = TLX_DIMENSIONS_INFO.find(d => d.id === currentPair[0]);
    const dimensionB = TLX_DIMENSIONS_INFO.find(d => d.id === currentPair[1]);
    const progress = ((currentPairIndex + 1) / PAIRWISE_COMBINATIONS.length) * 100;

    if (!dimensionA || !dimensionB) return null;

    return (
        <section data-workspace-surface className="mx-auto max-w-3xl space-y-4 rounded-lg border border-separator bg-nasa-gray-800 p-4 sm:p-5">
            <header className="space-y-1">
                <h1 className="text-xl font-semibold tracking-tight text-foreground">{t('evaluator.determine_weights')}</h1>
                <p className="text-sm leading-relaxed text-nasa-gray-400">{t('evaluator.weights_description')}</p>
            </header>
            <div className="space-y-1.5">
                <p className="text-xs font-medium tabular-nums text-accent-ink" aria-live="polite">
                    {t('evaluator.comparison', { current: currentPairIndex + 1, total: PAIRWISE_COMBINATIONS.length })}
                </p>
                <div className="h-1 overflow-hidden rounded-full bg-nasa-gray-700" aria-hidden="true">
                    <div className="h-full rounded-full bg-accent-ink transition-[width] motion-reduce:transition-none" style={{ width: `${progress}%` }} />
                </div>
            </div>
            <div className="space-y-2">
                <h2 className="text-sm font-semibold text-foreground">{t('evaluator.which_workload')}</h2>
                <div className="grid gap-2 sm:grid-cols-2">
                    {[dimensionA, dimensionB].map(({ id }, position) => (
                        <button
                            key={position}
                            type="button"
                            className="group rounded-md border border-separator bg-nasa-gray-900 px-3 py-2.5 text-left transition-colors hover:border-accent-ink hover:bg-hover-surface focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-accent-ink"
                            aria-labelledby={`quick-pair-${position}-title`}
                            aria-describedby={`quick-pair-${position}-description`}
                            onClick={() => handleSelect(id)}
                        >
                            <span id={`quick-pair-${position}-title`} className="block text-sm font-semibold text-foreground group-hover:text-accent-ink">
                                {t(`tlx_dimensions.${dimensionKey(id)}.title`)}
                            </span>
                            <span id={`quick-pair-${position}-description`} className="mt-1 block text-xs leading-relaxed text-nasa-gray-400">
                                {t(`tlx_dimensions.${dimensionKey(id)}.description`)}
                            </span>
                        </button>
                    ))}
                </div>
            </div>
            <div className="flex justify-end">
                <Button onClick={onCancel} variant="secondary" size="sm">{t('evaluator.cancel')}</Button>
            </div>
        </section>
    );
};

const QuickRatingPage: React.FC = () => {
    const { t } = useTranslation();

    const [scores, setScores] = useState<Record<TLXDimension, number>>(initialScores);
    const [weights, setWeights] = useState<Record<TLXDimension, number>>(DEFAULT_WEIGHTS);
    const [isWeighted, setIsWeighted] = useState(false);
    const [view, setView] = useState<'rating' | 'pairwise'>('rating');

    const handleScoreChange = (dimension: TLXDimension, value: number) => {
        setScores(prev => ({ ...prev, [dimension]: value }));
    };

    const handlePairwiseSubmit = (newWeights: Record<TLXDimension, number>, weighted: boolean) => {
        setWeights(newWeights);
        setIsWeighted(weighted);
        setView('rating');
    };

    const totalWeightedScore = useMemo(() => {
        const currentWeights = isWeighted ? weights : DEFAULT_WEIGHTS;
        let totalScore = 0;
        let totalWeight = 0;

        for (const dimInfo of TLX_DIMENSIONS_INFO) {
            const weight = currentWeights[dimInfo.id];
            totalWeight += weight;
            totalScore += scores[dimInfo.id] * weight;
        }

        return totalWeight > 0 ? totalScore / totalWeight : 0;
    }, [scores, weights, isWeighted]);

    if (view === 'pairwise') {
        return <PairwiseComparisonView onSubmit={handlePairwiseSubmit} onCancel={() => setView('rating')} />;
    }

    function exportRating() {
        const activeWeights = isWeighted ? weights : DEFAULT_WEIGHTS;
        downloadCsv('catlx-quick-rating.csv', [
            [t('quick_rating.title'), t('evaluator.raw_scores'), t('evaluator.weights')],
            ...TLX_DIMENSIONS_INFO.map(({ id }) => [
                t(`tlx_dimensions.${dimensionKey(id)}.title`), scores[id], activeWeights[id],
            ]),
            [t('evaluator.total_score'), totalWeightedScore.toFixed(2), ''],
        ]);
    }

    return (
        <div className="w-full max-w-5xl space-y-4">
            <header className="space-y-1">
                <h1 className="text-2xl font-semibold tracking-tight text-foreground">{t('quick_rating.title')}</h1>
                <p className="text-sm text-nasa-gray-400">{t('quick_rating.description')}</p>
            </header>

            <div className="grid items-start gap-3 lg:grid-cols-[minmax(0,1fr)_17rem]">
                <fieldset className="grid min-w-0 gap-px overflow-hidden rounded-lg border border-separator bg-separator min-[320px]:grid-cols-2">
                    <legend className="sr-only">{t('quick_rating.title')}</legend>
                    {TLX_DIMENSIONS_INFO.map(({ id }) => {
                        const key = `tlx_dimensions.${dimensionKey(id)}`;
                        return (
                            <ExpressTlxControl
                                key={id}
                                title={t(`${key}.title`)}
                                lowAnchor={t(`${key}.low_anchor`)}
                                highAnchor={t(`${key}.high_anchor`)}
                                value={scores[id]}
                                onChange={value => handleScoreChange(id, value)}
                            />
                        );
                    })}
                </fieldset>

                <section data-workspace-surface aria-labelledby="quick-rating-result"
                    className="min-w-0 rounded-lg border border-separator bg-nasa-gray-800">
                    <div className="flex flex-wrap items-center justify-between gap-2 p-3 lg:block lg:space-y-2.5">
                        <div>
                            <h2 id="quick-rating-result" className="text-sm font-medium text-nasa-gray-400">{t('evaluator.overall_workload')}</h2>
                            <div className="mt-1 flex items-baseline gap-1.5">
                                <output className="text-3xl font-semibold leading-none tracking-tight tabular-nums"
                                    data-score-tone style={{ color: getScoreColor(totalWeightedScore) }}>
                                    {totalWeightedScore.toFixed(2)}
                                </output>
                                <span className="text-xs text-nasa-gray-400">/ 100</span>
                            </div>
                        </div>
                        <Button onClick={exportRating} variant="secondary" size="sm">{t('quick_rating.export_csv')}</Button>
                    </div>

                    <div className="space-y-2 border-t border-separator p-3">
                        <ToggleSwitch
                            label={t('evaluator.weights')}
                            options={[
                                { value: 'unweighted', label: t('evaluator.unweighted') },
                                { value: 'weighted', label: t('evaluator.weighted') },
                            ]}
                            selectedValue={isWeighted ? 'weighted' : 'unweighted'}
                            onChange={value => setIsWeighted(value === 'weighted')}
                        />

                        {isWeighted && (
                            <dl className="space-y-1 rounded-md bg-nasa-gray-900 px-2.5 py-2 text-xs">
                                {TLX_DIMENSIONS_INFO.map(({ id }) => (
                                    <div key={id} className="flex items-baseline justify-between gap-2">
                                        <dt className="text-nasa-gray-300">{t(`tlx_dimensions.${dimensionKey(id)}.title`)}</dt>
                                        <dd className="font-semibold tabular-nums text-foreground">{weights[id]}</dd>
                                    </div>
                                ))}
                            </dl>
                        )}

                        <div className="flex flex-wrap gap-2">
                            <Button variant="secondary" size="sm" onClick={() => setView('pairwise')}>
                                {t('evaluator.determine_weights')}
                            </Button>
                            {isWeighted && (
                                <Button variant="secondary" size="sm" onClick={() => {
                                    setWeights(DEFAULT_WEIGHTS);
                                    setIsWeighted(false);
                                }}>
                                    {t('evaluator.reset_weights')}
                                </Button>
                            )}
                        </div>
                    </div>
                </section>
            </div>
        </div>
    );
};

export default QuickRatingPage;
