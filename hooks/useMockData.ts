import { useState } from 'react';
import { Evaluator, Study, MTE, Rating, PairwiseComparison, TLXDimension, IDataSource } from '../types';
import { DEFAULT_WEIGHTS } from '../constants';

export const INITIAL_EVALUATORS: Evaluator[] = [
  { id: 'eval1', name: 'John Glenn', email: 'john.g@nasa.gov' },
  { id: 'eval2', name: 'Sally Ride', email: 'sally.r@nasa.gov' },
  { id: 'eval3', name: 'Neil Armstrong', email: 'neil.a@nasa.gov' },
  { id: 'eval4', name: 'Mae Jemison', email: 'mae.j@nasa.gov' },
  { id: 'eval5', name: 'Chris Hadfield', email: 'chris.h@nasa.gov' },
];

export const INITIAL_MTES_CATALOG: MTE[] = [
    { id: 'mte1', name: 'EVA Simulation', description: 'Simulated extravehicular activity.', refNumber: '35182' },
    { id: 'mte2', name: 'Docking Maneuver', description: 'Manual docking procedure with space station.', refNumber: '72940' },
    { id: 'mte3', name: 'System Anomaly Response', description: 'Respond to a critical system failure alert.', refNumber: '58219' },
    { id: 'mte4', name: 'Robotic Arm Calibration', description: 'Calibrating the Canadarm2.', refNumber: '88371' },
    { id: 'mte5', name: 'Life Support Check', description: 'Routine check of life support systems.', refNumber: '41056' },
    { id: 'mte6', name: 'Lunar Sample Collection', description: 'Gathering geological samples from the lunar surface.', refNumber: '91773' },
    { id: 'mte7', name: 'Emergency Hatch Seal', description: 'Perform emergency sealing procedure on a compromised hatch.', refNumber: '62548' },
    { id: 'mte8', name: 'Long-Duration Habitat Check', description: 'Systems check for a long-duration lunar habitat module.', refNumber: '29981' },
];

export const INITIAL_STUDIES: Study[] = [
  {
    id: 'study1',
    name: 'Artemis II Mission Prep',
    description: 'Preparation tasks for the Artemis II lunar mission.',
    mteIds: ['mte1', 'mte2', 'mte3', 'mte7'],
  },
  {
    id: 'study2',
    name: 'ISS Maintenance Protocols',
    description: 'Evaluating new maintenance protocols aboard the ISS.',
    mteIds: ['mte4', 'mte5'],
  },
  {
    id: 'study3',
    name: 'Lunar Gateway Operations',
    description: 'Tasks related to the assembly and operation of the Lunar Gateway station.',
    mteIds: ['mte6', 'mte8'],
  }
];

