import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useData } from '../contexts/AppContext';
import { TLXDimension, type MTE, type Scenario, type Study } from '../types';
import { TLX_DIMENSIONS_INFO, PAIRWISE_COMBINATIONS, DEFAULT_WEIGHTS } from '../constants';
import { criteriaForRating, mtePath } from '../data/mte';
import { latestRating } from '../data/workspace';
import MteObserverFields, { observationDrafts, readObservations, type ObservationDrafts } from '../components/MteObserverFields';
import ExpressTlxControl from '../components/ui/ExpressTlxControl';
import Button from '../components/ui/Button';
import PairwiseWeightsDisplay from '../components/ui/PairwiseWeightsDisplay';
import ToggleSwitch from '../components/ui/ToggleSwitch';

const initialScores = Object.fromEntries(TLX_DIMENSIONS_INFO.map(dim => [dim.id, 50])) as Record<TLXDimension, number>;
const fieldClass = 'w-full rounded-md border border-separator bg-nasa-gray-900 px-2.5 py-1.5 text-sm text-foreground placeholder:text-nasa-gray-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent-ink';

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

    if (!dimensionA || !dimensionB) return null;

    return (
        <section className="max-w-3xl space-y-4 rounded-lg border border-separator bg-nasa-gray-800 p-3 sm:p-4">
            <header className="space-y-1">
                <h2 className="font-semibold text-foreground">{t('evaluator.determine_weights')}</h2>
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
                <h3 className="text-sm font-semibold text-foreground">{t('evaluator.which_workload')}</h3>
                <div className="grid gap-2 sm:grid-cols-2">
                    {[dimensionA, dimensionB].map(({ id }, position) => {
                        const key = `tlx_dimensions.${dimensionKey(id)}`;
                        return (
                            <button key={position} type="button" onClick={() => handleSelect(id)}
                                aria-label={t(`${key}.title`)} aria-describedby={`assessment-pair-description-${position}`}
                                className="group rounded-md border border-separator bg-nasa-gray-900 px-3 py-2.5 text-left transition-colors hover:border-accent-ink hover:bg-hover-surface focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-accent-ink">
                                <span className="block text-sm font-semibold text-foreground group-hover:text-accent-ink">{t(`${key}.title`)}</span>
                                <span id={`assessment-pair-description-${position}`} className="mt-1 block text-xs leading-relaxed text-nasa-gray-400">
                                    {t(`${key}.description`)}
                                </span>
                            </button>
                        );
                    })}
                </div>
            </div>
            <div className="flex flex-wrap justify-end gap-2">
                <Button onClick={onCancel} variant="secondary" size="sm">{t('evaluator.cancel')}</Button>
                <Button onClick={handleSkip} variant="secondary" size="sm">{t('evaluator.skip_weighting')}</Button>
            </div>
        </section>
    );
};

