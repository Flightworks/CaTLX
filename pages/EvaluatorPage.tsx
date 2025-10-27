import React, { useState, useEffect, useMemo } from 'react';
import { useData, useSession } from '../contexts/AppContext';
import { TLXDimension, Rating, MTE, Study } from '../types';
import { TLX_DIMENSIONS_INFO, PAIRWISE_COMBINATIONS, DEFAULT_WEIGHTS } from '../constants';
import Select from '../components/ui/Select';
import TlxSlider from '../components/ui/TlxSlider';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import PairwiseWeightsDisplay from '../components/ui/PairwiseWeightsDisplay';
import ToggleSwitch from '../components/ui/ToggleSwitch';

const initialScores = TLX_DIMENSIONS_INFO.reduce((acc, dim) => {
  acc[dim.id] = 50;
  return acc;
}, {} as Record<TLXDimension, number>);

const PairwiseComparisonView: React.FC<{
  onSubmit: (weights: Record<TLXDimension, number>) => void;
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
    onSubmit(weights);
    onComplete();
  };
  
  const handleSkip = () => {
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
      <div className="flex justify-end space-x-3 mt-6 pt-4 border-t border-nasa-gray-700">
        <Button onClick={handleSkip} variant="secondary">Skip for Now</Button>
        <Button onClick={handleSubmit} disabled={!allPairsSelected}>Submit Weights</Button>
      </div>
    </Card>
  );
};


