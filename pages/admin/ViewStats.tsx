import React, { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useData, useSession } from '../../contexts/AppContext';
import { ComputedTLXScore, TLXDimension } from '../../types';
import { TLX_DIMENSIONS_INFO, DEFAULT_WEIGHTS } from '../../constants';
import { downloadCsv as saveCsv } from '../../data/csv';
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

const ViewStats: React.FC<{ projectId?: string; studyId?: string }> = ({ projectId, studyId }) => {
  const { t } = useTranslation();
  const { ratings, pairwiseComparisons, evaluators, studies, mtes, scenarios = [] } = useData();
  const session = useSession();
  const selectedProjectId = projectId ?? session.selectedProjectId;
  const [selectedStudy, setFilterStudyId] = useState('');
  const filterStudyId = studyId ?? selectedStudy;
  const [filterScenario, setFilterScenario] = useState('');
  const [selectedMte, setSelectedMte] = useState<AggregatedMteStats | null>(null);

  useEffect(() => {
    setFilterStudyId('');
    setFilterScenario('');
  }, [selectedProjectId]);
  
  const availableStudies = useMemo(() => {
    return selectedProjectId
      ? studies.filter(study => study.projectId === selectedProjectId)
      : studies;
  }, [selectedProjectId, studies]);

  const availableScenarios = scenarios.filter(scenario =>
    availableStudies.some(study => study.id === scenario.studyId) &&
    (!filterStudyId || filterStudyId === scenario.studyId));
  const includesTask = (studyId: string, mteId: string) =>
    Boolean(studies.find(study => study.id === studyId)?.mteIds.includes(mteId)) ||
    scenarios.some(scenario => scenario.studyId === studyId && scenario.mteIds.includes(mteId));

  const projectMteIds = useMemo(() => {
    if (!selectedProjectId) return new Set<string>(mtes.map(m => m.id));
    const ids = new Set<string>();
    availableStudies.forEach(study => study.mteIds.forEach(id => ids.add(id)));
    scenarios.filter(scenario => availableStudies.some(study => study.id === scenario.studyId))
      .forEach(scenario => scenario.mteIds.forEach(id => ids.add(id)));
    return ids;
  }, [availableStudies, mtes, scenarios, selectedProjectId]);

  type EnrichedComputedScore = ComputedTLXScore & {
    ratingId: string;
    timestamp: number;
    mteRefNumber: string;
    projectId: string;
    evaluatorId: string;
    scenarioName: string;
  };

  const filteredRatings = useMemo(() => {
    return ratings.filter(rating => {
      if (rating.passageId) return false;
      const study = studies.find(s => s.id === rating.studyId);
      if (!study) return false;
      if (selectedProjectId && study.projectId !== selectedProjectId) return false;
      if (filterStudyId && rating.studyId !== filterStudyId) return false;
      if (filterScenario === '$direct') return !rating.scenarioId;
      return !filterScenario || rating.scenarioId === filterScenario;
    });
  }, [filterScenario, filterStudyId, ratings, selectedProjectId, studies]);

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
        if (!mte) return t('common.unknown');
        return mte.refNumber ? `[${mte.refNumber}] ${mte.name}` : mte.name;
      })();

      return {
        ratingId: rating.id,
        scenarioName: scenarios.find(scenario => scenario.id === rating.scenarioId)?.name ?? '',
        timestamp: rating.timestamp,
        evaluatorName: evaluator?.name || t('common.unknown'),
        studyName: study?.name || t('common.unknown'),
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
        observations: rating.observations,
        projectId: study?.projectId || '',
        evaluatorId: rating.evaluatorId,
      };
    });
  }, [evaluators, filteredRatings, mtes, pairwiseComparisons, scenarios, studies, t]);


  const aggregatedMteData = useMemo<AggregatedMteStats[]>(() => {
    const scoresToProcess = computedScores;

    const scoresByMte = scoresToProcess.reduce((acc, score) => {
      if (!acc[score.mteId]) {
        acc[score.mteId] = [];
      }
      acc[score.mteId].push(score);
      return acc;
    }, {} as Record<string, ComputedTLXScore[]>);

    const scenario = scenarios.find(entry => entry.id === filterScenario);
    const ratedIds = new Set(computedScores.map(score => score.mteId));
    const mtesToDisplay = mtes.filter(mte => {
        if (ratedIds.has(mte.id)) return true;
        if (scenario) return scenario.mteIds.includes(mte.id);
        if (filterScenario === '$direct') {
            return availableStudies.some(study => (!filterStudyId || study.id === filterStudyId) && study.mteIds.includes(mte.id));
        }
        return filterStudyId ? includesTask(filterStudyId, mte.id) : projectMteIds.has(mte.id);
    });

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
                studyNames: availableStudies.filter(study => includesTask(study.id, mte.id)).map(study => study.name)
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
  }, [availableStudies, computedScores, filterScenario, filterStudyId, mtes, projectMteIds, scenarios, studies, t]);

  const downloadCsv = () => {
    if (computedScores.length === 0) {
      return;
    }

    const headers = [
      t('stats.csv_headers.rating_id'),
      t('stats.csv_headers.project_id'),
      t('stats.csv_headers.study'),
      t('projects.scenario'),
      t('stats.csv_headers.mte_ref'),
      t('stats.csv_headers.mte_name'),
      t('stats.csv_headers.evaluator'),
      t('stats.csv_headers.timestamp'),
      t('stats.csv_headers.is_weighted'),
      t('stats.csv_headers.total_weighted_score'),
      ...TLX_DIMENSIONS_INFO.map(dim => `${t(`tlx_dimensions.${dim.id.toLowerCase().replaceAll(' ', '_')}.title`)}${t('stats.csv_headers.raw_suffix')}`),
      ...TLX_DIMENSIONS_INFO.map(dim => `${t(`tlx_dimensions.${dim.id.toLowerCase().replaceAll(' ', '_')}.title`)}${t('stats.csv_headers.weight_suffix')}`),
      t('stats.csv_headers.comments'),
      t('mte_observation.csv_header'),
    ];

    const rows = computedScores.map(score => {
      const timestampIso = new Date(score.timestamp).toISOString();
      const values = [
        score.ratingId,
        score.projectId,
        score.studyName,
        score.scenarioName,
        score.mteRefNumber,
        score.mteName,
        score.evaluatorName,
        timestampIso,
        score.isWeighted ? t('stats.csv_values.yes') : t('stats.csv_values.no'),
        score.totalWeightedScore.toFixed(2),
        ...TLX_DIMENSIONS_INFO.map(dim => score.rawScores[dim.id]),
        ...TLX_DIMENSIONS_INFO.map(dim => score.weights[dim.id]),
        score.comments || '',
        score.observations?.length ? JSON.stringify(score.observations) : '',
      ];

      return values;
    });

    saveCsv(`catlx-evaluations${selectedProjectId ? `-${selectedProjectId}` : ''}.csv`, [headers, ...rows]);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <h2 className="text-2xl font-bold text-foreground">{t('stats.title')}</h2>
        <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto sm:items-center">
          {!studyId && <div className="w-full sm:w-64">
            <Select label={t('stats.filter_study')} id="study-filter" value={filterStudyId} onChange={(e) => {
              setFilterStudyId(e.target.value);
              setFilterScenario('');
            }}>
                <option value="">{t('stats.all_studies')}</option>
                {availableStudies.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </Select>
          </div>}
          {availableScenarios.length > 0 && <div className="w-full sm:w-64">
            <Select label={t('projects.scenario')} id="scenario-filter" value={filterScenario}
              onChange={e => { setFilterScenario(e.target.value); setSelectedMte(null); }}>
              <option value="">{t('projects.all_contexts')}</option>
              <option value="$direct">{t('projects.study_tasks')}</option>
              {availableScenarios.map(scenario => (
                <option key={scenario.id} value={scenario.id}>
                  {filterStudyId ? scenario.name : `${availableStudies.find(study => study.id === scenario.studyId)?.name} / ${scenario.name}`}
                </option>
              ))}
            </Select>
          </div>}
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
