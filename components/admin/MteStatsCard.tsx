
import React from 'react';
import { TLXDimension } from '../../types';
import { TLX_DIMENSIONS_INFO } from '../../constants';
import { AggregatedMteStats } from '../../pages/admin/ViewStats';
import { useTranslation } from 'react-i18next';
import Card from '../ui/Card';

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

const DimensionBar: React.FC<{ dimension: typeof TLX_DIMENSIONS_INFO[0], score: number }> = ({ dimension, score }) => {
  const { t } = useTranslation();
  const title = t(`tlx_dimensions.${dimension.id.toLowerCase().replace(/ /g, '_')}.title`);
  return (
    <li className="flex items-center space-x-2 text-sm">
      <span className="w-28 text-nasa-gray-300 truncate" title={title}>{title}</span>
      <div className="flex-1 bg-nasa-gray-700 rounded-full h-4">
        <div
          className="h-4 rounded-full"
          style={{
            width: `${Math.min(score, 100)}%`,
            backgroundColor: getScoreColor(score)
          }}
        ></div>
      </div>
      <span className="w-10 text-right font-mono font-semibold text-white">{score.toFixed(1)}</span>
    </li>
  )
}

const MteStatsCard: React.FC<{ mteStats: AggregatedMteStats; onClick: () => void; }> = ({ mteStats, onClick }) => {
  const { t } = useTranslation();
  const {
    mteName,
    mteRefNumber,
    numberOfEvals,
    avgOverallScore,
    stdDevOverallScore,
    avgRawScores,
    studyNames
  } = mteStats;

  return (
    <Card
      onClick={onClick}
      className="bg-nasa-gray-900 flex flex-col h-full cursor-pointer hover:bg-nasa-gray-800 transition-colors duration-200"
    >
      <div className="flex justify-between items-start gap-4">
        <div>
          <h3 className="text-lg font-bold text-white leading-tight">
            <span className="font-mono text-base text-nasa-gray-400 mr-2">[{mteRefNumber}]</span>
            {mteName}
          </h3>
          <p className="text-xs text-nasa-gray-400 mt-1">{t('stats.included_in')} {studyNames.join(', ')}</p>
        </div>
        <div className="text-right flex-shrink-0">
          <p className="text-3xl font-bold text-white leading-none">{numberOfEvals}</p>
          <p className="text-xs text-nasa-gray-400 font-semibold tracking-wider">{t('stats.evals_label')}</p>
        </div>
      </div>

      {numberOfEvals > 0 ? (
        <div className="mt-4 pt-4 border-t border-nasa-gray-700 flex-grow grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="flex flex-col justify-center items-center text-center bg-nasa-gray-800 p-4 rounded-lg">
            <span className="text-5xl font-bold" style={{ color: getScoreColor(avgOverallScore) }}>
              {avgOverallScore.toFixed(1)}
            </span>
            <span className="text-sm font-semibold text-nasa-gray-300 mt-1">{t('stats.avg_workload')}</span>
            <span className="text-xs text-nasa-gray-400">(± {stdDevOverallScore.toFixed(1)} SD)</span>
          </div>
          <div className="md:col-span-2">
            <h4 className="text-sm font-semibold text-nasa-gray-300 mb-2">{t('stats.workload_drivers')}</h4>
            <ul className="space-y-1.5">
              {TLX_DIMENSIONS_INFO.map(dim => (
                <DimensionBar
                  key={dim.id}
                  dimension={dim}
                  score={avgRawScores[dim.id] || 0}
                />
              ))}
            </ul>
          </div>
        </div>
      ) : (
        <div className="flex-grow flex items-center justify-center text-center text-nasa-gray-500 py-10">
          <div>
            <svg className="mx-auto h-12 w-12 text-nasa-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
              <path vectorEffect="non-scaling-stroke" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 13h6m-3-3v6m-9 1V7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
            </svg>
            <h3 className="mt-2 text-sm font-medium">{t('stats.no_eval_data')}</h3>
            <p className="mt-1 text-sm text-nasa-gray-600">{t('stats.not_rated_yet')}</p>
          </div>
        </div>
      )}
    </Card>
  );
};

export default MteStatsCard;
