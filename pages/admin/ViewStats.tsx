import React, { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useData, useSession } from '../../contexts/AppContext';
import { ComputedTLXScore, TLXDimension } from '../../types';
import { TLX_DIMENSIONS_INFO, DEFAULT_WEIGHTS } from '../../constants';
import Card from '../../components/ui/Card';
import Select from '../../components/ui/Select';
import MteStatsCard from '../../components/admin/MteStatsCard';
import MteDetailModal from '../../components/admin/MteDetailModal';
import MteComparisonChart from '../../components/admin/MteComparisonChart';
import Button from '../../components/ui/Button';

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
  const { t } = useTranslation();
  const { ratings, pairwiseComparisons, evaluators, studies, mtes } = useData();
  const { selectedProjectId } = useSession();
  const [filterStudyId, setFilterStudyId] = useState<string>('');
  const [selectedMte, setSelectedMte] = useState<AggregatedMteStats | null>(null);

  useEffect(() => {
    setFilterStudyId('');
  }, [selectedProjectId]);
  
  const availableStudies = useMemo(() => {
    return selectedProjectId
      ? studies.filter(study => study.projectId === selectedProjectId)
      : studies;
  }, [selectedProjectId, studies]);

  const projectMteIds = useMemo(() => {
    if (!selectedProjectId) return new Set<string>(mtes.map(m => m.id));
    const ids = new Set<string>();
    availableStudies.forEach(study => study.mteIds.forEach(id => ids.add(id)));
    return ids;
  }, [availableStudies, mtes, selectedProjectId]);

  type EnrichedComputedScore = ComputedTLXScore & {
    ratingId: string;
    timestamp: number;
    mteRefNumber: string;
    projectId: string;
    evaluatorId: string;
  };

  const filteredRatings = useMemo(() => {
    return ratings.filter(rating => {
      const study = studies.find(s => s.id === rating.studyId);
      if (!study) return false;
      if (selectedProjectId && study.projectId !== selectedProjectId) return false;
      if (filterStudyId && rating.studyId !== filterStudyId) return false;
      return true;
    });
  }, [filterStudyId, ratings, selectedProjectId, studies]);

  const computedScores = useMemo<EnrichedComputedScore[]>(() => {
    return filteredRatings.map(rating => {
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
      
      const mteDisplayName = (() => {
        if (!mte) return 'Unknown';
        return mte.refNumber ? `[${mte.refNumber}] ${mte.name}` : mte.name;
      })();

      return {
        ratingId: rating.id,
        timestamp: rating.timestamp,
        evaluatorName: evaluator?.name || 'Unknown',
        studyName: study?.name || 'Unknown',
        studyId: study?.id || '',
        mteId: rating.mteId,
        mteName: mteDisplayName,
        mteRefNumber: mte?.refNumber || '',
        rawScores: rating.scores,
        weights,
        weightedScores,
        totalWeightedScore: totalWeight > 0 ? totalWeightedScore / totalWeight : 0,
        isWeighted,
        comments: rating.comments,
        projectId: study?.projectId || '',
        evaluatorId: rating.evaluatorId,
      };
    });
  }, [evaluators, filteredRatings, mtes, pairwiseComparisons, studies]);


  const aggregatedMteData = useMemo<AggregatedMteStats[]>(() => {
    const scoresToProcess = computedScores;

    const scoresByMte = scoresToProcess.reduce((acc, score) => {
      if (!acc[score.mteId]) {
        acc[score.mteId] = [];
      }
      acc[score.mteId].push(score);
      return acc;
    }, {} as Record<string, ComputedTLXScore[]>);

    const mtesToDisplay = filterStudyId 
        ? mtes.filter(mte => studies.find(s => s.id === filterStudyId)?.mteIds.includes(mte.id))
        : mtes.filter(mte => projectMteIds.has(mte.id));

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
  }, [computedScores, filterStudyId, mtes, projectMteIds, studies]);

  const downloadCsv = () => {
    if (computedScores.length === 0) {
      return;
    }

    const headers = [
      t('stats.csv_headers.rating_id'),
      t('stats.csv_headers.project_id'),
      t('stats.csv_headers.study'),
      t('stats.csv_headers.mte_ref'),
      t('stats.csv_headers.mte_name'),
      t('stats.csv_headers.evaluator'),
      t('stats.csv_headers.timestamp'),
      t('stats.csv_headers.is_weighted'),
      t('stats.csv_headers.total_weighted_score'),
      ...TLX_DIMENSIONS_INFO.map(dim => `${dim.id}${t('stats.csv_headers.raw_suffix')}`),
      ...TLX_DIMENSIONS_INFO.map(dim => `${dim.id}${t('stats.csv_headers.weight_suffix')}`),
      t('stats.csv_headers.comments'),
    ];

    const rows = computedScores.map(score => {
      const timestampIso = new Date(score.timestamp).toISOString();
      const values = [
        score.ratingId,
        score.projectId,
        score.studyName,
        score.mteRefNumber,
        score.mteName,
        score.evaluatorName,
        timestampIso,
        score.isWeighted ? t('stats.csv_values.yes') : t('stats.csv_values.no'),
        score.totalWeightedScore.toFixed(2),
        ...TLX_DIMENSIONS_INFO.map(dim => score.rawScores[dim.id]),
        ...TLX_DIMENSIONS_INFO.map(dim => score.weights[dim.id]),
        score.comments || '',
      ];

      return values.map(value => {
        const str = value?.toString() ?? '';
        if (str.includes(',') || str.includes('"') || str.includes('\n')) {
          return `"${str.replace(/"/g, '""')}"`;
        }
        return str;
      }).join(',');
    });

    const csvContent = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `catlx-evaluations${selectedProjectId ? `-${selectedProjectId}` : ''}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <h2 className="text-2xl font-bold text-white">{t('stats.title')}</h2>
        <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto sm:items-center">
          <div className="w-full sm:w-64">
            <Select label={t('stats.filter_study')} id="study-filter" value={filterStudyId} onChange={(e) => setFilterStudyId(e.target.value)}>
                <option value="">{t('stats.all_studies')}</option>
                {availableStudies.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </Select>
          </div>
          <Button onClick={downloadCsv} disabled={computedScores.length === 0}>
            {t('stats.export_csv')}
          </Button>
        </div>
      </div>
      
      <MteComparisonChart data={aggregatedMteData} />

      <Card title={t('stats.breakdown_title')}>
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
              <h3 className="text-lg font-semibold">{t('stats.no_data_title')}</h3>
              <p>{t('stats.no_data_desc')}</p>
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
