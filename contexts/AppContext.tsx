import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import useMockData from '../hooks/useMockData';
import useLocalStorageData from '../hooks/useLocalStorageData';
import useApiData, { API_BASE_URL, API_TOKEN_KEY, apiRequest } from '../hooks/useApiData';
import { IDataSource } from '../types';

interface AuthContextType {
  isLoggedIn: boolean;
  mode: 'demo' | 'local' | 'api';
  login: (mode: 'demo' | 'local' | 'api', credentials?: { email: string; password: string }) => Promise<void>;
  logout: () => void;
  authLoading: boolean;
  authError: string | null;
}
interface SessionContextType { selectedEvaluatorId: string; setSelectedEvaluatorId: React.Dispatch<React.SetStateAction<string>>; selectedProjectId: string; setSelectedProjectId: React.Dispatch<React.SetStateAction<string>>; selectedStudyId: string; setSelectedStudyId: React.Dispatch<React.SetStateAction<string>>; }
export const AuthContext = createContext<AuthContextType | undefined>(undefined);
export const DataContext = createContext<IDataSource | undefined>(undefined);
export const SessionContext = createContext<SessionContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [isLoggedIn, setIsLoggedIn] = useState(false); const [mode, setMode] = useState<'demo'|'local'|'api'>('demo');
  const [authLoading, setAuthLoading] = useState(false); const [authError, setAuthError] = useState<string | null>(null);
  const mockDataHook = useMockData(); const localStorageDataHook = useLocalStorageData(); const apiDataHook = useApiData();
  const dataHook = mode === 'api' ? apiDataHook : mode === 'local' ? localStorageDataHook : mockDataHook;
  const [selectedEvaluatorId, setSelectedEvaluatorId] = useState(''); const [selectedProjectId, setSelectedProjectId] = useState(''); const [selectedStudyId, setSelectedStudyId] = useState('');

  const login = async (loginMode: 'demo'|'local'|'api', credentials?: { email: string; password: string }) => {
    setAuthError(null); setMode(loginMode);
    if (loginMode === 'api') {
      if (!credentials?.email || !credentials.password) throw new Error('Email and password are required');
      setAuthLoading(true);
      try { const result = await fetch(`${API_BASE_URL}/auth/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(credentials) }); const data = await result.json(); if (!result.ok) throw new Error(data.error || 'Login failed'); localStorage.setItem(API_TOKEN_KEY, data.token); window.dispatchEvent(new Event('catlx-auth-changed')); setIsLoggedIn(true); }
      catch (error) { setAuthError(error instanceof Error ? error.message : 'Login failed'); throw error; } finally { setAuthLoading(false); }
    } else setIsLoggedIn(true);
  };
  const logout = () => { localStorage.removeItem(API_TOKEN_KEY); window.dispatchEvent(new Event('catlx-auth-changed')); setIsLoggedIn(false); setSelectedEvaluatorId(''); setSelectedProjectId(''); setSelectedStudyId(''); };
  useEffect(() => { const jwt = localStorage.getItem(API_TOKEN_KEY); if (!jwt) return; setAuthLoading(true); apiRequest('/auth/me').then(() => { setMode('api'); setIsLoggedIn(true); }).catch(() => localStorage.removeItem(API_TOKEN_KEY)).finally(() => setAuthLoading(false)); }, []);
  useEffect(() => { setSelectedEvaluatorId(''); setSelectedProjectId(''); setSelectedStudyId(''); }, [isLoggedIn]);
  useEffect(() => { setSelectedStudyId(''); setSelectedEvaluatorId(''); }, [selectedProjectId]);
  return <AuthContext.Provider value={{ isLoggedIn, mode, login, logout, authLoading, authError }}><DataContext.Provider value={dataHook}><SessionContext.Provider value={{ selectedEvaluatorId, setSelectedEvaluatorId, selectedProjectId, setSelectedProjectId, selectedStudyId, setSelectedStudyId }}>{children}</SessionContext.Provider></DataContext.Provider></AuthContext.Provider>;
};
export const useAuth = () => { const c = useContext(AuthContext); if (!c) throw new Error('useAuth must be used within an AppProvider'); return c; };
export const useData = () => { const c = useContext(DataContext); if (!c) throw new Error('useData must be used within an AppProvider'); return c; };
export const useSession = () => { const c = useContext(SessionContext); if (!c) throw new Error('useSession must be used within an AppProvider'); return c; };
