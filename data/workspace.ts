import type { IDataSource, MTE, MteCriterion, MteObservation, Passage, Rating, WorkspaceData } from '../types';
import { criteriaForRating, indexMtePaths, mteBranchReferences, mteReferenceKey, MteReferenceError, sameMteCriterion, validMteParent } from './mte';

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

export function newId(): string {
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

function normalizeMte(task: MTE): MTE {
  if (task.criteria === undefined) return task;
  const criterionIds = new Set<string>();
  const criteria = task.criteria.map(({ id, label: untrimmedLabel, instructions, type, maxErrorRate }) => {
    const label = untrimmedLabel.trim();
    if (!id || !label || criterionIds.has(id) || (type !== 'score' && type !== 'errorRate') ||
        (maxErrorRate !== undefined && (type !== 'errorRate' || !Number.isFinite(maxErrorRate) ||
          maxErrorRate < 0 || maxErrorRate > 100))) {
      throw new Error('Invalid MTE criterion');
    }
    criterionIds.add(id);
    return { id, label, instructions: instructions.trim(), type, ...(maxErrorRate === undefined ? {} : { maxErrorRate }) };
  });
  return { ...task, criteria };
}

function writeMte(current: WorkspaceData, task: MTE, creating: boolean): WorkspaceData {
  const parent = current.mtes.find(mte => mte.id === task.parentId);
  if (!validMteParent(task, parent) ||
      current.mtes.some(mte => mte.parentId === task.id && !validMteParent(mte, task))) {
    throw new Error('Invalid MTE hierarchy');
  }
  const previous = current.mtes.find(mte => mte.id === task.id);
  if (previous?.refNumber.trim() === task.refNumber.trim()) {
    return { ...current, mtes: updateItem(current.mtes, task) };
  }
  const references = previous ? mteBranchReferences(indexMtePaths(current.mtes), previous, task.refNumber) :
    new Map([[task.id, task.refNumber]]);
  const used = new Set(current.mtes.filter(mte => !references.has(mte.id)).map(mte => mteReferenceKey(mte.refNumber)));
  for (const reference of references.values()) {
    const key = mteReferenceKey(reference);
    if (!key) continue;
    if (used.has(key)) throw new MteReferenceError('duplicate');
    used.add(key);
  }
  const mtes = creating ? [...current.mtes, task] : current.mtes.map(mte => {
    if (mte.id === task.id) return task;
    const reference = references.get(mte.id);
    return reference === undefined ? mte : { ...mte, refNumber: reference };
  });
  return { ...current, mtes };
}

function validateObservations(
  observations: MteObservation[] | undefined, task: MTE, passage?: Passage, existing?: Rating,
): MteObservation[] | undefined {
  if (observations === undefined) return existing?.observations;
  const definitions = new Map(criteriaForRating(task, passage, existing).map(criterion => [criterion.id, criterion]));
  return observations.map(({ criterion: submitted, score, errors, opportunities }) => {
    const criterion = definitions.get(submitted.id);
    if (!criterion || !sameMteCriterion(criterion, submitted)) {
      throw new Error('The MTE criteria changed. Reopen the task to continue.');
    }
    definitions.delete(criterion.id);
    if (criterion.type === 'score' && score !== undefined && Number.isInteger(score) && score >= 1 && score <= 5 &&
        errors === undefined && opportunities === undefined) {
      return { criterion, score };
    }
    if (criterion.type === 'errorRate' && errors !== undefined && opportunities !== undefined &&
        Number.isSafeInteger(errors) && Number.isSafeInteger(opportunities) &&
        errors >= 0 && opportunities >= errors && score === undefined) {
      return { criterion, errors, opportunities };
    }
    throw new Error('Invalid MTE observation');
  });
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
      const newMte = normalizeMte({ ...mte, id: newId(), refNumber: mte.refNumber || '' });
      commit(current => writeMte(current, newMte, true));
      return newMte;
    },
    updateMte(mte) {
      commit(current => current.mtes.some(task => task.id === mte.id) ?
        writeMte(current, normalizeMte(mte), false) : current);
    },
    async saveMte(input) {
      const { id, ...fields } = input;
      const mte = normalizeMte({ ...fields, id: id ?? newId(), name: fields.name.trim(), refNumber: fields.refNumber.trim() });
      await commit(current => {
        if (!mte.name || (id !== undefined && !current.mtes.some(task => task.id === id))) {
          throw new Error('The MTE name is missing or the MTE no longer exists.');
        }
        return writeMte(current, mte, id === undefined);
      }, true);
      return mte.id;
    },
    deleteMte(id) {
      commit(current => current.mtes.some(task => task.parentId === id) ||
        [...indexMtePaths(current.mtes).values()].some(path => path.at(-2)?.id === id) ||
        current.passages?.some(pass => pass.mteIds.includes(id)) ? current : ({
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
        const mteCriteria = repeat?.mteCriteria;
        return { ...current, passages: [...passes, { ...input, id, order, mteIds, ...(mteCriteria ? { mteCriteria } : {}) }] };
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
        const tasks = new Map(current.mtes.map(mte => [mte.id, mte]));
        if (!mteIds.length || mteIds.some(mteId => !tasks.has(mteId))) {
          throw new Error('Passage has no available tasks');
        }
        const mteCriteria: Record<string, MteCriterion[]> = pass.mteCriteria ??
          Object.fromEntries(mteIds.map(mteId => [mteId, tasks.get(mteId)?.criteria?.map(criterion => ({ ...criterion })) ?? []]));
        return { ...current, passages: updateItem(passes, { ...pass, mteIds, mteCriteria, startedAt: Date.now() }) };
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
        const task = current.mtes.find(candidate => candidate.id === input.mteId);
        const pass = input.passageId ? current.passages?.find(entry => entry.id === input.passageId) : undefined;
        if (input.passageId) {
          if (!task || !pass || pass.startedAt === undefined || pass.studyId !== input.studyId ||
              pass.scenarioId !== input.scenarioId || pass.evaluatorId !== input.evaluatorId ||
              !pass.mteIds.includes(input.mteId)) throw new Error('Invalid passage rating');
          const existing = current.ratings.filter(rating => rating.passageId === pass.id);
          const previous = existing.find(rating => rating.mteId === input.mteId);
          if (!previous && pass.mteIds.find(id => !existing.some(rating => rating.mteId === id)) !== input.mteId) {
            throw new Error('Rate the next task in the passage');
          }
          const observations = validateObservations(input.observations, task, pass, previous);
          const rating = { ...input, observations, id: previous?.id ?? `rating/${ratingContext(input)}`, timestamp };
          const ratings = previous ? updateItem(current.ratings, rating) : [...current.ratings, rating];
          const finished = !previous && existing.length + 1 === pass.mteIds.length;
          return { ...current, ratings, passages: finished
            ? updateItem(current.passages ?? [], { ...pass, completedAt: timestamp })
            : current.passages };
        }
        if (!study || !study.evaluatorIds.includes(input.evaluatorId) ||
            !task ||
            (input.scenarioId && (!scenario || scenario.studyId !== study.id || scenario.archived ||
              !scenario.mteIds.includes(input.mteId)))) {
          throw new Error('The assessment context changed. Reopen the task to continue.');
        }
        const previous = latestRating(current.ratings, input);
        const observations = validateObservations(input.observations, task, undefined, previous);
        const rating = { ...input, observations, id: previous?.id ?? `rating/${ratingContext(input)}`, timestamp };
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
      await commit(current => {
        if (newRating.observations === undefined) return { ...current, ratings: [...current.ratings, newRating] };
        const task = current.mtes.find(candidate => candidate.id === rating.mteId);
        if (!task) throw new Error('Unknown MTE');
        const passage = current.passages?.find(entry => entry.id === rating.passageId);
        const observations = validateObservations(newRating.observations, task, passage);
        return { ...current, ratings: [...current.ratings, { ...newRating, observations }] };
      }, true);
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
