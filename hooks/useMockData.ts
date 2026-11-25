import { createDataSource } from '../data/workspace';
import { useState } from 'react';
import { Evaluator, Study, MTE, Rating, PairwiseComparison, TLXDimension, IDataSource, Project, WorkspaceData } from '../types';
import { DEFAULT_WEIGHTS } from '../constants';

export const INITIAL_EVALUATORS: Evaluator[] = [
  { id: 'eval1', name: 'John Glenn', quality: 'Commander', company: 'NASA' },
  { id: 'eval2', name: 'Sally Ride', quality: 'Mission Specialist', company: 'NASA' },
  { id: 'eval3', name: 'Neil Armstrong', quality: 'Commander', company: 'NASA' },
  { id: 'eval4', name: 'Mae Jemison', quality: 'Science Mission Specialist', company: 'NASA' },
  { id: 'eval5', name: 'Chris Hadfield', quality: 'Commander', company: 'CSA' },
];

export const INITIAL_PROJECTS: Project[] = [
  {
    id: 'proj1',
    name: 'Artemis Program',
    description: 'All studies related to the Artemis missions to the Moon.',
    ownerId: 'eval3',
    memberIds: ['eval1', 'eval2', 'eval3', 'eval5'],
  },
  {
    id: 'proj2',
    name: 'ISS Operations & Maintenance',
    description: 'Studies focusing on International Space Station long-duration mission tasks.',
    ownerId: 'eval2',
    memberIds: ['eval2', 'eval4', 'eval5'],
  },
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
    date: new Date('2024-08-15T09:00:00').getTime(),
    mteIds: ['mte1', 'mte2', 'mte3', 'mte7'],
    evaluatorIds: ['eval1', 'eval2', 'eval3'],
    projectId: 'proj1',
  },
  {
    id: 'study2',
    name: 'ISS Maintenance Protocols',
    description: 'Evaluating new maintenance protocols aboard the ISS.',
    date: new Date('2024-09-01T14:30:00').getTime(),
    mteIds: ['mte4', 'mte5'],
    evaluatorIds: ['eval2', 'eval4', 'eval5'],
    projectId: 'proj2',
  },
  {
    id: 'study3',
    name: 'Lunar Gateway Operations',
    description: 'Tasks related to the assembly and operation of the Lunar Gateway station.',
    date: new Date('2024-07-20T11:00:00').getTime(),
    mteIds: ['mte6', 'mte8'],
    evaluatorIds: ['eval1', 'eval5'],
    projectId: 'proj1',
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
  }, timestamp: Date.now() - 200000, comments: 'The time pressure was the most difficult aspect of this simulation. Controls felt a bit sluggish.' },
  { id: 'rating2', evaluatorId: 'eval1', studyId: 'study1', mteId: 'mte2', scores: {
    [TLXDimension.MENTAL_DEMAND]: 85,
    [TLXDimension.PHYSICAL_DEMAND]: 70,
    [TLXDimension.TEMPORAL_DEMAND]: 60,
    [TLXDimension.PERFORMANCE]: 15,
    [TLXDimension.EFFORT]: 80,
    [TLXDimension.FRUSTRATION]: 50,
  }, timestamp: Date.now() - 190000, comments: 'High physical and mental effort required for precision.' },
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
  }, timestamp: Date.now() - 150000, comments: 'Extremely stressful scenario. The alarm sounds were distracting.' },
  
  // Study 2: ISS
  { id: 'rating4', evaluatorId: 'eval2', studyId: 'study2', mteId: 'mte4', scores: {
      [TLXDimension.MENTAL_DEMAND]: 20,
      [TLXDimension.PHYSICAL_DEMAND]: 80,
      [TLXDimension.TEMPORAL_DEMAND]: 15,
      [TLXDimension.PERFORMANCE]: 10,
      [TLXDimension.EFFORT]: 60,
      [TLXDimension.FRUSTRATION]: 5,
  }, timestamp: Date.now() - 170000, comments: 'Very physically demanding, but straightforward mentally.' },
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


const initialData: WorkspaceData = {
  projects: INITIAL_PROJECTS,
  evaluators: INITIAL_EVALUATORS,
  studies: INITIAL_STUDIES,
  mtes: INITIAL_MTES_CATALOG,
  ratings: INITIAL_RATINGS,
  pairwiseComparisons: INITIAL_PAIRWISE_COMPARISONS,
};

const useMockData = (seed = initialData): IDataSource => {
  const [data, setData] = useState(seed);

  return createDataSource(data, change => setData(previous => change(previous)));
};

export default useMockData;
