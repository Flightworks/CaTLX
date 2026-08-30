import { beforeEach, describe, expect, it, vi } from 'vitest';

const firebaseAuthMocks = vi.hoisted(() => ({
  createUserWithEmailAndPassword: vi.fn(),
  onAuthStateChanged: vi.fn(),
  sendPasswordResetEmail: vi.fn(),
  signInWithEmailAndPassword: vi.fn(),
  signOut: vi.fn(),
  updateProfile: vi.fn(),
}));
const firestoreMocks = vi.hoisted(() => ({
  doc: vi.fn((...parts: unknown[]) => parts.slice(1).join('/')),
  getDoc: vi.fn(),
  serverTimestamp: vi.fn(() => 'server-timestamp'),
  setDoc: vi.fn(),
}));
const configMocks = vi.hoisted(() => ({
  initializeFirebase: vi.fn(() => ({ auth: {}, db: {} })),
}));

vi.mock('firebase/auth', () => firebaseAuthMocks);
vi.mock('firebase/firestore', () => firestoreMocks);
vi.mock('../firebase/config', () => configMocks);

import {
  registerWithFirebase,
  sendFirebasePasswordReset,
  signInWithFirebase,
} from './firebaseAuth';

const activeUser = { uid: 'uid-active', email: 'active@example.test', displayName: 'Active User' };

beforeEach(() => {
  vi.clearAllMocks();
  firebaseAuthMocks.signOut.mockResolvedValue(undefined);
  firebaseAuthMocks.updateProfile.mockResolvedValue(undefined);
  firebaseAuthMocks.sendPasswordResetEmail.mockResolvedValue(undefined);
  firestoreMocks.setDoc.mockResolvedValue(undefined);
});

describe('Firebase authentication flows', () => {
  it('returns the active application profile after sign-in', async () => {
    firebaseAuthMocks.signInWithEmailAndPassword.mockResolvedValue({ user: activeUser });
    firestoreMocks.getDoc.mockResolvedValue({
      exists: () => true,
      data: () => ({ role: 'evaluator', status: 'active', displayName: 'Profile Name' }),
    });

    await expect(signInWithFirebase(' active@example.test ', 'password'))
      .resolves.toMatchObject({ uid: 'uid-active', role: 'evaluator', status: 'active' });
    expect(firebaseAuthMocks.signInWithEmailAndPassword)
      .toHaveBeenCalledWith({}, 'active@example.test', 'password');
  });

  it('signs out and rejects a pending account', async () => {
    firebaseAuthMocks.signInWithEmailAndPassword.mockResolvedValue({ user: activeUser });
    firestoreMocks.getDoc.mockResolvedValue({
      exists: () => true,
      data: () => ({ role: 'pending', status: 'pending' }),
    });

    await expect(signInWithFirebase('active@example.test', 'password'))
      .rejects.toMatchObject({ code: 'account-pending' });
    expect(firebaseAuthMocks.signOut).toHaveBeenCalledWith({});
  });

  it('rejects a disabled account and a missing profile', async () => {
    firebaseAuthMocks.signInWithEmailAndPassword.mockResolvedValue({ user: activeUser });
    firestoreMocks.getDoc
      .mockResolvedValueOnce({ exists: () => true, data: () => ({ role: 'disabled', status: 'disabled' }) })
      .mockResolvedValueOnce({ exists: () => false });

    await expect(signInWithFirebase('active@example.test', 'password'))
      .rejects.toMatchObject({ code: 'account-disabled' });
    await expect(signInWithFirebase('active@example.test', 'password'))
      .rejects.toMatchObject({ code: 'profile-missing' });
  });

  it('creates a pending profile without allowing a self-selected role', async () => {
    firebaseAuthMocks.createUserWithEmailAndPassword.mockResolvedValue({ user: activeUser });

    await expect(registerWithFirebase('active@example.test', 'password', 'Active User'))
      .resolves.toMatchObject({ uid: 'uid-active', role: 'pending', status: 'pending' });
    expect(firestoreMocks.setDoc).toHaveBeenCalledWith(
      'users/uid-active',
      expect.objectContaining({ role: 'pending', status: 'pending', createdAt: 'server-timestamp' }),
    );
    expect(firebaseAuthMocks.signOut).toHaveBeenCalledWith({});
  });

  it('uses a neutral password-reset flow', async () => {
    firebaseAuthMocks.sendPasswordResetEmail.mockRejectedValue(new Error('email not found'));

    await expect(sendFirebasePasswordReset('unknown@example.test')).resolves.toBeUndefined();
    expect(firebaseAuthMocks.sendPasswordResetEmail)
      .toHaveBeenCalledWith({}, 'unknown@example.test');
  });
});
