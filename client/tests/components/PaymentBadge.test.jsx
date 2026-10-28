import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import PaymentBadge from '../../src/components/PaymentBadge';

describe('PaymentBadge', () => {
  it('renders Paid badge with emerald styles', () => {
    render(<PaymentBadge status="paid" />);
    const badge = screen.getByText('Paid');
    expect(badge).toBeInTheDocument();
    expect(badge.parentElement).toHaveClass('text-emerald-700');
  });

  it('renders Pay at Hotel badge with blue styles', () => {
    render(<PaymentBadge status="pay_at_hotel" />);
    const badge = screen.getByText('Pay at Hotel');
    expect(badge).toBeInTheDocument();
    expect(badge.parentElement).toHaveClass('text-blue-700');
  });

  it('renders Payment Pending badge with amber styles', () => {
    render(<PaymentBadge status="pending" />);
    const badge = screen.getByText('Payment Pending');
    expect(badge).toBeInTheDocument();
    expect(badge.parentElement).toHaveClass('text-amber-700');
  });

  it('renders Refunded badge with slate styles', () => {
    render(<PaymentBadge status="refunded" />);
    const badge = screen.getByText('Refunded');
    expect(badge).toBeInTheDocument();
    expect(badge.parentElement).toHaveClass('text-slate-700');
  });

  it('renders Payment Failed badge with rose styles', () => {
    render(<PaymentBadge status="failed" />);
    const badge = screen.getByText('Payment Failed');
    expect(badge).toBeInTheDocument();
    expect(badge.parentElement).toHaveClass('text-rose-700');
  });
});
