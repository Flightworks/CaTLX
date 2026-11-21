import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useData } from '../contexts/AppContext';
import { TLXDimension, type MTE, type Scenario, type Study } from '../types';
import { TLX_DIMENSIONS_INFO, PAIRWISE_COMBINATIONS, DEFAULT_WEIGHTS } from '../constants';
import { latestRating } from '../data/workspace';
import ExpressTlxControl from '../components/ui/ExpressTlxControl';
import TlxSlider from '../components/ui/TlxSlider';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import PairwiseWeightsDisplay from '../components/ui/PairwiseWeightsDisplay';
import ToggleSwitch from '../components/ui/ToggleSwitch';

const initialScores = Object.fromEntries(TLX_DIMENSIONS_INFO.map(dim => [dim.id, 50])) as Record<TLXDimension, number>;
const fieldClass = 'w-full rounded-md bg-nasa-gray-900 border border-nasa-gray-600 p-2 text-foreground';

function dimensionKey(id: TLXDimension) {
    return id.toLowerCase().replaceAll(' ', '_');
}

const PairwiseComparisonView: React.FC<{
    onSubmit: (weights: Record<TLXDimension, number>, isWeighted: boolean) => void;
    onComplete: () => void;
    onCancel: () => void;
}> = ({ onSubmit, onComplete, onCancel }) => {
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
        onComplete();
    };

    const handleSelect = (dimension: TLXDimension) => {
        const newSelections = { ...selections, [currentPairIndex]: dimension };
        setSelections(newSelections);

        if (currentPairIndex < PAIRWISE_COMBINATIONS.length - 1) {
            setCurrentPairIndex(prev => prev + 1);
        } else {
            // Last selection made, submit automatically
            handleSubmit(newSelections);
        }
    };

    const handleSkip = () => {
        onSubmit(DEFAULT_WEIGHTS, false);
        onComplete();
    }

    const currentPair = PAIRWISE_COMBINATIONS[currentPairIndex];
    const dimensionA = TLX_DIMENSIONS_INFO.find(d => d.id === currentPair[0]);
    const dimensionB = TLX_DIMENSIONS_INFO.find(d => d.id === currentPair[1]);
    const progress = ((currentPairIndex + 1) / PAIRWISE_COMBINATIONS.length) * 100;

    if (!dimensionA || !dimensionB) return null; // Should not happen

    const DimensionCard: React.FC<{ dimension: typeof dimensionA, onSelect: () => void }> = ({ dimension, onSelect }) => (
        <div
            onClick={onSelect}
            className="w-full sm:w-1/2 p-6 bg-nasa-gray-900 rounded-lg cursor-pointer transition-all duration-200 ease-in-out hover:bg-nasa-gray-700 hover:shadow-2xl hover:scale-105 border-2 border-nasa-gray-700 hover:border-nasa-blue"
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onSelect();
                }
            }}
            aria-label={t(`tlx_dimensions.${dimensionKey(dimension.id)}.title`)}
        >
            <h3 className="text-xl font-bold text-center text-foreground">{t(`tlx_dimensions.${dimension.id.toLowerCase().replace(/ /g, '_')}.title`)}</h3>
            <p className="text-sm text-nasa-gray-400 mt-2 text-center">{t(`tlx_dimensions.${dimension.id.toLowerCase().replace(/ /g, '_')}.description`)}</p>
        </div>
    );

    return (
        <Card title={t('evaluator.determine_weights')}>
            <div className="space-y-6">
                <div>
                    <p className="text-nasa-gray-300 mb-4 text-center">{t('evaluator.weights_description')}</p>
                </div>

                {/* Progress Bar */}
                <div>
                    <div className="flex justify-between mb-1">
                        <span className="text-base font-medium text-accent-ink">{t('evaluator.comparison', { current: currentPairIndex + 1, total: PAIRWISE_COMBINATIONS.length })}</span>
                    </div>
                    <div className="w-full bg-nasa-gray-700 rounded-full h-2.5">
                        <div className="bg-nasa-blue h-2.5 rounded-full transition-all duration-300 ease-in-out" style={{ width: `${progress}%` }}></div>
                    </div>
                </div>

                {/* Comparison Section */}
                <div className="text-center">
                    <h2 className="text-lg font-semibold text-foreground mb-4">{t('evaluator.which_workload')}</h2>
                    <div className="flex flex-col sm:flex-row items-stretch justify-center gap-4">
                        <DimensionCard dimension={dimensionA} onSelect={() => handleSelect(dimensionA.id)} />
                        <DimensionCard dimension={dimensionB} onSelect={() => handleSelect(dimensionB.id)} />
                    </div>
                </div>
            </div>

            <div className="flex flex-wrap justify-center gap-3 mt-8 pt-4 border-t border-nasa-gray-700">
                <Button onClick={onCancel} variant="secondary">{t('evaluator.cancel')}</Button>
                <Button onClick={handleSkip} variant="secondary" className="w-full sm:w-auto">{t('evaluator.skip_weighting')}</Button>
            </div>
        </Card>
    );
};

