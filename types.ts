export enum TLXDimension {
  MENTAL_DEMAND = 'Mental Demand',
  PHYSICAL_DEMAND = 'Physical Demand',
  TEMPORAL_DEMAND = 'Temporal Demand',
  PERFORMANCE = 'Performance',
  EFFORT = 'Effort',
  FRUSTRATION = 'Frustration',
}

export interface Evaluator {
  id: string;
  name: string;
  email: string;
}

export interface MTE {
  id: string;
  name: string;
  description: string;
  refNumber: string;
}

export interface Study {
  id: string;
  name: string;
  description: string;
  mtes: MTE[];
}

export interface PairwiseComparison {
  evaluatorId: string;
  studyId: string;
  weights: Record<TLXDimension, number>;
  isWeighted: boolean;
}

export interface Rating {
  id: string;
  evaluatorId: string;
  studyId: string;
  mteId: string;
  scores: Record<TLXDimension, number>;
  timestamp: number;
}

export interface ComputedTLXScore {
  evaluatorName: string;
  studyName: string;
  mteName: string;
  rawScores: Record<TLXDimension, number>;
  weights: Record<TLXDimension, number>;
  weightedScores: Record<TLXDimension, number>;
  totalWeightedScore: number;
  studyId: string;
  isWeighted: boolean;
}