import type { IDataSource, Rating, WorkspaceData } from '../types';

export const emptyWorkspace: WorkspaceData = {
  projects: [],
  evaluators: [],
  studies: [],
  mtes: [],
  ratings: [],
  pairwiseComparisons: [],
  scenarios: [],
};

export type WorkspaceChange = (data: WorkspaceData) => WorkspaceData;
type CommitWorkspace = (change: WorkspaceChange, awaitSave?: boolean) => Promise<void> | void;

function newId(): string {
  if (typeof crypto.randomUUID === 'function') return crypto.randomUUID();
  // Browsers still provide getRandomValues when local mode runs over HTTP.
  return Array.from(crypto.getRandomValues(new Uint8Array(16)), byte => byte.toString(16).padStart(2, '0')).join('');
}

function updateItem<T extends { id: string }>(items: T[], item: T): T[] {
  return items.map(existing => existing.id === item.id ? item : existing);
}

function removeItem<T extends { id: string }>(items: T[], id: string): T[] {
  return items.filter(item => item.id !== id);
}

function includeId(ids: string[], id: string): string[] {
  return ids.includes(id) ? ids : [...ids, id];
}

export function ratingContext(rating: Pick<Rating, 'studyId' | 'scenarioId' | 'evaluatorId' | 'mteId'>): string {
  return [rating.studyId, rating.scenarioId ?? '', rating.evaluatorId, rating.mteId]
    .map(encodeURIComponent).join('/');
}

export function latestRating(ratings: Rating[], context: Parameters<typeof ratingContext>[0]) {
  const key = ratingContext(context);
  return ratings.reduce<Rating | undefined>((latest, candidate) =>
    ratingContext(candidate) === key && (!latest || candidate.timestamp >= latest.timestamp)
      ? candidate : latest, undefined);
}

