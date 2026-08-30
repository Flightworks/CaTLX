import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import useFirestoreData from './useFirestoreData';
import type { AppUser } from '../src/auth/types';

const firestoreMocks = vi.hoisted(() => {
  const ref = (path: string) => ({ path });
  class MockTimestamp {}
  return {
    Timestamp: MockTimestamp,
    arrayRemove: vi.fn((value: unknown) => ({ operation: 'remove', value })),
    arrayUnion: vi.fn((value: unknown) => ({ operation: 'union', value })),
    collection: vi.fn((_: unknown, ...parts: string[]) => ref(parts.join('/'))),
    deleteDoc: vi.fn(),
    doc: vi.fn((_: unknown, ...parts: string[]) => ref(parts.join('/'))),
    getDoc: vi.fn(),
    getDocs: vi.fn(),
    query: vi.fn((source: { path: string }, ...constraints: unknown[]) => ({ path: source.path, constraints })),
    serverTimestamp: vi.fn(() => 'server-timestamp'),
    setDoc: vi.fn(),
    updateDoc: vi.fn(),
    where: vi.fn((...args: unknown[]) => ({ where: args })),
    writeBatch: vi.fn(),
  };
});
const configMocks = vi.hoisted(() => ({
  initializeFirebase: vi.fn(() => ({ db: {} })),
}));

vi.mock('firebase/firestore', () => firestoreMocks);
vi.mock('../src/firebase/config', () => configMocks);

const activeAdmin: AppUser = { uid: 'admin', email: 'admin@example.test', displayName: 'Admin', role: 'admin', status: 'active' };
const activeEvaluator: AppUser = { uid: 'evaluator-a', email: 'evaluator@example.test', displayName: 'Evaluator', role: 'evaluator', status: 'active' };

const document = (id: string, data: Record<string, unknown>) => ({ id, data: () => data });

beforeEach(() => {
  vi.clearAllMocks();
  firestoreMocks.getDocs.mockImplementation(async (source: { path: string; constraints?: unknown[] }) => {
    if (source.path === 'studies') {
      return { docs: [document('study-a', {
        name: 'Study A', description: 'Synthetic', date: 1_700_000_000,
        projectId: 'project-a', mteIds: ['mte-1'], evaluatorUids: ['evaluator-a'],
      })] };
    }
    if (source.path === 'mteCatalog') {
      return { docs: [document('catalog-1', { name: 'Global task', description: 'Global', refNumber: 'C-1' })] };
    }
    if (source.path === 'projects') return { docs: [] };
    if (source.path === 'evaluators') return { docs: [] };
    if (source.path === 'studies/study-a/mtes') {
      return { docs: [document('mte-1', { name: 'Assigned task', description: 'Snapshot', refNumber: 'S-1' })] };
    }
    if (source.path === 'studies/study-a/ratings' || source.path === 'studies/study-a/pairwise') return { docs: [] };
    return { docs: [] };
  });
  firestoreMocks.getDoc.mockResolvedValue({ exists: () => true, data: () => ({ revision: 1, name: 'Task', description: 'Task', refNumber: 'T-1' }) });
});

describe('useFirestoreData role-scoped loading', () => {
  it('loads the global catalogue for an admin', async () => {
    const { result } = renderHook(() => useFirestoreData(activeAdmin));

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.error).toBeNull();

    expect(result.current.mtes).toHaveLength(1);
    expect(firestoreMocks.collection).toHaveBeenCalledWith({}, 'mteCatalog');
  });

  it('loads study snapshots but never requests the global catalogue for an evaluator', async () => {
    const { result } = renderHook(() => useFirestoreData(activeEvaluator));

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.studies).toHaveLength(1);
    expect(result.current.mtes).toEqual([
      { id: 'mte-1', name: 'Assigned task', description: 'Snapshot', refNumber: 'S-1' },
    ]);
    expect(firestoreMocks.collection).not.toHaveBeenCalledWith({}, 'mteCatalog');
  });

  it('updates local state only after an acknowledged rating write', async () => {
    const { result } = renderHook(() => useFirestoreData(activeEvaluator));
    await waitFor(() => expect(result.current.loading).toBe(false));
    firestoreMocks.setDoc.mockResolvedValue(undefined);

    await act(async () => {
      await result.current.addRating({
        evaluatorId: 'evaluator-a', studyId: 'study-a', mteId: 'mte-1',
        scores: {
          'Mental Demand': 50, 'Physical Demand': 50, 'Temporal Demand': 50,
          Performance: 50, Effort: 50, Frustration: 50,
        },
      });
    });

    expect(result.current.ratings).toHaveLength(1);
    expect(firestoreMocks.setDoc).toHaveBeenCalled();
  });
});
