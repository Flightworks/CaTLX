import { afterEach, describe, expect, it, vi } from 'vitest';
import { getFirebaseConfig, isFirebaseConfigured } from './config';

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('Firebase configuration', () => {
  it('reports an incomplete configuration without throwing', () => {
    vi.stubEnv('VITE_FIREBASE_API_KEY', '');
    vi.stubEnv('VITE_FIREBASE_AUTH_DOMAIN', '');
    vi.stubEnv('VITE_FIREBASE_PROJECT_ID', '');
    vi.stubEnv('VITE_FIREBASE_APP_ID', '');

    expect(isFirebaseConfigured()).toBe(false);
    expect(() => getFirebaseConfig()).toThrow(/VITE_FIREBASE_API_KEY/);
  });

  it('returns the public Firebase configuration when all values exist', () => {
    vi.stubEnv('VITE_FIREBASE_API_KEY', 'test-api-key');
    vi.stubEnv('VITE_FIREBASE_AUTH_DOMAIN', 'test.firebaseapp.com');
    vi.stubEnv('VITE_FIREBASE_PROJECT_ID', 'demo-catlx');
    vi.stubEnv('VITE_FIREBASE_APP_ID', 'test-app-id');
    vi.stubEnv('VITE_USE_FIREBASE_EMULATORS', 'true');

    expect(isFirebaseConfigured()).toBe(true);
    expect(getFirebaseConfig()).toEqual({
      apiKey: 'test-api-key',
      authDomain: 'test.firebaseapp.com',
      projectId: 'demo-catlx',
      appId: 'test-app-id',
      useEmulators: true,
    });
  });
});