export function createDataSource(data: WorkspaceData, commit: CommitWorkspace): IDataSource {
  return {
    ...data,
    scenarios: data.scenarios ?? [],
    addProject(project, ownerId) {
      const newProject = { ...project, id: newId(), ownerId, memberIds: [ownerId] };
      commit(current => ({ ...current, projects: [...current.projects, newProject] }));
    },
    updateProject(project) {
      commit(current => ({ ...current, projects: updateItem(current.projects, project) }));
    },
    deleteProject(id) {
      commit(current => ({
        ...current,
        projects: removeItem(current.projects, id),
        studies: current.studies.filter(study => study.projectId !== id),
        scenarios: (current.scenarios ?? []).filter(scenario => current.studies.some(study => study.id === scenario.studyId && study.projectId !== id)),
      }));
    },
    addMemberToProject(projectId, evaluatorId) {
      commit(current => ({
        ...current,
        projects: current.projects.map(project => project.id === projectId
          ? { ...project, memberIds: includeId(project.memberIds, evaluatorId) }
          : project),
      }));
    },
    removeMemberFromProject(projectId, evaluatorId) {
      commit(current => ({
        ...current,
        projects: current.projects.map(project => project.id === projectId
          ? { ...project, memberIds: project.memberIds.filter(id => id !== evaluatorId) }
          : project),
      }));
    },
    addEvaluator(evaluator) {
      const newEvaluator = { ...evaluator, id: newId() };
      commit(current => ({ ...current, evaluators: [...current.evaluators, newEvaluator] }));
      return newEvaluator;
    },
    updateEvaluator(evaluator) {
      commit(current => ({ ...current, evaluators: updateItem(current.evaluators, evaluator) }));
    },
    deleteEvaluator(id) {
      commit(current => ({
        ...current,
        evaluators: removeItem(current.evaluators, id),
        projects: current.projects.map(project => ({
          ...project,
          memberIds: project.memberIds.filter(memberId => memberId !== id),
        })),
        studies: current.studies.map(study => ({
          ...study,
          evaluatorIds: study.evaluatorIds.filter(evaluatorId => evaluatorId !== id),
        })),
      }));
    },
    addStudy(study) {
      const newStudy = { ...study, id: newId(), mteIds: [], evaluatorIds: [] };
      commit(current => ({ ...current, studies: [...current.studies, newStudy] }));
    },
    updateStudy(study) {
      commit(current => ({ ...current, studies: updateItem(current.studies, study) }));
    },
    deleteStudy(id) {
      commit(current => ({ ...current, studies: removeItem(current.studies, id),
        scenarios: (current.scenarios ?? []).filter(scenario => scenario.studyId !== id) }));
    },
    addMte(mte) {
      const newMte = { ...mte, id: newId(), refNumber: mte.refNumber || '' };
      commit(current => ({ ...current, mtes: [...current.mtes, newMte] }));
      return newMte;
    },
    updateMte(mte) {
      commit(current => ({ ...current, mtes: updateItem(current.mtes, mte) }));
    },
    deleteMte(id) {
      commit(current => ({
        ...current,
        mtes: removeItem(current.mtes, id),
        scenarios: (current.scenarios ?? []).map(scenario => ({
          ...scenario, mteIds: scenario.mteIds.filter(mteId => mteId !== id),
        })),
        studies: current.studies.map(study => ({
          ...study,
          mteIds: study.mteIds.filter(mteId => mteId !== id),
        })),
      }));
    },
    addMTEToStudy(studyId, mteId) {
      commit(current => ({
        ...current,
        studies: current.studies.map(study => study.id === studyId
          ? { ...study, mteIds: includeId(study.mteIds, mteId) }
          : study),
      }));
    },
    removeMTEFromStudy(studyId, mteId) {
      commit(current => ({
        ...current,
        studies: current.studies.map(study => study.id === studyId
          ? { ...study, mteIds: study.mteIds.filter(id => id !== mteId) }
          : study),
      }));
    },
    addEvaluatorToStudy(studyId, evaluatorId) {
      commit(current => ({
        ...current,
        studies: current.studies.map(study => study.id === studyId
          ? { ...study, evaluatorIds: includeId(study.evaluatorIds, evaluatorId) }
          : study),
      }));
    },
    removeEvaluatorFromStudy(studyId, evaluatorId) {
      commit(current => ({
        ...current,
        studies: current.studies.map(study => study.id === studyId
          ? { ...study, evaluatorIds: study.evaluatorIds.filter(id => id !== evaluatorId) }
          : study),
      }));
    },
    async saveScenario(input) {
      const id = input.id ?? newId();
      await commit(current => {
        const scenarios = current.scenarios ?? [];
        const original = scenarios.find(scenario => scenario.id === id);
        if (!current.studies.some(study => study.id === input.studyId) ||
            (input.id && (!original || original.studyId !== input.studyId || original.archived)) ||
            input.mteIds.some(taskId => !current.mtes.some(task => task.id === taskId))) {
          throw new Error('The study or its catalog changed. Reopen the scenario to continue.');
        }
        const usedTasks = current.ratings.filter(rating => rating.scenarioId === id)
          .map(rating => rating.mteId);
        const scenario = {
          ...input, id, archived: original?.archived,
          mteIds: [...new Set([...input.mteIds, ...usedTasks])],
        };
        return { ...current, scenarios: original ? updateItem(scenarios, scenario) : [...scenarios, scenario] };
      }, true);
    },
    async archiveScenario(id, archived) {
      await commit(current => ({
        ...current,
        scenarios: (current.scenarios ?? []).map(scenario =>
          scenario.id === id ? { ...scenario, archived } : scenario),
      }), true);
    },
    async saveRating(input) {
      const timestamp = Date.now();
      await commit(current => {
        const study = current.studies.find(candidate => candidate.id === input.studyId);
        const scenario = current.scenarios?.find(candidate => candidate.id === input.scenarioId);
        if (!study || !study.evaluatorIds.includes(input.evaluatorId) ||
            !current.mtes.some(task => task.id === input.mteId) ||
            (input.scenarioId && (!scenario || scenario.studyId !== study.id || scenario.archived))) {
          throw new Error('The assessment context changed. Reopen the task to continue.');
        }
        const previous = latestRating(current.ratings, input);
        const rating = { ...input, id: previous?.id ?? `rating/${ratingContext(input)}`, timestamp };
        return {
          ...current,
          studies: scenario ? current.studies : updateItem(current.studies, {
            ...study, mteIds: includeId(study.mteIds, input.mteId),
          }),
          scenarios: scenario ? updateItem(current.scenarios ?? [], {
            ...scenario, mteIds: includeId(scenario.mteIds, input.mteId),
          }) : current.scenarios,
          ratings: previous ? updateItem(current.ratings, rating) : [...current.ratings, rating],
        };
      }, true);
    },
    async addRating(rating) {
      const newRating = { ...rating, id: newId(), timestamp: Date.now() };
      await commit(current => ({ ...current, ratings: [...current.ratings, newRating] }), true);
    },
    addPairwiseComparison(comparison) {
      const matches = (existing: WorkspaceData['pairwiseComparisons'][number]) =>
        existing.evaluatorId === comparison.evaluatorId && existing.studyId === comparison.studyId;
      commit(current => ({
        ...current,
        pairwiseComparisons: current.pairwiseComparisons.some(matches)
          ? current.pairwiseComparisons.map(existing => matches(existing) ? comparison : existing)
          : [...current.pairwiseComparisons, comparison],
      }));
    },
    hasPreviousRatingInStudy(evaluatorId, studyId) {
      return data.ratings.some(rating => rating.evaluatorId === evaluatorId && rating.studyId === studyId);
    },
  };
}
