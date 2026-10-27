import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import RoomCard from '../../src/components/RoomCard';

const mockRoom = {
  id: 'room-1',
  name: 'Deluxe Suite',
  type: 'suite',
  description: 'A luxurious suite with ocean view',
  basePrice: 250000, // ₹2,500 in paise
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
    expect(screen.getByText('Suite')).toBeInTheDocument();
    expect(screen.getByText('A luxurious suite with ocean view')).toBeInTheDocument();
  });

  it('renders price per night correctly', () => {
    renderRoomCard();
    // Price and "/ night" appear in two places (main content and hover), check at least one exists
    const priceElements = screen.getAllByText('₹2,500');
    expect(priceElements.length).toBeGreaterThanOrEqual(1);
    const nightElements = screen.getAllByText('/ night');
    expect(nightElements.length).toBeGreaterThanOrEqual(1);
  });

  it('calculates and renders total price for stay', () => {
    renderRoomCard(mockRoom, '2026-11-10', '2026-11-12'); // 2 nights
    expect(screen.getByText('Total: ₹5,000')).toBeInTheDocument();
    expect(screen.getByText('2 nights')).toBeInTheDocument();
  });

  it('renders single night correctly', () => {
    renderRoomCard(mockRoom, '2026-11-10', '2026-11-11'); // 1 night
    expect(screen.getByText('Total: ₹2,500')).toBeInTheDocument();
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
    const img = screen.getByAltText('Deluxe Suite - suite room');
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
    const link = screen.getByRole('link', { name: /view deluxe suite - suite room/i });
    expect(link).toHaveAttribute('href', '/rooms/room-1?checkIn=2026-11-10&checkOut=2026-11-12');
  });

  it('handles different room types', () => {
    const singleRoom = { ...mockRoom, id: 'room-2', name: 'Single Room', type: 'single', basePrice: 100000 }; // ₹1,000 in paise
    renderRoomCard(singleRoom);
    expect(screen.getByText('Single Room')).toBeInTheDocument();
    expect(screen.getByText('Single')).toBeInTheDocument();
    const priceElements = screen.getAllByText('₹1,000');
    expect(priceElements.length).toBeGreaterThanOrEqual(1);
  });
});