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
  const [selections, setSelections] = useState<Record<string, TLXDimension | null>>({});

  const handleSelect = (pairIndex: number, dimension: TLXDimension) => {
    setSelections(prev => ({ ...prev, [pairIndex]: dimension }));
  };

  const handleSubmit = () => {
    const weights = TLX_DIMENSIONS_INFO.reduce((acc, dim) => {
      acc[dim.id] = 0;
      return acc;
    }, {} as Record<TLXDimension, number>);

    (Object.values(selections) as (TLXDimension | null)[]).forEach(dim => {
      if (dim) {
        weights[dim]++;
      }
    });
    onSubmit(weights, true);
    onComplete();
  };
  
  const handleSkip = () => {
      onSubmit(DEFAULT_WEIGHTS, false);
      onComplete();
  }

  const allPairsSelected = Object.keys(selections).length === PAIRWISE_COMBINATIONS.length;

  return (
    <Card title="Pairwise Comparison">
      <div className="space-y-4">
        <p className="text-nasa-gray-300">For each pair, select the dimension that contributed more to the workload of the tasks in this study.</p>
        {PAIRWISE_COMBINATIONS.map((pair, index) => (
          <div key={index} className="p-3 bg-nasa-gray-900 rounded-md">
            <p className="text-center text-sm font-medium mb-2 text-nasa-gray-400">Which was a more important source of workload?</p>
            <div className="grid grid-cols-2 gap-2">
              <Button
                onClick={() => handleSelect(index, pair[0])}
                variant={selections[index] === pair[0] ? 'primary' : 'secondary'}
              >
                {pair[0]}
              </Button>
              <Button
                onClick={() => handleSelect(index, pair[1])}
                variant={selections[index] === pair[1] ? 'primary' : 'secondary'}
              >
                {pair[1]}
              </Button>
            </div>
          </div>
        ))}
      </div>
      <div className="flex flex-col sm:flex-row justify-end space-y-2 sm:space-y-0 sm:space-x-3 mt-6 pt-4 border-t border-nasa-gray-700">
        <Button onClick={handleSkip} variant="secondary" className="w-full sm:w-auto">Skip for Now</Button>
        <Button onClick={handleSubmit} disabled={!allPairsSelected} className="w-full sm:w-auto">Submit Weights</Button>
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
    const [view, setView] = useState<'loading' | 'pairwise' | 'tasks' | 'summary'>('loading');
    const [notification, setNotification] = useState('');
    const [ratingMode, setRatingMode] = useState<'express' | 'step-by-step'>(() => {
        const savedMode = localStorage.getItem(storageKey);
        return (savedMode as 'express' | 'step-by-step') || 'step-by-step';
    });
    const [currentStep, setCurrentStep] = useState(0);

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

    const handleSubmitRating = (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedMte) return;

        const newRating: Omit<Rating, 'id' | 'timestamp'> = {
            evaluatorId: selectedEvaluatorId,
            studyId: selectedStudyId,
            mteId: selectedMte.id,
            scores,
        };
        addRating(newRating);
        setNotification(`Rating for "${selectedMte.name}" submitted successfully!`);
        
        const ratedMteIdsAfterThisOne = new Set([...ratedMteIds, selectedMte.id]);
        
        if (mtesInStudy.length > 0 && mtesInStudy.every(mte => ratedMteIdsAfterThisOne.has(mte.id))) {
            setView('summary');
        }

        setScores(initialScores);
        setSelectedMte(null);
        setCurrentStep(0);

        setTimeout(() => setNotification(''), 3000);
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
        const currentDimension = TLX_DIMENSIONS_INFO[currentStep];
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
                    {ratingMode === 'express' ? (
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
                    ) : (
                        <div>
                             <TlxSlider
                                key={currentDimension.id}
                                title={currentDimension.title}
                                description={currentDimension.description}
                                lowAnchor={currentDimension.lowAnchor}
                                highAnchor={currentDimension.highAnchor}
                                value={scores[currentDimension.id]}
                                onChange={(val) => handleScoreChange(currentDimension.id, val)}
                            />
                        </div>
                    )}
                    <div className="flex flex-col-reverse sm:flex-row justify-between items-center gap-4 mt-6">
                         <Button type="button" variant="secondary" onClick={() => { setSelectedMte(null); setCurrentStep(0); }} className="w-full sm:w-auto">Back to Tasks</Button>
                        
                        {ratingMode === 'express' ? (
                            <Button type="submit" className="w-full sm:w-auto">Submit Rating</Button>
                        ) : (
                            <div className="flex items-center gap-2 w-full sm:w-auto">
                                <Button type="button" onClick={() => setCurrentStep(prev => prev - 1)} disabled={currentStep === 0} className="w-1/2 sm:w-auto">
                                    Previous
                                </Button>
                                {currentStep < TLX_DIMENSIONS_INFO.length - 1 ? (
                                    <Button type="button" onClick={() => setCurrentStep(prev => prev + 1)} className="w-1/2 sm:w-auto">
                                        Next ({currentStep + 1}/{TLX_DIMENSIONS_INFO.length})
                                    </Button>
                                ) : (
                                    <Button type="submit" className="w-1/2 sm:w-auto">Submit Rating</Button>
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