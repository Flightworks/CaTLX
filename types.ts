export enum TLXDimension {
  MENTAL_DEMAND = 'Mental Demand',
  PHYSICAL_DEMAND = 'Physical Demand',
  TEMPORAL_DEMAND = 'Temporal Demand',
  PERFORMANCE = 'Performance',
  EFFORT = 'Effort',
  FRUSTRATION = 'Frustration',
}

export interface Project {
  id: string;
  name: string;
  description: string;
  ownerId: string;
  memberIds: string[];
}

export interface Evaluator {
  id: string;
  name: string;
  quality: string;
  company: string;
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
  date: number; // Timestamp of the study date
  mteIds: string[];
  evaluatorIds: string[];
  projectId: string;
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
  projects: Project[];
  evaluators: Evaluator[];
  studies: Study[];
  mtes: MTE[];
  ratings: Rating[];
  pairwiseComparisons: PairwiseComparison[];

  addProject: (project: Omit<Project, 'id' | 'ownerId' | 'memberIds'>, ownerId: string) => void | Promise<void>;
  updateProject: (project: Project) => void | Promise<void>;
  deleteProject: (id: string) => void | Promise<void>;
  addMemberToProject: (projectId: string, evaluatorId: string) => void | Promise<void>;
  removeMemberFromProject: (projectId: string, evaluatorId: string) => void | Promise<void>;

  addEvaluator: (evaluator: Omit<Evaluator, 'id'>) => Evaluator | Promise<Evaluator>;
  updateEvaluator: (evaluator: Evaluator) => void | Promise<void>;
  deleteEvaluator: (id: string) => void | Promise<void>;
  addStudy: (study: Omit<Study, 'id' | 'mteIds' | 'evaluatorIds'>) => void | Promise<void>;
  updateStudy: (study: Study) => void | Promise<void>;
  deleteStudy: (id: string) => void | Promise<void>;
  addMte: (mte: Omit<MTE, 'id' | 'refNumber'> & { refNumber?: string }) => MTE | Promise<MTE>;
  updateMte: (mte: MTE) => void | Promise<void>;
  deleteMte: (id: string) => void | Promise<void>;
  addMTEToStudy: (studyId: string, mteId: string) => void | Promise<void>;
  removeMTEFromStudy: (studyId: string, mteId: string) => void | Promise<void>;
  addEvaluatorToStudy: (studyId: string, evaluatorId: string) => void | Promise<void>;
  removeEvaluatorFromStudy: (studyId: string, evaluatorId: string) => void | Promise<void>;
  addRating: (rating: Omit<Rating, 'id' | 'timestamp'>) => Promise<void>;
  addPairwiseComparison: (comparison: PairwiseComparison) => void | Promise<void>;
  hasPreviousRatingInStudy: (evaluatorId: string, studyId: string) => boolean;
}