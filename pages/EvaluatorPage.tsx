import React, { useState, useEffect, useMemo } from 'react';
import { useData, useSession } from '../contexts/AppContext';
import { TLXDimension, Rating, MTE, Study, ComputedTLXScore } from '../types';
import { TLX_DIMENSIONS_INFO, PAIRWISE_COMBINATIONS, DEFAULT_WEIGHTS } from '../constants';
import TlxSlider from '../components/ui/TlxSlider';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import PairwiseWeightsDisplay from '../components/ui/PairwiseWeightsDisplay';
import ToggleSwitch from '../components/ui/ToggleSwitch';
import Select from '../components/ui/Select';

const initialScores = TLX_DIMENSIONS_INFO.reduce((acc, dim) => {
  acc[dim.id] = 50;
  return acc;
}, {} as Record<TLXDimension, number>);

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
  onComplete: () => void;
}> = ({ onSubmit, onComplete }) => {
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
      className="w-full sm:w-1/2 p-6 bg-nasa-gray-900 rounded-lg cursor-pointer transition-all duration-200 ease-in-out hover:bg-nasa-light-blue hover:shadow-2xl hover:scale-105 border-2 border-nasa-gray-700 hover:border-nasa-blue"
      role="button"
      tabIndex={0}
      onKeyPress={(e) => { if(e.key === 'Enter' || e.key === ' ') onSelect() }}
      aria-label={`Select ${dimension.title}`}
    >
      <h3 className="text-xl font-bold text-center text-white">{dimension.title}</h3>
      <p className="text-sm text-nasa-gray-400 mt-2 text-center">{dimension.description}</p>
    </div>
  );

  return (
    <Card title="Determine Dimension Weights">
      <div className="space-y-6">
        <div>
            <p className="text-nasa-gray-300 mb-4 text-center">To accurately calculate your workload, we need to determine the importance of each TLX dimension. For each pair below, please select the dimension that you felt contributed <span className="font-bold text-white">more</span> to the workload in this study.</p>
        </div>
        
        {/* Progress Bar */}
        <div>
            <div className="flex justify-between mb-1">
                <span className="text-base font-medium text-nasa-blue">Comparison {currentPairIndex + 1} of {PAIRWISE_COMBINATIONS.length}</span>
            </div>
            <div className="w-full bg-nasa-gray-700 rounded-full h-2.5">
                <div className="bg-nasa-blue h-2.5 rounded-full transition-all duration-300 ease-in-out" style={{ width: `${progress}%` }}></div>
            </div>
        </div>

        {/* Comparison Section */}
        <div className="text-center">
            <h2 className="text-lg font-semibold text-white mb-4">Which was a more significant source of workload?</h2>
            <div className="flex flex-col sm:flex-row items-stretch justify-center gap-4">
               <DimensionCard dimension={dimensionA} onSelect={() => handleSelect(dimensionA.id)} />
               <DimensionCard dimension={dimensionB} onSelect={() => handleSelect(dimensionB.id)} />
            </div>
        </div>
      </div>
      
      <div className="flex justify-center mt-8 pt-4 border-t border-nasa-gray-700">
        <Button onClick={handleSkip} variant="secondary" className="w-full sm:w-auto">Skip Weighting Process</Button>
      </div>
    </Card>
  );
};

