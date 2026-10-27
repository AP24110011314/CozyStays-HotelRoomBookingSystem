import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import RoomCard from '../../src/components/RoomCard';

const mockRoom = {
  id: 'room-1',
  name: 'Deluxe Suite',
  type: 'suite',
  description: 'A luxurious suite with ocean view',
  basePrice: 25000,
  maxGuests: 4,
  amenities: ['wifi', 'air conditioning', 'tv', 'minibar'],
  photos: ['https://example.com/photo1.jpg'],
  active: true,
};

const renderRoomCard = (room = mockRoom, checkIn = '2026-11-10', checkOut = '2026-11-12') => {
  return render(
    <MemoryRouter initialEntries={['/']}>
      <RoomCard room={room} checkIn={checkIn} checkOut={checkOut} />
    </MemoryRouter>
  );
};

describe('RoomCard', () => {
  it('renders room name, type, and description', () => {
    renderRoomCard();
    expect(screen.getByText('Deluxe Suite')).toBeInTheDocument();
    expect(screen.getByText('suite')).toBeInTheDocument();
    expect(screen.getByText('A luxurious suite with ocean view')).toBeInTheDocument();
  });

  it('renders price per night correctly', () => {
    renderRoomCard();
    expect(screen.getByText('$250.00')).toBeInTheDocument();
    expect(screen.getByText('/ night')).toBeInTheDocument();
  });

  it('calculates and renders total price for stay', () => {
    renderRoomCard(mockRoom, '2026-11-10', '2026-11-12'); // 2 nights
    expect(screen.getByText('Total: $500.00')).toBeInTheDocument();
    expect(screen.getByText('2 nights')).toBeInTheDocument();
  });

  it('renders single night correctly', () => {
    renderRoomCard(mockRoom, '2026-11-10', '2026-11-11'); // 1 night
    expect(screen.getByText('Total: $250.00')).toBeInTheDocument();
    expect(screen.getByText('1 night')).toBeInTheDocument();
  });

  it('renders amenities as badges', () => {
    renderRoomCard();
    expect(screen.getByText('wifi')).toBeInTheDocument();
    expect(screen.getByText('air conditioning')).toBeInTheDocument();
    expect(screen.getByText('tv')).toBeInTheDocument();
    expect(screen.getByText('minibar')).toBeInTheDocument();
  });

  it('renders photo when available', () => {
    renderRoomCard();
    const img = screen.getByAltText('Deluxe Suite');
    expect(img).toHaveAttribute('src', 'https://example.com/photo1.jpg');
  });

  it('renders placeholder when no photos', () => {
    const roomWithoutPhotos = { ...mockRoom, photos: [] };
    renderRoomCard(roomWithoutPhotos);
    // Should render the SVG placeholder
    expect(screen.getByTestId('room-placeholder')).toBeInTheDocument();
  });

  it('shows inactive badge when room is inactive', () => {
    const inactiveRoom = { ...mockRoom, active: false };
    renderRoomCard(inactiveRoom);
    expect(screen.getByText('Inactive')).toBeInTheDocument();
  });

  it('navigates to room detail on click', () => {
    renderRoomCard();
    const link = screen.getByRole('link', { name: /deluxe suite/i });
    expect(link).toHaveAttribute('href', '/rooms/room-1?checkIn=2026-11-10&checkOut=2026-11-12');
  });

  it('handles different room types', () => {
    const singleRoom = { ...mockRoom, id: 'room-2', name: 'Single Room', type: 'single', basePrice: 10000 };
    renderRoomCard(singleRoom);
    expect(screen.getByText('Single Room')).toBeInTheDocument();
    expect(screen.getByText('single')).toBeInTheDocument();
    expect(screen.getByText('$100.00')).toBeInTheDocument();
  });
});