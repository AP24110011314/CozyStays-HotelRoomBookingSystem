import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import Rooms from '../../src/pages/Rooms';
import api from '../../src/api/client';

vi.mock('../../src/api/client', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    interceptors: { request: { use: vi.fn() }, response: { use: vi.fn() } },
  },
}));

describe('Task 3: Rooms Search Page Sidebar & One-Month Calendar', () => {
  let queryClient;

  beforeEach(() => {
    vi.clearAllMocks();
    queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    api.get.mockResolvedValue({
      data: {
        data: [
          {
            id: 'r1',
            name: 'Cozy Deluxe Suite 101',
            type: 'deluxe',
            basePrice: 5000,
            maxGuests: 3,
            amenities: ['wifi', 'ac'],
            images: ['/images/room1.jpg'],
          },
        ],
        meta: { total: 1, totalPages: 1, page: 1 },
      },
    });
  });

  const renderRooms = (initialEntries = ['/?checkIn=2026-11-12&checkOut=2026-11-15&guests=2']) => {
    return render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={initialEntries}>
          <Routes>
            <Route path="/" element={<Rooms />} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>
    );
  };

  it('renders exactly one month calendar grid in the sidebar', async () => {
    renderRooms();
    await waitFor(() => {
      expect(screen.getByText('Cozy Deluxe Suite 101')).toBeInTheDocument();
    });

    const sidebar = screen.getByLabelText('Search and filter sidebar');
    const sidebarGrids = sidebar.querySelectorAll('[role="grid"]');
    // Exactly one month calendar grid in the sidebar
    expect(sidebarGrids.length).toBe(1);
  });

  it('renders sidebar components in order: calendar, summary, guests stepper, filters', async () => {
    renderRooms();

    await waitFor(() => {
      expect(screen.getByText('Cozy Deluxe Suite 101')).toBeInTheDocument();
    });

    const sidebar = screen.getByLabelText('Search and filter sidebar');
    expect(sidebar).toBeInTheDocument();

    // 1. Calendar
    expect(sidebar.querySelector('[role="grid"]')).toBeInTheDocument();

    // 2. Summary
    expect(sidebar).toHaveTextContent(/12 Nov to 15 Nov, 2026, 3 nights/i);

    // 3. Guests Stepper
    expect(sidebar.querySelector('[data-testid="guests-count"]')).toHaveTextContent('2');

    // 4. Filter Panel
    expect(sidebar.querySelector('h3')).toHaveTextContent(/filter rooms/i);
  });

  it('adjusts guests count with stepper plus and minus buttons', async () => {
    renderRooms();

    await waitFor(() => {
      expect(screen.getByText('Cozy Deluxe Suite 101')).toBeInTheDocument();
    });

    const increaseBtn = screen.getByRole('button', { name: /increase guests/i });
    fireEvent.click(increaseBtn);

    // Should update guests count to 3
    expect(screen.getByTestId('guests-count')).toHaveTextContent('3');
  });
});
