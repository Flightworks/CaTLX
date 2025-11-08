import React, { useMemo, useState } from 'react';
import { useData } from '../../contexts/AppContext';
import { ComputedTLXScore, TLXDimension, MTE, Study } from '../../types';
import { TLX_DIMENSIONS_INFO, DEFAULT_WEIGHTS } from '../../constants';
import Card from '../../components/ui/Card';
import Select from '../../components/ui/Select';
import MteStatsCard from '../../components/admin/MteStatsCard';
import MteDetailModal from '../../components/admin/MteDetailModal';
import MteComparisonChart from '../../components/admin/MteComparisonChart';

export interface AggregatedMteStats {
  mteId: string;
  mteName: string;
  mteRefNumber: string;
  numberOfEvals: number;
  avgOverallScore: number;
  stdDevOverallScore: number;
  avgRawScores: Record<TLXDimension, number>;
  studyNames: string[];
}

const ViewStats: React.FC = () => {
  const { ratings, pairwiseComparisons, evaluators, studies, mtes } = useData();
  const [filterStudyId, setFilterStudyId] = useState<string>('');
  const [selectedMte, setSelectedMte] = useState<AggregatedMteStats | null>(null);
  
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
        comments: rating.comments,
      };
    });
  }, [ratings, pairwiseComparisons, evaluators, studies, mtes]);


  const aggregatedMteData = useMemo<AggregatedMteStats[]>(() => {
    const scoresToProcess = filterStudyId
      ? computedScores.filter(score => score.studyId === filterStudyId)
      : computedScores;

    const scoresByMte = scoresToProcess.reduce((acc, score) => {
      if (!acc[score.mteId]) {
        acc[score.mteId] = [];
      }
      acc[score.mteId].push(score);
      return acc;
    }, {} as Record<string, ComputedTLXScore[]>);

    const mtesToDisplay = filterStudyId 
        ? mtes.filter(mte => studies.find(s => s.id === filterStudyId)?.mteIds.includes(mte.id))
        : mtes;

    return mtesToDisplay.map(mte => {
        const mteScores = scoresByMte[mte.id] || [];
        
        if (mteScores.length === 0) {
            return {
                mteId: mte.id,
                mteName: mte.name,
                mteRefNumber: mte.refNumber,
                numberOfEvals: 0,
                avgOverallScore: 0,
                stdDevOverallScore: 0,
                avgRawScores: {} as Record<TLXDimension, number>,
                studyNames: studies.filter(s => s.mteIds.includes(mte.id)).map(s => s.name)
            };
        }

        const numberOfEvals = mteScores.length;
        
        const sumOverallScore = mteScores.reduce((sum, score) => sum + score.totalWeightedScore, 0);
        const avgOverallScore = sumOverallScore / numberOfEvals;

        const variance = mteScores.reduce((sum, score) => sum + Math.pow(score.totalWeightedScore - avgOverallScore, 2), 0) / numberOfEvals;
        const stdDevOverallScore = Math.sqrt(variance);

        const avgRawScores = {} as Record<TLXDimension, number>;
        for (const dimInfo of TLX_DIMENSIONS_INFO) {
            const dim = dimInfo.id;
            const sumRawScore = mteScores.reduce((sum, score) => sum + score.rawScores[dim], 0);
            avgRawScores[dim] = sumRawScore / numberOfEvals;
        }

        const studyNames = [...new Set(mteScores.map(s => s.studyName))];

        return {
            mteId: mte.id,
            mteName: mte.name,
            mteRefNumber: mte.refNumber,
            numberOfEvals,
            avgOverallScore,
            stdDevOverallScore,
            avgRawScores,
            studyNames
        };
    }).sort((a,b) => a.mteName.localeCompare(b.mteName));
  }, [computedScores, filterStudyId, mtes, studies]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <h2 className="text-2xl font-bold text-white">MTE Statistics Dashboard</h2>
        <div className="w-full sm:w-64">
            <Select label="Filter by Study" id="study-filter" value={filterStudyId} onChange={(e) => setFilterStudyId(e.target.value)}>
                <option value="">All Studies</option>
                {studies.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </Select>
        </div>
      </div>
      
      <MteComparisonChart data={aggregatedMteData} />

      <Card title="Individual MTE Breakdown">
        {aggregatedMteData.length > 0 ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {aggregatedMteData.map(stats => (
                  <MteStatsCard 
                    key={stats.mteId} 
                    mteStats={stats} 
                    onClick={() => setSelectedMte(stats)}
                  />
              ))}
          </div>
        ) : (
           <div className="text-center py-16 text-nasa-gray-500">
              <h3 className="text-lg font-semibold">No Matching Data Found</h3>
              <p>There are no ratings for the selected criteria.</p>
          </div>
        )}
      </Card>

      {selectedMte && (
        <MteDetailModal
          mteStats={selectedMte}
          scores={computedScores}
          onClose={() => setSelectedMte(null)}
        />
      )}
    </div>
  );
};

export default ViewStats;