const AssessmentSetup: React.FC = () => {
    const { evaluators, studies } = useData();
    const { setSelectedEvaluatorId, setSelectedStudyId } = useSession();
    const [localEvaluatorId, setLocalEvaluatorId] = useState('');
    const [localStudyId, setLocalStudyId] = useState('');

    const handleStartSession = () => {
        if (localEvaluatorId && localStudyId) {
            setSelectedEvaluatorId(localEvaluatorId);
            setSelectedStudyId(localStudyId);
        }
    };

    return (
        <div className="max-w-2xl mx-auto">
             <Card title="Assessment Setup">
                <div className="space-y-6">
                     <p className="text-nasa-gray-300">Select an evaluator and a study to begin the assessment session.</p>
                    <Select label="Select Evaluator" value={localEvaluatorId} onChange={e => setLocalEvaluatorId(e.target.value)}>
                        <option value="">-- Choose Evaluator --</option>
                        {evaluators.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
                    </Select>
                    <Select label="Select Study" value={localStudyId} onChange={e => setLocalStudyId(e.target.value)} disabled={!localEvaluatorId}>
                        <option value="">-- Choose Study --</option>
                        {studies.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </Select>
                    <div className="text-right">
                        <Button onClick={handleStartSession} disabled={!localEvaluatorId || !localStudyId}>
                            Start Assessment Session
                        </Button>
                    </div>
                </div>
            </Card>
        </div>
    );
};

const AssessmentRunner: React.FC = () => {
    const { studies, addRating, addPairwiseComparison, pairwiseComparisons } = useData();
    const { selectedEvaluatorId, selectedStudyId } = useSession();
    
    const storageKey = useMemo(() => `ratingMode_${selectedEvaluatorId}`, [selectedEvaluatorId]);

    const [selectedMte, setSelectedMte] = useState<MTE | null>(null);
    const [scores, setScores] = useState<Record<TLXDimension, number>>(initialScores);
    const [view, setView] = useState<'loading' | 'pairwise' | 'tasks'>('loading');
    const [notification, setNotification] = useState('');
    const [ratingMode, setRatingMode] = useState<'express' | 'step-by-step'>(() => {
        const savedMode = localStorage.getItem(storageKey);
        return (savedMode as 'express' | 'step-by-step') || 'step-by-step';
    });
    const [currentStep, setCurrentStep] = useState(0);

    const selectedStudy = useMemo(() => studies.find(s => s.id === selectedStudyId) as Study, [studies, selectedStudyId]);

    const currentComparison = useMemo(() => {
        return pairwiseComparisons.find(pc => pc.evaluatorId === selectedEvaluatorId && pc.studyId === selectedStudyId);
    }, [pairwiseComparisons, selectedEvaluatorId, selectedStudyId]);

    useEffect(() => {
        if (selectedEvaluatorId && selectedStudyId) {
            if (!currentComparison) {
                setView('pairwise');
            } else {
                setView('tasks');
            }
        }
    }, [selectedEvaluatorId, selectedStudyId, currentComparison]);


    const handleScoreChange = (dimension: TLXDimension, value: number) => {
        setScores(prev => ({ ...prev, [dimension]: value }));
    };
    
    const handlePairwiseSubmit = (weights: Record<TLXDimension, number>) => {
        if (selectedEvaluatorId && selectedStudyId) {
            addPairwiseComparison({ evaluatorId: selectedEvaluatorId, studyId: selectedStudyId, weights });
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
        setScores(initialScores);
        setSelectedMte(null);
        setCurrentStep(0);

        setTimeout(() => setNotification(''), 3000);
    };

    if (view === 'loading') {
        return <Card><p className="text-center text-nasa-gray-400">Loading session...</p></Card>
    }

    if (view === 'pairwise') {
        return <PairwiseComparisonView onSubmit={handlePairwiseSubmit} onComplete={handlePairwiseComplete} />
    }

    if (selectedMte) {
        const currentDimension = TLX_DIMENSIONS_INFO[currentStep];
        return (
            <Card>
                <div className="flex justify-between items-center mb-6">
                    <div>
                        <h3 className="text-lg leading-6 font-medium text-white">{`Rating for: ${selectedMte.name}`}</h3>
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
                    <div className="flex justify-between items-center gap-4 mt-6">
                         <Button type="button" variant="secondary" onClick={() => { setSelectedMte(null); setCurrentStep(0); }}>Back to Tasks</Button>
                        
                        {ratingMode === 'express' ? (
                            <Button type="submit">Submit Rating</Button>
                        ) : (
                            <div className="flex items-center gap-2">
                                <Button type="button" onClick={() => setCurrentStep(prev => prev - 1)} disabled={currentStep === 0}>
                                    Previous
                                </Button>
                                {currentStep < TLX_DIMENSIONS_INFO.length - 1 ? (
                                    <Button type="button" onClick={() => setCurrentStep(prev => prev + 1)}>
                                        Next ({currentStep + 1}/{TLX_DIMENSIONS_INFO.length})
                                    </Button>
                                ) : (
                                    <Button type="submit">Submit Rating</Button>
                                )}
                            </div>
                        )}
                    </div>
                </form>
            </Card>
        );
    }

    const isWeighted = !!currentComparison;
    const currentWeights = currentComparison?.weights || DEFAULT_WEIGHTS;

    return (
         <>
            <div className="mb-6">
                <Card title="Current Study Dimension Weights">
                    <div className="flex justify-between items-start">
                        <div className="flex-grow pr-4">
                            <PairwiseWeightsDisplay weights={currentWeights} isWeighted={isWeighted} />
                        </div>
                        <Button onClick={() => setView('pairwise')} variant="secondary" size="sm">
                            Redo Comparison
                        </Button>
                    </div>
                </Card>
            </div>
            <Card title={`Mission Task Elements for: ${selectedStudy.name}`}>
                 {notification && <div className="mb-4 p-3 rounded-md bg-green-500 bg-opacity-20 text-green-300 text-sm">{notification}</div>}
                 <p className="text-nasa-gray-300 mb-4">Select a task to begin rating.</p>
                <div className="space-y-3">
                    {selectedStudy.mtes.map(mte => (
                        <div key={mte.id} className="flex justify-between items-center p-3 bg-nasa-gray-900 rounded-md">
                            <div>
                                <h4 className="font-semibold text-white">{mte.name}</h4>
                                <p className="text-sm text-nasa-gray-400">{mte.description}</p>
                            </div>
                            <Button onClick={() => { setSelectedMte(mte); setCurrentStep(0); }} size="sm">
                                Rate Task
                            </Button>
                        </div>
                    ))}
                    {selectedStudy.mtes.length === 0 && <p className="text-sm text-nasa-gray-500 text-center py-4">No MTEs have been added to this study yet.</p>}
                </div>
            </Card>
        </>
    );
};


const EvaluatorPage: React.FC = () => {
    const { selectedEvaluatorId, selectedStudyId } = useSession();
    const isSessionActive = selectedEvaluatorId && selectedStudyId;

    return (
        <div className="space-y-8">
            {isSessionActive ? <AssessmentRunner /> : <AssessmentSetup />}
        </div>
    );
};

export default EvaluatorPage;