import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { MemoryRouter, Routes, Route, useLocation } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { AuthProvider, useAuth } from '../../src/contexts/AuthContext';
import Layout from '../../src/components/Layout';
import AdminLayout from '../../src/components/AdminLayout';
import api from '../../src/api/client';
import { setStoredToken, getStoredToken, TOKEN_STORAGE_KEY } from '../../src/utils/token';

vi.mock('react-hot-toast', () => ({
  default: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock('../../src/api/client', async () => {
  let errorHandler = null;
  return {
    default: {
      get: vi.fn(),
      post: vi.fn(),
      interceptors: {
        request: { use: vi.fn() },
        response: { use: vi.fn() },
      },
      defaults: { headers: {} },
    },
    setAuthErrorHandler: vi.fn((handler) => {
      errorHandler = handler;
    }),
    __triggerAuthError: () => {
      if (errorHandler) errorHandler();
    },
  };
});

function CurrentLocation() {
  const location = useLocation();
  return <div data-testid="location">{location.pathname}{location.search}</div>;
}

function ProtectedPage() {
  const { user, logout } = useAuth();
  return (
    <div>
      <h1>Protected Page</h1>
      <p data-testid="user-name">{user?.name}</p>
      <button data-testid="page-logout-btn" onClick={() => logout()}>Log out</button>
    </div>
  );
}

describe('Task 2: Logout and Session Management', () => {
  let queryClient;

  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
  });

  const renderApp = (initialRoute = '/bookings', initialUser = { id: 'u1', name: 'John Doe', role: 'guest' }) => {
    if (initialUser) {
      setStoredToken('valid-user-token');
      api.get.mockImplementation((url) => {
        if (url === '/auth/me') {
          return Promise.resolve({ data: { data: initialUser } });
        }
        return Promise.reject(new Error('not found'));
      });
    } else {
      api.get.mockRejectedValue(new Error('no token'));
    }

    return render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={[initialRoute]}>
          <AuthProvider>
            <CurrentLocation />
            <Routes>
              <Route path="/" element={<Layout />}>
                <Route path="bookings" element={<ProtectedPage />} />
                <Route path="login" element={<div>Login Page Form</div>} />
              </Route>
              <Route path="/admin" element={<AdminLayout />}>
                <Route index element={<div>Admin Dashboard</div>} />
              </Route>
            </Routes>
          </AuthProvider>
        </MemoryRouter>
      </QueryClientProvider>
    );
  };

  it('logout from protected page navigates directly to /login with replace, clears query cache and token', async () => {
    // Populate query cache with private mock data
    queryClient.setQueryData(['privateUserBookings'], [{ id: 'b1', total: 5000 }]);
    expect(queryClient.getQueryData(['privateUserBookings'])).toBeDefined();

    renderApp('/bookings');

    await waitFor(() => {
      expect(screen.getByTestId('user-name')).toHaveTextContent('John Doe');
    });

    const clearSpy = vi.spyOn(queryClient, 'clear');

    // Click logout button
    fireEvent.click(screen.getByTestId('page-logout-btn'));

    await waitFor(() => {
      // Lands on /login with NO ?next= parameter
      expect(screen.getByTestId('location')).toHaveTextContent('/login');
      expect(screen.getByText('Login Page Form')).toBeInTheDocument();
    });

    // Token removed from storage
    expect(getStoredToken()).toBeNull();

    // Query client cache is wiped
    expect(clearSpy).toHaveBeenCalled();
    expect(queryClient.getQueryData(['privateUserBookings'])).toBeUndefined();

    // Toast shown
    expect(toast.success).toHaveBeenCalledWith('You have been signed out');
  });

  it('logout from admin dashboard navigates directly to /login', async () => {
    renderApp('/admin', { id: 'a1', name: 'Admin Guy', role: 'admin' });

    await waitFor(() => {
      expect(screen.getByText('Admin Dashboard')).toBeInTheDocument();
    });

    // Click admin layout logout button
    const logoutBtns = screen.getAllByRole('button', { name: /logout/i });
    fireEvent.click(logoutBtns[0]);

    await waitFor(() => {
      expect(screen.getByTestId('location')).toHaveTextContent('/login');
    });

    expect(getStoredToken()).toBeNull();
  });

  it('handles 401 unauthenticated response by routing to /login and showing session expired error', async () => {
    renderApp('/bookings');

    await waitFor(() => {
      expect(screen.getByTestId('user-name')).toHaveTextContent('John Doe');
    });

    const clientModule = await import('../../src/api/client');

    act(() => {
      clientModule.__triggerAuthError();
    });

    await waitFor(() => {
      expect(screen.getByTestId('location')).toHaveTextContent('/login');
      expect(toast.error).toHaveBeenCalledWith('Session expired, please sign in again');
    });

    expect(getStoredToken()).toBeNull();
  });

  it('syncs logout across browser tabs via storage event', async () => {
    renderApp('/bookings');

    await waitFor(() => {
      expect(screen.getByTestId('user-name')).toHaveTextContent('John Doe');
    });

    act(() => {
      window.dispatchEvent(
        new StorageEvent('storage', {
          key: TOKEN_STORAGE_KEY,
          oldValue: 'valid-user-token',
          newValue: null,
        })
      );
    });

    await waitFor(() => {
      expect(screen.getByTestId('location')).toHaveTextContent('/login');
    });
  });

  it('logged-out navbar renders Sign In button', async () => {
    renderApp('/bookings');

    await waitFor(() => {
      expect(screen.getByTestId('user-name')).toHaveTextContent('John Doe');
    });

    fireEvent.click(screen.getByTestId('page-logout-btn'));

    await waitFor(() => {
      expect(screen.getByRole('link', { name: /sign in/i })).toBeInTheDocument();
      expect(screen.queryByText('John Doe')).not.toBeInTheDocument();
    });
  });
});
