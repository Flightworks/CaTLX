import { expect, test } from 'vitest';
import { DEFAULT_WEIGHTS } from '../constants';
import type { MTE, MteCriterion, WorkspaceData } from '../types';
import { criteriaForRating, indexMtePaths, nextSubMteReference } from './mte';
import { createDataSource, emptyWorkspace } from './workspace';
import { mergeWorkspace } from './workspaceMerge';

const phase = { id: 'phase', level: 'phase', name: 'Phase', description: '', refNumber: '' } satisfies MTE;
const general = { id: 'general', level: 'general', parentId: phase.id, name: 'General', description: '', refNumber: '' } satisfies MTE;
const detail = { id: 'detail', level: 'detail', parentId: general.id, name: 'Detail', description: '', refNumber: '' } satisfies MTE;
const criterion = { id: 'errors', label: 'Omissions', instructions: 'Count missed checks', type: 'errorRate', maxErrorRate: 20 } satisfies MteCriterion;
const scoreCriterion = { id: 'score', label: 'Clarity', instructions: '', type: 'score' } satisfies MteCriterion;
const context = { studyId: 'study', evaluatorId: 'pilot', scenarioId: 'scenario' };

function fixture(mtes: MTE[]): WorkspaceData {
  return {
    ...emptyWorkspace,
    projects: [{ id: 'project', name: 'Project', description: '', ownerId: 'owner', memberIds: ['owner', 'pilot'] }],
    studies: [{ id: context.studyId, projectId: 'project', name: 'Study', description: '', date: 0, mteIds: [detail.id], evaluatorIds: [context.evaluatorId] }],
    evaluators: [{ id: context.evaluatorId, name: 'Pilot', company: '', quality: '' }],
    scenarios: [{ id: context.scenarioId, studyId: context.studyId, name: 'Scenario', mteIds: [detail.id] }],
    conditions: [{ id: 'condition', studyId: context.studyId, name: 'Reference', version: '' }],
    mtes,
  };
}

function editWorkspace(initial: WorkspaceData) {
  let workspace = initial;
  return {
    read: () => workspace,
    source: createDataSource(workspace, change => { workspace = change(workspace); }),
  };
}

test('validates all three levels and preserves existing standalone tasks', async () => {
  const standalone = { id: 'standalone', name: 'Existing task', description: '', refNumber: 'LEGACY' };
  const { read, source } = editWorkspace({ ...emptyWorkspace, mtes: [phase, general, detail, standalone] });
  const paths = indexMtePaths(read().mtes);
  expect(paths.get(detail.id)).toEqual([phase, general, detail]);
  expect(paths.get(standalone.id)).toEqual([standalone]);

  await expect(source.saveMte({ ...detail, parentId: phase.id })).rejects.toThrow('hierarchy');
  await expect(source.saveMte({ ...general, level: 'phase', parentId: undefined })).rejects.toThrow('hierarchy');
  await expect(source.saveMte({ ...detail, criteria: [{ ...criterion, maxErrorRate: 101 }] })).rejects.toThrow('criterion');
  source.deleteMte(phase.id);
  expect(read().mtes).toEqual([phase, general, detail, standalone]);

  await source.saveMte({ ...detail, id: undefined, name: 'Second detail' });
  expect(read().mtes.at(-1)).toMatchObject({ name: 'Second detail', parentId: general.id });
});

const referencedRoot: MTE = { id: 'root', name: 'Root', refNumber: 'M-10', description: '' };
const referencedChild: MTE = { id: detail.id, name: 'Check', refNumber: 'm-10.1', description: '', criteria: [criterion] };

test('derives the closest unique parent from references and suggests a free branch', () => {
  const nested = { ...referencedChild, id: 'nested', refNumber: 'M-10.1.1' };
  const gap = { ...referencedChild, id: 'gap', refNumber: 'M-10.2.1' };
  const unrelated = { ...referencedChild, id: 'unrelated', refNumber: 'M-100' };
  const mtes = [referencedChild, referencedRoot, nested, unrelated, gap];
  const paths = indexMtePaths(mtes);

  expect(paths.get(nested.id)).toEqual([referencedRoot, referencedChild, nested]);
  expect(paths.get(gap.id)).toEqual([referencedRoot, gap]);
  expect(paths.get(unrelated.id)).toEqual([unrelated]);
  expect(nextSubMteReference(referencedRoot, mtes)).toBe('M-10.3');
  expect(indexMtePaths([...mtes, { ...referencedRoot, id: 'duplicate' }]).get(referencedChild.id)).toEqual([referencedChild]);
});

test('renumbers a branch atomically while preserving the criterion and scenario link', async () => {
  const occupied = { ...referencedChild, id: 'occupied', refNumber: 'M-20.1' };
  const { read, source } = editWorkspace(fixture([referencedRoot, referencedChild, occupied]));
  await expect(source.saveMte({ ...referencedRoot, refNumber: 'M-20' })).rejects.toThrow('duplicate');
  expect(read().mtes).toEqual([referencedRoot, referencedChild, occupied]);
  await source.saveMte({ ...referencedRoot, refNumber: ' M-30 ' });
  expect(read().mtes.slice(0, 2)).toEqual([
    { ...referencedRoot, refNumber: 'M-30' }, { ...referencedChild, refNumber: 'M-30.1' },
  ]);
  expect(read().scenarios?.[0].mteIds).toEqual([referencedChild.id]);
  source.deleteMte(referencedRoot.id);
  expect(read().mtes).toHaveLength(3);
});

