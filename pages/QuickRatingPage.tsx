
import React, { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { TLXDimension, ComputedTLXScore } from '../types';
import { TLX_DIMENSIONS_INFO, PAIRWISE_COMBINATIONS, DEFAULT_WEIGHTS } from '../constants';
import TlxSlider from '../components/ui/TlxSlider';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import PairwiseWeightsDisplay from '../components/ui/PairwiseWeightsDisplay';
import ToggleSwitch from '../components/ui/ToggleSwitch';

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

    const DimensionCard: React.FC<{ dimension: typeof dimensionA, onSelect: () => void }> = ({ dimension, onSelect }) => (
        <div
            onClick={onSelect}
            className="w-full sm:w-1/2 p-6 bg-nasa-gray-900 rounded-lg cursor-pointer transition-all duration-200 ease-in-out hover:bg-nasa-light-blue hover:shadow-2xl hover:scale-105 border-2 border-nasa-gray-700 hover:border-nasa-blue"
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onSelect();
                }
            }}
        >
            <h3 className="text-xl font-bold text-center text-white">{dimension.title}</h3>
            <p className="text-sm text-nasa-gray-400 mt-2 text-center">{dimension.description}</p>
        </div>
    );

    return (
        <Card title={t('evaluator.determine_weights')}>
            <div className="space-y-6">
                <div>
                    <p className="text-nasa-gray-300 mb-4 text-center">{t('evaluator.weights_description')}</p>
                </div>

                <div>
                    <div className="flex justify-between mb-1">
                        <span className="text-base font-medium text-nasa-blue">{t('evaluator.comparison', { current: currentPairIndex + 1, total: PAIRWISE_COMBINATIONS.length })}</span>
                    </div>
                    <div className="w-full bg-nasa-gray-700 rounded-full h-2.5">
                        <div className="bg-nasa-blue h-2.5 rounded-full transition-all duration-300 ease-in-out" style={{ width: `${progress}%` }}></div>
                    </div>
                </div>

                <div className="text-center">
                    <h2 className="text-lg font-semibold text-white mb-4">{t('evaluator.which_workload')}</h2>
                    <div className="flex flex-col sm:flex-row items-stretch justify-center gap-4">
                        <DimensionCard dimension={dimensionA} onSelect={() => handleSelect(dimensionA.id)} />
                        <DimensionCard dimension={dimensionB} onSelect={() => handleSelect(dimensionB.id)} />
                    </div>
                </div>
            </div>

            <div className="flex justify-center mt-8 pt-4 border-t border-nasa-gray-700">
                <Button onClick={onCancel} variant="secondary" className="w-full sm:w-auto">{t('evaluator.cancel')}</Button>
            </div>
        </Card>
    );
};

const QuickRatingPage: React.FC = () => {
    const { t } = useTranslation();

    const getDimensionKey = (id: string) => {
        return id.toLowerCase().replace(/ /g, '_');
    };

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

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-white">{t('quick_rating.title')}</h1>
                    <p className="text-nasa-gray-400">{t('quick_rating.description')}</p>
                </div>
                <div className="flex items-center gap-4">
                    <div className="text-right">
                        <span className="text-sm text-nasa-gray-400 block">{t('evaluator.overall_workload')}</span>
                        <span className="text-3xl font-bold" style={{ color: getScoreColor(totalWeightedScore) }}>
                            {totalWeightedScore.toFixed(2)}
                        </span>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 space-y-6">
                    <Card>
                        <div className="grid grid-cols-1 gap-6">
                            {TLX_DIMENSIONS_INFO.map(dim => (
                                <TlxSlider
                                    key={dim.id}
                                    title={t(`tlx_dimensions.${getDimensionKey(dim.id)}.title`)}
                                    description={t(`tlx_dimensions.${getDimensionKey(dim.id)}.description`)}
                                    lowAnchor={t(`tlx_dimensions.${getDimensionKey(dim.id)}.low_anchor`)}
                                    highAnchor={t(`tlx_dimensions.${getDimensionKey(dim.id)}.high_anchor`)}
                                    value={scores[dim.id]}
                                    onChange={(val) => handleScoreChange(dim.id, val)}
                                    compact={true}
                                />
                            ))}
                        </div>
                    </Card>
                </div>

                <div className="space-y-6">
                    <Card title={t('evaluator.weights')}>
                        <div className="space-y-4">
                            <div className="flex justify-between items-center">
                                <span className="text-white font-medium">{isWeighted ? t('evaluator.weighted') : t('evaluator.unweighted')}</span>
                                <ToggleSwitch
                                    label=""
                                    options={[
                                        { value: 'unweighted', label: t('evaluator.unweighted') },
                                        { value: 'weighted', label: t('evaluator.weighted') },
                                    ]}
                                    selectedValue={isWeighted ? 'weighted' : 'unweighted'}
                                    onChange={(val) => setIsWeighted(val === 'weighted')}
                                />
                            </div>

                            <PairwiseWeightsDisplay weights={isWeighted ? weights : DEFAULT_WEIGHTS} isWeighted={isWeighted} />

                            <Button
                                onClick={() => setView('pairwise')}
                                variant="secondary"
                                className="w-full"
                            >
                                {t('evaluator.determine_weights')}
                            </Button>

                            {isWeighted && (
                                <Button
                                    onClick={() => {
                                        setWeights(DEFAULT_WEIGHTS);
                                        setIsWeighted(false);
                                    }}
                                    variant="danger"
                                    className="w-full"
                                >
                                    {t('evaluator.reset_weights')}
                                </Button>
                            )}
                        </div>
                    </Card>

                    <Card title={t('evaluator.summary')}>
                        <div className="space-y-2">
                            {TLX_DIMENSIONS_INFO.map(dim => (
                                <div key={dim.id} className="flex justify-between text-sm">
                                    <span className="text-nasa-gray-400">{t(`tlx_dimensions.${getDimensionKey(dim.id)}.title`)}</span>
                                    <span className="font-mono font-semibold text-white">{scores[dim.id]}</span>
                                </div>
                            ))}
                            <div className="pt-4 border-t border-nasa-gray-700 flex justify-between items-center mt-4">
                                <span className="font-bold text-white">{t('evaluator.total_score')}</span>
                                <span className="font-bold text-xl" style={{ color: getScoreColor(totalWeightedScore) }}>{totalWeightedScore.toFixed(2)}</span>
                            </div>
                        </div>
                    </Card>
                </div>
            </div>
        </div>
    );
};

export default QuickRatingPage;
