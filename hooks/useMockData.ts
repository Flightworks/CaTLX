import { useState } from 'react';
import { IDataSource, Evaluator, Study, MTE, Rating, PairwiseComparison, TLXDimension, Project } from '../types';

// --- Mock Data ---
const INITIAL_EVALUATORS: Evaluator[] = [
  { id: 'eval1', name: 'John Glenn', email: 'j.glenn@nasa.gov', projectId: 'default_demo_project' },
  { id: 'eval2', name: 'Sally Ride', email: 's.ride@nasa.gov', projectId: 'default_demo_project' },
];

const INITIAL_MTES_CATALOG: MTE[] = [
  { id: 'mte1', name: 'Spacesuit Donning', description: 'Procedure for putting on the extravehicular mobility unit.', refNumber: 'NASA-PROC-001' },
  { id: 'mte2', name: 'Manual Piloting', description: 'Manual control of the spacecraft during docking.', refNumber: 'NASA-PROC-002' },
  { id: 'mte3', name: 'Emergency Shutdown', description: 'Procedure for emergency reactor shutdown.', refNumber: 'NASA-PROC-003' },
  { id: 'mte4', name: 'Sample Collection', description: 'Using the robotic arm to collect geological samples.', refNumber: 'NASA-PROC-004' },
  { id: 'mte5', name: 'System Reboot', description: 'Procedure for a full system reboot.', refNumber: 'NASA-PROC-005' },
];

const INITIAL_STUDIES: Study[] = [
  { id: 'study1', name: 'Artemis II Mission Prep', description: 'Tasks for the Artemis II lunar mission.', mteIds: ['mte1', 'mte2', 'mte3'], projectId: 'default_demo_project' },
  { id: 'study2', name: 'ISS Maintenance Protocols', description: 'New maintenance protocols on the ISS.', mteIds: ['mte4', 'mte5'], projectId: 'default_demo_project' },
];

const INITIAL_PROJECTS: Project[] = [
    { id: 'default_demo_project', name: 'Demo Project', studyIds: ['study1', 'study2'], evaluatorIds: ['eval1', 'eval2']}
]

const useMockData = (): IDataSource => {
  const [projects, setProjects] = useState<Project[]>(INITIAL_PROJECTS);
  const [evaluators, setEvaluators] = useState<Evaluator[]>(INITIAL_EVALUATORS);
  const [studies, setStudies] = useState<Study[]>(INITIAL_STUDIES);
  const [mtes, setMtes] = useState<MTE[]>(INITIAL_MTES_CATALOG);
  const [ratings, setRatings] = useState<Rating[]>([]);
  const [pairwiseComparisons, setPairwiseComparisons] = useState<PairwiseComparison[]>([]);

  // Implement mock data manipulation functions here
  // For simplicity, we'll use non-functional stubs for this example

  return {
    projects,
    evaluators,
    studies,
    mtes,
    ratings,
    pairwiseComparisons,
    addEvaluator: (evaluator) => setEvaluators(prev => [...prev, { ...evaluator, id: `eval${Date.now()}` }]),
    updateEvaluator: (updated) => setEvaluators(prev => prev.map(e => e.id === updated.id ? updated : e)),
    deleteEvaluator: (id) => setEvaluators(prev => prev.filter(e => e.id !== id)),
    addStudy: (study) => setStudies(prev => [...prev, { ...study, id: `study${Date.now()}`, mteIds: [] }]),
    updateStudy: (updated) => setStudies(prev => prev.map(s => s.id === updated.id ? updated : s)),
    deleteStudy: (id) => setStudies(prev => prev.filter(s => s.id !== id)),
    addMte: (mte) => {
        const newMte = { ...mte, id: `mte${Date.now()}`, refNumber: `ref${Date.now()}`};
        setMtes(prev => [...prev, newMte]);
        return newMte;
    },
    updateMte: (updated) => setMtes(prev => prev.map(m => m.id === updated.id ? updated : m)),
    deleteMte: (id) => setMtes(prev => prev.filter(m => m.id !== id)),
    addMTEToStudy: () => console.log('Mock function not implemented.'),
    removeMTEFromStudy: () => console.log('Mock function not implemented.'),
    addRating: (rating) => new Promise((resolve) => {
        const newRating = { ...rating, id: `rating${Date.now()}`, timestamp: Date.now() };
        setRatings(prev => [...prev, newRating]);
        resolve();
    }),
    addPairwiseComparison: (comparison) => {
        setPairwiseComparisons(prev => [...prev.filter(pc => pc.evaluatorId !== comparison.evaluatorId || pc.studyId !== comparison.studyId), comparison]);
    },
    hasPreviousRatingInStudy: () => false,
  };
};

export default useMockData;
