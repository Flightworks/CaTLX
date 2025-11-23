import React from 'react';
import { useTranslation } from 'react-i18next';
import { AggregatedMteStats } from '../../pages/admin/ViewStats';
import { ComputedTLXScore } from '../../types';
import { TLX_DIMENSIONS_INFO } from '../../constants';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import PairwiseWeightsDisplay from '../ui/PairwiseWeightsDisplay';
import ScoreDistributionChart from './ScoreDistributionChart';

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

const DimensionHeader: React.FC<{ title: string; fullTitle: string }> = ({ title, fullTitle }) => (
  <th scope="col" title={fullTitle} className="px-2 py-3 text-center text-xs font-medium text-nasa-gray-300 uppercase tracking-wider">
    {title}
  </th>
);

const MteDetailModal: React.FC<{
  mteStats: AggregatedMteStats;
  scores: ComputedTLXScore[];
  onClose: () => void;
}> = ({ mteStats, scores, onClose }) => {
  const { t } = useTranslation();

  const relevantScores = scores.filter(score => score.mteId === mteStats.mteId);
  const overallScores = relevantScores.map(s => s.totalWeightedScore);

  return (
    <Modal
      isOpen={true}
      onClose={onClose}
      title={`${t('stats.detailed_scores_for')} [${mteStats.mteRefNumber}] ${mteStats.mteName}`}
      size="5xl"
      footer={
        <Button variant="secondary" onClick={onClose}>{t('common.close')}</Button>
      }
    >
      <div className="space-y-6">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-nasa-gray-700">
            <thead className="bg-nasa-gray-800">
              <tr>
                <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-nasa-gray-300 uppercase tracking-wider">{t('stats.csv_headers.evaluator')}</th>
                <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-nasa-gray-300 uppercase tracking-wider">{t('stats.csv_headers.study')}</th>
                <th scope="col" className="px-2 py-3 text-center text-xs font-medium text-nasa-gray-300 uppercase tracking-wider">{t('stats.score')}</th>
                <DimensionHeader title="MD" fullTitle={t('tlx_dimensions.mental_demand.title')} />
                <DimensionHeader title="PD" fullTitle={t('tlx_dimensions.physical_demand.title')} />
                <DimensionHeader title="TD" fullTitle={t('tlx_dimensions.temporal_demand.title')} />
                <DimensionHeader title="P" fullTitle={t('tlx_dimensions.performance.title')} />
                <DimensionHeader title="E" fullTitle={t('tlx_dimensions.effort.title')} />
                <DimensionHeader title="F" fullTitle={t('tlx_dimensions.frustration.title')} />
                <th scope="col" className="px-2 py-3 text-center text-xs font-medium text-nasa-gray-300 uppercase tracking-wider">{t('stats.weights')}</th>
              </tr>
            </thead>
            <tbody className="bg-nasa-gray-900 divide-y divide-nasa-gray-700">
              {relevantScores.map((score, index) => (
                <React.Fragment key={index}>
                  <tr>
                    <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-white">{score.evaluatorName}</td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-nasa-gray-300">{score.studyName}</td>
                    <td className="px-2 py-4 whitespace-nowrap text-sm font-bold text-center" style={{ color: getScoreColor(score.totalWeightedScore) }}>
                      {score.totalWeightedScore.toFixed(1)}
                    </td>
                    {TLX_DIMENSIONS_INFO.map(dim => (
                      <td key={dim.id} className="px-2 py-4 whitespace-nowrap text-sm text-nasa-gray-300 text-center font-mono">
                        {score.rawScores[dim.id]}
                      </td>
                    ))}
                    <td className="px-2 py-4 whitespace-nowrap">
                      <PairwiseWeightsDisplay weights={score.weights} isWeighted={score.isWeighted} compact={true} />
                    </td>
                  </tr>
                  {score.comments && (
                    <tr className="bg-nasa-gray-800">
                      <td colSpan={10} className="px-4 py-3 text-sm text-nasa-gray-300">
                        <div className="pl-4 flex items-start gap-x-3">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-nasa-gray-400 mt-0.5 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                          </svg>
                          <p className="whitespace-pre-wrap flex-1">{score.comments}</p>
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))}
              {relevantScores.length === 0 && (
                <tr>
                  <td colSpan={10} className="text-center py-10 text-nasa-gray-500">
                    {t('stats.no_individual_scores')}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        {relevantScores.length > 0 && (
          <div className="mt-4 pt-4 border-t border-nasa-gray-700">
            <ScoreDistributionChart scores={overallScores} />
          </div>
        )}
      </div>
    </Modal>
  );
};

export default MteDetailModal;