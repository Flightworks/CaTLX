import { expect, test } from 'vitest';
import { createDataSource, emptyWorkspace, latestRating, orderedPassages } from './workspace';
import { mergeWorkspace } from './workspaceMerge';
import { TLXDimension, type WorkspaceData } from '../types';

const initial: WorkspaceData = {
  ...emptyWorkspace,
  projects: [{ id: 'project', name: 'Project', description: '', ownerId: 'owner', memberIds: ['owner', 'pilot'] }],
  studies: [{ id: 'study', name: 'Study', projectId: 'project', date: 1, description: '', evaluatorIds: ['pilot'], mteIds: ['x', 'y'] }],
  evaluators: [{ id: 'pilot', name: 'Pilot', company: '', quality: '' }],
  mtes: ['x', 'y'].map(id => ({ id, name: id, description: '', refNumber: id })),
  scenarios: [{ id: 'scenario', name: 'Scenario', studyId: 'study', mteIds: ['x', 'y'] }],
};

function createState(initialState: WorkspaceData) {
  let state = initialState;
  return {
    read: () => state,
    actions: createDataSource(state, change => { state = change(state); }),
  };
}

test('a restarted protocol is preserved through scenario edits, correction and repetition', async () => {
  const { actions, read } = createState(initial);
  const context = { studyId: 'study', scenarioId: 'scenario', evaluatorId: 'pilot' };
  const scores = Object.fromEntries(Object.values(TLXDimension).map(dimension => [dimension, 45])) as Record<TLXDimension, number>;
  await actions.addCondition({ studyId: 'study', name: 'A', version: '1' });
  await actions.addCondition({ studyId: 'study', name: 'B', version: '2' });
  const conditionId = read().conditions![0].id;
  await actions.addPassage({ ...context, conditionId });
  await actions.addPassage({ ...context, conditionId: read().conditions![1].id });
  const [a, b] = orderedPassages(read().passages!, 'study');
  await actions.movePassage(b.id, -1);
  expect(orderedPassages(read().passages!, 'study').map(pass => pass.id)).toEqual([b.id, a.id]);
  await actions.startPassage(a.id);
  await actions.saveScenario({ id: 'scenario', studyId: 'study', name: 'Edited', mteIds: ['y', 'x'] });
  const planned = { ...context, passageId: a.id, scores };
  await expect(actions.saveRating({ ...planned, mteId: 'y' })).rejects.toThrow();
  await actions.saveRating({ ...planned, mteId: 'x', comments: 'first' });
  expect(read().passages?.find(pass => pass.id === a.id)?.completedAt).toBeUndefined();
  expect(latestRating(read().ratings, { ...context, mteId: 'x' })).toBeUndefined();
  await actions.saveRating({ ...planned, mteId: 'y' });
  const completed = read().passages?.find(pass => pass.id === a.id);
  expect(completed?.completedAt).toBeDefined();
  expect(completed?.mteIds).toEqual(['x', 'y']);
  await actions.saveRating({ ...planned, mteId: 'x', comments: 'corrected' });
  expect(read().ratings).toHaveLength(2);
  expect(read().passages?.find(pass => pass.id === a.id)?.completedAt).toEqual(completed?.completedAt);
  await actions.addPassage({ ...context, conditionId }, a.id);
  const repeat = orderedPassages(read().passages!, 'study').at(-1)!;
  await actions.startPassage(repeat.id);
  await actions.saveRating({ ...context, passageId: repeat.id, mteId: 'x', scores });
  expect(read().ratings).toHaveLength(3);
  expect(read().passages?.find(pass => pass.id === repeat.id)?.mteIds).toEqual(['x', 'y']);
  actions.deleteStudy('study');
  actions.deleteMte('x');
  actions.removeEvaluatorFromStudy('study', 'pilot');
  expect(read().studies[0].evaluatorIds).toEqual(['pilot']);
  expect(read().mtes).toHaveLength(2);
});

test('merging a legacy offline copy retains newer conditions and passages', async () => {
  const { actions, read } = createState(initial);
  await actions.addCondition({ studyId: 'study', name: 'A', version: '' });
  await actions.addPassage({ studyId: 'study', evaluatorId: 'pilot', scenarioId: 'scenario', conditionId: read().conditions![0].id });
  const local = { ...initial, conditions: undefined, passages: undefined, studies: [{ ...initial.studies[0], name: 'Offline edit' }] };
  const merged = mergeWorkspace(initial, local, read());
  expect(merged.conflicts).toEqual([]);
  expect(merged.payload.conditions).toHaveLength(1);
  expect(merged.payload.passages).toHaveLength(1);
  expect(merged.payload.studies[0].name).toBe('Offline edit');
});