function RatingForm({ study, scenario, evaluatorId, task, submitLabel, onClose }: {
    study: Study;
    scenario?: Scenario;
    evaluatorId: string;
    task: MTE;
    submitLabel: string;
    onClose: (saved?: boolean) => void;
}) {
    const { t, i18n } = useTranslation();
    const { ratings, saveRating, pairwiseComparisons } = useData();
    const context = { studyId: study.id, scenarioId: scenario?.id, evaluatorId, mteId: task.id };
    const existing = latestRating(ratings, context);
    const [scores, setScores] = useState(existing?.scores ?? initialScores);
    const [comments, setComments] = useState(existing?.comments ?? '');
    const [mode, setMode] = useState<'express' | 'step-by-step'>(() =>
        localStorage.getItem('catlx_rating_mode') === 'step-by-step' ? 'step-by-step' : 'express');
    const [step, setStep] = useState(0);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState(false);
    const isExpress = mode === 'express';
    const lastStep = TLX_DIMENSIONS_INFO.length;
    const assigned = (scenario?.mteIds ?? study.mteIds).includes(task.id);

    const comparison = pairwiseComparisons.find(entry => entry.studyId === study.id && entry.evaluatorId === evaluatorId);
    const weights = comparison?.isWeighted ? comparison.weights : DEFAULT_WEIGHTS;
    const totalWeight = Object.values(weights).reduce((sum, weight) => sum + weight, 0);
    const overallScore = totalWeight > 0
        ? TLX_DIMENSIONS_INFO.reduce((sum, dim) => sum + scores[dim.id] * weights[dim.id], 0) / totalWeight
        : 0;
    const scoreLabel = new Intl.NumberFormat(i18n.resolvedLanguage, { maximumFractionDigits: 1 }).format(overallScore);

    async function submit(event: React.FormEvent) {
        event.preventDefault();
        if (saving || (!isExpress && step < lastStep)) return;
        setSaving(true);
        setError(false);
        try {
            await saveRating({ ...context, scores, comments: comments.trim() || undefined });
            onClose(true);
        } catch {
            setError(true);
        } finally {
            setSaving(false);
        }
    }

    return (
        <section className="rounded-xl border border-nasa-gray-700 bg-nasa-gray-800 px-3 py-3 sm:px-5 sm:py-4">
            <div className="mb-3 flex items-start justify-between gap-3">
                <div className="min-w-0">
                    {task.refNumber && <p className="text-xs font-medium tabular-nums text-accent-ink">{task.refNumber}</p>}
                    <h2 className="break-words text-lg font-semibold leading-tight sm:text-xl">{task.name}</h2>
                    {task.description && <p className="mt-1 text-sm text-nasa-gray-300">{task.description}</p>}
                </div>
                {isExpress && (
                    <div className="shrink-0 rounded-lg border border-blue-400/25 bg-blue-400/10 px-2.5 py-1.5 text-right sm:px-3">
                        <p className="text-xs font-medium text-accent-ink">{t('evaluator.total_score')}</p>
                        <p className="text-xl font-semibold leading-tight tabular-nums text-foreground">
                            {scoreLabel}<span className="ml-1 text-xs font-normal text-nasa-gray-300">/ 100</span>
                        </p>
                    </div>
                )}
            </div>
            {!assigned && <p className="mb-3 text-sm">{t('projects.add_on_save')}</p>}
            <ToggleSwitch
                label={t('evaluator.rating_mode')}
                options={['express', 'step-by-step'].map(value => ({
                    value, label: t(value === 'express' ? 'evaluator.express' : 'evaluator.step_by_step'),
                }))}
                selectedValue={mode}
                onChange={value => {
                    const nextMode = value === 'express' ? 'express' : 'step-by-step';
                    setMode(nextMode);
                    setStep(0);
                    localStorage.setItem('catlx_rating_mode', nextMode);
                }}
            />
            <form onSubmit={submit} className="mt-3 space-y-3">
                {error && <p role="alert" className="text-danger-ink">{t('evaluator.error_submitting')}</p>}
                <fieldset disabled={saving} className={isExpress
                    ? 'grid gap-px overflow-hidden rounded-lg border border-nasa-gray-700 bg-nasa-gray-700 min-[320px]:grid-cols-2 lg:grid-cols-3'
                    : 'space-y-3'}>
                    {TLX_DIMENSIONS_INFO.filter((_, index) => isExpress || index === step).map(dim => {
                        const key = `tlx_dimensions.${dimensionKey(dim.id)}`;
                        const props = {
                            title: t(`${key}.title`),
                            lowAnchor: t(`${key}.low_anchor`),
                            highAnchor: t(`${key}.high_anchor`),
                            value: scores[dim.id],
                            onChange: (value: number) => setScores(current => ({ ...current, [dim.id]: value })),
                        };
                        return isExpress ? <ExpressTlxControl key={dim.id} {...props} />
                            : <TlxSlider key={dim.id} {...props} description={t(`${key}.description`)} />;
                    })}
                </fieldset>
                {isExpress ? (
                    <details open={existing?.comments ? true : undefined}>
                        <summary className="w-fit cursor-pointer rounded text-sm text-accent-ink focus-visible:outline focus-visible:outline-2">
                            {t('evaluator.optional_comments')}
                        </summary>
                        <textarea className={`mt-2 ${fieldClass}`} aria-label={t('evaluator.optional_comments')}
                            value={comments} rows={2} disabled={saving} onChange={event => setComments(event.target.value)} />
                    </details>
                ) : step === lastStep && (
                    <label className="block space-y-2">
                        <span className="block">{t('evaluator.optional_comments')}</span>
                        <textarea className={fieldClass} value={comments} rows={3} disabled={saving}
                            onChange={event => setComments(event.target.value)} />
                    </label>
                )}
                <div className="flex flex-wrap justify-between gap-2 border-t border-nasa-gray-700 pt-3">
                    <Button variant="secondary" type="button" onClick={() => onClose()} disabled={saving}>
                        {t('evaluator.back_to_tasks')}
                    </Button>
                    <div className="flex flex-wrap gap-2">
                        {!isExpress && step > 0 && (
                            <Button variant="secondary" type="button" onClick={() => setStep(step - 1)} disabled={saving}>
                                {t('evaluator.previous')}
                            </Button>
                        )}
                        {isExpress || step === lastStep ? (
                            <Button type="submit" disabled={saving}>
                                {t(saving ? 'evaluator.submitting' : submitLabel)}
                            </Button>
                        ) : (
                            <Button type="button" onClick={() => setStep(step + 1)}>
                                {t('evaluator.next', { current: step + 1, total: lastStep + 1 })}
                            </Button>
                        )}
                    </div>
                </div>
            </form>
        </section>
    );
}

