import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import useMockData from '../hooks/useMockData';
import useLocalStorageData from '../hooks/useLocalStorageData';
import useApiData, { API_BASE_URL, API_TOKEN_KEY, apiRequest } from '../hooks/useApiData';
import { isFirebaseConfigured } from '../src/firebase/config';
import {
  registerWithFirebase,
  sendFirebasePasswordReset,
  signInWithFirebase,
  signOutFirebase,
  subscribeToFirebaseAuthState,
} from '../src/auth/firebaseAuth';
import type { AppUser } from '../src/auth/types';
import { IDataSource } from '../types';

type AppMode = 'demo' | 'local' | 'api' | 'firebase';
type Credentials = { email: string; password: string };

interface AuthContextType {
  isLoggedIn: boolean;
  mode: AppMode;
  user: AppUser | null;
  login: (mode: AppMode, credentials?: Credentials) => Promise<void>;
  register: (credentials: Credentials, displayName?: string) => Promise<AppUser>;
  requestPasswordReset: (email: string) => Promise<void>;
  logout: () => void;
  authLoading: boolean;
  authError: string | null;
}
interface SessionContextType {
  selectedEvaluatorId: string;
  setSelectedEvaluatorId: React.Dispatch<React.SetStateAction<string>>;
  selectedProjectId: string;
  setSelectedProjectId: React.Dispatch<React.SetStateAction<string>>;
  selectedStudyId: string;
  setSelectedStudyId: React.Dispatch<React.SetStateAction<string>>;
}
export const AuthContext = createContext<AuthContextType | undefined>(undefined);
export const DataContext = createContext<IDataSource | undefined>(undefined);
export const SessionContext = createContext<SessionContextType | undefined>(undefined);

const errorMessage = (error: unknown, fallback: string): string =>
  error instanceof Error && error.message ? error.message : fallback;

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [mode, setMode] = useState<AppMode>('demo');
  const [user, setUser] = useState<AppUser | null>(null);
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const mockDataHook = useMockData();
  const localStorageDataHook = useLocalStorageData();
  const apiDataHook = useApiData();
  // K4 replaces this transitional hook with the role-scoped Firestore source.
  const dataHook = mode === 'api' || mode === 'firebase'
    ? apiDataHook
    : mode === 'local' ? localStorageDataHook : mockDataHook;
  const [selectedEvaluatorId, setSelectedEvaluatorId] = useState('');
  const [selectedProjectId, setSelectedProjectId] = useState('');
  const [selectedStudyId, setSelectedStudyId] = useState('');

  const login = async (loginMode: AppMode, credentials?: Credentials): Promise<void> => {
    setAuthError(null);
    setMode(loginMode);
    setUser(null);

    if (loginMode === 'firebase') {
      if (!credentials?.email || !credentials.password) {
        const error = new Error('Email and password are required');
        setAuthError(error.message);
        throw error;
      }
      setAuthLoading(true);
      try {
        const authenticatedUser = await signInWithFirebase(credentials.email, credentials.password);
        setUser(authenticatedUser);
        setIsLoggedIn(true);
      } catch (error) {
        setAuthError(errorMessage(error, 'Unable to sign in'));
        setIsLoggedIn(false);
        throw error;
      } finally {
        setAuthLoading(false);
      }
      return;
    }

    if (loginMode === 'api') {
      if (!credentials?.email || !credentials.password) {
        const error = new Error('Email and password are required');
        setAuthError(error.message);
        throw error;
      }
      setAuthLoading(true);
      try {
        const response = await fetch(`${API_BASE_URL}/auth/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(credentials),
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Login failed');
        localStorage.setItem(API_TOKEN_KEY, data.token);
        window.dispatchEvent(new Event('catlx-auth-changed'));
        setIsLoggedIn(true);
      } catch (error) {
        setAuthError(errorMessage(error, 'Login failed'));
        setIsLoggedIn(false);
        throw error;
      } finally {
        setAuthLoading(false);
      }
      return;
    }

    setIsLoggedIn(true);
  };

  const register = async (credentials: Credentials, displayName = ''): Promise<AppUser> => {
    setAuthError(null);
    setAuthLoading(true);
    try {
      return await registerWithFirebase(credentials.email, credentials.password, displayName);
    } catch (error) {
      setAuthError(errorMessage(error, 'Unable to create the account'));
      throw error;
    } finally {
      setAuthLoading(false);
    }
  };

  const requestPasswordReset = async (email: string): Promise<void> => {
    setAuthError(null);
    setAuthLoading(true);
    try {
      await sendFirebasePasswordReset(email);
    } catch (error) {
      // Keep the UI message generic; the auth module never reveals account existence.
      setAuthError(errorMessage(error, 'Unable to request a password reset'));
      throw error;
    } finally {
      setAuthLoading(false);
    }
  };

  const logout = (): void => {
    if (mode === 'firebase' && isFirebaseConfigured()) void signOutFirebase();
    localStorage.removeItem(API_TOKEN_KEY);
    window.dispatchEvent(new Event('catlx-auth-changed'));
    setIsLoggedIn(false);
    setUser(null);
    setSelectedEvaluatorId('');
    setSelectedProjectId('');
    setSelectedStudyId('');
  };

  useEffect(() => {
    const jwt = localStorage.getItem(API_TOKEN_KEY);
    if (!jwt) return;
    setAuthLoading(true);
    apiRequest('/auth/me')
      .then(() => {
        setMode('api');
        setIsLoggedIn(true);
      })
      .catch(() => localStorage.removeItem(API_TOKEN_KEY))
      .finally(() => setAuthLoading(false));
  }, []);

  useEffect(() => {
    if (!isFirebaseConfigured()) return undefined;
    setAuthLoading(true);
    try {
      return subscribeToFirebaseAuthState(
        (authenticatedUser) => {
          setUser(authenticatedUser);
          setMode('firebase');
          setIsLoggedIn(Boolean(authenticatedUser));
          setAuthLoading(false);
        },
        (error) => {
          setUser(null);
          setIsLoggedIn(false);
          setAuthError(errorMessage(error, 'Unable to restore the Firebase session'));
          setAuthLoading(false);
        },
      );
    } catch (error) {
      setAuthError(errorMessage(error, 'Firebase is not configured correctly'));
      setAuthLoading(false);
      return undefined;
    }
  }, []);

  useEffect(() => {
    setSelectedEvaluatorId('');
    setSelectedProjectId('');
    setSelectedStudyId('');
  }, [isLoggedIn]);

  useEffect(() => {
    setSelectedStudyId('');
    setSelectedEvaluatorId('');
  }, [selectedProjectId]);

  return (
    <AuthContext.Provider value={{
      isLoggedIn,
      mode,
      user,
      login,
      register,
      requestPasswordReset,
      logout,
      authLoading,
      authError,
    }}>
      <DataContext.Provider value={dataHook}>
        <SessionContext.Provider value={{
          selectedEvaluatorId,
          setSelectedEvaluatorId,
          selectedProjectId,
          setSelectedProjectId,
          selectedStudyId,
          setSelectedStudyId,
        }}>
          {children}
        </SessionContext.Provider>
      </DataContext.Provider>
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AppProvider');
  return context;
};
export const useData = () => {
  const context = useContext(DataContext);
  if (!context) throw new Error('useData must be used within an AppProvider');
  return context;
};
export const useSession = () => {
  const context = useContext(SessionContext);
  if (!context) throw new Error('useSession must be used within an AppProvider');
  return context;
};
