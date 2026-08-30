export const APP_ROLES = [
  'admin',
  'catalog_manager',
  'study_manager',
  'analyst',
  'evaluator',
  'pending',
  'disabled',
] as const;

export type AppRole = (typeof APP_ROLES)[number];
export type AccountStatus = 'pending' | 'active' | 'disabled';

export interface AppUser {
  uid: string;
  email: string;
  displayName: string;
  role: AppRole;
  status: AccountStatus;
}

export interface AuthFlowError extends Error {
  code: 'account-pending' | 'account-disabled' | 'profile-missing' | 'invalid-profile';
}