export function AssessmentRunner({ study, scenario, evaluatorId }: {
    study: Study; scenario?: Scenario; evaluatorId: string;
}) {
    const { t } = useTranslation();
    const { mtes, ratings, pairwiseComparisons, addPairwiseComparison } = useData();
    const [taskId, setTaskId] = useState('');
    const [search, setSearch] = useState('');
    const [showCatalog, setShowCatalog] = useState(false);
    const [showWeights, setShowWeights] = useState(false);
    const [saved, setSaved] = useState(false);
    const comparison = pairwiseComparisons.find(entry => entry.studyId === study.id && entry.evaluatorId === evaluatorId);
    const context = { studyId: study.id, scenarioId: scenario?.id, evaluatorId };
    const task = mtes.find(entry => entry.id === taskId);
    const tasksById = new Map(mtes.map(entry => [entry.id, entry]));
    const assigned = [...new Set(scenario?.mteIds ?? study.mteIds)]
        .flatMap(id => tasksById.get(id) ?? []);
    const assignedIds = new Set(assigned.map(entry => entry.id));
    const scopeRatings = ratings.filter(rating => rating.studyId === study.id &&
        rating.scenarioId === scenario?.id && rating.evaluatorId === evaluatorId);
    const completedIds = new Set(scopeRatings.map(rating => rating.mteId));
    const query = search.trim().toLocaleLowerCase();
    const next = assigned.find(entry => !completedIds.has(entry.id));
    const following = assigned.find(entry => entry.id !== taskId && !completedIds.has(entry.id));
    const candidates = !scenario && showCatalog
        ? mtes.filter(entry => !assignedIds.has(entry.id)).sort((a, b) => a.name.localeCompare(b.name))
        : assigned;
    const tasks = candidates.filter(entry => `${entry.refNumber} ${entry.name}`.toLocaleLowerCase().includes(query));

    function openTask(id: string) {
        setSaved(false);
        setTaskId(id);
    }

    if (task && !scenario?.archived) {
        const activeStep = scenario && task.id === next?.id;
        const nextTask = activeStep ? following : undefined;
        const submitLabel = activeStep
            ? nextTask ? 'projects.save_and_next' : 'projects.finish_scenario'
            : 'projects.save_and_choose';
        return <RatingForm key={task.id} study={study} scenario={scenario} evaluatorId={evaluatorId}
            task={task} submitLabel={submitLabel} onClose={wasSaved => {
                setTaskId(wasSaved && nextTask ? nextTask.id : '');
                setSaved(Boolean(wasSaved));
                if (wasSaved && !scenario) {
                    setShowCatalog(false);
                    setSearch('');
                }
            }} />;
    }
    if (showWeights && !scenario?.archived) {
        return <PairwiseComparisonView
            onSubmit={(weights, isWeighted) => addPairwiseComparison({ studyId: study.id, evaluatorId, weights, isWeighted })}
            onComplete={() => setShowWeights(false)} onCancel={() => setShowWeights(false)} />;
    }

    return (
        <Card title={t(scenario ? 'projects.scenario_order' : 'projects.study_tasks')}>
            <div className="space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <p>{t('projects.progress', {
                        completed: [...assignedIds].filter(id => completedIds.has(id)).length, total: assignedIds.size,
                    })}</p>
                    {evaluatorId && !scenario?.archived && (
                        <Button variant="secondary" size="sm" onClick={() => setShowWeights(true)}>
                            {t('evaluator.determine_weights')}
                        </Button>
                    )}
                </div>
                {comparison?.isWeighted && (
                    <PairwiseWeightsDisplay weights={comparison.weights} isWeighted />
                )}
                {saved && <p role="status" className="text-success-ink">{t('projects.rating_saved')}</p>}
                {!evaluatorId && <p>{t('projects.choose_evaluator')}</p>}
                {scenario && evaluatorId && assigned.length > 0 && !scenario.archived && (
                    next ? (
                        <Button onClick={() => openTask(next.id)}>
                            {t(completedIds.size ? 'projects.resume_scenario' : 'projects.start_scenario')}
                        </Button>
                    ) : <p className="text-success-ink">{t('projects.scenario_complete')}</p>
                )}
                {!scenario && (
                    <div className="flex flex-wrap items-center gap-2">
                        <Button variant="secondary" size="sm" aria-pressed={showCatalog} onClick={() => {
                            setShowCatalog(!showCatalog);
                            setSearch('');
                        }}>
                            {t(showCatalog ? 'projects.study_tasks' : 'projects.open_catalog')}
                        </Button>
                        {showCatalog && <input type="search" aria-label={t('projects.search_tasks')} placeholder={t('projects.search_tasks')}
                            className={fieldClass} value={search} onChange={e => setSearch(e.target.value)} />}
                    </div>
                )}
                {tasks.map((entry, index) => {
                    const previous = latestRating(scopeRatings, { ...context, mteId: entry.id });
                    const weights = comparison?.isWeighted ? comparison.weights : DEFAULT_WEIGHTS;
                    const totalWeight = Object.values(weights).reduce((sum, weight) => sum + weight, 0);
                    const score = previous && totalWeight > 0 ? TLX_DIMENSIONS_INFO.reduce(
                        (sum, dim) => sum + previous.scores[dim.id] * weights[dim.id], 0) / totalWeight : null;
                    return (
                        <div className="flex flex-wrap items-center justify-between rounded-md bg-nasa-gray-900 p-3 gap-2" key={entry.id}>
                            <div>
                                <p className="font-semibold">{scenario && `${index + 1}. `}{entry.refNumber && `[${entry.refNumber}] `}{entry.name}</p>
                                <p className="text-sm text-nasa-gray-300">
                                    {previous ? `${t('projects.rated')} · ${score?.toFixed(2) ?? '—'}`
                                        : t(assignedIds.has(entry.id) ? 'projects.to_rate' : 'projects.catalog_task')}
                                </p>
                            </div>
                            {!scenario?.archived && <Button size="sm" disabled={!evaluatorId || Boolean(scenario && !previous && entry.id !== next?.id)}
                                onClick={() => openTask(entry.id)}>
                                {t(previous ? 'projects.open_rating' : assignedIds.has(entry.id) ? 'evaluator.rate_task' : 'projects.add_and_rate')}
                            </Button>}
                        </div>
                    );
                })}
                {tasks.length === 0 && <p className="text-nasa-gray-300">{t(scenario ? 'evaluator.no_mtes' : showCatalog ? 'projects.no_matching_tasks' : 'projects.study_tasks_empty')}</p>}
            </div>
        </Card>
    );
}

export default function EvaluatorPage() {
    return <Navigate to="/projects" replace />;
}
