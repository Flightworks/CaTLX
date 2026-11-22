import type { IDataSource, Passage, Rating, WorkspaceData } from '../types';

export const emptyWorkspace: WorkspaceData = {
  projects: [],
  evaluators: [],
  studies: [],
  mtes: [],
  ratings: [],
  pairwiseComparisons: [],
  scenarios: [],
  conditions: [],
  passages: [],
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

export function ratingContext(rating: Pick<Rating, 'studyId' | 'scenarioId' | 'evaluatorId' | 'mteId' | 'passageId'>): string {
  if (rating.passageId) return ['passage', rating.passageId, rating.mteId].map(encodeURIComponent).join('/');
  return [rating.studyId, rating.scenarioId ?? '', rating.evaluatorId, rating.mteId]
    .map(encodeURIComponent).join('/');
}

export function latestRating(ratings: Rating[], context: Parameters<typeof ratingContext>[0]) {
  const key = ratingContext(context);
  return ratings.reduce<Rating | undefined>((latest, candidate) =>
    ratingContext(candidate) === key && (!latest || candidate.timestamp >= latest.timestamp)
      ? candidate : latest, undefined);
}

export function orderedPassages(passages: Passage[], studyId: string) {
  return passages.filter(entry => entry.studyId === studyId)
    .sort((a, b) => a.order - b.order || a.id.localeCompare(b.id));
}

export function createDataSource(data: WorkspaceData, commit: CommitWorkspace): IDataSource {
  return {
    ...data,
    scenarios: data.scenarios ?? [],
    conditions: data.conditions ?? [],
    passages: data.passages ?? [],
    addProject(project, ownerId) {
      const newProject = { ...project, id: newId(), ownerId, memberIds: [ownerId] };
      commit(current => ({ ...current, projects: [...current.projects, newProject] }));
    },
    updateProject(project) {
      commit(current => ({ ...current, projects: updateItem(current.projects, project) }));
    },
    deleteProject(id) {
      commit(current => current.passages?.some(pass => current.studies.some(study => study.id === pass.studyId && study.projectId === id)) ? current : ({
        ...current,
        conditions: (current.conditions ?? []).filter(condition => current.studies.some(study => study.id === condition.studyId && study.projectId !== id)),
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
      commit(current => current.passages?.some(pass => pass.evaluatorId === id) ? current : ({
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
      commit(current => current.passages?.some(pass => pass.studyId === id) ? current : ({ ...current,
        conditions: (current.conditions ?? []).filter(condition => condition.studyId !== id), studies: removeItem(current.studies, id),
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
      commit(current => current.passages?.some(pass => pass.mteIds.includes(id)) ? current : ({
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
      commit(current => current.passages?.some(pass => pass.studyId === studyId && pass.evaluatorId === evaluatorId) ? current : ({
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
        const study = current.studies.find(study => study.id === input.studyId);
        if (!study ||
            (input.id && (!original || original.studyId !== input.studyId || original.archived)) ||
            input.mteIds.some(taskId => (!study.mteIds.includes(taskId) && !original?.mteIds.includes(taskId)) ||
              !current.mtes.some(task => task.id === taskId))) {
          throw new Error('The study or its catalog changed. Reopen the scenario to continue.');
        }
        const usedTasks = current.ratings.filter(rating => !rating.passageId && rating.scenarioId === id)
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
    async addCondition(input) {
      const id = newId();
      await commit(current => {
        const name = input.name.trim();
        const version = input.version.trim();
        const conditions = current.conditions ?? [];
        if (!name || !current.studies.some(study => study.id === input.studyId) ||
            conditions.some(entry => entry.studyId === input.studyId && entry.name === name && entry.version === version)) {
          throw new Error('Invalid or duplicate condition');
        }
        return { ...current, conditions: [...conditions, { ...input, id, name, version }] };
      }, true);
    },
    async addPassage(input, repeatId) {
      const id = newId();
      await commit(current => {
        const study = current.studies.find(entry => entry.id === input.studyId);
        const scenario = current.scenarios?.find(entry => entry.id === input.scenarioId && entry.studyId === input.studyId);
        const passes = current.passages ?? [];
        const repeat = passes.find(entry => entry.id === repeatId && entry.studyId === input.studyId &&
          entry.scenarioId === input.scenarioId && entry.evaluatorId === input.evaluatorId && entry.completedAt !== undefined);
        if (!study?.evaluatorIds.includes(input.evaluatorId) || !scenario ||
            (repeatId ? !repeat : scenario.archived || !scenario.mteIds.length) ||
            !current.conditions?.some(entry => entry.id === input.conditionId && entry.studyId === input.studyId)) {
          throw new Error('Invalid passage context');
        }
        const order = Math.max(0, ...passes.filter(entry => entry.studyId === study.id).map(entry => entry.order)) + 1;
        // An ordinary passage snapshots its scenario when started. A repetition preserves the original protocol.
        const mteIds = repeat ? [...repeat.mteIds] : [];
        return { ...current, passages: [...passes, { ...input, id, order, mteIds }] };
      }, true);
    },
    async startPassage(id) {
      await commit(current => {
        const passes = current.passages ?? [];
        const pass = passes.find(entry => entry.id === id);
        if (!pass) throw new Error('Unknown passage');
        if (pass.startedAt !== undefined) return current;
        const scenario = current.scenarios?.find(entry => entry.id === pass.scenarioId && entry.studyId === pass.studyId);
        const ids = pass.mteIds.length ? pass.mteIds : scenario?.archived ? [] : scenario?.mteIds ?? [];
        const mteIds = [...new Set(ids)];
        if (!mteIds.length || mteIds.some(mteId => !current.mtes.some(mte => mte.id === mteId))) {
          throw new Error('Passage has no available tasks');
        }
        return { ...current, passages: updateItem(passes, { ...pass, mteIds, startedAt: Date.now() }) };
      }, true);
    },
    async movePassage(id, offset) {
      await commit(current => {
        const passes = current.passages ?? [];
        const pass = passes.find(entry => entry.id === id);
        if (!pass) return current;
        const ordered = orderedPassages(passes, pass.studyId);
        const index = ordered.findIndex(entry => entry.id === id);
        const neighbor = ordered[index + offset];
        if (!neighbor) return current;
        ordered[index] = neighbor;
        ordered[index + offset] = pass;
        const positions = new Map(ordered.map((entry, i) => [entry.id, i + 1]));
        return { ...current, passages: passes.map(entry => ({ ...entry, order: positions.get(entry.id) ?? entry.order })) };
      }, true);
    },
    async deletePassage(id) {
      await commit(current => {
        const passes = current.passages ?? [];
        if (passes.find(entry => entry.id === id)?.startedAt !== undefined) throw new Error('Passage already started');
        return { ...current, passages: removeItem(passes, id) };
      }, true);
    },
    async saveRating(input) {
      const timestamp = Date.now();
      await commit(current => {
        const study = current.studies.find(candidate => candidate.id === input.studyId);
        const scenario = current.scenarios?.find(candidate => candidate.id === input.scenarioId);
        const pass = input.passageId ? current.passages?.find(entry => entry.id === input.passageId) : undefined;
        if (input.passageId) {
          if (!pass || pass.startedAt === undefined || pass.studyId !== input.studyId ||
              pass.scenarioId !== input.scenarioId || pass.evaluatorId !== input.evaluatorId ||
              !pass.mteIds.includes(input.mteId)) throw new Error('Invalid passage rating');
          const existing = current.ratings.filter(rating => rating.passageId === pass.id);
          const previous = existing.find(rating => rating.mteId === input.mteId);
          if (!previous && pass.mteIds.find(id => !existing.some(rating => rating.mteId === id)) !== input.mteId) {
            throw new Error('Rate the next task in the passage');
          }
          const rating = { ...input, id: previous?.id ?? `rating/${ratingContext(input)}`, timestamp };
          const ratings = previous ? updateItem(current.ratings, rating) : [...current.ratings, rating];
          const finished = !previous && existing.length + 1 === pass.mteIds.length;
          return { ...current, ratings, passages: finished
            ? updateItem(current.passages ?? [], { ...pass, completedAt: timestamp })
            : current.passages };
        }
        if (!study || !study.evaluatorIds.includes(input.evaluatorId) ||
            !current.mtes.some(task => task.id === input.mteId) ||
            (input.scenarioId && (!scenario || scenario.studyId !== study.id || scenario.archived ||
              !scenario.mteIds.includes(input.mteId)))) {
          throw new Error('The assessment context changed. Reopen the task to continue.');
        }
        const previous = latestRating(current.ratings, input);
        const rating = { ...input, id: previous?.id ?? `rating/${ratingContext(input)}`, timestamp };
        return {
          ...current,
          studies: scenario ? current.studies : updateItem(current.studies, {
            ...study, mteIds: includeId(study.mteIds, input.mteId),
          }),
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
