import React from 'react';
import { useTranslation } from 'react-i18next';
import { AggregatedMteStats } from '../../pages/admin/ViewStats';
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

const MteComparisonChart: React.FC<{ data: AggregatedMteStats[] }> = ({ data }) => {
  const { t } = useTranslation();
  const sortedData = [...data]
    .filter(d => d.numberOfEvals > 0)
    .sort((a, b) => b.avgOverallScore - a.avgOverallScore);

  if (sortedData.length === 0) {
    return null;
  }

  return (
    <Card title={t('stats.comparison_title')}>
      <div className="space-y-4">
        {sortedData.map(mte => (
          <div key={mte.mteId} className="grid grid-cols-12 gap-x-2 sm:gap-x-4 items-center text-sm">
            <div className="col-span-12 sm:col-span-4 truncate text-white" title={`[${mte.mteRefNumber}] ${mte.mteName}`}>
              <span className="font-mono text-xs text-nasa-gray-400 mr-2">[{mte.mteRefNumber}]</span>
              {mte.mteName}
            </div>
            <div className="col-span-10 sm:col-span-7">
              <div className="w-full bg-nasa-gray-700 rounded-full h-5 relative" title={`Average Score: ${mte.avgOverallScore.toFixed(1)}`}>
                <div
                  className="h-5 rounded-full"
                  style={{
                    width: `${mte.avgOverallScore}%`,
                    backgroundColor: getScoreColor(mte.avgOverallScore),
                  }}
                >
                </div>
                <span className="absolute inset-0 flex items-center justify-center text-white text-xs font-bold drop-shadow-[0_1px_1px_rgba(0,0,0,0.7)] pointer-events-none">
                  {mte.avgOverallScore.toFixed(1)}
                </span>
              </div>
            </div>
            <div className="col-span-2 sm:col-span-1 text-right text-nasa-gray-300 font-mono text-xs">
              (n={mte.numberOfEvals})
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
};

export default MteComparisonChart;