test('offline merge puts a colliding branch renumbering in one conflict', async () => {
  const base = fixture([referencedRoot, referencedChild]);
  const local = editWorkspace(base);
  const remote = editWorkspace(base);
  await local.source.saveMte({ ...referencedRoot, refNumber: 'M-20' });
  const occupiedId = await remote.source.saveMte({ ...referencedChild, id: undefined, refNumber: 'm-20.1' });
  const merged = mergeWorkspace(base, local.read(), remote.read());

  expect(merged.payload.mtes).toEqual(remote.read().mtes);
  expect(merged.conflicts).toHaveLength(1);
  expect(new Set(merged.conflicts[0].keys)).toEqual(new Set([
    `mtes:${referencedRoot.id}`, `mtes:${referencedChild.id}`, `mtes:${occupiedId}`,
  ]));
});

test('offline merge groups a new child with a parent changed by another device', () => {
  const otherPhase = { ...phase, id: 'other' };
  const base = { ...emptyWorkspace, mtes: [phase, otherPhase] };
  const local = { ...base, mtes: [phase, otherPhase, general] };
  const remote = { ...base, mtes: [{ ...phase, level: 'general', parentId: otherPhase.id } satisfies MTE, otherPhase] };
  const merged = mergeWorkspace(base, local, remote);

  expect(merged.payload.mtes).toEqual(remote.mtes);
  expect(merged.conflicts).toHaveLength(1);
  expect(merged.conflicts[0].keys).toEqual(expect.arrayContaining(['mtes:general', 'mtes:phase']));
});

test('passage criteria survive catalog changes, correction and repetition', async () => {
  const task = { ...detail, criteria: [criterion, scoreCriterion] };
  const { read, source } = editWorkspace(fixture([phase, general, task]));
  await source.addPassage({ ...context, conditionId: 'condition' });
  const id = read().passages![0].id;
  await source.startPassage(id);
  const renamed = { ...criterion, label: 'Wrong values', maxErrorRate: 5 };
  await source.saveMte({ ...task, criteria: [renamed] });

  const rating = { ...context, passageId: id, mteId: detail.id, scores: DEFAULT_WEIGHTS };
  const observations = [{ criterion, errors: 0, opportunities: 0 }, { criterion: scoreCriterion, score: 4 }];
  await expect(source.saveRating({ ...rating, observations: [{ criterion: renamed, errors: 0, opportunities: 2 }] })).rejects.toThrow();
  await expect(source.saveRating({ ...rating, observations: [{ criterion, errors: 2, opportunities: 1 }] })).rejects.toThrow();
  await expect(source.saveRating({ ...rating, observations: [{ criterion: scoreCriterion, score: 2.5 }] })).rejects.toThrow();
  await source.saveRating({ ...rating, observations });
  await source.saveRating({ ...rating, comments: 'Corrected' });
  expect(read().ratings[0].observations).toEqual(observations);

  await source.addPassage({ ...context, conditionId: 'condition' }, id);
  const repeat = read().passages![1];
  await source.startPassage(repeat.id);
  expect(read().passages![1].mteCriteria).toEqual(read().passages![0].mteCriteria);
  await source.saveRating({ ...rating, passageId: repeat.id, observations });
  expect(read().ratings[1].observations).toEqual(observations);
});

test('offline merge keeps a passage rating with the criteria observed on its originating device', async () => {
  const task = { ...detail, criteria: [criterion] };
  const planned = editWorkspace(fixture([phase, general, task]));
  await planned.source.addPassage({ ...context, conditionId: 'condition' });
  const base = planned.read();
  const id = base.passages![0].id;
  const local = editWorkspace(base);
  const remote = editWorkspace(base);
  await local.source.startPassage(id);
  await local.source.saveRating({
    ...context, passageId: id, mteId: detail.id, scores: DEFAULT_WEIGHTS,
    observations: [{ criterion, errors: 1, opportunities: 5 }],
  });
  await remote.source.saveMte({ ...task, criteria: [{ ...criterion, label: 'Wrong values' }] });
  await remote.source.startPassage(id);

  const merged = mergeWorkspace(base, local.read(), remote.read());
  expect(merged.payload.ratings).toEqual([]);
  expect(merged.conflicts).toHaveLength(1);
  expect(merged.conflicts[0].keys).toEqual(expect.arrayContaining([
    `passages:${id}`, `ratings:${local.read().ratings[0].id}`,
  ]));
});

test('a direct rating keeps an observed definition even after the catalogue removes it', async () => {
  const task = { ...detail, criteria: [criterion] };
  const { read, source } = editWorkspace(fixture([phase, general, task]));
  const rating = { ...context, mteId: detail.id, scores: DEFAULT_WEIGHTS };
  await source.saveRating({ ...rating, observations: [{ criterion, errors: 1, opportunities: 5 }] });
  await source.saveMte({ ...task, criteria: [] });
  const updatedTask = read().mtes[2];
  const previous = read().ratings[0];

  expect(criteriaForRating(updatedTask)).toEqual([]);
  expect(criteriaForRating(updatedTask, undefined, previous)).toEqual([criterion]);
  await source.saveRating({ ...rating, observations: [{ criterion, errors: 0, opportunities: 5 }] });
  expect(read().ratings[0].observations).toEqual([{ criterion, errors: 0, opportunities: 5 }]);
});
