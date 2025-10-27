
import { TLXDimension } from './types';

export const TLX_DIMENSIONS_INFO = [
  {
    id: TLXDimension.MENTAL_DEMAND,
    title: 'Mental Demand',
    description: 'How much mental and perceptual activity was required? Was the task easy or demanding, simple or complex?',
    lowAnchor: 'Very Low',
    highAnchor: 'Very High',
  },
  {
    id: TLXDimension.PHYSICAL_DEMAND,
    title: 'Physical Demand',
    description: 'How much physical activity was required? Was the task easy or demanding, slow or brisk?',
    lowAnchor: 'Very Low',
    highAnchor: 'Very High',
  },
  {
    id: TLXDimension.TEMPORAL_DEMAND,
    title: 'Temporal Demand',
    description: 'How much time pressure did you feel due to the rate or pace at which the tasks or task elements occurred?',
    lowAnchor: 'Very Low',
    highAnchor: 'Very High',
  },
  {
    id: TLXDimension.PERFORMANCE,
    title: 'Performance',
    description: 'How successful do you think you were in accomplishing the goals of the task or mission? How satisfied were you with your performance?',
    lowAnchor: 'Good',
    highAnchor: 'Poor',
  },
  {
    id: TLXDimension.EFFORT,
    title: 'Effort',
    description: 'How hard did you have to work (mentally and physically) to accomplish your level of performance?',
    lowAnchor: 'Very Low',
    highAnchor: 'Very High',
  },
  {
    id: TLXDimension.FRUSTRATION,
    title: 'Frustration',
    description: 'How insecure, discouraged, irritated, stressed and annoyed versus secure, gratified, content, relaxed and complacent did you feel during the task?',
    lowAnchor: 'Very Low',
    highAnchor: 'Very High',
  },
];

export const PAIRWISE_COMBINATIONS: [TLXDimension, TLXDimension][] = [
  [TLXDimension.MENTAL_DEMAND, TLXDimension.PHYSICAL_DEMAND],
  [TLXDimension.MENTAL_DEMAND, TLXDimension.TEMPORAL_DEMAND],
  [TLXDimension.MENTAL_DEMAND, TLXDimension.PERFORMANCE],
  [TLXDimension.MENTAL_DEMAND, TLXDimension.EFFORT],
  [TLXDimension.MENTAL_DEMAND, TLXDimension.FRUSTRATION],
  [TLXDimension.PHYSICAL_DEMAND, TLXDimension.TEMPORAL_DEMAND],
  [TLXDimension.PHYSICAL_DEMAND, TLXDimension.PERFORMANCE],
  [TLXDimension.PHYSICAL_DEMAND, TLXDimension.EFFORT],
  [TLXDimension.PHYSICAL_DEMAND, TLXDimension.FRUSTRATION],
  [TLXDimension.TEMPORAL_DEMAND, TLXDimension.PERFORMANCE],
  [TLXDimension.TEMPORAL_DEMAND, TLXDimension.EFFORT],
  [TLXDimension.TEMPORAL_DEMAND, TLXDimension.FRUSTRATION],
  [TLXDimension.PERFORMANCE, TLXDimension.EFFORT],
  [TLXDimension.PERFORMANCE, TLXDimension.FRUSTRATION],
  [TLXDimension.EFFORT, TLXDimension.FRUSTRATION],
];

export const DEFAULT_WEIGHTS: Record<TLXDimension, number> = {
  [TLXDimension.MENTAL_DEMAND]: 1,
  [TLXDimension.PHYSICAL_DEMAND]: 1,
  [TLXDimension.TEMPORAL_DEMAND]: 1,
  [TLXDimension.PERFORMANCE]: 1,
  [TLXDimension.EFFORT]: 1,
  [TLXDimension.FRUSTRATION]: 1,
};
