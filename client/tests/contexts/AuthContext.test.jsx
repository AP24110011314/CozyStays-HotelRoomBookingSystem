import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider, useAuth } from '../../src/contexts/AuthContext';
import api from '../../src/api/client';

// Mock the API client
vi.mock('../../src/api/client', () => ({
  default: {
    post: vi.fn(),
    get: vi.fn(),
    defaults: { headers: {} },
  },
}));

beforeEach(() => {
  // Clear localStorage store
  global.__localStorageStore = {};
  vi.clearAllMocks();
});

const TestComponent = () => {
  const auth = useAuth();
  const handleLogin = async () => {
    try {
      await auth.login('test@example.com', 'password');
    } catch (e) {
      // Ignore error for testing
    }
  };
  const handleRegister = async () => {
    try {
      await auth.register('Test', 'new@test.com', 'password');
    } catch (e) {
      // Ignore error for testing
    }
  };
  return (
    <div>
      <div data-testid="user">{auth.user ? JSON.stringify(auth.user) : 'null'}</div>
      <div data-testid="loading">{auth.loading.toString()}</div>
      <button data-testid="login-btn" onClick={handleLogin}>Login</button>
      <button data-testid="register-btn" onClick={handleRegister}>Register</button>
      <button data-testid="logout-btn" onClick={() => auth.logout()}>Logout</button>
    </div>
  );
};

const renderWithProviders = (component) => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <MemoryRouter>
          <Routes>
            <Route path="/" element={component} />
          </Routes>
        </MemoryRouter>
      </AuthProvider>
    </QueryClientProvider>
  );
};

describe('AuthContext', () => {

  it('provides initial state with no user', () => {
    renderWithProviders(<TestComponent />);
    expect(screen.getByTestId('user').textContent).toBe('null');
    expect(screen.getByTestId('loading').textContent).toBe('false');
  });

  it('logs in user and stores token', async () => {
    const mockResponse = {
      data: {
        data: {
          user: { id: '1', email: 'test@example.com', name: 'Test', role: 'guest' },
          token: 'mock-jwt-token',
        },
      },
    };
    api.post.mockResolvedValue(mockResponse);

    renderWithProviders(<TestComponent />);

    fireEvent.click(screen.getByTestId('login-btn'));

    await waitFor(() => {
      expect(screen.getByTestId('user').textContent).toContain('test@example.com');
    });

    expect(api.post).toHaveBeenCalledWith('/auth/login', {
      email: 'test@example.com',
      password: 'password',
    });
    expect(localStorage.getItem('token')).toBe('mock-jwt-token');
  });

  it('handles login error', async () => {
    api.post.mockRejectedValue({
      response: { data: { error: { message: 'Invalid credentials' } } },
    });

    renderWithProviders(<TestComponent />);

    // The login function throws, but we can't catch it in fireEvent
    // Just verify the user remains null after the click
    fireEvent.click(screen.getByTestId('login-btn'));

    // Wait for any state updates
    await waitFor(() => {
      expect(screen.getByTestId('user').textContent).toBe('null');
    }, { timeout: 1000 });
  });

  it('registers new user', async () => {
    const mockResponse = {
      data: {
        data: {
          user: { id: '2', email: 'new@test.com', name: 'Test', role: 'guest' },
          token: 'new-jwt-token',
        },
      },
    };
    api.post.mockResolvedValue(mockResponse);

    renderWithProviders(<TestComponent />);

    fireEvent.click(screen.getByTestId('register-btn'));

    await waitFor(() => {
      expect(screen.getByTestId('user').textContent).toContain('new@test.com');
    });

    expect(api.post).toHaveBeenCalledWith('/auth/register', {
      name: 'Test',
      email: 'new@test.com',
      password: 'password',
    });
  });

  it('logs out user and clears token', async () => {
    const mockResponse = {
      data: {
        data: {
          user: { id: '1', email: 'test@example.com', name: 'Test', role: 'guest' },
          token: 'mock-jwt-token',
        },
      },
    };
    api.post.mockResolvedValue(mockResponse);

    renderWithProviders(<TestComponent />);

    fireEvent.click(screen.getByTestId('login-btn'));

    await waitFor(() => {
      expect(screen.getByTestId('user').textContent).toContain('test@example.com');
    });

    fireEvent.click(screen.getByTestId('logout-btn'));

    await waitFor(() => {
      expect(screen.getByTestId('user').textContent).toBe('null');
    });

    expect(localStorage.getItem('token')).toBeNull();
  });

  it('fetches current user on init when token exists', async () => {
    const mockUser = { id: '1', email: 'test@example.com', name: 'Test', role: 'guest' };
    localStorage.setItem('token', 'mock-jwt-token');
    api.get.mockResolvedValue({ data: { data: mockUser } });

    renderWithProviders(<TestComponent />);

    await waitFor(() => {
      expect(screen.getByTestId('user').textContent).toContain('test@example.com');
    });

    expect(api.get).toHaveBeenCalledWith('/auth/me');
  });

  it('clears token when fetch user fails', async () => {
    localStorage.setItem('token', 'invalid-token');
    api.get.mockRejectedValue({ response: { status: 401 } });

    renderWithProviders(<TestComponent />);

    await waitFor(() => {
      expect(screen.getByTestId('user').textContent).toBe('null');
    });

    expect(localStorage.getItem('token')).toBeNull();
  });
});