import { describe, expect, it } from 'vitest';
import { managedUserFromDocument } from './admin';

describe('managed user documents', () => {
  it('normalizes a Firebase user profile', () => {
    expect(managedUserFromDocument('uid-1', {
      email: 'user@example.test', displayName: 'User', role: 'catalog_manager', status: 'active', createdAt: 1_700_000_000,
    })).toMatchObject({
      uid: 'uid-1', email: 'user@example.test', role: 'catalog_manager', status: 'active', createdAt: 1_700_000_000_000,
    });
  });

  it('rejects an unknown role or status', () => {
    expect(() => managedUserFromDocument('uid-1', { role: 'root', status: 'active' })).toThrow(/Invalid user profile/);
    expect(() => managedUserFromDocument('uid-1', { role: 'evaluator', status: 'unknown' })).toThrow(/Invalid user profile/);
  });
});
