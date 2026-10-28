import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import Login from '../../src/pages/Login';
import { AuthProvider } from '../../src/contexts/AuthContext';
import api from '../../src/api/client';
import { HOTEL_CONFIG } from '../../src/config/hotel';

vi.mock('../../src/api/client');

const renderLogin = (initialEntries = ['/login']) => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={initialEntries}>
        <AuthProvider>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/bookings/123" element={<div>Target Next Page</div>} />
            <Route path="/" element={<div>Home Page</div>} />
          </Routes>
        </AuthProvider>
      </MemoryRouter>
    </QueryClientProvider>
  );
};

describe('Login Page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    api.get.mockImplementation((url) => {
      if (url === '/config/public') {
        return Promise.resolve({
          data: {
            data: {
              cancellationWindowHours: 48,
              currency: 'INR',
              checkInTime: '2:00 PM',
              checkOutTime: '11:00 AM',
              paymentMethods: ['online', 'pay_at_hotel'],
              paymentHoldMinutes: 15,
            },
          },
        });
      }
      return Promise.reject(new Error('Not found'));
    });
  });

  it('renders login form with email, password, and branding from config', () => {
    renderLogin();
    expect(screen.getByLabelText('Email Address')).toBeInTheDocument();
    expect(screen.getByLabelText('Password')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument();
    // Brand name from config
    const brandElements = screen.getAllByText(HOTEL_CONFIG.name);
    expect(brandElements.length).toBeGreaterThan(0);
  });

  it('renders hotel specifications from config', () => {
    renderLogin();
    // Check-in & Check-out spec from config
    expect(screen.getAllByText('Check-in & Check-out').length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Check-in 2:00 PM • Check-out 11:00 AM/i).length).toBeGreaterThan(0);
    // Trust badges
    expect(screen.getAllByText('Instant confirmation').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Booking details sent by email').length).toBeGreaterThan(0);
  });

  it('shows validation errors for invalid inputs', async () => {
    renderLogin();
    fireEvent.click(screen.getByRole('button', { name: /sign in/i }));

    await waitFor(() => {
      expect(screen.getByText(/email is required/i)).toBeInTheDocument();
      expect(screen.getByText(/password is required/i)).toBeInTheDocument();
    });
  });

  it('toggles password visibility with show password button', () => {
    renderLogin();
    const passwordInput = screen.getByLabelText('Password');
    const toggleButton = screen.getByRole('button', { name: /show password/i });

    expect(passwordInput).toHaveAttribute('type', 'password');
    fireEvent.click(toggleButton);
    expect(passwordInput).toHaveAttribute('type', 'text');
    fireEvent.click(screen.getByRole('button', { name: /hide password/i }));
    expect(passwordInput).toHaveAttribute('type', 'password');
  });

  it('displays error banner when authentication fails with bad credentials', async () => {
    api.post.mockRejectedValueOnce({
      response: {
        data: {
          error: {
            code: 'UNAUTHORIZED',
            message: 'Invalid email or password',
          },
        },
      },
    });

    renderLogin();
    fireEvent.change(screen.getByLabelText('Email Address'), { target: { value: 'guest@example.com' } });
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'WrongPassword' } });
    fireEvent.click(screen.getByRole('button', { name: /sign in/i }));

    await waitFor(() => {
      const alert = screen.getByRole('alert');
      expect(alert).toBeInTheDocument();
      expect(alert).toHaveTextContent(/invalid email or password/i);
    });
  });

  it('redirects to ?next= destination on successful login', async () => {
    api.post.mockResolvedValueOnce({
      data: {
        data: {
          user: { id: 'u1', email: 'guest@example.com', name: 'Guest User', role: 'guest' },
          token: 'mock-jwt-token',
        },
      },
    });

    renderLogin(['/login?next=/bookings/123']);
    fireEvent.change(screen.getByLabelText('Email Address'), { target: { value: 'guest@example.com' } });
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'Password123' } });
    fireEvent.click(screen.getByRole('button', { name: /sign in/i }));

    await waitFor(() => {
      expect(screen.getByText('Target Next Page')).toBeInTheDocument();
    });
  });

  it('has link to register page with ?next= preserved if present', () => {
    renderLogin(['/login?next=/bookings/123']);
    expect(screen.getByRole('link', { name: /sign up/i })).toHaveAttribute(
      'href',
      '/register?next=%2Fbookings%2F123'
    );
  });
});
