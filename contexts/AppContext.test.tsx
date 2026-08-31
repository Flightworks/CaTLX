import React from 'react';
import { render, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const firebaseConfigMocks = vi.hoisted(() => ({
  initializeFirebase: vi.fn(),
  isFirebaseConfigured: vi.fn(() => true),
}));

vi.mock('../src/firebase/config', () => firebaseConfigMocks);
vi.mock('../src/auth/firebaseAuth', () => ({
  registerWithFirebase: vi.fn(),
  sendFirebasePasswordReset: vi.fn(),
  signInWithFirebase: vi.fn(),
  signOutFirebase: vi.fn(),
  subscribeToFirebaseAuthState: vi.fn(),
}));

import { AppProvider, useAuth } from './AppContext';

const Probe: React.FC = () => {
  const { mode, isLoggedIn } = useAuth();
  return <span data-testid="auth-state">{`${mode}:${isLoggedIn}`}</span>;
};

beforeEach(() => {
  window.localStorage.clear();
  vi.clearAllMocks();
});

describe('AppProvider Firebase mode gate', () => {
  it('does not initialize or subscribe to Firebase while Demo mode is selected', async () => {
    const { getByTestId } = render(
      <AppProvider>
        <Probe />
      </AppProvider>,
    );

    await waitFor(() => expect(getByTestId('auth-state')).toHaveTextContent('demo:false'));
    expect(firebaseConfigMocks.isFirebaseConfigured).not.toHaveBeenCalled();
    expect(firebaseConfigMocks.initializeFirebase).not.toHaveBeenCalled();
  });
});
