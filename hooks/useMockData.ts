
import { useState } from 'react';
import { Evaluator, Study, MTE, Rating, PairwiseComparison, TLXDimension } from '../types';

const INITIAL_EVALUATORS: Evaluator[] = [
  { id: 'eval1', name: 'John Glenn', email: 'john.g@nasa.gov' },
  { id: 'eval2', name: 'Sally Ride', email: 'sally.r@nasa.gov' },
];

const INITIAL_MTES: MTE[] = [
    { id: 'mte1', name: 'EVA Simulation', description: 'Simulated extravehicular activity.', refNumber: '35182' },
    { id: 'mte2', name: 'Docking Maneuver', description: 'Manual docking procedure with space station.', refNumber: '72940' },
    { id: 'mte3', name: 'System Anomaly Response', description: 'Respond to a critical system failure alert.', refNumber: '58219' },
];

const INITIAL_STUDIES: Study[] = [
  {
    id: 'study1',
    name: 'Artemis II Mission Prep',
    description: 'Preparation tasks for the Artemis II lunar mission.',
    mtes: INITIAL_MTES,
  },
  {
    id: 'study2',
    name: 'ISS Maintenance Protocols',
    description: 'Evaluating new maintenance protocols aboard the ISS.',
    mtes: [
        { id: 'mte4', name: 'Robotic Arm Calibration', description: 'Calibrating the Canadarm2.', refNumber: '88371' },
        { id: 'mte5', name: 'Life Support Check', description: 'Routine check of life support systems.', refNumber: '41056' },
    ],
  },
];

export interface MockDataHook {
  evaluators: Evaluator[];
  studies: Study[];
  ratings: Rating[];
  pairwiseComparisons: PairwiseComparison[];
  addEvaluator: (evaluator: Omit<Evaluator, 'id'>) => void;
  updateEvaluator: (evaluator: Evaluator) => void;
  deleteEvaluator: (id: string) => void;
  addStudy: (study: Omit<Study, 'id' | 'mtes'>) => void;
  updateStudy: (study: Study) => void;
  deleteStudy: (id: string) => void;
  addMTEToStudy: (studyId: string, mte: Omit<MTE, 'id' | 'refNumber'>) => void;
  removeMTEFromStudy: (studyId: string, mteId: string) => void;
  addRating: (rating: Omit<Rating, 'id' | 'timestamp'>) => void;
  addPairwiseComparison: (comparison: PairwiseComparison) => void;
  hasPreviousRatingInStudy: (evaluatorId: string, studyId: string) => boolean;
}

const useMockData = (): MockDataHook => {
  const [evaluators, setEvaluators] = useState<Evaluator[]>(INITIAL_EVALUATORS);
  const [studies, setStudies] = useState<Study[]>(INITIAL_STUDIES);
  const [ratings, setRatings] = useState<Rating[]>([]);
  const [pairwiseComparisons, setPairwiseComparisons] = useState<PairwiseComparison[]>([]);
  
  const addEvaluator = (evaluator: Omit<Evaluator, 'id'>) => {
    setEvaluators(prev => [...prev, { ...evaluator, id: `eval${Date.now()}` }]);
  };
  
  const updateEvaluator = (updatedEvaluator: Evaluator) => {
    setEvaluators(prev => prev.map(e => e.id === updatedEvaluator.id ? updatedEvaluator : e));
  };
  
  const deleteEvaluator = (id: string) => {
    setEvaluators(prev => prev.filter(e => e.id !== id));
  };

  const addStudy = (study: Omit<Study, 'id' | 'mtes'>) => {
    setStudies(prev => [...prev, { ...study, id: `study${Date.now()}`, mtes: [] }]);
  };
  
  const updateStudy = (updatedStudy: Study) => {
     setStudies(prev => prev.map(s => s.id === updatedStudy.id ? updatedStudy : s));
  };

  const deleteStudy = (id: string) => {
    setStudies(prev => prev.filter(s => s.id !== id));
  };

  const addMTEToStudy = (studyId: string, mte: Omit<MTE, 'id' | 'refNumber'>) => {
    setStudies(prev => prev.map(s => {
      if (s.id === studyId) {
        return { ...s, mtes: [...s.mtes, { ...mte, id: `mte${Date.now()}`, refNumber: Math.floor(10000 + Math.random() * 90000).toString() }] };
      }
      return s;
    }));
  };
  
  const removeMTEFromStudy = (studyId: string, mteId: string) => {
      setStudies(prev => prev.map(s => {
      if (s.id === studyId) {
        return { ...s, mtes: s.mtes.filter(m => m.id !== mteId) };
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
    evaluators, studies, ratings, pairwiseComparisons,
    addEvaluator, updateEvaluator, deleteEvaluator,
    addStudy, updateStudy, deleteStudy, addMTEToStudy, removeMTEFromStudy,
    addRating, addPairwiseComparison, hasPreviousRatingInStudy
  };
};

export default useMockData;