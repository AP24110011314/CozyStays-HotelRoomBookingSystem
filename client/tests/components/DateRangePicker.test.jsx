import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import DateRangePicker from '../../src/components/DateRangePicker';

const renderDateRangePicker = (props = {}) => {
  const defaultProps = {
    checkIn: '2026-11-10',
    checkOut: '2026-11-12',
    onChange: vi.fn(),
    onClear: vi.fn(),
    ...props,
  };
  return {
    ...render(
      <MemoryRouter initialEntries={['/']}>
        <DateRangePicker {...defaultProps} />
      </MemoryRouter>
    ),
    props: defaultProps,
  };
};

describe('DateRangePicker (Task 3: Single One-Month Calendar)', () => {
  it('renders exactly one month grid at all viewport sizes', () => {
    // Desktop simulated
    window.innerWidth = 1440;
    const { unmount } = renderDateRangePicker();
    const desktopGrids = screen.getAllByRole('grid');
    expect(desktopGrids.length).toBe(1);
    unmount();

    // Mobile simulated
    window.innerWidth = 375;
    renderDateRangePicker();
    const mobileGrids = screen.getAllByRole('grid');
    expect(mobileGrids.length).toBe(1);
  });

  it('shows previous and next month navigation buttons', () => {
    renderDateRangePicker();
    expect(screen.getByRole('button', { name: /previous month/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /next month/i })).toBeInTheDocument();
  });

  it('renders day cells with role gridcell', () => {
    renderDateRangePicker();
    const dayCells = screen.getAllByRole('gridcell');
    expect(dayCells.length).toBeGreaterThan(0);
  });

  it('renders Clear dates button and triggers onClear when clicked', () => {
    const onClear = vi.fn();
    renderDateRangePicker({ onClear });
    const clearBtn = screen.getByRole('button', { name: /clear dates/i });
    expect(clearBtn).toBeInTheDocument();
    fireEvent.click(clearBtn);
    expect(onClear).toHaveBeenCalled();
  });
});
