import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import PaymentModal from '../../src/components/PaymentModal';
import api from '../../src/api/client';

vi.mock('../../src/api/client', () => ({
  default: {
    post: vi.fn(),
  },
}));

describe('PaymentModal (Mock Provider)', () => {
  const mockBooking = {
    id: 'booking_123',
    reference: 'REF-TEST-999',
    totalPrice: 6000,
    room: { name: 'Deluxe Sea View Suite' },
    holdExpiresAt: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
  };

  const mockPaymentData = {
    provider: 'mock',
    orderId: 'order_mock_456',
    amount: 600000,
    currency: 'INR',
    keyId: 'mock_key',
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders mock payment dialog with order details and hold timer', () => {
    render(
      <PaymentModal
        isOpen={true}
        onClose={vi.fn()}
        booking={mockBooking}
        paymentData={mockPaymentData}
      />
    );

    expect(screen.getByText(/Simulated Gateway/i)).toBeInTheDocument();
    expect(screen.getByText('Complete Online Payment')).toBeInTheDocument();
    expect(screen.getByText('₹6,000')).toBeInTheDocument();
    expect(screen.getByText('Deluxe Sea View Suite')).toBeInTheDocument();
    expect(screen.getByText('REF-TEST-999')).toBeInTheDocument();
    expect(screen.getByText(/Simulate Successful Payment/i)).toBeInTheDocument();
    expect(screen.getByText(/Simulate Payment Failure/i)).toBeInTheDocument();
  });

  it('switches between mock payment method tabs', () => {
    render(
      <PaymentModal
        isOpen={true}
        onClose={vi.fn()}
        booking={mockBooking}
        paymentData={mockPaymentData}
      />
    );

    // Initial is Card
    expect(screen.getByText(/ending in •••• 4242/i)).toBeInTheDocument();

    // Switch to UPI
    fireEvent.click(screen.getByRole('button', { name: /upi/i }));
    expect(screen.getByText(/Simulating instant UPI payment/i)).toBeInTheDocument();

    // Switch to Netbanking
    fireEvent.click(screen.getByRole('button', { name: /netbanking/i }));
    expect(screen.getByText(/Simulating Netbanking redirect/i)).toBeInTheDocument();
  });

  it('calls verification endpoint and triggers onSuccess when user clicks Simulate Successful Payment', async () => {
    api.post.mockResolvedValueOnce({
      data: {
        data: {
          booking: { ...mockBooking, status: 'upcoming', paymentStatus: 'paid' },
        },
      },
    });

    const handleSuccess = vi.fn();
    const handleClose = vi.fn();

    render(
      <PaymentModal
        isOpen={true}
        onClose={handleClose}
        booking={mockBooking}
        paymentData={mockPaymentData}
        onSuccess={handleSuccess}
      />
    );

    const successBtn = screen.getByRole('button', { name: /simulate successful payment/i });
    fireEvent.click(successBtn);

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith('/payments/verify', expect.objectContaining({
        bookingId: 'booking_123',
        mockSuccess: true,
      }));
      expect(handleSuccess).toHaveBeenCalled();
      expect(handleClose).toHaveBeenCalled();
    });
  });

  it('displays error alert when payment verification fails', async () => {
    api.post.mockRejectedValueOnce({
      response: {
        data: {
          error: {
            message: 'Signature mismatch or simulated failure',
          },
        },
      },
    });

    const handleFailure = vi.fn();

    render(
      <PaymentModal
        isOpen={true}
        onClose={vi.fn()}
        booking={mockBooking}
        paymentData={mockPaymentData}
        onFailure={handleFailure}
      />
    );

    const failBtn = screen.getByRole('button', { name: /simulate payment failure/i });
    fireEvent.click(failBtn);

    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeInTheDocument();
      expect(screen.getByText(/Signature mismatch or simulated failure/i)).toBeInTheDocument();
      expect(handleFailure).toHaveBeenCalled();
    });
  });
});