export const INITIAL_RATINGS: Rating[] = [
  // Study 1: Artemis II
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
  { id: 'rating5', evaluatorId: 'eval3', studyId: 'study1', mteId: 'mte1', scores: {
    [TLXDimension.MENTAL_DEMAND]: 80,
    [TLXDimension.PHYSICAL_DEMAND]: 40,
    [TLXDimension.TEMPORAL_DEMAND]: 85,
    [TLXDimension.PERFORMANCE]: 10,
    [TLXDimension.EFFORT]: 70,
    [TLXDimension.FRUSTRATION]: 30,
  }, timestamp: Date.now() - 160000 },
  { id: 'rating6', evaluatorId: 'eval3', studyId: 'study1', mteId: 'mte3', scores: {
    [TLXDimension.MENTAL_DEMAND]: 90,
    [TLXDimension.PHYSICAL_DEMAND]: 20,
    [TLXDimension.TEMPORAL_DEMAND]: 95,
    [TLXDimension.PERFORMANCE]: 25,
    [TLXDimension.EFFORT]: 75,
    [TLXDimension.FRUSTRATION]: 60,
  }, timestamp: Date.now() - 150000 },
  
  // Study 2: ISS
  { id: 'rating4', evaluatorId: 'eval2', studyId: 'study2', mteId: 'mte4', scores: {
      [TLXDimension.MENTAL_DEMAND]: 20,
      [TLXDimension.PHYSICAL_DEMAND]: 80,
      [TLXDimension.TEMPORAL_DEMAND]: 15,
      [TLXDimension.PERFORMANCE]: 10,
      [TLXDimension.EFFORT]: 60,
      [TLXDimension.FRUSTRATION]: 5,
  }, timestamp: Date.now() - 170000 },
  { id: 'rating7', evaluatorId: 'eval4', studyId: 'study2', mteId: 'mte4', scores: {
    [TLXDimension.MENTAL_DEMAND]: 25,
    [TLXDimension.PHYSICAL_DEMAND]: 75,
    [TLXDimension.TEMPORAL_DEMAND]: 20,
    [TLXDimension.PERFORMANCE]: 5,
    [TLXDimension.EFFORT]: 65,
    [TLXDimension.FRUSTRATION]: 10,
  }, timestamp: Date.now() - 140000 },
  { id: 'rating8', evaluatorId: 'eval4', studyId: 'study2', mteId: 'mte5', scores: {
    [TLXDimension.MENTAL_DEMAND]: 10,
    [TLXDimension.PHYSICAL_DEMAND]: 30,
    [TLXDimension.TEMPORAL_DEMAND]: 5,
    [TLXDimension.PERFORMANCE]: 5,
    [TLXDimension.EFFORT]: 20,
    [TLXDimension.FRUSTRATION]: 0,
  }, timestamp: Date.now() - 130000 },
  
  // Study 3: Lunar Gateway
  { id: 'rating9', evaluatorId: 'eval5', studyId: 'study3', mteId: 'mte6', scores: {
    [TLXDimension.MENTAL_DEMAND]: 50,
    [TLXDimension.PHYSICAL_DEMAND]: 85,
    [TLXDimension.TEMPORAL_DEMAND]: 40,
    [TLXDimension.PERFORMANCE]: 15,
    [TLXDimension.EFFORT]: 75,
    [TLXDimension.FRUSTRATION]: 20,
  }, timestamp: Date.now() - 120000 },
  { id: 'rating10', evaluatorId: 'eval5', studyId: 'study3', mteId: 'mte8', scores: {
    [TLXDimension.MENTAL_DEMAND]: 35,
    [TLXDimension.PHYSICAL_DEMAND]: 40,
    [TLXDimension.TEMPORAL_DEMAND]: 25,
    [TLXDimension.PERFORMANCE]: 10,
    [TLXDimension.EFFORT]: 30,
    [TLXDimension.FRUSTRATION]: 10,
  }, timestamp: Date.now() - 110000 },
];

export const INITIAL_PAIRWISE_COMPARISONS: PairwiseComparison[] = [
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
  { evaluatorId: 'eval3', studyId: 'study1', weights: {
    [TLXDimension.MENTAL_DEMAND]: 4,
    [TLXDimension.PHYSICAL_DEMAND]: 0,
    [TLXDimension.TEMPORAL_DEMAND]: 5,
    [TLXDimension.PERFORMANCE]: 1,
    [TLXDimension.EFFORT]: 3,
    [TLXDimension.FRUSTRATION]: 2,
  }, isWeighted: true },
  { evaluatorId: 'eval4', studyId: 'study2', weights: {
    [TLXDimension.MENTAL_DEMAND]: 1,
    [TLXDimension.PHYSICAL_DEMAND]: 5,
    [TLXDimension.TEMPORAL_DEMAND]: 0,
    [TLXDimension.PERFORMANCE]: 2,
    [TLXDimension.EFFORT]: 4,
    [TLXDimension.FRUSTRATION]: 3,
  }, isWeighted: true },
  { evaluatorId: 'eval5', studyId: 'study3', weights: DEFAULT_WEIGHTS, isWeighted: false },
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