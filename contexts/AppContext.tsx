import React, { createContext, useContext, useState, ReactNode } from 'react';
import useMockData, { MockDataHook } from '../hooks/useMockData';

interface AuthContextType {
  isAuthenticated: boolean;
  login: () => void;
  logout: () => void;
}

interface SessionContextType {
  selectedEvaluatorId: string;
  setSelectedEvaluatorId: React.Dispatch<React.SetStateAction<string>>;
  selectedStudyId: string;
  setSelectedStudyId: React.Dispatch<React.SetStateAction<string>>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);
const DataContext = createContext<MockDataHook | undefined>(undefined);
const SessionContext = createContext<SessionContextType | undefined>(undefined);


export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const mockDataHook = useMockData();
  const [selectedEvaluatorId, setSelectedEvaluatorId] = useState('');
  const [selectedStudyId, setSelectedStudyId] = useState('');

  const login = () => setIsAuthenticated(true);
  const logout = () => {
    setIsAuthenticated(false);
    setSelectedEvaluatorId('');
    setSelectedStudyId('');
  };

  return (
    <AuthContext.Provider value={{ isAuthenticated, login, logout }}>
      <DataContext.Provider value={mockDataHook}>
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