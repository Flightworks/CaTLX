import type { WorkspaceData } from '../types';
import { indexMtePaths, mteBranchReferences, mteReferenceKey, passageCriteria, sameMteCriterion, validMteParent } from './mte';
import { ratingContext } from './workspace';

const collections = [
  'projects', 'studies', 'scenarios', 'mtes', 'evaluators', 'ratings', 'pairwiseComparisons', 'conditions', 'passages',
] as const;
type Collection = typeof collections[number];
type RecordValue = NonNullable<WorkspaceData[Collection]>[number];
type Entry = { collection: Collection; value: RecordValue };
type Entries = Map<string, Entry>;

export type WorkspaceConflict = {
  keys: string[];
  local: Entry[];
  remote: Entry[];
};

function comparisonKey(value: Pick<WorkspaceData['pairwiseComparisons'][number], 'studyId' | 'evaluatorId'>) {
  return JSON.stringify([value.studyId, value.evaluatorId]);
}

function indexWorkspace(workspace: WorkspaceData): Entries {
  const result: Entries = new Map();
  for (const collection of collections) {
    for (const value of workspace[collection] ?? []) {
      const id = 'id' in value ? value.id : comparisonKey(value);
      result.set(`${collection}:${id}`, { collection, value });
    }
  }
  return result;
}

function buildWorkspace(entries: Entries): WorkspaceData {
  const values = [...entries.values()];
  return Object.fromEntries(collections.map(collection => [
    collection, values.filter(entry => entry.collection === collection).map(entry => entry.value),
  ])) as unknown as WorkspaceData;
}

function canonical(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonical);
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).sort(([a], [b]) => a.localeCompare(b))
      .map(([key, child]) => [key, canonical(child)]));
  }
  return value;
}

function equal(a?: Entry, b?: Entry) {
  return a === b || JSON.stringify(canonical(a)) === JSON.stringify(canonical(b));
}

export function sameWorkspace(a: WorkspaceData, b: WorkspaceData) {
  const first = indexWorkspace(a);
  const second = indexWorkspace(b);
  return first.size === second.size && [...first].every(([key, value]) => equal(value, second.get(key)));
}

function replaceEntry(entries: Entries, key: string, value?: Entry) {
  if (value) entries.set(key, value);
  else entries.delete(key);
}

function invalidLinks(workspace: WorkspaceData) {
  const issues: [string, string][] = [];
  const studies = new Map(workspace.studies.map(study => [study.id, study]));
  const tasks = new Map(workspace.mtes.map(task => [task.id, task]));
  const evaluators = new Set(workspace.evaluators.map(evaluator => evaluator.id));
  const projects = new Set(workspace.projects.map(project => project.id));
  const scenarios = new Map((workspace.scenarios ?? []).map(scenario => [scenario.id, scenario]));
  const conditions = new Map((workspace.conditions ?? []).map(entry => [entry.id, entry]));
  const passages = new Map((workspace.passages ?? []).map(entry => [entry.id, entry]));
  const byContext = new Map<string, string>();
  const byReference = new Map<string, string>();

  for (const project of workspace.projects) {
    for (const id of project.memberIds) {
      if (id !== project.ownerId && !evaluators.has(id)) issues.push([`projects:${project.id}`, `evaluators:${id}`]);
    }
  }
  for (const task of tasks.values()) {
    const parent = task.parentId === undefined ? undefined : tasks.get(task.parentId);
    if (!validMteParent(task, parent)) issues.push([`mtes:${task.id}`, `mtes:${task.parentId ?? task.id}`]);
    const reference = mteReferenceKey(task.refNumber);
    if (reference) {
      const key = `mtes:${task.id}`;
      const first = byReference.get(reference);
      if (first) issues.push(first < key ? [first, key] : [key, first]);
      else byReference.set(reference, key);
    }
  }
  for (const study of workspace.studies) {
    const key = `studies:${study.id}`;
    if (!projects.has(study.projectId)) issues.push([key, `projects:${study.projectId}`]);
    for (const id of study.mteIds) if (!tasks.has(id)) issues.push([key, `mtes:${id}`]);
    for (const id of study.evaluatorIds) if (!evaluators.has(id)) issues.push([key, `evaluators:${id}`]);
  }
  for (const scenario of scenarios.values()) {
    const key = `scenarios:${scenario.id}`;
    if (!studies.has(scenario.studyId)) issues.push([key, `studies:${scenario.studyId}`]);
    for (const id of scenario.mteIds) {
      if (!tasks.has(id)) issues.push([key, `mtes:${id}`]);
      if (!studies.get(scenario.studyId)?.mteIds.includes(id)) issues.push([key, `studies:${scenario.studyId}`]);
    }
  }
  for (const condition of conditions.values()) {
    if (!studies.has(condition.studyId)) issues.push([`conditions:${condition.id}`, `studies:${condition.studyId}`]);
  }
  for (const pass of passages.values()) {
    const key = `passages:${pass.id}`;
    if (!studies.get(pass.studyId)?.evaluatorIds.includes(pass.evaluatorId)) issues.push([key, `studies:${pass.studyId}`]);
    if (!evaluators.has(pass.evaluatorId)) issues.push([key, `evaluators:${pass.evaluatorId}`]);
    if (scenarios.get(pass.scenarioId)?.studyId !== pass.studyId) issues.push([key, `scenarios:${pass.scenarioId}`]);
    if (conditions.get(pass.conditionId)?.studyId !== pass.studyId) issues.push([key, `conditions:${pass.conditionId}`]);
    for (const id of pass.mteIds) if (!tasks.has(id)) issues.push([key, `mtes:${id}`]);
  }
  for (const rating of workspace.ratings) {
    const key = `ratings:${rating.id}`;
    const study = studies.get(rating.studyId);
    if (!study?.evaluatorIds.includes(rating.evaluatorId)) issues.push([key, `studies:${rating.studyId}`]);
    if (!tasks.has(rating.mteId)) issues.push([key, `mtes:${rating.mteId}`]);
    if (!evaluators.has(rating.evaluatorId)) issues.push([key, `evaluators:${rating.evaluatorId}`]);
    if (rating.passageId) {
      const pass = passages.get(rating.passageId);
      const criteria = passageCriteria(pass, rating.mteId);
      if (!pass || pass.startedAt === undefined || pass.studyId !== rating.studyId || pass.scenarioId !== rating.scenarioId ||
          pass.evaluatorId !== rating.evaluatorId || !pass.mteIds.includes(rating.mteId) ||
          (criteria && rating.observations?.some(observation =>
            !criteria.some(criterion => sameMteCriterion(criterion, observation.criterion))))) {
        issues.push([key, `passages:${rating.passageId}`]);
      }
    } else if (rating.scenarioId) {
      const scenario = scenarios.get(rating.scenarioId);
      if (scenario?.studyId !== rating.studyId || !scenario.mteIds.includes(rating.mteId)) {
        issues.push([key, `scenarios:${rating.scenarioId}`]);
      }
    } else if (!study?.mteIds.includes(rating.mteId)) {
      issues.push([key, `studies:${rating.studyId}`]);
    }
    const context = ratingContext(rating);
    const first = byContext.get(context);
    if (first) issues.push([first, key].sort() as [string, string]);
    else byContext.set(context, key);
  }
  for (const comparison of workspace.pairwiseComparisons) {
    const key = `pairwiseComparisons:${comparisonKey(comparison)}`;
    if (!studies.has(comparison.studyId)) issues.push([key, `studies:${comparison.studyId}`]);
    if (!evaluators.has(comparison.evaluatorId)) issues.push([key, `evaluators:${comparison.evaluatorId}`]);
  }
  return issues;
}

