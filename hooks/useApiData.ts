import { useState, useEffect } from 'react';
import { Evaluator, Study, MTE, Rating, PairwiseComparison, IDataSource } from '../types';

// The base URL for your backend API.
// When running locally, both frontend and backend might be on localhost.
// When deployed, this will be your Cloud Run service URL.
const API_BASE_URL = 'http://localhost:8080/api';


const useApiData = (): IDataSource => {
  const [evaluators, setEvaluators] = useState<Evaluator[]>([]);
  const [studies, setStudies] = useState<Study[]>([]);
  const [mtes, setMtes] = useState<MTE[]>([]);
  const [ratings, setRatings] = useState<Rating[]>([]);
  const [pairwiseComparisons, setPairwiseComparisons] = useState<PairwiseComparison[]>([]);

  // Fetch initial data when the hook is used
  useEffect(() => {
    // Fetch studies from the backend
    const fetchStudies = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/studies`);
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data: Study[] = await response.json();
        setStudies(data);
      } catch (error) {
        console.error("Failed to fetch studies:", error);
        // You might want to set an error state here to show in the UI
      }
    };

    fetchStudies();
    
    // In a real app, you would also fetch evaluators, MTEs, etc. here.
    // For now, we'll leave them empty.
    
  }, []); // The empty dependency array ensures this runs only once on mount

  // --- Placeholder Mutating Functions ---
  // These functions will need to be implemented to send POST, PUT, DELETE requests
  // to your backend API. For now, they are just placeholders.
  
  const addEvaluator = (evaluator: Omit<Evaluator, 'id'>) => console.log('addEvaluator not implemented for API');
  const updateEvaluator = (evaluator: Evaluator) => console.log('updateEvaluator not implemented for API');
  const deleteEvaluator = (id: string) => console.log('deleteEvaluator not implemented for API');

  const addStudy = (study: Omit<Study, 'id' | 'mteIds'>) => console.log('addStudy not implemented for API');
  const updateStudy = (study: Study) => console.log('updateStudy not implemented for API');
  const deleteStudy = (id: string) => console.log('deleteStudy not implemented for API');

  const addMte = (mte: Omit<MTE, 'id' | 'refNumber'> & { refNumber?: string }): MTE => {
    console.log('addMte not implemented for API');
    // Return a dummy object to satisfy the type, though it won't be functional
    return { ...mte, id: `mte${Date.now()}`, refNumber: mte.refNumber || ''};
  };
  const updateMte = (mte: MTE) => console.log('updateMte not implemented for API');
  const deleteMte = (id: string) => console.log('deleteMte not implemented for API');

  const addMTEToStudy = (studyId: string, mteId: string) => console.log('addMTEToStudy not implemented for API');
  const removeMTEFromStudy = (studyId: string, mteId: string) => console.log('removeMTEFromStudy not implemented for API');

  const addRating = (rating: Omit<Rating, 'id' | 'timestamp'>) => console.log('addRating not implemented for API');
  const addPairwiseComparison = (comparison: PairwiseComparison) => console.log('addPairwiseComparison not implemented for API');

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
