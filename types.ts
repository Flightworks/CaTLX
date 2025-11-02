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
  mteIds: string[];
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
  comments?: string;
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
  mteId: string;
  isWeighted: boolean;
  comments?: string;
}

export interface IDataSource {
  evaluators: Evaluator[];
  studies: Study[];
  mtes: MTE[];
  ratings: Rating[];
  pairwiseComparisons: PairwiseComparison[];
  addEvaluator: (evaluator: Omit<Evaluator, 'id'>) => void;
  updateEvaluator: (evaluator: Evaluator) => void;
  deleteEvaluator: (id: string) => void;
  addStudy: (study: Omit<Study, 'id' | 'mteIds'>) => void;
  updateStudy: (study: Study) => void;
  deleteStudy: (id: string) => void;
  addMte: (mte: Omit<MTE, 'id' | 'refNumber'> & { refNumber?: string }) => MTE;
  updateMte: (mte: MTE) => void;
  deleteMte: (id: string) => void;
  addMTEToStudy: (studyId: string, mteId: string) => void;
  removeMTEFromStudy: (studyId: string, mteId: string) => void;
  addRating: (rating: Omit<Rating, 'id' | 'timestamp'>) => void;
  addPairwiseComparison: (comparison: PairwiseComparison) => void;
  hasPreviousRatingInStudy: (evaluatorId: string, studyId: string) => boolean;
}