function renumberedBranches(base: WorkspaceData['mtes'], next: WorkspaceData['mtes']) {
  // Resolve a renumbering together when a concurrent edit conflicts with one of its rows.
  const paths = indexMtePaths(base);
  const nextRefs = new Map(next.map(mte => [mte.id, mte.refNumber.trim()]));
  return base.flatMap(root => {
    const reference = nextRefs.get(root.id);
    if (!reference || !root.refNumber.trim() || reference === root.refNumber.trim()) return [];
    const changes = [...mteBranchReferences(paths, root, reference)];
    return changes.length > 1 && changes.every(([id, ref]) => nextRefs.get(id) === ref)
      ? [changes.map(([id]) => `mtes:${id}`)] : [];
  });
}

export function mergeWorkspace(base: WorkspaceData, local: WorkspaceData, remote: WorkspaceData) {
  const original = indexWorkspace(base);
  const ours = indexWorkspace(local);
  const theirs = indexWorkspace(remote);
  const candidate = new Map(theirs);
  const branches = [...renumberedBranches(base.mtes, local.mtes), ...renumberedBranches(base.mtes, remote.mtes)];
  let groups: Set<string>[] = [];
  function groupKeys(keys: string[]) {
    const together = new Set(keys);
    const related = [...branches, ...groups.map(group => [...group])];
    let size = 0;
    while (size !== together.size) {
      size = together.size;
      for (const group of related) if (group.some(key => together.has(key))) group.forEach(key => together.add(key));
    }
    groups = [...groups.filter(group => ![...group].some(key => together.has(key))), together];
  }

  for (const key of new Set([...original.keys(), ...ours.keys(), ...theirs.keys()])) {
    if (equal(ours.get(key), original.get(key)) || equal(ours.get(key), theirs.get(key))) continue;
    if (equal(theirs.get(key), original.get(key))) {
      replaceEntry(candidate, key, ours.get(key));
    } else {
      groupKeys([key]);
    }
  }

  const existingIssues = new Set(invalidLinks(remote).map(pair => JSON.stringify(pair)));
  // Reverting an inconsistent relationship to the server state can expose another
  // dependency. Each pass restores at least one entry, so this always terminates.
  for (;;) {
    const broken = invalidLinks(buildWorkspace(candidate))
      .filter(pair => !existingIssues.has(JSON.stringify(pair)));
    broken.forEach(pair => groupKeys(pair));
    const changed = [...new Set(groups.flatMap(group => [...group]))].filter(key => !equal(candidate.get(key), theirs.get(key)));
    if (!changed.length) break;
    for (const key of changed) replaceEntry(candidate, key, theirs.get(key));
  }

  return {
    payload: buildWorkspace(candidate),
    conflicts: groups.map(group => ({
      keys: [...group],
      local: [...group].flatMap(key => ours.get(key) ?? []),
      remote: [...group].flatMap(key => theirs.get(key) ?? []),
    })),
  };
}

export function resolveWorkspaceConflict(
  base: WorkspaceData, local: WorkspaceData, remote: WorkspaceData,
  conflict: WorkspaceConflict, side: 'local' | 'remote',
) {
  const original = indexWorkspace(base);
  const ours = indexWorkspace(local);
  const theirs = indexWorkspace(remote);
  for (const key of conflict.keys) {
    replaceEntry(original, key, theirs.get(key));
    if (side === 'remote') replaceEntry(ours, key, theirs.get(key));
  }
  const resolvedBase = buildWorkspace(original);
  const resolvedLocal = buildWorkspace(ours);
  const remaining = mergeWorkspace(resolvedBase, resolvedLocal, remote).conflicts;
  if (remaining.some(next => next.keys.every(key => conflict.keys.includes(key)))) {
    return null;
  }
  return { base: resolvedBase, local: resolvedLocal };
}
