import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import PaymentBadge from '../../src/components/PaymentBadge';

describe('PaymentBadge', () => {
  it('renders Paid badge with forest styles', () => {
    render(<PaymentBadge status="paid" />);
    const badge = screen.getByText('Paid');
    expect(badge).toBeInTheDocument();
    expect(badge.parentElement).toHaveClass('text-ivory');
    expect(badge.parentElement).toHaveClass('bg-forest');
  });

  it('renders Pay at Hotel badge with taupe and forest styles', () => {
    render(<PaymentBadge status="pay_at_hotel" />);
    const badge = screen.getByText('Pay at Hotel');
    expect(badge).toBeInTheDocument();
    expect(badge.parentElement).toHaveClass('text-forest');
    expect(badge.parentElement).toHaveClass('bg-taupe-100');
  });

  it('renders Pending Payment badge with brass styles', () => {
    render(<PaymentBadge status="pending" />);
    const badge = screen.getByText('Pending Payment');
    expect(badge).toBeInTheDocument();
    expect(badge.parentElement).toHaveClass('text-brass-800');
    expect(badge.parentElement).toHaveClass('bg-brass-50');
  });

  it('renders Refunded badge with taupe styles', () => {
    render(<PaymentBadge status="refunded" />);
    const badge = screen.getByText('Refunded');
    expect(badge).toBeInTheDocument();
    expect(badge.parentElement).toHaveClass('bg-taupe-100');
  });

  it('renders Payment Failed badge with brick styles', () => {
    render(<PaymentBadge status="failed" />);
    const badge = screen.getByText('Payment Failed');
    expect(badge).toBeInTheDocument();
    expect(badge.parentElement).toHaveClass('text-brick');
    expect(badge.parentElement).toHaveClass('bg-brick-50');
  });
});
