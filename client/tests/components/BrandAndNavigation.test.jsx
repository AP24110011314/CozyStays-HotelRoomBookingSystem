import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import Layout from '../../src/components/Layout';
import { AuthProvider } from '../../src/contexts/AuthContext';
import { HOTEL_CONFIG } from '../../src/config/hotel';
import { useDocumentTitle } from '../../src/hooks/useDocumentTitle';
import { getStoredToken, setStoredToken, removeStoredToken, TOKEN_STORAGE_KEY } from '../../src/utils/token';

function TitleTestComponent({ title }) {
  useDocumentTitle(title);
  return <div>Title Component</div>;
}

describe('CozyStays Branding & Configured Name', () => {
  beforeEach(() => {
    removeStoredToken();
  });

  it('renders configured brand name CozyStays in navbar and footer', () => {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });

    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <AuthProvider>
            <Layout />
          </AuthProvider>
        </MemoryRouter>
      </QueryClientProvider>
    );

    // Navbar logo alt attribute matches configured name
    const logoImg = screen.getByRole('img', { name: HOTEL_CONFIG.name });
    expect(logoImg).toBeInTheDocument();
    expect(HOTEL_CONFIG.name).toBe('CozyStays');

    // Footer copyright matches configured name
    expect(screen.getByText(new RegExp(`${HOTEL_CONFIG.name} © 2026`, 'i'))).toBeInTheDocument();
  });

  it('updates document.title using configured app name suffix', () => {
    render(<TitleTestComponent title="Search rooms" />);
    expect(document.title).toBe(`Search rooms | ${HOTEL_CONFIG.name}`);

    render(<TitleTestComponent title="" />);
    expect(document.title).toBe(HOTEL_CONFIG.name);
  });

  it('silently migrates legacy localStorage token to cozystays_token', () => {
    // Put legacy token in old 'token' key
    localStorage.setItem('token', 'legacy-secret-token');

    // getStoredToken should retrieve it and migrate to TOKEN_STORAGE_KEY
    const retrieved = getStoredToken();
    expect(retrieved).toBe('legacy-secret-token');
    expect(localStorage.getItem(TOKEN_STORAGE_KEY)).toBe('legacy-secret-token');
    expect(localStorage.getItem('token')).toBeNull();

    // Cleaning up removes all keys
    removeStoredToken();
    expect(localStorage.getItem(TOKEN_STORAGE_KEY)).toBeNull();
  });
});