function RatingForm({ study, scenario, evaluatorId, passageId, passageLabel, task, taskParents, submitLabel, onClose }: {
    study: Study;
    scenario?: Scenario;
    evaluatorId: string;
    passageId?: string;
    passageLabel?: string;
    task: MTE;
    taskParents: string;
    submitLabel: string;
    onClose: (saved?: boolean) => void;
}) {
    const { t, i18n } = useTranslation();
    const { ratings, saveRating, pairwiseComparisons, passages } = useData();
    const context = { studyId: study.id, scenarioId: scenario?.id, evaluatorId, passageId, mteId: task.id };
    const existing = latestRating(ratings, context);
    const [criteria] = useState(() => criteriaForRating(task, passages?.find(passage => passage.id === passageId), existing));
    const [drafts, setDrafts] = useState(() => observationDrafts(existing?.observations));
    const [observerOpen, setObserverOpen] = useState(Boolean(existing?.observations?.length));
    const [validateObservations, setValidateObservations] = useState(false);
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

    const comparison = passageId ? undefined : pairwiseComparisons.find(entry => entry.studyId === study.id && entry.evaluatorId === evaluatorId);
    const weights = comparison?.isWeighted ? comparison.weights : DEFAULT_WEIGHTS;
    const totalWeight = Object.values(weights).reduce((sum, weight) => sum + weight, 0);
    const overallScore = totalWeight > 0
        ? TLX_DIMENSIONS_INFO.reduce((sum, dim) => sum + scores[dim.id] * weights[dim.id], 0) / totalWeight
        : 0;
    const scoreLabel = new Intl.NumberFormat(i18n.resolvedLanguage, { maximumFractionDigits: 1 }).format(overallScore);

    async function submit(event: React.FormEvent) {
        event.preventDefault();
        if (saving || (!isExpress && step < lastStep)) return;
        const observations = readObservations(criteria, drafts);
        if (observations === null) {
            setValidateObservations(true);
            setObserverOpen(true);
            return;
        }
        setSaving(true);
        setError(false);
        try {
            await saveRating({ ...context, scores, comments: comments.trim() || undefined,
                observations: criteria.length ? observations : undefined });
            onClose(true);
        } catch {
            setError(true);
        } finally {
            setSaving(false);
        }
    }

    return (
        <section className="rounded-lg border border-separator bg-nasa-gray-800 p-3 sm:p-4">
            <div className="mb-2 flex items-start justify-between gap-2.5">
                <div className="min-w-0">
                    {taskParents && <p className="break-words text-xs text-nasa-gray-300">{taskParents}</p>}
                    {task.refNumber && <p className="text-xs font-medium tabular-nums text-accent-ink">{task.refNumber}</p>}
                    <h2 className="break-words text-lg font-semibold leading-tight sm:text-xl">{task.name}</h2>
                    {task.description && <p className="mt-0.5 text-sm text-nasa-gray-300">{task.description}</p>}
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
            {!assigned && <p className="mb-2 text-sm text-nasa-gray-300">{t('projects.add_on_save')}</p>}
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
            <form onSubmit={submit} className="mt-2 space-y-2">
                {error && <p role="alert" className="text-danger-ink">{t('evaluator.error_submitting')}</p>}
                {(isExpress || step < lastStep) && <fieldset disabled={saving} className={isExpress
                    ? 'grid gap-px overflow-hidden rounded-md border border-separator bg-separator min-[320px]:grid-cols-2 max-[359px]:[&>div]:px-2 max-[359px]:[&_label]:text-xs lg:grid-cols-3'
                    : 'overflow-hidden rounded-md border border-separator bg-nasa-gray-900'}>
                    {TLX_DIMENSIONS_INFO.filter((_, index) => isExpress || index === step).map(({ id }) => {
                        const key = `tlx_dimensions.${dimensionKey(id)}`;
                        const props = {
                            title: t(`${key}.title`),
                            lowAnchor: t(`${key}.low_anchor`),
                            highAnchor: t(`${key}.high_anchor`),
                            value: scores[id],
                            onChange: (value: number) => setScores(current => ({ ...current, [id]: value })),
                        };
                        return isExpress ? <ExpressTlxControl key={id} {...props} /> : (
                            <div key={id}>
                                <p className="border-b border-separator px-3 py-2 text-sm text-nasa-gray-300 sm:px-4">{t(`${key}.description`)}</p>
                                <ExpressTlxControl {...props} />
                            </div>
                        );
                    })}
                </fieldset>}
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
                {criteria.length > 0 && (isExpress || step === lastStep) && <MteObserverFields
                    criteria={criteria} drafts={drafts} open={observerOpen} onOpenChange={setObserverOpen}
                    validate={validateObservations} disabled={saving} fieldClass={fieldClass}
                    onChange={(id, field, value) => setDrafts(current => new Map(current)
                        .set(id, { ...current.get(id), [field]: value }))} />}
                {passageLabel && <p className="text-sm font-medium text-accent-ink">{passageLabel}</p>}
                <div className="flex flex-wrap items-center justify-between gap-2 border-t border-separator pt-2">
                    <Button variant="secondary" type="button" size="sm" className="min-h-9" onClick={() => onClose()} disabled={saving}>
                        {t('evaluator.back_to_tasks')}
                    </Button>
                    <div className="flex flex-wrap gap-2">
                        {!isExpress && step > 0 && (
                            <Button variant="secondary" type="button" size="sm" className="min-h-9" onClick={() => setStep(step - 1)} disabled={saving}>
                                {t('evaluator.previous')}
                            </Button>
                        )}
                        {isExpress || step === lastStep ? (
                            <Button type="submit" size="sm" className="min-h-9" disabled={saving}>
                                {t(saving ? 'evaluator.submitting' : submitLabel)}
                            </Button>
                        ) : (
                            <Button type="button" size="sm" className="min-h-9" onClick={event => {
                                event.preventDefault();
                                setStep(step + 1);
                            }}>
                                {t('evaluator.next', { current: step + 1, total: lastStep + 1 })}
                            </Button>
                        )}
                    </div>
                </div>
            </form>
        </section>
    );
}

