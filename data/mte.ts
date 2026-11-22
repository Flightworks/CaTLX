import type { MTE, MteCriterion, Passage, Rating } from '../types';

export function validMteParent(mte: MTE, parent?: MTE): boolean {
  switch (mte.level) {
    case undefined:
    case 'phase':
      return mte.parentId === undefined;
    case 'general':
    case 'detail':
      return !!parent && parent.id === mte.parentId && parent.id !== mte.id &&
        parent.level === (mte.level === 'general' ? 'phase' : 'general');
    default:
      return false;
  }
}

export function mteReferenceKey(reference: string) {
  return reference.trim().toUpperCase();
}

export function indexMtePaths(mtes: readonly MTE[]): Map<string, MTE[]> {
  const byId = new Map(mtes.map(mte => [mte.id, mte]));
  const byReference = new Map<string, MTE | undefined>();
  for (const mte of mtes) {
    const key = mteReferenceKey(mte.refNumber);
    if (key) byReference.set(key, byReference.has(key) ? undefined : mte);
  }

  const paths = new Map<string, MTE[]>();
  function pathFor(mte: MTE): MTE[] {
    const cached = paths.get(mte.id);
    if (cached) return cached;
    const reference = mteReferenceKey(mte.refNumber);
    let parent: MTE | undefined;
    if (reference) {
      let end = reference.lastIndexOf('.');
      while (end > 0 && !parent) {
        parent = byReference.get(reference.slice(0, end));
        end = reference.lastIndexOf('.', end - 1);
      }
    } else if (mte.parentId) {
      // Keep older unnumbered tasks in their existing branch until they receive a reference.
      const legacyParent = byId.get(mte.parentId);
      if (validMteParent(mte, legacyParent)) parent = legacyParent;
    }
    const path = parent ? [...pathFor(parent), mte] : [mte];
    paths.set(mte.id, path);
    return path;
  }

  for (const mte of mtes) pathFor(mte);
  return paths;
}

export function nextSubMteReference(parent: MTE, mtes: readonly MTE[]) {
  const prefix = parent.refNumber.trim();
  const key = mteReferenceKey(prefix);
  const used = new Set(mtes.map(mte => mteReferenceKey(mte.refNumber)));
  const siblingRefs = new Set([...used].filter(reference => reference.startsWith(`${key}.`))
    .map(reference => reference.slice(key.length + 1).split('.')[0]));
  let suffix = 1;
  while (siblingRefs.has(String(suffix))) suffix++;
  return `${prefix}.${suffix}`;
}

export class MteReferenceError extends Error {
  constructor(readonly reason: 'duplicate' | 'required') {
    super(reason);
  }
}

export function mteBranchReferences(paths: ReadonlyMap<string, MTE[]>, root: MTE, reference: string) {
  const previous = root.refNumber.trim();
  const prefix = `${mteReferenceKey(previous)}.`;
  const updates = new Map([[root.id, reference]]);
  if (!previous || previous === reference) return updates;
  const segments = previous.split('.').length;
  for (const path of paths.values()) {
    const task = path[path.length - 1];
    const descendant = task.refNumber.trim();
    if (mteReferenceKey(descendant).startsWith(prefix) && path.slice(0, -1).some(entry => entry.id === root.id)) {
      if (!reference) throw new MteReferenceError('required');
      updates.set(task.id, `${reference}.${descendant.split('.').slice(segments).join('.')}`);
    }
  }
  return updates;
}

export function passageCriteria(passage: Passage | undefined, mteId: string): MteCriterion[] | undefined {
  const snapshot = passage?.mteCriteria;
  return snapshot && Object.hasOwn(snapshot, mteId) ? snapshot[mteId] : undefined;
}

export function sameMteCriterion(a: MteCriterion, b: MteCriterion): boolean {
  return a.id === b.id && a.type === b.type && a.label === b.label &&
    a.instructions === b.instructions && a.maxErrorRate === b.maxErrorRate;
}

export function criteriaForRating(mte: MTE, passage?: Passage, existing?: Rating): MteCriterion[] {
  const snapshot = passageCriteria(passage, mte.id);
  if (snapshot) return snapshot;
  const byId = new Map(mte.criteria?.map(criterion => [criterion.id, criterion]));
  for (const { criterion } of existing?.observations ?? []) {
    byId.set(criterion.id, criterion);
  }
  return [...byId.values()];
}
