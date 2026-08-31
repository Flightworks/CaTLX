import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
  type User,
} from 'firebase/auth';
import { doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore';
import { initializeFirebase } from '../firebase/config';
import { APP_ROLES, type AccountStatus, type AppRole, type AppUser, type AuthFlowError } from './types';

const isAppRole = (value: unknown): value is AppRole =>
  typeof value === 'string' && (APP_ROLES as readonly string[]).includes(value);

const isAccountStatus = (value: unknown): value is AccountStatus =>
  value === 'pending' || value === 'active' || value === 'disabled';

const createAuthFlowError = (
  code: AuthFlowError['code'],
  message: string,
): AuthFlowError => Object.assign(new Error(message), { code });

export const appUserFromProfile = (user: User, profile: Record<string, unknown>): AppUser => {
  const role = profile.role;
  const status = profile.status;
  if (!isAppRole(role) || !isAccountStatus(status)) {
    throw createAuthFlowError('invalid-profile', 'The account profile is invalid.');
  }
  return {
    uid: user.uid,
    email: user.email || String(profile.email || ''),
    displayName: user.displayName || String(profile.displayName || ''),
    role,
    status,
  };
};

const profileFor = async (user: User): Promise<AppUser> => {
  const { db } = initializeFirebase();
  const snapshot = await getDoc(doc(db, 'users', user.uid));
  if (!snapshot.exists()) {
    throw createAuthFlowError('profile-missing', 'The account profile is not ready yet.');
  }
  const appUser = appUserFromProfile(user, snapshot.data() as Record<string, unknown>);
  if (appUser.status === 'pending' || appUser.role === 'pending') {
    throw createAuthFlowError('account-pending', 'Your account is waiting for administrator approval.');
  }
  if (appUser.status === 'disabled' || appUser.role === 'disabled') {
    throw createAuthFlowError('account-disabled', 'This account is disabled.');
  }
  return appUser;
};

export async function signInWithFirebase(email: string, password: string): Promise<AppUser> {
  const { auth } = initializeFirebase();
  try {
    const credential = await signInWithEmailAndPassword(auth, email.trim(), password);
    try {
      return await profileFor(credential.user);
    } catch (error) {
      await signOut(auth);
      throw error;
    }
  } catch (error) {
    if ((error as Partial<AuthFlowError>).code?.startsWith('account-')
      || (error as Partial<AuthFlowError>).code === 'profile-missing'
      || (error as Partial<AuthFlowError>).code === 'invalid-profile') {
      throw error;
    }
    throw error;
  }
}

export async function registerWithFirebase(
  email: string,
  password: string,
  displayName = '',
): Promise<AppUser> {
  const { auth, db } = initializeFirebase();
  const credential = await createUserWithEmailAndPassword(auth, email.trim(), password);
  try {
    if (displayName.trim()) {
      await updateProfile(credential.user, { displayName: displayName.trim() });
    }
    const normalizedEmail = credential.user.email || email.trim();
    const normalizedName = credential.user.displayName || displayName.trim();
    const profile: AppUser = {
      uid: credential.user.uid,
      email: normalizedEmail,
      displayName: normalizedName,
      role: 'pending',
      status: 'pending',
    };
    await setDoc(doc(db, 'users', credential.user.uid), {
      ...profile,
      createdAt: serverTimestamp(),
    });
    await signOut(auth);
    return profile;
  } catch (error) {
    await signOut(auth);
    throw error;
  }
}

export async function sendFirebasePasswordReset(email: string): Promise<void> {
  const { auth } = initializeFirebase();
  try {
    await sendPasswordResetEmail(auth, email.trim());
  } catch {
    // Do not reveal whether an email address exists in the system.
  }
}

export function subscribeToFirebaseAuthState(
  onUser: (user: AppUser | null) => void,
  onError: (error: unknown) => void,
): () => void {
  const { auth } = initializeFirebase();
  return onAuthStateChanged(auth, (user) => {
    if (!user) {
      onUser(null);
      return;
    }
    void profileFor(user)
      .then(onUser)
      .catch(async (error) => {
        await signOut(auth);
        onUser(null);
        onError(error);
      });
  });
}

export async function signOutFirebase(): Promise<void> {
  const { auth } = initializeFirebase();
  await signOut(auth);
}
