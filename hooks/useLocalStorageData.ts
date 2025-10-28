import { useState, useEffect } from 'react';
import { Evaluator, Study, MTE, Rating, PairwiseComparison, TLXDimension, IDataSource } from '../types';

function useLocalStorage<T>(key: string, initialValue: T): [T, React.Dispatch<React.SetStateAction<T>>] {
    const [storedValue, setStoredValue] = useState<T>(() => {
        try {
            const item = window.localStorage.getItem(key);
            return item ? JSON.parse(item) : initialValue;
        } catch (error) {
            console.error(`Error reading localStorage key “${key}”:`, error);
            return initialValue;
        }
    });

    const setValue: React.Dispatch<React.SetStateAction<T>> = (value) => {
        try {
            const valueToStore = value instanceof Function ? value(storedValue) : value;
            setStoredValue(valueToStore);
            window.localStorage.setItem(key, JSON.stringify(valueToStore));
        } catch (error) {
            console.error(`Error setting localStorage key “${key}”:`, error);
        }
    };
    return [storedValue, setValue];
}


const useLocalStorageData = (): IDataSource => {
  const [evaluators, setEvaluators] = useLocalStorage<Evaluator[]>('catlx_evaluators', []);
  const [studies, setStudies] = useLocalStorage<Study[]>('catlx_studies', []);
  const [mtes, setMtes] = useLocalStorage<MTE[]>('catlx_mtes', []);
  const [ratings, setRatings] = useLocalStorage<Rating[]>('catlx_ratings', []);
  const [pairwiseComparisons, setPairwiseComparisons] = useLocalStorage<PairwiseComparison[]>('catlx_pairwise_comparisons', []);
  
  const addEvaluator = (evaluator: Omit<Evaluator, 'id'>) => {
    setEvaluators(prev => [...prev, { ...evaluator, id: `eval${Date.now()}` }]);
  };
  
  const updateEvaluator = (updatedEvaluator: Evaluator) => {
    setEvaluators(prev => prev.map(e => e.id === updatedEvaluator.id ? updatedEvaluator : e));
  };
  
  const deleteEvaluator = (id: string) => {
    setEvaluators(prev => prev.filter(e => e.id !== id));
  };

  const addStudy = (study: Omit<Study, 'id' | 'mteIds'>) => {
    setStudies(prev => [...prev, { ...study, id: `study${Date.now()}`, mteIds: [] }]);
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

  const addRating = (rating: Omit<Rating, 'id' | 'timestamp'>) => {
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
    evaluators, studies, mtes, ratings, pairwiseComparisons,
    addEvaluator, updateEvaluator, deleteEvaluator,
    addStudy, updateStudy, deleteStudy, addMte, updateMte, deleteMte, addMTEToStudy, removeMTEFromStudy,
    addRating, addPairwiseComparison, hasPreviousRatingInStudy
  };
};

export default useLocalStorageData;
