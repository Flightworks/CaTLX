import { Timestamp } from 'firebase/firestore';
import { Evaluator, MTE, PairwiseComparison, Project, Rating, Study, TLXDimension } from '../../types';

export function timestampToMillis(value: unknown): number {
  if (value instanceof Timestamp) return value.toMillis();
  if (value instanceof Date) return value.getTime();
  if (typeof value === 'object' && value !== null && 'toMillis' in value
    && typeof value.toMillis === 'function') {
    return value.toMillis();
  }
  const number = Number(value);
  if (!Number.isFinite(number)) return Date.now();
  return number < 1_000_000_000_000 ? number * 1000 : number;
}

const stringValue = (value: unknown, fallback = ''): string =>
  typeof value === 'string' ? value : fallback;

const stringArray = (value: unknown): string[] =>
  Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : [];

export function projectFromDocument(id: string, data: Record<string, unknown>): Project {
  return {
    id,
    name: stringValue(data.name),
    description: stringValue(data.description),
    ownerId: stringValue(data.ownerUid ?? data.ownerId),
    memberIds: stringArray(data.memberUids ?? data.memberIds),
  };
}

export function evaluatorFromDocument(id: string, data: Record<string, unknown>): Evaluator {
  return {
    id,
    name: stringValue(data.name),
    quality: stringValue(data.quality),
    company: stringValue(data.company),
  };
}

export function mteFromDocument(id: string, data: Record<string, unknown>): MTE {
  return {
    id,
    name: stringValue(data.name),
    description: stringValue(data.description),
    refNumber: stringValue(data.refNumber ?? data.ref_number),
  };
}

export function studyFromDocument(id: string, data: Record<string, unknown>): Study {
  return {
    id,
    name: stringValue(data.name),
    description: stringValue(data.description),
    date: timestampToMillis(data.date),
    mteIds: stringArray(data.mteIds),
    evaluatorIds: stringArray(data.evaluatorIds ?? data.evaluatorUids),
    projectId: stringValue(data.projectId),
  };
}

export function ratingFromDocument(
  id: string,
  studyId: string,
  data: Record<string, unknown>,
): Rating {
  return {
    id,
    evaluatorId: stringValue(data.evaluatorUid ?? data.evaluatorId),
    studyId,
    mteId: stringValue(data.mteId),
    scores: (data.scores || {}) as Record<TLXDimension, number>,
    timestamp: timestampToMillis(data.submittedAt ?? data.timestamp),
    comments: typeof data.comments === 'string' ? data.comments : undefined,
  };
}

export function pairwiseFromDocument(
  studyId: string,
  data: Record<string, unknown>,
): PairwiseComparison {
  return {
    evaluatorId: stringValue(data.evaluatorUid ?? data.evaluatorId),
    studyId,
    weights: (data.weights || {}) as Record<TLXDimension, number>,
    isWeighted: Boolean(data.isWeighted),
  };
}
