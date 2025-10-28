import React, { useMemo, useState } from 'react';
import { useData } from '../../contexts/AppContext';
import { ComputedTLXScore, TLXDimension } from '../../types';
import { TLX_DIMENSIONS_INFO, DEFAULT_WEIGHTS } from '../../constants';
import Card from '../../components/ui/Card';
import Select from '../../components/ui/Select';
import PairwiseWeightsDisplay from '../../components/ui/PairwiseWeightsDisplay';

const ViewStats: React.FC = () => {
  const { ratings, pairwiseComparisons, evaluators, studies, mtes } = useData();
  const [filterStudyId, setFilterStudyId] = useState<string>('');
  const [filterMteId, setFilterMteId] = useState<string>('');
  
  const computedScores = useMemo<ComputedTLXScore[]>(() => {
    return ratings.map(rating => {
      const evaluator = evaluators.find(e => e.id === rating.evaluatorId);
      const study = studies.find(s => s.id === rating.studyId);
      const mte = mtes.find(m => m.id === rating.mteId);
      const comparison = pairwiseComparisons.find(pc => pc.evaluatorId === rating.evaluatorId && pc.studyId === rating.studyId);
      
      const isWeighted = !!comparison && comparison.isWeighted;
      const weights = comparison ? comparison.weights : DEFAULT_WEIGHTS;
      
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
  }, [ratings, pairwiseComparisons, evaluators, studies, mtes]);

  const mtesForFilter = useMemo(() => {
    if (!filterStudyId) return mtes;
    const study = studies.find(s => s.id === filterStudyId);
    if (!study) return [];
    return mtes.filter(mte => study.mteIds.includes(mte.id));
  }, [filterStudyId, studies, mtes]);

  const handleStudyFilterChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setFilterStudyId(e.target.value);
    setFilterMteId(''); // Reset MTE filter when study changes
  };

  const filteredScores = useMemo(() => {
      let scores = computedScores;
      if (filterStudyId) {
          scores = scores.filter(score => score.studyId === filterStudyId);
      }
      if (filterMteId) {
          scores = scores.filter(score => score.mteId === filterMteId);
      }
      return scores;
  }, [computedScores, filterStudyId, filterMteId]);

  return (
    <Card>
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <h2 className="text-xl font-bold">Assessment Statistics</h2>
        <div className="flex flex-col sm:flex-row gap-4 w-full md:w-auto">
          <div className="w-full sm:w-64">
            <Select label="Filter by Study" value={filterStudyId} onChange={handleStudyFilterChange}>
              <option value="">All Studies</option>
              {studies.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </Select>
          </div>
          <div className="w-full sm:w-64">
            <Select label="Filter by MTE" value={filterMteId} onChange={e => setFilterMteId(e.target.value)}>
              <option value="">All MTEs</option>
              {mtesForFilter.map(m => <option key={m.id} value={m.id}>[{m.refNumber}] {m.name}</option>)}
            </Select>
          </div>
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-nasa-gray-700">
          <thead className="bg-nasa-gray-800">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-nasa-gray-300 uppercase tracking-wider">Study</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-nasa-gray-300 uppercase tracking-wider">MTE</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-nasa-gray-300 uppercase tracking-wider">Evaluator</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-nasa-gray-300 uppercase tracking-wider">Overall Workload Score</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-nasa-gray-300 uppercase tracking-wider">Dimension Weights</th>
            </tr>
          </thead>
          <tbody className="bg-nasa-gray-900 divide-y divide-nasa-gray-700">
            {filteredScores.map((score, index) => (
              <tr key={`${score.studyId}-${score.mteId}-${score.evaluatorName}-${index}`}>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-nasa-gray-300">{score.studyName}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-white">{score.mteName}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-nasa-gray-300">{score.evaluatorName}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold">
                  <div className="flex items-center space-x-2">
                    <span className={score.isWeighted ? 'text-nasa-blue' : 'text-nasa-gray-300'}>
                      {score.totalWeightedScore.toFixed(2)}
                    </span>
                    {!score.isWeighted && (
                        <span 
                            className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-nasa-gray-700 text-nasa-gray-300" 
                            title="Unweighted (pairwise comparison was skipped, showing raw average score)">
                            Unweighted
                        </span>
                    )}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm">
                  <PairwiseWeightsDisplay weights={score.weights} compact isWeighted={score.isWeighted} />
                </td>
              </tr>
            ))}
            {filteredScores.length === 0 && (
                <tr>
                    <td colSpan={5} className="text-center py-10 text-nasa-gray-500">No matching ratings found.</td>
                </tr>
            )}
          </tbody>
        </table>
      </div>
    </Card>
  );
};

export default ViewStats;
