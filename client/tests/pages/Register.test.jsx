import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import Register from '../../src/pages/Register';
import { AuthProvider } from '../../src/contexts/AuthContext';
import api from '../../src/api/client';

vi.mock('../../src/api/client');

const renderRegister = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={['/register']}>
        <AuthProvider>
          <Register />
        </AuthProvider>
      </MemoryRouter>
    </QueryClientProvider>
  );
};

describe('Register Page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders register form with name, email, password, and confirm password fields', () => {
    renderRegister();
    expect(screen.getByLabelText('Full Name')).toBeInTheDocument();
    expect(screen.getByLabelText('Email Address')).toBeInTheDocument();
    expect(screen.getByLabelText('Password')).toBeInTheDocument();
    expect(screen.getByLabelText('Confirm Password')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /create account/i })).toBeInTheDocument();
  });

  it('shows validation error for empty name', async () => {
    renderRegister();
    fireEvent.click(screen.getByRole('button', { name: /create account/i }));

    await waitFor(() => {
      expect(screen.getByText(/name must be at least 2 characters/i)).toBeInTheDocument();
    }, { timeout: 2000 });
  });

  it('shows validation error for short password', async () => {
    renderRegister();
    fireEvent.change(screen.getByLabelText('Full Name'), { target: { value: 'Test User' } });
    fireEvent.change(screen.getByLabelText('Email Address'), { target: { value: 'test@example.com' } });
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: '123' } });
    fireEvent.change(screen.getByLabelText('Confirm Password'), { target: { value: '123' } });
    fireEvent.click(screen.getByRole('button', { name: /create account/i }));

    await waitFor(() => {
      expect(screen.getByText(/password must be at least 8 characters/i)).toBeInTheDocument();
    }, { timeout: 2000 });
  });

  it('shows validation error when passwords do not match', async () => {
    renderRegister();
    fireEvent.change(screen.getByLabelText('Full Name'), { target: { value: 'Test User' } });
    fireEvent.change(screen.getByLabelText('Email Address'), { target: { value: 'test@example.com' } });
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'password123' } });
    fireEvent.change(screen.getByLabelText('Confirm Password'), { target: { value: 'password456' } });
    fireEvent.click(screen.getByRole('button', { name: /create account/i }));

    await waitFor(() => {
      expect(screen.getByText(/passwords do not match/i)).toBeInTheDocument();
    }, { timeout: 2000 });
  });

  it('has link to login page', () => {
    renderRegister();
    expect(screen.getByRole('link', { name: /sign in/i })).toHaveAttribute('href', '/login');
  });
});