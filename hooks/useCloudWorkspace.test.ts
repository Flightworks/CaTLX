import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { saveWorkspace, type CloudConfig } from '../data/supabase';
import { emptyWorkspace } from '../data/workspace';
import useCloudWorkspace from './useCloudWorkspace';

vi.mock('../data/supabase', () => ({ saveWorkspace: vi.fn() }));

const config = { environment: 'preprod' } as CloudConfig;
const initial = {
  revision: 3,
  payload: {
    ...emptyWorkspace,
    studies: [{
      id: 'study', projectId: 'project', name: 'Test study', description: '',
      date: 0, evaluatorIds: [], mteIds: [],
    }],
  },
};

describe('cloud workspace', () => {
  beforeEach(() => vi.resetAllMocks());

  it('saves a new task and its study assignment in the same revision', async () => {
    vi.mocked(saveWorkspace).mockResolvedValue('saved');
    const { result } = renderHook(() => useCloudWorkspace(config, initial));

    act(() => {
      const task = result.current.dataSource.addMte({ name: 'Test task', description: '' });
      result.current.dataSource.addMTEToStudy('study', task.id);
    });

    await waitFor(() => expect(result.current.status).toBe('idle'));
    expect(saveWorkspace).toHaveBeenCalledTimes(1);
    const [, submitted, revision] = vi.mocked(saveWorkspace).mock.calls[0];
    expect(submitted.studies[0].mteIds).toEqual([submitted.mtes[0].id]);
    expect(revision).toBe(3);
  });

  it('retries the same write when the save response is lost', async () => {
    vi.mocked(saveWorkspace).mockRejectedValueOnce(new Error('Interrupted')).mockResolvedValueOnce('saved');
    const { result } = renderHook(() => useCloudWorkspace(config, initial));

    act(() => result.current.dataSource.deleteStudy('study'));
    await waitFor(() => expect(result.current.status).toBe('error'));

    await act(async () => result.current.retry());
    expect(result.current.status).toBe('idle');
    expect(saveWorkspace).toHaveBeenCalledTimes(2);
    expect(vi.mocked(saveWorkspace).mock.calls[0]).toEqual(vi.mocked(saveWorkspace).mock.calls[1]);
  });

  it('reports a concurrent change without overwriting the newer revision', async () => {
    vi.mocked(saveWorkspace).mockResolvedValue('conflict');
    const { result } = renderHook(() => useCloudWorkspace(config, initial));

    act(() => result.current.dataSource.deleteStudy('study'));
    await waitFor(() => expect(result.current.status).toBe('conflict'));
    expect(saveWorkspace).toHaveBeenCalledTimes(1);
  });
});
