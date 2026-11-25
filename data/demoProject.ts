import { DEFAULT_WEIGHTS } from '../constants';
import { TLXDimension, type Condition, type Evaluator, type MTE, type PairwiseComparison, type Passage, type Project, type Rating, type Scenario, type Study, type WorkspaceData } from '../types';

export const DEMO_PROJECT_ID = 'demo-project';

const evaluators: Evaluator[] = [
  { id: 'demo-lina', name: 'Lina Martin', quality: 'Pilote d’essai', company: 'Centre Horizon' },
  { id: 'demo-samir', name: 'Samir Diallo', quality: 'Instructeur', company: 'Centre Horizon' },
  { id: 'demo-nora', name: 'Nora Chen', quality: 'Ergonome', company: 'Laboratoire Méridien' },
  { id: 'demo-camille', name: 'Camille Roy', quality: 'Opératrice en formation', company: 'Centre Horizon' },
];

const project: Project = {
  id: DEMO_PROJECT_ID,
  name: 'Demo Project',
  description: 'Comparaison de deux interfaces de pilotage dans un simulateur de mission fictif.',
  ownerId: 'demo-lina',
  memberIds: evaluators.map(evaluator => evaluator.id),
};

const mtes: MTE[] = [
  { id: 'demo-check', name: 'Vérification avant départ', description: 'Vérifier les instruments et confirmer la configuration de départ.', refNumber: 'SIM-01' },
  { id: 'demo-docking', name: 'Amarrage manuel', description: 'Aligner le véhicule et stabiliser sa vitesse d’approche sur le simulateur.', refNumber: 'SIM-02' },
  { id: 'demo-alert', name: 'Diagnostic sous alarme', description: 'Identifier une panne simulée pendant que plusieurs alertes s’affichent.', refNumber: 'SIM-03' },
  { id: 'demo-controls', name: 'Reprise aux commandes de secours', description: 'Stabiliser le véhicule avec les commandes manuelles de secours.', refNumber: 'SIM-04' },
  { id: 'demo-guidance', name: 'Récupération avec le guidage', description: 'Stabiliser le véhicule en suivant les repères du nouvel assistant visuel.', refNumber: 'SIM-05' },
];

const studies: Study[] = [
  {
    id: 'demo-standard',
    name: 'Session A · Interface standard',
    description: 'Séquence de référence avec les instruments et commandes habituels.',
    date: Date.UTC(2025, 3, 8, 9),
    mteIds: ['demo-check', 'demo-docking', 'demo-alert', 'demo-controls'],
    evaluatorIds: project.memberIds,
    projectId: project.id,
  },
  {
    id: 'demo-guided',
    name: 'Session B · Interface avec guidage',
    description: 'Même séquence avec des repères d’alignement, des alertes priorisées et un guidage de récupération.',
    date: Date.UTC(2025, 3, 10, 9),
    mteIds: ['demo-check', 'demo-docking', 'demo-alert', 'demo-guidance'],
    evaluatorIds: project.memberIds,
    projectId: project.id,
  },
];

type DimensionValues = [mental: number, physical: number, temporal: number, performance: number, effort: number, frustration: number];

function dimensionScores([mental, physical, temporal, performance, effort, frustration]: DimensionValues) {
  return {
    [TLXDimension.MENTAL_DEMAND]: mental,
    [TLXDimension.PHYSICAL_DEMAND]: physical,
    [TLXDimension.TEMPORAL_DEMAND]: temporal,
    [TLXDimension.PERFORMANCE]: performance,
    [TLXDimension.EFFORT]: effort,
    [TLXDimension.FRUSTRATION]: frustration,
  };
}

type TaskRating = [scores: DimensionValues, comments?: string];

function rateSession(study: Study, evaluatorId: string, taskRatings: TaskRating[]): Rating[] {
  return taskRatings.map(([scores, comments], index) => ({
    id: `${study.id}-${evaluatorId}-${index}`,
    studyId: study.id,
    evaluatorId,
    mteId: study.mteIds[index],
    scores: dimensionScores(scores),
    timestamp: study.date + (index + 1) * 15 * 60_000,
    comments,
  }));
}

const [standard, guided] = studies;

