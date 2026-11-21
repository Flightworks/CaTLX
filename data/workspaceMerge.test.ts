import { describe, expect, it } from 'vitest';
import { DEFAULT_WEIGHTS } from '../constants';
import type { WorkspaceData } from '../types';
import { createDataSource, emptyWorkspace } from './workspace';
import { mergeWorkspace, resolveWorkspaceConflict, sameWorkspace } from './workspaceMerge';

function fixture(): WorkspaceData {
  return {
    ...emptyWorkspace,
    projects: [{ id: 'p', name: 'Project', description: '', ownerId: 'local-admin', memberIds: ['e'] }],
    studies: [{ id: 's', projectId: 'p', name: 'Study', description: '', date: 0, mteIds: [], evaluatorIds: ['e'] }],
    evaluators: [{ id: 'e', name: 'Evaluator', company: '', quality: '' }],
    mtes: [{ id: 't', name: 'Task', description: '', refNumber: 'T' }],
    scenarios: [
      { id: 'a', studyId: 's', name: 'Approach', mteIds: [] },
      { id: 'b', studyId: 's', name: 'Departure', mteIds: [] },
    ],
  };
}

const rating = { evaluatorId: 'e', studyId: 's', mteId: 't', scores: DEFAULT_WEIGHTS };

function modify(initial: WorkspaceData) {
  let data = initial;
  return {
    source: createDataSource(initial, change => { data = change(data); }),
    current: () => data,
  };
}

describe('scenario ratings', () => {
  it('attaches a catalog task atomically and keeps direct and scenario scores separate', async () => {
    const { source, current } = modify(fixture());
    await source.saveRating(rating);
    await source.saveRating({ ...rating, scenarioId: 'a', comments: 'first scenario' });
    await source.saveRating({ ...rating, scenarioId: 'b' });
    await source.saveRating({ ...rating, scenarioId: 'a', comments: 'corrected' });

    expect(current().studies[0].mteIds).toEqual(['t']);
    expect(current().scenarios?.map(scenario => scenario.mteIds)).toEqual([['t'], ['t']]);
    expect(current().ratings).toHaveLength(3);
    expect(current().ratings.find(entry => entry.scenarioId === 'a')?.comments).toBe('corrected');
    expect(current().ratings.find(entry => entry.scenarioId == null)?.comments).toBeUndefined();
  });

  it('archives the scenario without removing its existing scores', async () => {
    const { source, current } = modify(fixture());
    await source.saveRating({ ...rating, scenarioId: 'a' });
    await source.archiveScenario('a', true);
    await expect(source.saveRating({ ...rating, scenarioId: 'a' })).rejects.toThrow();
    expect(current().ratings).toHaveLength(1);
    expect(current().scenarios?.[0]).toMatchObject({ archived: true, mteIds: ['t'] });
  });
});

describe('offline workspace merge', () => {
  it('merges independent changes and ignores JSONB field order', async () => {
    const base = fixture();
    const { source, current } = modify(base);
    await source.saveRating(rating);
    const remote = { ...base, projects: [{ ...base.projects[0], description: 'Remote edit' }] };
    const merged = mergeWorkspace(base, current(), remote);
    expect(merged.conflicts).toEqual([]);
    expect(merged.payload.ratings).toHaveLength(1);
    expect(merged.payload.projects[0].description).toBe('Remote edit');
    const reordered = { ...remote, projects: [{ ...remote.projects[0], id: 'p' }].map(project => ({
      description: project.description, name: project.name, id: project.id, memberIds: project.memberIds, ownerId: project.ownerId,
    })) };
    expect(sameWorkspace(remote, reordered)).toBe(true);
  });

  it('keeps both variants when devices change the same entity and applies an explicit choice', () => {
    const base = fixture();
    const local = { ...base, projects: [{ ...base.projects[0], name: 'Local' }] };
    const remote = { ...base, projects: [{ ...base.projects[0], name: 'Remote' }] };
    const merged = mergeWorkspace(base, local, remote);
    expect(merged.payload.projects[0].name).toBe('Remote');
    expect(merged.conflicts).toHaveLength(1);
    const resolved = resolveWorkspaceConflict(base, local, remote, merged.conflicts[0], 'local');
    expect(resolved).not.toBeNull();
    expect(mergeWorkspace(resolved.base, resolved.local, remote).payload.projects[0].name).toBe('Local');
  });

  it('groups a rating with a dependency removed by a second device', async () => {
    const base = fixture();
    const { source, current } = modify(base);
    await source.saveRating({ ...rating, scenarioId: 'a' });
    const remote = { ...base, mtes: [] };
    const merged = mergeWorkspace(base, current(), remote);
    expect(merged.payload.ratings).toEqual([]);
    expect(merged.conflicts).toHaveLength(1);
    expect(merged.conflicts[0].keys).toEqual(expect.arrayContaining(['mtes:t', 'scenarios:a']));
    const resolved = resolveWorkspaceConflict(base, current(), remote, merged.conflicts[0], 'local');
    expect(resolved).not.toBeNull();
    const result = mergeWorkspace(resolved.base, resolved.local, remote);
    expect(result.conflicts).toEqual([]);
    expect(result.payload.ratings).toHaveLength(1);
    expect(result.payload.mtes).toHaveLength(1);
  });
});
