import { useState, useEffect } from 'react';
import { Evaluator, Study, MTE, Rating, PairwiseComparison, IDataSource } from '../types';
import {
  INITIAL_EVALUATORS,
  INITIAL_MTES_CATALOG,
  INITIAL_STUDIES,
  INITIAL_RATINGS,
  INITIAL_PAIRWISE_COMPARISONS
} from './useMockData';

// The base URL for your backend API.
// When running locally, both frontend and backend might be on localhost.
// When deployed, this will be your Cloud Run service URL.
const API_BASE_URL = 'http://localhost:8080/api';


const useApiData = (): IDataSource => {
  // For development, we'll start with mock data to make the UI functional
  // even without a fully implemented backend.
  const [evaluators, setEvaluators] = useState<Evaluator[]>(INITIAL_EVALUATORS);
  const [studies, setStudies] = useState<Study[]>(INITIAL_STUDIES);
  const [mtes, setMtes] = useState<MTE[]>(INITIAL_MTES_CATALOG);
  const [ratings, setRatings] = useState<Rating[]>(INITIAL_RATINGS);
  const [pairwiseComparisons, setPairwiseComparisons] = useState<PairwiseComparison[]>(INITIAL_PAIRWISE_COMPARISONS);

  // Fetch initial data when the hook is used
  useEffect(() => {
    // Attempt to fetch studies from the backend, overwriting the mock data if successful.
    const fetchStudies = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/studies`);
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data: Study[] = await response.json();
        setStudies(data);
        console.log('Successfully fetched studies from API.', data);
      } catch (error) {
        console.error("Failed to fetch studies from API, falling back to mock data:", error);
        // If fetch fails, we keep the initial mock data.
      }
    };

    fetchStudies();
    
    // TODO: In a real app, you would also fetch evaluators, MTEs, etc. here.
    
  }, []);

  // --- Placeholder Mutating Functions (local state manipulation) ---
  // These functions make the UI interactive. They should be replaced with API calls
  // to POST, PUT, DELETE data from your backend.
  
  const addEvaluator = (evaluator: Omit<Evaluator, 'id'>) => {
    // TODO: Replace with: POST /api/evaluators
    setEvaluators(prev => [...prev, { ...evaluator, id: `eval${Date.now()}` }]);
  };
  
  const updateEvaluator = (updatedEvaluator: Evaluator) => {
    // TODO: Replace with: PUT /api/evaluators/:id
    setEvaluators(prev => prev.map(e => e.id === updatedEvaluator.id ? updatedEvaluator : e));
  };
  
  const deleteEvaluator = (id: string) => {
    // TODO: Replace with: DELETE /api/evaluators/:id
    setEvaluators(prev => prev.filter(e => e.id !== id));
  };

  const addStudy = (study: Omit<Study, 'id' | 'mteIds'>) => {
    // TODO: Replace with: POST /api/studies
    setStudies(prev => [...prev, { ...study, id: `study${Date.now()}`, mteIds: [] }]);
  };
  
  const updateStudy = (updatedStudy: Study) => {
    // TODO: Replace with: PUT /api/studies/:id
    setStudies(prev => prev.map(s => s.id === updatedStudy.id ? updatedStudy : s));
  };

  const deleteStudy = (id: string) => {
    // TODO: Replace with: DELETE /api/studies/:id
    setStudies(prev => prev.filter(s => s.id !== id));
  };

  const addMte = (mte: Omit<MTE, 'id' | 'refNumber'> & { refNumber?: string }): MTE => {
    // TODO: Replace with: POST /api/mtes
    const newMte = {
      ...mte,
      id: `mte${Date.now()}`,
      refNumber: mte.refNumber || '',
    };
    setMtes(prev => [...prev, newMte]);
    return newMte;
  };

  const updateMte = (updatedMte: MTE) => {
    // TODO: Replace with: PUT /api/mtes/:id
    setMtes(prev => prev.map(m => m.id === updatedMte.id ? updatedMte : m));
  };

  const deleteMte = (id: string) => {
    // TODO: Replace with: DELETE /api/mtes/:id
    setMtes(prev => prev.filter(m => m.id !== id));
    setStudies(prevStudies => prevStudies.map(study => ({
      ...study,
      mteIds: study.mteIds.filter(mteId => mteId !== id)
    })));
  };

  const addMTEToStudy = (studyId: string, mteId: string) => {
    // TODO: Replace with: POST /api/studies/:studyId/mtes
    setStudies(prev => prev.map(s => {
      if (s.id === studyId && !s.mteIds.includes(mteId)) {
        return { ...s, mteIds: [...s.mteIds, mteId] };
      }
      return s;
    }));
  };
  
  const removeMTEFromStudy = (studyId: string, mteId: string) => {
    // TODO: Replace with: DELETE /api/studies/:studyId/mtes/:mteId
    setStudies(prev => prev.map(s => {
      if (s.id === studyId) {
        return { ...s, mteIds: s.mteIds.filter(mId => mId !== mteId) };
      }
      return s;
    }));
  };

  const addRating = (rating: Omit<Rating, 'id' | 'timestamp'>) => {
    // TODO: Replace with: POST /api/ratings
    setRatings(prev => [...prev, { ...rating, id: `rating${Date.now()}`, timestamp: Date.now() }]);
  };
  
  const addPairwiseComparison = (comparison: PairwiseComparison) => {
    // TODO: Replace with: POST /api/comparisons
    setPairwiseComparisons(prev => {
        const existing = prev.find(pc => pc.evaluatorId === comparison.evaluatorId && pc.studyId === comparison.studyId);
        if (existing) {
            return prev.map(pc => pc.evaluatorId === comparison.evaluatorId && pc.studyId === comparison.studyId ? comparison : pc);
        }
        return [...prev, comparison];
    });
  };

  const hasPreviousRatingInStudy = (evaluatorId: string, studyId: string): boolean => {
    // This logic will also need to be moved to the backend
    return ratings.some(r => r.evaluatorId === evaluatorId && r.studyId === studyId);
  };
  
  return { 
    evaluators, studies, mtes, ratings, pairwiseComparisons,
    addEvaluator, updateEvaluator, deleteEvaluator,
    addStudy, updateStudy, deleteStudy, addMte, updateMte, deleteMte, addMTEToStudy, removeMTEFromStudy,
    addRating, addPairwiseComparison, hasPreviousRatingInStudy
  };
};

export default useApiData;
