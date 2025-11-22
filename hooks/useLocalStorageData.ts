import { useState, Dispatch, SetStateAction, useEffect } from 'react';
import { Evaluator, Study, MTE, Rating, PairwiseComparison, TLXDimension, IDataSource, Project } from '../types';

function useLocalStorage<T>(key: string, initialValue: T): [T, Dispatch<SetStateAction<T>>] {
  const [storedValue, setStoredValue] = useState<T>(() => {
    try {
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch (error) {
      console.error(`Error reading localStorage key “${key}”:`, error);
      return initialValue;
    }
  });

  const setValue: Dispatch<SetStateAction<T>> = (value) => {
    try {
      const valueToStore = value instanceof Function ? value(storedValue) : value;
      setStoredValue(valueToStore);
      window.localStorage.setItem(key, JSON.stringify(valueToStore));
    } catch (error) {
      console.error(`Error setting localStorage key “${key}”:`, error);
      throw new Error('Failed to save to local storage. Device storage might be full.');
    }
  };
  return [storedValue, setValue];
}


const useLocalStorageData = (): IDataSource => {
  const [projects, setProjects] = useLocalStorage<Project[]>('catlx_projects', []);
  const [evaluators, setEvaluators] = useLocalStorage<Evaluator[]>('catlx_evaluators', []);
  const [studies, setStudies] = useLocalStorage<Study[]>('catlx_studies', []);
  const [mtes, setMtes] = useLocalStorage<MTE[]>('catlx_mtes', []);
  const [ratings, setRatings] = useLocalStorage<Rating[]>('catlx_ratings', []);
  const [pairwiseComparisons, setPairwiseComparisons] = useLocalStorage<PairwiseComparison[]>('catlx_pairwise_comparisons', []);

  useEffect(() => {
    if (projects.length === 0) {
      const defaultProject: Project = {
        id: `proj${Date.now()}`,
        name: 'Default Project',
        description: 'Automatically created default project',
        ownerId: 'local-admin',
        memberIds: ['local-admin']
      };
      setProjects([defaultProject]);
    }
  }, []);

  const addProject = (project: Omit<Project, 'id' | 'ownerId' | 'memberIds'>, ownerId: string) => {
    const newProject: Project = {
      ...project,
      id: `proj${Date.now()}`,
      ownerId: ownerId,
      memberIds: [ownerId]
    };
    setProjects(prev => [...prev, newProject]);
  };

  const updateProject = (updatedProject: Project) => {
    setProjects(prev => prev.map(p => p.id === updatedProject.id ? updatedProject : p));
  };

  const deleteProject = (id: string) => {
    setProjects(prev => prev.filter(p => p.id !== id));
    setStudies(prev => prev.filter(s => s.projectId !== id));
  };

  const addMemberToProject = (projectId: string, evaluatorId: string) => {
    setProjects(prev => prev.map(p => {
      if (p.id === projectId && !p.memberIds.includes(evaluatorId)) {
        return { ...p, memberIds: [...p.memberIds, evaluatorId] };
      }
      return p;
    }));
  };

  const removeMemberFromProject = (projectId: string, evaluatorId: string) => {
    setProjects(prev => prev.map(p => {
      if (p.id === projectId) {
        return { ...p, memberIds: p.memberIds.filter(id => id !== evaluatorId) };
      }
      return p;
    }));
  };

  const addEvaluator = (evaluator: Omit<Evaluator, 'id'>): Evaluator => {
    const newEvaluator = { ...evaluator, id: `eval${Date.now()}` };
    setEvaluators(prev => [...prev, newEvaluator]);
    return newEvaluator;
  };

  const updateEvaluator = (updatedEvaluator: Evaluator) => {
    setEvaluators(prev => prev.map(e => e.id === updatedEvaluator.id ? updatedEvaluator : e));
  };

  const deleteEvaluator = (id: string) => {
    setEvaluators(prev => prev.filter(e => e.id !== id));
    // Also remove from any project memberships
    setProjects(prevProjects => prevProjects.map(p => ({
      ...p,
      memberIds: p.memberIds.filter(memberId => memberId !== id)
    })));
    // Also remove from any study assignments
    setStudies(prevStudies => prevStudies.map(s => ({
      ...s,
      evaluatorIds: s.evaluatorIds.filter(evaluatorId => evaluatorId !== id)
    })));
  };

  const addStudy = (study: Omit<Study, 'id' | 'mteIds' | 'evaluatorIds'>) => {
    setStudies(prev => [...prev, { ...study, id: `study${Date.now()}`, mteIds: [], evaluatorIds: [] }]);
  };

  const updateStudy = (updatedStudy: Study) => {
    setStudies(prev => prev.map(s => s.id === updatedStudy.id ? updatedStudy : s));
  };

  const deleteStudy = (id: string) => {
    setStudies(prev => prev.filter(s => s.id !== id));
  };

  const addMte = (mte: Omit<MTE, 'id' | 'refNumber'> & { refNumber?: string }): MTE => {
    const newMte = {
      ...mte,
      id: `mte${Date.now()}`,
      refNumber: mte.refNumber || '',
    };
    setMtes(prev => [...prev, newMte]);
    return newMte;
  };

  const updateMte = (updatedMte: MTE) => {
    setMtes(prev => prev.map(m => m.id === updatedMte.id ? updatedMte : m));
  };

  const deleteMte = (id: string) => {
    setMtes(prev => prev.filter(m => m.id !== id));
    setStudies(prevStudies => prevStudies.map(study => ({
      ...study,
      mteIds: study.mteIds.filter(mteId => mteId !== id)
    })));
  };

  const addMTEToStudy = (studyId: string, mteId: string) => {
    setStudies(prev => prev.map(s => {
      if (s.id === studyId && !s.mteIds.includes(mteId)) {
        return { ...s, mteIds: [...s.mteIds, mteId] };
      }
      return s;
    }));
  };

  const removeMTEFromStudy = (studyId: string, mteId: string) => {
    setStudies(prev => prev.map(s => {
      if (s.id === studyId) {
        return { ...s, mteIds: s.mteIds.filter(mId => mId !== mteId) };
      }
      return s;
    }));
  };

  const addEvaluatorToStudy = (studyId: string, evaluatorId: string) => {
    setStudies(prev => prev.map(s => {
      if (s.id === studyId && !s.evaluatorIds.includes(evaluatorId)) {
        return { ...s, evaluatorIds: [...s.evaluatorIds, evaluatorId] };
      }
      return s;
    }));
  };

  const removeEvaluatorFromStudy = (studyId: string, evaluatorId: string) => {
    setStudies(prev => prev.map(s => {
      if (s.id === studyId) {
        return { ...s, evaluatorIds: s.evaluatorIds.filter(eId => eId !== evaluatorId) };
      }
      return s;
    }));
  };

  const addRating = async (rating: Omit<Rating, 'id' | 'timestamp'>): Promise<void> => {
    setRatings(prev => [...prev, { ...rating, id: `rating${Date.now()}`, timestamp: Date.now() }]);
  };

  const addPairwiseComparison = (comparison: PairwiseComparison) => {
    setPairwiseComparisons(prev => {
      const existing = prev.find(pc => pc.evaluatorId === comparison.evaluatorId && pc.studyId === comparison.studyId);
      if (existing) {
        return prev.map(pc => pc.evaluatorId === comparison.evaluatorId && pc.studyId === comparison.studyId ? comparison : pc);
      }
      return [...prev, comparison];
    });
  };

  const hasPreviousRatingInStudy = (evaluatorId: string, studyId: string): boolean => {
    return ratings.some(r => r.evaluatorId === evaluatorId && r.studyId === studyId);
  };

  return {
    projects, evaluators, studies, mtes, ratings, pairwiseComparisons,
    addProject, updateProject, deleteProject, addMemberToProject, removeMemberFromProject,
    addEvaluator, updateEvaluator, deleteEvaluator,
    addStudy, updateStudy, deleteStudy, addMte, updateMte, deleteMte,
    addMTEToStudy, removeMTEFromStudy, addEvaluatorToStudy, removeEvaluatorFromStudy,
    addRating, addPairwiseComparison, hasPreviousRatingInStudy
  };
};

export default useLocalStorageData;