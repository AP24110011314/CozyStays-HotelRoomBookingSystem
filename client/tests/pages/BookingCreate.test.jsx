import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import BookingCreate from '../../src/pages/BookingCreate';
import api from '../../src/api/client';

vi.mock('../../src/api/client', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
  },
}));

describe('BookingCreate Page', () => {
  let queryClient;

  beforeEach(() => {
    vi.clearAllMocks();
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
      },
    });

    // Mock public config
    api.get.mockImplementation((url) => {
      if (url === '/config/public') {
        return Promise.resolve({
          data: {
            data: {
              currency: 'INR',
              cancellationWindowHours: 48,
              paymentMethods: ['online', 'pay_at_hotel'],
            },
          },
        });
      }
      if (url.startsWith('/rooms/')) {
        return Promise.resolve({
          data: {
            data: {
              id: 'room_abc',
              name: 'Executive Studio',
              type: 'single',
              basePrice: 2000,
              maxGuests: 2,
              photos: ['https://example.com/photo.jpg'],
            },
          },
        });
      }
      return Promise.reject(new Error('Not found'));
    });
  });

  const renderComponent = () => {
    return render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={['/rooms/room_abc/book?checkIn=2026-11-20&checkOut=2026-11-23']}>
          <Routes>
            <Route path="/rooms/:id/book" element={<BookingCreate />} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>
    );
  };

  it('renders room details and payment method selector (online vs pay at hotel)', async () => {
    renderComponent();

    // Wait for room query to load
    expect(await screen.findByText('Confirm Your Reservation')).toBeInTheDocument();
    expect(screen.getByText('Executive Studio')).toBeInTheDocument();

    // Payment methods radio cards
    expect(screen.getByText('Pay Online')).toBeInTheDocument();
    expect(screen.getByText('Pay at Hotel')).toBeInTheDocument();

    // Price summary: 3 nights * ₹2,000 = ₹6,000
    expect(screen.getByText('Total Price')).toBeInTheDocument();
    expect(screen.getByText('₹6,000')).toBeInTheDocument();
  });

  it('switches payment method when Pay at Hotel radio card is clicked', async () => {
    renderComponent();

    expect(await screen.findByText('Confirm Your Reservation')).toBeInTheDocument();

    const payAtHotelRadio = screen.getByRole('radio', { name: /pay at hotel/i });
    expect(payAtHotelRadio).not.toBeChecked();

    fireEvent.click(payAtHotelRadio);
    expect(payAtHotelRadio).toBeChecked();

    expect(screen.getByRole('button', { name: /confirm & pay at hotel/i })).toBeInTheDocument();
  });
});
