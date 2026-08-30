import { collection, getDocs, updateDoc, doc, type Firestore } from 'firebase/firestore';
import { initializeFirebase } from '../firebase/config';
import { APP_ROLES, type AccountStatus, type AppRole, type AppUser } from '../auth/types';

export interface ManagedUser extends AppUser {
  createdAt?: number;
  approvedAt?: number;
  approvedBy?: string;
}

const toMillis = (value: unknown): number | undefined => {
  if (value && typeof value === 'object' && 'toMillis' in value && typeof value.toMillis === 'function') {
    return value.toMillis();
  }
  return typeof value === 'number' ? (value < 1_000_000_000_000 ? value * 1000 : value) : undefined;
};

const validRole = (value: unknown): value is AppRole =>
  typeof value === 'string' && (APP_ROLES as readonly string[]).includes(value);

const validStatus = (value: unknown): value is AccountStatus =>
  value === 'pending' || value === 'active' || value === 'disabled';

export const managedUserFromDocument = (id: string, data: Record<string, unknown>): ManagedUser => {
  if (!validRole(data.role) || !validStatus(data.status)) {
    throw new Error(`Invalid user profile: ${id}`);
  }
  return {
    uid: id,
    email: typeof data.email === 'string' ? data.email : '',
    displayName: typeof data.displayName === 'string' ? data.displayName : '',
    role: data.role,
    status: data.status,
    createdAt: toMillis(data.createdAt),
    approvedAt: toMillis(data.approvedAt),
    approvedBy: typeof data.approvedBy === 'string' ? data.approvedBy : undefined,
  };
};

export async function listManagedUsers(db: Firestore = initializeFirebase().db): Promise<ManagedUser[]> {
  const snapshot = await getDocs(collection(db, 'users'));
  return snapshot.docs.map((item) => managedUserFromDocument(item.id, item.data() as Record<string, unknown>));
}

export async function updateManagedUser(
  uid: string,
  patch: { role: AppRole; status: AccountStatus },
  actorUid: string,
  db: Firestore = initializeFirebase().db,
): Promise<void> {
  if (!validRole(patch.role) || !validStatus(patch.status)) throw new Error('Invalid account role or status');
  await updateDoc(doc(db, 'users', uid), {
    role: patch.role,
    status: patch.status,
    approvedAt: patch.status === 'active' ? Date.now() : null,
    approvedBy: patch.status === 'active' ? actorUid : null,
  });
}
