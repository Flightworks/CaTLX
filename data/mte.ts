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

export function mtePath(mte: MTE, mtes: readonly MTE[] | ReadonlyMap<string, MTE>): MTE[] {
  const byId: ReadonlyMap<string, MTE> = 'get' in mtes ? mtes : new Map(mtes.map(task => [task.id, task]));
  const path = [mte];
  let child = mte;
  while (child.parentId) {
    const parent = byId.get(child.parentId);
    if (!parent || !validMteParent(child, parent)) break;
    path.unshift(parent);
    child = parent;
  }
  return path;
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
