import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import DateRangePicker from '../../src/components/DateRangePicker';

const renderDateRangePicker = (props = {}) => {
  const defaultProps = {
    checkIn: '2026-11-10',
    checkOut: '2026-11-12',
    onChange: vi.fn(),
    ...props,
  };
  return render(
    <MemoryRouter initialEntries={['/']}>
      <DateRangePicker {...defaultProps} />
    </MemoryRouter>
  );
};

describe('DateRangePicker', () => {
  it('renders the calendar', () => {
    renderDateRangePicker();
    // DayPicker renders two months, so there are two grids
    const grids = screen.getAllByRole('grid');
    expect(grids.length).toBe(2);
  });

  it('renders two months by default', () => {
    renderDateRangePicker();
    const grids = screen.getAllByRole('grid');
    expect(grids.length).toBe(2);
  });

  it('shows previous and next month navigation', () => {
    renderDateRangePicker();
    expect(screen.getByRole('button', { name: /previous month/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /next month/i })).toBeInTheDocument();
  });

  it('renders day cells', () => {
    renderDateRangePicker();
    // Day cells have role "gridcell"
    const dayCells = screen.getAllByRole('gridcell');
    expect(dayCells.length).toBeGreaterThan(0);
  });
});