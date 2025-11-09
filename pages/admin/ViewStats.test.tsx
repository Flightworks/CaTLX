
import React from 'react';
import { render, screen, within, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import ViewStats from './ViewStats';
import { TLXDimension, Evaluator, Study, MTE, Rating, PairwiseComparison, IDataSource, Project } from '../../types';
import { DataContext } from '../../contexts/AppContext';

// Mock data for testing
const mockEvaluators: Evaluator[] = [
  { id: 'eval1', name: 'Test Pilot 1', quality: 'Lead', company: 'Test Corp' },
  { id: 'eval2', name: 'Test Pilot 2', quality: 'Junior', company: 'Test Corp' },
];

const mockMtes: MTE[] = [
  { id: 'mte1', name: 'Docking Maneuver', description: 'Test MTE 1', refNumber: 'T01' },
  { id: 'mte2', name: 'System Anomaly', description: 'Test MTE 2', refNumber: 'T02' },
  { id: 'mte3', name: 'EVA Simulation', description: 'MTE with no ratings', refNumber: 'T03' },
];

// FIX: Added required `projectId` property to mock Study objects.
const mockStudies: Study[] = [
  // FIX: Added missing 'date' and 'evaluatorIds' properties to conform to the Study type.
  { id: 'study1', name: 'Alpha Test', description: 'Study 1', date: Date.now(), mteIds: ['mte1', 'mte3'], evaluatorIds: ['eval1', 'eval2'], projectId: 'proj1' },
  // FIX: Added missing 'date' and 'evaluatorIds' properties to conform to the Study type.
  { id: 'study2', name: 'Bravo Test', description: 'Study 2', date: Date.now(), mteIds: ['mte2'], evaluatorIds: ['eval1'], projectId: 'proj1' },
];

const mockRatings: Rating[] = [
  {
    id: 'rating1',
    evaluatorId: 'eval1',
    studyId: 'study1',
    mteId: 'mte1',
    scores: {
      [TLXDimension.MENTAL_DEMAND]: 50,
      [TLXDimension.PHYSICAL_DEMAND]: 50,
      [TLXDimension.TEMPORAL_DEMAND]: 50,
      [TLXDimension.PERFORMANCE]: 50,
      [TLXDimension.EFFORT]: 50,
      [TLXDimension.FRUSTRATION]: 50,
    },
    timestamp: Date.now(),
  },
  {
    id: 'rating2',
    evaluatorId: 'eval2',
    studyId: 'study1',
    mteId: 'mte1',
    scores: {
      [TLXDimension.MENTAL_DEMAND]: 100,
      [TLXDimension.PHYSICAL_DEMAND]: 100,
      [TLXDimension.TEMPORAL_DEMAND]: 100,
      [TLXDimension.PERFORMANCE]: 100,
      [TLXDimension.EFFORT]: 100,
      [TLXDimension.FRUSTRATION]: 100,
    },
    timestamp: Date.now(),
  },
  {
    id: 'rating3',
    evaluatorId: 'eval1',
    studyId: 'study2',
    mteId: 'mte2',
    scores: {
      [TLXDimension.MENTAL_DEMAND]: 20,
      [TLXDimension.PHYSICAL_DEMAND]: 20,
      [TLXDimension.TEMPORAL_DEMAND]: 20,
      [TLXDimension.PERFORMANCE]: 20,
      [TLXDimension.EFFORT]: 20,
      [TLXDimension.FRUSTRATION]: 20,
    },
    timestamp: Date.now(),
  }
];

const mockPairwiseComparisons: PairwiseComparison[] = [
  {
    evaluatorId: 'eval1',
    studyId: 'study1',
    weights: {
      [TLXDimension.MENTAL_DEMAND]: 5,
      [TLXDimension.PHYSICAL_DEMAND]: 0,
      [TLXDimension.TEMPORAL_DEMAND]: 0,
      [TLXDimension.PERFORMANCE]: 0,
      [TLXDimension.EFFORT]: 0,
      [TLXDimension.FRUSTRATION]: 0,
    },
    isWeighted: true,
  },
  {
    evaluatorId: 'eval2',
    studyId: 'study1',
    weights: {
      [TLXDimension.MENTAL_DEMAND]: 1,
      [TLXDimension.PHYSICAL_DEMAND]: 1,
      [TLXDimension.TEMPORAL_DEMAND]: 1,
      [TLXDimension.PERFORMANCE]: 1,
      [TLXDimension.EFFORT]: 1,
      [TLXDimension.FRUSTRATION]: 1,
    },
    isWeighted: false,
  },
];

// FIX: Added missing properties to mockDataSource to fully implement IDataSource.
const mockProjects: Project[] = [
  { id: 'proj1', name: 'Test Project', description: 'A test project', ownerId: 'eval1', memberIds: ['eval1', 'eval2'] }
];

const mockDataSource: IDataSource = {
  projects: mockProjects,
  evaluators: mockEvaluators,
  studies: mockStudies,
  mtes: mockMtes,
  ratings: mockRatings,
  pairwiseComparisons: mockPairwiseComparisons,
  addProject: vi.fn(),
  updateProject: vi.fn(),
  deleteProject: vi.fn(),
  addMemberToProject: vi.fn(),
  removeMemberFromProject: vi.fn(),
  addEvaluator: vi.fn(),
  updateEvaluator: vi.fn(),
  deleteEvaluator: vi.fn(),
  addStudy: vi.fn(),
  updateStudy: vi.fn(),
  deleteStudy: vi.fn(),
  addMte: vi.fn(),
  updateMte: vi.fn(),
  deleteMte: vi.fn(),
  addMTEToStudy: vi.fn(),
  removeMTEFromStudy: vi.fn(),
  // FIX: Added missing 'addEvaluatorToStudy' and 'removeEvaluatorFromStudy' properties to conform to the IDataSource interface.
  addEvaluatorToStudy: vi.fn(),
  removeEvaluatorFromStudy: vi.fn(),
  addRating: vi.fn(),
  addPairwiseComparison: vi.fn(),
  hasPreviousRatingInStudy: vi.fn(),
};

const renderWithProviders = (ui: React.ReactElement) => {
  return render(
    <DataContext.Provider value={mockDataSource}>
      {ui}
    </DataContext.Provider>
  );
};

describe('ViewStats Component Logic and Display', () => {

  it('should calculate and display aggregated MTE statistics correctly', async () => {
    renderWithProviders(<ViewStats />);
    
    // For mte1, we have two ratings.
    // Rating 1 (eval1) is weighted. Raw scores are all 50. Weight is 5 on Mental Demand, 0 otherwise. Total weight = 5.
    // Weighted score = (50 * 5) / 5 = 50.
    // Rating 2 (eval2) is unweighted. Raw scores are all 100. Weights are all 1. Total weight = 6.
    // Weighted score = (100*1 + 100*1 + 100*1 + 100*1 + 100*1 + 100*1) / 6 = 100.
    //
    // Aggregate stats for mte1:
    // Number of Evals: 2
    // Avg Overall Score: (50 + 100) / 2 = 75.0
    // Avg Raw Scores (for each dim): (50 + 100) / 2 = 75.0

    const mte1HeadingCandidates = await screen.findAllByText(/Docking Maneuver/i);
    const mte1Card = mte1HeadingCandidates.find(element => element.tagName === 'H3');
    expect(mte1Card).toBeDefined();
    // Find the parent Card element to scope the queries
    const mte1Container = mte1Card.closest('[class*="bg-nasa-gray-900"]');
    expect(mte1Container).not.toBeNull();

    // Check number of evaluations
    expect(within(mte1Container!).queryByText('2')).not.toBeNull();
    expect(within(mte1Container!).queryByText('EVALS')).not.toBeNull();
    
    // Check average overall score. There will be multiple '75.0' texts, we need to find the main one.
    const avgScoreElement = within(mte1Container!)
      .getAllByText('75.0')
      .find(element => element.className.includes('text-5xl'));
    expect(avgScoreElement).toBeDefined();
    expect(avgScoreElement!.tagName).toBe('SPAN');
    expect(avgScoreElement!.className).toContain('text-5xl'); // Ensure it's the big score display
    
    // Check average raw scores in the dimension bars.
    // It should display 75.0 for all 6 dimensions.
    const rawScoreElements = within(mte1Container!).queryAllByText('75.0');
    // One for the big average score + 6 for the dimension bars = 7
    expect(rawScoreElements.length).toBe(7);
  });

  it('should filter MTEs when a study is selected from the dropdown', () => {
    renderWithProviders(<ViewStats />);

    // Initially, all MTEs should be visible.
    const getCardHeading = (pattern: RegExp) =>
      screen.getAllByText(pattern).find(element => element.tagName === 'H3');

    expect(getCardHeading(/Docking Maneuver/i)).toBeDefined();
    expect(getCardHeading(/System Anomaly/i)).toBeDefined();
    expect(getCardHeading(/EVA Simulation/i)).toBeDefined();

    // Select 'Alpha Test' (study1) from the dropdown
    const studyFilterDropdown = screen.getByLabelText(/Filter by Study/i);
    fireEvent.change(studyFilterDropdown, { target: { value: 'study1' } });
    
    // After filtering, only MTEs from study1 should be visible
    const filteredHeading = (pattern: RegExp) =>
      screen.getAllByText(pattern).find(element => element.tagName === 'H3');

    expect(filteredHeading(/Docking Maneuver/i)).toBeDefined();
    expect(filteredHeading(/EVA Simulation/i)).toBeDefined();
    expect(screen
      .queryAllByText(/System Anomaly/i)
      .some(element => element.tagName === 'H3'))
      .toBe(false); // mte2 from study2 should be hidden
  });

  it('should display a "no data" message for MTEs without evaluations', async () => {
    renderWithProviders(<ViewStats />);
    
    const mte3HeadingCandidates = await screen.findAllByText(/EVA Simulation/i);
    const mte3Card = mte3HeadingCandidates.find(element => element.tagName === 'H3');
    expect(mte3Card).toBeDefined();
    const mte3Container = mte3Card.closest('[class*="bg-nasa-gray-900"]');
    expect(mte3Container).not.toBeNull();
    
    // Check for 0 evaluations and the specific message
    expect(within(mte3Container!).queryByText('0')).not.toBeNull();
    expect(within(mte3Container!).queryByText(/No evaluation data available/i)).not.toBeNull();
  });

});
