import React, { useState } from 'react';
import { render, screen, waitFor, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import EvaluatorPage from './EvaluatorPage';
import { AuthContext, DataContext, SessionContext } from '../contexts/AppContext';
import type { IDataSource } from '../types';
import type { AppUser } from '../src/auth/types';

const evaluator: AppUser = {
  uid: 'evaluator-a',
  email: 'evaluator@example.test',
  displayName: 'Evaluator A',
  role: 'evaluator',
  status: 'active',
};

const dataSource = {
  projects: [],
  evaluators: [{ id: evaluator.uid, name: evaluator.displayName, quality: '', company: '' }],
  studies: [{ id: 'study-a', name: 'Study A', description: 'Synthetic', date: 1, mteIds: ['mte-a'], evaluatorIds: [evaluator.uid], projectId: 'project-a' }],
  mtes: [{ id: 'mte-a', name: 'Assigned MTE', description: 'Synthetic task', refNumber: 'MTE-1' }],
  ratings: [],
  pairwiseComparisons: [],
  addProject: vi.fn(), updateProject: vi.fn(), deleteProject: vi.fn(),
  addMemberToProject: vi.fn(), removeMemberFromProject: vi.fn(),
  addEvaluator: vi.fn(), updateEvaluator: vi.fn(), deleteEvaluator: vi.fn(),
  addStudy: vi.fn(), updateStudy: vi.fn(), deleteStudy: vi.fn(),
  addMte: vi.fn(), updateMte: vi.fn(), deleteMte: vi.fn(),
  addMTEToStudy: vi.fn(), removeMTEFromStudy: vi.fn(),
  addEvaluatorToStudy: vi.fn(), removeEvaluatorFromStudy: vi.fn(),
  addRating: vi.fn().mockResolvedValue(undefined),
  addPairwiseComparison: vi.fn(),
  hasPreviousRatingInStudy: vi.fn().mockReturnValue(false),
} as unknown as IDataSource;

const authValue = {
  isLoggedIn: true,
  mode: 'firebase' as const,
  user: evaluator,
  login: vi.fn(),
  register: vi.fn(),
  requestPasswordReset: vi.fn(),
  logout: vi.fn(),
  authLoading: false,
  authError: null,
};

const TestHarness = () => {
  const [selectedEvaluatorId, setSelectedEvaluatorId] = useState('');
  const [selectedProjectId, setSelectedProjectId] = useState('');
  const [selectedStudyId, setSelectedStudyId] = useState('');
  return (
    <AuthContext.Provider value={authValue}>
      <DataContext.Provider value={dataSource}>
        <SessionContext.Provider value={{
          selectedEvaluatorId, setSelectedEvaluatorId,
          selectedProjectId, setSelectedProjectId,
          selectedStudyId, setSelectedStudyId,
        }}>
          <EvaluatorPage />
        </SessionContext.Provider>
      </DataContext.Provider>
    </AuthContext.Provider>
  );
};

describe('Firebase evaluator isolation', () => {
  it('locks the evaluator identity and does not expose MTE editing controls', async () => {
    render(<TestHarness />);

    const evaluatorSelect = screen.getByLabelText('Select Evaluator');
    expect(evaluatorSelect).toBeDisabled();
    expect(within(evaluatorSelect).getAllByRole('option')).toHaveLength(2);
    expect(screen.queryByText(/Click a task card to edit/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Edit .* task details/i)).not.toBeInTheDocument();

    await waitFor(() => expect(screen.getByLabelText('Select Study')).not.toBeDisabled());
  });
});
