
import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import useMockData from '../hooks/useMockData';
import useLocalStorageData from '../hooks/useLocalStorageData';
import useApiData from '../hooks/useApiData';
import { IDataSource } from '../types';


interface AuthContextType {
  isLoggedIn: boolean;
  mode: 'demo' | 'local' | 'api';
  login: (mode: 'demo' | 'local' | 'api') => void;
  logout: () => void;
}

interface SessionContextType {
  selectedEvaluatorId: string;
  setSelectedEvaluatorId: React.Dispatch<React.SetStateAction<string>>;
  selectedStudyId: string;
  setSelectedStudyId: React.Dispatch<React.SetStateAction<string>>;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);
export const DataContext = createContext<IDataSource | undefined>(undefined);
export const SessionContext = createContext<SessionContextType | undefined>(undefined);


export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [mode, setMode] = useState<'demo' | 'local' | 'api'>('demo');
  
  const mockDataHook = useMockData();
  const localStorageDataHook = useLocalStorageData();
  const apiDataHook = useApiData();

  let dataHook: IDataSource;
  switch (mode) {
    case 'api':
      dataHook = apiDataHook;
      break;
    case 'local':
      dataHook = localStorageDataHook;
      break;
    case 'demo':
    default:
      dataHook = mockDataHook;
      break;
  }

  const [selectedEvaluatorId, setSelectedEvaluatorId] = useState('');
  const [selectedStudyId, setSelectedStudyId] = useState('');

  const login = (loginMode: 'demo' | 'local' | 'api') => {
      setMode(loginMode);
      setIsLoggedIn(true);
  };

  const logout = () => {
    setIsLoggedIn(false);
    setSelectedEvaluatorId('');
    setSelectedStudyId('');
  };
  
  useEffect(() => {
    setSelectedEvaluatorId('');
    setSelectedStudyId('');
  }, [isLoggedIn]);

  return (
    <AuthContext.Provider value={{ isLoggedIn, mode, login, logout }}>
      <DataContext.Provider value={dataHook}>
        <SessionContext.Provider value={{ selectedEvaluatorId, setSelectedEvaluatorId, selectedStudyId, setSelectedStudyId }}>
          {children}
        </SessionContext.Provider>
      </DataContext.Provider>
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AppProvider');
  }
  return context;
};

export const useData = () => {
  const context = useContext(DataContext);
  if (context === undefined) {
    throw new Error('useData must be used within an AppProvider');
  }
  return context;
};

export const useSession = () => {
  const context = useContext(SessionContext);
  if (context === undefined) {
    throw new Error('useSession must be used within an AppProvider');
  }
  return context;
};
