import { useState, useEffect } from 'react';
import { Evaluator, Study, MTE, Rating, PairwiseComparison, IDataSource, TLXDimension, Project } from '../types';
import {
  INITIAL_EVALUATORS,
  INITIAL_PROJECTS,
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
  const [projects, setProjects] = useState<Project[]>(INITIAL_PROJECTS);
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
// FIX: Added curly braces to the catch block to fix a syntax error and subsequent scope issues.
      } catch (error) {
        console.error("Failed to fetch studies from API, falling back to mock data:", error);
        // If fetch fails, we keep the initial mock data.
      }
    };

    fetchStudies();
    
    // TODO: In a real app, you would also fetch projects, evaluators, MTEs, etc. here.
    
  }, []);

  // --- Placeholder Mutating Functions (local state manipulation) ---
  // These functions make the UI interactive. They should be replaced with API calls
  // to POST, PUT, DELETE data from your backend.
  
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

  const addRating = (rating: Omit<Rating, 'id' | 'timestamp'>): Promise<void> => {
    return new Promise((resolve, reject) => {
        console.log("Simulating API call to submit rating:", rating);

        // Simulate network delay
        setTimeout(() => {
            // Simulate a server error for testing purposes if Frustration is high
            if (rating.scores[TLXDimension.FRUSTRATION] > 90) {
                console.error("Simulated API Error: High frustration detected.");
                reject(new Error("Server is too frustrated to process this rating."));
                return;
            }

            // Simulate a generic network failure
            if (Math.random() < 0.1) { // 10% chance of failure
                console.error("Simulated API Error: Network connection failed.");
                reject(new Error("Could not connect to the server."));
                return;
            }

            // On success:
            console.log("Simulated API call successful.");
            const newRatingWithId: Rating = {
                ...rating,
                id: `rating${Date.now()}`,
                timestamp: Date.now(),
            };
            setRatings(prev => [...prev, newRatingWithId]);
            resolve();

        }, 1000); // 1 second delay
    });
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
  
// FIX: Added missing return statement to make the hook conform to the IDataSource interface.
  return { 
    projects, evaluators, studies, mtes, ratings, pairwiseComparisons,
    addProject, updateProject, deleteProject, addMemberToProject, removeMemberFromProject,
    addEvaluator, updateEvaluator, deleteEvaluator,
    addStudy, updateStudy, deleteStudy, addMte, updateMte, deleteMte, 
    addMTEToStudy, removeMTEFromStudy, addEvaluatorToStudy, removeEvaluatorFromStudy,
    addRating, addPairwiseComparison, hasPreviousRatingInStudy
  };
};

export default useApiData;