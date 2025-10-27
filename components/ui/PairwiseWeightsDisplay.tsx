import React from 'react';
import { TLXDimension } from '../../types';
import { TLX_DIMENSIONS_INFO } from '../../constants';

interface PairwiseWeightsDisplayProps {
  weights: Record<TLXDimension, number>;
  isWeighted: boolean;
  compact?: boolean;
}

const PairwiseWeightsDisplay: React.FC<PairwiseWeightsDisplayProps> = ({ weights, isWeighted, compact = false }) => {
  const maxValue = 5; // A dimension can be chosen a maximum of 5 times.
  const barColor = isWeighted ? 'bg-nasa-blue' : 'bg-nasa-gray-600';

  if (compact) {
    return (
      <div className="space-y-1 w-24" title={!isWeighted ? "Unweighted (equal weights)" : ""}>
        {TLX_DIMENSIONS_INFO.map(({ id, title }) => (
          <div key={id} className="flex items-center" title={`${title}: ${weights[id]}`}>
            <span className="w-4 text-xs text-nasa-gray-400 font-mono">{title.substring(0, 1)}</span>
            <div className="flex-1 bg-nasa-gray-700 rounded-full h-2 mx-1">
              <div
                className={`${barColor} h-2 rounded-full`}
                style={{ width: `${(weights[id] / maxValue) * 100}%` }}
              ></div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div>
      <ul className="space-y-2">
        {TLX_DIMENSIONS_INFO.map(({ id, title }) => (
          <li key={id} className="flex items-center text-sm">
            <span className="w-32 text-nasa-gray-300">{title}</span>
            <div className="flex-1 bg-nasa-gray-700 rounded-full h-4 mr-2">
              <div
                className={`${barColor} h-4 rounded-full`}
                style={{ width: `${(weights[id] / maxValue) * 100}%` }}
              ></div>
            </div>
            <span className="font-semibold text-white w-4 text-right">{weights[id]}</span>
          </li>
        ))}
      </ul>
      {!isWeighted && (
        <p className="mt-3 text-sm text-nasa-gray-400">Pairwise comparison was skipped. Ratings will be unweighted, using equal importance for all dimensions.</p>
      )}
    </div>
  );
};

export default PairwiseWeightsDisplay;