const AssessmentSummary: React.FC<{ onReturnToTasks: () => void }> = ({ onReturnToTasks }) => {
    const { ratings, pairwiseComparisons, evaluators, studies, mtes } = useData();
    const { selectedEvaluatorId, selectedStudyId } = useSession();

    const selectedStudy = useMemo(() => studies.find(s => s.id === selectedStudyId), [studies, selectedStudyId]);
    const currentComparison = useMemo(() => pairwiseComparisons.find(pc => pc.evaluatorId === selectedEvaluatorId && pc.studyId === selectedStudyId), [pairwiseComparisons, selectedEvaluatorId, selectedStudyId]);

    const summaryScores = useMemo<ComputedTLXScore[]>(() => {
        const relevantRatings = ratings.filter(r => r.evaluatorId === selectedEvaluatorId && r.studyId === selectedStudyId);
        
        return relevantRatings.map(rating => {
            const evaluator = evaluators.find(e => e.id === rating.evaluatorId);
            const study = studies.find(s => s.id === rating.studyId);
            const mte = mtes.find(m => m.id === rating.mteId);
            
            const isWeighted = !!currentComparison && currentComparison.isWeighted;
            const weights = currentComparison ? currentComparison.weights : DEFAULT_WEIGHTS;
            const totalWeight = (Object.values(weights) as number[]).reduce((sum, w) => sum + w, 0);

            const weightedScores = {} as Record<TLXDimension, number>;
            let totalWeightedScore = 0;

            for (const dimInfo of TLX_DIMENSIONS_INFO) {
                const dim = dimInfo.id;
                const rawScore = rating.scores[dim];
                const weight = weights[dim];
                const weightedScore = rawScore * weight;
                weightedScores[dim] = weightedScore;
                totalWeightedScore += weightedScore;
            }
            
            return {
                evaluatorName: evaluator?.name || 'Unknown',
                studyName: study?.name || 'Unknown',
                studyId: study?.id || '',
                mteId: rating.mteId,
                mteName: mte ? `[${mte.refNumber}] ${mte.name}` : 'Unknown',
                rawScores: rating.scores,
                weights,
                weightedScores,
                totalWeightedScore: totalWeight > 0 ? totalWeightedScore / totalWeight : 0,
                isWeighted,
                comments: rating.comments,
            };
        });
    }, [ratings, currentComparison, evaluators, studies, mtes, selectedEvaluatorId, selectedStudyId]);

    if (!selectedStudy) return null;

    const isWeighted = !!currentComparison && currentComparison.isWeighted;
    const currentWeights = currentComparison?.weights || DEFAULT_WEIGHTS;

    return (
        <Card title={`Assessment Summary for: ${selectedStudy.name}`}>
            <p className="text-nasa-gray-300 mb-6">You have completed all ratings for this study. Below is a summary of your submitted workload scores.</p>
            
            <div className="mb-6">
                <h3 className="text-lg font-medium text-white mb-2">Dimension Weights Used</h3>
                <PairwiseWeightsDisplay weights={currentWeights} isWeighted={isWeighted} />
            </div>

            <div className="space-y-4">
                {summaryScores.map((score, index) => (
                    <Card key={index} className="bg-nasa-gray-900">
                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center">
                            <h4 className="text-lg font-semibold mb-2 sm:mb-0">{score.mteName}</h4>
                            <div className="text-right">
                                <span className="text-sm text-nasa-gray-400 block">Overall Workload</span>
                                <span className="text-2xl font-bold" style={{ color: getScoreColor(score.totalWeightedScore) }}>
                                  {score.totalWeightedScore.toFixed(2)}
                                </span>
                            </div>
                        </div>
                        <div className="mt-4 pt-4 border-t border-nasa-gray-700">
                            <h5 className="text-sm font-semibold text-nasa-gray-300 mb-2">Raw Scores Submitted</h5>
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-x-8 gap-y-2">
                                {TLX_DIMENSIONS_INFO.map(dim => (
                                    <div key={dim.id} className="flex justify-between text-sm">
                                        <span className="text-nasa-gray-400">{dim.title}</span>
                                        <span className="font-mono font-semibold text-white">{score.rawScores[dim.id]}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                        {score.comments && (
                            <div className="mt-4 pt-4 border-t border-nasa-gray-700">
                                <h5 className="text-sm font-semibold text-nasa-gray-300 mb-2">Comments</h5>
                                <p className="text-sm text-nasa-gray-300 bg-nasa-gray-800 p-3 rounded-md whitespace-pre-wrap">{score.comments}</p>
                            </div>
                        )}
                    </Card>
                ))}
            </div>
            <div className="mt-6 pt-4 border-t border-nasa-gray-700 flex justify-center sm:justify-end">
                <Button onClick={onReturnToTasks}>Return to Task List</Button>
            </div>
        </Card>
    );
};


const AssessmentRunner: React.FC = () => {
    const { studies, mtes, ratings, addRating, addPairwiseComparison, pairwiseComparisons } = useData();
    const { selectedEvaluatorId, selectedStudyId } = useSession();
    
    const storageKey = useMemo(() => `ratingMode_${selectedEvaluatorId}`, [selectedEvaluatorId]);

    const [selectedMte, setSelectedMte] = useState<MTE | null>(null);
    const [scores, setScores] = useState<Record<TLXDimension, number>>(initialScores);
    const [comments, setComments] = useState('');
    const [view, setView] = useState<'loading' | 'pairwise' | 'tasks' | 'summary'>('loading');
    const [notification, setNotification] = useState('');
    const [ratingMode, setRatingMode] = useState<'express' | 'step-by-step'>(() => {
        const savedMode = localStorage.getItem(storageKey);
        return (savedMode as 'express' | 'step-by-step') || 'step-by-step';
    });
    const [currentStep, setCurrentStep] = useState(0);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [submissionError, setSubmissionError] = useState<string | null>(null);

    const selectedStudy = useMemo(() => studies.find(s => s.id === selectedStudyId), [studies, selectedStudyId]);
    
    const mtesInStudy = useMemo(() => {
        if (!selectedStudy) return [];
        return selectedStudy.mteIds.map(id => mtes.find(m => m.id === id)).filter((m): m is MTE => !!m);
    }, [selectedStudy, mtes]);

    const currentComparison = useMemo(() => {
        return pairwiseComparisons.find(pc => pc.evaluatorId === selectedEvaluatorId && pc.studyId === selectedStudyId);
    }, [pairwiseComparisons, selectedEvaluatorId, selectedStudyId]);
    
    const ratedMteIds = useMemo(() => new Set(
        ratings
            .filter(r => r.evaluatorId === selectedEvaluatorId && r.studyId === selectedStudyId)
            .map(r => r.mteId)
    ), [ratings, selectedEvaluatorId, selectedStudyId]);


    useEffect(() => {
        if (selectedEvaluatorId && selectedStudyId) {
            const allMtesRated = selectedStudy && mtesInStudy.length > 0 && mtesInStudy.every(mte => ratedMteIds.has(mte.id));

            if (allMtesRated) {
                setView('summary');
            } else if (!currentComparison) {
                setView('pairwise');
            } else {
                setView('tasks');
            }
        }
    }, [selectedEvaluatorId, selectedStudyId, currentComparison, ratedMteIds, selectedStudy, mtesInStudy]);


    const handleScoreChange = (dimension: TLXDimension, value: number) => {
        setScores(prev => ({ ...prev, [dimension]: value }));
    };
    
    const handlePairwiseSubmit = (weights: Record<TLXDimension, number>, isWeighted: boolean) => {
        if (selectedEvaluatorId && selectedStudyId) {
            addPairwiseComparison({ evaluatorId: selectedEvaluatorId, studyId: selectedStudyId, weights, isWeighted });
        }
    };
    
    const handlePairwiseComplete = () => {
        setView('tasks');
    }

    const handleRatingModeChange = (value: string) => {
        const newMode = value as 'express' | 'step-by-step';
        setRatingMode(newMode);
        localStorage.setItem(storageKey, newMode);
        setCurrentStep(0); // Reset step when changing mode
    };

    const handleSubmitRating = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedMte || isSubmitting) return;

        setIsSubmitting(true);
        setSubmissionError(null);
        setNotification('');

        const newRating: Omit<Rating, 'id' | 'timestamp'> = {
            evaluatorId: selectedEvaluatorId,
            studyId: selectedStudyId,
            mteId: selectedMte.id,
            scores,
            comments: comments.trim() ? comments.trim() : undefined,
        };

        try {
            await addRating(newRating);
            setNotification(`Rating for "${selectedMte.name}" submitted successfully!`);
            
            const ratedMteIdsAfterThisOne = new Set([...ratedMteIds, selectedMte.id]);
            
            if (mtesInStudy.length > 0 && mtesInStudy.every(mte => ratedMteIdsAfterThisOne.has(mte.id))) {
                setView('summary');
            }

            // Reset form on success
            setScores(initialScores);
            setSelectedMte(null);
            setCurrentStep(0);
            setComments('');

            setTimeout(() => setNotification(''), 3000);

        } catch (error) {
            console.error("Rating submission failed:", error);
            const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.';
            setSubmissionError(`Failed to submit rating. ${errorMessage} Please try again.`);
            // Do NOT reset form state, so user can retry
        } finally {
            setIsSubmitting(false);
        }
    };

     const handleResetWeights = () => {
        if (selectedEvaluatorId && selectedStudyId) {
            addPairwiseComparison({
                evaluatorId: selectedEvaluatorId,
                studyId: selectedStudyId,
                weights: DEFAULT_WEIGHTS,
                isWeighted: false
            });
        }
    };

    if (view === 'loading' || !selectedStudy) {
        return <Card><p className="text-center text-nasa-gray-400">Loading session...</p></Card>
    }

    if (view === 'pairwise') {
        return <PairwiseComparisonView onSubmit={handlePairwiseSubmit} onComplete={handlePairwiseComplete} />
    }

    if (view === 'summary') {
        return <AssessmentSummary onReturnToTasks={() => setView('tasks')} />;
    }

    if (selectedMte) {
        return (
            <Card>
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
                    <div>
                        <h3 className="text-lg leading-6 font-medium text-white">{`Rating for: [${selectedMte.refNumber}] ${selectedMte.name}`}</h3>
                        <p className="mt-1 text-sm text-nasa-gray-400">{selectedMte.description}</p>
                    </div>
                    <ToggleSwitch
                        label="Rating Mode:"
                        options={[
                            { value: 'express', label: 'Express' },
                            { value: 'step-by-step', label: 'Step-by-Step' },
                        ]}
                        selectedValue={ratingMode}
                        onChange={handleRatingModeChange}
                    />
                </div>
                <form onSubmit={handleSubmitRating}>
                    {submissionError && (
                      <div className="mb-4 p-3 rounded-md bg-red-900 bg-opacity-50 text-red-300 text-sm border border-red-700" role="alert">
                        <p className="font-bold">Error Submitting Rating</p>
                        <p>{submissionError}</p>
                      </div>
                    )}
                    {ratingMode === 'express' ? (
                        <>
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                {TLX_DIMENSIONS_INFO.map(dim => (
                                    <TlxSlider
                                        key={dim.id}
                                        title={dim.title}
                                        description={dim.description}
                                        lowAnchor={dim.lowAnchor}
                                        highAnchor={dim.highAnchor}
                                        value={scores[dim.id]}
                                        onChange={(val) => handleScoreChange(dim.id, val)}
                                        compact={true}
                                    />
                                ))}
                            </div>
                            <div className="mt-6">
                                <label htmlFor="comments" className="block text-sm font-medium text-nasa-gray-300">
                                    Optional Comments
                                </label>
                                <textarea
                                    id="comments"
                                    rows={3}
                                    className="mt-1 block w-full bg-nasa-gray-900 border-nasa-gray-600 rounded-md shadow-sm focus:ring-nasa-blue focus:border-nasa-blue text-white"
                                    value={comments}
                                    onChange={(e) => setComments(e.target.value)}
                                    placeholder="Add any additional notes about the workload for this task..."
                                />
                            </div>
                        </>
                    ) : (
                        <div>
                            {(() => {
                                if (currentStep < TLX_DIMENSIONS_INFO.length) {
                                    const currentDimension = TLX_DIMENSIONS_INFO[currentStep];
                                    return (
                                        <TlxSlider
                                            key={currentDimension.id}
                                            title={currentDimension.title}
                                            description={currentDimension.description}
                                            lowAnchor={currentDimension.lowAnchor}
                                            highAnchor={currentDimension.highAnchor}
                                            value={scores[currentDimension.id]}
                                            onChange={(val) => handleScoreChange(currentDimension.id, val)}
                                        />
                                    );
                                } else {
                                    return (
                                        <div className="p-4 bg-nasa-gray-900 rounded-lg">
                                            <h3 className="text-lg font-semibold text-white">Optional Comments</h3>
                                            <p className="text-sm text-nasa-gray-400 my-2">Provide any additional qualitative feedback about your experience performing this task. This can include sources of frustration, moments of high demand, or anything else you feel is relevant.</p>
                                            <textarea
                                                id="comments"
                                                rows={5}
                                                className="mt-1 block w-full bg-nasa-gray-700 border-nasa-gray-600 rounded-md shadow-sm focus:ring-nasa-blue focus:border-nasa-blue text-white"
                                                value={comments}
                                                onChange={(e) => setComments(e.target.value)}
                                                placeholder="Add any additional notes about the workload for this task..."
                                                autoFocus
                                            />
                                        </div>
                                    );
                                }
                            })()}
                        </div>
                    )}
                    
                    <div className="flex flex-col-reverse sm:flex-row justify-between items-center gap-4 mt-6">
                         <Button type="button" variant="secondary" onClick={() => { setSelectedMte(null); setCurrentStep(0); setComments(''); setSubmissionError(null); }} className="w-full sm:w-auto">Back to Tasks</Button>
                        
                        {ratingMode === 'express' ? (
                            <Button type="submit" className="w-full sm:w-auto" disabled={isSubmitting}>
                                {isSubmitting ? 'Submitting...' : 'Submit Rating'}
                            </Button>
                        ) : (
                            <div className="flex items-center gap-2 w-full sm:w-auto">
                                <Button type="button" onClick={() => setCurrentStep(prev => prev - 1)} disabled={currentStep === 0 || isSubmitting} className="w-1/2 sm:w-auto">
                                    Previous
                                </Button>
                                {currentStep < TLX_DIMENSIONS_INFO.length ? (
                                    <Button type="button" onClick={() => setCurrentStep(prev => prev + 1)} disabled={isSubmitting} className="w-1/2 sm:w-auto">
                                        Next ({currentStep + 1}/{TLX_DIMENSIONS_INFO.length + 1})
                                    </Button>
                                ) : (
                                    <Button type="submit" className="w-1/2 sm:w-auto" disabled={isSubmitting}>
                                        {isSubmitting ? 'Submitting...' : 'Submit Rating'}
                                    </Button>
                                )}
                            </div>
                        )}
                    </div>
                </form>
            </Card>
        );
    }

    const isWeighted = !!currentComparison && currentComparison.isWeighted;
    const currentWeights = currentComparison?.weights || DEFAULT_WEIGHTS;

    return (
         <>
            <div className="mb-6">
                <Card title="Current Study Dimension Weights">
                    <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
                        <div className="flex-grow pr-4">
                            <PairwiseWeightsDisplay weights={currentWeights} isWeighted={isWeighted} />
                        </div>
                         <div className="flex flex-col sm:flex-row items-stretch sm:items-center space-y-2 sm:space-y-0 sm:space-x-2 w-full sm:w-auto">
                            <Button onClick={handleResetWeights} variant="secondary" size="sm" disabled={!isWeighted} className="w-full sm:w-auto">
                                Reset Weights
                            </Button>
                            <Button onClick={() => setView('pairwise')} variant="secondary" size="sm" className="w-full sm:w-auto">
                                Redo Comparison
                            </Button>
                        </div>
                    </div>
                </Card>
            </div>
            <Card title={`Mission Task Elements for: ${selectedStudy.name}`}>
                 {notification && <div className="mb-4 p-3 rounded-md bg-green-500 bg-opacity-20 text-green-300 text-sm">{notification}</div>}
                 <p className="text-nasa-gray-300 mb-4">Select a task to begin rating.</p>
                <div className="space-y-3">
                    {mtesInStudy.map(mte => {
                        const isRated = ratedMteIds.has(mte.id);

                        if (isRated) {
                            const rating = ratings.find(r => r.evaluatorId === selectedEvaluatorId && r.studyId === selectedStudyId && r.mteId === mte.id);
                            if (!rating) return null;

                            const weights = currentComparison?.weights || DEFAULT_WEIGHTS;
                            let totalWeightedScoreSum = 0;
                            let totalWeight = 0;
                            for (const dimInfo of TLX_DIMENSIONS_INFO) {
                                totalWeight += weights[dimInfo.id];
                                totalWeightedScoreSum += rating.scores[dimInfo.id] * weights[dimInfo.id];
                            }
                            const score = totalWeight > 0 ? totalWeightedScoreSum / totalWeight : 0;

                            return (
                                <div key={mte.id} className="p-4 bg-nasa-gray-900 rounded-md">
                                    <div className="flex flex-col sm:flex-row justify-between sm:items-start gap-4 mb-4">
                                        <div className="w-full">
                                            <h4 className="font-semibold text-white">
                                                <span className="font-mono text-sm text-nasa-gray-400 mr-2">[{mte.refNumber}]</span>{mte.name}
                                            </h4>
                                            <p className="text-sm text-nasa-gray-400">{mte.description}</p>
                                        </div>
                                        <div className="flex-shrink-0 w-full sm:w-24 text-left sm:text-center">
                                            <div>
                                                <span className="text-2xl font-bold" style={{ color: getScoreColor(score) }}>
                                                  {score.toFixed(2)}
                                                </span>
                                                <p className="text-xs text-nasa-gray-400 font-semibold tracking-wider">SCORE</p>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="pt-4 border-t border-nasa-gray-700">
                                        <h5 className="text-sm font-semibold text-nasa-gray-300 mb-2">Raw Scores Submitted</h5>
                                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-8 gap-y-2">
                                            {TLX_DIMENSIONS_INFO.map(dim => (
                                                <div key={dim.id} className="flex justify-between text-sm">
                                                    <span className="text-nasa-gray-400">{dim.title}</span>
                                                    <span className="font-mono font-semibold text-white">{rating.scores[dim.id]}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                    {rating.comments && (
                                        <div className="mt-4 pt-4 border-t border-nasa-gray-700">
                                            <h5 className="text-sm font-semibold text-nasa-gray-300 mb-2">Comments</h5>
                                            <p className="text-sm text-nasa-gray-300 bg-nasa-gray-800 p-3 rounded-md whitespace-pre-wrap">{rating.comments}</p>
                                        </div>
                                    )}
                                </div>
                            );
                        } else {
                            return (
                                <div key={mte.id} className="flex flex-col sm:flex-row justify-between items-start sm:items-center p-4 bg-nasa-gray-900 rounded-md gap-4">
                                    <div className="w-full">
                                        <h4 className="font-semibold text-white">
                                            <span className="font-mono text-sm text-nasa-gray-400 mr-2">[{mte.refNumber}]</span>{mte.name}
                                        </h4>
                                        <p className="text-sm text-nasa-gray-400">{mte.description}</p>
                                    </div>
                                    <div className="flex-shrink-0 w-full sm:w-auto">
                                        <Button onClick={() => { setSelectedMte(mte); setCurrentStep(0); }} size="sm" className="w-full sm:w-auto">
                                            Rate Task
                                        </Button>
                                    </div>
                                </div>
                            );
                        }
                    })}
                    {mtesInStudy.length === 0 && <p className="text-sm text-nasa-gray-500 text-center py-4">No MTEs have been added to this study yet.</p>}
                </div>
            </Card>
        </>
    );
};

const SessionSelector = () => {
  const { evaluators, studies } = useData();
  const { selectedEvaluatorId, setSelectedEvaluatorId, selectedStudyId, setSelectedStudyId } = useSession();

  const handleEvaluatorChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedEvaluatorId(e.target.value);
    setSelectedStudyId(''); // Reset study when evaluator changes
  };

  const handleStudyChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedStudyId(e.target.value);
  };
  
  return (
    <Card>
      <div className="flex flex-col sm:flex-row items-center gap-x-6 gap-y-4">
        <div className="flex-shrink-0">
          <h2 className="text-lg font-semibold text-white">Assessment Session</h2>
          <p className="text-sm text-nasa-gray-400">Select an evaluator and study to begin.</p>
        </div>
        <div className="w-full flex-grow grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Select
            label="Evaluator"
            id="evaluator-select"
            value={selectedEvaluatorId}
            onChange={handleEvaluatorChange}
            aria-label="Select Evaluator"
          >
            <option value="">-- Choose Evaluator --</option>
            {evaluators.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
          </Select>
          <Select
            label="Study"
            id="study-select"
            value={selectedStudyId}
            onChange={handleStudyChange}
            disabled={!selectedEvaluatorId}
            aria-label="Select Study"
          >
            <option value="">-- Choose Study --</option>
            {studies.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </Select>
        </div>
      </div>
    </Card>
  );
};


const EvaluatorPage: React.FC = () => {
    const { selectedEvaluatorId, selectedStudyId } = useSession();

    const renderContent = () => {
        if (!selectedEvaluatorId || !selectedStudyId) {
            return (
                <Card>
                    <div className="text-center py-8">
                        <h2 className="text-xl font-semibold mb-2">Welcome to the Evaluator Dashboard</h2>
                        <p className="text-lg text-nasa-gray-300">
                           Please select an evaluator and a study from the panel above to begin an assessment.
                        </p>
                         <p className="text-sm text-nasa-gray-400 mt-4">If no evaluators are available, please go to the Admin Dashboard to create one.</p>
                    </div>
                </Card>
            );
        }

        return <AssessmentRunner />;
    }


    return (
        <div className="space-y-8">
            <SessionSelector />
            {renderContent()}
        </div>
    );
};

export default EvaluatorPage;