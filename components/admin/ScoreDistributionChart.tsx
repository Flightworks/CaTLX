import React from 'react';

const ScoreDistributionChart: React.FC<{ scores: number[] }> = ({ scores }) => {
  const bins = Array.from({ length: 10 }, (_, i) => i * 10); // [0, 10, ..., 90]
  const distribution = Array(10).fill(0);
  
  scores.forEach(score => {
    const scoreVal = Math.floor(score);
    if (scoreVal >= 100) {
        distribution[9]++;
    } else if (scoreVal >= 0) {
        const binIndex = Math.floor(scoreVal / 10);
        distribution[binIndex]++;
    }
  });

  const maxCount = distribution.length > 0 ? Math.max(...distribution, 1) : 1;
  if (scores.length === 0) return null;

  return (
    <div>
      <h4 className="text-md font-medium text-white mb-3">Overall Score Distribution</h4>
      <div className="flex items-end h-40 bg-nasa-gray-800 p-4 rounded-md space-x-1 border border-nasa-gray-700">
        {distribution.map((count, index) => (
          <div key={index} className="flex-1 flex flex-col items-center justify-end h-full group relative">
            <div className="absolute top-0 -mt-6 hidden group-hover:block bg-nasa-gray-900 text-white text-xs px-2 py-1 rounded-md shadow-lg z-10 pointer-events-none">
              {count} {count === 1 ? 'eval' : 'evals'}
            </div>
            <div
              className="w-full bg-nasa-blue hover:bg-nasa-light-blue transition-all duration-200 rounded-t-sm"
              style={{ height: `${(count / maxCount) * 100}%` }}
              title={`${count} evaluations in ${bins[index]}-${bins[index]+9} range`}
            ></div>
          </div>
        ))}
      </div>
      <div className="flex -mx-1">
          {bins.map((bin) => (
              <div key={bin} className="flex-1 px-1 mt-1">
                <span className="text-xs text-nasa-gray-400">{bin}</span>
              </div>
          ))}
      </div>
    </div>
  );
};

export default ScoreDistributionChart;
