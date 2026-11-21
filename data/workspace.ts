import type { IDataSource, WorkspaceData } from '../types';

export const emptyWorkspace: WorkspaceData = {
  projects: [],
  evaluators: [],
  studies: [],
  mtes: [],
  ratings: [],
  pairwiseComparisons: [],
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

export function createDataSource(data: WorkspaceData, commit: CommitWorkspace): IDataSource {
  return {
    ...data,
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
      commit(current => ({ ...current, studies: removeItem(current.studies, id) }));
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
