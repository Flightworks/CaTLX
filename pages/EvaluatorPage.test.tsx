import { fireEvent, render, screen } from '@testing-library/react';
import { expect, test, vi } from 'vitest';
import { DataContext } from '../contexts/AppContext';
import { createDataSource, emptyWorkspace } from '../data/workspace';
import type { MTE, MteCriterion, Study } from '../types';
import { AssessmentRunner } from './EvaluatorPage';

test('observer counts are optional and incomplete counts do not save a NASA-TLX rating', async () => {
  const criterion: MteCriterion = { id: 'report', label: 'Reporting errors', instructions: 'Count incorrect reports.', type: 'errorRate' };
  const task: MTE = { id: 'task', name: 'Report readings', refNumber: '', description: '', criteria: [criterion] };
  const study: Study = { id: 'study', name: 'Study', description: '', date: 0, projectId: 'project', mteIds: [task.id], evaluatorIds: ['pilot'] };
  const data = createDataSource({ ...emptyWorkspace, studies: [study], mtes: [task] }, () => {});
  const saveRating = vi.fn().mockResolvedValue(undefined);
  render(<DataContext.Provider value={{ ...data, saveRating }}>
    <AssessmentRunner study={study} evaluatorId="pilot" />
  </DataContext.Provider>);

  fireEvent.click(screen.getByRole('button', { name: 'Rate Task' }));
  fireEvent.click(screen.getByText('Observer criteria (optional)'));
  fireEvent.change(screen.getByLabelText('Errors'), { target: { value: '1' } });
  fireEvent.click(screen.getByRole('button', { name: 'Save and choose another task' }));

  expect(saveRating).not.toHaveBeenCalled();
  expect(screen.getByRole('alert')).toHaveTextContent('Enter both counts as whole numbers');

  fireEvent.change(screen.getByLabelText('Observed opportunities'), { target: { value: '4' } });
  expect(screen.getByText('25%')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Save and choose another task' }));
  await screen.findByRole('status');
  expect(saveRating).toHaveBeenLastCalledWith(expect.objectContaining({ observations: [{ criterion, errors: 1, opportunities: 4 }] }));

  fireEvent.click(screen.getByRole('button', { name: 'Rate Task' }));
  fireEvent.click(screen.getByRole('button', { name: 'Save and choose another task' }));
  await screen.findByRole('status');
  expect(saveRating).toHaveBeenLastCalledWith(expect.objectContaining({ observations: [] }));
});
