import { useState } from 'react';
import { Evaluator, Study, MTE, Rating, PairwiseComparison, TLXDimension, IDataSource } from '../types';
import { DEFAULT_WEIGHTS } from '../constants';

const INITIAL_EVALUATORS: Evaluator[] = [
  { id: 'eval1', name: 'John Glenn', email: 'john.g@nasa.gov' },
  { id: 'eval2', name: 'Sally Ride', email: 'sally.r@nasa.gov' },
];

const INITIAL_MTES_CATALOG: MTE[] = [
    { id: 'mte1', name: 'EVA Simulation', description: 'Simulated extravehicular activity.', refNumber: '35182' },
    { id: 'mte2', name: 'Docking Maneuver', description: 'Manual docking procedure with space station.', refNumber: '72940' },
    { id: 'mte3', name: 'System Anomaly Response', description: 'Respond to a critical system failure alert.', refNumber: '58219' },
    { id: 'mte4', name: 'Robotic Arm Calibration', description: 'Calibrating the Canadarm2.', refNumber: '88371' },
    { id: 'mte5', name: 'Life Support Check', description: 'Routine check of life support systems.', refNumber: '41056' },
];

const INITIAL_STUDIES: Study[] = [
  {
    id: 'study1',
    name: 'Artemis II Mission Prep',
    description: 'Preparation tasks for the Artemis II lunar mission.',
    mteIds: ['mte1', 'mte2', 'mte3'],
  },
  {
    id: 'study2',
    name: 'ISS Maintenance Protocols',
    description: 'Evaluating new maintenance protocols aboard the ISS.',
    mteIds: ['mte4', 'mte5'],
  },
];

const INITIAL_RATINGS: Rating[] = [
  { id: 'rating1', evaluatorId: 'eval1', studyId: 'study1', mteId: 'mte1', scores: {
    [TLXDimension.MENTAL_DEMAND]: 75,
    [TLXDimension.PHYSICAL_DEMAND]: 30,
    [TLXDimension.TEMPORAL_DEMAND]: 80,
    [TLXDimension.PERFORMANCE]: 20,
    [TLXDimension.EFFORT]: 65,
    [TLXDimension.FRUSTRATION]: 40,
  }, timestamp: Date.now() - 200000 },
  { id: 'rating2', evaluatorId: 'eval1', studyId: 'study1', mteId: 'mte2', scores: {
    [TLXDimension.MENTAL_DEMAND]: 85,
    [TLXDimension.PHYSICAL_DEMAND]: 70,
    [TLXDimension.TEMPORAL_DEMAND]: 60,
    [TLXDimension.PERFORMANCE]: 15,
    [TLXDimension.EFFORT]: 80,
    [TLXDimension.FRUSTRATION]: 50,
  }, timestamp: Date.now() - 190000 },
  { id: 'rating3', evaluatorId: 'eval2', studyId: 'study1', mteId: 'mte1', scores: {
    [TLXDimension.MENTAL_DEMAND]: 60,
    [TLXDimension.PHYSICAL_DEMAND]: 25,
    [TLXDimension.TEMPORAL_DEMAND]: 70,
    [TLXDimension.PERFORMANCE]: 30,
    [TLXDimension.EFFORT]: 55,
    [TLXDimension.FRUSTRATION]: 20,
  }, timestamp: Date.now() - 180000 },
  { id: 'rating4', evaluatorId: 'eval2', studyId: 'study2', mteId: 'mte4', scores: {
      [TLXDimension.MENTAL_DEMAND]: 20,
      [TLXDimension.PHYSICAL_DEMAND]: 80,
      [TLXDimension.TEMPORAL_DEMAND]: 15,
      [TLXDimension.PERFORMANCE]: 10,
      [TLXDimension.EFFORT]: 60,
      [TLXDimension.FRUSTRATION]: 5,
  }, timestamp: Date.now() - 170000 },
];

const INITIAL_PAIRWISE_COMPARISONS: PairwiseComparison[] = [
  { evaluatorId: 'eval1', studyId: 'study1', weights: {
    [TLXDimension.MENTAL_DEMAND]: 5,
    [TLXDimension.PHYSICAL_DEMAND]: 1,
    [TLXDimension.TEMPORAL_DEMAND]: 3,
    [TLXDimension.PERFORMANCE]: 2,
    [TLXDimension.EFFORT]: 4,
    [TLXDimension.FRUSTRATION]: 0,
  }, isWeighted: true },
  { evaluatorId: 'eval2', studyId: 'study1', weights: {
    [TLXDimension.MENTAL_DEMAND]: 2,
    [TLXDimension.PHYSICAL_DEMAND]: 0,
    [TLXDimension.TEMPORAL_DEMAND]: 5,
    [TLXDimension.PERFORMANCE]: 3,
    [TLXDimension.EFFORT]: 3,
    [TLXDimension.FRUSTRATION]: 2,
  }, isWeighted: true },
  { evaluatorId: 'eval2', studyId: 'study2', weights: DEFAULT_WEIGHTS, isWeighted: false },
];


const useMockData = (): IDataSource => {
  const [evaluators, setEvaluators] = useState<Evaluator[]>(INITIAL_EVALUATORS);
  const [studies, setStudies] = useState<Study[]>(INITIAL_STUDIES);
  const [mtes, setMtes] = useState<MTE[]>(INITIAL_MTES_CATALOG);
  const [ratings, setRatings] = useState<Rating[]>(INITIAL_RATINGS);
  const [pairwiseComparisons, setPairwiseComparisons] = useState<PairwiseComparison[]>(INITIAL_PAIRWISE_COMPARISONS);
  
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

export default useMockData;