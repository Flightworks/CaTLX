import { describe, expect, it } from 'vitest';
import { Timestamp } from 'firebase/firestore';
import {
  evaluatorFromDocument,
  mteFromDocument,
  pairwiseFromDocument,
  projectFromDocument,
  ratingFromDocument,
  studyFromDocument,
  timestampToMillis,
} from './converters';

it('converts Firebase timestamps and legacy second timestamps to milliseconds', () => {
  expect(timestampToMillis(Timestamp.fromMillis(1_700_000_000_000))).toBe(1_700_000_000_000);
  expect(timestampToMillis(1_700_000_000)).toBe(1_700_000_000_000);
  expect(timestampToMillis(new Date(1_700_000_000_000))).toBe(1_700_000_000_000);
});

describe('Firestore document converters', () => {
  it('maps denormalized project and study fields to CaTLX types', () => {
    expect(projectFromDocument('p1', {
      name: 'Project', description: 'Description', ownerUid: 'u1', memberUids: ['u1', 'u2'],
    })).toEqual({ id: 'p1', name: 'Project', description: 'Description', ownerId: 'u1', memberIds: ['u1', 'u2'] });
    expect(studyFromDocument('s1', {
      name: 'Study', description: 'Description', date: 1_700_000_000, projectId: 'p1',
      mteIds: ['m1'], evaluatorUids: ['u1'],
    })).toMatchObject({ id: 's1', date: 1_700_000_000_000, projectId: 'p1', mteIds: ['m1'], evaluatorIds: ['u1'] });
  });

  it('maps catalogue, rating and pairwise records', () => {
    expect(evaluatorFromDocument('u1', { name: 'User', quality: 'Pilot', company: 'Test' }).id).toBe('u1');
    expect(mteFromDocument('m1', { refNumber: 'M-1', name: 'Task', description: 'Description' }).refNumber).toBe('M-1');
    expect(ratingFromDocument('r1', 's1', {
      evaluatorUid: 'u1', mteId: 'm1', scores: { 'Mental Demand': 10 }, submittedAt: 1_700_000_000,
    })).toMatchObject({ id: 'r1', studyId: 's1', evaluatorId: 'u1', timestamp: 1_700_000_000_000 });
    expect(pairwiseFromDocument('s1', { evaluatorUid: 'u1', weights: {}, isWeighted: true }))
      .toMatchObject({ studyId: 's1', evaluatorId: 'u1', isWeighted: true });
  });
});