export function AssessmentRunner({ study, scenario, evaluatorId, passageId, passageLabel }: {
    study: Study; scenario?: Scenario; evaluatorId: string; passageId?: string; passageLabel?: string;
}) {
    const { t } = useTranslation();
    const { mtes, ratings, pairwiseComparisons, addPairwiseComparison } = useData();
    const [taskId, setTaskId] = useState(() =>
        passageId ? scenario?.mteIds.find(id => !ratings.some(rating => rating.passageId === passageId && rating.mteId === id)) ?? '' : '');
    const [search, setSearch] = useState('');
    const [showCatalog, setShowCatalog] = useState(false);
    const [showWeights, setShowWeights] = useState(false);
    const [saved, setSaved] = useState(false);
    const comparison = passageId ? undefined : pairwiseComparisons.find(entry => entry.studyId === study.id && entry.evaluatorId === evaluatorId);
    const context = { studyId: study.id, scenarioId: scenario?.id, evaluatorId, passageId };
    const task = mtes.find(entry => entry.id === taskId);
    const tasksById = new Map(mtes.map(entry => [entry.id, entry]));
    const assigned = [...new Set(scenario?.mteIds ?? study.mteIds)]
        .flatMap(id => tasksById.get(id) ?? []);
    const assignedIds = new Set(assigned.map(entry => entry.id));
    const scopeRatings = ratings.filter(rating => rating.studyId === study.id &&
        rating.scenarioId === scenario?.id && rating.evaluatorId === evaluatorId && rating.passageId === passageId);
    const completedIds = new Set(scopeRatings.map(rating => rating.mteId));
    const query = search.trim().toLocaleLowerCase();
    const next = assigned.find(entry => !completedIds.has(entry.id));
    const following = assigned.find(entry => entry.id !== taskId && !completedIds.has(entry.id));
    const browsing = !scenario && showCatalog;
    const candidates = browsing ? mtes.filter(entry => !assignedIds.has(entry.id)) : assigned;
    const tasks = candidates.map(entry => {
        const path = mtePath(entry, tasksById);
        return { entry, path, label: path.map(task => task.name).join(' › ') };
    }).filter(({ path }) => path.map(entry => `${entry.refNumber} ${entry.name}`).join(' ').toLocaleLowerCase().includes(query));
    if (browsing) tasks.sort((a, b) => a.label.localeCompare(b.label));

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
            passageId={passageId} passageLabel={passageLabel} task={task}
            taskParents={mtePath(task, tasksById).slice(0, -1).map(entry => entry.name).join(' › ')}
            submitLabel={submitLabel} onClose={wasSaved => {
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

    const completed = assigned.filter(entry => completedIds.has(entry.id)).length;
    const progressText = t('projects.progress', { completed, total: assigned.length });
    const weights = comparison?.isWeighted ? comparison.weights : DEFAULT_WEIGHTS;
    const totalWeight = Object.values(weights).reduce((sum, weight) => sum + weight, 0);
    const canConfigureWeights = Boolean(!passageId && evaluatorId && !scenario?.archived);

    return (
        <section className="overflow-hidden rounded-lg border border-separator bg-nasa-gray-800">
            <header className="flex flex-wrap items-center justify-between gap-3 border-b border-separator px-3 py-2.5 sm:px-4">
                <div className="min-w-0">
                    <h2 className="text-base font-semibold text-foreground">
                        {t(scenario ? 'projects.scenario_order' : 'projects.study_tasks')}
                    </h2>
                    <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1">
                        <p className="text-xs tabular-nums text-nasa-gray-300">{progressText}</p>
                        {assigned.length > 0 && <div className="h-1 w-12 overflow-hidden rounded-full bg-nasa-gray-700" aria-hidden="true">
                            <div className="h-full rounded-full bg-accent-ink" style={{ width: `${completed / assigned.length * 100}%` }} />
                        </div>}
                    </div>
                </div>
                {scenario && evaluatorId && assigned.length > 0 && !scenario.archived && next && (
                    <Button size="sm" className="min-h-9" onClick={() => openTask(next.id)}>
                        {t(passageId ? 'passages.resume' : completed ? 'projects.resume_scenario' : 'projects.start_scenario')}
                    </Button>
                )}
            </header>

            <div className="space-y-2.5 p-3 sm:px-4">
                {saved && <p role="status" className="text-sm text-success-ink">{t('projects.rating_saved')}</p>}
                {!evaluatorId && <p className="text-sm text-nasa-gray-300">{t('projects.choose_evaluator')}</p>}
                {scenario && evaluatorId && assigned.length > 0 && !scenario.archived && !next && (
                    <p className="text-sm font-medium text-success-ink">{t('projects.scenario_complete')}</p>
                )}

                {(!scenario || canConfigureWeights) && (
                    <div className="flex flex-wrap items-center gap-2">
                        {!scenario && <Button variant="secondary" size="sm" className="min-h-8" aria-pressed={showCatalog} onClick={() => {
                            setShowCatalog(!showCatalog);
                            setSearch('');
                        }}>
                            {t(showCatalog ? 'projects.study_tasks' : 'projects.open_catalog')}
                        </Button>}
                        {canConfigureWeights && <Button variant="secondary" size="sm" className="min-h-8" onClick={() => setShowWeights(true)}>
                            {t('evaluator.determine_weights')}
                        </Button>}
                    </div>
                )}

                {comparison?.isWeighted && (
                    <details className="rounded-md border border-separator px-2.5 py-1.5">
                        <summary className="w-fit cursor-pointer rounded text-sm font-medium text-accent-ink focus-visible:outline focus-visible:outline-2">
                            {t('evaluator.weights_used')}
                        </summary>
                        <div className="max-w-lg pt-2">
                            <PairwiseWeightsDisplay weights={comparison.weights} isWeighted />
                        </div>
                    </details>
                )}

                {showCatalog && !scenario && <input type="search" aria-label={t('projects.search_tasks')}
                    placeholder={t('projects.search_tasks')} className={fieldClass} value={search} onChange={e => setSearch(e.target.value)} />}

                {tasks.length === 0 ? (
                    <p className="rounded-md border border-dashed border-separator px-3 py-2.5 text-sm text-nasa-gray-300">
                        {t(scenario ? 'evaluator.no_mtes' : showCatalog ? 'projects.no_matching_tasks' : 'projects.study_tasks_empty')}
                    </p>
                ) : (
                    <ul className="divide-y divide-separator overflow-hidden rounded-md border border-separator">
                        {tasks.map(({ entry, path }, index) => {
                            const previous = latestRating(scopeRatings, { ...context, mteId: entry.id });
                            const score = previous && totalWeight > 0 ? TLX_DIMENSIONS_INFO.reduce(
                                (sum, dim) => sum + previous.scores[dim.id] * weights[dim.id], 0) / totalWeight : null;
                            const isAssigned = assignedIds.has(entry.id);
                            return (
                                <li className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1.5 bg-nasa-gray-900 px-2.5 py-2" key={entry.id}>
                                    <div className="min-w-0 flex-1 basis-32">
                                        {path.length > 1 && <p className="break-words text-xs text-nasa-gray-300">
                                            {path.slice(0, -1).map(parent => parent.name).join(' › ')}
                                        </p>}
                                        <p className="break-words text-sm font-semibold text-foreground">
                                            {scenario && `${index + 1}. `}{entry.refNumber && `[${entry.refNumber}] `}{entry.name}
                                        </p>
                                        <p className={`mt-0.5 text-xs tabular-nums ${previous ? 'text-success-ink' : 'text-nasa-gray-300'}`}>
                                            {previous ? `${t('projects.rated')} · ${score?.toFixed(2) ?? '—'}`
                                                : t(isAssigned ? 'projects.to_rate' : 'projects.catalog_task')}
                                        </p>
                                    </div>
                                    {!scenario?.archived && (
                                        <Button size="sm" className="min-h-8" variant={!scenario && entry.id === next?.id ? 'primary' : 'secondary'}
                                            disabled={!evaluatorId || Boolean(scenario && !previous && entry.id !== next?.id)}
                                            onClick={() => openTask(entry.id)}>
                                            {t(previous ? (passageId ? 'passages.correct' : 'projects.open_rating') : isAssigned ? 'evaluator.rate_task' : 'projects.add_and_rate')}
                                        </Button>
                                    )}
                                </li>
                            );
                        })}
                    </ul>
                )}
            </div>
        </section>
    );
}

export default function EvaluatorPage() {
    return <Navigate to="/projects" replace />;
}
