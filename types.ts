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

export type MteLevel = 'phase' | 'general' | 'detail';

export interface MteCriterion {
  id: string;
  label: string;
  instructions: string;
  type: 'score' | 'errorRate';
  maxErrorRate?: number;
}

export interface MTE {
  id: string;
  name: string;
  description: string;
  refNumber: string;
  level?: MteLevel;
  parentId?: string;
  criteria?: MteCriterion[];
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

export interface Scenario {
  id: string;
  studyId: string;
  name: string;
  mteIds: string[];
  archived?: boolean;
}

export interface PairwiseComparison {
  evaluatorId: string;
  studyId: string;
  weights: Record<TLXDimension, number>;
  isWeighted: boolean;
}

export interface Condition {
  id: string;
  studyId: string;
  name: string;
  version: string;
}

export interface Passage {
  id: string;
  studyId: string;
  scenarioId: string;
  evaluatorId: string;
  conditionId: string;
  order: number;
  mteIds: string[];
  mteCriteria?: Record<string, MteCriterion[]>;
  startedAt?: number;
  completedAt?: number;
}

export interface MteObservation {
  criterion: MteCriterion;
  score?: number;
  errors?: number;
  opportunities?: number;
}

export interface Rating {
  id: string;
  evaluatorId: string;
  studyId: string;
  mteId: string;
  scenarioId?: string;
  passageId?: string;
  scores: Record<TLXDimension, number>;
  timestamp: number;
  comments?: string;
  observations?: MteObservation[];
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
  observations?: MteObservation[];
}

export interface WorkspaceData {
  projects: Project[];
  evaluators: Evaluator[];
  studies: Study[];
  mtes: MTE[];
  ratings: Rating[];
  pairwiseComparisons: PairwiseComparison[];
  scenarios?: Scenario[];
  conditions?: Condition[];
  passages?: Passage[];
}

export interface IDataSource extends WorkspaceData {
  addProject: (project: Omit<Project, 'id' | 'ownerId' | 'memberIds'>, ownerId: string) => void;
  updateProject: (project: Project) => void;
  deleteProject: (id: string) => void;
  addMemberToProject: (projectId: string, evaluatorId: string) => void;
  removeMemberFromProject: (projectId: string, evaluatorId: string) => void;

  addEvaluator: (evaluator: Omit<Evaluator, 'id'>) => Evaluator;
  updateEvaluator: (evaluator: Evaluator) => void;
  deleteEvaluator: (id: string) => void;
  addStudy: (study: Omit<Study, 'id' | 'mteIds' | 'evaluatorIds'>) => void;
  updateStudy: (study: Study) => void;
  deleteStudy: (id: string) => void;
  addMte: (mte: Omit<MTE, 'id' | 'refNumber'> & { refNumber?: string }) => MTE;
  updateMte: (mte: MTE) => void;
  saveMte: (input: Omit<MTE, 'id'> & { id?: string }) => Promise<void>;
  deleteMte: (id: string) => void;
  addMTEToStudy: (studyId: string, mteId: string) => void;
  removeMTEFromStudy: (studyId: string, mteId: string) => void;
  addEvaluatorToStudy: (studyId: string, evaluatorId: string) => void;
  removeEvaluatorFromStudy: (studyId: string, evaluatorId: string) => void;
  saveScenario: (scenario: Omit<Scenario, 'id' | 'archived'> & { id?: string }) => Promise<void>;
  archiveScenario: (id: string, archived: boolean) => Promise<void>;
  addCondition: (input: Omit<Condition, 'id'>) => Promise<void>;
  addPassage: (input: Pick<Passage, 'studyId' | 'scenarioId' | 'evaluatorId' | 'conditionId'>, repeatId?: string) => Promise<void>;
  startPassage: (id: string) => Promise<void>;
  movePassage: (id: string, offset: -1 | 1) => Promise<void>;
  deletePassage: (id: string) => Promise<void>;
  saveRating: (rating: Omit<Rating, 'id' | 'timestamp'>) => Promise<void>;
  addRating: (rating: Omit<Rating, 'id' | 'timestamp'>) => Promise<void>;
  addPairwiseComparison: (comparison: PairwiseComparison) => void;
  hasPreviousRatingInStudy: (evaluatorId: string, studyId: string) => boolean;
}
