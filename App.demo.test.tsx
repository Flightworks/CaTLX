import { fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, expect, it, vi } from 'vitest';
import PrivateApp from './PrivateApp';
import { loadWorkspace, saveWorkspace } from './data/supabase';
import { emptyWorkspace } from './data/workspace';
import en from './public/locales/en.json';

vi.mock('./data/supabase', () => ({
  cloudConfig: {
    environment: 'production',
    offlineScope: 'demo-test',
    client: {
      auth: {
        onAuthStateChange: (listener: (event: string, session: { user: { id: string } }) => void) => {
          listener('INITIAL_SESSION', { user: { id: 'owner' } });
          return { data: { subscription: { unsubscribe: vi.fn() } } };
        },
      },
    },
  },
  loadWorkspace: vi.fn(),
  saveWorkspace: vi.fn(),
}));

afterEach(() => vi.unstubAllGlobals());

it('offers the demo alongside a production workspace and keeps demo ratings out of cloud saves', async () => {
  vi.stubGlobal('matchMedia', () => ({ matches: true, addEventListener: vi.fn(), removeEventListener: vi.fn() }));
  vi.mocked(loadWorkspace).mockResolvedValue({
    data: {
      revision: 1,
      payload: {
        ...emptyWorkspace,
        projects: [{ id: 'work-project', name: 'Work project', description: '', ownerId: 'owner', memberIds: [] }],
      },
    },
    error: null,
    success: true,
    count: null,
    status: 200,
    statusText: 'OK',
  });
  render(<MemoryRouter initialEntries={['/projects']}><PrivateApp /></MemoryRouter>);

  expect(await screen.findByRole('link', { name: /Work project/ })).toBeInTheDocument();
  fireEvent.click(screen.getByRole('link', { name: /Demo Project.*2 studies/ }));
  fireEvent.click(screen.getByRole('link', { name: /Interface standard/ }));
  fireEvent.change(screen.getByRole('combobox', { name: en.evaluator.evaluator_label }), { target: { value: 'demo-nora' } });
  expect(screen.getByText('3 of 4 tasks rated')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: en.evaluator.rate_task }));
  fireEvent.click(screen.getByRole('button', { name: en.projects.save_and_choose }));
  expect(await screen.findByText('4 of 4 tasks rated')).toBeInTheDocument();
  expect(saveWorkspace).not.toHaveBeenCalled();

  const breadcrumbs = screen.getByRole('navigation', { name: en.projects.path });
  fireEvent.click(within(breadcrumbs).getByRole('link', { name: en.projects.title }));
  expect(await screen.findByRole('link', { name: /Work project/ })).toBeInTheDocument();
});