const studyRatings = [
  ...rateSession(standard, 'demo-lina', [
    [[25, 10, 20, 10, 25, 10]],
    [[80, 45, 75, 30, 80, 55], 'Il fallait surveiller la vitesse et l’alignement sur deux écrans.'],
    [[90, 15, 95, 45, 85, 80], 'J’ai perdu du temps à repérer l’alarme principale.'],
    [[65, 80, 70, 35, 85, 55]],
  ]),
  ...rateSession(standard, 'demo-samir', [
    [[30, 15, 25, 10, 25, 15]],
    [[70, 55, 65, 25, 75, 45]],
    [[85, 20, 90, 40, 80, 65]],
    [[60, 90, 65, 40, 90, 60], 'Les corrections répétées au manche ont augmenté l’effort physique.'],
  ]),
  ...rateSession(standard, 'demo-nora', [
    [[35, 10, 30, 15, 30, 15]],
    [[85, 50, 80, 40, 85, 65]],
    [[95, 10, 95, 55, 90, 85]],
  ]),
  ...rateSession(guided, 'demo-lina', [
    [[25, 10, 20, 10, 20, 10]],
    [[50, 35, 45, 15, 50, 25], 'Le repère visuel permettait de corriger la trajectoire plus tôt.'],
    [[60, 15, 55, 20, 55, 35], 'La première alerte indiquait directement le système en cause.'],
    [[45, 35, 40, 15, 45, 25]],
  ]),
  ...rateSession(guided, 'demo-samir', [
    [[25, 15, 25, 10, 25, 10]],
    [[45, 40, 45, 15, 50, 30]],
    [[55, 20, 60, 25, 55, 35]],
    [[40, 45, 45, 20, 50, 25]],
  ]),
  ...rateSession(guided, 'demo-nora', [
    [[30, 10, 25, 10, 25, 10]],
    [[60, 40, 55, 25, 60, 35]],
  ]),
];

const linaWeights = dimensionScores([5, 0, 4, 1, 3, 2]);
const noraWeights = dimensionScores([4, 0, 5, 2, 3, 1]);
const pairwiseComparisons: PairwiseComparison[] = studies.flatMap(study => [
  { studyId: study.id, evaluatorId: 'demo-lina', weights: linaWeights, isWeighted: true },
  { studyId: study.id, evaluatorId: 'demo-samir', weights: DEFAULT_WEIGHTS, isWeighted: false },
  { studyId: study.id, evaluatorId: 'demo-nora', weights: noraWeights, isWeighted: true },
]);

const scenarios: Scenario[] = [
  { id: 'demo-approach', studyId: standard.id, name: 'Approche et diagnostic', mteIds: standard.mteIds.slice(0, 3) },
  { id: 'demo-recovery', studyId: guided.id, name: 'Diagnostic et récupération guidée', mteIds: guided.mteIds.slice(2) },
];

const conditions: Condition[] = [
  { id: 'demo-baseline', studyId: standard.id, name: 'Interface standard', version: '1.0' },
  { id: 'demo-assist', studyId: standard.id, name: 'Interface avec guidage', version: '2.0' },
];

const comparisonScenario = scenarios[0];
const passages = conditions.map((condition, index) => {
  const startedAt = standard.date + (index + 2) * 3_600_000;
  return {
    id: `demo-passage-${index + 1}`,
    studyId: standard.id,
    scenarioId: comparisonScenario.id,
    evaluatorId: 'demo-lina',
    conditionId: condition.id,
    order: index + 1,
    mteIds: comparisonScenario.mteIds,
    startedAt,
    completedAt: startedAt + 15 * 60_000,
  } satisfies Passage;
});

const passageRatings = passages.flatMap((passage, index) => studyRatings
  .filter(rating => rating.studyId === studies[index].id &&
    rating.evaluatorId === passage.evaluatorId && passage.mteIds.includes(rating.mteId))
  .map((rating, taskIndex) => ({
    ...rating,
    id: `${passage.id}-${rating.mteId}`,
    studyId: passage.studyId,
    scenarioId: passage.scenarioId,
    passageId: passage.id,
    timestamp: passage.startedAt + (taskIndex + 1) * 5 * 60_000,
  })));

// Camille has no saved ratings or weights so the full assessment can be tried from the start.
export const demoProjectData: WorkspaceData = {
  projects: [project], evaluators, studies, mtes, pairwiseComparisons, scenarios, conditions, passages,
  ratings: [...studyRatings, ...passageRatings],
};
