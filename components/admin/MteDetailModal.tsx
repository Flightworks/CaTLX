
import React from 'react';
import { AggregatedMteStats } from '../../pages/admin/ViewStats';
import { ComputedTLXScore } from '../../types';
import { TLX_DIMENSIONS_INFO } from '../../constants';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import PairwiseWeightsDisplay from '../ui/PairwiseWeightsDisplay';

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
  
  const relevantScores = scores.filter(score => score.mteId === mteStats.mteId);

  return (
    <Modal
      isOpen={true}
      onClose={onClose}
      title={`Detailed Scores for [${mteStats.mteRefNumber}] ${mteStats.mteName}`}
      size="5xl"
      footer={
        <Button variant="secondary" onClick={onClose}>Close</Button>
      }
    >
        <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-nasa-gray-700">
                <thead className="bg-nasa-gray-800">
                    <tr>
                        <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-nasa-gray-300 uppercase tracking-wider">Evaluator</th>
                        <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-nasa-gray-300 uppercase tracking-wider">Study</th>
                        <th scope="col" className="px-2 py-3 text-center text-xs font-medium text-nasa-gray-300 uppercase tracking-wider">Score</th>
                        <DimensionHeader title="MD" fullTitle="Mental Demand" />
                        <DimensionHeader title="PD" fullTitle="Physical Demand" />
                        <DimensionHeader title="TD" fullTitle="Temporal Demand" />
                        <DimensionHeader title="P" fullTitle="Performance" />
                        <DimensionHeader title="E" fullTitle="Effort" />
                        <DimensionHeader title="F" fullTitle="Frustration" />
                        <th scope="col" className="px-2 py-3 text-center text-xs font-medium text-nasa-gray-300 uppercase tracking-wider">Weights</th>
                    </tr>
                </thead>
                <tbody className="bg-nasa-gray-900 divide-y divide-nasa-gray-700">
                    {relevantScores.map((score, index) => (
                        <tr key={index}>
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
                    ))}
                     {relevantScores.length === 0 && (
                        <tr>
                            <td colSpan={10} className="text-center py-10 text-nasa-gray-500">
                                No individual scores to display for this MTE.
                            </td>
                        </tr>
                    )}
                </tbody>
            </table>
        </div>
    </Modal>
  );
};

export default MteDetailModal;
