import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import Login from '../../src/pages/Login';
import { AuthProvider } from '../../src/contexts/AuthContext';
import api from '../../src/api/client';

vi.mock('../../src/api/client');

const renderLogin = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={['/login']}>
        <AuthProvider>
          <Login />
        </AuthProvider>
      </MemoryRouter>
    </QueryClientProvider>
  );
};

describe('Login Page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders login form with email and password fields', () => {
    renderLogin();
    expect(screen.getByLabelText('Email Address')).toBeInTheDocument();
    expect(screen.getByLabelText('Password')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument();
  });

  it('shows validation error for empty password', async () => {
    renderLogin();
    fireEvent.change(screen.getByLabelText('Email Address'), { target: { value: 'test@example.com' } });
    fireEvent.click(screen.getByRole('button', { name: /sign in/i }));

    await waitFor(() => {
      expect(screen.getByText(/password is required/i)).toBeInTheDocument();
    }, { timeout: 2000 });
  });

  it('has link to register page', () => {
    renderLogin();
    expect(screen.getByRole('link', { name: /sign up/i })).toHaveAttribute('href', '/register');
  });
});